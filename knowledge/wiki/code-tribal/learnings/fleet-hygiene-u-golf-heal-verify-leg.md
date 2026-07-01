# FLEET-HYGIENE/U-GOLF-HEAL-VERIFY-LEG — [MAIN-FORCE] [FLEET-HYGIENE]/U-GOLF-HEAL-VERIFY-LEG (slot:golf): verify G10 auto-re-enables actually TOOK (ENABLED != RAN). fleet-task-health reported a task 'healed' the instant Enable-ScheduledTask returned OK -- but an enabled task can still never fire (stalled trigger), fire-and-fail, or be re-disabled (flapping); the Stop advisory said 'verify next audit' but nothing verified. New leg reads the reenable-ledger's prior ok:true heals + compares each to the task's CURRENT LastRunTime: ran-after-heal=effective, never-ran-past-grace=INEFFECTIVE (surfaced so the operator fixes the root cause / re-registers elevated instead of trusting a false 'healed' + the guard blindly re-enabling forever). Pure+read-only+fail-soft, NEVER mutates/re-kicks (golf-soul, R12 backstop BEFORE a destructive rekick). 4 pure fns + healVerify in runOnce telemetry row -> buildAdvisory consumer; rotation-robust (reads .1 gen). 25/25 tests (happy+>=3 failure+>=2 adversarial+E2E through runOnce) + live-validated + 2-arm scrutiny PASS. NOTE: watchdog suite 91/92 -- the 1 fail (test #69 installer-drift) is PRE-EXISTING + unrelated (KNOWN_PRISM_TASKS/discoverInstallerTasks untouched); needs owner-informed catalog sync.

**Commit:** `74a9259112e7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T21:26:43-05:00
**Tags:** fleet-hygiene, u-golf-heal-verify-leg, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-GOLF-HEAL-VERIFY-LEG (slot:golf): verify G10 auto-re-enables actually TOOK (ENABLED != RAN). fleet-task-health reported a task 'healed' the instant Enable-ScheduledTask returned OK -- but an enabled task can still never fire (stalled trigger), fire-and-fail, or be re-disabled (flapping); the Stop advisory said 'verify next audit' but nothing verified. New leg reads the reenable-ledger's prior ok:true heals + compares each to the task's CURRENT LastRunTime: ran-after-heal=effective, never-ran-past-grace=INEFFECTIVE (surfaced so the operator fixes the root cause / re-registers elevated instead of trusting a false 'healed' + the guard blindly re-enabling forever). Pure+read-only+fail-soft, NEVER mutates/re-kicks (golf-soul, R12 backstop BEFORE a destructive rekick). 4 pure fns + healVerify in runOnce telemetry row -> buildAdvisory consumer; rotation-robust (reads .1 gen). 25/25 tests (happy+>=3 failure+>=2 adversarial+E2E through runOnce) + live-validated + 2-arm scrutiny PASS. NOTE: watchdog suite 91/92 -- the 1 fail (test #69 installer-drift) is PRE-EXISTING + unrelated (KNOWN_PRISM_TASKS/discoverInstallerTasks untouched); needs owner-informed catalog sync.

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-GOLF-HEAL-VERIFY-LEG (slot:golf): verify G10 auto-re-enables actually TOOK (ENABLED != RAN). fleet-task-health reported a task 'healed' the instant Enable-ScheduledTask returned OK -- but an enabled task can still never fire (stalled trigger), fire-and-fail, or be re-disabled (flapping); the Stop advisory said 'verify next audit' but nothing verified. New leg reads the reenable-ledger's prior ok:true heals + compares each to the task's CURRENT LastRunTime: ran-after-heal=effective, never-ran-past-grace=INEFFECTIVE (surfaced so the operator fixes the root cause / re-registers elevated instead of trusting a false 'healed' + the guard blindly re-enabling forever). Pure+read-only+fail-soft, NEVER mutates/re-kicks (golf-soul, R12 backstop BEFORE a destructive rekick). 4 pure fns + healVerify in runOnce telemetry row -> buildAdvisory consumer; rotation-robust (reads .1 gen). 25/25 tests (happy+>=3 failure+>=2 adversarial+E2E through runOnce) + live-validated + 2-arm scrutiny PASS. NOTE: watchdog suite 91/92 -- the 1 fail (test #69 installer-drift) is PRE-EXISTING + unrelated (KNOWN_PRISM_TASKS/discoverInstallerTasks untouched); needs owner-informed catalog sync.
```

## Files touched (4)
- .claude/hooks/fleet-task-health-stop.mjs                 |  25 ++++++++++-
- scripts/__tests__/fleet-task-health-heal-verify.test.mjs | 281 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/fleet-task-health-watch.mjs                      | 209 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 3 files changed, 512 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till never fire (stalled trigger), fire-and-fail, or be re-disabled (flapping); the Stop advisory said 'verify next audit' but nothing verified. New leg reads the reenable-ledger's prior ok:true heals + compares each to the task's CURRENT LastRunTime: ran-after-heal=effective, never-ran-past-grace=INEFFECTIVE (surfaced so the operator fixes the root cause / re-registers elevated instead of trusting a
- NOTE: watchdog suite 91/92 -- the 1 fail (test #69 installer-drift) is PRE-EXISTING + unrelated (KNOWN_PRISM_TASKS/discoverInstallerTasks untouched); needs owner-informed catalog sync.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 74a9259112e7`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._