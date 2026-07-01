# SIERRA-BACKEND/U-FE-VERIFIER-GATE-HARDEN — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-VERIFIER-GATE-HARDEN (slot:sierra): close latent over-extract hole in objectmap gate (3-of-3 arm-B P2)

**Commit:** `59ba373df90c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T13:09:07-05:00
**Tags:** sierra-backend, u-fe-verifier-gate-harden, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-VERIFIER-GATE-HARDEN (slot:sierra): close latent over-extract hole in objectmap gate (3-of-3 arm-B P2)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-VERIFIER-GATE-HARDEN (slot:sierra): close latent over-extract hole in objectmap gate (3-of-3 arm-B P2)

R16 gap-close on the U-FE-VERIFIER-OBJECTMAP extractor (3-of-3 PASS, ebe763878f).
Arm B flagged a LATENT over-extract path (the P0-MASKING direction): the gate was a
loose /ACTION/i SUBSTRING and the Object.keys regex matched when CHAINED, so a hypothetical
const like `baselineActionKeys = Object.keys(CONFIG).length` would inject CONFIG's keys as
phantom actions -> a broken route could falsely resolve. Grep-confirmed NO live dispatcher
triggers it today (chained Object.keys consts are named baselineKeys/outputKeys/matchKey/
isoKey*, none anchored *ACTIONS), so it was latent -- but the verifier's whole purpose is to
never mask a P0, so closed now.

Two strict-tightening guards (both fail-safe toward UNDER-extract, never a masked P0):
  (a) gate anchored /(?:^|_)ACTIONS$/i (not a loose 'action' substring) -- baselineActionKeys
      no longer qualifies;
  (b) (?!\s*\.) negative lookahead rejects a chained Object.keys(x).length/.find().
Both real dispatchers (const ACTIONS = Object.keys(ACTION_MAP)) still match -> audit
unchanged: unverifiable 0, p0Mounted 0, infoUnmounted 22, unparsable []. +1 regression test
(19 total) pinning both guards (substring-name reject + chained-call reject + anchored accept).
```

## Files touched (3)
- scripts/lib/fe-route-action-contract.mjs      | 14 +++++++++-----
- scripts/lib/fe-route-action-contract.test.mjs | 23 ++++++++++++++++++++---
- 2 files changed, 29 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till match -> audit

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 59ba373df90c`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._