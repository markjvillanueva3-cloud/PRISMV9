---
name: reference_golf_reaper_state_correction_2026_06_20
description: "CORRECTION to the stale 'reaper DISABLED P0' — the SYSTEM scheduled task never read settings.json and has been running LIVE+SAFE 10 days; session path now dry-run-observe per operator."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.599Z
aliases: reference_golf_reaper_state_correction_2026_06_20
---


# Golf fleet-reaper — state correction (2026-06-20, slot:golf /checkin-golf)

Supersedes the `🔴 NEW P0 — reaper CURRENTLY DISABLED` claim in [[reference_golf_inventory_of_record_2026_06_11]]. That claim was only **half true** — verified live this session.

## Verified facts (R12)
- **`PRISM_FLEET_REAPER_DISABLE` / `PRISM_GOLF_GUARDIAN_DISABLE` / `PRISM_FLEET_REAPER_DRY_RUN` are UNSET at Machine AND User scope** (`[Environment]::GetEnvironmentVariable(...,"Machine"/"User")`).
- The settings.json `PRISM_FLEET_REAPER_DISABLE=1` (set 2026-06-11) only ever gated the **Claude-session-side** reaper (guardian hooks + Claude-spawned sweeps). `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0` means session subprocesses inherit it; the **SYSTEM Task-Scheduler task does NOT** (separate parent, sees Machine + SYSTEM-account env only).
- The durable **`PRISM Fleet Reaper`** task: `node fleet-reaper-sweep.mjs --once`, principal **SYSTEM/Highest**, 5-min cadence, **`LastResult=0`** consistently → it has been running **LIVE (no --dry-run) the whole time**, including the 10 days the reaper was believed disabled.
- The stale-node false-positive fix (cmdline-allowlist + 30-min age-floor + 12-frame ancestry + conservative no-cmdline skip) is in the code the SYSTEM task runs (shipped 2026-06-11). Tests **44/44 PASS** incl. the exact incident-repro. **Live dry-run sweep against the real process table = 0 stale-node + 0 mcp-zombie candidates.**

## State after this session
- **Session path → dry-run-observe** (operator-chosen via AskUserQuestion): settings.json now `DISABLE=0 GUARDIAN=0 DRY_RUN=1` (C: edited → mirrored to H:).
- **SYSTEM task → still LIVE** (cannot reach it from settings.json; proven safe by 10 days of `LastResult=0` + the fixed hunter + 0 live candidates). To also put it in dry-run-observe (matching the operator's choice) needs an **elevated** re-register or a Machine env var:
  - `setx /M PRISM_FLEET_REAPER_DRY_RUN 1`  (elevated; SYSTEM task picks it up next cycle), OR
  - re-register the task args as `--once --dry-run` via `install-fleet-reaper-task.ps1` (elevated).

**Why:** future golf sessions must not re-chase "reaper disabled" as an open P0 — it is restored/observe on the session path and was never actually off on the SYSTEM path. **How to apply:** trust this over the 2026-06-11 inventory P0; if full dry-run parity across the SYSTEM task is wanted, hand the operator the elevated one-liner above.
