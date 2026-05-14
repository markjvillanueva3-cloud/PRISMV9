# Skill Utilization Audit

Generated: 2026-05-14T00:47:21.634Z
Window: 30 days

## Totals

- Total skills: **501**
- On disk: **501**
- Missing from disk: **0**
- Telemetry available (invocation_count_30d != null): **0**

## Status counts

- 🟢 active (telemetry≥1): **0**
- 🟡 unknown_recent (no telemetry, activity≤30d): **485**
- 🟠 unknown_stale (no telemetry, activity>30d): **16**
- 🔴 stale_30d (telemetry==0): **0**
- ⚫ no_path (registry has no resolvable file): **0**

## By tier

| Tier | Total | Proposed Archive | Active |
|---|---:|---:|---:|
| plugin | 83 | 16 | 0 |
| project | 2 | 0 | 0 |
| user | 416 | 0 | 0 |

## Proposed archive candidates (advisory — Mark promotes manually)

> Triggers an HS-06 mitigation: each archived skill cuts ~50-200 token re-inject per UserPromptSubmit.

| Skill | Tier | Last activity | Age (days) | Source | Status |
|---|---|---|---:|---|---|
| superpowers:brainstorming | plugin | 2026-03-31T21:54:54.529Z | 43 | mtime | unknown_stale |
| superpowers:dispatching-parallel-agents | plugin | 2026-03-31T21:54:54.533Z | 43 | mtime | unknown_stale |
| superpowers:executing-plans | plugin | 2026-03-31T21:54:54.533Z | 43 | mtime | unknown_stale |
| superpowers:finishing-a-development-branch | plugin | 2026-03-31T21:54:54.534Z | 43 | mtime | unknown_stale |
| superpowers:receiving-code-review | plugin | 2026-03-31T21:54:54.534Z | 43 | mtime | unknown_stale |
| superpowers:requesting-code-review | plugin | 2026-03-31T21:54:54.535Z | 43 | mtime | unknown_stale |
| superpowers:subagent-driven-development | plugin | 2026-03-31T21:54:54.536Z | 43 | mtime | unknown_stale |
| superpowers:systematic-debugging | plugin | 2026-03-31T21:54:54.538Z | 43 | mtime | unknown_stale |
| superpowers:test-driven-development | plugin | 2026-03-31T21:54:54.542Z | 43 | mtime | unknown_stale |
| superpowers:using-git-worktrees | plugin | 2026-03-31T21:54:54.543Z | 43 | mtime | unknown_stale |
| superpowers:using-superpowers | plugin | 2026-03-31T21:54:54.543Z | 43 | mtime | unknown_stale |
| superpowers:verification-before-completion | plugin | 2026-03-31T21:54:54.545Z | 43 | mtime | unknown_stale |
| superpowers:writing-plans | plugin | 2026-03-31T21:54:54.545Z | 43 | mtime | unknown_stale |
| superpowers:writing-skills | plugin | 2026-03-31T21:54:54.547Z | 43 | mtime | unknown_stale |
| claude-code-setup:claude-automation-recommender | plugin | 2026-04-02T13:49:00.905Z | 41 | mtime | unknown_stale |
| claude-md-management:claude-md-improver | plugin | 2026-04-02T13:49:00.922Z | 41 | mtime | unknown_stale |

## Top 10 active skills (telemetry)

_no telemetry-active skills_

## Lint signal

- Lint problems: **n/a**

## Notes

- invocation_count_30d is null for every skill — proposed archives derive from mtime/last_refined proxy only; treat as advisory until U-SKU04 lands real telemetry

---
Source: CLEANUP-MS0 / U-CLEANUP-H2 skill-utilization-scan.mjs
