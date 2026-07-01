# ROUTING-GRAPH-COMPLETENESS/U-LADDER-CATALOG-P2 — [MAIN-FORCE] [ROUTING-GRAPH-COMPLETENESS]/U-LADDER-CATALOG-P2 (slot:zulu): 2-arm scrutiny P2 -- prototype-pollution-safe ladder/coverage helpers

**Commit:** `acf78d2b166e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T15:24:12-05:00
**Tags:** routing-graph-completeness, u-ladder-catalog-p2, auto-distilled

## Subject
[MAIN-FORCE] [ROUTING-GRAPH-COMPLETENESS]/U-LADDER-CATALOG-P2 (slot:zulu): 2-arm scrutiny P2 -- prototype-pollution-safe ladder/coverage helpers

## Body
```
[MAIN-FORCE] [ROUTING-GRAPH-COMPLETENESS]/U-LADDER-CATALOG-P2 (slot:zulu): 2-arm scrutiny P2 -- prototype-pollution-safe ladder/coverage helpers

2-arm adversarial review of 2301bb1bb1 returned both-PASS with one genuine correctness
P2 (arm B, verified live): resolveLadderToken/ladderTokenKind/assertLadderTokenCoverage
used unguarded bracket / `in` access over plain frozen objects, so a token named after a
built-in resolved via the prototype chain -- resolveLadderToken("constructor") returned
[Function: Object] instead of null, ladderTokenKind("constructor") returned "catalog". The
GATE was self-neutralizing (proto names took the danglingMap throw branch -> no silent
false-pass) but the public NAVIGATION helpers returned bogus catalog nodes.

FIX: Object.hasOwn guards at all four call sites -- resolveLadderToken, ladderTokenKind,
assertLadderTokenCoverage (the ladder loop) + the sibling assertOperatorSubstrateCoverage
detect-lookup (same latent pattern: detect["constructor"] would have run Object() as a
detector). +1 R9 adversarial test (constructor/toString/__proto__/hasOwnProperty/valueOf ->
null/unknown; 'constructor' rung -> unmapped not danglingMap; 'constructor' category ->
noDetector). 79/79 lib tests. Live: resolve('constructor')=null, kind=unknown, resolve('wiki')=wikis.

Also annotated arm-A P2 (pdf-video-pipeline is the loosest map edge -> resolves to the
learning-family node; no dedicated ingestion substrate exists). Generator regenerates clean
(JSON byte-identical -- proto fix is internal logic). 5th-leg commit 2301bb1bb1 + this P2.
```

## Files touched (3)
- scripts/lib/feature-routing-graph.mjs      | 24 +++++++++++++++++-------
- scripts/lib/feature-routing-graph.test.mjs | 13 +++++++++++++
- 2 files changed, 30 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show acf78d2b166e`
- Milestone envelope: `mcp-server/data/milestones/ROUTING-GRAPH-COMPLETENESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._