---
name: mfg-adaptive-chipload
description: Real-time chip load adaptation based on cutting force feedback
---

# Adaptive Chip Load Control

## When To Use
- Maintaining constant chip load during variable-engagement cuts
- Preventing tool overload in pocketing and profiling operations
- Optimizing feed rate through material hardness variations
- Protecting tools during interrupted cuts or hard inclusions

## How To Use
```
prism_intelligence action=adaptive_chipload params={target_chipload: 0.08, tool_diameter: 12, flutes: 4, force_limit: 850}
```

## What It Returns
- `feed_adjustment` — recommended feed rate multiplier (0.3-1.5x)
- `current_chipload` — estimated actual chip load from force data
- `force_reading` — current cutting force vs. limit
- `engagement_estimate` — radial engagement percentage
- `status` — adaptation state (nominal, adjusting, limiting, emergency)

## Examples
- `adaptive_chipload params={target_chipload: 0.08, tool_diameter: 12, flutes: 4, force_limit: 850}` — set up chip load control for 12mm end mill
- `adaptive_chipload params={target_chipload: 0.05, force_limit: 500, material: "Ti-6Al-4V"}` — conservative chip load for titanium
- `adaptive_chipload params={mode: "status"}` — check current adaptive chip load state
