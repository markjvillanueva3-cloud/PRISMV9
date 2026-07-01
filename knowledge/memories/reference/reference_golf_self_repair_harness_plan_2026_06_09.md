---
name: reference_golf_self_repair_harness_plan_2026_06_09
description: "Golf self-repair-harness plan (from ultracode Workflow golf-self-repair-harness-assess, driven by 3 operator articles). 7-unit dependency-ordered plan to extend golf's fleet-hygiene from 'alert' to 'auto-repair after the trace lands'. #1 unit U-GOLF-CRASH-POSTMORTEM-DIGEST SHIPPED (closes the chat-crash dead-end + adds the flapping-task signal). Remaining: owner-map, heal-verify-leg, rekick-stale-critical, docker-autoheal, guardian-unify, percadence-stale-band."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.599Z
aliases: reference_golf_self_repair_harness_plan_2026_06_09
---


**2026-06-09 (slot golf, /loop).** Operator supplied 3 agentic-architecture articles (see [[reference_agentic_harness_articles_2026_06_09]]) + "use ultracode and ollama for assessment, planning and implementing via loops." Ran ultracode Workflow `golf-self-repair-harness-assess` (wf_96da29fa-09d, 4 agents/784K tokens, 3 article-lens assessors grounded in real golf code at file:line + 1 synthesis).

**4 CONVERGENT THEMES (>=2 lenses agreed = real signal):**
- **A — G10 self-heal covers only `disabled`;** the same-class-safe `stale`/`trigger-stalled`/`stopped-container` repairs are left to a human/model (`selectReenableTargets` matches `status==="disabled"` only; `docker-service-health-stop` `--fix` is operator-invoked).
- **B — guardian + G10 are redundant/divergent enable-loops** (R7): `golf-slot-reaper-guardian.mjs:87` hard-codes `TASK_NAME="PRISM Fleet Reaper"` (set-of-one) while G10 covers the full 7-task `CRASH_CRITICAL_TASKS`.
- **C — repair is never VERIFIED + outcome telemetry dead-ends:** `autoReenable` records "Enable succeeded" not "task RAN" (a heal can be a quiet lie); `chat-crash-postmortems.jsonl` + the history JSONLs have ZERO readers.
- **D — deterministic routing/derivation done by a MODEL every audit (R5):** no `TASK_OWNER_DOMAIN` map (Claude re-derives "Blueprint OCR Batch is xray-domain" each audit); `KNOWN_PRISM_TASKS` hand-curated though `discoverInstallerTasks` enumerates the truth; single global `staleMultiplier` cry-wolfs daily tasks.

**7-UNIT DEPENDENCY-ORDERED PLAN (observation/non-destructive first, destructive heals on the proven foundation, R13):**
1. **U-GOLF-CRASH-POSTMORTEM-DIGEST** [S] **SHIPPED** (commit this session) -- read the dead-end crash JSONL + new re-enable ledger -> top crashers + pressure correlation + FLAPPING flag. Read-only. [[reference_golf_g6_ollama_health_arm_2026_06_09]] sibling. Details below.
2. **U-GOLF-TASK-OWNER-MAP** [S] -- static `TASK_OWNER_DOMAIN` map; route the WARN `to:<ownerSlot>` deterministically (Theme D). Ollama: 1.5b seeds the map, Claude owns it.
3. **U-GOLF-HEAL-VERIFY-LEG** [S-M] -- after a heal, check `LastRunTime > healedAt`; "healed" -> "heal-INEFFECTIVE" if the task didn't actually run (Theme C, R12). Pure observation; backstop for the destructive heals.
4. **U-GOLF-REKICK-STALE-CRITICAL** [M] -- extend G10 with `selectRekickTargets` (stale/trigger-stalled crash-critical -> `Start-ScheduledTask`, cooldown-gated, never while Running) (Theme A). **DESTRUCTIVE -> Claude owns the mutation.** Rides on unit 3 as its verify backstop.
5. **U-GOLF-DOCKER-AUTOHEAL-ARM** [S-M] -- golf scheduled-task arm auto `docker start <realName>` for the stopped/renamed class ONLY (executor already exists in docker-service-health-check.mjs); `absent`+launcher + Docker DAEMON stay advisory (soul: NEVER restart the daemon). Knob `PRISM_DOCKER_AUTOHEAL_DISABLE=1`. Qdrant down 3x = the recurring outage this closes.
6. **U-GOLF-GUARDIAN-UNIFY** [M] -- collapse the guardian's set-of-one enable arm to delegate to shared `selectReenableTargets`+`reenableTasks` (Theme B, R7 superset-wins).
7. **U-GOLF-PERCADENCE-STALE-BAND** [S] -- per-cadence stale multiplier (tight sub-hourly, loose daily+) keyed off intervalMs; advisory-severity only (Theme D inverse, cry-wolf reduction).
*(Deferred/speculative: self-test cron, Ollama-hint auto-tune, KNOWN-list auto-derivation -- lower urgency.)*

**Unit 1 detail (SHIPPED):** `scripts/crash-postmortem-digest.mjs` (pure core + IO; reads chat-crash-postmortems.jsonl + .1 rotated + fleet-task-reenable-ledger.jsonl; --json/--text/--days/--write; fail-loud size guard, honest window/heuristic caveats). `fleet-task-health-watch.mjs` += `buildReenableLedgerRows` (pure, exported) + `appendReenableLedger` (exported, fail-soft, rotated) writing one row per G10 heal attempt {schemaVersion,ts,task,ok,by} gated in the !dryRun block. LIVE: 1799 crash rows -> delta x250/lima x247 top crashers; seeded-ledger E2E surfaced flapping. digest 8/8 + watch +4 producer tests (89/90, the 1 is pre-existing detectInstallerDrift #69). 2-agent per-file scrutiny PASS, then a FAIL (producer test-coverage P1) -> fixed via pure-fn extraction -> re-dispatch PASS+PASS; a raw-NUL-in-test-source (reviewer-B catch, offset 51626) fixed + verified 0. **Insight surfaced:** the crash-watch detector may over-count idle-but-alive slots (1799 "crashes" mostly normal-pressure) -- a follow-up for the detector, faithfully reported by the digest. FOLLOW-UP (R12, not claimed done): weekly cron trigger needs elevated install-*-task.ps1 or a Stop-hook wire.

Relates to [[reference_golf_g10_autoreenable_guard_2026_06_09]] (the G10 guard this extends), [[reference_golf_queue_completion_plan_2026_06_09]], [[reference_agentic_harness_articles_2026_06_09]].
