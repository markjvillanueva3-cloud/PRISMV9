---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-053
title: Macro DB multi-user: create/edit is single-user only
category: setup
domain: document_learned
knowledge_type: setup_lesson
confidence: 88
source: document:SQL Macro Database Manual
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "macro-database", "multi-user", "collaboration"]
material_groups: []
operation_types: []
content_hash: 42b8a6c3de488e61382157a4b09d12cc6ebedbad2713b71d4661efb9ca6ea107
mirror_ts: 2026-05-05T13:36:02.124Z
mirror_engine: TribalVaultPopulatorEngine
---

# Macro DB multi-user: create/edit is single-user only

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:SQL Macro Database Manual`

## Tip

In SQL Server macro databases, creating and editing macros cannot be done by multiple users simultaneously — this applies to both standard and SQL databases. However, applying macros (Macros → Apply macros) works concurrently. Export macros as *.omx format before version upgrades, then import into the new SQL database.

## Related tips

- [[tk-dl-hm-051|SQL Tool DB requires DSN for multi-user mode]] _(category+tag:2)_
- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-002|Always enable Automatic Geometry Check in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-071|Link associative workplane to hyperMILL Frame]] _(category+tag:1)_
- [[tk-dl-hm-022|Max angle increment must match controller RTCP capability]] _(category+tag:1)_

## Tags

#hypermill #macro-database #multi-user #collaboration
