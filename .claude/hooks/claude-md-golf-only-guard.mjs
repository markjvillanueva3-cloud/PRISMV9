#!/usr/bin/env node
// tier: T0
/**
 * claude-md-golf-only-guard.mjs — PreToolUse T0 hook (OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF)
 *
 * Blocks Edit | Write | MultiEdit | NotebookEdit on `H:/prism/CLAUDE.md` from
 * ANY chat that is NOT the golf slot. Doctrine: CLAUDE.md is the most peer-
 * contended file in the repo; the project keeps ONE shared copy and only the
 * golf maintenance slot edits it. Work chats route regressions to the
 * `## Recent regressions` inbox; golf drains twice daily (F1 tool).
 *
 * Inverse of `.claude/hooks/golf-slot-write-allowlist.mjs` (U-CLEANUP-A5):
 *   - allowlist hook ↦ golf-slot chats are restricted to a small write surface
 *   - this hook    ↦ all NON-golf chats are blocked from CLAUDE.md
 *
 * Together they implement: "golf may edit CLAUDE.md (subject to A5 allowlist
 * which explicitly includes it), no other slot may."
 *
 * Block contract:
 *   stdin  : standard PreToolUse JSON
 *   allowed: exit 0, no stdout
 *   blocked: stdout `{"continue":false,"decision":"block","reason":"..."}`, exit 2
 *
 * Scope:
 *   - PROJECT CLAUDE.md only (`H:/prism/CLAUDE.md`). The user-global file at
 *     `H:/.claude/CLAUDE.md` is NOT guarded — it's a private operator file.
 *   - Defends `..` traversal (path.resolve → relative-vs-REPO_ROOT check).
 *   - Tolerates atomic-rename suffixes (.tmp.<pid>.<ts>, .swp, etc.).
 *
 * Path-traversal defense:
 *   target → path.resolve(target) → compare against `resolve(REPO_ROOT)/CLAUDE.md`.
 *   This defends `state/shared/../CLAUDE.md` and similar escapes.
 *
 * Bypass:
 *   PRISM_CLAUDE_MD_GUARD_BYPASS=1    → logs bypass + reason to stderr, exit 0.
 *                                       Use ONLY for explicit emergency-recovery.
 *   PRISM_CLAUDE_MD_GUARD_DISABLE=1   → disable hook entirely (silent exit 0).
 *
 * Spec: state/shared/specs/BRAVO-TASK-QUEUE-OBSIDIAN-BRAIN-FIX-2026-05-17.md
 *       (U-OBF-GOLF). Companion: golf-slot-write-allowlist.mjs (CLEANUP-MS0/A5).
 */

import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
// galaxyForSlot is a PURE function (no I/O) -- used only to name the slot's own
// galaxy file in the redirect message. Proven-safe static import (3 live hooks
// already import this module). Its use is still wrapped in try/catch below.
import { galaxyForSlot } from "../../scripts/lib/slot-galaxy-map.mjs";

// ─── Configuration ───────────────────────────────────────────────────────

const REPO_ROOT = "H:/prism";
const CLAUDE_MD_REL = "CLAUDE.md"; // canonical relative path (forward slashes)
const CHAT_SLOTS_PATH = "H:/prism/state/shared/chat-slots.json";
const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";

const BYPASS = process.env.PRISM_CLAUDE_MD_GUARD_BYPASS === "1";
const DISABLED = process.env.PRISM_CLAUDE_MD_GUARD_DISABLE === "1";

// Atomic-rename suffix tolerance: any of these may be appended to CLAUDE.md
// without bypassing the block. (E.g. CLAUDE.md.tmp.12345.6789 is still CLAUDE.md.)
const RENAME_SUFFIX_RE = /(?:\.tmp\.[0-9]+\.[0-9]+|\.tmp\.[0-9]+|\.tmp|\.swp|\.swo|~)$/;

// ─── Helpers ─────────────────────────────────────────────────────────────

