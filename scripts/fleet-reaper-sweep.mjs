// NOTE: no shebang. This file IS run as a CLI (--once / --monitor-loop / etc.)
// but ALL its invocations go through explicit `node X.mjs` (the scheduled task,
// the Stop-hook arm, the /fleet-reaper skill, the alpha-guardian) — never via
// chmod+x + `./X.mjs` direct execution. A line-1 `#!` is fine for node + esbuild
// + bash but vite's SSR transform does NOT strip it; it injects its preamble
// above, stranding `#!` mid-file and breaking the whole .claude/helpers/*.test.mjs
// vitest suite. Removing the vestigial shebang is the cleanest fix.
/**
 * fleet-reaper-sweep.mjs — slot-aware orphan process reaper for the 7-chat fleet.
 *
 * PRISM runs up to 7 concurrent Claude chats (alpha..foxtrot + golf). Each chat
 * spawns node.exe (hooks/helpers/MCP), bash.exe (the Bash tool), and git.exe
 * children. When a chat crashes or is closed WITHOUT firing its Stop hooks those
 * children are orphaned — they pin RAM and, across several dead chats, cause the
 * commit-memory pressure that destabilizes the surviving live chats.
 *
 * This is the slot-aware layer the existing generic reapers
 * (node-process-janitor, cleanup-orchestrator + 5 sub-cleaners) lack: it maps
 * every running node/git/bash PID to its owning chat slot via process ancestry
 * (process-slot-map.mjs) and reaps only those whose owning slot is provably dead
 * — gated by a confirm-after-N-ticks rule so a brief heartbeat gap never kills a
 * live chat's process.
 *
 * It does NOT re-run the generic lock/claim/bash cleaners — those stay with the
 * existing "PRISM Cleanup Orchestrator" scheduled task. This one owns exactly
 * the slot-attributed orphan layer.
 *
 * Kill gate (all must hold):
 *   - classifyProcess() returned `owned-by-crashed` or `unowned` (a reap CANDIDATE)
 *   - the process is older than the age floor (default 45s — never touch a
 *     just-spawned process whose slot hasn't heartbeated yet)
 *   - it has been continuously a candidate for >= killAfter * interval of
 *     wall-clock (default 2 * 300s = 10 min) — the "confirm-after-N-ticks" rule.
 *     Tracked by `firstSeenAt` in the candidate ledger, NOT a counter, so the
 *     gate is correct even when the Monitor + scheduled task + Stop hook all
 *     sweep independently. firstSeenAt resets the moment a PID stops being a
 *     candidate (its slot came back alive).
 *   - graduated memory pressure: >= memPressurePct drops the confirm window to
 *     one tick; >= memCriticalPct collapses it to zero (reap this sweep) —
 *     relieve faster when the box is actually struggling.
 *
 * Usage:
 *   node fleet-reaper-sweep.mjs                       # one sweep, text summary
 *   node fleet-reaper-sweep.mjs --once --json         # one sweep, JSON
 *   node fleet-reaper-sweep.mjs --status              # report only, no write/reap
 *   node fleet-reaper-sweep.mjs --dry-run             # classify + decide, never kill
 *   node fleet-reaper-sweep.mjs --monitor-loop        # poll forever (Monitor tool / loop)
 *   node fleet-reaper-sweep.mjs --monitor-loop --interval 300
 *   node fleet-reaper-sweep.mjs --once --stop-event   # invoked by the Stop hook
 *   Flags: --kill-after N  --age-floor SEC  --interval SEC  --help
 *
 * Env knobs (CLI flags win over env):
 *   PRISM_FLEET_REAPER_DISABLE=1          sweep refuses to kill anything
 *   PRISM_FLEET_REAPER_DRY_RUN=1          same as --dry-run
 *   PRISM_FLEET_REAPER_KILL_AFTER=N       default 2
 *   PRISM_FLEET_REAPER_AGE_FLOOR_SEC=N    default 45
 *   PRISM_FLEET_REAPER_INTERVAL_SEC=N     default 300
 *   PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=N default 90
 *   PRISM_FLEET_REAPER_MEM_CRITICAL_PCT=N default 95
 *   PRISM_FLEET_REAPER_BALLAST_MB=N default 256 (0 disables the cushion)
 *   PRISM_FLEET_REAPER_SERVICE_RESTART=1 auto-restart wedged Qdrant/Postgres/
 *     Prometheus containers under critical pressure (default: advise-only)
 *
 * Exit codes: 0 ok · 1 sweep completed but reported a problem · 2 misuse.
 */

import { execFileSync, spawn } from "node:child_process";
import {
  appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync,
  unlinkSync, writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import { snapshotFleet, enumerateProcesses, getLastEnumerationError } from "../.claude/helpers/process-slot-map.mjs";
// FLEET-REAPER-MS2/U-FR-S2: enumeration cache cuts duplicate PS5.1
// Get-CimInstance cost ~70% under burst load (12-chat × 2-PC fleet with
// scheduled-task + Stop-hook + Monitor overlapping). Per-host keyed,
// atomic write, fail-soft stale fallback. Kill switch:
// PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE=1. TTL knob:
// PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC (default 60, clamped 5..3600).
import { enumerateProcessesCached } from "../.claude/helpers/fleet-reaper-enum-cache.mjs";
// FLEET-REAPER-MS3/U-FR-HOST-PRESETS: per-PC env overlay so the same code does
// the right thing on dissimilar PCs (home: 16GB GPU + 7B model + 90% mem floor;
// work: 8GB GPU + 3B model + 85% mem floor). Loaded ONCE at module top so the
// scheduled task (which has no shell env-init step) picks up the preset on
// every run. Env always wins over preset (operator override preserved). The
// /fleet-reaper-home and /fleet-reaper-work skills are the operator-facing
// writers for this file.
import { applyHostPresetForCurrent } from "../.claude/helpers/fleet-reaper-host-presets.mjs";
const _hostPresetResult = applyHostPresetForCurrent();
if (_hostPresetResult.applied && process.env.PRISM_FLEET_REAPER_VERBOSE === "1") {
  console.error(`[fleet-reaper] host-preset "${_hostPresetResult.label}" applied for ${_hostPresetResult.host}: ${_hostPresetResult.appliedKeys.length} env key(s)`);
}
// FLEET-REAPER-MS3/U-FR-MS3-D: drop reaper self CPU priority during sweep so
// its file-I/O does not compete with claude.exe for the disk-queue on a
// memory-pressured host. Reversible (try/finally + beforeExit hook), idempotent,
// fail-soft. Skipped on non-Windows, dry-run, status mode, or with the
// PRISM_FR_SELF_BG_IO_DISABLE=1 / PRISM_FLEET_REAPER_DISABLE=1 kill switches.
import {
  beginBackgroundMode as _beginSelfIoGuard,
  endBackgroundMode as _endSelfIoGuard,
  registerExitRestore as _registerSelfIoExitRestore,
} from "./lib/reaper-self-io-priority.mjs";
// FLEET-REAPER-MS3/U-FR-MS3-B: Tier-1.5 bg-app throttle wedged BETWEEN
// soft-relief (Tier-1) and serviceRestart (Tier-2). Under pressure, drop
// top-N non-Claude heavy processes to BelowNormal; hysteresis-restore at
// memPressurePct-5. Pure helper + injected setter. Stamp file at
// state/shared/.fleet-reaper-bg-throttle.json carries the prior pids.
import {
  decideAction as _bgThrottleDecide,
  pickThrottleCandidates as _bgPickThrottleCandidates,
  buildStamp as _bgBuildStamp,
  readStamp as _bgReadStamp,
  clampTopN as _bgClampTopN,
  clampMinRssMb as _bgClampMinRssMb,
} from "./lib/bg-app-throttle.mjs";
import { setPriorityForPids as _setPriorityForPidsExternal } from "../.claude/helpers/claude-tree-priority.mjs";

/**
 * Default enumerator for CLI entry points (main + monitorLoop).
 *
 * The cache helper is OPT-OUT, not opt-in: any direct `runSweep({enumerator})`
 * caller (existing tests, advisory mode, hermetic harness) bypasses the cache
 * because they pre-set cfg.enumerator. Only the CLI defaults to cached.
 *
 * Cache misses (TTL elapsed, different host, corrupt, first run) fall through
 * to the raw `enumerateProcesses` — identical to pre-MS2 behavior. The result
 * is byte-identical for cache miss vs. no-cache; the win is only the bypass
 * on the cache hit path.
 */
function cachedEnumerate() {
  const result = enumerateProcessesCached({ enumerator: enumerateProcesses });
  // We discard fromCache/fromStaleCache/reason here — the snapshotFleet
  // contract only needs the procs array. The reason is observable in the
  // cache file's mtime + the sidecar's writtenAt field if an operator wants
  // to debug. Adding it to the sweep result struct is a future Tier-S task.
  return result.procs;
}
// Shared Ollama telemetry writer — best-effort, never throws (see its header).
// Sibling helper, ships together, no side effects on import. The coordinator
// records prewarm/hint decisions here so `/ollama-offload-dashboard` captures
// FLEET-REAPER-MS1 actions for free. Injectable via `opts.recordEvent` in tests.
// NOTE: `ollama-stats.mjs` hardcodes its stats path to the MAIN repo tree
// (`H:/prism/mcp-server/data/state/ollama-offload-stats.json`) — BY DESIGN. The
// offload dashboard is fleet-wide; a sweep running from a per-slot worktree
// still reports into the one canonical dashboard, not a worktree-local copy.
// Do not "fix" this to a worktree-relative path.
import { recordOllamaEvent } from "../.claude/hooks/lib/ollama-stats.mjs";
// U-FR-CRASH-WATCH: detect chat-slot crashes (heartbeat froze + chatId
// unchanged) and write a postmortem. STRICTLY ADDITIVE — never changes a
// reap decision. Pure-core + injected-IO; sibling lib, no import side effects.
import {
  snapshotSlotState, detectCrashes, formatPostmortemRow,
  readPrevSnapshot, writeSnapshot, appendPostmortems,
} from "./lib/fleet-reaper-crash-watch.mjs";
// U-FR-STUCK-HUNT (2026-05-21, slot:golf): stuck shells + fsmonitor orphans +
// stale slot PIDs. Pure-core sibling lib; the sweep owns the kill side-effect
// via the existing reapProcesses helper. Strictly additive; default-on but
// each hunter gates on its own PRISM_FR_HUNT_*_DISABLE env knob.
import { runStuckHunters, buildProtectedPidSet } from "./lib/fleet-reaper-stuck-hunters.mjs";
import { findMcpZombies, findStaleOrphanedNodes, buildStaleNodeProtectRegex } from "./lib/fleet-reaper-mcp-zombie-hunter.mjs";
// FLEET-REAPER cry-wolf fix (golf 2026-06-04): read-only preview of the CANONICAL
// reclaim so the stale-slot advisory reports the ACTUALLY-reclaimable subset
// (heartbeat-crashed AND window-pid-dead) instead of the weaker recorded-pid count.
import { previewReclaimable } from "../.claude/helpers/chat-slots.mjs";

// ─── Paths & constants ──────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SHARED_DIR = join(REPO_ROOT, "state", "shared");
const DEFAULT_LEDGER_PATH = join(SHARED_DIR, "fleet-reaper-candidates.json");
const DEFAULT_LOG_PATH = join(SHARED_DIR, "fleet-reaper.log");
// Append-only forensic trail for FLEET-REAPER-MS1 soft-relief actions. A
// DEDICATED file — deliberately NOT node-process-janitor.mjs's
// `.janitor-kills.jsonl`: that file is a *kills* log and every consumer reads
// it as such, so mixing non-kill events (priority demote, working-set trim)
// into it would corrupt the semantics. Record shape mirrors the janitor's
// `{ts,pid,ppid,name,reason}` core so a forensic parser can read both with one
// schema, plus `ownerSlot` + `rssReclaimedBytes` extras.
const DEFAULT_AUDIT_LOG_PATH = join(SHARED_DIR, ".fleet-reaper-actions.jsonl");
// U-FR-CRASH-WATCH: per-sweep slot-state snapshot (for crash diffing) +
// append-only chat-crash postmortem trail. Both under SHARED_DIR so a sweep
// from any worktree records into the one canonical fleet-wide forensic set.
const DEFAULT_CRASH_WATCH_SNAPSHOT_PATH = join(SHARED_DIR, "fleet-reaper-crash-watch-snapshot.json");
const DEFAULT_CRASH_POSTMORTEM_PATH = join(SHARED_DIR, "chat-crash-postmortems.jsonl");
// chat-slots.json canonical path (per chat-slots.mjs DEFAULT_STATE_PATH).
const DEFAULT_CHAT_SLOTS_PATH = join(SHARED_DIR, "chat-slots.json");
// TTL'd routing hint written by the Ollama coordinator, read by
// .claude/hooks/ollama-task-offloader.mjs. See knowledge/wiki/architecture/
// ollama-routing-hint.md for the full contract.
//
// Deliberately a FIXED absolute path — NOT SHARED_DIR-relative like the ledger
// / log / audit files above. Those are producer-private (this sweep reads its
// own ledger). The hint is a CROSS-PROCESS contract: the consumer is a hook
// (`ollama-task-offloader.mjs`) pinned to the main tree (`H:/prism`), so the
// producer and consumer MUST agree on one canonical location regardless of
// which worktree the sweep itself runs from. The consumer hardcodes the
// identical literal — keep the two in sync.
const DEFAULT_HINT_PATH = "H:/prism/state/shared/.ollama-routing-hint.json";
const LOG_ROTATE_BYTES = 256 * 1024;

export const LEDGER_SCHEMA_VERSION = 1;
export const DEFAULT_INTERVAL_SEC = 300;
export const DEFAULT_AGE_FLOOR_SEC = 45;
export const DEFAULT_KILL_AFTER = 2;
export const DEFAULT_MEM_PRESSURE_PCT = 90;
// FLEET-REAPER-MS1 Tier 1: a second, higher band above the warn pressure %.
// warn band (>= MEM_PRESSURE_PCT) drops the confirm window to one tick;
// critical band (>= MEM_CRITICAL_PCT) collapses it to zero — a candidate that
// is still a candidate at a critical-pressure sweep is reaped THIS tick rather
// than after another interval. Knob: PRISM_FLEET_REAPER_MEM_CRITICAL_PCT.
export const DEFAULT_MEM_CRITICAL_PCT = 88;  // 2026-05-17: lowered 95→88 (OPT-2) so critical-mode immediate-reap kicks in earlier — relieves host commit BEFORE Ollama CUDA-pinned-host alloc fails fleet-wide.
// FLEET-REAPER-MS1 Tier 1: critical-pressure memory ballast. A Buffer reserved
// at CLI boot and released the first time a sweep reports the critical band.
// On Windows commit charge is taken at allocation (not first touch), so a held
// 256MB Buffer measurably inflates the very commit-pressure metric the reaper
// gates on — and handing it back at the >= memCriticalPct alarm frees ~256MB
// at exactly the moment the sweep needs headroom to enumerate + kill (the
// documented OOM-blinding failure mode: under ~96% commit even the reaper's own
// PowerShell enumeration can fail). Knob: PRISM_FLEET_REAPER_BALLAST_MB (0=off).
export const DEFAULT_BALLAST_MB = 256;
const MAX_BALLAST_MB = 4096;

// ── FLEET-REAPER-MS1 Layer 1: soft RAM/CPU relief ──
// Under memory pressure, processes owned by STALE chat slots (no heartbeat in
// 2-10 min — see process-slot-map.mjs) get a reversible nudge: CPU priority
// dropped to BelowNormal + working set trimmed. Neither is a kill — Windows
// re-pages on demand and a slot that revives just re-raises its own priority.
export const DEFAULT_SOFT_RELIEF_AGE_SEC = 180; // min process age before a nudge
export const DEFAULT_SOFT_RELIEF_PRESSURE_PCT = 90; // mem% gate (mirrors mem-pressure)
const MAX_SOFT_RELIEF_AGE_SEC = 86400;
// 2026-05-17 SOFT-RELIEF-V2: under critical pressure, also trim large helper
// processes of ALIVE slots. Investigation showed `owned-by-stale` is transient
// (`chat-slots reclaim` immediately converts it to free → unowned), so the
// stale-only filter fired `targets:0` on every sweep this session despite
// 99% commit pressure. Working-set trim is REVERSIBLE — Windows pages back
// what's actively touched. Trimming a 100MB+ idle hook/bash subproc of a
// live chat is safe: working procs page back in ms; idle ones return RAM to
// the pool. Gate is criticalPressure ONLY (not warn) — preserves the prior
// "never touch live work unless it's the actual emergency" invariant.
export const DEFAULT_SOFT_RELIEF_ALIVE_RSS_MB = 100; // per-proc RSS floor for alive-slot trim
const MAX_SOFT_RELIEF_ALIVE_RSS_MB = 32768;

// ── FLEET-REAPER-MS1 Layer 2/3: GPU + Ollama coordinator ──
// The RTX-class GPU sits near-idle while commit memory is critical. When the
// box is under pressure AND the GPU has headroom AND Ollama is reachable, the
// coordinator pre-warms a local model and writes a routing hint that nudges
// ollama-task-offloader.mjs to absorb more hook-eligible work — converting
// idle VRAM into Claude-CLI throughput instead of adding more kills.
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_PREWARM_MODEL = "qwen2.5-coder:32b";
// 2026-05-17 U-FR-OLLAMA-KEEP-ALIVE-1H set "-1" (never unload) on the 16GB RTX
// 4080 box to kill a 7B cold-load loop — pinning 4.4GB of idle VRAM was cheap there.
// 2026-06-08 (golf, R7 override — hardware changed): the box is now the 96GB
// Blackwell. A pinned model's HOST private bytes count against the COMMIT limit
// (RAM+pagefile), NOT just VRAM. With OLLAMA_MAX_LOADED_MODELS up to 6 LARGE models
// (qwen2.5-coder:32b=37GB + gpt-oss:20b=13GB + qwen3-vl:8b + embed) the daemon
// pinned ~70GB of host commit FOREVER → the PRESSURE GATE hit 96-98% and blocked
// session-end (crash-cascade risk) every turn. "30m" keeps the ACTIVE prewarm model
// warm (no cold-load loop for live work) while idle models evict and release commit.
// The original cold-load concern is moot: a 30m TTL only evicts after 30m idle, and
// the Blackwell loads a 32B in seconds, not 40s. Override: env
// PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE="-1" to restore pin-forever.
// See reference_ollama_keepalive_commit_leak_2026_06_08 + 05-soft-config-tweaks.ps1 (blackwell tier).
export const DEFAULT_OLLAMA_KEEP_ALIVE = "30m";
export const DEFAULT_HINT_TTL_SEC = 300;          // hint validity == one sweep interval
export const DEFAULT_GPU_FREE_MIN_MB = 2048;      // GPU headroom floor to act
export const DEFAULT_HINT_THRESHOLD_DELTA = 0.15; // magnitude; applied negatively
export const HINT_SCHEMA_VERSION = 1;
const HINT_THRESHOLD_DELTA_CAP = 0.30;            // hard clamp on |thresholdDelta|
const MAX_HINT_TTL_SEC = 3600;
const PROBE_TIMEOUT_MS = 4000;       // curl / nvidia-smi probe ceiling
const PROBE_TIMEOUT_SEC = 3;         // curl -m value (kept under PROBE_TIMEOUT_MS)
const PROBE_MAX_BUFFER = 4 * 1024 * 1024;
// Prewarm POST is detached + unref'd (never blocks the sweep) but still gets a
// curl max-time so a wedged Ollama can't leave the detached curl alive forever.
// Larger than PROBE_TIMEOUT_SEC: a cold model load is genuinely slow.
const PREWARM_CURL_TIMEOUT_SEC = 30;

const LEDGER_LOCK_TIMEOUT_MS = 3000;
const PS_TIMEOUT_MS = 10000;
const PS_MAX_BUFFER = 64 * 1024 * 1024; // stdout ceiling for PowerShell forks
const MIN_INTERVAL_SEC = 30;     // floor — a tighter loop just churns PowerShell
const MAX_INTERVAL_SEC = 3600;   // ceiling — an hour between sweeps is the useful max
const MAX_AGE_FLOOR_SEC = 86400; // 24h — an age floor beyond a day is nonsensical
const MAX_KILL_AFTER = 100;      // confirm-tick ceiling — beyond this is effectively "never"
const LOCK_RETRY_MIN_MS = 40;    // ledger-lock retry backoff floor
const LOCK_RETRY_JITTER_MS = 60; // ledger-lock retry backoff jitter

// ─── PowerShell resolution (trivial path-picker; mirrors process-slot-map.mjs) ──

function resolvePowershell() {
  const abs = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
  try { if (existsSync(abs)) return abs; } catch { /* fall through */ }
  return "powershell.exe";
}

// ─── Memory pressure ────────────────────────────────────────────────────────

/**
 * Read host memory pressure. Returns physical + commit used-% and the max of
 * the two (commit pressure causes the `xmalloc: cannot allocate` failures the
 * fleet actually hits; physical pressure causes thrash). Never throws — an OS
 * failure degrades to all-null (treated as "no pressure", the safe direction).
 */
export function readHostMemory() {
  try {
    if (process.platform === "win32") {
      const psFile = join(
        tmpdir(), `prism-fleet-reaper-mem-${process.pid}-${randomBytes(4).toString("hex")}.ps1`,
      );
      writeFileSync(psFile, [
        "$ErrorActionPreference='SilentlyContinue'",
        "$os = Get-CimInstance Win32_OperatingSystem",
        "[pscustomobject]@{",
        "  physTotalMb   = [math]::Round([int64]$os.TotalVisibleMemorySize / 1024)",
        "  physFreeMb    = [math]::Round([int64]$os.FreePhysicalMemory / 1024)",
        "  commitTotalMb = [math]::Round([int64]$os.TotalVirtualMemorySize / 1024)",
        "  commitFreeMb  = [math]::Round([int64]$os.FreeVirtualMemory / 1024)",
        "} | ConvertTo-Json -Compress",
      ].join("\n"), "utf-8");
      try {
        const raw = execFileSync(
          resolvePowershell(),
          ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", psFile],
          { timeout: PS_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, killSignal: "SIGKILL" },
        );
        return finalizeMemory(JSON.parse(String(raw || "{}").trim() || "{}"));
      } finally {
        try { unlinkSync(psFile); } catch { /* best-effort */ }
      }
    }
    // POSIX: /proc/meminfo (Linux). Commit ≈ physical here — good enough fallback.
    const mi = readFileSync("/proc/meminfo", "utf-8");
    const kb = (key) => {
      const m = mi.match(new RegExp(`^${key}:\\s+(\\d+)\\s+kB`, "m"));
      return m ? Number(m[1]) : null;
    };
    const total = kb("MemTotal");
    const avail = kb("MemAvailable");
    if (total == null || avail == null) return finalizeMemory({});
    return finalizeMemory({
      physTotalMb: Math.round(total / 1024), physFreeMb: Math.round(avail / 1024),
      commitTotalMb: Math.round(total / 1024), commitFreeMb: Math.round(avail / 1024),
    });
  } catch {
    return finalizeMemory({});
  }
}

function pct(total, free) {
  if (!Number.isFinite(total) || !Number.isFinite(free) || total <= 0) return null;
  return Math.round(((total - free) / total) * 1000) / 10; // one decimal place
}

function finalizeMemory(raw) {
  const physTotalMb = Number(raw.physTotalMb);
  const physFreeMb = Number(raw.physFreeMb);
  const commitTotalMb = Number(raw.commitTotalMb);
  const commitFreeMb = Number(raw.commitFreeMb);
  const physUsedPct = pct(physTotalMb, physFreeMb);
  const commitUsedPct = pct(commitTotalMb, commitFreeMb);
  const candidates = [physUsedPct, commitUsedPct].filter((v) => Number.isFinite(v));
  return {
    physTotalMb: Number.isFinite(physTotalMb) ? physTotalMb : null,
    physFreeMb: Number.isFinite(physFreeMb) ? physFreeMb : null,
    commitTotalMb: Number.isFinite(commitTotalMb) ? commitTotalMb : null,
    commitFreeMb: Number.isFinite(commitFreeMb) ? commitFreeMb : null,
    physUsedPct,
    commitUsedPct,
    usedPct: candidates.length ? Math.max(...candidates) : null,
  };
}

// ─── Candidate ledger ───────────────────────────────────────────────────────

function readLedger(ledgerPath) {
  try {
    if (!existsSync(ledgerPath)) return { schemaVersion: LEDGER_SCHEMA_VERSION, candidates: {} };
    const parsed = JSON.parse(readFileSync(ledgerPath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || typeof parsed.candidates !== "object" ||
        parsed.candidates === null || Array.isArray(parsed.candidates)) {
      return { schemaVersion: LEDGER_SCHEMA_VERSION, candidates: {} };
    }
    return { schemaVersion: parsed.schemaVersion || LEDGER_SCHEMA_VERSION, candidates: parsed.candidates };
  } catch {
    return { schemaVersion: LEDGER_SCHEMA_VERSION, candidates: {} };
  }
}

/** PID-reuse-safe ledger key. createdMs distinguishes a reused PID number. */
function ledgerKey(c) {
  return `${c.pid}:${Number.isFinite(c.createdMs) ? c.createdMs : "x"}`;
}

/**
 * Merge the current candidate set into the prior ledger.
 *  - a candidate already tracked KEEPS its `firstSeenAt` (the confirm clock)
 *  - a brand-new candidate gets `firstSeenAt = now`
 *  - a prior entry NOT in the current set is DROPPED — so `firstSeenAt` resets
 *    if a PID stops being a candidate (its slot revived) and reappears later.
 * Pure — no I/O. `now` injectable.
 */
export function updateLedger(prevLedger, candidates, now) {
  const prev = (prevLedger && prevLedger.candidates) || {};
  const next = {};
  for (const c of candidates) {
    const key = ledgerKey(c);
    const existing = prev[key];
    const firstSeenAt = existing && Number.isFinite(existing.firstSeenAt) ? existing.firstSeenAt : now;
    const sweeps = existing && Number.isInteger(existing.sweeps) ? existing.sweeps + 1 : 1;
    next[key] = {
      pid: c.pid,
      createdMs: Number.isFinite(c.createdMs) ? c.createdMs : null,
      name: c.name || "",
      class: c.class,
      ownerSlot: c.ownerSlot || null,
      firstSeenAt,
      lastSeenAt: now,
      sweeps,
    };
  }
  return {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    lastUpdated: new Date(now).toISOString(),
    candidates: next,
  };
}

function writeLedgerAtomic(ledger, ledgerPath) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  const tmp = `${ledgerPath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledger, null, 2), "utf-8");
  renameSync(tmp, ledgerPath);
}

/** Synchronous sleep without a CPU busy-spin (Atomics.wait on a throwaway SAB). */
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
  } catch {
    const end = Date.now() + ms; // SharedArrayBuffer unavailable — bounded fallback
    while (Date.now() < end) { /* */ }
  }
}

/**
 * Best-effort serialization of the ledger read-merge-write. This is NOT a true
 * mutex — the stale-lock break is non-atomic, so two sweepers can briefly both
 * believe they hold it. That is acceptable BY DESIGN: the worst case of a race
 * is a lost `firstSeenAt` — either a candidate's confirm-clock restarts, or a
 * freshly added entry is dropped and re-added next sweep. Both only DELAY a reap
 * by a cycle; neither can cause an erroneous kill, because the kill gate
 * requires `firstSeenAt` to be OLD. Lock failure is likewise non-fatal — we
 * proceed and note it in caveats.
 */
function withLedgerLock(lockPath, fn) {
  const start = Date.now();
  let acquired = false;
  while (Date.now() - start < LEDGER_LOCK_TIMEOUT_MS) {
    try {
      mkdirSync(dirname(lockPath), { recursive: true });
      writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}`, { flag: "wx" });
      acquired = true;
      break;
    } catch {
      try {
        const st = statSync(lockPath);
        if (Date.now() - st.mtimeMs > LEDGER_LOCK_TIMEOUT_MS) {
          writeFileSync(lockPath, `${process.pid}`, { flag: "w" }); // break stale lock
          acquired = true;
          break;
        }
      } catch { /* lock vanished mid-check — retry */ }
      sleepSync(LOCK_RETRY_MIN_MS + Math.random() * LOCK_RETRY_JITTER_MS);
    }
  }
  try {
    return fn(acquired);
  } finally {
    if (acquired) { try { unlinkSync(lockPath); } catch { /* best-effort */ } }
  }
}

