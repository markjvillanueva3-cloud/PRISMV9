# GRAPH-AS-LLM-CONTEXT-MS0/U-GAC03 — [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC03 (slot:sierra): CodeGraphProjectionEngine -- TypeScript code graph for ego-graph retrieval (RepoGraph ICLR-2025). Per-file ts.createSourceFile (syntactic, no project type-check) so it CANNOT OOM on the full tree; nodes=files+symbols+import-targets, edges=declares/imports; egoGraph(graph,center,hops) cycle-safe BFS. Wired prism_dev:code_graph_project + scripts/code-graph-projection.mjs CLI (esbuild-bundle, dir-gated 8GB re-exec, temp in gitignored node_modules). 12 tests (9 engine + 3 dispatcher round-trip on real source) + CLI proven (335 files -> 6869 nodes). 2-agent scrutiny: all P0/P1 fixed (repoRoot walk-up launch-cwd-independent, maxFileBytes plumbed schema+handler, CLI temp leak->node_modules, dir-gated re-exec, relativeImportsFound for vacuous-depsResolved honesty, symlink-walk guard, .ts-suffix early-return) + P2 test strengthening (lenient-parse invariant, no-dup cycle, schema-reject). tsc+build clean. 3/8 units.

**Commit:** `7b0b60244d8a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T11:46:14-05:00
**Tags:** graph-as-llm-context-ms0, u-gac03, auto-distilled

## Subject
[GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC03 (slot:sierra): CodeGraphProjectionEngine -- TypeScript code graph for ego-graph retrieval (RepoGraph ICLR-2025). Per-file ts.createSourceFile (syntactic, no project type-check) so it CANNOT OOM on the full tree; nodes=files+symbols+import-targets, edges=declares/imports; egoGraph(graph,center,hops) cycle-safe BFS. Wired prism_dev:code_graph_project + scripts/code-graph-projection.mjs CLI (esbuild-bundle, dir-gated 8GB re-exec, temp in gitignored node_modules). 12 tests (9 engine + 3 dispatcher round-trip on real source) + CLI proven (335 files -> 6869 nodes). 2-agent scrutiny: all P0/P1 fixed (repoRoot walk-up launch-cwd-independent, maxFileBytes plumbed schema+handler, CLI temp leak->node_modules, dir-gated re-exec, relativeImportsFound for vacuous-depsResolved honesty, symlink-walk guard, .ts-suffix early-return) + P2 test strengthening (lenient-parse invariant, no-dup cycle, schema-reject). tsc+build clean. 3/8 units.

## Body
```
[GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC03 (slot:sierra): CodeGraphProjectionEngine -- TypeScript code graph for ego-graph retrieval (RepoGraph ICLR-2025). Per-file ts.createSourceFile (syntactic, no project type-check) so it CANNOT OOM on the full tree; nodes=files+symbols+import-targets, edges=declares/imports; egoGraph(graph,center,hops) cycle-safe BFS. Wired prism_dev:code_graph_project + scripts/code-graph-projection.mjs CLI (esbuild-bundle, dir-gated 8GB re-exec, temp in gitignored node_modules). 12 tests (9 engine + 3 dispatcher round-trip on real source) + CLI proven (335 files -> 6869 nodes). 2-agent scrutiny: all P0/P1 fixed (repoRoot walk-up launch-cwd-independent, maxFileBytes plumbed schema+handler, CLI temp leak->node_modules, dir-gated re-exec, relativeImportsFound for vacuous-depsResolved honesty, symlink-walk guard, .ts-suffix early-return) + P2 test strengthening (lenient-parse invariant, no-dup cycle, schema-reject). tsc+build clean. 3/8 units.
```

## Files touched (8)
- mcp-server/data/milestones/GRAPH-AS-LLM-CONTEXT-MS0.json      |   6 +--
- mcp-server/src/__tests__/CodeGraphProjectionEngine.test.ts    | 128 ++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/devDispatcher.codeGraph-wire.test.ts |  65 ++++++++++++++++++++++++
- mcp-server/src/engines/CodeGraphProjectionEngine.ts           | 321 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts                    |   8 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts             |  12 +++++
- scripts/code-graph-projection.mjs                             | 104 ++++++++++++++++++++++++++++++++++++++
- 7 files changed, 641 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7b0b60244d8a`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-AS-LLM-CONTEXT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._