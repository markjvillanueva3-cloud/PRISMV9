---
name: mfg-chip-load
description: Calculate chip load per tooth from feed rate, RPM, and number of flutes
---

## When To Use
- User asks about chip load, feed per tooth, or fz
- Verifying a programmed feed rate produces correct chip thickness
- Reverse-calculating fz from machine feed rate display
- NOT for chip thinning compensation (use mfg-chip-thinning)
- NOT for full speed/feed recommendations (use mfg-speed-feed)

## How To Use
### Calculate Chip Load
```
prism_calc action=chip_load params={
  Vf: 2000,
  n: 8000,
  z: 4
}
```

### From Linear Feed and Speed
```
prism_calc action=chip_load params={
  Vf: 500,
  n: 1200,
  z: 2
}
```

## What It Returns
```json
{
  "fz_mm": 0.0625,
  "fz_unit": "mm/tooth",
  "Vf_mm_min": 2000,
  "n_rpm": 8000,
  "z": 4,
  "fr_mm_rev": 0.25,
  "assessment": "normal",
  "warnings": []
}
```

## Examples
### Verify Feed Rate on Running Machine
- Input: `prism_calc action=chip_load params={Vf: 2000, n: 8000, z: 4}`
- Output: fz=0.0625mm/tooth — typical for aluminum finishing with small endmill
- Edge case: If fz < 0.01mm, rubbing occurs instead of cutting — tool heats and wears rapidly

### Slow Feed Check
- Input: `prism_calc action=chip_load params={Vf: 500, n: 1200, z: 2}`
- Output: fz=0.208mm/tooth — heavy chip load, verify tool can handle it
- Edge case: fz > 0.3mm for small tools (<10mm) risks chipping; reduce or use bigger tool
