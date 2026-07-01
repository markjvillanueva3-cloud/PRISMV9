# WIRE-UNWIRED-MS0/U-WIRE-CMC — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CMC: wire CapacityMonteCarloEngine into prism_dev (1 action + engine-pair test)

**Commit:** `3138d5308283` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T07:52:29-05:00
**Tags:** wire-unwired-ms0, u-wire-cmc, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CMC: wire CapacityMonteCarloEngine into prism_dev (1 action + engine-pair test)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-CMC: wire CapacityMonteCarloEngine into prism_dev (1 action + engine-pair test)

Wires 1 pure-compute Monte Carlo action through prism_dev:
- cmc_simulate -> CapacityMonteCarloEngine.simulate(input)

Pure compute (no I/O, no shared state). Models 4 stochastic processes:
- Machine availability: exponential MTBF/MTTR (Dhillon 2006)
- Setup time: log-normal (Shingo SMED 1985)
- Cycle time: normal (Box-Muller)
- Scrap rate: beta-ish (normal clamped to [0,max])
Then aggregates into per-week capacity, OEE decomposition, percentile
band (p5/p50/p95), and risk factors (stockout/availability/OEE/
top-bottleneck).

Static method on the class — called as CapacityMonteCarloEngine.simulate
(NOT capacityMonteCarloEngine.simulate, even though that singleton
exists). The lazy import explicitly destructures the class.

DoS guards (Monte Carlo is CPU-bound — O(M*N*W) loop body):
- machines: 1-100 (most shops have <50)
- num_simulations: 1-50_000 (default 5000)
- horizon_weeks: 1-104 (2 years)
- mtbf_hours/mttr_hours: positive + bounded
- cycle_time_min_mean: POSITIVE (zero would div-by-zero at engine line 186)
- scrap_rate_mean/max: [0,1]
- seasonal_factor: max 10x

Worst-case work: 100 * 50k * 104 ≈ 520M loop bodies ≈ a few seconds
on a modern CPU. Practical defaults: 2 machines * 5k * 12 = 120k
bodies ≈ milliseconds.

Test coverage: 32/32 vitest PASS across both files:
- dispatcher.capacityMonteCarlo.test.ts (16 tests): Zod schema
  validation (required fields + 5 DoS-cap rejections), full shape
  contract, 3 algebraic invariants (OEE = A*P*Q, CI = [p5,p95],
  p5 <= p50 <= p95), bottleneck-prob sum ≈ 1.0, 2 variability
  scenarios (single-machine + high-demand-stockout), routing proof
  with STATISTICAL bounds (200-sim ratio in [0.5, 2.0] — exact
  equality impossible for Math.random()-backed compute), error
  envelope (3 reject paths).
- CapacityMonteCarloEngine.test.ts (16 tests): shape contract (3),
  algebraic invariants (7 — OEE product / CI = [p5,p95] / level=0.90
  hard-coded / percentile monotonicity / bottleneck-prob sum /
  quality = 1-scrap_rate / availability in [0,1]), variability (3 —
  single-machine 100% bottleneck / 3 distinct N / high-demand SL
  failure), risk-factor capture (2 — stockout-on-overload / normal
  scenario ≤4 risks), defaults coverage (1 — minimal input fires
  engine defaults).

ROUTING PROOF design note: this engine uses Math.random() for all 4
stochastic processes, so back-to-back invocations DIVERGE in numeric
output. The routing proof uses statistical bounds (mean capacity
ratio in [0.5, 2.0], OEE in [0,1] for both calls) instead of the
exact toBeCloseTo equality used by deterministic engines (LDL/MTI/
SCA). Algebraic invariants (which DO hold per-call) provide the
fine-grained behavioral assertions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- .../src/__tests__/CapacityMonteCarloEngine.test.ts | 185 +++++++++++++++++
- .../dispatcher.capacityMonteCarlo.test.ts          | 227 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  39 ++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  25 ++-
- 4 files changed, 475 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tile
- tile monotonicity / bottleneck-prob sum /
- note: this engine uses Math.random() for all 4

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3138d5308283`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._