---
name: prism-edm-operations
description: |
  Electrical Discharge Machining process parameters for wire EDM and sinker EDM.
  Spark gap control, electrode selection, surface integrity, flushing strategies,
  and process optimization for hardened steels, carbide, and exotic materials.
  
  Functions: wire_edm_params, sinker_edm_params, electrode_select, surface_finish_edm,
  mrr_edm, electrode_wear_rate, recast_layer_depth, flushing_strategy
  
  Academic Source: MIT 2.810, Kunieda EDM research, CIRP EDM keynotes
  Total: ~320 lines
---

## Quick Reference (Operational)

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-edm-operations")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-edm-operations") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What edm parameters for 316 stainless?"
→ Load skill: skill_content("prism-edm-operations") → Extract relevant edm data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot operations issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM EDM OPERATIONS
## Wire EDM, Sinker EDM & Process Parameter Optimization

## 1. EDM FUNDAMENTALS

### Process Physics
Material removal by electrical discharge (spark) between electrode and workpiece.
Each spark creates a micro-crater by melting and vaporizing material.

```
Single spark energy: E = V × I × t_on

Where:
  V = gap voltage (20-80V during discharge)
  I = discharge current (0.5-50A per channel)
  t_on = pulse on-time (0.5-500 μs)

Material removal per spark:
  Volume ∝ E^(1.1 to 1.4) (depends on material properties)
  
Gap maintained by servo control:
  Wire EDM: 0.01-0.05 mm per side
  Sinker EDM: 0.01-0.5 mm per side
```

### Requirements
- Workpiece must be electrically conductive (resistivity <100 Ω·cm)
- Dielectric fluid required (deionized water for wire, hydrocarbon oil for sinker)
- No direct contact between electrode and workpiece

### EDM vs Conventional Machining
| Factor | EDM | Conventional |
|--------|-----|-------------|
| Material hardness | No effect | Major factor |
| Complex geometry | Excellent (wire) | Limited by tool access |
| Accuracy | ±2-10 μm | ±5-25 μm |
| Surface finish | Ra 0.1-3.0 μm | Ra 0.4-6.3 μm |
| MRR | 20-800 mm³/min | 2000-50000+ mm³/min |
| Heat affected zone | 5-50 μm | 10-200 μm |
| Tool wear | Electrode erodes | Tool wears |
| Burrs | Zero burrs | Always present |

## 2. WIRE EDM

### Wire Types
| Wire | Diameter (mm) | Tensile (N/mm²) | Best For |
|------|--------------|------------------|----------|
| Brass (CuZn37) | 0.10-0.33 | 500-900 | General purpose, lowest cost |
| Zinc-coated brass | 0.10-0.30 | 900-1100 | Higher speed, better flushing |
| Diffusion-annealed | 0.15-0.30 | 700-900 | Tall parts, good straightness |
| Molybdenum | 0.03-0.10 | 1400-1800 | Micro-EDM, tight corners |
| Tungsten | 0.02-0.10 | 2000+ | Ultra-fine features |

### Wire EDM Parameters
```
Rough cut (first pass):
  On-time: 4-8 μs
  Off-time: 10-25 μs
  Current: 8-20 A
  Wire tension: 10-15 N
  Wire speed: 8-12 m/min
  Offset: 0.14-0.18 mm (half kerf)
  MRR: 150-400 mm²/min
  Surface finish: Ra 1.5-3.0 μm

Skim cut 1 (semi-finish):
  On-time: 1-3 μs
  Off-time: 5-15 μs
  Current: 3-8 A
  Offset: 0.10-0.14 mm
  MRR: 50-100 mm²/min
  Surface finish: Ra 0.6-1.5 μm

Skim cut 2+ (finish):
  On-time: 0.5-1.5 μs
  Off-time: 3-10 μs
  Current: 1-4 A
  Offset: 0.08-0.11 mm
  Surface finish: Ra 0.1-0.6 μm

Typical: 1 rough + 2-4 skim cuts for precision work
```

### Kerf Width
```
Kerf = Wire diameter + 2 × spark gap + 2 × wire deflection

Typical kerf widths:
  0.25mm wire: 0.30-0.35 mm kerf (rough), 0.28-0.30 mm (finish)
  0.20mm wire: 0.25-0.28 mm kerf
  0.10mm wire: 0.13-0.16 mm kerf
  
Minimum inside radius ≈ wire diameter / 2 + spark gap
  0.25mm wire: ~0.15mm minimum radius
  0.10mm wire: ~0.06mm minimum radius
```

### Taper Cutting
- Maximum taper angle: ±30° (machine dependent, some ±45°)
- Accuracy degrades with part height at large angles
- UV axis controls wire angle independently from XY
- For precision taper: reduce cutting speed 30-50%

## 3. SINKER EDM

### Process Parameters
```
Roughing:
  Current: 10-50 A
  On-time: 50-500 μs
  Off-time: 10-100 μs
  Polarity: Electrode positive (standard for copper)
  MRR: 50-500 mm³/min
  Surface finish: Ra 3-15 μm
  Electrode wear: 1-5%

Semi-finishing:
  Current: 3-15 A
  On-time: 10-50 μs
  Off-time: 10-50 μs
  MRR: 10-80 mm³/min
  Surface finish: Ra 1-5 μm
  Electrode wear: 2-8%

Finishing:
  Current: 0.5-5 A
  On-time: 2-15 μs
  Off-time: 5-30 μs
  MRR: 1-15 mm³/min
  Surface finish: Ra 0.2-1.5 μm
  Electrode wear: 5-20%
```

### Orbiting / Vectoring
```
Electrode orbiting expands cavity beyond electrode shape:
  Orbit radius = 0.01-0.50 mm
  Benefits:
    - Better flushing (gap opens on non-cutting side)
    - Can use undersized electrode for multiple cavities
    - Improved corner radii
    - Reduced electrode count
```

