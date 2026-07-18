# Pipeline Reachability Audit — Ground-Truth vs SVI

**Generated:** 2026-06-24T15:08:48Z (UTC)
**Auditor:** scheduled task `pipeline-reachability-audit` (autonomous run; supersedes 2026-06-22 run)
**Method:** static source scan of all 9 pipeline engines in `H:/prism/mcp-server/src/engines/`, cross-checked against the live `PIPELINES` array in `H:/prism/.claude/helpers/svi-refresh.mjs` (authoritative SVI source, updated 2026-04-01).

---

## TL;DR

1. **The SVI reach values quoted in the task brief are stale.** Brief listed Print 90 / Turning 74 / MultiAxis 91 / MillTurn 92 / EDM 38 / Grinding 52 / Laser 37 / Waterjet 36 / QuoteToShip 51. The **live** `svi-refresh.mjs` array carries *different, higher* numbers: Print 94 / Turning 78 / MultiAxis 93 / MillTurn 93 / EDM 72 / Grinding 68 / Laser 58 / Waterjet 55 / QuoteToShip 72. Against either baseline the hardcoded reach **overreports** measured direct reachability for every pipeline.

2. **Registries are wired through one indirection — `PipelineRegistryBridge.ts`** (`resolveMaterial` / `resolveMachine` / `resolveTool`). Direct named-registry grep returns ~0 because pipelines call bridge resolvers, not registries directly. The bridge connects **Material + Machine + Tool**; it does **not** touch ToolpathStrategy / Formula / Algorithm registries.

3. **Highest-confidence defect: `EDMProgramAssemblerEngine` imports the bridge zero times** → reaches **no registry at all**, yet SVI credits it `materials,machines`. Every other CNC pipeline imports the bridge.

4. **`tools` and `strategies` registry credits are fictional for the milling family.** SVI lists `tools` and `strategies` for Print/MultiAxis/MillTurn, but **no pipeline calls `resolveTool`** and **none import `ToolpathStrategyRegistry`**. The bridge *exposes* `resolveTool` — it is never invoked.

5. **PostProcessor is directly wired in exactly one pipeline — `QuoteToShipOrchestratorEngine`** (lazy `_getEngine("PostProcessorPipelineEngine")`, stage 17). The cutting pipelines only carry a `postprocessor_applied?: boolean` status flag set by an *external* autopilot chain; they never call `PostProcessorPipelineEngine` themselves.

6. **Several hardcoded `dialects` counts are inflated** vs the actual controller unions in source (§3).

> **Honesty caveat (R12):** the strict "ACTUAL" scores below count only *direct* in-file connections. They deliberately do **not** credit the bridge indirection as full reachability, nor the external PostProcessor autopilot chain. The absolute deltas therefore overstate the practical gap for the milling family — those pipelines genuinely resolve materials/machines through the bridge. The **relative ranking** and the **named structural gaps** (EDM bridge-less, phantom tool/strategy credits, single direct-PP consumer, inflated dialect counts) are the actionable ground truth.

---

## 1. Connection matrix (from source)

| Pipeline | Bridge import | Registries reached | Canonical physics engines | Direct PostProcessor | Controller dialects (own table) |
|---|---|---|---|---|---|
| PrintToProgram | ✅ | Material, Machine (2/6) | Kienzle const + Chatter engine (+autoSpeedFeed proxy for SFO) | ❌ (flag only) | delegated via brand→probe/gcode map (~8) |
| Turning | ✅ | Material, Machine (2/6) | Chatter engine (1/4) | ❌ (flag only) | 8 (fanuc, haas, mazak, okuma, siemens, dmg_mori, citizen, star) |
| MultiAxis | ✅ | Material, Machine (2/6) | none (0/4) | ❌ (flag only) | free-form `controller?: string` (~1) |
| MillTurn | ✅ | Material, Machine (2/6) | Kienzle const (1/4) | ❌ (flag only) | 5 (fanuc, mazak, siemens, index, citizen) |
| EDM | ❌ **none** | **0/6** | none (0/4) | ❌ | 5 (mitsubishi, sodick, makino, agie, fanuc) |
| Grinding | ✅ | Material, Machine (2/6) | none (0/4) | ❌ | 6 (fanuc, siemens, studer, kellenberger, junker, generic) |
| Laser | ✅ | Material, Machine (2/6) | none (0/4) | ❌ | 7 (fanuc, siemens, trumpf, bystronic, mazak, amada, generic) |
| Waterjet | ✅ | Material, Machine (2/6) | none (0/4) | ❌ | 6 (omax, flow_mach, wardjet, techni, bystronic_wj, generic_wj) |
| QuoteToShip | ❌ (orchestrator) | Machine ref (1/6) | **SFO + Kienzle + Chatter + Thermal (4/4)** lazy-loaded via `_getEngine` | ✅ (`_getEngine`, stage 17) | 0 own table |

