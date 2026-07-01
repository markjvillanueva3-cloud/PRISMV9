# Speed-Feed (SFC) Galaxy — TOOLBELT.md (tool-call efficiency for slot:oscar)

> Memoized Grep/Glob/Bash/Read/git/dispatcher patterns slot:oscar reaches for most.
> Each entry saves tokens or time vs. the naive alternative. Verify a path against PATHS.md if stale.
> Rule 1: hit `reference_oscar_sfc_domain_map_2026_05_27` or `master_index_query` BEFORE any broad Grep/Glob.

## Grep patterns
- `kc1\.1\|taylor\|johnson.?cook` | `mcp-server/src/physics/constants.ts` | ~30 hits | confirm canonical constant before any edit; NEVER inline elsewhere.
- `case "(sfc_\|speed_feed_\|.*_speed_feed)` | `mcp-server/src/tools/dispatchers/calcDispatcher.ts` | ~50 | enumerate the live SFC action surface (don't full-read the dispatcher).
- `kc1_1\|specificCuttingForce\|mc:` | `mcp-server/src/data/hypermill-materials-catalog.ts` | per-material | material Kienzle lookup — grep the material, don't full-read 1.2M.
- `Math\.round\|Math\.floor` | a SpeedFeed engine under edit | varies | the R12 truncation class (AutoSpeedFeed `1b87f98f2`); round at display, not in the calc.
- `g96\|g97\|G50\|css\|constantSurfaceSpeed` | `LatheSpeedFeed*` / orchestrator | varies | verify every CSS path carries a max-RPM cap.

## Glob patterns
- `H:/prism/mcp-server/src/engines/*SpeedFeed*.ts` | ~25 | full SFC engine surface.
- `H:/prism/mcp-server/src/engines/{UltimateSpeedFeed,SpeedFeedOrchestrator,SpeedFeedNineAxis}*.ts` | 3 | the orchestrator core.
- `H:/prism/mcp-server/src/data/*speed-feed-data.ts` | ~6 | vendor S/F tables.
- `H:/prism/mcp-server/src/data/*-extracted.json` | ~24 | tool catalogs (PRISMToolCatalogAggregator source).
- `H:/prism/mcp-server/src/__tests__/*SpeedFeed*.test.ts` | several | the test suite incl. 401 gauntlet.

## Bash one-liners (RTK-wrapped where applicable)
- `node H:/prism-slot-oscar/scripts/sf-tri-vendor-smoke.mjs` | tri-vendor parity matrix smoke (PRISM×baseline×G-Wizard).
- `node H:/prism-slot-oscar/scripts/sf-parity-preview.mjs` | G-Wizard + HSMAdvisor export preview (tools + machines).
- `node H:/prism/scripts/sfc-accuracy-audit.mjs [--domain mill\|lathe\|both] [--max-rows N] [--fail-on-critical]` | SFC-ACCURACY-MS2 corpus auditor: streams the variability corpus (state/shared/sfc-variability-results/) and checks every computed row vs closed-form identities (vf=rpm*fz*flutes, vc=pi*D*n/1000) + physical validity. Report -> state/shared/SFC-ACCURACY-AUDIT.{json,md}. Full 11.2M-row run GRADE PASS (0 crit, feed 2.69%/vc 0.51% worst-case). See [[reference_oscar_sfc_accuracy_auditor_2026_06_23]].
- `rtk git log --oneline -15 -- mcp-server/src/engines/*SpeedFeed*.ts` | recent SFC commits (60% vs raw).
- `ls "C:/Users/wompu/AppData/Roaming/HSMAdvisor/"*.bak-* \| tail` | confirm operator's vendor backups before any export.
- `rtk node H:/prism/.claude/helpers/loop-state.mjs tick --session <sid> --status ok --note "<one-line>"` | loop checkpoint.

## Read offset+limit cheatsheet
- `calcDispatcher.ts` | grep first for the case, then offset±60 | NEVER full-read (huge); the SFC cases are scattered.
- `hypermill-materials-catalog.ts` / `hypermill-speed-feed-catalog.ts` | grep the material/tool, offset to it | 1.2M each — never full-read.
- `ENGINE_DIGEST.md` | — | — | DON'T full-read (10–50K); use `prism_session:master_index_query keyword="speed-feed"`.
- `physics/constants.ts` | offset to the ISO group | it's the source of truth; read the relevant block, not the whole file each time.

## git common commands (RTK-wrapped)
- `rtk git status` | 59% vs raw.
- `rtk git diff -- mcp-server/src/engines/speed-feed/` | galaxy-only diff for scrutiny.
- `rtk git log --oneline -10` | recent commits (oscar HEAD = OSCAR-SFC-9AXIS-MS0 iters).
- Commit prefix: `[oscar]` in this slot worktree; `[MAIN]` if ever on the shared tree (`feedback_commit_prefix_main_on_shared_tree`).
- **Worktree note:** slot/oscar is far behind cad-fusion-live-ms0 — commit here; golf integrates (`feedback_commit_to_slot_worktree`).

## prism_* dispatcher actions used most (prefer over Grep/reimpl)
- `prism_calc:sfc_nine_axis_run {material, tooling, toolpath, mode}` | the real recommendation path — MRR-rank + spindle/thermal clamp.
- `prism_calc:sfc_calculate` / `ultimate_speed_feed` | single-cell physics calc.
- `prism_calc:sfc_baseline_compare` / `sfc_tri_vendor_batch_compare` | vendor parity diff (don't reimplement the comparator).
- `prism_calc:sfc_chatter_stable_rpm` | Altintas SLD gate BEFORE recommending aggressive RPM.
- `prism_calc:{gwizard,hsmadvisor}_library_export` / `hsmadvisor_machine_export` | push PRISM tools/machines to operator's live vendor files.
- `prism_calc:cam_speed_feed_bridge` | normalize a CAM S/F vocab (HyperMILL/Fusion/Mastercam/…) ↔ orchestrator.
- `prism_safety:check_spindle_torque` / spindle-power gates | the clamp SFC enforces — route here, don't re-roll.
- `prism_session:master_index_query keyword="speed-feed"` | ranked top-K vs full ENGINE_DIGEST grep.
- `prism_knowledge:tribal_capture {slot:'oscar', tip, context, citation}` | capture SFC gotchas (NOT raw markdown to knowledge/tribal/).
- `xproc_outcome_publish {slot:'oscar', domain:'speed-feed'}` | publish SFC outcome to india's closed loop.
- octopus consensus (`/octopus` · `MultiModelConsensusEngine`) | when `sfc_tri_vendor_batch_compare` shows PRISM vs HSMAdvisor vs G-Wizard disagree beyond tolerance | corroborated S/F + dissent ledger (`state/shared/octopus-outcomes/speed-feed.jsonl`); PSN-octopus Wave-3 (papa 2026-06-09, per GALAXY-SYNERGY-MATRIX)

## Anti-patterns (token waste oscar avoids)
- Full-reading `hypermill-*-catalog.ts` (1.2M) or `calcDispatcher.ts` — grep/offset instead.
- Full-reading `ENGINE_DIGEST.md` — `master_index_query` instead.
- Re-globbing `mcp-server/src/engines/` every session — PATHS.md already has the inventory.
- Spawning broad Explore agents for SFC inventory — the 2026-05-27 domain map already covers it.
- Re-deriving a Kienzle/Taylor constant — it's in `constants.ts`; importing is one line.

## MCP-down fallback (this session's reality 2026-05-28)
When `prism_*` tools timeout (MCP server disconnected), fall back to direct script invocation: `node H:/prism/scripts/<X>.mjs`. SFC physics has no live-MCP dependency — the engines are pure TS. Tribal capture / semantic_search / master_index_query degrade; note the deferral (R12) and re-run when MCP returns.

— Created 2026-05-28 by slot:oscar claude-f7b0f940.

<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->
## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)
- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` (cite, do not restate -- it drifts otherwise).
- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> `qwen2.5-coder:32b`; deep local reasoning -> `gpt-oss:120b` (65GB, fits resident on the 96GB card); trivial -> `qwen2.5-coder:1.5b`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.
- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).
- **Tool stack + on-disk versions (tool upgrades / features):** vendor cutting-data catalogs (MANUFACTURER_CATALOGS), HSMAdvisor/G-Wizard parity surface. Live corpus + versions: [[primary-domain-resource-map]] (keep-fresh cadence there).
- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** [[speed-feed-foundations]] / [[speed-feed-source-atlas]] / [[speed-feed-applied-practice]] / [[speed-feed-advanced-techniques]].
- **This domain's local resource trove (resources/ + JM DIE/ subdirs, easy access):** [[primary-domain-resource-map]] (owner: oscar). Cutting numerics (SFM/IPR/chip-load/Kienzle/Taylor) are NEVER inlined -- import from mcp-server/src/physics/constants.ts.
<!-- /OPERATIONAL-CONTEXT -->
