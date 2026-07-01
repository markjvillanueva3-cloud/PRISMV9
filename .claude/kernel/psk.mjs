/**
 * psk — PRISM Syscall Kernel (CLI dispatch shell)
 *
 * NB: no `#!` shebang — Vitest 4's vm.Script module evaluator cannot parse
 * one (Node strips shebangs natively, vm.Script does not), which broke
 * every psk test with "SyntaxError: Invalid or unexpected token". psk runs
 * via `node psk.mjs` / dispatch() in-process, never `./psk.mjs` — the
 * shebang was dead weight. Do not re-add it. (COMMAND-KERNEL-MS0/U-CK03)
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
import os from "node:os";
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

// U-CK29: cross-session outcome journal — promoted memory the recommend
// syscall mines for analogies. One JSONL per session under
// knowledge/wiki/os/sessions/. PRISM_OS_SESSIONS_DIR overrides for tests.
const DEFAULT_OS_SESSIONS_DIR = path.join(REPO_ROOT, "knowledge", "wiki", "os", "sessions");
function resolveOsSessionsDir() {
  const override = process.env.PRISM_OS_SESSIONS_DIR;
  return (override && override.trim()) ? override : DEFAULT_OS_SESSIONS_DIR;
}
// SESSION_ID whitelist — same shape as HANDOFF_TERMINAL_RE; refuses
// directory-traversal payloads at the syscall boundary.
const SESSION_ID_RE = /^[a-zA-Z0-9._@-]{1,64}$/;
function resolveSessionJournalFile(sessionId) {
  if (!sessionId || !SESSION_ID_RE.test(sessionId)) { return null; }
  return path.join(resolveOsSessionsDir(), `${sessionId}.jsonl`);
}
// U-CK29 analogy scoring: keyword-overlap on event/command/outcome/extra,
// ties broken by recency. Deterministic — no model call, R5-compliant.
function scoreAnalogyEntry(entry, queryTokens) {
  if (!queryTokens || queryTokens.length === 0) { return 0; }
  const hay = [entry.event, entry.command, entry.outcome, entry.extra]
    .filter((x) => x != null).join(" ").toLowerCase();
  let s = 0;
  for (const t of queryTokens) { if (t && hay.includes(t)) { s += 1; } }
  return s;
}
const RECOMMEND_MAX_K = 50;
const RECOMMEND_MAX_BYTES_PER_FILE = 1024 * 1024; // 1 MB cap per journal (DoS)

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

// --------------------------------------------------------------------------
// U-CK03 — composite checkin + TodoWrite-handoff absorption.
// Bounds on every external surface to keep the syscall fail-soft + DoS-safe.
// --------------------------------------------------------------------------
const CHECKIN_COMPOSITE_TIMEOUT_MS = 60000;       // overall budget for reclaim+claim+drift+git
const TODOWRITE_TASK_MAX_COUNT = 50;              // safety cap on tasks-array length
const TODOWRITE_TASK_MAX_SUBJECT_LEN = 256;       // safety cap on each subject string
const TODOWRITE_VALID_STATUSES = Object.freeze(["pending", "in_progress", "completed"]);
const TODOWRITE_SNAPSHOT_MARKER = "## Open tasks (TodoWrite snapshot)";
const DRIFT_SCRIPT_REL = path.join("scripts", "audit-roadmap-drift.mjs");

// Structured error code for the only declared-shell error path
// (Agent B P2-3 fix — replaces fragile substring-match on error.message).
const ERR_UNKNOWN_SYSCALL = "UNKNOWN_SYSCALL";

// --------------------------------------------------------------------------
// U-CK02 — sentinels, error codes, and category-key mapping for the live
// whoami/manifest/position implementations. Every degradable field returns
// EXACTLY this string when unresolved (test asserts string-type + non-empty).
// --------------------------------------------------------------------------
const UNRESOLVED_SENTINEL = "<unresolved>";
const ERR_PATH_TRAVERSAL = "PATH_TRAVERSAL";

// Map the PRISM-INVENTORY-LATEST.md markdown labels → stable snake_case keys.
// Drives both `manifest.counts` and the 10-key `manifest.top` projection.
const INVENTORY_LABEL_TO_KEY = Object.freeze({
  "Engines": "engines",
  "Dispatchers": "dispatchers",
  "Actions": "actions",
  "Algorithms": "algorithms",
  "Registries": "registries",
  "Tests": "tests",
  "Source Hooks": "source_hooks",
  "Claude Hooks": "claude_hooks",
  "Scripts": "scripts",
  "Slash Commands (local)": "slash_cmds_local",
  "Slash Commands (user)": "slash_cmds_user",
  "Migrations": "migrations",
  "Formulas": "formulas",
});

// The exact 10 keys advertised by manifest.top (test asserts this set).
const MANIFEST_TOP_KEYS = Object.freeze([
  "engines", "dispatchers", "actions", "algorithms", "registries",
  "tests", "source_hooks", "claude_hooks", "scripts", "slash_cmds_local",
]);

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
  // U-CK09 BUGFIX: `input` is an execFileSync/spawnSync-ONLY option —
  // promisify(execFile) SILENTLY IGNORES it, leaving the child's stdin pipe
  // open. A helper that reads fd 0 (per-agent-handoff.mjs
  // readStdinSessionId → fs.readFileSync(0)) then blocks until the timeout
  // kills it. This made `psk handoff read` hang EXACTLY TIMEOUT_DEFAULT_MS
  // on every call and report a misleading "Command failed" (null exitCode).
  // When an `input` payload is supplied we spawn via the callback form and
  // explicitly end the child's stdin ourselves (writing "" still sends
  // EOF). The no-input path is byte-unchanged (R3 surgical).
  const execOpts = {
    timeout: timeoutMs,
    maxBuffer: MAX_BUFFER_BYTES,
    cwd: REPO_ROOT,
  };
  try {
    let stdout;
    let stderr;
    if (opts.input !== undefined) {
      ({ stdout, stderr } = await new Promise((resolve, reject) => {
        const child = execFile(
          process.execPath, [scriptPath, ...args], execOpts,
          (err, so, se) => {
            if (err) { err.stdout = so; err.stderr = se; reject(err); }
            else { resolve({ stdout: so, stderr: se }); }
          },
        );
        // Write the payload (may be "") then CLOSE stdin so a helper that
        // reads fd 0 gets EOF immediately instead of blocking forever.
        try { child.stdin.end(String(opts.input)); }
        catch { /* stdin already unavailable — non-fatal */ }
      }));
    } else {
      ({ stdout, stderr } = await execFileAsync(
        process.execPath, [scriptPath, ...args], execOpts,
      ));
    }
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
// U-CK03 — git probe + composite-checkin sub-runners + TodoWrite block.
// All git invocations use execFile (no shell), bounded by TIMEOUT_FAST_MS.
// --------------------------------------------------------------------------

