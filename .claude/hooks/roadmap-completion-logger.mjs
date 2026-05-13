#!/usr/bin/env node
// tier: T3
/**
 * roadmap-completion-logger.mjs — PostToolUse roadmap unit tracker
 *
 * WHY: roadmap-index.json tracks 631 milestones and ~3000 units. Commits
 * already reference unit IDs in subject lines (e.g., "CPP-MS4-S10/U-CPP30",
 * "AGI-INFRA-PHASE-B/B1+B2"). But completion state only updates when a
 * human manually edits the roadmap. This is error-prone and lossy.
 *
 * This hook fires after a successful `git commit` Bash call, parses the HEAD
 * commit's subject for a roadmap unit pattern, and APPENDS to
 * state/shared/ROADMAP_COMPLETIONS_QUEUE.jsonl. Append-only is safe under
 * concurrent writes; drain/reconciliation happens out of band.
 *
 * FIRES ON: PostToolUse, matcher ^Bash$
 * PATTERNS matched (subject line):
 *   MILESTONE/UNIT:   e.g.  CPP-MS4-S10/U-CPP30:
 *   MILESTONE/UNIT+:  e.g.  AGI-INFRA-PHASE-B/B1+B2:
 *   MILESTONE:        e.g.  PP-CST:        (milestone only)
 *
 * OUTPUT: silent (this is a logging hook, no decision).
 *
 * AGI-INFRA Phase C / C2-ROADMAP-COMPLETION-LOGGER.
 */

import { promises as fs, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline";

const CACHE_DIR = "H:/prism/.claude/cache";
const TELEMETRY_FILE = `${CACHE_DIR}/hook-telemetry.jsonl`;
const QUEUE_CANDIDATES = [
  "H:/prism/state/shared/ROADMAP_COMPLETIONS_QUEUE.jsonl",
  "H:/prism-agi-infra-a/state/shared/ROADMAP_COMPLETIONS_QUEUE.jsonl",
];

// Matches a commit subject whose first whitespace-delimited token looks like
// a roadmap tag. Examples:
//   CPP-MS4-S10/U-CPP30: ...
//   AGI-INFRA-PHASE-B/B1+B2: ...
//   PP-CST: ...
//   WEDM-AGI-P4-MS3/U-P4-07: ...
const ROADMAP_TAG_RE = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*(?:\/[A-Z0-9][A-Z0-9+\-_]*)?):/;

async function logTelemetry(event) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.appendFile(TELEMETRY_FILE, JSON.stringify(event) + "\n", "utf8");
  } catch { /* non-fatal */ }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => { data += line + "\n"; });
    rl.on("close", () => resolve(data));
  });
}

function pickQueuePath() {
  for (const p of QUEUE_CANDIDATES) {
    try {
      if (existsSync(path.dirname(p))) return p;
    } catch { /* try next */ }
  }
  return null;
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

function getHeadCommit(cwd) {
  try {
    // %H hash, %ct committer-epoch, %s subject, %b body
    // Use NUL between fields so multi-line bodies don't confuse us.
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%H%x00%ct%x00%s%x00%b"],
      { cwd, timeout: 3000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }
    ).toString();
    const [hash, epoch, subject, ...bodyParts] = out.split("\x00");
    return {
      hash: (hash || "").trim(),
      epoch: Number(epoch) || null,
      subject: (subject || "").trim(),
      body: bodyParts.join("\x00").trim(),
    };
  } catch {
    return null;
  }
}

function countFilesChanged(cwd, hash) {
  try {
    const out = execFileSync(
      "git",
      ["show", "--stat", "--format=", hash],
      { cwd, timeout: 3000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }
    ).toString();
    // Last line typically: " N files changed, ..."
    const m = out.match(/(\d+)\s+files?\s+changed/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

async function appendQueue(queuePath, entry) {
  try {
    await fs.mkdir(path.dirname(queuePath), { recursive: true });
    await fs.appendFile(queuePath, JSON.stringify(entry) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);
  let event;
  try { event = JSON.parse(raw); } catch { process.exit(0); }

  if (event.tool_name !== "Bash") process.exit(0);
  const cmd = event.tool_input?.command;
  if (typeof cmd !== "string" || !cmd) process.exit(0);

  // Only care about successful `git commit` calls
  // (PostToolUse runs whether command succeeded or not — check exit code)
  const looksLikeCommit = /\bgit(?:\.exe)?\s+(?:-[^\s]+\s+)*commit\b/i.test(cmd);
  if (!looksLikeCommit) process.exit(0);

  // tool_response shape varies but typical: { exit_code: 0, stdout: ..., stderr: ... }
  // Some Claude Code variants wrap it under tool_response.output or similar.
  const resp = event.tool_response || event.response || {};
  const exitCode =
    typeof resp.exit_code === "number" ? resp.exit_code :
    typeof resp.exitCode === "number" ? resp.exitCode :
    typeof resp.code === "number" ? resp.code :
    null;

  // If we have exit info and it's non-zero, skip. If we don't have it, we still
  // proceed — the HEAD commit check below will confirm whether a new commit landed.
  if (exitCode !== null && exitCode !== 0) process.exit(0);

  // Find repo root — prefer event cwd if provided, else start from known path
  const cwd = event.cwd || event.working_directory || "H:/prism";
  const repoRoot = findRepoRoot(cwd) || findRepoRoot("H:/prism") || "H:/prism";

  const head = getHeadCommit(repoRoot);
  if (!head || !head.hash || !head.subject) process.exit(0);

  const match = head.subject.match(ROADMAP_TAG_RE);
  if (!match) {
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "roadmap-completion-logger",
      event: "no-roadmap-tag",
      commit: head.hash.slice(0, 8),
      subject: head.subject.slice(0, 80),
    });
    process.exit(0);
  }

  const fullTag = match[1]; // e.g., "CPP-MS4-S10/U-CPP30" or "PP-CST"
  const [milestone, unit] = fullTag.split("/");
  const filesChanged = countFilesChanged(repoRoot, head.hash);

  const entry = {
    ts: new Date().toISOString(),
    commit_hash: head.hash,
    commit_epoch: head.epoch,
    milestone_id: milestone || null,
    unit_id: unit || null,
    full_tag: fullTag,
    subject: head.subject,
    files_changed: filesChanged,
    repo_root: repoRoot,
    session_id: event.session_id || event.sessionId || null,
  };

  const queuePath = pickQueuePath();
  if (!queuePath) process.exit(0);

  const appended = await appendQueue(queuePath, entry);
  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "roadmap-completion-logger",
    event: appended ? "queued" : "queue-failed",
    milestone_id: milestone || null,
    unit_id: unit || null,
    commit: head.hash.slice(0, 8),
  });

  process.exit(0);
}

main().catch(() => process.exit(0));
