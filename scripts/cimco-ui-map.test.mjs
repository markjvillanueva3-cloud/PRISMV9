// Tests for scripts/cimco-ui-map.mjs (U-CIMCO-SIM-3) — the CIMCO ribbon navigation FSM.
//
// Real-behavior tests (R9): every assertion encodes WHY the behavior matters for a CNC sim driver.
// No live CIMCO — the driver spawn is injected as a spy, so navigateLive's per-step-verify loop is
// exercised deterministically. The crux: no unrealized/drifted/blocked landing may ever report ok:true,
// AND the superset-state (machine-sim-running) must never be mis-ID'd as the less-advanced backplot.
//
// Run: node --test scripts/cimco-ui-map.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  distinctiveControls,
  signatureOf,
  fingerprint,
  screenMatches,
  matchScreen,
  shortestPath,
  pathResult,
  renderMap,
  driver,
  navigateLive,
  REALIZATION_FLOOR,
} from "./cimco-ui-map.mjs";

// ── fixtures ─────────────────────────────────────────────────────────────
// A realized `--op map` envelope must report walked >= REALIZATION_FLOOR (50). We pad the controls
// list to clear the floor while keeping the named discriminators explicit.
function mapEnvelope(names, { ok = true, walked = 1530 } = {}) {
  return {
    ok, op: "map", frame: "0x1",
    controls: names.map((n) => ({ name: n, role: "pushbutton", da: "Click", cid: 0, path: "Ribbon" })),
    count: names.length, walked,
  };
}

const TEST_MAP = {
  controller: "cimco-edit-2026",
  screens: {
    editor: { name: "Editor", discriminator: ["Editor", "NC Functions"] },
    backplot: {
      name: "Backplot", discriminator: ["Machine Simulation", "Backplot Setup", "Configure Machine Type"],
      discriminatorAbsent: ["Solid Model", "Show Machine Origin"],
    },
    "machine-sim-running": {
      name: "Sim running", discriminator: ["Machine Simulation", "Solid Model", "Show Machine Origin"],
    },
  },
  transitions: [
    { from: "editor", key: "Backplot", to: "backplot", da: "Switch", label: "to Backplot" },
    { from: "backplot", key: "Machine Simulation", to: "machine-sim-running", da: "Click", label: "engage sim" },
  ],
  gaps: ["x"],
};

const EDITOR_CTLS = ["Editor", "NC Functions"];
const BACKPLOT_CTLS = ["Machine Simulation", "Backplot Setup", "Configure Machine Type", "Machine", "Control"];
// running keeps the Backplot controls AND adds the two sim-only controls (the superset).
const RUNNING_CTLS = [...BACKPLOT_CTLS, "Solid Model", "Show Machine Origin"];

// ── distinctiveControls / signatureOf ────────────────────────────────────
test("distinctiveControls: dedups, sorts, drops chrome", () => {
  const got = distinctiveControls([
    { name: "Backplot" }, { name: "Backplot" }, { name: "Close" }, { name: "Minimize" }, { name: "Machine Simulation" },
  ]);
  assert.deepEqual(got, ["Backplot", "Machine Simulation"]); // Close/Minimize dropped, deduped, sorted
});

test("signatureOf: realized when walked >= floor", () => {
  const sig = signatureOf(mapEnvelope(BACKPLOT_CTLS, { walked: 1530 }));
  assert.equal(sig.realized, true);
  assert.equal(sig.ok, true);
  assert.ok(sig.controls.includes("Machine Simulation"));
});

test("signatureOf: NOT realized when walked < floor (chrome-only cold launch)", () => {
  // A cold background launch returns only window chrome (~15-21 walked). Must be unrealized.
  const sig = signatureOf(mapEnvelope(["Minimize", "Close"], { walked: 18 }));
  assert.equal(sig.realized, false);
});

test("signatureOf: floor uses walked (raw), not deduped count", () => {
  // count small (1 named control) but walked above floor → still realized.
  const env = { ok: true, op: "map", controls: [{ name: "Machine Simulation" }], count: 1, walked: 200 };
  assert.equal(signatureOf(env).realized, true);
});

test("signatureOf: null / {} → empty, unrealized, fail-safe (matches nothing)", () => {
  for (const bad of [null, {}, { ok: false }]) {
    const sig = signatureOf(bad);
    assert.deepEqual(sig.controls, []);
    assert.equal(sig.realized, false);
  }
});

// ── fingerprint ──────────────────────────────────────────────────────────
test("fingerprint: order-independent + stable", () => {
  const a = fingerprint({ controls: ["B", "A"] });
  const b = fingerprint({ controls: ["A", "B"] });
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{12}$/);
});

// ── screenMatches (discriminator + discriminatorAbsent) ──────────────────
test("screenMatches: all discriminators present → true", () => {
  const sig = signatureOf(mapEnvelope(EDITOR_CTLS));
  assert.equal(screenMatches(TEST_MAP.screens.editor, sig), true);
});