/**
 * Single git invocation — execFile-only (no shell), fail-soft.
 * @param {string[]} args
 * @param {{timeoutMs?:number, cwd?:string}} [opts]
 * @returns {Promise<{ok:boolean, stdout:string, stderr:string, error?:string}>}
 */
async function gitOnce(args, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_FAST_MS;
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER_BYTES,
      cwd: opts.cwd ?? REPO_ROOT,
    });
    return {
      ok: true,
      stdout: String(stdout || "").trim(),
      stderr: String(stderr || ""),
    };
  } catch (err) {
    return {
      ok: false,
      stdout: String((err && err.stdout) || "").trim(),
      stderr: String((err && err.stderr) || ""),
      error: (err && err.message) ? err.message : String(err),
    };
  }
}

/**
 * Collect commit-hygiene snapshot via 4 parallel git probes:
 *   - `git status --porcelain` → dirty/staged/untracked counts
 *   - `git rev-parse --abbrev-ref HEAD` → current branch
 *   - `git rev-parse --show-toplevel` → active worktree path
 *   - `git rev-list --count --left-right @{upstream}...HEAD` → ahead/behind
 * Each probe is independently fail-soft; errors collected into `errors[]`.
 */
async function collectCommitHygiene() {
  const [statusR, branchR, worktreeR, aheadR] = await Promise.all([
    gitOnce(["status", "--porcelain"]),
    gitOnce(["rev-parse", "--abbrev-ref", "HEAD"]),
    gitOnce(["rev-parse", "--show-toplevel"]),
    gitOnce(["rev-list", "--count", "--left-right", "@{upstream}...HEAD"]),
  ]);
  const hygiene = {
    branch: branchR.ok ? branchR.stdout : null,
    worktree: worktreeR.ok ? worktreeR.stdout : null,
    dirty: null,
    staged: null,
    untracked: null,
    ahead: null,
    behind: null,
    errors: [],
  };
  if (statusR.ok) {
    const lines = statusR.stdout ? statusR.stdout.split("\n") : [];
    let dirty = 0, staged = 0, untracked = 0;
    for (const ln of lines) {
      if (ln.length < 2) continue;
      const xy = ln.slice(0, 2);
      if (xy === "??") { untracked++; continue; }
      // X = index status, Y = worktree status; " " or "?" means clean for that axis
      if (xy[0] !== " " && xy[0] !== "?") staged++;
      if (xy[1] !== " " && xy[1] !== "?") dirty++;
    }
    hygiene.dirty = dirty;
    hygiene.staged = staged;
    hygiene.untracked = untracked;
  } else {
    hygiene.errors.push({ op: "status", error: statusR.error || "git status failed" });
  }
  if (aheadR.ok) {
    // `rev-list --left-right --count A...B` emits "<left>\t<right>"
    // where left = commits in A not in B (behind), right = commits in B not in A (ahead).
    const parts = aheadR.stdout.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const behind = Number(parts[0]);
      const ahead = Number(parts[1]);
      hygiene.behind = Number.isFinite(behind) ? behind : null;
      hygiene.ahead = Number.isFinite(ahead) ? ahead : null;
    }
  } else {
    // detached HEAD / no upstream is a common, expected failure — record but do not surface as fatal
    hygiene.errors.push({ op: "ahead-behind", error: aheadR.error || "no upstream / detached HEAD" });
  }
  if (!branchR.ok) hygiene.errors.push({ op: "branch", error: branchR.error || "git rev-parse failed" });
  if (!worktreeR.ok) hygiene.errors.push({ op: "worktree", error: worktreeR.error || "git rev-parse failed" });
  return hygiene;
}

/**
 * Run the drift audit script via runNode; fail-soft.
 * @returns {Promise<{ok:boolean, result?:any, error?:string, stderr?:string}>}
 */
async function runDriftCheck() {
  const driftScript = path.join(REPO_ROOT, DRIFT_SCRIPT_REL);
  if (!fs.existsSync(driftScript)) {
    return { ok: false, error: `drift script missing at ${driftScript}` };
  }
  const r = await runNode(driftScript, [], { timeoutMs: TIMEOUT_DEFAULT_MS });
  if (!r.ok) {
    return {
      ok: false,
      error: r.error || `drift script exit ${r.exitCode}`,
      stderr: r.stderr,
    };
  }
  return { ok: true, result: maybeJson(r.stdout) };
}

