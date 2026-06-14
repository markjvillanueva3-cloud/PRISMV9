---
name: reference_post_ship_juliett-db-bridge-ms0-u-db-monolith-macro-schema-loader
description: Auto-distilled learnings from shipping JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MACRO-SCHEMA-LOADER (commit 69904eabd). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.532Z
aliases: reference_post_ship_juliett-db-bridge-ms0-u-db-monolith-macro-schema-loader
---


# JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MACRO-SCHEMA-LOADER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JULIETT-DB-BRIDGE-MS0]/U-DB-MONOLITH-MACRO-SCHEMA-LOADER (slot:juliett /goal /loop iter12): port PRISM_MACRO_DATABASE_SCHEMA.js v13 — 8 tables + 58 columns + 1 index of hyperMILL/OPEN MIND macro DB schema + 4-dialect SQL DDL emitter (sqlite/mariadb/sqlserver/msaccess). Engine ~220L + tests ~190L / 28/28 PASS hermetic. DDL emitter: sqlite/mariadb monolith-faithful types; sqlserver NVARCHAR(MAX)/VARBINARY(MAX)/FLOAT/IDENTITY(1,1); msaccess TEXT/OLEOBJECT/DOUBLE/INTEGER/COUNTER. PRIMARY KEY suppresses redundant UNIQUE per SQL portability. R7+R8+R12 covered. Standalone (schema reference, not quote candidate). Source: extracted_modules/databases/PRISM_MACRO_DATABASE_SCHEMA.js v13. Plan: state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md.

**Shipped:** 2026-05-26T22:05:56-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[juliett-db-bridge-ms0-u-db-monolith-macro-schema-loader]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._