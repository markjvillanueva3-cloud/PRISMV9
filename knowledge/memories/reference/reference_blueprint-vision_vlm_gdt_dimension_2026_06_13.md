---
name: reference_blueprint-vision_vlm_gdt_dimension_2026_06_13
description: "Blueprint-vision (xray) Phase-2 deep-research anchor — VLM/OCR families (Qwen2.5/3-VL, GOT-OCR2.0, Donut OCR-free, LayoutLMv3, Nougat) + engineering-drawing extraction (title-block, dimension nominal+tolerance, balloon/view detect, ASME Y14.5 FCF recognition, ISO 128/129 dimensioning) + multi-VLM ensemble consensus (≥2-agree corroborated, 1-of-N hallucination-candidate) + active-learning OCR calibration. Written 2026-06-13 slot:zulu Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.479Z
aliases: reference_blueprint-vision_vlm_gdt_dimension_2026_06_13
---


**Context:** Phase-2 anchor for the blueprint-vision galaxy (xray), per the 2026-06-13 knowledge-max `/goal`.
Ties to PRISM's live multi-VLM ensemble + OCR closed-loop training. Spec:
`FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §xray.

## VLM / document-AI families (the OCR engines)
- **Qwen2.5-VL / Qwen3-VL** — the resident ensemble (qwen2.5vl:32b/7b live); strong on dense text + spatial
  grounding + structured extraction. **GOT-OCR2.0** — unified end-to-end OCR (formula/table/sheet-music). **Donut**
  — OCR-FREE document understanding (image→structured JSON, no external OCR). **LayoutLMv3** — text+layout+image
  pretraining (forms/receipts/docs). **Nougat** — academic-PDF→markdown. moondream/llama3.2-vision = light
  ensemble members. Diverse families = the consensus diversity that catches hallucination.
- **Why a VLM not classic OCR:** engineering drawings are spatial + symbolic (a Ø, a ±, a FCF box, a leader line)
  — a VLM reads the *meaning*, not just glyphs. But VLMs hallucinate numbers → consensus + validation required.

## Engineering-drawing extraction (the domain task)
- **Title block:** part no, rev, material, finish, units (inch/mm — the 25.4× check!), scale, tolerance defaults
  (the general-tolerance note governs un-toleranced dims). **Revision block.**
- **Dimensions:** nominal value + tolerance form — bilateral ±, unilateral, limit (max/min), basic (boxed, for
  GD&T), reference (parenthesized). Extract value + tol + the feature it dimensions.
- **GD&T Feature Control Frame recognition (ASME Y14.5-2018 / ISO 1101):** parse the FCF boxes — geometric symbol
  + tolerance (+ Ø + Ⓜ/Ⓛ) + datum letters; associate to the toleranced feature + datums. Hardest + highest-value
  (drives quality/CMM downstream).
- **Standards:** ASME Y14.5 (GD&T), **ISO 128** (drawing presentation) + **ISO 129** (dimensioning) — the rules
  for how dims/views are laid out → priors for extraction + validation.
- **View + balloon recognition:** orthographic/section/detail/auxiliary views; balloon/bubble numbers → BOM link.
- **Multi-page:** 96% of JM drawing PDFs are multi-page (PRISM xray lesson) — extract per-page, dedup by
  feature+page.

## Ensemble consensus + closed-loop (the trust layer)
- **≥2-of-N agree = corroborated; 1-of-N = hallucination-candidate** (PRISM shipped this — diverse VLM families
  vote on each extracted dim). Fuse + flag low-consensus for human/active-learning.
- **Closed-loop OCR training:** gold labels (verified prints) → measure F1 vs truth → calibrate confidence →
  active-learning loop. PRISM's blueprint-ocr-training-loop (resumable, multi-page, per-page rows).
- **Parse robustness (PRISM-specific lessons):** VLMs emit engineering shorthand that breaks JSON — leading-dot
  decimals (`.171`), leading-`+` tolerances, truncated responses → repair before parse (don't discard a whole
  print over one number). [[reference_xray_ocr_parse_truncation_fix_2026_06_06]].

## Integration (xray)
- Feeds delta (CAD feature reconstruction from prints) + quality (tolerance→inspection plan) + quoting (dims→
  cost). Next deep-research (roadmap §xray): GD&T FCF detection models (symbol-detection + FCF-structure parsing),
  ISO 129 dimensioning rules into the VLM prompt + validation layer, GOT-OCR2.0 / Donut benchmark vs the Qwen
  ensemble on the JM 7,794-print corpus.

Sources (canonical): Qwen2.5-VL / Qwen3-VL technical reports (Alibaba); Wei et al. GOT-OCR2.0; Kim et al. Donut
(ECCV 2022); Huang et al. LayoutLMv3; Blecher et al. Nougat; ASME Y14.5-2018; ISO 128 / ISO 129. Expertise-authored
anchor cross-referenced to PRISM xray's live ensemble + OCR closed-loop.
