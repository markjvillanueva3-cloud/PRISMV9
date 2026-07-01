---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "Review a circuit-breaker fix (unit U-OLLAMA-REWRITE-CIRCUIT-BREAKER, slot alpha)"
date: "2026-06-02"
first_ts: "2026-06-02T19:26:14.770Z"
last_ts: "2026-06-02T19:33:54.390Z"
cwd: "H:\\prism-slot-alpha"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a2070fe4ab610ce54.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# Review a circuit-breaker fix (unit U-OLLAMA-REWRITE-CIRCUIT-BREAKER, slot alpha)

> **claude-code-cli** | 2026-06-02 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a2070fe4ab610ce54.jsonl`

## Transcript

### User | 2026-06-02T19:26:14.770Z

Review a circuit-breaker fix (unit U-OLLAMA-REWRITE-CIRCUIT-BREAKER, slot alpha). Read all three files END TO END and grade PASS/FAIL with any P0/P1 issues:

1. PATCHER: H:/prism-slot-alpha/scripts/patch-prompt-rewriter-circuit-breaker.mjs
2. LIVE PATCHED HOOK: H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs (review the OLLAMA_CHAT_CB additions: the constants/helpers block ~after the LOG_PATH const, the fast-skip block before "Wall-clock budget", the recordChatOutcome(true) self-heal after rewriteWithOllama, the recordChatOutcome(false) self-trip in catch, and the IIFE→`export async function main()` + tail guard/exports)
3. TEST: H:/prism-slot-alpha/scripts/__tests__/prompt-rewriter-circuit-breaker.test.mjs

CONTEXT: session-start-ollama-chat-probe.mjs (H:/prism/.claude/hooks/) writes a stamp {chatOk,lastProbeAt} to tmpdir/prism-hook-state/ollama-chat-state.json. The rewriter fires on every UserPromptSubmit and was POSTing /api/chat → hanging the full 8s WALL_TIMEOUT_MS whenever a chat model was resident but inference GPU-wedged. The CB reads the stamp and fast-skips when down+fresh; self-heals by writing the stamp on its own outcome. Reversible via PRISM_OLLAMA_REWRITE_CB_DISABLE=1.

VERIFY SPECIFICALLY:
- Correctness of the IIFE→main() transform: does main() still run in production (invoked as `node prompt-rewriter-ollama.mjs`, argv[1] ends with the filename)? Does it stay dormant on `import` (so the test can import isChatDownFresh)?
- isChatDownFresh fail-open logic: only an EXPLICIT chatOk===false + fresh lastProbeAt trips it; everything else (missing/up/stale/NaN/non-object) must return false so a working route is never suppressed and garbage never blocks.
- Self-heal coupling: recordChatOutcome writes the SAME stamp the probe owns — is the written schema compatible ({lastProbeAt,chatOk,source})? Could it corrupt the probe's reads? (probe reads chatOk + lastProbeAt only.)
- Patcher safety: single-line anchors each asserted to match exactly once (fail-loud), n
... [+314 chars truncated]

### Assistant | 2026-06-02T19:26:41.967Z

I'll review all three files end to end. Let me read them in parallel.

### Assistant | 2026-06-02T19:26:42.396Z

[tool_use: Read]

### Assistant | 2026-06-02T19:26:42.737Z

[tool_use: Read]

### Assistant | 2026-06-02T19:26:43.387Z

[tool_use: Read]

### User | 2026-06-02T19:30:02.540Z

[tool_result] 1	#!/usr/bin/env node
2	// patch-prompt-rewriter-circuit-breaker.mjs
3	// U-OLLAMA-REWRITE-CIRCUIT-BREAKER (slot:alpha, 2026-06-02, TOKEN-SAVINGS/latency)
4	//
5	// WHY: `session-start-ollama-chat-probe.mjs` writes a {chatOk,lastProbeAt} stamp
6	// to tmpdir/prism-hook-state/ollama-chat-state.json EXPLICITLY so downstream
7	// Ollama-routing hooks "can read isOllamaChatDown() and short-circuit" — 
... [+8964 chars truncated]

### User | 2026-06-02T19:30:03.983Z

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
... [+17693 chars truncated]

### User | 2026-06-02T19:30:05.549Z

[tool_result] 1	// prompt-rewriter-circuit-breaker.test.mjs
2	// U-OLLAMA-REWRITE-CIRCUIT-BREAKER (slot:alpha, 2026-06-02)
3	//
4	// Verifies the circuit-breaker wired into the LIVE hook
5	// H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs:
6	//   - pure isChatDownFresh() truth table (imported — the argv guard keeps main() dormant on import);
7	//   - REAL subprocess oracle: the hook fast-skips on a down+fres
... [+5846 chars truncated]

### Assistant | 2026-06-02T19:30:27.630Z

All three files read end to end. Let me verify the load-bearing claims against the actual hook source rather than trust the patcher's intent. The key questions: does `main()` actually run in production, and is the anchor for the IIFE transform unambiguous?

Let me check a few specifics on the live hook.

### Assistant | 2026-06-02T19:30:30.079Z

[tool_use: Grep]

### Assistant | 2026-06-02T19:30:32.378Z

[tool_use: Bash]

### User | 2026-06-02T19:31:22.804Z

[tool_result] 286:export async function main() {
396:  main().catch(() => exit(0));

### User | 2026-06-02T19:32:15.107Z

[tool_result] CHECK_OK
EXPORTS: isChatDownFresh,main,readChatStateFile,recordChatOutcome

### Assistant | 2026-06-02T19:32:22.943Z

The import resolves cleanly and exports all four symbols without executing `main()` (no stdin block, no hang) — confirming dormancy on import. Let me verify the production-run path and that the import does not accidentally fire main, plus confirm the dead-port subprocess behavior the test relies on.

### Assistant | 2026-06-02T19:32:31.312Z

[tool_use: Bash]

### User | 2026-06-02T19:32:48.712Z

[tool_result] [prompt-rewriter] pickModel /api/ps probe failed: fetch failed — falling back to /api/tags
[prompt-rewriter] skip reason=unknown: fetch failed
EXIT=0

### Assistant | 2026-06-02T19:32:55.276Z

Production `main()` fires (debug output proves the body ran end to end), exits 0. Now let me confirm the test suite passes against the live patched hook, and check one subtle concern: the dead-port `127.0.0.1:9` path classifies as `unknown` not `ollama-offline` — does that affect the self-trip and the test's `notEqual chat-down-cb` assertions?

### Assistant | 2026-06-02T19:32:55.632Z

[tool_use: Bash]

### User | 2026-06-02T19:33:06.126Z

[tool_result]   ...
# Subtest: subprocess: down+fresh stamp → fast-skip via circuit-breaker (no 8s /api/chat hang)
ok 7 - subprocess: down+fresh stamp → fast-skip via circuit-breaker (no 8s /api/chat hang)
  ---
  duration_ms: 99.7007
  ...
# Subtest: subprocess: CB_DISABLE=1 + down+fresh → NOT the breaker path (knob restores prior behavior)
ok 8 - subprocess: CB_DISABLE=1 + down+fresh → NOT the breaker path (k
... [+365 chars truncated]

### Assistant | 2026-06-02T19:33:12.598Z

All 9 tests pass against the live patched hook. The patcher transform is verified live, the import is dormant, production `main()` runs, and the truth table is correct. I have enough to grade — let me also confirm the idempotency / re-patch-guard behavior and the dead-port classification concern.

The dead port `127.0.0.1:9` classified as `unknown` (not `ollama-offline`), which means `recordChatOutcome(false)` is NOT called on that path. That's fine for the test (it only asserts `skip_reason != chat-down-cb`), but worth noting the self-trip only fires on three specific kinds. Let me verify the idempotent re-run guard works.

### Assistant | 2026-06-02T19:33:17.013Z

[tool_use: Bash]

### User | 2026-06-02T19:33:27.710Z

[tool_result] {"ok":true,"status":"already-patched","marker":"OLLAMA_CHAT_CB","target":"H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs"}

### Assistant | 2026-06-02T19:33:54.390Z

Idempotent skip-if-marker confirmed. I have everything needed to grade.

## VERDICT: PASS

All three files reviewed end to end and verified live: hook syntax-checks clean, imports dormant (4 exports, no hang on import), production `main()` runs end to end via the argv guard, all 9 tests pass against the live patched file, and the patcher is idempotent.

### Verification of the specific claims

**IIFE→main() transform — CORRECT.** `export async function main()` at L286; tail guard `if (process.argv[1] && process.argv[1].endsWith("prompt-rewriter-ollama.mjs")) main().catch(() => exit(0))` at L395-397. Live-proven both ways: `import()` returns `{isChatDownFresh, main, readChatStateFile, recordChatOutcome}` with no stdin-read/hang (dormant), and `node prompt-rewriter-ollama.mjs` executes the body (debug trace fired, exit 0). The `.endsWith()` filename match is robust to the absolute Windows path the harness uses.

**isChatDownFresh fail-open — CORRECT.** Only `chatOk===false` + finite + fresh `lastProbeAt` returns true. Every other input (`null`/`undefined`/string/number → non-object guard; `chatOk:true`/absent → `!== false` guard; missing/`"x"` lastProbeAt → `Number.isFinite` guard; stale → TTL guard) returns false. A working/unknown route is never suppressed; garbage never blocks. Truth table tested exhaustively (6 pure cases).

**Self-heal stamp compatibility — CORRECT, no corruption risk.** `recordChatOutcome` writes `{lastProbeAt, chatOk, source}`. The probe reads only `chatOk` + `lastProbeAt` (both present, correct types — `chatOk` boolean, `lastProbeAt` `Date.now()` number). The extra `source:"prompt-rewriter"` field is additive and ignored by the probe's reader. Same path (`CHAT_STATE_FILE`, env-overridable, same tmpdir default). Whole-file `writeFileSync` of a single small JSON object — no partial-write/append corruption. Self-heal placement is right: `recordChatOutcome(true)` immediately after a successful `rewriteWithOllama` (L336, after `/api/chat` returns b
... [+1990 chars truncated]
