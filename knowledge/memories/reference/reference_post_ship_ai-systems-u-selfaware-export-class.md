---
name: reference_post_ship_ai-systems-u-selfaware-export-class
description: Auto-distilled learnings from shipping AI-SYSTEMS/U-SELFAWARE-EXPORT-CLASS (commit ad65e6c5f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.747Z
aliases: reference_post_ship_ai-systems-u-selfaware-export-class
---


# AI-SYSTEMS/U-SELFAWARE-EXPORT-CLASS

[MAIN-FORCE] [AI-SYSTEMS]/U-SELFAWARE-EXPORT-CLASS (slot:india): export the PRISMSelfAwarenessEngine class (engine-convention fix -- 'every engine must export a class'; it was singleton-only, so the dedicated test's new PRISMSelfAwarenessEngine() crashed all 134 with 'is not a constructor'). Revives 20 of 134 PRISMSelfAwarenessEngine.test.ts tests. Additive: tsc-clean across 15 importers, singleton export unchanged. The remaining 114 are PRE-EXISTING engine-API drift (NOT this change): ~10 removed/renamed methods (analyzeGap/trackUsage/quickProactiveCheck/generateWebSearch/findRelevantSources/findDriveLocation), sync-getManifest-now-async, hardcoded counts -- dedicated per-method realign documented in reference_prismselfawareness_test_fossil.

**Shipped:** 2026-06-23T09:18:42-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[ai-systems-u-selfaware-export-class]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._