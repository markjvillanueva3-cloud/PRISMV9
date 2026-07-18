# PATHS.md — database-expansion galaxy (slot:juliett)

> H:/-wide path atlas. Turns future Grep/Glob from O(N) → O(1) for the persistence domain.
> Verified-on-disk 2026-05-29 (slot:juliett claude-a6304a93). Paths marked `(engine-created)` do not exist until first write.
> Format: `<abs-path> | <purpose> | <maintainer-slot>`

## Galaxy home
- `H:/prism/mcp-server/src/engines/database-expansion/CLAUDE.md` | operational scope | juliett
- `H:/prism/mcp-server/src/engines/database-expansion/MEMORY.md` | working brain (master-linked) | juliett
- `H:/prism/mcp-server/src/engines/database-expansion/PATHS.md` | this atlas | juliett
- `H:/prism/mcp-server/src/engines/database-expansion/TOOLBELT.md` | tool-call cheatsheet | juliett
- `H:/prism/state/shared/slot-souls/juliett.md` | slot soul (frontmatter drives slot-soul-inject) | juliett

## Vector / semantic stores (Qdrant)
- `H:/prism/mcp-server/src/engines/QdrantMemoryEngine.ts` | core Qdrant vector store | juliett
- `H:/prism/mcp-server/src/engines/QdrantMemoryEngineSingleton.ts` | singleton wrapper (WIRE-EXEMPT pattern) | juliett
- `H:/prism/mcp-server/src/engines/QdrantMemoryVectorBridgeEngine.ts` | unified search across 14 MemoryKind collections | juliett
- `H:/prism/mcp-server/src/engines/QdrantVectorStoreEngine.ts` | vector embedding ops | juliett
- `H:/prism/mcp-server/src/engines/QdrantCapacityPlannerEngine.ts` | partition + capacity planning | juliett
- `H:/prism/mcp-server/src/engines/OllamaEmbedderEngine.ts` | nomic-embed-text 768-d embedding generation | juliett
- `H:/prism/knowledge/wiki/architecture/_embeddings.jsonl` | wiki int8 nomic vectors (103.5M) | sierra/juliett
- `H:/prism/knowledge/wiki/architecture/_leaf-index.jsonl` | BM25 + cosine recall index (17.3M) | sierra/juliett

## Relational / KV / ledger stores (SQLite WAL)
- `H:/prism/mcp-server/src/engines/CoordinationStoreEngine.ts` | atomic multi-agent work-claim store | juliett
- `H:/prism/mcp-server/src/engines/CoordinationLedgerEngine.ts` | coordination event ledger | juliett
- `H:/prism/mcp-server/src/engines/LedgerStoreEngine.ts` | SQLite WAL ledger (golf slot; better-sqlite3, 50K LOC) | juliett
- `H:/prism/mcp-server/src/migrations/golf-ledger-v1.sql` | ledger schema v1 (bug_attribution, peer_audit_ticks, chat_bus_signals, ledger_meta) | juliett
- `H:/prism/mcp-server/src/migrations/golf-ledger-v2.sql` | v2: cost attribution + compaction-survival fields | juliett
- `H:/prism/mcp-server/src/migrations/stateMigrations.ts` | state-file schemaVersion ladder (COMPACTION_SURVIVAL, HANDOFF_PACKAGE, RECOVERY_MANIFEST, CURRENT_STATE) | juliett
- `mcp-server/data/state/coordination.sqlite` | (engine-created) coordination DB — NOT on disk until first write | juliett

## Memory-fabric / persistence engines
- `H:/prism/mcp-server/src/engines/AgentMemoryFabricEngine.ts` | persistent cross-session memory fabric | juliett
- `H:/prism/mcp-server/src/engines/MemoryGraphEngine.ts` | cross-session memory graph + semantic index | juliett
- `H:/prism/mcp-server/src/engines/MemoryConsolidationEngine.ts` | consolidation + compaction | juliett
- `H:/prism/mcp-server/src/engines/PersistentMemoryEngine.ts` | durable memory persistence | juliett
- `H:/prism/mcp-server/src/engines/MemorySyncEngine.ts` | cross-process memory sync (bundles) | juliett
- `H:/prism/mcp-server/src/engines/MigrationEngine.ts` | schema migration orchestration | juliett
- `H:/prism/mcp-server/src/engines/SchemaMigrationRollbackEngine.ts` | migration rollback | juliett
- `H:/prism/mcp-server/src/engines/AutoSchemaGeneratorEngine.ts` | auto-schema from data | juliett

