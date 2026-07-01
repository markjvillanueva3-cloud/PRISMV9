# SFC Flank-Wear Force-Growth Coupling — design spec (U-OSC-SFC-FLANK-WEAR-FORCE)

**Author:** oscar (slot:oscar) · 2026-06-29 · de-risk spec for the #1 verified SFC NEEDS_WIRING gap.
**Status: DESIGN — physics-reviewer-gated build, do in a clean context.** Sibling of the proven
[`SFC-HELIX-CORE-FORCE-SPEC-2026-06-29.md`] pattern (spec → clean-context build → physics-reviewer + 3-of-3).

## 1. The gap (verified in code, 2026-06-29) — it is a WIRING gap, not missing physics
`UltimateSpeedFeedEngine` models cutting force at the **fresh tool** (Kienzle `Fc = Kc·ap·hex`) and
separately reports wear *time* (`time_to_vb_03mm` / `time_to_vb_06mm`, Taylor). It does **NOT** apply the
force RISING as flank wear `VB` grows to its safety gates.

**The force-vs-wear model ALREADY EXISTS** — `WearForceCompensationEngine` (288 LOC, cited Archard 1953 /
Shaw 2005), wired to `calcDispatcher` as the `wear_force_correction` action, computes
`F_corrected = F_fresh · (1 + C_w · VB)` → `{corrected_force_N, force_increase_pct}` (a multi-op
orchestrator already surfaces `wear_force_increase_pct` alongside `thermal_growth_um`/power, `calcDispatcher.ts:518`).
**The gap is that the 3 SFC core engines (`UltimateSpeedFeed` / `NineAxisOrchestrator` / `SpeedFeedOrchestrator`)
have 0 consumption of it** (verified grep) — so the deflection / spindle-power / workholding checks run on
the **fresh-tool** force, un-conservative late in tool life (worn tool ≈1.5–2× fresh `Fc`). **This is a
NEEDS_WIRING/coupling unit, NOT new physics** — do NOT build a second wear-force model.

## 2. The model (REUSE the existing engine — do not re-derive)
Use `WearForceCompensationEngine`'s existing multiplicative model:
```
F_corrected = F_fresh · (1 + C_w · VB)
```
`C_w` (the per-unit-VB fractional force-increase coefficient, already in `WearForceCompensationEngine`) is
material-dependent. `VB=0` (fresh) ⇒ `F_corrected = F_fresh` (clean limit). The radial/axial components
scale with the same factor `(1 + C_w·VB)`, so apply it to the resultant. (Note: an earlier draft of this
spec proposed a NEW additive `Fc + k_w·VB·ap` model — REJECTED as a duplicate of the existing
multiplicative engine; reuse the built+cited one. R16/R8.)

## 3. Model decision — at what VB does the SFC report force?
| Option | Behavior | Verdict |
|--------|----------|---------|
| A. Fresh only (status quo) | `VB=0` | un-conservative — the bug |
| B. **Report fresh + worn-at-limit; feed WORN into safety checks** | compute `Fc` at `VB=0` (primary display) AND at the wear limit `VB_uniform=0.3` (finishing) / `VB_max=0.6` (roughing) — already constants in-engine — and run deflection/power/workholding on the WORN force | **RECOMMENDED** — conservative (the cut must survive a worn tool), non-regressing (display stays fresh), additive |
| C. User-supplied current VB | force at an operator `current_vb_mm` | nice-to-have follow-up; default to B's limit when absent |

**Recommend Option B:** the safety gates (deflection >50 µm, spindle stall, workholding retention) must
hold at END-OF-LIFE VB, not just fresh. Report `forces.cutting_force_worn_N` + a warning when the worn
force pushes any gate over threshold; keep the headline `tangential_force_N` at fresh (non-regression).

## 4. Constants — REUSE the existing `C_w` (no new constant)
`C_w` already lives in `WearForceCompensationEngine`. The wiring unit consumes the engine; it does NOT
add a new constant. IF audit finds `C_w` hard-coded inside the engine rather than sourced from
`src/physics/constants.ts`, promote it to canonical (per ISO group, cited) as a small sibling cleanup —
but that is the engine's concern, not a new SFC-core constant. Soul refuse `inline-physics-constants` still
binds the engine.

## 5. Non-regression strategy (MANDATORY)
- Headline force outputs (`tangential_force_N`, `radial_force_N`, `axial_force_N`, `resultant_force_N`)
  stay at the **fresh-tool** value → the 401-assertion gauntlet (`UltimateSpeedFeedEngine.test.ts`) +
  the ultimate-speed-feed gauntlets stay byte-identical (they assert fresh-tool forces).
- Worn force is an **ADDITIVE** output (`cutting_force_worn_N`) + an additive safety warning. The
  deflection/power/workholding VERDICTS may tighten (a worn-tool cut that fails is correctly flagged),
  so re-baseline only the specific tests that assert a verdict on a near-limit cut — and only in the
  SAFE (more-conservative) direction (R12: never weaken a safety assertion to make it green).
- `VB=0` (fresh) ⇒ `k_w·0·ap = 0` ⇒ `Fc_worn = Fc_fresh` exactly — the clean limit.

## 6. Blast radius (audit before shipping)
- Deflection beam model (reads `F_resultant`) — worn force → higher deflection → tighter (safe).
- Spindle-power stall guard (`Pc = Fc·Vc/60000`) — worn `Fc` → higher power demand → tighter (safe).
- NineAxis `checkWorkholding` (reads `resultant_force_N`) — feed the worn resultant → tighter (safe).
- Confirm NO gate is made MORE permissive by the change (it only adds a worn-force path).

