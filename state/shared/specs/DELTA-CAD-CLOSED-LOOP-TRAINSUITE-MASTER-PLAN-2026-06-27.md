<!--
  DELTA CAD CLOSED-LOOP TRAINING & TEST-SUITE MASTER PLAN -- 2026-06-27, slot:delta (CAD galaxy).
  Producer/training layer feeding the consumer CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md.
  Synthesized by ultracode Workflow wf_c4d6323f-54c (7 agents: 6 sonnet reconcile readers + 1 opus synthesis,
  1.26M subagent tokens) over the REAL corpus census + on-disk asset verification. Grounds: DELTA-CAD-CORPUS-CENSUS-2026-06-27.md.
  Status: DESIGN -- build-ready, dependency-ordered. Maintainer: slot delta.
-->

# DELTA CAD CLOSED-LOOP TRAINING & TEST-SUITE MASTER PLAN

> slot:delta -- PRISM CAD galaxy. PRODUCER/TRAINING layer that FEEDS the already-designed consumer `CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md` (print -> CAD -> validate, stages S0..S6). This plan does NOT redesign that consumer. It mines the H-drive corpus into reusable learned assets (algorithms / formulas / templates / design-pipelines / pattern-recognition / databases) so CAD generation gets faster as data grows.
>
> Numbers below are the REAL census handed by the corpus reader and verified against `mcp-server/data/state/cad-corpus-manifest.json` (total_entries = 11695, confirmed on disk 2026-06-27). The full H-drive raw-file census (677,175) is the un-catalogued superset; the 11,695-entry manifest is the curated subset already classified. Both are cited where they apply.

---

## 1. Corpus inventory

Raw H-drive census (ALL files, node_modules/.git/dist excluded). Counts are exact per the operator brief; "can train" lists the learned asset each modality feeds.

| Modality | Ext(s) | REAL count | What it can train |
|----------|--------|-----------:|-------------------|
| CNC programs | .min .nc .mpf .sub .cnc .eia .ngc | 302,662 | CNC-program -> feature back-inference (reverse path); op-sequence / design-pipeline templates; tool+feed priors. (.min 172,464 + .nc 128,757 + .mpf 1,006 + .sub 220 + .cnc 210 + .eia 4 + .ngc 1) |
| PDF (mixed business + drawing) | .pdf | 344,600 | Held-out OCR dim-extraction corpus -- AFTER a print-vs-business classifier splits drawings out (the classifier is itself a planned unit, U-DELTA-PDF-CLASS) |
| Inventor part | .ipt | 10,720 | Native MCAD feature graphs; archetype frequency; assembly-member geometry |
| Inventor assembly | .iam | 1,252 | Assembly mate/constraint graphs; assembly-pipeline sequences |
| SolidWorks part | .sldprt | 506 | Native MCAD feature priors; class-prototype catalogs |
| SolidWorks assembly | .sldasm | 94 | Assembly graph reconstruction signal |
| CATIA part | .catpart | 3 | Native MCAD feature signal (low-N; pooled with ipt/sldprt) |
| Native MCAD subtotal | ipt+iam+sldprt+sldasm+catpart | 12,575 | (rollup of the five rows above) |
| Fusion design | .f3d | 1,740 | Fusion timeline -> design-pipeline sequences; live round-trip ground truth (`:18360` / `:18365`) |
| Mastercam | .mcx .mcam | 2,764 | CAM-feature -> CAD-feature correlation; tool/strategy priors (.mcx 2,749 + .mcam 15) |
| Neutral CAD (B-Rep) | .step .stp .igs .iges .x_t .x_b | 3,328 | Geometry ground truth (Hausdorff/Chamfer gate); dim+tol distributions; surface-topology signals; RAG-retrieval embeddings (.step 2,895 + .stp 271 + .x_b 108 + .x_t 25 + .igs 27 + .iges 2) |
| 2D vector | .dxf .dwg | 9,506 | 2D->3D drafting templates; orthographic-view learning; title-block/dim extraction (.dxf 9,258 + .dwg 248) |
| **GRAND TOTAL relevant (raw H-drive)** | | **677,175** | full superset |
| **Curated manifest (already catalogued)** | cad-corpus-manifest.json | **11,695** | the subset already classified into 11 part-classes; load this, do NOT re-crawl |

