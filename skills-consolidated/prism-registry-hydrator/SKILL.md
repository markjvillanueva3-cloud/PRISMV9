---
name: prism-registry-hydrator
description: |
  Systematic approach to populating PRISM's critically sparse registries.
  Current crisis: Knowledge indexes 521 materials, 402 machines, 10,033 alarms,
  515 formulas — but Data layer loads only 707 materials, 2 machines, 0 alarms,
  0 formulas. 95% of PRISM's intelligence is LOCKED behind broken pipelines.
  This skill provides the methodology, data sources, and validation chains
  to hydrate every registry to operational levels.
  Use when: Addressing W5 (knowledge recovery), populating registries,
  fixing data pipeline issues, or adding new data sources.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "registry", "hydrator", "systematic", "approach", "populating", "critically", "sparse"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-registry-hydrator")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-registry-hydrator") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What registry parameters for 316 stainless?"
→ Load skill: skill_content("prism-registry-hydrator") → Extract relevant registry data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot hydrator issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Registry Hydrator
## Unlock 95% of PRISM's Locked Intelligence

## THE DATA CRISIS

```
Registry          Knowledge Index    Data Layer    Gap
─────────────────────────────────────────────────────
Materials         521                707*          OK (data > index)
Machines          402                2             99.5% LOCKED
Alarms            10,033             0             100% LOCKED
Formulas          515                0             100% LOCKED
Tools             0                  8             No index
─────────────────────────────────────────────────────
* Materials: data files exist but Kienzle coefficients may be incomplete
```

**Impact:** With 0 alarms loaded, alarm_decode returns nothing. With 2 machines,
machine_capabilities is nearly useless. With 0 formulas, formula_get returns nothing.
The dispatchers EXIST. The actions WORK. The data is ABSENT.

## DIAGNOSIS PROTOCOL

Before hydrating, diagnose WHERE the pipeline breaks:

```
Step 1: prism_knowledge→stats
  → Shows what the SEARCH INDEX knows about

Step 2: prism_data→material_search(query="steel")
  → Shows what the DATA LAYER can actually return
  
Step 3: Compare counts
  → If knowledge > data: Index sees files that data layer can't parse
  → If data > knowledge: Data exists but index hasn't been built
  → If both 0: Neither layer has the data
```

### Known Pipeline Architecture
```
Data Files (JSON/JS) → Registry Loader → In-Memory Store → Dispatcher Actions
     ↓                      ↑
Knowledge Indexer ──────────┘ (separate path)
```

The Registry Loader and Knowledge Indexer read the SAME files but through
DIFFERENT code paths. They can disagree. W5 is about fixing this.

## HYDRATION STRATEGY PER REGISTRY

### MACHINES (Priority: CRITICAL — 2 of 402 loaded)

**Data source:** Machine tool manufacturer specifications
**Format needed:** JSON with standardized fields

```json
{
  "id": "DMG-DMU50-3rd",
  "manufacturer": "DMG MORI",
  "model": "DMU 50 3rd Generation",
  "type": "5-axis_mill",
  "axes": 5,
  "max_rpm": 20000,
  "max_power_kw": 35,
  "max_torque_Nm": 130,
  "table_size_mm": [500, 450],
  "travel_xyz_mm": [500, 450, 400],
  "rapid_traverse_m_min": 60,
  "tool_changer_positions": 30,
  "weight_kg": 6800,
  "controller": "Siemens 840D sl"
}
```

**Hydration approach:**
1. Identify top 50 machines by market share (covers ~80% of shops)
2. Extract specs from manufacturer datasheets (manus→web_research)
3. Batch create via ATCS work units
4. Validate against known specs (prism_validate→completeness)
5. Cross-reference with material compatibility data

