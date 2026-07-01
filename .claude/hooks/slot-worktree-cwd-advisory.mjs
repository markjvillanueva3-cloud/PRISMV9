#!/usr/bin/env node
// tier: T3
/**
 * slot-worktree-cwd-advisory.mjs — UserPromptSubmit hook (fires after slot-bind-enforce).
 *
 * Closes the documented-but-inactive slot-worktree migration gap: 13 NATO slot
 * worktrees physically exist on disk (H:/prism-slot-{alpha..mike}, see
 * `git worktree list`) but active chats claim a slot via slot-bind-enforce and
 * then keep working in the SHARED `H:/prism` main tree. Commits land on the
 * shared branch, the slot/<nato> branch never advances, peers fight for the
 * main index, the three lane-routing hooks (main-tree-write-block /
 * git-add-lane-guard / worktree-commit-route) can't enforce because the chat
 * isn't actually IN the slot worktree.
 *
 * This hook detects the cwd-vs-slot mismatch at every UserPromptSubmit (after
 * slot-bind-enforce has authoritatively claimed the slot from stdin) and
 * surfaces a copy-paste migration command. It does NOT auto-cd — the Claude
 * Code CLI cwd is fixed at launch and cannot be migrated mid-session; the
 * operator must close + reopen in the slot worktree.
 *
 * Throttle: one advisory per (sessionId × slot) pair, persisted to disk so
 * post-/compact resumes don't spam — the operator already saw it.
 *
 * Knobs:
 *   PRISM_SLOT_CWD_ADVISORY_DISABLE=1   skip
 *   PRISM_SLOT_CWD_ADVISORY_FORCE=1     ignore throttle, always emit
 *
 * @hook UserPromptSubmit  (wire AFTER slot-bind-enforce.mjs)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const PRISM_ROOT = "H:/prism";
const SLOT_WORKTREE_ROOT = "H:";
const CHAT_SLOTS_PATH = `${PRISM_ROOT}/state/shared/chat-slots.json`;
const STATE_FILE = `${PRISM_ROOT}/state/shared/.slot-cwd-advisory-state.json`;

// ── Pure helpers ──

export function normalizePath(p) {
  if (!p) return "";
  return String(p).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function expectedWorktreeFor(slot) {
  if (!slot || !/^[a-z]+$/.test(slot)) return null;
  return `${SLOT_WORKTREE_ROOT}/prism-slot-${slot}`;
}

/**
 * Pure classifier. Returns one of:
 *   {match: null, kind: "no-slot"}
 *   {match: null, kind: "no-cwd"}
 *   {match: false, kind: "worktree-missing", slot, expected}
 *   {match: false, kind: "in-main-tree", slot, expected, actual}
 *   {match: false, kind: "in-other-tree", slot, expected, actual}
 *   {match: true, kind: "in-slot-tree", slot, expected}
 */
export function classifyCwdVsSlot({ cwd, slot, mainTreeRoot, expectedWorktree, worktreeExists }) {
  if (!slot) return { match: null, kind: "no-slot" };
  if (!cwd) return { match: null, kind: "no-cwd" };
  if (!expectedWorktree) return { match: null, kind: "no-expected" };
  if (!worktreeExists) {
    return { match: false, kind: "worktree-missing", slot, expected: expectedWorktree };
  }
  const cwdN = normalizePath(cwd);
  const expN = normalizePath(expectedWorktree);
  const mainN = normalizePath(mainTreeRoot);
  if (cwdN === expN || cwdN.startsWith(expN + "/")) {
    return { match: true, kind: "in-slot-tree", slot, expected: expectedWorktree };
  }
  if (cwdN === mainN || cwdN.startsWith(mainN + "/")) {
    return { match: false, kind: "in-main-tree", slot, expected: expectedWorktree, actual: cwd };
  }
  return { match: false, kind: "in-other-tree", slot, expected: expectedWorktree, actual: cwd };
}

export function buildAdvisory(classification) {
  if (!classification || classification.match !== false) return null;
  const { kind, slot, expected, actual } = classification;
  if (kind === "worktree-missing") {
    return [
      `⚠️ slot-worktree-cwd: slot=\`${slot}\` claimed but worktree \`${expected}\` does not exist yet.`,
      `   Bootstrap (from an elevated PowerShell, no Claude running in that slot):`,
      `     node H:/prism/.claude/helpers/slot-worktree-bootstrap.mjs --slot ${slot} --apply`,
      `   Then close this chat and relaunch in the new worktree:`,
      `     cd ${expected.replace(/\\/g, "/")}`,
      `     claude`,
      `   Full runbook: [[slot-worktree-playbook]] (knowledge/wiki/software-engineering/slot-worktree-playbook.md)`,
    ].join("\n");
  }
  const treeLabel = kind === "in-main-tree" ? "SHARED MAIN tree" : "wrong worktree";
  return [
    `⚠️ slot-worktree-cwd: slot=\`${slot}\` claimed but you're working in the ${treeLabel}.`,
    `   Expected: ${expected.replace(/\\/g, "/")}`,
    `   Actual:   ${actual.replace(/\\/g, "/")}`,
    `   The lane-routing hooks (main-tree-write-block / git-add-lane-guard / worktree-commit-route) won't enforce until you're in the slot worktree.`,
    `   Migration (close this chat, then in a fresh terminal):`,
    `     cd ${expected.replace(/\\/g, "/")}`,
    `     claude   # slot-bind-enforce will re-pin you to ${slot} from the new cwd`,
    `   Full runbook: [[slot-worktree-playbook]] (knowledge/wiki/software-engineering/slot-worktree-playbook.md)`,
    `   Or for one-off settings work, set PRISM_SLOT_CWD_ADVISORY_DISABLE=1 to suppress this banner.`,
  ].join("\n");
}

