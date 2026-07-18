# SF-PSN-WIRE-MS0/U-SFPSN-02B — Taylor Formula Reconciliation Spec

**Date:** 2026-05-22 · **Author:** claude-a8894112 (slot juliett /loop iter 5) · **Milestone:** [[SF-PSN-WIRE-MS0]] · **Companion:** [[reference_sf_psn_u02_semantic_gap_2026_05_22]]

## 1. Problem statement

U-SFPSN-02A composed `KienzleForceModel` via a bit-equivalent behaviour-preserving shim (shipped `d46733d245`, 180 fixtures pass within 1e-12). The Taylor side cannot follow the same pattern: the engine's inline `extendedTaylorToolLife()` and the module's `ExtendedTaylorModel.calculate()` use **structurally different formulas**, not just differently-parameterised forms of the same formula.

### 1.1 Inline (engine, UltimateSpeedFeedEngine.ts:925)

```
T = (C / (V * f^m * d^p))^(1/n),   m = p = 0.1 (hard-coded defaults)
```

Canonical extended-Taylor: a single `^(1/n)` over the entire `C/X` ratio.

### 1.2 Module (`src/algorithms/ExtendedTaylorModel.ts` — actual implementation, lines 311-361)

The docstring header advertises:
```
T = (C * k_coat * k_temp * k_hard) / (V^(1/n) * f^a * ap^b)
```
**but the implementation differs from the docstring on two counts** (verified by reading `calculate()` body at U-02B pickup, 2026-05-22 iter 8):

1. `C` is **inside** the `^(1/n)` operation: `baseLife = (C/Vc)^(1/n)` (line 313). The docstring's `Vc^(1/n)` denominator (with `C` raised to power 1) is wrong.
2. `f` and `ap` are **normalized against reference values** before being raised to `^a` and `^b`:
   ```
   feedFactor = (f / REFERENCE_FEED)^a       REFERENCE_FEED  = 0.30 mm/rev   (line 169, 320)
   depthFactor = (ap / REFERENCE_DEPTH)^b    REFERENCE_DEPTH = 2.0 mm        (line 170, 321)
   ```
   The docstring's raw `f^a * ap^b` is missing the normalization.

The **actual** module formula is:
```
T_module = (C/Vc)^(1/n) * (k_coat * k_temp * k_hard) / ((f/0.30)^a * (ap/2.0)^b)
```

Where `a, b` are per-ISO-group `EXTENDED_EXPONENTS` (P: 0.77/0.37, M: 0.82/0.35, K: 0.70/0.40, N: 0.60/0.30, S: 0.85/0.42, H: 0.80/0.38).

### 1.3 The two formulas are still NOT algebraically equivalent — but the gap is smaller than spec v1 thought

Expanding inline (canonical):
```
T_inline = (C/V)^(1/n) * f^(-0.1/n) * d^(-0.1/n)
```

Expanding module (corrected understanding):
```
T_module(k=1) = (C/V)^(1/n) * (0.30/f)^a * (2.0/ap)^b
              = (C/V)^(1/n) * 0.30^a * 2.0^b * f^(-a) * ap^(-b)
```

| Term | Inline | Module |
|---|---|---|
| C | `(C/V)^(1/n)` | `(C/V)^(1/n)` — **same** |
| V | inside `^(1/n)` | inside `^(1/n)` — **same** |
| f | `f^(-0.1/n)` ≈ `f^-0.4` (n=0.25) | `0.30^0.77 * f^-0.77` ≈ `0.394 * f^-0.77` |
| d | `d^(-0.1/n)` ≈ `d^-0.4` | `2.0^0.37 * ap^-0.37` ≈ `1.293 * ap^-0.37` |

