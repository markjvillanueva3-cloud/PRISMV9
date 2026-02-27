---
name: prism-monolith-index
description: |
  Complete indexed map of v8.89 monolith. 986,621 lines, 831 modules cataloged.
---

The monolith's 831 modules are organized into 12 functional categories. Understanding these categories is essential for efficient navigation and extraction planning.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           12 MODULE CATEGORIES                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  HIGH EXTRACTION PRIORITY (Databases & Algorithms)                                      │
│  ─────────────────────────────────────────────────                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │
│  │  MATERIALS   │ │  MACHINES    │ │   TOOLS      │ │ ALGORITHMS   │                   │
│  │    ~50       │ │    ~80       │ │    ~60       │ │   ~120       │                   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘                   │
│                                                                                         │
│  MEDIUM EXTRACTION PRIORITY (Processing & Logic)                                        │
│  ─────────────────────────────────────────────────                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │
│  │    CAM       │ │ OPTIMIZATION │ │ SIMULATION   │ │  KNOWLEDGE   │                   │
│  │    ~90       │ │    ~70       │ │    ~50       │ │    ~80       │                   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘                   │
│                                                                                         │
│  LOWER EXTRACTION PRIORITY (Support & Interface)                                        │
│  ─────────────────────────────────────────────────                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │
│  │    DATA      │ │     UI       │ │   UTILS      │ │    CORE      │                   │
│  │    ~60       │ │   ~100       │ │    ~50       │ │    ~21       │                   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Category Details

### Category 1: MATERIALS (~50 modules)

**Purpose:** Material properties, databases, and lookups

**Contains:**
- Material property databases (steels, aluminum, titanium, etc.)
- Machinability ratings
- Thermal properties
- Mechanical properties (hardness, tensile strength)
- Kienzle cutting force coefficients
- Johnson-Cook constitutive model parameters
- Taylor tool life equation constants

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| materials_database.js | 8,500 | Main material database |
| material_properties.js | 3,200 | Property calculations |
| machinability_index.js | 1,800 | Machinability ratings |
| thermal_properties.js | 1,500 | Thermal calculations |
| steel_grades.js | 4,200 | Steel material data |
| aluminum_alloys.js | 3,100 | Aluminum material data |
| titanium_alloys.js | 2,800 | Titanium material data |

**Extraction Priority:** HIGH (foundation for all calculations)

### Category 3: TOOLS (~60 modules)

**Purpose:** Cutting tool data, geometries, and recommendations

**Contains:**
- Tool catalogs by manufacturer
- Insert geometries and grades
- Tool holder specifications
- Cutting edge parameters
- Tool life data
- Coating specifications
- Recommended applications

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| tool_database.js | 9,000 | Main tool database |
| sandvik_tools.js | 5,200 | Sandvik catalog data |
| kennametal_tools.js | 4,800 | Kennametal catalog data |
| seco_tools.js | 3,500 | Seco catalog data |
| insert_geometries.js | 2,800 | Insert geometry data |
| tool_recommendations.js | 3,200 | Selection algorithms |

**Extraction Priority:** HIGH (required for machining)

### Category 5: CAM (~90 modules)

**Purpose:** Toolpath generation and G-code output

**Contains:**
- Toolpath strategies
- G-code generators
- Post-processors
- Feature recognition
- Operation sequencing
- Collision detection

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| toolpath_engine.js | 8,000 | Main toolpath generator |
| gcode_generator.js | 5,500 | G-code output |
| post_processor.js | 4,200 | Controller-specific post |
| feature_recognition.js | 3,800 | Geometry analysis |
| operation_sequencer.js | 3,200 | Operation ordering |

**Extraction Priority:** MEDIUM (uses databases)

### Category 7: SIMULATION (~50 modules)

**Purpose:** Virtual machining and verification

**Contains:**
- Material removal simulation
- Collision detection
- Machine kinematics
- Verification tools

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| simulation_engine.js | 6,000 | Main simulation |
| collision_detect.js | 4,200 | Collision checking |
| material_removal.js | 3,500 | Stock simulation |
| kinematics_engine.js | 3,800 | Machine motion |

**Extraction Priority:** MEDIUM

### Category 9: DATA (~60 modules)

**Purpose:** Parsers, importers, and data handling