/**
 * Pure: validate + format a TodoWrite tasks array as a markdown snapshot block.
 * Returns empty string on invalid/empty input (caller skips the prepend).
 *
 * Sanitization:
 *   - subject capped at TODOWRITE_TASK_MAX_SUBJECT_LEN
 *   - newlines collapsed to spaces (prevent breaking the line-item)
 *   - status defaulted to 'pending' when not in allowlist
 *   - array capped at TODOWRITE_TASK_MAX_COUNT with a "truncated" footer
 *
 * @param {any[]} tasks
 * @returns {string}
 */
export function formatTasksBlock(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return "";
  const validStatus = new Set(TODOWRITE_VALID_STATUSES);
  const capped = tasks.slice(0, TODOWRITE_TASK_MAX_COUNT);
  const lines = [TODOWRITE_SNAPSHOT_MARKER, ""];
  let emitted = 0;
  for (const t of capped) {
    if (!t || typeof t !== "object") continue;
    const raw = t.subject ?? t.title ?? "";
    const subject = String(raw)
      .slice(0, TODOWRITE_TASK_MAX_SUBJECT_LEN)
      .replace(/[\r\n]+/g, " ")
      .trim();
    if (!subject) continue;
    const status = validStatus.has(t.status) ? t.status : "pending";
    const marker = status === "completed" ? "[x]" : (status === "in_progress" ? "[~]" : "[ ]");
    lines.push(`- ${marker} ${status}: ${subject}`);
    emitted++;
  }
  if (emitted === 0) return "";
  if (tasks.length > TODOWRITE_TASK_MAX_COUNT) {
    lines.push(`- (truncated: ${tasks.length - TODOWRITE_TASK_MAX_COUNT} more tasks omitted)`);
  }
  lines.push("");
  return lines.join("\n");
}

// --------------------------------------------------------------------------
// U-CK02 PURE HELPERS — runtime path detection + inventory parsing.
// Each detector returns {value, detail}; detail is ALWAYS an object so
// slimResponse can't strip the diagnostic on the MCP wire.
// --------------------------------------------------------------------------

// Pure: repo path → Claude Code per-project slug (e.g. H:/prism → H--PRISM).
// Uppercased, non-alphanumeric runs → '-', trailing '-' stripped, leading
// '-' PRESERVED (POSIX absolute paths must keep it — regression guard).
export function slugForRepo(repoPath) {
  const abs = path.resolve(String(repoPath || ""));
  // PER-CHARACTER replacement (NOT collapsed runs) — matches Claude Code's
  // own slug rule. `H:\prism` → `H--PRISM` (the `:` and `\` are each their
  // own '-'), not `H-PRISM`. Verified against the real on-disk project dir.
  let slug = abs.toUpperCase().replace(/[^A-Z0-9]/g, "-");
  while (slug.length > 1 && slug.endsWith("-")) slug = slug.slice(0, -1);
  return slug;
}

// Resolve user Claude config dir at runtime. Order: PRISM_USER_CLAUDE_DIR
// env (path-traversal-guarded) → os.homedir() + "/.claude" → sentinel.
function detectUserClaudeDir() {
  const raw = process.env.PRISM_USER_CLAUDE_DIR;
  if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim();
    if (!path.isAbsolute(trimmed) || path.normalize(trimmed) !== trimmed) {
      return { value: UNRESOLVED_SENTINEL, detail: { error: "PRISM_USER_CLAUDE_DIR failed path-traversal guard", errorCode: ERR_PATH_TRAVERSAL, raw: trimmed } };
    }
    if (!fs.existsSync(trimmed)) {
      return { value: UNRESOLVED_SENTINEL, detail: { error: "PRISM_USER_CLAUDE_DIR points at a path that does not exist", path: trimmed } };
    }
    return { value: trimmed, detail: {} };
  }
  let home;
  try { home = os.homedir(); }
  catch (err) { return { value: UNRESOLVED_SENTINEL, detail: { error: `os.homedir() threw: ${err && err.message ? err.message : String(err)}` } }; }
  if (!home) return { value: UNRESOLVED_SENTINEL, detail: { error: "os.homedir() returned empty" } };
  const claudeDir = path.join(home, ".claude");
  if (fs.existsSync(claudeDir)) return { value: claudeDir, detail: {} };
  return { value: UNRESOLVED_SENTINEL, detail: { error: "~/.claude not found on disk", expected: claudeDir } };
}

// Derive per-project memory path from user-claude-dir + repo slug. detail
// always carries `expected` (sentinel or path) so it survives slim-strip.
function detectMemoryPath(userClaudeDirResult, repoRoot) {
  if (userClaudeDirResult.value === UNRESOLVED_SENTINEL) {
    return { value: UNRESOLVED_SENTINEL, detail: { expected: UNRESOLVED_SENTINEL, error: "userClaudeDir not resolved — cannot derive memoryPath" } };
  }
  const slug = slugForRepo(repoRoot);
  const expected = path.join(userClaudeDirResult.value, "projects", slug, "memory");
  if (fs.existsSync(expected)) return { value: expected, detail: { expected } };
  return { value: UNRESOLVED_SENTINEL, detail: { expected, error: "memory dir not found at expected per-project slug path" } };
}

