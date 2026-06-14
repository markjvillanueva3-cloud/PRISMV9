#!/usr/bin/env node
/**
 * pathspec-only-guard.mjs — git pre-commit guard for peer-file-claim collisions.
 *
 * Built for JULIETT-12CHAT-ALLOCATION-MS0/U-PRECOMMIT-PATHSPEC-ONLY (W1, echo).
 *
 * ── PURPOSE ────────────────────────────────────────────────────────────
 * The 13-chat fleet uses `state/shared/chat-bus/claims/<hash>.json` to
 * coordinate writes. The sibling Claude-harness hook `file-claim-commit-guard.mjs`
 * intercepts `git commit` invoked through Claude's Bash tool. But a user
 * running `git commit` directly in PowerShell (e.g. via a `!`-prefixed
 * suggestion, a terminal that crashed mid-edit, or a Git GUI) bypasses
 * the harness entirely. We've seen 5 collateral-staging incidents in 48h
 * ([[reference_misc_tasks_extraction_2026_05_16]] §Recent regressions).
 *
 * This module ships TWO things:
 *   1. A pure-core decision function (testable, no IO)
 *   2. A CLI entry point that the `.git/hooks/pre-commit` shim invokes
 *
 * The git-side pre-commit catches the bypass. The harness-side
 * file-claim-commit-guard.mjs catches Claude-tool commits earlier (sub-200ms
 * pretool latency). They are complementary, not duplicates.
 *
 * ── DECISION CONTRACT ──────────────────────────────────────────────────
 * Inputs (pure):
 *   - stagedPaths: string[]  — output of `git diff --cached --name-only` resolved to abs
 *   - claims:      Claim[]   — non-expired claims from chat-bus/claims/*.json
 *   - sessionId:   string    — current chat's stable session id
 *   - now:         number    — Date.now() (DI for tests)
 *
 * Output:
 *   - {decision:"allow"} | {decision:"block", reason:string, conflicts:Conflict[]}
 *
 * Self-chat-exempt: a claim whose sessionId === current sessionId NEVER blocks.
 * Expired claims (expiresAt < now) are silently skipped.
 * Path comparison: case-insensitive on Windows, forward-slashed.
 *
 * ── EXIT CONTRACT (CLI) ────────────────────────────────────────────────
 *   exit 0   — allow (no conflicts, or knob disabled, or fail-open)
 *   exit 1   — block (peer-claim conflict detected). Block reason → stderr.
 *
 * Fail-open policy: every internal error (missing claims dir, git failure,
 * unresolvable session id) → allow. This is the same policy
 * file-claim-commit-guard uses — the gate is advisory layered defense,
 * never the only safety net. The harness-side hook always remains.
 *
 * ── KNOB ───────────────────────────────────────────────────────────────
 *   PRISM_PATHSPEC_ONLY_DISABLE=1  — emergency bypass; logged.
 *
 * Bypass ledger: `state/shared/pathspec-bypasses.jsonl` (append-only).
 */

