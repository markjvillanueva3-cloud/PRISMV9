---
name: prism-fixturing-principles
description: |
  Workpiece locating theory, 3-2-1 principle, datum selection, and fixture design
  for CNC machining. Locating pin placement, clamping sequence, repeatability analysis,
  over-constraint detection, and fixture error budgeting.
  
  Functions: locating_scheme, datum_select, constraint_check, repeatability_calc,
  clamp_sequence, fixture_error_budget, pin_placement, over_constrain_detect
  
  Academic Source: MIT 2.810, Asada/By fixture design, Rong & Zhu fixture planning
  Total: ~330 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "fixturing", "principles", "workpiece", "locating", "theory", "datum", "selection"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-fixturing-principles")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-fixturing-principles") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What fixturing parameters for 316 stainless?"
→ Load skill: skill_content("prism-fixturing-principles") → Extract relevant fixturing data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot principles issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM FIXTURING & LOCATING PRINCIPLES
## 3-2-1 Locating, Datum Strategy & Fixture Design Theory

## 1. DEGREES OF FREEDOM

### Rigid Body in 3D Space
A free rigid body has 6 degrees of freedom (DOF):
- 3 translations: X, Y, Z
- 3 rotations: Rx (pitch), Ry (roll), Rz (yaw)

### Fixturing Goal
Constrain exactly 6 DOF — no more (over-constraint), no less (under-constraint).
Each locating point removes specific DOF from the workpiece.

```
Under-constrained: Part can move during cutting → scrap or crash
Over-constrained: Part forced into position → distortion, stress, poor repeatability
Properly constrained: Part uniquely located, stress-free, repeatable
```

## 2. 3-2-1 LOCATING PRINCIPLE

### The Foundation
```
Primary plane (3 points): Removes 3 DOF
  - 1 translation (normal to plane)
  - 2 rotations (tilt about 2 axes in plane)
  → 3 points define a plane, part sits on them

Secondary plane (2 points): Removes 2 DOF
  - 1 translation (normal to secondary plane)
  - 1 rotation (about axis perpendicular to both planes)
  → 2 points on edge or secondary face

Tertiary point (1 point): Removes 1 DOF
  - 1 translation (last remaining axis)
  → 1 point against end or third face

Total: 3 + 2 + 1 = 6 DOF constrained
```

### Point Placement Rules
```
Primary plane (3 points):
  - Spread points as far apart as possible (maximizes stability)
  - Triangle formation, not collinear
  - Place under cutting forces when possible (compression, not tension)
  - Largest, most stable surface of workpiece

Secondary plane (2 points):
  - Maximum spacing between the 2 points
  - Perpendicular to primary plane
  - Second-largest reference surface

Tertiary point (1 point):
  - Perpendicular to both primary and secondary
  - Single point or short pin contact
```

### Locating vs Clamping
```
LOCATING defines WHERE the part sits (precise position)
CLAMPING holds the part AGAINST the locators (force)

Critical distinction:
  - Locators are RIGID (hardened pins, pads, V-blocks)
  - Clamps are FLEXIBLE (screws, toggles, hydraulic, spring)
  - Clamps push TOWARD locators, never away
  - Clamps should NEVER move the part off locators
```

## 3. DATUM SELECTION STRATEGY

### Datum Priority Rules
```
Rule 1: Primary datum = largest/most stable surface
  - Maximum contact area → best stability
  - Usually the bottom face in milling

Rule 2: Functional datums match print datums
  - Use same datums as GD&T datum reference frame
  - Ensures direct tolerance transfer

Rule 3: Datum surfaces should be machined first
  - Raw cast/forged surfaces = poor repeatability
  - Machine datum faces in Op 1, then reference them

Rule 4: Minimize datum changes between operations
  - Each datum change adds stack-up error
  - Ideal: same 3-2-1 scheme for all operations

Rule 5: Datums should be accessible for probing
  - If using in-process probing, locating surfaces must be touchable
```

