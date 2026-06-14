# Post-Processor Galaxy — TOOLBELT.md (tool-call efficiency for slot:echo)

> Memoized Grep/Glob/Bash/Read/git/dispatcher patterns slot:echo reaches for most.
> Each entry saves tokens or time vs. the naive alternative. Verify a path against PATHS.md if stale.

## Grep patterns
- `"method not callable"` | `mcp-server/src/tools/dispatchers/camDispatcher.ts` | ~8 hits | finds stub-wired dark cases (the leverage list). Pair `-A1` to see the engine.
- `wedm_post_(mitsubishi\|sodick\|makino\|agie\|fanuc)_generate` | camDispatcher.ts | 5 | locate the 5 WEDM stub cases (L19871–19891).
- `case "(pp_\|ppg_\|post_\|master_post_\|lathe_postgen_)` | camDispatcher.ts | ~155 | enumerate live post action surface.
- `UnifiedControllerType\|MACHINE_FEATURE_DB\|ControllerFamily` | `mcp-server/src/engines/MasterPost*.ts` | controller enums | dialect coverage check.
- `M8\|M3\|G93\|G94\|G95\|G68.2\|G43.4\|G131\|G05` | a `.cps` file | varies | audit dialect/coolant/feed-mode/TCP/NURBS emission per post.

## Glob patterns
- `H:/prism/mcp-server/src/engines/{GCode,MasterPost}*.ts` | ~30 | all G-code + master-post engines.
- `H:/prism/mcp-server/src/engines/*Post*.ts` | ~60 | full post-proc engine surface incl per-vendor.
- `H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/*.cps` | 12 | JM post fleet.
- `H:/prism/state/shared/specs/POST-PROCESSOR-*.md` | ~5 | post-proc planning specs.
- `H:/prism/.claude/commands/{post,lathe}-*.md` | ~9 | post skills.

## Bash one-liners (RTK-wrapped)
- `ls "H:/prism/JM DIE/PRISM MODIFIED POST PROCESSORS/" \| wc -l` | count .cps fleet (expect 12).
- `rtk git log --oneline -15 -- mcp-server/src/engines/*Post*.ts` | recent post-engine commits (60% vs raw).
- `grep -c "post\|masterpost\|pp_" state/shared/specs/ROADMAP-CONSOLIDATED.md` | re-measure pending post units.
- `rtk node H:/prism/.claude/helpers/loop-state.mjs tick --session <sid> --status ok --note "<one-line>"` | loop checkpoint.

## Read offset+limit cheatsheet
- `camDispatcher.ts` | offset 19850 | limit 200 | the stub-wired tail (don't full-read a 21k-line file).
- `ENGINE_DIGEST.md` | — | — | DON'T full-read (10–50K tokens); use `prism_session:master_index_query keyword="post-processor"` instead.
- `MasterPostProcessorUnifiedAGIEngine.ts` | grep `UnifiedControllerType` first, then offset to the enum | avoid full 40K+ read.

## git common commands (RTK-wrapped)
- `rtk git status` | 59% vs raw.
- `rtk git diff -- mcp-server/src/engines/post-processor/` | galaxy-only diff for scrutiny.
- `rtk git log --oneline -10` | recent commits (echo HEAD = HURCO-POST-PIPELINE-BRIDGE-MS0 iters).
- Commit prefix on main shared tree: `[MAIN]` or `[echo]` per `feedback_commit_prefix_main_on_shared_tree`.

## prism_* dispatcher actions used most (prefer over Grep/reimpl)
- `prism_session:master_index_query keyword="post-processor"` | ranked top-K vs full ENGINE_DIGEST grep.
- `prism_cam:post_process` / `master_post_generate` / `pp_generate` | emit NC through the engine, not string concat.
- `prism_cam:cam_post_emit_safety_gate` | pre-emit safety gate (echo wired this iter13).
- `prism_cam:ppg_validate` / `ppg_translate` / `ppg_controllers` | post-gen validate/translate/list (productDispatcher).
- `prism_cam:wedm_post_mitsubishi_generate` (+ sodick/makino/agie/fanuc) | WEDM dialect emit (stub — verify executes).
- `prism_knowledge:tribal_capture {slot:'echo', tip, context, citation}` | capture dialect/gotcha wisdom (NOT raw markdown).
- `prism_knowledge:tribal_search slot=echo` | recall echo's tribal tips.
- `xproc_outcome_publish {slot:'echo', domain:'post-processor'}` | publish post outcome to india's closed loop.
- `octopus consensus (/octopus · MultiModelConsensusEngine)` | when the 14 controllers' dialect tables map the same toolpath divergently, or byte-equivalence-vs-golden disputes a change → corroborated dialect emit + dissent ledger (`state/shared/octopus-outcomes/post-processor.jsonl`); PSN-octopus Wave-3 (papa 2026-06-09, per GALAXY-SYNERGY-MATRIX).
- `prism_safety:check_toolpath_collision` | collision gate before any emit.

## Anti-patterns (token waste echo avoids)
- Full-reading `camDispatcher.ts` (21k lines) — grep/offset instead.
- Full-reading `ENGINE_DIGEST.md` — `master_index_query` instead.
- Re-globbing `mcp-server/src/engines/` every session — this PATHS.md already has the inventory.
- Spawning broad Explore agents for post-proc inventory — the consolidation spec + PATHS.md already cover it.

— Created 2026-05-28 by slot:echo claude-223d9a61.

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** Fusion post, CIMCO 2025/2026, controller dialects (Haas/Fanuc/Heidenhain/Okuma/LinuxCNC). Live corpus + versions: [[primary-domain-resource-map]] (keep-fresh cadence there).
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[post-processor-foundations]] / [[post-processor-source-atlas]] / [[post-processor-applied-practice]] / [[post-processor-advanced-techniques]].
- **This domain's local resource trove (resources/ + JM DIE/ subdirs, easy access):** [[primary-domain-resource-map]] (owner: echo). Cutting numerics (SFM/IPR/chip-load/Kienzle/Taylor) are NEVER inlined -- import from mcp-server/src/physics/constants.ts.
<!-- /OPERATIONAL-CONTEXT -->
