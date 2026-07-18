---
name: reference_echo_nonfinite_emit_bugclass_2026_06_25
description: Non-finite-coordinate XNaN emit is a BUG CLASS across the master-post engines (a non-finite coord field -> .toFixed -> literal "XNaN"/"NaN" the control rejects). Fixed in RokuRoku + HaasNGC (simple emitToolpath-loop shape). OPEN: OkumaB250Lathe (pervasive, needs a fmtCoord helper refactor) + OkumaOSP/HurcoV11 (trace their normalization-guard coverage of the emit path).
type: reference
slot: echo
source: prism-memory
synced: 2026-06-27T20:30:46.562Z
aliases: reference_echo_nonfinite_emit_bugclass_2026_06_25
---


# Echo -- non-finite-coordinate XNaN emit is a BUG CLASS (2026-06-25 audit)

A master-post engine that emits `X${coord.x.toFixed(3)}` (or `op.start_x.toFixed(3)`) WITHOUT a
`Number.isFinite` guard emits a literal **`XNaN`/`YNaN`/`ZNaN`** for a non-finite input field --
G-code the controller REJECTS (or worse). The RokuRoku engine's R9 test caught this live; physics-
reviewer confirmed HaasNGC had the same latent bug. So it is a CLASS, not an isolated defect (R15 §4
apply-to-all / sibling-bug discipline).

## Per-engine audit (2026-06-25, deterministic grep)
| Engine | Emit shape | Guard? | Status |
|---|---|---|---|
| `RokuRokuFanuc31iMillMasterPostEngine` | `coord.x` loop (emitToolpath) | added | **FIXED `4259b15e63`** (test caught it) |
| `HaasNGCMillMasterPostEngine` | `coord.x` loop (emitToolpath) | added | **FIXED `c5fd2e27b5`** (sibling clone + regression test) |
| `OkumaB250LatheMasterPostEngine` | `op.start_x/end_x/start_z/end_z.toFixed(3)` -- DOZENS of scattered sites (L507-510, 542-565, +more) | **NONE (0 refs)** | **OPEN -- vulnerable.** Pervasive; needs a `fmtCoord(v)` safe-format helper applied at EVERY `.toFixed(3)` coord site, NOT a single-loop guard. Operator-named lathe (LB3000/Multus) = high-value. Careful refactor, keep A1 lathe tests green. |
| `OkumaOSPMillMasterPostEngine` | `coord.x.toFixed(3)` (L884-892) | normalization at L1499/1509/1560 (`isFinite ? x : undefined`) | **TRACE NEEDED** -- does the normalized (possibly-`undefined`) coord reach the L884 emit? If yes, `undefined.toFixed` THROWS (different failure than XNaN); if the emit gets pre-validated coords, it may be safe. Verify before fixing. |
| `HurcoV11MillMasterPostEngine` | `coord.x.toFixed(3)` (L1172-1193) | normalization at L1851/1861 | **TRACE NEEDED** -- same as OkumaOSP. |

## Next unit: U-PP-NONFINITE-EMIT-SWEEP
1. OkumaB250Lathe: add module-level `fmtCoord(v: number): string` (`Number.isFinite(v) ? v.toFixed(3) : "0.000 (NON-FINITE - REVIEW)"` + per-call warn), replace every `op.<coord>.toFixed(3)` coordinate site. +regression test (NaN start_x -> no XNaN). Keep the A1 lathe trio green.
2. OkumaOSP + HurcoV11: trace the normalization path to the emit; if a non-finite coord can reach `.toFixed`, add the guard; else document as already-safe with a proof test.
Pairs with the RokuRoku/HaasNGC fixes already shipped. This is the R15-apply-to-all completion of the bug class.
