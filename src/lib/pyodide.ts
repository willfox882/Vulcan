import type { PyodideInterface } from "pyodide";

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

export async function initializePyodide(
  onProgress: (msg: string) => void
): Promise<PyodideInterface> {
  // The Pyodide runtime is injected by the CDN <script> in index.html. If the
  // network is unavailable (or the CDN is blocked) on first load, that global
  // is missing — surface an actionable message instead of a bare
  // "loadPyodide is not defined" ReferenceError.
  if (typeof loadPyodide === "undefined") {
    throw new Error(
      "Could not reach the Pyodide runtime (CDN). The first load needs an internet connection; reconnect and reload. Once cached, VULCAN works offline."
    );
  }

  onProgress("Loading Python runtime (one-time, ~12 seconds)...");
  const pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/",
  });

  onProgress("Installing NumPy and SciPy...");
  await pyodide.loadPackage(["numpy", "scipy"]);

  // Global reference-data dict + a JSON encoder that survives non-finite
  // floats. Python's json.dumps emits the bare tokens Infinity / -Infinity /
  // NaN, which JSON.parse rejects — so we encode them as sentinel strings and
  // revive them on the JS side (see callEngine). This protects every engine,
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

  onProgress("Loading reference data...");
  const dataFiles = [
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
  for (const name of dataFiles) {
    const json = await fetchText(`/python/data/${name}.json`);
    pyodide.globals.set(`_json_${name}`, json);
    await pyodide.runPythonAsync(`
import json as _json
_tables["${name}"] = _json.loads(_json_${name})
`);
  }

  onProgress("Loading calculation engines...");
  for (const name of ["classifier", "structural", "symbol", "fatigue", "process", "metallurgy", "distortion"]) {
    const code = await fetchText(`/python/engines/${name}.py`);
    await pyodide.runPythonAsync(code);
  }

  onProgress("Ready.");
  return pyodide;
}

// Serializing queue: only one Pyodide call executes at a time.
// Prevents concurrent callers from overwriting each other's input global.
let _callCounter = 0;
let _callQueue: Promise<unknown> = Promise.resolve();

class AbortedError extends Error {
  name = "AbortError";
  constructor() {
    super("Pyodide call aborted");
  }
}

export async function callEngine<T>(
  pyodide: PyodideInterface,
  functionName: string,
  input: unknown,
  signal?: AbortSignal
): Promise<T> {
  const id = ++_callCounter;
  const key = `_call_input_${id}`;

  const task = _callQueue.then(async () => {
    if (signal?.aborted) throw new AbortedError();

    pyodide.globals.set(key, JSON.stringify(input));
    try {
      const resultJson = (await pyodide.runPythonAsync(`
import json as _json, traceback as _tb
try:
    _result = ${functionName}(_json.loads(${key}))
    _out = _vulcan_safe_dumps({"ok": True, "data": _result})
except Exception as _e:
    _out = _vulcan_safe_dumps({"ok": False, "error": str(_e), "trace": _tb.format_exc()})
_out
`)) as string;

      if (signal?.aborted) throw new AbortedError();

      const result = JSON.parse(resultJson, (_k, v) =>
        v === "__Infinity__" ? Infinity
        : v === "__-Infinity__" ? -Infinity
        : v === "__NaN__" ? NaN
        : v
      ) as {
        ok: boolean;
        data?: T;
        error?: string;
        trace?: string;
      };
      if (!result.ok) {
        console.error("Python engine error:", result.trace);
        throw new Error(result.error ?? "Unknown Python engine error");
      }
      return result.data as T;
    } finally {
      pyodide.globals.delete(key);
    }
  });

  // Chain the next caller behind this one, but don't propagate rejection
  // into the queue itself (each caller observes its own error via `task`).
  _callQueue = task.catch(() => {});

  return task as Promise<T>;
}
