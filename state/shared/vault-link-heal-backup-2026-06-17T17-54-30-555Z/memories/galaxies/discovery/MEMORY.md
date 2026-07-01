---
type: galaxy-index
galaxy: discovery
source: prism-galaxy-index
synced: 2026-06-17T17:52:56.975Z
aliases: [discovery-galaxy-index]
---
# TANGO Galaxy Memory — Algorithm, Engine & Pipeline Discovery (per-domain working brain)

Append-only cross-session memory for the tango slot. Older detail collapses to memory pointers.

## Master-brain link
> Clones `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical). Connection = PULL + PUSH + master-index back-pointer + recall.
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="discovery duplication-guard master-index orphan audit" topK=20` (MCP-down fallback: `node scripts/system-viz-query.mjs find <term>`)
- **DOWN (push to master):** write `<type>_tango_<topic>.md` → `C:/Users/wompu/.claude/projects/H--prism/memory/` → mirrored to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` at Stop
- **MASTER-INDEX edge:** master `MEMORY.md` `### Galaxy brain back-pointers` carries the `[galaxy:discovery] …` row (added 2026-05-29 — verify it persists)
- **Last master-sync:** 2026-05-29   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/discovery_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Discovery Work Continuity:** Implement fallback scripts when the MCP server is down to ensure discovery work does not stall [reference/reference_tango_mcp_down_fallbacks_2026_05_29].
- **Orphan and Coverage Gap Management:** Every discovered orphan or coverage gap must be triaged with a build/wire/archive decision [feedback/feedback_tango_orphan_needs_decision].
- **Wiki Documentation:** Create wiki entries for every bug finding shipped during the session [feedback/feedback_always_update_wiki_on_bug_finding].
- **Build Process:** Follow WIRE -> TEST -> VALIDATE -> APPLY-TO-ALL-GALAXIES before declaring a build "done" [feedback/feedback_wire_test_validate_all_galaxies].
- **Durable Domain Memories:** Write durable memories as you go during DISCOVER phases [feedback/feedback_domain_discovery_memories].
- **Tool Deduplication:** Check existing audit scripts before writing new ones to avoid duplication [feedback/feedback_tango_dedup_audit_tooling].
- **Audit Script Execution:** Run standing pipeline-coverage audit scripts and surface deltas [reference/reference_tango_audit_surfaces_2026_05_29].

