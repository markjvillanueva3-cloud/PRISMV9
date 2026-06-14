---
name: reference_post_ship_blackwell-model-integration-ms0-u-bmi-catalog-wire
description: Auto-distilled learnings from shipping BLACKWELL-MODEL-INTEGRATION-MS0/U-BMI-CATALOG-WIRE (commit 348f97c0f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.305Z
aliases: reference_post_ship_blackwell-model-integration-ms0-u-bmi-catalog-wire
---


# BLACKWELL-MODEL-INTEGRATION-MS0/U-BMI-CATALOG-WIRE

[MAIN] [BLACKWELL-MODEL-INTEGRATION-MS0]/U-BMI-CATALOG-WIRE (slot:alpha): wire gpt-oss:120b/20b + gemma4:31b into the 4 routing engines (install-gated, FLOOR tiers) + retire stale ml_inference enum. ModelRouting +3 FLOOR catalog entries (route() has no /api/tags filter so real tiers would phantom-route to the still-pulling 120b; FLOOR keeps qwen2.5-coder:32b winner; +8 tests). HookBridge grep/route/general to gpt-oss:20b, install-gated via cachedModels. TaskOffloader +3 entries. AISystemRouter ml_inference ollama-codellama to local-mcp + drops stale deepseek. Anti-revert 3/3; 178/178 (+24 tests); tsc 0; build clean; repaired 3 pre-existing red tests from the 2026-06-04 retirement.

**Shipped:** 2026-06-06T02:14:56-05:00 by markjvillanueva3-cloud
**Files:** 10 touched

Full distillation: [[blackwell-model-integration-ms0-u-bmi-catalog-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._