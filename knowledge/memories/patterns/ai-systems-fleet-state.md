---
title: AI-systems fleet state
aliases: [ai-systems-fleet-state, ai-state-synthesis, nn-gnn-lora-rag-state]
tags: [patterns, ai-systems, nn, gnn, lora, rag, cag, octopus, synergy, awareness]
kind: ai-systems-state
generatedAt: 2026-06-11T19:52:13.455Z
source: scripts/ai-systems-fleet-state.mjs (deterministic from live state)
---

# AI-systems fleet state

> Live snapshot of PRISM's AI systems, persisted into the vault so every galaxy's
> awareness / CAG / RAG recall carries it. Regenerate: `node scripts/ai-systems-fleet-state.mjs`.

## GNN (GraphSAGE tier-5, wiring-inference)
- AUROC: **0.808** | embeddingMode: direct | holdoutN: 62 | deploy: active
- Selective-deploy @ tau=0.7: coverage **32.3%**, Brier 0.041, macroF1 1, classes 2
- Next lift = structural (H2GCN heterophily + ref-pool growth + GPU retrain) -- **india GPU lane**, NOT calibration.

## Octopus (multi-model consensus, deep-reasoning)
- Domains with consensus outcomes: **1** (9 records). Domains: hermes-zulu(9)
- SYNERGY GAP: consensus-of cross-substrate edges only materialize for domains with outcomes -> only 1 domain links today. Running octopus per galaxy grows the edge set fleet-wide.

## RAG / CAG / Ollama offload (local-inference substrate)
- Resident models (12): deepseek-r1:32b, qwen3-coder:30b, qwen2.5-coder:1.5b, gpt-oss:120b, qwen2.5-coder:32b, gpt-oss:20b, qwen3-vl:8b-instruct, qwen3-vl:8b, qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text:latest
- Offload rate: **9.1%** (target >=30%) | offloaded 80 / kept-on-Claude 797 | ~78,242 tokens saved

## AI-synergy (cross-galaxy)
- 34 galaxies audited: **strong 34** / partial 0 / weak 0; mean synergy 1
- Binary metric is saturated; real headroom is DEPTH (octopus reach above, GNN full-coverage), not the score.

Related: [[zulu-ledger-reconciler]] [[psn-octopus-fleet-synergy-ms0]] [[cross-substrate-synergy-ms0]] [[gnn-selective-deploy]]
