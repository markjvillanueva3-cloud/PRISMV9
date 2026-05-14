# CLAUDE.md Drift Detector

Generated: 2026-05-14T01:08:36.109Z
Sources: `project:H:\prism\CLAUDE.md`, `user:C:\Users\wompu\.claude\CLAUDE.md`

## Summary

- Claims analyzed: **109**
- Drift findings: **9**
- Drift rate: **8.3%**

## Severity counts

- 🔴 P0 (load-bearing claim wrong): **7**
- 🟠 P1 (claim partially wrong): **2**
- 🟡 P2 (cosmetic / line drift): **0**

## Kind counts

| Kind | Count |
|---|---:|
| file-path | 7 |
| env-knob | 2 |

## Findings

| Sev | Kind | Source | Line | Claim | Observation |
|---|---|---|---:|---|---|
| P0 | file-path | project | 107 | `.claude/settings.js` | missing |
| P0 | file-path | project | 115 | `H:/prism/.claude/hooks/foo.mjs` | missing |
| P0 | file-path | project | 115 | `state/shared/hook-latency.json` | missing |
| P0 | file-path | project | 123 | `state/shared/async-hook-queue.json` | missing |
| P0 | file-path | project | 123 | `state/shared/async-hook-results.json` | missing |
| P0 | file-path | project | 300 | `state/shared/goal-gate-bypasses.json` | missing |
| P0 | file-path | project | 396 | `.claude/cache/ollama-rate-limit.js` | missing |
| P1 | env-knob | project | 58 | `PRISM_SCRUTINY_GIT_TIMEOUT_MS` | not_found |
| P1 | env-knob | project | 58 | `PRISM_SCRUTINY_NO_DIFF_FILTER` | not_found |

---
Source: CLEANUP-MS0 / U-CLEANUP-H4 claude-md-drift.mjs
