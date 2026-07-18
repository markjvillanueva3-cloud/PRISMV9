# OBSIDIAN-AI-SYNERGY/U-GNN-ACTIVE-POOL-SELECT — [MAIN] [OBSIDIAN-AI-SYNERGY]/U-GNN-ACTIVE-POOL-SELECT (slot:india): #4 active-learning ghost selector + galaxy git-discipline rule

**Commit:** `f512700c56d3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T23:05:19-05:00
**Tags:** obsidian-ai-synergy, u-gnn-active-pool-select, auto-distilled

## Subject
[MAIN] [OBSIDIAN-AI-SYNERGY]/U-GNN-ACTIVE-POOL-SELECT (slot:india): #4 active-learning ghost selector + galaxy git-discipline rule

## Body
```
[MAIN] [OBSIDIAN-AI-SYNERGY]/U-GNN-ACTIVE-POOL-SELECT (slot:india): #4 active-learning ghost selector + galaxy git-discipline rule

Builds scripts/lib/gnn-active-pool-select.mjs -- ranks unlabeled ghost.unwired-engine
nodes by acquisition = uncertainty x class-rarity (greedy class-diversity re-rank) to
attack the REAL macro-F1 0.439 gate (label-starved, NOT calibration which is a measured
dead-end). Streams ghosts from the 713MB graph past the V8 string cap (graph-io
streamGraphArray); default direct-embed (production) mode. Emits an operator label
worklist seeding vault-to-gnn-refpool -> closes the active-learning loop.

R15: WIRE (CLI + worklist report + pure selectFromClassifications seam + fail-soft
auto-refresh in nn-graph-retrain-lifecycle on not-promoted) · TEST (30/30 real-value,
node --test; 2-reviewer per-file gate PASS x2) · VALIDATE (live 713MB graph,
direct-embed: 33 unlabeled / 23 refs / 5 classes; diverse class-balanced worklist).

Also: galaxy CLAUDE.md git-discipline rule -- india commits to its own slot/india
branch (operator 2026-06-10); see [[feedback_india_commit_own_slot_branch]].
```

## Files touched (7)
- mcp-server/src/engines/ai-training/CLAUDE.md     |   9 +++
- scripts/lib/gnn-active-pool-select.mjs           | 453 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/gnn-active-pool-select.test.mjs      | 376 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/nn-graph-retrain-lifecycle.mjs           |  28 ++++++++
- state/shared/nn-graph/active-label-worklist.json | 126 ++++++++++++++++++++++++++++++++++++
- state/shared/nn-graph/active-label-worklist.md   |  23 +++++++
- 6 files changed, 1015 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f512700c56d3`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._