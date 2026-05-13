#!/usr/bin/env node
// tier: T0
/**
 * auto-fork-executor.mjs — PreToolUse(Bash for git commit) auto-fork hook.
 *
 * Existing worktree-commit-route.mjs detects cross-tree commit conflicts and
 * PRINTS a `git worktree add ...` instruction the chat is supposed to read
 * and run. In practice, that instruction is sometimes parsed wrong, skipped
 * under context pressure, or partially executed — leaving the chat with a
 * commit it cannot land and no clear next step.
 *
 * This hook actually performs the fork instead of describing it:
 *
 *   1. Parse the `git commit` command — extract subject + scope.
 *   2. Decide whether the current cwd is allowed to commit this scope. If
 *      yes (silent), exit with continue:true.
 *   3. If not allowed AND a fork is feasible (no branch collision, no path
 *      collision, git available, scope inferable):
 *        a. spawnSync `git worktree add <newPath> -b work/<scope>-<idTag>`
 *        b. spawnSync `git stash push -u -m "auto-fork-<scope>"` to capture
 *           any staged or unstaged work in the original worktree
 *        c. Block the original commit with a structured message that gives
 *           the chat ONE bash invocation to retry from the new tree
 *   4. If a fork is NOT feasible (preconditions failed), exit silently and
 *      let worktree-commit-route.mjs handle the block with text instructions
 *      so the chat still gets routed somewhere — never break the chain.
 *
 * Opt-out: `PRISM_AUTO_FORK=0` env var disables the auto-execute path and
 *          makes this hook a no-op (worktree-commit-route still fires).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { exit } from "node:process";
import { fileURLToPath } from "node:url";

// Audit-log helper invoked synchronously via the helper's CLI. Resolved
// relative to this hook so it works in any worktree. A missing helper or a
// failed write must never break the hook itself — every error is swallowed.
const ARBITRATION_HELPER_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "helpers",
  "arbitration-log.mjs",
);
const ARBITRATION_LOG_TIMEOUT_MS = 2000;
function logArbitration(kind, details, ctx) {
  try {
    if (!fs.existsSync(ARBITRATION_HELPER_PATH)) return;
    const args = [
      ARBITRATION_HELPER_PATH,
      "append",
      "--kind",
      kind,
      "--details",
      JSON.stringify(details ?? {}),
    ];
    if (ctx && ctx.sessionId) args.push("--session", ctx.sessionId);
    spawnSync(process.execPath, args, {
      timeout: ARBITRATION_LOG_TIMEOUT_MS,
      stdio: ["ignore", "ignore", "ignore"],
      windowsHide: true,
    });
  } catch {
    // never let the audit log break the hook itself
  }
}

// -- Constants ------------------------------------------------------------

const GIT_TIMEOUT_MS = 5000;
const STASH_TIMEOUT_MS = 3000;
const WORKTREE_LIST_TIMEOUT_MS = 2000;
const MAX_PATH_DEDUPE_ATTEMPTS = 5;
const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const STABLE_ID_TIMEOUT_MS = 1500;
const SCOPE_KEY_MAX_LEN = 24;

const COMMIT_RE =
  /\bgit(?:\.exe)?\s+(?:-[A-Za-z-]+\s+|--[A-Za-z-]+(?:=\S+)?\s+)*commit(?!-tree)\b/;

const GIT_CANDIDATES = [
  "git",
  "C:\\Program Files\\Git\\cmd\\git.exe",
  "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
];

// -- Stdin parse ----------------------------------------------------------

function readPayload() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch {
    return null;
  }
}

const payload = readPayload();
if (!payload) {
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

if (process.env.PRISM_AUTO_FORK === "0") {
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

const tool = payload.tool_name || payload.toolName || "";
if (tool !== "Bash") {
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

const cmd = String(
  payload.tool_input?.command ?? payload.input?.command ?? "",
);
if (!cmd.trim() || !COMMIT_RE.test(cmd)) {
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

// -- Parse subject + scope ------------------------------------------------

function firstLine(s) {
  if (!s) return "";
  const i = s.indexOf("\n");
  return (i === -1 ? s : s.slice(0, i)).trim();
}

function extractSubject(command) {
  const heredoc = command.match(
    /-m\s+"\$\(cat\s+<<['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\1\s*\)"/,
  );
  if (heredoc) return firstLine(heredoc[2]);
  const inline = command.match(
    /-m\s+(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|(\S+))/,
  );
  if (inline) return firstLine(inline[1] ?? inline[2] ?? inline[3] ?? "");
  return "";
}

function extractScope(subj) {
  if (!subj) return "";
  // Bypass: explicit override prefixes
  if (/^\s*\[\s*MAIN(?:-FORCE)?\s*\]/i.test(subj)) return "";
  const pre = subj.split(":")[0] || subj;
  const upper = pre.match(/^[A-Z][A-Z0-9]+(?:[-][A-Z0-9]+)*/);
  if (!upper) {
    const word = (pre.split(/\s+/)[0] || "").toLowerCase();
    return word.replace(/[^a-z0-9]+/g, "-").slice(0, SCOPE_KEY_MAX_LEN);
  }
  const first = upper[0].split("-")[0].toLowerCase();
  return first.slice(0, SCOPE_KEY_MAX_LEN);
}

