---
name: reference_fh02_stale_reaper_observability_current_2026_06_17
description: "U-FH02 (\"restore 3 missing fleet-reaper observability files\") is STALE — reaper observability is fully live today under evolved names; do not build the runs/confirm/pressure trio."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.573Z
aliases: reference_fh02_stale_reaper_observability_current_2026_06_17
---


Golf queue unit **U-FH02** (from SLOT-RECOVERY-MS0 / thread 25, ~2026-05-25) asked to "restore 3 missing
fleet-reaper observability files: `fleet-reaper-runs.jsonl`, `fleet-reaper-confirm.json`,
`fleet-reaper-pressure.jsonl`." **VERIFIED STALE/SUPERSEDED 2026-06-17 (slot:golf)** — those exact names
exist NOWHERE in the codebase (0 grep hits in `.claude` + `scripts`). The reaper has FULL live observability
today under evolved/better names:

- **"runs"** → `state/shared/.fleet-reaper-actions.jsonl` (`DEFAULT_AUDIT_LOG_PATH`, fleet-reaper-sweep.mjs:184).
  Quiet (7 lines, mtime 2026-05-18) because the reaper has reaped ~0 legit orphans since — NOT broken.
- **"confirm"** → `state/shared/fleet-reaper-candidates.json` ledger (`DEFAULT_LEDGER_PATH`, :175) — the
  `firstSeenAt` confirm-after-N-ticks state IS persisted (it's a ledger, not a `*-confirm.json`).
- **crash observability** → `state/shared/chat-crash-postmortems.jsonl` (891 lines, mtime today 15:23, ACTIVE)
  + `.janitor-kills.jsonl` (34,653 lines, today 15:24, ACTIVE).
- **"pressure"** → reaper COMPUTES `readMemPressure` each tick but does not persist a pressure-history file;
  pressure-TREND observability already lives in the separate **Fleet Memory Monitor** task (graph nodes
  `memory-pressure-sample` / `memory-pressure-trend`). Adding it to the reaper would DUPLICATE (DuplicationGuard).

Conclusion: there is NO genuine reaper-observability gap. Do not build U-FH02's 3 files — it would create
redundant orphans. Mark the queue unit retired-stale. This is the R13 task-freshness / MILESTONE-drift pattern:
a 23-day-old queue description whose premise the live system already outgrew. → [[feedback_task_freshness_pre_build]]

The one REAL adjacent golf bug is owed #5: `fleet-reaper-crash-watch.mjs::detectCrashes` declares a "crash" on
frozen-heartbeat(>=10min)+unchanged-chatId ALONE (no window/process-liveness) — so idle-but-alive chats get
false postmortem rows (that 891-line file is mostly false positives). Fix needs the sweep reordered so process
enumeration precedes crash-watch (inject livePidSet into detectCrashes). Risky live-infra → dedicated unit.
→ [[reference_crashwatch_idle_false_positive_2026_06_17]]
