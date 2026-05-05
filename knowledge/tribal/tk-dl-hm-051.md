---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-051
title: SQL Tool DB requires DSN for multi-user mode
category: setup
domain: document_learned
knowledge_type: anti_pattern
confidence: 92
source: document:SQL Tool Database Manual
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "tool-database", "sql-server", "multi-user"]
material_groups: []
operation_types: []
content_hash: a4f83f18ebaf9b305fbe874e6d3d95eedcc30457d20c801fada1b1a639e735c5
mirror_ts: 2026-05-05T13:36:01.048Z
mirror_engine: TribalVaultPopulatorEngine
---

# SQL Tool DB requires DSN for multi-user mode

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:SQL Tool Database Manual`

## Tip

SQLite (*.db) databases cannot be used in multi-user mode. Only databases opened via *.dsn files support concurrent access. Use SQL Server Native Client XX.X driver — never the generic 'SQL Server' driver, which cannot transfer more than 400 kB and will fail when storing 3D tool geometries. If the PWD entry is missing from the generated .dsn file, add it manually with a text editor.

## Related tips

- [[tk-dl-hm-054|Tool DB sync service supports multiple network instances]] _(category+tag:2)_
- [[tk-dl-hm-052|Tool DB migration preserves tool links with 'Yes' flag]] _(category+tag:2)_
- [[tk-dl-hm-053|Macro DB multi-user: create/edit is single-user only]] _(category+tag:2)_
- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-002|Always enable Automatic Geometry Check in hyperMILL]] _(category+tag:1)_

## Tags

#hypermill #tool-database #sql-server #multi-user