## Indexed memories
- **Domain corpus (live counts):** 28 curated memory file(s) · 123 wiki entr(y/ies) · 48 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 28 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="discovery" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_cross_session_duplication.md` · `knowledge/memories/_legacy-root/reference_system_viz_fs_coverage_ms0.md` · `knowledge/memories/_legacy-root/reference_system_viz_fs_coverage_ms0_phase23.md` · `knowledge/memories/_legacy-root/reference_system_viz_fs_coverage_ms1_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_u_ms1_u5_blueprint_coverage_floor_guard.md`
- **Sample wiki:** `knowledge/wiki/os/commands/dispatcher-coverage.md` · `knowledge/wiki/os/commands/master-index.md` · `knowledge/wiki/os/commands/skill-trigger-coverage.md` · `knowledge/wiki/lessons/cad-fusion-live-ms0-integration-discovery.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/duplication-guard-discipline.md` · `knowledge/wiki/code-tribal/obsidian-graph-view-discovery.md` · `knowledge/wiki/code-tribal/wiki-index-and-discovery.md`

## Cross-galaxy bridges
- `engines/system-viz/` (sierra) — discovery RUNS on top of the system-viz graph; tango is sierra's primary consumer (graph → master-index → query)
- `engines/wiring/` (romeo) — tango FINDS orphans; romeo WIRES them. tango's `audit-unwired-engines` output is romeo's input queue
- `engines/ai-training/` (india) — tango feeds duplicate-finds + orphan classifications back as GNN training signal (xproc feature emission)
- `engines/agent-orchestration/` — tango findings flow into orchestrator routing decisions
- `engines/token-optimization/` (alpha) — alpha reads tango's coverage output to find token-waste hotspots; tango uses alpha's search-first discipline
- ALL galaxies — tango audits every domain for orphans/duplicates/close-out debt

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Alpha Pre-scaffold Completion:** Ensure existing scaffolds are completed before building a new galaxy [feedback/feedback_tango_complete_not_clobber].
- **MCP Boot Grace Dormant Wiring:** Investigate and activate the dormant boot-grace flap-prevention feature in MCP [reference/reference_mcp_bootgrace_dormant_wiring_2026_06_04].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Standing focus (tango-canonical)

1. **Duplicate prevention is the highest-leverage hygiene** — every prevented re-creation saves a milestone of refactor pain. `duplicationGuardEngine.mustCheckBeforeCreating()` THROWS by design; warn-only is a bug.
2. **Search-first doctrine** — `prism_session:master_index_query` answers most "where is X / is Y wired / is Z built" in one call. Grep is fallback below ~0.5 confidence. ([[feedback_master_index_system_viz_first]])
3. **Pipeline-coverage audits** — `audit-unwired-engines.mjs` + `audit-roadmap-drift.mjs` + `audit-close-out-candidates.mjs` + `audit-orphan-inventory` are the standing surfaces; diff each run against the last, surface deltas.
4. **Every orphan needs a decision** — build / wire / archive; never silently leave an L8 stub or a coverage gap (R12 — name what was dropped).
5. **Dedup the audit tooling too** — before writing a new audit script, check `scripts/audit-*.mjs` + `dev-tool-conflict-detector.mjs`; N tools measuring one metric slightly differently is its own drift class.

## High-ROI memories (PULL target — top master hits, ≤140 chars each)

- [[feedback_master_index_system_viz_first]] — search-first: system-viz + master-index + graphs BEFORE Grep/Glob/Agent; Grep is <0.5-confidence fallback
- [[reference_master_index_surface]] — master-index surface: query/node-status/utilization-dashboard + skills + knobs
- [[reference_awareness_stack]] — awareness inject stack (SessionStart digest + per-prompt top-5)
- [[feedback_auto_close_out]] · [[feedback_roadmap_close_out]] · [[feedback_always_close_out]] — close-out debt: 5 surfaces, advisory, human-verify, never auto-flip
- [[reference_master_index_query_telemetry_2026_05_20]] · [[reference_master_index_sidecar_2026_05_19]] · [[reference_master_index_hit_counter_2026_05_18]] — master-index telemetry + sidecar + hit counter
- [[reference_hook_orphan_reconcile_2026_05_17]] · [[reference_hook_orphan_validator]] — hook orphan reconcile + validator (coverage class)
- [[reference_feature_gap_audit_cad_dedup_wins_2026_05_18]] — dedup wins from the CAD feature-gap audit
- [[reference_audit_awareness_substrate_2026_05_26]] — audit-awareness substrate (AUDIT-REGISTRY staleness)
- [[reference_loop_inject_dedup_2026_05_18]] — dedup inside the /loop iteration inject

## Indexed memories — tango's own (this galaxy's per-file index)

- [[reference_algorithm_scope_enumeration_audit_2026_05_26]] — 58-algorithm scope enumeration audit (slot:tango)
- [[reference_u_axis2_numeric_dialect_2026_05_26]] — numeric-precision dialect drift detector (slot:tango)
- [[reference-tango-testing-infra-2026-05-25]] — tango testing infrastructure baseline
- [[reference-u-axis1-viz-closure-2026-05-26]] — Axis-1 viz closure
- _new this buildout 2026-05-29:_ [[reference_tango_galaxy_buildout_2026_05_29]] · [[reference_tango_discovery_engine_map_2026_05_29]] · [[reference_tango_mcp_down_fallbacks_2026_05_29]] · [[feedback_tango_schema_read_first]] · [[feedback_tango_dedup_audit_tooling]] · [[reference_tango_audit_surfaces_2026_05_29]] · [[feedback_tango_orphan_needs_decision]] · [[reference_tango_tribal_capture_fallback_2026_05_29]] · [[reference_tango_stale_slot_worktree_2026_05_29]] · [[feedback_tango_complete_not_clobber]]

## Initial state (2026-05-29 baseline — domain inventory)

**Anti-dup engines:** DuplicationGuardEngine (THROWS), BloomDedupEngine, KnowledgeDeduplicationEngine; helper `.claude/helpers/duplication-guard.mjs`.
**Search/index engines:** MasterIndexEngine, MasterIndexGenerator, PRISMSelfAwarenessEngine, CodeSystemIndexEngine, GlobalSearchEngine, AwarenessQueryEngine, CapabilityIndexEngine, CapabilityCensusEngine, WikiIndexMaintainerEngine.
**Coverage/orphan auditors:** EngineUtilizationAuditorEngine, SystemUtilizationAuditEngine, HookCoverageMaximizerEngine, SkillLibraryAuditEngine, CrossRegistryJoinEngine, HookRegistryReaderEngine.
**Dispatcher surface:** `prism_session:{master_index_query, master_index_node_status, master_index_utilization_dashboard, dispatcher_map_compact, self_awareness_*}` · `prism_guard:{dup_guard_check, dup_guard_summary}` · `prism_dev:{dedup_*, wiring_potential, impact_find_orphans, capability_census, svi_ranked_backlog, self_awareness_*}`.
**Skills:** /dedup /master-index /find /orphan-inventory /dispatcher-coverage /coverage-by-domain /close-out-audit /awareness-snapshot /utilization-dashboard /wire-unwired /deep-search (full list in TOOLBELT.md).
**Hooks (wired):** duplication-hard-block, dedup-auto-invoke, master-index-precheck-inject, inventory-check-guard, build-create-detector, grep-index-first, pre-grep-graph-inject, stop_on_unwired_assets, audit-viz-first.

## Known regression classes (domain-specific R12 lessons)

- **Schema-read-blindness in META tools** — a META/audit tool assumes a v1 schema vs v2 actual and reports a false zero (caught 2026-05-17 high-roi-skill-rank reading wrong fields). READ THE SCHEMA of the parsed file before believing a surprising zero. ([[feedback_tango_schema_read_first]])
- **200MB master-index cap on a 331MB graph** — silent-fail fleet-wide unified search; the cap must track graph size.
- **Pre-extracted vendor re-extraction** — `extraction-log.json` IS the registry; bypass = thousands of duplicate engines (`mustNotReExtract` THROWS).
- **Multi-audit-tool drift** — N audit scripts each measuring the same metric slightly differently; dedup the tooling.
- **system-graph.json concurrent writers** — 3-way write race (3 generators) caught 2026-05-17; atomic-read discipline + per-writer OUT_FILE.
- **Stale slot worktree** — `slot/tango` was ~1900 commits behind integration at this buildout; galaxy work lands on `cad-fusion-live-ms0` ([MAIN]) like every sibling galaxy, NOT on the slot branch. ([[reference_tango_stale_slot_worktree_2026_05_29]])

## Cross-galaxy bridges (PSN edges OUT)

- `engines/system-viz/` (sierra) — discovery RUNS on top of the system-viz graph; tango is sierra's primary consumer (graph → master-index → query)
- `engines/wiring/` (romeo) — tango FINDS orphans; romeo WIRES them. tango's `audit-unwired-engines` output is romeo's input queue
- `engines/ai-training/` (india) — tango feeds duplicate-finds + orphan classifications back as GNN training signal (xproc feature emission)
- `engines/agent-orchestration/` — tango findings flow into orchestrator routing decisions
- `engines/token-optimization/` (alpha) — alpha reads tango's coverage output to find token-waste hotspots; tango uses alpha's search-first discipline
- ALL galaxies — tango audits every domain for orphans/duplicates/close-out debt

## Wiki cross-refs

- [[architecture/master-index-surface]] (EXISTS) · [[architecture/duplication-guard-discipline]] (tango-authored) · [[architecture/awareness-stack]]
- [[lessons/orphan-rescue-class]] (tango-authored; cross-links the existing `architecture/_orphans-rescue.md` hub) · [[lessons/discovery-meta-tool-schema-blindness]] (tango-authored)

— Scaffolded 2026-05-28 by slot:alpha; completed to full galaxy 2026-05-29 by slot:tango claude-2c3adfc7 (U-PSGB-TANGO).

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Algorithm/engine/pipeline discovery + anti-duplication. Primary corpus is the PRISM master-index + ENGINE_DIGEST (internal).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/discovery/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
