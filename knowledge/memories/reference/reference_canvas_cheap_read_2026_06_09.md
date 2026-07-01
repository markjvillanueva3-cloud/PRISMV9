---
name: reference_canvas_cheap_read_2026_06_09
description: "U-CANVAS-READ (sierra 2026-06-09) — cheap .canvas reader closes the LAST populated-node gap in the Obsidian vault access map; `canvas`/`canvas-doc` CLI + canvas→file→graph third join. Full populated-node coverage achieved."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.505Z
aliases: reference_canvas_cheap_read_2026_06_09
---


**U-CANVAS-READ** (slot:sierra, 2026-06-09, commit `2d49bf0d33` on `cad-fusion-live-ms0`). The LAST populated-node gap in the system-viz↔Obsidian cheap-access map (CHEAP-NODE-ACCESS-MS0). Continues the operator's standing theme "map nodes for quick searches and tool usage savings."

## The gap
`knowledge/PRISM-System-Map.canvas` (146KB JSONCanvas) is the graph→Obsidian SUMMARY (354 nodes = 305 `file` + 49 `text` layer headers, 579 edges) written by `generate-vault-graph.mjs` (already wired into regen-viz post-merge — the source auto-refreshes, no new regen-wire needed). Every other vault node type had a free ≤200-token path; the `.canvas` did not — reaching it meant a full 146KB Read (~40K tokens).

## Use it
```
node scripts/system-viz-query.mjs canvas                 # structural summary: counts + layer headers + per-layer file samples
node scripts/system-viz-query.mjs canvas-doc <vaultPath> # which canvas node(s) reference a doc → chains to doc-nodes → node-card
```

## The synergy payoff — a THIRD cheap join into the graph
`canvasNodesForDoc` reuses `normalizeVaultKey` (the SAME fn behind `vault-backlinks.json`), so each canvas `file` node lands in the same key space as the reverse edge. Full chain, cheap + round-trip-proven on live data:
- `canvas-doc prism-tool-life-estimator.md` → canvas node `n0-L0-0` [L0]
- → `doc-nodes` → graph node `p.estimator` (reverse edge)
- → `node-card p.estimator` → live `[L0·p·built]`, whose `wikiEntries` lists the file BACK (round-trip consistent)
All three pay ~tens of tokens, NEVER the 644MB graph.

## How (no 644MB graph read)
- `scripts/lib/canvas-read-lib.mjs` — fail-SOFT (never throws; may be hook-called — the builder generate-vault-graph.mjs is the fail-loud half), load-once cache, parses the 146KB canvas directly (NEVER the graph; only STATs system-graph.json mtime for the ⚠STALE flag). Exports `loadCanvas`/`summarizeCanvas`/`canvasFiles`/`canvasNodesForDoc`/`computeStaleness`/`clearCache`.
- Staleness = canvas mtime vs system-graph.json mtime (1s tolerance, missing-graph → not-stale). Fired ~9d-stale live (the canvas was last regenerated May 31; honest signal, not a band-aid).
- CLI short-circuit runs BEFORE `loadGraph()` (like find/node-card/doc-nodes).

## Live-caught + fixed (R12)
The `Lgit` layer (git-commits) was miscounted as "other" — an `L[0-9]+` regex misses the alphabetic-suffix layer. Fixed to `L(?:git|[0-9]+[a-z]?)`; test pins `byLayer.Lgit.fileCount`.

## Tests / scrutiny
15 tests (happy + summary exact-counts + 4-branch staleness + miss + **memory-slug join** + 3 failure + 3 adversarial + live smoke). Per-file 2-reviewer PASS 0 P0; 3 P1 test/edge-guards fixed (samplesPerLayer negative guard, substring positive-control, memory-slug join coverage). Reviewer-A traced the key-join correctness (the crux): both query AND node.file normalize through the shared `normalizeVaultKey`, exact-equality gates matches, substrings are SUGGESTIONS only.

## DEFERRED with evidence
`prism_session:canvas_nodes` dispatcher mirror — latent-until-daemon-restart (migration freeze) + shared-tree contamination risk + CLI fully serves it live + modest marginal value (canvas is a curated summary, not a hot per-call surface). Same disciplined-ROI deferral pattern as the vault-reverse-edge prefetch hook.

## Coverage milestone
**Full populated-node coverage achieved** in the vault access map: the only remaining "gap" is the empty wiki dirs (patterns/trajectories/summaries — spec'd, unpopulated, no nodes to reach). Registered in `knowledge/wiki/architecture/obsidian-vault-node-access-map.md` (also fixed the stale `memory-rag-inject` DEAD claim → wired per U-VAULT-RAG-WIRE `9e4376b3b2`). Related: [[reference_vault_reverse_edge_2026_06_08]] · [[reference_cheap_node_access_ms0_2026_06_04]].
