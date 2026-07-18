# RLHF, DPO, GRPO, and RLVR (INDIA)

**Galaxy:** INDIA (AI/NN/GNN/LoRA/RAG Training)
**Status:** Core Techniques - Master Level

## Overview
Reinforcement Learning from Human Feedback (RLHF) and its successors are used to align models with desired behavior using preference data or verifiable rewards.

## Key Methods
- **RLHF**: Train a reward model on human rankings, then use PPO.
- **DPO (Direct Preference Optimization)**: Optimizes preference pairs directly without a separate reward model.
- **GRPO (Group Relative Policy Optimization)**: Samples multiple responses per prompt and normalizes rewards within the group (used in DeepSeek R1).
- **RLVR (Reinforcement Learning with Verifiable Rewards)**: Uses a checker or compiler to provide verifiable scores (key for math and code).

## PRISM Implementation
- RLVR is particularly relevant for manufacturing (verifiable constraints on forces, tolerances, safety).
- GRPO-style relative ranking can be used when human preference data is expensive.

## Edge Cases
- Tasks without a clear verifier (e.g., creative writing, some RAG answers) still require a judge LLM or hand-crafted reward.
- RULER-style relative ranking (used in OpenPipe ART) is a promising direction for PRISM.

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)