Curated manifest class breakdown (from `cad-corpus-manifest.json` `by_class`, verified 2026-06-27, 11 classes summing to exactly 11,695): die 3239, general 8212, shaft 71, casing 19, bracket 5, bushing 7, plate 51, extrude_punch 88, valve_body 1, blisk 1, impeller 1. (NOTE: an earlier draft listed `iam 669` here -- that is a `by_format` (file-extension) bucket, NOT a part-class; `valve_body 1` is the real 11th class. Never conflate `by_format` counts with `by_class` counts.)

---

## 2. Already BUILT (reconciled)

Treat all of these as DONE. Build only the GAPs in section 5. Evidence is sha or on-disk path from the reader findings (verified where marked [v]).

| Capability | Asset / Unit | Evidence | Do NOT rebuild |
|-----------|--------------|----------|----------------|
| Corpus catalog (11,695 entries, 11 classes) | `cad-corpus-manifest.json` | path [v] 5.16 MB, total_entries=11695 | Load + extend classes; never re-crawl |
| Closed-loop geometry compare | `CADGeometryComparisonEngine` Hausdorff/Chamfer/volume/Jaccard | sha `dfe6ac41e5`; engine on disk [v] | The 4 metrics + the compare() schema |
| 2nd reference regression | Impeller turbine.stp | sha `400e165bd8` | Baseline numbers 0.000% / 1.551% / 5.087% |
| Surface-fidelity E2E proof | blisk.stp closed loop | sha `cb1ec539a3` | The baseline accuracy band |
| Fix-ledger -> training converter | `scripts/lib/cad-fix-ledger-to-training.mjs` (80 corrections -> 27 Alpaca pairs) | sha `e49851323d`; on disk [v]; graph L8/built | The converter; extend, do not fork |
| Outcome -> Alpaca converter | `scripts/lib/outcome-to-alpaca-converter.mjs` | on disk [v] | The CAD-path extension pattern |
| Learn-loop close (outcome bus -> india) | `U-CAD-LEARN-LOOP-CLOSE` | sha `19e9c0af6b` | The cad.jsonl outcome-bus schema |
| Dimensional signal: radii | corpus radii miner | sha `a872dbcfa8` | The radii signal |
| Dimensional signal: bbox envelope | envelope miner + 2 data-quality fixes | sha `e485a0ac18` | The bbox signal |
| Surface-topology signal | surface-composition quantitative | sha `22be177ec3` | The presence-beyond signal |
| Feature priors (11 class prototypes) | class-prototype ground-truth catalogs | sha `39401140c2` | The 11 prototypes; extend to sub-classes |
| GNN ref-pool feeder | ghost-wire outcomes -> GNN ref-pool (545/7160) | sha `626b907287` | The feeder; grow the pool |
| Closed-loop coverage audit | fleet-wide pair audit | sha `65c85a9fbb` | The audit; the 7160-row no-converter gap is a LEAD |
| Corpus capture writer | capture writer | sha `45ef63b388` | The writer |
| 646-pair LoRA corpus + QLoRA dry-run | `lora-pairs.jsonl` (64 KB), QLoRA dry-run | shas `85a9f56bee`, `8279b3d14d` | The 646 OCR/tokenization pairs |
| Knowledge-templater | template assembler | sha `7a0984dee5` | The templater pipeline |
| Drawing pipeline (7 units, consumer) | ledger->sketch-gate->tribal->stock->route->regen->bore | shas in ROADMAP:62-69 | All 7; this plan FEEDS them |
| CAD generation engines (8 SHIPPED) | Subtractive/Boolean/Pattern/RefGeom/DieDesign/SheetMetal/2DDrawing/Weldment | `*.ts` on disk [v select] | The 8 capability engines |
| Validation-50 driver lib + tests | `U-VALIDATION-50-LIVE-RUN` | shas `e724240d7c` + `43854286d0` (19 tests) | The driver; not yet run at scale |
| Ollama CAD offload | `cad_drawing` task-class Ollama-first routing | impl in `AISystemRouterEngine`; `6745df68cb` is the status-reconcile (the 35.8% fleet-offload figure is from `ollama-offload-stats.json`, NOT attributable to that sha) | The offload routing |
| CAD recon cron | `PA2-CAD-RECON-CRON` | scripts artifact present | The cron |
| Hermes CAD builder | `PA3-HERMES-CAD-BUILDER` | sha `01866ce7d3` | The builder |
| Viz CAD graph update | `PA4-VIZ-CAD-GRAPH-UPDATE` | sha `ed56229b49` | The graph-update path |
| Tokenization engines (8) | CADArgEncoder/OperationDecoder/SequencePool/UnifiedFeatureBridge/ToleranceSignal/RegenFeedbackAdapter/HyperCADSCodeGen/HyperCADSOutcomePublisher | ROADMAP:78 | The 8 tokenizers |

