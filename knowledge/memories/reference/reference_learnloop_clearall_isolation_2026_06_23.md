---
name: reference_learnloop_clearall_isolation_2026_06_23
description: "LearningLoopEngine.clearAll() test-isolation bug + likely-FLEET-WIDE pattern: a lazy-init engine whose clearAll() helper sets corrections=[] but NOT initialized=true is defeated by the next accessor's await initialize(), which reloads persisted state from agentMemoryFabricEngine and repopulates the array. Caused an env-dependent failure of LearningLoopEngine.test.ts:162. Fixed by clearAll() also setting initialized=true (commit 86df6d9fae, U-LEARNLOOP-CLEARALL-ISOLATION, slot:india 2026-06-23). Open P2: containsSimilar matchRatio>0.6 word-overlap false-positives on short patterns."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.642Z
aliases: reference_learnloop_clearall_isolation_2026_06_23
---


# Lazy-init engine clearAll() must also set initialized=true (test-isolation)

## The bug (env-dependent test failure)
`LearningLoopEngine` is lazy-initialized: `initialize()` does `if (this.initialized) return;` then loads ALL
persisted `"correction"` memories from the shared `agentMemoryFabricEngine` into `this.corrections` and sets
`initialized=true`. The test helper `clearAll()` set `this.corrections = []` but left `initialized=false`.
Every accessor (`checkForCorrection`/`getByDomain`/`getByEntity`/`recordCorrection`/...) opens with
`await this.initialize()` -- so on a freshly-cleared engine the FIRST accessor reloaded the persisted corpus and
repopulated the array, defeating the clear. On a host with a populated correction corpus, one short-pattern
correction false-matched `"The weather is nice today"` via the `matchRatio>0.6` word-overlap in `containsSimilar`
-> `checkForCorrection` returned `triggered:true` -> `should not trigger for unrelated content`
(`src/__tests__/engines/LearningLoopEngine.test.ts:162`) FAILED. It would PASS on a clean machine (no persisted
corpus) -- a classic environment-dependent test failure.

## The fix (commit 86df6d9fae)
`clearAll()` now also sets `this.initialized = true`, so the subsequent lazy `initialize()` is a no-op and does not
reload persistence -> the cleared store stays empty -> genuine test isolation. Surgical + production-safe: clearAll
is a test-only helper (ZERO production callers of `learningLoopEngine.clearAll`; the two production consumers
`agentDispatcher.ts:391` + `orchestrationDispatcher.ts:861` are read-only `getStats()`). Production
`checkForCorrection` matching is UNCHANGED; the assertion was NOT weakened (R9). engines/ test 29->30 green,
maintained root `LearningLoopEngine.test.ts` 26/26 still green; 2-arm scrutiny PASS.

## FLEET-WIDE SWEEP -- DONE, 0 other instances (2026-06-23, same session)
Ran a deterministic detector over ALL 45 lazy-init engines (those containing `if (this.initialized) return`):
for each, brace-matched every state-clearing reset method (clearAll|reset|clearState|clearCorrections|clearCache|
clearMemory|clearData|flush|wipe|purge|clear that mutates a collection) and checked whether its body touches
`this.initialized`. **Result: 0 candidates** (both a narrow and a broadened name-set scan). So `LearningLoopEngine`
was the SOLE instance of this isolation defect -- NO fleet-wide spread, no further cleanup needed. Do NOT re-run
this sweep. (The detector pattern is reusable if new lazy-init engines with reset helpers are added later.)

## P2 -- RESOLVED 2026-06-23 (commit 4ff03e9f7b, U-LEARNLOOP-CONTAINSSIMILAR-FLOOR)
`containsSimilar` now returns `matchRatio > 0.6 && matchCount >= 3` (was ratio-only). The unchanged direct
substring match still covers short EXACT patterns, so the floor only removes spurious fuzzy matches. Verified
SAFE: `checkForCorrection` (the sole caller) has ZERO production consumers (the 2 dispatcher wirings call
getStats only), so it is a precision improvement to an as-yet-unconsumed method -- no live regression. Recall
trade is inert for >=5-word patterns (floor never binds) and byte-identical for 4-word; only a 3-word/2-of-3/
non-substring case is newly missed (acceptable). R9 regression test added (positive control + the
"feed rate question" negative); analyst empirically confirmed it fails without the floor. 57/57 LearningLoop
tests green. No further action.
