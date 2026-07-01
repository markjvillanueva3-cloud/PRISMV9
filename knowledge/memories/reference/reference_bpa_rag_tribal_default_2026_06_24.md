---
name: reference_bpa_rag_tribal_default_2026_06_24
description: U-BPA-RAG-TRIBAL-DEFAULT (slot:india 2026-06-24) -- replicated the tribal-injection pattern onto the blueprint_rag_extract MCP surface, using the EXTRACTION-domain corpus (blueprint-vision-tribal-corpus.jsonl), deliberately NOT the CAD-draw GENERATION corpus. + the topK corpus-size cliff fix.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.482Z
aliases: reference_bpa_rag_tribal_default_2026_06_24
---


# blueprint_rag_extract default tribal injection -- india 2026-06-24

## What shipped (466f47d769 + topK follow-up 6cfc375799, [CAD-LEARNING-AI], slot:india)
Goal directive: "replicate the tribal-injection pattern across the text->CAD +
blueprint LoRA/RAG surfaces." Text->CAD already had it (U-CAD-TEXT-TRIBAL-INJECT);
this closes the blueprint RAG surface.

`blueprint_rag_extract`'s `retrieveTribal` (cadDispatcher) fed tribal sources ONLY
from `params.precomputedSources.tribal` -- NO default. An MCP caller that omitted
tribal got ZERO shop priors, though a domain-correct corpus exists.

NEW `scripts/lib/blueprint-tribal-source-loader.mjs`: loads
`state/shared/blueprint-vision-tribal-corpus.jsonl` (7 tips) + adapts each to the
engine's `RetrievedSource` shape `{kind:"tribal", id, title, score}` (uniform
0.6 prior -- these are universal extraction DOCTRINE, not similarity hits);
fail-soft `[]` on missing/malformed/empty; `PRISM_BPV_TRIBAL_CORPUS` env override.
WIRE: dispatcher default = this loader (CWD-independent repo-root dynamic import,
same idiom as recordOutcome) ONLY when `ps.tribal` absent -- explicit caller
tribal still wins (override preserved + tested).

## KEY DESIGN LESSON: EXTRACTION corpus, NOT GENERATION corpus
The scout's critical catch: `blueprint_rag_extract` is dimension EXTRACTION (reading
a blueprint), so the domain-correct tribal corpus is blueprint-OCR/EXTRACTION tips
(verify-engine-names, split-multi-print-before-OCR, per-field 0.70 floor -- xray's
`blueprint-vision-tribal-corpus.jsonl`), NOT delta's CAD-draw GENERATION corpus
(`CAD_DRAW_TRIBAL_TIPS` = periodic-bspline/spark-gap). Feeding the generation corpus
into an extraction prompt is a domain mismatch. ALWAYS match the tribal corpus to the
TASK's domain (read vs generate), not just "it's CAD-ish".

## Behavior change + regression caught (R12)
Default injection means "no precomputedSources" is no longer sourceless -> a
sourceless caller's confidenceFloor flips low_no_prior -> normal. This BROKE my own
prior recordoutcome test's floor-independence case; fixed by neutralizing the default
there (`PRISM_BPV_TRIBAL_CORPUS` -> nonexistent path) so its sourceless intent holds.
3-of-3 arm C empirically verified `detectContradictions` stays [] on the live 7 tips
(no spurious low_contradiction) + the regression is bounded to that one test.

## topK cliff (scrutiny P2, fixed 6cfc375799)
The default first ignored the engine's `opts.topK` (capped at a hard-coded 7) -> a
corpus grown past 7 would silently inject only the first 7 by insertion order. Fix:
dispatcher forwards `opts.topK`; loader no-topK fallback returns ALL (null=no cap).
Engine DEFAULT_TOP_K=5 governs the MCP path; a no-topK direct caller gets the whole
curated corpus.

## TEST
loader 7/7 (adapt + id-precedence + skip-malformed + empty/null + topK cap + cliff +
fail-soft + LIVE-corpus smoke) + round-trip cadDispatcher.blueprint-rag-tribal-default
3/3 THROUGH prism_cad (default injects + caller-override + valid shape). 3-of-3 PASS
zero P0/P1. Cross-domain: corpus is xray's; loader+wiring india's.
[[reference_recordoutcome_mjs_ts_seam_2026_06_24]] [[reference_bpa_guard_eventshape_2026_06_24]]
