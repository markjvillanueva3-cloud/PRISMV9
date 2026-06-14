# shop-floor Galaxy MEMORY.md

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="shop floor" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:shop-floor]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/shop-floor_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- PRISM OS acts as a role-aware workspace surface, providing 45+ actions via the `prism_operating_system` dispatcher [feedback/feedback_prism_os].
- During DISCOVER phases, durable domain memories should be written continuously to capture existing assets and architecture gaps [feedback/feedback_domain_discovery_memories].
- Each PRISM domain must build and own its self-improving AI training system, tailored to the specific domain needs [feedback/feedback_domains_own_ai_training_systems].
- H:\ is designated as the master drive for truth across both PCs, ensuring no C-only state exists [feedback/feedback_h_drive_master_persistent].
- Extensive documentation and manual coverage for JM-fleet machines, including extraction of part numbers, alarms, fixes, and machine data [feedback/feedback_jm_machine_manual_coverage_doctrine].
- Custom domain awareness surfaces built for specific domains like SFC, mill, and lathe to ensure operators have context [reference/reference_oscar_sfc_awareness_surface_2026_05_28], [reference/reference_foxtrot_mill_awareness_2026_05_28], [reference/reference_whiskey_lathe_galaxy_dispatcher_surface_2026_05_28].
- Use of node-indexed pointers and formulas for maintaining and analyzing machine statuses, alerts, history, models, predictions, schedules, and thresholds [reference/node_formula_formula_adjusted_machinelivedispatcher_action_maint_status], [reference/node_formula_formula_adjusted_machinelivedispatcher_action_maint_alerts], etc.

