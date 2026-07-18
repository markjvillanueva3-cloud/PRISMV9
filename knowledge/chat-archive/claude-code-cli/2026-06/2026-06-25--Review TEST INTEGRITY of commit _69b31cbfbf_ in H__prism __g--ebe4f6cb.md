---
type: "chat-session"
source: "claude-code-cli"
session_id: "ebe4f6cb-0d7e-440f-a982-8837c4bdce93"
title: "Review TEST INTEGRITY of commit `69b31cbfbf` in H:/prism (`git -C H:/prism show "
date: "2026-06-25"
first_ts: "2026-06-25T16:19:03.646Z"
last_ts: "2026-06-25T16:21:37.180Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 13
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a7578a987c8464746.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review TEST INTEGRITY of commit `69b31cbfbf` in H:/prism (`git -C H:/prism show 

> **claude-code-cli** | 2026-06-25 | 36 msgs (13 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ebe4f6cb-0d7e-440f-a982-8837c4bdce93/subagents/agent-a7578a987c8464746.jsonl`

## Transcript

### User | 2026-06-25T16:19:03.646Z

Review TEST INTEGRITY of commit `69b31cbfbf` in H:/prism (`git -C H:/prism show 69b31cbfbf`), file `scripts/stress-frontier-report.test.mjs` (8 tests for `mergeFrontier`/`renderReport`). Do NOT assume reviewer A caught anything.

The production code: `mergeFrontier` merges per-model stress JSONs -> capability frontier with a `loadFailed` exclusion (all-0% model = never loaded) and `cheapest100` (cheapest model at 100% by param-cost).

Verify the tests genuinely encode intent (R9), not vacuous green:
1. The LOAD-FAILED exclusion test: does it actually prove an all-0% model is excluded AND that a merely-WEAK model (>0% but never 100%, the deepseek-r1:14b case) is KEPT? These are the two sides of the guard — both must be tested or the guard could over- or under-exclude.
2. The cheapest-by-cost test: does it prove the SMALLEST passing model wins (not first-seen)? Does it prove a cheaper-but-failing model is skipped for a costlier-passing one?
3. NONE-local: a task no model clears -> cheapest100 null.
4. The tag-collision test (deepseek-r1:14b vs qwen2.5-coder:14b): is it load-bearing?
5. modelCeiling count test: real value assertion?
6. Adversarial null/empty/malformed: no-throw.
Any `.skip`/`.only`? Any assertion that can't fail if the logic reverts? Could any test pass against a stub `mergeFrontier` that returns empty? Run `node --test scripts/stress-frontier-report.test.mjs`. Grade PASS or FAIL with file:line.

### Assistant | 2026-06-25T16:19:06.575Z

I'll review the test integrity of commit `69b31cbfbf`, focusing on the test file and its production code.

### Assistant | 2026-06-25T16:19:07.056Z

[tool_use: Bash]

### Assistant | 2026-06-25T16:19:07.442Z

[tool_use: Read]

### User | 2026-06-25T16:19:07.660Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### User | 2026-06-25T16:19:09.547Z

[tool_result] 1	// Tests for stress-frontier-report.mjs (U-ALPHA-OLLAMA-STRESS-FRONTIER, slot:alpha 2026-06-25).
2	// R9: real fixtures encoding the merge's load-bearing invariants -- the load-failed exclusion
3	// (the guard that stopped the all-0% gpt-oss:120b/deepseek-r1:32b from poisoning the frontier),
4	// cheapest-by-cost frontier selection, NONE-local detection, and the per-model ceiling count.
5	// Run
... [+5210 chars truncated]

### Assistant | 2026-06-25T16:19:12.415Z

Now let me read the production code to verify the tests against actual logic.

### Assistant | 2026-06-25T16:19:12.437Z

[tool_use: Read]

### User | 2026-06-25T16:19:12.943Z

[tool_result] read-once-guard: 'H:\prism\scripts\stress-frontier-report.mjs' was already read 3s ago in this session and is unchanged (mtime 1782403973024). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T16:19:15.874Z

The guard says it's in context, but I don't actually see it. Let me read it via a slightly different invocation to get the production code.

### Assistant | 2026-06-25T16:19:16.619Z

[tool_use: Read]

### User | 2026-06-25T16:19:18.225Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/stress-frontier-report.mjs
3	//
4	// U-ALPHA-OLLAMA-STRESS-FRONTIER (slot:alpha 2026-06-25): merge the per-model graded-stress
5	// JSONs (emitted by ollama-stress-expanded-run.mjs --json, one file per model) into ONE
6	// capability-frontier report -- the deterministic answer to the operator goal "stress test ollama
7	// llms to see what the HARDEST task each ll
... [+7716 chars truncated]

### Assistant | 2026-06-25T16:19:24.038Z

Now let me check the `modelCostRank` source of truth, since the cheapest-by-cost tests depend on it returning the param-size cost for each tag.

### Assistant | 2026-06-25T16:19:24.929Z

[tool_use: Bash]

### User | 2026-06-25T16:19:30.065Z

[tool_result] 116:export function modelCostRank(modelTag) {
131: * Among the qualifying (all-tasks-proven) models the CHEAPEST is chosen by modelCostRank -- NOT the
164:      const rank = modelCostRank(model);

### Assistant | 2026-06-25T16:19:32.838Z

[tool_use: Read]

### User | 2026-06-25T16:19:34.093Z

[tool_result] 100	/**
101	 * Cost rank of an Ollama model tag = its parameter count in billions, parsed from the tag's
102	 * size suffix (`qwen2.5-coder:1.5b` -> 1.5, `gpt-oss:120b` -> 120, `deepseek-r1:32b` -> 32).
103	 * Parameter count is the canonical $0-local cost proxy: fewer params -> less VRAM -> more models
104	 * co-resident -> higher offload concurrency (exactly the "max potential" the roster-sync e
... [+3638 chars truncated]

### Assistant | 2026-06-25T16:19:38.747Z

I now have a full picture of `modelCostRank`: it parses the param size after the last colon (`1.5b`->1.5, `7b`->7, `14b`->14, `32b`->32). Now let me run the tests to confirm they pass and are real.

### Assistant | 2026-06-25T16:19:39.671Z

[tool_use: Bash]

### User | 2026-06-25T16:19:43.753Z

[tool_result]   ...
# Subtest: full model tags are preserved -- deepseek-r1:14b and qwen2.5-coder:14b do NOT collide
ok 5 - full model tags are preserved -- deepseek-r1:14b and qwen2.5-coder:14b do NOT collide
  ---
  duration_ms: 0.2086
  ...
# Subtest: per-model ceiling counts tasks-cleared-at-100% over measured
ok 6 - per-model ceiling counts tasks-cleared-at-100% over measured
  ---
  duration_ms: 0.1199
  
... [+515 chars truncated]

### Assistant | 2026-06-25T16:19:50.709Z

All 8 pass, 0 skipped, 0 todo. Now let me verify each test genuinely encodes intent by checking the load-bearing assertions against the production logic. Let me trace the critical cases.

For the cheapest-by-cost test (lines 45-54), I need to verify `qwen2.5-coder:7b` wins `hard` because `1.5b` fails it. Let me confirm the `modelCostRank` ordering puts 1.5b < 7b < 32b so "first-seen" vs "cheapest" actually diverge. The fixture order is 32b, 1.5b, 7b — so first-seen for `easy` (all pass) would be 32b, but cheapest is 1.5b. This genuinely distinguishes first-seen from cheapest. Good.

Let me verify a critical adversarial point: could a stub `mergeFrontier` returning empty pass any of these tests? Let me check by reasoning through each, and also confirm one subtle concern — whether the LOAD-FAILED test (line 30) is meaningfully checking exclusion or just trivially true.

### Assistant | 2026-06-25T16:19:55.290Z

[tool_use: Bash]

### User | 2026-06-25T16:19:59.369Z

[tool_result] easy.cheapest100= qwen2.5-coder:1.5b  (first-seen would be 32b)
easy.passingModels= ["qwen2.5-coder:1.5b","qwen2.5-coder:7b","qwen2.5-coder:32b"]
hard.cheapest100= qwen2.5-coder:7b  hard.passing= ["qwen2.5-coder:7b","qwen2.5-coder:32b"]
models(sorted)= ["qwen2.5-coder:1.5b","qwen2.5-coder:7b","qwen2.5-coder:32b"]

### Assistant | 2026-06-25T16:20:04.091Z

Confirmed: the fixture has 32b first-seen but the test asserts 1.5b wins `easy` — so the test genuinely proves cheapest-by-cost, not first-seen. And for `hard`, 1.5b fails (0.3) so 7b wins over the equally-passing 32b — proving "cheaper-but-failing skipped for costlier-passing". Both sides of requirement 2 are covered.

Now let me run a mutation check: would each test catch a revert of the load-failed guard? Let me simulate the guard being removed (all models kept) and a stub returning empty.

### Assistant | 2026-06-25T16:20:13.362Z

[tool_use: Bash]

### User | 2026-06-25T16:20:17.877Z

[tool_result] MUTANT-NOGUARD loadFailed= []  (test expects [gpt-oss:120b] -> would FAIL = test catches revert)
MUTANT-NOGUARD models.includes(gpt-oss:120b)= true  (test asserts !includes -> would FAIL)

### Assistant | 2026-06-25T16:20:21.135Z

The load-failed test catches a guard revert (both `loadFailed.deepEqual` and `!models.includes` flip). Now let me check the over-exclusion side: would the weak-model test (line 33-43) catch a mutant that excludes any non-100% model? And confirm a stub returning empty fails appropriately.

### Assistant | 2026-06-25T16:20:32.409Z

[tool_use: Bash]

### User | 2026-06-25T16:20:36.892Z

[tool_result] MUTANT-OVEREXCLUDE loadFailed= ["deepseek-r1:14b"]  (test expects [] -> would FAIL = test catches over-exclusion)
MUTANT-OVEREXCLUDE models.includes(deepseek-r1:14b)= false  (test asserts includes -> would FAIL)

STUB vs tests:
  T1 loadFailed deepEqual [gpt-oss:120b]? false -> stub FAILS T1
  T2 models.includes(deepseek-r1:14b)? false -> stub FAILS T2
  T3 taskFrontier.easy? undefined -> stub thr
... [+156 chars truncated]

### Assistant | 2026-06-25T16:20:44.095Z

This confirms the key R9 properties:
- **Over-exclusion mutant** (treating weak-as-failed) is caught by T2 (both assertions flip).
- **Under-exclusion mutant** (no guard) is caught by T1.
- **A stub returning empty** fails T1, T2, T3 (and T4/T5/T6 read non-empty results). Only T7 passes against the stub — which is correct, because T7's whole intent IS that adversarial input yields empty. So no test is vacuously green against a stub.

Now let me verify the tag-collision test (T4) is load-bearing — i.e., it would actually fail if tags collided on `:14b`. And confirm the modelCeiling count test asserts a discriminating value.

### Assistant | 2026-06-25T16:20:53.239Z

[tool_use: Bash]

### User | 2026-06-25T16:20:57.184Z

[tool_result] T4 models= ["qwen2.5-coder:14b","deepseek-r1:14b"]  (2 distinct => no collision)
T4 x.cheapest100= qwen2.5-coder:14b  (coder@100% wins, reasoner@0.2 excluded from passing)
T4 x.passingModels= ["qwen2.5-coder:14b"]

T5 ceiling count= 2  totalMeasured= 3

T6 iso.cheapest100= null  passingModels= []

### Assistant | 2026-06-25T16:21:01.613Z

All verified. Let me make one final check on the tag-collision test's load-bearing strength. The current code keys on the full tag, so 2 distinct models appear. But I want to confirm: does the T4 assertion `cheapest100 === "qwen2.5-coder:14b"` actually depend on no-collision, or could it pass even under collision? If tags collided, the `models` array would have one entry and `m.models.includes("qwen2.5-coder:14b")` (line 73) would still pass while line 74 `includes("deepseek-r1:14b")` would fail. Let me confirm that's the load-bearing assertion.

### Assistant | 2026-06-25T16:21:10.421Z

[tool_use: Bash]

### User | 2026-06-25T16:21:14.270Z

[tool_result] MUTANT-COLLIDE models= [":14b"]  (1 entry => collision)
  T4 line73 includes(qwen2.5-coder:14b)? false  (FALSE under collision -> line73 FAILS = test catches collision)
  T4 line74 includes(deepseek-r1:14b)? false  (FALSE -> also FAILS)

### Assistant | 2026-06-25T16:21:37.180Z

The tag-collision test is load-bearing: under a short-tag collision the `models` array collapses to one entry and both `includes` assertions (lines 73-74) fail. The test catches the exact bug the production comment warns about.

I have everything I need. Let me compile the verdict.

## Review complete

I read `scripts/stress-frontier-report.test.mjs` (113 lines) and the production `scripts/stress-frontier-report.mjs` (143 lines) end-to-end, plus the `modelCostRank` source of truth in `scripts/lib/model-routing-policy.mjs:116-123`. I ran the suite (8 pass / 0 fail / 0 skipped / 0 todo) and ran four mutation experiments to prove each test fails when the logic reverts.

---

**VERDICT: PASS**

**summary:** All 8 tests genuinely encode the merge's load-bearing invariants (R9). Every prompted concern is satisfied: the load-failed guard is tested on BOTH sides (all-0% excluded AND weak-but-positive kept), cheapest-by-cost is proven against a fixture where first-seen and cheapest diverge, NONE-local returns null, the tag-collision and ceiling-count tests assert discriminating real values, and the adversarial test is the only test a stub could pass — by design, since empty IS its expected result. No `.skip`/`.only`, no vacuous assertions, no test passes against a reverted guard.

**findings:** none (P0/P1). Item-by-item proof:

1. **Load-failed BOTH sides — verified.** `stress-frontier-report.test.mjs:27-30` asserts the all-0% `gpt-oss:120b` lands in `loadFailed`, is absent from `models`, and never wins a frontier pick. `:40-42` asserts the weak `deepseek-r1:14b` (0.5/0.17, never 100%) is NOT load-failed, IS in `models`, and has `modelCeiling.count === 0`. Mutation proof: removing the guard makes `loadFailed=[]` (T1 fails); widening it to `<1` excludes the weak model (T2 fails). The guard cannot over- or under-exclude without a red test. Matches production `:55-58`.

2. **Cheapest-by-cost — verified, both halves.** `:52-53`. Fixture order is `32b, 1.5b, 7b` (`:46-50`), so f
... [+2091 chars truncated]
