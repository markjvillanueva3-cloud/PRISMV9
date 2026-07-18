# DISCOVERY-EFFICIENCY/U-HUB-BLAST-RADIUS-RANK — [MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-HUB-BLAST-RADIUS-RANK: rank code hubs by downstream blast radius (20/20)

**Commit:** `10e6adc27fd5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T17:54:53-05:00
**Tags:** discovery-efficiency, u-hub-blast-radius-rank, auto-distilled

## Subject
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-HUB-BLAST-RADIUS-RANK: rank code hubs by downstream blast radius (20/20)

## Body
```
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-HUB-BLAST-RADIUS-RANK: rank code hubs by downstream blast radius (20/20)

First AGGREGATE blast-radius ranking. The fleet had per-node blast-radius
(system-viz-query blast-radius <id>), consumer FAN-IN (in-degree), and PageRank
(recursive centrality) -- but no ranking of hubs by downstream blast radius
(bounded-depth forward reachability = change-impact / test-priority). Blast-radius
(OUT, multi-hop) is the inverse of fan-in (IN, 1-hop) and distinct from PageRank.
Dedup-verified: only per-node + CoT-blast + fanin existed (soul anti-dup check).

Pure core + thin CLI (mirrors stub-sweep-full.mjs):
- buildForwardAdjacency(edges) -- from->to[] map, skips self-loops/malformed (O(E))
- blastRadius(fwd, start, maxDepth) -- bounded BFS, cycle-safe, start-excluded
- defaultCandidateFilter -- structural hubs (eng./disp./algo. prefix or L4/L5)
- rankHubsByBlastRadius(graph, opts) -- desc rank, deterministic tie-break, topN
- loadGraph -- 300MB size guard (728MB merged system-graph.json OOMs JSON.parse)
- CLI: --graph --depth --top --filter --all --json

Reuses the system-viz-query forward-adjacency BFS pattern (this is the ranking
LAYER, not a re-impl). Tests: 20/20 node:test, exact blast counts on synthetic
graphs (chain A->B->C->D = 3/2/1/0; star=5; depth-bound; cycle finite; diamond
dedup; tie-break determinism) + filter + empty/malformed failure modes.

Live run (architecture-graph.json, 63775 nodes / 177063 edges): 149 structural
hubs ranked, top eng.other(35)/eng.hyper(35)/eng.mastercam(34)/eng.mill(33).
R12 granularity note: architecture-graph L5 nodes are DOMAIN-cluster rollups, so
this ranks domain-hubs (values compress 32-35); eng.other/eng.miscdomains are
catch-all buckets to skip when interpreting. Per-engine needs the merged graph.
Validated by 20/20 tests + live run + self-review (not the formal 2-agent gate).
```

## Files touched (3)
- scripts/hub-blast-radius-rank.mjs      | 205 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/hub-blast-radius-rank.test.mjs | 196 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 401 insertions(+)

## Lessons surfaced in commit body
- note: architecture-graph L5 nodes are DOMAIN-cluster rollups, so

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 10e6adc27fd5`
- Milestone envelope: `mcp-server/data/milestones/DISCOVERY-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._