# System-Viz Galaxy — H:/-wide PATHS atlas (slot: sierra)

> Converts future Grep/Glob from O(N) → O(1) for slot:sierra. The H:/prism tree is huge (370MB+ graph, 13K+ uncommitted) — a recursive `**` Glob TIMES OUT. Use these exact paths. Format: `<path> | <purpose> | <maintainer>`. Verified on disk 2026-05-29.
>
> **Worktree gotcha:** CWD is `H:/prism-slot-sierra` (stale slot branch); the galaxy + viz assets live in `H:/prism` main tree. A relative Glob MISSES them — use absolute `H:/prism/...` paths in Glob/Read/grep.

## Canonical graph + live state (read these for status — do NOT JSON.parse the big graphs)
- `H:/prism/state/shared/system-viz/system-graph.json` | the merged 370-575MB / ~244K-node canonical graph — ONE writer (regen-viz) | sierra
- `H:/prism/state/shared/system-viz/architecture-graph.json` | 53MB arch-only L1-L10 graph (generate-system-viz output, split-out per U-VIZ-SPLIT-OUT-FILE) | sierra
- `H:/prism/state/shared/system-viz/.last-successful-regen.json` | last good regen {ts,graphBytes,pendingCount,sidecarOk} | sierra
- `H:/prism/state/shared/system-viz/.last-regen-failure.json` | last failure {stage,exitCode,stderrTail} — exit 134 = merge-augmentations OOM | sierra
- `H:/prism/state/shared/system-viz/DRIFT_REPORT.json` | detect-system-viz-drift output | sierra
- `H:/prism/state/shared/system-viz/EXECUTIVE-BRIEFING.{json,md}` | post-regen headline metrics | sierra
- `H:/prism/state/shared/system-viz/WIKI-COVERAGE-AUDIT.{json,md}` + `WIKI-DEBT-WORKLIST.md` | wiki↔graph coverage | sierra
- `H:/prism/state/shared/system-viz/augmentations/` | ghost-roost splice inputs (one file per generator) | sierra
- `H:/prism/state/shared/system-viz/{staging,agent-findings,agent-slices}/` | regen scratch + agent scan outputs | sierra
- `H:/prism/state/shared/system-viz/_server.cjs` (+ `_server.log`) | the /system-viz HTTP/3D viewer server | sierra
- `H:/prism/state/shared/system-viz/_node-embeddings.jsonl.partial` | GNN node embeddings (~582MB; `.partial` = last regen left it mid-flight, final drops the suffix) | india+sierra
- `H:/prism/state/shared/system-viz/LEVERAGE-WIRING-QUEUE.{json,md}` | leverage-ranked unwired-engine-domain queue (highest-impact-per-wire first) — feeds /pick-unit + dispatcher-wirer | sierra

## Generators — graph core (`H:/prism/scripts/`)
- `regen-viz.mjs` | MASTER regenerator (FAST[] stage list → merge → repair → dedup → reparent → parent-edges → seed-ghost → drift-gate). The ONE canonical writer of system-graph.json | sierra
- `generate-system-viz.mjs` | arch-only L1-L10 graph → `architecture-graph.json` (NEVER clobbers merged graph post-split-fix) | sierra
- `merge-augmentations.mjs` | splices every ghost-roost augmentation into the merged graph (compact JSON.stringify — NO null,2) | sierra
- `system-viz-add-node.mjs` | atomic single-node append (respects PID lock) | sierra
- `system-viz-query.mjs` | CLI graph search — `node scripts/system-viz-query.mjs find <noun>` (the viz-first surface) | sierra
- `seed-ghost-from-unwired.mjs` | seeds high-conf `ghost.unwired-engine` ref-pool nodes (regen-viz post-merge stage; feeds GNN tier-5) | sierra+india
- `dedup-graph-nodes.mjs` · `reparent-viz-categories.mjs` · `repair-graph-engine-classification.mjs` · `add-parent-contains-edges.mjs` | post-merge graph repair stages | sierra
- `system-viz-obsidian-bridge-v2.mjs` | bidirectional bridge graph ↔ Obsidian vault | sierra
- `build-system-viz-livediff.mjs` · `expand-system-viz-l12-files.mjs` · `bridge-graph-builder.mjs` · `build-graph-index.mjs` · `export-graph-cypher.mjs` · `generate-engine-graph.mjs` · `augment-graph-with-awareness.mjs` · `detect-system-viz-drift.mjs` | secondary graph builders/analyzers | sierra

## Ghost-roost generators (~48 × `generate-*-features.mjs` in `H:/prism/scripts/`)
- Registration rule (LOAD-BEARING): every generator needs BOTH `regen-viz.mjs` FAST[] AND a `merge-augmentations.mjs` splice block — one without the other = silently-discarded data.
- Key roosts: `generate-priority-queue-features.mjs` · `generate-misc-tasks-features.mjs` · `generate-bridge-synergy-features.mjs` · `generate-feature-gap-features.mjs` · `generate-domain-pipeline-features.mjs` · `generate-chat-slot-nodes-features.mjs` · `generate-cag-router-features.mjs` · `generate-docker-mcp-features.mjs` · `generate-database-surfaces-roost.mjs`
- Full list: `ls H:/prism/scripts/generate-*-features.mjs | grep -v test` (49 as of 2026-05-29; count drifts as peers add generators — trust the live `ls`, not this number). ⚠ 9 of the 49 are NOT in regen-viz FAST[] — see `state/shared/specs/SIERRA-GALAXY-COMPLETENESS-ASSESSMENT-2026-05-29.md` (U-VIZ-FAST-REGISTER-9).

