---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "You are arm A (analyst) of PRISM's per-file scrutiny gate. Review H:/prism/scrip"
date: "2026-06-17"
first_ts: "2026-06-17T18:43:14.640Z"
last_ts: "2026-06-17T18:44:56.190Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 15
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-af6a95b1df8d0d06f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# You are arm A (analyst) of PRISM's per-file scrutiny gate. Review H:/prism/scrip

> **claude-code-cli** | 2026-06-17 | 37 msgs (15 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-af6a95b1df8d0d06f.jsonl`

## Transcript

### User | 2026-06-17T18:43:14.640Z

You are arm A (analyst) of PRISM's per-file scrutiny gate. Review H:/prism/scripts/ask-hermes.mjs — a PRISM offload CLI just refactored for safety/robustness PARITY with H:/prism/scripts/ask-ollama.mjs.

What changed (verify each is correct + non-breaking):
1. Imports ask-ollama's CANONICAL pure helpers instead of forking: `looksLikeNcProgram, MAX_FILE_BYTES, scaleTimeoutForBytes, readFileCapped, readStdin` (the old inline `cap()` was removed; `isAbsolute` import dropped).
2. `resolveInput(mode, rawInput, deps={})` is now exported + async + dependency-injectable: ask/classify → literal text; "-" → readStdin; a path → readFileCapped; a NON-EXISTENT path → LENIENT literal-text fallthrough (matches on /file not found/i); a REAL read error → ok:false propagated.
3. New exported pure helpers: `shouldRefuseUnsafe({mode,allowUnsafe,text})` (FILE_MODES & !allowUnsafe & looksLikeNcProgram) and `effectiveTimeout({mode,timeoutExplicit,textLen,base})` (scaleTimeoutForBytes for file modes unless pinned).
4. main() refuses to ship dense G-code to the PAID remote proxy unless --allow-unsafe; size-scales the timeout; emits a truncation note.

Cross-check against ask-ollama.mjs at: L365 (looksLikeNcProgram), L757 (readFileCapped returns {ok,content,bytes,truncated} and "file not found:" error), L791 (readStdin returns {ok,content,bytes,truncated} or {ok:false,error}), L964-994 (the file-mode guard + `timeoutExplicit ? timeout : scaleTimeoutForBytes(...)` decision in ask-ollama's main).

Read ask-hermes.mjs END-TO-END. Flag P0/P1 with file:line:
- Is the lenient "/file not found/i → literal text" fallthrough too broad — could it swallow a real failure or mis-route a genuinely-intended file path that happens to be missing?
- Any async correctness bug (resolveInput now awaited in main)?
- Is the NC guard gating on FILE_MODES correct, or does it leave a bypass (e.g., ask/classify accepting a piped file)?
- recordUsage invariant: never CREATES the stats file, atomic RMW, never throws — s
... [+228 chars truncated]

### Assistant | 2026-06-17T18:43:19.992Z

I'll review ask-hermes.mjs end-to-end and cross-check against ask-ollama.mjs. Let me start by reading both files.

### Assistant | 2026-06-17T18:43:20.727Z

[tool_use: Read]

### Assistant | 2026-06-17T18:43:20.973Z

[tool_use: Read]

### User | 2026-06-17T18:43:22.311Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-hermes.mjs -- PRISM bridge to the local Hermes OpenAI-compatible proxy
4	 * (HERMES-BRIDGE-MS0/U-ASK-HERMES).
5	 *
6	 * Hermes (Nous) exposes `hermes proxy start` -- a local HTTP server that speaks
7	 * the OpenAI /v1 protocol and forwards to an OAuth-authenticated upstream
8	 * (xAI Grok / Nous Portal), attaching the user's real managed credential. This
9	 * s
... [+20802 chars truncated]

### User | 2026-06-17T18:43:22.690Z

[tool_result] 350	 */
351	const NC_COORD_CONT_RE = /^\s*(?:[NO]\d+\s+)?[XYZABCUVWIJK][-+]?\d*\.?\d+(?:\s+[XYZABCUVWIJKRF][-+]?\d*\.?\d+)*\s*$/i;
352	
353	/**
354	 * Heuristic: does `text` look like an actual NC / G-code PROGRAM (not source code that
355	 * merely mentions a code, nor an error dump with one stray block)? PRISM safety rule:
356	 * generated NC output is safety-critical and must never be summarize
... [+2759 chars truncated]

### Assistant | 2026-06-17T18:43:26.989Z

I have ask-hermes.mjs fully in context. Let me verify the canonical helper contracts in ask-ollama.mjs (readFileCapped, readStdin, scaleTimeoutForBytes, MAX_FILE_BYTES) and the file-mode guard decision in ask-ollama's main.

### Assistant | 2026-06-17T18:43:28.443Z

[tool_use: Read]

### Assistant | 2026-06-17T18:43:28.825Z

[tool_use: Read]

### User | 2026-06-17T18:43:29.585Z

[tool_result] 740	export async function callModel(model, prompt, opts = {}) {
741	  const {
742	    viaMcp = mcpRoutingEnabled(),
743	    callOllamaImpl = callOllama,
744	    callViaMcpImpl = callViaMcp,
745	    ...rest
746	  } = opts;
747	  if (viaMcp) {
748	    const m = await callViaMcpImpl(model, prompt, rest);
749	    if (m.ok) return { ...m, source: "mcp" };
750	    const direct = await callOllamaImpl(mod
... [+2901 chars truncated]

### User | 2026-06-17T18:43:29.948Z

[tool_result] 940	      return gen.text;
941	    };
942	    const rr = await (deps.rerankCandidates || rerankCandidates)({
943	      query: input, candidates: hits, run, label: "ask-ollama-rerank",
944	    });
945	    const footer = `↓ rerank: scanned ${scanned} nodes locally → ${hits.length} lexical hit(s); ollama re-rank ${rr.verified ? "VERIFIED" : `fell back to lexical (${rr.reason || rr.source})`}`;
946	  
... [+4165 chars truncated]

### Assistant | 2026-06-17T18:43:33.500Z

I have the canonical contracts confirmed. Let me verify the remaining details: the exact constant definitions (MAX_FILE_BYTES, scaleTimeoutForBytes, NC thresholds), that the helpers are actually exported, and check the test file for the contract expectations.

### Assistant | 2026-06-17T18:43:35.853Z

[tool_use: Grep]

### Assistant | 2026-06-17T18:43:36.786Z

[tool_use: Grep]

### Assistant | 2026-06-17T18:43:37.284Z

[tool_use: Glob]

### User | 2026-06-17T18:43:37.989Z

[tool_result] 93:export const MAX_FILE_BYTES = 256 * 1024;
158:export function scaleTimeoutForBytes(bytes, base = DEFAULT_TIMEOUT_MS) {
325:export const NC_PROGRAM_MIN_LINES = 5;
327:const NC_PROGRAM_MIN_RATIO = 0.3;
332:const NC_STRONG_MIN = 2;
348: * Counted ONLY when strong NC context exists (>= NC_STRONG_MIN), so a coordinate data
359: * lines (>= NC_PROGRAM_MIN_LINES and >= NC_PROGRAM_MIN_RATIO of non-blan
... [+297 chars truncated]

### User | 2026-06-17T18:43:39.118Z

[tool_result] 158:export function scaleTimeoutForBytes(bytes, base = DEFAULT_TIMEOUT_MS) {
159-  const tokens = Math.ceil(Math.max(0, Number(bytes) || 0) / CHARS_PER_TOKEN);
160-  const need = TIMEOUT_COLD_LOAD_MS + tokens * TIMEOUT_INPUT_MS_PER_TOKEN + TIMEOUT_OUTPUT_BUDGET_MS;
161-  return Math.min(MAX_SCALED_TIMEOUT_MS, Math.max(base, need));
162-}
163-
164-\** Resolve the model for this call: explicit overr
... [+837 chars truncated]

### User | 2026-06-17T18:43:49.307Z

[tool_result] scripts\ask-hermes.test.mjs

### Assistant | 2026-06-17T18:43:53.411Z

The constants are confirmed. The `readFileCapped` line 759 uses `isAbsolute` (which ask-hermes correctly dropped since it no longer calls that helper directly). Let me confirm the exports list in ask-ollama includes all 5 imported names, and check the test file to see what contracts the build expects.

### Assistant | 2026-06-17T18:43:54.679Z

[tool_use: Grep]

### Assistant | 2026-06-17T18:43:54.935Z

[tool_use: Read]

### User | 2026-06-17T18:43:56.831Z

[tool_result] read-once-guard: 'H:\prism\scripts\ask-hermes.test.mjs' was already read 26s ago in this session and is unchanged (mtime 1781721680684). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T18:43:57.678Z

[tool_result] 93:export const MAX_FILE_BYTES = 256 * 1024;
158:export function scaleTimeoutForBytes(bytes, base = DEFAULT_TIMEOUT_MS) {
365:export function looksLikeNcProgram(text) {
758:export function readFileCapped(path, { root = REPO_ROOT } = {}) {
791:export async function readStdin({ stream = process.stdin, maxBytes = MAX_FILE_BYTES } = {}) {

### Assistant | 2026-06-17T18:44:00.622Z

The read-once guard says I already read the test file this session, but I don't have it in context (this is a fresh task). Let me read it explicitly.

### Assistant | 2026-06-17T18:44:01.265Z

[tool_use: Read]

### User | 2026-06-17T18:44:02.184Z

[tool_result] 0	#!/usr/bin/env node
1	// Tests for ask-hermes.mjs -- the PRISM->Hermes-proxy bridge pure functions.
2	// (HERMES-BRIDGE-MS0/U-ASK-HERMES). Pure functions only; importing the script
3	// is side-effect-free (isMain is false under the test runner, so main() never
4	// runs and no network call is made).
5	// Run: node --test scripts/ask-hermes.test.mjs
6	import { test } from "node:test";
7	import a
... [+17274 chars truncated]

### Assistant | 2026-06-17T18:44:05.147Z

I now have the full picture. Let me run the test suite to confirm green, and verify there are no other consumers of ask-hermes that the refactor could have broken.

### Assistant | 2026-06-17T18:44:06.203Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:44:07.222Z

[tool_use: Grep]

### User | 2026-06-17T18:44:12.142Z

[tool_result]   ...
# Subtest: resolveInput: a REAL read error (not 'file not found') propagates ok:false (fail loud)
ok 42 - resolveInput: a REAL read error (not 'file not found') propagates ok:false (fail loud)
  ---
  duration_ms: 0.0641
  ...
# Subtest: resolveInput: a stdin read failure surfaces ok:false (does not silently empty)
ok 43 - resolveInput: a stdin read failure surfaces ok:false (does not silent
... [+147 chars truncated]

### User | 2026-06-17T18:44:14.205Z

[tool_result] Found 11 files
scripts\ask-hermes.test.mjs
scripts\ask-hermes.mjs
scripts\hermes-control-bridge.mjs
.claude\hooks\prompt-route-inject.test.mjs
scripts\lib\feature-routing-graph.test.mjs
scripts\lib\feature-routing-graph.mjs
scripts\generate-feature-routing-graph.mjs
scripts\galaxy-knowledge-iterate.mjs
.claude\hooks\synergy-definition-inject.mjs
scripts\hermes-proxy-ensure.mjs
scripts\lib\task-sub
... [+17 chars truncated]

### Assistant | 2026-06-17T18:44:18.169Z

All 43 tests pass. Let me check the consumers — `task-substrate-router.mjs` and `hermes-control-bridge.mjs` are the integration-coupling risk. Let me verify how they invoke ask-hermes (CLI contract, not the imported helpers).

### Assistant | 2026-06-17T18:44:19.120Z

[tool_use: Grep]

### Assistant | 2026-06-17T18:44:20.349Z

[tool_use: Grep]

### User | 2026-06-17T18:44:21.509Z

[tool_result] 65-  const substrates = [
66-    {
67-      name: "ollama",
68-      when: "mechanical text/code: explain/summarize/classify/lint/docstring/diff/triage/graph-search (NOT safety-critical G-code)",
69:      how: `node scripts/ask-ollama.mjs <mode> <input> [--synth --json]; lane via routeForgePhase('${route.phase}') = ${route.lane}. Need a STRONGER managed-OAuth model (xai grok / nous) but still outs
... [+935 chars truncated]

### User | 2026-06-17T18:44:23.035Z

[tool_result] 13- * cron, mcp servers, sessions, status. It NEVER touches /api/ws or the
14- * hermes:bootstrap:reset IPC (the loop triggers), so the broken GUI is irrelevant.
15- *
16- * Spec + route map: state/shared/specs/HERMES-CONTROL-BRIDGE-SPEC-2026-06-18.md
17: * Orthogonal to ask-hermes.mjs (the :8645 INFERENCE proxy) -- this is APP CONTROL (:9119).
18- *
19- * CONTENTION (R16 gap): the bridge's backen
... [+236 chars truncated]

### Assistant | 2026-06-17T18:44:56.190Z

Consumers invoke ask-hermes purely via the CLI contract (`node scripts/ask-hermes.mjs <mode> <input> [--json]`) — no consumer imports the script's functions, so the refactor of internal helpers cannot break them. The CLI surface (modes, flags, exit codes, JSON shape) is preserved. `hermes-control-bridge.mjs` is explicitly orthogonal (:9119 app control vs :8645 inference).

Now let me trace the two subtle correctness points the brief flagged: the fallback path's stdin-write for ask mode, and whether the NC guard has a bypass.

Let me verify one concurrency/correctness detail — the fallback `effTimeout` and how `fallbackToOllama` passes the (already-capped, NC-guarded) text vs. re-reading.

I have everything needed. Let me do the final cross-checks on the specific risk areas.

**Lenient fallthrough breadth:** `readFileCapped` (ask-ollama L758-760) returns `file not found: ${path}` ONLY when `!existsSync(abs)`. All other failure modes return distinct strings: `cannot stat ${path}`, `not a file: ${path}`, `cannot read ${path}`. The regex `/file not found/i` (ask-hermes L253) matches only the non-existent-path case. A genuine read error (EACCES, a directory, a stat failure on a real file) does NOT match → propagates `ok:false` (L257). Test L347 confirms `cannot read x: EACCES` propagates. This is correctly narrow.

**One real concern on breadth:** the fallthrough means a user who genuinely intended a file path but mistyped it (or the file was deleted) gets the *path string itself* shipped to the remote model as a literal prompt, silently. That matches the documented prior CLI UX and ask-ollama is not lenient here (ask-ollama returns exit 2 on `file not found`) — so this is a *deliberate behavior divergence* from ask-ollama, not a parity bug. It is bounded (the literal is just the typed path, a few bytes; never an unintended file read; NC guard still runs on the literal). Worth noting as P2.

**NC guard bypass check:** `shouldRefuseUnsafe` gates on `FILE_MODES.has(mode)`.
... [+3669 chars truncated]
