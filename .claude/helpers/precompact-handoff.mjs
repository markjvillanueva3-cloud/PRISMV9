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
import { SLOT_NAMES as _SLOT_NAMES } from "./chat-slots.mjs";
import { resolveSlotShared } from "../../scripts/lib/slot-resolve-shared.mjs";

// Canonical NATO slot set (Set for O(1) membership). chat-slots.mjs is the
// single source of truth + has no import-time side effects (main-guarded CLI),
// same import precedent as per-agent-handoff.mjs. Used to gate the slot-keyed
// re-entry directive so only a REAL slot yields `/startup-<slot>`.
const CANONICAL_SLOTS = new Set(_SLOT_NAMES);

const HANDOFFS_DIR = path.resolve("H:/prism/state/shared/handoffs");
const SESSION_ID_FILE = path.join(HANDOFFS_DIR, ".current-session-ids.json");
const POSITION_FILE = path.resolve("H:/prism/state/CURRENT_POSITION.md");
const LOOP_STATE_DIR = path.resolve("H:/prism/state/shared/loop-state");
const PRISM_ROOT = path.resolve("H:/prism");
// Hostile-payload caps for loop-state file reads (Synergy #2). Sister to the
// substrate-health-inject 1MB cap — the loop-state dir is shared across the
// 26-chat fleet, so a malicious or corrupt file matching this chat's 8-char
// prefix would otherwise OOM the precompact hook fleet-wide on JSON.parse.
// A real loop-state file is ~2KB; 64KB is 32× headroom for legitimate growth.
const MAX_LOOP_STATE_BYTES = 65536;
const MAX_LOOP_CANDIDATES = 10; // never read more than 10 prefix-matching files
// Worktree CWD for this session — resolved once per invocation. Eliminates the
// recurring handoff-clobber bug where every chat's RESUME directive ended up
// reading H:/prism's commit log instead of its own worktree's commit log.
let WORKTREE_CWD = PRISM_ROOT; // initialized in main() once session_id is known
// Full session UUID — captured from PreCompact stdin so generateSmartResume()
// can read the matching loop-state file. Falls back to null when no UUID is
// available (Synergy #2: precompact carries active /loop state).
// NOTE (P2 refactor): module-level mutable state is a hidden coupling between
// resolveTerminalFromHookStdinOrHelper (writer) + generateSmartResume (reader).
// Production call-order is correct (main() resolves terminal first), but a
// future cleanup should thread fullSessionId through identity instead.
let FULL_SESSION_ID = null;

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

// M1 (2026-07-03): git-runner hardening. The old spawnSync had NO maxBuffer
// (inherits Node's 1 MiB default) and NO timeout. On the shared tree `git status
// --porcelain` is ~0.9 MiB (88% of that cap) and takes tens of seconds -- an
// overflow OR timeout made spawnSync return status!=0, so runGit returned ""
// (indistinguishable from a clean tree), which captureWorkingState then read as
// a CLEAN working tree: silent-wrong STATE on the busiest tree, and a 15-35s
// synchronous block on the /compact critical path (3-of-3 scrutiny P1, arm C).
// 64 MiB eliminates the overflow; the timeout bounds the block. Both callers'
// other invocations (log/rev-parse) are tiny so the timeout never fires for them.
const GIT_TIMEOUT_MS = Number(process.env.PRISM_PRECOMPACT_GIT_TIMEOUT_MS) || 3000;
const GIT_MAX_BUFFER = 64 * 1024 * 1024;
function runGit(args) {
  // CRITICAL: cwd must be the worktree (e.g. H:/prism-engine-wire-ms0), NOT
  // H:/prism, otherwise generateSmartResume() reads peer chats' commits and
  // every chat's RESUME directive becomes wrong. Resolved in main().
  const result = spawnSync("git", args, {
    cwd: WORKTREE_CWD,
    encoding: "utf8",
    windowsHide: true,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: GIT_MAX_BUFFER,
  });
  return result.status === 0 ? (result.stdout ?? "").trim() : "";
}