## Atomic-write + claim infrastructure (the load-bearing layer)
- `H:/prism/scripts/lib/atomic-json.mjs` | `atomicWriteJson` — tmp+rename, lockfile-guarded (5.4K) | juliett
- `H:/prism/.claude/hooks/file-claim-guard.mjs` | PreToolUse — blocks edits to peer-claimed files | juliett/golf
- `H:/prism/.claude/hooks/claim-registry-precompact.mjs` | PreCompact — flush active claims | juliett
- `H:/prism/.claude/hooks/claim-registry-release.mjs` | Stop — release terminal claims | juliett
- `H:/prism/.claude/hooks/claim-registry-surface.mjs` | SessionStart — surface peer claims + restore | juliett
- `H:/prism/.claude/hooks/corpus-integrity.mjs` | PostToolUse:Write — JSONL pipeline JSON+hash+schema+dedup guard | juliett/delta
- `H:/prism/.claude/hooks/git-lock-sweeper.mjs` | Stop/PreToolUse — stale `.lock` cleanup w/ backoff | golf/juliett
- `H:/prism/.cron-locks/*.lock` | per-writer advisory locks (zero-byte; reaper sweeps aged>3s) | golf

## State JSON registries (schemaVersion'd — probe before read)
- `H:/prism/mcp-server/data/roadmap-index.json` | task queue (378K; the 5-writer/3-non-atomic race case) | juliett
- `H:/prism/state/shared/BUILD_STATE.json` | built/unwired/pending snapshot (221K) | juliett
- `H:/prism/state/shared/MILESTONE_PROGRESS.json` | milestone delta (2.1M) | juliett
- `H:/prism/mcp-server/data/state/cross-session-asset-registry.json` | asset registry (1.6M; tango-consumed) | juliett
- `H:/prism/mcp-server/data/state/extraction-log.json` | extraction dedup log (54K; mustNotReExtract source) | juliett
- `H:/prism/mcp-server/data/state/ollama-offload-stats.json` | schema-v2 offload telemetry (schema-read-blindness case) | alpha/juliett

## Append-only JSONL ledgers (rotate, never delete)
- `H:/prism/state/shared/AGENT_CHAT.jsonl` | chat-bus | all
- `H:/prism/state/shared/.fleet-reaper-actions.jsonl` · `.fleet-reaper-kills.jsonl` | reaper audit | golf
- `H:/prism/state/shared/goal-gate-bypasses.jsonl` | /goal gate override audit | juliett
- `H:/prism/state/shared/database-expansion-tribal-corpus.jsonl` | juliett's domain tribal store | juliett

## Master indexes (regenerated, NOT hand-edited)
- `H:/prism/state/shared/system-viz/system-graph.json` | merged graph (548.9M; regen-viz — abort-on-shrink guard) | sierra
- `H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md` · `DISPATCHER_DIGEST.md` · `DIRECTORY_DIGEST.md` | digests | dev
- `H:/prism/PRISM-INVENTORY-LATEST.md` | live counts (auto every SessionStart) | dev

## Large file/scan inventories (the corpus-join substrate — DB-GAP-LIST A3, pathed 2026-06-08)
> The biggest JM/H: inventories — every corpus join + customer/feature classify resolves against these. Were UNPATHED (invisible to discovery) despite being WIRED to real consumers.
- `H:/prism/state/shared/databases/jm-file-inventory.jsonl` | 554,999-file JM corpus inventory (108M) — disposition substrate for the per-document ledger | consumers: `DocumentInboxEngine`, `scripts/build-jm-document-ledger.mjs`, `scripts/jm-die-full-corpus-ingest.mjs`, parts-library + inbox schemas | juliett
- `H:/prism/state/shared/scan-tracking/jm-die-scan-ledger.jsonl` | 301,948-row OCR/scan-status ledger (87M) | consumers: `JMDieScanLedgerEngine`, `JMDieDocumentQueryEngine`, `CrossPartToolingSynergyEngine`, `scripts/quoting-baseline-bootstrap.mjs` | juliett
- `H:/prism/state/shared/system-viz/h-drive-files.jsonl` | 1,275,776-row H:-wide file census (187M) | consumers: `scripts/generate-fs-deep-inventory.mjs`, `scripts/h-drive-full-index.mjs`, system-viz | sierra/juliett

