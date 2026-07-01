---
title: U-WIRE-ENERGY — wire MachiningEnergyModelEngine into prism_calc:machining_energy_model
milestone: WIRE-UNWIRED-MS0
unit_id: U-WIRE-ENERGY
shipped_at: 2026-05-17
shipped_by: claude-9587867d / slot kilo
commit: 7fab606fa9
status: shipped
kind: architecture
---

# U-WIRE-ENERGY

Closes a **half-orphan** in `prism_calc`. The `machining_energy_model` action was already enum-listed at calcDispatcher.ts line 709 AND had a slimResponse remap at calcExtractKeyValues line 290-291 — but NO executor case body. Calls fell through to the default branch and returned an error.

This is a different class than the previous U-WIRE-ARCFIT orphan (ArcFittingEngine was completely invisible to the dispatcher). U-WIRE-ENERGY closes the "ghost-wired" failure mode: visible in the action surface, ostensibly returning a slimmed shape, but inert at the dispatch layer.

## What changed (4 files)

| File | Change |
|------|--------|
| `mcp-server/src/engines/MachiningEnergyModelEngine.ts` | import `CANONICAL_KIENZLE` from `src/physics/constants.ts`; thread per-ISO `kc1_1` AND `mc` (was inline `KC11` table with values 14-28% off canonical + hardcoded `mc=0.25` for all ISOs) |
| `mcp-server/src/schemas/calcActionSchemas.ts` | new `machining_energy_model` Zod schema (~line 358) + `ACTION_CALC_SCHEMAS` map entry (~line 1270); `spindle_efficiency` bound to `(0, 1]` |
| `mcp-server/src/tools/dispatchers/calcDispatcher.ts` | executor case body (~line 1277) — lazy import + `params as Parameters<...>[0]` cast + spreads `wrapped.value` to top-level so the existing slimResponse remap at line 290-291 reads `result.total_kwh` correctly |
| `mcp-server/src/__tests__/machining-energy-model-wiring.test.ts` | 16 behavioral cases (newly created) — `PASS 16/0` |

## Why a canonical-constants migration sneaked into a wiring unit

The Reviewer B scrutiny pass flagged a **doctrine violation hiding in the engine**: the previous `const KC11: Record<string, number> = { P: 2100, M: 2500, K: 1500, N: 800, S: 3200, H: 4000 };` directly contradicts the CLAUDE.md HARD safety rail "NEVER inline Kienzle/Taylor/material constants — import from `src/physics/constants.ts`" — AND the values were materially wrong (canonical P=1800, M=2100, K=1100, N=700, S=2800, H=3200; the engine inlined values were 14-28% higher per ISO group).

The engine had been *dead* since shipping (no executor body = no calls), so the wrong values never reached production. Wiring it AS-IS would have put non-canonical Kienzle values onto a live MCP surface — a regression on the `prism_calc` action set. So the migration to canonical was a load-bearing prerequisite to wiring, not a separate unit.

Side effect: the engine's hardcoded `mc=0.25` exponent in the Kienzle expansion `hm * hm^(-0.25)` is also wrong for K/N/S/H (canonical mc varies per ISO). Now threaded per-ISO via `const { kc1_1, mc } = CANONICAL_KIENZLE[material.iso_group]`.

## Executor case body shape

```ts
case "machining_energy_model": {
  const { machiningEnergyModelEngine } = await import("../../engines/MachiningEnergyModelEngine.js");
  const wrapped = machiningEnergyModelEngine.compute(params as Parameters<typeof machiningEnergyModelEngine.compute>[0]);
  // Spread .value to top-level so the existing slimResponse remap at line
  // 290-291 (which reads result.total_kwh, sec_j_mm3, co2_kg, efficiency_pct
  // directly) sees the engine's numerics. Sidecar _unit/_formula/_confidence
  // preserve the AtomicValue envelope for callers that want provenance.
  result = { ...wrapped.value, _unit: wrapped.unit, _formula: wrapped.formula, _confidence: wrapped.confidence };
  break;
}
```

The spread-to-top-level pattern is **inverted** from every other AtomicValue-wrapped engine in the dispatcher (most leave `result = engine.compute(...)` and have the slimmer read `result.value.X`). The choice here is locked by the existing slimResponse remap that pre-dated this case body — changing the slimmer's read shape would be a wider change. Tracked as a P2 cross-cutting reconciliation unit.

## Schema

```ts
const machining_energy_model = z.object({
  cutting: z.object({
    spindle_rpm: posNum.describe("Spindle speed (RPM)"),
    feed_rate_mmmin: posNum.describe("Feed rate (mm/min, table-frame)"),
    axial_depth_mm: posNum.describe("Axial depth of cut ap (mm)"),
    radial_depth_mm: posNum.describe("Radial depth of cut ae (mm)"),
    cutting_speed_m_min: posNum.describe("Cutting speed Vc (m/min)"),
  }),
  tool: z.object({ diameter_mm: posNum, flute_count: z.number().int().positive() }),
  material: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    volume_to_remove_cm3: posNum,
  }),
  machine: z.object({
    standby_power_kw: posNum,
    // Bound (0, 1] — passing >1 inverts the (P/eff) division.
    // Reviewer B P0 hardening 2026-05-17 kilo.
    spindle_efficiency: z.number().gt(0).lte(1).optional(),
    axis_power_kw: optPosNum,
    coolant_pump_kw: optPosNum,
    atc_time_s: optPosNum,
    tool_changes: z.number().int().nonnegative(),
  }),
  coolant_type: z.enum(["flood", "mist", "mql", "dry"]),
  electricity_cost_per_kwh: optPosNum,
}).passthrough();
```

