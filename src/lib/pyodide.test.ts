import { describe, it, expect, vi } from "vitest";
import { createPyodideClient, AbortedError, type Transport } from "./pyodide";
import type { WorkerIn, WorkerOut } from "./pyodideProtocol";

/**
 * In-memory transport: records messages the client posts to the worker and lets
 * the test feed worker replies back. This exercises the real request/response
 * correlation, abort, and JSON-revival logic without a browser Worker.
 */
function fakeTransport() {
  const posted: WorkerIn[] = [];
  let handler: ((m: WorkerOut) => void) | null = null;
  const transport: Transport = {
    post: (m) => posted.push(m),
    setHandler: (cb) => {
      handler = cb;
    },
  };
  return {
    transport,
    posted,
    emit: (m: WorkerOut) => handler!(m),
    lastCallId: () => {
      for (let i = posted.length - 1; i >= 0; i--) {
        const m = posted[i];
        if (m.type === "call") return m.id;
      }
      throw new Error("no call posted");
    },
  };
}

const okResult = (id: number, data: unknown): WorkerOut => ({
  type: "result",
  id,
  data: JSON.stringify({ ok: true, data }),
});

describe("pyodide client — init", () => {
  it("posts init, forwards progress, resolves on ready", async () => {
    const fake = fakeTransport();
    const client = createPyodideClient(fake.transport);
    const progress = vi.fn();

    const p = client.init(progress);
    expect(fake.posted).toContainEqual({ type: "init" });

    fake.emit({ type: "progress", msg: "Loading..." });
    fake.emit({ type: "ready" });

    await expect(p).resolves.toBeUndefined();
    expect(progress).toHaveBeenCalledWith("Loading...");
  });

  it("rejects on init-error", async () => {
    const fake = fakeTransport();
    const client = createPyodideClient(fake.transport);
    const p = client.init(() => {});
    fake.emit({ type: "init-error", error: "no CDN" });
    await expect(p).rejects.toThrow("no CDN");
  });
});

describe("pyodide client — call", () => {
  it("resolves with the engine data envelope", async () => {
    const fake = fakeTransport();
    const client = createPyodideClient(fake.transport);

    const p = client.call<{ x: number }>("analyze_joint", { a: 1 });
    const id = fake.lastCallId();
    // input is serialized to JSON
    expect(fake.posted.at(-1)).toEqual({ type: "call", id, fn: "analyze_joint", input: '{"a":1}' });

    fake.emit(okResult(id, { x: 42 }));
    await expect(p).resolves.toEqual({ x: 42 });
  });

  it("rejects when the engine reports ok:false", async () => {
    const fake = fakeTransport();
    const client = createPyodideClient(fake.transport);
    const p = client.call("analyze_joint", {});
    const id = fake.lastCallId();
    fake.emit({ type: "result", id, data: JSON.stringify({ ok: false, error: "boom" }) });
    await expect(p).rejects.toThrow("boom");
  });

  it("revives non-finite sentinels", async () => {
    const fake = fakeTransport();
    const client = createPyodideClient(fake.transport);
    const p = client.call<{ life: number; bad: number }>("analyze_fatigue", {});
    const id = fake.lastCallId();
    fake.emit(okResult(id, { life: "__Infinity__", bad: "__NaN__" }));
    const r = await p;
    expect(r.life).toBe(Infinity);
    expect(Number.isNaN(r.bad)).toBe(true);
  });

  it("correlates concurrent calls by id (out-of-order replies)", async () => {
    const fake = fakeTransport();
    const client = createPyodideClient(fake.transport);

    const p1 = client.call<string>("a", {});
    const id1 = fake.lastCallId();
    const p2 = client.call<string>("b", {});
    const id2 = fake.lastCallId();
    expect(id2).not.toBe(id1);

    fake.emit(okResult(id2, "two"));
    fake.emit(okResult(id1, "one"));

    expect(await p1).toBe("one");
    expect(await p2).toBe("two");
  });
});

describe("pyodide client — abort", () => {
  it("rejects immediately for an already-aborted signal and posts nothing", async () => {
    const fake = fakeTransport();
    const client = createPyodideClient(fake.transport);
    const ac = new AbortController();
    ac.abort();

    const p = client.call("analyze_joint", {}, ac.signal);
    await expect(p).rejects.toBeInstanceOf(AbortedError);
    expect(fake.posted.some((m) => m.type === "call")).toBe(false);
  });

  it("rejects on abort and drops a late worker reply", async () => {
    const fake = fakeTransport();
    const client = createPyodideClient(fake.transport);
    const ac = new AbortController();

    const p = client.call("analyze_joint", {}, ac.signal);
    const id = fake.lastCallId();
    ac.abort();
    await expect(p).rejects.toBeInstanceOf(AbortedError);

    // The worker still finishes and replies; the client must ignore it silently.
    expect(() => fake.emit(okResult(id, { x: 1 }))).not.toThrow();
  });
});