QuoteToShip physics/PP confirmed as **real** lazy singletons (`require("./SpeedFeedOrchestratorEngine.js")` etc.), not string mentions.

---

## 2. Actual vs reported reachability

Scoring per task brief: `reach = 0.40·(reg/6) + 0.30·(phys/4) + 0.10·has_PP + 0.20·(dialects/20)`.

| Pipeline | reg/6 | phys/4 | PP | dia/20 | **ACTUAL** | SVI (live) | SVI (brief) | Δ vs live | Flag |
|---|---|---|---|---|---|---|---|---|---|
| PrintToProgram | 2 | 2 | 0 | 8 | **36.3%** | 94% | 90% | −57.7 | OVERREPORT |
| Turning | 2 | 1 | 0 | 8 | **28.8%** | 78% | 74% | −49.2 | OVERREPORT |
| MultiAxis | 2 | 0 | 0 | 1 | **14.3%** | 93% | 91% | −78.7 | OVERREPORT |
| MillTurn | 2 | 1 | 0 | 5 | **25.8%** | 93% | 92% | −67.2 | OVERREPORT |
| EDM | 0 | 0 | 0 | 5 | **5.0%** | 72% | 38% | −67.0 | OVERREPORT (worst structural) |
| Grinding | 2 | 0 | 0 | 6 | **19.3%** | 68% | 52% | −48.7 | OVERREPORT |
| Laser | 2 | 0 | 0 | 7 | **20.3%** | 58% | 37% | −37.7 | OVERREPORT |
| Waterjet | 2 | 0 | 0 | 6 | **19.3%** | 55% | 36% | −35.7 | OVERREPORT |
| QuoteToShip | 1 | 4 | 1 | 0 | **46.7%** | 72% | 51% | −25.3 | OVERREPORT (closest) |

No pipeline *under*-reports. Every hardcoded reach exceeds measured direct reachability — Ψ (psi) is inflated system-wide.

---

## 3. Hardcoded SVI fields that contradict source

| Field in `svi-refresh.mjs` | Claimed | Source truth | Action |
|---|---|---|---|
| PrintToProgram `registries` | materials,tools,machines,strategies | materials,machines (bridge); **no tools call, no strategy import** | drop `tools,strategies` |
| MultiAxis `registries` | materials,tools,machines,strategies | materials,machines | drop `tools,strategies` |
| MillTurn `registries` | materials,tools,machines,strategies | materials,machines | drop `tools,strategies` |
| Turning / Grinding `registries` | …,tools,… | materials,machines (no `resolveTool` call) | drop `tools` |
| QuoteToShip `registries` | materials,tools,machines | Machine ref only (material lookup is a price-key, not a registry) | → `machines` |
| EDM `registries` | materials,machines | **NONE — no bridge import** | wire bridge, or set empty |
| EDM `dialects` | 6 | **5** (union has 5 members) | 6 → 5 |
| MillTurn `dialects` | 12 | 5 (controller union) | 12 → 5 |
| MultiAxis `dialects` | 15 | ~1 (free-form string, no enumerated set) | 15 → 1 (or enumerate a real union) |
| PrintToProgram `dialects` | 20 | ~8 (delegated brand→controller map) | 20 → 8 |
| Turning `dialects` | 20 | 8 (controller union) | 20 → 8 |
| Laser / Waterjet / Grinding `dialects` | 7 / 6 / 6 | 7 / 6 / 6 ✅ | keep |

---

## 4. Lowest-reachability pipelines & the connections that move them most

**1. EDM — ACTUAL 5.0% (worst).** Root cause: `EDMProgramAssemblerEngine.ts` never imports `PipelineRegistryBridge`, so it resolves no material or machine data — the only pipeline in this state.
   - **Fix (cheapest, highest Ψ-per-effort):** add `import { resolveMaterial, resolveMachine } from "./PipelineRegistryBridge.js";` and call both → reg 0→2/6 → **5.0% → 18.3%**.
   - **Plus `resolveTool`** (bridge already exposes it) → reg 3/6 → **~25%**.
   - EDM has no Kienzle/Chatter applicability (non-contact thermal erosion), so the 0 physics term is *expected*, not a defect.

**2. MultiAxis — ACTUAL 14.3%.** Two real gaps: zero canonical physics engine, free-form `controller` string instead of an enumerated union.
   - **Wire `chatterStabilityLobeEngine`** (5-axis chatter is the dominant failure mode) → phys 0→1/4 → **+7.5 → 21.8%**.
   - **Enumerate a real controller union** (heidenhain, siemens-840D, fanuc-5ax, mazak, okuma-OSP = 5) → **+5 → ~27%**.

