---
name: prism-machine-dynamics
description: |
  Machine tool structural dynamics, stiffness measurement, and performance characterization.
  Frequency response functions, compliance mapping, spindle dynamics, and axis servo tuning.
  Static and dynamic stiffness evaluation for machining capability assessment.
  
  Functions: static_stiffness, dynamic_stiffness, frf_measure, compliance_map,
  spindle_receptance, natural_frequency, damping_ratio, modal_analysis,
  servo_bandwidth, machine_capability_check
  
  Academic Source: MIT 2.810, Tlusty machine dynamics, Altintas Manufacturing Automation
  Total: ~350 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "machine", "dynamics", "tool", "structural", "stiffness", "measurement", "performance"
- Task requires reference knowledge from this skill domain.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-machine-dynamics")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-machine-dynamics") to load this skill
   - prism_knowledge→search(query="relevant terms") for cross-reference

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about machine
→ Load skill: skill_content("prism-machine-dynamics") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires dynamics guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM MACHINE TOOL DYNAMICS
## Structural Stiffness, FRF Analysis & Performance Characterization

## 1. STATIC STIFFNESS

### Definition
Static stiffness k_s = F / δ (N/μm)
Force applied at tool tip, deflection measured at same point.

### Typical Machine Static Stiffness
| Machine Type | k_x (N/μm) | k_y (N/μm) | k_z (N/μm) |
|--------------|-----------|-----------|-----------|
| Small VMC (BT30) | 8-15 | 10-20 | 15-30 |
| Medium VMC (BT40) | 15-30 | 20-40 | 30-60 |
| Large VMC (BT50) | 25-50 | 30-60 | 50-100 |
| Horizontal MC | 30-60 | 40-80 | 40-80 |
| CNC lathe (small) | 15-25 | 20-35 | — |
| CNC lathe (large) | 30-60 | 40-80 | — |
| 5-axis (trunnion) | 10-25 | 15-30 | 20-40 |

### Stiffness Chain
Total system compliance = sum of individual compliances:
```
1/k_total = 1/k_spindle + 1/k_holder + 1/k_tool + 1/k_structure + 1/k_workholding

Typical contribution breakdown:
  Spindle bearings: 15-25%
  Tool holder interface: 20-35% (biggest variable!)
  Tool overhang: 10-40% (depends on L/D)
  Machine structure: 15-25%
  Workholding: 5-15%
```

### Tool Overhang Effect
```
Tool deflection: δ = F × L³ / (3 × E × I)

Where:
  L = overhang length (m)
  E = Young's modulus (carbide: 620 GPa, HSS: 210 GPa, steel: 200 GPa)
  I = moment of inertia = π × d⁴ / 64

Rule of thumb: Doubling overhang → 8× deflection
  L/D < 3: Stable for most operations
  L/D 3-5: Reduced DOC, watch for chatter
  L/D 5-7: Anti-vibration tooling recommended
  L/D > 7: Boring bars with tuned mass dampers
```

## 2. DYNAMIC STIFFNESS & FRF

### Frequency Response Function
The FRF H(ω) relates input force to output displacement across frequency:
```
H(ω) = X(ω) / F(ω) = 1 / (k - m×ω² + j×c×ω)

For single degree of freedom:
  |H(ω)| = 1 / √((k - m×ω²)² + (c×ω)²)
  
At resonance (ω = ω_n):
  |H(ω_n)| = 1 / (c × ω_n) = 1 / (2 × ζ × k)

Where:
  k = stiffness (N/m)
  m = effective mass (kg)
  c = damping coefficient (N·s/m)
  ζ = damping ratio (dimensionless, typically 0.02-0.05 for machine tools)
  ω_n = √(k/m) = natural frequency (rad/s)
  f_n = ω_n / (2π) (Hz)
```

