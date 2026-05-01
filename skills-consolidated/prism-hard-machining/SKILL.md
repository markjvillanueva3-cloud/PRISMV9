---
name: prism-hard-machining
description: |
  Hard part machining strategies for materials above 45 HRC. Hard turning, hard milling,
  CBN and ceramic insert selection, white layer formation, and process optimization.
  Replaces grinding in many applications for cost and flexibility benefits.
  
  Functions: hard_turn_params, hard_mill_params, insert_select_hard,
  white_layer_risk, surface_integrity, tool_life_hard, cost_compare_vs_grind,
  min_hardness_check, finish_achievable
  
  Academic Source: MIT 2.810, Tönshoff hard machining research, CIRP keynotes
  Total: ~340 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "hard", "machining", "strategies", "materials", "above", "turning", "milling"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-hard-machining")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-hard-machining") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What hard parameters for 316 stainless?"
→ Load skill: skill_content("prism-hard-machining") → Extract relevant hard data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot machining issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM HARD PART MACHINING
## Hard Turning, Hard Milling & Surface Integrity Management

## 1. HARD MACHINING FUNDAMENTALS

### Definition & Scope
Hard machining: Cutting materials with hardness ≥45 HRC (typically 55-68 HRC).
Replaces or supplements grinding for hardened steel components.

### Applicable Hardness Ranges
| Material | Hardness Range | Typical Applications |
|----------|---------------|---------------------|
| Case-hardened steel | 58-64 HRC | Gears, bearings, shafts |
| Through-hardened tool steel | 50-62 HRC | Dies, molds, punches |
| Bearing steel (52100) | 58-64 HRC | Bearing races, rollers |
| High-speed steel | 60-68 HRC | Cutting tools, fixtures |
| Cold work tool steel (D2) | 55-62 HRC | Stamping dies, gauges |
| Hot work tool steel (H13) | 44-52 HRC | Die casting dies, molds |

### Key Physics
```
In hard machining:
  - Material removal is by shear + fracture (not just shear)
  - Very high specific cutting forces: k_c = 4000-8000 MPa
  - Cutting temperatures: 800-1200°C at tool-chip interface
  - Chip formation: Segmented (saw-tooth) chips, not continuous
  - Tool wear: Predominantly flank wear, crater wear from diffusion
  
Chip formation transition:
  <45 HRC: Continuous chips (normal cutting mechanics)
  45-55 HRC: Transition zone (periodic segmentation)
  >55 HRC: Fully segmented chips (adiabatic shear bands)
```

## 2. CUTTING TOOL MATERIALS

### CBN (Cubic Boron Nitride)
| Grade | CBN Content | Binder | Best For |
|-------|-----------|--------|----------|
| High-CBN (>70%) | 70-95% | Metallic (Co,Al) | Interrupted cuts, cast iron, roughing |
| Low-CBN (45-65%) | 45-65% | Ceramic (TiN,TiC) | Continuous cuts, finish hard turning |
| PCBN tips | Brazed to carbide | Various | Standard indexable inserts |

### Ceramic Inserts
| Type | Composition | Hardness (HV) | Best For |
|------|-------------|--------------|----------|
| Al₂O₃ pure | Aluminum oxide | 1600-1800 | Cast iron high-speed finishing |
| Al₂O₃+TiC | Mixed ceramic | 1800-2000 | Hard steel continuous cuts |
| Al₂O₃+SiC_w | Whisker reinforced | 1900-2200 | Interrupted cuts, Inconel |
| Si₃N₄ | Silicon nitride | 1400-1600 | Cast iron roughing, thermal shock |

### Tool Selection Decision
```
Continuous cut (hard turning):
  <55 HRC → Coated carbide (TiAlN) or ceramic
  55-62 HRC → Low-CBN or mixed ceramic
  >62 HRC → Low-CBN required
  
Interrupted cut (hard milling, keyways):
  <55 HRC → Coated carbide, ceramic possible
  55-62 HRC → High-CBN (toughest grade)
  >62 HRC → High-CBN with honed edge

Surface finish priority → Low-CBN with wiper geometry
Tool life priority → High-CBN for toughness
Cost priority → Ceramic (1/3 cost of CBN)
```

