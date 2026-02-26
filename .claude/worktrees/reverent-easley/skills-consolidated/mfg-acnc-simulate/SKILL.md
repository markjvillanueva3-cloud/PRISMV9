---
name: mfg-acnc-simulate
description: Simulate auto-generated CNC programs before execution
---

# ACNC Simulation Engine

## When To Use
- Verifying auto-generated programs for collisions and gouges before running
- Checking material removal and final part shape against nominal geometry
- Validating tool paths stay within machine travel limits
- Estimating accurate cycle time from simulated motion

## How To Use
```
prism_intelligence action=acnc_simulate params={program_id: "ACNC-001", machine: "3axis_vmc", stock: {X: 100, Y: 60, Z: 25}}
```

## What It Returns
- `collision_check` — pass/fail with details of any detected collisions
- `gouge_check` — pass/fail with locations of any surface gouges
- `remaining_stock` — material remaining after all operations
- `cycle_time` — simulated cycle time including rapids and tool changes
- `travel_check` — verification that all moves are within machine envelope

## Examples
- `acnc_simulate params={program_id: "ACNC-001", machine: "3axis_vmc", stock: {X: 100, Y: 60, Z: 25}}` — full simulation of auto-generated program
- `acnc_simulate params={program_id: "ACNC-001", check: "collision_only"}` — fast collision-only check
- `acnc_simulate params={program_id: "ACNC-001", compare_to: "nominal.step"}` — compare simulated result to CAD nominal
