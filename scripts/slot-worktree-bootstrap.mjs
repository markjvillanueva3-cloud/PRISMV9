#!/usr/bin/env node
/**
 * slot-worktree-bootstrap.mjs — one-shot Phase 0 setup of the per-slot
 * worktree architecture (see state/shared/SLOT-WORKTREE-ARCHITECTURE.md).
 *
 * Creates one worktree per NATO slot, each on a long-lived `slot/<name>`
 * branch off `origin/cad-fusion-live-ms0`. node_modules is junctioned from
 * the main tree to avoid 8× npm install. Records the bootstrap in
 * `state/shared/slot-worktrees.json`.
 *
 * IDEMPOTENT — safe to re-run. Skips slots whose worktree already exists
 * and is on the expected branch; reports clearly which slots were created,
 * skipped, or failed.
 *
 * SAFETY MODEL — this script mutates the local filesystem (git worktree add
 * + junctions). It does NOT push branches, does NOT modify the main tree's
 * working files, does NOT remove existing worktrees. It REFUSES to run if
 * the main tree has a half-finished cherry-pick/merge/rebase.
 *
 * Usage:
 *   node scripts/slot-worktree-bootstrap.mjs               # all 8 default slots
 *   node scripts/slot-worktree-bootstrap.mjs --slots alpha,bravo
 *   node scripts/slot-worktree-bootstrap.mjs --root D:/prism-slots
 *   node scripts/slot-worktree-bootstrap.mjs --base origin/main
 *   node scripts/slot-worktree-bootstrap.mjs --dry-run
 *   node scripts/slot-worktree-bootstrap.mjs --no-node-modules-junction
 *   node scripts/slot-worktree-bootstrap.mjs --help
 *
 * Exit codes: 0 ok (all targeted slots are now in expected state) ·
 *             1 ran but at least one slot failed ·
 *             2 misuse / refused-unsafe
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  lstatSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// 8 work slots (alpha..foxtrot + hotel + india) + golf (hygiene/integrator) = 9 total.
// Lets 8 chats commit concurrently with zero serialization (each writes a
// different slot/<name> branch in its own worktree). See
// state/shared/SLOT-WORKTREE-ARCHITECTURE.md §"Resolved design decisions" #3.
const DEFAULT_SLOTS = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
  "golf", // hygiene + integrator
  "hotel", "india", // additional work slots to hit 8 concurrent committers
];
const DEFAULT_BASE = "origin/cad-fusion-live-ms0";
const DEFAULT_ROOT = "H:/"; // worktrees go in H:/prism-slot-<name>
const GIT_TIMEOUT_MS = Number(process.env.PRISM_GIT_TIMEOUT_MS) || 300_000;
const VALID_SLOT_RE = /^[a-z][a-z0-9-]{1,31}$/;
// node_modules dirs we junction from main tree.
const NODE_MODULES_PATHS = ["node_modules", "mcp-server/node_modules"];

const STATE_FILE = join(REPO, "state", "shared", "slot-worktrees.json");
const IS_WINDOWS = platform() === "win32";

// ─── Arg parsing ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    slots: DEFAULT_SLOTS.slice(),
    base: DEFAULT_BASE,
    root: DEFAULT_ROOT,
    dryRun: false,
    noJunction: false,
    json: false,
    help: false,
  };
  const errors = [];
  for (let i = 0; i < argv.length; i += 1) {
    let raw = argv[i];
    let inline = null;
    const eq = raw.indexOf("=");
    if (raw.startsWith("--") && eq !== -1) {
      inline = raw.slice(eq + 1);
      raw = raw.slice(0, eq);
    }
    if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--no-node-modules-junction") args.noJunction = true;
    else if (raw === "--json") args.json = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else if (raw === "--slots") {
      const v = inline ?? argv[++i];
      if (!v) errors.push("--slots requires a comma-separated value");
      else args.slots = v.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (raw === "--base") {
      const v = inline ?? argv[++i];
      if (!v || v.startsWith("--")) errors.push("--base requires a value");
      else args.base = v;
    } else if (raw === "--root") {
      const v = inline ?? argv[++i];
      if (!v || v.startsWith("--")) errors.push("--root requires a value");
      else args.root = v;
    } else {
      errors.push(`unknown argument: ${raw}`);
    }
  }
  for (const slot of args.slots) {
    if (!VALID_SLOT_RE.test(slot)) {
      errors.push(`invalid slot name '${slot}' (must match ${VALID_SLOT_RE})`);
    }
  }
  return { args, errors };
}

// ─── Git helpers ────────────────────────────────────────────────────────────
function git(cwd, gitArgs, { timeoutMs = GIT_TIMEOUT_MS } = {}) {
  return execFileSync("git", gitArgs, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
}

function gitSafe(cwd, gitArgs, opts) {
  try {
    return { ok: true, out: git(cwd, gitArgs, opts).trim() };
  } catch (err) {
    return { ok: false, out: "", error: (err?.stderr || err?.message || String(err)).toString().trim() };
  }
}

/** Refuse to run if the main repo is in a half-finished merge/rebase/cherry-pick. */
function repoIsSafe() {
  for (const marker of ["CHERRY_PICK_HEAD", "MERGE_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"]) {
    const r = gitSafe(REPO, ["rev-parse", "--git-path", marker]);
    if (r.ok && r.out) {
      const abs = resolve(REPO, r.out);
      if (existsSync(abs)) return { ok: false, reason: `main tree has ${marker} in progress at ${abs}` };
    }
  }
  return { ok: true };
}

