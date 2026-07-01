#!/usr/bin/env node
// tier: T1
/**
 * build-cache-guard.mjs — build/test result cache with edit-invalidation.
 *
 * HIGH-ROI-HOOKS-MS0 / U-HRH01. Closes a verified gap: bash-result-cache.mjs
 * explicitly REJECTS any command containing `npm` or `node`, so build/test
 * commands (`npm run build`, `npx vitest run`, `tsc`) are never cached —
 * yet they are PRISM backend dev's single most-repeated, most-verbose tool
 * call. This hook is the build-tier sibling of bash-result-cache.
 *
 * THREE arms, branched on hook_event_name + tool_name:
 *  - PreToolUse:Bash   — build/test command + a cached PASS + no source
 *                        edit since → `deny` with the cached digest. NET
 *                        token-saving: the redundant build never runs.
 *  - PostToolUse:Bash  — a build/test command just ran → capture a compact
 *                        result digest keyed by session + normalized command.
 *  - PostToolUse:Edit|Write|MultiEdit|NotebookEdit — bump a per-session
 *                        source-edit stamp; that invalidates EVERY cached
 *                        build for the session.
 *
 * SAFETY INVARIANTS (load-bearing — a false cache hit is the dangerous mode):
 *  - Only ever deny a cached *PASS* (`entry.ok === true`). A cached FAIL or
 *    an unclassifiable result (`ok` not strictly true) is NEVER denied — a
 *    failed build is exactly the one a developer most legitimately re-runs.
 *  - `ok` is `true` only on positive evidence (exit code 0, or an explicit
 *    success signal with zero failure signals); `false` on any failure
 *    signal (non-zero exit, `npm ERR!`, esbuild `[ERROR]`, `error TSnnnn`,
 *    `N failed`, `ELIFECYCLE`, …); `null` when genuinely ambiguous.
 *  - Compound commands (any `;` `|` `&` `$(` backtick after the leading
 *    `cd … &&`) are NEVER cached/denied — denying one would silently skip
 *    its other parts. They pass through untouched.
 *  - A cached result is valid only while within TTL (default 5 min — short:
 *    H:/prism is a shared worktree; a peer chat may edit source without
 *    bumping this session's stamp) AND no edit fired in THIS session since.
 *  - Deny-loop escape is COUNT-based: the FIRST PreToolUse check of a key
 *    following any deny of that key always passes (the deny sets a one-shot
 *    mark consumed by the next check). The deny message's promise that "the
 *    next attempt passes through" is therefore always kept. (Trade-off: one
 *    genuinely-redundant build per key per session may slip un-denied — an
 *    accepted ROI cost of never trapping the model in a deny-loop.)
 *  - The session-edit stamp lives in its OWN per-session file, written ONLY
 *    by the edit arm. The builds/denies file is separate. No arm can ever
 *    clobber another arm's edit stamp via a read-modify-write race; a lost
 *    builds/denies entry only costs a missed optimization (safe direction).
 *
 * Never breaks a build: all I/O best-effort, always exits 0, passes through
 * on any uncertainty. Disable: PRISM_BUILD_CACHE_GUARD_DISABLE=1.
 * Knobs: PRISM_BUILD_CACHE_TTL_MS (default 300000), PRISM_BUILD_CACHE_GUARD_DISABLE.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

// CACHE_DIR is env-overridable so tests run in a hermetic per-process temp dir
// (no contention with the live wired hook, no cross-suite flake, no pollution
// of the fleet cache). Production default is the shared cache path.
const CACHE_DIR = process.env.PRISM_BUILD_CACHE_DIR || "H:/prism/.claude/cache/build-cache";
const TELEMETRY_FILE = "H:/prism/.claude/cache/hook-telemetry.jsonl";
const STALE_FILE_MS = 2 * 60 * 60 * 1000; // prune cache files older than 2h
const DIGEST_HEAD = 400; // chars kept from the start of a long build log
const DIGEST_TAIL = 900; // chars kept from the end (errors cluster there)
const DIGEST_MAX = DIGEST_HEAD + DIGEST_TAIL; // longer output → head+tail digest
const AGE_SEC_THRESHOLD = 90; // below this, render age in seconds not minutes

export function ttlMs(env = process.env) {
  const n = Number(env.PRISM_BUILD_CACHE_TTL_MS);
  return Number.isFinite(n) && n > 0 ? n : 5 * 60 * 1000;
}

/** Strip a leading `cd <dir> &&` and a leading `rtk `; collapse whitespace. */
export function normalizeCmd(raw) {
  let c = String(raw || "").trim();
  let cwd = "";
  const cd = c.match(/^cd\s+("[^"]+"|'[^']+'|\S+)\s*&&\s*([\s\S]+)$/);
  if (cd) {
    cwd = cd[1].replace(/^['"]|['"]$/g, "");
    c = cd[2].trim();
  }
  c = c.replace(/^rtk\s+/i, "");
  c = c.replace(/\s+/g, " ").trim();
  return { cmd: c, cwd };
}

/**
 * True when the (cd/rtk-stripped) command still contains a shell separator.
 * Matches ANY `;` `|` `&` (covers `&&`/`||` too), `$(`, or backtick — no
 * whitespace anchoring, so `npm run build&ls` is correctly caught.
 */
export function hasUnsafeShell(cmd) {
  return /[;|&]|\$\(|`/.test(String(cmd || ""));
}

const BUILD_RES = [
  /\bnpm\s+run\s+build\b/,
  /\bnpm\s+run\s+test\b/,
  /\bnpm\s+test\b/,
  /\bnpx\s+vitest\b/,
  /\bvitest\s+run\b/,
  /\bnpx\s+tsc\b/,
  /^tsc(\s|$)/, // bare tsc — anchored to the command head (post-normalize)
];

/** True when the normalized command is a build/test invocation worth caching. */
export function isBuildCmd(cmd) {
  const c = String(cmd || "");
  return BUILD_RES.some((re) => re.test(c));
}

export function cacheKey(cmd, cwd) {
  return crypto
    .createHash("sha1")
    .update(`${cmd} ${cwd || ""}`)
    .digest("hex");
}

/**
 * Pure decision for the PreToolUse arm. Denies ONLY a confirmed-fresh PASS.
 * `denyMark` truthy → the check immediately following a deny: always passes
 * (count-based deny-loop escape, time-independent).
 */
export function decideBuildCheck({ entry, editTs, denyMark, ttl, now }) {
  if (!entry || typeof entry.ts !== "number") return { action: "pass", reason: "no-entry" };
  if (denyMark) return { action: "pass", reason: "deny-loop-escape" };
  if (now - entry.ts > ttl) return { action: "pass", reason: "expired" };
  if (typeof editTs === "number" && editTs >= entry.ts) {
    return { action: "pass", reason: "edited-since" };
  }
  if (entry.ok !== true) return { action: "pass", reason: "not-confirmed-pass" };
  return { action: "deny", reason: "fresh-pass-hit", entry };
}

/**
 * Pure: classify a build's result. `ok` is true|false|null — see SAFETY
 * INVARIANTS. Accepts a string (legacy) or {out, exitCode, isError}.
 * A failure signal ALWAYS beats a success signal.
 */
export function summarizeBuildOutput(arg) {
  const { out, exitCode, isError } =
    typeof arg === "string" ? { out: arg } : arg || {};
  const text = String(out || "");
  const errorCount = (text.match(/error\s+TS\d+/gi) || []).length;
  const failSignal =
    (typeof exitCode === "number" && exitCode !== 0) ||
    isError === true ||
    errorCount > 0 ||
    /\bFAIL\b|\d+\s+failed\b|✗|✖|npm ERR!|\[ERROR\]|ELIFECYCLE|error during build/i.test(text);
  const successSignal =
    exitCode === 0 ||
    /build complete|built in \d|compiled successfully|✓|\d+ passed|Test Files\s+\d+\s+passed/i.test(text);
  let ok;
  if (failSignal) ok = false; // failure ALWAYS wins over a success signal
  else if (successSignal) ok = true;
  else ok = null; // genuinely ambiguous — never treated as PASS
  let digest;
  if (text.length > DIGEST_MAX) {
    digest = `${text.slice(0, DIGEST_HEAD)}\n…[${text.length} chars omitted]…\n${text.slice(-DIGEST_TAIL)}`;
  } else {
    digest = text;
  }
  return { ok, errorCount, digest };
}

/** Render an age (ms) honestly — never "0m". */
export function fmtAge(ms) {
  const s = Math.round(ms / 1000);
  if (s < AGE_SEC_THRESHOLD) return `${Math.max(1, s)}s`;
  return `${Math.round(s / 60)}m`;
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

function sid8(event) {
  const sid =
    event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID || "_";
  return String(sid).slice(0, 8).replace(/[^A-Za-z0-9_-]/g, "_");
}

function cacheFileFor(event) {
  return path.join(CACHE_DIR, `${sid8(event)}.json`);
}
function editFileFor(event) {
  return path.join(CACHE_DIR, `${sid8(event)}.edit`);
}

function loadSession(file) {
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (j && typeof j === "object") {
      return {
        builds: j.builds && typeof j.builds === "object" ? j.builds : {},
        denies: j.denies && typeof j.denies === "object" ? j.denies : {},
      };
    }
  } catch {
    /* fall through */
  }
  return { builds: {}, denies: {} };
}

function saveSession(file, data) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ builds: data.builds, denies: data.denies }), "utf-8");
  } catch {
    /* non-fatal */
  }
}

/** The edit stamp is its OWN file, written ONLY by the edit arm — race-free. */
function loadEditTs(file) {
  try {
    const n = parseInt(String(fs.readFileSync(file, "utf-8")).trim(), 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
function saveEditTs(file, ts) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, String(ts), "utf-8");
  } catch {
    /* non-fatal */
  }
}

function pruneStaleFiles() {
  try {
    const now = Date.now();
    for (const f of fs.readdirSync(CACHE_DIR)) {
      if (!f.endsWith(".json") && !f.endsWith(".edit")) continue;
      const p = path.join(CACHE_DIR, f);
      try {
        if (now - fs.statSync(p).mtimeMs > STALE_FILE_MS) fs.unlinkSync(p);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* dir may not exist yet */
  }
}

function logTelemetry(rec) {
  try {
    fs.appendFileSync(TELEMETRY_FILE, JSON.stringify(rec) + "\n", "utf-8");
  } catch {
    /* non-fatal */
  }
}

function emitPass() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

function emitDeny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}

/** Extract output text + exit status from a PostToolUse Bash event. */
function extractResult(event) {
  const r = event.tool_response;
  let out = "";
  if (typeof r === "string") out = r;
  else if (r && typeof r === "object") out = r.output ?? r.stdout ?? r.content ?? "";
  if (!out && event.tool_use_result != null) out = event.tool_use_result;
  let exitCode;
  if (r && typeof r === "object") {
    for (const k of ["exit_code", "exitCode", "code", "returnCode"]) {
      if (typeof r[k] === "number") {
        exitCode = r[k];
        break;
      }
    }
  }
  const isError =
    r && typeof r === "object" && (r.is_error === true || r.isError === true || r.interrupted === true);
  return { out: typeof out === "string" ? out : String(out ?? ""), exitCode, isError };
}

export function main() {
  if (process.env.PRISM_BUILD_CACHE_GUARD_DISABLE === "1") return emitPass();
  const event = readStdin();
  if (!event) return emitPass();
  const ev = event.hook_event_name || event.hookEventName || "";
  const tool = event.tool_name || "";

  // --- Arm C: a source edit invalidates all cached builds for the session ---
  // Writes ONLY the dedicated .edit file — no other arm touches it.
  if (ev === "PostToolUse" && /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) {
    saveEditTs(editFileFor(event), Date.now());
    return emitPass();
  }

  if (tool !== "Bash") return emitPass();
  const rawCmd =
    (event.tool_input && event.tool_input.command) ||
    (event.toolInput && event.toolInput.command) ||
    "";
  const { cmd, cwd } = normalizeCmd(rawCmd);
  // Eligible = a build/test command AND free of shell separators (a compound
  // command must never be denied — that would skip its other parts).
  if (!cmd || !isBuildCmd(cmd) || hasUnsafeShell(cmd)) return emitPass();

  const key = cacheKey(cmd, cwd);
  const file = cacheFileFor(event);
  const data = loadSession(file);

  // --- Arm A: PreToolUse — block a redundant, confirmed-passing build ------
  if (ev === "PreToolUse") {
    const decision = decideBuildCheck({
      entry: data.builds[key],
      editTs: loadEditTs(editFileFor(event)),
      denyMark: data.denies[key],
      ttl: ttlMs(),
      now: Date.now(),
    });
    if (decision.reason === "deny-loop-escape") {
      delete data.denies[key];
      saveSession(file, data);
      return emitPass();
    }
    if (decision.action === "deny") {
      data.denies[key] = Date.now(); // one-shot mark — next check escapes
      saveSession(file, data);
      const e = decision.entry;
      logTelemetry({
        ts: new Date().toISOString(),
        hook: "build-cache-guard",
        event: "deny",
        key_hash: key.slice(0, 12),
        cmd: cmd.slice(0, 80),
      });
      emitDeny(
        `build-cache-guard: this build/test PASSED ${fmtAge(Date.now() - e.ts)} ago and ` +
          `no source edit has happened in this session since — re-running produces the same result.\n` +
          `Cached output:\n${e.digest}\n` +
          `Act on the cached output above. If a peer chat may have edited the shared H:/prism tree, ` +
          `re-issue the command — the next attempt passes through.`,
      );
      return;
    }
    return emitPass();
  }

  // --- Arm B: PostToolUse:Bash — capture the build result ------------------
  if (ev === "PostToolUse") {
    const { ok, errorCount, digest } = summarizeBuildOutput(extractResult(event));
    data.builds[key] = { ts: Date.now(), cmd: cmd.slice(0, 200), ok, errorCount, digest };
    delete data.denies[key];
    saveSession(file, data);
    pruneStaleFiles();
    logTelemetry({
      ts: new Date().toISOString(),
      hook: "build-cache-guard",
      event: "capture",
      key_hash: key.slice(0, 12),
      ok,
      error_count: errorCount,
    });
    return emitPass();
  }

  return emitPass();
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try {
    main();
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}
