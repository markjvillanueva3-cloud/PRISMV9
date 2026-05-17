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
import { lastKnownSlotForChat as _lastKnownSlotForChat } from "./slot-identity-cache.mjs";

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

  // 2026-05-15: AUTO-WRITE under strict gates (user directive: "make compact
  // slash command auto generate the precompact"). Per-agent-handoff.mjs now
  // accepts --source precompact-hook IF resume passes validation and no fresh
  // live-chat handoff exists. We never clobber a real /precompact RESUME.
  const existing = getExistingResume(identity.instance, 5);
  if (existing) {
    const msg = `precompact: live-chat /precompact RESUME preserved (${existing.slice(0, 80).replace(/"/g, '\\"')}...)`;
    console.log(JSON.stringify({ continue: true, systemMessage: msg }));
    return;
  }

  // Synthesize a real RESUME from session state (already does heavy lifting)
  const synthesized = generateSmartResume(identity);
  if (!synthesized || synthesized.length < 30) {
    const msg = `precompact: handoff auto-write skipped — synthesized RESUME too short (${synthesized?.length ?? 0} chars). Run /precompact in live chat for a real directive.`;
    console.log(JSON.stringify({ continue: true, systemMessage: msg }));
    return;
  }

  // Slot-prefix the topic — coincides with /checkin slot binding per user
  // directive "precompact session handoffs coincide with checkin slots".
  // Slot lookup: chat-slots.json keyed by chatId.
  let slotPrefix = "";
  try {
    const slotsFile = path.resolve("H:/prism/state/shared/chat-slots.json");
    if (fs.existsSync(slotsFile)) {
      const slots = JSON.parse(fs.readFileSync(slotsFile, "utf-8"));
      for (const [slotName, slot] of Object.entries(slots.slots || {})) {
        if (slot && slot.chatId === identity.instance) {
          slotPrefix = slotName;
          break;
        }
      }
    }
  } catch { /* best-effort */ }
  // SLOT-DRIFT-FIX-MS0/U-SDF13 (2026-05-17): sticky-cache fallback. The
  // chat-slots.json lookup above is EPHEMERAL — heartbeat expiry, peer
  // force-takeover, or reclaim() can wipe this chat's entry BEFORE the
  // precompact writer runs. Live failure mode observed 2026-05-17:
  // chatId `claude-339c8ff7` drifted bravo → bravo → charlie → delta →
  // unbound across handoffs with the same chatId, because precompact
  // reads happened when the slot had already lapsed. The sticky cache
  // (`state/shared/chat-slot-history/<chatId>.json`) is written on every
  // successful claim and persists past eviction — read it as the final
  // fallback so the handoff frontmatter carries `slot:` even when the
  // live slot binding is gone.
  if (!slotPrefix) {
    try {
      const recovered = _lastKnownSlotForChat(identity.instance);
      if (recovered) slotPrefix = recovered;
    } catch { /* best-effort */ }
  }

  const baseTopic = extractTopicSlug() || "session";
  const finalTopic = slotPrefix ? `${slotPrefix}-${baseTopic}` : baseTopic;

  // Write via per-agent-handoff.mjs with the new strictly-gated source.
  // CRITICAL: spawn with process.execPath, NOT bare "node". Under portable-node
  // (process.execPath = H:\Tools\nodejs\node.exe, but `node` is NOT on the
  // PreCompact hook child's PATH) bare spawnSync("node",...) returns ENOENT with
  // stdout=undefined, which the parser below silently froze at "(no output)" —
  // every /compact no-op'd the handoff write. (Same fix already applied in the
  // line-337 terminal-resolver spawn + precompact-hook-source.test.mjs:28.)
  // SLOT-DRIFT-FIX-MS0/U-SDF05 (2026-05-17): pass --slot when slotPrefix is
  // known. The writer's chat-slots.json lookup races against transient gaps
  // (slot binding lapsed between heartbeat-expiry and re-claim) — by passing
  // the explicit --slot we sourced from the live chat-slots.json read above
  // (line ~405), the writer's frontmatter always carries the binding even
  // when its own re-lookup would miss. Closes the silent-drift class.
  const writerPath = path.resolve("H:/prism/.claude/helpers/per-agent-handoff.mjs");
  const writerArgs = [
    writerPath, "write",
    "--source", "precompact-hook",
    "--terminal", identity.instance,
    "--topic", finalTopic,
    "--resume", synthesized,
    "--state", `(precompact auto-write — slot ${slotPrefix || "unbound"})`,
  ];
  if (slotPrefix) writerArgs.push("--slot", slotPrefix);
  const writeResult = spawnSync(process.execPath, writerArgs, { encoding: "utf-8", timeout: 5000, windowsHide: true });

  let writeOk = false;
  let writeMsg = "(no output)";
  let writtenFile = null;
  if (writeResult.error) {
    // Spawn itself failed (ENOENT, EACCES, timeout-kill, ...). FAIL LOUD —
    // never let this collapse into the vague "(no output)" that hid the
    // bare-"node" ENOENT bug for an unknown number of /compact cycles.
    writeMsg = `SPAWN FAILED: ${writeResult.error.code || writeResult.error.message || "unknown"}`;
  } else {
    try {
      const out = (writeResult.stdout || "").trim();
      if (out) {
        const j = JSON.parse(out);
        writeOk = !!j.ok;
        writeMsg = j.ok ? `wrote ${j.file || "(unknown path)"}` : `rejected: ${j.rejectedBy || j.error}`;
        if (j.ok && j.file) writtenFile = j.file;
      } else {
        // Writer spawned OK but emitted nothing — still surface it loudly
        // (status + any stderr) rather than the silent init placeholder.
        const errTail = (writeResult.stderr || "").trim().slice(0, 80);
        writeMsg = `writer emitted no stdout (status=${writeResult.status}, stderr=${errTail || "empty"})`;
      }
    } catch {
      writeMsg = writeResult.stderr?.trim().slice(0, 120) || "spawn failed";
    }
  }

  // 2026-05-15: PAD-TO-FIXED-SIZE per user directive ("make the precompact
  // hook generate a session handoff the exact same size everytime"). Pads
  // the just-written handoff to PRISM_PRECOMPACT_HANDOFF_PAD_BYTES (default
  // 4096). Padding goes in an HTML comment block so it's invisible to
  // markdown renderers + /startup's RESUME parser.
  //
  // Why fixed size:
  //   - deterministic byte budget for the RESUME survival path
  //   - predictable headroom between HARD threshold and 1M context cap
  //   - audit-friendly: all auto-generated handoffs are uniform in disk usage
  //
  // Knobs:
  //   PRISM_PRECOMPACT_HANDOFF_PAD_BYTES=N  — target size (default 4096)
  //   PRISM_PRECOMPACT_HANDOFF_PAD_DISABLE=1 — skip padding entirely
  let padInfo = "no-pad";
  if (writeOk && writtenFile && process.env.PRISM_PRECOMPACT_HANDOFF_PAD_DISABLE !== "1") {
    try {
      const target = Number(process.env.PRISM_PRECOMPACT_HANDOFF_PAD_BYTES) || 4096;
      padInfo = padFileToBytes(writtenFile, target);
    } catch (e) {
      padInfo = `pad-failed: ${(e && e.message) ? e.message.slice(0, 60) : "unknown"}`;
    }
  }

  const msg = writeOk
    ? `precompact: auto-write OK (${writeMsg}, topic=${finalTopic}, ${padInfo})`
    : `precompact: auto-write attempted (${writeMsg}). Run /precompact in live chat to override.`;
  console.log(JSON.stringify({ continue: true, systemMessage: msg }));
}

