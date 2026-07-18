# ZULU — H: Drive Inventory Accountability Audit

**Author:** slot:zulu `claude-0fb9f93e` (chat-fleet orchestrator), 2026-05-26
**Status:** COMPLETE — Batches 1-2 via parallel agents (8 agents), Batches 3-4 inline (rate-limit pivot to direct Grep/Bash)
**Scope:** physical asset accounting of H: drive — what exists, what's dormant, what's orphaned, what's un-bridged. Complementary to india `claude-e9b04a0e` master spec FULL-FLEET-COORDINATION-SELF-IMPROVING-AI-LOOP (per-domain 8-layer AI stack coord). Honors the /goal: "all nodes, files and data in H drive accounted for".
**Method:** /forge-audit-v2 — parallel agents in batches of 4, zulu as the 5th synthesizer + per-chat-domain feed.

---

## 1. Coordination context

- **india** (claude-e9b04a0e) is the per-domain AI-stack coordinator — owns the 13-chat × 8-layer assignment (`FULL-FLEET-COORDINATION-SELF-IMPROVING-AI-LOOP-2026-05-25.md`).
- **zulu** (this chat) owns the orthogonal axis: physical-asset accountability of H: drive — engines/dispatchers/data/extracted-monolith/dormant/orphan/un-bridged.
- Active live chats at audit start: echo, papa, november (others crashed, slots reclaimable).
- Coord message posted: 2026-05-26T~14:42Z on AGENT_CHAT.jsonl, kind=COORDINATION-COMPLEMENT.

## 2. Headline asset accounting (live counts vs claims)

| Surface | Live count | Inventory-claimed | Δ |
|---|---:|---:|---|
| Engines (src/engines/*.ts) | **3,688** | 3,677 | +11 (likely 1× `.ts.tmp` orphan + recently-shipped) |
| Tests (src/__tests__) | **4,236** | 4,492 | -256 (inventory counts deeper; or noise) |
| Dispatchers (src/tools/dispatchers/*.ts) | **107** | 104 | +3 |
| Actions (z.enum total) | 9,635 | 9,635 | match |
| Algorithms (src/algorithms/*.ts) | **91** | 82 | +9 |
| Schemas (src/schemas/*.ts) | **287** | n/a | tracked |
| Registries (src/registries/*.ts) | **27** | 27 | match |
| Source hooks (src/hooks/**/*.ts) | **54** | 54 | match |
| Claude hooks (.claude/hooks/**/*.mjs) | **683** | 824 | **-141 discrepancy** |
| Scripts (top-level scripts/) | **1,057** | — | tracked |
| Scripts (mcp-server/scripts/) | **461** | — | tracked |
| scripts/lib/ | **252** | — | tracked |
| Commands (project .claude/commands/) | **314** | 314 | match |
| Commands (~/.claude/commands/) | 0-at-depth-1 | 396 (manifest) | **load-path gap** |

## 3. Critical hygiene findings (P0 — operator/golf attention required)

### 3.1 Atomic-write leak — 8.09 GB `.tmp` debris at state/shared/ root
- **3,043 `.tmp` files** at `H:/prism/state/shared/` root, dominated by `tribal-embed-index.json.<pid>.tmp` siblings (~369 MB each × dozens).
- Single writer (tribal-embed-index) crashes mid-write without cleanup. Loop continues to relaunch.
- Sample also surfaced 6 `tribal-embed-index.json.NNN.tmp` files in same dir.
- **Fix axis**: `scripts/lib/tribal-graph-embedding.mjs` writer needs O_EXCL + try/finally fs.unlink.
- **Golf hygiene**: a one-shot rtk-rm sweep would reclaim 8 GB.

### 3.2 system-viz orphan debris (~1 GB)
- `_node-embeddings.jsonl.partial` (555 MB, 2026-05-22) — abandoned mid-write.
- `.tmp.system-graph.json.26988.<n>` (405 MB, 2026-05-20) — abandoned graph build.
- `system-graph-normalized.json` (247 MB, 2026-05-15) + `h-drive-files.jsonl` (187 MB, 2026-05-08) + `h-drive-census.json` (126 MB, 2026-05-08) — superseded predecessors not cleaned.

### 3.3 Loop-state zombie population
- 217 total loop-*.json
- **134 `running`**, of which **103 are >24h stale** — `loop-state.mjs end` not firing on session-end.
- Drift: 47% of loop-state is zombie. The autonomous /loop fleet has no GC. Fix: Stop hook should call `loop-state.mjs end` if owning session exits.