## JM die database (DocuStrata + JM files — primary, 2026-05-29)
- `H:/prism/mcp-server/data/jm-die-database/manifest.json` | corpus stats + rollups + source registry (schemaVersion 1.0.0) | juliett
- `H:/prism/mcp-server/data/jm-die-database/tables/documents.jsonl` | 73,506 classified DocuStrata docs (gitignored, regenerable) | juliett
- `H:/prism/mcp-server/data/jm-die-database/tables/files.jsonl` | 38,251 JM-DIE CAD/CAM/g-code files (gitignored) | juliett
- `H:/prism/mcp-server/data/jm-die-database/reports/report-from-jm-tool-die-llc.json` | J.M. Tool & Die vendor report record | juliett
- `H:/prism/scripts/build-jm-die-database.mjs` | the loader (stream .index → consolidate + extract PDF, atomic + smoke test) | juliett
- `H:/prism/state/shared/databases/jm-part-library.jsonl` | 30,890 part-number-keyed print-to-program join records (prints/cncPrograms/cadCam + matchConfidence) consolidated from the orphaned `part.json` extraction sidecars under `H:/PRISM/JM DIE/Prism JM Die/**`; queried via `prism_data:jm_die_part_lookup` (DB-GAP-LIST B2, 2026-06-08) | juliett
- `H:/prism/state/shared/databases/jm-part-library-summary.json` | B2 ingest reconciliation summary (counts + matchConfidence histogram + topCustomers) | juliett
- `H:/prism/scripts/build-jm-part-library.mjs` | the B2 ingest (DFS-walk the part.json sidecars → consolidated JSONL, zero-drop reconciliation invariant, atomic tmp+rename) | juliett
- `H:/prism/mcp-server/src/engines/JMDiePartLibraryEngine.ts` | runtime consumer — `loadPartIndex` (mtime-cached, FAIL-LOUD) + `queryParts` (field filters) | juliett
- `H:/prism/mcp-server/data/jm-die-database/jm-die-tooling-stock-master-manifest.json` | cross-ref index of ALL tooling/stock sources (purchased+153K mfr+holders+monolith) → hotel ERP | juliett
- `H:/prism/mcp-server/data/jm-die-database/jm-die-tooling-stock-handoff.json` | hotel ERP handoff (material-master/tooling/vendor recs) | juliett
- `H:/prism/mcp-server/data/jm-die-database/jm-die-{tooling-catalog,stock-material-catalog}.json` | purchased tooling-by-vendor + stock grade/form/size | juliett
- `H:/prism/scripts/compile-jm-tooling-stock.mjs` (+ .test.mjs, 7/7) | purchased compiler: classify+grade/form/size from vendor report | juliett
- `H:/prism/scripts/compile-jm-tooling-stock-manifest.mjs` | master manifest builder (indexes src/data + monolith + holders) | juliett
- `H:/PRISM/PRISM_v8_89_002_TRUE_100_PERCENT.html` | the MONOLITH build (48.6MB; PRISM_CUTTING_TOOL_DATABASE_V2 etc.) | (archived source-of-record) | juliett
- `H:/PRISM/Docustrata/` | source corpus 257,992 files | juliett (operator-owned archive)
- `H:/PRISM/Docustrata/.index/*.jsonl` | docustrata-pipeline.py pre-extraction (documents/classified/text/blueprint-join) | juliett
- `H:/prism/mcp-server/src/data/jm-die-profile.ts` | canonical config (117 customers / 21 machines) | juliett

## Atomic-write hygiene
- `H:/prism/scripts/tmp-orphan-janitor.mjs` | dead-PID+age safe sweep of `*.tmp` atomic-write orphans (dry-run default; `--apply`); reclaimed 19.24GB on 2026-05-29 | juliett
- `H:/prism/scripts/tmp-orphan-janitor.test.mjs` | 14-test safety suite (pidOf/isAlive/classify) | juliett
- `H:/prism/state/shared/.tmp-janitor-actions.jsonl` | janitor run audit ledger (append-only) | juliett

## Regen / audit scripts
- `H:/prism/scripts/build-state-snapshot.mjs` | regen BUILD_STATE.json (28K) | juliett
- `H:/prism/scripts/build-milestone-progress.mjs` | regen MILESTONE_PROGRESS (23K) | juliett
- `H:/prism/scripts/regen-viz.mjs` | regen system-graph (21K; SIGKILL-on-merge faillod class) | sierra

## DB-relevant skills (route before reinventing)
- `/memory-seed` `/registry-browse` `/forge-schema` `/dedup` `/envelope-sync` `/build-state` | C:/Users/wompu/.claude/commands + H:/prism/.claude/commands | juliett

