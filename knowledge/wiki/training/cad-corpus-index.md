# CAD Corpus Training Index

> Auto-generated 2026-06-24T17:50:28.107Z by `scripts/extract-cadcam-tribal-wiki.mjs` (slot:india iter24).
> Source: `state/shared/cadcam-consolidated-corpus.json` (iter23).
> Consumer: **delta** slot — ingest via `state/shared/cad-tribal-corpus.jsonl` (one entry per resource below).

## Summary

- **Total entries**: 12
- **Kinds**: blueprint-pdf, handbook-pdfs, other-pdf, prism-training
- **Source types**: course, pdf

## Entries by kind

### blueprint-pdf (2)

**Bridge engines**: engine.PdfBlueprintDimensionExtractorEngine, engine.CADGeometryEngine  
**Enriches**: engine.GDTValidationEngine, engine.ToleranceStackEngine  
**Dispatchers**: prism_cad

- `1_basic_training_day_1_2d_drawing_pdf` — 1- Basic Training Day 1/2D_Drawing.pdf
- `prism_folder_from_home_cad_models_for_testing_casing_with_single_side_bore_drawing_v2_pdf` — PRISM FOLDER FROM HOME/CAD MODELS FOR TESTING/CASING WITH SINGLE SIDE BORE Drawing v2.pdf

### handbook-pdfs (1)

**Bridge engines**: engine.PdfMachiningHandbookExtractorEngine  
**Enriches**: engine.ToolLifeEngine, engine.SurfaceFinishPredictorEngine  
**Dispatchers**: prism_calc

- `pdf-resources-prism_folder_from_home_cad_models_for_testing_casing_with_single_side_bore_drawi` — PRISM FOLDER FROM HOME/CAD MODELS FOR TESTING/CASING WITH SINGLE SIDE BORE Drawing v2.pdf

### other-pdf (8)

**Bridge engines**: engine.PdfGenericExtractorEngine  
**Enriches**: (none)  
**Dispatchers**: prism_ai

- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotes_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotes.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenoteschs_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenoteschs.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesdeu_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesdeu.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesfra_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesfra.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesita_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesita.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesjpn_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesjpn.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenoteskor_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenoteskor.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesrus_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesrus.pdf

### prism-training (1)

**Bridge engines**: engine.PrismTrainingModuleEngine  
**Enriches**: engine.ShopConfigurationEngine, engine.JMDieCustomerEngine  
**Dispatchers**: prism_cam

- `jm-die-prism_cad_testing` — JM DIE/PRISM CAD TESTING

## Ingest

```bash
# Line-delimited tribal entries — one per resource
cat H:/prism/state/shared/cad-tribal-corpus.jsonl | while read line; do
  echo "$line" | jq '{slug, kind, consume: .consume.spec_md, engines: .consume.bridge_engines}'
done
```

## Audience expectation

delta reads this index → picks priority kinds → reads each entry's spec_md → ingests source file → trains the named bridge engines. Tribal entries are **advisory** and **must_human_verify** (PRISM blocks stubs; consumer asserts data quality at ingest).