test("screenMatches: a missing discriminator → false", () => {
  const sig = signatureOf(mapEnvelope(["Editor"])); // missing "NC Functions"
  assert.equal(screenMatches(TEST_MAP.screens.editor, sig), false);
});

test("screenMatches: empty discriminator NEVER matches (no catch-all)", () => {
  const sig = signatureOf(mapEnvelope(BACKPLOT_CTLS));
  assert.equal(screenMatches({ discriminator: [] }, sig), false);
  assert.equal(screenMatches({}, sig), false);
});

test("screenMatches: discriminatorAbsent excludes the superset state from backplot", () => {
  // THE reviewer-caught bug: a RUNNING ribbon (has Solid Model) must NOT match backplot.
  const runningSig = signatureOf(mapEnvelope(RUNNING_CTLS));
  assert.equal(screenMatches(TEST_MAP.screens.backplot, runningSig), false, "running ribbon excluded from backplot");
  // a plain backplot ribbon (no Solid Model) DOES match backplot.
  const backplotSig = signatureOf(mapEnvelope(BACKPLOT_CTLS));
  assert.equal(screenMatches(TEST_MAP.screens.backplot, backplotSig), true);
});

// ── matchScreen ──────────────────────────────────────────────────────────
test("matchScreen: unrealized ribbon → unrealized:true, no match (realization gate FIRST)", () => {
  const sig = signatureOf(mapEnvelope(["Close"], { walked: 18 }));
  const m = matchScreen(TEST_MAP, sig);
  assert.equal(m.unrealized, true);
  assert.equal(m.match, null);
});

test("matchScreen: exact single match → confidence 1.0", () => {
  const m = matchScreen(TEST_MAP, signatureOf(mapEnvelope(EDITOR_CTLS)));
  assert.equal(m.match, "editor");
  assert.equal(m.confidence, 1.0);
});

test("matchScreen: no candidate → match null, not unrealized", () => {
  const m = matchScreen(TEST_MAP, signatureOf(mapEnvelope(["Wholly", "Unknown", "Controls", "Here", "Padding"], { walked: 200 })));
  assert.equal(m.match, null);
  assert.equal(m.unrealized, false);
});

test("matchScreen: RUNNING ribbon resolves to machine-sim-running, NOT backplot (the safety crux)", () => {
  // backplot is excluded by discriminatorAbsent, so only machine-sim-running matches → unique.
  const m = matchScreen(TEST_MAP, signatureOf(mapEnvelope(RUNNING_CTLS)));
  assert.equal(m.match, "machine-sim-running", "running state must NOT be mis-ID'd as backplot");
  assert.equal(m.ambiguous, false);
});

// ── shortestPath / pathResult ────────────────────────────────────────────
test("shortestPath: editor → machine-sim-running is 2 hops via backplot", () => {
  const p = shortestPath(TEST_MAP, "editor", "machine-sim-running");
  assert.deepEqual(p.map((s) => s.key), ["Backplot", "Machine Simulation"]);
});

test("shortestPath: already there → []", () => {
  assert.deepEqual(shortestPath(TEST_MAP, "backplot", "backplot"), []);
});

test("shortestPath: no path → null", () => {
  assert.equal(shortestPath(TEST_MAP, "machine-sim-running", "editor"), null); // no reverse edges
});

test("pathResult: envelope shape", () => {
  const r = pathResult(TEST_MAP, "editor", "backplot");
  assert.equal(r.ok, true);
  assert.deepEqual(r.keys, ["Backplot"]);
  assert.equal(r.hops, 1);
  const none = pathResult(TEST_MAP, "machine-sim-running", "editor");
  assert.equal(none.ok, false);
  assert.match(none.error, /no path/);
});

test("renderMap: includes screens, transitions, gaps", () => {
  const md = renderMap(TEST_MAP);
  assert.match(md, /## editor/);
  assert.match(md, /Backplot→backplot/);
  assert.match(md, /Unmapped gaps/);
});

// ── driver (injected spawn) ──────────────────────────────────────────────
function fakeSpawn(ret) { return () => ret; }

test("driver: parses tail JSON past a trailing logger line", () => {
  const out = "loading dll\n{\"ok\":true,\"op\":\"map\",\"controls\":[],\"count\":0,\"walked\":0}\nWARN flushed\n";
  const r = driver("U.exe", ["--op", "map"], fakeSpawn({ status: 0, stdout: out, stderr: "" }));
  assert.equal(r.ok, true);
  assert.equal(r.op, "map");
});

test("driver: timeout (status===null) ALWAYS throws, even with partial stdout (fail-closed)", () => {
  // reviewer-caught: a timeout-with-partial-stdout must not slip a stale result through.
  assert.throws(
    () => driver("U.exe", ["--op", "map"], fakeSpawn({ status: null, stdout: '{"ok":true,"op":"map","walked":1530}', stderr: "" })),
    /timed out/,
  );
});

test("driver: no parseable JSON → throws (fail-closed, not silent)", () => {
  assert.throws(() => driver("U.exe", ["--op", "map"], fakeSpawn({ status: 0, stdout: "garbage", stderr: "boom" })), /no parseable JSON/);
});

test("driver: spawn error → throws", () => {
  assert.throws(() => driver("U.exe", ["--op", "map"], fakeSpawn({ status: 1, error: new Error("ENOENT"), stdout: "" })), /spawn failed/);
});

// ── navigateLive (the per-step-verify loop) ──────────────────────────────
// A scripted spawn: returns map/invoke responses in sequence so we can drive the FSM deterministically.
function scriptedSpawn(responses) {
  let i = 0;
  return () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return { status: 0, stdout: JSON.stringify(r), stderr: "" };
  };
}

