# Cost-Efficiency Bridge — Print-to-Quote Pipeline Scope

**Author:** slot:echo · 2026-05-24
**Closes user directive:** *"bridge print to cad, print to cnc program full pipelines factoring cost efficiency factors like; per part run time, per operation, tooling usage, cost efficiency of tooling choices, program run time, mrr, etc.. to quoting, business management, cost analysis and all other business management systems so the prism app has the most accurate data at all times. everything should auto update upstream and downstream of entry points for data"*

---

## 1. The bridge — one engine, every data edge

A single **`CostEfficiencyBridgeEngine`** sits at the data-flow center. Every upstream entry-point change fires a recompute; every downstream consumer reads the fresh result. No silent drift between subsystems.

```
UPSTREAM ENTRIES (16)                  BRIDGE ENGINE                    DOWNSTREAM CONSUMERS (8)
─────────────────────                ──────────────────                 ──────────────────────
Print/blueprint (PDF) ──┐                                          ┌── Quote estimator
CAD model (STEP/IGES) ──┤                                          ├── Job traveler card
CAM strategy choice ─────┤            ┌────────────────────┐       ├── Capacity planner
Tool selection ──────────┤            │                    │       ├── ERP order
Material lookup ─────────┤            │  CostEfficiency    │       ├── Operator scheduler
Machine selection ───────┼─────────►  │  BridgeEngine      │  ───►├── Cost analyzer
G-code emission ─────────┤            │                    │       ├── SPC database
Runtime prediction ──────┤            │                    │       └── Customer dashboard
Reverse-CAD features ────┤            └────────────────────┘
Tool catalog update ─────┤                     │
Material price tick ─────┤                     ▼
Shop config change ──────┤              ProgramCostReport
Operator override ───────┤              { per_part_min, per_op[],
SPC measurement ─────────┤                tool_costs, mrr_mm3_min,
Tool wear log ───────────┤                cycle_cost_$, quote_$,
Quote acceptance ────────┘                margin_pct, ... }
```

---

## 2. ProgramCostReport — the canonical output

Every consumer reads this shape. One source of truth.

```typescript
interface ProgramCostReport {
  // ─── Provenance ─────────────────────────────────────────────
  program_id: string;             // hash of G-code + machine + tool catalog
  generated_at: string;           // ISO timestamp
  source_program_path?: string;   // .hnc / .nc file path
  source_cad_path?: string;       // STEP / IGES / DXF path

  // ─── Per-part metrics ───────────────────────────────────────
  per_part: {
    cycle_time_sec: number;       // from RuntimePredictor
    cycle_time_min: number;
    spindle_hours: number;
    material_cost_usd: number;    // stock volume × material $/kg × density
    tooling_cost_usd: number;     // tool wear × tool replacement $
    labor_cost_usd: number;       // cycle time × loaded labor rate
    machine_cost_usd: number;     // cycle time × machine hour rate
    overhead_usd: number;         // % of direct costs
    total_cost_usd: number;       // sum above
  };

  // ─── Per-operation breakdown (one entry per tool change) ────
  per_operation: Array<{
    op_index: number;
    tool_number: number;
    tool_name: string;
    op_type: "face" | "pocket" | "contour" | "drill" | "tap" | "bore" | "slot" | "3d_surface" | "adaptive";
    cycle_time_sec: number;
    material_removed_mm3: number;
    mrr_mm3_min: number;          // material removal rate
    chipload_mm: number;
    sfm: number;
    estimated_tool_life_min: number;
    tool_wear_fraction: number;   // 0..1, fraction of tool life consumed
    operation_cost_usd: number;
  }>;

  // ─── Tooling roll-up ────────────────────────────────────────
  tooling: {
    tools_used: number[];
    tool_change_count: number;
    tool_change_time_sec: number;
    total_tool_cost_usd: number;
    most_expensive_tool: { number: number; cost_usd: number; reason: string };
    tool_efficiency_score: number;  // 0..1 (higher = better — minimizes wear per mm3)
  };

  // ─── Performance metrics ────────────────────────────────────
  performance: {
    cutting_time_sec: number;
    rapid_time_sec: number;
    tool_change_time_sec: number;
    spindle_ramp_sec: number;
    air_cut_time_sec: number;     // from reverse-CAD identification
    utilization_pct: number;      // cutting / total
    bottleneck: "feed" | "throttle" | "accel" | "tool-change" | "spindle-ramp" | "overhead";
  };

  // ─── Quote roll-up ──────────────────────────────────────────
  quote: {
    quoted_unit_price_usd: number;
    target_margin_pct: number;
    minimum_quantity: number;     // breakeven
    lead_time_business_days: number;
    confidence: "high" | "medium" | "low";
  };

  // ─── Business analytics ─────────────────────────────────────
  analytics: {
    cost_per_mm3_removed_usd: number;     // efficiency metric
    revenue_per_spindle_hour_usd: number; // capacity metric
    optimization_potential_pct: number;   // from BidirectionalOptimizer
    suggested_savings_usd: number;        // if optimizations applied
  };

  // ─── Cross-references ───────────────────────────────────────
  refs: {
    runtime_prediction_id?: string;
    reverse_cad_id?: string;
    cam_strategy_id?: string;
    quote_id?: string;
    erp_order_id?: string;
  };

  // ─── R12 surfaces ───────────────────────────────────────────
  warnings: string[];             // missing material price, unknown tool wear, etc.
  data_freshness: {
    material_price_age_hours: number;
    tool_catalog_age_hours: number;
    machine_rate_age_hours: number;
  };
}
```

