// cimco-nav-map.test.mjs — real-behavior tests for the CIMCO blind-navigation map loader/query API.
// Run: node --test scripts/cimco-nav-map.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CHANNELS, CHANNEL_RANK, NAV_MAP_PATH,
  loadNavMap, validateNavMap, queryNav, resolveNav,
  channelDistribution, proofRelevantSurfaces, criticalPaths,
  blindNavReadiness, criticalProcedures, summary,
} from "./cimco-nav-map.mjs";

// The real artifact (produced by the cimco-blind-nav-plot Workflow over 154 CHM pages).
const MAP = loadNavMap(NAV_MAP_PATH);

// ─── loadNavMap (load + fail-loud) ───────────────────────────────────────────
test("loadNavMap reads the real 511-surface nav-map", () => {
  assert.ok(MAP && typeof MAP === "object");
  assert.ok(Array.isArray(MAP.surfaces));
  // Anti-regression: the extraction yielded 511 surfaces. A large drop signals a broken regen.
  assert.ok(MAP.surfaces.length >= 400, `expected >=400 surfaces, got ${MAP.surfaces.length}`);
});

test("loadNavMap returns an already-parsed object unchanged", () => {
  const obj = { surfaces: [{ id: "x", label: "X", channel: "file", sourcePage: "p.htm" }] };
  assert.equal(loadNavMap(obj), obj);
});

test("loadNavMap FAILS LOUD on a missing path (never silently returns empty)", () => {
  assert.throws(() => loadNavMap(join(tmpdir(), "no-such-cimco-nav-map.json")), /not found/);
});

test("loadNavMap FAILS LOUD on invalid JSON", () => {
  const dir = mkdtempSync(join(tmpdir(), "navmap-"));
  const bad = join(dir, "bad.json");
  writeFileSync(bad, "{ not valid json ,");
  try {
    assert.throws(() => loadNavMap(bad), /not valid JSON/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── validateNavMap (structure integrity) ────────────────────────────────────
test("validateNavMap: the real map is valid with unique ids", () => {
  const v = validateNavMap(MAP);
  assert.equal(v.valid, true, `errors: ${v.errors.join("; ")}`);
  assert.equal(v.errors.length, 0);
  assert.equal(v.uniqueIds, MAP.surfaces.length, "every surface id must be unique");
});

test("validateNavMap: null/non-object → invalid (no throw)", () => {
  assert.equal(validateNavMap(null).valid, false);
  assert.equal(validateNavMap(42).valid, false);
});

test("validateNavMap: detects a duplicate surface id", () => {
  const v = validateNavMap({ schemaVersion: "1", surfaces: [
    { id: "dup", label: "A", channel: "file", sourcePage: "p" },
    { id: "dup", label: "B", channel: "file", sourcePage: "p" },
  ] });
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /duplicate surface id: dup/.test(e)));
});

test("validateNavMap: detects an unknown channel", () => {
  const v = validateNavMap({ schemaVersion: "1", surfaces: [
    { id: "a", label: "A", channel: "telepathy", sourcePage: "p" },
  ] });
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /unknown channel/.test(e)));
});

test("validateNavMap: detects a missing required key", () => {
  const v = validateNavMap({ schemaVersion: "1", surfaces: [
    { id: "a", label: "A", channel: "file" /* no sourcePage */ },
  ] });
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /missing a required key/.test(e)));
});

// ─── queryNav (filters) ──────────────────────────────────────────────────────
test("queryNav: channel filter returns only that channel + matches the distribution count", () => {
  const dist = channelDistribution(MAP);
  for (const ch of Object.values(CHANNELS)) {
    const r = queryNav(MAP, { channel: ch });
    assert.equal(r.count, dist[ch] || 0, `channel ${ch} count mismatch`);
    assert.ok(r.surfaces.every((s) => s.channel === ch));
  }
});

