<!-- delta /goal roadmap P0-P10 -- ultracode wf_7909e40d-9ee, 2026-06-09 -->

Both findings confirmed. Line 138 references `OLLAMA_MODEL` (undefined — only `FALLBACK_MODEL` and the local `model` var exist) → **ReferenceError crashes every successful Ollama classification**, silently degrading to rule-based for the whole corpus. This is a real residual bug in the A1 commit and is the natural Unit 1.

Also confirmed: `cad-fix-training-ledger.mjs` has **no retrain consumer** (only itself + its test reference it — Lens 3's finding holds), and `CADFeatureRecognitionEngine.ts` does **NOT exist on the slot-delta worktree** (it's the shared-tree U-EFF25 stub — the new milestone is genuinely net-new here).

I have enough verified ground truth. Producing the roadmap now.

---

# DELTA (CAD) DEFINITIVE EXECUTION ROADMAP — toward 3 goal-clears
**Generated 2026-06-09 · slot:delta · branch `slot/delta` (409 ahead of `cad-fusion-live-ms0`)**

**Goal clears:** (1) finish ALL remaining delta units, (2) upgrade delta systems for the Blackwell box, (3) fully-finished closed-loop learning for highly-complex CAD generation.
**Operating model:** ULTRACODE-PLAN for decomposition/merge/multi-agent · OLLAMA-GRUNT for mechanical text/vision (strongest model for the grunt) · CLAUDE-BUILD for geometry/safety/wiring/synthesis. **Default-DENY on geometry & safety — Ollama is pre-gate draft only.**

**Live-verified this session:** A1 model-resolve already committed (`575c19a709`) but carries a residual `ReferenceError` (line 138 `OLLAMA_MODEL` undefined) that crashes the success path → Unit 1. Models `gpt-oss:120b / qwen2.5-coder:32b / gpt-oss:20b / qwen3-vl:8b-instruct / qwen3-vl:8b / qwen2.5vl:7b / llama3.2-vision:11b / moondream:1.8b / nomic-embed-text` all live. `CADFeatureRecognitionEngine.ts` absent on slot-delta. `cad-fix-training-ledger.mjs` has zero retrain consumer.

---

## 1 · EXECUTIVE SEQUENCE (dependency-ordered phases P0→P10)

| Phase | What | Why this order |
|---|---|---|
| **P0 · STABILIZE & UNBLOCK** | Fix A1 residual crash, repair malformed `CAD-DRAW-MAX-MS1.json`, reap orphan node procs, close the stranded `/loop` | Nothing downstream can be trusted until the labeler runs, envelopes are readable, and the tree is clean. Cheapest, highest unblock-ratio. |
| **P1 · MERGE & TRUTH-RECONCILE** | Merge `slot/delta` (409 commits) → trunk; reconcile U-AI-01..15 engine-exists-vs-envelope-not_started; enroll `U-BRIDGE-CAD-CAM-HANDOFF`; un-lie the ACBRIDGE & DRAW-MAX "complete/100%" R12 drifts | Every other phase builds on the trunk + a truthful envelope. Reconcile BEFORE building so we never rebuild shipped engines. |
| **P2 · KEYSTONE: durable GPU batch-runner** | One reusable resumable-cursor + stream-append + `process.exitCode` scheduled-task runner | R15 build-once: U1(OCR), U2(re-embed), U4(corpus-catalog) all depend on it. The single asset that converts idle Blackwell into corpus throughput. |
| **P3 · OLLAMA OFFLOAD WIRING** | Wire the 5 grunt routes (labeler→pipeline, synthesis→120b, search→bridge, OCR-draft, node-gloss) | Moves offload 5.8%→≥30%, stops burning Claude on classification/summarization. Cheap, compounding, unblocks corpus drains. |
| **P4 · LIVE BRIDGE SUBSTRATE** | Bridge supervisor (:18632 durable), fix `/extrude cut` + `/combine`, re-prove parked revolute-assembly + EJOT radius | A stable live substrate is the precondition for proving every new authoring command. Stage (a). |
| **P5 · CORPUS THROUGHPUT** (Blackwell) | Concurrent multi-VLM OCR over 7,794 JM prints; GPU re-embed (U-RAG-6); full STEP-corpus catalog 33%→~100%; heaps + streaming I/O | Produces the ground-truth + embeddings + feature corpus the closed loop is starved on. Gated on P2 runner. |
| **P6 · FEATURE RECOGNITION** ⭐ | `CAD-FEATURE-RECOGNITION-MS0` — BREP→authoring-feature-tree (the crux missing milestone) | Breaks the STEP-no-construction-history ceiling. Stages (c)→(g) cannot emit/correct complex parts without a replayable feature tree. **THE hardest blocker.** |
| **P7 · SMOOTH SOLID GEN** | Loft/sweep/spline emitters + L3-prove each bridge command + intent→op-sequence planner | Kills the faceted-prism-stack the operator rejected. Depends on P6 (tree) + P4 (proven cmds). Stage (c). |
| **P8 · MEASURE & CORRECT** | Surface-deviation (Hausdorff) metric + truth-source bind; one correction mechanic per newly-proven feature | Honest measurement of smooth quality + correction of new features. Stages (d)+(e). |
| **P9 · CLOSE THE LEARN LOOP** | Wire fix-ledger→trainer (LoRA/k-NN retrain) + `xproc_outcome_publish` to india's drift-canary; deep NN/ML backbones | The loop only "closes" when the next pass needs *fewer* corrections. Stages (f). Big GPU work lands here. |
| **P10 · SCALE TO COMPLEX** | Multi-feature trees, datum/reference topology, pattern/mirror, assembly+mates, transactional rollback | The final clear: 10–50 interdependent features generated, corrected, learned. Stage (g). |

> P10 is genuinely "final"; P6 is the gating crux. P1's merge and P2's keystone runner are the two structural unblocks that everything sits on.

---

## 2 · PER-PHASE UNIT LIST (ALL units — none pruned)

