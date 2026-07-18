# LOCAL-LLM-MS1/U-LOCAL-GENERATE-NUMCTX-SCRUTINY-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE-NUMCTX-SCRUTINY-FIX (slot:india): close per-file arm-A P1 -- harden the fetch-stub tests against cross-test contamination

**Commit:** `f5aa704075bd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T18:59:10-05:00
**Tags:** local-llm-ms1, u-local-generate-numctx-scrutiny-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE-NUMCTX-SCRUTINY-FIX (slot:india): close per-file arm-A P1 -- harden the fetch-stub tests against cross-test contamination

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE-NUMCTX-SCRUTINY-FIX (slot:india): close per-file arm-A P1 -- harden the fetch-stub tests against cross-test contamination

Per-file scrutiny (arm A) of U-LOCAL-GENERATE-NUMCTX saw the byte-identical-omit invariant test fail ONCE (unreproducible in 15+ retries): the file's fetch-stub tests mutate globalThis.fetch + share the OllamaTaskOffloaderEngine singleton with only per-test try/finally restore, so a stubbed fetch could leak into a sibling test under vitest worker scheduling. Added a describe-level afterEach that restores REAL_FETCH (captured at module load) after EVERY test -- belt-and-suspenders net so a stub can never leak even if a test throws before its finally. Code under test was already correct (arm B mutation-verified the regression guard); this hardens the TEST. 13/13 x5 consecutive runs, 0 flake.
```

## Files touched (2)
- mcp-server/src/__tests__/localDispatcherLocalGenerate.test.ts | 11 ++++++++++-
- 1 file changed, 10 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f5aa704075bd`
- Milestone envelope: `mcp-server/data/milestones/LOCAL-LLM-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._