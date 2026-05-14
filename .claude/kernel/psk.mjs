#!/usr/bin/env node
/**
 * psk — PRISM Syscall Kernel (CLI dispatch shell)
 *
 * COMMAND-KERNEL-MS0 / U-CK01 — thin dispatch shell only. Declares the
 * 10-syscall surface every PRISM slash-command, hook, and MCP caller can
 * resolve live state through. The actual per-syscall semantics ship in
 * follow-on units:
 *   - U-CK02 fills whoami / manifest / position
 *   - U-CK03 fills handoff / checkin / pick
 *   - U-CK15+ feedback loop wires record / recommend
 *
 * This unit's job is the kernel's *shape*: a syscall TABLE, fail-soft
 * dispatch, dynamic --help, and a single re-usable dispatch() entrypoint
 * the MCP action wires through without spawning a child process.
 *
 * ## Design invariants
 * - Every syscall is fail-soft: it MUST return a degraded-but-usable
 *   {ok:false, syscall, error, note, fallback?} object on any failure
 *   path. It MUST NOT throw past dispatch(). Process exit code is always
 *   0 on a declared syscall (even degraded), 1 only on unknown-syscall
 *   or arg-parse failure.
 * - The syscall TABLE is the single source of truth — --help, MCP enum,
 *   and tests all derive their list from listSyscalls(). No hardcoded
 *   literal "10" anywhere in this file (the count is derived).
 * - dispatch() is the in-process entrypoint: tests + MCP action call it
 *   directly; the CLI is a thin argv parser around it.
 * - Each syscall composes existing helpers (stable-session-id.mjs,
 *   chat-slots.mjs, per-agent-handoff.mjs, pick-unit.mjs, etc.) instead
 *   of rebuilding their logic. U-CK02/CK03 plug richer composition in;
 *   U-CK01 wires the minimal placeholders + the fail-soft contract.
 *
 * @module .claude/kernel/psk
 * @since COMMAND-KERNEL-MS0/U-CK01
 */

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

// --------------------------------------------------------------------------
// PATH RESOLUTION — locate the PRISM repo root from this file's location.
// __dirname = .claude/kernel; so repoRoot = ../../  (two parents up).
// --------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const HELPERS_DIR = path.join(REPO_ROOT, ".claude", "helpers");
const SCRIPTS_DIR = path.join(REPO_ROOT, "scripts");
const STATE_SHARED = path.join(REPO_ROOT, "state", "shared");
const INVENTORY_FILE = path.join(REPO_ROOT, "PRISM-INVENTORY-LATEST.md");
const BUILD_STATE_FILE = path.join(STATE_SHARED, "BUILD_STATE.json");
const DEFAULT_TELEMETRY_FILE = path.join(STATE_SHARED, "pipeline-telemetry.jsonl");
// Resolve per-call so tests (or operators) can redirect the append target
// via PRISM_TELEMETRY_PATH without rebuilding/re-importing the module.
function resolveTelemetryFile() {
  const override = process.env.PRISM_TELEMETRY_PATH;
  return (override && override.trim()) ? override : DEFAULT_TELEMETRY_FILE;
}

// Named timing/limit constants (Agent A P3 fix — extract magic numbers).
const TIMEOUT_FAST_MS = 5000;          // stable-session-id, git rev-parse
const TIMEOUT_DEFAULT_MS = 10000;      // chat-slots, per-agent-handoff
const TIMEOUT_PICK_MS = 30000;         // pick-unit (large lane scan)
const MAX_BUFFER_BYTES = 4 * 1024 * 1024;

// Record-syscall string caps (P1-4 fix — prevent telemetry-pollution DoS).
const RECORD_MAX_STR = 256;
const RECORD_MAX_EXTRA = 8192;

// Handoff terminal-id whitelist regex (P1-1 fix — block prompt-injection /
// path-traversal at the psk boundary before forwarding to the helper).
const HANDOFF_TERMINAL_RE = /^[a-zA-Z0-9._@-]{1,64}$/;

// Structured error code for the only declared-shell error path
// (Agent B P2-3 fix — replaces fragile substring-match on error.message).
const ERR_UNKNOWN_SYSCALL = "UNKNOWN_SYSCALL";

