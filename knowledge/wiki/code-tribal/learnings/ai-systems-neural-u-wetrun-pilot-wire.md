# AI-SYSTEMS-NEURAL/U-WETRUN-PILOT-WIRE — [MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-WETRUN-PILOT-WIRE (slot:india): fix dark wet_run_pilot_orchestrate -> real pilotPromotionReadiness (3rd india clean)

**Commit:** `62661e33fb63` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T19:45:12-05:00
**Tags:** ai-systems-neural, u-wetrun-pilot-wire, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-WETRUN-PILOT-WIRE (slot:india): fix dark wet_run_pilot_orchestrate -> real pilotPromotionReadiness (3rd india clean)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-WETRUN-PILOT-WIRE (slot:india): fix dark wet_run_pilot_orchestrate -> real pilotPromotionReadiness (3rd india clean)

orchestrationDispatcher's wet_run_pilot_orchestrate was facade-wired to run/orchestrate/
execute (none exist on WetRunPilotOrchestratorEngine) -> always "method not callable".
Real method = pilotPromotionReadiness(pilotId, nowTs): PilotPromotionReadiness --
POSITIONAL args (the facade passed one params object, so even a name match would have
mis-called it).

- rewire: destructure params -> pilotPromotionReadiness(p.pilot_id, nowTs); default
  nowTs to Date.now() when omitted (the gate answers "ready as of now").
- NO schema: the engine self-validates (validateString pilot_id non-empty + validateTs
  finite, throws -> dispatcherError).
- mock-server test (3): real readiness (pilot_id echo, as_of_ts echoes the positional
  nowTs, ready boolean, blockers[], breakdown obj); nowTs-default path (finite, >= now);
  missing pilot_id rejected (self-validation, no "ready" leak).

tsc 0 my files (16GB heap); 3/3. 3 of 4 verified india clean dark actions now fixed
(cross_domain/foresight/wet_run). Remaining clean: uncertainty_pipeline_run (engine does
NOT self-validate -> needs a crash-guard, best as an engine self-guard clause).
```

## Files touched (3)
- mcp-server/src/__tests__/orchestrationDispatcher.wetrun-pilot-wire.test.ts | 57 ++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/orchestrationDispatcher.ts                | 10 +++++--
- 2 files changed, 65 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 62661e33fb63`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-NEURAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._