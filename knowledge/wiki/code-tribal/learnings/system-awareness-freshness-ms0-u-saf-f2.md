# SYSTEM-AWARENESS-FRESHNESS-MS0/U-SAF-F2 — [MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-F2: daily cron wrapper + scheduled-task installer (sister to PRISM Fleet Reaper)

**Commit:** `ccbe3730b33f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T23:44:51-05:00
**Tags:** system-awareness-freshness-ms0, u-saf-f2, auto-distilled

## Subject
[MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-F2: daily cron wrapper + scheduled-task installer (sister to PRISM Fleet Reaper)

## Body
```
[MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-F2: daily cron wrapper + scheduled-task installer (sister to PRISM Fleet Reaper)

Phase 5 prevention layer continues. F2 builds on F1 (Stop-hook) by adding a
daily cron at 23:01 local that:
  1. Runs the U-SAF-A1 audit (7-day lookback) in-process.
  2. Appends a one-line row to state/shared/SYSTEM-AWARENESS-FRESHNESS-HISTORY.jsonl.
  3. Refreshes the baseline snapshot if older than 7 days (configurable).

Files (3):
  scripts/system-awareness-freshness-cron.mjs (cron target)
    - Pure core: shouldRefreshBaseline / buildHistoryRow / baselineNameForDate /
      planBaselineRefresh — all exported for tests
    - In-process import of U-SAF-A1 audit (no subprocess fork cost)
    - Atomic write for baseline refresh; appendFileSync for history JSONL
    - Knobs: PRISM_SAF_CRON_{DISABLE,HISTORY,BASELINE_REFRESH_DAYS}
    - Exit codes: 0 clean / 1 staleness signal / 2 error
  scripts/system-awareness-freshness-cron.test.mjs (23 tests, all pass)
    - Pure-core unit tests + subprocess oracle E2E (dry-run + live apply)
    - ≥3 failure modes (unwritable dir, garbage env vars)
    - ≥2 adversarial (Infinity refreshDays, NaN mtime)
    - ≥3 variability (refreshDays 1/7/30 boundary cases, 3 audit-shape variants)
  .claude/helpers/install-system-awareness-freshness-task.ps1 (installer)
    - Sister pattern to install-fleet-reaper-task.ps1
    - SYSTEM principal by default (whether-logged-on-or-not, session 0, no UAC)
    - Daily 23:01 trigger + AtStartup recovery
    - 3x restart at 1m on failure, 10m execution timeout
    - Flags: -DryRun (validate), -RunNow (start after register), -Uninstall
      (remove), -AsCurrentUser (S4U fallback), -AsSystem (back-compat no-op)
    - Idempotent: re-registers existing task to pick up changes
    - ASCII-safe (em-dashes / multiplication-signs avoided to dodge PS 5.1
      codepage mojibake — same lesson as the fleet-reaper installer)
  Dry-run validated: 'powershell -NoProfile -ExecutionPolicy Bypass -File install-system-awareness-freshness-task.ps1 -DryRun' produces expected SYSTEM-principal output.

To activate: ! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-system-awareness-freshness-task.ps1 -RunNow
  (operator runs elevated; the task itself runs as SYSTEM forever after)

Closes U-SAF-F2 of SYSTEM-AWARENESS-FRESHNESS-MS0. Next iter: U-SAF-F3
CLAUDE.md Recent staleness inbox auto-population OR shift to drain phases
(F1+F2 prevention now in place — Phase 5 substantially complete).
```

## Files touched (4)
- .../install-system-awareness-freshness-task.ps1    | 177 ++++++++++++++
- scripts/system-awareness-freshness-cron.mjs        | 198 ++++++++++++++++
- scripts/system-awareness-freshness-cron.test.mjs   | 256 +++++++++++++++++++++
- 3 files changed, 631 insertions(+)

## Lessons surfaced in commit body
- lesson as the fleet-reaper installer)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ccbe3730b33f`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-AWARENESS-FRESHNESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._