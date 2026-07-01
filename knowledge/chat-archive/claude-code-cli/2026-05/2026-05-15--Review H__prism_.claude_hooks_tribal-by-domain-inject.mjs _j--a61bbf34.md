---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Review H:/prism/.claude/hooks/tribal-by-domain-inject.mjs (just-shipped UserProm"
date: "2026-05-15"
first_ts: "2026-05-15T18:57:54.826Z"
last_ts: "2026-05-15T18:58:31.406Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a4976f00eaea291d9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review H:/prism/.claude/hooks/tribal-by-domain-inject.mjs (just-shipped UserProm

> **claude-code-cli** | 2026-05-15 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a4976f00eaea291d9.jsonl`

## Transcript

### User | 2026-05-15T18:57:54.826Z

Review H:/prism/.claude/hooks/tribal-by-domain-inject.mjs (just-shipped UserPromptSubmit injector for SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT) end-to-end. Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN that I shipped earlier this session — same pattern (reuse `getDomainTokens` from `H:/prism/.claude/helpers/wiki-domain-bias.mjs`, advisory-only, knob-gated). This new hook surfaces top-3 tribal entries via `tribal-rerank.mjs --domain <inferred> --json` on every UserPromptSubmit.

Read the WHOLE file (132 lines). I'm asking you to weight your review toward:
1. **Hook contract correctness** — does it emit valid PreToolUse-style output (`hookSpecificOutput.additionalContext` shape) for UserPromptSubmit? Compare against `H:/prism/.claude/hooks/master-index-precheck-inject.mjs` line 705 of settings.json (already wired, known-good shape).
2. **Failure modes** — Ollama down, tribal-embed-index.json missing, rerank script missing, malformed JSON output. Does it ever block the user prompt? (Must be {continue:true} on every error path.)
3. **Reused helper safety** — `getDomainTokens({chatId})` is from wiki-domain-bias.mjs which I just shipped. If chatId provided but no slot matches, returns []. Is `inferTribalDomain([])` → "general" the right fallback?
4. **Subprocess hardening** — execFileSync with 4s default timeout, windowsHide:true, stdio:ignore-stderr. Anything missing for Windows safety?
5. **Wiring** — settings.json got 1 entry inserted at PreToolUse[? row after master-index-precheck-inject], timeout 5000ms. Sane?

Live smoke test passed: `echo '{"prompt":"thin wall chatter","session_id":"a61bbf34-test"}' | node hook.mjs` returned 3 cad-domain hits (slot binding inferred cad from cad-fusion-live-ms0 branch). 36/36 tests pass.

Grade PASS/FAIL with P0/P1/P2 findings. Under 400 words. If FAIL, name the file:line of every P0/P1.

### Assistant | 2026-05-15T18:57:59.010Z

I'll review the hook end-to-end against the criteria.

### Assistant | 2026-05-15T18:57:59.589Z

[tool_use: Read]

### User | 2026-05-15T18:58:06.305Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// tribal-by-domain-inject.mjs — UserPromptSubmit
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
6	//
7	// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
8	// already biases wiki-entry ranking toward the active chat-slot's milestone
9	// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
10	// knowledge — 
... [+8194 chars truncated]

### Assistant | 2026-05-15T18:58:31.406Z

Compared against `master-index-precheck-inject.mjs` shape and checked all 5 weighted criteria.

**Verdict: PASS** (with P2 polish only)

### Criterion-by-criterion

1. **Hook contract** — PASS. `buildOutput` emits `{hookSpecificOutput:{hookEventName:"UserPromptSubmit", additionalContext}}` wrapped in `{continue:true,...}` via `approve()` spread. Matches the master-index injector's shape exactly. Single `process.stdout.write` of one JSON object, no trailing newline noise.

2. **Failure modes** — PASS. Every error path lands on `approve()` / `approve({})`:
   - DISABLE knob → approve (L162)
   - No stdin / parse fail → `readStdin` returns null → `extractPrompt` null → approve (L165)
   - No chatId / no slot match → `getDomainTokens` returns [] → `inferTribalDomain` → `"general"` (still queries) — correct, advisory not blocking
   - Rerank script / index missing → `{ok:false}` → approve (L170)
   - Subprocess throw (ETIMEDOUT, ENOENT, non-zero exit, Ollama down propagating through rerank) → caught at L118, approve
   - Malformed JSON → `parseRerankOutput` try/catch returns [] → `no_hits` → approve (L172)
   - Top-level `main().catch(() => approve())` is the belt-and-suspenders backstop at L180

   No path can emit `{continue:false}` or non-zero exit. Cannot block the prompt.

3. **Reused helper** — PASS. `inferTribalDomain([])` → `"general"` is the correct fallback: `tribal-rerank.mjs` accepts "general" and just skips the 2x in-domain boost, still returning top-K by cosine. Better than guessing a wrong domain from peer-slot drift (matches the `[[reference_wiki_domain_bias]]` no-fallback-to-peer doctrine).

4. **Subprocess hardening** — PASS. `execFileSync` with `process.execPath` (no shell), array argv (no injection surface — `prompt` is clamped to 300 chars at L91), `timeout: 4000ms`, `stdio:["ignore","pipe","ignore"]` swallows stderr, `windowsHide:true`. ETIMEDOUT specifically distinguished. Nothing missing for Windows.

5. **Wiring** — PASS contingent on settings.js
... [+1610 chars truncated]
