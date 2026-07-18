---
type: "chat-session"
source: "claude-code-cli"
session_id: "87d96286-aba0-4263-85de-26771e812c92"
title: "Medium-thorough read-only recon to feed a \"true print->program for any JM wire-E"
date: "2026-06-01"
first_ts: "2026-06-01T03:04:58.192Z"
last_ts: "2026-06-01T03:24:49.901Z"
cwd: "H:\\prism-slot-mike"
messages: 126
user_msgs: 55
assistant_msgs: 71
raw_file: "H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/agent-add74861da48f7a17.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# Medium-thorough read-only recon to feed a "true print->program for any JM wire-E

> **claude-code-cli** | 2026-06-01 | 126 msgs (55 user / 71 assistant) | cwd: H:\prism-slot-mike
> Raw: `H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/agent-add74861da48f7a17.jsonl`

## Transcript

### User | 2026-06-01T03:04:58.192Z

Medium-thorough read-only recon to feed a "true print->program for any JM wire-EDM part, inventory-driven" pipeline spec. Map these 4 surfaces with CONCRETE paths/exports (verify on disk, do NOT invent). Repo root: H:/prism-slot-mike. Report a tight digest, not file dumps.

1. HOTEL / ERP inventory + purchasing (slot hotel = business galaxy). Search `mcp-server/src/engines/business/` + `mcp-server/src/engines/*Inventory*`, `*ERP*`, `*Purchas*`, `*Stock*`, `*Procure*`. What engines/dispatchers/data expose JM raw-material + WIRE stock inventory, purchase orders, on-hand quantities, supplier/cost? Name the prism_business / businessDispatcher actions for inventory + purchasing. Any JM-specific inventory data files?

2. CHARLIE / quoting purchases (slot charlie = quoting galaxy). Search `mcp-server/src/engines/quoting/` + `*Quote*`, `*Cost*`, `*Material*`. What does quoting expose about JM material/wire purchases, stock-on-hand, material cost cards? Name the prism_quoting/quoteDispatcher actions relevant to "what stock/wire does JM have + its cost".

3. WIRE-EDM TOOLPATH TYPES taxonomy. Search `mcp-server/src/engines/*EDM*`, `*WEDM*` for the distinct toolpath/cut TYPES (rough, skim, taper/UV, no-core, thread, micro, multi-pass, corner, pocket, etc.) + which engines generate each (e.g. EDMMultiPassStrategyEngine, EDM*Toolpath*, WEDM*Strategy*). I need the full list of wire toolpath types that need template coverage + the engine that owns each.

4. JM FLEET WIRE MACHINES + existing wire CAD/CAM/print/program data. Find ShopConfigurationEngine / jm-die-profile for the JM wire-EDM MACHINE list (FA-10S etc., count, controllers). Confirm the wire program/print/CAM data locations already known: H:/PRISM/JM DIE/WIRE EDM (3 .NC + cannelure .txt + 3970 .mcx + 28 .esp + DXF/DWG), Docustrata blueprint-program join, the wedm tech-tables/wire-spec/material-db.

For each surface: list the concrete engine/dispatcher/data PATHS + the key actions/exports, and FLAG what's MISSING (no JM in
... [+168 chars truncated]

### Assistant | 2026-06-01T03:05:15.714Z

[tool_use: Bash]

### Assistant | 2026-06-01T03:05:16.373Z

[tool_use: Bash]

### User | 2026-06-01T03:07:31.820Z

[tool_result] H:/prism-slot-mike/mcp-server/src/engines
H:/prism-slot-mike/mcp-server/src/engines/hypermill
H:/prism-slot-mike/mcp-server/src/engines/plugins
H:/prism-slot-mike/mcp-server/src/engines/wedm
H:/prism-slot-mike/mcp-server/src/engines/__tests__

### User | 2026-06-01T03:12:18.324Z

