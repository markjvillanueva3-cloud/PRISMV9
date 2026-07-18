# SIERRA-BACKEND/U-5H-BOUNDARY-COORDINATOR — [MAIN-FORCE] [SIERRA-BACKEND]/U-5H-BOUNDARY-COORDINATOR (slot:sierra): switch decision floors the 5h window per-account (no thrash after a switch)

**Commit:** `e7c430485724` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T15:14:28-05:00
**Tags:** sierra-backend, u-5h-boundary-coordinator, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-5H-BOUNDARY-COORDINATOR (slot:sierra): switch decision floors the 5h window per-account (no thrash after a switch)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-5H-BOUNDARY-COORDINATOR (slot:sierra): switch decision floors the 5h window per-account (no thrash after a switch)

R15 follow-through for U-5H-ACCOUNT-BOUNDARY (56b018b985): the account-switch DECISION path
(account-switch-restart-coordinator.mjs fiveHourFallbackFromTranscripts) called the RAW fiveHourTokenSum
with the full 5h window, NOT the boundary-floored value -- so right after a switch it still counted the
OLD account's tokens (~144M live) and could immediately re-trigger a switch (thrash). Now it floors at
the last account-switch (readSwitchBoundaryMs + effectiveWindowMs, mirroring liveStatus); injectable
o._readBoundary like the existing o._sum. LIVE: 144M -> ~15M (current account). +2 tests (69 green).
Backward-compatible. Closes the R15 chain: banner (liveStatus) + switch decision both floor per-account.
```

## Files touched (3)
- scripts/account-switch-restart-coordinator.mjs      | 13 +++++++++++--
- scripts/account-switch-restart-coordinator.test.mjs | 20 ++++++++++++++++++++
- 2 files changed, 31 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till counted the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e7c430485724`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._