// --------------------------------------------------------------------------
// FAIL-SOFT HELPER — wraps any sync/async fn so it never throws past
// dispatch(). On error: returns a degraded {ok:false, error, ...} object.
// Returning the partial state (when available) is the whole point — the
// shell MUST stay usable even when a single underlying helper is broken.
// --------------------------------------------------------------------------
/**
 * Wrap a syscall implementation so it always returns a structured result.
 * On exception: capture error.message + optional fallback payload and
 * return {ok:false, syscall, error, note, fallback}. Never re-throws.
 */
async function failSoft(syscall, fn, fallback) {
  try {
    const out = await fn();
    if (out && typeof out === "object" && "ok" in out) {
      // already-structured handler return — pass through
      return out;
    }
    return { ok: true, syscall, result: out };
  } catch (err) {
    return {
      ok: false,
      syscall,
      degraded: true,
      error: err && err.message ? err.message : String(err),
      note: `syscall ${syscall} failed soft — see error field`,
      fallback: fallback === undefined ? null : fallback,
    };
  }
}

// --------------------------------------------------------------------------
// HELPER INVOCATION — spawn a node helper script and parse its stdout.
// Used by syscalls that wrap an existing CLI helper.
// --------------------------------------------------------------------------
/**
 * Spawn a node helper with PRISM-consistent options. Always returns a
 * structured {ok, stdout, stderr, exitCode?, error?} so callers preserve
 * stderr/exit info even on failure (Agent A P2 fix — runNode preserves
 * stderr on error path; Agent B P1-3 fix — pin cwd: REPO_ROOT).
 *
 * @param {string} scriptPath  Absolute path to the .mjs/.js helper.
 * @param {string[]} args      argv to forward.
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=TIMEOUT_DEFAULT_MS]
 * @param {string} [opts.input]   Optional stdin payload (e.g. session_id JSON).
 * @returns {Promise<{ok:boolean, stdout:string, stderr:string, exitCode?:number|null, error?:string}>}
 */
async function runNode(scriptPath, args = [], opts = {}) {
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_DEFAULT_MS;
  const execOpts = {
    timeout: timeoutMs,
    maxBuffer: MAX_BUFFER_BYTES,
    cwd: REPO_ROOT,
    ...(opts.input !== undefined ? { input: opts.input } : {}),
  };
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath, [scriptPath, ...args], execOpts,
    );
    return {
      ok: true,
      stdout: String(stdout || ""),
      stderr: String(stderr || ""),
      exitCode: 0,
    };
  } catch (err) {
    // execFile rejects on non-zero exit or timeout — capture all info.
    return {
      ok: false,
      stdout: String((err && err.stdout) || ""),
      stderr: String((err && err.stderr) || ""),
      exitCode: (err && typeof err.code === "number") ? err.code : null,
      error: (err && err.message) ? err.message : String(err),
    };
  }
}

/** Try to JSON.parse stdout, else return the raw string in {text}. */
function maybeJson(stdout) {
  const trimmed = String(stdout || "").trim();
  if (!trimmed) return { text: "" };
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return JSON.parse(trimmed); } catch { /* fallthrough */ }
  }
  return { text: trimmed };
}

// --------------------------------------------------------------------------
// SYSCALL IMPLEMENTATIONS — thin shells. Each one composes an existing
// helper or returns a structured "shell-only" placeholder so U-CK02+ can
// extend without breaking callers.
// --------------------------------------------------------------------------

/**
 * syscall whoami — resolve session identity from existing helpers.
 *
 * Fail-soft contract: this function never throws past dispatch(); every
 * nested resolution (sessionId / slot / branch) catches its own errors
 * and leaves the field null/"unresolved". The result is always
 * {ok:true, syscall:"whoami", ...} with whatever pieces resolved.
 *
 * P0-2 fix: stable-session-id.mjs needs `{session_id: <uuid>}` over
 * stdin to resolve from a spawned child — caller passes params.sessionId
 * and we forward it. Falls back to ancestor-PID walk if not given.
 *
 * @param {object} params
 * @param {string} [params.sessionId]  Optional session id to anchor resolution.
 */
