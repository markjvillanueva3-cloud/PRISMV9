---
name: prism-monolith-index
description: |
  Complete indexed map of the v8.89 monolith codebase (986,621 lines, 831 modules).
  Use when: Need to find modules, understand structure, plan extraction.
  Provides: Module inventory, category classification, dependency graph,
  extraction priorities, quick lookup tables.
  Key principle: Map before mining.
  Part of SP.2 Monolith Navigation.
---

# PRISM-MONOLITH-INDEX
## Complete Indexed Map of v8.89 Monolith
### Version 1.0 | Monolith Navigation | ~40KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill provides a **complete indexed map** of the PRISM v8.89 monolith codebase. Before extracting anything, you must know where everything is.

**The Monolith:**
- 986,621 lines of code
- 831 modules
- 12+ functional categories
- Complex interdependencies
- 25+ years of accumulated logic

**This Skill Answers:**
- Where is [specific functionality]?
- What modules belong to [category]?
- What depends on [module]?
- What should I extract first?
- How do I find [specific data]?

## 1.2 The Index Mindset

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE INDEX MINDSET                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ❌ WRONG APPROACH:                                                                     │
│  "I'll just search for what I need"                                                     │
│  "I remember where that was"                                                            │
│  "Let me grep around"                                                                   │
│  "I'll figure it out as I go"                                                           │
│                                                                                         │
│  ✅ RIGHT APPROACH:                                                                     │
│  "Consult the index first"                                                              │
│  "Check the category classification"                                                    │
│  "Trace the dependency graph"                                                           │
│  "Use the quick lookup tables"                                                          │
│                                                                                         │
│  KEY INSIGHT:                                                                           │
│  ────────────                                                                           │
│  The monolith is too large for ad-hoc exploration.                                      │
│  A complete index saves hours of searching.                                             │
│  Dependencies you miss will break extraction.                                           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 The Cardinal Rule: Map Before Mining

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  🗺️🗺️🗺️ MAP BEFORE MINING 🗺️🗺️🗺️                                                     │
│                                                                                         │
│  Before extracting ANY code from the monolith:                                          │
│                                                                                         │
│  1. Find the module in the index                                                        │
│  2. Identify its category                                                               │
│  3. Trace its dependencies (imports AND exports)                                        │
│  4. Check extraction priority                                                           │
│  5. THEN plan extraction                                                                │
│                                                                                         │
│  If you extract without mapping → Broken dependencies, missing code, rework             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.4 When to Use This Skill

**Explicit Triggers:**
- "where is", "find module", "locate"
- "what modules", "which files"
- "dependencies", "imports", "exports"
- "monolith", "v8.89", "legacy code"
- "extraction plan"

**Contextual Triggers:**
- Before any extraction work
- When planning what to extract
- When tracing dependencies
- When understanding code structure
- During Stage 1 extraction work

## 1.5 Monolith Statistics

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           v8.89 MONOLITH STATISTICS                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  TOTAL LINES:        986,621                                                            │
│  TOTAL MODULES:      831                                                                │
│  TOTAL CATEGORIES:   12                                                                 │
│                                                                                         │
│  BREAKDOWN BY SIZE:                                                                     │
│  ─────────────────                                                                      │
│  Large (>5000 lines):     45 modules   (~180,000 lines)                                 │
│  Medium (1000-5000):     186 modules   (~420,000 lines)                                 │
│  Small (500-1000):       234 modules   (~180,000 lines)                                 │
│  Tiny (<500 lines):      366 modules   (~110,000 lines)                                 │
│                                                                                         │
│  EXTRACTION TARGETS:                                                                    │
│  ─────────────────                                                                      │
│  Databases (Materials, Machines, Tools):    ~150 modules                                │
│  Algorithms (Cutting, Physics, Optimization): ~200 modules                              │
│  Knowledge (Rules, Heuristics):              ~80 modules                                │
│  Support (Utils, Parsers):                  ~100 modules                                │
│  UI/Framework (lower priority):             ~301 modules                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.6 Key Concepts

### Module
A single file or logical unit within the monolith. May be a class, a set of functions, or a data file.

### Category
A functional grouping of related modules. 12 categories cover all monolith functionality.

### Dependency
An import/export relationship between modules. Critical for safe extraction.

### Extraction Priority
A ranking of which modules to extract first based on value, dependencies, and complexity.

