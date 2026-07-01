# REGRESSION-HYGIENE-MS0/U-RSA04 — [MAIN] [REGRESSION-HYGIENE-MS0]/U-RSA04: v1.2 same-day fix detection

**Commit:** `2e5dd1397266` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:16:27-05:00
**Tags:** regression-hygiene-ms0, u-rsa04, auto-distilled

## Subject
[MAIN] [REGRESSION-HYGIENE-MS0]/U-RSA04: v1.2 same-day fix detection

## Body
```
[MAIN] [REGRESSION-HYGIENE-MS0]/U-RSA04: v1.2 same-day fix detection

Lowers laterCommitsTouching cutoff from T23:59:59 (end-of-day) to
T00:00:00 (start-of-day) so same-day fixes are detected. Many
regressions are logged in the same commit that ships the fix —
v1/v1.1's end-of-day cutoff excluded the entire observation day,
missing all same-day fixes.

The risk that broadening would catch the regression-observation
commit itself as 'stale evidence' is addressed by an explicit
excludeShas list: classify() now passes [entry.observedSha] to
laterCommitsTouching, which drops matches whose short-SHA equals
any excluded SHA.

Live-result: 21 entries scanned, stale catches 2 → 3. New catch:
the 'stop-force-loop-continue.mjs Stop hook is dead code fleet-wide'
entry (2026-05-16) — v1.1 missed it because fix commit 95ea2e3941
landed the same day; v1.2 catches it.

possibly-shipped count grew 2 → 12 — the broader cutoff legitimately
surfaces more file activity for human review (not flagged as 'stale'
because those entries lack 'fix: pending' marker).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- scripts/regression-staleness-auditor.mjs | 26 +++++++++++++++++++-------
- 1 file changed, 19 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2e5dd1397266`
- Milestone envelope: `mcp-server/data/milestones/REGRESSION-HYGIENE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._