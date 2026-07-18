---
name: reference_tango_hub_blast_radius_rank_2026_06_15
description: tango built the first AGGREGATE hub blast-radius ranking (scripts/hub-blast-radius-rank.mjs) — ranks code hubs by downstream change-impact; distinct from fan-in/PageRank/per-node. 20/20 tests + live run. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.219Z
aliases: reference_tango_hub_blast_radius_rank_2026_06_15
---


**TANGO HUB-BLAST-RADIUS-RANK (slot tango, 2026-06-15, commit `10e6adc27f`)** — cron /loop iter; a genuine in-lane build (not the saturation-audit fallback) after dedup-verifying the gap was real.

**THE GAP (dedup-verified, soul anti-dup):** the fleet had per-node blast-radius (`system-viz-query.mjs blast-radius <id>`), `system-viz-cot-reason-blast-radius.mjs` (per-node CoT payload), consumer FAN-IN ranking ([[unwired-ranker-consumer-fanin]], IN-degree), and PageRank (recursive centrality) — but NO aggregate ranking of hubs by DOWNSTREAM blast radius (bounded-depth forward reachability = change-impact / test-priority). Blast-radius (OUT, multi-hop) is the INVERSE of fan-in (IN, 1-hop) and distinct from PageRank (recursive weight). All three pre-existing tools confirmed distinct before building.

**THE BUILD** (`scripts/hub-blast-radius-rank.mjs` + `.test.mjs`, pure-core + thin CLI, mirrors stub-sweep-full.mjs): `buildForwardAdjacency` (from->to[], skips self-loops/malformed, O(E)) + `blastRadius(fwd,start,maxDepth)` (bounded BFS, cycle-safe, start-excluded — REUSES the system-viz-query BFS pattern, this is the ranking LAYER not a re-impl) + `defaultCandidateFilter` (eng./disp./algo. prefix or L4/L5) + `rankHubsByBlastRadius` (desc, deterministic tie-break by outDegree then id, topN) + `loadGraph` (300MB size guard). CLI: `--graph --depth --top --filter --all --json`. 20/20 node:test, EXACT blast counts on synthetic graphs (chain A->B->C->D=3/2/1/0; star=5; depth-bound; cycle finite; diamond dedup; ties).

**LIVE RESULT + R12 GRANULARITY LIMITATION:** ran on `architecture-graph.json` (60MB / 63775 nodes / 177063 edges — the 728MB merged `system-graph.json` is REFUSED by the size guard, would OOM JSON.parse). 149 structural hubs ranked; top eng.other(35)/eng.hyper(35)/eng.mastercam(34)/eng.mill(33)/eng.lathe. **KEY honesty:** architecture-graph L5 nodes are DOMAIN-CLUSTER ROLLUPS (e.g. `eng.lathe (194/194)` = the whole lathe domain), so this ranks DOMAIN-hubs not individual engines; values compress 32-35 (dense cluster subgraph); `eng.other`/`eng.miscdomains` are catch-all BUCKETS to skip when interpreting. Per-engine granularity needs the merged graph (exceeds the load cap). The tool is correct; granularity is bounded by the loadable input.

**LESSON:** when a primitive exists (per-node blast-radius BFS) but no AGGREGATE/ranking layer, building the ranking is NOT dup — it's the missing consumer of the primitive. Verify the 3 sibling metrics (fan-in/PageRank/per-node) are genuinely distinct first (they were). Sister: [[reference_tango_register_unwired_bridge_dispatcher_2026_06_15]], [[reference_tango_forge_dedup_prefilter_2026_06_15]].