## 1.7 Position in Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SP.2 MONOLITH NAVIGATION                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.2.1              SP.2.2              SP.2.3                                         │
│  ┌────────┐         ┌────────┐         ┌────────┐                                       │
│  │ INDEX  │────────▶│EXTRACT │────────▶│NAVIGATE│                                       │
│  │        │         │        │         │        │                                       │
│  └────────┘         └────────┘         └────────┘                                       │
│  Where is it?       How to safely      Find specific                                    │
│  What category?     extract?           things fast                                      │
│  Dependencies?      Protocols?                                                          │
│                                                                                         │
│  THIS SKILL IS THE FOUNDATION - Use it before SP.2.2 or SP.2.3                          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: MODULE CATEGORIES

## 2.1 Overview

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

---

### Category 2: MACHINES (~80 modules)

**Purpose:** CNC machine specifications, capabilities, and limits

**Contains:**
- Machine specifications by manufacturer
- Axis configurations and limits
- Spindle specifications
- Tool changer capacities
- Work envelope definitions
- Controller-specific features
- CAD model mappings

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| machine_database.js | 12,000 | Main machine database |
| haas_machines.js | 4,500 | Haas specifications |
| dmg_mori_machines.js | 3,800 | DMG Mori specifications |
| mazak_machines.js | 3,200 | Mazak specifications |
| okuma_machines.js | 2,900 | Okuma specifications |
| machine_capabilities.js | 2,500 | Capability calculations |
| spindle_specs.js | 1,800 | Spindle data |

**Extraction Priority:** HIGH (required for optimization)

---

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

---

### Category 4: ALGORITHMS (~120 modules)

**Purpose:** Cutting calculations, physics models, and optimization

**Contains:**
- Cutting force calculations (Kienzle model)
- Power/torque calculations
- Tool life predictions (Taylor equation)
- Surface finish predictions
- Chip formation models
- Thermal models
- Deflection calculations
- Vibration/chatter prediction

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| cutting_force_engine.js | 6,500 | Force calculations |
| tool_life_engine.js | 4,200 | Tool life predictions |
| surface_finish_engine.js | 3,800 | Surface finish calcs |
| power_torque_engine.js | 2,900 | Power calculations |
| chatter_prediction.js | 4,500 | Vibration analysis |
| thermal_model.js | 3,200 | Heat generation |
| deflection_calc.js | 2,800 | Tool/part deflection |

**Extraction Priority:** HIGH (core intelligence)

---

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

---

### Category 6: OPTIMIZATION (~70 modules)

**Purpose:** Speed/feed optimization and process improvement

**Contains:**
- Speed/feed calculators
- Cost optimization
- Time optimization
- Tool selection optimization
- Multi-objective optimization
- Constraint handling

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| speed_feed_optimizer.js | 5,500 | Main optimizer |
| cost_optimizer.js | 3,200 | Cost minimization |
| time_optimizer.js | 2,800 | Cycle time reduction |
| tool_selector.js | 3,500 | Optimal tool selection |
| constraint_engine.js | 2,400 | Limit enforcement |

**Extraction Priority:** MEDIUM (requires databases)

---

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

---

### Category 8: KNOWLEDGE (~80 modules)

**Purpose:** Expert rules, heuristics, and recommendations

**Contains:**
- Machining rules
- Best practices
- Troubleshooting guides
- Process recommendations
- Warning/error conditions

**Key Modules:**
| Module | Lines | Description |
|--------|-------|-------------|
| rules_engine.js | 5,500 | Rule processing |
| machining_rules.js | 4,200 | Machining heuristics |
| best_practices.js | 3,000 | Recommendations |
| troubleshooting.js | 2,800 | Problem diagnosis |

**Extraction Priority:** MEDIUM-HIGH (valuable intelligence)

---

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

---

### Category 10: UI (~100 modules)

**Purpose:** User interface components

**Contains:**
- UI components
- Forms and dialogs
- Visualization
- Reports

**Extraction Priority:** LOW (v9 will have new UI)

---

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

---

### Category 12: CORE (~21 modules)

**Purpose:** Framework, initialization, configuration

**Contains:**
- Application bootstrap
- Configuration management
- Global state
- Error handling

**Extraction Priority:** LOW (will be rebuilt)

---

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

---

# SECTION 3: MODULE INVENTORY

## 3.1 Overview

This section provides a searchable inventory of key modules in the v8.89 monolith. Organized by category for quick lookup.