async function syscall_whoami(params) {
  // Composes: stable-session-id.mjs + chat-slots.mjs + git branch.
  // Full semantics (memoryPath, worktree detection, userClaudeDir) ship
  // in U-CK02 — this shell only resolves the cheap pieces.
  const sessionScript = path.join(HELPERS_DIR, "stable-session-id.mjs");

  // sessionId — pipe params.sessionId (if given) into stable-session-id.mjs
  // so its stdin-priority resolution works. Empty object => helper falls
  // back through env / PID-walk / caches. Tolerate every failure path.
  let sessionId = "unresolved";
  try {
    const stdinPayload = JSON.stringify({
      session_id: params.sessionId ? String(params.sessionId) : "",
    });
    const { stdout } = await execFileAsync(
      process.execPath, [sessionScript],
      { input: stdinPayload, timeout: TIMEOUT_FAST_MS, cwd: REPO_ROOT },
    );
    sessionId = String(stdout || "").trim() || "unresolved";
  } catch { /* tolerated — U-CK02 wires richer fallback */ }

  // slot — read chat-slots.json directly so we don't need a helper round-trip.
  // Agent A P3 fix: match against caller-supplied sessionId OR the just-
  // resolved sessionId, whichever is non-empty.
  let slot = null;
  try {
    const slotsFile = path.join(REPO_ROOT, "state", "shared", "chat-slots.json");
    if (fs.existsSync(slotsFile)) {
      const raw = JSON.parse(fs.readFileSync(slotsFile, "utf8"));
      const slots = raw.slots || {};
      const matchId = params.sessionId || (sessionId !== "unresolved" ? sessionId : null);
      if (matchId) {
        for (const [name, s] of Object.entries(slots)) {
          if (s && s.chatId && s.chatId === matchId) {
            slot = name;
            break;
          }
        }
      }
    }
  } catch { /* tolerated */ }

  // branch — git rev-parse, fail-soft
  let branch = null;
  try {
    const { stdout } = await execFileAsync(
      "git", ["-C", REPO_ROOT, "rev-parse", "--abbrev-ref", "HEAD"],
      { timeout: TIMEOUT_FAST_MS },
    );
    branch = String(stdout || "").trim() || null;
  } catch { /* tolerated */ }

  return {
    ok: true,
    syscall: "whoami",
    shell_only: true,
    note: "U-CK01 shell — U-CK02 extends with worktree/topic/userClaudeDir/memoryPath",
    result: {
      sessionId,
      slot,
      branch,
      repoRoot: REPO_ROOT,
      slotsFile: path.join(REPO_ROOT, "state", "shared", "chat-slots.json"),
      helpersDir: HELPERS_DIR,
    },
  };
}

async function syscall_manifest(params) {
  // U-CK02 will compose this from PRISM-INVENTORY-LATEST.md +
  // BUILD_STATE.json. The shell just confirms the source files
  // exist and surfaces a degraded-but-usable pointer set.
  const sources = {
    inventory: INVENTORY_FILE,
    buildState: BUILD_STATE_FILE,
    dispatcherDigest: path.join(REPO_ROOT, "mcp-server", "data", "docs", "DISPATCHER_DIGEST.md"),
    engineDigest: path.join(REPO_ROOT, "mcp-server", "data", "docs", "ENGINE_DIGEST.md"),
  };
  const available = {};
  for (const [k, p] of Object.entries(sources)) {
    available[k] = fs.existsSync(p);
  }
  return {
    ok: true,
    syscall: "manifest",
    shell_only: true,
    note: "U-CK02 extends — returns live engine/dispatcher/hook/skill counts read from inventory",
    result: { sources, available },
  };
}

async function syscall_position(params) {
  // Shell pointer set; U-CK02 reads BUILD_STATE/svi/drift snapshots.
  const candidates = [
    BUILD_STATE_FILE,
    path.join(STATE_SHARED, "MILESTONE_PROGRESS.json"),
    path.join(REPO_ROOT, "mcp-server", "data", "state", "roadmap-drift-report.json"),
    path.join(STATE_SHARED, "CURRENT_POSITION.md"),
  ];
  const available = {};
  for (const p of candidates) {
    available[path.basename(p)] = fs.existsSync(p);
  }
  return {
    ok: true,
    syscall: "position",
    shell_only: true,
    note: "U-CK02 extends — returns {build,svi,drift,buildState} from snapshots",
    result: { sources: candidates, available },
  };
}

async function syscall_delta(params) {
  // Per-session diff since last checkpoint — U-CK02 wires SessionDelta.
  return {
    ok: true,
    syscall: "delta",
    shell_only: true,
    note: "U-CK02 extends — returns session-delta vs last checkpoint",
    result: { since: params.since ?? null, available: false },
  };
}

