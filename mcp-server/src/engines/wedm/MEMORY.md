# WEDM Galaxy MEMORY.md — per-domain memory cascade index (P1+P4 hybrid, 2026-05-27)

> **Per-domain memory cascade** per SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md §Q2. Auto-loads when Claude edits under `mcp-server/src/engines/wedm/`. Companion to `./CLAUDE.md` (alpha-authored honest stub).
>
> **Status: STUB / awaiting U-GALAXY-MS1-C1 migration + wedm-soul slot assignment.**

---

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="wedm" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:wedm]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/wedm_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **AI Integration in EDM Processes**: Multiple AI-based formulas are integrated into the system for advanced neural orchestration, CAM knowledge synthesis, deep logic, and more [reference/node_formula_formula_adjusted_aireasoningdispatcher_action_ai_wedm_advanced_neural] to [reference/node_formula_formula_adjusted_aireasoningdispatcher_action_ai_wedm_synthesize_knowledge].
- **CAD & CAM Validation**: Formulas ensure CAD DXF geometry validation and EDM sinker program accuracy, with dialect resolution and verification processes in place [reference/node_formula_formula_adjusted_caddispatcher_action_cad_dxf_geom_validate_wedm] to [reference/node_formula_formula_adjusted_camdispatcher_action_wedm_dialect_verify].
- **Safety & Adequacy Gates**: Safety gates evaluate and score various parameters like flush adequacy and head clearance, ensuring safe operation thresholds are met [reference/node_formula_formula_adjusted_camdispatcher_action_wedm_flush_adequacy_evaluate] to [reference/node_formula_formula_adjusted_camdispatcher_action_wedm_safety_gate_thresholds].
- **Wire-EDM Discharge Physics Gotchas**: Identified 15 key issues related to wire-EDM discharge physics, impacting both tip IDs and NC programs [reference/reference_mike_wedm_discharge_gotchas_2026_05_29].
- **Multi-pass Skim Scheduling & Recast Layer Management**: Tribal knowledge outlines strategies for optimizing multi-pass operations and managing recast layers [reference/node_tribal_wedm_tactics_multipass_and_recast].
- **Wire Selection, Tension, and Flushing Strategy**: Tribal insights provide guidelines on selecting the right wire, setting tension, and implementing effective flushing strategies [reference/node_tribal_wedm_tactics_wire_and_flushing].

