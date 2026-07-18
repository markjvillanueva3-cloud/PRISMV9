---
name: reference-oscar-sfc-test-gauntlet-401
description: The SFC 401-assertion reference-value test gauntlet on UltimateSpeedFeedEngine. /test-speed-feed runs it. Real reference values, never weaken to make green.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.713Z
aliases: reference_oscar_sfc_test_gauntlet_401
---


# SFC 401-assertion test gauntlet

`UltimateSpeedFeedEngine` carries **401 real reference assertions** — algebraic invariants + published reference cuts (Sandvik/Kennametal/Machinery's Handbook), not `toBeDefined()` stubs. The skill `/test-speed-feed` runs the gauntlet.

**Rule (R9 + R12):** never weaken a gauntlet assertion to make a number green. If a physics change breaks an assertion, either the change is wrong or the reference needs a cited update — surface it, don't soften it. A green that lies about a Vc/power/tool-life number is worse than a red (safety product).

Coverage: 31 models × 15 materials × 7 ops × 7 strategies. New material/op support → add reference assertions, don't skip. Tests live in `mcp-server/src/__tests__/*SpeedFeed*.test.ts` (NOT `src/engines/__tests__/` — per [[feedback_engine_tests_in_tests_dir]] `stop_on_unwired_assets` only scans the former).

Cross-ref [[reference_oscar_sfc_domain_map_2026_05_27]] · [[feedback_oscar_sfc_physics_discipline]].