// ─── Junction creation ──────────────────────────────────────────────────────
/**
 * Create a directory junction (Windows) or symlink (POSIX) from `link` to
 * `target`. Both must be absolute. Returns {ok, error, note}. Idempotent:
 * if `link` already points to `target`, returns ok with note "exists".
 */
function makeJunction(target, link) {
  if (!existsSync(target)) {
    return { ok: false, error: `target does not exist: ${target}` };
  }
  if (existsSync(link)) {
    // Distinguish a junction/symlink (which we created on a previous run) from
    // a REAL directory (e.g. someone ran `npm install` inside the slot tree
    // before the bootstrap ran). lstatSync().isSymbolicLink() returns true for
    // BOTH symlinks (POSIX) and directory junctions (Windows) per Node docs.
    // Leaving a real directory in place would give the slot its OWN
    // node_modules — defeating the whole junction strategy.
    try {
      const st = lstatSync(link);
      if (st.isSymbolicLink()) {
        return { ok: true, note: "junction/symlink already present — leaving as-is" };
      }
      if (st.isDirectory()) {
        return {
          ok: false,
          error: `link path exists as a REAL directory (not a junction) — refusing to overwrite: ${link}. Move or remove it manually before re-running bootstrap.`,
        };
      }
      return { ok: false, error: `link path exists but is neither junction nor directory: ${link}` };
    } catch (err) {
      return { ok: false, error: `existing link unreadable: ${err.message}` };
    }
  }
  // Ensure parent exists.
  mkdirSync(dirname(link), { recursive: true });
  if (IS_WINDOWS) {
    // mklink /J creates a directory junction (no admin needed, no permission scope).
    const res = spawnSync("cmd.exe", ["/c", "mklink", "/J", link, target], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (res.status !== 0) {
      return { ok: false, error: `mklink /J failed: ${(res.stderr || res.stdout || "").trim()}` };
    }
    return { ok: true, note: "junction created" };
  }
  // POSIX: directory symlink.
  const res = spawnSync("ln", ["-s", target, link], { encoding: "utf8" });
  if (res.status !== 0) return { ok: false, error: `ln -s failed: ${(res.stderr || "").trim()}` };
  return { ok: true, note: "symlink created" };
}

// ─── Per-slot logic ─────────────────────────────────────────────────────────
function expectedWorktreePath(slot, root) {
  // root is the parent dir; the worktree dir name is canonical.
  return join(root, `prism-slot-${slot}`);
}

function expectedBranchName(slot) {
  return `slot/${slot}`;
}

/** @returns {{state: "absent"|"exists-correct"|"exists-wrong-branch"|"path-occupied", detail?: string}} */
function inspectSlot(slot, root) {
  const wtPath = expectedWorktreePath(slot, root);
  const branch = expectedBranchName(slot);
  // Is `wtPath` already a git worktree of THIS repo?
  const list = gitSafe(REPO, ["worktree", "list", "--porcelain"]);
  if (!list.ok) return { state: "absent", detail: `cannot list worktrees: ${list.error}` };
  const wts = parseWorktreeList(list.out);
  const match = wts.find((w) => resolve(w.path).toLowerCase() === resolve(wtPath).toLowerCase());
  if (match) {
    if (match.branch === branch) return { state: "exists-correct", detail: `branch=${match.branch}, head=${(match.head || "").slice(0, 10)}` };
    return { state: "exists-wrong-branch", detail: `expected ${branch}, found ${match.branch || "(detached)"}` };
  }
  if (existsSync(wtPath)) {
    return { state: "path-occupied", detail: `path exists but is not a git worktree of this repo` };
  }
  return { state: "absent" };
}

function parseWorktreeList(porcelain) {
  const entries = [];
  let cur = null;
  for (const rawLine of porcelain.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.startsWith("worktree ")) {
      if (cur) entries.push(cur);
      cur = { path: line.slice("worktree ".length), head: null, branch: null };
    } else if (!cur) continue;
    else if (line.startsWith("HEAD ")) cur.head = line.slice("HEAD ".length);
    else if (line.startsWith("branch ")) cur.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
  }
  if (cur) entries.push(cur);
  return entries;
}

