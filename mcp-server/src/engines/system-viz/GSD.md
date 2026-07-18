# System-Viz GSD — domain operating protocol (slot: sierra)

> Get-Stuff-Done runbook for the system-viz domain. The central GSD (`mcp-server/data/docs/gsd/GSD_QUICK.md`) covers session lifecycle; THIS is the domain-specific lifecycle: how to operate on the graph SAFELY. Commands verified on disk 2026-05-29. Companion to CLAUDE.md (scope) + MEMORY.md (learnings) + PATHS.md (where) + TOOLBELT.md (how-fast).

## 0. Prerequisites (always true)
- The merged graph `state/shared/system-viz/system-graph.json` is **370-575 MB / ~244K nodes** — V8 heap + ~512 MB max-string-length caps are routinely hit. `regen-viz.mjs` runs with a large `--max-old-space-size`.
- **ONE canonical writer:** `scripts/regen-viz.mjs`. Never add a second writer; never hand-edit the JSON.
- The graph is the **fleet search substrate** (master-index / awareness / pre-*-graph hooks read it). A sierra mistake here is a silent fleet-wide search outage → always verify after a write.

## 1. REGENERATE THE GRAPH (the safe sequence)
```bash
node H:/prism/scripts/regen-viz.mjs        # base full regen (~7 min): FAST[] generators → merge → repair → dedup → reparent → parent-edges → seed-ghost → drift-gate
```
The pipeline is **fail-loud at the merge stage** via `scripts/lib/regen-viz-merge-guard.mjs`: a SIGKILLed/OOM merge (exit 134) ABORTS before the post-merge stages, so they never run against a stale graph (R12; the U-REGEN-VIZ-MERGE-FAILLOUD class). After it finishes, **always** read the status sidecar (step 3) — do NOT trust "it printed done".

## 2. ADD A GHOST ROOST (new augmentation source) — the dual-registration checklist
A roost is a `scripts/generate-<thing>-features.mjs` that emits an augmentation under `state/shared/system-viz/augmentations/`. To make it appear in the merged graph it must register in **BOTH** places — one without the other = silent discard, no error:
1. Write `scripts/generate-<thing>-features.mjs` (compact `JSON.stringify`, NEVER `null,2`).
2. Add it to the `FAST[]` array in `scripts/regen-viz.mjs` (so the generator runs).
3. Add a splice block in `scripts/merge-augmentations.mjs` (so its output is merged).
4. **Verify:** `node scripts/regen-viz.mjs && node scripts/system-viz-query.mjs find <roost-noun>` → if nodes appear, dual-registration is correct; if not, one site is missing.

## 3. VERIFY GRAPH HEALTH (the ritual after every regen)
```bash
node -e "console.log(JSON.stringify(require('H:/prism/state/shared/system-viz/.last-successful-regen.json')))"
# GREEN iff: pendingCount=0 AND sidecarOk=true AND graphBytes ~current AND ts newer than .last-regen-failure.json
node H:/prism/scripts/system-viz-query.mjs find system-viz   # smoke test — ≥1 hit; empty = graph degraded/missing
```
If `.last-regen-failure.json.ts` is NEWER than `.last-successful-regen.json.ts`, the most recent run FAILED — treat the graph as suspect until a clean regen.

