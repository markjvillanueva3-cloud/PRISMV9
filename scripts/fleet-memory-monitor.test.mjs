/**
 * fleet-memory-monitor.test.mjs — pure-function regression suite.
 *
 * Plain node:test because the repo's vitest harness has a pre-existing vite
 * SSR transform bug under .claude/helpers/ (documented in fleet-reaper.test.mjs
 * + chat-slots.mjs comments). Same defensive pattern: assert on
 * intent-encoding values, never on stubs.
 *
 * Coverage targets — every pure / DI-friendly export:
 *   findAnchorAncestor   — ancestry walk correctness (self, parent, deep, cycle, orphan)
 *   attributeProcesses   — RSS aggregation + unowned bucket
 *   decideLevel          — worst-of-physical-or-commit
 *   pickLargestSlot      — sort + edge cases
 *   decideAdvisory       — emit cadence (cooldown + sustained-ticks)
 *   readSlotsForAttribution — both schema shapes + missing/malformed files
 *
 * samplePowerShell is integration-only (real CIM) — not tested here. The
 * monitor's main() exits 3 on any PS failure (R12 fail-loud), so the
 * runtime contract is verified by the live `--once` run after installer.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  findAnchorAncestor,
  findPsAncestor,
  attributeProcesses,
  decideLevel,
  pickLargestSlot,
  decideAdvisory,
  readSlotsForAttribution,
  readPinsForAttribution,
  LEDGER_SCHEMA_VERSION,
  DEFAULT_WARN_PCT,
  DEFAULT_CRIT_PCT,
  DEFAULT_SUSTAINED_TICKS,
} from "./fleet-memory-monitor.mjs";

// ─── findAnchorAncestor ─────────────────────────────────────────────────────

test("findAnchorAncestor: self-anchored process returns own pid", () => {
  const procs = [{ pid: 100, ppid: 4, name: "claude.exe", rssBytes: 0 }];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findAnchorAncestor(100, idx, new Set([100])), 100);
});

test("findAnchorAncestor: direct parent match", () => {
  const procs = [
    { pid: 100, ppid: 4, name: "claude.exe", rssBytes: 0 },
    { pid: 200, ppid: 100, name: "node.exe", rssBytes: 0 },
  ];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findAnchorAncestor(200, idx, new Set([100])), 100);
});

test("findAnchorAncestor: deep ancestry (5 hops)", () => {
  const procs = [
    { pid: 1, ppid: 0, name: "anchor", rssBytes: 0 },
    { pid: 2, ppid: 1, name: "n", rssBytes: 0 },
    { pid: 3, ppid: 2, name: "n", rssBytes: 0 },
    { pid: 4, ppid: 3, name: "n", rssBytes: 0 },
    { pid: 5, ppid: 4, name: "n", rssBytes: 0 },
    { pid: 6, ppid: 5, name: "n", rssBytes: 0 },
  ];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findAnchorAncestor(6, idx, new Set([1])), 1);
});

test("findAnchorAncestor: cycle detection returns null", () => {
  // A→B→A cycle should not loop forever
  const procs = [
    { pid: 10, ppid: 11, name: "a", rssBytes: 0 },
    { pid: 11, ppid: 10, name: "b", rssBytes: 0 },
  ];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findAnchorAncestor(10, idx, new Set([999])), null);
});

test("findAnchorAncestor: orphan (ppid not in table) returns null", () => {
  const procs = [{ pid: 50, ppid: 9999, name: "n", rssBytes: 0 }];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findAnchorAncestor(50, idx, new Set([1])), null);
});

test("findAnchorAncestor: empty anchor set returns null without walking", () => {
  const procs = [{ pid: 1, ppid: 2, name: "n", rssBytes: 0 }];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findAnchorAncestor(1, idx, new Set()), null);
});

// ─── attributeProcesses ─────────────────────────────────────────────────────

test("attributeProcesses: per-tree RSS aggregation (claude.exe anchors)", () => {
  const procs = [
    { pid: 100, ppid: 4, name: "claude.exe", rssBytes: 1_000_000_000 },  // tree-100 anchor
    { pid: 200, ppid: 100, name: "node.exe", rssBytes: 500_000_000 },     // child of 100
    { pid: 300, ppid: 200, name: "git.exe", rssBytes: 50_000_000 },        // grandchild
    { pid: 400, ppid: 4, name: "claude.exe", rssBytes: 2_000_000_000 },  // tree-400 anchor
    { pid: 500, ppid: 400, name: "node.exe", rssBytes: 300_000_000 },     // child of 400
  ];
  const r = attributeProcesses(procs);
  assert.equal(r.perTree["tree-100"].rssBytes, 1_550_000_000, "tree-100 = self+node+git");
  assert.equal(r.perTree["tree-100"].count, 3);
  assert.equal(r.perTree["tree-100"].anchorPid, 100);
  assert.equal(r.perTree["tree-400"].rssBytes, 2_300_000_000, "tree-400 = self+node");
  assert.equal(r.perTree["tree-400"].count, 2);
  assert.equal(r.unowned.count, 0);
});

test("attributeProcesses: orphan node.exe (no claude.exe ancestor) → unowned", () => {
  const procs = [
    { pid: 999, ppid: 4, name: "node.exe", rssBytes: 100_000_000 },   // no claude.exe parent
    { pid: 100, ppid: 4, name: "claude.exe", rssBytes: 50_000_000 },  // a tree
  ];
  const r = attributeProcesses(procs);
  assert.equal(r.perTree["tree-100"].rssBytes, 50_000_000);
  assert.equal(r.unowned.rssBytes, 100_000_000);
  assert.equal(r.unowned.count, 1);
});

test("attributeProcesses: no claude.exe → all procs unowned, perTree empty", () => {
  const procs = [
    { pid: 200, ppid: 4, name: "node.exe", rssBytes: 200_000_000 },
    { pid: 300, ppid: 200, name: "bash.exe", rssBytes: 5_000_000 },
  ];
  const r = attributeProcesses(procs);
  assert.deepEqual(r.perTree, {});
  assert.equal(r.unowned.count, 2);
  assert.equal(r.unowned.rssBytes, 205_000_000);
});

test("attributeProcesses: slot overlay attaches label when slot.pid hits a claude.exe", () => {
  const procs = [{ pid: 100, ppid: 4, name: "claude.exe", rssBytes: 800_000_000 }];
  const slots = { alpha: { pid: 100 }, bravo: { pid: 99999 /* dead */ } };
  const r = attributeProcesses(procs, slots);
  assert.equal(r.perTree["tree-100"].slotLabel, "alpha");
});

