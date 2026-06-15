// Pyodide runs here, on a dedicated Web Worker, so the (synchronous, blocking)
// Python execution never freezes the main thread / UI. The main thread talks to
// this worker via the message protocol implemented in pyodide.ts.
//
// We deliberately avoid `/// <reference lib="webworker" />` because mixing the
// DOM and WebWorker libs (tsc compiles the whole project with one lib set)
// produces conflicting global declarations (e.g. `self`). Instead the worker
// scope is accessed through a narrow local cast.

import type { WorkerIn, WorkerOut } from "./pyodideProtocol";

const ctx = self as unknown as {
  postMessage(msg: WorkerOut): void;
  onmessage: ((e: MessageEvent<WorkerIn>) => void) | null;
};

interface PyodideInterface {
  loadPackage(packages: string[]): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
  globals: {
    set(key: string, value: unknown): void;
    get(key: string): unknown;
    delete(key: string): void;
  };
}

const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/";
const PYODIDE_MJS = `${PYODIDE_BASE}pyodide.mjs`;

const DATA_FILES = [
  "aws_d11_table_5_7",
  "aisc_360_j2",
  "materials_steel",
  "electrodes_aws_a5",
  "aws_d11_annex_k",
  "aws_d11_table_5_8",
  "materials_stainless",
  "materials_aluminum",
  "filler_match",
];

const ENGINES = ["classifier", "structural", "symbol", "fatigue", "process", "metallurgy", "distortion"];

let pyodide: PyodideInterface | null = null;

function post(msg: WorkerOut): void {
  ctx.postMessage(msg);
}

async function fetchText(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(`Network error loading ${url} — check your connection and reload.`);
  }
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (HTTP ${res.status}).`);
  }
  return res.text();
}

async function doInit(): Promise<void> {
  if (pyodide) {
    post({ type: "ready" });
    return;
  }

  // The Pyodide runtime is fetched from the CDN. If the network is unavailable
  // (or the CDN is blocked) on first load, surface an actionable message.
  let loadPyodide: (config: { indexURL: string }) => Promise<PyodideInterface>;
  try {
    const mod = await import(/* @vite-ignore */ PYODIDE_MJS);
    loadPyodide = mod.loadPyodide;
  } catch {
    post({
      type: "init-error",
      error:
        "Could not reach the Pyodide runtime (CDN). The first load needs an internet connection; reconnect and reload. Once cached, VULCAN works offline.",
    });
    return;
  }

  try {
    post({ type: "progress", msg: "Loading Python runtime (one-time, ~12 seconds)..." });
    pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });

    post({ type: "progress", msg: "Installing NumPy and SciPy..." });
    await pyodide.loadPackage(["numpy", "scipy"]);

    // Global reference-data dict + a JSON encoder that survives non-finite
    // floats. Python's json.dumps emits the bare tokens Infinity / -Infinity /
    // NaN, which JSON.parse rejects — so we encode them as sentinel strings and
    // revive them on the JS side (see pyodide.ts). This protects every engine,
    // e.g. fatigue returning float("inf") for infinite life.
    await pyodide.runPythonAsync(`
import json as _json, math as _math

_tables = {}

def _vulcan_sanitize(o):
    if isinstance(o, float):
        if _math.isinf(o):
            return "__Infinity__" if o > 0 else "__-Infinity__"
        if _math.isnan(o):
            return "__NaN__"
        return o
    if isinstance(o, dict):
        return {k: _vulcan_sanitize(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_vulcan_sanitize(v) for v in o]
    return o

def _vulcan_safe_dumps(o):
    return _json.dumps(_vulcan_sanitize(o))
`);

    post({ type: "progress", msg: "Loading reference data..." });
    for (const name of DATA_FILES) {
      const json = await fetchText(`/python/data/${name}.json`);
      pyodide.globals.set(`_json_${name}`, json);
      await pyodide.runPythonAsync(`
import json as _json
_tables["${name}"] = _json.loads(_json_${name})
`);
    }

    post({ type: "progress", msg: "Loading calculation engines..." });
    for (const name of ENGINES) {
      const code = await fetchText(`/python/engines/${name}.py`);
      await pyodide.runPythonAsync(code);
    }

    post({ type: "progress", msg: "Ready." });
    post({ type: "ready" });
  } catch (e) {
    post({ type: "init-error", error: e instanceof Error ? e.message : String(e) });
  }
}

async function doCall(id: number, fn: string, input: string): Promise<void> {
  if (!pyodide) {
    post({ type: "result", id, data: JSON.stringify({ ok: false, error: "Python runtime not initialized." }) });
    return;
  }

  // Calls are serialized (one at a time) so a single shared input global is
  // safe. `fn` is always an internal engine name, never user input.
  pyodide.globals.set("_call_input", input);
  try {
    const resultJson = (await pyodide.runPythonAsync(`
import json as _json, traceback as _tb
try:
    _result = ${fn}(_json.loads(_call_input))
    _out = _vulcan_safe_dumps({"ok": True, "data": _result})
except Exception as _e:
    _out = _vulcan_safe_dumps({"ok": False, "error": str(_e), "trace": _tb.format_exc()})
_out
`)) as string;
    post({ type: "result", id, data: resultJson });
  } catch (e) {
    post({ type: "result", id, data: JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }) });
  } finally {
    pyodide.globals.delete("_call_input");
  }
}

// Serialize init and every engine call through one chain: Pyodide is
// single-threaded, so overlapping runPythonAsync calls must never interleave.
// doInit / doCall swallow their own errors and always post a reply, so the
// chain itself never rejects.
let queue: Promise<void> = Promise.resolve();

ctx.onmessage = (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  if (msg.type === "init") {
    queue = queue.then(doInit);
  } else if (msg.type === "call") {
    queue = queue.then(() => doCall(msg.id, msg.fn, msg.input));
  }
};
