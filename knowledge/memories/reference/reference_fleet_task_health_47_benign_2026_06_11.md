---
name: reference_fleet_task_health_47_benign_2026_06_11
description: 2026-06-11 the fleet-task-health Stop WARN "47/53 healthy ... degraded reaper/monitor -> crashes un-prevented" was BENIGN. aggregateHealth sets level=warn on ANY single degraded task; the only degraded was Blueprint OCR Batch (stale 5.7d, an OCR batch NOT a reaper). 5 expectedDisabled + 2 expectedUnregistered are intentional. missing=0 -> no reaper down. The alarming message overstates a stale non-load-bearing batch.
type: reference
galaxy: fleet-hygiene
source: prism-memory
synced: 2026-06-27T20:30:46.577Z
aliases: reference_fleet_task_health_47_benign_2026_06_11
---


# fleet-task-health "47/53 healthy" WARN = benign (2026-06-11, slot:golf)

The Stop advisory fired `WARN -- 47/53 healthy ... A degraded reaper/monitor task means crashes go un-prevented` repeatedly. Investigated (golf domain). Verdict: BENIGN, no reaper/monitor down.

## What the 47/53 actually was (`node scripts/fleet-task-health-watch.mjs --json` -> `.row`)
- `degraded` (1): **PRISM Blueprint OCR Batch** -- status `stale`, but **ONE-SHOT BY DESIGN** (verified by reading `.claude/helpers/install-blueprint-ocr-batch-task.ps1`: "register a ONE-SHOT task that runs the overnight OCR batch WHILE THE CHAT FLEET IS DOWN... fires once at -At, then left registered; re-run -RunNow to repeat"). Trigger is `-Once` start 2026-05-31 22:13 + PT30M repetition for PT12H window with StopAtDurationEnd=True -> empty NextRunTime is CORRECT (the 12h overnight window elapsed; LastResult=0x0 success). It is an OCR BATCH job (NOT a reaper/monitor). It is healthy + idle-by-design, awaiting the operator's next manual re-trigger on a fleet-down night.
- **DO NOT "fix" it by re-arming it recurring (e.g. -Daily / indefinite PT30M).** That would run GPU-heavy OCR every 30min DURING active fleet operation -- the exact saturation its "while the fleet is down" one-shot design avoids. An R8 read of the installer caught this before a wrong re-registration.
- `missing` (0): none. **No reaper/monitor is missing or failing.**
- `expectedUnregistered` (2): Vault Memory Promotion Cron, Vault Rot Sentinel Cron -- intentional (installers shipped, not registered).
- `expectedDisabled` (5): Hermes-Obsidian Bridge, Slot Worktree Migration Status, Tribal Consolidate Weekly, Zebra Orchestrator, Zombie Reaper v2 -- intentional pauses.
- The 52->47 "healthy" drop across the session = 5 tasks moving into `expectedDisabled` (intentional), NOT failures.

## Why the WARN is technically-correct-but-cry-wolf
`aggregateHealth` (scripts/fleet-task-health-watch.mjs:955): `level="warn"` when `degraded.length>0 || missing.length>0`. `degraded` = any task not healthy/pressure and not expectedDisabled (:930). A `stale` status counts as degraded. So a single benign stale non-load-bearing batch (Blueprint OCR) escalates the WHOLE fleet to `warn` + emits the generic "degraded reaper/monitor -> crashes un-prevented" advisory -- even though the degraded task is neither a reaper nor a monitor and `missing=0`.

## Why NOT fixed this session (drift discipline + risk)
The fix (make `stale` on a NON-load-bearing, non-safety-net task informational like `pressure`/`expectedDisabled`, so only degraded mustExist/crashCritical/missing escalate to warn) partially reverses the prior **U-FTH-CRIT-CLASSIFY** deliberate choice ("any single degradation is warn", :29). That is a separate, risk-bearing fleet-task-health unit needing care + a test + sign-off -- NOT a casual change mid an unrelated skills+hooks /goal. Flagged here for a future dedicated golf pass.

**Why:** stops the next chat re-investigating the recurring "47/53" WARN + records that no reaper is actually down (operator "reapers running" concern satisfied). **How to apply:** treat the "47/53 ... degraded reaper/monitor" WARN as benign UNLESS `missing>0` or a load-bearing/crash-critical task is in `degraded`. Future fix candidate: soften `stale`-on-non-load-bearing to informational. Related: [[reference_reaper_safety_audit_complete_2026_06_11]], [[reference_fleet_task_health_ms0_2026_05_17]].
