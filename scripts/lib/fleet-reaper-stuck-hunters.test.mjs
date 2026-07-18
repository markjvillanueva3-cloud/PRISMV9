/**
 * Test suite for fleet-reaper-stuck-hunters.mjs.
 *
 * Each test encodes WHY the behavior matters: an accidentally relaxed kill
 * rule would reap live hook bashes (fleet-wide outage); an accidentally
 * tightened rule lets 19-hour stuck bashes accumulate (the original bug).
 *
 * Uses node:test (matches the sibling convention of fleet-reaper-crash-watch
 * tests, bg-app-throttle tests, etc — no vitest dependency on this side of
 * the repo).
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  findStuckBashes,
  findFsmonitorOrphans,
  findOrphanedSearchTools,
  findStaleSlotPidEntries,
  runStuckHunters,
  buildProtectedPidSet,
  DEFAULT_STUCK_BASH_AGE_SEC,
  DEFAULT_FSMONITOR_AGE_SEC,
  DEFAULT_ORPHAN_GRACE_SEC,
  DEFAULT_SEARCHTOOL_AGE_SEC,
} from "./fleet-reaper-stuck-hunters.mjs";

const NOW = 1_700_000_000_000;
const SEC = 1000;
const MIN = 60 * SEC;

// --- findOrphanedSearchTools (search-tool orphan reaping, 2026-06-14) ---
// WHY: a grep/find/tail whose spawning chat DIED keeps running with stdout on a
// dead pipe = pure waste; the reaper covered node/bash/git/fsmonitor but not these
// (a 12.6h orphaned tail was found live). A relaxed rule would reap an active
// in-flight search (live parent); a tightened rule lets orphans accumulate.

test("findOrphanedSearchTools -- grep dead-parent + age>=300s is reaped (chat-leftover)", () => {
  const procs = [
    { pid: 300, ppid: 99, name: "grep.exe", createdMs: NOW - 6 * MIN, rssBytes: 2e6, cmd: "grep -rln foo" },
  ];
  const live = new Set([300]); // ppid 99 is DEAD (not in live set)
  const out = findOrphanedSearchTools(procs, live, { now: NOW });
  assert.equal(out.length, 1);
  assert.equal(out[0].pid, 300);
});

test("findOrphanedSearchTools -- grep with LIVE parent is SPARED (active in-flight search)", () => {
  const procs = [
    { pid: 301, ppid: 50, name: "grep.exe", createdMs: NOW - 30 * MIN, rssBytes: 2e6, cmd: "grep -rln foo" },
  ];
  const live = new Set([50, 301]); // parent 50 alive
  assert.equal(findOrphanedSearchTools(procs, live, { now: NOW }).length, 0);
});

test("findOrphanedSearchTools -- fresh orphan (dead parent, age<120s floor) is SPARED", () => {
  const procs = [
    { pid: 302, ppid: 99, name: "grep.exe", createdMs: NOW - 60 * SEC, rssBytes: 2e6, cmd: "grep x" },
  ];
  const live = new Set([302]);
  assert.equal(findOrphanedSearchTools(procs, live, { now: NOW }).length, 0);
});

test("findOrphanedSearchTools -- protected pid (sweep's own tree) is SPARED", () => {
  const procs = [
    { pid: 303, ppid: 99, name: "find.exe", createdMs: NOW - 30 * MIN, rssBytes: 2e6, cmd: "find ." },
  ];
  const live = new Set([303]);
  const protectedPids = new Set([303]);
  assert.equal(findOrphanedSearchTools(procs, live, { now: NOW, protectedPids }).length, 0);
});

test("findOrphanedSearchTools -- non-search-tool (node.exe) dead-parent is NOT matched here", () => {
  const procs = [
    { pid: 304, ppid: 99, name: "node.exe", createdMs: NOW - 30 * MIN, rssBytes: 2e6, cmd: "node x" },
  ];
  const live = new Set([304]);
  assert.equal(findOrphanedSearchTools(procs, live, { now: NOW }).length, 0);
});

test("findOrphanedSearchTools -- missing createdMs is skipped (cannot classify safely)", () => {
  const procs = [
    { pid: 305, ppid: 99, name: "tail.exe", rssBytes: 2e6, cmd: "tail -f x" },
  ];
  const live = new Set([305]);
  assert.equal(findOrphanedSearchTools(procs, live, { now: NOW }).length, 0);
});

test("runStuckHunters -- returns a searchToolOrphans array (wired into the orchestrator)", () => {
  const procs = [
    { pid: 306, ppid: 99, name: "grep.exe", createdMs: NOW - 10 * MIN, rssBytes: 2e6, cmd: "grep z" },
  ];
  const live = new Set([306]);
  const report = runStuckHunters({ procs, livePidSet: live, slotsData: null, now: NOW, protectedPids: new Set() });
  assert.ok(Array.isArray(report.searchToolOrphans));
  assert.equal(report.searchToolOrphans.length, 1);
});

// ─── findStuckBashes ────────────────────────────────────────────────────

test("findStuckBashes — fresh bash <5min with live claude parent is KEPT (in-flight hook)", () => {
  const procs = [
    { pid: 100, ppid: 50, name: "bash.exe", createdMs: NOW - 10 * SEC, rssBytes: 8e6, cmd: "bash -c hook" },
  ];
  const live = new Set([50, 100]);
  assert.equal(findStuckBashes(procs, live, { now: NOW }).length, 0);
});

test("findStuckBashes — bash >5min with live claude parent → reaped as stuck-hook-chain", () => {
  const procs = [
    { pid: 200, ppid: 50, name: "bash.exe", createdMs: NOW - 6 * MIN, rssBytes: 8e6, cmd: "bash -c stuck" },
  ];
  const live = new Set([50, 200]);
  const out = findStuckBashes(procs, live, { now: NOW });
  assert.equal(out.length, 1);
  assert.equal(out[0].pid, 200);
  assert.match(out[0].reason, /stuck-hook-chain/);
  assert.ok(out[0].ageSec >= 5 * 60);
});

test("findStuckBashes — bash with DEAD parent older than grace → reaped as orphan", () => {
  const procs = [
    { pid: 300, ppid: 999, name: "bash.exe", createdMs: NOW - 90 * SEC, rssBytes: 5e6, cmd: "bash -c orphan" },
  ];
  const live = new Set([300]); // parent 999 NOT in live set
  const out = findStuckBashes(procs, live, { now: NOW });
  assert.equal(out.length, 1);
  assert.equal(out[0].pid, 300);
  assert.match(out[0].reason, /orphan-bash/);
});

test("findStuckBashes — fresh orphan (<60s grace) is KEPT — protects legit short detach", () => {
  const procs = [
    { pid: 400, ppid: 999, name: "bash.exe", createdMs: NOW - 30 * SEC, rssBytes: 5e6, cmd: "bash" },
  ];
  const live = new Set([400]);
  assert.equal(findStuckBashes(procs, live, { now: NOW }).length, 0);
});

test("findStuckBashes — case-insensitive name match catches Bash.exe and BASH.EXE", () => {
  const procs = [
    { pid: 510, ppid: 50, name: "Bash.exe", createdMs: NOW - 6 * MIN, rssBytes: 1e6, cmd: "x" },
    { pid: 520, ppid: 50, name: "BASH.EXE", createdMs: NOW - 6 * MIN, rssBytes: 1e6, cmd: "x" },
    { pid: 530, ppid: 50, name: "sh.exe",   createdMs: NOW - 6 * MIN, rssBytes: 1e6, cmd: "x" },
  ];
  const live = new Set([50, 510, 520, 530]);
  const out = findStuckBashes(procs, live, { now: NOW });
  assert.equal(out.length, 3);
});

test("findStuckBashes — non-bash names ignored (claude.exe, node.exe, cmd.exe)", () => {
  const procs = [
    { pid: 1, ppid: 0, name: "claude.exe", createdMs: NOW - 10 * MIN, rssBytes: 1e9, cmd: "" },
    { pid: 2, ppid: 0, name: "node.exe",   createdMs: NOW - 10 * MIN, rssBytes: 1e9, cmd: "" },
    { pid: 3, ppid: 0, name: "cmd.exe",    createdMs: NOW - 10 * MIN, rssBytes: 1e9, cmd: "" },
  ];
  assert.equal(findStuckBashes(procs, new Set(), { now: NOW }).length, 0);
});

test("findStuckBashes — missing createdMs is SKIPPED, not killed", () => {
  const procs = [
    { pid: 600, ppid: 50, name: "bash.exe", createdMs: null, rssBytes: 1e6, cmd: "x" },
    { pid: 601, ppid: 50, name: "bash.exe", createdMs: undefined, rssBytes: 1e6, cmd: "x" },
    { pid: 602, ppid: 50, name: "bash.exe", createdMs: NaN, rssBytes: 1e6, cmd: "x" },
  ];
  assert.equal(findStuckBashes(procs, new Set([50, 600, 601, 602]), { now: NOW }).length, 0);
});

test("findStuckBashes — opts.ageSec=0 is clamped to MIN (cannot scorched-earth fresh hooks)", () => {
  const procs = [
    { pid: 700, ppid: 50, name: "bash.exe", createdMs: NOW - 30 * SEC, rssBytes: 1e6, cmd: "x" },
  ];
  // 30s-old bash with ageSec:0 → would be killed if clamp didn't bound to 60s min
  const out = findStuckBashes(procs, new Set([50, 700]), { now: NOW, ageSec: 0 });
  assert.equal(out.length, 0, "clamp must protect a 30s-old bash even with ageSec=0");
});

test("findStuckBashes — empty/null inputs return [] (defense)", () => {
  assert.deepEqual(findStuckBashes([], new Set(), {}), []);
  assert.deepEqual(findStuckBashes(null, new Set(), {}), []);
  assert.deepEqual(findStuckBashes(undefined, null, {}), []);
});

test("findStuckBashes — null livePidSet → every parent treated as dead (still gated by grace)", () => {
  const procs = [
    { pid: 800, ppid: 50, name: "bash.exe", createdMs: NOW - 90 * SEC, rssBytes: 1e6, cmd: "x" },
  ];
  // null livePidSet: parent appears dead → orphan branch with age 90s > 60s grace
  const out = findStuckBashes(procs, null, { now: NOW });
  assert.equal(out.length, 1);
  assert.match(out[0].reason, /orphan-bash/);
});

// ─── findFsmonitorOrphans ───────────────────────────────────────────────

test("findFsmonitorOrphans — git fsmonitor--daemon >2h → reaped", () => {
  const procs = [
    { pid: 900, ppid: 999, name: "git.exe", createdMs: NOW - 3 * 60 * MIN, rssBytes: 12e6,
      cmd: "git fsmonitor--daemon run --detach --ipc-threads=8" },
  ];
  const out = findFsmonitorOrphans(procs, new Set([900]), { now: NOW });
  assert.equal(out.length, 1);
  assert.equal(out[0].pid, 900);
  assert.match(out[0].reason, /stale-fsmonitor/);
});

test("findFsmonitorOrphans — fresh fsmonitor (<2h) is KEPT", () => {
  const procs = [
    { pid: 901, ppid: 999, name: "git.exe", createdMs: NOW - 30 * MIN, rssBytes: 10e6,
      cmd: "git fsmonitor--daemon" },
  ];
  assert.equal(findFsmonitorOrphans(procs, new Set([901]), { now: NOW }).length, 0);
});

test("findFsmonitorOrphans — interactive git commands NEVER matched (`git log`, `git diff`)", () => {
  const procs = [
    { pid: 910, ppid: 50, name: "git.exe", createdMs: NOW - 5 * 60 * MIN, rssBytes: 30e6,
      cmd: "git log --oneline -50" },
    { pid: 911, ppid: 50, name: "git.exe", createdMs: NOW - 5 * 60 * MIN, rssBytes: 30e6,
      cmd: "git diff HEAD" },
    { pid: 912, ppid: 50, name: "git.exe", createdMs: NOW - 5 * 60 * MIN, rssBytes: 30e6,
      cmd: "git status" },
  ];
  assert.equal(findFsmonitorOrphans(procs, new Set([50, 910, 911, 912]), { now: NOW }).length, 0);
});

test("findFsmonitorOrphans — binary named git-fsmonitor--daemon.exe is matched by name", () => {
  const procs = [
    { pid: 920, ppid: 999, name: "git-fsmonitor--daemon.exe", createdMs: NOW - 3 * 60 * MIN,
      rssBytes: 12e6, cmd: "" },
  ];
  const out = findFsmonitorOrphans(procs, new Set([920]), { now: NOW });
  assert.equal(out.length, 1);
});

test("findFsmonitorOrphans — opts.ageSec=0 clamped (cannot reap fresh daemon)", () => {
  const procs = [
    { pid: 930, ppid: 999, name: "git.exe", createdMs: NOW - 60 * SEC, rssBytes: 5e6,
      cmd: "git fsmonitor--daemon" },
  ];
  // ageSec:0 → clamped to MIN_FSMONITOR_AGE_SEC=300s; this 60s daemon must NOT be reaped
  assert.equal(findFsmonitorOrphans(procs, new Set([930]), { now: NOW, ageSec: 0 }).length, 0);
});

// ─── findStaleSlotPidEntries ────────────────────────────────────────────

test("findStaleSlotPidEntries — record-shape slot with DEAD pid is detected", () => {
  // Canonical on-disk shape: `{slots: {alpha: {pid, ...}}}`
  const slotsData = {
    schemaVersion: 1,
    slots: {
      alpha: { chatId: "claude-aaaa1111", pid: 99999, lastHeartbeat: "2026-05-21T16:00:00Z" },
      bravo: { chatId: "claude-bbbb2222", pid: 1234,  lastHeartbeat: "2026-05-21T16:30:00Z" },
    },
  };
  const live = new Set([1234]); // alpha's pid 99999 NOT alive
  const out = findStaleSlotPidEntries(slotsData, live);
  assert.equal(out.length, 1);
  assert.equal(out[0].slot, "alpha");
  assert.equal(out[0].deadPid, 99999);
});

test("findStaleSlotPidEntries — CLI-shape (array) is also accepted (back-compat)", () => {
  const slotsData = {
    slots: [
      { slot: "alpha", status: "crashed", state: { chatId: "claude-x", pid: 99998, lastHeartbeat: null } },
      { slot: "bravo", status: "live",    state: { chatId: "claude-y", pid: 1234,  lastHeartbeat: null } },
    ],
  };
  const out = findStaleSlotPidEntries(slotsData, new Set([1234]));
  assert.equal(out.length, 1);
  assert.equal(out[0].slot, "alpha");
});

test("findStaleSlotPidEntries — null slot (unclaimed) is skipped", () => {
  const slotsData = {
    slots: { alpha: null, bravo: { chatId: "claude-y", pid: 99999, lastHeartbeat: null } },
  };
  const out = findStaleSlotPidEntries(slotsData, new Set([]));
  assert.equal(out.length, 1);
  assert.equal(out[0].slot, "bravo");
});

test("findStaleSlotPidEntries — missing slotsData / wrong shape → []", () => {
  assert.deepEqual(findStaleSlotPidEntries(null, new Set()), []);
  assert.deepEqual(findStaleSlotPidEntries({}, new Set()), []);
  assert.deepEqual(findStaleSlotPidEntries({ slots: "bad" }, new Set()), []);
  assert.deepEqual(findStaleSlotPidEntries({ slots: 42 }, new Set()), []);
});

test("findStaleSlotPidEntries — pid=0 or invalid pid is skipped (defense)", () => {
  const slotsData = {
    slots: {
      a: { chatId: "x", pid: 0 },
      b: { chatId: "y", pid: -5 },
      c: { chatId: "z", pid: "not-a-number" },
      d: { chatId: "w", pid: 99999 }, // only this should be detected
    },
  };
  const out = findStaleSlotPidEntries(slotsData, new Set([]));
  assert.equal(out.length, 1);
  assert.equal(out[0].slot, "d");
});

// ─── runStuckHunters orchestrator ───────────────────────────────────────

test("runStuckHunters — all three hunters wired through one call", () => {
  const procs = [
    { pid: 100, ppid: 50, name: "bash.exe",
      createdMs: NOW - 6 * MIN, rssBytes: 8e6, cmd: "bash -c stuck" },
    { pid: 900, ppid: 999, name: "git.exe",
      createdMs: NOW - 3 * 60 * MIN, rssBytes: 12e6,
      cmd: "git fsmonitor--daemon" },
  ];
  const slotsData = {
    slots: { alpha: { chatId: "claude-x", pid: 99999, lastHeartbeat: null } },
  };
  const live = new Set([50, 100, 900]); // claude alive, bash + git both alive but parent of git dead
  const r = runStuckHunters({ procs, livePidSet: live, slotsData, now: NOW });
  assert.equal(r.stuckBashes.length, 1);
  assert.equal(r.fsmonitorOrphans.length, 1);
  assert.equal(r.staleSlotEntries.length, 1);
});

test("runStuckHunters — disable flags isolate each hunter independently", () => {
  const procs = [
    { pid: 100, ppid: 50, name: "bash.exe", createdMs: NOW - 6 * MIN, rssBytes: 1e6, cmd: "x" },
    { pid: 900, ppid: 999, name: "git.exe", createdMs: NOW - 3 * 60 * MIN, rssBytes: 1e6,
      cmd: "git fsmonitor--daemon" },
  ];
  const slotsData = { slots: { alpha: { chatId: "x", pid: 99999 } } };
  const live = new Set([50, 100, 900]);
  const r = runStuckHunters({
    procs, livePidSet: live, slotsData, now: NOW,
    enableStuckBash: false, enableFsmonitor: true, enableStaleSlot: false,
  });
  assert.equal(r.stuckBashes.length, 0);
  assert.equal(r.fsmonitorOrphans.length, 1);
  assert.equal(r.staleSlotEntries.length, 0);
});

test("DEFAULTS exported and have sensible values", () => {
  assert.equal(DEFAULT_STUCK_BASH_AGE_SEC, 300);
  assert.equal(DEFAULT_FSMONITOR_AGE_SEC, 7200);
  assert.equal(DEFAULT_ORPHAN_GRACE_SEC, 60);
});

// ─── SELF-PROTECTION (scrutiny BLOCKER fix, reviewer C 2026-05-21) ───────

test("buildProtectedPidSet — self + ancestors + descendants all collected", () => {
  // Tree: 10(root) → 20 → 30(SELF) → 40 → 50 ; plus sibling 60 under 20
  const procs = [
    { pid: 10, ppid: 1 },
    { pid: 20, ppid: 10 },
    { pid: 30, ppid: 20 }, // self
    { pid: 40, ppid: 30 }, // child
    { pid: 50, ppid: 40 }, // grandchild
    { pid: 60, ppid: 20 }, // sibling — must NOT be protected
  ];
  const set = buildProtectedPidSet(procs, 30);
  assert.ok(set.has(30), "self");
  assert.ok(set.has(20), "parent");
  assert.ok(set.has(10), "grandparent");
  assert.ok(set.has(40), "child");
  assert.ok(set.has(50), "grandchild");
  assert.ok(!set.has(60), "sibling must NOT be protected");
  assert.equal(set.size, 5);
});

test("buildProtectedPidSet — cycle in ppid chain does not infinite-loop", () => {
  const procs = [
    { pid: 1, ppid: 2 },
    { pid: 2, ppid: 1 }, // cycle
    { pid: 3, ppid: 2 }, // self
  ];
  const set = buildProtectedPidSet(procs, 3);
  assert.ok(set.has(3) && set.has(2) && set.has(1));
});

test("buildProtectedPidSet — bad selfPid / empty procs → minimal safe set", () => {
  assert.equal(buildProtectedPidSet([], 0).size, 0);
  assert.equal(buildProtectedPidSet([], -1).size, 0);
  assert.equal(buildProtectedPidSet(null, 99).size, 1, "self still protected with null procs");
  assert.equal(buildProtectedPidSet([], 99).size, 1);
});

test("findStuckBashes — a PID in protectedPids is NEVER reaped (self-kill guard)", () => {
  // This bash is 6min old with a live parent — normally a kill target.
  const procs = [
    { pid: 777, ppid: 50, name: "bash.exe", createdMs: NOW - 6 * MIN, rssBytes: 1e6, cmd: "sweep's own shell" },
  ];
  const live = new Set([50, 777]);
  const protectedPids = new Set([777]); // 777 is the sweep's own bash
  const out = findStuckBashes(procs, live, { now: NOW, protectedPids });
  assert.equal(out.length, 0, "the sweep must never reap its own protected bash");
});

test("findStuckBashes — protectedPids does not over-protect (unprotected stuck bash still reaped)", () => {
  const procs = [
    { pid: 777, ppid: 50, name: "bash.exe", createdMs: NOW - 6 * MIN, rssBytes: 1e6, cmd: "self" },
    { pid: 888, ppid: 50, name: "bash.exe", createdMs: NOW - 6 * MIN, rssBytes: 1e6, cmd: "stuck" },
  ];
  const live = new Set([50, 777, 888]);
  const out = findStuckBashes(procs, live, { now: NOW, protectedPids: new Set([777]) });
  assert.equal(out.length, 1);
  assert.equal(out[0].pid, 888, "only the unprotected stuck bash is reaped");
});

test("findStuckBashes — reason names the ACTUAL parent process via procByPid", () => {
  const procs = [
    { pid: 100, ppid: 50, name: "bash.exe", createdMs: NOW - 6 * MIN, rssBytes: 1e6, cmd: "x" },
    { pid: 50, ppid: 1, name: "cmd.exe", createdMs: NOW - 60 * MIN, rssBytes: 1e6, cmd: "" },
  ];
  const procByPid = new Map(procs.map((p) => [p.pid, p]));
  const out = findStuckBashes(procs, new Set([50, 100]), { now: NOW, procByPid });
  assert.equal(out.length, 1);
  assert.match(out[0].reason, /live parent cmd\.exe/,
    "reason must name the real parent, not blindly claim claude.exe");
});

test("findFsmonitorOrphans — fsmonitor with a LIVE parent is SPARED (git still running)", () => {
  // A fsmonitor 3h old but its spawning git (ppid 555) is still alive.
  const procs = [
    { pid: 900, ppid: 555, name: "git.exe", createdMs: NOW - 3 * 60 * MIN, rssBytes: 12e6,
      cmd: "git fsmonitor--daemon" },
  ];
  const live = new Set([900, 555]); // parent 555 ALIVE
  assert.equal(findFsmonitorOrphans(procs, live, { now: NOW }).length, 0,
    "a fsmonitor whose spawning git is alive must not be killed mid-operation");
});

test("findFsmonitorOrphans — dead-parent fsmonitor >2h IS reaped", () => {
  const procs = [
    { pid: 900, ppid: 555, name: "git.exe", createdMs: NOW - 3 * 60 * MIN, rssBytes: 12e6,
      cmd: "git fsmonitor--daemon" },
  ];
  const live = new Set([900]); // parent 555 DEAD
  assert.equal(findFsmonitorOrphans(procs, live, { now: NOW }).length, 1);
});

test("findFsmonitorOrphans — protectedPids excludes a fsmonitor in the sweep tree", () => {
  const procs = [
    { pid: 900, ppid: 555, name: "git.exe", createdMs: NOW - 3 * 60 * MIN, rssBytes: 12e6,
      cmd: "git fsmonitor--daemon" },
  ];
  const out = findFsmonitorOrphans(procs, new Set([900]), { now: NOW, protectedPids: new Set([900]) });
  assert.equal(out.length, 0);
});

test("runStuckHunters — threads protectedPids to both kill-emitting hunters", () => {
  const procs = [
    { pid: 100, ppid: 50, name: "bash.exe", createdMs: NOW - 6 * MIN, rssBytes: 1e6, cmd: "x" },
    { pid: 900, ppid: 555, name: "git.exe", createdMs: NOW - 3 * 60 * MIN, rssBytes: 1e6,
      cmd: "git fsmonitor--daemon" },
  ];
  const live = new Set([50, 100, 900]); // git parent 555 dead
  const r = runStuckHunters({
    procs, livePidSet: live, slotsData: null, now: NOW,
    protectedPids: new Set([100, 900]), // both kill targets protected
  });
  assert.equal(r.stuckBashes.length, 0, "protected bash not reaped");
  assert.equal(r.fsmonitorOrphans.length, 0, "protected fsmonitor not reaped");
});
