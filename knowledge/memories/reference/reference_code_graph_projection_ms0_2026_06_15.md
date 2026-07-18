---
name: reference_code_graph_projection_ms0_2026_06_15
description: "GRAPH-AS-LLM-CONTEXT-MS0/U-GAC03 shipped (slot:sierra, 2026-06-15, commit 7b0b60244d). CodeGraphProjectionEngine = TS code graph (files+symbols+imports) via per-file ts.createSourceFile (no OOM) for RepoGraph ego-retrieval. Wired prism_dev:code_graph_project + scripts/code-graph-projection.mjs CLI. 12 tests. 3/8 units."
type: reference
source: prism-memory
synced: 2026-07-03T19:24:49.200Z
aliases: reference_code_graph_projection_ms0_2026_06_15
---


# GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03 -- CodeGraphProjectionEngine (2026-06-15, slot:sierra)

Third unit of the roadmap loop (operator "push through all building, self compaction"). Commit `7b0b60244d`.

## What shipped
- `mcp-server/src/engines/CodeGraphProjectionEngine.ts` -- `project(opts)` parses a TS target
  (file|dir) via **per-file `ts.createSourceFile`** (syntactic only, NO project type-check / NO
  ts-morph Project) so it CANNOT OOM on the full tree (the spec's stated ts-morph failure mode).
  nodes = file + top-level symbols (fn/class/interface/type/enum/const) + import targets (file/ext);
  edges = `declares` (file->symbol) + `imports` (file->file/ext). `egoGraph(graph,center,hops)` =
  cycle-safe BFS over the projected graph (RepoGraph ICLR-2025 ego-retrieval).
- Wired `prism_dev:code_graph_project` (devDispatcher case + devActionSchemas) + `scripts/code-graph-projection.mjs`
  CLI (esbuild-bundles the engine with typescript external, temp under gitignored node_modules,
  dir-gated 8GB self-re-exec). 12 tests (9 engine + 3 dispatcher round-trip on REAL source).
- CLI proven: a 335-file dir -> 6869 nodes / 6974 edges / deps_resolved. Wiki [[code-graph-projection-engine]].

## KEY DECISIONS / gotchas
- **typescript AND ts-morph are both already deps** -- chose raw `typescript` (ts.createSourceFile per
  file) over ts-morph's Project (which loads+typechecks the whole tree -> OOM). Per-file = bounded.
- **CLI runs the .ts engine via esbuild-bundle** (the graphrag-eval pattern): bundle with
  `--external:typescript` into `mcp-server/node_modules/.codegraph-<rand>/` so (a) typescript resolves
  by walking up to node_modules, (b) the temp is gitignored (no `git status` leak), cleaned in finally.
- **resolveRepoRoot walks UP** to the nearest ancestor that IS/CONTAINS mcp-server/ -- launch-cwd-
  independent (works from the MCP server's cwd, the CLI's repo-root cwd, or any sub-dir). The first cut
  (basename===mcp-server?dirname:cwd) was launch-cwd-fragile (scrutiny B P1).
- **depsResolved is vacuously true when there are ZERO relative imports** -- added `relativeImportsFound`
  to the result so callers can disambiguate "all resolved" from "none to resolve" (scrutiny honesty).
- ts.createSourceFile is LENIENT (partial AST on syntax errors, doesn't throw) -- a bad file still emits
  its file node + filesParsed++ (no total loss). Test pins `filesSkipped===0` so a future TS that throws
  is caught.

## 2-agent per-file scrutiny
A + B both FAIL -> ALL P0/P1 fixed: dispatcher dropped repoRoot (launch-cwd bug, fixed via engine
walk-up) + maxFileBytes (plumbed schema+handler); CLI temp leak (->node_modules) + always-8GB re-exec
(->dir-gated); vacuous depsResolved (->relativeImportsFound); symlink-walk recursion (->isSymbolicLink
skip); .ts-suffix double-candidate (->early-return). + P2 test strengthening. 12/12 green after fixes.

## Milestone status: 3/8
Done: U-GAC01 (GraphContextLensEngine), U-GAC02 (GraphRAGRetrievalEngine), U-GAC03 (this). Next:
U-GAC04 dual-channel context (JSON + viz screenshot -- tldraw pattern), U-GAC05 spatial-UI coord,
U-GAC06 community summaries (deps GAC02), U-GAC07 stale-graph guard HOOK (1h cron), U-GAC08
hallucinated-node-id guard HOOK (hooks = cross-worktree-blocked, use node-fs).

Related: [[reference_graph_context_lens_ms0_2026_06_15]] · [[reference_graphrag_retrieval_ms0_2026_06_15]] · [[feedback_sierra_no_gates_full_reign_2026_06_10]]
