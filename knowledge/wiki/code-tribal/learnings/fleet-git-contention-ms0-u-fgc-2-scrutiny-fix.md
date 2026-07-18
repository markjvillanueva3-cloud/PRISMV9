# FLEET-GIT-CONTENTION-MS0/U-FGC-2-SCRUTINY-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-GIT-CONTENTION-MS0]/U-FGC-2-SCRUTINY-FIX (slot:golf): close 3-of-3 reviewer findings. Reviewer-C P1: ollama-resilient-pull.ps1 MaxTries=0 made an unbounded while-loop (wrong tag / dead server = spin forever) -- added an always-on MaxWallClockMin deadline (default 12h) bounding the whole run regardless of MaxTries. Reviewer-C P2: Test-Installed used Select-String -SimpleMatch (unanchored substring, prefix-tag false-positive risk) -- now exact NAME-column membership. Reviewer-A P3: chat-slots.mjs orphan-count comment made consistent (28,761 swept). Parse-checked OK; detached pull (PID 65904) unaffected (uses default MaxTries=400, already bounded).

**Commit:** `3e39feeaaaa9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T12:29:10-05:00
**Tags:** fleet-git-contention-ms0, u-fgc-2-scrutiny-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-GIT-CONTENTION-MS0]/U-FGC-2-SCRUTINY-FIX (slot:golf): close 3-of-3 reviewer findings. Reviewer-C P1: ollama-resilient-pull.ps1 MaxTries=0 made an unbounded while-loop (wrong tag / dead server = spin forever) -- added an always-on MaxWallClockMin deadline (default 12h) bounding the whole run regardless of MaxTries. Reviewer-C P2: Test-Installed used Select-String -SimpleMatch (unanchored substring, prefix-tag false-positive risk) -- now exact NAME-column membership. Reviewer-A P3: chat-slots.mjs orphan-count comment made consistent (28,761 swept). Parse-checked OK; detached pull (PID 65904) unaffected (uses default MaxTries=400, already bounded).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-GIT-CONTENTION-MS0]/U-FGC-2-SCRUTINY-FIX (slot:golf): close 3-of-3 reviewer findings. Reviewer-C P1: ollama-resilient-pull.ps1 MaxTries=0 made an unbounded while-loop (wrong tag / dead server = spin forever) -- added an always-on MaxWallClockMin deadline (default 12h) bounding the whole run regardless of MaxTries. Reviewer-C P2: Test-Installed used Select-String -SimpleMatch (unanchored substring, prefix-tag false-positive risk) -- now exact NAME-column membership. Reviewer-A P3: chat-slots.mjs orphan-count comment made consistent (28,761 swept). Parse-checked OK; detached pull (PID 65904) unaffected (uses default MaxTries=400, already bounded).
```

## Files touched (3)
- .claude/helpers/chat-slots.mjs    |  5 +++--
- scripts/ollama-resilient-pull.ps1 | 28 +++++++++++++++++++++++-----
- 2 files changed, 26 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- wrong tag / dead server = spin forever) -- added an always-on MaxWallClockMin deadline (default 12h) bounding the whole run regardless of MaxTries. Reviewer-C P2: Test-Installed used Select-String -SimpleMatch (unanchored substring, prefix-tag false-positive risk) -- now exact NAME-column membership. Reviewer-A P3: chat-slots.mjs orphan-count comment made consistent (28,761 swept). Parse-checked OK; de

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3e39feeaaaa9`
- Milestone envelope: `mcp-server/data/milestones/FLEET-GIT-CONTENTION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._