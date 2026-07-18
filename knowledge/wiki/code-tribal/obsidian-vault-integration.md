---
name: obsidian-vault-integration
category: code-tribal
domain: backend-dev
tags: [obsidian, knowledge-vault, memory-feed, stop-hook, semantic-search, prism-development, ai-development]
last_updated: 2026-05-18
---

# Obsidian Vault Integration — auto-feed + query paths

PRISM's auto-memory and wiki content flow into an Obsidian vault automatically via the Stop-hook feed. This wiki documents the data path, the query surface, and the operator's intervention points.

## Data flow (one direction: PRISM → Obsidian)

```
auto-memory write (knowledge/memories/<type>/*.md)
        │
        ▼
Stop hook: stop-obsidian-memory-feed.mjs (3-min global throttle, O_EXCL lock)
        │
        ▼
Obsidian vault (per knowledge/wiki/architecture/obsidian-memory-feed-hook.md)
        │
        ▼
Obsidian semantic search + graph view
```

The feed runs on every Stop unless throttled by the 3-min interval. Non-destructive `_legacy-root` reconcile prevents accidental overwrite of vault content. The dedicated hook is decoupled from the Ollama-gated extract hook so Ollama outages don't block the feed.

## What flows in

- `knowledge/memories/feedback/*.md` — every auto-memory feedback file
- `knowledge/memories/reference/*.md` — every reference memory
- `knowledge/memories/project/*.md` — every project memory
- `knowledge/wiki/**/*.md` — wiki entries (via separate cron-driven sync, not the Stop feed)

What does NOT auto-flow:
- `CLAUDE.md` (project doctrine — stays in repo)
- `MEMORY.md` index (pointer-only, derivable from sources)
- `state/shared/handoffs/` (chat-private; would pollute the vault)

## Knobs

- `PRISM_OBSIDIAN_FEED_DISABLE=1` — disable the Stop feed entirely
- `PRISM_OBSIDIAN_FEED_INTERVAL_MS=N` — throttle interval (default 3 min)

## Query paths

PRISM provides 3 surfaces for querying the vault from chat context:

1. **Master-index pre-search** — UserPromptSubmit T2 hook injects top-K hits from `system-graph.json` joined with Obsidian entries; runs automatically.
2. **`prism_memory:semantic_search`** — explicit Qdrant-backed semantic search across cross-session memory graph; use when the master-index hits aren't enough.
3. **`/wiki-query <name>`** — direct fetch by wiki name; resolves through both wiki and Obsidian-mirrored entries.

For purely Obsidian-side queries (vault as ground truth, ignore PRISM repo):
- Open the vault in Obsidian app and use its built-in search
- Use the vault's Dataview / Graph view for visual navigation

## The "Obsidian as the second brain" doctrine

The vault is PRISM's cross-session second brain. Three properties matter:

1. **Append-only** — never delete from the vault; soft-tag as `_archived` if needed.
2. **Pointer-rich** — every entry links to its canonical PRISM source path (so an operator can jump from vault → repo).
3. **Frontmatter-discoverable** — every entry has `name`, `category`, `tags`, `last_updated` so dataview / graph filters work.

The Stop feed enforces these by validating frontmatter before copy.

## When the feed fails silently

The 3-min throttle + O_EXCL lock can silently skip a Stop if a peer chat just fed. Operator-facing symptoms:
- "I wrote a memory but it's not in the vault yet" — wait 3 minutes OR force a vault sync.
- "Vault has duplicates" — `_legacy-root` reconcile is meant to prevent this but historical drift can produce them; periodic dedup needed.
- "Vault is stale across machines" — the feed is per-PC; Obsidian Sync or similar bridges across machines.

## Writing memories that flow well

The frontmatter that makes a memory vault-friendly:

```yaml
---
name: short-kebab-case-slug
description: one-line summary (50-200 chars)
metadata:
  type: feedback | reference | project | user
---
```

Without `name` + `description` + `type`, the entry still flows but won't surface well in vault search. The auto-memory protocol in user CLAUDE.md enforces these — follow it.

## The 2-direction temptation (don't)

It's tempting to make the Obsidian vault writable back into PRISM (vault edits → wiki regenerate). DON'T:
- Multi-chat coordination conflicts (which chat owns the vault edit?)
- Frontmatter drift (Obsidian's own plugins mutate frontmatter)
- Loss of git history (vault edits bypass commit hygiene)

If a vault entry needs to change PRISM doctrine, the operator should edit the canonical source in `H:/prism/knowledge/` and let the feed re-sync.

## Related

- [[multi-chat-coordination]] — Stop hooks coordinate vault writes across chats
- [[tribal-precontext-architecture]] — query layer that pre-injects vault hits
- [[embedding-and-rag-patterns]] — semantic search over vault content
- CLAUDE.md "Doc reflection rule (2026-05-15, user)" — 4-surface propagation
- `knowledge/wiki/architecture/obsidian-memory-feed-hook.md` — hook implementation detail