function emitBlock(reason) {
  process.stdout.write(
    JSON.stringify({ continue: false, decision: "block", reason }),
  );
  process.exit(2);
}

function emitAllow() {
  process.exit(0);
}

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function getStableSessionId() {
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (r.status === 0 && r.stdout) return r.stdout.trim();
  } catch {
    // fall through
  }
  return null;
}

// Same retry pattern as golf-slot-write-allowlist.mjs — NTFS atomic-rename
// window can yield ENOENT or partial-parse JSON error within ~10ms.
function readSlotsWithRetry() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return JSON.parse(readFileSync(CHAT_SLOTS_PATH, "utf-8"));
    } catch {
      if (attempt === 0) {
        const until = Date.now() + 10;
        while (Date.now() < until) {
          /* busy-wait 10ms for rename window */
        }
      }
    }
  }
  return null;
}

/**
 * Pure id-matcher: does any candidate session id identify the golf slot owner?
 *
 * Bridges the two id systems that drifted apart in PRISM's slot stack:
 *   - slot-bind-enforce + slot-soul-inject key off the harness `session_id`
 *     (full uuid) → golf.chatId is stored as `claude-<first-8-hex>`.
 *   - the legacy strict check here keyed off stable-session-id.mjs, which
 *     derives a DIFFERENT id (terminal-window based) → never equal to the
 *     stored golf.chatId, so the guard blocked EVERY chat from CLAUDE.md.
 *
 * A candidate matches when: it equals golf.chatId exactly; its `claude-`-
 * stripped hex equals golf's; or it contains golf's hex as a substring (the
 * harness uuid `a8fd9985-f18b-...` contains the stored `a8fd9985`). For a
 * non-golf id to false-match, its uuid would have to contain golf's exact
 * 8-hex window — per-pair odds ~3e-7 — and the worst case is a recoverable,
 * peer-reviewed CLAUDE.md edit, not privilege escalation. Acceptable for a
 * doctrine gate. The substring fuzz is confined to this one path; the
 * `claude-`-strip path stays exact equality.
 */
function matchesGolfId(golfChatId, candidateIds) {
  if (typeof golfChatId !== "string" || !golfChatId) return false;
  if (!Array.isArray(candidateIds)) return false;
  const golfHex = golfChatId.replace(/^claude-/, "");
  if (golfHex.length < 6) return false; // too short to match safely
  for (const c of candidateIds) {
    if (typeof c !== "string" || !c) continue;
    if (c === golfChatId) return true;
    if (c.replace(/^claude-/, "") === golfHex) return true;
    if (c.includes(golfHex)) return true;
  }
  return false;
}

/**
 * Determine whether this chat is the golf slot owner.
 *
 * Identity is checked against TWO candidate ids: the harness `session_id`
 * passed in from the PreToolUse stdin payload (primary — the same basis
 * slot-bind-enforce uses to WRITE golf.chatId) and the derived
 * stable-session-id.mjs value (fallback for a malformed payload).
 * matchesGolfId() leniently bridges the `claude-<hex>` vs full-uuid forms.
 *
 * Any uncertainty → return false (fail-CLOSED: false→non-golf→guard ENGAGES,
 * the safer mode for a doctrine gate). INVERSE of the allowlist hook's
 * fail-open default: a false-positive here blocks a non-golf chat from
 * editing CLAUDE.md, which is the doctrine we want enforced.
 *
 * Strict-mode env knob: PRISM_CLAUDE_MD_GUARD_FAIL_OPEN=1 inverts to fail-open
 * (treat unverifiable identity as golf → allow). Use only when chat-slots.json
 * is known-broken and you NEED to push through a CLAUDE.md edit. Logged.
 */
