# PRISM SVI Daily Health Report
**Generated**: 2026-06-26T13:06Z (scheduled svi-health-check)
**Source snapshot**: SVI.json @ 2026-06-26T12:47:27Z · Watch @ 2026-06-26T13:05:59Z

## ACTION REQUIRED
None. SVI-watch-status.md reports **no coverage alerts**, **no changed areas**, **no errors**. Watch is active (pid:51376), 12 targets, drift_status.stale = false.

(Standing item, not an alert: headline Ψ=100% is subsystem-level only and masks four output pipelines below 40% reachability — see Highest-Impact Wiring Targets.)

## Headline
- **Ψ (Reachability)**: **100.0%** — 1,036,776 / 1,036,776 reachable
- **SVI**: 1.6 × 10^46 (log10 = 46.2)
- **Trend**: stable (Δ = 0)
- All 14 subsystems report **wired_pct = 100** — none below the 60% priority threshold.

## Count Discrepancies (live vs SVI.json)
One subsystem shows live count exceeding the recorded snapshot — missed growth not yet folded into the index:

| Subsystem | SVI.json | Live | Δ | Note |
|-----------|----------|------|---|------|
| Tests | 4,866 | **5,133** | **+267** | `*.test.ts` under src/__tests__ = 5,133. SVI records 4,866. Live EXCEEDS — fold into next snapshot. |
| Engines | 3,672 | 3,669 | −3 | Top-level `*Engine.ts` (excl. index/test) = 3,669. SVI records 3,672 (within registry-surface rounding). |
| Dispatchers | 107 | 107 | 0 | Match. |
| Materials | 9 | 6 | −3 | 6 ISO-group JSON files in data/materials; SVI records 9 (per-grade expansion). |

Live below SVI (no action — SVI counts a broader registry surface than raw source files): Algorithms src/*.ts = 122 vs 696; Routes = 83; Schemas = 292 (watch fingerprint lists 338).

→ **Recommend an SVI refresh** to absorb the **+267 Tests** into the next snapshot.

## Highest-Impact Wiring Targets
The subsystem wired_pct scan yields **no targets** — every subsystem is already 100% wired. Residual reachability headroom lives entirely in the **output pipelines**, where per-pipeline reachability_score is the binding constraint. Lowest scorers (all below 60%):

1. **Waterjet — 36%** → ~54 pts headroom (to 0.90). Only materials+machines connected; tools+strategies unwired, 6 of 38 dialects.
2. **Laser — 37%** → ~53 pts headroom. Same profile (materials+machines only; 5 formulas, 7 dialects).
3. **EDM — 38%** → ~52 pts headroom. materials+machines only; 6 formulas, 6 dialects.

Mid-tier: QuoteToShip 51% (only 1 dialect across 21 stages), Grinding 52%, Turning 74%. Top-wired: MillTurn 92%, MultiAxis 91%, PrintToProgram 90%. The three laggards share one gap: only `materials`+`machines` registries connected, no `tools`/`strategies`. Wiring those in is the fastest path to lifting aggregate pipeline reachability.

## Step-6 Projected-Ψ Scenarios (as specified)
The task scenarios assume low subsystem wired_pct (Tribal 30%, Tools 40%, Handbooks 45%, Strategies 50%). **Those premises are stale** — in the current snapshot all four are already 100% wired and fully reachable, so each projected gain is **0 pts** (subsystem-level Ψ is saturated):

| Scenario | Recorded wired_pct | Projected ΔΨ |
|----------|-------------------|--------------|
| Tribal Tips 30→100% | already 100% (26,878 reachable) | 0 (no-op) |
| Tools 40→100% | already 100% (956,080 reachable) | 0 (no-op) |
| Handbooks 45→100% | already 100% (entities=0) | 0 (no-op) |
| Strategies 50→100% | already 100% (6,096 reachable) | 0 (no-op) |

Because subsystem Ψ is saturated, further gains are measured in the pipeline reachability_score, not subsystem wiring. The real-impact targets are the three pipelines above.

## Drift / Coverage Alerts
None. drift_status: stale=false, changed_areas=[], coverage_alerts=[]. Watch last triggered by fs-watch.

## Notes
- Handbooks subsystem = 0 entities → contributes 0 to both reachable and total. Genuine **content gap** (not a wiring gap); subsystem-level 100% is vacuously true.
- Tribal Tips snapshot 13,439 today (vs 12,733 in yesterday's report) — +706, consistent with active ingestion; verify the count source remains stable across runs.
- Recommend folding pipeline reachability_score into the headline Ψ formula so Waterjet/Laser/EDM (≤38%) surface in the top-line metric — currently masked by subsystem-level saturation.

---
*Auto-generated daily. While Ψ reads 100% at the subsystem level, pipeline reachability (Waterjet/Laser/EDM ≤38%) is the true remaining frontier — treat those as the standing reachability follow-up.*
