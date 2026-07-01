# TOOLBELT.md — token-lean tool-call patterns (slot:alpha)

The exact patterns alpha reaches for. Memoized so future sessions don't re-derive. Each entry must save tokens vs the naive alternative.

## ⚠ Tool gotchas (verified the hard way)
- **`Glob` `path:` backslash bug** — `Glob({pattern, path:'H:\\prism'})` silently returns "No files found" even when files exist. Use forward-slash Bash `ls` to verify presence, OR call Glob with NO `path` (default CWD) + a full relative pattern. Cost 3 false-empty results 2026-05-29. [[reference_alpha_glob_backslash_path_bug]]
- **Explore agent + schema** — `agent({agentType:'Explore', schema})` in a Workflow no-ops (returns empty, 0 tokens). Use `general-purpose` for schema-forced returns. [[reference_alpha_explore_agent_schema_incompat]]
- **Ollama offload** — `/api/tags` can answer while `/api/chat` hangs (GPU contention). prompt-rewriter / pipeline hooks silently skip — don't assume offload happened; check `ollama-offload-dashboard.mjs`.

## Domain awareness (always-on context)
- `node scripts/token-awareness-snapshot.mjs` | the single command for "what's my domain's synergy health?" — regenerates the 11-leg PSN audit `state/shared/TOKEN-OPTIMIZATION-AWARENESS.md`; auto-injected at SessionStart for slot:alpha by `alpha-token-domain-awareness-inject.mjs`. Run after domain state changes.

## Grep patterns
- `slot:alpha\|token-optimization galaxy` | `knowledge/wiki/architecture/,lessons/` | ~13 hits | confirm wiki discoverability (FAIL 10 gate)
- `kc1_1\|taylor` | `mcp-server/src/physics/constants.ts` | const lookups | NEVER inline; always cite this file
- `writeFileSync.*<path>` | `scripts/,*.mjs` | find non-atomic writers (race audits)

## Glob patterns (NO backslash path — use default-CWD or Bash ls)
- `mcp-server/src/engines/Token*.ts` | token engines | 6-10 files | inventory
- `.claude/hooks/*ollama*.mjs` | offload hooks | ~25 files | offload audit
- `state/shared/dashboards/*.json` | telemetry dashboards | savings/route surfaces

## Bash one-liners (RTK-wrapped — `rtk` = 60-99% reduction on verbose stdout)
- `ls H:/prism/mcp-server/src/engines/ \| grep -iE "^token"` | reliable file presence (vs broken Glob path) | n/a
- `rtk node scripts/ollama-offload-dashboard.mjs --json` | offload health | ~90% vs raw
- `rtk git log --oneline -20` | recent commits | ~70% vs raw git log
- `rtk vitest run <file>` | test run | ~99% (failures only)
- `rtk npx tsc --noEmit` | typecheck | ~83% (grouped by file/code)
- `node H:/prism/.claude/helpers/loop-state.mjs tick --session <sid> --status ok --note "<1-line>"` | loop checkpoint | n/a

## Read offset+limit cheatsheet
- master `MEMORY.md` / `CLAUDE.md` / `ENGINE_DIGEST.md` | use `prism_session:master_index_query` ranked top-K INSTEAD (10-50K tokens raw) | route-first
- large engine `.ts` | `Read offset:<line> limit:80` around the symbol, not full file | targeted
- never re-Read a file written/edited this turn (harness tracks state)

## git common (RTK-wrapped; slot worktree H:/prism-slot-alpha)
- `rtk git status -sb` | branch + ahead/behind | ~60%
- `rtk git rev-list --left-right --count slot/alpha...cad-fusion-live-ms0` | staleness gauge | tiny
- `rtk git add <pathspec> && rtk git commit -m "[alpha] [SCOPE]/U-ID: title"` | slot-routed commit | ~59%
- commit prefix `[alpha]` (slot worktree) or `[MAIN]` (shared tree) per [[feedback_commit_prefix_main_on_shared_tree]]

## prism_* dispatcher actions used most (route-before-Grep)
- `prism_session:master_index_query keyword=<x>` | "where is X?" / "what handles Y?" | 1 call vs N-file Grep against 110K-node graph + wiki + memory
- `prism_session:dispatcher_map_compact` | dispatcher→action map | avoids reading DISPATCHER_DIGEST (11K)
- `prism_memory:semantic_search query=<x> topK=20` | brain recall (PULL axis) | vs grepping memory dir
- `prism_knowledge:tribal_capture {slot:'alpha',tip,context,citation}` | push tribal (auto-surfaces via tribal-by-domain-inject) | vs raw markdown write (auto-overwritten)
- `prism_context:token_economy_report` / `token_awareness_state` | live token zone + spend | vs manual estimation
- `prism_dev:read_optimize_recommend` / `output_truncate_auto` | trim large reads/outputs | proactive budget

## Loop discipline (alpha is the /loop reference slot)
- Bookend: `loop-state.mjs start --target N` → `tick` per iter → `end --reason done`.
- NEVER `ScheduleWakeup` between iters ([[feedback_no_schedule_wakeup_in_loop]]) — 5-min cache TTL > round-trip value.
- R10 checkpoint each tick; R6 at YELLOW summarize + (let /compact + precompact-handoff carry RESUME).

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[token-optimization-foundations]] / [[token-optimization-source-atlas]] / [[token-optimization-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: alpha).
<!-- /OPERATIONAL-CONTEXT -->
