# TRIBAL-GRAPH-MS0/U-CLUSTERS-LIB — [MAIN] [TRIBAL-GRAPH-MS0]/U-CLUSTERS-LIB: L0-L8 backbone + 62-case test (3-round per-file scrutiny PASS)

**Commit:** `15c161f63111` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T20:17:22-05:00
**Tags:** tribal-graph-ms0, u-clusters-lib, auto-distilled

## Subject
[MAIN] [TRIBAL-GRAPH-MS0]/U-CLUSTERS-LIB: L0-L8 backbone + 62-case test (3-round per-file scrutiny PASS)

## Body
```
[MAIN] [TRIBAL-GRAPH-MS0]/U-CLUSTERS-LIB: L0-L8 backbone + 62-case test (3-round per-file scrutiny PASS)

Pure clustering + classification library for the tribal-knowledge graph-of-graphs.
Backbone for the upcoming TribalGraphInferenceEngine that walks the aggregation
DAG when user inputs are partial.

Exports: SCHOOL_TAXONOMY (33), DOMAIN_TAXONOMY (13), DISCIPLINE_TAXONOMY (S0-S7),
GALAXY_TAXONOMY (G1-G3), UNIVERSE_ID, normalizeTip, jaccard, tipBag, classifyDomain,
classifySchool, extractSignature, clusterByJaccard, aggregateLevel, dedupeTips, schoolChain.

Per-file scrutiny gate (CLAUDE.md doctrine, 2 parallel reviewers per file):
  Round 1: Arm A PASS / Arm B FAIL with 2 P0 + 2 P1
  Round 2: prior fixed; Arm B re-FAIL with new P0-3 (empty-fingerprint collision
           + separator-injection)
  Round 3: P0-3 fixed (indexHint + U+001F separator + monotonic anon counter);
           BOTH arms PASS clean

12 lock-in tests added (50 -> 62):
  empty-string id triggers synth (P0-1), content-deterministic synth (P1-1),
  whitespace-only id triggers synth, id=0+id=false preserved, deep-freeze on
  nested taxonomy fields (P0-2, 4 throws), bagFn error wrapping with tip-index
  attribution (P1-2), bagFn non-Set rejection, aggregateLevel malformed-repBag
  rejection (P1-2 sister), empty-everything raws get distinct ids (P0-3),
  separator-injection collision prevented (P0-3), dedupeTips three-empty-tips
  canary (P0-3), anonymous-counter fallback non-collision.

Tests: node --test scripts/lib/tribal-graph-clusters.test.mjs -> 62/62 PASS
(vitest harness still blocked per reference_ollama_cost_routing).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/lib/tribal-graph-clusters.mjs      | 692 +++++++++++++++++++++++++++++
- scripts/lib/tribal-graph-clusters.test.mjs | 579 ++++++++++++++++++++++++
- 2 files changed, 1271 insertions(+)

## Lessons surfaced in commit body
- till blocked per reference_ollama_cost_routing).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 15c161f63111`
- Milestone envelope: `mcp-server/data/milestones/TRIBAL-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._