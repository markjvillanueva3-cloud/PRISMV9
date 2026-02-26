---
name: mfg-maint-models
description: Configure and tune degradation models and thresholds
---

# Degradation Model Manager

## When To Use
- Setting up degradation models for new machine components
- Tuning alarm thresholds based on actual operating conditions
- Reviewing and adjusting model parameters after false positives or missed alerts
- Configuring component-specific failure prediction models

## How To Use
```
prism_intelligence action=maint_models params={machine_id: "DMG-5X-01", component: "spindle_bearings"}
prism_intelligence action=maint_thresholds params={machine_id: "DMG-5X-01", metric: "vibration", warning: 2.5, critical: 4.0}
```

## What It Returns
- `model` — degradation model type and parameters (linear, exponential, Weibull, etc.)
- `thresholds` — current warning and critical threshold values with units
- `model_accuracy` — historical accuracy of predictions vs. actual failures
- `calibration_date` — when the model was last calibrated
- `recommended_adjustments` — suggested threshold or model parameter changes based on recent data

## Examples
- View spindle bearing model: `maint_models params={machine_id: "DMG-5X-01", component: "spindle_bearings"}` — returns Weibull model with beta=2.3, eta=8500 hours, last calibrated 60 days ago, 87% prediction accuracy
- Set vibration thresholds: `maint_thresholds params={machine_id: "DMG-5X-01", metric: "vibration", warning: 2.5, critical: 4.0, unit: "mm/s"}` — updates thresholds, confirms previous values were 2.0/3.5
- Review all models for a machine: `maint_models params={machine_id: "HAAS-VF2-03"}` — returns 6 active models: spindle (Weibull), ballscrew X/Y/Z (linear), coolant pump (exponential), hydraulic (threshold-only)