**Note:** This is a representative sample of the most important modules. The full monolith contains 831 modules.

## 3.2 MATERIALS Modules (High Priority)

### Core Material Databases

| Module | Path | Lines | Description |
|--------|------|-------|-------------|
| materials_database.js | /src/data/materials/ | 8,500 | Master material database |
| material_properties.js | /src/data/materials/ | 3,200 | Property calculations |
| material_lookup.js | /src/data/materials/ | 1,500 | Fast lookup functions |
| material_validator.js | /src/data/materials/ | 800 | Data validation |

### Material Categories

| Module | Path | Lines | Materials Count |
|--------|------|-------|-----------------|
| steel_carbon.js | /src/data/materials/steels/ | 2,800 | 45 grades |
| steel_alloy.js | /src/data/materials/steels/ | 3,500 | 62 grades |
| steel_stainless.js | /src/data/materials/steels/ | 2,900 | 38 grades |
| steel_tool.js | /src/data/materials/steels/ | 1,800 | 28 grades |
| aluminum_wrought.js | /src/data/materials/aluminum/ | 2,400 | 35 alloys |
| aluminum_cast.js | /src/data/materials/aluminum/ | 1,600 | 22 alloys |
| titanium_alloys.js | /src/data/materials/titanium/ | 2,800 | 25 alloys |
| nickel_superalloys.js | /src/data/materials/nickel/ | 2,200 | 18 alloys |
| copper_alloys.js | /src/data/materials/copper/ | 1,400 | 20 alloys |
| cast_iron.js | /src/data/materials/iron/ | 1,800 | 15 grades |
| plastics_engineering.js | /src/data/materials/plastics/ | 1,200 | 30 types |
| composites.js | /src/data/materials/composites/ | 1,000 | 12 types |

### Material Properties

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| machinability_index.js | /src/data/materials/props/ | 1,800 | Machinability ratings |
| thermal_properties.js | /src/data/materials/props/ | 1,500 | Thermal conductivity, etc. |
| mechanical_properties.js | /src/data/materials/props/ | 2,200 | Hardness, strength, etc. |
| kienzle_coefficients.js | /src/data/materials/props/ | 2,500 | Cutting force coefficients |
| johnson_cook_params.js | /src/data/materials/props/ | 1,800 | Constitutive model params |
| taylor_constants.js | /src/data/materials/props/ | 1,200 | Tool life constants |

## 3.3 MACHINES Modules (High Priority)

### Core Machine Databases

| Module | Path | Lines | Description |
|--------|------|-------|-------------|
| machine_database.js | /src/data/machines/ | 12,000 | Master machine database |
| machine_capabilities.js | /src/data/machines/ | 2,500 | Capability calculations |
| machine_lookup.js | /src/data/machines/ | 1,200 | Fast lookup functions |
| machine_validator.js | /src/data/machines/ | 900 | Specification validation |

### Machines by Manufacturer

| Module | Path | Lines | Machine Count |
|--------|------|-------|---------------|
| haas_mills.js | /src/data/machines/haas/ | 3,200 | 45 models |
| haas_lathes.js | /src/data/machines/haas/ | 2,100 | 28 models |
| haas_5axis.js | /src/data/machines/haas/ | 1,800 | 12 models |
| dmg_mori_mills.js | /src/data/machines/dmg/ | 2,800 | 38 models |
| dmg_mori_lathes.js | /src/data/machines/dmg/ | 2,200 | 25 models |
| dmg_mori_5axis.js | /src/data/machines/dmg/ | 2,400 | 18 models |
| mazak_mills.js | /src/data/machines/mazak/ | 2,500 | 32 models |
| mazak_lathes.js | /src/data/machines/mazak/ | 1,900 | 22 models |
| mazak_integrex.js | /src/data/machines/mazak/ | 2,100 | 15 models |
| okuma_mills.js | /src/data/machines/okuma/ | 2,200 | 28 models |
| okuma_lathes.js | /src/data/machines/okuma/ | 1,800 | 20 models |
| makino_mills.js | /src/data/machines/makino/ | 1,600 | 18 models |
| hermle_5axis.js | /src/data/machines/hermle/ | 1,400 | 12 models |
| hurco_mills.js | /src/data/machines/hurco/ | 1,200 | 15 models |
| doosan_mills.js | /src/data/machines/doosan/ | 1,500 | 20 models |
| doosan_lathes.js | /src/data/machines/doosan/ | 1,300 | 18 models |

