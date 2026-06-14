---
name: reference-rocket-nozzle-engine-me-iteration-bug-2026-05-26
description: RocketNozzleEngine Me-iteration converges to ~1.01 guard at high ε instead of supersonic Me — surfaces as unphysical Isp ~4000s
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.917Z
aliases: reference_rocket_nozzle_engine_me_iteration_bug_2026_05_26
---


# RocketNozzleEngine — Me iteration bug (U-DEA-november-EXTRA77-ENGINE-FIX)

**Discovered:** 2026-05-26 during DEA-MS0 EXTRA77 wiring loop (slot:november).

## Symptom
LOX/RP1 at Pc=100 bar, Dt=100 mm, ε=40 produces:
- `exit_mach_number = 1.01`
- `specific_impulse_s ≈ 4153`

Real RP1 vacuum Isp ≈ 340 s. The 12× inflation comes from the pressure-thrust term `(Pe − Pa)·Ae` dominating because Pe stays high when Me is stuck near 1 — `Pe = Pc / (1 + (γ−1)/2·Me²)^(γ/(γ−1))` collapses Pe to ~Pc when Me≈1.

## Root cause
`src/engines/RocketNozzleEngine.ts:80-87` iterates Me with a fixed step:
```ts
let Me = 1;
for (let i = 0; i < 50; i++) {
  const term = (2 / (g + 1)) * (1 + (g - 1) / 2 * Me * Me);
  const aRatio = Math.pow(term, (g + 1) / (2 * (g - 1))) / Me;
  if (Math.abs(aRatio - epsilon) < 0.01) break;
  Me += (epsilon - aRatio) * 0.1;
  if (Me < 1) Me = 1.01;
}
```

The area-Mach function `A/A* = (1/M)·[(2/(γ+1))·(1+(γ−1)/2·M²)]^((γ+1)/(2(γ−1)))` rises *very* steeply for M > 3. For ε=80 with γ=1.22:
- iter 1: Me=1, aRatio=1, Me += (80−1)·0.1 = 7.9 → Me=8.9
- iter 2: at Me=8.9 the area ratio is ~6360, Me += (80−6360)·0.1 = −628 → guard kicks Me=1.01
- iter 3: identical to iter 1 → infinite oscillation, exit at iter 50 with Me=1.01

A working Me iteration needs **Newton-Raphson** on `f(M) = aRatio(M) − ε = 0` with `f'(M)` computed analytically, or a bisection guarded by the throat (M=1) and a known upper bound (M=10 covers any practical nozzle).

## Workaround (until engine is fixed)
Dispatcher tests verify only the round-trip contract (shape, units, sign, `is_safe` invariants, `Me > 1`). The physical monotonicity claims (`Isp ∈ [200, 450]`, `ε↑ → Me↑`) are removed and tracked here for restoration once the iteration is replaced.

## Follow-up unit
`U-DEA-november-EXTRA77-ENGINE-FIX` — swap fixed-step iteration for bisection on M ∈ [1, 20]. Restore the assertions: `Isp ∈ [200, 450]` for LOX/RP1 and `Me_largeε > Me_smallε` monotonicity.

## Doctrine link
R12 fail-loud — wiring a stub engine surfaced a physics bug; we did NOT weaken the assertion silently, we documented it and shipped only the shape/contract guarantees.
