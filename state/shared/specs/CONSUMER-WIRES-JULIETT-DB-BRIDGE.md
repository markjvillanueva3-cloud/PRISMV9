---
title: Consumer Wires for JULIETT-DB-BRIDGE-MS0
slot: juliett
session: claude-f75381c1
written_at: 2026-05-25
mustHumanVerify: false
status: integration-points-defined
related:
  - "[[reference_post_ship_docker-mcp-wire-ms0-u-catalog-audit]]"
  - state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md
---

# JULIETT-DB-BRIDGE-MS0 — Consumer Wires Spec

**Work order (2026-05-25):** wire/bridge databases to speedfeed calculator,
post processor engines, master post processor, mill wizard, lathe wizard,
wire EDM wizard, quoting, CAD/CAM systems, and other high-ROI nodes.

## How the wire works

ONE adapter (`CatalogConsumerAdapterEngine`, this session, commit pending)
sits between the 4 catalog DBs and ALL 8 consumer classes. Any consumer
engine adds ONE import + ONE call:

```ts
import { catalogConsumerAdapter } from "./CatalogConsumerAdapterEngine.js";

// In the consumer's material-resolution step:
const ctx = await catalogConsumerAdapter.resolve({
  consumer: "<consumer-name>",          // 1 of 8 enum below
  material: <material-string>,
  op_type?: <op-string>,                 // optional
  iso_group?: "P"|"M"|"K"|"N"|"S"|"H"|"X", // optional override
  machine_class?: <machine-hint>,        // for post/masterpost/wizard
});
// ctx.material, ctx.tools_top, ctx.coatings_top, ctx.machines_top, ctx.extras
```

Or via MCP — any peer-chat or external caller:

```
prism_intelligence:catalog_resolve_for_consumer
  { consumer: "quoting", material: "Ti6Al4V", op_type: "mill" }
```

## Per-consumer wire points (1-line each)

### 1. SPEEDFEED — UltimateSpeedFeedEngine + AutoSpeedFeed + MachineAwareSpeedFeed
- **Wire-point:** material-resolution step before Kienzle call.
- **Call:** `await catalogConsumerAdapter.resolve({ consumer: "speedfeed", material, op_type, iso_group })`
- **Uses:** `ctx.material.kc11`, `ctx.material.mc`, `ctx.extras.iso_emphasis`, `ctx.tools_top` for chipload tables.
- **Files:** `mcp-server/src/engines/UltimateSpeedFeedEngine.ts`, `AutoSpeedFeedEngine.ts`, `MachineAwareSpeedFeedEngine.ts`, `AutoSpeedFeedCalculatorEngine.ts`.

### 2. POST — AdvancedPostProcessor + PostProcessorPipeline + CrossCAMPost
- **Wire-point:** machine-config resolution before block-emit loop.
- **Call:** `await catalogConsumerAdapter.resolve({ consumer: "post", material, machine_class })`
- **Uses:** `ctx.extras.controller_hint` for dialect routing; `ctx.machines_top[0]` for machine envelope.
- **Files:** `mcp-server/src/engines/AdvancedPostProcessorEngine.ts`, `CrossCAMPostEngine.ts`, `PostProcessorUltimateAIEngine.ts`.

### 3. MASTERPOST — Hurco V11 Mill + Okuma B250 Lathe + Mitsubishi MV1200R Wire EDM
- **Wire-point:** in the master-post's `resolveMachineProfile()` / `buildMacroHeader()`.
- **Call:** `await catalogConsumerAdapter.resolve({ consumer: "masterpost", material, machine_class: "<vendor>_<model>" })`
- **Uses:** `ctx.extras.controller_hint` ("hurco_winmax" / "okuma_osp" / "mitsubishi_meldas"), `ctx.material.iso_group`.
- **Files:** `HurcoV11MillMasterPostEngine.ts`, `OkumaB250LatheMasterPostEngine.ts`, `MitsubishiMV1200RWireEDMMasterPostEngine.ts`.

