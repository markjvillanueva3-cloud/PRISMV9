---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-054
title: Tool DB sync service supports multiple network instances
category: setup
domain: document_learned
knowledge_type: setup_lesson
confidence: 91
source: document:Synchronization Tool Database Manual
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "tool-database", "synchronization", "network"]
material_groups: []
operation_types: []
content_hash: 39e3e35f30b68a518b7806d976e6836106d913eee59eb71c2ea6861ebf998f23
mirror_ts: 2026-05-05T13:36:01.205Z
mirror_engine: TribalVaultPopulatorEngine
---

# Tool DB sync service supports multiple network instances

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `91` · **Source:** `document:Synchronization Tool Database Manual`

## Tip

The synchronization service (omTdbServiceUi.exe) can sync multiple exchange folder + database pairs across a network. Use 'Account' option (not 'Local service') when syncing databases on different machines. Enable 'P' (Preserve) column to keep folder structure during XML import. Enable 'S' (Slave) column to write-protect the OPEN MIND database so only the sync service can modify it. Multiple exchange folders can sync into one database, but one folder cannot serve multiple databases.

## Related tips

- [[tk-dl-hm-051|SQL Tool DB requires DSN for multi-user mode]] _(category+tag:2)_
- [[tk-dl-hm-052|Tool DB migration preserves tool links with 'Yes' flag]] _(category+tag:2)_
- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-002|Always enable Automatic Geometry Check in hyperMILL]] _(category+tag:1)_
- [[tk-dl-hm-071|Link associative workplane to hyperMILL Frame]] _(category+tag:1)_

## Tags

#hypermill #tool-database #synchronization #network