test("attributeProcesses: empty inputs return empty buckets", () => {
  const r = attributeProcesses([], {});
  assert.deepEqual(r.perTree, {});
  assert.equal(r.unowned.rssBytes, 0);
  assert.equal(r.unowned.count, 0);
});

// ─── decideLevel ────────────────────────────────────────────────────────────

test("decideLevel: clean when both metrics below warn", () => {
  assert.equal(decideLevel({ physUsedPct: 50, commitUsedPct: 60 }, { warnPct: 80, critPct: 92 }), "clean");
});

test("decideLevel: warn when worst hits warn threshold", () => {
  assert.equal(decideLevel({ physUsedPct: 50, commitUsedPct: 85 }, { warnPct: 80, critPct: 92 }), "warn");
});

test("decideLevel: critical when worst hits crit threshold", () => {
  assert.equal(decideLevel({ physUsedPct: 95, commitUsedPct: 70 }, { warnPct: 80, critPct: 92 }), "critical");
});

test("decideLevel: edge — exactly at threshold uses >=", () => {
  assert.equal(decideLevel({ physUsedPct: 80, commitUsedPct: 0 }, { warnPct: 80, critPct: 92 }), "warn");
  assert.equal(decideLevel({ physUsedPct: 92, commitUsedPct: 0 }, { warnPct: 80, critPct: 92 }), "critical");
});

// ─── pickLargestSlot ────────────────────────────────────────────────────────

