# DELTA CAD CLOSED-LOOP STATE - 2026-07-03

Synthesis of 6 read-only axis assessments (loop-closure, corpus-coverage,
auto-template-gen, pattern-recognition-rag, model-train-selfimprove,
per-platform-gen). Slot:delta, trunk cad-fusion-live-ms0. ASCII only.

Contradiction resolved (R7, more-specific evidence wins): the night-chain
scheduled task IS registered. GROUNDED FACTS reported a bare `schtasks`
miss; corpus-coverage axis shows `Get-ScheduledTask -TaskName "PRISM CAD
Closed Loop Night"` = State=Ready and "PRISM OCR Training Loop" = Running.
The earlier miss was git-bash path mangling, not an unscheduled task.

---

## 1. LOOP-CLOSES-NOW

YES for the generation-to-outcome loop; NO for the outcome-to-LoRA hop.

The chain GEN -> execute -> STEP -> validate -> outcome -> fix-ledger ->
re-GEN closes live and has run for real many times. Producing the first
real GEN->outcome training pairs is IN-CONTROL now: the pairs already
exist on disk; only a formatter is missing.

Evidence:
- cadquery 2.8.0 imports in H:/Tools/python/python.exe;
  scripts/cad-text-to-cadquery.mjs:587-592 pythonCadAvailable() resolves,
  so the GEN->execute->STEP branch at :640-644 is LIVE (not the fallback
  "not installed" string). This was the 06-28 plan's one blocker; cleared.
- :590-602 executeStaged() spawns python model.py, checks model.step
  exists, runs cad-analyze-step.mjs. On disk:
  state/shared/cad-text-gen/an-80mm-x-50mm-x-20mm-mounting-bracket-...
  /model.step (33KB real STEP), status.json executed:true,
  kernelAccuracy.accurate:true, kernelDims [80,50,20] exact.
- Scale: 270 of 318 staged runs have status.json executed:true (48 real
  failures, not silent no-ops).
- :489-513 classifyGenerationOutcome() + :543-558 ingestGenerationOutcome()
  dynamically import mcp-server/dist/engines/CADTrialErrorLearningEngine.js
  (built 2026-07-01 19:07) -> writes cad-failure-ledger.jsonl
  (CADTrialErrorLearningEngine.ts:273,1056-1060).
- Ledger LIVE: 187 records through 2026-07-02T03:30 (182 pass/4 fail/1
  error), real per-part testIds.
- :156 loadLearnedRisk() reads the ledger back into the next prompt
  (reverse arrow closes the loop).
- Night chain registered (Get-ScheduledTask State=Ready, next 22:11) via
  run-cad-gen-loop-overnight.ps1 -> cad-gen-overnight-loop.mjs:6,28.