## Indexed memories
- **Domain corpus (live counts):** 25 curated memory file(s) · 955 wiki entr(y/ies) · 73 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 364 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="wedm" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/project_wedm_agi_status.md` · `knowledge/memories/_legacy-root/project_wedm_erp_complete.md` · `knowledge/memories/_legacy-root/wedm_shop_programs.md` · `knowledge/memories/uncategorized/wedm_shop_programs.md` · `knowledge/memories/reference/reference_course_13_wedm_progressive_2026_05_24.md`
- **Sample wiki:** `knowledge/wiki/os/commands/wedm-audit.md` · `knowledge/wiki/os/commands/wedm-program.md` · `knowledge/wiki/os/commands/wedm-safety-gate.md` · `knowledge/wiki/os/commands/wedm.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/math-edm-spark-erosion-physics.md` · `knowledge/wiki/code-tribal/tribal-wedm-jmd-001.md` · `knowledge/wiki/code-tribal/tribal-wedm-jmd-002.md`

## Cross-galaxy bridges
- **wedm ↔ cad/cam**: EDM toolpaths originate from cad/cam workflows
- **wedm ↔ post-processor**: every wedm toolpath terminates in EDM-flavored G-code via EDMPostProcessGCodeEngine (126K — that engine is the bridge)
- **wedm ↔ quality/SPC**: EDMMonitorSurfaceIntegrityEngine feeds SPC; surface-finish gates differ from mill (discharge-driven not feed-driven)

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Advanced AI Orchestration**: While there is extensive documentation on AI-based formulas, the integration and orchestration of these systems could benefit from further refinement and testing [reference/node_formula_formula_adjusted_aireasoningdispatcher_action_ai_wedm_agi_orchestrate].
- **Wire-EDM Discharge Physics Research**: The identified gotchas highlight areas needing deeper research to fully understand and mitigate discharge physics issues in wire-EDM processes [reference/reference_mike_wedm_discharge_gotchas_2026_05_29].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Available algorithm primitives (papa 2026-06-09, per [[feedback_wire_algos_into_galaxies]])

Invokable via `prism_algorithm` for WEDM discharge-signal / telemetry work (PSN leg #8 → this brain). Mapped from the ALGO-SYNERGY batch ([[reference_tango_algo_synergy_batch_2026_05_29]] · wiki [[architecture/algo-synergy-ml-batch]]) to the EDM domain:
- `signal_savgol` (SavitzkyGolayFilter) — polynomial smoothing that PRESERVES peak shape; pre-process gap-voltage / spark-frequency / discharge-current traces before feature extraction or wire-break detection (a moving average smears the discharge peaks that matter).
- `ml_dtw` (DynamicTimeWarping) — elastic alignment of discharge-signal time-series: wire-wear signature matching, cut-vs-cut comparison across passes, recast-onset alignment.
- `ml_viterbi` / `ml_beam_search` — decode discharge-state / wire-break-risk / short-circuit sequences from gap telemetry.
- `ml_gmm` / `ml_knn` — cluster / retrieve discharge regimes (material × wire × flush-pressure) for nearest-neighbour E-code / pulse-param recommendation.
- `spatial_ransac_fit` (RANSACHyperplane) — robust trend fit over noisy gap telemetry that REJECTS transient short-circuit spikes (a chip-bridge glitch shouldn't drag the trend); reports the rejected samples.

## Candidate wedm-domain memories (flat → to-migrate)

Filename heuristic: wedm, edm, wire-edm, sinker, discharge, dielectric, flushing, recast, wire-break, wire-tension, taper-cut, no-core, multi-pass, skim-pass, micro-edm.

- `reference/reference_*_edm_*` / `reference/reference_*_wedm_*` — discharge-physics work
- The EDM* engine cluster is LARGE (~50 engines, several >40KB including EDMPostProcessGCode 126K + EDMQualityOrchestrator 102K). Each has nontrivial history that a wedm-soul slot would mine into memos.

## What goes WHERE under wedm/

```
knowledge/memories/wedm/
├── feedback/    # wedm rules: pulse-on/off ratio vs surface-finish tradeoff, wire-tension vs straightness vs breakage, recast-layer depth vs application spec, taper-cut wire-deflection compensation, no-core sequencing
├── reference/   # wedm bug-fixes, multi-pass calibration outcomes, per-vendor (Sodick / Mitsubishi / Makino) controller-dialect notes
└── project/     # wedm milestone state
```

## Wedm-soul slot proposal (per MS1 envelope U-GALAXY-MS1-D3)

Same as lathe — no canonical wedm-soul today. Per JULIETT-12CHAT-ALLOCATION amendment proposal in `U-GALAXY-MS1-D3-WEDM-LATHE-SOUL-ASSIGN`. The wedm-studio skill suite + ~20 wedm-* slash commands suggest the work has been done; formalizing closes a Pillar 6 (Travel Hub) gap.

## Critical: alpha's §5 gotchas in `./CLAUDE.md` are HINT-LEVEL, not knowledge

`./CLAUDE.md` §5 lists pulse-on/off ratio, wire-tension, flushing-pressure, recast-layer, taper-deflection, no-core sequencing as HINT TOPICS — they came from literature/general-EDM-knowledge, NOT from any wedm-specialist's first-hand experience with PRISM's EDM engines. The wedm-soul slot must REPLACE those hints with VERIFIED gotchas from session memory (or from operator's tribal knowledge if it was never captured before).

Per R12 fail-loud: don't trust the §5 hints as fact until validated.

## Cross-galaxy edges (wedm → other)

- **wedm ↔ cad/cam**: EDM toolpaths originate from cad/cam workflows
- **wedm ↔ post-processor**: every wedm toolpath terminates in EDM-flavored G-code via EDMPostProcessGCodeEngine (126K — that engine is the bridge)
- **wedm ↔ quality/SPC**: EDMMonitorSurfaceIntegrityEngine feeds SPC; surface-finish gates differ from mill (discharge-driven not feed-driven)

## Cross-refs

- Galactic center: [`./CLAUDE.md`](CLAUDE.md)
- Soul assignment: `U-GALAXY-MS1-D3-WEDM-LATHE-SOUL-ASSIGN`
- Migration: `U-GALAXY-MS1-C1-PER-GALAXY-MEMORY-MIGRATE`
- Companion sibling indexes: `../mill/MEMORY.md`, `../lathe/MEMORY.md`, `../academy/MEMORY.md`, `../post-processor/MEMORY.md`, `../quoting/MEMORY.md`, `../business/MEMORY.md`
- Baseline: [`../MEMORY.md`](../MEMORY.md)
- Parent doctrine: [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for wedm (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (23 sources: T1=1/T2=0/T3=22). Top primary:
- [USPTO US4465914 — *Wire-cut EDM method for automatically measuring a required offset value*](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4465914)
Deep cited domain research (UNVERIFIED -- mike verifies vs source before any live engine/doctrine use): `knowledge/wiki/wedm/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
VERIFIED-PARTIAL promotion (papa-workflow 2026-06-09): method/standards/qualitative facts WebFetch-confirmed -> `knowledge/wiki/wedm/wedm-foundations.md` (non-contact spark erosion, DI-water dielectric roles, brass/zinc-coated wire, rough+skim multi-pass, taper differential-guide method). Owner-gate split: ALL numeric cutting constants (discharge energy/MRR/recast/Ra/ANOVA %/spark-gap/offset/temp) stay UNVERIFIED in `_staging/` for mike -- PRISM sources physics numbers ONLY from `src/physics/constants.ts` + JM Die FA-S tables, never the web.

<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->
## AI capabilities

The `wedm` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). It owns 14 name-attributed AI engine(s) incl. 1 reasoning/neural bridge(s) and exposes 23 AI dispatcher action(s).

- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:
  `node scripts/lib/galaxy-reasoning-bridge.mjs wedm "<question>"`
- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (owned-by-slot, documented-by) connect it to the system-viz graph.
- **LoRA** -- this galaxy is fed into the vault->LoRA training dataset (`wedm_synthesis.md`).
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
