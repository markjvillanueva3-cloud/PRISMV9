# PRISM Shared Memory Index

## User
- [user_multi_machine_setup.md](user_multi_machine_setup.md) — Desktop (DIGITALSTORM-PC) is primary dev machine, laptop secondary, portable SSD for powerful PCs

## Migration
- [project_portable_ssd_setup.md](project_portable_ssd_setup.md) — Complete SSD setup guide for new PC: all paths, installs, credentials, path remapping
- [project_path_migration_h_drive.md](project_path_migration_h_drive.md) — All paths migrated C:\PRISM to H:\prism (2026-03-30). 155 files fixed (2026-03-31): hooks, helpers, commands, skills, directives

## Feedback (settings.json)
- [feedback_settings_json_reverts.md](feedback_settings_json_reverts.md) — Other chats revert PostCompact hook + per-session PIDs. Always verify before modifying settings.json

## Feedback (how to work)
- [feedback_effort_and_auto_mode.md](feedback_effort_and_auto_mode.md) — /effort max + auto mode every session, MANDATORY
- [feedback_compaction_discipline.md](feedback_compaction_discipline.md) — Compact every 2-3 units, auto-compact blocks at 35 edits
- [feedback_scrutiny_and_validation.md](feedback_scrutiny_and_validation.md) — 3-10 agent scrutiny, manufacturer data validation, fix ALL findings
- [feedback_ultrawide_resolution_check.md](feedback_ultrawide_resolution_check.md) — User is on an ultrawide monitor. Check live viewport/resolution before frontend layout work and validate fills/proportions there first
- [feedback_follow_v24_protocol.md](feedback_follow_v24_protocol.md) — NEVER skip v24 session protocol (4-LOOP, /prism-review, EXIT GATE)
- [feedback_fix_all_findings.md](feedback_fix_all_findings.md) — Fix ALL scrutiny findings (CRIT+HIGH+MED), never dismiss as "pre-existing"
- [feedback_prism_review_rate_limits.md](feedback_prism_review_rate_limits.md) — Review agents: model haiku, max 3, sequential, inline fallback
- [feedback_scrutinize_plans_before_approval.md](feedback_scrutinize_plans_before_approval.md) — 2+ rounds of parallel scrutiny agents with different roles before plan approval

## Reference (where to find things)
- [reference_rgs_and_skills_system.md](reference_rgs_and_skills_system.md) — /rgs = 7-stage pipeline, 250+ skills, MASTER_INDEX not yet wired
- [../CLAUDE-CODEX-MCP-DIRECTIVE.md](../CLAUDE-CODEX-MCP-DIRECTIVE.md) — Consolidated MCP directive (replaced 3 files, saves ~13K tokens/session)
- [../CLAUDE-CODEX-COMMAND-BRIDGE.md](../CLAUDE-CODEX-COMMAND-BRIDGE.md) — Slash-command mirroring rules
- [../CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md](../CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md) — Index-first search, token economy
- [../CLAUDE-CODEX-COORDINATION-DIRECTIVE.md](../CLAUDE-CODEX-COORDINATION-DIRECTIVE.md) — Workboard/chat coordination
- [../CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md](../CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md) — Finish-first roadmap sequencing
- [../CLAUDE-CODEX-RGS-SYNC-PROTOCOL.md](../CLAUDE-CODEX-RGS-SYNC-PROTOCOL.md) — Canonical /rgs-sync protocol
- [../CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md](../CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md) — Task queue behavior, claims, dependencies
- [../ROADMAP_COLLABORATION_STATE.md](../ROADMAP_COLLABORATION_STATE.md) — Live gate, sequencing, ownership
- [../TASK_COORDINATION_SPEC.md](../TASK_COORDINATION_SPEC.md) — Task queue spec for Claude/Codex
- [../TASK_QUEUE.md](../TASK_QUEUE.md) — 43 tasks, dependency-ordered board
- [../PRISM_SHARED_INDEX_SURFACES.md](../PRISM_SHARED_INDEX_SURFACES.md) — Digest inventory for index-first search

## Wire EDM Studio
- [project_wedm_studio_roadmap.md](project_wedm_studio_roadmap.md) — WEDM-MS0 (21 units, core wizard) + WEDM-MS1 (24 units, full capabilities). 45 units total, 35/35 actions. Scrutinized 40 agent-runs, avg 83/100. Execute with `/rgs continue WEDM-MS0`.

## Milestones
- [project_scimath_ms0_complete.md](project_scimath_ms0_complete.md) — SCIMATH-MS0 COMPLETE (2026-04-02). 17 units, 12 engines, 12 calcDispatcher actions, 353 tests. PCA+FEM upgraded.
- [project_phase_0A_0C_completion.md](project_phase_0A_0C_completion.md) — Phases 0-A/0-B/0-C complete (2026-03-24), foundation verified
- [project_automation_hardening_complete.md](project_automation_hardening_complete.md) — AUTO-0..7 complete (2026-03-30). Quality dashboard live.

## Project State
- [project_roadmap_v24_state.md](project_roadmap_v24_state.md) — 307 milestones (2026-04-02). SCIMATH done, MCAT in progress. v24 for session detail.
- [project_unified_roadmap_rewrite.md](project_unified_roadmap_rewrite.md) — Unified roadmap 427->717 lines: authority table, child index, Phases 14-21, revenue gates
- [project_roadmap_scrutiny_audit.md](project_roadmap_scrutiny_audit.md) — 20-agent audit avg 49/100. Feature Cascade Protocol proposed.
- [project_converge_roadmap.md](project_converge_roadmap.md) — CONVERGE: 40 sessions absorbed into MP-0..MP-4 (historical context only)
- [project_web_wiring_audit.md](project_web_wiring_audit.md) — 50-page audit done. 47 load, 3 broken (fixed). 68-task roadmap.
- [project_dual_agent_coordination.md](project_dual_agent_coordination.md) — Claude=backend, Codex=frontend. Auto-sync on /compact+/startup.
- [project_hook_system_overhaul.md](project_hook_system_overhaul.md) — 52 user + 42 project hooks. Quality pipeline wired.
- [project_svi_directive_until_100.md](project_svi_directive_until_100.md) — Psi=97.7% (2026-04-02). 511 formulas, 28 categories. Remaining 2.3%: tool data, tribal indexing.
- [project_mcp_utilization_audit.md](project_mcp_utilization_audit.md) — MASTER_INDEX missing, 7 orphaned dispatchers, ~1100 dark engines (2026-03-30 audit).
- [../CLAUDE-CODEX-SVI-DIRECTIVE.md](../CLAUDE-CODEX-SVI-DIRECTIVE.md) — Shared long-term SVI directive
