---
title: ChatterPredictionEngine.predictWithTrend — trend-based predictive chatter layer
node_type: architecture
domain: mill
status: shipped
shipped: 2026-05-17
shipped_by: claude-23c10eea-alpha
unit: U-GAP-MILL-FFT-CHATTER
milestone: FEATURE-GAP-AUDIT-MS0
related: [chatter-prediction, altintas-stability-lobes, stft-chatter, predictive-maintenance]
---

# ChatterPredictionEngine.predictWithTrend

Method addition on the existing `ChatterPredictionEngine` shipped 2026-05-17 (alpha slot, commit `2581b08eac`). Re-modularizes the **trend slope → time-to-chatter → urgency-tiered action vectors** layer from monolith asset `extracted/algorithms/PRISM_FFT_PREDICTIVE_CHATTER.js` (R2.3.3) onto the already-shipped engine.

## Why a method, not a new engine

Karpathy R8 dedup-preflight against the monolith found **90% already shipped**:

| Monolith feature | Already-shipped equivalent |
|---|---|
| `analyzeVibration` (recursive FFT + peak find) | `detectChatter` (DFT) + `detectChatterSTFT` (STFT spectrogram, onset, CSR, severity) |
| `generateStabilityLobes` (simplified) | `generateStabilityLobes` (full Altintas analytical) |
| `predictChatter` (margin-only) | `checkStability` + `detectChatterSTFT.recommended_rpm_change` |
| **`vibrationTrend` slope → time-to-chatter** | ❌ MISSING — the genuine gap |
| **Tiered urgency recs with speed/DOC deltas** | ❌ MISSING — the genuine gap |

Building a parallel engine would have tripped `duplicationGuardEngine.mustCheckBeforeCreating()`. The right routing was a focused method addition.

## API

```ts
predictWithTrend(input: PredictWithTrendInput): PredictWithTrendResult
```

Input combines `rpm` + `axialDepth_mm` + `vibrationTrend: number[]` + a pre-computed `lobes: StabilityLobeResult` (from `generateStabilityLobes`). Optional tunables: `warningMarginPercent` (20), `imminentMarginPercent` (10), `imminentTrendSlope` (0.1), `trendScaleFactor` (10 — empirical mm/s per trend-unit).

Returns: `{ prediction, confidence, marginToChatter_mm, marginPercent, trendSlope, timeToChatterSec, action }`.

## Prediction tiers

```
ACTIVE   margin < 0                              chatter happening
IMMINENT marginPct < imminentPct AND slope > thr rising into the wall
WARNING  marginPct < warningPct                  thin margin, no rise
STABLE   otherwise                               no action needed
```

Action vectors mirror the Altintas/Tobias chatter-mitigation playbook:

| Tier | Urgency | Speed Δ | Depth Δ | Rationale |
|---|---|---|---|---|
| ACTIVE | IMMEDIATE | −15% RPM | −50% depth | Emergency: halving depth instantly clears any reasonable lobe |
| IMMINENT | IMMEDIATE | 0 | pull to 80% of critical | Anchor to setpoint — preserves productivity vs fixed-magnitude reduction |
| WARNING | SOON | −5% RPM | 0 | Tobias-style frequency detuning at low urgency |
| STABLE | NONE | 0 | 0 | — |

## R12 fail-loud guards (per per-file scrutiny)

Reviewer-B caught 6 ship-blockers that landed as guards:

1. **NaN/Infinity in `vibrationTrend`** → throws with offending index (R12 — silent NaN poisoning is the "30 records skipped" class).
2. **`imminentMarginPercent > warningMarginPercent`** → throws (silent dead-WARNING-tier trap — `4 < imminent=15` fires IMMINENT-with-flat-slope-fallthrough = unreachable WARNING).
3. **Unrounded margin in time-to-chatter divide** — defensive future-proofing (`checkStability` currently `r4`s upstream, so the choice is testably idempotent today but matters if upstream rounding is ever dropped).
4. **Confidence `r4`-rounded** at return boundary — contract integrity with the rest of the engine's numeric fields.
5. **WIRE-EXEMPT tag** — input contains an in-memory `StabilityLobeResult` (closure of lobe-interpolators) that does not round-trip through a JSON dispatcher boundary; consumers compose in-process.
6. **Negative-zero hygiene** on ACTIVE branch deltas (`|| 0` + `depthDrop > 0 ? -depthDrop : 0`).

## Test fixture strategy

Tests use **synthetic hand-crafted lobes** (`syntheticLobes(criticalDepth, rpm)`) — a 1-lobe segment with constant `depthLimit_mm` over `[rpm-100, rpm+100]`. This:

- Gives `checkStability` exact, deterministic critical-depth values.
- Bypasses a **pre-existing bug** in the engine's `findStablePockets`: the test `"identifies stable pockets between lobes"` in `ChatterPredictionEngine.test.ts` **currently FAILS in main** (`expected 0 to be greater than 0`). Not in this unit's lane to fix; documented separately.

One integration smoke test uses the real `generateStabilityLobes` output to pin compatibility (loose assertions: valid enum + numeric ranges).

## Honest deferrals

- **Precision-regression guard for unrounded margin in divide**: NOT writable through the public API at current rounding architecture (`checkStability` `r4`-truncates upstream). Documented in test-file docstring; would require either dropping upstream `r4` or exposing the private margin computation for direct test.
- **WIRE-EXEMPT**: not wired through `prism_calc` dispatcher because `StabilityLobeResult` is a closure-of-interpolators that doesn't JSON-serialize cleanly. A future cross-process wiring would need a serializable lobe-id reference cache.

## Related

- `ChatterPredictionEngine` — host class with the existing `generateStabilityLobes` / `checkStability` / `detectChatter` / `detectChatterSTFT` / `criticalSpeeds` surface.
- `STFTChatter` — algorithm used by `detectChatterSTFT` for real-time spectrogram-based chatter detection.
- `PRISM_FFT_PREDICTIVE_CHATTER.js` — monolith asset, 90% subsumed; trend/action layer re-modularized here.
- [Altintas & Weck (2004)](https://doi.org/10.1016/S0007-8506(07)60032-8) — CIRP "Chatter Stability of Metal Cutting and Grinding" §4 (predictive envelopes from trend analysis).
- [Tobias (1965)](https://archive.org/details/machinetoolvibra0000tobi) "Machine Tool Vibration".
