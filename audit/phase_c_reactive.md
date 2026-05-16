# Phase C — Reactive Pipeline Trace

The user-reported symptom — "input changes (t1, L) frequently fail to propagate to results" — is largely explained by **two race conditions** in the IPC layer (C-101, C-102), not by the reactive layer itself, which on inspection wires up correctly.

## C.1 — Forward trace: web thickness `t1`

1. **Owner:** `src/components/jointEditor/geometry/TJointGeometryPanel.tsx` (not read in this audit, but contract is clear from `types.ts:2`: `webThickness: number`).
2. **onChange:** calls `useProjectStore.updateJoint(activeJoint.id, { geometry: { ...activeJoint.geometry, webThickness: v } })`.
3. **Store action:** `projectStore.ts:123` `updateJoint` — maps joints, produces a *new* joint object with new geometry, recomputes `activeJoint` reference. Both `project` and `activeJoint` references change atomically.
4. **Selectors:** `ResultsPanel.tsx:42` destructures `activeJoint` from `useProjectStore()` (no selector — subscribes to whole store). React render is triggered.
5. **No hash function** exists. Recomputation is keyed purely on `activeJoint` reference identity.
6. **Effect:** `ResultsPanel.tsx:72` `useEffect(..., [activeJoint, pyodide])` re-fires.
7. **Debounce:** clear prior `setTimeout`, schedule new at 100 ms. Trailing-edge ✓.
8. **After 100 ms:** awaits 5 sequential `callEngine`s.
9. **Input object:** `{ joint: { ...activeJoint.geometry, type: activeJoint.type }, material, loads, service }` — `webThickness` is a property of `activeJoint.geometry` so it is in `joint.webThickness` ✓.
10. **Python side:** `structural.py:71` `t1 = joint["webThickness"]` ✓.
11. **Used in:** `I_ux = 2·L·(t1/2)²`, corner positions `(±L/2, ±t1/2)`, validation thicker/thinner. ✓
12. **Result writes** to `useResultsStore.results[activeJoint.id]`.
13. **Display:** `StructuralResults` re-renders.

**Verdict: the reactive plumbing is correct.** Changing `t1` *does* re-fire the effect every time. The problem isn't that the React tree fails to react — it's that the call may be silently corrupted in flight (see C-101).

The same trace applies to `jointLength`, `weldSize`, `Fy`, `material.id`, and load-case fields — all routed through `updateJoint`, all create a new `activeJoint` reference.

## C.2 — Stale-closure search

- `ResultsPanel.tsx:72` — deps include `activeJoint` and `pyodide`. ✓
- `ResultsPanel.tsx:62`–`70` — derives `result`, `procResult`, etc. from store on every render — no stale capture.
- `WeldSymbolPreview.tsx:37–51` — deps explicitly enumerate every primitive field of `sym`. ✓ (won't break if you add new symbol fields, but at least won't silently miss the listed ones).
- `App.tsx:30` `handleSave` `useCallback([project])` — refreshed on every project change. ✓
- `App.tsx:39` autosave effect — deps `[project]`. ✓
- `App.tsx:63` keydown handler — deps `[handleSave, handleLoad]`. ✓ (handlers refreshed when project changes.)

**No stale-closure bugs found.**

## C.3 — Hash function audit

There is no hash. The system relies on Zustand object-identity changes. Pros: cannot omit a field. Cons: any unrelated store mutation (e.g., a different joint's `updateJoint`) does **not** falsely trigger because `activeJoint` reference is recomputed only when its joint changes — and the React reference equality check correctly discards no-op updates.

**Verdict:** identity-based recomputation is correct here. **No finding.**

## C.4 — Debounce verification

- 100 ms trailing-edge in `ResultsPanel`. ✓ Cancellation correct.
- 3000 ms trailing-edge in `App.tsx` autosave. ✓
- **MINOR C-103:** `WeldSymbolPreview` has no debounce — it fires on every symbol-field change, sometimes piggybacking on the structural recompute. With C-101 below this can collide with a structural call.

## C.5 — AbortController and stale results

- **CRITICAL C-101:** No `AbortController` anywhere. Sequence under fast typing:
  1. User types `t1=10` → effect schedules at t=0.
  2. At t=100 ms, async chain A starts: `analyze_joint` (200 ms wall-clock), then `analyze_fatigue`, `select_process`, `analyze_metallurgy`, `predict_distortion`.
  3. At t=120 ms, user types `t1=11` → cleanup clears the *next* setTimeout (none pending), new setTimeout scheduled.
  4. At t=220 ms, async chain B starts and runs in parallel with chain A's tail.
  5. Both chains race to write `useResultsStore.results[id]` and the secondary stores. Whichever finishes *last* wins, regardless of which input was the user's latest. With 5 sequential awaits per chain, the tail of chain A often lands *after* chain B finishes → the displayed utilization corresponds to `t1=10`, not `t1=11`.
- This is the most likely root cause of the user's reported symptom.

## C.6 — Pyodide global-state contamination

- **CRITICAL C-102:** `callEngine` writes to a single shared global:
  ```js
  pyodide.globals.set("_call_input", inputJson);
  await pyodide.runPythonAsync(...);
  ```
  Two callers can interleave:
  1. Caller A: `set("_call_input", A)` → `runPythonAsync` enqueued.
  2. Caller B (different component re-render in same task): `set("_call_input", B)` *before* A's Python actually executes.
  3. A's Python runs `_json.loads(_call_input)` → reads **B's input** → returns a result the JS A-promise then reports as A's answer.
  Pyodide guarantees Python code itself is sequential, but there is no guarantee that the JS `set` and the Python read sit in the same atomic frame. Concretely, `WeldSymbolPreview`'s un-debounced effect can fire between the structural-chain's `set` and Python's read.
- Combined with C-101, this can also cause silent crashes (e.g., `analyze_joint` raises because it gets a `generate_symbol_svg` payload with no `joint` key).

## C.7 — Other findings in the wiring

- **MINOR C-104:** `ResultsPanel.tsx:81` only the *first* static load case feeds the structural engine; additional static cases are silently ignored. There is no UI hint that only the first matters.
- **MINOR C-105:** When `activeJoint.id` changes mid-run (user clicks a different joint while an engine call is in flight), the late writes still use the old captured `activeJoint.id` so the wrong joint's result row is updated — but it's the *correct* old joint's row, so this is inert in practice. Worth noting.
- **MINOR C-106:** `useProjectStore()` is destructured without a selector in `ResultsPanel`, `JointEditor`, and several others — every store mutation re-renders these subtrees. Performance, not correctness.