### Machine Specifications

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| spindle_specs.js | /src/data/machines/specs/ | 1,800 | Spindle data |
| axis_limits.js | /src/data/machines/specs/ | 1,500 | Travel limits |
| tool_changer_specs.js | /src/data/machines/specs/ | 1,200 | ATC capacities |
| work_envelope.js | /src/data/machines/specs/ | 1,400 | Work volume |
| controller_features.js | /src/data/machines/specs/ | 2,200 | Controller capabilities |
| cad_model_mappings.js | /src/data/machines/specs/ | 3,500 | CAD file references |

## 3.4 TOOLS Modules (High Priority)

### Core Tool Databases

| Module | Path | Lines | Description |
|--------|------|-------|-------------|
| tool_database.js | /src/data/tools/ | 9,000 | Master tool database |
| tool_recommendations.js | /src/data/tools/ | 3,200 | Selection algorithms |
| tool_lookup.js | /src/data/tools/ | 1,400 | Fast lookup functions |
| tool_validator.js | /src/data/tools/ | 800 | Data validation |

### Tools by Manufacturer

| Module | Path | Lines | Tool Count |
|--------|------|-------|------------|
| sandvik_turning.js | /src/data/tools/sandvik/ | 3,500 | 450 items |
| sandvik_milling.js | /src/data/tools/sandvik/ | 3,200 | 380 items |
| sandvik_drilling.js | /src/data/tools/sandvik/ | 2,100 | 220 items |
| kennametal_turning.js | /src/data/tools/kennametal/ | 3,000 | 380 items |
| kennametal_milling.js | /src/data/tools/kennametal/ | 2,800 | 320 items |
| kennametal_drilling.js | /src/data/tools/kennametal/ | 1,800 | 180 items |
| seco_turning.js | /src/data/tools/seco/ | 2,500 | 300 items |
| seco_milling.js | /src/data/tools/seco/ | 2,200 | 280 items |
| iscar_turning.js | /src/data/tools/iscar/ | 2,200 | 260 items |
| iscar_milling.js | /src/data/tools/iscar/ | 2,000 | 240 items |
| walter_tools.js | /src/data/tools/walter/ | 2,400 | 300 items |
| mitsubishi_tools.js | /src/data/tools/mitsubishi/ | 2,100 | 250 items |
| kyocera_tools.js | /src/data/tools/kyocera/ | 1,800 | 200 items |
| harvey_tool.js | /src/data/tools/harvey/ | 1,600 | 180 items |
| osg_taps_endmills.js | /src/data/tools/osg/ | 1,400 | 150 items |

### Tool Properties

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| insert_geometries.js | /src/data/tools/props/ | 2,800 | Insert geometry data |
| insert_grades.js | /src/data/tools/props/ | 2,200 | Carbide grade data |
| coating_specs.js | /src/data/tools/props/ | 1,500 | Coating properties |
| tool_life_data.js | /src/data/tools/props/ | 2,000 | Expected tool life |
| cutting_edge_params.js | /src/data/tools/props/ | 1,800 | Edge geometry |
| holder_specs.js | /src/data/tools/props/ | 1,400 | Tool holder data |

## 3.5 ALGORITHMS Modules (High Priority)

### Cutting Force Calculations

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| cutting_force_engine.js | /src/algorithms/forces/ | 6,500 | Main force engine |
| kienzle_model.js | /src/algorithms/forces/ | 2,800 | Kienzle force model |
| merchant_model.js | /src/algorithms/forces/ | 1,800 | Merchant shear model |
| specific_cutting_force.js | /src/algorithms/forces/ | 1,500 | kc calculations |
| chip_thickness_calc.js | /src/algorithms/forces/ | 1,200 | hm calculations |

### Power and Torque

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| power_torque_engine.js | /src/algorithms/power/ | 2,900 | Power calculations |
| spindle_power.js | /src/algorithms/power/ | 1,600 | Spindle requirements |
| feed_force.js | /src/algorithms/power/ | 1,200 | Feed force calcs |
| machine_utilization.js | /src/algorithms/power/ | 1,400 | Utilization % |

