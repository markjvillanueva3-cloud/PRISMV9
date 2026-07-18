---
type: "chat-session"
source: "claude-code-cli"
session_id: "358cf225-d753-40b9-9ef5-8ea38cf462fa"
title: "PRISM system-viz: H:/prism/scripts/regen-viz.mjs runs a FAST[] array of generato"
date: "2026-06-22"
first_ts: "2026-06-22T15:06:42.218Z"
last_ts: "2026-06-22T15:08:45.442Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/workflows/wf_214687c8-287/agent-af229276d0ea8e59d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# PRISM system-viz: H:/prism/scripts/regen-viz.mjs runs a FAST[] array of generato

> **claude-code-cli** | 2026-06-22 | 33 msgs (14 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/358cf225-d753-40b9-9ef5-8ea38cf462fa/subagents/workflows/wf_214687c8-287/agent-af229276d0ea8e59d.jsonl`

## Transcript

### User | 2026-06-22T15:06:42.218Z

PRISM system-viz: H:/prism/scripts/regen-viz.mjs runs a FAST[] array of generators (each writes a *-augmentation.json) then H:/prism/scripts/merge-augmentations.mjs loadOptional()-reads each + folds newNodes/newEdges into state/shared/system-viz/system-graph.json.
BUG: a *-augmentation.json whose loadOptional() splice still exists but whose generator is NOT in FAST[] -> merge folds the FROZEN ~44-day-old file forever; graph shows GREEN (re-merge recency, not data freshness).
FIX: rewire-fast (add CHEAP wanted producer to FAST[]); remove-splice (delete loadOptional block for obsolete/superseded data OR an expensive one-shot census/audit that must NOT run each regen); rewire-heavy (wanted but genuinely expensive -> needs a periodic-job note, not silent stale-fold); keep-as-is.
Hints: generate-fs-inventory.mjs->fs-inventory-augmentation.json (iter-10, fresh) may SUPERSEDE file-coverage-v2; generate-core-inventory.mjs is already fresh; h-drive-*/*-census/*-audit names smell of expensive one-shot FS walks.
READ-ONLY. Steps: (1) grep H:/prism/scripts + scripts/lib for the literal filename -> producer path; (2) is it in regen-viz FAST[]?; (3) find its loadOptional/fold in merge-augmentations.mjs (cite file:line); (4) dataWanted? check for a newer augmentation covering it; (5) generatorCost? full-FS-walk / 745MB-graph-load / LLM-call => expensive-oneshot; (6) recommend + rationale + real file:line evidence. No producer found => generatorExists:false, recommend remove-splice. Use absolute H:/prism/... paths; never fabricate a line number.

=== AUDIT: awareness-augmentation.json (stale-orphan) ===
Return the structured verdict.

### Assistant | 2026-06-22T15:06:50.472Z

I'll investigate the `awareness-augmentation.json` file systematically.

### Assistant | 2026-06-22T15:06:51.782Z

[tool_use: Bash]

### User | 2026-06-22T15:07:12.361Z

[tool_result] H:/prism/scripts/augment-graph-with-awareness.mjs
H:/prism/scripts/lib/augmentation-freshness.test.mjs
H:/prism/scripts/merge-augmentations.mjs
H:/prism/scripts/lib/augmentation-freshness.test.mjs

### Assistant | 2026-06-22T15:07:15.643Z

Now let me check the generator file and the FAST[] array in regen-viz.mjs, plus the splice in merge-augmentations.mjs in parallel.

### Assistant | 2026-06-22T15:07:16.407Z

[tool_use: Bash]

### Assistant | 2026-06-22T15:07:17.175Z

[tool_use: Bash]

### Assistant | 2026-06-22T15:07:17.921Z

[tool_use: Bash]

### User | 2026-06-22T15:07:30.934Z

[tool_result] 94:  "generate-core-inventory.mjs",  // U-VIZ-ORPHAN-WIRE (sierra 2026-06-22): was half-wired -- merge folds coreInventory (~line 616) but FAST[] never ran it -> 674 core.* nodes stale-folded since 2026-05-09. Healthy 0s FS-walk, no graph parse. Dual-reg auditor orphan finding.
129:  // NOTE: "generate-slot-queue-features.mjs" removed 2026-06-10 (U-VIZ-SLOTQUEUE-ORPHAN, sierra): the file never exi
... [+1473 chars truncated]

### User | 2026-06-22T15:07:31.220Z

[tool_result] 8: *   state/shared/system-viz/awareness-augmentation.json    (svi, testCount, complexity, coverage)
13: *   - Each node in graph gains: .knowledge, .awareness, .novelty, .businessValue (when applicable)
14: *   - Top-level meta gains: .augmentationVersions = { obsidian, awareness, novelty, businessValue }
79:function loadOptional(name) {
88:        console.error(`[merge-augmentations] STALE-SKIP:
... [+5290 chars truncated]

### User | 2026-06-22T15:07:33.375Z

[tool_result] 3: * augment-graph-with-awareness.mjs
7: * awareness metrics:
17: * Output: H:/prism/state/shared/system-viz/awareness-augmentation.json
31:const OUT_PATH = path.join(ROOT, 'state/shared/system-viz/awareness-augmentation.json');
296:    `augmented ${total} nodes with awareness data; svi_psi=${sviPsi.toFixed(3)}, mean_coverage=${meanCov.toFixed(1)}%`

### Assistant | 2026-06-22T15:07:36.788Z

Now let me check whether the producer is in FAST[] and get the exact line numbers for the splice.

### Assistant | 2026-06-22T15:07:37.971Z

[tool_use: Bash]

### Assistant | 2026-06-22T15:07:38.707Z

[tool_use: Bash]

### Assistant | 2026-06-22T15:07:39.602Z

[tool_use: Bash]

### User | 2026-06-22T15:07:48.901Z

[tool_result] (Bash completed with no output)

### User | 2026-06-22T15:07:50.218Z

[tool_result] 8: *   state/shared/system-viz/awareness-augmentation.json    (svi, testCount, complexity, coverage)
13: *   - Each node in graph gains: .knowledge, .awareness, .novelty, .businessValue (when applicable)
14: *   - Top-level meta gains: .augmentationVersions = { obsidian, awareness, novelty, businessValue }
143:const awareness  = loadOptional("awareness-augmentation.json");
274:if (awareness) versi
... [+329 chars truncated]

### User | 2026-06-22T15:07:51.967Z

[tool_result] 3: * augment-graph-with-awareness.mjs
7: * awareness metrics:
17: * Output: H:/prism/state/shared/system-viz/awareness-augmentation.json
31:const OUT_PATH = path.join(ROOT, 'state/shared/system-viz/awareness-augmentation.json');
296:    `augmented ${total} nodes with awareness data; svi_psi=${sviPsi.toFixed(3)}, mean_coverage=${meanCov.toFixed(1)}%`

### Assistant | 2026-06-22T15:07:55.849Z

The first grep returned no output — meaning `augment-graph-with-awareness.mjs` is NOT in FAST[]. Let me confirm the cost profile of the producer and get precise line references.

### Assistant | 2026-06-22T15:07:56.547Z

[tool_use: Read]

### Assistant | 2026-06-22T15:07:57.949Z

[tool_use: Bash]

### User | 2026-06-22T15:07:58.401Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * augment-graph-with-awareness.mjs
4	 *
5	 * One-shot augmenter for the PRISM system-viz graph. Reads the live graph,
6	 * SVI watch status, BUILD_STATE, and BASELINE_INVENTORY, then computes per-node
7	 * awareness metrics:
8	 *   - svi          — global SVI psi (or domain-matched override if available)
9	 *   - testCount    — vitest *.test.ts files matching domain 
... [+1808 chars truncated]

### User | 2026-06-22T15:08:08.542Z

[tool_result] 24:const GRAPH_PATH = path.join(ROOT, 'state/shared/system-viz/system-graph.json');
190:    console.error(`[fatal] system-graph.json missing or malformed at ${GRAPH_PATH}`);

### Assistant | 2026-06-22T15:08:12.120Z

The producer loads `system-graph.json` (the 548MB graph). Let me confirm the exact read pattern and check what the merge splice does with the awareness data.

### Assistant | 2026-06-22T15:08:12.888Z

[tool_use: Read]

### Assistant | 2026-06-22T15:08:13.482Z

[tool_use: Read]

### User | 2026-06-22T15:08:14.705Z

[tool_result] 185	// ─────────────────────────────────────────────────────────────────────────────
186	
187	function main() {
188	  const graph = readJsonSafe(GRAPH_PATH);
189	  if (!graph || !Array.isArray(graph.nodes)) {
190	    console.error(`[fatal] system-graph.json missing or malformed at ${GRAPH_PATH}`);
191	    process.exit(1);
192	  }
193	  const svi = readJsonSafe(SVI_PATH, {});
194	  const buildState
... [+1242 chars truncated]

### User | 2026-06-22T15:08:15.276Z

[tool_result] 370	let mergedNodes = 0;
371	for (const n of G.nodes) {
372	  const k = obsidian?.augmentations?.[n.id];
373	  if (k) { n.knowledge = k; mergedNodes++; }
374	  const a = awareness?.augmentations?.[n.id];
375	  if (a) { n.awareness = a; }
376	  const b = business?.augmentations?.[n.id];
377	  if (b) { n.businessValue = b; }
378	}
379	
380	// Novelty catalog is global, not per-node by id; index it b
... [+352 chars truncated]

### Assistant | 2026-06-22T15:08:24.060Z

I have all the evidence needed. The producer loads the full 548MB `system-graph.json` at line 188 (`readJsonSafe(GRAPH_PATH)`) and iterates every node — that is a genuine graph-load, making it expensive-oneshot. It is not in FAST[] (the grep returned no output). The splice is at `merge-augmentations.mjs:143`. The data (per-node svi/testCount/complexity/coverage) is clearly wanted — it feeds the viewer's `n.awareness` field and the `augmentationVersions.awareness` meta. The recommendation is `rewire-heavy`: the generator produces wanted data but must not run on every regen due to the 548MB graph load; it needs a periodic-job note instead of silent stale-folding.

### Assistant | 2026-06-22T15:08:32.222Z

[tool_use: StructuredOutput]

### User | 2026-06-22T15:08:32.784Z

[tool_result] Structured output provided successfully

### User | 2026-06-22T15:08:35.077Z

[Your previous response had no visible output. Please continue and produce a user-visible response.]

### Assistant | 2026-06-22T15:08:45.442Z

The audit is complete. Here is the verdict for `awareness-augmentation.json`:

**Generator:** `H:/prism/scripts/augment-graph-with-awareness.mjs` — exists, not in FAST[]

**Cost:** expensive-oneshot. The producer does a full `readJsonSafe(GRAPH_PATH)` at line 188 (the 548 MB `system-graph.json`) then iterates every node to compute per-node `svi`, `testCount`, `complexity`, `coverage`, `actionCount`, `registryEntries` fields. Same class of cost as the h-drive census scripts.

**Splice:** `merge-augmentations.mjs:143` — `loadOptional("awareness-augmentation.json")`, consumed at lines 274 and 374-375 (`n.awareness = a` per-node fold + `augmentationVersions.awareness` meta stamp).

**Data wanted:** yes. The `n.awareness` field is a live viewer surface and the `augmentationVersions` stamp is used for recency display. This is not superseded by any other augmentation.

**Recommendation: `rewire-heavy`**

The generator produces genuinely useful data but must not run on every regen. The correct fix is to add a periodic-job note (nightly scheduled task or on-demand post-graph-rebuild trigger) and leave the `loadOptional` splice in place — it will fold fresh data when the periodic job has run and silently skip when stale. Do not add it to FAST[].
