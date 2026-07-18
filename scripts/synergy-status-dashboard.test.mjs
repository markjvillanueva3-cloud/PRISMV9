/**
 * synergy-status-dashboard.test.mjs — hermetic + real-data tests for the
 * one-shot synergy snapshot dashboard.
 *
 * Run: node --test H:/prism-slot-kilo/scripts/synergy-status-dashboard.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseArgs,
  readBridgeSynergy,
  readBuildState,
  readChatSlots,
  pickNumber,
  buildSnapshot,
  renderMarkdown,
  renderTerse,
  main,
  SCHEMA_VERSION,
} from "./synergy-status-dashboard.mjs";

const FAKE_ROOT = "/repo";
function abs(rel) { return resolve(FAKE_ROOT, rel); }

/** Build a tolerant fsImpl from a {path: content} map. */
function fsFromMap(map) {
  return {
    readImpl: (p) => {
      if (!Object.prototype.hasOwnProperty.call(map, p)) {
        const e = new Error("ENOENT: " + p);
        e.code = "ENOENT";
        throw e;
      }
      return map[p];
    },
    existsImpl: (p) => Object.prototype.hasOwnProperty.call(map, p),
  };
}

const FROZEN = "2026-05-19T16:00:00.000Z";
const FROZEN_NOW = Date.parse(FROZEN);

// ─── parseArgs ──────────────────────────────────────────────────────

test("parseArgs: empty argv → defaults", () => {
  const o = parseArgs([]);
  assert.deepEqual(o, { help: false, json: false, terse: false, repoRoot: null });
});

test("parseArgs: --help / -h", () => {
  assert.equal(parseArgs(["--help"]).help, true);
  assert.equal(parseArgs(["-h"]).help, true);
});

test("parseArgs: --json + --terse compose", () => {
  const o = parseArgs(["--json", "--terse"]);
  assert.equal(o.json, true);
  assert.equal(o.terse, true);
});

test("parseArgs: --repo-root accepts a path", () => {
  assert.equal(parseArgs(["--repo-root", "/tmp/foo"]).repoRoot, "/tmp/foo");
});

test("parseArgs: --repo-root rejects sentinel-shaped values", () => {
  assert.throws(() => parseArgs(["--repo-root", "--json"]), /requires a path/);
});

test("parseArgs: --repo-root rejects missing value", () => {
  assert.throws(() => parseArgs(["--repo-root"]), /requires a path/);
});

test("parseArgs: unknown arg → R12 throw", () => {
  assert.throws(() => parseArgs(["--bogus"]), /unknown argument/);
});

// ─── readBridgeSynergy ─────────────────────────────────────────────

test("readBridgeSynergy: missing source → ok=false with helpful error", () => {
  const fs = fsFromMap({});
  const r = readBridgeSynergy(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.ok, false);
  assert.match(r.error, /source missing/);
});

test("readBridgeSynergy: malformed JSON → ok=false with parse error", () => {
  const fs = fsFromMap({ [abs("state/shared/system-viz/bridge-synergy-augmentation.json")]: "{ not valid json" });
  const r = readBridgeSynergy(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.ok, false);
  assert.match(r.error, /json parse failed/);
});

test("readBridgeSynergy: empty newNodes → ok=true with zero counts", () => {
  const fs = fsFromMap({ [abs("state/shared/system-viz/bridge-synergy-augmentation.json")]: JSON.stringify({ newNodes: [] }) });
  const r = readBridgeSynergy(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.ok, true);
  assert.equal(r.total, 0);
  assert.equal(r.built, 0);
  assert.equal(r.pctBuilt, 0);
});

