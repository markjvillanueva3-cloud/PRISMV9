---
name: reference-echo-post-processor-domain-map-2026-05-27
description: Authoritative post-processor domain surface map for echo slot — engines (340+), dispatchers (12 with 5K+ actions), scripts/lib emit substrate (iter22-52), algorithms, databases, wiki/tribal corpus, JM DIE flagship .cps files, /system-viz roosts, and existing echo memories. Built by 3 parallel Explore agents per operator directive 2026-05-27 ("follow kilo's footsteps and add to memory anything post processor related").
type: reference
slot: echo
source: prism-memory
synced: 2026-06-09T14:54:09.095Z
aliases: reference_echo_post_processor_domain_map_2026_05_27
---


# Echo post-processor domain map (2026-05-27)

> **Trigger:** operator `/checkin-echo are you working on post processors still?` + follow-up "follow kilo's foot steps and add to memory anything post processor related". 3 parallel Explore agents ran read-only enumeration across engines / scripts.lib / algorithms / databases / wiki / tribal / JM DIE / system-viz / existing memories. This file is the synthesis — echo's authoritative pointer index for all future post-processor work.
>
> **Pattern parallel:** [[reference_kilo_reorient_2026_05_26]] — single domain-anchored reference doc with cross-refs and commit pointers.

## 1. Echo's recent post-processor work (the lineage this map serves)

Session-current shipped (commits all on slot/echo or [MAIN] BOOTSTRAP-SLOT-ENFORCE POST-BRIDGE-SYNERGY-MS0):

| iter | row | commit | unit | shape |
|---:|---:|---|---|---|
| 48 | 23 | `b45369db8e` | U-LATHE-CSS-OPTIMIZER-TO-BALL-END | ball-nose variable RPM emit |
| 49 | 27 | `76238b67bb` | U-MAGAZINE-TSP-T-WORD-ORDER | T-word pre-fetch ATC |
| 50 | 24 | `ad08ce89f4` | U-LATHE-BLOCK-ENGAGEMENT-TIMING-TO-MILL | per-block cycle-time |
| 51 | 31 | `16fb2bd84f` | U-EMIT-CONFORMAL-PI-BANDS | calibrated PI bands at emit |
| **52** | **32** | (latest) | U-EMIT-MAHALANOBIS-OOD-GATE | refuse-hallucinated-emit χ² gate |

Active milestone: **POST-BRIDGE-SYNERGY-MS0** — envelope at `state/shared/specs/POST-BRIDGE-SYNERGY-ENVELOPE-2026-05-26.md` (135 units, 10 phases, echo-owned). Next pickup candidates: row 34 (Pareto), row 35 (closed-form trochoidal), row 41 (drift-aware bandit).

## 2. Engine surface — `H:/prism/mcp-server/src/engines/` (~340+ files, flat layout)

10 engine families. Counts + flagships only — full listings via parallel-agent reports if needed.

| Family | Count | Flagship | KB |
|---|---:|---|---:|
| GCode core | 15 | `GCodeSafetyAnalyzerEngine.ts` | 66.7 |
| MasterPost + per-vendor master-post | 18 | `HurcoV11MillMasterPostEngine.ts` | **91.9** |
| PostProcessor* core | 61 | `PostProcessorPipelineEngine.ts` | **218.4** (largest in repo) |
| Lathe post-processor cluster | 12 | `LathePostProcessorAIEngine.ts` | 73.1 |
| Post-emit safety / validation / library | 15 | `PostPropertyTaxonomyEngine.ts` | 94.5 |
| CAM→Post bridges | 9 | `CrossCAMPostEngine.ts` | 47.8 |
| Per-vendor / per-controller code generators | ~190 | `HyperMillDeepLearningEngine.ts` | 111.1 |
| Controller / dialect / parser substrate | 19 | `ControllerKnowledgeEngine.ts` | **172.5** |
| EDM / Wire-EDM post | 10 | `EDMPostProcessGCodeEngine.ts` | **125.8** |
| Other / specialized | 12 | `JMDiePostProcessorLearningEngine.ts` | 26.2 |

