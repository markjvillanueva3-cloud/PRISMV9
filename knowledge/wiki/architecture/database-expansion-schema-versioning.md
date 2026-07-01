---
title: Schema-Versioning + Migration Discipline (database-expansion)
kind: architecture
status: shipped
date: 2026-05-29
unit: U-PSGB-JULIETT
milestone: PER-SLOT-GALAXY-BUILDOUT
author: claude-a6304a93 (slot juliett)
---

# Schema-Versioning + Migration Discipline

Owned by **slot:juliett**. Every PRISM state JSON carries `schemaVersion`; readers probe shape before parse; bumps land with a migration.

## Probe before read (schema-read-blindness)

The most expensive silent failure in the domain: a reader assumes a structure and reads a newer version as the old one. `high-roi-skill-rank.mjs` read a schema-v2 `ollama-offload-stats.json` as v1 and reported `0/0/0` against a fully-working route (2026-05-17). The data was fine — the READER was blind to the version.

Rule: first line of any state-file reader detects the version/shape (`if ('schemaVersion' in j)` / key-presence) and branches; keep N-1 readable for at least one minor. When a META/dashboard reports all-zeros, suspect the reader's schema assumption before concluding the feature is dead.

## Bump-with-migration

A `schemaVersion` bump and the migration that handles old→new are one change, never two. Migrations live in `mcp-server/src/migrations/` (`golf-ledger-v1.sql`, `golf-ledger-v2.sql`, `stateMigrations.ts`). Engines: `MigrationEngine`, `SchemaMigrationRollbackEngine` (down-path), `AutoSchemaGeneratorEngine`.

Most PRISM state files are versioned-by-convention, not by a migration script — that is **migration debt**, and closing it is juliett-domain work.

## Cross-refs
- [[database-expansion-atomic-write-discipline]] · [[knowledge-vault-schema]] · [[ledger-store]]
- Memory: `feedback_juliett_schema_probe_before_read`, `feedback_juliett_migration_with_bump`, `reference_lintstaged_noop_config_eats_commits`