// ─── Reap decision ──────────────────────────────────────────────────────────

/**
 * Decide whether a confirmed candidate may be reaped THIS sweep.
 * Pure. Returns { reap, reason }.
 *
 * @param {object} entry      the candidate's ledger entry (has firstSeenAt)
 * @param {object} candidate  the current classifyProcess() result
 * @param {object} cfg        { ageFloorMs, killAfterMs }
 * @param {number} now
 */
export function shouldReap(entry, candidate, cfg, now) {
  if (!candidate || candidate.isCandidate !== true) {
    return { reap: false, reason: "not a reap candidate" };
  }
  const ageMs = candidate.ageMs;
  if (!Number.isFinite(ageMs)) {
    return { reap: false, reason: "process age unknown — refusing to reap" };
  }
  if (ageMs < cfg.ageFloorMs) {
    return { reap: false, reason: `too young (${Math.round(ageMs / 1000)}s < ${Math.round(cfg.ageFloorMs / 1000)}s floor)` };
  }
  if (!entry || !Number.isFinite(entry.firstSeenAt)) {
    return { reap: false, reason: "not yet tracked in the candidate ledger" };
  }
  const confirmedForMs = now - entry.firstSeenAt;
  if (confirmedForMs < cfg.killAfterMs) {
    const remain = Math.ceil((cfg.killAfterMs - confirmedForMs) / 1000);
    return { reap: false, reason: `confirming (${Math.round(confirmedForMs / 1000)}s/${Math.round(cfg.killAfterMs / 1000)}s — ~${remain}s left)` };
  }
  return { reap: true, reason: `confirmed orphan for ${Math.round(confirmedForMs / 1000)}s` };
}

// ─── Process killing ────────────────────────────────────────────────────────

/**
 * Classify a process-kill failure message into a stable category. Lets the
 * report explain WHY a kill failed and — crucially — distinguish an "access
 * denied" failure (this runner lacks the privilege; the SYSTEM-principal
 * scheduled task WILL reap it on its next sweep, or an elevated run will) from
 * a genuine error or an already-gone process. Pure + total: any input, never
 * throws.
 *
 * @param {*} errMsg  the `.error` string from windowsKill / posixKill (or null)
 * @returns {"ok"|"access-denied"|"not-found"|"other"}
 */
export function classifyKillError(errMsg) {
  if (errMsg == null || errMsg === "") return "ok";
  const m = String(errMsg).toLowerCase();
  // Access denied — Stop-Process against a higher-integrity / cross-security-
  // context process, or a POSIX EPERM. The non-SYSTEM runners (the in-session
  // Monitor, --hunt, the Stop-hook sweep) hit this; a SYSTEM-principal
  // scheduled task does not. This is the orphan class that piled up.
  if (
    m.includes("access is denied") || m.includes("accessdenied") ||
    m.includes("permissiondenied") || m.includes("eperm") ||
    m.includes("operation not permitted") || m.includes("denied")
  ) return "access-denied";
  // Process already gone — Stop-Process "Cannot find a process", POSIX ESRCH.
  // Not a real failure: the goal ("not running") already holds.
  if (
    m.includes("cannot find a process") || m.includes("no running process") ||
    m.includes("no process") || m.includes("esrch")
  ) return "not-found";
  return "other";
}

// WHY per-PID and not batched (regression of 2026-05-17, golf claude-339c8ff7):
//   The original windowsKill batched all PIDs into one PS foreach driven by a
//   single execFileSync with PS_TIMEOUT_MS + killSignal:SIGKILL. Under 95-98%
//   commit pressure (the exact state in which orphans MOST need reaping) the
//   batch PS process ran slow enough that Node's timeout fired mid-loop and
//   SIGKILLed PS BEFORE the trailing PIDs flushed an "ok"/"err" result. Those
//   PIDs fell through to the line-454 fallback labelled "no result returned by
//   Stop-Process" — but they were ALIVE. Verified live: claude-339c8ff7 found
//   PIDs 15116 (48MB) + 24736 (633MB) surviving the batched kill for 30-49
//   minutes; both were killable instantly by a direct single-PID Stop-Process
//   -Force. The batch was a premature optimization — typical N is 1-5 PIDs
//   per sweep (10-min confirm window gates reaping), so the saved spawns
//   never paid for themselves. Per-PID spawn eliminates the race: each PID
//   gets its own PS_TIMEOUT_MS budget, its own ok/err result, no cross-PID
//   contamination possible. ESRCH-equivalent on Windows (Stop-Process throws
//   on missing PID) intentionally surfaces as "err" same as the original;
//   aligning that with POSIX's already-gone-as-success is a separate concern.
function windowsKill(pids) {
  return pids.map((p) => {
    const id = Number(p);
    if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
      return { pid: p, killed: false, error: `invalid PID: ${String(p)}` };
    }
    // -Command + numeric-only interpolation avoids the temp-file dance and any
    // shell-injection surface. id is a finite positive integer at this point;
    // String coercion is implicit and safe.
    const psCmd = `try { Stop-Process -Id ${id} -Force -ErrorAction Stop; "ok" } catch { "err " + $_.Exception.Message }`;
    let raw;
    try {
      raw = execFileSync(
        resolvePowershell(),
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psCmd],
        {
          timeout: PS_TIMEOUT_MS, encoding: "utf-8", windowsHide: true,
          maxBuffer: PS_MAX_BUFFER, killSignal: "SIGKILL",
        },
      );
    } catch (err) {
      // Per-PID PS spawn failure (timeout, ENOMEM, etc.) — surface the precise
      // failure for THIS PID without poisoning any other PID's result, and
      // never throw out of runSweep (which is called from the Stop hook and
      // must not crash). The next sweep retries this PID independently.
      return { pid: p, killed: false, error: `kill subprocess failed: ${err?.message || err}` };
    }
    const line = String(raw || "").trim();
    if (line === "ok") return { pid: p, killed: true, error: null };
    if (line.startsWith("err ")) return { pid: p, killed: false, error: line.slice(4) || "kill failed" };
    if (line === "err") return { pid: p, killed: false, error: "kill failed" };
    // Empty / unexpected line: PS finished cleanly but emitted nothing
    // parseable. Treat as a kill that may or may not have happened — surface
    // honestly rather than the misleading "no result returned" of the
    // batched implementation (which described a DIFFERENT failure mode).
    return { pid: p, killed: false, error: `unexpected PS output: ${line.slice(0, 200)}` };
  });
}

function posixKill(pids) {
  return pids.map((pid) => {
    try {
      process.kill(pid, "SIGKILL");
      return { pid, killed: true, error: null };
    } catch (err) {
      // ESRCH = already gone — treat as success (the goal was "not running").
      if (err && err.code === "ESRCH") return { pid, killed: true, error: null };
      return { pid, killed: false, error: err?.message || String(err) };
    }
  });
}

function defaultKiller(pids) {
  return process.platform === "win32" ? windowsKill(pids) : posixKill(pids);
}

/**
 * BRIDGE-PROTECT (2026-05-25, slot:golf, MCP-RESILIENCE/U-BRIDGE-PROTECT):
 * Never reap an mcp-http-bridge / mcp-server-supervisor / mcp dist server / the
 * fleet-reaper itself / the standalone MCP watchdog — regardless of how a PID
 * arrived on the kill list. The classify path treats bridges whose parent
 * claude.exe is gone as "owned-by-crashed"; killing those bridges drops the
 * chat's `prism` connection for the rest of its session, which is the actual
 * user-facing "chats keep disconnecting" pattern.
 *
 * The bridge process is allowed to outlive its claude.exe parent — Claude Code
 * re-spawns it on the next session; in the gap, leaving the bridge alive is
 * harmless (no chat is holding it).
 *
 * 30 s in-process cache to keep cost bounded on big kill batches. Cache miss
 * during PS error returns the previous cache (fail-safe: skip-kill > wrong-kill).
 *
 * LONG-RUNNER-PROTECT (2026-06-10, slot:zulu, OBSIDIAN-2ND-BRAIN): the detached
 * overnight vault pipeline (overnight-vault-compound.mjs and the multi-hour
 * children it execFileSync's: mine-galaxy-transcripts, the memory index/embedding
 * sidecars, galaxy-synthesis-refresh) is launched via Start-Process so its parent
 * exits immediately -- to the orphan classifier it is indistinguishable from a
 * dead chat's leftovers, and the reaper killed it TWICE on 2026-06-10 (pids
 * 56680, 18952; both died mid-round with no log line -- hard external kill right
 * after a Stop-event sweep). These are intentional services, same class as the
 * MCP bridge. PRISM_REAPER_PROTECT_EXTRA lets future long-runners register a
 * pattern via env without editing this file (validated: only [\w .\\/|-]
 * chars are accepted so a malformed value cannot break the PS regex or be
 * abused for injection).
 */
const _PROTECT_EXTRA = (() => {
  const raw = process.env.PRISM_REAPER_PROTECT_EXTRA || "";
  return /^[\w .\\/|-]+$/.test(raw) ? `|${raw}` : "";
})();
const _MCP_PROTECT_REGEX = "mcp-http-bridge|mcp-server-supervisor|dist[\\\\/]index\\.js|fleet-reaper-sweep|mcp-health-watchdog|mcp-server-watchdog"
  + "|overnight-vault-compound|mine-galaxy-transcripts|build-memory-index-sidecar|build-memory-embeddings-sidecar|galaxy-synthesis-refresh"
  + _PROTECT_EXTRA;
