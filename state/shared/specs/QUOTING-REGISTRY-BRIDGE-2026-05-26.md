# Quoting ↔ Registry Bridge — synergy gap spec

**Authored:** 2026-05-26, slot:charlie, claude-3748286f, /loop iter2 (post iter41 ship).
**Scope:** wire-in spec for the user-named "bridge/wire databases: materials, tooling, tool holders, coolants, oils, parts for machines, machines, inserts" directive.
**Status:** RESEARCH + SPEC — implementation deferred to per-leg units (see §Unit punch list).

---

## R12 finding (corrected after deeper read)

PRISM has **27 registries** at `mcp-server/src/registries/` AND already has a **PipelineRegistryBridge** at `mcp-server/src/engines/PipelineRegistryBridge.ts` (U-ARCH3) that exposes:

- **2.9K materials** via `MaterialRegistry → CANONICAL_MATERIAL_DB → ISO group default`
- **95K tools** via `ToolRegistry (by catalog/ID) → input params → synthetic default`
- **910 machines** via `MachineRegistry (by brand+model) → input params → safe defaults`

**8 print-to-program / assembler pipelines USE this bridge** (verified by grep):
`GrindingProgramAssembler`, `LaserProgramAssembler`, `MillingPrintToProgram`, `MillTurnSwissPipeline`, `MultiAxisPrintToProgram`, `PrintToProgramPipeline`, `TurningPrintToProgram`, `WaterjetProgramAssembler`.

**ZERO Quote* / Quoting* engines consume the bridge** (verified by grep across all 39 quoting engines). The synergy gap is precise:

- **The write side exists**: `CatalogRegistryBridgeEngine` (47+ catalogs → registry enrichment) — DONE
- **The read side exists**: `PipelineRegistryBridge` (registries → 8 manufacturing pipelines) — DONE
- **Quoting is the outlier**: 39 quoting engines, 0 imports of either bridge. Bootstrap defaults (`machine_rate_usd_per_hr: 95`, `estimated_material_spend_usd: 50`) are pure placeholders that bypass the registries.

The substrate is **BUILT** + the **BRIDGE IS WIRED FOR 8 PIPELINES**, but **QUOTING DOESN'T CONSUME IT**. The user's directive lands on the exact missing edge.

## Existing registry inventory (the cold side of the bridge)

