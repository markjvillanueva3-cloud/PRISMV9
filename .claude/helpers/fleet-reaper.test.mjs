/**
 * fleet-reaper — behavioural tests for the slot-aware orphan reaper pipeline.
 *
 * Covers BOTH modules:
 *   - process-slot-map.mjs    (slot-ownership classification — same dir)
 *   - scripts/fleet-reaper-sweep.mjs (the sweep brain — kill gate, ledger, CLI)
 *
 * Every OS touch point is injected (synthetic process tables, synthetic
 * chat-slots files, temp ledger paths, fake killers) — the suite NEVER kills a
 * real process or reads real state. Real-value assertions throughout; the
 * load-bearing safety invariant is exercised explicitly: a live chat's process,
 * an interactive shell, a wedged-but-running harness, and a system process must
 * NEVER come back `isCandidate: true`.
 *
 * Run: node mcp-server/node_modules/vitest/vitest.mjs run --config .claude/helpers/vitest.config.mjs
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  isTargetName, isHarnessName, isProtectedCmd,
  buildAncestry, mapPidsToSlots, classifyProcess,
  enumerateProcesses, snapshotFleet, loadPidRegistry, getLastEnumerationError,
  // FLEET-REAPER-MS1: leftover-bash-task classifier
  isLeftoverTaskName, matchesLeftoverTaskPattern,
  LEFTOVER_TASK_PATTERNS, LEFTOVER_AGE_MS_MIN,
} from "./process-slot-map.mjs";

import {
  parseArgs, resolveConfig, shouldReap, updateLedger, reapProcesses, runSweep,
  summarize, readHostMemory,
  LEDGER_SCHEMA_VERSION, DEFAULT_INTERVAL_SEC, DEFAULT_AGE_FLOOR_SEC,
  DEFAULT_KILL_AFTER, DEFAULT_MEM_PRESSURE_PCT,
  // FLEET-REAPER-MS1: Layer 1 (soft relief) + Layer 2/3 (GPU/Ollama coordinator)
  readSlotProcesses, countSlotsByStatus, selectSoftReliefTargets,
  applyPriorityRelief, applyWorkingSetTrim,
  readGpuState, readOllamaState, decideOllamaCoordination,
  prewarmOllama, writeRoutingHint,
  DEFAULT_SOFT_RELIEF_AGE_SEC, DEFAULT_OLLAMA_PREWARM_MODEL,
  DEFAULT_HINT_TTL_SEC, HINT_SCHEMA_VERSION,
} from "../../scripts/fleet-reaper-sweep.mjs";

// FLEET-REAPER-MS1: the hint CONSUMER — loadRoutingHint round-trips writeRoutingHint.
import { loadRoutingHint } from "../hooks/ollama-task-offloader.mjs";

// ─── Fixtures & helpers ─────────────────────────────────────────────────────

const NOW = 1_700_000_000_000;
const MIN = 60_000;
const iso = (ms) => new Date(ms).toISOString();

const HB_ALIVE = NOW - 1 * MIN;    // <2min  → "alive"
const HB_CRASHED = NOW - 20 * MIN; // >10min → "crashed"

/** Build a synthetic process record (defaults: 10-min-old, 50MB RSS). */
function proc(pid, ppid, name, extra = {}) {
  return {
    pid, ppid, name,
    cmd: "cmd" in extra ? extra.cmd : `${name} --x`,
    createdMs: "createdMs" in extra ? extra.createdMs : NOW - 10 * MIN,
    rssBytes: "rssBytes" in extra ? extra.rssBytes : 50 * 1024 * 1024,
  };
}

/** Build a synthetic chat-slots SlotState. */
function slot(pid, chatId, heartbeatMs) {
  return {
    pid, chatId, host: "TESTHOST",
    claimedAt: iso(heartbeatMs), lastHeartbeat: iso(heartbeatMs),
    branch: null, topic: null, activity: null,
  };
}

/** Build a synthetic chat-slots file (the 10 canonical slot keys per 2026-05-15 expansion). */
function slotsFile(slots) {
  const file = { schemaVersion: 2, lastUpdated: iso(NOW), slots: {} };
  for (const n of ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett"]) {
    file.slots[n] = slots[n] || null;
  }
  return file;
}

/** Build a classification context from a synthetic process table. */
function makeCtx(procs, slotsObj, pidRegistry = { pids: {} }, { selfPid = 999999, now = NOW } = {}) {
  const { byPid, ancestorsOf } = buildAncestry(procs);
  const { map: slotPidMap } = mapPidsToSlots(slotsObj, pidRegistry, now);
  return { byPid, ancestorsOf, slotPidMap, selfPid, now };
}

/** A killer spy: records the pid lists it was called with. */
function makeKillerSpy(outcome = "ok") {
  const calls = [];
  return {
    calls,
    fn: (pids) => {
      calls.push([...pids]);
      return pids.map((p) => ({
        pid: p, killed: outcome === "ok", error: outcome === "ok" ? null : "spy kill failure",
      }));
    },
  };
}

/** A synthetic host-memory reading at a given used-%. */
function mem(usedPct) {
  return {
    physTotalMb: 32000, physFreeMb: Math.round(32000 * (1 - usedPct / 100)),
    commitTotalMb: 40000, commitFreeMb: Math.round(40000 * (1 - usedPct / 100)),
    physUsedPct: usedPct, commitUsedPct: usedPct, usedPct,
  };
}

/** Pre-seed a ledger file so a candidate is already past its confirm window. */
function seedLedger(path, entries) {
  const candidates = {};
  for (const e of entries) {
    const key = `${e.pid}:${Number.isFinite(e.createdMs) ? e.createdMs : "x"}`;
    candidates[key] = {
      pid: e.pid, createdMs: Number.isFinite(e.createdMs) ? e.createdMs : null,
      name: e.name || "node.exe", class: e.class || "owned-by-crashed",
      ownerSlot: e.ownerSlot || null,
      firstSeenAt: e.firstSeenAt, lastSeenAt: e.firstSeenAt, sweeps: e.sweeps ?? 1,
    };
  }
  writeFileSync(path, JSON.stringify({ schemaVersion: 1, lastUpdated: iso(NOW), candidates }, null, 2));
}

// ── The canonical mixed process table — every classification class + both P1 cases.
//    100 claude.exe(alpha,alive) → 101 node → 102 bash       owned-by-alive
//    999 (DEAD, slot delta crashed) ← 200 node ← 201 bash    owned-by-crashed  ← P1: dead harness PID
//    998 (DEAD, no slot)          ← 300 node ← 301 git       unowned
//    500 conhost(alive) ← 400 bash                           owned-by-other-live (interactive shell)
//    601 claude.exe(alive, unpinned) ← 600 node              owned-by-alive (live harness)
//    701 claude.exe(ALIVE) ← 700 node, slot echo CRASHED     indeterminate    ← P1: wedged harness
//    800 node cmd=dist/index.js                              protected
//    900 explorer.exe                                        not-target
//    950 node ppid 0                                         indeterminate (no ancestry)
//    960↔961 node cycle                                      indeterminate (cycle-safe)
const PROCS = [
  proc(1, 0, "wininit.exe"),
  proc(100, 1, "claude.exe"),
  proc(101, 100, "node.exe"),
  proc(102, 101, "bash.exe"),
  proc(200, 999, "node.exe"),
  proc(201, 200, "bash.exe"),
  proc(300, 998, "node.exe"),
  proc(301, 300, "git.exe"),
  proc(400, 500, "bash.exe"),
  proc(500, 1, "conhost.exe"),
  proc(600, 601, "node.exe"),
  proc(601, 1, "claude.exe"),
  proc(700, 701, "node.exe"),
  proc(701, 1, "claude.exe"),
  proc(800, 100, "node.exe", { cmd: "node H:/prism/mcp-server/dist/index.js" }),
  proc(900, 1, "explorer.exe"),
  proc(950, 0, "node.exe"),
  proc(960, 961, "node.exe"),
  proc(961, 960, "node.exe"),
];
const SLOTS = slotsFile({
  alpha: slot(100, "claude-aaa", HB_ALIVE),
  delta: slot(999, "claude-ddd", HB_CRASHED),
  echo: slot(701, "claude-eee", HB_CRASHED),
});
const CTX = makeCtx(PROCS, SLOTS);
const byPidIn = (pid) => PROCS.find((p) => p.pid === pid);
const classOf = (pid) => classifyProcess(byPidIn(pid), CTX);

// ════════════════════════════════════════════════════════════════════════════
//  process-slot-map.mjs
// ════════════════════════════════════════════════════════════════════════════

describe("process-slot-map: name helpers", () => {
  it("isTargetName matches node/git/bash/sh, .exe-insensitive, rejects others", () => {
    expect(isTargetName("node.exe")).toBe(true);
    expect(isTargetName("NODE.EXE")).toBe(true);
    expect(isTargetName("git")).toBe(true);
    expect(isTargetName("bash.exe")).toBe(true);
    expect(isTargetName("sh")).toBe(true);
    expect(isTargetName("claude.exe")).toBe(false);
    expect(isTargetName("explorer.exe")).toBe(false);
    expect(isTargetName("")).toBe(false);
    expect(isTargetName(null)).toBe(false);
  });

  it("isHarnessName matches only claude (the harness)", () => {
    expect(isHarnessName("claude.exe")).toBe(true);
    expect(isHarnessName("Claude")).toBe(true);
    expect(isHarnessName("node.exe")).toBe(false);
    expect(isHarnessName("bash.exe")).toBe(false);
  });

  it("isProtectedCmd flags MCP core, tsserver, test workers, playwright mcp — but not a plain script", () => {
    expect(isProtectedCmd({ name: "node.exe", cmd: "node mcp-server/dist/index.js" })).toBe(true);
    expect(isProtectedCmd({ name: "node.exe", cmd: "node tsserver.js" })).toBe(true);
    expect(isProtectedCmd({ name: "node.exe", cmd: "vitest run x" })).toBe(true);
    expect(isProtectedCmd({ name: "node.exe", cmd: "node @playwright/mcp/index" })).toBe(true);
    expect(isProtectedCmd({ name: "node.exe", cmd: "node scripts/whatever.mjs" })).toBe(false);
    expect(isProtectedCmd({ name: "bash.exe", cmd: "bash -c echo" })).toBe(false);
  });
});

describe("process-slot-map: buildAncestry", () => {
  it("walks the parent chain from immediate parent upward", () => {
    const { ancestorsOf } = buildAncestry(PROCS);
    expect(ancestorsOf(102)).toEqual([101, 100, 1]);
    expect(ancestorsOf(301)).toEqual([300, 998]); // stops at the first dead link (998)
  });

  it("includes the first dead/missing ancestor then stops", () => {
    const { ancestorsOf, byPid } = buildAncestry(PROCS);
    expect(ancestorsOf(200)).toEqual([999]);
    expect(byPid.has(999)).toBe(false); // 999 is the dead link, in the chain but not byPid
  });

  it("is cycle-safe (A→B→A yields a bounded chain, never revisits the start)", () => {
    const { ancestorsOf } = buildAncestry(PROCS);
    expect(ancestorsOf(960)).toEqual([961]); // 961's parent is 960 (seen) → walk stops
  });

  it("handles a self-parent (ppid === pid) with an empty chain", () => {
    const { ancestorsOf } = buildAncestry([proc(970, 970, "node.exe")]);
    expect(ancestorsOf(970)).toEqual([]);
  });

  it("returns an empty chain for an unrooted process (ppid 0)", () => {
    const { ancestorsOf } = buildAncestry(PROCS);
    expect(ancestorsOf(950)).toEqual([]);
  });
});