test("navigateLive: happy 2-hop, each verified exact", async () => {
  // whereami(editor) → invoke Backplot → whereami(backplot) → invoke MachineSim → whereami(running)
  const spawn = scriptedSpawn([
    mapEnvelope(EDITOR_CTLS),          // whereami → editor
    { ok: true, op: "invoke", invoked: "Backplot", effectUnverified: true }, // invoke Backplot
    mapEnvelope(BACKPLOT_CTLS),        // re-probe → backplot
    { ok: true, op: "invoke", invoked: "Machine Simulation", effectUnverified: true },
    mapEnvelope(RUNNING_CTLS),         // re-probe → machine-sim-running
  ]);
  const r = await navigateLive("machine-sim-running", { map: TEST_MAP, spawn, sleepMs: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.steps.length, 2);
  assert.ok(r.steps.every((s) => s.verified === "exact"));
});

test("navigateLive: DRIFT after a hop → ok:false, STOPS, never proceeds", async () => {
  const spawn = scriptedSpawn([
    mapEnvelope(EDITOR_CTLS),          // whereami → editor
    { ok: true, op: "invoke", invoked: "Backplot" },
    mapEnvelope(EDITOR_CTLS),          // re-probe STILL editor (drift — invoke didn't land)
  ]);
  const r = await navigateLive("machine-sim-running", { map: TEST_MAP, spawn, sleepMs: 0 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /drift after 'Backplot'/);
  assert.equal(r.steps.length, 1); // stopped after the first failed hop
});

test("navigateLive: unrealized START → needsRealization, NO invoke fired", async () => {
  const spawn = scriptedSpawn([mapEnvelope(["Close"], { walked: 18 })]); // whereami unrealized
  const r = await navigateLive("backplot", { map: TEST_MAP, spawn, sleepMs: 0 });
  assert.equal(r.ok, false);
  assert.equal(r.needsRealization, true);
});

test("navigateLive: a BLOCKED invoke (modal) → ok:false, NOT a verified hop", async () => {
  const spawn = scriptedSpawn([
    mapEnvelope(EDITOR_CTLS),          // whereami → editor
    { ok: true, op: "invoke", invoked: "Backplot", blocked: true, note: "modal opened" }, // blocked
  ]);
  const r = await navigateLive("backplot", { map: TEST_MAP, spawn, sleepMs: 0 });
  assert.equal(r.ok, false);
  assert.equal(r.blocked, true);
  assert.match(r.reason, /blocked/);
  assert.ok(!r.steps.some((s) => s.verified === "exact"));
});

test("navigateLive: unknown target screen → ok:false, no invoke", async () => {
  const spawn = scriptedSpawn([mapEnvelope(EDITOR_CTLS)]);
  const r = await navigateLive("no-such-screen", { map: TEST_MAP, spawn, sleepMs: 0 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /unknown target/);
});

test("navigateLive: --plan (execute:false) returns the planned path without invoking", async () => {
  const spawn = scriptedSpawn([mapEnvelope(EDITOR_CTLS)]);
  const r = await navigateLive("machine-sim-running", { map: TEST_MAP, spawn, execute: false, sleepMs: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.executed, false);
  assert.equal(r.planned.length, 2);
});

// ── ADVERSARIAL ──────────────────────────────────────────────────────────
test("ADVERSARIAL: an invoke that FAILS (ok:false) must never yield a verified hop", async () => {
  const spawn = scriptedSpawn([
    mapEnvelope(EDITOR_CTLS),
    { ok: false, op: "invoke", error: "refused" },
  ]);
  const r = await navigateLive("backplot", { map: TEST_MAP, spawn, sleepMs: 0 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /invoke 'Backplot' failed/);
});

test("ADVERSARIAL: ribbon goes unrealized MID-PATH → halt, never ok:true", async () => {
  const spawn = scriptedSpawn([
    mapEnvelope(EDITOR_CTLS),          // whereami → editor
    { ok: true, op: "invoke", invoked: "Backplot" },
    mapEnvelope(["Close"], { walked: 18 }), // re-probe unrealized
  ]);
  const r = await navigateLive("backplot", { map: TEST_MAP, spawn, sleepMs: 0 });
  assert.equal(r.ok, false);
  assert.equal(r.needsRealization, true);
});
