// Message protocol shared by the main-thread client (pyodide.ts) and the
// Pyodide Web Worker (pyodideWorker.ts). Kept in its own module so both sides
// stay in sync and neither imports the other's runtime code.

/** Messages the main thread sends to the worker. */
export type WorkerIn =
  | { type: "init" }
  | { type: "call"; id: number; fn: string; input: string };

/** Messages the worker sends back to the main thread. */
export type WorkerOut =
  | { type: "progress"; msg: string }
  | { type: "ready" }
  | { type: "init-error"; error: string }
  // `data` is the engine's JSON string: {"ok":true,"data":...} or
  // {"ok":false,"error":...,"trace"?:...}, possibly carrying the non-finite
  // sentinel strings the client revives.
  | { type: "result"; id: number; data: string };
