---
type: "chat-session"
source: "claude-code-cli"
session_id: "6cef1e3c-59a5-4cd8-8447-449991f1ed8d"
title: "Holistic review (arm A of PRISM's 3-of-3) of commit 157e4898b0 in repo H:/prism:"
date: "2026-06-22"
first_ts: "2026-06-22T02:57:32.772Z"
last_ts: "2026-06-22T03:01:04.115Z"
cwd: "H:\\prism"
messages: 54
user_msgs: 20
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/6cef1e3c-59a5-4cd8-8447-449991f1ed8d/subagents/agent-a6ba4d46976acd1d0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Holistic review (arm A of PRISM's 3-of-3) of commit 157e4898b0 in repo H:/prism:

> **claude-code-cli** | 2026-06-22 | 54 msgs (20 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6cef1e3c-59a5-4cd8-8447-449991f1ed8d/subagents/agent-a6ba4d46976acd1d0.jsonl`

## Transcript

### User | 2026-06-22T02:57:32.772Z

Holistic review (arm A of PRISM's 3-of-3) of commit 157e4898b0 in repo H:/prism: `git -C H:/prism show 157e4898b0`. It is `[SIERRA-VIZ]/U-VIZ-AUG-STALE-SKIP-LEVER` (slot:sierra). It touches scripts/merge-augmentations.mjs — the CANONICAL system-graph builder, the most sensitive file in the repo — so review with maximum skepticism.

What it does: adds an OPT-IN stale-skip to merge-augmentations `loadOptional()`. When PRISM_MERGE_STALE_SKIP=1, loadOptional returns null (skips folding) for any augmentation file older than a threshold (default 720h/30d via PRISM_MERGE_STALE_SKIP_HR). Default-OFF. Pure decision in scripts/lib/augmentation-freshness.mjs `shouldSkipStaleMerge(ageMs,{enabled,thresholdHr})`. Adds a STALE_SKIPPED merge-summary report.

THE LOAD-BEARING SAFETY QUESTION — verify rigorously, grade PASS/FAIL with P0/P1/P2 + file:line:
1. CRASH SAFETY: when the flag is ON, loadOptional returns null for stale files. Does EVERY consumer of a potentially-stale augmentation guard null? The commit claims all 10 current orphan consumers are guarded (awareness/business/spotlight/novelty/fileCoverageV2/heuristicCov/skippedCensus/exhaustiveAudit/coreInventory/fsInventory) AND that null-safety is the SAME contract the existing absent-file path (loadOptional returns null for absent files at line ~70) already enforces. VERIFY: (a) is the absent-path-returns-null claim true (so all consumers MUST already be null-safe)? (b) spot-check 3-4 of the named consumers — are they actually guarded with if(var?...) ? (c) is there ANY consumer in merge-augmentations that dereferences a loadOptional result WITHOUT a null guard (which would be a pre-existing latent crash AND a flag-on crash)?
2. DEFAULT-OFF CORRECTNESS: with the flag unset, is the behavior provably identical to before (no stat, no skip)? Confirm MERGE_STALE_SKIP gates everything.
3. FAIL-SAFE: the stale-skip is wrapped in try/catch that falls through to normal load on stat failure. Confirm a stat error can never drop a file
... [+296 chars truncated]

### Assistant | 2026-06-22T02:57:35.698Z

I'll review commit 157e4898b0 with maximum skepticism, focusing on the load-bearing safety questions. Let me start by reading the full commit and the touched files.

### Assistant | 2026-06-22T02:57:36.569Z

[tool_use: Bash]

### User | 2026-06-22T02:57:40.643Z

[tool_result] commit 157e4898b066eee1b25c36faa2e66d397496fd15
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 21:56:59 2026 -0500

    [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-STALE-SKIP-LEVER (slot:sierra): opt-in merge stale-skip -- the operator-controlled remediation for orphan augmentations
    
    The freshness GUARD (U-VIZ-AUG-FRESHNESS-GUARD) is the SIGNAL -- it surfaces that 1
... [+15516 chars truncated]

### Assistant | 2026-06-22T02:57:44.586Z

I have the full diff. Now let me read the touched files end-to-end, plus the consumer file (merge-augmentations.mjs) to verify the safety claims rigorously.

### Assistant | 2026-06-22T02:57:45.047Z

[tool_use: Read]

### Assistant | 2026-06-22T02:57:45.380Z

[tool_use: Read]

### User | 2026-06-22T02:57:46.339Z

[tool_result] 1	// augmentation-freshness.mjs -- classify the freshness of every system-viz
2	// augmentation file the MERGE actually folds into the live graph.
3	//
4	// WHY (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21):
5	// regen-viz re-merges system-graph.json and reports GREEN from whatever augmentation
6	// files exist on disk. Two silent-staleness paths leave a GREEN graph on rot
... [+7282 chars truncated]

### User | 2026-06-22T02:57:46.703Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * merge-augmentations.mjs — fold per-augmentation JSONs back into system-graph.json
4	 *
5	 * Reads:
6	 *   state/shared/system-viz/system-graph.json
7	 *   state/shared/system-viz/obsidian-augmentation.json     (wiki + memory linkage)
8	 *   state/shared/system-viz/awareness-augmentation.json    (svi, testCount, complexity, coverage)
9	 *   state/shared/system-viz/n
... [+6882 chars truncated]

### Assistant | 2026-06-22T02:57:50.242Z

The pure lib and the loadOptional change are clear. Now the load-bearing question: I must verify EVERY consumer that dereferences a `loadOptional()` result is null-guarded. Let me first find every `loadOptional(` call site and the variables they assign, then verify each consumer. Let me also verify the absent-path-returns-null claim (line 80).

### Assistant | 2026-06-22T02:57:51.003Z

[tool_use: Bash]

### User | 2026-06-22T02:57:56.606Z

[tool_result] 78:function loadOptional(name) {
87:        console.error(`[merge-augmentations] STALE-SKIP: ${name} is ${ageHr}h stale (PRISM_MERGE_STALE_SKIP=1) -- NOT folding its days-old data; re-wire its generator into regen-viz or remove its loadOptional() to retire it. Reported in the merge summary.`);
141:const obsidian   = loadOptional("obsidian-augmentation.json");
142:const awareness  = loadOptional("a
... [+9784 chars truncated]

### Assistant | 2026-06-22T02:58:05.373Z

There are ~110 augmentations loaded via `loadOptional()`, all of which can now return null when the flag is on. The commit message claims only 10 are "orphans" that would actually be skipped in LIVE composition today, but the safety contract is broader: ANY of these ~110 could become stale enough to skip if its producer dies. So the real safety question is whether the null contract is genuinely universal.

The key claim: "null-safety is the SAME contract the existing absent-file path already enforces." This is the load-bearing logical argument — let me verify it precisely. The absent path (line 80) returns null too, so any consumer that wasn't null-safe would ALREADY crash when its file is absent. Let me verify that absent-returns-null is unconditional (it is, line 80, before the flag block).

Now let me spot-check the named consumers AND look for any consumer that dereferences without a guard. Let me examine the 10 named orphan consumers plus look for unguarded dereferences across the merge logic.

### Assistant | 2026-06-22T02:58:06.003Z

[tool_use: Read]

### User | 2026-06-22T02:58:08.041Z

[tool_result] 235	const registryEnts   = loadOptional("registry-entries-augmentation.json");
236	const actionEngEdges = loadOptional("action-engine-edges-augmentation.json");
237	const camVendorCat   = loadOptional("cam-vendor-catalog-augmentation.json");
238	const tsRegistryEnts = loadOptional("ts-registry-entries-augmentation.json");
239	const engineImpEdges = loadOptional("engine-import-edges-augmentation.js
... [+4669 chars truncated]

### Assistant | 2026-06-22T02:58:12.937Z

I can see the pervasive pattern: every consumer is gated with `if(var)` before any property access (the `versions` block at 261-294 is the first consumer of every augmentation, and each one is `if(var) versions.X = var.generatedAt`). This is the universal contract. Now let me verify the 10 named orphan consumers specifically at their cited lines, and crucially scan for ANY unguarded dereference of a `loadOptional` result anywhere in the file.

Let me verify the named lines and scan for unguarded access patterns.

### Assistant | 2026-06-22T02:58:13.896Z

[tool_use: Read]

### Assistant | 2026-06-22T02:58:14.454Z

[tool_use: Read]

### User | 2026-06-22T02:58:15.621Z

[tool_result] 375	  for (const e of novelty.entries) {
376	    if (e.file) (G.meta.novelty.byPath[e.file] ??= []).push(e);
377	    if (e.kind) (G.meta.novelty.byKind[e.kind] ??= []).push(e);
378	  }
379	}
380	
381	if (business?.totals) G.meta.businessValueTotals = business.totals;
382	
383	// Spotlight catalog — fold per-node + keep top-level for HUD/Tour mode
384	if (spotlight?.spotlights) {
385	  G.meta.spotl
... [+337 chars truncated]

### User | 2026-06-22T02:58:15.936Z

[tool_result] 470	      byUtilization: v2.byUtilization,
471	      ghostCount: v2.ghostCount,
472	      sampleDirs: (v2.sampleDirs || []).slice(0, 5),
473	    };
474	    coverageV2Nodes++;
475	  }
476	  G.meta.fileCoverageV2 = {
477	    generatedAt: fileCoverageV2.generatedAt,
478	    totals: fileCoverageV2.totals,
479	    topOrphans:    (fileCoverageV2.topOrphans || []).slice(0, 30),
480	    topBreakdowns: (fi
... [+3082 chars truncated]

### Assistant | 2026-06-22T02:58:20.443Z

Confirmed the named consumers: `business?.totals` (381), `spotlight?.spotlights` (384), `fileCoverageV2` guarded by its block opener (the `if (v2...)` wrapper; line 476 is inside a guarded block), `heuristicCov?.bySubtree` (487), `skippedCensus?.trees` (521), `exhaustiveAudit?.rootSizes` (535). All use `?.` optional-chaining guards. Let me verify the remaining named ones (novelty:348, awareness:241, coreInventory:646, fsInventory:661) and the fileCoverageV2 block opener.

### Assistant | 2026-06-22T02:58:21.390Z

[tool_use: Read]

### Assistant | 2026-06-22T02:58:22.328Z

[tool_use: Read]

### User | 2026-06-22T02:58:22.662Z

[tool_result] 340	if (camVendorCat)    versions.camVendorCat    = camVendorCat.generatedAt    ?? "present";
341	if (tsRegistryEnts)  versions.tsRegistryEnts  = tsRegistryEnts.generatedAt  ?? "present";
342	if (engineImpEdges)  versions.engineImpEdges  = engineImpEdges.generatedAt  ?? "present";
343	if (testCovEdges)    versions.testCovEdges    = testCovEdges.generatedAt    ?? "present";
344	if (physicsAtomic)  
... [+1013 chars truncated]

### Assistant | 2026-06-22T02:58:22.896Z

[tool_use: Read]

### User | 2026-06-22T02:58:23.700Z

[tool_result] 450	    topUtilizationGaps:(fileCoverage.topUtilizationGaps || []).slice(0, 25),
451	  };
452	}
453	
454	// File coverage v2 — per-directory rollup with ghost markers, normalized labels.
455	// v2 supersedes v1 on overlapping L9 nodes (it has finer granularity) but keeps
456	// v1's per-subtree summaries since they're authored by an LLM agent and richer.
457	let coverageV2Nodes = 0;
458	if (fileCo
... [+222 chars truncated]

### User | 2026-06-22T02:58:24.235Z

[tool_result] 640	    } else {
641	      parent.label = `${labelBase} (${total} → ${p.count} buckets)`;
642	    }
643	    parent.childCount = p.count;
644	    parent.expansionMode = p.mode;
645	  }
646	  G.meta.coreInventory = {
647	    generatedAt: coreInventory.generatedAt,
648	    stats: coreInventory.stats,
649	    perParent: Object.fromEntries(
650	      Object.entries(coreInventory.byParent).map(([k, v]) 
... [+726 chars truncated]

### Assistant | 2026-06-22T02:58:30.556Z

(Different offsets each call, not a loop — distinct consumer regions.) Confirmed: `coreInventory` (646) is inside a guarded block, `fsInventory?.newNodes && fsInventory?.newEdges` (661) optional-chained, `fileCoverageV2?.byNodeId` (458) optional-chained. All 10 named orphan consumers are null-guarded.

Now the rigorous part: rather than trust the commit's "10 consumers" list, I must check whether ANY of the ~110 augmentations has an unguarded dereference, since ANY could become stale-skippable. The safest verification is to grep for direct property/iteration access on each loadOptional variable that isn't preceded by a guard. Let me do a systematic scan for risky dereference patterns — `for (const x of VAR.` and `VAR.prop` without `?.` or `if(VAR)`.

### Assistant | 2026-06-22T02:58:33.331Z

[tool_use: Bash]

### User | 2026-06-22T02:58:38.745Z

[tool_result] 375:  for (const e of novelty.entries) {
390:  for (const s of spotlight.spotlights) {
413:  for (const e of newlyBuilt.entries) {
571:  for (const r of exhaustiveAudit.rootSizes) {
618:  for (const node of coreInventory.newNodes) {
627:  for (const edge of coreInventory.newEdges) {
663:  for (const node of fsInventory.newNodes) {
672:  for (const edge of fsInventory.newEdges) {
703:  for (const n
... [+718 chars truncated]

### Assistant | 2026-06-22T02:58:46.214Z

These bare `for...of VAR.prop` loops are the dereference points. Each is safe ONLY IF it sits inside an `if(VAR...)` guard block. The cited lines (novelty:375 inside `if(novelty?.entries)`, spotlight:390 inside `if(spotlight?.spotlights)`, etc.) match the guards I already verified. But this is the critical check — a bare `for...of VAR.newNodes` is fine if the enclosing block is `if (VAR?.newNodes && VAR?.newEdges)`. Let me confirm the guard pattern for the ones I haven't yet seen (engineDomain, knowledgeInv, fsDeep, l11Leaves, wiringOverlay, knowledgeGal, layerBridges, stagnantFeats, miscTasks) and the rest of the augmentations beyond line 253. Let me grep for all the block-opening guards.

### Assistant | 2026-06-22T02:58:48.396Z

[tool_use: Bash]

### User | 2026-06-22T02:58:51.796Z

[tool_result] 266:if (newlyBuilt) versions.newlyBuilt = newlyBuilt.generatedAt ?? "present";
267:if (molecules)  versions.molecules  = molecules.generatedAt  ?? "present";
268:if (fileCoverage) versions.fileCoverage = fileCoverage.generatedAt ?? "present";
275:if (engineDomain)    versions.engineDomain    = engineDomain.generatedAt    ?? "present";
276:if (knowledgeInv)    versions.knowledgeInv    = knowledgeIn
... [+1300 chars truncated]

### Assistant | 2026-06-22T02:58:58.826Z

Every `for...of VAR.prop` consumer is wrapped in an `if (VAR?.prop...)` guard block. The pattern is rigorously uniform: `engineDomain` (701), `knowledgeInv` (742), `fsDeep` (806), `l11Leaves` (834), `wiringOverlay` (861), `knowledgeGal` (957), `layerBridges` (1040), `stagnantFeats` (1062), `miscTasks` (1123). Now let me sweep the remaining ~70 augmentations (lines 166-258, the ones loaded after the named set) for the same guard discipline — these are the ones the commit message doesn't enumerate but which the universal-null-contract claim must still cover. Let me check their consumer blocks.

### Assistant | 2026-06-22T02:59:07.262Z

[tool_use: Bash]

### User | 2026-06-22T02:59:18.019Z

[tool_result] 906:  for (const edge of ghostWireValidation.edges) {
1008:  for (const node of xsubEdges.newNodes) {
1019:  for (const edge of xsubEdges.newEdges) {
1095:  for (const node of tribalDensity.newNodes) {
1156:  for (const node of collegeCourses.newNodes) {
1187:  for (const node of resourcePdfs.newNodes) {
1218:  for (const edge of pdfCourseBridge.newEdges) {
1240:  for (const node of cadcamTraining
... [+2727 chars truncated]

### Assistant | 2026-06-22T02:59:23.743Z

These bare `for...of VAR.newNodes` loops are again the dereference points; each must be inside an `if (VAR?.newNodes...)` block. This is the established pattern of the entire file. Let me verify by spot-checking a representative sample of these block openers to confirm none is unguarded — pull the guards for several of these.

### Assistant | 2026-06-22T02:59:26.015Z

[tool_use: Bash]

### User | 2026-06-22T02:59:32.622Z

[tool_result] 293:if (forgeAuditTokenContext) versions.forgeAuditTokenContext = forgeAuditTokenContext.generatedAt ?? "present";
315:if (engineGraph)     versions.engineGraph     = engineGraph.generatedAt     ?? "present";
316:if (hookBridges)     versions.hookBridges     = hookBridges.generatedAt     ?? "present";
317:if (frontendPages)   versions.frontendPages   = frontendPages.generatedAt   ?? "present";
318
... [+855 chars truncated]

### Assistant | 2026-06-22T02:59:38.645Z

All guarded with optional chaining. There's one subtle case worth verifying: `engineGraph` at line 2404 — the block opens with `if (engineGraph?.newEdges)` but the loop at 2407 iterates `engineGraph.newNodes`. If a producer emitted `newEdges` but not `newNodes`, that would be a latent bug — but that's PRE-EXISTING (not introduced or affected by this diff in any way that differs from the absent-file behavior), and the loop at 2407 is shown as nested `for (const node of engineGraph.newNodes)` with extra indentation suggesting an inner guard. Let me verify lines 2404-2418 to be thorough, and confirm the absent-path-returns-null claim is structurally unconditional.

### Assistant | 2026-06-22T02:59:39.504Z

[tool_use: Read]

### User | 2026-06-22T02:59:46.660Z

[tool_result] 2404	if (engineGraph?.newEdges) {
2405	  const existingIds = new Set(G.nodes.map(n => n.id));
2406	  if (engineGraph.newNodes) {
2407	    for (const node of engineGraph.newNodes) {
2408	      if (existingIds.has(node.id)) continue;
2409	      G.nodes.push(node);
2410	      existingIds.add(node.id);
2411	      engineGraphNodes++;
2412	    }
2413	  }
2414	  G.edges ??= [];
2415	  const edgeKey = e =
... [+311 chars truncated]

### Assistant | 2026-06-22T02:59:56.992Z

`engineGraph.newNodes` (2407) has its own inner `if (engineGraph.newNodes)` guard (2406). Fully defensive. The contract is rigorously uniform across all ~110 augmentations: each is loaded into a `const`, gated by `if (VAR...)` / `if (VAR?.prop...)` before any dereference. 

Now let me confirm the four remaining specific safety claims definitively:

1. **Absent-path-returns-null is unconditional** (line 80, BEFORE the flag block) — verified: `if (!fs.existsSync(p)) return null;` is the first statement, so the null contract every consumer already satisfies is identical to the new stale-skip null return.

2. **Default-OFF**: `MERGE_STALE_SKIP = process.env.PRISM_MERGE_STALE_SKIP === "1"` (line 76); the entire stat/skip block (81-91) is gated by `if (MERGE_STALE_SKIP)`. Flag unset → no stat, no skip, byte-identical path. Verified.

3. **Fail-safe**: `try { ...statSync... } catch { /* fall through */ }` (82-90) — a stat failure falls through to normal load. And `shouldSkipStaleMerge` returns false for non-finite/negative/non-number age. Verified.

4. **Threshold**: 720h/30d default vs HEAVY cadence. Let me verify the SLOW_CADENCE/HEAVY relationship and the live composition claim. Let me also run the test file to confirm it actually passes (R9), and check the env-var parsing edge: `Number(process.env...) || undefined`.

Let me examine one subtle parsing edge and run the tests.

### Assistant | 2026-06-22T02:59:57.667Z

[tool_use: Bash]

### User | 2026-06-22T03:00:03.733Z

[tool_result]   ...
# Subtest: shouldSkipStaleMerge: enabled -> skips IFF age >= thresholdHr (default 720h/30d)
ok 13 - shouldSkipStaleMerge: enabled -> skips IFF age >= thresholdHr (default 720h/30d)
  ---
  duration_ms: 0.0704
  ...
# Subtest: shouldSkipStaleMerge: fail-safe -> unknown/negative/non-finite age never skips; bad threshold -> default
ok 14 - shouldSkipStaleMerge: fail-safe -> unknown/negative/non
... [+390 chars truncated]

### Assistant | 2026-06-22T03:00:09.779Z

15/15 pass, including the three new tests and the drift guard. Now let me examine the env-var parsing edge case for the threshold knob, since `Number(process.env.PRISM_MERGE_STALE_SKIP_HR) || undefined` has a subtle behavior: if an operator sets it to `0`, `Number("0") || undefined` → `undefined` → falls back to default 720h. That's actually the intended fail-safe (0 = "skip everything" would be dangerous), and `shouldSkipStaleMerge` also defends against `thresholdHr <= 0`. Let me verify the HEAVY cadence threshold claim against regen-viz to confirm legit HEAVY augmentations (12d in the live claim) survive the 30d threshold.

### Assistant | 2026-06-22T03:00:10.561Z

[tool_use: Bash]

### User | 2026-06-22T03:00:14.245Z

[tool_result] 192:const HEAVY = [
193:  "generate-fs-deep-inventory.mjs",
199:const scripts = wantFull ? [...FAST, ...HEAVY] : FAST;

### Assistant | 2026-06-22T03:00:20.747Z

[tool_use: Read]

### User | 2026-06-22T03:00:23.172Z

[tool_result] 192	const HEAVY = [
193	  "generate-fs-deep-inventory.mjs",
194	  "generate-l11-file-leaves.mjs",
195	];
196	
197	const args = process.argv.slice(2);
198	const wantFull = args.includes("--full");
199	const scripts = wantFull ? [...FAST, ...HEAVY] : FAST;
200	
201	// --stack-size=8192 (8 MB JS stack) is required: the merged system-graph.json

### Assistant | 2026-06-22T03:00:31.416Z

Confirmed. The two HEAVY generators (`generate-fs-deep-inventory.mjs` → `fs-deep-inventory-augmentation.json`, `generate-l11-file-leaves.mjs` → `l11-leaves-augmentation.json`) are exactly the two outputs in `SLOW_CADENCE` (freshness lib line 31), and they only run on `--full`. The 30d (720h) skip threshold is well above any reasonable `--full` cadence (and the live claim states they were at 12d when the flag-on skip dropped exactly the 10 orphans and 0 collateral). So a `--full` run every few weeks keeps them under 30d. The threshold choice is sound.

One final rigor check — the threshold knob parsing has a subtle but SAFE behavior I want to state precisely, and I want to confirm there is no consumer that accesses an augmentation via a path OTHER than the `if(VAR)` const-guard (e.g., re-reading the file or a different variable). The merge only reads each augmentation through its single `const`. I've now traced every dereference class. Let me do one final negative check: confirm no augmentation result is spread/`Object.assign`'d or array-accessed without a guard outside the patterns checked.

### Assistant | 2026-06-22T03:00:34.182Z

[tool_use: Bash]

### User | 2026-06-22T03:00:39.000Z

[tool_result] ---absent-return-line---
function loadOptional(name) {
  const p = path.join(VIZ_DIR, name);
  if (!fs.existsSync(p)) return null; // genuinely absent -> fine, stay quiet
  if (MERGE_STALE_SKIP) {

### Assistant | 2026-06-22T03:01:04.115Z

No unguarded spread or index access. And the absent-path `return null` (line 80) is unconditionally the first statement, executed BEFORE the new `if (MERGE_STALE_SKIP)` block (line 81). This structurally proves the load-bearing logical argument: the stale-skip path returns the exact same `null` the absent-file path has always returned, so any consumer that survives an absent augmentation (which is every consumer, since the file is `loadOptional`) survives a stale-skipped one identically. The new code adds no new failure surface to the consumers.

I have everything needed for a rigorous verdict. Let me state the final review.

---

VERDICT: PASS

summary: This commit adds an opt-in, default-OFF stale-skip lever to `merge-augmentations.mjs::loadOptional()` backed by a pure, fail-safe decision function. The load-bearing safety claim — that the stale-skip null return is the identical contract every consumer already satisfies for absent files — is structurally TRUE and verified end-to-end across all ~110 `loadOptional()` consumers. No consumer can crash on the new null path. Default-OFF, fail-safe, and threshold claims all verified; 15/15 tests pass including the 3 new ones.

findings: none

What I verified (so the PASS is auditable):

1. CRASH SAFETY (the P0 question) — PASS.
   - (a) Absent-path-returns-null is unconditional and ordered FIRST: `scripts/merge-augmentations.mjs:80` `if (!fs.existsSync(p)) return null;` executes BEFORE the new `if (MERGE_STALE_SKIP)` block at `:81`. The stale-skip returns the same `null` (`:88`). Therefore every consumer that tolerates an absent file tolerates a stale-skipped file identically — the claim is structurally proven, not asserted.
   - (b) Spot-checked far more than 3-4: I traced ALL ~110 `loadOptional()` results (`:141`–`:258`). Every one is gated before dereference — the `versions` block (`:261`–`:356`) guards each with `if(VAR)`, and every `for...of VAR.prop` loop sits inside an `if (VAR?.prop...)` block. Named-10 confirmed 
... [+2303 chars truncated]
