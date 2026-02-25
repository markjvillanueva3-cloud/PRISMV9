---
name: mfg-genome-fingerprint
description: Generate unique manufacturing DNA fingerprints for parts
---

# Manufacturing Fingerprint Generator

## When To Use
- Creating a new manufacturing DNA fingerprint for a part entering production
- Encoding part characteristics into a standardized genome format
- Generating a unique identifier that captures a part's complete manufacturing identity
- Registering a new part type in the genome database for future similarity matching

## How To Use
```
prism_intelligence action=genome_fingerprint params={part_id: "NEW-BRK-001", material: "aluminum_7075_T6", features: ["pocket", "holes", "chamfer"], tolerances: {tightest: 0.025, general: 0.1}, weight_kg: 0.45}
```

## What It Returns
- `fingerprint_id` — unique genome fingerprint identifier (e.g., GEN-BRK-7075-001)
- `genome_hash` — compact hash representing the full manufacturing DNA
- `gene_map` — structured map of all encoded manufacturing genes
- `complexity_score` — manufacturing complexity rating (1-10)
- `classification` — auto-classified part family and type

## Examples
- Fingerprint a new bracket: `genome_fingerprint params={part_id: "NEW-BRK-001", material: "aluminum_7075_T6", features: ["pocket", "holes_x6", "chamfer_x12"], tolerances: {tightest: 0.025}}` — returns GEN-BRK-7075-042, complexity 4.2, classified as "prismatic bracket, medium complexity"
- Fingerprint a turned shaft: `genome_fingerprint params={part_id: "NEW-SHAFT-002", material: "steel_4340", features: ["OD_turning", "threading_M20", "keyway", "groove"], tolerances: {tightest: 0.012}}` — returns GEN-SHAFT-4340-018, complexity 5.8, classified as "rotational shaft, high precision"
- Fingerprint from drawing data: `genome_fingerprint params={part_id: "NEW-HSG-003", material: "A356_casting", features: ["bore_x3", "face_x4", "pocket_x2", "thread_x8"], weight_kg: 3.2}` — returns GEN-HSG-356-007, complexity 6.5, classified as "cast housing, multi-feature"
