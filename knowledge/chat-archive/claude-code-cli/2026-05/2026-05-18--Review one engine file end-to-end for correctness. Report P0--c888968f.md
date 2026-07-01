---
type: "chat-session"
source: "claude-code-cli"
session_id: "c888968f-188f-46e2-89ce-8ef2bde404f7"
title: "Review one engine file end-to-end for correctness. Report P0/P1, then grade PASS"
date: "2026-05-18"
first_ts: "2026-05-18T03:09:52.375Z"
last_ts: "2026-05-18T03:10:56.929Z"
cwd: "H:\\prism\\mcp-server"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/c888968f-188f-46e2-89ce-8ef2bde404f7/subagents/agent-a9da7416cf6b9aa8f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review one engine file end-to-end for correctness. Report P0/P1, then grade PASS

> **claude-code-cli** | 2026-05-18 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/c888968f-188f-46e2-89ce-8ef2bde404f7/subagents/agent-a9da7416cf6b9aa8f.jsonl`

## Transcript

### User | 2026-05-18T03:09:52.375Z

Review one engine file end-to-end for correctness. Report P0/P1, then grade PASS or FAIL.

FILE: H:/prism/mcp-server/src/engines/GrokCLIClientEngine.ts

CONTRACT:
- It is a consensus "voice" client: a subprocess wrapper around xAI's Grok CLI ("Grok Build", an agentic coding CLI). It must return a one-shot answer for a reasoning/review prompt.
- It is a sibling of H:/prism/mcp-server/src/engines/CodexClientEngine.ts (read that for the established pattern) and GrokClientEngine.ts (the HTTP twin).
- CRITICAL voice contract: `run()` must NEVER throw on a CLI failure — it returns `{ok:false, error}`. It throws ONLY on caller misuse (invalid options). A failed voice must degrade the consensus fan-out, never crash it.
- SECURITY INVARIANT: the Grok CLI is agentic (writes files, runs shell actions). The prompt is LLM/context-generated and untrusted. The engine must (a) deliver the prompt ONLY via stdin, never argv — argv under `shell:true` on Windows is a shell-injection vector; (b) run the CLI in an isolated temp working directory so stray file writes don't hit the repo; (c) close stdin so the agentic CLI can't block on an interactive turn; (d) bound every run with a timeout.
- The CLI flag surface is early-beta, so bin/args/model/timeout are all env-overridable.

VERIFY:
1. Every spawn/exit/error/timeout/stdin path settles the Promise exactly once and never throws out.
2. The null-stdio-pipe guard is correct and complete (all of stdout/stderr/stdin).
3. `shell:true` is only ever used with static, caller-controlled argv — confirm the prompt and any untrusted string can never reach argv.
4. The timeout fires, kills the child, and settles; no timer leak.
5. Constants are not inlined magic numbers; validation is complete; the docstring matches the code.
6. Compare against CodexClientEngine.ts — is the convention (Windows .cmd shell handling, stderr-tail capture, fail() helper, validate()) followed? Note any divergence and whether it is justified.
7. Any way `run()` can hang f
... [+133 chars truncated]

### Assistant | 2026-05-18T03:10:03.433Z

I'll review the engine file end-to-end against the contract. Let me read the target file and its siblings.

### Assistant | 2026-05-18T03:10:04.273Z

[tool_use: Read]

### Assistant | 2026-05-18T03:10:04.701Z

[tool_use: Read]

### Assistant | 2026-05-18T03:10:04.778Z

[tool_use: Read]

### User | 2026-05-18T03:10:06.457Z

[tool_result] 1	/**
2	 * GrokCLIClientEngine — subprocess wrapper around xAI's Grok CLI.
3	 *
4	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS1 / OCTOPUS-CONSENSUS / GROK-CLI.
5	 *
6	 * Companion to {@link GrokClientEngine} (HTTP, needs `XAI_API_KEY`). THIS
7	 * engine drives the *CLI* — xAI's "Grok Build" (released 2026-05) or the
8	 * API-compatible community `grok` CLI (npm `grok-dev`). The CLI authenticates
9	 * vi
... [+9242 chars truncated]

### User | 2026-05-18T03:10:07.523Z

[tool_result] 1	/**
2	 * CodexClientEngine — Subprocess wrapper around the OpenAI `codex` CLI.
3	 *
4	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
5	 *
6	 * The codex CLI runs the user's authenticated ChatGPT subscription end-to-end
7	 * (login persisted in `~/.codex/`); we shell out via `codex exec` and capture
8	 * the trailing answer + token count from stderr. Default model: `gpt-5.5` at
9	 *
... [+8518 chars truncated]

### User | 2026-05-18T03:10:07.559Z

[tool_result] 1	/**
2	 * GrokClientEngine — HTTP client for xAI's Grok API.
3	 *
4	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS / GROK.
5	 *
6	 * Wraps the OpenAI-compatible /v1/chat/completions endpoint at api.x.ai.
7	 * Default model: grok-4 (most powerful, supports reasoning mode).
8	 *
9	 * Auth: requires `XAI_API_KEY` env var (or pass apiKey explicitly). Premium
10	 * Grok subscriptions incl
... [+6229 chars truncated]

### Assistant | 2026-05-18T03:10:56.929Z

This is a review task — no edits will be made, so the backend audit chain and engine-conventions reminders are advisory only. Let me analyze the file end-to-end against the contract.

## Analysis

I traced every Promise-settlement path, the spawn/stdio guards, the shell-injection surface, and the timeout lifecycle, and compared against `CodexClientEngine.ts`.

### Promise settlement (VERIFY 1, 7)

Every path is guarded by the `settled` latch in `settle()` (L111-115). Paths:
- spawn throw → `settle` via catch (L130)
- null stdio → `settle` (L137)
- timeout → `settle` (L142)
- `error` event → `settle` (L152)
- `exit` non-zero / empty / success → `settle` (L158/162/164)
- stdin write throw → `settle` (L182)

The `settled` latch makes double-resolve harmless, and `resolve()` never throws. **No path throws out of the executor.** Hang analysis: a `child` that neither emits `exit`/`error` is still bounded by the `timer` (L140-143), which always settles. No hang path exists.

### P1 — Timer leak on stdin-write failure (L176-183)

This is the one real defect. On the success path stdin-write throws are handled, but compare the ordering against the other settle sites:

```
176  try {
177    child.stdin.write(options.prompt);
178    child.stdin.end();
179  } catch (e) {
180    clearTimeout(timer);
181    try { child.kill(); } catch { /* ignore */ }
182    settle(this.fail(start, model, `stdin write failed: ...`, ...));
183  }
```

This branch is correct — it `clearTimeout`s, kills, and settles. **However**, there is a subtle leak: if `child.stdin.write()` does **not** throw synchronously but the stream later emits an async `'error'` event (EPIPE — the agentic CLI exits/closes stdin before the write drains), that error is **unhandled**. `child.stdin` has no `'error'` listener. An unhandled `'error'` on a stream emits an `uncaughtException`-class crash in Node — it will **crash the process**, violating the "never crash the fan-out" voice contract.

`CodexClientEngine` has the ide
... [+6116 chars truncated]