async function syscall_tools(params) {
  // Tool/dispatcher catalog — U-CK02 fuses dispatcher_map_compact + skill list.
  const sources = {
    dispatcherDigest: path.join(REPO_ROOT, "mcp-server", "data", "docs", "DISPATCHER_DIGEST.md"),
    skillTriggers: path.join(REPO_ROOT, "knowledge", "wiki", "architecture", "_skill-triggers.jsonl"),
  };
  const available = {};
  for (const [k, p] of Object.entries(sources)) {
    available[k] = fs.existsSync(p);
  }
  return {
    ok: true,
    syscall: "tools",
    shell_only: true,
    note: "U-CK02 extends — dispatcher actions + skill triggers + hook registry fused",
    result: { sources, available, filter: params.filter ?? null },
  };
}

async function syscall_pick(params) {
  // Delegate to pick-unit.mjs; pass any --priority/--slot/--limit through.
  // U-CK03 formalizes the syscall surface; the shell delegates verbatim.
  const pickScript = path.join(SCRIPTS_DIR, "pick-unit.mjs");
  if (!fs.existsSync(pickScript)) {
    return {
      ok: false, syscall: "pick", degraded: true,
      error: `pick-unit.mjs missing at ${pickScript}`,
      note: "U-CK03 will harden this delegation",
      fallback: null,
    };
  }
  const args = [];
  if (params.priority) { args.push("--priority", String(params.priority)); }
  if (params.slot) { args.push("--slot", String(params.slot)); }
  if (params.limit != null) { args.push("--limit", String(params.limit)); }
  if (params.tier != null) { args.push("--tier", String(params.tier)); }
  // P0-3 fix: JSON output is MANDATORY. pick-unit.mjs's non-JSON mode emits
  // a header line ("# pick-unit — slot=…") that breaks maybeJson() and
  // silently strips the structured payload in MCP round-trip. Callers
  // cannot opt out of --json from this shell.
  args.push("--json");
  const r = await runNode(pickScript, args, { timeoutMs: TIMEOUT_PICK_MS });
  if (!r.ok) {
    return {
      ok: false, syscall: "pick", degraded: true,
      error: r.error || `pick-unit exit ${r.exitCode}`,
      note: "pick-unit.mjs spawn failed — see stderr",
      fallback: { stderr: r.stderr, stdout: r.stdout, exitCode: r.exitCode },
    };
  }
  return {
    ok: true,
    syscall: "pick",
    shell_only: true,
    note: "U-CK03 will fold this into a structured composite",
    result: maybeJson(r.stdout),
    warnings: r.stderr ? r.stderr : undefined,
  };
}

async function syscall_checkin(params) {
  // Shell delegates to chat-slots.mjs. U-CK03 wires the full
  // reclaim+claim+drift+commit-hygiene composite.
  // Default subcommand is 'current' (returns the slot bound to this chat)
  // — confirmed valid in chat-slots.mjs CLI and used by pick-dev.md:80.
  const slotsScript = path.join(HELPERS_DIR, "chat-slots.mjs");
  if (!fs.existsSync(slotsScript)) {
    return {
      ok: false, syscall: "checkin", degraded: true,
      error: `chat-slots.mjs missing at ${slotsScript}`,
      note: "U-CK03 will harden this",
      fallback: null,
    };
  }
  const sub = params.subcommand || "current";
  const args = [sub];
  // For 'claim' subcommand, forward whitelisted flags
  if (sub === "claim") {
    if (params.chatId) { args.push("--chatId", String(params.chatId)); }
    if (params.branch) { args.push("--branch", String(params.branch)); }
    if (params.topic) { args.push("--topic", String(params.topic)); }
    if (params.activity) { args.push("--activity", String(params.activity)); }
    if (params.preferSlot) { args.push("--preferSlot", String(params.preferSlot)); }
  } else if (sub === "current" && params.field) {
    args.push("--field", String(params.field));
  }
  const r = await runNode(slotsScript, args, { timeoutMs: TIMEOUT_DEFAULT_MS });
  if (!r.ok) {
    return {
      ok: false, syscall: "checkin", degraded: true,
      error: r.error || `chat-slots exit ${r.exitCode}`,
      note: `chat-slots.mjs subcommand '${sub}' failed — see stderr`,
      fallback: { stderr: r.stderr, stdout: r.stdout, exitCode: r.exitCode },
    };
  }
  return {
    ok: true,
    syscall: "checkin",
    shell_only: true,
    note: "U-CK03 composes reclaim+claim+drift+commit-hygiene in one call",
    result: maybeJson(r.stdout),
    warnings: r.stderr ? r.stderr : undefined,
  };
}