const subject = extractSubject(cmd);
const scope = extractScope(subject);

// No subject (editor-mode commit) or explicit override → let worktree-route
// handle. Auto-fork only fires on parseable scoped subjects.
if (!subject || !scope) {
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

// -- Find git binary ------------------------------------------------------

function findGit() {
  for (const g of GIT_CANDIDATES) {
    try {
      const r = spawnSync(g, ["--version"], {
        timeout: 1500,
        encoding: "utf-8",
      });
      if (r.status === 0) return g;
    } catch {
      /* try next */
    }
  }
  return null;
}

const git = findGit();
if (!git) {
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

// -- Worktree topology ----------------------------------------------------

function listWorktrees() {
  const r = spawnSync(git, ["worktree", "list", "--porcelain"], {
    cwd: process.cwd(),
    timeout: WORKTREE_LIST_TIMEOUT_MS,
    encoding: "utf-8",
  });
  if (r.status !== 0) return [];
  const out = [];
  let cur = {};
  for (const raw of (r.stdout || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (cur.path) out.push(cur);
      cur = {};
      continue;
    }
    const [k, ...rest] = line.split(" ");
    const v = rest.join(" ");
    if (k === "worktree") cur.path = v;
    else if (k === "branch") cur.branch = v.replace(/^refs\/heads\//, "");
    else if (k === "HEAD") cur.head = v;
    else if (k === "detached") cur.detached = true;
  }
  if (cur.path) out.push(cur);
  return out;
}

function normalisePath(p) {
  return path.resolve(p).replace(/\\/g, "/").toLowerCase();
}

function branchBasename(b) {
  return (b || "").split("/").pop().toLowerCase();
}

const worktrees = listWorktrees();
if (worktrees.length === 0) {
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

const cwdNorm = normalisePath(process.cwd());
const currentWt = worktrees.find((w) => normalisePath(w.path) === cwdNorm);

// If we already are on a worktree whose branch matches the scope, the
// commit belongs here — silent allow.
function scopeMatches(scopeToken, branchHead) {
  if (!scopeToken || !branchHead) return false;
  return (
    branchHead.includes(scopeToken) ||
    scopeToken.includes(branchHead.split("-")[0])
  );
}

if (currentWt) {
  const head = branchBasename(currentWt.branch);
  if (head !== "main" && head !== "master" && scopeMatches(scope, head)) {
    console.log(JSON.stringify({ continue: true }));
    exit(0);
  }
}

// We're on main, master, or a non-matching tree. Check for an existing
// themed worktree we should redirect to before creating a new one.
const existingMatch = worktrees.find((w) => {
  const head = branchBasename(w.branch);
  if (head === "main" || head === "master") return false;
  return scopeMatches(scope, head);
});

// If a themed worktree already exists for this scope, defer to
// worktree-commit-route (it will print the cd-and-retry instruction). We
// don't create yet another tree — that would proliferate worktrees.
if (existingMatch) {
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

// -- Resolve own session id for the tree-name id-tag ---------------------

function ownSessionId() {
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], {
      timeout: STABLE_ID_TIMEOUT_MS,
      encoding: "utf-8",
    });
    const out = (r.stdout || "").trim();
    if (out.startsWith("claude-")) return out;
  } catch {
    /* fall through */
  }
  return "";
}

const sessionId = ownSessionId();
const idTag = sessionId
  ? sessionId.replace(/^claude-/, "").slice(0, 6)
  : Date.now().toString(36).slice(-6);

// -- Decide a non-colliding worktree path --------------------------------

function pickWorktreePath() {
  for (let attempt = 0; attempt < MAX_PATH_DEDUPE_ATTEMPTS; attempt += 1) {
    const suffix = attempt === 0 ? idTag : `${idTag}-${attempt}`;
    const candidate = path.resolve(process.cwd(), `../prism-${scope}-${suffix}`);
    if (!fs.existsSync(candidate)) {
      return { newPath: candidate, branch: `work/${scope}-${suffix}` };
    }
  }
  return null;
}

const fork = pickWorktreePath();
if (!fork) {
  // All candidate paths exist — defer to worktree-commit-route's text path.
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

// -- Pre-flight: does the branch already exist? --------------------------

const branchCheck = spawnSync(git, ["rev-parse", "--verify", fork.branch], {
  cwd: process.cwd(),
  timeout: GIT_TIMEOUT_MS,
  encoding: "utf-8",
});
if (branchCheck.status === 0) {
  // Branch exists — let worktree-commit-route handle the redirect.
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

// -- Create the worktree --------------------------------------------------

const wtAdd = spawnSync(
  git,
  ["worktree", "add", fork.newPath, "-b", fork.branch],
  {
    cwd: process.cwd(),
    timeout: GIT_TIMEOUT_MS,
    encoding: "utf-8",
  },
);

if (wtAdd.status !== 0) {
  // Don't break the chain — if worktree-add fails, defer to text-only path.
  console.log(JSON.stringify({ continue: true }));
  exit(0);
}

// -- Optional: stash work-in-progress ------------------------------------

const stashKey = `auto-fork-${scope}-${idTag}-${Date.now()}`;
let stashed = false;

const statusCheck = spawnSync(git, ["status", "--porcelain"], {
  cwd: process.cwd(),
  timeout: GIT_TIMEOUT_MS,
  encoding: "utf-8",
});
const hasChanges = statusCheck.status === 0 && (statusCheck.stdout || "").trim().length > 0;

if (hasChanges) {
  const stashRes = spawnSync(
    git,
    ["stash", "push", "-u", "-m", stashKey],
    {
      cwd: process.cwd(),
      timeout: STASH_TIMEOUT_MS,
      encoding: "utf-8",
    },
  );
  stashed = stashRes.status === 0;
}

// -- Emit block with one-line retry command ------------------------------

const retryHead = stashed ? `git stash pop && ` : "";
const retryCmd = `cd "${fork.newPath}" && ${retryHead}${cmd.replace(/^\s+|\s+$/g, "").slice(0, 240)}`;

const lines = [
  `AUTO-FORK — original commit blocked, but I just forked you into your own tree.`,
  ``,
  `New worktree:  ${fork.newPath}`,
  `New branch:    ${fork.branch}`,
  stashed ? `Work in progress stashed as: ${stashKey}` : `(no working-tree changes to stash)`,
  ``,
  `RETRY — single command lands you in the new tree with your work intact:`,
  `  ${retryCmd}`,
  ``,
  `If anything looks wrong:`,
  `  git worktree remove "${fork.newPath}"           # undo the fork`,
  stashed ? `  git stash list | grep "${stashKey}"             # locate the stash` : "",
  stashed ? `  git stash pop "stash@{N}"                       # restore where N is the index above` : "",
  ``,
  `WHY: 6 concurrent chats committing to the same tree collide on HEAD.`,
  `Auto-fork puts you on your own branch so this commit lands without`,
  `racing peers. Set PRISM_AUTO_FORK=0 to disable this hook entirely.`,
].filter(Boolean);

// Audit-log the fork before emitting block. P5-U04 surfaces this in the
// per-agent handoff so we can see how often the rails actually fire.
logArbitration(
  "auto-fork",
  {
    scope,
    newWorktree: fork.newPath,
    newBranch: fork.branch,
    stashed,
    stashKey: stashed ? stashKey : null,
    originalCommitSubject: subject,
    originalCwd: process.cwd(),
  },
  { sessionId },
);

console.log(
  JSON.stringify({
    decision: "block",
    reason: lines.join("\n"),
  }),
);
exit(0);
