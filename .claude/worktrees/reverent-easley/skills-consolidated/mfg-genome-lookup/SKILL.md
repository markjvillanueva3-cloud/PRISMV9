---
name: mfg-genome-lookup
description: Look up manufacturing DNA profiles for known part types
---

# Part DNA Lookup

## When To Use
- Retrieving the manufacturing genome profile for a known part or part family
- Looking up historical manufacturing parameters encoded in a part's DNA
- Starting a new job and wanting to load proven parameters from a similar part
- Understanding the complete manufacturing identity of a part type

## How To Use
```
prism_intelligence action=genome_lookup params={part_id: "BRK-7075-001", include_history: true}
```

## What It Returns
- `genome` — complete manufacturing DNA profile with material, geometry, and process genes
- `material_gene` — material family, grade, hardness, and machinability index
- `geometry_gene` — feature complexity, tolerances, surface requirements, thin-wall flags
- `process_gene` — proven operation sequence, tool selections, and parameter sets
- `history` — production history with yield rates, cycle times, and quality data

## Examples
- Look up bracket genome: `genome_lookup params={part_id: "BRK-7075-001"}` — returns genome: Al-7075-T6, 14 features, 3 setups, tightest tolerance +/-0.025mm, proven cycle time 18.4 min, 98.2% yield
- Look up with full history: `genome_lookup params={part_id: "SHAFT-4340-012", include_history: true}` — returns genome plus 340 production records, average tool life 85 parts, best parameters from batch #247
- Look up by part family: `genome_lookup params={family: "aerospace_brackets", material: "titanium"}` — returns 8 genome profiles for titanium bracket variants with shared process genes