import { readdirSync, readFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

// ── Constants ──────────────────────────────────────────────────────────
const REPO_ROOT_DEFAULT = "H:/prism";
const CLAIMS_DIR_REL = "state/shared/chat-bus/claims";
const BYPASS_LEDGER_REL = "state/shared/pathspec-bypasses.jsonl";
const STABLE_ID_HELPER_REL = ".claude/helpers/stable-session-id.mjs";
const STABLE_ID_TIMEOUT_MS = 1500;
const GIT_TIMEOUT_MS = 3000;
const MAX_CONFLICTS_SHOWN = 20;

// ── Pure helpers (exported for tests) ──────────────────────────────────

/**
 * Canonical absolute path: forward slashes, no trailing `/`, lowercased on
 * Windows. Mirrors sibling `git-add-lane-guard.canonicalize` so the two
 * gates compare paths identically.
 */
export function canonicalPath(p) {
  if (!p) return "";
  const abs = path.isAbsolute(p) ? p : path.resolve(p);
  const fwd = abs.replace(/\\/g, "/").replace(/\/+$/, "");
  return process.platform === "win32" ? fwd.toLowerCase() : fwd;
}

/**
 * Strip C0/C1 control chars + ANSI escapes from text we got off-disk before
 * we splat it into stderr. The only data path here is claim files written
 * by sibling chats / a wedged harness; if one is corrupt or hostile, the
 * worst it can do is spoof terminal output (overwrite the resolve recipe
 * with attacker-crafted instructions, etc.). Display-only sanitization —
 * we still compare on the un-sanitized canonical path for correctness.
 */
export function sanitizeDisplay(s) {
  if (typeof s !== "string") return String(s ?? "");
  // Strip C0 controls (0x00-0x1F) + DEL (0x7F). ANSI escapes start with
  // ESC=0x1B and are caught by C0 strip. The eslint no-control-regex rule
  // is intentionally suppressed here: control-char matching is the
  // POINT of this sanitizer — defending against terminal-injection in
  // operator-facing stderr output.
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x1F\x7F]/g, "");
}

/**
 * Pure: filter a list of claims to only those that are
 *   (a) currently active (expiresAt >= now)
 *   (b) NOT held by the current session
 * Schema match: `{schemaVersion, path, sessionId, pcName, acquiredAt, expiresAt, intent}`.
 *
 * `now` is injected for hermetic tests.
 */
export function filterActiveForeignClaims(claims, sessionId, now) {
  if (!Array.isArray(claims)) return [];
  const out = [];
  for (const c of claims) {
    if (!c || typeof c !== "object") continue;
    if (!c.path || !c.sessionId) continue;
    if (c.sessionId === sessionId) continue;
    const exp = Date.parse(c.expiresAt);
    if (Number.isFinite(exp) && exp < now) continue;
    out.push(c);
  }
  return out;
}

/**
 * Pure: decide allow/block.
 *
 * @param {Object} args
 * @param {string[]} args.stagedAbsPaths  — already-canonicalized absolute paths
 * @param {Object[]} args.claims          — active foreign claims (pre-filtered)
 * @returns {{decision:"allow"} | {decision:"block", reason:string, conflicts:Object[]}}
 */
export function decide({ stagedAbsPaths, claims }) {
  if (!Array.isArray(stagedAbsPaths) || stagedAbsPaths.length === 0) {
    return { decision: "allow" };
  }
  if (!Array.isArray(claims) || claims.length === 0) {
    return { decision: "allow" };
  }
  // Build claim lookup keyed by canonical path → array of claims (claims should
  // normally be 1:1, but a peer may briefly hold dup claims during refresh).
  const byPath = new Map();
  for (const c of claims) {
    const key = canonicalPath(c.path);
    if (!key) continue;
    if (!byPath.has(key)) byPath.set(key, []);
    byPath.get(key).push(c);
  }
  const conflicts = [];
  for (const staged of stagedAbsPaths) {
    const key = canonicalPath(staged);
    const hits = byPath.get(key);
    if (!hits) continue;
    for (const h of hits) {
      conflicts.push({
        path: key,
        heldBy: h.sessionId,
        heldByPc: h.pcName || "?",
        intent: h.intent || "?",
        acquiredAt: h.acquiredAt,
        expiresAt: h.expiresAt,
      });
    }
  }
  if (conflicts.length === 0) return { decision: "allow" };
  return { decision: "block", reason: formatBlockReason(conflicts, stagedAbsPaths.length), conflicts };
}

/**
 * Pure formatter — message is the operator-facing artifact that has to read
 * well at 2am, so it's broken out and unit-tested.
 */
