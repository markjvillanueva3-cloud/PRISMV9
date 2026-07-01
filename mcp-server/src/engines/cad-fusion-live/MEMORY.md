# cad-fusion-live Galaxy MEMORY.md

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="cad fusion live" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:cad-fusion-live]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/cad-fusion-live_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Avoid rebuilding unmerged worktrees**: When encountering a 'Could not resolve' build error, self-merge the slot worktree with `cad-fusion-live-ms0` instead of rebuilding. This is detailed in `[feedback/feedback_stale_slot_build_break_escalate_resync]`.
- **Do not move to another CAD software**: Fusion 360 is fully accounted for and should remain the primary CAD tool, as stated in `[reference/reference_delta_fusion_fully_accounted_2026_05_29]`.
- **Check all previous sessions**: Before generating new high-ROI assets, review all prior sessions to ensure completeness. This directive is found in `[reference/reference_delta_cad_asset_generation_2026_05_29]`.
- **Node-indexed pointers**: Used for milestones and formulas, linking to specific documentation. Examples include `[reference/node_milestone_milestone_ghost_ms_cad_fusion_live_ms0_acbridge]` and `[reference/node_formula_formula_adjusted_caddispatcher_action_f360_live_shell]`.
- **Port assignments**: Specific ports are assigned to different Fusion instances (e.g., :18361 for CAM, :18362 for CAD) to prevent conflicts. This is highlighted in `[reference/cam_fusion_live_path_unblocked_2026_06_02]` and `[reference/kilo_fusion_addin_port_fork_2026_05_30]`.
- **Shipping engines**: Engines like `CustomerMaterialMapEngine`, `MillPartClassifierEngine`, and AI-MAX modules are shipped with specific commits and slots. Refer to `[reference/reference_u_ppl_c2_customer_material_map]` and `[reference/u_ppl_a5_mill_part_classifier]`.

