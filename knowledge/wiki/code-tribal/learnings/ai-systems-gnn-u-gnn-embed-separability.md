# AI-SYSTEMS-GNN/U-GNN-EMBED-SEPARABILITY — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-EMBED-SEPARABILITY (slot:india): root-cause the tier-5 coverage ceiling -- embeddings PARTIALLY separate dispatchers

**Commit:** `f20372231644` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T22:10:36-05:00
**Tags:** ai-systems-gnn, u-gnn-embed-separability, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-EMBED-SEPARABILITY (slot:india): root-cause the tier-5 coverage ceiling -- embeddings PARTIALLY separate dispatchers

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-EMBED-SEPARABILITY (slot:india): root-cause the tier-5 coverage ceiling -- embeddings PARTIALLY separate dispatchers

Non-destructive diagnostic (reads the 3206 codebase-wired labeled embedding cache + the
engine->dispatcher map; NO 550MB graph load). Answers the question the cap-sweep left open:
WHY can't ref-pool growth broaden coverage? Because the embeddings only weakly separate dispatchers.

RESULT (3206 vectors, 72 classes, 43 scored >=5 members):
  mean margin (intra - inter cosine) = 0.0526 (high baseline crowding: inter ~0.75)
  separable classes (margin > 0.05): 22/43
  well-separated (distinctive, small): prism_weldingjoining +0.118, prism_skillscript +0.115,
    prism_resourceharvester +0.089, prism_security +0.083, prism_5axis +0.078
  entangled (generic, large): prism_dev +0.015 (n=284), prism_safety +0.011 (n=60)
  VERDICT: PARTIALLY separate -> coverage gains need BOTH vote tuning AND sharper features.

WHY THIS MATTERS:
- Confirms the cap-sweep root cause: ref-pool growth cannot broaden coverage because the entangled
  majority (large generic dispatchers) is FEATURE-limited -- more refs just add crowding.
- BUT 22/43 dispatchers ARE separable -> for those, coverage is GATE/VOTE-limited, not feature-
  limited. A per-class vote/gate tuning could surface them (broaden 2 -> ~22 emitted classes) with
  NO new features and NO shared-graph mutation. That is the concrete, autonomous coverage lever
  (queued next unit) the standing "full-coverage pending ref-pool growth" assumption missed.

Reusable: classSeparability/meanIntra/meanInterCosine/loadLabeledVectors exported. 7/7 tests
(real reference cosines). Solo-reviewed (subagents rate-limited earlier this session).
```

## Files touched (3)
- scripts/analyze-ghost-embed-separability.mjs      | 164 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/analyze-ghost-embed-separability.test.mjs |  76 +++++++++++++++++++++++++++++
- 2 files changed, 240 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f20372231644`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._