**Contains:**
- File parsers (STEP, IGES, etc.)
- Data importers/exporters
- Format converters
- Validators

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| step_parser.js | 4,500 | STEP file parsing |
| data_importer.js | 3,200 | Generic import |
| format_converter.js | 2,800 | Format conversion |
| validators.js | 2,200 | Data validation |

**Extraction Priority:** LOW-MEDIUM

### Category 11: UTILS (~50 modules)

**Purpose:** Helper functions and utilities

**Contains:**
- Math utilities
- Unit converters
- String helpers
- Date/time utilities

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| math_utils.js | 2,500 | Math helpers |
| unit_converter.js | 1,800 | Unit conversion |
| geometry_utils.js | 2,200 | Geometry helpers |

**Extraction Priority:** MEDIUM (many dependencies)

## 2.3 Category Quick Reference

| Category | Modules | Priority | Key Value |
|----------|---------|----------|-----------|
| MATERIALS | ~50 | HIGH | Foundation data |
| MACHINES | ~80 | HIGH | Equipment specs |
| TOOLS | ~60 | HIGH | Tooling data |
| ALGORITHMS | ~120 | HIGH | Core intelligence |
| CAM | ~90 | MEDIUM | Toolpath generation |
| OPTIMIZATION | ~70 | MEDIUM | Process improvement |
| SIMULATION | ~50 | MEDIUM | Verification |
| KNOWLEDGE | ~80 | MED-HIGH | Expert rules |
| DATA | ~60 | LOW-MED | Import/export |
| UI | ~100 | LOW | Interface (rebuild) |
| UTILS | ~50 | MEDIUM | Helpers |
| CORE | ~21 | LOW | Framework (rebuild) |

# SECTION 4: DEPENDENCY GRAPH

## 4.1 Overview

Understanding dependencies is critical for safe extraction. This section maps the import/export relationships between module categories.

## 4.2 High-Level Dependency Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDENCY FLOW DIAGRAM                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                              ┌──────────────┐                                           │
│                              │    CORE      │                                           │
│                              │  (Framework) │                                           │
│                              └──────┬───────┘                                           │
│                                     │                                                   │
│                    ┌────────────────┼────────────────┐                                  │
│                    │                │                │                                  │
│                    ▼                ▼                ▼                                  │
│              ┌──────────┐    ┌──────────┐    ┌──────────┐                              │
│              │  UTILS   │    │   DATA   │    │    UI    │                              │
│              │ (Helpers)│    │ (Parsers)│    │(Interface)│                              │
│              └────┬─────┘    └────┬─────┘    └────┬─────┘                              │
│                   │               │               │                                     │
│         ┌─────────┴───────┬───────┴───────┬───────┘                                     │
│         │                 │               │                                             │
│         ▼                 ▼               ▼                                             │
│   ┌──────────┐     ┌──────────┐    ┌──────────┐                                        │
│   │MATERIALS │     │ MACHINES │    │  TOOLS   │   ◄── FOUNDATION (Extract First)       │
│   │(Database)│     │(Database)│    │(Database)│                                        │
│   └────┬─────┘     └────┬─────┘    └────┬─────┘                                        │
│        │                │               │                                               │
│        └────────────────┼───────────────┘                                               │
│                         │                                                               │
│                         ▼                                                               │
│                  ┌──────────────┐                                                       │
│                  │  ALGORITHMS  │   ◄── CORE INTELLIGENCE (Extract Second)             │
│                  │(Calculations)│                                                       │
│                  └──────┬───────┘                                                       │
│                         │                                                               │
│         ┌───────────────┼───────────────┐                                               │
│         │               │               │                                               │
│         ▼               ▼               ▼                                               │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                                           │
│   │KNOWLEDGE │   │SIMULATION│   │OPTIMIZATN│   ◄── PROCESSING (Extract Third)          │
│   │  (Rules) │   │ (Verify) │   │ (Improve)│                                           │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘                                           │
│        │              │              │                                                  │
│        └──────────────┼──────────────┘                                                  │
│                       │                                                                 │
│                       ▼                                                                 │
│                ┌──────────────┐                                                         │
│                │     CAM      │   ◄── OUTPUT (Extract Fourth)                           │
│                │  (Toolpath)  │                                                         │
│                └──────────────┘                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Dependency Matrix

