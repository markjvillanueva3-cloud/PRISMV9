---
title: Fleet-task-health discovery drift — a green test over a blind oracle
type: lesson
domain: dev-infra
created: 2026-06-01
by: claude-5e210e4e
unit: U-HERMES-FTH-DRIFT-SYNC
commit: 213a1da6f8
tags: [watchdog, silent-blindness, R12, scrutiny-gate, scheduled-tasks, self-referential-test]
---

# Fleet-task-health discovery drift

## What broke
`scripts/fleet-task-health-watch.mjs` audits Windows `PRISM *` scheduled tasks. Its
missing-registration alert checks `KNOWN_PRISM_TASKS` against what's actually registered.
On 2026-06-01 it watched only **12 of 39** real registered tasks — **27 safety-net tasks were
silently unwatched**, and the E2E drift test (`detectInstallerDrift(...).hasDrift===false`) had
been RED. Surfaced while fixing the Hermes-readiness audit's blocker 1 (the Zulu orchestrator,
dark ~2 days, was invisible to the net).

## Root cause — a discovery oracle blind in two dimensions
`discoverInstallerTasks` (the "source of truth" that `KNOWN_PRISM_TASKS` is synced against) was
blind along two axes simultaneously:
1. **Regex** `/\[string\]\s*\$TaskName\s*=/` (first-match-only) saw only typed-param-default
   declarations — missed bare `$TaskName`, alt-named `$GuardTaskName`/`$MillTaskName`, and any
   2nd/3rd task in a multi-task installer.
2. **File glob** `/^install-.*-task\.ps1$/` (singular) skipped `-tasks.ps1`, `-cron.ps1`, and
   `register-*.ps1` registrars; and the spec-array `Name = 'PRISM …'` declaration style
   (consumed via `-TaskName $Spec.Name`) was uncaptured by any form.

## The deeper lesson
**A KNOWN list synced to its own blind discovery output is self-referentially green.** The drift
test passed because *both sides shared the same blind spot* — it could catch a new installer
shipping without a KNOWN update, but never a task that NO discovery syntax captured. A green test
over a blind oracle is the silent-blindness failure (R12) reproduced one level up. This recurred
across **three** scrutiny rounds — each fix exposed the next-deeper blind layer — which is the
signature of treating symptoms (add the missing names) instead of the cause (make discovery
complete).

## The fix — complete by construction
Stop enumerating syntaxes defensively; instead make discovery provably total:
- **Broad glob** `/^(install|register)-.*\.ps1$/i` (any registrar filename).
- **Content gate:** only mine a file for task names if its body contains `Register-ScheduledTask`
  — this makes the glob's width *harmless* (a non-registrar can never inject a phantom) and is the
  key that ends the recursion.
- **3 capture forms** (`$*TaskName=` / `-TaskName 'lit'` / spec-key `Name=`), anchored on the
  `PRISM ` prefix so `$desc`/comment mentions are excluded.
- **Verify against independent ground truth:** discovered (39) == hand-enumerated registrars (39)
  == KNOWN (39), `hasDrift:false`. Not "the test is green" — "the discovered set equals a set I
  derived a different way."

## How it was caught
The per-file scrutiny gate (2 reviewers/file). Arm A passed each round; **arm B caught both the
regex blind spot (round 1) and the glob+spec-key blind spot (round 2)** by independently grepping
the real installer corpus rather than trusting the green test. Round 3 confirmed closure via a
full ground-truth diff. Lesson for reviewers: when a test asserts "no drift," re-derive the
oracle's input set yourself — don't trust the tool's own discovery.

## Related
- Memory: [[reference_fleet_task_health_drift_sync_2026_06_01]]
- Origin: [[reference_hermes_control_readiness_nogo_2026_06_01]] (blocker 1)
- Sibling fail-loud fix: U-HERMES-ASSIGN-FAILLOUD (`ca38013a4f`)
- Doctrine: [[feedback_verify_actual_contract_not_proxy]], [[feedback_always_update_wiki_on_bug_finding]]
- Prior art: `fleet-task-health-ms0`, U-FTH-FOLLOWUP-SELF-DISC (the original discoverInstallerTasks unit)