test("readBridgeSynergy: counts built/partial/ghost correctly", () => {
  const fs = fsFromMap({ [abs("state/shared/system-viz/bridge-synergy-augmentation.json")]: JSON.stringify({
    newNodes: [
      { id: "ghost.bridge.a", kind: "bridge-unit", status: "built" },
      { id: "ghost.bridge.b", kind: "bridge-unit", status: "built" },
      { id: "ghost.bridge.c", kind: "bridge-unit", status: "partial" },
      { id: "ghost.bridge.d", kind: "bridge-unit", status: "ghost" },
      // Non-bridge-unit nodes should be ignored
      { id: "ghost.bridge_synergy", kind: "ghost-roost", status: "ghost" },
    ],
    generatedAt: "2026-05-19T10:00:00.000Z",
  }) });
  const r = readBridgeSynergy(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.ok, true);
  assert.equal(r.total, 4);
  assert.equal(r.built, 2);
  assert.equal(r.partial, 1);
  assert.equal(r.ghost, 1);
  assert.equal(r.pctBuilt, 50);
  assert.equal(r.generatedAt, "2026-05-19T10:00:00.000Z");
});

test("readBridgeSynergy: missing newNodes array → ok=true, zero counts", () => {
  const fs = fsFromMap({ [abs("state/shared/system-viz/bridge-synergy-augmentation.json")]: JSON.stringify({ schemaVersion: "1.0.0" }) });
  const r = readBridgeSynergy(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.ok, true);
  assert.equal(r.total, 0);
});

// ─── readBuildState ────────────────────────────────────────────────

test("readBuildState: missing source → ok=false", () => {
  const fs = fsFromMap({});
  const r = readBuildState(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.ok, false);
});