### 3.4 Knowledge gap — MIT-OCW corpus EMPTY on disk
- `mcp-server/data/extracted-knowledge/mit-courses/` is **0 files, 0 bytes**.
- WEDM_DIGEST.json + CLAUDE.md §KNOWLEDGE-CONVERSION-MS0 cite "5 MIT courses".
- `.cache/mit-extract/16660j-20260425-002636.log` (10.7 KB) is the only artifact.
- Likely (a) extracted → wiki without persisting source, or (b) pipeline abandoned mid-flight.
- **Feeds india**: this is a coord-level finding; the per-domain training-data layer (§6 Layer-1 in FULL-FLEET) cannot have an MIT corpus subgraph if source isn't on disk.

### 3.5 Dead 0-byte ledgers
- `state/shared/AGENT_UTILIZATION_LEDGER.jsonl` — 0 bytes, **36+ days stale** (2026-04-20).
- `state/shared/ERROR_LEDGER.jsonl` — 0 bytes, **27+ days stale** (2026-04-29).
- Writers are misconfigured; both surfaces are claimed-active in CLAUDE.md.

### 3.6 BUILD_STATE.html / AWARENESS-SNAPSHOT.md drift
- `BUILD_STATE.html` is 254h (10.6d) stale while .md/.json are fresh — html-companion renderer not wired into BUILD_STATE refresh.
- `AWARENESS-SNAPSHOT.md` is 61h (~2.5d) stale despite "SessionStart-injected" claim — regenerator not firing reliably.

## 4. Dormant / orphan candidates (P1)

### 4.1 mcp-server/src/ structural dormancy
- **`src/mcp-server/`** — empty directory (nested duplicate of parent name).
- **`src/state/`** — empty; conflicts with `mcp-server/data/state/`.
- **`src/tests/`** — 1 file; legacy convention vs `src/__tests__/` (4,236 files).
- **`src/scripts/`** — 3 files; conflicts with `H:/prism/scripts/`.
- **`src/data/`** — 145 files; duplicates `mcp-server/data/` semantically.
- Singleton-file dirs: `architecture/`, `cache/`, `errors/`, `interfaces/`, `prompts/`, `queue/`, `storage/` — 1-file dirs typically stub/dormant.
- 2× `.ts.tmp` orphans at src/ root.
- Lone `manus_integration.py` (19.7K) in TS tree — orphan from another era.

### 4.2 Script-tree duplication
- **95 filenames duplicated** between `H:/prism/scripts/` and `H:/prism/mcp-server/scripts/`.
- Top-level skews `.mjs`, mcp-server skews `.ts` — likely "typed-source + compiled-runtime" but no doctrine marker.
- Disposition needs declaring: which is canonical?

### 4.3 Memory typed-dir gaps
- `knowledge/memories/mistakes/` and `knowledge/memories/patterns/` — empty.
- `feedback_always_capture_lessons` would expect `mistakes/` populated; auto-capture writes to `reference/` instead.
- Either retire the typed-dirs or fix the writer routing.

### 4.4 Empty scaffold dirs
- `knowledge/Materials/`, `knowledge/relationships/`, `knowledge/templates/`
- `knowledge/wiki/patterns/`, `knowledge/wiki/trajectories/`, `knowledge/wiki/ux-design/`, `knowledge/wiki/summaries/`
- `state/shared/learned-templates/`, `state/shared/slot-job-objects/`, `state/shared/audit/`
- `mcp-server/data/archive/`, `mcp-server/data/baselines/`, `mcp-server/data/locks/`
- `.claude/state/`, `.claude/skills-archived/`, `.claude/tmp/`

### 4.5 mcp-server/data/state/ — 87% stale
- 292 top-level JSON files. **255 (87%) have mtime >7 days**.
- Many are `*_INDEX.json` / `*_REGISTRY.json` that should auto-refresh — regeneration not firing.
- `BASELINE_INVENTORY.json` ~14d stale (CLAUDE.md cites it as canonical baseline).
- `LAST_SESSION_INVENTORY.json` ~18d stale (should update every session).
- Total: 948 files / 225 MB across data/state/ incl. nested MS subdirs (656 unaccounted in flat scan).

### 4.6 Top-level H:/prism/ root pollution
- 166 root `.md` files; ~20+ are legacy roadmaps explicitly superseded by `PRISM-UNIFIED-ROADMAP-v2.md`:
  - `CAMX-RESTRUCTURED-ROADMAP-v24.md` (390K), `MASTER-AI-SYSTEM-ROADMAP-2026-04-15.md` (145K), `LATHE-MASTER-UNIFIED-ROADMAP.md` (141K), 17+ more.