const PROTECT_CACHE_TTL_MS = 30 * 1000; // 30 s — bounds CIM-query cost on big kill batches
const PROTECT_PS_TIMEOUT_MS = 8 * 1000; // 8 s PowerShell budget
let _protectedPidCache = { ts: 0, pids: new Set() };
function getProtectedPids() {
  if (process.platform !== "win32") return new Set();
  const now = Date.now();
  if (now - _protectedPidCache.ts < PROTECT_CACHE_TTL_MS) return _protectedPidCache.pids;
  try {
    const out = execFileSync(
      resolvePowershell(),
      [
        "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command",
        `Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='powershell.exe'" | Where-Object { $_.CommandLine -match '${_MCP_PROTECT_REGEX}' } | Select-Object -ExpandProperty ProcessId`,
      ],
      { timeout: PROTECT_PS_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    const pids = new Set(String(out).split(/\s+/).map(Number).filter((n) => Number.isFinite(n) && n > 0));
    _protectedPidCache = { ts: now, pids };
    return pids;
  } catch {
    return _protectedPidCache.pids; // fail-safe: better to skip a kill than wrongly kill a bridge
  }
}

/** @returns {Array<{pid,killed,error,errorClass}>} */
export function reapProcesses(pids, { dryRun = false, killer = defaultKiller } = {}) {
  if (!Array.isArray(pids) || pids.length === 0) return [];
  if (dryRun) return pids.map((pid) => ({ pid, killed: false, error: null, dryRun: true, errorClass: "ok" }));
  // BRIDGE-PROTECT: filter the kill list against the MCP-bridge protect set.
  // Anything matching gets a synthesized "skipped" result with errorClass
  // "protected" — visible in the report, never harms the chat fleet.
  const protect = getProtectedPids();
  const killable = [];
  const protectedResults = [];
  for (const p of pids) {
    if (protect.has(Number(p))) {
      protectedResults.push({ pid: p, killed: false, error: "mcp-bridge-protected (BRIDGE-PROTECT)", errorClass: "protected" });
    } else {
      killable.push(p);
    }
  }
  // Tag every kill result with a stable failure category (see classifyKillError) so
  // the report can name an access-denied kill explicitly — that PID is the
  // class a SYSTEM-principal scheduled task reaps when an unprivileged runner
  // (in-session Monitor, --hunt, Stop hook) cannot.
  const killed = killer(killable).map((r) => ({
    ...r,
    errorClass: r && r.killed ? "ok" : classifyKillError(r && r.error),
  }));
  return [...killed, ...protectedResults];
}

/**
 * Build the `--hunt` report — a Task-Manager-style view of every node/bash/git
 * target process with its slot classification and reap verdict, heaviest-RSS
 * first. This is the Claude-Code-invokable "check task manager and hunt down
 * the orphans the scheduled reaper left" surface: it shows ALL targets (not
 * just reap candidates), so an operator sees what is protected, what is a
 * candidate held by the confirm window, and what reaps this sweep.
 * Pure + total — never throws, tolerates a non-array input.
 *
 * @param {Array} classified       snapshotFleet().classified (all target procs)
 * @param {Array} candidateReport  runSweep per-candidate decisions (willReap/decision)
 * @returns {{rows:Array, summary:object}}
 */
export function buildHuntReport(classified, candidateReport) {
  const safe = Array.isArray(classified) ? classified : [];
  const decisionByPid = new Map(
    (Array.isArray(candidateReport) ? candidateReport : [])
      .filter((c) => c && c.pid != null)
      .map((c) => [c.pid, c]),
  );
  const rows = safe.map((c) => {
    const d = decisionByPid.get(c.pid);
    return {
      pid: c.pid,
      name: c.name || "?",
      class: c.class || "unknown",
      ownerSlot: c.ownerSlot || null,
      ownerStatus: c.ownerStatus || null,
      ageMs: Number.isFinite(c.ageMs) ? c.ageMs : null,
      rssBytes: Number.isFinite(c.rssBytes) ? c.rssBytes : null,
      isCandidate: !!c.isCandidate,
      willReap: d ? !!d.willReap : false,
      verdict: d
        ? d.decision
        : (c.isCandidate
          ? "candidate (no ledger decision this sweep)"
          : "protected — owning slot alive, self, or unresolved"),
    };
  }).sort((a, b) => (b.rssBytes || 0) - (a.rssBytes || 0));
  const summary = {
    totalTargets: rows.length,
    candidates: rows.filter((r) => r.isCandidate).length,
    willReap: rows.filter((r) => r.willReap).length,
    protectedCount: rows.filter((r) => !r.isCandidate).length,
    totalRssBytes: rows.reduce((s, r) => s + (r.rssBytes || 0), 0),
  };
  return { rows, summary };
}

// ─── Audit trail (shared with node-process-janitor.mjs) ─────────────────────

/**
 * Append JSONL records to the shared forensic trail. Best-effort — audit is
 * advisory, a write failure must never abort a sweep. Each record carries a
 * `reason` tag (`soft-priority-demoted`, `soft-workingset-trimmed`,
 * `ollama-prewarm-fired`, `ollama-hint-written`) so an operator can see what
 * the reaper did beyond kills.
 */
function appendAuditLines(records, auditPath = DEFAULT_AUDIT_LOG_PATH) {
  if (!Array.isArray(records) || records.length === 0) return;
  try {
    mkdirSync(dirname(auditPath), { recursive: true });
    appendFileSync(auditPath, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  } catch { /* best-effort — audit is advisory, never fatal */ }
}

// ─── Layer 1: soft RAM/CPU relief (FLEET-REAPER-MS1) ────────────────────────
//
// Under memory pressure, processes owned by STALE chat slots (no heartbeat in
// 2-10 min) get a reversible nudge — CPU priority dropped to BelowNormal +
// working set trimmed. Neither is a kill: Windows re-pages a trimmed working
// set on demand, and a slot that revives re-raises its own priority. This is
// the tier BETWEEN "healthy" and "reap" — soft-first, kill-last.

/**
 * Index a fleet snapshot's classified processes by owning slot. Pure.
 * Processes with no `ownerSlot` (unowned / leftover / not-target) are skipped —
 * soft relief only ever touches slot-attributed processes.
 * @returns {Map<string,{pids:number[],statuses:Set<string>,totalRssBytes:number}>}
 */
export function readSlotProcesses(snap) {
  const bySlot = new Map();
  for (const c of (snap && snap.classified) || []) {
    if (!c.ownerSlot) continue;
    let entry = bySlot.get(c.ownerSlot);
    if (!entry) {
      entry = { pids: [], statuses: new Set(), totalRssBytes: 0 };
      bySlot.set(c.ownerSlot, entry);
    }
    entry.pids.push(c.pid);
    if (c.ownerStatus) entry.statuses.add(c.ownerStatus);
    entry.totalRssBytes += Number.isFinite(c.rssBytes) ? c.rssBytes : 0;
  }
  return bySlot;
}

/**
 * Tally distinct chat slots by status from a snapshot's slotPidMap. Pure.
 * Used by the Ollama coordinator to answer "are there live chats to hint to?"
 * @returns {{alive:number,stale:number,crashed:number,idle:number}}
 */
export function countSlotsByStatus(snap) {
  const seen = new Map(); // slot -> status (first wins; slotPidMap already
  //                          resolved status precedence in process-slot-map)
  const values = snap && snap.slotPidMap && typeof snap.slotPidMap.values === "function"
    ? snap.slotPidMap.values() : [];
  for (const v of values) {
    if (v && v.slot && !seen.has(v.slot)) seen.set(v.slot, v.status);
  }
  const counts = { alive: 0, stale: 0, crashed: 0, idle: 0 };
  for (const status of seen.values()) {
    if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
  }
  return counts;
}

/**
 * Select processes eligible for a soft (reversible) pressure nudge. Pure.
 *
 * Two target sets, merged:
 *
 * (1) STALE-OWNED (always): processes whose classified `class` is
 *     `owned-by-stale` — a slot that hasn't heartbeated in 2-10 min. NOT
 *     alive slots (live work), NOT crashed (those are the reap path), NOT
 *     protected (classifyProcess already excluded them), NOT reap candidates
 *     (defense-in-depth — the reap path owns those). Age-gated so a
 *     just-spawned helper of a briefly-stale slot is left alone.
 *
 * (2) ALIVE-OWNED LARGE HELPERS (criticalPressure ONLY — SOFT-RELIEF-V2):
 *     under critical memory pressure (tier === "critical"), also include
 *     `owned-by-alive` helper processes whose individual RSS exceeds
 *     `aliveRssThresholdBytes` AND ageMs >= ageFloorMs. The trim is
 *     reversible — actively working procs page back in within ms; idle ones
 *     return RAM to the OS pool. Investigation 2026-05-17: stale-only filter
 *     fired `targets:0` on every sweep this session despite 99% commit
 *     pressure because `chat-slots reclaim` immediately converts stale
 *     slots to free → unowned, so `owned-by-stale` is essentially
 *     transient. V2 closes the gap by trimming live-but-bloated helpers
 *     ONLY during the actual emergency.
 *
 * @param snap                                — output of snapshotFleet
 * @param softReliefAgeSec                    — min process age before any trim
 * @param now                                 — wall-clock ms
 * @param criticalPressure                    — true ⇒ apply set (2)
 * @param aliveRssThresholdBytes              — per-proc RSS floor for set (2)
 * @returns {{targets:Array<{pid,name,ownerSlot,ageMs,rssBytes,sourceClass}>, skipped:number}}
 */
export function selectSoftReliefTargets(snap, {
  softReliefAgeSec,
  now,
  criticalPressure = false,
  aliveRssThresholdBytes = null,
} = {}) {
  const ageFloorMs = (Number.isFinite(softReliefAgeSec)
    ? softReliefAgeSec : DEFAULT_SOFT_RELIEF_AGE_SEC) * 1000;
  // null/undefined/non-finite ⇒ V2 disabled (back-compat — caller didn't opt in).
  const rssFloorBytes = Number.isFinite(aliveRssThresholdBytes) && aliveRssThresholdBytes > 0
    ? aliveRssThresholdBytes : null;
  const v2Enabled = criticalPressure === true && rssFloorBytes !== null;
  const targets = [];
  let skipped = 0;
  for (const c of (snap && snap.classified) || []) {
    if (c.isCandidate) { skipped += 1; continue; } // never double-act with the reap path
    if (!Number.isFinite(c.ageMs) || c.ageMs < ageFloorMs) { skipped += 1; continue; }
    let sourceClass = null;
    if (c.class === "owned-by-stale") {
      sourceClass = "owned-by-stale";
    } else if (v2Enabled && c.class === "owned-by-alive"
               && Number.isFinite(c.rssBytes) && c.rssBytes >= rssFloorBytes) {
      sourceClass = "owned-by-alive-large";
    }
    if (!sourceClass) continue;
    targets.push({
      pid: c.pid, ppid: c.ppid, name: c.name, ownerSlot: c.ownerSlot,
      ageMs: c.ageMs, rssBytes: c.rssBytes, sourceClass,
    });
  }
  return { targets, skipped };
}

/**
 * Run an inline PowerShell script; return stdout, or null on spawn failure /
 * timeout / non-Windows. Mirrors windowsKill's hardening: `killSignal:
 * "SIGKILL"` so a WMI-wedged powershell that ignores SIGTERM on timeout is
 * hard-killed (the reaper must not leak its own tools), temp-file cleanup,
 * never throws. The caller builds the script + parses the output.
 */
function runPsScript(label, scriptLines) {
  const psFile = join(
    tmpdir(), `prism-fleet-reaper-${label}-${process.pid}-${randomBytes(4).toString("hex")}.ps1`,
  );
  writeFileSync(psFile, scriptLines.join("\n"), "utf-8");
  try {
    return execFileSync(
      resolvePowershell(),
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", psFile],
      {
        timeout: PS_TIMEOUT_MS, encoding: "utf-8", windowsHide: true,
        maxBuffer: PS_MAX_BUFFER, killSignal: "SIGKILL",
      },
    );
  } catch {
    return null; // spawn failure / timeout — caller maps every PID to a failure
  } finally {
    try { unlinkSync(psFile); } catch { /* best-effort */ }
  }
}

/** Windows: drop CPU priority to BelowNormal for each PID. */
function windowsPriorityRelief(pids) {
  // pids originate from Win32_Process.ProcessId (integers); String(Number())
  // double-coerces so nothing but a numeric literal lands inside @(...).
  const idLiteral = pids.map((p) => String(Number(p))).join(",");
  const raw = runPsScript("prio", [
    "$ErrorActionPreference='SilentlyContinue'",
    `foreach ($id in @(${idLiteral})) {`,
    "  try { (Get-Process -Id $id -ErrorAction Stop).PriorityClass = 'BelowNormal'; \"ok $id\" }",
    "  catch { \"err $id \" + $_.Exception.Message }",
    "}",
  ]);
  if (raw == null) {
    return pids.map((p) => ({ pid: p, demoted: false, error: "priority subprocess failed" }));
  }
  const result = new Map();
  for (const line of String(raw || "").split("\n")) {
    const m = line.match(/^(ok|err)\s+(\d+)\s*(.*)$/);
    if (!m) continue;
    result.set(Number(m[2]), {
      demoted: m[1] === "ok", error: m[1] === "err" ? (m[3] || "priority change failed") : null,
    });
  }
  return pids.map((p) => (result.has(p)
    ? { pid: p, demoted: result.get(p).demoted, error: result.get(p).error }
    : { pid: p, demoted: false, error: "no result returned by Get-Process" }));
}

/** Windows: trim each PID's working set via PSAPI EmptyWorkingSet. */
function windowsWorkingSetTrim(pids) {
  const idLiteral = pids.map((p) => String(Number(p))).join(",");
  // EmptyWorkingSet is the documented "trim working set to minimum" call — the
  // OS re-pages on demand, so this is reversible, not a kill. We capture
  // WorkingSet64 before + immediately after to estimate the reclaim.
  const raw = runPsScript("trim", [
    "$ErrorActionPreference='SilentlyContinue'",
    "$sig = '[DllImport(\"psapi.dll\")] public static extern bool EmptyWorkingSet(System.IntPtr hProcess);'",
    "try { Add-Type -Namespace PrismFR -Name Mem -MemberDefinition $sig -ErrorAction Stop } catch {}",
    `foreach ($id in @(${idLiteral})) {`,
    "  try {",
    "    $p = Get-Process -Id $id -ErrorAction Stop",
    "    $before = [int64]$p.WorkingSet64",
    "    [void][PrismFR.Mem]::EmptyWorkingSet($p.Handle)",
    "    $p.Refresh()",
    "    $after = [int64]$p.WorkingSet64",
    "    \"ok $id $before $after\"",
    "  } catch { \"err $id \" + $_.Exception.Message }",
    "}",
  ]);
  if (raw == null) {
    return pids.map((p) => ({ pid: p, trimmed: false, error: "trim subprocess failed", rssReclaimedBytes: 0 }));
  }
  const result = new Map();
  for (const line of String(raw || "").split("\n")) {
    const ok = line.match(/^ok\s+(\d+)\s+(\d+)\s+(\d+)\s*$/);
    if (ok) {
      const before = Number(ok[2]);
      const after = Number(ok[3]);
      const reclaimed = Number.isFinite(before) && Number.isFinite(after)
        ? Math.max(0, before - after) : 0;
      result.set(Number(ok[1]), { trimmed: true, error: null, rssReclaimedBytes: reclaimed });
      continue;
    }
    const err = line.match(/^err\s+(\d+)\s*(.*)$/);
    if (err) {
      result.set(Number(err[1]), {
        trimmed: false, error: err[2] || "working-set trim failed", rssReclaimedBytes: 0,
      });
    }
  }
  return pids.map((p) => (result.has(p)
    ? { pid: p, ...result.get(p) }
    : { pid: p, trimmed: false, error: "no result returned by Get-Process", rssReclaimedBytes: 0 }));
}

/** POSIX: drop scheduling priority via `renice +5`. Best-effort, never throws. */
function posixPriorityRelief(pids) {
  try {
    execFileSync("renice", ["+5", ...pids.map((p) => String(Number(p)))],
      { timeout: PS_TIMEOUT_MS, encoding: "utf-8" });
    return pids.map((p) => ({ pid: p, demoted: true, error: null }));
  } catch (err) {
    return pids.map((p) => ({ pid: p, demoted: false, error: err?.message || String(err) }));
  }
}

function defaultPriorityApplier(pids) {
  return process.platform === "win32" ? windowsPriorityRelief(pids) : posixPriorityRelief(pids);
}

function defaultWorkingSetApplier(pids) {
  if (process.platform === "win32") return windowsWorkingSetTrim(pids);
  // POSIX has no cheap reversible working-set trim equivalent worth the surface
  // for a Windows-primary repo — report skipped, not failed (avoids noise).
  return pids.map((p) => ({ pid: p, trimmed: false, error: null, skipped: "posix", rssReclaimedBytes: 0 }));
}

/**
 * Drop CPU priority to BelowNormal for a list of PIDs. Injectable applier seam
 * for tests. dryRun → classify the intent without touching the OS.
 * @returns {Array<{pid,demoted,error,dryRun?}>}
 */
export function applyPriorityRelief(pids, { dryRun = false, applier = defaultPriorityApplier } = {}) {
  if (!Array.isArray(pids) || pids.length === 0) return [];
  if (dryRun) return pids.map((pid) => ({ pid, demoted: false, error: null, dryRun: true }));
  return applier(pids);
}

/**
 * Trim the working set for a list of PIDs. Injectable applier seam for tests.
 * dryRun → classify the intent without touching the OS.
 * @returns {Array<{pid,trimmed,error,rssReclaimedBytes,dryRun?}>}
 */
export function applyWorkingSetTrim(pids, { dryRun = false, applier = defaultWorkingSetApplier } = {}) {
  if (!Array.isArray(pids) || pids.length === 0) return [];
  if (dryRun) {
    return pids.map((pid) => ({ pid, trimmed: false, error: null, rssReclaimedBytes: 0, dryRun: true }));
  }
  return applier(pids);
}

// ─── Layer 2: GPU + Ollama state probes (FLEET-REAPER-MS1) ──────────────────

/** Default nvidia-smi runner — one CSV line. Returns stdout or null on failure. */
function defaultRunNvidiaSmi() {
  try {
    return execFileSync("nvidia-smi", [
      "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu",
      "--format=csv,noheader,nounits",
    ], {
      timeout: PROBE_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
    });
  } catch {
    return null; // no NVIDIA GPU / driver absent / timeout — degrade, never throw
  }
}

/**
 * Read GPU state via nvidia-smi. Never throws — a missing nvidia-smi degrades
 * to { available:false }. Parses the FIRST GPU row (the fleet runs one box).
 * @returns {{available,name?,totalMb?,usedMb?,freeMb?,utilizationPct?,reason?}}
 */
export function readGpuState({ runNvidiaSmi = defaultRunNvidiaSmi } = {}) {
  if (process.env.PRISM_FLEET_REAPER_GPU_DISABLE === "1") {
    return { available: false, reason: "PRISM_FLEET_REAPER_GPU_DISABLE=1" };
  }
  let raw;
  try {
    raw = runNvidiaSmi();
  } catch {
    return { available: false, reason: "nvidia-smi runner threw" };
  }
  if (!raw || typeof raw !== "string") {
    return { available: false, reason: "nvidia-smi unavailable" };
  }
  const line = raw.split("\n").map((l) => l.trim()).filter(Boolean)[0];
  if (!line) return { available: false, reason: "nvidia-smi returned no GPU rows" };
  const parts = line.split(",").map((p) => p.trim());
  if (parts.length < 5) return { available: false, reason: `nvidia-smi row malformed: "${line}"` };
  const num = (s) => { const n = Number(s); return Number.isFinite(n) ? n : null; };
  const totalMb = num(parts[1]);
  const usedMb = num(parts[2]);
  const freeMb = num(parts[3]);
  const utilizationPct = num(parts[4]);
  if (totalMb == null || freeMb == null) {
    return { available: false, reason: `nvidia-smi row had non-numeric memory: "${line}"` };
  }
  return { available: true, name: parts[0] || "GPU", totalMb, usedMb, freeMb, utilizationPct };
}

/** Default curl runner for an Ollama endpoint. Returns body string or null. */
function defaultRunCurl(url) {
  try {
    return execFileSync("curl", ["-s", "-m", String(PROBE_TIMEOUT_SEC), url], {
      timeout: PROBE_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
    });
  } catch {
    return null; // daemon down / curl absent / timeout — degrade, never throw
  }
}

/**
 * Resolve the Ollama base URL — explicit arg > OLLAMA_URL env > default.
 * Defense-in-depth: a value that does not start with http:// or https:// is
 * rejected back to DEFAULT_OLLAMA_URL. The URL only ever lands in a `spawn`
 * args array (no shell — no RCE), but a malformed/non-http value would just
 * make curl fail; falling back to the default keeps the probe meaningful.
 */
function resolveOllamaUrl(ollamaUrl) {
  const raw = (ollamaUrl || process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
  return /^https?:\/\//i.test(raw) ? raw : DEFAULT_OLLAMA_URL;
}

/**
 * Read Ollama state — reachability (/api/tags), available models, loaded models
 * (/api/ps). Never throws — an unreachable daemon degrades to
 * { reachable:false, models:[], loaded:[] }. Reachability stands on /api/tags;
 * /api/ps is best-effort (an older Ollama without it still reports reachable).
 * @returns {{reachable,models:string[],loaded:Array<{model,sizeMb}>,reason?}}
 */
export function readOllamaState({ runCurl = defaultRunCurl, ollamaUrl } = {}) {
  // No env gate here: PRISM_FLEET_REAPER_GPU_DISABLE belongs to readGpuState
  // ONLY (the GPU probe), and PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE / --no-coord
  // already short-circuit the whole Layer 2/3 block in runSweep before this is
  // ever reached. Gating Ollama on the GPU knob would wrongly couple the two.
  const base = resolveOllamaUrl(ollamaUrl);
  let tagsRaw;
  try {
    tagsRaw = runCurl(`${base}/api/tags`);
  } catch {
    return { reachable: false, models: [], loaded: [], reason: "Ollama /api/tags probe threw" };
  }
  if (!tagsRaw) {
    return { reachable: false, models: [], loaded: [], reason: "Ollama /api/tags unreachable" };
  }
  let models = [];
  try {
    const tags = JSON.parse(tagsRaw);
    models = Array.isArray(tags && tags.models)
      ? tags.models.map((m) => m && m.name).filter(Boolean) : [];
  } catch {
    return { reachable: false, models: [], loaded: [], reason: "Ollama /api/tags returned non-JSON" };
  }
  let loaded = [];
  try {
    const psRaw = runCurl(`${base}/api/ps`);
    if (psRaw) {
      const ps = JSON.parse(psRaw);
      loaded = Array.isArray(ps && ps.models)
        ? ps.models.map((m) => ({
          model: (m && (m.name || m.model)) || "",
          sizeMb: Number.isFinite(Number(m && m.size))
            ? Math.round(Number(m.size) / (1024 * 1024)) : null,
        })).filter((m) => m.model)
        : [];
    }
  } catch { /* /api/ps best-effort — reachability already stands on /api/tags */ }
  return { reachable: true, models, loaded };
}

// ─── Layer 2b: Docker stack health probe (FLEET-REAPER-MS1.1) ───────────────
//
// Reuses the pre-built `scripts/ollama-docker-health.mjs --json` probe so
// every fleet-reaper sweep also sees: Docker daemon, Postgres (postgres-prism),
// Qdrant, Prometheus. The probe is fail-soft (every service "down" is a
// status, never a crash) and bounded (PROBE_TIMEOUT_MS).
//
// Why surface this in the reaper sweep:
//   1. Ollama runs in a Docker container — a Docker outage explains an Ollama
//      probe failure that would otherwise look like a coordinator bug.
//   2. Operators get fleet-wide infra health in one verdict line (no need to
//      run /ollama-docker-health manually).
//   3. The Monitor's live event feed catches Docker/Qdrant/Postgres going down
//      with no extra wiring — the existing `monitorEvent` already prints
//      `caveats`, so a degraded service is one chat-message away.
//
// Knobs: `PRISM_FLEET_REAPER_DOCKER_DISABLE=1` (skip the probe entirely),
//        `PRISM_FLEET_REAPER_DOCKER_HEALTH_PATH=<path>` (override script path).

const DEFAULT_DOCKER_HEALTH_SCRIPT = "H:/prism/scripts/ollama-docker-health.mjs";

function defaultRunDockerHealth() {
  const scriptPath = process.env.PRISM_FLEET_REAPER_DOCKER_HEALTH_PATH
    || DEFAULT_DOCKER_HEALTH_SCRIPT;
  // Use process.execPath, NOT bare "node" — under portable-node deployments
  // (H:/Tools/nodejs/node.exe not on PATH for harness-spawned children) bare
  // "node" returns ENOENT and the probe silently never fires. Same class of
  // regression as [[reference_precompact_bare_node_enoent_2026_05_16]].
  try {
    return execFileSync(process.execPath, [scriptPath, "--json"], {
      timeout: PROBE_TIMEOUT_MS * 2,  // docker daemon probes are 2-step (engine + service list)
      encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
    });
  } catch {
    return null;
  }
}

/**
 * Probe the Docker + supporting-services stack. Returns a normalized
 * { available, services } where services is a per-name {up, detail} map.
 * Never throws — a missing probe / unreachable Docker degrades to
 * { available:false, services:{} } so the coordinator can decide whether
 * its Ollama prewarm is even meaningful.
 */
export function readDockerHealth({ runHealthProbe = defaultRunDockerHealth } = {}) {
  if (process.env.PRISM_FLEET_REAPER_DOCKER_DISABLE === "1") {
    return { available: false, services: {}, reason: "PRISM_FLEET_REAPER_DOCKER_DISABLE=1" };
  }
  let raw;
  try {
    raw = runHealthProbe();
  } catch {
    return { available: false, services: {}, reason: "docker-health probe threw" };
  }
  if (!raw || typeof raw !== "string") {
    return { available: false, services: {}, reason: "docker-health probe unavailable" };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { available: false, services: {}, reason: "docker-health returned non-JSON" };
  }
  // PRODUCER SHAPE (ollama-docker-health.mjs): `ollama` and `docker` are
  // TOP-LEVEL keys; only `{qdrant, postgres, prometheus}` live under
  // `parsed.services`. The prior code mirrored ONLY `parsed.services`, so
  // `services.docker` was never populated and `available` was permanently
  // false for every real payload — a latent bug surfaced by the Tier-2
  // service-restart consumer (its daemon-down safety guard reads
  // `services.docker`). Normalize the daemon + ollama up-flags INTO `services`
  // so the documented `{ollama, docker, postgres, qdrant, prometheus}` contract
  // is actually true and the consumer's safety invariant holds in production.
  const services = {};
  const foldEntry = (name, svc) => {
    if (svc && typeof svc === "object") {
      services[name] = {
        up: !!svc.up,
        detail: typeof svc.detail === "string" ? svc.detail : null,
      };
    }
  };
  if (parsed && parsed.services && typeof parsed.services === "object") {
    for (const [name, svc] of Object.entries(parsed.services)) foldEntry(name, svc);
  }
  // Top-level daemon + ollama (the real probe's shape). An explicit
  // `parsed.services.docker` (test/legacy shape) is NOT overwritten.
  if (parsed && !services.docker) foldEntry("docker", parsed.docker);
  if (parsed && !services.ollama) foldEntry("ollama", parsed.ollama);
  return {
    available: !!(services.docker && services.docker.up),
    services,
  };
}

// ─── Layer 3: Ollama coordinator (FLEET-REAPER-MS1) ─────────────────────────
//
// When the box is under memory pressure AND the GPU has headroom AND Ollama is
// reachable, the coordinator (a) pre-warms a local model into VRAM so the next
// hook offload skips the cold-start, and (b) writes a TTL'd routing hint that
// nudges ollama-task-offloader.mjs to absorb more hook-eligible work — turning
// idle VRAM into Claude-CLI throughput instead of adding more kills.

/**
 * Decide whether to pre-warm Ollama + write an offload routing hint. PURE — no
 * I/O, fully testable. The side-effecting actions (prewarmOllama,
 * writeRoutingHint) are separate functions the sweep calls from this decision.
 *
 * @param {object} args
 *   mem         readHostMemory() result
 *   gpu         readGpuState() result
 *   ollama      readOllamaState() result
 *   slotCounts  { alive, stale, crashed, idle } — chat-slot tallies, NOT procs
 *   cfg         { gpuFreeMinMb, prewarmModel, hintThresholdDelta, prewarmPct,
 *                 hintPct, disabled }
 * @returns {{shouldPrewarm,prewarmModel,shouldHintOffload,thresholdDelta,
 *            reason,skipped}}
 */
export function decideOllamaCoordination({ mem, gpu, ollama, slotCounts, cfg } = {}) {
  const c = cfg || {};
  const prewarmModel = c.prewarmModel || DEFAULT_OLLAMA_PREWARM_MODEL;
  const noop = (skipped) => ({
    shouldPrewarm: false, prewarmModel, shouldHintOffload: false,
    thresholdDelta: 0, reason: skipped, skipped,
  });
  if (c.disabled) return noop("coordinator disabled");
  if (!gpu || !gpu.available) return noop(`GPU unavailable (${(gpu && gpu.reason) || "no probe"})`);
  if (!ollama || !ollama.reachable) {
    return noop(`Ollama unreachable (${(ollama && ollama.reason) || "no probe"})`);
  }
  const memPct = mem && Number.isFinite(mem.usedPct) ? mem.usedPct : null;
  if (memPct == null) return noop("host memory unknown");

  const gpuFreeMinMb = Number.isFinite(c.gpuFreeMinMb) ? c.gpuFreeMinMb : DEFAULT_GPU_FREE_MIN_MB;
  const prewarmPct = Number.isFinite(c.prewarmPct) ? c.prewarmPct : DEFAULT_SOFT_RELIEF_PRESSURE_PCT;
  const hintPct = Number.isFinite(c.hintPct) ? c.hintPct : DEFAULT_SOFT_RELIEF_PRESSURE_PCT;

  if (!Number.isFinite(gpu.freeMb) || gpu.freeMb < gpuFreeMinMb) {
    return noop(`GPU free ${gpu.freeMb == null ? "?" : gpu.freeMb}MB < ${gpuFreeMinMb}MB floor`);
  }

  const aliveSlots = slotCounts && Number.isFinite(slotCounts.alive) ? slotCounts.alive : 0;
  const modelLoaded = Array.isArray(ollama.loaded)
    && ollama.loaded.some((m) => m && m.model === prewarmModel);

  // Pre-warm: pressure is real, GPU has room, and the model is NOT already
  // resident — load it so the next offload skips the ~3 s cold-start.
  const shouldPrewarm = memPct >= prewarmPct && !modelLoaded;
  // Hint: pressure is real, GPU has room, AND there is ≥1 live chat whose hooks
  // can actually consume the hint. No alive slots → nobody to route work to.
  const shouldHintOffload = memPct >= hintPct && aliveSlots >= 1;

  const deltaMag = Math.min(
    HINT_THRESHOLD_DELTA_CAP,
    Math.abs(Number.isFinite(c.hintThresholdDelta)
      ? c.hintThresholdDelta : DEFAULT_HINT_THRESHOLD_DELTA),
  );
  const thresholdDelta = shouldHintOffload ? -deltaMag : 0;

  const bits = [`commit ${memPct}%`, `gpuFree ${gpu.freeMb}MB`, `${aliveSlots} alive slot(s)`];
  if (modelLoaded) bits.push(`${prewarmModel} already loaded`);
  if (!shouldPrewarm && !shouldHintOffload) bits.push("below pressure floor — no action");
  return {
    shouldPrewarm, prewarmModel, shouldHintOffload, thresholdDelta,
    reason: bits.join(" · "), skipped: null,
  };
}

/** Default detached spawn for the prewarm POST — returns the child pid (or null). */
function defaultPrewarmSpawn(model, base, keepAlive) {
  const body = JSON.stringify({ model, prompt: " ", keep_alive: keepAlive, stream: false });
  const child = spawn("curl", [
    "-s", "-m", String(PREWARM_CURL_TIMEOUT_SEC), "-X", "POST", `${base}/api/generate`,
    "-H", "Content-Type: application/json", "-d", body,
  ], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  return child.pid == null ? null : child.pid;
}

/**
 * Fire-and-forget Ollama model pre-warm. POSTs /api/generate with a 1-space
 * prompt + keep_alive so the model loads into VRAM and stays resident. Never
 * blocks, never throws — a spawn failure is swallowed into { fired:false }.
 * @returns {{fired,pid,model,keepAlive,error}}
 */
export function prewarmOllama(model, { ollamaUrl, keepAlive, spawnImpl = defaultPrewarmSpawn } = {}) {
  const base = resolveOllamaUrl(ollamaUrl);
  const ka = keepAlive || process.env.PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE || DEFAULT_OLLAMA_KEEP_ALIVE;
  try {
    const pid = spawnImpl(model, base, ka);
    return { fired: true, pid: pid == null ? null : pid, model, keepAlive: ka, error: null };
  } catch (err) {
    return { fired: false, pid: null, model, keepAlive: ka, error: err && err.message ? err.message : String(err) };
  }
}

/**
 * Write the TTL'd Ollama routing hint atomically (temp + rename). When
 * `decision.shouldHintOffload` is false the hint is NEUTRALIZED — written with
 * mode "auto" and thresholdDelta 0 — so a stale aggressive hint from a prior
 * sweep cannot linger. The file IS the canonical statement; every sweep
 * restates it. `thresholdDelta` is hard-clamped to ±HINT_THRESHOLD_DELTA_CAP so
 * a bad decision can never push the consumer's threshold to 0 or 2. Never throws.
 * @returns {{written,mode,thresholdDelta,validUntil,path,error}}
 */
export function writeRoutingHint(decision, { now = Date.now(), path = DEFAULT_HINT_PATH, hintTtlSec } = {}) {
  const ttlSec = Number.isFinite(hintTtlSec)
    ? Math.max(1, Math.min(MAX_HINT_TTL_SEC, hintTtlSec))
    : DEFAULT_HINT_TTL_SEC;
  const aggressive = !!(decision && decision.shouldHintOffload);
  const rawDelta = decision && Number.isFinite(decision.thresholdDelta) ? decision.thresholdDelta : 0;
  const thresholdDelta = aggressive
    ? Math.max(-HINT_THRESHOLD_DELTA_CAP, Math.min(HINT_THRESHOLD_DELTA_CAP, rawDelta))
    : 0;
  const hint = {
    schemaVersion: HINT_SCHEMA_VERSION,
    mode: aggressive ? "aggressive-offload" : "auto",
    thresholdDelta,
    validUntil: new Date(now + ttlSec * 1000).toISOString(),
    writtenAt: new Date(now).toISOString(),
    writtenBy: "fleet-reaper-sweep",
    reason: (decision && decision.reason) || "no decision",
  };
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    writeFileSync(tmp, JSON.stringify(hint, null, 2), "utf-8");
    renameSync(tmp, path);
    return {
      written: true, mode: hint.mode, thresholdDelta, validUntil: hint.validUntil, path, error: null,
    };
  } catch (err) {
    return {
      written: false, mode: hint.mode, thresholdDelta, validUntil: hint.validUntil, path,
      error: err && err.message ? err.message : String(err),
    };
  }
}

// ─── One sweep ──────────────────────────────────────────────────────────────

/**
 * Run a single sweep. Fully injectable — every OS touch point has an opts seam
 * so tests run against synthetic data and never kill a real process.
 *
 * @param {object} [opts]
 *   mode            "once" | "stop-event" | "status"  (status = read-only)
 *   dryRun          classify + decide but never kill
 *   intervalSec, ageFloorSec, killAfter, memPressurePct, memCriticalPct  config
 *   now             clock injection
 *   enumerator, slotsFile, pidRegistry, slotsPath, registryPath  → snapshotFleet
 *   readMemory      injectable host-memory reader
 *   killer          injectable process killer
 *   ledgerPath, ledgerLockPath  injectable ledger paths
 * @returns {object} the sweep result (see summarize() for the shape consumers use)
 */
export function runSweep(opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const mode = opts.mode || "once";
  const isStatus = mode === "status";
  const disabled = process.env.PRISM_FLEET_REAPER_DISABLE === "1";
  const dryRun = !!opts.dryRun || process.env.PRISM_FLEET_REAPER_DRY_RUN === "1";

  // FLEET-REAPER-MS3/U-FR-MS3-D: engage self-I/O priority guard for the
  // sweep body. Idempotent + reversible. The guard is a no-op when the kill
  // switch is set, when running outside Windows, when status/dry-run, or
  // when an outer scope already engaged it (re-entrancy returns engaged:false).
  // registerExitRestore ensures restoration even if a sweep exits via
  // process.exit() (Tier-1 ballast release exit path).
  const _ioGuard = _beginSelfIoGuard({ dryRun, mode });
  if (_ioGuard.engaged) _registerSelfIoExitRestore(_ioGuard);

  try {

  const intervalSec = clampInt(opts.intervalSec, DEFAULT_INTERVAL_SEC, MIN_INTERVAL_SEC, MAX_INTERVAL_SEC);
  const ageFloorSec = clampInt(opts.ageFloorSec, DEFAULT_AGE_FLOOR_SEC, 0, MAX_AGE_FLOOR_SEC);
  const killAfter = clampInt(opts.killAfter, DEFAULT_KILL_AFTER, 1, MAX_KILL_AFTER);
  const memPressurePct = clampInt(opts.memPressurePct, DEFAULT_MEM_PRESSURE_PCT, 1, 100);
  const memCriticalPct = clampInt(opts.memCriticalPct, DEFAULT_MEM_CRITICAL_PCT, 1, 100);
  const ledgerPath = opts.ledgerPath || DEFAULT_LEDGER_PATH;
  const ledgerLockPath = opts.ledgerLockPath || `${ledgerPath}.lock`;

  // 1. Fleet snapshot — slot-aware classification of every node/git/bash process.
  const snap = snapshotFleet({
    enumerator: opts.enumerator,
    slotsFile: opts.slotsFile,
    pidRegistry: opts.pidRegistry,
    slotsPath: opts.slotsPath,
    registryPath: opts.registryPath,
    selfPid: opts.selfPid,
    now,
  });

  // 2. Host memory — pressure makes the kill gate one tick more eager.
  const mem = (opts.readMemory || readHostMemory)();
  const { tier: pressureTier, effectiveKillAfter } = tierFromPressure(
    mem.usedPct, memPressurePct, memCriticalPct, killAfter,
  );
  // `underPressure` retains its pre-MS1 meaning (>= warn band) for the
  // human/JSON report + the prose-only callers in summarize(); the new
  // critical band is surfaced separately as `pressureTier`/`criticalPressure`.
  const underPressure = pressureTier !== "normal";
  const criticalPressure = pressureTier === "critical";
  const cfg = {
    ageFloorMs: ageFloorSec * 1000,
    killAfterMs: effectiveKillAfter * intervalSec * 1000,
  };

  const caveats = [...snap.caveats];

  // 3. Ledger: merge current candidates, decide reaps. status mode never writes.
  let ledger;
  const lockResult = withLedgerLock(ledgerLockPath, (acquired) => {
    if (!acquired) caveats.push("ledger lock not acquired — proceeded best-effort (a race only delays a reap, never causes one)");
    const prev = readLedger(ledgerPath);
    const merged = updateLedger(prev, snap.candidates, now);
    if (!isStatus) {
      try {
        writeLedgerAtomic(merged, ledgerPath);
      } catch (err) {
        caveats.push(`ledger write failed: ${err?.message || err}`);
      }
    }
    return merged;
  });
  ledger = lockResult;

  // 4. Per-candidate reap decision.
  const candidateReport = snap.candidates.map((c) => {
    const entry = ledger.candidates[ledgerKey(c)];
    const decision = shouldReap(entry, c, cfg, now);
    return {
      pid: c.pid,
      name: c.name,
      class: c.class,
      ownerSlot: c.ownerSlot || null,
      ownerStatus: c.ownerStatus || null,
      ageMs: c.ageMs,
      rssBytes: c.rssBytes,
      reason: c.reason,
      firstSeenAt: entry ? entry.firstSeenAt : null,
      sweeps: entry ? entry.sweeps : 0,
      willReap: decision.reap,
      decision: decision.reason,
    };
  });

  // 5. Reap — unless status mode, disabled, or dry-run.
  const reapList = candidateReport.filter((c) => c.willReap);
  let reaped = [];
  let blockedBy = null;
  if (isStatus) {
    blockedBy = "status mode (read-only)";
  } else if (disabled) {
    blockedBy = "PRISM_FLEET_REAPER_DISABLE=1";
  } else if (reapList.length > 0) {
    try {
      const killResults = reapProcesses(
        reapList.map((c) => c.pid),
        { dryRun, killer: opts.killer },
      );
      const killByPid = new Map(killResults.map((r) => [r.pid, r]));
      reaped = reapList.map((c) => {
        const k = killByPid.get(c.pid) || { killed: false, error: "no kill result" };
        return {
          pid: c.pid, name: c.name, class: c.class, ownerSlot: c.ownerSlot,
          ownerStatus: c.ownerStatus, rssBytes: c.rssBytes,
          killed: !!k.killed, dryRun: !!k.dryRun, error: k.error || null,
          errorClass: k.errorClass || (k.killed ? "ok" : classifyKillError(k.error)),
        };
      });
    } catch (err) {
      // Defense in depth: windowsKill/posixKill already guard themselves, and
      // the killer is injectable — but never let a kill-path throw escape
      // runSweep (it is called from a Stop hook + a Monitor loop).
      caveats.push(`reap step failed: ${err?.message || err}`);
      reaped = [];
    }
  }

  const reapedOk = reaped.filter((r) => r.killed && !r.dryRun).length;
  const reapFailed = reaped.filter((r) => !r.killed && !r.dryRun).length;

  // ── FLEET-REAPER-MS1 config: soft-relief + coordinator knobs ──
  // Resolved here (not in resolveConfig) so a direct runSweep() caller — tests,
  // the Stop hook — gets the same env-knob behaviour as the CLI path.
  const envInt = (name) => {
    const n = Number(process.env[name]);
    return Number.isFinite(n) ? n : null;
  };
  const noRelief = !!opts.noRelief || process.env.PRISM_FLEET_REAPER_SOFT_RELIEF_DISABLE === "1";
  const noCoord = !!opts.noCoord || process.env.PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE === "1";
  const softReliefAgeSec = clampInt(
    opts.softReliefAgeSec ?? envInt("PRISM_FLEET_REAPER_SOFT_RELIEF_AGE_SEC"),
    DEFAULT_SOFT_RELIEF_AGE_SEC, 0, MAX_SOFT_RELIEF_AGE_SEC,
  );
  const softReliefPressurePct = clampInt(
    opts.softReliefPressurePct ?? envInt("PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT"),
    DEFAULT_SOFT_RELIEF_PRESSURE_PCT, 1, 100,
  );
  // SOFT-RELIEF-V2 (2026-05-17): per-proc RSS floor for trimming alive-slot
  // helpers under CRITICAL pressure. Default 100MB ⇒ a 100MB+ idle node hook
  // or bash subproc of a live chat is trimmed; smaller ones left alone.
  // Knob: PRISM_FLEET_REAPER_SOFT_RELIEF_ALIVE_RSS_MB (0 disables V2 entirely).
  const softReliefAliveRssMb = clampInt(
    opts.softReliefAliveRssMb ?? envInt("PRISM_FLEET_REAPER_SOFT_RELIEF_ALIVE_RSS_MB"),
    DEFAULT_SOFT_RELIEF_ALIVE_RSS_MB, 0, MAX_SOFT_RELIEF_ALIVE_RSS_MB,
  );
  // Side-effecting actions (kills already done above; soft-relief nudges +
  // prewarm + hint-write below) are suppressed in status / disabled / dry-run.
  const actionsAllowed = !isStatus && !disabled && !dryRun;
  const softUnderPressure = Number.isFinite(mem.usedPct) && mem.usedPct >= softReliefPressurePct;

  // 6. Layer 1 — soft RAM/CPU relief. Under pressure, nudge stale-slot processes
  //    (reversible: BelowNormal priority + working-set trim). Never a kill.
  //    V2: under CRITICAL pressure, also trim large alive-slot helpers
  //    (gated by criticalPressure flag from tierFromPressure above).
  let softRelief = {
    attempted: false, priorityDemoted: 0, workingSetTrimmed: 0,
    rssReclaimedBytes: 0, targets: 0, skipped: 0, dryRun, error: null,
    v2Engaged: false, v2TargetCount: 0,
  };
  if (!noRelief && softUnderPressure) {
    try {
      const v2Engaged = criticalPressure && softReliefAliveRssMb > 0;
      const aliveRssThresholdBytes = v2Engaged ? softReliefAliveRssMb * 1024 * 1024 : null;
      const { targets, skipped } = selectSoftReliefTargets(snap, {
        softReliefAgeSec, now,
        criticalPressure: v2Engaged,
        aliveRssThresholdBytes,
      });
      softRelief.v2Engaged = v2Engaged;
      softRelief.v2TargetCount = targets.filter((t) => t.sourceClass === "owned-by-alive-large").length;
      softRelief.targets = targets.length;
      softRelief.skipped = skipped;
      if (targets.length > 0 && (actionsAllowed || dryRun)) {
        const pids = targets.map((t) => t.pid);
        const prio = applyPriorityRelief(pids, { dryRun, applier: opts.priorityApplier });
        const trim = applyWorkingSetTrim(pids, { dryRun, applier: opts.workingSetApplier });
        softRelief.attempted = true;
        softRelief.priorityDemoted = prio.filter((r) => r.demoted && !r.dryRun).length;
        softRelief.workingSetTrimmed = trim.filter((r) => r.trimmed && !r.dryRun).length;
        softRelief.rssReclaimedBytes = trim.reduce(
          (s, r) => s + (Number.isFinite(r.rssReclaimedBytes) ? r.rssReclaimedBytes : 0), 0,
        );
        if (actionsAllowed) {
          const byPid = new Map(targets.map((t) => [t.pid, t]));
          const auditTs = new Date(now).toISOString();
          const records = [];
          for (const r of prio) {
            if (r.demoted) {
              const t = byPid.get(r.pid) || {};
              records.push({
                ts: auditTs, pid: r.pid, ppid: t.ppid ?? null, name: t.name || "",
                ownerSlot: t.ownerSlot || null, reason: "soft-priority-demoted",
              });
            }
          }
          for (const r of trim) {
            if (r.trimmed) {
              const t = byPid.get(r.pid) || {};
              records.push({
                ts: auditTs, pid: r.pid, ppid: t.ppid ?? null, name: t.name || "",
                ownerSlot: t.ownerSlot || null, reason: "soft-workingset-trimmed",
                rssReclaimedBytes: r.rssReclaimedBytes || 0,
              });
            }
          }
          appendAuditLines(records, opts.auditPath || DEFAULT_AUDIT_LOG_PATH);
        }
      }
    } catch (err) {
      // Defense in depth: the appliers guard themselves — but a soft-relief
      // failure must never abort the sweep (it is called from a Stop hook).
      softRelief.error = err && err.message ? err.message : String(err);
      caveats.push(`soft-relief step failed: ${softRelief.error}`);
    }
  }

  // 6.5 — FLEET-REAPER-MS3/U-FR-MS3-B Tier-1.5 — background-app throttle.
  //       Under warn-band pressure, drop top-N non-Claude heavy processes
  //       (Chrome/Discord/Steam) to BelowNormal. Hysteresis-restore at
  //       memPressurePct-5. Strictly additive; honors PRISM_FR_BG_THROTTLE_DISABLE
  //       + PRISM_FLEET_REAPER_DISABLE master. Skipped on --no-relief (the relief
  //       knob covers all Tier-1.x reversible throttles) and on status mode.
  const BG_THROTTLE_STAMP_PATH = join(SHARED_DIR, ".fleet-reaper-bg-throttle.json");
  let bgThrottle = { action: "noop", reason: "skipped-mode", throttled: [], restored: [], stampPath: BG_THROTTLE_STAMP_PATH };
  if (!isStatus && !noRelief) {
    try {
      const priorStamp = (opts.readBgStamp || _bgReadStamp)(BG_THROTTLE_STAMP_PATH);
      const priorPids = Array.isArray(priorStamp?.pids) ? priorStamp.pids : [];
      const topN = _bgClampTopN(process.env.PRISM_FR_BG_THROTTLE_TOP_N);
      const minRssMb = _bgClampMinRssMb(process.env.PRISM_FR_BG_THROTTLE_MIN_RSS_MB);
      const decision = _bgThrottleDecide({
        usedPct: mem.usedPct,
        memPressurePct,
        priorStampPids: priorPids,
        env: process.env,
      });
      bgThrottle.action = decision.action;
      bgThrottle.reason = decision.reason;
      bgThrottle.restoreAt = decision.restoreAt;

      if (decision.action === "throttle" && (actionsAllowed || dryRun)) {
        const procIndex = new Map((snap.procs || []).map(p => [p.pid, p]));
        const alreadyThrottled = new Set(priorPids);
        const candidates = _bgPickThrottleCandidates(snap.procs || [], procIndex, { topN, minRssMb, alreadyThrottled });
        if (candidates.length > 0) {
          const pids = candidates.map(c => c.pid);
          const setter = opts.bgSetPriority || _setPriorityForPidsExternal;
          const setResult = dryRun
            ? pids.map(pid => ({ pid, ok: false, error: "dry-run" }))
            : setter(pids, "BelowNormal");
          const okPids = setResult.filter(r => r.ok).map(r => r.pid);
          bgThrottle.throttled = okPids;
          const allPids = Array.from(new Set([...priorPids, ...okPids]));
          const stamp = _bgBuildStamp({
            nowMs: now, topN, minRssMb,
            usedPctAtThrottle: mem.usedPct, memPressurePct,
            pids: allPids,
            pidDetails: candidates.map(c => ({ pid: c.pid, name: c.name, rssBytes: c.rssBytes })),
          });
          if (actionsAllowed) {
            try {
              mkdirSync(dirname(BG_THROTTLE_STAMP_PATH), { recursive: true });
              writeFileSync(BG_THROTTLE_STAMP_PATH, JSON.stringify(stamp), "utf8");
            } catch { /* best-effort */ }
          }
        }
      } else if (decision.action === "restore" && priorPids.length > 0 && (actionsAllowed || dryRun)) {
        const setter = opts.bgSetPriority || _setPriorityForPidsExternal;
        const setResult = dryRun
          ? priorPids.map(pid => ({ pid, ok: false, error: "dry-run" }))
          : setter(priorPids, "Normal");
        bgThrottle.restored = setResult.filter(r => r.ok).map(r => r.pid);
        if (actionsAllowed) {
          try { unlinkSync(BG_THROTTLE_STAMP_PATH); } catch { /* best-effort */ }
        }
      }
    } catch (err) {
      // Defense in depth — never abort the sweep on a Tier-1.5 helper crash.
      bgThrottle.error = err && err.message ? err.message : String(err);
      caveats.push(`bg-throttle step failed: ${bgThrottle.error}`);
    }
  }

  // 7. Layer 2 — GPU + Ollama probes. Read-only; run even in status mode so the
  //    verdict surfaces GPU/Ollama state. Skipped entirely when --no-coord.
  let gpu = { available: false, reason: "coordinator skipped (--no-coord)" };
  let ollama = { reachable: false, models: [], loaded: [], reason: "coordinator skipped (--no-coord)" };
  let dockerHealth = { available: false, services: {}, reason: "coordinator skipped (--no-coord)" };
  let coordinator = {
    evaluated: false, shouldPrewarm: false, shouldHintOffload: false,
    thresholdDelta: 0, prewarmFired: false, hintWritten: false,
    reason: "coordinator skipped (--no-coord)", skipped: "--no-coord", error: null,
  };
  let serviceRestart = { state: "noop", reason: "coordinator skipped (--no-coord)", attempted: [], succeeded: [], failed: [], advise: [] };
  if (!noCoord) {
    try {
      gpu = (opts.readGpu || readGpuState)({ runNvidiaSmi: opts.runNvidiaSmi });
      ollama = (opts.readOllama || readOllamaState)({ runCurl: opts.runCurl, ollamaUrl: opts.ollamaUrl });
      // FLEET-REAPER-MS1.1: Docker + supporting-services health probe. Advisory
      // — never gates the coordinator decision (Ollama probe already catches
      // an unreachable daemon). Surfaces Docker / Postgres / Qdrant / Prometheus
      // status in the sweep result so operators see the whole infra layer.
      dockerHealth = (opts.readDockerHealth || readDockerHealth)({
        runHealthProbe: opts.runDockerHealthProbe,
      });
      // If Docker is down BUT Ollama probe says reachable, that's a Windows-
      // host Ollama (not the containerized one) — caveat for forensic clarity.
      // The reverse case (Docker up + Ollama unreachable) is interesting
      // because it means the container exited; surface that too.
      if (!dockerHealth.available && ollama.reachable) {
        caveats.push("docker down but ollama reachable — host-installed daemon, not the container");
      } else if (dockerHealth.available && !ollama.reachable) {
        caveats.push("docker up but ollama unreachable — ollama container exited or wrong network");
      }

      // FLEET-REAPER-MS1 Tier 2: under critical pressure, a wedged supporting
      // service (Qdrant/Postgres/Prometheus) is the highest-leverage relief.
      // Advisory by default; acts only with PRISM_FLEET_REAPER_SERVICE_RESTART=1.
      // The actual `docker restart` is gated on actionsAllowed (no status/dry-run).
      serviceRestart = restartWedgedServices(dockerHealth, pressureTier, {
        actionsAllowed,
        runDockerRestart: opts.runDockerRestart,
        // U-FR-T1 production wire: explicitly opt into the phantom-service
        // filter so non-deployed advisories (e.g. postgres/prometheus when
        // the host doesn't deploy them) are dropped. Tests don't pass this
        // so they preserve pre-T1 behavior automatically.
        getExistingContainers: opts.getExistingContainers || defaultGetExistingContainers,
      });
      if (serviceRestart.state === "advised") {
        const t = serviceRestart.advise.join(", ");
        caveats.push(`service relief ADVISED (critical): ${t} — ${serviceRestart.reason}`);
      } else if (serviceRestart.state.startsWith("restart")) {
        if (serviceRestart.succeeded.length) {
          caveats.push(`service auto-restarted (critical): ${serviceRestart.succeeded.join(", ")}`);
        }
        for (const f of serviceRestart.failed) {
          caveats.push(`service restart FAILED: ${f.name} — ${f.error}`);
        }
      }

      // 7b. Tier-3 (FLEET-REAPER-MS2) — NIM keepalive + scheduled-task self-heal.
      // Fires regardless of pressureTier (unlike Tier-2 which only fires
      // critical) because NIM/task should always be up if the operator has
      // them configured. Uses mtime of a cooldown-marker file for cross-sweep
      // NIM restart throttling (no persistent state file needed).
      const nimDisabled = process.env.PRISM_FLEET_REAPER_NIM_KEEPALIVE_DISABLE === "1";
      const taskSelfHealDisabled = process.env.PRISM_FLEET_REAPER_TASK_SELFHEAL_DISABLE === "1";
      const nimUrl = (process.env.PRISM_FLEET_REAPER_NIM_URL || DEFAULT_NIM_URL).replace(/\/+$/, "");
      const nimCooldownSec = Math.max(60, Number(process.env.PRISM_FLEET_REAPER_NIM_COOLDOWN_SEC) || DEFAULT_NIM_RESTART_COOLDOWN_SEC);
      const nimMarkerPath = "H:/prism/.claude/cache/fleet-reaper-nim-restart.marker";

      const nimProbe = nimDisabled
        ? { up: null, error: "disabled" }
        : probeNimDaemon({ url: nimUrl, timeoutMs: PROBE_TIMEOUT_MS });
      const nimLastRestartMs = (() => {
        try { return existsSync(nimMarkerPath) ? statSync(nimMarkerPath).mtimeMs : 0; }
        catch { return 0; }
      })();
      const nimDecision = nimKeepaliveAction({
        nimProbe, lastRestartMs: nimLastRestartMs, cooldownSec: nimCooldownSec,
        nowMs: Date.now(), disabled: nimDisabled, actionsAllowed,
      });
      if (nimDecision.action === "restart") {
        const r = restartNimDaemon({});
        if (r.ok) {
          try {
            mkdirSync(dirname(nimMarkerPath), { recursive: true });
            writeFileSync(nimMarkerPath, JSON.stringify({ ts: Date.now(), pid: r.pid }));
          } catch { /* mtime is the load-bearing signal — even if writeFileSync fails the spawn happened */ }
          caveats.push(`NIM keepalive: restarted (pid=${r.pid || "?"})`);
        } else {
          caveats.push(`NIM keepalive: restart FAILED — ${r.error}`);
        }
      } else if (nimDecision.action === "advise") {
        caveats.push(`NIM keepalive ADVISED: ${nimDecision.reason}`);
      }

      // Task self-heal: probe the scheduled task. The existing
      // probeFleetReaperTask isn't a function here — re-implement inline using
      // the same schtasks /Query + parseTaskQueryStatus pattern.
      const taskName = "PRISM Fleet Reaper";
      let taskStatusStr = "unknown";
      let taskNextRunMs = null;
      try {
        const r = execFileSync("schtasks", ["/Query", "/TN", taskName, "/V", "/FO", "LIST"], {
          timeout: PROBE_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
        });
        taskStatusStr = parseTaskQueryStatus(r);
        taskNextRunMs = parseTaskNextRun(r);
      } catch (e) {
        taskStatusStr = "unknown";
      }
      const taskCadenceMs =
        Math.max(30, Number(process.env.PRISM_FLEET_REAPER_TASK_CADENCE_SEC) || DEFAULT_TASK_CADENCE_SEC) * 1000;
      const taskSelfHealCooldownSec =
        Math.max(60, Number(process.env.PRISM_FLEET_REAPER_TASK_SELFHEAL_COOLDOWN_SEC) || DEFAULT_TASK_SELFHEAL_COOLDOWN_SEC);
      const taskSelfHealMarker = "H:/prism/.claude/cache/fleet-reaper-task-selfheal.marker";
      const taskSelfHealLastMs = (() => {
        try { return existsSync(taskSelfHealMarker) ? statSync(taskSelfHealMarker).mtimeMs : 0; }
        catch { return 0; }
      })();
      const taskNowMs = Date.now();
      const taskTriggerStalled = isTriggerStalled(taskNextRunMs, taskNowMs, taskCadenceMs);
      const taskDecision = taskSelfHealAction({
        taskStatus: taskStatusStr, disabled: taskSelfHealDisabled, actionsAllowed,
        triggerStalled: taskTriggerStalled, lastSelfHealMs: taskSelfHealLastMs,
        cooldownSec: taskSelfHealCooldownSec, nowMs: taskNowMs,
      });
      if (taskDecision.action === "run") {
        const r = runScheduledTaskNow(taskName, {});
        if (r.ok) {
          // Stamp the cooldown marker — mtime is the load-bearing signal so the
          // next sweep won't re-fire /Run on a stall that /Run could not re-arm.
          try {
            mkdirSync(dirname(taskSelfHealMarker), { recursive: true });
            writeFileSync(taskSelfHealMarker, JSON.stringify({ ts: taskNowMs, reason: taskDecision.reason }));
          } catch { /* even if the write fails the /Run happened — cooldown just won't gate */ }
          caveats.push(`fleet-reaper-task self-heal: re-run — ${taskDecision.reason}`);
        } else {
          caveats.push(`fleet-reaper-task self-heal FAILED — ${r.error}`);
        }
      } else if (taskDecision.action === "advise") {
        caveats.push(`fleet-reaper-task: ${taskDecision.reason}`);
      }

      // 7c. Tier-4 (FLEET-REAPER-MS2.4) — global claude/node working-set
      // compaction under CRITICAL pressure only. Calls Win32 EmptyWorkingSet
      // on every claude/node/bash process — Windows refaults pages on access,
      // so active chats see a brief stutter while inactive chats reclaim
      // full RSS. Cooldown-gated to prevent thrashing.
      const globalCompactDisabled = process.env.PRISM_FLEET_REAPER_GLOBAL_COMPACT_DISABLE === "1";
      const globalCompactCooldownSec = Math.max(30, Number(process.env.PRISM_FLEET_REAPER_GLOBAL_COMPACT_COOLDOWN_SEC) || DEFAULT_GLOBAL_COMPACT_COOLDOWN_SEC);
      const globalCompactMarker = "H:/prism/.claude/cache/fleet-reaper-global-compact.marker";
      const globalCompactLastMs = (() => {
        try { return existsSync(globalCompactMarker) ? statSync(globalCompactMarker).mtimeMs : 0; }
        catch { return 0; }
      })();
      const compactDecision = decideGlobalCompaction({
        pressureTier, lastCompactionMs: globalCompactLastMs,
        cooldownSec: globalCompactCooldownSec, nowMs: Date.now(),
        disabled: globalCompactDisabled, actionsAllowed,
      });
      if (compactDecision.action === "compact") {
        const r = executeGlobalCompaction({});
        if (r.ok) {
          try {
            mkdirSync(dirname(globalCompactMarker), { recursive: true });
            writeFileSync(globalCompactMarker, JSON.stringify({ ts: Date.now(), count: r.count, approxBytes: r.approxBytes }));
          } catch { /* mtime-of-marker is enough; the write is best-effort */ }
          const mb = Math.round((r.approxBytes || 0) / 1024 / 1024);
          caveats.push(`global compaction: trimmed ${r.count} process(es) (~${mb}MB working-set returned to standby)`);
        } else {
          caveats.push(`global compaction FAILED — ${r.error}`);
        }
      } else if (compactDecision.action === "advise") {
        caveats.push(`global compaction ADVISED: ${compactDecision.reason}`);
      }

      // 8. Layer 3 — coordinator decision (pure) + actions.
      const slotCounts = countSlotsByStatus(snap);
      const decision = decideOllamaCoordination({
        mem,
        gpu,
        ollama,
        slotCounts,
        cfg: {
          disabled: false, // noCoord already short-circuited above
          gpuFreeMinMb: opts.gpuFreeMinMb ?? envInt("PRISM_FLEET_REAPER_GPU_FREE_MIN_MB"),
          prewarmModel: opts.prewarmModel
            || process.env.PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL || DEFAULT_OLLAMA_PREWARM_MODEL,
          hintThresholdDelta: opts.hintThresholdDelta
            ?? envInt("PRISM_FLEET_REAPER_HINT_THRESHOLD_DELTA"),
          prewarmPct: softReliefPressurePct,
          hintPct: softReliefPressurePct,
        },
      });
      coordinator = {
        evaluated: true,
        shouldPrewarm: decision.shouldPrewarm,
        shouldHintOffload: decision.shouldHintOffload,
        thresholdDelta: decision.thresholdDelta,
        prewarmModel: decision.prewarmModel,
        prewarmFired: false,
        prewarmError: null,
        hintWritten: false,
        hintError: null,
        reason: decision.reason,
        skipped: decision.skipped,
        error: null,
      };
      const recordEvent = opts.recordEvent || recordOllamaEvent;
      const hintTtlSec = opts.hintTtlSec ?? envInt("PRISM_FLEET_REAPER_HINT_TTL_SEC") ?? DEFAULT_HINT_TTL_SEC;
      // keep-alive resolved HERE (not deep inside prewarmOllama) so it threads
      // through the same opts→env→default layer as every sibling coordinator
      // knob — and so a test injecting runSweep({ keepAlive }) is honoured.
      const keepAlive = opts.keepAlive
        || process.env.PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE || DEFAULT_OLLAMA_KEEP_ALIVE;

      if (actionsAllowed) {
        // Pre-warm — fire-and-forget; never blocks.
        if (decision.shouldPrewarm) {
          const pw = prewarmOllama(decision.prewarmModel, {
            ollamaUrl: opts.ollamaUrl, keepAlive, spawnImpl: opts.prewarmSpawn,
          });
          coordinator.prewarmFired = pw.fired;
          coordinator.prewarmError = pw.error;
          if (pw.error) caveats.push(`ollama prewarm failed: ${pw.error}`);
          recordEvent({
            hook: "fleet-reaper-coordinator", decision: "suggest",
            category: "fleet-reaper-prewarm",
            extras: { mode: "prewarm", model: decision.prewarmModel, fired: pw.fired },
          });
        }
        // Routing hint — always (re)written when the coordinator evaluated, so
        // a stale aggressive hint is neutralized to "auto" on the next sweep.
        const hr = (opts.writeHint || writeRoutingHint)(decision, {
          now, path: opts.hintPath, hintTtlSec,
        });
        coordinator.hintWritten = hr.written;
        coordinator.hintMode = hr.mode;
        coordinator.hintError = hr.error;
        if (hr.error) caveats.push(`ollama routing-hint write failed: ${hr.error}`);
        if (hr.written && hr.mode === "aggressive-offload") {
          recordEvent({
            hook: "fleet-reaper-coordinator", decision: "suggest",
            category: "fleet-reaper-hint",
            extras: { mode: "hint", thresholdDelta: hr.thresholdDelta, hintReason: decision.reason },
          });
        }
      }
    } catch (err) {
      // Defense in depth: every coordinator function guards itself — but never
      // let the GPU/Ollama layer abort the sweep.
      coordinator.error = err && err.message ? err.message : String(err);
      caveats.push(`coordinator step failed: ${coordinator.error}`);
    }
  }

  // `ok` reflects ONLY the reap mission — its MS0 contract. The CLI exit code,
  // the Stop hook, and the Monitor loop all read `ok` as "the reaper did its
  // core job." Soft-relief + coordinator are advisory layers: their errors are
  // surfaced loudly (caveats + softRelief.error / coordinator.error fields +
  // summarize/monitorEvent lines + logSweep) but must NOT flip the load-bearing
  // verdict — an Ollama glitch can't be allowed to exit-1 a scheduled task.
  const ok = reapFailed === 0;

  // ── U-FR-CRASH-WATCH — detect chat-slot crashes (heartbeat froze + chatId
  //    unchanged), write a postmortem. STRICTLY ADDITIVE: wrapped so any
  //    failure is a caveat, never an abort and never flips `ok`. Skipped in
  //    status/disabled/dry-run (no snapshot write → no false diff next run)
  //    and via PRISM_FR_CRASH_WATCH_DISABLE=1.
  let crashWatch = { engaged: false, detected: 0, postmortemPath: null, error: null };
  if (process.env.PRISM_FR_CRASH_WATCH_DISABLE !== "1" && actionsAllowed) {
    try {
      const slotsPath = opts.chatSlotsPath || DEFAULT_CHAT_SLOTS_PATH;
      const readImpl = opts.crashWatchReadImpl
        || ((p) => readFileSync(p, "utf-8"));
      let slotsData = null;
      try { slotsData = JSON.parse(readImpl(slotsPath)); } catch { slotsData = null; }
      const curr = snapshotSlotState(slotsData, now);
      const snapPath = opts.crashWatchSnapshotPath || DEFAULT_CRASH_WATCH_SNAPSHOT_PATH;
      const pmPath = opts.crashWatchPostmortemPath || DEFAULT_CRASH_POSTMORTEM_PATH;
      const prev = readPrevSnapshot(snapPath, (p) => readFileSync(p, "utf-8"));
      if (prev) {
        const crashes = detectCrashes(prev, curr, now);
        if (crashes.length > 0) {
          const rows = crashes.map((c) => formatPostmortemRow(c, {
            memUsedPct: mem.usedPct, pressureTier, now,
          }));
          const ap = appendPostmortems(rows, pmPath, {
            size: (p) => statSync(p).size,
            append: (p, b) => appendFileSync(p, b),
            rotate: (a, b) => renameSync(a, b),
          });
          if (!ap.ok) caveats.push(`crash-watch postmortem write failed: ${ap.error}`);
          crashWatch.detected = crashes.length;
          // U-FR-T2 (FLEET-REAPER-MS2): collapse N stale-slot crash caveats
          // into ONE summary line. Pre-T2 emitted one caveat per crashed slot,
          // producing N lines of identical noise every 5-min sweep (window-PID-
          // alive gate already blocks reclaim; the caveats are advisory only).
          // At 12 chats × 24h that's thousands of redundant log lines.
          // Per-slot detail is preserved in chat-crash-postmortems.jsonl.
          if (crashes.length === 1) {
            const c = crashes[0];
            caveats.push(`CHAT CRASH DETECTED: slot ${c.slot} (${c.chatId}) — heartbeat frozen ${Math.round(c.frozenMs / 60000)}m`);
          } else if (crashes.length > 1) {
            const summary = crashes
              .map((c) => `${c.slot}/${c.chatId}(${Math.round(c.frozenMs / 60000)}m)`)
              .join(", ");
            caveats.push(
              `CHAT CRASH DETECTED (${crashes.length} slots): ${summary} — postmortems written, manual reclaim if window-pid also dead`,
            );
          }
        }
      }
      const ws = writeSnapshot(snapPath, curr, {
        pid: process.pid,
        write: (p, c) => writeFileSync(p, c),
        rename: (a, b) => renameSync(a, b),
      });
      if (!ws.ok) caveats.push(`crash-watch snapshot persist failed: ${ws.error}`);
      crashWatch.engaged = true;
      crashWatch.postmortemPath = pmPath;
    } catch (err) {
      crashWatch.error = err && err.message ? err.message : String(err);
      caveats.push(`crash-watch step failed: ${crashWatch.error}`);
    }
  }

  // ── U-FR-STUCK-HUNT — find stuck bash shells / fsmonitor orphans / stale
  //    slot PIDs. STRICTLY ADDITIVE: any failure is a caveat, never flips
  //    `ok` and never aborts the sweep. Each hunter has its own disable knob;
  //    a single PRISM_FR_HUNT_DISABLE=1 also masks the whole block. Skipped
  //    in status/dry-run/disabled (consistent with crash-watch gating above).
  let stuckHunt = {
    engaged: false, stuckBashesReaped: 0, fsmonitorReaped: 0,
    staleSlots: 0, freedMb: 0, error: null,
  };
  const stuckHuntFullyDisabled = process.env.PRISM_FR_HUNT_DISABLE === "1" || (
    process.env.PRISM_FR_HUNT_STUCK_BASH_DISABLE === "1" &&
    process.env.PRISM_FR_HUNT_FSMONITOR_DISABLE === "1" &&
    process.env.PRISM_FR_HUNT_STALE_SLOT_DISABLE === "1"
  );
  // Run detection in dry-run too (reapProcesses already honors dryRun flag) so
  // operators can audit "what WOULD be reaped" without killing. Only fully
  // skipped when the sweep is status-mode or globally disabled.
  if (!isStatus && !disabled && !stuckHuntFullyDisabled) {
    try {
      const procs = snap.procs || [];
      const livePidSet = new Set(procs.map((p) => p.pid));
      // SELF-PROTECTION (scrutiny BLOCKER, reviewer C, 2026-05-21): the sweep
      // runs FROM a bash.exe hook — its own parent shell + any bash it spawned
      // this run would otherwise match findStuckBashes and be reaped mid-sweep.
      // buildProtectedPidSet collects self + ancestors + descendants; both
      // kill-emitting hunters exclude every PID in it.
      const protectedPids = buildProtectedPidSet(procs, process.pid);
      const procByPid = new Map(procs.map((p) => [p.pid, p]));
      const slotsPath = opts.chatSlotsPath || DEFAULT_CHAT_SLOTS_PATH;
      let slotsData = null;
      try { slotsData = JSON.parse(readFileSync(slotsPath, "utf-8")); } catch { slotsData = null; }
      const stuckBashAgeSec = opts.stuckBashAgeSec ?? envInt("PRISM_FR_HUNT_STUCK_BASH_AGE_SEC");
      const fsmonitorAgeSec = opts.fsmonitorAgeSec ?? envInt("PRISM_FR_HUNT_FSMONITOR_AGE_SEC");
      const orphanGraceSec = opts.orphanGraceSec ?? envInt("PRISM_FR_HUNT_ORPHAN_GRACE_SEC");
      const report = runStuckHunters({
        procs, livePidSet, slotsData, now,
        stuckBashAgeSec, fsmonitorAgeSec, orphanGraceSec,
        protectedPids, procByPid,
        enableStuckBash: process.env.PRISM_FR_HUNT_STUCK_BASH_DISABLE !== "1",
        enableFsmonitor: process.env.PRISM_FR_HUNT_FSMONITOR_DISABLE !== "1",
        enableStaleSlot: process.env.PRISM_FR_HUNT_STALE_SLOT_DISABLE !== "1",
      });
      const killer = opts.killer || defaultKiller;
      // reapProcesses returns Array<{pid, killed, error, errorClass}> — count by
      // filtering, not by reading a non-existent summary object. Dry-run flags
      // every entry `killed: false, dryRun: true`; the caveat still names the
      // would-be count so an operator auditing dry-run output sees the impact.
      const sumKills = (results) => ({
        killed: results.filter((r) => r.killed === true).length,
        failed: results.filter((r) => r.killed === false && r.dryRun !== true).length,
        wouldKill: results.length,
      });
      if (report.stuckBashes.length > 0) {
        const pids = report.stuckBashes.map((b) => b.pid);
        const rss = report.stuckBashes.reduce((s, b) => s + (b.rssBytes || 0), 0);
        const freedMb = Math.round(rss / 1024 / 1024);
        const r = sumKills(reapProcesses(pids, { dryRun, killer }));
        stuckHunt.stuckBashesReaped = r.killed;
        stuckHunt.freedMb += freedMb;
        const verb = dryRun ? `would reap ${r.wouldKill}` : `reaped ${r.killed}/${r.wouldKill}`;
        caveats.push(
          `stuck-bash hunter: ${verb} (~${freedMb}MB freed)` +
          (r.failed > 0 ? ` — ${r.failed} kill failure(s)` : ""),
        );
      }
      if (report.fsmonitorOrphans.length > 0) {
        const pids = report.fsmonitorOrphans.map((o) => o.pid);
        const rss = report.fsmonitorOrphans.reduce((s, o) => s + (o.rssBytes || 0), 0);
        const freedMb = Math.round(rss / 1024 / 1024);
        const r = sumKills(reapProcesses(pids, { dryRun, killer }));
        stuckHunt.fsmonitorReaped = r.killed;
        stuckHunt.freedMb += freedMb;
        const verb = dryRun ? `would reap ${r.wouldKill}` : `reaped ${r.killed}/${r.wouldKill}`;
        caveats.push(
          `fsmonitor hunter: ${verb} stale daemon(s) (~${freedMb}MB freed)`,
        );
      }
      if (report.staleSlotEntries.length > 0) {
        const summary = report.staleSlotEntries.map((s) => `${s.slot}(${s.deadPid})`).join(", ");
        stuckHunt.staleSlots = report.staleSlotEntries.length;
        // ADVISORY only — chat-slots.mjs owns the canonical reclaim path. We
        // surface the names so an operator runs `chat-slots reclaim` deliberately
        // (clobbering live slot state from inside the reaper is a class of bug
        // we deliberately don't introduce — see feedback_conflict_fork_rule).
        //
        // Cry-wolf fix (golf 2026-06-04): the dead-recorded-PID count OVER-reports
        // — a slot's recorded pid dies across /compact while the chat + its window
        // live on. Cross-reference the CANONICAL reclaim criteria (heartbeat-crashed
        // AND window-pid-dead) via previewReclaimable so the caveat names the
        // ACTUALLY-reclaimable subset (verified live: 11 dead-recorded-pid → 0
        // reclaimable). Fail-soft: any error falls back to the raw recorded-pid line.
        let preview = null;
        try { preview = previewReclaimable(); } catch { /* fail-soft — keep raw advisory */ }
        if (preview && preview.reclaimable.length === 0) {
          caveats.push(
            `stale-slot hunter: ${report.staleSlotEntries.length} slot(s) with a stale recorded PID (${summary}) — 0 actually reclaimable (all have live windows / fresh heartbeats; recorded PID dies across /compact). No action needed.`,
          );
        } else if (preview) {
          const rs = preview.reclaimable.map((s) => s.slot).join(", ");
          caveats.push(
            `stale-slot hunter: ${preview.reclaimable.length} reclaimable slot(s) (${rs}) of ${report.staleSlotEntries.length} with a stale recorded PID — run \`node .claude/helpers/chat-slots.mjs reclaim\` to free them.`,
          );
        } else {
          caveats.push(
            `stale-slot hunter: ${report.staleSlotEntries.length} slot(s) with dead PID (${summary}) — run \`node .claude/helpers/chat-slots.mjs reclaim\` to clean`,
          );
        }
      }
      stuckHunt.engaged = true;
    } catch (err) {
      stuckHunt.error = err && err.message ? err.message : String(err);
      caveats.push(`stuck-hunt step failed: ${stuckHunt.error}`);
    }
  }

  // ── MCP-ZOMBIE HUNT (MCP-PERMANENT-FIX-MS0 / U-MCP-ZOMBIE-HUNTER, 2026-05-23) ──
  // PRISM MCP server (node.exe running mcp-server/dist/index.js) accumulates
  // zombies when claude-code does not reap on parent-exit. Real-world finding
  // (slot:golf, 2026-05-23): 46 orphans holding 38.8 GB RSS at 81% memory
  // pressure on 128 GB. Pure-core detection in fleet-reaper-mcp-zombie-hunter.mjs;
  // sweep owns the kill side-effect via reapProcesses().
  //
  // STRICTLY ADDITIVE — fail-soft caveats only. Disable: PRISM_FR_HUNT_MCP_ZOMBIE_DISABLE=1.
  // Tune age floor: PRISM_FR_HUNT_MCP_ZOMBIE_AGE_SEC=N (default 600s; clamped 60..86400).
  let mcpZombieHunt = {
    engaged: false, reaped: 0, freedMb: 0, candidates: 0,
    byReason: { "dead-parent": 0, "non-claude-parent": 0, "no-parent-info": 0 },
    error: null,
  };
  const mcpZombieDisabled = process.env.PRISM_FR_HUNT_MCP_ZOMBIE_DISABLE === "1"
    || process.env.PRISM_FR_HUNT_DISABLE === "1";
  if (!isStatus && !disabled && !mcpZombieDisabled) {
    try {
      const procs = snap.procs || [];
      const livePidSet = new Set(procs.map((p) => p.pid));
      const procByPid = new Map(procs.map((p) => [p.pid, p]));
      const protectedPids = buildProtectedPidSet(procs, process.pid);
      const ageSec = opts.mcpZombieAgeSec
        ?? envInt("PRISM_FR_HUNT_MCP_ZOMBIE_AGE_SEC");
      const cands = findMcpZombies(procs, livePidSet, now, {
        ageSec, procByPid, protectedPids,
      });
      mcpZombieHunt.candidates = cands.length;
      for (const c of cands) {
        if (mcpZombieHunt.byReason[c.reason] !== undefined) {
          mcpZombieHunt.byReason[c.reason]++;
        }
      }
      if (cands.length > 0) {
        const pids = cands.map((c) => c.pid);
        const rss = cands.reduce((s, c) => s + (c.rssBytes || 0), 0);
        const freedMb = Math.round(rss / 1024 / 1024);
        const killer = opts.killer || defaultKiller;
        const results = reapProcesses(pids, { dryRun, killer });
        mcpZombieHunt.reaped = results.filter((r) => r.killed === true).length;
        mcpZombieHunt.freedMb = freedMb;
        const wouldKill = results.length;
        const failed = results.filter((r) => r.killed === false && r.dryRun !== true).length;
        const verb = dryRun ? `would reap ${wouldKill}` : `reaped ${mcpZombieHunt.reaped}/${wouldKill}`;
        caveats.push(
          `mcp-zombie hunter: ${verb} (~${freedMb}MB freed)` +
          (failed > 0 ? ` — ${failed} kill failure(s)` : ""),
        );
      }
      mcpZombieHunt.engaged = true;
    } catch (err) {
      mcpZombieHunt.error = err && err.message ? err.message : String(err);
      caveats.push(`mcp-zombie hunt step failed: ${mcpZombieHunt.error}`);
    }
  }

  // Second-pass hunter (2026-05-26, slot:golf) — catches RSS=0/sub-5MB stale
  // node.exe zombies that the MCP-server regex missed. Reaped 209 such procs
  // (11 GB freed) in the prompt that drove this upgrade — the gap was
  // npx-wrapper children (chrome-devtools-mcp, claude-flow, etc) and abandoned
  // bash-subagent node procs, none matching the mcp-server/dist/index.js shape.
  let staleNodeHunt = {
    engaged: false, reaped: 0, freedMb: 0, candidates: 0,
    byReason: { "dead-parent": 0, "non-claude-parent": 0, "no-parent-info": 0 },
    error: null,
  };
  const staleNodeDisabled = process.env.PRISM_FR_HUNT_STALE_NODE_DISABLE === "1"
    || process.env.PRISM_FR_HUNT_DISABLE === "1";
  if (!isStatus && !disabled && !staleNodeDisabled) {
    try {
      const procs = snap.procs || [];
      const livePidSet = new Set(procs.map((p) => p.pid));
      const procByPid = new Map(procs.map((p) => [p.pid, p]));
      const protectedPids = buildProtectedPidSet(procs, process.pid);
      const ageSec = opts.staleNodeAgeSec
        ?? envInt("PRISM_FR_HUNT_STALE_NODE_AGE_SEC");
      const rssMaxBytes = opts.staleNodeRssMaxBytes
        ?? envInt("PRISM_FR_HUNT_STALE_NODE_RSS_MAX_BYTES");
      const cands = findStaleOrphanedNodes(procs, livePidSet, now, {
        ageSec, rssMaxBytes, procByPid, protectedPids,
        // CMDLINE-ALLOWLIST (2026-06-11 incident fix): the lib's
        // DEFAULT_PRISM_WORKER_PROTECT_REGEX is the SINGLE source of truth for
        // named PRISM/fleet workers (it is a superset of the sweep's named
        // _MCP_PROTECT_REGEX patterns -- galaxy-/vault-/fleet-/build-memory/
        // watchdog/mcp-* all covered). We fold in ONLY the operator-extensible
        // PRISM_REAPER_PROTECT_EXTRA (strip its leading '|'), so a legit detached
        // fleet worker (RSS~0, dead parent) is never classified a stale orphan,
        // WITHOUT re-importing the bare `dist/index.js` that would shield foreign
        // npm zombies the hunter must reap (reviewer-C BLOCKER-1/-2).
        protectCmdRegex: buildStaleNodeProtectRegex(_PROTECT_EXTRA.replace(/^\|/, "")),
      });
      staleNodeHunt.candidates = cands.length;
      for (const c of cands) {
        if (staleNodeHunt.byReason[c.reason] !== undefined) {
          staleNodeHunt.byReason[c.reason]++;
        }
      }
      if (cands.length > 0) {
        const pids = cands.map((c) => c.pid);
        const rss = cands.reduce((s, c) => s + (c.rssBytes || 0), 0);
        const freedMb = Math.round(rss / 1024 / 1024);
        const killer = opts.killer || defaultKiller;
        const results = reapProcesses(pids, { dryRun, killer });
        staleNodeHunt.reaped = results.filter((r) => r.killed === true).length;
        staleNodeHunt.freedMb = freedMb;
        const wouldKill = results.length;
        const failed = results.filter((r) => r.killed === false && r.dryRun !== true).length;
        const verb = dryRun ? `would reap ${wouldKill}` : `reaped ${staleNodeHunt.reaped}/${wouldKill}`;
        caveats.push(
          `stale-node hunter: ${verb} (~${freedMb}MB freed)` +
          (failed > 0 ? ` — ${failed} kill failure(s)` : ""),
        );
      }
      staleNodeHunt.engaged = true;
    } catch (err) {
      staleNodeHunt.error = err && err.message ? err.message : String(err);
      caveats.push(`stale-node hunt step failed: ${staleNodeHunt.error}`);
    }
  }

  return {
    ok,
    now,
    mode,
    disabled,
    dryRun,
    config: {
      intervalSec, ageFloorSec, killAfter, effectiveKillAfter, memPressurePct,
      memCriticalPct, softReliefAgeSec, softReliefPressurePct, noRelief, noCoord,
    },
    mem,
    underPressure,
    pressureTier,
    criticalPressure,
    blockedBy,
    slots: snap.counts,
    slotsResolved: snap.slotsResolved !== false,
    caveats,
    candidates: candidateReport,
    // --hunt: full Task-Manager view of every target process. Built only for
    // the hunt mode so the normal/JSON sweep output is not bloated.
    huntReport: mode === "hunt" ? buildHuntReport(snap.classified, candidateReport) : null,
    pending: candidateReport.filter((c) => !c.willReap).length,
    reaped,
    reapedOk,
    reapFailed,
    softRelief,
    bgThrottle,
    gpu,
    ollama,
    dockerHealth,
    coordinator,
    mcpZombieHunt,
    staleNodeHunt,
    serviceRestart,
    crashWatch,
    stuckHunt,
    ledgerPath,
  };
  } finally {
    // FLEET-REAPER-MS3/U-FR-MS3-D: always restore self priority.
    // Idempotent — endBackgroundMode on a not-engaged guard is a no-op.
    // The beforeExit hook handles the process.exit() escape path.
    _endSelfIoGuard(_ioGuard);
  }
}

/**
 * FLEET-REAPER-MS1 Tier 1 — graduated memory-pressure → confirm-tick gate.
 *
 * Replaces the prior binary `underPressure ? min(killAfter,1) : killAfter`
 * with three bands:
 *   usedPct < warnPct                 → killAfter          (normal)
 *   warnPct  <= usedPct < criticalPct → min(killAfter, 1)   (warn — eager)
 *   usedPct  >= criticalPct           → 0                    (critical — reap now)
 *
 * Pure: no clock, env, or I/O. Fail-safe by construction —
 *  • non-finite / negative usedPct (a missing or bogus memory read) is treated
 *    as "no pressure signal" → killAfter unchanged (a blind sweep must never
 *    escalate reaping).
 *  • criticalPct misconfigured below warnPct is floored up to warnPct so the
 *    ≥critical band is always reachable (the two bands collapse, never invert).
 *  • non-finite killAfter → 0; a negative confirm window is meaningless so it
 *    is floored at 0.
 *
 * @param {number} usedPct      worst-of phys/commit memory %, or non-finite
 * @param {number} warnPct      lower band edge (== memPressurePct, default 90)
 * @param {number} criticalPct  upper band edge (default 95)
 * @param {number} killAfter    base confirm-tick window
 * @returns {{tier:'normal'|'warn'|'critical', effectiveKillAfter:number}}
 */
export function tierFromPressure(usedPct, warnPct, criticalPct, killAfter) {
  const ka = Number.isFinite(killAfter) ? Math.max(0, Math.trunc(killAfter)) : 0;
  const warn = Number.isFinite(warnPct) ? warnPct : DEFAULT_MEM_PRESSURE_PCT;
  let crit = Number.isFinite(criticalPct) ? criticalPct : DEFAULT_MEM_CRITICAL_PCT;
  if (crit < warn) crit = warn;
  if (!Number.isFinite(usedPct) || usedPct < 0) {
    return { tier: "normal", effectiveKillAfter: ka };
  }
  if (usedPct >= crit) return { tier: "critical", effectiveKillAfter: 0 };
  if (usedPct >= warn) return { tier: "warn", effectiveKillAfter: Math.min(ka, 1) };
  return { tier: "normal", effectiveKillAfter: ka };
}

// ── FLEET-REAPER-MS1 Tier 1: ballast state machine ──
// Module-scoped (one reservation per process — the monitor loop sweeps many
// times against the same process). Pure decision + thin imperative shell so the
// state machine is unit-testable without ever allocating a byte.
let _ballast = null;          // Buffer | null — the live reservation
let _ballastReleased = false; // one-shot latch — never re-reserve after release
let _ballastBytes = 0;

/**
 * Pure ballast state machine. No allocation, env, clock, or I/O.
 *   ballastMb <= 0 / non-finite        → "disabled"
 *   already released (latched)         → "noop"
 *   critical band  + allocated         → "release"
 *   critical band  + never allocated   → "noop"   (nothing to hand back)
 *   non-critical   + allocated         → "hold"
 *   non-critical   + not yet allocated → "allocate"
 * @returns {'disabled'|'noop'|'allocate'|'hold'|'release'}
 */
export function ballastAction({ ballastMb, allocated, released, pressureTier }) {
  const mb = Number.isFinite(ballastMb) ? Math.max(0, Math.trunc(ballastMb)) : 0;
  if (mb <= 0) return "disabled";
  if (released) return "noop";
  if (pressureTier === "critical") return allocated ? "release" : "noop";
  return allocated ? "hold" : "allocate";
}

/**
 * Imperative shell — reserve the ballast at CLI boot. Best-effort + fail-soft:
 * an allocation failure (OOM / size cap) is surfaced as `alloc-failed`, never
 * thrown — the reaper must keep working without the cushion (R12: surface, do
 * not pretend). Idempotent: a second call while held returns `hold`.
 */
export function ensureBallast(ballastMb) {
  const mb = clampInt(ballastMb, 0, 0, MAX_BALLAST_MB);
  const act = ballastAction({
    ballastMb: mb, allocated: _ballast !== null, released: _ballastReleased,
    pressureTier: "normal",
  });
  if (act !== "allocate") return { state: act, mb };
  try {
    _ballast = Buffer.allocUnsafe(mb * 1024 * 1024);
    _ballastBytes = mb * 1024 * 1024;
    return { state: "allocated", mb };
  } catch (err) {
    _ballast = null;
    _ballastBytes = 0;
    return { state: "alloc-failed", mb, error: String(err?.message || err) };
  }
}

/**
 * Imperative shell — release on the critical alarm. One-shot + idempotent:
 * latches `_ballastReleased` so a subsequent sweep in the same monitor loop
 * does not (and cannot) re-reserve and re-impose the pressure just relieved.
 * Delegates the decision to the pure `ballastAction`.
 */
export function releaseBallast(ballastMb, pressureTier) {
  const act = ballastAction({
    ballastMb, allocated: _ballast !== null, released: _ballastReleased,
    pressureTier,
  });
  if (act !== "release") return { state: act, freedMb: 0 };
  const freedMb = Math.round(_ballastBytes / (1024 * 1024));
  _ballast = null;
  _ballastReleased = true;
  _ballastBytes = 0;
  if (typeof global.gc === "function") {
    try { global.gc(); } catch { /* --expose-gc not set — drop ref only */ }
  }
  return { state: "released", freedMb };
}

/** Test-only: reset module ballast state between hermetic cases. */
export function __resetBallastForTest() {
  _ballast = null;
  _ballastReleased = false;
  _ballastBytes = 0;
}

// ── FLEET-REAPER-MS1 Tier 2: critical-pressure service auto-restart ──
// The documented compounding failure mode: a wedged Docker daemon takes
// Qdrant/Postgres/Prometheus down with it, which silently degrades
// master-index to BM25-only fleet-wide. When a sweep is already in the
// critical band, a down supporting service is the highest-leverage relief
// available — but restarting infrastructure is a high-blast-radius action, so
// this layer is ADVISORY BY DEFAULT (emits the exact restart command + reason)
// and only acts when the operator opts in with PRISM_FLEET_REAPER_SERVICE_RESTART=1.
// The Docker daemon itself is NEVER auto-restarted (killing every container is
// far worse than the wedge) — daemon-down is always advise-only. One-shot
// latched so a flapping service is not restart-looped every sweep.
const RESTARTABLE_CONTAINERS = Object.freeze({
  postgres: "postgres-prism",
  qdrant: "qdrant",
  prometheus: "prometheus",
});
let _serviceRestartActed = false; // one-shot latch (per process)

/**
 * U-FR-T1 (FLEET-REAPER-MS2): default reader of "containers actually deployed
 * on this host", used to filter out phantom service-restart advisories for
 * services that PRISM never deployed.
 *
 * Live evidence on MARKV 2026-05-18: the docker-health probe reports
 * `services.postgres = {up:false}` and `services.prometheus = {up:false}`
 * because the probe's expected-services list is hardcoded, but those
 * containers don't exist as `docker ps -a` entries on this machine.
 * Pre-T1, the advisor emitted `service relief ADVISED: postgres, prometheus`
 * — false-positive caveats on every critical sweep.
 *
 * Returns:
 *   - Array of container names if `docker ps -a` succeeded (may be empty list)
 *   - `null` if probe failed (timeout, docker CLI missing, etc.)
 * Caller treats `null` as "couldn't tell" → preserves pre-T1 behavior (advise
 * for any down-flagged service). Empty array → fully filters (no host
 * containers known, every advisory is suspect).
 */
function defaultGetExistingContainers() {
  try {
    const out = execFileSync("docker", ["ps", "-a", "--format", "{{.Names}}"], {
      timeout: PROBE_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
    });
    return String(out || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Pure service-restart state machine. No I/O, env, or clock.
 *   not critical                         → noop
 *   already acted (latched)              → noop
 *   no usable docker-health              → noop
 *   docker daemon itself down            → advise (NEVER auto — too destructive)
 *   restartable container(s) down + docker up:
 *       restartEnabled → restart(targets) ; else advise(targets)
 *   nothing down                         → noop
 * @returns {{action:'noop'|'advise'|'restart', restartTargets:string[],
 *            adviseTargets:string[], reason:string}}
 */
export function serviceRestartAction({ pressureTier, dockerHealth, restartEnabled, acted, existingContainers }) {
  const none = (reason) => ({ action: "noop", restartTargets: [], adviseTargets: [], reason });
  if (acted) return none("already-acted-this-process");
  if (pressureTier !== "critical") return none("not-critical");
  const svc = dockerHealth && typeof dockerHealth === "object" ? dockerHealth.services : null;
  if (!svc || typeof svc !== "object" || Object.keys(svc).length === 0) {
    return none("no-service-health");
  }
  const isDown = (name) => svc[name] && svc[name].up === false;
  // U-FR-T1 (FLEET-REAPER-MS2): filter to containers ACTUALLY deployed on
  // this host. `existingContainers` is the result of `docker ps -a`
  // container-name enumeration. When the caller supplies it as an array
  // (even empty), we filter; when it's null/undefined, we preserve pre-T1
  // behavior (no filter — backward-compat for tests + fail-soft when the
  // docker ps probe itself fails). Maps probe-service-name → expected
  // container-name via RESTARTABLE_CONTAINERS.
  const deployedFilter = Array.isArray(existingContainers)
    ? (name) => existingContainers.includes(RESTARTABLE_CONTAINERS[name])
    : () => true; // null/undefined → no filter (pre-T1 behavior)
  // Docker daemon down → every dependent container is unreachable AND
  // `docker restart` cannot run. Advise only, name the daemon.
  if (svc.docker && svc.docker.up === false) {
    const collateral = Object.keys(RESTARTABLE_CONTAINERS).filter(isDown).filter(deployedFilter);
    return {
      action: "advise",
      restartTargets: [],
      adviseTargets: ["docker", ...collateral],
      reason: "docker-daemon-down (operator-only restart — auto would kill every container)",
    };
  }
  const downContainers = Object.keys(RESTARTABLE_CONTAINERS).filter(isDown);
  const deployedDown = downContainers.filter(deployedFilter);
  if (deployedDown.length === 0) {
    return none(
      downContainers.length > 0
        ? `no-restartable-service-deployed-here (probe flagged ${downContainers.length} down — none present in docker ps)`
        : "no-restartable-service-down",
    );
  }
  return restartEnabled
    ? { action: "restart", restartTargets: deployedDown, adviseTargets: [], reason: "critical-pressure + restartable service down" }
    : { action: "advise", restartTargets: [], adviseTargets: deployedDown, reason: "service down (advise-only — set PRISM_FLEET_REAPER_SERVICE_RESTART=1 to auto-restart)" };
}

function defaultRunDockerRestart(container) {
  // process.execPath is irrelevant here — `docker` is the target. Bounded +
  // fail-soft: a restart that hangs or errors must never block the sweep.
  execFileSync("docker", ["restart", container], {
    timeout: PROBE_TIMEOUT_MS * 2,
    encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
  });
}

/**
 * Imperative shell. Decides via the pure machine, then (only on "restart" and
 * only when actions are allowed) attempts `docker restart <name>` per target.
 * One-shot: latches `_serviceRestartActed` whenever it advises or attempts a
 * restart, so the next sweep does not restart-loop a flapping service. Never
 * throws — a failed restart is surfaced, never fatal, never flips result.ok.
 */
export function restartWedgedServices(dockerHealth, pressureTier, {
  restartEnabled = process.env.PRISM_FLEET_REAPER_SERVICE_RESTART === "1",
  actionsAllowed = true,
  runDockerRestart = defaultRunDockerRestart,
  getExistingContainers = null,
} = {}) {
  // U-FR-T1: enumerate actually-deployed containers so the pure decision
  // function can filter out phantom advisories. The filter is OPT-IN at
  // the API boundary: when getExistingContainers is null (the default),
  // restartWedgedServices passes `existingContainers: null` through to the
  // pure decision function, which treats it as "couldn't tell" and
  // preserves pre-T1 fail-soft behavior (no advisory dropped). This makes
  // hermetic tests (which don't inject the probe) keep pre-T1 behavior.
  // The production CLI in runSweep wires `getExistingContainers:
  // defaultGetExistingContainers` explicitly to opt into filtering.
  const existingContainers = typeof getExistingContainers === "function"
    ? getExistingContainers()
    : null;
  const decision = serviceRestartAction({
    pressureTier, dockerHealth, restartEnabled, acted: _serviceRestartActed,
    existingContainers,
  });
  if (decision.action === "noop") {
    return { state: "noop", reason: decision.reason, attempted: [], succeeded: [], failed: [], advise: [] };
  }
  if (decision.action === "advise" || !actionsAllowed) {
    _serviceRestartActed = true; // one-shot — don't re-advise every sweep
    const advise = decision.adviseTargets.length ? decision.adviseTargets : decision.restartTargets;
    return {
      state: "advised",
      reason: !actionsAllowed && decision.action === "restart"
        ? "restart suppressed (status/dry-run/disabled) — advise only"
        : decision.reason,
      attempted: [], succeeded: [], failed: [], advise,
    };
  }
  // action === "restart" && actionsAllowed
  _serviceRestartActed = true;
  const succeeded = [];
  const failed = [];
  for (const name of decision.restartTargets) {
    const container = RESTARTABLE_CONTAINERS[name];
    try {
      runDockerRestart(container);
      succeeded.push(name);
    } catch (err) {
      failed.push({ name, error: String(err && err.message ? err.message : err) });
    }
  }
  return {
    state: failed.length === 0 ? "restarted" : succeeded.length ? "restarted-partial" : "restart-failed",
    reason: decision.reason,
    attempted: decision.restartTargets,
    succeeded,
    failed,
    advise: [],
  };
}

/** Test-only: reset the service-restart one-shot latch between hermetic cases. */
export function __resetServiceRestartForTest() {
  _serviceRestartActed = false;
}

function clampInt(value, fallback, min, max) {
  // `null` and `undefined` must short-circuit to fallback BEFORE Number() —
  // `Number(null) === 0` which is finite, so without this guard a null upstream
  // (e.g. envInt() returning null for an unset env var, then `?? null`) silently
  // clamps to `min` instead of using the meaningful default. That bug
  // manifested as soft-relief firing at 1% pressure instead of 90%.
  if (value === null || value === undefined) value = fallback;
  const n = Number(value);
  // Clamp the fallback too — a misconfigured default should still land in range.
  const base = Number.isFinite(n) ? Math.trunc(n) : fallback;
  return Math.min(max, Math.max(min, base));
}

// ─── Logging ────────────────────────────────────────────────────────────────

function logSweep(result, logPath = DEFAULT_LOG_PATH) {
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    try {
      const st = statSync(logPath);
      if (st.size > LOG_ROTATE_BYTES) {
        const rotated = `${logPath}.1`;
        try { if (existsSync(rotated)) unlinkSync(rotated); } catch { /* */ }
        renameSync(logPath, rotated);
      }
    } catch { /* no log yet — fine */ }
    const sr = result.softRelief || {};
    const co = result.coordinator || {};
    const gpu = result.gpu || {};
    const ol = result.ollama || {};
    const line = JSON.stringify({
      ts: new Date(result.now).toISOString(),
      mode: result.mode,
      reaped: result.reaped.map((r) => ({
        pid: r.pid, name: r.name, class: r.class, ownerSlot: r.ownerSlot,
        killed: r.killed, dryRun: r.dryRun, error: r.error,
      })),
      reapedOk: result.reapedOk,
      reapFailed: result.reapFailed,
      pending: result.pending,
      memUsedPct: result.mem.usedPct,
      underPressure: result.underPressure,
      blockedBy: result.blockedBy,
      dryRun: result.dryRun,
      disabled: result.disabled,
      // FLEET-REAPER-MS1: soft relief + coordinator outcomes.
      softRelief: {
        priorityDemoted: sr.priorityDemoted || 0,
        workingSetTrimmed: sr.workingSetTrimmed || 0,
        rssReclaimedBytes: sr.rssReclaimedBytes || 0,
        targets: sr.targets || 0,
        error: sr.error || null,
      },
      gpu: { available: !!gpu.available, freeMb: gpu.freeMb ?? null, utilizationPct: gpu.utilizationPct ?? null },
      ollama: { reachable: !!ol.reachable, loaded: Array.isArray(ol.loaded) ? ol.loaded.length : 0 },
      coordinator: {
        evaluated: !!co.evaluated,
        prewarmFired: !!co.prewarmFired,
        hintWritten: !!co.hintWritten,
        hintMode: co.hintMode || null,
        thresholdDelta: co.thresholdDelta || 0,
        skipped: co.skipped || null,
        error: co.error || co.prewarmError || co.hintError || null,
      },
      caveats: result.caveats,
    });
    appendFileSync(logPath, line + "\n", "utf8");
  } catch { /* logging is best-effort, never fatal */ }
}

/** True when a sweep result is worth a log line / a Monitor event (vs a quiet no-op). */
function isNoteworthy(result) {
  const sr = result.softRelief;
  const co = result.coordinator;
  return (
    result.reaped.length > 0 ||
    result.underPressure ||
    result.caveats.length > 0 ||
    !result.ok ||
    // FLEET-REAPER-MS1: a degraded chat-slots read suppresses leftover-bash-task
    // classification — safety-relevant, always surface it.
    result.slotsResolved === false ||
    // soft relief acted, or the coordinator pre-warmed / wrote an aggressive
    // hint, or an advisory layer errored — all worth a Monitor event + log line.
    !!(sr && (sr.priorityDemoted > 0 || sr.workingSetTrimmed > 0 || sr.error)) ||
    !!(co && (co.prewarmFired || (co.hintWritten && co.shouldHintOffload) || co.error)) ||
    // FLEET-REAPER-MS1 Tier 1: a one-shot ballast release frees ~256MB — a
    // material memory event the operator must see in the feed + log.
    !!(result.ballast && result.ballast.state === "released") ||
    // FLEET-REAPER-MS1 Tier 2: a service was advised/restarted — infra event.
    !!(result.serviceRestart && result.serviceRestart.state !== "noop")
  );
}

/** Human-readable byte size — "1.2G" / "812M" / "0". */
function fmtBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)}G`;
  if (n >= 1024 * 1024) return `${Math.round(n / (1024 * 1024))}M`;
  return `${Math.round(n / 1024)}K`;
}

/**
 * Render the `--hunt` report (buildHuntReport output) as a Task-Manager-style
 * text table — heaviest-RSS first, one line per node/bash/git process, with
 * the reap verdict spelled out. Best-effort: tolerates a missing/empty report.
 */
function formatHuntReport(huntReport) {
  const rows = (huntReport && Array.isArray(huntReport.rows)) ? huntReport.rows : [];
  const s = (huntReport && huntReport.summary) || {};
  const lines = [];
  lines.push(
    `  ── hunt: ${s.totalTargets ?? rows.length} node/bash/git target(s) · ` +
    `${s.candidates ?? 0} orphan candidate(s) · ${s.willReap ?? 0} reaping this sweep · ` +
    `${s.protectedCount ?? 0} protected · ~${fmtBytes(s.totalRssBytes)} total RSS ──`,
  );
  if (rows.length === 0) {
    lines.push("  (no node/bash/git processes enumerated — see caveats above)");
    return lines.join("\n");
  }
  for (const r of rows) {
    const age = Number.isFinite(r.ageMs) ? `${Math.round(r.ageMs / 1000)}s` : "age?";
    const owner = r.ownerSlot ? `${r.ownerSlot}/${r.ownerStatus || "?"}` : "—";
    const mark = r.willReap ? "→ REAP" : r.isCandidate ? "· hold" : "  keep";
    lines.push(
      `  ${mark} pid ${String(r.pid).padEnd(7)} ${String(r.name).padEnd(9)} ` +
      `${fmtBytes(r.rssBytes).padStart(6)} ${age.padStart(7)}  ${String(r.class).padEnd(18)} ` +
      `owner=${owner}  ${r.verdict}`,
    );
  }
  return lines.join("\n");
}

// ─── Human summary ──────────────────────────────────────────────────────────

export function summarize(result) {
  const m = result.mem;
  const memStr = Number.isFinite(m.usedPct)
    ? `${m.usedPct}%${result.criticalPressure ? " 🔴 CRITICAL" : result.underPressure ? " ⚠ PRESSURE" : ""}`
    : "n/a";
  const lines = [];
  const tag = result.dryRun ? " [dry-run]" : result.disabled ? " [DISABLED]" : "";
  lines.push(
    `fleet-reaper (${result.mode})${tag}: ${result.reapedOk} reaped, ` +
    `${result.pending} pending, ${result.candidates.length} candidate(s), mem ${memStr}`,
  );
  // `result.slots` is snap.counts — keyed by PROCESS class, not by slot. Label
  // it "procs" so a reader never mistakes "12 alive" for "12 live chat slots".
  lines.push(
    `  procs: ${result.slots["owned-by-alive"] || 0} alive · ` +
    `${result.slots["owned-by-stale"] || 0} stale · ` +
    `${result.slots["owned-by-crashed"] || 0} crashed-owned · ` +
    `${result.slots["leftover-bash-task"] || 0} leftover-bash · ` +
    `${result.slots.unowned || 0} unowned · ${result.slots.protected || 0} protected`,
  );
  for (const c of result.candidates) {
    const owner = c.ownerSlot ? `slot ${c.ownerSlot}/${c.ownerStatus}` : c.class;
    const age = Number.isFinite(c.ageMs) ? `${Math.round(c.ageMs / 1000)}s` : "age?";
    const mark = c.willReap ? "→ REAP" : "· hold";
    lines.push(`  ${mark} pid ${c.pid} ${c.name} (${owner}, ${age}) — ${c.decision}`);
  }
  for (const r of result.reaped) {
    const verb = r.dryRun ? "would reap" : r.killed ? "reaped" : "FAILED to reap";
    lines.push(`  ${verb} pid ${r.pid} ${r.name}${r.error ? ` — ${r.error}` : ""}`);
  }
  // ── FLEET-REAPER-MS1: soft relief ──
  const sr = result.softRelief;
  if (sr && (sr.attempted || sr.targets > 0)) {
    const verb = sr.dryRun ? "would nudge" : "nudged";
    lines.push(
      `  soft-relief: ${verb} ${sr.priorityDemoted} priority · ${sr.workingSetTrimmed} working-set` +
      `${sr.rssReclaimedBytes > 0 ? ` (~${fmtBytes(sr.rssReclaimedBytes)} reclaimed)` : ""}` +
      ` · ${sr.targets} stale-slot target(s)${sr.error ? ` — ERROR ${sr.error}` : ""}`,
    );
  }
  // ── FLEET-REAPER-MS1: GPU + Ollama + coordinator ──
  const gpu = result.gpu;
  if (gpu && gpu.available) {
    lines.push(
      `  gpu: ${gpu.name} ${fmtBytes((gpu.freeMb || 0) * 1024 * 1024)} free / ` +
      `${fmtBytes((gpu.totalMb || 0) * 1024 * 1024)} · ${gpu.utilizationPct ?? "?"}% util`,
    );
  } else if (gpu && gpu.reason) {
    lines.push(`  gpu: unavailable — ${gpu.reason}`);
  }
  const ol = result.ollama;
  if (ol && ol.reachable) {
    const loadedStr = ol.loaded && ol.loaded.length
      ? ol.loaded.map((l) => `${l.model}${l.sizeMb ? ` (${fmtBytes(l.sizeMb * 1024 * 1024)})` : ""}`).join(", ")
      : "no model loaded";
    lines.push(`  ollama: reachable · loaded: ${loadedStr}`);
  } else if (ol && ol.reason) {
    lines.push(`  ollama: unreachable — ${ol.reason}`);
  }
  const co = result.coordinator;
  if (co && co.evaluated) {
    if (co.prewarmFired) {
      lines.push(`  prewarm: fired ${co.prewarmModel} (keep_alive)${co.prewarmError ? ` — ERROR ${co.prewarmError}` : ""}`);
    }
    if (co.hintWritten) {
      lines.push(
        `  hint: ${co.hintMode} Δ=${co.thresholdDelta} — ${co.reason}` +
        `${co.shouldHintOffload ? " → ollama-task-offloader will absorb more" : " (neutralized)"}`,
      );
    } else if (co.hintError) {
      lines.push(`  hint: write FAILED — ${co.hintError}`);
    } else if (co.skipped) {
      lines.push(`  coordinator: skipped — ${co.skipped}`);
    }
  }
  for (const cv of result.caveats) lines.push(`  caveat: ${cv}`);
  if (result.ballast && result.ballast.state === "released") {
    lines.push(`  ballast: released ~${result.ballast.freedMb}MB (critical-pressure relief)`);
  }
  const svcRel = result.serviceRestart;
  if (svcRel && svcRel.state === "advised") {
    lines.push(`  service relief ADVISED (critical): ${svcRel.advise.join(", ")} — ${svcRel.reason}`);
  } else if (svcRel && svcRel.state && svcRel.state.startsWith("restart")) {
    if (svcRel.succeeded.length) lines.push(`  service auto-restarted: ${svcRel.succeeded.join(", ")}`);
    for (const f of svcRel.failed) lines.push(`  service restart FAILED: ${f.name} — ${f.error}`);
  }
  if (result.blockedBy && result.candidates.some((c) => c.willReap)) {
    lines.push(`  (reap suppressed: ${result.blockedBy})`);
  }
  return lines.join("\n");
}

/** Compact one-line event for the Monitor loop (only emitted when noteworthy). */
function monitorEvent(result) {
  const parts = [`[${new Date(result.now).toISOString()}] fleet-reaper`];
  if (result.reaped.length) {
    const ok = result.reapedOk;
    const fail = result.reapFailed;
    const dry = result.reaped.filter((r) => r.dryRun).length;
    const pids = result.reaped.map((r) => `${r.pid}(${r.ownerSlot || r.class})`).join(", ");
    parts.push(dry ? `would reap ${dry}: ${pids}` : `reaped ${ok}${fail ? `, ${fail} FAILED` : ""}: ${pids}`);
  }
  if (result.underPressure) {
    const band = result.criticalPressure ? "CRITICAL" : "pressure";
    parts.push(`memory ${band} ${result.mem.usedPct}% — kill-after → ${result.config.effectiveKillAfter}`);
  }
  if (result.ballast && result.ballast.state === "released") {
    parts.push(`ballast: released ~${result.ballast.freedMb}MB (critical relief)`);
  }
  const svcr = result.serviceRestart;
  if (svcr && svcr.state === "advised") {
    parts.push(`service relief ADVISED: ${svcr.advise.join(", ")}`);
  } else if (svcr && svcr.state && svcr.state.startsWith("restart")) {
    const s = svcr.succeeded.length ? `restarted ${svcr.succeeded.join(", ")}` : "";
    const f = svcr.failed.length ? `${svcr.failed.length} FAILED` : "";
    parts.push(`service auto-restart: ${[s, f].filter(Boolean).join(", ")}`);
  }
  // FLEET-REAPER-MS1: surface soft relief + coordinator activity in the feed.
  const sr = result.softRelief;
  if (sr && (sr.priorityDemoted > 0 || sr.workingSetTrimmed > 0)) {
    parts.push(
      `soft-relief: ${sr.priorityDemoted} priority + ${sr.workingSetTrimmed} working-set` +
      `${sr.rssReclaimedBytes > 0 ? ` (~${fmtBytes(sr.rssReclaimedBytes)})` : ""}`,
    );
  }
  const co = result.coordinator;
  if (co && co.prewarmFired) parts.push(`ollama prewarm: ${co.prewarmModel}`);
  if (co && co.hintWritten && co.shouldHintOffload) {
    parts.push(`ollama hint: aggressive-offload Δ=${co.thresholdDelta}`);
  }
  // Advisory-layer errors are surfaced explicitly — they no longer flip
  // `result.ok` (that stays reap-mission-only), so the monitor must name them.
  if (sr && sr.error) parts.push(`soft-relief ERROR: ${sr.error}`);
  if (co && co.error) parts.push(`coordinator ERROR: ${co.error}`);
  if (result.slotsResolved === false) parts.push("chat-slots unreadable — leftover-bash class suppressed");
  if (result.caveats.length) parts.push(`caveat: ${result.caveats[0]}`);
  // reapFailed is already named inside the `reaped` line above when reaps were
  // attempted — only add the standalone catch-all when that line didn't fire.
  if (result.reapFailed > 0 && !result.reaped.length) parts.push(`${result.reapFailed} reap FAILED`);
  return parts.join(" — ");
}

// ─── Monitor loop ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function monitorLoop(cfg) {
  const intervalMs = clampInt(cfg.intervalSec, DEFAULT_INTERVAL_SEC, MIN_INTERVAL_SEC, MAX_INTERVAL_SEC) * 1000;
  // One armed-event so the Monitor tool shows the watch is live.
  process.stdout.write(
    `[${new Date().toISOString()}] fleet-reaper monitor armed — interval ${intervalMs / 1000}s, ` +
    `kill-after ${cfg.killAfter}, age-floor ${cfg.ageFloorSec}s, dry-run ${!!cfg.dryRun}\n`,
  );
  for (;;) {
    let result;
    try {
      result = runSweep({ ...cfg, mode: "once", enumerator: cfg.enumerator || cachedEnumerate });
    } catch (err) {
      // A sweep must never kill the monitor — emit the error as an event and continue.
      process.stdout.write(`[${new Date().toISOString()}] fleet-reaper ERROR: ${err?.message || err}\n`);
      await sleep(intervalMs);
      continue;
    }
    const rel = releaseBallast(cfg.ballastMb, result.pressureTier);
    result.ballast = { state: rel.state, freedMb: rel.freedMb };
    if (isNoteworthy(result)) {
      process.stdout.write(monitorEvent(result) + "\n");
      logSweep(result);
    }
    await sleep(intervalMs);
  }
}

// ─── Tier-3 (FLEET-REAPER-MS2): NIM keepalive + scheduled-task self-heal ──
//
// User directive 2026-05-19 ([GOLF]/U-WAVE3): "make sure fleet-reaper stays
// running along with nvidia NIM + docker + ollama to relieve pressure of the
// pc so we maintain stability for 12+ chats" + "add watchdog to fleet reaper".
//
// Tier-2 already handles Docker SERVICES (qdrant/postgres/prometheus) and
// keeps the daemon as advise-only (auto-restart would kill every container).
// Tier-3 adds two orthogonal keepalives:
//   • NIM daemon (auto-restart safe — single GPU process)
//   • PRISM Fleet Reaper scheduled task (auto-run safe — schtasks /Run is idempotent)
// Both default ON. NIM disable: PRISM_FLEET_REAPER_NIM_KEEPALIVE_DISABLE=1.
// Task disable: PRISM_FLEET_REAPER_TASK_SELFHEAL_DISABLE=1.
//
// Why NOT in fleet-services-watchdog.mjs (the parallel script also written this
// session): the user explicitly asked for INTEGRATION into fleet-reaper so the
// existing 5-min cadence task does both jobs. The standalone script is a thin
// debugging mirror (`node scripts/fleet-services-watchdog.mjs --status`).
//
// Safety invariants:
//   • NIM restart is cooldown-gated (default 300s) — never restart-loop a
//     flapping NIM process.
//   • Task self-heal NEVER touches the task definition, only `schtasks /Run`
//     (which is a no-op if task is already Running).

const DEFAULT_NIM_URL = "http://127.0.0.1:8000";
const DEFAULT_NIM_RESTART_COOLDOWN_SEC = 300;
const NIM_START_SCRIPT = "H:/Tools/nim/start.ps1";
/** The "PRISM Fleet Reaper" scheduled-task repetition interval — install-fleet-reaper-task.ps1
 *  registers a 5-min trigger. Used to judge whether the task's NextRunTime has stalled
 *  (State:Ready but the trigger frozen in the past). Override: PRISM_FLEET_REAPER_TASK_CADENCE_SEC. */
const DEFAULT_TASK_CADENCE_SEC = 300;
/** Cooldown between scheduled-task self-heal re-runs. `schtasks /Run` does NOT reliably
 *  re-arm a stalled repetition trigger — without this gate a genuinely-stalled trigger
 *  would be re-run every sweep forever, each /Run launching a fresh reaper instance
 *  (a self-spawn storm under memory pressure). Override: PRISM_FLEET_REAPER_TASK_SELFHEAL_COOLDOWN_SEC. */
const DEFAULT_TASK_SELFHEAL_COOLDOWN_SEC = 900;

/** Pure: parse `schtasks /Query /TN ... /V /FO LIST` stdout → lower-cased status. */
export function parseTaskQueryStatus(stdout) {
  if (!stdout || typeof stdout !== "string") return "unknown";
  for (const l of stdout.split(/\r?\n/)) {
    const m = l.match(/^\s*Status:\s*(.+?)\s*$/i);
    if (m) {
      const s = m[1].trim().toLowerCase();
      if (s === "ready" || s === "running" || s === "disabled" || s === "queued") return s;
      return s; // pass through unknown values
    }
  }
  return "unknown";
}

/**
 * Pure: parse `Next Run Time:` from `schtasks /Query /V /FO LIST` stdout → epoch ms.
 * Returns null when the field is absent, "N/A", "Disabled", "Never", or unparseable —
 * i.e. "cannot tell", NOT "stalled". A concrete past timestamp is what isTriggerStalled
 * acts on; an unknown NextRun is left to the State-based checks.
 *
 * Locale note: schtasks emits the timestamp in the host's locale (`M/D/YYYY h:mm:ss AM/PM`
 * on a US-locale host). On a non-US locale Date.parse may return NaN → null → false:
 * a graceful no-op (the detector silently disables, never a false stall). PRISM's fleet
 * runs US-locale Windows; a non-US host simply doesn't get trigger-stall detection.
 */
export function parseTaskNextRun(stdout) {
  if (!stdout || typeof stdout !== "string") return null;
  for (const l of stdout.split(/\r?\n/)) {
    const m = l.match(/^\s*Next Run Time:\s*(.+?)\s*$/i);
    if (m) {
      const raw = m[1].trim();
      if (!raw || /^(N\/A|Disabled|Never)$/i.test(raw)) return null;
      const ms = Date.parse(raw);
      return Number.isFinite(ms) ? ms : null;
    }
  }
  return null;
}

/**
 * Pure: is a scheduled task's trigger stalled? A task can be State:Ready yet have its
 * NextRunTime frozen in the past — the trigger stopped advancing and the task will
 * never fire again. Every State-only health check (golf-guardian, fleet-task-health
 * classifyTask, this script's taskSelfHealAction) is blind to that; this closes it.
 * True only when nextRun is a concrete timestamp more than `mult × cadence` in the past.
 *
 * @param {number|null} nextRunMs  — epoch ms of the task's Next Run Time (null = unknown → false)
 * @param {number} nowMs
 * @param {number} cadenceMs       — the task's repetition interval (ms)
 * @param {number} [mult=1.5]      — slack multiplier (clock jitter / an in-progress sweep)
 * @returns {boolean}
 */
export function isTriggerStalled(nextRunMs, nowMs, cadenceMs, mult = 1.5) {
  if (!Number.isFinite(nextRunMs)) return false; // unknown NextRun → cannot assert a stall
  if (!Number.isFinite(nowMs) || !Number.isFinite(cadenceMs) || cadenceMs <= 0) return false;
  const m = Number.isFinite(mult) && mult > 0 ? mult : 1.5;
  return (nowMs - nextRunMs) > cadenceMs * m;
}

/**
 * Pure decision: should we restart NIM?
 *
 * @param {object} args
 * @param {{up:boolean|null, error?:string, httpStatus?:number}} args.nimProbe
 * @param {number} args.lastRestartMs   — 0 if never restarted in this state
 * @param {number} args.cooldownSec
 * @param {number} args.nowMs
 * @param {boolean} args.disabled       — env knob says skip
 * @param {boolean} args.actionsAllowed — false on --status/--dry-run
 * @returns {{action:'noop'|'advise'|'restart', reason:string}}
 */
export function nimKeepaliveAction({ nimProbe, lastRestartMs = 0, cooldownSec, nowMs, disabled, actionsAllowed }) {
  if (disabled) return { action: "noop", reason: "disabled-via-knob" };
  if (!nimProbe || typeof nimProbe !== "object") return { action: "noop", reason: "no-probe" };
  if (nimProbe.up === true) return { action: "noop", reason: "nim-up" };
  if (nimProbe.up === null) return { action: "noop", reason: "probe-skipped" };
  // Only "down" remains. Check cooldown.
  if (lastRestartMs && (nowMs - lastRestartMs) < cooldownSec * 1000) {
    const ageSec = Math.round((nowMs - lastRestartMs) / 1000);
    return { action: "noop", reason: `cooldown-active (${ageSec}s < ${cooldownSec}s)` };
  }
  if (!actionsAllowed) return { action: "advise", reason: "nim-down (status/dry-run — would restart)" };
  return { action: "restart", reason: `nim-down (${nimProbe.error || "no-error"})` };
}

/**
 * Pure decision: should we re-run the scheduled task?
 *
 * @param {object} args
 * @param {string} args.taskStatus       — "ready" | "running" | "disabled" | "queued" | "unknown"
 * @param {boolean} args.disabled
 * @param {boolean} args.actionsAllowed
 * @param {boolean} [args.triggerStalled] — State is healthy but NextRunTime is frozen
 *                                          in the past (see isTriggerStalled). Default false.
 * @param {number}  [args.lastSelfHealMs] — epoch ms of the last self-heal re-run (0 = never).
 * @param {number}  [args.cooldownSec]    — min seconds between self-heal re-runs.
 * @param {number}  [args.nowMs]          — clock (injectable for tests).
 * @returns {{action:'noop'|'advise'|'run', reason:string}}
 */
export function taskSelfHealAction({
  taskStatus, disabled, actionsAllowed, triggerStalled = false,
  lastSelfHealMs = 0, cooldownSec = DEFAULT_TASK_SELFHEAL_COOLDOWN_SEC, nowMs = Date.now(),
}) {
  if (disabled) return { action: "noop", reason: "disabled-via-knob" };
  const s = String(taskStatus || "").toLowerCase();
  if (s === "ready" || s === "running" || s === "queued") {
    // Healthy STATE — but a Ready task can still have a stalled trigger (NextRunTime
    // frozen in the past). That is the one failure a State-only check cannot see.
    if (triggerStalled) {
      // `schtasks /Run` does not reliably re-arm a stalled trigger, so an unfixable
      // stall must NOT re-run every sweep (each /Run spawns a fresh reaper). Gate it.
      if (lastSelfHealMs && Number.isFinite(lastSelfHealMs) &&
          Number.isFinite(nowMs) && (nowMs - lastSelfHealMs) < cooldownSec * 1000) {
        const agoSec = Math.round((nowMs - lastSelfHealMs) / 1000);
        return {
          action: "advise",
          reason: `trigger-stalled, self-heal cooldown active (re-ran ${agoSec}s ago < ${cooldownSec}s) — stall persists, schtasks /Run did not re-arm the trigger`,
        };
      }
      if (!actionsAllowed) {
        return { action: "advise", reason: `trigger-stalled (status=${s}; status/dry-run — would re-run)` };
      }
      return { action: "run", reason: `trigger-stalled (status=${s} but NextRunTime frozen in the past)` };
    }
    return { action: "noop", reason: `task-healthy (status=${s})` };
  }
  if (s === "disabled") {
    return { action: "advise", reason: "task-disabled (operator-only re-enable — refusing to flip without consent)" };
  }
  if (s === "unknown" || s === "") {
    return { action: "advise", reason: "task-status-unknown (likely uninstalled — run install-fleet-reaper-task.ps1)" };
  }
  // Some other unexpected state — advise only.
  if (!actionsAllowed) return { action: "advise", reason: `task-status=${s} (status/dry-run)` };
  return { action: "run", reason: `task-status=${s} — running it now to surface fresh status` };
}

/**
 * Side-effect: probe NIM /v1/models endpoint via curl (sync — matches the
 * runSweep sync calling convention, same pattern as ollama-docker-health probe).
 * `curl -s -m 2 -o NUL -w '%{http_code}' <url>/v1/models` → "200" if up, "000" if refused.
 */
export function probeNimDaemon({ url, timeoutMs, curlImpl = execFileSync } = {}) {
  if (!url) return { up: null, error: "no-url" };
  try {
    const timeoutSec = Math.max(1, Math.ceil((timeoutMs || 1500) / 1000));
    const out = curlImpl("curl", [
      "-s", "-m", String(timeoutSec), "-o", "NUL", "-w", "%{http_code}",
      `${url}/v1/models`,
    ], { timeout: (timeoutMs || 1500) + 500, encoding: "utf-8", windowsHide: true, maxBuffer: 4096 });
    const code = String(out || "").trim();
    if (code === "000" || code === "") return { up: false, error: "connection-refused" };
    const status = parseInt(code, 10);
    if (Number.isFinite(status) && status >= 200 && status < 500) {
      return { up: true, httpStatus: status };
    }
    return { up: false, httpStatus: status, error: `HTTP ${code}` };
  } catch (e) {
    return { up: false, error: e?.code || e?.message || "spawn-failed" };
  }
}

/** Side-effect: spawn NIM start.ps1 detached. Returns {ok, pid|error}. */
export function restartNimDaemon({ spawnImpl = spawn, startScript = NIM_START_SCRIPT, existsImpl = existsSync } = {}) {
  if (!existsImpl(startScript)) {
    return { ok: false, error: `NIM start script not found at ${startScript} (likely no NIM on this PC)` };
  }
  try {
    const child = spawnImpl("powershell", [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", startScript,
    ], { detached: true, stdio: "ignore", windowsHide: true });
    if (child && typeof child.unref === "function") child.unref();
    return { ok: true, pid: child?.pid || null };
  } catch (e) {
    return { ok: false, error: e?.message || "spawn-failed" };
  }
}

/** Side-effect: `schtasks /Run /TN <task>`. Sync. NOTE: each call launches a FRESH
 *  task instance — `/Run` is no-op-on-*error* but not harmless to repeat. A caller that
 *  may fire it every sweep MUST cooldown-gate (see taskSelfHealAction's lastSelfHealMs). */
export function runScheduledTaskNow(taskName, { spawnImpl = execFileSync, timeoutMs = 5000 } = {}) {
  try {
    spawnImpl("schtasks", ["/Run", "/TN", taskName], {
      timeout: timeoutMs, encoding: "utf-8", windowsHide: true, maxBuffer: 65536,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "spawn-failed" };
  }
}

// ─── Tier-4 (FLEET-REAPER-MS2.4): global claude/node working-set compaction ──
//
// User directive 2026-05-19 ([GOLF]/U-WAVE4): "find a way to relieve memory
// pressure for this pc with 12 concurrent chats. windows level and pc system
// level".
//
// Tier-1 ballast + Tier-2 service-restart cover physical-RAM relief paths but
// don't touch the largest consumers: claude.exe (~700MB-1GB RSS each × 12 =
// 8-12GB) and node.exe descendants (hook runners, MCP server, agents). At
// critical pressure (≥88% commit), the highest-leverage cheap action is calling
// the Win32 EmptyWorkingSet API on every claude/node/bash process — Windows
// will refault pages only as they're actually touched, so active chats see a
// brief stutter on the next request but inactive chats reclaim full RSS.
//
// Safety invariants:
//   • Fires ONLY at pressureTier === "critical" (matches Tier-2's gate)
//   • Cooldown-gated via mtime of a marker file (default 120s — pages refault
//     fast, no point trimming twice in quick succession)
//   • Idempotent — EmptyWorkingSet on a process with already-trimmed WS is a no-op
//   • Fail-soft — PowerShell errors never flip result.ok
//   • Operator can disable: PRISM_FLEET_REAPER_GLOBAL_COMPACT_DISABLE=1

const DEFAULT_GLOBAL_COMPACT_COOLDOWN_SEC = 120;
const DEFAULT_GLOBAL_COMPACT_TARGETS = ["claude", "node", "bash"];

/**
 * Pure decision: should we run global working-set compaction?
 *
 * @param {object} args
 * @param {'normal'|'warn'|'critical'} args.pressureTier
 * @param {number} args.lastCompactionMs — 0 if never compacted
 * @param {number} args.cooldownSec
 * @param {number} args.nowMs
 * @param {boolean} args.disabled
 * @param {boolean} args.actionsAllowed
 * @returns {{action:'noop'|'advise'|'compact', reason:string}}
 */
export function decideGlobalCompaction({ pressureTier, lastCompactionMs = 0, cooldownSec, nowMs, disabled, actionsAllowed }) {
  if (disabled) return { action: "noop", reason: "disabled-via-knob" };
  if (pressureTier !== "critical") return { action: "noop", reason: `not-critical (tier=${pressureTier})` };
  if (lastCompactionMs && (nowMs - lastCompactionMs) < cooldownSec * 1000) {
    const ageSec = Math.round((nowMs - lastCompactionMs) / 1000);
    return { action: "noop", reason: `cooldown-active (${ageSec}s < ${cooldownSec}s)` };
  }
  if (!actionsAllowed) return { action: "advise", reason: "would-compact (status/dry-run)" };
  return { action: "compact", reason: "critical-pressure + cooldown-expired" };
}

/**
 * Side-effect: call Win32 EmptyWorkingSet on every claude/node/bash process.
 * Trim is best-effort per-process; failure of one doesn't abort the rest.
 *
 * @returns {{ok:boolean, count?:number, approxBytes?:number, error?:string}}
 */
export function executeGlobalCompaction({ targetNames = DEFAULT_GLOBAL_COMPACT_TARGETS, spawnImpl = execFileSync, timeoutMs = 30000 } = {}) {
  // PS1 command using $ProcessHandle to get the C# handle directly, avoiding
  // Add-Type compilation (slow under memory pressure). MinWorkingSet=-1 +
  // MaxWorkingSet=-1 is the documented way to trigger EmptyWorkingSet without
  // needing P/Invoke from PowerShell — kernel handles the syscall internally.
  // Source: docs.microsoft.com/dotnet/api/system.diagnostics.process.minworkingset
  const targetList = targetNames.map((n) => `'${n}'`).join(",");
  const psCmd = [
    "$count = 0; $bytes = 0;",
    `foreach ($p in Get-Process | Where-Object { $_.ProcessName -in @(${targetList}) }) {`,
    "  try {",
    "    $beforeWS = $p.WorkingSet64;",
    // Setting MinWorkingSet to -1 then back tells Windows to trim the working
    // set to the bare minimum. No Add-Type needed — purely .NET property
    // access, ~10× faster than the Add-Type approach.
    "    $p.MinWorkingSet = [System.IntPtr]::new(-1);",
    "    $count++;",
    "    $bytes += $beforeWS;",
    "  } catch {}",
    "}",
    "Write-Output ('{ \"count\": ' + $count + ', \"approxBytes\": ' + $bytes + ' }')",
  ].join(" ");
  try {
    const out = spawnImpl("powershell", ["-NoProfile", "-Command", psCmd], {
      timeout: timeoutMs, encoding: "utf-8", windowsHide: true, maxBuffer: 65536,
    });
    const trimmed = String(out || "").trim();
    const j = JSON.parse(trimmed);
    return { ok: true, count: Number(j.count) || 0, approxBytes: Number(j.approxBytes) || 0 };
  } catch (e) {
    return { ok: false, error: e?.message?.split("\n")[0] || "spawn-failed" };
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = {
    once: false, monitorLoop: false, status: false, stopEvent: false,
    detach: false, dryRun: false, json: false, help: false, hunt: false,
    noCoord: false, noRelief: false,
    intervalSec: null, ageFloorSec: null, killAfter: null,
  };
  const errors = [];
  const takesValue = { "--interval": "intervalSec", "--age-floor": "ageFloorSec", "--kill-after": "killAfter" };
  const boolFlags = new Set([
    "--once", "--monitor-loop", "--status", "--stop-event", "--detach",
    "--dry-run", "--json", "--help", "-h", "--no-coord", "--no-relief", "--hunt",
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    let raw = argv[i];
    let inlineValue = null;
    const eq = raw.indexOf("=");
    if (raw.startsWith("--") && eq !== -1) {
      inlineValue = raw.slice(eq + 1);
      raw = raw.slice(0, eq);
    }
    // A boolean flag with `=value` (e.g. `--detach=foo`) is rejected outright —
    // silently accepting it would, for `--detach`, survive the childArgs filter
    // and re-spawn forever.
    if (inlineValue != null && boolFlags.has(raw)) {
      errors.push(`${raw} does not take a value`);
      continue;
    }
    if (raw === "--once") args.once = true;
    else if (raw === "--monitor-loop") args.monitorLoop = true;
    else if (raw === "--status") args.status = true;
    else if (raw === "--stop-event") args.stopEvent = true;
    else if (raw === "--detach") args.detach = true;
    else if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--json") args.json = true;
    else if (raw === "--no-coord") args.noCoord = true;
    else if (raw === "--no-relief") args.noRelief = true;
    else if (raw === "--hunt") args.hunt = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else if (takesValue[raw]) {
      const v = inlineValue != null ? inlineValue : argv[++i];
      // `--interval=` (empty inline value) and a missing trailing value both
      // surface as an error rather than silently coercing Number("") → 0.
      if (v == null || v === "") {
        errors.push(`${raw} expects a number, got an empty value`);
      } else {
        const n = Number(v);
        if (!Number.isFinite(n)) errors.push(`${raw} expects a number, got '${v}'`);
        else args[takesValue[raw]] = n;
      }
    } else {
      errors.push(`unknown argument '${argv[i]}'`);
    }
  }
  if ([args.monitorLoop, args.status].filter(Boolean).length > 1) {
    errors.push("--monitor-loop and --status are mutually exclusive");
  }
  if (args.monitorLoop && (args.once || args.stopEvent)) {
    errors.push("--monitor-loop cannot be combined with --once / --stop-event");
  }
  if (args.monitorLoop && args.detach) {
    errors.push("--monitor-loop cannot be combined with --detach (would orphan a silent daemon)");
  }
  if (args.hunt && (args.monitorLoop || args.status)) {
    errors.push("--hunt cannot be combined with --monitor-loop / --status (it is a one-shot Task-Manager report)");
  }
  if (args.hunt && args.detach) {
    errors.push("--hunt cannot be combined with --detach (the hunt report would be discarded)");
  }
  return { args, errors };
}

/** Merge CLI args over env knobs over built-in defaults. */
export function resolveConfig(args, env = process.env) {
  const envInt = (name) => {
    const n = Number(env[name]);
    return Number.isFinite(n) ? n : null;
  };
  return {
    intervalSec: args.intervalSec ?? envInt("PRISM_FLEET_REAPER_INTERVAL_SEC") ?? DEFAULT_INTERVAL_SEC,
    ageFloorSec: args.ageFloorSec ?? envInt("PRISM_FLEET_REAPER_AGE_FLOOR_SEC") ?? DEFAULT_AGE_FLOOR_SEC,
    killAfter: args.killAfter ?? envInt("PRISM_FLEET_REAPER_KILL_AFTER") ?? DEFAULT_KILL_AFTER,
    memPressurePct: envInt("PRISM_FLEET_REAPER_MEM_PRESSURE_PCT") ?? DEFAULT_MEM_PRESSURE_PCT,
    memCriticalPct: envInt("PRISM_FLEET_REAPER_MEM_CRITICAL_PCT") ?? DEFAULT_MEM_CRITICAL_PCT,
    ballastMb: envInt("PRISM_FLEET_REAPER_BALLAST_MB") ?? DEFAULT_BALLAST_MB,
    dryRun: !!args.dryRun || env.PRISM_FLEET_REAPER_DRY_RUN === "1",
    // FLEET-REAPER-MS1: CLI flags OR env disable the soft-relief / coordinator
    // layers. The numeric tuning knobs (age, pressure %, gpu floor, hint TTL/Δ)
    // are read directly by runSweep with env fallback — they need no CLI flag.
    noRelief: !!args.noRelief || env.PRISM_FLEET_REAPER_SOFT_RELIEF_DISABLE === "1",
    noCoord: !!args.noCoord || env.PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE === "1",
  };
}

function usage() {
  return [
    "fleet-reaper-sweep.mjs — slot-aware orphan process reaper + RAM/CPU/GPU coordinator.",
    "",
    "Usage:",
    "  node fleet-reaper-sweep.mjs [--once] [--json] [--dry-run]   one sweep (default)",
    "  node fleet-reaper-sweep.mjs --status                       report only, no write/reap",
    "  node fleet-reaper-sweep.mjs --hunt [--json] [--dry-run]     Task-Manager scan: every node/bash/git + reap verdict",
    "  node fleet-reaper-sweep.mjs --monitor-loop [--interval SEC] poll forever (Monitor tool)",
    "  node fleet-reaper-sweep.mjs --once --stop-event --detach    Stop-hook seam (returns at once)",
    "",
    "Flags: --kill-after N · --age-floor SEC · --interval SEC · --detach · --json · --dry-run · -h",
    "  --detach     re-spawn the sweep detached and return immediately (tight-budget callers)",
    "  --no-relief  skip Layer 1 (soft RAM/CPU relief — priority demote + working-set trim)",
    "  --no-coord   skip Layers 2-3 (GPU/Ollama probe + coordinator pre-warm + routing hint)",
    "Env knobs: PRISM_FLEET_REAPER_{DISABLE,DRY_RUN,KILL_AFTER,AGE_FLOOR_SEC,INTERVAL_SEC,",
    "  MEM_PRESSURE_PCT,MEM_CRITICAL_PCT,BALLAST_MB,SOFT_RELIEF_DISABLE,SOFT_RELIEF_AGE_SEC,SOFT_RELIEF_PRESSURE_PCT,",
    "  SERVICE_RESTART,OLLAMA_COORD_DISABLE,GPU_DISABLE,GPU_FREE_MIN_MB,HINT_TTL_SEC,HINT_THRESHOLD_DELTA,",
    "  OLLAMA_PREWARM_MODEL,OLLAMA_KEEP_ALIVE} · OLLAMA_URL",
    "",
    "Exit codes: 0 ok · 1 sweep completed but reported a problem · 2 misuse.",
  ].join("\n");
}

async function main() {
  const { args, errors } = parseArgs(process.argv.slice(2));
  if (errors.length) {
    for (const e of errors) process.stderr.write(`fleet-reaper-sweep: ${e}\n`);
    process.stderr.write(usage() + "\n");
    process.exit(2);
  }
  if (args.help) {
    process.stdout.write(usage() + "\n");
    return;
  }

  // Fast-return seam for the Stop hook: re-spawn ourselves detached so a caller
  // with a tight time budget (a Stop hook) never blocks on the ~1-30s sweep.
  if (args.detach) {
    const childArgs = process.argv.slice(2).filter((a) => a !== "--detach");
    const child = spawn(
      process.execPath, [fileURLToPath(import.meta.url), ...childArgs],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.unref();
    process.stdout.write(`fleet-reaper-sweep: detached sweep spawned (pid ${child.pid ?? "?"})\n`);
    return;
  }

  const cfg = resolveConfig(args);

  // FLEET-REAPER-MS1 Tier 1: reserve the critical-pressure ballast at CLI boot.
  // Skipped for --status (report-only, short-lived — reserving 256MB just to
  // print a snapshot would itself add the pressure we're trying to relieve).
  // Fail-soft: a failed reservation is logged, never fatal.
  if (!args.status) {
    const boot = ensureBallast(cfg.ballastMb);
    if (boot.state === "alloc-failed") {
      process.stderr.write(
        `fleet-reaper-sweep: ballast reserve failed (${boot.mb}MB): ${boot.error} — continuing without cushion\n`,
      );
    }
  }

  if (args.monitorLoop) {
    await monitorLoop(cfg); // runs until the process is killed
    return;
  }

  // `stop-event` runs the IDENTICAL sweep as `once` — the distinct mode is a
  // telemetry label only (it tags the log line so Stop-triggered sweeps are
  // attributable). It is intentionally neither more nor less aggressive.
  const mode = args.status
    ? "status"
    : args.hunt
      ? "hunt"
      : args.stopEvent ? "stop-event" : "once";
  const result = runSweep({ ...cfg, mode, enumerator: cfg.enumerator || cachedEnumerate });

  // Hand the ballast back the first time a sweep reports the critical band —
  // ~256MB freed exactly when the box (and the reaper itself) needs headroom.
  if (mode !== "status") {
    const rel = releaseBallast(cfg.ballastMb, result.pressureTier);
    result.ballast = { state: rel.state, freedMb: rel.freedMb };
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(summarize(result) + "\n");
    // --hunt: append the full per-process Task-Manager table after the summary.
    if (mode === "hunt" && result.huntReport) {
      process.stdout.write(formatHuntReport(result.huntReport) + "\n");
    }
  }
  if (mode !== "status" && isNoteworthy(result)) logSweep(result);

  process.exit(result.ok ? 0 : 1);
}

// Guard against import-side execution: the test file imports this module, and an
// unconditional main() would fork PowerShell against the live OS and call
// process.exit() inside the vitest worker. Mirrors cleanup-orchestrator.mjs.
const invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (invokedAsCli) {
  main().catch((err) => {
    const detail = String(err?.stack || err);
    process.stderr.write(`fleet-reaper-sweep: fatal: ${detail}\n`);
    // Fail loud AND durably — leave an on-disk trace (mirrors cleanup-orchestrator.mjs).
    try {
      mkdirSync(SHARED_DIR, { recursive: true });
      appendFileSync(
        DEFAULT_LOG_PATH,
        JSON.stringify({ ts: new Date().toISOString(), fatal: detail }) + "\n",
        "utf8",
      );
    } catch { /* best-effort */ }
    process.exit(1);
  });
}
