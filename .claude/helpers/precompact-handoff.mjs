#!/usr/bin/env node
/**
 * precompact-handoff.mjs — Smart PreCompact Handoff Writer
 *
 * Replaces the old dumb PreCompact hook that hardcoded a useless RESUME.
 *
 * Logic:
 *   1. Check if a recent handoff exists for this terminal with a meaningful RESUME
 *      (written by /precompact within the last 5 minutes) → preserve it
 *   2. If no meaningful RESUME exists, generate one from:
 *      - CURRENT_POSITION.md (current phase/milestone)
 *      - Recent git commits (what was done this session)
 *      - Session summary if available
 *   3. Write the handoff via per-agent-handoff.mjs write
 *
 * Usage (from settings.json PreCompact hook):
 *   node precompact-handoff.mjs --terminal "${PRISM_TERMINAL:-auto-$(echo $PPID)}"
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { inferAgentIdentity } from "./agent-identity.mjs";
import { deriveSessionTopic } from "./derive-session-topic.mjs";
import { resolveWorktreeCwd } from "./resolve-worktree-cwd.mjs";

const HANDOFFS_DIR = path.resolve("H:/prism/state/shared/handoffs");
const SESSION_ID_FILE = path.join(HANDOFFS_DIR, ".current-session-ids.json");
const POSITION_FILE = path.resolve("H:/prism/state/CURRENT_POSITION.md");
const PRISM_ROOT = path.resolve("H:/prism");
// Worktree CWD for this session — resolved once per invocation. Eliminates the
// recurring handoff-clobber bug where every chat's RESUME directive ended up
// reading H:/prism's commit log instead of its own worktree's commit log.
let WORKTREE_CWD = PRISM_ROOT; // initialized in main() once session_id is known

// Known placeholder RESUME strings that are useless for auto-continue
const PLACEHOLDER_RESUMES = [
  "compacting — read per-agent handoff on restore",
  "compacting — read per-agent handoff on restore.",
  "Check git log and roadmap for next steps.",
  "true",
  "unknown",
  "",
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function getSessionId(terminalName) {
  try {
    const ids = JSON.parse(fs.readFileSync(SESSION_ID_FILE, "utf-8"));
    return ids[terminalName] ?? null;
  } catch {
    return null;
  }
}

function sanitizeFilename(instance) {
  return instance.replace(/[^a-zA-Z0-9._@-]/g, "_").replace(/_+/g, "_");
}

function handoffPath(instance) {
  return path.join(HANDOFFS_DIR, `HANDOFF-${sanitizeFilename(instance)}.md`);
}

function runGit(args) {
  // CRITICAL: cwd must be the worktree (e.g. H:/prism-engine-wire-ms0), NOT
  // H:/prism, otherwise generateSmartResume() reads peer chats' commits and
  // every chat's RESUME directive becomes wrong. Resolved in main().
  const result = spawnSync("git", args, {
    cwd: WORKTREE_CWD,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0 ? (result.stdout ?? "").trim() : "";
}

/**
 * Check if an existing handoff has a meaningful (non-placeholder) RESUME
 * that was written recently (within freshnessMinutes).
 */
function getExistingResume(instance, freshnessMinutes = 5) {
  const filePath = handoffPath(instance);
  try {
    const stat = fs.statSync(filePath);
    const ageMin = (Date.now() - stat.mtimeMs) / 60_000;
    if (ageMin > freshnessMinutes) return null;

    const content = fs.readFileSync(filePath, "utf-8");
    const resumeMatch = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
    const resume = resumeMatch?.[1]?.trim() || "";

    if (PLACEHOLDER_RESUMES.includes(resume.toLowerCase().trim())) {
      return null;
    }
    if (resume.length < 15) {
      return null; // Too short to be meaningful
    }

    return resume;
  } catch {
    return null;
  }
}

/**
 * Generate a meaningful RESUME from available state when none exists.
 * Reads CURRENT_POSITION.md, recent git log, and session summary.
 */
const ROADMAP_INDEX_PATH = path.resolve("H:/prism/mcp-server/data/roadmap-index.json");

/**
 * Find this terminal's claimed milestone from roadmap-index.json.
 * Uses hostname + PID matching against claimed_by fields.
 */
function findMyClaim(identity) {
  try {
    const raw = fs.readFileSync(ROADMAP_INDEX_PATH, "utf-8");
    const ri = JSON.parse(raw);
    const milestones = ri.milestones || [];

    // Try matching claimed_by against our identity
    const matchPatterns = [
      identity.instance,
      identity.sessionKey ? `pid-${identity.sessionKey}` : null,
      identity.machine ? identity.machine : null,
    ].filter(Boolean);

    for (const ms of milestones) {
      if (!ms.claimed_by) continue;
      for (const pattern of matchPatterns) {
        if (ms.claimed_by.includes(pattern)) {
          return { id: ms.id, title: ms.title, claimed_by: ms.claimed_by };
        }
      }
    }

    // Also collect other claims for collision warning
    const otherClaims = milestones
      .filter(m => m.claimed_by)
      .map(m => m.id);

    return { id: null, otherClaims };
  } catch {
    return { id: null, otherClaims: [] };
  }
}

