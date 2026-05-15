#!/usr/bin/env node
// tier: T0
/**
 * git-add-lane-guard.mjs — PreToolUse(Bash) `git add` SLOT-LANE gate.
 *
 * Built for SLOT-WORKTREE-MS0/U-P1-ADD-LANE-GUARD (P1-ROUTING). The
 * milestone's end state has 8 work slots (alpha..foxtrot + hotel + india)
 * + golf in their own per-slot worktrees at H:/prism-slot-<name>. Once a
 * slot chat is bound to its worktree, a `git add ../prism/<file>` is
 * almost always a mistake — the chat slipped out of its lane and is
 * staging integration-tree files. This hook intercepts `git add` and
 * blocks staging files OUTSIDE the chat's slot worktree root.
 *
 * Gap this fills (vs sibling hooks):
 *   - pre-edit-lane-guard.mjs       — blocks Edit/Write/MultiEdit by peer claim
 *   - file-claim-commit-guard.mjs   — blocks `git commit` by peer claim (and
 *                                      `git add` ONLY when chained with commit)
 *   - worktree-commit-route.mjs     — blocks `git commit` by worktree mismatch
 *   - git-add-lane-guard (this)     — blocks BARE `git add` by SLOT WORKTREE SCOPE
 *
 * The classic collision class this targets: a chat does `git add <paths>`
 * in one turn and the staged files sit in the index for the next turn.
 * A peer chat's `git commit` (no pathspec) then sweeps those staged files
 * into the peer's commit. The structural fix is per-slot worktrees (no
 * shared index); this hook is the transitional rail that catches the
 * out-of-lane staging BEFORE it can be swept.
 *
 * ── ACTIVATION ─────────────────────────────────────────────────────────
 * Env-opt-in, DEFAULT OFF (transitional). The hook is wired into
 * bash-bundle.mjs but is a pure no-op unless explicitly armed with
 * `PRISM_GIT_ADD_LANE_ENABLE=1`. The milestone's P3-DEFAULT-ON unit flips
 * the default once every chat is on a slot worktree. Kill switch
 * (always wins, even after default-on):
 * `PRISM_GIT_ADD_LANE_DISABLE=1`.
 *
 * NOTE: PRISM_*_ENABLE breaks the repo-wide PRISM_*_DISABLE convention on
 * purpose — it is the TRANSITIONAL knob for incremental fleet adoption;
 * once P3-DEFAULT-ON inverts the default, ENABLE becomes vestigial and
 * DISABLE is the live, convention-matching kill switch. (Sibling
 * worktree-commit-route.mjs uses the same pattern.)
 *
 * FIRES ON:  PreToolUse, matcher ^Bash$ (via bash-bundle.mjs)
 * ACTION:    deny when a `git add` would stage a path outside the chat's
 *            slot worktree root.
 *
 * NON-BLOCKING PATHS (allow):
 *   - PRISM_GIT_ADD_LANE_ENABLE unset/!=1     (default — hook is dormant)
 *   - PRISM_GIT_ADD_LANE_DISABLE=1            (kill switch — always wins)
 *   - command contains no `git add`           (out of scope)
 *   - slot scope cannot be resolved           (fail-OPEN; never break add)
 *   - chat has no slot binding                (fail-OPEN; pre-cutover state)
 *   - `git add .` / `-A` / `--all` / `-u`     from INSIDE the slot worktree
 *                                              (git scopes the broad globs
 *                                               to cwd's worktree by itself)
 *   - all explicit paths resolve INSIDE the slot worktree root
 *
 * BLOCK PATHS (deny):
 *   - any explicit path resolves OUTSIDE the slot worktree root
 *   - `git add .` / `-A` / `-u` invoked from OUTSIDE the slot worktree
 *
 * DETECTION:
 *   1. Parse cmd for `git add` invocations (handles `&&` / `;` / `||` chains).
 *   2. For each invocation, extract pathspec args (or detect broad-glob flags).
 *   3. Resolve the chat's slot via stable-session-id.mjs + chat-slots.json.
 *   4. Resolve the slot's worktree root via `git worktree list --porcelain`
 *      matched on the slot's `branch` field.
 *   5. Compare each pathspec (resolved absolute) against the slot worktree
 *      root prefix. Out-of-prefix → block with route hint.
 *
 * FAIL-OPEN POLICY: every internal error (missing chat-slots, unresolvable
 * branch, git failure, malformed payload) → allow. The worst-case behaviour
 * must be "today's discipline" (commit-time block), never breaking `git add`.
 * This is the same policy sibling lane-guards use.
 *
 * SIDE EFFECTS: none. Reads chat-slots.json + `git worktree list --porcelain`
 * via spawnSync (synchronous because PreToolUse is a blocking decision).
 * Max total budget ~2s.
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { exit } from "node:process";

// ── Activation-gate evaluation ─────────────────────────────────────────
// Default ON since SLOT-WORKTREE-MS0/U-P3-DEFAULT-ON (2026-05-15). The
// 11-slot worktree fleet is now bootstrapped (U-P3-BOOTSTRAP shipped as
// 65c5c3148), so slot chats can adopt slot-routing immediately. The
// transitional PRISM_GIT_ADD_LANE_ENABLE=1 knob is preserved as a no-op
// for back-compat (chats that set it just stay armed); PRISM_GIT_ADD_LANE_DISABLE=1
// is the live kill switch and ALWAYS wins.
// EVALUATED at module load (cheap), but the early-exit fires only inside
// main() so the module is safely IMPORTABLE by tests. (A bare top-level
// `exit(0)` here would kill any test harness that does
// `await import("./git-add-lane-guard.mjs")` — found via the smoke
// harness when it printed "boot" then silently died inside the import.)
function isHookArmed() {
  const disabled = process.env.PRISM_GIT_ADD_LANE_DISABLE === "1";
  return !disabled;
}

// ── Constants ──────────────────────────────────────────────────────────
const REPO_ROOT = "H:/prism";
const CHAT_SLOTS_PATH = `${REPO_ROOT}/state/shared/chat-slots.json`;
const STABLE_ID_HELPER = `${REPO_ROOT}/.claude/helpers/stable-session-id.mjs`;
const STABLE_ID_TIMEOUT_MS = 1500;
const GIT_TIMEOUT_MS = 2000;
const MIN_SID_LENGTH = 8;

// Broad-glob `git add` flags that stage everything in cwd's worktree.
const BROAD_GLOB_TOKENS = new Set([".", "-A", "--all", "-u", "--update"]);

// ── Pure helpers (exported for tests) ──────────────────────────────────

/** Canonical absolute path: forward slashes, drive lowercased, no trailing `/`. */
export function canonicalize(p) {
  if (!p) return "";
  const abs = path.isAbsolute(p) ? p : path.resolve(p);
  return abs
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, d) => d.toLowerCase() + ":")
    .replace(/\/+$/, "");
}

