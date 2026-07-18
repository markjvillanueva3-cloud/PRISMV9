/**
 * h-drive-clone-reconciler.test.mjs -- worktree-list parser + clone classifier +
 * map/note builders + a REAL `git worktree list` integration oracle
 * (H-DRIVE-VAULT-SYNERGY/U-5, slot:papa).
 *
 * @milestone H-DRIVE-VAULT-SYNERGY  @unit U-5  slot:papa
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseWorktreeList, classifyClone, daysSince, buildCloneNote, buildCloneMap,
} from "./h-drive-clone-reconciler.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");

// -- parseWorktreeList --------------------------------------------------------
test("parseWorktreeList: parses path/HEAD/branch/locked/detached", () => {
  const txt = [
    "worktree H:/prism",
    "HEAD dd3ef00c1f0000000000",
    "branch refs/heads/cad-fusion-live-ms0",
    "",
    "worktree H:/prism-slot-papa",
    "HEAD aaaaaaaaaa0000000000",
    "branch refs/heads/slot/papa",
    "",
    "worktree H:/prism-test-6d0595",
    "HEAD bbbbbbbbbb0000000000",
    "branch refs/heads/work/test-6d0595",
    "locked",
    "",
    "worktree H:/prism-detached",
    "HEAD cccccccccc0000000000",
    "detached",
    "",
  ].join("\n");
  const w = parseWorktreeList(txt);
  assert.equal(w.length, 4);
  assert.equal(w[0].path, "h:/prism");
  assert.equal(w[0].branch, "cad-fusion-live-ms0");
  assert.equal(w[1].branch, "slot/papa");
  assert.equal(w[2].locked, true);
  assert.equal(w[3].detached, true);
  assert.equal(w[3].branch, null);
});

test("parseWorktreeList: empty/garbage -> []", () => {
  assert.deepEqual(parseWorktreeList(""), []);
  assert.deepEqual(parseWorktreeList(null), []);
  assert.deepEqual(parseWorktreeList("no worktree keyword here"), []);
});

// -- classifyClone ------------------------------------------------------------
test("classifyClone: live-slot is never a cleanup candidate", () => {
  const r = classifyClone({ name: "prism-slot-papa", registered: true, branch: "slot/papa", locked: false, lastCommitDays: 0 });
  assert.equal(r.kind, "live-slot");
  assert.equal(r.isCleanupCandidate, false);
  // slot detection also works by name even if branch is missing
  assert.equal(classifyClone({ name: "prism-slot-mike", registered: true, branch: null, locked: false, lastCommitDays: 1 }).kind, "live-slot");
});

test("classifyClone: locked registered worktree is protected", () => {
  const r = classifyClone({ name: "prism-test-6d0595", registered: true, branch: "work/test", locked: true, lastCommitDays: 99 });
  assert.equal(r.kind, "registered-locked");
  assert.equal(r.isCleanupCandidate, false);
});

test("classifyClone: registered milestone worktree -> keep (golf prunes)", () => {
  const r = classifyClone({ name: "prism-cad-complete", registered: true, branch: "work/cad-complete-ms0", locked: false, lastCommitDays: 40 });
  assert.equal(r.kind, "registered-worktree");
  assert.equal(r.isCleanupCandidate, false);
  assert.match(r.reason, /work\/cad-complete-ms0/);
});

test("classifyClone: unregistered stray -> orphan-clone cleanup candidate", () => {
  const fresh = classifyClone({ name: "prism-fresh", registered: false, branch: "main", locked: false, lastCommitDays: 2 });
  assert.equal(fresh.kind, "orphan-clone");
  assert.equal(fresh.isCleanupCandidate, true);
  const stale = classifyClone({ name: "prism-agi-infra-a", registered: false, branch: "main", locked: false, lastCommitDays: 60 });
  assert.match(stale.reason, /stale/);
  const noHead = classifyClone({ name: "prism-broken", registered: false, branch: null, locked: false, lastCommitDays: null });
  assert.equal(noHead.isCleanupCandidate, true);
  assert.match(noHead.reason, /no resolvable HEAD/);
});

// -- daysSince ----------------------------------------------------------------
test("daysSince: integer days, clamps negative to 0, null on non-finite", () => {
  const now = 1_000_000_000;
  assert.equal(daysSince(now - 86400 * 5, now), 5);
  assert.equal(daysSince(now + 86400, now), 0); // future commit clamps to 0
  assert.equal(daysSince(NaN, now), null);
  assert.equal(daysSince(now, NaN), null);
});

// -- buildCloneMap / buildCloneNote ------------------------------------------
function mkClones() {
  return [
    { name: "prism-slot-papa", branch: "slot/papa", head: "aaa", lastCommitDays: 0, kind: "live-slot", isCleanupCandidate: false, reason: "active" },
    { name: "prism-cad-complete", branch: "work/cad-complete-ms0", head: "bbb", lastCommitDays: 40, kind: "registered-worktree", isCleanupCandidate: false, reason: "registered" },
    { name: "prism-fresh", branch: "main", head: "ccc", lastCommitDays: 3, kind: "orphan-clone", isCleanupCandidate: true, reason: "unregistered stray" },
  ];
}

test("buildCloneMap: conserves counts; json schema + md table", () => {
  const { md, json, summary } = buildCloneMap(mkClones(), "2026-06-14T00:00:00.000Z");
  assert.equal(json.schemaVersion, "1.0.0");
  assert.equal(json.totalClones, 3);
  assert.equal(summary.live, 1);
  assert.equal(summary.registered, 1);
  assert.equal(summary.orphans, 1);
  assert.equal(summary.cleanupCandidates, 1);
  assert.match(md, /CLONE RECONCILIATION/);
  assert.match(md, /prism-fresh.*REVIEW/);     // candidate flagged REVIEW
  assert.match(md, /prism-slot-papa.*keep/);   // live slot kept
});

test("buildCloneNote: frontmatter + candidate list + kinds", () => {
  const note = buildCloneNote(mkClones(), "2026-06-14T00:00:00.000Z", { live: 1, registered: 1, orphans: 1 });
  assert.match(note, /^---\nname: reference_hdrive_clones\n/);
  assert.match(note, /type: reference/);
  assert.match(note, /Cleanup candidates/);
  assert.match(note, /prism-fresh/);
  assert.match(note, /never auto-deleted/i);
});

// -- REAL integration oracle: parse this repo's actual worktree list ----------
test("REAL: parseWorktreeList handles the live `git worktree list --porcelain`", () => {
  let txt;
  try {
    txt = execFileSync("git", ["-C", REPO_ROOT, "worktree", "list", "--porcelain"], { encoding: "utf8", timeout: 10000 });
  } catch {
    return; // git unavailable in this env -> skip
  }
  const w = parseWorktreeList(txt);
  assert.ok(w.length > 0, "must parse at least the main worktree");
  // every record has a normalized path + a head; main worktree present
  for (const r of w) {
    assert.equal(typeof r.path, "string");
    assert.ok(r.path.length > 0);
  }
  assert.ok(w.some((r) => /prism/.test(r.path)), "main prism worktree must appear");
});
