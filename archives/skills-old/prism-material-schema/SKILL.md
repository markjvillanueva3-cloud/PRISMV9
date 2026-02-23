---
name: prism-material-schema
description: |
  Complete 127-parameter material structure definition for PRISM v9.0.
  Use when: Defining material data structure, adding materials, validating completeness.
  Provides: Full parameter list, categories, data types, units, relationships,
  JSON/TypeScript schema, example fully-populated material.
  Key principle: Every material parameter serves a calculation purpose.
  Part of SP.3 Materials System.
---

# PRISM-MATERIAL-SCHEMA
## Complete 127-Parameter Material Structure
### Version 1.0 | Materials System | ~35KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill defines the **complete 127-parameter structure** for materials in PRISM v9.0. Every parameter exists because it feeds into one or more calculations.

**The Challenge:**
- Materials have dozens of properties across multiple domains
- Different calculations need different properties
- Properties have complex relationships
- Data comes from multiple sources with varying quality
- 100% coverage required for full calculation capability

**This Skill Provides:**
- Complete list of all 127 parameters
- Categorization by domain (mechanical, thermal, machinability, etc.)
- Data types, units, and valid ranges for each parameter
- Relationships between parameters
- JSON and TypeScript schema definitions
- Example of a fully-populated material

## 1.2 The Schema Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MATERIAL SCHEMA PHILOSOPHY                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: EVERY PARAMETER HAS A PURPOSE                                             │
│  ───────────────────────────────────────────                                            │
│  No parameter exists "just in case." Each one feeds into at least one                   │
│  calculation engine. If we can't name the consumer, we don't need the parameter.        │
│                                                                                         │
│  PRINCIPLE 2: COMPLETE > PARTIAL                                                        │
│  ───────────────────────────────────                                                    │
│  A material with 127/127 parameters at 80% confidence is more valuable than             │
│  a material with 50/127 parameters at 99% confidence. Completeness enables              │
│  all calculations; gaps block them.                                                     │
│                                                                                         │
│  PRINCIPLE 3: SOURCE EVERYTHING                                                         │
│  ───────────────────────────────                                                        │
│  Every value has a source. Handbook, calculated, estimated, or assumed.                 │
│  The source determines the confidence level.                                            │
│                                                                                         │
│  PRINCIPLE 4: VALIDATE PHYSICALLY                                                       │
│  ───────────────────────────────                                                        │
│  Values must be physically plausible. A steel with negative hardness or                 │
│  titanium with aluminum's thermal conductivity is wrong, regardless of source.          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Parameter Count by Category

| # | Category | Parameters | Purpose |
|---|----------|------------|---------|
| 1 | **Identification** | 12 | Unique identification, naming, standards |
| 2 | **Classification** | 8 | Material type, family, group |
| 3 | **Mechanical** | 18 | Strength, hardness, ductility |
| 4 | **Thermal** | 12 | Heat transfer, expansion, melting |
| 5 | **Physical** | 6 | Density, structure |
| 6 | **Machinability** | 15 | Cutting behavior, chip formation |
| 7 | **Kienzle** | 12 | Cutting force model parameters |
| 8 | **Johnson-Cook** | 8 | Constitutive model for FEA |
| 9 | **Taylor** | 10 | Tool life model parameters |
| 10 | **Surface** | 8 | Surface finish characteristics |
| 11 | **Coolant** | 8 | Coolant compatibility |
| 12 | **Metadata** | 10 | Sources, confidence, timestamps |
| | **TOTAL** | **127** | |

## 1.4 When to Use This Skill

**Explicit Triggers:**
- "material structure", "material schema"
- "parameter list", "what parameters"
- "add material", "define material"
- "127 parameters"

**Contextual Triggers:**
- Creating new material entries
- Validating material completeness
- Understanding what data is needed
- Mapping legacy data to v9 structure

## 1.5 Parameter → Calculation Mapping

Every parameter feeds into specific calculations:

| Parameter Domain | Primary Consumers |
|------------------|-------------------|
| **Mechanical** | Cutting force, deflection, chatter |
| **Thermal** | Temperature rise, tool wear, coolant selection |
| **Machinability** | Speed/feed optimization, tool selection |
| **Kienzle** | Cutting force engine (primary) |
| **Johnson-Cook** | FEA simulation, high-speed machining |
| **Taylor** | Tool life prediction engine |
| **Surface** | Surface finish prediction |
| **Coolant** | Coolant recommendation engine |

## 1.6 Position in SP.3 Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SP.3 MATERIALS SYSTEM                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.3.1              SP.3.2              SP.3.3                                         │
│  ┌────────┐         ┌────────┐         ┌────────┐                                       │
│  │ SCHEMA │────────▶│PHYSICS │────────▶│ LOOKUP │                                       │
│  │        │         │        │         │        │                                       │
│  └────────┘         └────────┘         └────────┘                                       │
│  ▲ THIS                                                                                 │
│  │                                                                                      │
│  Structure          Formulas that       How to access                                   │
│  definition         use parameters      material data                                   │
│                                                                                         │
│  SP.3.4              SP.3.5                                                             │
│  ┌────────┐         ┌────────┐                                                          │
│  │VALIDATE│────────▶│ENHANCE │                                                          │
│  │        │         │        │                                                          │
│  └────────┘         └────────┘                                                          │
│  Check against      Fill gaps to                                                        │
│  schema             reach 127/127                                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: PARAMETER CATEGORIES

## 2.1 Category 1: Identification (12 Parameters)

**Purpose:** Uniquely identify materials across standards and naming conventions.

