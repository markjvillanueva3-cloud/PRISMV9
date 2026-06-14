# HOOK-BROKER-COMPAT-REPORT

Generated: 2026-05-22T23:11:37.454Z
Schema version: 1.0.0
Total hooks scanned: **602**

## Category breakdown

| Category | Count | % | Broker strategy |
|---|---|---|---|
| `module-safe` | 78 | 13.0% | share in-process |
| `cli-safe-stdin-stdout` | 0 | 0.0% | spawn-cache (warm pipe) |
| `mutates-process` | 372 | 61.8% | spawn-isolate (REQUIRED) |
| `imports-only` | 5 | 0.8% | ignore (header-only) |
| `empty` | 1 | 0.2% | ignore (trivial) |
| `unknown` | 146 | 24.3% | spawn-isolate (default) |

## Broker integration plan

- **Share in-process:** 78 hook(s) → broker dynamic-imports once + reuses across chats.
- **Spawn-cache:** 0 hook(s) → broker keeps a warm subprocess pool + pipes stdin/stdout.
- **Spawn-isolate:** 518 hook(s) → broker spawns per-invocation (no shared state).
- **Ignore:** 6 hook(s) → header-only or empty, broker skips.

## Sample `mutates-process` hooks (first 25)

These hooks MUST be spawn-isolated. Broker design must NOT share their module state.

- `.claude/hooks/active-chat-priority-boost.mjs`
- `.claude/hooks/agent-pid-tracker.mjs`
- `.claude/hooks/agent-util-log.mjs`
- `.claude/hooks/agent-watchdog.mjs`
- `.claude/hooks/agent-worktree-stale-unlock.mjs`
- `.claude/hooks/aggressive-killer-stop.mjs`
- `.claude/hooks/agi-safety-envelope-guard.mjs`
- `.claude/hooks/ai-duplication-guard.mjs`
- `.claude/hooks/ai-session-sync.mjs`
- `.claude/hooks/allow-superseding.mjs`
- `.claude/hooks/alpha-slot-reaper-guardian.mjs`
- `.claude/hooks/always-build-guard.mjs`
- `.claude/hooks/anti-regression-auto-sweep.mjs`
- `.claude/hooks/appdata-junction-guard.mjs`
- `.claude/hooks/archived-skill-suggest.mjs`
- `.claude/hooks/audit-viz-first-inject.mjs`
- `.claude/hooks/auto-bug-hunt-after-build.mjs`
- `.claude/hooks/auto-consensus-critical-edit.mjs`
- `.claude/hooks/auto-consensus-userprompt.mjs`
- `.claude/hooks/auto-fork-executor.mjs`
- `.claude/hooks/auto-learn-budget-guard.mjs`
- `.claude/hooks/auto-lint-post-edit.mjs`
- `.claude/hooks/auto-postmortem-on-failure-restart.mjs`
- `.claude/hooks/auto-precompact-watchdog.mjs`
- `.claude/hooks/auto-record-tool-call.mjs`
- _…and 347 more (truncated; full list in JSON report)_

## Methodology

Classified by `scripts/lib/hook-broker-classifier.mjs`. Mutation detection is conservative — any hit on spawn / fs writes / network anywhere in the source disqualifies a hook from in-process sharing, regardless of whether the mutating call is at module scope or inside an exported async handler. The cost of misclassification is always more isolation, never less.

Source: U-DOCKER-HOOK-BROKER-P1 (Tier-1 prep, Phase-1 survey). Spec: `state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md`.
