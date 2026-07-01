---
title: CodeGraphProjectionEngine (TypeScript code graph for ego retrieval)
type: architecture
layer: L6
created: 2026-06-15
slot: sierra
unit: GRAPH-AS-LLM-CONTEXT-MS0/U-GAC03
tags: [code-graph, repograph, ast, ego-graph, typescript, prism_dev, system-viz]
related:
  - graph-context-lens-engine
  - graphrag-retrieval-engine
---

# CodeGraphProjectionEngine

Third unit of GRAPH-AS-LLM-CONTEXT-MS0 (slot:sierra, commit `7b0b60244d`). Projects TypeScript
source into a code graph for ego-graph retrieval by coding agents (RepoGraph, ICLR 2025: ego-graph
retrieval boosts SWE-bench resolve rate +32.8%).

## Design

Per-file **`ts.createSourceFile`** (syntactic parse only -- no project-wide type-check, no ts-morph
`Project`), one file at a time, so it **cannot OOM** on the full mcp-server tree (the spec's stated
ts-morph failure mode). Both `typescript` and `ts-morph` are deps; the raw compiler API is the bounded
choice.

- **nodes**: `file:<rel>` + `sym:<rel>#<name>` (function/class/interface/type/enum/const) + import
  targets (`file:<rel>` resolved, or `ext:<spec>`).
- **edges**: `declares` (file -> symbol), `imports` (file -> file/external).
- `project(opts)` -> `{target, nodes, edges, filesParsed, filesSkipped, relativeImportsFound, depsResolved, warnings}`.
  `depsResolved` = every relative import resolved (vacuously true when `relativeImportsFound===0`).
- `egoGraph(graph, centerId, hops)` -> cycle-safe BFS over the projected graph (RepoGraph retrieval).

Guards: oversize-file skip (`maxFileBytes`, default 5MB), walk cap (`maxFiles`, default 2000),
node_modules/dist/.d.ts skipped, **symlinks not followed** (cycle/escape guard), repo-root resolved by
**walking up** to the nearest mcp-server-containing ancestor (launch-cwd-independent).

## Surfaces

- `prism_dev:code_graph_project` -- params `{target (req), center?, hops?, maxFiles?, maxFileBytes?}`.
  With `center`, returns the ego-graph; else the full projection. Result in `r.data`.
- `scripts/code-graph-projection.mjs --target=<path> [--center=<id>] [--hops=N] [--json]` -- the
  verifies_via CLI. esbuild-bundles the real engine (typescript external) into a gitignored temp under
  `node_modules/`; 8GB self-re-exec **gated to directory targets** (single-file runs on the default heap).

## Tests + proof

`CodeGraphProjectionEngine.test.ts` (9: single-file, multi-file deps, a<->b cycle, unparseable [lenient
partial AST, pins `filesSkipped===0`], oversize-skip, large-file, target-not-found, egoGraph [no-dup
cycle-safety], bad-graph) + `devDispatcher.codeGraph-wire.test.ts` (3 round-trip on REAL engine source).
CLI proven on a 335-file dir -> 6869 nodes / 6974 edges / deps_resolved.

## Lessons

- A CLI that must run a `.ts` engine: esbuild-bundle it on the fly with heavy deps external + temp under
  a gitignored dir (reusable pattern, also in `graphrag-eval.mjs`).
- `depsResolved` is vacuously true with zero relative imports -- expose the COUNT so callers can tell
  "all resolved" from "none existed" (honest metrics).
- repo-root resolution must not depend on launch cwd -- walk up to a structural marker.

## Next: U-GAC04..08 (5 remaining)
dual-channel context (JSON + viz screenshot, tldraw pattern), spatial-UI coordination, community
summaries (deps GAC02), stale-graph guard hook (1h cron), hallucinated-node-id guard hook.
