---
name: prism-gdt-manufacturing
description: |
  Geometric Dimensioning and Tolerancing interpretation for CNC manufacturing.
  ASME Y14.5 symbols, datum selection, tolerance stack analysis, and CNC-specific
  tolerance achievability. Feature control frames to machining strategies.
  
  Functions: gdt_interpret, tolerance_stack, datum_priority, achievability_check,
  position_tolerance_calc, profile_tolerance, runout_check, true_position_from_xyz,
  bonus_tolerance, mmc_lmc_rfs, tolerance_to_process_capability
  
  Academic Source: ASME Y14.5-2018, MIT 2.008, GD&T resources
  Total: ~380 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "gdt", "manufacturing", "geometric", "dimensioning", "tolerancing", "interpretation", "asme"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-gdt-manufacturing")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-gdt-manufacturing") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What gdt parameters for 316 stainless?"
→ Load skill: skill_content("prism-gdt-manufacturing") → Extract relevant gdt data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot manufacturing issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM GD&T FOR CNC MANUFACTURING
## Geometric Tolerancing Interpretation and Achievability

# 1. GD&T SYMBOL REFERENCE

## 1.1 Form Tolerances (No Datum Required)

| Symbol | Name | Controls | CNC Impact |
|--------|------|----------|------------|
| ⏤ | Flatness | Surface waviness | Face mill strategy, spark-out |
| ○ | Circularity | Round cross-section | Boring bar rigidity, speed |
| ⌭ | Cylindricity | Entire cylinder surface | Multi-pass boring, honing |
| ∿ | Line Profile | 2D cross-section shape | Contour milling accuracy |
| ⏥ | Surface Profile | 3D surface shape | 5-axis finishing, ball nose |

## 1.2 Orientation Tolerances (Datum Required)

| Symbol | Name | Controls | CNC Impact |
|--------|------|----------|------------|
| ⊥ | Perpendicularity | 90° to datum | Fixture alignment, squareness |
| ∥ | Parallelism | Parallel to datum | Flip fixture flatness |
| ∠ | Angularity | Angle to datum | 4/5-axis alignment |

## 1.3 Location Tolerances (Datum Required)

| Symbol | Name | Controls | CNC Impact |
|--------|------|----------|------------|
| ⊕ | Position | Location from datums | Hole pattern accuracy |
| ◎ | Concentricity | Axis alignment | Chuck/collet accuracy |
| ≡ | Symmetry | Centerplane alignment | Fixture centering |

## 1.4 Runout Tolerances (Datum Axis Required)

| Symbol | Name | Controls | CNC Impact |
|--------|------|----------|------------|
| ↗ | Circular Runout | Single cross-section | Chuck runout, TIR |
| ↗↗ | Total Runout | Entire surface | Spindle + part accuracy |

# 2. DATUM SELECTION FOR CNC

## 2.1 Datum Priority Rules

```
Primary datum (A): Most stable surface, contacts 3+ points
  → CNC: Clamping face (vise jaw face, fixture base)
  
Secondary datum (B): Constrains 2 rotations
  → CNC: Locating edge or bore (vise stop, pin)
  
Tertiary datum (C): Constrains last rotation/translation
  → CNC: Second locating feature (end stop, second pin)
```

## 2.2 Datum-to-Fixture Mapping

| Datum Type | CNC Fixture Element | Degrees Constrained |
|-----------|---------------------|---------------------|
| Flat primary (A) | Vise jaw, fixture pad | 3 (X-rot, Y-rot, Z-trans) |
| Bore secondary (B) | Locating pin | 2 (X-trans, Y-trans) |
| Flat secondary (B) | Stop block | 2 (Y-trans, Z-rot) |
| Slot tertiary (C) | Diamond pin | 1 (rotation about pin B) |

## 2.3 3-2-1 Locating Principle

```
6 degrees of freedom require 6 contact points:
  Primary surface: 3 points (plane)
  Secondary surface: 2 points (line)
  Tertiary surface: 1 point (point)

CNC implementation:
  3 rest buttons or fixture pads (primary)
  2 locating pins or edge stops (secondary)
  1 end stop or anti-rotation pin (tertiary)
```

# 3. POSITION TOLERANCE

## 3.1 True Position Calculation

```
From measured coordinates (x_act, y_act) vs nominal (x_nom, y_nom):

Deviation: dx = x_act - x_nom
           dy = y_act - y_nom

True position (diametral):
  TP = 2 × sqrt(dx² + dy²)

Conformance: TP ≤ position tolerance (from FCF)
```

## 3.2 MMC Bonus Tolerance

When feature control frame specifies ⓜ (MMC modifier):
```
Total allowable position = stated tolerance + bonus

Bonus = |actual_size - MMC_size|

Example: Ø10.0 +0.1/-0.0 hole with ⊕ Ø0.25 ⓜ |A|B|C|
  MMC of hole = 10.0 (smallest hole)
  If actual hole = 10.06:
    Bonus = 10.06 - 10.0 = 0.06
    Total position allowed = 0.25 + 0.06 = 0.31
```

## 3.3 Position for Hole Patterns

```
Floating fastener:
  T_hole = H_mmc - F_mmc
  where H_mmc = MMC of clearance hole
        F_mmc = MMC of fastener (bolt diameter)

Fixed fastener:
  T_hole = (H_mmc - F_mmc) / 2  (split between mating parts)

Example: M8 bolt (8.0mm), clearance hole 8.5mm
  Floating: T = 8.5 - 8.0 = Ø0.5mm position tolerance
  Fixed: T = (8.5 - 8.0)/2 = Ø0.25mm each part
```

## 3.4 Composite Position

