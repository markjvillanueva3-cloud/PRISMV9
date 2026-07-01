---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Re-verify a P1 fix in PRISM's agent-fanout-pressure-gate (the prior review FAILe"
date: "2026-06-18"
first_ts: "2026-06-18T03:12:23.303Z"
last_ts: "2026-06-18T03:15:46.290Z"
cwd: "H:\\prism"
messages: 41
user_msgs: 16
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ad814a28c590543a3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Re-verify a P1 fix in PRISM's agent-fanout-pressure-gate (the prior review FAILe

> **claude-code-cli** | 2026-06-18 | 41 msgs (16 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-ad814a28c590543a3.jsonl`

## Transcript

### User | 2026-06-18T03:12:23.303Z

Re-verify a P1 fix in PRISM's agent-fanout-pressure-gate (the prior review FAILed it). Use `git -C H:/prism diff` for the working-tree changes. Grade PASS/FAIL with file:line.

CONTEXT: a routing change made coding/build route to the "sonnet" tier (was "opus"). The prior FAIL: `classifyWorkflowMechanical` (.claude/hooks/agent-fanout-pressure-gate.mjs) keyed "mechanical" off the opus/fable tier name, so a builder Workflow fan-out (now sonnet) was mis-classified mechanical → the wired PreToolUse gate HARD-BLOCKED legitimate builder fan-out, and its test passed only via stubs encoding the old assumption.

THE FIX TO VERIFY:
1. classifyWorkflowMechanical now uses a POSITIVE allowlist `MECHANICAL_CLASSES = {summarize,explain,document,classify,format,git_summary,extract}` — a fan-out is mechanical ONLY when every agent's taskClass is in that set; codegen/audit/synthesize/reason/unknown/safety all → judgment (allow). The BUILD_CLASSES import was removed (allowlist excludes coding automatically).
2. Real-router (non-stub) regression tests were added: an all-coding Workflow → NOT mechanical (judgmentCount 3); a genuine summarize/classify/explain fan-out → still mechanical. The DI stubs (mech, byKeyword) were updated to return {tier, taskClass} faithful to the real routeClaudeTier contract.

VERIFY SPECIFICALLY:
- Run `node .claude/hooks/agent-fanout-pressure-gate.test.mjs` — confirm 19/19 pass, 0 skip.
- Is the allowlist CORRECT vs the real classifyTaskClass class labels? (scripts/lib/local-llm-task-router.mjs CLASS_TO_CATEGORY keys: summarize/explain/document/classify/format/git_summary/audit/synthesize/codegen/reason/extract/unknown). Confirm MECHANICAL_CLASSES contains exactly the cheap read/transform classes and EXCLUDES codegen/audit/synthesize/reason/unknown.
- LIVE-trace: with the REAL routeClaudeTier, does a builder Workflow ["implement the engine and wire the dispatcher","write the engine code and add the tests","refactor the routing module"] now classify mechanical
... [+812 chars truncated]

### Assistant | 2026-06-18T03:12:26.623Z

I'll verify this P1 fix systematically. Let me start by examining the working-tree changes and the relevant files.

### Assistant | 2026-06-18T03:12:27.570Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:12:27.808Z

[tool_use: Read]

### User | 2026-06-18T03:12:28.868Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * agent-fanout-pressure-gate.mjs -- PreToolUse(Agent/Task/Workflow) fan-out admission gate.
5	 * GOLF-SKILLS-HOOKS-AUDIT / U-GSHA-FANOUT-GATE (slot:golf 2026-06-12).
6	 *
7	 * THE MISSING ARM. The Agent matcher already runs:
8	 *   - agent-vs-direct.mjs       -> "use a direct tool instead of an Agent" (zero-agent advice)
9	 *   - subagent-model-enforce.
... [+13752 chars truncated]

### User | 2026-06-18T03:12:32.448Z

[tool_result] <persisted-output>
Output too large (257.8KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\ad9c3041-c806-4424-9eed-fea97a4fc64b\tool-results\b0ia30kb2.txt

Preview (first 2KB):
warning: in the working copy of '.claude/scripts/consensus-queue-drain.mjs', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'knowledge/memories/reference/plugin_a
... [+1807 chars truncated]

### Assistant | 2026-06-18T03:12:35.138Z

The hook file is read. Now let me look at the targeted diff for the changed files, the test file, and the real router contracts in parallel.

### Assistant | 2026-06-18T03:12:36.555Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:12:36.925Z

[tool_use: Read]

### User | 2026-06-18T03:12:37.861Z

[tool_result] 1	// tier: T3
2	// Tests for agent-fanout-pressure-gate.mjs -- the mechanical-fan-out enforcement arm
3	// (U-FANOUT-MECH-ENFORCE). Pure functions; importing the hook is side-effect-free (isMain is false
4	// under the test runner, so main() never fires). Most tests inject a fake router (DI, hermetic), but
5	// the LIVE-COUPLING regression tests wire the REAL routeClaudeTier so the gate's tier/tas
... [+7747 chars truncated]

### User | 2026-06-18T03:12:40.182Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-18T03:12:42.801Z

The git diff for those two files returned empty, which means they may be untracked (new files) or already staged. Let me check their git status and look at the real router contracts.

### Assistant | 2026-06-18T03:12:44.637Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:12:45.287Z

[tool_use: Read]

### User | 2026-06-18T03:12:46.746Z

[tool_result] 1	/**
2	 * claude-tier-router.mjs -- pure: decide WHICH CLAUDE TIER (fable/opus/sonnet/haiku) a Claude-bound
3	 * task uses (U-CLAUDE-TIER-ROUTE, slot:india 2026-06-11). The MISSING LAYER above the canonical
4	 * executor contract.
5	 *
6	 * WHAT ALREADY EXISTS (reused here, NOT re-derived -- R7/R8):
7	 *   - [[local-llm-task-router]] classifyTaskClass(task) -> {taskClass, category} + isSafetyCrit
... [+7335 chars truncated]

### User | 2026-06-18T03:12:50.250Z

[tool_result] ?? .claude/hooks/agent-fanout-pressure-gate.mjs
?? .claude/hooks/agent-fanout-pressure-gate.test.mjs
---HEAD-EXISTS---
fatal: path '.claude/hooks/agent-fanout-pressure-gate.mjs' exists on disk, but not in 'HEAD'
untracked-or-new

### Assistant | 2026-06-18T03:12:54.300Z

Now I understand the structure. The gate files are untracked (new). The task says use `git diff` for working-tree changes — but these specific files are new/untracked, so the relevant "change" is the current content. Let me verify the real router's CLASS_TO_CATEGORY keys in `local-llm-task-router.mjs` and the `classifyTaskClass` labels, then run the tests.

### Assistant | 2026-06-18T03:12:55.873Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:12:57.283Z

[tool_use: Grep]

### User | 2026-06-18T03:12:58.792Z

[tool_result] 74:const CLASS_TO_CATEGORY = Object.freeze({
109:const CLASS_PATTERNS = [
137: * @returns {{ taskClass: string, category: string }}
141:    return { taskClass: "unknown", category: CLASS_TO_CATEGORY.unknown };
144:    if (re.test(task)) return { taskClass: cls, category: CLASS_TO_CATEGORY[cls] };
146:  return { taskClass: "unknown", category: CLASS_TO_CATEGORY.unknown };
190:      taskClass: "safe
... [+13 chars truncated]

### User | 2026-06-18T03:13:00.203Z

[tool_result] 72:// taskClass → cost-router category (CATEGORY_TIER keys). Unmapped → "summary"
74:const CLASS_TO_CATEGORY = Object.freeze({
137: * @returns {{ taskClass: string, category: string }}
139:export function classifyTaskClass(task) {
141:    return { taskClass: "unknown", category: CLASS_TO_CATEGORY.unknown };
144:    if (re.test(task)) return { taskClass: cls, category: CLASS_TO_CATEGORY[cls] };
146
... [+599 chars truncated]

### Assistant | 2026-06-18T03:13:02.677Z

Let me read the exact `CLASS_TO_CATEGORY` keys and the `CLASS_PATTERNS` ordering (ordering matters for which class wins for ambiguous prompts).

### Assistant | 2026-06-18T03:13:03.398Z

[tool_use: Read]

### User | 2026-06-18T03:13:04.267Z

[tool_result] 70	];
71	
72	// taskClass → cost-router category (CATEGORY_TIER keys). Unmapped → "summary"
73	// (balanced default — matches cost-router's own fallthrough).
74	const CLASS_TO_CATEGORY = Object.freeze({
75	  summarize: "summary",
76	  explain: "explanation",
77	  document: "documentation",
78	  classify: "classification",
79	  format: "format_convert",
80	  git_summary: "git_summary",
81	  audit: 
... [+3904 chars truncated]

### Assistant | 2026-06-18T03:13:08.725Z

Now I have the complete contract. The `classifyTaskClass` labels are exactly: `git_summary, format, classify, codegen, extract, document, summarize, synthesize, explain, reason, unknown` (plus `safety_critical` gated separately, and `audit`/`document` exist as CLASS_TO_CATEGORY keys but note `audit` has NO pattern in CLASS_PATTERNS — it can only come from elsewhere).

Now the critical analysis of the allowlist correctness. Let me trace the specific live cases by running the test and a direct trace. First, let me run the tests as specified.

### Assistant | 2026-06-18T03:13:09.535Z

[tool_use: Bash]

### User | 2026-06-18T03:13:13.166Z

[tool_result]   ...
# Subtest: decide: rate-flagged + mode strict -> deny (pre-existing 429 protection preserved)
ok 17 - decide: rate-flagged + mode strict -> deny (pre-existing 429 protection preserved)
  ---
  duration_ms: 0.0267
  ...
# Subtest: decide: nothing flagged -> allow
ok 18 - decide: nothing flagged -> allow
  ---
  duration_ms: 0.0239
  ...
# Subtest: decide: mechanical omitted defaults false (ba
... [+262 chars truncated]

### Assistant | 2026-06-18T03:13:16.837Z

19/19 pass, 0 skip. Now let me LIVE-trace the exact builder prompts and mechanical prompts through the REAL `routeClaudeTier` to verify the classification independently (not trusting the test's own assertions), plus the effort-tier-router test for the BUILD_CLASSES consumer integrity.

### Assistant | 2026-06-18T03:13:24.378Z

[tool_use: Bash]

### Assistant | 2026-06-18T03:13:25.035Z

[tool_use: Bash]

### User | 2026-06-18T03:13:28.339Z

[tool_result] === BUILDER per-prompt ===
{"p":"implement the engine and wire the dispatcher","tier":"sonnet","taskClass":"codegen"}
{"p":"write the engine code and add the tests","tier":"sonnet","taskClass":"codegen"}
{"p":"refactor the routing module","tier":"sonnet","taskClass":"unknown"}
builder classifyWorkflowMechanical: {"mechanical":false,"mechanicalCount":0,"judgmentCount":3,"total":3}
=== MECHANICAL pe
... [+831 chars truncated]

### User | 2026-06-18T03:13:33.619Z

[tool_result] # tests 26
# suites 0
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 91.6962

### Assistant | 2026-06-18T03:13:37.986Z

The live trace confirms every claim. Let me verify a few remaining edge cases: the fail-safe path (router missing/throws), and confirm the BUILD_CLASSES import was genuinely removed from the gate (no dangling reference), plus check the gate is wired as a PreToolUse hook and that `extract`/`document` mechanical classification is correct (note: `document` → tier sonnet which is fine, but I should verify the belt-and-suspenders `!tier.includes("opus")` doesn't accidentally suppress a legit mechanical).

### Assistant | 2026-06-18T03:13:41.288Z

[tool_use: Bash]

### User | 2026-06-18T03:13:44.819Z

[tool_result] === BUILD_CLASSES refs in gate (should be NONE) ===
(none - import removed, good)
=== gate wired in settings.json? ===
H:/.claude/settings.json:1026:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/agent-fanout-pressure-gate.mjs",
H:/.claude/settings.json:1051:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/agent-fanout-pressure-gate.m
... [+591 chars truncated]

### Assistant | 2026-06-18T03:13:45.766Z

[tool_use: Bash]

### User | 2026-06-18T03:13:49.110Z

[tool_result] router-throws: {"mechanical":false,"mechanicalCount":0,"judgmentCount":2,"total":2}
router-undefined: {"mechanical":false,"mechanicalCount":0,"judgmentCount":0,"total":0}
mixed mech+code: {"mechanical":false,"mechanicalCount":1,"judgmentCount":1,"total":2}
extract/doc/format: {"mechanical":true,"mechanicalCount":3,"judgmentCount":0,"total":3}
single-unknown: {"mechanical":false,"mechanicalCount":0
... [+29 chars truncated]

### Assistant | 2026-06-18T03:13:52.230Z

All paths verified. Let me confirm the wiring is the PreToolUse Agent matcher (the two refs at lines 1026/1051 — likely Agent and Workflow matchers) and verify there are no OTHER consumers of the gate's removed import elsewhere in the codebase.

### Assistant | 2026-06-18T03:13:55.303Z

[tool_use: Bash]

### User | 2026-06-18T03:15:12.539Z

[tool_result] === matchers around the two wiring sites ===
        "matcher": "Agent",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/agent-fanout-pressure-gate.mjs",
        "matcher": "Workflow",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/agent-fanout-pressure-gate.mjs",
=== any other importer of agent-fanout-pressure-gate exports? ===
./.c
... [+153 chars truncated]

### Assistant | 2026-06-18T03:15:46.290Z

All verification complete. Both files are untracked (new), so there's no committed "prior" to diff against — but the live router trace independently confirms every behavioral claim rather than trusting the in-test stubs.

Let me record my analysis findings. I traced:

**Allowlist correctness vs real `classifyTaskClass` labels** (`local-llm-task-router.mjs:74-87, 109-131`): the full class set is `{summarize, explain, document, classify, format, git_summary, audit, synthesize, codegen, reason, extract, unknown}` (+ `safety_critical` gated separately). `MECHANICAL_CLASSES = {summarize, explain, document, classify, format, git_summary, extract}` — exactly the 7 cheap read/transform classes, and it correctly EXCLUDES `codegen, audit, synthesize, reason, unknown, safety_critical`. Confirmed precise.

**Live builder trace** — the exact prompts classify: `implement the engine...`→codegen, `write the engine code...`→codegen, `refactor the routing module`→`unknown` (the CODING_PATTERNS regex requires "refactor (code|a function|a test|the engine|tests)" — bare "refactor the routing module" doesn't match, and `local-llm` codegen pattern needs "refactor (code|a function...)" too, so it correctly falls to `unknown`). All three → judgment → `mechanical:false, judgmentCount:3`. The false-hard-block is gone.

**Mechanical teeth preserved** — summarize/classify/explain → `mechanical:true, judgmentCount:0`. Enforcement intact.

**Fail-safe** — router throws → judgment (allow); undefined router → mechanical:false (allow). Both confirmed at `classifyWorkflowMechanical:97,110`.

**No regression** — BUILD_CLASSES import fully removed from the gate (zero refs); still exported by `claude-tier-router.mjs:40` and consumed by `effort-tier-router.mjs:28,98` (26/26 pass). The gate is wired as both Agent and Workflow PreToolUse matchers. No external consumer imports the gate's exports except its own test.

---

VERDICT: PASS

summary: The P1 is fully resolved. `classifyWorkflowMechanical` now use
... [+2994 chars truncated]
