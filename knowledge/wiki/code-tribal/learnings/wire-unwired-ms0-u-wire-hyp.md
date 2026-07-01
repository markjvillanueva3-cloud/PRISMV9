# WIRE-UNWIRED-MS0/U-WIRE-HYP — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-HYP: wire HypothesisPrioritizerEngine into prism_dev (3 read-only Bayesian actions)

**Commit:** `e808ae5f084d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:13:22-05:00
**Tags:** wire-unwired-ms0, u-wire-hyp, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-HYP: wire HypothesisPrioritizerEngine into prism_dev (3 read-only Bayesian actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-HYP: wire HypothesisPrioritizerEngine into prism_dev (3 read-only Bayesian actions)

Wires Bayesian-prior management for milling hypothesis ranking
(MILL-AGI-P0/U-P0.2). 3 read-only actions through prism_dev.
Engine-pair test pre-existed.

3 read-only actions:
  hyp_get_prior                 — getPrior(id, ctx) → HypothesisPrior|null
  hyp_prioritize                — prioritize({hyps[], ctx})
  hyp_get_tribal_endorsements   — getTribalEndorsements(id) → string[]

DEFER (2 mutating, both security-class):
  updatePrior(input)  class=ML-training-data-corruption: caller can
                      poison Bayesian priors with fake outcome feedback
                      (success/partial/failure). Needs auth + audit
                      before wiring.
  resetForTests()     test-only state-clear footgun.

Wire-level invariants:
  - found / has_endorsements discriminators (null/empty-resilient)
  - ranked_count / disagreement_count / consensus_confidence /
    top_recommendation flattened to top level
  - Schema enums: ISO group (P/M/K/N/S/H) + operation
    (roughing/semi-finishing/finishing) + category (7 domains)
  - DoS cap: hypotheses array ≤ 100 entries
  - predicted_outcome ∈ [0,1] (probability semantics)

Tests: 21/21 PASS (dispatcher round-trip; engine test pre-existed).

Algebraic invariants:
  - prior_probability ∈ [0.01, 0.99] (engine line 118 clamp)
  - confidence_interval[0] ≤ confidence_interval[1]
  - ranked DESC by posterior_probability (engine line 208 sort)
  - rank is 1-indexed (engine line 209)
  - top_recommendation = ranked_hypotheses[0].description
  - ISO group VARIABILITY: H.conservative ≥ S.conservative > P.conservative
    (DEFAULT_PRIORS line 82-89: H=0.8, S=0.75, P=0.6)
  - Operation VARIABILITY: 3 ops yield distinct top OR meaningfully
    different scores
  - Tribal endorsements: trochoidal_roughing → JM-MILL-004 + MIT-2.008-DYN

WIRE-UNWIRED-MS0 progress: 28->29 wires this session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.hypothesisPrioritizer.test.ts       | 308 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  32 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  42 ++-
- 3 files changed, 381 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e808ae5f084d`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._