## Knowledge surfaces
- `C:/Users/wompu/.claude/projects/H--prism/memory/*_juliett_*.md` | juliett auto-memories (push side) | juliett
- `H:/prism/knowledge/memories/<type>/*_juliett_*.md` | Stop-hook-mirrored master vault copies | juliett
- `H:/prism/knowledge/wiki/architecture/knowledge-vault-schema.md` · `ledger-store.md` | load-bearing wiki | juliett

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for database-expansion:** `resources/MANUFACTURER_CATALOGS` · `resources/WORKHOLDING AND FIXTURE CATALOGS` · `JM DIE/TRIBAL + WIKI` · `Docustrata/manifest.json`
<!-- END:critical-resource-roots -->

<!-- BEGIN:vendor-catalog-corpus (generated by scripts/wire-vendor-corpus-to-galaxies.mjs — do not hand-edit) -->
## 🧰 Vendor catalog corpus (VENDOR-NETWORK-MS0 — wired by charlie 2026-05-31)
> Cutting-tool maker/vendor catalog corpus charlie's catalog-pull expanded. Source of truth: `state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json` · owner: charlie (acquisition+triage); oscar owns the `.ts` S/F extraction. Corpus: **167 makers** (80 HIGH/not-ingested → extract now, 95 on-disk) · **241 pulled PDFs** · **482-vendor** directory.
- **Why database-expansion (juliett — Database Expansion / persistence):** Index + persist the durable vendor stores: the 433-vendor directory, catalog-vendors records, and the SFC manifest are JSONL/JSON stores to register in the store inventory (atomic-write + schema-version discipline).
- `state/shared/quoting/vendor-directory.jsonl` (jsonl) — 433-vendor supplier/distributor directory (name, website, vendor_type, categories, reach, regions, pricing_access, has_api) — GITIGNORED, regenerate via build-vendor-directory.mjs
- `state/shared/quoting/vendor-directory-index.json` (json) — directory stats + machine-readable index (stats.total / stats.withWebsite)
- `state/shared/quoting/vendor-sources/catalog-vendors.jsonl` (jsonl) — harvested catalog-vendor records (verified flag, source_tag) emitted by harvest-catalog-pdfs.mjs
- `state/shared/quoting/catalog-sfc-extraction-manifest.json` (json) — per-maker SFC extraction manifest: vendor -> target mcp-server/src/data/<vendor>-speed-feed-data.ts + extraction_priority + iso_groups_expected + catalog_on_disk + already_ingested + jm_buys. THE worklist for S/F extraction.
- `state/shared/quoting/jm-tool-purchases.json` (json) — JM Die real tool-purchase data — which makers JM actually buys (~$211K of $4.9M; JM is a die shop, carbide-blank die stock is the majority spend)
<!-- END:vendor-catalog-corpus -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the database-expansion galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **SourceCatalogDB** (Unified Source File Catalog) — `data/databases/SourceCatalogDB.json` · 85 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/database-expansion/` (5 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/database-expansion_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="database-expansion" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs database-expansion "<question>"` (hybrid CAG+RAG, local Ollama, $0)
- UP (pull from master): `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- DOWN (push to master): write `<type>_<slot>_<topic>.md` -> master memory dir -> auto-fed to `knowledge/memories/<type>/`

**All resources -- easily pathed + usable (search the INDEX, never re-scan -- R8):**
- CAD/CAM/training/catalog/post/machine trove: `resources/RESOURCES-INDEX.md` (`H:/PRISM/resources/`) -- every CAM seat + catalogs + MIT courses + machine-sim + macro/post libs
- JM Die shop ground-truth (38,251 files): `mcp-server/data/jm-die-database/` (`manifest.json` + `.index/*.jsonl`) -- programs by controller, posts, Fusion CAD/CAM, tribal+wiki corpus
- Business/order/financial docs (257,992 files): `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` + `manifest.json` -- quote-to-ship + ERP ground truth (ALREADY indexed; do NOT re-OCR)
- Vendor catalog corpus: `mcp-server/data/vendor-catalog-db/manifest.json` (425 vendors + catalog tables)
- The 3 critical roots + per-galaxy db-intake/vendor-corpus are plotted in their own marked blocks below (`critical-resource-roots`, etc.).
- USAGE (query every resource from this domain): `prism_data:database_search` / `database_list` / `globalSearch` · skills `/resource-census` `/prism-paths` · new PDFs -> `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf) · skip-list `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md`
<!-- END:knowledge-atlas -->