**Mega-engines (high blast radius — Karpathy R8 read-before-write):**
- `PostProcessorPipelineEngine.ts` 218.4 KB
- `ControllerKnowledgeEngine.ts` 172.5 KB
- `OkumaParametricProgramEngine.ts` 156.1 KB
- `EDMPostProcessGCodeEngine.ts` 125.8 KB
- `HyperMillDeepLearningEngine.ts` 111.1 KB

**Vendor codegen breakdown:** HyperMill 63 · Fusion 33 · Mastercam 28 · Inventor 15 · NX 10 · PowerMill 7 · CATIA 7 · Esprit 5 · SolidWorks 5 · Vericut 2.

**Per-controller breakdown:** Fanuc/Okuma/Siemens/Hurco/Haas explicit · WEDM has Mitsubishi/Sodick/Agie/Makino. **Missing per-vendor engines** for Heidenhain / Mazak / Mazatrol / Doosan / Brother / Heller — those are wrapped inside `ControllerDialectEngine.ts` (60.9 KB) without per-vendor extraction. Future gap.

## 3. Dispatcher wiring — 12 dispatchers, ~5,000+ actions touching posts

| Dispatcher | Token | Actions | Role |
|---|---|---:|---|
| `ppDispatcher.ts` | `prism_pp` | **801** | **Primary** — G-code generation, optimization, every PP/master-post action |
| `camDispatcher.ts` | `prism_cam` | 2,475 | Invokes posts via CAM→Post bridges |
| `devDispatcher.ts` | `prism_dev` | 941 | Wires PP test/regression actions |
| `millDispatcher.ts` | `prism_mill` | 429 | Mill-side master-post (Hurco/Okuma OSP/HyperMILL) |
| `edmDispatcher.ts` | `prism_edm` | 388 | WEDM post actions |
| `turningDispatcher.ts` | `prism_turning` | 373 | Lathe post / lathe-master-post |
| `safetyDispatcher.ts` | `prism_safety` | 99 | Wires PostEmitSafetyGate / VerificationSafety |
| `productDispatcher.ts` | `prism_product` | 76 | SFC/PPG (PPGDialectRanker, PPGRAGDialectMatch) |
| `cncOpsDispatcher.ts` | `prism_cnc_ops` | 72 | Per-op codegen |
| `integrationDispatcher.ts` | `prism_integration` | 62 | CAM software + DNC transfer |
| `validationDispatcher.ts` | `prism_validate` | 18 | Wires PostValidation* engines |
| `fiveAxisDispatcher.ts` | `prism_5axis` | 15 | 5-axis post |

## 4. Echo's scripts/lib post-emit substrate (iter22-52 lineage)

**This is echo's load-bearing emit-layer architecture — every line below is composed, never re-implemented.** Each lib at `H:/prism/scripts/lib/<name>.mjs` + paired `.test.mjs` (concrete-value assertions, R12 fail-loud).

### Conformal substrate
- `v11-cycle-time-conformal.mjs` — iter31 — split-conformal regression, distribution-free PI bounds (Vovk 2005). **Wrapped by iter51.**

### Phase-2 node bridges (iter37-40) — contracts
- `db-node-bridge.mjs` — iter37 — unified node-bridge for 23 DB-read paths.
- `wizard-node-bridge.mjs` — iter38 — unified wizard contract mill/lathe/wire-EDM.
- `sfc-node-bridge.mjs` — iter39 — canonical SF compute bridge (5 COMPUTER_SOURCES whitelist).
- `post-gen-node-bridge.mjs` — iter40 — single post-gen contract across **4 GENERATOR_KINDS × 12 SUPPORTED_CONTROLLERS** (Fanuc/Heidenhain/Siemens/Hurco/Mazak/Okuma/Haas/Mitsubishi/Doosan/Mori/DMG/Brother).

### Phase-3 absorption demos (iter41-46) — concrete on bridges
- `db-bridge-absorption-demo.mjs` (iter41) · `wizard-bridge-absorption.mjs` (iter42) · `sfc-bridge-absorption.mjs` (iter43) · `post-gen-bridge-absorption.mjs` (iter44) · `post-bridge-synergy-integration.test.mjs` (iter45, meta) · `sfc-ensemble-computer.mjs` (iter46, confidence-weighted blend over 3 iter43 computers — production default).