| # | Parameter | Type | Example | Notes |
|---|-----------|------|---------|-------|
| 1 | `id` | string | "AISI_4140" | Primary key, unique |
| 2 | `name` | string | "AISI 4140 Steel" | Display name |
| 3 | `uns` | string | "G41400" | UNS number |
| 4 | `din` | string | "1.7225" | DIN/EN number |
| 5 | `jis` | string | "SCM440" | JIS standard |
| 6 | `iso` | string | "42CrMo4" | ISO designation |
| 7 | `aliases` | string[] | ["4140", "Chrome-Moly"] | Common names |
| 8 | `manufacturer_names` | object | {"sandvik": "MC P2.1"} | Vendor-specific |
| 9 | `description` | string | "Medium carbon..." | Brief description |
| 10 | `typical_applications` | string[] | ["Gears", "Shafts"] | Common uses |
| 11 | `similar_materials` | string[] | ["4340", "4145"] | Substitutes |
| 12 | `image_url` | string | "/images/4140.jpg" | Visual reference |

## 2.2 Category 2: Classification (8 Parameters)

**Purpose:** Categorize materials for filtering, grouping, and rule application.

| # | Parameter | Type | Values | Notes |
|---|-----------|------|--------|-------|
| 13 | `category` | enum | STEEL, ALUMINUM, TITANIUM, SUPERALLOY, etc. | Top-level |
| 14 | `family` | enum | CARBON_STEEL, ALLOY_STEEL, STAINLESS, etc. | Sub-category |
| 15 | `group` | string | "Chromium-Molybdenum" | Specific group |
| 16 | `iso_p_class` | enum | P1-P6 | ISO-P steel class |
| 17 | `iso_m_class` | enum | M1-M3 | ISO-M stainless class |
| 18 | `iso_k_class` | enum | K1-K3 | ISO-K cast iron class |
| 19 | `iso_n_class` | enum | N1-N3 | ISO-N aluminum class |
| 20 | `iso_s_class` | enum | S1-S4 | ISO-S superalloy class |

## 2.3 Category 3: Mechanical Properties (18 Parameters)

**Purpose:** Strength, hardness, and deformation characteristics.

| # | Parameter | Type | Unit | Typical Range | Used By |
|---|-----------|------|------|---------------|---------|
| 21 | `tensile_strength` | number | MPa | 200-2500 | Force calc, deflection |
| 22 | `yield_strength` | number | MPa | 150-2200 | Deflection, failure |
| 23 | `elongation` | number | % | 1-60 | Ductility assessment |
| 24 | `reduction_of_area` | number | % | 5-80 | Ductility, chip form |
| 25 | `hardness_hrc` | number | HRC | 15-70 | Machinability, tool wear |
| 26 | `hardness_hb` | number | HB | 100-700 | Alternative hardness |
| 27 | `hardness_hv` | number | HV | 100-900 | Microhardness |
| 28 | `elastic_modulus` | number | GPa | 50-450 | Deflection, vibration |
| 29 | `shear_modulus` | number | GPa | 20-180 | Torsion calculations |
| 30 | `poisson_ratio` | number | - | 0.2-0.4 | Stress analysis |
| 31 | `fatigue_strength` | number | MPa | 100-1200 | Cyclic loading |
| 32 | `impact_strength` | number | J | 5-300 | Toughness |
| 33 | `fracture_toughness` | number | MPa√m | 10-200 | Crack propagation |
| 34 | `compressive_strength` | number | MPa | 200-3000 | Compression loads |
| 35 | `shear_strength` | number | MPa | 100-1500 | Shear calculations |
| 36 | `work_hardening_exp` | number | - | 0.1-0.5 | Strain hardening |
| 37 | `strength_coefficient` | number | MPa | 300-3000 | Flow stress model |
| 38 | `strain_rate_sensitivity` | number | - | 0.001-0.1 | High-speed effects |

## 2.4 Category 4: Thermal Properties (12 Parameters)

**Purpose:** Heat transfer and temperature-related behavior.

| # | Parameter | Type | Unit | Typical Range | Used By |
|---|-----------|------|------|---------------|---------|
| 39 | `thermal_conductivity` | number | W/m·K | 5-400 | Heat dissipation |
| 40 | `specific_heat` | number | J/kg·K | 300-1200 | Temperature rise |
| 41 | `melting_point` | number | °C | 400-3500 | High-speed limits |
| 42 | `solidus_temp` | number | °C | 400-3400 | Phase transition |
| 43 | `liquidus_temp` | number | °C | 450-3500 | Phase transition |
| 44 | `thermal_expansion` | number | µm/m·K | 5-30 | Dimensional change |
| 45 | `thermal_diffusivity` | number | mm²/s | 1-150 | Heat spreading |
| 46 | `emissivity` | number | - | 0.1-0.95 | Radiation heat |
| 47 | `max_service_temp` | number | °C | 200-1200 | Operating limit |
| 48 | `annealing_temp` | number | °C | 400-1200 | Heat treatment |
| 49 | `tempering_temp` | number | °C | 150-700 | Heat treatment |
| 50 | `austenitizing_temp` | number | °C | 750-1100 | Heat treatment |

## 2.5 Category 5: Physical Properties (6 Parameters)

**Purpose:** Basic physical characteristics.

| # | Parameter | Type | Unit | Typical Range | Used By |
|---|-----------|------|------|---------------|---------|
| 51 | `density` | number | kg/m³ | 1500-20000 | Mass, inertia |
| 52 | `crystal_structure` | enum | BCC, FCC, HCP | - | Behavior prediction |
| 53 | `magnetic` | boolean | - | true/false | Fixturing |
| 54 | `electrical_resistivity` | number | µΩ·cm | 1-200 | EDM machining |
| 55 | `corrosion_resistance` | enum | LOW, MEDIUM, HIGH | - | Material selection |
| 56 | `weldability` | enum | POOR, FAIR, GOOD, EXCELLENT | - | Manufacturing |