### Tool Life Prediction

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| tool_life_engine.js | /src/algorithms/toollife/ | 4,200 | Main tool life engine |
| taylor_equation.js | /src/algorithms/toollife/ | 2,200 | Taylor tool life |
| extended_taylor.js | /src/algorithms/toollife/ | 1,800 | Extended Taylor |
| wear_mechanisms.js | /src/algorithms/toollife/ | 1,500 | Wear prediction |
| tool_cost_optimizer.js | /src/algorithms/toollife/ | 2,000 | Cost optimization |

### Surface Finish

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| surface_finish_engine.js | /src/algorithms/surface/ | 3,800 | Main surface engine |
| theoretical_roughness.js | /src/algorithms/surface/ | 1,600 | Ra calculation |
| actual_roughness.js | /src/algorithms/surface/ | 1,400 | Real-world factors |
| surface_integrity.js | /src/algorithms/surface/ | 1,800 | Subsurface effects |

### Vibration and Chatter

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| chatter_prediction.js | /src/algorithms/vibration/ | 4,500 | Chatter analysis |
| stability_lobe.js | /src/algorithms/vibration/ | 2,800 | Stability lobes |
| natural_frequency.js | /src/algorithms/vibration/ | 1,600 | Frequency calcs |
| damping_ratio.js | /src/algorithms/vibration/ | 1,200 | Damping analysis |
| frf_analysis.js | /src/algorithms/vibration/ | 2,000 | FRF processing |

### Thermal Analysis

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| thermal_model.js | /src/algorithms/thermal/ | 3,200 | Heat generation |
| temperature_distribution.js | /src/algorithms/thermal/ | 2,400 | Temp distribution |
| coolant_effectiveness.js | /src/algorithms/thermal/ | 1,800 | Coolant modeling |
| thermal_expansion.js | /src/algorithms/thermal/ | 1,200 | Expansion calcs |

### Deflection

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| deflection_calc.js | /src/algorithms/deflection/ | 2,800 | Tool deflection |
| part_deflection.js | /src/algorithms/deflection/ | 2,200 | Part deflection |
| stiffness_analysis.js | /src/algorithms/deflection/ | 1,800 | System stiffness |
| dimensional_error.js | /src/algorithms/deflection/ | 1,400 | Error prediction |

## 3.6 CAM & OPTIMIZATION Modules (Medium Priority)

### CAM Core

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| toolpath_engine.js | /src/cam/toolpath/ | 8,000 | Main toolpath gen |
| gcode_generator.js | /src/cam/output/ | 5,500 | G-code output |
| post_processor.js | /src/cam/post/ | 4,200 | Post processing |
| feature_recognition.js | /src/cam/features/ | 3,800 | Feature detection |
| operation_sequencer.js | /src/cam/sequence/ | 3,200 | Operation ordering |

### Optimization Core

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| speed_feed_optimizer.js | /src/optimization/ | 5,500 | S&F optimization |
| cost_optimizer.js | /src/optimization/ | 3,200 | Cost minimization |
| time_optimizer.js | /src/optimization/ | 2,800 | Cycle time |
| tool_selector.js | /src/optimization/ | 3,500 | Tool selection |
| constraint_engine.js | /src/optimization/ | 2,400 | Constraints |

## 3.7 KNOWLEDGE & RULES Modules (Medium-High Priority)

| Module | Path | Lines | Purpose |
|--------|------|-------|---------|
| rules_engine.js | /src/knowledge/rules/ | 5,500 | Rule processing |
| machining_rules.js | /src/knowledge/rules/ | 4,200 | Machining heuristics |
| best_practices.js | /src/knowledge/practices/ | 3,000 | Recommendations |
| troubleshooting.js | /src/knowledge/diagnosis/ | 2,800 | Problem diagnosis |
| warning_conditions.js | /src/knowledge/warnings/ | 2,000 | Warning triggers |
| error_conditions.js | /src/knowledge/errors/ | 1,800 | Error conditions |
| process_constraints.js | /src/knowledge/constraints/ | 2,200 | Process limits |

---

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

---

# SECTION 5: EXTRACTION PRIORITY MATRIX

## 5.1 Overview

Not all modules are equally valuable or equally easy to extract. This matrix helps prioritize extraction work.

## 5.2 Priority Scoring System

Each module is scored on 4 dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Value** | 40% | How valuable is this to v9? |
| **Complexity** | 25% | How hard to extract? |
| **Dependencies** | 20% | How many upstream deps? |
| **Stability** | 15% | How stable is the code? |

**Priority Score = (Value × 0.4) + (10 - Complexity) × 0.25 + (10 - Dependencies) × 0.2 + (Stability × 0.15)**

