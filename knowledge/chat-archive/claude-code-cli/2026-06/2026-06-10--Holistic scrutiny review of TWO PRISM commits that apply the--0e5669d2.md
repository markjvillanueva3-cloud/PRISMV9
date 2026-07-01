---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Holistic scrutiny review of TWO PRISM commits that apply the same advisory-decay"
date: "2026-06-10"
first_ts: "2026-06-10T17:23:14.955Z"
last_ts: "2026-06-10T17:24:58.267Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-acb53e5df8932a38c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Holistic scrutiny review of TWO PRISM commits that apply the same advisory-decay

> **claude-code-cli** | 2026-06-10 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-acb53e5df8932a38c.jsonl`

## Transcript

### User | 2026-06-10T17:23:14.955Z

Holistic scrutiny review of TWO PRISM commits that apply the same advisory-decay gate to three hooks (R15 apply-to-all). Commits: `8f373e9e43` (grep-index-first) + `7c184bc97c` (wiki-read-offload-advisory + nav-rerank-advisory). The pattern was already 3-of-3 PASSED in `05906647ad` (large-read-digest); these are clones. Read these files end-to-end:
- `H:/prism/.claude/hooks/grep-index-first.mjs`
- `H:/prism/.claude/hooks/wiki-read-offload-advisory.mjs`
- `H:/prism/.claude/hooks/nav-rerank-advisory.mjs`
- `H:/prism/.claude/hooks/nav-rerank-advisory.test.mjs`

The gate: after the hook bumps its `suggested` telemetry, it calls `decayDecision(HOOK_KEY, {statsPath: STATS_PATH})`; if `!decay.fire` it suppresses the advisory (emit `{continue:true}` with no additionalContext). STATS_PATH was made env-overridable in each (PRISM_GREP_INDEX_STATS_PATH / PRISM_WIKI_OFFLOAD_STATS_PATH / PRISM_NAV_RERANK_STATS_PATH) so the decay read uses the same path the hook writes (read==write).

Clone-specific things to verify: (1) every code path still emits `continue:true` (these are PreToolUse hooks — must never block the tool); (2) the gate fails SAFE (decayDecision returns fire:true on unreadable/insufficient/no-telemetry); (3) **grep-index-first specifically**: when muted it must ALSO skip `writePending` (the pending marker → correlator → offloaded conversion) — otherwise a coincidental later Read would be falsely counted a conversion. Confirm the muted branch returns BEFORE writePending. (4) the STATS_PATH threading in grep-index-first reaches all recordTelemetry call sites (read==write). Run the tests if useful: `node --test H:/prism/.claude/hooks/grep-index-first.test.mjs` and `nav-rerank-advisory.test.mjs`.

Return **PASS** or **FAIL** with any P0/P1 findings. Be concise.

### Assistant | 2026-06-10T17:23:25.265Z

I'll review these two clone commits applying the advisory-decay gate. Let me read the files end-to-end and verify the decay primitive they depend on.

### Assistant | 2026-06-10T17:23:25.491Z

[tool_use: Read]

### Assistant | 2026-06-10T17:23:26.525Z

[tool_use: Read]

### Assistant | 2026-06-10T17:23:26.825Z

[tool_use: Read]

### Assistant | 2026-06-10T17:23:27.041Z

[tool_use: Read]

### User | 2026-06-10T17:23:27.996Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * grep-index-first.mjs - PreToolUse Grep
5	 * Suggests checking MASTER_INDEX before expensive grep searches.
6	 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
7	 * Falls back to regex-based suggestions when Ollama unavailable.
8	 *
9	 * Token savings: 50-80% on known patterns.
10	 *
11	 * PSN-SYNERGIZE/U-GREP-GRAPH-WIRE (2026-
... [+20651 chars truncated]

### User | 2026-06-10T17:23:28.691Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// wiki-read-offload-advisory.mjs — PreToolUse:Read advisory hook
4	//
5	// When Claude is about to Read a large wiki entry (>500 lines by default),
6	// inject an advisory pointing at /route-to-obsidian — a slash that delegates
7	// to scripts/ask-ollama.mjs summarize so the 5-50KB wiki body is processed in
8	// a local Ollama subprocess instead of streaming 
... [+10375 chars truncated]

### User | 2026-06-10T17:23:28.921Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// nav-rerank-advisory.mjs -- PreToolUse:Bash advisory hook
4	//
5	// When Claude is about to run a `system-viz-query ... find <query>` (the codebase
6	// navigation search), inject an advisory pointing at scripts/ollama-nav-rerank.mjs
7	// (commit 127234e940) -- the VERIFIED ollama re-rank of the find candidates: a
8	// local model re-ranks the hits by query 
... [+9778 chars truncated]

### User | 2026-06-10T17:23:29.091Z

[tool_result] 1	// nav-rerank-advisory.test.mjs -- hermetic tests for the PreToolUse:Bash advisory
2	// that surfaces the verified ollama nav re-rank when a system-viz find runs.
3	// R9: assert the parsed query + advise decision concretely, never toBeDefined-style.
4	
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import { parseFindCommand, decideNavAdvisory, HOOK_KEY } from "
... [+8009 chars truncated]

### Assistant | 2026-06-10T17:23:35.726Z

Now let me verify the decay primitive these three hooks depend on, and run the tests.

### Assistant | 2026-06-10T17:23:36.170Z

[tool_use: Read]

### Assistant | 2026-06-10T17:23:37.403Z

[tool_use: Bash]

### User | 2026-06-10T17:23:47.616Z

[tool_result] 1	// scripts/lib/advisory-decay.mjs
2	// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the missing ACTUATOR on advisory
3	// take-rate. mcp-route-takeup / ollama-offload-stats MEASURE per-hook conversion
4	// but nothing ACTS on it -- so a proven-zero-conversion advisory keeps spending
5	// context tokens on a nudge nobody takes. This gates that, fleet-wide.
6	//
7	// THE METRIC (R8-corrected 2026-06
... [+8673 chars truncated]

### User | 2026-06-10T17:24:01.567Z

[tool_result]   ...
# Subtest: decideAdvisory: floors minLines at 50 (sub-50 thresholds become 50)
ok 56 - decideAdvisory: floors minLines at 50 (sub-50 thresholds become 50)
  ---
  duration_ms: 0.0661
  ...
# Subtest: decideAdvisory: uses DEFAULT_MIN_LINES when minLines is non-finite
ok 57 - decideAdvisory: uses DEFAULT_MIN_LINES when minLines is non-finite
  ---
  duration_ms: 0.1298
  ...
# Subtest: decideA
... [+730 chars truncated]

### Assistant | 2026-06-10T17:24:05.433Z

The combined run reported only the tail (wiki suite, 61 pass). Let me confirm all three suites passed individually so no suite was silently skipped.

### Assistant | 2026-06-10T17:24:06.576Z

[tool_use: Bash]

### User | 2026-06-10T17:24:25.006Z

[tool_result] === grep-index-first ===
# tests 18
# pass 18
# fail 0
=== wiki-read-offload-advisory ===
# tests 20
# pass 20
# fail 0
=== nav-rerank-advisory ===
# tests 23
# pass 23
# fail 0

### Assistant | 2026-06-10T17:24:58.267Z

All three suites green (18 + 20 + 23 = 61). I now have everything needed to verify the four clone-specific concerns plus the global gate behavior.

## Verdict: PASS

Both commits (`8f373e9e43` + `7c184bc97c`) are correct, faithful clones of the already-3-of-3-PASSED `large-read-digest` pattern. The decay primitive (`advisory-decay.mjs`) fails safe by construction, and all four clone-specific concerns hold.

### Verification against the four required checks

**(1) Every code path emits `continue:true` (never blocks the tool).** Confirmed across all three.
- `grep-index-first.mjs`: every `console.log` carries `continue:true` (lines 62, 388, 401, 430, 442); the top-level catch (446-448) emits `continue:true`; muted branch (430) and pending-write try/catch (438-441) never throw out.
- `wiki-read-offload-advisory.mjs`: every `emit` is `{continue:true}` (disable 145, parse-fail 153, all guard returns 154-184, muted 197, advise 201); fatal catch (213-217) emits `continue:true` and exits 0.
- `nav-rerank-advisory.mjs`: same — every `emit` is `{continue:true}` (138, 143-146, 150, 163, 170); fatal catch (176-180) emits `continue:true` exit 0. None of the three ever returns `decision:"block"` or a non-zero "deny" shape.

**(2) Gate fails SAFE.** Verified in `decayDecision`: `disabled`→fire (143), `no-stats` unreadable→fire (148), `no-telemetry` missing hook slot→fire (152), and `classify` returns fire for `healthy`/`insufficient`/`unmeasurable` (155-157). Only a confirmed `noise` classification (≥50 injections AND <5% conversion) mutes, and even then the 1-in-20 probe fires (160-167). The `nav` test directly proves both directions: 52-injection off-probe slot mutes (test 166-174), 5-injection slot still fires (176-184).

**(3) grep-index-first muted branch skips `writePending` (no false conversion).** Confirmed — this is the critical clone-specific divergence and it is correct. The decay gate (428-432) returns **before** the `writePending` block (434-441). When muted, no pendi
... [+2866 chars truncated]
