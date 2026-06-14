/**
 * fleet-task-health-watch.mjs — durable health watchdog over PRISM's
 * Windows scheduled-task safety net.
 *
 * THE GAP THIS CLOSES. PRISM's crash-prevention safety net is a set of
 * Windows scheduled tasks — `PRISM Fleet Reaper` (orphan-process reaper),
 * `PRISM Fleet Memory Monitor` (per-chat RSS attribution + /compact advisory),
 * `PRISM Cleanup Orchestrator`, `PRISM Node Orphan Cleaner`, `PRISM Orphan
 * Process Reaper (PS)`, `PRISM Zombie Reaper v2`, plus dev-cadence tasks
 * (`PRISM Hook Janitor`, `PRISM Synergy Regression Watch`). Every one runs
 * unattended on a timer. But NOTHING watches whether those tasks are THEMSELVES
 * healthy. Each installer verifies its own task once at registration; the
 * golf-slot reaper guardian re-checks ONLY `PRISM Fleet Reaper`. If any task is
 * disabled by a Windows update, wedges (a hung prior instance + `IgnoreNew`),
 * starts erroring (a nonzero `LastTaskResult` loop), or never runs, the safety
 * net silently degrades — and nobody knows until a chat actually crashes.
 *
 * This watchdog is the monitor OVER the monitors. Each run it:
 *   1. Enumerates every registered `PRISM *` scheduled task via PowerShell
 *      `Get-ScheduledTask` + `Get-ScheduledTaskInfo`.
 *   2. For each task reads State, LastRunTime, LastTaskResult, and the task's
 *      OWN trigger repetition interval (so cadence is never hard-coded — a
 *      5-min task is judged against 5 min, a daily task against a day).
 *   3. Classifies each: healthy | disabled | failing | stale | never-ran |
 *      unknown-state  (pure `classifyTask`).
 *   4. Aggregates against a small hard-coded MUST_EXIST set (the two
 *      load-bearing crash-prevention tasks) + a CRASH_CRITICAL set — a
 *      MUST_EXIST task missing/disabled/failing, or ≥2 crash-critical tasks
 *      degraded, is `critical`; any single degradation is `warn`.
 *   5. Appends a telemetry row to state/shared/fleet-task-health-history.jsonl
 *      (size-rotated).
 *   6. On warn/critical emits ONE cooldowned advisory to AGENT_CHAT.jsonl
 *      naming the degraded tasks + the exact re-install command.
 *
 * It is the prerequisite that makes the rest of the safety net trustworthy:
 * a perfectly-written reaper is worthless if its scheduled task is Disabled.
 *
 * SCOPE — what it watches, and what it deliberately does NOT. It watches
 * whether each task is REGISTERED, ENABLED, and FIRING ON SCHEDULE (missing /
 * disabled / unknown-state / stale / never-ran), plus Windows-level launch
 * failures (Task Scheduler could not run the action at all). It does NOT
 * interpret a script's own small exit code: PRISM monitors deliberately use
 * exit 1/2/3 as FINDINGS (warn / critical / measurement-fail), so a task whose
 * script exits 1 is a HEALTHY task — that finding is the script's own advisory
 * to report, not a task-health failure.
 *
 * Advisory only — it NEVER kills, NEVER auto-registers (registration needs an
 * elevated shell; the watchdog can't elevate). It detects + names the fix.
 *
 * Designed to be wired as a Stop hook (`fleet-task-health-stop.mjs`) so it
 * fires constantly across the 13-chat fleet — near-continuous coverage that
 * does NOT depend on its own scheduled task (avoiding the watch-the-watchman
 * recursion). An optional scheduled task is a belt-and-suspenders add-on.
 *
 * Usage:
 *   node fleet-task-health-watch.mjs                 # one audit, text summary
 *   node fleet-task-health-watch.mjs --once --json   # one audit, JSON
 *   node fleet-task-health-watch.mjs --status        # read ledger, no audit
 *   node fleet-task-health-watch.mjs --history [N]   # tail N telemetry rows
 *   node fleet-task-health-watch.mjs --reset         # clear telemetry + ledger
 *   node fleet-task-health-watch.mjs --no-advisory   # audit + telemetry only
 *   node fleet-task-health-watch.mjs --dry-run       # full audit, never write
 *   node fleet-task-health-watch.mjs --help
 *
 * Env knobs (CLI flags win over env):
 *   PRISM_FLEET_TASKHEALTH_DISABLE=1            watchdog refuses to write/emit
 *   PRISM_FLEET_TASKHEALTH_STALE_MULT=N         stale = interval×N (default 3)
 *   PRISM_FLEET_TASKHEALTH_ADVISORY_COOLDOWN_SEC=N  min s between emits (default 900)
 *   PRISM_FLEET_TASKHEALTH_PS_TIMEOUT_MS=N      PowerShell query timeout (default 15000)
 *
 * Exit codes: 0 clean · 1 warn · 2 critical · 3 measurement/IO failure (R12 fail-loud).
 *
 * Built 2026-05-17, slot=mike, in response to:
 *   "keep an eye on windows tasks and system performance to ensure chats
 *    dont crash. can we build something else for this?"
 *
 * NOT TO BE CONFUSED WITH:
 *   - scripts/fleet-memory-monitor.mjs   — samples system RAM, names /compact target
 *   - scripts/fleet-reaper-sweep.mjs     — kills orphan processes of crashed slots
 *   - golf-slot-reaper-guardian.mjs hook — re-arms ONLY the Fleet Reaper task
 * This watchdog audits the SCHEDULED TASKS themselves — the layer all of the
 * above silently depend on.
 */