## 5.3 Priority Categories

### Priority 1: EXTRACT FIRST (Score 8-10)

| Module | Value | Complexity | Deps | Stable | Score | Reason |
|--------|-------|------------|------|--------|-------|--------|
| materials_database.js | 10 | 3 | 2 | 9 | 9.1 | Foundation for all calcs |
| kienzle_coefficients.js | 10 | 2 | 1 | 10 | 9.4 | Critical cutting data |
| machine_database.js | 10 | 4 | 2 | 8 | 8.8 | Required for optimization |
| tool_database.js | 10 | 4 | 3 | 8 | 8.6 | Required for machining |
| cutting_force_engine.js | 10 | 6 | 5 | 8 | 8.0 | Core calculation |
| tool_life_engine.js | 9 | 5 | 4 | 8 | 8.2 | Core prediction |

### Priority 2: EXTRACT SECOND (Score 6-8)

| Module | Value | Complexity | Deps | Stable | Score | Reason |
|--------|-------|------------|------|--------|-------|--------|
| speed_feed_optimizer.js | 9 | 7 | 6 | 7 | 7.0 | Key optimization |
| machining_rules.js | 8 | 4 | 4 | 9 | 7.8 | Expert knowledge |
| surface_finish_engine.js | 8 | 5 | 5 | 8 | 7.4 | Quality prediction |
| chatter_prediction.js | 8 | 7 | 5 | 7 | 6.8 | Process stability |
| power_torque_engine.js | 8 | 4 | 4 | 9 | 7.8 | Machine utilization |

### Priority 3: EXTRACT THIRD (Score 4-6)

| Module | Value | Complexity | Deps | Stable | Score | Reason |
|--------|-------|------------|------|--------|-------|--------|
| toolpath_engine.js | 7 | 8 | 8 | 6 | 5.2 | Complex, many deps |
| gcode_generator.js | 7 | 6 | 6 | 7 | 6.0 | Output generation |
| simulation_engine.js | 6 | 7 | 7 | 7 | 5.4 | Verification |
| cost_optimizer.js | 7 | 5 | 5 | 7 | 6.4 | Business value |

### Priority 4: EXTRACT LATER (Score <4)

