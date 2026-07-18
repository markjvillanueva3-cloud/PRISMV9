# SYSTEM-VIZ/U-VIZ-XGAL-MILL-PDF-WIRE — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-XGAL-MILL-PDF-WIRE (slot:sierra): wire foxtrot's dead milling-extracted-pdf bridge into the regen pipeline -- cross-galaxy improvement

**Commit:** `1f4a6b46a6ca` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T10:29:38-05:00
**Tags:** system-viz, u-viz-xgal-mill-pdf-wire, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-XGAL-MILL-PDF-WIRE (slot:sierra): wire foxtrot's dead milling-extracted-pdf bridge into the regen pipeline -- cross-galaxy improvement

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-XGAL-MILL-PDF-WIRE (slot:sierra): wire foxtrot's dead milling-extracted-pdf bridge into the regen pipeline -- cross-galaxy improvement

The dual-reg auditor (c02ada7e0b) surfaced generate-milling-extracted-pdf-bridge.mjs as a
fully-dead orphan: untracked WIP foxtrot ran once 2026-05-26 and never committed or wired
(in NEITHER regen-viz FAST[] NOR merge-augmentations loadOptional), so 77 whiskey-extracted
milling-PDF entries never reached the graph.

R7 verified before wiring: all deps resolve fresh (peer aug regenerated today, whiskey ledger
updated Jun 19, target roost jm_die_tribal_wiki_corpus live with 30+ L11 nodes); not broken,
just abandoned. Two real defects fixed first (R13 build-it-whole):
 1. unguarded JSON.parse(PEER_AUG_PATH) would CRASH the whole regen if the peer aug were ever
    absent -> fail-soft loadPeerAug (existsSync + try/catch -> 0 nodes).
 2. consumed-by/feeds-wizard edges targeted engine.<PascalCase> ids that do NOT exist in the
    graph (verified via system-viz-query find) -> all 154 downstream edges DANGLED -> corrected
    to the real eng.knowledge.knowledgecurriculumbridgeengine + eng.mill.millmasterorchestratorfacadeengine.
Also swapped the malformed import guard for the sibling isMain idiom (R11).

WIRED both-or-neither: regen-viz FAST[] + merge-augmentations loadOptional + nodes/edges dedup
splice (modeled on coreInventory). VALIDATED: generator runs 77/116 bridged -> 77 L11 nodes +
231 edges (all id/layer/parent + from/to/kind present, ids unique); edge targets resolve to real
L5 engine nodes; dual-reg auditor clean=true, orphan 1->0, 0 crashRisk, 0 silentDiscard; splice
simulation folds 76 nodes (1 dedup collision) + 231 edges, 77/77 consumed-by resolve. Augmentation
output is gitignored (FAST[]-regen).

Pre-existing (surfaced, not blended -- R7): slot-queue-augmentation.json dangling consumer
(slot-queue generator removed 2026-06-10, loadOptional left behind).
```

## Files touched (4)
- scripts/generate-milling-extracted-pdf-bridge.mjs | 158 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/merge-augmentations.mjs                   |  29 ++++++++++++
- scripts/regen-viz.mjs                             |   1 +
- 3 files changed, 188 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1f4a6b46a6ca`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._