# WIRE-UNWIRED-MS0/U-WIRE-OFM — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-OFM: wire OrificeFlowMeterEngine into prism_dev (1 physics-compute action, engine-pair test already exists)

**Commit:** `0033e2fb6712` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T09:06:53-05:00
**Tags:** wire-unwired-ms0, u-wire-ofm, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-OFM: wire OrificeFlowMeterEngine into prism_dev (1 physics-compute action, engine-pair test already exists)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-OFM: wire OrificeFlowMeterEngine into prism_dev (1 physics-compute action, engine-pair test already exists)

Wires 1 pure-physics action through prism_dev:
- ofm_calculate -> calculate(input) — ISO 5167 orifice-plate flow

Physics: discharge coefficient via Reader-Harris/Gallagher
(Cd = 0.5959 + 0.0312*β^2.1 - 0.184*β^8), velocity-of-approach
factor E = 1/√(1-β^4), Bernoulli flow Q = Cd*E*A*√(2*ΔP/ρ).
Permanent loss ≈ (1-β²)*100%. Safety gate: β ∈ [0.2, 0.7] AND
Re > 5000.

No DEFER list — single pure calculation, no state mutation.

AtomicValue outputs (value/unit/uncertainty/source) for 8 numeric
fields + is_safe bool + recommendations[].

DoS guards:
- pipe_diameter_mm: 0+<x<=10_000 (1cm to 10m industrial pipe range)
- orifice_diameter_mm: 0+<x<=10_000
- differential_pressure_Pa: 0<=x<=1e9 (mutually exclusive with flow_rate_m3_h)
- flow_rate_m3_h: 0<=x<=1e9
- fluid_density_kg_m3: 0+<x<=30_000 (covers low-pressure gas to mercury)
- fluid_viscosity_cP: 0+<x<=100_000
- tap_type: z.enum [flange, corner, D_D2, vena_contracta]

Test coverage: 15/15 vitest PASS (dispatcher only — engine-pair from
batch71-engines.test.ts):
- Zod schema validation (3 — required diameters + positive + 10K cap +
  tap_type enum)
- physics behavior (9):
  - ΔP path returns positive Q with correct AtomicValue shape + β≈0.5
    + Cd in Reader-Harris band [0.59, 0.62]
  - β=d/D invariant across 3 diameter ratios (0.4, 0.5, 0.7)
  - low β (0.15) triggers is_safe=false + 'Low β' recommendation
  - high β (0.85) triggers is_safe=false + 'High β' recommendation
  - flow_rate path returns matching ΔP via Bernoulli inverse
  - density doubling halves Q at fixed ΔP (Q ∝ 1/√ρ — Bernoulli
    invariant verified via toBeCloseTo(1/√2))
  - permanent_loss_pct ≈ (1 - β²)*100 algebraic invariant
  - routing proof: wire Q equals engine-direct Q
  - AtomicValue contract per-field (8 numeric fields)
- error envelope (3 — missing orifice / negative pipe / invalid tap)

Bernoulli invariant test (Q ∝ 1/√ρ) is the highest-value behavioral
assertion — verifies the physics formula at engine line 70 rather
than just smoke-testing the output shape.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/dispatcher.orificeFlowMeter.test.ts  | 227 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  21 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  15 +-
- 3 files changed, 262 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0033e2fb6712`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._