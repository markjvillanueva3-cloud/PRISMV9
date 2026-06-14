---
name: reference_sierra_leverage_ranked_wiring_queue
description: sierra's leverage-ranked wiring queue (BUILT 2026-05-29) — ranks unwired engine-domains by graph leverage so the fleet wires highest-impact-per-wire first
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.938Z
aliases: reference_sierra_leverage_ranked_wiring_queue
---


**BUILT 2026-05-29 (session 109ba448, "build and wire in order of priority").** The #1 high-leverage system-viz move from SIERRA-HIGH-LEVERAGE-OPPORTUNITIES-2026-05-29: the unwired-engine backlog (118 engines / 13 domains) is NOT flat — wiring a domain that unlocks 3 dispatchers + many downstream hops beats wiring an isolated one.

- **Pure core:** `scripts/lib/leverage-wiring-queue.mjs` — `extractWiringQueue(graph)` + `queueTotals(rows)`. 10 node:test (incl. real-data E2E). Deterministic, no IO/Date.
- **CLI:** `scripts/leverage-ranked-wiring-queue.mjs` — reads `architecture-graph.json` (OOM-safe 51MB, NOT the 548MB merged graph; its L5 `eng.<domain>` nodes already carry `unwired`/`coverage_pct`/`suggestedDispatchers`/`unlocks:{dispatchersGain,downstreamHops,leverageScore}`). Atomic-write → `state/shared/system-viz/LEVERAGE-WIRING-QUEUE.{json,md}`. Feeds /pick-unit + dispatcher-wirer.

**The load-bearing fix (arm-B scrutiny FAIL → fixed before commit):** the graph emits a literal `leverageScore: 0` for the 3 catchall domains with `dispatchersGain:0` / `suggestedDispatchers:[]` (MiscDomains=69, Monolith=5, Post=1). A naive `if (!Number.isFinite(score))` fallback treats `0` as a real score → ranks the single largest wiring-debt bucket (69 engines = 58% of all debt) DEAD LAST, inverting the queue. **graph-`0` is NOT "zero value" — it's the un-attributed / needsDispatcherInference case.** Fix: route both non-finite AND `===0` to derived `unwired × max(1,dispatchersGain) × max(1,downstreamHops)`. After fix: MiscDomains(138 derived, ⚠needs-inference) → Other(66 graph) → Monolith(10). The `needsDispatcherInference` flag carries "blocked on inference"; leverage carries "where the volume is" — both honest, both surfaced.

**Why graph-granularity not per-engine:** the original plan said PageRank × unwired per-engine, but the merged 548MB graph OOMs a single JSON.parse. architecture-graph (51MB) already pre-computes domain leverage, so domain-granularity ships now; per-engine refinement is a follow-up needing the merged graph. Complements per-engine `scripts/unwired-bridge-rank.mjs` (ripgrep fan-in proxy) — different metric, neither supersedes.

Wired into GSD §5b + PATHS.md. Lesson reinforces [[feedback_sierra_graph_correctness_is_fleet_search]]: a `0` from a derived graph product can mean "couldn't compute", not "is zero" — read the emitter's meaning, don't assume. See [[reference_sierra_regen_fast_registration_gap_2026_05_29]] · [[reference_sierra_domain_gsd_2026_05_29]].