## 2.6 Category 6: Machinability (15 Parameters)

**Purpose:** Cutting behavior and machining characteristics.

| # | Parameter | Type | Unit | Typical Range | Used By |
|---|-----------|------|------|---------------|---------|
| 57 | `machinability_index` | number | % | 20-200 | Speed/feed baseline |
| 58 | `reference_material` | string | - | "AISI_1212" | Index reference |
| 59 | `chip_type` | enum | CONTINUOUS, SEGMENTED, DISCONTINUOUS | - | Chip control |
| 60 | `chip_breakability` | enum | POOR, FAIR, GOOD, EXCELLENT | - | Chip breaking |
| 61 | `built_up_edge_tendency` | enum | LOW, MEDIUM, HIGH | - | Tool wear mode |
| 62 | `abrasiveness` | enum | LOW, MEDIUM, HIGH, VERY_HIGH | - | Tool wear rate |
| 63 | `work_hardening_severity` | enum | LOW, MEDIUM, HIGH | - | Depth of cut |
| 64 | `cutting_temp_tendency` | enum | LOW, MEDIUM, HIGH | - | Coolant needs |
| 65 | `surface_finish_quality` | enum | POOR, FAIR, GOOD, EXCELLENT | - | Finish prediction |
| 66 | `tool_wear_mode` | enum | FLANK, CRATER, NOTCH, ADHESIVE | - | Wear prediction |
| 67 | `recommended_tool_material` | string[] | ["Carbide", "Ceramic"] | - | Tool selection |
| 68 | `recommended_coating` | string[] | ["TiAlN", "AlCrN"] | - | Coating selection |
| 69 | `recommended_coolant` | enum | FLOOD, MIST, DRY, MQL | - | Coolant strategy |
| 70 | `specific_cutting_energy` | number | J/mm³ | 0.5-10 | Power calculation |
| 71 | `cutting_speed_multiplier` | number | - | 0.3-2.0 | Speed adjustment |

---

## 2.7 Category 7: Kienzle Parameters (12 Parameters)

**Purpose:** Cutting force calculation using Kienzle model (Fc = kc1.1 × h^(-mc) × b × corrections).

| # | Parameter | Type | Unit | Typical Range | Used By |
|---|-----------|------|------|---------------|---------|
| 72 | `kc1_1` | number | N/mm² | 500-4000 | Primary cutting force |
| 73 | `mc` | number | - | 0.15-0.40 | Chip thickness exponent |
| 74 | `kc1_1_turning` | number | N/mm² | 500-4000 | Operation-specific |
| 75 | `kc1_1_milling` | number | N/mm² | 500-4500 | Operation-specific |
| 76 | `kc1_1_drilling` | number | N/mm² | 600-5000 | Operation-specific |
| 77 | `rake_angle_correction` | number | %/° | 1.0-2.5 | Geometry correction |
| 78 | `wear_correction_factor` | number | - | 1.0-1.5 | Tool wear effect |
| 79 | `speed_correction_factor` | number | - | 0.8-1.2 | Speed effect |
| 80 | `coolant_correction_factor` | number | - | 0.85-1.0 | Coolant effect |
| 81 | `feed_force_ratio` | number | - | 0.3-0.8 | Ff/Fc ratio |
| 82 | `passive_force_ratio` | number | - | 0.2-0.6 | Fp/Fc ratio |
| 83 | `kc_source` | string | - | "Handbook" | Data source |

## 2.8 Category 8: Johnson-Cook Parameters (8 Parameters)

**Purpose:** Constitutive model for FEA and high-speed machining simulation.
**Equation:** σ = (A + B×εⁿ)(1 + C×ln(ε̇*))(1 - T*ᵐ)

| # | Parameter | Type | Unit | Typical Range | Used By |
|---|-----------|------|------|---------------|---------|
| 84 | `jc_A` | number | MPa | 100-2000 | Initial yield stress |
| 85 | `jc_B` | number | MPa | 100-2000 | Strain hardening coeff |
| 86 | `jc_n` | number | - | 0.01-0.8 | Strain hardening exp |
| 87 | `jc_C` | number | - | 0.001-0.1 | Strain rate coefficient |
| 88 | `jc_m` | number | - | 0.5-2.0 | Thermal softening exp |
| 89 | `jc_ref_strain_rate` | number | 1/s | 1.0 | Reference strain rate |
| 90 | `jc_ref_temp` | number | °C | 20-25 | Reference temperature |
| 91 | `jc_source` | string | - | "Literature" | Data source |

## 2.9 Category 9: Taylor Tool Life Parameters (10 Parameters)

**Purpose:** Tool life prediction using extended Taylor equation.
**Equation:** VT^n = C (basic), with corrections for feed, depth, etc.

| # | Parameter | Type | Unit | Typical Range | Used By |
|---|-----------|------|------|---------------|---------|
| 92 | `taylor_C_carbide` | number | m/min | 50-500 | Carbide tool constant |
| 93 | `taylor_n_carbide` | number | - | 0.15-0.40 | Carbide tool exponent |
| 94 | `taylor_C_ceramic` | number | m/min | 100-800 | Ceramic tool constant |
| 95 | `taylor_n_ceramic` | number | - | 0.20-0.50 | Ceramic tool exponent |
| 96 | `taylor_C_hss` | number | m/min | 20-150 | HSS tool constant |
| 97 | `taylor_n_hss` | number | - | 0.08-0.20 | HSS tool exponent |
| 98 | `taylor_feed_exp` | number | - | 0.5-1.0 | Feed rate exponent |
| 99 | `taylor_doc_exp` | number | - | 0.1-0.3 | Depth of cut exponent |
| 100 | `taylor_hardness_factor` | number | - | 0.8-1.5 | Hardness adjustment |
| 101 | `taylor_source` | string | - | "Empirical" | Data source |