import { spawnSync } from "node:child_process";
import {
  appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync,
  statSync, writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Paths & constants ──────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SHARED_DIR = join(REPO_ROOT, "state", "shared");
const TELEMETRY_PATH = join(SHARED_DIR, "fleet-task-health-history.jsonl");
const TELEMETRY_BACKUP = TELEMETRY_PATH + ".1";
const LEDGER_PATH = join(SHARED_DIR, "fleet-task-health-state.json");
const CHAT_BUS_PATH = join(SHARED_DIR, "AGENT_CHAT.jsonl");
// U-GOLF-CRASH-POSTMORTEM-DIGEST: one row per G10 heal attempt; crash-postmortem-
// digest reads this to surface a FLAPPING task (re-enabled >= N/window = something
// re-disables it faster than the guard heals -> the disabler root cause).
const REENABLE_LEDGER_PATH = join(SHARED_DIR, "fleet-task-reenable-ledger.jsonl");
const REENABLE_LEDGER_ROTATE_BYTES = 256 * 1024;
const LOG_ROTATE_BYTES = 512 * 1024;   // 512 KB — weeks of rows at fleet cadence

export const LEDGER_SCHEMA_VERSION = 1;
export const DEFAULT_STALE_MULTIPLIER = 3;        // stale = task interval × 3
export const DEFAULT_ADVISORY_COOLDOWN_SEC = 900; // 15 min between chat-bus emits
export const DEFAULT_PS_TIMEOUT_MS = 15_000;

/**
 * The two load-bearing crash-prevention tasks. If either is missing, disabled,
 * or failing, the audit is `critical` on its own — the fleet has lost a
 * primary safety layer.
 */
export const MUST_EXIST_TASKS = [
  "PRISM Fleet Reaper",
  "PRISM Fleet Memory Monitor",
];

/**
 * The process/memory-hygiene tasks. ≥2 of these degraded simultaneously is
 * `critical` even if neither is a MUST_EXIST task — the net is collapsing.
 */
export const CRASH_CRITICAL_TASKS = [
  "PRISM Fleet Reaper",
  "PRISM Fleet Memory Monitor",
  "PRISM Cleanup Orchestrator",
  "PRISM Node Orphan Cleaner",
  "PRISM WSL Memory Guard",
  "PRISM Zombie Reaper v2",
  "PRISM Zulu Orchestrator",
  // 2026-06-08 MCP-FLEET-CAPACITY-MS0 (slot:sierra): added "PRISM WSL Memory
  // Guard" — charlie's vmmemWSL commit-cap guard (15-min advise-only). Same
  // commit-pressure-relief family as Cleanup Orchestrator + Memory Pressure
  // Auto-Relief; vmmemWSL ballooning to ~96 GB committed was a host-spawn-
  // refusal cause (the same class as the 0x800710E0 false-alarm this watchdog
  // now handles). Crash-critical, NOT MUST_EXIST: the ≥2-degraded rule means it
  // only escalates to `critical` alongside a second degraded crash-critical
  // task, never false-criticals on its own.
  // 2026-06-01 U-HERMES-FTH-DRIFT-SYNC (slot:bravo): added "PRISM Zulu
  // Orchestrator" — the chat-fleet autonomy backbone (zulu-orchestrator-sweep
  // pressure→/compact decisions). Per HERMES-CONTROL-READINESS-2026-06-01 it
  // was dark ~2 days, invisible to this net. Crash-critical (not MUST_EXIST):
  // the ≥2-degraded rule means it can only escalate to `critical` alongside a
  // second degraded crash-critical task — never false-criticals on its own —
  // and `PRISM_ZULU_DISABLE` is a runtime env no-op that leaves the task
  // Registered, so an intentional pause does NOT masquerade as a degraded
  // task here. (MCP Server / MCP Server Watchdog crash-critical promotion is a
  // separate threshold call — deferred to its own review; KNOWN-only for now.)
  // 2026-05-17 U-FTH-FOLLOWUP-SELF-DISC: "PRISM Orphan Process Reaper (PS)"
  // removed — discoverInstallerTasks found no install-*-task.ps1 registering
  // this name (stale entry). If it re-appears as a real installer, restore.
];

/**
 * The full expected PRISM task set as of 2026-05-17. Used ONLY for
 * missing-detection — health-checking is dynamic (any `PRISM *` task the
 * enumeration finds is classified). If a task is renamed, add the new name
 * here; a stale entry surfaces as a (benign, easily-spotted) false "missing".
 *
 * SOURCE OF TRUTH for these three task-name lists is the registration scripts
 * `.claude/helpers/install-*-task.ps1` (install-fleet-reaper-task.ps1,
 * install-fleet-memory-monitor-task.ps1, install-cleanup-orchestrator-task.ps1,
 * install-hook-janitor-task.ps1, install-zombie-reaper-task.ps1, …). Their
 * `-TaskName` default IS the registered name. A rename in any installer MUST
 * be mirrored into MUST_EXIST_TASKS / CRASH_CRITICAL_TASKS / KNOWN_PRISM_TASKS
 * here — otherwise this watchdog false-reports the renamed task as "missing".
 */
export const KNOWN_PRISM_TASKS = [
  "PRISM Blueprint Join Refresh",          // U-FTH-FOLLOWUP-SELF-DISC adds
  "PRISM Blueprint OCR Batch",             // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (regex-blind: bare $TaskName)
  "PRISM Brain Refresh",                   // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
  "PRISM Cleanup Orchestrator",
  "PRISM Combo Efficiency Baseline",       // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -tasks.ps1 + spec-key Name=)
  "PRISM Combo Efficiency Dashboard",      // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -tasks.ps1 + spec-key Name=)
  "PRISM Cost Alarm",                      // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (regex-blind: bare $TaskName)
  "PRISM Fleet Memory Monitor",
  "PRISM Fleet Reaper",
  "PRISM Handoff Prune",                   // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
  "PRISM Hermes Dream-Cycle Synth",        // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
  "PRISM Hermes Self-Reflect Weekly",      // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
  "PRISM Hook Janitor",
  "PRISM MCP Connectivity Monitor",        // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (regex-blind: bare $TaskName)
  "PRISM MCP Priority Guardian",           // MCP-FLEET-CAPACITY-MS0 2026-06-08 drift-sync (peer installer)
  "PRISM MCP Server",                      // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
  "PRISM MCP Server Watchdog",             // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
  "PRISM Memory Pressure Auto-Relief",     // U-FTH-FOLLOWUP-SELF-DISC adds
  "PRISM NN-Graph Retrain",                // U-FTH-FOLLOWUP-SELF-DISC adds
  "PRISM Node Orphan Cleaner",
  "PRISM OCR Training Loop",               // MCP-FLEET-CAPACITY-MS0 2026-06-08 drift-sync (peer installer)
  "PRISM PDF Corpus Watcher",              // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -cron.ps1)
  "PRISM RGS Tool Planner",                // U-FTH-FOLLOWUP-SELF-DISC adds
  "PRISM SFC Variability Batch Lathe",     // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (regex-blind: $LatheTaskName)
  "PRISM SFC Variability Batch Mill",      // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (regex-blind: $MillTaskName)
  "PRISM SFC Variability Guard",           // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (regex-blind: $GuardTaskName)
  "PRISM Slot Bindings Backfill",          // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -tasks.ps1 + spec-key Name=)
  "PRISM Slot Bindings Seed",              // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -tasks.ps1 + spec-key Name=)
  "PRISM Slot Bindings Verify",            // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -tasks.ps1 + spec-key Name=)
  "PRISM Slot Worktree Migration Status",  // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
  "PRISM Source Monitor Sweep",            // U-FTH-FOLLOWUP-SELF-DISC adds
  "PRISM Synergy Regression Watch",
  "PRISM System Awareness Freshness",      // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (regex-blind: bare $TaskName)
  "PRISM System-Viz Re-walk Daily",        // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (regex-blind: bare $TaskName)
  "PRISM Tribal Consolidate Weekly",       // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -cron.ps1)
  "PRISM Tribal Promotion Cron",           // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -cron.ps1)
  "PRISM Vault Memory Promotion Cron",     // MCP-FLEET-CAPACITY-MS0 2026-06-08 — sierra U-VAULT-MAINT-CRON installer (shipped disabled, migration freeze)
  "PRISM Vault Rot Sentinel Cron",         // MCP-FLEET-CAPACITY-MS0 2026-06-08 — sierra U-VAULT-MAINT-CRON installer (shipped disabled, migration freeze)
  "PRISM Wiki Link Healer Apply",          // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -tasks.ps1 + spec-key Name=)
  "PRISM Wiki Link Healer Suggest",        // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 (glob-miss: -tasks.ps1 + spec-key Name=)
  "PRISM Wiki-Tribal Audit Regen",         // U-HERMES-FTH-DRIFT-SYNC 2026-06-01
  "PRISM WSL Memory Guard",                // MCP-FLEET-CAPACITY-MS0 2026-06-08 (sierra) — drift-sync: charlie's commit-pressure WSL2 cap guard (install-wsl-memory-guard-task.ps1, 15min advise-only). The live E2E drift test fail-loud caught it unwatched.
  "PRISM Zombie Reaper v2",
  "PRISM Zulu Orchestrator",               // U-HERMES-FTH-DRIFT-SYNC 2026-06-01 — chat-fleet autonomy backbone (blocker 1: registered? install-zulu-orchestrator-task.ps1 -RunNow, elevated). Was discovered-but-unwatched → drift test red.
  // 2026-06-01 U-HERMES-FTH-DRIFT-SYNC (slot:bravo): synced KNOWN to the full
  // set of PRISM scheduled-task names that the .claude/helpers install/register
  // scripts actually register (Register-ScheduledTask-gated discovery — see
  // discoverInstallerTasks). Count was 39 at the 2026-06-01 sync; 44 as of
  // MCP-FLEET-CAPACITY-MS0 2026-06-08 after adding MCP Priority Guardian, OCR
  // Training Loop, the 2 Vault crons, and WSL Memory Guard — the live
  // `discoverInstallerTasks` count is the truth, not this annotation.
  // THREE-stage fix, each stage a deeper green-but-blind
  // layer caught by per-file scrutiny: (1) 9 typed-param installers had no KNOWN
  // entry → drift test RED; (2) arm B caught the discovery regex blind to bare
  // `$TaskName`/`$GuardTaskName` (Blueprint OCR Batch, Cost Alarm, MCP
  // Connectivity Monitor, 3× SFC Variability, System Awareness Freshness,
  // System-Viz Re-walk Daily — 8); (3) arm B round-2 caught the FILE GLOB missing
  // `-tasks.ps1`/`-cron.ps1`/`register-*.ps1` registrars + the spec-key `Name=`
  // style (Combo Efficiency ×2, Wiki Link Healer ×2, PDF Corpus Watcher, Slot
  // Bindings ×3, Tribal Consolidate, Tribal Promotion — 10). Every one had been
  // silently unwatched by missing-registration detection — the exact
  // U-FTH-FOLLOWUP-SELF-DISC fail-loud signal, reproduced level by level until
  // the content gate closed it by construction. Surfaced by the Hermes-control-
  // readiness audit (HERMES-CONTROL-READINESS-2026-06-01, blocker 1: the Zulu
  // orchestrator has been dark ~2 days, invisible to this net).
  // 2026-05-17 — removed "PRISM Orphan Process Reaper (PS)": discoverInstaller-
  // Tasks (U-FTH-FOLLOWUP-SELF-DISC) found NO install-*-task.ps1 registering
  // this name. The watchdog was tracking a phantom — every audit false-flagged
  // it as "missing" with no real safety-net loss. If a future installer
  // re-registers a name like this, the E2E drift test fails-loud and prompts
  // restoration.
  // 2026-06-09 (golf G10) NOTE: detectInstallerDrift currently fails-loud on 4
  // installer-discovered names NOT catalogued here -- "PRISM Daily Context
  // Synthesis", "PRISM India Transcript Mine", "PRISM Knowledge Distillation",
  // "PRISM Weekly Memory Synthesis" (sierra/india synthesis/mining crons). They
  // are deliberately NOT added: they have install-/register- scripts but are NOT
  // live-registered, so cataloguing them makes the watchdog flag them MISSING
  // every audit (a fleet-wide cry-wolf). The correct fix is owner-informed --
  // either register them (elevated) OR add them to EXPECTED_UNREGISTERED_TASKS if
  // intentionally unarmed -- not a blind catalog add. Durable fix = auto-deriving
  // this list from discovery. See reference_fleet_task_health_drift_sync_2026_06_01.
];

/**
 * Tasks whose installer SHIPS but is DELIBERATELY not registered yet — an
 * intentional, operator-acknowledged "not installed" state, NOT a missing
 * safety net. Today these are the two vault-maintenance crons whose installers
 * landed in MCP-FLEET-CAPACITY-MS0 (2026-06-08) but are held UNARMED under the
 * 47-task migration freeze (operator: do NOT re-enable until migration done).
 *
 * They remain in KNOWN_PRISM_TASKS (so the moment they ARE registered they get
 * full health-checking + drift coverage), but `aggregateHealth` partitions them
 * OUT of `missing` into `expectedUnregistered` — surfaced informationally (like
 * `pressure`), never escalating fleet level to `warn`. Reporting them as plain
 * "MISSING — not registered" every audit was honest-but-noisy: it kept the
 * fleet perpetually at WARN and fired chat-bus advisories for a state the
 * operator already chose. R12 is still honored — the deferral is surfaced, just
 * not as an alarm.
 *
 * WHEN THE FREEZE LIFTS: register the task (its installer is
 * .claude/helpers/install-vault-{promotion,rot-sentinel}-cron.ps1) and REMOVE
 * its name from this set in the same change — so a genuinely-vanished task
 * (installer deleted, registration failed) re-surfaces as real `missing`.
 */
export const EXPECTED_UNREGISTERED_TASKS = [
  "PRISM Vault Memory Promotion Cron", // sierra U-VAULT-MAINT-CRON installer — shipped, unarmed (migration freeze)
  "PRISM Vault Rot Sentinel Cron",     // sierra U-VAULT-MAINT-CRON installer — shipped, unarmed (migration freeze)
];

/**
 * Tasks that ARE registered but are DELIBERATELY DISABLED by the operator under
 * the same ~47-task HW-migration freeze — distinct from EXPECTED_UNREGISTERED
 * (never registered). A registered-but-disabled freeze task is an intentional,
 * operator-acknowledged pause, NOT a degraded safety net. `aggregateHealth`
 * partitions these OUT of `degraded` into `expectedDisabled` — surfaced
 * informationally (like `expectedUnregistered`/`pressure`), never escalating
 * fleet level to `warn`. Reporting them as a WARN every audit was honest-but-
 * noisy: it kept the safety-net alert perpetually red for a state the operator
 * chose, which trains operators to ignore it (so a REAL reaper-task failure
 * slips through). R12 is honored — the pause is surfaced, just not as an alarm.
 *
 * STRICT: only the exact `disabled` status is partitioned. If one of these
 * re-appears `missing`/`failing`/`stale`, it is NOT suppressed — that is a real
 * signal (e.g. the operator re-enabled it and it then wedged). Staleness on an
 * ENABLED task is likewise never suppressed (only deliberate disable is expected).
 *
 * WHEN THE FREEZE LIFTS: re-enable the task (`schtasks /Change /TN "<name>"
 * /ENABLE`) and REMOVE its name from this set in the same change — so a
 * genuinely-disabled-by-accident task re-surfaces as a real degradation.
 */
export const EXPECTED_DISABLED_TASKS = [
  // Individually/permanently expected-disabled tasks (e.g. superseded ones that
  // should NOT be re-enabled even after the migration). The broad ~47-task
  // migration freeze is handled by the marker below — NOT by enumerating it here
  // (the disabled set FLUCTUATES across readings; a static list cannot track it).
  // Kept as a deliberately-small allowlist for the non-freeze case.
];

/** Marker file whose existence asserts the operator's HW-migration freeze is ACTIVE. */
export const MIGRATION_FREEZE_FLAG = join(SHARED_DIR, "MIGRATION-FREEZE-ACTIVE.flag");

/**
 * Is the operator's ~47-task HW-migration freeze currently active?
 *
 * Source-of-truth for the freeze is the operator note in
 * `.claude/helpers/install-vault-rot-sentinel-cron.ps1` (lines 11-16). This makes
 * that human note MACHINE-READABLE so `aggregateHealth` can treat the deliberately-
 * disabled tasks as expected (not a degraded safety net) WHILE THE FREEZE LASTS,
 * and automatically resume flagging them the moment it lifts — closing the
 * "static allowlist silently hides a task after the freeze ends" staleness trap.
 *
 * Precedence: env `PRISM_MIGRATION_FREEZE_ACTIVE` (1/true or 0/false) overrides the
 * flag file; otherwise the freeze is active iff the marker file exists. Fail-soft —
 * any read error ⇒ NOT frozen (the safe default: flag normally rather than suppress).
 *
 * @param {{flagPath?:string, exists?:(p:string)=>boolean, env?:Record<string,string>}} [io] injectable for tests
 * @returns {boolean}
 */
export function isMigrationFreezeActive(io = {}) {
  const env = (io.env || process.env).PRISM_MIGRATION_FREEZE_ACTIVE;
  if (env === "1" || env === "true") return true;
  if (env === "0" || env === "false") return false;
  const flagPath = io.flagPath || MIGRATION_FREEZE_FLAG;
  const exists = io.exists || existsSync;
  try { return !!exists(flagPath); } catch { return false; }
}

/** Default location of `install-*` / `register-*` task-registration scripts. */
export const INSTALLERS_DIR = join(REPO_ROOT, ".claude", "helpers");

/**
 * Scan every `.claude/helpers/{install,register}-*.ps1` that calls
 * `Register-ScheduledTask`, and return the set of `PRISM `-prefixed scheduled-
 * task names it registers — declared as a `$…TaskName` var, a `-TaskName`
 * argument, or a spec-array `Name = '…'` key. Closes arm-C's deferred P1
 * (U-FTH-FOLLOWUP-SELF-DISC) from FLEET-TASK-HEALTH-MS0: a task shipping without
 * a KNOWN_PRISM_TASKS update is silently unwatched; a renamed task false-flags
 * as "missing" forever. Fail-soft on missing dir / unreadable file — empty set,
 * not a throw. The `Register-ScheduledTask` content gate scopes name-extraction
 * to genuine registrars, so the (broad) file glob can never introduce a phantom
 * from a non-registering script. Filters to "PRISM "-prefixed names since the
 * watchdog's domain is the PRISM safety net only.
 */
export function discoverInstallerTasks({ helpersDir = INSTALLERS_DIR, _io = {} } = {}) {
  const _readdir = _io.readdirSync || readdirSync;
  const _readFile = _io.readFileSync || readFileSync;
  const _exists = _io.existsSync || existsSync;
  const out = new Set();
  let entries;
  try {
    if (!_exists(helpersDir)) return out;
    entries = _readdir(helpersDir);
  } catch { return out; }
  // Discovery is "complete by construction": scan every install-*/register-*
  // PowerShell script, KEEP only those that actually call Register-ScheduledTask
  // (the content gate — precisely scopes name-extraction to real task registrars
  // and makes the file glob's width harmless: a widened glob can never introduce
  // a phantom from a non-registering script), then capture the PRISM task name
  // HOWEVER it is declared:
  //   (a) `$TaskName`/`$GuardTaskName`/`$MillTaskName…` var assignment to a literal
  //   (b) a direct `-TaskName 'PRISM …'` argument
  //   (c) a spec-array hashtable key `Name = 'PRISM …'` (consumed via
  //       `-TaskName $Spec.Name`, e.g. install-combo-efficiency-tasks.ps1 /
  //       install-slot-bridge-tasks.ps1)
  // Capture is anchored on the `PRISM ` prefix (the watchdog's domain) so a
  // `$desc`/`Description`/comment string that merely mentions a name (e.g.
  // "PRISM Weekly Synthesis", desc-only) is NOT captured, and a splat key
  // `TaskName = $x` (no leading `$`, RHS not a PRISM literal) never false-matches.
  // matchAll collects EVERY name per file (one installer may register several).
  //
  // 2026-06-01 U-HERMES-FTH-DRIFT-SYNC (slot:bravo): this is the THIRD-stage fix.
  // (1) 9 typed-param installers had no KNOWN entry → drift test RED. (2) scrutiny
  // arm B caught the regex missing bare-`$TaskName`/`$GuardTaskName` declarations.
  // (3) arm B round-2 caught the FILE GLOB (`install-*-task.ps1` singular) missing
  // `-tasks.ps1`/`-cron.ps1`/`register-*.ps1` registrars AND the spec-key `Name=`
  // style → 10 more silently-unwatched tasks (Combo Efficiency ×2, Wiki Link
  // Healer ×2, PDF Corpus Watcher, Slot Bindings ×3, Tribal Consolidate, Tribal
  // Promotion). Each stage reproduced the U-FTH-FOLLOWUP-SELF-DISC green-but-blind
  // failure one level up; the Register-ScheduledTask gate + broad glob + 3 capture
  // forms close it by construction (verified: 39 discovered == 39 registered).
  const FNAME_RE = /^(?:install|register)-.*\.ps1$/i;
  const NAME_RE = /(?:\$[A-Za-z]*TaskName[A-Za-z0-9]*\s*=\s*|-TaskName\s+|(?:^|[\s{,])Name\s*=\s*)['"](PRISM [^'"]+?)['"]/gim;
  for (const fname of entries) {
    if (typeof fname !== "string") continue;
    if (!FNAME_RE.test(fname)) continue;
    let text;
    try { text = _readFile(join(helpersDir, fname), "utf8"); } catch { continue; }
    if (!/Register-ScheduledTask/i.test(text)) continue;  // real registrars only
    for (const m of text.matchAll(NAME_RE)) {
      const name = m[1].trim();
      if (!name.startsWith("PRISM ")) continue;
      out.add(name);
    }
  }
  return out;
}

/**
 * Categorise drift between the discovered installer set and the hardcoded
 * list. `missingFromHardcoded` = NEW tasks shipping unwatched (high-priority).
 * `staleInHardcoded` = entries no installer registers (false-flag noise).
 * Empty discovered → no-drift (graceful: empty is "dir not found", not
 * "everything deleted").
 */
export function detectInstallerDrift(discovered, hardcoded) {
  const hardSet = new Set(hardcoded || []);
  if (!(discovered instanceof Set) || discovered.size === 0) {
    return { missingFromHardcoded: [], staleInHardcoded: [], hasDrift: false };
  }
  const missingFromHardcoded = [];
  for (const name of discovered) {
    if (!hardSet.has(name)) missingFromHardcoded.push(name);
  }
  const staleInHardcoded = [];
  for (const name of hardSet) {
    if (!discovered.has(name)) staleInHardcoded.push(name);
  }
  missingFromHardcoded.sort();
  staleInHardcoded.sort();
  return {
    missingFromHardcoded, staleInHardcoded,
    hasDrift: missingFromHardcoded.length > 0 || staleInHardcoded.length > 0,
  };
}

// --- Deterministic task -> owner-slot routing (U-GOLF-TASK-OWNER-MAP) --------

/**
 * Static PRISM-task -> owner-slot attribution. THE GAP THIS CLOSES (Theme D, R5):
 * the WARN/autoheal advisory names degraded tasks but routes to NOBODY, so a model
 * reading the chat bus had to RE-DERIVE "Blueprint OCR Batch is xray's domain" on
 * every audit. Routing is deterministic data, not a judgment call to re-run each
 * time -- so it is CODE here, encoded ONCE and editable, never re-derived (R5: a
 * deterministic transform is answered by a pure function, not the model).
 *
 * Attribution follows the operator-canonical slot domains (state/shared/
 * CHAT-SLOT-DOMAINS.md) + the galaxy ownership in MEMORY.md. Best-effort by domain
 * keyword; genuinely-ambiguous infra defaults to golf (DEFAULT_OWNER) -- the
 * fleet-hygiene slot that OWNS this watchdog and triages/redistributes. A debatable
 * single entry is still strictly better than per-audit re-derivation: it is one
 * deterministic line a peer can correct, and the map-completeness test (every
 * KNOWN_PRISM_TASKS name has an entry) keeps it in lock-step with the task set.
 *
 * INVARIANT (enforced by test): every KNOWN_PRISM_TASKS name is a key here. A new
 * task added to KNOWN without an owner fails the completeness test loud (R9/R12) --
 * the same drift-guard discipline as detectInstallerDrift.
 */
export const TASK_OWNER_DOMAIN = {
  // Fleet hygiene / reaper / memory / orphan / cleanup -- golf owns the safety net.
  "PRISM Fleet Reaper": "golf",
  "PRISM Fleet Memory Monitor": "golf",
  "PRISM Cleanup Orchestrator": "golf",
  "PRISM Node Orphan Cleaner": "golf",
  "PRISM Zombie Reaper v2": "golf",
  "PRISM Memory Pressure Auto-Relief": "golf",
  "PRISM Hook Janitor": "golf",
  "PRISM WSL Memory Guard": "golf",
  "PRISM Slot Bindings Backfill": "golf",
  "PRISM Slot Bindings Seed": "golf",
  "PRISM Slot Bindings Verify": "golf",
  "PRISM Slot Worktree Migration Status": "golf",
  // MCP daemon infra -- backend helper owns the MCP server stack.
  "PRISM MCP Server": "papa",
  "PRISM MCP Server Watchdog": "papa",
  "PRISM MCP Connectivity Monitor": "papa",
  "PRISM MCP Priority Guardian": "papa",
  // Blueprint / OCR / PDF ingestion -- xray owns blueprint-vision (OCR + PDF split).
  "PRISM Blueprint Join Refresh": "xray",
  "PRISM Blueprint OCR Batch": "xray",
  "PRISM OCR Training Loop": "xray",
  "PRISM PDF Corpus Watcher": "xray",
  // AI / NN / training / mining -- india owns full-system AI training.
  "PRISM NN-Graph Retrain": "india",
  "PRISM Knowledge Distillation": "india",
  "PRISM India Transcript Mine": "india",
  // System-viz / graph / awareness -- sierra owns system-viz + memory synthesis.
  "PRISM System-Viz Re-walk Daily": "sierra",
  "PRISM System Awareness Freshness": "sierra",
  "PRISM Source Monitor Sweep": "sierra",
  "PRISM Daily Context Synthesis": "sierra",
  "PRISM Weekly Memory Synthesis": "sierra",
  // Obsidian brain / wiki / tribal / handoff hygiene -- alpha owns the Obsidian brain.
  "PRISM Brain Refresh": "alpha",
  "PRISM Hermes Dream-Cycle Synth": "alpha",
  "PRISM Hermes Self-Reflect Weekly": "alpha",
  "PRISM Vault Memory Promotion Cron": "alpha",
  "PRISM Vault Rot Sentinel Cron": "alpha",
  "PRISM Tribal Consolidate Weekly": "alpha",
  "PRISM Tribal Promotion Cron": "alpha",
  "PRISM Wiki Link Healer Apply": "alpha",
  "PRISM Wiki Link Healer Suggest": "alpha",
  "PRISM Wiki-Tribal Audit Regen": "alpha",
  "PRISM Handoff Prune": "alpha",
  // Speed & Feed variability -- oscar owns the Speed-Feed Calculator.
  "PRISM SFC Variability Batch Lathe": "oscar",
  "PRISM SFC Variability Batch Mill": "oscar",
  "PRISM SFC Variability Guard": "oscar",
  // Quoting / cost / throughput -- charlie owns quoting (backend+frontend).
  "PRISM Combo Efficiency Baseline": "charlie",
  "PRISM Combo Efficiency Dashboard": "charlie",
  "PRISM Cost Alarm": "charlie",
  // Discovery / pipeline / regression -- tango owns algorithm/engine/pipeline discovery.
  "PRISM Synergy Regression Watch": "tango",
  "PRISM RGS Tool Planner": "tango",
  // Chat-fleet orchestration backbone -- zulu owns the orchestrator.
  "PRISM Zulu Orchestrator": "zulu",
};

/** Fallback owner for an unmapped task: golf, the fleet-hygiene watchdog owner/triager. */
export const DEFAULT_OWNER = "golf";

/**
 * Owner-map keys that are intentionally NOT in KNOWN_PRISM_TASKS. These 4
 * synthesis/mining crons HAVE install-/register- scripts but are deliberately
 * left out of KNOWN_PRISM_TASKS (they are not live-registered, so cataloguing
 * them there would false-flag MISSING every audit -- see the KNOWN comment near
 * "PRISM Daily Context Synthesis"). They are pre-provisioned HERE with their
 * eventual owner so that the moment they ARE registered the WARN advisory routes
 * correctly with zero further edits. This is the documented allowlist the REVERSE
 * completeness guard (test) checks against: any owner-map key that is NEITHER in
 * KNOWN_PRISM_TASKS NOR here is a typo / dead entry and must fail loud (R9/R12) --
 * the symmetric complement of the KNOWN-subset-of-MAP guard.
 */
export const FORWARD_PROVISIONED_OWNER_TASKS = [
  "PRISM Knowledge Distillation",
  "PRISM India Transcript Mine",
  "PRISM Daily Context Synthesis",
  "PRISM Weekly Memory Synthesis",
];

/**
 * Resolve the owner slot for one task name. Unmapped / non-string -> fallback.
 * Pure -- no IO, deterministic (R9).
 */
export function ownerForTask(taskName, map = TASK_OWNER_DOMAIN, fallback = DEFAULT_OWNER) {
  if (typeof taskName !== "string") return fallback;
  return map[taskName.trim()] || fallback;
}

/**
 * Route a list of degraded/missing task NAMES to their owner slots. Returns the
 * deduped, sorted owner set (`to`, for a chat-bus `to:` field a peer slot filters
 * on) plus the per-task attribution (`byTask`). Empty / non-array -> {to:[],byTask:{}}.
 * Pure -- no IO (R9).
 *
 * @param {string[]} taskNames
 * @returns {{to:string[], byTask:Record<string,string>}}
 */
export function routeDegradedToOwners(taskNames, map = TASK_OWNER_DOMAIN, fallback = DEFAULT_OWNER) {
  const byTask = {};
  const owners = new Set();
  if (Array.isArray(taskNames)) {
    for (const raw of taskNames) {
      const name = String(raw || "").trim();
      if (!name) continue;
      const owner = ownerForTask(name, map, fallback);
      byTask[name] = owner;
      owners.add(owner);
    }
  }
  return { to: [...owners].sort(), byTask };
}

/**
 * Does a LastTaskResult code mean Task Scheduler could not run the task's
 * action at all — a genuine TASK failure (wrong node path, missing script,
 * access denied, a hard process crash)?
 *
 * CRITICAL DISTINCTION. PRISM's monitoring tasks deliberately use small exit
 * codes as FINDINGS, not failures — fleet-memory-monitor exits 1 for "warn
 * pressure" / 2 for "critical", fleet-reaper and synergy-watch likewise. A
 * task whose script ran and chose to exit 1 is a HEALTHY task: it fired, the
 * script executed. The *finding* is that script's own telemetry + advisory,
 * not this watchdog's concern. Treating every nonzero result as "failing"
 * false-flags every monitor that ever reports a warning (observed live
 * 2026-05-17: the first cut flagged Fleet Memory Monitor + Synergy Watch as
 * "failing" when both had simply exited 1 to report a finding).
 *
 * A genuine launch failure surfaces as a Windows HRESULT / NTSTATUS code —
 * always high-bit-set when read as unsigned 32-bit (>= 0x80000000), e.g.
 * 0x80070002 ERROR_FILE_NOT_FOUND, 0x80070005 ERROR_ACCESS_DENIED,
 * 0xC0000005 access violation. PowerShell may surface these as a negative
 * int32; `>>> 0` normalizes signed and unsigned uniformly. Task Scheduler
 * STATUS codes (0x41300-0x4130F) and a script's own small exit codes are all
 * < 0x80000000, so neither trips this.
 *
 * SECOND CRITICAL DISTINCTION (MCP-FLEET-CAPACITY-MS0, 2026-06-08): a small set
 * of HRESULTs are TRANSIENT SYSTEM-RESOURCE-PRESSURE codes — Windows could not
 * spawn the action *at that instant because the box was momentarily saturated*
 * (commit charge near the ceiling), NOT because the task is misconfigured or the
 * target process crashed. The task script + its target daemon are fine; the next
 * trigger fires normally once pressure eases. Treating these as "failing"
 * false-flags a perfectly-healthy task (observed live 2026-06-08: "PRISM MCP
 * Server=failing" with LastTaskResult=0x800710E0 while the daemon answered
 * /health 200 OK and the watchdog showed consecutiveFails:0). These are
 * classified `pressure` (a finding about the box, not the task), never `failing`.
 *
 * Pure function — no IO.
 */
// Transient system-resource-pressure HRESULTs — spawn was refused due to load,
// not a task-config/crash failure. Kept narrow + named on purpose.
export const TRANSIENT_PRESSURE_CODES = new Set([
  0x800710e0, // ERROR_NO_SYSTEM_RESOURCES — "insufficient system resources to complete the API"
  0x8007000e, // E_OUTOFMEMORY — not enough storage to process the command
  0x800705aa, // ERROR_NO_SYSTEM_RESOURCES (Win32 0x5AA mapped) — system resources exhausted
  0x8007012b, // ERROR_PARTIAL_COPY — only part of a ...Memory request completed (pressure)
]);

export function isTransientPressureCode(code) {
  if (!Number.isFinite(code)) return false;
  return TRANSIENT_PRESSURE_CODES.has(code >>> 0);
}

export function isLaunchFailureCode(code) {
  if (!Number.isFinite(code) || code === 0) return false;
  // A transient system-pressure spawn-refusal is NOT a task launch failure.
  if (isTransientPressureCode(code)) return false;
  return (code >>> 0) >= 0x80000000;
}

// ─── ISO-8601 duration parsing (task trigger intervals) ─────────────────────

/**
 * Parse an ISO-8601 duration ("PT5M", "PT1H", "P1DT12H", "PT30S") to
 * milliseconds. Returns null for an unparseable / empty string. Handles the
 * day/hour/minute/second components that Task Scheduler repetition intervals
 * actually use (years/months/weeks are not valid repetition intervals).
 *
 * Pure function — no IO.
 */
export function parseIso8601Duration(str) {
  if (typeof str !== "string") return null;
  const m = str.trim().match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const [, d, h, min, s] = m;
  // A bare "P" / "PT" with no components is not a real interval.
  if (d === undefined && h === undefined && min === undefined && s === undefined) return null;
  const ms =
    (Number(d || 0) * 86_400_000) +
    (Number(h || 0) * 3_600_000) +
    (Number(min || 0) * 60_000) +
    (Number(s || 0) * 1_000);
  return ms > 0 ? ms : null;
}

/**
 * From a task's list of trigger repetition-interval strings, pick the SHORTEST
 * (the task fires at least this often). Returns null when no trigger carries a
 * repetition interval (e.g. an AtStartup-only task) — such a task is exempt
 * from the staleness check.
 *
 * Pure function — no IO.
 */
export function smallestIntervalMs(intervalStrings) {
  if (!Array.isArray(intervalStrings)) return null;
  let best = null;
  for (const raw of intervalStrings) {
    const ms = parseIso8601Duration(raw);
    if (ms !== null && (best === null || ms < best)) best = ms;
  }
  return best;
}

// ─── PowerShell scheduled-task sampler ──────────────────────────────────────

/**
 * Enumerate every `PRISM *` scheduled task via one PowerShell invocation.
 * ONE invocation matters — forking powershell.exe repeatedly under fleet
 * pressure is itself a measurable RAM tax.
 *
 * Returns: { tasks: [ { name, state, lastRunTime, nextRunTime, lastTaskResult,
 *                       missedRuns, triggerIntervals:[...] }, ... ] }
 * lastRunTime / nextRunTime are ISO strings or null (the 1899-12-30 "never"
 * sentinel is normalized to null inside PowerShell).
 *
 * Edge cases:
 *  - PowerShell missing / wedged: timeout → throws → caller exits 3 (R12).
 *  - ScheduledTasks module absent (non-Windows): nonzero exit → throws.
 *  - Task name carries raw C0 control bytes (PS 5.1 ConvertTo-Json does NOT
 *    escape them, which makes Node JSON.parse throw) → stripped to space
 *    inside PowerShell before encoding, per the 2026-05-16b reaper lesson.
 *  - ConvertTo-Json unwraps a single-element array → defended on the JS side.
 *
 * @param {{timeoutMs?:number, _spawn?:Function}} [opts]
 */
export function sampleScheduledTasks(opts = {}) {
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs
    : Number(process.env.PRISM_FLEET_TASKHEALTH_PS_TIMEOUT_MS) || DEFAULT_PS_TIMEOUT_MS;
  const spawn = opts._spawn || spawnSync;

  const psScript = `
$ErrorActionPreference = 'Stop'
$tasks = @(Get-ScheduledTask -ErrorAction Stop | Where-Object { $_.TaskName -like 'PRISM *' })
$out = @()
foreach ($t in $tasks) {
  $info = $null
  try { $info = $t | Get-ScheduledTaskInfo -ErrorAction Stop } catch { $info = $null }
  $intervals = @()
  foreach ($trg in @($t.Triggers)) {
    $rep = $trg.Repetition
    # Strip C0 control bytes from the interval string before it reaches
    # ConvertTo-Json — same hardening class as 2026-05-16b PS5.1 raw-C0
    # enumeration-blind regression in fleet-reaper-sweep.mjs. A third-party
    # installer that puts a control byte in Triggers[].Repetition.Interval
    # would make Node JSON.parse throw and silently blind the watchdog.
    # (lastTaskResult / missedRuns / lrt / nrt are int64 / formatted ISO
    # dates — immune to control bytes by type.)
    if ($rep -and $rep.Interval) { $intervals += ((([string]$rep.Interval) -replace '[\\x00-\\x1F]', ' ')) }
  }
  $lrt = $null
  if ($info -and $info.LastRunTime -and $info.LastRunTime.Year -gt 1980) {
    $lrt = $info.LastRunTime.ToUniversalTime().ToString('o')
  }
  $nrt = $null
  if ($info -and $info.NextRunTime -and $info.NextRunTime.Year -gt 1980) {
    $nrt = $info.NextRunTime.ToUniversalTime().ToString('o')
  }
  $out += [PSCustomObject]@{
    name             = (([string]$t.TaskName) -replace '[\\x00-\\x1F]', ' ')
    state            = (([string]$t.State)    -replace '[\\x00-\\x1F]', ' ')
    lastRunTime      = $lrt
    nextRunTime      = $nrt
    lastTaskResult   = if ($info) { [int64]$info.LastTaskResult } else { $null }
    missedRuns       = if ($info) { [int64]$info.NumberOfMissedRuns } else { $null }
    triggerIntervals = @($intervals)
  }
}
[PSCustomObject]@{ tasks = @($out) } | ConvertTo-Json -Depth 5 -Compress
`.trim();

  const res = spawn("powershell.exe",
    ["-NoProfile", "-NoLogo", "-NonInteractive", "-Command", psScript],
    { encoding: "utf8", timeout: timeoutMs, windowsHide: true });

  if (res.error) {
    const err = new Error(`fleet-task-health: PowerShell spawn failed: ${res.error.code || res.error.message}`);
    err.cause = res.error;
    throw err;
  }
  if (res.status !== 0) {
    throw new Error(`fleet-task-health: PowerShell exited ${res.status} — stderr: ${(res.stderr || "").slice(0, 400)}`);
  }
  const out = (res.stdout || "").trim();
  if (!out) {
    throw new Error("fleet-task-health: PowerShell returned empty stdout (query failed silently)");
  }
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (e) {
    throw new Error(`fleet-task-health: PowerShell stdout was not JSON: ${(e.message || "parse").slice(0, 200)} — head: ${out.slice(0, 200)}`);
  }
  if (parsed && parsed.tasks && !Array.isArray(parsed.tasks)) parsed.tasks = [parsed.tasks];
  if (!parsed || !Array.isArray(parsed.tasks)) {
    throw new Error("fleet-task-health: PowerShell payload shape unexpected (missing tasks[])");
  }
  // Normalize each task's triggerIntervals to an array (ConvertTo-Json unwraps
  // a single-element array; an empty PS array can serialize oddly too).
  for (const t of parsed.tasks) {
    if (!t) continue;
    if (t.triggerIntervals == null) t.triggerIntervals = [];
    else if (!Array.isArray(t.triggerIntervals)) t.triggerIntervals = [t.triggerIntervals];
  }
  return parsed;
}

// ─── Classification (pure) ──────────────────────────────────────────────────

/**
 * Classify a single task from its raw fields.
 *
 * @param {{state:string, lastRunTimeMs:number|null, nextRunTimeMs:number|null, lastTaskResult:number|null, intervalMs:number|null}} t
 * @param {number} nowMs
 * @param {{staleMultiplier:number}} cfg
 * @returns {{status:"healthy"|"disabled"|"failing"|"stale"|"trigger-stalled"|"never-ran"|"unknown-state", reason:string}}
 */
export function classifyTask(t, nowMs, cfg) {
  const state = (t.state || "").trim();

  if (state === "Disabled") {
    return { status: "disabled", reason: "task State is Disabled — it will not run on its trigger" };
  }
  // Ready / Running / Queued are the healthy operational states. Anything else
  // (Unknown, or an empty/garbled string) is a signal in its own right.
  if (state !== "Ready" && state !== "Running" && state !== "Queued") {
    return { status: "unknown-state", reason: `task State is '${state || "(empty)"}' — expected Ready` };
  }

  // A LastTaskResult in the Windows HRESULT/NTSTATUS range means Task
  // Scheduler could not run the action (missing node, bad path, access
  // denied, hard crash). Small exit codes are the SCRIPT's own findings and
  // are NEVER a task-health failure — see isLaunchFailureCode.
  const r = t.lastTaskResult;
  // Transient system-pressure spawn-refusal: the box was momentarily saturated
  // (commit near ceiling) so Task Scheduler couldn't launch — the task + its
  // target daemon are fine, the next trigger fires once pressure eases. A finding
  // about the BOX, not a task failure. Checked before isLaunchFailureCode's
  // generic HRESULT gate (which now also excludes these).
  if (isTransientPressureCode(r)) {
    const hex = "0x" + (r >>> 0).toString(16).toUpperCase();
    return { status: "pressure", reason: `LastTaskResult=${hex} — transient system-resource pressure (spawn refused under load, not a task failure)` };
  }
  if (isLaunchFailureCode(r)) {
    const hex = "0x" + (r >>> 0).toString(16).toUpperCase();
    return { status: "failing", reason: `LastTaskResult=${hex} — Task Scheduler could not run the task's action` };
  }

  // Never executed. The PRISM installers all use -RunNow, so a registered
  // PRISM task should have a LastRunTime within seconds; a null here means it
  // genuinely has not run.
  if (t.lastRunTimeMs == null) {
    return { status: "never-ran", reason: "no LastRunTime — task has never executed" };
  }

  // Trigger stall — a task can be State:Ready yet have its NextRunTime frozen in
  // the past: the repetition trigger stopped advancing and the task will never
  // fire again. The State check above and the LastRunTime-staleness check below
  // are both blind to a freshly-stalled trigger (LastRunTime is still recent);
  // this catches it directly. Checked before `stale` because it is the more
  // precise diagnosis — a long-stalled task eventually trips both.
  //
  // GATED ON Ready ONLY: a Running task has its NextRunTime legitimately frozen
  // by Windows *while it executes*, and a Queued task is overdue-and-pending by
  // definition — neither is a stall. Only an idle Ready task with a far-past
  // NextRun has a genuinely broken trigger.
  if (state === "Ready" && Number.isFinite(t.intervalMs) && t.intervalMs > 0 && Number.isFinite(t.nextRunTimeMs)) {
    const overdueMs = nowMs - t.nextRunTimeMs;
    const limitMs = t.intervalMs * cfg.staleMultiplier;
    if (overdueMs > limitMs) {
      return {
        status: "trigger-stalled",
        reason: `NextRunTime is ${Math.round(overdueMs / 60000)}min in the past — exceeds `
          + `${Math.round(limitMs / 60000)}min (interval ${Math.round(t.intervalMs / 60000)}min × ${cfg.staleMultiplier}); `
          + `State is '${state}' but the trigger has stalled and will not fire`,
      };
    }
  }

  // Staleness — only checkable for tasks that carry a repetition interval.
  if (Number.isFinite(t.intervalMs) && t.intervalMs > 0) {
    const ageMs = nowMs - t.lastRunTimeMs;
    const limitMs = t.intervalMs * cfg.staleMultiplier;
    if (ageMs > limitMs) {
      return {
        status: "stale",
        reason: `last ran ${Math.round(ageMs / 60000)}min ago — exceeds ${Math.round(limitMs / 60000)}min `
          + `(interval ${Math.round(t.intervalMs / 60000)}min × ${cfg.staleMultiplier})`,
      };
    }
  }

  return { status: "healthy", reason: "Ready, ran within its interval, last result OK" };
}

/**
 * Aggregate per-task classifications into one fleet-level verdict.
 *
 * @param {Array<{name:string, status:string, reason:string}>} classified
 * @param {{mustExist:string[], crashCritical:string[], knownTasks:string[], expectedUnregistered?:string[], expectedDisabled?:string[], migrationFreezeActive?:boolean}} cfg
 * @returns {{level:"clean"|"warn"|"critical", missing:string[], expectedUnregistered:string[], expectedDisabled:string[], degraded:Array, reasons:string[]}}
 */
export function aggregateHealth(classified, cfg) {
  const byName = new Map();
  for (const t of classified) byName.set(t.name, t);

  // A task in the known set that the enumeration did not return is absent.
  // Partition absent tasks: a name in `expectedUnregistered` is a deliberate,
  // operator-acknowledged deferral (e.g. an installer shipped but held under a
  // migration freeze) — surfaced informationally, never escalating. Everything
  // else absent is a real `missing` safety-net gap that escalates to warn.
  const expectedSet = new Set(cfg.expectedUnregistered || []);
  const absent = cfg.knownTasks.filter((n) => !byName.has(n));
  const missing = absent.filter((n) => !expectedSet.has(n));
  const expectedUnregistered = absent.filter((n) => expectedSet.has(n));

  // Partition tasks that are REGISTERED but DELIBERATELY DISABLED under the
  // migration freeze. STRICT: only the exact `disabled` status is expected — a
  // freeze task that re-appears failing/stale/never-ran is NOT suppressed (a real
  // signal). These are excluded from `degraded` below so a deliberate operator
  // pause never drives fleet level to `warn`. Mirrors `expectedUnregistered`
  // (the absent case) for the registered-but-off case.
  // A disabled task is an EXPECTED pause if it is on the explicit allowlist, OR —
  // while the operator's migration freeze is active — it is NOT a load-bearing
  // (must-exist / crash-critical) task. The freeze deliberately disables ~47 tasks
  // and the disabled set fluctuates across readings, so the marker (not a static
  // list) is what tracks it. Load-bearing tasks are NEVER auto-excused by the
  // freeze: the operator would not freeze a reaper, so a disabled one is a real
  // signal that must still escalate.
  const expectedDisabledSet = new Set(cfg.expectedDisabled || []);
  const loadBearing = new Set([...(cfg.mustExist || []), ...(cfg.crashCritical || [])]);
  const expectedDisabled = classified
    .filter((t) => t.status === "disabled" && (
      expectedDisabledSet.has(t.name) ||
      (cfg.migrationFreezeActive && !loadBearing.has(t.name))
    ))
    .map((t) => t.name);
  const expectedDisabledActive = new Set(expectedDisabled);

  // `pressure` is a transient finding about the BOX (spawn refused under load),
  // not a task health problem — the task + its daemon are fine. It is treated as
  // benign (like healthy) for SEVERITY, but still surfaced as an informational
  // reason so the operator sees the box was under pressure. (MCP-FLEET-CAPACITY-MS0)
  const isBenign = (status) => status === "healthy" || status === "pressure";
  const degraded = classified.filter((t) => !isBenign(t.status) && !expectedDisabledActive.has(t.name));
  const pressureTasks = classified.filter((t) => t.status === "pressure");

  // "hard down" = unambiguously not protecting the fleet right now. A stalled
  // trigger belongs here: State may read Ready, but the task will never fire —
  // functionally identical to disabled.
  const isHardDown = (name) => {
    if (missing.includes(name)) return true;
    const t = byName.get(name);
    return !!t && (t.status === "disabled" || t.status === "failing" || t.status === "trigger-stalled");
  };
  // "degraded" = anything not benign, including soft signals (stale, never-ran).
  // `pressure` is benign (box finding, not task failure) — never escalates.
  const isDegraded = (name) => {
    if (missing.includes(name)) return true;
    const t = byName.get(name);
    return !!t && !isBenign(t.status);
  };

  const mustExistHardDown = cfg.mustExist.filter(isHardDown);
  const crashCritDegraded = cfg.crashCritical.filter(isDegraded);

  let level = "clean";
  if (mustExistHardDown.length > 0 || crashCritDegraded.length >= 2) {
    level = "critical";
  } else if (degraded.length > 0 || missing.length > 0) {
    level = "warn";
  }

  const reasons = [];
  if (mustExistHardDown.length > 0) {
    reasons.push(`load-bearing task down: ${mustExistHardDown.join(", ")}`);
  }
  if (crashCritDegraded.length >= 2) {
    reasons.push(`${crashCritDegraded.length} crash-critical tasks degraded: ${crashCritDegraded.join(", ")}`);
  }
  // Per-task detail line for every degraded task (the summary lines above are
  // the headline; these are the drill-down). A missing task has no classified
  // entry, so it never appears in `degraded` — covered by the loop below.
  for (const t of degraded) {
    reasons.push(`${t.name}: ${t.status} — ${t.reason}`);
  }
  for (const n of missing) {
    reasons.push(`${n}: MISSING — not registered`);
  }
  // Informational (does NOT affect level): tasks that hit transient system
  // pressure. Surfaced so the operator sees the box was saturated, but never
  // escalates fleet health — the task itself is healthy.
  for (const t of pressureTasks) {
    reasons.push(`${t.name}: pressure (informational) — ${t.reason}`);
  }
  // Informational (does NOT affect level): installers shipped but deliberately
  // not registered yet (e.g. under a migration freeze). Surfaced so the deferral
  // stays visible — R12 — but never alarms for a state the operator chose.
  for (const n of expectedUnregistered) {
    reasons.push(`${n}: deferred (informational) — installer shipped, not registered (expected)`);
  }
  // Informational (does NOT affect level): tasks deliberately disabled by the
  // operator under the migration freeze. Surfaced so the pause stays visible —
  // R12 — but never alarms for a state the operator chose.
  for (const n of expectedDisabled) {
    reasons.push(`${n}: disabled (informational) — deliberately paused under migration freeze (expected)`);
  }

  return { level, missing, expectedUnregistered, expectedDisabled, degraded, pressureTasks, mustExistHardDown, crashCritDegraded, reasons };
}

// ─── Advisory throttle (pure) ───────────────────────────────────────────────

const LEVEL_RANK = { clean: 0, warn: 1, critical: 2 };

/**
 * Should an AGENT_CHAT advisory be emitted now?
 *   - clean              → never.
 *   - warn / critical    → emit if the cooldown window elapsed OR the level
 *                          ESCALATED above the last emitted level (an
 *                          escalation must never be silenced by a recent
 *                          lower-severity advisory).
 *
 * Pure function — caller persists newLedger.
 *
 * @returns {{emit:boolean, newLedger:object, reason:string}}
 */
export function decideAdvisory(level, ledger, nowMs, cfg) {
  const next = { ...ledger, lastLevel: level };
  if (level === "clean") {
    return { emit: false, newLedger: next, reason: "clean" };
  }
  const cooldownMs = cfg.cooldownSec * 1000;
  const lastAt = ledger.lastAdvisoryAt ? Date.parse(ledger.lastAdvisoryAt) : 0;
  const cooled = !lastAt || !Number.isFinite(lastAt) || (nowMs - lastAt) >= cooldownMs;
  const escalated = (LEVEL_RANK[level] || 0) > (LEVEL_RANK[ledger.lastLevel] || 0);

  if (cooled || escalated) {
    next.lastAdvisoryAt = new Date(nowMs).toISOString();
    return { emit: true, newLedger: next, reason: escalated && !cooled ? "escalation" : level };
  }
  return { emit: false, newLedger: next, reason: "cooldown" };
}

// ─── Ledger / telemetry / chat-bus IO ───────────────────────────────────────

function readLedger(path = LEDGER_PATH) {
  if (!existsSync(path)) {
    return { schemaVersion: LEDGER_SCHEMA_VERSION, lastAdvisoryAt: null, lastLevel: null };
  }
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    if (!j || typeof j !== "object") throw new Error("malformed ledger");
    return {
      schemaVersion: j.schemaVersion || LEDGER_SCHEMA_VERSION,
      lastAdvisoryAt: j.lastAdvisoryAt || null,
      lastLevel: j.lastLevel || null,
    };
  } catch (e) {
    // R12 fail-loud: a corrupt-but-existing ledger silently reset would lose
    // lastAdvisoryAt and re-fire a cooled-down advisory. Surface the reset
    // event to stderr so the operator sees the silent state loss in the
    // watchdog's own log; still return a fresh ledger so the run continues.
    process.stderr.write(`fleet-task-health: ledger parse failure — resetting state: ${(e?.message || e).toString().slice(0, 200)}\n`);
    return { schemaVersion: LEDGER_SCHEMA_VERSION, lastAdvisoryAt: null, lastLevel: null };
  }
}

function writeLedger(state, path = LEDGER_PATH) {
  const tmp = path + ".tmp." + process.pid;
  try { mkdirSync(dirname(path), { recursive: true }); } catch { /* ignore */ }
  writeFileSync(tmp, JSON.stringify({ schemaVersion: LEDGER_SCHEMA_VERSION, ...state }, null, 2), "utf8");
  renameSync(tmp, path);
}

function rotateIfLarge(path = TELEMETRY_PATH, limit = LOG_ROTATE_BYTES) {
  try {
    const st = statSync(path);
    if (st.size >= limit) renameSync(path, TELEMETRY_BACKUP);
  } catch {
    /* missing/inaccessible → the append below creates it */
  }
}

function appendTelemetry(row, path = TELEMETRY_PATH) {
  try { mkdirSync(dirname(path), { recursive: true }); } catch { /* ignore */ }
  rotateIfLarge(path);
  appendFileSync(path, JSON.stringify(row) + "\n", "utf8");
}

function appendChatBus(record, path = CHAT_BUS_PATH) {
  try { mkdirSync(dirname(path), { recursive: true }); } catch { /* ignore */ }
  appendFileSync(path, JSON.stringify(record) + "\n", "utf8");
}

/**
 * Append G10 heal attempts to the re-enable ledger (JSONL, size-rotated). One row
 * per attempted task: {schemaVersion, ts, task, ok, by}. crash-postmortem-digest
 * aggregates this into a FLAPPING flag. Fail-soft -- a ledger write must NEVER
 * abort the audit (R12: the heal already happened regardless of the ledger).
 */
export function appendReenableLedger(rows, path = REENABLE_LEDGER_PATH) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  try {
    mkdirSync(dirname(path), { recursive: true });
    try {
      const st = statSync(path);
      if (st.size >= REENABLE_LEDGER_ROTATE_BYTES) renameSync(path, path + ".1");
    } catch { /* missing/inaccessible -> the append below creates it */ }
    appendFileSync(path, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  } catch { /* fail-soft */ }
}

/**
 * Build the re-enable ledger rows for one heal pass. PURE (testable without IO).
 * One row per ATTEMPTED task; `ok` = the task was in the healed set (so a heal
 * that needed elevation and failed is recorded ok:false, R12). crash-postmortem-
 * digest counts these per task -> the FLAPPING flag.
 */
export function buildReenableLedgerRows(attempted, healed, tsIso) {
  if (!Array.isArray(attempted) || attempted.length === 0) return [];
  const healedSet = new Set(Array.isArray(healed) ? healed : []);
  return attempted.map((task) => ({
    schemaVersion: 1, ts: tsIso, task, ok: healedSet.has(task), by: "fleet-task-health-watch",
  }));
}

/**
 * Build the WARN/CRITICAL task-health chat-bus advisory record. PURE (no IO) so
 * the routing wiring (U-GOLF-TASK-OWNER-MAP) is testable without spawning the
 * audit -- the same pure-producer discipline as buildReenableLedgerRows. Adds the
 * deterministic owner routing (`to` + `ownersByTask`) so a peer slot can filter
 * the bus on its own name instead of a model re-deriving ownership each audit.
 *
 * @param {{ts:string, level:string, taskCount:number, healthyCount:number,
 *           degraded:Array<{name:string,status:string,reason:string}>,
 *           missing:string[], head:string, detail:string, fix:string}} p
 */
export function buildTaskHealthAdvisoryRecord(p) {
  const degraded = Array.isArray(p.degraded) ? p.degraded : [];
  const missing = Array.isArray(p.missing) ? p.missing : [];
  const routed = routeDegradedToOwners([...degraded.map((d) => d.name), ...missing]);
  return {
    ts: p.ts,
    from: "fleet-task-health-watch",
    kind: "task-health",
    level: p.level,
    taskCount: p.taskCount,
    healthyCount: p.healthyCount,
    degraded,
    missing,
    to: routed.to,                 // owner slots responsible (deterministic, R5)
    ownersByTask: routed.byTask,
    message: `${p.head}: ${p.detail} -- ${p.fix}`
      + (routed.to.length ? ` [owners: ${routed.to.join(", ")}]` : ""),
  };
}

// ─── Audit (one pass) ───────────────────────────────────────────────────────

/**
 * Run one full audit: sample tasks → classify → aggregate → telemetry +
 * advisory. Returns a structured result; throws only on a measurement failure
 * (the caller maps that to exit 3).
 */
// --- Auto-re-enable guard (G10) ---------------------------------------------

/**
 * Select the crash-critical tasks that are SAFE to auto-re-enable.
 *
 * The recurring failure (precedent 2bc54961b re-enabled 7; 2026-06-09 re-enabled
 * an 8th, "PRISM Zombie Reaper v2"): a crash-critical reaper silently lands in
 * the Disabled state (Windows update, a peer disable, a crash mid-registration).
 * Until now the watchdog only NAGGED -- a WARN every audit until a human ran
 * `Enable-ScheduledTask` by hand. This makes the WARN self-healing.
 *
 * SAFE = the task is (a) currently `disabled` AND (b) a known CRASH_CRITICAL task
 * AND (c) NOT in EXPECTED_DISABLED_TASKS. The HW-migration freeze is deliberately
 * NOT a gate here: aggregateHealth excuses a disabled task under the freeze ONLY
 * when it is NON-load-bearing (`migrationFreezeActive && !loadBearing.has(name)`,
 * line ~764). A crash-critical task IS load-bearing, so the freeze NEVER excuses
 * it -- aggregateHealth still flags it `crashCritDegraded` -- so the guard must be
 * allowed to re-enable it to MATCH that determination. EXPECTED_DISABLED_TASKS is
 * the ONLY "operator chose this" signal for a crash-critical task. (A prior blanket
 * `if (freeze) return []` made this guard a no-op for the entire weeks-long HW-
 * migration freeze -- caught by live validation on PRISM Zombie Reaper v2,
 * 2026-06-09: disabled crash-critical, guard fired nothing.) Pure -- no IO,
 * deterministic, the testable invariant (R9).
 *
 * Restoring (Enable) a known-good safety net is the INVERSE of the golf-soul
 * refuse ("disabling own watchdog") and is explicitly permitted. This function
 * NEVER selects a task to disable -- it only ever returns enable candidates.
 *
 * @param {Array<{name:string,status:string}>} classified  runOnce's classified[]
 * @param {{crashCritical:string[], expectedDisabled:string[], migrationFreezeActive:boolean}} cfg
 * @returns {string[]} task names safe to Enable-ScheduledTask (possibly empty)
 */
export function selectReenableTargets(classified, cfg) {
  if (!Array.isArray(classified)) return [];
  // NB: migrationFreezeActive is intentionally NOT consulted -- see the JSDoc.
  // A crash-critical task is load-bearing and the freeze never excuses it.
  const crash = new Set(Array.isArray(cfg && cfg.crashCritical) ? cfg.crashCritical : []);
  const expected = new Set(Array.isArray(cfg && cfg.expectedDisabled) ? cfg.expectedDisabled : []);
  const out = [];
  const seen = new Set();
  for (const t of classified) {
    if (!t || typeof t !== "object") continue;
    const name = String(t.name || "").trim();
    if (!name || seen.has(name)) continue;
    if (t.status === "disabled" && crash.has(name) && !expected.has(name)) {
      out.push(name);
      seen.add(name);
    }
  }
  return out;
}

/** PowerShell single-quote a literal (double any embedded single-quote). */
function psSingleQuote(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

/**
 * Re-enable each named scheduled task via `Enable-ScheduledTask`. NON-elevated
 * succeeds for user-owned PRISM tasks (verified 2026-06-09 on "PRISM Zombie
 * Reaper v2"); a task whose principal needs elevation returns ok:false WITH the
 * error so the caller surfaces the elevated one-liner instead of lying that it
 * healed (R12). Side-effecting but `_spawn`-injectable for tests; an empty
 * target list spawns NOTHING (no PowerShell, no side effect -- the test
 * invariant that proves a clean fleet never forks a shell).
 *
 * @param {string[]} targets
 * @param {{timeoutMs?:number, _spawn?:Function}} [io]
 * @returns {Array<{name:string, ok:boolean, error:string|null}>}
 */
export function reenableTasks(targets, io = {}) {
  if (!Array.isArray(targets) || targets.length === 0) return [];
  const spawn = io._spawn || spawnSync;
  const timeoutMs = Number.isFinite(io.timeoutMs) ? io.timeoutMs
    : Number(process.env.PRISM_FLEET_TASKHEALTH_PS_TIMEOUT_MS) || DEFAULT_PS_TIMEOUT_MS;
  const results = [];
  for (const raw of targets) {
    const name = String(raw || "").trim();
    if (!name) continue;
    const ps = `$ErrorActionPreference='Stop'; Enable-ScheduledTask -TaskName ${psSingleQuote(name)} | Out-Null; Write-Output 'OK'`;
    let ok = false;
    let error = null;
    try {
      const res = spawn("powershell.exe",
        ["-NoProfile", "-NoLogo", "-NonInteractive", "-Command", ps],
        { encoding: "utf8", timeout: timeoutMs, windowsHide: true });
      if (res.error) error = res.error.code || res.error.message || "spawn-failed";
      else if (res.status !== 0) error = `exit ${res.status}: ${(res.stderr || "").trim().slice(0, 200)}`;
      else if (!/OK/.test(res.stdout || "")) error = `no-confirm: ${(res.stdout || "").trim().slice(0, 100)}`;
      else ok = true;
    } catch (e) {
      error = (e && e.message) ? e.message.slice(0, 200) : "exception";
    }
    results.push({ name, ok, error: ok ? null : (error || "unknown") });
  }
  return results;
}

export function runOnce(opts = {}) {
  const disabled = process.env.PRISM_FLEET_TASKHEALTH_DISABLE === "1";
  const staleMultiplier = Number(process.env.PRISM_FLEET_TASKHEALTH_STALE_MULT) || DEFAULT_STALE_MULTIPLIER;
  const cooldownSec = Number(process.env.PRISM_FLEET_TASKHEALTH_ADVISORY_COOLDOWN_SEC) || DEFAULT_ADVISORY_COOLDOWN_SEC;
  const cfg = { staleMultiplier, cooldownSec };
  const dryRun = !!opts.dryRun || disabled;
  const noAdvisory = !!opts.noAdvisory;

  const sample = (opts.sampler || sampleScheduledTasks)({ timeoutMs: opts.timeoutMs });
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();

  // Classify every enumerated task.
  const classified = [];
  for (const raw of sample.tasks) {
    if (!raw || typeof raw !== "object") continue;
    const name = String(raw.name || "").trim();
    if (!name) continue;
    const lastRunTimeMs = raw.lastRunTime ? Date.parse(raw.lastRunTime) : null;
    // nextRunTime is emitted by the PS sampler as `.ToUniversalTime().ToString('o')`
    // — ISO 8601, so Date.parse here is locale-independent (unlike raw schtasks output).
    const nextRunTimeMs = raw.nextRunTime ? Date.parse(raw.nextRunTime) : null;
    const intervalMs = smallestIntervalMs(raw.triggerIntervals);
    const verdict = classifyTask({
      state: raw.state,
      lastRunTimeMs: Number.isFinite(lastRunTimeMs) ? lastRunTimeMs : null,
      nextRunTimeMs: Number.isFinite(nextRunTimeMs) ? nextRunTimeMs : null,
      lastTaskResult: Number.isFinite(raw.lastTaskResult) ? raw.lastTaskResult : null,
      intervalMs,
    }, nowMs, cfg);
    classified.push({
      name,
      status: verdict.status,
      reason: verdict.reason,
      state: String(raw.state || "").trim(),
      lastRunTime: raw.lastRunTime || null,
      lastTaskResult: Number.isFinite(raw.lastTaskResult) ? raw.lastTaskResult : null,
      intervalMs,
    });
  }

  const agg = aggregateHealth(classified, {
    mustExist: MUST_EXIST_TASKS,
    crashCritical: CRASH_CRITICAL_TASKS,
    knownTasks: KNOWN_PRISM_TASKS,
    expectedUnregistered: EXPECTED_UNREGISTERED_TASKS,
    expectedDisabled: EXPECTED_DISABLED_TASKS,
    migrationFreezeActive: isMigrationFreezeActive(),
  });

  // Auto-re-enable guard (G10): self-heal a disabled crash-critical task instead
  // of nagging. Detect + Enable (never Disable; gated by EXPECTED_DISABLED +
  // migration freeze inside selectReenableTargets). Honest (R12): a failed enable
  // (needs elevation) is reported failed, NOT healed; the row keeps the
  // as-sampled `disabled` status and the NEXT audit re-checks (one-Stop lag).
  // Skipped on dryRun (no mutation) and under PRISM_FTH_AUTO_REENABLE_DISABLE=1.
  let autoReenable = null;
  if (!dryRun && process.env.PRISM_FTH_AUTO_REENABLE_DISABLE !== "1") {
    // Wrapped so the audit (which runs on every fleet Stop) can NEVER be aborted
    // by a re-enable failure -- a structural no-abort guarantee, not one inferred
    // from callee purity. On a throw the telemetry/ledger writes below still run
    // and the failure is recorded honestly (R12), self-healing next audit.
    let reTargets = [];
    try {
      reTargets = selectReenableTargets(classified, {
        crashCritical: CRASH_CRITICAL_TASKS,
        expectedDisabled: EXPECTED_DISABLED_TASKS,
      });
      if (reTargets.length) {
        const reResults = (opts.reenabler || reenableTasks)(reTargets, { timeoutMs: opts.timeoutMs });
        autoReenable = {
          attempted: reTargets,
          healed: reResults.filter((r) => r.ok).map((r) => r.name),
          failed: reResults.filter((r) => !r.ok).map((r) => ({ name: r.name, error: r.error })),
        };
      }
    } catch (e) {
      const msg = (e && e.message) ? String(e.message).slice(0, 200) : "reenable-block-threw";
      autoReenable = { attempted: reTargets, healed: [], failed: reTargets.map((n) => ({ name: n, error: msg })) };
    }
  }

  // U-FTH-FOLLOWUP-SELF-DISC: compare hardcoded KNOWN_PRISM_TASKS against
  // installer-registered names. Advisory-only — never elevates audit level.
  // `discovered` is fail-soft: empty Set (dir missing / no scripts) -> no
  // drift surfaced. Injectable via opts.discoverInstallers for tests.
  const discoverFn = opts.discoverInstallers || discoverInstallerTasks;
  const discovered = discoverFn({});
  const installerDrift = detectInstallerDrift(discovered, KNOWN_PRISM_TASKS);

  const ts = new Date(nowMs).toISOString();
  const healthyCount = classified.filter((t) => t.status === "healthy").length;
  const row = {
    ts,
    level: agg.level,
    taskCount: classified.length,
    healthyCount,
    degraded: agg.degraded.map((t) => ({ name: t.name, status: t.status, reason: t.reason })),
    missing: agg.missing,
    expectedUnregistered: agg.expectedUnregistered,
    expectedDisabled: agg.expectedDisabled,
    migrationFreezeActive: isMigrationFreezeActive(),
    tasks: classified.map((t) => ({
      name: t.name, status: t.status, state: t.state,
      lastRunTime: t.lastRunTime, lastTaskResult: t.lastTaskResult,
    })),
    installerDrift: {
      hasDrift: installerDrift.hasDrift,
      missingFromHardcoded: installerDrift.missingFromHardcoded,
      staleInHardcoded: installerDrift.staleInHardcoded,
    },
    autoReenable,   // {attempted,healed,failed} | null (G10 self-heal outcome)
  };

  const ledger = readLedger();
  const adv = decideAdvisory(agg.level, ledger, nowMs, cfg);

  const writes = { telemetry: false, ledger: false, advisory: false, autoheal: false, reenableLedger: false };
  if (!dryRun) {
    appendTelemetry(row);
    writes.telemetry = true;
    writeLedger(adv.newLedger);
    writes.ledger = true;
    // One row per G10 heal attempt -> the re-enable ledger (crash-postmortem-digest
    // reads it for the FLAPPING flag). Gated with the other non-dryRun writes.
    if (autoReenable && Array.isArray(autoReenable.attempted) && autoReenable.attempted.length) {
      const ledgerRows = buildReenableLedgerRows(autoReenable.attempted, autoReenable.healed, new Date(nowMs).toISOString());
      appendReenableLedger(ledgerRows, opts.reenableLedgerPath);
      writes.reenableLedger = true;
    }
    if (adv.emit && !noAdvisory) {
      const head = agg.level === "critical"
        ? `PRISM scheduled-task safety net CRITICAL`
        : `PRISM scheduled-task safety net degraded (WARN)`;
      const detail = agg.reasons.slice(0, 6).join(" · ");
      const fix = "re-register a missing/disabled task from an ELEVATED shell: "
        + "the installer is .claude/helpers/install-<task>-task.ps1 "
        + "(e.g. install-fleet-reaper-task.ps1 -RunNow). A Disabled task: Enable-ScheduledTask -TaskName '<name>'.";
      appendChatBus(buildTaskHealthAdvisoryRecord({
        ts, level: agg.level, taskCount: classified.length, healthyCount,
        degraded: row.degraded, missing: agg.missing, head, detail, fix,
      }));
      writes.advisory = true;
    }
    // G10: an auto-re-enable that actually acted (healed or failed) is always
    // logged to the chat bus, independent of the WARN advisory cooldown -- a
    // safety net being restored (or failing to restore) is too important to
    // throttle. Honest split: healed names vs. names that still need elevation.
    if (autoReenable && (autoReenable.healed.length || autoReenable.failed.length)) {
      // Route the tasks that still need an ELEVATED enable to their owner slot so
      // the responsible chat sees its own task on the bus (deterministic, R5).
      const healRouted = routeDegradedToOwners(autoReenable.failed.map((f) => f.name));
      appendChatBus({
        ts,
        from: "fleet-task-health-watch",
        kind: "task-health-autoheal",
        level: autoReenable.failed.length ? "warn" : "info",
        healed: autoReenable.healed,
        failed: autoReenable.failed,
        to: healRouted.to,
        ownersByTask: healRouted.byTask,
        message: autoReenable.healed.length
          ? `auto-re-enabled ${autoReenable.healed.length} crash-critical task(s): ${autoReenable.healed.join(", ")}`
            + (autoReenable.failed.length
                ? ` -- ${autoReenable.failed.length} still need an ELEVATED Enable-ScheduledTask: ${autoReenable.failed.map((f) => f.name).join(", ")}`
                : "")
          : `auto-re-enable FAILED (needs elevation) for: ${autoReenable.failed.map((f) => f.name).join(", ")}`
            + " -- run from an ELEVATED shell: Enable-ScheduledTask -TaskName '<name>'",
      });
      writes.autoheal = true;
    }
  }

  const exitCode = agg.level === "critical" ? 2 : agg.level === "warn" ? 1 : 0;
  return { row, level: agg.level, aggregate: agg, classified, advisory: adv, writes, exitCode, cfg, dryRun, disabled, autoReenable };
}

// ─── CLI plumbing ───────────────────────────────────────────────────────────

function parseFlags(argv) {
  const a = new Set(argv);
  const idx = (flag) => argv.indexOf(flag);
  const valAfter = (flag) => { const i = idx(flag); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null; };
  return {
    json: a.has("--json"),
    status: a.has("--status"),
    history: a.has("--history"),
    historyN: Number(valAfter("--history")) > 0 ? Number(valAfter("--history")) : 20,
    reset: a.has("--reset"),
    noAdvisory: a.has("--no-advisory"),
    dryRun: a.has("--dry-run"),
    help: a.has("--help") || a.has("-h"),
  };
}

const HELP = `fleet-task-health-watch.mjs — health watchdog over PRISM's scheduled-task safety net.

Usage:
  node fleet-task-health-watch.mjs                # one audit, text summary
  node fleet-task-health-watch.mjs --once --json  # one audit, JSON
  node fleet-task-health-watch.mjs --status       # read-only ledger summary
  node fleet-task-health-watch.mjs --history [N]  # tail N telemetry rows (default 20)
  node fleet-task-health-watch.mjs --reset        # clear telemetry + ledger
  node fleet-task-health-watch.mjs --no-advisory  # audit + telemetry only
  node fleet-task-health-watch.mjs --dry-run      # full audit, no writes
  node fleet-task-health-watch.mjs --help

Knobs: see file header.
Exit: 0 clean · 1 warn · 2 critical · 3 measurement/IO failure.`;

function fmtSummary(r) {
  const tag = r.level === "critical" ? "[CRIT]" : r.level === "warn" ? "[WARN]" : "[OK]";
  const deg = r.row.degraded.length
    ? " · " + r.row.degraded.map((d) => `${d.name}=${d.status}`).join(", ")
    : "";
  const miss = r.row.missing.length ? ` · missing: ${r.row.missing.join(", ")}` : "";
  const deferred = r.row.expectedUnregistered && r.row.expectedUnregistered.length
    ? ` · deferred(${r.row.expectedUnregistered.length}): ${r.row.expectedUnregistered.join(", ")}`
    : "";
  const advNote = r.writes.advisory ? " advisory-emitted"
    : r.advisory.emit ? " advisory-suppressed(--no-advisory)"
    : r.level !== "clean" ? ` advisory-skipped(${r.advisory.reason})` : "";
  const dry = r.dryRun ? " [dry-run]" : "";
  return `${tag} fleet-task-health: ${r.row.healthyCount}/${r.row.taskCount} PRISM tasks healthy${deg}${miss}${deferred}${advNote}${dry}`;
}

function cmdStatus() {
  const ledger = readLedger();
  let lastRow = null;
  try {
    if (existsSync(TELEMETRY_PATH)) {
      const lines = readFileSync(TELEMETRY_PATH, "utf8").trim().split(/\r?\n/);
      const last = lines[lines.length - 1];
      if (last) lastRow = JSON.parse(last);
    }
  } catch { /* tolerate */ }
  return { ledger, lastRow };
}

function cmdHistory(n) {
  if (!existsSync(TELEMETRY_PATH)) return [];
  const lines = readFileSync(TELEMETRY_PATH, "utf8").trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-n).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
}

function cmdReset() {
  for (const p of [TELEMETRY_PATH, TELEMETRY_BACKUP, LEDGER_PATH]) {
    try { if (existsSync(p)) renameSync(p, p + ".reset-" + Date.now()); } catch { /* ignore */ }
  }
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) { console.log(HELP); process.exit(0); }

  if (flags.reset) {
    cmdReset();
    console.log("fleet-task-health-watch: telemetry + ledger reset");
    process.exit(0);
  }

  if (flags.status) {
    const s = cmdStatus();
    if (flags.json) { console.log(JSON.stringify(s, null, 2)); process.exit(0); }
    if (!s.lastRow) { console.log("fleet-task-health-watch: no telemetry yet"); process.exit(0); }
    console.log(`fleet-task-health-watch [status] last audit ${s.lastRow.ts} level=${s.lastRow.level} `
      + `healthy=${s.lastRow.healthyCount}/${s.lastRow.taskCount} `
      + `degraded=${s.lastRow.degraded.length} missing=${s.lastRow.missing.length} `
      + `lastAdvisory=${s.ledger.lastAdvisoryAt || "never"}`);
    process.exit(0);
  }

  if (flags.history) {
    const rows = cmdHistory(flags.historyN);
    if (flags.json) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
    for (const r of rows) {
      console.log(`${r.ts} ${String(r.level).padEnd(8)} healthy=${r.healthyCount}/${r.taskCount} `
        + `degraded=${r.degraded.length}${r.missing.length ? ` missing=${r.missing.length}` : ""}`);
    }
    process.exit(0);
  }

  // --once / default
  let result;
  try {
    result = runOnce({ dryRun: flags.dryRun, noAdvisory: flags.noAdvisory });
  } catch (e) {
    if (flags.json) console.log(JSON.stringify({ ok: false, error: e.message, code: 3 }));
    else console.error(`[FAIL] fleet-task-health-watch: ${e.message}`);
    process.exit(3);
  }
  if (flags.json) console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  else console.log(fmtSummary(result));
  process.exit(result.exitCode);
}

// Run main only when invoked as a script (not when imported by tests).
const invokedAsScript = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  } catch { return false; }
})();
if (invokedAsScript) {
  try { main(); }
  catch (e) { console.error(`[FAIL] fleet-task-health-watch: ${e.message}`); process.exit(3); }
}
