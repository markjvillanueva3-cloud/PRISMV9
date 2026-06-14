# System-Viz Galaxy — TOOLBELT (slot: sierra)

> Memoized tool-call patterns slot:sierra reaches for most. Each saves tokens/time vs. the naive alternative. The graph is 370-575MB — naive reads OOM, naive Globs time out. Verified 2026-05-29.

## Graph search — viz-first (replaces Grep/Glob for "where is X")
- `node H:/prism/scripts/system-viz-query.mjs find <noun>` | ranked graph hits, ~0 Claude tokens vs grepping 370MB. The `audit-viz-first` hook auto-fires this on audit/missing intents — read its output before any fs scan.
- `prism_session:master_index_query keyword="<x>"` (when MCP :3100 up) | top-K against the 110K-node graph + wiki + memory — beats Grep. Fallback when :3100 down → `system-viz-query.mjs`.

## Regen + verify loop (Bash)
- `node H:/prism/scripts/regen-viz.mjs` | full regen — the ONE canonical writer. ~7 min on this box; reads .last-successful-regen.json after.
- `node -e "const f=require('H:/prism/state/shared/system-viz/.last-successful-regen.json');console.log(JSON.stringify(f))"` | last-regen status WITHOUT touching the graph (ts/graphBytes/pendingCount/sidecarOk).
- `node -e "const f=require('H:/prism/state/shared/system-viz/.last-regen-failure.json');console.log(f.stage,f.exitCode)"` | last failure stage+code (134 = merge-augmentations OOM).
- `node H:/prism/scripts/detect-system-viz-drift.mjs` | drift report vs BUILD_STATE.
- `ls H:/prism/scripts/generate-*-features.mjs | grep -v test | wc -l` | live ghost-roost generator count (48).

## NEVER (the corruption / OOM patterns — sierra refuses)
- NEVER `JSON.parse(readFileSync('system-graph.json'))` in a one-liner → 548MB OOMs V8. Use `scripts/lib/system-viz-graph.mjs` (mtime-cached, size-capped reader) or a streaming `grep`/line-reader.
- NEVER `JSON.stringify(g, null, 2)` on the merged graph → the indented string blows the V8 ~512MB string cap (exit 134 class). Compact `JSON.stringify(g)` only.
- NEVER edit `system-graph.json` by hand → always `regen-viz.mjs`.
- NEVER add a `generate-*-features.mjs` to regen-viz FAST[] without ALSO adding the `merge-augmentations.mjs` splice block (silently-discarded data otherwise).
- NEVER run `generate-system-viz.mjs` standalone expecting the merged graph to update — it only writes `architecture-graph.json`; follow with `regen-viz.mjs`.

## Glob gotcha (huge tree)
- A recursive `**` Glob over `H:/prism` TIMES OUT (370MB graph + 555MB embedding partial + 13K uncommitted files). Use targeted single-dir `ls H:/prism/scripts/ | grep -iE 'viz|graph|ghost'` or absolute exact paths from PATHS.md.
- CWD is the slot worktree (`H:/prism-slot-sierra`, stale); galaxy + viz state live in `H:/prism` main tree → always use absolute `H:/prism/...` in Glob/Read/grep.

## Read offset/limit cheatsheet
- `H:/prism/state/shared/system-viz/EXECUTIVE-BRIEFING.md` | offset 0 limit 40 | headline metrics (skip the 20KB body)
- `H:/prism/scripts/regen-viz.mjs` | grep `FAST` first → Read only the stage-list range | avoids a full large-file read
- master `MEMORY.md` | grep `galaxy:system-viz` first | the back-pointer row, not the whole 20KB

## git (RTK-wrapped — sierra commits to main tree as [MAIN])
- `rtk git status` / `rtk git diff` / `rtk git add <paths>` / `rtk git commit` | 59-80% output reduction
- sierra galaxy + viz assets live in `H:/prism` (main tree) → commit subject `[MAIN] [<SCOPE>]/U-<id>:` per [[feedback_commit_prefix_main_on_shared_tree]]

## prism_* dispatcher actions (MCP :3100 — currently down → fall back to scripts)
- `prism_session:master_index_query keyword="system-viz"` | graph hits (the viz-first leg)
- `prism_memory:semantic_search query="system-viz graph regen-viz" topK=20` | brain PULL leg
- `prism_knowledge:tribal_capture {slot:'sierra',tip,context,citation}` | tribal injection (surfaces via tribal-by-domain-inject)
- `prism_dev:roadmap_tool_plan_*` | per-unit toolchain (when picking viz units)
- Fallback when :3100 down: `node H:/prism/scripts/system-viz-query.mjs find <noun>`.

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[system-viz-foundations]] / [[system-viz-source-atlas]] / [[system-viz-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: sierra).
<!-- /OPERATIONAL-CONTEXT -->
