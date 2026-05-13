# Coordination Store Health

> Generated: 2026-05-13T23:32:11.817Z
> Source: `scripts/coord-db-sentinel.mjs`
> DB     : `H:/prism/state/shared/coordination.db` (40960 bytes, mtime 2026-05-13T12:44:39.456Z)
> JSON   : `H:/prism/state/shared/WORK_CLAIMS.json` (count=1, schemaVersion=2)

## Integrity

- `PRAGMA integrity_check`: ok
- `PRAGMA quick_check`    : ok

## Row counts

| Table | DB rows | OK |
|-------|--------:|:--:|
| claims | 1 | ✓ |
| presence | 0 | ✓ |
| meta | 1 | ✓ |

## Divergence (db.claims vs WORK_CLAIMS.json.claims)

- DB claims rows : **1**
- JSON claims    : **1**
- Absolute Δ     : 0
- Divergence %   : 0.00%

## Alerts

_None — coordination state is healthy._

> Advisory only — divergence flags state mismatch but does not auto-reconcile.