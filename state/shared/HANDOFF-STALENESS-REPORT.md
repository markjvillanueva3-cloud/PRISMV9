# HANDOFF-STALENESS-REPORT

Generated: 05/14/2026 15:20:23
Stale threshold: 4 h
Re-run: `H:\prism\scripts\system-health\10-stale-handoff-sweep.ps1`

## Handoffs (399 total)

- live-owner:  2
- historical:  346
- unkeyed:     51
- DEAD-OWNER:  0

## Stale milestone claims (7 scanned)

- fresh:                1
- STALE:                6
- unreadable:           0
- no parseable heartbeat: 0

### Stale claims (release-eligible)

| milestone | chatId | host | heartbeat age (h) |
|---|---|---|---:|
| COST-CASCADE-MS0 | `claude-eebcfc92` | DESKTOP-N7MI1VB | 64.1 |
| HOOK-MANIFEST-DAG-MS26 | `claude-fe6af473` | DESKTOP-N7MI1VB | 63.9 |
| HOOKS-AUTOMATION-V2-MS0 | `claude-3cbd7681` | DESKTOP-N7MI1VB | 64.1 |
| INFRA-CONSENSUS-WIRE-MS0 | `claude-dccbe876` | MarkV | 44.4 |
| INFRA-NEURAL-LEDGER-MS1 | `claude-88901d4c` | DESKTOP-N7MI1VB | 41.6 |
| SKILLS-UTILIZATION-MS0 | `claude-d402b194` | DESKTOP-N7MI1VB | 63.1 |

**Recommended action:** run `.claude/scripts/reap-stale-claims.mjs --apply` to release these (this audit is read-only)

---

This audit is READ-ONLY. Milestone-claim release is owned by
`.claude/scripts/reap-stale-claims.mjs` (dry-run by default, `--apply` to act).
Handoffs are context and are never moved or deleted.