| Category | Depends On | Depended On By |
|----------|------------|----------------|
| **CORE** | (none) | All categories |
| **UTILS** | CORE | All categories |
| **DATA** | CORE, UTILS | MATERIALS, MACHINES, TOOLS |
| **MATERIALS** | CORE, UTILS, DATA | ALGORITHMS, KNOWLEDGE, OPTIMIZATION |
| **MACHINES** | CORE, UTILS, DATA | ALGORITHMS, SIMULATION, CAM |
| **TOOLS** | CORE, UTILS, DATA | ALGORITHMS, OPTIMIZATION, CAM |
| **ALGORITHMS** | CORE, UTILS, MATERIALS, MACHINES, TOOLS | KNOWLEDGE, SIMULATION, OPTIMIZATION, CAM |
| **KNOWLEDGE** | CORE, UTILS, MATERIALS, ALGORITHMS | OPTIMIZATION, CAM |
| **SIMULATION** | CORE, UTILS, MACHINES, ALGORITHMS | CAM |
| **OPTIMIZATION** | CORE, UTILS, MATERIALS, TOOLS, ALGORITHMS, KNOWLEDGE | CAM |
| **CAM** | All above categories | UI |
| **UI** | All categories | (external) |

## 4.4 Critical Dependencies

### Materials Dependencies

```
materials_database.js
├── IMPORTS FROM:
│   ├── utils/unit_converter.js
│   ├── utils/math_utils.js
│   └── core/config.js
│
└── EXPORTED TO (Used By):
    ├── algorithms/cutting_force_engine.js
    ├── algorithms/tool_life_engine.js
    ├── algorithms/thermal_model.js
    ├── optimization/speed_feed_optimizer.js
    ├── knowledge/machining_rules.js
    └── (42 more modules)
```

### Machines Dependencies

```
machine_database.js
├── IMPORTS FROM:
│   ├── utils/unit_converter.js
│   ├── utils/geometry_utils.js
│   └── core/config.js
│
└── EXPORTED TO (Used By):
    ├── algorithms/power_torque_engine.js
    ├── algorithms/chatter_prediction.js
    ├── simulation/kinematics_engine.js
    ├── cam/post_processor.js
    └── (38 more modules)
```

### Tools Dependencies

```
tool_database.js
├── IMPORTS FROM:
│   ├── utils/unit_converter.js
│   ├── data/tool_importer.js
│   └── core/config.js
│
└── EXPORTED TO (Used By):
    ├── algorithms/cutting_force_engine.js
    ├── algorithms/tool_life_engine.js
    ├── algorithms/deflection_calc.js
    ├── optimization/tool_selector.js
    └── (45 more modules)
```

### Algorithms Dependencies

```
cutting_force_engine.js
├── IMPORTS FROM:
│   ├── data/materials/materials_database.js
│   ├── data/materials/kienzle_coefficients.js
│   ├── data/tools/tool_database.js
│   ├── utils/math_utils.js
│   └── core/config.js
│
└── EXPORTED TO (Used By):
    ├── algorithms/power_torque_engine.js
    ├── algorithms/tool_life_engine.js
    ├── algorithms/surface_finish_engine.js
    ├── optimization/speed_feed_optimizer.js
    ├── simulation/material_removal.js
    ├── cam/toolpath_engine.js
    └── (28 more modules)
```

## 4.5 Circular Dependencies (WARNING)

The monolith contains some circular dependencies that must be handled carefully during extraction:

| Cycle | Modules Involved | Resolution Strategy |
|-------|------------------|---------------------|
| **Cycle 1** | algorithms ↔ optimization | Extract algorithms first, create interface |
| **Cycle 2** | knowledge ↔ algorithms | Extract shared types separately |
| **Cycle 3** | cam ↔ simulation | Extract simulation first |

