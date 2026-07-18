# Physics Verify — Cross-Pipeline Physics Consistency Check

Verify cutting parameters are consistent across all PRISM physics engines. Detects divergence between Kienzle force, Taylor tool life, thermal, deflection, and surface finish predictions across the engine stack.

## Args: $ARGUMENTS
- Empty: interactive mode — prompt for material, tool, and cutting parameters
- `material=X diameter=Y flutes=Z ap=A ae=B`: direct parameter mode
- `quick`: fast check (force + life only, skip thermal/deflection)
- `verbose`: full report with per-engine breakdowns

## Pipeline
This skill orchestrates the `physics_verify` action in the `calcDispatcher`.

### Engine Stack:
1. **UnifiedPhysicsVerifierEngine** — Cross-checks 8+ physics engines for parameter consistency
2. Calls into: UltimateSpeedFeedEngine, KienzleForceModelEngine, AdvancedCuttingPhysicsEngine, StochasticCuttingForceEngine, StochasticToolLifeEngine, StochasticThermalEngine, StochasticSurfaceFinishEngine, StochasticChatterEngine

### Required Inputs:
- **material**: Workpiece material (e.g., "aluminum_6061", "Ti6Al4V", "4140")
- **diameter_mm**: Tool diameter in mm
- **flutes**: Number of flutes/teeth

### Optional Inputs:
- `ap_mm` — Axial depth of cut (mm)
- `ae_mm` — Radial depth of cut (mm)
- `fz_mm` — Feed per tooth (mm)
- `vc_mpm` — Cutting speed (m/min)
- `machine_rpm_max` — Machine spindle limit
- `tolerance` — Divergence threshold (default: 0.15 = 15%)

## Output
```
PHYSICS CONSISTENCY CHECK
==========================
Material:    [material]
Tool:        [diameter]mm [flutes]F [type]

ENGINE CROSS-CHECK:
  Kienzle Force:      [X]N    (ref)
  Oxley Force:        [Y]N    (Δ=[Z]%)  [PASS/WARN/FAIL]
  Stochastic Force:   [W]N    (Δ=[V]%)  [PASS/WARN/FAIL]

  Taylor Life:        [X]min  (ref)
  Stochastic Life:    [Y]min  (Δ=[Z]%)  [PASS/WARN/FAIL]

  Thermal Rise:       [X]°C   (ref)
  Stochastic Thermal: [Y]°C   (Δ=[Z]%)  [PASS/WARN/FAIL]

  Deflection:         [X]µm   (ref)
  Stochastic Defl:    [Y]µm   (Δ=[Z]%)  [PASS/WARN/FAIL]

VERDICT:        [CONSISTENT / MINOR_DIVERGENCE / MAJOR_DIVERGENCE]
MAX DIVERGENCE: [X]% at [engine pair]
RECOMMENDATIONS:
  - [calibration suggestions if divergent]
```

## Example Dispatcher Call
```json
{
  "tool": "prism_calc",
  "action": "physics_verify",
  "params": {
    "material": "aluminum_6061",
    "diameter_mm": 12,
    "flutes": 4,
    "ap_mm": 3,
    "ae_mm": 6,
    "tolerance": 0.15
  }
}
```
