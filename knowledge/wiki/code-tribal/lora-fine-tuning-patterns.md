---
name: lora-fine-tuning-patterns
category: code-tribal
domain: backend-dev
tags: [lora, fine-tuning, peft, ewc, adalora, deep-learning, ai-development]
last_updated: 2026-05-18
---

# LoRA Fine-Tuning Patterns — PRISM 200+ adapter playbook

PRISM ships 200+ LoRA adapters across mill, lathe, WEDM, CAM. Each captures a narrow domain skill on a shared base model.

## What LoRA is

Low-Rank Adaptation: add delta = BA (rank-r matrices) to frozen W. Inference uses (W + alpha BA) x. Frozen base preserves general capability; rank-r delta captures the domain.

Three knobs: r (4-32; PRISM defaults r=8 mill, r=16 WEDM), alpha (typically 2r), target modules (Q/V attention + MLP-up/down).

## When to LoRA vs RAG vs in-context

Stable + 10k examples = LoRA. Stable + small = few-shot. Changes weekly = RAG. Current task = in-context.

## EWC — preserve prior LoRA skills

Naive training forgets prior skill ("catastrophic forgetting"). EWC adds Fisher-weighted L2 penalty. PRISM xproc_ewc_* wraps this.

## AdaLoRA — adaptive rank

Prune ranks by importance during training. PRISM AdaLoRARankAllocatorEngine (U-LEARN-05).

## PRISM LoRA lifecycle

Ingest corpus, validate, train-with-EWC, validate-against-gates, auto-promote ONLY on gate pass, drift-detect, retrain. Promote ONLY when gates pass.

## Per-customer LoRAs (JM Die)

Per-customer adapters from 100+ JM Die customer folders. Captures customer-specific fixture style, tolerance interpretation, post flavor. Closed loop: data → LoRA → recommendation → feedback → next training.

## Quantization

fp16 base, int8 BA delta (4x saving), int4 for low-stakes (8x saving).

## Adversarial validation

Hold out 5%, require LoRA primary metric > base by 5% absolute. Fail = retrain or abandon.

## Drift detection

lora_drift_record + lora_drift_check_all_clear track residuals; KS p<0.05 triggers retrain.

## Related

- [[gradient-descent-and-optimizers]] · [[deep-reasoning-doctrine]] · [[embedding-and-rag-patterns]] · [[conformal-prediction-uq]]
- CLAUDE.md OLLAMA-EXPAND-MS0, NN-GRAPH-MS1/MS2/NN-1
