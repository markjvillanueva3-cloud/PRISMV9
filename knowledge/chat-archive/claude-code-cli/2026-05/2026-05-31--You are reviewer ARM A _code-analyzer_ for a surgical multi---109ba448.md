---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "You are reviewer ARM A (code-analyzer) for a surgical multi-file change in PRISM"
date: "2026-05-31"
first_ts: "2026-05-31T04:46:26.246Z"
last_ts: "2026-05-31T04:58:44.086Z"
cwd: "H:\\prism-slot-sierra"
messages: 86
user_msgs: 31
assistant_msgs: 55
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a3feb8e8ab8d928e8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# You are reviewer ARM A (code-analyzer) for a surgical multi-file change in PRISM

> **claude-code-cli** | 2026-05-31 | 86 msgs (31 user / 55 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-a3feb8e8ab8d928e8.jsonl`

## Transcript

### User | 2026-05-31T04:46:26.246Z

You are reviewer ARM A (code-analyzer) for a surgical multi-file change in PRISM's system-viz graph pipeline. The change completes "U-VIZ-G4-DEAD-EDGE": three system-viz augmentation producers were emitting graph edges whose target was `dispatcher.<mcp_tool_name>` (e.g. `dispatcher.prism_calc`) — a node id that does NOT exist in the merged system-graph (the canonical dispatcher node id is the file-derived `disp.calcdispatcher`). This produced ~2,944 dead edges. The fix extracts the already-proven resolver (`mcpToolToDispNodeId`, originally inside seed-ghost-from-unwired.mjs which was fixed in 2026-05-20 U-VIZ-G4-SEEDER-FIX) into a shared SSOT lib and routes all producers through it.

CRITICAL — read the files from these EXACT ABSOLUTE PATHS (your CWD may be a git worktree H:/prism-slot-sierra where these edits are ABSENT; you MUST read the H:/prism main-tree copies):
- H:/prism/scripts/lib/viz-dispatcher-node-id.mjs   (NEW shared lib — the resolver SSOT)
- H:/prism/scripts/lib/viz-dispatcher-node-id.test.mjs   (NEW test, 8 cases)
- H:/prism/scripts/seed-ghost-from-unwired.mjs   (refactored: local table removed, now imports + re-exports from the lib — lines ~30-31 import, ~91-98 re-export)
- H:/prism/scripts/seed-ghost-llm-classify.mjs   (line ~217 in classificationToGraphUpdate: now `to: mcpToolToDispNodeId(c.dispatcher)`)
- H:/prism/scripts/seed-ghost-gnn-classify.mjs   (line ~456 in applyGnnClassifications: now `to: mcpToolToDispNodeId(c.dispatcher)`)
- H:/prism/scripts/generate-pdf-course-bridge-features.mjs   (PDF_KIND_TO_DISPATCHERS + COURSE_KIND_TO_DISPATCHERS now store bare mcp names; generate() maps them through mcpToolToDispNodeId at edge-emit)
- H:/prism/scripts/generate-pdf-course-bridge-features.test.mjs + H:/prism/scripts/seed-ghost-llm-classify.test.mjs + H:/prism/scripts/seed-ghost-gnn-classify.test.mjs (test assertions updated to canonical disp.* targets)

All 154 affected tests pass. Your job is to find what the tests + my self-review missed.

Verif
... [+1714 chars truncated]

### Assistant | 2026-05-31T04:46:36.549Z

I'll review this change rigorously. Let me start by reading all the affected files from the main-tree paths.

### Assistant | 2026-05-31T04:46:37.799Z

[tool_use: Read]

### Assistant | 2026-05-31T04:46:37.501Z

[tool_use: Read]

### User | 2026-05-31T04:46:43.055Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * viz-dispatcher-node-id.mjs — canonical MCP-tool-name → system-graph
4	 * dispatcher node-id resolver (SSOT for every ghost / bridge producer).
5	 *
6	 * BACKGROUND (the G4 dead-edge class, sierra):
7	 * The dispatcher INFERENCE rules + the per-kind bridge tables across PRISM all
8	 * speak the MCP *tool* name (`prism_calc`, `prism_safety`, …). But the merged
9	 * `
... [+3292 chars truncated]

### User | 2026-05-31T04:46:43.397Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Tests for viz-dispatcher-node-id.mjs — the canonical MCP-tool → disp node-id
4	 * resolver. Real assertions (reference values + the dead-edge regression that
5	 * motivated the module), NOT toBeDefined stubs.
6	 */
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	
10	import { MCP_TOOL_TO_DISP_NODE_ID, mcpToolToDispNodeId } from "./vi
... [+3810 chars truncated]

### Assistant | 2026-05-31T04:46:47.534Z

Now let me read the seed-ghost-from-unwired.mjs to verify the SSOT integrity (import + re-export).

### Assistant | 2026-05-31T04:46:48.152Z

[tool_use: Read]

### User | 2026-05-31T04:47:02.741Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-from-unwired.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED
4	 *
5	 * Generates L13 ghost nodes for the BUILD_STATE-flagged unwired engines (861
6	 * engines on disk with no dispatcher reference). Each gets:
7	 *   - ghost.unwired-engine node with `proposed_wiring` + `confidence` fields
8	 *   - ghost-wire edge (relation: "proposed-wire") pointing at t
... [+11120 chars truncated]

### Assistant | 2026-05-31T04:47:06.116Z

I see the import (line 32) and re-export (line 99). Let me verify how the seeder uses `mcpToolToDispNodeId` in its edge emission to confirm the SSOT was actually adopted in the seeder's own logic, not just re-exported. Let me search for the edge emission.

### Assistant | 2026-05-31T04:47:07.172Z

[tool_use: Grep]

### User | 2026-05-31T04:47:12.216Z

[tool_result] 32:import { MCP_TOOL_TO_DISP_NODE_ID, mcpToolToDispNodeId } from "./lib/viz-dispatcher-node-id.mjs";
96:// re-introducing the `dispatcher.<mcp_tool>` dead-edge bug. Re-exported here for
99:export { MCP_TOOL_TO_DISP_NODE_ID, mcpToolToDispNodeId };
207:        to: mcpToolToDispNodeId(inf.dispatcher),

### Assistant | 2026-05-31T04:47:15.453Z

Line 207 confirms the seeder's own edge emission uses `mcpToolToDispNodeId(inf.dispatcher)`. Let me read around that context to confirm it's correctly wired and there's no leftover `dispatcher.` prefix anywhere.

### Assistant | 2026-05-31T04:47:15.934Z

[tool_use: Read]

### User | 2026-05-31T04:47:26.522Z

[tool_result] 180	 * Returns { node, edge | null }. Node always emitted; edge only if confidence >= MIN_CONFIDENCE.
181	 */
182	export function buildGhostFromUnwired(engine, opts = {}) {
183	  const inf = inferDispatcher(engine.name, opts);
184	  const node = {
185	    id: `ghost.unwired.${engine.name}`,
186	    layer: "L13",
187	    subgroup: "unwired-engine",
188	    label: engine.name,
189	    info: `Unwired
... [+1119 chars truncated]

### Assistant | 2026-05-31T04:47:28.362Z

Seeder edge emission is correct. Now let me read the llm-classify and gnn-classify changes.

### Assistant | 2026-05-31T04:47:29.330Z

[tool_use: Read]

### Assistant | 2026-05-31T04:47:30.102Z

[tool_use: Read]

### User | 2026-05-31T04:47:36.277Z

[tool_result] 195	
196	/**
197	 * Apply one classification to its ghost `node` (mutates it) and return the
198	 * proposed-wire edge to append — or null when `c.dispatcher` is not a writable
199	 * prism_* name. Both producers (LLM parseBatchResponse, GNN gnnClassifyUnknowns)
200	 * pre-validate; this guard protects direct callers of the export. A
201	 * classification may carry its own `confidence` + `reason` 
... [+1770 chars truncated]

### User | 2026-05-31T04:47:38.689Z

[tool_result] 435	 */
436	export function applyGnnClassifications(graph, classifications) {
437	  const byName = new Map();
438	  for (const n of graph.nodes || []) {
439	    if (n && n.kind === GHOST_KIND) byName.set(n.label, n);
440	  }
441	  const edgeKeys = new Set((graph.edges || []).map((e) => `${e.from}::${e.to}::${e.type || ""}`));
442	  let nodesUpdated = 0, edgesAdded = 0;
443	  for (const c of classi
... [+1908 chars truncated]

### Assistant | 2026-05-31T04:47:41.360Z

Let me verify the imports in both classify files, then read the pdf-course-bridge producer which has a different shape (table stores bare names, mapped at edge-emit).

### Assistant | 2026-05-31T04:47:45.753Z

[tool_use: Grep]

### Assistant | 2026-05-31T04:47:46.798Z

[tool_use: Grep]

### User | 2026-05-31T04:47:51.178Z

[tool_result] 35:import { mcpToolToDispNodeId } from "./lib/viz-dispatcher-node-id.mjs";
194:const WRITABLE_DISPATCHER_RE = /^prism_[a-z0-9_]+$/;
205:  if (!node || !c || typeof c.dispatcher !== "string" || !WRITABLE_DISPATCHER_RE.test(c.dispatcher)) {
219:    // canonical file-derived disp.* node id. The old `dispatcher.${c.dispatcher}`
223:    to: mcpToolToDispNodeId(c.dispatcher),

### User | 2026-05-31T04:47:53.469Z

[tool_result] 7: * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
48:import { mcpToolToDispNodeId } from "./lib/viz-dispatcher-node-id.mjs";
72:export function isValidDispatcher(label) {
173:    if (!isValidDispatcher(n.proposed_wiring)) continue;
446:    if (!c || !isValidDispatcher(c.dispatcher) || !Number.isFinite(c.confidence)) continue;
458:      // id, not the dead `dispatcher.
... [+92 chars truncated]

### Assistant | 2026-05-31T04:47:56.026Z

Let me check `isValidDispatcher` in gnn-classify to understand the validation boundary, then read the pdf-course-bridge producer.

### Assistant | 2026-05-31T04:47:56.982Z

[tool_use: Read]

### Assistant | 2026-05-31T04:47:57.167Z

[tool_use: Read]

### User | 2026-05-31T04:48:01.224Z

[tool_result] 60	/** A dispatcher label the cascade emits — prism_calc, prism_turning, ... */
61	export const DISPATCHER_RE = /^prism_[a-z0-9_]+$/;
62	
63	export const GNN_DEFAULTS = Object.freeze({
64	  minConf: 0.7,         // GNN gate fires only at/above this (PRISM_NNG_MIN_CONF)
65	  refMinConf: 0.8,      // a ghost is a vote-reference only at/above this confidence
66	  topK: 15,             // nearest refe
... [+824 chars truncated]

### User | 2026-05-31T04:48:01.820Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-pdf-course-bridge-features.mjs
4	 *
5	 * Bridge layer: emits system-viz edges from the resource-pdf + college-course
6	 * ghost-children to their LOGICAL CONNECTED engine/dispatcher nodes.
7	 *
8	 * Closes the "wire and bridge to logical connected nodes" leg of
9	 * U-RESOURCE-PDF-AUTOGEN-SPECS / U-COLLEGE-AUTOGEN-WIDEN.
10	 *
11	 * Mapping table (per sour
... [+11579 chars truncated]

### Assistant | 2026-05-31T04:48:05.508Z

All four producers are wired correctly. Now I need to address the critical completeness question (#3): are there OTHER producers under `H:/prism/scripts` still emitting `dispatcher.<...>` edge targets? Let me grep the whole scripts tree.

### Assistant | 2026-05-31T04:48:06.885Z

[tool_use: Grep]

### User | 2026-05-31T04:48:39.170Z

[tool_result] H:\prism\scripts\extract-cadcam-tribal-wiki.test.mjs:54:  assert.ok(r.bridge_dispatchers.some(d => d.startsWith("dispatcher.prism_")));
H:\prism\scripts\generate-pdf-course-bridge-features.test.mjs:174:    // Regression guard: the OLD producer emitted dead `dispatcher.prism_*`
H:\prism\scripts\generate-pdf-course-bridge-features.test.mjs:177:    assert.ok(!e.target.startsWith("dispatcher."), "must
... [+56 chars truncated]

### Assistant | 2026-05-31T04:48:43.090Z

A new producer surfaced: `extract-cadcam-tribal-wiki.test.mjs:54` asserts `r.bridge_dispatchers.some(d => d.startsWith("dispatcher.prism_"))`. This means `extract-cadcam-tribal-wiki.mjs` emits `dispatcher.prism_*` values. Let me investigate whether those are actually edge targets in the merged graph (the dead-edge class) or something else. Let me also broaden the search to catch template-literal forms and `to:`/`target:` edge emissions that build dispatcher ids dynamically.

### Assistant | 2026-05-31T04:48:47.753Z

[tool_use: Grep]

### Assistant | 2026-05-31T04:48:47.932Z

[tool_use: Grep]

### User | 2026-05-31T04:48:57.655Z

[tool_result] 50:      bridge_dispatchers:PDF_KIND_TO_DISPATCHERS[kind] || PDF_KIND_TO_DISPATCHERS["other-pdf"] || [],
57:    bridge_dispatchers: COURSE_KIND_TO_DISPATCHERS[kind] || [],
79:    tip: `${domain.toUpperCase()} training reference (kind=${entry.kind}): read ${specBaseName} for extraction plan, then ingest source file. Bridges ${targets.bridge_engines.length} engine(s) + ${targets.bridge_dispatchers.l
... [+173 chars truncated]

### User | 2026-05-31T04:49:10.871Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-31T04:49:15.604Z

Important finding. `extract-cadcam-tribal-wiki.mjs` imports `PDF_KIND_TO_DISPATCHERS` and `COURSE_KIND_TO_DISPATCHERS` (lines 50, 57) — the SAME tables that the U-VIZ-G4-DEAD-EDGE change just converted from `dispatcher.prism_*` literals to bare `prism_*` MCP names. This is a downstream consumer of the changed tables. I must determine whether it emits these into the graph as edge targets (dead-edge class) or just into tribal-tip text/wiki, and whether its test assertion (line 54, still expecting `dispatcher.prism_`) now CONTRADICTS the new table values. Let me read the full file.

### Assistant | 2026-05-31T04:49:16.103Z

[tool_use: Read]

### system

... [6 middle messages omitted -- see raw_file] ...

### User | 2026-05-31T04:50:22.024Z

[tool_result]   ...
# Subtest: renderWikiIndex routes cam→kilo and includes kam tribal corpus pointer
ok 11 - renderWikiIndex routes cam→kilo and includes kam tribal corpus pointer
  ---
  duration_ms: 0.2051
  ...
# Subtest: renderWikiIndex truncates long groups with a +N more pointer
ok 12 - renderWikiIndex truncates long groups with a +N more pointer
  ---
  duration_ms: 0.186
  ...
# Subtest: renderWikiInde
... [+727 chars truncated]

### Assistant | 2026-05-31T04:50:24.445Z

Confirmed: **1 test FAILS**. Let me capture the exact failure output.

### Assistant | 2026-05-31T04:50:25.415Z

[tool_use: Bash]

### User | 2026-05-31T04:51:04.785Z

[tool_result] not ok 1 - resolveBridgeTargets resolves PDF kind to engines + dispatchers
  ---
  duration_ms: 12.6092
  location: 'H:\\prism\\scripts\\extract-cadcam-tribal-wiki.test.mjs:48:1'
  failureType: 'testCodeFailure'
  error: |-
    The expression evaluated to a falsy value:
    
      assert.ok(r.bridge_dispatchers.some(d => d.startsWith("dispatcher.prism_")))
    
  code: 'ERR_ASSERTION'
  name: 'Ass
... [+275 chars truncated]

### Assistant | 2026-05-31T04:51:10.155Z

Definitive P0. The change broke a test in a file the author did not touch or even list. The "All 154 affected tests pass" claim is false at the fleet level — the affected-test surface was under-scoped: it missed the second consumer of the mutated tables.

Now let me address the remaining review dimensions. First, the merge-augmentations dispatcher-target / engine-target resolution path the pdf-course-bridge comment references (line 211-213 claims engine targets are canonicalized at merge time but dispatcher targets are resolved at generation). Let me verify the `feeds-dispatcher` edges actually land as edge targets in the merged graph and confirm there's no double-resolution. Let me also check the 16-entry table correctness against the actual dispatcher files.

### Assistant | 2026-05-31T04:51:11.923Z

[tool_use: Bash]

### User | 2026-05-31T04:52:13.778Z

[tool_result] aiReasoningDispatcher.ts  248.2K
cadAutomationDispatcher.ts  253.6K
cadDispatcher.ts  310.4K
cadDrawingKnowledgeDispatcher.ts  2.5K
cadRegressionDispatcher.ts  12.8K
calcDispatcher.ts  593.1K
camDispatcher.ts  1.1M
camFunctionDispatcher.ts  8.2K
devDispatcher.ts  594.2K
fiveAxisDispatcher.ts  8.0K
guardDispatcher.ts  53.0K
intakeDispatcher.ts  3.9K
intelligenceDispatcher.ts  128.3K
memoryDispatche
... [+299 chars truncated]

### Assistant | 2026-05-31T04:52:23.045Z

Let me verify the table's 16 entries against the actual file basenames. The node id convention is `disp.<basename-lowercased-without-extension>`:

- `prism_calc` → `calcDispatcher.ts` → `disp.calcdispatcher` ✓
- `prism_safety` → `safetyDispatcher.ts` → `disp.safetydispatcher` ✓
- `prism_cam` → `camDispatcher.ts` → `disp.camdispatcher` ✓
- `prism_cad` → `cadDispatcher.ts` → `disp.caddispatcher` ✓
- `prism_turning` → `turningDispatcher.ts` → `disp.turningdispatcher` ✓
- `prism_5axis` → `fiveAxisDispatcher.ts` → `disp.fiveaxisdispatcher` ✓
- `prism_ai` → `aiReasoningDispatcher.ts` → `disp.aireasoningdispatcher` ✓
- `prism_intelligence` → `intelligenceDispatcher.ts` → `disp.intelligencedispatcher` ✓
- `prism_omega` → `omegaDispatcher.ts` → `disp.omegadispatcher` ✓
- `prism_memory` → `memoryDispatcher.ts` → `disp.memorydispatcher` ✓
- `prism_session` → `sessionDispatcher.ts` → `disp.sessiondispatcher` ✓
- `prism_dev` → `devDispatcher.ts` → `disp.devdispatcher` ✓
- `prism_orchestrate` → `orchestrationDispatcher.ts` → `disp.orchestrationdispatcher` ✓
- `prism_skill_script` → `skillScriptDispatcher.ts` → `disp.skillscriptdispatcher` ✓
- `prism_guard` → `guardDispatcher.ts` → `disp.guarddispatcher` ✓
- `prism_intake` → `intakeDispatcher.ts` → `disp.intakedispatcher` ✓

All 16 entries are correct. Now let me verify the node ids actually exist in the merged graph (the SSOT claim) for a sample, and confirm the merge canonicalization story for engine targets. Let me check how the merged graph indexes these dispatchers.

### Assistant | 2026-05-31T04:52:24.562Z

[tool_use: Bash]

### User | 2026-05-31T04:52:56.638Z

[tool_result] graph bytes: 573306687

### Assistant | 2026-05-31T04:52:59.499Z

The graph is ~573MB — too large for `JSON.parse` safely. Let me use a streaming grep to confirm the canonical `disp.calcdispatcher` node id exists and that `dispatcher.prism_calc` does NOT exist as a node id, which validates the core premise of the fix.

### Assistant | 2026-05-31T04:53:01.805Z

[tool_use: Bash]

### User | 2026-05-31T04:53:14.936Z

[tool_result] ---disp.caddispatcher---
---dispatcher.prism_calc as node id (should be empty)---
---done---

### Assistant | 2026-05-31T04:53:17.498Z

Interesting — none matched, possibly because the JSON has spaces after colons (`"id": "disp...`). Let me retry accounting for whitespace formatting.

### Assistant | 2026-05-31T04:53:19.574Z

[tool_use: Bash]

### User | 2026-05-31T04:53:41.234Z

[tool_result] Exit code 1
=== how ids are formatted (sample) ===
"id":"disp.adaptivecontroldispatcher"
"id":"disp.agentdispatcher"
"id":"disp.aireasoningdispatcher"
"id":"disp.algorithmdispatcher"
"id":"disp.atcsdispatcher"
"id":"disp.authdispatcher"
"id":"disp.automationdispatcher"
"id":"disp.autonomousdispatcher"
"id":"disp.autopilotdispatcher"
"id":"disp.bridgedispatcher"
"id":"disp.businessdispatcher"
"id":
... [+637 chars truncated]

### Assistant | 2026-05-31T04:53:47.452Z

Confirmed empirically against the live 573MB merged graph:
- The canonical node ids `disp.caddispatcher`, `disp.calcdispatcher`, `disp.camdispatcher`, `disp.aireasoningdispatcher`, `disp.devdispatcher` all EXIST as real graph nodes.
- `"id": "dispatcher.prism_*"` count = **0** — confirming the old edge target was genuinely dead. The fix premise is correct.

(The `grep -oc` exit 1 is just because the count was 0 — no match — which is exactly the desired result.)

Now let me verify the SSOT premise from the other direction: confirm there are no `disp.<table-value>` that DON'T exist. All 16 are file-derived and I confirmed several exist. Let me spot-check the less-obvious ones (`disp.fiveaxisdispatcher`, `disp.skillscriptdispatcher`, `disp.orchestrationdispatcher`, `disp.intakedispatcher`, `disp.guarddispatcher`, `disp.omegadispatcher`).

### Assistant | 2026-05-31T04:53:49.524Z

[tool_use: Bash]

### User | 2026-05-31T04:54:34.289Z

[tool_result] disp.fiveaxisdispatcher => 1
disp.skillscriptdispatcher => 1
disp.orchestrationdispatcher => 1
disp.intakedispatcher => 1
disp.guarddispatcher => 1
disp.omegadispatcher => 1
disp.safetydispatcher => 1
disp.turningdispatcher => 1
disp.intelligencedispatcher => 1
disp.memorydispatcher => 1
disp.sessiondispatcher => 1

### Assistant | 2026-05-31T04:54:39.026Z

All 16 canonical node ids exist as exactly-one graph node each. The resolver table is correct and the targets are live.

Now let me address review dimension #4 — the gnn test "does not duplicate an existing edge" dedup path. The author claims the pre-seeded fixture was changed to `disp.camdispatcher`. Let me read that test to verify it genuinely exercises dedup (the pre-seeded edge target must match what the new code emits, otherwise it'd trivially add a second edge and "pass" for the wrong reason).

### Assistant | 2026-05-31T04:54:40.478Z

[tool_use: Grep]

### User | 2026-05-31T04:54:46.913Z

[tool_result] 73-  for (let i = 0; i < unknownN; i++) {
74-    nodes.push(makeGhost(`ghost.unwired.Tgt${i}`, `Tgt${i}Engine`, "UNKNOWN"));
75-  }
76:  // 6 high-confidence references spanning prism_cam / prism_calc / prism_turning
77-  const refSpec = [
78:    ["Cam1", "prism_cam", 0.85], ["Cam2", "prism_cam", 0.82],
79-    ["Calc1", "prism_calc", 0.88], ["Calc2", "prism_calc", 0.81],
80-    ["Turn1", "prism_tu
... [+9778 chars truncated]

### Assistant | 2026-05-31T04:54:53.687Z

The dedup test (lines 641-653) is genuine and well-constructed. The pre-seeded edge target is `disp.camdispatcher` (line 645) — the SAME canonical target that `applyGnnClassifications` now emits for `prism_cam` (verified line 636 in the sibling test). The dedup key is `from::to::type` = `g.x::disp.camdispatcher::ghost-wire`. The classification input emits the same key, so `edgesAdded:0` (line 651) genuinely exercises the dedup path. Had the fixture kept the old `dispatcher.prism_cam` target, the keys would differ and the test would WRONGLY pass with `edgesAdded:1` — so the fixture change was necessary and correct. This dimension is sound.

I notice line 633 and 644-645 use `\` instead of `//` for comments (lines 633: `\ U-VIZ-G4...`). Let me check — actually that's the Read tool's rendering; the test passed compilation so it's `//`. Let me verify the gnn and llm test files compile and pass, and run the pdf-course-bridge test too.

### Assistant | 2026-05-31T04:54:55.629Z

[tool_use: Bash]

### User | 2026-05-31T04:55:04.652Z

[tool_result] gnn-test-syntax-OK
llm-test-syntax-OK
pdf-test-syntax-OK
lib-syntax-OK

### Assistant | 2026-05-31T04:55:09.333Z

[tool_use: Bash]

### User | 2026-05-31T04:55:20.845Z

[tool_result] === scripts/lib/viz-dispatcher-node-id.test.mjs ===
# tests 8
# pass 8
# fail 0
=== scripts/seed-ghost-gnn-classify.test.mjs ===
# tests 60
# pass 60
# fail 0
=== scripts/seed-ghost-llm-classify.test.mjs ===
# tests 31
# pass 31
# fail 0
=== scripts/generate-pdf-course-bridge-features.test.mjs ===
# tests 19
# pass 19
# fail 0
=== scripts/seed-ghost-from-unwired.test.mjs ===
# tests 36
# pass 36
#
... [+7 chars truncated]

### Assistant | 2026-05-31T04:55:26.666Z

The 5 directly-named test files all pass (8+60+31+19+36 = 154 — that's exactly the author's "154 affected tests" count). But the author's affected-test SET was incomplete: `extract-cadcam-tribal-wiki.test.mjs` (16 tests, 1 now failing) was the missed dependent.

Let me now confirm completeness dimension #3 definitively — are there any OTHER `.mjs` producers that emit `dispatcher.<...>` graph edge targets and were not fixed? My earlier whole-tree grep timed out for the template-literal form. Let me do a targeted, scoped grep over scripts (non-test) for the dynamic-construction patterns and the literal patterns separately, excluding the already-handled files.

### Assistant | 2026-05-31T04:55:28.799Z

[tool_use: Bash]

### User | 2026-05-31T04:57:07.352Z

[tool_result] Terminated
=== EXIT 143 (124=timeout) ===

### Assistant | 2026-05-31T04:57:10.767Z

The recursive grep over the full scripts tree is too slow (large generated files). Let me restrict to the producer subset — files that write to system-graph or emit augmentation edges. Let me use the Grep tool (ripgrep, faster) with a tighter literal pattern across just `.mjs` and exclude `.test.mjs`.

### Assistant | 2026-05-31T04:57:12.738Z

[tool_use: Grep]

### User | 2026-05-31T04:57:28.264Z

[tool_result] H:\prism\scripts\extract-cadcam-tribal-wiki.test.mjs:54:  assert.ok(r.bridge_dispatchers.some(d => d.startsWith("dispatcher.prism_")));
H:\prism\scripts\generate-pdf-course-bridge-features.mjs:111: *  the previous `dispatcher.prism_*` literals were dead targets in the merged
H:\prism\scripts\generate-pdf-course-bridge-features.test.mjs:174:    // Regression guard: the OLD producer emitted dead `di
... [+1051 chars truncated]

### Assistant | 2026-05-31T04:57:32.210Z

The remaining hits are all comments, regression-guard test assertions, or the lib's own docstring — no NEW live producer emitting a `dispatcher.` edge target. The one substantive non-comment hit is line 54 of `extract-cadcam-tribal-wiki.test.mjs` (already flagged) and `regen-viz.mjs:417` (a comment). Let me check that `regen-viz.mjs:417` comment context to make sure it's not describing an unfixed merge-side resolver that the change should have updated.

### Assistant | 2026-05-31T04:57:33.005Z

[tool_use: Read]

### User | 2026-05-31T04:57:39.707Z

[tool_result] 405	// Wiki-debt worklist — rank the L4/L5 nodes with no (dedicated) wiki page by
406	// leverage×degree → WIKI-DEBT-WORKLIST.md (companion to the brain viewer's
407	// 📚 docs-coverage overlay; feeds /curiosity-queue + /wiki-ingest).
408	console.log(`[regen-viz] regenerate wiki-debt worklist…`);
409	const wd = spawnSync(process.execPath, [...NODE_ARGS, path.join(ROOT, "scripts", "generate-wiki-deb
... [+1545 chars truncated]

### Assistant | 2026-05-31T04:57:46.561Z

That's a comment in the dead-pixel sweep stage — it describes the dead-edge ROOT CAUSE and explicitly notes there are TWO id-scheme mismatches: (1) `dispatcher.prism_X` → `disp.*` (this change's scope) AND (2) `engine.<Pascal>` → `eng.<domain>` (Half B / a separate merge-side pass, per the existing TaskList #20). The `engine.<Pascal>` class is acknowledged as out-of-scope and handled by merge-augmentations canonicalization (consistent with the pdf-bridge generator comment lines 210-213). So the dispatcher-prefix half is complete for the 4 producers, with the one missed test being the gap.

Now let me address dimension #5 (the `prism_shop` single-dead-pixel) and check whether the merge-augmentations actually canonicalizes engine targets as the generator comment claims (to confirm the pdf-bridge `engine.*` targets aren't a NEW dead-edge class introduced/left by this change). Let me verify the merge-augmentations edge-target pass exists.

### Assistant | 2026-05-31T04:57:48.078Z

[tool_use: Grep]

### User | 2026-05-31T04:57:58.875Z

[tool_result] 574:  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
619:  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
659:  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
700:  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
764:  const edgeKey = e => `${e.from || e.source}|${e.to || e.target}`;
792:  const edgeKey = e => `${e.from || 
... [+3114 chars truncated]

### Assistant | 2026-05-31T04:58:44.086Z

The merge-augmentations engine-target canonicalization (`engine.<Pascal>` → `eng.<domain>`) is Half B / Task #20 — explicitly a separate, still-pending pass, not part of this dispatcher-prefix change. So the pdf-bridge generator leaving `engine.*` targets raw is consistent with the documented division of labor (generator comment lines 210-213). Not a defect of THIS change.

I have enough to finalize all five review dimensions plus the critical completeness finding. Let me record the failing test in the task tracker and write up the verdict.

The analysis is complete. Here is my review.

---

## Code Quality Analysis Report — ARM A (code-analyzer)
### Unit: U-VIZ-G4-DEAD-EDGE (dispatcher-prefix SSOT extraction)

### Summary
- Resolver lib + 4 producers: **architecturally sound and correct**.
- One **P0**: the change mutated two exported tables (`PDF_KIND_TO_DISPATCHERS`, `COURSE_KIND_TO_DISPATCHERS`) that have a **second, un-listed consumer** whose test now FAILS. The "all 154 affected tests pass" claim is true only for the under-scoped 5-file set the author considered; the affected surface is larger.

---

### Critical Issues

**P0 — Missed dependent consumer + broken test (the affected-test set was under-scoped)**
- File: `H:/prism/scripts/extract-cadcam-tribal-wiki.test.mjs:54`
- File: `H:/prism/scripts/extract-cadcam-tribal-wiki.mjs:26-29, 50, 57, 85, 129`
- `extract-cadcam-tribal-wiki.mjs` imports `PDF_KIND_TO_DISPATCHERS` and `COURSE_KIND_TO_DISPATCHERS` from `generate-pdf-course-bridge-features.mjs` — the exact tables this change converted from `dispatcher.prism_*` literals to bare `prism_*` MCP names. It copies those raw values verbatim into the tribal-corpus JSONL field `consume.bridge_dispatchers` (`entryToTribal`, line 85) and the wiki index `**Dispatchers**:` line (`renderWikiIndex`, line 129), which delta/kilo slots consume as training references.
- **I confirmed by running it: the test FAILS** (1 of 16):
  ```
  not ok 1 - resolveBridgeTargets resolves 
... [+5889 chars truncated]
