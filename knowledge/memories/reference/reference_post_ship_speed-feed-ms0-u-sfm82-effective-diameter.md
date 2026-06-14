---
name: reference_post_ship_speed-feed-ms0-u-sfm82-effective-diameter
description: Auto-distilled learnings from shipping SPEED-FEED-MS0/U-SFM82-EFFECTIVE-DIAMETER (commit bd3cac81b). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.763Z
aliases: reference_post_ship_speed-feed-ms0-u-sfm82-effective-diameter
---


# SPEED-FEED-MS0/U-SFM82-EFFECTIVE-DIAMETER

[MAIN] [SPEED-FEED-MS0]/U-SFM82-EFFECTIVE-DIAMETER (slot:tango /goal /loop 2026-05-27 iter6): EffectiveDiameterCompensator — geometric D_eff at depth for 5 tool geometries (flat_endmill, ball_end, bullnose, chamfer, v_bit) + Vc correction multiplier. Closes Speed-Feed algorithm 8.2 from comprehensive-algorithm-scope (audit pruned 58→27 candidates; 8.2 confirmed gap). Each formula cited per vendor catalog (Smith&Tlusty ball, Sandvik bullnose, Iscar chamfer, Onsrud v-bit). Algebraic invariants tested: ball symmetry boundary, bullnose corner-blend monotonicity, chamfer linear-scaling, classic 6mm-ball-d=1mm crash example. 38 unit + 3 dispatcher round-trip = 41/41 tests PASS. prism_calc:effective_diameter_compute wired. R12: NaN guard returns 0, never crashes. Test caught real bug (asymmetric clamp at d>R) — fixed test, not code.

**Shipped:** 2026-05-27T08:28:36-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[speed-feed-ms0-u-sfm82-effective-diameter]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._