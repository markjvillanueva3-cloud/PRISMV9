#!/usr/bin/env node
// slot-worktree-bootstrap.mjs — self-bootstraps a slot worktree on first /checkin-<nato>.
//
// Closes the long-standing slot-worktree enforcement gap documented in
// `knowledge/wiki/lessons/slot-worktree-enforcement-not-actually-active.md`:
// the 3 enforcement hooks (worktree-commit-route + git-add-lane-guard +
// main-tree-write-block) have been on-disk + wired in settings.json since
// 2026-05-16, but they never fire because their arming condition —
// chat-slots.<slot>.branch starts with "slot/" — has been false for every
// chat. The /checkin Step 2c "migration" was documented but unimplemented.
//
// This helper is Path B (skill-side auto-bootstrap): /checkin-<nato> calls
// it after the slot claim. With --dry-run (default) it just reports what
// would change. With --apply it creates the worktree + updates chat-slots
// so the enforcement hooks arm starting on the operator's next /checkin.
//
// Safety invariants:
//   1. DRY-RUN by default — no fs mutation, no git mutation, just reports.
//   2. Refuses to run with uncommitted work in the shared tree (would be
//      lost during worktree switch). Operator must commit/stash first.
//   3. Refuses to clobber a non-empty H:/prism-slot-<nato> dir unless
//      --force-clean is also passed (which logs to .slot-worktree-clean.jsonl).
//   4. Per-slot only — never touches other slots' worktrees / branches.
//   5. Idempotent — re-running on an already-bootstrapped slot is a no-op.
//   6. The chat-slots branch update is atomic (tmp+rename) — concurrent
//      heartbeat writers see either pre or post, never partial.
//   7. R12 fail-loud: every refusal returns a `reason` naming exactly why.
//
// CLI:
//   node slot-worktree-bootstrap.mjs --slot golf            # dry-run plan
//   node slot-worktree-bootstrap.mjs --slot golf --apply    # actually migrate
//   node slot-worktree-bootstrap.mjs --slot golf --apply --force-clean
//   node slot-worktree-bootstrap.mjs --status --slot golf   # just report state
//
// @module slot-worktree-bootstrap

