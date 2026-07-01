---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Reviewer A (holistic) for the PRISM platform. Review commit HEAD, two NEW files:"
date: "2026-06-10"
first_ts: "2026-06-10T14:08:00.211Z"
last_ts: "2026-06-10T14:09:26.274Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-a417ab717f4027348.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Reviewer A (holistic) for the PRISM platform. Review commit HEAD, two NEW files:

> **claude-code-cli** | 2026-06-10 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-a417ab717f4027348.jsonl`

## Transcript

### User | 2026-06-10T14:08:00.211Z

Reviewer A (holistic) for the PRISM platform. Review commit HEAD, two NEW files:
- H:\prism\.claude\hooks\nav-rerank-advisory.mjs
- H:\prism\.claude\hooks\nav-rerank-advisory.test.mjs

Read BOTH end-to-end. Context: this is a PreToolUse:Bash ADVISORY hook (a deliberate near-clone of the already-approved H:\prism\.claude\hooks\large-read-digest-advisory.mjs). When Claude is about to run a `system-viz-query ... find <query>`, it injects an advisory surfacing `node scripts/ollama-nav-rerank.mjs "<query>"` (the verified re-rank shipped in commit 127234e940). It is ADVISORY ONLY — must never block the Bash command, must fail-safe (emit {continue:true}) on any error, and must never trigger on itself (the re-rank CLI) or on non-find subcommands.

Acceptance criteria:
1. No stubs/TODOs/placeholder returns.
2. Fail-safe: every error path (bad stdin, missing fields, parse throw) emits {continue:true} and never blocks dispatch. The 750ms stdin timeout is present.
3. The self-trigger guard works: a command containing `ollama-nav-rerank` is NOT advised (no infinite advisory loop).
4. It only fires on the `find` subcommand, never node-card/doc-nodes/cache-status.
5. ASCII-only source; no floating promises beyond the guarded main().then; matches the sibling's conventions (R11).
6. The advisory text is accurate about what the re-rank does (verifier = subset AND node-card resolvability; trusted fallback; zero quality risk).

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then <=5 notes. If unsure, FAIL.

### Assistant | 2026-06-10T14:08:14.881Z

I'll review both files end-to-end before forming a verdict.

### Assistant | 2026-06-10T14:08:15.951Z

[tool_use: Read]

### Assistant | 2026-06-10T14:08:16.227Z

[tool_use: Read]

### Assistant | 2026-06-10T14:08:16.535Z

[tool_use: Read]

### User | 2026-06-10T14:08:18.362Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// nav-rerank-advisory.mjs -- PreToolUse:Bash advisory hook
4	//
5	// When Claude is about to run a `system-viz-query ... find <query>` (the codebase
6	// navigation search), inject an advisory pointing at scripts/ollama-nav-rerank.mjs
7	// (commit 127234e940) -- the VERIFIED ollama re-rank of the find candidates: a
8	// local model re-ranks the hits by query 
... [+7032 chars truncated]

### User | 2026-06-10T14:08:18.512Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\large-read-digest-advisory.mjs' was already read 6m ago in this session and is unchanged (mtime 1781065083397). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### User | 2026-06-10T14:08:19.007Z

[tool_result] 1	// nav-rerank-advisory.test.mjs -- hermetic tests for the PreToolUse:Bash advisory
2	// that surfaces the verified ollama nav re-rank when a system-viz find runs.
3	// R9: assert the parsed query + advise decision concretely, never toBeDefined-style.
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import { parseFindCommand, decideNavAdvisory, HOOK_KEY } from "
... [+3914 chars truncated]

### Assistant | 2026-06-10T14:08:33.979Z

I have both files fully in context. Let me verify two load-bearing claims before forming a verdict: (1) the re-rank CLI's actual verifier semantics, to confirm the advisory text is accurate (acceptance criterion 6), and (2) the sibling hook's conventions for an R11 conformance check.

### Assistant | 2026-06-10T14:08:34.457Z

[tool_use: Bash]

### Assistant | 2026-06-10T14:08:36.186Z

[tool_use: Grep]

### User | 2026-06-10T14:08:37.777Z

[tool_result] 2:// U-VERIFIED-OFFLOAD-NAV (2026-06-10, slot:alpha): SEARCH / navigation offload --
3:// re-rank `/system-viz find` candidates with a local LLM, VERIFIED by node-card
4:// resolvability. This is the operator's #2 ollama lever (after reads):
6:// master graph." Built on the verified-offload keystone (model proposes, code
9:// THE CONTRACT: the model RE-RANKS the candidate node-ids by relevance to 
... [+4038 chars truncated]

### User | 2026-06-10T14:08:38.453Z

[tool_result] EXISTS

### Assistant | 2026-06-10T14:08:48.582Z

The re-rank CLI confirms the advisory text is accurate: the contract is verbatim — verifier accepts an id ONLY if it is (a) in the original candidate set AND (b) resolvable via node-card seek, with a trusted find-order fallback, "accuracy is the verifier's, not the model's." Let me verify the `--top-k` flag and default-K claim the advisory cites, plus confirm the sibling's structural conventions.

### Assistant | 2026-06-10T14:08:50.432Z

[tool_use: Grep]

### Assistant | 2026-06-10T14:08:52.001Z

[tool_use: Grep]

### User | 2026-06-10T14:08:52.140Z

[tool_result] 37:export const DEFAULT_TOP_K = 10;
52:export function buildRerankPrompt(query, candidates, topK = DEFAULT_TOP_K) {
169:  const topK = Number.isFinite(o.topK) && o.topK > 0 ? Math.floor(o.topK) : DEFAULT_TOP_K;
201: * number after --top-k) is never mistaken for the query.
205:  const out = { query: "", topK: DEFAULT_TOP_K, json: false };
210:    else if (a === "--top-k" || a === "--topk") {
241:  
... [+92 chars truncated]

### User | 2026-06-10T14:08:53.513Z

[tool_result] 14:// `byHook.large-read-digest-advisory.suggested` so the advisory-decay machinery
27:import { fileURLToPath } from "node:url";
31:export const DEFAULT_MIN_LINES = 600;
32:export const HOOK_KEY = "large-read-digest-advisory";
33:export const STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";
87:// ---- side-effect: bump offload-stats `byHook.<key>.suggested` (atomic, fail-sa
... [+1698 chars truncated]

### Assistant | 2026-06-10T14:09:26.274Z

All claims are now verified. The advisory cites `--top-k 10`, and the CLI confirms `DEFAULT_TOP_K = 10` with `--top-k`/`--topk` both accepted, query-position-safe parsing. The advisory text matches the CLI's own contract comment verbatim, and structural conventions match the sibling exactly.

VERDICT: PASS

BLOCKER: (none)

Notes:
1. Acceptance criteria all met. Self-trigger guard (crit 3) is correct: `/ollama-nav-rerank/.test(cmd)` short-circuits to `already-rerank` before the find match, tested at L49-53/L94-98. Subcommand isolation (crit 4) is enforced by the `\s+find\s+` anchor in the regex — `node-card`/`doc-nodes`/`cache-status` cannot match, tested at L43-47. Fail-safe (crit 2): every error path (`PRISM_..._DISABLE`, bad stdin parse L119, wrong tool_name L120, missing/non-string command L122, no-advise L125-129, fatal catch L140-144) emits `{continue:true}` and never blocks; the 750ms stdin timeout is present at L107. `bumpStats()` is fully try/catch-wrapped (L77-93) and gated on `existsSync` so a missing/corrupt stats file never throws into dispatch.
2. Crit 6 (advisory accuracy) verified against the live CLI: `scripts/ollama-nav-rerank.mjs` L9-16 states the identical contract — id accepted ONLY if (a) in candidate set AND (b) resolvable via node-card seek, trusted find-order fallback, "accuracy is the verifier's, not the model's." `DEFAULT_TOP_K=10` (L37) matches the suggested `--top-k 10`, and the CLI accepts `--top-k`/`--topk` (L210). No overclaim.
3. Crit 5 (R11 conformance): byte-for-byte structural parity with `large-read-digest-advisory.mjs` — same `HOOK_KEY`/`STATS_PATH` exports, same atomic tmp+rename stats write, same `silentSuggestions` "potential, not banked" comment, same `readStdin`/750ms timeout, same `emit`, same CLI entry guard (`fileURLToPath(import.meta.url) === process.argv[1]`) with the guarded `.then().catch()`. No floating promises: `main()` is only invoked inside the guard, and the import path executes nothing. ASCII-only except the i
... [+1249 chars truncated]
