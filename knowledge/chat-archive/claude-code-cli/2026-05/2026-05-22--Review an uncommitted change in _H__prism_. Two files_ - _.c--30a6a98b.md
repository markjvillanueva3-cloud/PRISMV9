---
type: "chat-session"
source: "claude-code-cli"
session_id: "30a6a98b-2fb0-450b-8b01-9188a6778938"
title: "Review an uncommitted change in `H:/prism`. Two files: - `.claude/hooks/master-i"
date: "2026-05-22"
first_ts: "2026-05-22T20:36:23.863Z"
last_ts: "2026-05-22T20:36:36.310Z"
cwd: "H:\\PRISM"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-ad9bbe56764570203.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review an uncommitted change in `H:/prism`. Two files: - `.claude/hooks/master-i

> **claude-code-cli** | 2026-05-22 | 2 msgs (1 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-ad9bbe56764570203.jsonl`

## Transcript

### User | 2026-05-22T20:36:23.863Z

Review an uncommitted change in `H:/prism`. Two files:
- `.claude/hooks/master-index-precheck-inject.mjs` (modified — see `git -C H:/prism diff .claude/hooks/master-index-precheck-inject.mjs`)
- `.claude/hooks/master-index-precheck-inject.test.mjs` (NEW file — read it directly)

## Context (you have no prior conversation)
This is PRISM milestone RAG-UPGRADE-MS0 / unit U-RAG-2: wire a two-stage lexical rerank into inject hooks. `master-index-precheck-inject.mjs` is a UserPromptSubmit hook that surfaces top-K master-index hits. The change widens stage-1 recall (`STAGE1_K = TOP_K×5` clamped [TOP_K,30]) then narrows to TOP_K via a new exported `applyLexicalRerank()` helper that calls `rerank` from `scripts/lib/lexical-rerank.mjs` (a pre-existing, separately-tested pure lib). It mirrors the proven pattern from commit `6df057e098` (same wire into `tribal-by-domain-inject.mjs`, which passed 3-of-3 scrutiny). An `isDirectRun` guard was added so importing the hook for tests doesn't fire `main()`. 19/19 tests pass (7 new + 12 lib).

## Verify (P0 = correctness/data-loss, P1 = real bug/spec violation, P2/P3 = minor)
1. **`applyLexicalRerank` correctness** — does it correctly map master-index hits (shape `{label, layer, status, wiki[], memory[]}`) into the reranker's `{text, label}` input, and strip the synthesized `text` field from the output? Confirm the original hit fields survive the round-trip (the renderer at the bottom of `main()` reads `h.label`, `h.layer`, `h.status`, `h.wiki`, `h.memory`).
2. **`isDirectRun` guard** — does it correctly prevent `main()` from running on `import` (for the test) while still running when invoked as a hook? `pathToFileURL` is newly imported — confirm it's imported.
3. **edge-order interaction** — `edgeOrder(hits)` still runs AFTER the rerank narrows. Confirm the rerank → edgeOrder → render order is correct and edgeOrder still receives the rank-sorted narrowed list.
4. **Regression** — the hook's existing behavior (DSL lookup, the `process.e
... [+471 chars truncated]

### Assistant | 2026-05-22T20:36:36.310Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
