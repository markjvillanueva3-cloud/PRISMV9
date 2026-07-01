# Mill Galaxy — TOOLBELT.md (tool-call efficiency for slot:foxtrot)

> Memoized Grep/Glob/Bash/Read/git/`prism_*` patterns mill work reaches for most. Each entry saves tokens or time vs the naive alternative. Built 2026-05-28 (U-PSGB-FOXTROT).

## Grep patterns
- `millingStrategy\|toolpathType\|isoMaterialGroup` | `mcp-server/src/schemas/millActionSchemas.ts` | ~10 | enum/type names before editing a schema
- `KIENZLE_KC\|KIENZLE_MC\|TAYLOR_PARAMS` | `mcp-server/src/physics/constants.ts` | ~6 | confirm exact export name before import (NEVER inline)
- `detectSingularity` | `engines/MillKinematicsCollisionEngine.ts` + `Fusion360MillTurnBridgeEngine.ts` | 2 | locate the 5-axis safety gate before generating A-axis
- `chip.?thinning` (-i) | `engines/AdvancedMillingStrategiesEngine.ts` | few | the canonical chip-thinning factor — do NOT re-derive

## Glob patterns
- `mcp-server/src/engines/*Mill*.ts` | strict-prefix mill engines | ~120
- `mcp-server/src/engines/{Trochoidal,Helical,BallEndMill,Chamfer,HighFeed,Plunge,Micro,ThreadMilling,SplineMilling}*.ts` | op-specific (no `Mill` prefix) | broadens to ~222 total
- `mcp-server/data/posts/*HAAS*.cps` | Haas posts | 75+
- `mcp-server/src/__tests__/*[Mm]ill*.test.ts` | mill tests (canonical test dir per [[feedback_engine_tests_in_tests_dir]]) | ~30

## Bash one-liners
- `command git show cad-fusion-live-ms0:<path>` | recover galaxy files NOT yet on slot/foxtrot | **use `command` not `rtk`** — rtk compacts markdown you must read fully
- `command node .claude/helpers/chat-slots.mjs claim --preferSlot foxtrot --chatId <id>` | bind foxtrot | flag is `--preferSlot` NOT `--slot` (else it auto-walks to a free slot)
- `command node .claude/helpers/chat-slots.mjs release --chatId <id>` then claim | move off a wrong slot cleanly
- `ls mcp-server/src/engines/ \| grep -ciE '^Mill\|^HyperMill'` | live strict-prefix engine count | fast inventory vs full Glob
- `command node H:/prism/.claude/helpers/loop-state.mjs tick --session <id> --status ok --note "<...>"` | R10 checkpoint each iter

## Read offset+limit cheatsheet
- `millDispatcher.ts` | Grep the action name first → Read only that case block | 217.8K whole-file read is ~99% waste
- `ToolpathStrategyRegistry.ts` | Grep the strategy name → Read the matched span | 197K, never full-read
- `jm-die-profile.ts` | Grep `VMC-0` → Read only the machine block | skip the lathe/EDM blocks
- `milling-pdf-cited-tips.ts` | Grep the operation bucket (`face_milling`, `high_feed_milling`…) | read only that tip array

## git common (RTK-wrapped)
- `rtk git status` / `rtk git diff` / `rtk git log` | 59-80% savings
- commit format: `[foxtrot] [SCOPE]/U-ID: title` — slot-prefixed; lands on the `slot/foxtrot` worktree per [[feedback_commit_to_slot_worktree]] (shared-tree commits get absorbed into peer commits)
- recover-not-stash: `command git show <ref>:<path>` over `git stash` in shared trees (per [[feedback_no_git_stash_shared_tree]])

## prism_* dispatcher actions used most (when MCP up)
- `prism_session:master_index_query keyword=mill` | "where is X / what handles Y" | 1 call vs a Grep sweep
- `prism_mill:mill_print_to_program` | print→physics-optimized G-code | full pipeline
- `prism_mill:{mill_strategy,mill_physics,mill_collision,mill_kinematics,mill_optimize,mill_validate,mill_agi}` | core mill ops
- `prism_calc:{kienzle_force,milling_forces,trochoidal_*,chip_thinning_*}` | physics | vs re-deriving from raw formulas
- `prism_safety:validate_physics` | S(x) ≥ 0.98 shop_floor gate | BEFORE any cutting recommendation
- `prism_knowledge:tribal_search slot=foxtrot` / `prism_shop_practice:*` | mill tribal | vs Grep'ing tribal files

## MCP-DOWN fallback (banner present this session)
When the MCP connectivity banner is up, every `prism_*` call fails. Fall back to: the mill atlas memory ([[reference_mill_domain_atlas_for_foxtrot_2026_05_27]]) for inventory · `ENGINE_DIGEST.md`/`DISPATCHER_DIGEST.md` (static) for "where" · `Glob`/`Grep` for code · `command node H:/prism/scripts/<x>.mjs` for direct script invocation. Say so explicitly (R12) rather than silently skipping the routed path.

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** hyperMILL/OPEN MIND, Mastercam, HSMWorks 2027, Fusion 360; controllers Haas/Hurco/Roku-Roku. Live corpus + versions: [[primary-domain-resource-map]] (keep-fresh cadence there).
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[mill-foundations]] / [[mill-source-atlas]] / [[mill-applied-practice]] / [[mill-advanced-techniques]].
- **This domain's local resource trove (resources/ + JM DIE/ subdirs, easy access):** [[primary-domain-resource-map]] (owner: foxtrot). Cutting numerics (SFM/IPR/chip-load/Kienzle/Taylor) are NEVER inlined -- import from mcp-server/src/physics/constants.ts.
<!-- /OPERATIONAL-CONTEXT -->