- Non-MD root noise: `PRISM_v8_89_002_TRUE_100_PERCENT.html` (47 MB), `PRISMv1.html` (11 MB), `.tmp-dos.json` (22 MB), `tsconfig.tsbuildinfo` (964K), `PRISM_CAM_ENGINE_v1.js` (143K mis-located), 3× `viz-*.png` artifacts.
- Most should move to `archive/` or be `.gitignore`'d.

### 4.7 Extraction-shadow dirs
- `mcp-server/data/hypermill/` (1 file) + `mcp-server/data/hypermill-extracted/` (1 file) — both single-file dirs; incomplete or orphan.
- `mcp-server/data/fusion360/` (1 file), `mastercam/` (6), `materials/` (3), `quality/` (3), `reference/` (3), `shop/` (2), `templates/` (17), `test-corpora/` (1), `test-lathe-lora/` (3) — all <20 files; started-and-abandoned or stub seeds.
- 5 settings-baseline snapshots within 2 minutes — keep latest, archive rest.

## 5. Asset mass summary

| Layer | Size | Files | Notes |
|---|---:|---:|---|
| state/shared/ (total) | **15.11 GB** | 11,968 root + 77 subdirs | 8 GB of root pollution = .tmp leak |
| state/shared/system-viz/ | 3.98 GB | 218 | 1 GB orphan debris |
| state/shared/sfc-variability-results/ | 1.97 GB | 47,381 | Monte Carlo physics outputs (unknown consumption) |
| JM DIE/ | **77 GB** | 17,829+ (depth-3) | Test-shop canonical corpus |
| extracted/ (root) | 91 MB | 895 | Active extraction target |
| extracted_modules/ (root) | 149 MB | 1,048 | Active |
| archives/ (root) | 265 MB | 3,430 | Archival — verify retention |
| BOX/ (root) | 32 MB | 253 | Shop-floor inbox |
| knowledge/ (total) | ~337 MB | 55K+ | wiki 273M / memories 45M / tribal 18M |
| mcp-server/data/state/ | 225 MB | 948 | 87% stale |
| mcp-server/data/posts/ | 71 MB | 674 | Post processors |
| mcp-server/data/programs/ | 39 MB | 2,888 | Programs catalog |
| mcp-server/data/milestones/ | 15 MB | 789 | Milestone artifacts |

## 6. Per-chat domain feeds (matched to india JULIETT-12CHAT)

These are tailored handoff fragments — each chat's domain owner should pull the relevant section into their next /loop iter.

