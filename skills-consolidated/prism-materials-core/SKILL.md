---
name: prism-materials-core
description: |
  Complete materials pipeline: Define→Template→Lookup→Validate→Enhance.
  127-parameter structure, category templates, fast access, quality grading, gap filling.
  Consolidates: material-schema, material-templates, material-lookup, material-validator, material-enhancer.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "materials", "core", "complete", "pipeline", "define", "template", "lookup"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-materials-core")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-materials-core") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What materials parameters for 316 stainless?"
→ Load skill: skill_content("prism-materials-core") → Extract relevant materials data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot core issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Materials Core
## 5-Stage Material Pipeline | 127 Parameters | 3,518+ Materials

## Pipeline Overview
```
DEFINE (Schema) → TEMPLATE (Defaults) → LOOKUP (Access) → VALIDATE (Grade) → ENHANCE (Fill Gaps)
```

## 1. SCHEMA (127 Parameters)

### Parameter Categories
| Category | Count | Key Parameters |
|----------|-------|----------------|
| Identity | 8 | id, name, standard, category, subcategory, uns_number, aliases, description |
| Mechanical | 12 | tensile_strength, yield_strength, elongation, hardness_HRC/HB/HV, elastic_modulus, poisson_ratio, shear_modulus, fatigue_strength, impact_energy |
| Thermal | 10 | thermal_conductivity, specific_heat, melting_point, thermal_expansion, max_service_temp, thermal_diffusivity |
| Kienzle (Cutting) | 8 | kc1_1, mc, kc1_1_milling, mc_milling, kc1_1_drilling, mc_drilling, chip_compression, chip_breakability |
| Johnson-Cook | 5 | jc_A, jc_B, jc_n, jc_C, jc_m |
| Taylor (Tool Life) | 4 | taylor_C, taylor_n, taylor_C_carbide, taylor_n_carbide |
| Physical | 6 | density, crystal_structure, magnetic_permeability, electrical_resistivity |
| Machinability | 12 | machinability_rating, recommended_speed_range, recommended_feed_range, recommended_doc_range, built_up_edge_tendency, work_hardening_rate, abrasiveness |
| Surface | 6 | achievable_Ra, minimum_Ra, surface_integrity_sensitivity |
| Coolant | 5 | coolant_requirement, flood_recommended, mql_suitable, dry_machining_possible |
| Cost/Supply | 8 | relative_cost, availability, lead_time, min_order_qty |
| Compliance | 6 | rohs_compliant, reach_compliant, itar_controlled, aerospace_approved |
| Processing | 12 | weldability, formability, castability, heat_treatment_response |
| Cross-Reference | 25 | equivalent_standards (DIN, JIS, BS, GOST), similar_materials, typical_applications |

### Data Types
- Numbers: always with units (MPa, W/m·K, m/min, etc.)
- Ranges: `{ min: number, max: number, typical: number }`
- Enums: category (30 values), crystal_structure (FCC/BCC/HCP)
- Booleans: compliance flags, suitability indicators

## 2. TEMPLATES (Category Defaults)

### Steel Template (modify kc1_1, hardness, tensile for specific grade)
```json
{ "category": "steel", "kc1_1": 1800, "mc": 0.25, "density": 7850,
  "thermal_conductivity": 50, "specific_heat": 486, "elastic_modulus": 210000,
  "poisson_ratio": 0.3, "machinability_rating": 60, "coolant_requirement": "flood" }
```

### Aluminum Template
```json
{ "category": "aluminum", "kc1_1": 700, "mc": 0.23, "density": 2700,
  "thermal_conductivity": 167, "specific_heat": 896, "elastic_modulus": 71000,
  "machinability_rating": 85, "coolant_requirement": "flood_or_mql" }
```

### Titanium Template
```json
{ "category": "titanium", "kc1_1": 1400, "mc": 0.23, "density": 4430,
  "thermal_conductivity": 7.2, "specific_heat": 526, "elastic_modulus": 114000,
  "machinability_rating": 22, "coolant_requirement": "high_pressure_flood" }
```

