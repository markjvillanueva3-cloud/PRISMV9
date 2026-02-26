---
name: mfg-campaign-create
description: Create batch machining campaigns with cumulative safety tracking
---

# Batch Campaign Creator

## When To Use
- Setting up a new production campaign for a batch of identical parts
- Defining campaign parameters including material, quantity, and safety constraints
- Establishing cumulative tool wear and safety tracking across the entire batch
- Planning multi-shift production runs with consistent parameter sets

## How To Use
```
prism_calc action=campaign_create params={name: "Production Run A", material: "Al 6061", quantity: 500, operations: [{type: "roughing", tool: "carbide endmill 16mm"}, {type: "finishing", tool: "carbide endmill 10mm"}], safety: {max_tool_wear_percent: 80, force_limit_N: 2000}}
```

## What It Returns
- `campaign_id` — unique campaign identifier
- `name` — campaign display name
- `total_parts` — target production quantity
- `estimated_cycle_time` — per-part cycle time estimate
- `safety_budget` — cumulative safety tracking budget (tool wear, force limits)
- `tool_changes_estimated` — predicted number of tool changes for the batch

## Examples
- Create aluminum batch campaign: `campaign_create params={name: "Bracket Lot 47", material: "Al 6061", quantity: 500, operations: [{type: "roughing"}, {type: "finishing"}]}`
- Create titanium campaign with strict safety: `campaign_create params={name: "Implant Batch 12", material: "Ti-6Al-4V", quantity: 50, safety: {max_tool_wear_percent: 70, force_limit_N: 1500}}`
- Create multi-operation campaign: `campaign_create params={name: "Housing Run", material: "SS 316L", quantity: 200, operations: [{type: "face_mill"}, {type: "pocket"}, {type: "drill"}, {type: "tap"}]}`
