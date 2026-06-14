# Leverage-ranked wiring queue (sierra)

> Wire highest-impact-per-wire FIRST. Source: `state/shared/system-viz/architecture-graph.json` (OOM-safe). Domains: 13 · unwired engines: 118 · need dispatcher inference: 3. Regenerate: `node scripts/leverage-ranked-wiring-queue.mjs`.

| # | domain | unwired | cov% | leverage | hops | suggested dispatchers |
|---|--------|---------|------|----------|------|------------------------|
| 1 | MiscDomains | 69 | 96 | 138* | 2 | ⚠ none — needs inference |
| 2 | Other | 22 | 97 | 66 | 2 | disp.algorithmdispatcher, disp.intelligencedispatcher, disp.contextdispatcher |
| 3 | Monolith | 5 | 71 | 10* | 2 | ⚠ none — needs inference |
| 4 | Hyper | 3 | 96 | 6 | 2 | disp.camdispatcher, disp.camfunctiondispatcher |
| 5 | Wet | 3 | 80 | 6 | 2 | disp.diagnosisdispatcher, disp.feasibilitydispatcher |
| 6 | Shop | 2 | 90 | 6 | 2 | disp.shopdispatcher, disp.shoppracticedispatcher, disp.businessdispatcher |
| 7 | Speed | 5 | 74 | 5 | 2 | disp.spdispatcher |
| 8 | Mill | 2 | 97 | 2 | 2 | disp.milldispatcher |
| 9 | Quoting | 2 | 85 | 2 | 2 | disp.quotingdispatcher |
| 10 | Tool | 2 | 97 | 2 | 2 | disp.toolpathdispatcher |
| 11 | Fusion | 1 | 97 | 2 | 2 | disp.cadautomationdispatcher, disp.caddispatcher |
| 12 | Post | 1 | 98 | 2* | 2 | ⚠ none — needs inference |
| 13 | Mastercam | 1 | 96 | 1 | 2 | disp.camdispatcher |

_`*` = leverage derived (graph didn't pre-compute). Per-engine refinement needs the merged graph (548MB). Cross-ref: [[reference_sierra_leverage_ranked_wiring_queue]] · `SIERRA-HIGH-LEVERAGE-OPPORTUNITIES-2026-05-29.md`._