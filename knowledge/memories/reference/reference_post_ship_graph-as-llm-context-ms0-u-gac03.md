---
name: reference_post_ship_graph-as-llm-context-ms0-u-gac03
description: Auto-distilled learnings from shipping GRAPH-AS-LLM-CONTEXT-MS0/U-GAC03 (commit 7b0b60244). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.880Z
aliases: reference_post_ship_graph-as-llm-context-ms0-u-gac03
---


# GRAPH-AS-LLM-CONTEXT-MS0/U-GAC03

[GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC03 (slot:sierra): CodeGraphProjectionEngine -- TypeScript code graph for ego-graph retrieval (RepoGraph ICLR-2025). Per-file ts.createSourceFile (syntactic, no project type-check) so it CANNOT OOM on the full tree; nodes=files+symbols+import-targets, edges=declares/imports; egoGraph(graph,center,hops) cycle-safe BFS. Wired prism_dev:code_graph_project + scripts/code-graph-projection.mjs CLI (esbuild-bundle, dir-gated 8GB re-exec, temp in gitignored node_modules). 12 tests (9 engine + 3 dispatcher round-trip on real source) + CLI proven (335 files -> 6869 nodes). 2-agent scrutiny: all P0/P1 fixed (repoRoot walk-up launch-cwd-independent, maxFileBytes plumbed schema+handler, CLI temp leak->node_modules, dir-gated re-exec, relativeImportsFound for vacuous-depsResolved honesty, symlink-walk guard, .ts-suffix early-return) + P2 test strengthening (lenient-parse invariant, no-dup cycle, schema-reject). tsc+build clean. 3/8 units.

**Shipped:** 2026-06-15T11:46:14-05:00 by markjvillanueva3-cloud
**Files:** 8 touched

Full distillation: [[graph-as-llm-context-ms0-u-gac03]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._