#!/usr/bin/env node
// tier: T4
/**
 * stop-mark-completed-tasks.mjs — Stop hook
 *
 * Problem: chats claim a roadmap unit, do the work, commit it, but the
 *   claim.json is never flipped from "in_progress" to "completed". On the
 *   next session, the unit looks still-in-flight and may get re-claimed or
 *   re-executed.
 *
 * Fix: at Stop, scan every claim owned by this session. If a recent git
 *   commit (HEAD..HEAD~20) on the current branch mentions the unit_id in
 *   its subject, mark the claim `status: "completed"`, stamp the commit
 *   sha, and leave it for the next session to archive. Claims with no
 *   matching commit are left alone (claim-registry-release.mjs handles
 *   the abandon/release path separately).
 *
 * Identity is resolved via stable-session-id.mjs — same anchor used by
 * per-agent-handoff.mjs so the two stay in sync. If the session id can't
 * be resolved (e.g. helper missing), the hook does nothing and exits 0.
 *
 * continueOnError: true — never block user exit.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CLAIMS_ROOT = "H:/prism/mcp-server/data/claims";
const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
const NODE_BIN = process.execPath; // Use the Node that launched this hook (portable-node) — `node` may not be on PATH
const GIT_LOOKBACK = 20;
const DRY_RUN = process.env.PRISM_STOP_MARK_DRY_RUN === "1";

function sessionId() {
  try {
    const r = spawnSync(NODE_BIN, [STABLE_ID_HELPER], { windowsHide: true, encoding: "utf-8", timeout: 2000 });
    const id = (r.stdout || "").trim();
    return id || null;
  } catch {
    return null;
  }
}

function recentCommits() {
  try {
    const r = spawnSync("git", ["log", `-n${GIT_LOOKBACK}`, "--pretty=format:%H%x09%s"], { windowsHide: true,
      encoding: "utf-8",
      timeout: 3000,
      cwd: process.cwd(),
    });
    if (r.status !== 0) return [];
    return (r.stdout || "").split("\n").filter(Boolean).map((line) => {
      const [sha, ...subj] = line.split("\t");
      return { sha, subject: subj.join("\t") };
    });
  } catch {
    return [];
  }
}

function findCompletingCommit(unitId, commits) {
  if (!unitId) return null;
  const needle = unitId.toUpperCase();
  for (const c of commits) {
    if (c.subject && c.subject.toUpperCase().includes(needle)) return c;
  }
  return null;
}

function readClaim(unitDir) {
  const p = path.join(CLAIMS_ROOT, unitDir, "claim.json");
  try { return { path: p, data: JSON.parse(fs.readFileSync(p, "utf-8")) }; }
  catch { return null; }
}

function writeClaim(p, data) {
  if (DRY_RUN) return;
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
  fs.renameSync(tmp, p);
}

function main() {
  if (!fs.existsSync(CLAIMS_ROOT)) { process.exit(0); return; }
  const sid = sessionId();
  if (!sid) { process.exit(0); return; }

  const commits = recentCommits();
  if (commits.length === 0) { process.exit(0); return; }

  const marked = [];
  for (const unitDir of fs.readdirSync(CLAIMS_ROOT)) {
    const entry = readClaim(unitDir);
    if (!entry) continue;
    const claim = entry.data;
    if (claim.status === "completed") continue;
    // Only touch claims this session actually owns
    const owner = String(claim.claimed_by || claim.holder || claim.by || "");
    if (!owner || !owner.includes(sid)) continue;

    const unitId = claim.unit_id || claim.unitId || unitDir;
    const commit = findCompletingCommit(unitId, commits);
    if (!commit) continue;

    const updated = {
      ...claim,
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: sid,
      completed_commit: commit.sha,
      completed_commit_subject: commit.subject,
    };
    writeClaim(entry.path, updated);
    marked.push({ unit: unitId, sha: commit.sha.slice(0, 8) });
  }

  if (marked.length > 0) {
    process.stdout.write(
      `stop-mark-completed: ${marked.length} claim(s) → completed ` +
      marked.map((m) => `${m.unit}@${m.sha}`).join(", ") +
      (DRY_RUN ? " (dry-run)" : "") + "\n"
    );
  }
  process.exit(0);
}

try { main(); } catch { process.exit(0); }