[tool_result] Command running in background with ID: bz2nj8j42. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\09728bc8-edb5-4448-a2d3-a1f8608fe13f\tasks\bz2nj8j42.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-01T03:12:21.255Z

Let me do a thorough parallel scan across all four surfaces.

### Assistant | 2026-06-01T03:12:21.701Z

[tool_use: Bash]

### Assistant | 2026-06-01T03:12:22.165Z

[tool_use: Bash]

### Assistant | 2026-06-01T03:12:22.560Z

[tool_use: Bash]

### User | 2026-06-01T03:13:21.752Z

[tool_result] CLAUDE.md  15.9K
MEMORY.md  14.3K
PATHS.md  11.3K
TOOLBELT.md  3.1K

### User | 2026-06-01T03:13:22.585Z

[tool_result] __tests__/
algorithms/
architecture/
bot/
cache/
cli/
config/
contracts/
cps/
data/
db/
engines/
errors/
generators/
hooks/
interfaces/
knowledge/
mcp/
middleware/
migrations/
orchestration/
physics/
prompts/
queue/
registries/
routes/
schemas/
scripts/
services/
shared/
storage/
tests/
tools/
types/
utils/
validation/
constants.ts  13.5K
index.ts  51.3K
schemas.ts  16.6K
types.ts  25.0K

### User | 2026-06-01T03:13:24.220Z

[tool_result] CADSequenceLearningEngine.ts  19.9K
FeatureSequenceReplicatorEngine.ts  26.6K
HMCProjectParserEngine.ts  35.2K
HyperMillCADArtifactGeneratorEngine.ts  15.3K
HyperMillCAMAdvancedArtifactGeneratorEngine.ts  16.3K
HyperMillCAMCoreArtifactGeneratorEngine.ts  16.2K
HyperMillDeflectionThermalMappingEngine.ts  181.4K
HyperMillFixtureArtifactGeneratorEngine.ts  13.8K
HyperMillKienzleMappingEngine.ts  24.2
... [+352 chars truncated]

### Assistant | 2026-06-01T03:13:26.505Z

Let me read the key reference files first, then scan in parallel.

### Assistant | 2026-06-01T03:13:26.954Z

[tool_use: Read]

### Assistant | 2026-06-01T03:13:27.538Z

[tool_use: Read]

### User | 2026-06-01T03:13:44.570Z

[tool_result] 1	# WEDM Galaxy PATHS.md — H:/-wide path atlas for slot:mike (Wire Wizard)
2	
3	> **Purpose:** convert every future Grep/Glob/Agent for the wire-EDM domain from O(N) → O(1). Paste-ready absolute paths.
4	> **Owner:** slot:mike (galaxy:wedm). **Source:** distilled from `[[reference_wire_domain_atlas_for_mike_2026_05_27]]` (4-parallel-Explore build, 2026-05-27) + this session's WEDM-COMPREHENSIVE-TR
... [+11432 chars truncated]

### User | 2026-06-01T03:13:44.574Z

[tool_result] 1	# WEDM Galaxy — Domain-local CLAUDE.md (P1 Galactic Center)
2	
3	> **Bibryam Context Cascade — Pillar P1.** Auto-loads (via `SLOT_GALAXY_MAP.mike = "wedm"` in `slot-context-bundle-inject.mjs`) when slot:mike works OR when any chat edits under `mcp-server/src/engines/wedm/`. Root `CLAUDE.md` covers PRISM-wide doctrine; this file covers wire-EDM specifics.
4	>
5	> **Owner: slot:mike (Wire Wizard).
... [+15921 chars truncated]

### Assistant | 2026-06-01T03:13:47.496Z

Good. Now scan the business/ERP/quoting surfaces and the engine flat directory in parallel.

### Assistant | 2026-06-01T03:13:48.501Z

[tool_use: Glob]

### Assistant | 2026-06-01T03:13:49.015Z

[tool_use: Glob]

