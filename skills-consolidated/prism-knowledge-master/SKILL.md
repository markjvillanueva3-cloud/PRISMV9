---
name: prism-knowledge-master
version: 1.0.0
description: |
  UNIFIED knowledge access reference for PRISM v9.0 development.
  Consolidates course lookups and quick references into one resource.
  
  Consolidates:
  - prism-knowledge-base (222 lines) - MIT/Stanford course lookups
  - prism-physics-reference (285 lines) - Quick reference tables
  - prism-derivation-helpers (65 lines) - DEPRECATED, merged here
  
  POINTS TO (comprehensive references - kept separate):
  - prism-material-physics (SP.3, 1238 lines) - Full physics formulas
  - prism-manufacturing-tables (1482 lines) - Comprehensive data tables
  
  MIT Foundation: 220+ courses mapped to PRISM development tasks
triggers:
  - "knowledge base"
  - "course"
  - "MIT"
  - "formula"
  - "quick reference"
  - "lookup"
---

# PRISM KNOWLEDGE MASTER
## Unified Knowledge Access Reference
### Version 1.0 | SP.7

---

## TABLE OF CONTENTS

1. [Skill Navigation](#1-skill-navigation)
2. [Course Lookup by Task](#2-course-lookup-by-task)
3. [Quick Reference Tables](#3-quick-reference-tables)
4. [Formula Quick Reference](#4-formula-quick-reference)
5. [File Locations](#5-file-locations)

---

# 1. SKILL NAVIGATION

## Where to Find What

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                         PRISM KNOWLEDGE NAVIGATION                                 ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                   ║
║  NEED PHYSICS FORMULAS?                                                           ║
║  └─▶ prism-material-physics (SP.3) - 68KB, 1238 lines                            ║
║      Kienzle, Johnson-Cook, Taylor, Stability, Thermal, Surface Finish            ║
║                                                                                   ║
║  NEED DATA TABLES?                                                                ║
║  └─▶ prism-manufacturing-tables - 141KB, 1482 lines                              ║
║      Material properties, tool recommendations, machine specs                      ║
║                                                                                   ║
║  NEED COURSE REFERENCE?                                                           ║
║  └─▶ This skill (prism-knowledge-master)                                          ║
║      Task → Course mapping, quick lookups                                          ║
║                                                                                   ║
║  NEED ALGORITHMS?                                                                 ║
║  └─▶ prism-code-master (SP.6) - Section 3                                         ║
║      Problem → Algorithm → PRISM Engine mapping                                    ║
║                                                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

# 2. COURSE LOOKUP BY TASK

## 2.1 Coding & Implementation

| Task | Courses | Key Concepts |
|------|---------|--------------|
| Clean code | 6.001, 6.005 | Abstraction, modularity, SOLID |
| Debugging | 6.005, 6.820 | Testing, assertions, invariants |
| Performance | 6.172, 6.046J | Profiling, complexity, caching |
| Concurrency | 6.005, 6.827 | Threads, locks, async |
| Error handling | 6.005, 6.033 | Exceptions, recovery |

## 2.2 System Design & Architecture

| Task | Courses | Key Concepts |
|------|---------|--------------|
| Module design | 6.033, 16.842 | Separation of concerns |
| API design | 6.005, 6.033 | Contracts, versioning |
| Database design | 6.830, 6.033 | Normalization, indexing |
| State management | 6.033, 6.005 | Immutability, events |
| Error recovery | 6.033, 6.858 | Checkpointing, logging |

## 2.3 Algorithms & Data Structures

| Task | Courses | Key Concepts |
|------|---------|--------------|
| Algorithm selection | 6.046J, 6.006 | Complexity, trade-offs |
| Data structures | 6.006, 6.851 | Trees, graphs, hash |
| Graph problems | 6.046J, 15.082J | Paths, flow, matching |
| Optimization | 6.251J, 15.060 | LP, nonlinear, metaheuristics |

## 2.4 AI & Machine Learning

| Task | Courses | Key Concepts |
|------|---------|--------------|
| Model selection | 6.867, 9.520 | Bias-variance, validation |
| Feature engineering | 6.867, 15.097 | Normalization, selection |
| Neural networks | 6.867, 9.520 | Architecture, training |
| Uncertainty | 6.041, 6.867 | Bayesian, confidence |
| Anomaly detection | 6.867, 6.041 | Outliers, one-class |

## 2.5 Manufacturing & Physics

| Task | Courses | Key Concepts |
|------|---------|--------------|
| Cutting mechanics | 2.810, 2.003 | Force models, chip formation |
| Thermal analysis | 2.51, 2.55 | Heat transfer, FEM |
| Vibration/dynamics | 2.032, 6.011 | Modal, stability |
| Tool life | 2.810, 6.867 | Taylor, wear models |
| Process planning | 2.810, 2.854 | Sequencing, optimization |
| Quality control | 2.830, 6.041 | SPC, hypothesis testing |

## 2.6 UI & User Experience

| Task | Courses | Key Concepts |
|------|---------|--------------|
| UI design | 16.400, 6.813 | Human factors, usability |
| Visualization | 6.837, 6.859 | Charts, 3D, interaction |
| Error messages | 6.005, 16.400 | Clarity, actionability |

---

# 3. QUICK REFERENCE TABLES

## 3.1 Material Coefficients (Summary)

| Material | Kc1.1 (N/mm²) | mc | n (Taylor) |
|----------|---------------|-----|------------|
| Low C Steel | 1400-1600 | 0.20-0.24 | 0.25-0.28 |
| Med C Steel | 1600-1900 | 0.22-0.28 | 0.23-0.26 |
| High C Steel | 1900-2300 | 0.25-0.32 | 0.20-0.24 |
| Alloy Steel | 1800-2400 | 0.24-0.30 | 0.22-0.26 |
| Stainless 304 | 2200-2600 | 0.25-0.30 | 0.20-0.24 |
| Gray Iron | 1100-1400 | 0.22-0.28 | 0.25-0.30 |
| Al 6061 | 700-900 | 0.15-0.20 | 0.30-0.40 |
| Ti-6Al-4V | 2100-2500 | 0.20-0.28 | 0.15-0.20 |
| Inconel 718 | 3500-4500 | 0.25-0.32 | 0.10-0.15 |

**Full data:** See prism-manufacturing-tables

## 3.2 Taylor Tool Life Constants

| Tool Type | n Range | C Range (steel) |
|-----------|---------|-----------------|
| HSS | 0.10-0.15 | 30-60 m/min |
| Carbide P20 | 0.20-0.28 | 200-350 m/min |
| Carbide P10 | 0.22-0.30 | 250-400 m/min |
| Coated Carbide | 0.25-0.32 | 300-500 m/min |
| Ceramic | 0.30-0.45 | 400-800 m/min |
| CBN | 0.35-0.50 | 100-300 m/min |

## 3.3 Specific Cutting Energy

| Material | u_s (J/mm³) |
|----------|-------------|
| Aluminum | 0.4-0.8 |
| Carbon Steel | 2.0-4.0 |
| Stainless | 3.0-5.0 |
| Titanium | 3.5-5.5 |
| Nickel Alloy | 4.0-6.0 |

## 3.4 Unit Conversions (Common)

| From | To | Factor |
|------|-----|--------|
| m/min | sfm | × 3.281 |
| mm/rev | ipr | × 0.03937 |
| mm | inch | × 0.03937 |
| N | lbf | × 0.2248 |
| MPa | ksi | × 0.1450 |
| kW | HP | × 1.341 |
| °C | °F | (×9/5)+32 |

**Full conversions:** See prism-code-master Section 6

---

# 4. FORMULA QUICK REFERENCE

## 4.1 Core Formulas (Summary)

### Kienzle Cutting Force
```
Fc = Kc1.1 × h^(1-mc) × b

Where:
  h = f × sin(κr)     [chip thickness]
  b = ap / sin(κr)    [width of cut]
```

### Taylor Tool Life
```
V × T^n = C
T = (C/V)^(1/n)
```

### Johnson-Cook Flow Stress
```
σ = [A + B×ε^n] × [1 + C×ln(ε̇*)] × [1 - T*^m]
```

### Surface Roughness (Turning)
```
Ra = f² / (32 × r)
```

### Cutting Power
```
P = Fc × V / 60000  [kW]
```

**Full derivations:** See prism-material-physics (SP.3)

## 4.2 Formula Decision Tree

```
What are you calculating?
├── Cutting Force → Kienzle (primary) or Merchant (orthogonal)
├── Tool Life → Taylor equation
├── Flow Stress → Johnson-Cook
├── Temperature → Empirical correlation
├── Surface Finish → Theoretical + corrections
├── Stability → Stability lobe analysis
└── Power → Force × Speed
```

---

# 5. FILE LOCATIONS

## 5.1 PRISM Skill Locations

```
CORE SKILLS (C:\_SKILLS\):
├── prism-material-physics\SKILL.md     ← Full physics formulas
├── prism-manufacturing-tables\SKILL.md ← Comprehensive data tables
├── prism-code-master\SKILL.md          ← Algorithms, patterns, units
├── prism-quality-master\SKILL.md       ← Quality gates, validation
└── prism-session-master\SKILL.md       ← Session management

ALWAYS-ON (/mnt/project/):
├── prism-life-safety-mindset          ← Safety principles
├── prism-maximum-completeness         ← Completeness requirements
├── prism-predictive-thinking          ← Anticipatory thinking
└── regression_skill_v2                ← Anti-regression
```

## 5.2 MIT Course Material

```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\MIT COURSES\
├── MIT COURSES 5\FULL FILES\    ← 90+ courses (MAIN)
│   ├── 6.001-spring-2005.zip    ← SICP
│   ├── 6.005-spring-2016.zip    ← Software Construction
│   ├── 6.033-spring-2018.zip    ← Computer Systems
│   ├── 6.046j-fall-2005.zip     ← Algorithms
│   ├── 6.867-fall-2006.zip      ← Machine Learning
│   ├── 2.810-fall-2015.zip      ← Manufacturing
│   └── [many more...]
└── UPLOADED\                    ← Additional courses
```

## 5.3 Reference Files

| File | Location | Contents |
|------|----------|----------|
| ALGORITHM_REGISTRY.json | MIT COURSES\ | 285 algorithms mapped |
| COURSE_INVENTORY.md | MIT COURSES\ | 220+ course inventory |
| MATERIALS_DATABASE | EXTRACTED\ | Material properties |
| MACHINES_DATABASE | EXTRACTED\ | Machine specifications |

---

# 6. ESSENTIAL COURSE CARDS

## 6.1 For Clean Code (6.005)
```
□ Write specs BEFORE implementation
□ Use immutable data when possible
□ Fail fast with clear error messages
□ Test at boundaries and edge cases
□ Document public interfaces
```

## 6.2 For Performance (6.046J)
```
□ Know your algorithm's complexity
□ Profile before optimizing
□ Consider space-time trade-offs
□ Cache expensive computations
□ Use appropriate data structures
```

## 6.3 For Systems (6.033)
```
□ Design for failure
□ Use modularity to limit damage
□ Log enough to debug
□ Consider end-to-end argument
□ Separate policy from mechanism
```

## 6.4 For ML Features (6.867)
```
□ Start simple, add complexity as needed
□ Validate on held-out data
□ Regularize to prevent overfitting
□ Quantify uncertainty
□ Monitor for distribution shift
```

## 6.5 For Manufacturing (2.810)
```
□ Use physics models for calculations
□ Validate with 6+ data sources
□ Include uncertainty bounds
□ Provide conservative fallbacks
□ Explain recommendations (XAI)
```

---

## SOURCE SKILLS CONSOLIDATED

| Skill | Lines | Status |
|-------|-------|--------|
| prism-knowledge-base | 222 | Consolidated |
| prism-physics-reference | 285 | Consolidated |
| prism-derivation-helpers | 65 | Deprecated → Merged |
| **Total Source** | **572** | |
| **Consolidated** | **~350** | **39% efficiency** |

**Kept Separate (Comprehensive References):**
- prism-material-physics (SP.3): 1,238 lines - Full physics
- prism-manufacturing-tables: 1,482 lines - Full data tables

---

## NAVIGATION SUMMARY

| Need | Go To |
|------|-------|
| Physics formulas | prism-material-physics (SP.3) |
| Data tables | prism-manufacturing-tables |
| Algorithms | prism-code-master Section 3 |
| Units | prism-code-master Section 6 |
| Course lookup | This skill Section 2 |
| Quick reference | This skill Section 3-4 |

---

**END OF PRISM KNOWLEDGE MASTER SKILL**
