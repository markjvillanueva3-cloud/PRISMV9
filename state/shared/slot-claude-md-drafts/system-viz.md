# System-Viz Galaxy -- slot:sierra
> Universal rails (R1-R15, scrutiny 3-of-3, per-chat handoff, commit `[SCOPE]/U-ID`, units-first,
> no-stub, no-inline-constants, duplication guard, RTK, Ollama->Sonnet->Opus ladder, wiki protocol):
> -> `H:/prism/CLAUDE.md`. THIS file = system-viz domain doctrine ONLY; never re-inline universal prose.
> Sierra commits to the MAIN shared tree: prefix `[MAIN] [SCOPE]/U-ID` per lane discipline.

## 1. Domain scope + slot identity

**Owns:** the merged system graph (`state/shared/system-viz/system-graph.json`), all graph
regeneration scripts, ghost-roost generators, the master-index / awareness / pre-*-graph-context
hook fleet, and the node-card cheap-read surface (CHEAP-NODE-ACCESS-MS0).

**EXCLUDES:** india owns the GNN model weights + retrain lifecycle (sierra owns the graph + ref-pool
feed only); golf owns fleet-reaper + orphan logic (sierra's graph is golf's input, not its domain);
tango (discovery) runs ON the graph, does not write it.

**Galaxy shape:** this dir (`mcp-server/src/engines/system-viz/`) is a doctrine/orchestration hub
(4 brain docs only -- no `.ts` files here). Load-bearing code lives in `mcp-server/src/engines/`
(engine classes) and `scripts/` + `scripts/lib/`. CWD for sierra is `H:/prism-slot-sierra`
(slot worktree) -- always use absolute `H:/prism/...` paths; relative paths silently miss the
graph and scripts.

## 2. Verified engines

All confirmed via Glob on `mcp-server/src/engines/` (2026-06-13):

| Role | Engine file |
|---|---|
| Unified search (graph + Obsidian + BUILD_STATE) | `MasterIndexEngine.ts` |
| Synergy-classifier verdicts -> augmentation docs | `VizAutoAugmentationEngine.ts` |
| Personalized PageRank, blast-radius, ghost-roost confidence | `GraphImportanceEngine.ts` |
| RRF fusion (BM25 + dense, k=60) | `RankedHybridGraphSearchEngine.ts` |
| BM25 + dense hybrid index | `HybridIndexEngine.ts` |
| DAG/MST/SCC/CPM/max-flow/topo-sort | `GraphAlgorithmsEngine.ts` |
| Laplacian / Fiedler-vector partitioning | `SpectralGraphEngine.ts` |
| DAG primitives | `GraphTheoryEngine.ts` |

Note: MasterIndexEngine, VizAutoAugmentationEngine, GraphImportanceEngine, HybridIndexEngine are
absent from `ENGINE_DIGEST.md` -- regen the digest or add entries manually.

## 3. Dispatcher quick-ref

**prism_session** (verified in `mcp-server/src/tools/dispatchers/sessionDispatcher.ts` lines 168-175):

| Action | Use |
|---|---|
| `master_index_query` | top-K ranked hits across graph + wiki + memory |
| `master_index_node_status` | single node status by id |
| `master_index_utilization_dashboard` | utilization view across all nodes |
| `master_index_ranked_hybrid` | RRF-fused confidence+utilization (RankedHybridGraphSearchEngine) |

**prism_knowledge** (verified in `mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts` line 89):

| Action | Use |
|---|---|
| `obsidian_viz_regenerate` | trigger viz regen from dispatcher |
| `obsidian_viz_status` | viz regen status check |
| `obsidian_viz_recall_top` | top recalled viz nodes |
| `tribal_capture slot=sierra` | tribal write (NEVER direct markdown) |

**MCP-down fallback:** `node H:/prism/scripts/system-viz-query.mjs find <noun>`

## 4. Canonical constants + data paths

No physics constants apply (infra/graph galaxy, not a machining domain).

