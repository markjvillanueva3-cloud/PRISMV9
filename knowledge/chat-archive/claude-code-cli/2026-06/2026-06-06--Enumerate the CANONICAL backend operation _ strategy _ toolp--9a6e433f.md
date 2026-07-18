---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a6e433f-eb2c-47ab-b4d9-2bfcf5883aba"
title: "Enumerate the CANONICAL backend operation / strategy / toolpath enums of the PRI"
date: "2026-06-06"
first_ts: "2026-06-06T05:32:02.254Z"
last_ts: "2026-06-06T05:33:49.927Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/9a6e433f-eb2c-47ab-b4d9-2bfcf5883aba/subagents/workflows/wf_0f32a220-43b/agent-acf5017cecbbae5b8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Enumerate the CANONICAL backend operation / strategy / toolpath enums of the PRI

> **claude-code-cli** | 2026-06-06 | 21 msgs (9 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a6e433f-eb2c-47ab-b4d9-2bfcf5883aba/subagents/workflows/wf_0f32a220-43b/agent-acf5017cecbbae5b8.jsonl`

## Transcript

### User | 2026-06-06T05:32:02.254Z

Enumerate the CANONICAL backend operation / strategy / toolpath enums of the PRISM speed-feed engines, so we can compare backend breadth vs the UI surface. Repo root H:/prism.
Read (grep for the enum/union/array definitions, then read the slice):
  - mcp-server/src/engines/UltimateSpeedFeedEngine.ts  (operations, strategies, materials, tool materials)
  - mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts (input domains it routes)
  - mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts (the 9 axes incl. toolpath axis options + 3 modes)
Return the EXACT lists with counts: operation types, strategy types, the 9 composition axes and their option sets, the 3 optimization modes. file:line evidence. No truncation.

### Assistant | 2026-06-06T05:32:18.357Z

I'll grep for the enum/union/array definitions in each file, then read the relevant slices.

### Assistant | 2026-06-06T05:32:20.718Z

[tool_use: Grep]

### Assistant | 2026-06-06T05:32:22.149Z

[tool_use: Grep]

### Assistant | 2026-06-06T05:32:23.599Z

[tool_use: Grep]

### User | 2026-06-06T05:32:39.490Z

[tool_result] 6: * material databases, and empirical lookup tables.
9: *   - Partial input inference (material alone → full parameter set)
18: *   - Multi-operation support: milling, turning, drilling, tapping, reaming, boring
19: *   - 6 ISO material groups × 7 operations × 3 cut types = 126+ parameter combos
34:  CANONICAL_MATERIAL_DB,
81:export type Operation = "milling" | "turning" | "drilling" | "tapping" 
... [+11139 chars truncated]

### User | 2026-06-06T05:32:40.302Z

[tool_result] 2: * SpeedFeedNineAxisOrchestratorEngine — 9-axis comprehensive speed/feed orchestrator.
4: * THIN composition layer over UltimateSpeedFeedEngine.
5: * Does NOT reinvent physics. Accepts an explicit 9-axis input model and
6: * derives per-axis multipliers/constraints, then pipes through the canonical
8: * post-processes for 3 distinct operator-facing optimization modes plus
22: * 3 Modes:
29: *   
... [+7788 chars truncated]

### User | 2026-06-06T05:32:40.533Z

[tool_result] 32:import type { RuleCategory } from "./MachiningPlaybookEngine.js";
36:import type { ISOGroup } from "../physics/constants.js";
37:import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";
39:import type { OutcomeRecord } from "./CrossProcessOutcomeStore.js";
71:    "cross_domain",
116:export interface AtomicValue<T> {
127:export interface OrchestratorInput {
142:  ma
... [+6387 chars truncated]

### Assistant | 2026-06-06T05:32:46.362Z

I have the key definitions. Let me read the precise slices to confirm exact contents and counts: the UltimateSpeedFeed strategy line + StrategyMod block, the orchestrator input domains, and the NineAxis toolpath strategy enum + TOOLPATH_ENGAGEMENT map + the controller/way/etc enums.

### Assistant | 2026-06-06T05:32:47.773Z

[tool_use: Read]

### Assistant | 2026-06-06T05:32:48.672Z

[tool_use: Read]

### Assistant | 2026-06-06T05:32:49.364Z

[tool_use: Read]

### User | 2026-06-06T05:33:02.334Z

[tool_result] 81	export type Operation = "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";
82	export type CutType = "roughing" | "semi_finishing" | "finishing";
83	export type ToolMaterial = "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
84	export type CoolantType = "flood" | "mist" | "mql" | "air_blast" | "dry" | "through_tool" | "cryogenic";
85	
86	/** Accept
... [+962 chars truncated]

### User | 2026-06-06T05:33:02.997Z

[tool_result] 848	// STRATEGY MODIFIERS — adaptive/trochoidal/HSM adjustments
849	// ============================================================================
850	
851	interface StrategyMod {
852	  vc_factor: number;
853	  fz_factor: number;
854	  ap_factor: number;
855	  ae_override_pct?: number;
856	  notes: string[];
857	}
858	
859	const STRATEGY_MODS: Record<string, StrategyMod> = {
860	  conventional:  
... [+1997 chars truncated]

### User | 2026-06-06T05:33:03.256Z

[tool_result] 66	// ============================================================================
67	
68	export type MachineKinematics =
69	  | "3axis_vmc" | "3plus2" | "5axis_simultaneous"
70	  | "horizontal_mc" | "vertical_mc"
71	  | "lathe_2axis" | "millturn" | "swiss" | "wedm";
72	
73	export type WayType = "linear_rail" | "box_way" | "hybrid_way" | "roller_bearing";
74	
75	export type BuildQuality = "premium
... [+9227 chars truncated]

### Assistant | 2026-06-06T05:33:06.914Z

Now let me read the TOOLPATH_ENGAGEMENT map and the OrchestratorInput interface to complete the picture.

### Assistant | 2026-06-06T05:33:07.862Z

[tool_use: Read]

### Assistant | 2026-06-06T05:33:08.665Z

[tool_use: Read]

### User | 2026-06-06T05:33:11.153Z

[tool_result] 401	const TOOLPATH_ENGAGEMENT: Record<NonNullable<NineAxisToolpath["strategy"]>, number> = {
402	  conventional: 1.00,
403	  adaptive: 0.45,       // ~10% radial → constant engagement
404	  trochoidal: 0.50,
405	  hsm: 0.55,
406	  hpc: 0.95,
407	  plunge: 1.00,
408	  slot: 1.00,
409	};
410	
411	/**
412	 * ISO 1940 balance grade → max safe RPM at a typical 0.5kg toolholder + tool mass.
413	 * G = (
... [+203 chars truncated]

### User | 2026-06-06T05:33:11.291Z

[tool_result] 127	export interface OrchestratorInput {
128	  // ── Material (5) ──
129	  material?: string;                     // free-text name (fuzzy matched)
130	  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
131	  hardness_hb?: number;
132	  hardness_hrc?: number;
133	  sigma_y_MPa?: number;                 // yield strength override
134	
135	  // ── Machine (9) ──
136	  machine_name?: string;           
... [+4768 chars truncated]

### Assistant | 2026-06-06T05:33:49.927Z

I have all the exact definitions confirmed. Here is the complete enumeration.

---

# PRISM Speed-Feed Backend Canonical Enums

## 1. `UltimateSpeedFeedEngine.ts` — the physics core

**Operation types — 7** (`type Operation`, L81):
`milling` · `turning` · `drilling` · `tapping` · `reaming` · `boring` · `thread_milling`

**Strategy types — 7** (`UltimateSpeedFeedInput.strategy`, L108; and the matching `STRATEGY_MODS` record, L859-867):
`conventional` · `adaptive` · `trochoidal` · `hsm` · `hpc` · `plunge` · `slot`

**Cut types — 3** (`type CutType`, L82): `roughing` · `semi_finishing` · `finishing`

**Tool materials — 6** (`type ToolMaterial`, L83): `carbide` · `hss` · `cermet` · `ceramic` · `cbn` · `pcd`

**Coolant types — 7** (`type CoolantType`, L84): `flood` · `mist` · `mql` · `air_blast` · `dry` · `through_tool` · `cryogenic`

**Materials — 19 local profiles** (`MATERIAL_DB`, L422-589) across **6 ISO groups** (P/M/K/N/S/H): P=plain_carbon/alloy_steel/medium_carbon (3); M=austenitic_ss/17-4ph/duplex (3); K=gray_iron/ductile_iron (2); N=aluminum/brass/copper/plastic (4); S=titanium/inconel (2); H=tool_steel (1) — note 18 of these carry `aliases[]` covering ~80 free-text names. The file header (L18) advertises "6 ISO groups × 7 operations × 3 cut types".

---

## 2. `SpeedFeedOrchestratorEngine.ts` — the routing hub (`OrchestratorInput`, L127-239)

Routes **15 input domains** (the comment-banner count next to each):

| # | Domain (banner) | Count | Notable enums |
|---|---|---|---|
| 1 | Material | 5 | `iso_group`: P/M/K/N/S/H (6) |
| 2 | Machine | 9 | `machine_type`: vertical_mill/horizontal_mill/lathe/5axis/router/swiss (6); `spindle_taper`: BT30/BT40/BT50/CAT40/CAT50/HSK-A63/HSK-A100/HSK-E40 (8); `machine_guideway`: box/linear/hydrostatic (3) |
| 3 | Tool | 12 | `tool_material`: carbide/hss/cermet/ceramic/cbn/pcd (6) |
| 4 | Holder | 4 | `holder_type`: shrink_fit/hydraulic/ER_collet/Weldon/milling_chuck (5) |
| 5 | Operation | 3 | `operation` (7), `cut_type` (3),
... [+4830 chars truncated]
