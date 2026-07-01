// HERMES-MASTER-ORCHESTRATOR / fleet-wake-sequencer tests
//
// Pure-core is exhaustively unit-tested; the orchestration loop is covered by an
// injected-I/O E2E (sendFn/statFn/now/sleep all injected) AND a spawned CLI E2E
// against a temp PRISM_ROOT — per the PRISM rule "pure-core + injected readers
// MUST ship a real-data E2E" (the fake-reader audit lesson).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  computeWakePlan,
  classifyAccumulation,
  nextAction,
  renderWakeText,
  summarize,
  readActiveFleet,
  listPendingBriefSlots,
  statSlotTranscript,
  defaultSendKeys,
  acquireLock,
  releaseLock,
  runSequencer,
} from "./fleet-wake-sequencer.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "fleet-wake-sequencer.mjs");

function tmp(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

// ── computeWakePlan ──────────────────────────────────────────────────────────
describe("computeWakePlan", () => {
  it("preserves order, assigns indices", () => {
    const p = computeWakePlan(["alpha", "charlie", "delta"]);
    assert.deepEqual(p, [
      { slot: "alpha", index: 0 },
      { slot: "charlie", index: 1 },
      { slot: "delta", index: 2 },
    ]);
  });
  it("drops unknown slots (never wakes a non-slot)", () => {
    const p = computeWakePlan(["alpha", "notaslot", "zebra-fake"]);
    assert.deepEqual(p.map((x) => x.slot), ["alpha"]);
  });
  it("dedups and lowercases", () => {
    const p = computeWakePlan(["Alpha", "alpha", "BRAVO"]);
    assert.deepEqual(p.map((x) => x.slot), ["alpha", "bravo"]);
  });
  it("never wakes self", () => {
    const p = computeWakePlan(["alpha", "bravo", "charlie"], { selfSlot: "bravo" });
    assert.deepEqual(p.map((x) => x.slot), ["alpha", "charlie"]);
  });
  it("front-loads golf (reaper) preserving the rest", () => {
    const p = computeWakePlan(["alpha", "golf", "bravo"]);
    assert.deepEqual(p.map((x) => x.slot), ["golf", "alpha", "bravo"]);
  });
  it("custom priority front-loads + re-indexes", () => {
    const p = computeWakePlan(["alpha", "bravo", "charlie"], { priority: ["charlie"] });
    assert.deepEqual(p, [
      { slot: "charlie", index: 0 },
      { slot: "alpha", index: 1 },
      { slot: "bravo", index: 2 },
    ]);
  });
  it("empty / non-array → empty plan", () => {
    assert.deepEqual(computeWakePlan([]), []);
    assert.deepEqual(computeWakePlan(null), []);
    assert.deepEqual(computeWakePlan(undefined), []);
  });
});

// ── classifyAccumulation ─────────────────────────────────────────────────────
describe("classifyAccumulation", () => {
  const snap = (o = {}) => ({ exists: true, sizeBytes: 1000, mtimeMs: 1, path: "a.jsonl", ...o });
  it("after not existing → waiting", () => {
    assert.equal(classifyAccumulation(snap(), { exists: false, sizeBytes: 0, mtimeMs: 0, path: null }), "waiting");
  });
  it("after exists but zero bytes → waiting", () => {
    assert.equal(classifyAccumulation(snap({ exists: false }), snap({ sizeBytes: 0 })), "waiting");
  });
  it("new transcript file (fresh session) with size>0 → accumulating", () => {
    const before = { exists: false, sizeBytes: 0, mtimeMs: 0, path: null };
    const after = snap({ path: "new-session.jsonl", sizeBytes: 50 });
    assert.equal(classifyAccumulation(before, after), "accumulating");
  });
  it("new path even when before had a path → accumulating", () => {
    assert.equal(classifyAccumulation(snap({ path: "old.jsonl" }), snap({ path: "new.jsonl", sizeBytes: 10 })), "accumulating");
  });
  it("same file grew past the floor → accumulating", () => {
    assert.equal(classifyAccumulation(snap({ sizeBytes: 1000 }), snap({ sizeBytes: 1600 }), { minGrowthBytes: 500 }), "accumulating");
  });
  it("same file grew but below the floor → waiting", () => {
    assert.equal(classifyAccumulation(snap({ sizeBytes: 1000 }), snap({ sizeBytes: 1100 }), { minGrowthBytes: 500 }), "waiting");
  });
  it("same file, no growth → waiting", () => {
    assert.equal(classifyAccumulation(snap({ sizeBytes: 1000 }), snap({ sizeBytes: 1000 })), "waiting");
  });
  it("null inputs → waiting (fail-soft)", () => {
    assert.equal(classifyAccumulation(null, null), "waiting");
  });
});

// ── nextAction (gate state machine) ──────────────────────────────────────────
describe("nextAction", () => {
  const grew = { exists: true, sizeBytes: 2000, mtimeMs: 2, path: "a.jsonl" };
  const stat = { exists: true, sizeBytes: 1000, mtimeMs: 1, path: "a.jsonl" };
  it("accumulating → advance", () => {
    const d = nextAction({ before: stat, after: grew, wakeAtMs: 0, nowMs: 10 }, { perSlotTimeoutMs: 1000, minGrowthBytes: 500 });
    assert.equal(d.action, "advance");
  });
  it("not accumulating + within timeout → wait", () => {
    const d = nextAction({ before: stat, after: stat, wakeAtMs: 0, nowMs: 500 }, { perSlotTimeoutMs: 1000 });
    assert.equal(d.action, "wait");
  });
  it("not accumulating + past timeout → skip", () => {
    const d = nextAction({ before: stat, after: stat, wakeAtMs: 0, nowMs: 1500 }, { perSlotTimeoutMs: 1000 });
    assert.equal(d.action, "skip");
  });
  it("boundary: elapsed == timeout → still wait (strict >)", () => {
    const d = nextAction({ before: stat, after: stat, wakeAtMs: 0, nowMs: 1000 }, { perSlotTimeoutMs: 1000 });
    assert.equal(d.action, "wait");
  });
  it("accumulation wins even past timeout", () => {
    const d = nextAction({ before: stat, after: grew, wakeAtMs: 0, nowMs: 99999 }, { perSlotTimeoutMs: 1000, minGrowthBytes: 500 });
    assert.equal(d.action, "advance");
  });
});

// ── renderWakeText / summarize ───────────────────────────────────────────────
describe("renderWakeText", () => {
  it("substitutes {slot} (all occurrences)", () => {
    assert.equal(renderWakeText("/checkin-{slot} {slot}", "kilo"), "/checkin-kilo kilo");
  });
  it("default template when none given", () => {
    assert.equal(renderWakeText(undefined, "oscar"), "/checkin-oscar");
  });
});
describe("summarize", () => {
  it("counts statuses", () => {
    const s = summarize([
      { status: "woke" }, { status: "woke" }, { status: "timeout" },
      { status: "skip" }, { status: "dry-run" },
    ]);
    assert.deepEqual(s, { total: 5, woke: 2, timeout: 1, skip: 1, dryRun: 1 });
  });
});

// ── readActiveFleet (I/O, fail-soft) ─────────────────────────────────────────
describe("readActiveFleet", () => {
  it("reads activeSlots from file, filters invalid slots", () => {
    const dir = tmp("afleet-");
    const f = path.join(dir, "active-fleet.json");
    fs.writeFileSync(f, JSON.stringify({ activeSlots: ["alpha", "kilo", "notaslot"] }));
    assert.deepEqual(readActiveFleet({ activeFleetFile: f }), ["alpha", "kilo"]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("missing file → fallback roster (the 17)", () => {
    const r = readActiveFleet({ activeFleetFile: path.join(os.tmpdir(), "does-not-exist-xyz.json") });
    assert.ok(r.includes("alpha") && r.includes("romeo") && r.includes("xray"));
    assert.ok(!r.includes("zulu"));
  });
  it("corrupt file → fallback (never throws)", () => {
    const dir = tmp("afleet-bad-");
    const f = path.join(dir, "active-fleet.json");
    fs.writeFileSync(f, "{not json");
    const r = readActiveFleet({ activeFleetFile: f });
    assert.ok(Array.isArray(r) && r.length > 0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("embedded fallback roster stays in sync with the real active-fleet.json (no silent drift)", () => {
    // The fallback list (FALLBACK_ACTIVE_FLEET) and active-fleet.json.activeSlots are
    // hand-maintained copies; this pins them equal so a roster edit can't silently
    // leave the fail-soft fallback stale (which would only surface when the file is
    // unreadable — exactly when you can't notice). Both go through SLOT_NAMES filtering.
    const realFile = path.join(HERE, "..", "state", "shared", "active-fleet.json");
    const fromFile = readActiveFleet({ activeFleetFile: realFile });
    const fromFallback = readActiveFleet({ activeFleetFile: path.join(os.tmpdir(), "missing-xyz-active-fleet.json") });
    assert.deepEqual(fromFallback, fromFile, "FALLBACK_ACTIVE_FLEET drifted from active-fleet.json — update the embedded list");
  });
});

// ── listPendingBriefSlots (I/O) ──────────────────────────────────────────────
describe("listPendingBriefSlots", () => {
  it("lists *.md slot briefs, excludes _delivered and non-slots", () => {
    const dir = tmp("briefs-");
    fs.writeFileSync(path.join(dir, "kilo.md"), "x");
    fs.writeFileSync(path.join(dir, "delta.md"), "x");
    fs.writeFileSync(path.join(dir, "_delivered.md"), "x");      // underscore → excluded
    fs.writeFileSync(path.join(dir, "notaslot.md"), "x");        // non-slot → excluded
    fs.writeFileSync(path.join(dir, "readme.txt"), "x");         // non-md → excluded
    const got = listPendingBriefSlots({ briefsDir: dir }).sort();
    assert.deepEqual(got, ["delta", "kilo"]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("missing dir → []", () => {
    assert.deepEqual(listPendingBriefSlots({ briefsDir: path.join(os.tmpdir(), "nope-xyz") }), []);
  });
});

// ── statSlotTranscript (I/O) ─────────────────────────────────────────────────
describe("statSlotTranscript", () => {
  it("picks the newest .jsonl in the slot project dir", () => {
    const dir = tmp("proj-");
    fs.writeFileSync(path.join(dir, "old.jsonl"), "a");
    const newer = path.join(dir, "new.jsonl");
    fs.writeFileSync(newer, "abcdef");
    // force new.jsonl to be newer
    const future = Date.now() / 1000 + 100;
    fs.utimesSync(newer, future, future);
    const st = statSlotTranscript("bravo", { projectDir: dir });
    assert.equal(st.exists, true);
    assert.equal(st.path, "new.jsonl");
    assert.equal(st.sizeBytes, 6);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("missing dir → not-exists snapshot", () => {
    const st = statSlotTranscript("bravo", { projectDir: path.join(os.tmpdir(), "no-proj-xyz") });
    assert.deepEqual(st, { exists: false, sizeBytes: 0, mtimeMs: 0, path: null });
  });
  it("falls back to shared-tree H--prism/<sessionId>.jsonl when the slot worktree dir is absent (golf case)", () => {
    const projectsRoot = tmp("projroot-");
    const sharedDir = path.join(projectsRoot, "H--prism");
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(path.join(sharedDir, "sess-123.jsonl"), "abcdef"); // 6 bytes
    const st = statSlotTranscript("golf", {
      projectsRoot,
      sessionId: "sess-123",
      projectDir: path.join(projectsRoot, "H--prism-slot-golf"), // absent → primary misses
    });
    assert.equal(st.exists, true);
    assert.equal(st.path, "sess-123.jsonl");
    assert.equal(st.sizeBytes, 6);
    fs.rmSync(projectsRoot, { recursive: true, force: true });
  });
  it("shared-tree fallback targets the EXACT session file, not newest (no cross-contamination)", () => {
    const projectsRoot = tmp("projroot2-");
    const sharedDir = path.join(projectsRoot, "H--prism");
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(path.join(sharedDir, "other-slot.jsonl"), "zzzzzzzzzzzz"); // a peer's transcript
    fs.writeFileSync(path.join(sharedDir, "mine.jsonl"), "ab");
    const st = statSlotTranscript("golf", { projectsRoot, sessionId: "mine", projectDir: path.join(projectsRoot, "absent") });
    assert.equal(st.path, "mine.jsonl", "must NOT pick the peer's newest file");
    assert.equal(st.sizeBytes, 2);
    fs.rmSync(projectsRoot, { recursive: true, force: true });
  });
});

// ── defaultSendKeys (the real actuation seam — was the P0/P1 gap) ─────────────
describe("defaultSendKeys (integration seam)", () => {
  it("resolves by `PRISM <slot>` (NOT topic) — topicless slots must still resolve", () => {
    let resolvedTitle = null;
    const r = defaultSendKeys("golf", "/checkin-golf", {
      resolveHwnd: (title) => { resolvedTitle = title; return { ok: true, hwnd: 4242 }; },
      _spawn: () => ({ status: 0, stdout: JSON.stringify({ ok: true, dryRun: false, chars: 12 }) }),
    });
    assert.equal(resolvedTitle, "PRISM golf", "must resolve by the stable PRISM <slot> caption, never the topic");
    assert.equal(r.ok, true);
    assert.equal(r.title, "PRISM golf");
  });
  it("passes PRISM_SENDKEYS_CONFIRM into the spawn env when confirm:true", () => {
    let spawnOpts = null;
    defaultSendKeys("alpha", "/checkin-alpha", {
      confirm: true,
      resolveHwnd: () => ({ ok: true, hwnd: 1 }),
      _spawn: (_e, _a, o) => { spawnOpts = o; return { status: 0, stdout: JSON.stringify({ ok: true, dryRun: false }) }; },
    });
    assert.ok(spawnOpts && spawnOpts.env, "env must be passed to spawn");
    assert.equal(spawnOpts.env.PRISM_SENDKEYS_CONFIRM, "1", "confirm gate must reach the child");
  });
  it("dry-run (confirm falsy) does NOT set PRISM_SENDKEYS_CONFIRM", () => {
    let spawnOpts = null;
    const r = defaultSendKeys("alpha", "/checkin-alpha", {
      resolveHwnd: () => ({ ok: true, hwnd: 1 }),
      _spawn: (_e, _a, o) => { spawnOpts = o; return { status: 0, stdout: JSON.stringify({ ok: true, dryRun: true }) }; },
    });
    assert.ok(spawnOpts.env, "env still passed");
    assert.notEqual(spawnOpts.env.PRISM_SENDKEYS_CONFIRM, "1");
    assert.equal(r.dryRun, true);
  });
  it("dry-run STRIPS an ambient PRISM_SENDKEYS_CONFIRM (safe even if globally exported)", () => {
    const prev = process.env.PRISM_SENDKEYS_CONFIRM;
    process.env.PRISM_SENDKEYS_CONFIRM = "1"; // operator exported it globally
    try {
      let spawnOpts = null;
      defaultSendKeys("alpha", "/checkin-alpha", {
        // no confirm → dry-run
        resolveHwnd: () => ({ ok: true, hwnd: 1 }),
        _spawn: (_e, _a, o) => { spawnOpts = o; return { status: 0, stdout: JSON.stringify({ ok: true, dryRun: true }) }; },
      });
      assert.notEqual(spawnOpts.env.PRISM_SENDKEYS_CONFIRM, "1", "ambient confirm must be stripped in dry-run");
    } finally {
      if (prev === undefined) delete process.env.PRISM_SENDKEYS_CONFIRM;
      else process.env.PRISM_SENDKEYS_CONFIRM = prev;
    }
  });
  it("resolve failure → skip, NEVER spawns (R12: no wrong-window send)", () => {
    let spawned = false;
    const r = defaultSendKeys("kilo", "/checkin-kilo", {
      resolveHwnd: () => ({ ok: false, error: "ambiguous-contains" }),
      _spawn: () => { spawned = true; return { status: 0, stdout: "{}" }; },
    });
    assert.equal(spawned, false, "must NOT actuate when HWND is ambiguous/unresolved");
    assert.equal(r.ok, false);
    assert.match(r.error, /ambiguous/);
  });
});

// ── lock ─────────────────────────────────────────────────────────────────────
describe("acquireLock / releaseLock", () => {
  it("acquires, blocks a live double-acquire, releases", () => {
    const dir = tmp("lock-");
    const lf = path.join(dir, "seq.lock");
    const a = acquireLock({ lockFile: lf });
    assert.equal(a.ok, true);
    // second acquire while holder (this process) is alive → blocked
    const b = acquireLock({ lockFile: lf });
    assert.equal(b.ok, false);
    assert.ok(b.heldBy && b.heldBy.pid === process.pid);
    releaseLock(lf);
    assert.equal(fs.existsSync(lf), false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("reclaims a stale lock (dead pid)", () => {
    const dir = tmp("lock-stale-");
    const lf = path.join(dir, "seq.lock");
    fs.writeFileSync(lf, JSON.stringify({ pid: 999999999, host: "x", startedAt: new Date().toISOString() }));
    const a = acquireLock({ lockFile: lf });
    assert.equal(a.ok, true, "dead-pid holder must be reclaimable");
    releaseLock(lf);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("reclaims an aged-out lock even if pid alive", () => {
    const dir = tmp("lock-aged-");
    const lf = path.join(dir, "seq.lock");
    const old = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
    fs.writeFileSync(lf, JSON.stringify({ pid: process.pid, host: "x", startedAt: old }));
    const a = acquireLock({ lockFile: lf, lockStaleMs: 1000 });
    assert.equal(a.ok, true);
    releaseLock(lf);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

// ── runSequencer (injected-I/O E2E) ──────────────────────────────────────────
describe("runSequencer (injected I/O)", () => {
  const noSleep = () => Promise.resolve();
  // monotonically advancing clock
  function clock(stepMs) { let t = 0; return () => (t += stepMs); }

  it("wakes a slot, gates on token-accumulation → woke", async () => {
    let polls = 0;
    const out = await runSequencer({
      slots: ["alpha"],
      sendFn: async () => ({ ok: true, dryRun: false, hwnd: 1 }),
      statFn: () => (polls++ === 0
        ? { exists: true, sizeBytes: 1000, mtimeMs: 1, path: "a.jsonl" }       // before
        : { exists: true, sizeBytes: 2000, mtimeMs: 2, path: "a.jsonl" }),     // after (grew)
      now: clock(1),
      sleep: noSleep,
      minGrowthBytes: 500,
      perSlotTimeoutMs: 100000,
    });
    assert.equal(out.results[0].status, "woke");
    assert.equal(out.summary.woke, 1);
  });

  it("times out when transcript never grows → timeout (fleet not blocked)", async () => {
    const flat = { exists: true, sizeBytes: 1000, mtimeMs: 1, path: "a.jsonl" };
    const out = await runSequencer({
      slots: ["alpha"],
      sendFn: async () => ({ ok: true, dryRun: false, hwnd: 1 }),
      statFn: () => flat,                 // never grows
      now: clock(1000),                   // each call +1000ms; timeout 10ms → skip fast
      sleep: noSleep,
      perSlotTimeoutMs: 10,
      pollMs: 1,
    });
    assert.equal(out.results[0].status, "timeout");
  });

  it("dry-run send → status dry-run, no gating", async () => {
    let statCalls = 0;
    const out = await runSequencer({
      slots: ["alpha"],
      sendFn: async () => ({ ok: true, dryRun: true, hwnd: 7, topic: "alpha-work" }),
      statFn: () => { statCalls++; return { exists: true, sizeBytes: 1, mtimeMs: 1, path: "a.jsonl" }; },
      now: clock(1),
      sleep: noSleep,
    });
    assert.equal(out.results[0].status, "dry-run");
    assert.equal(out.results[0].wouldSend, "/checkin-alpha");
    // statFn called once for the before-snapshot only; never gates in dry-run
    assert.equal(statCalls, 1);
  });

  it("send failure → skip (cannot gate a chat never woken)", async () => {
    const out = await runSequencer({
      slots: ["alpha"],
      sendFn: async () => ({ ok: false, error: "hwnd:no-match" }),
      statFn: () => ({ exists: false, sizeBytes: 0, mtimeMs: 0, path: null }),
      now: clock(1),
      sleep: noSleep,
    });
    assert.equal(out.results[0].status, "skip");
    assert.equal(out.results[0].reason, "hwnd:no-match");
  });

  it("honors self-exclusion + golf front-load across multiple slots", async () => {
    const woken = [];
    const out = await runSequencer({
      slots: ["alpha", "golf", "bravo", "charlie"],
      selfSlot: "bravo",
      sendFn: async (slot) => { woken.push(slot); return { ok: true, dryRun: false, hwnd: 1 }; },
      statFn: () => ({ exists: true, sizeBytes: 9999, mtimeMs: 9, path: `${woken.length}.jsonl` }), // always "new path" → accumulating
      now: clock(1),
      sleep: noSleep,
      minGrowthBytes: 1,
    });
    assert.deepEqual(out.plan, ["golf", "alpha", "charlie"]); // bravo excluded, golf first
    assert.equal(out.summary.woke, 3);
  });

  it("empty plan → no work", async () => {
    const out = await runSequencer({ slots: [], sleep: noSleep, now: clock(1) });
    assert.deepEqual(out.plan, []);
    assert.equal(out.summary.total, 0);
  });
});

// ── spawned CLI E2E (hermetic: unknown slot → empty plan, no powershell) ──────
describe("CLI E2E (spawned, temp PRISM_ROOT)", () => {
  it("parses args, acquires+releases lock, emits valid JSON for an empty plan", () => {
    const root = tmp("seq-cli-");
    fs.mkdirSync(path.join(root, "state/shared/.cron-locks"), { recursive: true });
    const run = spawnSync(process.execPath, [SCRIPT, "--slots", "notaslot", "--json"], {
      env: { ...process.env, PRISM_ROOT: root }, encoding: "utf8", timeout: 30000,
    });
    assert.equal(run.status, 0, `exit 0; stderr=${run.stderr}`);
    const parsed = JSON.parse(run.stdout.trim());
    assert.equal(parsed.ok, true);
    assert.equal(parsed.summary.total, 0, "unknown slot dropped → empty plan");
    assert.deepEqual(parsed.plan, []);
    // lock released after run
    assert.equal(fs.existsSync(path.join(root, "state/shared/.cron-locks/fleet-wake-sequencer.lock")), false);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
