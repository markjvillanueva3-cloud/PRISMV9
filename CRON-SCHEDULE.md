# CRON-SCHEDULE — PRISM Windows Task Scheduler

> Generated reference for `scripts/install-cron-schedule.ps1` (P11-U03).

## What this is

A canonical, version-controlled set of recurring dev-quality jobs that
should run on every PRISM dev box. The schedule itself lives in
`scripts/lib/cron-schedule-plan.mjs` (single source of truth, unit-tested);
the PowerShell installer translates the plan into Windows
`schtasks.exe /Create` invocations.

If a script in the plan does not exist on the current box, the installer
**skips it gracefully** — no errors, no spurious tasks. This makes the
same plan work across worktrees that ship slightly different scripts.

## Schedule

| Task ID | Frequency | Script | Purpose |
|---------|-----------|--------|---------|
| `prism-mirror-c-to-h-nightly`         | daily 02:30      | `scripts/mirror-c-to-h-audit.mjs --write`        | Mirror new C:\ writes to H:\ before they bit-rot |
| `prism-inventory-refresh-daily`       | daily 06:00      | `scripts/update-prism-inventory.mjs`             | Refresh PRISM-INVENTORY-LATEST.md |
| `prism-docker-audit-daily`            | daily 04:00      | `scripts/docker-audit.mjs --write`               | Refresh DOCKER-INVENTORY.md |
| `prism-extractor-audit-daily`         | daily 04:30      | `scripts/extractor-audit.mjs --write`            | Refresh EXTRACTOR-INVENTORY.md |
| `prism-token-economy-weekly`          | weekly mon 03:00 | `scripts/token-economy-benchmark.mjs`            | Roll up Ollama offload savings + emit TOKEN-ECONOMY-REPORT.md |
| `prism-ollama-health-hourly`          | hourly           | `scripts/intel-stack-bootstrap.mjs --json`       | Probe Qdrant + Ollama; verify embedding endpoint |
| `prism-ollama-offload-dashboard-daily`| daily 23:50      | `scripts/ollama-offload-dashboard.mjs`           | Snapshot ollama-offload-stats.json into rolling delta |
| `prism-svi-refresh-daily`             | daily 05:00      | `scripts/svi-refresh.mjs`                        | Refresh SVI watch status |

All times are local to the machine running the tasks (Windows Task
Scheduler default).

## Install

```powershell
# Dry-run: see what would be installed on this box
pwsh -File scripts/install-cron-schedule.ps1 -DryRun

# Real install (requires schtasks.exe; no admin needed for user-scope tasks)
pwsh -File scripts/install-cron-schedule.ps1

# Use a non-default node binary
pwsh -File scripts/install-cron-schedule.ps1 -NodeExe "C:\Program Files\nodejs\node.exe"
```

The installer logs every action (install / skip / error) to
`mcp-server/data/state/cron-runs.jsonl`.

## Inspect installed tasks

```powershell
# List PRISM-prefixed tasks
schtasks /Query /FO LIST /V | Select-String 'prism-'

# Specific task detail
schtasks /Query /TN prism-docker-audit-daily /FO LIST /V

# Run a task immediately (test trigger)
schtasks /Run /TN prism-docker-audit-daily
```

## Uninstall

```powershell
pwsh -File scripts/install-cron-schedule.ps1 -Uninstall
```

This deletes every task that's currently in the plan's `runnable` list.
Tasks that exist in Windows but are NOT in the plan are left alone.

## Adding new tasks

1. Edit `scripts/lib/cron-schedule-plan.mjs` and append to `DEFAULT_TASKS`.
2. Run `node scripts/lib/cron-schedule-plan.mjs` to verify the plan validates.
3. Run the test suite: `npx vitest run src/__tests__/CronSchedulePlan.test.ts`.
4. Re-run the installer (`pwsh -File scripts/install-cron-schedule.ps1`).

The `validateTask` helper enforces:

- `id` must be kebab-case and unique
- `schedule` must parse to one of `daily HH:MM` / `hourly` / `weekly <dow> HH:MM` / `monthly <dom> HH:MM`
- `script` (repo-relative) must be present
- `purpose` (one-line description) is required for this doc

## Run log format

Every task execution and every install/uninstall outcome is appended to
`mcp-server/data/state/cron-runs.jsonl`. One JSON object per line:

```json
{
  "ts": "2026-05-06T15:30:00.000Z",
  "action": "install" | "uninstall" | "execute",
  "taskId": "prism-docker-audit-daily",
  "result": "created" | "deleted" | "absent" | "failed" | "ok",
  "detail": "<human-readable diagnostic>",
  "host": "MARKV-WIN"
}
```

The actual task stdout/stderr is appended to the same file via the
`>>` redirection set up by the installer when registering the task.

## Why a JS planner + PS1 wrapper

PowerShell parsing is hard to unit-test on Linux CI. Putting the plan
+ validation in JS gives us:

- 30+ vitest cases covering schedule grammar, task validation,
  per-box planForBox partitioning, and DEFAULT_TASKS internal
  consistency
- A JSON contract (`node scripts/lib/cron-schedule-plan.mjs --json`)
  that the installer (PS, bash, or anything else) just translates

The PS1 stays small (~120 lines) and only owns the OS-specific
schtasks.exe invocation.
