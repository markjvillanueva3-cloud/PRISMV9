---
name: reference_cad_learning_loop_closures_2026_06_24
description: India cron-loop fire (2026-06-24) shipped 2 verified CAD/print learning-AI loop closures -- U-BPA-OPCORRECTION-ALIAS (consumer recognizes operator_correction) + U-CAD-TEXT-TRIBAL-INJECT (tribal corpus into the text->CAD prompt). + 2 flagged next-units needing care.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.495Z
aliases: reference_cad_learning_loop_closures_2026_06_24
---


# CAD/print learning-AI loop closures -- india cron fire 2026-06-24

Continues [[reference_cad_text_learn_loop_2026_06_24]] + [[reference_cad_learn_tribal_inject_2026_06_24]].
DURABLE cron `adc3b7c2` (`3,13,23,33,43,53 * * * *`, every 10 min) drives the loop -- the
earlier `87e3a5b3` was SESSION-ONLY and died at /compact (R12 correction, re-armed durable).
Fire-series total = 4 units: U-BPA-OPCORRECTION-ALIAS + U-CAD-TEXT-TRIBAL-INJECT (earlier
fires, 3-of-3) + U-BPA-EVENT-WRITER-LIB (3-of-3 PASS) + U-BPA-WRITER-CONSOLIDATE-ALL(+FIX)
(2-arm per-file PASS, rode unit-LIB's session ledger clearance). All 0 P0/P1.

## U-BPA-OPCORRECTION-ALIAS (commit 8664edcce8, [CAD-LEARNING-AI], slot:india)
`scripts/lib/blueprint-accuracy-consumer-lib.mjs` `applyEvents` recognized only 4 event
types (drift_observation/replay_add/outcome_record/ewc_consolidate). A top-level
`type:"operator_correction"` row -- VERIFIED LIVE in `state/shared/blueprint-accuracy-events.jsonl`
(144 outcome_record + 1 operator_correction = 145 rows; the operator_correction was a python
writer, microsecond ts) -- routed to the `unknown` bucket and was SILENTLY DROPPED. Operator
corrections are the single highest-value training signal (human-confirmed ground truth).
Fix: additive `EVENT_TYPE_ALIASES {operator_correction -> outcome_record}` + pure
`resolveEventType()` + applyEvents resolves the alias BEFORE the known-type check +
`summary.aliasedCount` keeps the divergence fail-loud (R12). Semantically exact: the MS1 hook
itself dispatches `xproc_outcome_record` for operator corrections, and the canonical JS builder
`training-driver-lib.buildOperatorCorrectionEvent` emits `type:outcome_record` +
`payload.kind:operator_correction`. WIRE: single consumer chokepoint. TEST: +5 (40/40) incl
the live divergent-row fixture + 25-aliased-corrections-drive-ewc-consolidate + narrow-alias
(unknown still -> unknown). VALIDATE: live 145-row fresh-state dry-run -> processedCount 145,
aliasedCount 1, 146 actions (was 144 consumed + 1 dropped).

## U-CAD-TEXT-TRIBAL-INJECT (commit 6732f5387e, [CAD-LEARNING-AI], slot:india)
Goal directive "replicate the tribal-injection pattern to the text->CAD Ollama loop."
`scripts/cad-text-to-cadquery.mjs` `buildPrompt` carried engine codegen prompt + feature-template
names + hard-coded JM doctrine but NOT the CAD-draw tribal corpus -- generations were
doctrine-aware, not tribal-aware. Fix: fail-soft `loadTribalTips(request,importImpl?)` (mirrors
`loadEnginePrompt` dist-load, pathToFileURL on Windows) ranks the SAME `CAD_DRAW_TRIBAL_TIPS` via
`cadTribalDrawInjectionEngine.recommend({operation,featureType,query,limit}, corpus)` that
U-CAD-LEARN-TRIBAL-INJECT wired into `cad_learning_*`; pure `tribalTips` param on buildPrompt
renders a SHOP TRIBAL KNOWLEDGE section before REQUEST; `tribalTipCount` in request.json+summary.
TEST: +4 (13/13). VALIDATE: live dist corpus -> 5 real tips (topology-before-tolerance,
periodic-B-spline ban, INCH convention, archetype-match-before-scale, sinker spark gap) -- the
exact rules that counter the known CAD-gen failure modes.

## U-BPA-EVENT-WRITER-LIB (commit 6606d0c8bf, [CAD-LEARNING-AI], slot:india)
Closes the MCP-path gap in the predictions->outcomes->retrain loop. There was NO canonical
builder/appender for `state/shared/blueprint-accuracy-events.jsonl`: the outcome-event shape
was built INLINE in `training-driver-lib.runPipeline` Stage D, and the ledger append was
duplicated byte-identically (harvest 2 adapters + print-to-cam 2 + run-ollama-vision 1).
NEW `scripts/lib/blueprint-accuracy-event-writer.mjs` -- the WRITE-side counterpart to the
`blueprint-accuracy-consumer-lib.mjs` READER:
- `buildExtractionOutcomeEvent(extraction)` -- pure; turns a RAG `BlueprintExtraction`
  (regions[]/sources[]/confidenceFloor) into a TYPED `outcome_record` (`kind:"rag_extraction"`,
  `accurate:null` = unconfirmed prediction) the consumer routes to xproc_outcome_record (never
  the `unknown` drop-bucket). Embeds full extraction for the miner.
- `appendAccuracyEvent(event,{path})` -- canonical atomic appender, fail-LOUD on a typeless
  event (throws -> pipeline record-stage FAILED -> exit 2, the "no silent signal loss"
  contract), fail-SOFT on I/O (drop-in for the inline recordEvent adapters).
- `recordExtractionOutcome(ext)` -- build+append convenience = the exact recordOutcome IO shape.
WIRE: harvest-prints-to-training.mjs now consumes appendAccuracyEvent (R8 consolidation,
byte-identical-safe). TEST: 13/13 (happy + 3 failure + 3 adversarial + REAL-consumer round-trip
+ 25-event consolidate-threshold) + training-driver-lib 34/34 no-regression; arm B mutation-tested
(type/field drops fail). VALIDATE (live, JM-grounded per operator "utilize JM DIE"): 5 real JM
ledger rows + 1 new rag_extraction row -> real consumer -> outcome_record 6, unknown 0,
aliasedCount 1, conf 0.9; stub harvest --max 1 on the JM DIE corpus (real electrode print) wrote
a row via the canonical appender. Arm C empirically confirmed the template aggregator SKIPS the
rag_extraction row (no_class gate, eventsConsumed 0 -- NOT mis-mined/crashed). Per-file + 3-of-3 PASS.

## U-BPA-WRITER-CONSOLIDATE-ALL (+FIX) (commits 88303250ac + 23ce35bd4d, slot:india)
R15 build-once-everywhere follow-up: routed the 3 residual inline ledger appenders surfaced by
U-BPA-EVENT-WRITER-LIB's scrutiny arms through the canonical `appendAccuracyEvent`. Now ALL 5
producer call-sites share one appender: harvest x2 (unit-LIB) + print-to-cam x2 (stub+live,
collapsed to one delegation) + run-ollama-vision-extract's named `appendEvent` helper (delegates).
Byte-identical behavior + the additive fail-loud type guard (unreachable here -- all events carry
type:outcome_record). Dropped now-unused appendFileSync (both) + mkdirSync (print-to-cam; the FIX
commit -- arm B P2). VERIFIED: parse OK; run-ollama 14/14; writer-lib 13/13; training-driver-lib
34/34; live stub print-to-cam (--part-class die) + harvest wrote rows via the canonical appender.
2-arm per-file PASS (analyst + reviewer).

## FLAGGED NEXT-UNITS (do NOT one-shot; careful cross-domain)
1. **Hook `kind` vs consumer `type` mismatch (P2, latent, xray-domain).** `.claude/hooks/blueprint-accuracy-guard.mjs`
   `appendEvent` writes events keyed `kind:"..."` (and renders `e.kind` in its advisory), but
   `blueprint-accuracy-consumer-lib` reads `ev.type`. TODAY harmless (the hook has written 0 live
   rows -- the live ledger is all `type`-shaped from the python/training-driver writer). But IF the
   JS hook ever becomes a writer, every event drops as malformed. Correct fix (R7 don't-average):
   align the DIVERGENT writer (the hook) to emit `type`, updating its internal `e.kind` advisory
   use + its test. Blueprint-vision is xray's galaxy -- coordinate.
2. **blueprint_rag_extract recordOutcome wiring (NOW DE-RISKED by U-BPA-EVENT-WRITER-LIB).**
   `cadDispatcher.ts` ~3400 io{} block never passes `recordOutcome`. The canonical writer now
   exists + is proven, so this is a ONE-LINER: `recordOutcome: async (ext) => recordExtractionOutcome(ext)`
   (import from scripts/lib/blueprint-accuracy-event-writer.mjs). REMAINING care: the dispatcher is
   .ts in dist -- resolve the .mjs import path from the compiled layout (or expose via an engine-layer
   shim); .ts edit => tsc build + the stop_on_failing_tests freshness gate. The aggregator-skip
   (no_class) + consumer-route (outcome_record) are already proven safe (arm C). Coordinate xray.
3. **Consolidate the 3 residual inline appenders (R8 build-once, low-risk .mjs).** Arm A/B surfaced
   `training-driver-print-to-cam.mjs:113,150` (x2) + `run-ollama-vision-extract.mjs:211` (x1) still
   carry the byte-identical inline `appendFileSync(JSON.stringify(event)+"\n")`. Swap each to
   `appendAccuracyEvent` (same fail-loud type guard); clone the harvest pattern.

## Fleet flags (still open, not india-owned)
- **CORRECTION (R12):** my prior-session claim "vitest suite fleet-unrunnable (MODULE_NOT_FOUND)"
  was WRONG -- it was a bad-reporter-flag mis-diagnosis. `--reporter=basic` was removed in the
  installed vitest; with `--reporter=default`/`json` the config loads and tests run. Verified
  2026-06-24: `npx vitest run src/__tests__/resourceExtractionDispatcher.test.ts --reporter=default`
  -> 25/25 pass, 214ms. The `stop_on_failing_tests` freshness gate is NOT blocked by an unrunnable
  suite -- it just needs a full-suite report refresh (`npx vitest run --reporter=json --outputFile=
  data/state/VITEST_REPORT.json`) after peers edit TS test files. Ran the full refresh this fire.
- RL CAM `ReinforcementLearningCAMFeedbackEngine.step()` arity tsc -> owner lima (unverified vs current tree).
