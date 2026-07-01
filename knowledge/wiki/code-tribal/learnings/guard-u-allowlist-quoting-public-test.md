# GUARD/U-ALLOWLIST-QUOTING-PUBLIC-TEST — [MAIN-FORCE] [GUARD]/U-ALLOWLIST-QUOTING-PUBLIC-TEST (slot:alpha): allowlist charlie committed QuotingPublicQuoteEngine.test.ts deletion -- unblocks leave-a-copy Stop

**Commit:** `2c5a46281647` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:07:31-05:00
**Tags:** guard, u-allowlist-quoting-public-test, auto-distilled

## Subject
[MAIN-FORCE] [GUARD]/U-ALLOWLIST-QUOTING-PUBLIC-TEST (slot:alpha): allowlist charlie committed QuotingPublicQuoteEngine.test.ts deletion -- unblocks leave-a-copy Stop

## Body
```
[MAIN-FORCE] [GUARD]/U-ALLOWLIST-QUOTING-PUBLIC-TEST (slot:alpha): allowlist charlie committed QuotingPublicQuoteEngine.test.ts deletion -- unblocks leave-a-copy Stop

The leave-a-copy guard blocked alpha Stop on a peer file alpha never touched. Verified: charlie DELETED the test in committed commit e50c69f845 [QUOTING-SYNERGY-MS0]/U-QP-PUBLIC-INSTANT (--diff-filter=D = deleting commit); engine QuotingPublicQuoteEngine.ts still on disk; test fully recoverable from e50c69f845^. Deliberate committed removal, not a silent loss -- restoring would clobber charlie cleanup, so allowlisted (precedented GUARD/U-MTC-ALLOWLIST pattern) with a documented _changelog entry. If it was a charlie mistake, charlie restores from e50c69f845^. slot:alpha
```

## Files touched (2)
- state/shared/file-relocation-allowlist.json | 10 +++++++---
- 1 file changed, 7 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till on disk; test fully recoverable from e50c69f845^. Deliberate committed removal, not a silent loss -- restoring would clobber charlie cleanup, so allowlisted (precedented GUARD/U-MTC-ALLOWLIST pattern) with a documented _changelog entry. If it was a charlie mistake, charlie restores from e50c69f845^. slot:alpha

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2c5a46281647`
- Milestone envelope: `mcp-server/data/milestones/GUARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._