**Top 50 priority machines:**
- DMG MORI: DMU 50, DMU 80, NLX 2500, CTX beta
- HAAS: VF-2, VF-4, ST-20, UMC-750
- Mazak: Integrex, VCN-530C, Quick Turn
- Okuma: GENOS M560, LU3000, MU-5000V
- Doosan: DNM 500, PUMA 2600
- Makino: a51nx, PS95
- Hurco: VMX50, TM8i
- Brother: Speedio, TC-S2D

### ALARMS (Priority: CRITICAL — 0 of 10,033 loaded)

**Data source:** Controller manufacturer alarm documentation
**Knowledge already has 10,033 indexed** — the data FILES likely exist.

**Diagnosis first:**
```
1. Find alarm data files: Desktop Commander search for alarm*.json/js
2. Check if files are parseable by current registry loader
3. Fix parser if needed (likely a format mismatch)
4. Reload and verify: prism_data→alarm_decode should work
```

**If files don't exist, create from knowledge:**
```
1. prism_knowledge→search("alarm FANUC") → get indexed entries
2. Extract structured alarm data
3. Write to proper format for registry loader
4. Verify round-trip: knowledge→data→dispatch
```

**Priority alarm sets:**
- FANUC: ~2,000 alarms (most common controller worldwide)
- HAAS: ~500 alarms (largest US market share)  
- Siemens: ~1,500 alarms (dominant in Europe)
- Mazak: ~800 alarms (major player)

### FORMULAS (Priority: HIGH — 0 of 515 loaded)

**Knowledge has 515 formulas indexed.** Same diagnosis as alarms:

```
1. Find formula data files
2. Check parser compatibility
3. Fix and reload
```

**Critical formulas to verify:**
- Taylor tool life: T = C / (Vc^n × fz^m × ap^p)
- Kienzle cutting force: Fc = kc1.1 × h^(1-mc) × b
- Surface roughness: Ra = fz² / (32 × r_nose)
- MRR: Q = Vc × fz × z × ap × ae / 1000
- Specific cutting energy: kc = Fc / (ap × fz)

### TOOLS (Priority: MEDIUM — 8 loaded, 0 indexed)

**Least data of any registry.** Needs both data AND indexing.

**Data source:** Tool manufacturer catalogs
**Priority manufacturers:** Sandvik Coromant, Kennametal, Walter,
Iscar, Mitsubishi, Seco, Kyocera, OSG

**Critical tool types:**
1. Solid carbide endmills (80% of milling operations)
2. Indexable milling cutters (face/shoulder)
3. Turning inserts (ISO standard geometries)
4. Drills (solid carbide, indexable)
5. Thread mills and taps

## VALIDATION CHAIN

Every hydrated entry must pass:

```
1. Schema validation: All required fields present and typed
2. Physical plausibility: Values within manufacturing reality
   - RPM > 0 and < 100,000
   - Power > 0 and < 500 kW
   - Dimensions > 0
3. Cross-reference: Machine X claims capability Y — does material
   data confirm Y is achievable?
4. Uniqueness: No duplicate IDs
5. Completeness: prism_validate→completeness ≥ 80%
```

## METRICS

Track hydration progress:

| Registry | Target | Milestone 1 | Milestone 2 | Full |
|----------|--------|------------|------------|------|
| Machines | 50 | Top 10 (20%) | Top 30 (60%) | 50 (100%) |
| Alarms | 5,000 | FANUC (40%) | +HAAS+Siemens (80%) | All (100%) |
| Formulas | 100 | Core 20 (20%) | Physics 50 (50%) | All (100%) |
| Tools | 200 | Endmills (25%) | +Inserts (60%) | All (100%) |

## INTEGRATION WITH W5

This skill IS the W5 execution plan. The roadmap says:
"W5: Knowledge recovery — registry loading fix"

The fix has two parts:
1. **Pipeline fix:** Ensure registry loader parses all data file formats
2. **Data hydration:** Ensure data files contain sufficient entries

This skill covers both. Start with diagnosis (is it a parser bug or missing data?),
then hydrate whatever's needed.
