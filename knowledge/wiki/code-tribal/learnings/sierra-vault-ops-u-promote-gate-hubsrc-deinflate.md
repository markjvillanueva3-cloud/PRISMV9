# SIERRA-VAULT-OPS/U-PROMOTE-GATE-HUBSRC-DEINFLATE — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-PROMOTE-GATE-HUBSRC-DEINFLATE (slot:sierra): structural ref-count de-inflation -- hub sources don't count toward the Obsidian->wiki promote gate

**Commit:** `9791b047326b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T08:31:59-05:00
**Tags:** sierra-vault-ops, u-promote-gate-hubsrc-deinflate, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-PROMOTE-GATE-HUBSRC-DEINFLATE (slot:sierra): structural ref-count de-inflation -- hub sources don't count toward the Obsidian->wiki promote gate

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-PROMOTE-GATE-HUBSRC-DEINFLATE (slot:sierra): structural ref-count de-inflation -- hub sources don't count toward the Obsidian->wiki promote gate

isHubSource(filePath): refs originating from auto-gen aggregators (dreams/ or _index/ path segment, or basename index.md) are cataloging/free-association, NOT genuine cross-referencing, so they no longer count toward the inbound-ref promotion gate. This is the STRUCTURAL root fix generalizing the per-class nonPromotableReason() content-signature patches -- a future hub-inflated junk class can no longer clear minRefs=3 via hub inflation alone. Empirically proven non-destructive: excluding all 15 live hub sources (11 dreams + 4 index.md) drops 0 of 55 genuine candidates. Wired at top of the scan loop + report.hubSourcesSkipped + CLI hubSrcSkip=. +4 tests (1 unit w/ segment-anchor + backslash + degenerate-input cases, 2 mutation-proof integration); 38/38 green; mutation-verified (neuter isHubSource -> exactly the 3 new tests fail). 3-agent per-file scrutiny PASS 0 P0/P1.
```

## Files touched (3)
- scripts/promote-memory-to-wiki.mjs      | 29 +++++++++++++++++++++++++++--
- scripts/promote-memory-to-wiki.test.mjs | 60 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 86 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9791b047326b`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._