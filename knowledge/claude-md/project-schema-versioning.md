---
schema_version: 1.0.0
source: project
section: SCHEMA VERSIONING
slug: schema-versioning
start_line: 236
end_line: 238
indexed_at: 2026-05-05T13:49:55.480Z
content_hash: 8d4c06e52afca50d0849516688da9e2ba5ae1f625efd1848d4a9962716f0ad85
mirror_engine: ClaudeMdChunkerEngine
---
## SCHEMA VERSIONING
Every state JSON requires `schemaVersion`. Migrations in `src/migrations/`. Backward compatibility: N-1 versions. Breaking changes → version bump + migration path.