test("pickLargestSlot: largest by RSS wins, returns slotLabel when present", () => {
  const perTree = {
    "tree-100": { anchorPid: 100, rssBytes: 100, count: 1, procs: [100], slotLabel: "alpha" },
    "tree-200": { anchorPid: 200, rssBytes: 500, count: 2, procs: [200, 201], slotLabel: "bravo" },
    "tree-300": { anchorPid: 300, rssBytes: 200, count: 1, procs: [300], slotLabel: null },
  };
  const r = pickLargestSlot(perTree);
  assert.equal(r.slot, "bravo");
  assert.equal(r.anchorPid, 200);
  assert.equal(r.rssBytes, 500);
});

test("pickLargestSlot: returns tree-PID when no slotLabel", () => {
  const perTree = {
    "tree-555": { anchorPid: 555, rssBytes: 999, count: 1, procs: [555], slotLabel: null },
  };
  const r = pickLargestSlot(perTree);
  assert.equal(r.slot, "tree-555");
  assert.equal(r.anchorPid, 555);
});

test("pickLargestSlot: empty input returns null", () => {
  assert.equal(pickLargestSlot({}), null);
});

// ─── decideAdvisory ─────────────────────────────────────────────────────────

const advCfg = { cooldownSec: 600, sustainedTicks: DEFAULT_SUSTAINED_TICKS };
const t0 = Date.parse("2026-05-16T20:00:00.000Z");

test("decideAdvisory: clean resets warn-tick counter, never emits", () => {
  const ledger = { warnTicks: 3, lastAdvisoryAt: null, lastLevel: "warn" };
  const r = decideAdvisory("clean", ledger, t0, advCfg);
  assert.equal(r.emit, false);
  assert.equal(r.newLedger.warnTicks, 0);
  assert.equal(r.newLedger.lastLevel, "clean");
});

test("decideAdvisory: warn requires sustained-ticks before emitting", () => {
  const ledger0 = { warnTicks: 0, lastAdvisoryAt: null, lastLevel: null };
  const r1 = decideAdvisory("warn", ledger0, t0, advCfg);
  assert.equal(r1.emit, false, "first warn tick should not emit");
  assert.equal(r1.newLedger.warnTicks, 1);

  const r2 = decideAdvisory("warn", r1.newLedger, t0 + 300_000, advCfg);
  assert.equal(r2.emit, true, "second consecutive warn tick should emit (default sustained=2)");
  assert.ok(r2.newLedger.lastAdvisoryAt);
});

test("decideAdvisory: critical emits immediately when cooldown clear", () => {
  const ledger = { warnTicks: 5, lastAdvisoryAt: null, lastLevel: null };
  const r = decideAdvisory("critical", ledger, t0, advCfg);
  assert.equal(r.emit, true);
  assert.equal(r.newLedger.warnTicks, 0, "critical resets warn counter");
});

test("decideAdvisory: critical respects cooldown", () => {
  const lastAt = new Date(t0 - 60_000).toISOString();  // 1 min ago
  const ledger = { warnTicks: 0, lastAdvisoryAt: lastAt, lastLevel: "critical" };
  const r = decideAdvisory("critical", ledger, t0, advCfg);
  assert.equal(r.emit, false);
  assert.equal(r.reason, "cooldown");
});

test("decideAdvisory: cooldown elapses → critical emits again", () => {
  const lastAt = new Date(t0 - 700_000).toISOString();  // 11.67 min ago (> 10 min cooldown)
  const ledger = { warnTicks: 0, lastAdvisoryAt: lastAt, lastLevel: "critical" };
  const r = decideAdvisory("critical", ledger, t0, advCfg);
  assert.equal(r.emit, true);
});

// ─── readSlotsForAttribution ────────────────────────────────────────────────

