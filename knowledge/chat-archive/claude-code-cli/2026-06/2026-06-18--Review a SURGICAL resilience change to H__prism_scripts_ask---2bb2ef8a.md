---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7"
title: "Review a SURGICAL resilience change to H:/prism/scripts/ask-hermes.mjs (the PRIS"
date: "2026-06-18"
first_ts: "2026-06-18T16:26:30.848Z"
last_ts: "2026-06-18T16:27:38.538Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-ad40feb74b9b04c57.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review a SURGICAL resilience change to H:/prism/scripts/ask-hermes.mjs (the PRIS

> **claude-code-cli** | 2026-06-18 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-ad40feb74b9b04c57.jsonl`

## Transcript

### User | 2026-06-18T16:26:30.848Z

Review a SURGICAL resilience change to H:/prism/scripts/ask-hermes.mjs (the PRISM->Hermes-proxy offload bridge) END-TO-END. Also read its test H:/prism/scripts/ask-hermes.test.mjs (63 tests pass).

WHAT CHANGED + WHY: live-observed bug -- when the Hermes proxy is UP and serves chat but `/v1/models` listing is empty/unimplemented (verified: /v1/models returns nothing while the bravo profile serves grok-4.3), `resolveModel()` returned null and the WHOLE Hermes lane was abandoned to Ollama. The fix adds:
- `FALLBACK_HERMES_MODEL` const (env `PRISM_HERMES_FALLBACK_MODEL`, default "grok-4.3").
- a PURE exported `pickModel({explicit,listed,fallback}) -> {model, source}` (priority explicit > listed > fallback > none).
- both call sites (graph-mode ~line 425, chat-mode ~line 465) now: compute `listed` only if no explicit, then `pickModel(...)`, then a stderr transparency note when source==="fallback".

VERIFY RIGOROUSLY:
1. SAFETY NET UNCHANGED: when the proxy is truly DOWN, does the fallback model still degrade to Ollama correctly? Trace: pickModel returns {model:"grok-4.3",source:"fallback"} -> callHermes POSTs -> network-fails -> `hermes.fail.kind` -> the EXISTING shouldFallback/degrade path must still fire. Confirm the fallback can NEVER suppress the ollama degrade. Read the code after line ~465 (the `if (hermes.ok)` block and what follows on failure) to confirm.
2. No double-call of resolveModel; no resolveModel called when args.model is set (cost/latency).
3. The graph-mode site: `model` was `const`, now `let` -- confirm the closure `callModel`'s `if (!model)` still behaves (model is now usually non-null via fallback, so it attempts -- intended).
4. R9 tests: does pickModel's priority + the 'fallback' source (which drives the stderr note + the attempt) have real mutation-biting tests? Empty-string falsy handling?
5. Any ASCII/lint issue, any tsc concern (this is .mjs, so just syntax/logic).
6. Is "grok-4.3" hardcoded acceptable given it's env-overridable + comment-cit
... [+178 chars truncated]

### Assistant | 2026-06-18T16:26:34.735Z

I'll review this resilience change end-to-end. Let me start by reading both files.

### Assistant | 2026-06-18T16:26:35.707Z

[tool_use: Read]

### Assistant | 2026-06-18T16:26:35.833Z

[tool_use: Read]

### User | 2026-06-18T16:26:37.007Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-hermes.mjs -- PRISM bridge to the local Hermes OpenAI-compatible proxy
4	 * (HERMES-BRIDGE-MS0/U-ASK-HERMES).
5	 *
6	 * Hermes (Nous) exposes `hermes proxy start` -- a local HTTP server that speaks
7	 * the OpenAI /v1 protocol and forwards to an OAuth-authenticated upstream
8	 * (xAI Grok / Nous Portal), attaching the user's real managed credential. This
9	 * s
... [+30313 chars truncated]

### User | 2026-06-18T16:26:37.223Z

[tool_result] 1	#!/usr/bin/env node
2	// Tests for ask-hermes.mjs -- the PRISM->Hermes-proxy bridge pure functions.
3	// (HERMES-BRIDGE-MS0/U-ASK-HERMES). Pure functions only; importing the script
4	// is side-effect-free (isMain is false under the test runner, so main() never
5	// runs and no network call is made).
6	// Run: node --test scripts/ask-hermes.test.mjs
7	import { test } from "node:test";
8	import a
... [+28633 chars truncated]

### Assistant | 2026-06-18T16:26:41.373Z

I have both files. Let me trace the critical paths rigorously against each verification point. Let me confirm the upstream helper contracts the change depends on (`scaleTimeoutForBytes`, `searchGraph`/`renderHits` behavior, and the rerank lib's source reporting) and the offload-stats consumer.

### Assistant | 2026-06-18T16:26:41.851Z

[tool_use: Read]

### User | 2026-06-18T16:26:42.929Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+2740 chars truncated]

### Assistant | 2026-06-18T16:26:43.237Z

[tool_use: Grep]

### User | 2026-06-18T16:26:45.710Z

[tool_result] 158:export function scaleTimeoutForBytes(bytes, base = DEFAULT_TIMEOUT_MS) {
159-  const tokens = Math.ceil(Math.max(0, Number(bytes) || 0) / CHARS_PER_TOKEN);
160-  const need = TIMEOUT_COLD_LOAD_MS + tokens * TIMEOUT_INPUT_MS_PER_TOKEN + TIMEOUT_OUTPUT_BUDGET_MS;
161-  return Math.min(MAX_SCALED_TIMEOUT_MS, Math.max(base, need));
162-}
163-
164-\** Resolve the model for this call: explicit overr
... [+1375 chars truncated]

### Assistant | 2026-06-18T16:26:51.103Z

The upstream contracts confirm. `scaleTimeoutForBytes` clamps with a floor of `base` (so fallback timeout is always >= base), and the rerank lib's source reporting is already handled honestly in `runGraphMode`. Let me verify the two remaining things the change leans on: the `shouldFallback` always-true behavior under the fallback-model path, and confirm there's no second `resolveModel` call when `args.model` is set.

Let me trace point 1 precisely — the most critical safety-net concern.

### Assistant | 2026-06-18T16:26:51.760Z

[tool_use: Read]

### User | 2026-06-18T16:26:53.117Z

[tool_result] 490	  const listedModel = args.model ? null : await resolveModel(args.url, DEFAULT_TOKEN, effTimeout);
491	  const picked = pickModel({ explicit: args.model, listed: listedModel, fallback: FALLBACK_HERMES_MODEL });
492	  let model = picked.model;
493	  if (picked.source === "fallback") {
494	    process.stderr.write(`[ask-hermes] proxy /v1/models did not list a model; attempting configured fallbac
... [+1786 chars truncated]

