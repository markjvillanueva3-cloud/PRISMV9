---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Enumerate PRISM hooks (.mjs) related to AI training / learning / outcome-feedbac"
date: "2026-05-29"
first_ts: "2026-05-29T02:24:45.827Z"
last_ts: "2026-05-29T02:24:53.562Z"
cwd: "H:\\prism-slot-india"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a2589e781942e98fc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Enumerate PRISM hooks (.mjs) related to AI training / learning / outcome-feedbac

> **claude-code-cli** | 2026-05-29 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a2589e781942e98fc.jsonl`

## Transcript

### User | 2026-05-29T02:24:45.827Z

Enumerate PRISM hooks (.mjs) related to AI training / learning / outcome-feedback for slot:india. Keywords: nn, gnn, lora, rag, learning, neural, training, outcome, calibration, conformal, meta-learning, drift, retrain, pattern, ollama, consensus, model-route, adaptive-threshold, reward.

Glob H:\prism\.claude\hooks\*.mjs (this is the canonical hooks dir). There are MANY hooks — FILTER hard to only those whose filename matches the keywords above.

For each match, determine its event (PreToolUse / PostToolUse / UserPromptSubmit / SessionStart / Stop) — grep the file's header comment or the first 30 lines for the event, or infer from a wired entry. Return: hook-filename | event | 1-line purpose.

Return ONLY a structured list:
## AI-training / learning / outcome hooks (filename | event | purpose)
Cap ~30 entries. NO prose. Read only header comments (Read offset 1 limit 30) of candidates, not full bodies.

### Assistant | 2026-05-29T02:24:53.562Z

API Error: Usage credits required for 1M context · run /usage-credits to turn them on, or /model to switch to standard context
