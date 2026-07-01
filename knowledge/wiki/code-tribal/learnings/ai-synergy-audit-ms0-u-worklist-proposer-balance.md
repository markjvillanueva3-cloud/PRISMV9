# AI-SYNERGY-AUDIT-MS0/U-WORKLIST-PROPOSER-BALANCE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-WORKLIST-PROPOSER-BALANCE (slot:india): class-rebalance ordering -- attacks the GNN collapse

**Commit:** `ed0e9912a736` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T14:41:46-05:00
**Tags:** ai-synergy-audit-ms0, u-worklist-proposer-balance, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-WORKLIST-PROPOSER-BALANCE (slot:india): class-rebalance ordering -- attacks the GNN collapse

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-WORKLIST-PROPOSER-BALANCE (slot:india): class-rebalance ordering -- attacks the GNN collapse

Operationalizes the 2026-06-11 class-collapse finding (GNN predicts prism_cam for EVERY
ghost). The selector's classRarity is computed from the GNN's COLLAPSED predictions; this
orders the labeling queue by Ollama's source-aware class instead. balanceImpact(dispatcher,
classDistribution) scores a label by how much it rebalances the collapsed model (rarest/
unseen class = 1.0 max lift, majority = 0).
- renderProposalMarkdown sub-sorts CONFLICTs by rebalance impact + emits a 'Rebalance set'
  callout (label these FIRST for the biggest anti-collapse lift) + a balance column.
- Doctrine-safe: a labeling RECOMMENDATION only; operator still supplies ground truth (no
  auto-seeding the ref-pool with machine guesses -- india refuses that).
- TEST 18/18 (+2: balanceImpact rarity/majority/unseen/null + conflict-order-by-impact).
- VALIDATE (live 31 ghosts): GrooveClassificationEngine + TurretLayoutEngine (Ollama->
  prism_turning, balance 0.83) now head the queue; prism_business (0.75) next.
Self-reviewed (per-file 2-agent gate -> self-review + Stop 3-of-3, budget).
```

## Files touched (6)
- scripts/lib/worklist-label-proposer.mjs                   | 47 +++++++++++++++++++++++++++++++++++++++--------
- scripts/lib/worklist-label-proposer.test.mjs              | 24 ++++++++++++++++++++++++
- scripts/propose-worklist-labels.mjs                       |  3 ++-
- state/shared/nn-graph/active-label-worklist-proposed.json | 32 ++++++++++++++++----------------
- state/shared/nn-graph/active-label-worklist-proposed.md   | 71 +++++++++++++++++++++++++++++++++++++----------------------------------
- 5 files changed, 118 insertions(+), 59 deletions(-)

## Lessons surfaced in commit body
- till supplies ground truth (no

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ed0e9912a736`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._