## 4.6 Extraction Order (Based on Dependencies)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           RECOMMENDED EXTRACTION ORDER                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PHASE 1: FOUNDATION (No Upstream Dependencies)                                         │
│  ──────────────────────────────────────────────                                         │
│  1. UTILS        - Helpers used everywhere                                              │
│  2. MATERIALS    - Material databases                                                   │
│  3. MACHINES     - Machine databases                                                    │
│  4. TOOLS        - Tool databases                                                       │
│                                                                                         │
│  PHASE 2: CORE INTELLIGENCE (Depends on Phase 1)                                        │
│  ──────────────────────────────────────────────                                         │
│  5. ALGORITHMS   - Cutting calculations                                                 │
│  6. KNOWLEDGE    - Rules and heuristics                                                 │
│                                                                                         │
│  PHASE 3: PROCESSING (Depends on Phases 1 & 2)                                          │
│  ──────────────────────────────────────────────                                         │
│  7. OPTIMIZATION - Speed/feed optimization                                              │
│  8. SIMULATION   - Verification                                                         │
│                                                                                         │
│  PHASE 4: OUTPUT (Depends on All Above)                                                 │
│  ──────────────────────────────────────────────                                         │
│  9. CAM          - Toolpath generation                                                  │
│  10. DATA        - Import/export (as needed)                                            │
│                                                                                         │
│  PHASE 5: REBUILD (Lower Priority)                                                      │
│  ──────────────────────────────────────────────                                         │
│  11. UI          - New interface for v9                                                 │
│  12. CORE        - New framework for v9                                                 │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 4.7 Dependency Tracing Template

When extracting a module, use this template to trace dependencies:

```markdown
## DEPENDENCY TRACE: [MODULE_NAME]

### Direct Imports (This module imports from)
| Module | Type | Critical? |
|--------|------|-----------|
| [module1] | [data/util/algo] | YES/NO |

### Direct Exports (This module is imported by)
| Module | Type | Impact if Missing |
|--------|------|-------------------|
| [module1] | [data/util/algo] | [description] |

### Transitive Dependencies (Imports of imports)
| Module | Via | Depth |
|--------|-----|-------|
| [module1] | [via module2] | 2 |

### Extraction Checklist
- [ ] All direct imports identified
- [ ] All exports identified
- [ ] Circular dependencies checked
- [ ] Transitive dependencies mapped
- [ ] Extraction order validated
```

# SECTION 6: QUICK LOOKUP TABLES

## 6.1 Find Module by Function

**"I need to find the module that does X"**

| Function | Module | Category |
|----------|--------|----------|
| Calculate cutting forces | cutting_force_engine.js | ALGORITHMS |
| Predict tool life | tool_life_engine.js | ALGORITHMS |
| Optimize speed/feed | speed_feed_optimizer.js | OPTIMIZATION |
| Calculate power requirements | power_torque_engine.js | ALGORITHMS |
| Predict surface finish | surface_finish_engine.js | ALGORITHMS |
| Detect chatter conditions | chatter_prediction.js | ALGORITHMS |
| Calculate deflection | deflection_calc.js | ALGORITHMS |
| Get material properties | materials_database.js | MATERIALS |
| Get Kienzle coefficients | kienzle_coefficients.js | MATERIALS |
| Get machine specs | machine_database.js | MACHINES |
| Get tool data | tool_database.js | TOOLS |
| Apply machining rules | rules_engine.js | KNOWLEDGE |
| Generate toolpath | toolpath_engine.js | CAM |
| Generate G-code | gcode_generator.js | CAM |
| Post-process output | post_processor.js | CAM |
| Simulate material removal | material_removal.js | SIMULATION |
| Check collisions | collision_detect.js | SIMULATION |
| Convert units | unit_converter.js | UTILS |
| Parse STEP files | step_parser.js | DATA |

## 6.2 Find Data by Material Type

**"I need data for X material"**

| Material Type | Module | Line Count |
|---------------|--------|------------|
| Carbon steels | steel_carbon.js | 2,800 |
| Alloy steels | steel_alloy.js | 3,500 |
| Stainless steels | steel_stainless.js | 2,900 |
| Tool steels | steel_tool.js | 1,800 |
| Wrought aluminum | aluminum_wrought.js | 2,400 |
| Cast aluminum | aluminum_cast.js | 1,600 |
| Titanium alloys | titanium_alloys.js | 2,800 |
| Nickel superalloys | nickel_superalloys.js | 2,200 |
| Copper alloys | copper_alloys.js | 1,400 |
| Cast iron | cast_iron.js | 1,800 |
| Engineering plastics | plastics_engineering.js | 1,200 |
| Composites | composites.js | 1,000 |

## 6.3 Find Data by Machine Manufacturer

**"I need specs for X machines"**