## 2.10 Category 10: Surface Finish Parameters (8 Parameters)

**Purpose:** Surface roughness prediction and achievable finish.

| # | Parameter | Type | Unit | Typical Range | Used By |
|---|-----------|------|------|---------------|---------|
| 102 | `min_achievable_Ra` | number | µm | 0.1-2.0 | Finish limits |
| 103 | `typical_Ra_rough` | number | µm | 3.2-12.5 | Roughing target |
| 104 | `typical_Ra_finish` | number | µm | 0.8-3.2 | Finishing target |
| 105 | `surface_hardening_tendency` | enum | LOW, MEDIUM, HIGH | - | Surface effects |
| 106 | `smearing_tendency` | enum | LOW, MEDIUM, HIGH | - | Soft materials |
| 107 | `burr_formation_tendency` | enum | LOW, MEDIUM, HIGH | - | Edge quality |
| 108 | `Ra_speed_sensitivity` | number | - | 0.5-2.0 | Speed effect on Ra |
| 109 | `Ra_feed_sensitivity` | number | - | 1.5-3.0 | Feed effect on Ra |

## 2.11 Category 11: Coolant Parameters (8 Parameters)

**Purpose:** Coolant compatibility and recommendations.

| # | Parameter | Type | Unit | Range | Used By |
|---|-----------|------|------|-------|---------|
| 110 | `water_soluble_compatible` | boolean | - | T/F | Coolant selection |
| 111 | `straight_oil_compatible` | boolean | - | T/F | Coolant selection |
| 112 | `synthetic_compatible` | boolean | - | T/F | Coolant selection |
| 113 | `semi_synthetic_compatible` | boolean | - | T/F | Coolant selection |
| 114 | `dry_machining_ok` | boolean | - | T/F | Dry strategy |
| 115 | `mql_compatible` | boolean | - | T/F | MQL strategy |
| 116 | `cryogenic_compatible` | boolean | - | T/F | Cryo machining |
| 117 | `recommended_concentration` | number | % | 3-12 | Mix ratio |

## 2.12 Category 12: Metadata (10 Parameters)

**Purpose:** Data quality, sources, and tracking.

| # | Parameter | Type | Unit | Notes |
|---|-----------|------|------|-------|
| 118 | `data_source_primary` | string | - | "ASM Handbook Vol 1" |
| 119 | `data_source_secondary` | string | - | "Machining Data Handbook" |
| 120 | `data_confidence` | enum | - | LOW, MEDIUM, HIGH, VERIFIED |
| 121 | `parameter_coverage` | number | % | 0-100 (127 params) |
| 122 | `last_updated` | date | - | ISO 8601 date |
| 123 | `updated_by` | string | - | User/system |
| 124 | `version` | number | - | Schema version |
| 125 | `notes` | string | - | Additional info |
| 126 | `validation_status` | enum | - | DRAFT, REVIEWED, APPROVED |
| 127 | `prism_internal_id` | string | - | System UUID |

---

## 2.13 Parameter Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           127 PARAMETERS - COMPLETE SUMMARY                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  IDENTIFICATION (1-12)     12 params    Who is this material?                           │
│  CLASSIFICATION (13-20)     8 params    What type/family/group?                         │
│  MECHANICAL (21-38)        18 params    How strong/hard/ductile?                        │
│  THERMAL (39-50)           12 params    How does it handle heat?                        │
│  PHYSICAL (51-56)           6 params    Basic physical properties                       │
│  MACHINABILITY (57-71)     15 params    How does it cut?                                │
│  KIENZLE (72-83)           12 params    Cutting force model                             │
│  JOHNSON-COOK (84-91)       8 params    FEA constitutive model                          │
│  TAYLOR (92-101)           10 params    Tool life model                                 │
│  SURFACE (102-109)          8 params    Surface finish behavior                         │
│  COOLANT (110-117)          8 params    Coolant compatibility                           │
│  METADATA (118-127)        10 params    Data quality & tracking                         │
│  ─────────────────────────────────────────────────────────────────────────────────────  │
│  TOTAL                    127 params                                                    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 3: DATA TYPES AND VALIDATION

## 3.1 Enumerated Types

### Material Categories
```typescript
enum MaterialCategory {
  STEEL = "STEEL",
  ALUMINUM = "ALUMINUM",
  TITANIUM = "TITANIUM",
  SUPERALLOY = "SUPERALLOY",
  STAINLESS = "STAINLESS",
  CAST_IRON = "CAST_IRON",
  COPPER = "COPPER",
  MAGNESIUM = "MAGNESIUM",
  NICKEL = "NICKEL",
  COBALT = "COBALT",
  COMPOSITE = "COMPOSITE",
  PLASTIC = "PLASTIC",
  OTHER = "OTHER"
}
```

### Material Families (Steel)
```typescript
enum SteelFamily {
  CARBON_STEEL = "CARBON_STEEL",
  ALLOY_STEEL = "ALLOY_STEEL",
  TOOL_STEEL = "TOOL_STEEL",
  STAINLESS_AUSTENITIC = "STAINLESS_AUSTENITIC",
  STAINLESS_FERRITIC = "STAINLESS_FERRITIC",
  STAINLESS_MARTENSITIC = "STAINLESS_MARTENSITIC",
  STAINLESS_DUPLEX = "STAINLESS_DUPLEX",
  STAINLESS_PH = "STAINLESS_PH",
  HSLA = "HSLA",
  MARAGING = "MARAGING"
}
```

