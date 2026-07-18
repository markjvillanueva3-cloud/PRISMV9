# Leverage-ranked wiring queue (sierra)

> Wire highest-impact-per-wire FIRST. Source: `state/shared/system-viz/architecture-graph.json` (OOM-safe). Domains: 2 · unwired engines: 6 · need dispatcher inference: 0. Regenerate: `node scripts/leverage-ranked-wiring-queue.mjs`.

| # | domain | unwired | cov% | leverage | hops | suggested dispatchers |
|---|--------|---------|------|----------|------|------------------------|
| 1 | MiscDomains | 5 | 100 | 5 | 2 | disp.aidispatcher |
| 2 | Other | 1 | 100 | 3 | 2 | disp.algorithmdispatcher, disp.intelligencedispatcher, disp.contextdispatcher |

_`*` = leverage derived (graph didn't pre-compute). Per-engine refinement needs the merged graph (548MB). Cross-ref: [[reference_sierra_leverage_ranked_wiring_queue]] · `SIERRA-HIGH-LEVERAGE-OPPORTUNITIES-2026-05-29.md`._