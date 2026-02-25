---
name: Surface Defect Analysis
description: Identify surface defect type and probable cause from description
---

## When To Use
- A machined surface has visible defects (marks, scratches, patterns, discoloration)
- Quality inspection has flagged a surface finish issue you need to diagnose
- Recurring surface problems on a specific feature or operation
- You need to match a surface defect pattern to its manufacturing root cause

## How To Use
```
prism_intelligence action=forensic_surface_defect params={
  defect_description: "spiral feed marks with intermittent deeper scratches every 3rd revolution",
  surface_type: "OD cylindrical",
  operation: "turning",
  material: "4140",
  cutting_params: { speed: 180, feed: 0.2, depth: 0.5 }
}
```

## What It Returns
- Classified defect type from known surface defect taxonomy
- Probable cause with confidence ranking
- Mechanism explanation (how the defect forms)
- Corrective actions specific to the identified defect type
- Whether the defect is cosmetic-only or affects functional performance

## Examples
- Input: `forensic_surface_defect params={ defect_description: "rainbow pattern on bore surface", operation: "boring", material: "316L" }`
- Output: Smearing/burnishing from BUE; stainless steel adhesion at low speed; increase speed or use coated insert

- Input: `forensic_surface_defect params={ defect_description: "regular wavy pattern 0.5mm pitch on flat face", operation: "face milling" }`
- Output: Cutter runout or insert height mismatch; check TIR and individual insert seating
