# Discovery Galaxy — TOOLBELT (slot:tango)

> The exact tool-call patterns tango reaches for. Memoized so future sessions don't re-derive them.
> **MCP-down note (2026-05-29):** port-3100 dispatcher is frequently down this fleet — every `prism_*` action below has a script/CLI fallback listed. Prefer the dispatcher when up (ranked, cached); fall back to the script when ECONNREFUSED.

## prism_* dispatcher actions used most (search-first beats Grep)
- `prism_session:master_index_query {keyword}` | "where is X / what handles Y" | ranked top-K vs blind Grep. FALLBACK: `node scripts/system-viz-query.mjs find <term>`
- `prism_session:master_index_node_status {node}` | is-it built/wired/utilized | FALLBACK: grep BUILD_STATE.json + ENGINE_WIRING_INDEX
- `prism_session:dispatcher_map_compact` | full dispatcher→action map | FALLBACK: read `data/docs/DISPATCHER_DIGEST.md`
- `prism_guard:dup_guard_check {assetType,proposedName,keywords}` | THROWS on dup before create | FALLBACK: `node .claude/helpers/duplication-guard.mjs` findSimilarAssets
- `prism_dev:wiring_potential {mode:batch_unwired}` | orphan-engine batch + suggested dispatcher | FALLBACK: `node scripts/audit-unwired-engines.mjs`
- `prism_dev:dedup_might_contain / dedup_is_definitely_new` | Bloom negative-dedup probe | FALLBACK: read cross-session-asset-registry.json
- `prism_dev:capability_census` | capability/coverage enumeration | FALLBACK: `node scripts/build-state-snapshot.mjs`
- `prism_dev:impact_find_orphans` | orphan discovery | FALLBACK: `/orphan-inventory` skill
- `prism_knowledge:tribal_capture {slot:'tango',tip,context,citation}` | canonical tribal write | FALLBACK: append `mcp-server/data/tribal/tango-discovery-tribal.jsonl` then re-embed when MCP up

## Core discovery SKILLS (invoke daily)
- `/dedup` | MANDATORY before any new engine/hook/skill/action | C:-side
- `/master-index <q>` | unified search; use INSTEAD OF Grep/Glob/Agent | C:-side
- `/find <x>` | single-shot symbol/file resolver via graph | H:+C:
- `/orphan-inventory` | built-but-unwired punch list grouped by suggested dispatcher | H:-side
- `/dispatcher-coverage` | engines/actions per dispatcher + orphan rate | H:-side
- `/coverage-by-domain` | per-domain wired/unwired (which domain lags) | H:-side
- `/close-out-audit` | shipped-on-disk-but-pending units (advisory, human-verify) | H:-side
- `/awareness-snapshot` | built/wired/utilized/drifted in 60 lines | H:+C:
- `/utilization-dashboard` | hub/sink/source/orphan/ghost classifier | C:-side
- `/wire-unwired` | full wiring sprint (coverage→forge-wiring→batch→review) | hand to romeo
- `/deep-search <q>` | search-first then model-reason fallback | C:-side
- `/scrutinize` | standalone code-quality review | C:-side

## Discovery HOOKS (auto-fire — know they exist; don't re-implement)
- `duplication-hard-block` PreToolUse:Write [WIRED] | T0 block exact-dup engine create
- `dedup-auto-invoke` PreToolUse:Write [WIRED] | T1 surface similar assets pre-Write
- `master-index-precheck-inject` UserPromptSubmit [WIRED] | T2 top-K graph hits per prompt
- `inventory-check-guard` UserPromptSubmit [WIRED] | inject live counts on build/create/audit intent
- `grep-index-first` + `pre-grep-graph-inject` PreToolUse:Grep [WIRED] | "the graph already knows" — answer from digest before Grep
- `stop_on_unwired_assets` Stop [WIRED] | T0 block Stop on dispatcher-orphan engines
- `audit-viz-first` UserPromptSubmit [WIRED] | auto-runs system-viz-query before Grep on missing/find intent
- UNWIRED-on-disk (do NOT assume active): `ai-duplication-guard`, `audit-awareness-inject`, `capability-manifest-surface`, `capability-reminder`

## Grep patterns (when search-first is below 0.5 confidence)
- `^\s*<slot>:` | `.claude/hooks/slot-context-bundle-inject.mjs` | confirm SLOT_GALAXY_MAP entry
- `writeFileSync.*<file>\.json` | `scripts/*.mjs` | find ALL writers of a state file (multi-writer race hunt)
- `z\.enum\(|case "<action>"` | `mcp-server/src/tools/dispatchers/*.ts` | confirm an action is in the enum AND has a case (ghost-action hunt)
- `class \w+Engine` | `mcp-server/src/engines/<X>.ts` | confirm an engine isn't a stub

## Glob patterns
- `mcp-server/src/engines/*Audit*.ts` `*Index*.ts` `*Registry*.ts` `*Awareness*.ts` | the discovery engine family
- `scripts/audit-*.mjs` | every standing audit surface (dedup the metric before adding a new one)
- `state/shared/specs/*AUDIT*.md` | prior audits — read before re-running one

## Bash one-liners (RTK-wrapped)
- `rtk git log --oneline --grep="<MILESTONE>"` | shipped-units source of truth vs envelope claims
- `node scripts/audit-unwired-engines.mjs` | orphan engines (built, no dispatcher ref)
- `node scripts/build-state-snapshot.mjs` | refresh BUILD_STATE.json before any coverage claim
- `node scripts/dev-tool-conflict-detector.mjs` | multi-writer / duplicate-audit-tool drift

## Read offset+limit cheatsheet (large files — never full-read)
- `mcp-server/data/docs/ENGINE_DIGEST.md` | grep first, then `offset` to the hit — 227KB raw
- `state/shared/system-viz/system-graph.json` | NEVER full-read (~370MB OOM) — use system-viz-query.mjs
- `PRISM-INVENTORY-LATEST.md` | head/grep the counts line; don't full-read
- `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` | grep the section, offset to it — 20KB raw

## git common commands (RTK-wrapped, shared-tree discipline)
- `rtk git -C /h/prism log --oneline -15` | recent fleet commits (this branch = cad-fusion-live-ms0)
- commit prefix `[MAIN]` on shared H:/prism tree (per feedback_commit_prefix_main_on_shared_tree); galaxy commits land here, not on slot/tango
- NEVER `git stash` in shared tree (clobbers peers) — use `git show <ref>:<path>` for old versions

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[discovery-foundations]] / [[discovery-source-atlas]] / [[discovery-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: tango).
<!-- /OPERATIONAL-CONTEXT -->
