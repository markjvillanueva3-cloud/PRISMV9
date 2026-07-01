---
type: "chat-session"
source: "claude-code-cli"
session_id: "885d585d-959c-404a-8eef-a5542d5006dd"
title: "Review a small hardening diff in the live PRISM repo (slot alpha). Unit U-HERMES"
date: "2026-06-24"
first_ts: "2026-06-24T18:10:56.767Z"
last_ts: "2026-06-24T18:12:27.841Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a7f3dc54428ac5341.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Review a small hardening diff in the live PRISM repo (slot alpha). Unit U-HERMES

> **claude-code-cli** | 2026-06-24 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a7f3dc54428ac5341.jsonl`

## Transcript

### User | 2026-06-24T18:10:56.767Z

Review a small hardening diff in the live PRISM repo (slot alpha). Unit U-HERMES-TIER-OLLAMA-TIMEOUT-KNOB.

Files changed (read both end-to-end):
- H:/prism/scripts/lib/verified-offload-tiered.mjs
- H:/prism/scripts/lib/verified-offload-tiered.test.mjs

The change: the Ollama tier's `makeOllamaRunner` previously hardcoded `timeoutMs = 30000` while the Hermes tier (`makeHermesRunner`) used an env-knobbed module constant `DEFAULT_TIMEOUT_MS` (PRISM_TIERED_OFFLOAD_TIMEOUT_MS || 120000). The diff adds a sibling constant `DEFAULT_OLLAMA_TIMEOUT_MS = Number(process.env.PRISM_TIERED_OLLAMA_TIMEOUT_MS || 30000)` and makes `makeOllamaRunner`'s default `timeoutMs = DEFAULT_OLLAMA_TIMEOUT_MS`. A new test pins (a) the runner forwards timeoutMs to the injected caller and (b) the default is 30000, plus an explicit-override case.

Verify, with file:line citations:
1. CORRECTNESS: the env-knob default is behavior-preserving when the env var is unset (still 30000 — no behavior change for existing callers).
2. CONVENTION (R11): the new constant matches the Hermes-tier env-knob pattern (Number(process.env.X || default)).
3. TEST INTEGRITY (R9): the new test would FAIL if the timeout forwarding were dropped or the default changed (not a toBeDefined stub). Confirm the env-unset assumption (asserts 30000) is sound for CI.
4. No inlined constant left behind; no unused symbol; ASCII-only (no em-dashes); no floating promise (the PreToolUse hook warned — confirm all promises in the added test are awaited).
5. Any silent breakage to consumers of makeOllamaRunner.

Grade PASS or FAIL with P0/P1/P2 findings. This is read-only.

### Assistant | 2026-06-24T18:11:03.663Z

I'll read both files end-to-end before making any judgment.

### Assistant | 2026-06-24T18:11:04.087Z

[tool_use: Read]

### Assistant | 2026-06-24T18:11:04.183Z

[tool_use: Read]

### User | 2026-06-24T18:11:08.780Z

[tool_result] 1	// scripts/lib/verified-offload-tiered.mjs
2	// U-HERMES-VERIFIED-TIER (2026-06-24, slot:alpha): the TIERED form of the
3	// verified-offload keystone (./ollama-verified-offload.mjs). Closes the verified
4	// gap "the Hermes lane is BUILT + instrumented but DARK": ask-hermes.mjs records
5	// byHook["ask-hermes"] into the canonical offload-stats, yet NOTHING automated
6	// invokes the strong lane
... [+11748 chars truncated]

### User | 2026-06-24T18:11:08.854Z

[tool_result] 1	// R9 coverage for the tiered verified-offload ladder (Hermes -> Ollama -> fallback).
2	// Pins the SAFETY + TIERING contract of verified-offload-tiered.mjs:
3	//   - the verifier gates EVERY tier (a hallucinated STRONG answer is rejected,
4	//     never trusted -- the load-bearing safety invariant);
5	//   - strong success short-circuits (Ollama never called);
6	//   - empty / throw / verify-fa
... [+12106 chars truncated]

### Assistant | 2026-06-24T18:11:13.273Z

Both files are fully read. Now let me verify the specific claims against the actual code before rendering a verdict.

### Assistant | 2026-06-24T18:11:15.241Z

[tool_use: Grep]

### Assistant | 2026-06-24T18:11:15.859Z

[tool_use: Grep]

### User | 2026-06-24T18:11:19.879Z

[tool_result] 52:const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_TIERED_OFFLOAD_TIMEOUT_MS || 120000);
57:const DEFAULT_OLLAMA_TIMEOUT_MS = Number(process.env.PRISM_TIERED_OLLAMA_TIMEOUT_MS || 30000);
77:export function makeHermesRunner({ mode = "ask", input = "", model = DEFAULT_HERMES_MODEL, url = DEFAULT_HERMES_URL, token = DEFAULT_HERMES_TOKEN, timeoutMs = DEFAULT_TIMEOUT_MS, maxTokens, fetchImpl } = {}
... [+142 chars truncated]

### User | 2026-06-24T18:11:21.506Z

[tool_result] scripts\lib\verified-offload-tiered.mjs:26:// makeHermesRunner / makeOllamaRunner build the real runners for the CLI/harness.
scripts\lib\verified-offload-tiered.mjs:77:export function makeHermesRunner({ mode = "ask", input = "", model = DEFAULT_HERMES_MODEL, url = DEFAULT_HERMES_URL, token = DEFAULT_HERMES_TOKEN, timeoutMs = DEFAULT_TIMEOUT_MS, maxTokens, fetchImpl } = {}) {
scripts\lib\verified-
... [+3126 chars truncated]

### Assistant | 2026-06-24T18:11:24.559Z

Now check for external callers of `makeOllamaRunner` to assess silent-breakage risk, and verify the `input` parameter handling in the Ollama runner body.

### Assistant | 2026-06-24T18:11:25.707Z

[tool_use: Grep]

### Assistant | 2026-06-24T18:11:26.353Z

[tool_use: Grep]

### User | 2026-06-24T18:11:31.028Z

[tool_result] scripts\lib\verified-offload-tiered.test.mjs:21:  makeOllamaRunner,
scripts\lib\verified-offload-tiered.test.mjs:197:// ---- makeOllamaRunner ----
scripts\lib\verified-offload-tiered.test.mjs:198:test("makeOllamaRunner: ok result -> text; not-ok -> ''", async () => {
scripts\lib\verified-offload-tiered.test.mjs:199:  const okRun = makeOllamaRunner({ input: "x", callImpl: async () => ({ ok: true, t
... [+1498 chars truncated]

### User | 2026-06-24T18:11:49.234Z

[tool_result] scripts\lib\verified-offload-tiered.test.mjs:209:  // Assumes PRISM_TIERED_OLLAMA_TIMEOUT_MS is unset in the test env (CI default).

### Assistant | 2026-06-24T18:11:52.460Z

Now read the two call sites in `ollama-offload.mjs` to confirm they pass no explicit `timeoutMs` to `makeOllamaRunner`.

### Assistant | 2026-06-24T18:11:52.946Z

[tool_use: Read]

### User | 2026-06-24T18:11:57.323Z

[tool_result] 85	 * ladder: Hermes(strong, stronger-than-Ollama) first, then local Ollama, then the
86	 * safe fallback (default null -- a hallucinated label can never surface, identical
87	 * to offloadClassify). Records the off-Claude call into byHook["ask-hermes"], so a
88	 * verified Hermes classification lights the otherwise-dark lane. Injectable
89	 * hermesRunImpl/ollamaRunImpl/record for hermetic tests.
... [+3361 chars truncated]

### Assistant | 2026-06-24T18:12:27.841Z

I have all the evidence I need. Here is the verdict.

---

VERDICT: PASS

summary: The `DEFAULT_OLLAMA_TIMEOUT_MS` constant correctly mirrors the Hermes-tier env-knob pattern, is behavior-preserving when unset (30000 unchanged), and the new test is a genuine R9 lock that would fail if the forwarding or the default were broken. Both consumers in `ollama-offload.mjs` pass no explicit `timeoutMs`, so they silently inherit the new knob without source changes. No inlined constant remains, no floating promise, no non-ASCII characters, no unused symbol.

findings:

- [P2] `H:/prism/scripts/lib/verified-offload-tiered.test.mjs:209` -- The comment "Assumes PRISM_TIERED_OLLAMA_TIMEOUT_MS is unset in the test env (CI default)" is a CI assumption documented only in prose, not enforced. If a CI machine sets `PRISM_TIERED_OLLAMA_TIMEOUT_MS` in its environment (e.g. from a `.env` sourced by a wrapper script), the `assert.equal(seen, 30000 ...)` at line 213 would fail with no explanation. A two-line guard at the top of that test (`if (process.env.PRISM_TIERED_OLLAMA_TIMEOUT_MS) { assert.fail("PRISM_TIERED_OLLAMA_TIMEOUT_MS must be unset for this test") }`) would make the failure loud and actionable rather than mysterious. Deferrable because CI does not currently set this variable, but worth noting before this test suite runs on a broader infra.

---

Verified items, auditable:

1. CORRECTNESS (`verified-offload-tiered.mjs:57`): `Number(process.env.PRISM_TIERED_OLLAMA_TIMEOUT_MS || 30000)` -- when the env var is absent the `||` short-circuits to `30000`, identical to the prior hardcoded value. Behavior is fully preserved for all existing callers.

2. CONVENTION R11 (`verified-offload-tiered.mjs:52` vs `57`): The new constant follows the exact Hermes-tier pattern byte-for-byte -- `Number(process.env.X || N)`. Naming is parallel: `DEFAULT_TIMEOUT_MS` / `PRISM_TIERED_OFFLOAD_TIMEOUT_MS` for Hermes; `DEFAULT_OLLAMA_TIMEOUT_MS` / `PRISM_TIERED_OLLAMA_TIMEOUT_MS` for Ollama. The comment b
... [+1906 chars truncated]