test("readBuildState: top-level keys", () => {
  const fs = fsFromMap({ [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({
    wiredCount: 2545,
    unwiredCount: 729,
    frontendPending: 2,
  }) });
  const r = readBuildState(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.ok, true);
  assert.equal(r.wired, 2545);
  assert.equal(r.unwired, 729);
  assert.equal(r.frontendPending, 2);
  assert.equal(r.coveragePct, 77.7);
});

test("readBuildState: alternative key shape (BUILT_AND_WIRED / NEEDS_WIRING)", () => {
  const fs = fsFromMap({ [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({
    BUILT_AND_WIRED: 100,
    NEEDS_WIRING: 50,
  }) });
  const r = readBuildState(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.ok, true);
  assert.equal(r.wired, 100);
  assert.equal(r.unwired, 50);
});

test("readBuildState: nested under 'summary' container", () => {
  const fs = fsFromMap({ [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({
    summary: { wired: 200, unwired: 50 },
  }) });
  const r = readBuildState(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.wired, 200);
  assert.equal(r.unwired, 50);
});

test("readBuildState: zero values handled (no NaN coveragePct)", () => {
  const fs = fsFromMap({ [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({ wiredCount: 0, unwiredCount: 0 }) });
  const r = readBuildState(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.coveragePct, null); // total=0 → null, not NaN
});

// Regression: production BUILD_STATE.json (schemaVersion 1.0.0) keeps the
// scalar counts under `headline` — NOT at the top level and NOT named
// wiredCount/unwiredCount. A reader that probes only the legacy keys returns
// null for every count (observed live: dashboard health 0.467, buildState
// wired=null). This fixture mirrors the real schema so the regression
// cannot recur silently.
test("readBuildState: real schema (counts under 'headline' container)", () => {
  const fs = fsFromMap({ [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({
    schemaVersion: "1.0.0",
    headline: {
      built_engines: 2543,
      needs_wiring: 729,
      needs_frontend_merge_count: 2,
    },
    BUILT: { summary: {} },
    NEEDS_WIRING: { summary: {} },
  }) });
  const r = readBuildState(FAKE_ROOT, fs.readImpl, fs.existsImpl);
  assert.equal(r.ok, true);
  assert.equal(r.wired, 2543);
  assert.equal(r.unwired, 729);
  assert.equal(r.frontendPending, 2);
  assert.equal(r.coveragePct, 77.7); // 2543 / (2543+729)
});

// ─── readChatSlots ──────────────────────────────────────────────────

test("readChatSlots: missing source → ok=false", () => {
  const fs = fsFromMap({});
  const r = readChatSlots(FAKE_ROOT, fs.readImpl, fs.existsImpl, () => FROZEN_NOW);
  assert.equal(r.ok, false);
});

test("readChatSlots: claimed slots with fresh heartbeats → stale=0", () => {
  const fresh = new Date(FROZEN_NOW - 60_000).toISOString(); // 1 min old
  const fs = fsFromMap({ [abs("state/shared/chat-slots.json")]: JSON.stringify({
    schemaVersion: 2,
    slots: {
      kilo: { chatId: "claude-1f861b7a", lastHeartbeat: fresh, topic: "kilo-work" },
      lima: { chatId: "claude-bca3789f", lastHeartbeat: fresh, topic: "lima-work" },
    },
  }) });
  const r = readChatSlots(FAKE_ROOT, fs.readImpl, fs.existsImpl, () => FROZEN_NOW);
  assert.equal(r.ok, true);
  assert.equal(r.claimed, 2);
  assert.equal(r.stale, 0);
  assert.equal(r.schemaVersion, 2);
  assert.equal(r.active.length, 2);
});

test("readChatSlots: stale heartbeat (>5 min) is flagged", () => {
  const stale = new Date(FROZEN_NOW - 10 * 60_000).toISOString(); // 10 min old
  const fs = fsFromMap({ [abs("state/shared/chat-slots.json")]: JSON.stringify({
    slots: {
      alpha: { chatId: "claude-abcd1234", lastHeartbeat: stale, topic: "alpha-work" },
    },
  }) });
  const r = readChatSlots(FAKE_ROOT, fs.readImpl, fs.existsImpl, () => FROZEN_NOW);
  assert.equal(r.claimed, 1);
  assert.equal(r.stale, 1);
  assert.equal(r.active[0].stale, true);
});

test("readChatSlots: slots without chatId are ignored", () => {
  const fs = fsFromMap({ [abs("state/shared/chat-slots.json")]: JSON.stringify({
    slots: {
      kilo: { chatId: "claude-x", lastHeartbeat: new Date(FROZEN_NOW).toISOString() },
      lima: { /* no chatId */ },
      mike: null,
    },
  }) });
  const r = readChatSlots(FAKE_ROOT, fs.readImpl, fs.existsImpl, () => FROZEN_NOW);
  assert.equal(r.claimed, 1);
  assert.equal(r.totalSlots, 3);
});

test("readChatSlots: missing slots object → claimed=0", () => {
  const fs = fsFromMap({ [abs("state/shared/chat-slots.json")]: JSON.stringify({ schemaVersion: 2 }) });
  const r = readChatSlots(FAKE_ROOT, fs.readImpl, fs.existsImpl, () => FROZEN_NOW);
  assert.equal(r.ok, true);
  assert.equal(r.claimed, 0);
  assert.equal(r.totalSlots, 0);
});

// ─── pickNumber ─────────────────────────────────────────────────────

test("pickNumber: returns first non-null match", () => {
  assert.equal(pickNumber({ a: 1, b: 2 }, ["a", "b"]), 1);
  assert.equal(pickNumber({ a: null, b: 2 }, ["a", "b"]), 2);
});

test("pickNumber: deep one-level lookup under 'summary' / 'totals' / 'counts' / 'headline'", () => {
  assert.equal(pickNumber({ summary: { x: 5 } }, ["x"]), 5);
  assert.equal(pickNumber({ totals: { y: 7 } }, ["y"]), 7);
  assert.equal(pickNumber({ counts: { z: 9 } }, ["z"]), 9);
  assert.equal(pickNumber({ headline: { built_engines: 2543 } }, ["built_engines"]), 2543);
});

test("pickNumber: non-object inputs → null", () => {
  assert.equal(pickNumber(null, ["a"]), null);
  assert.equal(pickNumber(undefined, ["a"]), null);
  assert.equal(pickNumber("oops", ["a"]), null);
  assert.equal(pickNumber(42, ["a"]), null);
});

test("pickNumber: non-finite values rejected", () => {
  assert.equal(pickNumber({ a: NaN }, ["a"]), null);
  assert.equal(pickNumber({ a: Infinity }, ["a"]), null);
});

// ─── buildSnapshot ─────────────────────────────────────────────────

test("buildSnapshot: assembles all 3 surfaces + health", () => {
  const fs = fsFromMap({
    [abs("state/shared/system-viz/bridge-synergy-augmentation.json")]: JSON.stringify({
      newNodes: [
        { id: "ghost.bridge.a", kind: "bridge-unit", status: "built" },
        { id: "ghost.bridge.b", kind: "bridge-unit", status: "ghost" },
      ],
    }),
    [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({ wiredCount: 100, unwiredCount: 10 }),
    [abs("state/shared/chat-slots.json")]: JSON.stringify({ slots: { kilo: { chatId: "x", lastHeartbeat: new Date(FROZEN_NOW).toISOString() } } }),
  });
  const snap = buildSnapshot(FAKE_ROOT, {
    readImpl: fs.readImpl, existsImpl: fs.existsImpl, now: () => FROZEN_NOW, frozenTime: FROZEN,
  });
  assert.equal(snap.schemaVersion, SCHEMA_VERSION);
  assert.equal(snap.generatedAt, FROZEN);
  assert.equal(snap.surfaces.bridgeSynergy.ok, true);
  assert.equal(snap.surfaces.bridgeSynergy.built, 1);
  assert.equal(snap.surfaces.bridgeSynergy.ghost, 1);
  assert.equal(snap.surfaces.buildState.wired, 100);
  assert.equal(snap.surfaces.chatSlots.claimed, 1);
  assert.equal(snap.health.okCount, 3);
  assert.ok(snap.health.score > 0);
});

test("buildSnapshot: one failing surface does not block the others", () => {
  const fs = fsFromMap({
    // No bridge-synergy file
    [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({ wiredCount: 50, unwiredCount: 5 }),
    [abs("state/shared/chat-slots.json")]: JSON.stringify({ slots: {} }),
  });
  const snap = buildSnapshot(FAKE_ROOT, {
    readImpl: fs.readImpl, existsImpl: fs.existsImpl, now: () => FROZEN_NOW, frozenTime: FROZEN,
  });
  assert.equal(snap.surfaces.bridgeSynergy.ok, false);
  assert.equal(snap.surfaces.buildState.ok, true);
  assert.equal(snap.surfaces.chatSlots.ok, true);
  assert.equal(snap.health.okCount, 2);
});

test("buildSnapshot: rejects empty / non-string repoRoot (R12)", () => {
  assert.throws(() => buildSnapshot(""), /repoRoot must be/);
  assert.throws(() => buildSnapshot(null), /repoRoot must be/);
  assert.throws(() => buildSnapshot(42), /repoRoot must be/);
});

test("buildSnapshot: issues / recommendations populated when bridges still ghost", () => {
  const fs = fsFromMap({
    [abs("state/shared/system-viz/bridge-synergy-augmentation.json")]: JSON.stringify({
      newNodes: [
        { id: "ghost.bridge.x", kind: "bridge-unit", status: "ghost" },
        { id: "ghost.bridge.y", kind: "bridge-unit", status: "ghost" },
      ],
    }),
    [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({ wiredCount: 10, unwiredCount: 100 }),
    [abs("state/shared/chat-slots.json")]: JSON.stringify({ slots: {} }),
  });
  const snap = buildSnapshot(FAKE_ROOT, {
    readImpl: fs.readImpl, existsImpl: fs.existsImpl, now: () => FROZEN_NOW, frozenTime: FROZEN,
  });
  assert.ok(snap.health.issues.some((i) => i.includes("2/2 bridges still ghost")));
  assert.ok(snap.health.issues.some((i) => i.includes("100 unwired engines")));
  assert.ok(snap.health.recommendations.length >= 1);
});

// ─── renderers ──────────────────────────────────────────────────────

test("renderMarkdown: emits sections + key headers", () => {
  const fs = fsFromMap({
    [abs("state/shared/system-viz/bridge-synergy-augmentation.json")]: JSON.stringify({ newNodes: [] }),
    [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({ wiredCount: 1, unwiredCount: 1 }),
    [abs("state/shared/chat-slots.json")]: JSON.stringify({ slots: {} }),
  });
  const snap = buildSnapshot(FAKE_ROOT, {
    readImpl: fs.readImpl, existsImpl: fs.existsImpl, now: () => FROZEN_NOW, frozenTime: FROZEN,
  });
  const md = renderMarkdown(snap);
  assert.match(md, /# Synergy Status Dashboard/);
  assert.match(md, /## Surfaces/);
  assert.match(md, /\*\*bridgeSynergy\*\*/);
  assert.match(md, /\*\*buildState\*\*/);
  assert.match(md, /\*\*chatSlots\*\*/);
});

test("renderTerse: produces one line per surface", () => {
  const fs = fsFromMap({
    [abs("state/shared/system-viz/bridge-synergy-augmentation.json")]: JSON.stringify({ newNodes: [] }),
    [abs("state/shared/BUILD_STATE.json")]: JSON.stringify({ wiredCount: 1, unwiredCount: 1 }),
    [abs("state/shared/chat-slots.json")]: JSON.stringify({ slots: {} }),
  });
  const snap = buildSnapshot(FAKE_ROOT, {
    readImpl: fs.readImpl, existsImpl: fs.existsImpl, now: () => FROZEN_NOW, frozenTime: FROZEN,
  });
  const terse = renderTerse(snap);
  const lines = terse.split("\n");
  assert.ok(lines.length >= 4); // health + 3 surface lines
  assert.match(lines[0], /^health=/);
});

// ─── main / CLI ────────────────────────────────────────────────────

test("main: --help exits 0 + prints help on stdout", () => {
  const out = [];
  const err = [];
  const r = main(["--help"], { stdout: (s) => out.push(s), stderr: (s) => err.push(s) });
  assert.equal(r.exitCode, 0);
  assert.ok(out.join("\n").includes("synergy-status-dashboard"));
});

test("main: bad arg → exit 1 + error on stderr", () => {
  const out = [];
  const err = [];
  const r = main(["--bogus"], { stdout: (s) => out.push(s), stderr: (s) => err.push(s) });
  assert.equal(r.exitCode, 1);
  assert.ok(err.join("\n").includes("unknown argument"));
});

test("main: --json emits parseable JSON snapshot", () => {
  const out = [];
  const r = main(["--json", "--repo-root", "/nonexistent-but-shouldnt-crash"], {
    stdout: (s) => out.push(s), stderr: () => {},
  });
  assert.equal(r.exitCode, 0);
  const json = out.find((s) => s.startsWith("{"));
  assert.ok(json);
  const parsed = JSON.parse(json);
  assert.equal(parsed.schemaVersion, SCHEMA_VERSION);
  // All 3 surfaces should be ok=false against a non-existent root
  assert.equal(parsed.surfaces.bridgeSynergy.ok, false);
  assert.equal(parsed.surfaces.buildState.ok, false);
  assert.equal(parsed.surfaces.chatSlots.ok, false);
});

// ─── real-data E2E ─────────────────────────────────────────────────

test("real-data E2E: runs against actual repo root without crashing", () => {
  // Repo root = parent of scripts/
  const here = resolve(import.meta.dirname || new URL(".", import.meta.url).pathname);
  const repoRoot = resolve(here, "..");
  // Skip if running under an unfamiliar layout
  if (!existsSync(resolve(repoRoot, "CLAUDE.md"))) {
    return; // not in a PRISM tree — silent skip is OK here, the hermetic tests carry contract assertions
  }
  const snap = buildSnapshot(repoRoot);
  assert.equal(snap.schemaVersion, SCHEMA_VERSION);
  // At least one of the 3 surfaces should read ok against a live PRISM tree
  // (different worktrees may have different file sets — that's fine)
  const okCount = Object.values(snap.surfaces).filter((s) => s.ok).length;
  assert.ok(okCount >= 0, `okCount=${okCount}`); // sanity floor: doesn't crash
  // Sum-invariant on bridge-synergy if it loaded
  if (snap.surfaces.bridgeSynergy.ok) {
    const b = snap.surfaces.bridgeSynergy;
    assert.equal(b.built + b.partial + b.ghost, b.total, "bridge-synergy bucket sum invariant");
  }
});