/**
 * Parse ONE `git status --porcelain` line into {status, path}, or null.
 *
 * Porcelain columns are POSITION-SENSITIVE: chars 0-1 are the XY status code
 * (a leading space is significant -- ` M` = unstaged-modified, `M ` = staged),
 * char 2 is the separator, the path starts at char 3. Never pre-trim the line
 * (that would eat the leading status space and shift the path, dropping a
 * leading `.` like `.claude/`). A rename renders as `old -> new`; we keep `new`.
 */
function parsePorcelainLine(line) {
  if (!line) return null;
  // Parse tolerantly, NOT by fixed column (defensive). Match optional leading
  // space, a 1-2 char XY status field (a status char may itself be a space), the
  // separator whitespace, then the path.
  const m = line.match(/^\s*([MADRCUT?! ]{1,2})\s+(.+)$/);
  if (!m) return null;
  const status = m[1].trim() || "?";
  let rest = m[2];
  // ONLY a rename/copy (R/C) renders as `old -> new`; keep `new`. Gating on R/C
  // avoids corrupting a MODIFIED file whose name literally contains " -> "
  // (3-of-3 scrutiny P2, arm B).
  if (status === "R" || status === "C") {
    const arrow = rest.indexOf(" -> ");
    if (arrow >= 0) rest = rest.slice(arrow + 4);
  }
  rest = rest.trim();
  if (!rest) return null;
  return { status, path: rest };
}

/**
 * Parse a `git status --porcelain --branch` header ("## <branch>...") into the
 * bare local branch name. Strips the `...upstream` suffix and the
 * ` [ahead N, behind M]` suffix; handles "No commits yet on <b>" and detached
 * HEAD. Returns "" when the line is not a header.
 */
