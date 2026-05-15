#!/usr/bin/env node
// tier: T2
/**
 * slot-integrator.mjs — Bidirectional sync between slot/* branches and the
 * fleet's main target branch (default: cad-fusion-live-ms0).
 *
 * SHIPPED 2026-05-15 as SLOT-WORKTREE-MS0/U-P4-INTEGRATOR. Operator directive:
 * "I set 7 chats up and named them all corresponding with slot claimed and
 *  envelope/milestones they're working on. lets fix commits so they commit to
 *  their own tree first, 8th chat will move branches where they need to go."
 *
 * This script is the "8th chat" / integration role. Work chats commit to their
 * slot/<name> branch in H:/prism-slot-<name>; the integrator periodically:
 *   --status      survey  (default) — show ahead/behind for each slot branch
 *   --sync-down   pull main into each slot branch (rebase / ff-merge)
 *   --land        ff-merge slot/<name> commits into the target branch
 *   --slot NAME   restrict to a single slot
 *   --target REF  override target branch (default cad-fusion-live-ms0)
 *   --dry-run     show what would happen, do nothing
 *   --json        machine-readable output
 *
 * Safety:
 *   - NEVER force-pushes
 *   - NEVER deletes branches
 *   - NEVER rebases the target branch (only ff-merges into it)
 *   - On any conflict during sync-down → STOPS that slot, reports, moves on
 *   - --land refuses if there are uncommitted changes in any slot worktree
 *   - --land uses --ff-only — non-ff slot branches must rebase first
 *   - Each operation is logged to state/shared/slot-integrator-log.jsonl
 *
 * Usage examples:
 *   node H:/prism/scripts/slot-integrator.mjs                          # status
 *   node H:/prism/scripts/slot-integrator.mjs --sync-down              # bring slots current
 *   node H:/prism/scripts/slot-integrator.mjs --land                   # push slot commits to main
 *   node H:/prism/scripts/slot-integrator.mjs --slot alpha --land      # one slot only
 *   node H:/prism/scripts/slot-integrator.mjs --land --dry-run         # preview
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";

const MAIN_REPO = "H:/prism";
const SLOT_PREFIX = "H:/prism-slot-";
const LOG_PATH = "H:/prism/state/shared/slot-integrator-log.jsonl";
const SLOT_NAMES = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
  "golf", "hotel", "india", "juliet", "kilo",
];

const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const dryRun = args.includes("--dry-run");
const syncDown = args.includes("--sync-down");
const land = args.includes("--land");
const statusOnly = !syncDown && !land;
const slotIdx = args.indexOf("--slot");
const restrictSlot = (slotIdx >= 0 && args[slotIdx + 1]) ? args[slotIdx + 1].toLowerCase() : null;
const targetIdx = args.indexOf("--target");
const targetBranch = (targetIdx >= 0 && args[targetIdx + 1]) ? args[targetIdx + 1] : "cad-fusion-live-ms0";

function git(repo, gitArgs, opts = {}) {
  return spawnSync("git", ["-C", repo, ...gitArgs], {
    encoding: "utf-8", timeout: 15000, ...opts,
  });
}

function gitOut(repo, gitArgs) {
  const r = git(repo, gitArgs);
  return r.status === 0 ? r.stdout.trim() : "";
}

function logEvent(event) {
  try {
    fs.mkdirSync("H:/prism/state/shared", { recursive: true });
    fs.appendFileSync(
      LOG_PATH,
      JSON.stringify({ ...event, ts: new Date().toISOString() }) + "\n"
    );
  } catch { /* fail-soft */ }
}

