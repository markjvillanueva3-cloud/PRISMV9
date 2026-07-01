---
name: cam-strategy-select
description: Cross-CAM strategy selection — pick best strategy across Mastercam, SolidCAM, NX, PowerMill, CATIA, hyperMILL.
---

# /cam-strategy-select

## Pipeline

1. `prism_cam` → `strategy_kb_query` with `{ operation, material, feature }`
2. `prism_cam` → `strategy_kb_best` with `{ operation, material, feature }`
3. `prism_cam` → `strategy_benchmark` with `{ candidates }`
4. `prism_cam` → `strategy_override_check` with `{ strategy, material, params }`
5. `prism_cam` → `strategy_robust_optimize` with `{ strategy, material, tool }` (optional)

## Exit criteria
- Best strategy chosen with confidence + rationale.
- Safety override clean.
- Parameter block returned.