test("readSlotsForAttribution: parses chat-slots.mjs schema (slots-wrapped)", () => {
  const dir = mkdtempSync(join(tmpdir(), "fmm-test-"));
  const path = join(dir, "chat-slots.json");
  writeFileSync(path, JSON.stringify({
    schemaVersion: 2,
    slots: {
      alpha: { chatId: "claude-abc", pid: 1234, lastHeartbeat: "2026-05-16T20:00:00Z" },
      bravo: { chatId: "claude-def", pid: 5678, lastHeartbeat: "2026-05-16T20:00:00Z" },
      charlie: null,
    },
  }));
  try {
    const r = readSlotsForAttribution({ path1: path, path2: "/nonexistent" });
    assert.equal(r.alpha.pid, 1234);
    assert.equal(r.bravo.chatId, "claude-def");
    assert.equal(r.charlie, undefined, "null slots are filtered out");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readSlotsForAttribution: missing file returns empty map (no throw)", () => {
  const r = readSlotsForAttribution({ path1: "/nonexistent-1", path2: "/nonexistent-2" });
  assert.deepEqual(r, {});
});

test("readSlotsForAttribution: malformed JSON returns empty map (no throw)", () => {
  const dir = mkdtempSync(join(tmpdir(), "fmm-test-"));
  const path = join(dir, "chat-slots.json");
  writeFileSync(path, "{not json}");
  try {
    const r = readSlotsForAttribution({ path1: path, path2: "/nonexistent" });
    assert.deepEqual(r, {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readSlotsForAttribution: slots without pid are filtered out", () => {
  const dir = mkdtempSync(join(tmpdir(), "fmm-test-"));
  const path = join(dir, "chat-slots.json");
  writeFileSync(path, JSON.stringify({
    slots: {
      alpha: { chatId: "claude-abc", pid: 1234 },
      bravo: { chatId: "claude-def" /* no pid */ },
    },
  }));
  try {
    const r = readSlotsForAttribution({ path1: path, path2: "/nonexistent" });
    assert.equal(r.alpha.pid, 1234);
    assert.equal(r.bravo, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── Constants sanity ───────────────────────────────────────────────────────

test("constants: schema/defaults sane", () => {
  assert.equal(LEDGER_SCHEMA_VERSION, 1);
  assert.ok(DEFAULT_WARN_PCT > 0 && DEFAULT_WARN_PCT < 100);
  assert.ok(DEFAULT_CRIT_PCT > DEFAULT_WARN_PCT);
  assert.ok(DEFAULT_SUSTAINED_TICKS >= 1);
});

// ─── findPsAncestor (slotLabel:null deep-fix) ───────────────────────────────

test("findPsAncestor: direct PowerShell parent matches", () => {
  // claude.exe → powershell.exe (direct parent)
  const procs = [
    { pid: 5000, ppid: 0, name: "powershell.exe", rssBytes: 0 },
    { pid: 6000, ppid: 5000, name: "claude.exe", rssBytes: 0 },
  ];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findPsAncestor(6000, idx), 5000);
});

test("findPsAncestor: pwsh.exe (PowerShell 7) recognized", () => {
  const procs = [
    { pid: 5001, ppid: 0, name: "pwsh.exe", rssBytes: 0 },
    { pid: 6001, ppid: 5001, name: "claude.exe", rssBytes: 0 },
  ];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findPsAncestor(6001, idx), 5001);
});

test("findPsAncestor: cmd.exe recognized", () => {
  const procs = [
    { pid: 5002, ppid: 0, name: "cmd.exe", rssBytes: 0 },
    { pid: 6002, ppid: 5002, name: "claude.exe", rssBytes: 0 },
  ];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findPsAncestor(6002, idx), 5002);
});

test("findPsAncestor: deep ancestry (3 hops to PowerShell)", () => {
  // claude.exe → node.exe → bash.exe → powershell.exe
  const procs = [
    { pid: 5010, ppid: 0, name: "powershell.exe", rssBytes: 0 },
    { pid: 5011, ppid: 5010, name: "bash.exe", rssBytes: 0 },
    { pid: 5012, ppid: 5011, name: "node.exe", rssBytes: 0 },
    { pid: 5013, ppid: 5012, name: "claude.exe", rssBytes: 0 },
  ];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findPsAncestor(5013, idx), 5010);
});

test("findPsAncestor: no shell ancestor returns null (orphan chain)", () => {
  const procs = [
    { pid: 7000, ppid: 0, name: "services.exe", rssBytes: 0 },
    { pid: 7001, ppid: 7000, name: "claude.exe", rssBytes: 0 },
  ];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findPsAncestor(7001, idx), null);
});

test("findPsAncestor: cycle detection returns null (defensive)", () => {
  // A→B→A cycle
  const procs = [
    { pid: 8000, ppid: 8001, name: "x", rssBytes: 0 },
    { pid: 8001, ppid: 8000, name: "x", rssBytes: 0 },
  ];
  const idx = new Map(procs.map(p => [p.pid, p]));
  assert.equal(findPsAncestor(8000, idx), null);
});

test("findPsAncestor: maxHops boundary respected (deeper than hops returns null)", () => {
  // chain of 10 non-shells, then PowerShell at the very top
  const procs = [{ pid: 9000, ppid: 0, name: "powershell.exe", rssBytes: 0 }];
  for (let i = 1; i <= 10; i++) {
    procs.push({ pid: 9000 + i, ppid: 9000 + i - 1, name: "n", rssBytes: 0 });
  }
  const idx = new Map(procs.map(p => [p.pid, p]));
  // From pid 9010 the PowerShell ancestor is 10 hops away. maxHops=8 → null.
  // From pid 9008 it's 8 hops away → null (loop checks BEFORE step). From
  // pid 9005 it's 5 hops away → 9000.
  assert.equal(findPsAncestor(9010, idx, 8), null, "10-hop chain past maxHops=8");
  assert.equal(findPsAncestor(9005, idx, 8), 9000, "5-hop chain inside maxHops=8");
});

// ─── readPinsForAttribution ─────────────────────────────────────────────────

test("readPinsForAttribution: missing file returns empty Map", () => {
  const result = readPinsForAttribution({
    existsSync: () => false,
    readFileSync: () => { throw new Error("should not be called"); },
  });
  assert.ok(result instanceof Map);
  assert.equal(result.size, 0);
});

test("readPinsForAttribution: corrupt JSON returns empty Map (fail-soft)", () => {
  const result = readPinsForAttribution({
    existsSync: () => true,
    readFileSync: () => "{not valid json",
  });
  assert.ok(result instanceof Map);
  assert.equal(result.size, 0);
});

test("readPinsForAttribution: valid pins parsed correctly", () => {
  const fixture = {
    schemaVersion: 1,
    lastUpdated: "2026-05-17T21:30:00.000Z",
    pins: {
      "12345": { slot: "golf",  chatId: "claude-deadbeef", writtenAt: "2026-05-17T20:00:00.000Z" },
      "67890": { slot: "mike",  chatId: "claude-cafebabe", writtenAt: "2026-05-17T20:30:00.000Z" },
    },
  };
  const result = readPinsForAttribution({
    existsSync: () => true,
    readFileSync: () => JSON.stringify(fixture),
  });
  assert.equal(result.size, 2);
  assert.equal(result.get("12345"), "golf");
  assert.equal(result.get("67890"), "mike");
});

test("readPinsForAttribution: invalid pin entries skipped (slot must be non-empty string)", () => {
  const fixture = {
    schemaVersion: 1,
    pins: {
      "1111": { slot: "alpha", chatId: "c1", writtenAt: "x" },
      "2222": { slot: "",      chatId: "c2", writtenAt: "x" },  // empty slot — skip
      "3333": { slot: 42,      chatId: "c3", writtenAt: "x" },  // non-string slot — skip
      "4444": null,                                              // null pin — skip
      "5555": { chatId: "c5", writtenAt: "x" },                  // no slot — skip
    },
  };
  const result = readPinsForAttribution({
    existsSync: () => true,
    readFileSync: () => JSON.stringify(fixture),
  });
  assert.equal(result.size, 1);
  assert.equal(result.get("1111"), "alpha");
});

// ─── attributeProcesses + pins (slotLabel:null deep-fix integration) ────────

test("attributeProcesses: pin resolves slot for claude.exe via PS ancestor", () => {
  // Production scenario: claude.exe's slot.pid is the dead subshell (not in
  // procs), so pass-1 fails. The pin keyed on PS PID resolves it.
  const procs = [
    { pid: 5000, ppid: 0,    name: "powershell.exe", rssBytes: 100 },
    { pid: 6000, ppid: 5000, name: "claude.exe",     rssBytes: 1000 },
    { pid: 7000, ppid: 6000, name: "node.exe",       rssBytes: 200 },
  ];
  const slots = { golf: { pid: 99999, chatId: "c-dead" } };  // stale subshell PID
  const pins = new Map([["5000", "golf"]]);
  const out = attributeProcesses(procs, slots, pins);
  const tree = out.perTree["tree-6000"];
  assert.ok(tree, "tree-6000 exists");
  assert.equal(tree.slotLabel, "golf", "pin-resolved slot label");
  assert.equal(tree.rssBytes, 1200, "self + descendant RSS");
});

test("attributeProcesses: pin missing for PS → slotLabel stays null", () => {
  const procs = [
    { pid: 5000, ppid: 0,    name: "powershell.exe", rssBytes: 100 },
    { pid: 6000, ppid: 5000, name: "claude.exe",     rssBytes: 1000 },
  ];
  const out = attributeProcesses(procs, {}, new Map([["9999", "other-slot"]]));
  assert.equal(out.perTree["tree-6000"].slotLabel, null, "no pin for PS PID 5000");
});

test("attributeProcesses: pass-1 (slot.pid match) wins over pass-2 (pin)", () => {
  // When slot.pid HAPPENS to land on a live claude.exe, that's the freshest
  // signal — pin is a persistent fallback, slot.pid is the just-claimed truth.
  const procs = [
    { pid: 5000, ppid: 0,    name: "powershell.exe", rssBytes: 100 },
    { pid: 6000, ppid: 5000, name: "claude.exe",     rssBytes: 1000 },
  ];
  const slots = { freshly_claimed: { pid: 6000, chatId: "c-live" } };
  const pins = new Map([["5000", "stale_pin_slot"]]);
  const out = attributeProcesses(procs, slots, pins);
  assert.equal(out.perTree["tree-6000"].slotLabel, "freshly_claimed",
    "slot.pid heuristic wins (pass-1 first; pass-2 skip when label already set)");
});

test("attributeProcesses: empty pins → back-compat with pre-fix behavior", () => {
  // Default pins=new Map() must produce same perTree shape as the legacy
  // 2-arg call (which existing tests cover) — regression guard.
  const procs = [
    { pid: 5000, ppid: 0,    name: "powershell.exe", rssBytes: 100 },
    { pid: 6000, ppid: 5000, name: "claude.exe",     rssBytes: 1000 },
  ];
  const a = attributeProcesses(procs, {}, new Map());
  const b = attributeProcesses(procs, {});  // 2-arg legacy form
  assert.deepEqual(a.perTree, b.perTree, "empty pins == no-pins legacy call");
  assert.equal(a.perTree["tree-6000"].slotLabel, null,
    "no pins + no slot match → null label (the pre-fix bug being addressed by pins)");
});

test("attributeProcesses: pin for orphan claude.exe (no PS ancestor) ignored", () => {
  // claude.exe whose ancestry doesn't reach a shell — pin lookup fails
  // gracefully, label stays null. Same as no-pin behavior for this anchor.
  const procs = [
    { pid: 4000, ppid: 0,    name: "services.exe", rssBytes: 50 },
    { pid: 6000, ppid: 4000, name: "claude.exe",   rssBytes: 1000 },
  ];
  const pins = new Map([["5000", "golf"]]);  // pin for PS that doesn't exist
  const out = attributeProcesses(procs, {}, pins);
  assert.equal(out.perTree["tree-6000"].slotLabel, null);
});

test("attributeProcesses: multiple claude.exe trees resolved independently via pins", () => {
  const procs = [
    { pid: 1000, ppid: 0,    name: "powershell.exe", rssBytes: 50 },
    { pid: 2000, ppid: 1000, name: "claude.exe",     rssBytes: 500 },
    { pid: 3000, ppid: 0,    name: "powershell.exe", rssBytes: 50 },
    { pid: 4000, ppid: 3000, name: "claude.exe",     rssBytes: 800 },
  ];
  const pins = new Map([["1000", "alpha"], ["3000", "golf"]]);
  const out = attributeProcesses(procs, {}, pins);
  assert.equal(out.perTree["tree-2000"].slotLabel, "alpha");
  assert.equal(out.perTree["tree-4000"].slotLabel, "golf");
});
