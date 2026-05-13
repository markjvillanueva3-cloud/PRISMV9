#!/usr/bin/env node
// tier: T1
/**
 * staged-hygiene-check.mjs — PreToolUse absorption prevention
 *
 * WHY: Git's index persists across sessions. If session A runs `git add X`
 * then pauses, and session B later runs `git add Y && git commit`, B's
 * commit captures BOTH X and Y. This has happened twice already in this
 * codebase — once as absorber, once as absorbed.
 *
 * This hook intercepts `git commit` calls at PreToolUse time:
 *   1. Reads `git diff --cached --name-only` — the staged set S
 *   2. Reads session-writes/<sessionId>.jsonl — this session's write set W
 *   3. Unexpected = S \ W  (staged files NOT touched by this session)
 *   4. If unexpected.size > 0 → emit permissionDecision "allow" with a
 *      directive warning listing the unexpected files + remediation command
 *
 * NEVER blocks: the commit proceeds. Just surfaces the issue so the agent
 * can choose whether to `git reset HEAD -- <file>` before committing.
 *
 * The allow-with-reason model matches git-commit-checkin.mjs: Claude sees
 * the reason text before the tool runs and can react.
 *
 * AGI-INFRA Phase D / D-STAGED-HYGIENE.
 */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exit } from "node:process";
import { promises as fsp } from "node:fs";
import { createInterface } from "node:readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SESSION_WRITES_DIR = "H:/prism/.claude/cache/session-writes";
const TELEMETRY_FILE = "H:/prism/.claude/cache/hook-telemetry.jsonl";
const LOOKBACK_MS = 6 * 60 * 60 * 1000; // 6h — only recent writes count

// Skip -am commits: user explicitly wants all modified tracked files
// (though absorption of others' work is still possible; treat -am as opt-in)
const COMMIT_AM_RE = /\bgit(?:\.exe)?\s+commit\b[^"']*\s-a(?:m|M|\s)/i;

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => { data += line + "\n"; });
    rl.on("close", () => resolve(data));
  });
}

async function logTelemetry(event) {
  try {
    await fsp.appendFile(TELEMETRY_FILE, JSON.stringify(event) + "\n", "utf8");
  } catch { /* non-fatal */ }
}

function findRepoRoot(startDir) {
  let dir = startDir;
  const root = path.parse(dir).root;
  for (let i = 0; i < 12; i++) {
    try {
      if (existsSync(path.join(dir, ".git"))) return dir;
    } catch { /* keep walking */ }
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
  return null;
}

function getStagedFiles(repoRoot) {
  try {
    const out = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: repoRoot,
      timeout: 3000,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

function normalize(p) {
  return path.resolve(p).replace(/\\/g, "/").toLowerCase();
}

function toRepoRelative(repoRoot, absOrRel) {
  if (path.isAbsolute(absOrRel)) {
    try {
      return path.relative(repoRoot, absOrRel).replace(/\\/g, "/");
    } catch {
      return absOrRel.replace(/\\/g, "/");
    }
  }
  return absOrRel.replace(/\\/g, "/");
}

function loadSessionWrites(sessionId) {
  const safe = String(sessionId || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
  const logPath = path.join(SESSION_WRITES_DIR, `${safe}.jsonl`);
  if (!existsSync(logPath)) return [];
  try {
    const raw = readFileSync(logPath, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const cutoff = Date.now() - LOOKBACK_MS;
    const entries = [];
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if (typeof e.ts_ms === "number" && e.ts_ms < cutoff) continue;
        if (Array.isArray(e.files)) entries.push(e);
      } catch { /* skip */ }
    }
    return entries;
  } catch {
    return [];
  }
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) exit(0);
  let event;
  try { event = JSON.parse(raw); } catch { exit(0); }

  if (event.tool_name !== "Bash") exit(0);
  const cmd = event.tool_input?.command;
  if (typeof cmd !== "string" || !cmd) exit(0);

  // Only care about `git commit` (not push, log, status, etc.)
  const isCommit = /\bgit(?:\.exe)?\s+(?:-[^\s]+\s+)*commit\b/i.test(cmd);
  if (!isCommit) exit(0);

  // `-am` explicitly includes all tracked modifications — user opt-in.
  // Still worth a heads-up but skip for now to avoid noise on intentional use.
  if (COMMIT_AM_RE.test(cmd)) {
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "staged-hygiene-check",
      event: "skip-am",
      session_id: event.session_id || null,
    });
    exit(0);
  }

  const cwd = event.cwd || event.working_directory || "H:/prism";
  const repoRoot = findRepoRoot(cwd) || findRepoRoot("H:/prism");
  if (!repoRoot) exit(0);

  const staged = getStagedFiles(repoRoot);
  if (staged === null || staged.length === 0) exit(0);

  const sessionId = event.session_id || event.sessionId || process.env.CLAUDE_SESSION_ID || "unknown";
  const writeEntries = loadSessionWrites(sessionId);

  // Build normalized set of files this session wrote
  const myFiles = new Set();
  for (const e of writeEntries) {
    for (const f of e.files) {
      const rel = toRepoRelative(repoRoot, f);
      myFiles.add(normalize(path.join(repoRoot, rel)));
    }
  }

  // Compare staged files against my write set
  const unexpected = [];
  for (const s of staged) {
    const absStaged = path.join(repoRoot, s);
    if (!myFiles.has(normalize(absStaged))) {
      unexpected.push(s);
    }
  }

  if (unexpected.length === 0) {
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "staged-hygiene-check",
      event: "clean",
      session_id: sessionId,
      staged_count: staged.length,
    });
    exit(0);
  }

  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "staged-hygiene-check",
    event: "unexpected-staged",
    session_id: sessionId,
    staged_count: staged.length,
    unexpected_count: unexpected.length,
    unexpected: unexpected.slice(0, 20),
  });

  const shown = unexpected.slice(0, 12);
  const more = unexpected.length > shown.length ? `\n  … (+${unexpected.length - shown.length} more)` : "";
  const reason =
    `⚠ STAGED INDEX HYGIENE WARNING\n` +
    `${unexpected.length} file(s) in the staged index were NOT written by this\n` +
    `session in the last ${Math.round(LOOKBACK_MS / 3600000)}h. They may belong to another chat.\n\n` +
    `Unexpected staged files:\n` +
    shown.map((f) => `  ${f}`).join("\n") + more + "\n\n" +
    `If this commit is meant to be YOUR work only, run:\n` +
    `  git reset HEAD -- ${shown.slice(0, 4).map((f) => `"${f}"`).join(" ")}${unexpected.length > 4 ? " …" : ""}\n` +
    `then re-run git commit.\n\n` +
    `If you intentionally want to include these changes, proceed — post an\n` +
    `AGENT_CHAT note so the origin chat knows their work was captured.\n` +
    `(Proceeding — this is a warning, not a gate.)`;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: reason,
    },
  }));
  exit(0);
}

main().catch(() => exit(0));
