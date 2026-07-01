---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "In the PRISM repo (H:/prism), find genuinely UNWIRED engines (on disk under mcp-"
date: "2026-06-15"
first_ts: "2026-06-15T23:19:59.070Z"
last_ts: "2026-06-15T23:36:13.196Z"
cwd: "H:\\prism-slot-sierra"
messages: 74
user_msgs: 31
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a8727e039324d5248.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# In the PRISM repo (H:/prism), find genuinely UNWIRED engines (on disk under mcp-

> **claude-code-cli** | 2026-06-15 | 74 msgs (31 user / 43 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a8727e039324d5248.jsonl`

## Transcript

### User | 2026-06-15T23:19:59.070Z

In the PRISM repo (H:/prism), find genuinely UNWIRED engines (on disk under mcp-server/src/engines/ but with ZERO dispatcher reference) and pending BRIDGE wiring units that are in sierra's lane (system-viz, master-index, awareness, roadmap, fleet-devtools, graph).

Sources to read: state/shared/BUILD_STATE.json (NEEDS_WIRING section), state/shared/specs/ROADMAP-CONSOLIDATED.json (it lists ~26 wiring + 16 deep-integration bridge units), state/shared/per-slot-galaxy-buildout/sierra.md.

CRITICAL anti-over-claim step: for EVERY candidate unwired engine, VERIFY it is actually unwired by grepping mcp-server/src/tools/dispatchers/*.ts for the engine's export/class name. If you find it wired (imported in any dispatcher), DROP it - that is the exact over-claim trap that has burned this audit repeatedly ("engine X is unwired" when it was wired all along). Only report an engine as unwired if your grep of the dispatchers returns ZERO hits.

Prefer system-viz / master-index / awareness / roadmap / graph engines (sierra's competence). Avoid mill/lathe/wedm/cam/cad/quoting/business domain engines (other slots own those).

Return a concise list. For each: engine file path, the dispatcher(s) it SHOULD wire to, and proof-of-unwired (the grep you ran returning zero). Default to fewer, verified findings.

### Assistant | 2026-06-15T23:20:03.019Z

I'll systematically find genuinely unwired engines in sierra's lane by reading the build state, then verifying each candidate against dispatcher imports.

### Assistant | 2026-06-15T23:20:04.182Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:20:05.700Z

[tool_use: Bash]

### User | 2026-06-15T23:20:14.938Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 M .claude/hooks/model-tier-advisor.mjs
 M CLAUDE.md
 M PRISM-INVENTORY-LATEST.md
 M "knowledge/PRISM Knowledge Vault.md"
 M knowledge/PRISM-System-Map.canvas

thread 'main' (64896) panicked at /rustc/59807616e1fa2540724bfbac14d7976d7e4a3860/library\std\src\io\stdio.rs:1165:9:
failed printing to stdout: The pipe has been e
... [+2903 chars truncated]

### User | 2026-06-15T23:20:26.564Z

[tool_result] NEEDS_WIRING count: undefined

### Assistant | 2026-06-15T23:20:30.233Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:20:30.744Z

[tool_use: Bash]

### User | 2026-06-15T23:20:40.244Z

[tool_result] Top keys: [
  'schemaVersion',
  'generatedAt',
  'headline',
  'sources',
  'BUILT',
  'NEEDS_WIRING',
  'COVERAGE_BY_DOMAIN',
  'STALE_MILESTONES',
  'NEEDS_BUILDING',
  'NEEDS_FRONTEND'
]

### User | 2026-06-15T23:21:02.242Z

[tool_result] AWARENESS.md
CLAUDE.md
GSD.md
MEMORY.md
PATHS.md
SOUL.md
TOOLBELT.md

### Assistant | 2026-06-15T23:21:07.234Z

[tool_use: Bash]

### User | 2026-06-15T23:25:02.560Z

[tool_result] Exit code 1
NEEDS_WIRING count: undefined

### Assistant | 2026-06-15T23:25:08.970Z

[tool_use: Read]

### User | 2026-06-15T23:25:58.247Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedAt": "2026-06-15T17:30:55.592Z",
4	  "headline": {
5	    "built_engines": 3753,
6	    "built_with_wiki": 1293,
7	    "needs_wiring": 37,
8	    "needs_building_active_units": 3022,
9	    "needs_frontend_merge_count": 2,
10	    "pending_milestones_with_activity": 113,
11	    "drift_milestones": 193,
12	    "stale_milestones": 203,
13	    "domains_track
... [+1317 chars truncated]

### Assistant | 2026-06-15T23:26:04.540Z

[tool_use: Read]

### User | 2026-06-15T23:26:14.743Z

[tool_result] 60	      },
61	      {
62	        "domain": "Embedding",
63	        "count": 1
64	      },
65	      {
66	        "domain": "Semantic",
67	        "count": 1
68	      },
69	      {
70	        "domain": "Acquisition",
71	        "count": 1
72	      },
73	      {
74	        "domain": "Measure",
75	        "count": 1
76	      },
77	      {
78	        "domain": "Pact",
79	        "count": 1
80	      },
... [+2615 chars truncated]

### Assistant | 2026-06-15T23:26:18.238Z

Let me read the full unwired engine audit and the sierra-specific roadmap sources.

### Assistant | 2026-06-15T23:26:19.008Z

[tool_use: Read]

### Assistant | 2026-06-15T23:26:21.697Z

[tool_use: Bash]

### User | 2026-06-15T23:26:29.617Z

[tool_result] 180	      },
181	      {
182	        "name": "MeasureSummaryEngine",
183	        "suggestedDispatcher": "UNKNOWN — review manually",
184	        "mtime": "2026-04-20T01:01:50.653Z",
185	        "sizeKB": 13,
186	        "wikiTitle": null
187	      },
188	      {
189	        "name": "PactContractTestEngine",
190	        "suggestedDispatcher": "UNKNOWN — review manually",
191	        "mtime": "2026-
... [+6361 chars truncated]

### User | 2026-06-15T23:26:56.767Z

[tool_result] Keys: ['schemaVersion', 'generated', 'generatedBy', 'canonicalEnginesFolder', 'counts', 'orphans', 'unwiredEngines', 'notes']
Total unwired: 23
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?
  ? | ?

### Assistant | 2026-06-15T23:27:03.348Z

Let me read the actual unwired audit JSON with proper Node.js to get file paths, then check sierra-relevant engines.

### Assistant | 2026-06-15T23:27:06.407Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:27:07.043Z

[tool_use: Bash]

### User | 2026-06-15T23:28:17.588Z

[tool_result] Total unwired engines: 23
{"engine":"PlaywrightAutomationEngine","mtime":"2026-03-14T04:59:38.000Z","size_|NO_PATH
{"engine":"EmbeddingGuardEngine","mtime":"2026-04-16T17:24:18.000Z","size_kb":7,|NO_PATH
{"engine":"SemanticAssetIndexEngine","mtime":"2026-04-16T20:16:40.000Z","size_kb|NO_PATH
{"engine":"CreoToolkitBridgeEngine","mtime":"2026-04-20T00:11:59.920Z","size_kb"|NO_PATH
{"engine":"CreoInt
... [+1672 chars truncated]

### User | 2026-06-15T23:28:29.077Z

[tool_result] alpha.md
bravo.md
charlie.md
delta.md
echo.md
foxtrot.md
golf.md
hotel.md
india.md
juliett.md
kilo.md
lima.md
mike.md
oscar.md
papa.md
quebec.md
romeo.md
sierra.md
tango.md
uniform.md
victor.md
whiskey.md
xray.md
zulu.md

### Assistant | 2026-06-15T23:28:32.898Z

The BUILD_STATE unwired list has no file paths in the audit JSON. Let me locate the actual engine files and then grep dispatchers for each candidate.

### Assistant | 2026-06-15T23:28:35.628Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:28:36.351Z

[tool_use: Read]

### User | 2026-06-15T23:28:52.638Z

[tool_result] Full first entry: {
  "engine": "PlaywrightAutomationEngine",
  "mtime": "2026-03-14T04:59:38.000Z",
  "size_kb": 22,
  "suggestedDispatcher": "prism_automation"
}
orphans keys: [ 'legacyTopLevel', 'forgeArchive', 'worktreeClones' ]
notes: [
  'WIRE-EXEMPT engines have a `// WIRE-EXEMPT: <reason>` marker in the first 2KB.',
  'Singleton wrappers count as WIRED-VIA-SINGLETON. The wrapping engine it
... [+627 chars truncated]

### User | 2026-06-15T23:28:53.900Z

[tool_result] 1	# Galaxy buildout — slot:sierra (galaxy:system-viz)
2	
3	> **Auto-fire trigger:** this file is THE first prompt slot:sierra executes on fresh-launch when `mcp-server/src/engines/system-viz/` is missing OR incomplete.
4	> **Master protocol:** `state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md`
5	
6	## Your mission (per operator goal 2026-05-28)
7	
8	Build slot:sierra's **complete galaxy** so future
... [+17697 chars truncated]

### Assistant | 2026-06-15T23:28:59.072Z

Good. The sierra.md is a buildout brief, not a wiring task list. Now let me look at what engines actually exist under system-viz, and also check the ROADMAP-CONSOLIDATED for sierra-lane wiring units.

### Assistant | 2026-06-15T23:29:01.929Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:29:07.626Z

[tool_use: Bash]

### User | 2026-06-15T23:29:13.897Z

[tool_result] ---
mcp-server/src/engines/AgentSelfAwarenessEngine.ts
mcp-server/src/engines/AwarenessBootstrapEngine.ts
mcp-server/src/engines/AwarenessQueryEngine.ts
mcp-server/src/engines/KnowledgeGapAwarenessEngine.ts
mcp-server/src/engines/LatheMasterPostSelfAwarenessEngine.ts
mcp-server/src/engines/LatheSelfAwarenessIntegrationEngine.ts
mcp-server/src/engines/lib/zuluAwarenessReader.ts
mcp-server/src/engin
... [+1049 chars truncated]

### User | 2026-06-15T23:29:30.894Z

[tool_result] EmbeddingGuardEngine | UNKNOWN — review manually
SemanticAssetIndexEngine | UNKNOWN — review manually
WEDMLoRADatasetBuilderEngine | prism_edm
cycleSchedulingBridge | prism_scheduling
reactiveChainBootstrap | prism_ai
XProcNeuralAutoFireEngine | prism_ai
BayesianAcquisitionRefiner | prism_ai

### Assistant | 2026-06-15T23:29:35.127Z

[tool_use: Bash]

### User | 2026-06-15T23:29:54.106Z

[tool_result] EGE_hits_done
SAI_hits_done
mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
RCB_hits_done
mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
XPNAF_hits_done
BAR_hits_done

### Assistant | 2026-06-15T23:29:57.732Z

Good catches - `reactiveChainBootstrap` is already wired (in aiReasoningDispatcher), same for `XProcNeuralAutoFireEngine`. Now let me focus on the sierra-domain engines (awareness, master-index, roadmap, graph) and verify which are actually unwired.

### Assistant | 2026-06-15T23:30:00.699Z

[tool_use: Bash]

### User | 2026-06-15T23:30:10.803Z

[tool_result] MasterIndexEngine|mcp-server/src/tools/dispatchers/sessionDispatcher.ts,
MasterIndexGenerator|mcp-server/src/tools/dispatchers/devDispatcher.ts,
RoadmapAutoAppendEngine|mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts,
RoadmapDAGEngine|mcp-server/src/tools/dispatchers/devDispatcher.ts,mcp-server/src/tools/dispatchers/orchestrationDispatcher.ts,
RoadmapExecutor|mcp-server/src/tools/dispatc
... [+1049 chars truncated]

### Assistant | 2026-06-15T23:30:17.009Z

All the main awareness/roadmap/master-index engines are already wired. Now check the BUILD_STATE NEEDS_WIRING full engine list more carefully - the audit found 37 but only listed 23. Let me also check the ROADMAP-CONSOLIDATED for bridge units in sierra's lane.

### Assistant | 2026-06-15T23:30:21.342Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:30:26.694Z

[tool_use: Bash]

### User | 2026-06-15T23:30:42.306Z

[tool_result] ENGINES_INDEX type: array len: 0
Unwired in index: 0

### User | 2026-06-15T23:30:49.940Z

[tool_result] Total units: 901
Sierra-lane wiring/bridge units: 5
  AI-INTEG-MS3 | ? | ?
  CAD-FUSION-LIVE-MS0-ACBRIDGE | ? | ?
  CWEDM-MS0 | ? | ?
  ECHO-CAM-BRIDGES-MS0 | ? | ?
  WEDM-INT-MS0 | ? | ?

### Assistant | 2026-06-15T23:30:53.681Z

Those ROADMAP-CONSOLIDATED units are not sierra-lane (they're CAD/WEDM/CAM). Let me dig deeper - check the ROADMAP-CONSOLIDATED structure properly, then look for the actual unwired bridge wiring units that mention system-viz/graph/session.

### Assistant | 2026-06-15T23:30:56.072Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:30:58.487Z

[tool_use: Bash]

### User | 2026-06-15T23:31:43.614Z

[tool_result] Keys: [
  'schemaVersion',
  'generatedAt',
  'provenance',
  'stats',
  'milestones',
  'pending_units',
  'unconsolidated_prose',
  'bridge_units'
]
First unit shape: {"id":"5AXIS-AI","title":"5-Axis Machining AI — Kinematics, TCPC & Simultaneous Intelligence","source_roadmaps":["MILESTONE_PROGRESS","envelope"],"total":1,"shipped":1,"pending":0,"claimedStatus":"complete","derivedStatus":"complet
... [+297 chars truncated]

### User | 2026-06-15T23:31:49.311Z

[tool_result] Exit code 1
Bridge/wire keys: [ 'bridge_units' ]
Count: undefined

### Assistant | 2026-06-15T23:31:54.431Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:31:59.117Z

[tool_use: Bash]

### User | 2026-06-15T23:32:21.372Z

[tool_result] bridge_units type: object not-array
bridge_units: {"wiring":[{"id":"U-BRIDGE-WIRE-OTHER","title":"Wire 11 unwired Other engine(s) to their dispatcher(s)","domain":"Other","engine_count":11,"intent":"Connect the 11 built-but-unwired Other-domain engines into their natural MCP dispatcher(s) so the capability is reachable."},{"id":"U-BRIDGE-WIRE-CREO","title":"Wire 3 unwired Creo engine(s) to their d
... [+650 chars truncated]

### User | 2026-06-15T23:32:39.733Z

[tool_result] <persisted-output>
Output too large (115.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-sierra\ed91599e-19b8-4bdb-8ea8-87e47b6ee322\tool-results\bp11jsgzi.txt

Preview (first 2KB):
Pending units count: 3025
Sierra-lane pending: 654
  {"unit_id":"U-CAMP04","milestone":"CAM-PARITY-AGI-MS0","title":"Mastercam Quality Bridges (SPC, FAI, Probing)","status":"pending","consolid
... [+1763 chars truncated]

### Assistant | 2026-06-15T23:32:43.696Z

The keyword search was too broad. Let me narrow to exact sierra terms and also check the bridge_units wiring list, then directly locate engine files for the unwired "Other" domain bucket.

### Assistant | 2026-06-15T23:32:47.657Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:32:51.759Z

[tool_use: Bash]

### User | 2026-06-15T23:33:24.296Z

[tool_result] Wiring bridge units:
  U-BRIDGE-WIRE-OTHER | Other | 11 engines | Connect the 11 built-but-unwired Other-domain engines into t
  U-BRIDGE-WIRE-CREO | Creo | 3 engines | Connect the 3 built-but-unwired Creo-domain engines into the
  U-BRIDGE-WIRE-WET | Wet | 2 engines | Connect the 2 built-but-unwired Wet-domain engines into thei
  U-BRIDGE-WIRE-ONSHAPE | Onshape | 2 engines | Connect the 2 built-b
... [+3837 chars truncated]

### User | 2026-06-15T23:33:42.683Z

[tool_result] All 23 unwired engines from audit:
  PlaywrightAutomationEngine | prism_automation | 22 KB
  EmbeddingGuardEngine | UNKNOWN — review manually | 7 KB
  SemanticAssetIndexEngine | UNKNOWN — review manually | 7 KB
  CreoToolkitBridgeEngine | UNKNOWN — review manually | 7 KB
  CreoIntegrationTestSuiteEngine | UNKNOWN — review manually | 7 KB
  CATIACAAV5BridgeEngine | UNKNOWN — review manually | 10 KB
... [+1156 chars truncated]

### Assistant | 2026-06-15T23:33:46.275Z

Now I have the complete picture. Let me do the final verification greps - only for the engines in sierra's competence lane (semantic/embedding/graph/session/ai-reasoning/scheduling), and locate their actual file paths.

### Assistant | 2026-06-15T23:33:49.302Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:33:50.648Z

[tool_use: Bash]

### User | 2026-06-15T23:34:29.868Z

[tool_result] EGE:done
SAI:done
CSB:done
DSC:done
GCE:done
BAR:done

### User | 2026-06-15T23:34:30.096Z

[tool_result] mcp-server/src/engines/BayesianAcquisitionRefiner.ts
mcp-server/src/engines/cycleSchedulingBridge.ts
mcp-server/src/engines/DeepSeekClientEngine.ts
mcp-server/src/engines/EmbeddingGuardEngine.ts
mcp-server/src/engines/GrokCLIClientEngine.ts
mcp-server/src/engines/SemanticAssetIndexEngine.ts

### Assistant | 2026-06-15T23:34:33.018Z

All six returned ZERO dispatcher hits. Now let me quickly check what these engines actually do to confirm the right target dispatcher for each.

### Assistant | 2026-06-15T23:34:34.638Z

[tool_use: Bash]

### Assistant | 2026-06-15T23:34:35.874Z

[tool_use: Bash]

### User | 2026-06-15T23:35:30.873Z

[tool_result] /**
 * EmbeddingGuardEngine — Tiered cosine-similarity gate with injectable embedder
 *
 * Phase 0.16 U-OP13 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Complements the
 * existing TF-IDF-based SemanticSimilarityGuardEngine by evaluating the
 * three-band rule (green/yellow/red) against real sentence embeddings
 * produced by LocalEmbeddingEngine (or any injected embedder).
 *
 *   green  (< 0.70)  
... [+2463 chars truncated]

### User | 2026-06-15T23:35:31.032Z

[tool_result] /**
 * GrokCLIClientEngine — subprocess wrapper around xAI's Grok CLI.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS1 / OCTOPUS-CONSENSUS / GROK-CLI.
 *
 * Companion to {@link GrokClientEngine} (HTTP, needs `XAI_API_KEY`). THIS
 * engine drives the *CLI* — xAI's "Grok Build" (released 2026-05) or the
 * API-compatible community `grok` CLI (npm `grok-dev`). The CLI authenticates
 * via the user's Grok 
... [+2627 chars truncated]

### Assistant | 2026-06-15T23:35:34.189Z

Now I have everything I need for a clean, verified report. Let me make one final check to confirm the right dispatchers exist for each engine.

### Assistant | 2026-06-15T23:35:35.740Z

[tool_use: Bash]

### User | 2026-06-15T23:35:41.121Z

[tool_result] aiDispatcher.ts
aiReasoningDispatcher.ts
devDispatcher.ts
intelligenceDispatcher.ts
memoryDispatcher.ts
mlDispatcher.ts
orchestrationDispatcher.ts
schedulingDispatcher.ts
sessionDispatcher.ts
sessionDocNodesAction.test.ts
sessionDocNodesAction.ts
sessionHybridSearchAction.test.ts
sessionHybridSearchAction.ts
sessionNodeCardAction.test.ts
sessionNodeCardAction.ts

### Assistant | 2026-06-15T23:36:13.196Z

Here is the complete, verified findings report.

---

## Verified Unwired Engines — Sierra's Lane + Cross-Domain Candidates

### Audit methodology

The BUILD_STATE.json NEEDS_WIRING section and `state/shared/UNWIRED-ENGINE-AUDIT-2026-06-15.json` identify **23 confirmed unwired engines** (UNWIRED classification in the audit, out of 3,799 total). The broader 37 figure in the headline comes from an older snapshot; the audit file is canonical at 23.

All awareness/roadmap/master-index/graph engines in sierra's core domain (`MasterIndexEngine`, `UnifiedAwarenessOrchestrator`, `RoadmapDAGEngine`, `RoadmapIntelligenceEngine`, `SessionAwarenessLifecycleEngine`, etc.) are **already wired** — confirmed by dispatcher grep returning hits. The unwired list contains no system-viz/graph engines.

---

### Genuinely unwired engines relevant to sierra (cross-domain infra, not owned by mill/lathe/wedm/cam/cad)

**1. EmbeddingGuardEngine**
- File: `mcp-server/src/engines/EmbeddingGuardEngine.ts`
- Purpose: Tiered cosine-similarity gate (green/yellow/red bands) using `LocalEmbeddingEngine`. Used by the duplication-guard pipeline.
- Target dispatcher: `prism_intelligence` (semantic similarity) or `prism_dev` (as a guard gate alongside duplication-guard)
- Proof unwired: `grep -rl "EmbeddingGuardEngine" mcp-server/src/tools/dispatchers/` → **zero hits**

**2. SemanticAssetIndexEngine**
- File: `mcp-server/src/engines/SemanticAssetIndexEngine.ts`
- Purpose: Qdrant-backed semantic search surface for PRISM assets — `indexAsset()` at write time, `search()` at prompt time. Bridges `LocalEmbeddingEngine` + `QdrantVectorStoreEngine`.
- Target dispatcher: `prism_session` (parallel to `master_index_query`) or `prism_memory` (Qdrant-tier semantic search)
- Proof unwired: `grep -rl "SemanticAssetIndexEngine" mcp-server/src/tools/dispatchers/` → **zero hits**

**3. cycleSchedulingBridge**
- File: `mcp-server/src/engines/cycleSchedulingBridge.ts`
- Purpose: EventBus bridge wiring `CycleTimeEstimator`
... [+2962 chars truncated]
