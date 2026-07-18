---
name: feedback_juliett_migration_with_bump
description: Standing rule — a schemaVersion bump lands in the same change as a migration in src/migrations/
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.431Z
aliases: feedback_juliett_migration_with_bump
---


**Standing rule (juliett / database-expansion):** bumping a state file's `schemaVersion` and writing the migration that handles old→new are **one atomic change**, never two. Migrations live in `mcp-server/src/migrations/` (today: `golf-ledger-v1.sql`, `golf-ledger-v2.sql`, `stateMigrations.ts`).

**Why:** a version bump without a migration means every reader holding an N-1 file either crashes on load or silently mutates it on read (data loss with no audit). The whole point of `schemaVersion` is a safe upgrade path; bumping it without the path defeats it.

**How to apply:**
- Never `j.schemaVersion = "2.0.0"` on its own. Write the up-migration (and ideally a down/rollback — see `SchemaMigrationRollbackEngine`) in the same commit.
- Keep N-1 readable for at least one minor so peers mid-flight don't break.
- Most PRISM state files are versioned-by-convention, not by a migration script — that is migration debt; closing it is juliett-domain work.
