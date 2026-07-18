# Speed-Feed Galaxy MEMORY.md (2026-05-27 STUB)


## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="speed feed" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:speed-feed]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29

Per SCOPE-EXPANSION §Q2. Awaiting U-GALAXY-MS1-C1 + oscar-soul formal-canonization. SFC is a saleable subscription product (root CLAUDE.md EXPERT ROLE). Notable: `103-case max-variability matrix on UltimateSpeedFeedEngine + AutoSpeedFeed R12 Math.round fix` (kilo iter 1b87f98f2). Cross-refs: [`./CLAUDE.md`](CLAUDE.md) · all 3 cutting galaxies' MEMORY.md.


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/speed-feed_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Never Inline Kienzle Constants**: Critical rule to maintain provenance and avoid errors [feedback/feedback_oscar_sfc_physics_discipline].
- **Spindle Power as a Clamp**: Ensuring spindle power is treated as a constraint rather than a target [feedback/feedback_oscar_sfc_physics_discipline].
- **Material Awareness in Calculations**: Incorporating material-specific data into speed-feed calculations to improve accuracy [reference/reference_oscar_speedfeed_material_aware_shipped_2026_06_02].
- **Rounding Values at Display, Not Calculation**: Ensuring precision during calculations and only rounding for display purposes [feedback/feedback_oscar_sf_round_at_display_not_calc].
- **6 Non-Negotiable Physics Invariants**: Consistent across multiple sessions, emphasizing adherence to physical principles without negotiation [feedback/feedback_oscar_sfc_physics_discipline].
- **Start/Verify/Ship Lifecycle**: Repeated in various milestones and artifacts, ensuring a structured development process [reference/reference_oscar_sfc_gsd_2026_05_29].
- **Database Integration**: Regular integration with Juliett's persistence discipline for data storage and retrieval [reference/reference_oscar_sfc_juliett_database_bridge_2026_05_29].

