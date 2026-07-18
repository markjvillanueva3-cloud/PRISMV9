---
name: reference-sf-psn-u02-semantic-gap-2026-05-22
description: U-SFPSN-02 (KienzleForceModel + ExtendedTaylorModel composition) discovered mid-iter to be a semantic-gap unit, not a delegate refactor. Decomposed into U-02A/B/C. Kienzle: shim-feasible (edge_radius_mm=0.001 + rake_angle_deg+6). Taylor: structural formula mismatch — inline T=(C/(V·f^m·d^p))^(1/n), module per docstring T=(C·k_corr)/(V^(1/n)·f^a·ap^b). 25+ chats inherit this finding.
metadata:
  type: reference
---

# SF-PSN-WIRE-MS0/U-SFPSN-02 — Semantic-Gap Finding (2026-05-22)

**Slot:** juliett · **Chat:** `claude-a8894112` · **Loop iter:** 3/10 · **Milestone:** [[SF-PSN-WIRE-MS0]]

## What I found mid-iter

Read the bodies of both algorithm modules + the inline engine functions side-by-side. The two are **NOT semantic equivalents** — naive delegation would change UltimateSpeedFeedEngine outputs and break its existing test suites (22.4K LOC `UltimateSpeedFeedEngine.test.ts` + 33.1K LOC `UltimateSpeedFeedEngine.variability.test.ts`).

### Kienzle gap (shim-feasible)

| Aspect | Inline `kienzleCuttingForce()` @ UltimateSpeedFeedEngine.ts:848 | Module `KienzleForceModel.calculate()` |
|---|---|---|
| Rake reference | `1 - 0.01·γ` at γ=0° → correction = 1.0 | `1 - 0.01·(γ - 6)` at γ=6° → correction = 1.0 |
| Edge-radius correction | **none** | `1 + 0.3·min(edge_radius/h, 1)` when `h < 3·edge_radius` |
| Rake clamp | `[0.7, 1.3]` explicit | implicit (formula bounded in typical γ range) |
| Force decomposition | returns `Fc, Kc, Kc_uncorrected` only | returns `Fc, Ff, Fp, Fr, Kc, kc1.1, mc, rake_correction, edge_correction` |
| Output type | plain `number` | `AtomicValue<number>` |

**Shim recipe (preserves engine semantics):**
```ts
// In kienzleCuttingForce shim:
const out = KienzleForceModel.calculate({
  chip_thickness_mm: h,
  chip_width_mm: ap_mm,
  rake_angle_deg: (rakeAngleDeg ?? 0) + 6,      // shift to module's 6° reference
  edge_radius_mm: 0.001,                         // tiny — keeps h > 3·edge_radius for any realistic h
  operation: "milling",
  material: { name: "inline", kc1_1, mc, taylor_C: 0, taylor_n: 0.25, iso_group: "P" }
});
const rakeCorrClamped = Math.max(0.7, Math.min(1.3, out.rake_correction));
return { Fc: out.Fc.value * rakeCorrClamped / out.rake_correction, Kc: out.Kc.value * rakeCorrClamped, Kc_uncorrected: out.Kc.value };
```

A 50-fixture equivalence test must verify `|Fc_shim - Fc_inline| / |Fc_inline| < 1e-6`.

### Taylor gap (structural — NOT shim-feasible)

| Aspect | Inline `extendedTaylorToolLife()` @ UltimateSpeedFeedEngine.ts:925 | Module `ExtendedTaylorModel.calculate()` |
|---|---|---|
| Formula | `T = (C / (V·f^m·d^p))^(1/n)` with `m = p = 0.1` (canonical extended-Taylor) | per docstring: `T = (C · k_coat · k_temp · k_hard) / (V^(1/n) · f^a · ap^b)` with `a ∈ [0.6, 0.85]`, `b ∈ [0.3, 0.42]` per ISO group |
| Exponent topology | single `^(1/n)` over the entire `C/X` ratio | `V` raised to `^(1/n)`, `f` and `ap` raised to separate ISO-group-specific exponents |
| Worked example, ISO P, V=150, C=250, f=0.15, d=2 | ~12.5 min | per docstring formula: ~1.8 × 10⁻⁶ min (clearly suspicious — under-specified docstring) |
| Coating/temp/hardness factors | none | multipliers up to 3× (PCD coating, cryogenic coolant, etc.) |

The two formulas are **structurally different** (numerator vs denominator placement of corrections + non-equivalent exponent topology). No bit-equivalent shim exists. Two paths forward:

1. **Option (a) — extend the module with `inline_compat` mode** that reproduces the engine's m=p=0.1 form (additive, low risk).
2. **Option (b) — accept the module's more-accurate extended form and re-baseline downstream test fixtures** (preferred long-term, requires anti-regression suite update + 3-of-3 review).

Decision required in U-SFPSN-02B's reconciliation spec.

## Decomposition shipped this iter

`U-SFPSN-02` → `U-SFPSN-02A` (Kienzle shim, effort 30, P1) + `U-SFPSN-02B` (Taylor reconciliation spec, effort 65, P1, depends_on 02A) + `U-SFPSN-02C` (lift remaining inline physics — Sandvik/wear/chip/Merchant — to modules, effort 55, P2, depends_on 02A+02B).

Total milestone units: 10 → 12. The original U-02 envelope entry is now `status: "superseded"` with `supersededBy: ["U-SFPSN-02A", "U-SFPSN-02B", "U-SFPSN-02C"]`. Full provenance in `mcp-server/data/milestones/SF-PSN-WIRE-MS0.json` `decomposition_history`.

## Why this is real progress (not a punt)

R12 fail-loud: the original U-02's "delegate the inline functions to the modules" framing was **wrong** — the modules add physics (size-effect, edge-ploughing, coating/temp/hardness factors) that the engine doesn't currently produce. Calling it a "delegate refactor" hid a real behaviour-change discussion. Decomposition + the finding above gives the next chat (any slot) a precisely-scoped first unit it can ship in one iter, plus a written reconciliation gate for the harder Taylor work.

The 25+ chats inheriting this slot can pick up U-02A immediately — the shim recipe + the 50-fixture equivalence-test target are fully specified.

## Linked

- Milestone: `mcp-server/data/milestones/SF-PSN-WIRE-MS0.json` (decomposition_history + 3 new units)
- Audit: `state/shared/specs/SF-PSN-VALUE-NODE-AUDIT-2026-05-22.md` (F1 96.6% gap, still the source-of-truth driver)
- Meta artifact: `scripts/sf-psn-leverage-rank.mjs` (re-runnable measurement)
- Companion test file shipped this iter: `mcp-server/src/__tests__/SpeedFeedDeepLearningEngine.test.ts` (18 cases, commit `72cd16d5a4`)
- Doctrine touchpoints: [[feedback_always_build]] (decomposition IS building), [[feedback_verify_actual_contract_not_proxy]] (read the module's `.calculate()` body, not the headline), R12 fail-loud
