---
name: reference_audit_type_only_false_positive_2026_06_22
description: "audit-unwired-engines.mjs flagged a TYPE-ONLY module (IEngine.ts, export-type re-export, 0 runtime JS) as UNWIRED -- a false-positive that inflated the actionable orphan count; fixed with a content-based isTypeOnlyModule detector + TYPE-ONLY reclassification (slot:alpha, commit db9a8d113b, 2026-06-22)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.473Z
aliases: reference_audit_type_only_false_positive_2026_06_22
---


# Unwired-engine audit false-positive: TYPE-ONLY modules (U-AUDIT-TYPE-ONLY, slot:alpha 2026-06-22, commit `db9a8d113b`)

## The gap
`scripts/audit-unwired-engines.mjs` -- source of `BUILD_STATE.json` NEEDS_WIRING, the SessionStart "N engines built but UNWIRED" count, and the `/system-viz` ghost-orphan roosts -- classified `IEngine.ts` as **UNWIRED**. But `IEngine.ts` is a **type-only re-export**: `export type { EngineInfo, EngineCapability } from "./BaseEngine.js"` (154 bytes, `size_kb:0`). A `export type` re-export **erases to zero runtime JavaScript**, so there is no runtime value to import -- it can NEVER be "wired to a dispatcher." Flagging it UNWIRED inflated the actionable orphan count (5 -> should be 4) and would send a chat chasing a phantom wiring target. The audit ALREADY excluded `*.types.ts` files **by NAME** (line ~317), but a conventionally-named type-only file (`IEngine.ts`) slips through that name filter.

## The fix (content-based, conservative)
Added a pure exported `isTypeOnlyModule(rawSrc)` (reuses `stripCommentLines`): returns true ONLY when the comment-stripped source has a **positive** type-export marker (`export type` / `export interface`) AND **zero** runtime-export signals:
- RUNTIME_EXPORT: `export (default|const|let|var|function|async function|class|abstract class|enum)` (enum/const-enum counted as runtime = conservative).
- VALUE_REEXPORT: `export {` / `export *` -- crucially does NOT match `export type {` / `export type *` (the `type` keyword sits between `export` and the `{`/`*`).
- CJS: `module.exports` / `exports.x =`.

`main()`: after UNWIRED finalization, reads the **FULL source** of ONLY the UNWIRED candidate set (minimal IO -- not all 3825 engines) and reclassifies type-only ones to a new **`TYPE-ONLY`** class; added a `typeOnlyModules` output section + a `notes[]` entry + an R12 warn on unreadable candidates. Live-validated: **UNWIRED 5 -> 4, TYPE-ONLY 0 -> 1** (IEngine), total engines unchanged (3825); IEngine now in `typeOnlyModules`, gone from `unwiredEngines`.

## Why CONSERVATIVE matters (the dangerous direction)
The only dangerous error is **false-EXCLUDE** -- wrongly dropping a real engine, which would HIDE a genuine wiring gap. So the detector reads the FULL source (a runtime export beyond a 2KB head must be seen), and any runtime export, a mixed type+runtime file, an inline-type bare export (`export { type Foo }`), or a no-export side-effect file all return **false**. Better to leave a type-only file in UNWIRED than to silently drop a dormant engine. A missed type-only is harmless noise; a dropped real engine is a hidden gap.

## Downstream-safety (verified by arm-C scrutiny)
Adding the new `TYPE-ONLY` classification + `typeOnlyModules` key is purely additive: every consumer (`build-state-snapshot.mjs`, `validate-unwired-signal.mjs`, `generate-dormant-engine-roadmap.mjs`, `unwired-bridge-rank.mjs`, `orphan-inventory.mjs`, `generate-unwired-engine-wiki.mjs`) reads `unwiredEngines` (strict `=== "UNWIRED"` filter, so type-only files vanish) + reads `counts` via defensive exact-key lookups (`c.UNWIRED ?? ...`) -- none enumerates the classification set. `build-state-snapshot.mjs:395` (`built = totalEngines - unwired`) will report a slightly HIGHER built count (a type-only file is no longer counted as an unbuilt orphan -- arguably more correct; a derived display metric, not a gate).

## Lesson (generalize)
The unwired-engine audit must recognize that a **type-only TS module (zero runtime JS) is not a wireable engine** -- a content-based exclusion, because a name-based `.types.ts` filter misses conventionally-named type files. This is the 3rd false-positive class fixed in this audit: sibling of [[reference_audit_wired_via_engine_2026_06_10]] (engine->engine consumption) and the 2026-06-11 array-dispatch fix (`*_ACTIONS.includes(action)`). Pattern: an orphan/unwired audit must model EVERY legitimate non-orphan shape (engine->engine consumption, array-membership dispatch, type-only erasure) or it cries wolf and the fleet chases phantoms. Tests: 63/63 (16 new) incl 2 live-file E2E oracles. Per-file 2-arm scrutiny PASS, 0 P0/P1.

## Sibling closure (R15 fit-the-whole, commit `06740a6813`)
The SAME type-only false-positive existed in the sibling orphan detector `.claude/hooks/stop_on_unwired_assets.mjs` (the Stop gate). Reading it (R8) corrected an initial wrong hypothesis: `checkEngineWired` ALREADY escapes type-only files via its "no singleton export (data module)" path -- but `checkEngineTested` only escaped via the `WIRE-EXEMPT` marker, so a new type-only `*Engine.ts` (e.g. `IFooEngine.ts`) with no test would be flagged **UNTESTED** (you can't write >=10 `it()` cases for a type re-export). Fix: cloned a self-contained `isTypeOnlyModule` into the hook (clone-don't-fork per R15 -- a hook must not import from `scripts/`) + a parallel early-return in `checkEngineTested`. Low practical risk (double-gated: rare file shape + the hook is bypassed fleet-wide by `PRISM_ALLOW_UNWIRED=1`) but closes the latent inconsistency so the gate is correct when armed. 39/39 hook tests, 2-arm scrutiny PASS (arm A: 20 runtime shapes never skip the test; arm C: 27-case battery through BOTH files, zero clone divergence). **The two copies are pinned by tests on both sides** -- a one-sided harmful drift surfaces as a failure. LESSON ADDENDUM: when fixing a false-positive class in one detector, grep for the SIBLING detector(s) of the same class and fix them together (R16 fit-the-whole) -- but READ each sibling's actual logic first (the exposure was in a DIFFERENT function than first assumed).

Verify: `node scripts/audit-unwired-engines.mjs` (expect TYPE-ONLY=1=IEngine, UNWIRED=4) · `node --test scripts/audit-unwired-engines.test.mjs` · `node --test .claude/hooks/__tests__/stop_on_unwired_assets.type-only.test.mjs` · `git -C H:/prism show db9a8d113b 06740a6813`. Related: [[reference_audit_wired_via_engine_2026_06_10]] · [[reference_stop_unwired_array_dispatch_fix_2026_06_11]] · [[reference_fleet_unwired_audit_2026_06_11]] · [[feedback_always_capture_lessons]].
