#!/usr/bin/env node
// tier: T0
/**
 * golf-slot-write-allowlist.mjs — PreToolUse T0 hook (U-CLEANUP-A5)
 *
 * Blocks Edit | Write | MultiEdit | NotebookEdit on any path NOT in the golf
 * chat's write allowlist. Only fires when the current chat IS the golf slot
 * (slot 7, the dedicated hygiene chat per CLEANUP-MS0). All other chats see
 * a silent no-op exit 0 — the hook is invisible to alpha..foxtrot work chats.
 *
 * Why this exists:
 *   Per CLEANUP-MS0 Subsystem A, the golf slot is a strict read-only auditor
 *   + state/shared/* writer + process reaper. It MUST NOT commit feature code.
 *   Cross-worktree firewall (hook-cross-worktree-block.mjs) provides structural
 *   protection when golf runs from a worktree, but A5 hardens this at every
 *   write attempt regardless of worktree state — defense in depth.
 *
 * Block contract:
 *   - stdin: standard PreToolUse JSON (`{tool_name, tool_input: {file_path, ...}}`)
 *   - allowed: exit 0, no stdout
 *   - blocked: write {"continue":false, "decision":"block", "reason":"..."} to
 *     stdout, exit 2 (PreToolUse rejects the tool call)
 *
 * Allowlist source (priority order):
 *   1. state/shared/.golf-allowlist-regex.txt — written by G11 regen-golf-owned-
 *      paths.mjs at close-out time. Single regex on first non-comment line.
 *   2. Inline fallback list (golf-owned dashboards + ledgers + state files).
 *
 * Path-traversal defense (Agent-B R3-VER1):
 *   target → path.resolve(target) → path.relative(REPO_ROOT, resolved). If
 *   relative starts with `..` or path.isAbsolute, BLOCK. Then regex match.
 *   This defends `state/shared/dashboards/../../mcp-server/data/state/secret.json`.
 *
 * Atomic-rename tolerance:
 *   Editors and atomic writers leave `.tmp.<pid>.<ts>`, `.swp`, `~` suffixes.
 *   The allowlist regex matches these as long as the base path is allowlisted.
 *
 * Ordering (in .claude/settings.json):
 *   runs AFTER file-claim-guard.mjs (claim-correctness comes first)
 *   runs BEFORE comprehensive-build-enforce.mjs (allowlist before stub-detect)
 *
 * Bypass:
 *   PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1 → logs bypass + reason to stderr, exit 0.
 *   Use ONLY for: explicit emergency-recovery, debugging, U-CLEANUP-A5b drift.
 *
 * Spec: state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md Subsystem A.A5
 * Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-A5)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { spawnSync } from "node:child_process";

// ─── Configuration ───────────────────────────────────────────────────────

const REPO_ROOT = "H:/prism";
const CHAT_SLOTS_PATH = "H:/prism/state/shared/chat-slots.json";
const ALLOWLIST_REGEX_PATH = "H:/prism/state/shared/.golf-allowlist-regex.txt";
const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";

const BYPASS = process.env.PRISM_GOLF_WRITE_ALLOWLIST_BYPASS === "1";

// Atomic-rename suffix tolerance: any of these may be appended to an allowlisted
// path without rejecting the write. Used by editors + writeFileSync+rename.
const RENAME_SUFFIX_RE = /(?:\.tmp\.[0-9]+\.[0-9]+|\.tmp\.[0-9]+|\.tmp|\.swp|\.swo|~)$/;

// Inline fallback allowlist (used when .golf-allowlist-regex.txt is missing).
// Mirrors golf-owned-paths.json seeded by bootstrap-golf.mjs (U-CLEANUP-A6).
// Anchored at start; ends with $ OR matches the rename-suffix sub-regex above.
//
// COORDINATION.DB CARVE-OUT (Agent-B P0 false-positive resolution, 2026-05-13):
// state/shared/coordination.db (+ .db-wal + .db-shm) are intentionally NOT
// in this allowlist. The H8 SQLite WAL backend writes to those files via the
// CoordinationStoreEngine.ts SQLite client — that path does NOT go through
// Claude's Edit/Write/MultiEdit tools, so A5 never sees those writes. Adding
// them to FALLBACK_ALLOW would be misleading; absence is the correct contract.
const FALLBACK_ALLOW = [
  // Dashboards (any file under dashboards/)
  /^state\/shared\/dashboards\/.+/,
  // Ledger JSONLs
  /^state\/shared\/bug-attribution-ledger\.jsonl$/,
  /^state\/shared\/peer-audit-ticks\.jsonl$/,
  /^state\/shared\/wiki-inject-misses\.jsonl$/,
  /^state\/shared\/golf-envelope-mutations\.jsonl$/,
  /^state\/shared\/system-viz-headline-history\.jsonl$/,
  /^state\/shared\/JSONL_CONSUMER_AUDIT\.md$/,
  // Chat bus (shared communication channel)
  /^state\/shared\/AGENT_CHAT\.jsonl$/,
  // Reports + dashboards (root state/shared)
  /^state\/shared\/HOOK_HEALTH_DIGEST\.md$/,
  /^state\/shared\/WIRING-CANDIDATES-DASHBOARD\.md$/,
  /^state\/shared\/WIKI_LINT_REPORT\.md$/,
  /^state\/shared\/DISPATCHER_CAPACITY\.md$/,
  /^state\/shared\/MEMORY_GARDEN_REPORT\.md$/,
  /^state\/shared\/SKILL_UTILIZATION_REPORT\.md$/,
  /^state\/shared\/HOOK_UTILIZATION_REPORT\.md$/,
  /^state\/shared\/CLAUDE_MD_DRIFT_REPORT\.md$/,
  /^state\/shared\/GSD_FRESHNESS_REPORT\.md$/,
  /^state\/shared\/AWARENESS_HEALTH_DASHBOARD\.md$/,
  /^state\/shared\/SYSTEM_VIZ_LIVEDIFF\.md$/,
  /^state\/shared\/DR_DRILL_LEDGER\.jsonl$/,
  // Golf-owned config + transient state
  /^state\/shared\/golf-owned-paths\.json$/,
  /^state\/shared\/golf-token-budget\.json$/,
  /^state\/shared\/golf-cron-registry\.json$/,
  /^state\/shared\/golf-allowlist-regex\.txt$/,
  /^state\/shared\/\.golf-allowlist-regex\.txt$/,
  /^state\/shared\/\.envelope-drift-last\.json$/,
  /^state\/shared\/\.watchdog-last-poll\.iso$/,
  /^state\/shared\/\.peer-audit-cache\.json$/,
  /^state\/shared\/\.cron-locks\/.+\.lock$/,
  // System-viz staging dir (C3 writes here, F5 merges to live graph)
  /^state\/shared\/system-viz\/staging\/.+/,
  // Operational logs under mcp-server/data/state/ — read-only logs from MCP
  /^mcp-server\/data\/state\/.+\.log$/,
];

// ─── Helpers ─────────────────────────────────────────────────────────────

function emitBlock(reason) {
  process.stdout.write(JSON.stringify({ continue: false, decision: "block", reason }));
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

// Read chat-slots.json with one retry — NTFS atomic-rename (tmp+rename in
// chat-slots.mjs) has a small window where readFileSync can yield ENOENT or
// a partial-parse JSON error. Single 10ms retry covers the rename window.
// Per Agent-B P1 R3 (golf-slot-write-allowlist review, 2026-05-13).
function readSlotsWithRetry() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return JSON.parse(readFileSync(CHAT_SLOTS_PATH, "utf-8"));
    } catch {
      if (attempt === 0) {
        // Spin briefly for the rename window to close
        const until = Date.now() + 10;
        while (Date.now() < until) { /* busy-wait 10ms */ }
      }
    }
  }
  return null;
}