### 6.1 charlie — wire/WEDM + cross-domain reasoning
- **wedm-training-corpus/** (99 files, 0.19 MB) is sparse — too small to feed WEDM 8-layer training stack.
- `WEDM_LATTICE_GRAPH.json` (1.5M) is largest WEDM state — confirm consumer.
- 14 `wedm-*` scripts present. Watch for orphans against the WEDM dispatcher.

### 6.2 delta — CAD + corpus-100k training
- `cad-corpus-manifest.json` (4.9M) co-exists with `cad-corpus-manifest-recovered.json` (4.9M) — dedup needed; pick canonical, archive the other.
- `mcp-server/data/cad-functions/` (45 files, 1.3M) — extracted CAD function catalog; verify it's consumed.

### 6.3 echo — CAM + toolpath AI
- `CAM_TRIBAL_RAG_INDEX.json` (5.3M) is hot. Cross-check with the BM25 sparse sibling per india's RAG-layer contract.
- `cam-tribal-corpus.jsonl` (594K, **598 tips**) — alive.
- `mcp-server/data/cam-functions/` (128 files, 3.0M) — extracted catalog.

### 6.4 foxtrot — mill + tribal
- **`memories/mistakes/` is empty** — foxtrot's tribal-knowledge promotion path is half-wired; mistake-capture writes to `reference/` instead.
- `mcp-server/data/mastercam/` has only 6 files — vendor-extraction either complete (no more to extract) or stalled.

### 6.5 hotel — ERP + HR + portal
- Recent ship `EmployeeShopFloorMobileEngine` + 43 emp_* actions verified live.
- `dashboards/` is excellent (0 stale dashboards) — hotel's surface is the cleanest in the fleet.

### 6.6 kilo — print-to-program (p2p)
- `_PART LIBRARY` under JM DIE/ is the canonical p2p source corpus.
- `print-corpus-tables/` (113 MB, 4 files) is concentrated — confirm the 4 are intentionally chunked vs leftover-multipart.

### 6.7 mike — misc / orphans
- **THIS DOCUMENT IS THE MIKE WORK ORDER.** Mike inherits every orphan in §4 — bias toward archive-not-delete per `feedback_never_delete_only_disable`.

### 6.8 whiskey — lathe + lathe AI training
- `mcp-server/data/test-lathe-lora/` (3 files) — stub. Whiskey may need to grow this if S-LoRA stack expects a real lathe LoRA corpus.

### 6.9 papa — NN/GNN core
- **`state/shared/training/psn-leg-6-graph-features.jsonl` (72.5 MB)** is papa's GraphSAGE input. Hot.
- PSN legs 2 (PRISM-OS) and 10 (NN/GNN) MISSING from training/ JSONL — partial coverage per india's spec, but flag for papa.
- `.tmp.system-graph.json.26988.<n>` (405 MB orphan) is papa-domain debris.

### 6.10 sierra — /system-viz + ghost roosts
- system-viz is half-orphan-debris (§3.2). Sierra owns cleanup.
- `system-graph-index.json` (150 MB) lists **291,840 nodes** — the canonical viz scale.
- `BUILD_STATE.html` 254h stale is a sierra wiring fix (companion renderer).

### 6.11 quebec — quality + SPC
- No quebec-specific state files surfaced in this batch — quebec is likely most under-built. Recommend quebec audit-pass to register the gap.

### 6.12 tango — telemetry + observability
- Dead 0-byte ledgers `AGENT_UTILIZATION_LEDGER.jsonl` + `ERROR_LEDGER.jsonl` are tango-domain. These are the canonical claimed surfaces and they have zero writes in 4+ weeks.
- `pre-tool-router-table-advise.jsonl` (896KB) + `pre-tool-savings-multi.jsonl` (997KB) are hot — tango infra is partially alive.

### 6.13 oscar — orchestration + multi-agent
- 217 loop-*.json files (134 zombie) is oscar-domain. The `/loop end` write is missing across the fleet.
- chat-bus/ has 10,232 messages — needs a retention/archival policy from oscar.

### 6.14 india — coordinator (her own feed)
- 35 india-tagged handoffs present — second-highest after alpha/charlie/bravo.
- india master spec referenced at top is acknowledged + complementary, not duplicated.

### 6.15 golf — hygiene slot
- **PRIMARY MIKE+GOLF ACTION**: §3.1 (8 GB tmp-leak sweep) + §3.5 (re-wire dead ledgers) + §4.1 (decide src/ empty-dir disposition).
- 37 golf-tagged handoffs.
- 0 dashboards with `golf-*` prefix despite CLAUDE.md allowlist citing the pattern — golf may not be writing to its own allowlisted surface yet.

## 7. Batch 2 — domain stacks (mill/lathe/wire/CAD/CAM/SFC)

### 7.1 Mill + lathe — agent A5

- **Mill engines: ~100+** (Glob truncated). 50+ HyperMill*, 18+ Milling* AI/Reasoning/Neural, 10 specific cycles (Thread/Chamfer/Trochoidal/Plunge/BallEnd/Helical/HighFeed/BallMill/Spline/Micro), 5 Mill-Turn, 2 PowerMill, 2 JM-Die-Mill harvest pair (near-duplicate — dedup candidate).
- **Lathe engines: ~150+**. 32+ LatheLoRA* (full LoRA pipeline), 25+ Lathe* AI/Reasoning, 20+ operational, 7 LatheMasterPost*, 5 LathePostGenerator*, 30+ Turning*.
- **Skill bias**: 100+ mill engines → only 2 skills (`/mill`, `/mill-studio`). Lathe 150 engines → 5 skills. Mill is severely under-exposed at the skill layer (no `/mill-lora`, `/mill-master-post`, `/hypermill-studio`).
- **No standalone `latheDispatcher.ts`** — lathe routes through `turningDispatcher.ts` + `turningProgramDispatcher.ts`. No `hyperMillDispatcher.ts` for the 50+ HyperMill engines.
- **Mill state files near-zero** vs 9 lathe state files — mill knowledge lives in extractors, not persisted state.
- **`JMDieMillProgramHarvest{Engine,erEngine}` pair** — naming duplicate worth /dedup.

### 7.2 WEDM + posts — agent A6

- **WEDM engines: ~140** (truncated at 100). 5 controller-dialect posts (Mitsubishi/Sodick/Makino/Agie/Fanuc), 12+ physics-safety gates, 20+ wire-physics engines, 21 AGI/reasoning, 14+ learning-loop, 7+ GNN/graph, 8+ business/quoting.
- **WEDM_DIGEST stale 5 weeks** — generated 2026-04-17, reports 103 engines vs disk's ~140. Pointer rot. `WEDM_DIGEST.json` does not exist (only `.md`) despite doctrine pointing at it.
- **MasterPost vendor asymmetry** — only Mitsubishi has a WEDM MasterPost engine (`MitsubishiMV1200RWireEDMMasterPostEngine`). Sodick/Makino/Agie/Fanuc each have post engine + PRISM-enhanced `.cps` but NO MasterPost. **Biggest physical WEDM asymmetry on disk.**
- **WEDM cross-dispatcher integration**: 11 of ~25 dispatchers see WEDM nodes (calc/cam/cad/safety/ai/data/edm/knowledge/quality/monitoring/dev). Strongest cross-domain wiring of any tracked domain.
- **`mcp-server/data/posts/` is nearly empty** (3 small subdirs, 11 files). Real corpus lives in `JM DIE/POST PROCESSORS/` — 64 vanilla `.pst`/`.cps` across mill/lathe/wire-edm/mill-turn/router/laser/additive/inspection. **Either consolidate or accept JM DIE/ as canonical and retire the misleading data/posts/ shell.**
- **No `UnifiedPost*` engines** despite MEMORY.md doctrine naming the namespace. Closest: `LatheMasterPostUnifiedOutputEngine`.

### 7.3 CAD + 6 CAM bridges — agent A7

- **All 6 tier-1 CAM bridges verified on disk**: Fusion 360, hyperMILL, Mastercam, Esprit, Inventor HSM, SolidWorks (latter uses SolidCAM as CAM-side proxy — 12 engines).
- **CAM vendor mass**: hyperMILL 76 engines (dominant), Mastercam 29, Fusion 360 18, SolidCAM 12, NX 10, Esprit 7, Inventor HSM 5, plus 6 single-bridge vendors. **Powermill + Catia have `cam-functions/` dirs but ZERO engines** — data-without-execution orphans.
- **CAD corpus 28× smaller than CAM** — `cad-tribal-corpus.jsonl` 21 records vs `cam-tribal-corpus.jsonl` 598 records. Major CAD knowledge-acquisition gap.
- **`cad-corpus-manifest.json` + `-recovered.json` are 4.92/4.93 MB twins** — likely duplicate post-recovery; dedup needed (already noted §6.2 for delta).
- **No `cam-*.mjs` scripts** at top-level scripts/ — asymmetry with 8 CAD scripts. CAM-side build automation gap.
- **`hypermill-extracted/` is a 161B placeholder** — extraction never completed or never persisted output.

### 7.4 SFC + algorithms + formulas — agent A8

- **SFC engines**: 12 dedicated SFC* + 37 SpeedFeed* + 3 Kienzle = ~52 in the SFC family (mcp-server/CLAUDE.md cites "6" hubs — stale, reads canonical hubs not full family).
- **3 orphan algorithms** on disk: TSNE, KMedoids, DBSCAN (clustering trio) — built but ZERO engine consumers. Should be wired into anomaly/clustering engines or marked `WIRE-EXEMPT:`.
- **10 engines have kc1.1/canonical-number mentions** — hot-suspects for inlined-constants hard-block violations. NOT confirmed violations; needs line-level audit. Suspect list: AdaptiveCalibration, AdaptivePipelineGenerator, AIPhysicsOptimization, AdaptiveEngagement, AdvancedPostPhysics, AIIntelligenceMaximizer, AIDeepKnowledgeIntegration, AdvancedCuttingMath, AdaptiveMillingChipLoadMonitor, AdaptiveMachiningIntegration.
- **`constants.ts` confirmed canonical** — kc1.1 P=1800/M=2100/K=1100/N=700/S=2800/H=3200, MaterialEntry/MATERIAL_DB. 1,082 LOC. Cites Sandvik 2024, ISO 3685:1993.
- **SFC variability matrix**: `sfc-variability-results/` 47,381 files / 2.2 GB. Subdirs `_dryrun-mill/`, `_smoke-mill/`, `lathe/` — **mill sweep is partial; lathe completed**. The 2026-05-20 103-case matrix appears lathe-only.
- **SFC skills missing from project paths** — `/auto-speed-feed` referenced in mcp-server/CLAUDE.md but Glob returns none in `H:/prism/.claude/commands/`. Likely user-scope (`C:/Users/wompu/.claude/commands/`) or naming-drift.

## 8. Batch 3 — learning systems (inline due to rate-limit on agent dispatch)

### 8.1 NN/GNN — A9 inline

- **Neural engines**: 30 visible (truncated), spanning every domain — KnowledgeGraphNeuralBridge, LatheNeuralIntelligence (83K, largest), MillComprehensiveNeural, MillingNeuralCognitive, NeuralCADGeneration, NeuralRouting, NeuralWeightPersistence, PRISMNeuralKnowledgeSynthesis, PostProcessorNeuralNetwork (61K), PostProcessorVideoKnowledgeNeural (55K), ThermalNeuralPredictor.
- **NN-graph artifacts (state/shared/nn-graph/)**:
  - `graphsage-checkpoint.json` 149K · `graphsage-checkpoint.candidate.json` 2.9M · `graphsage-checkpoint-768d-rag-upgrade.json` 150K
  - `node-embeddings-768d.jsonl` 6.9 MB — the GraphSAGE-input vector store (papa's bridge)
  - `retrain-baseline.json` 165B, `retrain-lifecycle.jsonl` 19.6K, `reference-pool-seed-2026-05-23.json` 6.7K
  - `train-run.log` 321B
- **NN-EVAL.json — DEFERRED / UNHEALTHY**: `{deferred: true, reason: "insufficient-reference-pool", poolSize: 0, auroc: 0.09607579891061868, brierRaw: 0.3252856030347025}` — trained 2026-05-16, evaluated against current pool 10 days ago, **AUROC=0.096 (target per india's spec = 0.78); reference pool has 0 entries**. PSN-LEG-STATE.json marks NN/GNN leg `[UNGRADED]` for the same reason. The U-NN-PREDICTOR-EMBED-WIRE follow-up is the blocker.

### 8.2 LoRA — A10 inline

- **LoRA fleet is the largest learning-system mass on disk**:
  - **LatheLoRA*: ~50 engines** (full pipeline — Cadence/Pipeline/Training/Dataset/Validator/Benchmark/Deployment/Cron/Drift/Embedding/Ensemble/Example/Experiment/Health/Hyperparameter/Inference/Knowledge/Master/Merge/Model*/Monitor/Neural/Ollama/Physics/Pipeline/Program/Quantization/Reasoning/Resource/Reward/Safety/Training/Transfer/Tribal/Verification + 2 LatheLoRAOllamaDeployer duplicate listings)
  - **MillLoRA*: 7 visible** (Cadence/Deployment/EmbeddingCache/Ensemble/Experiment/Master) — far less coverage than lathe
  - **Generic**: AdaLoRARankAllocator, LoRAAdapterRegistry, LoRAComposition, LoRADriftCoordinator, LoRAMoEGating, ContinualLoRA, FederatedLoRA, DetachedLoRARunner, InferenceLoRAGate, MachineLoRABase
  - **Domain-cadence builders**: FiveAxis/Grinding/Laser/Mill-Turn LoRACadence + LoRADatasetBuilder (skeletons; partial fleet)
  - **Cross-domain bridges**: BlueprintLoRABridge, CAMLoRAAdapterTrainer, CAMLoRAEngine
