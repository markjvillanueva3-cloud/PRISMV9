# PSN-EXTRACTION/U-EXTRACT-JC-CONSTANTS — [MAIN] [PSN-EXTRACTION]/U-EXTRACT-JC-CONSTANTS (slot:golf iter13): canonical 5-material Johnson-Cook flow-stress table extracted from extracted_modules/physics_engines/PRISM_TAYLOR_ADVANCED.js. PRISM had 10+ engines referencing J-C (MachiningPlaybookEngine, UltimateSpeedFeedEngine, MillingPhysicsKernelEngine, LatheThermodynamicsEngine, etc.) but the 5-parameter constants for AISI 1018/4340 + Ti6Al4V + Al 2024-T3 + Inconel 718 were never centralized. Ships JohnsonCookConstitutiveEngine.ts (static class with JOHNSON_COOK_PARAMS table + getParams alias resolver + stress(strain,strainRate,tempK,p) formula) + 11/11 vitest contract (canonical-value pin, alias resolution, thermal softening at T_melt, strain-rate sensitivity, strain hardening, NaN-safe boundaries). Constants.ts edit was blocked by critical-file guard (no operator confirmCritical this session) — engine file lives in src/engines/ until a future operator moves it to constants.ts with explicit confirmation. First real extracted-modules → mcp-server ship of the campaign.

**Commit:** `65b5a35bfd40` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T14:28:04-05:00
**Tags:** psn-extraction, u-extract-jc-constants, auto-distilled

## Subject
[MAIN] [PSN-EXTRACTION]/U-EXTRACT-JC-CONSTANTS (slot:golf iter13): canonical 5-material Johnson-Cook flow-stress table extracted from extracted_modules/physics_engines/PRISM_TAYLOR_ADVANCED.js. PRISM had 10+ engines referencing J-C (MachiningPlaybookEngine, UltimateSpeedFeedEngine, MillingPhysicsKernelEngine, LatheThermodynamicsEngine, etc.) but the 5-parameter constants for AISI 1018/4340 + Ti6Al4V + Al 2024-T3 + Inconel 718 were never centralized. Ships JohnsonCookConstitutiveEngine.ts (static class with JOHNSON_COOK_PARAMS table + getParams alias resolver + stress(strain,strainRate,tempK,p) formula) + 11/11 vitest contract (canonical-value pin, alias resolution, thermal softening at T_melt, strain-rate sensitivity, strain hardening, NaN-safe boundaries). Constants.ts edit was blocked by critical-file guard (no operator confirmCritical this session) — engine file lives in src/engines/ until a future operator moves it to constants.ts with explicit confirmation. First real extracted-modules → mcp-server ship of the campaign.

## Body
```
[MAIN] [PSN-EXTRACTION]/U-EXTRACT-JC-CONSTANTS (slot:golf iter13): canonical 5-material Johnson-Cook flow-stress table extracted from extracted_modules/physics_engines/PRISM_TAYLOR_ADVANCED.js. PRISM had 10+ engines referencing J-C (MachiningPlaybookEngine, UltimateSpeedFeedEngine, MillingPhysicsKernelEngine, LatheThermodynamicsEngine, etc.) but the 5-parameter constants for AISI 1018/4340 + Ti6Al4V + Al 2024-T3 + Inconel 718 were never centralized. Ships JohnsonCookConstitutiveEngine.ts (static class with JOHNSON_COOK_PARAMS table + getParams alias resolver + stress(strain,strainRate,tempK,p) formula) + 11/11 vitest contract (canonical-value pin, alias resolution, thermal softening at T_melt, strain-rate sensitivity, strain hardening, NaN-safe boundaries). Constants.ts edit was blocked by critical-file guard (no operator confirmCritical this session) — engine file lives in src/engines/ until a future operator moves it to constants.ts with explicit confirmation. First real extracted-modules → mcp-server ship of the campaign.
```

## Files touched (3)
- .../JohnsonCookConstitutiveEngine.test.ts          | 101 ++++++++++++++++++++
- .../src/engines/JohnsonCookConstitutiveEngine.ts   | 105 +++++++++++++++++++++
- 2 files changed, 206 insertions(+)

## Lessons surfaced in commit body
- til a future operator moves it to constants.ts with explicit confirmation. First real extracted-modules → mcp-server ship of the campaign.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 65b5a35bfd40`
- Milestone envelope: `mcp-server/data/milestones/PSN-EXTRACTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._