/**
 * Get roadmap progress summary for handoff context.
 */
function getRoadmapSummary() {
  try {
    const raw = fs.readFileSync(ROADMAP_INDEX_PATH, "utf-8");
    const ri = JSON.parse(raw);
    const ms = ri.milestones || [];
    const complete = ms.filter(m => m.status === "complete").length;
    const completedIds = new Set(ms.filter(m => m.status === "complete").map(m => m.id));
    const available = ms
      .filter(m => m.status === "not_started" && !m.claimed_by &&
        (m.dependencies || []).every(d => completedIds.has(d)))
      .slice(0, 3)
      .map(m => m.id);
    return `${ms.length} ms, ${complete} done. Next: ${available.join(", ") || "none"}`;
  } catch {
    return "";
  }
}


/**
 * Extract a topic slug from recent git commits or CURRENT_POSITION.md.
 * Used to name handoff files (e.g., HANDOFF-claude-xxx-cam-exhaust-ms0.md).
 */
function extractTopicSlug() {
  // 1. Try extracting from most recent commit message scope
  const recentCommit = runGit(["log", "--oneline", "-1", "--format=%s"]);
  if (recentCommit) {
    // Match [CAM-EXHAUST-MS0/...] or [MAIN] CAM-EXHAUST-MS0/...
    const scopeMatch = recentCommit.match(/\[(?:MAIN\]\s*)?([A-Z][\w-]+-MS\d+)/i);
    if (scopeMatch?.[1]) {
      return scopeMatch[1].toLowerCase();
    }
    // Match standalone milestone at start: CAM-EXHAUST-MS0/U-...
    const msMatch = recentCommit.match(/^([A-Z][\w-]+-MS\d+)/i);
    if (msMatch?.[1]) {
      return msMatch[1].toLowerCase();
    }
  }

  // 2. Fall back to CURRENT_POSITION.md milestone
  try {
    const position = fs.readFileSync(POSITION_FILE, "utf-8");
    const msMatch = position.match(/(?:Last\s+Milestone|Current|##)\s*:?\s*([A-Z][\w-]+-MS\d+)/i);
    if (msMatch?.[1]) {
      return msMatch[1].toLowerCase();
    }
  } catch {
    // Position file unavailable
  }

  // 3. Fall back to current git branch last segment (work/cam-exhaust-ms0 -> cam-exhaust-ms0).
  // Skips main/master/develop so chats on a default branch dont share one slug.
  const branch = runGit(["symbolic-ref", "--short", "HEAD"]);
  if (branch) {
    const last = branch.split("/").pop();
    if (last && last !== "main" && last !== "master" && last !== "develop") {
      return last.toLowerCase();
    }
  }

  return null;
}

function generateSmartResume(identity) {
  const parts = [];

  // 0. CRITICAL: Check for claimed milestone in roadmap-index.json
  const claim = findMyClaim(identity || {});
  if (claim.id) {
    parts.push(`CONTINUE YOUR CLAIMED MILESTONE: ${claim.id} (${claim.title})`);
    parts.push(`Use: prism_orchestrate:roadmap_next_batch { milestone_id: "${claim.id}" }`);
  }

  // Warn about other claims to prevent collision
  if (claim.otherClaims && claim.otherClaims.length > 0) {
    const others = claim.otherClaims.filter(id => id !== claim.id);
    if (others.length > 0) {
      parts.push(`DO NOT work on: ${others.slice(0, 5).join(", ")} (claimed by other terminals)`);
    }
  }

  // 1. Extract current phase from CURRENT_POSITION.md
  try {
    const position = fs.readFileSync(POSITION_FILE, "utf-8");
    const phaseMatch = position.match(/\*\*Phase:\*\*\s*(.+)/);
    if (phaseMatch?.[1]) {
      parts.push(`Phase: ${phaseMatch[1].trim()}`);
    }
    // Extract in-progress milestones (if no claim found above)
    if (!claim.id) {
      const inProgressLines = position.split(/\r?\n/).filter(
        (line) => line.includes("in progress") || line.includes("in_progress")
      );
      if (inProgressLines.length > 0) {
        const milestoneIds = [];
        for (const line of inProgressLines.slice(0, 3)) {
          const idMatch = line.match(/\b([A-Z][\w-]+-MS\w+)/);
          if (idMatch) milestoneIds.push(idMatch[1]);
        }
        if (milestoneIds.length > 0) {
          parts.push(`In-progress: ${milestoneIds.join(", ")}`);
        }
      }
    }
  } catch {
    // Position file unavailable
  }

  // 2. Recent git commits (last 8 hours) for session context
  const recentCommits = runGit(["log", "--oneline", "-3", "--since=8 hours ago"]);
  if (recentCommits) {
    const firstLine = recentCommits.split("\n")[0];
    parts.push(`Last work: ${firstLine}`);
  }

  // 3. Roadmap progress summary
  const roadmapSummary = getRoadmapSummary();
  if (roadmapSummary) parts.push(`Roadmap: ${roadmapSummary}`);

  // 4. Session summary if available
  try {
    const summaryPath = path.resolve("H:/prism/.claude/helpers/.session-summary.md");
    const summary = fs.readFileSync(summaryPath, "utf-8");
    const workMatch = summary.match(/## Work Done[\s\S]*?\n([\s\S]*?)(?=\n##|\n$)/);
    if (workMatch?.[1]?.trim()) {
      const workLine = workMatch[1].trim().split("\n")[0];
      if (workLine.length > 10) {
        parts.push(`Session: ${workLine}`);
      }
    }
  } catch {
    // No session summary
  }

  if (parts.length === 0) {
    const anyCommits = runGit(["log", "--oneline", "-1"]);
    if (anyCommits) {
      return `Read git log and roadmap-index.json to determine next work. Last commit: ${anyCommits}. AI: Use DuplicationGuardEngine before creating, PRISMCreativeReasoningEngine for hybrid solutions.`;
    }
    return "Read roadmap-index.json and claim an available milestone before starting work. AI: Use DuplicationGuardEngine before creating, PRISMCreativeReasoningEngine for hybrid solutions.";
  }

  // Append AI utilization reminder
  parts.push("AI: Check DuplicationGuardEngine before creating. Use PRISMCreativeReasoningEngine.explore('optimal') for hybrid solutions");

  return parts.join(". ");
}

function resolveTerminalFromHookStdinOrHelper() {
  // (1) Claude Code's PreCompact hook pipes JSON with session_id on stdin.
  //     Use that directly — it's the most stable anchor and survives /compact.
  //     Capture the FULL session_id so we can also resolve the worktree CWD.
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf-8");
      if (raw && raw.trim().startsWith("{")) {
        const j = JSON.parse(raw);
        const sid = j?.session_id || j?.sessionId;
        if (typeof sid === "string" && sid.length >= 8) {
          // Side-effect: resolve worktree CWD for runGit calls. Must happen
          // before any runGit invocation (smart resume / topic extraction).
          WORKTREE_CWD = resolveWorktreeCwd(sid);
          return `claude-${sid.slice(0, 8)}`;
        }
      }
    }
  } catch { /* ignore */ }
  // (2) Fall back to the stable-session-id helper (uses transcript-file
  //     exact match after the 2026-04-23 fix).
  try {
    const r = spawnSync(process.execPath, [path.resolve("H:/prism/.claude/helpers/stable-session-id.mjs")], {
      encoding: "utf-8", timeout: 2000,
    });
    const id = (r.stdout || "").trim();
    if (id) {
      // No full UUID available — try resolving worktree by 8-char prefix
      WORKTREE_CWD = resolveWorktreeCwd(id.replace(/^claude-/, ""));
      return id;
    }
  } catch { /* ignore */ }
  // (3) No session_id resolved — last resort: process.cwd() if it looks like
  //     a worktree, else PRISM_ROOT. resolveWorktreeCwd handles this fallback.
  WORKTREE_CWD = resolveWorktreeCwd(null);
  return null;
}

function main() {
  const args = parseArgs(process.argv);

  // Resolve terminal so we can check whether the live chat already wrote a
  // handoff in the last few minutes. Read-only — the hook never writes.
  if (!args.terminal) {
    const autoTerminal = resolveTerminalFromHookStdinOrHelper();
    if (autoTerminal) args.terminal = autoTerminal;
  }
  let identity;
  if (args.terminal) {
    const session = getSessionId(args.terminal);
    if (session) {
      identity = {
        family: session.family,
        machine: process.env.COMPUTERNAME || "machine",
        sessionKey: session.terminal,
        instance: session.id,
      };
    }
  }
  if (!identity) {
    identity = inferAgentIdentity({ agent: args.agent, family: args.agentFamily });
  }

  // BANNED FROM WRITING (2026-05-06).
  // Per-agent handoffs may be written ONLY by the live Claude chat. Hooks
  // (this one, formerly the PreCompact auto-writer) and subagents produced
  // generic stubs ("Pre-compact snapshot (RESUME generated)") that overwrote
  // the meaningful RESUME directives the live chat had crafted. The live chat
  // is the only context with enough information to write a useful resume —
  // it has the conversation history, the in-flight task, the precise next
  // step. The /precompact and /handoff skills now pass --source live-chat
  // when invoking per-agent-handoff.mjs write, and any non-live-chat write
  // is rejected with error: "writer_banned".
  //
  // This hook now ONLY emits a systemMessage:
  //   - If the live chat wrote a handoff in the last 5 minutes (via
  //     /precompact), reassure that resume is preserved.
  //   - Else, remind the user to run /precompact BEFORE /compact so the
  //     next session has a useful RESUME directive.
  const existing = getExistingResume(identity.instance, 5);
  const msg = existing
    ? `precompact: handoff write skipped (BANNED for hooks). Live-chat /precompact RESUME (${existing.slice(0, 80).replace(/"/g, '\\"')}...) is preserved.`
    : `precompact: handoff write skipped (BANNED for hooks). No fresh /precompact RESUME found — run /precompact in the live chat BEFORE /compact so the next session has a real RESUME directive.`;

  console.log(JSON.stringify({ continue: true, systemMessage: msg }));
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
