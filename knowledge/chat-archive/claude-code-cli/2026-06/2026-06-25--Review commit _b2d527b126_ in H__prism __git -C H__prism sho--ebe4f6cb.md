---
type: "chat-session"
source: "claude-code-cli"
session_id: "ebe4f6cb-0d7e-440f-a982-8837c4bdce93"
title: "Review commit `b2d527b126` in H:/prism (`git -C H:/prism show b2d527b126`). File"
date: "2026-06-25"
first_ts: "2026-06-25T16:49:38.677Z"
last_ts: "2026-06-25T16:52:08.292Z"
cwd: "H:\\prism"
messages: 49
user_msgs: 19
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a40993ca224f8ed50.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review commit `b2d527b126` in H:/prism (`git -C H:/prism show b2d527b126`). File

> **claude-code-cli** | 2026-06-25 | 49 msgs (19 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a40993ca224f8ed50.jsonl`

## Transcript

### User | 2026-06-25T16:49:38.677Z

Review commit `b2d527b126` in H:/prism (`git -C H:/prism show b2d527b126`). Files: `scripts/ollama-capability-probe.mjs` (new `excludeNoSignalModels` guard + wired into write path), `scripts/ollama-capability-probe.test.mjs` (6 new tests), `state/shared/ollama-capability-matrix.json` (re-filtered: 9 models -> 3).

CONTEXT: The prior commit's 9-model capability-probe run stored 6 big models at rate:0 on every task -- FALSE-0 from generation-failure (cold-load timeout under VRAM contention) or reasoners (<think> chains break exact-match). `excludeNoSignalModels(matrix, models)` drops any model that is rate-0 on EVERY measured task (anyMeasured && !anyPositive), recording it ABSENT instead of a misleading "measured incapable" 0. The committed matrix was re-filtered down to the 3 positive-signal models (1.5b/7b/14b).

REVIEW HOLISTICALLY:
- Is `excludeNoSignalModels` correct? Specifically: does it correctly DISTINGUISH (a) rate-0-with-total>0 (real fail -> exclude if ALL such) from (b) total:0 (never ran -> NOT a no-signal, must keep)? Read the anyMeasured/anyPositive logic.
- Is the outage clobber-guard still correct? It must run on the RAW (pre-exclusion) matrix so a TOTAL outage (all models all-0) is still caught and refuses the write -- verify the ordering in main() (allZero computed on rawMatrix BEFORE exclusion).
- Is it pure (no mutation of input)? Returns a new matrix?
- Is re-filtering the live matrix to 3 models SAFE? The big models CAN do mechanical (the separate stress-frontier proved qwen3-coder:30b=27/36) -- is dropping them from the capability matrix routing-neutral (the cheap ladder is always cheaper-preferred) and honest?
- R12: does the commit message honestly describe what happened (6/9 false-0)?
Read the changed files end-to-end. Run `node --test scripts/ollama-capability-probe.test.mjs` (expect 12/12). Grade PASS or FAIL with P0/P1/P2 + file:line.

### Assistant | 2026-06-25T16:49:41.846Z

I'll review commit `b2d527b126` holistically. Let me start by examining the commit and reading the changed files end to end.

### Assistant | 2026-06-25T16:49:42.787Z

[tool_use: Bash]

### Assistant | 2026-06-25T16:49:43.247Z

[tool_use: Bash]

### User | 2026-06-25T16:49:46.579Z

[tool_result] commit b2d527b1266c3b69abfc1db9b8bb060903be81ff
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 11:48:53 2026 -0500

    [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO (slot:alpha): close the 3-of-3 P2 (reviewer C) on 69b31cbfbf -- the capability-probe wrote FALSE-0 for generation-failed models. New excludeNoSignalModels guard: a model scoring rate-
... [+1691 chars truncated]

### User | 2026-06-25T16:49:47.376Z

[tool_result] commit b2d527b1266c3b69abfc1db9b8bb060903be81ff
Author:     markjvillanueva3-cloud <markjvillanueva3@gmail.com>
AuthorDate: Thu Jun 25 11:48:53 2026 -0500
Commit:     markjvillanueva3-cloud <markjvillanueva3@gmail.com>
CommitDate: Thu Jun 25 11:48:53 2026 -0500

    [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO (slot:alpha): close the 3-of-3 P2 (reviewer C) on 69b31cbfbf -- the 
... [+1556 chars truncated]

### Assistant | 2026-06-25T16:49:50.297Z

Let me read the changed files end to end.

### Assistant | 2026-06-25T16:49:51.052Z

[tool_use: Read]

### Assistant | 2026-06-25T16:49:51.103Z

[tool_use: Read]

### User | 2026-06-25T16:49:52.580Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-capability-probe.mjs -- LIVE runner that measures each Ollama model's TRUE per-task success
4	 * rate via code verifiers (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11). Answers the operator's
5	 * "test it to see what else it can do so we can fine-tune systems further" with DATA, not vibes:
6	 * which (task, model) pairs are auto-offload-safe (~100%), so we mov
... [+12656 chars truncated]

### User | 2026-06-25T16:49:52.918Z

[tool_result] 1	// Tests for ollama-capability-probe.mjs wedge-safety orchestration
2	// (U-ALPHA-OLLAMA-ROSTER-SYNC, slot:alpha 2026-06-25).
3	//
4	// The probe runs MODEL-OUTER: probe one model's whole battery, then UNLOAD it
5	// before the next, so big models (32b/30b/120b) never co-reside and thrash >96GB
6	// VRAM -- the measured wedge in reference_ollama_stress_capability_2026_06_24.
7	// These tests pin
... [+7706 chars truncated]

### Assistant | 2026-06-25T16:49:56.082Z

Now let me look at the matrix file and the supporting battery lib to verify the scoreMatrix/autoOffloadCandidates contracts the code depends on.

### Assistant | 2026-06-25T16:49:57.036Z

[tool_use: Read]

### Assistant | 2026-06-25T16:49:57.072Z

[tool_use: Read]

### User | 2026-06-25T16:49:58.644Z

[tool_result] 1	{
2	  "generatedAt": "2026-06-25T15:39:03.998Z",
3	  "models": [
4	    "qwen2.5-coder:1.5b",
5	    "qwen2.5-coder:7b",
6	    "qwen2.5-coder:14b"
7	  ],
8	  "matrix": {
9	    "classify-enum": {
10	      "category": "classification",
11	      "models": {
12	        "qwen2.5-coder:1.5b": {
13	          "pass": 2,
14	          "total": 3,
15	          "rate": 0.67
16	        },
17	        "qwen2.5-c
... [+9538 chars truncated]

### User | 2026-06-25T16:49:58.784Z

[tool_result] 1	/**
2	 * ollama-capability-battery.mjs -- pure: a battery of VERIFIABLE task-types + code verifiers that
3	 * measure an Ollama model's TRUE success rate per task (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11).
4	 *
5	 * THE GOAL (operator 2026-06-11, "fable 5 demolished session limits"): only AUTO-OFFLOAD a task to
6	 * a local model when we KNOW it succeeds ~100% -- and we know that only by MEASU
... [+7805 chars truncated]

### Assistant | 2026-06-25T16:50:01.346Z

I have read all the relevant code. Now let me run the test suite and check the routing consumer to verify the "routing-neutral" claim.

### Assistant | 2026-06-25T16:50:02.645Z

[tool_use: Bash]

### Assistant | 2026-06-25T16:50:03.231Z

[tool_use: Glob]

### Assistant | 2026-06-25T16:50:04.106Z

[tool_use: Grep]

### User | 2026-06-25T16:50:07.395Z

[tool_result]   ...
# Subtest: excludeNoSignalModels is pure -- it never mutates the input matrix
ok 10 - excludeNoSignalModels is pure -- it never mutates the input matrix
  ---
  duration_ms: 0.2799
  ...
# Subtest: excludeNoSignalModels: no exclusions -> returns the inputs unchanged (fast path)
ok 11 - excludeNoSignalModels: no exclusions -> returns the inputs unchanged (fast path)
  ---
  duration_ms: 0.180
... [+297 chars truncated]

### User | 2026-06-25T16:50:09.682Z

[tool_result] Found 2 files
scripts\ollama-capability-probe.mjs
.claude\hooks\model-tier-advisor.mjs

### User | 2026-06-25T16:50:18.646Z

[tool_result] No files found

### Assistant | 2026-06-25T16:50:22.191Z

12/12 tests pass. The commit message references `ollama-cost-router.mjs TIER_PREFERENCES` but the glob found no such file. Let me verify the routing consumer claim — does anything actually consume `ollama-capability-matrix.json` for routing decisions, and would dropping the big models change routing?

### Assistant | 2026-06-25T16:50:24.081Z

[tool_use: Grep]

### Assistant | 2026-06-25T16:50:24.433Z

[tool_use: Grep]

### User | 2026-06-25T16:50:27.713Z

[tool_result] .claude\hooks\__tests__\ollama-cost-router.test.mjs:30:  TIER_PREFERENCES,
.claude\hooks\__tests__\ollama-cost-router.test.mjs:183:test("TIER_PREFERENCES has exactly the four tiers, each frozen non-empty string array", () => {
.claude\hooks\__tests__\ollama-cost-router.test.mjs:184:  assert.equal(Object.isFrozen(TIER_PREFERENCES), true);
.claude\hooks\__tests__\ollama-cost-router.test.mjs:185:  as
... [+4718 chars truncated]

### User | 2026-06-25T16:50:32.012Z

[tool_result] Found 20 files limit: 20
state\shared\dashboards\injection-dedup-cache.json
mcp-server\data\state\session-file-ownership.json
scripts\ollama-capability-probe.mjs
mcp-server\data\state\SCRUTINY_LEDGER.json
knowledge\memories\reference\reference_u_flor_claude_tier_2026_06_11.md
knowledge\memories\reference\reference_system_synergy_loop_golf_2026_06_08.md
knowledge\memories\reference\reference_sessio
... [+1082 chars truncated]

### Assistant | 2026-06-25T16:50:36.846Z

Now let me verify how `model-tier-advisor.mjs` consumes the matrix (the actual routing consumer), and check `ollama-cost-router.mjs` to confirm the cheap ladder is always cheaper-preferred and doesn't read the excluded-models field.

### Assistant | 2026-06-25T16:50:37.318Z

[tool_use: Read]

### User | 2026-06-25T16:50:38.568Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\model-tier-advisor.mjs' was already read 12s ago in this session and is unchanged (mtime 1782175989184). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T16:50:41.875Z

The read-once guard says I have it in context, but I haven't actually seen its body — it was only matched by Grep. Let me read it with explicit scope to bypass the guard.

### Assistant | 2026-06-25T16:50:42.382Z

[tool_use: Read]

### User | 2026-06-25T16:50:43.867Z

[tool_result] 1	// tier: T2
2	/**
3	 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
4	 *
5	 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
6	 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
7	 * sonnet/haiku for capable tasks. The main-loop model CANNOT be 
... [+5342 chars truncated]

### Assistant | 2026-06-25T16:50:51.817Z

The routing consumer is `model-tier-advisor.mjs` → `routePrompt({ prompt, matrix })`. Let me read `model-routing-policy.mjs` to verify the critical claim: that dropping the big models from the matrix is routing-neutral, and confirm the policy never depends on the excluded models being present at rate-0 (i.e., absence behaves the same as a 0).

### Assistant | 2026-06-25T16:50:51.929Z

[tool_use: Read]

### User | 2026-06-25T16:50:52.798Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\model-routing-policy.mjs' was already read 26s ago in this session and is unchanged (mtime 1782399488150). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T16:50:55.328Z

The guard claims it's in context, but it isn't — I haven't read it. Let me read it with explicit offset to bypass the false guard.

### Assistant | 2026-06-25T16:50:55.943Z

[tool_use: Read]

### User | 2026-06-25T16:50:57.111Z

[tool_result] 1	/**
2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
4	 * 2026-06-11). This is the brain the advisor hook calls.
5	 *
6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
7	 *   - ollama  : mechanical ta
... [+12285 chars truncated]

### Assistant | 2026-06-25T16:51:03.504Z

This confirms the routing-neutrality claim conclusively. Let me verify the critical detail in `ollamaSafeClassModels`: it selects the **cheapest** model that clears 100% on every class task. The three kept models (1.5b/7b/14b) are all cheaper than every excluded model (32b/30b/20b/120b). The selection logic is `rank < bestRank` over only the matrix-present models. So removing the big models — which scored rate-0 and therefore `clearsAll` would already be `false` for them — changes nothing. They were never selectable. This is exactly routing-neutral.

Let me confirm there's no other consumer that would read the excluded big models' rate-0 as a negative signal (e.g., a "this model can't do X" blocklist), and double-check the outage-guard ordering edge case in `main()`.

### Assistant | 2026-06-25T16:51:04.918Z

[tool_use: Grep]

### Assistant | 2026-06-25T16:51:06.099Z

[tool_use: Bash]

### User | 2026-06-25T16:51:07.093Z

[tool_result] No matches found

### User | 2026-06-25T16:51:12.836Z

[tool_result] commit b2d527b1266c3b69abfc1db9b8bb060903be81ff
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 11:48:53 2026 -0500

    [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO (slot:alpha): close the 3-of-3 P2 (reviewer C) on 69b31cbfbf -- the capability-probe wrote FALSE-0 for generation-failed models. New excludeNoSignalModels guard: a model scoring rate-
... [+2092 chars truncated]

### Assistant | 2026-06-25T16:51:19.739Z

Confirmed. The policy consumer (`ollamaSafeClassModels`) never reads `excludedNoSignal` and never treats a rate-0 as a negative/blocklist signal — it only ever positively selects models that clear 100%. Absence of a rate-0 big model and presence of a rate-0 big model are therefore identical from the routing perspective. The cheapest-of-qualifiers selection over {1.5b, 7b, 14b} is unchanged. The claim "routing-neutral" is verified, not asserted.

Now let me trace the `excludeNoSignalModels` logic precisely against the four edge cases, and confirm the outage-guard ordering one more time by reasoning through `main()`.

Let me also verify the diff for the `.mjs` itself (the wiring + new function) to make sure I'm reviewing exactly what landed, and there are no surprises outside what I read in the current file.

### Assistant | 2026-06-25T16:51:20.822Z

[tool_use: Bash]

### User | 2026-06-25T16:51:25.508Z

[tool_result] --- a/scripts/ollama-capability-probe.mjs
+++ b/scripts/ollama-capability-probe.mjs
@@ -123,6 +123,41 @@ export async function runProbe({ models, callFn = callOllama, battery = TASK_BAT
   return results;
 }
 
+/**
+ * Drop NO-SIGNAL models from a scored matrix before it is written (U-ALPHA-OLLAMA-STRESS-FRONTIER
+ * follow-up, slot:alpha 2026-06-25). A model that scored rate 0 on EVERY measured t
... [+4396 chars truncated]

### Assistant | 2026-06-25T16:52:08.292Z

I now have the complete picture. Let me reason through each review axis carefully.

## Analysis

**1. `excludeNoSignalModels` correctness — distinguishing real-fail from never-ran**

The inner loop (`ollama-capability-probe.mjs:144-151`):
```
anyMeasured=false, anyPositive=false
for each task t:
  s = t.models[m]
  if (s && s.total > 0) { anyMeasured=true; if (s.rate>0) { anyPositive=true; break } }
exclude iff (anyMeasured && !anyPositive)
```

- **(a) rate-0 with total>0** (real fail): `s.total>0` → `anyMeasured=true`; `s.rate>0` false → `anyPositive` stays false. If ALL such → `anyMeasured && !anyPositive` → excluded. Correct.
- **(b) total:0** (never ran): the `s.total > 0` guard is false, so neither flag flips. A model whose ONLY cells are total:0 has `anyMeasured=false` → not excluded. Correct, and pinned by the test at `:132-138` (verified live: 12/12 pass).
- A model with mixed total:0 + total>0-rate-0 cells: only the measured cells set `anyMeasured`; if every measured cell is rate-0 it excludes — correct (it WAS measured and failed everywhere).
- A model with one rate>0 cell: `anyPositive=true`, `break` → kept, with its real 0s preserved (`:123-130` test). Correct.

The exclusion is **conjunctive over the whole population**: a model is dropped only if it is no-signal on every task. This matches the "anyMeasured && !anyPositive" intent exactly.

**2. Outage clobber-guard ordering**

`allZero` is computed on `rawMatrix` at `:173-174` **before** `excludeNoSignalModels` runs at `:177`. This is the critical fix: a total outage (every cell rate-0) would, post-exclusion, drop ALL models and yield an empty matrix — at which point an `allZero`-on-the-cleaned-matrix check would see `cells.length===0` and the `&& cells.length > 0` guard would make `allZero=false`, silently slipping the outage through to a write that overwrites the good matrix with `{}`. Computing on the raw matrix prevents exactly that. The comment at `:171-172` states the rationale correctly. **Corre
... [+5938 chars truncated]
