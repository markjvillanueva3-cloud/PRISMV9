---
name: feedback_juliett_schema_probe_before_read
description: Standing rule — META/reader tools probe schemaVersion/shape before parsing a state JSON
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.432Z
aliases: feedback_juliett_schema_probe_before_read
---


**Standing rule (juliett / database-expansion):** every tool that READS a PRISM state JSON must **probe its schema shape first** (`if ('schemaVersion' in j)` / `if ('totals' in j)` / key-presence check) before assuming a structure.

**Why — the schema-read-blindness class:** `high-roi-skill-rank.mjs` read a schema-v2 `ollama-offload-stats.json` as if it were v1 and reported `0/0/0` against a fully-working route (2026-05-17). The data was fine; the READER was blind to the version. Silent zeros from a reader that doesn't version-check look exactly like "nothing happened" — the worst kind of false negative.

**How to apply:**
- First line of any state-file reader: detect the version/shape, branch on it, keep N-1 back-compat for at least one minor.
- A bumped `schemaVersion` with no reader update is half a migration — both sides move together (see [[feedback_juliett_migration_with_bump]]).
- When a META/dashboard reports all-zeros, suspect the reader's schema assumption before concluding the feature is dead.
