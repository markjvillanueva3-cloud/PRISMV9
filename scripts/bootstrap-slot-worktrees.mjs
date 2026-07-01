#!/usr/bin/env node
/**
 * scripts/bootstrap-slot-worktrees.mjs
 *
 * Idempotent bootstrap for the SLOT-WORKTREE-MS0 fleet model.
 *
 * Creates one git worktree per NATO slot at H:/prism-slot-<slot> on a
 * slot/<slot> branch, plus an unslotted-chat fallback at H:/prism-unslotted
 * on work/unslotted. After this runs, /checkin-<nato> Step 2c can actually
 * migrate the chat into its slot worktree (today's git-commit-issue root
 * cause: the cutover never had worktrees to cut over INTO).
 *
 * Two extra special slots (added 2026-05-19 per operator directive):
 *   - zulu:  strategic main-tree committer + git-tree organizer. Its
 *             worktree IS the canonical H:/PRISM main tree (no separate
 *             prism-slot-zulu); zulu commits to cad-fusion-live-ms0
 *             with [MAIN] prefix. Just registered, not given its own tree.
 *   - sierra: system-viz node updater + expander. Gets its own slot
 *             worktree like the rest, runs system-viz regen + node-add
 *             scripts on a cadence.
 *
 * Idempotent: if the worktree path exists OR the branch exists already
 * pointing somewhere, the slot is skipped (logged). Operator can re-run
 * safely after partial failure or after adding new slots.
 *
 * Output: human-readable summary by default; --json for machine consumption.
 * Exit 0 = all slots provisioned (or already-present); 1 = at least one
 * provisioning step failed; 2 = preflight error (not in a git repo, etc).
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// Canonical fleet = all 26 NATO phonetic letters (alpha..zulu) per
// chat-slots.json schema. sierra is NATO-S — already covered. The
// 2026-05-19 operator directive added zulu as a separate meta-role
// (NOT a NATO letter): zulu works directly in H:/PRISM main tree
// as git-tree organizer and does NOT get its own slot worktree.
const SLOT_NAMES = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
  "golf",     // hygiene/integration slot
  "hotel", "india", "juliett", "kilo", "lima", "mike",
  "november", "oscar", "papa", "quebec", "romeo",
  "sierra",   // 2026-05-19 role: system-viz node updater/expander (NATO-S)
  "tango", "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
];

const UNSLOTTED_WORKTREE = {
  name: "unslotted",
  path: "H:/prism-unslotted",
  branch: "work/unslotted",
};

const PRISM_ROOT = "H:/PRISM";
const GIT_TIMEOUT_MS = 30000;          // for read ops (worktree list, show-ref)
const GIT_WRITE_TIMEOUT_MS = 180000;   // for `worktree add` — large index walk on this repo (16K+ files); 30s was too tight

function runGit(args, opts = {}) {
  // Write ops (worktree add, branch -b, etc.) need a longer ceiling on this
  // repo because git walks the full index. Caller can pass `write: true` to
  // pick GIT_WRITE_TIMEOUT_MS; otherwise defaults to the shorter read ceiling.
  const timeoutMs = opts.write ? GIT_WRITE_TIMEOUT_MS : GIT_TIMEOUT_MS;
  const r = spawnSync("git", args, {
    cwd: PRISM_ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
  });
  if (r.error) {
    return { ok: false, err: r.error.message };
  }
  if (r.status !== 0) {
    return { ok: false, err: (r.stderr || "").trim() || `exit ${r.status}` };
  }
  return { ok: true, out: (r.stdout || "").trim() };
}

function listExistingWorktrees() {
  const r = runGit(["worktree", "list", "--porcelain"]);
  if (!r.ok) return [];
  const lines = r.out.split("\n");
  const trees = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      if (cur) trees.push(cur);
      cur = { path: line.slice("worktree ".length).trim() };
    } else if (line.startsWith("branch ") && cur) {
      cur.branch = line.slice("branch ".length).trim();
    } else if (line.startsWith("HEAD ") && cur) {
      cur.head = line.slice("HEAD ".length).trim();
    }
  }
  if (cur) trees.push(cur);
  return trees;
}

function branchExists(branchRef) {
  return runGit(["show-ref", "--verify", `refs/heads/${branchRef}`]).ok;
}

function pathsEqualCI(a, b) {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

function provisionWorktree({ slot, targetPath, targetBranch }, existingTrees) {
  const existing = existingTrees.find((t) => pathsEqualCI(t.path, targetPath));

  if (existing) {
    return {
      slot, path: targetPath, branch: targetBranch,
      status: "already-present",
      detail: `worktree exists at ${existing.path} on ${existing.branch || existing.head}`,
    };
  }

  if (existsSync(targetPath)) {
    return {
      slot, path: targetPath, branch: targetBranch,
      status: "manual-cleanup-required",
      detail: `path ${targetPath} exists on disk but is not a registered worktree — operator must inspect and either re-add it or remove the orphan`,
    };
  }

  if (branchExists(targetBranch)) {
    const r = runGit(["worktree", "add", targetPath, targetBranch], { write: true });
    if (r.ok) {
      return {
        slot, path: targetPath, branch: targetBranch,
        status: "created-on-existing-branch",
        detail: `worktree attached to existing branch ${targetBranch}`,
      };
    }
    return {
      slot, path: targetPath, branch: targetBranch,
      status: "failed",
      detail: `git worktree add failed: ${r.err}`,
    };
  }

  const r = runGit(["worktree", "add", targetPath, "-b", targetBranch], { write: true });
  if (r.ok) {
    return {
      slot, path: targetPath, branch: targetBranch,
      status: "created",
      detail: `new worktree + new branch ${targetBranch}`,
    };
  }
  return {
    slot, path: targetPath, branch: targetBranch,
    status: "failed",
    detail: `git worktree add -b failed: ${r.err}`,
  };
}

function preflight() {
  const r = runGit(["rev-parse", "--show-toplevel"]);
  if (!r.ok) {
    return { ok: false, reason: `not in a git repo at ${PRISM_ROOT}: ${r.err}` };
  }
  if (!pathsEqualCI(r.out, PRISM_ROOT)) {
    return { ok: false, reason: `git toplevel is ${r.out}, expected ${PRISM_ROOT}` };
  }
  return { ok: true };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const asJson = args.has("--json");
  const dryRun = args.has("--dry-run");

  const pf = preflight();
  if (!pf.ok) {
    const out = { ok: false, error: "preflight-failed", reason: pf.reason };
    process.stdout.write(asJson ? JSON.stringify(out, null, 2) + "\n" : `PREFLIGHT FAILED: ${pf.reason}\n`);
    process.exit(2);
  }

  const existing = listExistingWorktrees();
  const results = [];

  const targets = [
    ...SLOT_NAMES.map((slot) => ({
      slot,
      targetPath: `H:/prism-slot-${slot}`,
      targetBranch: `slot/${slot}`,
    })),
    {
      slot: "(unslotted-fallback)",
      targetPath: UNSLOTTED_WORKTREE.path,
      targetBranch: UNSLOTTED_WORKTREE.branch,
    },
  ];

  for (const t of targets) {
    if (dryRun) {
      const isPresent = existing.some((e) => pathsEqualCI(e.path, t.targetPath));
      results.push({
        slot: t.slot, path: t.targetPath, branch: t.targetBranch,
        status: isPresent ? "already-present-dry-run" : "would-create-dry-run",
        detail: "dry run — no changes made",
      });
    } else {
      results.push(provisionWorktree(t, existing));
    }
  }

  const failed = results.filter((r) => r.status === "failed");
  const created = results.filter((r) => r.status === "created" || r.status === "created-on-existing-branch");
  const cleanup = results.filter((r) => r.status === "manual-cleanup-required");
  const present = results.filter((r) => r.status === "already-present");

  if (asJson) {
    process.stdout.write(JSON.stringify({
      ok: failed.length === 0,
      summary: {
        total: results.length,
        created: created.length,
        already_present: present.length,
        manual_cleanup_required: cleanup.length,
        failed: failed.length,
      },
      results,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(
      `SLOT WORKTREE BOOTSTRAP — ${dryRun ? "DRY RUN" : "APPLY"}\n` +
      `===========================================\n`
    );
    for (const r of results) {
      const marker =
        r.status === "created" || r.status === "created-on-existing-branch" ? "✓ NEW" :
        r.status === "already-present" || r.status === "already-present-dry-run" ? "· present" :
        r.status === "would-create-dry-run" ? "→ would-create" :
        r.status === "manual-cleanup-required" ? "⚠ MANUAL" :
        "✗ FAIL";
      process.stdout.write(`${marker.padEnd(20)} ${r.slot.padEnd(22)} ${r.path}\n`);
      if (r.status === "failed" || r.status === "manual-cleanup-required") {
        process.stdout.write(`                       └─ ${r.detail}\n`);
      }
    }
    process.stdout.write(
      `\nSummary: ${created.length} created, ${present.length} already-present, ` +
      `${cleanup.length} need cleanup, ${failed.length} failed\n`
    );
  }

  process.exit(failed.length === 0 ? 0 : 1);
}

main();
