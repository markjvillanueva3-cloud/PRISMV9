# FLEET PHASE-4 DISPATCH BOARD — routed builds per owning slot, dependency-ordered

> **Authored by zulu (master orchestrator) 2026-06-13.** This is the ROUTING artifact: each galaxy's
> highest-ROI Phase-4 build (sourced from its deep-research anchor in the galaxy brain), mapped to its
> owning slot, sequenced into dependency waves so no slot builds a consumer atop an unproven dependency (R13).
> **The orchestrator routes; the owning slot builds.** zulu does NOT implement these (soul: refuses
> committing-domain-work). Each row's recipe lives in the cited `reference_<galaxy>_phase3_*` Obsidian anchor.
>
> Companions: `FLEET-OPTIMAL-SETUP-2026-06-13.md` (per-slot config) · `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md`
> (Phase-1 mining + Phase-2 research). **Status: Phase-1 mining DURABLE (11 reaper-immune tasks, converging
> nightly); Phase-2 + Phase-3 anchors COMPLETE for all 14 named galaxies (2026-06-13).** Phase-4 = the builds below.

## Dependency waves (R13 — build foundations before consumers)

```
WAVE 1 (foundations — no cross-galaxy blocker, start now)
  romeo  · papa  · oscar  · echo  · delta  · xray  · hotel  · india
        │        │       │       │       └──────────┐
WAVE 2 (gated on a Wave-1 foundation)               │
  mill(←oscar) · lathe(←oscar) · cam(←delta,echo) · discovery(←india) · quoting(←hotel)
        └────────────────────────────────────────────┐
WAVE 3 (consumes every domain galaxy's depth)         │
  academy(←all)
```

## Wave 1 — foundations (dispatch immediately, parallel-safe)

| Slot | Galaxy | Phase-4 build (highest-ROI) | Source anchor | Why foundation |
|------|--------|------------------------------|---------------|----------------|
| **romeo** | wiring | ts-morph **shape+reachability** pass (4-shape classifier → full reachability); replace name-heuristic in `audit-unwired-engines.mjs`; report new truly-orphan count | `reference_wiring_phase3_shape_reachability` | Makes the unwired-audit authoritative → unblocks tango + victor |
| **papa** | backend-helper | **effect-classifier** (ts-morph pure/IO/spawn) + **large-file-IO playbook engine** (V8 512MiB string-cap / heap-reexec / shard recipes); measure incremental-build deltas | `reference_backend-helper_phase3_pgo_determinism` | Infra every galaxy queries before large-file IO |
| **oscar** | speed-feed | **dual-coefficient mechanistic force model** (Ktc/Kte edge+shear separation, back-compat single-kc fallback) FIRST, then process-damping SLD, then MC probabilistic `prism_safety` margin | `reference_speed-feed_phase3_mechanistic_probabilistic_sld` | Force model is the physics foundation mill + lathe attach to |
| **echo** | post-processor | **kinematics-model schema + IK solver + JM 5-axis machine library**; validate emitted RTCP G-code vs back-plot | `reference_post-processor_phase3_kinematic_solver_stepnc` | Shared machine model that cam consumes |
| **delta** | cad | **unified-graph schema** (TS interface) + **AP242ed2 PMI extractor** + india GNN consumer; validate on `resources/CAD FILES` (blisk/impeller) | `reference_cad_phase3_semantic_unified_graph` | Geometry+tolerance graph that cam consumes |
| **xray** | blueprint-vision | per-field **error-profile table** (gold set) + **weighted-consensus VLM fuser** + **FCF schema recognizer**; measure F1 lift vs equal-vote on the 7,794-print corpus | `reference_blueprint-vision_phase3_weighted_ensemble_fcf` | Independent — has the JM gold corpus now |
| **hotel** | business | **seed JM customers** (standing open thread) + variance→journal-entry matrix + 13-week cash-flow off WIP; wire QB API + EDI X12 810/830/855 | `reference_business_phase3_cost_to_cash` | Provides ERP actuals that quoting calibrates against |
| **india** | ai-training | swap encoder to **H2GCN** + **HNSW** retrieval + **focal-Brier calibrator**; retrain on grown ref-pool (heap-bumped); **multi-seed** AUROC vs 0.835 (promote only if multi-seed mean ≥0.78) | `reference_ai-training_phase3_h2gcn_qlora_recipe` | Embeddings/GNN that discovery + cad consume |

