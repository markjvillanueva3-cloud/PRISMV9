---
name: reference-cad-draw-max-ms1-u-validation-50-2026-05-23
description: "CAD-DRAW-MAX-MS1/U-VALIDATION-50 — hypercad validation harness shipped 2026-05-23 (slot:delta) directly satisfying user /goal \"train hypercad to draw any part from print\""
aliases: reference_cad_draw_max_ms1_u_validation_50_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.494Z
---


# CAD-DRAW-MAX-MS1/U-VALIDATION-50 — validation harness shipped 2026-05-23

**Slot:** delta · **Commit:** `510440ac24` (proper attribution, no hitchhike) · **Tests:** 36/36 PASS · **E2E:** 75% accuracy ≥ 70% gate.

## Why this milestone exists

User /goal: "complete all remaining cad units for prism, priority on hypercad | train hypercad to the point where you can draw any part from print or reverse engineer a cad file from scratch."

CAD-DRAW-MAX-MS0 (formalized earlier this session, see [[reference_cad_draw_max_ms0_envelope_2026_05_23]]) shipped the **propose→execute→publish loop**: 10 engines + `cad_draw_any_part` dispatcher action. The loop EXISTS. What was missing — and what the user actually asked for — is a **measurement** of how well it performs against real engineering prints. Training = measurement, not just building.

MS1 closes that gap with a pluggable validation harness.

## What U-VALIDATION-50 ships

| Artifact | LOC | Purpose |
|---|---|---|
| `CADDrawAnyPartValidationHarnessEngine.ts` | 218 | Pure validation harness with injectable orchestrator + binary-rubric v1 scorer + report aggregator + markdown renderer |
| `CADDrawAnyPartValidationHarnessEngine.test.ts` | ~370 | 36 hermetic tests + real-data E2E (4 synthetic JM Die cases) |
| `cadDispatcher.ts` (+2 actions) | +12 | `cad_draw_any_part_validate` + `cad_draw_any_part_validate_render` |
| `mcp-server/data/milestones/CAD-DRAW-MAX-MS1.json` | 90 | New milestone envelope, `status:in_progress`, 1/3 units shipped |

## API surface

```typescript
// Pure rubric (binary v1): exported? → pass; not exported → fail; opLog < expectedOpLogMin → fail
scoreCase(testCase, result): ValidationCaseVerdict

// Aggregate per-case verdicts to ValidationReport (totalCount, passedCount, accuracy, passedGate)
aggregateReport(verdicts, gate, ranAtIso): ValidationReport

// Run harness with injectable orchestrator (default = singleton)
new CADDrawAnyPartValidationHarnessEngine().validate(cases, { gate, orchestrator, now, maxCases })

// Render report as operator-readable markdown
.renderMarkdown(report): string
```

## Dispatcher actions

```typescript
prism_cad:cad_draw_any_part_validate({ cases: ValidationTestCase[], options?: ValidationOptions })
  → { success: true, data: ValidationReport }

prism_cad:cad_draw_any_part_validate_render({ report: ValidationReport })
  → { success: true, data: { markdown: string } }
```

## Test coverage (36/36 PASS)

| Suite | Tests | Coverage |
|---|---|---|
| clampAccuracyGate | 9 | undefined / null / NaN / string / valid in-range / clamp upper / clamp lower / custom default / numeric string |
| scoreCase | 6 | pass-on-exported / fail-on-not-exported / forbidden stopReason / opLog below min / opLog at min boundary / reason text includes iter+op count |
| exceptionVerdict | 4 | Error instance / plain string / object with .message / 500-char truncation |
| aggregateReport | 5 | empty / all-pass / all-fail / mixed / gate boundary (>=, strict above + below) |
| validate | 9 | non-array throws / empty cases / runs stub / records exception / maxCases truncation / one-throw-not-poison / **real-data E2E (4 cases → 75%)** / malformed case / singleton |
| renderMarkdown | 3 | passing report / pipe escape / FAIL verdict |

## Real-data E2E (the proof)

4 synthetic JM Die cases mapped through the full harness pipeline with a stub orchestrator:

| ID | Description | Intent | Stub returns | Verdict |
|---|---|---|---|---|
| JM-001 | OD pin 0.5 dia | "make OD pin 0.5 dia" | exported, 4 iter, 3 ops | pass |
| JM-002 | thru hole 0.25 dia | "drill thru hole 0.25" | exported, 4 iter, 3 ops | pass |
| JM-003 | fillet R0.05 | "fillet edges R0.05" | exported, 4 iter, 3 ops | pass |
| JM-004 | complex 12-feature housing | "draw complex 12-feature housing" | max-ops, 15 iter | fail |

**Result:** accuracy=0.75, gate=0.70, passedGate=true. The framework proves itself.

## Anti-regression invariants (pinned in tests)

- AR#1: orchestrator throw → case fail verdict (not harness throw) → siblings continue
- AR#2: malformed test case → explicit fail verdict (not silent skip)
- AR#3: passedGate is `accuracy >= gate AND totalCount > 0` (empty corpus ≠ passing)
- AR#4: gate clamp [0.0..1.0] with default 0.70 on non-finite
- AR#5: maxCases truncation preserves input order
- AR#6: pipe characters in description/reason are escaped in markdown render

## Knobs

| Env | Default | Effect |
|---|---|---|
| `PRISM_CDM_VALIDATION_GATE` | 0.70 | Default gate (callers can override per call) |
| `PRISM_CDM_VALIDATION_MAX_CASES` | unlimited | Cap cases evaluated (debug) |

## Follow-up units (named in MS1 envelope)

| Unit | Status | What |
|---|---|---|
| U-VALIDATION-50-CORPUS | pending | Read `H:/PRISM/JM DIE/` archive + extract 50 prints via BlueprintVisionOCREngine → `ValidationTestCase[]` |
| U-VALIDATION-50-SCORING | pending | Replace v1 binary rubric with geometry-diff (volume/surface area vs reference STEP) + per-callout GD&T match |

After both follow-ups ship, a single CLI invocation will report ≥70% accuracy on a real 50-print blind set — the literal capstone goal from CAD-COMPLETE-MS0 §PHASE-21.

## What's left for the user /goal

| Goal arm | Status |
|---|---|
| "complete all remaining cad units for prism" | partial — 2 milestone envelopes formalized ([[reference_fleet_reaper|FLEET-REAPER]]-MS3 + CAD-DRAW-MAX-MS0) + 1 new milestone (CAD-DRAW-MAX-MS1) opened with 1/3 units. 211 CAD-COMPLETE-MS0 units still pending. |
| "train hypercad to draw any part from print" | framework SHIPPED (validation harness live); real 50-print corpus + richer scoring named as follow-up units in MS1 envelope |
| "reverse engineer a cad file from scratch" | CADReverseTemplateEngine + CADReverseCorpusCatalogEngine already shipped (verified 61/61 tests PASS this session); reverse-direction validation harness left as further follow-up |

## Doctrine pointers

- [[reference_cad_draw_max_ms0_envelope_2026_05_23]] — predecessor: MS0 envelope close-out (this session)
- [[reference_fleet_reaper_ms3_a_closeout_2026_05_23]] — sibling close-out pattern earlier this session
- [[feedback_high_roi_backend_first_slot_queue]] — single high-ROI close-out > N partials
- [[feedback_autonomous_loop_drift_discipline]] — ≤1 extra investigation tick rule
- CADDrawAnyPartOrchestratorEngine.ts comment header — the consumer this harness validates