function parseBranchHeader(line) {
  if (!line || !line.startsWith("##")) return "";
  let s = line.replace(/^##\s*/, "");
  const noCommits = s.match(/^No commits yet on (.+)$/);
  if (noCommits) s = noCommits[1];
  s = s.split("...")[0];   // strip "...upstream"
  s = s.split(/\s+/)[0];   // strip " [ahead N, behind M]"
  return s.trim();
}

/**
 * M1 (MEMORY-SUBSTRATE-IMPROVEMENT-ASSESSMENT-2026-07-03, slot:bravo): capture
 * the REAL in-flight working set for the precompact handoff's `## STATE`, so a
 * compaction that fires mid-build carries "what I was doing" instead of the old
 * hardcoded boilerplate `(precompact auto-write -- slot X)`. Pure: the git
 * runner is injected (same `runGit(args)->string` contract, "" on failure) so it
 * is hermetically testable with no real git.
 *
 * Uses `git status --porcelain --branch`: the `## <branch>` header is ALWAYS
 * emitted on success, EVEN for a clean tree. That is a POSITIVE success signal
 * -- an empty result means the status command FAILED (timeout/overflow/error),
 * never a clean tree. Conflating the two made a busy tree falsely report "clean"
 * (3-of-3 scrutiny P1, arm C). Bounded: the true change count comes from line
 * length; only the first MAX_FILES lines are parsed + listed. Fail-soft: a
 * labeled "unavailable"/"unknown" line -- never empty, never a throw (Stop must
 * not fail).
 *
 * @param {(args: string[]) => string} runGitFn
 * @returns {string} multi-line STATE snapshot
 */
export function captureWorkingState(runGitFn) {
  const run = typeof runGitFn === "function" ? runGitFn : runGit;
  const status = run(["status", "--porcelain", "--branch"]);
  const lastCommit = run(["log", "-1", "--format=%s"]);

  // No `## ` header => the status command FAILED (a successful run ALWAYS emits
  // the header, even for a clean tree). NEVER infer "clean" from emptiness. R12.
  if (!status) {
    if (!lastCommit) {
      return "In-flight working state unavailable (git returned nothing -- worktree unresolved).";
    }
    return `Working set unknown (git status unavailable -- timeout/overflow/error).\nLast commit: ${lastCommit}`;
  }

  const allLines = status.split(/\r?\n/).filter((l) => l.length > 0);
  const header = allLines.find((l) => l.startsWith("##"));
  const branch = parseBranchHeader(header || "");
  const changeLines = allLines.filter((l) => !l.startsWith("##"));
  const total = changeLines.length;

  const lines = [];
  if (branch) lines.push(`Branch: ${branch}`);
  if (total === 0) {
    lines.push("Working tree clean (no uncommitted changes).");
  } else {
    const MAX_FILES = 8; // cap listed files to bound STATE size; count stays honest
    const shown = changeLines.slice(0, MAX_FILES).map(parsePorcelainLine).filter(Boolean)
      .map((e) => `${e.status} ${e.path}`).join(", ");
    const overflow = total > MAX_FILES ? ` (+${total - MAX_FILES} more)` : "";
    lines.push(`Uncommitted (${total}): ${shown}${overflow}`);
  }
  if (lastCommit) lines.push(`Last commit: ${lastCommit}`);
  return lines.join("\n");
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

/**
 * Read the active /loop-state file for a session reference.
 *
 * sessionRef may be a full UUID, a `claude-<8hex>` prefix, or null. Returns the
 * parsed state JSON if a running loop is found, null otherwise. Pure I/O: no
 * side effects beyond a single readdirSync + readFileSync per match candidate.
 *
 * Used by Synergy #2 (precompact carries active /loop state) so the
 * post-/compact chat's RESUME directive surfaces the in-flight iteration count
 * without needing to query loop-state.mjs via subprocess.
 *
 * @param {string|null} sessionRef
 * @param {{dir?: string, requireRunning?: boolean, now?: number}} [options]
 * @returns {object|null}
 */
export function readActiveLoopState(sessionRef, options = {}) {
  const dir = options.dir || LOOP_STATE_DIR;
  const requireRunning = options.requireRunning !== false; // default true
  if (!sessionRef || typeof sessionRef !== "string") return null;
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.startsWith("loop-") && f.endsWith(".json"));
  } catch {
    return null; // dir missing → no active loop
  }
  // Match by full UUID first (loop-state.mjs uses the raw sid as filename).
  // Then fall back to 8-char prefix matching for `claude-XXXXXXXX` ids.
  const trimmed = sessionRef.replace(/^claude-/, "");
  const prefix = trimmed.slice(0, 8);
  if (prefix.length < 4) return null; // refuse to match on suspiciously short refs
  // Exact-uuid match first
  const exact = files.find((f) => f === `loop-${trimmed}.json`);
  // Then prefix match (8-char window), capped to prevent DoS (P0): a hostile
  // peer that drops 50 prefix-colliding files cannot make us readFileSync all
  // 50 — we'd cap at MAX_LOOP_CANDIDATES (10).
  const candidates = exact
    ? [exact]
    : files.filter((f) => f.startsWith(`loop-${prefix}`)).slice(0, MAX_LOOP_CANDIDATES);
  if (candidates.length === 0) return null;
  // If multiple match a prefix, pick newest lastTickAt — multiple sessions
  // sharing a prefix is statistically possible across the 26-chat fleet.
  let best = null;
  for (const f of candidates) {
    try {
      const full = path.join(dir, f);
      // P0 hostile-payload guard: refuse files larger than MAX_LOOP_STATE_BYTES.
      // A real loop-state is ~2KB; a 200MB file would OOM JSON.parse fleet-wide.
      const st = fs.statSync(full);
      if (st.size > MAX_LOOP_STATE_BYTES) continue;
      const s = JSON.parse(fs.readFileSync(full, "utf-8"));
      if (requireRunning && s.status !== "running") continue;
      const lastTick = s.lastTickAt ? new Date(s.lastTickAt).getTime() : 0;
      if (!best || lastTick > best._lastTick) {
        best = { ...s, _lastTick: lastTick };
      }
    } catch {
      // malformed loop-state file or stat error — skip, don't fail
    }
  }
  if (!best) return null;
  delete best._lastTick; // internal sort key — don't leak to caller
  return best;
}

/**
 * Format a single-line RESUME hint for an active /loop state, or null if the
 * state is missing/empty/exceeds-target. Pure — no I/O. Output is a short
 * directive a post-/compact chat can act on without re-querying.
 *
 * @param {object|null} state
 * @returns {string|null}
 */
