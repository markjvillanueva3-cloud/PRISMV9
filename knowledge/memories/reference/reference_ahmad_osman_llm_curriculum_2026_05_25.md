---
name: reference-ahmad-osman-llm-curriculum-2026-05-25
description: "Ahmad Osman's 'Step-By-Step LLM Engineering Projects (2026 Edition)' tweet/article — 34-project 21-part curriculum (BPE → capstone). Validates R4 picks; loop 'Build → Plot → Break → Explain → Ship' = PRISM per-file scrutiny in different terms. NOT a PRISM build target (PRISM uses Qwen); IS an academy course candidate."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.462Z
aliases: reference_ahmad_osman_llm_curriculum_2026_05_25
---


# Ahmad Osman — Step-By-Step LLM Engineering Projects (2026 Edition) — papa 2026-05-25

User shared: `https://x.com/TheAhmadOsman/status/2058745340895870985` (article tweet by @TheAhmadOsman, posted 2026-05-24, 19.4K views).

## What it is

A 34-project, 21-part, 12-week "build the LLM stack from scratch" curriculum. Author advocates Build → Plot → Break → Explain → Ship loop for every primitive (tokenizer, attention, KV cache, MoE, etc.) before reaching for frameworks. Goal: move from "I understand the concepts" to "I can build it".

## The 21-part structure (matched to PRISM R1/R2/R3/R4 inventory)