---

## 3. Upstream entry points — 16 data sources that auto-refire the bridge

| # | Entry | Hook trigger | Stale-after |
|---|---|---|---|
| 1 | Print/blueprint PDF dropped | `pdf_blueprint_extract` completes | 1h |
| 2 | CAD model imported | `cad_import_complete` | 1h |
| 3 | CAM strategy changed | `cam_strategy_select` | 5min |
| 4 | Tool selection updated | `cam_tool_select` | 5min |
| 5 | Material registry change | material registry write | 24h |
| 6 | Machine selection switched | `shop_config_change` | session |
| 7 | G-code emission complete | `cam:master_post_*` completes | 5min |
| 8 | Runtime prediction run | `gcode_runtime_predict` completes | 5min |
| 9 | Reverse-CAD reconstruction | `gcode_reverse_cad` completes | 5min |
| 10 | Tool catalog row added | `tool_catalog_update` | 24h |
| 11 | Material price tick | external material-cost feed | 24h |
| 12 | Shop config field changed | `shop_config_update` | session |
| 13 | Operator override applied | operator-edit on traveler | 5min |
| 14 | SPC measurement logged | `spc_measurement_log` | 5min |
| 15 | Tool wear logged | `tool_wear_log` | 5min |
| 16 | Quote accepted by customer | `quote_accept` | session |

**Hook design pattern:** each PostToolUse hook fires `costEfficiencyBridgeEngine.recompute({source: entry_id, payload})`. The engine reads only the deltas that affect the report and emits a `ProgramCostReport` event downstream consumers subscribe to.

---

## 4. Downstream consumers — 8 destinations that auto-pull fresh data

| # | Consumer | Reads from `ProgramCostReport` | Update frequency |
|---|---|---|---|
| 1 | Quote estimator | `.quote`, `.per_part`, `.analytics` | live |
| 2 | Job traveler card | `.per_operation`, `.tooling`, `.per_part.cycle_time_min` | per generation |
| 3 | Capacity planner | `.per_part.spindle_hours`, `.performance.utilization_pct` | hourly roll-up |
| 4 | ERP order | `.quote.quoted_unit_price_usd`, `.quote.lead_time_business_days` | on quote accept |
| 5 | Operator scheduler | `.per_part.cycle_time_min`, `.performance.bottleneck` | shift roll-up |
| 6 | Cost analyzer | `.per_part.total_cost_usd`, `.analytics.cost_per_mm3_removed_usd` | weekly |
| 7 | SPC database | `.per_operation[].cycle_time_sec`, `.per_operation[].mrr_mm3_min` | per run |
| 8 | Customer dashboard | `.per_part`, `.quote`, `.analytics.revenue_per_spindle_hour_usd` | live |

---

## 5. Engines to coordinate (no new engines required — all exist)

