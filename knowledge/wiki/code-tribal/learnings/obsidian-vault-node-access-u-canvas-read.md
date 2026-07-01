# OBSIDIAN-VAULT-NODE-ACCESS/U-CANVAS-READ — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-NODE-ACCESS]/U-CANVAS-READ (slot:sierra): cheap .canvas reader closes the last populated-node gap in the vault access map

**Commit:** `2d49bf0d334d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:09:22-05:00
**Tags:** obsidian-vault-node-access, u-canvas-read, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-NODE-ACCESS]/U-CANVAS-READ (slot:sierra): cheap .canvas reader closes the last populated-node gap in the vault access map

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-NODE-ACCESS]/U-CANVAS-READ (slot:sierra): cheap .canvas reader closes the last populated-node gap in the vault access map

canvas-read-lib.mjs (fail-soft, load-once cache, NEVER the 644MB graph — parses the 146KB JSONCanvas summary) + system-viz-query CLI 'canvas' (structural summary: counts + layer headers + per-layer file samples) and 'canvas-doc <vaultPath>' (which canvas node(s) reference a doc). canvasNodesForDoc reuses normalizeVaultKey so the canvas key space AGREES with vault-backlinks.json -> the canvas->file->graph join: canvas-doc -> doc-nodes -> node-card, proven round-trip consistent on live data (prism-tool-life-estimator.md -> n0-L0-0 -> p.estimator -> wiki lists the file back). Staleness flag = canvas mtime vs system-graph.json mtime (fired ~9d-stale live, honest). Live-caught + fixed: Lgit layer was miscounted as 'other' (L[0-9]+ regex). 15/15 tests (happy+summary+staleness 4-branch+miss+memory-slug join+3 failure+3 adversarial+live smoke). Per-file 2-reviewer PASS 0 P0, 3 P1 test/edge-guards fixed.
```

## Files touched (4)
- scripts/lib/canvas-read-lib.mjs  | 246 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/canvas-read.test.mjs | 273 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/system-viz-query.mjs     |  51 +++++++++++++++++-
- 3 files changed, 569 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2d49bf0d334d`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-NODE-ACCESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._