### 4. MILL_WIZARD — MillingUltimateAI + mill-studio
- **Wire-point:** wizard step 1 (material+op selection).
- **Call:** `await catalogConsumerAdapter.resolve({ consumer: "mill_wizard", material })`
- **Uses:** `ctx.extras.wizard_mode`, `ctx.extras.op_type_default`, `ctx.tools_top` (8 surfaced for user choice).
- **Files:** `MillingUltimateAIEngine.ts`, mill-studio orchestrator.

### 5. LATHE_WIZARD — LatheSpeedFeedCalculatorFacade + LatheSpeedFeedReasoningBridge + lathe-studio
- **Wire-point:** wizard step 1.
- **Call:** `await catalogConsumerAdapter.resolve({ consumer: "lathe_wizard", material })`
- **Uses:** `ctx.extras.op_type_default = "turn"`, `ctx.tools_top` filtered for turning.
- **Files:** `LatheSpeedFeedCalculatorFacadeEngine.ts`, `LatheSpeedFeedReasoningBridgeEngine.ts`, `LatheSpeedFeedShopAwareTuningEngine.ts`.

### 6. WEDM_WIZARD — wire-edm-studio + EDMPostProcessGCode
- **Wire-point:** wizard step 1.
- **Call:** `await catalogConsumerAdapter.resolve({ consumer: "wedm_wizard", material })`
- **Uses:** `ctx.material.iso_group` (drives wire/pulse selection), `ctx.extras.op_type_default = "wedm"`.
- **Files:** `EDMPostProcessGCodeEngine.ts`, `EDMPostProcessorExtension.ts`, wire-edm-studio orchestrator.

### 7. QUOTING — InstantQuote + BlueprintToQuoteBridge + CastingQuote + InjectionMoldQuote + AdditiveQuote + ActualCost
- **Wire-point:** material+tool+coolant cost-line resolution.
- **Call:** `await catalogConsumerAdapter.resolve({ consumer: "quoting", material, op_type, max_per_catalog: 10 })`
- **Uses:** `ctx.extras.coolants_count + coolants_sample` (cost lines), `ctx.extras.density_g_cc` (stock mass), `ctx.extras.cost_per_kg` (material cost), `ctx.tools_top` (tool count → tool-life cost).
- **Files:** `InstantQuoteEngine.ts`, `BlueprintToQuoteBridgeEngine.ts`, `CastingQuoteEngine.ts`, `InjectionMoldQuoteEngine.ts`, `AdditiveQuoteEngine.ts`, `ActualCostEngine.ts`, `CostEstimatorEngine.ts`, `CostEstimationEngine.ts`.

### 8. CADCAM — CAD validation + CAM strategy
- **Wire-point:** DfM check + strategy recommendation.
- **Call:** `await catalogConsumerAdapter.resolve({ consumer: "cadcam", material, op_type, iso_group })`
- **Uses:** `ctx.extras.dfm_iso` (material-class DfM rules), `ctx.extras.gdtgeo_default_tolerance` (ISO 2768 default).
- **Files:** CAD validators + CAM-strategy engines (per-vendor).

## Test coverage shipped this commit

- `mcp-server/src/__tests__/catalogConsumerAdapterBridge.test.ts` — 20+ cases:
  - All 8 consumers covered with shape-specific extras assertions
  - Schema contract (happy + 5 failure/adversarial cases)
  - Robustness (empty input, invalid consumer, max clamping)
  - Wiring anti-regression (all 5 prism_intelligence DB-bridge actions live)

## Next /loop iter — per-consumer 1-line wire-up

Each of the 8 consumer engines needs ONE import + ONE call inserted at the
wire-point above. These are 1-line additions per file. Spec is complete;
implementation deferred to next /goal cron because of context budget.

## Cross-references

- Plan: `state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md`
- Engine: `mcp-server/src/engines/CatalogConsumerAdapterEngine.ts`
- Upstream bridge: `mcp-server/src/engines/CatalogUnifiedQueryEngine.ts` (commit `b783f986ab`)
- Dispatcher action: `prism_intelligence:catalog_resolve_for_consumer`
- Schema: `mcp-server/src/schemas/intelligenceActionSchemas.ts` (CONSUMERS_ENUM)
