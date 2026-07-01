# Mill Galaxy MEMORY.md — per-domain memory cascade index (P1+P4 hybrid, 2026-05-27)

> **Per-domain memory cascade** per SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md §Q2. Auto-loads when Claude edits under `mcp-server/src/engines/mill/`. Companion to `./CLAUDE.md` (alpha-soul authored, fully-populated).
>
> **Status: STUB / awaiting U-GALAXY-MS1-C1 migration** (bravo — mill pilot is the first migration target per the doctrine spec).

---

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="mill" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:mill]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/mill_synthesis.md` (qwen2.5-coder:7b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Milling Roadmap**: The canonical milling roadmap (v13.0.0) contains 79 phases, 900 units, and 428–553 sessions. [project/project_mill_master_canonical]
- **Awareness Surface**: A custom mill-domain awareness surface is built to ensure operators always have context on their domain. [reference/reference_foxtrot_mill_awareness_2026_05_28]
- **Formula Adjustments**: Various formula adjustments are made for different milling operations, such as chamfer milling, helical milling, and high feed milling. [node_formula_formula_adjusted_calcdispatcher_action_chamfer_milling_calc, node_formula_formula_adjusted_calcdispatcher_action_helical_milling_calc, node_formula_formula_adjusted_calcdispatcher_action_high_feed_milling_calc]
- **Asset Mapping**: The mill-machining asset atlas is built using 4 parallel Explore agents to map every production asset (engines, dispatchers, schemas, registries, pos) in PRISM. [reference/reference_mill_domain_atlas_for_foxtrot_2026_05_27]
- **Safety Checks**: The mill's spindle-power safety check is grounded in physics gate #3 through commit `dee4c4ad68`. [reference/reference_mill_producer_power_headroom_2026_06_02]
- **Inventory Management**: A full test inventory of 247 files with 465 fails and 33 failing files is conducted to root-cause issues. [reference/reference_mill_test_inventory_2026_05_30]

## Indexed memories
- **Domain corpus (live counts):** 36 curated memory file(s) · 803 wiki entr(y/ies) · 57 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 228 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="mill" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/project_mill_master.md` · `knowledge/memories/_legacy-root/project_mill_master_canonical.md` · `knowledge/memories/reference/reference_foxtrot_mill_awareness_2026_05_28.md` · `knowledge/memories/reference/reference_foxtrot_mill_binding_preferslot_2026_05_28.md` · `knowledge/memories/reference/reference_foxtrot_mill_galaxy_buildout_2026_05_28.md`
- **Sample wiki:** `knowledge/wiki/training/extracted/haas-mill-2023-operator.md` · `knowledge/wiki/training/extracted/hypermill-2018.md` · `knowledge/wiki/training/extracted/hypermill-cam-strategies.md` · `knowledge/wiki/os/commands/mill-studio.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/tooling-endmill-flute-helix-corner.md` · `knowledge/wiki/code-tribal/learnings/audit-tribal-bridge-fix-u-mill-tribal-loop.md` · `knowledge/wiki/code-tribal/learnings/bridge-deep-u-bridge-sfc-hypermill.md`

## Cross-galaxy bridges
- **mill ↔ lathe** (mill-turn): some memos belong in cross-galaxy/ namespace, not mill/. Bridge engines (Fusion360MillTurn, HyperMillMillTurn) live there.
- **mill ↔ post-processor**: HyperMILL coolant-block format gotcha is BOTH mill (CAM-side cause) and post-processor (G-code-side effect). Cross-galaxy memo.

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Enhanced JM Mill Programs**: The enhanced JM mill programs are mislabeled and contain landmines. Fresh programs should be generated instead. [project/reference_jm_enhanced_mill_programs_assessment_2026_06_01]

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Available algorithm primitives (papa 2026-06-09, per [[feedback_wire_algos_into_galaxies]])

