# PRISM System Variability Index (SVI) — Cross-Terminal Awareness

## What This Is
PRISM has a `SystemVariabilityIndexEngine` that computes a single number representing
the total manufacturing intelligence state space. Every terminal (Claude Code, Codex,
Desktop Claude) should be aware of this metric and reference it when making decisions.

## Live State Files (READ THESE)
- `C:/PRISM/state/shared/SVI.json` — Full JSON report with per-subsystem breakdown
- `C:/PRISM/state/shared/SVI-compact.md` — Human-readable markdown dashboard

## Current Metrics
- **SVI**: 1.8 × 10^43 (total combinatorial state space)
- **Ψ (Reachability)**: 40.8% — fraction of state space producing validated output
- **Goal**: Drive Ψ toward 100% by wiring every subsystem to every pipeline

## How It Works
```
SVI_total = ∏(subsystem_variability)
         = Materials × Tools × Machines × Formulas × Algorithms × Strategies × ...

Ψ = reachable_configurations / total_configurations
```

Each subsystem contributes: `entities × dimensions_per_entity × wired_percentage`

## What Increases Ψ (things you should do)
1. **Wire registries to pipelines** — connecting ToolRegistry to Turning pipeline increases tool wired%
2. **Add physics formulas** — new Kienzle/Taylor variants increase formula count
3. **Connect strategies** — wiring CAM strategies to pipelines increases strategy wired%
4. **Add controller dialects** — new post-processor dialects increase output space
5. **Fix dead imports** — every dead import is a missed connection = lower Ψ

## What Increases SVI (total ceiling)
1. **Add materials to registry** — each new material adds 8 dimensions
2. **Add tools to registry** — each new tool adds 10 dimensions
3. **Add machines** — each new machine adds 14 dimensions
4. **Create new engines** — each engine adds 3 configurable behaviors
5. **Create new pipeline stages** — each stage multiplies output space

## For Codex Frontend Work
When building UI, display the SVI on the dashboard. Read from:
```typescript
// Frontend: fetch SVI data
const response = await fetch("/api/v1/dev/svi_read");
const { data } = await response.json();
// data.svi_display = "1.8 × 10^43"
// data.psi_display = "40.8%"
// data.subsystems = [{name, entities, variability, wired_pct, reachable}, ...]
// data.pipelines = [{name, stages, reachability_score}, ...]
```

Backend MCP actions available:
- `prism_dev:svi_compute` — recompute from live system state
- `prism_dev:svi_read` — read last computed report
- `prism_dev:svi_summary` — compact text summary

## For Claude Terminals
Every `/startup` should show SVI in the work surface. Read `SVI-compact.md` or call
`svi_summary`. After any session that adds engines, wires registries, or connects
pipelines, run `svi_compute` to update the index.

## Architecture
- Engine: `mcp-server/src/engines/SystemVariabilityIndexEngine.ts`
- Dispatcher: `prism_dev` (devDispatcher) — actions: svi_compute, svi_read, svi_summary
- Shared state: `state/shared/SVI.json` + `state/shared/SVI-compact.md`
- Test: `src/__tests__/svi-engine.test.ts` (5 tests)

## The Big Picture
No competitor can beat a system that has mathematically maximized its variability index.
When Ψ = 100%, every possible valid manufacturing configuration is reachable through
PRISM's physics-validated pipelines. The SVI ceiling (10^43) grows as we add data.
The reachability (40.8%) grows as we wire systems together. Both numbers should only
go up, never down.