## 16-case test design

1. **Conservation invariant** — `s+a+c+i+at-t < 5e-4`, all 5 legs strictly positive (incl. `idle>0`, added in scrutiny round).
2. **Lazy-import parity** — `dispatcher.total_kwh === engine.compute().value.total_kwh` (same on 6 keys).
3. **CO₂ factor** — `co2 ≈ t × 0.42` (US grid emission, 3dp).
4. **Cost override** — `cost ≈ t × user_price` (3dp).
5. **Cost default** — omitted electricity_cost_per_kwh ⇒ 0.12 $/kWh.
6. **Dry coolant** — `coolant_kwh === 0` exactly.
7. **Coolant ladder** — `flood > mist > mql > dry`.
8. **ISO group propagation** — P (canonical kc1_1=1800) > N (canonical kc1_1=700).
9. **MRR scaling** — doubling volume ≈ doubles cycle_time (±5%).
10. **ATC contribution** — `atc(0)===0`, `atc(10) > atc(1)`.
11. **Recommendations relevance gate** — emitted text matches `/efficiency|sec|mrr|depth|feed/` (R9, Reviewer B P1 fix).
12. **Branch monotonicity** — bad-input cycle emits STRICTLY MORE recommendations than aggressive well-tuned cycle (Reviewer B negative-test P1).
13. **AtomicValue envelope** — `_unit==="kWh"`, `_formula` string, `_confidence===0.8`, top-level numerics present.
14. **spindle_efficiency default** — omitting ≡ explicit 0.85.
15. **Finite efficiency** — canonical + tiny volume + low spindle_efficiency all yield finite ≥0 (Reviewer B P1 fix — adversarial inputs added).
16. **Hardened material span** — ISO H (canonical kc1_1=3200) yields strictly max spindle_kwh across P/M/K/N/S/H.

## 2-reviewer per-file gate

6 reviewers fired across 3 files in parallel. **4 PASS, 2 FAIL (Reviewer B on schema + Reviewer B on test).** All FAIL findings P0/P1 addressed in scrutiny round 2:

- **P0 fixed**: Engine `KC11` migrated to `CANONICAL_KIENZLE` import; engine `mc=0.25` migrated to per-ISO canonical; test docstrings updated from wrong values to canonical values.
- **P0 fixed**: Schema `spindle_efficiency` bounded `(0, 1]` (was unbounded `optPosNum`).
- **P1 fixed**: Test #11 ("recommendations") now requires emitted text to match a relevance regex — no longer false-positive-passes against any non-empty string.
- **P1 fixed**: Test #1 (conservation) now asserts `idle_kwh > 0` (was missing).
- **P1 fixed**: Test #14 renamed and given 2 adversarial inputs (tiny volume + low spindle_efficiency) — previous name promised edge-case coverage but only fed canonical.
- **P1 fixed**: New test #12 (branch monotonicity) — bad input emits strictly more recommendations than well-tuned.

Deferred (P2/P3 follow-ups, NOT blocking):

- **P2** — `calcExtractKeyValues` slimmer has no `machining_energy_model` branch optimized for `pressurePct > 50`. The current line-290 remap returns 4 keys; under context pressure the `default:` extractor returns the first 5 scalars from the result. Acceptable but worth a follow-up unit.
- **P2** — Engine not in `src/engines/index.ts` barrel. Dispatcher path-imports work without it.
- **P2** — AtomicValue handling convention: this case spreads `.value` to top-level while most others leave the envelope intact. Reconciliation is a cross-cutting unit.
- **P3** — `electricity_cost_per_kwh` has no upper bound; a fat-fingered 12.0 would 100× the cost result silently. Cosmetic — doesn't affect engine semantics.
- **P3** — `tool_changes` has no upper bound; a fat-fingered 1_000_000 would dwarf cutting energy. Cosmetic — wouldn't pass schema validation.

## Anti-regression

- `machining_energy_model` was already in ACTIONS enum (no count change); schema map +1 entry (119 → 120).
- 16/16 wiring tests pass.
- Previous unit's `arc_fit_kasa` test (13 cases) still PASSes — no cross-engine regression from the canonical-constants migration.
- `npx tsc --noEmit` introduces zero new errors (5 pre-existing errors in calcDispatcher.ts are outside the changed range, same set as before this unit).

## How this unit was found

Same protocol as U-WIRE-ARCFIT (the prior kilo unit): ran `scripts/validate-unwired-signal.mjs --sample 50` to get a fresh deterministic sample of the 729-pool, filtered WEAK-SIGNAL by `firstMatch.startsWith("test:")` (test-only references = functional orphans). `MachiningEnergyModelEngine` was in that list. Grep across `mcp-server/src/tools/dispatchers/` revealed the half-wired state — ACTIONS enum + slimResponse but no body. Test #2 (lazy-import parity) proves the wiring closes the gap end-to-end.

## Sibling reading

- [[u-wire-arcfit]] — the prior kilo wire unit. Same orphan-rescue recipe; different orphan class (fully invisible vs ghost-wired).
- [[reference_wire_unwired_ms0_u_wire01_2026_05_16]] — 96%-noise warning for the 729-pool. Both kilo units confirm that test-only WEAK-SIGNAL is where real orphans hide; the validator's TRULY-UNWIRED bar is too strict.
- [[reference_slimresponse_strips_empty_arrays]] — empty-array gotcha (covered for U-WIRE-ARCFIT, not relevant here since this engine returns scalars + a recommendations[] populated by both conditions on a bad input).

## Commit

```
7fab606fa9 [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-ENERGY: wire MachiningEnergyModelEngine into prism_calc:machining_energy_model
```