function createSlot(slot, args) {
  const wtPath = expectedWorktreePath(slot, args.root);
  const branch = expectedBranchName(slot);
  const out = { slot, worktreePath: wtPath, branch, base: args.base, junctions: [], log: [] };

  const inspection = inspectSlot(slot, args.root);
  if (inspection.state === "exists-correct") {
    out.action = "skipped";
    out.reason = `already exists on ${branch} (${inspection.detail})`;
    return out;
  }
  if (inspection.state === "exists-wrong-branch") {
    out.action = "failed";
    out.reason = `path occupied by worktree on wrong branch: ${inspection.detail} — refusing to overwrite`;
    return out;
  }
  if (inspection.state === "path-occupied") {
    out.action = "failed";
    out.reason = `${wtPath} exists but is not a git worktree — refusing to overwrite`;
    return out;
  }

  // Does the branch already exist? If yes, check out into the worktree; if no, create.
  const branchExists = gitSafe(REPO, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]).ok;
  const baseExists = gitSafe(REPO, ["rev-parse", "--verify", "--quiet", `${args.base}^{commit}`]).ok;
  if (!baseExists) {
    out.action = "failed";
    out.reason = `base ref '${args.base}' not found locally — run \`git fetch origin\` first`;
    return out;
  }

  if (args.dryRun) {
    out.action = "would-create";
    out.reason = branchExists
      ? `would check out existing branch '${branch}' into ${wtPath}`
      : `would create branch '${branch}' off '${args.base}' and check out into ${wtPath}`;
    return out;
  }

  // Create the worktree. Two forms depending on whether the branch already exists.
  const cmd = branchExists
    ? ["worktree", "add", wtPath, branch]
    : ["worktree", "add", wtPath, "-b", branch, args.base];
  const r = gitSafe(REPO, cmd);
  if (!r.ok) {
    out.action = "failed";
    out.reason = `git worktree add failed: ${r.error.slice(0, 400)}`;
    return out;
  }
  out.log.push(`worktree added at ${wtPath} on ${branch}`);

  // Junction node_modules so we don't reinstall × N.
  if (!args.noJunction) {
    for (const rel of NODE_MODULES_PATHS) {
      const target = resolve(REPO, rel);
      const link = resolve(wtPath, rel);
      if (!existsSync(target)) {
        out.junctions.push({ path: rel, ok: false, note: "main tree has no " + rel + " — run `npm install` in main tree first" });
        continue;
      }
      const j = makeJunction(target, link);
      out.junctions.push({ path: rel, ok: j.ok, note: j.note || j.error });
      if (j.ok) out.log.push(`junctioned ${rel}`);
    }
  } else {
    out.log.push("node_modules junction skipped (--no-node-modules-junction)");
  }

  out.action = "created";
  return out;
}

// ─── State file ─────────────────────────────────────────────────────────────
function loadState() {
  if (!existsSync(STATE_FILE)) return { schemaVersion: 1, slots: {} };
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { schemaVersion: 1, slots: {} };
  }
}

