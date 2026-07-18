# Lathe Galaxy MEMORY.md — per-domain memory cascade index (P1+P4 hybrid, 2026-05-27)

> **Per-domain memory cascade** per SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md §Q2. Auto-loads when Claude edits under `mcp-server/src/engines/lathe/`. Companion to `./CLAUDE.md` (alpha-authored first-pass, R7-flagged for lathe-soul refinement).
>
> **Status: STUB / awaiting U-GALAXY-MS1-C1 migration + lathe-soul slot assignment.**

---

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="lathe" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:lathe]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/lathe_synthesis.md` (qwen2.5-coder:7b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Pivoting Work**: The decision was made to pivot from lathe work to wire EDM (Electrical Discharge Machining) by `[reference/reference_mike_lathe_to_wedm_pivot_2026_05_24]`. This change in focus is crucial for the team's workload distribution.
- **Quality Gates**: Safety bugs like `[reference/reference_whiskey_lathe_quality_gate_sx_silent_bug_2026_06_01]` were identified and fixed. These quality gates ensure that programs read from the correct context, preventing runtime errors.
- **Domain Rules**: The U-Domain-Rules (`[reference/node_formula_formula_adjusted_turningdispatcher_action_lathe_anomaly_detect_program]`) define critical rules for the lathe domain, including pipeline rules, structural exclusions, and agent-specific fixes. These rules help maintain consistency and reliability across operations.
- **Lathe Dispatcher Action Formulas**: Multiple formulas like `[reference/node_formula_formula_adjusted_turningdispatcher_action_lathe_boring_reach]` and `[reference/node_formula_formula_adjusted_turningdispatcher_action_lathe_softjaw_boring]` are used to define actions within the lathe dispatcher. These formulas help in automating and optimizing lathe operations.
- **Session Wiring**: Sessions like `[reference/reference_whiskey_lathe_session_close_iter143_2026_05_27]` involve wiring various components (e.g., databases, tools) to ensure smooth operation. This includes connecting the JM Die lathe-upgrade engine surface to the turning-dispatcher.
- **Tooling and Linting**: Tools like `[reference/reference_whiskey_lathe_lint_tooling_2026_05_29]` are developed to lint lathe programs, ensuring safety and correctness. These tools parse blocks and extract parameters, providing a deterministic way to validate programs.

## Indexed memories
- **Domain corpus (live counts):** 98 curated memory file(s) · 1111 wiki entr(y/ies) · 35 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 401 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="lathe" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_lathe_audit_2026_05_05.md` · `knowledge/memories/_legacy-root/project_lathe_master.md` · `knowledge/memories/_legacy-root/reference_lathe_handoff.md` · `knowledge/memories/reference/reference_jm_die_lathe_upgrade_v2_physics_2026_05_24.md` · `knowledge/memories/reference/reference_jm_die_lathe_upgrade_yolo_session_2026_05_25.md`
- **Sample wiki:** `knowledge/wiki/training/extracted/autodesk-2014-turning.md` · `knowledge/wiki/training/extracted/cnccookbook-lathe-programming.md` · `knowledge/wiki/training/extracted/inventorcam-turning-millturn.md` · `knowledge/wiki/os/commands/lathe-lora.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/learnings/backend-dev-loop-u-lathe-prog-opt-wire.md` · `knowledge/wiki/code-tribal/learnings/backend-dev-loop-u-wire-lathe-chuck-jaw-setup.md` · `knowledge/wiki/code-tribal/learnings/backend-dev-loop-u-wire-lathe-lora-reason-eval.md`

## Cross-galaxy bridges
- **lathe ↔ mill** (mill-turn): Fusion360MillTurnBridgeEngine, HyperMillMillTurnBridge — cross-galaxy memo namespace
- **lathe ↔ quoting**: LatheAutoQuoteFromPrintEngine + LatheActualCostReconciliationEngine (per-quote and cost-vs-actual)
- **lathe ↔ business/ERP**: ERP cost-feedback loop (LatheActualFeedback → ERPCostFeedback)
- **lathe ↔ NN/GNN**: the 5 huge Lathe-AI engines (Orchestration 77K + Reasoning 38K + Ultra 68K + ActiveLearning 76K + Attention 88K + Anomaly 79K + Bayesian 64K) are LoRA-class learners; memos about their tuning belong here

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Lathe Quality Assurance**: There is an ongoing need to improve the current validators for threading defects (`[reference/node_formula_formula_adjusted_turningdispatcher_action_lathe_g76_thread_validator_design_2026_05_27]`). The existing validators do not catch all specific defects, and further enhancements are required.
- **Tooling Enhancement**: While `[reference/reference_whiskey_lathe_lint_tooling_2026_05_29]` provides a deterministic way to lint programs, there is always room for improvement in terms of coverage and performance. The team should continue to refine these tools based on feedback and evolving needs.
- **Lathe Dispatcher Optimization**: Although `[reference/node_formula_formula_adjusted_turningdispatcher_action_lathe_aux_axis_timing_analyze]` helps in analyzing the timing of auxiliary axes, further optimization is needed to improve overall efficiency and reduce downtime.

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Available algorithm primitives (papa 2026-06-09, per [[feedback_wire_algos_into_galaxies]])

