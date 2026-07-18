---
type: "chat-session"
source: "claude-code-cli"
session_id: "9fbbe420-5335-44ea-8eae-7244e85cd53b"
title: "Write a system-viz generator script that surfaces the 18 pure-algorithm extracti"
date: "2026-05-25"
first_ts: "2026-05-25T01:11:20.365Z"
last_ts: "2026-05-25T01:15:58.207Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 20
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a6ca01d0ec4a1c479.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Write a system-viz generator script that surfaces the 18 pure-algorithm extracti

> **claude-code-cli** | 2026-05-25 | 52 msgs (20 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a6ca01d0ec4a1c479.jsonl`

## Transcript

### User | 2026-05-25T01:11:20.365Z

Write a system-viz generator script that surfaces the 18 pure-algorithm extractions as ghost nodes in PRISM's live system-graph. This is the canonical PSN leg #6 (System Viz) integration pattern — the JSON augmentation file gets regenerated on every `regen-viz.mjs` run, so it must come from a committed generator script (the raw JSON output lives in the gitignored `state/shared/system-viz/` directory).

WRITE ONE FILE (use the Write tool):

**File**: `H:/prism-slot-golf/scripts/generate-pure-algorithm-features.mjs`

The generator scans `mcp-server/src/algorithms/` for the 18 extraction files (tagged by the iter19-36 commit pattern) and emits a JSON augmentation with the same shape that other generators produce.

Reference siblings to imitate (read these first via Read to match conventions):
- `H:/prism/scripts/generate-priority-queue-features.mjs` (closest in shape — emits a ghost roost with N nodes)
- `H:/prism/scripts/generate-bridge-synergy-features.mjs` (similar nodes + compositions pattern)
- `H:/prism/scripts/generate-misc-tasks-features.mjs` (another ghost-emitter pattern)

Generator must:
1. Read `H:/prism-slot-golf/mcp-server/src/algorithms/` dir.
2. Filter for the 18 algorithm files by filename allowlist (use the exact list below).
3. For each file, count source LOC by reading and counting non-empty / non-pure-whitespace lines.
4. Read the sibling test file (e.g. `TSNEAlgorithm.test.ts`) and count `it(...)` invocations as the test count.
5. Emit JSON to `state/shared/system-viz/pure-algorithm-extraction-augmentation.json` (relative to repo root) with this structure:

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "<ISO timestamp>",
  "source": "generate-pure-algorithm-features",
  "psnLeg": 8,
  "advisoryOnly": true,
  "ghostType": "algorithm",
  "nodes": [
    { "id": "pure-algo.tsne", "label": "TSNEAlgorithm", "kind": "algorithm", "iter": 19, "loc": <count>, "tests": <count>, "file": "mcp-server/src/algorithms/TSNEAlgorithm.ts", "domain": "<domain
... [+4329 chars truncated]

### Assistant | 2026-05-25T01:11:26.374Z

I'll start by reading the three reference sibling scripts to understand the conventions, then check the algorithm directory and target registration files in parallel.

### Assistant | 2026-05-25T01:11:26.778Z

[tool_use: Read]

### User | 2026-05-25T01:11:29.660Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-priority-queue-features.mjs — system-viz augmentation: priority queue.
4	 *
5	 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
6	 *
7	 * Reads ROADMAP-CONSOLIDATED.json and emits a single master priority-queue
8	 * node tree: `ghost.priority_queue` roost + one color-coded `priority-unit`
9	 * child per remaining unit. Backend-dev units sort 
... [+9083 chars truncated]

### Assistant | 2026-05-25T01:11:32.093Z

[tool_use: Read]

### User | 2026-05-25T01:11:36.510Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-bridge-synergy-features.mjs — system-viz augmentation: bridge layer.
4	 *
5	 * Spec: ROADMAP-CONSOLIDATION (slot juliett, forge7, 2026-05-16).
6	 *
7	 * Reads `state/shared/specs/ROADMAP-CONSOLIDATED.json` (produced by
8	 * consolidate-roadmaps.mjs) and emits a system-viz augmentation that adds:
9	 *   - parent roost `ghost.bridge_synergy` (kind ghost-roos
... [+10114 chars truncated]

### Assistant | 2026-05-25T01:11:42.025Z

Now read the misc-tasks generator and the two registration files in parallel:

### Assistant | 2026-05-25T01:11:42.860Z

[tool_use: Read]

### User | 2026-05-25T01:11:45.838Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-misc-tasks-features.mjs — system-viz augmentation: the "misc tasks" roost.
4	 *
5	 * Spec: MISC-TASKS extraction (slot juliett, forge7, 2026-05-16).
6	 *
7	 * Reads `state/shared/specs/MISC-TASKS-INVENTORY.json` (produced by
8	 * extract-misc-tasks.mjs) and emits a system-viz augmentation that adds:
9	 *   - one parent "roost" node `ghost.misc_tasks` (kind
... [+6198 chars truncated]

### Assistant | 2026-05-25T01:11:47.689Z

Now read the two registration files in parallel:

### Assistant | 2026-05-25T01:11:49.791Z

[tool_use: Grep]

### Assistant | 2026-05-25T01:11:51.263Z

[tool_use: Grep]

### User | 2026-05-25T01:11:56.736Z

[tool_result] 90:const FAST = [
98:  "generate-stagnant-features.mjs",
99:  "generate-misc-tasks-features.mjs",
101:  "generate-bridge-synergy-features.mjs",
102:  "generate-priority-queue-features.mjs",
103:  "generate-feature-gap-features.mjs",
104:  "generate-domain-pipeline-features.mjs",
105:  "generate-slot-synergy-features.mjs",
106:  "generate-docker-mcp-features.mjs",
107:  "generate-echo-viz-layers-fe
... [+12 chars truncated]

### User | 2026-05-25T01:11:56.990Z

[tool_result] 7: *   state/shared/system-viz/obsidian-augmentation.json     (wiki + memory linkage)
8: *   state/shared/system-viz/awareness-augmentation.json    (svi, testCount, complexity, coverage)
28:function loadOptional(name) {
64:const obsidian   = loadOptional("obsidian-augmentation.json");
65:const awareness  = loadOptional("awareness-augmentation.json");
66:const novelty    = loadOptional("novelty-cat
... [+6423 chars truncated]

### Assistant | 2026-05-25T01:11:59.143Z

Good — I have the exact patterns. Now let me read the relevant sections of both registration files to see exactly where to insert, and also check the algorithms directory:

### Assistant | 2026-05-25T01:12:00.453Z

[tool_use: Read]

### Assistant | 2026-05-25T01:12:01.368Z

[tool_use: Read]

### Assistant | 2026-05-25T01:12:02.206Z

[tool_use: Bash]

### User | 2026-05-25T01:12:05.477Z

[tool_result] 88	}
89	
90	const FAST = [
91	  "generate-engine-domain-inventory.mjs",
92	  "generate-knowledge-inventory.mjs",
93	  "generate-staleness-overlay.mjs",
94	  "generate-wiring-overlay.mjs",
95	  "generate-galaxy-constituents.mjs",
96	  "generate-knowledge-galaxy.mjs",
97	  "generate-layer-bridges.mjs",
98	  "generate-stagnant-features.mjs",
99	  "generate-misc-tasks-features.mjs",
100	  "consolidate
... [+512 chars truncated]

### User | 2026-05-25T01:12:05.627Z

[tool_result] 86	const layerBridges   = loadOptional("layer-bridges-augmentation.json");
87	const stagnantFeats  = loadOptional("stagnant-features-augmentation.json");
88	const miscTasks      = loadOptional("misc-tasks-augmentation.json");
89	const bridgeSynergy  = loadOptional("bridge-synergy-augmentation.json");
90	const priorityQueue  = loadOptional("priority-queue-augmentation.json");
91	const featureGap   
... [+5103 chars truncated]

### User | 2026-05-25T01:12:17.061Z

[tool_result] AdaptiveControllerModel.ts  17.6K
AnomalyDetector.ts  8.1K
AntColonyTSP.ts  10.3K
BayesianOptimizer.ts  9.9K
BayesianWearModel.ts  10.0K
CSPSetupPlan.ts  15.5K
CWEZBuffer.ts  10.5K
ChipBreakingModel.ts  12.5K
ChipEvacuationModel.ts  12.1K
ChipThinningCompensation.ts  8.4K
ChipVolumeRate.ts  10.5K
ClusteringEngine.ts  9.6K
CoolantFlowModel.ts  13.3K
DPMultiPass.ts  10.7K
DecisionTreeClassifier.ts  
... [+1378 chars truncated]

### Assistant | 2026-05-25T01:12:23.464Z

Good — all 18 algorithm files are confirmed present. Let me get the remaining files from the ls output and also read the splice section of merge-augmentations.mjs:

### Assistant | 2026-05-25T01:12:23.697Z

[tool_use: Bash]

### Assistant | 2026-05-25T01:12:24.021Z

[tool_use: Read]

### User | 2026-05-25T01:12:31.775Z

[tool_result] 860	// never finished and never formalized into a roadmap unit / milestone envelope.
861	// Source: state/shared/specs/MISC-TASKS-INVENTORY.json via
862	// scripts/generate-misc-tasks-features.mjs.
863	let miscTaskNodes = 0, miscTaskEdges = 0;
864	if (miscTasks?.newNodes) {
865	  const existingIds = new Set(G.nodes.map(n => n.id));
866	  for (const node of miscTasks.newNodes) {
867	    if (existin
... [+3623 chars truncated]

### User | 2026-05-25T01:12:40.720Z

[tool_result] ParticleFilterAlgorithm.ts  7.8K
ParticleSwarm.ts  7.2K
PolyakAveragingAlgorithm.ts  5.8K
PowerTorqueCalc.ts  9.7K
PrioritizedReplayBufferAlgorithm.ts  7.0K
RCSA.ts  11.6K
RegressionEngine.ts  7.9K
ReservoirSamplingAlgorithm.ts  3.5K
STFTChatter.ts  14.1K
SafeExpressionEvaluator.test.ts  11.0K
SafeExpressionEvaluator.ts  17.6K
ScaledDotProductAttentionAlgorithm.ts  6.0K
SimulatedAnnealing.ts  6.7K
... [+490 chars truncated]

### Assistant | 2026-05-25T01:12:43.803Z

All 18 algorithm files confirmed present. Now I have everything I need. Let me also check the test files to understand the `it(...)` pattern, then also read where the versions block goes in merge-augmentations to find the right insertion point for the meta entry:

### Assistant | 2026-05-25T01:12:45.342Z

[tool_use: Read]

### Assistant | 2026-05-25T01:12:54.114Z

[tool_use: Bash]

### User | 2026-05-25T01:13:01.685Z

[tool_result] 155	if (galaxyConst)     versions.galaxyConst     = galaxyConst.generatedAt     ?? "present";
156	if (knowledgeGal)    versions.knowledgeGal    = knowledgeGal.generatedAt    ?? "present";
157	if (layerBridges)    versions.layerBridges    = layerBridges.generatedAt    ?? "present";
158	if (stagnantFeats)   versions.stagnantFeats   = stagnantFeats.generatedAt   ?? "present";
159	if (miscTasks)      
... [+1479 chars truncated]

### User | 2026-05-25T01:13:12.278Z

[tool_result] TSNEAlgorithm.ts|248|16
ParticleFilterAlgorithm.ts|192|17
LearningRateSchedulerAlgorithm.ts|296|33
PrioritizedReplayBufferAlgorithm.ts|176|17
NStepReturnsAlgorithm.ts|123|13
PolyakAveragingAlgorithm.ts|140|22
DuelingQDecompositionAlgorithm.ts|82|13
DoubleDQNTargetAlgorithm.ts|111|15
ScaledDotProductAttentionAlgorithm.ts|169|15
LayerNormalizationAlgorithm.ts|112|20
SinusoidalPositionalEncodingAlgor
... [+284 chars truncated]

### Assistant | 2026-05-25T01:13:15.576Z

All LOC and test counts collected. Now I have everything needed. Let me write the generator script:

### Assistant | 2026-05-25T01:14:12.071Z

[tool_use: Write]

### User | 2026-05-25T01:14:24.288Z

[tool_result] File created successfully at: H:/prism-slot-golf/scripts/generate-pure-algorithm-features.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T01:14:26.943Z

Now register in regen-viz.mjs (after generate-priority-queue-features.mjs) and merge-augmentations.mjs. Both edits in parallel:

### Assistant | 2026-05-25T01:14:28.355Z

[tool_use: Edit]

### Assistant | 2026-05-25T01:14:30.270Z

[tool_use: Edit]

### User | 2026-05-25T01:14:41.969Z

[tool_result] The file H:/prism-slot-golf/scripts/regen-viz.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### User | 2026-05-25T01:14:47.458Z

[tool_result] The file H:/prism-slot-golf/scripts/merge-augmentations.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T01:14:49.495Z

Now add the versions entry and the splice block in merge-augmentations.mjs:

### Assistant | 2026-05-25T01:14:51.961Z

[tool_use: Edit]

### User | 2026-05-25T01:15:00.807Z

[tool_result] The file H:/prism-slot-golf/scripts/merge-augmentations.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T01:15:02.963Z

Now find the exact line after the priorityQueue splice block to insert the pureAlgos splice:

### Assistant | 2026-05-25T01:15:03.445Z

[tool_use: Read]

### User | 2026-05-25T01:15:08.440Z

[tool_result] 940	    priorityQueueEdges++;
941	  }
942	  G.meta.priorityQueue = {
943	    generatedAt: priorityQueue.generatedAt,
944	    stats: priorityQueue.stats,
945	  };
946	}
947	
948	// Echo-viz observability layers: three ghost roosts from the ECHO-UNDONE
949	// survey (H2 tribal-knowledge corpus, H3 live chat-slot agents, H5 active
950	// handoffs) + their children. Source:
951	// state/shared/system-
... [+184 chars truncated]

### Assistant | 2026-05-25T01:15:10.978Z

Good — I have the exact insertion point. Now insert the pureAlgos splice block after the priorityQueue block (after line 946):

### Assistant | 2026-05-25T01:15:17.449Z

[tool_use: Edit]

### User | 2026-05-25T01:15:24.614Z

[tool_result] The file H:/prism-slot-golf/scripts/merge-augmentations.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T01:15:26.506Z

Now execute the generator to verify it works:

### Assistant | 2026-05-25T01:15:27.117Z

[tool_use: Bash]

### User | 2026-05-25T01:15:45.895Z

[tool_result] pure-algorithm-features: emitted 19 nodes + 4 compositions to state/shared/system-viz/pure-algorithm-extraction-augmentation.json
  roost:              ghost.pure_algorithms
  algorithm children: 18
  total LOC:          2684
  total tests:        317
  missing files:      0

### Assistant | 2026-05-25T01:15:58.207Z

Generator runs clean: 19 nodes (1 roost + 18 children), 4 compositions, 0 missing files. Done.

---

**Summary of all changes**

**New file written:**
`H:/prism-slot-golf/scripts/generate-pure-algorithm-features.mjs`

Standalone ES module. Scans `mcp-server/src/algorithms/` for the 18 allowlisted files, counts LOC (non-empty lines) and `it(` invocations from the paired test file (checked in `mcp-server/src/__tests__/` first, then the algorithms dir), and emits `state/shared/system-viz/pure-algorithm-extraction-augmentation.json` with the exact schema specified — `schemaVersion`, `generatedAt`, `source`, `psnLeg: 8`, `advisoryOnly`, `ghostType`, `nodes[]` (raw per-algorithm data), `compositions[]` (4 groups), `newNodes[]` (roost + children in merge-augmentations shape), `newEdges: []`, `stats`.

**Verification stdout:**
```
pure-algorithm-features: emitted 19 nodes + 4 compositions to state/shared/system-viz/pure-algorithm-extraction-augmentation.json
  roost:              ghost.pure_algorithms
  algorithm children: 18
  total LOC:          2684
  total tests:        317
  missing files:      0
```

**regen-viz.mjs** — line 103 (after `generate-priority-queue-features.mjs`):
- Added `"generate-pure-algorithm-features.mjs"` to the `FAST[]` array.

**merge-augmentations.mjs** — three locations:
1. Line 91 (loadOptional block, after `priorityQueue`): added `const pureAlgos = loadOptional("pure-algorithm-extraction-augmentation.json");`
2. Line 162 (versions block, after `priorityQueue`): added `if (pureAlgos) versions.pureAlgos = pureAlgos.generatedAt ?? "present";`
3. After the `priorityQueue` splice block (after line 946): added a full 28-line splice block — dedup-guarded node push loop, edge push loop, and `G.meta.pureAlgos` assignment — exactly mirroring the `priorityQueue` pattern immediately above it.
