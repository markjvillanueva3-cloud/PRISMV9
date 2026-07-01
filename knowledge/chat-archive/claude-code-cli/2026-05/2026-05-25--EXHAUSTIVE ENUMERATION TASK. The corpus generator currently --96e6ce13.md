---
type: "chat-session"
source: "claude-code-cli"
session_id: "96e6ce13-234c-4fb1-9680-b3d4bd9b68cb"
title: "EXHAUSTIVE ENUMERATION TASK. The corpus generator currently treats every scenari"
date: "2026-05-25"
first_ts: "2026-05-25T00:47:57.580Z"
last_ts: "2026-05-25T00:59:51.018Z"
cwd: "H:\\prism"
messages: 97
user_msgs: 46
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism/96e6ce13-234c-4fb1-9680-b3d4bd9b68cb/subagents/agent-a21c1fc910ccddafa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# EXHAUSTIVE ENUMERATION TASK. The corpus generator currently treats every scenari

> **claude-code-cli** | 2026-05-25 | 97 msgs (46 user / 51 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/96e6ce13-234c-4fb1-9680-b3d4bd9b68cb/subagents/agent-a21c1fc910ccddafa.jsonl`

## Transcript

### User | 2026-05-25T00:47:57.580Z

EXHAUSTIVE ENUMERATION TASK. The corpus generator currently treats every scenario as standalone — no per-shop/customer/job override layer. Real shops customize behavior at many surfaces. I need the FULL map of PRISM's adaptability hooks so v3's scenarios can be "real-shop faithful" (correctly tagged with shop_profile, customer, material policy, tooling pool, safety tier, etc.).

**Sources to read end-to-end:**

1. `H:/prism/mcp-server/src/engines/ShopConfigurationEngine.ts` — list every profile field + every profile loaded.
2. `H:/prism/mcp-server/src/data/jm-die-profile.ts` — canonical test shop; list every field + every per-machine override.
3. `H:/prism/mcp-server/src/engines/PRISMSelfAwarenessEngine.ts` — `getJMDieCustomerPath`, `searchJMDieCustomer` — list every customer signature exposed.
4. `H:/prism/JM DIE/` — top-level listing of customer folder names (sample first 20 if too many).
5. `H:/prism/mcp-server/src/registries/MaterialRegistry.ts` (or similar) — list every material policy/override surface.
6. `H:/prism/mcp-server/src/registries/ToolRegistry.ts` — tooling pool API; list per-tool override fields.
7. `H:/prism/mcp-server/src/data/*tool-catalog*.ts` — every tool catalog; count entries; list pool diversity.
8. `H:/prism/mcp-server/src/engines/SafetyEngine.ts` and `state/shared/omega-thresholds.json` — list every safety tier + S(x) threshold + Ω threshold.
9. `H:/prism/mcp-server/src/data/operator-profiles*` — operator skill levels / tribal-knowledge tiers if they exist.
10. Grep `H:/prism/mcp-server/src/ -name "*Config*Engine*"` `*Profile*Engine*` `*Override*` — list every config/override engine.
11. `H:/prism/mcp-server/src/engines/CustomerProfile*Engine*` and `*JobLifecycle*` — list customer surfaces.

**Output format (markdown, ~600 words MAX):**

### 1. Shop profile surface
List every field a `ShopConfigurationEngine` profile exposes. JM-Die canonical example: how does this profile differ from a generic factory shop?

### 2. Customer adaptability l
... [+1750 chars truncated]

### Assistant | 2026-05-25T00:48:15.132Z

I'll perform an exhaustive enumeration of PRISM's adaptability surfaces. Let me start by reading all the canonical sources in parallel.

### Assistant | 2026-05-25T00:48:15.336Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:16.381Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:16.965Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:17.415Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:18.392Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:19.230Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:19.503Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:19.996Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:20.618Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:21.072Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:21.585Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:22.118Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:48:23.181Z

[tool_use: Bash]

### Assistant | 2026-05-25T00:48:23.650Z

[tool_use: Bash]

### Assistant | 2026-05-25T00:48:24.151Z

[tool_use: Glob]

### User | 2026-05-25T00:49:12.913Z

[tool_result] mcp-server\src\engines\PRISMSelfAwarenessEngine.ts

### User | 2026-05-25T00:49:12.916Z

[tool_result] mcp-server\src\registries\index.ts
mcp-server\src\registries\BaseRegistry.ts
mcp-server\src\registries\MachineSpindleDefaults.ts
mcp-server\src\registries\ToolGeometryDefaults.ts
mcp-server\src\registries\CoatingRegistry.ts
mcp-server\src\registries\CoolantRegistry.ts
mcp-server\src\registries\ScriptRegistry.ts
mcp-server\src\registries\SkillRegistry.ts
mcp-server\src\registries\KnowledgeBaseRegis
... [+846 chars truncated]

### User | 2026-05-25T00:49:12.991Z

[tool_result] mcp-server\src\data\jm-die-profile.ts

### User | 2026-05-25T00:49:13.420Z

[tool_result] mcp-server\src\engines\SoftJawProfileEngine.ts
mcp-server\src\engines\CamProfileEngine.ts
mcp-server\src\engines\MotionDynamicsProfileEngine.ts
mcp-server\src\engines\TurningProfileEngine.ts
mcp-server\src\engines\HobbyCNCProfileEngine.ts
mcp-server\src\engines\MachineProfileEngine.ts
mcp-server\src\engines\TurningRevProfileEngine.ts
mcp-server\src\engines\AgentSpecializationProfileEngine.ts
mcp-s
... [+375 chars truncated]

### User | 2026-05-25T00:49:13.436Z

[tool_result] mcp-server\src\engines\JobLifecycleEngine.ts

### User | 2026-05-25T00:49:13.440Z

[tool_result] mcp-server\src\engines\ContextualStrategyOverrideEngine.ts
mcp-server\src\engines\PPFeedOverrideValidatorEngine.ts
mcp-server\src\engines\AdaptiveOverrideEngine.ts
mcp-server\src\engines\OutcomeFeedbackOverrideStoreEngine.ts

### User | 2026-05-25T00:49:13.442Z

[tool_result] mcp-server\src\engines\ShopConfigurationEngine.ts

### User | 2026-05-25T00:49:13.469Z

[tool_result] mcp-server\src\engines\CustomerPortalEngine.ts
mcp-server\src\engines\CustomerPortfolioMinerEngine.ts
mcp-server\src\engines\CustomerKnowledgeEngine.ts
mcp-server\src\engines\WetRunCustomerCommunicationLogEngine.ts
mcp-server\src\engines\WetRunCustomerAcceptanceEngine.ts
mcp-server\src\engines\CrossCustomerPolicyTransferEngine.ts
mcp-server\src\engines\LatheCustomerOrderLifecycleEngine.ts
mcp-serv
... [+150 chars truncated]

### User | 2026-05-25T00:49:13.471Z

[tool_result] mcp-server\src\engines\ConfigEngine.ts
mcp-server\src\engines\MachineConfigDatabaseEngine.ts
mcp-server\src\engines\WhiteLabelConfigEngine.ts
mcp-server\src\engines\CoolantControlConfigEngine.ts
mcp-server\src\engines\PostLibraryConfiguratorEngine.ts
mcp-server\src\engines\JmDieMachineConfigEngine.ts
mcp-server\src\engines\ColdHeadingToolConfiguratorEngine.ts
mcp-server\src\engines\AdvancedCNCConf
... [+124 chars truncated]

### User | 2026-05-25T00:49:13.497Z

[tool_result] mcp-server\src\engines\HyperMillSafetyHooks.ts
mcp-server\src\engines\SafetyVetoEngine.ts
mcp-server\src\engines\MastercamSafetyHooksEngine.ts
mcp-server\src\engines\PostVerificationSafetyEngine.ts
mcp-server\src\engines\BatchCAMSafetyEngines.ts
mcp-server\src\engines\SolidCAMSafetyHooksEngine.ts
mcp-server\src\engines\SafetyEscalationEngine.ts
mcp-server\src\engines\SafetyPatternMinerEngine.ts
mc
... [+1280 chars truncated]

### User | 2026-05-25T00:49:13.522Z

[tool_result] No files found

### User | 2026-05-25T00:49:13.645Z

[tool_result] mcp-server\src\data\sgs-tool-catalog.ts
mcp-server\src\data\osg-tool-catalog.ts
mcp-server\src\data\guhring-tool-catalog.ts
mcp-server\src\data\sandvik-tool-catalog.ts
mcp-server\src\data\seco-tool-catalog.ts
mcp-server\src\data\indexable-tool-catalog.ts
mcp-server\src\data\additional-tool-catalog.ts
mcp-server\src\data\ingersoll-tool-catalog.ts
mcp-server\src\data\emuge-tool-catalog.ts
mcp-server
... [+487 chars truncated]

### User | 2026-05-25T00:49:13.647Z

[tool_result] state\shared\omega-thresholds.json

### User | 2026-05-25T00:49:49.032Z

[tool_result] BASEBALL PARTS/
CNC LATHE/
CNC MILL HAAS/
CNC OKUMA MULTUS/
GENERAL BANDAGES/
HAAS-HURCO/
HURCO CNC PROGRAMS/
JM DIE COMPANY/
LATHE/
MACRO PROGRAMS/
MATTHEW programs/
OKUMA/
PRISM CAD TESTING/
PRISM MODIFIED POST PROCESSORS/
QUEUE/
REVERSE ENGINEERING/
ROKU-ROKU/
SETUPS/
WIRE EDM/
_PART LIBRARY/
Automated Program_Corrected 5-25.xlsm  5.3M
vba Sheet11.cls  5.0K
vba Sheet14.cls  5.1K
vba Sheet15.cls
... [+28 chars truncated]

### User | 2026-05-25T00:49:51.320Z

[tool_result] 30

### Assistant | 2026-05-25T00:50:15.325Z

Acknowledged the graph context (jm-die-shop, stamping-die-calc, jm-die-employees are L10 built nodes — relevant background, but the enumeration requires reading the source files directly for field-level detail). Proceeding with reads.

### Assistant | 2026-05-25T00:50:16.474Z

[tool_use: Read]

### Assistant | 2026-05-25T00:50:16.843Z

[tool_use: Read]

### Assistant | 2026-05-25T00:50:17.220Z

[tool_use: Read]

### Assistant | 2026-05-25T00:50:18.302Z

[tool_use: Read]

### Assistant | 2026-05-25T00:50:18.386Z

[tool_use: Read]

### User | 2026-05-25T00:50:29.490Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\data\jm-die-profile.ts' was already read 65s ago in this session and is unchanged (mtime 1777664368054). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-25T00:50:35.172Z

[tool_result] 1	/**
2	 * ShopConfigurationEngine — Centralized Shop Rate & Machine Configuration
3	 *
4	 * Every shop has different rates. A garage shop in Ohio runs $65/hr machine;
5	 * an aerospace job shop in Connecticut runs $225/hr for 5-axis. This engine
6	 * replaces hardcoded rates across all costing/quoting engines with a single
7	 * configurable shop profile.
8	 *
9	 * Consumers: ERPIntegrationEngine,
... [+45316 chars truncated]

### system

... [17 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-25T00:52:54.911Z

[tool_use: Read]

### Assistant | 2026-05-25T00:52:55.428Z

[tool_use: Read]

### Assistant | 2026-05-25T00:52:56.490Z

[tool_use: Read]

### Assistant | 2026-05-25T00:52:56.976Z

[tool_use: Read]

### Assistant | 2026-05-25T00:52:58.035Z

[tool_use: Read]

### Assistant | 2026-05-25T00:52:59.267Z

[tool_use: Read]

### Assistant | 2026-05-25T00:53:00.105Z

[tool_use: Read]

### Assistant | 2026-05-25T00:53:00.626Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:53:01.164Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:53:01.697Z

[tool_use: Glob]

### Assistant | 2026-05-25T00:53:03.258Z

[tool_use: Grep]

### Assistant | 2026-05-25T00:53:04.872Z

[tool_use: Grep]

### User | 2026-05-25T00:53:41.840Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Coolant Registry
3	 * S1-MS1 P3-U01: Complete coolant/lubricant database for SFC calculations
4	 *
5	 * 200+ coolant entries covering:
6	 * - Flood coolants (water-soluble, semi-synthetic, full-synthetic)
7	 * - Neat cutting oils (straight oils)
8	 * - MQL (Minimum Quantity Lubrication) fluids
9	 * - Cryogenic coolants (LN2, CO2)
10	 * - Air blast / dry machining
11	 
... [+4127 chars truncated]

### User | 2026-05-25T00:53:42.647Z

[tool_result] 1	/**
2	 * OmegaSafetyScoreEngine — Scalar safety gate for G-code output
3	 *
4	 * Converts the 6-dimension SafetyAssessment from PipelineSafetyOrchestratorEngine
5	 * into a scalar S(x) ∈ [0, 1]. G-code output is BLOCKED when S(x) < 0.70.
6	 *
7	 * Scoring:
8	 *   Per-dimension: safe=1.0, caution=0.85, warning=0.60, critical=0.25, veto=0
9	 *   S(x) = geometric mean of 6 dimension scores
10	 *   
... [+5944 chars truncated]

### User | 2026-05-25T00:53:42.682Z

[tool_result] 1	/**
2	 * AdaptiveOverrideEngine — Intelligent Feed/Speed Override Control
3	 * ==================================================================
4	 *
5	 * SAFETY-CRITICAL: Coordinates all adaptive systems to generate
6	 * safe, optimized override values. Arbitrates between conflicting
7	 * recommendations from chipload, chatter, wear, and thermal engines.
8	 * Requires S(x) >= 0.990 for all ope
... [+2583 chars truncated]

### User | 2026-05-25T00:53:42.706Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Coating Registry
3	 * S1-MS1 P3-U02: Complete tool coating database for SFC calculations
4	 *
5	 * 100+ coating entries covering:
6	 * - PVD coatings (TiN, TiCN, TiAlN, AlTiN, AlCrN, CrN, etc.)
7	 * - CVD coatings (TiC, Al2O3, TiCN CVD, MT-CVD)
8	 * - Diamond coatings (PCD, CVD diamond, DLC)
9	 * - Specialty (CBN, ceramic coatings)
10	 *
11	 * Each entry includes mech
... [+4231 chars truncated]

### User | 2026-05-25T00:53:42.739Z

[tool_result] 1	/**
2	 * ContextualStrategyOverrideEngine (E1111) — CAMX-MS12 U05
3	 *
4	 * Handles edge cases where standard strategy selection must be overridden by
5	 * physical constraints.  Ten hard-override rules cover the most common failure
6	 * modes in production machining.
7	 *
8	 * Rules (all mandatory unless noted):
9	 *   1. thin_wall          — wall_thickness < 2 mm → force ae < 3 %D, climb, spri
... [+4106 chars truncated]

### User | 2026-05-25T00:53:42.826Z

[tool_result] 1	/**
2	 * CustomerKnowledgeEngine — TK-MS11
3	 *
4	 * Manages customer-specific knowledge profiles for personalized tribal knowledge.
5	 * Learns shop-specific preferences, material expertise, machine configurations,
6	 * and job history patterns. JM Die Company is the canonical test case.
7	 *
8	 * @module CustomerKnowledgeEngine
9	 * @since TK-MS11
10	 */
11	
12	// ─────────────────────────────
... [+2268 chars truncated]

### User | 2026-05-25T00:53:42.842Z

[tool_result] 1	// WIRE-EXEMPT: tests in ContinualLearningEngines.test.ts (49 cases)
2	/**
3	 * Cross-Customer Policy Transfer Engine — U-LEARN-10
4	 * ====================================================
5	 *
6	 * Enables policy transfer between customers when they share
7	 * (material_class, operation_type, machine_class). Finds similar
8	 * source policies and creates weighted ensemble for target customer.
9
... [+2767 chars truncated]

### User | 2026-05-25T00:53:42.917Z

[tool_result] 1	/**
2	 * CustomerMaterialMapEngine — learned customer → material distribution map
3	 *
4	 * MS-PRINT-PROGRAM-LOOP / Track C / U-PPL-C2 (= RES-MS21 core).
5	 *
6	 * Why this engine exists
7	 * ----------------------
8	 * `MaterialResolverForProgramsEngine._resolveFromCustomer()` resolves material
9	 * from a customer folder name today, BUT its comment explicitly says (line ~293):
10	 *
11	 *     
... [+4108 chars truncated]

### User | 2026-05-25T00:53:42.930Z

[tool_result] 680	  }
681	
682	  /**
683	   * Get JM Die customer path
684	   */
685	  getJMDieCustomerPath(customer: string): string | null {
686	    const customerPath = path.join(JM_DIE_ROOT, customer);
687	    if (fs.existsSync(customerPath)) {
688	      return customerPath;
689	    }
690	
691	    // Try case-insensitive search
692	    try {
693	      const entries = fs.readdirSync(JM_DIE_ROOT);
694	      c
... [+7172 chars truncated]

### User | 2026-05-25T00:53:44.133Z

[tool_result] No files found

### User | 2026-05-25T00:53:44.163Z

[tool_result] mcp-server\src\engines\OperatorDashboardOrchestratorEngine.ts
mcp-server\src\engines\OperatorActionAuditTrailEngine.ts
mcp-server\src\engines\PPOperatorStopValidatorEngine.ts
mcp-server\src\engines\OperatorApprovalGateEngine.ts
mcp-server\src\engines\OperatorPreferencesEngine.ts
mcp-server\src\engines\OperatorCoachingTipsEngine.ts

### User | 2026-05-25T00:53:44.166Z

[tool_result] mcp-server\src\engines\SkillBundleEngine.ts
mcp-server\src\engines\UserAssistanceSkillsEngine.ts
mcp-server\src\engines\UserWorkflowSkillsEngine.ts
mcp-server\src\engines\HyperMillSkillsBatchEngine.ts
mcp-server\src\engines\SkillGapAnalyzerEngine.ts
mcp-server\src\engines\SkillInliningOptimizerEngine.ts
mcp-server\src\engines\SkillLibraryAuditEngine.ts
mcp-server\src\engines\SkillMarketplaceScanne
... [+164 chars truncated]

### User | 2026-05-25T00:53:44.168Z

[tool_result] Found 15 files limit: 15
mcp-server\src\engines\CurriculumEngine.ts
mcp-server\src\engines\OperatorCoachingTipsEngine.ts
mcp-server\src\engines\WireBreakAutoRethreadEngine.ts
mcp-server\src\engines\VendorRealtimePricingClientEngine.ts
mcp-server\src\engines\MachinePartsBOMResolverEngine.ts
mcp-server\src\engines\PreCutChecklistEngine.ts
mcp-server\src\engines\MillPrismaticAdapterEngine.ts
mcp-serv
... [+429 chars truncated]

### User | 2026-05-25T00:53:44.170Z

[tool_result] Found 15 files limit: 15
mcp-server\src\engines\MedicalCFR820TraceabilityEngine.ts
mcp-server\src\engines\DrawingCapabilityTargetEngine.ts
mcp-server\src\engines\SPCPreControlEngine.ts
mcp-server\src\engines\FAIAutoGenerationEngine.ts
mcp-server\src\engines\SetupSheetGeneratorEngine.ts
mcp-server\src\engines\ToolMagazineIntegrityEngine.ts
mcp-server\src\engines\PreCutChecklistEngine.ts
mcp-server\
... [+402 chars truncated]

### Assistant | 2026-05-25T00:53:48.943Z

Acknowledged. I have enough source material — final two probes for OperatorPreferences + tool catalog entry counts, then I'll produce the enumeration.

### Assistant | 2026-05-25T00:53:50.002Z

[tool_use: Read]

### Assistant | 2026-05-25T00:53:51.050Z

[tool_use: Read]

### Assistant | 2026-05-25T00:53:58.965Z

[tool_use: Bash]

### Assistant | 2026-05-25T00:54:02.118Z

[tool_use: Bash]

### Assistant | 2026-05-25T00:54:03.679Z

[tool_use: Grep]

### Assistant | 2026-05-25T00:54:05.062Z

[tool_use: Grep]

### User | 2026-05-25T00:54:25.342Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Post Processor Registry
3	 * Complete access to G-code post processors for CNC controller families.
4	 *
5	 * Post processors translate generic toolpath data into controller-specific
6	 * NC code (Fanuc, Siemens, Haas, Mazak, Okuma, etc.).
7	 *
8	 * ⚠️ SAFETY CRITICAL: Incorrect post processing can cause machine crashes.
9	 * All post processors require validation bef
... [+2533 chars truncated]

### User | 2026-05-25T00:54:25.394Z

[tool_result] 1	/**
2	 * OperatorPreferencesEngine — Per-operator preferences with tenant scoping
3	 *
4	 * Stores operator-specific settings and feedback for RLHF integration.
5	 * Each operator can have personalized preferences that override tenant defaults.
6	 *
7	 * Features:
8	 * - Tenant-scoped operator profiles
9	 * - Preference categories: speed/feed bias, surface finish priority, cycle time vs tool lif
... [+2733 chars truncated]

### User | 2026-05-25T00:56:07.753Z

[tool_result] sandvik-tool-catalog.ts  0
0
sandvik-2022-tool-catalog.ts  0
0
seco-tool-catalog.ts  0
0
ingersoll-tool-catalog.ts  0
0
helical-tool-catalog.ts  0
0
sgs-tool-catalog.ts  0
0
osg-tool-catalog.ts  0
0
emuge-tool-catalog.ts  0
0
horn-tool-catalog.ts  0
0
niagara-tool-catalog.ts  0
0
dormer-pramet-tool-catalog.ts  0
0
mitsubishi-tool-catalog.ts  0
0
tungaloy-us-tool-catalog.ts  0
0
sumitomo-tool-catal
... [+187 chars truncated]

### User | 2026-05-25T00:56:32.621Z

[tool_result] 2: * SkillTierRegistryEngine — Classify skills into discoverability tiers
7: * tiers so `/help-me-start` (U-UX4) can surface a progressive disclosure:
14: * maps trigger keywords to tiers. No I/O.
33:  tier: SkillTier;
56: * U-CK28 closes the command-utilization → auto skill-tier loop.
77:   * of "writes tiers back (not read-only)" per U-CK28.
138:  /** Assign a tier to a single skill. */
146:  /*
... [+1447 chars truncated]

### User | 2026-05-25T00:56:32.624Z

[tool_result] No matches found

### User | 2026-05-25T00:58:02.553Z

[tool_result] 89
---verification list (first 40)---
AdaptiveOverrideEngine.ts  12.1K
AdvancedCNCConfigEngine.ts  33.0K
AgentSpecializationProfileEngine.ts  29.0K
BladeProfileLibraryEngine.ts  16.3K
CamProfileEngine.ts  7.5K
ColdHeadingToolConfiguratorEngine.ts  17.5K
ConfigEngine.ts  7.1K
ContextualStrategyOverrideEngine.ts  26.1K
CoolantControlConfigEngine.ts  25.2K
CrossCustomerPolicyTransferEngine.ts  6.7K
C
... [+1132 chars truncated]

### Assistant | 2026-05-25T00:59:51.018Z

I have sufficient material. Producing the enumeration now.

---

## PRISM Adaptability-Surface Enumeration (for v3 corpus tagging)

### 1. Shop profile surface — `ShopConfigurationEngine.ts`
**`ShopProfile`** top-level fields (`ShopConfigurationEngine.ts:141-156`): `id, name, rates, machines[], overhead_pct, material_markup_pct, tooling_cost_per_op, material_cost_per_part_default, admin_burden_pct, company_profile, source_roots, seed_domains[], created_at, updated_at`.

- **`ShopRates`** (lines 31-38): `labor_per_hr, overhead_per_hr, admin_per_hr, setup_per_hr, programming_per_hr, inspection_per_hr`.
- **`ShopCompanyProfile`** (87-100): `legal_name, short_code, domain, industry, specialization, region, timezone, file_archive_path, canonical_test_shop, development_role, cad_systems[], cam_systems[]`.
- **`ShopSourceRoots`** (102-112): `company_root, programs_root, employee_database_root, machines_root, controllers_root, tool_holders_root, tooling_root, materials_root, prints_root`.
- **`ShopMachine`** (40-85, 33 fields): `id, name, type, hourly_rate, efficiency_factor, capabilities[], hours_per_shift, shifts_per_day, days_per_week, controller, max_rpm, max_power_kw, max_torque_nm, work_envelope{x_mm,z_mm}, bar_capacity_mm, has_bar_feeder, has_sub_spindle, has_live_tooling, turret_stations, coolant_types[], wedm_uv_travel_mm, wedm_max_taper_deg, wedm_max_workpiece_height_mm, wedm_auto_threading, wedm_submerged_cutting, wedm_brand, wedm_wire_inventory[], magazine[{station,tool_id,insert_type,holder,remaining_life_min,edges_used,total_edges}]`.

**Only ONE profile loaded** (`DEFAULT_PROFILE_ID="jm-die"`, registered as `jm-die` + alias `default`, line 481-483). The "generic factory shop" abstraction does not exist — there is no `general-job-shop`, `aerospace-shop`, `medical-shop`, etc. Profile. JM-Die differs from a generic shop *implicitly* via: $55-95/hr machine rates (vs aerospace $150-225 / garage $45-65), Midwest fastener-die specialization, 21-machine roster heavy 
... [+13603 chars truncated]