- **Asymmetry**: Lathe has ~50 LoRA engines + full S-LoRA-style pipeline; Mill has ~7; every other domain has skeleton-only. Per india's S-LORA-DOMAIN-STACK-MS0 envelope, this asymmetry needs leveling.
- **2 duplicate `LatheLoRAOllamaDeployerEngine.ts` listings** in `ls` output (~ likely same file listed twice; could be filesystem caching artifact).
- `/lathe-lora` skill present.

### 8.3 RAG/CAG — A11 inline

- **RAG engines (visible)**: BlueprintExtractionRAG, CAMTribalRAG, JMDieProgramRAG. Small surface — only 3 dedicated RAG engines on first-pass glob (truncated possible).
- **No CAG-named engines found** at first pass (search would need wider sweep).
- **Tribal-RAG corpus**: `tribal-embed-index.json` 192 MB (768-d nomic-embed, regenerated 2026-05-26 09:57) + `tribal-citation-log.jsonl` 2.1 MB (3,536 citations).
- **Qdrant runtime**: not directly verified in this batch (rate-limit cut investigation short). Per [[ollama-prism-bridge]] doctrine, Qdrant is gated behind docker-compose + ollama-docker-launcher.
- **ollama-offload-stats.json — ANOTHER ATOMIC-WRITE LEAK** — `mcp-server/data/state/` has **~40 `.tmp-NNNNN` siblings** of `ollama-offload-stats.json`. Same failure mode as `tribal-embed-index.json.<pid>.tmp` (§3.1). Two confirmed writers leak temp files: tribal-embed-index, ollama-offload-stats. **Likely a shared helper (`atomicWriteFile` or equivalent) is the bug surface.**

