# Instruction Tuning Variants (INDIA)

**Galaxy:** INDIA (AI/NN/GNN/LoRA/RAG Training)
**Status:** Core Technique - Master Level

## Description
Instruction tuning trains models on (instruction, response) pairs so they follow directions rather than just continuing text. Variants include prefix tuning, p-tuning, and adapter-based methods.

## Key Variants
- **Instruction Tuning** — Supervised fine-tuning on instruction-response pairs.
- **Prefix Tuning** — Prepends trainable vectors to keys and values at every layer.
- **P-Tuning** — Optimizes continuous prompt embeddings through a small encoder.
- **Adapter Tuning** — Inserts small trainable modules between transformer layers.

## PRISM Implementation
- Instruction tuning is foundational for domain-specific PRISM agents.
- Adapter and prefix methods are memory-efficient alternatives to full fine-tuning.

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)