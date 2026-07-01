---
type: "chat-session"
source: "claude-code-cli"
session_id: "30a6a98b-2fb0-450b-8b01-9188a6778938"
title: "Independent review of an uncommitted change in `H:/prism`. Files: - `.claude/hoo"
date: "2026-05-22"
first_ts: "2026-05-22T20:36:23.853Z"
last_ts: "2026-05-22T20:36:37.782Z"
cwd: "H:\\PRISM"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-a59efd1bb370dca8d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent review of an uncommitted change in `H:/prism`. Files: - `.claude/hoo

> **claude-code-cli** | 2026-05-22 | 2 msgs (1 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-a59efd1bb370dca8d.jsonl`

## Transcript

### User | 2026-05-22T20:36:23.853Z

Independent review of an uncommitted change in `H:/prism`. Files:
- `.claude/hooks/master-index-precheck-inject.mjs` — modified (`git -C H:/prism diff .claude/hooks/master-index-precheck-inject.mjs`)
- `.claude/hooks/master-index-precheck-inject.test.mjs` — NEW (read directly)

## Context
PRISM milestone RAG-UPGRADE-MS0 / U-RAG-2: wire a stage-2 lexical reranker into the `master-index-precheck-inject` UserPromptSubmit hook. It now widens stage-1 master-index recall to `STAGE1_K` then narrows to `TOP_K` via a new exported `applyLexicalRerank()` calling `rerank` from `scripts/lib/lexical-rerank.mjs`. An `isDirectRun` guard was added for test-importability. 19/19 tests pass.

## Weight your review toward what a correctness reviewer is less likely to catch
1. **Hook-must-never-block invariant.** This is a UserPromptSubmit injector — it must NEVER throw uncaught or block the prompt. Does any new path (the rerank call, the `applyLexicalRerank` helper, the `isDirectRun` guard) introduce a way for the hook to throw out of `main()` un-caught, or to NOT exit 0? The outer `try { main() } catch` now lives inside `if (isDirectRun)` — confirm that's still correct (a thrown error inside `main()` when run as a hook is still caught).
2. **Latency.** The hook fires on EVERY UserPromptSubmit. Widening stage-1 from TOP_K to STAGE1_K (5×) + a rerank pass — is the added cost acceptable for a per-prompt hook? `lexical-rerank.mjs` is pure/synchronous — confirm no added I/O.
3. **Convention conformance** — does the change match the hook's existing style + the sibling `tribal-by-domain-inject.mjs` U-RAG-2 wire (commit `6df057e098`)? Is the `export` on a hook file idiomatic here?
4. **Test file** — it has no `// tier: T#` frontmatter (a hook-tier-validator warned). Is that correct for a `.test.mjs` file (tests aren't runtime hooks)? Are the 7 tests genuinely verifying the integration, or shallow?
5. **The `applyLexicalRerank` output shape** — it strips `text` but the reranker (`lexical-rerank
... [+375 chars truncated]

### Assistant | 2026-05-22T20:36:37.782Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
