---
name: obsidian-graph-view-discovery
category: code-tribal
domain: backend-dev
tags: [obsidian, graph-view, dataview, vault, semantic-navigation, prism-development, ai-development]
last_updated: 2026-05-18
---

# Obsidian Graph View + Dataview — visual navigation of the PRISM second brain

PRISM's auto-feed sends memories + wikis to an Obsidian vault. Once there, Obsidian's Graph View and Dataview plugin turn the static markdown into a queryable knowledge graph. Operators who use the vault gain a discovery surface PRISM's repo-side tools don't provide.

## What flows into the vault

Per [[obsidian-vault-integration]]:
- `knowledge/memories/feedback/*.md` (Stop-hook feed, 3-min throttle)
- `knowledge/memories/reference/*.md`
- `knowledge/memories/project/*.md`
- `knowledge/wiki/**/*.md` (via separate cron sync)

NOT: CLAUDE.md, MEMORY.md (pointer-only), handoffs (chat-private).

## Graph View — visual cross-reference

Obsidian builds a graph from `[[wiki-name]]` cross-links. PRISM wikis use these liberally; the graph reveals:
- **Clusters** — topics that mutually reference each other (e.g. the "scrutiny" cluster: per-file-scrutiny-gate, fail-loud-r12-patterns, regression-prevention-doctrine, test-design-real-values)
- **Orphans** — nodes with zero incoming links (high-effort fix: add inbound cross-refs from related entries)
- **Hubs** — high-degree nodes (e.g. karpathy-12-rule-discipline is a hub because every doctrine page cross-links it)

Toggle the graph filter to "depth: 2" from a selected node to see the local neighborhood. This is the fastest way to understand a topic's surroundings in PRISM doctrine.

## Dataview — SQL-like queries over frontmatter

The Dataview plugin lets you query frontmatter as a structured dataset:

```dataview
LIST file.name, last_updated
FROM "knowledge/wiki/code-tribal"
WHERE domain = "backend-dev" AND contains(tags, "ai-development")
SORT last_updated DESC
LIMIT 20
```

Useful PRISM Dataview queries:

- All backend-dev wikis sorted by recency
- All wikis tagged with `regression` (audit ledger surface)
- All memory files NOT cross-linked from any wiki (curation gaps)
- All wikis with `last_updated > 30 days` (staleness audit)

The Dataview plugin reads frontmatter literally; PRISM's frontmatter convention (`name`, `category`, `domain`, `tags`, `last_updated`) is Dataview-ready.

## The "click a tag" navigation

Every PRISM wiki has 5-10 tags. Clicking a tag in Obsidian opens a tag-search showing all entries with that tag. Useful for:
- `ai-development` → broad backend-dev pool
- `prism-development` → PRISM-specific operations
- `regression` → ledger entries
- `mill`/`lathe`/`wedm`/`cad`/`cam` → manufacturing-domain entries
- `Karpathy` → R1-R12 references

A new contributor reading the vault for the first time should start at the `Karpathy` tag and click outward.

## The "Quick switcher" for symbol-style lookup

Obsidian's Quick Switcher (Ctrl-O) searches by filename. PRISM's filenames are kebab-case slugs matching the `name:` frontmatter, so:
- "ato" → atomic-write-idempotency-patterns
- "fail" → fail-loud-r12-patterns
- "scru" → per-file-scrutiny-gate, regression-prevention-doctrine
- "embed" → embedding-and-rag-patterns

Faster than browsing the file tree.

## Pinning canonical entries

Pin these as Obsidian "starred" or "bookmarks" for instant access:
- karpathy-12-rule-discipline (the doctrine root)
- engine-creation-playbook (the build recipe)
- roadmap-pickup-discipline (the pick recipe)
- per-file-scrutiny-gate (the review recipe)
- handoff-discipline (the session-end recipe)
- fleet-debug-playbook (the diagnostic recipe)

Together these cover ~80% of operator decisions in a PRISM dev session.

## The "vault as second brain" usage pattern

When a chat session is winding down OR the operator wants to think offline:
1. Open the vault in Obsidian.
2. Navigate via Graph View from the current topic.
3. Read related entries for context the chat didn't surface.
4. Note any decisions outside the chat session (vault-side notes don't auto-sync back; that's intentional per [[obsidian-vault-integration]]).

The vault is for thinking; the repo is for shipping. Keep them aligned but separate.

## When the vault is stale

The Stop-hook feed has a 3-min throttle + global lock. If recent memories aren't showing up:
1. `cat state/shared/.obsidian-feed-stamp` — recent fire?
2. `ls -la knowledge/memories/feedback/ | head -5` — recent writes?
3. Force a feed: `node .claude/hooks/stop-obsidian-memory-feed.mjs --force` (if implemented)

For full cross-PC sync, configure Obsidian Sync (paid) or git-based sync. PRISM doesn't auto-sync across PCs.

## Dataview-as-audit pattern

Use Dataview to audit knowledge-vault health:

```dataview
TABLE WITHOUT ID file.name, last_updated, length(file.outlinks) AS "outlinks"
FROM "knowledge/wiki"
WHERE length(file.inlinks) = 0
SORT length(file.outlinks) ASC
```

Returns orphans + their out-link count — entries that no one references AND that don't reference others (the truly isolated nodes). Either fix the cross-links or archive.

## Related

- [[obsidian-vault-integration]] — the data flow
- [[wiki-index-and-discovery]] — repo-side discovery (BM25 + cosine)
- [[memory-curation-discipline]] — what flows into the vault
- [[karpathy-12-rule-discipline]] — start point for new readers
- CLAUDE.md "Doc reflection rule" — 4-surface propagation discipline
