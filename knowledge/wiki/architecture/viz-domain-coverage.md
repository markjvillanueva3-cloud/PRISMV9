---
title: viz-domain-coverage (L5 engine-domain coverage, single-source)
type: architecture
tags: [system-viz, build-state, coverage, domain, sierra]
status: active
maintainer: sierra
created: 2026-05-29
---

# viz-domain-coverage — L5 engine-domain coverage (single-source)

`scripts/lib/viz-domain-coverage.mjs` (`computeDomainCoverage`) derives the system-viz L5 engine-domain layer straight from `BUILD_STATE.COVERAGE_BY_DOMAIN.rows` — the canonical coverage table from `build-state-snapshot.mjs::computeCoverageByDomain`.

## The bug class it fixed
L5 used to carry a hand-edited `domainsBuiltIn` array (24 domains, hardcoded engine counts) + a separate residual catchall in `generate-system-viz.mjs`. Those counts DRIFTED from `BUILD_STATE.json` — the viz headline and BUILD_STATE reported different wired-engine figures for the same metric (two surfaces, one metric, two answers). The fix makes L5 single-source: it renders the top-40 domains by engine count + 1 aggregated rest node, and every L5 node sums back to the BUILD_STATE total exactly (`meta.coverage` conservation invariant, tested in `viz-domain-coverage.test.mjs`).

## Why it matters for sierra
The graph is the fleet's search/awareness substrate ([[feedback_sierra_graph_correctness_is_fleet_search]]). If L5 coverage drifts from BUILD_STATE, the awareness digest + utilization dashboard report numbers that contradict the canonical build snapshot — eroding trust in the graph. Single-sourcing from BUILD_STATE is the anti-drift discipline.

## See also
[[system-viz-galaxy]] · [[system-viz-add-node]] · [[regen-viz-merge-guard]]
