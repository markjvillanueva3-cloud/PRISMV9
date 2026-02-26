---
name: Surface Defect Type Reference
description: Surface defect type reference database with identification guide
---

## When To Use
- Looking up a specific surface defect type to understand its characteristics
- Browsing the catalog of known surface defects to match what you see on a part
- Building quality inspection criteria for surface defect classification
- Training inspectors on what different surface defect patterns look like

## How To Use
```
prism_intelligence action=forensic_surface_types params={
  filter: "milling",
  severity: "all",
  include_identification: true
}
```

## What It Returns
- Catalog of surface defect types for the specified operation
- Identification characteristics (pattern, spacing, depth, location)
- Root cause mapping for each defect type
- Severity classification (cosmetic, functional, critical)
- Standard reference images and measurement criteria

## Examples
- Input: `forensic_surface_types params={ filter: "turning" }`
- Output: 10 defect types: chatter marks, feed lines, tearing, smearing, BUE transfer, thermal discoloration, orange peel, spiral marks, step lines, burnishing

- Input: `forensic_surface_types params={ filter: "grinding", severity: "critical" }`
- Output: 4 critical grinding defects: thermal burn, rehardening cracks, residual stress damage, metallurgical transformation

- Input: `forensic_surface_types params={ defect_type: "chatter_marks", detail: true }`
- Output: Chatter mark profile: regular spacing matching vibration frequency, depth 2-20 um, occurs at specific speed/depth ratios