## 4. RECOVER FROM A FAILED / OOM REGEN (exit 134)
Symptom: `.last-regen-failure.json` shows `stage:"merge augmentations" exitCode:134` (V8 string/heap cap on the 548 MB graph).
1. **Assess:** `node scripts/system-viz-query.mjs find <common-engine>` — hits ⇒ merged graph still usable (the merge-guard aborted before clobbering); empty ⇒ corrupted.
2. **If corrupted:** `git restore state/shared/system-viz/system-graph.json` (the graph is a build artifact, never committed by regen).
3. **Clean orphaned scratch** (golf's reaper also handles these): remove `state/shared/system-viz/.tmp.system-graph.json.<pid>` + `_node-embeddings.jsonl.partial` ONLY if no live regen PID owns them.
4. **Diagnose the merge in isolation:** `node --max-old-space-size=16384 scripts/merge-augmentations.mjs 2>&1 | head -40` — a single oversized augmentation (>50 MB) is the usual cause; shard the offending generator's output.
5. Re-run `node scripts/regen-viz.mjs`; confirm via step 3.

## 5. SEARCH VIA THE GRAPH (viz-first — replaces Grep/Glob)
Recursive `**` Glob over H:/prism TIMES OUT (548 MB graph + 555 MB embedding partial + 13K files). Use the query CLI (verified subcommands):
```bash
node H:/prism/scripts/system-viz-query.mjs find <noun>              # ranked node hits (the canonical lookup)
node H:/prism/scripts/system-viz-query.mjs headline                # graph headline metrics
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates      # unwired + pending + drift, roadmap-shaped
node H:/prism/scripts/system-viz-query.mjs blast-radius <id>       # downstream edges (refactor planning)
node H:/prism/scripts/system-viz-query.mjs dispatcher-summary      # dispatcher coverage
node H:/prism/scripts/system-viz-query.mjs coverage-by-domain      # L5 domain coverage
node H:/prism/scripts/system-viz-query.mjs build-order             # dependency build order
```
The `audit-viz-first` hook auto-runs `find` on audit/missing intents — read its injected block before any fs scan.

## 5b. PRIORITIZE THE UNWIRED BACKLOG (leverage-ranked, not flat)
The unwired-engine backlog is NOT flat — wiring a domain that unlocks 3 dispatchers + many downstream hops beats wiring an isolated one. Rank it by graph-computed leverage so the fleet wires highest-impact-per-wire FIRST:
```bash
node H:/prism/scripts/leverage-ranked-wiring-queue.mjs   # → state/shared/system-viz/LEVERAGE-WIRING-QUEUE.{json,md}
```
Reads `architecture-graph.json` (OOM-safe — NOT the 548 MB merged graph). Each row = an `eng.<domain>` node with `unwired>0`, sorted by `unlocks.leverageScore` (graph-`0` → derived `unwired×max(1,dispatchersGain)×max(1,downstreamHops)`, since graph-0 means "no dispatcher attributed", the `needsDispatcherInference` case — NOT zero value). Rows flagged `needsDispatcherInference` (no `suggestedDispatchers`) must route through GNN tier-5 / sibling-prefix inference before wiring. Feeds `/pick-unit` + `dispatcher-wirer`. Domain-granularity; per-engine ranking needs the merged graph. Complements per-engine `scripts/unwired-bridge-rank.mjs` (fan-in proxy). Pure core + 10 tests: `scripts/lib/leverage-wiring-queue.{mjs,test.mjs}`.

## 6. THE THREE GRAPHS (do not confuse — each has its own consumer)
| File | Size | Writer | Consumer |
|------|------|--------|----------|
| `system-graph.json` | 548 MB merged, ~244K nodes | `regen-viz.mjs` | master-index / awareness / all pre-*-graph hooks (the fleet search substrate) |
| `architecture-graph.json` | 53 MB, L1-L10 arch-only | `generate-system-viz.mjs` (standalone, safe) | the 3D viewer (`_server.cjs` / system-viz.html) |
| `_node-embeddings.jsonl` | 555 MB, one node/line (`.partial` after OOM) | `seed-ghost-from-unwired.mjs` side-effect | india's GNN tier-5 wiring-inference |

## 7. DISPATCHER-ID SSOT (seed-ghost / wiring inference)
When mapping an mcp tool-name → a graph dispatcher node id, the SSOT prefix is **`disp.`** (file-derived, e.g. `disp.camdispatcher`), NOT `dispatcher.<mcp_tool_name>`. `seed-ghost-from-unwired.mjs` already enforces this (its `DISPATCHER_TYPE` map). A wrong prefix → dead edges to non-existent nodes (dead-pixel class — caught by the dead-pixel detector).

## When in doubt
A regen that "succeeded" but dropped node count = assume silent stale-clobber; verify schemaVersion + node count + fsCoverage (step 3) before trusting ANY downstream artifact. Cross-refs: [[reference_sierra_regen_pipeline_stages]] · [[reference_sierra_graph_oom_classes]] · [[feedback_sierra_graph_correctness_is_fleet_search]] · GSD central: `mcp-server/data/docs/gsd/GSD_QUICK.md`.