// git rev-parse --show-toplevel; sentinel on any failure.
async function detectWorktree() {
  try {
    const { stdout } = await execFileAsync("git", ["-C", REPO_ROOT, "rev-parse", "--show-toplevel"], { timeout: TIMEOUT_FAST_MS });
    const wt = String(stdout || "").trim();
    if (wt && fs.existsSync(wt)) {
      try { if (fs.statSync(wt).isDirectory()) return { value: wt, detail: {} }; }
      catch { /* fallthrough */ }
    }
    return { value: UNRESOLVED_SENTINEL, detail: { error: "git rev-parse returned empty/missing path", raw: wt } };
  } catch (err) {
    return { value: UNRESOLVED_SENTINEL, detail: { error: err && err.message ? err.message : String(err) } };
  }
}

// Detect topic slug. Priority: commit subject [SCOPE-MS#] → [SCOPE] →
// CURRENT_POSITION.md headline → branch last segment → sentinel.
async function detectTopic(branchValue) {
  const errors = [];
  try {
    const { stdout } = await execFileAsync("git", ["-C", REPO_ROOT, "log", "-1", "--pretty=%s"], { timeout: TIMEOUT_FAST_MS });
    const subj = String(stdout || "").trim();
    const msMatch = subj.match(/\[([A-Z][A-Z0-9_-]*-MS\d+)\]/);
    if (msMatch) return { value: msMatch[1].toLowerCase(), source: "commit-subject-scope-ms", errors };
    const scopeMatch = subj.match(/\[([A-Z][A-Z0-9_-]+)\]/);
    if (scopeMatch) return { value: scopeMatch[1].toLowerCase(), source: "commit-subject", errors };
  } catch (err) {
    errors.push(`commit-subject: ${err && err.message ? err.message : String(err)}`);
  }
  try {
    const cp = path.join(STATE_SHARED, "CURRENT_POSITION.md");
    if (fs.existsSync(cp)) {
      const txt = fs.readFileSync(cp, "utf8");
      const m = txt.match(/^#\s*([A-Z][A-Z0-9_-]*-MS\d+)/m);
      if (m) return { value: m[1].toLowerCase(), source: "current-position", errors };
    }
  } catch (err) {
    errors.push(`current-position: ${err && err.message ? err.message : String(err)}`);
  }
  if (branchValue && branchValue !== UNRESOLVED_SENTINEL) {
    const seg = String(branchValue).split("/").pop();
    if (seg) return { value: seg, source: "branch-segment", errors };
  }
  return { value: UNRESOLVED_SENTINEL, source: "fallback", errors };
}

// counts → fixed 10-key `top` projection (missing keys = explicit null).
function makeManifestTop(counts) {
  const out = {};
  for (const k of MANIFEST_TOP_KEYS) out[k] = typeof counts[k] === "number" ? counts[k] : null;
  return out;
}

// Parse PRISM-INVENTORY-LATEST.md markdown table → counts + top + origin.
// Format: `| **Label** | <int|n/a> | source |` (auto-generated by
// scripts/update-prism-inventory.mjs).
function parseInventoryMarkdown(filepath) {
  if (!fs.existsSync(filepath)) {
    return { counts: {}, top: makeManifestTop({}), origin: { file: filepath }, parseError: `inventory file missing at ${filepath}` };
  }
  let txt;
  try { txt = fs.readFileSync(filepath, "utf8"); }
  catch (err) { return { counts: {}, top: makeManifestTop({}), origin: { file: filepath }, parseError: `inventory file unreadable: ${err && err.message ? err.message : String(err)}` }; }
  const counts = {};
  const re = /\|\s*\*\*([^*]+?)\*\*\s*\|\s*(\d+|n\/a)\s*\|/g;
  let m;
  while ((m = re.exec(txt)) !== null) {
    const label = m[1].trim();
    const valStr = m[2].trim();
    const key = INVENTORY_LABEL_TO_KEY[label];
    if (key && valStr !== "n/a") {
      const n = parseInt(valStr, 10);
      if (Number.isFinite(n)) counts[key] = n;
    }
  }
  return { counts, top: makeManifestTop(counts), origin: { file: filepath } };
}

// Public sentinel re-export — one canonical reference for tests + MCP wire.
export { UNRESOLVED_SENTINEL };

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
  // U-CK02: 7-field contract — sessionId/slot/branch/topic/worktree/
  // userClaudeDir/memoryPath — every field a STRING (resolved or sentinel).
  // Each degradable field carries a `_detail` companion (slim-safe, never
  // null). All runtime path detection — no hardcoded user-home literals.
  const safeParams = (params && typeof params === "object") ? params : {};

  // sessionId — pipe a `{session_id}` payload into stable-session-id.mjs.
  let sessionId = UNRESOLVED_SENTINEL;
  try {
    const sessionScript = path.join(HELPERS_DIR, "stable-session-id.mjs");
    const stdinPayload = JSON.stringify({
      session_id: safeParams.sessionId ? String(safeParams.sessionId) : "",
    });
    const { stdout } = await execFileAsync(
      process.execPath, [sessionScript],
      { input: stdinPayload, timeout: TIMEOUT_FAST_MS, cwd: REPO_ROOT },
    );
    const v = String(stdout || "").trim();
    if (v) sessionId = v;
  } catch { /* sentinel stays */ }

  // slot — read chat-slots.json directly; match against caller-supplied
  // sessionId (string only — numeric/bogus types ignored) OR the resolved id.
  let slot = UNRESOLVED_SENTINEL;
  try {
    const slotsFile = path.join(REPO_ROOT, "state", "shared", "chat-slots.json");
    if (fs.existsSync(slotsFile)) {
      const raw = JSON.parse(fs.readFileSync(slotsFile, "utf8"));
      const slots = raw.slots || {};
      const callerId = (typeof safeParams.sessionId === "string" && safeParams.sessionId.trim())
        ? safeParams.sessionId.trim() : null;
      const matchId = callerId || (sessionId !== UNRESOLVED_SENTINEL ? sessionId : null);
      if (matchId) {
        for (const [name, s] of Object.entries(slots)) {
          if (s && s.chatId === matchId) { slot = name; break; }
        }
      }
    }
  } catch { /* sentinel stays */ }

  // branch — git rev-parse --abbrev-ref HEAD
  let branch = UNRESOLVED_SENTINEL;
  try {
    const { stdout } = await execFileAsync(
      "git", ["-C", REPO_ROOT, "rev-parse", "--abbrev-ref", "HEAD"],
      { timeout: TIMEOUT_FAST_MS },
    );
    const v = String(stdout || "").trim();
    if (v) branch = v;
  } catch { /* sentinel stays */ }

  // Runtime path detectors — each returns {value, detail}.
  const worktreeR = await detectWorktree();
  const userClaudeDirR = detectUserClaudeDir();
  const memoryPathR = detectMemoryPath(userClaudeDirR, REPO_ROOT);
  const topicR = await detectTopic(branch);

  return {
    ok: true,
    syscall: "whoami",
    note: "U-CK02 — 7-field contract resolved via runtime detection (no hardcoded user-home literals)",
    result: {
      // Seven-field contract — every value is a string (UNRESOLVED_SENTINEL if degraded).
      sessionId,
      slot,
      branch,
      topic: topicR.value,
      worktree: worktreeR.value,
      userClaudeDir: userClaudeDirR.value,
      memoryPath: memoryPathR.value,
      // Slim-safe detail companions — always objects, never null.
      worktreeDetail: worktreeR.detail,
      userClaudeDirDetail: userClaudeDirR.detail,
      memoryPathDetail: memoryPathR.detail,
      topicSource: topicR.source,
      topicErrors: { errors: topicR.errors || [] },
      // Path pointers (kept from U-CK01 shell for back-compat).
      repoRoot: REPO_ROOT,
      slotsFile: path.join(REPO_ROOT, "state", "shared", "chat-slots.json"),
      helpersDir: HELPERS_DIR,
    },
  };
}

