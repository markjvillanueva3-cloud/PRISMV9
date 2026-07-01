# SEARCH-PREPLOT/U-SEARCH-PLOT-QUERY — [MAIN] [SEARCH-PREPLOT]/U-SEARCH-PLOT-QUERY (slot:alpha): query consumer for the 3-surface search pre-plot -- route-before-grep with PRECOMPUTED answers

**Commit:** `9c094f71a68a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T22:55:37-05:00
**Tags:** search-preplot, u-search-plot-query, auto-distilled

## Subject
[MAIN] [SEARCH-PREPLOT]/U-SEARCH-PLOT-QUERY (slot:alpha): query consumer for the 3-surface search pre-plot -- route-before-grep with PRECOMPUTED answers

## Body
```
[MAIN] [SEARCH-PREPLOT]/U-SEARCH-PLOT-QUERY (slot:alpha): query consumer for the 3-surface search pre-plot -- route-before-grep with PRECOMPUTED answers

Makes the engines/scripts/hooks search-plots actionable: scripts/search-plot-query.mjs resolves a codebase search from the precomputed plots in ONE cheap JSON read instead of a live grep over ~5800 files. Ranked: name substring (3) > exported-symbol (2) > purpose (1). Flags: --surface engines|scripts|hooks, --domain <galaxy>, --k N, --json. Pure scoreEntry+query exports + a main-guarded CLI. Live-validated: "kienzle"->KienzleForceModelEngine.ts [speed-feed] (cross-surface: +hook +script); "spark --domain wedm"->WEDM spark engines; "terminal-pin --surface hooks"->the hook. 10/10 node:test (5 scoreEntry pure + 5 query integration incl domain/surface filter + score-sort + empty-guard). Token-efficient consumer (query on demand; no per-prompt plot bloat) -- complements the existing master-index/pre-grep stack (graph-based) with a precomputed flat-surface lookup. Self-discoverable: indexed in _scripts.json. Completes SEARCH-PREPLOT: 3790 engines + 1350 scripts + 691 hooks pre-plotted + queryable.
```

## Files touched (3)
- scripts/search-plot-query.mjs      | 84 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/search-plot-query.test.mjs | 51 +++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 135 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9c094f71a68a`
- Milestone envelope: `mcp-server/data/milestones/SEARCH-PREPLOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._