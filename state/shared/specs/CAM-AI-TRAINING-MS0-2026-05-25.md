# CAM-AI-TRAINING-MS0 — Deep CAM Mastery via Real-Data AI Training

**Slot:** kilo
**Branch:** slot/kilo
**Author:** claude-b247372e
**Issued:** 2026-05-25T20:25:00Z
**Status:** drafting (MS not yet in roadmap envelope — this spec proposes it)
**Loop session:** b247372e-4fef-4908-afe2-a6ab09e8aeeb (target 100)

## Operator work order (verbatim)

> review sessions from 5/25/2026 2am cst for kilo slot to regain context on cam and deep learning and deep reasoning and nn and gnn training and improvements for cam generation. /goal [ deep research and deep assess current state of cam programming in primary cad/cam softwares. compile all remaining cam units and move to kilo chat slot. utilize all current cad files, cad/cam files, existing programs in the prism system to trin the ai systems, gnn, nn, lora, rag, deep reasoning, deep learning, machine learning, wiki injection, tribal injection systems. develop templates for all cad files for cam programming for all operations for each cam software. ] /loop [5m] complete /goal with at least 100k unique cad files used for training and template generation for every known way to use a cam tool path along with all necessary inputs from each software package so the ai system can use every single feature possible from each cam package, efficiently and effectively.

## Hard constraints (operator-stated)

1. **REAL parts only** — no synthetic / generated / procedurally-faked CAD. Every training example must trace to a real-world part from a reputable source.
2. **≥100,000 unique CAD files** in the training corpus before MS exit.
3. **Every CAM software × every operation type** covered with a template.
4. **All AI surfaces utilized**: GNN, NN, LoRA, RAG, deep reasoning, deep learning, ML, wiki injection, tribal injection.
5. **No unit cap** — autonomous /loop runs until MS exit.

## Current state (5/25 20:25 UTC survey)

**Kilo 5/25 02:00 prior session shipped** (HANDOFF claude-ee1c7d3c-kilo-cam-mastery-cam):
- 6 engines / 142 tests on slot/kilo
- KiloCamDatasetBuilderEngine (LoRA training tuples — substrate ready, never invoked at scale)
- KiloHyperCadFeatureTaggerEngine (hyperMILL PFC)
- KiloCamSfcBridgesEngine (Mastercam + Esprit)
- KiloSfcSolidWorksBridgeEngine (SolidCAM iMachining)
- KiloCamCoverageHarnessEngine (Phase-5 planner)
- EspritDeepLearningEngine
- Named gaps: U-KILO-CAM-SFC-WIRE pickup; LoRA training execution (lima); KiloE2ECoverageDemoEngine orchestrator; JM Die Mate fixture geometry; hyperMILL simulator + collision binding

**CAM backlog (`ROADMAP-CONSOLIDATED.json`):**
- 175 pending CAM-tagged units across 30+ milestones
- Top milestones: MS-CAM-MASTERY(34), CAM-EXHAUST-MS0(18), CAM-ML-CLOSEDLOOP-MS0(15), CAM-PARITY-AGI-MS0(12), AI-TRAINING-FIRST-MS0(25), CAD-TRAINING-EXTRACT-MS0(12), CADCAM-DAGI MS1-5(64)

**Real CAD corpora reachable now:**
- ✓ `H:/PRISM/JM DIE/` → **12,466** real CAD files (.step, .stp, .iges, .igs, .sldprt, .ipt, .x_t, .x_b, .sldasm, .catpart, .prt, .asm, .iam, .f3d, .3mf, .brep, .jt, .sat, .3dm) from 100+ real customers (ITW, Alcoa, Optimas, SFS, Holo-Krome, …)
- ✗ ABC Dataset (NYU/Skoltech, 1M+ real Onshape parts) — not mounted, must acquire
- ✗ Fusion 360 Gallery (Autodesk Research, ~8k real designs) — not mounted, must acquire
- ✗ MFCAD++ (real machined parts w/ feature annotations) — not mounted
- ✗ MCB (Mechanical Components Benchmark) — not mounted
- ✗ NIST STEP test parts — not mounted

**CAM-AI training surface:**
- 7 CAD-corpus engines BUILT but EMPTY (totalCatalogsBuilt=0, totalFilesProcessed=0)
- `CADCorpusIngesterEngine` (24,545-program-archive ingester — pure-logic core + `ProgramParser` injection seam)
- `STEPGeometryParserEngine`, `StepImportEngine`, `BRepTessellatorEngine`, `CADToSTEPPipelineEngine`
- `CAMBaselineRegressorEngine` expects `JM_DIE_ML_SPLITS.json` (missing)
- NN-GRAPH (GraphSAGE tier-5) DORMANT — poolSize=0, AUROC=0.096 vs 0.78 gate
- LoRA cadence engines exist per-domain but never fed by a 100k-class corpus

