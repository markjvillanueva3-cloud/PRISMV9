---
name: reference-whiskey-tribal-not-in-generation-gap-2026-06-26
description: "R15 gap (slot:whiskey): the 694 maxed lathe tribal tips reach SEARCH/inject but NOT the program-generation ADJUSTMENT path; they are free-text, not structured signals. The next high-value Kienzle unit."
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.263Z
aliases: reference_whiskey_tribal_not_in_generation_gap_2026_06_26
---


# R15 gap: maxed lathe tribal is delivered to SEARCH, not to GENERATION (2026-06-26)

Found while verifying the operator's "machining efficiency factored in WITH tribal knowledge" requirement after maxing the lathe tribal corpus (101 -> 694, [[reference_whiskey_rungc_step_loop_closed_2026_06_26]]).

## The gap (verified by grep, R12)
- The 694 maxed tips live in `state/shared/lathe-tribal-corpus.jsonl`. That file IS the canonical CONSUMED convention read by `AIResourceLearningEngine.getCadCamCorpus` + the per-slot tribal inject (SEARCH/surface path). ✓ delivered there.
- BUT the program-GENERATION adjustment path is: `LatheTribalIntegrationEngine` -> `latheTribalInjectorEngine` -> 4 downstream engines (speed_feed, program_assembler, post_processor, quote_estimator). `LatheTribalIntegrationEngine.sourceCorpusTips()` queries `tribalKnowledgeEngine.search(...)`.
- **`TribalKnowledgeEngine` loads from `state/tribal_captured_tips.json` + `DOC_KNOWLEDGE_DIR` + an auto-tips path (TribalKnowledgeEngine.ts:658,692,734) -- it does NOT read `lathe-tribal-corpus.jsonl`.** So the maxed tips never reach the generation-adjustment bridge.
- `TurningPrintToProgramEngine` (the core generator the closed-loop uses) has ZERO tribal refs -- its `runPipeline` does not consult `LatheTribalIntegrationEngine` at all.

## Why closing it is a real unit (not a quick wire)
The 694 tips are **free-text** vendor-catalog lines ("Use double clamp system B91 for secure tool holding..."), NOT structured `LatheTribalSignal` (`{material_iso, operation_type, adjustment:{rpm_factor,feed_factor,doc_factor}}`). Feeding raw text into the adjustment engine yields no factors. Closing the gap needs, in order (R13):
1. **Classify/structure** each extracted-tip -> `{operation_type?, material_iso?, adjustment factors?, failure_mode?}` (route to Ollama -- mechanical text classification, $0; R5). Most catalog tips are tool-selection/holding advice, not rpm/feed factors -- triage which are adjustment-bearing vs advisory-only.
2. **Source the structured signals** into the generation path -- either (A) make `TribalKnowledgeEngine` ALSO load `lathe-tribal-corpus.jsonl` (one load-source add; benefits ALL tribal consumers; higher blast radius -- core engine), or (B) make `LatheTribalIntegrationEngine.sourceCorpusTips()` read the jsonl directly (contained to lathe; lower blast radius). Prefer (B) first.
3. **Wire** the closed-loop generation to consult `LatheTribalIntegrationEngine.getAdjustment()` (clamped, supplementary -- never overrides physics/safety, per the engine's own design constraint) so generated programs ARE tribal-biased, and surface the applied tips per part in the closed-loop dashboard.
4. Real tests: a part whose material/op matches a structured tip gets the expected clamped adjustment; advisory-only tips surface but don't alter parameters.

## Smaller interim win (bounded, if a full structuring pass is out of budget)
Add a tribal-ADVISORY leg to the closed-loop dashboard: lexical-match the part's op keywords against `lathe-tribal-corpus.jsonl` and list the top relevant tips per scored part. Surfaces tribal alongside each program (advisory) without the free-text->structured build. Honest framing: this is "tribal surfaced," not "tribal factored into generation."

## Progress (step 1 SHIPPED, U-W-TRIBAL-CLASSIFY)
- **Classifier CORE + RUNNER shipped** (commit U-W-TRIBAL-CLASSIFY): `scripts/lib/lathe-tip-classify.mjs` (pure, 16/16 -- free-text tip -> structured `LatheTribalSignal`: op/material/clamped factors [0.25,2.5], sfm_max ft/min bounded [20,3000], confidence+rationale, advisory_only fallback) + `scripts/lathe-tribal-classify.mjs` ($0-Ollama resumable runner -> `state/shared/lathe-tribal-signals.jsonl`). 2-arm scrutiny PASS; 3 P1 contract bugs fixed pre-commit (sfm_max units/band, confidence+rationale).
- **HONEST low-yield finding (R12):** 9 tips classified end-to-end -> ALL advisory_only. The Okuma-OSP-manual + vendor-catalog tips are overwhelmingly tool/holding/coating/safety advice, NOT quantitative speed/feed/depth signals. Expect the parametric yield across all 675 to be LOW (maybe 5-15%). So the structured-adjustment payoff is modest -- the bulk of tribal value is the ADVISORY surfacing (already shipped U-W-TRIBAL-ADVISORY). Still worth completing for the parametric minority.
- **DECISIVE YIELD FINDING (R12, 20-tip sample) -> DO NOT WIRE INTO GENERATION.** 20 tips classified: **1 "parametric" (5%), and that one is a FALSE POSITIVE** -- the model hallucinated `feed_factor:1.2` from "Use FF2 for setting the feedrate" (FF2 = an Okuma control code, NOT a +20% feed signal). True real-parametric yield is ~**0%**; the corpus is advisory-dominated (tool/holding/coating/safety), and the classifier INVENTS factors from control-code/feedrate mentions. **Conclusion: wiring these signals into `LatheTribalIntegrationEngine.sourceCorpusTips` would inject HALLUCINATED adjustment factors into real program generation = net-NEGATIVE (degrades programs).** The reasoned decision (crossroad auto-decide, data-driven) is to STOP the structured-adjustment thread. The correct tribal delivery for THIS corpus is the ADVISORY surfacing (shipped U-W-TRIBAL-ADVISORY), not parametric adjustment.
- **Guard SHIPPED (U-W-TRIBAL-CLASSIFY-GUARD, 6d723b68f5):** the QUANTITATIVE-EVIDENCE guard is now applied -- `hasFactorEvidence`/`hasSfmEvidence` accept a factor ONLY when the tip TEXT states a directional CHANGE verb + number (sfm cap: surface-speed context + number). The FF2-class hallucination is suppressed (FF2 -> advisory_only; "reduce feed 20%" -> kept). Monotonically safe (only restricts). 20/20 tests. So the classifier seam is now TRUSTWORTHY if the path is ever revisited -- but the path itself stays data-retired (~0% real parametric yield; the corpus is advisory-dominated). The classifier + runner's real value was proving the path isn't worth wiring + measuring yield.

## Status of the parent /goal (this session)
G1 closed-loop test DONE+scrutinized. G3 tribal corpus MAXED-to-dry (694). This gap is the genuine NEXT in-lane unit for "tribal factored into generation"; G4 FE remains cross-lane (quebec). Videos/MIT tribal = separate `/video-learn` pipeline (needs sources).

Related: [[reference_whiskey_rungc_step_loop_closed_2026_06_26]] · [[reference_whiskey_kienzle_session_2026_06_26]]
