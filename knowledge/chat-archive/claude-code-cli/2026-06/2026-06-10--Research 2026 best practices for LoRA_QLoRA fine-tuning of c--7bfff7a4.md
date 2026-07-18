---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Research 2026 best practices for LoRA/QLoRA fine-tuning of code/instruction mode"
date: "2026-06-10"
first_ts: "2026-06-10T15:03:55.067Z"
last_ts: "2026-06-10T15:06:09.283Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-af46fe9c02a8459d7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Research 2026 best practices for LoRA/QLoRA fine-tuning of code/instruction mode

> **claude-code-cli** | 2026-06-10 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/workflows/wf_d6fc4216-b84/agent-af46fe9c02a8459d7.jsonl`

## Transcript

### User | 2026-06-10T15:03:55.067Z

Research 2026 best practices for LoRA/QLoRA fine-tuning of code/instruction models on a SINGLE large-VRAM GPU (96GB): optimal rank, alpha, target_modules, batch/grad-accum, learning rate, multi-adapter serving (S-LoRA/punica-style), and DoRA/rsLoRA improvements over vanilla LoRA. Target hardware: RTX PRO 6000 Blackwell 96GB VRAM + Ryzen 9950X3D 32T + 136GB RAM + NVMe. Single-GPU large-VRAM box. Local LLMs via Ollama (qwen2.5-coder:32b heavy, gpt-oss:120b deep ~64GB, gpt-oss:20b mid, :1.5b trivial).

Return <=350 words of CONCRETE, CITED findings (URLs/paper names). Lead with the 2-3 highest-leverage actionable techniques. The current month is June 2026 -- prefer recent sources. End with a 'Sources:' list.

### Assistant | 2026-06-10T15:04:10.781Z

I'll research this directly since it's a focused technical question with a clear scope. Let me search for recent 2026 sources.

### Assistant | 2026-06-10T15:04:11.810Z

[tool_use: WebSearch]

### Assistant | 2026-06-10T15:04:12.076Z

[tool_use: WebSearch]

### User | 2026-06-10T15:04:57.641Z

[tool_result] Web search results for query: "S-LoRA Punica multi-adapter serving single GPU 2025 2026"

I'll search for information about S-LoRA, Punica, and multi-adapter serving on single GPU.

Links: [{"title":"Punica: Multi-Tenant LoRA Serving","url":"https://proceedings.mlsys.org/paper_files/paper/2024/hash/054de805fcceb78a201f5e9d53c85908-Abstract-Conference.html"},{"title":"Efficient and cost-effective m
... [+5922 chars truncated]

### User | 2026-06-10T15:05:06.741Z

[tool_result] Web search results for query: "QLoRA LoRA fine-tuning best practices 2026 rank alpha rsLoRA DoRA learning rate"

I'll search for information on QLoRA and LoRA fine-tuning best practices.

Links: [{"title":"Beginner's Guide to LoRA Fine-Tuning - Everyday IT","url":"https://www.ai-infra-link.com/a-beginners-guide-to-lora-fine-tuning-boost-your-ai-model-performance/"},{"title":"Master LoRA and QLoRA:
... [+7571 chars truncated]

### Assistant | 2026-06-10T15:05:16.306Z

I have enough for a tight, cited answer. Let me confirm vLLM's current multi-LoRA support since that's the practical serving path on this box.

### Assistant | 2026-06-10T15:05:22.741Z

[tool_use: WebSearch]

### User | 2026-06-10T15:05:46.304Z

[tool_result] Web search results for query: "vLLM multi-LoRA serving production max_loras 2025 enable-lora throughput"

I'll search for information about vLLM multi-LoRA serving in production.

Links: [{"title":"Deploy multi-LoRA adapters on LLMs | Anyscale Docs","url":"https://docs.anyscale.com/llm/serving/multi-lora"},{"title":"[vLLM vs TensorRT-LLM] #10 Serving Multiple LoRAs at Once - The official SqueezeBi
... [+5707 chars truncated]

### Assistant | 2026-06-10T15:06:09.283Z

**Highest-leverage techniques (2026, single 96GB Blackwell box):**

1. **rsLoRA at rank 32-64 is the default, not vanilla LoRA.** rsLoRA's α/√r scaling (vs α/r) prevents gradient collapse at higher ranks and *also* improves low-rank learning — the original "low rank suffices" guidance is now considered a misconception. On 96GB VRAM you have no reason to stay at r=8/16: push r=32 (general SFT) to r=64 (coding/multi-turn) with `use_rslora=True`. Set **α = 2×r** (so 64-128) ([rsLoRA paper](https://arxiv.org/pdf/2312.03732); [HF rsLoRA blog](https://huggingface.co/blog/damjan-k/rslora); [Raschka tips](https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms)).

2. **DoRA for a free accuracy bump (+1-4.4% on commonsense, zero inference overhead) — but use a SEPARATE, higher LR for the magnitude vector.** Same-LR DoRA *underperforms* plain LoRA because magnitude/direction gradients differ in scale. `use_dora=True` in PEFT/Unsloth ([Unsloth hyperparameter guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide/lora-hyperparameters-guide)).

3. **Target ALL attention + MLP projections** (`q,k,v,o,gate,up,down_proj`). Attention-only LoRA measurably underperforms ([QLoRA practice, Raschka](https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms)).

**Core hyperparameters:** LR **2e-4**, cosine schedule, ~3% warmup; **2-3 epochs**; effective batch **16-64** via grad-accum (smaller micro-batch + accumulation generalizes well and fits comfortably). With 96GB, prefer **16-bit LoRA over 4-bit QLoRA** for a 32B model — QLoRA's value is VRAM savings you don't need; reserve 4-bit only for 70B+/120B targets ([LLM fine-tuning 2026](https://hjlabs.in/AIML/blog/post/llm-fine-tuning-best-practices.html); [FinLoRA benchmark](https://arxiv.org/pdf/2505.19819)).

**Multi-adapter serving (S-LoRA/Punica-style):** Use **vLLM's native multi-LoRA** — `--enable-lora`, `--max-lora-rank 64` (set to your largest adapter, not higher — wastes VRAM/KV-cache
... [+1236 chars truncated]
