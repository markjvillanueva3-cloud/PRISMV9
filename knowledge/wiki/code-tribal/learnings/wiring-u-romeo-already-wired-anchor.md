# WIRING/U-ROMEO-ALREADY-WIRED-ANCHOR — [MAIN-FORCE] [WIRING]/U-ROMEO-ALREADY-WIRED-ANCHOR (slot:romeo): boundary-anchor the wired-match + directly test the comment-strip (scrutiny P1s)

**Commit:** `5a0e262b7172` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T23:00:44-05:00
**Tags:** wiring, u-romeo-already-wired-anchor, auto-distilled

## Subject
[MAIN-FORCE] [WIRING]/U-ROMEO-ALREADY-WIRED-ANCHOR (slot:romeo): boundary-anchor the wired-match + directly test the comment-strip (scrutiny P1s)

## Body
```
[MAIN-FORCE] [WIRING]/U-ROMEO-ALREADY-WIRED-ANCHOR (slot:romeo): boundary-anchor the wired-match + directly test the comment-strip (scrutiny P1s)

Addresses the 3-of-3 scrutiny on 0f01a00fcf (arm C FAIL + arm B P1):

(arm C P1, the blocker -- dangerous direction) alreadyDispatcherWired used an
UNANCHORED substring match `corpus.includes(`${name}.js`)`. A strict SUFFIX of a
wired filename would false-positive (e.g. a future engine 'FooEngine' matching a
wired 'SuperFooEngine.js') -> wrongly ALREADY-WIRED -> silently HIDES a real romeo
wire. FIX: boundary-anchored regex `[/"'`]<name>\.js\b` (regex-escaped name) --
requires a path-separator/quote immediately before the name, so only a real
`.../<Name>.js` import matches, never a glued suffix. (NB: arm C's example names
QuoteEngine/RegressionEngine/GeometryEngine turned out to be REAL wired engines with
their own `/Name.js` imports, not pure suffixes -- the anchoring correctly still
matches those while rejecting a true glued suffix.) Made the corpus injectable
(`alreadyDispatcherWired(name, corpus = dispatcherCorpus())`) so the anchoring is
unit-tested against a SYNTHETIC corpus, independent of which real engines exist.

(arm B P1) the comment-not-counted test passed for the wrong reason (its fixture had
no `.js`, so it never exercised the strip). Extracted `stripDispatcherComments()`
(exported, pure) + a direct unit test: a commented-out `import(".../Ghost.js")` is
stripped, a live import with a trailing comment survives, and `://` URLs are not
mangled.

Live partition unchanged (0 wireable / 1 cross / 14 exempt / 2 review / 1
already-wired = 18); XProc still correctly ALREADY-WIRED. 23/23 tests (was 20; +3:
strip unit, boundary-anchor synthetic-corpus, live-XProc).
```

## Files touched (3)
- scripts/romeo-wiring-triage.mjs      | 21 +++++++++++++++------
- scripts/romeo-wiring-triage.test.mjs | 31 +++++++++++++++++++++++++++++--
- 2 files changed, 44 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- wrongly ALREADY-WIRED -> silently HIDES a real romeo
- till
- wrong reason (its fixture had
- till correctly ALREADY-WIRED. 23/23 tests (was 20; +3:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5a0e262b7172`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._