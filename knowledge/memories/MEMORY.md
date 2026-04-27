# PRISM Memories Aggregator

> Auto-indexed catalog of every page under `knowledge/memories/`. **Do not edit by hand** — regenerate via `scripts/wiki-rebuild-memory-index.mjs`.

**Total pages:** 57  |  **Last indexed:** 2026-04-27

## Index by frontmatter `type`

### `user` (6 pages) — User profile & preferences

- [`user_expert_role.md`](user/user_expert_role.md) — Always assume the role of a polymath expert across all scientific, engineering, business, and legal domains
- [`user_hex_pin_process.md`](user/user_hex_pin_process.md) — User makes hex pins with boss using live tooling C-axis milling, manually compensates 0.001-0.003 taper for deflection
- [`user_industry.md`](user/user_industry.md) — User works in fastener industry, makes cold heading dies from tool steel on CNC lathes with live tooling
- [`user_multi_terminal_workflow.md`](user/user_multi_terminal_workflow.md) — User runs 6+ concurrent Claude terminals plus a Codex chat; Codex helps backend but mostly works frontend
- [`user_profile.md`](user/user_profile.md) — Mark Villanueva - CNC manufacturing developer, uses portable SSD across multiple PCs
- [`user_shop_profile.md`](user/user_shop_profile.md) — User's shop cuts hardened/annealed tool steels with brazed carbide inserts — wire EDM must handle bi-material transitions and multi-axis

### `feedback` (24 pages) — Behavioural feedback (rules, corrections, validated approaches)

