---
type: "chat-session"
source: "claude-code-cli"
session_id: "0bd2552c-f488-4919-a1de-61b8dee1f055"
title: "Per-file scrutiny review (PRISM per-file gate, arm A — content specialist). REVI"
date: "2026-05-18"
first_ts: "2026-05-18T02:28:27.204Z"
last_ts: "2026-05-18T02:29:39.398Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-afadc89994ea9b6c6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Per-file scrutiny review (PRISM per-file gate, arm A — content specialist). REVI

> **claude-code-cli** | 2026-05-18 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-afadc89994ea9b6c6.jsonl`

## Transcript

### User | 2026-05-18T02:28:27.204Z

Per-file scrutiny review (PRISM per-file gate, arm A — content specialist).

REVIEW THESE TWO FILES END-TO-END:
1. H:\PRISM\scripts\ask-ollama.mjs (primary — the implementation)
2. H:\PRISM\scripts\__tests__\ask-ollama.test.mjs (its 50-case test suite)

CONTRACT being verified (OLLAMA-EXPAND-MS0/U-OE01):
`ask-ollama.mjs` is a CLI that offloads token-heavy work to a LOCAL Ollama
model (qwen2.5-coder:3b) so heavy inputs never enter the Claude context.
Design: PURE functions (exported, unit-tested) + a thin IMPURE shell whose
I/O deps (loadGraph, callOllama, readFileCapped) are injectable for tests.
Modes: viz (ranked multi-keyword search of the ~27MB system-viz graph —
local, no model; --synth adds Ollama synthesis), summarize/explain/triage
(file content → Ollama digest), ask (bare question → Ollama).
Doctrine it must honour: fail-loud R12 (every failure prints an explicit
reason, nothing silently swallowed); no inlined magic numbers (use named
constants); never throws unhandled; runs as a CLI only when invoked
directly (INVOKED_DIRECTLY guard).

VERIFY SPECIFICALLY:
- parseArgs: every error path explicit; flag-value consumption (--model,
  --max-hits, --timeout) correct; --max-hits cap; bad-input rejection.
- tokenizeQuery / scoreNode / searchGraph: scorer correctness; the
  all-stopword fallback; maxHits slicing; empty/null graph tolerance;
  ranking determinism (the localeCompare tiebreak).
- loadGraph: candidate fallback order; JSON-parse failure handling;
  missing-nodes-array detection.
- callOllama: AbortController timer is ALWAYS cleared (no leaked handle);
  HTTP-error / empty-response / network-throw / timeout all return
  {ok:false} not throw; keep_alive + stream:false in the body.
- runRequest: exit-code consistency (0 ok, 2 usage/missing-file, 3 infra);
  the viz --synth degrade path stays exit 0; --json output is valid JSON.
- The test suite: are the 50 assertions REAL (concrete expected values),
  or are any toBeDefined()-style stubs? Do they cover the
... [+333 chars truncated]

### Assistant | 2026-05-18T02:28:44.785Z

I'll review both files end-to-end.

### Assistant | 2026-05-18T02:28:45.868Z

[tool_use: Read]

### Assistant | 2026-05-18T02:28:46.667Z

[tool_use: Read]

### User | 2026-05-18T02:28:46.892Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+20564 chars truncated]

### User | 2026-05-18T02:28:47.630Z

[tool_result] 1	/**
2	 * ask-ollama.test.mjs — unit + integration tests for scripts/ask-ollama.mjs
3	 * (OLLAMA-EXPAND-MS0/U-OE01). Run: node --test scripts/__tests__/ask-ollama.test.mjs
4	 *
5	 * Strategy: every pure helper is asserted against real expected values
6	 * (no toBeDefined() stubs). The impure shell (loadGraph, callOllama,
7	 * readFileCapped, runRequest) is exercised with injected deps so the full
... [+18381 chars truncated]

### Assistant | 2026-05-18T02:28:51.546Z

The test file appears truncated at line 399. Let me read the rest.

### Assistant | 2026-05-18T02:28:52.281Z

[tool_use: Read]

### User | 2026-05-18T02:28:53.102Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (399). The file has 399 lines.</system-reminder>

### Assistant | 2026-05-18T02:29:39.398Z

The test file ends at line 399. Let me count the test cases to verify the claimed "50 cases".

The file has these `test(...)` blocks. Let me enumerate them carefully against the contract claim of 50:

truncate (3), estimateTokens (1), pickModel (2), mode sets (1), parseArgs (5), tokenizeQuery (4), scoreNode (2), searchGraph (4), renderHits/prompts (5), savingsFooter (1), loadGraph (5), callOllama (6), readFileCapped (3), runRequest (8) = **50 test blocks**. The count is accurate.

Now my findings.

## Findings

### P1 — `loadGraph` does NOT pass `existsImpl`/`readImpl` through `runRequest`'s viz path; the injected-deps contract is partially broken

In `runRequest` viz mode (line 390):
```js
const loaded = (deps.loadGraph || loadGraph)(deps);
```
When `deps.loadGraph` is NOT supplied (real CLI run), this calls the real `loadGraph(deps)`. `loadGraph`'s signature destructures `{ root, readImpl, existsImpl }` — so `deps` is passed as the options bag. That works for the real path (defaults kick in) and for tests that inject `deps.loadGraph`. **However**, no test exercises the real `loadGraph` *through* `runRequest` with injected `existsImpl`/`readImpl` — every viz `runRequest` test injects `deps.loadGraph` wholesale (lines 331, 337, 346, 352, 359). So the line `(deps.loadGraph || loadGraph)(deps)` — specifically the *fallback* branch reaching real `loadGraph` — is never integration-tested. This is the "hermetic fakes don't prove production wiring" class (cited repeatedly in this repo's regressions). It is not a correctness bug today (the wiring is correct by inspection), but it is an untested seam. Recommend one test: `runRequest({mode:"viz"...}, { existsImpl, readImpl })` with no `deps.loadGraph`, asserting the real `loadGraph` resolves the fixture. Grade P1 because the contract explicitly calls for the degrade/failure branches to be covered and this is the one orchestration seam left fake-only.

### P2 — `readFileCapped` ignores injected `existsImpl`/`readImpl`; incons
... [+5374 chars truncated]
