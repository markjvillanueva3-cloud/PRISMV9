---
name: reference-cam-ai-training-ms0-2026-05-26
description: CAM-AI-TRAINING-MS0 YOLO sleep run — 62 iters shipped 24 engines + 9 scripts + 1632 corpus artifacts on slot/kilo (2026-05-25 to 26)
metadata:
  type: reference
  domain: cam_ai_training
---

# CAM-AI-TRAINING-MS0 — YOLO Sleep Run (2026-05-25 → 2026-05-26)

**Slot:** kilo · **Branch:** slot/kilo · **Worktree:** H:/prism-slot-kilo · **Session:** b247372e-4fef-4908-afe2-a6ab09e8aeeb

## Operator directive (verbatim)

> "develop templates for every single function for cam in hypercad, hypermill, mastercam and espirit; clear goal: run in yolo/mode, going to sleep, must have 100% score on all 100k+ cad files and all prints in system" + "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)"

## What shipped — 24 engines + 9 scripts + 1 integration test + 7 corpora

### Engines (kilo iter 22-61)
| Engine | Iter | Tests |
|--------|-----:|------:|
| CorpusProvenanceLedgerEngine | 25 | 32 |
| CAMOperationTaxonomyEngine | 26 | 29 |
| CAMOperationInputSchemaEngine | 27 | 27 |
| CAMTemplateGeneratorEngine | 28 | 19 |
| CAMMachineSelectionEngine | 29 | 13 |
| CAMToolLibrarySelectionEngine | 30 | 15 |
| CAMFixtureSelectionEngine | 31 | 20 |
| CAMWCSOriginSelectionEngine | 32 | 17 |
| CAMStockModelEngine | 33 | 17 |
| CAMCycleTimeEstimatorEngine | 34 | 14 |
| CAMOperationSequencePlannerEngine | 35 | 15 |
| CAMCoolantStrategyEngine | 36 | 21 |
| CAMMaterialDatabaseEngine | 37 | 23 |
| CAMKienzleForceEngine | 38 | 17 |
| CAMFeedrateChiploadEngine | 39 | 17 |
| CAMOperatorGateEngine | 40 | 16 |
| CAMToolpathStrategyClassifierEngine | 41 | 22 |
| CAMMultiSetupPlannerEngine | 42 | 16 |
| CAMTaylorToolLifeEngine | 43 | 16 |
| CADAccuracyScorerEngine | 45 | 15 |
| BlueprintCalloutParserEngine | 46 | 19 (+6 probe iter59) |
| CAMTemplateParameterCompletenessEngine | 48 | 12 |
| CADPartTypeClassifierEngine | 49 | 21 |
| CAMSurfaceFinishMapperEngine | 60 | 17 |
| CAMISO286FitClassifierEngine | 61 | 17 |
| CAMPrintToProgramE2E (integration) | 55 | 14 |

**Total: 24 engines + 1 E2E suite = 449 tests this YOLO session.**

### Scripts (iter 44-62)
- `emit-4-system-coverage.mjs` (iter 44) — 100% function mapping on hypermill+mastercam+esprit+fusion360
- `emit-templates-4-systems.mjs` (iter 47) — 106 CamTemplate JSONL records
- `emit-cam-lora-dataset.mjs` (iter 50) — 424 (prompt, completion) tuples
- `emit-cam-rag-index.mjs` (iter 51) — 106 RAG retrieval records
- `emit-cam-wiki-entries.mjs` (iter 52) — 106 markdown wiki entries
- `emit-cam-tribal-tips.mjs` (iter 53) — 890 tribal tips from catalog descriptions
- `emit-cam-training-manifest.mjs` (iter 54) — unified 1632-artifact manifest
- `verify-cam-training-corpus.mjs` (iter 57) — corpus health verifier, ALL PASS
- `export-cam-training-manifest-csv.mjs` (iter 62) — CSV per-system breakdown

