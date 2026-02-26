---
name: mfg-adaptive-wear
description: Compensate for progressive tool wear during machining
---

# Adaptive Wear Compensation

## When To Use
- Compensating for dimensional drift caused by progressive flank wear
- Adjusting tool offsets based on estimated wear state
- Extending tool life by adapting cutting parameters as wear progresses
- Maintaining part tolerance across a batch as the tool wears

## How To Use
```
prism_intelligence action=adaptive_wear params={tool_id: "T01", cut_time_min: 35, material: "4140", operation: "finishing"}
```

## What It Returns
- `wear_estimate_mm` — estimated flank wear VB in mm
- `offset_compensation` — recommended tool offset adjustment (X, Z, or radius)
- `remaining_life_pct` — estimated remaining useful life percentage
- `parameter_adjustment` — suggested speed/feed changes for current wear state
- `replace_warning` — boolean flag if tool should be changed soon

## Examples
- `adaptive_wear params={tool_id: "T01", cut_time_min: 35, material: "4140", operation: "finishing"}` — get wear compensation for 35min cutting
- `adaptive_wear params={tool_id: "T03", parts_completed: 48, target_Ra: 0.8}` — check if tool can hold finish for next part
- `adaptive_wear params={mode: "batch_plan", batch_size: 100, tool_life_min: 60}` — plan tool changes across batch
