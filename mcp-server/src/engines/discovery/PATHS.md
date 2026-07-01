# Discovery Galaxy — H:/-wide PATH ATLAS (slot:tango)

> The "where everything lives" map for algorithm/engine/pipeline discovery + anti-duplication + audit/coverage.
> Converts future Grep/Glob from O(N over 26K files) → O(1). All paths absolute (H:/prism = shared integration tree, current; H:/prism-slot-tango = stale slot worktree).
> `<path> | <purpose> | <maintainer-slot>`. Built 2026-05-28; refresh when a row 404s.

## Galaxy home
- `H:/prism/mcp-server/src/engines/discovery/CLAUDE.md` | operational scope | tango
- `H:/prism/mcp-server/src/engines/discovery/MEMORY.md` | cross-session brain (master-linked) | tango
- `H:/prism/mcp-server/src/engines/discovery/PATHS.md` | this atlas | tango
- `H:/prism/mcp-server/src/engines/discovery/TOOLBELT.md` | tool-call efficiency patterns | tango
- `H:/prism/state/shared/slot-souls/tango.md` | personality + refuses | tango

## Anti-duplication ENGINES (the create-time gates)
- `H:/prism/mcp-server/src/engines/DuplicationGuardEngine.ts` | `mustCheckBeforeCreating()` + `mustNotReExtract()` THROW on dup — THE core gate | tango
- `H:/prism/mcp-server/src/engines/BloomDedupEngine.ts` | fast negative dedup (Bloom filter) over the asset registry | tango
- `H:/prism/mcp-server/src/engines/KnowledgeDeduplicationEngine.ts` | cosine-similarity dedup for knowledge tips | tango/india
- `H:/prism/.claude/helpers/duplication-guard.mjs` | hook-side single source of `findSimilarAssets`/`classifyAsset` (used by dedup-auto-invoke) | tango

