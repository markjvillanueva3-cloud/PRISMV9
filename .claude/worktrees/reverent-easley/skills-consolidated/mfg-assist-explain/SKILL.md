---
name: mfg-assist-explain
description: Get plain-language explanations of manufacturing concepts at any skill level
---

# Explain Manufacturing Concepts

## When To Use
- Need to understand a manufacturing term, concept, or principle
- Want an explanation tailored to a specific skill level (beginner, intermediate, expert)
- Looking for related concepts and hands-on PRISM tools to explore further
- Onboarding new machinists or cross-training across operations

## How To Use
```
prism_intelligence action=assist_explain params={
  concept: "chip thinning",
  level: "intermediate"
}
```

**Parameters:**
- `concept` (required): The manufacturing term or concept to explain
- `level` (optional): "beginner" | "intermediate" | "expert" — defaults to "intermediate"

## What It Returns
- `explanation`: Plain-language description scaled to the requested level
- `related_concepts`: Array of connected topics for deeper learning
- `visual_aids`: Suggested diagrams or illustrations that clarify the concept
- `prism_tools`: Relevant PRISM calculators and tools for hands-on exploration
- `formulas`: Key equations when applicable, with variable definitions

## Examples
- **Built-Up Edge**: `concept: "BUE"` → explains built-up edge formation, causes (low speed, high affinity materials), prevention (increase speed, coatings), links to `prism_calc action=speed_feed`
- **Chip Thinning**: `concept: "chip thinning compensation"` → radial engagement effect on effective chip thickness, when to apply feed compensation, links to `prism_calc action=chip_thinning`
- **Work Hardening**: `concept: "work hardening", level: "beginner"` → simple explanation of material getting harder during cutting, which alloys are worst, practical shop-floor signs to watch for
- **Stability Lobes**: `concept: "stability lobe diagram", level: "expert"` → full dynamic model, eigenvalue formulation, transfer function measurement, links to `prism_calc action=stability`
