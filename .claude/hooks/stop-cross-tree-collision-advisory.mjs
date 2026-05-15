#!/usr/bin/env node
// tier: T3
/**
 * stop-cross-tree-collision-advisory.mjs — Stop hook (T3, non-blocking)
 *
 * The shared-tree commit-collision pattern (observed multiple times across
 * 2026-05-12 to 2026-05-15): N concurrent chats all sit in H:/prism on
 * cad-fusion-live-ms0 and commit. Their commit subjects say different
 * scopes ([CHECKIN-UPGRADE], [INTEL-OLLAMA-OBSIDIAN], [HOOK-SYNERGY], …)
 * but the STAGED FILES from peer chats get absorbed into whoever lands
 * the next commit. Commit subjects end up misleading; artifacts are
 * correct but attribution is wrong.
 *
 * This hook fires on Stop and:
 *   1. Confirms the chat is in H:/prism (the main tree)
 *   2. Inspects `git worktree list` for a sibling worktree whose branch
 *      basename matches this chat's `topic` (from chat-slots.json)
 *   3. If a matching sibling exists → emit a one-line advisory pointing
 *      to it, with the exact `git worktree add` command to migrate
 *
 * Non-blocking. Once per session via marker. Soft nudge only.
 *
 * Adopted 2026-05-15 per user directive: "we also need to address all
 * chats still commiting each others work and to work trees that aren't
 * named to the relevant task." Pairs with worktree-commit-route.mjs
 * (default-OFF, opt-in via PRISM_WORKTREE_ROUTE_ENABLE=1) as the lighter
 * pre-arm advisory.
 *
 * Knobs:
 *   PRISM_CROSS_TREE_ADVISORY_DISABLE=1  — off entirely
 *   PRISM_CROSS_TREE_ADVISORY_TTL_MS=N   — nag cooldown (default 4h)
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = "H:/prism";
const SLOTS_FILE = "H:/prism/state/shared/chat-slots.json";
const MARKER_DIR = "H:/prism/.claude/cache";
const MARKER_PREFIX = "cross-tree-advisory-";
const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000;
const SILENCE = { continue: true, suppressOutput: true };

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function markerPath(sid) {
  const safe = String(sid || "global").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  return path.join(MARKER_DIR, `${MARKER_PREFIX}${safe}.marker`);
}

function alreadyNagged(sid) {
  try {
    const p = markerPath(sid);
    if (!fs.existsSync(p)) return false;
    const ttl = Number(process.env.PRISM_CROSS_TREE_ADVISORY_TTL_MS) || DEFAULT_TTL_MS;
    return (Date.now() - fs.statSync(p).mtimeMs) < ttl;
  } catch { return false; }
}

function markNagged(sid) {
  try {
    if (!fs.existsSync(MARKER_DIR)) fs.mkdirSync(MARKER_DIR, { recursive: true });
    fs.writeFileSync(markerPath(sid), new Date().toISOString());
  } catch {}
}

function getCwd() {
  try { return process.cwd().replace(/\\/g, "/"); } catch { return ""; }
}

function isInMainTree() {
  // We're "in main tree" if cwd is exactly H:/prism (not a sibling worktree
  // like H:/prism-cam-exhaust-ms0).
  const cwd = getCwd().toLowerCase();
  return cwd === REPO_ROOT.toLowerCase();
}

function readSlotForChat(chatId) {
  try {
    if (!fs.existsSync(SLOTS_FILE)) return null;
    const slots = JSON.parse(fs.readFileSync(SLOTS_FILE, "utf-8"));
    for (const [slotName, slot] of Object.entries(slots.slots || {})) {
      if (slot && slot.chatId === chatId) {
        return { slot: slotName, topic: slot.topic, branch: slot.branch };
      }
    }
    return null;
  } catch { return null; }
}

function getWorktreeList() {
  try {
    const r = spawnSync("git", ["-C", REPO_ROOT, "worktree", "list", "--porcelain"], {
      encoding: "utf-8", timeout: 3000, windowsHide: true,
    });
    if (r.status !== 0) return [];
    const blocks = r.stdout.split(/\n\n+/);
    const wts = [];
    for (const block of blocks) {
      const pathLine = block.match(/^worktree\s+(.+)$/m);
      const branchLine = block.match(/^branch\s+refs\/heads\/(.+)$/m);
      if (pathLine && branchLine) {
        wts.push({ path: pathLine[1].trim(), branch: branchLine[1].trim() });
      }
    }
    return wts;
  } catch { return []; }
}

/**
 * Find a sibling worktree whose branch (e.g. "work/checkin-upgrade") contains
 * the chat's topic ("checkin-upgrade") OR vice versa. Substring + case-
 * insensitive, same heuristic as worktree-commit-route.mjs.
 */
