# Hook Utilization Audit

Generated: 2026-05-14T00:53:57.389Z
Window: 30 days
Telemetry: ABSENT (latency=0, async=0)

## Totals

- Hooks in registry: **470**
- Wired: **178**

## Issue counts

- 🔴 orphan_file (registered, wired:false): **292**
- 🟠 dormant_30d (wired, 0 fires in window): **0**
- 🟡 tier_mismatch (T0, fired but never blocked): **0**
- ⚪ missing_tier (no tier frontmatter): **1**
- ⚪ missing_event (wired but events:[]): **0**
- ⚫ no_telemetry (wired, no firing data): **178**

## Orphan files (wired:false)

> 292 hook file(s) registered in HOOK_REGISTRY but not invoked from any settings.json layer.
> Top 25 shown (sorted by id).

| Hook | File | Tier |
|---|---|---|
| _envelope | .claude/hooks/_envelope.mjs | T3 |
| agent-registry-load | .claude/hooks/agent-registry-load.mjs | T4 |
| agent-util-log | .claude/hooks/agent-util-log.mjs | T4 |
| aggressive-killer-stop | .claude/hooks/aggressive-killer-stop.mjs | T4 |
| agi-safety-envelope-guard | .claude/hooks/agi-safety-envelope-guard.mjs | T0 |
| ai-auto-command-router | .claude/hooks/ai-auto-command-router.mjs | T4 |
| ai-duplication-guard | .claude/hooks/ai-duplication-guard.mjs | T0 |
| ai-feature-recommend | .claude/hooks/ai-feature-recommend.mjs | T2 |
| ai-session-sync | .claude/hooks/ai-session-sync.mjs | T4 |
| ai-system-activate | .claude/hooks/ai-system-activate.mjs | T4 |
| allow-superseding | .claude/hooks/allow-superseding.mjs | T0 |
| anti-regression-auto-sweep | .claude/hooks/anti-regression-auto-sweep.mjs | T3 |
| appdata-junction-guard | .claude/hooks/appdata-junction-guard.mjs | T4 |
| async-pattern-checker | .claude/hooks/async-pattern-checker.mjs | T1 |
| auto-bug-hunt-after-build | .claude/hooks/auto-bug-hunt-after-build.mjs | T3 |
| auto-fork-executor | .claude/hooks/auto-fork-executor.mjs | T0 |
| auto-learn-budget-guard | .claude/hooks/auto-learn-budget-guard.mjs | T1 |
| auto-postmortem-on-failure-restart | .claude/hooks/auto-postmortem-on-failure-restart.mjs | T4 |
| auto-precompact-watchdog | .claude/hooks/auto-precompact-watchdog.mjs | T4 |
| auto-record-tool-call | .claude/hooks/auto-record-tool-call.mjs | T3 |
| autonomous-loop-watchdog | .claude/hooks/autonomous-loop-watchdog.mjs | T0 |
| awareness-bootstrap | .claude/hooks/awareness-bootstrap.mjs | T4 |
| awareness-snapshot | .claude/hooks/awareness-snapshot.mjs | T4 |
| awareness-snapshot-inject | .claude/hooks/awareness-snapshot-inject.mjs | T2 |
| bash-orphan-cleaner | .claude/hooks/bash-orphan-cleaner.mjs | T4 |

## Dormant hooks (no firings in 30d)

_telemetry absent — dormant detection skipped_

## Tier mismatch (T0 claimed, never blocked)

_telemetry absent — tier-mismatch detection skipped_

## Notes

- no hook-latency / async-hook-results telemetry present — dormant detection skipped; orphan + tier-frontmatter signals are valid

---
Source: CLEANUP-MS0 / U-CLEANUP-H3 hook-orphan-scan.mjs
