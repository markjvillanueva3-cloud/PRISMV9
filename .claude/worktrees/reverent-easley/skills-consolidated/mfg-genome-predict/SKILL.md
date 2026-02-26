---
name: mfg-genome-predict
description: Predict manufacturing parameters from part genome data
---

# Genome Prediction Engine

## When To Use
- Predicting optimal manufacturing parameters for a new part based on genome similarity
- Estimating cycle time, tool life, and quality outcomes from genome data
- Auto-generating process plans by inferring from the part's DNA profile
- Getting parameter recommendations when no direct production history exists

## How To Use
```
prism_intelligence action=genome_predict params={genome_id: "GEN-BRK-7075-001", predict: ["cycle_time", "tool_life", "surface_finish"]}
```

## What It Returns
- `predictions` — predicted manufacturing parameters with confidence intervals
- `basis_parts` — similar parts used as the prediction basis with similarity scores
- `cycle_time_est` — predicted cycle time in minutes with +/- range
- `tool_life_est` — predicted tool life in parts or minutes
- `confidence` — overall prediction confidence (0-1) based on genome match quality

## Examples
- Predict for new bracket: `genome_predict params={genome_id: "GEN-BRK-7075-001", predict: ["cycle_time", "tool_life"]}` — returns cycle_time 16.2 +/-2.1 min, tool_life 120 +/-15 parts, confidence 0.87 based on 5 similar genomes
- Predict surface finish: `genome_predict params={genome_id: "GEN-SHAFT-4340-005", predict: ["surface_finish"]}` — returns Ra 0.8 +/-0.15 um achievable with current genome parameters, confidence 0.92
- Full parameter prediction: `genome_predict params={genome_id: "GEN-HOUSING-356-002", predict: "all"}` — returns complete parameter set: speeds, feeds, depths, tool selections, coolant strategy, estimated from 12 similar casting genomes
