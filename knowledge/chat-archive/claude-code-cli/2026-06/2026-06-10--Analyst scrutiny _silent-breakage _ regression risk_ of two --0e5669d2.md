---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Analyst scrutiny (silent-breakage + regression risk) of two PRISM commits applyi"
date: "2026-06-10"
first_ts: "2026-06-10T17:23:27.839Z"
last_ts: "2026-06-10T17:27:50.461Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 16
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a89e97b55ebf2d004.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Analyst scrutiny (silent-breakage + regression risk) of two PRISM commits applyi

> **claude-code-cli** | 2026-06-10 | 38 msgs (16 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a89e97b55ebf2d004.jsonl`

## Transcript

### User | 2026-06-10T17:23:27.839Z

Analyst scrutiny (silent-breakage + regression risk) of two PRISM commits applying an advisory-decay gate to three PreToolUse hooks: `8f373e9e43` (grep-index-first) + `7c184bc97c` (wiki-read-offload-advisory + nav-rerank-advisory). Read end-to-end:
- `H:/prism/.claude/hooks/grep-index-first.mjs`
- `H:/prism/.claude/hooks/wiki-read-offload-advisory.mjs`
- `H:/prism/.claude/hooks/nav-rerank-advisory.mjs`

Focus: (1) REGRESSION — these hooks are insufficient-data today (decay returns fire:true = no-op), so behavior should be UNCHANGED until each accumulates ≥50 injections. Confirm the wire introduces NO behavior change for the current (insufficient-data) state — i.e. they still fire their advisory exactly as before. A regression that silently mutes a useful advisory NOW (before it earned the noise label) would be the failure. (2) Import path `../../scripts/lib/advisory-decay.mjs` correct from `.claude/hooks/` in all 3? (3) PreToolUse hot-path: an extra stats-file read per fire — bounded? (4) grep-index-first: is the muted-branch `return` placed so it skips writePending (no false conversion)? (5) Every exit path emits continue:true (no hook can block its tool)? (6) Any c-to-h mirror concern (hooks edited on H:)? Run `node --test H:/prism/.claude/hooks/grep-index-first.test.mjs` + `nav-rerank-advisory.test.mjs` to confirm green.

Return **PASS** or **FAIL** with P0/P1 findings. Be concise.

### Assistant | 2026-06-10T17:23:35.673Z

I'll perform an analyst scrutiny review of these two commits. Let me read the three hooks end-to-end, the shared decay library, and the test files in parallel.

### Assistant | 2026-06-10T17:23:36.359Z

[tool_use: Read]

### Assistant | 2026-06-10T17:23:36.644Z

[tool_use: Read]

### Assistant | 2026-06-10T17:23:37.568Z

[tool_use: Read]

### Assistant | 2026-06-10T17:23:37.573Z

[tool_use: Read]

### User | 2026-06-10T17:23:43.278Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\grep-index-first.mjs' was already read 15s ago in this session and is unchanged (mtime 1781110296061). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T17:23:43.373Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\wiki-read-offload-advisory.mjs' was already read 14s ago in this session and is unchanged (mtime 1781111255151). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-10T17:23:47.402Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\nav-rerank-advisory.mjs' was already read 16s ago in this session and is unchanged (mtime 1781111355448). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T17:23:47.441Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\advisory-decay.mjs' was already read 4s ago in this session and is unchanged (mtime 1781038740506). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-10T17:23:54.673Z

The read-once guard says these files are already in my context, but I don't actually have their content from this session start — the guard is tracking reads that happened in a prior context window. Let me disable the cache to get the actual content.

### Assistant | 2026-06-10T17:23:55.455Z

[tool_use: Bash]

### User | 2026-06-10T17:24:06.663Z

[tool_result] #!/usr/bin/env node
// tier: T1
/**
 * grep-index-first.mjs - PreToolUse Grep
 * Suggests checking MASTER_INDEX before expensive grep searches.
 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
 * Falls back to regex-based suggestions when Ollama unavailable.
 *
 * Token savings: 50-80% on known patterns.
 *
 * PSN-SYNERGIZE/U-GREP-GRAPH-WIRE (2026-05-23, slot:si
... [+19406 chars truncated]

### Assistant | 2026-06-10T17:24:14.125Z

Now let me read the other two hooks and the decay library with cache disabled.

### Assistant | 2026-06-10T17:24:14.354Z

[tool_use: Bash]

### Assistant | 2026-06-10T17:24:15.442Z

[tool_use: Bash]

### Assistant | 2026-06-10T17:24:15.751Z

[tool_use: Bash]

### User | 2026-06-10T17:24:27.124Z

[tool_result] #!/usr/bin/env node
// tier: T3
// wiki-read-offload-advisory.mjs — PreToolUse:Read advisory hook
//
// When Claude is about to Read a large wiki entry (>500 lines by default),
// inject an advisory pointing at /route-to-obsidian — a slash that delegates
// to scripts/ask-ollama.mjs summarize so the 5-50KB wiki body is processed in
// a local Ollama subprocess instead of streaming into Claude's co
... [+9606 chars truncated]

### User | 2026-06-10T17:24:41.063Z

[tool_result] #!/usr/bin/env node
// tier: T3
// nav-rerank-advisory.mjs -- PreToolUse:Bash advisory hook
//
// When Claude is about to run a `system-viz-query ... find <query>` (the codebase
// navigation search), inject an advisory pointing at scripts/ollama-nav-rerank.mjs
// (commit 127234e940) -- the VERIFIED ollama re-rank of the find candidates: a
// local model re-ranks the hits by query relevance and a 
... [+9157 chars truncated]

### User | 2026-06-10T17:24:54.690Z

[tool_result] // scripts/lib/advisory-decay.mjs
// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the missing ACTUATOR on advisory
// take-rate. mcp-route-takeup / ollama-offload-stats MEASURE per-hook conversion
// but nothing ACTS on it -- so a proven-zero-conversion advisory keeps spending
// context tokens on a nudge nobody takes. This gates that, fleet-wide.
//
// THE METRIC (R8-corrected 2026-06-09 -- a fabri
... [+8032 chars truncated]

### Assistant | 2026-06-10T17:24:59.206Z

Now I have all three hooks and the decay library. Let me verify the import path resolution and run the two test files to confirm green.

### Assistant | 2026-06-10T17:25:01.675Z

[tool_use: Bash]

### Assistant | 2026-06-10T17:25:01.683Z

[tool_use: Bash]

### Assistant | 2026-06-10T17:25:01.686Z

[tool_use: Bash]

### User | 2026-06-10T17:25:13.681Z

[tool_result] RESOLVES: ../../scripts/lib/advisory-decay.mjs from .claude/hooks/ -> H:/prism/scripts/lib/advisory-decay.mjs EXISTS

### User | 2026-06-10T17:25:28.749Z

[tool_result]   ...
# Subtest: recordTelemetry handles missing byHook field in existing stats
ok 16 - recordTelemetry handles missing byHook field in existing stats
  ---
  duration_ms: 1.2036
  ...
# Subtest: decay-gate: PROVEN-NOISE (>=50 injections, off-probe) MUTES the grep advisory
ok 17 - decay-gate: PROVEN-NOISE (>=50 injections, off-probe) MUTES the grep advisory
  ---
  duration_ms: 418.7201
  ...
# Su
... [+307 chars truncated]

### User | 2026-06-10T17:25:40.532Z

[tool_result]   ...
# Subtest: HOOK_KEY is the offload-stats key
ok 21 - HOOK_KEY is the offload-stats key
  ---
  duration_ms: 0.0256
  ...
# Subtest: decay-gate: PROVEN-NOISE (>=50 injections, off-probe) MUTES the nav advisory
ok 22 - decay-gate: PROVEN-NOISE (>=50 injections, off-probe) MUTES the nav advisory
  ---
  duration_ms: 57.0187
  ...
# Subtest: decay-gate: INSUFFICIENT telemetry (<50) still FIRES (
... [+223 chars truncated]

### Assistant | 2026-06-10T17:25:47.315Z

Both test suites green (18/18 + 23/23), with decay-gate specific tests. Let me verify the wiki hook has a matching test and check the critical regression concern: what the LIVE stats file actually shows for these three hooks today (to confirm they are insufficient-data / unmeasurable = no-op).

### Assistant | 2026-06-10T17:25:49.571Z

[tool_use: Bash]

### Assistant | 2026-06-10T17:25:50.800Z

[tool_use: Bash]

### User | 2026-06-10T17:26:03.167Z

[tool_result] grep-index-first | slot: {"fired":1706,"suggested":306,"offloaded":3} | classify: noise | decay.fire: false | decay.status: noise
wiki-read-offload-advisory | slot: undefined | classify: unmeasurable | decay.fire: true | decay.status: no-telemetry
nav-rerank-advisory | slot: {"fired":4,"offloaded":0,"kept":0,"suggested":4,"tokensSaved":0} | classify: insufficient | decay.fire: true | decay.status:
... [+13 chars truncated]

### User | 2026-06-10T17:26:11.791Z

[tool_result] # tests 20
# suites 0
# pass 20
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 117.6359

### Assistant | 2026-06-10T17:26:27.253Z

This is the key finding. The prompt's premise — "these hooks are insufficient-data today (decay returns fire:true = no-op), so behavior should be UNCHANGED until each accumulates ≥50 injections" — does **not hold for grep-index-first**. The live stats show it has already crossed the threshold and is classified `noise`, so `decay.fire: false` **right now**.

Let me confirm this is correct behavior (it has a real taken-signal) and verify the muted-branch `return` placement re: writePending, then check the off-probe count and c-to-h mirror concern.

### Assistant | 2026-06-10T17:26:30.529Z

[tool_use: Bash]

### Assistant | 2026-06-10T17:26:33.151Z

[tool_use: Bash]

### User | 2026-06-10T17:26:44.509Z

[tool_result] grep classify: {"injected":306,"taken":3,"takeRate":0.00980392156862745,"hasTakenSignal":true,"status":"noise"}
takeRate 3/306 = 0.98%  (< 5% maxTakeRate -> noise)
probe: injected 306 % 20 = 6 -> probe fires only when ==0; 306%20=6 => off-probe => MUTED

### User | 2026-06-10T17:27:00.293Z

[tool_result] 8f373e9e43 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-GREP-INDEX-DECAY-WIRE (slot:sierra): R15 apply-to-all clone -- wire advisory-decay into grep-index-first (2nd proven-noise advisory)
54b1f40d1e [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL-FORGE-ROADMAP]/U-HOTEL-WRITE-REVIEW-SPEC-UPDATE (slot:hotel): mark ALLOWLIST-WRITE-ENABLE shipped in the review spec (no doc-drift)
a8b16a99c1 [MAIN] [TOKE
... [+224 chars truncated]

### Assistant | 2026-06-10T17:27:50.461Z

I now have everything needed. The prompt's premise that grep-index-first is "insufficient-data today" is factually wrong — it has a real taken-signal (`grep-index-taken-correlator` bumps `offloaded`) and is **already proven noise** (3/306 = 0.98%, currently off-probe → MUTED right now). This is the **intended behavior** of this commit, not a regression — but it contradicts the scrutiny prompt's framing, so I'll surface it precisely. Let me verify the muted-branch `return` placement claim (point 4) and confirm all exit paths emit continue:true.

The muted-branch in grep-index-first is at lines after `recordTelemetry({ suggested: true })` and the `decay` check returns `{ continue: true }` BEFORE the `writePending` block — confirmed by reading the source: the `if (!decay.fire) { console.log(...continue:true); return; }` sits between the `recordTelemetry({suggested:true})` call and the `try { ...writePending... }` block. So when muted, `writePending` is skipped. Correct.

Here is my analyst scrutiny verdict.

## VERDICT: PASS

Both commits are correctly engineered, fail-safe, and tested (grep 18/18, nav 23/23, wiki 20/20 — all green). The decay wire is a faithful clone of the proven `large-read-digest` / `ollama-route-pretooluse` pattern. No P0/P1 findings. One P2 doc-accuracy correction and minor notes below.

### Point-by-point on the scrutiny axes

**(1) REGRESSION — behavior unchanged for current state?** Confirmed for **2 of 3** hooks, with one important correction to the prompt's premise:
- `wiki-read-offload-advisory`: live slot is `undefined` → `decay.status: no-telemetry` → `fire:true`. No-op. Advisory still fires exactly as before. PASS.
- `nav-rerank-advisory`: live slot `{suggested:4, offloaded:0}` → `insufficient` (4 < 50) → `fire:true`. No-op. PASS.
- `grep-index-first`: **NOT insufficient-data.** Live slot is `{fired:1706, suggested:306, offloaded:3}` → classify `noise` (3/306 = 0.98% < 5%), and `306 % 20 = 6` (off-probe) → **`decay.fire:false`, MUTED rig
... [+4576 chars truncated]
