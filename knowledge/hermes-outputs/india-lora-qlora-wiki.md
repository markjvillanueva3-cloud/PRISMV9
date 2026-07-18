# LoRA & QLoRA (INDIA)

**Galaxy:** INDIA (AI/NN/GNN/LoRA/RAG Training)
**Status:** Core Technique - Master Level

## Description
LoRA (Low-Rank Adaptation) freezes the base model weights and trains two low-rank matrices as the update, resulting in 95–99% fewer parameters to fine-tune. QLoRA adds quantization of the base model for further memory efficiency.

## Key Advantages
- Dramatically lower memory and compute requirements
- Minimal performance loss compared to full fine-tuning on many tasks
- Enables fine-tuning of large models on consumer hardware

## PRISM Implementation
- Used in INDIA for domain-specific adaptation of models (e.g., manufacturing, CAD, post-processing)
- Integrated with the RAG and persistent memory systems

## Edge Cases
- Very small datasets can still benefit from QLoRA but require careful learning rate tuning
- Some tasks (especially those needing major capability shifts) still perform better with full fine-tuning or other methods

## References
- LoRA paper (Hu et al., 2021)
- QLoRA paper (Dettmers et al., 2023)
- DeepSeek and other labs' practical usage

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)