---
name: mfg-wear-prediction
description: Predict flank wear VB over time using three-zone wear model with remaining life estimate
---

## When To Use
- User asks how worn their tool is after X minutes of cutting
- Need to predict when tool change is required
- Planning tool change intervals for batch production
- NOT for tool life at fresh start (use mfg-tool-life)
- NOT for tool breakage risk (use prism_safety predict_tool_breakage)

## How To Use
### Predict Wear at Time
```
prism_calc action=wear_prediction params={
  material: "4140_steel",
  Vc: 200,
  f: 0.15,
  time_minutes: 30
}
```

### With Current Wear State
```
prism_calc action=wear_prediction params={
  material: "Ti-6Al-4V",
  Vc: 60,
  f: 0.12,
  time_minutes: 15,
  current_VB: 0.12,
  tool_material: "carbide",
  coating: "TiAlN"
}
```

## What It Returns
```json
{
  "VB_mm": 0.18,
  "VB_max_mm": 0.3,
  "remaining_life_percent": 42,
  "remaining_life_minutes": 21.6,
  "wear_zone": "steady_state",
  "wear_rate_um_per_min": 2.1,
  "total_life_minutes": 51.6,
  "model": "three_zone_flank_wear",
  "zones": {
    "break_in": {"duration_min": 3, "VB_end": 0.05},
    "steady_state": {"rate_um_min": 2.1},
    "accelerated": {"onset_VB": 0.25}
  },
  "warnings": []
}
```

## Examples
### Steel After 30 Minutes Cutting
- Input: `prism_calc action=wear_prediction params={material: "4140_steel", Vc: 200, f: 0.15, time_minutes: 30}`
- Output: VB=0.18mm, 42% life remaining, in steady-state zone
- Edge case: Accelerated wear zone (VB>0.25mm) wear rate doubles — tool change imminent

### Titanium Wear Tracking
- Input: `prism_calc action=wear_prediction params={material: "Ti-6Al-4V", Vc: 60, f: 0.12, time_minutes: 15, current_VB: 0.12}`
- Output: Wear tracking from measured VB=0.12mm, predicts remaining life based on actual state
- Edge case: Notch wear in Ti alloys is not captured by VB alone; inspect tool edge visually
