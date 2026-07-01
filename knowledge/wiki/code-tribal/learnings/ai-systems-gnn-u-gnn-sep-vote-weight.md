# AI-SYSTEMS-GNN/U-GNN-SEP-VOTE-WEIGHT — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-SEP-VOTE-WEIGHT (slot:india): opt-in per-class separability re-weight hook in voteDispatcher (the verifiable core of the coverage lever)

**Commit:** `7a69c4531602` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T08:18:37-05:00
**Tags:** ai-systems-gnn, u-gnn-sep-vote-weight, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-SEP-VOTE-WEIGHT (slot:india): opt-in per-class separability re-weight hook in voteDispatcher (the verifiable core of the coverage lever)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-SEP-VOTE-WEIGHT (slot:india): opt-in per-class separability re-weight hook in voteDispatcher (the verifiable core of the coverage lever)

The embed-separability diagnostic (f203722316) showed 22/43 dispatchers are separable -> for those,
coverage is GATE/VOTE-limited, not feature-limited. This ships the LEAF PRIMITIVE of that lever
(R13 -- verifiable core before integration): voteDispatcher gains an opt-in `separabilityWeights`
(Map<dispatcher, factor>=0>) that scales each class's normalized vote weight by a caller-supplied
factor. A separable class can be BOOSTED to clear the confidence gate; an entangled class DAMPED.

SAFETY: DEFAULT-ABSENT = byte-identical. No deployed caller passes it (the live lifecycle + PSN
hooks call classifyUnknownGhosts without it), proven by the "absent / non-Map / empty Map ==
legacy" test. Guards: non-finite/negative factor -> 1; all-zero map -> normTotal 0 -> the existing
null guard fires (never a fabricated winner).

The factor POLICY (derive factors from the embedding-separability margin) deliberately lives in the
CALLER, keeping this a generic hook -- that wiring + the controlled-harness measurement (does it
broaden emitted classes WITHOUT dropping Brier@gate?) is the next unit (#16). 4 new tests
(winner-flip, byte-identical default, zero-damp + all-zero-null, non-finite/negative guard);
74/74 green. Transform-independent asserts (winner + full-ballot voteShare), no fragile numerics.
Solo-reviewed (MCP bridge down + scrutiny subagents rate-limited this session -- R12).
```

## Files touched (3)
- scripts/seed-ghost-gnn-classify.mjs      | 13 +++++++++++++
- scripts/seed-ghost-gnn-classify.test.mjs | 41 +++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 54 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7a69c4531602`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._