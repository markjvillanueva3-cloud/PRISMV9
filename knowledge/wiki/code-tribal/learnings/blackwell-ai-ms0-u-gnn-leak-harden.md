# BLACKWELL-AI-MS0/U-GNN-LEAK-HARDEN — [MAIN] [BLACKWELL-AI-MS0]/U-GNN-LEAK-HARDEN (slot:india): close the latent ghost-embed leak path (review P1+P2)

**Commit:** `2e9e94808d66` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T11:00:16-05:00
**Tags:** blackwell-ai-ms0, u-gnn-leak-harden, auto-distilled

## Subject
[MAIN] [BLACKWELL-AI-MS0]/U-GNN-LEAK-HARDEN (slot:india): close the latent ghost-embed leak path (review P1+P2)

## Body
```
[MAIN] [BLACKWELL-AI-MS0]/U-GNN-LEAK-HARDEN (slot:india): close the latent ghost-embed leak path (review P1+P2)

P1: --ghosts-only now SKIPS wiki-cache reuse — a wiki vector bypassed the leak-free ghostEmbedText and could re-encode proposed_wiring on a future rebuild (the shipped artifact was clean: timestamp guard blocked wiki, all 636 src:nomic, but the path was latent). Ghosts always take the leak-free nomic path now.
P2: ghostEmbedText strips the WHOLE 'proposed wiring:...' clause (covers the UNKNOWN sentinel, not just prism_*). +regression test. 21/21 BNE tests.
```

## Files touched (3)
- scripts/build-node-embeddings.mjs      | 13 +++++++++----
- scripts/build-node-embeddings.test.mjs |  9 +++++++++
- 2 files changed, 18 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2e9e94808d66`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._