## Indexed memories
- **Domain corpus (live counts):** 4 curated memory file(s) · 119 wiki entr(y/ies) · 2 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 34 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="shop-floor" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/reference/reference_cam_adaptive_pipeline_deep_assessment_2026_05_28.md` · `knowledge/memories/reference/reference_lathe_adaptive_pipeline_assessment_2026_05_27.md` · `knowledge/memories/galaxies/lathe/reference_lathe_adaptive_pipeline_assessment_2026_05_27.md` · `knowledge/memories/galaxies/cam/reference_cam_adaptive_pipeline_deep_assessment_2026_05_28.md`
- **Sample wiki:** `knowledge/wiki/os/commands/shop-floor-query.md` · `knowledge/wiki/architecture/domain-adaptive.md` · `knowledge/wiki/architecture/lathe-adaptive-pipeline-assessment-2026-05-27.md` · `knowledge/wiki/architecture/shop-floor-galaxy.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive.md` · `knowledge/wiki/code-tribal/math-shop-floor-management-throughput-oee.md`

## Cross-galaxy bridges
- **lathe** (`engines/lathe/`, whiskey) — live status → adaptive engines.
- **wedm** (`engines/wedm/`, mike) — live discharge status → adaptive.
- **mill** (`engines/mill/`) — real-time engine feedback to adaptive engines.
- **business / ERP** (`engines/business/`) — per-machine cost rollups (`EmployeePerMachineSFAdaptiveEngine`).
- **quality / SPC** (`engines/quality/`) — per-cut Cpk feeds.
- **compliance-safety** (`engines/compliance-safety/`) — live alarm propagation.

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- The exact mechanisms and implications of the PSN leg #2 (PRISM OS) are not fully detailed in the provided excerpts.
- The specific details on how the AI training systems are customized for different domains remain unclear.
- There is no explicit mention of how the continuous writing of domain memories during DISCOVER phases is enforced or monitored.

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Available algorithm primitives (papa 2026-06-09, per [[feedback_wire_algos_into_galaxies]])

Invokable via `prism_algorithm` for live shop-floor telemetry work (PSN leg #8 → this brain). Shop-floor owns the LIVE machine-stream surface, so it is the strongest signal/time-series consumer after the cutting galaxies. Mapped from the ALGO-SYNERGY batch ([[reference_tango_algo_synergy_batch_2026_05_29]] · wiki [[architecture/algo-synergy-ml-batch]]):
- `signal_savgol` (SavitzkyGolayFilter) — peak-preserving smoothing of live spindle-load / override-% / current streams before threshold/alarm logic (`MachineLive*`, `AdaptiveOverrideEngine`) — a moving average would mask the transient load spike an alarm must catch.
- `ml_dtw` (DynamicTimeWarping) — elastic alignment of a live run's load signature vs its predicted/golden cycle for drift + anomaly detection (cycle-vs-cycle, machine-vs-machine).
- `ml_viterbi` / `ml_beam_search` — decode machine-state / alarm-precursor / tool-change sequences from the live event stream.
- `ml_gmm` / `ml_knn` — cluster / retrieve operating regimes (machine × material × op) for nearest-neighbour adaptive-feedback baselines + anomaly-vs-normal classification.
- (RANSAC less applicable here — fixture/probe geometry fit is a cad/blueprint-vision concern; shop-floor consumes the live stream, not static geometry.)

## Primary domain
Live shop-floor state: real-time machine status, spindle-load / override-percent feedback, alarm intake, job-traveler tracking, and job-cost-vs-actual rollups. Per `engines/shop-floor/CLAUDE.md` §1, this galaxy owns the running-shop telemetry surface (machine-live streaming, per-machine adaptive feedback) and explicitly EXCLUDES prediction / pre-execution validation (per-domain galaxies) and G-code generation (post-processor).

## Key engines & paths
All engine sources live under `mcp-server/src/engines/` (flat dir; this galaxy is a name-matched view, see `PATHS.md`).
- `ShopStateEngine.ts` — central state owner for shop-floor entities; all job lifecycle, traveler progress, labor tracking, quality approvals flow through it; emits `ShopEvent`s for WebSocket delivery (verified header). ENGINE_DIGEST: "Central state owner for shop-floor entities."
- `ShopFloorDashboardEngine.ts` — "Real-time Shop Floor Status Dashboard" (ENGINE_DIGEST).
- `ShopFloorJobEngine.ts` — "Job Tracking & Work Order Management" (ENGINE_DIGEST).
- `ShopFloorReportEngine.ts` — "Production Reports & Analytics" (ENGINE_DIGEST).
- `ShopFloorScheduleEngine.ts` — "Production Scheduling & Capacity" (ENGINE_DIGEST).
- `ShopConfigurationEngine.ts` — "Centralized Shop Rate & Machine Configuration" (ENGINE_DIGEST).
- `JobTravelerEngine.ts` — job-traveler tracking (ENGINE_DIGEST: "Session 6-7 U-TRAV1"). Note: stub CLAUDE.md cites a `TravelerEngine` that does not exist on disk; the real engine is `JobTravelerEngine`.
- `AdaptiveOverrideEngine.ts` — override-percent feedback (CLAUDE.md §1 "override-percent feedback").
- `EmployeePerMachineSFAdaptiveEngine.ts` — per-machine adaptive feedback (cross-galaxy with business/HR, CLAUDE.md §1).
- `EmployeeShopFloorMobileEngine.ts` — operator-facing mobile shop-floor surface.
- Schemas: `mcp-server/src/schemas/shop/shopDomain.ts` (Job/Traveler/Labor types) + `liveEventContracts.ts` (`ShopEvent`, room helpers) — both imported by `ShopStateEngine`.

## Dispatcher actions (from DISPATCHER_DIGEST.md)
- `prism_machine_live` (`machineLiveDispatcher`, 74 actions) — "Machine live monitoring & control: real-time connectivity".
- `prism_automation` (`automationDispatcher`, 9 actions) — "Shop Floor Automation dispatcher — OEE calculation, bottleneck…".
- `shopDispatcher` (153 actions) — shop-domain surface (no server.tool name in digest).
- `prism_shop_practice` (`shopPracticeDispatcher`, 53 actions) — "Shop practice knowledge base: ingest/search/audit machining…".
- `prism_data` (`dataDispatcher`) — registry access incl. machine/alarm; **MachineDB** intake (`data/machines/`, 1,015 entries) registered for this galaxy per `PATHS.md`.

## Standing patterns / invariants
- **No route/page mutates shop state directly** — all job lifecycle, traveler, labor, and approval changes flow through `ShopStateEngine` (verified engine header, lines 4-9).
- **NEVER inline physics constants** — per-machine envelope/axis-limit gates pull from `mcp-server/src/data/jm-die-profile.ts` (verified on disk); canonical physics values live only in `mcp-server/src/physics/constants.ts` (verified on disk). Project CLAUDE.md §SAFETY.
- **Exclusions** (CLAUDE.md §1): prediction/pre-execution validation and G-code generation are owned by other galaxies, not shop-floor.

## Known assets (verified pointers)
- Domain CLAUDE.md / PATHS.md / TOOLBELT.md: `engines/shop-floor/{CLAUDE.md,PATHS.md,TOOLBELT.md}`.
- Wiki: `knowledge/wiki/architecture/engines/shop/` (per-engine entries incl. `shopfloordashboardengine.md`, `shopfloorjobengine.md`, `shopfloorlayoutengine.md`); skill wiki `knowledge/wiki/architecture/skills/project/shop-live-status.md` (skill `/shop-live-status` — "Live Shop Floor Status").
- Skills: `/shop-live-status`, `/shop-floor-query`, `/traveler` (project-scope, verified in wiki skills index).
- Critical resource roots (generated block in `PATHS.md`): `H:/PRISM/JM DIE/{SETUPS,QUEUE,CONTROLLERS}` flagged domain-relevant for shop-floor.
- Memory: `project_jm_die_shop_floor_languages.md` (shop-floor operators are Polish/Spanish-primary — operator-facing surfaces must account for it).

## Cross-galaxy edges
Per `engines/shop-floor/CLAUDE.md` §5/6/7 + §Related galaxies (symmetric PSN edges):
- **lathe** (`engines/lathe/`, whiskey) — live status → adaptive engines.
- **wedm** (`engines/wedm/`, mike) — live discharge status → adaptive.
- **mill** (`engines/mill/`) — real-time engine feedback to adaptive engines.
- **business / ERP** (`engines/business/`) — per-machine cost rollups (`EmployeePerMachineSFAdaptiveEngine`).
- **quality / SPC** (`engines/quality/`) — per-cut Cpk feeds.
- **compliance-safety** (`engines/compliance-safety/`) — live alarm propagation.

## Cross-refs
[`./CLAUDE.md`](CLAUDE.md) · [`./PATHS.md`](PATHS.md) · [`./TOOLBELT.md`](TOOLBELT.md) · parent: [`../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for shop-floor (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (21 sources: T1=3/T2=0/T3=18). Top primary:
- [NIST, "A Hierarchical structure of key performance indicators for ..." (publication)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=919754)
- [ISO 22400-1:2014](https://www.iso.org/standard/56847.html)
- [ISO 22400-2:2014](https://www.iso.org/standard/54497.html)
Deep cited domain research (UNVERIFIED -- (shop-floor-owner) verifies vs source before any live engine/doctrine use): `knowledge/wiki/shop-floor/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
VERIFIED slice (papa-workflow 2026-06-09, WebFetch-confirmed institutional/method facts -- MTConnect read-only/2008/vocabulary, OEE=A*P*Q + Six Big Losses + TEEP, heijunka-box rows=part/cols=interval, Andon-as-Jidoka-element + operator pullcord, 5S five pillars + 6S-adds-safety): `knowledge/wiki/shop-floor/shop-floor-foundations.md`. Owner-gate split: numeric/control specifics (OEE example numbers, ISO-22400 KPI counts, MTConnect uuid/endpoints, andon two-pull, ISA-95 genealogy, vendor adoption figures) stay UNVERIFIED in _staging for shop-floor-owner.

<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->
## AI capabilities

The `shop-floor` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). It has no domain-prefixed AI engine of its own; it reasons via the live-validated generic reasoning bridge.

- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:
  `node scripts/lib/galaxy-reasoning-bridge.mjs shop-floor "<question>"`
- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (owned-by-slot, documented-by) connect it to the system-viz graph.
- **LoRA** -- this galaxy is fed into the vault->LoRA training dataset (`shop-floor_synthesis.md`).
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