### v11 Hurco lineage (iter22-29) — operator-facing "post-soul"
Every lib is JS-emit-shaped so `HURCO_VM30i_PRISM_v11.cps` can `var X = {...}` consume it.
- `v11-pocket-resolver.mjs` (iter23) · `v11-magazine-integrity.mjs` (iter24) · `v11-prove-out-policy.mjs` (iter25) · `v11-post-identifier-banner.mjs` (iter26) · `v11-aggressiveness-compat.mjs` (iter27) · `v11-wear-memory-magazine.mjs` (iter28) · `v11-per-shop-kc-identity.mjs` (iter29) · `v11-operator-style-twin.mjs` · `v11-predictive-coolant-orch.mjs`.

### iter45-52 emit-layer libs (most recent)
- `ball-nose-css-optimizer.mjs` (iter48 / row 23) — `D_eff(ap)=2√(2R·ap−ap²)`.
- `magazine-tword-lookahead.mjs` (iter49 / row 27).
- `mill-block-time-profile.mjs` (iter50 / row 24).
- `conformal-pi-emit.mjs` (iter51 / row 31) — wraps iter31.
- `mahalanobis-ood-gate.mjs` (iter52 / row 32) — refuse hallucinated emits.

### Other post substrate
- `post-processor-catalog.mjs` (india-owned P0-U06 — clean API over gwizard-machines.json 99 machines).
- `post-processor-workholding-catalog.mjs` — 14-WorkholdingType enum + clamp-force μ LUT.
- `post-pdf-corpus-parser.mjs` — Autodesk Post Training Guide parser.
- `mastercam-addin-resource-manifest.mjs` (iter33, Fanuc-dominant) · `hypermill-addin-resource-manifest.mjs` (iter34, Heidenhain TNC + Siemens 840D primary) · `inventor-addin-resource-manifest.mjs` (iter35, Fusion-tuned probing) · `bridge-contract-verify.mjs` (iter36, cross-target parity).
- `orchestrator-pipeline-shell.mjs` (U-MMO-PIPELINE-SHELL, 16-stage MASTER-MACHINIST-ORCHESTRATOR skeleton) + adapters + setup-stage + dark-stage-instrumentation.

## 5. Algorithm tier — `H:/prism/mcp-server/src/algorithms/` (~30 of 92 post-relevant)

Canonical physics that emit substrate *composes* (never re-implements):
- **Geometric input for iter48:** `EffectiveDiameterCompensator.ts` — `D_eff = 2√(d(D−d))`.
- **Stability/chatter:** `StabilityLobeDiagram.ts` (Altintas-Budak 1995 SDOF) · `FRFStabilityLobe.ts` (multi-mode) · `STFTChatter.ts`.
- **Physics:** `KienzleForceModel.ts` · `ExtendedTaylorModel.ts` · `MerchantShearForceModel.ts` · `SandvikTurningForceModel.ts` · `JohnsonCookModel.ts` · `PowerTorqueCalc.ts` · `GilbertMRRModel.ts`.
- **Wear/deflection:** `UsuiWearModel.ts` · `BayesianWearModel.ts` · `ToolWearPrediction.ts` · `ToolDeflectionModel.ts` · `ToolLifeEconomicReplacementFormula.ts`.
- **Surface/thermal:** `SurfaceFinishPredictor.ts` · `ThermalFEAModel.ts` · `JaegerTempField.ts` · `ThermalPartitionModel.ts`.
- **Chip:** `ChipBreakingModel.ts` · `ChipEvacuationModel.ts` · `ChipThinningCompensation.ts` · `ChipVolumeRate.ts` · `ChipTypePredictionModel.ts`.
- **Adaptive control:** `AdaptiveControllerModel.ts` (chipload/chatter/wear/thermal) · `PIDController.ts` · `FuzzyController.ts`.
- **Other:** `SweptVolumeCollision.ts` · `JointSpeedFeedOptimizer.ts` · `InterpolationEngine.ts` (cubic spline) · `CoolantFlowModel.ts` · `AnomalyDetector.ts` (parallel to iter52 Mahalanobis but for cutting telemetry, not emit).

