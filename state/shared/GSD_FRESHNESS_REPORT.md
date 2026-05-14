# GSD Freshness Audit

Generated: 2026-05-14T01:16:37.410Z
Stale threshold: 90 days

## Totals

- GSD docs scanned: **17**
- Drift findings: **18**

## Severity counts

- 🔴 P0 (major count drift): **4**
- 🟠 P1 (stale mtime / minor drift): **14**
- 🟡 P2: **0**

## Count cross-check

| Category | GSD_QUICK | Inventory | Δ |
|---|---:|---:|---:|
| actions | 6346 | 7468 | 1122 |
| dispatchers | 95 | 97 | 2 |
| engines | 3018 | 3233 | 215 |
| hooks | 357 | 54 | -303 |
| scripts | 244 | 657 | 413 |
| skills | 503 | n/a | n/a |

## Findings

| Sev | Kind | File/Category | Observation |
|---|---|---|---|
| P0 | count_drift | actions | actions: GSD_QUICK claims 6346, inventory observes 7468 (Δ 1122) |
| P0 | count_drift | engines | engines: GSD_QUICK claims 3018, inventory observes 3233 (Δ 215) |
| P0 | count_drift | hooks | hooks: GSD_QUICK claims 357, inventory observes 54 (Δ -303) |
| P0 | count_drift | scripts | scripts: GSD_QUICK claims 244, inventory observes 657 (Δ 413) |
| P1 | count_drift | dispatchers | dispatchers: GSD_QUICK claims 95, inventory observes 97 (Δ 2) |
| P1 | stale_mtime | sections/buffer.md | mtime is 92d old (> 90d threshold) |
| P1 | stale_mtime | sections/d1.md | mtime is 93d old (> 90d threshold) |
| P1 | stale_mtime | sections/d2.md | mtime is 93d old (> 90d threshold) |
| P1 | stale_mtime | sections/d3.md | mtime is 93d old (> 90d threshold) |
| P1 | stale_mtime | sections/d4.md | mtime is 93d old (> 90d threshold) |
| P1 | stale_mtime | sections/end.md | mtime is 92d old (> 90d threshold) |
| P1 | stale_mtime | sections/equation.md | mtime is 92d old (> 90d threshold) |
| P1 | stale_mtime | sections/evidence.md | mtime is 92d old (> 90d threshold) |
| P1 | stale_mtime | sections/gates.md | mtime is 92d old (> 90d threshold) |
| P1 | stale_mtime | sections/laws.md | mtime is 92d old (> 90d threshold) |
| P1 | stale_mtime | sections/manus.md | mtime is 92d old (> 90d threshold) |
| P1 | stale_mtime | sections/start.md | mtime is 92d old (> 90d threshold) |
| P1 | stale_mtime | sections/workflow.md | mtime is 92d old (> 90d threshold) |

## File age extremes

- Oldest: `sections/d1.md` (2026-02-10T13:09:40.000Z)
- Newest: `GSD_MICRO.md` (2026-04-28T02:48:32.214Z)

---
Source: CLEANUP-MS0 / U-CLEANUP-H5 gsd-freshness-scan.mjs
