---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Arm-A review of PRISM's per-file scrutiny gate. Read END TO END: - H:\\prism\\scri"
date: "2026-06-17"
first_ts: "2026-06-17T13:50:30.280Z"
last_ts: "2026-06-17T13:53:01.026Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 13
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-aa8f109ad6bf07f2c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Arm-A review of PRISM's per-file scrutiny gate. Read END TO END: - H:\prism\scri

> **claude-code-cli** | 2026-06-17 | 35 msgs (13 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-aa8f109ad6bf07f2c.jsonl`

## Transcript

### User | 2026-06-17T13:50:30.280Z

Arm-A review of PRISM's per-file scrutiny gate. Read END TO END:
- H:\prism\scripts\task-graph-template.mjs
- H:\prism\scripts\task-graph-template.test.mjs

SPEC: This is the SYNTHESIS layer of PRISM's routing graph (operator: "make a template of the graph you auto-fill with relevant data for the task so you always follow the same thorough workflow"). fillTemplate(prompt) composes FOUR artifacts into one auto-filled "thorough workflow" graph:
- feature-routing-graph.mjs routeTaskClass() -> task class + TASK_CLASS_POLICY (ladder/model/commands/autoInvoke/loopCron/execution/antipattern)
- operator-prompt-route-map.json -> rank (how common this task type is)
- slash-command-plans.json -> class-specific commands
- advisory-feature-catalog.json (built this session) -> byTaskClass + universalFeatures (the GATES that hard-stop + ADVISORS that fire)
renderTemplate() emits a stable numbered checklist. Pure core (rankForClass/splitFeatures/composeTemplate/renderTemplate) + I/O fillTemplate (lazy-import + loadJsonSafe, fail-open). DETERMINISTIC (R5). Live: 11/11 tests; a build prompt fills class build #1 + 57 universal gates + 152 advisors; a physics prompt diverges to physics #8.

Weighted (arm-A): silent breakage, regression risk, integration coupling with the 4 artifact shapes, error-budget completeness, fail-open correctness.

VERIFY:
1. fillTemplate fail-open: if ANY artifact is missing/corrupt (route-map, slash-plans, catalog, or even feature-routing-graph), does it degrade gracefully (null/[] slot) or throw? Trace each loadJsonSafe + the routeTaskClass try/catch fallback.
2. Shape coupling: does composeTemplate read the artifact fields by the EXACT keys they emit? (map.classes[].{taskClass,count,pct}; plans.byClass[cls][].{name,archived}; catalog.byTaskClass[cls][].{id,kind,knob}; catalog.universalFeatures). Any field-name drift that would silently yield empty?
3. Silent loss (R12): the universalGates cap at 8 -- is universalGateCount the TRUE total (not the capped 8)? 
... [+462 chars truncated]

### Assistant | 2026-06-17T13:50:34.799Z

I'll review the synthesis layer end to end. Let me read both files and trace the artifact shapes they depend on.

### Assistant | 2026-06-17T13:50:35.245Z

[tool_use: Read]

### Assistant | 2026-06-17T13:50:35.336Z

[tool_use: Read]

### User | 2026-06-17T13:50:37.214Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/task-graph-template.mjs
3	//
4	// ROUTING-GRAPH-COMPLETENESS / U-TASK-GRAPH-TEMPLATE (slot:alpha 2026-06-17). Operator
5	// directive: "make a template of the graph that you can auto fill with relevant data
6	// for the task you're trying to accomplish so you always follow the same thorough
7	// workflow."
8	//
9	// This is the SYNTHESIS layer: the four routing a
... [+10759 chars truncated]

### User | 2026-06-17T13:50:38.442Z

[tool_result] 1	// scripts/task-graph-template.test.mjs
2	//
3	// Tests for U-TASK-GRAPH-TEMPLATE. R9: assertions encode WHY -- the template's whole
4	// value is surfacing the GATES that will hard-stop a task (so a chat complies first
5	// try) and the SAME ordered routine every time; a test must fail if a gate is hidden
6	// or the routine shape drifts. Includes a LIVE integration test against the real four
7
... [+7649 chars truncated]

### Assistant | 2026-06-17T13:50:42.476Z

I need to verify the artifact shapes the synthesis layer couples to. Let me read the source artifacts: feature-routing-graph.mjs (especially routeTaskClass, classifyRoutingClass, TASK_CLASS_POLICY) and check the JSON artifact shapes, plus the prompt-route-inject.rankFor it claims to mirror.

### Assistant | 2026-06-17T13:50:43.380Z

[tool_use: Read]

### User | 2026-06-17T13:50:44.267Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\feature-routing-graph.mjs' was already read 24m ago in this session and is unchanged (mtime 1781649189827). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T13:50:44.827Z

[tool_use: Bash]

### User | 2026-06-17T13:50:50.327Z

[tool_result] {
  "schemaVersion": 1,
  "generatedNote": "U-PROMPT-EXTRACT. Genuine human prompts+commands across ALL session transcripts, deduped, classified by feature-routing-graph.classifyRoutingClass. Route per class = TASK_CLASS_POLICY.",
  "routeFieldNote": "Per-class route is a GEN-TIME SNAPSHOT of feature-routing-graph TASK_CLASS_POLICY (canonical). Regenerate to refresh. prompt-route-inject.mjs reads 
... [+6134 chars truncated]

### Assistant | 2026-06-17T13:50:55.546Z

The artifact shapes confirm. Now let me verify the exact key shapes the compose reads against what's emitted, and check the `feature-routing-graph.mjs` API (routeTaskClass, classifyRoutingClass, TASK_CLASS_POLICY) since it was read earlier this session but I need to confirm the return shapes.

### Assistant | 2026-06-17T13:50:57.431Z

[tool_use: Grep]

### Assistant | 2026-06-17T13:50:58.462Z

[tool_use: Bash]

### User | 2026-06-17T13:50:58.949Z

[tool_result] 37:export const TASK_CLASS_POLICY = Object.freeze({
38-  locate: {
39-    trigger: "where is X / find / which file / is there / does X exist / search for",
40-    substrateLadder: ["master-graph", "obsidian", "wiki", "tribal", "grep"],
41-    modelTier: "ollama-or-sonnet (mechanical lookup; never opus)",
42-    commands: ["/master-index", "/node-card", "/deep-search"],
43-    hooks: ["master-index
... [+1826 chars truncated]

### User | 2026-06-17T13:51:04.254Z

[tool_result]   ...
# Subtest: renderTemplate: empty/invalid template -> empty string (no crash)
ok 9 - renderTemplate: empty/invalid template -> empty string (no crash)
  ---
  duration_ms: 0.1839
  ...
# Subtest: fillTemplate: LIVE -- a build prompt routes to build + surfaces real hard gates
ok 10 - fillTemplate: LIVE -- a build prompt routes to build + surfaces real hard gates
  ---
  duration_ms: 17.3829
  
... [+322 chars truncated]

### Assistant | 2026-06-17T13:51:10.769Z

I notice a critical anomaly in the Grep output. Let me look at line 244 of feature-routing-graph.mjs closely — the Grep shows `\ confidence: matched score over...` which looks like a corrupted/escaped line. Let me verify the actual content there, and also confirm routeTaskClass's full return shape (whether `policy` is included) and `classifyRoutingClass` return for `confidence`.

### Assistant | 2026-06-17T13:51:10.976Z

[tool_use: Read]

### User | 2026-06-17T13:51:11.852Z

[tool_result] 240	  for (const cls of TIE_BREAK) {
241	    if (scores[cls] > bestScore) { bestScore = scores[cls]; best = cls; }
242	  }
243	  if (bestScore <= 0) return { taskClass: "build", score: 0, confidence: 0, scores };
244	  // confidence: matched score over a soft ceiling of 4 (two specific phrases).
245	  const confidence = Math.min(1, bestScore / 4);
246	  return { taskClass: best, score: bestScore, 
... [+2233 chars truncated]

### Assistant | 2026-06-17T13:51:21.340Z

The Grep output earlier showed `\ confidence:` but the actual Read at line 244 shows `// confidence:` — that was an RTK/grep rendering artifact, not real corruption. Good. The source is clean.

Now I have everything I need. Let me trace each verification point precisely.

**Confirmed facts from tracing:**

1. **`routeTaskClass` return shape** (line 287-297): `{ taskClass, confidence, scores, policy, live }`. `composeTemplate` reads `route.taskClass`, `route.policy`, `route.confidence` — all present. ✓ And `routeTaskClass` itself fails open internally (each `try/catch`), so it won't throw for cag/model/substrate absence.

2. **`classifyRoutingClass` fallback shape** (line 246): `{ taskClass, score, confidence, scores }`. The `fillTemplate` catch path (line 177-178) builds `{ taskClass: r.taskClass, confidence: r.confidence, policy: graph.TASK_CLASS_POLICY[r.taskClass] }` — matches what `composeTemplate` reads. ✓

3. **Artifact key coupling** — verified against live files:
   - `map.classes[].{taskClass,count,pct}` + `map.total` ✓ (route-map confirmed)
   - `plans.byClass[cls]` — **MISMATCH.** See below.
   - `catalog.byTaskClass[cls][].{id,kind,knob}` ✓ + `catalog.universalFeatures` — need to verify universalFeatures exists.

Let me verify the two coupling points I'm now suspicious of: `plans.byClass` (the live file uses `routes` and `classCoverage`, I did NOT see `byClass`) and `catalog.universalFeatures`.

### Assistant | 2026-06-17T13:51:25.475Z

[tool_use: Bash]

### User | 2026-06-17T13:51:30.155Z

[tool_result] plans top keys: [
  'schemaVersion',
  'generated_at',
  'note',
  'total',
  'distinctNames',
  'sources',
  'truncatedFrontmatter',
  'classCoverage',
  'routes',
  'byClass'
]
plans.byClass exists? true
byClass.build len: 667 sample: {"name":"awareness-snapshot","when":"One-shot PRISM awareness snapshot — built/wired/utilized/drifted in 60 lines. Regenerates state/shared/AWARENESS-SNAPSHOT.md b
... [+791 chars truncated]

### Assistant | 2026-06-17T13:51:36.530Z

All key couplings verified against live artifacts: `plans.byClass[cls][].{name,archived}` ✓, `catalog.byTaskClass[cls][].{id,kind,knob}` ✓, `catalog.universalFeatures[].{id,kind,knob}` ✓ (202 entries). Now let me trace the two genuine fail-open risk points I want to nail down: (1) what happens if `feature-routing-graph.mjs` itself is missing — the top-level `await import` at line 170 has no try/catch; and (2) confirm the spec's claimed live numbers (57 gates / 152 advisors) and that the cap doesn't hide the advisor count.

### Assistant | 2026-06-17T13:51:40.093Z

[tool_use: Bash]

### User | 2026-06-17T13:51:47.695Z

[tool_result] class: build conf: 1
universalGates shown: 8 TRUE count: 57
classGates: 5 classAdvisors: 7 universalAdvisorCount: 145
classCommands: 8
physics prompt class: physics

### Assistant | 2026-06-17T13:51:52.039Z

Live numbers confirmed: build prompt → 57 true universal gates (only 8 rendered, count preserved), 145 universal advisors (uncapped count), classGates 5 + classAdvisors 7. The physics prompt diverges to `physics`. The spec's "57 gates + 152 advisors" matches (7 class + 145 universal = 152 advisors).

Now the two genuine concerns: the top-level `await import` of feature-routing-graph at line 170 (no try/catch — VERIFY #1 partial gap), and the advisor cap behavior. Let me test the fail-open boundary directly.

### Assistant | 2026-06-17T13:51:59.212Z

[tool_use: Bash]

### User | 2026-06-17T13:52:02.965Z

[tool_result] Exit code 1
all-null artifacts -> no throw. classGates: 0 gateCount: 0
----- fresh process with bogus PRISM_ROOT (tests top-level import fail-open) -----
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'H:\h\prism\scripts\task-graph-template.mjs' imported from H:\prism\[eval]
    at finalizeResolution (nod
... [+817 chars truncated]

### Assistant | 2026-06-17T13:52:06.500Z

That was a path-quoting error in my test ($PWD expanded wrong under the env var). Let me fix the test to properly load the module from an absolute path while setting PRISM_ROOT to a bogus location, to verify whether the top-level `await import` of feature-routing-graph (line 170) fails open or throws.

### Assistant | 2026-06-17T13:52:11.345Z

[tool_use: Bash]

### User | 2026-06-17T13:52:17.158Z

[tool_result] === bogus PRISM_ROOT (feature-routing-graph missing) ===
node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsup
... [+1610 chars truncated]

### Assistant | 2026-06-17T13:52:21.181Z

The bash heredoc passed a bare Windows path (`H:/prism/...`) to a dynamic `import()` which requires a `file://` URL. That's my test harness error, not a code defect. The actual code at line 170 uses `pathToFileURL(...).href`, so it constructs a proper URL. Let me redo the fail-open test correctly using `pathToFileURL`.

### Assistant | 2026-06-17T13:52:23.496Z

[tool_use: Bash]

### User | 2026-06-17T13:52:30.105Z

[tool_result] === bogus PRISM_ROOT => feature-routing-graph import target missing ===
THREW: ERR_MODULE_NOT_FOUND

### Assistant | 2026-06-17T13:53:01.026Z

Confirmed the one real gap in the fail-open claim. When `feature-routing-graph.mjs` itself is missing/unresolvable, the top-level `await import` at line 170 **throws `ERR_MODULE_NOT_FOUND` uncaught** — `fillTemplate` rejects rather than degrading. The module-doc (lines 19-20) and the spec both claim "a missing artifact degrades that slot to null, never throws (R12)" and explicitly name "even feature-routing-graph" as a fail-open input. So the doc over-promises versus reality for one of the four artifacts.

Severity calibration: this is the *base* artifact (the others compose around it), it's an in-repo committed module (not an external/optional artifact), and the CLI `.catch()` at line 203 prints "task-graph-template failed:" + exits 1 rather than crashing the harness — so it fails *loud*, not silent. It's a doc/contract overclaim, not a silent-breakage P0. The other three artifacts (the JSON files, which are the genuinely-volatile/regenerated inputs) DO correctly fail open via `loadJsonSafe`. I'll grade this P2.

All other verification points pass. Final assessment:

VERDICT: PASS

summary: The synthesis layer composes the four routing artifacts with correct key coupling (verified live: `map.classes[].{taskClass,count,pct}`+`total`, `plans.byClass[cls][].{name,archived}`, `catalog.byTaskClass[cls][].{id,kind,knob}`, `catalog.universalFeatures` — all present, no field drift). The 8-item cap on `universalGates` preserves the true total in `universalGateCount` (live: 57 true vs 8 shown), and the universal *advisor* path is never capped (`universalAdvisorCount` = full 145). The only deviation is a doc-vs-reality overclaim: the base `feature-routing-graph.mjs` import is NOT fail-open (it throws if that module is missing), contradicting the module header — but it fails loud at the CLI, not silent, so it is a P2.

findings:
- [P2] H:\prism\scripts\task-graph-template.mjs:170 -- The top-level `await import(...feature-routing-graph.mjs)` has no try/catch, so a missing/unres
... [+3226 chars truncated]