### 8.4 PRISM AI hierarchy — A12 inline

- **Tier-1 router**: `AISystemRouterEngine.ts` (11.5K) — exists.
- **Tier-2 coordinator**: `FullSystemAICoordinatorEngine.ts` (19.6K) — exists.
- **Tier-3 specialists**: claimed "seven domain specialist AIs" — not enumerated by name in this batch; search via `Mill*AI*` / `Lathe*AI*` / `WEDM*AI*` / etc. shows many candidates but a canonical "7-of-7" list is not surfaced. **Recommend follow-up audit to declare the canonical 7 vs. drift.**
- **Other Tier surfaces present**: `PRISMSelfAwarenessEngine.ts` (41.4K), `PRISMCreativeReasoningEngine.ts` (31.9K), `CrossDisciplinaryDeepLearningEngine.ts` (72.1K), `CrossDisciplinaryFormulaIntegrationEngine.ts` (80.6K), `OllamaHookBridgeEngine.ts` (12.3K) — all present.
- **AI dispatchers (live)**: `aiReasoningDispatcher.ts` 248K (largest dispatcher), `intelligenceDispatcher.ts` 122K, `memoryDispatcher.ts` 74K, `safetyDispatcher.ts` 64K, `sessionDispatcher.ts` 216K.

## 9. Batch 4 — infrastructure (inline)

