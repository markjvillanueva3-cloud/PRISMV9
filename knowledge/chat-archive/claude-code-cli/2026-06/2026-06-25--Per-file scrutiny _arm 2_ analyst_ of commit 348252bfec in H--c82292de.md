---
type: "chat-session"
source: "claude-code-cli"
session_id: "c82292de-3196-443a-9079-0b9c268968eb"
title: "Per-file scrutiny (arm 2, analyst) of commit 348252bfec in H:/prism (`git -C H:/"
date: "2026-06-25"
first_ts: "2026-06-25T08:27:11.424Z"
last_ts: "2026-06-25T08:39:46.737Z"
cwd: "H:\\PRISM"
messages: 65
user_msgs: 25
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/c82292de-3196-443a-9079-0b9c268968eb/subagents/agent-af2f23609aa066399.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Per-file scrutiny (arm 2, analyst) of commit 348252bfec in H:/prism (`git -C H:/

> **claude-code-cli** | 2026-06-25 | 65 msgs (25 user / 40 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/c82292de-3196-443a-9079-0b9c268968eb/subagents/agent-af2f23609aa066399.jsonl`

## Transcript

### User | 2026-06-25T08:27:11.424Z

Per-file scrutiny (arm 2, analyst) of commit 348252bfec in H:/prism (`git -C H:/prism show 348252bfec`). Weighted toward silent breakage + data-integrity. It appends 10 Tier-A positive labels to the GNN reference-pool seed state/shared/nn-graph/reference-pool-seed-2026-05-23.json. A wrong Tier-A label poisons the GNN tier-5 classifier.

Hunt specifically for:
1. CONSUMER BREAKAGE: what reads this seed file? (grep for "reference-pool-seed" / the file path across scripts/). Does scripts/lib/nn-graph-eval.mjs or refpool-merge.mjs consume `seedEntries`? Will 10 new entries with sourceHook="india-refpool-growth-2026-06-25" (a NON-hook provenance string, unlike the alpha entries which name real .mjs hooks) break any consumer that assumes sourceHook is a real file, or that parses the ref/dispatcherFile fields? Confirm the new entries' shape EXACTLY matches the consumed schema.
2. MISLABEL/poison: independently grep each of the 10 actions (feature_recognize, geometry_create, mesh_generate / estimate, quote_generate / job_plan, setup_sheet / check_toolpath_collision, validate_rapid_moves, check_fixture_clearance) in its named dispatcher. Are any of them actually fakes, or routed under a DIFFERENT prism_ prefix than claimed? The safety three came from a `new Set([...])` — verify that Set is the dispatcher's action-acceptance set (so they ARE real prism_safety actions), not an unrelated internal grouping.
3. Does adding entries immediately affect the eval/holdout (is advisoryOnly actually gated, or are seedEntries consumed into training regardless)? If consumed immediately, are 10 verified-correct positives safe (they should be — correct labels don't poison)?
4. JSON validity, no duplicate refs vs the existing 27, policy fields intact.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: file:line for any consumer-break or mislabel, then <=4 notes. If unsure any entry is mislabeled, FAIL.

### Assistant | 2026-06-25T08:27:15.476Z

I'll investigate this commit and its consumers systematically. Let me start by examining the commit and the seed file.

### Assistant | 2026-06-25T08:27:16.417Z

[tool_use: Bash]

### Assistant | 2026-06-25T08:27:16.902Z

[tool_use: Grep]

### Assistant | 2026-06-25T08:27:17.542Z

[tool_use: Grep]

### User | 2026-06-25T08:27:24.184Z

[tool_result] commit 348252bfec91c3fcdb114cc6c93c99030cb51853
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 25 03:26:21 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-REFPOOL-GROW-CLASSES (slot:india): +10 grep-verified Tier-A reference-pool entries spanning 4 NEW dispatcher classes
    
    THE GAP (NN/GNN leg #10, india owns): tier-5 selective-deploy is AUROC 0.846 @tau=0.7
    
... [+8332 chars truncated]

### User | 2026-06-25T08:27:25.899Z

[tool_result] knowledge\wiki\code-tribal\learnings\ai-systems-gnn-u-refpool-grow-classes.md:31:no cleanly-verified full action). seedEntries 27->37; JSON valid; policy preserved
state\HANDOFF.md:30:[Omitted long matching line]
state\shared\nn-graph\reference-pool-seed-2026-05-23.json:15:  "seedEntries": [

### User | 2026-06-25T08:27:26.437Z

[tool_result] Found 21 files
state\shared\dashboards\injection-dedup-cache.json
knowledge\memories\reference\reference_india_nn_graph_state_paths_2026_05_28.md
knowledge\memories\reference\reference_gnn_selective_promote_disproven_2026_06_15.md
knowledge\memories\reference\reference_gnn_pool_collapse_confidence_deflation_2026_06_15.md
knowledge\wiki\code-tribal\learnings\ai-systems-gnn-u-refpool-grow-classes.md
... [+696 chars truncated]

### Assistant | 2026-06-25T08:27:30.493Z

Now let me find what consumes this seed file and verify the schema. Let me look at the consumer scripts and the full seed file.

### Assistant | 2026-06-25T08:27:31.905Z

[tool_use: Bash]

### Assistant | 2026-06-25T08:27:32.446Z

[tool_use: Read]

### User | 2026-06-25T08:27:33.845Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedAt": "2026-05-23T20:30:00Z",
4	  "generatedBy": "alpha slot, claude-95e7030e, TOKEN-SAVINGS-PIVOT/U-PSN-NN-SEED (gap-fill 5/5)",
5	  "purpose": "Reference-pool seed for NN-GRAPH tier-5 (GraphSAGE wiring-inference). Currently dormant — AUROC 0.096 vs gate 0.78 because reference pool is 0-sized. This file provides 25+ seed examples drawn from the iter9
... [+8917 chars truncated]

### User | 2026-06-25T08:30:12.064Z

[tool_result] mcp-server/data/state/BROADCAST_CHANNEL.jsonl
mcp-server/data/state/hook-fire-counts.jsonl
mcp-server/data/state/session-file-ownership.json
mcp-server/src/engines/ai-training/PATHS.md

### Assistant | 2026-06-25T08:30:19.447Z

The grep for consumers in `scripts/` returned nothing — the declared consumer is `scripts/lib/nn-graph-eval.mjs`. Let me find the actual consumer and check how `seedEntries` is parsed, plus verify the schema shape (note the diff is consumed via `ref` and `dispatcherFile` fields).

### Assistant | 2026-06-25T08:30:21.889Z

[tool_use: Bash]

### Assistant | 2026-06-25T08:30:22.223Z

[tool_use: Glob]

### Assistant | 2026-06-25T08:30:22.481Z

[tool_use: Glob]

### User | 2026-06-25T08:30:26.472Z

[tool_result] scripts/lib/nn-graph-eval.mjs*
---EXISTS---
=====refpool consumers=====
scripts/lib/gnn-active-pool-select.mjs
scripts/lib/graph-io.mjs
scripts/lib/loop-goal-stack-advisor.mjs
scripts/lib/refpool-merge.mjs
scripts/lib/refpool-merge.test.mjs
scripts/ai-training-awareness.mjs
scripts/analyze-ghost-embed-separability.mjs
scripts/fisher-reweight-embeddings.mjs
scripts/ghost-wire-outcomes-to-refpool.mj
... [+553 chars truncated]

### User | 2026-06-25T08:30:32.245Z

[tool_result] scripts\nn-graph-calibration-analysis.mjs
scripts\nn-graph-calibration-analysis.test.mjs
scripts\nn-graph-embedding-degeneracy.test.mjs
scripts\nn-graph-embedding-degeneracy.mjs
scripts\nn-graph-retrain-lifecycle.heterophily.test.mjs
scripts\nn-graph-holdout-variance.test.mjs
scripts\nn-graph-holdout-variance.mjs
scripts\nn-graph-conformal-audit.mjs
scripts\nn-graph-conformal-audit.test.mjs
script
... [+151 chars truncated]

### User | 2026-06-25T08:30:32.314Z

[tool_result] scripts\vault-to-gnn-refpool.heap.test.mjs
scripts\ghost-wire-outcomes-to-refpool.test.mjs
scripts\lib\refpool-merge.mjs
scripts\lib\refpool-merge.test.mjs
scripts\ghost-wire-outcomes-to-refpool.mjs
scripts\wired-engines-to-refpool.test.mjs
scripts\wired-engines-to-refpool.mjs
scripts\measure-codebase-wired-refpool-auroc.test.mjs
scripts\measure-codebase-wired-refpool-auroc.mjs
scripts\vault-to-gn
... [+51 chars truncated]

### Assistant | 2026-06-25T08:30:40.041Z

Let me read the two key consumers: `refpool-merge.mjs` (how it parses `seedEntries` shape) and `nn-graph-eval.mjs` (the declared eval consumer), plus see who actually loads this specific seed file.

### Assistant | 2026-06-25T08:30:40.960Z

[tool_use: Read]

### Assistant | 2026-06-25T08:30:41.845Z

[tool_use: Bash]

### User | 2026-06-25T08:30:42.063Z

[tool_result] 1	// scripts/lib/refpool-merge.mjs
2	// Shared idempotent ADD/UPDATE merge for the GNN reference-pool feeders
3	// (vault-to-gnn-refpool + ghost-wire-outcomes-to-refpool). BUILD-ONCE (R15/R7/R8):
4	// the merge loop is the churn-prone part -- the original feeders REPLACED a node on
5	// every id-match (re-stamping the volatile `proposed_at`) and ALWAYS wrote the ~542MB
6	// system-graph.json, so a
... [+2444 chars truncated]

### User | 2026-06-25T08:30:46.213Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-25T08:30:55.045Z

`refpool-merge.mjs` doesn't reference this seed file directly. The grep for the exact filename in scripts returned nothing — so no live `.mjs` script reads `reference-pool-seed-2026-05-23.json`. Let me confirm what actually consumes the seed (the declared `nn-graph-eval.mjs`) and whether the seed file is dead/advisory. Let me check the eval file and broaden the search.

### Assistant | 2026-06-25T08:30:56.721Z

[tool_use: Bash]

### User | 2026-06-25T08:35:58.582Z

[tool_result] Command running in background with ID: bku0ljtuo. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\c82292de-3196-443a-9079-0b9c268968eb\tasks\bku0ljtuo.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-25T08:36:14.220Z

[tool_use: Bash]

### User | 2026-06-25T08:36:24.053Z

[tool_result] done waiting

### Assistant | 2026-06-25T08:36:27.248Z

[tool_use: Read]

### User | 2026-06-25T08:36:28.153Z

[tool_result] 1	=====any code that reads the seed filename anywhere=====
2	

### Assistant | 2026-06-25T08:36:32.974Z

The background grep is still in flight or returned nothing. Let me run a targeted, faster grep with `rtk` and confirm the eval consumer directly.

### Assistant | 2026-06-25T08:36:35.236Z

[tool_use: Bash]

### User | 2026-06-25T08:36:43.285Z

[tool_result] mcp-server/src/engines/ai-training/PATHS.md
===EVAL FILE refpool refs===
369: *     has collapsed to the reference-pool class prior. On its own (with varying
430:    detail = `all predictions = \`${dominantClass}\` but confidence varies — collapsed to the reference-pool class prior`;
534:      reason: poolSize < 2 ? "insufficient-reference-pool" : "empty-holdout",
776:      (d.dominantClass ? ` co
... [+157 chars truncated]

### Assistant | 2026-06-25T08:36:47.946Z

Confirmed: **no `.mjs` consumer reads `reference-pool-seed-2026-05-23.json` by filename** — only `PATHS.md` (a doc) mentions it. The eval file references "reference-pool" conceptually but doesn't load this seed file. The `expectedConsumers` in the seed are aspirational. Let me verify how the reference pool actually gets fed (the graph nodes), and confirm the seed is not auto-ingested into training. Let me check `nn-graph-eval.mjs` for how it builds the holdout/pool.

### Assistant | 2026-06-25T08:36:48.913Z

[tool_use: Read]

### Assistant | 2026-06-25T08:36:50.420Z

[tool_use: Bash]

### User | 2026-06-25T08:36:51.442Z

[tool_result] 490	  // leave a reference). This makes macroF1 a fair per-class average; class skew in
491	  // the REMAINING references is already handled by the shipped base-rate
492	  // normalization in voteDispatcher. (spec GNN-DEGENERATE-FIX 1b)
493	  const byClass = new Map();
494	  for (const n of pool) {
495	    const c = n.proposed_wiring;
496	    if (!byClass.has(c)) byClass.set(c, []);
497	    byClas
... [+3471 chars truncated]

### User | 2026-06-25T08:36:54.788Z

[tool_result] 6: * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
11: *   1. The reference set is the ghost engines the keyword/sibling tiers already
14: *   2. A seeded, deterministic fraction of them is HELD OUT — removed from the
15: *      reference pool and handed to the GNN classifier as targets.
27: * bucketize, gradeMetrics — are exported and reference-tested. Consistent wi
... [+2810 chars truncated]

### Assistant | 2026-06-25T08:37:01.626Z

Critical finding confirmed: the eval harness `buildHoldout` draws the reference pool from **graph nodes** with `kind === "ghost.unwired-engine"` and `proposed_wiring`/`label` fields — NOT from the seed file's `seedEntries` shape (`ref`/`dispatcherFile`/`tier`/`sourceHook`). The seed JSON entries have a completely different schema and are never loaded by the eval. So this commit does NOT directly enter training/holdout. The seed is advisory documentation; a feeder script would have to translate `seedEntries` into graph ghost nodes, and no such feeder reads this file (grep=0 in scripts/).

Now the core obligation: **independently verify each of the 10 labeled actions is real** (mislabel = poison). Let me grep each action in its named dispatcher. First locate the dispatcher files.

### Assistant | 2026-06-25T08:37:03.543Z

[tool_use: Bash]

### User | 2026-06-25T08:37:13.358Z

[tool_result] businessDispatcher.ts
cadDispatcher.ts
intelligenceDispatcher.ts
safetyDispatcher.ts
---if missing, find them---
../../tools/dispatchers/businessDispatcher.ts
../../tools/dispatchers/cadDispatcher.ts
../../tools/dispatchers/intelligenceDispatcher.ts
../../tools/dispatchers/safetyDispatcher.ts

### Assistant | 2026-06-25T08:37:16.317Z

All four dispatcher files exist at `mcp-server/src/tools/dispatchers/`. Now let me independently grep each of the 10 actions in its claimed dispatcher.

### Assistant | 2026-06-25T08:37:20.262Z

[tool_use: Bash]

### User | 2026-06-25T08:37:28.203Z

[tool_result] ===== CAD: feature_recognize / geometry_create / mesh_generate =====
130:  "geometry_create", "geometry_transform", "geometry_analyze",
131:  "mesh_generate", "mesh_import", "mesh_export",
138:  "feature_recognize", "feature_edit",
678:          case "geometry_create": {
693:          case "mesh_generate": {
695:            result = engine.generate?.(params) ?? { mesh_generated: true, element_size
... [+1872 chars truncated]

### Assistant | 2026-06-25T08:37:36.669Z

Now I need to verify the critical ones precisely. Two items need closer inspection:

1. **`prism_cad:feature_recognize`** — line 138 in the action list, line 806 has `case "feature_recognize"`. Real.
2. **`prism_cad:geometry_create`** — line 130 list, line 678 case. Real.
3. **`prism_cad:mesh_generate`** — line 131 list, line 693 case. Real.
4. **`prism_business:estimate`** — line 197 `case "estimate":` exists. But I need to confirm `"estimate"` is in the business action-acceptance enum (not just a switch case for something else), and not actually `estimate_create`.
5. **`prism_business:quote_generate`** — line 1059 in list, line 4476 case. Real.
6. **`prism_intelligence:job_plan`** — line 183 list, line 641 case. Real.
7. **`prism_intelligence:setup_sheet`** — line 184 list, line 652 case. Real.
8. **Safety three** — confirmed `COLLISION_ACTIONS = new Set([...])` at line 54-55, and crucially line 499 spreads `...COLLISION_ACTIONS` into what is likely the acceptance set, and line 617 `COLLISION_ACTIONS.has(action)` routes them. Need to confirm line 499 is the action-acceptance set.

Let me verify the `estimate` business case is a real accepted action, and confirm the safety acceptance set at line 499.

### Assistant | 2026-06-25T08:37:40.576Z

[tool_use: Bash]

### User | 2026-06-25T08:37:44.777Z

[tool_result] ===== BUSINESS: is bare 'estimate' in the accepted-action enum? =====
583:const ACTIONS = [
1641:      action: z.enum(ACTIONS),

--- context around the estimate action list membership (lines 180-210) ---
let _marketplaceFinalRank: any; // HOTEL: NETPLAT capstone — blend match+reputation+logistics+capacity
let _marketplaceMatchOrch: any; // HOTEL: NETPLAT orchestrator — end-to-end RFQ rank (capabil
... [+4165 chars truncated]

### Assistant | 2026-06-25T08:37:52.107Z

Now I have a discrepancy to resolve on the **business `estimate`** label. The grep shows:
- Line 197: `case "estimate":` — but this is inside `getEngine(name)`, an **engine-loader switch keyed by ENGINE name, not by dispatcher ACTION**. The actual action handler at line 1962 is `case "estimate_create":` which calls `getEngine("estimate")`.

This is exactly the kind of false-positive the india soul warned about. I need to confirm whether bare `"estimate"` is in the `ACTIONS` enum (line 583), which is the dispatcher action-acceptance list (`z.enum(ACTIONS)` at 1641). If `"estimate"` is NOT in `ACTIONS`, then `prism_business:estimate` is a **MISLABEL** — the real action is `estimate_create`, and `estimate` is only an engine-registry key.

### Assistant | 2026-06-25T08:37:57.526Z

[tool_use: Bash]

### User | 2026-06-25T08:38:01.467Z

[tool_result] ===== Is bare 'estimate' a member of the ACTIONS enum (the z.enum acceptance list)? =====
--- ACTIONS array spans from line 583; find its closing bracket and check for bare estimate ---

===== exact-token search: bare "estimate" as a standalone array element =====

===== how is action routed? is there a case "estimate": in the ACTION switch (not getEngine)? =====
197:    case "estimate":

### Assistant | 2026-06-25T08:38:07.386Z

This is a significant finding. The only `case "estimate"` in the entire file is at **line 197, inside `getEngine(name)`** — the engine-loader switch keyed by engine name. There is **no bare `"estimate"` element in the `ACTIONS` enum** and **no `case "estimate":` in the action-routing switch**. The real action is `estimate_create` (line 1962).

Let me definitively confirm `"estimate"` is absent from the `ACTIONS` array and find the real estimate-family actions in the enum.

### Assistant | 2026-06-25T08:38:10.949Z

[tool_use: Bash]

### User | 2026-06-25T08:38:15.347Z

[tool_result] ===== Find ACTIONS array bounds (line 583 start) and its closing ] =====
1644:     async ({
1645:       action,
1646:       params: rawParams = {},
1647:     }: {
1648:       action: typeof ACTIONS[number];
--- closing bracket line number ---
1628

===== all estimate* tokens inside the ACTIONS enum region (583 to ~1640) =====
      1 978:"estimate_create"

===== confirm z.enum(ACTIONS) is the vali
... [+490 chars truncated]

### Assistant | 2026-06-25T08:38:24.399Z

**Confirmed MISLABEL.** The `ACTIONS` enum (lines 583–1628, validated via `z.enum(ACTIONS)` at line 1641) contains exactly **`"estimate_create"`** — there is no bare `"estimate"` action. The bare `"estimate"` token at line 197 is an **engine-registry key inside `getEngine(name)`**, not a dispatcher action. A caller invoking `prism_business:estimate` would get an `invalid action` Zod rejection.

This is precisely the false-positive class the commit message claimed to have screened for (it dropped `financial_snapshot` etc. for grep=0). But `prism_business:estimate` grep-matched on the *engine-loader case*, not the action enum — a shallow grep that confused engine-key with action-name. By the india soul's own stated rule ("a wrong Tier-A label POISONS the GNN"), this is a poisoned label.

Now let me rigorously re-verify the other 9 against their **actual action-acceptance enums** (not just any case/list match), since the `estimate` failure shows the grep-confirmation method was unsound. Let me confirm the CAD, intelligence, and safety acceptance sets.

### Assistant | 2026-06-25T08:38:26.727Z

[tool_use: Bash]

### User | 2026-06-25T08:38:30.853Z

[tool_result] ===== CAD: find the action-acceptance enum and confirm 3 actions are members =====
114:const ACTIONS = [
648:    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
--- the list at lines 128-140 (is THIS the acceptance enum?) ---
  "catia_workbench_layout", "catia_commands_for_workbench", "catia_toolbars_for_workbench",
  "catia_resolve", "catia_event_subscriptions", "ca
... [+1189 chars truncated]

### Assistant | 2026-06-25T08:38:35.307Z

**CAD confirmed REAL.** The `ACTIONS` array (line 114, validated `z.enum(ACTIONS)` at 648) contains `geometry_create` (130), `mesh_generate` (131), `feature_recognize` (138). All three CAD entries are genuine acceptance-enum members. Correct labels.

Now intelligence (`job_plan`, `setup_sheet`) and confirm the safety `ALL_ACTIONS`/`z.enum` acceptance.

### Assistant | 2026-06-25T08:38:37.901Z

[tool_use: Bash]

### User | 2026-06-25T08:38:42.094Z

[tool_result] ===== INTELLIGENCE: acceptance enum + job_plan/setup_sheet membership =====
625:// Combined: core + all forwarded for z.enum (backward compatibility)
626:const ALL_ACTIONS = [
924:      action: z.enum(ALL_ACTIONS),
--- context lines 178-215 (the action list) ---
  // OBSIDIAN-AUTOMATE-MS3/U-DIGITAL-TWIN-FORMULAS-EXPOSE: 4 numerical methods from DigitalTwinFormulasEngine
  "digital_twin_ekf_predict
... [+1063 chars truncated]

### Assistant | 2026-06-25T08:38:51.713Z

All remaining verifications are now complete:

- **INTELLIGENCE confirmed REAL.** `job_plan` (line 183) and `setup_sheet` (line 184) are both members of the combined `ALL_ACTIONS` enum (line 626, validated `z.enum(ALL_ACTIONS)` at 924). And line 641/652 have real `case` handlers. Correct labels.
- **SAFETY confirmed REAL.** `COLLISION_ACTIONS = new Set([...])` (line 54) is spread into `ALL_ACTIONS` (line 498-499), validated via `z.enum(ALL_ACTIONS)` at line 558, and routed via `COLLISION_ACTIONS.has(action)` at line 617. So `check_toolpath_collision`, `validate_rapid_moves`, `check_fixture_clearance` are genuine acceptance-set members AND routed. The commit's claim that the Set is the action-acceptance set is verified. Correct labels.
- **BUSINESS `quote_generate` confirmed REAL** (line 1059 in ACTIONS region, case at 4476). Correct.

So 9 of 10 are correct; **`prism_business:estimate` is the single mislabel** (real action is `estimate_create`).

Let me also verify JSON validity, no duplicate refs vs existing, and policy fields intact — and re-confirm the data-integrity blast radius (does anything translate `seedEntries` into the graph).

### Assistant | 2026-06-25T08:38:58.889Z

[tool_use: Bash]

### User | 2026-06-25T08:39:08.817Z

[tool_result] ===== JSON validity =====
VALID JSON, seedEntries=37, advisoryOnly=true, mustHumanVerify present=true

===== duplicate refs check =====
total refs=37, unique=36, dups=prism_memory:remember

===== schema-shape parity: do new entries have same keys as old? =====
distinct key-shapes among 37 entries: dispatcherFile,note,ref,sourceHook,tier

===== does ANY .mjs translate seedEntries->graph ghost nodes
... [+97 chars truncated]

### Assistant | 2026-06-25T08:39:46.737Z

All checks complete. Final summary of findings:

- **JSON valid**, 37 entries, all single uniform key-shape (`dispatcherFile,note,ref,sourceHook,tier`) — new entries match the consumed schema exactly.
- **Policy intact**: `advisoryOnly:true`, `mustHumanVerify` present.
- **The `prism_memory:remember` "dup"** is pre-existing (lines 32 & 33, two different sourceHooks → same ref, from the original 27), NOT introduced by this commit. Not a regression.
- **No code path ingests `seedEntries` into the graph or training** — grep across `scripts/` and `mcp-server/src/` finds only docs. The eval harness (`buildHoldout`) draws its reference pool from live graph nodes of `kind:"ghost.unwired-engine"` with `proposed_wiring`/`label` fields — a different schema entirely. So this seed change does **not** auto-enter the holdout/AUROC eval. The `sourceHook:"india-refpool-growth-2026-06-25"` non-hook provenance string breaks nothing because nothing parses `sourceHook` as a real file.
- **The mislabel does NOT reach the classifier today** (no live ingestion path), so it is not a P0 corruption. But it is a P1: the file is a labeled training-seed whose entire purpose and policy is correctness ("a wrong Tier-A label POISONS the GNN"), it is the declared input to a future `nn-graph-eval` promotion path, and the commit explicitly claims all 10 were grep-verified real. One is not.

The kill-the-task background event failed harmlessly (a malformed earlier grep); all needed evidence was gathered via the foreground calls.

---

VERDICT: FAIL

summary: 9 of the 10 new Tier-A labels are genuine acceptance-enum actions in their named dispatchers (CAD geometry_create/mesh_generate/feature_recognize, intelligence job_plan/setup_sheet, safety's three COLLISION_ACTIONS-set members, business quote_generate — all verified against the real `z.enum` acceptance lists). But `prism_business:estimate` is a MISLABEL: the bare action `"estimate"` is NOT in `businessDispatcher.ts`'s `ACTIONS` enum — the real act
... [+2484 chars truncated]
