---
title: PRISM Dataview Queries (HMEMV11)
type: architecture
tags: [hermes, obsidian, memory-vault, dataview, context-retention, hmemv]
created: 2026-06-11
status: shipped
slot: zulu
milestone: HERMES-MEMORY-VAULT-MS0
---

# PRISM Dataview Queries -- operator-callable views from inside Obsidian (HMEMV11)

The PRISM vault already uses the **Dataview** plugin (live blocks exist across `knowledge/wiki/`). These snippets turn the vault's frontmatter into live, operator-callable views -- the runtime-query complement to HMEMV08's `.base` pivot tables (`knowledge/bases/`). Bases give fixed pivot tables; Dataview gives ad-hoc queries you paste into any note and edit in place.

**How to use:** open any note in Obsidian, paste one of the fenced ` ```dataview ` blocks below, and it renders live. Edit the `WHERE` / `SORT` / `LIMIT` to re-target. All fields referenced below are REAL frontmatter present in the corpus (verified 2026-06-11): memories carry `type` + `description`; wiki carries `type` + `tags` + `slot` + `milestone` + `status` + `created`. `file.folder`, `file.mtime`, `file.name`, `file.link` are Dataview built-ins.

---

## 1. Memories by type (the brain's standing knowledge, grouped)

Every memory grouped by its `type` (feedback / reference / project / ...). The first stop for "what does the brain already know".

```dataview
TABLE WITHOUT ID file.link AS "Memory", type, description
FROM "knowledge/memories"
WHERE type AND type != "index"
SORT type ASC, file.mtime DESC
```

## 2. Freshest memories (what the brain learned recently)

The 25 most recently updated memories -- the leading edge of cross-session learning.

```dataview
TABLE WITHOUT ID file.link AS "Memory", type, file.mtime AS "Updated"
FROM "knowledge/memories"
WHERE type
SORT file.mtime DESC
LIMIT 25
```

## 3. Standing doctrine (feedback rules only)

The `feedback_*` rules -- the fleet's standing operating doctrine, one-line each.

```dataview
LIST description
FROM "knowledge/memories/feedback"
SORT file.name ASC
```

## 4. Wiki entries for one milestone

All wiki entries tagged to a milestone (edit the milestone name). Example shows HERMES-MEMORY-VAULT-MS0.

```dataview
TABLE WITHOUT ID file.link AS "Entry", status, slot, created
FROM "knowledge/wiki"
WHERE milestone = "HERMES-MEMORY-VAULT-MS0"
SORT created DESC
```

## 5. Wiki by slot (who-built-what across the fleet)

Counts wiki entries per owning slot -- a fast read of which galaxy has been most active.

```dataview
TABLE WITHOUT ID length(rows) AS "Entries"
FROM "knowledge/wiki"
WHERE slot
GROUP BY slot
SORT length(rows) DESC
```

## 6. Recently shipped (status: shipped, newest first)

Wiki entries marked `status: shipped`, newest first -- a live "what just landed" feed.

```dataview
TABLE WITHOUT ID file.link AS "Shipped", milestone, created
FROM "knowledge/wiki"
WHERE status = "shipped"
SORT created DESC
LIMIT 20
```

---

## Notes

- These are **read-only** views; Dataview never mutates the vault.
- Pairs with HMEMV08 Bases (`knowledge/bases/*.base`) -- Bases = saved pivot tables, Dataview = ad-hoc runtime queries.
- Validation: every `FROM`/`WHERE` field above references a frontmatter key confirmed present in the live corpus (`scripts/__tests__/hmemv11-dataview-validate.test.mjs`).
- Related: [[hmemv-temporal-recall-bases]] (HMEMV03 + HMEMV08) - [[hermes-memory-vault-ms0]]