export function formatBlockReason(conflicts, stagedCount) {
  const lines = [
    `🔒 PATHSPEC-ONLY pre-commit BLOCKED — ${conflicts.length} file(s) claimed by OTHER live chat(s)`,
    ``,
    `This commit would absorb another chat's in-progress work.`,
    `Staged files: ${stagedCount}. Peer-held claims among them: ${conflicts.length}.`,
    ``,
    `Files in conflict:`,
  ];
  for (const c of conflicts.slice(0, MAX_CONFLICTS_SHOWN)) {
    const expMin = Number.isFinite(Date.parse(c.expiresAt))
      ? Math.max(0, Math.round((Date.parse(c.expiresAt) - Date.now()) / 60000))
      : "?";
    // Sanitize every off-disk field before emit — defends against control-char
    // spoofing from a malformed or hostile claim file (Arm A P1, 2026-05-17).
    const sPath = sanitizeDisplay(c.path);
    const sBy = sanitizeDisplay(c.heldBy);
    const sPc = sanitizeDisplay(c.heldByPc);
    const sIntent = sanitizeDisplay(c.intent);
    lines.push(`  • ${sPath}`);
    lines.push(`      held by ${sBy} (${sPc}), intent=${sIntent}, expires in ${expMin}m`);
  }
  if (conflicts.length > MAX_CONFLICTS_SHOWN) {
    lines.push(`  … and ${conflicts.length - MAX_CONFLICTS_SHOWN} more`);
  }
  lines.push(``);
  lines.push(`Resolve by ONE of:`);
  lines.push(`  1. Unstage the peer files:`);
  for (const c of conflicts.slice(0, 5)) {
    // Sanitize: same defense as the conflict listing — c.path comes off-disk
    // from the claim file and the recipe is the highest-leverage spoof target
    // (a control-char injection that overwrites a recommended command is the
    // worst-case op consequence). (Fixed during own per-file scrutiny pass.)
    lines.push(`       git reset HEAD -- ${sanitizeDisplay(c.path)}`);
  }
  lines.push(`  2. Use an explicit pathspec instead of \`git add -A\` / \`git add .\` / \`git add -a\`:`);
  lines.push(`       git add <your-own-files-only>`);
  lines.push(`  3. Coordinate via chat-bus (peer may release shortly), or wait for the claim to expire.`);
  lines.push(``);
  lines.push(`Emergency bypass (logged to state/shared/pathspec-bypasses.jsonl):`);
  lines.push(`  PRISM_PATHSPEC_ONLY_DISABLE=1 git commit ...`);
  return lines.join("\n");
}

// ── IO helpers (skipped in unit tests via DI) ───────────────────────────

export function readClaimsDir(claimsDir, { readDir = readdirSync, readFile = readFileSync } = {}) {
  if (!existsSync(claimsDir)) return [];
  let names;
  try {
    names = readDir(claimsDir);
  } catch {
    return [];
  }
  const out = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const full = path.join(claimsDir, name);
    let raw;
    try {
      raw = readFile(full, "utf-8");
    } catch {
      continue;
    }
    try {
      const c = JSON.parse(raw);
      out.push(c);
    } catch (e) {
      // Malformed claim file → skip BUT log to stderr so a corrupted store
      // is visible (Arm B P2 — silent `catch {}` masks real bugs). We still
      // fail-open at the gate level: a partial read is preferred to blocking
      // every commit when the store is corrupted.
      if (process.env.PRISM_PATHSPEC_QUIET !== "1") {
        process.stderr.write(
          `pathspec-only-guard: skipping malformed claim ${name}: ${e.message}\n`
        );
      }
    }
  }
  return out;
}

