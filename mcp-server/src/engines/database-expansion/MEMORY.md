# Database-Expansion Galaxy MEMORY.md — per-domain working brain

## Master-brain link
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
  — recall: `prism_memory:semantic_search query="database qdrant postgres schema migration atomic-write" topK=20`
- **DOWN (push to master):** write `<type>_juliett_<topic>.md` →
  `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:database-expansion] …` back-pointer (verify it exists)
- **Last master-sync:** 2026-05-29   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work

> 2026-05-29 PULL was **keyword-based** (MCP server DOWN this session — `prism_memory:semantic_search` unavailable). Re-run the live recall query next session when MCP is up and reconcile new hits into `## High-ROI memories`.


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/database-expansion_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Heap Size Management**: Increasing default heap size to mitigate OOM-kills due to accumulated retained references from peer chats [reference/reference_mcp_oom_heap_bump_2026_05_23].
- **Context Economy Clusters**: Deliberate use of context-economy clusters, such as setting `PRISM_MEMORY_INDEX_INJECT='0'` in settings.json to manage memory usage efficiently [reference_memory_index_inject_disabled_finding_2026_06_01].
- **Hybrid Memory Retrieval**: Implementing hybrid BM25+dense(nomic)+RRF recall in memory-index-search-lib.mjs for improved recall performance [reference_alpha_hybrid_memory_retrieval_a6_2026_05_29].
- **Memory Leaks and Resource Contention**: Multiple instances of memory leaks leading to server crashes or unavailability. For example, leaked `node dist/index.js` instances causing bind contention [reference_mcp_multi_instance_leak_3100_2026_06_02], orphaned servers starving the box [reference_mcp_orphan_server_leak_2026_05_29].
- **Fallback Mechanisms**: Implementation of fallbacks for critical services when primary systems fail. For instance, `prism_memory:semantic_search` failing over to memory-relevance Write-hook index when Qdrant is down [reference_bravo_qdrant_down_fallback], and script/CLI fallbacks for discovery dispatcher actions when MCP server is down [reference_tango_mcp_down_fallbacks_2026_05_29].
- **Configuration Conflicts**: Contradictory configuration settings causing operational issues. An example is the two contradictory cwd conventions in PRISM MCP daemon [reference_mcp_cwd_convention_conflict_2026_06_08].