### P0 · STABILIZE & UNBLOCK

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-A1B-LABELER-OLLAMA-MODEL-REF-FIX** | Fix `scripts/cad-ollama-archetype-label.mjs:138` — replace undefined `OLLAMA_MODEL` with the resolved `model` var. Accept: `node scripts/cad-ollama-archetype-label.mjs --force` on a known slug emits `source:"ollama:gpt-oss:120b"` (or 32b) with no ReferenceError; `ollama-offload-dashboard.mjs --json` `offloaded` increments. | XS | CLAUDE-BUILD |
| **U-DRAWMAX-JSON-REPAIR** | Repair malformed `mcp-server/data/milestones/CAD-DRAW-MAX-MS1.json` (line 91 `Expected ',' or '}'`). Accept: `node -e "JSON.parse(require('fs').readFileSync(...))"` exits 0; unit statuses readable. | XS | CLAUDE-BUILD |
| **U-ORPHAN-REAP** | Reap stale node procs from killed bg generators (R14). Accept: no orphan delta-generator PIDs in `/fleet-reaper --hunt`. | XS | CLAUDE-BUILD |
| **U-LOOP-STRAND-CLOSE** | Close the `/loop` left `running` at iter 33/50 with no handoff; write per-slot handoff. Accept: ATCS state not `running`; `HANDOFF-delta-*.md` exists. | XS | CLAUDE-BUILD |
| **U-CADATOMICOPS-WIRE-VERIFY** | Verify `CADAtomicOpsEngine` dispatcher wiring (flagged possibly-unwired vs MEMORY "75/75 wired"). Accept: round-trip through `cad_atomic_ops` action returns; no `stop_on_unwired_assets` fire. | XS | CLAUDE-BUILD |

### P1 · MERGE & TRUTH-RECONCILE

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-MERGE-SLOT-DELTA** | Merge `slot/delta` (409 commits) → `cad-fusion-live-ms0` trunk; resolve conflicts. Accept: `git rev-list --count cad-fusion-live-ms0..slot/delta == 0` after merge; build + affected tests green. | M | ULTRACODE-PLAN + CLAUDE-BUILD |
| **U-RECONCILE-UAI-ENGINE-STATUS** | Reconcile U-AI-01..15 envelope `not_started` vs briefing "shipped engines" (CADWorldModelEngine etc.). For each: grep engine on disk + dispatcher wiring → flip envelope to `complete` if real, keep `not_started` if absent. Accept: per-unit verdict table; ZERO shipped engine rebuilt. | S | ULTRACODE-PLAN (Ollama search via bridge) + CLAUDE verdict |
| **U-BRIDGE-CAD-CAM-ENROLL** | Enroll `U-BRIDGE-CAD-CAM-HANDOFF` into `FEATURE-GAP-AUDIT-MS0.json` (engine `CadCamHandoffEngine.ts` 331 LOC shipped+wired, unit never added). Accept: unit present + `complete`; both dispatchers round-trip; tests confirm. | XS | CLAUDE-BUILD |
| **U-ACBRIDGE-R12-UNLIE** | Flip `CAD-FUSION-LIVE-MS0-ACBRIDGE` framing: envelope covers bridge plumbing (6/6) but NOT live learning-loop proof; record the honest split. Accept: envelope note distinguishes plumbing-complete from loop-pending. | XS | CLAUDE-BUILD |
| **U-DRAWMAX-STUB-FLAG** | Flag CAD-DRAW-MAX-MS1 "75% LIVE" as deterministic stub (not real proof); mark `U-VALIDATION-50-CORPUS` operator-gated (needs hyperCAD-S workstation). Accept: envelope marks live-proof pending, blocker named. | XS | CLAUDE-BUILD |
| **U-GROUND-TRUTH-TRIAGE** | Triage `CAD-GROUND-TRUTH-MS0` 10 status-`?` units → assign real statuses. Accept: every unit has a status field. | XS | CLAUDE-BUILD |
| **U-TRAINING-EXTRACT-TRIAGE** | Triage `CAD-TRAINING-EXTRACT-MS0` (11 pending + 1 in_progress) post-merge; dedupe against the now-merged CAD-TRAINING-PIPELINE arc. Accept: no unit duplicates a merged commit. | S | ULTRACODE-PLAN |

### P2 · KEYSTONE — durable GPU batch-runner (build-once, R15)

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-DURABLE-BATCH-RUNNER** | Build `scripts/lib/durable-batch-runner.mjs`: resumable cursor (`processed-cursor.jsonl`, durable row BEFORE cursor advance), per-item stream-append, `process.exitCode` (NEVER `process.exit()` — H: stdout-loss gotcha), scheduled-task wrapper, orphan-reaping, worker-pool concurrency knob. Accept: kill mid-run → resume re-processes 0 done items (the `265e8a6e41` invariant); ≥3 failure-mode tests (kill, corrupt-cursor, disk-full) + ≥2 adversarial (torn-row, duplicate-item). | M | CLAUDE-BUILD |
| **U-BATCH-RUNNER-TELEMETRY** | Wire `ollama-offload-dashboard.mjs --json` + `gpu_health.py` (3.13 venv ONLY, never 3.14 portable) gates into runner start/stop. Accept: runner refuses start if `gpu_health.ready:false`; logs offload delta. | S | CLAUDE-BUILD |

