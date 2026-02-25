---
name: mfg-graph-infer
description: Infer new relationships from existing knowledge graph data
---

# Knowledge Graph Inference

## When To Use
- Deriving implicit relationships not explicitly stored in the graph
- Predicting material-tool compatibility from partial data
- Filling knowledge gaps using graph reasoning and transitivity
- Generating hypotheses about untested manufacturing combinations

## How To Use
```
prism_intelligence action=graph_infer params={source: "Ti-6Al-4V", target: "ceramic_insert", inference_type: "compatibility"}
```

## What It Returns
- `inferred_edges` — new relationships derived from graph reasoning
- `confidence` — inference confidence score (0-1)
- `reasoning_chain` — step-by-step logic path used for inference
- `supporting_evidence` — existing graph edges that support the inference
- `novelty_score` — how novel or unexpected the inference is

## Examples
- `graph_infer params={source: "Inconel 718", target: "trochoidal_milling", inference_type: "suitability"}` — infer strategy-material fit
- `graph_infer params={source: "ceramic_insert", inference_type: "failure_mode"}` — infer likely failure modes from related data
- `graph_infer params={domain: "turning", inference_type: "best_practice"}` — infer best practices from accumulated turning knowledge