function isGolfChat(payloadSessionId) {
  const slots = readSlotsWithRetry();
  if (!slots) {
    if (process.env.PRISM_CLAUDE_MD_GUARD_FAIL_OPEN === "1") {
      process.stderr.write(
        "[claude-md-golf-only-guard] FAIL-OPEN: chat-slots.json unreadable; treating as golf.\n",
      );
      return true;
    }
    return false;
  }
  const golf = slots?.slots?.golf;
  if (!golf || !golf.chatId) return false; // golf unclaimed → no chat is golf

  // Candidate identities, most-authoritative first. The harness session_id
  // (from the hook's own stdin payload) is the same basis slot-bind-enforce
  // uses to write golf.chatId, so it is the reliable signal; the derived
  // stable-session-id is kept as a fallback for malformed payloads.
  const candidates = [];
  if (typeof payloadSessionId === "string" && payloadSessionId) {
    candidates.push(payloadSessionId);
  }
  const stableId = getStableSessionId();
  if (stableId) candidates.push(stableId);

  if (candidates.length === 0) {
    if (process.env.PRISM_CLAUDE_MD_GUARD_FAIL_OPEN === "1") {
      process.stderr.write(
        "[claude-md-golf-only-guard] FAIL-OPEN: no session id available; treating as golf.\n",
      );
      return true;
    }
    return false;
  }
  return matchesGolfId(golf.chatId, candidates);
}

function extractFilePath(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null;
  return toolInput.file_path || toolInput.notebook_path || null;
}

/**
 * Normalize to repo-relative forward-slash path. Returns null if the path
 * escapes the repo (defends `..` traversal) — null means "not a project file,
 * don't enforce" (caller will allow).
 */
function normalizeRelativePath(filePath) {
  if (!filePath || typeof filePath !== "string") return null;
  const resolved = resolve(filePath);
  const repoResolved = resolve(REPO_ROOT);
  const rel = relative(repoResolved, resolved);
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  return rel.split(sep).join("/");
}

function stripRenameSuffix(rel) {
  return rel.replace(RENAME_SUFFIX_RE, "");
}

/**
 * Is the target THE project CLAUDE.md? Match the canonical `CLAUDE.md` at
 * repo root only — subdirectory `CLAUDE.md` files (e.g. `mcp-server/CLAUDE.md`
 * if it existed) are NOT guarded.
 */
function isProjectClaudeMd(rel) {
  if (!rel) return false;
  return stripRenameSuffix(rel) === CLAUDE_MD_REL;
}

// --- Regression-inbox-append allowance (PER-SLOT-CLAUDEMD-MS0/U-PSCM-ENFORCE) ---
// The live DOCREFLECT flow appends entries to the `## Recent regressions` /
// `## Recent shipments` inbox of main CLAUDE.md from ANY work chat -- golf drains
// them. Activating the golf-only block must NOT break that flow, so a SCOPED inbox
// edit is allowed. The block message already promised "(a) append to the inbox from
// any chat" -- this makes that promise real (previously the block contradicted it).

const MAIN_CLAUDE_MD_ABS = resolve(REPO_ROOT, CLAUDE_MD_REL);

function readMainClaudeMd() {
  try { return readFileSync(MAIN_CLAUDE_MD_ABS, "utf8"); } catch { return null; }
}

// The [start,end) ranges of every "## Recent ..." section (regressions /
// shipments). A section runs from its "## Recent " header to the NEXT "## "
// header (or EOF). CRITICAL: scoping to the SECTION (not "everything after the
// first ## Recent header") is what keeps a non-golf chat from editing the
// doctrine sections that FOLLOW the regressions inbox in the live file (WIKI
// PROTOCOL, RTK, etc. all sit after it). Returns [] if no inbox section exists.
function inboxRegions(content) {
  if (typeof content !== "string") return [];
  // EVERY column-0 "## " line ends a region. Fences are NOT honored, on purpose
  // (re-scrutiny finding): honoring ``` fences is strictly fail-OPEN in a
  // boundary gate -- an unterminated fence would swallow every following "## "
  // header, run the region to EOF, and re-expose the doctrine sections that sit
  // below the regressions inbox (a non-golf chat could poison the file with an
  // unclosed fence in an allowed append, then rewrite doctrine). The only cost
  // of ignoring fences is that a "## " INSIDE a regression bullet's code block
  // shrinks the region (over-blocks a later legit append) -- the fail-SAFE
  // direction, recoverable via bypass, and absent from the live file anyway.
  const headers = []; // { index, isRecent } for every column-0 "## " line
  let offset = 0;
  for (const line of content.split("\n")) {
    if (line.startsWith("## ")) {
      headers.push({ index: offset, isRecent: line.startsWith("## Recent ") });
    }
    offset += line.length + 1; // +1 for the consumed "\n"
  }
  const regions = [];
  for (let i = 0; i < headers.length; i++) {
    if (!headers[i].isRecent) continue;
    const end = i + 1 < headers.length ? headers[i + 1].index : content.length;
    regions.push([headers[i].index, end]);
  }
  return regions;
}

