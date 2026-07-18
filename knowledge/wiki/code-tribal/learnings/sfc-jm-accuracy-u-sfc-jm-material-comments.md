# SFC-JM-ACCURACY/U-SFC-JM-MATERIAL-COMMENTS — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-JM-MATERIAL-COMMENTS (slot:oscar): mine program COMMENTS for material -> lift physics-compare off the 99% P-default

**Commit:** `c032259beae9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:36:11-05:00
**Tags:** sfc-jm-accuracy, u-sfc-jm-material-comments, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-JM-MATERIAL-COMMENTS (slot:oscar): mine program COMMENTS for material -> lift physics-compare off the 99% P-default

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-JM-MATERIAL-COMMENTS (slot:oscar): mine program COMMENTS for material -> lift physics-compare off the 99% P-default

Corpus extraction scans each program's comment text (parenthesized + ;-EOL, NOT
the G-code body which would false-match A2/D2/S7/M2 grade tokens) via inferIsoGroup,
preferring comment callout > path/name > P-default; records materialIso/Confidence/
Source/Matched. physics-compare consumes it (comment>path) with path fallback.
Validated: harness 3/3; comment-mining caught a D2 callout the path missed -> H.
```

## Files touched (3)
- scripts/sfc-jm-physics-compare.mjs |  7 +++++--
- scripts/sfc-jm-program-corpus.mjs  | 26 ++++++++++++++++++++++++++
- 2 files changed, 31 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c032259beae9`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._