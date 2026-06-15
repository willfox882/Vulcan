import type { WorkerIn, WorkerOut } from "./pyodideProtocol";

/**
 * Transport abstraction over the Web Worker. Injecting it keeps the client
 * logic (request/response correlation, abort, JSON revival) testable in a
 * plain node environment without a real Worker.
 */
export interface Transport {
  post(msg: WorkerIn): void;
  setHandler(cb: (msg: WorkerOut) => void): void;
}

export class AbortedError extends Error {
  name = "AbortError";
  constructor() {
    super("Pyodide call aborted");
  }
}

export interface PyodideClient {
  init(onProgress: (msg: string) => void): Promise<void>;
  call<T>(functionName: string, input: unknown, signal?: AbortSignal): Promise<T>;
}

interface EngineEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  trace?: string;
}

// Python's json.dumps can't emit Infinity / NaN as valid JSON, so the worker
// encodes them as sentinel strings; revive them here.
function reviveEnvelope<T>(json: string): EngineEnvelope<T> {
  return JSON.parse(json, (_k, v) =>
    v === "__Infinity__"
      ? Infinity
      : v === "__-Infinity__"
        ? -Infinity
        : v === "__NaN__"
          ? NaN
          : v
  ) as EngineEnvelope<T>;
}

export function createPyodideClient(transport: Transport): PyodideClient {
  let nextId = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();
  let onProgress: ((msg: string) => void) | null = null;
  let initResolve: (() => void) | null = null;
  let initReject: ((e: Error) => void) | null = null;

  transport.setHandler((msg) => {
    switch (msg.type) {
      case "progress":
        onProgress?.(msg.msg);
        break;
      case "ready":
        initResolve?.();
        initResolve = initReject = null;
        break;
      case "init-error":
        initReject?.(new Error(msg.error));
        initResolve = initReject = null;
        break;
      case "result": {
        const p = pending.get(msg.id);
        // No pending entry => the caller already aborted; drop the late result.
        if (!p) break;
        pending.delete(msg.id);
        let env: EngineEnvelope<unknown>;
        try {
          env = reviveEnvelope(msg.data);
        } catch (err) {
          p.reject(err);
          break;
        }
        if (!env.ok) {
          if (env.trace) console.error("Python engine error:", env.trace);
          p.reject(new Error(env.error ?? "Unknown Python engine error"));
        } else {
          p.resolve(env.data);
        }
        break;
      }
    }
  });

  return {
    init(progress) {
      onProgress = progress;
      return new Promise<void>((resolve, reject) => {
        initResolve = resolve;
        initReject = reject;
        transport.post({ type: "init" });
      });
    },

    call<T>(functionName: string, input: unknown, signal?: AbortSignal): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new AbortedError());
          return;
        }
        const id = ++nextId;
        const onAbort = () => {
          // Abort just stops the UI from applying the result — Python can't be
          // interrupted mid-run, so the eventual worker reply is dropped above.
          if (pending.delete(id)) reject(new AbortedError());
        };
        pending.set(id, {
          resolve: (v) => {
            signal?.removeEventListener("abort", onAbort);
            resolve(v as T);
          },
          reject: (e) => {
            signal?.removeEventListener("abort", onAbort);
            reject(e);
          },
        });
        signal?.addEventListener("abort", onAbort);
        transport.post({ type: "call", id, fn: functionName, input: JSON.stringify(input) });
      });
    },
  };
}

// --- Real Worker-backed singleton ------------------------------------------

function createWorkerTransport(): Transport {
  const worker = new Worker(new URL("./pyodideWorker.ts", import.meta.url), {
    type: "module",
  });
  return {
    post: (msg) => worker.postMessage(msg),
    setHandler: (cb) => {
      worker.onmessage = (e: MessageEvent<WorkerOut>) => cb(e.data);
    },
  };
}

let _client: PyodideClient | null = null;
function getClient(): PyodideClient {
  if (!_client) _client = createPyodideClient(createWorkerTransport());
  return _client;
}

/** Spin up the Pyodide worker and resolve once it is ready to take calls. */
export function initializePyodide(onProgress: (msg: string) => void): Promise<void> {
  return getClient().init(onProgress);
}

/** Run a Python engine function in the worker and return its parsed result. */
export function callEngine<T>(functionName: string, input: unknown, signal?: AbortSignal): Promise<T> {
  return getClient().call<T>(functionName, input, signal);
}