describe("process-slot-map: mapPidsToSlots", () => {
  it("maps a slot's recorded pid to {slot,status,chatId}", () => {
    const { map } = mapPidsToSlots(SLOTS, { pids: {} }, NOW);
    expect(map.get(100)).toEqual({ slot: "alpha", status: "alive", chatId: "claude-aaa" });
    expect(map.get(999)).toEqual({ slot: "delta", status: "crashed", chatId: "claude-ddd" });
    expect(map.get(701)).toEqual({ slot: "echo", status: "crashed", chatId: "claude-eee" });
  });

  it("resolves a null-pid slot via a FRESH registry entry, skips a STALE / undated one", () => {
    const reg = { pids: {
      5000: { session_id: "claude-fresh", last_seen: iso(NOW - 1 * MIN) },   // fresh
      5001: { session_id: "claude-stale", last_seen: iso(NOW - 20 * MIN) },  // stale → skipped
      5002: { session_id: "claude-nodate" },                                 // no last_seen → skipped
    } };
    const sf = slotsFile({
      bravo: slot(null, "claude-fresh", HB_ALIVE),
      charlie: slot(null, "claude-stale", HB_ALIVE),
      foxtrot: slot(null, "claude-nodate", HB_ALIVE),
    });
    const { map, caveats } = mapPidsToSlots(sf, reg, NOW);
    expect(map.get(5000)).toEqual({ slot: "bravo", status: "alive", chatId: "claude-fresh" });
    expect(map.has(5001)).toBe(false); // stale pin filtered out
    expect(map.has(5002)).toBe(false); // undated pin filtered out
    expect(caveats.some((c) => c.includes("charlie"))).toBe(true);
    expect(caveats.some((c) => c.includes("foxtrot"))).toBe(true);
  });

  it("PID-reuse conflict resolves to the MORE-ALIVE slot (crashed never shadows alive)", () => {
    const sf = slotsFile({
      delta: slot(7000, "claude-d", HB_CRASHED),
      echo: slot(7000, "claude-e", HB_ALIVE), // same pid number, alive
    });
    const { map } = mapPidsToSlots(sf, { pids: {} }, NOW);
    expect(map.get(7000)).toEqual({ slot: "echo", status: "alive", chatId: "claude-e" });
  });

  it("tolerates slots:null and a non-object pid registry — yields an empty map", () => {
    expect(mapPidsToSlots({ slots: null }, { pids: {} }, NOW).map.size).toBe(0);
    expect(mapPidsToSlots({}, [], NOW).map.size).toBe(0);
    expect(mapPidsToSlots(null, null, NOW).map.size).toBe(0);
  });
});

describe("process-slot-map: classifyProcess — every class + the safety invariant", () => {
  it("owned-by-alive: a hook + bash of a live slot are never candidates", () => {
    expect(classOf(101).class).toBe("owned-by-alive");
    expect(classOf(101).ownerSlot).toBe("alpha");
    expect(classOf(101).isCandidate).toBe(false);
    expect(classOf(102).class).toBe("owned-by-alive"); // bash via the node hook chain
    expect(classOf(102).isCandidate).toBe(false);
  });

  it("owned-by-crashed: orphan of a crashed slot WITH A DEAD harness PID IS a candidate", () => {
    const r = classOf(200);
    expect(r.class).toBe("owned-by-crashed");
    expect(r.ownerSlot).toBe("delta");
    expect(r.ownerStatus).toBe("crashed");
    expect(r.isCandidate).toBe(true);
    expect(classOf(201).class).toBe("owned-by-crashed"); // bash, attributed via the node chain
    expect(classOf(201).isCandidate).toBe(true);
  });

  it("unowned: a process whose ancestry dead-ends through node/git/bash IS a candidate", () => {
    expect(classOf(300).class).toBe("unowned");
    expect(classOf(300).isCandidate).toBe(true);
    expect(classOf(301).class).toBe("unowned"); // git, via the node chain
    expect(classOf(301).isCandidate).toBe(true);
  });

  it("INVARIANT — P1: wedged harness (slot crashed, harness PID still ALIVE) → indeterminate, NOT a candidate", () => {
    const r = classOf(700);
    expect(r.class).toBe("indeterminate");
    expect(r.ownerSlot).toBe("echo");
    expect(r.ownerStatus).toBe("crashed");
    expect(r.isCandidate).toBe(false); // harness process alive → never reap its children
  });

  it("INVARIANT — interactive shell (live non-harness ancestor) → owned-by-other-live, NOT a candidate", () => {
    const r = classOf(400);
    expect(r.class).toBe("owned-by-other-live");
    expect(r.isCandidate).toBe(false);
  });

  it("INVARIANT — a live unpinned Claude harness ancestor → owned-by-alive, NOT a candidate", () => {
    const r = classOf(600);
    expect(r.class).toBe("owned-by-alive");
    expect(r.isCandidate).toBe(false);
  });

  it("protected: a PROTECTED_PATTERNS match wins even with a live slot ancestor", () => {
    const r = classOf(800);
    expect(r.class).toBe("protected");
    expect(r.isCandidate).toBe(false);
  });

  it("not-target: non node/git/bash processes are out of scope", () => {
    expect(classOf(900).class).toBe("not-target");
    expect(classOf(900).isCandidate).toBe(false);
  });

  it("indeterminate: no ancestry, and a cycle, are never candidates", () => {
    expect(classOf(950).class).toBe("indeterminate");
    expect(classOf(950).isCandidate).toBe(false);
    expect(classOf(960).class).toBe("indeterminate");
    expect(classOf(960).isCandidate).toBe(false);
  });

  it("protected: self and descendants-of-self are never touched", () => {
    const selfProcs = [
      proc(1, 0, "wininit.exe"), proc(50, 1, "node.exe"),
      proc(51, 50, "node.exe"), proc(52, 51, "bash.exe"),
    ];
    const ctx = makeCtx(selfProcs, slotsFile({}), { pids: {} }, { selfPid: 50 });
    expect(classifyProcess(selfProcs[1], ctx).class).toBe("protected"); // pid 50 = self
    expect(classifyProcess(selfProcs[2], ctx).class).toBe("protected"); // pid 51 = child of self
    expect(classifyProcess(selfProcs[3], ctx).class).toBe("protected"); // pid 52 = grandchild
  });

  it("surfaces ageMs (for the downstream age-floor gate) without using it in classification", () => {
    const young = proc(123, 999, "node.exe", { createdMs: NOW - 10_000 }); // 10s old
    const ctx = makeCtx([...PROCS, young], SLOTS);
    const r = classifyProcess(young, ctx);
    expect(r.class).toBe("owned-by-crashed"); // classification ignores age
    expect(r.ageMs).toBe(10_000);             // age is surfaced for the sweep
    expect(r.isCandidate).toBe(true);
  });
});

describe("process-slot-map: enumerateProcesses + normalizeProc", () => {
  it("normalizes an injected table, dropping unusable rows", () => {
    const out = enumerateProcesses({ enumerator: () => [
      { pid: 1, ppid: 0, name: "node.exe", cmd: "x", createdMs: NOW, rssBytes: 100 },
      { pid: -5, ppid: 1, name: "bad" },           // negative pid → dropped
      { pid: "NaN", ppid: 1, name: "bad" },        // non-int pid → dropped
      null,                                         // null row → dropped
      { pid: 2, ppid: -3, name: "git.exe", createdMs: "garbage", rssBytes: "x" },
    ] });
    expect(out.map((p) => p.pid)).toEqual([1, 2]);
    expect(out[1].ppid).toBe(0);          // negative ppid → 0
    expect(out[1].createdMs).toBe(null);  // garbage createdMs → null
    expect(out[1].rssBytes).toBe(0);      // garbage rssBytes → 0
    expect(out[1].cmd).toBe("");          // missing cmd → ""
  });

  it("getLastEnumerationError is null after a (clean) injected enumeration", () => {
    enumerateProcesses({ enumerator: () => [] });
    expect(getLastEnumerationError()).toBe(null);
  });

  it("loadPidRegistry returns the empty shape for a missing file", () => {
    expect(loadPidRegistry("/no/such/path/registry.json")).toEqual({ pids: {} });
  });
});

describe("process-slot-map: snapshotFleet — integration over the canonical table", () => {
  it("classifies the whole table and counts each class correctly", () => {
    const snap = snapshotFleet({
      enumerator: () => PROCS, slotsFile: SLOTS, pidRegistry: { pids: {} },
      selfPid: 999999, now: NOW,
    });
    expect(snap.counts.targets).toBe(13);                 // 13 node/git/bash procs
    expect(snap.counts.candidates).toBe(4);               // 200, 201, 300, 301
    expect(snap.counts["owned-by-alive"]).toBe(3);
    expect(snap.counts["owned-by-crashed"]).toBe(2);
    expect(snap.counts.unowned).toBe(2);
    expect(snap.counts["owned-by-other-live"]).toBe(1);
    expect(snap.counts.indeterminate).toBe(4);
    expect(snap.counts.protected).toBe(1);
    expect(snap.candidates.map((c) => c.pid).sort((a, b) => a - b)).toEqual([200, 201, 300, 301]);
  });

  it("an injected empty table yields zero candidates and no spurious caveat", () => {
    const snap = snapshotFleet({
      enumerator: () => [], slotsFile: SLOTS, pidRegistry: { pids: {} }, selfPid: 999999,
    });
    expect(snap.candidates).toEqual([]);
    expect(snap.classified).toEqual([]);
    expect(snap.caveats.some((c) => c.includes("enumeration"))).toBe(false);
  });

  it("adversarial — a 10k-process table classifies to completion with zero candidates", () => {
    const big = [proc(1, 0, "wininit.exe")];
    for (let i = 2; i < 10002; i += 1) big.push(proc(i, i - 1, i % 2 ? "node.exe" : "bash.exe"));
    const snap = snapshotFleet({
      enumerator: () => big, slotsFile: slotsFile({}), pidRegistry: { pids: {} }, selfPid: 999999,
    });
    expect(snap.counts.targets).toBe(10000);  // every proc reached classification
    expect(snap.counts.candidates).toBe(0);   // all chain up to live wininit → never orphans
  });
});

