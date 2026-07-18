---
name: reference_loracomposition_flake_diagnosis_2026_06_23
description: "RESOLVED 2026-06-23 (commit b716e0414e, U-LORACOMP-FLAKE-FIX, slot:india). The loraCompositionU-LEARN-05.test.ts suite-flake was NOT state pollution (the original hypothesis here was WRONG). vitest pool:threads + isolate:true makes cross-file pollution architecturally impossible. The 3 mlDispatcher LoRA-action tests invoked the handler FIRE-AND-FORGET then waited a fixed setTimeout(50) and asserted; under maxConcurrency:16 load the handler's await import(...) chain didn't resolve in 50ms -> capturedResult undefined -> fail. Fixed by awaiting the real handler promise. Also a likely FLEET-WIDE anti-pattern (7 other engines/ files flaked under the same load)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.648Z
aliases: reference_loracomposition_flake_diagnosis_2026_06_23
---


# loraComposition U-LEARN-05 flake -- RESOLVED (fire-and-forget timing anti-pattern)

## RESOLVED 2026-06-23 -- commit b716e0414e (U-LORACOMP-FLAKE-FIX)
Root-caused by a delegated regression-hunter agent (HIGH confidence) + fixed. **The original hypothesis in this
memo (external/transitive state polluter, needs a full-suite bisect) was WRONG -- R12 self-correction.**

### True root cause (NOT state pollution)
`vitest.config.ts` runs `pool: "threads"` with `isolate: true` -> each test FILE gets a fresh module registry, so
a cross-file polluter mutating a shared cache/singleton/registry is **architecturally impossible** (the mlDispatcher
lazy caches + the LoRA engine singletons are fresh per file). The 3 `mlDispatcher LoRA actions` tests
(`should handle lora_register_expert/dora_create/olora_check via dispatcher`) invoked the dispatcher handler
**fire-and-forget** -- `handler({...}).then(r => capturedResult = r)` was NOT awaited -- then waited a FIXED
`await new Promise(r => setTimeout(r, 50))` and asserted. The handler chains `await import(...)` lazy-loads; under
full-suite `maxConcurrency: 16` thread-pool contention that chain does not resolve in 50ms -> `capturedResult`
stays `undefined` -> `toBeDefined()` fails. A load-dependent TIMING flake, not a deterministic ordering polluter.
(Decisive tell: a state polluter would make the handler RESOLVE with a WRONG value, not leave it `undefined`.)

### Fix (R9-strengthening, test-only)
Capture `handlerPromise = handler({...}).then(...)` and `await handlerPromise` after `registerMLDispatcher`,
replacing the racy `setTimeout(50)`. Assertions unchanged -> the test now waits on REAL async completion and is
load-independent. Verified: isolated 41/41; GREEN under the full `src/__tests__/engines/` slice (was flaky).

## LIKELY FLEET-WIDE (open follow-up for a hygiene sweep -- golf/owner domains)
The same full-`engines/`-slice load run surfaced **65 failures across 7 OTHER test files** (e.g.
LatheProgramOptimizerEngine = whiskey/lathe). These are very likely the SAME fire-and-forget + fixed-`setTimeout`
load-timing anti-pattern (or genuine load-flakes), NOT necessarily india-owned. A fleet test-hygiene sweep should
grep `src/__tests__/**` for `setTimeout(` + fire-and-forget `handler(...).then(` (or `.catch`) followed by an
assertion, and convert each to await the real promise. Not done here (cross-domain, 65 failures = a dedicated
sweep). Severity low (test-timing only; production code unaffected).