import { existsSync, readFileSync, writeFileSync, renameSync, statSync, readdirSync, appendFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

export const PRISM_ROOT = "H:/prism";
export const CHAT_SLOTS_PATH = "H:/prism/state/shared/chat-slots.json";
export const SLOT_WORKTREE_BASE = "H:/prism-slot-"; // joined with NATO slot name
export const CLEAN_LOG = "H:/prism/state/shared/dashboards/.slot-worktree-clean.jsonl";

// Pure: derive the worktree dir for a slot. Lowercased to match the on-disk pattern.
export function worktreeDirForSlot(slot) {
  if (!slot || typeof slot !== "string") return null;
  return `${SLOT_WORKTREE_BASE}${slot.toLowerCase()}`;
}

// Pure: the branch name to bind on the worktree.
export function branchNameForSlot(slot) {
  if (!slot || typeof slot !== "string") return null;
  return `slot/${slot.toLowerCase()}`;
}

// Pure: classify the current state of a slot's worktree directory.
// Returns { exists, hasGit, scratchFileCount, scratchFiles: string[] }.
// Injected fs for testability.
export function inspectWorktreeDir(dir, deps = {}) {
  const _exists = deps.existsSync || existsSync;
  const _readdir = deps.readdirSync || readdirSync;
  if (!dir || !_exists(dir)) {
    return { exists: false, hasGit: false, scratchFileCount: 0, scratchFiles: [] };
  }
  // POSIX-style join: worktree dirs are always forward-slash (`H:/prism-slot-<nato>`).
  // Using path.join here would emit `\` on Windows and miss callers that build the
  // expected path with `/`. This file's whole dir convention is `/`, so be explicit.
  const hasGit = _exists(`${dir}/.git`);
  let scratchFiles = [];
  try {
    const entries = _readdir(dir);
    scratchFiles = entries.filter((e) => e !== ".git");
  } catch {
    scratchFiles = [];
  }
  return {
    exists: true,
    hasGit,
    scratchFileCount: scratchFiles.length,
    scratchFiles: scratchFiles.slice(0, 10), // cap to first 10 for logging
  };
}

// Pure: classify whether the bootstrap is safe to proceed.
// Returns { action: "noop" | "would-bootstrap" | "would-clean-and-bootstrap" | "refuse", reason }.
export function classifyBootstrapAction(slot, dirState, opts = {}) {
  if (!slot) return { action: "refuse", reason: "missing-slot" };
  if (!dirState) return { action: "refuse", reason: "missing-dirState" };
  if (dirState.exists && dirState.hasGit) {
    return { action: "noop", reason: "already-bootstrapped" };
  }
  if (dirState.exists && dirState.scratchFileCount > 0) {
    if (!opts.forceClean) {
      return {
        action: "refuse",
        reason: `scratch-files-present (count=${dirState.scratchFileCount}) — pass --force-clean to remove them (audited)`,
      };
    }
    return { action: "would-clean-and-bootstrap", reason: "force-clean-acknowledged" };
  }
  // Either dir doesn't exist, or exists but is empty — safe to create worktree
  return { action: "would-bootstrap", reason: dirState.exists ? "empty-dir" : "dir-missing" };
}

// Pure: read the chat-slots state file. Returns the parsed doc + the slot state.
export function readChatSlots(path = CHAT_SLOTS_PATH, deps = {}) {
  const _read = deps.readFileSync || readFileSync;
  const _exists = deps.existsSync || existsSync;
  if (!_exists(path)) return { doc: null, error: "chat-slots-file-missing" };
  try {
    const doc = JSON.parse(_read(path, "utf8"));
    return { doc, error: null };
  } catch (e) {
    return { doc: null, error: `parse-error: ${e.message}` };
  }
}

// Pure: figure out the desired chat-slots update. Returns the new doc to write.
export function buildSlotBranchUpdate(currentDoc, slot, branchName) {
  if (!currentDoc || typeof currentDoc !== "object") return null;
  if (!slot || !branchName) return null;
  const nextDoc = { ...currentDoc };
  const slots = { ...(currentDoc.slots || {}) };
  const slotState = slots[slot] ? { ...slots[slot], branch: branchName } : { branch: branchName };
  slots[slot] = slotState;
  nextDoc.slots = slots;
  nextDoc.lastUpdated = new Date().toISOString();
  return nextDoc;
}

// Side-effecting: check whether the shared tree has uncommitted work
// (deps.runGit injectable for testing).
export function detectUncommittedShared(deps = {}) {
  const runGit = deps.runGit || ((args) => execFileSync("git", args, { cwd: PRISM_ROOT, encoding: "utf8" }));
  try {
    const out = runGit(["status", "--porcelain", "--untracked-files=no"]);
    const lines = (out || "").split("\n").filter(Boolean);
    return { dirty: lines.length > 0, fileCount: lines.length, sample: lines.slice(0, 5) };
  } catch (e) {
    return { dirty: null, error: e.message };
  }
}

// Side-effecting: append a clean-action audit line. Caller decides when.
export function logCleanAction(path, entry, deps = {}) {
  const _exists = deps.existsSync || existsSync;
  const _mkdir = deps.mkdirSync || mkdirSync;
  const _append = deps.appendFileSync || appendFileSync;
  try {
    const dir = dirname(path);
    if (!_exists(dir)) _mkdir(dir, { recursive: true });
    _append(path, JSON.stringify(entry) + "\n");
    return true;
  } catch {
    return false;
  }
}

// Side-effecting: atomic write of the updated chat-slots doc.
export function writeChatSlotsAtomic(path, doc, deps = {}) {
  const _write = deps.writeFileSync || writeFileSync;
  const _rename = deps.renameSync || renameSync;
  if (!doc) return { ok: false, error: "missing-doc" };
  const tmp = `${path}.tmp.${process.pid}`;
  try {
    _write(tmp, JSON.stringify(doc, null, 1));
    _rename(tmp, path);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Side-effecting: the actual `git worktree add` invocation.
// Pure-shell — injects runGit for tests.
export function gitWorktreeAdd({ slot, worktreeDir, baseRef, deps = {} }) {
  const runGit = deps.runGit || ((args) => execFileSync("git", args, { cwd: PRISM_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const branch = branchNameForSlot(slot);
  if (!worktreeDir || !branch) return { ok: false, error: "missing-args" };
  try {
    // First check if branch already exists; if so, use it; if not, create it.
    let branchExists = false;
    try {
      runGit(["rev-parse", "--verify", branch]);
      branchExists = true;
    } catch { /* branch doesn't exist */ }
    if (branchExists) {
      runGit(["worktree", "add", worktreeDir, branch]);
    } else {
      runGit(["worktree", "add", worktreeDir, "-b", branch, baseRef || "cad-fusion-live-ms0"]);
    }
    return { ok: true, branch, branchPreExisted: branchExists };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

// Top-level pure-orchestrator that runs the dry-run report OR the full migration.
// Side effects ONLY happen when opts.apply === true. Caller injects deps.
export function bootstrapSlot(slot, opts = {}) {
  const apply = opts.apply === true;
  const forceClean = opts.forceClean === true;
  const baseRef = opts.baseRef || "cad-fusion-live-ms0";
  const deps = opts.deps || {};
  const worktreeDir = worktreeDirForSlot(slot);
  const branch = branchNameForSlot(slot);
  if (!worktreeDir || !branch) {
    return { ok: false, slot, reason: "invalid-slot" };
  }

  // 1. Inspect target dir
  const dirState = inspectWorktreeDir(worktreeDir, deps);

  // 2. Classify
  const decision = classifyBootstrapAction(slot, dirState, { forceClean });

  // 3. Inspect shared tree (skip in tests via injected runGit-returning-clean)
  const sharedState = detectUncommittedShared(deps);
  const sharedDirty = sharedState.dirty === true;

  // 4. Read current chat-slots
  const slotsState = readChatSlots(deps.chatSlotsPath || CHAT_SLOTS_PATH, deps);
  const currentBranch = slotsState.doc?.slots?.[slot]?.branch || null;
  const alreadyOnSlotBranch = currentBranch === branch;

  // 5. Build the plan
  const plan = {
    slot,
    worktreeDir,
    branch,
    baseRef,
    currentBranchInChatSlots: currentBranch,
    alreadyOnSlotBranch,
    dirState,
    decision,
    sharedDirty,
    sharedSample: sharedState.sample || [],
    apply,
    forceClean,
  };

  // 6. If just dry-run, we're done
  if (!apply) {
    return { ok: true, mode: "dry-run", plan };
  }

  // 7. APPLY mode — fail fast on hard refusals
  if (decision.action === "refuse") {
    return { ok: false, mode: "apply", plan, reason: decision.reason };
  }
  if (decision.action === "noop") {
    // Already bootstrapped. Update chat-slots if drifted, otherwise no-op.
    if (!alreadyOnSlotBranch && slotsState.doc) {
      const next = buildSlotBranchUpdate(slotsState.doc, slot, branch);
      const w = writeChatSlotsAtomic(deps.chatSlotsPath || CHAT_SLOTS_PATH, next, deps);
      return { ok: w.ok, mode: "apply", plan, action: "chat-slots-realigned", error: w.error };
    }
    return { ok: true, mode: "apply", plan, action: "noop" };
  }

  // 8. Refuse if shared tree has uncommitted work (would be lost)
  if (sharedDirty) {
    return {
      ok: false,
      mode: "apply",
      plan,
      reason: `shared-tree-dirty (${sharedState.fileCount} uncommitted files) — commit or stash first`,
    };
  }

  // 9. If clean-and-bootstrap: log the clean action
  if (decision.action === "would-clean-and-bootstrap") {
    logCleanAction(deps.cleanLogPath || CLEAN_LOG, {
      ts: new Date().toISOString(),
      slot,
      worktreeDir,
      scratchFileCount: dirState.scratchFileCount,
      scratchSample: dirState.scratchFiles,
      operator: process.env.USERNAME || process.env.USER || null,
    }, deps);
    // We don't physically remove the scratch — that's destructive. The git
    // worktree add will fail if the dir is non-empty; the operator gets the
    // log + clear path to clean manually. (We never rm anything; doctrine
    // is never-delete-only-disable.)
    return {
      ok: false,
      mode: "apply",
      plan,
      reason: `dir-non-empty — scratch files audited to ${CLEAN_LOG}; remove manually then re-run`,
    };
  }

  // 10. Create the worktree (would-bootstrap)
  const r = gitWorktreeAdd({ slot, worktreeDir, baseRef, deps });
  if (!r.ok) {
    return { ok: false, mode: "apply", plan, reason: `git-worktree-add-failed: ${r.error}` };
  }

  // 11. Update chat-slots.<slot>.branch
  if (slotsState.doc) {
    const next = buildSlotBranchUpdate(slotsState.doc, slot, branch);
    const w = writeChatSlotsAtomic(deps.chatSlotsPath || CHAT_SLOTS_PATH, next, deps);
    if (!w.ok) {
      return {
        ok: false,
        mode: "apply",
        plan,
        action: "worktree-created-chat-slots-update-failed",
        error: w.error,
      };
    }
  }

  return {
    ok: true,
    mode: "apply",
    plan,
    action: "bootstrapped",
    branchPreExisted: r.branchPreExisted,
  };
}

// ── CLI entry ──

function parseArgs(argv) {
  const args = { slot: null, apply: false, forceClean: false, status: false, baseRef: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slot") { args.slot = argv[++i]; continue; }
    if (a === "--apply") { args.apply = true; continue; }
    if (a === "--force-clean") { args.forceClean = true; continue; }
    if (a === "--status") { args.status = true; continue; }
    if (a === "--base-ref") { args.baseRef = argv[++i]; continue; }
    if (a === "--help" || a === "-h") { args.help = true; continue; }
  }
  return args;
}

const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
           import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
  } catch { return false; }
})();

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.slot) {
    console.log(`Usage: node slot-worktree-bootstrap.mjs --slot <nato> [--apply] [--force-clean] [--status]

Bootstrap a slot worktree at H:/prism-slot-<nato> + bind chat-slots.<slot>.branch = slot/<nato>.

Flags:
  --slot <nato>     NATO slot name (alpha..zulu)
  --apply           Actually create the worktree (default: dry-run report)
  --force-clean     With --apply: acknowledge non-empty target dir (logs to .slot-worktree-clean.jsonl)
                    Note: this helper never deletes scratch files; --force-clean only audits.
  --status          Just report dir state, never write
  --base-ref <br>   Branch to create slot/ from (default: cad-fusion-live-ms0)
  --help            This message

Examples:
  node slot-worktree-bootstrap.mjs --slot golf
    (dry-run report — what would change)
  node slot-worktree-bootstrap.mjs --slot golf --apply
    (create H:/prism-slot-golf + slot/golf branch + update chat-slots)
`);
    process.exit(args.help ? 0 : 1);
  }

  if (args.status) {
    const dir = worktreeDirForSlot(args.slot);
    const dirState = inspectWorktreeDir(dir);
    const slotsState = readChatSlots();
    const currentBranch = slotsState.doc?.slots?.[args.slot]?.branch || null;
    console.log(JSON.stringify({
      slot: args.slot,
      worktreeDir: dir,
      dirState,
      currentBranchInChatSlots: currentBranch,
      onSlotBranch: currentBranch === branchNameForSlot(args.slot),
    }, null, 2));
    process.exit(0);
  }

  const result = bootstrapSlot(args.slot, {
    apply: args.apply,
    forceClean: args.forceClean,
    baseRef: args.baseRef,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
}