describe("process-slot-map: vendored chat-slots primitives — drift guard", () => {
  it("the values vendored into process-slot-map.mjs still match canonical chat-slots.mjs", () => {
    // chat-slots.mjs cannot be IMPORTED under vitest (the very reason the
    // primitives are vendored), but it can be read as TEXT — that triggers no
    // transform. Pin SLOT_NAMES / STALE_TTL_MS / CRASH_TTL_MS against the
    // canonical source so silent drift of the vendored copies becomes a red test.
    const canonical = readFileSync(new URL("./chat-slots.mjs", import.meta.url), "utf-8");
    expect(canonical).toMatch(/SLOT_NAMES = \["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett"\]/);
    expect(canonical).toMatch(/STALE_TTL_MS = 2 \* 60 \* 1000/);
    expect(canonical).toMatch(/CRASH_TTL_MS = 10 \* 60 \* 1000/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  fleet-reaper-sweep.mjs
// ════════════════════════════════════════════════════════════════════════════

describe("fleet-reaper: parseArgs", () => {
  it("empty argv → all flags false, all numeric opts null, no errors", () => {
    const { args, errors } = parseArgs([]);
    expect(errors).toEqual([]);
    expect(args.once).toBe(false);
    expect(args.monitorLoop).toBe(false);
    expect(args.detach).toBe(false);
    expect(args.intervalSec).toBe(null);
  });

  it("accepts --flag value and --flag=value forms", () => {
    expect(parseArgs(["--interval", "120"]).args.intervalSec).toBe(120);
    expect(parseArgs(["--interval=120"]).args.intervalSec).toBe(120);
    expect(parseArgs(["--kill-after", "3"]).args.killAfter).toBe(3);
    expect(parseArgs(["--age-floor=10"]).args.ageFloorSec).toBe(10);
  });

  it("rejects an empty inline value, a missing trailing value, and a non-number", () => {
    expect(parseArgs(["--interval="]).errors[0]).toMatch(/empty value/);
    expect(parseArgs(["--interval"]).errors[0]).toMatch(/empty value/);
    expect(parseArgs(["--kill-after", "abc"]).errors[0]).toMatch(/expects a number/);
  });

  it("rejects a boolean flag given a value (--detach=foo would otherwise re-spawn forever)", () => {
    expect(parseArgs(["--detach=foo"]).errors[0]).toMatch(/does not take a value/);
    expect(parseArgs(["--json=1"]).errors[0]).toMatch(/does not take a value/);
  });

  it("rejects unknown arguments", () => {
    expect(parseArgs(["--bogus"]).errors[0]).toMatch(/unknown argument/);
  });

  it("flags conflicting mode combinations", () => {
    expect(parseArgs(["--monitor-loop", "--status"]).errors[0]).toMatch(/mutually exclusive/);
    expect(parseArgs(["--monitor-loop", "--once"]).errors[0]).toMatch(/cannot be combined/);
    expect(parseArgs(["--monitor-loop", "--detach"]).errors[0]).toMatch(/cannot be combined/);
  });

  it("accepts the canonical Stop-hook invocation --once --stop-event --detach", () => {
    const { args, errors } = parseArgs(["--once", "--stop-event", "--detach"]);
    expect(errors).toEqual([]);
    expect(args.once).toBe(true);
    expect(args.stopEvent).toBe(true);
    expect(args.detach).toBe(true);
  });
});

describe("fleet-reaper: resolveConfig — CLI over env over defaults", () => {
  it("uses built-in defaults when neither CLI nor env is set", () => {
    const cfg = resolveConfig({ intervalSec: null, ageFloorSec: null, killAfter: null }, {});
    expect(cfg.intervalSec).toBe(DEFAULT_INTERVAL_SEC);
    expect(cfg.ageFloorSec).toBe(DEFAULT_AGE_FLOOR_SEC);
    expect(cfg.killAfter).toBe(DEFAULT_KILL_AFTER);
    expect(cfg.memPressurePct).toBe(DEFAULT_MEM_PRESSURE_PCT);
    expect(cfg.dryRun).toBe(false);
  });

  it("env overrides defaults; CLI overrides env", () => {
    const env = { PRISM_FLEET_REAPER_INTERVAL_SEC: "222", PRISM_FLEET_REAPER_DRY_RUN: "1" };
    const fromEnv = resolveConfig({ intervalSec: null, ageFloorSec: null, killAfter: null }, env);
    expect(fromEnv.intervalSec).toBe(222);
    expect(fromEnv.dryRun).toBe(true);
    const fromCli = resolveConfig({ intervalSec: 111, ageFloorSec: null, killAfter: null }, env);
    expect(fromCli.intervalSec).toBe(111); // CLI wins over env
  });
});

describe("fleet-reaper: updateLedger", () => {
  it("sets firstSeenAt=now and sweeps=1 for a brand-new candidate", () => {
    const c = [{ pid: 5, createdMs: NOW - MIN, name: "node.exe", class: "unowned", ownerSlot: null }];
    const led = updateLedger({ candidates: {} }, c, NOW);
    expect(led.schemaVersion).toBe(LEDGER_SCHEMA_VERSION);
    expect(led.candidates[`5:${NOW - MIN}`].firstSeenAt).toBe(NOW);
    expect(led.candidates[`5:${NOW - MIN}`].sweeps).toBe(1);
  });

  it("preserves firstSeenAt for an already-tracked candidate and bumps sweeps", () => {
    const prev = { candidates: { [`5:${NOW - MIN}`]: { pid: 5, createdMs: NOW - MIN, firstSeenAt: NOW - 99999, sweeps: 3 } } };
    const c = [{ pid: 5, createdMs: NOW - MIN, name: "node.exe", class: "unowned", ownerSlot: null }];
    const led = updateLedger(prev, c, NOW);
    expect(led.candidates[`5:${NOW - MIN}`].firstSeenAt).toBe(NOW - 99999); // preserved
    expect(led.candidates[`5:${NOW - MIN}`].sweeps).toBe(4);                // bumped
  });

  it("drops a prior entry no longer a candidate (firstSeenAt resets on reappearance)", () => {
    const prev = { candidates: { "5:1": { pid: 5, createdMs: 1, firstSeenAt: NOW - 99999, sweeps: 9 } } };
    const led = updateLedger(prev, [], NOW);
    expect(led.candidates).toEqual({});
  });

  it("PID reuse — same pid, different createdMs → two distinct ledger keys", () => {
    const c = [
      { pid: 5, createdMs: 1000, name: "node.exe", class: "unowned" },
      { pid: 5, createdMs: 2000, name: "node.exe", class: "unowned" },
    ];
    const led = updateLedger({ candidates: {} }, c, NOW);
    expect(Object.keys(led.candidates).sort()).toEqual(["5:1000", "5:2000"]);
  });
});

describe("fleet-reaper: shouldReap — the kill gate", () => {
  const cfg = { ageFloorMs: 45_000, killAfterMs: 600_000 }; // 45s floor, 10-min confirm window

  it("refuses a non-candidate", () => {
    expect(shouldReap({ firstSeenAt: 0 }, { isCandidate: false, ageMs: 1e9 }, cfg, NOW).reap).toBe(false);
  });

  it("refuses when process age is unknown", () => {
    const r = shouldReap({ firstSeenAt: 0 }, { isCandidate: true, ageMs: null }, cfg, NOW);
    expect(r.reap).toBe(false);
    expect(r.reason).toMatch(/age unknown/);
  });

  it("refuses a process younger than the age floor", () => {
    const r = shouldReap({ firstSeenAt: 0 }, { isCandidate: true, ageMs: 30_000 }, cfg, NOW);
    expect(r.reap).toBe(false);
    expect(r.reason).toMatch(/too young/);
  });

  it("refuses when the candidate is not yet ledger-tracked", () => {
    expect(shouldReap(null, { isCandidate: true, ageMs: 1e9 }, cfg, NOW).reap).toBe(false);
    expect(shouldReap({}, { isCandidate: true, ageMs: 1e9 }, cfg, NOW).reap).toBe(false);
  });

  it("refuses while still inside the confirm window", () => {
    const r = shouldReap({ firstSeenAt: NOW - 599_999 }, { isCandidate: true, ageMs: 1e9 }, cfg, NOW);
    expect(r.reap).toBe(false);
    expect(r.reason).toMatch(/confirming/);
  });

  it("reaps once continuously a candidate for >= the confirm window (boundary == reaps)", () => {
    expect(shouldReap({ firstSeenAt: NOW - 600_000 }, { isCandidate: true, ageMs: 1e9 }, cfg, NOW).reap).toBe(true);
    expect(shouldReap({ firstSeenAt: NOW - 1_200_000 }, { isCandidate: true, ageMs: 1e9 }, cfg, NOW).reap).toBe(true);
  });
});

describe("fleet-reaper: reapProcesses", () => {
  it("empty / non-array → []", () => {
    expect(reapProcesses([], {})).toEqual([]);
    expect(reapProcesses(null, {})).toEqual([]);
  });

  it("dry-run never calls the killer and reports killed:false dryRun:true", () => {
    const spy = makeKillerSpy();
    const out = reapProcesses([10, 20], { dryRun: true, killer: spy.fn });
    expect(spy.calls).toEqual([]);
    expect(out).toEqual([
      { pid: 10, killed: false, error: null, dryRun: true },
      { pid: 20, killed: false, error: null, dryRun: true },
    ]);
  });

  it("delegates to the injected killer when not dry-run", () => {
    const spy = makeKillerSpy();
    const out = reapProcesses([10, 20], { killer: spy.fn });
    expect(spy.calls).toEqual([[10, 20]]);
    expect(out).toEqual([
      { pid: 10, killed: true, error: null },
      { pid: 20, killed: true, error: null },
    ]);
  });
});

describe("fleet-reaper: runSweep — fully injected, never touches the real OS", () => {
  let tmpDir;
  let envBackup;
  const ENV_KEYS = ["PRISM_FLEET_REAPER_DISABLE", "PRISM_FLEET_REAPER_DRY_RUN"];

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "fleet-reaper-test-"));
    envBackup = {};
    for (const k of ENV_KEYS) { envBackup[k] = process.env[k]; delete process.env[k]; }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (envBackup[k] === undefined) delete process.env[k];
      else process.env[k] = envBackup[k];
    }
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  });

  // One crashed-slot orphan (pid 200, owner = crashed slot delta), 10-min-old,
  // plus a live-slot hook (pid 101) that must NEVER be reaped.
  const orphanTable = () => [
    proc(1, 0, "wininit.exe"),
    proc(100, 1, "claude.exe"),
    proc(101, 100, "node.exe"),
    proc(200, 999, "node.exe", { createdMs: NOW - 10 * MIN }),
  ];
  const orphanSlots = slotsFile({
    alpha: slot(100, "claude-aaa", HB_ALIVE),
    delta: slot(999, "claude-ddd", HB_CRASHED),
  });
  const base = (over = {}) => ({
    enumerator: orphanTable, slotsFile: orphanSlots, pidRegistry: { pids: {} },
    selfPid: 999999, readMemory: () => mem(50),
    ledgerPath: join(tmpDir, "ledger.json"),
    intervalSec: 300, ageFloorSec: 45, killAfter: 2, memPressurePct: 90,
    ...over,
  });

  it("confirm-after-N-ticks — an orphan is held for 2 sweeps, reaped on the 3rd", () => {
    const spy = makeKillerSpy();
    const cfg = { ...base(), killer: spy.fn };

    const r1 = runSweep({ ...cfg, now: NOW });
    expect(r1.candidates.map((c) => c.pid)).toEqual([200]);
    expect(r1.candidates[0].willReap).toBe(false);   // brand-new — confirm clock just started
    expect(r1.reaped).toEqual([]);

    const r2 = runSweep({ ...cfg, now: NOW + 300_000 }); // +1 interval
    expect(r2.reaped).toEqual([]);                    // 1 interval < killAfter(2) * interval

    const r3 = runSweep({ ...cfg, now: NOW + 600_000 }); // +2 intervals
    expect(r3.reaped.map((r) => r.pid)).toEqual([200]);
    expect(r3.reaped[0].killed).toBe(true);
    expect(spy.calls).toEqual([[200]]);               // killer invoked exactly once, with [200]
  });

  it("never reaps a live-slot process even across many sweeps", () => {
    const spy = makeKillerSpy();
    const cfg = { ...base(), killer: spy.fn };
    for (let i = 0; i <= 5; i += 1) runSweep({ ...cfg, now: NOW + i * 300_000 });
    // The synthetic enumerator keeps returning pid 200 every sweep, so once past
    // its confirm window it is reaped on each sweep — expected. The real point:
    // the DISTINCT set of pids ever handed to the killer is exactly {200}.
    // pid 101 (a hook of alive slot alpha) is owned-by-alive — never touched.
    expect(spy.calls.flat()).not.toContain(101); // the safety invariant, stated outright
    expect([...new Set(spy.calls.flat())]).toEqual([200]);
  });

  it("memory pressure collapses the confirm window to one tick (killAfter → 1)", () => {
    const spy = makeKillerSpy();
    const cfg = { ...base(), killer: spy.fn, readMemory: () => mem(95) }; // 95% > 90 threshold

    const r1 = runSweep({ ...cfg, now: NOW });
    expect(r1.underPressure).toBe(true);
    expect(r1.config.effectiveKillAfter).toBe(1);
    expect(r1.reaped).toEqual([]); // still brand-new

    const r2 = runSweep({ ...cfg, now: NOW + 300_000 }); // 1 interval — under pressure, that's enough
    expect(r2.reaped.map((r) => r.pid)).toEqual([200]);
  });

  it("status mode neither writes the ledger nor reaps", () => {
    const ledgerPath = join(tmpDir, "ledger.json");
    seedLedger(ledgerPath, [{ pid: 200, createdMs: NOW - 10 * MIN, firstSeenAt: NOW - 3_600_000 }]);
    const before = readFileSync(ledgerPath, "utf-8");
    const spy = makeKillerSpy();
    const r = runSweep({ ...base({ ledgerPath }), killer: spy.fn, mode: "status", now: NOW });
    expect(r.reaped).toEqual([]);
    expect(r.blockedBy).toMatch(/status/);
    expect(spy.calls).toEqual([]);
    expect(readFileSync(ledgerPath, "utf-8")).toBe(before); // ledger byte-for-byte untouched
  });

  it("PRISM_FLEET_REAPER_DISABLE=1 suppresses all reaping", () => {
    const ledgerPath = join(tmpDir, "ledger.json");
    seedLedger(ledgerPath, [{ pid: 200, createdMs: NOW - 10 * MIN, firstSeenAt: NOW - 3_600_000 }]);
    process.env.PRISM_FLEET_REAPER_DISABLE = "1";
    const spy = makeKillerSpy();
    const r = runSweep({ ...base({ ledgerPath }), killer: spy.fn, now: NOW });
    expect(r.disabled).toBe(true);
    expect(r.reaped).toEqual([]);
    expect(r.blockedBy).toMatch(/DISABLE/);
    expect(spy.calls).toEqual([]);
  });

  it("dry-run decides the reap but never calls the killer", () => {
    const ledgerPath = join(tmpDir, "ledger.json");
    seedLedger(ledgerPath, [{ pid: 200, createdMs: NOW - 10 * MIN, firstSeenAt: NOW - 3_600_000 }]);
    const spy = makeKillerSpy();
    const r = runSweep({ ...base({ ledgerPath }), killer: spy.fn, dryRun: true, now: NOW });
    expect(spy.calls).toEqual([]);                     // killer never invoked
    expect(r.reaped.map((x) => x.pid)).toEqual([200]); // but the reap WAS decided
    expect(r.reaped[0].dryRun).toBe(true);
    expect(r.reaped[0].killed).toBe(false);
  });

  it("a throwing killer is caught — runSweep never propagates it (Stop-hook safety)", () => {
    const ledgerPath = join(tmpDir, "ledger.json");
    seedLedger(ledgerPath, [{ pid: 200, createdMs: NOW - 10 * MIN, firstSeenAt: NOW - 3_600_000 }]);
    const throwingKiller = () => { throw new Error("kill boom"); };
    let r;
    expect(() => { r = runSweep({ ...base({ ledgerPath }), killer: throwingKiller, now: NOW }); }).not.toThrow();
    expect(r.reaped).toEqual([]);
    expect(r.caveats.some((c) => c.includes("reap step failed"))).toBe(true);
  });

  it("an empty fleet sweeps cleanly with zero candidates", () => {
    const r = runSweep({ ...base(), enumerator: () => [], killer: makeKillerSpy().fn, now: NOW });
    expect(r.ok).toBe(true);
    expect(r.candidates).toEqual([]);
    expect(r.reaped).toEqual([]);
  });

  it("variability — the confirm window scales with kill-after × interval across 3 spanning configs", () => {
    const configs = [
      { killAfter: 1, intervalSec: 60 },   // window =   60s
      { killAfter: 2, intervalSec: 300 },  // window =  600s
      { killAfter: 5, intervalSec: 600 },  // window = 3000s
    ];
    const createdMs = NOW - 24 * 60 * MIN; // very old → age floor is never the gating factor
    const tableFor = () => [proc(1, 0, "wininit.exe"), proc(200, 999, "node.exe", { createdMs })];
    for (const { killAfter, intervalSec } of configs) {
      const windowMs = killAfter * intervalSec * 1000;
      const ledgerPath = join(tmpDir, `ledger-${killAfter}-${intervalSec}.json`);
      const common = {
        slotsFile: orphanSlots, pidRegistry: { pids: {} }, selfPid: 999999,
        readMemory: () => mem(50), enumerator: tableFor, killAfter, intervalSec, now: NOW,
      };

      // firstSeenAt one ms inside the window → must NOT reap.
      seedLedger(ledgerPath, [{ pid: 200, createdMs, firstSeenAt: NOW - windowMs + 1 }]);
      const held = runSweep({ ...common, ledgerPath, killer: makeKillerSpy().fn });
      expect(held.reaped).toEqual([]);

      // firstSeenAt exactly at the window edge → must reap.
      seedLedger(ledgerPath, [{ pid: 200, createdMs, firstSeenAt: NOW - windowMs }]);
      const spy = makeKillerSpy();
      const reaped = runSweep({ ...common, ledgerPath, killer: spy.fn });
      expect(reaped.reaped.map((r) => r.pid)).toEqual([200]);
      expect(spy.calls).toEqual([[200]]);
    }
  });
});