### Multi-Operation Datum Transfer
```
Op 10 (soft jaws, raw stock):
  → Machine datum faces A, B, C
  → Datum A = primary, B = secondary, C = tertiary

Op 20 (fixture on datum A/B/C):
  → Machine features referenced to A/B/C
  → Error = fixture repeatability only (~3-10 μm)

Op 30 (flip, fixture on machined features):
  → Error = Op 20 accuracy + Op 30 fixture repeatability
  → Stack-up grows with each re-fixture

Minimize operations = minimize error stack-up
```

## 4. LOCATING ELEMENT DESIGN

### Locating Pin Types
| Type | DOF Removed | Application |
|------|------------|-------------|
| Flat pad (button) | 1 translation | Primary plane support |
| Round pin (diamond) | 1 translation | Hole location, secondary |
| Round pin (full) | 2 translations | Primary hole location |
| V-block | 2 translations | Cylindrical parts |
| Cone/cup | 3 translations | Centering (lathe, rotary) |
| Edge nest | 1 translation | Against machined edge |

### Pin Sizing
```
Full round pin (locates hole):
  Pin diameter = Hole diameter - clearance
  Clearance: 0.005-0.015 mm for precision
  Clearance: 0.015-0.050 mm for general
  
Diamond pin (relieves over-constraint):
  Width across flats = Hole diameter - clearance
  Only constrains in 1 direction (perpendicular to slot line)
  Use with full round pin: Full pin locates X+Y, diamond locates rotation only

Pin-to-pin distance:
  Maximize for best angular repeatability
  Repeatability ≈ clearance × (measurement_distance / pin_distance)
```

### Repeatability Calculation
```
For 2-pin locating in a plate with 2 holes:

Positional repeatability:
  δ_pos = (d_hole - d_pin) / 2 = clearance / 2

Angular repeatability:
  θ = arctan(clearance / pin_distance)
  
At distance L from pin:
  δ_at_L = L × tan(θ) ≈ L × clearance / pin_distance

Example:
  Clearance: 0.010 mm
  Pin distance: 200 mm
  Feature at 100mm from nearest pin:
  δ = 100 × 0.010 / 200 = 0.005 mm = 5 μm
```

## 5. CLAMPING PRINCIPLES

### Clamping Rules
```
1. Clamp TOWARD locators (push part onto locating surfaces)
2. Clamp at supported points (avoid bending/distortion)
3. Apply clamping force at stiffest part of workpiece
4. Clamping force > cutting force with safety factor ≥ 2
5. Sequence: Locate first, then clamp (never reverse)
6. Clamp over solid support (not over pockets/thin walls)
```

### Clamping Sequence for 3-2-1
```
Step 1: Place part on primary locators (gravity seats it)
Step 2: Push part against secondary locators (by hand or pneumatic)
Step 3: Push part against tertiary locator
Step 4: Apply primary clamps (push toward primary plane)
Step 5: Apply secondary clamps (push toward secondary)
Step 6: Apply tertiary clamp (if needed)

VERIFY: Part seated on all locators before final tightening
Use feeler gauge at locating points — 0.02mm gauge should NOT pass
```

### Clamping Force Estimation
```
F_clamp ≥ SF × F_cutting / μ

Where:
  SF = safety factor (2.0 for manual clamp, 1.5 for hydraulic)
  F_cutting from prism_calc → cutting_force
  μ = friction coefficient:
    Steel on steel (dry): 0.15-0.20
    Steel on steel (oily): 0.08-0.12
    Serrated jaws: 0.25-0.40
    Rubber pad: 0.30-0.50

Example:
  Cutting force: 1000N tangential
  Friction: 0.15 (smooth fixture)
  SF: 2.0
  F_clamp = 2.0 × 1000 / 0.15 = 13,333 N ≈ 1.4 tons
```

## 6. FIXTURE ERROR BUDGET