Invokable via `prism_algorithm` for mill cutting-physics / spindle-telemetry work (PSN leg #8 → this brain). Mapped from the ALGO-SYNERGY batch ([[reference_tango_algo_synergy_batch_2026_05_29]] · wiki [[architecture/algo-synergy-ml-batch]]) to the milling domain:
- `signal_savgol` (SavitzkyGolayFilter) — peak-preserving smoothing of spindle-load / cutting-force / vibration traces before chatter detection or chip-load adaptation (a moving average smears the regenerative-chatter peaks that matter).
- `ml_dtw` (DynamicTimeWarping) — elastic alignment of force/load-vs-time signatures: pass-vs-pass comparison, chatter-regime matching, predicted-vs-actual cycle-time alignment.
- `ml_viterbi` / `ml_beam_search` — decode tool-wear-state / chatter-onset / engagement-regime sequences from spindle telemetry.
- `ml_gmm` / `ml_knn` — cluster / retrieve cutting regimes (material × tool × radial-engagement) for nearest-neighbour strategy + speed/feed retrieval (the math substrate under `AdvancedMillingStrategies` regime selection).
- `spatial_ransac_fit` (RANSACHyperplane) — robust planar-face / feature fit from on-machine probe points that REJECTS burr / fixture outliers.

## Candidate mill-domain memories (flat → to-migrate)

Filename heuristic: mill, milling, chip-load, chatter, deflection, 5-axis, kienzle, taylor, surface-finish, hsm, trochoidal, adaptive-feed, spindle, helix, ball-end, face-mill, end-mill.

- `reference/reference_*_chip_load_*` — chip-load adaptive engine + chip-thinning corrections
- `reference/reference_*_chatter_*` — chatter prediction + 4-axis chatter regime work (multiple sessions)
- `reference/reference_*_5axis_*` — 5-axis singularity + RTCP work
- `reference/reference_*_hypermill_*` — HyperMILL sub-galaxy memos
- `feedback/feedback_engine_tests_in_tests_dir.md` — universal (also lives in baseline)

## What goes WHERE under mill/

```
knowledge/memories/mill/
├── feedback/    # mill rules: "chip-thinning non-optional <50% radial engagement", "5-axis A=0 singularity check before generate", "HyperMILL 4-char coolant block breaks Hurco V11"
├── reference/   # mill bug-fixes, adaptive-engine tuning outcomes, HSM strategy decisions
└── project/     # mill milestone state (HYPERMILL-* milestones, mill-specific MS state)
```

## Bravo pickup (per MS1 envelope U-GALAXY-MS1-C1)

Mill is the PILOT for the per-galaxy memory migration. Bravo writes:
1. `scripts/classify-memories-by-galaxy.mjs` — frontmatter + body-keyword classifier
2. Emits `state/shared/memory-galaxy-routing.json` for operator review
3. Operator approves → `scripts/migrate-memories-to-galaxies.mjs` moves files with redirect stubs at old paths
4. Pilot covers mill only first; if validates → academy + post-processor + quoting + business + lathe + wedm follow

## Cross-galaxy edges (mill → other)

- **mill ↔ lathe** (mill-turn): some memos belong in cross-galaxy/ namespace, not mill/. Bridge engines (Fusion360MillTurn, HyperMillMillTurn) live there.
- **mill ↔ post-processor**: HyperMILL coolant-block format gotcha is BOTH mill (CAM-side cause) and post-processor (G-code-side effect). Cross-galaxy memo.

## Cross-refs

- Galactic center: [`./CLAUDE.md`](CLAUDE.md)
- Migration: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` → `U-GALAXY-MS1-C1-PER-GALAXY-MEMORY-MIGRATE` (BRAVO — mill pilot is the first ship)
- Companion sibling indexes: `../lathe/MEMORY.md`, `../wedm/MEMORY.md`, `../academy/MEMORY.md`, `../post-processor/MEMORY.md`, `../quoting/MEMORY.md`, `../business/MEMORY.md`
- Baseline: [`../MEMORY.md`](../MEMORY.md) — universal mistake-learning + token-saving memos that load above this
- Parent doctrine: [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for mill (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (15 sources: T1=2/T2=8/T3=5). Top primary:
- [Y. Altintas — "Chatter Stability of Machining Operations" (MIT CBA course-hosted PDF; ZOA method + a_lim derivation)](https://academy.cba.mit.edu/classes/computer_machining/chatter.pdf)
- [MTRC (Univ. of Tennessee) reprint — "Chatter Stability of Machining Operations](https://mtrc.utk.edu/wp-content/uploads/sites/45/2020/08/manu_142_11_110801.pdf)
- [Mitsubishi Materials (USA) — "Cutting Power for Face Milling — Technical Info / Cutting Formula](https://www.mmc-carbide.com/us/technical_information/formula/tec_milling_power_formula)
Deep cited domain research (UNVERIFIED -- foxtrot verifies vs source before any live engine/doctrine use): `knowledge/wiki/mill/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
Deep cited domain research (VERIFIED-PARTIAL, papa-workflow 2026-06-09): `knowledge/wiki/mill/mill-foundations.md` -- the WebFetch-CONFIRMED method/structure/pointer subset (Kienzle model STRUCTURE + kc1.1 definition, milling MRR formula, Sandvik entering-angle force-direction, Harvey core-diameter deflection rule). Owner-gate split: ALL numeric cutting constants (kc1.1/mc/RCTF/feeds-speeds), the L^3/d^4 deflection law, and the Altintas-Budak ZOA stability method stay UNVERIFIED in the _staging packet for foxtrot (numbers sourced ONLY from `mcp-server/src/physics/constants.ts`; the two stability PDFs were unreadable by WebFetch).

<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->
## AI capabilities

The `mill` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). It owns 19 name-attributed AI engine(s) and exposes 170 AI dispatcher action(s).

- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:
  `node scripts/lib/galaxy-reasoning-bridge.mjs mill "<question>"`
- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (owned-by-slot, documented-by) connect it to the system-viz graph.
- **LoRA** -- this galaxy is fed into the vault->LoRA training dataset (`mill_synthesis.md`).
- **RAG / CAG** -- the fleet's retrieval-augmented + cache-augmented recall (deep-learning retrieval, not keyword grep) covers this galaxy's wiki + tribal entries as they are authored.
- **Embeddings** -- the fleet's 384/768d neural embedding index covers this galaxy's notes as they are embedded, feeding semantic recall + the GNN node-feature bridge.

_Auto-maintained by `scripts/inject-galaxy-ai-capabilities.mjs` (AI-SYNERGY-AUDIT-MS0). Live posture: `state/shared/specs/AI-SYNERGY-AUDIT.md`; per-galaxy detail: this dir's `AWARENESS.md`._
<!-- AI-CAPABILITIES:END -->

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->

## NEW AXIS -- dispatcher wire status + R12-safe DATA orphan (bravo cross-galaxy, 2026-06-11)
> Backend wiring VERIFIED: **198/204 mill engines dispatcher-wired** (97%). `prism_mill`/`millDispatcher.ts` wires engines via **308 dynamic `await import` lazy-loaders** -- detect darkness by **PascalCase basename substring** (catches `import("...<Base>.js")`), NOT a singleton-name `\b` grep (which false-flags ~193 dark). 6 true-dark: 1 wired, 5 legit-exempt.
> - WIRED `b4bdf8f699`: `MonolithHyperMillFixtureDatabaseEngine` -> 8 `mill_hm_fixture_*` actions (`vises/chucks/clamps/get_vise/get_chuck/auto_select/search/stats`; R12-safe in-memory catalog DATA + monolith threshold auto-select; non-dup of the physics `fixture_*`/`workholding_*` force calculators). Serves directive work-holding/fixturing/tool-holders. 13/13, 2-agent PASS.
> - EXEMPT: `HyperMillACBridgeEngine` + `HyperMillACScriptExecutor` (live hyperMILL Automation-Center exec), `MillingReasoningDefaultEngine` (inference middleware, WIRE-EXEMPT), `CounterfactualMillEngine` (inference), `HyperMillResourceIndexEngine` (already WIRE-EXEMPT).
> Full + the shared-tree clobber lesson (commit FAST on cad-fusion-live-ms0; slot/bravo is 3467 behind): [[reference_foxtrot_mill_wire_status_2026_06_11]].