describe("fleet-reaper: summarize + readHostMemory", () => {
  it("summarize renders the mode, slot counts, the candidate line and the memory reading", () => {
    const tmp = mkdtempSync(join(tmpdir(), "fleet-reaper-sum-"));
    try {
      const r = runSweep({
        enumerator: () => [proc(1, 0, "wininit.exe"), proc(200, 999, "node.exe")],
        slotsFile: slotsFile({ delta: slot(999, "claude-d", HB_CRASHED) }),
        pidRegistry: { pids: {} }, selfPid: 999999, readMemory: () => mem(72),
        ledgerPath: join(tmp, "l.json"), killer: makeKillerSpy().fn, now: NOW,
      });
      const text = summarize(r);
      expect(text).toContain("fleet-reaper (once)");
      expect(text).toContain("1 crashed-owned");   // pid 200 → owned-by-crashed slot delta
      expect(text).toContain("hold pid 200");      // brand-new candidate → held, not reaped
      expect(text).toContain("72%");               // the injected memory reading
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("readHostMemory returns the canonical shape; usedPct is the max of the finite sub-percentages", () => {
    let m;
    expect(() => { m = readHostMemory(); }).not.toThrow();
    expect(Object.keys(m).sort()).toEqual([
      "commitFreeMb", "commitTotalMb", "commitUsedPct",
      "physFreeMb", "physTotalMb", "physUsedPct", "usedPct",
    ]);
    const finite = [m.physUsedPct, m.commitUsedPct].filter((v) => Number.isFinite(v));
    if (finite.length > 0) {
      expect(m.usedPct).toBe(Math.max(...finite)); // the documented "max of phys & commit" contract
    } else {
      expect(m.usedPct).toBe(null);
    }
  });
});

describe("fleet-reaper: CLI exit-code contract", () => {
  const SCRIPT = fileURLToPath(new URL("../../scripts/fleet-reaper-sweep.mjs", import.meta.url));

  it("--help prints usage and exits 0 (returns before any sweep — hermetic)", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf-8", timeout: 15000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("slot-aware orphan process reaper");
  });

  it("an unknown argument exits 2 (misuse) and names the bad flag on stderr", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--bogus-flag"], { encoding: "utf-8", timeout: 15000 });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("unknown argument");
  });

  it("conflicting mode flags exit 2 before any sweep runs", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "--monitor-loop", "--status"], { encoding: "utf-8", timeout: 15000 });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("mutually exclusive");
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  FLEET-REAPER-MS1 — leftover-bash-task classifier  (process-slot-map.mjs)
// ════════════════════════════════════════════════════════════════════════════

const HB_STALE = NOW - 5 * MIN; // 2-10min → "stale"
const LEFTOVER_CMD = "bash -c 'cd /h/prism && while true; do node x --once; sleep 300; done'";
const OLD = NOW - 16 * MIN;  // past LEFTOVER_AGE_MS_MIN (15min)
const YOUNG = NOW - 14 * MIN; // under it

describe("FLEET-REAPER-MS1: leftover-bash-task — pattern + name helpers", () => {
  it("isLeftoverTaskName matches bash/sh only — node/git are the existing reapers' concern", () => {
    expect(isLeftoverTaskName("bash.exe")).toBe(true);
    expect(isLeftoverTaskName("BASH.EXE")).toBe(true);
    expect(isLeftoverTaskName("sh")).toBe(true);
    expect(isLeftoverTaskName("node.exe")).toBe(false);
    expect(isLeftoverTaskName("git.exe")).toBe(false);
    expect(isLeftoverTaskName("")).toBe(false);
  });

  it("matchesLeftoverTaskPattern matches the structural while-sleep / tail-grep / inotifywait forms", () => {
    expect(matchesLeftoverTaskPattern("cd x && while true; do y; sleep 300; done")).toBe(true);
    expect(matchesLeftoverTaskPattern("while : ; do z; sleep 5; done")).toBe(true);
    expect(matchesLeftoverTaskPattern("tail -f run.log | grep --line-buffered ERROR")).toBe(true);
    expect(matchesLeftoverTaskPattern("inotifywait -m /watched/dir")).toBe(true);
  });

  it("matchesLeftoverTaskPattern REJECTS substrings that lack the structural co-occurrence", () => {
    expect(matchesLeftoverTaskPattern('echo "while true"')).toBe(false);       // no `do`+`sleep`
    expect(matchesLeftoverTaskPattern("while true; do echo hi; done")).toBe(false); // no `sleep N`
    expect(matchesLeftoverTaskPattern("tail -f run.log")).toBe(false);          // no `grep --line-buffered`
    expect(matchesLeftoverTaskPattern("npm test")).toBe(false);
    expect(matchesLeftoverTaskPattern("")).toBe(false);
  });

  it("matchesLeftoverTaskPattern is ReDoS-safe — a 60KB pathological cmdline returns in <50ms", () => {
    const pathological = "while : ; do ".repeat(5000); // 65KB, no `sleep` token anywhere
    const t0 = Date.now();
    const result = matchesLeftoverTaskPattern(pathological);
    expect(Date.now() - t0).toBeLessThan(50);
    expect(result).toBe(false); // no `sleep \d+` → no match
  });

  it("matchesLeftoverTaskPattern stays <50ms when the 60KB input DOES match — truncation bounds the MATCHING path too", () => {
    // The previous test only proves the *false* path short-circuits fast. This
    // one forces every regex in the while-sleep signature to actually MATCH on a
    // 65KB input — the real ReDoS guarantee is that LEFTOVER_CMD_SCAN_MAX slices
    // the haystack before the regex engine ever sees the pathological length.
    const matching = "while true; do work; sleep 300; done " + "x".repeat(65000);
    const t0 = Date.now();
    const result = matchesLeftoverTaskPattern(matching);
    expect(Date.now() - t0).toBeLessThan(50);
    expect(result).toBe(true); // structural form is in the first 4096 chars → matches, fast
  });

  it("LEFTOVER_TASK_PATTERNS is frozen, has 3 AND-of-simple-regex signatures (drift guard)", () => {
    expect(Object.isFrozen(LEFTOVER_TASK_PATTERNS)).toBe(true);
    expect(LEFTOVER_TASK_PATTERNS.length).toBe(3);
    for (const sig of LEFTOVER_TASK_PATTERNS) {
      expect(typeof sig.name).toBe("string");
      expect(Array.isArray(sig.all)).toBe(true);
      expect(sig.all.length).toBeGreaterThan(0);
      for (const re of sig.all) expect(re).toBeInstanceOf(RegExp);
    }
    expect(LEFTOVER_AGE_MS_MIN).toBe(15 * 60 * 1000);
  });
});

describe("FLEET-REAPER-MS1: leftover-bash-task — classifyProcess gates", () => {
  // bash.exe under an alive, UNPINNED claude.exe (8000 is in no slot).
  const leftoverTable = (bashExtra = {}) => [
    proc(1, 0, "wininit.exe"),
    proc(8000, 1, "claude.exe"),
    proc(8001, 8000, "bash.exe", { cmd: LEFTOVER_CMD, createdMs: OLD, ...bashExtra }),
  ];

  it("flags a pattern+old bash under an UNPINNED live harness as leftover-bash-task (a candidate)", () => {
    const t = leftoverTable();
    const ctx = makeCtx(t, slotsFile({}));
    // makeCtx OMITS slotsResolved entirely — this is the common clean-parse path.
    // classifyProcess must treat an omitted flag as resolved (`slotsResolved = true`
    // default), so the class still fires. The DEGRADED case (false) is tested below.
    expect("slotsResolved" in ctx).toBe(false);
    const r = classifyProcess(t[2], ctx);
    expect(r.class).toBe("leftover-bash-task");
    expect(r.isCandidate).toBe(true);
    expect(r.reason).toMatch(/leftover bash\.exe/);
  });

  it("does NOT flag when the bash is younger than LEFTOVER_AGE_MS_MIN", () => {
    const t = leftoverTable({ createdMs: YOUNG });
    const r = classifyProcess(t[2], makeCtx(t, slotsFile({})));
    expect(r.class).toBe("owned-by-alive"); // falls through — under the 15-min floor
    expect(r.isCandidate).toBe(false);
  });

  it("does NOT flag when the cmdline matches no leftover-task pattern", () => {
    const t = leftoverTable({ cmd: "bash -c 'ls -la'" });
    const r = classifyProcess(t[2], makeCtx(t, slotsFile({})));
    expect(r.class).toBe("owned-by-alive");
    expect(r.isCandidate).toBe(false);
  });

  it("does NOT flag a node.exe even with a matching cmdline (shells only)", () => {
    const t = [
      proc(1, 0, "wininit.exe"),
      proc(8000, 1, "claude.exe"),
      proc(8002, 8000, "node.exe", { cmd: LEFTOVER_CMD, createdMs: OLD }),
    ];
    const r = classifyProcess(t[2], makeCtx(t, slotsFile({})));
    expect(r.class).toBe("owned-by-alive"); // node leftover is the unowned/crashed path, not this
    expect(r.isCandidate).toBe(false);
  });

  it("does NOT flag when the claude.exe ancestor is a PINNED alive slot (owned-by-alive wins)", () => {
    const t = leftoverTable();
    const sf = slotsFile({ alpha: slot(8000, "claude-pinned", HB_ALIVE) });
    const r = classifyProcess(t[2], makeCtx(t, sf));
    expect(r.class).toBe("owned-by-alive"); // step (1) slotPidMap hit — pinned chat, never leftover
    expect(r.ownerSlot).toBe("alpha");
    expect(r.isCandidate).toBe(false);
  });

  it("does NOT flag when the claude.exe ancestor is a PINNED stale slot (owned-by-stale wins)", () => {
    const t = leftoverTable();
    const sf = slotsFile({ delta: slot(8000, "claude-stale", HB_STALE) });
    const r = classifyProcess(t[2], makeCtx(t, sf));
    expect(r.class).toBe("owned-by-stale"); // a pinned slot — any status — pre-empts leftover-bash-task
    expect(r.isCandidate).toBe(false);
  });

  it("does NOT flag when slot data is DEGRADED (slotsResolved false) — degraded data never widens candidates", () => {
    const t = leftoverTable();
    const ctx = { ...makeCtx(t, slotsFile({})), slotsResolved: false };
    const r = classifyProcess(t[2], ctx);
    expect(r.class).toBe("owned-by-alive"); // suppressed — we can't prove the harness is unpinned
    expect(r.isCandidate).toBe(false);
  });

  it("snapshotFleet surfaces a leftover-bash-task in candidates + counts; the dynamic key is carried", () => {
    const snap = snapshotFleet({
      enumerator: () => [
        proc(1, 0, "wininit.exe"),
        proc(8000, 1, "claude.exe"),
        proc(8001, 8000, "bash.exe", { cmd: LEFTOVER_CMD, createdMs: OLD }),
      ],
      slotsFile: slotsFile({}), pidRegistry: { pids: {} }, selfPid: 999999, now: NOW,
    });
    expect(snap.counts["leftover-bash-task"]).toBe(1);
    expect(snap.candidates.map((c) => c.pid)).toContain(8001);
    expect(snap.slotsResolved).toBe(true);
  });

  it("snapshotFleet with a DEGRADED slots file suppresses the class AND surfaces a caveat", () => {
    const snap = snapshotFleet({
      enumerator: () => [
        proc(1, 0, "wininit.exe"),
        proc(8000, 1, "claude.exe"),
        proc(8001, 8000, "bash.exe", { cmd: LEFTOVER_CMD, createdMs: OLD }),
      ],
      // __slotsResolved:false simulates a corrupt/unreadable chat-slots.json.
      slotsFile: { schemaVersion: 1, slots: {}, __slotsResolved: false },
      pidRegistry: { pids: {} }, selfPid: 999999, now: NOW,
    });
    expect(snap.slotsResolved).toBe(false);
    // The class never fired — no candidate carries it, and pid 8001 classifies owned-by-alive.
    expect(snap.candidates.some((c) => c.class === "leftover-bash-task")).toBe(false);
    expect(snap.classified.find((c) => c.pid === 8001).class).toBe("owned-by-alive");
    expect(snap.caveats.some((c) => c.includes("chat-slots file unreadable"))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  FLEET-REAPER-MS1 — soft RAM/CPU relief  (fleet-reaper-sweep.mjs Layer 1)
// ════════════════════════════════════════════════════════════════════════════

describe("FLEET-REAPER-MS1: soft relief — readSlotProcesses / countSlotsByStatus", () => {
  it("readSlotProcesses indexes classified procs by ownerSlot, summing RSS", () => {
    const snap = { classified: [
      { pid: 1, ownerSlot: "delta", ownerStatus: "stale", rssBytes: 100 },
      { pid: 2, ownerSlot: "delta", ownerStatus: "stale", rssBytes: 200 },
      { pid: 3, ownerSlot: "alpha", ownerStatus: "alive", rssBytes: 50 },
      { pid: 4, ownerSlot: null, ownerStatus: null, rssBytes: 999 }, // no slot → skipped
    ] };
    const bySlot = readSlotProcesses(snap);
    expect(bySlot.get("delta").pids).toEqual([1, 2]);
    expect(bySlot.get("delta").totalRssBytes).toBe(300);
    expect(bySlot.get("alpha").pids).toEqual([3]);
    expect(bySlot.has(null)).toBe(false); // unowned procs are not indexed
  });

  it("countSlotsByStatus tallies distinct slots by status from the slotPidMap", () => {
    const slotPidMap = new Map([
      [100, { slot: "alpha", status: "alive" }],
      [101, { slot: "alpha", status: "alive" }], // same slot — counted once
      [200, { slot: "delta", status: "stale" }],
      [300, { slot: "echo", status: "crashed" }],
    ]);
    const counts = countSlotsByStatus({ slotPidMap });
    expect(counts).toEqual({ alive: 1, stale: 1, crashed: 1, idle: 0 });
  });

  it("countSlotsByStatus tolerates a missing / non-Map slotPidMap", () => {
    expect(countSlotsByStatus({})).toEqual({ alive: 0, stale: 0, crashed: 0, idle: 0 });
    expect(countSlotsByStatus({ slotPidMap: null })).toEqual({ alive: 0, stale: 0, crashed: 0, idle: 0 });
    expect(countSlotsByStatus(null)).toEqual({ alive: 0, stale: 0, crashed: 0, idle: 0 });
  });
});

describe("FLEET-REAPER-MS1: soft relief — selectSoftReliefTargets", () => {
  const snapWith = (classified) => ({ classified });

  it("selects ONLY owned-by-stale processes — never alive, crashed, or unowned", () => {
    const snap = snapWith([
      { pid: 1, ppid: 9, name: "node.exe", class: "owned-by-stale", ownerSlot: "delta", isCandidate: false, ageMs: 10 * MIN, rssBytes: 1e8 },
      { pid: 2, ppid: 9, name: "node.exe", class: "owned-by-alive", ownerSlot: "alpha", isCandidate: false, ageMs: 10 * MIN, rssBytes: 1e8 },
      { pid: 3, ppid: 9, name: "node.exe", class: "owned-by-crashed", ownerSlot: "echo", isCandidate: true, ageMs: 10 * MIN, rssBytes: 1e8 },
      { pid: 4, ppid: 9, name: "git.exe", class: "unowned", ownerSlot: null, isCandidate: true, ageMs: 10 * MIN, rssBytes: 1e8 },
    ]);
    const { targets } = selectSoftReliefTargets(snap, { softReliefAgeSec: 180, now: NOW });
    expect(targets.map((t) => t.pid)).toEqual([1]);
    expect(targets[0].ppid).toBe(9); // ppid threaded through for the audit record
  });

  it("honors the age floor — a young stale-slot process is skipped, not selected", () => {
    const snap = snapWith([
      { pid: 1, ppid: 9, name: "node.exe", class: "owned-by-stale", ownerSlot: "delta", isCandidate: false, ageMs: 30_000, rssBytes: 1e8 },
    ]);
    const { targets, skipped } = selectSoftReliefTargets(snap, { softReliefAgeSec: 180, now: NOW });
    expect(targets).toEqual([]);
    expect(skipped).toBe(1);
  });

  it("skips an owned-by-stale process that is ALSO a reap candidate (never double-act with the reap path)", () => {
    const snap = snapWith([
      { pid: 1, ppid: 9, name: "node.exe", class: "owned-by-stale", ownerSlot: "delta", isCandidate: true, ageMs: 10 * MIN, rssBytes: 1e8 },
    ]);
    const { targets, skipped } = selectSoftReliefTargets(snap, { softReliefAgeSec: 180, now: NOW });
    expect(targets).toEqual([]);
    expect(skipped).toBe(1);
  });

  it("defaults softReliefAgeSec to DEFAULT_SOFT_RELIEF_AGE_SEC when not supplied", () => {
    // 1s over the default floor → selected; 1s under → skipped.
    const overFloor = DEFAULT_SOFT_RELIEF_AGE_SEC * 1000 + 1000;
    const underFloor = DEFAULT_SOFT_RELIEF_AGE_SEC * 1000 - 1000;
    const snap = snapWith([
      { pid: 1, ppid: 9, name: "node.exe", class: "owned-by-stale", ownerSlot: "delta", isCandidate: false, ageMs: overFloor, rssBytes: 1e8 },
      { pid: 2, ppid: 9, name: "node.exe", class: "owned-by-stale", ownerSlot: "delta", isCandidate: false, ageMs: underFloor, rssBytes: 1e8 },
    ]);
    const { targets, skipped } = selectSoftReliefTargets(snap, { now: NOW });
    expect(targets.map((t) => t.pid)).toEqual([1]); // only the over-floor pid
    expect(skipped).toBe(1);                        // the under-floor pid was skipped
  });
});

describe("FLEET-REAPER-MS1: soft relief — applyPriorityRelief / applyWorkingSetTrim", () => {
  it("applyPriorityRelief: empty pids → []", () => {
    expect(applyPriorityRelief([], {})).toEqual([]);
    expect(applyPriorityRelief(null, {})).toEqual([]);
  });

  it("applyPriorityRelief dry-run never calls the applier and reports demoted:false dryRun:true", () => {
    let called = false;
    const out = applyPriorityRelief([10, 20], { dryRun: true, applier: () => { called = true; return []; } });
    expect(called).toBe(false);
    expect(out).toEqual([
      { pid: 10, demoted: false, error: null, dryRun: true },
      { pid: 20, demoted: false, error: null, dryRun: true },
    ]);
  });

  it("applyPriorityRelief delegates to the injected applier when not dry-run", () => {
    const seen = [];
    const out = applyPriorityRelief([10, 20], {
      applier: (pids) => { seen.push(...pids); return pids.map((p) => ({ pid: p, demoted: true, error: null })); },
    });
    expect(seen).toEqual([10, 20]);
    expect(out.every((r) => r.demoted)).toBe(true);
  });

  it("applyWorkingSetTrim dry-run short-circuits with trimmed:false rssReclaimedBytes:0 dryRun:true", () => {
    const out = applyWorkingSetTrim([5], { dryRun: true, applier: () => { throw new Error("must not run"); } });
    expect(out).toEqual([{ pid: 5, trimmed: false, error: null, rssReclaimedBytes: 0, dryRun: true }]);
  });

  it("applyWorkingSetTrim delegates and surfaces rssReclaimedBytes from the applier", () => {
    const out = applyWorkingSetTrim([5, 6], {
      applier: (pids) => pids.map((p) => ({ pid: p, trimmed: true, error: null, rssReclaimedBytes: 4e7 })),
    });
    expect(out.reduce((s, r) => s + r.rssReclaimedBytes, 0)).toBe(8e7);
  });
});

describe("FLEET-REAPER-MS1: soft relief — runSweep integration", () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "fleet-reaper-relief-")); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ } });

  // node hook 9001 under claude.exe 9000, which is a STALE-pinned slot → owned-by-stale.
  const staleTable = () => [
    proc(1, 0, "wininit.exe"),
    proc(9000, 1, "claude.exe"),
    proc(9001, 9000, "node.exe", { createdMs: NOW - 10 * MIN }),
  ];
  const staleSlots = slotsFile({ delta: slot(9000, "claude-stale-d", HB_STALE) });
  const reliefBase = (over = {}) => ({
    enumerator: staleTable, slotsFile: staleSlots, pidRegistry: { pids: {} },
    selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"),
    intervalSec: 300, ageFloorSec: 45, killAfter: 2, memPressurePct: 90,
    noCoord: true, // isolate Layer 1 — Layers 2/3 are exercised separately
    auditPath: join(tmpDir, "actions.jsonl"),
    now: NOW,
    ...over,
  });

  it("under pressure, soft relief nudges the stale-slot process (injected appliers)", () => {
    const prioSeen = [];
    const trimSeen = [];
    const r = runSweep({
      ...reliefBase({ readMemory: () => mem(95) }),
      priorityApplier: (pids) => { prioSeen.push(...pids); return pids.map((p) => ({ pid: p, demoted: true, error: null })); },
      workingSetApplier: (pids) => { trimSeen.push(...pids); return pids.map((p) => ({ pid: p, trimmed: true, error: null, rssReclaimedBytes: 3e7 })); },
    });
    expect(r.softRelief.attempted).toBe(true);
    expect(prioSeen).toEqual([9001]);
    expect(trimSeen).toEqual([9001]);
    expect(r.softRelief.priorityDemoted).toBe(1);
    expect(r.softRelief.workingSetTrimmed).toBe(1);
    expect(r.softRelief.rssReclaimedBytes).toBe(3e7);
  });

  it("NOT under pressure → soft relief does not act, but the shape is stable (no undefined)", () => {
    const r = runSweep({
      ...reliefBase({ readMemory: () => mem(50) }),
      priorityApplier: () => { throw new Error("must not run"); },
      workingSetApplier: () => { throw new Error("must not run"); },
    });
    expect(r.softRelief.attempted).toBe(false);
    expect(r.softRelief.priorityDemoted).toBe(0);
    expect(r.softRelief.workingSetTrimmed).toBe(0);
    expect(r.softRelief.error).toBe(null);
  });

  it("--no-relief (noRelief) suppresses soft relief even under pressure", () => {
    const r = runSweep({
      ...reliefBase({ readMemory: () => mem(99), noRelief: true }),
      priorityApplier: () => { throw new Error("must not run"); },
      workingSetApplier: () => { throw new Error("must not run"); },
    });
    expect(r.softRelief.attempted).toBe(false);
  });

  it("status mode never applies soft-relief actions even under pressure", () => {
    const r = runSweep({
      ...reliefBase({ readMemory: () => mem(99), mode: "status" }),
      priorityApplier: () => { throw new Error("must not run"); },
      workingSetApplier: () => { throw new Error("must not run"); },
    });
    expect(r.softRelief.attempted).toBe(false);
  });

  it("soft relief NEVER targets an alive-slot process, even at 99% memory pressure", () => {
    const aliveTable = () => [
      proc(1, 0, "wininit.exe"),
      proc(9000, 1, "claude.exe"),
      proc(9001, 9000, "node.exe", { createdMs: NOW - 10 * MIN }),
    ];
    const aliveSlots = slotsFile({ alpha: slot(9000, "claude-alive", HB_ALIVE) });
    const r = runSweep({
      ...reliefBase({ enumerator: aliveTable, slotsFile: aliveSlots, readMemory: () => mem(99) }),
      priorityApplier: () => { throw new Error("alive-slot process must never be nudged"); },
      workingSetApplier: () => { throw new Error("alive-slot process must never be nudged"); },
    });
    expect(r.softRelief.attempted).toBe(false); // no owned-by-stale targets
  });

  it("dry-run decides soft relief but never calls the appliers", () => {
    const r = runSweep({
      ...reliefBase({ readMemory: () => mem(95), dryRun: true }),
      priorityApplier: () => { throw new Error("must not run in dry-run"); },
      workingSetApplier: () => { throw new Error("must not run in dry-run"); },
    });
    // dryRun reaches applyPriorityRelief/applyWorkingSetTrim, which short-circuit
    // BEFORE the injected applier — so attempted is true, counts stay 0.
    expect(r.softRelief.attempted).toBe(true);
    expect(r.softRelief.priorityDemoted).toBe(0);
    expect(r.softRelief.workingSetTrimmed).toBe(0);
  });

  it("writes a soft-relief forensic record to the DEDICATED actions JSONL (not the kills log)", () => {
    const auditPath = join(tmpDir, "actions.jsonl");
    const r = runSweep({
      ...reliefBase({ readMemory: () => mem(95), auditPath }),
      priorityApplier: (pids) => pids.map((p) => ({ pid: p, demoted: true, error: null })),
      workingSetApplier: (pids) => pids.map((p) => ({ pid: p, trimmed: true, error: null, rssReclaimedBytes: 2e7 })),
    });
    expect(r.softRelief.priorityDemoted).toBe(1);
    // The dedicated audit file exists and carries valid NDJSON with the MS1 reasons +
    // the {ts,pid,ppid,name,ownerSlot,reason} core shape — NOT mixed into .janitor-kills.jsonl.
    const lines = readFileSync(auditPath, "utf-8").trim().split("\n").map((l) => JSON.parse(l));
    const reasons = lines.map((l) => l.reason).sort();
    expect(reasons).toEqual(["soft-priority-demoted", "soft-workingset-trimmed"]);
    const prio = lines.find((l) => l.reason === "soft-priority-demoted");
    expect(prio.pid).toBe(9001);
    expect(prio.ppid).toBe(9000);          // ppid threaded through for forensic completeness
    expect(prio.ownerSlot).toBe("delta");
    expect(typeof prio.ts).toBe("string");
    const trim = lines.find((l) => l.reason === "soft-workingset-trimmed");
    expect(trim.rssReclaimedBytes).toBe(2e7);
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  FLEET-REAPER-MS1 — GPU + Ollama coordinator  (fleet-reaper-sweep.mjs Layer 2/3)
// ════════════════════════════════════════════════════════════════════════════

describe("FLEET-REAPER-MS1: coordinator — readGpuState", () => {
  it("parses a well-formed nvidia-smi CSV row", () => {
    const g = readGpuState({ runNvidiaSmi: () => "NVIDIA GeForce RTX 3080, 10240, 1506, 8548, 3" });
    expect(g.available).toBe(true);
    expect(g.name).toBe("NVIDIA GeForce RTX 3080");
    expect(g.totalMb).toBe(10240);
    expect(g.freeMb).toBe(8548);
    expect(g.utilizationPct).toBe(3);
  });

  it("degrades to { available:false } when nvidia-smi is missing (runner returns null)", () => {
    const g = readGpuState({ runNvidiaSmi: () => null });
    expect(g.available).toBe(false);
    expect(g.reason).toMatch(/nvidia-smi/i);
  });

  it("degrades — never throws — when the runner itself throws", () => {
    let g;
    expect(() => { g = readGpuState({ runNvidiaSmi: () => { throw new Error("ENOENT nvidia-smi"); } }); }).not.toThrow();
    expect(g.available).toBe(false);
    expect(g.reason).toMatch(/threw/i);
  });

  it("rejects a malformed CSV row (too few columns / non-numeric memory)", () => {
    expect(readGpuState({ runNvidiaSmi: () => "GPU, 10240" }).available).toBe(false);
    expect(readGpuState({ runNvidiaSmi: () => "GPU, abc, def, ghi, jkl" }).available).toBe(false);
  });
});

describe("FLEET-REAPER-MS1: coordinator — readOllamaState", () => {
  it("reports reachable with parsed models + loaded list", () => {
    const o = readOllamaState({
      runCurl: (url) => (url.includes("/api/tags")
        ? JSON.stringify({ models: [{ name: "qwen2.5-coder:7b" }, { name: "llama3.2:3b" }] })
        : JSON.stringify({ models: [{ name: "qwen2.5-coder:7b", size: 4 * 1024 * 1024 * 1024 }] })),
    });
    expect(o.reachable).toBe(true);
    expect(o.models).toEqual(["qwen2.5-coder:7b", "llama3.2:3b"]);
    expect(o.loaded[0].model).toBe("qwen2.5-coder:7b");
    expect(o.loaded[0].sizeMb).toBe(4096);
  });

  it("reports unreachable when /api/tags returns null", () => {
    const o = readOllamaState({ runCurl: () => null });
    expect(o.reachable).toBe(false);
    expect(o.models).toEqual([]);
    expect(o.loaded).toEqual([]);
  });

  it("reports unreachable on non-JSON /api/tags", () => {
    const o = readOllamaState({ runCurl: () => "<html>502 Bad Gateway</html>" });
    expect(o.reachable).toBe(false);
  });

  it("/api/ps is best-effort — reachability still stands on /api/tags if /api/ps fails", () => {
    const o = readOllamaState({
      runCurl: (url) => (url.includes("/api/tags") ? JSON.stringify({ models: [] }) : "garbage"),
    });
    expect(o.reachable).toBe(true);
    expect(o.loaded).toEqual([]);
  });
});

describe("FLEET-REAPER-MS1: coordinator — decideOllamaCoordination (pure truth table)", () => {
  const cfg = { gpuFreeMinMb: 2048, prewarmModel: "qwen2.5-coder:7b", prewarmPct: 90, hintPct: 90 };
  const gpuOk = { available: true, freeMb: 8000, totalMb: 10240, utilizationPct: 5 };
  const ollamaOk = { reachable: true, models: ["qwen2.5-coder:7b"], loaded: [] };

  it("pressure + GPU headroom + Ollama reachable + model NOT loaded → prewarm AND hint", () => {
    const d = decideOllamaCoordination({ mem: mem(97), gpu: gpuOk, ollama: ollamaOk, slotCounts: { alive: 3 }, cfg });
    expect(d.shouldPrewarm).toBe(true);
    expect(d.shouldHintOffload).toBe(true);
    expect(d.thresholdDelta).toBeLessThan(0); // negative → lowers the consumer's bar
    expect(d.skipped).toBe(null);
  });

  it("model already loaded → no prewarm, still hint", () => {
    const ollama = { reachable: true, models: ["qwen2.5-coder:7b"], loaded: [{ model: "qwen2.5-coder:7b" }] };
    const d = decideOllamaCoordination({ mem: mem(97), gpu: gpuOk, ollama, slotCounts: { alive: 2 }, cfg });
    expect(d.shouldPrewarm).toBe(false);
    expect(d.shouldHintOffload).toBe(true);
  });

  it("below the pressure floor → neither prewarm nor hint", () => {
    const d = decideOllamaCoordination({ mem: mem(70), gpu: gpuOk, ollama: ollamaOk, slotCounts: { alive: 3 }, cfg });
    expect(d.shouldPrewarm).toBe(false);
    expect(d.shouldHintOffload).toBe(false);
    expect(d.thresholdDelta).toBe(0);
  });

  it("GPU below the headroom floor → skipped, no action", () => {
    const d = decideOllamaCoordination({ mem: mem(97), gpu: { available: true, freeMb: 500 }, ollama: ollamaOk, slotCounts: { alive: 3 }, cfg });
    expect(d.shouldPrewarm).toBe(false);
    expect(d.shouldHintOffload).toBe(false);
    expect(d.skipped).toMatch(/GPU free/);
  });

  it("GPU unavailable → skipped with a GPU reason", () => {
    const d = decideOllamaCoordination({ mem: mem(97), gpu: { available: false, reason: "no nvidia-smi" }, ollama: ollamaOk, slotCounts: { alive: 3 }, cfg });
    expect(d.skipped).toMatch(/GPU unavailable/);
  });

  it("Ollama unreachable → skipped with an Ollama reason", () => {
    const d = decideOllamaCoordination({ mem: mem(97), gpu: gpuOk, ollama: { reachable: false }, slotCounts: { alive: 3 }, cfg });
    expect(d.skipped).toMatch(/Ollama unreachable/);
  });

  it("zero alive slots → no hint (nobody to route work to), but prewarm can still fire", () => {
    const d = decideOllamaCoordination({ mem: mem(97), gpu: gpuOk, ollama: ollamaOk, slotCounts: { alive: 0 }, cfg });
    expect(d.shouldHintOffload).toBe(false);
    expect(d.shouldPrewarm).toBe(true); // prewarm doesn't need a consumer — it's VRAM prep
  });

  it("model loaded AND zero alive slots → the combined corner: neither prewarm nor hint", () => {
    // The two gates (model-loaded suppresses prewarm; zero-slots suppresses hint)
    // are tested independently above — this pins the cell where BOTH suppress.
    const ollama = { reachable: true, models: ["qwen2.5-coder:7b"], loaded: [{ model: "qwen2.5-coder:7b" }] };
    const d = decideOllamaCoordination({ mem: mem(97), gpu: gpuOk, ollama, slotCounts: { alive: 0 }, cfg });
    expect(d.shouldPrewarm).toBe(false);     // already loaded — VRAM prep is a no-op
    expect(d.shouldHintOffload).toBe(false); // nobody alive to route to
    expect(d.thresholdDelta).toBe(0);
  });

  it("disabled → noop with skipped='coordinator disabled'", () => {
    const d = decideOllamaCoordination({ cfg: { disabled: true } });
    expect(d.skipped).toBe("coordinator disabled");
    expect(d.shouldPrewarm).toBe(false);
  });

  it("clamps an oversized hintThresholdDelta to the ±0.30 cap", () => {
    const d = decideOllamaCoordination({
      mem: mem(97), gpu: gpuOk, ollama: ollamaOk, slotCounts: { alive: 3 },
      cfg: { ...cfg, hintThresholdDelta: 9.9 },
    });
    expect(d.thresholdDelta).toBe(-0.30); // magnitude clamped, applied negatively
  });

  it("DRIFT GUARD — exported coordinator defaults match the skill doc + ollama-routing-hint.md wiki", () => {
    // fleet-reaper.md's Knobs table and knowledge/wiki/architecture/ollama-routing-hint.md
    // both document these as the defaults. If the code drifts, the docs lie — pin them.
    expect(DEFAULT_OLLAMA_PREWARM_MODEL).toBe("qwen2.5-coder:7b");
    expect(DEFAULT_HINT_TTL_SEC).toBe(300); // 300s = one sweep interval — see routing-hint-ttl tribal tip
  });
});

describe("FLEET-REAPER-MS1: coordinator — prewarmOllama / writeRoutingHint / loadRoutingHint round-trip", () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "fleet-reaper-coord-")); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ } });

  it("prewarmOllama fires the injected spawn with model/url/keepAlive and reports fired:true", () => {
    let seen;
    const r = prewarmOllama("qwen2.5-coder:7b", {
      ollamaUrl: "http://127.0.0.1:11434", keepAlive: "10m",
      spawnImpl: (model, base, keepAlive) => { seen = { model, base, keepAlive }; return 4242; },
    });
    expect(r.fired).toBe(true);
    expect(r.pid).toBe(4242);
    expect(seen).toEqual({ model: "qwen2.5-coder:7b", base: "http://127.0.0.1:11434", keepAlive: "10m" });
  });

  it("prewarmOllama swallows a spawn throw → fired:false with the error captured", () => {
    let r;
    expect(() => {
      r = prewarmOllama("m", { spawnImpl: () => { throw new Error("spawn EACCES"); } });
    }).not.toThrow();
    expect(r.fired).toBe(false);
    expect(r.error).toMatch(/spawn EACCES/);
  });

  it("writeRoutingHint writes valid JSON via atomic temp+rename (no .tmp residue); validUntil honors hintTtlSec", () => {
    const path = join(tmpDir, "hint.json");
    const r = writeRoutingHint(
      { shouldHintOffload: true, thresholdDelta: -0.15, reason: "commit 97%" },
      { now: NOW, path, hintTtlSec: 300 },
    );
    expect(r.written).toBe(true);
    expect(r.mode).toBe("aggressive-offload");
    // Atomicity: the temp file is consumed by renameSync — a reader sees the old
    // file or the whole new one, never a partial. Residue would mean a copy, not
    // a rename (and a window where a concurrent reader sees a half-written file).
    expect(existsSync(`${path}.tmp`)).toBe(false);
    const hint = JSON.parse(readFileSync(path, "utf-8"));
    expect(hint.schemaVersion).toBe(HINT_SCHEMA_VERSION);
    expect(hint.thresholdDelta).toBe(-0.15);
    expect(Date.parse(hint.validUntil)).toBe(NOW + 300_000);
  });

  it("writeRoutingHint NEUTRALIZES to mode:auto / delta:0 when !shouldHintOffload", () => {
    const path = join(tmpDir, "hint.json");
    const r = writeRoutingHint({ shouldHintOffload: false, thresholdDelta: -0.15, reason: "below floor" }, { now: NOW, path });
    expect(r.mode).toBe("auto");
    expect(r.thresholdDelta).toBe(0);
    const hint = JSON.parse(readFileSync(path, "utf-8"));
    expect(hint.mode).toBe("auto");
    expect(hint.thresholdDelta).toBe(0);
  });

  it("writeRoutingHint hard-clamps thresholdDelta to ±0.30", () => {
    const path = join(tmpDir, "hint.json");
    const r = writeRoutingHint({ shouldHintOffload: true, thresholdDelta: -9.9, reason: "x" }, { now: NOW, path });
    expect(r.thresholdDelta).toBe(-0.30);
  });

  it("round-trip — loadRoutingHint reads back exactly what writeRoutingHint produced (aggressive)", () => {
    const path = join(tmpDir, "hint.json");
    writeRoutingHint({ shouldHintOffload: true, thresholdDelta: -0.15, reason: "commit 96%" }, { now: NOW, path, hintTtlSec: 300 });
    const hint = loadRoutingHint(NOW, path);
    expect(hint.thresholdDelta).toBe(-0.15);
    expect(hint.reason).toBe("commit 96%");
  });

  it("round-trip — a NEUTRALIZED (mode:auto) hint loads back as null (no behaviour change)", () => {
    const path = join(tmpDir, "hint.json");
    writeRoutingHint({ shouldHintOffload: false, thresholdDelta: 0, reason: "below floor" }, { now: NOW, path });
    expect(loadRoutingHint(NOW, path)).toBe(null);
  });

  it("round-trip — an EXPIRED hint loads back as null", () => {
    const path = join(tmpDir, "hint.json");
    writeRoutingHint({ shouldHintOffload: true, thresholdDelta: -0.15, reason: "x" }, { now: NOW, path, hintTtlSec: 300 });
    expect(loadRoutingHint(NOW + 300_001, path)).toBe(null); // 1ms past validUntil
  });

  it("loadRoutingHint tolerates a corrupt hint file (never throws, returns null)", () => {
    const path = join(tmpDir, "hint.json");
    writeFileSync(path, "{not valid json");
    let hint;
    expect(() => { hint = loadRoutingHint(NOW, path); }).not.toThrow();
    expect(hint).toBe(null);
  });
});

