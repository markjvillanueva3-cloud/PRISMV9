# ACP-MS0A/U-ACP-SCHEMA-CONTRACT-TESTS — [MAIN-FORCE] [ACP-MS0A]/U-ACP-SCHEMA-CONTRACT-TESTS (slot:alpha): freeze the Automation Control Plane contract with 32 reference-value tests (shipped-but-untested schema)

**Commit:** `6b6d02c8414a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:22:04-05:00
**Tags:** acp-ms0a, u-acp-schema-contract-tests, auto-distilled

## Subject
[MAIN-FORCE] [ACP-MS0A]/U-ACP-SCHEMA-CONTRACT-TESTS (slot:alpha): freeze the Automation Control Plane contract with 32 reference-value tests (shipped-but-untested schema)

## Body
```
[MAIN-FORCE] [ACP-MS0A]/U-ACP-SCHEMA-CONTRACT-TESTS (slot:alpha): freeze the Automation Control Plane contract with 32 reference-value tests (shipped-but-untested schema)

automationChainSchema.ts fully implements ACP-MS0A P0 (P0-U01..U05: chain schema, event/command mappings, TIER_FAIL_RULES downgrade doctrine, telemetry event schema, token-budget guidelines) but had ZERO tests and the milestone JSON still says not_started. Per R13/R15 the contract foundation must be PROVEN before ACP-MS1+ consumers (entry router, post-tool validation, context-trim) build on it -- the milestone exit-condition is literally "schema frozen and validated". This is that validation.

Tests (32, all pass, tsc-clean): enum vocabularies frozen (TaskClass/ChainTier/FailBehavior/TriggerType/TelemetryStatus); TIER_FAIL_RULES deep-equality freeze of the per-tier downgrade contract (critical=fail_closed/0-retries/abort, standard=degrade_warn/1/user, background=degrade_silent/2/log) + the critical-tier safety invariant; TOKEN_BUDGET_GUIDELINES caps (entry 500 / coding 2K / autopilot 5K) + cheapest/dearest invariant; AutomationChainSchema happy + 4 failure modes (missing id, missing fail_behavior, bad enum, non-positive/non-int budget) + 2 adversarial (unknown-field strip via in-membership, 0ms timeout reject); trigger priority bounds [1,100]; budget enforcement defaults + >100pct reject; telemetry ISO-timestamp/non-negative-cost; command/event/context-bundle mappings.

NOTE: ACP-MS0A milestone status is stale (not_started while P0 is shipped+now-validated) -> pick-unit keeps surfacing done units to alpha. Status reconciliation routed to the canonical build-milestone-progress generator / close-out pass (NOT hand-edited here -- MILESTONE_PROGRESS is generated, the envelope is its input). slot:alpha
```

## Files touched (2)
- mcp-server/src/__tests__/automationChainSchema.test.ts | 322 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 322 insertions(+)

## Lessons surfaced in commit body
- till says not_started. Per R13/R15 the contract foundation must be PROVEN before ACP-MS1+ consumers (entry router, post-tool validation, context-trim) build on it -- the milestone exit-condition is literally "schema frozen and validated". This is that validation.
- NOTE: ACP-MS0A milestone status is stale (not_started while P0 is shipped+now-validated) -> pick-unit keeps surfacing done units to alpha. Status reconciliation routed to the canonical build-milestone-progress generator / close-out pass (NOT hand-edited here -- MILESTONE_PROGRESS is generated, the envelope is its input). slot:alpha

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6b6d02c8414a`
- Milestone envelope: `mcp-server/data/milestones/ACP-MS0A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._