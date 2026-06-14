---
name: reference_post_ship_speed-feed-ms0-u-sfm81-joint-optimize
description: Auto-distilled learnings from shipping SPEED-FEED-MS0/U-SFM81-JOINT-OPTIMIZE (commit 01157e9d2). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.762Z
aliases: reference_post_ship_speed-feed-ms0-u-sfm81-joint-optimize
---


# SPEED-FEED-MS0/U-SFM81-JOINT-OPTIMIZE

[MAIN] [SPEED-FEED-MS0]/U-SFM81-JOINT-OPTIMIZE (slot:tango /goal /loop 2026-05-26 iter1): JointSpeedFeedOptimizer — closed-form bisection solver for joint (Vc, f) max-MRR subject to T_target + P_max + range constraints. Composes canonical KienzleForceModel + ExtendedTaylorModel (NO physics in algorithm file — all formulas delegated). Closes domain 8 algorithm #8.1 from the 58-algorithm comprehensive-algorithm-scope enumeration. Strategy: argmax MRR along Taylor isoline, bisect f down when power binds; reports binding_constraint ∈ {tool_life, power, Vc_upper, Vc_lower, f_lower, infeasible}. Variability: 3 ISO groups (P/M/N) + 2 operations (turning/milling) tested. Coverage: 4 happy + 4 infeasibility + 5 adversarial (NaN/Infinity/negative/unknown-iso/sub-floor) + algebraic invariants (MRR consistency, determinism, iteration bound). prism_calc:joint_speed_feed_optimize wired (lazy import + round-trip E2E test asserts dispatcher path). 33/33 tests PASS. Algorithms B (Modal-State Tracker) and C (Op-Order Topo-Sort) deferred to follow-up iter — comprehensive-build CUT-OFF rule honored at first clean ship-boundary.

**Shipped:** 2026-05-26T19:53:48-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[speed-feed-ms0-u-sfm81-joint-optimize]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._