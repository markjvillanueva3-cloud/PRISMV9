---
name: prism-material-schema
description: |
  Complete 127-parameter material structure. All categories and relationships defined.
---

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