## Architecture: 3 phases, 3 tracks

```
Phase A — REAL CORPUS ASSEMBLY (≥100k real CAD files)
├── Track A1: JM Die ingest  (12,466 files — already on H:)
├── Track A2: ABC Dataset acquisition  (1M+ real Onshape parts via abc-dataset.org)
├── Track A3: Fusion 360 Gallery acquisition  (Autodesk Research, real designs)
├── Track A4: MCB + MFCAD++ + Thingi10K acquisition
└── Track A5: NIST STEP test parts acquisition

Phase B — CAM TEMPLATE COVERAGE (every software × every operation)
├── Track B1: HyperMILL  (2D/3D/5-axis/mill-turn — using hyperMILL Function Index)
├── Track B2: Fusion 360 (incl. Mfg-Ext + HSM — using F360 Function Index)
├── Track B3: Mastercam  (Mill/Turn/Mill-Turn/Wire — using Mastercam CAD Function Index)
├── Track B4: SolidCAM    (iMachining/25D/3D-HSS-HSR/5-axis/turning/millturn)
├── Track B5: Inventor HSM  (using Inventor HSM Function Index)
├── Track B6: NX CAM
├── Track B7: PowerMill
├── Track B8: Esprit
├── Track B9: CATIA Machining
├── Track B10: 16 remaining (Edgecam, GibbsCAM, WORKNC, TopSolid, CAMWorks, Tebis, BobCAD,
│              Cimatron, SprutCAM, Alphacam, FeatureCAM, Vericut, SURFCAM, VISI, Creo, PartMaker)

Phase C — AI TRAINING INJECTION (every surface)
├── Track C1: GNN/NN  (GraphSAGE tier-5 unblock via 768-d embeddings from corpus)
├── Track C2: LoRA cadence  (CAM-domain training tuples — KiloCamDatasetBuilderEngine substrate)
├── Track C3: RAG indexes  (corpus → embedding store → master-index + tribal-embed + memory-vault)
├── Track C4: Deep reasoning / deep logic chains
├── Track C5: Wiki injection  (per-customer + per-CAM-system + per-operation wiki entities)
└── Track C6: Tribal injection  (real-program patterns → tribal-tip corpus, domain-tagged)
```

## Unit decomposition (initial, 30 units — more emerge as loop progresses)

### Phase A — Real Corpus Assembly

