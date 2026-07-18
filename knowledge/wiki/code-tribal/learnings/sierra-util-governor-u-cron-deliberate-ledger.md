# SIERRA-UTIL-GOVERNOR/U-CRON-DELIBERATE-LEDGER — [MAIN-FORCE] [SIERRA-UTIL-GOVERNOR]/U-CRON-DELIBERATE-LEDGER (slot:sierra): self-healer respects deliberately-disabled ledger

**Commit:** `21363a832ce0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:26:29-05:00
**Tags:** sierra-util-governor, u-cron-deliberate-ledger, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-UTIL-GOVERNOR]/U-CRON-DELIBERATE-LEDGER (slot:sierra): self-healer respects deliberately-disabled ledger

## Body
```
[MAIN-FORCE] [SIERRA-UTIL-GOVERNOR]/U-CRON-DELIBERATE-LEDGER (slot:sierra): self-healer respects deliberately-disabled ledger

harden-prism-tasks.ps1 blindly re-enabled every valid-script task (Enabled = -not scriptMissing),
which would resurrect completed one-shot migrations + operator-retired tasks every 24h. Added a
deliberately-disabled ledger (state/shared/fleet/deliberately-disabled-tasks.json, schema 1.0.0,
fail-OPEN on parse error) that the hardener now honors: Enabled = (-not scriptMissing) -and (-not isDeliberate).
Live-validated: parse-ok, run hardened=81 deliberate-kept-dark=4 fails=0; 4 Slot-* migrations stay dark.
Part of the utilization-governor sweep: re-enabled 45 drift-disabled crons (dark 51->6), self-healer back on.
```

## Files touched (3)
- .claude/helpers/harden-prism-tasks.ps1              | 32 +++++++++++++++++++++++++++-----
- state/shared/fleet/deliberately-disabled-tasks.json | 15 +++++++++++++++
- 2 files changed, 42 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- TIL-GOVERNOR]/U-CRON-DELIBERATE-LEDGER (slot:sierra): self-healer respects deliberately-disabled ledger
- tilization-governor sweep: re-enabled 45 drift-disabled crons (dark 51->6), self-healer back on.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 21363a832ce0`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-UTIL-GOVERNOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._