| Asset | Path | Size guard |
|---|---|---|
| Merged graph | `state/shared/system-viz/system-graph.json` | 370-575 MB -- NEVER raw JSON.parse; use `scripts/lib/system-viz-graph.mjs` |
| Architecture graph | `state/shared/system-viz/architecture-graph.json` | 53 MB -- 3D viewer only |
| Node embeddings | `state/shared/system-viz/_node-embeddings.jsonl` | ~555 MB -- GNN input only |
| Node-card offset index | `state/shared/system-viz/node-cards.jsonl` + `node-card-offsets.json` | 159 MB + 24 MB -- seek via `scripts/lib/node-card-offset-lib.mjs` |
| Regen success stamp | `state/shared/system-viz/.last-successful-regen.json` | verify after every regen |
| Regen failure log | `state/shared/system-viz/.last-regen-failure.json` | ts must be older than success ts |

## 5. Domain gotchas / safety rails

1. **Graph size is a range.** 370-575 MB (grows with each regen); "548 MB" in older docs is
   stale. Check `.last-successful-regen.json` for current size.
2. **OOM class: raw parse or pretty-print.** `JSON.parse(fs.readFileSync(...))` on the merged
   graph = OOM. `JSON.stringify(g, null, 2)` = V8 ~512 MB string cap -> exit 134. Use
   `scripts/lib/system-viz-graph.mjs` (mtime-cached, size-capped) + compact stringify only.
3. **Dual-registration or silent discard.** A ghost-roost generator missing EITHER the
   `regen-viz.mjs` FAST[] entry OR the `merge-augmentations.mjs` splice block produces data
   that is silently dropped at merge time.
4. **"Regen printed done" is not verified.** Confirmed only when `.last-successful-regen.json`
   shows `pendingCount=0` AND `sidecarOk=true` AND `ts` newer than `.last-regen-failure.json`
   ts, AND `system-viz-query find` smoke test returns hits.
5. **Dispatcher id SSOT is `disp.<file-derived>`.** NOT `dispatcher.<mcp-tool>`. Confirm with
   `system-viz-query find <name>` before minting any edges (dead-pixel prevention).
6. **Worktree CWD trap.** Sierra CWD is `H:/prism-slot-sierra`; viz assets live in `H:/prism`.
   Relative paths silently miss the graph and scripts.

## 6. What NOT to do

- NEVER read `system-graph.json` with raw `JSON.parse` -- OOM every time.
- NEVER `JSON.stringify(graph, null, 2)` on the merged graph -- exit 134 string-cap OOM.
- NEVER run `generate-system-viz.mjs` standalone expecting the merged graph to update -- it only
  writes `architecture-graph.json` (3D viewer); the search-substrate graph is unchanged.
- NEVER add a generator to `regen-viz.mjs` FAST[] without the `merge-augmentations.mjs` splice
  block -- ghost data is silently discarded.
- NEVER trust "regen printed done" without verifying `.last-successful-regen.json`.
- NEVER mint dispatcher-id edges with `dispatcher.` prefix -- SSOT is `disp.` (file-derived).
- NEVER write tribal learnings directly to `knowledge/tribal/system-viz-*.md` -- use
  `prism_knowledge:tribal_capture slot=sierra`; direct writes are auto-overwritten on regen.
- NEVER Glob `H:/prism/**` recursively -- the tree contains ~555 MB embedding files; times out.
- NEVER cite `outcome-bus-auto-tap.mjs` as wiring the closed-loop -- file does not exist on disk.

## 7. Graph pipeline + query contract

Regen stage order: `FAST[] generators -> merge-augmentations.mjs -> repair-classification ->
dedup -> reparent -> add-parent-edges -> seed-ghost-from-unwired.mjs -> .last-successful-regen.json`

Three-graph consumer map (name the target -- "regenerate the viz" is ambiguous):

| Graph file | Writer | Consumer |
|---|---|---|
| `system-graph.json` (370-575 MB) | `regen-viz.mjs` | master-index / awareness / pre-*-graph hooks |
| `architecture-graph.json` (53 MB) | `generate-system-viz.mjs` | 3D viewer (`_server.cjs`) |
| `_node-embeddings.jsonl` (~555 MB) | `seed-ghost-from-unwired.mjs` | india GNN tier-5 |

