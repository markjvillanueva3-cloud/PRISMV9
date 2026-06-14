# CAM Galaxy TOOLBELT.md — tool-call cheatsheet (slot:kilo)

> Memoized regex + path + dispatcher patterns slot:kilo reaches for most. Each entry saves tokens or time vs. the naive alternative. Route-before-grep: prefer the dispatcher rows over filesystem scans.

## prism_* dispatcher actions used most (route FIRST)
- `prism_cam:cam_strategy_recommend | {feature, material, machine} | physics-aware strategy pick — beats grepping cam-strategy engines`
- `prism_cam:toolpath_generate | {strategy, geometry, tool} | path gen — never hand-roll`
- `prism_cam:collision_check_full | {toolpath, holder, fixture, stock} | MANDATORY pre-commit gate (clearance number, not bare "safe")`
- `prism_cam:cam_safety_validate | {strategy} | Ω/S(x) shop_floor gate`
- `prism_cam:cam_multiaxis_recommend | {feature, machine} | 5-axis swarf/contour + singularity`
- `prism_cam:cam_material_map | {material} | ISO group → strategy basis`
- `prism_cam:cam_strategy_recommend_full / cam_param_optimize / cam_cross_translate | cross-vendor + optimize`
- `prism_toolpath:strategy_select | {feature} | strategy family decision tree`
- `prism_toolpath:simulate | {path} | Kienzle force + Jaeger temp + Brammertz roughness along path`
- `prism_toolpath:cycle_time_estimate / surface_finish_predict | accel/corner-aware timing + finish`
- `camFunctionDispatcher:*_function_index_* | per-vendor operation catalog + parameter search (mastercam/fusion360/hypermill/...)`
- `prism_session:master_index_query {keyword} | ranked graph hits — but degrades when system-viz regen fails (then disk-gather)`
- `prism_knowledge:tribal_capture {slot:'kilo'} | capture CAM tribal — NEVER write knowledge/tribal/cam-*.md directly`
- `xproc_outcome_publish {slot:'kilo',domain:'cam'} | close india's loop on every recommendation`
- `octopus consensus (/octopus · MultiModelConsensusEngine) | when mastercam/fusion/hypermill disagree on strategy for the same feature (pair cam_cross_translate / CAM_VENDOR_REGISTRY) | corroborated strategy + dissent ledger state/shared/octopus-outcomes/cam.jsonl — PSN-octopus Wave-3 (papa 2026-06-09, per GALAXY-SYNERGY-MATRIX)`

## Glob patterns
- `mcp-server/src/engines/CAM*.ts | top-level CAM engines | ~99 (worktree) / ~63 (main) — count varies by branch (verify: cam-galaxy-verify.mjs)`
- `mcp-server/src/engines/hypermill/*.ts | hyperMILL subdir | 17 files (+ ~61 top-level HyperMill*.ts)`
- `mcp-server/src/engines/cam/*.md | galaxy docs | 4 files`
- `mcp-server/data/state/CAM_*.json | CAM registries/indices | ~6 files`
- `.claude/commands/{cam-*,mastercam-*,hypermill-*,nx-cam-*,powermill-*,catia-*,solidcam-*}.md | CAM skills`

## Grep patterns
- `"CAMCrossSystem\|CAM_VENDOR_REGISTRY" | mcp-server/src/engines/ + data/state/ | cross-vendor mapping entry points`
- `"kc1_1\|kc11_mpa\|taylor" | mcp-server/src/engines/CAM*.ts | catch any INLINED constant (should be 0 — import from constants.ts)`
- `"collision_check\|gouge" | mcp-server/src/engines/CAM*.ts toolpathDispatcher | verify a strategy has a safety gate`
- `"xproc_outcome_publish\|xproc_calibration" | engines/cam/ | verify india closed-loop wiring`

## Read offset+limit cheatsheet
- `mcp-server/src/engines/CAMAddInFrameworkEngine.ts | offset by exported symbol | 72K — never full-read; grep symbol then Read window`
- `mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json | NEVER full-read (5.3M) | query via dispatcher / jq a key`
- `mcp-server/data/state/CAM_AI_ACTIONS_INDEX.json | jq a key, don't Read (310K)`
- galaxy `CLAUDE.md`/`MEMORY.md`/`PATHS.md` | full-read OK (≤8K each) | the point of the galaxy is cheap context

## Bash one-liners (RTK-wrapped)
- `rtk git status / git diff / git add / git commit | 59-80% vs raw`
- `cd mcp-server && rtk npx vitest run -t "CAM|Toolpath|Strategy" | ~99% vs raw vitest`
- `ls mcp-server/src/engines/ | grep -ciE "^cam" | engine count without listing 3000+ files`
- `node H:/prism/.claude/helpers/loop-state.mjs tick --session <sid> --status ok --note "<x>" | loop checkpoint`
- `node -e "const r=require('./mcp-server/data/state/CAM_VENDOR_REGISTRY.json');console.log(Object.keys(r))" | inspect a small registry without Read`

## git common (slot/kilo worktree)
- `cd H:/prism-slot-kilo && rtk git add mcp-server/src/engines/cam/ state/shared/slot-souls/kilo.md && rtk git commit -m "[kilo] ..."`
- commits route to slot worktree automatically (worktree-commit-route arms on slot/ branch)
- NEVER `git stash` in shared `H:/prism` (clobbers peers — use `git show <ref>:<path>`)

## CAM galaxy dev-tooling (maintenance — keep the galaxy synergized)
- `node scripts/cam-awareness-snapshot.mjs [--stdout|--json] | regen the custom CAM prism-awareness surface → state/shared/CAM-AWARENESS-SNAPSHOT.{md,json}`
- `node scripts/cam-galaxy-verify.mjs [--json|--quiet] | anti-regression health (8 checks, exit 0/1/2) — run after a peer merge or before relying on CAM context`
- `/cam-context | one-shot: print the full awareness snapshot + run the verifier (read-only, ~0 dispatcher overhead)`
- `.claude/hooks/cam-awareness-inject.mjs | auto-injects the compact CAM digest at SessionStart for slot/kilo (wired on golf merge)`

## Anti-patterns (toolbelt-level)
- ❌ Grep across all 3000+ engines for a CAM concept → use `prism_cam` action or `Glob CAM*.ts` first.
- ❌ Full-Read a >100K state JSON → jq/dispatcher/node-eval a key.
- ❌ Re-deriving a vendor strategy mapping → `CAM_VENDOR_REGISTRY.json`.
- ❌ Spawning verbose Explore agents for inventory when disk-glob + master_index answer it cheaper (esp. under YELLOW context / dead Ollama / many fleet loops).

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** OPEN MIND hyperMILL, Mastercam, HSMWorks 2027, SolidCAM, Fusion 360, CIMCO 2026 (verify/backplot). Live corpus + versions: [[primary-domain-resource-map]] (keep-fresh cadence there).
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[cam-foundations]] / [[cam-source-atlas]] / [[cam-applied-practice]] / [[cam-advanced-techniques]].
- **This domain's local resource trove (resources/ + JM DIE/ subdirs, easy access):** [[primary-domain-resource-map]] (owner: kilo). Cutting numerics (SFM/IPR/chip-load/Kienzle/Taylor) are NEVER inlined -- import from mcp-server/src/physics/constants.ts.
<!-- /OPERATIONAL-CONTEXT -->