## Indexed memories
- **Domain corpus (live counts):** 18 curated memory file(s) · 239 wiki entr(y/ies) · 22 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 17 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="database-expansion" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/reference_psn_qdrant_revive_2026_05_24.md` · `knowledge/memories/_legacy-root/reference_h8_coordination_store.md` · `knowledge/memories/reference/reference_bravo_qdrant_down_fallback.md` · `knowledge/memories/reference/reference_delta_template_store_format_2026_05_31.md` · `knowledge/memories/reference/reference_embed_tribal_jsonl_2026_05_26.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/jsonl-ledger-conventions.md` · `knowledge/wiki/architecture/database-expansion-atomic-write-discipline.md` · `knowledge/wiki/architecture/database-expansion-galaxy.md` · `knowledge/wiki/architecture/database-expansion-schema-versioning.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/schema-migration-patterns.md` · `knowledge/wiki/code-tribal/learnings/blackwell-db-gen-ms0-u-db-b1-lf-restore.md` · `knowledge/wiki/code-tribal/learnings/cheap-node-access-ms0-u-nodecard-test-restore.md`

## Cross-galaxy bridges
- `engines/system-viz/` (sierra) — sierra writes the canonical `system-graph.json`; juliett audits its schema discipline + merge-guard. PRODUCES juliett's biggest read target.
- `engines/ai-training/` (india) — india CONSUMES Qdrant + embedding-file persistence (the vector store NN-1 reads); juliett owns underlying store health.
- `engines/discovery/` (tango) — `cross-session-asset-registry.json` + `extraction-log.json` are juliett-owned, tango-CONSUMED (duplication guard reads them).
- `engines/token-optimization/` (alpha) — alpha audits read-cost of juliett's stores; `token-economy-stats.json` + per-session ledgers.
- `engines/hermes-zulu/` (bravo+zulu) — soul-file frontmatter store + `weekly-hermes-reflection-*.md` sidecars.
- `engines/fleet-hygiene/` (golf) — golf's reaper sweeps juliett-domain stale locks + tmp orphans; shared concern on the atomic-write failure layer.
- `engines/quoting/` (charlie) — CONSUMES the JM die database (DocuStrata sales-orders/quotes); charlie's docustrata-extractor-spec feeds quoting, juliett owns the consolidated store.
- `engines/post-processor/` (echo) — CONSUMES JM-DIE g-code/program files (files.jsonl) for post training. **Ingestible corpora for DB-indexing** (echo-enumerated 2026-05-29 — instant pathways in echo `PATHS.md §Domain data corpus` + [[reference_echo_post_data_corpus_paths]]): **160,582** NC programs (.nc/.min/.eia/.tap/.ngc/.pgm — Okuma-lathe dominated; `mcp-server/data/programs/okuma/` + `JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/Okuma_<machine>/`) · **13,790** `.cps` posts (`…/posts/fusion-cache`, `resources|BOX/FUSION BASIC POSTS`, `HSMWorks 202{6,7}/posts`, 12 JM production) · **52** Mastercam `.pst/.spm` · **14** controller/dialect DATA files (`mcp-server/src/data/okuma-dialect-knowledge.ts` + `*-post-strategies.json` + `controller-knowledge*`). These are the repo's largest structured NC corpus — prime juliett DB-index targets.
- `engines/business/` (hotel) — CONSUMES the J.M. Tool & Die vendor/financial report + accounting docs (SCAN_BUSINESS, INVOICE, TAX_FINANCIAL roles).

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **PRISM_ROOT/import.meta.url Resolution**: The need to resolve PRISM_ROOT/import.meta.url instead of relying on cwd conventions remains unresolved [reference_mcp_cwd_convention_conflict_2026_06_08].
- **Boot Guard Activation**: The boot guard feature is built but dormant, requiring activation by setting `PRISM_MCP_WATCHDOG_BOOTGUARD` to ON [reference_mcp_bootgrace_dormant_wiring_2026_06_04].
- **Conflict Resolution Engine**: The MemoryConflictResolverEngine needs further research and implementation for external systems mapping and integration [reference_d3_conflict_resolution_2026_05_16].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## High-ROI memories (PULL target — top master hits as pointers)
- [[reference_session_continuity_stack_2026_05_15]] — cross-session state + schema-migration discipline
- [[reference_u_regen_viz_merge_faillod_2026_05_17]] — stale-graph silent-corruption (SIGKILL on merge subprocess)
- [[reference_lintstaged_noop_config_eats_commits]] — schema-read regression class (config that silently eats commits)
- [[feedback_never_delete_only_disable]] — ledgers/JSONL: rotate or disable, never delete (telemetry value)
- [[feedback_no_git_stash_shared_tree]] — `git show <ref>:<path>` for old versions, never stash in shared tree
- [[feedback_reflect_all_changes_post_update]] — every change touches 4 surfaces (CLAUDE.md + MEMORY.md + wiki + Obsidian)
- [[reference_juliett_devtools_synergy_map_2026_05_17]] — juliett's own devtools↔unit integration map (S1-S10 + T1-T5)
- [[reference_juliett_12chat_allocation_2026_05_17]] — juliett's 17-unit 12-slot ROI allocation (5 waves)
- wiki [[architecture/knowledge-vault-schema]] — 5-namespace store + schemaVersion + promotion path
- wiki [[architecture/ledger-store]] — LedgerStoreEngine SQLite WAL (better-sqlite3, schema v2)

## Standing focus (juliett-canonical)

1. **Atomic writes for everything multi-writer** — `atomicWriteJson` from `scripts/lib/atomic-json.mjs`. The `roadmap-index.json` 5-writer race (3 non-atomic) is the canonical case study (DEV-TOOL-CONFLICT-AUDIT F4). Goal: zero non-atomic writers fleet-wide.
2. **Schema-version discipline** — every state JSON has `schemaVersion`. META tools probe-then-read (`if ('totals' in j)` style). N-1 back-compat for at least one minor.
3. **Migration safety** — schema bumps land WITH a migration in `mcp-server/src/migrations/`; never silently mutate on load.
4. **AgentDB V3 unification** — collapse 6+ memory systems into the unified backend (ADR-006/009) for 150x-12,500x search improvement; juliett gates promotion behind real-benchmark numbers.

## Initial state (2026-05-29 baseline — 4-agent inventory)

- **~18 persistence engines** on disk: Qdrant family (5 — `QdrantMemoryEngine`, `…Singleton`, `…VectorBridgeEngine` over 14 MemoryKind collections, `QdrantVectorStoreEngine`, `QdrantCapacityPlannerEngine`); memory-fabric (`AgentMemoryFabricEngine`, `MemoryGraphEngine`, `MemoryConsolidationEngine`, `PersistentMemoryEngine`, `MemorySyncEngine`); migration (`MigrationEngine`, `SchemaMigrationRollbackEngine`, `AutoSchemaGeneratorEngine`); ledger (`CoordinationStoreEngine`, `CoordinationLedgerEngine`, `LedgerStoreEngine`); `OllamaEmbedderEngine`.
- **prism_memory** is the primary dispatcher: `semantic_search`, `vector_search_unified`, `qdrant_vector_search/upsert`, `agent_memory_remember/query/reinforce/forget/stats`, `embed_text`, `consolidate`, `get_health`, `run_integrity`. Plus `prism_context:memory_externalize/restore` + `prism_data:database_list/search`.
- **Migrations dir** (`mcp-server/src/migrations/`): `golf-ledger-v1.sql`, `golf-ledger-v2.sql`, `stateMigrations.ts`. Only 3 — most state files are versioned-by-convention, not by a migration script (migration debt).
- **Stores on disk**: wiki `_embeddings.jsonl` (103.5M) + `_leaf-index.jsonl` (17.3M); `system-graph.json` (548.9M); `roadmap-index.json` (378K); `MILESTONE_PROGRESS.json` (2.1M); `cross-session-asset-registry.json` (1.6M). NO `coordination.sqlite` present yet (engine-created on first write).
- **Tribal store**: machining tips in `state/tribal_captured_tips.json` (no `slot` field); per-domain corpora follow the `state/shared/<domain>-tribal-corpus.jsonl` pattern (cad/cam exist) → juliett's lives at `state/shared/database-expansion-tribal-corpus.jsonl`.

## Known regression classes

- **N-writer race on one path** — `system-graph.json` had 3 writers, `roadmap-index.json` has 5 (3 non-atomic), `error-memory.json` + `skill-usage-stats.json` are latent-race (orphan hooks). Canonical-writer designation is the fix.
- **Schema-read-blindness in META tools** — `high-roi-skill-rank.mjs` against schema-v2 `ollama-offload-stats.json` reported 0/0/0 against a working route (2026-05-17). Pre-mortem: every META tool starts with a schema probe.
- **JSONL ledger truncation under signal-kill** — `regen-viz.mjs` merge subprocess SIGKILLed → ~99K-node stale graph + post-stages continued silently (2026-05-17 U-REGEN-VIZ-MERGE-FAILLOUD). Pre-mortem: snapshot pre/post node-count, abort on shrink.
- **Stale-cron-lock blocking writes** — `.cron-locks/*.lock` from a crashed peer holds the path indefinitely. Reaper sweeps zero-byte locks aged >3s.
- **memory-relevance fleet-wide 0% recall** — 2026-05-15 P0 (memory-relevance-inject) — silent fleet-wide regression. Pre-mortem: every persistence path needs a query-side smoke test, not just write-side.
- **Atomic-write tmp-orphan leak (NEW 2026-05-29)** — `state/shared/tribal-embed-index.json.<pid>.tmp` had **46 orphans, ~16 GB** — crashed/overlapping `atomicWriteJson` (or its writer) leaving tmp files that the rename never consumed. The tmp+rename pattern is only safe if the tmp is cleaned on failure AND a single writer holds the path. Fix is a writer-side `finally`-unlink + a janitor sweep of `*.json.*.tmp` aged > N min (golf/reaper-adjacent). Do NOT bulk-delete live — a write may be in flight; sweep by age + dead-PID, not blindly. See [[reference_juliett_tmp_orphan_leak_2026_05_29]].

## Cross-galaxy bridges (PSN edges OUT)

- `engines/system-viz/` (sierra) — sierra writes the canonical `system-graph.json`; juliett audits its schema discipline + merge-guard. PRODUCES juliett's biggest read target.
- `engines/ai-training/` (india) — india CONSUMES Qdrant + embedding-file persistence (the vector store NN-1 reads); juliett owns underlying store health.
- `engines/discovery/` (tango) — `cross-session-asset-registry.json` + `extraction-log.json` are juliett-owned, tango-CONSUMED (duplication guard reads them).
- `engines/token-optimization/` (alpha) — alpha audits read-cost of juliett's stores; `token-economy-stats.json` + per-session ledgers.
- `engines/hermes-zulu/` (bravo+zulu) — soul-file frontmatter store + `weekly-hermes-reflection-*.md` sidecars.
- `engines/fleet-hygiene/` (golf) — golf's reaper sweeps juliett-domain stale locks + tmp orphans; shared concern on the atomic-write failure layer.
- `engines/quoting/` (charlie) — CONSUMES the JM die database (DocuStrata sales-orders/quotes); charlie's docustrata-extractor-spec feeds quoting, juliett owns the consolidated store.
- `engines/post-processor/` (echo) — CONSUMES JM-DIE g-code/program files (files.jsonl) for post training. **Ingestible corpora for DB-indexing** (echo-enumerated 2026-05-29 — instant pathways in echo `PATHS.md §Domain data corpus` + [[reference_echo_post_data_corpus_paths]]): **160,582** NC programs (.nc/.min/.eia/.tap/.ngc/.pgm — Okuma-lathe dominated; `mcp-server/data/programs/okuma/` + `JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/Okuma_<machine>/`) · **13,790** `.cps` posts (`…/posts/fusion-cache`, `resources|BOX/FUSION BASIC POSTS`, `HSMWorks 202{6,7}/posts`, 12 JM production) · **52** Mastercam `.pst/.spm` · **14** controller/dialect DATA files (`mcp-server/src/data/okuma-dialect-knowledge.ts` + `*-post-strategies.json` + `controller-knowledge*`). These are the repo's largest structured NC corpus — prime juliett DB-index targets.
- `engines/business/` (hotel) — CONSUMES the J.M. Tool & Die vendor/financial report + accounting docs (SCAN_BUSINESS, INVOICE, TAX_FINANCIAL roles).

## DocuStrata + JM-file database (PRIMARY, operator 2026-05-29)

Juliett is primary slot for the DocuStrata + JM-file database. `H:/PRISM/Docustrata/` (257,992 files, pre-extracted by `docustrata-pipeline.py` into `.index/*.jsonl`) → consolidated by `scripts/build-jm-die-database.mjs` → `mcp-server/data/jm-die-database/` (schemaVersion 1.0.0): 111,745 docs + 38,251 JM-DIE files + 76,205 blueprint-program joins + the J.M. Tool & Die vendor report (QuickBooks Purchases-by-Vendor 2014-2026, 5.28M chars). Reuse-not-re-OCR (R8). See [[reference_juliett_jm_die_database_2026_05_29]] + wiki [[jm-die-database]].

## Wiki cross-refs

- [[architecture/knowledge-vault-schema]] · [[architecture/ledger-store]]
- [[architecture/database-expansion-atomic-write-discipline]] · [[architecture/database-expansion-schema-versioning]] (juliett-authored 2026-05-29)
- [[reference_u_regen_viz_merge_faillod_2026_05_17]] (stale-graph silent-corruption)

— Established 2026-05-28 by slot:alpha (scaffold); **owned + completed 2026-05-29 by slot:juliett claude-a6304a93** (U-PSGB-JULIETT: master-brain link, High-ROI pull, inventory baseline, tmp-leak finding).

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
All persistence stores (Qdrant/AgentDB/SQLite-WAL/JSONL/state-JSON) + vector indexing.
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/database-expansion/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**Authoritative free external sources (VERIFIED, papa AI/software domain):**
- [Malkov & Yashunin - Efficient and robust ANN search using HNSW (arXiv)](https://arxiv.org/abs/1603.09320)
- [SQLite - Write-Ahead Logging (WAL)](https://www.sqlite.org/wal.html)
R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