### Dynamic Stiffness
```
k_dynamic = k_static × 2 × ζ

At resonance, dynamic stiffness is much lower than static:
  ζ = 0.02 → k_dyn = 4% of k_static
  ζ = 0.05 → k_dyn = 10% of k_static
  ζ = 0.10 → k_dyn = 20% of k_static

This is why chatter occurs at resonance even with stiff machines!
```

### Multiple Mode FRF
Real machine tools have multiple modes. The total FRF:
```
H(ω) = Σ [r_k / (ω_k² - ω² + j×2×ζ_k×ω_k×ω)]

Where r_k = modal residue for mode k
The most flexible mode (lowest k_dyn) typically limits stability.
```

## 3. SPINDLE DYNAMICS

### Spindle Natural Frequencies
| Spindle Type | Speed Range | 1st Natural Freq | Notes |
|--------------|-----------|------------------|-------|
| Direct drive | 0-12,000 RPM | 800-1500 Hz | Highest stiffness |
| Belt drive | 0-8,000 RPM | 400-800 Hz | Good damping from belt |
| Gear drive | 0-6,000 RPM | 300-600 Hz | Best torque, lower speed |
| High-speed | 15,000-40,000 RPM | 1500-3000 Hz | Ceramic bearings |
| Motorspindle | 10,000-24,000 RPM | 1000-2000 Hz | Integrated motor |

### Speed-Dependent Stiffness
Spindle stiffness changes with speed due to:
- Bearing preload variation (centrifugal force reduces preload)
- Thermal expansion (changes bearing geometry)
- Gyroscopic effects (at very high speeds)

```
Approximate bearing stiffness vs speed:
  k_bearing(n) ≈ k_0 × (1 - (n/n_max)² × C_cf)

Where:
  k_0 = static bearing stiffness
  n = spindle speed (RPM)
  n_max = maximum rated speed
  C_cf = centrifugal factor (0.1-0.3, bearing dependent)
```

### Spindle Runout Effect
- New spindle: <2 μm TIR at nose
- Acceptable: <5 μm TIR
- Needs service: >10 μm TIR
- Direct impact on surface finish: Ra ≈ runout/4 (finishing operations)

## 4. MACHINE STRUCTURE MODES

### Common Mode Shapes
| Mode | Frequency Range | Description | Impact |
|------|----------------|-------------|--------|
| Column bending | 30-80 Hz | Column rocks fore-aft | Y-axis accuracy |
| Table pitch | 40-100 Hz | Table tilts about X | Z-direction error |
| Spindle head nod | 50-120 Hz | Head nods in Y-Z plane | Wall straightness |
| Base torsion | 20-60 Hz | Base twists | Angular errors |
| Cross-slide | 60-150 Hz | Cross-slide bends | Tool position error |

### Structural Damping Sources
```
Total damping = Material + Joints + Bearing + External

Material damping (hysteretic):
  Cast iron: ζ = 0.002-0.005 (good, graphite flakes absorb energy)
  Steel weldment: ζ = 0.001-0.003 (poor)
  Polymer concrete: ζ = 0.010-0.030 (excellent)
  Natural granite: ζ = 0.005-0.010 (good)

Joint damping (dominant source, 60-80% of total):
  Bolted joints: ζ_contribution = 0.01-0.04
  Slideway contacts: ζ_contribution = 0.02-0.05
  
Bearing damping:
  Rolling element: ζ = 0.001-0.005
  Hydrostatic: ζ = 0.05-0.15 (excellent!)
```

## 5. AXIS SERVO DYNAMICS

### Servo Bandwidth
The servo loop bandwidth determines how well the axis tracks commanded positions:
```
Typical CNC axis bandwidths:
  Position loop: 30-100 Hz
  Velocity loop: 100-400 Hz
  Current loop: 1000-3000 Hz

Bandwidth affects:
  - Contouring accuracy at speed
  - Disturbance rejection (cutting forces)
  - Minimum achievable surface waviness
```

