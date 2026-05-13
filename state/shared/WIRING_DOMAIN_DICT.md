# Wiring Domain Dictionary

> Generated: 2026-05-13T23:44:10.118Z
> Source: `scripts/build-wiring-domain-dict.mjs`
> Engines: 3198 files in `H:/prism/mcp-server/src/engines`
> Dispatchers: 85 domains in `H:/prism/mcp-server/src/tools/dispatchers`

Matched prefixes: **68**
Unmatched prefixes: **973**

## Top candidates (unmatched — wire next)

| Prefix | Engine count | Δ vs prior | First seen | Sample engines |
|--------|-------------:|----------:|------------|----------------|
| `Lathe` | 188 | — | 2026-05-13T23:44:10.118Z | LatheActiveLearningEngine, LatheActualCostReconciliationEngine, LatheActualFeedbackTuningEngine |
| `WEDM` | 137 | — | 2026-05-13T23:44:10.118Z | WEDMAccessibilityEngine, WEDMActiveQueryEngine, WEDMAdaptivePassEngine |
| `Hyper` | 68 | — | 2026-05-13T23:44:10.118Z | HyperCADCADExecutionBridge, HyperCADCADFunctionIndexEngine, HyperCADSAutomationEngine |

## Promoted (Mark-curated)

_No prefixes promoted yet. Move entries from `candidates[]` into `promoted{prefix: dispatcherTarget}` once you've decided on a dispatcher._

## Top matched prefixes (already wired)

| Prefix | Dispatcher | Engine count |
|--------|------------|-------------:|
| `PP` | `pp` | 79 |
| `CAD` | `cad` | 66 |
| `CAM` | `cam` | 57 |
| `Machine` | `machine` | 45 |
| `Multi` | `multi` | 28 |
| `Turning` | `turning` | 24 |
| `Mill` | `mill` | 23 |
| `Adaptive` | `adaptive` | 21 |
| `EDM` | `edm` | 19 |
| `Hook` | `hook` | 16 |

> Advisory only — `candidates` are heuristic suggestions; Mark promotes manually.