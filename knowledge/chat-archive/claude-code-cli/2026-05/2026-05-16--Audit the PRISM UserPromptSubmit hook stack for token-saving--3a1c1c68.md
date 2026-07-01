---
type: "chat-session"
source: "claude-code-cli"
session_id: "3a1c1c68-a4cf-4705-a813-b80ec43b26fa"
title: "Audit the PRISM UserPromptSubmit hook stack for token-saving opportunities. Goal"
date: "2026-05-16"
first_ts: "2026-05-16T21:14:30.412Z"
last_ts: "2026-05-16T21:15:35.065Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 9
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/3a1c1c68-a4cf-4705-a813-b80ec43b26fa/subagents/agent-a4b3a172885ac100e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Audit the PRISM UserPromptSubmit hook stack for token-saving opportunities. Goal

> **claude-code-cli** | 2026-05-16 | 20 msgs (9 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3a1c1c68-a4cf-4705-a813-b80ec43b26fa/subagents/agent-a4b3a172885ac100e.jsonl`

## Transcript

### User | 2026-05-16T21:14:30.412Z

Audit the PRISM UserPromptSubmit hook stack for token-saving opportunities. Goal: identify which of the 8 "inject" hooks fire too eagerly, inject overlapping content, or could be cached/deduplicated.

The 8 inject hooks (in fire order):
1. `H:/prism/.claude/hooks/prompt-context-inject.mjs` (timeout 1500ms)
2. `H:/prism/.claude/hooks/master-index-precheck-inject.mjs` (timeout 3000ms)
3. `H:/prism/.claude/hooks/audit-viz-first-inject.mjs` (timeout 3000ms)
4. `H:/prism/.claude/hooks/session-reorient-inject.mjs` (timeout 3000ms)
5. `H:/prism/.claude/hooks/ollama-pipeline-injector.mjs` (timeout 3000ms)
6. `H:/prism/.claude/hooks/loop-iteration-inject.mjs` (timeout 5000ms)
7. `H:/prism/.claude/hooks/pick-prefresh-inject.mjs` (timeout 5000ms)
8. `H:/prism/.claude/hooks/goal-prereq-inject.mjs` (timeout 5000ms)

For each hook, READ THE FILE and report:

- **Gating** — does it fire on EVERY UserPromptSubmit, or does it check keyword match / regex / state-file first? If always-fires, that's a P0 cost.
- **Content size** — what's the typical `additionalContext` byte count when it does fire? Read the script and estimate from string templates / file reads it does.
- **Overlap** — does its content overlap any of the other 7? (E.g., does `prompt-context-inject` repeat content already in `master-index-precheck-inject`?)
- **Cacheability** — is the injected content stable across a session (e.g., doctrine pointer, slot id) → would benefit from inject-once-then-cache, OR is it dynamic per-prompt (e.g., master-index hits for THIS prompt) → must re-fire?
- **Trim opportunity** — concrete recommendation: "always fires, content is static doctrine — move to SessionStart" / "fires on every prompt but only 20% have matching keywords — add gate" / "duplicates inject #1 — merge".

End with a ranked top-3 trim recommendations by estimated tokens-saved per session (assume ~30 user messages per session). Each recommendation must include the exact line(s) to add/change and a verification command (r
... [+486 chars truncated]

### Assistant | 2026-05-16T21:14:35.139Z

I'll audit the 8 UserPromptSubmit inject hooks for token-saving opportunities.

### Assistant | 2026-05-16T21:14:35.668Z

[tool_use: Read]

### Assistant | 2026-05-16T21:14:36.335Z

[tool_use: Read]

### Assistant | 2026-05-16T21:14:37.257Z

[tool_use: Read]

### Assistant | 2026-05-16T21:14:37.387Z

[tool_use: Read]

### User | 2026-05-16T21:14:38.160Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * prompt-context-inject.mjs — UserPromptSubmit hook (PRISM-STAB-MS0/U-C2).
5	 *
6	 * Reads the pre-aggregated bundle written by the context-bundle daemon
7	 * (prism-awareness-bundle.mjs --daemon) and emits ONE compact injection
8	 * block per prompt. Replaces the per-prompt fork storm of 24 individual
9	 * injectors that each computed the same context 
... [+4711 chars truncated]

### User | 2026-05-16T21:14:39.965Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+5668 chars truncated]

### User | 2026-05-16T21:14:40.653Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// audit-viz-first-inject.mjs — UserPromptSubmit T2 hook.
4	// When an audit/discovery intent is detected, auto-run
5	// `node scripts/system-viz-query.mjs find <noun>` and inject the top-K hits
6	// so the chat sees the answer BEFORE reaching for Grep/Glob.
7	//
8	// Knobs: PRISM_AUDIT_VIZ_FIRST_DISABLE=1 · PRISM_AUDIT_VIZ_FIRST_K=N (1..20, def 5)
9	//       
... [+5796 chars truncated]

### User | 2026-05-16T21:14:40.687Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * session-reorient-inject.mjs — UserPromptSubmit hook
5	 *
6	 * For long sessions (especially 1M-context), context drift is real even
7	 * when nothing has been compacted. Important context gets buried under
8	 * exploration, errors, and intermediate work.
9	 *
10	 * This hook tracks per-session prompt count and tool call count via the
11	 * SessionReor
... [+9882 chars truncated]

### Assistant | 2026-05-16T21:14:44.476Z

Now reading the remaining 4 hooks in parallel.

### Assistant | 2026-05-16T21:14:45.533Z

[tool_use: Read]

### Assistant | 2026-05-16T21:14:46.129Z

[tool_use: Read]

### Assistant | 2026-05-16T21:14:46.614Z

[tool_use: Read]

### User | 2026-05-16T21:14:46.877Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * ollama-pipeline-injector.mjs — UserPromptSubmit hook
5	 *
6	 * Fires when the user invokes /forge, /forge-audit, /rgs, /scrutinize, /dedup,
7	 * /precompact, /handoff or any pipeline that historically did NOT route work
8	 * to Ollama even though the local models were loaded and idle.
9	 *
10	 * Injects an additionalContext block listing CONCRETE Olla
... [+7451 chars truncated]

### Assistant | 2026-05-16T21:14:46.990Z

[tool_use: Read]

### User | 2026-05-16T21:14:47.763Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * loop-iteration-inject.mjs — UserPromptSubmit hook for /loop awareness.
5	 *
6	 * Fires when the user types `/loop` (with or without interval). Surfaces:
7	 *   - any paused/active loop state for this session (sessionId from stdin)
8	 *   - global list of running loops (so a chat doesn't accidentally start a 2nd)
9	 *   - reminder of Karpathy R10 (chec
... [+4570 chars truncated]

### User | 2026-05-16T21:14:48.363Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * pick-prefresh-inject.mjs — UserPromptSubmit hook for /pick-unit /pick-task /checkin.
5	 *
6	 * Surfaces freshness state BEFORE the chat picks a unit:
7	 *   - MILESTONE_PROGRESS mtime (warn if >30 min stale — regen suggested)
8	 *   - BUILD_STATE mtime + headline counts (so picker knows current wired/unwired)
9	 *   - CLOSE-OUT-CANDIDATES mtime + coun
... [+15055 chars truncated]

### User | 2026-05-16T21:14:48.757Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * goal-prereq-inject.mjs — UserPromptSubmit hook for /goal awareness.
5	 *
6	 * Complements the existing Stop-hook goal-complete-gate.mjs by surfacing pre-flight
7	 * status BEFORE the user types /goal complete:
8	 *   - CLOSE-OUT-CANDIDATES freshness (Stop gate requires <2h)
9	 *   - sibling-unit status in the same milestone (you said "goal complete" b
... [+8728 chars truncated]

### Assistant | 2026-05-16T21:15:35.065Z

# PRISM UserPromptSubmit Inject-Hook Audit — Token Savings

## Per-hook findings

### 1. `prompt-context-inject.mjs` (T4, 1500ms)
- **Gating**: Fires every prompt. Reads pre-built `state/shared/context-bundle.json`; emits only if bundle exists + fresh + slice non-empty.
- **Content**: ~600 (head) + up to ~800 (keyword-matched section) + footer; cap 2200B (~550 tok).
- **Overlap**: Bundle headers (inventory + chats + memory + roadmap) likely overlap session-start-injected `BUILD_STATE` + `awareness-snapshot`. Keyword slicing overlaps master-index hits.
- **Cacheability**: The 600B `head` is identical every prompt — pure waste to re-emit 30x.
- **Trim**: Move "head" to SessionStart; per-prompt only emit `matched` slice. Saves ~600B × 29 ≈ **~4350 tokens/session**.

### 2. `master-index-precheck-inject.mjs` (T2, 3000ms)
- **Gating**: Fires every prompt ≥6 chars. No keyword guard — runs BM25 on all prompts.
- **Content**: 5 lines × ~150B + header/footer ≈ 1100B (~275 tok).
- **Overlap**: Layered with `audit-viz-first` (which also runs `system-viz-query`) and partially with `prompt-context-inject`'s keyword slice.
- **Cacheability**: Per-prompt dynamic — must re-fire. But footer doctrine (`prism_session:master_index_query` etc.) is static — emit once at SessionStart.
- **Trim**: Drop the 3-line footer (`_Source... To query... To disable_`) — saves ~180B × 30 = ~5400 tokens. Also gate `prompt.length < 20` (too short to BM25 usefully). Add empty-hits no-emit (already done).

### 3. `audit-viz-first-inject.mjs` (T2, 3000ms)
- **Gating**: Strong — requires `AUDIT_KEYWORDS` match (~20% of prompts) + noun extraction + viz-query non-empty.
- **Content**: ~400-800B when it fires.
- **Overlap**: Same `system-graph.json` source as #2 — redundant when both fire on an audit prompt.
- **Cacheability**: Per-prompt dynamic.
- **Trim**: When this fires, suppress #2's output for the same prompt (gated by env var `PRISM_AUDIT_VIZ_ACTIVE=1` written via tmp stamp). Saves ~1100B × ~6 audit-p
... [+4453 chars truncated]
