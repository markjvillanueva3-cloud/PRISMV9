---
type: "chat-session"
source: "claude-code-cli"
session_id: "7bfff7a4-521b-41bc-9719-fe5a0f593d86"
title: "Review a SINGLE focused change in the PRISM repo (H:/prism): the opt-in MCP rout"
date: "2026-06-10"
first_ts: "2026-06-10T01:26:40.236Z"
last_ts: "2026-06-10T01:28:13.420Z"
cwd: "H:\\prism"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a075608e1839940ef.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a SINGLE focused change in the PRISM repo (H:/prism): the opt-in MCP rout

> **claude-code-cli** | 2026-06-10 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7bfff7a4-521b-41bc-9719-fe5a0f593d86/subagents/agent-a075608e1839940ef.jsonl`

## Transcript

### User | 2026-06-10T01:26:40.236Z

Review a SINGLE focused change in the PRISM repo (H:/prism): the opt-in MCP routing overlay added to the galaxy transcript miner. This is a clone of an already-shipped, already-scrutinized overlay on the india miner (scripts/mine-india-transcripts.mjs, commit 3cf36669e0). Your job is to confirm the clone is correct and flag any P0/P1 defect.

READ END-TO-END:
1. H:/prism/scripts/mine-galaxy-transcripts.mjs — focus on:
   - the import at line ~66 (`callViaMcp, mcpRoutingEnabled` from ./ask-ollama.mjs)
   - the constants NUM_CTX (line ~115), GEN_TIMEOUT_MS (~116), MCP_NUM_PREDICT (~119)
   - the `ollamaCallOnce` function (~359-392) — the overlay
   - the `ollamaCall` retry wrapper (~403+) that calls ollamaCallOnce(prompt, model, timeoutMs)
2. H:/prism/scripts/__tests__/mine-galaxy-transcripts-routing.test.mjs — the 6 hermetic tests
3. For the contract reference, read the proven original: H:/prism/scripts/mine-india-transcripts.mjs `ollamaCall` overlay + its test H:/prism/scripts/__tests__/mine-india-transcripts-routing.test.mjs

VERIFY:
- The MCP route forwards numCtx=NUM_CTX(32768) + numPredict=MCP_NUM_PREDICT(8192) + the per-call timeoutMs into callViaMcp, and fails SOFT to the direct /api/generate path on ANY MCP failure (falsy result, ok:false, or ok-but-empty text). Enabling the route must NEVER break a working mine.
- The 4-arg signature `ollamaCallOnce(prompt, model, timeoutMs = GEN_TIMEOUT_MS, opts = {})` is backward-compatible with the existing `ollamaCall` retry wrapper which calls it with 3 args (opts defaults to {}). Confirm the wrapper is NOT broken.
- The direct path is byte-identical behavior to before EXCEPT `fetch`→`fetchImpl` seam: keep_alive 10m, options.num_ctx=NUM_CTX, temperature 0.2, empty-200-OK fails loud (R12), non-2xx fails loud with status.
- `mcpRoutingEnabled()` is the gate (env PRISM_LOCAL_LLM_VIA_MCP, default OFF) — confirm default OFF means the direct path runs unchanged.
- Tests: do they actually verify intent (R9)? No weakened assert
... [+380 chars truncated]

### Assistant | 2026-06-10T01:26:43.870Z

I'll review this focused change. Let me read all the relevant files end-to-end, starting with the target file and its test, plus the proven original for contract comparison.

### Assistant | 2026-06-10T01:26:45.281Z

[tool_use: Read]

### Assistant | 2026-06-10T01:26:45.757Z

[tool_use: Read]

### Assistant | 2026-06-10T01:26:45.971Z

[tool_use: Read]

### User | 2026-06-10T01:26:47.136Z

[tool_result] 55	 *   flags: --map-model <n> --synth-model <n> --since YYYY-MM-DD --concurrency N --force --force-vault --no-vault
56	 */
57	import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync, renameSync } from "node:fs";
58	import { createInterface } from "node:readline";
59	import { pathToFileURL } from "node:url";
60	import path from "node:path";
61	import { 
... [+5482 chars truncated]

### User | 2026-06-10T01:26:47.554Z

[tool_result] 1	// mine-galaxy-transcripts-routing.test.mjs -- LOCAL-LLM-MS1/U-NUMCTX-GALAXY-MINER-ROUTE
2	// Verifies the galaxy transcript miner's ollamaCallOnce MCP overlay (clone of the proven
3	// india-miner overlay, generalized to all 34 galaxies): when the gate is on it routes through
4	// prism_local local_generate (forwarding numCtx so the 32768-sized slices are not truncated)
5	// and FAILS SOFT to t
... [+4244 chars truncated]

### User | 2026-06-10T01:26:47.955Z

[tool_result] 1	// mine-india-transcripts-routing.test.mjs -- LOCAL-LLM-MS1/U-NUMCTX-MINER-ROUTE
2	// Verifies the india transcript miner's ollamaCall MCP overlay: when the gate is on it
3	// routes through prism_local local_generate (with numCtx so the 32768-sized slices are not
4	// truncated) and FAILS SOFT to the direct /api/generate path on any MCP failure; the gate
5	// OFF path is byte-identical to the l
... [+3736 chars truncated]

### Assistant | 2026-06-10T01:26:54.943Z

Now let me read the core overlay function in the galaxy miner and the retry wrapper.

### Assistant | 2026-06-10T01:26:55.955Z

[tool_use: Read]

### User | 2026-06-10T01:26:58.185Z

[tool_result] 350	    active++;
351	    const { fn, resolve, reject } = queue.shift();
352	    Promise.resolve().then(fn).then(resolve, reject).finally(() => { active--; pump(); });
353	  };
354	  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); pump(); });
355	}
356	
357	const ollamaLimit = makeLimiter(CONCURRENCY);
358	
359	export async function ollamaCallOnce(prompt, mod
... [+4206 chars truncated]

### Assistant | 2026-06-10T01:27:00.948Z

Now let me verify the india miner's original overlay for the contract comparison, and confirm the `callViaMcp`/`mcpRoutingEnabled` exports in ask-ollama.mjs.

### Assistant | 2026-06-10T01:27:01.915Z

[tool_use: Read]

### Assistant | 2026-06-10T01:27:03.467Z

[tool_use: Grep]

### User | 2026-06-10T01:27:04.420Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mine-india-transcripts.mjs -- Ollama-powered miner for india / PRISM-AI-systems session transcripts.
4	 *
5	 * Follows slot:hotel's footsteps (scripts/mine-hotel-transcripts.mjs, commit bb1640e2f) -- a clone of
6	 * its reviewer-hardened pattern, GENERALIZED for india's domain. Operator directive 2026-06-09:
7	 * "use ollama to read through all previous session tra
... [+2792 chars truncated]

### Assistant | 2026-06-10T01:27:04.960Z

[tool_use: Grep]

### User | 2026-06-10T01:27:07.219Z

[tool_result] 58:// local_generate), fail-soft to the existing direct /api/generate path. callViaMcp
61:import { callViaMcp, mcpRoutingEnabled } from "./ask-ollama.mjs";
83:const NUM_CTX = 32768;
87:const MCP_NUM_PREDICT = 8192;
195:export async function ollamaCall(prompt, model, opts = {}) {
197:    mcpEnabled = mcpRoutingEnabled(),
198:    callViaMcpImpl = callViaMcp,
202:  // with numCtx=NUM_CTX so the 32768
... [+381 chars truncated]

### User | 2026-06-10T01:27:10.075Z

[tool_result] 54:const HERE = dirname(fileURLToPath(import.meta.url));
548:export function mcpRoutingEnabled(env = process.env) {
613:export async function callViaMcp(model, prompt, opts = {}) {
788:async function main() {
801:  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

### Assistant | 2026-06-10T01:27:13.143Z

Now let me confirm the india miner's overlay body and the `callViaMcp` signature/contract in ask-ollama.mjs to verify the clone forwards the right shape.

### Assistant | 2026-06-10T01:27:14.118Z

[tool_use: Read]

### Assistant | 2026-06-10T01:27:15.036Z

[tool_use: Read]

### Assistant | 2026-06-10T01:27:15.335Z

[tool_use: Read]

### User | 2026-06-10T01:27:20.285Z

[tool_result] 195	export async function ollamaCall(prompt, model, opts = {}) {
196	  const {
197	    mcpEnabled = mcpRoutingEnabled(),
198	    callViaMcpImpl = callViaMcp,
199	    fetchImpl = fetch,
200	  } = opts;
201	  // Opt-in MCP overlay (PRISM_LOCAL_LLM_VIA_MCP): route through prism_local local_generate
202	  // with numCtx=NUM_CTX so the 32768-sized slices are not truncated, fail-soft to the direct
203	 
... [+1626 chars truncated]

### User | 2026-06-10T01:27:20.912Z

[tool_result] 548	export function mcpRoutingEnabled(env = process.env) {
549	  const v = String((env && env.PRISM_LOCAL_LLM_VIA_MCP) || "").trim().toLowerCase();
550	  return v === "1" || v === "true" || v === "yes" || v === "on";
551	}
552	
553	/**
554	 * Margin added to the inner Ollama timeout for the OUTER MCP envelope timeout, so
555	 * the server-side generate gets to finish (or time out with its own mess
... [+1287 chars truncated]

### User | 2026-06-10T01:27:20.924Z

[tool_result] 613	export async function callViaMcp(model, prompt, opts = {}) {
614	  const {
615	    timeoutMs = DEFAULT_TIMEOUT_MS,
616	    numPredict = DEFAULT_NUM_PREDICT,
617	    system,
618	    numCtx,
619	    mcpCallImpl = mcpCallStreamable,
620	  } = opts;
621	  const params = { prompt, model, maxTokens: numPredict, timeoutMs };
622	  if (system && String(system).trim()) params.system = String(system);
6
... [+2988 chars truncated]

### Assistant | 2026-06-10T01:27:23.982Z

I now have everything needed. Let me run the galaxy routing tests to confirm they pass green.

### Assistant | 2026-06-10T01:27:24.717Z

[tool_use: Bash]

### User | 2026-06-10T01:27:37.011Z

[tool_result]   ...
# Subtest: ollamaCallOnce: direct-path empty 200-OK FAILS LOUD (R12 silent-data-loss guard preserved)
ok 5 - ollamaCallOnce: direct-path empty 200-OK FAILS LOUD (R12 silent-data-loss guard preserved)
  ---
  duration_ms: 0.5311
  ...
# Subtest: ollamaCallOnce: direct-path non-2xx FAILS LOUD with the HTTP status
ok 6 - ollamaCallOnce: direct-path non-2xx FAILS LOUD with the HTTP status
  ---

... [+129 chars truncated]

### Assistant | 2026-06-10T01:28:13.420Z

All 6 tests pass. I have full verification across the target, the proven original, the shared `callViaMcp` contract, and a live test run. Here is my analysis.

## Code Quality Analysis Report — Galaxy Transcript Miner MCP Routing Overlay

### Summary
- Files Analyzed: 4 (target overlay + test, india original + test, ask-ollama contract)
- Overall: faithful clone with one justified delta (the 4-arg signature carrying per-call `timeoutMs`)
- Tests pass: 6/6 green (live-run verified)
- Critical Issues: 0

### Verification against the required contract

**1. MCP route forwards numCtx + numPredict + per-call timeoutMs, fails soft — CONFIRMED.**
`mine-galaxy-transcripts.mjs:369` calls `callViaMcpImpl(model, prompt, { numCtx: NUM_CTX, numPredict: MCP_NUM_PREDICT, timeoutMs })`. The fail-soft guard at line 370 (`if (r && r.ok && typeof r.text === "string" && r.text.trim()) return ...`) handles all three failure shapes: falsy `r`, `ok:false`, and ok-but-empty/whitespace text — each falls through to the direct path. This is stricter and correct: it matches the india original at `mine-india-transcripts.mjs:206` exactly. The forwarded shape matches `callViaMcp`'s destructure at `ask-ollama.mjs:614-620` (`numCtx`, `numPredict`, `timeoutMs`), and `numCtx` is only set on params when truthy (`ask-ollama.mjs:623`) — 32768 is truthy, so it propagates.

**2. The 4-arg signature is the correct, justified delta — CONFIRMED backward-compatible.**
`ollamaCallOnce(prompt, model, timeoutMs = GEN_TIMEOUT_MS, opts = {})` at `:359`. The retry wrapper `ollamaCall` at `:403-417` calls it with 3 args (`:407` `ollamaCallOnce(prompt, model, timeoutMs)`) — `opts` defaults to `{}`, so the destructure at `:360-364` yields live defaults (`mcpRoutingEnabled()`, `callViaMcp`, `fetch`). The wrapper is NOT broken. This is the deliberate divergence from india (whose `opts` was the 3rd param) because the galaxy miner threads a per-call `timeoutMs` through (the synthesis path uses `SYNTH_TIMEOUT_MS` 900s vs t
... [+4277 chars truncated]