The single break: no script turns cad-failure-ledger.jsonl into a LoRA
dataset. grep of scripts/*lora* returns nothing;
build-cad-decipher-lora.mjs:23-24 reads a DIFFERENT corpus
(part-decipher*.jsonl, the CAD->manufacturing-text loop, not text->CAD gen).

---

## 2. BUILT vs GAP - per asset class

Canonical counts: state/shared/cad-closed-loop-night/canonical-counts.json:2-10.

| class | count | lane | status | in-control to close |
|---|---:|---|---|---|
| pdf/prints | 344,688 | harvest-prints-to-training.mjs:1-22 | RUNNING (OCR cron State=Running) | n/a running |
| cnc | 367,522 | cnc-ground-truth-build.mjs | RUNNING (night exit 0/613.6s) | n/a running |
| vec2d/dxf | 9,527 | vec2d-to-training.mjs + build-cad-vec2d-dataset.mjs (commit 9e90d25de2, 26 tests) | BUILT, did NOT run tonight (stale-loaded ps1 pre-9e90d25de2) | YES zero-build; verify next night-summary tail |
| brep/STEP | 3,359 (+100,077 gen) | cad-fusion-live-roundtrip.mjs --corpus-harvest/--corpus-kernel | PARTIAL (harvest exit 0; kernel-drain exit 2, Fusion add-in not on :18362) | deep pass GATED (live Fusion) |
| mcad ipt/iam/sldprt | 12,572 | none (grep empty) | NO LANE | GATED (proprietary format reader) |
| f3d | 1,739 | none | NO LANE | small, unverified |
| mcam | 2,763 | none | NO LANE | small, unverified |
| tif | 124 | none | NO LANE | tiny, folds to OCR |

## 2/3 capability map - per capability

- template-gen: retrieval BUILT (cad-text-to-cadquery.mjs:304-339
  classifyRequestArchetype + loadArchetypeRecipe reading static
  ARCHETYPE-RECIPES.json writtenAt 2026-05-25). Unsupervised archetype
  MINING NOT built; CADPartArchetypeRegistryEngine.ts frozen (PHASE-7 ML
  target); CADCorpusPatternEngine.ts + CADCorpusFeaturePrevalenceLearner
  are WIRE-EXEMPT and self-report weak signal (22/23 pairs diverged).
- pattern-recognition/RAG: engines wired to dispatcher
  (cadAutomationDispatcher.ts:2918-3167) but embedding backend is a
  filename/size hash (CADEmbeddingIndexOrchestratorEngine.ts:77-113,193-242),
  NOT geometric. Zero CAD Qdrant collection on disk. india radii/bbox
  miner (step-dimension-extract.mjs) feeds LoRA, not this path. GAP.
- model-train: real QLoRA trainer (fleet_lora_train.py:1-368) + 6 real
  adapters on disk (fleet-prod-20260611 finalLoss 5.88, device RTX PRO
  6000 Blackwell). Corpus assemblers real. GATED (no torch in this venv).
- per-platform gen: Fusion :18362 add-in LIVE
  (PRISMBridgeCAD.py:62 + Fusion360LiveBridgeEngine.ts full op parity:
  sketch/extrude/revolve/fillet/hole/shell); roundtrip harness only
  exercises extrude+revolve. Mastercam + hyperCAD-S code exists, neither
  app installed (Test-Path False on both seats + NetHook DLL). GATED.

## 3. DEEP SELF-LEARNING - remaining builds

- LoRA emitter from GEN outcome ledger - IN-CONTROL (this is #4).
- Geometric embedding backend + prism_cad Qdrant collection from india
  radii/bbox signal against CAD_CORPUS_ALLVENDOR.jsonl (31,177 entries) -
  IN-CONTROL (pure wiring, Qdrant already running).
- Fold cad-decipher-mfg-dataset.jsonl (969 pairs) into a fresh
  assemble-fleet-lora-corpus.mjs build - IN-CONTROL ($0).
- CADArchetypeMinerEngine (corpus STEP op-sequence -> candidate recipes,
  review-gated append to ARCHETYPE-RECIPES.json) - IN-CONTROL.
- Wire CADCorpusFeaturePrevalenceLearner persistLearned overlay into the
  live templateFor default path - IN-CONTROL.
- Fillet/hole/shell roundtrip battery vs live Fusion :18362 - IN-CONTROL.
- Actual QLoRA re-train - GATED (CUDA torch/peft/trl venv).
- brep deep-kernel pass - GATED (live Fusion add-in on :18362).
- MCAD lane (12,572) - GATED (Inventor/SolidWorks API or STEP bridge).
- Mastercam / hyperCAD-S generation - GATED (installs + NetHook DLL/seat).

---

## 4. NEXT IN-CONTROL UNIT

U-ID: U-CADGEN-LORA-EMITTER

Title: Emit the first real GEN->outcome LoRA dataset from the live
text->CAD failure ledger.

Why now: it is the ONE remaining break in GEN -> ... -> LoRA. The source
data is real and growing nightly (187 pass/fail records +
paired model.py/request.json under state/shared/cad-text-gen/<slug>/). Six
clone-from patterns exist (build-cad-decipher-lora.mjs,
build-lathe-lora-dataset.ts, export-ledger-lora.mjs). No operator/install/
seat dependency. This is the terminal-goal pivot: it turns the
already-closed generation loop into a training signal.

Done-gate:
1. scripts/build-cadgen-lora-dataset.mjs reads
   mcp-server/data/state/cad-failure-ledger.jsonl + paired staging dirs.
2. Emits Alpaca pairs: pass -> request->working-code; fail/error ->
   request+error->corrected-code. Output
   state/shared/lora/cadgen-outcome-dataset.jsonl.
3. wc -l == count of ledger records with a resolvable model.py (report
   skipped rows loud, R12; do not silently drop).
4. Register id cadgen-outcome-lora in
   build-fleet-training-corpus-inventory.mjs:156-159 pattern; confirm it
   appears in fleet-training-corpus-inventory.json.
5. Fold into assemble-fleet-lora-corpus.mjs run; fleet-lora-combined.jsonl
   line count grows by the new pair count.

Files to touch:
- CREATE scripts/build-cadgen-lora-dataset.mjs
- EDIT scripts/build-fleet-training-corpus-inventory.mjs (register source)
- OUTPUT state/shared/lora/cadgen-outcome-dataset.jsonl
- (verify) scripts/assemble-fleet-lora-corpus.mjs re-run

---

## 5. OPERATOR-GATED BACKLOG (named blockers only)

- QLoRA re-train: no torch/peft/trl in H:/Tools/python/python.exe; needs a
  CUDA venv on 3.11/3.12 (pip trl/qwen-vl-utils/pillow/pymupdf).
- brep deep-kernel pass: Fusion add-in must answer on :18362 (kernel-drain
  exit 2 tonight); needs Fusion add-in reload on delta's box.
- MCAD lane (12,572 ipt/iam/sldprt): needs Inventor/SolidWorks API or a
  STEP-export bridge; proprietary binary formats.
- Mastercam per-platform gen: Mastercam 2024 install + built/deployed
  MastercamNetHook.dll (no in-repo C# source to compile).
- hyperCAD-S per-platform gen: OPEN MIND hyperCAD-S seat (Program Files
  absent); plus live-session-attach validation of the spawn-python design.
- 410-commit slot/delta merge (operator-gated, do not touch).
- npm run build (stale dist -> 25.4x mis-measure risk; operator-gated).

---

## STATUS UPDATE 2026-07-04 (slot:delta) - the named NEXT unit is SHIPPED; loop is CLOSED

The section-4 NEXT unit `U-CADGEN-LORA-EMITTER` is **DONE** (was built earlier this session-arc,
after this spec was written). VERIFIED against reality, all 5 done-gate items:

1. `scripts/build-cadgen-lora-dataset.mjs` exists (12.4KB, `fe979a1973`).
2/3. Output `state/shared/lora/cadgen-outcome-dataset.jsonl` = **127 pairs**, R12-loud:
   `127 = 184 verified-pass - 40 invalid-code (25.4x-undersize poison-guard) - 17 dedup`;
   4 fail + 1 error skipped (never train a guess). Re-run live 2026-07-04.
4. Registered `id:cadgen-outcome-lora kind:lora-training-jsonl status:present advisory:false`
   in `build-fleet-training-corpus-inventory.mjs:173`; confirmed present in
   `state/shared/training/fleet-training-corpus-inventory.json`.
5. **Folded into the training corpus**: `assemble-fleet-lora-corpus.mjs` tally shows
   `cadgen-outcome-lora: 127 added (w=1, 0 dup, 0 invalid)` in `fleet-lora-combined.jsonl`.
   (An earlier "grep=0 in combined" was a FALSE POSITIVE -- folded PAIRS carry
   instruction/output text, not the source-id string; the assembler per-source tally is the
   correct verification, not grep.)

Also DONE (verified via the same assembler tally): the `cad-decipher-mfg-lora: 969 added` fold
(section-3 "Fold cad-decipher ... 969 pairs" item). The GEN->outcome->LoRA loop is CLOSED.

### TRUE NEXT IN-CONTROL UNIT: U-CAD-GEOMETRIC-EMBEDDING-BACKEND

The pattern-recognition/RAG GAP (section 2/3). `CADEmbeddingIndexOrchestratorEngine.ts` has TWO
hash-mock backends -- `HashBasedEmbeddingBackend` (:74-91) + `TextEmbeddingBackend` (:93-114),
both `DEFAULT_DIM=384`, both FNV/MurmurHash of tokens -- NOT geometric. Two parts sharing a hub +
free-form blade geometry hash to unrelated vectors, so KNN retrieval is meaningless.

Build (fresh context; R8 read the whole engine + its Qdrant/query callers first):
- A geometric `EmbeddingBackend` (interface `{dim, embed(tokens:TokenSeq):Embedding}`) that maps a
  part's REAL feature signal (india `step-dimension-extract.mjs` radii/bbox/topology counts, +
  CADGeometryComparisonEngine.extractMetrics entityTypes) -> a stable normalized vector. Do NOT
  build a new text-embedding engine (`LocalEmbeddingEngine` already exists -- R8 dedup); this is a
  GEOMETRIC featurizer, a different axis.
- Populate the prism_cad Qdrant collection from `CAD_CORPUS_ALLVENDOR.jsonl` (31,177 entries).
- recall@10 test: a query part retrieves same-archetype parts (blisk near impeller, cube near cube).
- Dispatcher already wired: `cadAutomationDispatcher.ts:2918-3167`.
Gate: none (Qdrant already running; $0). Heavy/live-engine -> start on a clean context.