```
Pattern-locating (PLTZF) — upper line:
  Controls pattern location relative to datums
  
Feature-relating (FRTZF) — lower line:
  Controls feature-to-feature relationship within pattern
  Always ≤ PLTZF
  
CNC impact: FRTZF depends on machine repeatability (usually excellent)
            PLTZF depends on fixture accuracy (more challenging)
```

# 4. PROFILE TOLERANCE

## 4.1 Profile of a Surface

```
Bilateral (default): tolerance zone centered on nominal
  ±t/2 on each side of nominal surface

Unilateral: specified with U modifier
  Example: 0.5 U 0.3 → 0.3 outside, 0.2 inside nominal
```

## 4.2 Profile as Universal Tolerance

Profile of a surface can replace ±dimensional tolerances for complex geometry. Entire part can be controlled with a single profile callout + GD&T datum structure.

```
CNC impact:
  Profile 0.1mm → requires 5-axis finishing, minimal deflection
  Profile 0.25mm → achievable with good 3-axis milling
  Profile 0.5mm → standard CNC milling
  Profile 1.0mm → roughing tolerance
```

# 5. FORM TOLERANCES

## 5.1 Flatness

```
Flatness tolerance = total allowed deviation between two parallel planes
containing all surface points.

CNC achievable flatness:
  Face milling: 0.01-0.05 mm (per 100mm)
  Surface grinding: 0.002-0.01 mm (per 100mm)
  Lapping: 0.001-0.003 mm

Key factors:
  - Clamping distortion (springs back after release)
  - Thermal distortion during cutting
  - Residual stress redistribution
  - Machine geometry errors
```

## 5.2 Cylindricity

```
Cylindricity = radial zone between two coaxial cylinders
containing all surface points.

CNC achievable cylindricity:
  Turning: 0.005-0.02 mm
  Boring: 0.003-0.01 mm
  Grinding: 0.001-0.005 mm
  Honing: 0.001-0.003 mm
```

# 6. ORIENTATION TOLERANCES

## 6.1 Perpendicularity

```
Surface to datum axis:
  Tolerance zone = two parallel planes perpendicular to datum
  
Axis to datum surface:
  Tolerance zone = cylinder around nominal axis, perpendicular to datum

CNC perpendicularity depends on:
  - Machine squareness (X-Y, X-Z, Y-Z)
  - Fixture alignment to machine axes
  - Part deflection during machining
  
Typical CNC: 0.01-0.03 mm per 100mm without special attention
With calibrated machine: 0.005-0.01 mm per 100mm
```

# 7. RUNOUT

## 7.1 Circular Runout (TIR)

```
Measured: rotate part on datum axis, measure deviation at single cross-section
TIR = max_reading - min_reading on indicator

Circular runout tolerance = maximum allowable TIR

Components contributing to runout:
  1. Eccentricity (off-center)
  2. Ovality (out-of-round)
  3. Surface roughness peaks
```

## 7.2 Total Runout

```
Measured: sweep indicator along entire surface while rotating
Total runout includes circular runout + taper + barrel/hourglass

CNC achievable total runout:
  Turned in one setup: 0.005-0.015 mm
  Turned, rechucked: 0.01-0.05 mm (chuck accuracy)
  Ground between centers: 0.002-0.005 mm
```

# 8. CNC TOLERANCE ACHIEVABILITY

## 8.1 Process Capability by Feature Type

| Feature | Tolerance Range | Process | Notes |
|---------|----------------|---------|-------|
| Hole diameter | ±0.005-0.01 | Boring | Finish bore, single-point |
| Hole diameter | ±0.01-0.025 | Reaming | Standard ream |
| Hole diameter | ±0.025-0.05 | Drilling | Depends on drill type |
| OD turning | ±0.005-0.015 | Finish turn | Carbide insert |
| OD turning | ±0.002-0.005 | Precision turn | CBN/PCD, rigid setup |
| Milled pocket | ±0.01-0.025 | End mill | Tool deflection critical |
| Hole position | ±0.01-0.025 | CNC drill/bore | Machine repeatability |
| Surface profile | ±0.025-0.05 | Ball nose | Stepover dependent |
| Flatness/100mm | 0.01-0.03 | Face mill | Fly cutter best |
| Angularity | ±0.01-0.03 | 5-axis | Calibration dependent |

## 8.2 Tolerance-to-Process Mapping

```
Given tolerance T, required Cpk ≥ 1.33:
  Process σ ≤ T / (2 × 3 × 1.33) = T / 7.98

  For T = ±0.025 mm (0.050 total):
    σ_max = 0.050 / 7.98 = 0.00626 mm = 6.3 μm
    
  This requires a process with σ ≤ 6.3 μm → fine boring, grinding
```

# 9. TOLERANCE STACK ANALYSIS

## 9.1 Worst-Case (Arithmetic) Stack

```
T_assembly = Σ |T_i|  (absolute sum of all tolerances)

Most conservative — guarantees 100% assembly
Use for: safety-critical, small volumes, no rework acceptable
```

## 9.2 Statistical (RSS) Stack

```
T_assembly = sqrt(Σ T_i²)  (root sum of squares)

Assumes normal distribution, independent features
Guarantees ~99.73% assembly (3σ)
Use for: production volumes, standard manufacturing
```

## 9.3 CNC Stack Example

```
4-hole bolt pattern on milled part:
  Hole position tolerance: ⊕ Ø0.25 @ MMC
  Datum A (bottom face) flatness: 0.02
  Datum B (edge) straightness: 0.01
  Fixture repeatability: 0.005
  Machine positioning: 0.008
  
Worst case: 0.25 + 0.02 + 0.01 + 0.005 + 0.008 = 0.293
RSS: sqrt(0.25² + 0.02² + 0.01² + 0.005² + 0.008²) = 0.251
```