## Indexed memories
- **Domain corpus (live counts):** 37 curated memory file(s) · 193 wiki entr(y/ies) · 33 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 57 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="cad-fusion-live" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_cross_session_duplication.md` · `knowledge/memories/_legacy-root/reference_session_2026_05_14_e2_g10_ship.md` · `knowledge/memories/_legacy-root/reference_session_continuity_stack_2026_05_15.md` · `knowledge/memories/reference/reference_charlie_session_close_2026_05_26.md` · `knowledge/memories/reference/reference_delta_cad_toolchain_session_2026_05_27.md`
- **Sample wiki:** `knowledge/wiki/os/sessions/stable-session-id.md` · `knowledge/wiki/os/pipelines/session-cycle.md` · `knowledge/wiki/os/commands/session-cycle.md` · `knowledge/wiki/lessons/cad-fusion-live-ms0-h-drive-archaeology.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/templates/cad-fusion-360__assembly.md` · `knowledge/wiki/code-tribal/templates/cad-fusion-360__boolean-csg.md` · `knowledge/wiki/code-tribal/templates/cad-fusion-360__brep-topology.md`

## Cross-galaxy bridges
- ↔ **cad** (`engines/cad/`) — consumes recognized features; CADFeatureRecognition / CADToSTEP feed the replicate round-trip (memory `reference_delta_cad_training_pipeline_2026_05_31`).
- ↔ **cam** (`engines/cam/`) — emits live toolpaths; the 4 read-only `f360_live_*` CAM introspection actions live in camDispatcher.
- ↔ **mill** / **lathe** — mill-turn live bridge (`Fusion360MillTurnBridgeEngine`); canonical order flow is Fusion CAD (delta) → hyperMILL mill / Fusion-or-Mastercam lathe → Master Post (memory `reference_order_flow_canonical_2026_05_27`).
- ↔ **post-processor** (india) — STEP/post handoff is the canonical CAM-to-G-code boundary.

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Untracked files in main tree**: The H:/prism main tree has a large number of untracked files that need management. This issue is noted in `[reference/reference_main_tree_untracked_work_2026_05_30]`.
- **Canonical branch divergence**: Johnson-Cook single-source canonical exists on slot/oscar but not on `cad-fusion-live-ms0`. The solution involves checking git+memory first before re-fixing. This is mentioned in `[reference/reference_jc_canonical_branch_divergence_2026_06_03]`.
- **Git contentions and plumbing merges**: Git merge/commit/push operations die due to index.lock contention, requiring integration via plumbing commands. This problem is discussed in `[reference/reference_shared_tree_git_contention_plumbing_merge_2026_06_06]`.

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Primary domain
Live, long-running Autodesk Fusion 360 integration: a PRISM-side HTTP client talks to a host-side Python add-in running inside Fusion on `127.0.0.1` loopback, driving real CAD operations (sketch/extrude/fillet/chamfer/revolve/hole/pattern/combine/shell/export/undo/parameter/execute) and reading back actual geometry. Branch-scoped (`cad-fusion-live-ms0`); the bridge is the live transport for the closed-loop "replicate a part to 100% match" workflow and for the mill-turn live handoff. Companion docs: [`CLAUDE.md`](./CLAUDE.md) §1, [`PATHS.md`](./PATHS.md), [`TOOLBELT.md`](./TOOLBELT.md).

## Key engines & paths
- `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts` — PRISM-side client for the Fusion API Server add-in (`http://127.0.0.1:18360`); typed CAD-op methods + ExtractedAction replay; retry backoff `[100,500,2000]`, max 3 retries, per-stage timeouts (toolpath 180s). **Advanced-feature routes (U-CADFL-SWEEP-LOFT, 2026-06-03):** added `sweep()` (profile-along-path, twist/taper) + `loft()` (2+ stacked profiles, solid/surface) dedicated routes + `createSketch({offset_mm})` offset construction-plane → add-in route surface 17→19. Dedicated-route over codegen-via-`/execute` (R7: independent of `PRISM_FUSION_RAW_DISABLE` kill switch). Next intricate-geom routes: coil/helix, draft, rib, web, mirror, path-pattern, surface-loft/NURBS, Form/T-Spline, joints — fn-index map is ~82-85% (NOT the `coverage_state:"COMPLETE"` it claims). See [[reference_delta_sweep_loft_routes_2026_06_03]].
- `mcp-server/src/engines/Fusion360MillTurnBridgeEngine.ts` — Fusion 360 mill-turn machine + spindle handoff (sub-spindle pickup archetypes, zod `SpindleConfigSchema`).
- `mcp-server/src/engines/AutodeskFusionMCPProxyEngine.ts` — JSON-RPC 2.0 client for Autodesk's official MCP (ENGINE_DIGEST line 137).
- `mcp-server/src/engines/FusionProjectCrawlerEngine.ts` — recursive Fusion 360 cloud-project crawler (ENGINE_DIGEST line 1013).
- `mcp-server/src/engines/HyperCADSElectrodeEngine.ts` — TS-side typed electrode engine (7 ops) that ships codegen Python through the hyperCAD-S live bridge; the sinker-EDM electrode value-add Fusion lacks.
- `resources/fusion360/prism-api-server/` — the host-side add-in: `prism_api_server.py` (binds `127.0.0.1:18360`, 17 routes matching the bridge engine; loopback + CORS allowlist + `PRISM_FUSION_RAW_DISABLE=1` kill switch), `manifest.json` (`runOnStartup:false`), `test_prism_api_server.py`, `INSTALL.md`.
- **Dispatcher actions (cad/cam) — verified in source:**
  - `prism_cad`: `f360_live_sketch / f360_live_extrude / f360_live_fillet / f360_live_chamfer / f360_live_revolve / f360_live_hole / f360_live_pattern / f360_live_combine / f360_live_shell / f360_live_export / f360_live_geometry / f360_live_undo / f360_live_new_doc / f360_live_execute_raw` (cadDispatcher.ts L138-141) + `f360_generate_script / f360_from_description / f360_parametric_script / f360_convert_cadquery` (L136) + `cad_f3d_parse / cad_f3d_parse_f3z` (L315-316).
  - `prism_cam`: `f360_live_operations / f360_live_toolpath_validity / f360_live_cycle_time / f360_live_materials` (camDispatcher.ts L1578, read-only CAM introspection) + `fusion_5x_generate / fusion_5x_get_machine / fusion_5x_calculate_angles / fusion_5x_singularity_proximity` (L1417-1419) + `cam_hypermill_millturn_strategy / cam_hypermill_millturn_multichannel / cam_hypermill_millturn_full_strategy` (L1620-1624).

