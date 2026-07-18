# Fleet-Hygiene Galaxy — TOOLBELT (slot: golf)

> Memoized tool-call patterns slot:golf reaches for most. Each saves tokens/time vs. the naive alternative. Verified 2026-05-29.

## Bash one-liners (the reaper loop)
- `node H:/prism/scripts/fleet-reaper-sweep.mjs --once --json` | the canonical sweep — pipe through a `node -e` JSON filter to print only `{mem,slots,pending,caveats,gpu,ollama}` (full output is ~6KB; filtered is ~400B)
- `node H:/prism/.claude/helpers/chat-slots.mjs reclaim` | clean dead-PID slots before any reaper decision
- `node H:/prism/.claude/helpers/chat-slots.mjs golf-liveness` | `{status,isAlive,ageMs,...}` already classified
- `node H:/prism/.claude/helpers/cleanup-orchestrator.mjs` | the sibling locks/claims reaper — run alongside the slot-aware sweep

## PowerShell (Windows-native — bash mangles Windows flags)
- `Get-ScheduledTask -TaskName "PRISM Fleet Reaper"` + `Get-ScheduledTaskInfo` | task state — NOT `schtasks /Query` via Bash (git-bash mangles `/Query` → path)
- process census: `Get-CimInstance Win32_Process` → group by Name, sum `WorkingSet64` | one call gives counts+RAM+parent+CommandLine for orphan classification
- kill confirmed orphan: `Stop-Process -Id <pid> -Force` (clearer errors than `taskkill`)
- GPU: `nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader`

## Orphan-classification rule (THE safety pattern)
- An orphan is reapable ONLY if NO live `claude.exe` exists anywhere in its ancestor chain (full walk, not immediate parent) AND age > 45s AND it survived ≥2×300s confirm.
- `non-claude-parent` MCP-zombie hunter hits = live chats' MCP servers (parent is the node launcher wrapper). NEVER bulk-kill them.

## Glob gotcha (worktree vs main tree)
- CWD is the slot worktree (`H:/prism-slot-golf`); galaxy + buildout files live in `H:/prism` main tree. A relative Glob (`mcp-server/src/engines/...`) MISSES them. Use absolute `H:/prism/...` paths in Glob/Read for galaxy + state files.

## Read offset/limit cheatsheet
- master `MEMORY.md` | offset 39 limit ~18 | the `### Galaxy brain back-pointers` registry (don't read the whole 20KB file)
- `settings.json` | grep the key first (`AUTOCOMPACT`/`effortLevel`/`MODEL`), then Read the line range | avoids a 1700-line read

## git (RTK-wrapped — golf commits to main tree as [MAIN])
- `rtk git status` / `rtk git diff` / `rtk git add <paths>` / `rtk git commit` | 59-80% output reduction
- golf galaxy docs live in `H:/prism` (main tree) → commit subject prefix `[MAIN]` per [[feedback_commit_prefix_main_on_shared_tree]]

## prism_* dispatcher actions (when MCP :3100 is UP — currently down → fall back to scripts)
- `prism_session:master_index_query keyword="fleet-reaper"` | ranked graph hits — beats Grep for "where is X"
- `prism_memory:semantic_search query="..." topK=20` | memory recall (the UP leg of the master-brain link)
- `prism_knowledge:tribal_capture {slot:'golf',tip,context,citation}` | tribal tip injection (surfaces via tribal-by-domain-inject)
- Fallback when :3100 is down: `node H:/prism/scripts/system-viz-query.mjs find <noun>` for graph lookups.

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack.
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[fleet-hygiene-foundations]] / [[fleet-hygiene-source-atlas]] / [[fleet-hygiene-applied-practice]].
- **Resource roots (easy access):** this galaxy's PATHS.md + `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (H:/PRISM/resources, JM DIE, Docustrata) (owner: golf).
<!-- /OPERATIONAL-CONTEXT -->
