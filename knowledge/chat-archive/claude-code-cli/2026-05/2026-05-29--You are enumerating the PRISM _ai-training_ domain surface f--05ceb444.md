---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "You are enumerating the PRISM \"ai-training\" domain surface for slot:india. Domai"
date: "2026-05-29"
first_ts: "2026-05-29T02:24:33.766Z"
last_ts: "2026-05-29T02:24:41.270Z"
cwd: "H:\\prism-slot-india"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-aabc4c47ec917c729.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# You are enumerating the PRISM "ai-training" domain surface for slot:india. Domai

> **claude-code-cli** | 2026-05-29 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-aabc4c47ec917c729.jsonl`

## Transcript

### User | 2026-05-29T02:24:33.766Z

You are enumerating the PRISM "ai-training" domain surface for slot:india. Domain keywords: nn, gnn, lora, rag, deep-learning, deep-reasoning, machine-learning, training, pattern-recognition, self-improvement loops, meta-learning, neural, cognitive, adapter, calibration, conformal, outcome-feedback.

The most COMPLETE checkout is the main tree at H:\prism (NOT the slot worktree). Use absolute H:\prism\... paths in all output.

Find every ENGINE and DISPATCHER ACTION related to ai-training. Methods, in order:
1. Call prism_session:master_index_query with keyword "nn", then "lora", then "rag", then "deep learning training" (4 calls) — collect ranked hits.
2. Call prism_session:dispatcher_map_compact — find dispatcher:action pairs in prism_ai, prism_intelligence, and any neural/learning/outcome actions (e.g. xproc_neural_*, xproc_outcome_*, xproc_calibration_*, xproc_conformal_*, neural_*, lora_*, agentdb_pattern_*).
3. Targeted Glob (narrow paths): H:\prism\mcp-server\src\engines\*LoRA*.ts ; *Neural*.ts ; *Reasoning*.ts ; *Learning*.ts ; *Cognitive*.ts ; *Meta*.ts ; *Adapter*.ts ; *Evolutionary*.ts ; *Outcome*.ts ; and H:\prism\scripts\lib\graphsage-*.mjs ; H:\prism\scripts\nn-graph-*.mjs.

Return a TIGHT structured list (NO prose, NO preamble), grouped exactly like this:
## Engines (absolute path | 1-line role)
## NN/GNN scripts (absolute path | role)
## Dispatcher actions (dispatcher:action | 1-line — what it does)

Cap at ~50 most-relevant engines + ~20 scripts + ~30 dispatcher actions. This feeds a path atlas — accuracy of absolute paths matters most. Do NOT read file bodies; names + locations + a 1-line role each.

### Assistant | 2026-05-29T02:24:41.270Z

API Error: Usage credits required for 1M context · run /usage-credits to turn them on, or /model to switch to standard context
