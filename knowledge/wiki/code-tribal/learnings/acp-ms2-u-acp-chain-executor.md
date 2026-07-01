# ACP-MS2/U-ACP-CHAIN-EXECUTOR — [MAIN-FORCE] [ACP-MS2]/U-ACP-CHAIN-EXECUTOR (slot:alpha): chain executor emits budget_exceeded/timeout telemetry + widen ingestor+dispatcher allow-set to the 6-value contract

**Commit:** `09b9992220d4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T12:57:05-05:00
**Tags:** acp-ms2, u-acp-chain-executor, auto-distilled

## Subject
[MAIN-FORCE] [ACP-MS2]/U-ACP-CHAIN-EXECUTOR (slot:alpha): chain executor emits budget_exceeded/timeout telemetry + widen ingestor+dispatcher allow-set to the 6-value contract

## Body
```
[MAIN-FORCE] [ACP-MS2]/U-ACP-CHAIN-EXECUTOR (slot:alpha): chain executor emits budget_exceeded/timeout telemetry + widen ingestor+dispatcher allow-set to the 6-value contract
```

## Files touched (7)
- mcp-server/src/__tests__/automationChainEngineSchemaConformance.test.ts |  38 +++---
- mcp-server/src/__tests__/automationChainExecutor.test.ts                | 174 +++++++++++++++++++++++++++
- mcp-server/src/__tests__/telemetryActionSchemas.test.ts                 |  85 ++++++++++++++
- mcp-server/src/engines/AutomationChainEngine.ts                         | 255 ++++++++++++++++++++++++++++++++++++++--
- mcp-server/src/engines/AutomationChainTelemetryEngine.ts                |  16 ++-
- mcp-server/src/schemas/telemetryActionSchemas.ts                        |   7 +-
- 6 files changed, 543 insertions(+), 32 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 09b9992220d4`
- Milestone envelope: `mcp-server/data/milestones/ACP-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._