describe("FLEET-REAPER-MS1: coordinator — runSweep integration", () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "fleet-reaper-coordsweep-")); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ } });

  // One alive slot so shouldHintOffload can fire.
  const aliveTable = () => [
    proc(1, 0, "wininit.exe"),
    proc(9000, 1, "claude.exe"),
    proc(9001, 9000, "node.exe", { createdMs: NOW - 10 * MIN }),
  ];
  const aliveSlots = slotsFile({ alpha: slot(9000, "claude-a", HB_ALIVE) });

  it("under pressure with GPU headroom — fires prewarm + writes an aggressive hint (injected)", () => {
    let prewarmCalled = false;
    let hintDecision = null;
    const r = runSweep({
      enumerator: aliveTable, slotsFile: aliveSlots, pidRegistry: { pids: {} },
      selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"),
      readMemory: () => mem(97), noRelief: true, now: NOW,
      readGpu: () => ({ available: true, freeMb: 8000, totalMb: 10240, utilizationPct: 4, name: "RTX 3080" }),
      readOllama: () => ({ reachable: true, models: ["qwen2.5-coder:7b"], loaded: [] }),
      prewarmSpawn: () => { prewarmCalled = true; return 5151; },
      writeHint: (decision, opts) => {
        hintDecision = decision;
        return { written: true, mode: "aggressive-offload", thresholdDelta: decision.thresholdDelta, validUntil: "x", path: opts.path, error: null };
      },
      recordEvent: () => {},
    });
    expect(r.coordinator.evaluated).toBe(true);
    expect(r.coordinator.shouldPrewarm).toBe(true);
    expect(prewarmCalled).toBe(true);
    expect(r.coordinator.prewarmFired).toBe(true);
    expect(hintDecision.shouldHintOffload).toBe(true); // writeHint received the aggressive decision
    expect(r.coordinator.hintWritten).toBe(true);
  });

  it("--no-coord skips the whole GPU/Ollama layer (probes never run)", () => {
    let probed = false;
    const r = runSweep({
      enumerator: aliveTable, slotsFile: aliveSlots, pidRegistry: { pids: {} },
      selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"),
      readMemory: () => mem(97), noCoord: true, now: NOW,
      readGpu: () => { probed = true; return { available: true, freeMb: 8000 }; },
      readOllama: () => { probed = true; return { reachable: true, models: [], loaded: [] }; },
    });
    expect(probed).toBe(false);
    expect(r.coordinator.evaluated).toBe(false);
    expect(r.coordinator.skipped).toBe("--no-coord");
  });

  it("status mode probes GPU/Ollama (read-only) but never fires prewarm or writes a hint", () => {
    let prewarmCalled = false;
    let hintCalled = false;
    const r = runSweep({
      enumerator: aliveTable, slotsFile: aliveSlots, pidRegistry: { pids: {} },
      selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"), mode: "status",
      readMemory: () => mem(97), noRelief: true, now: NOW,
      readGpu: () => ({ available: true, freeMb: 8000, totalMb: 10240, utilizationPct: 4 }),
      readOllama: () => ({ reachable: true, models: ["qwen2.5-coder:7b"], loaded: [] }),
      prewarmSpawn: () => { prewarmCalled = true; return 1; },
      writeHint: () => { hintCalled = true; return { written: true, mode: "aggressive-offload" }; },
      recordEvent: () => {},
    });
    expect(r.gpu.available).toBe(true);          // probe ran
    expect(r.coordinator.evaluated).toBe(true);  // pure decision ran
    expect(prewarmCalled).toBe(false);           // but no action
    expect(hintCalled).toBe(false);
  });

  it("dry-run evaluates the coordinator but fires no prewarm and writes no hint", () => {
    let prewarmCalled = false;
    let hintCalled = false;
    const r = runSweep({
      enumerator: aliveTable, slotsFile: aliveSlots, pidRegistry: { pids: {} },
      selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"),
      readMemory: () => mem(97), noRelief: true, dryRun: true, now: NOW,
      readGpu: () => ({ available: true, freeMb: 8000, totalMb: 10240, utilizationPct: 4 }),
      readOllama: () => ({ reachable: true, models: ["qwen2.5-coder:7b"], loaded: [] }),
      prewarmSpawn: () => { prewarmCalled = true; return 1; },
      writeHint: () => { hintCalled = true; return { written: true, mode: "aggressive-offload" }; },
      recordEvent: () => {},
    });
    expect(r.coordinator.evaluated).toBe(true);     // decision still computed
    expect(r.coordinator.shouldPrewarm).toBe(true); // and it WOULD prewarm — but
    expect(prewarmCalled).toBe(false);              // dry-run takes no action
    expect(hintCalled).toBe(false);
  });

  it("INVARIANT — an advisory-layer (coordinator) error NEVER flips r.ok; it surfaces via caveats", () => {
    // A genuine throw past the probe's own guards must not fail the reap mission.
    const r = runSweep({
      enumerator: aliveTable, slotsFile: aliveSlots, pidRegistry: { pids: {} },
      selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"),
      readMemory: () => mem(97), noRelief: true, now: NOW,
      readGpu: () => { throw new Error("nvidia-smi exploded"); },
      readOllama: () => ({ reachable: true, models: [], loaded: [] }),
      recordEvent: () => {},
    });
    expect(r.ok).toBe(true);                  // reapFailed === 0 → ok stays true
    expect(r.reapFailed).toBe(0);
    expect(r.coordinator.error).toMatch(/nvidia-smi exploded/);
    expect(r.caveats.some((c) => c.includes("coordinator step failed"))).toBe(true);
  });

  it("INVARIANT — a readOllama throw NEVER flips r.ok (symmetric to the GPU-probe case)", () => {
    // The advisory-error invariant must hold for EVERY seam in the Layer 2/3
    // block, not just readGpu — the GPU probe ran clean here, the Ollama one threw.
    const r = runSweep({
      enumerator: aliveTable, slotsFile: aliveSlots, pidRegistry: { pids: {} },
      selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"),
      readMemory: () => mem(97), noRelief: true, now: NOW,
      readGpu: () => ({ available: true, freeMb: 8000, totalMb: 10240, utilizationPct: 4 }),
      readOllama: () => { throw new Error("ollama fetch exploded"); },
      recordEvent: () => {},
    });
    expect(r.ok).toBe(true);
    expect(r.reapFailed).toBe(0);
    expect(r.coordinator.error).toMatch(/ollama fetch exploded/);
    expect(r.caveats.some((c) => c.includes("coordinator step failed"))).toBe(true);
  });

  it("INVARIANT — a writeHint throw NEVER flips r.ok (the action seam, not just the probes)", () => {
    // Probes are healthy and the decision is aggressive — the throw happens at
    // the hint-WRITE action. Still advisory: surfaced via caveats, ok stays true.
    const r = runSweep({
      enumerator: aliveTable, slotsFile: aliveSlots, pidRegistry: { pids: {} },
      selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"),
      readMemory: () => mem(97), noRelief: true, now: NOW,
      readGpu: () => ({ available: true, freeMb: 8000, totalMb: 10240, utilizationPct: 4 }),
      readOllama: () => ({ reachable: true, models: ["qwen2.5-coder:7b"], loaded: [] }),
      prewarmSpawn: () => 7777,
      writeHint: () => { throw new Error("hint write exploded"); },
      recordEvent: () => {},
    });
    expect(r.ok).toBe(true);
    expect(r.reapFailed).toBe(0);
    expect(r.coordinator.error).toMatch(/hint write exploded/);
    expect(r.caveats.some((c) => c.includes("coordinator step failed"))).toBe(true);
  });

  it("telemetry fires EXACTLY ONCE per decision — one prewarm event, one hint event", () => {
    const events = [];
    runSweep({
      enumerator: aliveTable, slotsFile: aliveSlots, pidRegistry: { pids: {} },
      selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"),
      readMemory: () => mem(97), noRelief: true, now: NOW,
      readGpu: () => ({ available: true, freeMb: 8000, totalMb: 10240, utilizationPct: 4, name: "RTX 3080" }),
      readOllama: () => ({ reachable: true, models: ["qwen2.5-coder:7b"], loaded: [] }),
      prewarmSpawn: () => 5151,
      writeHint: (decision) => ({
        written: true, mode: "aggressive-offload", thresholdDelta: decision.thresholdDelta,
        validUntil: "x", path: "x", error: null,
      }),
      recordEvent: (e) => events.push(e),
    });
    const cats = events.map((e) => e.category);
    expect(cats.filter((c) => c === "fleet-reaper-prewarm").length).toBe(1);
    expect(cats.filter((c) => c === "fleet-reaper-hint").length).toBe(1);
    expect(events.length).toBe(2); // and nothing else — no double-count, no extras
  });

  it("telemetry stays SILENT in dry-run — decision computed, no events emitted", () => {
    const events = [];
    runSweep({
      enumerator: aliveTable, slotsFile: aliveSlots, pidRegistry: { pids: {} },
      selfPid: 999999, ledgerPath: join(tmpDir, "ledger.json"),
      readMemory: () => mem(97), noRelief: true, dryRun: true, now: NOW,
      readGpu: () => ({ available: true, freeMb: 8000, totalMb: 10240, utilizationPct: 4 }),
      readOllama: () => ({ reachable: true, models: ["qwen2.5-coder:7b"], loaded: [] }),
      prewarmSpawn: () => 1,
      writeHint: () => ({ written: true, mode: "aggressive-offload", thresholdDelta: -0.15 }),
      recordEvent: (e) => events.push(e),
    });
    expect(events.length).toBe(0); // actionsAllowed false → no prewarm/hint → no telemetry
  });
});
