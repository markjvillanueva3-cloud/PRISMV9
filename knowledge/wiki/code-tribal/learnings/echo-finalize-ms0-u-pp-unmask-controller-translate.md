# ECHO-FINALIZE-MS0/U-PP-UNMASK-CONTROLLER-TRANSLATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-FINALIZE-MS0]/U-PP-UNMASK-CONTROLLER-TRANSLATE (slot:echo): fix wrong-engine wiring -- pp_controller_translate now does real cross-dialect transpilation

**Commit:** `d671f0f1afe5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T23:03:36-05:00
**Tags:** echo-finalize-ms0, u-pp-unmask-controller-translate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-FINALIZE-MS0]/U-PP-UNMASK-CONTROLLER-TRANSLATE (slot:echo): fix wrong-engine wiring -- pp_controller_translate now does real cross-dialect transpilation

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-FINALIZE-MS0]/U-PP-UNMASK-CONTROLLER-TRANSLATE (slot:echo): fix wrong-engine wiring -- pp_controller_translate now does real cross-dialect transpilation

UNMASK (now reachable since prism_pp is LIVE): pp_controller_translate was wired to
PostProcessorTransformerEngine -- a neural diffusion/tokenizer with NO translate/transform method, so
it ALWAYS returned {error:'translate not found'}. Cross-controller dialect translation is
GCodeTranspilerEngine's job. Re-routed to its real transpile() (added a 'transpiler' getEngine key +
_ppTranspiler cache) and a FAIL-LOUD dialect guard (the transpiler supports 6 of the 13 pp controller
enum values; the prior code silently errored on all).

TEST (5/5, real round-trip through registerPPDispatcher): fanuc->siemens emits siemens MCALL safe-start
+ reformats '(ROUGH PASS)' to ';ROUGH PASS' (not '()'); fanuc->okuma emits okuma-specific 'G15 H0';
fanuc->heidenhain emits ';' comments WITHOUT MCALL (per-dialect routing, not a siemens copy); guards:
unsupported target (hurco) + source (mitsubishi) fail loud with the exact supported set.
VALIDATE: build:fast clean; existing pp tests 27/27 (no regression); ascii clean.

HONEST (R12): the earlier '37 stub' awk over-counted -- many fallback-text actions resolve via their
secondary method (pp_validate_program->verify, pp_analyze_cps->analyzeFile both EXIST). Ledger A2
records the re-triage rule; cross-domain stubs (physics->bravo/neural->india) are not echo's to inline.
```

## Files touched (4)
- mcp-server/src/__tests__/ppDispatcher.controller-translate.test.ts | 90 ++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/ppDispatcher.ts                   | 27 ++++++++++++--
- state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md                       | 14 ++++++++
- 3 files changed, 129 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- wrong-engine wiring -- pp_controller_translate now does real cross-dialect transpilation

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d671f0f1afe5`
- Milestone envelope: `mcp-server/data/milestones/ECHO-FINALIZE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._