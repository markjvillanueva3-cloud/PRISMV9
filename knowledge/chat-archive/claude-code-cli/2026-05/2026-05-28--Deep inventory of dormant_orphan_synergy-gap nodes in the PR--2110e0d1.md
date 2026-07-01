---
type: "chat-session"
source: "claude-code-cli"
session_id: "2110e0d1-ac1f-486d-bd9a-2b96ca892a29"
title: "Deep inventory of dormant/orphan/synergy-gap nodes in the PRISM system that woul"
date: "2026-05-28"
first_ts: "2026-05-28T02:45:06.197Z"
last_ts: "2026-05-28T02:47:42.998Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 12
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/2110e0d1-ac1f-486d-bd9a-2b96ca892a29/subagents/agent-a7c60e8909b451d50.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Deep inventory of dormant/orphan/synergy-gap nodes in the PRISM system that woul

> **claude-code-cli** | 2026-05-28 | 26 msgs (12 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2110e0d1-ac1f-486d-bd9a-2b96ca892a29/subagents/agent-a7c60e8909b451d50.jsonl`

## Transcript

### User | 2026-05-28T02:45:06.197Z

Deep inventory of dormant/orphan/synergy-gap nodes in the PRISM system that would unlock ERP completeness. The operator wants to know what's sitting around UNWIRED, UNDERUSED, or UNCONNECTED that we could activate.

Background: PRISM has ~593 unwired engines on disk (per system-reminder counts), ~3029 pending roadmap units across 110 milestones, and ~9314 orphan graph nodes per the awareness snapshot. Most of these are NOT ERP, but a meaningful subset are — and many cross-domain engines (academy/training, intelligence/AI, post-processor, CAM) have ERP-adjacent surfaces.

Tools to use (read-only):
1. `node H:/prism/scripts/system-viz-query.mjs find "<query>"` — try: ghost.orphan, ghost.underused, ghost.misc_tasks, ghost.bridge_synergy, ghost.priority, bridge, synergy, unwired-engine
2. `H:/prism/state/shared/AWARENESS-SNAPSHOT.md` and `H:/prism/state/shared/PRISM-INVENTORY-LATEST.md` — top-level health metrics
3. `H:/prism/state/shared/specs/ROADMAP-CONSOLIDATED.md` and `MISC-TASKS-INVENTORY.md` — already-consolidated remaining-work catalogs
4. `H:/prism/state/shared/system-viz/system-graph-index.json` for the graph index (lighter than the full graph)
5. `H:/prism/PRISM-INVENTORY-LATEST.md` for live counts
6. `H:/prism/state/shared/BUILD_STATE.md` for envelope drift + top unwired domains

Sections to produce (≤700 words):
1. **Top-20 ERP-adjacent dormant engines** (any layer): engine name + 1-line purpose + reason it's dormant (no dispatcher import / no test / no caller / stale claim) + simplest path to activate. Pull from `ghost.unwired.*`, `ghost.orphan.*`, `ghost.underused.*` filtered to ERP-domain.
2. **Bridge/synergy units that aren't built**: from `ROADMAP-CONSOLIDATED.md` and `ghost.bridge_synergy.*` and roadmap-tool-plans.json — the 42 bridge units (26 wiring + 16 deep-integration) referenced by the slot-context bundle. List the ERP-adjacent ones with their proposed source→target connection.
3. **Cross-domain synergies missing**: places where ERP touches anot
... [+944 chars truncated]

### Assistant | 2026-05-28T02:45:16.529Z

I'll conduct a deep inventory of dormant/orphan/unwired nodes in the PRISM system, focusing on ERP-adjacent surfaces. Let me start by gathering data from the key sources.

### Assistant | 2026-05-28T02:45:16.761Z

[tool_use: Read]

### Assistant | 2026-05-28T02:45:16.979Z

[tool_use: Read]

### Assistant | 2026-05-28T02:45:17.186Z

[tool_use: Read]

### Assistant | 2026-05-28T02:45:17.395Z

[tool_use: Bash]

### User | 2026-05-28T02:45:20.106Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-28T02:45:21.092Z

[tool_result] 1	# PRISM Awareness Snapshot
2	
3	> Generated **2026-05-24T02:01:53.856Z** · graph mtime 2026-05-23T21:59:22.115Z
4	> One-shot session warmup: built/wired/utilized/drifted in 60 lines.
5	> Regenerate: `node scripts/awareness-snapshot.mjs` · or via `/awareness-snapshot` skill.
6	
7	## Headline (from BUILD_STATE)
8	- **2763** engines built · **1101** with wiki entry
9	- **593** engines on disk with 
... [+3993 chars truncated]

### User | 2026-05-28T02:45:21.279Z

[tool_result] 1	# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge
2	
3	> Generated: 2026-05-28T02:27:05.504Z
4	> Source: `scripts/build-state-snapshot.mjs` — read `BUILD_STATE.json` for the machine-queryable form.
5	
6	## At a glance
7	
8	- **3549** engines built and wired (of 3709)
9	- **1101** wiki entries indexed
10	- **160** engines awaiting dispatcher wiring
... [+26517 chars truncated]

### User | 2026-05-28T02:45:27.502Z

[tool_result] Found 0 node(s) matching "ghost.orphan":

### Assistant | 2026-05-28T02:45:31.382Z

Let me refine my search strategy using the master_index and focused queries to avoid large file reads.

### Assistant | 2026-05-28T02:45:31.753Z

[tool_use: Bash]

### Assistant | 2026-05-28T02:45:31.986Z

[tool_use: Bash]

### Assistant | 2026-05-28T02:45:32.135Z

[tool_use: Bash]

### User | 2026-05-28T02:45:37.197Z

[tool_result] Found 30 node(s) matching "unwired":
  L5/unwired  eng.other                    other
  L5/unwired  eng.lathe                    lathe
  L5/unwired  eng.hyper                    hyper
  L5/unwired  eng.cross                    cross
  L5/unwired  eng.tool                     tool
  L5/unwired  eng.post                     post
  L5/unwired  eng.machine                  machine
  L5/unwired  eng.fu
... [+1130 chars truncated]

### User | 2026-05-28T02:45:43.203Z

[tool_result] Found 30 node(s) matching "orphan":
  L9/worktrees  wt.archived.forge-orphans-2026-05-01.parked forge-orphans-2026-05-01
  L10/reference  vault.mem.reference.reference_bash_orphan_cleaner_wired_2026_05_16 reference_bash_orphan_cleaner...
  L10/reference  vault.mem.reference.reference_hook_orphan_validator reference_hook_orphan_validator
  L10/architecture  vault.wiki.architecture.actions.cadautoma
... [+2962 chars truncated]

### User | 2026-05-28T02:45:50.120Z

[tool_result] Found 30 node(s) matching "bridge":
  L3/tier3  ai.t3.cam                    T3: CAM AI
  L4/business  disp.bridgedispatcher        bridge
  L8/state  state.bridge                 state/bridge
  L9/prism  fs.fusion-bridge             H:/prism/fusion-bridge/
  L10/project  vault.mem.project.project_cad_bridge project_cad_bridge
  L10/_root  vault.mem.project_cad_bridge project_cad_bridge
  L10/refe
... [+2683 chars truncated]

### Assistant | 2026-05-28T02:45:52.458Z

Now let me search for ERP-specific orphan/unwired engines and check the ROADMAP and milestone data:

### Assistant | 2026-05-28T02:45:53.124Z

[tool_use: Bash]

### Assistant | 2026-05-28T02:45:53.331Z

[tool_use: Bash]

### Assistant | 2026-05-28T02:45:53.647Z

[tool_use: Read]

### User | 2026-05-28T02:46:02.026Z

[tool_result] Found 30 node(s) matching "erp":
  L1/pages  fe.pages.erp                 ERP Pages
  L10/project  vault.mem.project.project_wedm_erp_complete project_wedm_erp_complete
  L10/_root  vault.mem.project_wedm_erp_complete project_wedm_erp_complete
  L10/architecture  vault.wiki.architecture.actions.algorithm.interp-bezier interp-bezier
  L10/architecture  vault.wiki.architecture.actions.algorithm.inte
... [+2602 chars truncated]

### User | 2026-05-28T02:46:10.305Z

[tool_result] Found 30 node(s) matching "inventory":
  L6/core  core.scripts                 Scripts (224 → 14 buckets)
  L10/project  vault.mem.project.project_60gb_missing_inventory project_60gb_missing_inventory
  L10/_root  vault.mem.project_60gb_missing_inventory project_60gb_missing_inventory
  L10/reference  vault.mem.reference.reference_prism_inventory reference_prism_inventory
  L10/_root  vault.mem.re
... [+2644 chars truncated]

### User | 2026-05-28T02:46:13.790Z

[tool_result] 1	# PRISM ROADMAP — Consolidated Inventory
2	
3	> Generated 2026-05-26T18:12:02.922Z · schemaVersion 1.0.0 · **advisory, human-verify**
4	> Every roadmap unified: what is left to do + the bridge layer that synergizes the galaxy.
5	
6	## Headline
7	
8	- Milestones: **898** (359 with pending work)
9	- **Pending units (master remaining-work set): 2899**
10	- Prose-roadmap units extracted: 1133 · **un
... [+18001 chars truncated]

### User | 2026-05-28T02:47:19.739Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   Deep inventory of dormant/orphan/synergy-gap nodes in PRISM that would unlock ERP completeness. The operator wants to know what's sitting around UNWIRED, UNDERUSED, or UNCONNECTED that could be activated. Produce 5 sections: (1) Top-20 ERP-adjacent dormant engines, (2) Bridge/synergy units not built, (3) Cross-domain synergies missing, (4) Envelope drift (claimed vs real), (5) Wiki/tribal coverage gaps. Maximum 700 words. Read-only task—surface what's dormant, do not propose builds.

2. Key Technical Concepts:
   - Unwired engines: built but not connected to any dispatcher (160 total; 593 per older snapshot)
   - Orphan graph nodes: low in-degree + low out-degree, built but under-utilized (9314 nodes)
   - Ghost nodes: low in/out, not-built; dead-code/unrealized roadmap (980 nodes)
   - Bridge layer: 26 wiring units (836 engines) + 16 deep-integration units (cross-subsystem synergy)
   - Envelope drift: milestone status claimed ≠ git reality (191 cases identified)
   - ERP-domain milestones: track integration points with scheduling, quoting, cost engines
   - Wiki↔tribal coverage: 31.5% coverage (mentioned in user's context)

3. Files and Code Sections:
   - H:/prism/state/shared/AWARENESS-SNAPSHOT.md (80 lines)
     - Headline: 593 unwired engines, 2876 pending roadmap units, 190 envelope drift cases, 9314 orphan nodes
     - Top orphan engines: AISubsystem, Agent, Alarm, Base, CAMSystem, Database, Hook, MachineSpindleDefaults, PhysicsMapping, PostProcessor (all in-1/out-1 = isolated)
     - Ghost density by layer: L6=537, L8=312, L13=99, L10=16, L5=16
   - H:/prism/state/shared/BUILD_STATE.md (381+ lines)
     - NEEDS_WIRING breakdown: Other=26, Monolith=9, Speed=5, Sustain=3, Wet=3, Swiss=3, Creo=3, Quoting=3, Coating=2, Shop=2, Material=2, Tool=2, Asset=2, Embedding=2, 
... [+6183 chars truncated]

### Assistant | 2026-05-28T02:47:42.998Z

I'll continue producing the 5-section ERP dormancy inventory based on the data I've gathered.

---

## ERP DORMANCY INVENTORY — 5 SECTIONS (≤700 words)

### 1. Top-20 ERP-Adjacent Dormant Engines

| Engine | Purpose | Why Dormant | Activation Path |
|--------|---------|------------|-----------------|
| **OrderLifecycleEngine** | Job→order state machine (submit→approve→schedule→ship) | No dispatcher wiring; 3-state claim | Wire to `prism_business` dispatcher; add order_transition, order_get, order_list actions |
| **JobProfitabilityEngine** | Real cost vs quote margin tracking per job | Unwired, no test coverage | Create test suite; wire to `prism_business.job_profitability_*` actions |
| **ToolInventoryCostEngine** | Tool checkout/usage/reorder cost accrual | Orphan (in-1/out-1); no caller | Wire to `prism_business.tool_inventory_*` + cost rollup hooks |
| **ActualCostForecastEngine** | Machine hours + material + labor → ETA delivery cost | Pending in U-BRIDGE-ERP-QUOTE; not built | Build as L5 engine; integrate into quoting pipeline; add forecast_*_actual actions |
| **CapacityDynamicLoadEngine** | Real-time machine load vs utilization (minute-grain) | Orphan; referenced in roadmap but not wired | Wire to `prism_scheduling` dispatcher; add capacity_machine_load, capacity_all_loads actions |
| **VendorPerformanceScoreEngine** | Track lead time + quality + cost per supplier | Ghost (L6, never started); no import | Ingest from PO receipts; wire to purchasing; add vendor_scorecard_compute action |
| **MaterialPriceAdjustEngine** | Surcharge modeling (alloy premium, scrap factor, commodity index) | Unwired; 2 line claim | Wire to `prism_business.material_price_adjust`; add market-feed hooks |
| **QuoteAccuracyCalibrationEngine** | Historical bid-vs-win deltas → model adjustment weights | Deep-integration unit U-BRIDGE-ERP-QUOTE; partially built | Complete build; integrate `quoting_calibration_derive` + feedback loop from orders |
| **SchedulingBottleneckEngine** | Which
... [+4469 chars truncated]
