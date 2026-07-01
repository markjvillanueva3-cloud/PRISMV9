---
type: "chat-session"
source: "claude-code-cli"
session_id: "732a6b5a-50ee-4199-990c-589ff5ab0df0"
title: "Review a change to a LIVE production hook. Grade PASS or FAIL. FILE: H:/prism/.c"
date: "2026-05-18"
first_ts: "2026-05-18T03:35:26.807Z"
last_ts: "2026-05-18T03:36:10.361Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/732a6b5a-50ee-4199-990c-589ff5ab0df0/subagents/agent-a8d48e8a0373acad8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review a change to a LIVE production hook. Grade PASS or FAIL. FILE: H:/prism/.c

> **claude-code-cli** | 2026-05-18 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/732a6b5a-50ee-4199-990c-589ff5ab0df0/subagents/agent-a8d48e8a0373acad8.jsonl`

## Transcript

### User | 2026-05-18T03:35:26.807Z

Review a change to a LIVE production hook. Grade PASS or FAIL.

FILE: H:/prism/.claude/hooks/wiki-precheck-inject.mjs — read end-to-end.

CONTEXT: wired UserPromptSubmit hook, fires on EVERY prompt fleet-wide, `continueOnError`/fail-safe. The change is WIKI-INJECT-MS0/U-WIM02. Measured problem: 123 of 130 semantic-fallback attempts logged `ollama_down` — the embed model `nomic-embed-text` was cold (15-40s load) and lost the hook's 1500ms query-timeout race. A WARM nomic embeds in 112ms (measured).

WHAT CHANGED (verify each):
1. New `import { spawn } from "node:child_process"`.
2. New consts: `EMB_MODEL`, `PREWARM_THROTTLE_MS` (Math.max(60000, env|| 20min)), `PREWARM_STAMP` (in CACHE_DIR), `EMB_KEEP_ALIVE` ("30m").
3. New `prewarmEmbedModel(spawnImpl = spawn)`: disabled-env check; `existsSync(EMB_INDEX)` gate; throttle via PREWARM_STAMP mtime; writes stamp BEFORE spawn; spawns `node -e "<fetch js>"` detached + stdio:ignore + unref; the spawned JS has a 60s AbortController + process.exit(0) in finally; whole body try/catch → returns false on any failure.
4. `prewarmEmbedModel()` called near the top of `main()` (after the disable check, before skip_short).
5. `ollamaEmbedQuery` request body gained `keep_alive: EMB_KEEP_ALIVE`.

CHECK SPECIFICALLY:
- Can `prewarmEmbedModel` throw and break the hook hot path? (it's called unconditionally in main())
- The spawned `node -e` string interpolates OLLAMA_URL + a JSON body. OLLAMA_URL derives from the OLLAMA_HOST env var. Is the `node -e` string injection-safe against a hostile OLLAMA_HOST? (JSON.stringify is used to embed both — verify it actually escapes.)
- Detached process lifecycle: does the spawned child reliably self-terminate? (60s abort cap + process.exit(0) in .finally) — could it leak/orphan/hang?
- The throttle stamp is in CACHE_DIR (a shared host-wide tmpdir). Multiple concurrent chats race on it — is the worst case acceptable (a few redundant prewarms) or is there a real defect?
- "stamp BEFORE spawn" — is that t
... [+362 chars truncated]

### Assistant | 2026-05-18T03:35:34.814Z

I'll review the changed hook file end-to-end.

### Assistant | 2026-05-18T03:35:35.254Z

[tool_use: Read]

### User | 2026-05-18T03:35:36.331Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+29314 chars truncated]

### Assistant | 2026-05-18T03:36:10.361Z

I've read the file end-to-end. Here's my review of WIKI-INJECT-MS0/U-WIM02.

## Verification of the 5 changes

1. **`import { spawn }`** — line 37, present, clean.
2. **New consts** — lines 68-71: `EMB_MODEL`, `PREWARM_THROTTLE_MS` (`Math.max(60000, ...)` floor correct), `PREWARM_STAMP` (in `CACHE_DIR`), `EMB_KEEP_ALIVE`. All present and correctly placed in the const block.
3. **`prewarmEmbedModel`** — lines 366-385: disable check, `existsSync(EMB_INDEX)` gate, throttle via `PREWARM_STAMP` mtime, stamp-before-spawn, detached/`stdio:"ignore"`/`unref`, 60s `AbortController` + `process.exit(0)` in `finally`, whole body `try/catch → false`. Matches spec.
4. **Called in `main()`** — line 427, after disable check (426), before `skip_short` (429). Matches spec.
5. **`keep_alive`** — line 349, `keep_alive: EMB_KEEP_ALIVE` in the embed body. Present.

## Findings against the specific checks

**Can `prewarmEmbedModel` throw and break the hot path?** No. The entire body (lines 369-384) after the two early-return guards is inside `try { ... } catch { return false; }`. The two pre-`try` lines (367-368) are an env-string compare and `existsSync` — neither throws. `main()` calls it bare at line 427 but no throw can escape. Safe.

**`node -e` string injection-safety against a hostile `OLLAMA_HOST`** — Safe. `OLLAMA_URL` (line 56) is embedded via `JSON.stringify(OLLAMA_URL)` (line 378), and `body` via `JSON.stringify(body)` where `body` is itself a `JSON.stringify` (line 376). `JSON.stringify` on a string produces a valid JS string literal — it escapes `"`, `\`, and control chars, and JS string literals cannot contain a raw newline. A hostile `OLLAMA_HOST` like `127.0.0.1"});require('child_process')...` would be embedded as a quoted/escaped literal, not break out. The only residual is `</script>`-style concerns, which are N/A for `node -e`. JSON.stringify genuinely escapes here. No injection defect.

**Detached child lifecycle** — Acceptable. The spawned JS has a 60s `AbortControlle
... [+3340 chars truncated]