## Graph + GNN libs (`H:/prism/scripts/lib/`)
- `system-viz-graph.mjs` | the canonical graph reader (mtime-cached, size-capped) | sierra
- `graph-io.mjs` · `graph-key-derive.mjs` · `graph-random-walk.mjs` · `graph-node-embedding-bridge.mjs` | graph IO + key derivation + walk + embedding bridge | sierra+india
- `system-graph-write-lock.mjs` | the one-writer PID lock for system-graph.json | sierra
- `regen-viz-merge-guard.mjs` | fail-loud guard — SIGKILLed merge must abort, never continue stale (R12) | sierra
- `leverage-wiring-queue.mjs` | pure core — ranks unwired eng.<domain> nodes by graph leverage (graph-0 → derived fallback); CLI is `scripts/leverage-ranked-wiring-queue.mjs` (complements per-engine `unwired-bridge-rank.mjs`) | sierra
- `mcp-server/src/engines/RankedHybridGraphSearchEngine.ts` | N1 ranked-hybrid-graph-search — RRF-fuse master-index confidence vs utilization; wired `prism_session:master_index_ranked_hybrid` (OOM-safe, reuses cached index) | sierra
- `system-viz-dead-pixel-detector.mjs` · `system-viz-type-backfill.mjs` | node-quality scanners | sierra
- `graphsage-{model,trainer,predictor,checkpoint,train-pipeline}.mjs` + `nn-graph-eval.mjs` | GNN tier-5 wiring-inference (NN/GNN PSN leg) | india (sierra consumes)

## Hooks (`H:/prism/.claude/hooks/`) — system-viz aware
- `pre-bash-graph-inject.mjs` · `pre-grep-graph-inject.mjs` · `pre-read-graph-inject.mjs` · `pre-write-graph-inject.mjs` | surface graph hits before each tool (PreToolUse) | sierra
- `audit-viz-first-inject.mjs` | UserPromptSubmit — auto-runs system-viz-query before Grep/Glob on audit/missing intents | sierra
- `sessionstart-graph-staleness-inject.mjs` · `stop-graph-staleness-backstop.mjs` | SessionStart staleness warn + Stop auto-regen backstop | sierra
- `master-index-precheck-inject.mjs` · `master-index-search-gate.mjs` | top-K master-index hits per UserPromptSubmit (graph-backed) | sierra
- `nn-graph-health-inject.mjs` | UserPromptSubmit — PSN NN/GNN leg state (AUROC/deferred) | india+sierra
- `awareness-snapshot-inject.mjs` · `session-consolidate-graph.mjs` | awareness digest + session graph consolidation | sierra

## Skills (`H:/.claude/commands/` + `H:/prism/.claude/commands/`)
- `/system-viz` | the canonical 3D map + query surface | sierra
- `/master-index` `/awareness-snapshot` `/utilization-dashboard` `/orphan-inventory` `/deep-search` | graph-backed search/awareness surfaces | sierra
- `/viz-audit-sierra` | sierra's custom galaxy/graph-health audit (this buildout) | sierra
- `/forge-audit-v2` | peer-reviewed audit pattern that drives many viz updates | fleet

## Galaxy self + doctrine
- `H:/prism/mcp-server/src/engines/system-viz/{CLAUDE,MEMORY,PATHS,TOOLBELT,GSD}.md` | this galaxy (5 brain files; GSD = domain operating runbook) | sierra
- `H:/prism/state/shared/slot-souls/sierra.md` | sierra personality layer | sierra
- `H:/prism/state/shared/per-slot-galaxy-buildout/sierra.md` | THIS buildout brief | fleet
- `H:/prism/state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md` + `MASTER-BRAIN-TEMPLATE.md` | master buildout + brain protocol | alpha
- `H:/prism/.claude/hooks/slot-context-bundle-inject.mjs` | SLOT_GALAXY_MAP (sierra→system-viz @ line 77); auto-loads this galaxy per UserPromptSubmit | fleet
- `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` | master brain index (galaxy back-pointers) | alpha

## Wiki (system-viz — verify before citing)
- `H:/prism/knowledge/wiki/architecture/system-viz-add-node.md` | atomic single-node append pattern | sierra
- `H:/prism/knowledge/wiki/architecture/regen-viz-merge-guard.md` | fail-loud merge guard | sierra
- `H:/prism/knowledge/wiki/architecture/viz-domain-coverage.md` | L5 engine-domain coverage (single-source from BUILD_STATE) | sierra
- `H:/prism/knowledge/wiki/architecture/system-viz-galaxy.md` | this galaxy overview (sierra buildout) | sierra

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for system-viz:** `resources/RESOURCES-INDEX.md` · `Docustrata/manifest.json`
<!-- END:critical-resource-roots -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/system-viz/` (5 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/system-viz_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="system-viz" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs system-viz "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
