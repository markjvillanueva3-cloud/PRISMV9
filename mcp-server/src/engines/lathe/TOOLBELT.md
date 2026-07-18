# Lathe Galaxy TOOLBELT.md — tool-call efficiency for slot:whiskey

> Memoized Grep/Glob/Bash/Read/git/dispatcher patterns. Each entry saves tokens or time vs. the naive alternative. Reach here BEFORE re-deriving a search. Built 2026-05-28.

## prism_* dispatcher actions used most (PREFER over Grep — ranked top-K, not raw dump)
- `prism_session:master_index_query {keyword:"lathe"}` | where-is-X across 110K-node graph+wiki+memory | beats `Grep -r lathe` (returns ranked, not 1000s of lines)
- `prism_session:dispatcher_map_compact` | full dispatcher list (1 call) | beats Globbing `tools/dispatchers/`
- `prism_session:action_search {query:"turning chuck"}` | find dispatcher action by intent | beats reading the 373-action enum
- `prism_turning:lathe_safety_predicate_evaluate` / `:lathe_partoff_safety_gate` / `:lathe_workholding_select_jaw` | the 3 pre-emit safety gates | run BEFORE any program emit
- `prism_safety:check_spindle_torque` / `:check_spindle_power` | spindle torque/power envelope per op | not a fresh formula
- `prism_turning:lathe_thread_schedule` | multi-pass G76 plan | not single-pass
- `prism_calc:turning_force` / `:merchant_analysis` | Kienzle/Merchant turning physics | imports constants, never inline
- `prism_knowledge:tribal_search {slot:"whiskey"}` / `:tribal_capture {slot:"whiskey",…}` | read/write lathe tribal | NEVER write `knowledge/tribal/lathe-*.md` directly (regen-overwritten)
- NOTE: `prism` server (port 3100) is often down; `prism_safe` namespace (`mcp__prism_safe__prism_*`) is the live one this session. `prism_memory:semantic_search` needs qdrant (down 2026-05-28 → keyword Glob fallback).

## Glob patterns (path-scoped — avoid `**/` from repo root)
- `*Lathe*.ts` @ `mcp-server/src/engines` | ~198 engines
- `*{Turning,Swiss,Okuma,HardTurn,DiamondTurn,Eccentric,ChuckJaw,Tailstock,BarFeed,SubSpindle}*.ts` @ `engines` | ~40
- `*{lathe,turn,swiss,thread,groove,hard-turn,chip-control}*.md` @ `H:/prism/.claude/commands` | project skills (5; user-global in `~/.claude/commands`)
- `*{lathe,Lathe,turning,okuma}*` @ `mcp-server/data/state` | lathe state JSON (~10)
- `*{lathe,turning,okuma,swiss}*.mjs` @ `H:/prism/scripts` | lathe build/audit/train scripts (~10)
- `*{whiskey,lathe,turn,thread,okuma}*.md` @ `C:/Users/wompu/.claude/projects/H--prism/memory` | lathe memories (~41) — qdrant-down PULL fallback
- `LATHE-*.json` @ `mcp-server/data/milestones` | 19 milestone envelopes

## Grep patterns (lathe-domain)
- `kc1\.1\|TAYLOR_PARAMS\|KIENZLE` @ a lathe engine | confirm constants imported not inlined (P0 guard)
- `G50\|G96\|G97` @ a generated `.nc` | CSS-cap presence check (missing G50 on G96 = crash)
- `G7[01235]\|G76\|G92` @ `.nc` | canned-cycle dialect detection (roughing/finish/groove/thread)
- multiline `interface\s+\w+` @ engine | locate type defs (escape literal braces — ripgrep)

## Read offset+limit cheatsheet (large files — never full-read)
- `engines/Lathe*Engine.ts` | offset by method | many are 50-90KB → read the function, not the file
- `physics/constants.ts` (48KB) | grep the const name first, then Read that slice
- `ENGINE_DIGEST.md` (227KB) | use `master_index_query`, not full Read
- this galaxy's `CLAUDE.md`/`MEMORY.md`/`PATHS.md` | auto-cascade-injected when editing under `engines/lathe/` — already in context

## Bash one-liners (RTK-wrapped — 60-99% token cut on noisy output)
- `rtk git status` / `rtk git diff` / `rtk git log` | compact git
- `cd mcp-server && rtk npx vitest run -t "Lathe"` | lathe tests, failures-only (~99%)
- `rtk find "H:/PRISM/JM DIE/CNC LATHE" -maxdepth 1 -type d` | customer folder list (118) — bounded depth, never recurse the 24K-file tree
- `command node scripts/lathe-quality-pipeline.mjs <file.nc>` | quality score (rubric) — `command` bypasses rtk for JSON output
- `node scripts/lathe-program-lint.mjs <file.nc>` | **MCP-independent** physics/safety lint vs the 8 gotchas (G50/G96 cap · IPR/IPM · threading · parting · C-axis polar; `--plan` adds boring-bar L/D + nose-radius Ra). `--json`/`--strict`. Works when port 3100 is down. Brain `scripts/lib/lathe-gcode-lint.mjs` (28 tests, reuses parseBlocks/extractProgramParameters + G76 validator). Skill `/lathe-lint`. Auto-fires on lathe `.nc` writes via `lathe-gcode-lint-guard.mjs` (PostToolUse, advisory).
- loop bookend: `node .claude/helpers/loop-state.mjs {start,tick,end} --session <sid>`

## git common (slot:whiskey worktree — `H:/prism-slot-whiskey` on `slot/whiskey`)
- `rtk git add mcp-server/src/engines/lathe/ state/shared/slot-souls/whiskey.md`
- commit subject: `[whiskey] [<SCOPE>]/U-<id>: <title>` (slot-prefixed; routes to slot worktree)
- old version of a file (peer-locked, no stash on shared tree): `git show <ref>:<path>` per [[feedback_no_git_stash_shared_tree]]

## Custom slot skills
- `/galaxy-verify-whiskey` (load + verify the galaxy brain — 13-gate + PSN + hook-wiring)
- `/lathe-lint` (MCP-independent turning-program physics/safety lint — the 8 gotchas as PASS/FAIL)
- `/lathe-studio` `/lathe-print-to-program` `/lathe-thread` `/lathe-groove` `/hard-turn` `/chip-control` `/quality-check-lathe` `/ship-lathe`

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** Okuma MULTUS (mill-turn), Fusion/Mastercam turning; controllers Okuma OSP/Fanuc. Live corpus + versions: [[primary-domain-resource-map]] (keep-fresh cadence there).
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[lathe-foundations]] / [[lathe-source-atlas]] / [[lathe-applied-practice]] / [[lathe-advanced-techniques]].
- **This domain's local resource trove (resources/ + JM DIE/ subdirs, easy access):** [[primary-domain-resource-map]] (owner: whiskey). Cutting numerics (SFM/IPR/chip-load/Kienzle/Taylor) are NEVER inlined -- import from mcp-server/src/physics/constants.ts.
<!-- /OPERATIONAL-CONTEXT -->