/**
 * Determine whether this Claude session holds the golf slot claim.
 *
 * Returns:
 *   - `true`  : golf slot claim's chatId matches this session's stable-id
 *   - `false` : golf unclaimed, OR claim's chatId doesn't match, OR stable-id unavailable
 *
 * Failure modes:
 *   - chat-slots.json unreadable → return false (fail-open; cross-worktree
 *     firewall provides backup protection for state/shared writes from non-main
 *     trees, so a failed slots-read doesn't catastrophically open golf's blast radius).
 *   - golf claimed but stable-session-id helper returns null → return false
 *     by default. Set PRISM_GOLF_FAIL_CLOSED=1 to invert: when slots claim
 *     golf AND we can't verify our identity, BLOCK ALL writes (strict mode).
 *     Strict mode protects against stable-session-id sabotage at the cost of
 *     potential false-positive blocks on alpha..foxtrot chats during
 *     cache-rebuild moments. Default lenient (fail-open) per defense-in-depth.
 */
function isGolfChat() {
  const slots = readSlotsWithRetry();
  if (!slots) return false; // unreadable → fail-open (no-op for all chats)

  const golf = slots?.slots?.golf;
  if (!golf || !golf.chatId) return false; // golf unclaimed → no-op

  const myId = getStableSessionId();
  if (!myId) {
    // Stable-id failed AND golf IS claimed. Strict mode → block all writes
    // (treat as the golf chat could be us, prefer false-positive over miss).
    if (process.env.PRISM_GOLF_FAIL_CLOSED === "1") {
      process.stderr.write(
        `[golf-slot-write-allowlist] FAIL-CLOSED: golf slot claimed (${golf.chatId}) but stable-session-id helper returned null; treating this session as suspect-golf and blocking writes. Disable with PRISM_GOLF_FAIL_CLOSED=0.\n`,
      );
      return true; // false-positive blocks acceptable in strict mode
    }
    return false; // default lenient (Agent A P2 + R2-c performance audit alignment)
  }
  return golf.chatId === myId;
}

