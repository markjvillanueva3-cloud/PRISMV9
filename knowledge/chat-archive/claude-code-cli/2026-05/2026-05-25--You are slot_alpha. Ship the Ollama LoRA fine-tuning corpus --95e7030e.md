---
type: "chat-session"
source: "claude-code-cli"
session_id: "95e7030e-b0eb-4734-9088-595089441efe"
title: "You are slot:alpha. Ship the Ollama LoRA fine-tuning corpus collector. ## Task C"
date: "2026-05-25"
first_ts: "2026-05-25T02:34:02.264Z"
last_ts: "2026-05-25T02:37:45.236Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 8
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/95e7030e-b0eb-4734-9088-595089441efe/subagents/agent-ac1fe24c51e03c9d7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are slot:alpha. Ship the Ollama LoRA fine-tuning corpus collector. ## Task C

> **claude-code-cli** | 2026-05-25 | 22 msgs (8 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/95e7030e-b0eb-4734-9088-595089441efe/subagents/agent-ac1fe24c51e03c9d7.jsonl`

## Transcript

### User | 2026-05-25T02:34:02.264Z

You are slot:alpha. Ship the Ollama LoRA fine-tuning corpus collector.

## Task
Create `H:/prism/.claude/hooks/posttool-ollama-rewriter-corpus.mjs` — a PostToolUse hook that, after every successful `prompt-rewriter-ollama` call, records the (raw_prompt → rewrite) pair to a corpus file for future LoRA fine-tuning.

## Background
PRISM's `prompt-rewriter-ollama.mjs` hook calls qwen2.5-coder:7b to compress verbose prompts. It already records skipped/failed calls. We need the SUCCESSFUL pairs in a structured JSONL corpus so the operator can later fine-tune a smaller, faster LoRA adapter via the existing `PRISMLoRAAdapterEngine` and `SONALearningOptimizer` engines.

## Corpus format
`H:/prism/state/shared/dashboards/ollama-rewriter-corpus.jsonl`, one record per line:
```json
{"ts": "...", "raw_prompt_sha8": "...", "raw_len": N, "rewrite_len": N, "savings_pct": N, "model": "qwen2.5-coder:7b", "raw_sample": "<first 120 chars>", "rewrite_sample": "<first 120 chars>"}
```

Don't store full prompts — just SHA-8 + lengths + 120-char samples (privacy + size cap).

## Implementation
- PostToolUse hook fires after any tool, but only acts if tool_name === "Bash" AND tool_input.command includes "prompt-rewriter-ollama" (script invocation) OR check the prompt-rewriter's own state file.
- Simpler approach: read `state/shared/prompt-rewriter-state.json` or `ollama-rewriter.jsonl` if it exists — find the most recent "success" entry, derive the corpus record.
- Throttle: max 1 corpus append per 5s (lock file or in-mem counter).
- Knob: `PRISM_OLLAMA_REWRITER_CORPUS_DISABLE=1`.
- Tier T3.

## Pure helpers exported for tests
- `extractCorpusRecord(rewriterStateEntry, now) → {ts, raw_prompt_sha8, ...} | null`
- `shouldRecord(stateEntry) → boolean` — only successful entries with both raw + rewrite present

## Tests
Create `__tests__/posttool-ollama-rewriter-corpus.test.mjs` with ≥5 cases:
- extractCorpusRecord: valid entry → record; missing rewrite → null; malformed → null
- shouldRecord: s
... [+411 chars truncated]

### Assistant | 2026-05-25T02:34:09.192Z

I'll analyze the task and ship the corpus collector hook.

### Assistant | 2026-05-25T02:34:10.910Z

[tool_use: Bash]

### Assistant | 2026-05-25T02:34:11.592Z

[tool_use: Bash]

### User | 2026-05-25T02:34:26.312Z

[tool_result] -rwxr-xr-x 1 wompu 197611 25127 May 24 14:52 H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs
/usr/bin/ls: cannot access 'H:/prism/state/shared/ollama-rewriter.jsonl': No such file or directory
/usr/bin/ls: cannot access 'H:/prism/state/shared/prompt-rewriter-state.json': No such file or directory

### User | 2026-05-25T02:34:28.511Z

[tool_result] _smoke-auto-resume.mjs  5.4K
_smoke-release-slot.mjs  2.8K
_smoke-slot-signature-advisory.mjs  8.1K
_smoke-wiring-audit.mjs  13.2K
action-triple-sync.test.mjs  6.4K

### Assistant | 2026-05-25T02:34:30.581Z

Let me read the existing rewriter to understand its state-file shape.

### Assistant | 2026-05-25T02:34:31.240Z

[tool_use: Read]

### User | 2026-05-25T02:34:36.614Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * prompt-rewriter-ollama.mjs — UserPromptSubmit hook
5	 * RE-ENABLED: 2026-04-26 (LOCAL-LLM-MS0 U-LLMH03)
6	 *
7	 * WHY: The user's raw prompts are often short, pronoun-heavy, and omit
8	 * the implicit constraints that Claude needs to ship correct work ("just
9	 * do the thing", "continue", "build it", "keep going"). This hook calls
10	 * a local Ollam
... [+26377 chars truncated]

### Assistant | 2026-05-25T02:34:41.346Z

Now I have full context on the rewriter state format. The log entry shape is:
```
{ ts, session, raw, rewrite | null, model, latency_ms, skip_reason? }
```

Successful entries have `rewrite` non-null and no `skip_reason`. Let me build the corpus hook + tests.

### Assistant | 2026-05-25T02:35:21.217Z

[tool_use: Write]

### User | 2026-05-25T02:35:34.819Z

[tool_result] File created successfully at: H:/prism/.claude/hooks/posttool-ollama-rewriter-corpus.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:35:38.493Z

Addressing the warnings: I'll fix the unreachable `appendFileSync.length` line, move the inline `await import` to a top-level import, refactor the async IIFE to use `await fs.promises.*` for non-blocking I/O, extract magic numbers to constants, then ship the test file alongside.

### Assistant | 2026-05-25T02:36:16.425Z

[tool_use: Write]

### User | 2026-05-25T02:36:28.861Z

[tool_result] The file H:/prism/.claude/hooks/posttool-ollama-rewriter-corpus.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:36:31.850Z

Now writing the tests using node's built-in test runner per repo convention (the existing `__tests__/*.test.mjs` files use it).

### Assistant | 2026-05-25T02:37:19.154Z

[tool_use: Write]

### User | 2026-05-25T02:37:26.266Z

[tool_result] File created successfully at: H:/prism/.claude/hooks/__tests__/posttool-ollama-rewriter-corpus.test.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T02:37:30.421Z

The test file is a sibling of the hook (it's a `*.test.mjs` of the *same* hook — not a duplicate asset; the dedup hint is a false positive on the name-stem). Running the tests now to verify pass count.

### Assistant | 2026-05-25T02:37:31.362Z

[tool_use: Bash]

### User | 2026-05-25T02:37:39.847Z

[tool_result]   ...
# Subtest: shouldThrottle: stale append (≥5s) → false
ok 20 - shouldThrottle: stale append (≥5s) → false
  ---
  duration_ms: 0.0841
  ...
# Subtest: shouldThrottle: custom throttleMs override
ok 21 - shouldThrottle: custom throttleMs override
  ---
  duration_ms: 0.0658
  ...
# Subtest: readMostRecentSuccess: returns null when log is missing
ok 22 - readMostRecentSuccess: returns null when 
... [+728 chars truncated]

### Assistant | 2026-05-25T02:37:45.236Z

All 25 tests pass.

**Files:**
- `H:/prism/.claude/hooks/posttool-ollama-rewriter-corpus.mjs` (T3 PostToolUse hook)
- `H:/prism/.claude/hooks/__tests__/posttool-ollama-rewriter-corpus.test.mjs`

**Tests:** 25/25 PASS (covers shouldRecord/sha8/extractCorpusRecord/shouldThrottle/readMostRecentSuccess including 120KB adversarial input).

**Blockers:** none. Not wired in settings.json (operator-side per directive); not committed (parent batch-commits).