/**
 * Pad a handoff file to exactly `targetBytes` by appending an HTML-comment
 * block. The comment is invisible to markdown renderers AND to the RESUME
 * extractor in /startup (which regex-matches `^## RESUME\n...`).
 *
 * Returns a short status string for logging.
 *
 * If the file is already larger than targetBytes, returns "pad-skipped-oversize".
 * If padding succeeds, returns "padded=<bytes>".
 */
export function padFileToBytes(filePath, targetBytes) {
  if (!fs.existsSync(filePath)) return "pad-skipped-missing";
  const cur = fs.statSync(filePath).size;
  if (cur >= targetBytes) return `pad-skipped-oversize(${cur})`;
  const deficit = targetBytes - cur;
  // Reserve room for the marker fence: "\n\n<!-- pad: ".length + " -->\n".length
  const fenceHead = "\n\n<!-- pad: ";
  const fenceTail = " -->\n";
  const reserved = fenceHead.length + fenceTail.length;
  if (deficit <= reserved) {
    // Too small to fit a fence — append plain spaces to hit exact target
    fs.appendFileSync(filePath, " ".repeat(Math.max(0, deficit)));
    return `padded=${deficit}-bare`;
  }
  const fillCount = deficit - reserved;
  const filler = "x".repeat(fillCount);  // 'x' is a single byte in UTF-8
  fs.appendFileSync(filePath, fenceHead + filler + fenceTail);
  const finalSize = fs.statSync(filePath).size;
  return `padded=${deficit}, final=${finalSize}`;
}

// CLI gate — only run main() when invoked directly (NOT on import). The
// import path is used by tests + by other helpers that want to reuse the
// padFileToBytes export.
const __cliArgv1 = (process.argv[1] || "").replace(/\\/g, "/");
const __cliArgv1Basename = __cliArgv1.split("/").pop() || "";
if (__cliArgv1Basename && import.meta.url.endsWith(__cliArgv1Basename)) {
  try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
}
