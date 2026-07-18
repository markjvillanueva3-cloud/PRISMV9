/**
 * Tests for fleet-reaper-leftover-hunter.mjs (U-FR-LEFTOVER-HUNTER).
 * node --test. Real reference fixtures + an end-to-end persistence proof that
 * routes the hunter output through the REAL updateLedger/shouldReap so the
 * two-snapshot "reap only after cross-sweep confirm" invariant is exercised
 * against production code, not a mock.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  findLeftoverToolProcs,
  resolveLeftoverFamilies,
  resolveLeftoverProtectRegex,
  DEFAULT_LEFTOVER_AGE_SEC,
  DEFAULT_LEFTOVER_TOOL_NAMES,
} from "./fleet-reaper-leftover-hunter.mjs";
import { updateLedger, shouldReap } from "../fleet-reaper-sweep.mjs";

const NOW = 1_700_000_000_000; // fixed epoch for deterministic ageSec
const OLD = NOW - 600 * 1000; // 600s old -> past the 300s default floor
const FRESH = NOW - 30 * 1000; // 30s old -> below the 60s hard floor

// Build a normalized proc record (snap.procs shape).
function proc(pid, name, ppid, { cmd = "git log", createdMs = OLD, rssBytes = 4_000_000 } = {}) {
  return { pid, ppid, name, cmd, createdMs, rssBytes };
}

function pidset(...pids) {
  return new Set(pids);
}
function byPid(...procs) {
  return new Map(procs.map((p) => [p.pid, p]));
}

// ---- detection: orphan tool subprocesses ARE candidates --------------------

test("dead-parent orphaned grep is a candidate (reason dead-parent)", () => {
  const g = proc(100, "grep.exe", 999, { cmd: "grep -rn foo H:/prism/src" });
  const out = findLeftoverToolProcs([g], pidset(/* 999 dead */), NOW, { procByPid: byPid(g) });
  assert.equal(out.length, 1);
  assert.equal(out[0].pid, 100);
  assert.equal(out[0].name, "grep");
  assert.equal(out[0].reason, "dead-parent");
});

test("non-claude live-parent orphaned git is a candidate (reason non-claude-parent)", () => {
  const parent = proc(50, "explorer.exe", 1, { cmd: "explorer" });
  const g = proc(101, "git.exe", 50, { cmd: "git diff --stat" });
  const out = findLeftoverToolProcs([g, parent], pidset(50, 1), NOW, { procByPid: byPid(g, parent) });
  assert.equal(out.length, 1);
  assert.equal(out[0].reason, "non-claude-parent");
});

test("no-parent-info aged orphan is a candidate", () => {
  const g = proc(102, "rg.exe", NaN, { cmd: "rg --files" });
  const out = findLeftoverToolProcs([g], pidset(), NOW, {});
  assert.equal(out.length, 1);
  assert.equal(out[0].reason, "no-parent-info");
});

// ---- the load-bearing false-orphan guards ----------------------------------

test("grep with a LIVE owned shell parent is NOT a leftover (in-flight tool subproc)", () => {
  const bash = proc(60, "bash.exe", 70, { cmd: "bash" });
  const g = proc(103, "grep.exe", 60, { cmd: "grep -cE foo" });
  // bash (60) is alive and an owned-parent -> grep is an in-flight Bash-tool invocation.
  const out = findLeftoverToolProcs([g, bash], pidset(60, 70), NOW, { procByPid: byPid(g, bash) });
  assert.equal(out.length, 0);
});

test("grep under a live claude ANCESTOR (non-owned intermediate) is skipped", () => {
  const claude = proc(70, "claude.exe", 1, { cmd: "claude" });
  const mid = proc(80, "weirdproc.exe", 70, { cmd: "weird" }); // alive, NOT an owned-parent
  const g = proc(104, "grep.exe", 80, { cmd: "grep foo" });
  // Immediate parent (weirdproc) is live+non-owned -> would classify non-claude-parent,
  // but a LIVE claude sits above it -> owned, skipped by the ancestry guard.
  const out = findLeftoverToolProcs([g, mid, claude], pidset(70, 80, 1), NOW, { procByPid: byPid(g, mid, claude) });
  assert.equal(out.length, 0);
});

// ---- allowlist + conservative gates ----------------------------------------

