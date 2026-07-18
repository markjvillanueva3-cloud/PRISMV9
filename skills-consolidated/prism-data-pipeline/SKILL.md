---
name: prism-data-pipeline
description: |
  Data flow patterns for PRISM: material data ingestion, transformation, validation,
  and serving. ETL patterns for manufacturing intelligence data.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "data", "pipeline", "flow", "patterns", "material", "ingestion", "transformation"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-data-pipeline")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-data-pipeline") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What data parameters for 316 stainless?"
→ Load skill: skill_content("prism-data-pipeline") → Extract relevant data data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot pipeline issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Data Pipeline
## Ingest → Transform → Validate → Serve

## Pipeline Architecture
```
External Sources → Ingest → Transform → Validate → Registry → Serve
  │                  │          │          │          │         │
  Handbooks      Parse/     Normalize   Quality    In-memory  Dispatcher
  Databases      Extract    Units/Types  Grade A-F  Store     Queries
  Shop floor     Format     Enrich       Bounds     Index
```

## Stage 1: Ingest
**Sources:** Material handbooks, machine specs, tool catalogs, shop floor data
**Formats:** JSON, CSV, manual entry, API import
**Rules:**
- Tag every record with source and timestamp
- Preserve original values (transform creates copies)
- Log ingestion count for anti-regression

## Stage 2: Transform
- **Unit normalization:** Convert all to SI (mm, m/min, N, °C, MPa)
- **Type coercion:** Strings → numbers for numeric fields, with validation
- **Enrichment:** Calculate derived values (e.g., specific cutting force from test data)
- **Deduplication:** Match on ID + category, merge rather than overwrite

## Stage 3: Validate
Apply `prism_validate→material` or equivalent:
- **Completeness:** Count populated fields / 127 total
- **Range checks:** Each parameter within physical bounds
- **Consistency:** Cross-check related parameters
- **Quality grade:** A(>90%) B(>75%) C(>60%) D(>40%) F(<40%)

**Gate:** Grade D or F materials get flagged, not served to calculations without warning.

## Stage 4: Registry (In-Memory Store)
- Materials: 3,518+ records, 127 params each
- Machines: 824+ records, 43 manufacturers
- Tools: 1,944+ records with geometry/coating data
- Alarms: 9,200+ codes across 12 controller families

**Access via:** `prism_data→material_get`, `machine_search`, `tool_recommend`, etc.

## Stage 5: Serve
- **Point queries:** Get material by ID (O(1) via Map)
- **Search:** Filter by category, property range (indexed)
- **Compare:** Side-by-side material comparison
- **Recommend:** ML-based tool recommendation for material+operation

## Data Quality Monitoring
| Metric | Target | Action if Missed |
|--------|--------|-----------------|
| Completeness | >75% avg | Run enhancer pipeline |
| Grade A records | >30% | Prioritize enhancement |
| Stale records | <5% | Flag for review |
| Duplicate rate | <1% | Run dedup |

## Anti-Regression for Data
Before ANY data pipeline run:
```
old_count = registry.count()
// ... run pipeline ...
new_count = registry.count()
ASSERT: new_count ≥ old_count
```
