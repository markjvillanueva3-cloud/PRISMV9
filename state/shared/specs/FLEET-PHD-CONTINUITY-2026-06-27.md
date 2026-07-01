# FLEET-PHD-BUILDOUT — NO-DOWNTIME CONTINUITY DESIGN
**Author:** zulu (fleet orchestrator) · **Date:** 2026-06-27 · **Status:** design → buildable this session
**Anti-duplication-first.** Every section below answers: *does this already exist?* before proposing anything new. The deliverable is ONE small read-mostly driver + an operator `.ps1`; everything else is REUSE.

---

## 0. TL;DR

The fleet already has a deep, layered continuity harness (94 scheduled tasks, 3 durable CronCreate loops, 8 engineered loop-scripts, 8+ continuity hooks, the loop-state backbone). It keeps the **mechanics** alive (chats resume, loops continue, brain refreshes, processes get reaped). What it does **not** have is a **campaign-progress driver** that knows the 16 DOMAIN-PLAN deepening targets exist, measures each domain's progress against its §3 engineered-loop spec + §acceptance signal, and flags a domain that has **stalled** (plan SPEC-ONLY / cron dead / artifact stale / no commits). That single gap is what causes a domain to silently sit at "draft" while the operator assumes it is deepening.

**Verdict: EXTEND, do not rebuild.** No PHD/campaign/continuity driver exists (verified: `scripts/` has zero `*continu*`/`*campaign*`/`*phd*`/`*stall*` campaign drivers; the closest analogue, `zulu-build-loop.mjs`, tracks a single markdown C1–CN ledger, NOT the 16-plan campaign). The new asset is a thin **observer** that sits ON TOP of the existing harness and reads it — it actuates nothing destructive, fires no new Windows task without operator elevation, and reuses `loop-state.mjs`, `fleet-work-digest.mjs`, `slot-query.mjs`, `fleet-task-health-watch.mjs`, and the 16 plan files directly.

---

## 1. EXISTING CONTINUITY MAP (reuse — do NOT rebuild)

### 1a. Windows Scheduled Tasks (durable, survive reboot) — 94 total, 86 healthy
The substrate that keeps services + engineered loops alive with **zero Claude tokens** (node/ps1 run directly, per R5). Continuity-load-bearing subset:

| Task | Cadence | Keeps alive |
|---|---|---|
| PRISM MCP Server (+ Watchdog, Connectivity Monitor, Priority Guardian, Singleton Guard) | service | :3100 HTTP bridge — every dispatcher call |
| PRISM Ollama Serve (+ CPU Throttle, Embed Keepalive, Wedge Guard) | service | :11434 — all local-LLM offload (mining, synthesis) |
| PRISM Hermes Proxy (+ Cron Prewarm) | service | :8645 xAI proxy — octopus/dream/GEPA |
| PRISM Fleet Reaper | 5 min | orphan/zombie claude.exe reaping across 26 slots |
| PRISM Zombie Reaper v2 | 5 min | secondary zombie reaping |
| PRISM Zulu Orchestrator | 5 min (+420s phase) | per-slot /clear-or-/compact SendKeys (context hygiene) |
| PRISM Zulu Build Loop | 15 min | zulu autonomous build campaign |
| PRISM Fleet Memory Monitor | 5 min (+330s) | names WHICH chat to /compact under RAM pressure |
| PRISM Fleet Task Health | sched | **watchdog-over-watchdogs** — audits all 94 PRISM tasks (this is the live-health oracle the new driver reads) |
| PRISM Brain Refresh | 45 min (30 min internal cooldown) | 8-pipeline brain: mem-index, mem-embed, galaxy-synthesis, wiki→tribal, vault sentinels |
| PRISM Tribal Embed | 30 min | tribal vector index (PSN leg #5) |
| PRISM Galaxy Mine (×12: mill/lathe/cam/quoting/speed-feed/ai-training/wiring/blueprint-vision/academy/business/backend-helper) | daily staggered 06:00–11:00 | per-galaxy transcript mining → tribal/wiki |
| PRISM Galaxy Knowledge Iterate | 3 hr | per-galaxy knowledge iteration |
| PRISM Galaxy Synthesis Refresh | sched | 34-galaxy synthesis |
| PRISM NN-Graph Retrain | 6 hr | GraphSAGE GNN tier-5 self-retrain (india) |
| PRISM SFC Variability Batch (Mill + Lathe), SFC Closed Loop, SFC Overnight Fresh Train | nightly/running | speed-feed deepening (oscar) |
| PRISM Quoting Pipeline | daily 03:00 | quoting OODA calibration (charlie) |
| PRISM Blueprint OCR Batch / OCR Training Loop | sched/blocked | OCR closed-loop (xray) |
| PRISM CAM Tool Library Regen | daily 03:17 | CAM tool libs (kilo) |
| PRISM System-Viz Re-walk Daily | daily 08:15 | regenerate 548MB system-graph.json (the fleet search substrate) |
| PRISM Tmp Sweep / Conhost Janitor / WSL Memory Guard / Node Orphan Cleaner / Hook Janitor | 5–15 min | resource hygiene (prevents the ~16GB tmp leak + console-window storm) |

### 1b. Durable CronCreate prompt-loops (`.claude/scheduled_tasks.json`) — 3 active
These inject **Claude prompts** on a cron schedule (the only token-spending loops; everything else is tokenless):

| ID | Cron | Drives |
|---|---|---|
| `dcdc0189` | `13,43 * * * *` (every 30 min) | whiskey/Kienzle-Lathe overnight build loop (reads handoff+master-plan → builds next U-W unit → commits → ticks loop-state) |
| `4d82ef66` | `13 22-6 * * *` (nightly hourly) | delta CAD-completion overnight loop (ticks loop-state → advances one CAD unit, no-merge/no-GPU) |
| `4efdf85a` | `23 8 * * *` (daily 08:23) | delta CAD-completion **status refresh** (reconcile → CAD-COMPLETION-STATUS, no build) |

### 1c. Engineered loop-scripts (cron-driven, self-pacing) — reuse as-is
`zulu-orchestrator-sweep.mjs` (5 min `--once`), `mine-galaxy-transcripts.mjs` (registry-driven 34-galaxy miner), `nn-graph-retrain-lifecycle.mjs` (6h + drift-skip), `quoting-train-cycle.mjs` (tsx self-reexec), `blueprint-ocr-training-loop.mjs` (resumable cursor), `brain-refresh.mjs` (45m/30m cooldown, 8 pipelines), `galaxy-synthesis-refresh.mjs` (hash-diff AMP2), `weekly-memory-synthesis.mjs` (weekly Mon).

### 1d. Continuity hooks (session/loop survival) — reuse as-is
- **WIRED:** `session-start-auto-resume.mjs` (T0, resumes on compact/clear via per-chat handoff, 12h max age), `session-start-terminal-pin.mjs` (T1, re-binds slot to window), `precompact-auto-trigger.mjs` (T0, SOFT 880K nudge / HARD 940K block → guarantees handoff before context loss), `precompact-handoff.mjs` (writes the resume), `stop-goal-clear-advance.mjs` (Stop, auto-advances to next queued unit when loop iter≥target), `loop-iteration-inject.mjs`/`stop-reblock-storm-breaker.mjs` (T0, kills re-block storms), `fleet-work-digest-inject.mjs`+`-stop.mjs` (cross-fleet awareness ~320 tok), `ensure-index-daemon-guardian.mjs` (master-index :3101 keepalive).
- **Backbone:** `loop-state.mjs` (start/tick/read/end/next/list/reap; unbounded; `next --resolve-only` = pure dry-run next-action oracle) + `scripts/lib/planning-loop.mjs` (`decidePlanningAction`: continue|rerank|replan|stop).

### 1e. Doctrine (no code) — `CLAUDE.md §NEVER IDLE — ALWAYS HUNT` + `feedback_slots_never_idle_always_hunt.md` (7-rung hunt ladder, model-navigated).

**Net: the harness keeps the FLEET ALIVE. It does not keep the CAMPAIGN moving — nothing measures the 16 deepening plans.**

---

## 2. GAPS (what is genuinely missing for the 16-domain campaign)

### 2a. Per-domain deepening loops that are SPEC-ONLY (prescribed in §3, not yet a live cron)
Per the plan-loop-specs audit, only ~5 of 16 domains have a **confirmed-live** engineered loop. The rest prescribe a nightly mine + weekly synthesis/retrain cron in their plan §3 but have **no registered Windows task** — they run only when a chat happens to `/loop` that slot.

| Domain | §3 loop status | Note |
|---|---|---|
| india | **LIVE** (high conf) | GNN lifecycle gates show real outcomes (AUROC 0.808 selective-deploy) |
| oscar | LIVE partial | SFC variability batches running; 22:30 sweep prescriptive |
| echo | LIVE partial | transcript mining in progress; `post-gen-reward.mjs` nightly = SPEC |
| whiskey | LIVE partial | dcdc0189 cron live; `LatheActualCostReconciliation` weekly = SPEC |
| charlie | LIVE partial | quoting-train-cycle tsx-fixed + live; mining cadence unconfirmed |
| sierra | LIVE partial | dual-reg audit wired; nightly mine + weekly audits = SPEC |
| **delta** | SPEC-ONLY | plan `status: draft`; 2:17 cad loop unverified |
| **foxtrot** | SPEC-ONLY | draft; mill mine ≥120 tips = doc-only |
| **hotel** | SPEC-ONLY | draft; business mine + weekly LoRA = prescriptive |
| **kilo** | SPEC-ONLY | draft; 02:13 cam mine unregistered |
| **lima** | SPEC-ONLY | `status: final` but cron registration unconfirmed |
| **mike** | SPEC-ONLY | draft; wedm mine ≥200 tips unregistered |
| **quebec** | SPEC-ONLY | draft; Playwright weekly aspirational |
| **romeo** | SPEC-ONLY | draft; `audit-unwired-engines` runs but nightly cron unregistered |
| **xray** | **SPEC-ONLY (BLOCKED)** | `PRISM OCR Training Loop` task EXISTS but is NOT firing nightly — blocked on operator PowerShell elevation. The single biggest bottleneck. |
| zulu | LIVE | zulu-build-loop 15min cron |

> NOTE: most galaxy-mining IS covered by the 12 live `PRISM Galaxy Mine` tasks (1a) — so the "nightly mine" half of many SPEC-ONLY plans is already satisfied tokenlessly. The genuinely-missing half is the **domain-specific deepening step** (post-gen-reward, cost-reconcile, coverage-audit, OCR-train) + the **acceptance-signal measurement**.

### 2b. THE CAMPAIGN-PROGRESS DRIVER (the core gap) — does NOT exist
Nothing reads the 16 plans, measures each domain against its §acceptance signal, and detects a **stalled** domain. "Stalled" = the deepening is not advancing and no human is being told. A domain stalls silently when: (1) plan is still `status: draft` with no recent commits to its galaxy dir, (2) its §3 cron is SPEC-ONLY or its live task went STALE, (3) its output artifact (tribal index, synthesis md, coverage matrix, OCR trainset) is stale beyond its cadence, or (4) its loop-state shows no tick in N hours. **This is the deliverable** (§4).

### 2c. STALE / FAILED existing loops to REPAIR (one-time, this session)
| Loop | State | Repair action |
|---|---|---|
| **PRISM CAD Gen Loop** | **STALE** — last ran 2026-06-26 14:34Z (~28h ago vs 30-min cadence). Task is `Ready` (registered) but the loop exited/errored and nothing re-launched it. | Launcher `scripts/run-cad-gen-loop-overnight.ps1`. Operator action: re-run the launcher OR `Start-ScheduledTask -TaskName "PRISM CAD Gen Loop"`. The new driver will FLAG this automatically (it reads task health) so it surfaces on the dashboard rather than rotting. No code fix — it is a runtime re-kick, captured in the `.ps1` (§4d) `-RekickStale` note. |
| **PRISM OCR Training Loop** (xray) | BLOCKED on elevation | Operator-side: re-register elevated. The driver flags xray as `blocked:elevation` (distinct from `stalled`) so it is not mistaken for fleet inaction. |
| Hooks `stop-force-loop-continue.mjs`, `loop-iteration-inject.mjs`, `pick-prefresh-inject.mjs` | exist on disk, NOT wired in settings.json | OUT OF SCOPE for this turn (settings.json wiring is a separate, higher-risk change). Noted for a follow-up unit. The new driver does not depend on them. |

---

## 3. DEDUP VERDICT

**EXTEND — there is no existing campaign/fleet-continuity driver to extend, so the minimal-new asset is justified, but it is built as a thin READER over existing systems, not a new harness.**

Evidence (audit A6 + verification this session):
- `scripts/` contains **zero** files matching `*continu*`/`*campaign*`/`*phd*`/`*stall*`/`*deepen*` campaign-drivers.
- The 7-rung NEVER-IDLE hunt ladder is **doctrine only** (CLAUDE.md + memory) — "no harness walks rungs 1-7 automatically" (never-idle-infra audit).
- The closest analogue, `zulu-build-loop.mjs` / `zulu-build-queue.mjs`, tracks a **single markdown `## SHIPPED / ## REMAINING` C1–CN ledger** for the zulu slot's own build — NOT the 16-plan multi-domain campaign. It is per-slot, not fleet-campaign-aware. Forking it would duplicate the parse logic AND miss the plan/acceptance-signal/task-health joins. **Do not extend zulu-build-queue.**
- `fleet-work-digest.mjs` is the closest **read-mostly fleet aggregator** but it only joins chat-slots + 24h commits → a 35-line activity digest. It has no concept of plans, acceptance signals, or stalls.

**Conclusion:** build ONE new read-mostly observer (`scripts/fleet-phd-continuity.mjs`) that **composes** `fleet-work-digest.mjs` (slot activity + commits), `slot-query.mjs` (per-slot binding/claims/handoffs), `loop-state.mjs` (loop ticks), `fleet-task-health-watch.mjs --json` (live task health), and the 16 plan files. It is an aggregator, not a harness — it actuates nothing, so it cannot duplicate or conflict with any existing actuator.

---

## 4. DESIGN — `scripts/fleet-phd-continuity.mjs` (minimal new harness)

**Contract:** idempotent, read-mostly, fail-soft per-source, single-writer of its own two output files. Zero process spawns except `fleet-task-health-watch.mjs --json` (read) and `git log` (read, slot-scoped via the existing `gitSubjects` helper). Never SendKeys, never writes a plan, never registers a task.

### 4a. INPUTS it reads (all existing)
1. **The 16 plans** — `state/shared/domain-plans/DOMAIN-PLAN-<slot>.md`. Parse YAML frontmatter (`slot`, `galaxy`, `galaxy_dir`, `status`, `backend_dispatchers`) + the `## §3 — Deepening roadmap → PhD master (engineered loop)` section body + the acceptance-signal lines (numeric targets: tribal ≥N, wiki ≥N, coverage ≥X%, AUROC ≥X). Reuse a tiny frontmatter splitter (or `scripts/lib/` yaml helper if one exists; else a 10-line `---`-fence parser — no new dep).
2. **Live task health** — `node scripts/fleet-task-health-watch.mjs --json` (spawn once, parse). Gives per-task status (HEALTHY/STALE/FAILED/DISABLED) + lastRun. Join each plan's named §3 task (e.g. `PRISM SFC Variability Batch Mill`, `PRISM OCR Training Loop`, `PRISM Galaxy Mine (<galaxy>)`) to its health row.
3. **Slot activity + recent commits** — import `buildModel` / `gitSubjects` / `resolveBranch` from `scripts/fleet-work-digest.mjs`. Gives 24h shipped-unit-ids per slot branch + current topic.
4. **Loop ticks** — `loop-state.mjs list` (or read `state/shared/loop-state/loop-*.json`) → last tick time per slot's active loop.
5. **Per-domain output artifacts** (stat only, no read of body) — stat the artifact each plan §acceptance names: tribal index (`state/shared/tribal-embed-index.json` or manifest), `<galaxy>_synthesis.md` under the vault, `CAD_COVERAGE_MATRIX.json` (delta), OCR `trainset.jsonl` (xray), `NN-EVAL.json` (india), `AWARENESS.md` (oscar). `fs.stat` mtime → freshness vs the plan's stated cadence.
6. **Durable crons** — `.claude/scheduled_tasks.json` → map any CronCreate job whose prompt names a slot to that domain (whiskey=dcdc0189, delta=4d82ef66/4efdf85a).

### 4b. STALL-DETECTION LOGIC (pure function `classifyDomain(plan, joins)` → status)
Per domain, compute a **status** from this precedence ladder (first match wins):
- `blocked:elevation` — the plan's §3 names a task that exists but requires elevation and is not firing (xray OCR). Distinct from stalled; surfaced to operator, NOT counted as fleet inaction.
- `stalled:cron-dead` — plan §3 names a live task that is **STALE/FAILED** in task-health (e.g. PRISM CAD Gen Loop), OR names a task with **0 registered** match (SPEC-ONLY).
- `stalled:artifact-stale` — the §acceptance output artifact mtime exceeds `2× the plan's stated cadence` (e.g. a "nightly" synthesis md older than 48h).
- `stalled:no-progress` — `status: draft` AND zero commits to `galaxy_dir` in the last 72h (via `gitSubjects` filtered to the galaxy path) AND no loop tick in 24h.
- `advancing` — recent commits to galaxy_dir OR a loop tick in last 24h OR the §3 task is HEALTHY with a fresh artifact.
- `done` — plan `status: final`/`shipped` AND acceptance artifact present + fresh.

Each domain also gets a **`nextAction`** string (the rung-1 directive for that slot): reuse `loop-state.mjs next --resolve-only --slot <slot>` if a loop exists; else synthesize from the plan §3 first un-met step (e.g. "register PRISM Galaxy Mine (cam) nightly" / "re-kick PRISM CAD Gen Loop" / "deepen tribal to ≥120 (now N)"). This makes the dashboard directly actionable — it tells each idle slot exactly what to do (feeds the NEVER-IDLE ladder rung 1/2).

Thresholds are knobs: `PRISM_PHD_STALL_NOPROGRESS_HRS=72`, `PRISM_PHD_STALL_ARTIFACT_MULT=2`, `PRISM_PHD_LOOPTICK_HRS=24`.

### 4c. OUTPUT (single-writer, two files)
- **`state/shared/dashboards/FLEET-PHD-CONTINUITY.json`** — schema-versioned (`schemaVersion: "1.0.0"`), `generatedAt`, `domains[]` (each: slot, galaxy, status, planStatus, §3 task + health, artifact mtimes, 24h shipped ids, lastLoopTick, acceptanceTargets {target, current, met}, nextAction), `summary` {advancing, stalled, blocked, done counts}, `staleLoops[]` (the CAD-Gen-Loop class), `repairs[]` (operator-actionable one-time fixes).
- **`state/shared/dashboards/FLEET-PHD-CONTINUITY.md`** — ~40-line human render (one row per domain + a STALLED/BLOCKED/REPAIRS callout block at top). Token-lean so it can be SessionStart/chat-bus-injected like FLEET-WORK-DIGEST.md.
- **Chat-bus post (advisory, throttled):** on any `stalled:*` transition (compare to prior json), append ONE line per stalled domain to `state/shared/AGENT_CHAT.md` (`[FLEET-PHD] <slot>/<galaxy> STALLED: <reason> → <nextAction>`). Throttle: one post per domain per `PRISM_PHD_CHATBUS_THROTTLE_HRS=6`. Advisory only — never blocks.

Idempotency: re-running with no state change → byte-identical json (except `generatedAt`) and **no** duplicate chat-bus post (the prior-json diff gates it).

### 4d. HOW IT IS DRIVEN CONTINUOUSLY
**Mechanism A — durable CronCreate (token-light, lands THIS session, no elevation):** register one durable job that runs the driver headlessly via Bash (it is a pure node script, no Claude reasoning needed for the read path) — but because CronCreate fires a *Claude prompt*, the prompt is minimal: `"Run: node scripts/fleet-phd-continuity.mjs --json ; if any domain is stalled, action its nextAction for any slot you own, else continue your loop."` Cadence `7,37 * * * *` (every 30 min, off-:00 per scheduler etiquette), durable. This is the fleet-facing nudge — it surfaces stalls into a live chat that can act on rung 1/2 of the hunt ladder.
**Mechanism B — operator-registered Windows task (tokenless, survives reboot):** ship `scripts/install-fleet-phd-continuity-task.ps1` (cloned from `install-zulu-build-loop-cron.ps1` / `install-fleet-reaper-task.ps1` conventions). It registers `PRISM Fleet PhD Continuity` running `node scripts/fleet-phd-continuity.mjs --json` every 30 min (+phase offset 510s to avoid the 5-min cluster). The operator runs it elevated; **the agent does NOT fire it** (no new Windows task without operator elevation, per the task constraint). The `.ps1` also carries a `-RekickStale` switch documented to `Start-ScheduledTask "PRISM CAD Gen Loop"` (the §2c repair) so the operator fixes both in one elevated invocation.

Mechanism A is enough for the campaign to be continuously OBSERVED + surfaced this session; Mechanism B makes it tokenless + reboot-durable once the operator elevates.

### 4e. REUSED LIBS (named, no fork)
`scripts/fleet-work-digest.mjs` (`buildModel`, `gitSubjects`, `resolveBranch`, `isActiveSlot`) · `scripts/slot-query.mjs` (`bindingForSlot`, `claimsForSlot`, `listHandoffs`, `normalizeSince`) · `.claude/helpers/loop-state.mjs` (`next --resolve-only`, `list`) · `scripts/fleet-task-health-watch.mjs --json` (task health oracle) · `scripts/lib/planning-loop.mjs` (`decidePlanningAction` for the continue/stop call on each domain's loop). Plan parsing = a ~15-line local `---`-fence frontmatter reader (no new dep).

---

## 5. IMPLEMENTATION CHECKLIST (zulu builds this turn — ordered, each testable)

1. **`scripts/lib/phd-plan-parse.mjs`** — pure exported `parsePlan(text)` → `{slot, galaxy, galaxyDir, status, dispatchers, section3, acceptanceTargets[]}`. `acceptanceTargets` extracted by regex over the acceptance line (`/(tribal|wiki|coverage|AUROC|MAPE|reward)\D*([0-9.]+)\s*(%|tips|entries|pairs)?/gi`). **Test:** feed the real `DOMAIN-PLAN-charlie.md` + `-india.md` text → assert slot/galaxy/status parsed and ≥1 numeric target each (R9: a test that fails if the §3 heading or frontmatter shape drifts).
2. **`scripts/lib/phd-stall-classify.mjs`** — pure exported `classifyDomain(plan, joins)` → `{status, reason, nextAction, acceptance[]}` implementing the §4b ladder. No I/O (joins passed in). **Test:** synthetic joins for each branch — STALE-task→`stalled:cron-dead`, stale-artifact→`stalled:artifact-stale`, draft+no-commits→`stalled:no-progress`, fresh-commits→`advancing`, xray-elevation→`blocked:elevation`. ≥3 failure + ≥2 adversarial (e.g. STALE task but fresh commits → still `advancing`; final status but missing artifact → `stalled:artifact-stale` not `done`).
3. **`scripts/fleet-phd-continuity.mjs`** — the orchestrator: glob 16 plans → parse (lib 1) → spawn `fleet-task-health-watch --json` (fail-soft: if it errors, mark task-health `unknown`, never crash) → import `buildModel`/`gitSubjects` from fleet-work-digest → read loop-state list → stat artifacts → classify (lib 2) → write `.json` + `.md` to `state/shared/dashboards/` → diff-vs-prior chat-bus post (throttled). Flags: `--json` (default), `--md-only`, `--dry-run` (no writes, prints model), `--no-chatbus`. `main()`-guard for importability. **Test:** run `--dry-run` against the LIVE 16 plans → assert exit 0, 16 domains in model, summary counts sum to 16, CAD-Gen-Loop surfaced in `staleLoops[]` (live-data validation, R15 step 3).
4. **`scripts/install-fleet-phd-continuity-task.ps1`** — clone `install-zulu-build-loop-cron.ps1` structure; register `PRISM Fleet PhD Continuity` (30 min, +510s phase, `node scripts/fleet-phd-continuity.mjs --json`); add `-RekickStale` switch that `Start-ScheduledTask "PRISM CAD Gen Loop"`. Do NOT run it (operator elevation required). **Test:** `pwsh -NoProfile -Command "& { . ./scripts/install-fleet-phd-continuity-task.ps1 -WhatIf }"` parses + WhatIf-registers without error (no actual task created).
5. **Register the durable CronCreate job** (Mechanism A) — `7,37 * * * *`, durable, prompt = the §4d minimal nudge. This lands the continuous observation THIS session with no elevation.
6. **Live validation + commit** — run `node scripts/fleet-phd-continuity.mjs --json`; confirm `FLEET-PHD-CONTINUITY.{json,md}` written, summary prints `advancing/stalled/blocked/done` counts, CAD-Gen-Loop in repairs, ≥6 SPEC-ONLY domains flagged `stalled:cron-dead`. Run `vitest`/`node --test` on libs 1+2 (all green, no `.skip`). Per-file 2-arm scrutiny on each of the 3 code files; then 3-of-3 Stop gate. Commit `[MAIN-FORCE] [FLEET-PHD-CONTINUITY]/U-PHD-DRIVER (slot:zulu): read-mostly 16-domain campaign-progress driver + operator .ps1`.

**Scope guard:** 2 pure libs + 1 orchestrator + 1 `.ps1` + 1 durable cron registration. No settings.json edits, no new Windows task fired, no plan mutation, no hook wiring (the 3 unwired hooks in §2c are a separate follow-up). Buildable in one session.

---

## 6. FOLLOW-UPS (NOT this session — logged for the campaign)
- Wire `stop-force-loop-continue.mjs` + `loop-iteration-inject.mjs` + `pick-prefresh-inject.mjs` into settings.json (continuity-hooks gap A6 §GAP 1-3) — higher-risk, separate unit.
- Register the SPEC-ONLY domain §3 deepening crons (delta/foxtrot/hotel/kilo/lima/mike/quebec/romeo) as tokenless Windows tasks via per-domain `.ps1` — once the PhD driver confirms which are genuinely un-covered vs already-served by the 12 Galaxy Mine tasks.
- Operator: elevate-register `PRISM OCR Training Loop` (xray unblock) + re-kick `PRISM CAD Gen Loop`.