**Do-not-duplicate (architecture-level, from readers):** the 4-step closure architecture (emit -> convert -> fix-ledger -> GPU-re-embed); the cad.jsonl outcome-bus schema (mirror of speed_feed/sinker_edm); the outcome-to-alpaca CAD extension pattern; the Hausdorff/Chamfer baseline numbers; the Hermes/octopus 5-lens consensus + graph-improvement cron.

---

## 3. The closed-loop training loop

ASCII flow. `[B]`=BUILT (reuse), `[N]`=NET-NEW (this plan), `[X]`=BUILT-but-extend.

```
                          H-DRIVE CORPUS  (677,175 raw / 11,695 catalogued)
   CNC 302,662 | PDF 344,600 | MCAD 12,575 | f3d 1,740 | mcx/mcam 2,764 | B-Rep 3,328 | 2D 9,506
                                        |
                                        v
   +-------------------------------------------------------------------------+
   |  MINE  (Ollama offload -- qwen2.5-coder:32b heavy / 1.5b trivial)        |
   |  [B] cad-corpus-manifest.json loader (extend classes, no re-crawl)       |
   |  [X] radii + bbox miners  ->  extend: fillet R, draft angle, thread pitch|
   |  [X] surface-topology     ->  extend: face-count ratios, B-spline degree |
   |  [N] CNC-program -> feature back-inference miner                         |
   |  [N] PDF print-vs-business classifier (split 344,600 -> drawings only)   |
   |  [N] MCAD native feature-graph extractor (ipt/iam/sldprt/sldasm)         |
   +-------------------------------------------------------------------------+
                                        |
                                        v
   +-------------------------------------------------------------------------+
   |  LEARNED ASSETS                                                          |
   |  [X] feature priors (11 class prototypes -> sub-class features)          |
   |  [B] archetype/template library (CADPartArchetypeRegistry +             |
   |       CADClassFeatureLibrary + DrawingTemplateIndex)                     |
   |  [N] dim + tol DISTRIBUTIONS db (per-class histograms, excel-mined)      |
   |  [X] assembly graphs (CADAssemblyGraphEngine -> populate from 1,252 iam) |
   |  [N] design-pipeline SEQUENCES db (f3d timeline + CNC op-order)          |
   |  [X] pattern EMBEDDINGS (CADFeatureEmbeddingEngine -> Qdrant collection) |
   +-------------------------------------------------------------------------+
                                        |
                                        v
   +-------------------------------------------------------------------------+
   |  CAD GENERATION (faster as DB grows)                                     |
   |  [B] 8 capability engines + CadQuery/Fusion/Inventor/FreeCAD codegen     |
   |  [B] RAG-grounded gen (Qdrant retrieval of nearest template+embedding)   |
   |  [N] retrieval-accelerated param prefill (CADParameterPredictor seeded   |
   |       from the dim/tol distribution db -- the "faster" lever)            |
   +-------------------------------------------------------------------------+
                                        |
                                        v
   +-------------------------------------------------------------------------+
   |  VALIDATE  (the EXISTING comprehensive consumer pipeline S0..S6)         |
   |  [B] CAD-DRAWING-PIPELINE-COMPREHENSIVE keystone Feature-Completeness-   |
   |       Ledger; CADGeometryComparison gate; Validation-50 harness          |
   +-------------------------------------------------------------------------+
                                        |
                                        v
   +-------------------------------------------------------------------------+
   |  OUTCOME  (deviation_before, correction_applied, deviation_after)        |
   |  [B] state/outcomes/cad.jsonl bus -> fix-ledger -> outcome-to-alpaca     |
   |  [B] xproc_outcome_publish -> india cross-process graph                  |
   +-------------------------------------------------------------------------+
                                        |
                  +---------------------+---------------------+
                  v                                           v
   [B] LoRA pairs grow (646 -> N)                 [B] GNN ref-pool grows
   [N] india: real QLoRA train run                (macro-F1 0.44 -> 0.55 gate)
                  |                                           |
                  +---------------------+---------------------+
                                        v
                    COMPOUND BACK INTO THE DB  (closed loop)
              learned assets + outcomes + corpus all become
              [N] /system-viz graph nodes  (the "improve alpha graphs" ask)
```

