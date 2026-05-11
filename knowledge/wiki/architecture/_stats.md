---
title: Wiki Stats — architecture tree
type: architecture
generated_by: scripts/build-wiki-leaf-index.mjs
last_verified: 2026-05-11
total_entries: 13949
tags: [architecture, wiki, stats, self-awareness]
---

# Wiki Stats — `knowledge/wiki/architecture/`

> Authoritative count of the auto-generated architecture wiki tree. The
> system-viz graph's `meta.headline.wikiEntries` (~776) only counts
> `index.md` lines — it does **not** see this tree. This file is the real
> number. (If you maintain `generate-system-viz.mjs`, count `architecture/**/*.md`.)

**Total entries:** 13949
**Leaf index:** `_leaf-index.jsonl` (3.27 MB) — consumed by `wiki-precheck-inject.mjs` for keyword recall
**Orphan rate:** 285 orphans / 13133 files (2.2%)
**Last regen:** 2026-05-11T14:40:55.693Z

## Breakdown by entry type

| Type | Count |
|------|-------|
| action | 9242 |
| architecture | 1751 |
| engine | 1701 |
| skill | 639 |
| hook | 483 |
| formula | 80 |
| algorithm | 53 |

## How the tree stays fresh

`scripts/regen-wiki-from-viz.mjs` (20-stage orchestrator) regenerates everything
on every post-commit (and the hourly cron). Generators: `generate-layer-wiki`,
`generate-domain-wiki`, `generate-dispatcher-wiki`, `generate-engine-wiki`,
`generate-action-wiki`, `generate-registry-wiki`, `generate-frontend-wiki`,
`generate-milestone-wiki`, `generate-skill-wiki`, `generate-hook-wiki`,
`generate-formula-algo-wiki`, `generate-monolith-wiki`, `generate-tribal-index`,
`generate-domain-mermaid`, `generate-layer-stack-overview`, then
`system-viz-obsidian-bridge-v2`, `export-graph-cypher`, `inject-wiki-crosslinks`,
`build-wiki-leaf-index` (this), `lint-wiki-orphans`.

## See also

- Stack overview: [[layer-stack-overview]]
- Recall hook: `.claude/hooks/wiki-precheck-inject.mjs`
- Cypher export: `state/shared/system-viz/graph.cypher` + [[neo4j-import]]
