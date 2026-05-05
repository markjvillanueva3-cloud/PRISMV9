---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-052
title: Tool DB migration preserves tool links with 'Yes' flag
category: setup
domain: document_learned
knowledge_type: setup_lesson
confidence: 90
source: document:SQL Tool Database Manual
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "tool-database", "migration", "data-integrity"]
material_groups: []
operation_types: []
content_hash: b1b9c550be1dc6f64496fb8646d8ca1897453f1e7396449968d4dd4d7d3f7792
mirror_ts: 2026-05-05T13:36:01.442Z
mirror_engine: TribalVaultPopulatorEngine
---

# Tool DB migration preserves tool links with 'Yes' flag

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:SQL Tool Database Manual`

## Tip

When importing tools into a new SQL Server database version, answer 'Yes' to 'Is this import part of a database migration to a new version?' This preserves tool links in existing hyperMILL documents that referenced the old database, preventing broken tool references across all jobs. Supported import formats: ODBC (*.dsn), SQLite (*.db), and neutral exchange (*.xml).

## Related tips

- [[tk-dl-hm-051|SQL Tool DB requires DSN for multi-user mode]] _(category+tag:2)_
- [[tk-dl-hm-054|Tool DB sync service supports multiple network instances]] _(category+tag:2)_
- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-002|Always enable Automatic Geometry Check in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-071|Link associative workplane to hyperMILL Frame]] _(category+tag:1)_

## Tags

#hypermill #tool-database #migration #data-integrity
