---
title: Wiki Stats — architecture tree
type: architecture
generated_by: scripts/build-wiki-leaf-index.mjs
last_verified: 2026-05-19
total_entries: 28520
tags: [architecture, wiki, stats, self-awareness]
---

# Wiki Stats — `knowledge/wiki/architecture/`

> Authoritative count of the auto-generated architecture wiki tree. The
> system-viz graph's `meta.headline.wikiEntries` (~776) only counts
> `index.md` lines — it does **not** see this tree. This file is the real
> number. (If you maintain `generate-system-viz.mjs`, count `architecture/**/*.md`.)

**Total recall-index entries:** 28520  (`architecture/` tree: 23060 · tribal tips: 4246 · hand-wiki (code-tribal+software-engineering+lessons+…): 697 · memories: 517)
**Leaf index:** `_leaf-index.jsonl` (7.90 MB) — consumed by `wiki-precheck-inject.mjs` (BM25 + cosine) and `wiki-recall-on-read.mjs` for keyword/path recall
**Semantic index:** `_embeddings.jsonl` (int8 nomic-embed-text vectors over concept entries; built by `build-wiki-embeddings.mjs` — present iff Ollama was reachable at last regen)
**Orphan rate:** 574 orphans / 23749 files (2.4%)  (rescue hub: `_orphans-rescue.md` — every orphan gets an inbound link there, so effective orphan rate ≈ 0)
**Last regen:** 2026-05-19T00:56:56.090Z

## Breakdown by entry type

| Type | Count |
|------|-------|
| action | 10291 |
| architecture | 8094 |
| tribal-tip | 4246 |
| engine | 3112 |
| code-tribal | 613 |
| hook | 584 |
| test | 436 |
| skill | 360 |
| memory-reference | 293 |
| formula | 121 |
| memory-feedback | 86 |
| memory-_legacy-root | 74 |
| algorithm | 61 |
| memory-project | 34 |
| os | 28 |
| memory-scrutiny | 23 |
| software-engineering | 19 |
| lessons | 17 |
| consensus | 11 |
| memory-user | 6 |
| lesson | 4 |
| playbook | 1 |
| decisions | 1 |
| coordination | 1 |
| entity | 1 |
| entities | 1 |
| reference | 1 |
| memory-uncategorized | 1 |

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