| Registry | File | Domain | Status |
|---|---|---|---|
| MaterialRegistry | `registries/MaterialRegistry.ts` | Workpiece materials (Kc1.1, ρ, ISO group) | ✓ built, NOT quoting-wired |
| ToolRegistry | `registries/ToolRegistry.ts` | Cutting tools (Ø, # flutes, coating) | ✓ built, NOT quoting-wired |
| ToolGeometryDefaults | `registries/ToolGeometryDefaults.ts` | Tool geometry seeds | ✓ built |
| MachineRegistry | `registries/MachineRegistry.ts` | Machine capabilities (spindle kW, X/Y/Z, RPM) | ✓ built, NOT quoting-wired |
| MachineSpindleDefaults | `registries/MachineSpindleDefaults.ts` | Per-machine spindle defaults | ✓ built |
| CoolantRegistry | `registries/CoolantRegistry.ts` | Coolants + flood/MQL/dry | ✓ built, NOT quoting-wired |
| CoatingRegistry | `registries/CoatingRegistry.ts` | Tool coatings (TiAlN, AlCrN, DLC, etc) | ✓ built |
| PostProcessorRegistry | `registries/PostProcessorRegistry.ts` | Per-controller posts | ✓ built |
| CAMSystemRegistry | `registries/CAMSystemRegistry.ts` | Mastercam/hyperMILL/etc | ✓ built |
| ToolpathStrategyRegistry | `registries/ToolpathStrategyRegistry.ts` | Strategy → engine | ✓ built |
| FormulaRegistry | `registries/FormulaRegistry.ts` | Physics formulas | ✓ built |
| PhysicsMappingRegistry | `registries/PhysicsMappingRegistry.ts` | Material ↔ physics | ✓ built |
| AlgorithmRegistry | `registries/AlgorithmRegistry.ts` | Algorithm catalog | ✓ built |
| KnowledgeBaseRegistry | `registries/KnowledgeBaseRegistry.ts` | KB lookup | ✓ built |
| AISubsystemRegistry | `registries/AISubsystemRegistry.ts` | AI subsystem catalog | ✓ built |
| AgentRegistry | `registries/AgentRegistry.ts` | Multi-agent catalog | ✓ built |
| AlarmRegistry | `registries/AlarmRegistry.ts` | Alarm definitions | ✓ built |
| HookRegistry | `registries/HookRegistry.ts` | Hook catalog | ✓ built |
| SkillRegistry | `registries/SkillRegistry.ts` | Skill catalog | ✓ built |
| DatabaseRegistry | `registries/DatabaseRegistry.ts` | Database connections | ✓ built |
| ScriptRegistry | `registries/ScriptRegistry.ts` | Script catalog | ✓ built |
| SkillQualityRegistryBuilder | `registries/SkillQualityRegistryBuilder.ts` | Skill quality | ✓ built |
| (15 of 27 listed) |  |  |  |

## Registry GAPS (operator-named, not yet built)

| Registry | Operator named as | Status |
|---|---|---|
| **HolderRegistry** | "tool holders" | **GAP — does not exist** |
| **InsertRegistry** | "inserts" | **GAP — does not exist** (subset of ToolRegistry?) |
| **OilLubricantRegistry** | "oils" | **GAP — only CoolantRegistry exists** |
| **MachinePartsRegistry** | "parts for machines" | **GAP — does not exist** |
| **WireConsumableRegistry** | (WEDM electrodes, brass wire) | likely subset of MaterialRegistry — needs verification |

## Bridge architecture (proposed)

**DO NOT** build a new bridge engine. PRISM's PipelineRegistryBridge already handles material+tool+machine resolution for 8 manufacturing pipelines. The work is to **consume** the existing bridge from the quoting layer:

```
QuoteEstimatorEngine.estimate(spec)
    ↓
   [NEW WIRING] import { resolveMaterial, resolveTool, resolveMachine }
                from "./PipelineRegistryBridge.js"
    ↓
const matCtx = await resolveMaterial(spec.material)       // 2.9K materials
const toolCtx = await Promise.all(spec.tools.map(resolveTool))  // 95K tools
const machCtx = await resolveMachine(spec.machine_brand, spec.machine_model)  // 910 machines
    ↓
   [NEW WIRING] coolant + (future) holder + insert + oil resolvers
    ↓
EnrichedQuoteSpec — replaces placeholder defaults with real registry values
    ↓
JobCostingEngine → final quote
```

**Composes with (does NOT replace)**:
- `PipelineRegistryBridge` — the canonical resolver suite (already built, just consume it)
- `JobCostingEngine` — quote-time cost math (already wired into QuotingEngine)
- `MarketMaterialPricingEngine` — market-rate overrides for spot-priced materials
- `ToolCostPredictorEngine` + `ToolCostPerPartEngine` — per-part amortization
- `ScrapRiskPricingEngine` — risk-adjusted overlay
- `TolerancePricingImpactEngine` — tolerance-driven cost adders

**Composes with (does NOT replace)**:
- `JobCostingEngine` — quote-time cost math (already wired)
- `MarketMaterialPricingEngine` — market-rate overrides for spot-priced materials
- `ToolCostPredictorEngine` + `ToolCostPerPartEngine` — per-part amortization
- `ScrapRiskPricingEngine` — risk-adjusted overlay
- `TolerancePricingImpactEngine` — tolerance-driven cost adders

## Unit punch list (priority order)

| # | Unit | Effort | Leverage |
|---|---|---|---|
| 1 | `U-QP-BRIDGE-MATERIAL-WIRE` — connect MaterialRegistry → quoting (replace `estimated_material_spend_usd: 50` placeholder) | S | **HIGH** — the bootstrap's #1 gap |
| 2 | `U-QP-BRIDGE-MACHINE-RATE` — connect MachineRegistry → quoting (replace `machine_rate_usd_per_hr: 95` placeholder) | S | **HIGH** — bootstrap #2 gap |
| 3 | `U-QP-BRIDGE-TOOL-COST` — connect ToolRegistry + ToolCostPredictor → quoting | M | HIGH |
| 4 | `U-QP-BRIDGE-COOLANT-COST` — connect CoolantRegistry → quoting | S | MED |
| 5 | `U-QP-BRIDGE-ENGINE` — single `QuotingRegistryBridgeEngine` composing 1-4 with one consumer | M | HIGH (consolidation) |
| 6 | `U-NEW-HOLDER-REGISTRY` — build `HolderRegistry.ts` (operator-named gap) | M | MED — pre-req for tool-holder cost |
| 7 | `U-NEW-INSERT-REGISTRY` — build `InsertRegistry.ts` (or extend ToolRegistry with insert subschema) | M | MED |
| 8 | `U-NEW-OIL-LUBRICANT-REGISTRY` — build `OilLubricantRegistry.ts` | M | LOW (small $-share) |
| 9 | `U-NEW-MACHINE-PARTS-REGISTRY` — build `MachinePartsRegistry.ts` (spindle bearings, ballscrews, way covers, etc — amortization input) | M | MED |
| 10 | `U-QP-BRIDGE-FULL-CHAIN` — end-to-end test: real customer + real material + real machine + real tools → real quote | L | **HIGHEST** — proves the synergy |

## Why "the bridge IS the missing synergy"

The user's directive maps 1:1 to PRISM's deepest existing architecture pattern: the **16 deep-integration bridges** referenced in `BUILD_STATE` (bridge units available: 42 — 26 wiring + 16 deep-integration). Sixteen bridges, one of which is `QuotingRegistryBridgeEngine` shaped like above. The session-start banner names "bridge units available" because they're the recognized highest-leverage class of work.

The cold-side substrate (the 27 registries) has been BUILT over months. The quoting layer's defaults are placeholder values that look reasonable but are **not driven by the actual registry data**. Wiring this bridge will:
- Replace `machine_rate_usd_per_hr: 95` with per-machine real rates ($55-$190 range across JM Die fleet)
- Replace `estimated_material_spend_usd: 50` with `material.$/lb × stock weight from CAD volume × ρ`
- Add `tooling_amortized_cost_usd` from ToolRegistry × wear model
- Add `coolant_cost_usd` from CoolantRegistry × flood-rate × cycle-time
- Make the training loop converge on REAL economics, not synthetic placeholders

## Cross-refs

- [[u-qp-extend-non-customer-filters-v3]] — iter41 (just shipped) — proves the bootstrap can produce clean customer data; bridge is the next layer above
- [[reference-quoting-pipeline-session-2026-05-26]] — overnight 21-iter calibration session; this spec is the next-level integration after that loop
- [[feedback_psn_definition]] — PSN leg #7 (Engines) + leg #8 (Algorithms) wired through this bridge
- [[bridge-units]] / [[deep-integration-bridges]] — the canonical PRISM bridge pattern
- BUILD_STATE.json — bridge units available: 42

## Next iter

`U-QP-BRIDGE-MATERIAL-WIRE` — smallest, highest-leverage. Read `MaterialRegistry.ts` API, modify `quoting-baseline-bootstrap.mjs::deriveRecordDefaults` to look up real material $/lb when CAD volume × ρ is known, fall back to current $50 placeholder only when material is unrecognized. Add per-record `material_id` field. Add tests against MaterialRegistry's 20+ canonical materials.