Invokable via `prism_algorithm` for lathe turning-physics / spindle-telemetry work (PSN leg #8 → this brain). Mapped from the ALGO-SYNERGY batch ([[reference_tango_algo_synergy_batch_2026_05_29]] · wiki [[architecture/algo-synergy-ml-batch]]) to the turning domain:
- `signal_savgol` (SavitzkyGolayFilter) — peak-preserving smoothing of turning-force / spindle-load / surface traces before chatter or tool-wear analysis (preserves the boring-bar deflection resonance peak a moving average would flatten).
- `ml_dtw` (DynamicTimeWarping) — elastic alignment of turning-pass signatures: rough-vs-finish, boring-bar deflection-signature matching, predicted-vs-actual cycle-time.
- `ml_viterbi` / `ml_beam_search` — decode insert-wear / built-up-edge / chatter-onset state sequences from turning telemetry.
- `ml_gmm` / `ml_knn` — cluster / retrieve turning regimes (material × insert × CSS) for nearest-neighbour insert + feed/speed retrieval; complements the `LatheBayesianOptimization` surface (the LoRA-class engines own the deep models; these are the cheap math substrate).
- `spatial_ransac_fit` (RANSACHyperplane) — robust diameter / taper fit over on-machine probe points that REJECTS chatter / chip-bridge outliers.

## Candidate lathe-domain memories (flat → to-migrate)

Filename heuristic: lathe, turning, css, g96, g97, threading, parting, grooving, boring-bar, sub-spindle, mill-turn, swiss, bar-feeder, live-tooling, hard-turn, diamond-turn.

- `reference/reference_*_lathe_*` — many; alpha hasn't enumerated (would require Glob over 641 memos)
- `reference/reference_*_threading_*` — threading-cycle work
- `reference/reference_*_hard_turn_*` — hard-turning decision work
- `reference/reference_*_mill_turn_*` — mill-turn bridge work (cross-galaxy, not lathe-only)
- `feedback/feedback_*_lathe_*` — lathe standing doctrine

## What goes WHERE under lathe/

```
knowledge/memories/lathe/
├── feedback/    # lathe rules: "G96 always paired with G50 RPM cap", "boring-bar L/D ≤ 4 steel / ≤ 6 carbide", "single-point threading requires entry-lock G92/G76 not feed-mode", "sub-spindle handoff 0.5° phase tolerance"
├── reference/   # lathe bug-fixes, hard-turning calibration outcomes, large Lathe* engine refactors (the 50-90KB engines have rich history)
└── project/     # lathe milestone state (LATHE-AI-*, LATHE-LORA-*, LATHE-MASTER-POST-*)
```

## Lathe-soul slot proposal (per MS1 envelope U-GALAXY-MS1-D3)

No canonical lathe-soul today (alpha is mill). Proposed: amend JULIETT-12CHAT-ALLOCATION-MS0 to assign one of the unassigned NATO slots as lathe-specialist. Once assigned, that slot:
1. Refines `./CLAUDE.md` §5 gotchas (validate the 7 hypotheses alpha wrote)
2. Populates this MEMORY.md (per the migration model)
3. Picks up `U-GALAXY-MS1-D3-WEDM-LATHE-SOUL-ASSIGN` envelope unit

## Cross-galaxy edges (lathe → other)

- **lathe ↔ mill** (mill-turn): Fusion360MillTurnBridgeEngine, HyperMillMillTurnBridge — cross-galaxy memo namespace
- **lathe ↔ quoting**: LatheAutoQuoteFromPrintEngine + LatheActualCostReconciliationEngine (per-quote and cost-vs-actual)
- **lathe ↔ business/ERP**: ERP cost-feedback loop (LatheActualFeedback → ERPCostFeedback)
- **lathe ↔ NN/GNN**: the 5 huge Lathe-AI engines (Orchestration 77K + Reasoning 38K + Ultra 68K + ActiveLearning 76K + Attention 88K + Anomaly 79K + Bayesian 64K) are LoRA-class learners; memos about their tuning belong here

## Cross-refs

- Galactic center: [`./CLAUDE.md`](CLAUDE.md)
- Soul assignment: `U-GALAXY-MS1-D3-WEDM-LATHE-SOUL-ASSIGN`
- Migration: `U-GALAXY-MS1-C1-PER-GALAXY-MEMORY-MIGRATE`
- Companion sibling indexes: `../mill/MEMORY.md`, `../wedm/MEMORY.md`, `../academy/MEMORY.md`, `../post-processor/MEMORY.md`, `../quoting/MEMORY.md`, `../business/MEMORY.md`
- Baseline: [`../MEMORY.md`](../MEMORY.md)
- Parent doctrine: [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for lathe (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (30 sources: T1=0/T2=6/T3=24). Top primary:
- [CNCCookbook — "G96 G-Code: Constant Surface Speed CNC Programming](https://www.cnccookbook.com/g96-g-code-constant-surface-speed-cnc/)
- [Mitsubishi Materials USA — "Formula for Turning — Technical Info/Cutting Formula](https://www.mmc-carbide.com/us/technical_information/formula/tec_turning_formula)
- [Haas Automation — "G76 Threading Cycle, Multiple Pass (Group 00)](https://www.haascnc.com/service/codes-settings.type=gcode.machine=lathe.value=G76.html)
Deep cited domain research (UNVERIFIED -- whiskey verifies vs source before any live engine/doctrine use): `knowledge/wiki/lathe/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
VERIFIED foundations (papa-workflow 2026-06-09, WebFetch-confirmed): `knowledge/wiki/lathe/lathe-foundations.md` -- promotes only formula STRUCTURE (Vc/RPM geometry, feed-per-rev `f=l/n`, theoretical-finish `h=f^2/(8r)`), G96/G97 + threading-needs-G97 method, and lathe-feed-is-per-rev fact. Owner-gate split: ALL numeric cutting constants (kc1.1/Taylor C,n/SFM/IPR/L:D limits) stay UNVERIFIED in `_staging` -- PRISM sources those ONLY from `src/physics/constants.ts`, never the web.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
