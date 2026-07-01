---
type: "chat-session"
source: "claude-code-cli"
session_id: "23c10eea-c03b-414f-9e26-380e20195aee"
title: "Independent, concise second-pass review of a 1-stage wiring insertion (NN-GRAPH-"
date: "2026-05-17"
first_ts: "2026-05-17T18:30:50.671Z"
last_ts: "2026-05-17T18:32:39.799Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a993fea0f98f0a0c0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent, concise second-pass review of a 1-stage wiring insertion (NN-GRAPH-

> **claude-code-cli** | 2026-05-17 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a993fea0f98f0a0c0.jsonl`

## Transcript

### User | 2026-05-17T18:30:50.671Z

Independent, concise second-pass review of a 1-stage wiring insertion (NN-GRAPH-MS2 U1) into H:/prism/scripts/regen-viz.mjs + its guard test H:/prism/scripts/__tests__/regen-viz-seed-ghost-stage.test.mjs. A prior reviewer graded PASS (0 P0/P1, 2 deferrable P2). Do NOT assume that's right — focus on what a wiring-correctness pass might under-weight.

The change: a new post-merge `spawnSync` stage running `seed-ghost-from-unwired.mjs --apply` (re-seeds high-confidence `ghost.unwired-engine` reference nodes into system-graph.json every regen, fixing the `poolSize:0` that keeps the GNN tier-5 permanently dormant), inserted after `add-parent-contains-edges`, fail-loud `failed++` on non-zero, mirroring 4 sibling post-merge stages.

Check specifically:
1. CORRECTNESS OF THE FIX'S PREMISE: does seeding ghosts into system-graph.json on every regen actually make nn-graph-eval `poolSize >= 2`? Read scripts/lib/nn-graph-eval.mjs buildHoldout (pool = nodes where kind==="ghost.unwired-engine" && valid proposed_wiring && confidence >= refMinConf 0.8 && unique label) and scripts/seed-ghost-from-unwired.mjs (does --apply actually emit nodes with kind="ghost.unwired-engine", a numeric confidence >= 0.8 for its high-conf rules, proposed_wiring set to a valid dispatcher, and a `label`?). If seed-ghost emits a different `kind` string, or confidence below 0.8, or omits `label`, or proposed_wiring isn't what isValidDispatcher accepts — the fix does NOT actually lift poolSize and this whole unit is theatre. This is the load-bearing check.
2. Does seed-ghost-from-unwired.mjs --apply have any failure mode that could CORRUPT system-graph.json mid-regen (non-atomic write, partial JSON) given it now runs unconditionally on every FAST regen across ~13 concurrent chats? Is its atomicWrite real (temp+rename)?
3. Interaction with the merge-guard fail-loud regression (CLAUDE.md ## Recent regressions, reference_u_regen_viz_merge_faillod): confirm the new stage is genuinely AFTER the abort gate so it 
... [+785 chars truncated]

### Assistant | 2026-05-17T18:30:58.124Z

I'll review this systematically. Let me read the key files.

### Assistant | 2026-05-17T18:30:59.419Z

[tool_use: Bash]

### Assistant | 2026-05-17T18:31:01.523Z

[tool_use: Read]

### User | 2026-05-17T18:31:02.719Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
4	 *
5	 * The assessment harness for the GNN tier-5 wiring classifier. It measures
6	 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
7	 * to deploy, against the milestone's mandatory exit gates:
8	 *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
9	 *
10	 * Method
... [+24376 chars truncated]

### User | 2026-05-17T18:31:04.770Z

[tool_result]  .../camDispatcher.master-post-unified-wire.test.ts | 275 +++++++++++++++++++++
 mcp-server/src/tools/dispatchers/camDispatcher.ts  |  53 ++++
 2 files changed, 328 insertions(+)
---LOG---
9733f95236 [MAIN] [WIRE-UNWIRED]/U-FOXTROT-MASTERPOST: wire MasterPostProcessorUnifiedAGIEngine into prism_cam (5 actions)
1353f2e305 [MAIN] [TSC-FIX]/U-TSC-PIPELINE-HB-ANCHOR: replace uncited 0.2 HB fudge with 
... [+150 chars truncated]

### Assistant | 2026-05-17T18:31:08.400Z

Now let me read the seed-ghost-from-unwired script and the regen-viz change plus its test.

### Assistant | 2026-05-17T18:31:09.260Z

[tool_use: Read]

### Assistant | 2026-05-17T18:31:09.427Z

[tool_use: Read]

### User | 2026-05-17T18:31:10.012Z

[tool_result] read-once-guard: 'H:\prism\scripts\__tests__\regen-viz-seed-ghost-stage.test.mjs' was already read 88s ago in this session and is unchanged (mtime 1779042509918). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-05-17T18:31:10.189Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-from-unwired.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED
4	 *
5	 * Generates L13 ghost nodes for the BUILD_STATE-flagged unwired engines (861
6	 * engines on disk with no dispatcher reference). Each gets:
7	 *   - ghost.unwired-engine node with `proposed_wiring` + `confidence` fields
8	 *   - ghost-wire edge (relation: "proposed-wire") pointing at t
... [+18108 chars truncated]

### Assistant | 2026-05-17T18:31:12.600Z

The test file wasn't actually in my context. Let me read it and the regen-viz stage insertion.

### Assistant | 2026-05-17T18:31:13.926Z

[tool_use: Bash]

### Assistant | 2026-05-17T18:31:15.191Z

[tool_use: Bash]

### User | 2026-05-17T18:31:19.752Z

[tool_result] /**
 * regen-viz-seed-ghost-stage.test.mjs
 * NN-GRAPH-MS2 U1 — anti-regression guard for the reference-pool seed stage.
 *
 * Root cause this unit fixes: `seed-ghost-from-unwired.mjs` (the high-confidence
 * `ghost.unwired-engine` reference-pool generator) existed with an `--apply`
 * mode but was NOT a regen-viz stage, so every graph regen left
 * system-graph.json with 0 ghost nodes → nn-graph-
... [+3272 chars truncated]

### User | 2026-05-17T18:31:23.011Z

[tool_result] 23:import { spawnSync } from "node:child_process";
29:  decideMergePostState,
57:    const dd = spawnSync(process.execPath, [path.join(ROOT, "scripts", "detect-system-viz-drift.mjs")], {
156:  const r = spawnSync(process.execPath, [...NODE_ARGS, abs], { stdio: "inherit", cwd: ROOT });
160:    failed++;
168:// disk). And — crucially — abort BEFORE the post-merge stages on any merge
179:const m = sp
... [+1505 chars truncated]

### Assistant | 2026-05-17T18:31:26.018Z

Let me see the exact insertion region (lines 240-300) and the abort gate region (lines 168-205) in regen-viz.

### Assistant | 2026-05-17T18:31:26.734Z

[tool_use: Read]

### User | 2026-05-17T18:31:27.847Z

[tool_result] 166	// U-REGEN-VIZ-MERGE-FAILLOUD: snapshot pre-merge state so we can detect a
167	// silent no-op merge (exit 0 with no graph delta despite augmentations on
168	// disk). And — crucially — abort BEFORE the post-merge stages on any merge
169	// failure: those stages read system-graph.json and publish downstream
170	// artifacts (EXECUTIVE-BRIEFING, WIKI-DEBT-WORKLIST, obsidian-augmentation)
171	//
... [+6860 chars truncated]

### Assistant | 2026-05-17T18:31:31.234Z

I have everything needed. Let me verify two load-bearing facts: `isValidDispatcher` acceptance and whether the seed script truly emits a numeric confidence ≥0.8 for high-conf rules with a `label` and `kind`.

### Assistant | 2026-05-17T18:31:32.553Z

[tool_use: Bash]

### User | 2026-05-17T18:31:37.693Z

[tool_result] 58:/** A dispatcher label the cascade emits — prism_calc, prism_turning, ... */
70:export function isValidDispatcher(label) {
171:    if (!isValidDispatcher(n.proposed_wiring)) continue;
407:    if (!c || !isValidDispatcher(c.dispatcher) || !Number.isFinite(c.confidence)) continue;

### Assistant | 2026-05-17T18:31:40.442Z

[tool_use: Read]

### User | 2026-05-17T18:31:41.392Z

[tool_result] 56	export const GHOST_KIND = "ghost.unwired-engine";
57	
58	/** A dispatcher label the cascade emits — prism_calc, prism_turning, ... */
59	export const DISPATCHER_RE = /^prism_[a-z0-9_]+$/;
60	
61	export const GNN_DEFAULTS = Object.freeze({
62	  minConf: 0.7,         // GNN gate fires only at/above this (PRISM_NNG_MIN_CONF)
63	  refMinConf: 0.8,      // a ghost is a vote-reference only at/above t
... [+701 chars truncated]

### Assistant | 2026-05-17T18:32:39.799Z

I now have all load-bearing facts confirmed. Here is my independent second-pass review.

---

## VERDICT: PASS (necessary but NOT sufficient for NN autonomy)

### 1. CORRECTNESS OF THE FIX'S PREMISE — CONFIRMED (the load-bearing check passes)

I traced the four `buildHoldout` filter predicates (`nn-graph-eval.mjs:235-241`) against what `seed-ghost-from-unwired.mjs --apply` actually emits in `buildGhostFromUnwired` (`:162-194`):

| Filter (`buildHoldout`) | Seed emits | Match |
|---|---|---|
| `n.kind !== GHOST_KIND` where `GHOST_KIND="ghost.unwired-engine"` | `kind: "ghost.unwired-engine"` (`:173`) | ✅ exact |
| `typeof n.label !== "string"` | `label: engine.name` (`:168`) | ✅ string |
| `!isValidDispatcher(n.proposed_wiring)` → `/^prism_[a-z0-9_]+$/` | `proposed_wiring: inf.dispatcher` — all rule dispatchers (`prism_calc`, `prism_turning`, `prism_5axis`, `prism_skill_script`, `prism_intake`, `prism_guard`, `prism_orchestrate`, …) match the regex | ✅ |
| `!Number.isFinite(n.confidence) \|\| n.confidence < 0.8` | `confidence: inf.confidence` — 10 rules at ≥0.80 (`:42,43,46,48,49`: 0.85/0.85/0.85/0.85/0.80) | ✅ finite, ≥0.8 |

The premise holds: the 10 high-confidence keyword rules (physics 0.85, safety 0.85, lathe 0.85, 5-axis 0.85, AI 0.80, etc.) emit ghosts that pass all four `refMinConf=0.8` filters with a unique `label`. With 861 unwired engines on disk, the ≥0.8-confidence subset will be far more than 2, so `poolSize >= 2` and `assessHoldout` no longer returns `insufficient-reference-pool`. **This unit is not theatre — it genuinely lifts poolSize.** One residual: `UNKNOWN` (no keyword + no sibling, `:115`) is `confidence:0` and `proposed_wiring:"UNKNOWN"` — correctly excluded by both the regex and the 0.8 floor, so no pool poisoning.

### 2. CORRUPTION RISK UNDER ~13 CONCURRENT REGENS — P2 (real, pre-existing, not introduced here)

`atomicWrite` (`seed-ghost-from-unwired.mjs:214-228`) is a genuine temp+rename (`fs.writeFileSync(tmp)` → `fs.renameSync(tmp, filePa
... [+7112 chars truncated]