### Stainless Steel Template
```json
{ "category": "stainless_steel", "kc1_1": 2100, "mc": 0.26, "density": 8000,
  "thermal_conductivity": 16, "specific_heat": 500, "elastic_modulus": 193000,
  "machinability_rating": 45, "work_hardening_rate": "high" }
```

### Superalloy Template (Inconel/Waspaloy)
```json
{ "category": "superalloy", "kc1_1": 2800, "mc": 0.25, "density": 8220,
  "thermal_conductivity": 11, "specific_heat": 435, "elastic_modulus": 205000,
  "machinability_rating": 12, "coolant_requirement": "high_pressure_flood" }
```

Markers: values marked [MODIFY] in templates need grade-specific data. All others are safe defaults.

## 3. LOOKUP (Fast Access)

### Access Patterns
| Method | Dispatcher Action | Use When |
|--------|-------------------|----------|
| By ID | `prism_data→material_get({id})` | Know exact material |
| By name | `prism_data→material_search({name})` | Partial name match |
| By standard | `prism_data→material_search({standard:"AISI 4140"})` | Industry standard |
| By category | `prism_data→material_search({category:"steel"})` | Browse category |
| By property | `prism_data→material_search({min_tensile:800})` | Property filter |
| Compare | `prism_data→material_compare({ids:[a,b]})` | Side-by-side |

### Search Optimization
- First try exact ID match (O(1) hash lookup)
- Then standard cross-reference table
- Then fuzzy name search
- Cache frequently accessed materials in session state

## 4. VALIDATION (Quality Grading)

### Completeness Score
```
Score = (filled_parameters / required_parameters) × 100
```

### Quality Grades
| Grade | Completeness | Condition |
|-------|-------------|-----------|
| A | ≥95% | All critical params filled, cross-validated |
| B | ≥80% | All Kienzle + mechanical filled |
| C | ≥60% | Basic params filled, some gaps |
| D | ≥40% | Significant gaps, estimation needed |
| F | <40% | Unusable for calculations |

### Critical Parameters (Must Have for Grade B+)
- kc1_1, mc (cutting force calculation)
- density, thermal_conductivity, specific_heat (thermal)
- tensile_strength, hardness (tool selection)
- elastic_modulus (deflection)

### Range Validation
| Parameter | Valid Range | Unit |
|-----------|------------|------|
| kc1_1 | 300-4500 | N/mm² |
| mc | 0.10-0.45 | — |
| density | 1000-22000 | kg/m³ |
| thermal_conductivity | 0.1-430 | W/m·K |
| tensile_strength | 50-3000 | MPa |
| hardness_HRC | 10-72 | HRC |

### Consistency Checks
- tensile > yield (always)
- hardness correlates with tensile (within 20% of empirical formula)
- thermal_conductivity inversely correlates with hardness (for steels)

## 5. ENHANCEMENT (Gap Filling)

### Source Priority (Highest → Lowest Confidence)
1. Manufacturer datasheet (confidence: 0.95)
2. ASM/MPDB handbook (confidence: 0.90)
3. Published research paper (confidence: 0.85)
4. Similar material interpolation (confidence: 0.70)
5. Category average estimation (confidence: 0.50)
6. Physics-based calculation (confidence: 0.60-0.80)

### Estimation Methods
- **Hardness→Tensile:** σ_UTS ≈ 3.45 × HB (steels, ±10%)
- **Thermal from composition:** Wiedemann-Franz for metals
- **Kienzle from hardness:** kc1_1 ≈ f(HB, category) using regression tables
- **Johnson-Cook from tensile:** jc_A ≈ σ_yield, jc_B/n from curve fitting

### Confidence Tracking
Every estimated value MUST include:
```json
{ "value": 1800, "confidence": 0.70, "source": "interpolated from 4140/4340",
  "method": "similar_material", "estimated": true }
```

### Batch Enhancement Workflow
```
1. Run validator → get grade and missing params list
2. For each missing param: check source hierarchy
3. Fill with highest-confidence available source
4. Re-validate → check grade improvement
5. Flag remaining gaps for manual review
```
