# ROUTING-GRAPH-COMPLETENESS/U-CURATED-MULTIBUCKET — [MAIN-FORCE] [ROUTING-GRAPH-COMPLETENESS]/U-CURATED-MULTIBUCKET (slot:alpha): a hook curated into N task-classes now lands in ALL N byTaskClass buckets (was first-wins -> review showed 0 gates though it owns scrutinize-before-stop)

**Commit:** `0b6b34b023a9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T11:25:04-05:00
**Tags:** routing-graph-completeness, u-curated-multibucket, auto-distilled

## Subject
[MAIN-FORCE] [ROUTING-GRAPH-COMPLETENESS]/U-CURATED-MULTIBUCKET (slot:alpha): a hook curated into N task-classes now lands in ALL N byTaskClass buckets (was first-wins -> review showed 0 gates though it owns scrutinize-before-stop)

## Body
```
[MAIN-FORCE] [ROUTING-GRAPH-COMPLETENESS]/U-CURATED-MULTIBUCKET (slot:alpha): a hook curated into N task-classes now lands in ALL N byTaskClass buckets (was first-wins -> review showed 0 gates though it owns scrutinize-before-stop)

enrichHook takes a curatedClasses array (primary=cc[0], records full set); curatedClassMap returns {id:[classes]}; aggregateCatalog multi-buckets via per-class push but counts DISTINCT once (classSpecificIds Set) so classSpecificCount+universalCount===actionableWired holds (89+195=284); adds classPlacements (93>=89). Fixed the now-false 'exactly one bucket' note (R12). LIVE: scrutinize-before-stop now PRESENT in build+review+session; review 0->1 gate; punch-list 0; util score 0.821 stable. 28/28 catalog + 13/13 audit + 12/12 template; 2-arm scrutiny PASS (downstream consumers verified safe, additive schema).
```

## Files touched (5)
- scripts/build-advisory-feature-catalog.mjs      |  55 +++--
- scripts/build-advisory-feature-catalog.test.mjs |  52 +++--
- state/shared/advisory-feature-catalog.json      | 947 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- state/shared/routing-utilization-audit.json     |  14 +-
- 4 files changed, 1011 insertions(+), 57 deletions(-)

## Lessons surfaced in commit body
- til score 0.821 stable. 28/28 catalog + 13/13 audit + 12/12 template; 2-arm scrutiny PASS (downstream consumers verified safe, additive schema).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0b6b34b023a9`
- Milestone envelope: `mcp-server/data/milestones/ROUTING-GRAPH-COMPLETENESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._