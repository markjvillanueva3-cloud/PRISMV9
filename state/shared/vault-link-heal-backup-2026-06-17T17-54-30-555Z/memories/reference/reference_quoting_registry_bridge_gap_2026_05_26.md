---
name: reference-quoting-registry-bridge-gap-2026-05-26
description: "2026-05-26 charlie iter42 — research finding. The bridge user named (materials/tooling/holders/coolants/oils/machine-parts/machines/inserts → quoting) is mostly already built. PipelineRegistryBridge exposes 2.9K materials + 95K tools + 910 machines and is consumed by 8 manufacturing pipelines, but ZERO of the 39 quoting engines consume it. The synergy gap is precise: wire QuoteEstimatorEngine to import PipelineRegistryBridge resolvers. Plus 4 named registry gaps (Holder/Insert/OilLubricant/MachineParts) that DO need new registries."
type: reference
source: prism-memory
synced: 2026-06-17T17:52:56.771Z
aliases: reference_quoting_registry_bridge_gap_2026_05_26
---


## Operator directive

> "bridge/wire databases: materials, tooling, tool holders, coolants, oils, parts for machines, machines, inserts etc..."

(verbatim, mid-loop addition to "continue training the quoting system, deep dive and research")

## Spec location

`state/shared/specs/QUOTING-REGISTRY-BRIDGE-2026-05-26.md` — full punch list + architecture.

## Headline finding (R12 corrected after deeper read)

Initial grep across all 39 Quoting/Quote engines returned 0 registry imports — looked like the entire bridge was missing. **Deeper read corrected this**:

- **PipelineRegistryBridge.ts** (U-ARCH3, mcp-server/src/engines/) is the canonical resolver suite. Exposes:
  - 2.9K materials via MaterialRegistry → CANONICAL_MATERIAL_DB → ISO default
  - 95K tools via ToolRegistry → input params → synthetic
  - 910 machines via MachineRegistry → input params → safe defaults
- **8 manufacturing pipelines USE it**: Grinding/Laser/Milling/MillTurnSwiss/MultiAxis/PrintToProgram/Turning/Waterjet
- **0 quoting engines USE it** — the outlier
- **CatalogRegistryBridgeEngine** (write side, 47+ catalog files → registries) is also built but only feeds the registries; it's the upstream side of the same data flow

So the gap is NOT "build a bridge". The gap is "quoting layer doesn't import the existing bridge". Quoting-baseline-bootstrap.mjs hardcodes `machine_rate_usd_per_hr: 95` and `estimated_material_spend_usd: 50` because the bootstrap path bypasses the registry resolvers entirely.

## Lesson (Karpathy R8 — read before you write)

The graph signal `u-arch3-registry-bridge` flagged on my first Pre-Write hook. I ignored it initially and started writing a `QuotingRegistryBridgeEngine` spec — only to discover the bridge already exists. R8 saves: check before declaring a gap.

## Registry GAPS (operator-named, NOT yet built)

| Registry | Operator named as | Status |
|---|---|---|
| HolderRegistry | "tool holders" | **GAP** — does not exist |
| InsertRegistry | "inserts" | **GAP** — subset of ToolRegistry needs verification |
| OilLubricantRegistry | "oils" | **GAP** — only CoolantRegistry exists |
| MachinePartsRegistry | "parts for machines" | **GAP** — does not exist |

These 4 require new registry files. The others (Material/Tool/Machine/Coolant/Coating/etc) are built.

## Unit punch list (priority order)

1. **U-QP-CONSUME-PIPELINE-BRIDGE** — wire QuoteEstimatorEngine to import resolveMaterial/resolveTool/resolveMachine from PipelineRegistryBridge. SMALL, HIGHEST leverage. Closes the bootstrap placeholder gap.
2. **U-QP-BOOTSTRAP-REAL-DEFAULTS** — modify `scripts/quoting-baseline-bootstrap.mjs::deriveRecordDefaults` to use the same resolvers, replacing $95/hr and $50 placeholders.
3. **U-QP-BRIDGE-COOLANT** — add CoolantRegistry resolver alongside (smaller registry, $-share is smaller too).
4. **U-NEW-HOLDER-REGISTRY** — build HolderRegistry.ts (new registry file).
5. **U-NEW-INSERT-REGISTRY** — verify if subset of ToolRegistry; if not, build InsertRegistry.ts.
6. **U-NEW-OIL-LUBRICANT-REGISTRY** — build OilLubricantRegistry.ts.
7. **U-NEW-MACHINE-PARTS-REGISTRY** — build MachinePartsRegistry.ts (spindle bearings, ballscrews, way covers — for amortization input).
8. **U-QP-BRIDGE-FULL-CHAIN** — end-to-end test: real customer + real material + real machine + real tools → real quote.

## Composes with

- `PipelineRegistryBridge` (the existing canonical resolver suite)
- `JobCostingEngine` (already imports physics/constants but not registries)
- `MarketMaterialPricingEngine` (market-rate overrides for spot-priced materials)
- `ToolCostPredictorEngine` + `ToolCostPerPartEngine` (per-part amortization)
- `ScrapRiskPricingEngine` + `TolerancePricingImpactEngine` (cost overlays)

## Same-session ship (iter41 close-out)

Before this research, this session also shipped:
- iter41 commit `c83111d893` — U-QP-EXTEND-NON-CUSTOMER-FILTERS-V3 — closed 6 new R12 leak classes (TRIBAL+WIKI, TOOLING CAD FILES, OldVersions, CHAT-GPT TEST PROMPT PARTS, mill-turn/MILLTURN, POSTS AND MACHINES). 29/29 tests PASS, baseline regen clean.

## Cross-refs

- [[reference-quoting-completeness-goal-20-2026-05-25]] — charlie 5/25 /goal-20 session
- [[reference-quoting-pipeline-ms0-shipped-2026-05-24]] — quoting pipeline shipped 5/24
- [[reference-quoting-active-factor-runtime-2026-05-25]] — active-factor runtime + CoV
- [[u-arch3-registry-bridge]] — the existing PipelineRegistryBridge (graph-known)
- [[reference-quoting-pipeline-session-2026-05-26]] — overnight 21-iter calibration session
