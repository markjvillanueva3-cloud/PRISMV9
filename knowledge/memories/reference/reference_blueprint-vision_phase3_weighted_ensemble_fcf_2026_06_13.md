---
name: reference_blueprint-vision_phase3_weighted_ensemble_fcf_2026_06_13
description: "Blueprint-vision (xray) Phase-3 deeper anchor — Hermes-planned. Net-new over the shipped ensemble: (1) PER-MODEL-ERROR-PROFILE WEIGHTED consensus (weight each VLM's vote by its measured per-field accuracy — dims vs FCF vs title-block — not equal vote); (2) GD&T FCF-specific recognizer = Qwen2.5-VL-72B few-shot + structured JSON output schema (symbol+tol+Ø+modifier+datums); (3) low-confidence refinement loop (Donut-Swin + GOT-OCR2.0 re-pass on low-consensus fields). Artifact BLUEPRINT-XRAY-OCR-ENSEMBLE-v1.2. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.479Z
aliases: reference_blueprint-vision_phase3_weighted_ensemble_fcf_2026_06_13
---


**Context:** Phase-3 blueprint-vision anchor — **Hermes-planned**. Deepens [[reference_blueprint-vision_vlm_gdt_dimension_2026_06_13]]
(Phase-2). HONEST: xray already shipped the multi-VLM ensemble + closed-loop OCR; the net-new below is the
WEIGHTING + FCF structured schema. Spec §xray.

## Net-new increments (beyond the shipped ensemble)
- **Per-model-error-profile WEIGHTED consensus:** today's ensemble is ≥2-of-N equal-vote corroboration. Upgrade:
  measure each VLM's accuracy PER FIELD-TYPE (dimensions vs tolerances vs FCF vs title-block) on the gold set →
  weight each model's vote by its field-specific reliability. A model strong on dims but weak on FCF contributes
  proportionally. Beats equal-vote when models have complementary strengths.
- **GD&T FCF-specific recognizer:** dedicated path = Qwen2.5-VL-72B few-shot prompting + a STRUCTURED JSON output
  schema (geometric-characteristic symbol + tolerance value + Ø + Ⓜ/Ⓛ modifier + ordered datum letters). FCF
  parsing is the hardest/highest-value extraction (drives quality/CMM); a structured schema + few-shot beats
  free-form. Validate against ASME Y14.5-2018 FCF grammar.
- **Low-confidence refinement loop:** for fields below the consensus threshold, re-pass with Donut-Swin (OCR-free
  structured) + GOT-OCR2.0 → second-opinion before flagging for human/active-learning.

## Wiring / consumers (R15)
- GALAXY: `engines/blueprint-vision/` (xray). CONSUMERS: delta (CAD reconstruction from prints), quality
  (FCF → inspection plan), quoting (dims → cost). DOMAIN: xray; the weighted-consensus pattern is reusable for
  any multi-model ensemble (clone to the octopus consensus / india).
- AUTO-INVOCATION: the existing OCR training-loop scheduled task; this changes the fusion + FCF stage.

## Next (Phase-4, per Hermes — xray's build)
Build the per-field error-profile table from the gold set + the weighted-consensus fuser + the FCF structured-
schema recognizer; measure F1 lift vs the equal-vote baseline on the JM 7,794-print corpus.

Sources (Hermes-planned): Qwen2.5-VL / Qwen3-VL reports; Wei et al. GOT-OCR2.0; Kim et al. Donut (Swin encoder);
ASME Y14.5-2018 (FCF grammar); ensemble-weighting / mixture-of-experts literature. Planner: Hermes (xAI Grok, :8645).
