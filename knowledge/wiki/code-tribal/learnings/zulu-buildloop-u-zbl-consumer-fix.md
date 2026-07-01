# ZULU-BUILDLOOP/U-ZBL-CONSUMER-FIX — [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-CONSUMER-FIX (slot:zulu): apply the 3 scrutiny P2 fixes that the prior amend lost (throttle-dir GC via pruneStaleSessions, per-slot-fallback honesty comment, LLM-summary security note + whitespace-collapse sanitize); +1 multiline-collapse test (10/10). Prior 03daf25dfa carried unfixed code w/ a message claiming fixes -- R12 corrected here.

**Commit:** `856e8ad93ade` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T16:48:11-05:00
**Tags:** zulu-buildloop, u-zbl-consumer-fix, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-CONSUMER-FIX (slot:zulu): apply the 3 scrutiny P2 fixes that the prior amend lost (throttle-dir GC via pruneStaleSessions, per-slot-fallback honesty comment, LLM-summary security note + whitespace-collapse sanitize); +1 multiline-collapse test (10/10). Prior 03daf25dfa carried unfixed code w/ a message claiming fixes -- R12 corrected here.

## Body
```
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-CONSUMER-FIX (slot:zulu): apply the 3 scrutiny P2 fixes that the prior amend lost (throttle-dir GC via pruneStaleSessions, per-slot-fallback honesty comment, LLM-summary security note + whitespace-collapse sanitize); +1 multiline-collapse test (10/10). Prior 03daf25dfa carried unfixed code w/ a message claiming fixes -- R12 corrected here.
```

## Files touched (4)
- .claude/hooks/zulu-build-pointer-inject.mjs |  9 ++++++++-
- scripts/lib/zulu-build-pointer.mjs          | 11 ++++++++++-
- scripts/lib/zulu-build-pointer.test.mjs     |  8 ++++++++
- 3 files changed, 26 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- tiline-collapse test (10/10). Prior 03daf25dfa carried unfixed code w/ a message claiming fixes -- R12 corrected here.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 856e8ad93ade`
- Milestone envelope: `mcp-server/data/milestones/ZULU-BUILDLOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._