## Indexed memories
- **Domain corpus (live counts):** 49 curated memory file(s) · 282 wiki entr(y/ies) · 54 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 74 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="speed-feed" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/reference/reference_cam_feed_regex_broken_2026_06_01.md` · `knowledge/memories/reference/reference_echo_prismpaths_feed_core.md` · `knowledge/memories/reference/reference_foxtrot_mill_speedfeed_hub.md` · `knowledge/memories/reference/reference_oscar_sfc_9axis_ms0_2026_05_26.md` · `knowledge/memories/reference/reference_oscar_sfc_9axis_ship_absorbed_2026_05_25.md`
- **Sample wiki:** `knowledge/wiki/architecture/obsidian-memory-feed-hook.md` · `knowledge/wiki/architecture/speed-feed-galaxy.md` · `knowledge/wiki/architecture/tests/wedm/wedm-feed-rate-validation.md` · `knowledge/wiki/architecture/tests/wedm/wedm-kunieda-feed.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/math-cutting-mechanics-merchant-oxley.md` · `knowledge/wiki/code-tribal/math-speed-feed-the-full-physics.md` · `knowledge/wiki/code-tribal/learnings/bridge-deep-u-bridge-learn-sfc.md`

## Cross-galaxy bridges
- _(no edges recorded yet — add `speed-feed ↔ <other-galaxy>` lines as integrations land)_

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **865-commit Divergence Flag**: Addressing the divergence in the speed-feed galaxy buildout to ensure consistency [reference/reference_oscar_sfc_galaxy_2026_05_28].
- **Inlined-KC Violations**: Ongoing audit and correction of inline-kc violations to maintain adherence to standards [reference/reference_oscar_sfc_awareness_surface_2026_05_28].
- **Chatter Solver Implementation**: Continuous refinement of the chatter solver to improve performance [reference/reference_oscar_sfc_t1b_sdm_chatter_2026_05_30].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## SFC self-learning backend -- now dispatcher-reachable (bravo cross-galaxy, 2026-06-11)
> bravo (galaxy_access:all-galaxies) closed the SFC backend-wiring gaps so the **self-improving loop is fully
> reachable via MCP**. R12 invariant: only DATA/stats/fold-back surfaced, NEVER NN inference (SFC NNs stay gated
> until LoRA training ships). Full sweep: `state/shared/specs/SFC-ORPHAN-WIRE-QUEUE-2026-06-11.md`. Memories:
> [[reference_sfc_outcome_foldback_wire_2026_06_11]] · [[reference_sfc_orphan_wire_sweep_2026_06_11]].

The 3 genuinely-dark SFC learning engines are now wired into `prism_calc` (the calibration loop was OPEN -- predictions in, actuals could never come back):
- **`speedfeed_outcome_record_actuals` / `_stats` / `_recent`** (`e436c2fc3f`) -> `SpeedFeedOutcomeFeedbackBridgeEngine`. Closes the shop-floor-actuals -> calibration fold-back (the AI-ladder ring buffer). The 9-axis orchestrator already pushes PREDICTIONS via `capture()`; these let ACTUALS come back.
- **`sfc_rank_hypotheses` / `sfc_ranker_stats`** (`9aa9ce20f2`) -> `SFCMultiHypothesisRankerEngine`. Bayesian arbiter ranks competing physics/RAG/adapter speed-feed candidates into one calibrated safety-shielded pick (deterministic, no NN).
- **`sfc_parameter_refinement_compute`** (`ae756dcfc8`) -> `SFCParameterRefinementEngine`. Median+IQR multiplicative correction factors from shop-floor actuals (OutcomeCaptureBus), hard-clamped [0.25,4.0], fail-loud below min evidence.

**Findings:**
1. ~~**`SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture()` is a hardwired `return true`**~~ -- FIXED 2026-06-22 (`U-SFC-OUTCOME-BUS-REAL`): now calls the real `captureSFC` (sfcOutcomeWire) and returns its `ok`, so `stats().bus_capture_success_rate_pct` is truthful (no longer fake 100%). The NineAxis layer now actually reaches the canonical bus (the orchestrator does NOT emit captureSFC for that layer -> no double-capture). 8-test proof `SpeedFeedOutcomeFeedbackBridge-bus-capture.test.ts` (incl an R9 mixed-ratio 66.67% test that FAILS against the old hardwired-true). [[reference_oscar_sfc_outcome_bus_real_2026_06_22]]
2. ~~**False `// WIRE-EXEMPT` markers**~~ -- AUDITED + corrected 2026-06-22 (`U-SFC-WIRE-EXEMPT-AUDIT`). Verified the 6 SFC WIRE-EXEMPT engines (grep for real imports, not metadata strings): **2 LEGIT** -- SFCOutcomeCaptureWireEngine (consumed by `middleware/sfcOutcomeWire.ts`) + SFCRAGWarmStartEngine (imported + called by `SFCMultiHypothesisRankerEngine.ts:34`); **2 STALE** -- SFCMultiHypothesisRankerEngine + SFCParameterRefinementEngine were tagged "not exposed via dispatcher" but ARE dispatcher-wired (`sfc_rank_hypotheses` / `sfc_parameter_refinement_compute`, wire-tests prove it) -> markers corrected to DISPATCHER-WIRED; **2 PHANTOM orphans on this branch** -- SFCProvenanceWireEngine (no real consumer found; refs are reverse-direction `surfaces_into` strings) + SFCInferenceGateWireEngine (real wiring `prism_calc:ultimate_speed_feed`->engine EXISTS on slot/india `3d470ac75f` but is UNMERGED to cad-fusion-live-ms0). WIRE-EXEMPT keyword removed from both phantoms so the unwired audit surfaces them honestly. Real wiring tracked as **U-SFC-PROVENANCE-WIRE** (Provenance: have the wired ranker call `cite()`; InferenceGate: merge/port the india wiring). [[reference_sfc_inference_gate_wire_la1_2026_06_01]]

