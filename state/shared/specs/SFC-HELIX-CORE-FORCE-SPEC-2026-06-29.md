# SFC Core Helix Force-Model Spec — U-OSC-SFC-HELIX-CORE-FORCE (task 11)

**Author:** oscar (slot:oscar) · 2026-06-29 · de-risk spec for the core force change that follows the
shipped advisory `U-OSC-SFC-HELIX-ADVISORY` (`e670c13b0c`). **Status: ✅ BUILT & SHIPPED 2026-06-29 (`74c860f777`, U-OSC-SFC-HELIX-CORE-FORCE) — physics-reviewer PASS, 486/486 tests green.** Built Option C exactly as recommended below. See [[reference_oscar_sfc_helix_core_force_2026_06_29]].

## 1. The gap (verified in code)
`mcp-server/src/engines/UltimateSpeedFeedEngine.ts:2447-2449`:
```ts
const Fr = Fc * (isTurning ? 0.4 : 0.3);                       // radial — fixed ratio
const Fa = Fc * (isDrilling ? 0.5 : isTurning ? 0.25 : 0.2);  // axial  — fixed ratio, IGNORES helix
const F_resultant = Math.sqrt(Fc*Fc + Fr*Fr + Fa*Fa);
```
For MILLING the axial force is a fixed `0.2·Fc` regardless of helix angle. Physically the axial force on a helical
end mill arises *from* the helix: a 0° straight flute has ~zero axial force; a 45° tool has a large axial pull-out.
The current model gives them identical Fa. The advisory (shipped) WARNS about this; this spec makes the calc
actually adjust.

## 2. Model options (the design decision)
| Model | Fa(helix) | Pros | Cons |
|-------|-----------|------|------|
| **A. Vendor tan** | `Fa = Fc·tan(λ)` | β=0→0 correct; matches vendor (CADEM/Travers) tables; conservative | **Unbounded** — Fa>Fc above 45° (Fa=1.73·Fc at 60°), physically dubious for the axial component exceeding the tangential cutting force |
| **B. Canonical sin** | `Fa = Ft·sin(λ)`, `Fr = Ft·cos(λ)` | Bounded (√(Fa²+Fr²)=Ft); already in `advancedCuttingMathEngine.helixAngleForceDecomposition` | Conflates Ft (tangential) with the resultant; couples Fr to helix when Fr is really material/rake-driven |
| **C. Mechanistic (recommended)** | keep `Fr = Fc·k_r` (radial coefficient, material-driven); make **only** axial helix-dependent: `Fa = Fc·tan(λ)` **capped at λ ≤ ~50°** (or `Fa = Fc·min(tan(λ), tan(50°))`) | Correct β=0→0 limit; bounded; leaves the radial coefficient (the deflection driver) physically untouched; smallest blast radius | Cap is an engineering choice (document it) |

**Recommendation: Option C.** Radial force is governed by the radial cutting coefficient (material/rake), not helix —
so leave `Fr` alone (avoids relaxing the deflection check, which reads the radial/resultant force). Make ONLY `Fa`
helix-dependent with a physically-motivated cap so it never exceeds ~`1.19·Fc`.

## 3. Non-regression strategy (MANDATORY)
- When `helix_angle_deg` is **absent**: keep `Fa = Fc·0.2` (current default) → the 401-assertion gauntlet
  (`UltimateSpeedFeedEngine.test.ts`, 61 tests) and the variability gauntlet stay byte-identical (those tests do
  not pass a helix).
- When `helix_angle_deg` is **present**: `Fa = Fc·min(tan(λ·π/180), TAN_CAP)` with `TAN_CAP = tan(50°) ≈ 1.19`.
- Recompute `F_resultant = √(Fc²+Fr²+Fa²)` from the new Fa.
- Do NOT change `Fr`, torque, power, or the Vc/fz path.

## 4. Blast radius (audit before shipping)
- `F_resultant` (L2449) → consumed by deflection (L~2457+) + possibly workholding. **Higher Fa → higher
  F_resultant → MORE conservative deflection/workholding (safety-ADDING).** Confirm no clamp RELAXES.
- The NineAxis workholding/pull-out check — confirm whether it reads Fa specifically (axial pull-out is exactly
  the helix-sensitive check that SHOULD tighten for high-helix tools).
- `forces.axial_force_N` (output L3074) — value changes for helix-specified calls (correct).

## 5. Test plan (R9)
- Non-regression: helix-absent calc → Fa/F_resultant byte-identical to pre-change (pin a reference value).
- Sensitivity: helix=45° → Fa ≈ Fc·1.0 (capped path not yet hit); helix=10° → Fa ≈ Fc·0.176; **Fa(45°) > Fa(10°)** (monotone).
- Cap: helix=70° → Fa = Fc·1.19 (capped, not Fc·2.75).
- Straight flute: helix=0° → Fa ≈ 0 (axial force vanishes — the physical limit the fixed 0.2 violated).
- Adversarial: helix=NaN/negative → falls back to default 0.2 (no crash).
- Safety: assert the workholding/deflection verdict for a high-helix high-force cell is NOT MORE PERMISSIVE than the fixed-ratio baseline.

## 6. Gates
- **physics-reviewer MANDATORY** (force-model change; my soul refuses skipping it).
- 401-gauntlet 61/61 must stay green (proves non-regression).
- Per-file 2-arm scrutiny + 3-of-3 at stop.

## 7. Why deferred from the 2026-06-29 session
Shipped the safe ADVISORY first (`U-OSC-SFC-HELIX-ADVISORY`). The core change is a safety-bearing physics-model
decision (model choice + cap) feeding the workholding gate; it was correctly deferred from a very deep (~1.6M-token)
context to a clean session where the physics-design + physics-reviewer collaboration can be done without rushing a
safety-relevant force model. Wire-up reuse candidate: `advancedCuttingMathEngine.helixAngleForceDecomposition`.
