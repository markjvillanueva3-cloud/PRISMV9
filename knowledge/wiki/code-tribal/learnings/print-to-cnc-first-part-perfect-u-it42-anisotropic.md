# PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT42-ANISOTROPIC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT42-ANISOTROPIC (slot:foxtrot /loop iter42): AnisotropicMaterialModelEngine — grain-direction cutting force multiplier (14th P1 closure). Tests 21/21. Wraps isotropic Kienzle with feed-direction-dependent multiplier A(θ): F_eff = F_kienzle × A(θ, form) where A(θ) = A_with + (A_across - A_with) × sin²(θ). 9 material forms with empirical (A_with, A_across) ratios per Shaw + Wohlfahrt: cast_random (1.00/1.00 isotropic), rolled_with (1.00/1.10), rolled_across (1.00/1.15), forged_longitudinal (0.95/1.15), forged_transverse (1.05/1.20), printed_xy_layer (1.05/1.10), printed_z_build (1.10/1.30 worst case laminar weakness), drawn_wire (0.90/1.25), extruded (0.95/1.15). θ folds into [0,90] symmetrically every 180°. Surfaces effective_force + worst_case_force + recommended_feed_rotation + ductility_drop_pct + per-form warnings: 3DP Z delamination, XY layer-line tearing, drawn-wire burr, forged-transverse Kienzle-underestimate, rotation-recommended when off-grain >30° AND ratio >1.15. Action anisotropic_apply routable via prism_safety. Reference Boothroyd-Knight §8 + Shaw §4.3-4.5 + Wohlfahrt §3.5 + ASTM E8/E9 + ISO 5577. Pathspec-staged.

**Commit:** `35ffac60347f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T19:08:33-05:00
**Tags:** print-to-cnc-first-part-perfect, u-it42-anisotropic, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT42-ANISOTROPIC (slot:foxtrot /loop iter42): AnisotropicMaterialModelEngine — grain-direction cutting force multiplier (14th P1 closure). Tests 21/21. Wraps isotropic Kienzle with feed-direction-dependent multiplier A(θ): F_eff = F_kienzle × A(θ, form) where A(θ) = A_with + (A_across - A_with) × sin²(θ). 9 material forms with empirical (A_with, A_across) ratios per Shaw + Wohlfahrt: cast_random (1.00/1.00 isotropic), rolled_with (1.00/1.10), rolled_across (1.00/1.15), forged_longitudinal (0.95/1.15), forged_transverse (1.05/1.20), printed_xy_layer (1.05/1.10), printed_z_build (1.10/1.30 worst case laminar weakness), drawn_wire (0.90/1.25), extruded (0.95/1.15). θ folds into [0,90] symmetrically every 180°. Surfaces effective_force + worst_case_force + recommended_feed_rotation + ductility_drop_pct + per-form warnings: 3DP Z delamination, XY layer-line tearing, drawn-wire burr, forged-transverse Kienzle-underestimate, rotation-recommended when off-grain >30° AND ratio >1.15. Action anisotropic_apply routable via prism_safety. Reference Boothroyd-Knight §8 + Shaw §4.3-4.5 + Wohlfahrt §3.5 + ASTM E8/E9 + ISO 5577. Pathspec-staged.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT42-ANISOTROPIC (slot:foxtrot /loop iter42): AnisotropicMaterialModelEngine — grain-direction cutting force multiplier (14th P1 closure). Tests 21/21. Wraps isotropic Kienzle with feed-direction-dependent multiplier A(θ): F_eff = F_kienzle × A(θ, form) where A(θ) = A_with + (A_across - A_with) × sin²(θ). 9 material forms with empirical (A_with, A_across) ratios per Shaw + Wohlfahrt: cast_random (1.00/1.00 isotropic), rolled_with (1.00/1.10), rolled_across (1.00/1.15), forged_longitudinal (0.95/1.15), forged_transverse (1.05/1.20), printed_xy_layer (1.05/1.10), printed_z_build (1.10/1.30 worst case laminar weakness), drawn_wire (0.90/1.25), extruded (0.95/1.15). θ folds into [0,90] symmetrically every 180°. Surfaces effective_force + worst_case_force + recommended_feed_rotation + ductility_drop_pct + per-form warnings: 3DP Z delamination, XY layer-line tearing, drawn-wire burr, forged-transverse Kienzle-underestimate, rotation-recommended when off-grain >30° AND ratio >1.15. Action anisotropic_apply routable via prism_safety. Reference Boothroyd-Knight §8 + Shaw §4.3-4.5 + Wohlfahrt §3.5 + ASTM E8/E9 + ISO 5577. Pathspec-staged.
```

## Files touched (4)
- .../AnisotropicMaterialModelEngine.test.ts         | 145 +++++++++++++++++
- .../src/engines/AnisotropicMaterialModelEngine.ts  | 179 +++++++++++++++++++++
- .../src/tools/dispatchers/safetyDispatcher.ts      |   7 +
- 3 files changed, 331 insertions(+)

## Lessons surfaced in commit body
- tility_drop_pct + per-form warnings: 3DP Z delamination, XY layer-line tearing, drawn-wire burr, forged-transverse Kienzle-underestimate, rotation-recommended when off-grain >30° AND ratio >1.15. Action anisotropic_apply routable via prism_safety. Reference Boothroyd-Knight §8 + Shaw §4.3-4.5 + Wohlfahrt §3.5 + ASTM E8/E9 + ISO 5577. Pathspec-staged.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 35ffac60347f`
- Milestone envelope: `mcp-server/data/milestones/PRINT-TO-CNC-FIRST-PART-PERFECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._