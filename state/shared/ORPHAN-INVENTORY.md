# PRISM Orphan Inventory — built-but-unwired audit punch list

> Generated **2026-05-14T19:20:48.689Z** · graph mtime 2026-05-14T00:50:07.627Z
> Total orphans: **0** · showing top **0**
> Source: `scripts/orphan-inventory.mjs` · regenerate any time

## What is an "orphan"?
A node with **low in-degree (≤1)** AND **low out-degree (≤1)** but **has wiki/memory documentation**. Someone documented it (so it's intentional, not random) but the graph shows no callers/callees. **Most likely candidates for wiring** rather than deletion.

## By suggested dispatcher (heuristic name-based grouping)

## By layer



## 🔌 Actionable unwired engines (from BUILD_STATE.NEEDS_WIRING)

> 870 engines on disk with no dispatcher reference. Top domains by count: BUILD_STATE mtime: 2026-05-14T19:14:48.610Z

Unlike graph orphans above (mostly L7 registry / L8 state pseudo-nodes), these are concrete engine class files on disk with NO dispatcher importing them. Each has a pre-computed dispatcher suggestion — pick one, add action enum + schema + case branch.

**Top unwired domains** (full graph, not just sample): Other (145) · Lathe (89) · Machine (17) · Multi (11) · Turning (11) · Tool (10) · Five (9) · Shop (9)

**WiringPotential ranking** — source `engine`. Engines below carry a `score` column when the engine returned one (higher = better wiring candidate).

### (no suggestion — manual review) — 15 engine(s)
- **BatchProcessor** · score — · mtime 2026-03-06
- **EventEngine** · score — · mtime 2026-03-06
- **MigrationEngine** · score — · mtime 2026-03-06
- **PluginEngine** · score — · mtime 2026-03-06
- **ResponseTemplateEngine** · score — · mtime 2026-03-06
- **RoughnessConversionEngine** · score — · mtime 2026-03-06
- **DataValidationEngine** · score — · mtime 2026-03-07
- **CompactFormatterEngine** · score — · mtime 2026-03-07
- **BatchQueryEngine** · score — · mtime 2026-03-07
- **OutputBudgetEngine** · score — · mtime 2026-03-07
- **PromptTemplateEngine** · score — · mtime 2026-03-07
- **SmartDefaultsEngine** · score — · mtime 2026-03-07
- **ConversationBudgetEngine** · score — · mtime 2026-03-07
- **ToolCallBatchEngine** · score — · mtime 2026-03-07
- **StopConditionEngine** · score — · mtime 2026-03-07

### **prism_ai** — 1 engine(s)
- **CallChainEngine** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-07

### **prism_auth** — 1 engine(s)
- **SessionLifecycleEngine** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-06

### **prism_cad** — 1 engine(s)
- **CadBridge** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-06

### **prism_calc** — 2 engine(s)
- **QuickCalcEngine** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-07
- **ReadOptimizerEngine** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-07

### **prism_cam** — 2 engine(s)
- **GCodeTemplateEngine** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-06
- **CampaignEngine** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-06

### **prism_diagnosis** — 1 engine(s)
- **AlarmEscalationEngine** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-07

### **prism_monitoring** — 1 engine(s)
- **MetricsEngine** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-06

### **prism_quality** — 1 engine(s)
- **SpindleHarmonicsQualityEngine** · score — _(BUILD_STATE.NEEDS_WIRING heuristic)_ · mtime 2026-03-06

---
_Drill: `/master-index <orphan-name>` for full provenance · `/utilization-dashboard` for the full classifier output · `/awareness-snapshot` for the rolled-up digest._
_Thresholds: high-degree ≥2 (in) / ≥3 (out) at 85th pct; low ≤1._