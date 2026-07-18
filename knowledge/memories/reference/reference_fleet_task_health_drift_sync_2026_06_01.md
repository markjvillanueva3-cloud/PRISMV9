---
name: reference_fleet_task_health_drift_sync_2026_06_01
description: fleet-task-health-watch missing-registration net had drifted blind — discoverInstallerTasks watched only 12/39 real PRISM scheduled tasks. 3-stage fix (regex → glob+content-gate) caught by per-file scrutiny arm B over 2 rounds. Complete-by-construction. Commit 213a1da6f8.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.577Z
aliases: reference_fleet_task_health_drift_sync_2026_06_01
---


2026-06-01 (slot:bravo). Fixing the Hermes-readiness audit's blocker 1 (Zulu orchestrator dark, invisible
to the safety net) surfaced a much larger latent regression in `scripts/fleet-task-health-watch.mjs`:
**`discoverInstallerTasks` watched only 12 of 39 real registered `PRISM *` scheduled tasks.** The E2E
drift test (`detectInstallerDrift(discovered, KNOWN_PRISM_TASKS).hasDrift===false`) had been RED, meaning
27 real safety-net tasks were silently unwatched by missing-registration detection — the exact failure
class U-FTH-FOLLOWUP-SELF-DISC exists to kill, reproduced inside the very mechanism meant to prevent it.

**3-stage fix (each stage a deeper green-but-blind layer caught by the per-file scrutiny gate):**
1. **9 typed-param installers had no KNOWN entry** → drift test RED. Added them → 21 KNOWN.
2. **scrutiny arm B round 1:** the discovery REGEX itself (`/\[string\]\s*\$TaskName\s*=/`, first-match-only)
   was blind to bare `$TaskName` / `$GuardTaskName` declarations + multi-task installers → missed 8 more
   (Blueprint OCR Batch, Cost Alarm, MCP Connectivity Monitor, 3× SFC Variability, System Awareness
   Freshness, System-Viz Re-walk Daily). Broadened regex + `matchAll` → 29.
3. **scrutiny arm B round 2:** the FILE GLOB (`/^install-.*-task\.ps1$/`, singular) skipped `-tasks.ps1`
   / `-cron.ps1` / `register-*.ps1` registrars, AND the spec-key `Name = 'PRISM …'` style (consumed via
   `-TaskName $Spec.Name`) was uncaptured → missed 10 more (Combo Efficiency ×2, Wiki Link Healer ×2,
   PDF Corpus Watcher, Slot Bindings ×3, Tribal Consolidate, Tribal Promotion). → 39.

**Final design = complete-by-construction:** broad glob `/^(install|register)-.*\.ps1$/i` + a
**`Register-ScheduledTask` content gate** (only mine files that actually register tasks — makes glob width
harmless, kills phantom risk) + **3 capture forms** (`$*TaskName=` / `-TaskName 'lit'` / spec-key `Name=`),
all anchored on the `PRISM ` prefix so `$desc`/comment mentions (e.g. desc-only "PRISM Weekly Synthesis")
are excluded. Verified: discovered 39 == KNOWN 39 == hand-enumerated ground-truth 39 (33 registrar files),
`hasDrift:false`. `ensure-all-watchdogs.ps1` correctly excluded (orchestrator, not a registrar). No 4th
syntax / computed name exists in the corpus. 8 new regression tests, 52/52 pass.

**Also:** `PRISM Zulu Orchestrator` added to `CRASH_CRITICAL_TASKS` (audit blocker 1). Safe — the
`≥2-degraded → critical` rule means it can't solo-critical, and `PRISM_ZULU_DISABLE` is a runtime env
no-op that leaves the task Registered (won't masquerade as degraded). MCP Server / Watchdog crash-critical
promotion deliberately DEFERRED (separate threshold review; KNOWN-only for now) — tracked follow-up.

**LESSON (the load-bearing one):** a discovery/audit tool's own KNOWN list synced to its own (blind)
discovery output is *self-referentially green* — the drift test passes while both sides share the blind
spot. The fix is not "add the missing names" (treats symptoms) but "make discovery complete by construction"
(content-gate + broad glob + verify discovered == independent ground-truth). A green test over a blind
oracle is the silent-blindness failure one level up. See [[feedback_verify_actual_contract_not_proxy]].

Commit `213a1da6f8`. Surfaced from [[reference_hermes_control_readiness_nogo_2026_06_01]] blocker 1.
Wiki: [[fleet-task-health-discovery-drift]]. Sibling unit: U-HERMES-ASSIGN-FAILLOUD (`ca38013a4f`).
