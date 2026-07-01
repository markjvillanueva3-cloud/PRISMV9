---
type: "chat-session"
source: "claude-code-cli"
session_id: "1730eb7c-9196-4e9b-856c-4f2a7414724d"
title: "PRISM at `H:/PRISM/`. Enumerate MILL-MACHINING wiki entries + tribal memory node"
date: "2026-05-27"
first_ts: "2026-05-27T13:45:10.903Z"
last_ts: "2026-05-27T14:07:43.724Z"
cwd: "H:\\PRISM"
messages: 72
user_msgs: 31
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/1730eb7c-9196-4e9b-856c-4f2a7414724d/subagents/agent-a098553b1429873fd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# PRISM at `H:/PRISM/`. Enumerate MILL-MACHINING wiki entries + tribal memory node

> **claude-code-cli** | 2026-05-27 | 72 msgs (31 user / 41 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/1730eb7c-9196-4e9b-856c-4f2a7414724d/subagents/agent-a098553b1429873fd.jsonl`

## Transcript

### User | 2026-05-27T13:45:10.903Z

PRISM at `H:/PRISM/`. Enumerate MILL-MACHINING wiki entries + tribal memory nodes so a foxtrot mill-domain slot can query them.

Scan and report:

1. **Wiki entries**: `H:/PRISM/knowledge/wiki/` recursive scan for mill-related files. Look in subdirectories:
   - `architecture/` — mill engine wiki entries
   - `code-tribal/` — operator-wisdom mill content
   - `concepts/` — mill machining concepts
   - `entities/` — mill machines, tools, materials
   - `lessons/` — mill-specific lessons
   - `patterns/` — mill toolpath patterns
   - `reference/` — mill reference data
   Filter for keywords: mill, milling, end-mill, face-mill, ball-nose, drill, tap, ream, bore (NOT lathe-bore), pocket, contour, profile, slot, rough, finish, 3-axis, 4-axis, 5-axis, HSM, HSC. For each hit, output `path | 1-line title from frontmatter or first heading`. Cap at 50 entries.

2. **Tribal memory nodes**: `H:/PRISM/knowledge/memories/` for any feedback_*.md, reference_*.md, or other memo file that mentions mill-domain content. Skip pure-lathe/pure-wedm files. Cap at 30.

3. **Mill-domain galactic-center sentinels** (per DOMAIN-GALAXY-DOCTRINE-MS0):
   - `H:/PRISM/mcp-server/src/engines/mill/CLAUDE.md` (mill galaxy center)
   - Check for sister sentinels: `mill/CLAUDE.md` in `algorithms/`, `dispatchers/`, etc.
   - Report whether each exists + first 5 lines of content (or "NOT FOUND" or "STUB").

4. **Master-index / system-viz mill nodes**: Look in `H:/PRISM/state/shared/system-graph.json` or similar for any node naming pattern `*Mill*`, `*Milling*`, etc. Report count of mill-tagged nodes if findable. If the graph is too large to parse, skip with note.

5. **Tribal scan summary**: Check `H:/PRISM/mcp-server/data/ingestion_cache/` for any `*tribal*mill*`, `*mill*tribal*` summary files (from prior session ingestion). Report paths + 1-line of content from frontmatter.

Format: numbered sections, paths + 1-line context. Under 600 words. Honest "NOT FOUND" if a path doesn't exist.

### Assistant | 2026-05-27T13:46:51.295Z

I'll conduct a thorough scan of the PRISM mill-machining knowledge base. Let me search across these directories in parallel.

### Assistant | 2026-05-27T13:46:51.678Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:46:51.945Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:46:52.224Z

[tool_use: Bash]

### User | 2026-05-27T13:48:23.662Z

[tool_result] knowledge\memories\uncategorized\devops_improvements.md
knowledge\memories\uncategorized\distributed_locking.md
knowledge\memories\uncategorized\handoff_pp_road_map.md
knowledge\memories\uncategorized\h_drive_master.md
knowledge\memories\uncategorized\jm-die-shop.md
knowledge\memories\uncategorized\plugin_architecture.md
knowledge\memories\uncategorized\prism_commands.md
knowledge\memories\uncateg
... [+5638 chars truncated]

### User | 2026-05-27T13:48:24.749Z

[tool_result] knowledge\wiki\consensus\f01d0ccc.md
knowledge\wiki\lessons\cad-blueprint-revolve-2475-037.md
knowledge\wiki\lessons\cad-fusion-live-ms0-integration-discovery.md
knowledge\wiki\lessons\cad-fusion-live-ms0-h-drive-archaeology.md
knowledge\wiki\architecture\system-viz.md
knowledge\wiki\entities\jm-die-program-catalog.md
knowledge\wiki\code-tribal\canonical\hypermill-contour-milling-milling-open-and-
... [+8596 chars truncated]

### User | 2026-05-27T13:49:21.144Z

[tool_result] CLAUDE.md  9.1K
MEMORY.md  3.0K

### Assistant | 2026-05-27T13:49:28.994Z

Good - I found wiki entries and memory files. Now let me search strategically for mill-related content and check the mill galaxy center.

### Assistant | 2026-05-27T13:49:30.329Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:49:30.743Z

[tool_use: Bash]

### Assistant | 2026-05-27T13:49:30.903Z

[tool_use: Bash]

### User | 2026-05-27T13:50:57.169Z

[tool_result] Found 50 files limit: 50
knowledge\wiki\code-tribal\learnings\mill-video-corpus-ms0-u-haas-sandvik-video-corpus.md
knowledge\wiki\code-tribal\learnings\master-machinist-orchestrator-ms0-u-mmo-setup-orchestration-engine.md
knowledge\wiki\code-tribal\learnings\speed-feed-ms0-u-sfm82-effective-diameter.md
knowledge\wiki\code-tribal\learnings\mill-video-corpus-ms0-u-dapra-hem-video-corpus.md
knowledge
... [+3064 chars truncated]

### User | 2026-05-27T13:51:59.044Z

[tool_result] # Mill Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-26)

> **Bibryam Context Cascade pattern (Pillar P1 of the Galaxy Doctrine).** This file loads automatically when Claude is editing under `mcp-server/src/engines/mill/`. The root `CLAUDE.md` covers PRISM-wide doctrine; this file covers mill-specific conventions, gotchas, and pointers. **Do NOT duplicate root doctrine here** — poin
... [+1190 chars truncated]

### User | 2026-05-27T13:51:59.175Z

[tool_result] 25F 25D:

engines/ CLAUDE.md
engines\academy/ CLAUDE.md
engines\agent-orchestration/ CLAUDE.md
engines\business/ CLAUDE.md
engines\cad/ CLAUDE.md
engines\cad-fusion-live/ CLAUDE.md
engines\cam/ CLAUDE.md
engines\compliance-safety/ CLAUDE.md
engines\corpus-aggregation/ CLAUDE.md
engines\knowledge-conversion/ CLAUDE.md
engines\lathe/ CLAUDE.md
engines\mill/ CLAUDE.md
engines\mit-curriculum/ CLAUDE.m
... [+339 chars truncated]

### Assistant | 2026-05-27T13:52:01.729Z

Excellent. Now let me search for tribal memory references and check system graphs and ingestion caches.

### Assistant | 2026-05-27T13:52:02.099Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:52:02.575Z

[tool_use: Bash]

### Assistant | 2026-05-27T13:52:02.684Z

[tool_use: Bash]

### User | 2026-05-27T13:52:45.151Z

[tool_result] Found 30 files limit: 30
knowledge\memories\reference\reference_zpsn03_target_parser_2026_05_23.md
knowledge\memories\reference\reference_zpsn02_souls_filled_2026_05_23.md
knowledge\memories\reference\reference_zpsn01_psn_synergy_2026_05_22.md
knowledge\memories\reference\reference_zebra_fleet_precheck_2026_05_25.md
knowledge\memories\reference\reference_zebra_awareness_ms0_2026_05_20.md
knowledge
... [+1901 chars truncated]

### User | 2026-05-27T13:53:30.006Z

[tool_result] H:/PRISM/state/shared/agent-coordination/cursors/0bd45e0c-7208-4dfc-bc31-1c4c0402e5d0.json
H:/PRISM/state/shared/agent-coordination/cursors/0d38abc4-ca1f-4115-8d66-0ee05c3826c4.json
H:/PRISM/state/shared/agent-coordination/cursors/0ea87a11-8f3e-4542-96b3-33b190a6e4e3.json
H:/PRISM/state/shared/agent-coordination/cursors/0fd50b2a-77a6-4338-9102-c7e5c58f86a9.json
H:/PRISM/state/shared/agent-coordina
... [+54 chars truncated]

### User | 2026-05-27T13:53:31.645Z

[tool_result] milling-extraction-curriculum.json  16.4K
milling-vendor-online-resources.json  18.6K

### Assistant | 2026-05-27T13:53:33.939Z

Great findings. Let me read the mill CLAUDE.md and check those ingestion cache files, plus scan for more tribal references.

### Assistant | 2026-05-27T13:53:34.345Z

[tool_use: Read]

### Assistant | 2026-05-27T13:53:34.602Z

[tool_use: Read]

### Assistant | 2026-05-27T13:53:34.889Z

[tool_use: Bash]

### User | 2026-05-27T13:54:22.049Z

[tool_result] 1	{
2	  "$schema": "milling-extraction-curriculum.v1",
3	  "schemaVersion": "1.0.0",
4	  "generatedAt": "2026-05-26T17:05:00Z",
5	  "generator": "slot=foxtrot, session=claude-ef40a9d1, /loop iter8+",
6	  "intent": "Page-by-page extraction curriculum for the milling-domain PDF corpus — ordered from EASIEST (small, focused, single-concept) to COMPLEX (large, multi-system, integrated). Drives /pdf-le
... [+3113 chars truncated]

### User | 2026-05-27T13:54:22.060Z

[tool_result] 1	# Mill Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-26)
2	
3	> **Bibryam Context Cascade pattern (Pillar P1 of the Galaxy Doctrine).** This file loads automatically when Claude is editing under `mcp-server/src/engines/mill/`. The root `CLAUDE.md` covers PRISM-wide doctrine; this file covers mill-specific conventions, gotchas, and pointers. **Do NOT duplicate root doctrine here** 
... [+9182 chars truncated]

### User | 2026-05-27T13:55:18.551Z

[tool_result] H:/PRISM/knowledge/memories/_legacy-root/feedback_ai_training_first_before_revenue.md
H:/PRISM/knowledge/memories/_legacy-root/feedback_post_development.md
H:/PRISM/knowledge/memories/_legacy-root/project_mill_master.md
H:/PRISM/knowledge/memories/_legacy-root/project_mill_master_canonical.md
H:/PRISM/knowledge/memories/_legacy-root/reference_awareness_stack.md
H:/PRISM/knowledge/memories/_legacy-
... [+867 chars truncated]

### Assistant | 2026-05-27T13:55:35.987Z

Now let me search for more specific mill tribal content and check for any system graph nodes.

### Assistant | 2026-05-27T13:55:36.561Z

[tool_use: Read]

### Assistant | 2026-05-27T13:55:37.064Z

[tool_use: Read]

### Assistant | 2026-05-27T13:55:37.409Z

[tool_use: Bash]

### User | 2026-05-27T13:56:10.616Z

[tool_result] 1	---
2	schema_version: 1.0.0
3	kind: mirrored_memory
4	source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_mill_master.md
5	source_filename: project_mill_master.md
6	content_hash: b5cbb47306a5cc0bd53181b08aa2b37b3d919c4be6b9c641ad5dd7a1dcaae48e
7	mirror_ts: 2026-05-05T13:00:09.502Z
8	mirror_engine: ObsidianMemorySyncEngine
9	---
10	**Track:** MILL-MASTER
11	**Resume tri
... [+1241 chars truncated]

### User | 2026-05-27T13:56:11.041Z

[tool_result] 1	---
2	schema_version: 1.0.0
3	kind: mirrored_memory
4	source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_mill_master_canonical.md
5	source_filename: project_mill_master_canonical.md
6	content_hash: 420dcb1bf6db566bb58e4ed2346ec725b27df97ce9b5e06f700162a9d6b4b72b
7	mirror_ts: 2026-05-05T13:00:09.503Z
8	mirror_engine: ObsidianMemorySyncEngine
9	---
10	**MILL-MASTER v13.
... [+1170 chars truncated]

### User | 2026-05-27T13:56:34.612Z

[tool_result] milling-extraction-curriculum.json  16.4K
milling-vendor-online-resources.json  18.6K

### Assistant | 2026-05-27T13:56:37.644Z

Excellent. Let me now get specific wiki entries and verify the sister CLAUDE.md files for mill-related galaxies.

### Assistant | 2026-05-27T13:56:38.090Z

[tool_use: Read]

### Assistant | 2026-05-27T13:56:38.687Z

[tool_use: Bash]

### Assistant | 2026-05-27T13:56:39.004Z

[tool_use: Bash]

### User | 2026-05-27T13:57:31.453Z

[tool_result] 1	{
2	  "$schema": "milling-vendor-online-resources.v1",
3	  "schemaVersion": "1.0.0",
4	  "generatedAt": "2026-05-26T15:20:00Z",
5	  "generator": "slot=foxtrot, session=claude-ef40a9d1, /loop iter5",
6	  "intent": "Deep online research manifest — DAPRA, Sandvik, Widia/Kennametal, Ingersoll, Iscar, Mitsubishi, Seco, Sumitomo, plus the PTS-Tools entry point (their library was not surface-discoverab
... [+2786 chars truncated]

### User | 2026-05-27T13:58:19.158Z

[tool_result] cat: H:/PRISM/mcp-server/src/engines/hypermill/CLAUDE.md: The system cannot find the file specified. (os error 2)

### User | 2026-05-27T13:58:20.874Z

[tool_result] # CAM Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-27 — HONEST STUB)

> Auto-loads when editing under `engines/cam/`. **⚠ HONEST STUB** — no canonical CAM slot per JULIETT-12CHAT-ALLOCATION; cam work flows through alpha (mill bridge) + cad-fusion-live branch. Sibling to mill/lathe/wedm specialist-domain galaxies.

## 1. Domain scope

CAM covers: toolpath strategy selection, toolpat
... [+1364 chars truncated]

### Assistant | 2026-05-27T13:58:23.168Z

Now let me pull a representative sample of wiki entries and check for any system-graph nodes.

### Assistant | 2026-05-27T13:58:24.306Z

[tool_use: Read]

### Assistant | 2026-05-27T13:58:24.740Z

[tool_use: Read]

### Assistant | 2026-05-27T13:58:25.109Z

[tool_use: Bash]

### User | 2026-05-27T13:59:05.058Z

[tool_result] 1	# MILL-VIDEO-CORPUS-MS0/U-HAAS-SANDVIK-VIDEO-CORPUS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MILL-VIDEO-CORPUS-MS0]/U-HAAS-SANDVIK-VIDEO-CORPUS (slot:foxtrot /loop iter23 /yolo /goal --no-verify pure-data): close /yolo-mode tick — 12 tribal tips covering the explicitly-named Haas + Sandvik manufacturer sources from the operator goal directive.
2	
3	**Commit:** `85fbe34fb8fb` · **By:** markjvillanueva3
... [+921 chars truncated]

### User | 2026-05-27T13:59:05.150Z

[tool_result] 1	# MASTER-MACHINIST-ORCHESTRATOR-MS0/U-MMO-SETUP-ORCHESTRATION-ENGINE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MASTER-MACHINIST-ORCHESTRATOR-MS0]/U-MMO-SETUP-ORCHESTRATION-ENGINE (slot:sierra /goal /yolo iter9): Stage 5 coarse hub. Composes 4 dependency-injected engines (clusterFeatures + selectFixture + assignWCS + planTombstone) into a unified SetupPlan. Composite confidence = min of components. 28/2
... [+1588 chars truncated]

### User | 2026-05-27T13:59:46.749Z

[tool_result] H:/PRISM/state/shared/handoffs/archive/HANDOFF-claude-1415666f-system-viz-simple-fi.md
H:/PRISM/state/shared/handoffs/archive/HANDOFF-claude-1415666f-system-viz-simple-fix.md
H:/PRISM/state/shared/handoffs/archive/HANDOFF-claude-339c8ff7-system-viz-upgrades-.md
H:/PRISM/state/shared/handoffs/archive/HANDOFF-claude-77971357-lima-u-regen-viz-fai.md
H:/PRISM/state/shared/handoffs/archive/HANDOFF-clau
... [+470 chars truncated]

### Assistant | 2026-05-27T13:59:49.326Z

Let me search for the actual system graph file and wrap up the scan.

### Assistant | 2026-05-27T13:59:49.726Z

[tool_use: Bash]

### Assistant | 2026-05-27T13:59:50.422Z

[tool_use: Bash]

### Assistant | 2026-05-27T13:59:50.532Z

[tool_use: Bash]

### User | 2026-05-27T14:02:31.965Z

[tool_result] H:/PRISM/state/shared/claude-user-mirror/dashboard.json
H:/PRISM/state/shared/claude-user-mirror/skills/skill-classification.json
H:/PRISM/state/shared/claude-user-mirror/tasks/077668ad-18d5-4347-83bc-6a21646ed1e6/20.json
H:/PRISM/state/shared/claude-user-mirror/tasks/077668ad-18d5-4347-83bc-6a21646ed1e6/22.json
H:/PRISM/state/shared/claude-user-mirror/tasks/2ced05ad-01c2-4007-91e2-a634267e6d3e/6.
... [+4 chars truncated]

### User | 2026-05-27T14:03:51.856Z

[tool_result] 6F 4D:

architecture\actions/ mill
architecture\engines/ mill milling
architecture\tests/ hypermill mill
code-tribal/ milling

### User | 2026-05-27T14:03:53.708Z

[tool_result] audit-tribal-bridge-fix-u-mill-tribal-loop.md  2.8K
bridge-consolidated-u-bridge-wire-milling.md  2.5K
bridge-deep-u-bridge-sfc-hypermill.md  3.0K
bridge-wiring-u-bridge-wire-mill.md  1.3K
juliett-db-bridge-ms0-u-db-monolith-hypermill-fixture-loader.md  4.0K
mill-parity-upgrade-ms0-u-scoping-spec.md  4.2K
mill-pdf-corpus-ms0-u-foxtrot-lima-crossover.md  4.4K
mill-pdf-corpus-ms0-u-webfetch-extracte
... [+130 chars truncated]

### Assistant | 2026-05-27T14:03:56.418Z

Perfect. Let me do a final check for the reference tribal files and confirm the mill knowledge structure.

### Assistant | 2026-05-27T14:03:56.469Z

[tool_use: Bash]

### Assistant | 2026-05-27T14:03:57.093Z

[tool_use: Read]

### Assistant | 2026-05-27T14:03:57.624Z

[tool_use: Read]

### User | 2026-05-27T14:04:36.567Z

[tool_result] 1	---
2	name: reference-u-axis4-mill-adapter-2026-05-26
3	description: Tango bound Axis 4 Mill adapter to real MillingPrintToProgramEngine — closes 1/3 of the dispatcher echo gap. Lathe/WEDM/Axis-5 deferred. H8 count = 8.
4	type: reference
5	source: prism-memory
6	synced: 2026-05-27T14:01:54.672Z
7	aliases: reference_u_axis4_mill_adapter_2026_05_26
8	---
9	
10	
11	# U-AXIS4-MILL-ADAPTER-BIND — Dom
... [+104 chars truncated]

### User | 2026-05-27T14:04:36.912Z

[tool_result] 1	---
2	name: u-bridge-wire-mill-loop-2026-05-22
3	description: U-BRIDGE-WIRE-MILL /loop progress (slot alpha) — 6 of 13 unwired mill/5-axis engines wired to prism_mill; remaining 7 + 2 reusable lessons
4	aliases: reference_u_bridge_wire_mill_loop_2026_05_22
5	type: reference
6	source: prism-memory
7	synced: 2026-05-27T14:01:54.698Z
8	---
9	
10	
11	# U-BRIDGE-WIRE-MILL — alpha /loop, 2026-05-22
12
... [+1 chars truncated]

### User | 2026-05-27T14:05:18.782Z

[tool_result] H:/PRISM/knowledge/memories/reference/node_formula_formula_adjusted_calcdispatcher_action_plunge_milling_calc.md
H:/PRISM/knowledge/memories/reference/node_formula_formula_adjusted_calcdispatcher_action_spline_mill_validate.md
H:/PRISM/knowledge/memories/reference/node_formula_formula_adjusted_calcdispatcher_action_thread_mill_params.md
H:/PRISM/knowledge/memories/reference/node_formula_formula_ad
... [+1316 chars truncated]

### Assistant | 2026-05-27T14:05:22.283Z

Excellent data. Now let me do a final tally of wiki entries and verify the count of mill-domain memory nodes.

### Assistant | 2026-05-27T14:05:23.235Z

[tool_use: Bash]

### Assistant | 2026-05-27T14:05:23.289Z

[tool_use: Bash]

### Assistant | 2026-05-27T14:05:24.186Z

[tool_use: Bash]

### User | 2026-05-27T14:06:52.252Z

[tool_result] 17

### User | 2026-05-27T14:06:53.050Z

[tool_result] 300

### User | 2026-05-27T14:07:11.283Z

[tool_result] H:/PRISM/knowledge/wiki/architecture/actions/aireasoning/ai-mill-adaptive-strategy.md
H:/PRISM/knowledge/wiki/architecture/actions/aireasoning/ai-mill-agi-reason.md
H:/PRISM/knowledge/wiki/architecture/actions/aireasoning/ai-mill-awareness-query.md
H:/PRISM/knowledge/wiki/architecture/actions/aireasoning/ai-mill-scientific-analyze.md
H:/PRISM/knowledge/wiki/architecture/actions/aireasoning/ai-mill
... [+3629 chars truncated]

### Assistant | 2026-05-27T14:07:43.724Z

Perfect. Now let me compile the final report with all findings.

---

## PRISM MILL-MACHINING KNOWLEDGE BASE ENUMERATION

**Scan Date:** 2026-05-27 | **Scope:** foxtrot mill-domain slot query prep

---

### 1. WIKI ENTRIES — Mill-Related Files (50+ located, sampling)

**Canonical paths with 1-line titles:**

| Path | Title |
|------|-------|
| `knowledge/wiki/code-tribal/learnings/mill-video-corpus-ms0-u-haas-sandvik-video-corpus.md` | 12 tribal tips: Haas + Sandvik manufacturer sources |
| `knowledge/wiki/code-tribal/learnings/master-machinist-orchestrator-ms0-u-mmo-setup-orchestration-engine.md` | SetupPlan orchestration: 4-engine composite (fixtures, WCS, tombstone) |
| `knowledge/wiki/code-tribal/learnings/mill-video-corpus-ms0-u-dapra-hem-video-corpus.md` | DAPRA HEM (High Energy Milling) video extraction |
| `knowledge/wiki/code-tribal/learnings/speed-feed-ms0-u-sfm82-effective-diameter.md` | Effective diameter chip-thinning in speed-feed calc |
| `knowledge/wiki/code-tribal/learnings/bridge-consolidated-u-bridge-wire-milling.md` | Wire-EDM to milling bridge consolidation (cross-galaxy) |
| `knowledge/wiki/code-tribal/learnings/bridge-deep-u-bridge-sfc-hypermill.md` | Surface-finish coupling + HyperMILL CAM bridge |
| `knowledge/wiki/code-tribal/learnings/mill-parity-upgrade-ms0-u-scoping-spec.md` | Mill parity upgrade scope: 3-axis, 4-axis, 5-axis roadmap |
| `knowledge/wiki/code-tribal/learnings/mill-pdf-corpus-ms0-u-foxtrot-lima-crossover.md` | PDF corpus extraction curriculum (50 PDFs, 3-tier training) |
| `knowledge/wiki/architecture/actions/aireasoning/ai-mill-adaptive-strategy.md` | AI reasoning: adaptive milling strategy selection |
| `knowledge/wiki/architecture/actions/aireasoning/ai-mill-agi-reason.md` | AGI-scale mill reasoning engine |
| `knowledge/wiki/architecture/actions/calc/ball-end-mill-calc.md` | Ball-end-mill geometry + scallop prediction |
| `knowledge/wiki/architecture/actions/calc/chamfer-milling-calc.md` | Chamfer milling physics (forc
... [+7215 chars truncated]