## Cross-galaxy bridges (live)
- **speed-feed <-> india (ai-training):** the SFC outcome-foldback ring buffer + ParameterRefinement read the OutcomeCaptureBus that india's persistent loop (`U-SFC-LOOP-FEED`) + romeo's `shop_outcome_ingest` also feed -- complementary (in-process AI-ladder buffer vs heavy persistent LoRA pipeline), NOT duplicate.
- **speed-feed <-> hermes-zulu (bravo):** bravo owns the cross-galaxy backend-wiring sweeps that surfaced these (SFC + india AI-orphan wires share the dark-engine + false-WIRE-EXEMPT pattern).

## Available algorithm primitives (wired by tango, ALGO-SYNERGY 2026-05-29)

Invokable via `prism_algorithm` for SFC telemetry / cutting-signal work (PSN leg #8 → this brain):

- `signal_savgol` (SavitzkyGolayFilter) — polynomial smoothing + derivatives that PRESERVE peak shape (unlike a moving average); pre-process spindle-load / vibration-RMS / chatter traces before feature extraction or SLD analysis.
- `ml_dtw` (DynamicTimeWarping) — elastic alignment of cutting-signal time-series (tool-wear signature matching, quoted-vs-actual cycle-time alignment).
- `ml_viterbi` / `ml_beam_search` — decode operation-phase / alarm-state sequences from telemetry.
- `ml_gmm` / `ml_knn` — cluster / retrieve cutting regimes (material × tool × condition) for nearest-neighbour speed-feed recommendation.
- `spatial_ransac_fit` (RANSACHyperplane) — robust trend-line fit over noisy telemetry that rejects transient spikes (a chip-pack glitch shouldn't drag the trend); reports the rejected outlier samples.

Batch detail: `reference_tango_algo_synergy_batch_2026_05_29` · wiki [[architecture/algo-synergy-ml-batch]].

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for speed-feed (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (17 sources: T1=2/T2=3/T3=12). Top primary:
- [IIT Bombay Virtual Labs — Machine Tools, tool-life experiment theory](http://vlabs.iitb.ac.in/vlabs-dev/labs/mit_bootcamp/machine_tools/labs/exp1/theory.php)
- [ACS College of Engineering — "Tool Wear/Tool Life, Machine Time" (Metal Cutting & Forming, Module 3)](https://www.acsce.edu.in/acsce/wp-content/uploads/2020/04/Metal-Cutting-Forming-Module-3.pdf)
- [ISCAR — "User Guide for Radial Chip Thinning Calculator in Milling](https://www.iscar.com/ITC/UserGuide/ITA_USER_GUIDE_RadialChipThinningCalculator_EN.pdf)
Deep cited domain research (UNVERIFIED -- oscar verifies vs source before any live engine/doctrine use): `knowledge/wiki/speed-feed/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
VERIFIED (papa-workflow 2026-06-09): formula-STRUCTURE / method facts WebFetch-confirmed and promoted to `knowledge/wiki/speed-feed/speed-feed-foundations.md` (status VERIFIED-PARTIAL) -- RPM<->SFM (3.82), Kienzle KC=KC1.1*h^-MC*(1-0.01*GAMF) form, Taylor VT^n=C + extended, RCTF=1/sqrt(1-[1-2Ae/D]^2). OWNER-GATE SPLIT: every numeric cutting constant (kc1.1/MC/Taylor C,n/chip-load bands) + unconfirmed Merchant phi + size-effect stay UNVERIFIED in the _staging packet for oscar; PRISM sources cutting constants ONLY from `mcp-server/src/physics/constants.ts`.

<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->
## AI capabilities

The `speed-feed` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). It owns 1 name-attributed AI engine(s) and exposes 1 AI dispatcher action(s).

- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:
  `node scripts/lib/galaxy-reasoning-bridge.mjs speed-feed "<question>"`
- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (owned-by-slot, documented-by) connect it to the system-viz graph.
- **LoRA** -- this galaxy is fed into the vault->LoRA training dataset (`speed-feed_synthesis.md`).
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
