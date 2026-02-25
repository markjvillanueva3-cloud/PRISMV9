---
name: mfg-multi-pass
description: Calculate optimal pass distribution for roughing — number of passes, depth per pass
---

## When To Use
- User needs to remove a large total depth and wants optimal pass strategy
- Planning roughing before finishing with remaining stock
- Need to balance tool load across multiple passes
- NOT for single-pass parameter selection (use mfg-speed-feed)
- NOT for trochoidal/adaptive strategies (use prism_calc trochoidal)

## How To Use
### Calculate Pass Distribution
```
prism_calc action=multi_pass params={
  total_depth: 15,
  max_ap: 4,
  material: "4140_steel"
}
```

### With Finishing Allowance
```
prism_calc action=multi_pass params={
  total_depth: 25,
  max_ap: 5,
  material: "Ti-6Al-4V",
  finishing_stock: 0.5,
  strategy: "equal_load"
}
```

## What It Returns
```json
{
  "total_depth_mm": 15,
  "num_passes": 4,
  "passes": [
    {"pass": 1, "ap_mm": 4.0, "type": "roughing"},
    {"pass": 2, "ap_mm": 4.0, "type": "roughing"},
    {"pass": 3, "ap_mm": 4.0, "type": "roughing"},
    {"pass": 4, "ap_mm": 3.0, "type": "roughing"}
  ],
  "finishing_stock_mm": 0,
  "strategy": "max_depth_first",
  "total_machining_depth": 15,
  "recommendation": "4 passes: 3x4.0mm + 1x3.0mm",
  "warnings": []
}
```

## Examples
### 15mm Total Depth in Steel
- Input: `prism_calc action=multi_pass params={total_depth: 15, max_ap: 4, material: "4140_steel"}`
- Output: 4 passes (3x4.0mm + 1x3.0mm) — max-depth-first strategy minimizes passes
- Edge case: Last pass < 0.5mm can cause rubbing; strategy redistributes to avoid this

### Deep Pocket in Titanium
- Input: `prism_calc action=multi_pass params={total_depth: 25, max_ap: 5, material: "Ti-6Al-4V", finishing_stock: 0.5}`
- Output: 5 roughing passes + 0.5mm finish stock, equal load distribution for Ti
- Edge case: Titanium benefits from equal-load strategy over max-depth-first to manage heat