- [`feedback_ai_first_development.md`](feedback/feedback_ai_first_development.md) — User wants all development to leverage PRISM AI reasoning (prism_ai dispatcher with 87 actions) by default
- [`feedback_always_build.md`](feedback/feedback_always_build.md) — For roadmap engine work, always build every identified gap engine — never recommend skipping even thin/narrow gaps
- [`feedback_backend_before_frontend.md`](feedback/feedback_backend_before_frontend.md) — User explicitly wants backend EDM physics and optimization perfected before any frontend work
- [`feedback_box_programs_amateur.md`](feedback/feedback_box_programs_amateur.md) — All CNC programs in Box drive were written by amateurs — do not trust S/F values, only mine structural patterns
- [`feedback_cross_session_duplication.md`](feedback/feedback_cross_session_duplication.md) — DuplicationGuardEngine must persist to cross-session registry to prevent duplicate builds across chat sessions
- [`feedback_docker_wsl_recovery.md`](feedback/feedback_docker_wsl_recovery.md) — When Docker won't launch (Windows + WSL2), check com.docker.service first — it's usually the root cause.
- [`feedback_dont_soften_completeness_gates.md`](feedback/feedback_dont_soften_completeness_gates.md) — When fixing hook hangs, never flip continueOnError:true on hooks that enforce no half-built work (code-completeness-gate, test-legitimacy, anti-pattern-detector
- [`feedback_esbuild_externals.md`](feedback/feedback_esbuild_externals.md) — ws, node-opcua, occt-import-js must be externalized in esbuild build scripts to prevent build failures
- [`feedback_esm_toplevel_return.md`](feedback/feedback_esm_toplevel_return.md) — Hooks are .mjs ES modules; `return` at module top-level is a parse error. Use exit(0) or main() wrapper.
- [`feedback_exhaustive_variability.md`](feedback/feedback_exhaustive_variability.md) — For every PRISM unit build, push capability coverage and test variability to the maximum — do not settle for a minimum-viable implementation
- [`feedback_frontend_codex.md`](feedback/feedback_frontend_codex.md) — Never build over Codex frontend pages. Analyze and improve existing pages, maintain Calculator Studio design language.
- [`feedback_h_drive_master.md`](feedback/feedback_h_drive_master.md) — H drive is the single source of truth for all code, builds, settings, and configs. Both PCs (home + work) must stay in sync via H drive.
- [`feedback_h_drive_portable.md`](feedback/feedback_h_drive_portable.md) — H: drive is portable between work PC and home PC — all fixes must work on both machines
- [`feedback_hook_process_hygiene.md`](feedback/feedback_hook_process_hygiene.md) — Every PRISM hook must exit fast, declare a timeout, and not leak node processes — concurrent-terminal setup compounds any leak 6-7×
- [`feedback_lightsaber_borders.md`](feedback/feedback_lightsaber_borders.md) — User wants vibrant 2-tone LED lightsaber-style glowing borders on feature sections to attract attention and sell the product
- [`feedback_no_delete_assets.md`](feedback/feedback_no_delete_assets.md) — NEVER delete or disable settings, hooks, skills, scripts, tools, features without explicit user permission
- [`feedback_post_development.md`](feedback/feedback_post_development.md) — Always use base Fusion 360 posts as foundation, layer PRISM enhancements on top — never write CPS posts from scratch
- [`feedback_ppg_frontend.md`](feedback/feedback_ppg_frontend.md) — All PPG page frontend work must follow the Codex-built calculator/PPG design theme — dark, WorkspacePrimitives, rounded-[22px] panels
- [`feedback_ppg_quality.md`](feedback/feedback_ppg_quality.md) — PRISM-Master CPS posts must be full-featured like the v10.9 production post (22K lines), not generic 800-line skeletons
- [`feedback_roadmap_track.md`](feedback/feedback_roadmap_track.md) — In YOLO-continue mode, default track is the Wire EDM roadmap, not CAD or LATHE
- [`feedback_safety_critical_tests.md`](feedback/feedback_safety_critical_tests.md) — ALL tests must be real validation tests that prove correctness against published data — CNC code can kill people
- [`feedback_shop_programs_amateur.md`](feedback/feedback_shop_programs_amateur.md) — Box drive wire/lathe/mill programs were made by amateurs — don't calibrate engine to match their suboptimal parameters
- [`feedback_verbose_ok.md`](feedback/feedback_verbose_ok.md) — User prefers expansive, thorough work over terse responses; use the full 1M context window
- [`h_drive_master.md`](feedback/h_drive_master.md) — H:\.claude is the portable canonical source for all Claude Code config (settings, hooks, commands, skills, memories). C: mirrors are secondary — they exist beca

### `project` (18 pages) — Project state, milestones, in-flight work

- [`handoff_pp_road_map.md`](project/handoff_pp_road_map.md) — Cross-PC session handoff after completing full PP dispatcher parity (137/137 engines, 648 pp_* actions). Read this first if resuming PP track or any roadmap wor
- [`jm-die-shop.md`](project/jm-die-shop.md) — JM Die is the canonical test shop for all PRISM development. Cold heading die & tooling, fastener industry. 21 machines, 10K+ programs, 142 customers.
- [`project_archive_outdated.md`](project/project_archive_outdated.md) — H:\PRISM_ARCHIVE_2026-02-01 contains 684 JS files from before PRISM was built — outdated, do not import or rely on.
- [`project_biz_track.md`](project/project_biz_track.md) — 7 RGS milestones (BIZ-MS0..MS6, 57 units) for full business management — persistence, shop floor clock, HR/payroll, Lean dashboards, sales/procurement, maintena
- [`project_cad_bridge.md`](project/project_cad_bridge.md) — Parallel chat is wiring PRISM AI/Claude to drive hyperCAD, Mastercam, Inventor, Fusion, FreeCAD — CAM-EXHAUST PHASE-1 catalogs feed this bridge
- [`project_lathe_master.md`](project/project_lathe_master.md) — Tracks current position on LATHE-MASTER unified lathe roadmap (P0-P11, 135 units). Updated 2026-04-17 at P0 natural pause.
- [`project_mill_master.md`](project/project_mill_master.md) — Active cross-session track — mill AGI + calculator + post-processor + pipeline. Resume trigger = continue MILL-MASTER or resume mill roadmap or continue the mil
- [`project_mill_master_canonical.md`](project/project_mill_master_canonical.md) — Canonical milling roadmap source (v12+); 8 prior mill roadmaps archived 2026-04-21; do not resurrect old paths
- [`project_okuma_controller_limits.md`](project/project_okuma_controller_limits.md) — Okuma OSP controllers have character/line count limits — cannot send large parametric macro programs. PRISM must calculate internally and output compact hardcod
- [`project_portable_ssd_current_pc.md`](project/project_portable_ssd_current_pc.md) — Setup state of the new PC connected via portable SSD (H:\) as of 2026-03-30
- [`project_pp_agi_s0.md`](project/project_pp_agi_s0.md) — Pre-Flight Asset Wiring roadmap status — 658 unwired engines, 7 units complete
- [`project_prism_forces_naming.md`](project/project_prism_forces_naming.md) — iMachining-style adaptive clearing renamed to PRISM Forces throughout codebase including future post processors
- [`project_psau_foresight.md`](project/project_psau_foresight.md) — All 18 PSAU-FORESIGHT units shipped. 36 test files, 629 assertions passing. /foresight skill registered.
- [`project_shop_bimaterial_cutting.md`](project/project_shop_bimaterial_cutting.md) — Many wire programs cut at carbide/hardened steel braze interfaces (HRC 58-65) — explains slow feeds, justifies conservative parameters
- [`project_wedm_agi_status.md`](project/project_wedm_agi_status.md) — Current status of Wire EDM AGI consolidated roadmap - MS-P2-GAPFILL complete, next is MS-P0.5-COORD
- [`project_wedm_erp_complete.md`](project/project_wedm_erp_complete.md) — Wire EDM ERP integration milestone closed 2026-04-18. Commits 0b68926d0 (engines) + 7bf70baa1 (routes+frontend). 72 tests passing. 10/10 units.
- [`token_saving_infrastructure.md`](project/token_saving_infrastructure.md) — 11 auto-fire hooks for token efficiency — search routing, read guards, bash redirects, agent throttling, spend tracking. All hooks use fd 0 stdin fallback for W
- [`tribal_auto_categorization.md`](project/tribal_auto_categorization.md) — All tribal knowledge tips are auto-categorized on capture/ingest via ContentAutoTaggerEngine. Stop hook ensures no un-categorized tips persist. UserPromptSubmit

### `reference` (9 pages) — Pointers to external systems, indexes, & directives

- [`devops_improvements.md`](reference/devops_improvements.md) — CI/CD pipeline, build system commands, and release gates for PRISM MCP Server
- [`distributed_locking.md`](reference/distributed_locking.md) — Patterns for concurrent state access, atomic writes, and multi-agent orchestration
- [`plugin_architecture.md`](reference/plugin_architecture.md) — How to extend PRISM with physics plugins, hooks, and registries
- [`prism_commands.md`](reference/prism_commands.md) — Essential slash commands that ALL sessions MUST know and AUTO-SUGGEST when triggers detected
- [`reference_box_programs.md`](reference/reference_box_programs.md) — User transferred existing CNC programs from Box cloud to H drive for reference — programs are amateur-written and unoptimized
- [`reference_lathe_handoff.md`](reference/reference_lathe_handoff.md) — Points to the canonical handoff doc for picking up LATHE-MASTER roadmap work across sessions/machines.
- [`reference_memory_seeding.md`](reference/reference_memory_seeding.md) — How to seed Qdrant vector store with PRISM assets using /memory-seed skill and seed-qdrant.ts script
- [`reference_prism_inventory.md`](reference/reference_prism_inventory.md) — Where to find the always-current PRISM inventory showing engines, dispatchers, actions, tests counts
- [`wedm_shop_programs.md`](reference/wedm_shop_programs.md) — Real wire EDM G-code programs from user's Box Drive, Mitsubishi controller format, with exact offsets/feeds/passes

## Provenance

Each entry has YAML frontmatter:

```yaml
---
name: <human title>
description: <one-line hook used for relevance scoring>
type: <user | feedback | project | reference>
---
```

## How to add a memory

1. Drop the file in the matching `knowledge/memories/<type>/` subdirectory.
2. Run `node scripts/wiki-rebuild-memory-index.mjs` (or wait for the SessionStart cadence).
3. The aggregator regenerates from the live filesystem; nothing is hand-maintained.

## Cross-references

- Wiki index: [../wiki/index.md](../wiki/index.md)
- Wiki log: [../wiki/log.md](../wiki/log.md)
- Schema spec: [../../WIKI_SCHEMA.md](../../WIKI_SCHEMA.md)