### ISO Material Classes
```typescript
enum ISO_P_Class { P1 = "P1", P2 = "P2", P3 = "P3", P4 = "P4", P5 = "P5", P6 = "P6" }
enum ISO_M_Class { M1 = "M1", M2 = "M2", M3 = "M3" }
enum ISO_K_Class { K1 = "K1", K2 = "K2", K3 = "K3" }
enum ISO_N_Class { N1 = "N1", N2 = "N2", N3 = "N3" }
enum ISO_S_Class { S1 = "S1", S2 = "S2", S3 = "S3", S4 = "S4" }
```

### Qualitative Enums
```typescript
enum QualityLevel { POOR = "POOR", FAIR = "FAIR", GOOD = "GOOD", EXCELLENT = "EXCELLENT" }
enum SeverityLevel { LOW = "LOW", MEDIUM = "MEDIUM", HIGH = "HIGH", VERY_HIGH = "VERY_HIGH" }
enum DataConfidence { LOW = "LOW", MEDIUM = "MEDIUM", HIGH = "HIGH", VERIFIED = "VERIFIED" }
enum ValidationStatus { DRAFT = "DRAFT", REVIEWED = "REVIEWED", APPROVED = "APPROVED" }
enum CrystalStructure { BCC = "BCC", FCC = "FCC", HCP = "HCP", OTHER = "OTHER" }
enum ChipType { CONTINUOUS = "CONTINUOUS", SEGMENTED = "SEGMENTED", DISCONTINUOUS = "DISCONTINUOUS" }
enum WearMode { FLANK = "FLANK", CRATER = "CRATER", NOTCH = "NOTCH", ADHESIVE = "ADHESIVE" }
enum CoolantType { FLOOD = "FLOOD", MIST = "MIST", DRY = "DRY", MQL = "MQL" }
```

## 3.2 Validation Ranges

### Mechanical Properties
| Parameter | Min | Max | Unit | Physics Basis |
|-----------|-----|-----|------|---------------|
| tensile_strength | 50 | 3000 | MPa | Materials science limits |
| yield_strength | 30 | 2500 | MPa | < tensile_strength |
| elongation | 0.1 | 70 | % | Ductility range |
| hardness_hrc | 10 | 72 | HRC | Rockwell C scale |
| hardness_hb | 80 | 750 | HB | Brinell scale |
| elastic_modulus | 10 | 500 | GPa | Material stiffness |
| poisson_ratio | 0.1 | 0.5 | - | Theoretical limits |

### Thermal Properties
| Parameter | Min | Max | Unit | Physics Basis |
|-----------|-----|-----|------|---------------|
| thermal_conductivity | 1 | 500 | W/m·K | Diamond to insulators |
| specific_heat | 100 | 2000 | J/kg·K | Material range |
| melting_point | 200 | 4000 | °C | Mercury to tungsten |
| thermal_expansion | 1 | 50 | µm/m·K | Material range |
| emissivity | 0 | 1 | - | Physical limit |

### Kienzle Parameters
| Parameter | Min | Max | Unit | Physics Basis |
|-----------|-----|-----|------|---------------|
| kc1_1 | 200 | 6000 | N/mm² | Soft Al to hard Ni |
| mc | 0.10 | 0.50 | - | Empirical range |
| rake_angle_correction | 0.5 | 3.0 | %/° | Typical response |
| wear_correction_factor | 1.0 | 2.0 | - | Wear effect |

### Johnson-Cook Parameters
| Parameter | Min | Max | Unit | Physics Basis |
|-----------|-----|-----|------|---------------|
| jc_A | 10 | 2500 | MPa | Yield stress range |
| jc_B | 10 | 3000 | MPa | Hardening range |
| jc_n | 0.001 | 1.0 | - | Hardening exponent |
| jc_C | 0.0001 | 0.2 | - | Strain rate effect |
| jc_m | 0.1 | 3.0 | - | Thermal softening |

### Taylor Parameters
| Parameter | Min | Max | Unit | Physics Basis |
|-----------|-----|-----|------|---------------|
| taylor_C | 5 | 1000 | m/min | Speed constant |
| taylor_n | 0.05 | 0.70 | - | Exponent range |

## 3.3 Relationship Validations

### Must-Hold Relationships
```
yield_strength <= tensile_strength
solidus_temp <= liquidus_temp
solidus_temp <= melting_point <= liquidus_temp
hardness_hrc = f(hardness_hb)  // Conversion formula
shear_strength ≈ 0.6 × tensile_strength  // Approximation
shear_modulus ≈ elastic_modulus / (2 × (1 + poisson_ratio))
thermal_diffusivity = thermal_conductivity / (density × specific_heat)
```

### Cross-Validation Rules
```typescript
// If ISO-P class, must be steel
if (iso_p_class) {
  assert(category === "STEEL" || category === "STAINLESS");
}

// If ISO-N class, must be aluminum
if (iso_n_class) {
  assert(category === "ALUMINUM");
}

// Machinability index reference
if (machinability_index) {
  assert(reference_material !== null);
}

// Kienzle operation-specific should be >= base
if (kc1_1_drilling && kc1_1) {
  assert(kc1_1_drilling >= kc1_1 * 0.8);
}
```

## 3.4 Required vs Optional Fields

### Required Fields (Must Have)
```
REQUIRED: [
  id,                    // Identification
  name,
  category,              // Classification
  family,
  tensile_strength,      // Mechanical (minimum)
  hardness_hrc OR hardness_hb,
  density,               // Physical
  thermal_conductivity,  // Thermal
  machinability_index,   // Machinability
  kc1_1, mc,             // Kienzle (minimum)
  data_source_primary,   // Metadata
  data_confidence,
  parameter_coverage,
  last_updated
]
```

### Highly Recommended (Should Have)
```
RECOMMENDED: [
  uns, din, jis,         // Standards
  yield_strength,        // More mechanical
  elastic_modulus,
  specific_heat,         // More thermal
  melting_point,
  chip_type,             // More machinability
  tool_wear_mode,
  taylor_C_carbide,      // Tool life
  taylor_n_carbide
]
```