export function formatLoopResumeLine(state) {
  if (!state || typeof state !== "object") return null;
  const iter = Number.isFinite(state.iter) ? state.iter : 0;
  const target = Number.isFinite(state.target) && state.target > 0 ? state.target : null;
  const taskRaw = typeof state.task === "string" ? state.task.trim() : "";
  // R12 fail-loud: surface the unspecified-task case as a hint, don't hide it.
  // Hiding `(unspecified)` made post-/compact chats unable to tell "no task"
  // from "task lost in resume" — both rendered the same. Now they differ.
  const taskUnspecified = taskRaw === "(unspecified)" || taskRaw === "";
  const task = !taskUnspecified ? taskRaw.slice(0, 80) : null;
  const sliceCount = target == null
    ? `iter ${iter}`
    : iter >= target * 2
      ? `iter ${iter} EXCEEDED 2× target ${target}`
      : iter >= target
        ? `iter ${iter}/${target} (at-target)`
        : `iter ${iter}/${target}`;
  const prefix = `Active /loop: ${sliceCount}`;
  if (task) return `${prefix} — "${task}". RESUME via /loop`;
  if (taskUnspecified) return `${prefix} (no task on /loop start). RESUME via /loop`;
  return `${prefix}. RESUME via /loop`;
}

/**
 * Resolve THIS chat's slot binding for the handoff (read-only, fail-soft to "").
 * Two tiers mirror the inline resolution main() used to do at write-time:
 *   (1) chat-slots.json by chatId -- ephemeral, may have lapsed by precompact;
 *   (2) the sticky slot-history cache -- survives heartbeat expiry / force-take.
 * Resolved BEFORE generateSmartResume so the generated RESUME can scope its
 * git "Last work" to THIS slot's commits and emit a slot-keyed re-entry.
 */
function resolveSlotPrefix(identity) {
  let slotPrefix = "";
  try {
    const slotsFile = path.resolve("H:/prism/state/shared/chat-slots.json");
    if (fs.existsSync(slotsFile)) {
      const slots = JSON.parse(fs.readFileSync(slotsFile, "utf-8"));
      // U-SLOT-RESOLVE-UNIFY (2026-06-18): canonical shared resolver (exact
      // claude-<8hex> in SLOT_NAMES order, then lenient) instead of an inline
      // insertion-order first-match -- so the handoff is slot-keyed by the same
      // authority the slot backbone uses. identity.instance is claude-<8hex>.
      const r = resolveSlotShared(slots, { chatId: identity.instance, sessionId: identity.instance });
      if (r) slotPrefix = r.slot;
    }
  } catch { /* best-effort */ }
  if (!slotPrefix) {
    try {
      const recovered = _lastKnownSlotForChat(identity.instance);
      if (recovered) slotPrefix = recovered;
    } catch { /* best-effort */ }
  }
  return (slotPrefix || "").toLowerCase();
}

/**
 * The autonomous re-entry directive appended to every synthesized RESUME so a
 * generated handoff is NEVER a dead-end stub: the next session re-enters
 * /loop /goal (which re-reads the handoff + roadmap to pick the next unit).
 * Slot-keyed when known so `/startup-<slot>` force-claims the exact slot via
 * slot-bind-enforce. Pure -- exported for hermetic testing (R9).
 *
 * @param {string} slot canonical NATO slot, or "" when unknown
 * @returns {string}
 */
export function buildReentryDirective(slot = "") {
  const s = (slot || "").toString().trim().toLowerCase();
  // Only a CANONICAL NATO slot yields the slot-keyed `/startup-<slot>` form;
  // any garbage/unknown value degrades to the slotless directive (never emit a
  // bogus `/startup-42`). R12 -- honest about what we can force-claim.
  return CANONICAL_SLOTS.has(s)
    ? `Re-enter autonomous work: /startup-${s} /loop [10m] /goal (continue to 100% -- eval-gate each iter, never abandon mid-build; re-reads handoff + roadmap + Obsidian brain/PSN)`
    : "Re-enter autonomous work: /loop /goal (continue to 100% -- eval-gate each iter, never abandon mid-build; re-reads handoff + roadmap + Obsidian brain/PSN)";
}

