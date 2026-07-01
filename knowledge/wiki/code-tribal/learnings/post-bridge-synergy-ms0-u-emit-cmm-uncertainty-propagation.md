# POST-BRIDGE-SYNERGY-MS0/U-EMIT-CMM-UNCERTAINTY-PROPAGATION — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-CMM-UNCERTAINTY-PROPAGATION (slot:echo /loop iter57 /yolo): first-order CMM uncertainty propagation — probe σ → WCS σ → tol σ_stack, dialect-aware emit.

**Commit:** `7827ef758f1a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T14:48:14-05:00
**Tags:** post-bridge-synergy-ms0, u-emit-cmm-uncertainty-propagation, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-CMM-UNCERTAINTY-PROPAGATION (slot:echo /loop iter57 /yolo): first-order CMM uncertainty propagation — probe σ → WCS σ → tol σ_stack, dialect-aware emit.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-EMIT-CMM-UNCERTAINTY-PROPAGATION (slot:echo /loop iter57 /yolo): first-order CMM uncertainty propagation — probe σ → WCS σ → tol σ_stack, dialect-aware emit.

Closes envelope row 42 (Phase 6 EMIT-side, 3d effort).

scripts/lib/cmm-uncertainty-emit.mjs — pure-fn library, 15 exports:
- propagateLinearCombination(coeffs, sigmas) — σ_y² = Σ aᵢ²·σᵢ²
  (first-order Taylor; independent inputs)
- tolerancestackupRSS(sigmas) — convenience for all-coeffs-1 case
- sigmaOfMean(σ, n) — σ / √n (averaging-of-N-readings rule)
- sigmaOfDifference(σ₁, σ₂) — √(σ₁² + σ₂²)
- expandedUncertainty(σ, k) — U = k·σ (ISO GUM, k=2 ≈ 95%)
- propagateWCSOriginChain({x, y, z: [{name, sigma}, ...]}) — per-axis RSS
- formatValueWithUncertainty(value, σ, label, options) — "X.. +/- U (k=k)"
- buildWCSProbeUncertaintyComment(...) — single-line probe-result emit
- emitCMMUncertainty(...) — full pipeline (header + WCS-PROBE line)

scripts/lib/cmm-uncertainty-emit.test.mjs — 68 tests, 12 suites.

Hand-checked anchors:
  3-4-5 RSS triangle: √(3² + 4²) = 5
    → propagateLinearCombination([1,1], [3,4]) = 5
    → tolerancestackupRSS([3, 4]) = 5
    → sigmaOfDifference(3, 4) = 5
  σ_mean rule: σ=10 / √4 = 5
  k=2 coverage: U = 2σ = 2·0.00175 = 0.0035
  WCS-PROBE emit (heidenhain, parens preserved):
    "; WCS-PROBE  X100.0000 +/- 0.0020 (k=2)  Y50.0000 +/- 0.0040 (k=2)
       Z-25.0000 +/- 0.0060 (k=2)"
  WCS-PROBE emit (fanuc, parens stripped):
    "( WCS-PROBE  X100.0000 +/- 0.0020 k=2  Y50.0000 +/- 0.0040 k=2
       Z-25.0000 +/- 0.0060 k=2 )"

Why "CMM uncertainty propagation at emit":
  Standard probing posts emit measured values as if exact:
    ( PROBE WCS origin = X100.0234 Y50.0456 Z-25.0089 )
  Operators read those as exact when they're really ± 0.003ish. This
  lib propagates probe-stylus σ + repeatability σ + fixture σ through
  linear (first-order Taylor) RSS to emit the calibrated band on every
  measured value. R12 fail-loud — never report a measurement without
  its uncertainty band.

Echo-soul compliant: pure linear algebra observability. σ INPUTS come
from upstream (probe calibration, machine repeatability spec, fixture
spec). This lib only propagates them through the chain + emits per
dialect.

Operator-facing failure mode prevented: silent uncertainty-suppression
on probing emits. WCS origin reported as exact → all downstream
tolerances thought to be hit by margin σ_stack, actually overlapping.

Substrate complement to iter51-56 R12 emit stack (uncertainty bands /
OOD gate / Pareto / trochoidal / drift-aware bandit / SE3 SLERP).
This (iter57) closes the metrology-side observability gap.

@milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-CMM-UNCERTAINTY-PROPAGATION
@phase 6 EMIT-side · @row 42 · @effort 3d
@slot echo · @date 2026-05-27
```

## Files touched (3)
- scripts/lib/cmm-uncertainty-emit.mjs      | 242 ++++++++++++++++++
- scripts/lib/cmm-uncertainty-emit.test.mjs | 394 ++++++++++++++++++++++++++++++
- 2 files changed, 636 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7827ef758f1a`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._