### Insert Geometry for Hard Machining
```
Rake angle: -5° to -10° (always negative for strength)
Clearance angle: 5-7° (small to support edge)
Edge prep: Chamfer 0.05-0.15mm × 15-25° (critical for CBN)
Nose radius: 0.4-1.2mm (larger = better finish but more force)
Wiper geometry: Flat 0.5-1.0mm parallel to feed direction
```

## 3. HARD TURNING PARAMETERS

### Speed Recommendations
| Material / Hardness | CBN Speed (m/min) | Ceramic Speed (m/min) |
|---------------------|-------------------|----------------------|
| 45-50 HRC steel | 150-250 | 200-400 |
| 50-55 HRC steel | 120-200 | 150-300 |
| 55-60 HRC steel | 100-180 | 120-220 |
| 60-65 HRC steel | 80-150 | 80-150 |
| Bearing steel 62 HRC | 100-160 | 100-180 |
| D2 tool steel 60 HRC | 80-130 | 90-150 |
| H13 tool steel 48 HRC | 150-250 | 200-350 |

### Feed & Depth
```
Finishing:
  Feed: 0.05-0.15 mm/rev
  DOC: 0.05-0.30 mm
  Achievable Ra: 0.1-0.4 μm (with wiper)

Semi-finishing:
  Feed: 0.10-0.20 mm/rev
  DOC: 0.20-0.50 mm
  Achievable Ra: 0.4-1.0 μm

Light roughing:
  Feed: 0.15-0.30 mm/rev
  DOC: 0.30-1.00 mm
  Achievable Ra: 1.0-2.5 μm

CRITICAL: Total stock ≤ 0.3mm per side for finish hard turning
Pre-heat-treat to near-net shape, leave 0.2-0.5mm for hard machining
```

### Machine Requirements
```
Minimum requirements for hard turning:
  - Spindle runout: <3 μm TIR
  - Static stiffness: >30 N/μm at tool tip
  - Thermal stability: <5 μm/hr Z-axis growth after warmup
  - Positioning accuracy: <5 μm
  - Coolant: Dry preferred, or high-pressure flood
  
Dry cutting advantages in hard turning:
  - Consistent thermal conditions
  - No thermal shock to CBN/ceramic
  - Better chip color for wear monitoring
  - Environmental benefit
  
When to use coolant:
  - Part tolerance <10 μm (thermal growth control)
  - Deep bores (chip evacuation)
  - Customer specification requires it
```

## 4. HARD MILLING PARAMETERS

### Speed & Feed for Hard Milling
| Material | Hardness | Vc CBN (m/min) | Vc Carbide coated (m/min) |
|----------|----------|----------------|--------------------------|
| P20 mold steel | 30-35 HRC | N/A | 200-350 |
| H13 | 44-48 HRC | 150-250 | 120-200 |
| H13 | 48-52 HRC | 120-200 | 80-150 |
| D2 | 58-62 HRC | 80-150 | 50-100 |
| S7 | 54-58 HRC | 100-180 | 60-120 |

### Strategy: High-Speed Hard Milling
```
Principles:
  - Light DOC (axial): 0.05-0.30 × D
  - Light WOC (radial): 0.02-0.10 × D
  - High spindle speed: 15,000-40,000 RPM
  - High feed rate: 2,000-10,000 mm/min
  - Constant engagement: Trochoidal/dynamic paths
  
Benefits vs conventional:
  - Lower cutting forces (thin chip)
  - Less heat into workpiece
  - Better surface finish
  - Longer tool life (paradoxically)
  
Ball end mill finishing:
  - Stepover: 0.05-0.15 mm for Ra < 0.5 μm
  - Speed: As high as machine allows
  - Feed per tooth: 0.03-0.08 mm
  - Scallop height controls surface finish
```

## 5. SURFACE INTEGRITY

### White Layer Formation
```
White layer: Untempered martensite formed by rapid heating + quenching.
  Appearance: White under nital etch
  Hardness: 65-75 HRC (harder than bulk)
  Thickness: 1-20 μm
  Problem: Brittle, high tensile residual stress, fatigue crack initiation
  
Formation conditions:
  Temperature > Ac3 (austenitizing) + rapid cooling
  
Risk factors:
  - Worn tool (VB > 0.15mm flank wear)
  - Low cutting speed (more ploughing)
  - Dry cutting without adequate chip evacuation
  - Low feed rate (excessive rubbing)
  
Prevention:
  - Replace tool before VB = 0.15mm
  - Use adequate cutting speed (avoid ploughing regime)
  - Maintain sharp edge preparation
  - Monitor for sudden surface finish change
```