// Extract the old_string list for the edit tool (Edit=1, MultiEdit=N, else []).
// Write / NotebookEdit replace the whole file -> [] -> never a scoped append.
function oldStringsForTool(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") return [];
  if (toolName === "Edit") {
    return typeof toolInput.old_string === "string" ? [toolInput.old_string] : [];
  }
  if (toolName === "MultiEdit") {
    const edits = Array.isArray(toolInput.edits) ? toolInput.edits : [];
    return edits
      .map((e) => (e && typeof e.old_string === "string" ? e.old_string : null))
      .filter((s) => s !== null);
  }
  return [];
}

// Pure: does this edit target ONLY the trailing inbox region? True IFF the
// old_string list is non-empty AND every old_string's FIRST occurrence in
// `content` is at/after the inbox boundary. Conservative: an old_string whose
// first occurrence is in the doctrine body above the boundary -> false -> BLOCK
// (fail-safe -- a doctrine edit must never slip through as an "inbox append").
function isInboxOnlyEdit(oldStrings, content) {
  const regions = inboxRegions(content);
  if (regions.length === 0) return false;
  if (!Array.isArray(oldStrings) || oldStrings.length === 0) return false;
  for (const s of oldStrings) {
    if (typeof s !== "string" || s.length === 0) return false;
    const idx = content.indexOf(s);
    if (idx < 0) return false; // not present at all
    // The ENTIRE matched span [idx, idx+len) must stay within ONE inbox section.
    // Checking only the START (P1 from per-file scrutiny) let an attacker anchor
    // old_string at an inbox bullet but extend it PAST the section boundary into
    // doctrine and rewrite that doctrine via new_string. End-inclusive closes it.
    const end = idx + s.length;
    if (!regions.some(([a, b]) => idx >= a && end <= b)) return false; // span escapes every inbox section
  }
  return true;
}

// Resolve the current chat's slot from chat-slots.json (best-effort, redirect msg only).
function resolveMySlot(sessionId) {
  try {
    const slots = readSlotsWithRetry();
    if (!slots?.slots || typeof sessionId !== "string" || !sessionId) return null;
    for (const [name, data] of Object.entries(slots.slots)) {
      if (data?.chatId && (data.chatId === sessionId || sessionId.includes(data.chatId.replace(/^claude-/, "")))) {
        return name;
      }
    }
  } catch { /* fall through */ }
  return null;
}

// The redirect target: the slot's OWN galaxy CLAUDE.md, or a generic pointer.
function galaxyRedirect(sessionId) {
  try {
    const slot = resolveMySlot(sessionId);
    if (slot) {
      const g = galaxyForSlot(slot);
      if (g) return `your galaxy doctrine at mcp-server/src/engines/${g}/CLAUDE.md (slot ${slot})`;
    }
  } catch { /* fall through */ }
  return "your galaxy's mcp-server/src/engines/<your-galaxy>/CLAUDE.md (see SLOT_GALAXY_MAP)";
}

// ─── Exports (for tests; pure functions only — no I/O) ──────────────────

export const _internals = {
  normalizeRelativePath,
  stripRenameSuffix,
  isProjectClaudeMd,
  extractFilePath,
  matchesGolfId,
  inboxRegions,
  oldStringsForTool,
  isInboxOnlyEdit,
  CLAUDE_MD_REL,
  RENAME_SUFFIX_RE,
};

