---
name: mfg-genome-search
description: Search and list parts by genome attributes
---

# Genome Search Engine

## When To Use
- Searching the genome database by material, feature type, complexity, or other attributes
- Listing all parts in a genome family or category
- Finding parts that match specific manufacturing criteria for process standardization
- Querying the genome database for reporting or analytics

## How To Use
```
prism_intelligence action=genome_search params={material: "titanium", complexity_min: 5, features: ["pocket"], limit: 20}
prism_intelligence action=genome_list params={family: "aerospace_brackets", sort: "complexity"}
```

## What It Returns
- `results` — matching genome entries with summary data
- `count` — total number of matching genomes in the database
- `facets` — available filter options for narrowing results (materials, families, complexity ranges)
- `genome_summaries` — compact summary of each matching genome's key genes
- `statistics` — aggregate statistics across matched genomes (avg cycle time, avg complexity, etc.)

## Examples
- Search titanium parts: `genome_search params={material: "titanium", limit: 10}` — returns 23 total titanium genomes, top 10 by production volume, average complexity 6.2, average cycle time 34.5 min
- List bracket family: `genome_list params={family: "aerospace_brackets", sort: "complexity"}` — returns 15 bracket genomes sorted by complexity (2.1 to 7.8), spanning aluminum, titanium, and steel families
- Search by features: `genome_search params={features: ["5axis_contouring", "thin_wall"], tolerance_max: 0.02}` — returns 8 genomes requiring 5-axis with thin walls under 0.02mm tolerance, all complexity >6.0
