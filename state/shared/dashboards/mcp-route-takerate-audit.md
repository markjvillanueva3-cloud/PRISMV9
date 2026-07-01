# MCP Route Suggest Take-Rate Audit

**Generated:** 2026-05-26T19:31:57.018Z
**Source:** `H:/prism/state/shared/mcp-route-suggest-stats.json`

## Fleet summary

| Metric | Value |
|--------|-------|
| Total fires | 2296 |
| Total takes | 5 |
| Fleet take-rate | 0.2% |
| Dominant classifier | `backendAuditChain` (73.3% of fires) |
| Health signal | **below-target-take-rate** |

## ℹ Health signal: below-target-take-rate

Take-rate 0.2% is below the 30% target. Window-fix landed (U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND); remaining shortfall is likely from (a) classifiers that fire too eagerly (see per-classifier table), or (b) `_ACTION_TO_CLASSIFIERS` map missing entries for some MCP actions the model uses.

## Per-classifier ranking (by fire count)

| Classifier | Fires | Takes | Take-rate | Share of fires | Recommendation |
|------------|-------|-------|-----------|----------------|----------------|
| `backendAuditChain` | 1682 | 1 | 0.1% | 73.3% | **suppress** |
| `doctrineSurface` | 468 | 4 | 0.9% | 20.4% | **retune** |
| `isLargeRead` | 77 | 0 | 0.0% | 3.4% | **verify-wiring** |
| `isVerboseBash` | 65 | 0 | 0.0% | 2.8% | **verify-wiring** |
| `ollama` | 2 | 0 | 0.0% | 0.1% | **keep** |
| `isBroadGrep` | 1 | 0 | 0.0% | 0.0% | **keep** |
| `isBroadGlob` | 1 | 0 | 0.0% | 0.0% | **keep** |

## Recommendation legend

- **suppress** — ≥30% of fleet fires AND <5% take-rate. Biggest noise reduction available.
- **retune** — <5% take-rate but <30% fire share. Tighten trigger conditions.
- **verify-wiring** — ≥50 fires + 0 takes. Almost certainly a measurement gap, not a real take-rate.
- **keep** — take-rate ≥30%, or too few fires (<10) to judge.

## Re-run

```bash
node H:/prism/scripts/audit-mcp-route-takerate.mjs
```