function recordState(results, args) {
  const state = loadState();
  state.lastBootstrap = new Date().toISOString();
  state.base = args.base;
  state.root = args.root;
  for (const r of results) {
    state.slots[r.slot] = {
      worktreePath: r.worktreePath,
      branch: r.branch,
      base: r.base,
      lastAction: r.action,
      lastActionAt: state.lastBootstrap,
      junctions: r.junctions,
    };
  }
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  // Atomic-rename to avoid a peer reading a half-written state.
  // Temp file uses pid + crypto random so concurrent bootstrap invocations
  // on the same host don't collide and so a stale .tmp from a crashed run
  // can't be confused with a live one.
  const tmpSuffix = `${process.pid}.${randomBytes(6).toString("hex")}`;
  const tmp = `${STATE_FILE}.${tmpSuffix}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  try {
    // rename is atomic on Windows when target doesn't exist; if it does,
    // unlink first.
    if (existsSync(STATE_FILE)) {
      unlinkSync(STATE_FILE);
      renameSync(tmp, STATE_FILE);
    } else {
      renameSync(tmp, STATE_FILE);
    }
  } catch (err) {
    // Fallback: write directly (less atomic but won't lose data). Surface the
    // failure so the operator can see that the atomic guarantee dropped —
    // Karpathy R12 "fail loud", per PRISM CLAUDE.md anti-swallow rule.
    process.stderr.write(
      `slot-worktree-bootstrap: atomic rename failed (${err && err.message ? err.message : err}), ` +
      `falling back to non-atomic write of ${STATE_FILE}\n`,
    );
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
    // Best-effort cleanup of the orphan temp; ignore failures.
    try { unlinkSync(tmp); } catch {}
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
function main() {
  const { args, errors } = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "slot-worktree-bootstrap — Phase 0 setup of per-slot worktrees.\n" +
      "  --slots <a,b,c>            slots to create (default: " + DEFAULT_SLOTS.join(",") + ")\n" +
      "  --base <ref>               branch off this ref (default: " + DEFAULT_BASE + ")\n" +
      "  --root <dir>               worktree parent dir (default: " + DEFAULT_ROOT + ")\n" +
      "  --dry-run                  describe what would happen, change nothing\n" +
      "  --no-node-modules-junction skip the node_modules junction step\n" +
      "  --json | --help\n",
    );
    process.exit(0);
  }
  if (errors.length) {
    for (const e of errors) process.stderr.write(`slot-worktree-bootstrap: ${e}\n`);
    process.exit(2);
  }

  // Refuse if the main tree is in a half-finished operation.
  const safety = repoIsSafe();
  if (!safety.ok) {
    process.stderr.write(`slot-worktree-bootstrap: REFUSED — ${safety.reason}\n`);
    process.exit(2);
  }

  const results = [];
  for (const slot of args.slots) {
    results.push(createSlot(slot, args));
  }

  if (!args.dryRun) recordState(results, args);

  if (args.json) {
    process.stdout.write(JSON.stringify({ args, results }, null, 2) + "\n");
  } else {
    const created = results.filter((r) => r.action === "created").length;
    const skipped = results.filter((r) => r.action === "skipped").length;
    const wouldCreate = results.filter((r) => r.action === "would-create").length;
    const failed = results.filter((r) => r.action === "failed").length;
    process.stdout.write(
      `\nslot-worktree-bootstrap (base ${args.base}): ` +
      `${args.dryRun ? `${wouldCreate} would-create` : `${created} created`}, ${skipped} skipped, ${failed} failed\n`,
    );
    for (const r of results) {
      const tag = { created: "✓", "would-create": "·", skipped: "·", failed: "✗" }[r.action] || "?";
      process.stdout.write(`  ${tag} ${r.slot.padEnd(8)} ${r.action.padEnd(13)} ${r.reason || r.log.join("; ")}\n`);
      for (const j of r.junctions) {
        process.stdout.write(`      ${j.ok ? "✓" : "✗"} ${j.path}${j.note ? " — " + j.note : ""}\n`);
      }
    }
    if (!args.dryRun) process.stdout.write(`\nState recorded: ${STATE_FILE}\n`);
  }

  process.exit(results.some((r) => r.action === "failed") ? 1 : 0);
}

main();