function probeSlot(name) {
  const repo = `${SLOT_PREFIX}${name}`;
  if (!fs.existsSync(repo)) return { slot: name, exists: false };

  const branch = gitOut(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const ahead = parseInt(gitOut(repo, ["rev-list", "--count", `${targetBranch}..slot/${name}`]) || "0", 10);
  const behind = parseInt(gitOut(repo, ["rev-list", "--count", `slot/${name}..${targetBranch}`]) || "0", 10);
  const dirty = gitOut(repo, ["status", "--porcelain"]).split("\n").filter(Boolean).length;
  const lastCommit = gitOut(repo, ["log", "-1", "--pretty=%h %s"]) || "(none)";

  return {
    slot: name,
    exists: true,
    repo,
    branch,
    ahead,
    behind,
    dirty,
    lastCommit,
  };
}

function syncSlotDown(slot) {
  const repo = slot.repo;
  if (slot.dirty > 0) {
    return { slot: slot.slot, action: "sync-down", ok: false, reason: `dirty (${slot.dirty} files) — refusing rebase` };
  }
  if (slot.behind === 0) {
    return { slot: slot.slot, action: "sync-down", ok: true, reason: "already current", changed: false };
  }
  if (dryRun) {
    return { slot: slot.slot, action: "sync-down", ok: true, reason: `would ff-merge ${slot.behind} commit(s) from ${targetBranch}`, dryRun: true };
  }
  // ff-only merge target into slot — safer than rebase (no force-push needed)
  const m = git(repo, ["merge", "--ff-only", targetBranch]);
  if (m.status !== 0) {
    return {
      slot: slot.slot,
      action: "sync-down",
      ok: false,
      reason: `ff-only merge failed: ${(m.stderr || m.stdout || "").trim().slice(0, 200)}`,
      hint: `slot has diverged — operator must resolve in ${repo}`,
    };
  }
  return { slot: slot.slot, action: "sync-down", ok: true, reason: `ff-merged ${slot.behind} commit(s)`, changed: true };
}

function landSlot(slot) {
  if (slot.ahead === 0) {
    return { slot: slot.slot, action: "land", ok: true, reason: "no commits to land", changed: false };
  }
  if (slot.dirty > 0) {
    return { slot: slot.slot, action: "land", ok: false, reason: `slot worktree dirty (${slot.dirty} files) — commit or stash first` };
  }
  if (slot.behind > 0) {
    return {
      slot: slot.slot,
      action: "land",
      ok: false,
      reason: `slot is ${slot.behind} commits behind ${targetBranch} — run --sync-down first`,
      hint: "non-ff merge into target would require resolution; ff-only refuses this",
    };
  }
  if (dryRun) {
    return { slot: slot.slot, action: "land", ok: true, reason: `would ff-merge slot/${slot.slot} (${slot.ahead} commit(s)) into ${targetBranch}`, dryRun: true };
  }
  // ff-only merge of slot branch into target, performed FROM the main tree
  const m = git(MAIN_REPO, ["merge", "--ff-only", `slot/${slot.slot}`]);
  if (m.status !== 0) {
    return {
      slot: slot.slot,
      action: "land",
      ok: false,
      reason: `ff-only merge failed: ${(m.stderr || m.stdout || "").trim().slice(0, 200)}`,
      hint: `target branch may have advanced since probe — re-run --status`,
    };
  }
  return { slot: slot.slot, action: "land", ok: true, reason: `landed ${slot.ahead} commit(s) into ${targetBranch}`, changed: true };
}

// ── Main flow ──────────────────────────────────────────────────────────────

const slots = SLOT_NAMES
  .filter(n => !restrictSlot || n === restrictSlot)
  .map(probeSlot);

const present = slots.filter(s => s.exists);

if (statusOnly) {
  const report = { target: targetBranch, slots: present };
  if (wantJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(`slot-integrator status — target=${targetBranch}\n`);
    process.stdout.write(`────────────────────────────────────────────────────────────\n`);
    for (const s of present) {
      const flag = s.ahead > 0 ? "▲" : s.behind > 0 ? "▽" : "·";
      const dirty = s.dirty > 0 ? ` (dirty: ${s.dirty})` : "";
      process.stdout.write(
        `${flag} slot/${s.slot.padEnd(8)}  ahead=${String(s.ahead).padStart(3)}  behind=${String(s.behind).padStart(3)}${dirty}  ${s.lastCommit.slice(0, 60)}\n`
      );
    }
    const aheadSum = present.reduce((sum, s) => sum + s.ahead, 0);
    const dirtySum = present.reduce((sum, s) => sum + s.dirty, 0);
    process.stdout.write(`────────────────────────────────────────────────────────────\n`);
    process.stdout.write(`Totals: ${aheadSum} commit(s) ready to land · ${dirtySum} dirty file(s) blocking\n`);
    if (aheadSum > 0) {
      process.stdout.write(`\nNext: \`node H:/prism/scripts/slot-integrator.mjs --land\` to land all\n`);
    }
  }
  process.exit(0);
}

// Sync-down or land
const results = [];
if (syncDown) {
  for (const s of present) {
    const r = syncSlotDown(s);
    results.push(r);
    logEvent(r);
  }
}
if (land) {
  // Re-probe after sync-down (if applicable) to refresh ahead/behind
  const finalSlots = syncDown ? SLOT_NAMES.filter(n => !restrictSlot || n === restrictSlot).map(probeSlot).filter(s => s.exists) : present;
  for (const s of finalSlots) {
    const r = landSlot(s);
    results.push(r);
    logEvent(r);
  }
}

if (wantJson) {
  process.stdout.write(JSON.stringify({ target: targetBranch, dryRun, results }, null, 2) + "\n");
} else {
  process.stdout.write(`slot-integrator results — target=${targetBranch}${dryRun ? " (DRY RUN)" : ""}\n`);
  process.stdout.write(`────────────────────────────────────────────────────────────\n`);
  for (const r of results) {
    const mark = r.ok ? "✓" : "✗";
    process.stdout.write(`${mark} slot/${r.slot.padEnd(8)} [${r.action}] ${r.reason}\n`);
    if (r.hint) process.stdout.write(`    hint: ${r.hint}\n`);
  }
  const failed = results.filter(r => !r.ok).length;
  process.stdout.write(`────────────────────────────────────────────────────────────\n`);
  process.stdout.write(`${results.length - failed}/${results.length} succeeded${failed ? `, ${failed} failed` : ""}\n`);
  process.exit(failed > 0 ? 1 : 0);
}
