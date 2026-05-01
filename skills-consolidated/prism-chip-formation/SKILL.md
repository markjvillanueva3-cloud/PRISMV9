---
name: prism-chip-formation
description: |
  Chip formation mechanics, chip types, chip breaking, and chip evacuation for CNC.
  Covers chip thickness models, chip compression ratio, built-up edge, chip breaking
  criteria, and deep hole drilling chip evacuation strategies.
  
  Functions: chip_thickness_turning, chip_thickness_milling, chip_compression_ratio,
  chip_type_predict, chip_breaking_criteria, chip_evacuation_strategy,
  bue_risk_assessment, chip_load_per_tooth, effective_chip_thickness
  
  Academic Source: MIT 2.008, Shaw Metal Cutting Principles, Trent & Wright
  Total: ~350 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "chip", "formation", "mechanics", "types", "breaking", "evacuation", "thickness"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-chip-formation")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-chip-formation") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What chip parameters for 316 stainless?"
→ Load skill: skill_content("prism-chip-formation") → Extract relevant chip data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot formation issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM CHIP FORMATION & EVACUATION
## Chip Mechanics for CNC Process Control

# 1. CHIP FORMATION FUNDAMENTALS

## 1.1 Shear Plane Model

The chip forms by shear along the primary shear plane at angle φ:
```
Merchant: φ = π/4 - (β - α)/2
Lee-Shaffer: φ = π/4 - β + α

where:
  α = rake angle (positive when chip slides away from workpiece)
  β = friction angle = arctan(μ) on rake face
  μ = coefficient of friction (0.3-0.8 for metals)
```

## 1.2 Chip Compression Ratio (r_c)

```
r_c = h_c / h = cos(φ - α) / sin(φ)

where:
  h = uncut chip thickness
  h_c = actual chip thickness (always > h due to shear)
  
Typical values:
  Steel with carbide: r_c = 1.5 - 3.0
  Aluminum: r_c = 2.0 - 5.0 (more plastic deformation)
  Cast iron: r_c = 1.1 - 1.5 (segmented chips)
```

## 1.3 Shear Strain

```
γ = cos(α) / (sin(φ) × cos(φ - α))
  = cot(φ) + tan(φ - α)

Typical: γ = 2-5 for most metals
```

## 1.4 Velocity Relations

```
Chip velocity:     V_c = V × sin(φ) / cos(φ - α)
Shear velocity:    V_s = V × cos(α) / cos(φ - α)

Cutting velocity V = π × D × n / 1000 (m/min)
```

# 2. CHIP THICKNESS MODELS

## 2.1 Turning

```
Uncut chip thickness:
  h = f × sin(κ_r)

Chip width:
  b = ap / sin(κ_r)

Chip cross-section area:
  A_c = h × b = f × ap

where:
  f = feed per revolution (mm/rev)
  ap = depth of cut (mm)
  κ_r = entering (lead) angle (90° for square shoulder)
```

## 2.2 Milling — Average Chip Thickness

```
h_avg = fz × (ae/D) × (180/π) × (1/θ_engagement)

Simplified:
  h_avg = fz × sqrt(ae/D)  (approximate for ae < 0.5D)

where:
  fz = feed per tooth (mm/tooth)
  ae = radial depth of cut (mm)
  D = cutter diameter (mm)
  θ_engagement = arccos(1 - 2ae/D)
```

## 2.3 Milling — Maximum Chip Thickness

```
h_max = fz × sin(θ_engagement)
      = fz × sqrt(ae/D × (2 - ae/D))

For ae ≤ 0.5D (climb milling):
  h_max ≈ fz × sqrt(2ae/D)
```

## 2.4 Effective Chip Thickness (hex)

For chip thinning compensation, the effective hex must match target:
```
hex_target = desired chip thickness (from catalog)

Compensated feed per tooth:
  fz_compensated = hex_target / sin(θ_engagement)
                 = hex_target × D / sqrt(ae × (2D - ae))
```

# 3. CHIP TYPES AND CLASSIFICATION

## 3.1 ISO 3685 Chip Forms

| Type | Shape | Material | Conditions | Desirability |
|------|-------|----------|------------|--------------|
| 1 - Ribbon | Long continuous ribbon | Ductile steel, Al | Low feed, high speed | POOR - wraps tooling |
| 2 - Tubular | Helical tube | Steel | Moderate feed | ACCEPTABLE |
| 3 - Spiral | Flat spiral disc | Steel | Moderate conditions | GOOD |
| 4 - Washer | Short helical segments | Steel | Good chip breaking | EXCELLENT |
| 5 - Arc | Short C-shaped | Steel | Ideal chip breaker | EXCELLENT |
| 6 - Comma | Short comma-shaped | Steel | Heavy chip breaking | GOOD |
| 7 - Needle/Snarl | Tangled mass | Soft Al, brass | Any | POOR |
| 8 - Segmented | Discontinuous chunks | Cast iron, brass | Any | GOOD (self-breaking) |

## 3.2 Chip Form Prediction

Chip form depends on: material ductility, feed, depth, speed, chip breaker geometry.

```
General tendencies:
  ↑ Feed → shorter chips (better breaking)
  ↑ Depth → wider chips (harder to break)
  ↑ Speed → more continuous (thermal softening)
  ↑ Rake angle → more continuous
  Chip breaker groove → forces chip curl → breaks shorter
```

## 3.3 Material-Specific Chip Behavior

