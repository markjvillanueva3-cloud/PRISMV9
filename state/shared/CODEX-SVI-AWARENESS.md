# PRISM System Variability Index (SVI) — Cross-Terminal Awareness

## What This Is
PRISM has a `SystemVariabilityIndexEngine` that computes a single number representing
the total manufacturing intelligence state space. Every terminal (Claude Code, Codex,
Desktop Claude) should be aware of this metric and reference it when making decisions.

Canonical shared directive:
- `C:/PRISM/state/shared/CLAUDE-CODEX-SVI-DIRECTIVE.md`

## Live State Files (READ THESE)
- `C:/PRISM/state/shared/SVI.json` — Full JSON report with per-subsystem breakdown
- `C:/PRISM/state/shared/SVI-compact.md` — Human-readable markdown dashboard
- `C:/PRISM/state/shared/SVI-watch-status.json` — Always-on watcher status, last trigger, changed areas, and coverage alerts
- `C:/PRISM/state/shared/SVI-watch-status.md` — Human-readable watcher status for Claude/Codex reconnects

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
- `prism_dev:svi_read` — auto-refresh if watched system surfaces changed, then return the live report
- `prism_dev:svi_summary` — auto-refresh if watched system surfaces changed, then return a compact summary

Auto-watch surfaces now include:
- materials, tools, and machines registries
- formula catalog and algorithms source
- engines, dispatchers, routes, and schemas
- database schema and roadmap action index

This means session boot and successful builds can now tell us immediately when newly added features or expanded data surfaces should be reflected in SVI coverage.
The MCP server now also starts an always-on SVI auto-watch loop at boot, so Claude/Codex sessions should expect these files to stay current while the server is running.

## For Claude Terminals
Every `/startup` should show SVI in the work surface. Read `SVI-compact.md` or call
`svi_summary`. After any session that adds engines, wires registries, or connects
pipelines, run `svi_compute` to update the index.

## Architecture
- Engine: `mcp-server/src/engines/SystemVariabilityIndexEngine.ts`
- Dispatcher: `prism_dev` (devDispatcher) — actions: svi_compute, svi_read, svi_summary
- REST: `/api/v1/dev/svi/compute`, `/api/v1/dev/svi/read`, `/api/v1/dev/svi/summary`
- Shared state: `state/shared/SVI.json` + `state/shared/SVI-compact.md`
- Watch status: `state/shared/SVI-watch-status.json` + `state/shared/SVI-watch-status.md`
- Test: `src/__tests__/svi-engine.test.ts` (7 tests)

## The Big Picture
No competitor can beat a system that has mathematically maximized its variability index.
When Ψ = 100%, every possible valid manufacturing configuration is reachable through
PRISM's physics-validated pipelines. The SVI ceiling (10^43) grows as we add data.
The reachability (40.8%) grows as we wire systems together. Both numbers should only
go up, never down.