test("a long-running tool DAEMON (git fsmonitor) is protected", () => {
  const g = proc(105, "git.exe", 999, { cmd: "git fsmonitor--daemon run H:/prism" });
  const out = findLeftoverToolProcs([g], pidset(), NOW, { procByPid: byPid(g) });
  assert.equal(out.length, 0, "tool daemons must be allowlisted");
});

test("a `tail -f` watcher is protected", () => {
  const g = proc(115, "find.exe", 999, { cmd: "tail -f H:/prism/log.txt" }); // 'tail -f' shape
  const out = findLeftoverToolProcs([g], pidset(), NOW, {
    procByPid: byPid(g),
    families: new Set(["find", "tail"]),
  });
  assert.equal(out.length, 0);
});

test("a repo-searching leftover grep referencing /prism/ IS reapable (operator core case)", () => {
  // THE case the operator wants cleaned: an orphaned repo-search whose chat
  // finished. The node-worker tree-path allowlist must NOT protect it.
  const g = proc(109, "grep.exe", 999, { cmd: "grep -rn pattern H:/prism/src" });
  const out = findLeftoverToolProcs([g], pidset(), NOW, { procByPid: byPid(g) });
  assert.equal(out.length, 1, "an orphaned repo-search grep is exactly the leftover we clean");
  assert.equal(out[0].reason, "dead-parent");
});

test("empty cmdline is conservatively skipped (requireForeignCmd default)", () => {
  const g = proc(106, "grep.exe", 999, { cmd: "" });
  const out = findLeftoverToolProcs([g], pidset(), NOW, { procByPid: byPid(g) });
  assert.equal(out.length, 0);
});

test("protectedPids (sweep's own tree) are never candidates", () => {
  const g = proc(107, "git.exe", 999, { cmd: "git status" });
  const out = findLeftoverToolProcs([g], pidset(), NOW, { protectedPids: pidset(107), procByPid: byPid(g) });
  assert.equal(out.length, 0);
});

test("a process younger than the age floor is skipped", () => {
  const g = proc(108, "grep.exe", 999, { cmd: "grep foo", createdMs: FRESH });
  const out = findLeftoverToolProcs([g], pidset(), NOW, { procByPid: byPid(g) });
  assert.equal(out.length, 0);
});

// ---- family scoping: node/bash/cmd are NOT this hunter's job ----------------

test("node / bash / cmd are EXCLUDED (owned by sibling hunters / interactive)", () => {
  const n = proc(200, "node.exe", 999, { cmd: "node foo.js" });
  const b = proc(201, "bash.exe", 999, { cmd: "bash -c sleep" });
  const c = proc(202, "cmd.exe", 999, { cmd: "cmd /c dir" });
  const out = findLeftoverToolProcs([n, b, c], pidset(), NOW, { procByPid: byPid(n, b, c) });
  assert.equal(out.length, 0);
});

test("git/grep/rg/awk/sed/find ARE the covered families", () => {
  const procs = ["git", "grep", "rg", "awk", "sed", "find"].map((nm, i) =>
    proc(300 + i, `${nm}.exe`, 999, { cmd: `${nm} foo-arg-not-prism` }),
  );
  const out = findLeftoverToolProcs(procs, pidset(), NOW, { procByPid: byPid(...procs) });
  assert.equal(out.length, 6);
});

// ---- input hardening -------------------------------------------------------

test("empty / null / garbage input returns []", () => {
  assert.deepEqual(findLeftoverToolProcs([], new Set(), NOW), []);
  assert.deepEqual(findLeftoverToolProcs(null, new Set(), NOW), []);
  assert.deepEqual(findLeftoverToolProcs([null, {}, { pid: "x" }], new Set(), NOW), []);
});

test("defaults are sane reference values", () => {
  assert.equal(DEFAULT_LEFTOVER_AGE_SEC, 300);
  assert.ok(DEFAULT_LEFTOVER_TOOL_NAMES.has("git"));
  assert.ok(DEFAULT_LEFTOVER_TOOL_NAMES.has("grep"));
  assert.ok(!DEFAULT_LEFTOVER_TOOL_NAMES.has("node"));
  assert.ok(!DEFAULT_LEFTOVER_TOOL_NAMES.has("cmd"));
});

// ---- resolveLeftoverFamilies ----------------------------------------------