// ── Throttle ──

export function loadState(path, deps = {}) {
  const _exists = deps.existsSync || existsSync;
  const _read = deps.readFileSync || readFileSync;
  if (!_exists(path)) return {};
  try {
    const j = JSON.parse(_read(path, "utf8"));
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

export function saveState(path, state, deps = {}) {
  const _write = deps.writeFileSync || writeFileSync;
  const _exists = deps.existsSync || existsSync;
  const _mkdir = deps.mkdirSync || mkdirSync;
  try {
    const dir = dirname(path);
    if (!_exists(dir)) _mkdir(dir, { recursive: true });
    _write(path, JSON.stringify(state, null, 2));
    return true;
  } catch {
    return false;
  }
}

export function throttleKey(sessionId, slot) {
  return `${String(sessionId || "").slice(0, 8)}|${slot}`;
}

export function shouldEmit({ state, sessionId, slot, force }) {
  if (force) return true;
  const key = throttleKey(sessionId, slot);
  return !state[key];
}

export function recordEmit({ state, sessionId, slot, kind }) {
  const key = throttleKey(sessionId, slot);
  return { ...state, [key]: { kind, ts: new Date().toISOString() } };
}

// ── Side-effecting wrappers (injectable for tests) ──

export function readSlotBindingFromFile(sessionId, path, deps = {}) {
  const _exists = deps.existsSync || existsSync;
  const _read = deps.readFileSync || readFileSync;
  if (!_exists(path)) return null;
  try {
    const j = JSON.parse(_read(path, "utf8"));
    const slots = j?.slots || {};
    const sid = String(sessionId || "").slice(0, 8);
    if (!sid) return null;
    for (const [name, st] of Object.entries(slots)) {
      if (!st || typeof st !== "object") continue;
      const cid = String(st.chatId || "");
      if (cid.endsWith(sid) || cid === `claude-${sid}`) {
        return name;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function checkWorktreeExists(p, deps = {}) {
  const _exists = deps.existsSync || existsSync;
  try {
    return _exists(p) && _exists(`${p}/.git`);
  } catch {
    return false;
  }
}

// ── Main ──

export async function runCheck(opts = {}) {
  const env = opts.env || process.env;
  if (env.PRISM_SLOT_CWD_ADVISORY_DISABLE === "1") return { continue: true };

  const sessionId = opts.sessionId || env.CLAUDE_SESSION_ID || "";
  const cwd = opts.cwd || process.cwd();
  const force = env.PRISM_SLOT_CWD_ADVISORY_FORCE === "1";

  const deps = opts.deps || {};
  const slot = opts.slot !== undefined
    ? opts.slot
    : readSlotBindingFromFile(sessionId, opts.chatSlotsPath || CHAT_SLOTS_PATH, deps);

  const expectedWorktree = expectedWorktreeFor(slot);
  const worktreeExists = expectedWorktree
    ? (opts.worktreeExists !== undefined ? opts.worktreeExists : checkWorktreeExists(expectedWorktree, deps))
    : false;

  const classification = classifyCwdVsSlot({
    cwd,
    slot,
    mainTreeRoot: PRISM_ROOT,
    expectedWorktree,
    worktreeExists,
  });

  if (classification.match !== false) return { continue: true };

  const statePath = opts.statePath || STATE_FILE;
  const state = loadState(statePath, deps);
  if (!shouldEmit({ state, sessionId, slot, force })) return { continue: true };

  const advisory = buildAdvisory(classification);
  if (!advisory) return { continue: true };

  saveState(statePath, recordEmit({ state, sessionId, slot, kind: classification.kind }), deps);
  return {
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: advisory },
  };
}

// ── CLI entry ──

const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
           import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
  } catch { return false; }
})();

function readStdinJSON() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf-8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

if (isMain) {
  const payload = readStdinJSON();
  const sessionId = payload?.session_id || process.env.CLAUDE_SESSION_ID || "";
  runCheck({ sessionId }).then((result) => {
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  }).catch((e) => {
    process.stdout.write(JSON.stringify({ continue: true, systemMessage: `slot-cwd-advisory hook failed: ${e.message}` }));
    process.exit(0);
  });
}
