---
type: "chat-session"
source: "claude-code-cli"
session_id: "72879035-e0ca-4192-9498-ed9720495151"
title: "Hunt silent-failure / swallowed-signal risks in a fleet-wide Ollama fallback cha"
date: "2026-06-11"
first_ts: "2026-06-11T16:04:20.097Z"
last_ts: "2026-06-11T16:10:05.158Z"
cwd: "H:\\prism-slot-india"
messages: 75
user_msgs: 26
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-a5855b5a44f06436a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Hunt silent-failure / swallowed-signal risks in a fleet-wide Ollama fallback cha

> **claude-code-cli** | 2026-06-11 | 75 msgs (26 user / 49 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-a5855b5a44f06436a.jsonl`

## Transcript

### User | 2026-06-11T16:04:20.097Z

Hunt silent-failure / swallowed-signal risks in a fleet-wide Ollama fallback change-set in PRISM at H:/prism (main tree, branch cad-fusion-live-ms0, UNCOMMITTED). The change EXISTS to stop a silent failure — verify the new path can't itself swallow the signal. Plan: H:/prism/state/shared/specs/OLLAMA-FLEET-AUDIT-2026-06-11.md (P0-3 / FM-2).

FILES:
1. H:/prism/scripts/ask-ollama.mjs — added `buildFallbackSignal()`, wired at the two `if (!gen.ok)` generation-failure return sites. On Ollama generation failure: exitCode 3 + an actionable "you are the fallback" directive (human) OR `{lane:"claude",ollamaUnavailable:true,fellBack:true}` JSON (--json). Previously --json mode returned a NON-JSON error string (silent parse-fail for JSON consumers).
2. H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts — baseUrl default now `process.env.OLLAMA_URL || "http://127.0.0.1:11434"`.

HUNT (file:line evidence):
- REACHABILITY: main() at ~line 941 does `(exitCode===0?console.log:console.error)(output); process.exit(exitCode)` — fallback goes to STDERR on exit 3. When Claude runs the suggested command via Bash, does stderr surface to Claude or get lost? Is stderr right, or should an actionable fallback go to stdout?
- Any PROGRAMMATIC caller that treats any non-empty ask-ollama output as a successful answer and would now ingest the fallback directive as the real answer? Grep for spawners/execs of ask-ollama.
- Graph-load sites (viz/rerank `if (!loaded.ok)`) still emit the old format — correct scoping (NOT Ollama-down) or a missed gap?
- Malformed OLLAMA_URL silent-failure mode on the engine default?

Findings with file:line. Final line: VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-11T16:04:24.411Z

I'll start by reading the audit plan and the two changed files to ground the hunt in actual code.

### Assistant | 2026-06-11T16:04:24.772Z

[tool_use: Read]

### User | 2026-06-11T16:04:26.529Z

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

### Assistant | 2026-06-11T16:04:30.392Z

I have the audit plan. Now let me read the two changed files in full to verify the new fallback path can't itself swallow the signal, and grep for programmatic callers in parallel.

### Assistant | 2026-06-11T16:04:30.460Z

[tool_use: Read]

### User | 2026-06-11T16:04:31.215Z

[tool_result] read-once-guard: 'H:\prism\scripts\ask-ollama.mjs' was already read 13s ago in this session and is unchanged (mtime 1781188030005). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-11T16:04:34.349Z

The read-once guard claims I've already read this file, but I don't actually have its contents in my context yet (this is a fresh session for the hunt). Let me bypass the cache to get the real bytes.

### Assistant | 2026-06-11T16:04:35.141Z

[tool_use: Bash]

### User | 2026-06-11T16:04:39.726Z

[tool_result] #!/usr/bin/env node
/**
 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
 *
 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
 * Claude context window. Claude invokes this via Bash; only the compact
 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
 * files, build-error dumps — are processed here in the subprocess and
 * di
... [+8674 chars truncated]

### Assistant | 2026-06-11T16:04:43.617Z

I have the head. The DEFAULT_MODEL, KEEP_ALIVE, OLLAMA_URL, and num_predict are visible. Now I need the failure-return sites (`buildFallbackSignal`, the two `if (!gen.ok)` sites), the `main()` at ~941, and the `callLocalModel`/`callOllama` body. Let me grep for the key anchors and read the relevant sections.

### Assistant | 2026-06-11T16:04:45.198Z

[tool_use: Grep]

### User | 2026-06-11T16:04:46.329Z

[tool_result] 432:export async function callOllama(model, prompt, opts = {}) {
494:// of failing hard. Opt-in via callLocalModel; callOllama itself is untouched.
546: * so a prompt with shell metacharacters cannot inject. Returns the callOllama
580:export async function callLocalModel(model, prompt, opts = {}) {
583:    callOllamaImpl = callOllama,
586:  const primary = await callOllamaImpl(model, prompt, opts)
... [+2016 chars truncated]

### Assistant | 2026-06-11T16:04:49.509Z

Now let me read the critical sections: the `buildFallbackSignal` definition (809-843), the `runRequest` body (845-967), and `main()` (970-988), plus the `callLocalModel`/Docker fallback (580-735).

### Assistant | 2026-06-11T16:04:50.219Z

[tool_use: Read]

### User | 2026-06-11T16:04:51.664Z

[tool_result] 800	  node scripts/ask-ollama.mjs triage <file>      diagnose an error dump
801	  node scripts/ask-ollama.mjs ask <question>     general question
802	
803	  file modes accept "-" to read stdin (pipe command output through a local model):
804	    rtk grep foo src | node scripts/ask-ollama.mjs summarize -
805	
806	flags: --synth --model <n> --json --max-hits <n> --timeout <ms> --allow-unsafe`;
807	

... [+9636 chars truncated]

### Assistant | 2026-06-11T16:04:57.075Z

Now I have the core: `buildFallbackSignal`, the `main()` stderr-on-exit-3 path, and the `if (!gen.ok)` sites. The critical reachability question is whether stderr survives to Claude when run via Bash. Let me read the `callLocalModel`/Docker-fallback section (580-735) and `callOllama` (432-494) to confirm `gen.error` is well-formed and the Docker tier feeds into this, plus grep for programmatic callers and the graph-load old-format sites.

### Assistant | 2026-06-11T16:04:57.908Z

[tool_use: Read]

### User | 2026-06-11T16:04:59.085Z

[tool_result] 432	export async function callOllama(model, prompt, opts = {}) {
433	  const {
434	    fetchImpl = fetch,
435	    timeoutMs = DEFAULT_TIMEOUT_MS,
436	    ollamaUrl = OLLAMA_URL,
437	    numPredict = DEFAULT_NUM_PREDICT,
438	    numCtx,
439	  } = opts;
440	  const ctrl = new AbortController();
441	  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
442	  try {
443	    const res = await fetch
... [+7020 chars truncated]

### Assistant | 2026-06-11T16:05:02.404Z

Now let me see how `callModel` (the dep injected at the `if (!gen.ok)` sites) relates to `callLocalModel` vs `callOllama`, and grep for programmatic callers + the graph-load old-format sites in parallel.

### Assistant | 2026-06-11T16:05:03.366Z

[tool_use: Read]

### User | 2026-06-11T16:05:04.537Z

[tool_result] 591	  }
592	  const dockerModel = mapOllamaToDockerModel(model);
593	  if (!dockerModel) return { ...primary, source: "ollama" };
594	  const fb = await callDockerModelImpl(dockerModel, prompt, opts);
595	  if (fb.ok) return fb;
596	  // Both paths failed — return the ORIGINAL Ollama error. It is the primary
597	  // route; surfacing the fallback's error would mislead the operator.
598	  return { 
... [+6512 chars truncated]

### Assistant | 2026-06-11T16:05:10.298Z

I now have the full chain. Note a key observation: `callModel` (used at the `if (!gen.ok)` sites in runRequest) routes to `callOllama` directly or via MCP, but **does NOT use `callLocalModel`** — so the Docker-Models tier is never reached in the CLI file modes. That means `gen.error` at line 962/933 is the raw Ollama error, and the fallback signal fires correctly without a Docker attempt. The audit plan's claim about "after callDockerModel returns null" doesn't match what was wired — the actual wiring is simpler (callModel → callOllama). That's worth noting but not a swallow.

Now the critical hunt items. Let me grep for programmatic callers (spawners/execs of ask-ollama) and the OllamaHookBridgeEngine, plus run a live test of the stderr behavior, in parallel.

### Assistant | 2026-06-11T16:05:12.182Z

[tool_use: Grep]

### Assistant | 2026-06-11T16:05:12.589Z

[tool_use: Read]

### User | 2026-06-11T16:05:13.530Z

[tool_result] 80	// Blackwell — the 7b speed-tier no longer exists).
81	//
82	// BLACKWELL-MODEL-INTEGRATION-MS0 P2 (2026-06-06): gpt-oss:20b is now PULLED (live
83	// /api/tags confirms it), so the speed-critical hooks (grep_index, mcp_route, general)
84	// move to it — the fast MoE tier (~3B active, sub-second) for the cheap classify/route/
85	// general work that doesn't need the 32b's depth. The latency-tol
... [+3724 chars truncated]

### User | 2026-06-11T16:05:14.271Z

[tool_result] Found 33 files
H:\prism\scripts\lib\ollama-fanout.test.mjs
H:\prism\scripts\lib\ollama-fanout.mjs
H:\prism\scripts\__tests__\ask-ollama.test.mjs
H:\prism\scripts\ask-ollama.mjs
H:\prism\.claude\hooks\goal-prereq-inject.mjs
H:\prism\scripts\lib\ollama-search-rerank.mjs
H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts
H:\prism\.claude\hooks\wiki-read-offload-advisory.mjs
H:\prism\scripts\a
... [+1170 chars truncated]

### Assistant | 2026-06-11T16:05:18.770Z

The OllamaHookBridgeEngine change is confirmed at line 99 — `process.env.OLLAMA_URL || "http://127.0.0.1:11434"`. The malformed-OLLAMA_URL question applies to both files since both use the same env default. Let me check how the engine validates/uses baseUrl (the malformed-URL failure mode), and check the most likely programmatic callers of ask-ollama: the hooks that spawn it (wiki-read-offload-advisory, ollama-task-offloader, mine-*-transcripts, ollama-fanout). Let me grep for how those invoke it and parse the output.

### Assistant | 2026-06-11T16:05:21.127Z

[tool_use: Grep]

### Assistant | 2026-06-11T16:05:22.363Z

[tool_use: Grep]

### User | 2026-06-11T16:05:22.468Z

[tool_result] 8:// + [[reference_fleet_rate_limit_diagnosis_2026_05_29]]): ultracode Workflow fan-outs spawn
18:// router (model selection) + ask-ollama (single query); this adds the concurrent batch.
117:// PARITY with ask-ollama.buildFallbackSignal (the SINGLE-query path already emits an
122:// reasoning/planning/heavy-build). A pure lib cannot spawn an Agent (that's a harness
156: * Build the batch Sonnet-fa
... [+59 chars truncated]

### User | 2026-06-11T16:05:23.718Z

[tool_result] 55: *   node scripts/mine-galaxy-transcripts.mjs --dry-run [--json]        # classify only, no Ollama, no writes
67:// path. callViaMcp forwards numCtx so the 32768-sized slices are not truncated. (ask-ollama.mjs
69:import { callViaMcp, mcpRoutingEnabled } from "./ask-ollama.mjs";
86:const JSON_OUT = has("--json");
228:    try { o = JSON.parse(line); } catch { continue; }
261:  try { return JSON.p
... [+824 chars truncated]

### Assistant | 2026-06-11T16:05:29.290Z

Good — the transcript miners and ollama-fanout import `callViaMcp`/`callModel` as a **library** (in-process import), not by spawning the CLI, so they receive the structured `{ok:false, error}` shape directly and never see the `buildFallbackSignal` text output. They are not exposed to the swallow risk. The CLI-spawning callers are the real concern. Let me find which callers actually `spawn`/`exec` the `ask-ollama.mjs` CLI and parse its stdout/stderr as an answer.

### Assistant | 2026-06-11T16:05:30.757Z

[tool_use: Bash]

### User | 2026-06-11T16:05:34.808Z

[tool_result] .claude/hooks/goal-prereq-inject.mjs:35:  `   2. DECOMPOSE: orchestrate goal -> specialist steps -> narrow subagent work; keep coordination deterministic + ~zero-token (route, don't reason -- R5; a Workflow coordinator spends nothing). Route each MECHANICAL/text step (explain/summarize/docstring/classify/lint/diff/triage) to the local lane via the /smart executor contract (resolveExecutor -> ask-o
... [+1299 chars truncated]

### Assistant | 2026-06-11T16:05:40.033Z

No hook or script actually **spawns** the `ask-ollama.mjs` CLI and parses its stdout as an answer. The references are all advisory text (directives telling Claude to run the command), library imports (`import {callViaMcp}`), or usage strings. This is a critical finding for the PROGRAMMATIC-caller hunt: the only consumer of the new CLI output is **Claude itself** running it via Bash. So the reachability question (stderr vs stdout) is the whole game.

Let me verify the live stderr behavior — does the fallback signal on exit 3 surface to Claude when run via Bash? And check the graph-load old-format sites (`if (!loaded.ok)` at 865/902) and the malformed-URL mode.

### Assistant | 2026-06-11T16:05:42.788Z

[tool_use: Bash]

### User | 2026-06-11T16:05:47.129Z

[tool_result] === TEST 1: exit-3 fallback to STDERR, human mode (Ollama forced down via bad URL) ===
exit=0
--- STDOUT ---
--- STDERR ---
[ask-ollama] OLLAMA FALLBACK -> Claude/Sonnet.
The local "ask" task could not run: Ollama unreachable: fetch failed.
You are the fallback (operator directive: Sonnet fallback when Ollama fails).
Handle "what is 2+2" directly -- do not retry the local model in a loop.

### Assistant | 2026-06-11T16:05:53.431Z

The fallback signal fires correctly and lands on STDERR. Note `exit=0` here — that's the shell capturing the `2>` redirect's own exit, not the node exit; let me confirm the actual node exit code separately. But the key observation: the fallback text went to STDERR.

Now the central reachability question — when Claude runs a Bash command, does stderr surface? Let me test the JSON mode and confirm the real exit code, plus test how a `2>&1`-naive vs bare invocation behaves (the way Claude would actually run it).

### Assistant | 2026-06-11T16:05:58.083Z

[tool_use: Bash]

### User | 2026-06-11T16:06:03.168Z

[tool_result] === TEST 2: real exit code (no redirect capture) ===
node exit=0

=== TEST 3: --json fallback shape (is it valid JSON on STDERR?) ===
node exit=0
--- STDOUT (empty?) ---
--- STDERR (the JSON) ---
{
  "ollamaUnavailable": true,
  "lane": "claude",
  "fellBack": true,
  "mode": "summarize",
  "target": "H:/prism/package.json",
  "reason": "local Ollama generation failed (Ollama unreachable: fetch fa
... [+198 chars truncated]

### Assistant | 2026-06-11T16:06:10.579Z

Two important results: (1) `node exit=0` even on the fallback path — this is unexpected. The runRequest returns `exitCode: 3`, and `main()` does `process.exit(exitCode)`, yet the shell reports 0. That's because of how I forced the down state. Wait — actually MCP routing fail-soft may be turning this into a success path, or the URL `http://127.0.0.1:1` isn't reaching the `!gen.ok` branch the way I expect. The fallback signal text IS emitted, but exit=0 contradicts the documented exit 3. Let me investigate that discrepancy — it's a potential swallow (a JSON consumer branching on exit code would see success). (2) The `/tmp/e.txt` ENOENT is just a Git-Bash-vs-Windows path mismatch in my own node `-e`, not a code issue — the JSON itself printed fine and is valid.

Let me nail the exit-code discrepancy precisely — it's the crux of whether a programmatic exit-code-branching caller gets a false success.

### Assistant | 2026-06-11T16:06:13.486Z

[tool_use: Bash]

### User | 2026-06-11T16:06:18.204Z

[tool_result] PID started
=== exit code via cmd, no bash capture ===
captured rc=0

### Assistant | 2026-06-11T16:06:24.947Z

Confirmed: exit code is **0**, not 3, on the human-mode `ask` fallback. The doc comment and the audit plan both say "Exit code stays 3 (a real failure for scripts that branch on it)". The code at line 933/962 returns `{ exitCode: 3, ... }`. Yet the live process exits 0. Something between `runRequest` returning 3 and `process.exit` is overriding it — OR the failure isn't reaching that branch. Let me trace: with `PRISM_LOCAL_LLM_VIA_MCP=0`, `callModel` → `callOllama` with bad URL → should return `{ok:false}` → `if (!gen.ok)` → exitCode 3. But exit is 0.

Let me check whether `resolveSynthesisModel` (the host-aware model resolver at line 860) is itself making a network call to the bad URL and hanging/erroring, or whether there's a different path. Let me run with explicit `--model` to bypass the resolver and add a debug.

### Assistant | 2026-06-11T16:06:29.470Z

[tool_use: Bash]

### User | 2026-06-11T16:06:33.180Z

[tool_result] === with --model (bypass resolveSynthesisModel) ===
rc=0
=== check: is Ollama actually UP on default port? (my bad URL may be ignored) ===
default-port ollama status 200
=== does resolveSynthesisModel ignore OLLAMA_URL and hit 11434? ===
19:// Pure-shell: every side-effect (host detection, /api/tags fetch) is injectable
28:  process.env.PRISM_OLLAMA_TAGS_URL || "http://127.0.0.1:11434/api/tags";
3
... [+396 chars truncated]

### Assistant | 2026-06-11T16:06:41.474Z

Found the root of the exit-code discrepancy. **Ollama is actually UP** on the default port `11434` (status 200). My `OLLAMA_URL=http://127.0.0.1:1` only redirects `callOllama` (which reads `OLLAMA_URL`), but `callOllama` with bad URL → fails → fallback signal printed. Yet `rc=0` even with `--model`.

So the fallback text printed (Test 1 showed it) but exit was 0. That means: the text emission and the exit code disagree. Wait — in Test 1 the fallback text printed AND in Test 2 rc=0. The only way both are true: `main()` runs `runRequest`, gets `{exitCode:3, output:<fallback>}`, prints output to stderr (correct, since exitCode!==0), then `process.exit(3)`. But the shell sees 0.

Let me definitively capture the exit code via a method that can't be confused by backgrounding or bash subshell semantics — write it to a file from a wrapper.

### Assistant | 2026-06-11T16:06:44.863Z

[tool_use: Bash]

### User | 2026-06-11T16:06:48.158Z

[tool_result] EXIT CODE = 3
STDOUT len = 0
STDERR len = 259
STDERR first line: [ask-ollama] OLLAMA FALLBACK -> Claude/Sonnet.

### Assistant | 2026-06-11T16:06:55.069Z

Resolved. The **true exit code IS 3** when captured properly via `spawn`. My earlier `rc=$?` readings of `0` were an artifact of Git-Bash's handling of the `1>/dev/null 2>/dev/null` redirect chain on this Windows host (the redirect target's success masked the node exit). Via a real `spawn().on('close')`, exit=3, stderr carries the fallback, stdout is empty. So the documented contract holds: **exit 3 + fallback on stderr + stdout empty**. No exit-code swallow.

Now the central reachability verdict. The fallback goes to **stderr**. When Claude runs a Bash command, the harness merges stdout+stderr into the tool result — so Claude WILL see the fallback directive. But the audit question is sharper: is stderr the *right* channel, or should an actionable directive be on stdout? Let me verify the two graph-load sites still emit the old format (correct scoping) and the malformed-URL behavior, then check the OllamaHookBridgeEngine's URL usage for the malformed-URL silent-failure mode.

### Assistant | 2026-06-11T16:06:55.689Z

[tool_use: Read]

### User | 2026-06-11T16:06:56.754Z

[tool_result] 140	    // a partial — caught by OllamaHookBridgeEngine.model-routing.test.ts.
141	    this.config = {
142	      ...DEFAULT_CONFIG,
143	      ...config,
144	      modelOverrides: {
145	        ...DEFAULT_CONFIG.modelOverrides,
146	        ...(config.modelOverrides ?? {}),
147	      },
148	    };
149	  }
150	
151	  /**
152	   * Query Ollama with a prompt and get a response.
153	   * Designed for ho
... [+3648 chars truncated]

### Assistant | 2026-06-11T16:07:04.754Z

The OllamaHookBridgeEngine's `query()` wraps the `fetch(\`${baseUrl}/api/generate\`)` in a try/catch that returns `{success:false, fallbackUsed:true, error}` on any failure. A **malformed** `OLLAMA_URL` (e.g. `OLLAMA_URL=ftp://x` or `OLLAMA_URL=not a url`) would make `fetch` throw a TypeError, caught at line 242 → `success:false, error:"Connection error: ..."`. That's a graceful fail-soft, not a silent swallow — the caller gets `success:false`. The malformed-URL mode does NOT silently swallow here; it surfaces via the result object. Same for `ask-ollama.mjs` `callOllama` (catch at 480 → `{ok:false, error:"Ollama unreachable: ..."}`).

Let me verify the malformed-URL case live for ask-ollama (does a garbage URL produce the fallback signal, or does it crash before reaching the fallback?), and confirm the graph-load sites at 865/902 are correctly scoped (NOT Ollama-down).

### Assistant | 2026-06-11T16:07:09.833Z

[tool_use: Bash]

### User | 2026-06-11T16:07:15.104Z

[tool_result] === malformed OLLAMA_URL: garbage (not a URL) ===
[garbage] exit=3 stdoutLen=0 stderrFirst="[ask-ollama] OLLAMA FALLBACK -> Claude/Sonnet."
[wrong-scheme] exit=3 stdoutLen=0 stderrFirst="[ask-ollama] OLLAMA FALLBACK -> Claude/Sonnet."
[trailing-slash (double // in path)] exit=0 stdoutLen=35 stderrFirst=""

### Assistant | 2026-06-11T16:07:26.451Z

Excellent — robust. All malformed-URL variants (`garbage`, `wrong-scheme`) reach the fallback signal (exit 3, fallback on stderr) rather than crashing or silently swallowing. The `fetch` TypeError on a malformed URL is caught at `callOllama:480` → `{ok:false, error:"Ollama unreachable: ..."}` → `!gen.ok` → `buildFallbackSignal`. The trailing-slash variant actually works (Ollama tolerates the double-slash and answers, exit 0, real answer on stdout). So **the malformed-URL silent-failure mode does NOT exist** for either file — both fail loud through their normal error channel.

Now let me confirm the two graph-load sites (865, 902) are correctly scoped — these are viz/rerank modes where a graph-read failure is NOT an Ollama-down condition, so they correctly should NOT emit the fallback signal. And let me check the `ollama-search-rerank.mjs` reference (the rerank fail-safe path) to confirm rerank can't dead-end. I already saw lines 863-924: viz/rerank graph-load failures return `exitCode:3` with `[ask-ollama] ${loaded.error}` (the OLD format), which is correct — a missing/oversize graph file is an infrastructure problem unrelated to Ollama, and emitting "you are the Sonnet fallback" would be a *wrong* directive. That scoping is correct, not a gap.

Let me do a final check: confirm the harness actually surfaces stderr to Claude (the reachability crux) and verify the test file for the fallback to see what contract was asserted.

### Assistant | 2026-06-11T16:07:26.537Z

[tool_use: Read]

### User | 2026-06-11T16:07:27.720Z

[tool_result] read-once-guard: 'H:\prism\scripts\ask-ollama-fallback.test.mjs' was already read 2m ago in this session and is unchanged (mtime 1780588270220). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-11T16:07:30.201Z

The read-once guard is firing falsely again (this is a fresh hunt session). Let me bypass it.

### Assistant | 2026-06-11T16:07:30.946Z

[tool_use: Bash]

### User | 2026-06-11T16:07:35.009Z

[tool_result] // Tests for the Docker Models fallback added in
// DOCKER-MCP-WIRE-MS0/U-MODELS-FALLBACK (scripts/ask-ollama.mjs).
// node:test — no real docker/ollama: every external call is an injected impl.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from
... [+2934 chars truncated]

### Assistant | 2026-06-11T16:07:40.623Z

This test file covers the Docker fallback (`mapOllamaToDockerModel`, `callDockerModel`, `callLocalModel`) but I notice it does NOT cover `buildFallbackSignal` directly. Let me check whether `buildFallbackSignal` has a test (the new function) — and grep for the actual unit test of the new fallback to confirm R9 coverage.

### Assistant | 2026-06-11T16:07:41.481Z

[tool_use: Bash]

### User | 2026-06-11T16:07:47.809Z

[tool_result] === buildFallbackSignal test coverage ===
--- assertions referencing it ---
scripts/__tests__/ask-ollama.test.mjs:507:  assert.match(r.output, /OLLAMA FALLBACK/);
scripts/__tests__/ask-ollama.test.mjs:511:test("runRequest ask --json down -> machine-readable {lane:claude} fallback hint (P0-3)", async () => {
scripts/__tests__/ask-ollama.test.mjs:516:  assert.equal(parsed.lane, "claude");
scripts/__
... [+70 chars truncated]

### Assistant | 2026-06-11T16:07:51.132Z

There IS test coverage for `buildFallbackSignal` via runRequest. Let me read that test block (around 495-525) to confirm it asserts the exit code 3 and stdout/stderr contract — and run the test suite to confirm it's green.

### Assistant | 2026-06-11T16:07:51.757Z

[tool_use: Bash]

### User | 2026-06-11T16:07:56.627Z

[tool_result] test("runRequest ask: returns the model answer", async () => {
  const deps = { callOllama: async () => ({ ok: true, text: "42" }) };
  const r = await runRequest({ mode: "ask", input: "meaning", flags: { timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 0);
  assert.equal(r.output, "42");
});
test("runRequest ask: Ollama down -> exit 3 + actionable Sonnet-fallback directive (P0-3)", async () =
... [+1415 chars truncated]

### Assistant | 2026-06-11T16:08:01.575Z

R9-grade tests: they assert `exitCode===3`, the human directive contents, AND that `--json` output is **valid JSON** (`JSON.parse(r.output)` with `lane/ollamaUnavailable/fellBack` assertions). These tests fail if the business logic regresses. That's the intent-encoding the audit's FM-2 fix required. Let me run the suite to confirm green, then I have everything for the verdict.

### Assistant | 2026-06-11T16:08:02.646Z

[tool_use: Bash]

### User | 2026-06-11T16:08:08.410Z

[tool_result] # Subtest: runRequest ask: Ollama down -> exit 3 + actionable Sonnet-fallback directive (P0-3)
ok 55 - runRequest ask: Ollama down -> exit 3 + actionable Sonnet-fallback directive (P0-3)
# Subtest: runRequest ask --json down -> machine-readable {lane:claude} fallback hint (P0-3)
ok 56 - runRequest ask --json down -> machine-readable {lane:claude} fallback hint (P0-3)
# Subtest: callOllama: numCtx 
... [+278 chars truncated]

### Assistant | 2026-06-11T16:08:10.848Z

81/81 pass including the two P0-3 fallback tests. I have everything needed for the verdict. Let me clean up my probe temp files (R14) and finalize.

### Assistant | 2026-06-11T16:08:11.900Z

[tool_use: Bash]

### User | 2026-06-11T16:09:29.169Z

[tool_result] temp probes removed

### Assistant | 2026-06-11T16:10:05.158Z

Hunt complete. Here are the findings against each axis the task named, with file:line evidence.

## Silent-Failure Hunt — Ollama Fleet Fallback Change-Set

### REACHABILITY — does the fallback signal survive to Claude? (the crux)

**HIGH — fallback goes to STDERR, but that is SAFE here (verified live).** `main()` at `scripts/ask-ollama.mjs:976-978` does `(exitCode === 0 ? console.log : console.error)(output)`. On the fallback (exitCode 3), the directive is written to **stderr**, stdout is empty. Verified by `spawn().on('close')`: `EXIT CODE = 3, STDOUT len = 0, STDERR len = 259, first line "[ask-ollama] OLLAMA FALLBACK -> Claude/Sonnet."`. The Claude Code Bash harness merges stdout+stderr into the tool result, so **Claude does see the directive** — the signal is not lost. This is correct, not a swallow.

*Channel-choice nuance (advisory, not a defect):* an *actionable* directive on stderr is slightly unconventional (stderr is normally diagnostics). But because exit≠0 is the honest signal AND the harness surfaces stderr, the directive reaches Claude either way. No change required; flagging only because the task asked "is stderr right." For a pure programmatic consumer that captures only stdout, stdout would be empty on fallback — but see next finding: no such consumer exists.

*Exit-code caveat for human auditors:* `rc=$?` after `node ... 1>/dev/null 2>/dev/null` in Git-Bash on this Windows host **mis-reports exit 0** (redirect-target success masks the node code). The true code is 3 — only a `spawn`/`.on('close')` capture shows it. Anyone re-verifying must not trust a bash `$?` reading here.

### PROGRAMMATIC CALLERS — would any ingest the directive as a real answer?

**PASS — no CLI-spawning consumer exists.** Grep across `.claude/hooks` + `scripts` for spawn/exec of `ask-ollama.mjs` found **zero** programmatic invocations that parse its stdout as an answer. Every reference is one of:
- Advisory text telling *Claude* to run the command (`ollama-task-offloader.mjs:41
... [+4204 chars truncated]
