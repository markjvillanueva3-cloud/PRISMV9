# GRAPH-OCTOPUS-AUTOWIRE-MS0/U-GO-B1 — [MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-B1 (slot:echo): raise merge-augmentations heap — fix the dominant OOM

**Commit:** `8f03cff28e67` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T11:25:25-05:00
**Tags:** graph-octopus-autowire-ms0, u-go-b1, auto-distilled

## Subject
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-B1 (slot:echo): raise merge-augmentations heap — fix the dominant OOM

## Body
```
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-B1 (slot:echo): raise merge-augmentations heap — fix the dominant OOM

merge-augmentations crashes exit 134 / V8 heap abort folding the 412MB+
system-graph.json under Node's default ~2GB old-space. This is the
dominant cause of the stale graph — it gated every run that got past the
U-GO-B2 stale locks. run() now spawns every chain child with NODE_OPTIONS
--max-old-space-size (knob PRISM_VIZ_REGEN_HEAP_MB, floor 2048, default
8192). The graph refreshed 412MB(2026-05-21 11:32) -> 452MB(2026-05-22
11:23) this session — a merge that size cannot complete under the default
heap.

Follow-up: a 452MB system-graph.json is itself pathological (exceeds
master-index-search-lib's 200MB load cap -> search degrades to the 20K-node
architecture-graph fallback); graph-size reduction tracked as a B-track
follow-up unit.
```

## Files touched (2)
- scripts/system-viz-on-commit.mjs | 20 +++++++++++++++++++-
- 1 file changed, 19 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8f03cff28e67`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._