**Low carbon steel (1018):** Long continuous chips, BUE prone. Need chip breaker + higher speed.
**Medium carbon (4140):** Good chip breaking at moderate feeds. Ideal chip control.
**Stainless 304/316:** Stringy, work-hardening. Need positive rake, sharp edges, steady feed.
**Aluminum 6061:** Long snarled chips. Need polished rake face, high speed, sometimes air blast.
**Cast iron:** Naturally segmented. No chip breaking issues. Dust/fine chip concern.
**Titanium:** Segmented/serrated at all speeds (adiabatic shear). Short chips but high forces.
**Inconel:** Notch-sensitive, abrasive chips. Ceramic or CBN tooling.

# 4. BUILT-UP EDGE (BUE)

## 4.1 BUE Formation Conditions

```
BUE occurs when:
  1. Ductile material (steel, aluminum)
  2. Low-to-moderate cutting speed (adhesion zone)
  3. Small rake angle (high compression)
  4. No coolant or poor lubrication
  
BUE temperature range: 300-500°C at chip-tool interface
  Below 300°C: insufficient adhesion
  Above 500°C: too soft to adhere (flow zone)
```

## 4.2 BUE Speed Ranges

```
Low carbon steel:
  BUE zone: 15-60 m/min
  BUE-free: > 100 m/min (recommended)
  
Aluminum 6061:
  BUE zone: 30-150 m/min (wide range)
  BUE-free: > 300 m/min or use PCD/DLC coating

Stainless 304:
  BUE zone: 20-80 m/min
  BUE-free: > 120 m/min with coated carbide
```

## 4.3 BUE Avoidance Strategies

1. Increase cutting speed above BUE zone
2. Use positive rake angle inserts
3. Apply flood coolant or MQL
4. Use coated tools (TiAlN reduces adhesion)
5. For aluminum: polished rake face, DLC or PCD

# 5. CHIP BREAKING CRITERIA

## 5.1 Nalbant Chip Breaking Diagram

Plot feed (f) vs depth of cut (ap) with zones:
```
Zone I (f low, ap low): Continuous ribbon → POOR
Zone II (f moderate, ap moderate): Acceptable breaking → GOOD
Zone III (f high, ap high): Forced breaking, high forces → MARGINAL

Chip breaker effective range defines Zone II boundaries.
Typical for steel with standard breaker:
  f = 0.10 - 0.35 mm/rev
  ap = 0.8 - 4.0 mm
```

## 5.2 Chip Breaker Selection Guide

| Application | Breaker Type | Feed Range | DOC Range |
|-------------|-------------|------------|-----------|
| Finishing | F/MF (fine) | 0.05-0.15 | 0.3-1.5 |
| Medium | M (medium) | 0.12-0.35 | 0.8-4.0 |
| Roughing | R (rough) | 0.25-0.60 | 2.0-8.0 |

## 5.3 Natural Chip Breaking (No Breaker)

Some materials break naturally:
- Cast iron: always segmented
- Brass (free-cutting): short comma chips
- 12L14 (leaded steel): excellent natural breaking
- Titanium: adiabatic shear → segmented

# 6. CHIP EVACUATION STRATEGIES

## 6.1 Drilling Chip Evacuation

```
Standard twist drill:
  Peck depth = 1-3 × D (full retract every peck)
  Chip-break peck = 0.5-1 × D (no retract, just breaks chip)

Deep hole (L/D > 5):
  Gun drill: through-coolant, single-lip, 20-70 bar
  BTA drill: through-coolant, guide pads
  
Minimum coolant pressure for chip evacuation:
  P_min = k × L/D × MRR
  Typical: 20 bar for L/D = 5, 70 bar for L/D = 20
```

## 6.2 Pocket Milling Evacuation

- Air blast at 6-8 bar for aluminum dry machining
- Through-spindle coolant for deep pockets (>2D deep)
- Helical ramp entry (avoid plunge) for chip clearance
- Upward spiral toolpath lifts chips out of pocket

## 6.3 Turning Chip Control

- Chip conveyor direction: away from chuck
- High-pressure coolant (70+ bar) breaks and directs chips
- Inverted turning (spindle above): gravity assists evacuation
- Swiss-type: guide bushing proximity limits chip space

## 6.4 Chip Volume Estimation

```
Chip volume rate:
  Q_chip = MRR × (1/ρ_chip)

Chip packing ratio (loose chips vs solid):
  k_pack = 3-8 (turning) 
  k_pack = 5-15 (milling — smaller, more irregular)
  
Conveyor capacity needed:
  V_conveyor = Q_chip × k_pack (volume/min of loose chips)
```

# 7. CHIP THINNING IN MILLING

## 7.1 Why Chip Thinning Matters

When ae < 0.5D, the maximum chip thickness is less than fz. The tool catalog's recommended chip load assumes full engagement. Running at catalog fz with small ae means the actual chip is thinner than intended, causing:
- Rubbing instead of cutting
- Excessive heat (friction, not shear)
- Accelerated flank wear
- Poor surface finish

## 7.2 Compensation Formula

```
fz_comp = fz_catalog × (D / (2 × sqrt(ae × (D - ae))))

Simplified for ae << D:
  fz_comp ≈ fz_catalog × sqrt(D / ae) / sqrt(2)

Example: D = 20mm, ae = 2mm, fz_catalog = 0.10 mm
  fz_comp = 0.10 × (20 / (2 × sqrt(2 × 18)))
          = 0.10 × (20 / 12.0) = 0.167 mm/tooth
  
Feed increase: 67% to maintain proper chip load!
```

## 7.3 Practical Limits

```
Maximum compensated fz:
  fz_max ≤ 2 × fz_catalog (safety limit)
  fz_max ≤ chip pocket capacity of cutter
  
For high-feed milling (ae very small, full slot width):
  Special HFM cutters designed for fz up to 2-3mm
  Small ap (0.5-1.0mm), large ae (full width), very high feed
```
