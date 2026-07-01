# OBSIDIAN-VAULT-SYNERGY/U-OBS-RECALL-NODE-EXCLUDE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-NODE-EXCLUDE (slot:alpha): exclude 9571 node_* pointer stubs from memo recall (72% corpus noise)

**Commit:** `31b5946bdc50` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T04:52:32-05:00
**Tags:** obsidian-vault-synergy, u-obs-recall-node-exclude, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-NODE-EXCLUDE (slot:alpha): exclude 9571 node_* pointer stubs from memo recall (72% corpus noise)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-NODE-EXCLUDE (slot:alpha): exclude 9571 node_* pointer stubs from memo recall (72% corpus noise)

Discovered via ultracode Workflow (queue item #2), premise verified live. The
recall corpus H:/prism/knowledge/memories is 72.3% auto-generated node_* pointer
stubs (9571 of 13229; 'Node-indexed pointer — X -> wiki <path>'), NOT substantive
memos. They diluted BM25 precision and, in the live-scan fallback, cost 9571
needless stat+read calls (the timeout the graceful-degradation path guards).
Node lookups have their own cheap surface (node_card / CHEAP-NODE-ACCESS-MS0).

Fix: pure isNodePointerStub() + nodePointerExclusionEnabled() (default-ON; knob
PRISM_RECALL_INCLUDE_NODE_POINTERS=1 / opts.excludeNodePointers restores).
Applied at BOTH convergence points in runMemoryIndexSearch — the sidecar loop
(before byKey.set so stubs never surface via BM25 OR hybrid dense) and the
live-scan loop (before stat+read, an I/O win). Mirrors the supersededExclusion
convention. enumerateMemoryFiles stays general (filter scoped to recall).

Validated LIVE on the real hybrid-sidecar path: query 'adaptive controller model
algorithm' returned 20/20 node_* stubs + 0 real memos BEFORE; 20 real memos + 0
stubs AFTER. Compounds with U-OBS-MEMDIR-HOMEDIR's 1602-memo recovery (real memos
now rank instead of being buried). 51/51 tests (28 existing regression + new).
```

## Files touched (3)
- scripts/lib/memory-index-search-lib.mjs      |  26 ++++++++++++++++++++++++++
- scripts/lib/memory-index-search-lib.test.mjs | 110 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 136 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 31b5946bdc50`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._