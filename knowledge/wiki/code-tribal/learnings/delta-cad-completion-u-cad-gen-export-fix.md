# DELTA-CAD-COMPLETION/U-CAD-GEN-EXPORT-FIX — [MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-GEN-EXPORT-FIX (slot:delta): fix cadquery export API in codegen prompt + loop retry-on-contention

**Commit:** `d2bd9bb7179d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T22:51:29-05:00
**Tags:** delta-cad-completion, u-cad-gen-export-fix, auto-distilled

## Subject
[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-GEN-EXPORT-FIX (slot:delta): fix cadquery export API in codegen prompt + loop retry-on-contention

## Body
```
[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-GEN-EXPORT-FIX (slot:delta): fix cadquery export API in codegen prompt + loop retry-on-contention

ROOT CAUSE (diagnosed, R12): cad-text-to-cadquery generated valid CadQuery but the model used
result.exportStep() -- which does NOT exist on a cadquery 2.8 Workplane (AttributeError) -> 0
STEP produced. cadquery 2.8.0 IS installed (build123d is not); pythonCadAvailable() correctly
falls through to cadquery. Fix: add EXACT export-API hard rule to buildPrompt (cq.exporters.export
(result, OUTPUT_STEP); build123d export_step) -> verified executed:true + real model.step produced.
Compounds with india's cad-text learn-loop cron adc3b7c2.
LOOP ROBUSTNESS (R16): (1) shouldCursor -- transient exit-4 errors (Ollama/GPU contention timeouts,
16/23 in the first batch) now RETRY next run instead of being permanently cursored; (2) classifyGen
recognizes executed:true / dir / stepPath as a real staged STEP (was only stagedDir). 12/12 tests.
KNOWN: dim-validation (cad-analyze-step.mjs) is slot-delta-only -> analysisExit 1 on trunk until
merge; gen+STEP work now, validation post-merge.
```

## Files touched (4)
- scripts/cad-gen-overnight-loop.mjs      | 168 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cad-gen-overnight-loop.test.mjs |  15 ++++++++++++++-
- scripts/cad-text-to-cadquery.mjs        |   5 +++++
- 3 files changed, 187 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d2bd9bb7179d`
- Milestone envelope: `mcp-server/data/milestones/DELTA-CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._