**3. Grinding / Waterjet / Laser — ACTUAL 19–20%.** Registry term fine (bridge). Drag is zero physics + no direct PostProcessor; already dialect-rich.
   - **Direct `PostProcessorPipelineEngine` call** to replace the externally-set flag (+10 pts each).
   - **Grinding: wire `thermalWearCouplingEngine`** (grind-burn thermal model) → phys 0→1/4 (+7.5).

**4. Cutting family (Print/Turning/MillTurn).** Gap is mostly the formula not crediting the bridge + external PP chain. Real improvement = a **direct PostProcessor call** (currently flag-only): raises the honest score and removes hidden dependence on autopilot chain ordering.

**Prioritized by Ψ-impact ÷ effort:**
1. **EDM → wire PipelineRegistryBridge (material+machine+tool).** +13–20 pts, ~10 lines. Fixes a true zero-connection state.
2. **Correct inflated hardcoded fields (§3)** so Ψ stops over-reporting fleet-wide. Pure data edit, no engine risk.
3. **Direct PostProcessor call in the 4 assemblers + 4 cutting pipelines** (replace `postprocessor_applied` flag with a real `_getEngine`/import call). +10 pts each; removes chain-order fragility.
4. **MultiAxis: wire ChatterStabilityLobeEngine + enumerate controller union.** +12 pts.
5. **Grinding: wire ThermalWearCouplingEngine.** +7.5 pts.

---

## 5. Suggested `svi-refresh.mjs` PIPELINES array update

Correct the `registries`/`dialects` fields to match source and replace hardcoded `reach` with measured values:

```js
const PIPELINES = [
  { name: "PrintToProgram", stages: 26, registries: "materials,machines", formulas: 18, dialects: 8, reach: "36%" },
  { name: "Turning",        stages: 10, registries: "materials,machines", formulas: 12, dialects: 8, reach: "29%" },
  { name: "MultiAxis",      stages: 14, registries: "materials,machines", formulas: 18, dialects: 1, reach: "14%" },
  { name: "MillTurn",       stages: 16, registries: "materials,machines", formulas: 20, dialects: 5, reach: "26%" },
  { name: "EDM",            stages: 8,  registries: "",                   formulas: 6,  dialects: 5, reach: "5%"  }, // wire bridge -> re-score
  { name: "Grinding",       stages: 10, registries: "materials,machines", formulas: 8,  dialects: 6, reach: "19%" },
  { name: "Laser",          stages: 8,  registries: "materials,machines", formulas: 5,  dialects: 7, reach: "20%" },
  { name: "Waterjet",       stages: 8,  registries: "materials,machines", formulas: 5,  dialects: 6, reach: "19%" },
  { name: "QuoteToShip",    stages: 21, registries: "machines",           formulas: 12, dialects: 1, reach: "47%" },
];
```

> **Caveat before committing:** these `reach` values are the *strict direct-call* floor — they do not credit the `PipelineRegistryBridge` indirection as full registry connectivity. If SVI policy intends reach to credit the bridge (defensible — it is genuinely wired and tested), recompute with the bridge counted and the milling-family numbers rise materially. The **field corrections** (drop phantom `tools`/`strategies`, fix EDM's zero-registry state, fix inflated dialect counts) stand regardless of the reach convention chosen.

---

## 6. Evidence trail (file:line)

- Bridge & its 3 registries: `PipelineRegistryBridge.ts:107` (`getMaterialRegistry`), `:119` (`getMachineRegistry`), `:131` (`getToolRegistry`); exports `resolveMaterial:176`, `resolveMachine:375`, `resolveTool:508`.
- EDM has no bridge import: `EDMProgramAssemblerEngine.ts` — 0 matches for `PipelineRegistryBridge` / `resolveMaterial` / `resolveMachine`.
- EDM dialect union (5): `EDMProgramAssemblerEngine.ts:37`.
- QuoteToShip real physics/PP lazy-loaders: `QuoteToShipOrchestratorEngine.ts:200-205` (SFO), `:263-268` (PostProcessor), `:333-338` (Chatter), `:396-401` (Thermal), call site `:2472`.
- Cutting-family PP is flag-only: `PrintToProgramPipelineEngine.ts:427`, `TurningPrintToProgramEngine.ts:228`, `MultiAxisPrintToProgramEngine.ts:186`, `MillTurnSwissPipelineEngine.ts:479` (`postprocessor_applied?: boolean`).
- Live SVI hardcoded array: `H:/prism/.claude/helpers/svi-refresh.mjs:134-143`.

*End of audit.*