### Optional (Nice to Have)
```
OPTIONAL: [
  iso, aliases,          // Extra identification
  similar_materials,
  image_url,
  jc_* parameters,       // FEA (if available)
  surface_* parameters,  // Surface finish
  coolant_* parameters   // Coolant details
]
```

---

# SECTION 4: SCHEMA DEFINITIONS

## 4.1 TypeScript Interface

```typescript
/**
 * PRISM v9.0 Material Schema
 * Complete 127-parameter material definition
 */
export interface Material {
  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTIFICATION (1-12)
  // ═══════════════════════════════════════════════════════════════════════════
  id: string;                          // Primary key
  name: string;                        // Display name
  uns?: string;                        // UNS number
  din?: string;                        // DIN/EN number
  jis?: string;                        // JIS standard
  iso?: string;                        // ISO designation
  aliases?: string[];                  // Common names
  manufacturer_names?: Record<string, string>;  // Vendor codes
  description?: string;                // Brief description
  typical_applications?: string[];     // Common uses
  similar_materials?: string[];        // Substitutes
  image_url?: string;                  // Visual reference

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSIFICATION (13-20)
  // ═══════════════════════════════════════════════════════════════════════════
  category: MaterialCategory;          // Top-level type
  family: string;                      // Sub-category
  group?: string;                      // Specific group
  iso_p_class?: ISO_P_Class;          // Steel class
  iso_m_class?: ISO_M_Class;          // Stainless class
  iso_k_class?: ISO_K_Class;          // Cast iron class
  iso_n_class?: ISO_N_Class;          // Aluminum class
  iso_s_class?: ISO_S_Class;          // Superalloy class

  // ═══════════════════════════════════════════════════════════════════════════
  // MECHANICAL (21-38)
  // ═══════════════════════════════════════════════════════════════════════════
  mechanical: {
    tensile_strength: number;          // MPa
    yield_strength?: number;           // MPa
    elongation?: number;               // %
    reduction_of_area?: number;        // %
    hardness_hrc?: number;             // HRC
    hardness_hb?: number;              // HB
    hardness_hv?: number;              // HV
    elastic_modulus?: number;          // GPa
    shear_modulus?: number;            // GPa
    poisson_ratio?: number;            // -
    fatigue_strength?: number;         // MPa
    impact_strength?: number;          // J
    fracture_toughness?: number;       // MPa√m
    compressive_strength?: number;     // MPa
    shear_strength?: number;           // MPa
    work_hardening_exp?: number;       // -
    strength_coefficient?: number;     // MPa
    strain_rate_sensitivity?: number;  // -
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // THERMAL (39-50)
  // ═══════════════════════════════════════════════════════════════════════════
  thermal: {
    thermal_conductivity: number;      // W/m·K
    specific_heat?: number;            // J/kg·K
    melting_point?: number;            // °C
    solidus_temp?: number;             // °C
    liquidus_temp?: number;            // °C
    thermal_expansion?: number;        // µm/m·K
    thermal_diffusivity?: number;      // mm²/s
    emissivity?: number;               // -
    max_service_temp?: number;         // °C
    annealing_temp?: number;           // °C
    tempering_temp?: number;           // °C
    austenitizing_temp?: number;       // °C
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICAL (51-56)
  // ═══════════════════════════════════════════════════════════════════════════
  physical: {
    density: number;                   // kg/m³
    crystal_structure?: CrystalStructure;
    magnetic?: boolean;
    electrical_resistivity?: number;   // µΩ·cm
    corrosion_resistance?: SeverityLevel;
    weldability?: QualityLevel;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MACHINABILITY (57-71)
  // ═══════════════════════════════════════════════════════════════════════════
  machinability: {
    machinability_index: number;       // %
    reference_material?: string;       // Reference ID
    chip_type?: ChipType;
    chip_breakability?: QualityLevel;
    built_up_edge_tendency?: SeverityLevel;
    abrasiveness?: SeverityLevel;
    work_hardening_severity?: SeverityLevel;
    cutting_temp_tendency?: SeverityLevel;
    surface_finish_quality?: QualityLevel;
    tool_wear_mode?: WearMode;
    recommended_tool_material?: string[];
    recommended_coating?: string[];
    recommended_coolant?: CoolantType;
    specific_cutting_energy?: number;  // J/mm³
    cutting_speed_multiplier?: number; // -
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // KIENZLE (72-83)
  // ═══════════════════════════════════════════════════════════════════════════
  kienzle: {
    kc1_1: number;                     // N/mm²
    mc: number;                        // -
    kc1_1_turning?: number;            // N/mm²
    kc1_1_milling?: number;            // N/mm²
    kc1_1_drilling?: number;           // N/mm²
    rake_angle_correction?: number;    // %/°
    wear_correction_factor?: number;   // -
    speed_correction_factor?: number;  // -
    coolant_correction_factor?: number;// -
    feed_force_ratio?: number;         // -
    passive_force_ratio?: number;      // -
    source?: string;                   // Data source
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // JOHNSON-COOK (84-91)
  // ═══════════════════════════════════════════════════════════════════════════
  johnson_cook?: {
    A: number;                         // MPa
    B: number;                         // MPa
    n: number;                         // -
    C: number;                         // -
    m: number;                         // -
    ref_strain_rate?: number;          // 1/s
    ref_temp?: number;                 // °C
    source?: string;                   // Data source
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TAYLOR (92-101)
  // ═══════════════════════════════════════════════════════════════════════════
  taylor: {
    C_carbide?: number;                // m/min
    n_carbide?: number;                // -
    C_ceramic?: number;                // m/min
    n_ceramic?: number;                // -
    C_hss?: number;                    // m/min
    n_hss?: number;                    // -
    feed_exp?: number;                 // -
    doc_exp?: number;                  // -
    hardness_factor?: number;          // -
    source?: string;                   // Data source
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SURFACE (102-109)
  // ═══════════════════════════════════════════════════════════════════════════
  surface?: {
    min_achievable_Ra?: number;        // µm
    typical_Ra_rough?: number;         // µm
    typical_Ra_finish?: number;        // µm
    surface_hardening_tendency?: SeverityLevel;
    smearing_tendency?: SeverityLevel;
    burr_formation_tendency?: SeverityLevel;
    Ra_speed_sensitivity?: number;     // -
    Ra_feed_sensitivity?: number;      // -
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COOLANT (110-117)
  // ═══════════════════════════════════════════════════════════════════════════
  coolant?: {
    water_soluble_compatible?: boolean;
    straight_oil_compatible?: boolean;
    synthetic_compatible?: boolean;
    semi_synthetic_compatible?: boolean;
    dry_machining_ok?: boolean;
    mql_compatible?: boolean;
    cryogenic_compatible?: boolean;
    recommended_concentration?: number; // %
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA (118-127)
  // ═══════════════════════════════════════════════════════════════════════════
  metadata: {
    data_source_primary: string;
    data_source_secondary?: string;
    data_confidence: DataConfidence;
    parameter_coverage: number;        // % (0-100)
    last_updated: string;              // ISO date
    updated_by?: string;
    version: number;
    notes?: string;
    validation_status: ValidationStatus;
    prism_internal_id: string;         // UUID
  };
}
```

