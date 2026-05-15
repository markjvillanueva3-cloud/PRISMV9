#!/usr/bin/env node
// tier: T0
/**
 * main-tree-write-block.mjs — PreToolUse(Edit | Write | MultiEdit) main-tree gate.
 *
 * Built for SLOT-WORKTREE-MS0/U-P1-MAINTREE-WRITE-BLOCK (P1-ROUTING).
 * Once the milestone's P3-CUTOVER has shipped 9 canonical worktrees
 * (H:/prism-slot-<name>) and each chat is bound to its slot worktree,
 * the integration tree H:/prism becomes READ-ONLY for slot chats — only
 * golf (the integrator) fast-forwards cad-fusion-live-ms0. This hook
 * enforces that boundary at Edit/Write/MultiEdit time so a slot chat
 * cannot accidentally (or routinely) splatter work into the main tree.
 *
 * ── ACTIVATION ─────────────────────────────────────────────────────────
 * Env-opt-in, DEFAULT OFF (transitional). The hook is wired into
 * edit-bundle.mjs but is a pure no-op unless explicitly armed with
 * `PRISM_MAINTREE_WRITE_BLOCK_ENABLE=1`. The milestone's P3-DEFAULT-ON
 * unit flips the default once every chat is on a slot worktree.
 * Kill switch (always wins, even after default-on):
 * `PRISM_MAINTREE_WRITE_BLOCK_DISABLE=1`.
 *
 * Pre-cutover safety: today every chat lives in H:/prism on
 * cad-fusion-live-ms0. With no `slot/<name>` branch binding on the
 * current chat, this hook ALWAYS allows — its block decision requires
 * BOTH a slot-branch binding AND a target path inside the main tree.
 * Even when armed today, the hook is effectively a no-op until P3-CUTOVER
 * binds slot chats to slot/* branches. The integrator slot (golf, by
 * convention from CLAUDE.md §GOLF SLOT) is exempted by name.
 *
 * NOTE: PRISM_*_ENABLE breaks the repo-wide PRISM_*_DISABLE convention on
 * purpose — same transitional rationale as the sibling
 * worktree-commit-route.mjs and git-add-lane-guard.mjs hooks.
 *
 * ── DEDUP MAP ──────────────────────────────────────────────────────────
 * Other Edit/Write/MultiEdit gates that this hook is DISTINCT from:
 *   pre-edit-lane-guard.mjs       — blocks by per-FILE PEER CLAIM
 *                                     (chat-bus claims/*.json)
 *   file-ownership-tracker.mjs    — records ownership; does not block
 *   work-claim.mjs                — coordination claim; not main-tree-aware
 *   asset-deletion-block.mjs      — blocks deletes; not main-tree-aware
 *   THIS HOOK (main-tree-write-block) — blocks by MAIN-TREE MEMBERSHIP
 *                                     (target path inside H:/prism while
 *                                      chat is bound to a slot/* branch
 *                                      AND is not the integrator slot)
 *
 * FIRES ON:  PreToolUse, matcher Edit|Write|MultiEdit (via edit-bundle.mjs SAFETY_HOOKS)
 * ACTION:    deny when chat is on a slot/* branch AND the target file
 *            falls inside the canonical main tree.
 *
 * NON-BLOCKING PATHS (allow):
 *   - PRISM_MAINTREE_WRITE_BLOCK_ENABLE unset/!=1   (default — dormant)
 *   - PRISM_MAINTREE_WRITE_BLOCK_DISABLE=1          (kill switch)
 *   - tool_name is not Edit/Write/MultiEdit
 *   - file_path is missing/empty                    (fail-open)
 *   - cannot resolve chat sessionId                 (fail-open)
 *   - cannot read chat-slots.json                   (fail-open)
 *   - chat is not bound to any slot                 (fail-open)
 *   - slot.branch is not a "slot/" branch
 *     (pre-cutover state, or chat is on a feature branch — allow)
 *   - slot is "golf" (integrator)                   (allow always)
 *   - target file_path does NOT resolve inside H:/prism (the chat is
 *     writing inside its own slot worktree H:/prism-slot-<name> —
 *     fully allowed)
 *
 * BLOCK PATHS (deny):
 *   - chat slot has branch "slot/*" AND slot != "golf" AND target file
 *     resolves inside the canonical main tree root → block with structured
 *     deny + a route hint telling the chat to do the edit in its slot
 *     worktree (or to delegate to golf for cross-cutting integration work)
 *
 * FAIL-OPEN POLICY: every internal error → allow. Worst case is "today's
 * discipline" (pre-cutover state where the gate is a no-op), never breaking
 * Edit. Same policy as siblings pre-edit-lane-guard + git-add-lane-guard.
 *
 * SIDE EFFECTS: none. Reads chat-slots.json via fs + spawns
 * stable-session-id.mjs via spawnSync. Max total budget ~2s.
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { exit } from "node:process";

// ── Activation-gate predicate (defined as a function, NOT a top-level
// `exit(0)`). This is the lesson from U-P1-ADD-LANE-GUARD: a top-level
// `exit(0)` kills any test harness doing `await import(...)`. The gate
// fires from inside main() so the module stays importable. ──
function isHookArmed() {
  const enabled = process.env.PRISM_MAINTREE_WRITE_BLOCK_ENABLE === "1";
  const disabled = process.env.PRISM_MAINTREE_WRITE_BLOCK_DISABLE === "1";
  return enabled && !disabled;
}

// ── Constants ──────────────────────────────────────────────────────────
// The canonical main tree. Hardcoded by design — the milestone's whole
// premise is a known integration tree at H:/prism with slot worktrees at
// H:/prism-slot-<name>. If the project layout ever moves, update here.
const MAIN_TREE_ROOT = "h:/prism";

// The integrator slot (per CLAUDE.md §GOLF SLOT and §SLOT-WORKTREE-MS0):
// golf is the only slot that may write to the main tree.
const INTEGRATOR_SLOT = "golf";

const REPO_ROOT = "H:/prism";
const CHAT_SLOTS_PATH = `${REPO_ROOT}/state/shared/chat-slots.json`;
const STABLE_ID_HELPER = `${REPO_ROOT}/.claude/helpers/stable-session-id.mjs`;
const STABLE_ID_TIMEOUT_MS = 1500;
const MIN_SID_LENGTH = 8;

// Tool names this hook fires on. Other tools allowed silently.
const GUARDED_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);

// ── Pure helpers (exported for tests) ──────────────────────────────────

/** Canonical absolute path: forward slashes, drive lowercased, no trailing `/`. */
export function canonicalize(p) {
  if (!p) return "";
  const abs = path.isAbsolute(p) ? p : path.resolve(p);
  return abs
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, d) => d.toLowerCase() + ":")
    .replace(/\/+$/, "");
}