| Engine | Role in the bridge |
|---|---|
| `HurcoV11MillMasterPostEngine` (+ Okuma + others) | Source of program emission |
| `GCodeRuntimePredictorEngine` (just shipped) | Source of cycle time |
| `GCodeReverseCADEngine` (just shipped) | Source of finished features + material removed |
| `GCodeBidirectionalOptimizerEngine` (just shipped) | Source of optimization potential $ |
| `autoSpeedFeedEngine` | Source of chipload + SFM per op |
| `ToolLifeAdaptiveEngine` | Source of tool wear fraction |
| `machineStrategyConstraintEngine` | Source of machine hour rate + spindle limits |
| `materialRegistry` (data) | Source of material $/kg + density |
| `shopConfigEngine` | Source of labor rate + overhead % |
| `QuoteEstimatorEngine` (existing) | Reads .per_part + emits .quote |
| `ActualCostEngine` (existing) | Compares predicted vs actual for variance reporting |

The bridge is a **router/aggregator**, not new physics. It calls existing engines in the right order and assembles the report.

---

## 6. Auto-fire hook design (3 highest-leverage this MS, 13 deferred)

Shipping this turn:

| Hook | Trigger | Action |
|---|---|---|
| `cost-bridge-on-program-emit.mjs` | PostToolUse on `cam:master_post_*` actions | Recompute bridge → emit ProgramCostReport for the new program |
| `cost-bridge-on-runtime-predict.mjs` | PostToolUse on `gcode_runtime_predict` | Update `.per_part.cycle_time_*` + `.performance` in last report |
| `cost-bridge-on-reverse-cad.mjs` | PostToolUse on `gcode_reverse_cad` | Update `.per_operation[].material_removed_mm3` + `.analytics.cost_per_mm3_removed_usd` |

Deferred to follow-up MS (named, not built):

- `cost-bridge-on-tool-catalog-update.mjs` — refire when tool prices change
- `cost-bridge-on-material-price-tick.mjs` — refire on material $/kg change
- `cost-bridge-on-machine-rate-change.mjs` — refire on labor/overhead change
- `cost-bridge-on-quote-accept.mjs` — push to ERP
- `cost-bridge-on-spc-log.mjs` — push variance back to predictor for Bayesian calibration
- `cost-bridge-on-tool-wear-log.mjs` — refresh tool-life estimates
- `cost-bridge-on-operator-override.mjs` — capture edit-based learning signal
- `cost-bridge-on-cad-import.mjs` — recompute when CAD changes
- `cost-bridge-on-pdf-extract.mjs` — refire on blueprint update
- `cost-bridge-on-shop-config-change.mjs` — propagate shop changes
- `cost-bridge-on-cam-strategy-select.mjs` — refire on strategy swap
- `cost-bridge-on-cam-tool-select.mjs` — refire on tool selection swap
- `cost-bridge-on-precommit.mjs` — guard against committing programs with stale cost data

---

## 7. Persistence + cross-session memory

`state/shared/cost-efficiency-reports/<program-id>.json` — one file per ProgramCostReport. Indexed by `program_id = hash(gcode + machine_id + tool_catalog_hash)`. Lets the system:

- Compare today's report against yesterday's for the same program (regression detection)
- Roll up weekly cost trends per customer
- Feed the GNN training signal (closes PSN leg #10 — currently UNGRADED)

---

## 8. Success criteria

| Gate | Target |
|---|---|
| Bridge engine compiles + tests pass | 100% |
| All 3 hooks fire on real trigger commands | observed |
| ProgramCostReport schema validates via Zod | strict |
| R12 fail-loud: missing material price → warning not silent zero | enforced |
| Cross-session: report from session A readable in session B | YES |
| Operator edit → bridge re-fires → downstream UI sees delta within 1 round-trip | YES |

---

## 9. Build sequence — this MS scope (per operator approval)

1. `state/shared/cost-efficiency-bridge-scope.md` — this doc ✓
2. `mcp-server/src/engines/CostEfficiencyBridgeEngine.ts` — the aggregator
3. `mcp-server/src/__tests__/CostEfficiencyBridgeEngine.test.ts` — concrete arithmetic + R12 + cross-session
4. `.claude/hooks/cost-bridge-on-program-emit.mjs` — auto-fire hook #1
5. `.claude/hooks/cost-bridge-on-runtime-predict.mjs` — auto-fire hook #2
6. `.claude/hooks/cost-bridge-on-reverse-cad.mjs` — auto-fire hook #3
7. `mcp-server/data/milestones/COST-EFFICIENCY-BRIDGE-MS0.json` — envelope
8. Memory + commit

13 deferred hooks land in COST-EFFICIENCY-BRIDGE-MS1.
