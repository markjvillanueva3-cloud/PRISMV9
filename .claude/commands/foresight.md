---
composes_with:
  - "/continue-roadmap"
  - "/plan-build"
consumes:
  - "prism_dev:foresight_report"
---
# /foresight — PSAU-FORESIGHT Pre-Build Report

Surface the foresight stack's go/caution/no_go verdict for a proposed
change before any code is written. Composes:
- **RiskForecastEngine** — Laplace-smoothed gate failure predictions
- **KnowledgeGapAwarenessEngine** — canonical-reference prior-art scan
- **ContextBudgetForecastEngine** — 1M-context session survivability
- **TeachingNoGoEngine** — block-and-teach response on hard stops
- **ProgressiveDisclosureEngine** — token-budgeted section selection

## When to run

- Before spawning a multi-agent build (use output to scope the work)
- Before `/continue-roadmap` on a large unit (check context budget)
- After a failing commit cycle (use teaching block to unblock)

## How to run

### Via MCP action (recommended)

```
prism_dev:foresight_report {
  description: "add Kienzle force engine for turning",
  unitClass: "engine_create",
  contextTokensUsed: 240_000,
  modelName: "opus_4_7_1m"
}
```

Returns a report with:
- `verdict`: `go` / `caution` / `no_go`
- `severity`: `ok` / `warn` / `block`
- `summary`: compact status string
- `sections.{risk, knowledgeGap, contextBudget, teachingBlock?}`
- `disclosed`: the token-budgeted section rollup

### Directly via the engine

```ts
import { foresightOrchestratorEngine } from "./engines/ForesightOrchestratorEngine.js";
const report = await foresightOrchestratorEngine.reportFor({
  description: "...",
  contextTokensUsed: 240_000,
});
```

## Verdict interpretation

- **go** → proceed, no blockers
- **caution** → investigate the flagged section before continuing
- **no_go** → do NOT start; the `teachingBlock` explains the fix

## Integration points

- `/plan-build` consumes the foresight verdict in its approval gate
- `pretool-context-forecast.mjs` hook runs the context section alone before writes
- `sessionstart-critical-path.mjs` hook announces critical units on SessionStart
