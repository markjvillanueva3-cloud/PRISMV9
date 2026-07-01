---
source: project
section: FAILURE RECOVERY PROTOCOL
slug: failure-recovery-protocol
indexed_at: 2026-04-30T17:01:39.562Z
---

## FAILURE RECOVERY PROTOCOL

**Retry budget:** 3 attempts per root-cause signature. Capture every failure via `prism_guard:error_capture` on first occurrence — do not retry blind.

**Escalation ladder:**
1. **Attempt 1 fails** → `prism_guard:pattern_scan`; if known, apply `prism_dev:error_remediation` documented fix.
2. **Attempt 2 fails** → `superpowers:systematic-debugging`; binary-search history (`git bisect`); re-derive expected values for test failures.
3. **Attempt 3 fails** → STOP. Dispatch agent: `build-doctor` (compile/type/runtime), `regression-hunter` (test/behavior), or both in parallel.
4. **Agents return blocked** → log to `prism_guard:failure_library`, post blocker to `state/shared/AGENT_CHAT.md`, ask user with: error signature, retry log, attempted fixes, hypothesis.

**Never** to bypass a block: weaken tests, soften hooks, inline constants, bypass duplication guard, `--no-verify`. These are debt, not fixes.

**Workaround test:** acceptable iff (a) root cause logged in `failure_library` with tracked fix unit, (b) tagged `// WORKAROUND: <fail-id>` in code, AND (c) does NOT weaken safety gate, test, physics constant, or duplication guard. Any (a)/(b)/(c) failure = technical debt.

**Forward-progress rule:** blocked on unit N → do NOT start unit N+1. Resolve or formally abort N first.