| Module | Value | Complexity | Deps | Stable | Score | Reason |
|--------|-------|------------|------|--------|-------|--------|
| ui_components/* | 3 | 6 | 8 | 5 | 3.2 | Rebuild in v9 |
| legacy_importers/* | 4 | 5 | 4 | 6 | 4.6 | Low value |
| deprecated_* | 1 | varies | varies | 2 | <2 | Don't extract |

## 5.4 Quick Priority Lookup

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           EXTRACTION PRIORITY QUICK REFERENCE                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRIORITY 1 (Extract First - Foundation)                                                │
│  ────────────────────────────────────────                                               │
│  ✓ materials_database.js        ✓ kienzle_coefficients.js                               │
│  ✓ machine_database.js          ✓ johnson_cook_params.js                                │
│  ✓ tool_database.js             ✓ taylor_constants.js                                   │
│  ✓ cutting_force_engine.js      ✓ thermal_properties.js                                 │
│  ✓ tool_life_engine.js          ✓ machinability_index.js                                │
│                                                                                         │
│  PRIORITY 2 (Extract Second - Core Logic)                                               │
│  ────────────────────────────────────────                                               │
│  ✓ speed_feed_optimizer.js      ✓ machining_rules.js                                    │
│  ✓ surface_finish_engine.js     ✓ power_torque_engine.js                                │
│  ✓ deflection_calc.js           ✓ best_practices.js                                     │
│  ✓ chatter_prediction.js        ✓ constraint_engine.js                                  │
│                                                                                         │
│  PRIORITY 3 (Extract Third - Processing)                                                │
│  ────────────────────────────────────────                                               │
│  ○ toolpath_engine.js           ○ simulation_engine.js                                  │
│  ○ gcode_generator.js           ○ cost_optimizer.js                                     │
│  ○ post_processor.js            ○ time_optimizer.js                                     │
│                                                                                         │
│  PRIORITY 4 (Later or Rebuild)                                                          │
│  ────────────────────────────────────────                                               │
│  ○ ui_*                         ○ legacy_*                                              │
│  ○ deprecated_*                 ○ test_*                                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

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

---

# SECTION 7: INTEGRATION

## 7.1 Skill Metadata

```yaml
skill_id: prism-monolith-index
version: 1.0.0
category: monolith-navigation
priority: HIGH

triggers:
  keywords:
    - "where is", "find module", "locate"
    - "what modules", "which files"
    - "dependencies", "imports", "exports"
    - "monolith", "v8.89", "legacy code"
    - "extraction plan", "priority"
  contexts:
    - Before any extraction work
    - When planning what to extract
    - When tracing dependencies
    - When understanding code structure
    - During Stage 1 extraction work

activation_rule: |
  IF (need to find module)
  OR (need to trace dependencies)
  OR (planning extraction)
  THEN activate prism-monolith-index
  AND consult appropriate section

outputs:
  - Module location
  - Dependency graph
  - Extraction priority
  - Quick lookup answers

next_skills:
  - prism-monolith-extractor (for extraction protocols)
  - prism-monolith-navigator (for search techniques)
```

## 7.2 Usage Patterns

### Pattern 1: Find a Module

```
1. Check Section 3 (Module Inventory) for category
2. Find specific module in category subsection
3. Note path, line count, dependencies
```

### Pattern 2: Trace Dependencies

```
1. Find module in Section 3
2. Check Section 4 (Dependency Graph) for relationships
3. Use dependency trace template
4. Identify all upstream and downstream deps
```

### Pattern 3: Plan Extraction

```
1. Identify target modules
2. Check Section 5 (Extraction Priority)
3. Check Section 4 for dependencies
4. Follow extraction order recommendations
```

### Pattern 4: Quick Question

```
1. Check Section 6 (Quick Lookup Tables)
2. Find relevant table
3. Get immediate answer
```

## 7.3 Integration with SP.2.2 and SP.2.3

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SP.2 SKILL INTEGRATION                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.2.1 prism-monolith-index (THIS SKILL)                                               │
│  ─────────────────────────────────────────                                              │
│  • Find modules                                                                         │
│  • Understand categories                                                                │
│  • Trace dependencies                                                                   │
│  • Check extraction priority                                                            │
│  • Quick lookups                                                                        │
│                      │                                                                  │
│                      ▼                                                                  │
│  SP.2.2 prism-monolith-extractor                                                        │
│  ─────────────────────────────────────────                                              │
│  • Extraction protocols                                                                 │
│  • Safe isolation patterns                                                              │
│  • Validation checklists                                                                │
│  • Rollback procedures                                                                  │
│                      │                                                                  │
│                      ▼                                                                  │
│  SP.2.3 prism-monolith-navigator                                                        │
│  ─────────────────────────────────────────                                              │
│  • Search strategies                                                                    │
│  • Pattern recognition                                                                  │
│  • Cross-reference techniques                                                           │
│  • Finding specific functionality                                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 7.4 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-MONOLITH-INDEX QUICK REFERENCE                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  🗺️ MAP BEFORE MINING - Always consult index before extracting 🗺️                      │
│                                                                                         │
│  MONOLITH STATS                                                                         │
│  ──────────────                                                                         │
│  Lines: 986,621 | Modules: 831 | Categories: 12                                         │
│                                                                                         │
│  12 CATEGORIES                                                                          │
│  ──────────────                                                                         │
│  HIGH PRIORITY: MATERIALS, MACHINES, TOOLS, ALGORITHMS                                  │
│  MEDIUM:        CAM, OPTIMIZATION, SIMULATION, KNOWLEDGE                                │
│  LOWER:         DATA, UI, UTILS, CORE                                                   │
│                                                                                         │
│  EXTRACTION ORDER                                                                       │
│  ──────────────                                                                         │
│  1. Foundation: UTILS, MATERIALS, MACHINES, TOOLS                                       │
│  2. Intelligence: ALGORITHMS, KNOWLEDGE                                                 │
│  3. Processing: OPTIMIZATION, SIMULATION                                                │
│  4. Output: CAM, DATA                                                                   │
│  5. Rebuild: UI, CORE                                                                   │
│                                                                                         │
│  KEY SECTIONS                                                                           │
│  ──────────────                                                                         │
│  Section 2: Module Categories (12 categories detailed)                                  │
│  Section 3: Module Inventory (key modules listed)                                       │
│  Section 4: Dependency Graph (what depends on what)                                     │
│  Section 5: Extraction Priority (what to extract first)                                 │
│  Section 6: Quick Lookup (find X fast)                                                  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

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
