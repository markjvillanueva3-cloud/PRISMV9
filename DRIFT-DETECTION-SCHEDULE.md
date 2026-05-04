# Drift Detection Schedule

**Milestone:** INTEL-OLLAMA-OBSIDIAN-MS0/P19 (cron + drift monitoring).
**Source of truth:** `scripts/drift-detection-manifest.json`.

This document describes how PRISM's drift-detection scripts get scheduled, where their logs live, and how the SessionStart alert hook surfaces failures.

---

## What gets scheduled

The manifest at `scripts/drift-detection-manifest.json` lists 6 tasks. Three are **clock-scheduled** (registered with Windows Task Scheduler). Three are **event-triggered** (wired to Claude Code hooks or npm post-build).

| Task ID | Schedule | Trigger | Source script | Notes |
|---|---|---|---|---|
| `drift-update-prism-inventory` | Daily 06:00 | Task Scheduler | `scripts/update-prism-inventory.mjs` | Refreshes `PRISM-INVENTORY-LATEST.md` |
| `drift-orphan-audit` | Daily 23:00 | Task Scheduler | `scripts/run-orphan-audit.ts` | Detects engines without dispatcher wiring (script not yet on this branch) |
| `drift-inventory-delta` | Hourly | Task Scheduler | `scripts/inventory-delta-report.ts` | Alert if inventory drifts >5% / hour (script not yet on this branch) |
| `drift-rebuild-awareness-cache` | On `PreEdit`, debounced 5min | Hook | `scripts/rebuild-awareness-cache.mjs` | (script not yet on this branch) |
| `drift-self-awareness-manifest` | On `SessionEnd` | Hook | `mcp-server/scripts/generate-self-awareness-manifest.mjs` | Regenerates manifest at Stop |
| `drift-populate-skill-triggers` | Post-build | npm script | `mcp-server/scripts/populate_skill_triggers.py` | Re-populates skill trigger map |

Tasks marked "(script not yet on this branch)" are scheduled with `skip_if_missing: true` — the installer logs a warning and continues, so the manifest acts as a TODO list for the missing scripts.

---

## Installing on this machine

```powershell
# Dry-run first to verify what will register:
H:\prism-iooms0\scripts\install-drift-detection-cron.ps1 -DryRun

# Install (skips tasks already registered):
H:\prism-iooms0\scripts\install-drift-detection-cron.ps1

# Reinstall existing tasks:
H:\prism-iooms0\scripts\install-drift-detection-cron.ps1 -Force

# Uninstall every PRISM-* task in the manifest:
H:\prism-iooms0\scripts\install-drift-detection-cron.ps1 -Uninstall
```

The installer registers each task with name `PRISM-<task.id>` and runs at LIMITED privilege.

**Permission note:** the installer does NOT require admin — `schtasks /Create` works at LIMITED RL for the current user. If you see `ERROR: Access is denied`, either run from an elevated shell or ensure the Windows account has "Log on as a batch job" rights.

---

## Logs and alerts

Every install/uninstall/skip action and every scheduled-job run appends a JSONL row to:

```
mcp-server/data/state/cron-runs.jsonl
```

Schema:
```json
{
  "ts": "2026-05-04T06:00:01.234Z",
  "level": "info|warn|error",
  "task_id": "drift-update-prism-inventory",
  "action": "install|run|skip|fail|...",
  "message": "human-readable detail",
  "host": "DESKTOP-N7MI1VB"
}
```

The SessionStart hook `.claude/hooks/drift-alert-surface.mjs` reads the tail of this file and surfaces:
- Any `level: error` rows from the last 24h
- Any tasks with no successful run in their schedule window (drift >5% by default; configured by `drift_alert_threshold_pct` in the manifest)

It's quiet by default — alerts only fire when the file actually contains failures or stale entries.

---

## Adding a new task

1. Add an entry to `scripts/drift-detection-manifest.json`'s `tasks[]`.
2. Set `schtasks_args` (e.g. `["/SC", "DAILY", "/ST", "08:00"]`) for clock-scheduled tasks, or `null` for event-triggered.
3. Mark `skip_if_missing: true` if the source script doesn't yet exist (so the installer skips with a warning instead of failing).
4. Re-run `install-drift-detection-cron.ps1` to register.

---

## Removal

```powershell
H:\prism-iooms0\scripts\install-drift-detection-cron.ps1 -Uninstall
```

Or per-task:
```powershell
schtasks /Delete /TN "PRISM-drift-update-prism-inventory" /F
```

---

## Cross-platform notes

The installer is Windows-only (uses `schtasks`). Linux/macOS equivalents would use `cron` or `launchd` and are out of scope for P19-U01. The manifest itself is platform-agnostic — a future P19-U03 could add a `launchd`/`cron` installer that consumes the same JSON.
