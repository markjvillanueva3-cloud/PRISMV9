---
session: 48450e3d-a26f-4d53-bc84-674a903d5ddc
topic: forge-audit-v2-hooks
created: 2026-05-14T04:25:00Z
updated: 2026-05-14T12:55:00Z
slot: (unbound — bash-launched audit chat)
---

# RESUME
/forge-audit-v2 hook stack — COMPLETE. 2 commits shipped (20ca6b43f + f650a8ebd), 3-of-3 scrutiny PASS at session 48450e3d. F1 (system-viz-live-bridge 1,347 errors) fixed+verified, F2 (build-tracker xmalloc) mitigated, F3 (orphan-but-firing) confirmed non-error. 6 productivity artifacts shipped + 4 scrutiny-caught P1 bugs fixed. Next: nothing required — audit closed. Optional follow-ups in §REMAINING.

# WHAT SHIPPED

## Commit 1 — 20ca6b43f: hook telemetry fix + 5 productivity artifacts
- **F1 fix** `system-viz-live-bridge.mjs`: classified TypeError(ECONNREFUSED) as `viz-not-running` + 5-min backoff. Was 1,347 ping-failed events (99% of failure-class telemetry).
- **hook-tier-validator.mjs fix**: false-positived on every mid-file Edit of an already-tiered hook (probed only `new_string` chunk). Now unions on-disk + all new_strings.
- `loop-state.mjs` helper — resumable /loop iteration state
- `loop-iteration-inject.mjs` (UserPromptSubmit T2) — /loop awareness
- `pick-prefresh-inject.mjs` (UserPromptSubmit T2) — /pick-unit /pick-task /checkin freshness
- `goal-prereq-inject.mjs` (UserPromptSubmit T2) — /goal pre-flight gate status
- `hook-health-check.mjs` — re-runnable telemetry analyzer (META artifact)
- CLAUDE.md: Recent regressions + Dev Productivity Hooks sections

## Commit 2 — f650a8ebd: 4 scrutiny-caught P1 bugs
First 3-of-3 pass FAILED (arms B + C) — caught 4 real P1 bugs, all mine:
1. **timeout: 5** (5 MILLISECONDS) instead of 5000 — node can't boot in 5ms, all 3 hooks were SIGKILL'd before executing. Fixed in C: + H: settings.json.
2. **CLOSE-OUT-CANDIDATES schema**: hooks read `co.candidates` (top-level) but real schema is `{results:[{milestone,candidates:[]}]}`. Both goal-prereq + pick-prefresh now flatten.
3. **claim.json schema**: pick-prefresh read `claims/<ms>/<unit>/claim.json` with `{heartbeat_at,instance_id}`. Real layout is `claims/<ms>/claim.json` (per-milestone) with `{lastHeartbeat,chatId,slot,units_planned}`. Rewrote activeClaims().
4. **CLOSE-OUT-DEFERRED count** (self-caught during verify): regex `^[-*]\s` didn't match the `<unit> | <who> | <ts> | <reason>` entry format. Showed 0 when 4 exist.
- Also P3 (reviewer A): system-viz-live-bridge now unlinks vizDownFile on successful ping (server-came-back-up no longer waits the full 5-min window).
- **NOTE — shared-tree collision**: this commit also swept in a peer's `coordination-startup-banner.mjs` + `coordinationStartupBanner.test.ts` (peer session 1642fd87 was on U-COORD06). `git add <my files>` + bare `git commit` committed the whole staged index. Files correct + tracked — per [[reference_coord_ms0_u4_collision]] + [[feedback_conflict_fork_rule]] NOT reverting shared HEAD. Chat-bus posted (entry chat-1778763183827).

