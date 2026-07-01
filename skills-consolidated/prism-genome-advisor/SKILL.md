---
name: prism-genome-advisor
version: 1.0.0
description: |
  Manufacturing Genome advisory skill for material DNA queries and genome-based
  parameter prediction. Leverages the ManufacturingGenomeEngine for material
  fingerprinting, genome matching, and parameter transfer across similar materials.

  Modules Covered:
  - ManufacturingGenomeEngine (genome_fingerprint, genome_match, genome_transfer, genome_lineage)

  Gateway Routes: prism_intelligence → genome_*
  R10 Revolution: Rev 1 — Manufacturing Genome
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "genome", "DNA", "fingerprint", "material similarity", "parameter transfer", "lineage"
- User asks about material equivalents, transferring parameters between similar materials, or material family trees
- User wants to understand why two materials behave similarly or differently

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-genome-advisor")`
2. Identify the material(s) in question
3. Use genome actions via the intelligence dispatcher:
   - `prism_intelligence→genome_fingerprint` — Generate material DNA fingerprint
   - `prism_intelligence→genome_match` — Find similar materials by genome similarity
   - `prism_intelligence→genome_transfer` — Transfer known-good parameters to a new material
   - `prism_intelligence→genome_lineage` — Trace material family lineage and evolution

### What It Returns
- **Format**: Structured JSON with genome vectors, similarity scores, transfer recommendations
- **Success**: Material fingerprint with ISO class, property vectors, and similarity rankings
- **Failure**: Unknown material → verify material ID via `prism_data→material_search`

### Examples
**Example 1**: User asks "What parameters should I use for this new titanium alloy?"
→ `genome_fingerprint` the alloy → `genome_match` to find closest known materials → `genome_transfer` validated parameters with confidence scores

**Example 2**: User asks "Why does this Inconel behave differently than expected?"
→ `genome_fingerprint` → Compare against known Inconel genomes → `genome_lineage` to trace composition variations → Identify divergent properties

# MANUFACTURING GENOME ADVISOR

## Core Concepts

### Material DNA Fingerprint
Every material has a unique "genome" — a multi-dimensional vector encoding:
- **Mechanical properties**: hardness, tensile strength, yield strength, elongation
- **Thermal properties**: conductivity, specific heat, melting point
- **Machinability factors**: kc1.1 (specific cutting force), machinability rating, chip formation tendency
- **Chemical composition**: major alloying elements and their percentages

### Genome Matching
Materials with similar genomes behave similarly under machining. The matching algorithm:
1. Normalizes all properties to [0,1] range
2. Computes weighted Euclidean distance between genome vectors
3. Ranks matches by overall similarity score (0-1)
4. Filters by ISO material class compatibility

### Parameter Transfer
When machining a new or unfamiliar material:
1. Generate its genome fingerprint from known properties
2. Find the closest genome match with validated cutting parameters
3. Transfer parameters with confidence-weighted adjustments
4. Apply safety derating based on genome distance (further = more conservative)

### Material Lineage
Track how materials relate through:
- Alloy family trees (e.g., 300-series stainless steels)
- Composition evolution (how adding elements changes machinability)
- Cross-ISO-class bridges (materials at class boundaries)

## Dispatcher Actions

| Action | Input | Output |
|--------|-------|--------|
| `genome_fingerprint` | material ID or properties | DNA vector + ISO class + property breakdown |
| `genome_match` | fingerprint + count | Ranked list of similar materials with similarity scores |
| `genome_transfer` | source material + target material | Transferred parameters with confidence + safety notes |
| `genome_lineage` | material ID | Family tree, related alloys, composition evolution |

## Safety Notes
- Parameter transfer always includes a safety derating factor
- Materials with genome distance > 0.4 require manual validation
- Cross-ISO-class transfers are flagged with warnings
- Exotic alloys (S-class superalloys) require Opus-level review