| Unit | Title | Estimated effort |
|------|-------|------------------|
| U-CAMT-A01 | Build `scripts/ingest-jm-die-cad-corpus.mjs` runner (uses `CADCorpusIngesterEngine` with metadata-only parser) | M |
| U-CAMT-A02 | Run A01 → emit `state/shared/corpus/jm-die-corpus.jsonl` + `jm-die-corpus.stats.json` (target ≥12k entries) | M |
| U-CAMT-A03 | Build `scripts/acquire-abc-dataset.mjs` — download manifest from abc-dataset.org (chunked, resumable, SHA256-verified) | L |
| U-CAMT-A04 | Run A03 → fetch first 100k STEP files (subset of 1M+) | XL |
| U-CAMT-A05 | Build `scripts/acquire-fusion360-gallery.mjs` — Autodesk Research dataset | M |
| U-CAMT-A06 | Build `scripts/acquire-mcb-mfcad-thingi10k.mjs` — MCB + MFCAD++ + Thingi10K | M |
| U-CAMT-A07 | Build `scripts/acquire-nist-step.mjs` — NIST public STEP test parts | S |
| U-CAMT-A08 | Unify all sources into `state/shared/corpus/cam-training-corpus.jsonl` (provenance-tagged, dedup'd) | M |
| U-CAMT-A09 | `CorpusProvenanceLedgerEngine` — every entry traces to source URL + license + hash | M |
| U-CAMT-A10 | Corpus quality gate — 100k unique, ≥3 sources, license-clean | M |

### Phase B — CAM Template Coverage (24+ CAM systems × ~30 operation types ≈ 720+ templates)

| Unit | Title |
|------|-------|
| U-CAMT-B01 | `CAMOperationTaxonomyEngine` — canonical operation taxonomy (face / pocket / contour / adaptive / 3D / 5-axis / drill / tap / thread / probe / ramp / trochoidal / scallop / waterline / morph / pencil / flow / parallel / radial / spiral / project / chamfer / engraving / bore / turn / groove / part / undercut / swarf / impeller / blade / port / undercut) |
| U-CAMT-B02 | `CAMOperationInputSchemaEngine` — per-software input parameter schemas (tool, WCS, stepover, stepdown, feed, speed, coolant, leads, links, ramps, contains, avoid, multi-axis tilts, sim) |
| U-CAMT-B03 | `CAMTemplateGeneratorEngine` — given (software, operation, part-feature-class) → template JSON |
| U-CAMT-B04..B27 | One template-batch unit per CAM software (HyperMILL / Fusion / Mastercam / SolidCAM / …) |
| U-CAMT-B28 | Template coverage matrix dashboard `state/shared/dashboards/cam-template-coverage.html` |
| U-CAMT-B29 | Template self-test via dispatcher round-trips |

### Phase C — AI Training Injection

| Unit | Title |
|------|-------|
| U-CAMT-C01 | `scripts/embed-cam-corpus.mjs` — ONNX embedding (384-d + 768-d) of every corpus entry |
| U-CAMT-C02 | NN-GRAPH reference-pool seed from corpus embeddings (unblocks GraphSAGE tier-5 dormancy) |
| U-CAMT-C03 | LoRA dataset build via `KiloCamDatasetBuilderEngine` at corpus scale |
| U-CAMT-C04 | RAG index build — corpus → master-index + tribal-embed + memory-vault |
| U-CAMT-C05 | Wiki injection — per-software / per-operation / per-feature wiki entities |
| U-CAMT-C06 | Tribal injection — extracted patterns → tribal-tip corpus, domain-tagged |
| U-CAMT-C07 | Deep-reasoning chain registration on corpus features |
| U-CAMT-C08 | E2E validation: print → feature → template → toolpath → G-code across all 24 CAM systems on 10 hold-out parts |

### Phase D — Close-out

| Unit | Title |
|------|-------|
| U-CAMT-D01 | MILESTONE_PROGRESS reconcile (atomic-roadmap + envelope + BUILD_STATE + roadmap-index) |
| U-CAMT-D02 | 4-surface doc reflection (CLAUDE.md / MEMORY.md / wiki / memo) |

## Success criteria (MS exit gate)

1. `cam-training-corpus.jsonl` ≥ 100,000 unique entries, all REAL, license-clean, provenance-traced.
2. Template coverage matrix shows every CAM software × every canonical operation type has at least one valid template.
3. NN-GRAPH AUROC ≥ 0.78 OR reference-pool size ≥ 5,000 (whichever closes the tier-5 dormancy first).
4. LoRA training tuples ≥ 100,000 emitted from `KiloCamDatasetBuilderEngine`.
5. RAG index recall ≥ 0.80 on a 50-query hold-out probe.
6. E2E pipeline validation green on all 24 CAM systems × 10 hold-out parts.
7. CLAUDE.md / MEMORY.md / wiki / memo all reflect the MS in a single commit.

## Risk register

- **R-1: ABC Dataset acquisition bandwidth.** 1M+ STEP files at ~5-50 KB avg = ~25-50 GB. Manifest chunked + resumable; fetch first 100k subset (smallest by bytes) first.
- **R-2: License audit.** Every external source must carry a license usable for training. ABC: under CC BY 4.0. Fusion 360 Gallery: Autodesk Terms (research/academic). MCB / MFCAD++: paper-citation. Recorded in `CorpusProvenanceLedgerEngine`.
- **R-3: ITAR / customer-confidentiality.** JM Die parts may carry NDA constraints. Per `feedback_no_public_h_drive` — corpus stays internal-only, NEVER published.
- **R-4: STEP parsing slow.** Metadata-only ingest (no body parse) is fast — sufficient for catalog + customer-attribution + extension stats. Deep parse deferred to per-template-build step (lazy).
- **R-5: NN-GRAPH gate.** Even at 100k corpus, AUROC may not clear 0.78 if class imbalance is high. Plan B: surface poolSize-only gate (≥5000) as accepted alternative.

## Acceptance checklist (every unit must satisfy)

- [ ] Real-data only (no synthetic) — verified via `CorpusProvenanceLedgerEngine`
- [ ] Per-file scrutiny gate (Karpathy R8 / per-file 2-of-2 → end-of-task 3-of-3)
- [ ] Tests in `mcp-server/src/__tests__/` (NOT `mcp-server/src/engines/__tests__/` per [[feedback_engine_tests_in_tests_dir]])
- [ ] Wiring through `prism_cad` / `prism_cam` / `prism_ai` dispatchers as appropriate
- [ ] Commit `[CAM-AI-TRAINING-MS0]/U-CAMT-XXX: title` on slot/kilo
