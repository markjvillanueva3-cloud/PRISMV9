---
name: reference_post_ship_print-to-cnc-first-part-perfect-u-it42-anisotropic
description: Auto-distilled learnings from shipping PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT42-ANISOTROPIC (commit 35ffac603). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.989Z
aliases: reference_post_ship_print-to-cnc-first-part-perfect-u-it42-anisotropic
---


# PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT42-ANISOTROPIC

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT42-ANISOTROPIC (slot:foxtrot /loop iter42): AnisotropicMaterialModelEngine — grain-direction cutting force multiplier (14th P1 closure). Tests 21/21. Wraps isotropic Kienzle with feed-direction-dependent multiplier A(θ): F_eff = F_kienzle × A(θ, form) where A(θ) = A_with + (A_across - A_with) × sin²(θ). 9 material forms with empirical (A_with, A_across) ratios per Shaw + Wohlfahrt: cast_random (1.00/1.00 isotropic), rolled_with (1.00/1.10), rolled_across (1.00/1.15), forged_longitudinal (0.95/1.15), forged_transverse (1.05/1.20), printed_xy_layer (1.05/1.10), printed_z_build (1.10/1.30 worst case laminar weakness), drawn_wire (0.90/1.25), extruded (0.95/1.15). θ folds into [0,90] symmetrically every 180°. Surfaces effective_force + worst_case_force + recommended_feed_rotation + ductility_drop_pct + per-form warnings: 3DP Z delamination, XY layer-line tearing, drawn-wire burr, forged-transverse Kienzle-underestimate, rotation-recommended when off-grain >30° AND ratio >1.15. Action anisotropic_apply routable via prism_safety. Reference Boothroyd-Knight §8 + Shaw §4.3-4.5 + Wohlfahrt §3.5 + ASTM E8/E9 + ISO 5577. Pathspec-staged.

**Shipped:** 2026-05-24T19:08:33-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[print-to-cnc-first-part-perfect-u-it42-anisotropic]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._