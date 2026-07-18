---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Read these two files END TO END and review as arm-A (analyst) of PRISM's per-fil"
date: "2026-06-17"
first_ts: "2026-06-17T13:18:27.173Z"
last_ts: "2026-06-17T13:20:55.795Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 15
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a6100d969f3cb6854.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Read these two files END TO END and review as arm-A (analyst) of PRISM's per-fil

> **claude-code-cli** | 2026-06-17 | 39 msgs (15 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a6100d969f3cb6854.jsonl`

## Transcript

### User | 2026-06-17T13:18:27.173Z

Read these two files END TO END and review as arm-A (analyst) of PRISM's per-file scrutiny gate:
- H:\prism\scripts\build-advisory-feature-catalog.mjs
- H:\prism\scripts\build-advisory-feature-catalog.test.mjs

CONTEXT / SPEC this must satisfy:
- It is a DETERMINISTIC generator (no LLM) that CONSUMES the canonical H:\prism\state\shared\HOOK_REGISTRY.json (built by build-hook-registry.mjs) and ENRICHES each hook with 3 routing dimensions the registry lacks: behavioralKind (block-gate | advisory-inject | mutator | passive), taskClass (via feature-routing-graph.classifyRoutingClass), and the env disable knob. It emits state/shared/advisory-feature-catalog.json + a per-task-class projection (byTaskClass) that a downstream "task-graph template" will read.
- It must NOT re-enumerate hooks (R8: the registry is the canonical enumeration).
- Live run output: 832 hooks, wired 413, automated(gate) 134, advisory(inject) 355, knobbed 290. 20/20 tests pass.

Weighted toward (arm-A focus): silent breakage, regression risk, I/O correctness, error-budget completeness, integration coupling with HOOK_REGISTRY.json shape + feature-routing-graph exports.

Specifically verify:
1. classifyBehavioralKind regex correctness: does it correctly catch block-gate forms (bare AND quoted keys: `decision: "block"`, `"decision":"block"`, `permissionDecision: "deny"`, `continue: false`, `process.exit(2)`)? Any FALSE-POSITIVE risk (e.g. matching `decision: "block"` inside a comment or a string that DESCRIBES another hook)? Any FALSE-NEGATIVE still remaining?
2. Precedence: block-gate must win when a hook both blocks and injects. Confirmed in code + test?
3. The byTaskClass projection: it includes ONLY wired + (block-gate|advisory-inject) + classConf>0. Is that the right filter? Does any genuinely-actionable feature get wrongly excluded (e.g. a wired gate whose name classifies to conf 0 -> dropped from EVERY class -> invisible to the template)? The `locate` class came out with ZERO features -- is that 
... [+439 chars truncated]

### Assistant | 2026-06-17T13:18:31.366Z

I'll read both files end to end, then trace the integration points (HOOK_REGISTRY.json shape and feature-routing-graph exports).

### Assistant | 2026-06-17T13:18:31.854Z

[tool_use: Read]

### Assistant | 2026-06-17T13:18:32.280Z

[tool_use: Read]

### User | 2026-06-17T13:18:32.807Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/build-advisory-feature-catalog.mjs
3	//
4	// ROUTING-GRAPH-COMPLETENESS / U-ADVISORY-CATALOG (slot:alpha 2026-06-17). Operator
5	// directive: "find all automated and advisory features we have and plan accordingly
6	// for all of them."
7	//
8	// THE GAP (R8, verified by recon): PRISM's routing graph (feature-routing-graph.mjs
9	// TASK_CLASS_POLICY) hand-referen
... [+13581 chars truncated]

### User | 2026-06-17T13:18:33.316Z

[tool_result] 1	// scripts/build-advisory-feature-catalog.test.mjs
2	//
3	// Tests for U-ADVISORY-CATALOG pure fns. R9: every assertion encodes WHY the
4	// behavior matters (a block-gate must never be misread as advisory -> a chat would
5	// not know a feature can hard-stop it; the byTaskClass projection must exclude
6	// orphans/passive -> the template would surface dead features). Reference inputs are
7	// r
... [+9017 chars truncated]

### Assistant | 2026-06-17T13:18:36.490Z

I have both files. Now let me verify the integration points: the `feature-routing-graph.mjs` exports (`classifyRoutingClass`, `taskClasses`) and the `HOOK_REGISTRY.json` shape that this generator consumes.

### Assistant | 2026-06-17T13:18:37.437Z

[tool_use: Read]

### User | 2026-06-17T13:18:37.854Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\feature-routing-graph.mjs' was already read 28m ago in this session and is unchanged (mtime 1781649189827). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T13:18:39.217Z

[tool_use: Bash]

### User | 2026-06-17T13:18:42.556Z

[tool_result] hooks: 832
top-level keys: schemaVersion,generatedAt,generatedBy,repoRoot,hooksDir,settingsLayers,counts,hooks,skipped
sample hook keys: id,file,wired,disabled,events,description,descriptionInferred,tier,sizeBytes,lines
sample: {
 "id": "_envelope",
 "file": ".claude/hooks/_envelope.mjs",
 "wired": false,
 "disabled": false,
 "events": [],
 "description": "HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)",
... [+120 chars truncated]

### Assistant | 2026-06-17T13:18:46.241Z

The registry shape matches consumption: `hooks[]` with `id/file/wired/events[{event}]/description/tier`. The read-once guard says I already read `feature-routing-graph.mjs` 28m ago this session — but I want to confirm the exact exports and `classifyRoutingClass` behavior. Let me grep the load-bearing parts.

### Assistant | 2026-06-17T13:18:47.743Z

[tool_use: Grep]

### User | 2026-06-17T13:18:49.103Z

[tool_result] 218- * Pure: classify a prompt into one of the 12 task classes. Scores each class by
219- * counting matched signal phrases (multi-word phrase = 2 pts, single word = 1).
220- * Ties break by TIE_BREAK precedence. Empty/again-only prompt -> 'build' default
221: * (the most common substantive intent) with score 0 + low confidence.
222- */
223-\ NOTE (R7): named classifyRoutingClass, NOT classifyTask
... [+2230 chars truncated]

### Assistant | 2026-06-17T13:18:53.982Z

Both exports confirmed: `classifyRoutingClass(prompt)` returns `{taskClass, score, confidence, scores}` and `taskClasses()` returns `Object.keys(TASK_CLASS_POLICY)`. The contract matches what `enrichHook` and `buildCatalog` consume (`r.taskClass`, `r.confidence`). Now let me verify the specific concerns: (1) `classConf=0` exclusion, (2) the `locate` class coverage hole, (3) the `_DISABLE` vs `_FAIL_CLOSED` knob edge, and (4) whether any wired block-gate hooks could classify to conf 0 and become invisible.

### Assistant | 2026-06-17T13:18:56.342Z

[tool_use: Grep]

### User | 2026-06-17T13:18:57.878Z

[tool_result] 37:export const TASK_CLASS_POLICY = Object.freeze({
38:  locate: {
49:  build: {
60:  plan: {
115:  review: {
126:  fix: {
137:  orchestrate: {
187:  review: [["scrutinize"], ["code review"], ["review the"], ["audit"], ["verify the diff"], ["3-of-3"]],
191:  fix: [["fix"], ["debug"], ["broken"], ["failing"], ["regression"], ["not working"], ["bug"], ["error"], ["investigate why"], ["investigate th
... [+758 chars truncated]

### Assistant | 2026-06-17T13:18:59.059Z

[tool_use: Bash]

### User | 2026-06-17T13:19:03.790Z

[tool_result] advisory-feature-catalog: 832 hooks | wired 413 | automated(gate) 134 | advisory(inject) 355 | knobbed 290
per-class actionable features  session:18  fix:18  build:12  orchestrate:10  domain:7  review:5  learn:5  recall:4  quote:2  plan:2  physics:2
WARN classes with NO actionable feature: locate
-> H:\prism\state\shared\advisory-feature-catalog.json
---CLASSESWITHOUT---
classesWithout: ["locate"]
... [+224 chars truncated]

### Assistant | 2026-06-17T13:19:07.531Z

Live run reproduces the stated output (832/413/134/355/290) and confirms `locate` is the only empty class. Now let me check whether `locate` is a real coverage hole — i.e. whether any wired, actionable hook would classify to `locate` but doesn't, and whether conf-0 block-gates are being silently dropped. Let me look at what gets classified and run the test suite.

### Assistant | 2026-06-17T13:19:11.305Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:19:11.900Z

[tool_use: Bash]

### User | 2026-06-17T13:19:14.735Z

[tool_result] WIRED actionable but classConf=0 (invisible to template): 205
   block-gate build agent-boundary-guard
   advisory-inject build agent-pid-tracker
   advisory-inject build agent-rules-inject
   advisory-inject build agent-vs-direct
   advisory-inject build ai-feature-recommend
   advisory-inject build ai-reasoning-inject
   advisory-inject build alpha-token-domain-awareness-inject
   block-gate bui
... [+1527 chars truncated]

### User | 2026-06-17T13:19:18.249Z

[tool_result]   ...
# Subtest: aggregateCatalog: withKnob counts knobbed records
ok 20 - aggregateCatalog: withKnob counts knobbed records
  ---
  duration_ms: 5.5776
  ...
1..20
# tests 20
# suites 0
# pass 20
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 71.29

### Assistant | 2026-06-17T13:19:22.339Z

This is the key finding. 205 wired+actionable hooks (61 of them **block-gates**) classify to `classConf=0` and are **silently dropped from every task class** — they never appear in the `byTaskClass` projection the template reads. The classifier defaults conf-0 hits to `taskClass:"build"` but they're filtered out by the `classConf > 0` guard. Let me confirm the nature of these conf-0 block-gates (are they real gates a chat would meet) and check whether `locate` actually has any candidate hooks.

### Assistant | 2026-06-17T13:19:27.771Z

[tool_use: Bash]

### User | 2026-06-17T13:19:31.759Z

[tool_result] duplication-hard-block             kind=block-gate conf=0 cls=build wired=true -> DROPPED
comprehensive-build-enforce        kind=advisory-inject conf=0.25 cls=build wired=true -> IN byTaskClass
file-claim-guard                   kind=block-gate conf=0 cls=build wired=true -> DROPPED
scrutinize-before-stop             kind=block-gate conf=0.25 cls=review wired=true -> IN byTaskClass
stop_on_failin
... [+508 chars truncated]

### Assistant | 2026-06-17T13:19:36.803Z

Confirmed and concrete. The flagship gates the operator named in CLAUDE.md — `duplication-hard-block`, `file-claim-guard`, `asset-deletion-block`, `critical-file-guard` — are **DROPPED from the projection** because the classifier scores their id+description at conf 0. Only 85 of 290 wired-actionable features survive. Let me now check the FALSE-POSITIVE risk in `classifyBehavioralKind` (the comment/string-describing-another-hook concern) and the BODY_CAP concern against real hook sizes.

### Assistant | 2026-06-17T13:19:39.635Z

[tool_use: Bash]

### User | 2026-06-17T13:19:43.892Z

[tool_result] hooks > 256K (BODY_CAP truncation risk): 0 
max hook sizeBytes: 43958

### Assistant | 2026-06-17T13:19:45.314Z

[tool_use: Bash]

### User | 2026-06-17T13:19:48.995Z

[tool_result] (node:7484) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\build-advisory-feature-catalog.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
comment-only decision:block -> block-gate
string describing peer  -> advis
... [+88 chars truncated]

### Assistant | 2026-06-17T13:19:55.066Z

Both confirmed. BODY_CAP is safe (max hook is 44K, well under 256K — no truncation risk in any real hook). The false-positive probes confirm the regex matches block patterns inside **comments and JSDoc** (`// ... decision:"block"`, `// process.exit(2) on bad input`, `/* returns continue:false */`). And the peer-describing-string case (`"duplication-hard-block emits decision:block"`) is masked by precedence — it has `additionalContext` so it lands on advisory-inject, but a hook that ONLY mentions a peer's `decision:block` in a string with no inject would mis-classify as block-gate.

Let me quantify how prevalent comment-borne false positives actually are in the real corpus, to grade severity correctly.

### Assistant | 2026-06-17T13:20:01.804Z

[tool_use: Bash]

### User | 2026-06-17T13:20:05.649Z

[tool_result] block-gate hooks whose ONLY block-signal is inside a comment (FALSE POSITIVE): 10 of 134 block-gates
samples: anti-regression-auto-sweep, cog-bridge-context-auto-compact, error-block-capture, html-companion-guard, permission-denied-retry, read-bundle, stop-playbook-corpus-drift-advisory, stop-regression-backflow, stop-slot-task-claims-advisory, stop-system-viz-drift

### Assistant | 2026-06-17T13:20:11.678Z

Concrete: 10 of 134 (7.5%) of the "block-gates" are false positives — their only block signal lives in a comment. E.g. `stop-slot-task-claims-advisory` (the name says *advisory*) and `stop-playbook-corpus-drift-advisory` are counted as automated GATES. This inflates `automated(gate) 134` and can misroute a chat into thinking an advisory hook will hard-stop it.

I now have everything needed. Let me do a final check on the `--check` mode correctness (the determinism / non-deterministic field concern) since `byTaskClass` is the compared projection but `enrichHook` rounds confidence — confirm `generated_at` isn't compared and the comparison is stable.

### Assistant | 2026-06-17T13:20:13.681Z

[tool_use: Bash]

### User | 2026-06-17T13:20:18.837Z

[tool_result] catalog fresh
--- query mode ---
# task class: review  (5 actionable automated/advisory features)
  [GATE ] scrutinize-before-stop  (Stop)
  [ADVIS] ai-synergy-awareness-inject  (UserPromptSubmit)  mute:PRISM_AI_SYNERGY_AWARENESS_DISABLE
  [ADVIS] audit-viz-first-inject  (UserPromptSubmit)  mute:PRISM_AUDIT_VIZ_FIRST_DISABLE
  [ADVIS] knowledge-link-audit-inject  (SessionStart)
  [ADVIS] stop-wiri
... [+233 chars truncated]

### Assistant | 2026-06-17T13:20:55.795Z

All modes work as specified. `--check` ignores timestamps (compares only `byTaskClass` + `totalRecords`), reproduces "fresh", `--query` works and exits 1 on the missing `locate` class. I have everything to grade.

## VERDICT: FAIL

**summary:** The generator is well-engineered on I/O and behavioral classification (atomic tmp+rename, fail-loud registry load, fail-soft body read, BODY_CAP safe vs 44K-max real hooks, deterministic `--check`). But the `byTaskClass` projection — the single artifact the downstream task-graph template consumes — silently drops **205 of 290** wired+actionable features (including 61 block-gates) because `classConf > 0` filters out every hook the keyword classifier scores at 0. The flagship hard gates the operator named in CLAUDE.md (`duplication-hard-block`, `file-claim-guard`, `asset-deletion-block`, `critical-file-guard`) are invisible to the template. Separately, ~7.5% of the "automated gate" count is inflated by comment-borne false positives.

**findings:**

- **[P1] build-advisory-feature-catalog.mjs:144** — The `r.classConf > 0` filter silently drops every wired+actionable feature the classifier scores at conf 0. Live: **205 of 290** wired gates/injectors are excluded from `byTaskClass`; **61 are block-gates**, including `duplication-hard-block`, `file-claim-guard`, `asset-deletion-block`, `critical-file-guard` (all `conf=0`, default-bucketed to `build`, then filtered out). These are exactly the hard-stops a chat MUST be told about, yet the template that reads this projection will never surface them. The comment at lines 128-129 justifies the filter as "don't flood the build bucket with unclassifiable hooks" — but the cure throws away load-bearing gates with the noise. **Fix:** keep wired block-gates regardless of classConf (route conf-0 actionable hooks to a `build` fallback or a dedicated `unclassified` bucket), so no automated gate is invisible. At minimum, block-gates must never be conf-gated out.

- **[P1] build-advisory-feature-c
... [+4250 chars truncated]
