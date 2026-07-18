---
title: "EWMA run-to-run controller (MIT 2.830)"
type: concept
domain: spc / process-control
course_lineage: MIT-2.830
formula_family: control-chart
primary_engine: EWMAEngine
shipped: 2026-05-23
slot: india
related:
  - mit-2-830-control-of-manufacturing-processes
  - ewmaengine
  - cusumengine
  - nelsonspcrulesengine
  - spcprocesscapabilityengine
---

# EWMA — Exponentially Weighted Moving Average control chart

## What it is

A recursive control chart for detecting small, sustained shifts in a process mean. Compared to Shewhart `X̄`-charts (which react to single 3σ excursions), EWMA accumulates evidence across many small samples — it catches drift that Shewhart misses.

## Formula

```
z_i  = λ·x_i + (1 − λ)·z_{i−1}        z_0 = μ
UCL_i = μ + L·σ·√[ (λ/(2−λ)) · (1 − (1−λ)^{2i}) ]
LCL_i = μ − L·σ·√[ (λ/(2−λ)) · (1 − (1−λ)^{2i}) ]
```

| Symbol | Meaning | Typical |
|---|---|---|
| `λ` | smoothing constant ∈ (0,1] | 0.1 – 0.3 |
| `L` | control-limit multiplier | 2.7 – 3.0 |
| `μ` | process target mean | from baseline |
| `σ` | process stddev | from baseline |
| `i` | sample index (1-based) | — |

**Steady-state half-width** (i → ∞): `L · σ · √(λ/(2−λ))`. Useful for offline limit pre-configuration.

## Lineage

- **Primary source:** Roberts (1959) — "Control Chart Tests Based on Geometric Moving Averages", *Technometrics* 1(3).
- **Course teaching:** MIT 2.830 Control of Manufacturing Processes — names EWMA in its extracted-content set alongside Shewhart / CUSUM / Cpk / DOE.
- **PRISM engine:** [[ewmaengine]] (`mcp-server/src/engines/EWMAEngine.ts`, milestone PP-0.22-U-SPC3, 109 LOC).
- **PRISM memory node:** [[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]] — closes the course→formula→engine lineage gap.

## Engine API surface (EWMAEngine)

| Method | Returns | Purpose |
|---|---|---|
| `new EWMAEngine({mean, stddev, lambda, L})` | instance | constructor + validate (R12 fail-loud) |
| `step(value)` | `EwmaPoint` | single-sample update with alarm classification |
| `analyze(values[])` | `EwmaResult` | batch mode + first-alarm extraction |
| `steadyStateHalfWidth()` | `number` | offline limit pre-configuration |
| `reset()` | `void` | restart filter at `z_0 = μ` |
| `setConfig(newConfig)` | `void` | reconfigure + reset |

## When EWMA beats Shewhart

- Sustained small shifts (< 1σ) — Shewhart misses; EWMA catches in ~10 samples.
- Autocorrelated process data — EWMA's smoothing naturally handles serial correlation.
- Run-to-run control loops — feedback compensation per batch, with EWMA on the error signal.

## When Shewhart beats EWMA

- Large transient excursions (>3σ single point) — Shewhart fires immediately; EWMA needs accumulated evidence.
- Memoryless processes where each sample is independent — Shewhart's simpler logic + same detection power.

## PRISM consumers (today + planned)

- **EWMAEngine** — direct calculation surface.
- **NelsonSPCRulesEngine** — combines Nelson's 8 rules with EWMA point streams for richer alarm classification.
- **SPCProcessCapabilityEngine** — `cp`/`cpk` baseline used as `μ ± Lσ` input to EWMA limits.
- **CUSUMEngine** — sibling control chart (CUSUM = sum-based, EWMA = recursive); both feed SPC alarm bus.
- **Run-to-run controllers** in adaptive-control engines (e.g. `AdaptiveControlEngine`, `RealTimeAdaptiveControllerEngine`) consume EWMA estimates of process drift.

## See also

- Course: [[mit-2-830-control-of-manufacturing-processes]]
- Sibling control-chart engines: [[cusumengine]] · [[nelsonspcrulesengine]] · [[spcprocesscapabilityengine]]
- Triplet memory: [[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]]
- Pattern handoff for remaining 4 MIT courses: [[reference_mit_courses_goal_scope_handoff_2026_05_23]]