### Residual Stress in Hard Machining
```
Typical residual stress profiles:

Hard turning (sharp tool, good parameters):
  Surface: Compressive (-200 to -600 MPa)
  Depth: Compressive zone 20-50 μm deep
  Favorable for fatigue life!

Hard turning (worn tool, aggressive):
  Surface: Tensile (+200 to +800 MPa)
  White layer present
  Detrimental to fatigue life!

Grinding (conventional):
  Surface: Tensile (+100 to +500 MPa) typical
  Unless very gentle grinding parameters
  
Hard turning advantage: Can produce compressive residual stress
  that grinding typically cannot achieve without special processes
```

## 6. PROCESS PLANNING

### Hard Turning vs Grinding Decision
```
Choose HARD TURNING when:
  ✓ Complex geometry (shoulders, grooves, radii in one setup)
  ✓ Small batch sizes (no wheel dressing setup time)
  ✓ Part tolerance ≥ ±5 μm
  ✓ Surface finish ≥ Ra 0.1 μm (with wiper inserts)
  ✓ Interrupted cuts (CBN handles better than grinding)
  ✓ Flexibility needed (quick changeover)
  
Choose GRINDING when:
  ✓ Very tight tolerance (< ±3 μm)
  ✓ Surface finish < Ra 0.1 μm required
  ✓ Large batch sizes (grinding more economical)
  ✓ Very hard materials (>65 HRC, ceramic limits)
  ✓ Form grinding with complex profile
  ✓ Thin-wall parts (lower cutting forces)
```

### Stock Allowance Planning
```
Before hardening:
  Rough machine to near-net shape
  Leave 0.3-0.5 mm per side for hard machining
  Leave 0.1-0.2 mm per side for grinding (if applicable)
  
Heat treatment distortion allowance:
  Through-hardened: ±0.05-0.15 mm typical
  Case-hardened: ±0.03-0.10 mm typical
  
If distortion > stock allowance → re-rough soft, re-harden (expensive)
Always verify stock uniformity before hard machining
Non-uniform stock = non-uniform forces = poor accuracy
```

## 7. ECONOMIC COMPARISON VS GRINDING

### Cost Model
```
Cost per part = (C_machine × t_cycle + C_tool × t_cycle/T_tool + C_setup/batch) 

Typical comparison (bearing race, 58 HRC, ±10μm, Ra 0.4):

Hard Turning:
  Cycle time: 45 sec
  Tool cost: $25/edge, 50 parts/edge
  Machine rate: $80/hr
  Cost/part: $1.50

Grinding:
  Cycle time: 90 sec (including dressing)
  Wheel cost: $300/wheel, 500 parts
  Machine rate: $100/hr
  Cost/part: $3.10
  
Hard turning: ~50% cost reduction in this scenario
Plus: Single-setup capability, no coolant disposal, smaller footprint
```

## 8. TROUBLESHOOTING

### Common Issues
```
Chipping of CBN insert:
  → Increase edge chamfer width
  → Use high-CBN grade (tougher)
  → Reduce feed rate in interrupted zones
  → Check machine rigidity

Rapid flank wear:
  → Reduce cutting speed 10-20%
  → Check actual workpiece hardness
  → Verify insert grade matches application
  → Check for abrasive inclusions in material

Poor surface finish:
  → Check for BUE (reduce speed or increase speed)
  → Verify nose radius and wiper geometry
  → Reduce feed rate
  → Check machine vibration / spindle runout

White layer detected:
  → Replace insert immediately
  → Increase cutting speed (reduce ploughing)
  → Verify tool wear limit (VB < 0.15mm)
  → Consider slight depth increase (less rubbing)

Dimensional drift:
  → Thermal growth compensation
  → Monitor tool wear progression
  → Check workpiece temperature
  → Verify consistent stock removal
```

*Single-purpose skill: Hard part machining parameters, tool selection, and surface integrity management.*
