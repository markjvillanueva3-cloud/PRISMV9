---
title: Domain Self-Improving AI Template (india ai-training = the reference)
type: architecture
status: active
tags: [ai-training, self-improving, lora, india, fleet-rule, template, domain-ai]
created: 2026-05-29
by: claude-57dfea65 (slot:whiskey)
---

# Domain Self-Improving AI — fleet-wide template (clone india, customize per domain)

**Fleet rule (operator, 2026-05-29):** every PRISM domain builds & OWNS its own self-improving AI training system, customized to its domain. India's `ai-training` galaxy is the MAIN full-system AI and the canonical template. Domains clone the architecture, NOT reinvent it (R8). See [[feedback_domains_own_ai_training_systems]].

## Why per-domain (not one central AI)
Domain AI quality is bounded by domain-specific knowledge / outcomes / physics. Lathe physics ≠ WEDM discharge ≠ CAD feature-recog ≠ quoting cost models. A central AI can't be deeply tuned to each; per-domain loops learn from their own corpus + tribal + machining outcomes.

## Boundary (load-bearing)
Domain owns: the **engines + wiring + gated retrain-lifecycle script**. India owns: the **GPU training / inference compute** (`graphsage-train-pipeline.mjs`, Ollama deploy). Domains produce the *signal* (experience ledger, fused knowledge); india runs the trainer.

## The canonical 14-layer loop (clone this topology)
| layer | role | india reference |
|---|---|---|
| L1 knowledge-extraction | corpus+tribal+outcomes → training records | corpus-aggregation, knowledge-conversion 6-node router |
| L1-context | top-K RAG retrieval bundle | blueprint-rag, `xproc_rag_features` |
| L2 featurize | record → SFT/vector | dataset builders |
| L3 experience-ledger | append-only outcome ledger (predicted↔actual↔reward) | OutcomeFeedbackBus, `outcome-bus.jsonl` |
| L4 feedback-bus | pub/sub nervous system | `feedbackBusEngine` (shared singleton) |
| L_fuse fusion | physics-anchored multi-source fuse; surface conflicts (R7) | knowledge-conversion fusion, creative-reasoning |
| L5 train | online + auto-train | AITraining, RL, ActiveLearning |
| L6 inference | reasoning + LoRA inference | AIReasoning, DeepReasoning, gateways |
| L7 uncertainty | calibrated confidence + human-review gate | conformal / calibration monitors |
| L8 model-selection + ensemble | best-adapter-per-task + ensemble vote | per-task routing, MoE gating, voters |
| L9 outcome→drift→retrain lifecycle | the autonomy actuator (gated promote) | `nn-graph-retrain-lifecycle.mjs` |
| L10 continual learning | replay + EWC, no forgetting | continual-learning engines |
| L_meta meta-adaptation | learn the hyperparams of L8/L_fuse/L1-context per task family; gate on measured lift | MetaLearning (MAML), AdaptiveThreshold |
| L0 master-orchestrator | phase machine ties L1–L10, healthCheck, failover | master orchestrator |

## Per-domain build contract
1. Read india template + this blueprint. 2. Inventory existing domain AI/LoRA stack. 3. Map coverage to the layers above. 4. Build only MISSING layers (dedup-check THROWS first). 5. Wire the closed loop through `feedbackBusEngine` — every outcome publish goes through the bus, never a direct cross-engine call. 6. Ship the gated retrain-lifecycle (mirror `nn-graph-retrain-lifecycle.mjs`; **promote IFF `deferred===false && grade.pass===true`** — never auto-promote on regression; surface `deferred:true` loud per R12 when the ledger lacks labeled outcomes). 7. Per-file scrutiny + 3-of-3 + commit `[<slot>] [<DOMAIN>-LORA-MS#]/U-…`.

## First instance — whiskey/lathe
Lathe loop ~90% built (~65-engine LoRA stack already wired through `prism_turning`). Missing: outcome-feedback backbone + RAG context + fusion/selection/ensemble/meta tier (8 engines) + the gated lifecycle script. Plan: `state/shared/specs/LATHE-SELFIMPROVE-AI-PLAN.md`. Memory: [[reference_whiskey_lathe_selfimprove_ai_plan_2026_05_29]].

## Relationship to PSN-SELF-IMPROVING-LOOP-MS0 (not a fork — R7/R8)
`PSN-SELF-IMPROVING-LOOP-MS0` (`U-LOOP-WIRE`, `U-OUTCOME-INGEST-PROCESSOR`) is the **fleet / cross-domain** coordination loop. This template is the **per-domain** loop each domain owns. They **compose**: each domain's experience-ledger (L3) + retrain-lifecycle (L9) publish through `feedbackBusEngine` → the fleet PSN loop ingests them. A domain loop is a *producer* into the fleet loop, never a parallel reimplementation.

## Related
[[feedback_domains_own_ai_training_systems]] · [[feedback_ai_training_first_before_revenue]] · [[nn-graph-ms2]] · [[lathe-galaxy]]
