---
title: Wiki Stats — architecture tree
type: architecture
generated_by: scripts/build-wiki-leaf-index.mjs
last_verified: 2026-05-15
total_entries: 23981
tags: [architecture, wiki, stats, self-awareness]
---

# Wiki Stats — `knowledge/wiki/architecture/`

> Authoritative count of the auto-generated architecture wiki tree. The
> system-viz graph's `meta.headline.wikiEntries` (~776) only counts
> `index.md` lines — it does **not** see this tree. This file is the real
> number. (If you maintain `generate-system-viz.mjs`, count `architecture/**/*.md`.)

**Total recall-index entries:** 23981  (`architecture/` tree: 19375 · tribal tips: 4245 · code-tribal: 185 · memories: 176)
**Leaf index:** `_leaf-index.jsonl` (6.64 MB) — consumed by `wiki-precheck-inject.mjs` (BM25 + cosine) and `wiki-recall-on-read.mjs` for keyword/path recall
**Semantic index:** `_embeddings.jsonl` (int8 nomic-embed-text vectors over concept entries; built by `build-wiki-embeddings.mjs` — present iff Ollama was reachable at last regen)
**Orphan rate:** 182 orphans / 19560 files (0.9%)  (rescue hub: `_orphans-rescue.md` — every orphan gets an inbound link there, so effective orphan rate ≈ 0)
**Last regen:** 2026-05-15T03:30:49.613Z

## Breakdown by entry type

| Type | Count |
|------|-------|
| action | 9242 |
| architecture | 7426 |
| tribal-tip | 4245 |
| engine | 1702 |
| hook | 456 |
| skill | 276 |
| code-tribal | 185 |
| test | 140 |
| formula | 80 |
| memory-reference | 68 |
| memory-feedback | 61 |
| algorithm | 53 |
| memory-project | 34 |
| memory-uncategorized | 7 |
| memory-user | 6 |

## How the tree stays fresh

`scripts/regen-wiki-from-viz.mjs` (fingerprint-gated multi-stage orchestrator)
regenerates everything on every post-commit + hourly cron — skips the chain when
the graph + inputs are unchanged. Generator chain: `generate-layer-wiki`,
`generate-domain-wiki`, `generate-dispatcher-wiki`, `generate-engine-wiki`,
`generate-action-wiki`, `generate-registry-wiki`, `generate-frontend-wiki`,
`generate-milestone-wiki`, `generate-misc-l8-wiki`, `generate-monolith-wiki`,
`generate-extracted-modules-wiki`, `generate-courses-wiki`, `generate-tribal-wiki`,
`generate-skill-wiki`, `generate-hook-wiki`, `generate-formula-algo-wiki`,
`generate-tribal-index`, `generate-domain-mermaid`, `generate-layer-stack-overview`,
then `system-viz-obsidian-bridge-v2`, `export-graph-cypher`, `inject-wiki-crosslinks`,
`build-wiki-leaf-index` (this), `build-wiki-embeddings`, `lint-wiki-orphans`.

## See also

- Stack overview: [[layer-stack-overview]]
- Recall hook: `.claude/hooks/wiki-precheck-inject.mjs`
- Cypher export: `state/shared/system-viz/graph.cypher` + [[neo4j-import]]
