---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Arm-A review (PRISM per-file scrutiny gate). Two coupled changes in one iteratio"
date: "2026-06-17"
first_ts: "2026-06-17T14:22:51.579Z"
last_ts: "2026-06-17T14:26:29.631Z"
cwd: "H:\\prism"
messages: 46
user_msgs: 17
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a0c1038336024a56f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Arm-A review (PRISM per-file scrutiny gate). Two coupled changes in one iteratio

> **claude-code-cli** | 2026-06-17 | 46 msgs (17 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a0c1038336024a56f.jsonl`

## Transcript

### User | 2026-06-17T14:22:51.579Z

Arm-A review (PRISM per-file scrutiny gate). Two coupled changes in one iteration. Read END TO END:
- H:\prism\scripts\routing-utilization-audit.mjs (+ .test.mjs) -- NEW
- H:\prism\scripts\build-advisory-feature-catalog.mjs (+ .test.mjs) -- MODIFIED (added curatedClassMap + enrichHook curatedClass override)

CONTEXT:
1. routing-utilization-audit.mjs: a deterministic eval that consumes advisory-feature-catalog.json + slash-command-plans.json + operator-prompt-route-map.json + feature-routing-graph.taskClasses(), computes feature-coverage / per-class density cross-referenced with prompt frequency / a frequency-weighted punch list / a 4-leg utilizationScore. Fail-LOUD if an artifact missing (it's analysis, not a live path). Live: score 0.928, class-coverage 1.0, punch list 0.
2. build-advisory-feature-catalog.mjs change: curatedClassMap(TASK_CLASS_POLICY) reverse-maps each policy hooks[] entry to its class (first class wins); enrichHook now takes a curatedClass arg -> if set, taskClass=that, classConf=1.0, curated=true (authoritative curated mapping beats the noisy name-classifier). This populated 'locate' (its curated hooks master-index-precheck-inject + cag-router-inject) and moved class-specific 82->89, universal 202->195.

Weighted (arm-A): silent breakage, regression, integration coupling, conservation.

VERIFY:
1. Did the curated override BREAK the conservation invariant (classSpecific+universal===actionableWired)? Live says 89+195=284 -- confirm the math can't double-count a hook into both buckets or a class twice.
2. curatedClassMap "first class wins" -- is that deterministic (Object.keys order of TASK_CLASS_POLICY)? Any hook curated into 2 classes that now mis-attributes? Is conf=1.0 for a curated hook honest (it IS hand-curated)?
3. routing-utilization-audit computeUtilization: is featureCoverage correct (guards 0/0 -> 1)? Is the punch-list severity logic right (high-freq+0-features -> P1, low-freq -> P2)? Could utilizationScore exceed 1 or go negative?
4. Do
... [+234 chars truncated]

### Assistant | 2026-06-17T14:22:58.686Z

I'll review both files end-to-end, focusing on the conservation invariant, determinism, and the audit's scoring math.

### Assistant | 2026-06-17T14:22:59.153Z

[tool_use: Read]

### Assistant | 2026-06-17T14:22:59.528Z

[tool_use: Read]

### User | 2026-06-17T14:23:02.517Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/routing-utilization-audit.mjs
3	//
4	// ROUTING-GRAPH-COMPLETENESS / U-ROUTING-UTILIZATION-AUDIT (slot:alpha 2026-06-17).
5	// Operator directive: "do multiple rounds of loops to evaluate all your work everytime
6	// and ask if we're really utilizing the system to its fullest extent to produce high
7	// quality work efficiently."
8	//
9	// This is the EVALUATION 
... [+10477 chars truncated]

### User | 2026-06-17T14:23:02.961Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/build-advisory-feature-catalog.mjs
3	//
4	// ROUTING-GRAPH-COMPLETENESS / U-ADVISORY-CATALOG (slot:alpha 2026-06-17). Operator
5	// directive: "find all automated and advisory features we have and plan accordingly
6	// for all of them."
7	//
8	// THE GAP (R8, verified by recon): PRISM's routing graph (feature-routing-graph.mjs
9	// TASK_CLASS_POLICY) hand-referen
... [+20978 chars truncated]

### Assistant | 2026-06-17T14:23:06.631Z

Now let me read the two test files and the upstream `feature-routing-graph.mjs` to verify the contracts (TASK_CLASS_POLICY shape, `classifyRoutingClass` return, `taskClasses()`).

### Assistant | 2026-06-17T14:23:07.137Z

[tool_use: Read]

### Assistant | 2026-06-17T14:23:07.598Z

[tool_use: Read]

### Assistant | 2026-06-17T14:23:07.908Z

[tool_use: Read]

### User | 2026-06-17T14:23:10.173Z

[tool_result] 1	// scripts/build-advisory-feature-catalog.test.mjs
2	//
3	// Tests for U-ADVISORY-CATALOG pure fns. R9: every assertion encodes WHY the
4	// behavior matters (a block-gate must never be misread as advisory -> a chat would
5	// not know a feature can hard-stop it; the byTaskClass projection must exclude
6	// orphans/passive -> the template would surface dead features). Reference inputs are
7	// r
... [+14698 chars truncated]

### User | 2026-06-17T14:23:10.322Z

[tool_result] 1	// scripts/lib/feature-routing-graph.mjs
2	//
3	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15) -- the
4	// UNIFIED feature-routing decision graph. Operator directive: "build a graph for
5	// you to follow on the most token efficient way to do every tool call and every
6	// task we've ever done" + auto-invoke commands without typing them.
7	//
8	// THE GAP THIS FILLS (veri
... [+22777 chars truncated]

### User | 2026-06-17T14:23:10.382Z

[tool_result] 1	// scripts/routing-utilization-audit.test.mjs
2	//
3	// Tests for U-ROUTING-UTILIZATION-AUDIT. R9: the audit's value is a TRUE coverage
4	// number + a frequency-weighted punch list -- a test must fail if coverage is
5	// miscomputed or a high-frequency thin class is NOT flagged.
6	
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	import { frequencyByClass, comput
... [+4829 chars truncated]

### Assistant | 2026-06-17T14:23:16.147Z

Now let me verify the key claims. First, the conservation invariant. The catalog's `byTaskClass`/`universalFeatures` split is keyed on `classConf > 0`, NOT on `curated`. The curated override sets `classConf = 1`. Let me trace whether a curated hook can land in BOTH buckets or whether the curated class can ever drift.

Let me verify two specific concerns: (1) whether the live catalog actually maintains conservation after the curated change, and (2) whether a curated hook whose body is unreadable still gets classified into a class (which would put it in `byTaskClass` even though it's `passive` and excluded from actionable — confirming no double-count).

### Assistant | 2026-06-17T14:23:22.545Z

[tool_use: Bash]

### User | 2026-06-17T14:23:29.645Z

[tool_result] actionableWired 284
classSpecificCount 89
universalCount 195
sum 284
conservation OK? true
curatedHits 18
ids in BOTH class+universal (must be 0): 0 []
ids in >1 class bucket (must be 0): 0 []
locate bucket: [ 'cag-router-inject', 'master-index-precheck-inject' ]

### Assistant | 2026-06-17T14:23:37.365Z

Conservation holds: 89+195=284, no id in both buckets, no id in >1 class. Now let me verify a subtle edge case the curated override introduces. The bucket split is on `classConf > 0`. A curated hook gets `classConf = 1`, so it goes to `byTaskClass[curatedClass]`. But what if a curated hook is `passive` or `mutator` (not actionable)? Then it's excluded from BOTH buckets regardless — fine. And what if `curatedClass` is a class but the body classifier would have given `conf 0`? The curated override is the whole point.

The real coupling risk: a curated hook could be attributed to a class, but if its `behavioralKind` is not actionable (e.g. a curated hook that is a `mutator`), it never reaches `byTaskClass`. Let me check whether all 18 curated hits are actually actionable and landed where expected, and confirm `curatedClassMap` first-class-wins determinism against the live `TASK_CLASS_POLICY` (Object.keys order is insertion order for string keys).

### Assistant | 2026-06-17T14:23:42.902Z

[tool_use: Bash]

### User | 2026-06-17T14:23:49.276Z

[tool_result] curated count: 18
curated by kind/wired: {
  'block-gate/wired': 9,
  'advisory-inject/wired': 8,
  'mutator/wired': 1
}
curated with conf!=1: []
curated but NOT actionable (excluded from buckets): [ 'enforce-handoff-topic:mutator:w' ]

### Assistant | 2026-06-17T14:23:53.843Z

This surfaces a meaningful integration subtlety. `enforce-handoff-topic` is curated into the `session` class (per TASK_CLASS_POLICY) but classified as `mutator`, so it's excluded from both buckets. The curated attribution is silently dropped for it — but that's correct behavior (conservation requires only actionable hooks in buckets), and it doesn't break conservation. Let me verify the `TASK_CLASS_POLICY` key order determinism and confirm no curated hook is mis-attributed due to first-class-wins, plus check the audit's degenerate-case guards.

### Assistant | 2026-06-17T14:23:58.233Z

[tool_use: Bash]

### User | 2026-06-17T14:24:07.169Z

[tool_result] policy key order: locate,build,plan,recall,learn,quote,physics,review,fix,orchestrate,session,domain
hooks curated into >1 class (first-wins applies):
   cag-router-inject -> locate,recall => wins: locate
   comprehensive-build-enforce -> build,plan => wins: build
   scrutinize-before-stop -> build,review,session => wins: build

### Assistant | 2026-06-17T14:24:15.420Z

This is the key finding for arm-A. Three hooks are curated into multiple classes, and "first class wins" by `Object.keys(TASK_CLASS_POLICY)` order (locate, build, plan...). Let me assess each for mis-attribution honesty:

- `cag-router-inject` → locate (wins over recall). It's the context-router; "locate" is defensible as primary.
- `comprehensive-build-enforce` → build (wins over plan). Build is its primary purpose. Defensible.
- `scrutinize-before-stop` → build (wins over **review** and session). This is the notable one: `scrutinize-before-stop` is the Stop-hook scrutiny gate — its canonical home is the **review** class, yet it gets attributed to **build** purely because `build` precedes `review` in key order.

Let me verify the impact: does this mis-attribution cause the `review` class to show as thin/empty in the punch list, or is `review` otherwise covered? This is the silent-coupling concern.

### Assistant | 2026-06-17T14:24:17.255Z

[tool_use: Bash]

### User | 2026-06-17T14:24:25.023Z

[tool_result] scrutinize-before-stop: {"taskClass":"build","curated":true,"conf":1,"kind":"block-gate","wired":true}
review bucket: [
  'ai-synergy-awareness-inject',
  'audit-viz-first-inject',
  'knowledge-link-audit-inject',
  'stop-wiring-audit-suggest'
]
review feature count: 4
build feature count: 14
classesWithoutSpecific: []

### Assistant | 2026-06-17T14:24:27.880Z

Now let me run the actual audit to see its live output and confirm the score/punch-list, then run both test suites to confirm they pass and pin intent.

### Assistant | 2026-06-17T14:24:28.859Z

[tool_use: Bash]

### Assistant | 2026-06-17T14:24:29.499Z

[tool_use: Bash]

### User | 2026-06-17T14:24:33.120Z

[tool_result] # ROUTING UTILIZATION AUDIT -- score 0.928 / 1.0
feature-coverage 1 (all wired actionable reachable) | class-coverage 1 | cmd-coverage 1 | knob-coverage 0.712
actionable 284 = class-specific 89 + universal 195 (universal skew 0.687)
hook kinds: mutator:174 passive:179 advisory-inject:354 block-gate:125

## per-class (features / gates / commands / prompt-freq%)
  build        feat  14 | gate   7 | 
... [+794 chars truncated]

### User | 2026-06-17T14:24:40.414Z

[tool_result]   ...
# Subtest: computeUtilization: empty catalog -> score computable, no throw (defensive)
ok 35 - computeUtilization: empty catalog -> score computable, no throw (defensive)
  ---
  duration_ms: 0.1154
  ...
# Subtest: renderAudit: produces the score header + per-class table + punch list
ok 36 - renderAudit: produces the score header + per-class table + punch list
  ---
  duration_ms: 0.4112
  
... [+227 chars truncated]

### Assistant | 2026-06-17T14:24:45.675Z

37/37 pass. The live audit confirms `review` lands at feat 4 / **gate 0** — meaning the curated review-class gate (`scrutinize-before-stop`) was stolen by `build`. The `review` class shows 0 gates even though `scrutinize-before-stop` IS the canonical review gate. The punch list is empty because `review` still has 4 (name-classified, conf>0) features so it isn't flagged as a hole.

Now let me verify the `utilizationScore` bounds claim and the punch-list severity logic with an adversarial trace, plus confirm the score can't exceed 1 or go negative.

### Assistant | 2026-06-17T14:24:50.292Z

[tool_use: Bash]

### User | 2026-06-17T14:24:58.799Z

[tool_result] featureCoverage when projected(10) > actionable(2): 5
utilizationScore (can it exceed 1?): 2
knobCoverage when withKnob(5)>wired(1): 5 score: 1.5

### Assistant | 2026-06-17T14:25:05.932Z

Confirmed: `utilizationScore` is NOT clamped to [0,1]. If the catalog's `classSpecificCount + universalCount > actionableWired` (a conservation *break* in the upstream catalog), `featureCoverage` exceeds 1 and the score balloons past 1 (here to 2.0). Same for `knobCoverage` if `withKnob > wired`. The docstring at line 110 claims "composite in [0,1]" and the test at line 71 asserts `<= 1` — but that only holds because the live catalog *happens* to conserve. The score is a CORRECTNESS SIGNAL: if the upstream catalog ever breaks conservation (the exact failure this audit exists to catch), the audit would silently emit a score >1 rather than flag it. That's a regression-detection gap, not a crash.

This is a real but bounded issue: in normal operation conservation holds (verified live), withKnob ≤ wired by construction (every knobbed hook is counted in records, and `wired` counts all wired records while withKnob counts knobbed records — a knobbed-but-unwired hook could make withKnob > wired). Let me verify whether withKnob > wired is actually reachable.

### Assistant | 2026-06-17T14:25:09.260Z

[tool_use: Bash]

### User | 2026-06-17T14:25:16.017Z

[tool_result] wired: 413 withKnob: 294
knobbed-but-UNWIRED hooks (inflate withKnob over wired): 103
knobCoverage in live audit: 0.712

### Assistant | 2026-06-17T14:25:22.925Z

Live numbers are safe (withKnob 294 < wired 413), but the structure confirms `withKnob` counts ALL knobbed records (including 103 unwired ones) while `knobCoverage = withKnob/wired`. There's a semantic mismatch: the numerator includes unwired hooks the denominator excludes. If knobbed-unwired hooks grew enough, `knobCoverage` could exceed 1. Today it's coincidentally under because there are more wired hooks overall. This is a P2 correctness smell in the metric, not a live break.

Let me confirm the fail-loud paths and verify the test integrity for the one tautology risk — the `computeUtilization` conservation test asserts `featureCoverage == 1` from a hand-built catalog that conserves, which is fine (it pins the formula), but let me confirm the determinism of perClass ordering doesn't depend on anything non-deterministic, and check that `feature-routing-graph.mjs` import path works (the audit fail-louds correctly).

### Assistant | 2026-06-17T14:25:23.998Z

[tool_use: Bash]

### User | 2026-06-17T14:25:31.053Z

[tool_result] routing-utilization-audit failed: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\nonexistent-prism\scripts\lib\feature-routing-graph.mjs' imported from H:\prism\scripts\routing-utilization-audit.mjs
EXIT: 0

### Assistant | 2026-06-17T14:25:35.391Z

Important finding: the fail-loud path. When `feature-routing-graph.mjs` is missing, the `await import()` rejects, but `main().catch()` prints the error AND **exits 0** (the `process.exit(1)` only fires in the `if (isMain)` wrapper, but the catch ran successfully and the process exited normally with code 0 because the catch handler completed). Let me verify this precisely — exit 0 on a fatal error contradicts "fail-loud" and would let a CI/cron treat a broken audit as success.

### Assistant | 2026-06-17T14:25:39.325Z

[tool_use: Bash]

### User | 2026-06-17T14:25:49.097Z

[tool_result] EXIT CODE: 1
---
Checking exit on the import-failure path:
import-fail exit: 1

### Assistant | 2026-06-17T14:25:53.694Z

Correction: the exit code IS 1 (the earlier "EXIT: 0" was from the `head` pipe's exit status, not node's). `process.exit(1)` fires correctly via `main().catch()`. The fail-loud path works as documented. Let me do a final confirmation that the JSON-missing path (vs import-missing) also exits 1, and check the `loadJsonOrThrow` ordering — the graph import happens BEFORE the JSON loads, so the error message for a missing catalog is the JSON one.

### Assistant | 2026-06-17T14:25:59.110Z

[tool_use: Bash]

### User | 2026-06-17T14:26:06.728Z

[tool_result] freq malformed entry: {"build":{"count":3,"pct":2}}
render minimal: # ROUTING UTILIZATION AUDIT -- score 0.5 / 1.0
feature-cover

### Assistant | 2026-06-17T14:26:29.631Z

All robustness checks pass. I have enough to render the verdict.

## Summary of trace

I traced the conservation invariant on the LIVE catalog (89 class-specific + 195 universal = 284 actionableWired, 0 ids in both buckets, 0 ids in >1 class), enumerated all 18 curated hits (9 wired gates + 8 wired advisors + 1 mutator), traced the 3 multi-class curated hooks through `curatedClassMap`'s first-class-wins (`Object.keys(TASK_CLASS_POLICY)` = insertion order: locate, build, plan...), ran both test suites (37/37 pass), and adversarially probed the score bounds, fail-loud exit codes (correctly exit 1), and degenerate-input guards.

---

VERDICT: PASS

summary: Conservation is intact — the curated override only changes WHICH class bucket a `conf>0` hook lands in, never whether it's bucketed; the split key (`classConf>0`) and the actionable filter (`wired && gate|advisory`) are untouched, so no double-count and no leak (verified live: 89+195=284, 0 ids in two buckets). Tests pin real intent. One genuine but bounded mis-attribution and one unclamped-metric smell, both P2 — neither breaks the live numbers.

findings:
- [P2] `scripts/lib/feature-routing-graph.mjs:153-154,116,122` + `build-advisory-feature-catalog.mjs:185-196` -- `scrutinize-before-stop` is curated into THREE classes (build, review, session) and "first class wins" attributes it to **build** purely because `build` precedes `review`/`session` in `TASK_CLASS_POLICY` key order. Its canonical home is `review` (it IS the scrutiny gate). Live effect: the `review` per-class row shows **gate 0** despite owning a wired block-gate, and `build` is credited a gate it doesn't conceptually own. Deterministic and honest (`conf=1.0` IS hand-curated), but the attribution is an artifact of key order, not intent. -- Fix: either order `TASK_CLASS_POLICY` so the most-specific owner precedes generic classes, OR let a hook appear in multiple class buckets (would require relaxing the single-bucket conservation rule — so the simpler fix
... [+1593 chars truncated]
