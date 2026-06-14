---
name: reference_lathe_roundtrip_accuracy_rung_b_2026_06_03
description: "WHISKEY-LATHE-ACCURACY-MS0 Rung B — lathe adapter bound + true print→program→post roundtrip accuracy harness; honest baseline 41.6% (op100/SFM8.5/IPR6.3, LOWER BOUND). The \"prove 100% accuracy\" goal is now MEASURABLE, not proven."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.191Z
aliases: reference_lathe_roundtrip_accuracy_rung_b_2026_06_03
---


# Lathe print→program ROUNDTRIP accuracy — Rung B (slot:whiskey, 2026-06-03)

Continuation of [[reference_lathe_print_to_program_accuracy_state_2026_06_03]] (Rung A). `/checkin-whiskey /goal /loop` to "prove 100% accuracy of print→cnc for all JM lathe programs." Two units shipped on `cad-fusion-live-ms0`:

**U-LATHE-ADAPTER-BIND** (`3e9b3e8667` precursor commit): bound the lathe domain adapter in `PipelineHarnessAdaptersEngine.ts` — `makeLatheAdapter()` wraps `turningPrintToProgramEngine.runPipeline()` into the canonical 6-stage harness shape (tool_id handoff invariant), `isBound('lathe')→true`, and the `devDispatcher` gate is now `!isBound(domain)`-driven (lathe live from MCP). Was a STUB (only mill bound). +9 tests (26/26 green), tsc clean, 2-reviewer re-verify PASS.

**U-ROUNDTRIP-ACCURACY-RUNG-B** (`3e9b3e8667`): `mcp-server/scripts/lathe-print-to-program-roundtrip-accuracy.ts` — parse JM Okuma `.MIN` → derive `TurningInput` → regenerate via the bound adapter → diff params vs the master. Dashboard: `state/shared/dashboards/lathe-roundtrip-accuracy.{json,md}`.

## The honest number (R12 — NOT 100%)
24-sample stratified baseline, ±35% band:
- **op-coverage 100%** — PRISM plans every op category the master used. Process planning is sound.
- **SFM in-band 8.5%**, **IPR in-band 6.3%**, **mean 41.6%** — a **LOWER BOUND**, not a "PRISM is 42% correct" verdict.

## Why the speed/feed gap (the data-opt punch list)
1. **Forced material default (dominant driver):** the harness regenerates EVERY part as 1018/ISO-P (no per-`.MIN` material inference). Real JM die-shop lathe parts are largely tool-steel/stainless/hardened → true SFM 2-4× LOWER. PRISM recommends aggressive P-group speeds against ground-truth cut in harder material → SFM axis systematically under-scores.
2. **JM shop-profile conservatism:** even matched, JM masters run more conservative SFM/IPR than PRISM's textbook `CANONICAL_TURNING_SPEEDS`/`_FEEDS` (P rough 220 / finish 320 m/min → 722/1050 SFM vs JM 200-450 SFM; feeds ~2× too aggressive).

## NEXT (RESUME for iter-3 — closes the gap, drives the number up)
- **Material inference**: derive ISO group / material from `.MIN` comments + customer + program family (NOT from speed — that's circular). Feed real material into `deriveInput()` → re-measure.
- **JM shop-profile speed/feed calibration override**: a JM-specific Vc/feed layer (prior handoff flagged "JM shop-profile SFM override"; `TurningPrintToProgramEngine.ts:688` Ra-driven finish feed). Calibrate against Rung-A ground-truth cloud (`lathe-jmdie-param-accuracy.json`: finish 0.0025 IPR / G96-literal 200 SFM; rough 0.007 IPR / 250 SFM).
- Re-run `npx tsx mcp-server/scripts/lathe-print-to-program-roundtrip-accuracy.ts --sample N` after each data change; watch SFM/IPR in-band % climb.

## Gotcha (saved for the fleet)
`catalogLoader.ts` uses CJS `__dirname` → any `tsx` script importing an engine that transitively loads `ToolCatalogEngine` crashes with "ReferenceError: __dirname is not defined in ES module scope" (works in vitest + esbuild-dist). Workaround in the harness: set `globalThis.__dirname` to `mcp-server/src/data` BEFORE a dynamic engine import. Root fix (deferred): make `catalogLoader.ts` ESM-safe via `fileURLToPath(import.meta.url)`.

Related: [[reference_lathe_print_to_program_accuracy_state_2026_06_03]] · [[reference_whiskey_lathe_soul_designation_2026_05_27]] · [[feedback_check_units_first]] (INCH .MIN ↔ MM TurningInput ↔ SFM conversions).
