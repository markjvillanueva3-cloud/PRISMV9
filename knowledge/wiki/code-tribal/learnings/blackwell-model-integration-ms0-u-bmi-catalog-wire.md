# BLACKWELL-MODEL-INTEGRATION-MS0/U-BMI-CATALOG-WIRE — [MAIN] [BLACKWELL-MODEL-INTEGRATION-MS0]/U-BMI-CATALOG-WIRE (slot:alpha): wire gpt-oss:120b/20b + gemma4:31b into the 4 routing engines (install-gated, FLOOR tiers) + retire stale ml_inference enum. ModelRouting +3 FLOOR catalog entries (route() has no /api/tags filter so real tiers would phantom-route to the still-pulling 120b; FLOOR keeps qwen2.5-coder:32b winner; +8 tests). HookBridge grep/route/general to gpt-oss:20b, install-gated via cachedModels. TaskOffloader +3 entries. AISystemRouter ml_inference ollama-codellama to local-mcp + drops stale deepseek. Anti-revert 3/3; 178/178 (+24 tests); tsc 0; build clean; repaired 3 pre-existing red tests from the 2026-06-04 retirement.

**Commit:** `348f97c0f815` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T02:14:56-05:00
**Tags:** blackwell-model-integration-ms0, u-bmi-catalog-wire, auto-distilled

## Subject
[MAIN] [BLACKWELL-MODEL-INTEGRATION-MS0]/U-BMI-CATALOG-WIRE (slot:alpha): wire gpt-oss:120b/20b + gemma4:31b into the 4 routing engines (install-gated, FLOOR tiers) + retire stale ml_inference enum. ModelRouting +3 FLOOR catalog entries (route() has no /api/tags filter so real tiers would phantom-route to the still-pulling 120b; FLOOR keeps qwen2.5-coder:32b winner; +8 tests). HookBridge grep/route/general to gpt-oss:20b, install-gated via cachedModels. TaskOffloader +3 entries. AISystemRouter ml_inference ollama-codellama to local-mcp + drops stale deepseek. Anti-revert 3/3; 178/178 (+24 tests); tsc 0; build clean; repaired 3 pre-existing red tests from the 2026-06-04 retirement.

## Body
```
[MAIN] [BLACKWELL-MODEL-INTEGRATION-MS0]/U-BMI-CATALOG-WIRE (slot:alpha): wire gpt-oss:120b/20b + gemma4:31b into the 4 routing engines (install-gated, FLOOR tiers) + retire stale ml_inference enum. ModelRouting +3 FLOOR catalog entries (route() has no /api/tags filter so real tiers would phantom-route to the still-pulling 120b; FLOOR keeps qwen2.5-coder:32b winner; +8 tests). HookBridge grep/route/general to gpt-oss:20b, install-gated via cachedModels. TaskOffloader +3 entries. AISystemRouter ml_inference ollama-codellama to local-mcp + drops stale deepseek. Anti-revert 3/3; 178/178 (+24 tests); tsc 0; build clean; repaired 3 pre-existing red tests from the 2026-06-04 retirement.
```

## Files touched (10)
- mcp-server/src/__tests__/AISystemRouterEngine.test.ts                 |  12 +++++++---
- mcp-server/src/__tests__/ModelRoutingEngine.test.ts                   | 139 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----
- mcp-server/src/__tests__/OllamaHookBridgeEngine.model-routing.test.ts | 121 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------------------------
- mcp-server/src/__tests__/OllamaHookBridgeEngine.test.ts               |  22 +++++++++++-------
- mcp-server/src/__tests__/OllamaTaskOffloaderEngine.test.ts            |  45 +++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/AISystemRouterEngine.ts                        |  16 ++++++++++---
- mcp-server/src/engines/ModelRoutingEngine.ts                          |  62 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/OllamaHookBridgeEngine.ts                      |  72 +++++++++++++++++++++++++++++++++++++++++++++++++-------
- mcp-server/src/engines/OllamaTaskOffloaderEngine.ts                   |  30 ++++++++++++++++++++++++
- 9 files changed, 458 insertions(+), 61 deletions(-)

## Lessons surfaced in commit body
- till-pulling 120b; FLOOR keeps qwen2.5-coder:32b winner; +8 tests). HookBridge grep/route/general to gpt-oss:20b, install-gated via cachedModels. TaskOffloader +3 entries. AISystemRouter ml_inference ollama-codellama to local-mcp + drops stale deepseek. Anti-revert 3/3; 178/178 (+24 tests); tsc 0; build clean; repaired 3 pre-existing red tests from the 2026-06-04 retirement.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 348f97c0f815`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-MODEL-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._