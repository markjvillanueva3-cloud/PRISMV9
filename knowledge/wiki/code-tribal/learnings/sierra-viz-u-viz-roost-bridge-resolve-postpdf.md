# SIERRA-VIZ/U-VIZ-ROOST-BRIDGE-RESOLVE-POSTPDF — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ROOST-BRIDGE-RESOLVE-POSTPDF (slot:sierra): resolve post-pdf bridge edges at generation -> 26/26 to node-ids, peer edges untouched -- COMPLETES the 3-generator thread

**Commit:** `75a3c8139e66` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:23:20-05:00
**Tags:** sierra-viz, u-viz-roost-bridge-resolve-postpdf, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ROOST-BRIDGE-RESOLVE-POSTPDF (slot:sierra): resolve post-pdf bridge edges at generation -> 26/26 to node-ids, peer edges untouched -- COMPLETES the 3-generator thread

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-ROOST-BRIDGE-RESOLVE-POSTPDF (slot:sierra): resolve post-pdf bridge edges at generation -> 26/26 to node-ids, peer edges untouched -- COMPLETES the 3-generator thread

Third + final echo generator (clone of cited-tips recipe, 2fea5c8eab). post-pdf has TWO edge sites:
site 1 (bridge-pdf-engine, to: bare class name) is now resolved via makeOracleResolver; site 2
(cross-domain peer edges, to: peerNode.id) is correctly LEFT UNTOUCHED (already node-ids). Live regen:
32 edges = 26 bridge (all resolved, 0 still-bare, 0 dangling, 0 dropped) + 6 peer (untouched). NEW
test file (9 cases incl back-compat, mock resolution, peer-edge-untouched, real-oracle integration).

U-VIZ-ROOST-BRIDGE-RESOLVE COMPLETE across all 3 echo generators: cited-tips 11/11 + tribal-wiki
142/142 + post-pdf 26/26 resolved at SOURCE (0 danglers), so the augmentations are correct without
relying on the merge-time foldRoostAug resolver.
```

## Files touched (3)
- scripts/generate-post-pdf-corpus-features.mjs      | 20 ++++++++++++++---
- scripts/generate-post-pdf-corpus-features.test.mjs | 76 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 93 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till-bare, 0 dangling, 0 dropped) + 6 peer (untouched). NEW

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 75a3c8139e66`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._