---
name: reference_post_ship_fleet-hygiene-u-golf-heal-verify-leg
description: Auto-distilled learnings from shipping FLEET-HYGIENE/U-GOLF-HEAL-VERIFY-LEG (commit 74a925911). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.853Z
aliases: reference_post_ship_fleet-hygiene-u-golf-heal-verify-leg
---


# FLEET-HYGIENE/U-GOLF-HEAL-VERIFY-LEG

[MAIN-FORCE] [FLEET-HYGIENE]/U-GOLF-HEAL-VERIFY-LEG (slot:golf): verify G10 auto-re-enables actually TOOK (ENABLED != RAN). fleet-task-health reported a task 'healed' the instant Enable-ScheduledTask returned OK -- but an enabled task can still never fire (stalled trigger), fire-and-fail, or be re-disabled (flapping); the Stop advisory said 'verify next audit' but nothing verified. New leg reads the reenable-ledger's prior ok:true heals + compares each to the task's CURRENT LastRunTime: ran-after-heal=effective, never-ran-past-grace=INEFFECTIVE (surfaced so the operator fixes the root cause / re-registers elevated instead of trusting a false 'healed' + the guard blindly re-enabling forever). Pure+read-only+fail-soft, NEVER mutates/re-kicks (golf-soul, R12 backstop BEFORE a destructive rekick). 4 pure fns + healVerify in runOnce telemetry row -> buildAdvisory consumer; rotation-robust (reads .1 gen). 25/25 tests (happy+>=3 failure+>=2 adversarial+E2E through runOnce) + live-validated + 2-arm scrutiny PASS. NOTE: watchdog suite 91/92 -- the 1 fail (test #69 installer-drift) is PRE-EXISTING + unrelated (KNOWN_PRISM_TASKS/discoverInstallerTasks untouched); needs owner-informed catalog sync.

**Shipped:** 2026-06-20T21:26:43-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[fleet-hygiene-u-golf-heal-verify-leg]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._