## 7. Test plan (R9)
- Non-regression: fresh calc (`VB=0` / no wear input) → all headline forces byte-identical to pre-change.
- Sensitivity: `Fc_worn(VB=0.3) > Fc_fresh`; monotone in VB; `≈ Fc_fresh + k_w·0.3·ap` to a reference value.
- Safety: a near-limit deflection/power/workholding cell flips to FAIL on the worn force when it passed
  fresh — and is NOT more permissive than the fresh baseline anywhere.
- Variability: ≥3 ISO groups (P/K/S — spanning k_w low→high).
- Adversarial: `VB` NaN/negative/huge → clamp/fallback to fresh, no crash.
- Cross-consumer: round-trip through `SpeedFeedNineAxisOrchestratorEngine` (worn resultant tightens
  `workholding_check`), not just the singleton.

## 8. Gates
- **physics-reviewer MANDATORY** (force-model change). 401-gauntlet 61/61 green (non-regression).
  Per-file 2-arm + 3-of-3 at stop. Hermes/Grok advisory cross-review (free, out-of-context) optional.

## 10. TURNKEY build recipe (API + injection point verified 2026-06-29 — clean-context build is mechanical)
**Producer API** (`WearForceCompensationEngine`, verified):
```ts
import { wearForceCompensationEngine } from "../engines/WearForceCompensationEngine.js";
const worn = wearForceCompensationEngine.computeWearForce({
  fresh_force_N: F_resultant,            // the fresh-tool resultant
  flank_wear_vb_mm: VB_LIMIT,            // 0.3 finishing / 0.6 roughing (engine consts VB_uniform/VB_max)
  tool_material: input.tool_material ?? "carbide",
}); // -> { corrected_force_N, force_increase_pct, wear_coefficient_Cw, is_excessive (>50%), ... }
```
Cw is sourced inside the engine (carbide 1.5 / hss 2.0 / ceramic 1.2 / cbn 1.0 / pcd 0.8 mm⁻¹; cited
Smithey/Kapoor/DeVor 2000). Model `F_worn = F_fresh·(1+Cw·VB)`.

**Injection point + DISCOVERED COMPLEXITY (verified by reading the consumption sites 2026-06-29 — the build is NOT a single-site edit):**
The worn force has THREE separate consumption sites, each reading a different variable:
- deflection beam (`UltimateSpeedFeedEngine.ts:2515`) reads **`F_resultant`**,
- spindle-power (`:2523` `power_kw = Fc·Vc/60000`) reads **`Fc`**,
- torque (`:2495`) reads **`Fc`**,
- NineAxis `checkWorkholding` (`SpeedFeedNineAxisOrchestratorEngine.ts:1386`) reads the **HEADLINE `forces.resultant_force_N`** output (cross-engine).
The multiplier `m = corrected/fresh = (1+Cw·VB)` applies to all components, so worn `Fc = Fc·m`, worn `F_resultant = F_resultant·m`.

**Non-regression tension (the reason this is advisory-first, NOT one edit):** the 401-gauntlet asserts
`power_kw` + `deflection_um` VALUES and passes **no** wear input. If the worn path computes at a default
`VB_limit=0.3`, those outputs change ⇒ gauntlet breaks. And NineAxis reads the *headline* resultant, so
feeding worn into `checkWorkholding` requires EITHER a worn headline (breaks gauntlet + the keep-headline-
fresh rule) OR a NineAxis change to read a NEW `cutting_force_worn_N` field. So the verdict-coupling is a
multi-site + cross-engine change.

**RECOMMENDED two-step (mirrors the shipped helix advisory→core sequence):**
- **Step 1 (ADVISORY, low-risk, build first):** add ADDITIVE outputs `forces.cutting_force_worn_N` +
  `wear_force_increase_pct` (always computed at the `cut_type` VB-limit via the engine) + a CONDITIONAL
  warning when `worn.is_excessive` (>50% growth — fires for hss/high-VB, not standard carbide). Verdicts
  UNCHANGED ⇒ gauntlet stays green (new output fields + a conditional warning don't touch asserted values;
  CONFIRM no gauntlet test asserts the exact warnings array for an hss case before shipping). Guard
  `VB`/`tool_material` NaN/absent→fresh.
- **Step 2 (CORE verdict-coupling, clean context):** feed worn `Fc` into power/torque + worn `F_resultant`
  into deflection, and add a `cutting_force_worn_N` field that NineAxis `checkWorkholding` consumes — then
  re-baseline ONLY the specific verdict tests in the SAFE direction. Two engines, careful per-site.

Both steps: physics-reviewer + 3-of-3 + 401-gauntlet. `VB_uniform=0.3`/`VB_max=0.6` already in-engine (~L1041);
inputs `tool_material` (L125) + `cut_type` (L138) already present.

## 9. Why a spec now, build later
This is a safety-bearing force-model coupling feeding the deflection/power/workholding gates. Per the
proven helix discipline, the design (model choice + the new `k_w` constant + the conservative VB choice)
is spec'd here so the build runs in a clean context without rushing a safety-relevant force model in a
deep one. Backlog + verification: [[reference_oscar_sfc_physics_gap_backlog_grok_2026_06_29]]. Next units
after this: instantaneous-runout peak-force → stability, workpiece thermal-expansion → tolerance, BUE
effective-rake force.
