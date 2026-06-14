# Wiring Galaxy MEMORY — ROMEO slot cross-session learnings

> Append-only. Pointer-style. ≤200 lines · ≤140 chars/entry. Older entries archive to MEMORY-ARCHIVE.md.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="wiring" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:wiring]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/wiring_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Course Department Classification**: Courses are consistently classified under their respective departments, which helps in organizing and referencing them.
- **Category Assignment**: Each course is assigned a category that reflects its content, aiding in quick identification of relevant material.
- **Linking to Consuming Engines**: Courses related to specific domains (e.g., optimization) are linked to engines designed to handle or apply the knowledge from those courses.
- **Departmental Focus**: Courses are primarily categorized under departments such as Mathematics / EECS, Sloan / ESD, and Materials Science / Chemical Engineering.
- **Course Categories**: The courses fall into categories like `statistics`, `optimization`, `systems`, and `other`.
- **Consuming Engines**: Certain courses are linked to specific consuming engines, indicating their application in particular systems or processes. For example, courses on optimization are often linked to the `paretooptimizeengine`.

## Indexed memories
- **Domain corpus (live counts):** 56 curated memory file(s) · 7967 wiki entr(y/ies) · 40 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 7178 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="wiring" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_dont_wire_for_wiring_sake_2026_05_16.md` · `knowledge/memories/_legacy-root/feedback_settings_wiring_drift_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_h7_async_hook_dispatcher.md` · `knowledge/memories/_legacy-root/reference_harness_wiring_audit_aam04_2026_05_16.md` · `knowledge/memories/_legacy-root/reference_hook_wiring_audit_2026_05_15.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/dispatcher-action-design.md` · `knowledge/wiki/os/commands/dispatcher-coverage.md` · `knowledge/wiki/os/commands/ollama-route-check.md` · `knowledge/wiki/os/commands/route-suggest-stats.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/dispatcher-wiring-pattern.md` · `knowledge/wiki/code-tribal/learnings/blackwell-token-synergy-ms0-u-bw-auto-route-allowlist.md` · `knowledge/wiki/code-tribal/learnings/blackwell-token-synergy-ms0-u-bw-route-profile.md`

## Cross-galaxy bridges
- [[../discovery/MEMORY.md]] — tango's orphan-rescue history is romeo's lookahead
- [[../bug-hunting/MEMORY.md]] — uniform's silent-failure findings tell romeo which prior wires regressed
- [[../backend-helper/MEMORY.md]] — papa's TSC-fix campaigns inform what NOT to wire mid-fix

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Course Titles**: Many course entries have titles pending, suggesting that formal naming or further documentation is needed for these courses [reference/node_course_mit_1_010_fall_2008] through [reference/node_course_mit_16_a47_fall_2009].
- **Completion of Operator Directives**: The operator directive from the hotel /loop wiki+tribal high-ROI pivot mentions "finish last task before" but does not specify what the last task is, leaving this as an open point [reference/reference_pivot_wiki_tribal_2026_05_21].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Standing patterns (load-bearing across all wiring sessions)

- **Table-driven ACTION_MAP is canonical** — `audit-unwired-engines.mjs` reads each dispatcher's action enum directly (fixed 2026-05-18 `9e27d9d42`). Don't reinvent the scanner; consume its JSON output.
- **Wiring batch cap = 5 engines per commit** — keeps the 3-of-3 scrutiny gate tractable. >5 → split into multiple [WIRING] units, each commits separately.
- **Round-trip tests live in `mcp-server/src/__tests__/`** — NOT `src/engines/__tests__/`. `stop_on_unwired_assets` only scans the former (per [[feedback_engine_tests_in_tests_dir]]).
- **`// WIRE-EXEMPT: <reason>` tag** — only escape for engines genuinely wrapped by a singleton (e.g. QdrantMemoryEngine ← QdrantMemoryEngineSingleton). Use sparingly; auditor honors it.

## Initial state (2026-05-28 baseline at galaxy birth)

- **593 unwired engines** per `/awareness-snapshot` (state/shared/AWARENESS-SNAPSHOT.md)
- **3604 wired** · **82% dispatcher coverage** (2771 of 3364 domain-tracked engines)
- **Top-3 unwired orphan ranks** (built+documented): AISubsystem · Agent · Alarm (L7/built per awareness snapshot)

## Wiring sessions

> Append new entries here. Each session: `## YYYY-MM-DD — <N> engines wired by claude-<id>`