### Following Error
```
Following error = Feedrate / (2π × bandwidth)

Example: 5000 mm/min feed, 50 Hz bandwidth
  e = (5000/60) / (2π × 50) = 0.27 mm

For circular interpolation:
  Radial error ≈ V² / (R × (2π × BW)²)
  At high feed on small radius → significant!
```

### Axis Matching
For good circular interpolation:
- X and Y bandwidth must match within 5%
- Gain mismatch causes elliptical errors
- Phase mismatch causes orientation-dependent error
- Test with ballbar: circularity should be <5 μm

## 6. STIFFNESS MEASUREMENT METHODS

### Impact (Tap) Testing
```
Equipment: Modal hammer + accelerometer + FFT analyzer

Procedure:
  1. Mount accelerometer at tool tip (X, Y directions)
  2. Tap with instrumented hammer near accelerometer
  3. Record force (hammer) and response (accelerometer)
  4. Compute FRF: H(ω) = X(ω) / F(ω)
  5. Identify modes: peaks in |H(ω)| = resonances
  
Key parameters to extract:
  - Natural frequencies (peak locations)
  - Damping ratios (half-power bandwidth method)
  - Modal stiffness (inverse of peak magnitude × ω_n)
  
Hammer tips:
  Steel tip: excites 0-5000 Hz (machine structures)
  Plastic tip: excites 0-2000 Hz (softer response)
  Rubber tip: excites 0-500 Hz (low-frequency modes)
```

### Static Loading Test
```
Equipment: Force gauge/load cell + dial indicator/LVDT

Procedure:
  1. Apply known force at tool tip (via push/pull gauge)
  2. Measure deflection at same point
  3. k_static = F / δ
  4. Test in X, Y, Z independently
  5. Check for nonlinearity (test at 25%, 50%, 75%, 100% of cutting force)
```

## 7. MACHINE CAPABILITY ASSESSMENT

### Stiffness Adequacy Check
```
Required stiffness for target accuracy:

k_required = F_cutting / δ_allowable

Where:
  F_cutting from prism_calc→cutting_force
  δ_allowable = tolerance/4 (rule: deflection < 25% of tolerance)

Example:
  Cutting force: 500N
  Part tolerance: ±0.025mm (±25μm)
  δ_allowable: 6.25 μm
  k_required: 500/0.00625 = 80 N/μm

If machine k < k_required → reduce DOC, add supports, or change strategy
```

### Dynamic Capability Check
```
For chatter-free machining:
  Required dynamic stiffness > F_cutting / (0.5 × tolerance)
  
  k_dyn = k_static × 2 × ζ
  
  If k_dyn insufficient:
    1. Use stability lobe diagram to find stable pockets
    2. Reduce radial engagement (reduce force)
    3. Use variable-pitch cutters
    4. Add external damping
```

## 8. PRACTICAL DIAGNOSTIC PROCEDURES

### Quick Machine Health Check
```
1. Spindle runout: Mount test bar, indicate at 50mm and 150mm
   - Acceptable: <3μm at 50mm, <8μm at 150mm
   
2. Axis backlash: Approach from + and - directions, measure gap
   - Acceptable: <3μm (precision), <8μm (general)
   
3. Thermal stability: Run spindle 30 min, measure Z drift
   - Acceptable: <10μm/hr after warmup
   
4. Tap test: Check for unexpected low-frequency modes
   - All modes should be >200 Hz for small VMC
   
5. Ballbar test: Run 300mm radius at 1000 mm/min
   - Acceptable circularity: <5μm (precision), <15μm (general)
```

### When to Suspect Machine Problems
- Surface finish suddenly worse → check spindle bearings, runout
- Chatter at previously stable parameters → stiffness loss, bearing wear
- Dimensional drift during long runs → thermal issues
- Circular interpolation errors → servo tuning, backlash
- Unusual vibration/noise → bearing damage, loose bolts, foundation

*Single-purpose skill: Machine tool structural dynamics and performance characterization.*
