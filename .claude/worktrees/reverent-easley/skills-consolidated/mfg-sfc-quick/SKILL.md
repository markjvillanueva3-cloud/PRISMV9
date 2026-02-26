---
name: mfg-sfc-quick
description: Fast surface finish estimate for shop floor use
---

# Quick Surface Estimate

## When To Use
- Getting a rapid Ra estimate at the machine without detailed calculations
- Quick sanity-checking whether current parameters will meet the print spec
- Estimating finish during setup or tryout with minimal input
- Providing a ballpark finish number for quoting or planning

## How To Use
```
prism_intelligence action=sfc_quick params={feed: 0.15, nose_radius: 0.8}
```

## What It Returns
- `Ra_estimate` — estimated arithmetic mean roughness in micrometers
- `confidence` — estimate confidence (high for standard cases, lower for exotic setups)
- `meets_spec` — pass/fail if a target Ra was provided
- `improvement_tip` — one quick suggestion to improve finish if needed

## Examples
- `sfc_quick params={feed: 0.15, nose_radius: 0.8}` — quick turning finish estimate
- `sfc_quick params={feed: 0.1, ball_radius: 5, stepover: 0.5, target_Ra: 1.6}` — quick ball nose check against spec
- `sfc_quick params={feed: 0.05, diameter: 10, flutes: 4}` — quick milling finish estimate
