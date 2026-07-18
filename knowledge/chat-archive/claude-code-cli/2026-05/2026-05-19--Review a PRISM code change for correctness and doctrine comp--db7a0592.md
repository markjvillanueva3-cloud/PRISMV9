---
type: "chat-session"
source: "claude-code-cli"
session_id: "db7a0592-d0c4-4ab7-be50-a016b8101712"
title: "Review a PRISM code change for correctness and doctrine compliance. Report P0/P1"
date: "2026-05-19"
first_ts: "2026-05-19T16:37:09.191Z"
last_ts: "2026-05-19T16:38:46.831Z"
cwd: "H:\\PRISM"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/db7a0592-d0c4-4ab7-be50-a016b8101712/subagents/agent-a8c9b2b78bba1a37e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Review a PRISM code change for correctness and doctrine compliance. Report P0/P1

> **claude-code-cli** | 2026-05-19 | 10 msgs (4 user / 6 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/db7a0592-d0c4-4ab7-be50-a016b8101712/subagents/agent-a8c9b2b78bba1a37e.jsonl`

## Transcript

### User | 2026-05-19T16:37:09.191Z

Review a PRISM code change for correctness and doctrine compliance. Report P0/P1/P2/P3 findings and a PASS/FAIL verdict in under 300 words.

CHANGE: PRISM unit DOCKER-MCP-WIRE-MS0/U-MODELS-FALLBACK adds a Docker Models fallback to the local-LLM caller. Two files:
1. `H:/PRISM/scripts/ask-ollama.mjs` — ADDITIVE edit only. 3 new exported functions inserted right after the existing `callOllama` function (around line 383): `mapOllamaToDockerModel(name)`, `callDockerModel(model, prompt, opts)`, `callLocalModel(model, prompt, opts)`. Plus 2 module consts `OLLAMA_DAEMON_DOWN_RE` and `DEFAULT_DOCKER_MODEL_MAP`. `callOllama` itself is NOT modified.
2. `H:/PRISM/scripts/ask-ollama-fallback.test.mjs` — NEW file, 17 node:test cases.

Read BOTH files end to end. Focus the impl review on lines ~383–490 of ask-ollama.mjs (the inserted block).

VERIFY:
- `callDockerModel` uses execFile argv-array form (injection-safe) — confirm no shell string.
- `callLocalModel` only falls back on genuine daemon-down errors (regex OLLAMA_DAEMON_DOWN_RE), NOT on real errors like bad-model-name or empty-response. Confirm a non-daemon error is returned as-is.
- `callOllama` is genuinely unmodified (back-compat preserved for its existing callers/tests).
- Fail-loud (R12): no silent swallowing. Every error path returns an explicit `{ok:false,error}`.
- `mapOllamaToDockerModel` fail-soft on malformed PRISM_DOCKER_MODEL_MAP env (defaults stand).
- No inlined physics constants (should be none — this is infra code).
- The PreToolUse hook flagged "unreachable-after-return" in callLocalModel — confirm whether that is a real bug or a false positive (the function has multiple early `return` statements; verify all are reachable).
- Error budget completeness: timeout, non-zero-exit, empty-output, maxBuffer-exceeded all handled in callDockerModel.

Report findings. If any P0/P1, name the exact line and the fix. End with `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-19T16:37:22.357Z

I'll review both files end to end.

### Assistant | 2026-05-19T16:37:23.856Z

[tool_use: Read]

### Assistant | 2026-05-19T16:37:25.897Z

[tool_use: Read]

### User | 2026-05-19T16:37:43.505Z

[tool_result] 300	} = {}) {
301	  const tooLarge = [];
302	  for (const name of GRAPH_CANDIDATES) {
303	    const path = join(root, "state", "shared", "system-viz", name);
304	    if (!existsImpl(path)) continue;
305	    let size;
306	    try {
307	      size = statImpl(path).size;
308	    } catch (e) {
309	      return { ok: false, error: `cannot stat ${name}: ${e.message}` };
310	    }
311	    if (!Number.isF
... [+9465 chars truncated]

### User | 2026-05-19T16:37:46.204Z

[tool_result] 1	// Tests for the Docker Models fallback added in
2	// DOCKER-MCP-WIRE-MS0/U-MODELS-FALLBACK (scripts/ask-ollama.mjs).
3	// node:test — no real docker/ollama: every external call is an injected impl.
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import { execFile } from "node:child_process";
7	import { promisify } from "node:util";
8	import { fileURLToPath, path
... [+9497 chars truncated]

### Assistant | 2026-05-19T16:38:06.290Z

Let me verify `execFileAsync` is defined and `callOllama` callers are unaffected.

### Assistant | 2026-05-19T16:38:07.199Z

[tool_use: Grep]

### User | 2026-05-19T16:38:32.155Z

[tool_result] 46:import { execFile } from "node:child_process";
49:/** Promisified execFile — argv-array form, never a shell string (injection-safe). */
50:const execFileAsync = promisify(execFile);
353:export async function callOllama(model, prompt, opts = {}) {
392:// of failing hard. Opt-in via callLocalModel; callOllama itself is untouched.
439: * completion to stdout. Uses execFile (argv-array form, never 
... [+627 chars truncated]

### Assistant | 2026-05-19T16:38:46.831Z

## Code Quality Analysis Report — DOCKER-MCP-WIRE-MS0/U-MODELS-FALLBACK

### Summary
Files: 2 · Inserted block: ask-ollama.mjs ~383–493 · Tests: 17 cases

### Verification results
- **execFile argv-array (injection-safe)** — CONFIRMED. Line 446–450: `execFileImpl("docker", ["model","run",model,prompt], {...})`. No shell string, no `exec`, no template interpolation into a command. `execFileAsync = promisify(execFile)` (line 50).
- **Daemon-down-only fallback** — CONFIRMED. Line 483: non-matching `OLLAMA_DAEMON_DOWN_RE` returns `{...primary, source:"ollama"}` as-is. Test line 211 proves an empty-response error is returned unmasked, Docker not called.
- **callOllama unmodified** — CONFIRMED. Lines 353–387 identical to pre-edit; all 3 downstream callers (561/579/590) untouched. Back-compat preserved.
- **Fail-loud (R12)** — CONFIRMED. Every path returns explicit `{ok:false,error}`; no silent swallow. `mapOllamaToDockerModel`'s empty `catch {}` is intentional fail-soft with a documented comment.
- **mapOllamaToDockerModel env fail-soft** — CONFIRMED. Malformed JSON, array shape, non-object all fall through to `DEFAULT_DOCKER_MODEL_MAP`. Tested (lines 47–59).
- **No inlined physics constants** — CONFIRMED (infra code, none expected).
- **"unreachable-after-return" hook flag** — FALSE POSITIVE. `callLocalModel` has 5 early returns (481/482/484/487/489) plus a final return (492). All reachable: each guards a distinct condition; line 492 executes only when `fb.ok` is false. Linear, no dead code.
- **Error budget in callDockerModel** — CONFIRMED. Timeout (`e.killed||e.signal` → line 457), non-zero-exit (caught, line 460), empty-output (line 452), maxBuffer-exceeded (8 MB cap line 449; overflow throws → caught at 456). Complete.

### Findings
- **P2** — Timeout detection (`e.killed || e.signal`) also tags any signal-killed child (e.g. SIGKILL by the fleet-reaper) as a timeout. Minor mislabel; cosmetic, not a correctness defect.
- **P3** — `callDockerModel` discards `stderr`; a
... [+137 chars truncated]