async function syscall_handoff(params) {
  // Delegate to per-agent-handoff.mjs read/write. U-CK03 absorbs the
  // U-TODOWRITE-HANDOFF-BRIDGE behavior on top.
  const handoffScript = path.join(HELPERS_DIR, "per-agent-handoff.mjs");
  if (!fs.existsSync(handoffScript)) {
    return {
      ok: false, syscall: "handoff", degraded: true,
      error: `per-agent-handoff.mjs missing at ${handoffScript}`,
      note: "U-CK03 will harden this",
      fallback: null,
    };
  }
  const sub = params.subcommand || "read";
  if (sub !== "read" && sub !== "write") {
    return {
      ok: false, syscall: "handoff", degraded: true,
      error: `unknown subcommand '${sub}' (expected read|write)`,
      note: "U-CK03 may add list/diff/migrate",
      fallback: null,
    };
  }
  // P1-1 fix: whitelist-validate `terminal` BEFORE forwarding. The helper
  // sanitizes filenames but does not bound input length / character set.
  if (params.terminal !== undefined && !HANDOFF_TERMINAL_RE.test(String(params.terminal))) {
    return {
      ok: false, syscall: "handoff", degraded: true,
      error: `invalid terminal '${params.terminal}' (must match ${HANDOFF_TERMINAL_RE})`,
      note: "P1-1 whitelist guard — supply a valid chat id like 'claude-2645074c'",
      fallback: null,
    };
  }
  const args = [sub];
  if (params.terminal) { args.push("--terminal", String(params.terminal)); }
  if (sub === "write") {
    args.push("--source", String(params.source || "live-chat"));
    if (params.topic) { args.push("--topic", String(params.topic)); }
    if (params.resume) { args.push("--resume", String(params.resume)); }
    if (params.state) { args.push("--state", String(params.state)); }
  }
  // P0-1 fix: pipe a {session_id} payload over stdin so the helper's
  // readStdinSessionId() priority resolution works when running detached
  // from a Claude hook. Without this, `handoff read` exits non-zero from
  // a spawned context (live-tested by reviewer Agent B).
  const stdinPayload = params.sessionId
    ? JSON.stringify({ session_id: String(params.sessionId) })
    : undefined;
  const r = await runNode(handoffScript, args, {
    timeoutMs: TIMEOUT_DEFAULT_MS,
    input: stdinPayload,
  });
  if (!r.ok) {
    return {
      ok: false, syscall: "handoff", degraded: true,
      error: r.error || `per-agent-handoff exit ${r.exitCode}`,
      note: `per-agent-handoff.mjs '${sub}' failed — see stderr`,
      fallback: { stderr: r.stderr, stdout: r.stdout, exitCode: r.exitCode },
    };
  }
  return {
    ok: true,
    syscall: "handoff",
    shell_only: true,
    note: "U-CK03 may absorb TodoWrite-handoff bridge",
    result: maybeJson(r.stdout),
    warnings: r.stderr ? r.stderr : undefined,
  };
}

