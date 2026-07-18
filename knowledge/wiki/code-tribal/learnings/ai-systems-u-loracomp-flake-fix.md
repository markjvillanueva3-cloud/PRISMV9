# AI-SYSTEMS/U-LORACOMP-FLAKE-FIX — [MAIN-FORCE] [AI-SYSTEMS]/U-LORACOMP-FLAKE-FIX (slot:india): fix loraComposition mlDispatcher test flake -- await the real handler promise, not a fixed 50ms timer

**Commit:** `b716e0414e6c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T11:25:53-05:00
**Tags:** ai-systems, u-loracomp-flake-fix, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS]/U-LORACOMP-FLAKE-FIX (slot:india): fix loraComposition mlDispatcher test flake -- await the real handler promise, not a fixed 50ms timer

## Body
```
[MAIN-FORCE] [AI-SYSTEMS]/U-LORACOMP-FLAKE-FIX (slot:india): fix loraComposition mlDispatcher test flake -- await the real handler promise, not a fixed 50ms timer

Root cause (regression-hunter agent, HIGH confidence; CORRECTS the prior diagnosis): NOT state pollution. vitest.config pool:threads + isolate:true gives each test FILE a fresh module registry, so the prior 'external/transitive polluter mutating a shared cache' hypothesis is architecturally IMPOSSIBLE. The 3 mlDispatcher LoRA-action tests invoked the handler FIRE-AND-FORGET (handler({...}).then(r=>capturedResult=r)) then waited a FIXED setTimeout(50) and asserted. The handler chains await import(...) lazy-loads; under full-suite maxConcurrency:16 thread-pool contention the chain does not resolve in 50ms -> capturedResult stays undefined -> toBeDefined fails. A load-dependent timing flake, not ordering.

Fix (R9-strengthening, test-only): capture handlerPromise = handler({...}).then(...) and await it after registerMLDispatcher, replacing the racy setTimeout(50). The assertions (toBeDefined/success/registered/adapter_id/violation_count) are UNCHANGED -- the test now waits on REAL async completion, so it is load-independent. Verified: isolated 41/41; and under the full src/__tests__/engines/ slice (the repro condition) loraComposition is GREEN (absent from the failure set), where it previously flaked. Low severity; production code untouched.
```

## Files touched (2)
- mcp-server/src/__tests__/engines/loraCompositionU-LEARN-05.test.ts | 21 +++++++++++++++------
- 1 file changed, 15 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b716e0414e6c`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._