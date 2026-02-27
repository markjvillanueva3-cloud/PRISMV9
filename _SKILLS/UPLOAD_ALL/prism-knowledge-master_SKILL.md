---
name: prism-knowledge-master
description: |
  Unified knowledge access. MIT/Stanford course integration.
---

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

**END OF PRISM KNOWLEDGE MASTER SKILL**
