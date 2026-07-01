---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c2ad700-fec6-4068-9805-290031b62e61"
title: "You are auditing PRISM's mill-domain KNOWLEDGE corpus (wiki, tribal tips, handbo"
date: "2026-05-28"
first_ts: "2026-05-28T01:48:24.123Z"
last_ts: "2026-05-28T01:54:59.769Z"
cwd: "H:\\prism-slot-golf"
messages: 90
user_msgs: 39
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism-slot-golf/5c2ad700-fec6-4068-9805-290031b62e61/subagents/agent-a34d9a5520dd90127.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# You are auditing PRISM's mill-domain KNOWLEDGE corpus (wiki, tribal tips, handbo

> **claude-code-cli** | 2026-05-28 | 90 msgs (39 user / 51 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/5c2ad700-fec6-4068-9805-290031b62e61/subagents/agent-a34d9a5520dd90127.jsonl`

## Transcript

### User | 2026-05-28T01:48:24.123Z

You are auditing PRISM's mill-domain KNOWLEDGE corpus (wiki, tribal tips, handbook, manufacturer playbooks, MIT-OCW) to inform a build-wire plan for the MILL WIZARD — specifically: does enough domain knowledge exist to drive autonomous workholding/sequencing/holder-selection decisions WITHOUT a human in the loop?

CONTEXT: Foxtrot slot owns mill tribal/machining-knowhow per CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0. Mike (wire) and whiskey (lathe) have parallel work going. The lathe wizard plan is at `C:\Users\wompu\.claude\projects\H--PRISM\memory\reference_lathe_wizard_build_wire_plan_2026_05_27.md`.

ANCHOR READS:
1. `C:\Users\wompu\.claude\projects\H--PRISM\memory\reference_mill_domain_atlas_for_foxtrot_2026_05_27.md` — already lists 222+ engines + 50+ wiki entries + 300 tribal nodes. Reference it; don't re-enumerate counts.
2. `H:/prism/knowledge/wiki/` — search `index.md` (722 entries) for: workholding, kurt vise, parallel height, mitee bite, toe clamp, vacuum chuck, magnetic chuck, fixture, soft jaws, hard jaws, clamp force, holder taxonomy (cat40, bt40, hsk, capto, bigplus), interrupted cut, chip evacuation, chip thinning, way type (box vs linear), spindle taper, work envelope, machine rigidity, gforces, kinematics, mill machine selection.
3. `H:/prism/knowledge/tribal/` and `H:/prism/knowledge/wiki/code-tribal/` — same keywords.
4. `H:/prism/JM DIE/` — JM Die archive may have mill-specific operator notes.
5. `H:/prism/mcp-server/data/` — find any `workholding*.json`, `holders*.json`, `machine-spec*.json`, `clamping*.json` data files.

KNOWLEDGE-COVERAGE TABLE FOR EACH PIPELINE DECISION (operator's spec):
| Decision | Wiki entries found | Tribal tip count | Data file present | Coverage verdict |
|---|---|---|---|---|
| Kurt vise parallel-height vs clamp-force | ? | ? | ? | sufficient/partial/none |
| Auto jaw-fixture generation for odd features | ? | ? | ? | ... |
| Mitee-Bite / toe-clamp / magnet / vacuum alternatives | ? | ? | ? | ... |
| Interrupted-cut av
... [+1046 chars truncated]

### Assistant | 2026-05-28T01:48:32.436Z

I'll conduct a thorough audit of PRISM's mill-domain knowledge corpus to assess coverage for autonomous workholding/sequencing/holder-selection in the MILL WIZARD. Let me start by examining the existing reference document and then systematically search the knowledge base.

### Assistant | 2026-05-28T01:48:33.350Z

[tool_use: Read]

### Assistant | 2026-05-28T01:48:33.534Z

[tool_use: Glob]

### Assistant | 2026-05-28T01:48:34.130Z

[tool_use: Bash]

### Assistant | 2026-05-28T01:48:34.436Z

[tool_use: Bash]

### User | 2026-05-28T01:48:47.352Z

[tool_result] H:/prism/knowledge/wiki\consensus\index.md
H:/prism/knowledge/wiki\architecture\hooks\engine\index.md
H:/prism/knowledge/wiki\architecture\monolith-extraction\index.md
H:/prism/knowledge/wiki\index.md

### User | 2026-05-28T01:48:48.392Z

[tool_result] 1	---
2	name: reference-mill-domain-atlas-for-foxtrot-2026-05-27
3	description: "COMPREHENSIVE mill-machining asset atlas. Built via 4 parallel Explore agents 2026-05-27 per operator directive. Maps every mill-domain production asset (engines, dispatchers, schemas, registries, posts, CAD/CAM, JM Die fleet, wiki, tribal nodes, ingestion cache) so foxtrot slot (and mill-soul) can do file-search in O
... [+23299 chars truncated]

### User | 2026-05-28T01:48:54.281Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Measure-Object: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### User | 2026-05-28T01:49:00.695Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Measure-Object: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-05-28T01:49:03.112Z

[tool_use: Bash]

### Assistant | 2026-05-28T01:49:03.477Z

[tool_use: Bash]

### Assistant | 2026-05-28T01:49:02.489Z

Let me correct that and use Bash properly:

### Assistant | 2026-05-28T01:49:02.631Z

[tool_use: Bash]

### User | 2026-05-28T01:49:11.938Z

[tool_result] Exit code 1

### User | 2026-05-28T01:49:13.423Z

[tool_result] 38047

### User | 2026-05-28T01:49:13.510Z

[tool_result] 4246

### Assistant | 2026-05-28T01:49:15.457Z

Now let me search the wiki index and grep for workholding-related entries:

### Assistant | 2026-05-28T01:49:15.879Z

[tool_use: Read]

### Assistant | 2026-05-28T01:49:16.807Z

[tool_use: Grep]

### Assistant | 2026-05-28T01:49:17.680Z

[tool_use: Grep]

### Assistant | 2026-05-28T01:49:18.377Z

[tool_use: Grep]

### User | 2026-05-28T01:49:30.879Z

[tool_result] 1	---
2	title: PRISM Wiki Index
3	category: meta
4	last_verified: 2026-05-08
5	author: hybrid
6	---
7	
8	# PRISM Wiki Index
9	
10	> LLM-maintained catalog. Bootstrap rewrites entries with `source:bootstrap` only — LLM-added entries are preserved across re-runs. See `WIKI_SCHEMA.md` §4.1.
11	
12	Last bootstrap: 2026-05-08 — 770 entries total (575 engines + 96 dispatchers + 99 memories from bootstra
... [+18235 chars truncated]

### User | 2026-05-28T01:49:58.745Z

[tool_result] Found 248 files
H:\prism\knowledge\wiki\architecture\_orphans-rescue.md
H:\prism\knowledge\wiki\index.md
H:\prism\knowledge\wiki\architecture\tests-index.md
H:\prism\knowledge\wiki\architecture\tribal\tribal-wedm-knowledge-tips-kb-10.md
H:\prism\knowledge\wiki\architecture\tribal\tribal-mastercam-cam-tips.md
H:\prism\knowledge\wiki\code-tribal\learnings\post-bridge-synergy-ms0-u-emit-cmm-uncertain
... [+17997 chars truncated]

### User | 2026-05-28T01:49:58.759Z

[tool_result] Found 20 files
H:\prism\knowledge\wiki\architecture\_orphans-rescue.md
H:\prism\knowledge\wiki\code-tribal\templates\cad-generic__direct-edit.md
H:\prism\knowledge\wiki\code-tribal\templates\cad-siemens-nx__general.md
H:\prism\knowledge\wiki\code-tribal\templates\cad-generic__simulation-fea.md
H:\prism\knowledge\wiki\code-tribal\youtube-_GLQcVuPRa0.md
H:\prism\knowledge\wiki\code-tribal\youtube-wg
... [+1050 chars truncated]

### User | 2026-05-28T01:49:58.767Z

[tool_result] Found 83 files
H:\prism\knowledge\wiki\architecture\_orphans-rescue.md
H:\prism\knowledge\wiki\architecture\tests-index.md
H:\prism\knowledge\wiki\code-tribal\youtube-_YDw2_WqCMY.md
H:\prism\knowledge\wiki\code-tribal\youtube-zXXMoxhWYng.md
H:\prism\knowledge\wiki\code-tribal\youtube-WICMnnJvbh8.md
H:\prism\knowledge\wiki\code-tribal\youtube-VWlspAYNbq0.md
H:\prism\knowledge\wiki\code-tribal\youtu
... [+4689 chars truncated]

### Assistant | 2026-05-28T01:50:00.773Z

Now let me read key workholding-related wiki files and check the tribal knowledge:

### Assistant | 2026-05-28T01:50:02.200Z

[tool_use: Read]

### Assistant | 2026-05-28T01:50:01.891Z

[tool_use: Read]

### Assistant | 2026-05-28T01:50:01.444Z

[tool_use: Read]

### Assistant | 2026-05-28T01:50:01.213Z

[tool_use: Read]

### User | 2026-05-28T01:50:07.547Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Locators + soft jaws — getting repeatability without re-indicating every part"
4	domain: "Workholding"
5	category: workholding
6	version_state: Current
7	confidence: 0.96
8	cluster_size: 1
9	canonical_sha256: authored-2026-05-21-hotel
10	sources:
11	  - Machinery's Handbook 31e §Locating & Clamping + §Soft Jaws
12	  - Jergens "Fixture Workbook" + Carr Lane To
... [+11955 chars truncated]

### User | 2026-05-28T01:50:07.549Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Clamp force budgeting — how much grip, what holder, when to switch"
4	domain: "Workholding"
5	category: workholding
6	version_state: Current
7	confidence: 0.96
8	cluster_size: 1
9	canonical_sha256: authored-2026-05-20-hotel
10	sources:
11	  - Machinery's Handbook 31e §Workholding + §Clamping Forces
12	  - Sandvik Coromant — Workholding application guide
13	  
... [+10534 chars truncated]

### User | 2026-05-28T01:50:07.624Z

[tool_result] 1	---
2	type: extracted-book
3	source_book: "Fundamentals of CNC Machining (Autodesk 2014 edition)"
4	publisher: "Autodesk, Inc."
5	year: 2014
6	extracted_at: "2026-05-25"
7	extracted_by: "claude-9f3a8e4f-india-iter29"
8	pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Fundamentals_of_CNC_Machining.pdf"
9	pdf_size_mb: 15.0
10	extraction_focus: "Workholding (ch 10) + WCS-on-flip (ch 7) + tapping (ch 3) 
... [+4309 chars truncated]

### User | 2026-05-28T01:50:07.626Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Multi-part fixturing — tombstone, pallet, sub-plate decisions for production"
4	domain: "Workholding"
5	category: workholding
6	version_state: Current
7	confidence: 0.96
8	cluster_size: 1
9	canonical_sha256: authored-2026-05-21-hotel
10	sources:
11	  - Machinery's Handbook 31e §Fixturing for Production
12	  - Jergens "Fixture Workbook" + Pioneer Pallet System
... [+10824 chars truncated]

### Assistant | 2026-05-28T01:50:09.381Z

Now let me search for holder selection and machine kinematics information:

### Assistant | 2026-05-28T01:50:10.429Z

[tool_use: Grep]

### Assistant | 2026-05-28T01:50:10.924Z

[tool_use: Bash]

### Assistant | 2026-05-28T01:50:11.507Z

[tool_use: Grep]

### User | 2026-05-28T01:50:37.096Z

[tool_result] Found 5 files
H:\prism\mcp-server\src\schemas\safetyActionSchemas.ts
H:\prism\mcp-server\src\tools\dispatchers\safetyDispatcher.ts
H:\prism\mcp-server\src\engines\ManufacturerCatalogAIEngine.ts
H:\prism\mcp-server\src\__tests__\WorkholdingSelectionEngine.test.ts
H:\prism\mcp-server\src\engines\WorkholdingSelectionEngine.ts

### system

... [10 middle messages omitted -- see raw_file] ...

### User | 2026-05-28T01:51:22.715Z

[tool_result] wire-edm/
dmg-dmu-50.json  75.3K
doosan-dnm-5700.json  63.3K
makino-a51nx.json  65.4K
mazak-integrex-i200.json  70.1K
okuma-lb3000-ex-ii.json  75.1K
okuma-mu-5000v.json  66.5K
okuma-multus-b300ii.json  65.3K
roku-roku-rky-1000n.json  58.8K

### Assistant | 2026-05-28T01:51:24.734Z

Now let me search for machine kinematics and rapid acceleration specifications:

### Assistant | 2026-05-28T01:51:25.496Z

[tool_use: Bash]

### Assistant | 2026-05-28T01:51:25.806Z

[tool_use: Read]

### Assistant | 2026-05-28T01:51:26.686Z

[tool_use: Grep]

### User | 2026-05-28T01:51:38.853Z

[tool_result] 1	{
2	  "id": "okuma-multus-b300ii",
3	  "machine_id": "okuma-multus-b300ii",
4	  "manufacturer": "Okuma",
5	  "model": "MULTUS B300II",
6	  "version": "1.0.0",
7	  "created_at": "2026-03-29T19:00:00Z",
8	  "updated_at": "2026-03-29T19:00:00Z",
9	
10	  "cover_info": {
11	    "manufacturer": "Okuma",
12	    "model_family": "MULTUS B",
13	    "models_covered": ["MULTUS B300II", "MULTUS B300II-W (dua
... [+2857 chars truncated]

### User | 2026-05-28T01:51:44.915Z

[tool_result] H:/prism/mcp-server/src/engines/BalancingMachineEngine.ts
H:/prism/mcp-server/src/engines/CADAIStateMachineEngine.ts
H:/prism/mcp-server/src/engines/EDMMaterialMachineWireEngine.ts
H:/prism/mcp-server/src/engines/EmployeeMachineDomainAcademyEngine.ts
H:/prism/mcp-server/src/engines/EmployeePerMachineSFAdaptiveEngine.ts
H:/prism/mcp-server/src/engines/HybridLaserMachineEngine.ts
H:/prism/mcp-server
... [+544 chars truncated]

### User | 2026-05-28T01:52:00.469Z

[tool_result] Found 15 files limit: 15
H:\prism\knowledge\wiki\architecture\_orphans-rescue.md
H:\prism\knowledge\wiki\architecture\tests-index.md
H:\prism\knowledge\wiki\architecture\monolith-modules-index.md
H:\prism\knowledge\wiki\architecture\hooks\engine\postgenvalidatorskipguardhook.md
H:\prism\knowledge\wiki\architecture\engines\other\so3kinematicsencoderengine.md
H:\prism\knowledge\wiki\architecture\eng
... [+767 chars truncated]

### Assistant | 2026-05-28T01:52:02.546Z

Now let me check for chip thinning and interrupted cut information:

### Assistant | 2026-05-28T01:52:03.209Z

[tool_use: Grep]

### Assistant | 2026-05-28T01:52:03.838Z

[tool_use: Read]

### Assistant | 2026-05-28T01:52:04.122Z

[tool_use: Bash]

### User | 2026-05-28T01:52:21.172Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Machining tactics — climb vs conventional, trochoidal, chip thinning, entry moves"
4	domain: "Machining"
5	category: "machining-tactics"
6	version_state: Current
7	confidence: 0.95
8	cluster_size: 1
9	sources:
10	  - hand-authored:claude-b23a56ef:2026-05-18
11	extracted_via: hand-authored-canonical
12	extracted_at: 2026-05-18T19:35:00Z
13	tags: [climb-mill, c
... [+10876 chars truncated]

### User | 2026-05-28T01:52:40.349Z

[tool_result] Found 138 files
H:\prism\knowledge\wiki\architecture\_orphans-rescue.md
H:\prism\knowledge\wiki\architecture\tests-index.md
H:\prism\knowledge\wiki\architecture\monolith-modules\complete-extraction\prism-advanced-feed-optimizer.md
H:\prism\knowledge\wiki\architecture\hooks\engine\groovedepthgatehook.md
H:\prism\knowledge\wiki\architecture\engines\mill\millchipevacuationpredictorengine.md
H:\prism\
... [+9545 chars truncated]

### User | 2026-05-28T01:52:57.941Z

[tool_result] H:/prism/mcp-server/src/registries/AISubsystemRegistry.ts
H:/prism/mcp-server/src/registries/FormulaRegistry.ts
H:/prism/mcp-server/src/registries/index.ts
H:/prism/mcp-server/src/registries/ToolGeometryDefaults.ts
H:/prism/mcp-server/src/registries/ToolpathStrategyRegistry.ts
H:/prism/mcp-server/src/registries/ToolpathStrategyRegistry_Part1.ts

### Assistant | 2026-05-28T01:53:00.478Z

Now let me check the ToolpathStrategyRegistry to see what strategies are available:

### Assistant | 2026-05-28T01:53:00.546Z

[tool_use: Read]

### Assistant | 2026-05-28T01:53:00.835Z

[tool_use: Bash]

### Assistant | 2026-05-28T01:53:01.595Z

[tool_use: Bash]

### User | 2026-05-28T01:53:10.368Z

[tool_result] 1	/**
2	 * PRISM Manufacturing Intelligence - Comprehensive Toolpath Strategy Registry
3	 * 
4	 * SOURCE: PRISM_MASTER_TOOLPATH_REGISTRY.js (Lines 89487-90098)
5	 * TOTAL: 762+ Strategies across 5 major categories
6	 * 
7	 * Categories:
8	 * - Milling Roughing: 127 strategies (HSM/Adaptive, Traditional, Entry)
9	 * - Milling Finishing: 156 strategies (2D, 3D, Edge, Specialized)
10	 * - Hole Making
... [+3003 chars truncated]

### User | 2026-05-28T01:53:15.256Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
87 matches in 58 files:

1185:0:${HOLE_MAKING_COUNT} strategies`);
1193:0:Record<string, ToolpathStrategy> = {
1468:0:${TURNING_COUNT} strategies`);
1476:0:Record<string, ToolpathStrategy> = {
1769:0:${MULTIAXIS_COUNT} strategies`);
1777:0:Record<string, ToolpathStrategy> = {
2168:0:${PRISM_NOVEL_COUNT
... [+796 chars truncated]

### User | 2026-05-28T01:53:16.319Z

[tool_result] H:/prism/knowledge/wiki/architecture/actions/business/capacity-machine-load.md
H:/prism/knowledge/wiki/architecture/actions/business/capacity-machines.md
H:/prism/knowledge/wiki/architecture/actions/business/financial-machine-investment.md
H:/prism/knowledge/wiki/architecture/actions/business/machine-rate-compare.md
H:/prism/knowledge/wiki/architecture/actions/business/machine-rate-effective.md
H:
... [+1170 chars truncated]

### Assistant | 2026-05-28T01:53:18.535Z

Let me now check what tribal tips are available and look at existing data files:

### Assistant | 2026-05-28T01:53:18.935Z

[tool_use: Bash]

### Assistant | 2026-05-28T01:53:19.357Z

[tool_use: Read]

### Assistant | 2026-05-28T01:53:19.779Z

[tool_use: Bash]

### User | 2026-05-28T01:53:28.591Z

[tool_result] 1	/**
2	 * Milling tribal-tip seed (CITED, DRAFT-CONFIDENCE).
3	 *
4	 * Source-attributed tips drawn from the 24-PDF milling corpus indexed at
5	 * state/shared/dashboards/milling-pdf-corpus.json. Each tip carries:
6	 *   - sourceId          → corpus entry ID (e.g. PDF-MILL-HAAS-MILL-OPS-2023)
7	 *   - sourceTitle       → human-readable source name
8	 *   - vendor            → Haas/Hurco/Sandvik/M
... [+4103 chars truncated]

### User | 2026-05-28T01:53:32.234Z

[tool_result] H:/prism/mcp-server/src/data/academy/course-4-milling-operations.ts
H:/prism/mcp-server/src/data/jmdie-milling-macros.ts
H:/prism/mcp-server/src/data/kennametal-milling-extracted.json
H:/prism/mcp-server/src/data/lathe-tribal-tips-okuma.ts
H:/prism/mcp-server/src/data/tribal-knowledge-tips.ts
H:/prism/mcp-server/src/data/tribal-knowledge-types.ts
H:/prism/mcp-server/src/data/tribal-tips
H:/prism/m
... [+267 chars truncated]

### User | 2026-05-28T01:53:32.359Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-28T01:53:36.209Z

Let me count the tribal tips and check what operations are covered:

### Assistant | 2026-05-28T01:53:37.340Z

[tool_use: Bash]

### Assistant | 2026-05-28T01:53:37.682Z

[tool_use: Read]

### Assistant | 2026-05-28T01:53:37.735Z

[tool_use: Bash]

### User | 2026-05-28T01:53:43.235Z

[tool_result] 1	/**
2	 * Milling Training Discovery Index — AI-reachable flat surface
3	 *
4	 * Purpose: when the milling wizard is trained (LoRA / RAG / supervised), the
5	 * training pipeline + Claude / Ollama agents need ONE entry point that
6	 * enumerates ALL milling knowledge nodes with consistent schema and stable
7	 * IDs. This file is that surface.
8	 *
9	 * Aggregates:
10	 *   1. Local PDF corpus     
... [+3140 chars truncated]

### User | 2026-05-28T01:53:46.149Z

[tool_result] 328

### User | 2026-05-28T01:53:52.558Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH

[+129 more]
1004:0:"cutter_compensation"
1020:0:"face_milling"
1036:0:"face_milling"
1052:0:"face_milling"
1068:0:"cutting_parameters"
1083:0:"cutting_parameters"
1098:0:"cutting_parameters"
1113:0:"cutting_parameters"
112:0:"slotting"
1128:0:"cutting_parameters"
1144:0:"cutting_parameters"
1159:0:"cu
... [+4779 chars truncated]

### Assistant | 2026-05-28T01:53:55.327Z

Perfect. Now I have comprehensive data. Let me compile my findings into the audit report:

### Assistant | 2026-05-28T01:53:56.247Z

[tool_use: Read]

### User | 2026-05-28T01:53:59.729Z

[tool_result] 1	---
2	name: reference-lathe-wizard-build-wire-plan-2026-05-27
3	description: Comprehensive deep-dive (4 parallel Explore agents) of lathe wizard build/wire gaps. Identifies 5 critical print-to-program gaps + 5 closed-loop training gaps. Defines execution order keyed to canonical 12-stage lathe operation pipeline. Built per operator directive 2026-05-27.
4	metadata:
5	  type: reference
6	  date: 
... [+4717 chars truncated]

### Assistant | 2026-05-28T01:54:59.769Z

Now I have the context from the lathe wizard plan. Let me generate the comprehensive audit report for the mill wizard:

## MILL WIZARD BUILD-WIRE AUDIT REPORT
**Date: 2026-05-27 | Auditor: Foxtrot-soul | Format: Knowledge-coverage assessment for autonomous workholding/sequencing/holder-selection**

---

## Coverage Table: Decision-Autonomy Assessment

| Decision | Wiki entries found | Tribal tip count | Data file present | Coverage verdict |
|---|---|---|---|---|
| **Kurt vise parallel-height vs clamp-force** | 3 canonical (clamp-force-and-selection, locators-and-soft-jaws, multi-part-systems) + 1 extraction (fundamentals-cnc-2014-workholding) | 18+ tips (vise-safety, jaw-selection, clamp-torque) | workholding-ontology.json + WorkholdingSelectionEngine.ts | **SUFFICIENT — direct implementation possible** |
| **Auto jaw-fixture generation for odd features** | 1 entry (locators-and-soft-jaws, §soft-jaw design rules) | 4 tips (soft-jaw-bore-pressure, relief-geometry, witness-mark) | none (generation algorithm missing) | **PARTIAL — rules exist, automation stub only** |
| **Mitee-Bite / toe-clamp / magnet / vacuum alternatives** | 1 canonical (clamp-force-and-selection, tier comparison table) | 6 tips (toe-strap setup, magnetic-material-scope, vacuum-seal) | workholding-ontology.json categories | **SUFFICIENT — decision matrix ready** |
| **Interrupted-cut avoidance** | 1 canonical (machining-tactics-climb-trochoidal, entry moves §4) | 12+ tips (plunge-entry-hardened, ramp-angle-material, chip-evac) | ChipThinningCompensationEngine.ts exists | **SUFFICIENT — physics + strategy present** |
| **Chip evacuation strategy** | 2 entries (chip-control-and-evacuation + coolant-strategy-selection) + 5 formulas | 14+ tips (flood-pressure, HSM-air-blast, MQL-aluminum-only, cryo-inconel) | ChipEvacuationModel.ts + coolant registry | **SUFFICIENT — multimodal strategies codified** |
| **Chip thinning compensation (already in SFC?)** | 1 canonical (machining-tactics-climb-trochoidal,
... [+13831 chars truncated]
