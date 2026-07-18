---
title: Test flake -- fire-and-forget handler + fixed setTimeout races under suite load
type: lesson
created: 2026-06-23
slot: india
tags: [testing, flake, vitest, timing, concurrency, async, fire-and-forget, regression-hunt]
links:
  - "[[reference_loracomposition_flake_diagnosis_2026_06_23]]"
---

# Test flake: fire-and-forget handler + fixed `setTimeout` races under suite load

## Symptom
A test passes in isolation but fails intermittently under the full suite, with an assertion receiving `undefined`
(e.g. `expect(capturedResult).toBeDefined()` fails) or a default/zero value -- only when many test files run
concurrently. Re-running the same slice gives different pass/fail counts (non-deterministic).

## Anti-pattern (the cause)
```ts
let capturedResult;
const mockServer = { tool: (..., handler) => {
  handler({ action: "..." }).then(r => { capturedResult = r; });   // FIRE-AND-FORGET (not awaited)
}};
registerDispatcher(mockServer);
await new Promise(r => setTimeout(r, 50));   // FIXED timer race
expect(capturedResult).toBeDefined();        // undefined when the handler didn't finish in 50ms
```
The handler is `async` and chains `await import(...)` lazy-loads. Under vitest `maxConcurrency` (e.g. 16) the
thread pool is contended, so cold module resolution + V8 compile can exceed the fixed 50ms budget -> the
`.then` callback hasn't fired -> `capturedResult` is still `undefined` when the assertion runs.

## Misdiagnosis to avoid (R12)
It looks like cross-file "state pollution" (a polluter test mutating a shared singleton/cache), but with vitest
`pool: "threads"` + `isolate: true` (see `vitest.config.ts`) EACH TEST FILE gets a fresh module registry --
cross-file shared-state pollution is **architecturally impossible**. Decisive tell: a state polluter would make the
handler RESOLVE with a WRONG value; `undefined` means the async chain never completed. Don't bisect for a polluter
that can't exist -- check for an un-awaited async handler raced by a fixed timer first.

## Fix (R9-strengthening, test-only)
Capture the handler promise and await it -- never race a fixed timer:
```ts
let handlerPromise;
const mockServer = { tool: (..., handler) => {
  handlerPromise = handler({ action: "..." }).then(r => { capturedResult = r; });
}};
registerDispatcher(mockServer);
await handlerPromise;   // wait on REAL completion -> load-independent
expect(capturedResult).toBeDefined();
```
This strengthens the test (it now waits on real async completion) -- the assertions are unchanged. Verified on
`loraCompositionU-LEARN-05.test.ts` (commit `b716e0414e`): isolated 41/41 + green under the full `engines/` slice
load where it previously flaked.

## Fleet scope (detection)
Likely fleet-wide. A single full-`engines/`-slice load run surfaced ~65 failures across 7 OTHER test files (e.g.
LatheProgramOptimizerEngine) with the same shape. A hygiene sweep should grep `src/__tests__/**` for the pattern:
a `handler(...).then(` (or `.catch`) that is NOT awaited, followed by `await new Promise(r => setTimeout(...))` and
an assertion -- and convert each to await the real promise. Severity: low (test-timing only; production unaffected),
but it erodes CI signal. Cross-domain -- route per owning slot / golf hygiene.