function loadAllowlistRegex() {
  // Priority 1: file written by G11 regen-golf-owned-paths.mjs.
  // Per Agent-A P2 (2026-05-13 review): wrap RegExp construction in try/catch
  // so a malformed regex in the file doesn't crash the hook — fall back to
  // inline FALLBACK_ALLOW instead.
  if (existsSync(ALLOWLIST_REGEX_PATH)) {
    try {
      const raw = readFileSync(ALLOWLIST_REGEX_PATH, "utf-8");
      const line = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0 && !l.startsWith("#"));
      if (line) {
        try {
          return new RegExp(line);
        } catch {
          process.stderr.write(`[golf-slot-write-allowlist] malformed regex in ${ALLOWLIST_REGEX_PATH}; falling back to inline FALLBACK_ALLOW\n`);
          return null;
        }
      }
    } catch {
      // fall through to fallback
    }
  }
  return null;
}

function extractFilePath(toolInput) {
  // tool_input shape varies by tool name:
  //   Edit: { file_path, old_string, new_string, ... }
  //   Write: { file_path, content }
  //   MultiEdit: { file_path, edits: [...] }
  //   NotebookEdit: { notebook_path, ... }
  if (!toolInput || typeof toolInput !== "object") return null;
  return toolInput.file_path || toolInput.notebook_path || null;
}

function normalizeRelativePath(filePath) {
  // Resolve absolute, then make relative to REPO_ROOT.
  // Returns null if path escapes repo (defends `..` traversal).
  const resolved = resolve(filePath);
  const repoResolved = resolve(REPO_ROOT);
  let rel = relative(repoResolved, resolved);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return null; // escapes repo
  }
  // Normalize to forward slashes (Windows path comparison)
  rel = rel.split(sep).join("/");
  return rel;
}

function stripRenameSuffix(rel) {
  // Strip any atomic-rename suffix so the underlying base path can match.
  return rel.replace(RENAME_SUFFIX_RE, "");
}

function isAllowed(rel, customRegex) {
  // Try custom regex first (priority 1), then inline fallback
  if (customRegex) {
    return customRegex.test(rel);
  }
  return FALLBACK_ALLOW.some((re) => re.test(rel));
}

// ─── Exports (for tests; pure functions only — no I/O) ──────────────────

// These are the pure decision primitives. The hook's `main()` wraps them
// with stdin parsing + chat-slot detection. Tests import these directly to
// avoid mocking the full hook stdin protocol.
export const _internals = {
  normalizeRelativePath,
  stripRenameSuffix,
  isAllowed,
  FALLBACK_ALLOW,
  RENAME_SUFFIX_RE,
  extractFilePath,
};

// ─── Main ────────────────────────────────────────────────────────────────

function main() {
  const raw = readStdinSafe();
  if (!raw.trim()) return emitAllow(); // no stdin → not a hook invocation

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return emitAllow(); // malformed → don't block
  }

  // Only act on Edit/Write/MultiEdit/NotebookEdit
  const tool = payload.tool_name || payload.toolName || "";
  const editTools = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
  if (!editTools.has(tool)) return emitAllow();

  // Only enforce if golf claim is held by this session
  if (!isGolfChat()) return emitAllow();

  // Bypass after golf-confirm but before path check (so logs reflect intent)
  const filePath = extractFilePath(payload.tool_input || payload.toolInput);
  if (!filePath) return emitAllow(); // can't determine target → can't enforce

  if (BYPASS) {
    process.stderr.write(`[golf-slot-write-allowlist] BYPASSED via PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1 (target=${filePath})\n`);
    return emitAllow();
  }

  // Path-traversal defense + repo-scope check
  const rel = normalizeRelativePath(filePath);
  if (rel === null) {
    return emitBlock(`golf-write-block: ${filePath} resolves outside repo root (path-traversal defense)`);
  }

  // Strip atomic-rename suffix for matching, but report the original path
  const baseRel = stripRenameSuffix(rel);

  // Match against allowlist
  const customRegex = loadAllowlistRegex();
  if (!isAllowed(baseRel, customRegex)) {
    return emitBlock(
      `golf-write-block: ${rel} not in golf-write allowlist. Golf may only write to state/shared/{dashboards,ledgers,golf-*,*.cron-locks/,system-viz/staging}/, AGENT_CHAT.jsonl, or mcp-server/data/state/*.log. See state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md §A.A5 + R1-B6 for the canonical allowlist. Set PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1 for emergency override.`
    );
  }

  return emitAllow();
}

// Only invoke main() when run as the hook entry point — NOT when imported
// by tests. import.meta.url comparison is the standard idiom.
const isMainEntry = (() => {
  try {
    return import.meta.url === `file://${resolve(process.argv[1]).split(sep).join("/")}` ||
           import.meta.url.endsWith(process.argv[1]?.split(sep).pop() ?? "");
  } catch {
    return true;
  }
})();

if (isMainEntry) main();
