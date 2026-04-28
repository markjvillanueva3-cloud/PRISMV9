---
source: gsd_micro
section: Schema Versioning
slug: schema-versioning
indexed_at: 2026-04-28T02:50:03.703Z
---

## Schema Versioning

```
All state JSON requires schemaVersion field.
Migrations: src/migrations/<old>-to-<new>.ts
Backward compat: N-1 versions
Breaking changes: bump major + migration script

State files (gitignored — regenerated):
  UNIFIED_ERROR_LEDGER.jsonl + .index.json
  SCRIPTS_INDEX.json / ENGINES_INDEX.json / ACTIONS_INDEX.json
  SKILLS_INDEX.json
  consolidation-counter.json / consolidated_patterns.json

State files (committed — durable):
  BASELINE_INVENTORY.json    (anti-regression baseline)
  HEALTH_CHECK_REPORT.json   (latest health snapshot)
  cross-session-asset-registry.json
  extraction-log.json
```
