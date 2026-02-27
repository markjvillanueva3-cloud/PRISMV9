---
name: prism-expert-master
description: |
  Unified AI expert team reference. Consolidates 10 domain experts.
---

| Problem | Expert | Key Capabilities |
|---------|--------|------------------|
| Chatter, vibration, setup issues | **Master Machinist** | Troubleshooting, workholding |
| Toolpath strategy, operations | **CAM Programmer** | Strategy selection, sequencing |
| Material selection, properties | **Materials Scientist** | Metallurgy, heat treatment |
| G-code, controller syntax | **Post Processor** | Code generation, verification |
| Stress, deflection, forces | **Mechanical Engineer** | FEA concepts, stiffness |
| SPC, Cp/Cpk, inspection | **Quality Control** | Process capability, FAI |
| Temperature, thermal expansion | **Thermodynamics** | Heat transfer, coolant |
| Numerical methods, optimization | **Mathematics** | Algorithms, curve fitting |

## Quick Decision Tree

```
What's the problem?
├── Shop floor issue? → MASTER MACHINIST
├── Programming/toolpath? → CAM PROGRAMMER  
├── Material choice/properties? → MATERIALS SCIENTIST
├── G-code/controller? → POST PROCESSOR
├── Stress/deflection? → MECHANICAL ENGINEER
├── Quality/inspection? → QUALITY CONTROL
├── Heat/temperature? → THERMODYNAMICS
└── Math/computation? → MATHEMATICS
```

# 3. CAM PROGRAMMER
## Senior CAM Programming Expert

### Roughing Strategies

| Strategy | Use Case | Stepover |
|----------|----------|----------|
| Adaptive | HSM, aluminum, deep | 40% D |
| Pocketing | Standard pockets | 40% D |
| Facing | Face mill, cleanup | 60-70% D |

### Finishing Strategies

| Strategy | Use Case | Stepover |
|----------|----------|----------|
| Contour | Walls, profiles | 10% D |
| Pencil | Corner cleanup | 5-10% D |
| Parallel | Flat areas | 10% D |
| Scallop | 3D surfaces | By scallop height |

### Operation Sequence

```
1. FACING     → Face mill (priority 1)
2. ROUGHING   → Adaptive (aluminum) or Pocket
3. DRILLING   → Peck for deep holes (>3xD)
4. SEMI-FINISH → Parallel or contour
5. FINISHING  → Final passes
```

### Cutting Parameters (Quick)

| Material | SFM | FPT | DOC Factor |
|----------|-----|-----|------------|
| Aluminum | 800 | 0.10 | 0.5×D |
| Steel | 300 | 0.05 | 0.3×D |
| Stainless | 150 | 0.03 | 0.2×D |
| Titanium | 100 | 0.02 | 0.15×D |

# 5. POST PROCESSOR SPECIALIST
## G-code & Controller Expertise

### Fanuc/Haas Safe Start

```gcode
%
O0001 (PRISM GENERATED)
G90 G94 G17
G53 G0 Z0
T1 M6
G54 G0 X0 Y0
S3000 M3
G43 H1 Z25
M8
```

### Siemens Safe Start

```gcode
; PRISM GENERATED
G90 G94 G17
T1 D1
M6
G54 G0 X0 Y0
S3000 M3
```

### Essential G-Codes

| Code | Function |
|------|----------|
| G00 | Rapid movement |
| G01 | Linear feed |
| G02/G03 | Arc CW/CCW |
| G17/18/19 | Plane XY/XZ/YZ |
| G40/41/42 | Comp off/left/right |
| G43/G49 | Tool length on/off |
| G54-G59 | Work offsets |
| G90/G91 | Absolute/Incremental |

### Controller Comparison

| Controller | Comment | Program ID |
|------------|---------|------------|
| Fanuc/Haas | (text) | O0001 |
| Siemens | ; text | ; name |
| Heidenhain | ; text | BEGIN PGM |

### G-Code Verification Checks

1. **Unsafe rapid?** G0 to negative Z without G53
2. **Missing tool call?** Cutting before T# M6
3. **Missing spindle?** Cutting before M3/M4

# 7. QUALITY CONTROL
## SPC & Inspection Expert

### Process Capability (Cpk)

| Cpk | Rating | Action |
|-----|--------|--------|
| ≥ 1.67 | Excellent | Maintain |
| ≥ 1.33 | Acceptable | Monitor |
| ≥ 1.00 | Marginal | Improve |
| < 1.00 | Not Capable | **STOP** |

### Cpk Calculation

```javascript
Cp = (USL - LSL) / (6 × σ)
Cpk = min((USL - μ)/(3σ), (μ - LSL)/(3σ))
```

### Inspection Method Selection

| Tolerance | Method | Accuracy |
|-----------|--------|----------|
| < 0.001 mm | CMM | 0.001 mm |
| < 0.01 mm | Micrometer | 0.001 mm |
| < 0.1 mm | Caliper | 0.01 mm |
| Go/No-go | Gauge | Per gauge |

### FAI Checklist

```
□ Part number verified
□ All dimensions measured
□ Surface finish checked
□ Material cert reviewed
□ Visual inspection pass
□ Documentation complete
```

# 9. MATHEMATICS EXPERT
## Numerical Methods & Computation

### Key Formulas

**Determinant (2×2):**
```
det = a×d - b×c
```

**Linear Regression:**
```
slope = (n×Σxy - Σx×Σy) / (n×Σx² - (Σx)²)
intercept = (Σy - slope×Σx) / n
R² = 1 - SS_res/SS_tot
```

**Simpson's Integration:**
```
∫f(x)dx ≈ (h/3)[f(a) + 4×f(a+h) + 2×f(a+2h) + ... + f(b)]
```

**Gradient Descent:**
```
x_new = x_old - lr × gradient(x_old)
```

### When to Use

| Problem | Method |
|---------|--------|
| Solve linear system | Gaussian elimination |
| Fit data to curve | Linear regression |
| Find area under curve | Simpson's rule |
| Optimize function | Gradient descent |
| Find eigenvalues | Power iteration |

## SOURCE SKILLS CONSOLIDATED

| Expert Skill | Lines | Key Content |
|--------------|-------|-------------|
| prism-expert-master-machinist | 256 | Troubleshooting, workholding |
| prism-expert-cam-programmer | 172 | Strategies, sequencing |
| prism-expert-materials-scientist | 326 | Metallurgy, selection |
| prism-expert-post-processor | 295 | G-code, controllers |
| prism-expert-cad-expert | 179 | Feature recognition |
| prism-expert-mechanical-engineer | 148 | Stress, deflection |
| prism-expert-quality-control | 184 | SPC, Cpk |
| prism-expert-thermodynamics | 192 | Heat transfer |
| prism-expert-mathematics | 204 | Numerical methods |
| prism-expert-quality-manager | 170 | Process management |
| **Total Source** | **2,126** | |
| **Consolidated** | **~800** | **62% efficiency** |

**END OF PRISM EXPERT MASTER SKILL**