## Standing patterns / invariants
- **NEVER inline a physics/material constant** — import from `mcp-server/src/physics/constants.ts` (project CLAUDE.md §SAFETY). Re-dimension bands and fit tolerances stay with physics-reviewer, not in CAD code.
- **Loopback-only + kill switch** — the add-in binds `127.0.0.1` with a CORS allowlist; raw `/execute` is gated by `PRISM_FUSION_RAW_DISABLE=1`; all paths fail loud (R12). (`prism_api_server.py`, per `cad-fusion-live-ms0-u-fus-apisrv` wiki learning.)
- **UI-thread marshalling** — `adsk.fusion` calls MUST run on Fusion's UI thread; the add-in's HTTP runs on a daemon thread and marshals each request onto the main thread via CustomEvent + threading.Event with a 60s barrier (same learning).
- **Multi-instance isolation is port-claim-driven, NOT automatic** — two Fusion instances binding overlapping ports via `SO_REUSEADDR` cross-route to ONE shared active doc; true isolation needs distinct ports set BEFORE the add-in runs and a behavioral leak-test (timeline jump), not netstat. (memory `reference_delta_fusion_isolation_and_live_bridge_2026_06_01`.)
- **`/new`-first per cycle** — to keep the operator's open part untouched and each candidate at 1 body, drive a `/new` fresh doc first; a non-reset `/extrude operation:"new"` ADDS a body on the real bridge. (memory `reference_delta_live_closed_loop_proven_2026_06_01`.)

## Known assets
- Wiki learnings: `knowledge/wiki/code-tribal/learnings/cad-fusion-live-ms0-u-fus-apisrv.md`, `…u-fus-apisrv-files.md`, `…u-hcs-connector.md`.
- Wiki engine pages: `knowledge/wiki/architecture/engines/fusion/` (fusion360millturnbridgeengine, fusion360functionindexengine, fusion360safetyhooksengine, fusion360aiorchestrationengine, etc.).
- Memories (`C:/Users/wompu/.claude/projects/H--prism/memory/`): `reference_delta_fusion_isolation_and_live_bridge_2026_06_01.md`, `reference_delta_live_closed_loop_proven_2026_06_01.md`, `reference_fusion_scratch_close_enforce_2026_06_01.md`, `reference_delta_cad_training_pipeline_2026_05_31.md`, `reference_order_flow_canonical_2026_05_27.md`.
- Resource roots (PATHS.md): `resources/FUSION360` · `resources/FUSION POSTS` · `resources/fusion-addin` · `JM DIE/FUSION CAD AND CAM FILES` (1,163 native `.f3d` parts, STEP-export for CAM handoff).

## Cross-galaxy edges
- ↔ **cad** (`engines/cad/`) — consumes recognized features; CADFeatureRecognition / CADToSTEP feed the replicate round-trip (memory `reference_delta_cad_training_pipeline_2026_05_31`).
- ↔ **cam** (`engines/cam/`) — emits live toolpaths; the 4 read-only `f360_live_*` CAM introspection actions live in camDispatcher.
- ↔ **mill** / **lathe** — mill-turn live bridge (`Fusion360MillTurnBridgeEngine`); canonical order flow is Fusion CAD (delta) → hyperMILL mill / Fusion-or-Mastercam lathe → Master Post (memory `reference_order_flow_canonical_2026_05_27`).
- ↔ **post-processor** (india) — STEP/post handoff is the canonical CAM-to-G-code boundary.

## Cross-refs
Parent: [`../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md) — galaxy 13. Baseline: [`../CLAUDE.md`](../CLAUDE.md). Sibling: [`./CLAUDE.md`](CLAUDE.md), [`../cad/`](../cad/CLAUDE.md), [`../cam/`](../cam/CLAUDE.md).

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Long-running CAD/Fusion live-session pattern. Primary corpus is the *AutomationBridge engines (internal).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/cad-fusion-live/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
