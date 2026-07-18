# WEDM Galaxy TOOLBELT.md — tool-call efficiency for slot:mike

> Memoized Grep/Glob/Bash/Read/git patterns the Wire Wizard reaches for most. Each saves tokens or round-trips vs the naive alternative. Pair with [`./PATHS.md`](PATHS.md) (the O(1) path atlas).

## Grep patterns
- `id: *['"]wedm-` | `mcp-server/src/data/wedm-knowledge-tips.ts` | ~122 hits | enumerate tribal tip ids before citing one
- `E12XX_STANDARD_4PASS\|E12XX_HEAVY_5PASS\|E28XX_TAPER_5PASS` | `jm-die-wedm-tech-tables.ts` | 3 | jump to the canonical E-code family blocks
- `case ['"]wedm_` | `mcp-server/src/tools/dispatchers/edmDispatcher.ts` | ~200 | list dispatcher actions (use `-o` to get just the action names)
- `class WEDM\w+Engine` | `mcp-server/src/engines/` (glob `WEDM*.ts`) | scope which engine owns a capability before building new
- `getJMDieCustomerPath` | `mcp-server/src/**` | the ONLY sanctioned way to reach `JM DIE/WIRE EDM/<customer>/` — never Glob that tree

## Glob patterns
- `mcp-server/src/engines/{WEDM,EDM}*.ts` | the flat engine surface (149-215 files) — NOT a `wedm/` subdir
- `knowledge/tribal/wedm-knowledge-tips-*.md` | 89 generated tip files (regenerate from the .ts source — never hand-edit)
- `knowledge/wiki/architecture/engines/wedm/*.md` | 206 per-engine wiki docs
- `mcp-server/data/state/WEDM_*.{json,jsonl}` | 48 runtime-state files (lattice/GNN/causal/outcome-ledger/lora-checkpoint)

## Bash one-liners (RTK-wrapped)
- `rtk node H:/prism/scripts/system-viz-query.mjs find wedm` | 30 wedm nodes — authoritative; the graph is minified single-line JSON so `grep -c` lies (returns 1)
- `cat mcp-server/data/state/WEDM_DIGEST.json` | live counts (engines/tests/skills/dispatcher-actions/formulas) — READ, never hardcode in docs
- `rtk npx vitest run -t "EDM"` / `-t "WEDM"` | ~99% token saving vs raw vitest; failures-only
- `getJMDieCustomerPath()` via a node one-liner | resolves a customer dir without walking 4,058 archive files

## Read offset+limit cheatsheet
- `wedm-knowledge-tips.ts` | 105K — NEVER full-read; `Grep` the tip id then `Read offset:<line> limit:30`
- `edmDispatcher.ts` | 3,262 lines — `Grep` the `case 'wedm_xxx'` then `Read offset limit`
- `ENGINE_DIGEST.md` | 227K — `Grep 'WEDM\|EDM'` not full-read

## git (RTK-wrapped, slot/mike worktree)
- `rtk git -C /h/prism-slot-mike add <path> && rtk git -C /h/prism-slot-mike commit -- <path>` | scope commit to `-- <pathspec>` per `[[reference_git_commit_pathspec_2026_05_20]]` (bare `git add` then `commit` can absorb peer changes on shared tree)
- commit subject: `[mike] [SCOPE]/U-ID: title`

## prism_* dispatcher actions used most (when MCP is UP — currently DOWN, fall back to scripts)
- `prism_edm:wedm_feasibility` | pre-flight gate before any program emit
- `prism_edm:wedm_multipass` | rough+skim pass schedule (E-code family)
- `prism_edm:wedm_post_mitsubishi_generate` | FA-10S G-code emission
- `prism_knowledge:tribal_search slot=mike` | surface wedm tribal (NOT Grep over 89 files)
- `prism_memory:semantic_search query="wedm ..."` | the master-brain PULL leg
- octopus consensus (`/octopus` · `MultiModelConsensusEngine`) | when ≥2 sources disagree on E-code/ACU pass family or discharge params across controllers (Sodick/Mitsubishi/Makino) beyond tolerance | corroborated answer + dissent ledger (`state/shared/octopus-outcomes/wedm.jsonl`); PSN-octopus Wave-3 (papa 2026-06-09, per GALAXY-SYNERGY-MATRIX)
> MCP down this session → use `node H:/prism/scripts/<x>.mjs` + native Grep/Read fallbacks above.

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** wire-EDM controllers (Makino/Mitsubishi/Sodick/GF); JM 99-customer program corpus. Live corpus + versions: [[primary-domain-resource-map]] (keep-fresh cadence there).
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[wedm-foundations]] / [[wedm-source-atlas]] / [[wedm-applied-practice]] / [[wedm-advanced-techniques]].
- **This domain's local resource trove (resources/ + JM DIE/ subdirs, easy access):** [[primary-domain-resource-map]] (owner: mike). Cutting numerics (SFM/IPR/chip-load/Kienzle/Taylor) are NEVER inlined -- import from mcp-server/src/physics/constants.ts.
<!-- /OPERATIONAL-CONTEXT -->
