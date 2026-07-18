---
name: reference_xray_corpus_tolerance_shape_fix_2026_06_24
description: Fixed the flagged-unowned ToleranceCallout.kind tsc regression (16 errors) in cad-validation-corpus.ts; xray (ANY-DOMAIN) closing a CAD/CAM-domain bug nobody owned.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.270Z
aliases: reference_xray_corpus_tolerance_shape_fix_2026_06_24
---


# cad-validation-corpus tolerance-shape fix (2026-06-24, slot xray)

**U-XRAY-CORPUS-TOLERANCE-SHAPE-FIX** (commit `91c5d7c980`). Closed the regression
[[reference_tolerancecallout_kind_tsc_regression_2026_06_23]] that india surfaced 2026-06-23 as
"NOT mine, CAD/CAM domain" -- it sat unowned until xray (an ANY-DOMAIN never-idle slot) fixed it
while hunting the FIXES rung after the blueprint-vision de-orphan units.

## The bug
`mcp-server/src/data/cad-validation-corpus.ts` typed its `callouts` as `ToleranceCallout[]`
(`CADToleranceSignalEncoderEngine.ts:51` = `{tolerance_mm?:number, gdt_symbol?:string, feature?:string}`)
but populated them with a type-INVALID shape `{kind:'tolerance'|'surface'|'material', value:string}`
-> 16 TS2353 errors. Worse: even at runtime those callouts encoded to an EMPTY 6-d tolerance signal
(the encoder reads `tolerance_mm`/`gdt_symbol`, neither present) -- so the corpus's tolerance signals
were silently dead.

## The fix
- TOLERANCE callouts -> real `{tolerance_mm}`, INCH->mm (total band x 25.4, units-first): +/-0.0005 ->
  0.0254mm, +/-0.001 -> 0.0508mm, +0.0005/-0.000 -> 0.0127mm, etc.
- SURFACE/MATERIAL annotations -> folded into the case `intent` text (the type models tolerances only;
  the orchestrator reads `intent` as NL). Verified the harness scores on `exportedSuccessfully` +
  `expectedOpLogMin`, NOT callout contents (CADDrawAnyPartValidationHarnessEngine.scoreCase).
- Test: replaced a bare `count>=8` (coupled to the broken model) with a STRONGER pair -- a per-callout
  `tolerance_mm` type-shape regression-lock (vs re-introducing {kind,value}) + a surface/material
  text-preservation check.

## Scrutiny win (R12)
Per-file 2-arm scrutiny CAUGHT a P1 I introduced: 3 surfaces (MILL-001 "32 Ra", MILL-004 "32 Ra finish",
WEDM-001 "16 Ra wire-cut") were dropped from callouts but NOT actually folded into intent -- and my
comments falsely said "stays in intent". Fixed (folded into intent) -> re-review PASS. Lesson: when you
claim "info moved to X", VERIFY X actually contains it -- don't write the claim from intent.

## Verification
tsc 19 -> 3 (the 16 corpus errors gone; the remaining 3 are SEPARATE CAM-domain bugs:
PowerMillAIOrchestrationEngine `selectStrategy` missing-method + ReinforcementLearningCAMFeedbackEngine
2x arg-count -- NOT this fix, for kilo). corpus test 22/22. Used a HEAP-BUMPED tsc
(`node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc`) to avoid the OOM-false-green trap
([[reference_tsc_oom_false_green_2026_06_09]]).

Method: found via `node scripts/audit-unwired-engines.mjs` + full tsc inventory while hunting the FIXES
rung (own-domain blueprint-vision clean units exhausted this session).