### Assistant | 2026-06-01T03:13:49.785Z

[tool_use: Glob]

### Assistant | 2026-06-01T03:13:49.862Z

[tool_use: Glob]

### User | 2026-06-01T03:13:57.093Z

[tool_result] No files found

### User | 2026-06-01T03:13:58.064Z

[tool_result] mcp-server\src\engines\ContextInventoryEngine.ts
mcp-server\src\engines\ERPToolInventoryEngine.ts
mcp-server\src\engines\InventoryAwareToolSelectorEngine.ts
mcp-server\src\engines\InventoryEOQEngine.ts
mcp-server\src\engines\InventoryOptimizationEngine.ts
mcp-server\src\engines\JMDieProgramInventoryEngine.ts
mcp-server\src\engines\LatheInventoryIntelligenceEngine.ts
mcp-server\src\engines\PluginIn
... [+74 chars truncated]

### User | 2026-06-01T03:13:58.091Z

[tool_result] mcp-server\src\engines\DERPlusPlusEngine.ts
mcp-server\src\engines\ERPCostFeedbackEngine.ts
mcp-server\src\engines\ERPImportEngine.ts
mcp-server\src\engines\ERPIntegrationEngine.ts
mcp-server\src\engines\ERPQualityEngine.ts
mcp-server\src\engines\ERPToolInventoryEngine.ts
mcp-server\src\engines\ERPWorkOrderEngine.ts
mcp-server\src\engines\LatheERPOrchestratorEngine.ts
mcp-server\src\engines\MultiE
... [+20 chars truncated]

### User | 2026-06-01T03:13:58.892Z

[tool_result] mcp-server\src\engines\BarStockCutPlanEngine.ts
mcp-server\src\engines\BarStockVibrationEngine.ts
mcp-server\src\engines\CumulativeStockChainEngine.ts
mcp-server\src\engines\HyperCADSStockModelEngine.ts
mcp-server\src\engines\InProcessStockModelEngine.ts
mcp-server\src\engines\LatheStockEvolutionEngine.ts
mcp-server\src\engines\MaterialStockEngine.ts
mcp-server\src\engines\StockAllowanceEngine.ts

... [+390 chars truncated]

### Assistant | 2026-06-01T03:14:01.098Z

[tool_use: Glob]

### Assistant | 2026-06-01T03:14:01.959Z

[tool_use: Glob]

### Assistant | 2026-06-01T03:14:02.431Z

[tool_use: Glob]

### Assistant | 2026-06-01T03:14:02.706Z

[tool_use: Glob]

### User | 2026-06-01T03:14:30.010Z

[tool_result] mcp-server\src\engines\LathePurchaseOrderAutomationEngine.ts
mcp-server\src\engines\PurchaseOrderEngine.ts
mcp-server\src\engines\PurchasingDirectoryEngine.ts

### User | 2026-06-01T03:14:43.570Z

[tool_result] No files found

### User | 2026-06-01T03:14:51.557Z

[tool_result] mcp-server\src\engines\ActualCostEngine.ts
mcp-server\src\engines\CoolantCostOptimizationEngine.ts
mcp-server\src\engines\CostAwareRouterEngine.ts
mcp-server\src\engines\CostEstimationEngine.ts
mcp-server\src\engines\CostEstimatorEngine.ts
mcp-server\src\engines\CostSavingsTrackerEngine.ts
mcp-server\src\engines\EDMCostDocumentationEngine.ts
mcp-server\src\engines\ERPCostFeedbackEngine.ts
mcp-serv
... [+838 chars truncated]

### User | 2026-06-01T03:14:51.560Z