async function syscall_manifest(_params) {
  // U-CK02 — live counts read from PRISM-INVENTORY-LATEST.md. Returns
  // {counts, top, origin} on success; adds `parseError` on degradation.
  // Counts are NEVER baked — every value traces to the inventory file.
  const parsed = parseInventoryMarkdown(INVENTORY_FILE);
  return {
    ok: true,
    syscall: "manifest",
    note: "U-CK02 — live counts parsed from PRISM-INVENTORY-LATEST.md (never baked)",
    degraded: !!parsed.parseError,
    result: parsed,
  };
}

async function syscall_position(_params) {
  // U-CK02 — composes {build, svi, drift, milestone} from existing
  // snapshots. `build` MUST equal BUILD_STATE.json.headline VERBATIM
  // (test asserts toEqual) — never re-derive.
  const sources = {
    "BUILD_STATE.json": BUILD_STATE_FILE,
    "MILESTONE_PROGRESS.json": path.join(STATE_SHARED, "MILESTONE_PROGRESS.json"),
    "svi.json": path.join(REPO_ROOT, "mcp-server", "data", "state", "svi.json"),
    "roadmap-drift-report.json": path.join(REPO_ROOT, "mcp-server", "data", "state", "roadmap-drift-report.json"),
  };
  const available = {};
  for (const [name, p] of Object.entries(sources)) available[name] = fs.existsSync(p);

  // Read each snapshot fail-soft — a corrupt one degrades to null, never throws.
  const readJsonField = (filepath, picker) => {
    if (!fs.existsSync(filepath)) return null;
    try {
      const j = JSON.parse(fs.readFileSync(filepath, "utf8"));
      return picker ? picker(j) : j;
    } catch { return null; }
  };

  const build = readJsonField(sources["BUILD_STATE.json"], (j) => j.headline ?? null);
  const milestone = readJsonField(sources["MILESTONE_PROGRESS.json"], (j) => j.summary ?? j.headline ?? j);
  const svi = readJsonField(sources["svi.json"]);
  const drift = readJsonField(sources["roadmap-drift-report.json"], (j) => j.summary ?? j.headline ?? j);

  return {
    ok: true,
    syscall: "position",
    note: "U-CK02 — composed from BUILD_STATE/MILESTONE_PROGRESS/svi/drift snapshots (never re-derived)",
    result: { build, svi, drift, milestone, sources, available },
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
      note: "pick-unit.mjs must be present in scripts/",
      fallback: null,
    };
  }
  const args = [];
  if (params.priority) { args.push("--priority", String(params.priority)); }
  if (params.slot) { args.push("--slot", String(params.slot)); }
  if (params.limit != null) { args.push("--limit", String(params.limit)); }
  if (params.tier != null) { args.push("--tier", String(params.tier)); }
  // U-CK03 additions: complete the pick-unit.mjs whitelist passthrough.
  // chatId enables PER-SLOT-CLAIM-MS0 filtering (peer-claimed units hidden).
  // noClaimFilter is the operator override.
  if (params.chatId) { args.push("--chatId", String(params.chatId)); }
  if (params.noClaimFilter === true || params.noClaimFilter === "true") { args.push("--no-claim-filter"); }
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
    result: maybeJson(r.stdout),
    warnings: r.stderr ? r.stderr : undefined,
  };
}

