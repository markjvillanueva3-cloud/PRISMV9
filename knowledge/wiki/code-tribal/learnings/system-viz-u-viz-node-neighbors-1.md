# SYSTEM-VIZ/U-VIZ-NODE-NEIGHBORS-1 — [MAIN] [SYSTEM-VIZ]/U-VIZ-NODE-NEIGHBORS-1: capped adjacency sidecar builder (node-neighbor blast-radius, core)

**Commit:** `b5317efd5473` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T11:40:57-05:00
**Tags:** system-viz, u-viz-node-neighbors-1, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ]/U-VIZ-NODE-NEIGHBORS-1: capped adjacency sidecar builder (node-neighbor blast-radius, core)

## Body
```
[MAIN] [SYSTEM-VIZ]/U-VIZ-NODE-NEIGHBORS-1: capped adjacency sidecar builder (node-neighbor blast-radius, core)

Logical-order step 1/3 of the 3D-viewer node-neighbor feature (the documented
click->upstream/downstream promise the point-cloud doesn't yet deliver). The viewer's
per-engine nodes have edges only in the 695MB merged graph (index has none; arch-graph
only covers 41 eng-clusters+104 disp). build-viz-adjacency.mjs streams that graph via
readGraphStreaming (OOM-safe, no >512MB string) and emits a BOUNDED node-adjacency.json:
each node's top-K (default 8) in/out neighbors as {id,type}.

VERIFIED: unit test 5/5 (directionality, per-dir cap, skip self-loops/malformed,
isolated-node absence, empty-list) + LIVE run on the 695MB graph -> 1,028,964/1,041,958
edges used, 288,740 adjacency nodes, ~81MB sidecar (JSON.parse-safe for the server).
Sidecar is a gitignored generated artifact. NEXT: /api/node-neighbors endpoint (reads
the 81MB sidecar once) -> viz3d side-panel render. Sierra.
```

## Files touched (3)
- scripts/build-viz-adjacency.mjs      | 84 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-viz-adjacency.test.mjs | 65 +++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 149 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b5317efd5473`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._