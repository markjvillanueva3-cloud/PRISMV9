#!/usr/bin/env node
// tier: T1
/**
 * Bash Result Cache — PreToolUse Hook
 *
 * Blocks duplicate Bash executions within a session for a narrow whitelist
 * of read-only, idempotent commands. Saves tokens on repeat `git log`,
 * `git diff`, `ls`, `wc`, `stat`-type probes that already returned in this
 * session.
 *
 * Cache key: sessionId + normalized command + cwd
 *
 * Whitelist: only commands that are BOTH read-only AND don't embed
 * side-effect primitives. Rejected if command contains any of:
 *   `>`, `>>`, `|`, `&&`, `||`, `;`, `&`, `$(`, backtick, `rm`, `cp`,
 *   `mv`, `touch`, `mkdir`, `chmod`, `chown`, `git add`, `git commit`,
 *   `git push`, `git pull`, `git reset`, `git checkout -`, `git merge`,
 *   `git rebase`, `npm`, `node`, `curl`, `wget`
 *
 * Accepted regex set (first token after optional `cd X &&` stripped):
 *   ^git\s+(log|diff|show|status|branch|remote|blame|rev-parse|describe|
 *            tag|config\s+--get|ls-files|log\s+-|cat-file|count-objects)\b
 *   ^ls(\s|$)
 *   ^wc\b
 *   ^du\b
 *   ^stat\b
 *   ^file\b
 *   ^readlink\b
 *   ^pwd$
 *   ^whoami$
 *   ^date(\s|$)
 *
 * TTL: 3 minutes (repo state moves fast — shorter than FileReadCache's 2h).
 *
 * Output:
 *  - whitelist miss  -> silent pass (no decision)
 *  - whitelist + hit -> permissionDecision "deny" with cached output digest
 *
 * Never blocks on errors; cache is best-effort.
 *
 * Related: AGI-INFRA BASH-CACHE (Phase A extension).
 */

import { promises as fs } from "node:fs";
import { createInterface } from "node:readline";
import crypto from "node:crypto";

const CACHE_DIR = "H:/prism/.claude/cache";
const CACHE_FILE = `${CACHE_DIR}/bash-result-cache.json`;
const TELEMETRY_FILE = `${CACHE_DIR}/hook-telemetry.jsonl`;
const TTL_MS = 3 * 60 * 1000;

const SIDE_EFFECT_TOKENS = [
  ">", ">>", "|", "&&", "||", ";", " & ", "$(", "`",
  " rm ", " cp ", " mv ", " touch ", " mkdir ", " chmod ", " chown ",
  "git add", "git commit", "git push", "git pull", "git reset",
  "git merge", "git rebase", "git stash p", "git stash pop",
  "git stash apply", "git checkout -", "git checkout --",
  " npm ", " node ", " curl ", " wget ", " apt ", " brew ", " pip ",
];

const ACCEPT_PATTERNS = [
  /^git\s+(log|diff|show|status|branch|remote|blame|rev-parse|describe|tag|ls-files|cat-file|count-objects)\b/,
  /^git\s+config\s+--get\b/,
  /^ls(\s|$)/,
  /^wc\b/,
  /^du\b/,
  /^stat\b/,
  /^file\b/,
  /^readlink\b/,
  /^pwd\s*$/,
  /^whoami\s*$/,
  /^date(\s|$)/,
];

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      data += line + "\n";
    });
    rl.on("close", () => resolve(data));
  });
}

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // non-fatal
  }
}

function pruneExpired(cache) {
  const now = Date.now();
  const out = {};
  for (const [k, v] of Object.entries(cache)) {
    if (v && typeof v === "object" && typeof v.ts === "number" && now - v.ts < TTL_MS) {
      out[k] = v;
    }
  }
  return out;
}

async function logTelemetry(event) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.appendFile(TELEMETRY_FILE, JSON.stringify(event) + "\n", "utf8");
  } catch {
    // non-fatal — never break the hook for telemetry
  }
}

function stripCdPrefix(cmd) {
  // `cd X && <real>` — cache on the <real> portion but key includes the cd target
  const m = cmd.match(/^cd\s+[^&]+&&\s*(.+)$/);
  if (m) return { cd: cmd.match(/^cd\s+([^&]+?)\s*&&/)[1], rest: m[1].trim() };
  return { cd: null, rest: cmd.trim() };
}

function isEligible(cmd) {
  const lower = " " + cmd.toLowerCase() + " ";
  for (const tok of SIDE_EFFECT_TOKENS) {
    if (lower.includes(tok)) return false;
  }
  return ACCEPT_PATTERNS.some((re) => re.test(cmd));
}

function cacheKey({ sessionId, cmd, cwd }) {
  const h = crypto.createHash("sha1");
  h.update(`${sessionId ?? "_"}::${cmd}::${cwd ?? ""}`);
  return h.digest("hex");
}

function emitDecision(reason) {
  const out = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(out));
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  if (event.tool_name !== "Bash") process.exit(0);
  const input = event.tool_input || {};
  const cmd = typeof input.command === "string" ? input.command.trim() : "";
  if (!cmd) process.exit(0);

  const { cd, rest } = stripCdPrefix(cmd);
  if (!isEligible(rest)) process.exit(0);

  const sessionId =
    event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID;
  const key = cacheKey({ sessionId, cmd, cwd: cd });

  const cache = pruneExpired(await loadCache());
  const hit = cache[key];
  if (hit) {
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "bash-result-cache",
      event: "deny",
      session_id: sessionId ?? null,
      key_hash: key.slice(0, 12),
      command_prefix: cmd.slice(0, 80),
    });
    emitDecision(
      `Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).`,
    );
    process.exit(0);
  }

  cache[key] = { ts: Date.now(), cmd: cmd.slice(0, 200) };
  await saveCache(cache);
  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "bash-result-cache",
    event: "miss-recorded",
    session_id: sessionId ?? null,
    key_hash: key.slice(0, 12),
  });
  process.exit(0);
}

main().catch(() => process.exit(0));