**Gap:** NO standalone G-code-parser / dialect-translator / RTCP / G68.2 / S-curve jerk algorithm in this tier. Those live engine-tier (`MasterPostProcessorUnifiedAGIEngine.ts`) and lib-tier (`scripts/lib/`).

## 6. Databases — `H:/prism/mcp-server/src/data/`

| Path | Size | Kind |
|---|---:|---|
| `machine-post-enriched.ts` | 381 K | per-machine post profile |
| `machine-kinematics-catalog.ts` + `-enriched.ts` | 596 K | kinematic chains |
| `machine-profiles-catalog.ts` + 3 ext | ~650 K | machine catalog feeding posts |
| `machine-torque-curves.ts` + `spindle-corrections.ts` | 745 K | cycle-time inputs |
| `okuma-dialect-knowledge.ts` | 41 K | Okuma OSP G/M variants |
| `okuma-osp-*` + `okuma-program-examples.ts` + `okuma-macro-patterns.ts` + `lathe-tribal-tips-okuma.ts` | ~250 K | Okuma corpus |
| `hurco-winmax-knowledge.ts` | 49 K | Hurco WinMax tribal |
| `controller-knowledge-tips.ts` + `controller-knowledge.json` | 146 K | cross-controller tips |
| `controller-alarm-database.json` | 1.6 M | alarm codes per controller |
| `siemens-sinumerik-tips.json` | 32 K | Siemens 840D/Sinumerik |
| `mitsubishi-fa-{advance,s,tech}-extracted.ts` | ~95 K | Mitsubishi FA wire-EDM |
| `marks-multus-patterns.ts` | 18 K | Multus-specific |
| `fusion-post-strategies.json` + `cimco-post-strategies.json` + `hypermill-post-configs.json` | ~21 K | per-CAM post templates |
| `jm-die-wedm-program-patterns.ts` + tech-tables + jmdie-mill-program-index + milling-macros + proven-mill-programs + wedm-program-index | varies | JM Die proven posts |
| `collision-avoidance-data.json` | 23.1 M | post-safety verification data |

