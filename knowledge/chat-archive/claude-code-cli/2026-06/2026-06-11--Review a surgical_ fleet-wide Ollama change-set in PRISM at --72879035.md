---
type: "chat-session"
source: "claude-code-cli"
session_id: "72879035-e0ca-4192-9498-ed9720495151"
title: "Review a surgical, fleet-wide Ollama change-set in PRISM at H:/prism (main tree,"
date: "2026-06-11"
first_ts: "2026-06-11T16:04:11.788Z"
last_ts: "2026-06-11T16:08:36.937Z"
cwd: "H:\\prism-slot-india"
messages: 80
user_msgs: 31
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-af168dcd85fb08891.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Review a surgical, fleet-wide Ollama change-set in PRISM at H:/prism (main tree,

> **claude-code-cli** | 2026-06-11 | 80 msgs (31 user / 49 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-af168dcd85fb08891.jsonl`

## Transcript

### User | 2026-06-11T16:04:11.788Z

Review a surgical, fleet-wide Ollama change-set in PRISM at H:/prism (main tree, branch cad-fusion-live-ms0, all UNCOMMITTED). Read each file END-TO-END. Plan: H:/prism/state/shared/specs/OLLAMA-FLEET-AUDIT-2026-06-11.md (P0-3, P1-6).

FILES:
1. H:/prism/scripts/ask-ollama.mjs — NEW exported `buildFallbackSignal({mode,target,error,json})` just before `runRequest`; wired at the TWO `if (!gen.ok) return { exitCode: 3, output: buildFallbackSignal(...) }` generation-failure sites (ask-mode + file-mode). Graph-load failure sites (`if (!loaded.ok)`) deliberately UNTOUCHED.
2. H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts — DEFAULT_CONFIG.baseUrl now `process.env.OLLAMA_URL || "http://127.0.0.1:11434"` (was "http://localhost:11434").
3. H:/prism/scripts/__tests__/ask-ollama.test.mjs — enhanced ask-down test + new --json fallback test.
4. H:/prism/mcp-server/src/__tests__/OllamaHookBridgeEngine.test.ts — updated default-baseUrl assertion.

VERIFY: var scope at both call sites; valid JSON in --json mode; exitCode still 3; ASCII-only (repo has an ASCII guard); no OTHER caller parses ask-ollama stdout expecting the old `[ask-ollama] <error>` format (grep consumers); engine baseUrl type-safe; tests verify real intent not tautology. Both suites already pass (81/81, 47/47) — find what tests DON'T cover. Findings with file:line. Final line: VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-11T16:04:16.670Z

I'll review this Ollama change-set. Let me start by reading the plan spec and all four files end-to-end, then check the consumer grep and ASCII concerns.

### Assistant | 2026-06-11T16:04:17.147Z

[tool_use: Read]

### Assistant | 2026-06-11T16:04:17.616Z

[tool_use: Read]

### Assistant | 2026-06-11T16:04:18.096Z

[tool_use: Read]

### Assistant | 2026-06-11T16:04:18.622Z

[tool_use: Read]

### User | 2026-06-11T16:04:18.816Z

[tool_result] 1	# OLLAMA FLEET AUDIT -- 2026-06-11
2	# PRISM Manufacturing Intelligence Platform
3	# Synthesis of 5 parallel audit slices (inventory / architecture / optimization / failures / wiring)
4	# All file:line citations verified by direct Read/Grep against H:/prism-slot-india.
5	
6	---
7	
8	## Root Cause
9	
10	Ollama is HEALTHY (200 OK, 1.7ms, 12 models installed, 96GB Blackwell VRAM available).
11	The 
... [+29647 chars truncated]

### User | 2026-06-11T16:04:19.204Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+47712 chars truncated]

### User | 2026-06-11T16:04:19.567Z

[tool_result] 1	/**
2	 * OllamaHookBridgeEngine Tests
3	 *
4	 * Coverage:
5	 * - Happy path: query, status, configure
6	 * - Failure modes: timeout, connection error, invalid response, bad input
7	 * - Adversarial inputs: empty, oversize, special chars
8	 * - Configuration variants: different models, timeouts, hook types
9	 */
10	import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
11	impor
... [+17590 chars truncated]

### User | 2026-06-11T16:04:19.689Z

[tool_result] 1	/**
2	 * ask-ollama.test.mjs — unit + integration tests for scripts/ask-ollama.mjs
3	 * (OLLAMA-EXPAND-MS0/U-OE01). Run: node --test scripts/__tests__/ask-ollama.test.mjs
4	 *
5	 * Strategy: every pure helper is asserted against real expected values
6	 * (no toBeDefined() stubs). The impure shell (loadGraph, callOllama,
7	 * runRequest) is exercised with injected deps; readFileCapped runs agains
... [+36832 chars truncated]

### Assistant | 2026-06-11T16:04:24.161Z

I have all four files read end-to-end plus the plan spec. Now let me run the verification grep — the critical check is whether any OTHER caller parses ask-ollama stdout expecting the old `[ask-ollama] <error>` format, plus the ASCII guard and the engine's baseUrl usage.

### Assistant | 2026-06-11T16:04:25.630Z

[tool_use: Grep]

### Assistant | 2026-06-11T16:04:26.437Z

[tool_use: Grep]

### User | 2026-06-11T16:04:27.534Z

[tool_result] Found 30 files
H:\prism\scripts\lib\ollama-fanout.mjs
H:\prism\scripts\__tests__\ask-ollama.test.mjs
H:\prism\scripts\ask-ollama.mjs
H:\prism\.claude\hooks\goal-prereq-inject.mjs
H:\prism\scripts\lib\ollama-search-rerank.mjs
H:\prism\.claude\hooks\wiki-read-offload-advisory.mjs
H:\prism\scripts\ask-ollama.test.mjs
H:\prism\scripts\lint-wiki-contradictions.mjs
H:\prism\scripts\mine-hotel-transcript
... [+1013 chars truncated]

### User | 2026-06-11T16:04:29.810Z

[tool_result] <persisted-output>
Output too large (20.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-india\72879035-e0ca-4192-9498-ed9720495151\tool-results\toolu_01NQE1BqUxeG2qBPASuwsKag.txt

Preview (first 2KB):
H:\prism\.scrut-tmp\raw2.json:18:[Omitted long matching line]
H:\prism\.scrut-tmp\raw2.json:19:[Omitted long matching line]
H:\prism\.scrut-tmp\raw2.json:20:[Omitted long ma
... [+1794 chars truncated]

### Assistant | 2026-06-11T16:04:35.570Z

The grep matched many files but I need to focus on actual CALLERS that parse ask-ollama stdout. Let me check the key consumers that invoke ask-ollama and capture/parse its output: the hooks and scripts that spawn it. Let me look at the most likely stdout-parsing consumers.

### Assistant | 2026-06-11T16:04:36.980Z

[tool_use: Grep]

### User | 2026-06-11T16:04:38.139Z

[tool_result] 4-//
5-// When Claude is about to Read a large wiki entry (>500 lines by default),
6-// inject an advisory pointing at /route-to-obsidian — a slash that delegates
7:// to scripts/ask-ollama.mjs summarize so the 5-50KB wiki body is processed in
8-// a local Ollama subprocess instead of streaming into Claude's context.
9-//
10-\ Honest scope (R12): this hook does NOT block the Read. It advises that 
... [+400 chars truncated]

### Assistant | 2026-06-11T16:04:38.398Z

[tool_use: Grep]

### User | 2026-06-11T16:04:39.999Z

[tool_result] 16-// (default 3 -- generous for a single GPU; the models are large + serialize on VRAM anyway).
17-// Reserve Claude subagents for the FINAL synthesis/judgment only. Pairs with local-llm-task-
18:// router (model selection) + ask-ollama (single query); this adds the concurrent batch.
19-//
20-\ SAFETY: this is for MECHANICAL text work. Do NOT route safety-critical G-code/physics/units
--
115-
116
... [+655 chars truncated]

### Assistant | 2026-06-11T16:04:40.148Z

[tool_use: Grep]

### User | 2026-06-11T16:04:41.640Z

[tool_result] 3- * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2)
4- *
5: * Layer 2 of the OLLAMA→PRISM-MCP bridge ladder (Layer 1 = ask-ollama.mjs).
6- *
7- * Ollama is a model server, NOT an MCP client — it cannot "connect to MCP".
--
64-  readFileCapped,
65-  truncate,
66:} from "./ask-ollama.mjs";
67-\ U-LOCAL-GENERATE-CONSUMER (2026-06-09, slot india): the MCP S
... [+837 chars truncated]

### Assistant | 2026-06-11T16:04:46.439Z

Now let me check the actual stdout-parsing consumers. The key question: does anything `spawnSync`/`execFile` ask-ollama and parse the stdout? The ask-mode and file-mode are the changed sites. Let me find the consumers that spawn ask-ollama and read its output — `command-ollama-routes.mjs` and `trigger-command-pipeline.mjs` look like the real CLI invokers, plus the transcript miners.

### Assistant | 2026-06-11T16:04:48.804Z

[tool_use: Grep]

### User | 2026-06-11T16:04:49.861Z

[tool_result] 8-// telemetry says that approach does not work — take-rate 38/5945 fires = 0.6% (the
9-// chat reads "consider calling qwen2.5-coder" and ignores it). Meanwhile
10:// `ask-ollama.mjs` is a real, working local-LLM execution surface (modes
11:// viz/summarize/explain/triage/ask) that nothing routes high-ROI commands to.
12-//
13-\ This registry is the EXECUTABLE bridge: for each high-ROI slash comm
... [+2984 chars truncated]

### Assistant | 2026-06-11T16:04:50.338Z

[tool_use: Grep]

### User | 2026-06-11T16:04:51.564Z

[tool_result] 19- *      keyword set (nn/gnn/graphsage/lora/rag/psn/system-viz/...), so AI work done under any slot's
20- *      handoff is captured -- "anything related to prism ai systems", not just slot:india.
21: *   2. MODEL is host-aware (Blackwell): defaults to gpt-oss:20b (fast strong summarizer, hotel-proven,
22- *      verified installed) -- override --model gpt-oss:120b for deeper synthesis (fits the
... [+948 chars truncated]

### Assistant | 2026-06-11T16:04:55.840Z

The transcript miners import `callOllama`/`callModel` directly (not parsing CLI stdout), so the `buildFallbackSignal` change doesn't affect them. The key remaining consumer is `trigger-command-pipeline.mjs` which spawns ask-ollama as a subprocess. Let me check how it handles the output/exit code, and verify the ASCII guard config and whether `--json` mode is parsed by any consumer.

### Assistant | 2026-06-11T16:04:56.296Z

[tool_use: Read]

### User | 2026-06-11T16:04:57.755Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/trigger-command-pipeline.mjs
3	//
4	// TRIGGER A HIGH-ROI COMMAND PIPELINE + OFFLOAD ITS MECHANICAL LLM STEP TO OLLAMA
5	// (BLACKWELL-TOKEN-SYNERGY-MS0 / U-CMD-OLLAMA-ROUTE, slot:bravo, 2026-06-04).
6	//
7	// Consumes the command→Ollama route registry (scripts/lib/command-ollama-routes.mjs)
8	// and turns the previously-advisory Ollama nudge into a single determ
... [+13855 chars truncated]

### Assistant | 2026-06-11T16:05:07.070Z

This is the critical finding. `trigger-command-pipeline.mjs` is a real consumer that spawns ask-ollama with `--json` (line 94: `[step.mode, input, "--json"]`) for `summarize`/`explain`/`triage`/`ask`/`viz` modes, and parses the stdout JSON. Let me trace exactly what happens when ask-ollama now returns the new `buildFallbackSignal` JSON on generation failure.

When Ollama is down, ask-ollama (file mode / ask mode) now returns `exitCode: 3` with the `buildFallbackSignal` JSON `{ollamaUnavailable, lane, fellBack, mode, target, reason, directive}` — and since exit code is 3 (non-zero), `execFileAsync` **rejects**, so `runStep` lands in the `catch` (line 221) and reads `e.stderr`. The CLI prints fallback JSON to `console.error` (stderr) at line 977. Let me verify that and check the OllamaHookBridgeEngine source plus the ASCII guard.

### Assistant | 2026-06-11T16:05:07.277Z

[tool_use: Read]

### Assistant | 2026-06-11T16:05:07.486Z

[tool_use: Read]

### User | 2026-06-11T16:05:08.766Z

[tool_result] 80	// Blackwell — the 7b speed-tier no longer exists).
81	//
82	// BLACKWELL-MODEL-INTEGRATION-MS0 P2 (2026-06-06): gpt-oss:20b is now PULLED (live
83	// /api/tags confirms it), so the speed-critical hooks (grep_index, mcp_route, general)
84	// move to it — the fast MoE tier (~3B active, sub-second) for the cheap classify/route/
85	// general work that doesn't need the 32b's depth. The latency-tol
... [+6124 chars truncated]

### User | 2026-06-11T16:05:09.571Z

[tool_result] 1	// Tests for the Docker Models fallback added in
2	// DOCKER-MCP-WIRE-MS0/U-MODELS-FALLBACK (scripts/ask-ollama.mjs).
3	// node:test — no real docker/ollama: every external call is an injected impl.
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import { execFile } from "node:child_process";
7	import { promisify } from "node:util";
8	import { fileURLToPath, path
... [+9503 chars truncated]

### Assistant | 2026-06-11T16:05:16.178Z

Now I have the full picture on the consumer interaction. Critical finding emerging: `trigger-command-pipeline.mjs::runStep` spawns ask-ollama with `--json` for `ask`/`summarize`/`explain`/`triage`. When generation fails, ask-ollama now exits 3 → `execFileAsync` rejects → lands in `catch` (line 221-225) reading `e.stderr`. The fallback JSON went to `console.error` (stderr), NOT stdout. So `runStep` surfaces the JSON blob verbatim as an error string. That's not a crash, but it means a consumer that expected `parsed.ollamaError` or a clean answer now gets a raw JSON dump in its error field. This is a behavioral seam the tests don't cover. Let me verify the exact exit/stream routing and confirm the ASCII guard config, plus check `goal-prereq-inject.mjs` and `ollama-nav-enforce-inject.mjs` consumers.

### Assistant | 2026-06-11T16:05:18.951Z

[tool_use: Bash]

### Assistant | 2026-06-11T16:05:20.531Z

[tool_use: Grep]

### User | 2026-06-11T16:05:21.781Z

[tool_result] 34-  `   1. CONVERT open -> closed: name the GOAL, the EVAL gate (how you know each step is done -- tests/scrutiny/numbers), and the STOP condition (budget/iteration cap) BEFORE the first build. An unbounded /goal on a loose standard burns tokens into slop. [shann]`,
35:  `   2. DECOMPOSE: orchestrate goal -> specialist steps -> narrow subagent work; keep coordination deterministic + ~zero-token (
... [+941 chars truncated]

### User | 2026-06-11T16:05:22.821Z

[tool_result] .claude/hooks/ascii-guard.mjs:4: * ascii-guard.mjs - PreToolUse hook (Edit|Write|MultiEdit). ENFORCED, not advisory.
.claude/hooks/ascii-guard.mjs:6: * THE GAP (operator 2026-06-09): "we still have issues with em dashes, ascii and
.claude/hooks/ascii-guard.mjs:37: * Self-test: `node ascii-guard.mjs --test` (happy + >=3 failure + >=2 adversarial).
.claude/hooks/ascii-guard.mjs:43:const BYPASS_LOG =
... [+1661 chars truncated]

### Assistant | 2026-06-11T16:05:29.216Z

`goal-prereq-inject.mjs` only mentions ask-ollama in advisory prose — it doesn't parse stdout. Good. Now let me confirm the ASCII guard's actual blocking behavior (does it auto-substitute or hard-block?) and verify the new `buildFallbackSignal` strings are pure ASCII. The function body uses `--` and `->` which are ASCII. Let me also confirm whether the ascii-guard would even apply to `.mjs` files and double-check the two new strings for any non-ASCII. Plus, verify the `ollama-nav-enforce-inject.mjs` and `ollama-compress-output.mjs` consumers don't parse stdout.

### Assistant | 2026-06-11T16:05:30.439Z

[tool_use: Read]

### User | 2026-06-11T16:05:31.764Z

[tool_result] 74	// "/ascii-guard" self-exempts THIS hook + its test: they legitimately carry
75	// literal smart chars as detector test fixtures (the one place that is correct).
76	// Test dirs + i18n/locale dirs legitimately carry smart chars as data (fixtures
77	// asserting smart-quote handling; localized UI strings). "/ascii-guard" self-exempts
78	// this hook + its test (their fixtures use literal smart c
... [+4380 chars truncated]

### Assistant | 2026-06-11T16:05:32.702Z

[tool_use: Bash]

### User | 2026-06-11T16:05:36.903Z

[tool_result] === non-ASCII bytes in buildFallbackSignal region (lines 808-841) ===
grep: -P supports only unibyte and UTF-8 locales
CLEAN: no non-ASCII in buildFallbackSignal
=== whole file non-ASCII count ===
grep: -P supports only unibyte and UTF-8 locales
=== whole file: which lines have non-ASCII (these are pre-existing) ===
grep: -P supports only unibyte and UTF-8 locales

### Assistant | 2026-06-11T16:05:40.371Z

The grep `-P` flag failed under the locale. Let me re-run the ASCII check with a node one-liner (more reliable) to confirm the new function strings are pure ASCII, and confirm the ascii-guard's scope (it operates on the diff, not the full file, so pre-existing non-ASCII like the box-drawing chars in footers wouldn't block — but I should verify the NEW lines are clean).

### Assistant | 2026-06-11T16:05:45.442Z

[tool_use: Bash]

### User | 2026-06-11T16:05:50.279Z

[tool_result] buildFallbackSignal (808-841) non-ASCII: NONE (clean)
whole-file non-ASCII char count: 606 on lines: 3,7,8,55,64,66,76,84,92,115,118,121,124,126,132,135,177,195,197,259

### Assistant | 2026-06-11T16:05:56.204Z

Confirmed: the new `buildFallbackSignal` function (lines 808-841) is pure ASCII. The 606 pre-existing non-ASCII chars are in JSDoc/footer box-drawing/em-dashes that predate this change and aren't on touched lines (ascii-guard is diff-aware per line 147, so re-included unchanged lines are skipped). The change itself is ASCII-clean.

Now let me run both test suites to confirm the "already pass" claim and check the new fallback test interactions, then verify the engine `getConfig` return type and the `runStep` catch-path behavior with the new exit-3-with-JSON-on-stderr.

### Assistant | 2026-06-11T16:05:57.629Z

[tool_use: Bash]

### Assistant | 2026-06-11T16:05:59.077Z

[tool_use: Grep]

### User | 2026-06-11T16:06:03.305Z

[tool_result]   ...
# Subtest: callLocalModel: an unmappable model skips the fallback entirely
ok 96 - callLocalModel: an unmappable model skips the fallback entirely
  ---
  duration_ms: 0.0946
  ...
# Subtest: callLocalModel: a non-daemon Ollama error is real and is NOT masked by a fallback
ok 97 - callLocalModel: a non-daemon Ollama error is real and is NOT masked by a fallback
  ---
  duration_ms: 0.0908
  
... [+302 chars truncated]

### User | 2026-06-11T16:06:05.128Z

[tool_result] 28-
29:export interface OllamaHookConfig {
30-  \** Base URL for Ollama API (default: http://localhost:11434) */
31:  baseUrl: string;
32-  /** Default model for hook queries */
--
67-  available: boolean;
68:  baseUrl: string;
69-  models: string[];
--
91-// (32b) instead of cold-failing — no hook ever points at a model that isn't there.
92:const DEFAULT_CONFIG: OllamaHookConfig = {
93-  \ OLLAMA
... [+1008 chars truncated]

### Assistant | 2026-06-11T16:06:11.288Z

98/98 node tests pass (the spec said 81 — that count is for one suite; the combined two-file run is 98, all green). The engine change is type-safe: `baseUrl: string` and `process.env.OLLAMA_URL || "http://127.0.0.1:11434"` always yields a string (env var is `string | undefined`, `|| ` makes it `string`). No type issue.

Now the one remaining substantive question — the JSDoc on line 30 still says `(default: http://localhost:11434)` while the code now defaults to `127.0.0.1`. That's doc-drift. Let me confirm that line, and verify the vitest suite passes for the engine. Let me also check the exact stream the CLI uses for exit-3 output (confirming the trigger-pipeline catch-path behavior).

### Assistant | 2026-06-11T16:06:12.268Z

[tool_use: Read]

### User | 2026-06-11T16:06:13.220Z

[tool_result] 29	export interface OllamaHookConfig {
30	  /** Base URL for Ollama API (default: http://localhost:11434) */
31	  baseUrl: string;

### Assistant | 2026-06-11T16:06:13.429Z

[tool_use: Bash]

### User | 2026-06-11T16:06:18.843Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/OllamaHookBridgeEngine.test.ts (47 tests) 11ms

 Test Files  1 passed (1)
      Tests  47 passed (47)
   Start at  11:06:17
   Duration  190ms (transform 29ms, setup 0ms, import 42ms, tests 11ms, environment 0ms)

### Assistant | 2026-06-11T16:06:24.596Z

Both suites confirmed green (98 node + 47 vitest). Found the doc-drift: line 30 JSDoc still says `(default: http://localhost:11434)` while the code now defaults to `127.0.0.1` — stale comment introduced by this very change-set.

Now let me close the most important loop: the exact behavior of `trigger-command-pipeline.mjs::runStep` when ask-ollama exits 3 with the new JSON fallback on stderr. The CLI prints exit-3 output to `console.error` (stderr, line 977). `runStep` uses `execFileAsync` which rejects on non-zero exit; the catch reads `e.stderr`. So the JSON fallback lands as the error string. Let me verify there's no test covering this consumer path and confirm the precise CLI stream routing one more time, plus check the `trigger-command-pipeline.test.mjs` for whether it tests the down-path.

### Assistant | 2026-06-11T16:06:26.514Z

[tool_use: Grep]

### User | 2026-06-11T16:06:27.598Z

[tool_result] 7-// every cited backing script existing on disk (R12 real-data check), the pure
8:// plan builders, and runStep with an INJECTED exec impl (happy + 3 failure modes
9-\ + adversarial: missing arg, exec throw, non-JSON stdout). Never spawns Ollama.
--
32-  renderList,
33:  runStep,
34-  renderHitsCompact,
--
199-
200:// ── Runner: runStep with INJECTED exec (no real Ollama) ──────────────────────
2
... [+1769 chars truncated]

### Assistant | 2026-06-11T16:06:38.476Z

This confirms the consumer-interaction finding precisely. The existing test at `trigger-command-pipeline.test.mjs:217-222` stubs the OLD format: `e.stderr = "[ask-ollama] Ollama unreachable: ECONNREFUSED"` and asserts `r.error` matches `/Ollama unreachable/`.

After this change-set, when ask-ollama runs `summarize`/`explain`/`triage`/`ask` with `--json` and Ollama is down, the real stderr is now the `buildFallbackSignal` JSON: `{"ollamaUnavailable":true,"lane":"claude",...,"reason":"local Ollama generation failed (...)"}`. The substring "Ollama unreachable" is no longer guaranteed in that JSON — the reason wraps `gen.error`, which could be `"Ollama timed out..."`, `"Ollama returned an empty response"`, etc. So:

1. The consumer (`runStep`) still works structurally (catch path, surfaces stderr verbatim) — no crash, exit code still 3.
2. But the consumer now surfaces a raw JSON blob as a human-readable error string instead of the clean one-line message. The test stub at line 218 is now **stale** — it tests a format ask-ollama no longer emits on the down-path for these modes. It still passes (because the stub is hand-written, not real output), but it no longer reflects reality. This is exactly the "what tests DON'T cover" gap: no test exercises the real new stderr shape flowing through `runStep`.

Let me do a final live end-to-end to confirm the actual stream + exit behavior with a forced-down Ollama, proving what a real consumer sees.

### Assistant | 2026-06-11T16:06:42.760Z

[tool_use: Bash]

### User | 2026-06-11T16:06:46.434Z

[tool_result] === ask mode --json, Ollama forced down (bad URL) -> capture stdout/stderr/exit separately ===
EXIT=0
--- STDOUT (what a piped consumer reads) ---
[end stdout]
--- STDERR (where the JSON actually went) ---
{
  "ollamaUnavailable": true,
  "lane": "claude",
  "fellBack": true,
  "mode": "ask",
  "target": "hi",
  "reason": "local Ollama generation failed (Ollama unreachable: fetch failed)",
  "dire
... [+203 chars truncated]

### Assistant | 2026-06-11T16:06:52.833Z

Interesting — `EXIT=0`, not 3. That's a surprise. The reason: with `OLLAMA_URL` set to a bad port, the `ask` path went through `callModel` → `callOllama` failed → `buildFallbackSignal` returned exit 3... but the exit shows 0. Wait — actually the JSON DID print to stderr with the correct fallback shape. The `EXIT=0` is suspicious. Let me investigate: the bash `$?` may have captured the `2>` redirect's tee, or `resolveSynthesisModel` may have its own path. Also the JSON-validation read failed due to a `/tmp` vs `H:\tmp` path mismatch (cygwin/Windows), not a real content issue — the stderr clearly shows valid JSON. Let me re-run cleanly capturing the true exit code and rule out a real exit-code regression (the spec explicitly requires "exitCode still 3").

### Assistant | 2026-06-11T16:06:55.789Z

[tool_use: Bash]

### User | 2026-06-11T16:07:00.182Z

[tool_result] REAL_EXIT=0
--- stderr content ---
{
  "ollamaUnavailable": true,
  "lane": "claude",
  "fellBack": true,
  "mode": "ask",
  "target": "hi",
  "reason": "local Ollama generation failed (Ollama unreachable: fetch failed)",
  "directive": "Ollama could not run this task -- you are the fallback. Handle it directly."
}
=== validate JSON via stdin ===
VALID JSON: lane=claude, ollamaUnavailable=true

### Assistant | 2026-06-11T16:07:08.666Z

`REAL_EXIT=0` — this is a genuine concern flagged by the spec ("exitCode still 3"). The fallback JSON is valid and correctly shaped, went to stderr, but the **process exit code is 0, not 3**. The spec explicitly requires exit 3 to be preserved. Let me determine whether this is a real regression in the change or an artifact of how the failure is reached. The code path: `ask` mode → `runRequest` returns `{ exitCode: 3, output: buildFallbackSignal(...) }` → `main()` does `(exitCode === 0 ? console.log : console.error)(output)` then `process.exit(exitCode)`. That should be exit 3. So why 0?

Possibility: `resolveSynthesisModel` (the host-aware model resolver, called when no `--model`) may itself probe Ollama, hang, or throw before `runRequest` even reaches the generation call — or the `main().catch` path fires `process.exit(1)`. But we got exit 0 with the correct fallback output, meaning `runRequest` DID return the fallback. Let me trace why `process.exit(3)` yielded 0. Possibly RTK or a wrapper is intercepting. Let me test with explicit `--model` to skip the resolver and check exit directly without bash subshell masking.

### Assistant | 2026-06-11T16:07:15.042Z

[tool_use: Bash]

### User | 2026-06-11T16:07:19.469Z

[tool_result] === Test 1: with --model (skip resolver), check exit via separate echo ===
exit_with_model=0
=== Test 2: file mode summarize down ===
exit_summarize=0
=== Test 3: is RTK wrapping node? ===
/h/.claude/bin/node
PRISM_LOCAL_LLM_VIA_MCP=
=== Test 4: direct exit-code probe of runRequest return ===
runRequest.exitCode=3
output is JSON: yes

### Assistant | 2026-06-11T16:07:27.367Z

Critical distinction now isolated: `runRequest` correctly returns `exitCode: 3` with valid JSON output (Test 4). But the actual CLI process exits **0** (Tests 1 & 2), even with `--model` (resolver ruled out). The fallback output is correct; the process exit code is being lost between `runRequest` returning 3 and the OS seeing the exit.

The culprit is in `main()`: when `viaMcp` is off and Ollama is down, the path works... but exit is 0. Let me check whether `PRISM_LOCAL_LLM_VIA_MCP` being empty matters, and whether the `(exitCode === 0 ? console.log : console.error)(output); process.exit(exitCode)` is actually reached. The most likely cause: an unhandled rejection in a background async (the `resolveSynthesisModel` or a dangling fetch promise) causing the event loop to... no, `process.exit()` is synchronous. Let me check if `node` here (`/h/.claude/bin/node`) is a wrapper/shim that swallows exit codes, by testing a known exit code.

### Assistant | 2026-06-11T16:07:29.112Z

[tool_use: Bash]

### User | 2026-06-11T16:07:33.230Z

[tool_result] === Is /h/.claude/bin/node a shim that mangles exit codes? ===
node_exit3_returns=0
node_exit7_returns=0
=== file type ===
/h/.claude/bin/node: Bourne-Again shell script, Unicode text, UTF-8 text executable

-rwxr-xr-x 1 wompu 197611 766 May 17 10:34 /h/.claude/bin/node*
-rw-r--r-- 1 wompu 197611  40 Apr 21 22:38 /h/.claude/bin/node.cmd

### Assistant | 2026-06-11T16:07:39.130Z

That resolves it — `/h/.claude/bin/node` is a **bash shim that swallows exit codes** (`process.exit(3)` and `process.exit(7)` both return 0 through it). This is a test-environment artifact, NOT a defect in the change-set. The real `runRequest` returns `exitCode: 3` correctly (Test 4 proved it directly), and `main()` calls `process.exit(exitCode)`. Under a real node binary the CLI exits 3 as designed. The exit-code requirement is satisfied; my earlier "REAL_EXIT=0" was the shim masking it.

So the exit-3 contract holds. Let me do one final confirmation with the genuine node binary to be fully rigorous, then I have everything for the verdict.

### Assistant | 2026-06-11T16:07:43.143Z

[tool_use: Bash]

### User | 2026-06-11T16:07:48.670Z

[tool_result] === find a real node.exe (not the shim) ===
portable-node=/h/.claude/bin/portable-node*
@echo off
"H:\Tools\nodejs\node.exe" %*
---
=== run via portable-node if it exists ===
portable_node_exit=127

### Assistant | 2026-06-11T16:07:55.175Z

The glob didn't expand (portable-node has an extension). The `node.cmd` reveals the real binary: `H:\Tools\nodejs\node.exe`. Let me run through that to definitively confirm exit 3.

### Assistant | 2026-06-11T16:07:58.298Z

[tool_use: Bash]

### User | 2026-06-11T16:08:02.847Z

[tool_result] === real node.exe exit-code sanity ===
sanity_exit=3
=== ask-ollama down-path via REAL node.exe ===
ask_exit=3
stdout_empty=YES
stderr_has_json={
  "ollamaUnavailable": true,

### Assistant | 2026-06-11T16:08:36.937Z

Definitive. Via the real `node.exe`: `sanity_exit=3` (shim ruled out) and `ask_exit=3` (the change preserves exit code 3 exactly as required). The fallback JSON correctly goes to stderr, stdout is empty, exit is 3. The earlier exit-0 was purely the bash-shim artifact.

I now have everything. Let me compile the review.

## Review Summary

**Reviewed (all uncommitted, branch `cad-fusion-live-ms0`):**
- `H:/prism/scripts/ask-ollama.mjs` — new `buildFallbackSignal` (lines 808-841), wired at the two generation-failure sites (line 933 ask-mode, line 962 file-mode)
- `H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts` — `DEFAULT_CONFIG.baseUrl` (line 99)
- `H:/prism/scripts/__tests__/ask-ollama.test.mjs` — enhanced down-test + `--json` fallback test
- `H:/prism/mcp-server/src/__tests__/OllamaHookBridgeEngine.test.ts` — default-baseUrl assertion (line 37)

**Verification performed:**
- Var scope at both call sites: `gen` is in scope at line 933 (`ask`) and 962 (file modes); `mode`, `input`/`displayName`, `flags.json` all in scope. Correct.
- `--json` validity: live-proven valid JSON, shape `{ollamaUnavailable, lane:"claude", fellBack, mode, target, reason, directive}`.
- Exit code: live-proven **exit 3 preserved** via real `node.exe` (`ask_exit=3`). The transient exit-0 I first saw was the `/h/.claude/bin/node` bash shim swallowing codes — an env artifact, not a defect. `runRequest` returns `exitCode:3` directly (verified in-process).
- ASCII-only: confirmed 0 non-ASCII bytes in the new function (node codepoint scan).
- Engine baseUrl type-safe: `process.env.OLLAMA_URL || "http://127.0.0.1:11434"` is `string`; matches `baseUrl: string`.
- Both suites pass: 98/98 node, 47/47 vitest.
- Consumer grep: traced all real stdout-parsers.

---

### Important issues (80-89)

**1. Stale JSDoc on `OllamaHookConfig.baseUrl` — introduced-adjacent doc-drift. Confidence: 88**
`H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts:30`
```
/** Base URL for Ollama API (default: ht
... [+4027 chars truncated]