### Assistant | 2026-06-18T16:26:56.275Z

I have everything needed. Let me run the test suite to confirm the claimed 63-pass state, then finalize the verdict.

### Assistant | 2026-06-18T16:26:56.868Z

[tool_use: Bash]

### User | 2026-06-18T16:27:01.173Z

[tool_result]   ...
# Subtest: pickModel: empty-string inputs are falsy -> skipped (no empty model id sent)
ok 62 - pickModel: empty-string inputs are falsy -> skipped (no empty model id sent)
  ---
  duration_ms: 0.0399
  ...
# Subtest: pickModel: no-arg / undefined -> none (never throws)
ok 63 - pickModel: no-arg / undefined -> none (never throws)
  ---
  duration_ms: 0.0536
  ...
1..63
# tests 63
# suites 0

... [+75 chars truncated]

### Assistant | 2026-06-18T16:27:38.538Z

63/63 pass confirmed. I have traced every verification point end-to-end against the actual code. Here is my analysis.

## Trace results (all 6 verification points)

**1. SAFETY NET UNCHANGED — degrade-to-Ollama still fires under the fallback model.** Traced chat-mode (lines 490-525): `pickModel(...)` returns `{model:"grok-4.3", source:"fallback"}` → `model` is truthy → `callHermes` POSTs to a truly-down proxy → `fetch` throws → `catch` returns `{ok:false, fail:{kind:"network"|"timeout"}}` (`callHermes` lines 397-399). Then `hermes.ok` is false → `shouldFallback(hermes.fail)` returns `true` for `network`/`timeout`/`http` (and `shouldFallback` returns `true` for *every* path, lines 183-187) → `fallbackToOllama` runs (line 516). **The fallback model can NEVER suppress the Ollama degrade** — it only changes whether the `if (model)` block is *entered*; the failure of that block routes through the identical, unchanged degrade path. Confirmed PASS. The graph-mode site (lines 459-465) is equally safe: `callModel` returns `{ok:false}` on a down proxy → `runGraphMode` degrades to local hits / lexical order (exit 0), never worse than the free local search.

**2. No double-call / no resolveModel when `args.model` set.** Chat-mode line 490: `args.model ? null : await resolveModel(...)` — short-circuits, exactly one possible call, zero when explicit. Graph-mode line 452: same guard. No double-call anywhere. Confirmed PASS.

**3. Graph-mode `const`→`let model`.** Line 450 `let model = null`; reassigned at 454 from `pickedG.model`. The closure `callModel` reads `if (!model) return {ok:false,...}` (line 460). With the fallback, `model` is now usually non-null so the call is *attempted* (the intended behavior — and the down-proxy attempt degrades correctly per point 1). The `!model` guard still correctly short-circuits the genuine `source:"none"` case (all three absent, e.g. `FALLBACK_HERMES_MODEL=""`). Confirmed PASS.

**4. R9 mutation-biting tests.** `pickModel` has 6 dedicated tes
... [+4770 chars truncated]
