# AI-SYSTEMS/U-SELFAWARE-EXPORT-CLASS — [MAIN-FORCE] [AI-SYSTEMS]/U-SELFAWARE-EXPORT-CLASS (slot:india): export the PRISMSelfAwarenessEngine class (engine-convention fix -- 'every engine must export a class'; it was singleton-only, so the dedicated test's new PRISMSelfAwarenessEngine() crashed all 134 with 'is not a constructor'). Revives 20 of 134 PRISMSelfAwarenessEngine.test.ts tests. Additive: tsc-clean across 15 importers, singleton export unchanged. The remaining 114 are PRE-EXISTING engine-API drift (NOT this change): ~10 removed/renamed methods (analyzeGap/trackUsage/quickProactiveCheck/generateWebSearch/findRelevantSources/findDriveLocation), sync-getManifest-now-async, hardcoded counts -- dedicated per-method realign documented in reference_prismselfawareness_test_fossil.

**Commit:** `ad65e6c5f7d0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T09:18:42-05:00
**Tags:** ai-systems, u-selfaware-export-class, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS]/U-SELFAWARE-EXPORT-CLASS (slot:india): export the PRISMSelfAwarenessEngine class (engine-convention fix -- 'every engine must export a class'; it was singleton-only, so the dedicated test's new PRISMSelfAwarenessEngine() crashed all 134 with 'is not a constructor'). Revives 20 of 134 PRISMSelfAwarenessEngine.test.ts tests. Additive: tsc-clean across 15 importers, singleton export unchanged. The remaining 114 are PRE-EXISTING engine-API drift (NOT this change): ~10 removed/renamed methods (analyzeGap/trackUsage/quickProactiveCheck/generateWebSearch/findRelevantSources/findDriveLocation), sync-getManifest-now-async, hardcoded counts -- dedicated per-method realign documented in reference_prismselfawareness_test_fossil.

## Body
```
[MAIN-FORCE] [AI-SYSTEMS]/U-SELFAWARE-EXPORT-CLASS (slot:india): export the PRISMSelfAwarenessEngine class (engine-convention fix -- 'every engine must export a class'; it was singleton-only, so the dedicated test's new PRISMSelfAwarenessEngine() crashed all 134 with 'is not a constructor'). Revives 20 of 134 PRISMSelfAwarenessEngine.test.ts tests. Additive: tsc-clean across 15 importers, singleton export unchanged. The remaining 114 are PRE-EXISTING engine-API drift (NOT this change): ~10 removed/renamed methods (analyzeGap/trackUsage/quickProactiveCheck/generateWebSearch/findRelevantSources/findDriveLocation), sync-getManifest-now-async, hardcoded counts -- dedicated per-method realign documented in reference_prismselfawareness_test_fossil.
```

## Files touched (2)
- mcp-server/src/engines/PRISMSelfAwarenessEngine.ts | 2 +-
- 1 file changed, 1 insertion(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ad65e6c5f7d0`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._