### Error Sources
```
Total fixture error = √(e₁² + e₂² + e₃² + ... + eₙ²)  (RSS method)

Source                          Typical Error (μm)
Locating pin clearance          2-10
Locating surface flatness       2-5
Fixture body accuracy           3-10
Thermal expansion               2-15
Clamping distortion             1-10
Machine positioning             2-5
Probe/touch-off error           1-3
Tool deflection                 2-20
────────────────────────────────────
RSS Total (typical):            8-30 μm
```

### Error Budget Allocation
```
Total tolerance budget: T (from part print)
Allocate:
  Fixture: 20-30% of T
  Machine: 20-30% of T
  Tool: 15-25% of T
  Process variation: 15-25% of T
  Measurement: 5-10% of T

Example: ±0.025 mm tolerance (T = 50 μm total)
  Fixture budget: 10-15 μm
  Machine budget: 10-15 μm
  Tool budget: 8-12 μm
  Process: 8-12 μm
  Measurement: 3-5 μm
```

## 7. COMMON FIXTURING SCHEMES

### Prismatic Parts (Blocks, Plates)
```
Primary: 3 buttons on bottom face
Secondary: 2 buttons on long edge (or 2 pins in holes)
Tertiary: 1 button on short edge (or 1 pin)
Clamping: Top clamps pushing down, side clamps pushing to locators
```

### Cylindrical Parts
```
Method 1: V-block + end stop
  V-block constrains: 4 DOF (X, Y, Rx, Ry)
  End stop: 1 DOF (Z)
  Side stop or clamp: 1 DOF (Rz)

Method 2: Chuck (3-jaw or collet)
  Self-centering: 4 DOF (X, Y, Rx, Ry)
  Face stop: 1 DOF (Z)
  Key/flat: 1 DOF (Rz) — if needed

Method 3: Between centers (lathe)
  Centers: 4 DOF
  Face driver or dog: 1 DOF (Rz, torque)
  Axial spring load: 1 DOF (Z)
```

### Sheet/Thin Parts
```
Problem: Thin parts deflect under clamping and cutting forces

Solutions:
  - Vacuum fixture: Distributed force, no distortion
  - Adhesive/wax: Temporary bonding to sacrificial plate
  - Magnetic chuck: Ferrous thin parts
  - Support backing: Conforming supports behind thin features
  - Freeze fixturing: Ice or low-temp adhesive
  
Vacuum force: F = P × A
  P = 0.08 MPa (typical vacuum)
  A = part area (m²)
  Example: 200×300mm part → F = 0.08 × 0.06 = 4800N ≈ 490 kg
```

## 8. TROUBLESHOOTING & VERIFICATION

### Pre-Run Verification Checklist
```
□ Part seated on all primary locators (feeler gauge check)
□ Part against secondary locators (indicator sweep)
□ Clamps applied in correct sequence
□ Clamp force verified (torque wrench or pressure gauge)
□ No interference between clamps and tool paths
□ Clearance for chip evacuation
□ Coolant access to cutting zone
□ Probe touch-off on datum surfaces
```

### Common Problems
```
Part not repeatable:
  → Check pin clearance (worn pins → more clearance)
  → Check for chips on locating surfaces
  → Verify clamping sequence (must locate before clamp)
  → Check locating surface condition (burrs, damage)

Part distorts when clamped:
  → Reduce clamping force
  → Add support under clamping points
  → Use distributed clamping (more points, less force each)
  → Check for over-constraint

Dimensions shift between parts:
  → Thermal drift (measure fixture temperature)
  → Tool wear (progressive shift = tool compensation needed)
  → Chip buildup on locators (add air blast)
  → Hydraulic pressure variation (check accumulator)

Features out of position:
  → Check datum transfer error (probe datum surfaces)
  → Verify fixture qualification (CMM the fixture)
  → Check for under-constraint (part can rock)
```

*Single-purpose skill: Workpiece locating theory, fixture design, and datum strategy for CNC machining.*
