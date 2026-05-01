---
name: prism-manufacturing-algorithms
description: |
  Manufacturing physics algorithm selection, engine mappings, and dependency graph
  for PRISM MCP server development. Maps problems to correct physics engines.
  Extracted from: code-master (algorithm selection + dependency graph).
  Generic SE content removed (covered natively by Claude Code).
version: 2.0.0
triggers:
  - "algorithm"
  - "which engine"
  - "kienzle"
  - "taylor"
  - "johnson-cook"
  - "stability"
  - "dependency"
  - "engine mapping"
---

# PRISM Manufacturing Algorithms
## Physics Engine Selection & Dependency Mapping

---

## 1. Manufacturing Physics → Engine Mapping

### Cutting Force Calculation
| Model | Formula | Engine | When to Use |
|-------|---------|--------|-------------|
| **Kienzle** | Fc = kc1.1 × h^(1-mc) × b | ManufacturingCalculations.ts | Primary — all 6 ISO groups |
| **Merchant** | Fc = τ × As / cos(φ-α) | — | Academic reference only |
| **Specific energy** | Fc = kc × MRR | — | Quick estimation |

### Tool Life Prediction
| Model | Formula | Engine | When to Use |
|-------|---------|--------|-------------|
| **Taylor** | VT^n = C | ManufacturingCalculations.ts | Primary — calibrated per material |
| **Extended Taylor** | V × T^n × f^a × d^b = C | — | When feed/depth vary |

### Thermal Effects
| Model | Formula | Engine | When to Use |
|-------|---------|--------|-------------|
| **Johnson-Cook** | σ = (A + Bε^n)(1 + C ln ε̇)(1 - T*^m) | AdvancedCalculations.ts | Flow stress under cutting conditions |
| **Fourier/FEM** | Heat distribution | — | Detailed thermal analysis |

### Stability / Chatter
| Model | Formula | Engine | When to Use |
|-------|---------|--------|-------------|
| **Altintas** | a_lim = -1 / (2 × Ks × Re[G]) | AdvancedCalculations.ts | Primary — stability lobe diagram |
| **Re[G] corrected** | Re[G] = -1/(2kζ√(1-ζ²)) | AdvancedCalculations.ts | R2-fixed formula (Altintas Eq 3.13-3.16) |

### Surface Finish
| Model | Formula | Engine | When to Use |
|-------|---------|--------|-------------|
| **Geometric Ra** | Ra = f²/(32×r) | ManufacturingCalculations.ts | Theoretical minimum |
| **Process-dependent Rz** | Rz = f(operation, feed, nose_r) | ManufacturingCalculations.ts | R2-calibrated lookup |

---

## 2. Problem → Algorithm Decision Tree

```
Manufacturing problem?
├── Forces/Power → Kienzle (ManufacturingCalculations.ts)
│   ├── cutting_force → kienzleForce(kc1_1, mc, h, b)
│   ├── power → Fc × Vc / (60000 × η)
│   └── torque → Fc × D / (2 × 1000)
│
├── Tool Life → Taylor (ManufacturingCalculations.ts)
│   ├── tool_life → T = (C/V)^(1/n)
│   └── cost_optimize → minimize(Ct + Cm × T)
│
├── Vibration → Stability (AdvancedCalculations.ts)
│   ├── stability → a_lim from Re[G] and Ks
│   └── deflection → F × L³ / (3 × E × I)
│
├── Thermal → Johnson-Cook (AdvancedCalculations.ts)
│   ├── flow_stress → J-C model
│   └── thermal → heat generation + conduction
│
├── Toolpath → ToolpathCalculations.ts
│   ├── trochoidal → ae_eff, chip_thinning
│   ├── hsm → high-speed milling params
│   ├── scallop → scallop height from stepover
│   ├── multi_pass → depth distribution
│   ├── coolant_strategy → flow/pressure/type
│   └── gcode_snippet → G-code output
│
└── Composite → IntelligenceEngine.ts (R3)
    ├── job_plan → material + speed_feed + force + stability + life
    ├── what_if → current + delta + re-run engines + diff
    ├── quality_predict → surface_finish + deflection + thermal
    └── ... (11 intelligence actions total)
```

---

## 3. Engine File Map

| Engine File | Functions | Dispatcher |
|-------------|-----------|------------|
| `src/engines/ManufacturingCalculations.ts` | Kienzle, Taylor, MRR, surface_finish, power, torque, chip_load | calcDispatcher (25 actions) |
| `src/engines/AdvancedCalculations.ts` | Stability, deflection, thermal, cost_optimize, flow_stress | calcDispatcher |
| `src/engines/ToolpathCalculations.ts` | Trochoidal, HSM, scallop, chip_thinning, multi_pass, coolant, G-code | calcDispatcher |
| `src/engines/IntelligenceEngine.ts` | 11 composed intelligence actions | calcDispatcher (R3) |

---

## 4. Registry Dependency Graph

```
PRISM_MATERIALS_MASTER (127 params per material)
├── → ManufacturingCalculations (kc1_1, mc, C, n, hardness)
├── → AdvancedCalculations (E, ζ, ρ, conductivity)
├── → ToolpathCalculations (machinability, chip_type)
└── → IntelligenceEngine (all params — R3)

PRISM_MACHINES_DATABASE
├── → ManufacturingCalculations (rpm_max, power)
├── → AdvancedCalculations (spindle_stiffness)
└── → IntelligenceEngine (capabilities, envelope — R3)

PRISM_TOOLS_DATABASE
├── → ManufacturingCalculations (diameter, flutes, geometry)
├── → AdvancedCalculations (material, length for deflection)
└── → IntelligenceEngine (wear_characteristics — R3)
```

---

## 5. Calibration Constants (R2-Verified)

### Kienzle kc1.1 / mc by ISO Group
| ISO | Example Material | kc1.1 (N/mm²) | mc |
|-----|-----------------|----------------|-----|
| P | AISI 4140 | 1800 | 0.25 |
| M | AISI 316L | 2100 | 0.26 |
| K | GG25 | 1100 | 0.24 |
| N | 6061-T6 | 700 | 0.23 |
| S | Inconel 718 | 2800 | 0.28 |
| H | AISI D2 60HRC | 7580 | 0.22 |

### Taylor C/n by ISO Group
| ISO | n | C (m/min) |
|-----|---|-----------|
| P | 0.25 | 400 |
| M | 0.20 | 250 |
| K | 0.25 | 350 |
| N | 0.40 | 1200 |
| S | 0.15 | 120 |
| H | 0.10 | 80 |

---

## Source Skills Consolidated

| Original Skill | Lines | Retained Content |
|----------------|-------|-----------------|
| prism-code-master | 628 | Algorithm selection, dependency graph, engine mapping |
| **This skill** | **~250** | **60% reduction** |

---

*Consolidated: 2026-02-21 | Per SKILL_AUDIT.md R2-MS5 recommendations*
