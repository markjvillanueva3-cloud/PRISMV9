# Calibrate — Live Physics Calibration from Measured Data

Submit real cutting measurements to improve PRISM's physics predictions via Bayesian updating. Measured forces, tool life, surface finish, or thermal data update the internal model constants (Kienzle kc1.1/mc, Taylor C/n) with proper uncertainty quantification.

## Args: $ARGUMENTS
- Empty: interactive mode — prompt for measurement data
- `material=X diameter=Y flutes=Z ap=A fz=B force=C`: submit force measurement
- `material=X diameter=Y flutes=Z life=M`: submit tool life measurement
- `status`: show current calibration state and confidence levels
- `reset material=X`: reset calibration for a material to factory defaults

## Pipeline
This skill orchestrates the `calibrate_physics` action in the `calcDispatcher`.

### Engine:
- **PhysicsAutoCalibrationEngine** — Bayesian updating of physics model constants from real-world measurements

### Required Inputs:
- **material**: Workpiece material
- **diameter_mm**: Tool diameter
- **flutes**: Number of flutes
- **measurement_type**: What was measured (force/life/surface_finish/thermal/power)
- **measured_value**: The actual measured value

### Optional Inputs:
- `ap_mm`, `ae_mm`, `fz_mm`, `vc_mpm` — Cutting conditions during measurement
- `tool_material` — carbide/hss/ceramic/cbn/diamond
- `coolant` — Coolant type during measurement
- `confidence` — Measurement confidence (0-1, default 0.9)
- `measurement_uncertainty` — Known measurement error band

## Output
```
PHYSICS CALIBRATION
====================
Material:    [material]
Tool:        [diameter]mm [flutes]F
Measurement: [type] = [value] [unit]

BAYESIAN UPDATE:
  Parameter          Prior           Posterior       Shift
  ─────────────────  ──────────────  ──────────────  ──────
  kc1.1 (N/mm²)     [X] ± [σ]      [Y] ± [σ']     [Δ%]
  mc (exponent)      [X] ± [σ]      [Y] ± [σ']     [Δ%]
  Taylor C           [X] ± [σ]      [Y] ± [σ']     [Δ%]
  Taylor n           [X] ± [σ]      [Y] ± [σ']     [Δ%]

PREDICTION IMPROVEMENT:
  Force prediction:  [X]N → [Y]N (error: [A]% → [B]%)
  Life prediction:   [X]min → [Y]min (error: [A]% → [B]%)

CI95:           [lower, upper]
OBSERVATIONS:   [N] total for this material
CONFIDENCE:     [X]% (need [Y] more for high confidence)
```

## Example Dispatcher Call
```json
{
  "tool": "prism_calc",
  "action": "calibrate_physics",
  "params": {
    "material": "steel_4140",
    "diameter_mm": 12,
    "flutes": 4,
    "ap_mm": 3,
    "ae_mm": 6,
    "fz_mm": 0.1,
    "vc_mpm": 200,
    "measurement_type": "force",
    "measured_value": 850,
    "coolant": "flood"
  }
}
```