Post-regen verify: check `.last-successful-regen.json` (`pendingCount=0`, `sidecarOk=true`, `ts`
newer than `.last-regen-failure.json`) then `node H:/prism/scripts/system-viz-query.mjs find system-viz`.

Node-card cheap-read (~98.7% token savings): `system-viz-query.mjs node-card <id>` (~200 tokens
vs 186K for raw graph read). Pattern: `find <noun>` -> ids -> `node-card <id>`.

system-viz-query subcommands (verified): `find` / `headline` / `node-card` / `roadmap-candidates`
/ `blast-radius` / `dispatcher-summary` / `coverage-by-domain` / `build-order`

Dual-reg verify after new ghost-roost generator:
`node H:/prism/scripts/regen-viz.mjs && node H:/prism/scripts/system-viz-query.mjs find <roost-noun>`
Empty result = FAST[] entry or merge-augmentations splice block is missing.

## 8. Tribal + corpus pointers

- `[[architecture/system-viz-knowledge-index]]` -- START HERE (compiled index of all wiki + tribal
  + memories + brain files + paths; auto-surfaces via wiki-precheck).
- `[[architecture/system-viz-gsd]]` -- domain operating runbook (GSD.md in this dir).
- `[[architecture/regen-viz-merge-guard]]` -- fail-loud merge guard doctrine.
- Tribal write: `prism_knowledge:tribal_capture slot=sierra` only -- NEVER direct markdown.
- AI-systems fleet state: `knowledge/memories/patterns/ai-systems-fleet-state.md`
  Regen: `node H:/prism/scripts/ai-systems-fleet-state.mjs`

## 9. Cross-galaxy edges (PSN)

| Direction | Galaxy / slot | Notes |
|---|---|---|
| PRODUCES -> | discovery / tango | graph is the substrate discovery runs on |
| PRODUCES -> | india / ai-training | `seed-ghost` ref-pool + `_node-embeddings.jsonl` for GNN tier-5 |
| PRODUCES -> | all 26 slots | master-index / awareness / pre-*-graph hits resolve against this graph |
| <- CONSUMES | golf / fleet-hygiene | golf queries graph for orphan/utilization classification |
| <- CONSUMES | alpha / token-optimization | reads system-viz output to find token-waste hotspots |
| <- CONSUMES | delta/cad + echo/post-processor | ghost nodes flow through merge-augmentations |

A degraded graph degrades fleet-wide search -- sierra correctness is load-bearing for all 26 slots.

## 10. Closed-loop integration (india)

`xproc_outcome_publish {slot:'sierra', domain:'system-viz'}` // UNVERIFIED (0 dispatcher hits).
Tribal capture (verified): `prism_knowledge:tribal_capture slot=sierra`.
Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

## 11. Test commands

```bash
cd H:/prism/mcp-server && rtk npx vitest run -t "system.viz|MasterIndex|GraphImportance|VizAugment|RankedHybrid"
node H:/prism/scripts/system-viz-query.mjs find system-viz
node H:/prism/scripts/system-viz-query.mjs headline
```

## 12. Known bugs / open threads

- `xproc_outcome_publish` / `xproc_kg_project_features` / `xproc_calibration_monitor_record`:
  0 grep hits in sessionDispatcher + knowledgeDispatcher (2026-06-13) -- aspirational, unverified.
- MasterIndexEngine, VizAutoAugmentationEngine, GraphImportanceEngine, HybridIndexEngine absent
  from `ENGINE_DIGEST.md`.

## 13. AI / reasoning surface

`node H:/prism/scripts/lib/galaxy-reasoning-bridge.mjs system-viz "<question>"`
Ollama: regen diff / ghost-node classify -> `gpt-oss:20b`; engine/lib code -> `qwen2.5-coder:32b`;
graph-theory / GNN architecture -> `gpt-oss:120b`.
