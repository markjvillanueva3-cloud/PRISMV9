---
type: "chat-session"
source: "claude-code-cli"
session_id: "ebe4f6cb-0d7e-440f-a982-8837c4bdce93"
title: "Independent regression + silent-breakage review of commit `b2d527b126` in H:/pri"
date: "2026-06-25"
first_ts: "2026-06-25T16:49:55.914Z"
last_ts: "2026-06-25T16:54:33.988Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 24
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a22289d2fe5370230.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent regression + silent-breakage review of commit `b2d527b126` in H:/pri

> **claude-code-cli** | 2026-06-25 | 64 msgs (24 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a22289d2fe5370230.jsonl`

## Transcript

### User | 2026-06-25T16:49:55.914Z

Independent regression + silent-breakage review of commit `b2d527b126` in H:/prism (`git -C H:/prism show b2d527b126`). Do NOT assume A/B caught anything. It adds `excludeNoSignalModels` to `scripts/ollama-capability-probe.mjs`, wires it into the write path, and re-filtered the live `state/shared/ollama-capability-matrix.json` from 9 models to 3 (1.5b/7b/14b).

FOCUS on silent breakage + coupling:
1. The live matrix now has only 3 models + a new `excludedNoSignal` field. CONSUMERS: `.claude/hooks/model-tier-advisor.mjs`, `scripts/lib/model-routing-policy.mjs` (ollamaSafeClassModels), `scripts/audit-probe-roster-coverage.mjs`. Does the reduced matrix + new field break any consumer? Does the schema still validate (generatedAt, models[], matrix{}, autoOffloadSafe[], strong[])? Is `excludedNoSignal` additive (consumers ignore unknown fields)?
2. CRITICAL: `scripts/audit-probe-roster-coverage.mjs` asserts every INSTALLED routable model is in the probe ROSTER (DEFAULT_MODELS) -- NOT the matrix. So reducing the matrix to 3 models does NOT trip the coverage guard (it reads DEFAULT_MODELS which still has 9). Confirm this -- otherwise the nightly coverage guard would now false-alarm.
3. Does the next NIGHTLY probe run overwrite this clean matrix? Yes -- and with the guard, it will again exclude false-0 models. Is that correct behavior, or could the guard cause the nightly matrix to oscillate (3 models one night, 9 another) depending on whether big models generate? Is that oscillation harmful?
4. The wiring change in main(): verify the outage clobber-guard (allZero) is computed on rawMatrix BEFORE exclusion, so excluding-to-empty can't slip a total outage past the guard. Trace the control flow.
5. Run `node --test scripts/ollama-capability-probe.test.mjs` (12/12) and confirm the matrix is valid JSON.
Grade PASS or FAIL with P0/P1/P2 + file:line. Be adversarial about the live-matrix mutation + nightly-overwrite behavior.

### Assistant | 2026-06-25T16:49:58.988Z

I'll investigate commit `b2d527b126` and trace its blast radius. Let me start by reading the commit and the key files.

### Assistant | 2026-06-25T16:49:59.464Z

[tool_use: Bash]

### User | 2026-06-25T16:50:04.022Z

[tool_result] commit b2d527b1266c3b69abfc1db9b8bb060903be81ff
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 11:48:53 2026 -0500

    [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO (slot:alpha): close the 3-of-3 P2 (reviewer C) on 69b31cbfbf -- the capability-probe wrote FALSE-0 for generation-failed models. New excludeNoSignalModels guard: a model scoring rate-
... [+1691 chars truncated]

### Assistant | 2026-06-25T16:50:06.229Z

Let me read the full diff through rtk and the key files in parallel.

### Assistant | 2026-06-25T16:50:07.604Z

[tool_use: Bash]

### Assistant | 2026-06-25T16:50:07.818Z

[tool_use: Read]

### User | 2026-06-25T16:50:12.472Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
b2d527b126 [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO (slot:alpha): close the 3-of-3 P2 (reviewer C) on 69b31cbfbf -- the capability-probe wrote FALSE-0 for generation-failed models. New excludeNoSignalModels guard: a model scoring rate-0 on EVERY measured task (a big model cold-load timing out under 
... [+6244 chars truncated]

### User | 2026-06-25T16:50:13.266Z

[tool_result] read-once-guard: 'H:\prism\scripts\ollama-capability-probe.mjs' was already read 21s ago in this session and is unchanged (mtime 1782405996355). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T16:50:16.955Z

The read guard says the file is already in context, but I don't actually have it. Let me read it explicitly along with the consumers.

### Assistant | 2026-06-25T16:50:17.894Z

[tool_use: Bash]

### User | 2026-06-25T16:50:22.099Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * ollama-capability-probe.mjs -- LIVE runner that measures each Ollama model's TRUE per-task success
     4	 * rate via code verifiers (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11). Answers the operator's
     5	 * "test it to see what else it can do so we can fine-tune systems further" with DATA, not vibes:
     6	 * which (task, model) pairs are auto-o
... [+13413 chars truncated]

### Assistant | 2026-06-25T16:50:23.975Z

I have the probe script. Now let me read the consumers and the live matrix in parallel.

### Assistant | 2026-06-25T16:50:25.005Z

[tool_use: Read]

### Assistant | 2026-06-25T16:50:25.408Z

[tool_use: Read]

### Assistant | 2026-06-25T16:50:25.867Z

[tool_use: Read]

### Assistant | 2026-06-25T16:50:26.146Z

[tool_use: Read]

### User | 2026-06-25T16:50:27.156Z

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

### User | 2026-06-25T16:50:27.383Z

[tool_result] 1	// tier: T2
2	/**
3	 * model-tier-advisor.mjs -- UserPromptSubmit hook (U-MODEL-TIER-ADVISOR, slot:india 2026-06-11).
4	 *
5	 * THE OPERATOR GOAL (2026-06-11, "fable demolished session limits"): auto-enforced model switching --
6	 * fable for deep planning/reasoning, opus for building/coding, ollama for verified-100% mechanical,
7	 * sonnet/haiku for capable tasks. The main-loop model CANNOT be 
... [+5342 chars truncated]

### User | 2026-06-25T16:50:27.787Z

[tool_result] 1	/**
2	 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
3	 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
4	 * 2026-06-11). This is the brain the advisor hook calls.
5	 *
6	 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
7	 *   - ollama  : mechanical ta
... [+12516 chars truncated]

### User | 2026-06-25T16:50:29.436Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/audit-probe-roster-coverage.mjs
3	//
4	// U-ALPHA-OLLAMA-ROSTER-COVERAGE-GUARD (slot:alpha 2026-06-25): keep the "blind graph"
5	// drift that U-ALPHA-OLLAMA-ROSTER-SYNC fixed from RECURRING. The nightly capability probe
6	// (ollama-capability-probe DEFAULT_MODELS) and the routing tiers (ollama-cost-router
7	// TIER_PREFERENCES) are otherwise kept in sync by COM
... [+4433 chars truncated]

### Assistant | 2026-06-25T16:50:34.997Z

I have all four consumers plus the live matrix. Now let me run the test, validate the JSON, and check the test file content plus the `scoreMatrix`/`autoOffloadCandidates` shape and the `ollama-cost-router.mjs` TIER_PREFERENCES.

### Assistant | 2026-06-25T16:50:36.424Z

[tool_use: Bash]

### Assistant | 2026-06-25T16:50:38.006Z

[tool_use: Bash]

### User | 2026-06-25T16:50:41.818Z

[tool_result]   ...
# Subtest: excludeNoSignalModels is pure -- it never mutates the input matrix
ok 10 - excludeNoSignalModels is pure -- it never mutates the input matrix
  ---
  duration_ms: 0.2738
  ...
# Subtest: excludeNoSignalModels: no exclusions -> returns the inputs unchanged (fast path)
ok 11 - excludeNoSignalModels: no exclusions -> returns the inputs unchanged (fast path)
  ---
  duration_ms: 0.176
... [+298 chars truncated]

### User | 2026-06-25T16:50:46.086Z

[tool_result] JSON OK keys: generatedAt,models,matrix,autoOffloadSafe,strong,excludedNoSignal
models: 3 | matrix tasks: 8 | autoOffloadSafe: 16 | strong: 16 | excludedNoSignal: 6

### Assistant | 2026-06-25T16:50:50.021Z

12/12 pass, JSON valid, schema fields all present. Now let me verify the critical coverage-guard claim: that `audit-probe-roster-coverage.mjs` reads `DEFAULT_MODELS` (9), not the matrix. And check the `ollama-cost-router.mjs` TIER_PREFERENCES + nightly cron wiring.

### Assistant | 2026-06-25T16:50:50.453Z

[tool_use: Read]

### Assistant | 2026-06-25T16:50:51.339Z

[tool_use: Grep]

### User | 2026-06-25T16:50:51.730Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+7809 chars truncated]

### User | 2026-06-25T16:50:55.967Z

[tool_result] Found 49 files
state\shared\dashboards\injection-dedup-cache.json
mcp-server\data\state\session-file-ownership.json
state\shared\ollama-capability-matrix.json
scripts\ollama-capability-probe.test.mjs
scripts\ollama-capability-probe.mjs
knowledge\memories\reference\reference_post_ship_ollama-routing-u-alpha-ollama-stress-frontier.md
knowledge\memories\reference\reference_ollama_stress_capability_20
... [+2649 chars truncated]

### Assistant | 2026-06-25T16:50:59.944Z

Now let me verify the consumers don't read `excludedNoSignal` or break, check how `model-tier-advisor` / `ollama-task-offloader` consume the matrix, and check the nightly cron registry + who else reads the matrix file directly (e.g. session-start-ollama-chat-probe).

### Assistant | 2026-06-25T16:51:02.325Z

[tool_use: Bash]

### Assistant | 2026-06-25T16:51:04.206Z

[tool_use: Bash]

### User | 2026-06-25T16:51:07.403Z

[tool_result] scripts\ai-systems-fleet-state.mjs
scripts\assess-cloud-candidate.mjs
scripts\audit-ai-synergy.mjs
scripts\ask-ollama.mjs
scripts\audit-probe-roster-coverage.mjs
.claude/hooks\docker-service-health-stop.mjs
scripts\batch-ollama-vision-extract.mjs
scripts\bench-vision-ocr-ab.mjs
.claude/hooks\embedder-inject-qdrant.mjs
scripts\blueprint-ocr-training-loop.mjs
mcp-server/src\tools\dispatchers\devDisp
... [+1114 chars truncated]

### User | 2026-06-25T16:51:14.058Z

[tool_result] 56:      "id": "ollama-capability-probe",
57:      "cmd": ["node", "scripts/ollama-capability-probe.mjs", "--out"],
64:      "cmd": ["node", "scripts/audit-probe-roster-coverage.mjs"],
67:      "note": "Runs RIGHT AFTER ollama-capability-probe regenerates the matrix (R13 dependency order): asserts every INSTALLED routable model (cost-router TIER_PREFERENCES) is in the probe roster (DEFAULT_MODELS)
... [+743 chars truncated]

### Assistant | 2026-06-25T16:51:17.969Z

Confirmed the nightly registry. The audit job reads `DEFAULT_MODELS` (9) right after the probe. Let me narrow the matrix-file consumers to those that actually `read` the JSON file (not just mention ollama) and check the night-batch registry's clobber-guard interaction. Let me grep precisely for the matrix path reads.

### Assistant | 2026-06-25T16:51:19.727Z

[tool_use: Bash]

### User | 2026-06-25T16:52:13.852Z

[tool_result] .claude\hooks\model-tier-advisor.mjs:30:const MATRIX_PATH = path.join(ROOT, "state", "shared", "ollama-capability-matrix.json");
.claude\cache\read-once-registry:1:{"H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts":{"readTime":1782400782074,"mtime":1782399181436.3396},"H:/prism/mcp-server/src/engines/MillingReinforcementLearningEngine.ts":{"readTime":1782395725916,"mtime":1776475942932.
... [+23341 chars truncated]

### Assistant | 2026-06-25T16:52:19.131Z

The only live consumer that reads the matrix JSON file is `model-tier-advisor.mjs` (line 30), which passes it straight to `routePrompt`. All routing logic flows through `ollamaSafeClassModels` in `model-routing-policy.mjs`. The audit script imports `DEFAULT_MODELS` (9 models) directly, not the matrix. Let me trace the exact behavior of the reduced matrix through `ollamaSafeClassModels` and verify the consumer behavior on the reduced matrix + nightly oscillation. Let me check the test file content and confirm the consumer's behavior on the 3-model matrix.

### Assistant | 2026-06-25T16:52:23.184Z

[tool_use: Bash]

### User | 2026-06-25T16:52:28.164Z

[tool_result] safeClasses (reduced 3-model matrix): [
  [ 'classify', 'qwen2.5-coder:14b' ],
  [ 'extract', 'qwen2.5-coder:1.5b' ],
  [ 'format', 'qwen2.5-coder:7b' ]
]
routePrompt classify -> ollama qwen2.5-coder:14b | classify
routePrompt extract  -> ollama qwen2.5-coder:1.5b | extract

### Assistant | 2026-06-25T16:52:32.403Z

Routing works correctly through the reduced matrix. Now let me verify the critical control-flow claim about the outage guard (allZero on rawMatrix BEFORE exclusion) and check the nightly oscillation concern. Let me also confirm the git diff against the prior matrix to understand what was removed (whether the prior matrix had big models at rate 1 that are now absent — the "routing-neutral" claim).

### Assistant | 2026-06-25T16:52:42.098Z

[tool_use: Bash]

### User | 2026-06-25T16:52:46.673Z

[tool_result] OUTAGE: rawCells=4 allZero=true | after-exclude excluded=["a:1b","b:7b"] cleanCells=0
  -> guard on RAW catches it? allZero=true = true
  -> if guard ran on CLEAN it would see cleanCells=0 (empty -> length>0 false -> allZero FALSE -> SLIP)
PARTIAL: excluded=["big:120b"] keptModels=["small:1b"]

### Assistant | 2026-06-25T16:52:53.617Z

This is the critical finding the commit message claims to fix, and it's **correct**: under a total outage, `excludeNoSignalModels` would empty the matrix (cleanCells=0), and `allZero` computed on the empty matrix would be `false` (because `cells.length > 0` is false) — slipping the outage past the guard. The commit moves `allZero` computation to the RAW matrix BEFORE exclusion (probe.mjs:173-174), so the guard still catches the outage. Verified in source at lines 170-177.

Now let me verify the prior matrix to validate the "routing-neutral" claim — did any removed big model previously serve a class that the 3 small models don't cover? And check whether `excludedNoSignal` could grow the matrix-write to also drop the `keyword-extract` task (which is unmapped). Let me check the prior committed matrix.

### Assistant | 2026-06-25T16:52:59.913Z

[tool_use: Bash]

### User | 2026-06-25T16:53:03.550Z

[tool_result] Exit code 1
[eval]:6
  import('file://'+process.cwd().replace(/\/g,'/')+'/scripts/lib/model-routing-policy.mjs').then(({ollamaSafeClassModels})=>{
                                         ^^^^^^^

SyntaxError: missing ) after argument list
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:22
    at [eval]-wrapper:6:24
    at runScript (node:in
... [+155 chars truncated]

### Assistant | 2026-06-25T16:53:06.902Z

Backslash escaping issue. Let me write the prior matrix to a temp file and analyze it cleanly.

### Assistant | 2026-06-25T16:53:10.724Z

[tool_use: Bash]

### User | 2026-06-25T16:53:15.169Z

[tool_result] Exit code 1
node:internal/modules/cjs/loader:1252
  throw err;
  ^

Error: Cannot find module '/tmp/prior-matrix.json'
Require stack:
- H:\prism\[eval]
    at Function._resolveFilename (node:internal/modules/cjs/loader:1249:15)
    at Function._load (node:internal/modules/cjs/loader:1075:27)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:int
... [+400 chars truncated]

### Assistant | 2026-06-25T16:53:18.155Z

The `/tmp` path doesn't map under Windows node. Let me use a repo-relative temp path.

### Assistant | 2026-06-25T16:53:21.617Z

[tool_use: Bash]

### User | 2026-06-25T16:53:26.097Z

[tool_result] PRIOR models: [
  'qwen2.5-coder:1.5b',
  'qwen2.5-coder:7b',
  'qwen2.5-coder:14b',
  'qwen2.5-coder:32b',
  'qwen3-coder:30b',
  'gpt-oss:20b',
  'gpt-oss:120b',
  'deepseek-r1:14b',
  'deepseek-r1:32b'
]
PRIOR has excludedNoSignal field? false
  PRIOR classify 1.0-providers: [ 'qwen2.5-coder:7b', 'qwen2.5-coder:14b' ]
  PRIOR extract 1.0-providers: [ 'qwen2.5-coder:1.5b', 'qwen2.5-coder:7b', 'q
... [+93 chars truncated]

### Assistant | 2026-06-25T16:53:33.969Z

This **confirms the "routing-neutral" claim is correct**. In the PRIOR (9-model) matrix, the big models (32b/30b/gpt-oss/deepseek-r1) were ALL at rate 0 — they never appeared as a 1.0-provider for any class. The only 1.0-providers were the three small coders (1.5b/7b/14b), which the reduced matrix keeps. So `ollamaSafeClassModels` returns the identical `{class -> cheapest model}` map before and after. No class lost its provider; routing is genuinely unchanged.

Now let me verify the prior matrix in the repo before this commit was actually the 9-model false-0 one (to confirm the live mutation wasn't dropping legitimately-measured big-model data), and address the nightly oscillation concern by confirming `keyword-extract` (rate 0 on all 3 small models) is NOT excluded — it's a measured-incapable task, not a no-signal model. Let me trace that edge precisely.

### Assistant | 2026-06-25T16:53:38.708Z

[tool_use: Bash]

### User | 2026-06-25T16:53:42.768Z

[tool_result] Re-running exclude on the LIVE clean matrix -> excluded: [] | kept: [ 'qwen2.5-coder:1.5b', 'qwen2.5-coder:7b', 'qwen2.5-coder:14b' ]
Idempotent (no further exclusion)? true
keyword-extract present? true | its models: [ 'qwen2.5-coder:1.5b', 'qwen2.5-coder:7b', 'qwen2.5-coder:14b' ]

### Assistant | 2026-06-25T16:53:50.250Z

Idempotent and correct. The exclusion is per-model across ALL tasks (`anyMeasured && !anyPositive`), so the small models — which pass on classify/extract/etc — are correctly kept despite scoring 0 on `keyword-extract`. The 0-row task itself is preserved (a real measurement). 

Now let me verify the schema validity for the `model-tier-advisor` consumer path under an edge case: what if a future nightly run produces a matrix where ALL models are no-signal except via the outage guard. And confirm the `audit-probe-roster-coverage` test passes (the coverage guard reads DEFAULT_MODELS=9, not the matrix=3). Let me run that test and the policy test.

### Assistant | 2026-06-25T16:53:51.243Z

[tool_use: Bash]

### User | 2026-06-25T16:53:55.610Z

[tool_result]     1..1
ok 13 - BATTERY_TO_CLASS
  ---
  duration_ms: 0.1737
  type: 'suite'
  ...
1..13
# tests 43
# suites 6
# pass 43
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 103.0672

### Assistant | 2026-06-25T16:54:00.588Z

All 43 pass (coverage-guard + policy). Now let me verify the one remaining coupling concern raised in FOCUS item 3: the **nightly oscillation**. The next nightly probe will re-measure all 9 models. If big models generate next run (clean GPU), they'll be measured at positive rates and re-added to the matrix; if they fail again, excluded. Let me confirm whether oscillation in the WRITTEN `models[]` array could harm any consumer, and check the `audit-probe-roster-coverage` reads `DEFAULT_MODELS` import (not matrix) one final time to be airtight on the false-alarm question.

### Assistant | 2026-06-25T16:54:05.614Z

[tool_use: Bash]

### User | 2026-06-25T16:54:09.490Z

[tool_result] DEFAULT_MODELS (probe roster) count: 9
coverage missing (installed=9 roster, roster=DEFAULT_MODELS): []
=> matrix reduction to 3 does NOT affect this guard (it never reads the matrix). false-alarm? false

### Assistant | 2026-06-25T16:54:33.988Z

Confirmed airtight. The coverage guard reads `DEFAULT_MODELS` (9), which is unchanged by this commit. Reducing the matrix to 3 models does **not** trip the coverage guard — no false alarm.

I have all the evidence I need. Let me compile the verdict.

## Analysis complete

I traced every consumer, ran all three test suites (12/12 probe + 43 coverage+policy = all green), validated the JSON, adversarially tested the outage-guard control flow, and compared the prior 9-model matrix against the reduced 3-model one.

---

VERDICT: PASS

summary: Commit `b2d527b126` adds a pure `excludeNoSignalModels` filter and reduces the live matrix from 9 to 3 models. The reduction is genuinely routing-neutral — I verified against the prior matrix that all 6 dropped big models were already rate-0 (false-0) and were never a 1.0-provider for any routable class, so `ollamaSafeClassModels` returns the byte-identical `{classify→14b, extract→1.5b, format→7b}` map before and after. The outage clobber-guard is correctly computed on `rawMatrix` BEFORE exclusion, the new `excludedNoSignal` field is purely additive (no consumer reads it), and the nightly coverage guard reads `DEFAULT_MODELS` (still 9), so the reduction cannot false-alarm it.

findings:
  - none

Consumers / edge-paths traced (audit trail):
- `H:/prism/.claude/hooks/model-tier-advisor.mjs:30,57,60` — the ONLY live reader of the matrix JSON file. It `JSON.parse`s the file and passes it straight to `routePrompt({prompt, matrix})`. Reduced matrix routes correctly (verified live: classify→`qwen2.5-coder:14b`, extract→`qwen2.5-coder:1.5b`). Fail-soft on parse error. New `excludedNoSignal` field is ignored (consumer only touches `matrix.matrix[taskId].models`). No break.
- `H:/prism/scripts/lib/model-routing-policy.mjs:139-170` (`ollamaSafeClassModels`) — reads only `matrix.matrix[taskId].models`; never `models[]`, `autoOffloadSafe`, `strong`, or `excludedNoSignal`. The dropped big models were absent from those task cells anyway. Per-cla
... [+2224 chars truncated]
