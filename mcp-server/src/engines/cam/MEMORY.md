# CAM Galaxy MEMORY.md — per-domain memory cascade index (2026-05-27)

> Per SCOPE-EXPANSION §Q2. Auto-loads when editing under `engines/cam/`. STUB / awaiting U-GALAXY-MS1-C1 migration + cam-soul slot assignment.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="cam" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:cam]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/cam_synthesis.md` (qwen2.5-coder:7b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Autonomous Operation**: The system operates autonomously, driven by a recipe engine. This is exemplified in the memory entry [reference/reference_kilo_cam_drive_recipe_engine_2026_05_31], which describes an autonomous LLM-free CAM-drive replay system.
- **Skill Validation and Resolve**: Skills are validated and resolved based on specific criteria. This is evident in entries like [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_skill_validate] and [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_skill_resolve].
- **Strategy KB Management**: Knowledge bases for strategies are managed to provide recommendations and support geometry-based decisions. This is seen in memory entries such as [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_strategy_kb_for_geometry] and [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_strategy_kb_by_category].
- **Formula Adjustment**: The system uses a formula adjustment mechanism to modify and optimize actions based on specific requirements. This is evident in various memory entries like [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_build_joblist] and [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_skill_registry_by_engine].
- **Skill Registry**: A skill registry is maintained to manage different skills and their associated actions. This is seen in entries such as [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_skill_registry_by_effort] and [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_skill_list_phase].
- **Strategy Management**: Strategies are managed and registered to handle different scenarios and tasks. This is illustrated in memory entries like [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_register_strategies] and [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_dl_select_strategy].

## Indexed memories
- **Domain corpus (live counts):** 66 curated memory file(s) · 3078 wiki entr(y/ies) · 88 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 1296 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="cam" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/reference/reference_cadcam_tribal_wiki_extract_2026_05_24.md` · `knowledge/memories/reference/reference_cadcam_viz_roost_mcp_action_2026_05_24.md` · `knowledge/memories/reference/reference_cad_cam_pdf_extraction_2026_05_26.md` · `knowledge/memories/reference/reference_cad_cam_seat_paths_2026_05_27.md` · `knowledge/memories/reference/reference_cad_cam_software_tips_catalog_2026_05_26.md`
- **Sample wiki:** `knowledge/wiki/training/cam-corpus-index.md` · `knowledge/wiki/training/extracted/fundamentals-cnc-machining-2014-workholding.md` · `knowledge/wiki/training/extracted/hypermill-2018.md` · `knowledge/wiki/training/extracted/hypermill-cam-strategies.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/machining-tactics-coolant-strategy-selection.md` · `knowledge/wiki/code-tribal/machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive.md` · `knowledge/wiki/code-tribal/math-cam-toolpath-mathematics.md`

## Cross-galaxy bridges
- cam ↔ cad · cam ↔ mill/lathe/wedm · cam ↔ post-processor · cam ↔ NN/GNN

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Skill Registry Expansion**: There is an open thread regarding the expansion of the skill registry, particularly in terms of categorization and statistics. This is evident in entries like [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_skill_registry_stats] and [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_skill_registry_by_category].
- **Strategy KB Enhancement**: There is a need to enhance the strategy knowledge base for better recommendations and support. This is highlighted in memory entries such as [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_strategy_kb_recommend] and [reference/node_formula_formula_adjusted_camdispatcher_action_cam_hypermill_skill_registry_by_effort].
- **Autonomous Learning Loop**: The autonomous learning loop needs to be closed to facilitate training. This is addressed in the memory entry [reference/reference_cam_learn_loop_gap_fill_2026_05_31], which discusses closing the CAM self-learning closed loop.

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Available algorithm primitives (papa 2026-06-09, per [[feedback_wire_algos_into_galaxies]])

Invokable via `prism_algorithm` for CAM toolpath / strategy work (PSN leg #8 → this brain). Mapped from the ALGO-SYNERGY batch ([[reference_tango_algo_synergy_batch_2026_05_29]] · wiki [[architecture/algo-synergy-ml-batch]]) to the CAM domain:
- `ml_dtw` (DynamicTimeWarping) — elastic alignment of toolpath / cycle-time signatures: quoted-vs-actual cycle time, strategy-vs-strategy comparison, cross-vendor toolpath equivalence.
- `ml_gmm` / `ml_knn` — cluster / retrieve strategy regimes (feature × material × machine) for nearest-neighbour strategy recommendation — the math substrate under transfer-domain similarity (cross-vendor strategy mapping).
- `signal_savgol` (SavitzkyGolayFilter) — smooth simulated cutting-force / engagement traces along a toolpath (peak-preserving) before chatter or high-engagement feature analysis.
- `spatial_ransac_fit` (RANSACHyperplane) — robust planar-face / feature fit from CAM geometry that rejects stray points.

## Candidate cam-domain memories
Filename heuristic: cam, toolpath, strategy, hypermill, fusion-cam, mastercam, esprit, nx-cam, powermill, workholding, fixture.

## Proposed structure
```
knowledge/memories/cam/
├── feedback/    # cam rules
├── reference/   # strategy outcomes, cross-vendor transfer bugs
└── project/     # CAM milestone state
```

## Cross-galaxy edges
- cam ↔ cad · cam ↔ mill/lathe/wedm · cam ↔ post-processor · cam ↔ NN/GNN

## Cross-refs
[`./CLAUDE.md`](CLAUDE.md) · `U-GALAXY-MS1-C1` migration · parent: [`../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for cam (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (44 sources: T1=4/T2=10/T3=30). Top primary:
- [NCBI PMC — *Investigation of Tool Wear and Chip Morphology in Dry Trochoidal Milling of Ti-6Al-4V* (PMC6630620)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6630620/)
- [USPTO Patent 11,176,291 — *Roughing toolpath sequences generation for CAM*](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11176291)
- [USPTO Patent 6,704,611 — *System and method for rough milling*](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6704611)
Deep cited domain research (UNVERIFIED -- kilo verifies vs source before any live engine/doctrine use): `knowledge/wiki/cam/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
- VERIFIED method/formula-structure facts (WebFetch-confirmed 2026-06-09 papa-workflow): `knowledge/wiki/cam/cam-foundations.md` (status VERIFIED-PARTIAL). Owner-gate split: chip-thinning trigger + RCTF structure, scallop/cusp geometry, trochoidal mechanism, climb-vs-conventional chip direction, Fusion rest-machining method PROMOTED; ALL numeric cutting constants (kc1.1/Taylor/SFM/IPM/feeds) + vendor perf figures stay owner-gated in `_staging` for kilo (PRISM sources numbers ONLY from `mcp-server/src/physics/constants.ts`).

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
