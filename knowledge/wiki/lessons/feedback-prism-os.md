---
title: "feedback-prism-os"
name: feedback-prism-os
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_prism_os.md
promoted_at: 2026-06-06T04:55:50.762Z
source_refs: 5
---

# PRISM OS — PSN leg #2 (the shell + desk + program-release surface)

**PRISM OS ≡ the role-aware workspace surface exposed via the `prism_operating_system` MCP dispatcher (~45 actions).** It's PSN leg #2 ([[feedback_psn_definition]]) — what makes PRISM feel like an operating system instead of a script collection. Same orphan-pattern fix as PSK and [[feedback_obsidian_brain|Obsidian-brain]]: heavily referenced (every `/checkin`, every shop-floor query, every dashboard) but lacked a dedicated doctrine entry.

## What "PRISM OS" actually is

A composable workspace surface keyed on three axes — **employee role** × **slot** × **shop-floor state**. Each query (`shell_bootstrap`, `job_desk`, etc.) returns a self-contained context bundle so the chat doesn't have to assemble it from 12 different reads. Same compaction-survival pattern as PSK ([[feedback_psk_kernel]]) but at the workspace layer instead of the syscall layer.

## The major surface groups (~45 actions on `prism_operating_system`)

| Group | Actions | Purpose |
|---|---|---|
| **Shell bootstrap** | `shell_bootstrap`, `shell_employee_profiles`, `shell_employee_bootstrap` | Per-employee workspace init |
| **Desk** | `desk_counts`, `desk_payload`, `desk_kpi_counts`, `job_desk` | KPI-aware desk views |
| **Program release** | `program_release_catalog`, `program_release_workspace` | Released CNC programs surface |
| **Scheduling** | `scheduling_studies` | Job-shop scheduling layer |
| **Shop floor** | `shop_floor_check_in`, `messages_workspace`, `hot_jobs_list`, `hot_jobs_set`, `hot_jobs_clear` | Live shop-floor state |
| **Views** | `view_create`, `view_update`, `view_delete`, `view_list` | Saved workspace views |
| **Pins / recent / search** | `pin_entity`, `unpin_entity`, `pin_list`, `recent_record`, `recent_list`, `search_global`, `search_suggest`, `search_index`, `search_stats` | Operator navigation primitives |
| **Presets** | `preset_save`, `preset_get`, `preset_list`, `preset_search`, `preset_share`, `preset_unshare`, `preset_compare`, `preset_validate`, `preset_delete`, `preset_increment_use` | Reusable parameter sets |
| **Learning / academy** | `course_create`, `course_get`, `course_enroll`, `course_progress`, `course_search`, `checkpoint_submit`, `enrollment_summary`, `learning_media_add`, `learning_media_list` | Operator-training pipeline (see [[checkin-loop-fullstack-2026-05-16]]) |

## Why call it "OS"

Three properties make this an OS-shaped surface, not just a dispatcher:

1. **Role-shaped** — `shell_employee_profiles` differentiates output by role (engineer, programmer, operator, manager). Same shell command returns different bundles.
2. **Stateful** — `pin_entity` / `recent_record` / `view_create` persist across sessions. Recalls survive `/compact` via the [[reference_session_continuity_stack_2026_05_15]].
3. **Composable** — `shell_bootstrap` calls `desk_counts` calls `job_desk` calls `scheduling_studies` — each returns enough metadata to be the input to the next, so chats can stream queries instead of issuing a 12-call audit.

## How PRISM OS composes with the other PSN legs

- **OS → Memory ([[feedback_obsidian_brain]])** — `pin_entity` and `recent_record` are workspace state but their *content* references memory entries.
- **OS → Engines** — `program_release_workspace` consults the Mastercam/hyperMILL post-processor engines for the released-program catalog.
- **OS → PSK ([[feedback_psk_kernel]])** — `/checkin` composes `psk checkin` + `prism_operating_system:shop_floor_check_in`.
- **OS → [[reference_system_viz|System Viz]]** — desk KPI counts feed roost nodes in `/system-viz`.
- **OS → PRISM AI** — `aiSystemRouterEngine.route()` routes operator-NL queries to the right OS action.

## Standing rule

- Before writing a workspace-shaped script or helper, check `prism_operating_system` actions (R8 — read before you write, [[feedback_r5_thru_r12_doctrine]]).
- Don't reinvent shell / desk / view / pin / preset primitives — extend the dispatcher action set.
- Workspace state writes (pin, view, preset) should go through the dispatcher, not directly to state JSON — the dispatcher owns the schema-version migrations and the cross-session sync.

## Why this memory exists

PRISM OS was referenced 8+ times in CLAUDE.md (`shell_bootstrap`, `desk_counts`, etc.) and once in [[feedback_psn_definition]] as leg #2, but had no dedicated entry — auto-injectors couldn't surface the **composition picture** when an operator typed "what does PRISM OS expose?". Same orphan-pattern fix as the rest of this batch.

## Cross-refs

- [[feedback_psn_definition]] — the 11-leg PSN; this is leg #2
- [[feedback_obsidian_brain]] — sibling PSN leg #1
- [[feedback_psk_kernel]] — `/checkin` composes both PSK and PRISM OS
- [[checkin-loop-fullstack-2026-05-16]] — `/checkin-<nato> /loop` flow that composes OS + PSK + memories
- [[feedback_r5_thru_r12_doctrine]] — R8 read-before-write applies before any new workspace-shaped helper

## Source

Promoted from memory [[feedback_prism_os]] (referenced 5x across the vault). The memory remains the editable source of truth.