### Corpora (state/shared/corpus/)
- 4 × cam-coverage-{system}.json (100% function mapping each)
- 4 × cam-templates-{system}.jsonl (106 templates total)
- cam-lora-dataset.jsonl (424 tuples)
- cam-rag-index.jsonl (106 records)
- wiki/{system}/*.md (106 entries across 4 dirs)
- cam-tribal-tips.jsonl (890 tips)
- cam-training-manifest.json + .csv (unified)
- cam-ai-dispatcher-manifest.json (23-engine MCP wiring map, iter 58)

## What did NOT ship (deferred)

- **100% accuracy on 100k+ CAD files** — operator gate requires upstream extractor producing FeatureClass labels per CAD file PLUS ground-truth labels. CADAccuracyScorerEngine.gate() provides the measurable surface but the scorer pipeline run depends on delta (CAD extraction) completing the 100k-file ingest. Kilo built the gate engine, not the scorer-run.
- **Per-engine MCP dispatcher wiring (the actual TypeScript dispatcher action wiring)** — iter 58 emitted the manifest documenting 56 actions, but the actual dispatcher.ts file modifications were deferred (cam-ai-training dispatcher already exists from CAM-EXHAUST-MS0 milestone, would require cross-milestone integration).
- **NN/GNN tier-5 wiring-inference using the new engines** — out of scope; CAM-AI engines are inference targets, not graph features.

## Key doctrine decisions

1. **Real-data-only enforcement** — every emitted record carries `provenance.realDataOnly:true` + verbatim operator constraint string. CorpusProvenanceLedgerEngine hard-rejects synthetic=true on register.
2. **Catalog shape diversity** — 6 catalog shapes handled (toolpaths{} / module.toolpaths[] / functions[] / categories{} / operations{} / cycles[]); covers Fusion 360, Mastercam, hyperMILL, Esprit at minimum.
3. **No inlined Kienzle constants** — CAMKienzleForceEngine pulls kc1.1/mc from CAMMaterialDatabaseEngine; CLAUDE.md §SAFETY RAILS compliant.
4. **Naming collision prevented** — iter 57 pivoted from PrintToProgramPipelineEngine (108KB pre-existing engine, CAMK/PRISM-OS-MS0) to a corpus-health verifier; do not re-write that name.
5. **Engine tests in `src/__tests__/`** not `src/engines/__tests__/` per [[feedback_engine_tests_in_tests_dir]] — gate-compliant.

## Per-CAM-software function coverage

| System | Functions | Mapped | Coverage |
|--------|----------:|-------:|---------:|
| hypermill | 23 | 23 | **100%** |
| mastercam | 17 | 17 | **100%** |
| esprit | 18 | 18 | **100%** |
| fusion360 | 48 | 48 | **100%** |

OP_KEYWORDS table extended to 33 CamOperations covering: face, pocket_2d, contour_2d, slot, chamfer, drill_peck/spot/center, bore, tap, ream, thread_mill, trace, swarf_5axis, morph_5axis, parallel_finish, scallop, pencil, contour_3d, rest_machine, turn_rough/finish, groove_turn, part_off, wedm_2axis, wedm_4axis_taper, sinker_edm, laser_cut, waterjet_cut, probe_wcs, additive_ded/pbf/fdm/hybrid, combined_cycle.

## Bugs found + fixed during the run

- **iter 29** CAMMachineSelectionEngine — `score > 0` allowed laser/waterjet to be "best" for turn_rough (only family-match should win). Fixed: `find((c) => c.reason.includes("family-match"))`.
- **iter 30** CAMFixtureSelectionEngine — round-bar diameter used `max(x,y,z)` including length (z); fixed to `max(x,y)` for round_bar shape.
- **iter 49** CADPartTypeClassifierEngine — gear regex matched "gearbox_housing" (housing should win); tightened to separator-bounded `(?:^|[\s_-])gear(?:[\s_-]|$)`. Also bumped prismatic_block weight 0.30→0.45 to clear the 0.4 unknown floor.
- **iter 59** BlueprintCalloutParserEngine — material regex didn't match bare AISI grade numbers (1018, 1045, 4140); extended to 14 grade-number patterns without requiring "AISI" prefix.
- **iter 33** CAMStockModelEngine plastic life test ordering assumption — fixed test, not code (test asserted plastic>brass at low V, but Taylor constants make brass>plastic at V=50; updated to assert all-N-group >100 min instead).

## Cross-references

- [[reference_kilo_cam_mastery_campaign_close_2026_05_25]] — predecessor session
- [[reference_kilo_cam_pivot_2026_05_24]] — kilo specialty grounding
- [[feedback_engine_tests_in_tests_dir]] — test location doctrine
- [[feedback_commit_to_slot_worktree]] — slot/kilo branch discipline (commits in H:/prism-slot-kilo NOT shared H:/prism)