## 4. ELECTRODE SELECTION

### Sinker EDM Electrode Materials
| Material | MRR Factor | Wear Rate | Finish | Cost | Best For |
|----------|-----------|-----------|--------|------|----------|
| Copper (EDM grade) | 1.0× | Low (1-3%) | Good | Medium | General purpose |
| Graphite (fine) | 1.2-1.5× | Medium (2-8%) | Fair | Low | Large cavities, roughing |
| Graphite (ultra-fine) | 1.0-1.2× | Low-med (2-5%) | Good | Medium | Detail, finishing |
| Copper-tungsten | 0.8× | Very low (<1%) | Excellent | High | Deep ribs, precision |
| Copper-graphite | 1.1× | Low (1-4%) | Good | Medium | Compromise material |

### Electrode Selection Guide
```
Large cavity, moderate detail → Graphite (fast machining, high MRR)
Fine detail, tight tolerance → Copper or copper-tungsten
Deep narrow ribs → Copper-tungsten (minimal wear)
Multiple identical cavities → Graphite (easy to machine many copies)
Mirror finish required → Copper (produces best surface)
Cost-sensitive → Graphite (cheapest, fastest to machine)
```

### Electrode Sizing
```
Overcut (gap per side):
  Rough: 0.05-0.30 mm per side
  Finish: 0.01-0.05 mm per side

Electrode size = Cavity size - 2 × overcut

For male (positive) features:
  Electrode = desired size - 2 × spark gap
  
For female (negative) features:
  Electrode = desired size + 2 × spark gap (if using male electrode)
```

## 5. SURFACE INTEGRITY

### Recast Layer (White Layer)
```
Recast layer: Re-solidified material from spark craters
  Composition: Untempered martensite + carbides + dielectric decomposition products
  Hardness: 60-70 HRC (harder than substrate)
  Properties: Brittle, micro-cracked, tensile residual stress

Recast thickness vs parameters:
  Rough (high energy): 10-50 μm
  Semi-finish: 5-15 μm
  Finish: 2-8 μm
  Fine finish: <3 μm

Removal methods:
  - Finish skim cuts (progressively lighter)
  - Chemical etching (acid bath)
  - Gentle grinding or polishing
  - Shot peening (compressive stress overlay)
```

### Heat Affected Zone (HAZ)
```
Below recast layer:
  HAZ depth: 1-5× recast layer depth
  Contains: Tempered zone, possible micro-cracks
  
For critical applications (aerospace, medical):
  Recast layer must be removed or minimized
  HAZ must not penetrate below minimum material condition
  Barkhausen noise testing for verification
```

## 6. PROCESS OPTIMIZATION

### Flushing Strategies
```
Wire EDM:
  Top/bottom nozzle flushing: Standard
  Submerged cutting: Best for tall parts (>50mm)
  Nozzle gap: 0.1-0.5mm from workpiece surface
  Pressure: 2-8 bar (higher for tall parts)

Sinker EDM:
  Pressure flushing: Through electrode holes
  Suction flushing: Vacuum through electrode
  Jet flushing: External nozzle (least effective)
  Jump flushing: Periodic electrode retraction (most reliable)
  Jump height: 0.5-3mm, frequency: 1-10 Hz
  
Poor flushing → arcing → DC arc damage (catastrophic surface damage)
```

### Speed vs Accuracy Trade-off
```
Strategy for production:
  1. Rough cut: Maximum MRR, accept poor surface
  2. Semi-finish: Moderate settings, approach final size
  3. Finish: Low energy, final dimension and finish
  4. Extra skim (if needed): Mirror finish, minimal material removal

Each skim pass removes 0.01-0.05mm per side
Plan total stock: 0.1-0.3mm per side for skim passes
```

## 7. APPLICATION GUIDE

### When to Use EDM
```
✓ Hardened materials (>60 HRC) with complex geometry
✓ Internal corners sharper than available endmill radius
✓ Thin walls/features that would deflect under cutting force
✓ Deep narrow slots/ribs (depth:width > 10:1)
✓ Carbide/PCD/CBN tooling manufacture
✓ Zero-burr requirement (medical, aerospace)
✓ Complex 3D cavity with no draft (injection molds)
✗ Large material removal (conventional is 10-100× faster)
✗ Non-conductive materials
✗ Simple geometry achievable by milling
```

### Wire EDM Programming Tips
```
- Lead-in/lead-out: Use arc approach tangent to profile
- Start hole: EDM drill or pre-drill for internal features
- Tab (slug retention): Leave 0.5-1mm tab for slug support
- Multiple parts: Nest within single setup for efficiency
- 4-axis taper: Program independently for punch/die clearance
- Skip cuts: Rough all profiles first, then skim all (thermal stability)
```

## 8. TROUBLESHOOTING

### Common Problems
```
Wire breaks:
  → Reduce power, increase off-time
  → Check flushing (debris buildup)
  → Inspect wire path for contamination
  → Reduce wire tension on tall parts
  → Check wire guides for wear

Arcing (DC arc):
  → Improve flushing immediately
  → Increase off-time
  → Reduce current
  → Check dielectric condition/filtration
  → Increase jump frequency (sinker)

Poor surface finish:
  → Add skim pass(es) with lower energy
  → Check wire condition (spool change)
  → Verify dielectric conductivity
  → Reduce cutting speed for skim passes

Dimensional inaccuracy:
  → Verify wire compensation (offset)
  → Check thermal stability (dielectric temp)
  → Re-measure after thermal soak
  → Verify start hole position
  → Check for wire deflection on tall parts
```

*Single-purpose skill: EDM process parameters, electrode selection, and surface integrity management.*
