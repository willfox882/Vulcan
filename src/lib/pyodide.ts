import type { PyodideInterface } from "pyodide";

export async function initializePyodide(
  onProgress: (msg: string) => void
): Promise<PyodideInterface> {
  onProgress("Loading Python runtime (one-time, ~12 seconds)...");
  const pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/",
  });

  onProgress("Installing NumPy and SciPy...");
  await pyodide.loadPackage(["numpy", "scipy"]);

  await pyodide.runPythonAsync(`_tables = {}`);

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
    const json = await fetch(`/python/data/${name}.json`).then((r) => r.text());
    pyodide.globals.set(`_json_${name}`, json);
    await pyodide.runPythonAsync(`
import json as _json
_tables["${name}"] = _json.loads(_json_${name})
`);
  }

  onProgress("Loading calculation engines...");
  for (const name of ["classifier", "structural", "symbol", "fatigue", "process", "metallurgy", "distortion"]) {
    const code = await fetch(`/python/engines/${name}.py`).then((r) => r.text());
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
    _out = _json.dumps({"ok": True, "data": _result})
except Exception as _e:
    _out = _json.dumps({"ok": False, "error": str(_e), "trace": _tb.format_exc()})
_out
`)) as string;

      if (signal?.aborted) throw new AbortedError();

      const result = JSON.parse(resultJson) as {
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
