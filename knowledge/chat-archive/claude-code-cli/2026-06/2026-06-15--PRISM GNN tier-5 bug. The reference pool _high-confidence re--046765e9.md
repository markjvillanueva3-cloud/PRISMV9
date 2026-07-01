---
type: "chat-session"
source: "claude-code-cli"
session_id: "046765e9-1878-49aa-b195-de74c14c3930"
title: "PRISM GNN tier-5 bug. The reference pool (high-confidence reference GHOST nodes "
date: "2026-06-15"
first_ts: "2026-06-15T20:48:19.665Z"
last_ts: "2026-06-15T20:50:53.899Z"
cwd: "H:\\prism-slot-india"
messages: 45
user_msgs: 19
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-a6ee40d1f1e02e45f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# PRISM GNN tier-5 bug. The reference pool (high-confidence reference GHOST nodes 

> **claude-code-cli** | 2026-06-15 | 45 msgs (19 user / 26 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-a6ee40d1f1e02e45f.jsonl`

## Transcript

### User | 2026-06-15T20:48:19.665Z

PRISM GNN tier-5 bug. The reference pool (high-confidence reference GHOST nodes the eval uses as its leave-out holdout) COLLAPSED from ~124 nodes (holdout 62, measured 2026-06-06 in NN-EVAL.json) to ~26 nodes (holdout 13, measured 2026-06-15), even though total ghostCount is STABLE at 208 in both graph fingerprints. So fewer ghosts now QUALIFY as high-confidence references (refMinConf=0.8); ghosts did NOT disappear. All paths are in H:/prism (the live main tree). Read ACTUAL file bodies and cite file:line; do not guess. Return concise prose (NO JSON).

YOUR LENS: trace HOW the reference pool gets seeded into the live graph H:/prism/state/shared/system-viz/system-graph.json. CLAUDE.md says "the reference pool is seeded into the graph by NN-GRAPH-MS2 U1's regen-viz stage."
1. Read H:/prism/state/shared/nn-graph/reference-pool-seed-2026-05-23.json (what it contains, how many entries, the node-id shape, the confidence values).
2. Grep the repo for every consumer of that file and every place reference-pool nodes/confidence are injected into the graph. Search terms: "reference-pool-seed", "reference-pool", "refMinConf", "seedReferencePool", "referencePool", "reference ghost", and inspect the regen/merge stages (scripts/regen-viz*.mjs, scripts/merge-augmentations.mjs, scripts/build-graph-index.mjs, scripts/augment-molecules.mjs, and anything under scripts/ matching *seed* or *ref-pool*).
3. Determine: (a) which script/stage merges the seed into system-graph.json; (b) is that stage currently WIRED into the regen pipeline (grep settings/cron/regen orchestrators); (c) when did it last run (compare mtimes of reference-pool-seed-2026-05-23.json vs system-graph.json vs recent git commits touching those stages).
VERDICT: is the reference-pool seed actually PRESENT in the CURRENT graph, or did a graph rebuild drop it? Cite file:line. Keep it tight — conclusions + citations, not file dumps.

### Assistant | 2026-06-15T20:48:26.366Z

I'll systematically trace the reference pool seeding pipeline. Let me read the actual files and search for consumers in parallel.

### Assistant | 2026-06-15T20:48:26.803Z

[tool_use: Read]

### Assistant | 2026-06-15T20:48:27.800Z

[tool_use: Grep]

### User | 2026-06-15T20:48:27.848Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedAt": "2026-05-23T20:30:00Z",
4	  "generatedBy": "alpha slot, claude-95e7030e, TOKEN-SAVINGS-PIVOT/U-PSN-NN-SEED (gap-fill 5/5)",
5	  "purpose": "Reference-pool seed for NN-GRAPH tier-5 (GraphSAGE wiring-inference). Currently dormant — AUROC 0.096 vs gate 0.78 because reference pool is 0-sized. This file provides 25+ seed examples drawn from the iter9
... [+6612 chars truncated]

### User | 2026-06-15T20:48:28.817Z

[tool_result] <persisted-output>
Output too large (23.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-india\046765e9-1878-49aa-b195-de74c14c3930\tool-results\toolu_01FwLS7x8ZL6vdPkuk4UAUqp.txt

Preview (first 2KB):
H:\prism\scripts\claude-md-collapse-milestones.mjs-124-  {
H:\prism\scripts\claude-md-collapse-milestones.mjs-125-    headerPrefix: "## NN-GRAPH-MS2",
H:\prism\scripts\claud
... [+1759 chars truncated]

### Assistant | 2026-06-15T20:48:32.594Z

Let me read the full grep results and simultaneously search for the regen pipeline and eval scripts.

### Assistant | 2026-06-15T20:48:35.853Z

[tool_use: Read]

### Assistant | 2026-06-15T20:48:36.457Z

[tool_use: Glob]

### Assistant | 2026-06-15T20:48:36.843Z

[tool_use: Glob]

### User | 2026-06-15T20:48:36.925Z

[tool_result] 1	H:\prism\scripts\claude-md-collapse-milestones.mjs-124-  {
2	H:\prism\scripts\claude-md-collapse-milestones.mjs-125-    headerPrefix: "## NN-GRAPH-MS2",
3	H:\prism\scripts\claude-md-collapse-milestones.mjs-126-    replacement:
4	H:\prism\scripts\claude-md-collapse-milestones.mjs:127:      "## NN-GRAPH-MS2 (2026-05-17) — autonomous NN lifecycle: U1 reference-pool seed-ghost regen-viz stage (close
... [+24259 chars truncated]

### Assistant | 2026-06-15T20:48:37.107Z

[tool_use: Glob]

### User | 2026-06-15T20:48:57.329Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-15T20:48:57.591Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-15T20:48:57.892Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-15T20:49:03.963Z

Good — the grep already surfaced the critical section. Now I need to read the actual regen-viz.mjs seed stage, the merge-augmentations pipeline, and check whether the seed stage writes ghost nodes WITH confidence into the graph or into an augmentation file.

### Assistant | 2026-06-15T20:49:04.741Z

[tool_use: Read]

### Assistant | 2026-06-15T20:49:06.332Z

[tool_use: Grep]

### User | 2026-06-15T20:49:07.317Z

[tool_result] 330	// (planned-unit / extract_record / datacat_record / git_commit / combo / …) via a
331	// `parent` field but no edge, leaving ~2.7k degree-0 nodes. This adds the missing
332	// edges so traversal / Cypher export / recall hooks can reach the leaves. Runs after
333	// reparent (which may re-set `parent` fields). Idempotent.
334	console.log(`[regen-viz] add parent→child contains edges (de-orphan 
... [+7619 chars truncated]

### User | 2026-06-15T20:49:09.373Z

[tool_result] <persisted-output>
Output too large (23.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-india\046765e9-1878-49aa-b195-de74c14c3930\tool-results\toolu_012gNDe9oCtmGvyEwMAWuFMX.txt

Preview (first 2KB):
H:\prism\scripts\ai-training-awareness.mjs-72-  const wl = state.activeWorklist;
H:\prism\scripts\ai-training-awareness.mjs-73-  if (wl && Array.isArray(wl.worklist) && wl.w
... [+1846 chars truncated]

### Assistant | 2026-06-15T20:49:13.244Z

Now I need to read the actual `seed-ghost-from-unwired.mjs` script — the one regen-viz.mjs calls at line 355. This is the key: it writes ghost nodes with confidence directly into system-graph.json. I need to see exactly what confidence values it assigns and what the source of those values is.

### Assistant | 2026-06-15T20:49:13.612Z

[tool_use: Read]

### User | 2026-06-15T20:49:14.528Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-from-unwired.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED
4	 *
5	 * Generates L13 ghost nodes for the BUILD_STATE-flagged unwired engines (861
6	 * engines on disk with no dispatcher reference). Each gets:
7	 *   - ghost.unwired-engine node with `proposed_wiring` + `confidence` fields
8	 *   - ghost-wire edge (relation: "proposed-wire") pointing at t
... [+19992 chars truncated]

### Assistant | 2026-06-15T20:49:14.861Z

[tool_use: Bash]

### User | 2026-06-15T20:49:19.503Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
0157512132 [SYSTEM-BUG-FIX-MS0]/U-SBF-4-FINDCACHE-VISIBLE (slot:sierra): regen-viz verifies the find-cache ARTIFACT i...
ed0e9912a7 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-WORKLIST-PROPOSER-BALANCE (slot:india): class-reb...
9371ce90e9 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-OLLAMA-WORKLIS
... [+2095 chars truncated]

### Assistant | 2026-06-15T20:49:26.696Z

Now I have the full picture. Let me check the `listUnwiredEngines` scan scope — it only scans `mcp-server/src/engines/*.ts` (flat, not recursive). The pool collapse depends on how many engines at that exact path match `confidence >= 0.8`. Let me verify the current engine count and scan scope, and check the NN-EVAL.json to confirm the pool numbers.

### Assistant | 2026-06-15T20:49:27.717Z

[tool_use: Bash]

### Assistant | 2026-06-15T20:49:28.474Z

[tool_use: Read]

### User | 2026-06-15T20:49:32.047Z

[tool_result] 3812

### User | 2026-06-15T20:49:29.426Z

[tool_result] 1	{
2	  "deferred": false,
3	  "assessedAt": "2026-06-15T16:20:32.408Z",
4	  "holdoutN": 13,
5	  "embeddingMode": "direct",
6	  "checkpointPresent": true,
7	  "holdoutSplit": "stratified",
8	  "heldClasses": 6,
9	  "gates": {
10	    "auroc": 0.78,
11	    "macroF1": 0.55,
12	    "brier": 0.15
13	  },
14	  "metrics": {
15	    "auroc": 0.8095,
16	    "macroF1": 0.1008,
17	    "brier": 0.2102,
18	    
... [+5871 chars truncated]

### Assistant | 2026-06-15T20:49:33.146Z

[tool_use: Bash]

### User | 2026-06-15T20:49:37.427Z

[tool_result] node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: Cannot create a string longer than 0x1fffffe8 characters
    at Object.readFileSync (node:fs:441:20)
    at [eval]:3:25
    at runScriptInThisContext (node:internal/vm:209:10)
    at node:internal/process/execution:118:14
    at [eval]-wrapper:6:24
    at runScript (node:internal/
... [+184 chars truncated]

### Assistant | 2026-06-15T20:49:42.611Z

The V8 string-cap error on the live graph is itself diagnostic. Let me query the pool size correctly using the streaming reader, and also check what confidence values the seeder actually assigns to see where the >=0.8 threshold lands.

### Assistant | 2026-06-15T20:49:49.476Z

[tool_use: Bash]

### Assistant | 2026-06-15T20:49:53.580Z

[tool_use: Bash]

### User | 2026-06-15T20:49:56.898Z

[tool_result] total ghost.unwired-engine: 208
confidence>=0.8 (pool): 31
holdout cap (floor(pool/2), max 200): 15
buckets: {"0.6-0.8":129,"gte0.8":31,"0.5-0.6":15,"lt0.5_or_missing":33}
distinct conf values >=0.8: [0.85,0.82,0.8]

### User | 2026-06-15T20:50:00.688Z

[tool_result] Rules with confidence>=0.8: 7 of 36
High-conf rules: [{"conf":0.85,"disp":"prism_calc","reason":"physics/mechanics keyword"},{"conf":0.85,"disp":"prism_safety","reason":"safety/collision keyword"},{"conf":0.82,"disp":"prism_cam","reason":"CAM/toolpath keyword"},{"conf":0.82,"disp":"prism_cad","reason":"CAD geometry keyword"},{"conf":0.85,"disp":"prism_turning","reason":"lathe/turning keyword"},{"c
... [+233 chars truncated]

### Assistant | 2026-06-15T20:50:05.346Z

Now I have everything needed. Let me do one final check — confirming the holdout math and whether the 2026-06-06 eval that showed 62 holdout nodes used a different graph state.

### Assistant | 2026-06-15T20:50:07.260Z

[tool_use: Bash]

### Assistant | 2026-06-15T20:50:08.459Z

[tool_use: Bash]

### Assistant | 2026-06-15T20:50:10.088Z

[tool_use: Bash]

### User | 2026-06-15T20:50:10.923Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
8538abcb29 [MAIN-FORCE] [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC06 (slot:sierra): Com...
039c5cdcdf [MAIN-FORCE] [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC05 (slot:sierra): Spa...
aa70ccc154 [MAIN-FORCE] [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC04 (slot:sierra): Dua...
7b0b60244d [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC03 (slot:sierra): CodeGraphProject...

... [+2024 chars truncated]

### User | 2026-06-15T20:50:15.216Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings

### User | 2026-06-15T20:50:19.074Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
commit a6bd95c163a579ddcdb19326e24dcb5d91e7c626
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 09:06:35 2026 -0500

    [MAIN] [BLACKWELL-AI-MS0]/U-GNN-FIX-SPEC-EMPIRICAL (slot:india): append empirical findings to GNN-F0 spec — 1a insufficient, binding root = uniform 8-d embeddings under edge
... [+960 chars truncated]

### Assistant | 2026-06-15T20:50:53.899Z

I now have the complete picture. Here is the verdict.

---

**Root cause: the reference pool collapsed because a large wiring campaign (`WIRE-UNWIRED-PAPA`) promoted many `ghost.unwired-engine` nodes out of the ghost tier, shrinking the high-confidence band from ~124 to ~31 — and the holdout is capped at half the pool.**

---

**How the seeding pipeline actually works**

`regen-viz.mjs` line 355 calls `seed-ghost-from-unwired.mjs --apply` as a post-merge subprocess, writing ghost nodes directly into `state/shared/system-viz/system-graph.json`. The seeder's `listUnwiredEngines` scans `mcp-server/src/engines/*.ts` (flat, not recursive) and greps every dispatcher `.ts` file; any engine class whose name does NOT appear in any dispatcher source gets a `ghost.unwired-engine` node with a heuristic `confidence` score. The `reference-pool-seed-2026-05-23.json` file is **not consumed by this pipeline at all** — it was an advisory advisory document listing 27 Tier-A labeled examples for human verification; `expectedConsumers` lists `nn-graph-eval.mjs` and `NN-EVAL.json`, but neither `regen-viz.mjs` nor `seed-ghost-from-unwired.mjs` reads it. The actual reference pool in the live graph is whatever `ghost.unwired-engine` nodes the seeder writes with `confidence >= 0.8`.

**Why `refMinConf=0.8` matters**

`nn-graph-eval.mjs:57` hardcodes `refMinConf: 0.8`. Only seven of the 36 inference rules in `seed-ghost-from-unwired.mjs` produce scores at or above this threshold: `prism_calc` (0.85), `prism_safety` (0.85), `prism_cam` (0.82), `prism_cad` (0.82), `prism_turning` (0.85), `prism_5axis` (0.85), and `prism_ai` (0.80) — `seed-ghost-from-unwired.mjs` lines 53–60. Everything else (0.78 down to 0.50) is ineligible.

**The actual pool numbers in the live graph**

The live `system-graph.json` currently contains 208 `ghost.unwired-engine` nodes total (ghostCount stable, as you noted). Broken down by confidence: 31 are `>=0.8` (the reference pool), 129 are `0.6–0.8`, 15 are `0.5–0.6`, and
... [+2450 chars truncated]
