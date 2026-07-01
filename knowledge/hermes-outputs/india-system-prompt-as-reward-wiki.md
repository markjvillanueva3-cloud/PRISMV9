# System Prompt as Reward Function (INDIA)

**Galaxy:** INDIA (AI/NN/GNN/LoRA/RAG Training)
**Status:** Advanced Technique - Master Level

## Description
Recent work (including ideas from Karpathy and labs like Anthropic/OpenAI/DeepSeek) shows that the system prompt itself can act as a reward function in RL-style training, guiding the model without a separate reward model.

## Key Idea
Instead of training a separate reward model, the agent's system prompt is used to judge and rank responses. This is the core of techniques like RULER.

## PRISM Implementation
- ZULU's system prompt and injected context already function partly as a reward signal.
- Can be extended to more formal RL-style loops where the system prompt ranks outputs.

## Edge Cases
- Prompt must be extremely well-engineered and stable.
- Relative ranking within a group of responses is more stable than absolute scoring.

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)