# WIRE-UNWIRED-MS0/U-WIRE-SCR — [WIRE-UNWIRED-MS0]/U-WIRE-SCR+LBD+SLO: wire 3 observability/recommender engines into prism_dev (19 actions)

**Commit:** `f1e6151b9c84` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T06:37:41-05:00
**Tags:** wire-unwired-ms0, u-wire-scr, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-SCR+LBD+SLO: wire 3 observability/recommender engines into prism_dev (19 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-SCR+LBD+SLO: wire 3 observability/recommender engines into prism_dev (19 actions)

3 dev-tool engines bundled (all read-only-wires; writes DEFERRED):

SCR (4 actions) — SlashCommandRecommenderEngine (PP-0.17-U-PLG2):
- scr_get: command → CommandEntry (found:true|false)
- scr_list: every registered command
- scr_size: count
- scr_recommend: prompt+top_n+min_confidence → CommandRecommendation[]
DEFER: register/registerAll/clear/loadFromRegistryFile

LBD (7 actions) — LatencyBudgetDecompositionEngine (U-LPR-PERF-SLO):
- lbd_get_budget / list_budgets / aggregate_budget / validate_profile_budget
- lbd_list_observations / stage_stats / get_stats
DEFER: setBudget/clearAll. stage_stats wrapped try/catch (engine throws on
unknown profile/stage; dispatcher emits error envelope).

SLO (8 actions) — SLOEngine (U-LPR-OBS5):
- slo_get_slo / list_slos / get_status / get_error_budget / generate_report
  / is_alerting / get_alerting_slos / get_stats
DEFER: registerSLO/recordEvent/recordLatency/registerStandardSLOs/clear

Wire-safety doctrine:
- All 19 methods pure reads against engine internal state
- found:true|false on every get-by-id (slimResponse strips null)
- is_alerting:true|'no' discriminator (slimResponse strips false)
- count survivors alongside arrays
- DoS guards: 8KB prompt cap (SCR), 10k obs limit (LBD), 256-char ids
- Engine seed via deferred writes in beforeAll (SLO requires burnRates:[])

Tests: 29/29 PASS (schema gates + happy paths against seeded SCR/SLO +
ROUTING PROOFs (lbd stats byte-equal, slo list_slos id-set parity) +
discriminator shape contracts + try/catch error-envelope path on
stage_stats + 3 schema-reject envelope checks).

Iter discovery: SLOEngine.registerSLO requires burnRates:[] (not optional);
LatencyBudgetDecompositionEngine.stageStats throws on missing budget —
dispatcher wraps in try/catch for the LLM boundary.
```

## Files touched (4)
- .../src/__tests__/dispatcher.scrLbdSlo.test.ts     | 313 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  94 +++++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  | 168 ++++++++++-
- 3 files changed, 574 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f1e6151b9c84`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._