### P3 · OLLAMA OFFLOAD WIRING (the 5 leverage routes)

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-OLL-1-LABELER-PIPELINE** | (depends U-A1B) Route the now-working labeler into the closed-loop classification step via `callLocalModel()`/`resolveSynthesisModel()`; stop Claude hand-classifying each part. Accept: closed-loop run shows `source:ollama:*` per part; ~95% Claude-token saving/part. **Guardrail: descriptive label only — never selects geometry/params.** | S | CLAUDE-BUILD (wire) |
| **U-OLL-2-OCR-CORPUS-DRAFT** | (depends P2 + P5-U1) Route 1st-pass print-dim extraction to `qwen3-vl:8b-instruct` ensemble. Accept: VLM output re-parsed by hardened deterministic parser (leading-dot/`+`/truncation) + `units-guard`; single-of-N discarded. **Guardrail: draft string to verify, never a units/dim source.** | S | OLLAMA-GRUNT + CLAUDE gate |
| **U-OLL-3-SYNTHESIS-120B** | Route per-transcript/per-digest context-regain + galaxy roll-up to `gpt-oss:120b` via `ask-ollama.mjs summarize`, ≤3 concurrency. Accept: 26-transcript backlog drained without rate-limit; Claude fuses final synthesis. **Guardrail: Claude owns contradiction-resolution (R7).** | S | OLLAMA-GRUNT |
| **U-OLL-4-BRIDGE-SEARCH** | Make `ollama-prism-bridge.mjs --trace` (`qwen2.5-coder:32b`) the default code-search surface for merge/wiring/envelope-drift audits. Accept: "where does X wire" answered at ~0 Claude tokens; Claude verifies before acting. | XS | OLLAMA-GRUNT |
| **U-OLL-5-NODE-GLOSS** | Clone `summarize-all-scripts-via-ollama.mjs` for the 115+ CAD feature/wiki nodes (`qwen2.5-coder:32b`). Accept: ≥70% prose Ollama-authored (WIKI PROTOCOL); Claude keeps cross-refs. | S | OLLAMA-GRUNT |

### P4 · LIVE BRIDGE SUBSTRATE (stage a)

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-CADX-BRIDGE-SUPERVISOR** | Durable scheduled-task keeps Fusion add-in bound to `:18632`, health-pinged, auto-relaunched. Accept: `bridgeHealth(:18632).ok===true` across a cold operator session, zero manual relaunch. **Blocker: Fusion must be running w/ add-in — operator-machine-gated.** | M | CLAUDE-BUILD |
| **U-BRIDGE-EXTRUDE-CUT-FIX** | Fix first-class `/extrude {operation:"cut"}` + `/combine` endpoints (today route through raw `/execute participantBodies`). Accept: `/extrude cut` returns `success:true` on a participant body. | S | CLAUDE-BUILD |
| **U-REVOLUTE-ASM-LIVE-PROOF** | Re-run parked revolute-assembly proof against live bridge: `node scripts/cad-fusion-assembly-poc-live.mjs --port 18632 --joint-type revolute`. Accept: live round-trip success recorded (closes the ACBRIDGE R12 gap). | S | CLAUDE-BUILD |
| **U-EJOT-RADIUS-VISUAL-CONFIRM** | Visually confirm EJOT loft transition radius in live Fusion (guide-rail+tangency added, never confirmed). Accept: probe reports middle transition R present = spec. | S | CLAUDE-BUILD |

### P5 · CORPUS THROUGHPUT — Blackwell utilization (stages feed d/f)

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U1-VLM-OCR-CONCURRENT** | (depends P2) Orchestrate 3–5 VLM families resident+concurrent (`qwen3-vl:8b-instruct`+`qwen2.5vl:7b`+`llama3.2-vision:11b`, ≥2-agree, ctx 3072→8192) over JM's 7,794-drawing corpus as a durable GPU batch job. Accept: full-corpus run completes durably + resumably (vs 39-file foreground today); 3–5× per-print throughput. **THE single biggest closed-loop lever.** | L | OLLAMA-GRUNT + CLAUDE gate |
| **U2-GPU-REEMBED-URAG6** | (depends P2) Execute deferred U-RAG-6: GPU re-embed full CAD corpus (105,636 files + 115 wiki + 418 PSN nodes). Either atomic 768→1024 `nv-embedqa-e5-v5` co-migration OR GPU `nomic` bulk re-embed. **Guardrail: ATOMIC swap (partial → cosine meaningless); gate the space-change behind U-RAG-5 eval-harness proving nv-embedqa beats nomic on PRISM queries.** Accept: full corpus re-embedded; eval-harness shows ≥parity. | L | CLAUDE-BUILD + GPU |
| **U4-STEP-CATALOG-RUN** | (depends P2) Run `CADReverseCorpusCatalogEngine`/`cad-feature-template-extract.mjs` over the 55,879 .step corpus (built, never run; 33% coverage). Accept: `CAD_COVERAGE_MATRIX.json` →~100%; per-customer-folder shards. | M | OLLAMA-GRUNT (catalog) + CLAUDE |
| **U5-HEAP-STREAMING-IO** | Set generous node heaps (16–32GB) for delta corpus/ledger scripts (drop old-box caps); migrate the 122MB+ ledger writers to streaming Buffer-walk (`graph-io.mjs readGraphStreaming/writeGraphStreamingAtomic`). Accept: 122MB ledger loads in-memory; a >512MB ledger writes without the `0x1fffffe8` string-cap throw. | S–M | CLAUDE-BUILD |
| **U-CORPUS-PERSIST-REVALIDATE** | Persist the gitignored 122MB roundtrip ledger + 110k-file vendor corpus; re-validate round-trip vs ORIGINAL vendor prints (not synthetic-vs-synthetic, R12). Accept: round-trip score is vs original prints, not self. | M | CLAUDE-BUILD |
| **U6-PARALLEL-EMITTERS** | Fan out per-platform emitters (`cad-live-regen-emit.mjs`) + per-archetype generators concurrently (32T/96GB); train the 5 AI models concurrently on GPU. Accept: one regen pass covers all archetypes×platforms; remaining 9-of-12 CAM live-regen emitters added. | M | CLAUDE-BUILD + GPU |
| **U-BULK-WEAKLABEL-REPARSE** | Re-label the bulk-extracted weak labels (size+name proxy) via real STEP geometry parse. Accept: labels derived from parsed geom, not filename. | M | OLLAMA-GRUNT (catalog) + CLAUDE |

