---
name: reference-psn-r4-deep-stack-2026-05-25
description: "R4 spec — 50+ net-new systems extending R1+R2+R3 across 7 surfaces (deep learning, deep reasoning, AI systems, neural networks, GNN, Obsidian, /system-viz). Top-10 picks include HGT replacing GraphSAGE (+3-5% AUROC), PRISMVerifiedReasoningEngine, GraphRAG over PSN substrate. R1+R2+R3+R4 combined: ~150 systems across 9 layers."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.899Z
aliases: reference_psn_r4_deep_stack_2026_05_25
---


# PSN R4 deep-stack research — papa 2026-05-25

User directive: *"do further deep research on deep learning, deep reasoning, ai systems, neural network, gnn, obsidian, /system-viz to see what else we need to build and what more we need to synergize"*.

## Why R4 exists

R1+R2+R3 already inventoried ~100 systems. R4 covers the **net-new gap surface** the user named — 7 specific axes that R1/R2/R3 either skipped or undersampled. NOT a re-derivation.

## What R4 covers that R1/R2/R3 didn't

| Surface | R1+R2+R3 had | R4 net-new contribution |
|---|---|---|
| **Deep learning** | Training methods (DPO/KTO/STaR) | Post-Transformer architectures (Mamba, RWKV, Hyena), inference-time perf (FlashAttention-3, vLLM PagedAttention, speculative decoding) |
| **Deep reasoning** | MCTS+LLM, ToT/GoT, PoT/PAL, CoV | Inference-time compute scaling (o1/R1 style), self-critique constitution, CoV+RAG composite, Lean-light formal assertions |
| **AI systems** | DSPy, Magentic-One, LangGraph, Letta | AutoGen 0.4, CrewAI, OctoTools, Function-Calling FT, Anthropic's 5 agentic patterns rosetta stone |
| **Neural networks** | LoRA/QLoRA/DoRA/Spectrum/MoLE | Optimizers (Sophia/Lion), training tricks (μP, EMA, gradient checkpointing), QAT/GPTQ/AWQ |
| **GNN** | GraphSAGE only | HGT (heterogeneous graph transformer), GAT, GIN, GraphSAINT, PNA, DropEdge, GraphRAG over PSN |
| **Obsidian** | Memory leg pointer | Smart Connections, Dataview, Templater, JSON Canvas, Excalidraw, **inverse-direction bridge (vault → tribal)** |
| **/system-viz** | Roost overlay mechanism | Boolean roost composition, semantic zoom, edge bundling, **PSN-leg-state heatmap overlay**, time-scrubbing, per-slot color |

## R4 top-10 picks (time-to-first-value ordered)

1. **`scripts/lib/nn-training-recipe.mjs`** — pin cosine+warmup+EMA+checkpoint (1 day)
2. **PSN-leg-state heatmap overlay** in /system-viz (2 days)
3. **Per-roost transparency + Boolean composition** (2 days)
4. **Obsidian → tribal-embed-index hourly bridge** (3 days)
5. **`prism-agent-patterns-rosetta-stone.md`** — slot/octopus/scrutiny → CrewAI/AutoGen (3 days)
6. **PRISMVerifiedReasoningEngine** — CoV+RAG+PoT composite engine (1 week)
7. **Speculative decoding** — qwen2.5-coder:3b drafts + 7b verifies (1 week)
8. **GraphRAG over 110K-node PSN substrate + 12K tribal** (2 weeks)
9. **HGT replacing GraphSAGE in NN tier-5** (3 weeks — includes retrain; expected +3-5% AUROC)
10. **Function-Calling Fine-tuning** on PRISM dispatchers (1 month)

Total: ~7-8 weeks for full R4 top-10. First 5 picks ship in 2 weeks.

## The single highest-leverage finding

**PRISM's NN tier-5 is HOMOGENEOUS (GraphSAGE) on a HETEROGENEOUS graph** (L1-L11 layers, multiple status types — built/ghost/stub/pending, multiple edge types — contains/bridges/test_coverage). **HGT (Heterogeneous Graph Transformer) is designed for exactly this graph shape.** Replacing GraphSAGE with HGT is the architecture-side fix that pairs multiplicatively with the data-side fix the engine-wiki embedder shipped this session ([[reference_engine_wiki_embedder_2026_05_24]]).

Expected AUROC trajectory:
- Today: 0.5 (deferred — engine-wiki embedder running)
- After embedder completes: ~0.65-0.75 (data-side fix)
- After HGT migration: ~0.85+ (architecture-side fix)
- Gets past the 0.78 promotion gate

## Cross-leg compounding additions (beyond R3's loop)

R3 named the JM-DIE → DPO/KTO → LoRA → S-LoRA → ROUTE → CoV → emit loop. R4 adds:

```
                        PSN substrate (110K-node graph)
                                  ↓
                        GraphRAG-augmented retrieval
                                  ↓
                ┌─────────────────────────────────┐
                ↓                                 ↓
       PRISMVerifiedReasoningEngine        HGT-NN-tier-5
       (CoV + RAG + PoT)                   (heterogeneous graph)
                ↓                                 ↓
       Reasoning trace                     Dispatcher prediction
                ↓                                 ↓
                └─────────────────────────────────┘
                                  ↓
                    Function-Calling FT model invokes prism_*
                                  ↓
                          R3 loop (JM-DIE → DPO → LoRA → emit)
                                  ↓
                          Outcome → trained PSN substrate (close)
```

The new layer R4 adds: **PSN substrate becomes the retrieval + reasoning + prediction surface, not just the visualization render target**. /system-viz isn't just for humans — it's a queryable graph that the AI consumes via GraphRAG.

## Combined inventory R1+R2+R3+R4

**~150 specific systems** across **9 functional layers** (Retrieval, Memory, Reasoning, Training, Optimizers, Verification, Architecture, Inference-time perf, Visualization, Obsidian patterns).

The 4-spec series is now the canonical "what could we add" reference for the next 18 months of RGS planning.

## What I deliberately did NOT do

- No code changes — R4 is a research spec, not an implementation
- No envelope expansion — the named `PSN-DEEP-STACK-R4-MS0` would be a sister chat's deliberate close-out work
- No duplicate of R1/R2/R3 — only net-new systems for the 7 surfaces

## How to apply

- Future chat picking up "what to build next on the AI/training/viz side" → read R4 first, pick from the top-10 by time-to-first-value
- The single highest-ROI multi-pick combo: **picks 1 + 2 + 4 + 6 ship in 2 weeks AND pair with R3's first 4 picks for 8 weeks total** to get from current state to "compound substrate working end-to-end"

## Related

- Spec: `state/shared/specs/PSN-INCORPORATION-RESEARCH-R4-2026-05-25.md`
- R3: `state/shared/specs/PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md`
- R2: `state/shared/specs/PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md`
- R1: `state/shared/specs/PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md`
- [[psn-deep-learning-reasoning-training-substrate]] — data-side substrate (same session)
- [[college-courses-psn-incorporation]] — course-corpus side (same session)
- [[reference_psn_training_substrate_2026_05_25]] — sister deliverable
- [[deep-reasoning-doctrine]] — 4-tier model ladder
- [[feedback_psn_definition]] — 11-leg PSN map