test("resolveLeftoverFamilies parses an override and strips dangerous shells", () => {
  const fam = resolveLeftoverFamilies("git, grep , cmd.exe, pwsh, ripgrep");
  assert.ok(fam.has("git"));
  assert.ok(fam.has("grep"));
  assert.ok(fam.has("ripgrep"));
  assert.ok(!fam.has("cmd"), "cmd must be stripped from any override");
  assert.ok(!fam.has("pwsh"), "pwsh must be stripped from any override");
});

test("resolveLeftoverFamilies falls back to default on empty/garbage", () => {
  assert.equal(resolveLeftoverFamilies(""), DEFAULT_LEFTOVER_TOOL_NAMES);
  assert.equal(resolveLeftoverFamilies("   "), DEFAULT_LEFTOVER_TOOL_NAMES);
  assert.equal(resolveLeftoverFamilies("cmd,pwsh"), DEFAULT_LEFTOVER_TOOL_NAMES, "all-stripped -> default, never empty");
});

// ---- INTEGRATION: two-snapshot persistence via the REAL ledger -------------
// Proves the operator's core requirement: a leftover is reaped ONLY after it
// persists across sweeps, and a transient (one-sweep) orphan is NEVER reaped.

function toLedgerCandidate(l) {
  return { pid: l.pid, createdMs: OLD, name: l.name, class: "leftover-tool", ownerSlot: null };
}
const CFG = { ageFloorMs: 60_000, killAfterMs: 600_000 }; // confirm window 10 min

test("persistence: a leftover is NOT reaped on first sweep (confirming)", () => {
  const g = proc(400, "grep.exe", 999, { cmd: "grep foo" });
  const found = findLeftoverToolProcs([g], pidset(), NOW, { procByPid: byPid(g) });
  assert.equal(found.length, 1);
  const ledger = updateLedger(null, found.map(toLedgerCandidate), NOW);
  const entry = ledger.candidates[`400:${OLD}`];
  assert.ok(entry, "candidate tracked on first sweep");
  assert.equal(entry.firstSeenAt, NOW);
  const decision = shouldReap(entry, { isCandidate: true, ageMs: 600_000 }, CFG, NOW);
  assert.equal(decision.reap, false, "first sweep must be in the confirming window");
});

test("persistence: reaped ONLY after the confirm window across a later sweep", () => {
  const g = proc(401, "grep.exe", 999, { cmd: "grep foo" });
  const t1 = NOW;
  const t2 = NOW + 700_000; // > killAfterMs later
  const found1 = findLeftoverToolProcs([g], pidset(), t1, { procByPid: byPid(g) });
  const ledger1 = updateLedger(null, found1.map(toLedgerCandidate), t1);
  // same grep still present on the later sweep
  const found2 = findLeftoverToolProcs([g], pidset(), t2, { procByPid: byPid(g) });
  const ledger2 = updateLedger(ledger1, found2.map(toLedgerCandidate), t2);
  const entry = ledger2.candidates[`401:${OLD}`];
  assert.equal(entry.firstSeenAt, t1, "firstSeenAt is KEPT across sweeps (the confirm clock)");
  assert.equal(entry.sweeps, 2);
  const decision = shouldReap(entry, { isCandidate: true, ageMs: 700_000 }, CFG, t2);
  assert.equal(decision.reap, true, "confirmed across sweeps -> reapable");
});

test("persistence: a TRANSIENT one-sweep orphan is DROPPED and never reaped", () => {
  const g = proc(402, "grep.exe", 999, { cmd: "grep foo" });
  const t1 = NOW;
  const t2 = NOW + 700_000;
  const found1 = findLeftoverToolProcs([g], pidset(), t1, { procByPid: byPid(g) });
  const ledger1 = updateLedger(null, found1.map(toLedgerCandidate), t1);
  // second sweep: the grep has completed and is GONE -> empty candidate set
  const ledger2 = updateLedger(ledger1, [], t2);
  assert.equal(ledger2.candidates[`402:${OLD}`], undefined, "transient orphan dropped from ledger");
  // with no ledger entry, shouldReap refuses
  const decision = shouldReap(undefined, { isCandidate: true, ageMs: 700_000 }, CFG, t2);
  assert.equal(decision.reap, false, "no tracked entry -> never reaped");
});
