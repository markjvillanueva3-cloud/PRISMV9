---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "You are distilling slot:sierra / system-viz knowledge (PRISM, H:/prism) to find "
date: "2026-05-29"
first_ts: "2026-05-29T15:10:59.396Z"
last_ts: "2026-05-29T15:19:50.157Z"
cwd: "H:\\prism-slot-sierra"
messages: 78
user_msgs: 34
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-aa9b737bc75bc7d83.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# You are distilling slot:sierra / system-viz knowledge (PRISM, H:/prism) to find 

> **claude-code-cli** | 2026-05-29 | 78 msgs (34 user / 44 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/agent-aa9b737bc75bc7d83.jsonl`

## Transcript

### User | 2026-05-29T15:10:59.396Z

You are distilling slot:sierra / system-viz knowledge (PRISM, H:/prism) to find GAP learnings worth NEW memories + material for a domain GSD (operating-protocol) doc. READ-ONLY. MCP :3100 is DOWN — use Read/Grep/Bash, NOT prism_* tools.

Tasks:
1. Inventory sierra/system-viz memories: `ls C:/Users/wompu/.claude/projects/H--prism/memory/ | grep -iE 'system.viz|viz|regen|graph|psn|sierra|master.index|nn.graph'` . Read the ~12 most relevant (prefer reference_system_viz_*, reference_psn_*, reference_regen_*, reference_sierra_*, reference_nn_graph_*). One-line essence each.
2. Read domain docs (use Read with offset/limit on big ones): H:/prism/knowledge/wiki/architecture/system-viz.md ; H:/prism/state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md (if it exists) ; H:/prism/state/shared/system-viz/EXECUTIVE-BRIEFING.md (offset 0 limit 60) ; H:/prism/state/shared/system-viz/WIKI-DEBT-WORKLIST.md (offset 0 limit 40).

The galaxy MEMORY.md (H:/prism/mcp-server/src/engines/system-viz/MEMORY.md) ALREADY captures these — do NOT re-propose them: one-writer-per-path, FAST[]+splice dual-registration, OOM exit134 (parse/stringify), viz-first-search (Glob timeout), split-out-file (architecture-graph.json), regen-pipeline-stages, graph-writers-history, graph-IS-fleet-search-substrate, PSN-legs-mapping.

Return (TIGHT bullets, evidence-cited, under ~350 lines):
- (a) 3-6 DISTINCT cross-session learnings NOT in that list — gap memories worth writing (each: 1-line claim + why + source).
- (b) The canonical OPERATING PROTOCOL for the system-viz domain as ordered steps, for a GSD runbook: how to (i) regen the graph safely, (ii) add a ghost roost, (iii) verify graph health, (iv) recover from a failed/OOM regen, (v) search via the graph. Cite the exact scripts/commands.
- (c) Any domain gotcha not yet documented anywhere.

CONSTRAINTS: never recursive-Glob H:/prism (times out); never parse system-graph.json (OOM).

### Assistant | 2026-05-29T15:11:08.568Z

I'll systematically inventory the sierra/system-viz memories, read the domain docs, and extract gap learnings and the operating protocol.

### Assistant | 2026-05-29T15:11:09.212Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:11:09.425Z

[tool_use: Read]

### Assistant | 2026-05-29T15:11:09.746Z

[tool_use: Bash]

### User | 2026-05-29T15:11:13.875Z

[tool_result] 1	---
2	type: architecture
3	created: 2026-05-08
4	tags: [visualization, dev-tools, system-map, neural-network, three-js, observability]
5	related: [build-state, dispatcher-digest, engine-digest]
6	---
7	
8	# System Viz — PRISM Live System Map
9	
10	## Summary
11	
12	Interactive 3D visualization of the entire PRISM platform as a 10-layer neural network. Every layer from user personas down to files
... [+3425 chars truncated]

### User | 2026-05-29T15:11:32.630Z

[tool_result] .memory-compact.stamp  20B
MEMORY-ARCHIVE.md  35.2K
MEMORY-ARCHIVE.md.cmptmp-21284-1779144772436  17.4K
MEMORY-ARCHIVE.md.cmptmp-56452-1779153514291  24.6K
MEMORY.md  21.3K
MEMORY.md.cmptmp-45396-1779154766892  19.1K
feedback_ai_training_first_before_revenue.md  3.0K
feedback_all_slots_free_access.md  2.1K
feedback_alpha_ollama_offline_degradation.md  1.0K
feedback_alpha_owns_reaper.md  3.6K
feedb
... [+1887 chars truncated]

### User | 2026-05-29T15:13:27.786Z

[tool_result] system-viz/
PRISM-SYSTEM-VIZ-DIRECTIVE.md  8.2K
SYSTEM-VIZ-AWARENESS.md  1.6K
SYSTEM-VIZ-WIKI-BRAIN-STATUS.md  13.9K
SYSTEM_VIZ_LIVEDIFF.json  14.1K
SYSTEM_VIZ_LIVEDIFF.md  3.4K
system-viz-action-counts.json  232.0K
system-viz-dead-pixels-2026-05-20.json  85.2K
system-viz-dead-pixels-2026-05-20.md  5.0K
system-viz-headline-history.jsonl  263B

### Assistant | 2026-05-29T15:13:32.410Z

Now let me read the key domain docs and memory files:

### Assistant | 2026-05-29T15:13:32.419Z

[tool_use: Read]

### Assistant | 2026-05-29T15:13:33.092Z

[tool_use: Read]

### Assistant | 2026-05-29T15:13:33.099Z

[tool_use: Read]

### Assistant | 2026-05-29T15:13:33.103Z

[tool_use: Read]

### User | 2026-05-29T15:13:41.774Z

[tool_result] 1	# PRISM System-Viz Directive
2	
3	> **Authoritative rule set for using the Live System Map in planning, roadmapping, and execution.**
4	> Authored 2026-05-08. Owner: viz at `H:/prism/state/shared/system-viz/`.
5	
6	## What
7	
8	`system-viz` is the **canonical live system map** of PRISM — 10 layers, 334 nodes, 627 edges, generated from real filesystem + `BUILD_STATE.json` state. It supersedes:
9	
... [+8349 chars truncated]

### User | 2026-05-29T15:13:41.802Z

[tool_result] 1	# SIERRA Galaxy Memory — System-Viz Upgrades, Integration & Utilization
2	
3	Cross-session working brain for the **sierra** slot (position 17 of 26 NATO). Append-only; older entries collapse to `state/shared/MEMORY-RECENT.md` per the central `MEMORY.md` size discipline.
4	
5	## Master-brain link
6	> Galaxy brain for domain **system-viz**. Cloned + fine-tuned from `state/shared/specs/MASTER-BRAIN
... [+7204 chars truncated]

### User | 2026-05-29T15:13:41.921Z

[tool_result] 1	# PRISM — Executive Briefing
2	
3	> **For the reviewing Claude account (project-owner audit).** This is the authoritative entry point. Read it top-to-bottom *before* drawing any conclusion about PRISM. It is auto-generated from on-disk artifacts — every number below traces to a file named in the source line. If you are tempted to call this "a science project with no direction", the §Audit Protoc
... [+5500 chars truncated]

### User | 2026-05-29T15:13:41.959Z

[tool_result] 1	# Wiki-Debt Worklist — documentation backlog for the system-viz brain
2	
3	> Auto-generated 2026-05-28T15:49:22.112Z by `scripts/generate-wiki-debt-worklist.mjs` (regenerated in the `/system-viz` build pass). Companion to the brain viewer's 📚 docs-coverage overlay (`D` key) — that overlay shows *where* the debt is; this is *what to do about it*, ranked. Pop the top item, run `/wiki-ingest <name>
... [+3660 chars truncated]

### Assistant | 2026-05-29T15:13:45.902Z

Now let me check the memory files more systematically and read the generator scripts:

### Assistant | 2026-05-29T15:13:46.646Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:13:47.026Z

[tool_use: Read]

### User | 2026-05-29T15:13:51.891Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
4	 *
5	 * Layers (top→bottom):
6	 *   L0 Personas        — 5 user roles
7	 *   L1 Frontend        — 144 web pages clustered into functional groups + CLIs
8	 *   L2 Transport       — MCP / REST / gRPC / GraphQL / WS / auth / rate / telemetry
9	 *   L3 AI Hierarchy    — Tier-1 Claude / Tier-2 coordinator
... [+3873 chars truncated]

### User | 2026-05-29T15:13:56.877Z

[tool_result] reference_3tier_ai_xproc_actual_2026_05_19.md  4.5K
reference_ab_locator_over_pairing_human_revisions_2026_05_27.md  6.4K
reference_academy_frontend_gap_2026_05_25.md  4.2K
reference_academy_hub_drilldown_2026_05_27.md  4.6K
reference_academy_hub_ux_overhaul_2026_05_27.md  5.8K
reference_acp_ms6_closeout_2026_05_23.md  6.1K
reference_ahmad_osman_llm_curriculum_2026_05_25.md  7.1K
reference_ai_wire
... [+636 chars truncated]

### Assistant | 2026-05-29T15:13:59.103Z

Let me continue reading the memory files and regen-viz script to understand the full operating protocol:

### Assistant | 2026-05-29T15:13:59.983Z

[tool_use: Read]

### Assistant | 2026-05-29T15:14:00.388Z

[tool_use: Read]

### Assistant | 2026-05-29T15:14:00.626Z

[tool_use: Read]

### Assistant | 2026-05-29T15:14:01.015Z

[tool_use: Bash]

### User | 2026-05-29T15:14:12.148Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-sierra.

### User | 2026-05-29T15:14:12.150Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-sierra.

### User | 2026-05-29T15:14:17.771Z

[tool_result] 1	---
2	name: reference_sierra_galaxy_buildout_2026_05_29
3	description: Sierra (system-viz) galaxy completed + owned 2026-05-29 — what shipped, where it lives, deferred items.
4	metadata:
5	  type: reference
6	---
7	
8	**Sierra galaxy buildout (slot:sierra claude-109ba448, 2026-05-29) — U-PSGB-SIERRA.**
9	
10	Galaxy = `mcp-server/src/engines/system-viz/`. Alpha (claude-168624b9) scaffolded a doct
... [+1481 chars truncated]

### User | 2026-05-29T15:14:26.325Z

[tool_result] reference_sierra_fast_splice_dual_registration.md  1.3K
reference_sierra_galaxy_buildout_2026_05_29.md  1.8K
reference_sierra_graph_oom_classes.md  1.4K
reference_sierra_graph_writers_history.md  1.4K
reference_sierra_one_writer_per_path.md  1.2K
reference_sierra_psn_legs_for_system_viz.md  1.7K
reference_sierra_regen_pipeline_stages.md  1.4K
reference_sierra_split_out_file.md  1.3K
reference_sier
... [+28 chars truncated]

### Assistant | 2026-05-29T15:14:28.578Z

Let me read these sierra memory files directly:

### Assistant | 2026-05-29T15:14:29.706Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:14:30.434Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:14:30.444Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:14:30.452Z

[tool_use: Bash]

### User | 2026-05-29T15:14:42.918Z

[tool_result] ---
name: reference_sierra_one_writer_per_path
description: system-graph.json has exactly ONE canonical writer (regen-viz.mjs) — concurrent writers silently clobber.
metadata:
  type: reference
---

**One-writer-per-path doctrine (system-viz).** `state/shared/system-viz/system-graph.json` (370-575MB merged, ~244K nodes) has exactly ONE canonical writer: `scripts/regen-viz.mjs`. Historically THREE 
... [+809 chars truncated]

### User | 2026-05-29T15:14:45.506Z

[tool_result] ---
name: reference_sierra_regen_pipeline_stages
description: regen-viz.mjs stage order — FAST[] generators → merge-augmentations → repair → dedup → reparent → parent-edges → seed-ghost → drift-gate.
metadata:
  type: reference
---

**regen-viz.mjs pipeline stage order (system-viz).** The master regenerator runs (roughly): (1) FAST[] generator stages (each `generate-*-features.mjs` emits an augmen
... [+978 chars truncated]

### User | 2026-05-29T15:14:48.207Z

[tool_result] ---
name: reference_sierra_graph_oom_classes
description: The 548MB system-graph OOM family (exit 134) — JSON.parse and JSON.stringify(null,2) both blow V8 limits.
metadata:
  type: reference
---

**system-graph.json OOM failure family (exit 134).** The merged graph is 370-575MB. Two distinct OOM classes:
1. **Read-side:** `JSON.parse(readFileSync(...))` of the 548MB graph exceeds V8 heap → crash.
... [+1058 chars truncated]

### User | 2026-05-29T15:14:48.772Z

[tool_result] ---
name: reference_sierra_split_out_file
description: generate-system-viz.mjs writes architecture-graph.json (53MB), NOT the merged system-graph.json — the U-VIZ-SPLIT-OUT-FILE fix.
metadata:
  type: reference
---

**Two graph products, two files (U-VIZ-SPLIT-OUT-FILE).** PRISM has TWO distinct graphs:
- `state/shared/system-viz/system-graph.json` (370-575MB, ~244K nodes) — the MERGED filesystem-
... [+889 chars truncated]

### Assistant | 2026-05-29T15:14:54.635Z

Now let me read more sierra memories and check the regen-viz script for the operating protocol:

### Assistant | 2026-05-29T15:14:55.383Z

[tool_use: Read]

### Assistant | 2026-05-29T15:14:55.631Z

[tool_use: Read]

### Assistant | 2026-05-29T15:14:55.856Z

[tool_use: Read]

### Assistant | 2026-05-29T15:14:56.103Z

[tool_use: Read]

### User | 2026-05-29T15:15:04.753Z

[tool_result] 1	---
2	name: reference_sierra_viz_first_search
3	description: Use system-viz-query (or master_index_query) before Grep/Glob — recursive Glob TIMES OUT on the huge tree.
4	metadata:
5	  type: reference
6	---
7	
8	**Viz-first search for the H:/prism tree.** A recursive `**` Glob over `H:/prism` TIMES OUT (verified 2026-05-29 — the 548MB graph + 555MB `_node-embeddings.jsonl.partial` + 13K uncommitt
... [+747 chars truncated]

### User | 2026-05-29T15:15:04.756Z

[tool_result] 1	---
2	name: reference_sierra_graph_writers_history
3	description: The 3-writer race on system-graph.json and how each was resolved (split-out, lock, single-canonical).
4	metadata:
5	  type: reference
6	---
7	
8	**system-graph.json writer history (system-viz).** Three scripts historically wrote the same path → silent clobber:
9	- `generate-system-viz.mjs` — architecture-only graph. **Resolved:** 
... [+1019 chars truncated]

### User | 2026-05-29T15:15:04.758Z

[tool_result] 1	---
2	name: reference_sierra_fast_splice_dual_registration
3	description: Every ghost-roost generator needs BOTH regen-viz FAST[] AND merge-augmentations splice — both or neither.
4	metadata:
5	  type: reference
6	---
7	
8	**Dual-registration rule for ghost-roost generators (system-viz).** There are ~48 `scripts/generate-*-features.mjs` generators (priority-queue, misc-tasks, bridge-synergy, fea
... [+942 chars truncated]

### User | 2026-05-29T15:15:04.760Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+7776 chars truncated]

### Assistant | 2026-05-29T15:15:08.008Z

[tool_use: Read]

### Assistant | 2026-05-29T15:15:07.736Z

Now let me read the rest of regen-viz to understand the full protocol and check for ghost-roost docs:

### Assistant | 2026-05-29T15:15:09.337Z

[tool_use: Read]

### Assistant | 2026-05-29T15:15:09.135Z

[tool_use: Bash]

### User | 2026-05-29T15:15:18.709Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-sierra.

### User | 2026-05-29T15:15:20.631Z

[tool_result] 150	  "generate-skills-atomic.mjs",
151	  "generate-schemas-atomic.mjs",
152	  "generate-algorithms-atomic.mjs",
153	  "generate-transport-expand.mjs",
154	  "generate-ai-tier-expand.mjs",
155	  "generate-actions-atomic.mjs",
156	  "generate-hooks-atomic.mjs",
157	  "generate-tests-atomic.mjs",
158	  "generate-scripts-atomic.mjs",
159	  "generate-scripts-lib-atomic.mjs",
160	  "generate-milestone-
... [+10028 chars truncated]

### User | 2026-05-29T15:15:48.451Z

[tool_result] H:/prism/knowledge/wiki/architecture/system-viz-add-node.md
H:/prism/knowledge/wiki/architecture/system-viz-dead-pixel-sweep.md
H:/prism/knowledge/wiki/architecture/system-viz-dsl-ms0.md
H:/prism/knowledge/wiki/architecture/system-viz-first-audit.md
H:/prism/knowledge/wiki/architecture/system-viz-fs-coverage-ms1.md
H:/prism/knowledge/wiki/architecture/system-viz-fs-coverage.md
H:/prism/knowledge/w
... [+230 chars truncated]

### Assistant | 2026-05-29T15:15:51.715Z

Let me read the key wiki files for operating protocol:

### Assistant | 2026-05-29T15:15:52.353Z

[tool_use: Read]

### Assistant | 2026-05-29T15:15:52.357Z

[tool_use: Read]

### Assistant | 2026-05-29T15:15:52.360Z

[tool_use: Read]

### User | 2026-05-29T15:16:24.778Z

[tool_result] 1	---
2	title: system-viz-add-node (atomic single-node append)
3	type: architecture
4	tags: [system-viz, graph, atomic-write, write-lock, sierra]
5	status: active
6	maintainer: sierra
7	created: 2026-05-29
8	---
9	
10	# system-viz-add-node — atomic single-node append
11	
12	`scripts/system-viz-add-node.mjs` adds ONE node to the merged `system-graph.json` without a full `regen-viz` pass. It is the 
... [+1019 chars truncated]

### User | 2026-05-29T15:16:24.781Z

[tool_result] 1	---
2	title: System-Viz Galaxy (sierra)
3	type: architecture
4	tags: [system-viz, graph, regen-viz, ghost-roost, master-index, sierra, galaxy]
5	status: active
6	maintainer: sierra
7	created: 2026-05-29
8	---
9	
10	# System-Viz Galaxy
11	
12	Slot **sierra** owns system-viz upgrades, integration & utilization. Galaxy dir: `mcp-server/src/engines/system-viz/` (CLAUDE.md + MEMORY.md + PATHS.md + TO
... [+2427 chars truncated]

### User | 2026-05-29T15:16:24.783Z

[tool_result] 1	---
2	title: System-viz-first audit doctrine
3	kind: architecture
4	tags: [doctrine, audit, system-viz, discoverability, master-index]
5	related: [[audit-viz-first-skill]] [[master-index-surface]] [[awareness-stack]]
6	last_updated: 2026-05-15
7	---
8	
9	# System-viz-first audit doctrine
10	
11	> **The rule:** Before any cross-cutting discovery question — "does X exist", "where is X wired", "is 
... [+6199 chars truncated]

### Assistant | 2026-05-29T15:16:26.734Z

Now let me read the remaining sierra memory files and check for existing GSD protocols:

### Assistant | 2026-05-29T15:16:27.601Z

[tool_use: Read]

### Assistant | 2026-05-29T15:16:28.208Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:16:28.424Z

[tool_use: Read]

### User | 2026-05-29T15:16:44.905Z

[tool_result] 1	---
2	name: system-viz-dead-pixel-sweep
3	description: G4 from SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 — detect edges pointing at absent node ids; finds referenced-but-missing assets + generator naming bugs.
4	type: architecture
5	status: shipped
6	shipped_at: 2026-05-20
7	slot: sierra
8	commit_scope: SYSTEM-VIZ-HIGH-ROI-MS0
9	unit_ids:
10	  - U-VIZ-G4-DEAD-PIXEL-SWEEP
11	related:
12	  - "[[system-
... [+2396 chars truncated]

### User | 2026-05-29T15:16:45.035Z

[tool_result] 1	---
2	name: reference_sierra_psn_legs_for_system_viz
3	description: How the system-viz galaxy satisfies each of the 11 PSN legs (sierra owns leg #6 System Viz; bridges to NN/GNN, AI, memory).
4	metadata:
5	  type: reference
6	---
7	
8	**system-viz × the 11 PSN legs (per [[feedback_psn_definition]]).** Sierra's galaxy maps to PSN as:
9	1. **Obsidian brain** — `*_sierra_*.md` memories (≥10, this b
... [+1400 chars truncated]

### User | 2026-05-29T15:18:30.088Z

[tool_result] envelope-drift-close-out-pattern.md  9.6K
frontend-merge-bridge-pattern.md  7.9K
partial-milestone-drift.md  4.3K
regen-viz-merge-guard.md  1.8K
silent-close-out-drift.md  3.5K
u-cleanup-b9-conformal-drift-gate.md  3.7K

### Assistant | 2026-05-29T15:18:33.246Z

Now I have enough information. Let me compile the distilled findings. Let me mark the task in progress and create the report:

### Assistant | 2026-05-29T15:18:33.825Z

[tool_use: TaskUpdate]

### Assistant | 2026-05-29T15:18:33.942Z

[tool_use: Read]

### Assistant | 2026-05-29T15:18:34.652Z

[tool_use: Read]

### User | 2026-05-29T15:18:37.628Z

[tool_result] Updated task #14 activeForm, status

### User | 2026-05-29T15:18:44.543Z

[tool_result] 1	---
2	title: regen-viz-merge-guard (fail-loud merge gate)
3	type: architecture
4	tags: [system-viz, regen-viz, merge-augmentations, fail-loud, R12, sierra]
5	status: active
6	maintainer: sierra
7	created: 2026-05-29
8	---
9	
10	# regen-viz-merge-guard — fail-loud merge gate
11	
12	`scripts/lib/regen-viz-merge-guard.mjs` is the safety gate that prevents `regen-viz.mjs` from continuing past a fail
... [+1521 chars truncated]

### User | 2026-05-29T15:18:45.313Z

[tool_result] 1	---
2	name: feedback_sierra_graph_correctness_is_fleet_search
3	description: A sierra system-graph mistake is a fleet-wide search outage — the graph is the substrate every slot's master-index/awareness/pre-*-graph hooks query.
4	metadata:
5	  type: feedback
6	---
7	
8	**Standing rule (sierra):** the system-graph is not just a visualization — it is the SEARCH SUBSTRATE the whole fleet reads. `mas
... [+932 chars truncated]

### Assistant | 2026-05-29T15:19:50.157Z

Perfect. Now I have all the information needed. Let me compile the final distilled report:

---

## SIERRA / SYSTEM-VIZ DISTILLATION REPORT

**Scope:** Cross-session learnings NOT in the galaxy MEMORY.md + canonical operating protocol + undocumented gotchas.  
**Sources:** Memory inventory, domain docs (PRISM-SYSTEM-VIZ-DIRECTIVE.md, EXECUTIVE-BRIEFING.md, regen-viz.mjs, wiki architecture pages, sierra memory files).

---

### (A) THREE DISTINCT GAP-MEMORIES (not yet in galaxy MEMORY.md)

**1. Graph-correctness is fleet-critical (NOT just a viz)**  
   - **Claim:** A sierra system-graph corruption silently degrades search for all 26 slots (master-index, awareness-inject, pre-*-graph-inject, audit-viz-first all read it) — degraded search rarely errors, just returns worse hits.  
   - **Why important:** The blast radius is silent and fleet-wide; a clobbered/stale graph can run undetected for hours.  
   - **Source:** `feedback_sierra_graph_correctness_is_fleet_search.md` + regen-viz.mjs abort-chain (lines 268–273).  
   - **Action:** New memory: `reference_sierra_graph_is_fleet_search_substrate`

**2. Post-merge repair-chain CANNOT run after a failed merge**  
   - **Claim:** If merge-augmentations.mjs OOM-kills (exit 134, V8 string-length cap), regen-viz.mjs MUST abort before post-merge stages (repair, dedup, reparent, etc.) — they read the stale pre-merge graph, publish stale briefing/worklist, then drift-gate falsely certifies "clean" (stale ≠ truncated = Karpathy R12 silent corruption).  
   - **Why important:** This is THE load-bearing safety gate for a 548 MB graph that routinely hits V8 limits.  
   - **Source:** regen-viz-merge-guard.md + regen-viz.mjs lines 267–276 (`guard.abort` check before post-merge stages).  
   - **Action:** Document in a new memory: `reference_sierra_merge_fail_abort_mandatory`

**3. Ghost-roost dual-registration is silent-discard-prone**  
   - **Claim:** A roost generator registered in FAST[] but NOT in merge-augmentations.mjs splice
... [+11636 chars truncated]
