---
title: VIZ-COVERAGE-MS0 — system-viz single-source coverage
kind: milestone
status: completed
shipped: 2026-05-17
slot: echo
---

# VIZ-COVERAGE-MS0 — System-Viz Coverage Single-Source Fix

**One unit (`U-VIZ-COVERAGE-FIX`), shipped 2026-05-17 (slot echo).**

## The bug

`scripts/generate-system-viz.mjs` built its L5 "Engine Domains" layer from a
hand-edited `domainsBuiltIn` array — 24 domains with **hardcoded** engine
counts — plus a separate `unwiredDomains`/`otherCount` residual catchall.
Those counts drifted from `BUILD_STATE.json`: the viz headline and
BUILD_STATE reported different wired-engine figures for the same metric.
Two surfaces, one metric, two answers.

## The fix

New pure lib **`scripts/lib/viz-domain-coverage.mjs`** — `computeDomainCoverage(rows, topN)`
derives the L5 layer straight from `BUILD_STATE.COVERAGE_BY_DOMAIN.rows`
(the canonical per-domain table from `build-state-snapshot.mjs::computeCoverageByDomain`).

- L5 renders the **top-40 domains by engine count + 1 aggregated
  `eng.miscdomains` rest node** = 41 nodes. Every L5 node sums back to the
  BUILD_STATE total **exactly** — no domain dropped, none double-counted
  (the conservation invariant the test suite enforces).
- New **`meta.coverage`** field on the graph carries the single-source
  `{total, wired, unwired, coverage_pct, domains}` figure.
- The legacy hand-rolled `eng.other` catchall was **deleted** — it would
  collide on the id `eng.other` with BUILD_STATE's literal "Other" domain.

Counts pass through verbatim (only coerced for safety); only `coverage_pct`
is recomputed, so the displayed % can never disagree with the displayed
counts. 18-case `node:test` suite: conservation invariant, edge cases,
real-BUILD_STATE + generated-`system-graph.json` integration.

## Known follow-up (P2, deferred)

The `dispatcherToDomains` L4→L5 edge heuristic still emits legacy *semantic*
domain tokens (cad, cam, wedm, safety, cost, erp, inspect, memory, quality).
The new L5 uses BUILD_STATE's *first-capword-prefix* taxonomy, which has no
node for 9 of those tokens. The L4→L5 loop now **warns them loudly** (R12)
instead of silently dropping the edges. Re-mapping the heuristic to the
prefix taxonomy is a separate design unit.

## Verify

```bash
node --test H:/prism/scripts/lib/viz-domain-coverage.test.mjs   # 18/18
node -e "console.log(JSON.stringify(require('./state/shared/system-viz/system-graph.json').meta.coverage))"
```

Wiki: [[reference_system_viz]] · [[system-viz-brain-ms0]]
