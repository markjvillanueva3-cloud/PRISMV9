---
type: "chat-session"
source: "claude-code-cli"
session_id: "acb396a1-5d83-43f6-9cec-7c65bf98418f"
title: "Review U-DAG-PICKER — dependency-awareness added to the fleet's runtime pickup p"
date: "2026-06-12"
first_ts: "2026-06-12T19:56:21.342Z"
last_ts: "2026-06-12T19:59:49.715Z"
cwd: "H:\\prism-slot-alpha"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/agent-a43c85772ba11ef11.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# Review U-DAG-PICKER — dependency-awareness added to the fleet's runtime pickup p

> **claude-code-cli** | 2026-06-12 | 34 msgs (14 user / 20 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/acb396a1-5d83-43f6-9cec-7c65bf98418f/subagents/agent-a43c85772ba11ef11.jsonl`

## Transcript

### User | 2026-06-12T19:56:21.342Z

Review U-DAG-PICKER — dependency-awareness added to the fleet's runtime pickup picker. The picker (`.claude/helpers/priority-queue.mjs`) suggests the next unit for any chat to build; a wrong change mis-routes work fleet-wide. Read END-TO-END and grade PASS/FAIL with P0/P1/P2:

1. H:/prism/.claude/helpers/priority-queue.mjs  (the LIVE patched picker — focus on the new code: `unitDeps` capture in `buildEnvelopeIndex`, the exported `depsSatisfied` + `partitionByDeps`, and the `PRISM_PQ_DAG_DISABLE` block inside `pickNextUnit` after the prose-alias dedupe)
2. H:/prism-slot-alpha/scripts/__tests__/dag-picker.test.mjs  (the 8 new tests)
3. H:/prism-slot-alpha/scripts/apply-dag-picker.mjs  (the idempotent raw-FS patcher that produced #1)

CONTRACT: a unit whose `depends_on` (from the milestone-envelope units[], captured into envIndex.unitDeps) are NOT all in the shipped set must be pushed BEHIND dependency-ready units (R13: never hand out a consumer atop an unproven dependency). Blocked units must NEVER be dropped (R12: surface flagged `_depBlocked` when no ready work remains). Default-on; `PRISM_PQ_DAG_DISABLE=1` => byte-identical legacy behavior.

VALIDATED already: 8/8 new tests, 35/35 existing priority-queue tests (no regression), live: 789 units with dep-edges captured, `U-AIMAX12 → [U-AIMAX10,U-AIMAX11]`, `depsSatisfied(U-AIMAX12, liveShipped)===false` (correctly blocked).

VERIFY HARD:
- Correctness of `depsSatisfied`: the fail-safe branches (no envIndex / no unitDeps Map / no unit_id / no deps) all return `true` (never block on missing data) — confirm none can wrongly BLOCK a unit that should be pickable. And confirm a real blocked unit (deps unshipped) returns false.
- `partitionByDeps` order preservation + the `ready.concat(blocked...)` reorder in pickNextUnit: does it preserve the priority-sort within ready? Does the downstream slot/domain filter still work on the reordered list?
- NO-REGRESSION: with `PRISM_PQ_DAG_DISABLE=1`, is behavior byte-identical to befor
... [+590 chars truncated]

### Assistant | 2026-06-12T19:56:27.149Z

I'll review U-DAG-PICKER end-to-end. Let me read all three files in full.

### Assistant | 2026-06-12T19:56:27.649Z

[tool_use: Read]

### Assistant | 2026-06-12T19:56:28.111Z

[tool_use: Read]

### Assistant | 2026-06-12T19:56:28.804Z

[tool_use: Read]

### User | 2026-06-12T19:56:29.310Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * priority-queue.mjs — runtime API over ROADMAP-CONSOLIDATED priority queue.
4	 *
5	 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
6	 *
7	 * Consumed by Stop hooks (stop-auto-pickup-next.mjs in particular) to suggest
8	 * the next-best unit for a chat to take. Uses the same `classifyUnit` from
9	 * scripts/generate-priority-queue-features.mjs so visu
... [+25061 chars truncated]

### User | 2026-06-12T19:56:29.770Z

[tool_result] 1	/**
2	 * Tests for U-DAG-PICKER -- the dependency-aware pickup logic added to
3	 * .claude/helpers/priority-queue.mjs (buildEnvelopeIndex unitDeps capture +
4	 * depsSatisfied + partitionByDeps). The functions are pure (explicit inputs), so
5	 * these are hermetic fixtures; we import from the live patched main-tree helper.
6	 *
7	 * Run: node --test scripts/__tests__/dag-picker.test.mjs
8	 */
9	
... [+3654 chars truncated]

### User | 2026-06-12T19:56:30.303Z

[tool_result] 1	#!/usr/bin/env node
2	// apply-dag-picker.mjs
3	// ----------------------------------------------------------------------------
4	// U-DAG-PICKER (2026-06-12, slot:alpha): make the runtime pickup picker
5	// (.claude/helpers/priority-queue.mjs) dependency-AWARE. Today it is blind to
6	// per-unit depends_on, so it can hand a chat a unit whose dependencies are not
7	// yet built -- a consumer ato
... [+8441 chars truncated]

### Assistant | 2026-06-12T19:56:33.921Z

I have read all three files end-to-end. Let me verify the key dependencies and claims the contract rests on — the shipped-set namespace, `extractUnitIdsFromUnit`, and whether the live patched file actually matches the patcher output.

### Assistant | 2026-06-12T19:56:35.016Z

[tool_use: Read]

### Assistant | 2026-06-12T19:56:36.287Z

[tool_use: Grep]

### User | 2026-06-12T19:56:36.850Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/shipped-units-source-of-truth.mjs
3	//
4	// Canonical set of unit-ids that should be SKIPPED by any /pick-unit picker.
5	//
6	// Two sources, unioned (a unit is "shipped" if EITHER source agrees):
7	//   (a) MILESTONE_PROGRESS.json — git-inferred (commit subject matches
8	//       [MILESTONE]/U-ID), authoritative for "git actually reflects this".
9	//   (b) m
... [+22441 chars truncated]

### User | 2026-06-12T19:56:38.669Z

[tool_result] scripts\apply-dag-picker.mjs:39:  // 1) capture depends_on in buildEnvelopeIndex (same pass it already runs).
scripts\apply-dag-picker.mjs:43:      from: `export function buildEnvelopeIndex(records) {
scripts\apply-dag-picker.mjs:46:      to: `export function buildEnvelopeIndex(records) {
scripts\apply-dag-picker.mjs:82:  return !envIndex.milestoneUnitIds.get(ms).has(uid);
scripts\apply-dag-picker
... [+1878 chars truncated]

### Assistant | 2026-06-12T19:56:41.763Z

Now let me verify the namespace claim concretely (do dep ids and shipped ids actually match?), check existing consumers of `buildEnvelopeIndex`, and confirm the live file matches the patcher's intended output by checking for the `.bak` file and any other consumers.

### Assistant | 2026-06-12T19:56:43.690Z

[tool_use: Grep]

### Assistant | 2026-06-12T19:56:45.598Z

[tool_use: Bash]

### User | 2026-06-12T19:56:54.675Z

[tool_result] Found 11 files
H:\prism\.claude\helpers\priority-queue.mjs
H:\prism\mcp-server\data\milestones\KILO-P2P-RECONCILE-MS0.json
H:\prism\.claude\helpers\priority-queue.test.mjs
H:\prism\scripts\enrich-roadmap-knowledge.mjs
H:\prism\state\shared\dashboards\enrich-roadmap-knowledge.mjs
H:\prism\prism-test-6d0595\mcp-server\src\engines\UnifiedPPAGIOrchestrationEngine.ts
H:\prism\tmp\prism-consensus-recove
... [+328 chars truncated]

### User | 2026-06-12T19:57:09.509Z

[tool_result] ---DAG count in live file---
4
---env grep for depends_on across envelopes (sample)---
mcp-server/data/milestones/AGENT-ROADMAP.json
mcp-server/data/milestones/AI-MAX-ROADMAP.json
mcp-server/data/milestones/AI-STACK-PER-DOMAIN-MS0.json
mcp-server/data/milestones/AI-WIRE-MS0.json
mcp-server/data/milestones/APPW-MS8.json

### Assistant | 2026-06-12T19:57:13.957Z

Let me check the consumers of `buildEnvelopeIndex`'s return to confirm the added `unitDeps` field doesn't break anything, and verify the dep-id ↔ shipped-id namespace match concretely with the live data.

### Assistant | 2026-06-12T19:57:15.428Z

[tool_use: Grep]

### Assistant | 2026-06-12T19:57:16.776Z

[tool_use: Grep]

### User | 2026-06-12T19:57:21.886Z

[tool_result] 8:  buildEnvelopeIndex, loadEnvelopeIndex, resolveUnitSlot, isProseAliasOfEnvelope,
213:test("buildEnvelopeIndex — maps unit slots + milestone unit-ids, skips empty milestones", () => {
214:  const idx = buildEnvelopeIndex([
224:  assert.equal(idx.unitSlot.get("U-DPM0-WIRE-PRINT_OCR"), "charlie");
225:  assert.equal(idx.unitSlot.get("U-DPM0-P2P-X"), "kilo");
226:  assert.equal(idx.unitSlot.has("U-
... [+965 chars truncated]

### Assistant | 2026-06-12T19:57:21.986Z

[tool_use: Bash]

### User | 2026-06-12T19:57:22.420Z

[tool_result] 42:function buildEnvelopeIndex() {
187:  const envIndex = buildEnvelopeIndex();

### User | 2026-06-12T19:57:54.909Z

[tool_result] unitDeps size: 789
unitSlot size: 184
milestoneUnitIds size: 650
sample deps: [["P0-U04",["P0-U03"]],["P0-U05",["P0-U03"]],["P0-U02",["P0-U01"]]]
shipped size: 1295
dep edges total: 1218 deps already in shipped: 428

### Assistant | 2026-06-12T19:58:01.164Z

All verifications confirmed. The `enrich-roadmap-knowledge.mjs` has its OWN local `buildEnvelopeIndex()` (line 42, zero-arg, different function) — not a consumer of the picker's export. The picker's test file at line 213+ tests `unitSlot`/`milestoneUnitIds` but does not assert the return-object shape exclusively, so the added `unitDeps` field is non-breaking.

Let me confirm the test-file consumer doesn't do an exact deepEqual on the whole return object, and run the live partition behavior to confirm blocked units surface (not dropped).

### Assistant | 2026-06-12T19:58:02.388Z

[tool_use: Read]

### User | 2026-06-12T19:58:05.471Z

[tool_result] 213	test("buildEnvelopeIndex — maps unit slots + milestone unit-ids, skips empty milestones", () => {
214	  const idx = buildEnvelopeIndex([
215	    { id: "DOMAIN-PIPELINE-MS0", units: [
216	      { id: "U-DPM0-WIRE-PRINT_OCR", slot: "charlie" },
217	      { id: "U-DPM0-P2P-X", slot: "kilo" },
218	      { id: "U-DPM0-NOSLOT" },                       // no slot field
219	    ] },
220	    { id: "MS-
... [+2708 chars truncated]

### Assistant | 2026-06-12T19:58:07.900Z

[tool_use: Bash]

### User | 2026-06-12T19:58:41.911Z

[tool_result] U-AIMAX12 deps: ["U-AIMAX10","U-AIMAX11"]
depsSatisfied(U-AIMAX12, empty): false
depsSatisfied(U-AIMAX12, both shipped): true
ready: [] blocked: [ 'U-AIMAX10', 'U-AIMAX12' ]
total preserved: true

### Assistant | 2026-06-12T19:58:48.087Z

All checks pass. The test-file consumers use field-specific assertions (`idx.unitSlot.get(...)`, `idx.milestoneUnitIds.has(...)`) — no exact deepEqual on the return object, so the added `unitDeps` field is non-breaking. The live data confirms the namespace match (dep ids like `U-AIMAX10` are recognized in the shipped set; 428 of 1218 dep edges already shipped).

One note from my partition test: with `U-A` (U-AIMAX10) NOT shipped, `U-AIMAX10` itself went to `blocked` — let me verify that's because it has its own deps, not a bug.

### Assistant | 2026-06-12T19:58:54.303Z

[tool_use: Bash]

### User | 2026-06-12T19:59:07.192Z

[tool_result] U-AIMAX10 deps: ["U-AIMAX03","U-AIMAX06"]
self-referential dep units: 0
of 789 dep-bearing units: ready 306 blocked 483

### Assistant | 2026-06-12T19:59:49.715Z

Confirmed — `U-AIMAX10` has its own deps (`U-AIMAX03`, `U-AIMAX06`), so its placement in `blocked` was correct, not a bug. No self-referential deps (no trivial-cycle inert-blocking). Live: of 789 dep-bearing units, 306 ready / 483 blocked — the feature is active and discriminating, not inert.

I have everything needed for the verdict.

---

## Code Quality Analysis Report — U-DAG-PICKER

### Summary
- Overall Quality Score: 9.5/10
- Files Analyzed: 3 (+ 2 dependencies read for verification)
- Issues Found: 0 P0, 0 P1, 2 P2, 1 P3
- Verdict: **PASS**

The contract holds end-to-end. Every hard-verify item checked out against live data.

---

### CONTRACT VERIFICATION (all PASS)

**1. `depsSatisfied` correctness — fail-safe branches never wrongly block**
`priority-queue.mjs:324-333`. Four guard branches all return `true` (READY) on missing data:
- `!unit` → true (`:325`)
- `!envIndex || !(envIndex.unitDeps instanceof Map)` → true (`:326`)
- `!uid` (no unit_id) → true (`:328`)
- `!Array.isArray(deps) || deps.length === 0` → true (`:330`)

None can wrongly BLOCK a pickable unit — the only path to `false` is the final `deps.every((d) => shipped.has(d))` with a real non-empty dep array (`:332`). Live-confirmed: `depsSatisfied(U-AIMAX12, emptySet) === false`, `=== true` once both deps shipped. Correct.

**2. `partitionByDeps` order preservation + `ready.concat(blocked)` reorder**
`:337-343`. Single forward pass pushes each unit to `ready` or `blocked` in input order — relative order within each group is preserved (test `dag-picker.test.mjs:67-72` asserts `["U-A","U-B","U-D"]`). Since `rankUnits` (`:119-150`) already applied the priority-sort and `applyEvalRerank` ran *before* the partition (`pickNextUnit:366-385`), the partition is a **stable** reorder — priority-sort is preserved within `ready`. The downstream slot-ownership filter (`:401-404`) and domain filter (`:406`) operate on the reordered `ranked` list correctly: both are `.filter()` calls that preserve order, so the
... [+5171 chars truncated]
