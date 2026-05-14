# Dispatcher Capacity Audit

Generated: 2026-05-14T00:37:47.625Z
Ceiling: 200 actions/dispatcher (source: adaptive)
Source: 2026-04-19T03:20:39.562Z (age 25d ⚠ STALE)

## Totals

- Dispatchers: **89**
- Actions: **5641**
- Mean ratio: **0.317**
- p95 ratio: **1.215**
- Max ratio: **5.565**

## Status counts

- 🔴 critical (≥100%): **6**
- 🟡 warn (≥80%): **1**
- 🟢 ok (<80%): **82**

## Flagged dispatchers (≥80%)

| Status | Dispatcher | Actions | Ratio |
|---|---|---:|---:|
| 🔴 critical | calcDispatcher | 1113 | 556.5% |
| 🔴 critical | camDispatcher | 789 | 394.5% |
| 🔴 critical | ppDispatcher | 652 | 326.0% |
| 🔴 critical | aiReasoningDispatcher | 470 | 235.0% |
| 🔴 critical | edmDispatcher | 243 | 121.5% |
| 🔴 critical | dataDispatcher | 201 | 100.5% |
| 🟡 warn | turningDispatcher | 185 | 92.5% |

## Top 10 by ratio

| Rank | Dispatcher | Actions | Ratio | Status |
|---:|---|---:|---:|---|
| 1 | calcDispatcher | 1113 | 556.5% | critical |
| 2 | camDispatcher | 789 | 394.5% | critical |
| 3 | ppDispatcher | 652 | 326.0% | critical |
| 4 | aiReasoningDispatcher | 470 | 235.0% | critical |
| 5 | edmDispatcher | 243 | 121.5% | critical |
| 6 | dataDispatcher | 201 | 100.5% | critical |
| 7 | turningDispatcher | 185 | 92.5% | warn |
| 8 | machineSetupDispatcher | 156 | 78.0% | ok |
| 9 | devDispatcher | 143 | 71.5% | ok |
| 10 | intelligenceDispatcher | 131 | 65.5% | ok |

## Notes

- AGGREGATE source is STALE — 25 days old (> 7d threshold); regenerate via dispatcher-health builder

---
Source: CLEANUP-MS0 / U-CLEANUP-F7 build-dispatcher-capacity.mjs
