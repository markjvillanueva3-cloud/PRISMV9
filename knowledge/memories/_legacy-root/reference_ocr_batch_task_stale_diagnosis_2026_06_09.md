---
name: ""
source: prism-memory
synced: 2026-06-27T20:30:46.667Z
aliases: reference_ocr_batch_task_stale_diagnosis_2026_06_09
---


2026-06-09 (slot:india, diagnosing the recurring fleet-task-health "PRISM Blueprint OCR Batch=stale" WARN that fired every Stop). NOT a watchdog false alarm and NOT code-fixable without operator elevation -- here is the definitive root cause so nobody re-investigates the trigger internals.

**The live task is mis-registered vs its own installer.**
- `Get-ScheduledTask "PRISM Blueprint OCR Batch"`: State=Ready, LastTaskResult=0 (last run 2026-06-06 06:33 SUCCEEDED), **NextRunTime=EMPTY**, and a trigger with **Repetition Interval=PT30M, Duration=PT12H** from a fixed past StartBoundary (2026-05-31).
- The current installer `.claude/helpers/install-blueprint-ocr-batch-task.ps1` registers a **`-Once` one-shot** task (no repetition): docstring "fires once at -At, then left registered (re-run -RunNow or re-install to repeat). The batch itself is RESUMABLE (SHA-256 checkpoint) so subsequent nights continue." Principal `NT AUTHORITY\SYSTEM`, RunLevel Highest.
- So the LIVE task carries a stale 30-min/12h-window repetition from an OLDER installer version. A finite PT12H duration off a fixed StartBoundary means the repetition window CLOSED long ago -> NextRunTime went null -> it will never fire again on that trigger.

**Why the watchdog (`fleet-task-health-watch.mjs`) correctly flags it.** `classifyTask` reads each task's OWN trigger interval (not hardcoded). The live task advertises a 30-min repetition; `smallestIntervalMs` returns 30min; lastRun was ~5565min ago >> 90min (30min x staleMult 3) -> `stale` (the `trigger-stalled` branch is skipped because it gates on `Number.isFinite(nextRunTimeMs)` and NextRun is null). This is the watchdog doing its job: a registered task that claims to repeat but is dead. The recurring WARN is correct + persistent until fixed.

**THE FIX (owner xray / operator -- needs an ELEVATED shell, Register-ScheduledTask + SYSTEM principal cannot be done unprivileged):**
`powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-blueprint-ocr-batch-task.ps1 -At "01:00" -TimeBudgetMin 420` (add `-RunNow` to also kick it). This re-registers it as a clean ONE-SHOT. A one-shot task has NO repetition interval, so `smallestIntervalMs` returns null and `classifyTask` EXEMPTS it from the staleness check (line ~645-647 + 834) -- the WARN clears automatically. **DESIGN NOTE for xray:** OCR Batch is intentionally on-demand/one-shot (manual nightly kick-off, resumable). If it should instead run automatically every night, that is a DIFFERENT change (a proper daily trigger, not a 12h-capped repetition off a fixed start) -- decide which, then register accordingly.

**Optional watchdog precision improvement (golf, non-blocking):** `classifyTask`'s `trigger-stalled` branch gates on `Number.isFinite(nextRunTimeMs)` so it misses the `nextRunTimeMs === null` case (repetition fully ENDED, not just frozen-in-past). Handling null NextRun on a has-repetition/already-ran task would yield the more actionable "trigger ended, re-register" reason instead of the vaguer "ran 5565min ago". Same severity (still degraded), better operator action. Related: `U-FTH-WIKI-LESSON` cry-wolf->marker discipline, [[fleet-task-health-discovery-drift]]. Owner map: TASK_OWNER_DOMAIN already routes this to `xray`.

**RESOLVED 2026-06-11 (slot:xray, session 18e0074d).** The fix command above was run IN-SESSION and SUCCEEDED (exit 0) — re-registered the task as a clean one-shot: `Repetition.Interval` now empty, `NextRunTime` = next 01:00. Watchdog re-audit: Blueprint OCR Batch is now EXEMPT (one-shot), aggregate `level:'clean'`, the recurring every-Stop WARN cleared. **CORRECTION to this note's earlier claim that it "cannot be done unprivileged": the installer registered the SYSTEM-principal task successfully from a normal session here.** Do NOT assume this WARN class is operator-gated — RUN the installer first (`install-blueprint-ocr-batch-task.ps1 -At "01:00" -TimeBudgetMin 420`), it is idempotent and fail-loud; only escalate to the operator if it actually returns Access Denied. (verify-before-relying — [[feedback_xray_verify_engine_name_before_reference]] sibling.)