### P6 · FEATURE RECOGNITION ⭐ (`CAD-FEATURE-RECOGNITION-MS0`, NEW milestone — stage b)

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-CADFR-MILESTONE-CREATE** | Create `CAD-FEATURE-RECOGNITION-MS0.json` envelope (the new milestone has no envelope). NOTE: shared-tree `CADFeatureRecognitionEngine.ts` is the U-EFF25 stub AND absent on slot-delta — this is net-new, not a restore. Accept: envelope enrolled with U-CADFR-* units. | XS | CLAUDE-BUILD |
| **U-CADFR-PRIMITIVE-DECOMPOSE** | Classify each BREP face (planar/cylindrical/conical/spherical/toroidal/B-spline) via surface-type + RANSAC (`spatial_ransac_fit`). Accept: known STEP → correct per-face primitive labels; ≥3 failure + ≥2 adversarial. | M | CLAUDE-BUILD |
| **U-CADFR-FEATURE-INFER** | Group faces → authoring features (hole=cyl+endcap; pocket=floor+walls; boss=profile+depth; fillet=const-radius tangent; chamfer=ruled bevel; revolve=surface-of-revolution/common-axis). Accept: known recipe recovered. | L | CLAUDE-BUILD |
| **U-CADFR-SKETCH-EXTRACT** | Recover generating sketch profile + extrude axis/depth per feature (parametric recipe, not mesh). Accept: round-trip — recipe replays to matching body. | L | CLAUDE-BUILD |
| **U-CADFR-TREE-EMIT** | Emit ordered replayable authoring-feature tree consumable by build orchestrator + `cam_strategy_recommend`. Accept: feed loop-generated STEP w/ KNOWN recipe (revolve+radial-cut+chamfer) → recovers EXACT recipe (R9 round-trip invariant); real JM `.step` → tree replays to body within accuracy gate. | L | CLAUDE-BUILD |

> **HARD BLOCKER (this phase):** STEP has BREP topology but NO construction history — order of ops is ambiguous (multiple valid trees → same solid); blends/intersecting/lofted-swept B-spline faces have no closed-form generating profile. This is the single hardest blocker in the whole roadmap.

### P7 · SMOOTH SOLID GEN (stage c)

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-CADGEN-LOFT-EMIT** | Drive Fusion `/loft` with guide rails + tangency `directionVector` + explicit transition radius (EJOT fix generalized). Accept: EJOT P30247750-1D2 built live via loft+guide-rail; probe confirms middle R = spec; surface-probe reports B-spline faces (not planar facets). | M | CLAUDE-BUILD |
| **U-CADGEN-SWEEP-EMIT** | `/sweep` a profile along a 3-D path (trilobe/electrode forms). Accept: live sweep produces swept body; L3-proven. | M | CLAUDE-BUILD |
| **U-CADGEN-SPLINE-PROFILE** | Replace polyline sketch profiles with fitted B-spline/NURBS sketches. Accept: cross-sections smooth before solid op; surface-type probe confirms. | M | CLAUDE-BUILD |
| **U-CADGEN-INTENT-TO-OPSEQ** | Map recognized/print feature set → ORDERED sketch→loft/extrude/fillet op sequence (consumes P6 tree; planner not executor). Accept: feature set → valid ordered op-seq that builds the part. | L | CLAUDE-BUILD |
| **U-L3-PROVE-COMMANDS** | L3-prove each new authoring command through the bridge (loft/sweep/spline among 325 unproven; ladder at 2/327). Accept: capability-ladder L3 count climbs 2→~25; each command L1(param)+L2(bind)+L3(live). | M (ongoing) | CLAUDE-BUILD |

### P8 · MEASURE & CORRECT (stages d + e)

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-CADCMP-SURFACE-DEVIATION** | Hausdorff/max-deviation metric between generated faces and ground-truth (mesh-sampled) — measures smooth-surface quality. Accept: 2 known-different B-spline lofts score deviation>tol; identical ~0. | M | CLAUDE-BUILD |
| **U-CADCMP-TRUTH-SOURCE** | Bind comparison to ORIGINAL vendor-print dims (xray OCR ground-truth), not re-derived geom. Accept: die-loop 4/5→5/5 re-proven vs xray OCR dims, not own envelope. **Depends: P5-U1 OCR.** | S | CLAUDE-BUILD |
| **U-CADCORR-FEATURE-EXPAND** | Add one correction mechanic per newly-proven authoring feature (loft/sweep/pattern/shell/rib/draft/thread), each gated behind its P7 L3 proof, round-tripped live. Accept: part missing a lofted transition → corrected live → re-diff +1 feature `verified:true`; each mechanic happy+≥3 failure+≥2 adversarial. | M (per mechanic) | CLAUDE-BUILD |