[tool_result] mcp-server\src\engines\AdditiveQuoteEngine.ts
mcp-server\src\engines\BlueprintToQuoteBridgeEngine.ts
mcp-server\src\engines\CastingQuoteEngine.ts
mcp-server\src\engines\InjectionMoldQuoteEngine.ts
mcp-server\src\engines\InstantQuoteEngine.ts
mcp-server\src\engines\LatheAutoQuoteFromPrintEngine.ts
mcp-server\src\engines\MultiProcessQuoteEngine.ts
mcp-server\src\engines\QuoteAnalyticsEngine.ts
mcp-s
... [+475 chars truncated]

### Assistant | 2026-06-01T03:14:54.926Z

[tool_use: Glob]

### Assistant | 2026-06-01T03:14:55.352Z

[tool_use: Glob]

### User | 2026-06-01T03:15:36.543Z

[tool_result] mcp-server\src\tools\dispatchers\CLAUDE.md
mcp-server\src\tools\dispatchers\agentDispatcher.ts
mcp-server\src\tools\dispatchers\algorithmDispatcher.ts
mcp-server\src\tools\dispatchers\atcsDispatcher.ts
mcp-server\src\tools\dispatchers\authDispatcher.ts
mcp-server\src\tools\dispatchers\autoPilotDispatcher.ts
mcp-server\src\tools\dispatchers\automationDispatcher.ts
mcp-server\src\tools\dispatchers\a
... [+5274 chars truncated]

### User | 2026-06-01T03:15:38.534Z

[tool_result] mcp-server\src\engines\BatchCAMMaterialBridgeEngines.ts
mcp-server\src\engines\ConnectionMaterializerEngine.ts
mcp-server\src\engines\EDMBiMaterialCompensationEngine.ts
mcp-server\src\engines\EDMMaterialMachineWireEngine.ts
mcp-server\src\engines\Fusion360MaterialBridgeEngine.ts
mcp-server\src\engines\FusionMaterialBridgeEngine.ts
mcp-server\src\engines\FusionMaterialPhysicsBridge.ts
mcp-server\sr
... [+1479 chars truncated]

### Assistant | 2026-06-01T03:15:42.433Z

[tool_use: Grep]

### Assistant | 2026-06-01T03:15:44.108Z

[tool_use: Grep]

### system

... [46 middle messages omitted -- see raw_file] ...

### User | 2026-06-01T03:19:42.857Z