/**
 * SESSION-CONTINUITY-MS0 (2026-05-22): read the most-recent handoff bound to a
 * slot, via per-agent-handoff.mjs's slot-keyed read tier (`read --slot <nato>`).
 *
 * This is the durable-resume path. Work-slot handoffs are instance-keyed by an
 * ephemeral session-id; after a full terminal RESTART that id is brand new, so
 * an instance-keyed read cannot find the prior session's handoff. The
 * operator-typed slot name (`/checkin-bravo`) is the one identity that survives
 * the restart — the checkin composite calls this so `/checkin-<nato>` surfaces
 * the prior session's RESUME directive.
 *
 * A missing handoff is NORMAL (a never-used slot) and must NOT degrade the
 * composite — the caller stores the result without pushing to errors[].
 *
 * @param {string|null} slot — the claimed slot, or null when the claim failed
 * @returns {Promise<{ok:boolean, result?:any, error?:string, stderr?:string}>}
 */
async function readSlotHandoff(slot) {
  if (typeof slot !== "string" || slot.length === 0) {
    return { ok: false, error: "no slot resolved from claim" };
  }
  const handoffScript = path.join(HELPERS_DIR, "per-agent-handoff.mjs");
  if (!fs.existsSync(handoffScript)) {
    return { ok: false, error: `per-agent-handoff.mjs missing at ${handoffScript}` };
  }
  // input:"" closes the child's stdin so per-agent-handoff's readStdinSessionId()
  // gets EOF immediately instead of blocking on an open pipe (the U-CK09 pattern).
  const r = await runNode(handoffScript, ["read", "--slot", slot], {
    timeoutMs: TIMEOUT_DEFAULT_MS, input: "",
  });
  if (!r.ok) {
    return { ok: false, error: r.error || `per-agent-handoff exit ${r.exitCode}`, stderr: r.stderr };
  }
  return { ok: true, result: maybeJson(r.stdout) };
}

