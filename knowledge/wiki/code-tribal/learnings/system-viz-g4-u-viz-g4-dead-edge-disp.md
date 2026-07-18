# SYSTEM-VIZ-G4/U-VIZ-G4-DEAD-EDGE-DISP — [MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-DISP: route 3 ghost/bridge producers through shared disp-node-id resolver (kills ~2,944 dispatcher.* dead edges)

**Commit:** `61d4f60e83ea` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T00:05:44-05:00
**Tags:** system-viz-g4, u-viz-g4-dead-edge-disp, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-DISP: route 3 ghost/bridge producers through shared disp-node-id resolver (kills ~2,944 dispatcher.* dead edges)

## Body
```
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-DISP: route 3 ghost/bridge producers through shared disp-node-id resolver (kills ~2,944 dispatcher.* dead edges)

Completes U-VIZ-G4-SEEDER-FIX (2026-05-20, which fixed only seed-ghost-from-unwired). seed-ghost-llm-classify, seed-ghost-gnn-classify, and generate-pdf-course-bridge-features all emitted edges to dispatcher.<mcp_tool_name> — a node id that never existed in the merged system-graph (canonical is file-derived disp.calcdispatcher). Extracted the proven mcpToolToDispNodeId resolver into shared SSOT lib scripts/lib/viz-dispatcher-node-id.mjs; all 4 producers + the tribal-wiki consumer now resolve through it. Engine.<Pascal> dead edges are the separate Half B (merge-side). 170 tests green; per-file 2-reviewer scrutiny PASS/PASS.
```

## Files touched (11)
- scripts/extract-cadcam-tribal-wiki.test.mjs          |  8 +++++++-
- scripts/generate-pdf-course-bridge-features.mjs      | 43 ++++++++++++++++++++++++++++---------------
- scripts/generate-pdf-course-bridge-features.test.mjs | 15 +++++++++++++--
- scripts/lib/viz-dispatcher-node-id.mjs               | 75 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/viz-dispatcher-node-id.test.mjs          | 85 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/seed-ghost-from-unwired.mjs                  | 48 +++++++++---------------------------------------
- scripts/seed-ghost-gnn-classify.mjs                  | 49 ++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/seed-ghost-gnn-classify.test.mjs             | 85 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- scripts/seed-ghost-llm-classify.mjs                  |  8 +++++++-
- scripts/seed-ghost-llm-classify.test.mjs             |  5 ++++-
_(+1 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 61d4f60e83ea`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-G4.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._