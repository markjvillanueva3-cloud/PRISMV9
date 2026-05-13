#!/usr/bin/env node
// tier: T4
/**
 * enforce-handoff-topic.mjs — Stop hook
 *
 * Ensures every chat's session handoff file is suffixed with a topic so
 * concurrent chats don't end up with ambiguous topicless `HANDOFF-{id}.md`
 * files alongside topic'd `HANDOFF-{id}-{topic}.md` files for the same id.
 *
 * Topic derivation order (fall through):
 *   1. Most recent commit's scope, e.g. [CAM-EXHAUST-MS0/...] → "cam-exhaust-ms0"
 *   2. CURRENT_POSITION.md milestone marker
 *   3. Last segment of git branch (work/cam-exhaust-ms0 → "cam-exhaust-ms0")
 *
 * Behavior on Stop:
 *   - Resolve session id from stdin payload OR stable-session-id.mjs
 *   - Locate HANDOFF-{id}.md (topicless) for this session
 *   - If a topic'd sibling already exists: keep newer by mtime, remove the loser
 *   - Otherwise: atomically rename HANDOFF-{id}.md → HANDOFF-{id}-{topic}.md
 *
 * Never blocks Stop. Errors emit `continue: true` with a systemMessage.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { deriveSessionTopic } from "../helpers/derive-session-topic.mjs";
import { resolveWorktreeCwd } from "../helpers/resolve-worktree-cwd.mjs";

const HANDOFFS_DIR = path.resolve("H:/prism/state/shared/handoffs");
const POSITION_FILE = path.resolve("H:/prism/state/CURRENT_POSITION.md");
const PRISM_ROOT = path.resolve("H:/prism");
const STABLE_ID_HELPER = path.resolve("H:/prism/.claude/helpers/stable-session-id.mjs");
// Worktree CWD for this Stop hook — set in resolveSessionId() once we know
// which chat's session this is. See resolve-worktree-cwd.mjs for fallback chain.
let WORKTREE_CWD = PRISM_ROOT;

function emit(systemMessage) {
  process.stdout.write(JSON.stringify({ continue: true, systemMessage: systemMessage || "" }));
  process.exit(0);
}

function readStdinJSON() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function resolveSessionId() {
  const payload = readStdinJSON();
  const sid = payload?.session_id || payload?.sessionId;
  if (typeof sid === "string" && sid.length >= 8) {
    // Side-effect: resolve worktree CWD before any runGit call so topic
    // extraction reads THIS chat's worktree, not H:/prism's stale state.
    WORKTREE_CWD = resolveWorktreeCwd(sid);
    return `claude-${sid.slice(0, 8)}`;
  }
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], {
      encoding: "utf-8", timeout: 2000, windowsHide: true,
    });
    const id = (r.stdout || "").trim();
    if (id) {
      WORKTREE_CWD = resolveWorktreeCwd(id.replace(/^claude-/, ""));
      return id;
    }
  } catch { /* ignore */ }
  WORKTREE_CWD = resolveWorktreeCwd(null);
  return null;
}

function runGit(args) {
  // cwd is the per-chat worktree (e.g. H:/prism-engine-wire-ms0), not the
  // hardcoded H:/prism that caused topic mis-attribution across worktrees.
  const r = spawnSync("git", args, {
    cwd: WORKTREE_CWD, encoding: "utf-8", windowsHide: true, timeout: 3000,
  });
  return r.status === 0 ? (r.stdout || "").trim() : "";
}

function extractTopicSlug() {
  const recent = runGit(["log", "--oneline", "-1", "--format=%s"]);
  if (recent) {
    const m1 = recent.match(/\[(?:MAIN\]\s*)?([A-Z][\w-]+-MS\d+)/i);
    if (m1?.[1]) return m1[1].toLowerCase();
    const m2 = recent.match(/^([A-Z][\w-]+-MS\d+)/i);
    if (m2?.[1]) return m2[1].toLowerCase();
  }
  try {
    const pos = fs.readFileSync(POSITION_FILE, "utf-8");
    const m = pos.match(/(?:Last\s+Milestone|Current|##)\s*:?\s*([A-Z][\w-]+-MS\d+)/i);
    if (m?.[1]) return m[1].toLowerCase();
  } catch { /* ignore */ }
  const branch = runGit(["symbolic-ref", "--short", "HEAD"]);
  if (branch) {
    const last = branch.split("/").pop();
    if (last && last !== "main" && last !== "master" && last !== "develop") {
      return last.toLowerCase();
    }
  }
  return null;
}

function sanitizeTopic(t) {
  if (!t) return null;
  const cleaned = String(t).replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 20);
  return cleaned.length > 0 ? cleaned : null;
}

function main() {
  const sessionId = resolveSessionId();
  if (!sessionId) return emit("enforce-handoff-topic: no session id resolved, skip");
  if (!fs.existsSync(HANDOFFS_DIR)) return emit("enforce-handoff-topic: handoffs dir missing");

  const topiclessName = `HANDOFF-${sessionId}.md`;
  const topiclessPath = path.join(HANDOFFS_DIR, topiclessName);

  if (!fs.existsSync(topiclessPath)) {
    return emit(`enforce-handoff-topic: ${sessionId} already topic-named or no handoff yet`);
  }

  // Prefer THIS chat's existing handoff topic / state markers over global git log
  const derived = deriveSessionTopic(sessionId);
  const topic = sanitizeTopic(derived.topic);
  if (!topic) {
    return emit(`enforce-handoff-topic: could not derive topic for ${sessionId} (on main/develop?), left as-is`);
  }

  const targetName = `HANDOFF-${sessionId}-${topic}.md`;
  const targetPath = path.join(HANDOFFS_DIR, targetName);

  if (fs.existsSync(targetPath)) {
    const srcMtime = fs.statSync(topiclessPath).mtimeMs;
    const tgtMtime = fs.statSync(targetPath).mtimeMs;
    if (srcMtime > tgtMtime) {
      const content = fs.readFileSync(topiclessPath, "utf-8");
      fs.writeFileSync(targetPath, content);
      fs.unlinkSync(topiclessPath);
      return emit(`enforce-handoff-topic: merged newer topicless into ${targetName}`);
    }
    fs.unlinkSync(topiclessPath);
    return emit(`enforce-handoff-topic: removed stale topicless; ${targetName} retained`);
  }

  fs.renameSync(topiclessPath, targetPath);
  return emit(`enforce-handoff-topic: ${topiclessName} → ${targetName}`);
}

try { main(); } catch (e) {
  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: `enforce-handoff-topic ERROR: ${String(e).slice(0, 150)}`,
  }));
}
