---
type: "chat-session"
source: "claude-code-cli"
session_id: "ce5eaa31-2e70-42f5-bb52-524de0feb512"
title: "Review two NEW files for silent breakage, regression risk, and analysis-logic co"
date: "2026-06-25"
first_ts: "2026-06-25T00:44:39.552Z"
last_ts: "2026-06-25T00:47:13.198Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 12
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/ce5eaa31-2e70-42f5-bb52-524de0feb512/subagents/agent-a8cb3083c3485a1ae.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Review two NEW files for silent breakage, regression risk, and analysis-logic co

> **claude-code-cli** | 2026-06-25 | 34 msgs (12 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ce5eaa31-2e70-42f5-bb52-524de0feb512/subagents/agent-a8cb3083c3485a1ae.jsonl`

## Transcript

### User | 2026-06-25T00:44:39.552Z

Review two NEW files for silent breakage, regression risk, and analysis-logic correctness. Grade PASS or FAIL with P0/P1/P2 and file:line citations. Read each end-to-end.

FILES:
1. H:\prism\scripts\ollama-stress-test.mjs  (an Ollama scaling/diminishing-returns stress harness)
2. H:\prism\scripts\ollama-stress-test.test.mjs

CONTEXT: This is the SCALING companion to the existing scripts/ollama-capability-probe.mjs (which it must NOT duplicate — that one does task×model success-rate at concurrency 1; this one adds model-tier frontier + concurrency knee + output-length sweeps). It COMPOSES scripts/lib/ollama-capability-battery.mjs (TASK_BATTERY + verifiers). Live calls hit Ollama /api/generate; pure analysis functions are separated for testing.

VERIFY SPECIFICALLY:
1. `tokPerSec(metrics)` = eval_count / (eval_duration_ns / 1e9). Confirm the ns→s conversion is correct and guards zero/negative/NaN.
2. `percentile(values, p)` nearest-rank: confirm p50 of [1..10] is 5 and p95 is 10 (the test asserts these — are they actually correct for nearest-rank, and does the code produce them?).
3. `findConcurrencyKnee(rows)` — the core analysis. Walk the loop: does it correctly return the LAST profitably-scaling concurrency level, cap the knee when p95 latency exceeds maxLatencyFactor×baseline even if throughput rises, and handle empty/single-point? Is there an off-by-one (does it return the right level vs the level before)? Check the `gain` computation when prev===0.
4. `smallestPassingModel` / `classifyTaskFrontier` — sorting by MODEL_PARAM_B with Infinity fallback for unknown models; the trivial/mid/large/beyond-local verdict math (frac = idx/(len-1)).
5. The live runners (runTierSweep, runConcurrencySweep, runOutputSweep): any unhandled rejection, any place a single failed Ollama call crashes the sweep instead of being recorded as a gap? Is the aggregate-tok/s-over-wall-clock computation in the concurrency sweep sound?
6. Test integrity (R9): would each test FAIL on a real regr
... [+262 chars truncated]

### Assistant | 2026-06-25T00:44:42.986Z

I'll review both files end-to-end, then trace the analysis logic and consumers.

### Assistant | 2026-06-25T00:44:43.460Z

[tool_use: Read]

### Assistant | 2026-06-25T00:44:43.758Z

[tool_use: Read]

### User | 2026-06-25T00:44:44.863Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ollama-stress-test.mjs
3	//
4	// U-ALPHA-OLLAMA-STRESS (slot:alpha, 2026-06-24) -- the SCALING / DIMINISHING-
5	// RETURNS companion to india's ollama-capability-probe.mjs.
6	//
7	// THE GAP IT FILLS.
8	//   ollama-capability-probe.mjs already answers "WHICH (task,model) pairs pass"
9	//   (per-task success rate via verifiers) -- but only at concurrency 1, a fixe
... [+21559 chars truncated]

### User | 2026-06-25T00:44:45.065Z

[tool_result] 1	// scripts/ollama-stress-test.test.mjs
2	//
3	// Real-assertion tests for the PURE analysis core of the Ollama stress harness
4	// (U-ALPHA-OLLAMA-STRESS). No network: every function is fed synthetic metric
5	// rows so the knee/frontier math is pinned with reference values.
6	//
7	// Run: node scripts/ollama-stress-test.test.mjs   (node:test auto-runs on exit)
8	
9	import { test } from "node:te
... [+7632 chars truncated]

### Assistant | 2026-06-25T00:44:48.567Z

Now let me verify the composed battery contract — the dependency this harness assumes (`TASK_BATTERY` shape: `task.cases`, `task.prompt(c)`, `task.verify(text, c)`, `task.id`, `task.category`).

### Assistant | 2026-06-25T00:44:48.711Z

[tool_use: Read]

### User | 2026-06-25T00:44:49.805Z

[tool_result] 1	/**
2	 * ollama-capability-battery.mjs -- pure: a battery of VERIFIABLE task-types + code verifiers that
3	 * measure an Ollama model's TRUE success rate per task (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11).
4	 *
5	 * THE GOAL (operator 2026-06-11, "fable 5 demolished session limits"): only AUTO-OFFLOAD a task to
6	 * a local model when we KNOW it succeeds ~100% -- and we know that only by MEASU
... [+7805 chars truncated]

### Assistant | 2026-06-25T00:44:53.476Z

The battery contract is confirmed: each task has `id`, `category`, `cases`, `prompt(c)`, `verify(out, c)`. The harness's `runTierSweep` consumes them correctly (`task.prompt(c)`, `task.verify(r.text||"", c)`, `task.cases`, `task.id`, `task.category`). Now let me confirm the duplication-avoidance claim and verify the existing probe doesn't already do the scaling sweeps.

### Assistant | 2026-06-25T00:44:53.646Z

[tool_use: Read]

### User | 2026-06-25T00:44:54.873Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-capability-probe.mjs -- LIVE runner that measures each Ollama model's TRUE per-task success
4	 * rate via code verifiers (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11). Answers the operator's
5	 * "test it to see what else it can do so we can fine-tune systems further" with DATA, not vibes:
6	 * which (task, model) pairs are auto-offload-safe (~100%), so we mov
... [+5921 chars truncated]

### Assistant | 2026-06-25T00:45:01.778Z

No duplication: the probe does task×model success-rate at concurrency 1 (and writes `ollama-capability-matrix.json`); the stress harness adds tier-frontier + concurrency-knee + output-sweep (writes `ollama-stress-report.json/.md`). Distinct outputs, distinct purpose. Good.

Now let me trace the specific verification points. First, the `findConcurrencyKnee` off-by-one and the latency-cap interaction, then the `tokPerSec`/`percentile`/frontier math, and the run-as-main guard.

Let me confirm two subtle things empirically — the percentile nearest-rank values and the `findConcurrencyKnee` latency-blowup-on-first-step behavior (the test at line 69-78 asserts knee=1 when c=2 blows latency).

### Assistant | 2026-06-25T00:45:10.910Z

[tool_use: Bash]

### User | 2026-06-25T00:45:16.663Z

[tool_result] p50: 5 p95: 10 p100: 10
tps200/2e9: 100
tps2/31.45e6: 63.59300476947536
latblow: {"knee":1,"saturated":true,"rationale":"knee at c=1 (next: p95 5000ms > 3x baseline)"}
prev0: {"knee":2,"saturated":true,"rationale":"knee at c=2 (next: throughput gain 5% < 15%)"}
baseLat0: {"knee":2,"saturated":false,"rationale":"still scaling at c=2 (top of sweep)"}
singlemodel: {"verdict":"trivial-local","smallest
... [+136 chars truncated]

### Assistant | 2026-06-25T00:45:19.406Z

All core math confirmed. Now let me run both the new test file and a quick check that the run-as-main guard doesn't fire on import (no network calls happened during the import above — confirmed, since the script imported cleanly with no hang).

### Assistant | 2026-06-25T00:45:20.358Z

[tool_use: Bash]

### User | 2026-06-25T00:45:25.131Z

[tool_result]   ...
# Subtest: classifyTaskFrontier: mid-local when a middle model is the first to pass
ok 14 - classifyTaskFrontier: mid-local when a middle model is the first to pass
  ---
  duration_ms: 0.0416
  ...
# Subtest: classifyTaskFrontier: beyond-local when nothing passes -> stays on Claude
ok 15 - classifyTaskFrontier: beyond-local when nothing passes -> stays on Claude
  ---
  duration_ms: 0.034
 
... [+410 chars truncated]

### Assistant | 2026-06-25T00:45:33.175Z

17/17 pass, 0 skipped, 0 todo. Let me verify the run-as-main guard does not execute the CLI on import (the import in my earlier `node -e` returned immediately with no `[stress]` stderr and no network hang — but let me confirm the guard logic against the actual `process.argv[1]` when imported by the test, and check one regression-detection concern: would the knee tests actually fail if the function were broken).

### Assistant | 2026-06-25T00:45:36.179Z

[tool_use: Bash]

### User | 2026-06-25T00:45:41.085Z

[tool_result] import-by-test (argv1=test.mjs): false
direct (argv1=stress-test.mjs): true

### Assistant | 2026-06-25T00:45:46.798Z

Found a real defect in the run-as-main guard. The predicate uses `endsWith("ollama-stress-test.mjs")`. The test file is named `ollama-stress-test.test.mjs` — that does NOT end with `ollama-stress-test.mjs` (it ends with `.test.mjs`), so the test import is safe here. But the predicate is a substring-style suffix check that's fragile: any file path ending in `...ollama-stress-test.mjs` triggers it. More importantly, let me check a subtler issue — the existing probe uses `path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)`, an exact-match. The stress harness uses a looser `endsWith`. Let me verify whether that looseness can cause a false-positive in any realistic invocation, and check the concurrency-sweep aggregate-throughput soundness concern.

### Assistant | 2026-06-25T00:45:53.752Z

[tool_use: Bash]

### User | 2026-06-25T00:45:59.045Z

[tool_result] [{"concurrency":1,"ok":1,"failed":0,"aggTokPerSec":0,"p50Ms":1000,"p95Ms":1000,"wallMs":0},{"concurrency":2,"ok":1,"failed":1,"aggTokPerSec":0,"p50Ms":1000,"p95Ms":1000,"wallMs":0}]

### Assistant | 2026-06-25T00:46:04.303Z

Important finding: in this synthetic run `wallMs` came out 0 because the fake `callFn` is synchronous-resolved so `Date.now()` didn't advance — that produced `aggTokPerSec: 0`. That's a test-harness artifact, not a code bug (real calls take real wall time). But it reveals a real edge: when `wallMs === 0`, `aggTokPerSec` is forced to 0 even with real tokens. On a very fast localhost batch this is unlikely but possible. Minor.

Let me verify the unhandled-rejection / crash-safety claim in the live runners and check `renderReport` for any undefined-access crash when sections are partial (e.g. `report.tier` present but `frontier` missing).

### Assistant | 2026-06-25T00:46:10.197Z

[tool_use: Bash]

### User | 2026-06-25T00:46:13.973Z

[tool_result] CRASHED: ollama dead
CONC CRASHED: boom
OUTPUT CRASHED: boom

### Assistant | 2026-06-25T00:46:25.220Z

This is a real P1 finding. The harness's own docstring (lines 31-35) and `callOllama` (line 181, "Never throws") establish the contract that a failed call is recorded as a gap, not a crash. But the **live runners do not enforce that contract on the injected `callFn`**. The default `callFn` (`callOllama`) never throws, so production is safe — BUT:

1. `runConcurrencySweep` uses `Promise.all` (line 264). If ONE of the `c` parallel `callOllama` calls ever rejected, `Promise.all` rejects and the **entire sweep crashes**, losing all prior levels' data. `callOllama` is currently throw-proof, so this is latent — but it's exactly the "single failed call crashes the sweep" failure mode the review asked about. `Promise.allSettled` would be the correct primitive given the stated "record as gap" contract.

2. `runTierSweep` (line 234) and `runOutputSweep` (line 292) `await callFn(...)` with no try/catch around the call itself. They only try/catch the `verify()` (line 238). A throwing `callFn` propagates out.

This matters because: (a) the contract is documented as crash-safe but only the default impl honors it — the runners assume their dependency's guarantee rather than enforcing it (integration-coupling lens); (b) `callOllama`'s try/catch covers `fetch`/`json`, but `tokPerSec(j)` at line 206 runs inside the try and is pure-safe, so callOllama is genuinely throw-proof today — meaning this is latent, not live. Still, `Promise.all` vs `allSettled` is a genuine robustness gap for the concurrency sweep specifically.

Now let me check the `renderReport` partial-section robustness and the `median`/`toFixed` NaN path.

### Assistant | 2026-06-25T00:46:30.915Z

[tool_use: Bash]

### User | 2026-06-25T00:46:35.184Z

[tool_result] render-ok len: 402
median empty toFixed: 0 0
nocolon render (split[1] undefined): true

### Assistant | 2026-06-25T00:46:40.421Z

One cosmetic finding: `renderReport` line 320 does `m.model.split(":")[1]` — for a model id without a colon, `split(":")[1]` is `undefined`, rendering `undefined=100%` in the markdown table. All real model ids have a colon (`family:size`), so this is cosmetic/P2 only.

Let me do a final check on the `parseArgs` numList edge (NaN filtering) and confirm there are no `.only`/`.skip` and no tautological asserts in the test file, plus check whether the `findConcurrencyKnee` `prev===0` gain logic is sound for the routing decision.

### Assistant | 2026-06-25T00:46:41.532Z

[tool_use: Grep]

### User | 2026-06-25T00:46:43.045Z

[tool_result] No matches found

### Assistant | 2026-06-25T00:47:13.198Z

No `.only`/`.skip`/`.todo`, no stub asserts. The tests use real reference values (p50=5, p95=10, tokPerSec=100/63.6, knee levels) that would fail on a real regression — I confirmed each function produces exactly what the test asserts, and the assertions encode the *intent* (e.g. the latency-cap test would fail if the cap logic were removed; the plateau test would fail if the off-by-one flipped knee to 4).

Let me do one final trace on the `findConcurrencyKnee` off-by-one correctness for the routing intent and the `prev===0` gain branch, since that's the load-bearing analysis function.

The logic: `knee` starts at `r[0].concurrency` (baseline). The loop walks from i=1; if level i still scales profitably AND latency ok, `knee = r[i].concurrency` (advance). On the first non-scaling/degraded level, it returns the CURRENT `knee` (the last good level) — correct, returns the level *before* the breakdown. The `gain` when `prev===0`: `cur>0 ? 1 : 0` — if baseline throughput was 0 (all failed) and this level produces tokens, gain=1 (>=minGain) so it advances; reasonable. If both 0, gain=0, stops. Verified empirically above (`prev0` case → knee=2 correctly). No off-by-one.

One last concern — the latency cap when `baseLat <= 0`: `latencyOk = baseLat <= 0 || ...` means if the baseline p95 is 0 (degenerate — all baseline calls failed, no latencies), latency checks are DISABLED for the whole sweep. The `baseLat0` empirical case confirmed knee advances to c=2 with p95=999999 and `saturated:false`. That's a minor robustness gap (latency cap silently disabled when baseline has no measured latency), but it only triggers when the baseline level produced zero successful calls — an outage-adjacent state where the data is already untrustworthy. P2.

I have enough to render the verdict.

---

VERDICT: PASS

summary: Both files are correct and well-separated (pure analysis vs live I/O), the analysis math is verifiably right (p50=5/p95=10 nearest-rank, tokPerSec ns→s with full zero/NaN/nega
... [+3441 chars truncated]
