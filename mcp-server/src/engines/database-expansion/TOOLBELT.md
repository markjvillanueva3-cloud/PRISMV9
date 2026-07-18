# TOOLBELT.md — database-expansion galaxy (slot:juliett)

> The exact Grep/Glob/Bash/Read/git/dispatcher patterns juliett reaches for most.
> Memoized so future sessions don't re-derive the regex + scope. Each entry must beat the naive alternative.

## 🧰 ONE-COMMAND TOOL LAUNCHER (use this first — operator 2026-05-31)
**`node scripts/db-toolbelt.mjs`** — the single accessible surface for every DB / extraction / batch tool juliett owns. Don't hunt the 155 raw scripts; route through here.
- `node scripts/db-toolbelt.mjs` — list all tools (database_builders · extractors · batch_books · enrich · guards_hooks) with usage + when-to-use
- `node scripts/db-toolbelt.mjs --status` — **DB-fill dashboard** (how maxed-out each store is: jm-die-database, vendor-catalog-db, prism-reference-db)
- `node scripts/db-toolbelt.mjs --run <id> [-- <args>]` — dispatch a tool (e.g. `--run vendor-catalog-db`, `--run enrich-cutting`, `--run batch-extraction`)
- `node scripts/db-toolbelt.mjs --cat extractor|database|batch` — filter · `--json` machine-readable
- Extractor routing + the **full math/science schema** (what to capture per tooling, which equations/domains it compounds): `scripts/lib/catalog-extraction-router.mjs` → `--run router`.

## Grep patterns
- `writeFileSync|fs\.writeFile\b` | `H:/prism/mcp-server/src H:/prism/scripts` | finds raw writes that should be `atomicWriteJson` (the multi-writer-race hunt)
- `schemaVersion` | `H:/prism/mcp-server/src/engines H:/prism/state/shared` | which stores are versioned vs un-versioned (un-versioned = migration debt)
- `atomicWriteJson|atomic-json` | `H:/prism` | who already uses the safe writer (the allowlist of good citizens)
- `readFileSync\([^)]*\.json` | `<reader-file>` | does this reader probe schema shape before parse? (schema-read-blindness pre-check)
- `JSON\.parse\(.*slice\(|firstBrace|lastBrace` | `H:/prism` | the greedy-slice hostile-payload class (scrutiny Arm B)

## Glob patterns
- `H:/prism/mcp-server/src/engines/{Qdrant,Memory,Coordination,Ledger,Migration,Schema,Persist}*.ts` | the persistence engine set (~18 files)
- `H:/prism/mcp-server/src/migrations/*` | every migration (3 today: 2 .sql + stateMigrations.ts)
- `H:/prism/state/shared/*.jsonl` | append-only ledgers (rotation candidates)
- `H:/prism/state/shared/**/*.tmp` | **orphaned atomic-write tmp leaks** — the tmp+rename failure class (46 found 2026-05-29, ~16 GB)
- `H:/prism/mcp-server/data/state/*.json` | per-engine state files (schemaVersion'd)

## Bash one-liners (RTK-wrapped where applicable; absolute paths — shell cwd resets per call)
- `ls -la "H:/prism/state/shared/"*.tmp 2>/dev/null | wc -l` | count orphan tmp leaks without dumping 369-MB filenames into context
- `du -sh "H:/prism/state/shared/system-viz/system-graph.json"` | graph size sanity (abort-on-shrink signal) — cheaper than reading 548 MB
- `head -n 1 <file>.jsonl` | read ONE record to learn a ledger schema, never `cat` a 2-MB ledger
- `node -e "const j=require('<path>.json'); console.log(j.schemaVersion, Object.keys(j).slice(0,8))"` | schema-probe a state file without Reading it whole

## Read offset+limit cheatsheet
- `system-graph.json` | NEVER full-read (548.9M) — query via `scripts/system-viz-query.mjs` instead
- `MILESTONE_PROGRESS.json` (2.1M) | `node -e` field-probe, not Read
- `roadmap-index.json` (378K) | Read `offset/limit` a window, or jq a single unit
- migration `.sql` files | full-read OK (≤6K each)

## git common commands (RTK-wrapped)
- `rtk git status --short` | only changed paths, no boilerplate
- `rtk git log --oneline -10` | recent commit scan
- `rtk git show <sha>:<path>` | read an OLD version WITHOUT `git stash` (stash clobbers peers in shared tree — [[feedback_no_git_stash_shared_tree]])

## prism_* dispatcher actions used most (MCP UP only — server was DOWN this session)
- `prism_memory:semantic_search query="<domain>" topK=20` | the master-brain PULL edge — beats Grep over the flat memory dir
- `prism_memory:vector_search_unified` | search all 14 MemoryKind collections in one call
- `prism_memory:qdrant_vector_search` / `qdrant_vector_upsert` | raw Qdrant read/write
- `prism_memory:get_health` / `run_integrity` | store health + integrity without manual file inspection
- `prism_data:database_list` / `database_search` | enumerate + query registered databases
- `prism_context:memory_externalize` / `memory_restore` | session-memory disk round-trip

## Fallbacks when MCP is DOWN (this session's reality)
- `prism_memory:*` → Grep the flat memory dir `C:/Users/wompu/.claude/projects/H--prism/memory/*.md`
- `prism_session:master_index_query` → `node H:/prism/scripts/system-viz-query.mjs find <term>`
- `prism_knowledge:tribal_capture` → append a record directly to `state/shared/database-expansion-tribal-corpus.jsonl` (schema = cad-tribal-corpus.jsonl)

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[database-expansion-foundations]] / [[database-expansion-source-atlas]] / [[database-expansion-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: juliett).
<!-- /OPERATIONAL-CONTEXT -->