## Wave 2 — gated on a Wave-1 foundation

| Slot | Galaxy | Phase-4 build | Source anchor | Gated on |
|------|--------|---------------|---------------|----------|
| **foxtrot** | mill | analytical **SLD (Kt/Kr from Kienzle)** + **FRF/modal store** + **RCSA tool-tip predictor**; validate vs a real JM VMC tap-test | `reference_mill_phase3_sld_taptest` | ← oscar force model (Kt/Kr) |
| **whiskey** | lathe | **boring-bar deflection comp** + **turning SLD from tap-test FRF** + Oxley force cross-check | `reference_lathe_phase3_deflection_millturn_predictive` | ← oscar SFC physics |
| **kilo** | cam | **C-space feasible-region** + **smooth-tool-axis objective**; validate on a real 5-axis part (impeller/blisk) with holder-collision ground truth | `reference_cam_phase3_global_gougefree_5axis` | ← delta geometry graph + echo machine model |
| **tango** | discovery | **unified index** (BM25+dense+MinHash) + **semantic-dup layer** on DuplicationGuard; measure dup-recall vs exact-name + hybrid nDCG | `reference_discovery_phase3_unified_hybrid_index` | ← india embeddings |
| **charlie** | quoting | fit **hierarchical regression** on JM jobs + **MC margin simulator** + **win-rate calibration**; validate posterior-predictive vs held-out actuals | `reference_quoting_phase3_probabilistic_margin` | ← hotel ERP actuals |

## Wave 3 — consumes every domain galaxy's depth

| Slot | Galaxy | Phase-4 build | Source anchor | Gated on |
|------|--------|---------------|---------------|----------|
| **lima** | academy | **BKT+DKT+IRT mastery estimator** over the skill graph + adaptive scheduler + auto-assessment generator (grounded in the domain anchors); validate mastery-prediction AUC | `reference_academy_phase3_knowledge_tracing` | ← all domain galaxies' knowledge depth |

## Universal build contract (every row — R15)
1. **WIRE** to every natural dispatcher/consumer in the same commit (no orphans). Cutting/physics slots wire
   to `prism_calc` + `prism_safety`.
2. **TEST** real reference-value / algebraic-invariant tests — happy + ≥3 failure + ≥2 adversarial, round-tripped
   THROUGH the dispatcher; cutting slots exercise ≥3 spanning ISO groups (P/M/K + S for Ti/Ni).
3. **VALIDATE** on LIVE data with numbers (the cited corpus: `resources/CAD FILES`, JM VMC tap-tests, the
   7,794-print gold set, JM historical jobs) — never "looks fine".
4. **Cutting/safety slots** (oscar, foxtrot, whiskey, kilo, echo): mandatory `physics-review-agent` in the
   per-file scrutiny pair; **never inline constants** (import `src/physics/constants.ts`); UNITS-FIRST;
   safety→derate decision stays on Claude + `prism_safety` (never a local model).
5. **Honesty (R12):** report a metric (MRR gain, AUROC, F1) only AFTER validation confirms it; the anchors'
   target numbers are hypotheses, not results. Multi-seed before any AUROC claim (india).

## Honest notes (R12)
- **This is a routing board, not committed builds.** zulu does not implement domain code. Each owning slot picks
  up its row in its own `slot/<nato>` worktree, reads the cited anchor for the full recipe, and builds to the
  universal contract above. Dispatch via `/checkin-<slot>` in the owning terminal.
- **Waves are dependency guidance, not a hard lock** — a slot CAN start a Wave-2 build with a stub of its
  Wave-1 dependency, but the *validated* version must sit on the proven foundation (R13). Prefer Wave-1 first.
- **Phase-1 mining still converging** (cam ~182 / mill ~167 remaining; nightly tasks own it). Phase-4 builds do
  not block on full mining convergence — the anchors already carry the external-research depth.

_Authored 2026-06-13 slot:zulu (master orchestrator). Recipes: the 14 `reference_<galaxy>_phase3_*_2026_06_13`
Obsidian anchors. Companion to FLEET-OPTIMAL-SETUP + FLEET-KNOWLEDGE-MAX-ROADMAP._
