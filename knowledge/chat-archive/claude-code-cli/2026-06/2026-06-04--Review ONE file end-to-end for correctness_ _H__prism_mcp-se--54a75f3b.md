---
type: "chat-session"
source: "claude-code-cli"
session_id: "54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6"
title: "Review ONE file end-to-end for correctness: `H:/prism/mcp-server/scripts/bluepri"
date: "2026-06-04"
first_ts: "2026-06-04T19:42:57.057Z"
last_ts: "2026-06-04T19:45:42.169Z"
cwd: "H:\\prism\\mcp-server\\scripts"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-a87c65bfbef04e8be.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review ONE file end-to-end for correctness: `H:/prism/mcp-server/scripts/bluepri

> **claude-code-cli** | 2026-06-04 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism\mcp-server\scripts
> Raw: `H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-a87c65bfbef04e8be.jsonl`

## Transcript

### User | 2026-06-04T19:42:57.057Z

Review ONE file end-to-end for correctness: `H:/prism/mcp-server/scripts/blueprint_vl_train_lora.py` (a Python Qwen2.5-VL PEFT LoRA trainer for blueprint OCR). This is the per-file scrutiny gate — be rigorous and TERSE.

CONTRACTS it must satisfy (verify against these):
1. **Node-bridge NDJSON contract** (`H:/prism/scripts/lib/py-subprocess-bridge.mjs`): stdout = newline-delimited JSON ONLY; progress objects `{"event":"progress",...}`, final result `{"event":"result",...}` (or last untagged object); ALL human logs MUST go to stderr. EVERY exit path (success + every failure) must emit a structured result object then exit with a correct code, never a raw traceback. Verify nothing writes non-JSON to stdout.
2. **Input format** (local-lora bundle): `{prompt:"Print: <pdfPath> Context: <ctx>", completion:<value>}`. The trainer recovers pdfPath/context from the prompt via PROMPT_RE and takes completion as the label.
3. **Honesty (R12/R9)**: the held-out Brier is on PSEUDO-labels (must be stamped brier_basis="held_out_pseudo_labels", eval_gate_satisfied=false). brier_score must return None (not 0.0) on empty. It must NOT claim to be the deploy gate.
4. **Deferred heavy imports**: torch/transformers/peft/datasets/PIL/fitz must NOT be imported at module top (so --self-test + the missing_dependency preflight run in a dep-less interpreter). preflight_deps + preflight_gpu (real cuda matmul, not is_available()) must run BEFORE any heavy work.

ALREADY VALIDATED LIVE (don't re-run): `--self-test` → all 13 pure checks pass; a real --bundle run in this dep-less env → `{ok:false,error:"missing_dependency",...}` exit 3. So focus on the REAL training/eval path (train(), collate(), _evaluate_brier, _sequence_confidence, render_to_image) which CANNOT be executed here — review it for correctness against the documented Qwen2.5-VL + transformers Trainer + PEFT APIs.

Specifically hunt for: (a) prompt-masking bug in collate() — is the prompt-prefix length computed correctly so loss is only o
... [+739 chars truncated]

### Assistant | 2026-06-04T19:43:12.329Z

I'll review the file end-to-end. Let me read it.

### Assistant | 2026-06-04T19:43:12.915Z

[tool_use: Read]

### User | 2026-06-04T19:43:19.402Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	blueprint_vl_train_lora.py — BLACKWELL-AI-MS0 / U-XRAY-VL-TRAINER (slot:xray, acting for india)
4	
5	The REAL Qwen2.5-VL PEFT (LoRA) trainer for the blueprint-vision OCR loop. This is the
6	keystone that `wedm_train_lora.py` never was: that script is a TEXT-ONLY SIMULATION stub
7	(prints fake epoch losses, imports only argparse/json/os, never touches a GPU). This o
... [+28415 chars truncated]

### Assistant | 2026-06-04T19:43:23.934Z

Reviewing the real training/eval path against Qwen2.5-VL + transformers Trainer + PEFT APIs. Let me verify the key API contracts I'm uncertain about before finalizing.

### Assistant | 2026-06-04T19:43:26.953Z

[tool_use: WebFetch]

### User | 2026-06-04T19:43:46.602Z

[tool_result] <persisted-output>
Output too large (71.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6\tool-results\toolu_014ePpVLQiXrB56ZDU6dKVPd.txt

Preview (first 2KB):
# Qwen2.5-VL

[Qwen2.5-VL](https://huggingface.co/papers/2502.13923) is a multimodal vision-language model, available in 3B, 7B, and 72B parameters, pretrained on 4.1T tokens. The mode
... [+1838 chars truncated]

### Assistant | 2026-06-04T19:43:53.669Z

Let me read the full fetched content to confirm the image-token expansion and the apply_chat_template behavior precisely.

### Assistant | 2026-06-04T19:43:53.670Z

[tool_use: Read]

### User | 2026-06-04T19:44:20.530Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-667 of 960 total (30554 tokens, cap 25000). Call Read with offset=668 limit=667 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# Qwen2.5-VL
2	
3	[Qwen2.5-VL](https://huggingface.co/papers/2502.13923) is a multimodal vision-language m
... [+50609 chars truncated]

### Assistant | 2026-06-04T19:44:30.793Z

I have enough confirmation. The critical fact from line 230 and the chat-template example (line 172): the processor expands a single `<|image_pad|>` placeholder into MANY image tokens during `processor(...)` — `apply_chat_template(tokenize=False)` returns text with only ONE `<|image_pad|>` placeholder, but the actual encoded sequence balloons it to hundreds of image tokens. This is the root of the prompt-masking bug. Let me confirm the bridge contract quickly.

### Assistant | 2026-06-04T19:44:31.674Z

[tool_use: Read]

### User | 2026-06-04T19:44:38.709Z

[tool_result] 1	/**
2	 * py-subprocess-bridge.mjs — BLACKWELL-AI-MS0 / U-PY-BRIDGE-LIB
3	 *
4	 * The ONE canonical Node->Python spawn primitive for the Blackwell training
5	 * stack. Every GPU job that Node orchestrates but Python executes — the GNN
6	 * GATv2/H2GCN retrain, QLoRA fine-tunes, the full-corpus GPU embedder, the
7	 * Bradley-Terry reward model — spawns its Python through this bridge so the
8	 * co
... [+4850 chars truncated]

### Assistant | 2026-06-04T19:45:42.169Z

I have everything I need. Bridge contract confirmed: stdout = NDJSON only, result is last `{"event":"result"}` object, human logs to stderr, non-zero exit must carry a parseable result. Now I'll synthesize the findings against the Qwen2.5-VL API facts I confirmed.

The decisive fact: the Qwen2.5-VL processor expands a single `<|image_pad|>` placeholder into **hundreds of image tokens** during `processor(...)` (config `image_token_id` 151655, one placeholder per image in the chat-template text, expanded at encode time). This breaks the prompt-mask length math in `collate()`.

---

## Code Quality Analysis — `blueprint_vl_train_lora.py`

### P0 — correctness-breaking

**P0-1 — Prompt-mask length is computed on the UN-expanded text; masking is wrong by hundreds of tokens (collate, lines 382–394).**
`prompt_lens` (L389) is `len(tokenizer(prompt_only, add_special_tokens=False))` on the *raw chat-template string*, which contains exactly ONE `<|image_pad|>` placeholder per image. But `enc = processor(text=..., images=...)` on L390 expands that single placeholder into N image tokens (N = `image_grid_thw` product / merge², typically 200–1500+ for a 200-DPI blueprint). So `enc["input_ids"]` is hundreds of tokens longer than `prompt_lens` counts. The mask `labels[i, :plen] = -100` (L394) therefore un-masks a large block of **image + prompt tokens** and computes cross-entropy loss over image-pad/prompt tokens, while the actual answer at the tail may be partially or fully mislabeled. The comment "prompt prefix (incl. image tokens)" (L394) is exactly backwards — `plen` does NOT include the expanded image tokens because it was measured before expansion. Result: the loss target is garbage; the model trains on the wrong span. Correct approach: measure the prompt prefix length from the EXPANDED encoding (encode `prompt_only` through the full `processor(text=[prompt_only], images=[img])` and take that `input_ids` length per-row), or build full + prompt encodings through the processor 
... [+8092 chars truncated]
