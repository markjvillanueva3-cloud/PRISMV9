---
name: project-scheduled-task-migration-freeze-2026-06-08
description: The fleet-task-health WARN (disabled/missing PRISM scheduled tasks) is an INTENTIONAL migration freeze — do not re-register/re-enable until operator confirms migration complete.
type: project
source: prism-memory
synced: 2026-06-27T20:30:46.458Z
aliases: project_scheduled_task_migration_freeze_2026_06_08
---


As of 2026-06-08 the fleet has ~47 PRISM Windows scheduled tasks **deliberately DISABLED during a hardware/drive migration**. Source of truth: the OPERATOR NOTE header block in `.claude/helpers/install-vault-rot-sentinel-cron.ps1` (lines 11-16): *"DO NOT run this installer (or run it with -Disabled) until the operator confirms the migration is complete."*

**Implication:** The recurring `⚠ PRISM scheduled-task safety net WARN — N/48 tasks healthy · ...=disabled/MISSING` Stop-hook advisory is firing on a state the operator **intentionally created**. It is NOT an actionable hook/build error.

- `disabled` tasks → intentional migration freeze; re-enabling violates the freeze + [[feedback_never_delete_only_disable]].
- `MISSING` tasks → not yet re-registered (same freeze); some have installers (`install-vault-rot-sentinel-cron.ps1`), some don't (`PRISM Vault Memory Promotion Cron` — no installer).
- The Stop-hook counts fluctuate (40/48 ↔ 39/48, MISSING list shifts) because a detached `fleet-task-health-watch` audit races on every Stop — `PRISM MCP Priority Guardian` showed "MISSING" in one reading but `schtasks /query` confirmed it EXISTS/Ready.

**Do NOT** auto-re-register or `-RunNow` these tasks to "fix" the WARN, even from an elevated shell. Re-arming is an **operator decision** gated on migration completion: `Enable-ScheduledTask -TaskName "<name>"` or the per-task installer with `-RunNow`. Verify live state with `node scripts/fleet-task-health-watch.mjs --json` (real shape: `.row.degraded[]`) or `schtasks //query //tn "<name>"`, not the Stop-hook snapshot.

Distinct from the 2026-06-08 hook-config fixes (hookify frontmatter conversion + dangling-module ref removal) — those WERE actionable and are done.
