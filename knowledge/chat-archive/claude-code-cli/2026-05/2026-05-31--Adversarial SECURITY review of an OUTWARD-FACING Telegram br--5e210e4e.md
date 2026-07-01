---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Adversarial SECURITY review of an OUTWARD-FACING Telegram bridge to an internal-"
date: "2026-05-31"
first_ts: "2026-05-31T03:35:50.355Z"
last_ts: "2026-05-31T03:37:19.595Z"
cwd: "H:\\prism-slot-bravo"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-adb482d917b6d2650.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Adversarial SECURITY review of an OUTWARD-FACING Telegram bridge to an internal-

> **claude-code-cli** | 2026-05-31 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-adb482d917b6d2650.jsonl`

## Transcript

### User | 2026-05-31T03:35:50.355Z

Adversarial SECURITY review of an OUTWARD-FACING Telegram bridge to an internal-only system. Grade PASS/FAIL, P0/P1 only. Read fully:
1. H:/prism-zulu-obsidian/scripts/zulu-telegram-bridge.mjs
2. H:/prism-zulu-obsidian/scripts/zulu-telegram-bridge.test.mjs
3. H:/prism-zulu-obsidian/scripts/obsidian-live-setup-check.mjs

THREAT MODEL: anyone on the internet can send this bot messages (it long-polls Telegram). PRISM is internal-only; nothing must leak or mutate. The bot is meant to be READ-ONLY, default-deny, and answer only an allowlisted operator.

Attack the design — for each, say whether it's blocked and rate any hole P0/P1:
1. WRITE/MUTATION: is there ANY path (any message, any verb, any param) that mutates the brain, vault, filesystem, repo, env, or process state? Confirm there is no write/PUT/POST-with-body/delete/exec/eval/spawn/fs-write anywhere reachable from a message. (Note: it POSTs to Telegram sendMessage + Obsidian /search — confirm those are the ONLY outbound effects and neither writes brain/vault state.)
2. ALLOWLIST BYPASS: can a non-allowlisted chat get ANY response or cause ANY effect? Check handleUpdate ordering (is the allowlist check truly before any brainQuery/sendMessage?), the empty-allowlist default-deny, and chat-id type coercion (number vs string — could 123 vs "123" mismatch let someone in or wrongly deny? is that a security issue either way?).
3. INJECTION via the query string: parseCommand uses VERB_RE = /^\/(recall|search|status)(?:@\w+)?(?:\s+([\s\S]{1,512}))?$/i. Can a crafted message smuggle a second command, a path traversal, a shell metachar, or an SSRF host into anything that reaches the filesystem / a URL / a process? The query goes to encodeURIComponent into the Obsidian /search path — confirm it cannot escape the loopback host or the /search/simple route. Is the 512-char cap + single-line anchoring sufficient?
4. SECRET LEAK: can the bot token or the Obsidian API key ever appear in (a) a Telegram reply, (b) a log line, (c) an 
... [+1329 chars truncated]

### Assistant | 2026-05-31T03:36:01.359Z

I'll read all three files completely before assessing.

### Assistant | 2026-05-31T03:36:02.280Z

[tool_use: Read]

### Assistant | 2026-05-31T03:36:02.766Z

[tool_use: Read]

### Assistant | 2026-05-31T03:36:03.056Z

[tool_use: Read]

### User | 2026-05-31T03:36:09.783Z

[tool_result] 1	/**
2	 * zulu-telegram-bridge.test.mjs — ZULU-OBSIDIAN-LIVE-MS0
3	 *
4	 * Security-critical tests for the outward-facing Telegram bridge. Run:
5	 *   node --test scripts/zulu-telegram-bridge.test.mjs
6	 *
7	 * Focus: default-deny allowlist, strict verb parse (no injection), output
8	 * sanitization (no secret/token/path leak), rate limiting, and the handleUpdate
9	 * control flow (denied / ignor
... [+6312 chars truncated]

### User | 2026-05-31T03:36:09.789Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * zulu-telegram-bridge.mjs — ZULU-OBSIDIAN-LIVE-MS0
4	 * =================================================
5	 *
6	 * Mobile gateway that lets an ALLOWLISTED operator query the PRISM brain (the
7	 * live Obsidian vault on :27123) from Telegram. The Zulu fleet-orchestrator's
8	 * mobile read surface. OUTWARD-FACING on an internal-only system, so it is
9	 * hardened, fa
... [+13846 chars truncated]

### User | 2026-05-31T03:36:09.862Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * obsidian-live-setup-check.mjs — ZULU-OBSIDIAN-LIVE-MS0
4	 * ======================================================
5	 *
6	 * Operator green/red probe for the live-brain + mobile setup. Run after the
7	 * one-time setup (install Obsidian → open H:/prism/knowledge as a vault →
8	 * enable the "Local REST API" plugin → copy its key into PRISM_OBSIDIAN_API_KEY;
9	 * cr
... [+4867 chars truncated]

### Assistant | 2026-05-31T03:37:19.595Z

I've read all three files end-to-end. Here is my adversarial security review.

---

## VERDICT: PASS (with 1 P1)

The design is genuinely strong: read-only by construction, default-deny, fail-closed, loopback-pinned, with the allowlist check correctly ordered before any effect. One real P1 (token-shape leak gap) and a few P2/P3 notes. No P0.

---

## Per-attack findings

### 1. WRITE/MUTATION — BLOCKED (no hole)
Traced every reachable effect from a message. The only outbound side effects are:
- `tgCall(token, "sendMessage", …)` — POST to `api.telegram.org`, body is `{chat_id, text}`. Writes nothing in PRISM.
- `obsidianRequest` POST to `/search/simple/?query=…` — Obsidian Local REST API `/search/simple` is a **read** endpoint (returns matches); the POST verb is the API's convention, the body is empty (`req.end()` with no `write`). No PUT/PATCH/DELETE, no request body, no path that hits a vault-write route (`/vault/...` PUT is never constructed).
- `defaultBrainQuery` `status` → GET `/`.

No `fs.write*`, `child_process`, `exec`, `eval`, `Function`, `spawn`, or `vm` anywhere in the module. `crypto` is hash-only. The query string never reaches a filesystem path or a process arg — it is `encodeURIComponent`'d into a URL query param only. Confirmed: the two POSTs are the only outbound effects and neither mutates brain/vault state. **No write path. Clean.**

### 2. ALLOWLIST BYPASS — BLOCKED (ordering correct)
`handleUpdate` (bridge:226-232): `chatId` null-guard → **`isAllowedChat` check → `return "denied"`** happens *before* `parseCommand`, `rateLimiter`, `brainQuery`, or any `sendMessage`. A denied chat gets zero response and only a hashed-id counter (test line 100-107 proves `sent.length === 0`). Empty allowlist → `isAllowedChat` returns `false` unconditionally (`allowSet.size > 0 &&` short-circuits, bridge:74). Default-deny confirmed.

Type coercion: `isAllowedChat` stringifies both the incoming `chatId` and the env entries (`allowSet` holds strings, `has(String(chatI
... [+8997 chars truncated]