export function resolveSessionId(repoRoot, { spawn = spawnSync, env = process.env } = {}) {
  // Prefer the canonical resolver; fall back to CLAUDE_SESSION_ID env var.
  try {
    const r = spawn(process.execPath, [path.join(repoRoot, STABLE_ID_HELPER_REL)], {
      encoding: "utf-8",
      timeout: STABLE_ID_TIMEOUT_MS,
      windowsHide: true,
    });
    const id = (r.stdout || "").trim();
    if (id && id.length >= 8) return id;
  } catch {
    /* fall through */
  }
  if (env.CLAUDE_SESSION_ID) {
    return `claude-${String(env.CLAUDE_SESSION_ID).slice(0, 8)}`;
  }
  return null;
}

export function getStagedPaths(repoRoot, { spawn = spawnSync } = {}) {
  try {
    const r = spawn("git", ["diff", "--cached", "--name-only"], {
      cwd: repoRoot,
      encoding: "utf-8",
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    });
    if (r.status !== 0) return null;
    const out = r.stdout || "";
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

export function logBypass(repoRoot, info) {
  try {
    const ledger = path.join(repoRoot, BYPASS_LEDGER_REL);
    mkdirSync(path.dirname(ledger), { recursive: true });
    appendFileSync(ledger, JSON.stringify({ ts: new Date().toISOString(), ...info }) + "\n", "utf-8");
  } catch {
    /* fail-silent — bypass logging must NEVER block a commit */
  }
}

/**
 * Top-level orchestrator (pure-with-injected-IO). Tests drive this directly
 * with stubbed readers; the CLI wraps it with real spawnSync/readFileSync.
 *
 * @returns {{decision:"allow"|"block", reason?:string, conflicts?:Object[],
 *            bypass?:boolean, fail_open?:string}}
 */
export function runGuard({
  repoRoot,
  env,
  readClaims,
  getStaged,
  resolveSid,
  now = Date.now(),
}) {
  if (env && env.PRISM_PATHSPEC_ONLY_DISABLE === "1") {
    return { decision: "allow", bypass: true };
  }
  const staged = getStaged(repoRoot);
  if (staged == null) return { decision: "allow", fail_open: "git-diff-failed" };
  if (staged.length === 0) return { decision: "allow", fail_open: "no-staged-paths" };
  const sessionId = resolveSid(repoRoot);
  if (!sessionId) return { decision: "allow", fail_open: "no-session-id" };
  const allClaims = readClaims(path.join(repoRoot, CLAIMS_DIR_REL));
  const foreign = filterActiveForeignClaims(allClaims, sessionId, now);
  if (foreign.length === 0) return { decision: "allow" };
  // Canonicalize staged relative paths → absolute against repoRoot
  const stagedAbs = staged.map((rel) => canonicalPath(path.join(repoRoot, rel)));
  return decide({ stagedAbsPaths: stagedAbs, claims: foreign });
}

// ── CLI entry point ────────────────────────────────────────────────────

function detectRepoRoot() {
  // 1. Explicit override
  if (process.env.PRISM_REPO_ROOT) return process.env.PRISM_REPO_ROOT;
  // 2. git rev-parse
  try {
    const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    });
    if (r.status === 0 && r.stdout) return r.stdout.trim();
  } catch {
    /* fall through */
  }
  // 3. Compile-time default
  return REPO_ROOT_DEFAULT;
}

function main() {
  const repoRoot = detectRepoRoot();
  const result = runGuard({
    repoRoot,
    env: process.env,
    readClaims: (dir) => readClaimsDir(dir),
    getStaged: (root) => getStagedPaths(root),
    resolveSid: (root) => resolveSessionId(root),
  });
  if (result.decision === "block") {
    process.stderr.write(result.reason + "\n");
    process.exit(1);
  }
  if (result.bypass) {
    logBypass(repoRoot, { reason: "knob-disable", env: "PRISM_PATHSPEC_ONLY_DISABLE=1" });
  }
  process.exit(0);
}

// Only run CLI when invoked directly (not when imported by tests).
const __thisFile = (process.argv[1] || "").replace(/\\/g, "/").split("/").pop() || "";
if (__thisFile && import.meta.url.endsWith(__thisFile)) {
  main();
}
