---
name: prism-sfc-guide
version: 1.0.0
description: |
  Speed & Feed Calculator product guide. Uses the ProductEngine SFC pipeline
  to compose Kienzle, Taylor, surface finish, MRR, and safety analysis into
  unified cutting parameter recommendations with uncertainty bounds.

  Modules Covered:
  - ProductEngine/SFC (sfc_calculate, sfc_compare, sfc_optimize, sfc_quick,
    sfc_materials, sfc_tools, sfc_formulas, sfc_safety, sfc_history, sfc_get)

  Gateway Routes: prism_intelligence -> sfc_*
  R11 Product Packaging: MS0 — Speed & Feed Calculator
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "speed and feed", "cutting parameters", "what speed", "what feed", "SFC", "calculate parameters"
- User wants cutting speed, feed rate, RPM for a specific material + tool combination
- User wants to compare HSS vs Carbide vs Ceramic approaches
- User needs optimization toward productivity, tool life, quality, or cost
- User wants safety analysis of proposed cutting parameters

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-sfc-guide")`
2. Identify the user's material, tool, and operation
3. Use SFC actions:
   - `prism_intelligence->sfc_quick` — Fast lookup with minimal input (material + operation)
   - `prism_intelligence->sfc_calculate` — Full pipeline: speed/feed + force + tool life + finish + MRR + safety + uncertainty
   - `prism_intelligence->sfc_compare` — Compare HSS/Carbide/Ceramic side-by-side
   - `prism_intelligence->sfc_optimize` — Grid search for best params (5 objectives: productivity, tool_life, quality, cost, balanced)
   - `prism_intelligence->sfc_safety` — Standalone safety analysis of parameters
   - `prism_intelligence->sfc_materials` — List all 17 supported materials with hardness/group
   - `prism_intelligence->sfc_tools` — List 5 tool material families with speed ranges
   - `prism_intelligence->sfc_formulas` — List physics formulas used (Kienzle, Taylor, Ra, MRR, Stability)
   - `prism_intelligence->sfc_history` — Session history of recent calculations
   - `prism_intelligence->sfc_get` — Product metadata (version, actions, tiers, material count)

### What It Returns
- **Format**: Structured JSON with cutting parameters, forces, tool life, surface finish, MRR, safety score, uncertainty bounds, sustainability metrics
- **Success**: Ready-to-use CNC parameters with confidence intervals and safety status
- **Failure**: Missing required data -> specifies which inputs are needed

### Examples
**Example 1**: "What speed and feed for 4140 steel with a 12mm carbide endmill?"
-> `sfc_calculate(material: "4140", tool_material: "Carbide", tool_diameter: 12, number_of_teeth: 4)`
-> Vc=180 m/min, fz=0.1mm, RPM=4775, Fc=1200N, Tool life=45min, Ra=1.8um, Safety=0.85

**Example 2**: "Compare tool materials for milling titanium"
-> `sfc_compare(material: "Ti-6Al-4V")` -> HSS/Carbide/Ceramic comparison table sorted by composite score

**Example 3**: "Optimize for maximum tool life in Inconel 718"
-> `sfc_optimize(material: "Inconel 718", objective: "tool_life")` -> Reduced Vc, optimized fz for maximum tool life

# SPEED & FEED CALCULATOR GUIDE

## Supported Materials (17)
| Material | Group | Hardness HB |
|----------|-------|-------------|
| 1045 | Medium carbon steel | 200 |
| 4140, 4340 | Alloy steel | 280-300 |
| 304, 316, 316L | Austenitic stainless | 170-180 |
| 6061, 6061-T6, 7075, 7075-T6 | Wrought aluminum | 95-150 |
| A356 | Cast aluminum | 80 |
| Ti-6Al-4V | Titanium | 334 |
| Inconel 718 | Superalloy | 380 |
| GG25 | Gray cast iron | 190 |
| GGG50 | Ductile cast iron | 220 |
| C360 | Brass | 80 |
| PEEK | Engineering plastic | 100 |

## Composition Pipeline
```
Material Lookup -> Speed/Feed -> Kienzle Force -> Taylor Tool Life
    -> Surface Finish -> MRR -> Safety Scoring -> Uncertainty Bounds
    -> Sustainability (pro/enterprise only)
```

## Tier Gating
| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Core parameters | Yes | Yes | Yes |
| Kienzle + Taylor | Yes | Yes | Yes |
| Surface finish + MRR | Limited | Yes | Yes |
| Sustainability metrics | No | Yes | Yes |
| Uncertainty bounds | Wider | Normal | Normal |

## Safety Scoring
7-check system returning score (0-1) + status (safe/warning/danger):
1. Cutting speed range (min/max)
2. Feed per tooth limit
3. Depth vs tool diameter ratio
4. Width vs tool diameter check
5. Power capacity check
6. Force magnitude check
7. Machine RPM limit check
