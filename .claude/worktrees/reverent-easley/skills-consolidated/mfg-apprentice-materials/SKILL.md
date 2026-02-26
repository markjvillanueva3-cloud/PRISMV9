---
name: mfg-apprentice-materials
description: Material-specific training for different material families
---

# Material Training Module

## When To Use
- Training operators on a new material family before production begins
- Learning material-specific cutting behavior and common pitfalls
- Understanding why certain materials require special handling
- Preparing a machinist to transition from steel to titanium or exotic alloys

## How To Use
```
prism_intelligence action=apprentice_materials params={material_family: "titanium", focus: "cutting_behavior"}
```

## What It Returns
- `material_overview` — summary of material family properties relevant to machining
- `cutting_behavior` — how the material behaves during cutting (chip formation, heat, work hardening)
- `common_mistakes` — frequent errors machinists make with this material family
- `best_practices` — proven techniques and parameter guidelines
- `safety_notes` — material-specific safety considerations (fire risk, dust, coolant reactions)

## Examples
- Learn about titanium machining: `apprentice_materials params={material_family: "titanium"}` — returns overview covering low thermal conductivity, galling tendency, and 60-80 m/min typical speed range
- Focus on stainless steel work hardening: `apprentice_materials params={material_family: "stainless_steel", focus: "work_hardening"}` — returns detailed explanation of why 304/316 work-harden and how to avoid it with sharp tools and positive rake
- Study aluminum machining: `apprentice_materials params={material_family: "aluminum", focus: "surface_finish"}` — returns tips for achieving Ra 0.4um with diamond-coated tools and high-speed strategies