function findMatchingWorktree(topic, worktrees) {
  if (!topic || topic.length < 3) return null;
  const t = topic.toLowerCase();
  for (const wt of worktrees) {
    const branchLeaf = wt.branch.split("/").pop().toLowerCase();
    if (branchLeaf === t || branchLeaf.includes(t) || t.includes(branchLeaf)) {
      if (wt.path.toLowerCase() !== REPO_ROOT.toLowerCase()) {
        return wt;
      }
    }
  }
  return null;
}

function hasUncommittedCriticalFiles() {
  try {
    const r = spawnSync("git", ["-C", REPO_ROOT, "status", "--porcelain"], {
      encoding: "utf-8", timeout: 3000, windowsHide: true,
    });
    if (r.status !== 0) return false;
    const lines = r.stdout.split("\n").filter(l => l.trim());
    const criticalPatterns = [
      /mcp-server\/src\/engines\//,
      /mcp-server\/src\/tools\/dispatchers\//,
      /mcp-server\/src\/schemas\//,
      /\.claude\/hooks\//,
      /\.claude\/helpers\//,
      /\.claude\/commands\//,
    ];
    for (const line of lines) {
      // Status format: "XY filename" where XY is two-char status
      const filename = line.slice(3).trim();
      if (criticalPatterns.some(p => p.test(filename))) return true;
    }
    return false;
  } catch { return false; }
}

function main() {
  if (process.env.PRISM_CROSS_TREE_ADVISORY_DISABLE === "1") { emit(SILENCE); return; }
  const stdin = readStdin() || {};
  const sid = stdin.session_id || "global";
  if (alreadyNagged(sid)) { emit(SILENCE); return; }

  // Only relevant when sitting in the shared main tree
  if (!isInMainTree()) { emit(SILENCE); return; }

  const chatId = sid.length >= 8 ? `claude-${sid.replace(/[^0-9a-f]/gi, "").slice(0, 8).toLowerCase()}` : null;
  if (!chatId) { emit(SILENCE); return; }

  const slot = readSlotForChat(chatId);
  if (!slot || !slot.topic) { emit(SILENCE); return; }

  // Only nag when there's actual cross-tree-collision risk: critical files dirty
  if (!hasUncommittedCriticalFiles()) { emit(SILENCE); return; }

  const worktrees = getWorktreeList();
  const match = findMatchingWorktree(slot.topic, worktrees);
  if (!match) { emit(SILENCE); return; }

  markNagged(sid);
  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: [
        `## 🔀 Cross-tree commit-collision risk — sibling worktree available`,
        ``,
        `Slot **${slot.slot}** (topic \`${slot.topic}\`) is sitting in the shared main tree (H:/prism).`,
        `Critical files are dirty AND a sibling worktree matches your topic:`,
        ``,
        `  • **${match.path}** on branch \`${match.branch}\``,
        ``,
        `Other chats committing to H:/prism right now risk absorbing your staged files into their commits (observed pattern, see [[feedback_conflict_fork_rule]]). To migrate:`,
        ``,
        `\`\`\`bash`,
        `cd "${match.path}"`,
        `git stash apply (or move via cherry-pick from H:/prism)`,
        `# ship from the dedicated tree`,
        `\`\`\``,
        ``,
        `Silenced this session. Disable: \`PRISM_CROSS_TREE_ADVISORY_DISABLE=1\``,
      ].join("\n"),
    },
  });
}

try { main(); } catch { emit(SILENCE); }