## Discovery / search INDEXES + ENGINES
- `H:/prism/mcp-server/src/engines/MasterIndexEngine.ts` | unified search: Obsidian vault + system-viz graph + capability index + BUILD_STATE | tango/sierra
- `H:/prism/mcp-server/src/engines/MasterIndexGenerator.ts` | scans MCP source → MASTER_INDEX inventory | tango
- `H:/prism/mcp-server/src/engines/PRISMSelfAwarenessEngine.ts` | `findCapabilities` / `searchTribalKnowledge` / `recommendAIFeatures` | tango
- `H:/prism/mcp-server/src/engines/CodeSystemIndexEngine.ts` | DSL shortcode (E####/D##/A##) → path resolve | tango
- `H:/prism/mcp-server/src/engines/GlobalSearchEngine.ts` | cross-entity fuzzy search | tango
- `H:/prism/mcp-server/src/engines/AwarenessQueryEngine.ts` | in-memory asset-awareness cache (search-first) | tango
- `H:/prism/mcp-server/src/engines/CapabilityIndexEngine.ts` | live dispatcher introspection / runtime action index | tango
- `H:/prism/mcp-server/src/engines/CapabilityCensusEngine.ts` | capability census / coverage enumeration | tango
- `H:/prism/mcp-server/src/engines/WikiIndexMaintainerEngine.ts` | maintains the 722-entry wiki index | tango/lima
- `H:/prism/scripts/lib/master-index-search-lib.mjs` | BM25-lite over system-graph.json (MCP-down fallback core) | sierra/tango
- `H:/prism/scripts/system-viz-query.mjs` | CLI `find <term>` over the graph — works with MCP down | sierra

## Pipeline-coverage / orphan AUDIT engines
- `H:/prism/mcp-server/src/engines/EngineUtilizationAuditorEngine.ts` | which engines are actually utilized | tango
- `H:/prism/mcp-server/src/engines/SystemUtilizationAuditEngine.ts` | system-wide utilization/orphan audit | tango
- `H:/prism/mcp-server/src/engines/HookCoverageMaximizerEngine.ts` | hook coverage analysis | tango/golf
- `H:/prism/mcp-server/src/engines/SkillLibraryAuditEngine.ts` | skill-library audit | tango
- `H:/prism/mcp-server/src/engines/CrossRegistryJoinEngine.ts` | join across asset registries (WIRE-UNWIRED) | tango/romeo
- `H:/prism/mcp-server/src/engines/HookRegistryReaderEngine.ts` | reads the wired-hook registry | tango/golf

## Discovery DIGESTS / INDEXES (data/docs)
- `H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md` | 1-line per engine — check BEFORE creating | tango
- `H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md` | dispatcher + action counts | tango
- `H:/prism/mcp-server/data/docs/DIRECTORY_DIGEST.md` | 215 dirs with purposes | tango
- `H:/prism/mcp-server/data/docs/CODE_SYSTEM_INDEX.json` | shortcode → path | tango
- `H:/prism/mcp-server/data/docs/MASTER_INDEX_COMPACT.md` | compact master index (read by master-index-search-gate hook) | tango

## State REGISTRIES + LEDGERS (data/state)
- `H:/prism/mcp-server/data/state/cross-session-asset-registry.json` | fleet-wide creation log (dedup source of truth) | tango
- `H:/prism/mcp-server/data/state/extraction-log.json` | already-extracted vendor sources (mustNotReExtract) | tango/victor
- `H:/prism/mcp-server/data/state/BASELINE_INVENTORY.json` | schema-versioned anti-regression snapshot | tango
- `H:/prism/mcp-server/data/state/TRIBAL_TIP_INDEX.json` | tribal-tip index (schemaVersion 1, regenerated) | tango/lima
- `H:/prism/state/shared/tribal-embed-index.json` | L1 vector index `tribal-by-domain-inject` reads | sierra/india
- `H:/prism/state/shared/system-viz/system-graph.json` | the ~370MB merged graph master-index runs on | sierra
- `H:/prism/PRISM-INVENTORY-LATEST.md` | live auto-updated counts | tango
- `H:/prism/state/shared/BUILD_STATE.json` | built / unwired / pending / frontend snapshot | tango
- `H:/prism/state/shared/AWARENESS-SNAPSHOT.md` | built/wired/utilized/drifted digest | tango

## Audit / coverage SCRIPTS (scripts/)
- `H:/prism/scripts/audit-unwired-engines.mjs` | engines on disk + no dispatcher ref | tango
- `H:/prism/scripts/audit-roadmap-drift.mjs` | milestone envelope vs git reality | tango
- `H:/prism/scripts/audit-close-out-candidates.mjs` | shipped-but-pending (silent close-out debt) | tango
- `H:/prism/scripts/build-state-snapshot.mjs` | regen BUILD_STATE.json | tango
- `H:/prism/scripts/regen-viz.mjs` | regen system-viz graph (heavy; sierra-owned) | sierra
- `H:/prism/scripts/dev-tool-conflict-detector.mjs` | multi-writer / multi-audit-tool drift META detector | tango
- `H:/prism/scripts/md-to-html.mjs` | render any md → standalone HTML twin | alpha

## HOOKS dir + key discovery hooks (.claude/hooks/)
- `H:/prism/.claude/hooks/duplication-hard-block.mjs` | [WIRED] T0 hard-block on duplicate engine Write | tango
- `H:/prism/.claude/hooks/dedup-auto-invoke.mjs` | [WIRED] T1 pre-Write similar-asset surface | tango
- `H:/prism/.claude/hooks/master-index-precheck-inject.mjs` | [WIRED] T2 top-K graph hits per prompt | tango/sierra
- `H:/prism/.claude/hooks/inventory-check-guard.mjs` | [WIRED] inject live counts on build/create/audit intent | tango
- `H:/prism/.claude/hooks/build-create-detector.mjs` | [WIRED] trigger self-awareness checks on create intent | tango
- `H:/prism/.claude/hooks/grep-index-first.mjs` + `pre-grep-graph-inject.mjs` | [WIRED] search-first Grep interception | tango
- `H:/prism/.claude/hooks/stop_on_unwired_assets.mjs` | [WIRED] T0 block Stop on orphan engines | tango/romeo
- `H:/prism/.claude/hooks/slot-context-bundle-inject.mjs` | SLOT_GALAXY_MAP (tango→discovery) | alpha

## SKILLS dir (.claude/commands + C:/Users/wompu/.claude/commands)
- `H:/prism/.claude/commands/` | project skills (H:-side: find, build-state, awareness-snapshot, orphan-inventory, dispatcher-coverage, coverage-by-domain, close-out-audit) | fleet
- `C:/Users/wompu/.claude/commands/` | user-global skills (dedup, master-index, navigate, scrutinize, audit-duplicates, engine-browse, code-index, capabilities) | fleet

## WIKI entries (knowledge/wiki/)
- `H:/prism/knowledge/wiki/architecture/master-index-surface.md` | master-index surface doctrine (EXISTS) | tango
- `H:/prism/knowledge/wiki/architecture/duplication-guard-discipline.md` | dedup gate doctrine (tango-authored) | tango
- `H:/prism/knowledge/wiki/lessons/orphan-rescue-class.md` | orphan triage lesson (tango-authored) | tango
- `H:/prism/knowledge/wiki/lessons/discovery-meta-tool-schema-blindness.md` | META-tool schema-read-first lesson (tango-authored) | tango
- `H:/prism/knowledge/wiki/index.md` | 722-entry wiki catalog | lima/tango

## MEMORY (Obsidian brain)
- `C:/Users/wompu/.claude/projects/H--prism/memory/` | auto-memory write target (feedback_/reference_/project_) | fleet
- `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` | master index + galaxy back-pointers | alpha
- `H:/prism/knowledge/memories/<type>/` | Obsidian mirror (fed by stop-obsidian-memory-feed.mjs) | fleet
- `H:/prism/knowledge/memories/reference/reference_tango_*.md` | tango's pushed learnings | tango

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
<!-- END:critical-resource-roots -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the discovery galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **AlgorithmDB** (Algorithm Database) — `data/algorithms/` · 52 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **DecisionTreeDB** (Decision Tree Reference Data) — `data/databases/DecisionTreeDB.json` · 7 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **GenomeDB** (Manufacturing Genome Database) — `data/databases/GenomeDB.json` · 8 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **KnowledgeDB** (Knowledge Base Database) — `data/knowledge/` · 58 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **SourceCatalogDB** (Unified Source File Catalog) — `data/databases/SourceCatalogDB.json` · 85 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/discovery/` (5 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/discovery_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="discovery" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs discovery "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
