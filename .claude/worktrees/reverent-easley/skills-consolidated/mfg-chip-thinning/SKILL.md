---
name: mfg-chip-thinning
description: Calculate effective chip thickness and compensated feed for radial engagement below 50% tool diameter
---

## When To Use
- User is doing adaptive/trochoidal milling with small radial engagement
- Need to compensate programmed feed for actual chip thickness
- ae/D ratio is below 0.5 and feeds seem too conservative
- NOT for full-slot milling (no thinning occurs at ae=D)
- NOT for turning operations (chip thinning is a milling phenomenon)

## How To Use
### Calculate Thinning Compensation
```
prism_calc action=chip_thinning params={
  fz_programmed: 0.1,
  ae: 5,
  D: 50
}
```

### With Target Chip Thickness
```
prism_calc action=chip_thinning params={
  fz_target: 0.1,
  ae: 3,
  D: 25
}
```

## What It Returns
```json
{
  "fz_programmed": 0.1,
  "fz_effective": 0.063,
  "thinning_factor": 0.632,
  "fz_compensated": 0.158,
  "ae_over_D": 0.1,
  "engagement_angle_deg": 36.9,
  "recommendation": "Increase programmed fz to 0.158 to achieve 0.1mm actual chip thickness",
  "Vf_original": null,
  "Vf_compensated": null,
  "warnings": []
}
```

## Examples
### Light Radial Engagement (10% stepover)
- Input: `prism_calc action=chip_thinning params={fz_programmed: 0.1, ae: 5, D: 50}`
- Output: Effective chip=0.063mm, thinning_factor=0.632, compensate to fz=0.158mm
- Edge case: At ae/D < 0.05 the thinning factor drops below 0.3 — feeds must increase 3x+

### Trochoidal Slotting in Titanium
- Input: `prism_calc action=chip_thinning params={fz_target: 0.08, ae: 2, D: 16}`
- Output: Program fz=0.226mm to achieve actual 0.08mm chip — critical for Ti heat management
- Edge case: CAM software may already apply chip thinning compensation; verify to avoid double-correction
