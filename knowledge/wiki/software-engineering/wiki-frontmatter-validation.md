---
name: wiki-frontmatter-validation
category: software-engineering
domain: backend-dev
tags: [wiki, frontmatter, validation, lint, discoverability, prism-development, ai-development]
last_updated: 2026-05-18
---

# Wiki Frontmatter Validation — what wiki-lint checks + why it matters

Wiki frontmatter is what makes entries discoverable. Without correct frontmatter, an entry fails to:
- BM25-tokenize correctly (recall misses paraphrase queries)
- Get the domain-bias boost (recall misses backend-dev slots)
- Cross-link in Obsidian Graph View
- Surface in Dataview queries

The wiki-lint hook checks the contract. Failing the lint = entry won't be found in 90% of likely queries.

## The required frontmatter contract

```yaml
---
name: short-kebab-case-slug
category: code-tribal | software-engineering | architecture | lessons | patterns | trajectories
domain: backend-dev | mill | lathe | wedm | cad | cam | general
tags: [tag1, tag2, tag3, ...]
last_updated: 2026-05-DD
sources: [optional, list of canonical sources]
---
```

All 5 required fields (`name`, `category`, `domain`, `tags`, `last_updated`) must be present. Missing any one → lint fail.

## Per-field rules

### `name`

- Lowercase kebab-case
- MUST match the filename (without .md)
- Used as the `[[wiki-name]]` cross-link target
- Used as the canonical entity id in Dataview / system-viz

Anti-pattern: `name: MyWikiEntry` (PascalCase). Lint rejects.

### `category`

One of the 6 canonical categories:
- `code-tribal` — operational/architectural patterns
- `software-engineering` — meta-discipline (Karpathy, fail-loud, testing)
- `architecture` — system-graph nodes (auto-generated from system-viz)
- `lessons` — learning notes
- `patterns` — design patterns
- `trajectories` — multi-step decision arcs

Anything else → lint reject. New categories require schema bump.

### `domain`

One of 7 domains: `backend-dev` | `mill` | `lathe` | `wedm` | `cad` | `cam` | `general`.

The 2026-05-18 lima wiring added `backend-dev` as the 6th tribal domain. Set this correctly — it gates the in-domain boost.

### `tags`

Array of 5-10 lowercase strings. Tokens span:
- Topic noun (`scrutiny`, `karpathy`, `atomic-write`)
- Process verb (`refactor`, `wiring`, `coordination`)
- Discipline domain (`ai-development`, `software-engineering`)

Avoid: too few (<3) makes the entry undiscoverable; too many (>15) dilutes BM25 signal.

### `last_updated`

ISO date `YYYY-MM-DD`. Used by:
- Wiki staleness audit
- Dataview "sort by recency"
- The recall hook may downweight very-old entries

Update on every meaningful edit, not just creation.

### `sources` (optional)

Array of canonical references — paper URLs, doc paths, prior commits. Used to:
- Establish provenance for safety-critical entries
- Cross-reference upstream when the wiki diverges

For physics entries: cite the textbook or paper. For PRISM-specific entries: cite the CLAUDE.md section or commit hash.

## What wiki-lint checks

`scripts/wiki-lint.mjs` runs:
- Frontmatter parses as valid YAML
- All 5 required fields present
- `name:` matches filename
- `category:` is one of the 6 canonical values
- `domain:` is one of the 7 canonical values
- `tags:` is a non-empty array
- `last_updated:` parses as ISO date
- No frontmatter duplication (one block at top)

Exit code 0 = clean. Nonzero with specific failure messages = action required.

## What wiki-lint does NOT check

- Body content quality (subjective)
- Cross-link validity (`[[nonexistent]]` is permitted as TODO marker)
- Length (50-150 lines is convention, not enforced)
- Domain assignment correctness (mechanical lint can't tell if "backend-dev" is right for content X)

These belong in the per-file scrutiny gate's reviewer agent, not the lint.

## When the lint fails

Three common failure modes:

1. **Missing `domain:`** — new wikis without explicit domain default to "general" which misses the in-domain boost. Always set explicitly.
2. **Filename ↔ name mismatch** — file is `foo-bar.md` but `name: foo_bar`. Rename one to match.
3. **Stale `last_updated:`** — operator forgot to bump on edit. Update or accept the staleness audit flag.

The fix is usually a 1-line edit. Re-run lint to confirm clean.

## How the recall hook uses frontmatter

`wiki-precheck-inject.mjs` (UserPromptSubmit T2):
1. BM25 over `_leaf-index.jsonl` — `tags` + title contribute heavily
2. Cosine over `_embeddings.jsonl` — first paragraph + tags are the embedding seed
3. Domain-bias scorer — `domain:` field gives +4.5 boost when slot's domain matches

Without `domain:`, the in-domain boost can't fire. Without `tags:`, BM25 has only the title to match.

## How Obsidian Dataview uses frontmatter

Dataview queries:

```dataview
TABLE WITHOUT ID file.name, last_updated
FROM "knowledge/wiki/code-tribal"
WHERE domain = "backend-dev" AND contains(tags, "ai-development")
SORT last_updated DESC
LIMIT 10
```

Every field listed above is queryable. Frontmatter IS the structured layer over the markdown body.

## How the system-viz graph uses frontmatter

`scripts/generate-layer-wiki.mjs` reads frontmatter to populate L10 wiki-entry nodes in `system-graph.json`:
- `name:` → node id
- `category:` → node sub-type
- `domain:` → node domain filter
- `tags:` → node tag set for keyword search

The master-index pre-search queries this graph via tokens; correctly-tagged entries surface in the top-K.

## Auto-regeneration cadence

`regen-wiki-from-viz.mjs` (post-commit + hourly cron) regenerates:
- `index.md`
- `_stats.md`
- `_leaf-index.jsonl`
- `_embeddings.jsonl` (Ollama-dependent; falls back gracefully)

A fingerprint gate skips the 8-min chain when no frontmatter changed. Test this by adding a wiki entry → committing → checking that the regen fired on post-commit.

## Common anti-patterns

- **Frontmatter missing for "draft" entries** — they live in the wiki tree but never get found. Either set frontmatter OR keep them in `state/shared/dashboards/drafts/` until ready.
- **Title in frontmatter `title:` field** — PRISM uses `name:`, not `title:`. Lint reject.
- **`name:` with spaces** — kebab-case only. Lint reject.
- **Different domain in frontmatter vs filename pattern** — domain misalignment confuses both recall + graph.
- **Empty `tags:` array** — entry has no BM25 substrate beyond title. Recall hit rate halves.

## Validation command

```bash
node scripts/wiki-lint.mjs                              # all wikis
node scripts/wiki-lint.mjs knowledge/wiki/code-tribal/  # specific dir
node scripts/wiki-lint.mjs --fix                        # auto-fix some classes (filename rename, frontmatter ordering)
```

## Related

- [[wiki-index-and-discovery]] — how the indexes consume frontmatter
- [[obsidian-graph-view-discovery]] — Dataview queries over frontmatter
- [[doc-reflection-rule]] — wiki is surface 3 of 4
- [[memory-curation-discipline]] — memory frontmatter is similar (different schema)
- CLAUDE.md "PRISM WIKI" + WIKI_SCHEMA.md
- `scripts/wiki-lint.mjs` — the canonical lint