The first two terms agree exactly; the third and fourth differ in exponent topology (the inline ties `m/n` and `p/n` to the speed exponent, the module's `a, b` are independent material-tuned values).

### 1.4 Worked divergence — REVISED (ISO P, V=150, C=250, f=0.15, ap=2, n=0.25)

| Formula | Computation | Result |
|---|---|---|
| Inline | `(250 / (150 * 0.15^0.1 * 2^0.1))^4 = (250/132.97)^4` | **≈ 12.5 min** |
| Module (actual impl, k=1) | `(250/150)^4 * (0.30/0.15)^0.77 * (2.0/2.0)^0.37 = 7.716 * 1.706 * 1.0` | **≈ 13.2 min** |
| Module per docstring (wrong) | `(250 * 1) / (150^4 * 0.15^0.77 * 2^0.37)` | ~1.8 × 10⁻⁶ min (spec v1, refuted) |

**Spec v1's "orders-of-magnitude divergence" claim was wrong** — it computed the docstring formula, not the actual implementation. The real divergence is ~5% for this fixture, scaling with the difference between `(0.10/n, 0.10/n)` (inline) and `(a, b)` (module) exponents. This is still not bit-equivalent — option (a) inline_compat is still required for U-02B's headline exit-condition (preserve engine outputs bit-equivalent) — but spec v2 must record the actual algebra, not the docstring's.

## 2. Decision

**OPTION (a) — extend `ExtendedTaylorModel` with an `inline_compat` mode that reproduces the engine's `m = p = 0.1` form.**

The module continues to expose its richer extended form (coating/temp/hardness corrections + ISO-group exponents) as the default. Callers requesting bit-equivalence to the engine's pre-refactor behaviour pass `mode: "inline_compat"` and the module emits:

```
T = (C / (V * f^0.1 * d^0.1))^(1/n)
```

No corrections applied; no ISO-group exponent override. This is structurally identical to the engine's inline formula.

### 2.1 Why option (a) over option (b)

| Criterion | (a) inline_compat shim | (b) accept module physics, re-baseline tests |
|---|---|---|
| Engine-side risk | None — bit-equivalent | High — 22.4K + 33.1K LOC of UltimateSF test fixtures must be re-baselined |
| Module physics gained | None in default callers | Coating/temp/hardness + better-tuned exponents flow through every SF call |
| Effort | ≈30 (add mode flag + branch) | ≈100+ (re-baseline + verify each fixture is intentional) |
| Reversibility | Cheap — flip default later | Hard — fixture deltas merge with peer changes |
| Cohesion with U-02A | High — same shim pattern | Low — different mental model |
| Unblocks U-02C? | Yes | Yes |

(a) is the safer first step. It preserves engine behaviour while making the algorithm-module composition real, which is what U-SFPSN-02B's headline exit-condition requires.

### 2.2 (b) is tracked as a future evolution, not lost

A new unit **U-SFPSN-02D** (effort ≈100, P2) is added to the milestone envelope when this spec lands: *"adopt ExtendedTaylorModel's full extended form across the SF physics path + re-baseline UltimateSF test fixtures"*. (b)'s better physics is captured as a follow-up rather than being abandoned.

## 3. Implementation plan (U-SFPSN-02B's coding work)

### 3.1 Module change (additive, low-risk)

Add an `inline_compat` flag to `TaylorInput`:

```ts
export interface TaylorInput extends AlgorithmInput {
  // ... existing fields ...
  /** When true, reproduce the canonical extended-Taylor form
   * T = (C / (V * f^m * d^p))^(1/n) with m = p = 0.1 and no corrections.
   * Used by SF engine shims (SF-PSN-WIRE-MS0/U-SFPSN-02B) to preserve
   * pre-2026-05-22 engine outputs bit-equivalent. */
  inline_compat?: boolean;
}
```

Branch at the top of `calculate()` (after validation):

```ts
if (input.inline_compat) {
  const Vc = input.Vc_m_min;
  const f = input.f_mm;
  const ap = input.ap_mm;
  const { C, n, isoGroup } = resolveTaylor(input);  // existing helper
  const m = 0.1, p = 0.1;
  const T = Math.pow(C / (Vc * Math.pow(f, m) * Math.pow(ap, p)), 1 / n);
  const T_clamped = Math.max(1, Math.min(600, T));
  return {
    tool_life_min: createAtomicValue(T_clamped, "min", 15, "Taylor-inline-compat", 0.85,
      `T = (${C}/(${Vc}*${f}^0.1*${ap}^0.1))^(1/${n})`),
    base_life_min: createAtomicValue(T, "min", 15, "Taylor-inline-compat", 0.85),
    taylor_C: createAtomicValue(C, "m/min", 5, "canonical", 0.95),
    taylor_n: createAtomicValue(n, "-", 5, "canonical", 0.95),
    feed_exponent: 0.1,
    depth_exponent: 0.1,
    coating_factor: 1.0,
    temperature_factor: 1.0,
    hardness_factor: 1.0,
    total_correction: 1.0,
    changes_per_hour: createAtomicValue(60 / T_clamped, "1/h", 15, "derived", 0.85),
    safety: { score: 0.85 } as SafetyScore,
    computed_at: new Date().toISOString(),
    algorithm_version: ExtendedTaylorModelImpl.VERSION,
    warnings: [],
  };
}
// ... existing extended-form code below ...
```

### 3.2 Engine shim (in UltimateSpeedFeedEngine.ts:925)

```ts
import { ExtendedTaylorModel } from "../algorithms/ExtendedTaylorModel.js";

function extendedTaylorToolLife(
  Vc_mpm: number, n: number, C: number,
  feed_mm?: number, doc_mm?: number,
  m: number = 0.1, p: number = 0.1,
): TaylorResult {
  const f = Math.max(0.01, feed_mm || 0.15);
  const d = Math.max(0.1, doc_mm || 2.0);

  // U-SFPSN-02B: delegate to ExtendedTaylorModel's inline_compat mode.
  // Engine's inline_compat hard-codes m=p=0.1; if the caller passes other
  // m/p the inline path is exercised directly (rare — only one caller does).
  let T_min: number;
  if (m === 0.1 && p === 0.1) {
    const out = ExtendedTaylorModel.calculate({
      Vc_m_min: Vc_mpm,
      f_mm: f,
      ap_mm: d,
      inline_compat: true,
      material: { name: "inline-shim", kc1_1: 0, mc: 0.25, taylor_C: C, taylor_n: n, iso_group: "P" } as any,
    });
    T_min = out.tool_life_min.value;
  } else {
    // Non-default m/p — fall through to local formula (no module support yet).
    T_min = Math.pow(C / (Vc_mpm * Math.pow(f, m) * Math.pow(d, p)), 1 / n);
    T_min = Math.max(1, Math.min(600, T_min));
  }

  const speedSens = -1 / n;
  const feedSens = -m / n;
  const docSens = -p / n;
  const absSens = [Math.abs(speedSens), Math.abs(feedSens), Math.abs(docSens)];
  const dominant = absSens[0] >= absSens[1] && absSens[0] >= absSens[2] ? "speed" as const
    : absSens[1] >= absSens[2] ? "feed" as const : "doc" as const;
  return { T_min, sensitivity: { speed: speedSens, feed: feedSens, doc: docSens, dominant } };
}
```

Sensitivity analysis stays inline (it's algebraic, not formula-dependent).

### 3.3 Equivalence test (mirrors U-02A pattern)

`mcp-server/src/__tests__/TaylorShimEquivalence.test.ts`:
- Frozen `oldExtendedTaylorToolLife` baseline embedded verbatim from `df730c2f3a:925-945`.
- 100+ fixtures: 6 ISO C/n pairs × 5 Vc × 4 f × 4 d.
- Assert `|T_new - T_old| / max(1, |T_old|) < 1e-10` (allow some FP drift since module re-enters validation pipeline).
- Verify `sensitivity` triple matches exactly (purely algebraic).

## 4. Acceptance criteria (recorded against U-SFPSN-02B)

1. `ExtendedTaylorModel.calculate()` accepts `inline_compat: true` and returns bit-equivalent (within 1e-10) of the engine's pre-refactor inline formula.
2. `extendedTaylorToolLife()` shim delegates to the module for the default `m=p=0.1` path, falls through for non-default m/p (single edge case).
3. `TaylorShimEquivalence.test.ts` passes 100+ fixtures.
4. Existing UltimateSpeedFeedEngine.test.ts pass-rate unchanged (currently 46/52, the 6 pre-existing failures stay pre-existing).
5. `scripts/sf-psn-leverage-rank.mjs` re-run shows `composedAlgorithmModules` ⊇ `{KienzleForceModel, ExtendedTaylorModel}` and `compositionGapPct` falls.

## 5. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Module's `inline_compat` mode's clamp `[1, 600]` differs from inline `Math.max(1, Math.min(600, T_min))` | Same clamp on both sides — identical. |
| Module validation rejects `f_mm < 0.01` or `ap_mm < 0.1` where inline accepted | Pre-floor the shim inputs to module's min before calling. Document as U-02A-style "documented gap" if behaviour differs at degenerate inputs. |
| Material override via inline `taylor_C, taylor_n` mid-MaterialPhysics shape | Same `as any` pattern as U-02A (already linted-disabled with explanation). |
| TypeScript compile errors from new `inline_compat` field | Schema migration — bump ExtendedTaylorModel's interface version, regenerate any generated schemas. |

## 6. Out of scope

- Adopting the module's full extended form (coating/temp/hardness corrections + ISO-group exponents) → tracked as U-SFPSN-02D (new unit, P2).
- Reading the module's actual `calculate()` body to confirm the docstring formula matches implementation. The `inline_compat` branch sidesteps this; U-02D will require it.
- Modifying any test fixture that depends on the engine's current Taylor outputs.

## 7. Approval gate

- [ ] 3-of-3 scrutiny at next /loop iter (per CLAUDE.md scrutiny gate).
- [x] **2026-05-22 iter 8 (claude-a8894112/juliett)** — module's `calculate()` body read; spec §1.2/1.3/1.4 revised. Docstring was wrong on (a) `C` placement inside `^(1/n)` and (b) reference-value normalization of f/ap. Spec's "orders-of-magnitude divergence" claim refuted; real gap ~5% for ISO-P/n=0.25 fixture. Option (a) inline_compat still chosen — divergence is structural (exponent topology) even if smaller than first thought. Implementation now safe to proceed.

## 8. Linked

- Audit: `state/shared/specs/SF-PSN-VALUE-NODE-AUDIT-2026-05-22.md` (F1)
- Finding: `knowledge/memories/reference/reference_sf_psn_u02_semantic_gap_2026_05_22.md`
- U-02A shipped: commit `d46733d245`, test file `mcp-server/src/__tests__/KienzleShimEquivalence.test.ts`
- Module: `mcp-server/src/algorithms/ExtendedTaylorModel.ts`
- Engine: `mcp-server/src/engines/UltimateSpeedFeedEngine.ts` lines 925-945
- Meta artifact: `scripts/sf-psn-leverage-rank.mjs`