### P9 · CLOSE THE LEARN LOOP (stage f) + deep model layer

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-CADLEARN-FIX-LEDGER-TO-TRAINER** | Wire `cad-fix-training-ledger.mjs FIX_LEDGER` → training-corpus features → LoRA/k-NN retrain trigger (verified: ledger has ZERO retrain consumer today). Accept: N live cycles → ledger grows → retrain runs → NEXT pass needs FEWER corrections on same part class (R9: test fails if quality doesn't improve). | M | CLAUDE-BUILD |
| **U-CADLEARN-OUTCOME-PUBLISH** | Every correction-cycle publishes `xproc_outcome_publish {slot:'delta',domain:'cad'}` + `xproc_calibration_monitor_record` → india's drift-canary fires retrain (cad CLAUDE.md india contract, currently unfulfilled). Accept: outcomes land in india's consumer; drift-canary triggers retrain candidacy. | M | CLAUDE-BUILD |
| **U-NN-01..15** | Deep CAD neural backbones: PointCloudEncoder(PointNet++/DGCNN), MeshCNN, ImplicitNeuralField(DeepSDF), BRepGNN(UV-Net), MultiViewCNN, SketchConstraintGNN, SelfSupervisedPretext, ContrastivePretraining, BlueprintVLM, CADEmbeddingRetrieval(FAISS/HNSW), NeuralUncertainty, CADExplainability, ONNXInferenceRuntime(TensorRT/INT8), NeuralSafetyGate, MoEDistillation. **Spine of clear-3.** Accept: per-engine real-data train + inference; round-tripped through dispatcher. **Depends: P5 corpus + GPU.** | L ×15 (multi-session, GPU-bound) | CLAUDE-BUILD + GPU |
| **U-ML-02..15** | MLOps layer: GeometricAugmentation, TenantIsolatedSplit, DistributedTrainingOrchestrator(Ray/FSDP), ExperimentTracking(MLflow), HyperparameterSearch(Optuna), ConformalPredictionCalibration, AdversarialRobustnessSuite, BiasAudit, ActiveLearningQuery(BALD), ContinualLearningBuffer(EWC++), Model/DataCard, ReproducibilityContract, FoundationModelAdaptation(DeepCAD/SketchGraph), InteractiveInferenceSLO. Accept: training infra serves U-NN cluster. **Depends: U-NN.** | M–L ×14 | CLAUDE-BUILD + GPU |
| **U-CADC-NN03 / U-CCCO03 / U-CCCO04** | HyperCADSIntentNN FT-aware head + 2 CAD-COMPLETE tail units (depends LP01-04 shipped). Accept: closed-loop NN cluster tail wired+tested. | S ×3 | CLAUDE-BUILD |

### P10 · SCALE TO COMPLEX (stage g — the final clear)

| Unit | Build / Wire / Test acceptance | Size | Route |
|---|---|---|---|
| **U-CADCX-MULTIFEATURE-TREE** | Build+correct an ORDERED N-feature tree (not one body). Accept: 10–50-feature part builds + corrects per-feature. | L | CLAUDE-BUILD |
| **U-CADCX-DATUM-REF** | Features referencing prior faces/edges/datums (not just origin planes) — persistent face/edge IDs across rebuilds (topological-naming problem). Accept: sketch-on-prior-face survives rebuild. | L | CLAUDE-BUILD |
| **U-CADCX-PATTERN-MIRROR** | Rectangular/circular pattern + mirror as first-class ops. Accept: pattern/mirror generate+correct live. | M | CLAUDE-BUILD |
| **U-CADCX-ASSEMBLY-MATE** | Multi-body + joints/mates (finishes parked revolute proof). Accept: 2-body assembly w/ revolute joint live. | M | CLAUDE-BUILD |
| **U-CADCX-FAILURE-ISOLATION** | Mid-tree feature failure isolated + corrected WITHOUT rebuilding whole tree — wire `CADTransactionEngine` into the live multi-feature loop (exists, not wired). Accept: bad feature rolled back, 30 good features intact. | L | CLAUDE-BUILD |
| **U-CADCX-FINAL-COMPLEX-PROOF** | Generate a real JM multi-feature die (bore + stepped Ø + radial oil holes + chamfers + lettering pocket) live → diff → auto-correct each missing feature → passes surface-deviation + dimensional gate vs original print; tree replayable. **THE clear-3 acceptance.** Accept: full part round-trips closed-loop, fewer corrections than first attempt. | L | CLAUDE-BUILD |

### DEFERRED / CROSS-GALAXY / OPERATOR-GATED (tracked, not in active delta queue)

| Unit | Status / why deferred | Route |
|---|---|---|
| **U-AI-01..15** (agent reliability — Fallback/WorldModel/UoM/MultiTurnIntent/Voice/HierTaskPlanner/MultiStepPreview/2PC/CircuitBreaker/SpanTrace/Consensus/RiskTier/DFMPhysicsGate/PerCustomerOmega/FederatedLearning) | **BLOCKED on U-RECONCILE-UAI (P1)** — build ONLY the truly-`not_started` subset after reconcile; do NOT rebuild shipped engines. M ×(remaining) | CLAUDE-BUILD |
| **U-INT-01..20** (platform hardening + U-INT-10 STEP-AP238, U-INT-11 JT/USD, U-INT-19 LegacyDWG/ODA, U-INT-20 CAD→DNC manufacturing-output) | Enterprise hardening; sequence after P10 core unless operator pulls U-INT-20 manufacturing-output forward. M ×20 | CLAUDE-BUILD |
| **U-GAP-CAD-JMDIE-REVERSE-ENG / U-GAP-CAD-COMPLETE-GEN / U-GAP-P2P-*** | Delta-subset of FEATURE-GAP; U-GAP-CAD-COMPLETE-GEN verify coverage-map first (likely staleness). | CLAUDE-BUILD |
| **CAD-GROUND-TRUTH durable OCR run (TDP06)** | Overlaps P5-U1 runner — fold into it. | OLLAMA-GRUNT |
| **Sketch-template-library** (`specs/cad-sketch-templates/`) | Proposed; build after P6 supplies feature vocabulary. M | CLAUDE-BUILD |
| **GIT-TREE-REMEDIATION-MS0** (42GB→4GB rewrite, two-trunk reconcile, >100MB blob purge, GitHub push unblock) | **XL, irreversible, operator-decision-gated → `/brainstorm` crossroad.** Do NOT auto-execute in a /loop. | ULTRACODE-PLAN → operator |
| **Vendor bulk-download** (McMaster .p12, ABC 9/100 shards) | Externally blocked, not a build task. | operator-gated |
| **U-VALIDATION-50-CORPUS** | Needs physical OPEN MIND hyperCAD-S workstation. | operator-gated |
| **U-GAP-CAD-LATHE-LIVE-TOOLING** | Likely whiskey/lathe-owned, not delta. | cross-galaxy |
| **U-WIRE-BACKLOG-{MILL,LATHE,WIRE,CAM,ERP,ACADEMY,DATABASE} / U-GAP-{CAM,ERP,DB,ACADEMY}-*** | NOT delta-owned (foxtrot/whiskey/mike/kilo/echo/hotel/lima/juliett). Excluded. | cross-galaxy |
| **U7-GPU-GEOMETRY** (tessellation/mesh/swept-volume offload) | Defer; profile CPU bottleneck FIRST. **Red-line: collision/clearance margins need deterministic CPU-parity gate before any GPU port feeds S(x).** | CLAUDE-BUILD (validate-first) |

---

## 3 · CLOSED-LOOP COMPLEX-CAD CRITICAL PATH

The corrected ground truth (verified on-disk, not transcripts): **stages (a)→(e) already run LIVE for a ~4-feature vocabulary** (`cad-fusion-correction-loop-live.mjs`, LIVE-PROVEN :18365). The unfinished work is BREADTH, FIDELITY, the missing RECOGNITION front-end, and the unwired RETRAIN back-end.

```
P1·U-MERGE-SLOT-DELTA              [409 commits → trunk; pure git debt; unblocks all]
        │
P4·U-CADX-BRIDGE-SUPERVISOR        [stable live :18632; fix /extrude-cut+/combine]   ── stage (a) ✅ exists, harden
        │
P6·CAD-FEATURE-RECOGNITION-MS0 ◀── ⭐ THE SINGLE HARDEST BLOCKER ──────────────────── stage (b) ❌ net-new
   primitive-decompose → feature-infer → sketch-extract → tree-emit
        │   (STEP has NO construction history → order is INFERRED, not read;
        │    blends/loft/sweep B-spline faces have no closed-form profile;
        │    multiple valid trees → same solid = ambiguity)
        │
P7·U-CADGEN-LOFT/SWEEP/SPLINE-EMIT + INTENT-TO-OPSEQ + L3-prove ───────────────────── stage (c) ❌ 0% smooth today (faceted prism reject)
        │
P8·U-CADCMP-SURFACE-DEVIATION + TRUTH-SOURCE-BIND ─────────────────────────────────── stage (d) ⚠ feature-set only; no surface metric; self-validating
        │
P8·U-CADCORR-FEATURE-EXPAND  (one mechanic per proven feature) ───────────────────── stage (e) ✅ 4 mechanics live, expand
        │
P9·U-CADLEARN-FIX-LEDGER-TO-TRAINER + OUTCOME-PUBLISH(india) ──────────────────────── stage (f) ❌ ledger accumulates, NO retrain consumer wired (verified)
        │   (loop "closes" = NEXT pass needs FEWER corrections — R9 measured)
        │
P10·U-CADCX-* multi-feature tree / datum-ref / pattern / assembly / failure-isolation ─ stage (g) ❌ single-body only today
        │
P10·U-CADCX-FINAL-COMPLEX-PROOF   [real JM die, 10–50 features, closed-loop] ───────── CLEAR #3
```

**THE single hardest blocker:** **P6 · `CAD-FEATURE-RECOGNITION-MS0` (BREP→authoring-feature-tree).** Not "run the live round-trip" (it already runs). Without a recognizer, complex generation AND reverse-engineering are both permanently stuck at single-Body templates — STEP carries topology but no construction history, so sketch→extrude→fillet must be *inferred from faces/edges*, and the order of operations is mathematically ambiguous (many valid trees produce one solid; lofted/swept B-spline faces have no closed-form generating profile). Every downstream stage (c→g) is starved of the replayable feature tree until P6 lands. Secondary recurring gates: (i) Fusion must be live on the operator box — no headless CI proof; (ii) the full-corpus OCR run (P5-U1) must complete durably or stages (d)+(f) starve on weak labels.

---

## 4 · BLACKWELL UPGRADES (ROI-ordered — utilization gap, not capacity)

Box: RTX PRO 6000 Blackwell **96GB VRAM** · 9950X3D 32T · 127GB RAM · NVMe. GPU torch stack LIVE (`H:/Tools/python-gpu/Scripts/python.exe`, Py3.13, torch 2.11+cu128). **GPU ~5% idle; offload 5.8% vs 30% target. Every "DEFERRED/bounded" item was gated by the OLD 16GB ceiling — Blackwell dissolves it.**

| Rank | Upgrade | Current → Blackwell target | Effort | Gain |
|---|---|---|---|---|
| **1** | **U3-A1 dead labeler** (already committed, finish via Unit 1 ReferenceError fix) | dead `7b` no-op → host-aware `gpt-oss:120b`/`32b` | XS | ~95% Claude-tokens/part, recurring across 105K-file corpus |
| **2** | **Durable concurrent multi-VLM OCR runner (U1)** — *single highest-leverage* | serial 1-model reload, 39-file foreground → 3–5 VLMs resident+concurrent (~28GB), ctx 3072→8192, 7,794-print durable resumable batch | M | 3–5×/print × corpus-scale; **the producer the whole closed loop is starved on** |
| **3** | **GPU re-embed / execute U-RAG-6 (U2)** | nomic 768-d CPU ONNX, deferred ONLY by 16GB ceiling (now gone) → GPU bulk re-embed full corpus, optional 768→1024 nv-embedqa (eval-gated) | M–H | 10–50× faster re-embed; unblocks RAG (23 chunks) + LoRA (110 pairs) corpus-scaling |
| **4** | **Frontier local LLM synthesis → gpt-oss:120b (U3)** | Claude synthesis died on rate-limit → `gpt-oss:120b` (65GB) resident, 120b+32b co-resident in 96GB | L–M | ~85% synthesis savings, dodges rate-limit wall |
| **5** | **High-concurrency STEP/CAD corpus catalog (U4)** | serial; 33% coverage; bg stdout loss → 32T worker-pool durable task, NVMe seek-index, 33%→~100% | M | ~32× parallelism; real corpus vs synthetic |
| **6** | **Generous heaps + streaming I/O (U5)** | old-box `--max-old-space-size` caps; ledgers nearing 512MB string-cap → 16–32GB heaps + `graph-io.mjs` streaming Buffer-walk | L | removes OOM/`0x1fffffe8` failure class |
| **7** | **Parallel emitters + concurrent model train (U6)** | 3/12 platforms, serial emit, serial 5-model train → fan out per-platform/archetype + GPU concurrent train | M | N× regen passes; train wall-clock cut |
| **8** | **GPU geometry/mesh (U7)** | CPU TS kernel → batch tessellation/collision GPU offload | **H, validate-first** | defer until U1–U6 land + CPU-bottleneck profile + **collision-margin CPU-parity gate before S(x)** |

**Single highest-leverage Blackwell action: #2 (durable concurrent-VLM OCR runner)** — 96GB VRAM is exactly what makes a concurrent multi-VLM ensemble possible for the first time, and it's the producer the closed-loop learning spine (clear-3) is starved on. The keystone **P2·U-DURABLE-BATCH-RUNNER** is what #2, #3, #5 all reuse.

---

## 5 · OLLAMA-GRUNT ROUTING TABLE (red-lines preserved)

**Doctrine:** strongest model for the grunt; Claude for judgment/wiring/safety/synthesis; ultracode for orchestration. **Default-DENY on geometry & safety. An Ollama value = an inline-hardcoded constant: pre-gate draft only, never clears a gate** (`stop_on_inlined_constants` + `units-guard` + delta soul-refuses enforce this).

| Task-type | Route | Model / surface | Guardrail (red-line) |
|---|---|---|---|
| Graph "where/how wires X in cad galaxy" | OLLAMA | `qwen2.5-coder:32b` via `ollama-prism-bridge.mjs --trace` | read-only; Claude verifies wiring claim before acting |
| Read CAD wiki/memory ≥500 lines | OLLAMA | `qwen2.5-coder:32b` via `/route-to-obsidian`→`ask-ollama.mjs summarize` | summary reference-only — NEVER a geometry/units source |
| Code-explain delta `.mjs`/`.ts` | OLLAMA | `qwen2.5-coder:32b` via `/ollama-explain` | none (no correctness stake) |
| Single-file <500-line symbol lookup | CLAUDE (Grep/Read) | n/a | already cheap; no Ollama overhead |
| Per-transcript / per-digest context-regain | OLLAMA | `gpt-oss:120b` via `ask-ollama.mjs summarize`, **≤3 concurrency** | Claude fuses; dodges the rate-limit that killed `wf_66199e81-28f` |
| Galaxy roll-up / large multi-doc fusion | OLLAMA | `gpt-oss:120b` (`search_synthesis`→`best`) | Claude owns final synthesis + contradiction (R7) |
| Part ARCHETYPE label | OLLAMA | `qwen2.5-coder:32b` via `resolveSynthesisModel()` | **descriptive label ONLY — does NOT select geometry/params** |
| Build/test log diff-summary + error-triage | OLLAMA | `gpt-oss:20b` via `ask-ollama.mjs triage` (RTK pre-strips) | pure classify, no stake |
| Doc-reflection (CLAUDE.md/MEMORY/handoff drafts) | OLLAMA | `qwen2.5-coder:32b` via `ask-ollama.mjs summarize` | Claude verifies done/left/verified honesty (R12) |
| Commit-message draft from diff | OLLAMA | `gpt-oss:20b` via `ask-ollama.mjs explain <diff>` | Claude scans for over-claim before commit (R12) |
| Wiki/tribal feature-NODE gloss (115+ nodes) | OLLAMA | `qwen2.5-coder:32b` (clone `summarize-all-scripts-via-ollama.mjs`) | Claude keeps cross-refs; ≥70% Ollama (WIKI PROTOCOL) |
| Tribal-tip extraction from session text | OLLAMA | `qwen2.5-coder:32b` via `/ollama-extract` | Claude reviews **safety-relevant** tips before trusted |
| Blueprint dimension extraction (1st pass) | OLLAMA | `qwen3-vl:8b-instruct` via `ollama-vision-extract-lib.mjs` | **string to verify** — re-parsed by hardened regex (leading-dot/`+`/truncation) + `units-guard` |
| OCR consensus (ambiguous/high-stakes) | OLLAMA | ensemble `qwen3-vl:8b`+`qwen2.5vl:7b`+`llama3.2-vision:11b`, ≥2-agree | single-of-N = hallucination, discarded; conf ≥0.85 fail-closed |
| Quick image triage (is-this-a-drawing?) | OLLAMA | `moondream:1.8b` | routing only, no extraction |
| Print-vs-CAD compare NARRATION (post-diff) | OLLAMA | `qwen2.5-coder:32b` via `ask-ollama.mjs explain <compare.json>` | **Claude keeps PASS/FAIL gate + "is this radius safety-relevant?"** — narration never decides |
| **Geometry emit** (sketch/extrude/loft/EJOT radius/offset) | **CLAUDE** | — | parametric generation is judgment; faceted ≠ real solid |
| **Units inch/mm disambiguation** | **DETERMINISTIC** | `units-guard.mjs` (THROWS on ambiguity) | 25.4× scale error — NEVER "infer with LLM" |
| **ISO 286 fit / tolerance values** | **DETERMINISTIC** | `ToleranceDB.json` via `prism_data:database_search` | table lookup; LLM hallucinates `0.018` for `0.025` |
| **GD&T / PMI tolerance values as ground truth** | **CLAUDE** | — | refuse dropping PMI; equally refuse fabricating it |
| **BREP topology validation / geometric mutation** | **DETERMINISTIC** | `CADKernelEngine` / `BRepTessellatorEngine` | manifold-ness / Euler-Poincaré, never narrated |
| **Collision/clearance margins → S(x)** | **CLAUDE + code** | `CollisionDetectionEngine` | where wrong geom constant = machine crash; delta S(x)≥0.98 |
| **Feature-recognition DECISION selecting CAM strategy** | **CLAUDE** | — | auto-committing an Ollama label = the silent-fallback the soul refuses |
| **Dispatcher wiring / envelope enrollment** | **CLAUDE** | — | R15 build-it-whole; orphan-wiring is the recurring delta drift |

**Co-residency note (Blackwell):** `gpt-oss:120b` (65GB) + `qwen2.5-coder:32b` (20GB) fit together in 96GB → vision-OCR ensemble + 120b summarization run concurrently GPU-resident with generous `keep_alive`. That is the concrete "utilization not capacity" win.

---

## 6 · THE FIRST 3 UNITS THIS SESSION

> **Unit 0 (A1) is DONE** — committed `575c19a709` (U-A1-ARCHETYPE-LABELER-MODEL-RESOLVE): model preference `["gpt-oss:120b","qwen2.5-coder:32b","gpt-oss:20b"]` + host-aware `pickStrongestModel()` + live `/api/tags` probe. BUT it left a crash on the success path → Unit 1.

### Unit 1 — `U-A1B-LABELER-OLLAMA-MODEL-REF-FIX` (finishes A1) · XS · CLAUDE-BUILD
**The bug (verified live this session):** `scripts/cad-ollama-archetype-label.mjs:138` references `OLLAMA_MODEL`, which **does not exist** (the var was renamed; only `FALLBACK_MODEL` (line 18) and the local resolved `model` exist). Every *successful* Ollama classification hits `ReferenceError: OLLAMA_MODEL is not defined` → caught nowhere on that branch → corpus silently degrades to rule-based. The A1 fix resolved the model but never reaches a clean success path.
- **File:** `/h/prism-slot-delta/scripts/cad-ollama-archetype-label.mjs:138`
- **Edit:** `source: "ollama:" + OLLAMA_MODEL` → `source: "ollama:" + model`
- **Acceptance:**
  ```bash
  cd /h/prism-slot-delta
  rtk node scripts/cad-ollama-archetype-label.mjs --force   # expect source:"ollama:gpt-oss:120b" (or :32b), NO ReferenceError
  node scripts/ollama-offload-dashboard.mjs --json          # offloaded increments
  ```
- **Commit:** `[delta] [DELTA-OLLAMA-EFFICIENCY-MS0]/U-A1B-LABELER-OLLAMA-MODEL-REF-FIX: fix ReferenceError on Ollama success path (OLLAMA_MODEL undefined → resolved model)`

### Unit 2 — `U-DRAWMAX-JSON-REPAIR` · XS · CLAUDE-BUILD
**Why now:** `CAD-DRAW-MAX-MS1.json` is malformed (`Expected ',' or '}'` line 91) → unit statuses unreadable → any P1 reconcile that touches it is blind. Independent of Unit 1; do in the same session.
- **File:** `/h/prism-slot-delta/mcp-server/data/milestones/CAD-DRAW-MAX-MS1.json`
- **Steps:** `node -e "JSON.parse(require('fs').readFileSync('mcp-server/data/milestones/CAD-DRAW-MAX-MS1.json','utf8'))"` → read the throw → fix the comma/brace at line ~91 → re-validate exit 0.
- **Acceptance:** JSON.parse exits 0; unit-status list renders.
- **Commit:** `[delta] [CAD-DRAW-MAX-MS1]/U-DRAWMAX-JSON-REPAIR: repair malformed envelope JSON (line 91) so unit status is readable`

### Unit 3 — `U-RECONCILE-UAI-ENGINE-STATUS` · S · ULTRACODE-PLAN (Ollama search) + CLAUDE verdict
**Why now (blocks ALL U-AI builds):** envelope marks U-AI-01..15 `not_started`, but the briefing claims CADWorldModelEngine/etc. shipped via direct commit. Building before reconcile risks **rebuilding shipped engines** — the canonical delta drift. Resolve via the cheap Ollama search surface (red-line: Claude renders the final verdict).
- **Surface:** `node scripts/ollama-prism-bridge.mjs "does engine <Name> exist + which dispatcher wires it" --trace` (`qwen2.5-coder:32b`, ~0 Claude tokens) per U-AI-0N candidate; then Claude confirms with `grep`/dispatcher round-trip before flipping.
- **Files:** `/h/prism-slot-delta/mcp-server/data/milestones/CAD-COMPLETE-MS0.json` + `mcp-server/src/engines/cad/*.ts`
- **Acceptance:** a per-unit verdict table (EXISTS+WIRED→flip `complete`; ABSENT→keep `not_started`); ZERO shipped engine queued for rebuild.
- **Commit:** `[delta] [CAD-COMPLETE-MS0]/U-RECONCILE-UAI-ENGINE-STATUS: reconcile U-AI-01..15 envelope status vs on-disk engines (no rebuild of shipped)`

**Session ordering:** Unit 1 + Unit 2 are independent XS — run in parallel. Unit 3 follows (it gates the U-AI build queue). After these three, the next /loop tranche is **P1·U-MERGE-SLOT-DELTA** (409-commit merge) → **P2·U-DURABLE-BATCH-RUNNER** (the keystone) → **P4 bridge supervisor**, then the P6 recognition crux.

**Load-bearing files (all on `H:/prism-slot-delta`, UNMERGED — 409 ahead):** `scripts/cad-ollama-archetype-label.mjs:138` (Unit 1 bug), `scripts/cad-fusion-correction-loop-live.mjs` (live closed loop), `scripts/lib/cad-fusion-correction-loop.mjs` (offline orchestrator), `scripts/lib/cad-fusion-capability-ladder.mjs` (2/327 L3), `scripts/lib/cad-fix-training-ledger.mjs` (learn signal — NO retrain consumer wired), `scripts/lib/cad-fusion-{geom,spec,xray-print}-diff.mjs`, `scripts/lib/ollama-vision-extract-lib.mjs` (`qwen3-vl:8b-instruct`), `scripts/lib/graph-io.mjs` (streaming I/O), `mcp-server/data/milestones/{CAD-COMPLETE-MS0,FEATURE-GAP-AUDIT-MS0,CAD-FUSION-LIVE-MS0-ACBRIDGE,CAD-GROUND-TRUTH-MS0,CAD-TRAINING-EXTRACT-MS0,CAD-DRAW-MAX-MS1}.json`. `CADFeatureRecognitionEngine.ts` is ABSENT on slot-delta (P6 is net-new, not a stub-restore).