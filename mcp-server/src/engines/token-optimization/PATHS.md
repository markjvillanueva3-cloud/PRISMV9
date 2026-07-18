# PATHS.md — token-optimization domain path atlas (slot:alpha)

H:/-wide path index. Converts future Grep/Glob from O(N)→O(1) for this domain. Format: `<absolute-path> | <purpose> | <maintainer>`.
**Glob gotcha:** the `Glob` tool's `path:` arg with backslashes (`H:\prism`) silently returns empty — verify presence with Bash `ls H:/prism/...` (forward slash). See TOOLBELT.md.

## Galaxy (this dir)
- `H:/prism/mcp-server/src/engines/token-optimization/CLAUDE.md` | operational scope + inventory + PSN edges | alpha
- `H:/prism/mcp-server/src/engines/token-optimization/MEMORY.md` | cross-session brain + master-brain link | alpha
- `H:/prism/mcp-server/src/engines/token-optimization/PATHS.md` | this atlas | alpha
- `H:/prism/mcp-server/src/engines/token-optimization/TOOLBELT.md` | token-lean tool-call patterns | alpha
- `H:/prism/state/shared/slot-souls/alpha.md` | slot soul (role/voice/refuse_list/domain_filter) | alpha

## Engines (`H:/prism/mcp-server/src/engines/*.ts` — on cad-fusion-live-ms0; sizes verified via `ls` 2026-05-29; absent from stale slot worktrees, not fabricated)
- `TokenAwarenessEngine.ts` | per-prompt GREEN/YELLOW/RED zone | alpha
- `TokenBudgetAllocatorEngine.ts` | per-task budget enforcement | alpha
- `TokenEconomyEngine.ts` | fleet-wide token economy | alpha
- `TokenEconomyTrackerEngine.ts` | spend telemetry by hook/route | alpha
- `TokenAccountingEngine.ts` | record+route spending | alpha
- `SessionTokenLedgerEngine.ts` | per-session cumulative ledger | alpha
- `DiffTokenEstimatorEngine.ts` | diff-cost estimation | alpha
- `HookEfficiencyEngine.ts` | hook-level cost profiling | alpha
- `CADTokenRepresentationEngine.ts` | CAD token efficiency (echo/delta bridge) | alpha
- `CostEfficiencyBridgeEngine.ts` | cost↔$ bridge (hotel bridge) | alpha

## Hooks (`H:/prism/.claude/hooks/*.mjs`)
- `cag-router-inject.mjs` `cag-cold-cache-anchor.mjs` `cag-soul-cache-block.mjs` | CAG prompt-cache anchoring | alpha
- `ollama-task-offloader.mjs` `ollama-pipeline-injector.mjs` `ollama-prewarm-on-pipeline.mjs` `ollama-route-pretooluse.mjs` | local-LLM offload routing | alpha
- `mcp-route-suggest.mjs` | route-before-reimplement nudges (TOKEN-SAVINGS-PIVOT) | alpha
- `prompt-rewriter-ollama.mjs` | local prompt compression (skips when Ollama /api/chat dead) | alpha
- `cad-token-vocabulary-guard.mjs` `claudemd-ollama-enforcer.mjs` `posttool-ollama-offload-nudge.mjs` | misc token guards | alpha

## State JSON / telemetry
- `H:/prism/mcp-server/data/state/ollama-offload-stats.json` | offload telemetry (schemaVersion 2.0.0; `offloaded`/`keptOnClaude` TOP-LEVEL not under `totals` — schema-probe `j.schemaVersion` before reading) | alpha
- `H:/prism/state/shared/dashboards/psn-savings-aggregate.json` | cumulative PSN savings across 6 detectors | alpha
- `H:/prism/state/shared/cag-route/route-<sid>-*.json` | per-prompt CAG route sidecars | alpha
- `H:/prism/.claude/cache/ollama-rate-limit.json` | Ollama rate-limit guard | alpha
- `H:/prism/state/shared/loop-state/loop-<sid>.json` | autonomous /loop state | alpha
- `state/shared/TOKEN-OPTIMIZATION-AWARENESS.md` | live 11-leg PSN synergy audit output | alpha

## Domain awareness surface (TOKEN-AWARENESS-SYNERGY-MS0, 2026-05-29)
- `scripts/token-awareness-snapshot.mjs` | generator: 11-leg PSN audit + live token metrics (`--json`/`--stdout`); regen the .md above | alpha
- `scripts/token-awareness-snapshot.test.mjs` | 13 node:test (real-data E2E + 3 regression guards) | alpha
- `H:/.claude/hooks/alpha-token-domain-awareness-inject.mjs` | SessionStart auto-inject (alpha-gated); wired in canonical C: settings (mirror→H:) | alpha

## Scripts (`H:/prism/scripts/`)
- `ollama-offload-dashboard.mjs` | offload telemetry (--json / --window=48h / --reset) | alpha
- `ollama-docker-health.mjs` | Ollama+Docker+Qdrant+Postgres+Prometheus 1-line probe (curl, not fetch) | alpha
- `memory-size-watch.mjs` | MEMORY.md 24576-byte truncation watchdog | alpha
- `md-to-html.mjs` | render any .md → standalone HTML (assessment twins) | shared
- `high-roi-skill-rank.mjs` | route ROI ranker (schema-probe v1/v2 first — see regressions) | alpha
- `build-state-snapshot.mjs` `regen-viz.mjs` | surface galaxy in BUILD_STATE / system-viz | sierra

## Memory (alpha-owned)
- `C:/Users/wompu/.claude/projects/H--prism/memory/` | canonical C: memory dir (`*_alpha_*.md`) | alpha
- `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` | master index (≤200 lines, [galaxy:] back-pointer) | alpha
- `H:/prism/knowledge/memories/<type>/` | H: mirror, auto-fed every Stop | alpha
- `H:/prism/state/shared/MEMORY-RECENT.md` | overflow of recent reference pointers | alpha
- `H:/prism/state/shared/specs/MASTER-BRAIN-TEMPLATE.md` | canonical connected-brain pattern (alpha-owned) | alpha

## Wiki (`H:/prism/knowledge/wiki/`)
- `architecture/token-optimization-galaxy.md` | this galaxy's wiki entry | alpha
- `architecture/ollama-pipeline-ms0.md` | Ollama offload wiring | alpha
- `architecture/session-continuity-stack.md` | precompact/auto-resume/terminal-pin | shared
- `index.md` | 722-entry catalog — query before re-deriving | shared

## Dispatchers (token/efficiency actions)
- `prism_context` | token_budget_* / token_economy_* / token_ledger_* / diff_token_* / compress_* | alpha
- `prism_session` | master_index_query / dispatcher_map_compact / token_awareness_* / cag_route | alpha
- `prism_dev` | token_ledger_* / cost_route / read_optimize_* / output_truncate_* | alpha

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
<!-- END:critical-resource-roots -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/token-optimization/` (5 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/token-optimization_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="token-optimization" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs token-optimization "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