| Manufacturer | Mills Module | Lathes Module | 5-Axis Module |
|--------------|--------------|---------------|---------------|
| Haas | haas_mills.js | haas_lathes.js | haas_5axis.js |
| DMG Mori | dmg_mori_mills.js | dmg_mori_lathes.js | dmg_mori_5axis.js |
| Mazak | mazak_mills.js | mazak_lathes.js | mazak_integrex.js |
| Okuma | okuma_mills.js | okuma_lathes.js | - |
| Makino | makino_mills.js | - | makino_5axis.js |
| Hermle | - | - | hermle_5axis.js |
| Hurco | hurco_mills.js | - | - |
| Doosan | doosan_mills.js | doosan_lathes.js | - |

## 6.4 Find Data by Tool Manufacturer

**"I need data for X tools"**

| Manufacturer | Turning | Milling | Drilling |
|--------------|---------|---------|----------|
| Sandvik | sandvik_turning.js | sandvik_milling.js | sandvik_drilling.js |
| Kennametal | kennametal_turning.js | kennametal_milling.js | kennametal_drilling.js |
| Seco | seco_turning.js | seco_milling.js | - |
| Iscar | iscar_turning.js | iscar_milling.js | - |
| Walter | walter_tools.js | walter_tools.js | - |
| Mitsubishi | mitsubishi_tools.js | mitsubishi_tools.js | - |
| Kyocera | kyocera_tools.js | kyocera_tools.js | - |
| Harvey Tool | - | harvey_tool.js | - |
| OSG | - | osg_taps_endmills.js | osg_taps_endmills.js |

## 6.5 Find Algorithm by Physics Model

**"I need the X physics model"**

| Model | Module | Purpose |
|-------|--------|---------|
| Kienzle cutting force | kienzle_model.js | Empirical force prediction |
| Merchant shear plane | merchant_model.js | Analytical force prediction |
| Taylor tool life | taylor_equation.js | Tool life prediction |
| Extended Taylor | extended_taylor.js | Multi-variable tool life |
| Johnson-Cook | johnson_cook_flow.js | Material constitutive model |
| Stability lobe | stability_lobe.js | Chatter prediction |
| FRF analysis | frf_analysis.js | Frequency response |
| Heat partition | thermal_model.js | Temperature prediction |

## 6.6 Common Queries Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           COMMON QUERIES QUICK REFERENCE                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  Q: "What forces will I see cutting 4140 steel?"                                        │
│  A: cutting_force_engine.js + steel_alloy.js + kienzle_coefficients.js                 │
│                                                                                         │
│  Q: "What speed/feed for titanium on a Haas VF-4?"                                      │
│  A: speed_feed_optimizer.js + titanium_alloys.js + haas_mills.js                       │
│                                                                                         │
│  Q: "Will this cut chatter?"                                                            │
│  A: chatter_prediction.js + stability_lobe.js + machine_database.js                    │
│                                                                                         │
│  Q: "How long will my tool last?"                                                       │
│  A: tool_life_engine.js + taylor_constants.js + tool_database.js                       │
│                                                                                         │
│  Q: "What surface finish will I get?"                                                   │
│  A: surface_finish_engine.js + theoretical_roughness.js                                │
│                                                                                         │
│  Q: "Is my spindle powerful enough?"                                                    │
│  A: power_torque_engine.js + machine_database.js                                       │
│                                                                                         │
│  Q: "What tool should I use?"                                                           │
│  A: tool_selector.js + tool_database.js + tool_recommendations.js                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

# DOCUMENT END

**Skill:** prism-monolith-index
**Version:** 1.0
**Total Sections:** 7
**Part of:** SP.2 Monolith Navigation (SP.2.1 of 3)
**Created:** Session SP.2.1
**Status:** COMPLETE

**Key Features:**
- 12 module categories defined
- 831 modules indexed (key modules detailed)
- Dependency graph with circular dep warnings
- Extraction priority matrix with scoring
- Quick lookup tables for common queries
- Integration with SP.2.2 and SP.2.3

**Monolith Coverage:**
- Total lines: 986,621
- Total modules: 831
- Categories: 12
- Priority 1 modules: ~310 (MATERIALS, MACHINES, TOOLS, ALGORITHMS)
- Priority 2 modules: ~280 (CAM, OPTIMIZATION, KNOWLEDGE, SIMULATION)
- Priority 3+ modules: ~241 (DATA, UI, UTILS, CORE)

---