The loop is BUILT end-to-end at the plumbing level (compare, outcome bus, converter, ref-pool feeder). The NET-NEW work is (a) widening the MINE stage to the un-mined modalities (CNC, mixed-PDF, native MCAD), (b) materializing the dim/tol-distribution and design-sequence databases, (c) the retrieval-accelerated param prefill that makes generation actually faster, and (d) the real QLoRA train run + graph compounding.

---

## 4. Full TEST SUITE

Every test has a held-out split and a DETERMINISTIC numeric gate (exit code / metric threshold / count). No vibe checks (R12). Harness owner = delta unless marked india. Splits are stratified by part_class and frozen in a manifest so they never leak into training.

| Test | Held-out split | Deterministic gate (loss / threshold / count) | Asset |
|------|----------------|------------------------------------------------|-------|
| T-GEOM STEP-regen fidelity | 50 B-Rep files (frozen `holdout-geom-50.json`), 0 in any train set | bbox-dim deviation == 0.000%; surface mean <= 2.0%; surface worst <= 6.0%; Hausdorff <= band per class. FAIL exit 1 if any breached | `CADGeometryComparisonEngine` + `CADDrawAnyPartValidationHarnessEngine` |
| T-DIMPASS held-out print | 50 drawing PDFs stratified, OCR'd, 0 in OCR train | dim-pass-rate >= 90% (matched dims within tol). Count gate: >= 45/50 pass | Validation-50 driver (`e724240d7c`) + scoring (U-VALIDATION-50-SCORING, GAP) |
| T-TEMPLATE retrieval precision@k | 200 query parts vs catalogued archetype library | precision@1 >= 0.70; precision@5 >= 0.90 (retrieved template's part_class == query class). FAIL if below | `CADCorpusPatternEngine` + Qdrant collection |
| T-EMBED nearest-neighbor recall | 500 B-Rep embeddings, leave-one-out | recall@10 >= 0.80 (a same-class neighbor in top-10). Numeric exit gate | `CADFeatureEmbeddingEngine` -> Qdrant |
| T-ASSEMBLY graph reconstruction | 94 sldasm + 200 iam held-out | mate-graph edge accuracy >= 0.85 (predicted mates vs ground-truth constraint graph); node (part) recall == 1.0 | `CADAssemblyGraphEngine` + `CADMateEngine` |
| T-CNC-BACKINFER program->feature | 1,000 NC/min files with known part (paired via CAM filename) | feature back-inference accuracy >= 0.75 (inferred feature set Jaccard vs CAD ground truth). FAIL exit 1 below | NET-NEW CNC back-inference miner |
| T-PDFCLASS print-vs-business | 2,000 PDFs hand-or-heuristic labelled (drawing vs business) | classifier F1 >= 0.95; false-drawing-as-business <= 2% (the dangerous direction -- never drop a real drawing) | NET-NEW `U-DELTA-PDF-CLASS` |
| T-DIMTOL distribution sanity | per-class dim/tol histograms vs held-out parts | KS-test p > 0.05 that held-out part dims are drawn from the learned distribution (no distribution drift). Numeric | NET-NEW dim/tol distribution db |
| T-SEQ design-pipeline replay | 100 f3d timelines + CNC op-orders held-out | sequence-prediction top-3 next-op accuracy >= 0.60 (the gen-acceleration signal). Count gate | NET-NEW design-sequence db + `CADSequenceLearningEngine` |
| T-LORA adapter promote (india) | `operator_verified` eval split (MUST exist -- gated, sec 7) | Brier <= 0.15 on operator_verified split; macro-F1 >= 0.55. No promote below. Hard exit gate | `BlueprintLoRABridgeEngine`; india QLoRA |
| T-GNN refpool promote (india) | held-out ghost-wire outcomes (>= 2 high-conf reference ghosts) | AUROC >= 0.78; macro-F1 >= 0.55; Brier <= 0.15 (full-coverage) OR selective-deploy at minConf 0.7 (Brier <= 0.05 on emitted set). multi-seed before claim | GNN tier-5 lifecycle |
| T-SPEED gen-latency regression | fixed 20-part generation set | p50 gen-latency must DROP vs prior baseline as DB grows (>= 10% faster than the no-retrieval baseline); else exit 1 (proves "faster" is real, not assumed) | retrieval-accelerated param prefill |
| T-ASCII spec-guard | this spec + all generated specs | ascii-guard: 0 non-ASCII bytes, 0 em-dash, 0 smart-quote. exit 1 on any | repo ascii-guard hook |

Stratified-holdout rule: every train converter (`cad-fix-ledger-to-training.mjs`, `outcome-to-alpaca-converter.mjs`, the new miners) MUST exclude every abs_path present in any `holdout-*.json`. A single shared `scripts/lib/cad-holdout-guard.mjs` asserts this and THROWS on leak (R9). The harness `CADDrawAnyPartValidationHarnessEngine` already exists but has not been run at scale -- T-GEOM and T-DIMPASS are its first scaled runs.

---

## 5. Remaining units

Dependency-ordered. VERIFIABLE CORE (splits + miners + eval harness) BEFORE training BEFORE generation-acceleration. OWNER: delta = geometry / corpus / eval-harness; india = model train / retrain. Coordinate -- do not duplicate. Each row gives galaxy placement (`engines/cad/` unless noted), wiring target (dispatcher action), auto-invoke trigger, and DOMAIN-vs-FLEET (R15).

| U-ID | Title | OWNER | Depends-on | Deterministic done-gate | Placement / wiring / trigger / scope |
|------|-------|-------|-----------|-------------------------|--------------------------------------|
| U-DELTA-HOLDOUT-SPLITS | Freeze stratified held-out manifests (geom-50, dimpass-50, embed-500, assembly, cnc-1k) + `cad-holdout-guard.mjs` | delta | manifest (BUILT) | All 5 holdout-*.json exist; guard THROWS on a planted leak (test) | `scripts/lib/`; wire `prism_cad:holdout_check`; trigger on any train-converter run; DOMAIN |
| U-DELTA-PDF-CLASS | Print-vs-business PDF classifier over 344,600 PDFs | delta | HOLDOUT-SPLITS | F1 >= 0.95; drawing-recall >= 0.98 on 2k labelled (T-PDFCLASS) | `engines/cad/CADPrintClassifierEngine.ts`; wire `prism_cad:pdf_classify`; trigger on .pdf ingest; DOMAIN (mirror pattern to blueprint-vision FLEET-shareable) |
| U-DELTA-CNC-BACKINFER | CNC-program -> feature back-inference miner (302,662 programs) | delta | HOLDOUT-SPLITS | back-infer accuracy >= 0.75 (T-CNC-BACKINFER) | `engines/cad/CADCncFeatureBackInferEngine.ts`; wire `prism_cad:cnc_back_infer`; trigger on .nc/.min ingest; DOMAIN (reverse path -- the absent-from-all-docs gap) |
| U-DELTA-MCAD-FEATURES | Native MCAD feature-graph extractor (ipt/iam/sldprt/sldasm/catpart, 12,575) | delta | HOLDOUT-SPLITS | feature-graph parse on >= 95% of files; non-empty graph per file | `engines/cad/` extend `CADFeatureRecognitionEngine`; wire `prism_cad:mcad_extract`; trigger on native-MCAD ingest; DOMAIN |
| U-DELTA-DIMTOL-DB | Per-class dim + tol DISTRIBUTION database (excel-macro tabular mine + STEP/print) | delta | MCAD-FEATURES, manifest | KS p>0.05 on held-out (T-DIMTOL); db has all 11 classes | `engines/cad/CADDimTolDistributionEngine.ts`; wire `prism_cad:dimtol_query`; trigger pre-generation param prefill; DOMAIN |
| U-DELTA-SEQ-DB | Design-pipeline SEQUENCE db from f3d timelines + CNC op-orders | delta | CNC-BACKINFER | top-3 next-op acc >= 0.60 (T-SEQ) | `engines/cad/` extend `CADSequenceLearningEngine`; wire `prism_cad:sequence_predict`; trigger pre-codegen; DOMAIN |
| U-DELTA-ASSEMBLY-POPULATE | Populate `CADAssemblyGraphEngine` + `CADMateEngine` from 1,252 iam / 94 sldasm | delta | MCAD-FEATURES | edge accuracy >= 0.85; node recall == 1.0 (T-ASSEMBLY) | `engines/cad/` (engines exist, depth unverified); wire `prism_cad:assembly_graph`; trigger on assembly gen; DOMAIN |
| U-DELTA-EMBED-COLLECTION | Dedicated CAD Qdrant collection (feature embeddings, GPU 1024d) | delta | MCAD-FEATURES, manifest | recall@10 >= 0.80 (T-EMBED); collection populated for all B-Rep | `engines/cad/` via `CADFeatureEmbeddingEngine` -> `QdrantVectorStoreEngine`; wire `prism_cad:cad_rag`; trigger on retrieval; FLEET (Qdrant is shared infra) |
| U-DELTA-TEMPLATE-RETRIEVAL | Archetype/template retrieval over corpus pattern engine | delta | EMBED-COLLECTION | precision@1 >= 0.70, @5 >= 0.90 (T-TEMPLATE) | `engines/cad/CADCorpusPatternEngine.ts`; wire `prism_cad:template_retrieve`; trigger pre-gen; DOMAIN |
| U-DELTA-VAL50-SCORING | Dim-pass scoring for Validation-50 (closes the GAP) | delta | HOLDOUT-SPLITS | scoring emits dim-pass-rate; T-DIMPASS runnable end-to-end | `engines/cad/`; extend Validation-50 driver; wire `prism_cad:validation_50_score`; trigger on harness run; DOMAIN |
| U-DELTA-VAL50-EXPAND | Expand validation corpus 12 -> 50 stratified | delta | VAL50-SCORING | 50-case holdout manifest exists, class-stratified | data work under `engines/cad/`; consumed by `prism_cad:validation_50_score`; DOMAIN |
| U-DELTA-GEOM-50-RUN | Run T-GEOM at scale on the frozen 50 | delta | HOLDOUT-SPLITS, geometry compare (BUILT) | T-GEOM gate green; result artifact written | harness run; emits to `state/outcomes/cad.jsonl`; trigger nightly cron; DOMAIN |
| U-DELTA-CORPUS-THROUGHPUT | Multi-VLM OCR on drawing-PDF subset + GPU re-embed STEP 33->100% | delta (+xray OCR) | PDF-CLASS, EMBED-COLLECTION | STEP catalog coverage == 100%; OCR yield logged per print | `engines/blueprint-vision/` for OCR, `engines/cad/` for embed; GPU-gated; FLEET (OCR shared) |
| U-DELTA-PARAM-PREFILL | Retrieval-accelerated param prefill (the "faster" lever) | delta | DIMTOL-DB, TEMPLATE-RETRIEVAL, SEQ-DB | T-SPEED: gen p50 >= 10% faster than no-retrieval baseline | `engines/cad/CADParameterPredictorEngine.ts` (exists, seed it); wire `prism_cad:param_prefill`; trigger pre-codegen; DOMAIN |
| U-DELTA-VIZ-COMPOUND | Corpus + learned assets + outcomes -> /system-viz graph nodes | delta | all asset units above | graph node count increases by corpus+asset count; nodes queryable via `node-card` | `scripts/` regen-viz splice; wire to `master_index_query`; trigger nightly; FLEET (the operator graph ask) |
| U-CAD-REAL-TRAIN-RUN | Real QLoRA train run on >= 646 pairs (Blackwell) | india | operator_verified split (GATED, sec 7), corpus units | T-LORA: safetensors adapter exists; Brier <= 0.15 on operator_verified | india `engines/ai-training/`; consumes delta corpus; do NOT duplicate -- india owns model train; DOMAIN(india) |
| U-CAD-GNN-REFPOOL-GROW | Grow GNN ref-pool from compounding outcomes | india | VIZ-COMPOUND, outcome bus (BUILT) | T-GNN: macro-F1 >= 0.55 OR selective-deploy minConf 0.7; multi-seed | india GNN lifecycle; consumes `state/outcomes/cad.jsonl`; DOMAIN(india) |
| U-DELTA-GHOSTWIRE-CONVERTER | Converter for the 7,160 ghost-wiring rows with no converter (lead from `65c85a9fbb`) | delta | outcome bus (BUILT) | >= 90% of 7,160 rows produce a valid training pair; count gate | `scripts/lib/`; extend assembler registry; wire to outcome -> training; FLEET (closes fleet-wide coverage gap) |

Sequencing note: U-DELTA-HOLDOUT-SPLITS is the keystone -- nothing trains until splits are frozen and the leak-guard is live, because every accuracy claim downstream is meaningless if train/test leak. Then miners (PDF-CLASS, CNC-BACKINFER, MCAD-FEATURES) -> learned-asset DBs (DIMTOL, SEQ, ASSEMBLY, EMBED) -> retrieval acceleration (PARAM-PREFILL) -> training (india) -> graph compound. Generation-acceleration (PARAM-PREFILL) is deliberately LAST in the core because it depends on the DBs being real.

Note on the two "50"s (resolves a dependency ambiguity): `dimpass-50` (the held-out PRINT eval split consumed by T-DIMPASS) is the same 50 prints curated by `U-DELTA-VAL50-EXPAND`. `U-DELTA-HOLDOUT-SPLITS` freezes the geometry/embed/assembly/cnc manifests immediately from the existing `cad-corpus-manifest.json`; `dimpass-50` is only FINALIZED once VAL50-EXPAND curates the 50 stratified drawing PDFs (which itself needs the U-DELTA-PDF-CLASS drawing/business split first). So T-DIMPASS depends transitively on VAL50-EXPAND, not on HOLDOUT-SPLITS alone -- run order: PDF-CLASS -> VAL50-SCORING -> VAL50-EXPAND (freezes dimpass-50) -> T-DIMPASS.

---

## 6. Tooling wiring

Concrete plug-in points for each allowed tool.

**Ollama offload** (qwen2.5-coder:32b heavy / 1.5b trivial / gpt-oss:120b deep; deepseek-r1:32b for Seek-CAD; all verified resident):
- MINE stage -- every corpus miner routes its per-file summarize/classify/extract through Ollama first (R5: mechanical text ops never hit Claude). Specifically: U-DELTA-PDF-CLASS per-PDF drawing-vs-business classification; U-DELTA-CNC-BACKINFER per-program feature extraction; U-DELTA-MCAD-FEATURES native-graph narration.
- Already live: `cad_drawing` is Ollama-first at 35.8% fleet offload (`6745df68cb`) -- the new miners inherit this routing, do not re-plumb.
- Multi-VLM ensemble OCR (U-DELTA-CORPUS-THROUGHPUT) uses the resident vision models -- xray slot owns the OCR runner; delta consumes its output.
- NEVER read raw transcripts/files into Claude context -- use the existing Ollama-backed miners (`mine-galaxy-transcripts.mjs` pattern).

**Qdrant** (the pattern/template/embedding DB):
- U-DELTA-EMBED-COLLECTION creates the dedicated CAD collection via `CADFeatureEmbeddingEngine` -> `QdrantVectorStoreEngine` (the established reuse point -- no CAD-specific collection exists yet; this is the gap). GPU 1024d `nv-embedqa-e5-v5`.
- Consumed by U-DELTA-TEMPLATE-RETRIEVAL (template precision@k) and RAG-grounded generation (`prism_cad:cad_rag`).
- Capacity: route through `QdrantCapacityPlannerEngine` before bulk-loading the 3,328 B-Rep + 12,575 MCAD embeddings.

**Excel macros** (tabular dim/tol/feature mining):
- The two reusable VBA workbooks `JM DIE/Automated Program_Corrected 5-25.xlsm` and `resources/Automated Program_Corrected 5-25.xlsm` are the only editable Excel macro assets (the hyperMILL AutomationCenter `.hms`/`.sub` are CAM post-macros, NOT CAD -- exclude).
- U-DELTA-DIMTOL-DB plugs here: the workbooks already encode JM's tabular program/dim conventions -- mine them for per-class dim/tol tabular priors as one input alongside STEP/print extraction. Feeds the distribution db that seeds U-DELTA-PARAM-PREFILL.

**/system-viz graph update** (the operator "improve alpha graphs" ask):
- U-DELTA-VIZ-COMPOUND is the dedicated unit: every corpus entry, learned asset (template, distribution, assembly graph, embedding cluster, design sequence), and outcome becomes a graph node via the regen-viz splice (FAST[] + splice dual-reg, ONE-canonical-writer of the graph). 
- Cross-substrate edges (typed, ADD-only): corpus-entry -documented-by-> wiki/memory; learned-asset -owned-by-slot-> delta; embedding -embeds-> B-Rep file. Use the existing `cross-substrate-edge-schema.mjs` typed whitelist -- do not invent edge types.
- Queryable cheaply via `node-card <id>` (never Read the 644MB graph) and `master_index_query`. PA4-VIZ-CAD-GRAPH-UPDATE (`ed56229b49`) already wired the base path; VIZ-COMPOUND grows it as the DB grows -- this is the "graphs improve as data grows" compounding.

---

## 7. Open contradictions / operator-gated

These genuinely need the operator -- do NOT resolve autonomously.

1. **D0 train-target A vs B (HARD, blocks U-CAD-REAL-TRAIN-RUN):** is the LoRA target (A) blueprint-OCR dimension extraction, or (B) print->CAD-geometry generation? The 646 pairs are OCR/tokenization pairs -- the geometry-generation corpus is ZERO. Operator must pick. If B, a geometry-generation corpus production run is a prerequisite that does not yet exist.
2. **operator_verified eval split (HARD, blocks T-LORA + T-GNN promote):** Brier <= 0.15 requires an `operator_verified` split that does not exist and cannot be autonomously fabricated. No promote of any adapter or GNN without it. The 594 current eval rows (source: `DELTA-CAD-TRAIN-TEST-READINESS-2026-06-27.md`, the staged OCR corpus toward the 646 target) are 2-model pseudo-labels, 0 operator-verified.
3. **U-MERGE-SLOT-DELTA (operator-gated precondition):** slot/delta is ahead of trunk -- the operator brief said 410 commits, the readers cite 432; either way it carries the smooth-solid emitter, loft/sweep/tangency, NURBS-STEP-emit, real CLIs, and ~19 conflict files (playbook `DELTA-P1-MERGE-PLAYBOOK-2026-06-10.md`). Until merged, `U-CAD-NURBS-STEP-EMIT` is locked out (headless emit produces faceted PLANE-only STEP today) and `U-CAD-SURFACE-GEN` / `U-CAD-SCALE-COMPLEX` cannot be verified. Several geometry-fidelity gates assume the merged emitter.
4. **Fusion add-in manual reload (env-gated):** `runOnStartup:false` -- live `:18360`/`:18365` round-trip (U-CAD-FUSION-LIVE-PROOF) needs one manual UI click per session; no automation path. Headless = MOCK.
5. **hyperCAD-S live seat (env-gated):** T2 `--orchestrator=live` requires the seat open; headless runs are MOCK. hyperMILL seat is v31, not v33 -- v33 corpus not covered.
6. **R7 contradiction "validation-50" semantics:** does T2 measure drawing-accuracy or geometry-fidelity? Operator must confirm which T-DIMPASS vs T-GEOM is the canonical "validation-50" gate.
7. **Accuracy ceiling (physics, not trainable):** ~1.5% NURBS-regeneration floor -- "100% accuracy" is bounded by NURBS regen physics, not removable by training. Gates are set to this floor (mean <= 2.0%, worst <= 6.0%), not to 0%.

---

Files verified on disk this session: `mcp-server/data/state/cad-corpus-manifest.json` (11,695 entries), `scripts/lib/cad-fix-ledger-to-training.mjs`, `scripts/lib/outcome-to-alpaca-converter.mjs`, `scripts/build-print-corpus-manifest.mjs`, `scripts/build-cad-ground-truth-dataset.mjs`, and engines `CADGeometryComparisonEngine.ts`, `CADAssemblyGraphEngine.ts`, `CADCorpusPatternEngine.ts`, `CADFeatureEmbeddingEngine.ts`, `CADReverseCorpusCatalogEngine.ts`. The 432-vs-410 merge-commit-count discrepancy is flagged in section 7 item 3 (operator brief said 410, readers cite 432).