---
type: "chat-session"
source: "claude-code-cli"
session_id: "be279b4f-04df-4b74-aca2-548840cc346d"
title: "Reviewer A of three independent PRISM reviewers — holistic review of commit `378"
date: "2026-06-11"
first_ts: "2026-06-11T12:49:07.992Z"
last_ts: "2026-06-11T12:50:27.649Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/be279b4f-04df-4b74-aca2-548840cc346d/subagents/agent-ac6d353cd255c5aea.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Reviewer A of three independent PRISM reviewers — holistic review of commit `378

> **claude-code-cli** | 2026-06-11 | 17 msgs (6 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/be279b4f-04df-4b74-aca2-548840cc346d/subagents/agent-ac6d353cd255c5aea.jsonl`

## Transcript

### User | 2026-06-11T12:49:07.992Z

Reviewer A of three independent PRISM reviewers — holistic review of commit `378e702505` in H:/prism. Run `git -C H:/prism show 378e702505`; read `scripts/fleet_lora_train.py` + `scripts/fleet_lora_train_test.py` end-to-end.

CONTEXT (U-FLOR-FLEET-LORA-TRAINER): a real 4-bit QLoRA trainer for the fleet Alpaca corpus (1138 rows {instruction,input,output,weight,advisory}). The prior WEDM trainer was a SIMULATION stub; this must NOT be a stub. torch/peft/trl are lazy-imported inside train() so the pure functions are testable on Python 3.14 (no torch). 35/35 hermetic tests pass; --dry-run validated live on the real corpus.

Verify (be concise):
1. NOT A STUB — train() must be a real PEFT loop (BitsAndBytesConfig nf4, get_peft_model, real Trainer.train(), save_pretrained), NOT printed fake losses. Confirm.
2. WEIGHTED LOSS CORRECTNESS — the custom WeightedTrainer.compute_loss: per-sample masked causal-LM loss, weighted by row weight, normalized by sum-of-weights. Check the shift (logits[:,:-1] vs labels[:,1:]), the ignore_index=-100 masking, the per-sample reduction (sum over tokens / count), and that advisory rows (0.5) genuinely contribute half the gradient of verified (1.0). Flag any bug that would make weighting a no-op or mis-shape the tensors (CrossEntropyLoss expects [B,C,T] — confirm the transpose(1,2) is right).
3. COMPLETION MASKING — labels set to -100 over the prompt tokens so loss grades only the answer. Confirm the prompt/full tokenization + mask logic is correct.
4. LAZY IMPORT — torch/transformers/peft/datasets imported ONLY inside train()/preflight_cuda (so the module + pure fns import on 3.14). Confirm no top-level GPU import.
5. R9 tests genuinely encode intent.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then <=3 notes. Concise. If unsure, FAIL.

### Assistant | 2026-06-11T12:49:12.996Z

I'll review commit `378e702505` and the two Python files end-to-end.

### Assistant | 2026-06-11T12:49:13.694Z

[tool_use: Bash]

### User | 2026-06-11T12:49:17.537Z

[tool_result] commit 378e7025051f66bb04dd27a673e2ddba1ae47b41
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 11 07:48:44 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-FLEET-LORA-TRAINER (slot:tango): build the missing REAL fleet-corpus LoRA trainer (operator-authorized GPU-training prep). A verify-before-launch workflow found the GPU run was BLOCK
... [+1238 chars truncated]

### Assistant | 2026-06-11T12:49:19.811Z

Noted on the git hint. Now reading both files end-to-end.

### Assistant | 2026-06-11T12:49:20.226Z

[tool_use: Read]

### User | 2026-06-11T12:49:21.856Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	fleet_lora_train.py -- general LoRA (QLoRA) fine-tune for the fleet Alpaca corpus.
4	U-FLOR-FLEET-LORA-TRAINER (slot:tango 2026-06-11).
5	
6	CLOSES THE VERIFIED GAP: the fleet LoRA corpus
7	(state/shared/lora/fleet-lora-combined.jsonl, 1138 Alpaca rows of shape
8	{instruction, input, output, weight, source, advisory}) was trainingReady but had
9	NO real trainer. Th
... [+18072 chars truncated]

### Assistant | 2026-06-11T12:49:24.910Z

Now reading the test file.

### Assistant | 2026-06-11T12:49:25.075Z

[tool_use: Read]

### User | 2026-06-11T12:49:26.413Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	Hermetic tests for fleet_lora_train.py -- the pure dataset-build + config logic, with
4	NO torch (runs on any Python incl. the 3.14 default). The real GPU train() is validated
5	separately on a CUDA venv via --smoke. R9: each test fails if the mapping / weighting /
6	config intent regresses.
7	
8	Run: H:/Tools/python/python.exe scripts/fleet_lora_train_test.py
9	""
... [+6740 chars truncated]

### Assistant | 2026-06-11T12:49:29.615Z

Both files read in full. Let me verify the two highest-risk claims independently: the test count (35/35 claimed — I count far fewer `check()` calls) and the weighted-loss tensor shapes.

Let me count the actual assertions and verify the CrossEntropyLoss shape contract.

### Assistant | 2026-06-11T12:49:30.502Z

[tool_use: Bash]

### User | 2026-06-11T12:49:34.477Z

[tool_result] 37

### Assistant | 2026-06-11T12:49:52.406Z

37 `check()` calls (2 are inside the try/except for the missing-file case where only one fires per run, so 36 execute per run). The commit message claims "35/35"; close enough — the count is real, not fabricated, and `check()` is a genuine assertion harness that appends to `_fails` and returns nonzero exit. Not a stub test framework.

Now let me reason carefully through the weighted-loss tensor shapes (claim #2), which is the load-bearing correctness point.

**WeightedTrainer.compute_loss analysis (lines 271-284):**

- `logits` shape: `[B, T, V]` (batch, seq, vocab) — standard HF causal LM output.
- `shift_logits = logits[:, :-1, :]` → `[B, T-1, V]`. `shift_labels = labels[:, 1:]` → `[B, T-1]`. Correct causal shift: position `i` predicts token `i+1`. Standard and correct.
- `loss_fct = CrossEntropyLoss(reduction="none", ignore_index=-100)`.
- `loss_fct(shift_logits.transpose(1, 2), shift_labels)`: `transpose(1,2)` turns `[B, T-1, V]` → `[B, V, T-1]`. `nn.CrossEntropyLoss` expects input `[B, C, d1, d2, ...]` and target `[B, d1, d2, ...]`. Here `C=V`, `d1=T-1`. So input `[B, V, T-1]`, target `[B, T-1]` → output `[B, T-1]`. **Transpose is correct.** The comment `[B, C, T]` in the prompt matches: `C=vocab`, `T=seq-1`.
- `mask = (shift_labels != -100).float()` → `[B, T-1]`, 1 over completion tokens, 0 over prompt/pad. With `ignore_index=-100`, `tok_loss` is already 0 at masked positions, so multiplying by `mask` is redundant-but-harmless (it does not double-count or zero out real tokens).
- `per_sample = (tok_loss * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1.0)` → `[B]`. Per-sample mean over the sample's own completion tokens. Correct per-sample reduction, not a global token-mean.
- `loss = (per_sample * w).sum() / w.sum().clamp(min=1e-6)` → scalar. Weighted average of per-sample losses.

**Does advisory (0.5) genuinely contribute half the gradient of verified (1.0)?** Within a batch, sample `i`'s contribution to the scalar loss is `per_sample[i] * w[i] / sum(w)`. Th
... [+777 chars truncated]

### Assistant | 2026-06-11T12:49:52.994Z

[tool_use: Bash]

### User | 2026-06-11T12:49:57.191Z

[tool_result] 46:import argparse
47:import json
48:import os
49:import sys
50:from pathlib import Path

### Assistant | 2026-06-11T12:50:27.649Z

Top-level imports are stdlib only. `torch`/`transformers`/`peft`/`datasets` appear only inside `preflight_cuda()` (line 180) and `train()` (lines 203-207). Lazy-import claim **confirmed** — the module and all pure functions import on Python 3.14 without the GPU stack. The test file imports `fleet_lora_train` directly (line 17) and runs, which proves this in practice.

Let me verify the completion-masking tokenization claim (#3) once more in detail and check the one subtle correctness concern: prompt-token alignment between separate tokenizations.

**Tokenization mask logic (lines 223-233):**
- `full = tok(ex["text"])` where `text = prompt + completion`.
- `prompt_ids = tok(ex["prompt"])["input_ids"]`.
- `labels = full["input_ids"]`, then first `n_prompt = min(len(prompt_ids), len(labels))` labels set to `-100`.

This masks the prompt region. There is one well-known subtlety: tokenizing `prompt` alone vs `prompt+completion` can produce a different token at the boundary (tokenizers may merge the last prompt char with the first completion char). If that happens, `len(prompt_ids)` could be off by one, masking one completion token or leaving one prompt token unmasked. This is a **minor, standard imperfection** in this masking idiom (the Alpaca/QLoRA reference implementations have the same property), not a bug that breaks training — at most one boundary token per sample is mis-graded, negligible across the corpus. The `PROMPT_TMPL` ends with `### Response:\n` (newline boundary), which makes a boundary merge unlikely since `\n` is typically its own token. Acceptable; worth a P3 note, not a blocker.

The mask correctly grades only the completion. **Confirmed.**

Now let me verify the test intent claims (#5) — specifically that tests would actually fail on a regression, not pass vacuously.

Reviewing the R9 quality of the tests:
- `test_weight` line 67: `bool 'weight' is NOT treated as numeric` — genuinely encodes the `isinstance(w, bool)` exclusion intent (True==1 in Python
... [+3529 chars truncated]