async function syscall_record(params) {
  // Append a command-telemetry event to pipeline-telemetry.jsonl.
  // U-CK15+ wires this into the AdaptiveThresholds feedback loop and
  // moves the append into a real telemetry pipeline with locking; the
  // shell only enforces input bounds (P1-4 DoS protection).
  const required = ["event", "command"];
  for (const key of required) {
    if (!params[key]) {
      return {
        ok: false, syscall: "record", degraded: true,
        error: `missing required field: ${key}`,
        note: "expected {event, command, ...}",
        fallback: null,
      };
    }
  }
  // P1-4 fix: clamp every string field so a caller can't pollute the
  // telemetry log with a 10 MB blob. extra is serialized + capped.
  const clamp = (v, n) => (v == null ? null : String(v).slice(0, n));
  let extraSerialized = null;
  if (params.extra != null) {
    try {
      extraSerialized = JSON.stringify(params.extra).slice(0, RECORD_MAX_EXTRA);
    } catch {
      extraSerialized = String(params.extra).slice(0, RECORD_MAX_EXTRA);
    }
  }
  const entry = {
    ts: new Date().toISOString(),
    event: clamp(params.event, RECORD_MAX_STR),
    command: clamp(params.command, RECORD_MAX_STR),
    outcome: clamp(params.outcome ?? "unknown", RECORD_MAX_STR),
    tokens: typeof params.tokens === "number" ? params.tokens : null,
    latency_ms: typeof params.latency_ms === "number" ? params.latency_ms : null,
    extra: extraSerialized,
  };
  const telemetryFile = resolveTelemetryFile();
  try {
    const dir = path.dirname(telemetryFile);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
    // appendFileSync is atomic for single small writes on POSIX (O_APPEND)
    // and ~atomic on Windows NTFS for sub-PIPE_BUF payloads. U-CK15+ swaps
    // this for a SQLite-WAL backed queue when the feedback loop wires.
    fs.appendFileSync(telemetryFile, JSON.stringify(entry) + "\n", "utf8");
    return { ok: true, syscall: "record", shell_only: true, result: { written: true, file: telemetryFile, entry } };
  } catch (err) {
    return {
      ok: false, syscall: "record", degraded: true,
      error: err && err.message ? err.message : String(err),
      note: "append failed — entry preserved in fallback for retry",
      fallback: { entry, file: telemetryFile },
    };
  }
}

async function syscall_recommend(params) {
  // Surface SlashCommandRecommenderEngine + skill-auto-trigger output.
  // U-CK15+ wires it into the closed feedback loop. Shell only returns
  // a placeholder pointing at the trigger ledger.
  const triggerLedger = path.join(REPO_ROOT, "knowledge", "wiki", "architecture", "_skill-triggers.jsonl");
  return {
    ok: true,
    syscall: "recommend",
    shell_only: true,
    note: "U-CK15+ wires SlashCommandRecommenderEngine + adaptive-thresholds closed loop",
    result: {
      query: params.query ?? null,
      sources: { triggerLedger },
      available: { triggerLedger: fs.existsSync(triggerLedger) },
    },
  };
}

// --------------------------------------------------------------------------
// SYSCALL TABLE — single source of truth.
// --help, MCP enum, and tests all read THIS object.
// --------------------------------------------------------------------------
const SYSCALLS = Object.freeze({
  whoami: {
    description: "Resolve session identity (sessionId, slot, branch, repoRoot)",
    handler: syscall_whoami,
  },
  manifest: {
    description: "Live engine/dispatcher/hook/skill count manifest",
    handler: syscall_manifest,
  },
  position: {
    description: "Current build/svi/drift/buildState position snapshot",
    handler: syscall_position,
  },
  delta: {
    description: "Per-session diff vs last checkpoint",
    handler: syscall_delta,
  },
  tools: {
    description: "Tool/dispatcher/skill catalog + filter",
    handler: syscall_tools,
  },
  pick: {
    description: "Pick next unit (delegates to pick-unit.mjs)",
    handler: syscall_pick,
  },
  checkin: {
    description: "Fleet check-in / slot claim (delegates to chat-slots.mjs)",
    handler: syscall_checkin,
  },
  handoff: {
    description: "Per-chat handoff read/write (delegates to per-agent-handoff.mjs)",
    handler: syscall_handoff,
  },
  record: {
    description: "Append command-telemetry event to pipeline-telemetry.jsonl",
    handler: syscall_record,
  },
  recommend: {
    description: "Surface command/skill recommendations (shell — closed loop in U-CK15+)",
    handler: syscall_recommend,
  },
});

/** Public: list the declared syscalls. Source of truth for --help, MCP, tests. */
export function listSyscalls() {
  return Object.keys(SYSCALLS);
}

/** Public: get description of one syscall (or all). */
export function describeSyscalls() {
  const out = {};
  for (const [name, def] of Object.entries(SYSCALLS)) {
    out[name] = def.description;
  }
  return out;
}

// --------------------------------------------------------------------------
// DISPATCH — in-process entrypoint. MCP action + tests + CLI all call this.
// Never throws; always returns a structured result.
// --------------------------------------------------------------------------
/**
 * Dispatch a syscall by name. Always fail-soft.
 * @param {string} syscall — one of listSyscalls()
 * @param {object} params — syscall-specific params
 * @returns {Promise<object>} {ok, syscall, result?, error?, degraded?, note?, fallback?}
 */