async function syscall_checkin(params) {
  // Shell delegates to chat-slots.mjs. U-CK03 ships the composite mode
  // (reclaim+claim+drift+commit-hygiene in one call) as subcommand="composite";
  // legacy 'current' / 'claim' / etc. unchanged for back-compat.
  // Default subcommand stays 'current' — confirmed valid in chat-slots.mjs CLI
  // and used by pick-dev.md:80; flipping the default would break U-CK01 tests.
  const slotsScript = path.join(HELPERS_DIR, "chat-slots.mjs");
  if (!fs.existsSync(slotsScript)) {
    return {
      ok: false, syscall: "checkin", degraded: true,
      error: `chat-slots.mjs missing at ${slotsScript}`,
      note: "chat-slots.mjs must be present in .claude/helpers/",
      fallback: null,
    };
  }
  const sub = params.subcommand || "current";
  // ---- U-CK03 COMPOSITE PATH: reclaim → claim → drift → commit-hygiene ----
  if (sub === "composite") {
    const compositeStart = Date.now();
    const composite = {
      reclaim: null,
      claim: null,
      drift: null,
      commitHygiene: null,
      handoff: null,
      degraded: false,
      errors: [],
    };
    // 1. reclaim — sweep stale slots before claiming so we never collide with
    //    a peer whose window died.
    const reclaimR = await runNode(slotsScript, ["reclaim"], { timeoutMs: TIMEOUT_DEFAULT_MS });
    composite.reclaim = reclaimR.ok ? maybeJson(reclaimR.stdout) : { error: reclaimR.error, stderr: reclaimR.stderr };
    if (!reclaimR.ok) { composite.degraded = true; composite.errors.push({ step: "reclaim", error: reclaimR.error }); }
    // 2. claim — forward the whitelisted flags exactly as the legacy 'claim' subcommand.
    const claimArgs = ["claim"];
    if (params.chatId) { claimArgs.push("--chatId", String(params.chatId)); }
    if (params.branch) { claimArgs.push("--branch", String(params.branch)); }
    if (params.topic) { claimArgs.push("--topic", String(params.topic)); }
    if (params.activity) { claimArgs.push("--activity", String(params.activity)); }
    if (params.preferSlot) { claimArgs.push("--preferSlot", String(params.preferSlot)); }
    if (params.force === true || params.force === "true") { claimArgs.push("--force", "true"); }
    if (params.confirmRecent === true || params.confirmRecent === "true") { claimArgs.push("--confirmRecent", "true"); }
    const claimR = await runNode(slotsScript, claimArgs, { timeoutMs: TIMEOUT_DEFAULT_MS });
    composite.claim = claimR.ok ? maybeJson(claimR.stdout) : { error: claimR.error, stderr: claimR.stderr };
    if (!claimR.ok) { composite.degraded = true; composite.errors.push({ step: "claim", error: claimR.error }); }
    // SESSION-CONTINUITY-MS0 (2026-05-22): the slot the claim just resolved
    // drives step 5 — a restarted terminal has a fresh session-id, so the
    // operator-typed slot name is the only identity that survives the restart.
    const claimedSlot = composite.claim && typeof composite.claim.slot === "string"
      ? composite.claim.slot
      : null;
    // 3. drift + 4. commit-hygiene + 5. handoff IN PARALLEL — independent disk reads.
    const [driftR, hygieneR, handoffR] = await Promise.all([
      runDriftCheck(),
      collectCommitHygiene(),
      readSlotHandoff(claimedSlot),
    ]);
    composite.drift = driftR.ok ? driftR.result : { error: driftR.error, stderr: driftR.stderr };
    if (!driftR.ok) { composite.degraded = true; composite.errors.push({ step: "drift", error: driftR.error }); }
    composite.commitHygiene = hygieneR;
    // 5. handoff — slot-keyed read so /checkin-<nato> surfaces the prior
    //    session's RESUME after a full terminal restart. A missing handoff is
    //    NORMAL for a never-used slot — record it, never degrade the composite.
    composite.handoff = handoffR.ok ? handoffR.result : { error: handoffR.error, stderr: handoffR.stderr };
    if (Array.isArray(hygieneR.errors) && hygieneR.errors.length > 0) {
      // git probe failures degrade but don't fail — detached HEAD / no upstream
      // is normal on slot worktrees; surface in `errors[]` for visibility.
      composite.errors.push(...hygieneR.errors.map(e => ({ step: "commit-hygiene", ...e })));
    }
    composite.elapsedMs = Date.now() - compositeStart;
    if (composite.elapsedMs > CHECKIN_COMPOSITE_TIMEOUT_MS) {
      composite.errors.push({ step: "overall", error: `composite took ${composite.elapsedMs}ms (budget ${CHECKIN_COMPOSITE_TIMEOUT_MS}ms)` });
    }
    return {
      ok: !composite.degraded,
      syscall: "checkin",
      composite: true,
      shell_only: true,
      result: composite,
    };
  }
  // ---- LEGACY SINGLE-SUBCOMMAND PATH (back-compat for U-CK01 callers) ----
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
    note: "use subcommand='composite' for reclaim+claim+drift+commit-hygiene in one call",
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
      note: "per-agent-handoff.mjs must be present in .claude/helpers/",
      fallback: null,
    };
  }
  // U-CK09 follow-up: accept `--mode` as an alias for `--subcommand`. The
  // thin /startup + /precompact clients (and other callers) historically
  // passed `--mode read|write`; without the alias that value lands in
  // params.mode, `sub` silently defaults to "read", and a write no-ops.
  // `subcommand` stays canonical and wins when both are supplied.
  const sub = params.subcommand || params.mode || "read";
  if (sub !== "read" && sub !== "write") {
    return {
      ok: false, syscall: "handoff", degraded: true,
      error: `unknown subcommand '${sub}' (expected read|write)`,
      note: "list/diff/migrate subcommands are a future extension",
      fallback: null,
    };
  }
  // U-CK09 follow-up (R12 fail-loud): handoff payload (`--resume`/`--state`)
  // with a read subcommand is almost certainly a caller error — the payload
  // would be silently discarded. Reject loudly instead of no-op'ing the
  // write. `source` is intentionally NOT in this set: it is harmless in read
  // mode, so a defensively-always-passed `--source` must not become a reject.
  if (sub === "read") {
    const writeOnly = ["resume", "state"].filter(
      (k) => params[k] !== undefined && params[k] !== null && params[k] !== "",
    );
    if (writeOnly.length > 0) {
      return {
        ok: false, syscall: "handoff", degraded: true,
        error: `write-only flag(s) [${writeOnly.join(", ")}] passed with subcommand=read`,
        note: "did you mean --subcommand write? read mode ignores handoff payload",
        fallback: null,
      };
    }
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
  // U-CK03 ABSORPTION: TodoWrite tasks → prepended markdown block. The helper
  // is NEVER modified — we re-shape the --state argument before forwarding so
  // the delegation contract holds ("handoff write delegates unchanged"). If
  // the state body already contains the snapshot marker, do not double-write.
  let stateOut = params.state;
  if (sub === "write" && Array.isArray(params.tasks) && params.tasks.length > 0) {
    const block = formatTasksBlock(params.tasks);
    if (block) {
      const existing = String(stateOut || "");
      stateOut = existing.includes(TODOWRITE_SNAPSHOT_MARKER)
        ? existing
        : (existing ? `${block}\n${existing}` : block);
    }
  }
  if (sub === "write") {
    args.push("--source", String(params.source || "live-chat"));
    if (params.topic) { args.push("--topic", String(params.topic)); }
    if (params.resume) { args.push("--resume", String(params.resume)); }
    if (stateOut) { args.push("--state", String(stateOut)); }
  }
  // P0-1 fix: pipe a {session_id} payload over stdin so the helper's
  // readStdinSessionId() priority resolution works when running detached
  // from a Claude hook. Without this, `handoff read` exits non-zero from
  // a spawned context (live-tested by reviewer Agent B).
  //
  // U-CK03 follow-up: ALWAYS pass `input` (defaulting to ""). The helper's
  // readStdinSessionId() calls fs.readFileSync(0) on a non-TTY pipe; an
  // open-but-never-written-to pipe blocks forever (live-tested: 10s timeout
  // every call from psk smoke). Empty-string input closes stdin cleanly,
  // the helper's `if (!buf || !buf.trim().startsWith("{"))` returns null,
  // and execution falls through to the --terminal legacy path as designed.
  const stdinPayload = params.sessionId
    ? JSON.stringify({ session_id: String(params.sessionId) })
    : "";
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
  // U-CK29: when event === "outcome", tee the entry to the per-session
  // journal in os/sessions/<sid>.jsonl — promoted memory recommend mines
  // for analogies. params.sessionId is opt-in (caller passes from whoami).
  let sessionJournalFile = null;
  let sessionJournalWritten = false;
  let sessionJournalError = null;
  const isOutcomeEvent = entry.event === "outcome";
  if (isOutcomeEvent) {
    const sid = params.sessionId ? String(params.sessionId) : null;
    sessionJournalFile = resolveSessionJournalFile(sid);
    if (sid && !sessionJournalFile) {
      sessionJournalError = `invalid sessionId — must match ${SESSION_ID_RE.source}`;
    }
  }
  try {
    const dir = path.dirname(telemetryFile);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
    // appendFileSync is atomic for single small writes on POSIX (O_APPEND)
    // and ~atomic on Windows NTFS for sub-PIPE_BUF payloads. U-CK15+ swaps
    // this for a SQLite-WAL backed queue when the feedback loop wires.
    fs.appendFileSync(telemetryFile, JSON.stringify(entry) + "\n", "utf8");
    if (sessionJournalFile && !sessionJournalError) {
      try {
        const jdir = path.dirname(sessionJournalFile);
        if (!fs.existsSync(jdir)) { fs.mkdirSync(jdir, { recursive: true }); }
        const journalEntry = { ...entry, sessionId: String(params.sessionId) };
        fs.appendFileSync(sessionJournalFile, JSON.stringify(journalEntry) + "\n", "utf8");
        sessionJournalWritten = true;
      } catch (jerr) {
        // Journal failure is non-fatal — telemetry already landed.
        sessionJournalError = jerr && jerr.message ? jerr.message : String(jerr);
      }
    }
    return {
      ok: true, syscall: "record", shell_only: true,
      result: {
        written: true,
        file: telemetryFile,
        entry,
        sessionJournalFile,
        sessionJournalWritten,
        ...(sessionJournalError ? { sessionJournalError } : {}),
      },
    };
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
  // U-CK29: closes the cross-session learning loop. Mines outcome events
  // promoted to knowledge/wiki/os/sessions/<sid>.jsonl by syscall_record
  // (event === "outcome" tee), returns top-K analogies by keyword overlap.
  // Trigger ledger still surfaced as a secondary source for skill-auto-trigger.
  const triggerLedger = path.join(REPO_ROOT, "knowledge", "wiki", "architecture", "_skill-triggers.jsonl");
  const sessionsDir = resolveOsSessionsDir();
  const query = params.query == null ? null : String(params.query).slice(0, RECORD_MAX_STR);
  let k = typeof params.k === "number" ? Math.floor(params.k) : 5;
  if (!Number.isFinite(k) || k < 1) { k = 1; }
  if (k > RECOMMEND_MAX_K) { k = RECOMMEND_MAX_K; }
  const queryTokens = query
    ? Array.from(new Set(query.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length >= 2)))
    : [];

  const analogies = [];
  let scanned = 0;
  const errors = [];
  if (fs.existsSync(sessionsDir)) {
    let files = [];
    try {
      files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl"));
    } catch (err) {
      errors.push({ stage: "readdir", error: err && err.message ? err.message : String(err) });
    }
    for (const f of files) {
      const full = path.join(sessionsDir, f);
      let raw = "";
      try {
        const st = fs.statSync(full);
        if (st.size > RECOMMEND_MAX_BYTES_PER_FILE) {
          // Tail-read last 1 MB to bound memory; older entries skipped this call.
          const fd = fs.openSync(full, "r");
          try {
            const buf = Buffer.alloc(RECOMMEND_MAX_BYTES_PER_FILE);
            const start = Math.max(0, st.size - RECOMMEND_MAX_BYTES_PER_FILE);
            const bytes = fs.readSync(fd, buf, 0, RECOMMEND_MAX_BYTES_PER_FILE, start);
            raw = buf.subarray(0, bytes).toString("utf8");
            // Discard a possibly-truncated first line.
            const nl = raw.indexOf("\n");
            if (nl >= 0) { raw = raw.slice(nl + 1); }
          } finally {
            fs.closeSync(fd);
          }
        } else {
          raw = fs.readFileSync(full, "utf8");
        }
      } catch (err) {
        errors.push({ stage: "read", file: f, error: err && err.message ? err.message : String(err) });
        continue;
      }
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t) { continue; }
        scanned += 1;
        let e;
        try { e = JSON.parse(t); } catch { continue; }
        // Only outcome-class entries are analogies.
        if (e.event !== "outcome") { continue; }
        const score = scoreAnalogyEntry(e, queryTokens);
        if (queryTokens.length > 0 && score === 0) { continue; }
        analogies.push({
          score,
          ts: e.ts ?? null,
          sessionId: e.sessionId ?? null,
          event: e.event ?? null,
          command: e.command ?? null,
          outcome: e.outcome ?? null,
          tokens: typeof e.tokens === "number" ? e.tokens : null,
          latency_ms: typeof e.latency_ms === "number" ? e.latency_ms : null,
        });
      }
    }
  }
  // Sort: highest score first; tie-break newest ts first (string compare on ISO).
  analogies.sort((a, b) => {
    if (b.score !== a.score) { return b.score - a.score; }
    const ats = a.ts ?? ""; const bts = b.ts ?? "";
    if (bts !== ats) { return bts.localeCompare(ats); }
    return 0;
  });
  const top = analogies.slice(0, k);
  return {
    ok: true,
    syscall: "recommend",
    shell_only: true,
    result: {
      query,
      k,
      analogies: top,
      scanned,
      returned: top.length,
      sources: { sessionsDir, triggerLedger },
      available: {
        sessionsDir: fs.existsSync(sessionsDir),
        triggerLedger: fs.existsSync(triggerLedger),
      },
      ...(errors.length > 0 ? { errors } : {}),
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
