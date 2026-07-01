---
title: Wiki Stats — architecture tree
type: architecture
generated_by: scripts/build-wiki-leaf-index.mjs
last_verified: 2026-06-27
total_entries: 71738
tags: [architecture, wiki, stats, self-awareness]
---

# Wiki Stats — `knowledge/wiki/architecture/`

> Authoritative count of the auto-generated architecture wiki tree. The
> system-viz graph's `meta.headline.wikiEntries` (~776) only counts
> `index.md` lines — it does **not** see this tree. This file is the real
> number. (If you maintain `generate-system-viz.mjs`, count `architecture/**/*.md`.)

**Total recall-index entries:** 71738  (`architecture/` tree: 36790 · tribal tips: 4247 · hand-wiki (code-tribal+software-engineering+lessons+…): 9578 · memories: 21123)
**Leaf index:** `_leaf-index.jsonl` (24.33 MB) — consumed by `wiki-precheck-inject.mjs` (BM25 + cosine) and `wiki-recall-on-read.mjs` for keyword/path recall
**Semantic index:** `_embeddings.jsonl` (int8 nomic-embed-text vectors over concept entries; built by `build-wiki-embeddings.mjs` — present iff Ollama was reachable at last regen)
**Orphan rate:** 8714 orphans / 46617 files (18.7%)  (rescue hub: `_orphans-rescue.md` — every orphan gets an inbound link there, so effective orphan rate ≈ 0)
**Last regen:** 2026-06-27T17:43:18.608Z

## Breakdown by entry type

| Type | Count |
|------|-------|
| memory-reference | 20322 |
| action | 10481 |
| architecture | 9576 |
| code-tribal | 8468 |
| formula | 7316 |
| engine | 4750 |
| tribal-tip | 4247 |
| test | 1719 |
| skill | 1556 |
| hook | 903 |
| consensus | 391 |
| memory-feedback | 336 |
| os | 327 |
| lessons | 238 |
| memory-tribal-consolidation | 176 |
| memory-scrutiny | 169 |
| triplet-stub | 94 |
| lesson | 74 |
| dropdown | 68 |
| checkbox | 66 |
| algorithm | 61 |
| numeric | 49 |
| memory-project | 46 |
| selection | 42 |
| string | 38 |
| memory-patterns | 37 |
| software-engineering | 36 |
| reference | 34 |
| memory-dreams | 21 |
| course | 20 |
| integer | 8 |
| vector3 | 6 |
| selection_list | 6 |
| feature | 6 |
| memory-user | 6 |
| memory-uncategorized | 5 |
| script | 4 |
| audit | 2 |
| selection_pairs | 2 |
| concepts | 2 |
| memory-weekly-synthesis | 2 |
| memory-_legacy-root | 2 |
| playbook | 1 |
| boolean | 1 |
| substrate-engine | 1 |
| architecture-assessment | 1 |
| moc | 1 |
| assessment | 1 |
| assessment-correction | 1 |
| capability-verdict | 1 |
| scope-enumeration | 1 |
| synergy-audit | 1 |
| milestone | 1 |
| architecture-note | 1 |
| spec | 1 |
| tribal-category | 1 |
| unit-spec | 1 |
| learning | 1 |
| code-tribal/learning | 1 |
| code-tribal/learnings | 1 |
| concept | 1 |
| decision | 1 |
| decisions | 1 |
| coordination | 1 |
| entity | 1 |
| entities | 1 |
| ux-design | 1 |
| memory-galaxies | 1 |

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
