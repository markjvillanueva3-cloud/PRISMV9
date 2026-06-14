# Hermes-Zulu PATHS.md — H:/-wide path atlas (slot:bravo)

Converts every future Grep/Glob from O(N) → O(1) for slot:bravo. All paths **glob-verified against canonical `H:/prism` on 2026-05-28** (the slot worktree carries only this session's touched files; verify against `H:/prism`). bravo writes the same relative paths in its slot worktree `H:/prism-slot-bravo`. Format: `<absolute-path> | <purpose> | <maintainer>`. mtime = NA (use `git log -1 -- <path>`).

## Galaxy home
- `H:/prism/mcp-server/src/engines/hermes-zulu/CLAUDE.md` | operational scope + engine/hook/skill inventory | bravo
- `H:/prism/mcp-server/src/engines/hermes-zulu/MEMORY.md` | per-domain brain (master-brain-linked) | bravo
- `H:/prism/mcp-server/src/engines/hermes-zulu/PATHS.md` | this atlas | bravo
- `H:/prism/mcp-server/src/engines/hermes-zulu/TOOLBELT.md` | tool-call cheatsheet | bravo

## Engine source (Hermes parallel-orchestration + Zulu fleet-governance)
- `H:/prism/mcp-server/src/engines/HermesParallelFanoutPlannerEngine.ts` | plan parallel agent fan-out | bravo
- `H:/prism/mcp-server/src/engines/HermesFileScopePartitionerEngine.ts` | partition file scope (no collide) | bravo
- `H:/prism/mcp-server/src/engines/HermesParallelBudgetEnvelopeEngine.ts` | per-fanout token/turn budget | bravo
- `H:/prism/mcp-server/src/engines/HermesParallelVerdictAggregatorEngine.ts` | aggregate parallel verdicts | bravo
- `H:/prism/mcp-server/src/engines/HermesSelfCorrectionEngine.ts` | self-correction loop | bravo
- `H:/prism/mcp-server/src/engines/ZuluTaskAuctionEngine.ts` | auction NATO-slot work orders | zulu
- `H:/prism/mcp-server/src/engines/ZuluDashboardControlEngine.ts` | fleet dashboard control | zulu
- `H:/prism/mcp-server/src/engines/ZuluFleetGovernorEngine.ts` | pure-core authority gate — checkAuthority(slot,task_text,operation)→verdict via refuse_list/domain_filter/orchestrator-role (fail-CLOSED on malformed regex); wired READ-ONLY `prism_session:zulu_authority_check` (U-ZULU-GOVERNOR-WIRE 2026-06-01) | zulu
- `H:/prism/mcp-server/src/engines/MoonshotClientEngine.ts` | Opus heavy-reasoning invocation | zulu
- `H:/prism/mcp-server/src/__tests__/` | ONLY dir `stop_on_unwired_assets` + stub-hunter scan; engine tests go here | bravo

## Hooks (.claude/hooks/)
- `H:/prism/.claude/hooks/slot-context-bundle-inject.mjs` | UserPromptSubmit — SLOT_GALAXY_MAP + galaxy/soul/bridge inject | bravo
- `H:/prism/.claude/hooks/slot-soul-inject.mjs` | UserPromptSubmit — per-prompt soul personality | bravo
- `H:/prism/.claude/hooks/zulu-advisory-inject.mjs` | UserPromptSubmit — zulu cross-slot advisory | zulu
- `H:/prism/.claude/hooks/stop-slot-task-claims-advisory.mjs` | Stop — surfaces held slot-task claims | bravo
- `H:/prism/.claude/hooks/stop-wiki-stub-stager.mjs` | Stop — stages wiki stubs for bug findings | bravo
- `H:/prism/.claude/hooks/lib/enforce-stub-detector.py` | shared lib — stub-pattern detector | bravo

## Helpers (.claude/helpers/) — the runtime CLIs
- `H:/prism/.claude/helpers/chat-slots.mjs` | 26-slot NATO claim/reclaim/heartbeat/liveness | bravo
- `H:/prism/.claude/helpers/slot-task-claim.mjs` | per-slot UNIT lock (claim/release/heartbeat/list/check/sweep) | bravo
- `H:/prism/.claude/helpers/loop-state.mjs` | resumable /loop start/tick/end/list/reap | bravo
- `H:/prism/.claude/helpers/per-agent-handoff.mjs` | per-chat handoff write/read | bravo
- `H:/prism/.claude/helpers/precompact-handoff.mjs` | PreCompact auto-handoff writer | bravo
- `H:/prism/.claude/helpers/process-slot-map.mjs` | PID → slot ancestry map | golf/bravo
- `H:/prism/.claude/helpers/scrutiny-ledger.mjs` | 3-of-3 scrutiny ledger reader | bravo

## Stub-hunter + wiring scripts (scripts/)
- `H:/prism/scripts/stub-class-audit-tobedefined.mjs` | finds `.toBeDefined()`/`toBeTruthy()` weak tests | bravo
- `H:/prism/scripts/stub-hunt-inventory.mjs` | full stub inventory | bravo
- `H:/prism/scripts/stub-sweep-full.mjs` | full-codebase 5-pattern sweeper | bravo
- `H:/prism/scripts/audit-unwired-engines.mjs` | engines on disk w/ no dispatcher ref | bravo
- `H:/prism/scripts/orphan-inventory.mjs` | built+documented+unwired punch list | bravo
- `H:/prism/scripts/audit-orphan-doctrine.mjs` | orphan doctrine audit | bravo
- `H:/prism/scripts/papa-pick-next-unwired.mjs` | pick next unwired engine to wire | bravo/papa
- `H:/prism/scripts/unwired-bridge-rank.mjs` | rank unwired by bridge value | bravo
- `H:/prism/scripts/build-state-snapshot.mjs` | regenerate BUILD_STATE.json | bravo
- `H:/prism/scripts/audit-close-out-candidates.mjs` | silent close-out debt audit | bravo
- `H:/prism/scripts/close-out-milestone.mjs` | reconcile milestone across surfaces | bravo
- `H:/prism/scripts/generate-per-slot-galaxy-buildout-files.mjs` | (re)generate the per-slot buildout briefs | alpha

## State surfaces (state/shared/ + mcp-server/data/state/)
- `H:/prism/state/shared/AGENT_CHAT.jsonl` | fleet message bus | zulu
- `H:/prism/state/shared/slot-souls/` | 26 per-slot soul frontmatter files | bravo
- `H:/prism/state/shared/chat-slots.json` | live slot ↔ chat ↔ terminal binding | bravo
- `H:/prism/state/shared/slot-task-claims.json` | per-slot UNIT locks | bravo
- `H:/prism/state/shared/loop-state/` | resumable /loop sidecars | bravo
- `H:/prism/state/shared/dashboards/` | weekly-hermes-reflection sidecars (NOT yet materialized) | bravo
- `H:/prism/mcp-server/data/state/SCRUTINY_LEDGER.json` | 3-of-3 ledger | bravo
- `H:/prism/state/shared/MILESTONE_PROGRESS.json` | close-out reality | bravo

## Specs + protocol
- `H:/prism/state/shared/specs/MASTER-BRAIN-TEMPLATE.md` | canonical brain-connection model (alpha-owned) | alpha
- `H:/prism/state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md` | galaxy buildout master protocol | alpha
- `H:/prism/state/shared/per-slot-galaxy-buildout/bravo.md` | THIS slot's 11-step buildout brief | alpha→bravo
- `H:/prism/state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md` | india closed-loop wiring | india
- `H:/prism/state/shared/CHAT-SLOT-DOMAINS.md` | operator-canonical slot→domain map | operator

## Wiki (knowledge/wiki/)
- `H:/prism/knowledge/wiki/architecture/hermes-zulu-integration.md` | galaxy integration overview | bravo
- `H:/prism/knowledge/wiki/architecture/zulu-orchestrator.md` | zulu orchestrator architecture | zulu
- `H:/prism/knowledge/wiki/architecture/zulu-omniscient-ms0.md` | omniscient PSN aggregator | zulu
- `H:/prism/knowledge/wiki/architecture/hooks/runtime/{slot-soul-inject,slot-context-bundle-inject,zulu-advisory-inject,stop-wiki-stub-stager}.md` | hook docs | bravo
- `H:/prism/knowledge/wiki/code-tribal/learnings/stub-hunt-ms0-*.md` | stub-hunt campaign learnings | bravo

## Skills (.claude/commands/)
- `H:/prism/.claude/commands/{checkin,precompact,handoff,startup,smart,galaxy-buildout}-bravo.md` | bravo slot family | bravo
- `H:/prism/.claude/commands/{checkin,precompact,handoff,startup,smart,galaxy-buildout}-zulu.md` | zulu slot family | zulu
- `H:/prism/.claude/commands/{dispatcher-coverage,orphan-inventory,wire-unwired,reap-zombies}.md` | stub-hunting/wiring | bravo
- `H:/prism/.claude/commands/stub-hunt-bravo.md` | bravo recurring stub-sweep workflow (this buildout) | bravo

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
<!-- END:critical-resource-roots -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the hermes-zulu galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **WorkflowDB** (Workflow Chains Database) — `data/databases/WorkflowDB.json` · 10 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/hermes-zulu/` (5 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/hermes-zulu_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="hermes-zulu" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs hermes-zulu "<question>"` (hybrid CAG+RAG, local Ollama, $0)
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