function generateSmartResume(identity, slot = "") {
  const parts = [];

  // 0. CRITICAL: Check for claimed milestone in roadmap-index.json
  const claim = findMyClaim(identity || {});
  if (claim.id) {
    parts.push(`CONTINUE YOUR CLAIMED MILESTONE: ${claim.id} (${claim.title})`);
    parts.push(`Use: prism_orchestrate:roadmap_next_batch { milestone_id: "${claim.id}" }`);
  }

  // 0.5 SYNERGY #2: surface active /loop state so the post-/compact chat
  // resumes mid-iteration without needing to query loop-state.mjs. Read by
  // FULL_SESSION_ID (captured from PreCompact stdin), falls back to identity
  // hints when stdin wasn't available.
  try {
    const ref = FULL_SESSION_ID || identity?.instance || identity?.sessionKey || null;
    const loopState = readActiveLoopState(ref);
    const loopLine = formatLoopResumeLine(loopState);
    if (loopLine) parts.push(loopLine);
  } catch {
    // Loop-state surfacing is advisory — never block the handoff write on it.
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

  // 2. Recent git commits for session context. Chat-SPECIFIC when the slot is
  // known: filter to THIS slot's own commits (the subject carries a
  // `(slot:<name>)` tag) so the resume reflects what THIS chat did -- NOT a
  // peer's most-recent commit on the shared tree. That peer-commit leak was the
  // generic-stub bug the operator flagged (a hotel UI commit auto-resumed an
  // alpha verified-offload session). Fall back to the fleet-recent commit only
  // when no slot-tagged commit exists, and LABEL it so it is never mistaken for
  // this chat's work (R12 -- honest about provenance).
  let lastWork = "";
  if (slot) {
    // Anchor on the OPENING paren of the canonical slot tag `(slot:<name>` so a
    // mid-message MENTION of another slot (e.g. india's "(slot:india rescuing
    // slot:papa orphan)") never false-matches as that slot's last work -- a
    // mention is space-prefixed (` slot:papa`), the tag is paren-prefixed.
    // `(` is a literal in git's default BRE. (2026-06-10 scrutiny P2 fix.)
    const slotCommits = runGit(["log", "--oneline", "-3", "--since=24 hours ago", `--grep=(slot:${slot}`]);
    if (slotCommits) lastWork = `Last work (slot ${slot}): ${slotCommits.split("\n")[0]}`;
  }
  if (!lastWork) {
    const recentCommits = runGit(["log", "--oneline", "-1", "--since=8 hours ago"]);
    if (recentCommits) lastWork = `Last fleet commit (NOT necessarily this chat): ${recentCommits.split("\n")[0]}`;
  }
  if (lastWork) parts.push(lastWork);

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

  // The autonomous re-entry directive: makes EVERY generated resume actionable
  // (never a dead-end stub). The next session re-enters /loop /goal -- which
  // re-reads THIS handoff + the roadmap to pick the next unit -- so even a thin
  // synthesized resume continues the work instead of idling. Slot-keyed when
  // known (force-claims the exact slot via slot-bind-enforce).
  const reentry = buildReentryDirective(slot);

  if (parts.length === 0) {
    const anyCommits = runGit(["log", "--oneline", "-1"]);
    const lead = anyCommits
      ? `Read git log and roadmap-index.json to determine next work. Last fleet commit: ${anyCommits}.`
      : "Read roadmap-index.json and claim an available milestone before starting work.";
    return `${lead} ${reentry}. AI: Use DuplicationGuardEngine before creating, PRISMCreativeReasoningEngine for hybrid solutions.`;
  }

  // Append the re-entry directive + AI utilization reminder.
  parts.push(reentry);
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
          // Stash the FULL UUID so generateSmartResume's loop-state lookup
          // can match the exact loop-<uuid>.json file (Synergy #2).
          FULL_SESSION_ID = sid;
          return `claude-${sid.slice(0, 8)}`;
        }
      }
    }
  } catch { /* ignore */ }
  // (2) Fall back to the stable-session-id helper (uses transcript-file
  //     exact match after the 2026-04-23 fix).
  try {
    const r = spawnSync(process.execPath, [path.resolve("H:/prism/.claude/helpers/stable-session-id.mjs")], { windowsHide: true,
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

  // Resolve THIS chat's slot FIRST so the synthesized RESUME can scope its git
  // "Last work" to this slot's own commits + emit a slot-keyed /loop /goal
  // re-entry (instead of a peer's commit + a slotless directive).
  const slotPrefix = resolveSlotPrefix(identity);

  // Synthesize a real RESUME from session state (already does heavy lifting)
  const synthesized = generateSmartResume(identity, slotPrefix);
  if (!synthesized || synthesized.length < 30) {
    const msg = `precompact: handoff auto-write skipped — synthesized RESUME too short (${synthesized?.length ?? 0} chars). Run /precompact in live chat for a real directive.`;
    console.log(JSON.stringify({ continue: true, systemMessage: msg }));
    return;
  }

  // slotPrefix was resolved above (resolveSlotPrefix) BEFORE generateSmartResume
  // so the synthesized RESUME could be slot-scoped. It carries both tiers
  // (chat-slots.json by chatId + sticky slot-history cache, SLOT-DRIFT-FIX-MS0/
  // U-SDF13) so the handoff frontmatter gets `slot:` even when the live binding
  // has lapsed. Reused here for the topic prefix.
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
  // M1 (MEMORY-SUBSTRATE-IMPROVEMENT-ASSESSMENT-2026-07-03): replace the old
  // hardcoded boilerplate STATE with a REAL in-flight working-set snapshot
  // (branch + uncommitted/staged files + last commit) so a mid-build compaction
  // carries what this chat was actually doing across the reset. runGit already
  // resolved WORKTREE_CWD in resolveTerminalFromHookStdinOrHelper().
  const workingState = captureWorkingState(runGit);
  const stateBody = `(precompact auto-write, slot ${slotPrefix || "unbound"})\n${workingState}`;
  const writerArgs = [
    writerPath, "write",
    "--source", "precompact-hook",
    "--terminal", identity.instance,
    "--topic", finalTopic,
    "--resume", synthesized,
    "--state", stateBody,
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

  // HIGHVALUE-DISCOVERY #11a (2026-06-08, slot:alpha): enrich the precompact
  // handoff with a `## MEMORY_SEED` section BEFORE padding, so auto-compact under
  // pressure (when retention matters most) carries the distilled error/memo/tribal
  // signal — which the U-MEMORY-SEED-READER (#2) restores on the post-compact
  // resume. Without this, the Stop seed-distiller only runs at end-of-turn (Stop),
  // never on the PreCompact-written handoff that the resume actually reads. Same
  // distiller the Stop hook uses (handoff-memory-seed.mjs --file). Fail-soft: any
  // failure leaves the (already-written) RESUME-only handoff intact. Runs before
  // padding so the ≤2KB seed eats pad budget (no-seed case stays fixed-size 4096).
  // seedInfo surfaces the distill outcome in the final systemMessage (R12 fail-loud)
  // — a silent seed-distill failure would otherwise degrade retention with zero
  // signal; this matches the writer/pad convention of reporting status into `msg`.
  let seedInfo = "no-seed";
  if (writeOk && writtenFile && process.env.PRISM_PRECOMPACT_MEMORY_SEED_DISABLE !== "1") {
    try {
      const seedScript = path.resolve("H:/prism/scripts/handoff-memory-seed.mjs");
      if (fs.existsSync(seedScript)) {
        const seedRes = spawnSync(process.execPath, [seedScript, "--file", writtenFile], { encoding: "utf-8", timeout: 6000, windowsHide: true });
        seedInfo = (seedRes.status === 0 && !seedRes.error)
          ? "seeded"
          : `seed-failed(status=${seedRes.status ?? "?"}${seedRes.error ? ":" + String(seedRes.error.code || seedRes.error.message).slice(0, 40) : ""})`;
      } else {
        seedInfo = "seed-skipped-no-distiller";
      }
    } catch (e) { seedInfo = `seed-error:${(e && e.message ? e.message : "unknown").slice(0, 40)}`; }
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
    ? `precompact: auto-write OK (${writeMsg}, topic=${finalTopic}, ${seedInfo}, ${padInfo})`
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