/**
 * Extract every `git add ...` invocation from a shell command line.
 * Handles `&&` / `;` / `||` chains. Strips redirections + comments.
 * Returns Array<{ broad: boolean, paths: string[] }> — broad=true when the
 * invocation uses `.` / `-A` / `--all` / `-u` (whole-tree staging).
 */
export function parseGitAddInvocations(cmd) {
  if (typeof cmd !== "string" || !cmd.length) return [];
  const out = [];
  // Split on shell separators that DON'T live inside single/double quotes.
  // Simple state machine — heredocs are not common in `git add` lines, so
  // we don't handle them; if one slips through, fail-OPEN downstream.
  const segments = [];
  let buf = "";
  let q = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) {
      buf += c;
      if (c === q && cmd[i - 1] !== "\\") q = null;
      continue;
    }
    if (c === "'" || c === '"') {
      q = c;
      buf += c;
      continue;
    }
    if ((c === "&" && cmd[i + 1] === "&") || (c === "|" && cmd[i + 1] === "|")) {
      segments.push(buf);
      buf = "";
      i++;
      continue;
    }
    if (c === ";" || c === "\n") {
      segments.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf) segments.push(buf);

  for (const segRaw of segments) {
    const seg = segRaw.replace(/#.*$/, "").trim(); // strip comments
    if (!seg) continue;
    // Match `git add` (allow leading words/env vars, but `git` must be a token).
    // We accept the standard form `git add ...`; we don't try to parse aliases.
    const m = seg.match(/(?:^|[\s;&|`(])git\s+add\b(.*)$/);
    if (!m) continue;
    const tail = m[1].trim();
    if (!tail) {
      // Bare `git add` with no args is a usage error — git will reject. Allow.
      continue;
    }
    // Tokenize tail respecting quotes.
    const tokens = tokenize(tail);
    // Skip flags that take an argument (rare on `git add` but handle `--chmod=...`).
    // We classify each non-flag token as a pathspec. Broad-glob flags upgrade `broad`.
    let broad = false;
    const paths = [];
    for (const t of tokens) {
      if (!t) continue;
      if (BROAD_GLOB_TOKENS.has(t)) {
        broad = true;
        continue;
      }
      if (t.startsWith("-")) {
        // skip non-broad flags (e.g. -v, --chmod=+x, --patch — none matter for scope)
        continue;
      }
      if (t === "--") continue; // pathspec separator
      paths.push(t);
    }
    out.push({ broad, paths });
  }
  return out;
}

/** Split a string into shell tokens (quote-aware, minimal). */
export function tokenize(s) {
  const out = [];
  let buf = "";
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q && s[i - 1] !== "\\") {
        q = null;
        continue;
      }
      buf += c;
      continue;
    }
    if (c === "'" || c === '"') {
      q = c;
      continue;
    }
    if (c === " " || c === "\t") {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      continue;
    }
    buf += c;
  }
  if (buf) out.push(buf);
  return out;
}

/** True if `child` is at or under `parent` (after canonicalize). */
export function isWithin(parent, child) {
  if (!parent || !child) return false;
  const p = canonicalize(parent);
  const c = canonicalize(child);
  if (c === p) return true;
  return c.startsWith(p + "/");
}

/**
 * Given a slot's branch name and the porcelain `git worktree list --porcelain`
 * output, return the worktree root for that branch (or null if not found).
 * Branch can be a short name (e.g. "slot/charlie") or full ref ("refs/heads/...").
 */
export function findWorktreeForBranch(porcelain, branch) {
  if (!porcelain || !branch) return null;
  const wantShort = branch.replace(/^refs\/heads\//, "");
  let curRoot = null;
  for (const line of porcelain.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      curRoot = line.slice("worktree ".length).trim();
      continue;
    }
    if (line.startsWith("branch ")) {
      const ref = line.slice("branch ".length).trim();
      const short = ref.replace(/^refs\/heads\//, "");
      if (short === wantShort) return curRoot;
    }
  }
  return null;
}

// ── Side-effectful resolvers (skipped in unit tests via DI) ────────────

function readJsonSafe(p) {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function resolveSessionId() {
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], {
      encoding: "utf-8",
      timeout: STABLE_ID_TIMEOUT_MS,
      windowsHide: true,
    });
    const id = (r.stdout || "").trim();
    if (id && id.length >= MIN_SID_LENGTH) return id;
  } catch {
    /* fail-open */
  }
  if (process.env.CLAUDE_SESSION_ID) {
    return `claude-${process.env.CLAUDE_SESSION_ID.slice(0, 8)}`;
  }
  return null;
}

function readSlotsSafe() {
  return readJsonSafe(CHAT_SLOTS_PATH);
}

function gitWorktreePorcelain(cwd) {
  try {
    const r = spawnSync("git", ["worktree", "list", "--porcelain"], {
      cwd,
      encoding: "utf-8",
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    });
    if (r.status !== 0) return null;
    return r.stdout || "";
  } catch {
    return null;
  }
}

/**
 * Resolve the slot scope (slot worktree root absolute path) for this chat.
 * Returns null if any step fails — caller MUST fail-open on null.
 *
 * Schema match: state/shared/chat-slots.json is shaped
 *   { schemaVersion, lastUpdated, slots: { alpha:{chatId,branch,...}, bravo:{...}, ... } }
 * `slots.slots` is an OBJECT keyed by slot name, NOT an array, and the chat
 * state is the direct value (no nested `state` field). The original
 * U-P1-ADD-LANE-GUARD ship used an `.find()` over an array — would throw
 * TypeError when armed against the real file. Caught while writing the
 * sibling main-tree-write-block hook + back-fixed here. Today the hook is
 * default-OFF so the latent bug never fired in production.
 */
export function resolveSlotScope({
  sessionId,
  slots,
  porcelain,
  cwd,
}) {
  if (!sessionId || !slots || !slots.slots) return null;
  const bag = slots.slots;
  if (typeof bag !== "object" || Array.isArray(bag)) return null;
  let matchedSlot = null;
  let matchedBranch = null;
  for (const [slotName, state] of Object.entries(bag)) {
    if (state && typeof state === "object" && state.chatId === sessionId) {
      matchedSlot = slotName;
      matchedBranch = state.branch || null;
      break;
    }
  }
  if (!matchedSlot || !matchedBranch) return null;
  const root = findWorktreeForBranch(porcelain, matchedBranch);
  if (!root) return null;
  return {
    slot: matchedSlot,
    branch: matchedBranch,
    root: canonicalize(root),
    cwd: canonicalize(cwd),
  };
}

/**
 * Core decision (pure): given a parsed command + slot scope, return null
 * to allow or a {decision,reason} object to block. Tests drive this directly.
 */
export function decideOnInvocations(invocations, scope) {
  if (!invocations || invocations.length === 0) return null;
  if (!scope || !scope.root) return null;
  const offenders = [];
  for (const inv of invocations) {
    if (inv.broad) {
      // Broad glob: git scopes to cwd's worktree. If cwd is outside slot,
      // the staging crosses the lane.
      if (!isWithin(scope.root, scope.cwd)) {
        offenders.push({
          kind: "broad-from-outside",
          detail: `cwd=${scope.cwd} broad=${inv.broad}`,
        });
      }
      continue;
    }
    for (const p of inv.paths) {
      const abs = path.isAbsolute(p) ? canonicalize(p) : canonicalize(path.join(scope.cwd, p));
      if (!isWithin(scope.root, abs)) {
        offenders.push({ kind: "path", detail: abs });
      }
    }
  }
  if (offenders.length === 0) return null;
  const list = offenders.slice(0, 8).map((o) => `  - [${o.kind}] ${o.detail}`).join("\n");
  return {
    decision: "block",
    reason:
      `git-add-lane-guard: blocked staging outside slot scope.\n` +
      `  slot:   ${scope.slot}\n` +
      `  branch: ${scope.branch}\n` +
      `  scope:  ${scope.root}\n` +
      `  cwd:    ${scope.cwd}\n` +
      `out-of-scope staging:\n${list}\n` +
      `Fix: cd into the slot worktree (${scope.root}) and re-run, OR use ` +
      `[MAIN-FORCE] semantics via a non-slot chat. ` +
      `Kill switch: PRISM_GIT_ADD_LANE_DISABLE=1.`,
  };
}

// ── Entry point ────────────────────────────────────────────────────────
function main() {
  // Activation gate — moved from top-level so the module stays importable
  // by tests / smoke harnesses (a top-level `exit(0)` would kill the
  // importing process). Runs as the first thing in main() so a disabled
  // hook costs ~nothing.
  if (!isHookArmed()) exit(0);

  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf-8"));
  } catch {
    exit(0); // fail-open on malformed stdin
  }
  if (!payload || payload.tool_name !== "Bash") exit(0);
  const cmd = payload.tool_input?.command;
  if (typeof cmd !== "string" || !cmd) exit(0);

  const invocations = parseGitAddInvocations(cmd);
  if (invocations.length === 0) exit(0); // not a `git add` line

  const sessionId = resolveSessionId();
  const slots = readSlotsSafe();
  // Bash tool may pass an explicit cwd in its stdin payload — that is the
  // cwd `git add` will actually execute under. Sibling file-claim-commit-guard
  // uses the same precedence. process.cwd() is the last-resort fallback.
  // (P1-B3 from per-file scrutiny — post-cutover slots may invoke Bash from
  // a different cwd than the hook process.)
  const cwd =
    payload?.cwd ||
    payload?.tool_input?.cwd ||
    process.env.CLAUDE_PROJECT_DIR ||
    process.cwd();
  const porcelain = gitWorktreePorcelain(cwd);
  if (!sessionId || !slots || !porcelain) exit(0); // fail-open

  const scope = resolveSlotScope({ sessionId, slots, porcelain, cwd });
  if (!scope) exit(0); // chat has no slot binding — pre-cutover state, allow

  const decision = decideOnInvocations(invocations, scope);
  if (!decision) exit(0);

  // Emit structured block decision (stdout JSON is the harness's contract).
  process.stdout.write(JSON.stringify(decision) + "\n");
  exit(0);
}

// Only run when invoked as CLI (not when imported by tests).
const __mainBasename = (process.argv[1] || "").replace(/\\/g, "/").split("/").pop() || "";
if (__mainBasename && import.meta.url.endsWith(__mainBasename)) {
  main();
}
