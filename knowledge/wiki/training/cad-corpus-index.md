# CAD Corpus Training Index

> Auto-generated 2026-05-25T03:53:02.339Z by `scripts/extract-cadcam-tribal-wiki.mjs` (slot:india iter24).
> Source: `state/shared/cadcam-consolidated-corpus.json` (iter23).
> Consumer: **delta** slot — ingest via `state/shared/cad-tribal-corpus.jsonl` (one entry per resource below).

## Summary

- **Total entries**: 21
- **Kinds**: blueprint-pdf, handbook-pdfs, other-pdf, prism-training
- **Source types**: course, pdf, 

## Entries by kind

### blueprint-pdf (2)

**Bridge engines**: engine.PdfBlueprintDimensionExtractorEngine, engine.CADGeometryEngine  
**Enriches**: engine.GDTValidationEngine, engine.ToleranceStackEngine  
**Dispatchers**: dispatcher.prism_cad

- `1_basic_training_day_1_2d_drawing_pdf` — 1- Basic Training Day 1/2D_Drawing.pdf
- `prism_folder_from_home_cad_models_for_testing_casing_with_single_side_bore_drawing_v2_pdf` — PRISM FOLDER FROM HOME/CAD MODELS FOR TESTING/CASING WITH SINGLE SIDE BORE Drawing v2.pdf

### handbook-pdfs (5)

**Bridge engines**: engine.PdfMachiningHandbookExtractorEngine  
**Enriches**: engine.ToolLifeEngine, engine.SurfaceFinishPredictorEngine  
**Dispatchers**: dispatcher.prism_calc

- `pdf-resources-prism_folder_from_home_cad_models_for_testing_casing_with_single_side_bore_drawi` — PRISM FOLDER FROM HOME/CAD MODELS FOR TESTING/CASING WITH SINGLE SIDE BORE Drawing v2.pdf
- `pdf-resources-resource_pdfs_david_planchard_engineering_graphics_with_solidworks_2021_sdc_publ` — RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf
- `pdf-resources-resource_pdfs_fusion_cad_pdf` — RESOURCE PDFS/FUSION CAD.pdf
- `pdf-resources-prism_cad_cam_training_basic_single_hole_casing_bshc_1c_v0_pdf` — undefined
- `pdf-resources-prism_cad_cam_training_basic_single_hole_casing_bshc_2c_pdf` — undefined

### other-pdf (12)

**Bridge engines**: engine.PdfGenericExtractorEngine  
**Enriches**: (none)  
**Dispatchers**: dispatcher.prism_ai

- `resource_pdfs_david_planchard_engineering_graphics_with_solidworks_2021_sdc_publications_2021_pdf` — RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf
- `resource_pdfs_fusion_cad_pdf` — RESOURCE PDFS/FUSION CAD.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotes_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotes.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenoteschs_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenoteschs.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesdeu_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesdeu.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesfra_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesfra.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesita_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesita.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesjpn_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesjpn.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenoteskor_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenoteskor.pdf
- `solidworks_solidworks_corp_solidworks_composer_player_doc_swcomposerreleasenotesrus_pdf` — SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS Composer Player/Doc/swcomposerreleasenotesrus.pdf
- `prism_cad_cam_training_basic_single_hole_casing_bshc_1c_v0_pdf` — undefined
- `prism_cad_cam_training_basic_single_hole_casing_bshc_2c_pdf` — undefined

### prism-training (2)

**Bridge engines**: engine.PrismTrainingModuleEngine  
**Enriches**: engine.ShopConfigurationEngine, engine.JMDieCustomerEngine  
**Dispatchers**: dispatcher.prism_cam

- `jm-die-prism_cad_testing` — JM DIE/PRISM CAD TESTING
- `prism_cad_cam_training` — undefined

## Ingest

```bash
# Line-delimited tribal entries — one per resource
cat H:/prism/state/shared/cad-tribal-corpus.jsonl | while read line; do
  echo "$line" | jq '{slug, kind, consume: .consume.spec_md, engines: .consume.bridge_engines}'
done
```

## Audience expectation

delta reads this index → picks priority kinds → reads each entry's spec_md → ingests source file → trains the named bridge engines. Tribal entries are **advisory** and **must_human_verify** (PRISM blocks stubs; consumer asserts data quality at ingest).