| Ahmad's Part | Topic | PRISM coverage status |
|---|---|---|
| I — Tokens | BPE, SentencePiece | ✅ Qwen tokenizer (Ollama tier); not a build target |
| II — Position | sinusoidal, learned, RoPE, ALiBi | ✅ R4 §1 names RoPE/YaRN as architecture choice if PRISM trains custom |
| III — Attention | single, multi-head, MQA, GQA, MLA, FlashAttention-3 | ✅ R4 §1 covers GQA + FlashAttention-3 explicitly |
| IV — Transformer block | residual stream, normalization | ✅ R4 §4 covers LayerNorm vs RMSNorm, pre-norm vs post-norm |
| V — Training loop | objectives, optimizers | ✅ R4 §4 covers Sophia/Lion + cosine warmup |
| VI — Decoding | greedy, top-k, top-p, speculative | ✅ R4 §1 covers speculative decoding (Medusa + Lookahead) |
| VII — KV cache | attention memory layout | ✅ R4 §1 covers PagedAttention (vLLM) |
| VIII — Long context | sliding window, context extension | ✅ R3 §1C covers LongLoRA; R4 §1 covers YaRN |
| IX — Efficient attention | FlashAttention-3, hardware-aware | ✅ R4 §1 explicit |
| X — MoE | Switch, Mixtral, DeepSeek-V3 (671B/37B), Llama 4, Qwen3, Kimi K2.6 (1T/32B) | ✅ R4 §1 covers; R3 §1C covers MoLE per-domain LoRA experts |
| XI — Beyond vanilla | Mamba/Mamba-2, RetNet, LLaDA, Dream, Mercury (diffusion LMs) | ✅ R4 §1 covers Mamba/Mamba-2/RetNet/Hyena — diffusion LMs noted as research only |
| XII — Data | FineWeb (15T), Dolma, DataComp-LM, synthetic (phi-1) | 🟡 R3 §1F covers Distilabel + Tülu 3 + Axolotl; FineWeb-style 15T pretraining is out-of-scope (PRISM doesn't pretrain) |
| XIII — Scaling laws | Kaplan, Chinchilla | 🟡 Reference knowledge; PRISM doesn't train from scratch |
| XIV — Post-training | InstructGPT, DPO, PPO, GRPO, RLVR, o1, R1, DeepSeekMath | ✅ R3 §1A covers DPO/KTO/IPO/SimPO/GRPO + §1B covers STaR/rStar-Math/REST-EM |
| XV — Quantization | GPTQ, AWQ, GGUF | ✅ R4 §4 covers; PRISM uses Q4_K_M qwen2.5-coder already |
| XVI — Serving | vLLM (PagedAttention), TensorRT-LLM, SGLang (RadixAttention) | ✅ R3 §1C covers S-LoRA; R4 §1 covers PagedAttention |
| XVII — Evaluation | HELM, MMLU, lm-eval-harness | 🟡 R3 §2E covers calibration + conformal prediction; HELM-style broad eval isn't wired |
| XVIII — RAG, tools, agents | original RAG, ReAct, Toolformer, DSPy | ✅ R1+R2 covers DSPy + Magentic-One; R4 §3 covers AutoGen 0.4/CrewAI/OctoTools |
| XIX — Multimodal | CLIP, Flamingo, LLaVA, Llama 4, Kimi K2.6 | 🟡 NOT in R1-R4; PRISM is text-only today. **R5 candidate**: multimodal (G-code + CAM screenshot + blueprint OCR) |
| XX — Interpretability + red-team | sparse autoencoders, Transformer-circuits, Constitutional AI | 🟡 R3 §2E covers Constitutional AI; sparse autoencoders + interpretability NOT in R4 |
| XXI — Capstone | train + tune + quantize + serve + evaluate + RAG + red-team + publish | n/a — PRISM doesn't train from scratch |

**Net new from Ahmad's roadmap that R1+R2+R3+R4 didn't cover:**
- **Multimodal LLM adapters (CLIP/Flamingo/LLaVA pattern)** — directly applicable to PRISM (G-code + CAM screenshot + blueprint OCR are different modalities)
- **Sparse autoencoder interpretability** — when PRISM AI decisions become contractual, this is the "why did the model pick X" surface
- **HELM-style broad eval** — PRISM's eval is per-engine; HELM is the full battery
- **Diffusion-style language modeling** — research-only; not for PRISM today

## The teaching loop = PRISM's per-file scrutiny in different terminology

| Ahmad | PRISM equivalent |
|---|---|
| Build it | Per-file scrutiny step 1: write the file |
| Plot it | Per-file scrutiny step 2: re-read against spec; plot metrics where applicable |
| Break it | R12 "fail-loud"; per-file scrutiny step 3 (dispatch reviewers, surface P0/P1 issues) |
| Explain it | Memory write loop (`reference_*.md` doctrine memos) + wiki entry per [[feedback_reflect_all_changes_post_update]] |
| Ship the artifact | Commit + per-leg memory + wiki + CLAUDE.md pointer |

This loop ALREADY EXISTS in PRISM under different terminology. **R4 doesn't need to import it — it's how PRISM operates.**

## What to ship in response

NOT a re-derivation. Three minimal artifacts:

1. **This memo** — pointer + cross-walk (shipping).
2. **Academy-course candidate** — Ahmad's 34 projects → an academy-course-* leaf if PRISM Academy wants the LLM-stack curriculum surface. Defer to academy-curating chat (lima slot).
3. **R5 candidate header** (do not write the full spec — sufficient as a pointer):
   - §1 Multimodal adapters for PRISM (G-code + CAM screenshot + blueprint OCR)
   - §2 Sparse autoencoder interpretability for PRISM AI decisions
   - §3 HELM-style broad evaluation harness
   - §4 Diffusion-LM research watch (defer)

## How to apply

- **For future R5 spec author**: the 4 net-new topics above are the seed. Cross-reference Ahmad's article + R4 §1+§4 for the architecture-side foundation.
- **For lima slot**: 34 projects → 21 academy-course leaves. Consider as PRISM Academy curriculum expansion (one-time, single chat).
- **For PRISM substrate work**: nothing changes — R4's top-10 picks are validated against Ahmad's curriculum, no re-ordering needed.

## What the article validates (R4 sanity check)

Every major R4 §1 architecture pick (RoPE/YaRN, GQA, MoE, MLA, FlashAttention-3, speculative decoding, PagedAttention, GPTQ/AWQ) appears in Ahmad's curriculum. R4 §3 agent picks (DSPy, AutoGen, CrewAI, Toolformer-style FCFT) appear. R4 §5 GNN section is **the only PSN-specific area not covered by Ahmad** — confirms HGT pick was independent and correct.

## Related

- Article: `https://x.com/TheAhmadOsman/status/2058745340895870985` (Ahmad Osman, 2026-05-24)
- [[reference_psn_r4_deep_stack_2026_05_25]] — R4 spec (same session, papa)
- [[reference_psn_training_substrate_2026_05_25]] — R3 data-side substrate (same session, papa)
- [[reference_college_courses_psn_incorporation_2026_05_25]] — academy course wiring (same session, papa)
- [[deep-reasoning-doctrine]] — 4-tier model ladder
- R4 spec: `state/shared/specs/PSN-INCORPORATION-RESEARCH-R4-2026-05-25.md`
