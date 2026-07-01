# SELF-COMPACT-MS0/U-SELFCOMPACT-SLOT-EXACT-FIRST — [MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-SLOT-EXACT-FIRST (slot:alpha): resolveSlot exact-match wins over substring (adversarial-validation finding)

**Commit:** `a5f0c8706c73` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T19:26:06-05:00
**Tags:** self-compact-ms0, u-selfcompact-slot-exact-first, auto-distilled

## Subject
[MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-SLOT-EXACT-FIRST (slot:alpha): resolveSlot exact-match wins over substring (adversarial-validation finding)

## Body
```
[MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-SLOT-EXACT-FIRST (slot:alpha): resolveSlot exact-match wins over substring (adversarial-validation finding)

The session-validation adversarial pass found a low-probability wrong-window vector: resolveSlot matched per-slot exact-OR-substring in one loop, so a PEER slot whose claude-<8hex> bare is a substring of a full harness-UUID sessionId -- iterated BEFORE the exact-match slot -- could win, resolving the wrong slot -> SendKeys /compact into a peer's window. Not reachable in normal use (the /self-compact skill passes the short claude-<8hex> form -> exact match), but safety-adjacent. FIX: two-pass -- an EXACT chatId match anywhere wins over ANY substring match; lenient substring is Pass 2 (back-compat: a full UUID still resolves the short-form slot). +2 tests (exact-wins-over-peer-substring + lenient-still-resolves). 26/26.
```

## Files touched (3)
- scripts/self-compact.mjs      | 13 ++++++++++---
- scripts/self-compact.test.mjs | 17 +++++++++++++++++
- 2 files changed, 27 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- wrong-window vector: resolveSlot matched per-slot exact-OR-substring in one loop, so a PEER slot whose claude-<8hex> bare is a substring of a full harness-UUID sessionId -- iterated BEFORE the exact-match slot -- could win, resolving the wrong slot -> SendKeys /compact into a peer's window. Not reachable in normal use (the /self-compact skill passes the short claude-<8hex> form -> exact match), but saf
- till resolves the short-form slot). +2 tests (exact-wins-over-peer-substring + lenient-still-resolves). 26/26.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a5f0c8706c73`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._