[tool_result] 255:  quantity_on_hand: number;
311:  { tool_id: "TI-001", description: "1/2\" 4FL Carbide Endmill", quantity_on_hand: 12, quantity_allocated: 3, available: 9, reorder_point: 5, lead_time_days: 7, location: "Crib A-1" },
312:  { tool_id: "TI-002", description: "3/8\" 3FL Carbide Endmill", quantity_on_hand: 8, quantity_allocated: 2, available: 6, reorder_point: 4, lead_time_days: 7, location: "Crib
... [+906 chars truncated]

### Assistant | 2026-06-01T03:19:45.517Z

Now get the WEDMPassType enum definition, the WEDMQuoteBridgeEngine, and the EDMToolpathStrategyEngine.

### Assistant | 2026-06-01T03:19:47.418Z

[tool_use: Grep]

### Assistant | 2026-06-01T03:19:49.970Z

[tool_use: Grep]

### Assistant | 2026-06-01T03:19:52.497Z

[tool_use: Grep]

### User | 2026-06-01T03:19:56.767Z

[tool_result] No matches found

### User | 2026-06-01T03:20:02.162Z

[tool_result] No matches found

### User | 2026-06-01T03:20:15.254Z

[tool_result] 7: *   U02 - CuttingDirectionOptimizer: CW/CCW based on profile type + debris flow
10: *   U05 - TaperToolpathGenerator: UV offsets, variable taper, 4-axis XY+UV
25:  profiles: ProfileDefinition[];
34:  contour_points: Array<{ x: number; y: number }>;
35:  profile_length_mm: number;
36:  min_corner_radius_mm?: number;
37:  taper_angle_deg?: number;
44:  profiles_classified: ClassifiedProfile[];
47
... [+4431 chars truncated]

### Assistant | 2026-06-01T03:20:19.161Z

Now get the WEDMPassType from constants, the WEDMQuoteBridgeEngine exports, and check the jm-die-wedm-tech-tables for wire/material stock data.

### Assistant | 2026-06-01T03:20:20.903Z

[tool_use: Grep]

### Assistant | 2026-06-01T03:20:21.443Z

[tool_use: Read]

### Assistant | 2026-06-01T03:20:22.098Z

[tool_use: Read]

### User | 2026-06-01T03:20:49.633Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-01T03:20:58.023Z

[tool_result] 1	/**
2	 * WEDMQuoteBridgeEngine — Cost → Quote Line Items bridge
3	 *
4	 * WEDM-ERP-MS0 U-WEDM-ERP01
5	 *
6	 * Transforms EDMCostDocumentationEngine.CostEstimate into QuoteLineItem[]
7	 * compatible with QuoteEngine. Implements:
8	 *   - 5-component cost mapping (machine_time, wire, consumables, post_process, overhead)
9	 *   - Per-piece breakdown (unit_price = total / quantity)
10	 *   - Quantit
... [+2607 chars truncated]

### User | 2026-06-01T03:20:59.815Z

[tool_result] 1	/**
2	 * JM Die Company — Mitsubishi FA-10S Wire EDM Technology Tables
3	 *
4	 * Extracted from real production programs:
5	 *   - ITW SHAKEPROOF 500-30540-24000-04.NC (D2, 4-pass straight)
6	 *   - NOZE TEST.NC (SS taper, 5-pass UV)
7	 *   - CHOCTAW DEFENSE 38 CAL CANNELURE (D2, 5-pass heavy)
8	 *   - FIOCCHI 38 CAL CANNELURE (D2, 5-pass heavy)
9	 *
10	 * Also validated against Mastercam X8 Mit
... [+2972 chars truncated]

### Assistant | 2026-06-01T03:21:04.308Z

Now get the WEDMPassType from physics/wedm-constants, the full tech-tables for E28xx, and check the MaterialStockEngine/PurchaseOrderEngine for wire stock.

### Assistant | 2026-06-01T03:21:05.539Z

[tool_use: Read]

### Assistant | 2026-06-01T03:21:07.624Z

[tool_use: Grep]

### Assistant | 2026-06-01T03:21:09.409Z

[tool_use: Grep]

### User | 2026-06-01T03:21:27.389Z

[tool_result] 80	  description: "Heavy-duty 2-axis, 5-pass (rough + 4 skim) — cannelure/thick stock pattern",
81	  axes: 2,
82	  num_passes: 5,
83	  materials: ["D2", "A2", "S7", "M2", "H13"],
84	  uses_h175_master: true,
85	  passes: [
86	    { pass_number: 1, e_code: "E1281", feed_ipm: 0.06, feed_mm_min: 1.52, h_register: "H1", offset_inches: 0.00995, offset_mm: 0.2527, type: "rough" },
87	    { pass_number: 
... [+3761 chars truncated]

### User | 2026-06-01T03:21:28.568Z

[tool_result] 4: * Tracks physical material stock levels, bar sizes, locations, suppliers,
39:  quantity_on_hand: number;
43:  supplier: string;
62:  quantity_on_hand?: number;
66:  supplier?: string;
77:  supplier?: string;
90:  by_supplier: Record<string, number>;
104:  supplier: string;
163:      quantity_on_hand: input.quantity_on_hand ?? 0,
167:      supplier: input.supplier ?? "",
178:    if (item.quantit
... [+1401 chars truncated]

### User | 2026-06-01T03:21:29.919Z

[tool_result] mcp-server\src\physics\wedm-constants.ts:706:export const WEDM_MULTI_PASS = {
mcp-server\src\physics\wedm-constants.ts:708:  pass_types: ["rough", "semi", "finish", "precision"] as const,
mcp-server\src\physics\wedm-constants.ts:767:export type WEDMPassType = typeof WEDM_MULTI_PASS.pass_types[number];
mcp-server\src\physics\wedm-constants.ts:768:export type WEDMFinishClass = keyof typeof WEDM_MULT
... [+18 chars truncated]

### Assistant | 2026-06-01T03:21:33.221Z

Now get the full WEDM_MULTI_PASS block, PurchaseOrderEngine wire coverage, and check if there's a jm-die-specific inventory data file.

### Assistant | 2026-06-01T03:21:34.527Z

[tool_use: Read]

### Assistant | 2026-06-01T03:21:36.340Z

[tool_use: Grep]

### Assistant | 2026-06-01T03:21:36.646Z

[tool_use: Glob]

### User | 2026-06-01T03:21:44.984Z

[tool_result] 700	 *   - Power setting (reduced energy per spark)
701	 *   - Speed factor (slower for finish)
702	 *   - Expected surface finish (Ra)
703	 *
704	 * Source: Mitsubishi MV1200R E-tables; Sodick LN2W manual §4.3; Ho & Newman (2003)
705	 */
706	export const WEDM_MULTI_PASS = {
707	  /** Pass type definitions */
708	  pass_types: ["rough", "semi", "finish", "precision"] as const,
709	
710	  /** Wire 
... [+2382 chars truncated]

### User | 2026-06-01T03:21:48.554Z

[tool_result] mcp-server\src\data\jm-die-archive-index.ts
mcp-server\src\data\jm-die-employees.ts
mcp-server\src\data\jm-die-profile.ts
mcp-server\src\data\jm-die-wedm-program-patterns.ts
mcp-server\src\data\jm-die-wedm-tech-tables.ts
mcp-server\src\data\jm-die-lathe-capabilities.ts

### User | 2026-06-01T03:21:54.863Z

[tool_result] 8: * for auto-restock on PO receive without creating a circular dependency.
13:  supplier_id: string;
14:  supplier_name: string;
37:  category: 'raw_material' | 'cutting_tool' | 'workholding' | 'consumable' | 'machine_part' | 'service' | 'other';
67:  by_supplier: { supplier: string; amount: number; oldest_days: number }[];
76:  // without creating circular imports. ToolUsageEngine uses this for 
... [+1109 chars truncated]

### Assistant | 2026-06-01T03:21:59.073Z

I now have enough data to compile the full recon report. Let me do one final check on the wire-spec-sheets and jm-die-profile for completeness.

### Assistant | 2026-06-01T03:21:59.203Z

[tool_use: Read]

### Assistant | 2026-06-01T03:22:00.992Z

[tool_use: Grep]

### User | 2026-06-01T03:22:17.296Z

[tool_result] 145:  wireEdm: "H:\\PRISM\\JM DIE\\WIRE EDM",
227: * Authoritative JM Die controller inventory — 15 production machines.
236: * WEDM→wire_edm). Post paths are relative to JM_DIE_SOURCE_ROOTS.posts_root.
256:  // Wire EDM (1) — Mitsubishi FA10S, primary controller variant W31MV-2

### User | 2026-06-01T03:22:18.425Z

[tool_result] 1	/**
2	 * wire-spec-sheets.ts — Wire EDM Wire Specifications from Manufacturer Data
3	 * MS-P1-100PCT U-P1-01
4	 *
5	 * SOURCES (all values traceable to published manufacturer specs):
6	 *   - Bedra Berkenhoff: Product catalog 2023, "EDM Wire Selection Guide"
7	 *   - Berkenhoff GmbH: Technical Data Sheets (bedra.com/technical-data)
8	 *   - Shinko Kobelco Welding: "EDM Wire Products" catalog 202
... [+2378 chars truncated]

### Assistant | 2026-06-01T03:22:20.825Z

Now get the full JM Die controller/machine inventory and the jm-die-profile wire EDM section.

### Assistant | 2026-06-01T03:22:22.124Z

[tool_use: Read]

### Assistant | 2026-06-01T03:22:22.881Z

[tool_use: Read]

### User | 2026-06-01T03:22:44.036Z

[tool_result] 80	
81	// ============================================================================
82	// BEDRA BERKENHOFF WIRE CATALOG
83	// ============================================================================
84	
85	const BEDRA_BERKENHOFF: WireSpecification[] = [
86	  {
87	    id: "bedra-cut-e-025",
88	    manufacturer: "Bedra Berkenhoff",
89	    product_name: "BEDRA CUT E",
90	    material: "brass_c
... [+1483 chars truncated]

### User | 2026-06-01T03:22:46.769Z

[tool_result] 220	  /** Source root for engineering prints / drawings / blueprints. */
221	  prints_root: "H:\\PRISM\\JM DIE\\PRINTS",
222	  /** Generic shop-floor program archive (mixed lathe/mill/edm). */
223	  programs_root: "H:\\PRISM\\JM DIE",
224	} as const;
225	
226	/**
227	 * Authoritative JM Die controller inventory — 15 production machines.
228	 * Restored 2026-05-01 from initial-commit b7e0b298f afte
... [+4254 chars truncated]

### Assistant | 2026-06-01T03:24:49.901Z

I now have all the data needed for a complete and accurate recon report. Here it is.

---

# Inventory-Driven Print-to-Program Pipeline Recon — Slot:mike (H:/prism-slot-mike)

---

## SURFACE 1 — HOTEL / ERP Inventory + Purchasing

### Engines found (flat at `mcp-server/src/engines/`)

**Inventory family:**
- `InventoryOptimizationEngine.ts` — EOQ, ABC classification, safety stock math
- `InventoryEOQEngine.ts` — standalone EOQ/reorder-point
- `ERPToolInventoryEngine.ts` — tool crib on-hand / allocated / available / reorder alerts
- `ToolInventoryOrchestratorEngine.ts` — orchestrates across crib
- `JMDieProgramInventoryEngine.ts` — program/NC file inventory (not raw-material)
- `MaterialStockEngine.ts` — raw-material stock: `quantity_on_hand`, `supplier`, `unit_cost`, `min_quantity`, status (`out_of_stock`/`low`/`ok`), persist/adjust/search/summary
- `StockSizeOptimizerEngine.ts`, `StockSelectionEngine.ts` — bar/plate size selection
- `LatheInventoryIntelligenceEngine.ts` — lathe-domain only

**ERP family:**
- `ERPIntegrationEngine.ts` — tool-crib items: `quantity_on_hand`, `quantity_allocated`, `available`, `reorder_point`, `lead_time_days`, location
- `ERPWorkOrderEngine.ts`, `ERPCostFeedbackEngine.ts`, `ERPImportEngine.ts`, `ERPQualityEngine.ts`
- `MultiERPConnectorEngine.ts`, `LatheERPOrchestratorEngine.ts`

**Purchasing family:**
- `PurchaseOrderEngine.ts` — `supplier_id`, `supplier_name`, `category` (`raw_material` | `cutting_tool` | `consumable` | ...), PO lifecycle (create/receive/approve), AP aging by supplier, auto-restock hooks on receive
- `PurchasingDirectoryEngine.ts` — supplier search/recommend/manufacturers
- `LathePurchaseOrderAutomationEngine.ts` — lathe-domain automation

**Dispatcher:** `mcp-server/src/tools/dispatchers/businessDispatcher.ts` (`prism_business`)

Key `prism_business` actions relevant to inventory + purchasing:
- `inventory_eoq`, `inventory_safety_stock`, `inventory_abc`, `inventory_tool_optimize`, `inventory_eoq_advanced`, `invent
... [+15433 chars truncated]
