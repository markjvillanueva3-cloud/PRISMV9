---
name: reference-u-axis2-numeric-dialect-2026-05-26
description: Tango shipped PostProcessorNumericDialectEngine (Axis 2 numeric-precision drift detector) — closes prior handoff gap. Absorbed into peer commit. H8 count = 7 in 6 days.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.987Z
aliases: reference_u_axis2_numeric_dialect_2026_05_26
---


# U-AXIS2-NUMERIC-DIALECT — numeric-precision drift detector (2026-05-26, slot:tango /loop iter2)

Closes the **Axis 2 documented gap** explicitly named in [[reference-tango-testing-infra-2026-05-25]] and the [[reference-u-axis1-viz-closure-2026-05-26]] memo: "Axis 2 catches LEXICAL foreign macros but not numeric-precision dialect drift (decimals, leading-zero, modal defaults, feed-units)."

## What shipped

- `mcp-server/src/engines/PostProcessorNumericDialectEngine.ts` (477 LOC) — pure detection engine with 6 detector axes (D1 leading-zero / D2 trailing-zero+decimal-point / D3 decimal-separator / D4 signed-zero / D5 modal-default / D6 feed-unit-ambiguity) × 7 controllers (fanuc · haas · okuma_osp · heidenhain_tnc · mazak_mazatrol · siemens_840d · fagor). Vendor manual cited per rule.
- `mcp-server/src/__tests__/PostProcessorNumericDialectEngine.test.ts` (281 LOC, 28 unit tests) — rule-table contract (5) · happy path (3 controllers) · D1-D6 detectors (8) · idempotent (3) · adversarial (5) · pass-rate AtomicValue (2) · singleton (1).
- `mcp-server/src/__tests__/PostProcessorNumericDialectDispatcher.test.ts` (47 LOC, 3 round-trip tests) — engine analyze() through lazy-import path + singleton-identity + dispatcher-shape critical-violation surface.
- `mcp-server/src/tools/dispatchers/devDispatcher.ts` (21 LOC) — action enum entry `post_processor_numeric_dialect_test` + case block (lazy import + input validation + analyze call).

**31/31 tests PASS** in 2-3s. AtomicValue pass_rate carries Wilson-95 uncertainty + sqrt-curve confidence (FULL_CONFIDENCE_SAMPLE_SIZE=20). All adversarial inputs (empty / non-string / oversize / unknown-controller / comment-only) R12 fail-loud — never silent-pass.

## The classic crash this engine prevents

Fanuc 30i parses `X10` as 10 microns (= 0.01mm), not 10mm. Wrong by **1000x**. Vendor manual cites this explicitly; a post that emits `X10` instead of `X10.` will crash the machine. PostProcessorDialectValidatorEngine (lexical-macro scanner) does NOT catch this — the macro is fine, the numeric format is wrong. NumericDialectEngine catches it as `trailing_zero_drift CRITICAL` → `verdict: numeric_block` → operator stopped before press-go.

Similarly: Heidenhain rejects signed zero (`X-0.`), uniquely strict among the 7 controllers — the engine surfaces this per controller via the rule table. Fanuc allows it.

## [[reference_h8_misattribution_2026_05_20|H8 misattribution]] — count = 7 in 6 days

**Commit `5fed67945e`** (slot:quebec, `[UI-UX-IMPROVEMENT-MS0]/U-INSTALL-BATCH-FRONTEND`) absorbed all 4 of my files (47 + 281 + 477 + 21 = 826 insertions) into its 9-file frontend-install commit. Same root cause as [[reference-u-axis1-viz-closure-2026-05-26]] — `git add` of my files in the shared `H:/prism` tree triggered lint-staged cascade that swept in peer-modified files, then peer's concurrent `git commit -a` absorbed mine.

The pattern is now load-bearing: **7 documented absorptions in 6 days** (this + AXIS1-VIZ-CLOSURE + 3-golf-session + h8-echo + Axis-5-india). The shared-tree commit model is structurally hostile to attribution. Slot-worktree migration would prevent — but slot/tango branch is divergent from `cad-fusion-live-ms0` and re-syncing each iter has its own friction cost.

Code shipped + verified intact:
- `git show 5fed67945e -- mcp-server/src/engines/PostProcessorNumericDialectEngine.ts --stat` → 477 lines
- `cd mcp-server && npx vitest run src/__tests__/PostProcessorNumericDialect*.test.ts` → **31/31 PASS** from committed state

## Round-trip example

```typescript
// CRITICAL: 1000x scale error
const result = postProcessorNumericDialectEngine.analyze({
  controller: "fanuc",
  gcode: "G94\nG0 X10 Y20\nM30",  // missing decimals
});
// result.verdict          === "numeric_block"
// result.critical_count   >= 1
// result.violations[0].code === "trailing_zero_drift"
// result.violations[0].fix  === "append decimal point: 'X10.'"
```

Via dispatcher:
```
prism_dev:post_processor_numeric_dialect_test  {controller, gcode}
  → { success: true, data: NumericDialectResult }
```

## Tango's TESTING-INFRA-MS0 closeouts (cumulative across 2 sessions)

| Unit | What | Tests |
|------|------|-------|
| U-AXIS2-3-4 | 3 engines (PostProcessorMatrix + SpeedFeedAtScale + DomainWizardPipeline) | 64/64 |
| (absorbed) | CADCAMGenerationTestEngine (Axis 5) | 22/22 |
| U-AXIS1-VIZ-CLOSURE (this session iter1) | ghost.testing_infra roost in /system-viz | 17/17 generator |
| U-AXIS2-NUMERIC-DIALECT (this session iter2) | numeric-precision drift detector | 31/31 |
| **Total** | 4 testing-infra engines + 1 viz generator + 5 dispatcher actions | **134/134 PASS** |

## Open follow-ups (carried)

1. **Axes 4+5 dispatcher adapter binding** — still echo-only. Real adapter wrappers needed (DomainWizardPipelineTestEngine → MillingPrintToProgramEngine / LathePrintToProgramReasoningEngine / MultiAxisPrintToProgramEngine; CADCAMGenerationTestEngine → CADReverseTemplate + MasterPostGeneratorEngine). Each is substantial (81KB / 38KB engine surfaces); future iter.
2. **Dynamic pass-count parsing for ghost.testing_infra roost** — hard-coded 86/86 from ship time; pivot to sidecar that captures vitest output.
3. **PostProcessorNumericDialectEngine controller breadth** — 7 controllers today; could add Mitsubishi M-series, FANUC 0i variants, Tornos PNC, Brother/Roboformer.

## Memory anchors

- [[reference_u_axis1_viz_closure_2026_05_26]] — sister memo (iter1 of this loop)
- [[feedback_commit_to_slot_worktree]] — [[reference_h8_misattribution_2026_05_20|H8 misattribution]] doctrine (7th absorption today)
- [[reference_tango_testing_infra_2026_05_25]] — prior handoff that named the gap
- [[reference_p0_u06_post_processor_corpus_2026_05_25]] — india's structural-coverage corpus (orthogonal lens)
- [[feedback_psn_definition]] — Axis-2 wired into PSN-7 Engines + PSN-8 Algorithms (dispatcher action)