// ─── Main ────────────────────────────────────────────────────────────────

function main() {
  if (DISABLED) return emitAllow();

  const raw = readStdinSafe();
  if (!raw.trim()) return emitAllow();

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return emitAllow(); // malformed → don't block
  }

  // Only enforce on edit-class tools
  const tool = payload.tool_name || payload.toolName || "";
  const editTools = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
  if (!editTools.has(tool)) return emitAllow();

  // Extract & normalize target path
  const filePath = extractFilePath(payload.tool_input || payload.toolInput);
  const rel = normalizeRelativePath(filePath);
  if (!isProjectClaudeMd(rel)) return emitAllow(); // not CLAUDE.md, no concern

  // Target IS CLAUDE.md — check whether this chat is golf. The harness
  // session_id from the PreToolUse payload is the primary identity signal
  // (matchesGolfId bridges its uuid form to the stored claude-<hex> golf.chatId).
  const sessionId = payload.session_id || payload.sessionId || "";
  if (isGolfChat(sessionId)) return emitAllow();

  // DOCREFLECT allowance: any work chat MAY append to the `## Recent regressions`
  // / `## Recent shipments` inbox of main CLAUDE.md (golf drains it). Only a SCOPED
  // inbox edit passes -- a doctrine-body edit or a whole-file Write still blocks.
  const toolInput = payload.tool_input || payload.toolInput;
  const mainContent = readMainClaudeMd();
  if (mainContent && isInboxOnlyEdit(oldStringsForTool(tool, toolInput), mainContent)) {
    return emitAllow();
  }

  // Bypass after CLAUDE.md is confirmed target (so logs reflect intent)
  if (BYPASS) {
    process.stderr.write(
      `[claude-md-golf-only-guard] BYPASS: non-golf chat editing CLAUDE.md (tool=${tool}, path=${rel}). PRISM_CLAUDE_MD_GUARD_BYPASS=1 set.\n`,
    );
    return emitAllow();
  }

  return emitBlock(
    `Edit/Write to project CLAUDE.md is restricted to the golf hygiene slot ` +
    `(OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF + PER-SLOT-CLAUDEMD-MS0 doctrine -- root CLAUDE.md is now ` +
    `the UNIVERSAL rails only, maintained by golf). For DOMAIN doctrine, edit ${galaxyRedirect(sessionId)} ` +
    `-- that is your slot's own CLAUDE.md, loaded as your primary doctrine every session by ` +
    `galaxy-claudemd-inject. To propose a UNIVERSAL change: (a) append a '## Recent regressions' ` +
    `entry (allowed from any chat -- golf drains it); or (b) claim golf via '/checkin-golf' and edit there. ` +
    `Bypass: PRISM_CLAUDE_MD_GUARD_BYPASS=1 (emergency recovery only -- logged). ` +
    `Disable: PRISM_CLAUDE_MD_GUARD_DISABLE=1.`,
  );
}

// Only run main() when invoked directly (not when imported by the test suite).
// Windows-safe: compare via `pathToFileURL(argv[1]).href` (normalizes case +
// slash style + drive letter) against `import.meta.url`. This is the Node-
// canonical pattern; both sides go through the same URL normalizer so a
// `H:/x` arg and an `H:\\x` realpath both resolve to `file:///H:/x` URLs.
const __isMain = (() => {
  try {
    const argvUrl = pathToFileURL(resolve(process.argv[1] || "")).href.toLowerCase();
    return argvUrl === import.meta.url.toLowerCase();
  } catch { return false; }
})();
// Crash-safety: this is a BLOCKING hook. An unexpected throw must fail-OPEN
// (emitAllow), never brick every CLAUDE.md edit fleet-wide. The INTENTIONAL
// fail-closed path (unverifiable golf identity) is inside isGolfChat and is
// untouched by this catch -- only genuine crashes degrade to allow.
if (__isMain) {
  try { main(); } catch { emitAllow(); }
}