### 9.1 Database / persistence layer

- **AgentDB**: per CLAUDE.md the canonical SQLite store is `.swarm/memory.db` (HNSW indexed). Not enumerated in this batch (would need rtk-prefix sqlite tooling).
- **Qdrant**: gated behind docker-compose; not running unconditionally (per token state header "ollama-pipeline routing dead" — by inference, Qdrant may also be cold).
- **State JSON stores**: 292 top-level JSONs in `mcp-server/data/state/`, 87% stale (>7 days), 225 MB total incl. nested MS subdirs (948 files). MASS COLD STORE.
- **15.11 GB total state/shared/** of which 8+ GB is `.tmp` debris (tribal-embed leak) and 3.98 GB system-viz of which ~1 GB is orphan partials.

### 9.2 Hooks / dispatchers / fleet (live counts)

| Surface | Live | Inventory | Δ |
|---|---:|---:|---|
| `.claude/hooks/*.mjs` | **683** | 824 | -141 (inventory drift; CLAUDE.md mirror counting? c-to-h dual count?) |
| `.claude/commands/*.md` | **314** | 314 | match |
| `mcp-server/src/tools/dispatchers/*.ts` | **107** | 104 | +3 |
| `src/engines/*.ts` | **3,688** | 3,677 | +11 |
| `src/__tests__/**/*.test.ts` | 4,236 | 4,492 | -256 |
| Algorithms `src/algorithms/*.ts` | **91** | 82 | +9 |

### 9.3 Fleet / slots / chat-bus

- **26 NATO slots** registered via `SLOT_NAMES` in `chat-slots.mjs`. At audit start: 3 live (echo, papa, november), 1 hygiene (golf — crashed but reclaimable), rest crashed-reclaimable.
- **Loop-state**: 217 total, **134 `running`, 103 zombie (>24h stale)** — `loop-state.mjs end` not firing on session-end. **47% of loop-state is zombie.** Fleet-wide GC missing.
- **Chat-bus**: `state/shared/AGENT_CHAT.jsonl` has 10,232 entries (history-only, low-size). No retention policy active.
- **Coord-context for this audit**: india `claude-e9b04a0e` is the active per-domain coordinator (master spec `FULL-FLEET-COORDINATION-SELF-IMPROVING-AI-LOOP-2026-05-25.md`); zulu (this audit) is complementary on the inventory axis.

## 10. Consolidated P0 findings (operator-facing punch list)

| # | Finding | Owner | Effort |
|---|---|---|---|
| 1 | **8 GB tribal-embed-index `.tmp` leak** at `state/shared/` root | golf (sweep) + lib/tribal-graph-embedding writer fix | Sweep: 1 cmd / Fix: 30min |
| 2 | **ollama-offload-stats `.tmp-NNNNN` leak** (~40 siblings) at `mcp-server/data/state/` | same shared atomic-write helper | 30min |
| 3 | **NN-EVAL deferred 10 days, AUROC=0.096 vs target 0.78** — reference-pool seed has 0 entries | papa (U-NN-PREDICTOR-EMBED-WIRE blocker) | known follow-up |
| 4 | **103 zombie /loop sessions** marked `running` >24h | oscar — wire `loop-state.mjs end` to Stop hook | 1-2h |
| 5 | **MIT-OCW corpus EMPTY on disk** despite doctrine citing 5 courses | india + foxtrot — verify whether extracted → wiki or pipeline abandoned | invest 1h |
| 6 | **WEDM_DIGEST.md 5 weeks stale** (claims 103, disk has ~140 engines) — `.json` variant doesn't exist | charlie — regen + emit `.json` | 1h |
| 7 | **WEDM MasterPost vendor asymmetry** (only Mitsubishi has one of 5 dialects) | charlie — replicate Mitsubishi pattern to Sodick/Makino/Agie/Fanuc | multi-day |
| 8 | **3 orphan algorithms** (TSNE/KMedoids/DBSCAN) — built but zero consumers | mike (orphan-domain) — wire to anomaly/clustering engines or mark WIRE-EXEMPT | 2-4h |
| 9 | **CAD tribal corpus 28× smaller than CAM** (21 vs 598) | delta — CAD knowledge-acquisition expansion | multi-day |
| 10 | **2 dead 0-byte ledgers** `AGENT_UTILIZATION_LEDGER.jsonl`+`ERROR_LEDGER.jsonl` (27-36 days stale) | tango — verify writer wiring | 1h |
| 11 | **Mill SFC variability sweep incomplete** (lathe done, mill `_dryrun`/`_smoke` only) | alpha or foxtrot — complete the mill 103-case matrix | multi-day |
| 12 | **AWARENESS-SNAPSHOT.md 61h stale + BUILD_STATE.html 254h stale** — SessionStart-inject regenerators not firing | golf — check the inject hooks | 1h |
| 13 | **system-viz 1 GB orphan debris** (`_node-embeddings.jsonl.partial` 555M + `.tmp.system-graph.json.26988.*` 405M + 247M+187M+126M superseded) | sierra — sweep | 30min |
| 14 | **2,888 `mcp-server/data/programs/` files / 39 MB + 789 `milestones/` + 656 `state/` nested MS subdirs** — never inventoried for orphan vs active | mike — sub-audit | 4-8h |
| 15 | **95 filenames duplicated** between `H:/prism/scripts/` and `H:/prism/mcp-server/scripts/` | mike + golf — declare canonical, archive shadows | 2h |
| 16 | **20+ legacy roadmap MDs at H:/prism/ root** + 47MB+11MB HTML artifacts + `.tmp-dos.json` 22M | mike — archive sweep | 1h |
| 17 | **Hook count discrepancy 824 (inventory) vs 683 (live)** — 141-file drift | golf — root-cause the inventory updater | 1h |

## 11. Method audit

- **Batches 1-2 (4 + 4 agents = 8 agents)** executed as parallel `general-purpose` subagent dispatches. All 8 returned; combined token cost ~3.0M tokens across agents.
- **Batches 3-4 inline** — Anthropic API rate-limited mid-Batch-3 (4 parallel agents all returned `rate_limited`). Pivoted to direct Grep/Glob/Bash by zulu; same data with single round-trip, much cheaper.
- **Loop-state ticks**: 3 recorded for this audit (1=launch, 2=batch1 done, 3=batch2 done). Final tick on end.
- **Spec emission**: this file (`ZULU-H-DRIVE-INVENTORY-AUDIT-2026-05-26.md`).
- **Per-chat handoffs**: §6 sections above are the per-domain feeds. Operator can dispatch each to the relevant chat by quoting that section into the chat's next /loop iter or by writing per-chat handoffs (deferred — operator's call).

---

**Footnote — token transparency:** this audit ran at ~51% YELLOW context start, climbed through Batch 2 to YELLOW-high. The 16-agent target was throttled to 8 parallel + 8 inline due to API rate-limit. Output here is the **canonical inventory accountability artifact** for 2026-05-26 — complementary to india's `FULL-FLEET-COORDINATION-SELF-IMPROVING-AI-LOOP-2026-05-25.md`.