## 2026-06-11 — ERPImportEngine wired by claude-a8796b17 (slot:romeo)
- **U-WIRE-ERPIMPORT** (commit `d6e25e2222` on **slot/romeo**): `ERPImportEngine` -> `prism_business`, 7 actions (`erp_import_work_order/_import_batch/_validate_work_order/_field_mappings/_transform_from_raw/_get_work_order/_list_work_orders`). Static-method class, in-memory work-order/BOM/routing staging from SAP/Oracle/JobBOSS/E2/Epicor/Infor. 21-case round-trip test + 2-of-2 per-file scrutiny PASS (1 P1 fixed: validity-gate ERP system on get/list).
- **NEW commit-lane rule** ([[feedback_romeo_commit_to_slot_branch]]): operator 2026-06-10 fleet-wide — romeo commits to its own `slot/romeo` branch in `H:/prism-slot-romeo`, NOT shared `cad-fusion-live-ms0`. Lead commit subject `[slot/romeo]` (a bare `[WIRING]` scope false-routes to wire-unwired worktrees). A blocked commit unstages -> re-`git add`.
- **BLOCKER for this galaxy:** the romeo worktree `node_modules` lacks **vitest + typescript** -> wires can't be vitest/tsc-verified in-place. Interim: verify the identical wire on cad-fusion-live-ms0 (where the toolchain works), confirm the engine is byte-identical across branches, esbuild-transform + bijection-check the slot/romeo file, then commit. **Fix: run `npm ci` in `H:/prism-slot-romeo/mcp-server` once.**
- **Divergence:** slot/romeo is 24-ahead/3000-behind cad-fusion-live-ms0 on businessDispatcher + core dispatchers/schemas; romeo's real wiring history (JMDB/DocuStrata/db-coverage-gapfill/cimco) lives on cad-fusion-live-ms0. The slot/romeo->MAIN merge is romeo's own job ([[feedback_each_slot_merges_own_galaxy]]).
- **U-WIRE-SUBPROG** (commit `097f923974` slot/romeo, iter2): SubprogramExtractionEngine -> prism_pp, 3 actions (pp_subprog_extract/_quick_check/_estimate_savings). Repeated G-code -> Fanuc/Siemens/Okuma subroutines. 12-case test + 2-of-2 scrutiny. R12-honest: extract's reduction_pct is a known engine STUB (pinned ===0 in test); real value = subprograms[] bodies + pattern detection. prism_pp slims result BEFORE stringify -> wrap booleans + add count fields. Worktree tests now work (npm install) = fast path.
- **U-WIRE-MEASURE** (commit `e763f5252c` slot/romeo, iter3): MeasureSummaryEngine -> prism_quality, 7 actions (measure_add/_generate_summary/_get_summary/_list_summaries/_quality_trend/_parts_with_issues/_export_summary) + 7 Zod schemas in qualityActionSchemas.ts. CMM/surface/probe/vision QC aggregation -> passRate/Cpk/disposition. 18-case test + 2-of-2 scrutiny. LESSON: qualityDispatcher has a validateActionParams schema gate (LENIENT: no-schema=pass, but enum fields like `source` DO enforce -> defense-in-depth) + slims BEFORE stringify (use found/count). FOUND pre-existing collision: `measure_summary` token in BOTH integration+intelligence dispatchers (NOT my actions) -> [[reference_measure_summary_dispatcher_collision_2026_06_11]].
- **U-WIRE-BARREMNANT** (commit `98693a6363` slot/romeo, iter4): BarRemnantManagementEngine -> prism_turning, 4 actions (bar_remnant_plan/_record/_count_feasible/_stats) + 4 Zod schemas in turningActionSchemas.ts. STATELESS engine (inventory passed in per call) -> fully deterministic test. LESSON: turningDispatcher (+ quality/pp) normalizeParams is TOP-LEVEL-ONLY (no recursion), so nested snake_case job/inventory objects pass through INTACT -> engine reads job.part_length_mm directly (no camel mangling). 12-case test (independently-traced reuse math) + 2-of-2 scrutiny ZERO P0/P1.
- **Live unwired count:** 64 dormant engines (`state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json`, regen 2026-06-10). AVOID XProcNeuralAutoFireEngine (active peer /loop).
- **TRIAGE FINDING (2026-06-11):** SemanticAssetIndexEngine is **NOT** a wire candidate -- it's constructor-dependency-injected (`new SemanticAssetIndexEngine(qdrantStore, embedder, config)`), needs live Qdrant + an embedder, and is consumed by composition (hooks/skills inject deps), not a standalone dispatcher surface. Per [[feedback_dont_wire_for_wiring_sake]] (Qdrant-DOWN = pure overhead) -> DEFER/WIRE-VIA-ENGINE. LocalEmbeddingEngine (the embedder) + FeedbackCollectorEngine likely same infra class. **Prefer self-contained pure-compute MANUFACTURING engines next** (like ERPImportEngine was): SubprogramExtractionEngine (NC parse->prism_cam), MeasureSummaryEngine (metrology->prism_quality), BarRemnantManagementEngine + TurretLayoutEngine + SwissTypeDecisionEngine (lathe->prism_turning). Read each first to confirm static/pure + no live external dep before wiring.

## Known wiring failure modes (regression watchlist)

> Empty until first session ships its lessons. Examples we'd expect:
> - Engine constructor side-effect breaking dispatcher import (race condition with Singleton init)
> - Zod enum order collision (alphabetical vs grouped — pick one and document)
> - dispatcher.ts > 5000 lines → tsc memory pressure → wire to a sub-dispatcher instead
> - Test passes because it imports engine directly, not via wire (silent-success-on-broken-wire class)

## Cross-galaxy memory bridges

- [[../discovery/MEMORY.md]] — tango's orphan-rescue history is romeo's lookahead
- [[../bug-hunting/MEMORY.md]] — uniform's silent-failure findings tell romeo which prior wires regressed
- [[../backend-helper/MEMORY.md]] — papa's TSC-fix campaigns inform what NOT to wire mid-fix

— Established 2026-05-28 by slot:alpha. First entry will land when a romeo session wires its first batch.

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
Engine->dispatcher wiring closure. Primary corpus is the dispatcher registry + stop_on_unwired_assets (internal).
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/wiring/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**External free-source corpus:** none applies -- this domain is PRISM-internal (codebase + wiki + operator article-set). The internal anchors above ARE the corpus. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