export async function dispatch(syscall, params = {}) {
  if (typeof syscall !== "string" || !syscall) {
    return {
      ok: false, syscall: null, degraded: true,
      errorCode: ERR_UNKNOWN_SYSCALL,
      error: "syscall must be a non-empty string",
      note: `valid syscalls: ${listSyscalls().join(", ")}`,
    };
  }
  const def = SYSCALLS[syscall];
  if (!def) {
    return {
      ok: false, syscall, degraded: true,
      errorCode: ERR_UNKNOWN_SYSCALL,
      error: `unknown syscall '${syscall}'`,
      note: `valid syscalls: ${listSyscalls().join(", ")}`,
    };
  }
  const safeParams = (params && typeof params === "object") ? params : {};
  return failSoft(syscall, () => def.handler(safeParams));
}

// --------------------------------------------------------------------------
// CLI — thin argv wrapper around dispatch().
// --------------------------------------------------------------------------
function parseArgs(argv) {
  // argv: [syscall, --key, value, --key=value, --flag, ...]
  const out = { syscall: null, params: {}, format: "json", help: false, list: false };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === "--help" || a === "-h") { out.help = true; i++; continue; }
    if (a === "--list" || a === "--syscalls") { out.list = true; i++; continue; }
    if (a === "--pretty") { out.format = "pretty"; i++; continue; }
    if (a === "--json") { out.format = "json"; i++; continue; }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      let key, val;
      if (eq >= 0) {
        key = a.slice(2, eq);
        val = a.slice(eq + 1);
        i++;
      } else {
        key = a.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("--")) {
          val = true;
          i++;
        } else {
          val = next;
          i += 2;
        }
      }
      // Coerce a few well-known numerics
      if (typeof val === "string" && /^-?\d+$/.test(val)) { val = Number(val); }
      out.params[key] = val;
      continue;
    }
    if (out.syscall === null) { out.syscall = a; i++; continue; }
    i++; // ignore extra positionals
  }
  return out;
}

function printHelp() {
  const syscalls = listSyscalls();
  const desc = describeSyscalls();
  const lines = [
    "psk — PRISM Syscall Kernel (COMMAND-KERNEL-MS0/U-CK01 shell)",
    "",
    "Usage:",
    "  node .claude/kernel/psk.mjs <syscall> [--key value]...",
    "  node .claude/kernel/psk.mjs --list",
    "  node .claude/kernel/psk.mjs --help",
    "",
    `Syscalls (${syscalls.length} declared — table-derived, not hardcoded):`,
  ];
  for (const name of syscalls) {
    lines.push(`  ${name.padEnd(12)} ${desc[name]}`);
  }
  lines.push("");
  lines.push("Flags:");
  lines.push("  --json    Output JSON (default).");
  lines.push("  --pretty  Output pretty-printed JSON.");
  lines.push("  --help    Show this help and exit.");
  lines.push("  --list    Print the syscall table as JSON and exit.");
  lines.push("");
  lines.push("Notes:");
  lines.push("  Each syscall is fail-soft (no throws; degraded results return ok=false).");
  lines.push("  Exit code 0 on any declared syscall (incl. degraded), 1 on unknown.");
  return lines.join("\n");
}

async function cliMain(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(printHelp() + "\n");
    return 0;
  }
  if (args.list) {
    const payload = { ok: true, syscalls: describeSyscalls() };
    process.stdout.write(JSON.stringify(payload) + "\n");
    return 0;
  }
  if (!args.syscall) {
    process.stderr.write(
      "psk: no syscall given. Try `psk --help` or `psk --list`.\n",
    );
    return 1;
  }
  const result = await dispatch(args.syscall, args.params);
  const text = args.format === "pretty"
    ? JSON.stringify(result, null, 2)
    : JSON.stringify(result);
  process.stdout.write(text + "\n");
  // Declared syscalls always exit 0 (degraded is still a structured result).
  // Unknown-syscall is the only declared-shell error → exit 1.
  // P2-3 fix: use structured errorCode, not substring match on error.message.
  return result.errorCode === ERR_UNKNOWN_SYSCALL ? 1 : 0;
}

// CLI entrypoint — only run when invoked directly, not when imported.
const isDirectInvoke =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectInvoke) {
  cliMain(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      // Last-resort safety net — should never reach here because dispatch()
      // already fail-softs everything, but defense-in-depth.
      process.stderr.write(
        `psk: fatal error escaped fail-soft: ${err && err.message ? err.message : err}\n`,
      );
      process.exit(2);
    });
}