test("queryNav: proofRelevant returns only surfaces with a postProvingRelevance", () => {
  const r = queryNav(MAP, { proofRelevant: true });
  assert.ok(r.count > 0);
  assert.ok(r.surfaces.every((s) => s.postProvingRelevance != null && s.postProvingRelevance !== ""));
  assert.equal(r.count, proofRelevantSurfaces(MAP).length);
});

test("queryNav: text search is case-insensitive over id/label/action/area/path", () => {
  const r = queryNav(MAP, { text: "simulation" });
  assert.ok(r.count > 0, "expected matches for 'simulation'");
});

test("queryNav: limit truncates and flags truncated", () => {
  const r = queryNav(MAP, { limit: 5 });
  assert.equal(r.surfaces.length, 5);
  assert.equal(r.truncated, true);
});

test("queryNav: empty query returns all surfaces; impossible channel returns none", () => {
  assert.equal(queryNav(MAP, {}).count, MAP.surfaces.length);
  assert.equal(queryNav(MAP, { channel: "nonexistent" }).count, 0);
  assert.equal(queryNav({ surfaces: [] }, {}).count, 0); // empty map
});

// ─── resolveNav ──────────────────────────────────────────────────────────────
test("resolveNav: a known core surface resolves with its expected channel", () => {
  // editor.file.open is a load-bearing surface (open an NC for proving); extracted as cli (launch exe w/ path).
  const open = resolveNav(MAP, "editor.file.open");
  assert.ok(open, "editor.file.open must exist in the map");
  assert.equal(open.channel, "cli");
});

test("resolveNav: unknown / null id → null", () => {
  assert.equal(resolveNav(MAP, "no.such.surface.id"), null);
  assert.equal(resolveNav(MAP, null), null);
});

// ─── channelDistribution ─────────────────────────────────────────────────────
test("channelDistribution sums to the surface count and uses only known channels", () => {
  const dist = channelDistribution(MAP);
  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  assert.equal(sum, MAP.surfaces.length);
  for (const ch of Object.keys(dist)) assert.ok(ch in CHANNEL_RANK, `unexpected channel ${ch}`);
});

// ─── critical-path readiness (the post-proving headline) ─────────────────────
test("criticalPaths: the 5 post-proving paths were verified and are all navigable", () => {
  const paths = criticalPaths(MAP);
  assert.ok(paths.length >= 5, `expected >=5 verified paths, got ${paths.length}`);
  // Every verified path returned navigable=true from the Workflow's verifier agents.
  assert.ok(paths.every((p) => p.navigable === true), "all critical paths must verify navigable");
});

test("blindNavReadiness: fullyNavigable + non-empty gaps + next-units (honest about the UIA wall)", () => {
  const r = blindNavReadiness(MAP);
  assert.equal(r.fullyNavigable, true);
  assert.equal(r.criticalPathsNavigable, r.criticalPathsTotal);
  // The map is honest: the verdict half is UIA-only, so gaps + next-units must be populated.
  assert.ok(r.blindNavGaps.length > 0, "blind-nav gaps must be surfaced (the UIA verdict wall)");
  assert.ok(r.recommendedNextUnits.length >= 3, "must recommend concrete next units");
  assert.ok(typeof r.postProvingReadiness === "string" && r.postProvingReadiness.length > 0);
});

test("criticalProcedures: step-by-step blind-nav procedures are present with channels", () => {
  const procs = criticalProcedures(MAP);
  assert.ok(procs.length >= 4, `expected >=4 procedures, got ${procs.length}`);
  assert.ok(procs.every((p) => p.name && Array.isArray(p.steps)));
});

// ─── summary (the headline read) ─────────────────────────────────────────────
test("summary: surfaceCount + channelDistribution + proof-relevant are coherent", () => {
  const s = summary(MAP);
  assert.equal(s.surfaceCount, MAP.surfaces.length);
  assert.ok(s.proofRelevant > 0 && s.proofRelevant <= s.surfaceCount);
  assert.match(s.criticalPathsNavigable, /^\d+\/\d+$/);
});
