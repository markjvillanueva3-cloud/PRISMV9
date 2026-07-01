# SELF-STARTUP-MS0/U-CONFIRM-DOC-FIX — [MAIN-FORCE] [SELF-STARTUP-MS0]/U-CONFIRM-DOC-FIX (slot:bravo): retire the stale -Confirm:$true examples in send-keys-to-window.ps1 header (3-of-3 P2 re-introduction guard). The DOCTRINE block, .PARAMETER Confirm, and the actuation .EXAMPLE all showed `-Confirm:$true` as the way to actuate -- the EXACT broken pattern (it cannot bind via -File; U-CONFIRM-ENV-FIX). A future caller copying the .EXAMPLE would reintroduce the silent no-op. Now all three point at the PRISM_SENDKEYS_CONFIRM=1 env-var opt-in (the working path the U-ZM2-01 comment already documents); the example shows `$env:PRISM_SENDKEYS_CONFIRM=1; powershell -File ...`. Doc-only (comment-help block); script still parses + runs (dummy-hwnd dry-run returns valid JSON). The wiki zulu-orchestrator.md latent-bug section was already accurate (no change).

**Commit:** `3b3ad7fa0c63` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T21:10:35-05:00
**Tags:** self-startup-ms0, u-confirm-doc-fix, auto-distilled

## Subject
[MAIN-FORCE] [SELF-STARTUP-MS0]/U-CONFIRM-DOC-FIX (slot:bravo): retire the stale -Confirm:$true examples in send-keys-to-window.ps1 header (3-of-3 P2 re-introduction guard). The DOCTRINE block, .PARAMETER Confirm, and the actuation .EXAMPLE all showed `-Confirm:$true` as the way to actuate -- the EXACT broken pattern (it cannot bind via -File; U-CONFIRM-ENV-FIX). A future caller copying the .EXAMPLE would reintroduce the silent no-op. Now all three point at the PRISM_SENDKEYS_CONFIRM=1 env-var opt-in (the working path the U-ZM2-01 comment already documents); the example shows `$env:PRISM_SENDKEYS_CONFIRM=1; powershell -File ...`. Doc-only (comment-help block); script still parses + runs (dummy-hwnd dry-run returns valid JSON). The wiki zulu-orchestrator.md latent-bug section was already accurate (no change).

## Body
```
[MAIN-FORCE] [SELF-STARTUP-MS0]/U-CONFIRM-DOC-FIX (slot:bravo): retire the stale -Confirm:$true examples in send-keys-to-window.ps1 header (3-of-3 P2 re-introduction guard). The DOCTRINE block, .PARAMETER Confirm, and the actuation .EXAMPLE all showed `-Confirm:$true` as the way to actuate -- the EXACT broken pattern (it cannot bind via -File; U-CONFIRM-ENV-FIX). A future caller copying the .EXAMPLE would reintroduce the silent no-op. Now all three point at the PRISM_SENDKEYS_CONFIRM=1 env-var opt-in (the working path the U-ZM2-01 comment already documents); the example shows `$env:PRISM_SENDKEYS_CONFIRM=1; powershell -File ...`. Doc-only (comment-help block); script still parses + runs (dummy-hwnd dry-run returns valid JSON). The wiki zulu-orchestrator.md latent-bug section was already accurate (no change).
```

## Files touched (2)
- .claude/helpers/send-keys-to-window.ps1 | 22 +++++++++++++---------
- 1 file changed, 13 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- till parses + runs (dummy-hwnd dry-run returns valid JSON). The wiki zulu-orchestrator.md latent-bug section was already accurate (no change).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3b3ad7fa0c63`
- Milestone envelope: `mcp-server/data/milestones/SELF-STARTUP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._