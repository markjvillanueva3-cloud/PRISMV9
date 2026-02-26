---
name: mfg-genome-similar
description: Find similar parts by genome comparison for knowledge reuse
---

# Similar Part Finder

## When To Use
- Finding previously manufactured parts similar to a new job for knowledge reuse
- Comparing two part genomes to understand manufacturing differences
- Leveraging existing process knowledge when quoting or planning new work
- Building part families based on genome similarity for standardized processes

## How To Use
```
prism_intelligence action=genome_similar params={genome_id: "GEN-BRK-7075-001", top_n: 5, min_similarity: 0.7}
prism_intelligence action=genome_compare params={genome_a: "GEN-BRK-7075-001", genome_b: "GEN-BRK-6061-003"}
```

## What It Returns
- `similar_parts` — ranked list of similar parts with similarity scores (0-1)
- `comparison` — detailed gene-by-gene comparison between two genomes
- `shared_genes` — manufacturing genes that are identical or highly similar
- `divergent_genes` — genes that differ significantly and require attention
- `reuse_potential` — assessment of how much process knowledge can be reused

## Examples
- Find similar brackets: `genome_similar params={genome_id: "GEN-BRK-7075-001", top_n: 5}` — returns 5 similar parts: BRK-7075-003 (0.94), BRK-6061-002 (0.82), MNT-7075-001 (0.78), BRK-2024-001 (0.71), PLT-7075-005 (0.68)
- Compare two genomes: `genome_compare params={genome_a: "GEN-BRK-7075-001", genome_b: "GEN-BRK-6061-003"}` — returns 0.82 similarity, shared: feature set, setup sequence; divergent: material hardness gene (T6 vs T6511), tolerance gene (0.025 vs 0.05mm)
- Find family matches: `genome_similar params={genome_id: "GEN-SHAFT-4340-012", min_similarity: 0.85}` — returns 3 parts in the shaft family with >85% match, all share turning process gene and can use identical CNC program template
