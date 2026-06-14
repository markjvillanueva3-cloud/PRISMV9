---
name: reference_post_ship_psn-extraction-u-extract-jc-constants
description: Auto-distilled learnings from shipping PSN-EXTRACTION/U-EXTRACT-JC-CONSTANTS (commit 65b5a35bf). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.685Z
aliases: reference_post_ship_psn-extraction-u-extract-jc-constants
---


# PSN-EXTRACTION/U-EXTRACT-JC-CONSTANTS

[MAIN] [PSN-EXTRACTION]/U-EXTRACT-JC-CONSTANTS (slot:golf iter13): canonical 5-material Johnson-Cook flow-stress table extracted from extracted_modules/physics_engines/PRISM_TAYLOR_ADVANCED.js. PRISM had 10+ engines referencing J-C (MachiningPlaybookEngine, UltimateSpeedFeedEngine, MillingPhysicsKernelEngine, LatheThermodynamicsEngine, etc.) but the 5-parameter constants for AISI 1018/4340 + Ti6Al4V + Al 2024-T3 + Inconel 718 were never centralized. Ships JohnsonCookConstitutiveEngine.ts (static class with JOHNSON_COOK_PARAMS table + getParams alias resolver + stress(strain,strainRate,tempK,p) formula) + 11/11 vitest contract (canonical-value pin, alias resolution, thermal softening at T_melt, strain-rate sensitivity, strain hardening, NaN-safe boundaries). Constants.ts edit was blocked by critical-file guard (no operator confirmCritical this session) — engine file lives in src/engines/ until a future operator moves it to constants.ts with explicit confirmation. First real extracted-modules → mcp-server ship of the campaign.

**Shipped:** 2026-05-24T14:28:04-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[psn-extraction-u-extract-jc-constants]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._