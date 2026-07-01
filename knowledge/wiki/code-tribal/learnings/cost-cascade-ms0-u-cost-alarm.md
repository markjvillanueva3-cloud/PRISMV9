# COST-CASCADE-MS0/U-COST-ALARM — [MAIN] [COST-CASCADE-MS0]/U-COST-ALARM: threshold-based cost alarm with cool-down + cron

**Commit:** `34d551de2348` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T11:15:21-05:00
**Tags:** cost-cascade-ms0, u-cost-alarm, auto-distilled

## Subject
[MAIN] [COST-CASCADE-MS0]/U-COST-ALARM: threshold-based cost alarm with cool-down + cron

## Body
```
[MAIN] [COST-CASCADE-MS0]/U-COST-ALARM: threshold-based cost alarm with cool-down + cron

5 files shipped (30/30 tests PASS, tsc clean). The "fire alarms before the bill
arrives" half of the cost-cascade - companion to U-MULTI-AGENT-COST-TELEMETRY
(post-hoc ledger) and U-TOKEN-BUDGET-GUARD (pre-call gate).

Files:
 - mcp-server/data/state/cost-alarm-config.json
     thresholds (daily/weekly USD + tokens), coolDownMinutes, channels (jsonl +
     agent_chat), rotation (512KB/5 archives), per-task-class overrides,
     tentacleAllowList (null = aggregate all), ignoreTestTentacles + prefixes.

 - mcp-server/src/engines/CostAlarmEngine.ts (NEW, ~440 LOC)
     Pure-core + injected-deps. Exports: normalizeConfig, aggregateTelemetry,
     lookupThresholds, decideAlarms, lastFiredAt, isCoolDownActive (all pure)
     + CostAlarmEngine.check(deps) shell + makeFsDeps(opts) production wiring
     + costAlarmEngine singleton. 7 R12 invariants pinned:
       1 aggregator throw -> ok:false + errors[], not crash
       2 config missing/malformed -> safe defaults + warn
       3 test tentacles excluded from aggregate when ignoreTestTentacles
       4 cool-down uses ALARM-LOG timestamps, NOT wall-clock
       5 per-channel write fail -> channelWarnings, sibling channel still fires
       6 cap=0 + actual=0 does NOT fire (strict actual>cap)
       7 corrupt JSONL line -> truncatedTailLines counted, NOT silently dropped

 - mcp-server/src/__tests__/CostAlarmEngine.test.ts (NEW, 30 tests)
     5 spec cases (below-threshold, above-daily, above-weekly-not-daily,
     cool-down-suppresses, config-missing) + 9 R12 fail-on-revert oracles +
     pure-core unit tests + E2E smoke (two-tick alarm fire then cool-down register).

 - scripts/cost-alarm-tick.mjs (NEW)
     One-shot cron runner. Exit 0=clean / 1=fired / 2=errors / 3=fatal.
     Knobs PRISM_COST_ALARM_DISABLE / _ROOT / _JSON.

 - .claude/helpers/install-cost-alarm-task.ps1 (NEW)
     SYSTEM-principal scheduled task installer at */15 (phase offset +540s
     clear of other PRISM scheduled tasks). -RunNow polls 60s. -Uninstall
     reversibility. -DryRun burn-in. Mirrors fleet-reaper U-FR-ADMIN-HUNT
     principal pattern.

Envelope: U-COST-ALARM not_started -> complete, completed_units 4 -> 5.

Aligned with hotel directive: high-ROI backend dev tooling + system synergy.
Closes the cost-cascade triangle (telemetry / alarm / guard) - all three now
operational fleet-wide for FrugalGPT cost discipline.
```

## Files touched (12)
- .claude/helpers/install-cost-alarm-task.ps1        | 197 ++++++++
- .../architecture/master-index-query-telemetry.md   | 114 +++++
- mcp-server/data/milestones/COST-CASCADE-MS0.json   |   8 +-
- mcp-server/data/state/cost-alarm-config.json       |  47 ++
- mcp-server/src/__tests__/CostAlarmEngine.test.ts   | 504 +++++++++++++++++++
- mcp-server/src/engines/CostAlarmEngine.ts          | 539 +++++++++++++++++++++
- scripts/cost-alarm-tick.mjs                        |  90 ++++
- scripts/lib/master-index-query-log.mjs             | 191 ++++++++
- scripts/lib/master-index-query-log.test.mjs        | 279 +++++++++++
- scripts/lib/master-index-search-lib.mjs            |  16 +
_(+2 more)_

## Lessons surfaced in commit body
- till fires

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 34d551de2348`
- Milestone envelope: `mcp-server/data/milestones/COST-CASCADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._