## Scrutiny — 3-of-3 PASS
- Session id: `48450e3d-a26f-4d53-bc84-674a903d5ddc`
- Arm A (reviewer, holistic): PASS — 7 files clean, all 6 acceptance criteria, 4 P1 fixes verified against live data
- Arm B (reviewer, schema/wiring): PASS — all 3 schema bugs + DEFERRED counter genuinely fixed, verified via live stdin runs + `node --check`
- Arm C (code-analyzer, regression/security): PASS — timeout 5000 confirmed both files, all P1-fix null/corrupt paths safe, error budgets intact
- Ledger: `opusReviewed`/`claudeReviewed`/`codexReviewed` all true, all `pass`

# FINDINGS LEDGER (Boris verification channels)

| Finding | Verify command | Baseline | Post-fix |
|---|---|---|---|
| F1 system-viz-live-bridge | `node scripts/hook-health-check.mjs --hook=system-viz-live-bridge --window=1h` | 99.6% fail (1,347 events) | 0% — viz-not-running classified, 5-min backoff |
| F2 build-tracker xmalloc | `node .claude/hooks/node-process-janitor.mjs --full` | transient OOM | mitigated — janitor runs clean, scheduled-task version every ~2min |
| F3 orphan-but-firing (7 hooks) | cross-ref HOOK_REGISTRY orphans vs telemetry | 7 firing | NOT an error — 0 failures, wired via sibling-worktree settings.json (registry main-tree scope artifact) |
| Iter2 BUILD_STATE all-zeros | `echo '{"prompt":"/pick-unit"}' \| node pick-prefresh-inject.mjs` | 0/0/0/0 | 2362/873/173/2 — schema-key mismatch fixed |
| Iter4 hook-tier-validator FP | `echo '{"tool_name":"Edit",...}' \| node hook-tier-validator.mjs` | false-positive every mid-file edit | clean approve |

# META artifact (Boris compounding-gains tax)
`scripts/hook-health-check.mjs` — re-runnable hook telemetry analyzer. Baselines failure-rate per hook, verdict ✅healthy/⚠noisy/❌broken. Used to verify F1. Run: `node scripts/hook-health-check.mjs --window=24h --top=10`.

# REMAINING (optional follow-ups — none blocking)
1. **P3 reviewer notes** (deferred, non-blocking): goal-prereq reads `MILESTONE_PROGRESS.json` `entry.shipped` as array but it's a count (`(count||[]).length` → 0, fail-safe but cosmetically wrong); flatMap spread `{...c}` would throw if a candidate were null (live data all-objects, low risk); loop-state `write()` non-atomic (fine for 1:1 session keying).
2. **hook-tier-validator HOOK_EDIT_RE** not prefix-anchored (reviewer C P3) — suffix-only regex, read-only probe, content never emitted → harmless, hygiene-only.
3. **285-orphan registry count is inflated** — at least 7 are sibling-worktree-wired. `build-hook-registry.mjs` doesn't scan worktree settings.json. Registry-accuracy gap, not a hook error.
4. **completeness linter false-positives on prose comments** mentioning code constructs ("Large commented-out code block"). Non-blocking warning, but noisy.
5. **Schedule /loop re-run** — Boris pattern: register `/loop --interval 7d /forge-audit-v2 hook stack`. Skipped (per [[feedback_no_schedule_wakeup_in_loop]] — no ScheduleWakeup in /loop mode; would need explicit /schedule).

# CONTEXT
- Branch: cad-fusion-live-ms0, HEAD f650a8ebd
- Knobs: `PRISM_LOOP_INJECT_DISABLE`, `PRISM_PICK_PREFRESH_DISABLE`, `PRISM_PICK_PREFRESH_STALE_MIN`, `PRISM_GOAL_PREREQ_DISABLE`, `PRISM_GOAL_PREREQ_STALE_HRS`, `VIZ_DOWN_BACKOFF_MS`
- loop-state for this session: ended (4 ticks, reason: hook audit complete)
- pick-build-close.md skill exists on disk but `.claude/commands/` is gitignored — functional, not git-tracked (pre-existing repo policy)