/** True if `child` is at or under `parent` (after canonicalize). */
export function isWithin(parent, child) {
  if (!parent || !child) return false;
  const p = canonicalize(parent);
  const c = canonicalize(child);
  if (c === p) return true;
  return c.startsWith(p + "/");
}

/** True if `branch` looks like a per-slot branch (`slot/<name>`). */
export function isSlotBranch(branch) {
  if (typeof branch !== "string" || !branch.length) return false;
  const short = branch.replace(/^refs\/heads\//, "");
  return short.startsWith("slot/");
}

/**
 * Resolve the slot binding for this chat. Returns:
 *   { slot, branch } when chat is bound to a slot with a branch field,
 *   null otherwise (fail-open caller must allow).
 *
 * Schema match: state/shared/chat-slots.json is shaped
 *   { schemaVersion, lastUpdated, slots: { alpha:{chatId,branch,...}, bravo:{...}, ... } }
 * `slots.slots` is an OBJECT keyed by slot name, not an array. The chat state
 * is the direct value (no nested `state` field). Earlier draft used an
 * `.find()` over an array — caused a TypeError when armed against the
 * real file; caught by spawn-smoke. Both shapes degrade to null safely.
 */
export function resolveSlotBinding({ sessionId, slots }) {
  if (!sessionId || !slots || !slots.slots) return null;
  const bag = slots.slots;
  if (typeof bag !== "object" || Array.isArray(bag)) return null;
  for (const [slotName, state] of Object.entries(bag)) {
    if (state && typeof state === "object" && state.chatId === sessionId) {
      return { slot: slotName, branch: state.branch || null };
    }
  }
  return null;
}

/**
 * Core decision (pure): given a target file path + slot binding, return
 * null to allow or a {decision,reason} object to block. The caller is
 * responsible for resolving relative paths to absolute paths against the
 * chat's effective cwd before calling.
 */
export function decideOnEdit({ filePathAbs, binding, cwd }) {
  if (!filePathAbs) return null; // fail-open
  if (!binding) return null; // chat has no slot binding — allow
  if (!isSlotBranch(binding.branch)) return null; // pre-cutover state — allow
  if (binding.slot === INTEGRATOR_SLOT) return null; // golf may write main tree
  if (!isWithin(MAIN_TREE_ROOT, filePathAbs)) return null; // writing outside main tree
  return {
    decision: "block",
    reason:
      `main-tree-write-block: blocked Edit/Write/MultiEdit into the main ` +
      `integration tree from a slot chat.\n` +
      `  slot:        ${binding.slot}\n` +
      `  branch:      ${binding.branch}\n` +
      `  target file: ${filePathAbs}\n` +
      `  main tree:   ${MAIN_TREE_ROOT}\n` +
      `  cwd:         ${cwd || "(unknown)"}\n` +
      `Slot chats must write inside their own slot worktree ` +
      `(H:/prism-slot-${binding.slot}). For cross-cutting integration ` +
      `work, hand off to the golf (integrator) slot — only golf may write ` +
      `to the main tree. ` +
      `Kill switch: PRISM_MAINTREE_WRITE_BLOCK_DISABLE=1.`,
  };
}

// ── Side-effectful resolvers (skipped in unit tests via DI) ────────────

function readJsonSafe(p) {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function resolveSessionId() {
  try {
    const r = spawnSync(process.execPath, [STABLE_ID_HELPER], {
      encoding: "utf-8",
      timeout: STABLE_ID_TIMEOUT_MS,
      windowsHide: true,
    });
    const id = (r.stdout || "").trim();
    if (id && id.length >= MIN_SID_LENGTH) return id;
  } catch {
    /* fail-open */
  }
  if (process.env.CLAUDE_SESSION_ID) {
    return `claude-${process.env.CLAUDE_SESSION_ID.slice(0, 8)}`;
  }
  return null;
}

function readSlotsSafe() {
  return readJsonSafe(CHAT_SLOTS_PATH);
}

// ── Entry point ────────────────────────────────────────────────────────
function main() {
  // Activation gate (first thing inside main — see import-safety note above).
  if (!isHookArmed()) exit(0);

  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf-8"));
  } catch {
    exit(0); // fail-open on malformed stdin
  }
  if (!payload || !GUARDED_TOOLS.has(payload.tool_name)) exit(0);

  const filePathRaw = payload.tool_input?.file_path;
  if (typeof filePathRaw !== "string" || !filePathRaw) exit(0);

  // Resolve absolute against the cwd Edit will actually execute under.
  // (Edit doesn't run a subshell, but file_path semantics here mirror the
  // sibling pre-edit-lane-guard's resolution to keep consistent behavior.)
  const cwd =
    payload?.cwd ||
    payload?.tool_input?.cwd ||
    process.env.CLAUDE_PROJECT_DIR ||
    process.cwd();
  const filePathAbs = canonicalize(
    path.isAbsolute(filePathRaw)
      ? filePathRaw
      : path.join(cwd, filePathRaw),
  );

  const sessionId = resolveSessionId();
  const slots = readSlotsSafe();
  if (!sessionId || !slots) exit(0); // fail-open

  const binding = resolveSlotBinding({ sessionId, slots });
  if (!binding) exit(0); // chat unbound — allow

  const decision = decideOnEdit({ filePathAbs, binding, cwd });
  if (!decision) exit(0);

  process.stdout.write(JSON.stringify(decision) + "\n");
  exit(0);
}

// Only run when invoked as CLI (not when imported by tests).
const __mainBasename = (process.argv[1] || "").replace(/\\/g, "/").split("/").pop() || "";
if (__mainBasename && import.meta.url.endsWith(__mainBasename)) {
  main();
}