**Gaps:** no dedicated `*post-safety*.ts` or `*cycle-time-coefficients*.ts` files (galaxy CLAUDE.md hinted at these but they don't exist as named DBs — cycle-time inputs come from `machine-torque-curves.ts` and embedded in `GCodeTimeEstimatorEngine.ts`).

## 7. Wiki corpus — `H:/prism/knowledge/wiki/`

| Subtree | Highlights |
|---|---|
| `architecture/engines/cam/` | master-post engines (Hurco V11, Okuma B250/OSP, Mitsubishi MV1200R) + post-processor family |
| `architecture/engines/pp/` | PP-AI family (cognitive / deep-intelligence / KG / meta-learning / unified-deep-reasoning) |
| `architecture/engines/wedm/` | WEDM per-vendor (Agie/Fanuc/Makino/Mitsubishi/Sodick) + dialect router |
| `architecture/engines/machine/` | `controllerdialectengine.md` |
| `architecture/actions/cam/` | ~15 master-post actions + ~12 gcode actions + dialect actions |
| `architecture/actions/data/box-okuma-*` | Box Okuma dialect-table queries (search/lookup-gcode/lookup-mcode/diffs/analyze/stats) |
| `architecture/skills/project/` | `cam-post-lint.md` + `lathe-master-post.md` + `user/gcode.md` |
| `architecture/hooks/runtime/` | `lathe-master-post-quality-gate.md` + `stop-on-unsafe-gcode.md` |
| `architecture/jmdie/` | `customer-posts-and-machines.md` |
| `lessons/` | `hybrid-post-merge-half-wire-bug-class-2026-05-23.md` + `pdf-extract-post-processor-training-guide.md` |
| `code-tribal/canonical/` | `proceed-which-postprocessor-should-be-updated-create-hvz-fil.md` |
| `code-tribal/learnings/post-bridge-synergy-ms0-u-*.md` | **~25 entries — echo's active milestone audit trail** |
| `code-tribal/learnings/post-pdf-node-ms0-u-*.md` | ~9 entries — PDF→post corpus |
| `code-tribal/learnings/feature-gap-audit-ms0-u-{gap-post-rl-postprocessor,gap-post-jmdie-learning,wire-backlog-post,wire-backlog-wedm-post-router,jmdie-post-gaps-viz-roost}.md` | PP gap audits |
| `code-tribal/learnings/post-processor-coverage-ms0-p0-u01.md` + `post-processor-consolidation-2026-05-25-u-final-dark-engine-closure.md` | PP-MS0 milestone learnings |
| `code-tribal/post-processor-cross-controller-corpus.md` | Cross-controller PP corpus |
| `code-tribal/machining-tactics-gcode-safety-and-macros.md` | G-code safety + macros |
| `architecture/monolith-modules/engines-post-processor/` | 12 auto-generated frontmatter stubs (NOT prose) pointing at `extracted/engines/post_processor/*.js`; largest is `prism-post-processor-database-v2.md` (2718 LOC stub). |

**Important — `knowledge/tribal/` is CAM-tip-organized, not post-organized.** True post tribal corpus lives in `knowledge/wiki/code-tribal/learnings/post-*.md` (~50 entries). Don't search `knowledge/tribal/` for post tips — search `code-tribal/learnings/post-*.md`.

## 8. JM DIE post artifacts — `H:/PRISM/JM DIE/` (.gitignore'd — NEVER commit)

- **`POST PROCESSORS/POST-PROCESSOR-MANIFEST.json`** — 3.8 MB indexed manifest (load-bearing for echo).
- **`POST PROCESSORS/1. CONSOLIDATED/`** — consolidated vendor posts.
- **`POST PROCESSORS/2. PRISM ENHANCED/`** — organized as `lathe/` · `mill/{haas,hurco,okuma,roku-roku}/` · `mill-turn/` · `wire-edm/`.
- **`PRISM MODIFIED POST PROCESSORS/`** — **17 hand-modified .cps files**:
  - **Flagship:** `HURCO_VM30i_PRISM_v11.cps` — **794.7 KB** (active surface; echo just shipped v11 holderFactor / prove-out / WinMax / magazine-integrity fixes).
  - `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps` (229.6 KB).
  - HAAS_VF2, HURCO v8/v10/v11, OKUMA M460V/GENOS_L400II/LB3000/MULTUS, ROKU-ROKU.
  - **6× WEDM:** PRISM-Master-{Agie-CUT, Fanuc-ROBOCUT, Makino-U, Mitsubishi-FA10S, Sodick-AQ}-WEDM.cps (16-20 KB each — WEDM master posts may be under-developed vs mill).
- **`OKUMA/POSTS AND MACHINES/5-Axis-Post-Package_Cope_2015/`** — Cope-2015 5-axis Okuma posts.
- **Total `.cps` under JM DIE (4 levels):** 42 files. No `.pst` files.

## 9. /system-viz roosts (high-value pending work for echo)

3 ghost roosts already identified as echo-actionable:

- **MISC-047** — `ghost.misc.60-lathe-master-post-tribal-tips-identified-but-never-wired-into-post-generator` — 60 lathe master-post tribal tips never wired.
- **MISC-153** — `ghost.misc.ppg-backend-frontend-integration-wire-3-isolated-master-post-engines` — wire 3 isolated Master Post Engines.
- **U-PPGM130** — MS4 fleet master-post tests (12 tests across all 7 master posts).

Query patterns: `node H:/prism/scripts/system-viz-query.mjs find "post-processor"` (30 hits) · `... find "gcode"` (30 hits) · `... find "master-post"` (30 hits).

## 10. Echo's existing post-processor memories (load-bearing 4)

- [[reference_p0_u06_post_processor_corpus_2026_05_25]] — P0-U06 post-processor corpus baseline.
- [[reference_post_processor_fleet_baselines_2026_05_25]] — fleet baselines snapshot.
- [[reference_lathe_canned_cycle_dialects_2026_05_27]] — lathe canned-cycle dialects (newest).
- [[reference_u_axis2_numeric_dialect_2026_05_26]] — U-AXIS2 numeric dialect.

Plus secondary: [[reference_india_post_gaps_2026_05_22]] · [[reference_india_post_gaps_viz_roost_2026_05_22]] · [[reference_india_post_wire_2026_05_22]] · [[reference_jm_lathe_post_audit_2026_05_23]] · [[reference_lima_loop_post_compact_2026_05_22]] · [[reference_course_forge_stubs_emitter_2026_05_17]] · [[reference_cad_topology_emitter_2026_05_25]].

The ~100 `reference_post_ship_*` files are commit-ship audit logs (one per shipped unit across all milestones) — NOT post-processor-domain memories. Filter them out when searching this corpus.

## 11. Surprises / anomalies / gaps

1. **Naming false-positive in `*Post*` glob:** `AutoPostmortemEngine.ts` + `BlamelessPostMortemEngine.ts` are **incident postmortem** engines, not post-processors. Exclude from PP audits.
2. **Fusion vs Fusion360 dual-namespace** — possible duplication (`FusionMaterialBridgeEngine.ts` vs `Fusion360MaterialBridgeEngine.ts`, `FusionMultiAxisEngine.ts` vs `Fusion360MultiAxisEngine.ts`). Dedup audit candidate.
3. **HyperMillMetricCfgExtractor.ts + HyperMillMetricCfgExtractorEngine.ts** — co-exist with overlapping prefix. Naming-pattern smell.
4. **PostProcessorPipelineEngine.ts at 218 KB** — likely the single largest engine file in the entire repo. Split candidate per Karpathy R8.
5. **3 ambiguous base anchors:** `MasterPostProcessorEngine.ts` (33 KB) + `PostProcessorEngine.ts` (20 KB) + `PostProcessorMasterPostArchitectureEngine.ts` (36 KB) — overlapping "base PP" naming. `/dedup` candidate.
6. **No per-vendor engine for Heidenhain / Mazak / Mazatrol / Doosan / Brother / Heller** — major controllers wrapped inside `ControllerDialectEngine.ts` (60.9 KB) without extraction. Future gap.
7. **No native `cycle-time*.ts` or `post-safety*.ts` DBs** — galaxy CLAUDE.md hinted at these; closest are `machine-torque-curves.ts` (745K) and `controller-alarm-database.json` (1.6M).
8. **Composition discipline is real and observable** — every emit lib explicitly states "no inline physics" / "Vc is INPUT" / "composes Kienzle + ExtendedTaylor". R8 enforcement is visible across iter22-52.
9. **Monolith wiki stubs (12 .md) are auto-generated frontmatter pointers only** — they are NOT prose authoritative. Substrate of record is the `.mjs` lib layer + algorithms + `MasterPostProcessorUnifiedAGIEngine.ts`.
10. **Test orphan:** `MastercamStrategyEngine.test.ts` in `src/engines/` not `src/__tests__/` — per [[feedback_engine_tests_in_tests_dir]] out-of-scope for `stop_on_unwired_assets`. Likely pre-doctrine.

## 12. Cross-refs

- [[reference_kilo_reorient_2026_05_26]] — the pattern this memory follows.
- [[feedback_psn_definition]] — PSN 11-leg taxonomy (post-processor work spans legs 7/8/9/11).
- [[feedback_engine_tests_in_tests_dir]] — test placement rule used in §11.10.
- [[feedback_parallel_scrutiny_per_file]] — per-file scrutiny gate (already applied to iter48-52).
- [[feedback_continue_posts_trigger]] — the operator-trigger pattern that surfaced this enumeration directive.
- `state/shared/specs/POST-BRIDGE-SYNERGY-ENVELOPE-2026-05-26.md` — echo's active milestone envelope (135 units, 10 phases).
- `mcp-server/src/engines/post-processor/CLAUDE.md` — galaxy sentinel (Bibryam Context Cascade pattern, auto-loads on edits under that subdir).
- `mcp-server/src/engines/post-processor/MEMORY.md` — sibling stub-index awaiting U-GALAXY-MS1-C1 migration.