## 4.2 JSON Schema (Abbreviated)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PRISM Material Schema v9.0",
  "type": "object",
  "required": ["id", "name", "category", "family", "mechanical", "thermal", 
               "physical", "machinability", "kienzle", "taylor", "metadata"],
  "properties": {
    "id": { "type": "string", "pattern": "^[A-Z0-9_]+$" },
    "name": { "type": "string", "minLength": 2, "maxLength": 100 },
    "category": { "enum": ["STEEL", "ALUMINUM", "TITANIUM", ...] },
    "mechanical": {
      "type": "object",
      "required": ["tensile_strength"],
      "properties": {
        "tensile_strength": { "type": "number", "minimum": 50, "maximum": 3000 },
        "hardness_hrc": { "type": "number", "minimum": 10, "maximum": 72 }
      }
    },
    "kienzle": {
      "type": "object",
      "required": ["kc1_1", "mc"],
      "properties": {
        "kc1_1": { "type": "number", "minimum": 200, "maximum": 6000 },
        "mc": { "type": "number", "minimum": 0.10, "maximum": 0.50 }
      }
    },
    "metadata": {
      "type": "object",
      "required": ["data_source_primary", "data_confidence", "parameter_coverage",
                   "last_updated", "validation_status", "prism_internal_id"],
      "properties": {
        "parameter_coverage": { "type": "number", "minimum": 0, "maximum": 100 }
      }
    }
  }
}
```

---

# SECTION 5: EXAMPLE MATERIAL

## 5.1 Fully Populated Material: AISI 4140

```json
{
  "id": "AISI_4140",
  "name": "AISI 4140 Alloy Steel",
  "uns": "G41400",
  "din": "1.7225",
  "jis": "SCM440",
  "iso": "42CrMo4",
  "aliases": ["4140", "Chrome-Moly", "Chromoly"],
  "manufacturer_names": {
    "sandvik": "MC P2.1.Z.AN",
    "kennametal": "P2"
  },
  "description": "Chromium-molybdenum alloy steel with good balance of strength, toughness, and wear resistance",
  "typical_applications": ["Gears", "Shafts", "Axles", "Spindles", "Tooling"],
  "similar_materials": ["AISI_4340", "AISI_4145", "AISI_4150"],
  "image_url": "/images/materials/4140_microstructure.jpg",
  
  "category": "STEEL",
  "family": "ALLOY_STEEL",
  "group": "Chromium-Molybdenum",
  "iso_p_class": "P2",
  
  "mechanical": {
    "tensile_strength": 1020,
    "yield_strength": 910,
    "elongation": 15,
    "reduction_of_area": 50,
    "hardness_hrc": 32,
    "hardness_hb": 302,
    "hardness_hv": 318,
    "elastic_modulus": 210,
    "shear_modulus": 80,
    "poisson_ratio": 0.29,
    "fatigue_strength": 490,
    "impact_strength": 54,
    "fracture_toughness": 90,
    "compressive_strength": 1100,
    "shear_strength": 612,
    "work_hardening_exp": 0.15,
    "strength_coefficient": 1200,
    "strain_rate_sensitivity": 0.015
  },
  
  "thermal": {
    "thermal_conductivity": 42.6,
    "specific_heat": 473,
    "melting_point": 1432,
    "solidus_temp": 1416,
    "liquidus_temp": 1460,
    "thermal_expansion": 12.3,
    "thermal_diffusivity": 11.9,
    "emissivity": 0.35,
    "max_service_temp": 450,
    "annealing_temp": 815,
    "tempering_temp": 540,
    "austenitizing_temp": 845
  },
  
  "physical": {
    "density": 7850,
    "crystal_structure": "BCC",
    "magnetic": true,
    "electrical_resistivity": 22,
    "corrosion_resistance": "LOW",
    "weldability": "FAIR"
  },
  
  "machinability": {
    "machinability_index": 65,
    "reference_material": "AISI_1212",
    "chip_type": "CONTINUOUS",
    "chip_breakability": "GOOD",
    "built_up_edge_tendency": "LOW",
    "abrasiveness": "MEDIUM",
    "work_hardening_severity": "MEDIUM",
    "cutting_temp_tendency": "MEDIUM",
    "surface_finish_quality": "GOOD",
    "tool_wear_mode": "FLANK",
    "recommended_tool_material": ["Carbide P10-P30", "Ceramic"],
    "recommended_coating": ["TiAlN", "AlCrN", "TiCN"],
    "recommended_coolant": "FLOOD",
    "specific_cutting_energy": 2.8,
    "cutting_speed_multiplier": 1.0
  },
  
  "kienzle": {
    "kc1_1": 1780,
    "mc": 0.26,
    "kc1_1_turning": 1780,
    "kc1_1_milling": 1890,
    "kc1_1_drilling": 2100,
    "rake_angle_correction": 1.5,
    "wear_correction_factor": 1.3,
    "speed_correction_factor": 0.95,
    "coolant_correction_factor": 0.92,
    "feed_force_ratio": 0.45,
    "passive_force_ratio": 0.35,
    "source": "Machining Data Handbook, 3rd Ed."
  },
  
  "johnson_cook": {
    "A": 595,
    "B": 580,
    "n": 0.133,
    "C": 0.023,
    "m": 1.03,
    "ref_strain_rate": 1.0,
    "ref_temp": 25,
    "source": "Johnson & Cook, 1983"
  },
  
  "taylor": {
    "C_carbide": 280,
    "n_carbide": 0.25,
    "C_ceramic": 450,
    "n_ceramic": 0.35,
    "C_hss": 45,
    "n_hss": 0.125,
    "feed_exp": 0.75,
    "doc_exp": 0.15,
    "hardness_factor": 1.0,
    "source": "Machining Data Handbook, 3rd Ed."
  },
  
  "surface": {
    "min_achievable_Ra": 0.4,
    "typical_Ra_rough": 6.3,
    "typical_Ra_finish": 1.6,
    "surface_hardening_tendency": "MEDIUM",
    "smearing_tendency": "LOW",
    "burr_formation_tendency": "MEDIUM",
    "Ra_speed_sensitivity": 1.2,
    "Ra_feed_sensitivity": 2.1
  },
  
  "coolant": {
    "water_soluble_compatible": true,
    "straight_oil_compatible": true,
    "synthetic_compatible": true,
    "semi_synthetic_compatible": true,
    "dry_machining_ok": false,
    "mql_compatible": true,
    "cryogenic_compatible": false,
    "recommended_concentration": 8
  },
  
  "metadata": {
    "data_source_primary": "ASM Handbook Vol. 1",
    "data_source_secondary": "Machining Data Handbook, 3rd Ed.",
    "data_confidence": "HIGH",
    "parameter_coverage": 100,
    "last_updated": "2026-01-24",
    "updated_by": "PRISM_v9_Migration",
    "version": 1,
    "notes": "Fully populated reference material for alloy steel category",
    "validation_status": "APPROVED",
    "prism_internal_id": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

---

# SECTION 6: INTEGRATION

## 6.1 Skill Metadata

```yaml
skill_id: prism-material-schema
version: 1.0.0
category: materials-system
priority: HIGH

triggers:
  keywords:
    - "material schema", "material structure"
    - "127 parameters", "parameter list"
    - "add material", "define material"
  contexts:
    - Creating new material entries
    - Validating material data
    - Understanding parameter requirements

activation_rule: |
  IF (need material structure definition)
  THEN activate prism-material-schema
  AND use as reference for all material work

outputs:
  - Parameter definitions
  - TypeScript interface
  - JSON schema
  - Example materials

related_skills:
  - prism-material-physics (uses parameters)
  - prism-material-lookup (accesses materials)
  - prism-material-validator (validates against schema)
  - prism-material-enhancer (fills missing parameters)
```

## 6.2 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-MATERIAL-SCHEMA QUICK REFERENCE                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  127 PARAMETERS IN 12 CATEGORIES                                                        │
│  ═══════════════════════════════                                                        │
│                                                                                         │
│  Identification (12)   │  Physical (6)        │  Taylor (10)                            │
│  Classification (8)    │  Machinability (15)  │  Surface (8)                            │
│  Mechanical (18)       │  Kienzle (12)        │  Coolant (8)                            │
│  Thermal (12)          │  Johnson-Cook (8)    │  Metadata (10)                          │
│                                                                                         │
│  REQUIRED FIELDS (minimum viable material):                                             │
│  • id, name, category, family                                                           │
│  • tensile_strength, hardness (HRC or HB)                                               │
│  • density, thermal_conductivity                                                        │
│  • machinability_index, kc1_1, mc                                                       │
│  • data_source_primary, data_confidence, parameter_coverage                             │
│                                                                                         │
│  VALIDATION RULES:                                                                      │
│  • yield_strength ≤ tensile_strength                                                    │
│  • solidus_temp ≤ melting_point ≤ liquidus_temp                                         │
│  • All values within physics-based ranges                                               │
│  • ISO class must match material category                                               │
│                                                                                         │
│  KEY CONSUMERS:                                                                         │
│  • Kienzle params → cutting_force_engine                                                │
│  • Taylor params → tool_life_engine                                                     │
│  • J-C params → FEA simulation                                                          │
│  • Mechanical → deflection, chatter                                                     │
│  • Thermal → temperature, coolant                                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# DOCUMENT END

**Skill:** prism-material-schema
**Version:** 1.0
**Total Sections:** 6
**Part of:** SP.3 Materials System (SP.3.1 of 5)
**Created:** Session SP.3.1
**Status:** COMPLETE

**Key Features:**
- Complete 127-parameter definition
- 12 parameter categories with purpose
- Data types, units, and validation ranges
- Relationship validations
- TypeScript interface and JSON schema
- Fully populated example material (AISI 4140)

**Principle:** Every parameter serves a calculation purpose.

---
