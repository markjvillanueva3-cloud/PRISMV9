---
name: reference_post_ship_stub-hunt-ms0-u-stub-hunt-07-toolsel-recommender
description: Auto-distilled learnings from shipping STUB-HUNT-MS0/U-STUB-HUNT-07-TOOLSEL-RECOMMENDER (commit c40a89ce2). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.766Z
aliases: reference_post_ship_stub-hunt-ms0-u-stub-hunt-07-toolsel-recommender
---


# STUB-HUNT-MS0/U-STUB-HUNT-07-TOOLSEL-RECOMMENDER

[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-07-TOOLSEL-RECOMMENDER (slot:bravo iter29, mill-galaxy): restore ToolSelectionRecommenderEngine.ts from 16-line U-EFF25 stub. millDispatcher routes 3 actions (recommend/assemblyCheck/matchHolder). Real implementation: recommend() emits Sandvik Coromant baseline by ISO group + operation tweak (rough P/M Ø≥12mm adds a flute, finish N/K drops one), fields {substrate, coating, flutes, helix_deg, rationale}; assemblyCheck() L:D classification (rigid≤3, standard≤5, long-reach≤8, extreme>8) with cantilever-deflection probe via MillingForceEngine (canonical δ=F·L³/3EI, soul-rule satisfied — NEVER inlined) + warnings on long-reach chatter risk; matchHolder() ER16/25/32 + HSK-A40/63/100 catalog with maxRpm + maxToolWeightKg gates, smallest-capable-fits-best selection. Material→ISO keyword scan (inconel→S, alum→N, iron→K, stainless→M, hardened→H, default→P). Named constants for L:D thresholds + tolerance. Fail-loud per R12 on missing inputs. 16/16 PASS vitest hermetic (6 recommend + 4 assemblyCheck + 5 matchHolder + 1 identity). STUB-HUNT progress: 7 of 9 rescued. Remaining: ToolpathStrategy + MillPrintToProgram (P1 mill) + 2 unwired (CADFeatureRecognition + CAMPhase5Stubs).

**Shipped:** 2026-05-27T02:11:46-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[stub-hunt-ms0-u-stub-hunt-07-toolsel-recommender]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._