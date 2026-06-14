/**
 * Tests for generate-database-surfaces-roost.mjs (pure-fn coverage).
 * Run: node --test H:/prism/scripts/lib/database-surfaces-roost.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SURFACES, BRIDGES_MISSING, PSN_LEGS,
  generate,
  colorFor, safeId, bridgeGapCountFor,
  DB_ROOST_ID, PLANNED_PARENT, ROOST_LAYER, SURFACE_LAYER,
  COLOR_WIRED, COLOR_UNWIRED, COLOR_EXTERNAL, COLOR_GHOST,
  SCHEMA_VERSION,
} from "../generate-database-surfaces-roost.mjs";

test("SCHEMA_VERSION is semver-shaped", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});

test("SURFACES inventory has expected canonical 11 PRISM DBs (juliett plan baseline)", () => {
  assert.ok(Array.isArray(SURFACES));
  assert.ok(SURFACES.length >= 11, `expected ≥11 surfaces, got ${SURFACES.length}`);
  for (const s of SURFACES) {
    assert.ok(s.key, "every surface needs a key");
    assert.ok(s.name, "every surface needs a name");
    assert.ok(s.backend, "every surface needs a backend type");
    assert.ok(s.leg && s.leg.id >= 1 && s.leg.id <= 11, `leg.id must be 1..11 for ${s.key}`);
    assert.match(s.status, /^(wired|unwired|external|ghost)$/, `bad status for ${s.key}`);
  }
});

test("SURFACES keys are unique", () => {
  const keys = SURFACES.map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate surface keys found");
});

test("BRIDGES_MISSING inventory is non-empty + shape-valid", () => {
  assert.ok(Array.isArray(BRIDGES_MISSING));
  assert.ok(BRIDGES_MISSING.length >= 8, `expected ≥8 missing bridges, got ${BRIDGES_MISSING.length}`);
  for (const b of BRIDGES_MISSING) {
    assert.ok(b.from, "bridge needs a from");
    assert.ok(b.to, "bridge needs a to");
    assert.ok(b.what, "bridge needs a description");
  }
});

test("PSN_LEGS has all 11 canonical legs (per feedback_psn_definition.md)", () => {
  const legIds = Object.values(PSN_LEGS).map((l) => l.id).sort((a, b) => a - b);
  assert.deepEqual(legIds, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test("colorFor maps status → hex", () => {
  assert.equal(colorFor("wired"), COLOR_WIRED);
  assert.equal(colorFor("unwired"), COLOR_UNWIRED);
  assert.equal(colorFor("external"), COLOR_EXTERNAL);
  assert.equal(colorFor("ghost"), COLOR_GHOST);
  assert.equal(colorFor(undefined), COLOR_GHOST);
  assert.equal(colorFor("bogus"), COLOR_GHOST);
});

test("safeId sanitizes for filesystem", () => {
  assert.equal(safeId("Some Engine.ts"), "some-engine-ts");
  assert.equal(safeId("../evil/path"), "evil-path");
  assert.equal(safeId(""), "x");
  assert.equal(safeId(null), "x");
  assert.equal(safeId(undefined), "x");
});

test("bridgeGapCountFor counts bridges by from + to involvement", () => {
  const bridges = [
    { from: "a", to: "b", what: "x" },
    { from: "a", to: "c", what: "y" },
    { from: "d", to: "a", what: "z" },
    { from: "e", to: "f", what: "w" },
  ];
  assert.equal(bridgeGapCountFor("a", bridges), 3);
  assert.equal(bridgeGapCountFor("b", bridges), 1);
  assert.equal(bridgeGapCountFor("e", bridges), 1);
  assert.equal(bridgeGapCountFor("zzz", bridges), 0);
  assert.equal(bridgeGapCountFor("", bridges), 0);
  assert.equal(bridgeGapCountFor(null, bridges), 0);
});

test("generate emits roost + one node per surface, none if id already present", () => {
  const r = generate(SURFACES, BRIDGES_MISSING, []);
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.emitted, SURFACES.length);
  assert.equal(r.stats.skipped, 0);
  // 1 roost + N surface children
  assert.equal(r.newNodes.length, SURFACES.length + 1);
  // every emitted node has parent=DB_ROOST_ID (except the roost itself)
  const roostNode = r.newNodes.find((n) => n.id === DB_ROOST_ID);
  assert.ok(roostNode, "roost node missing");
  assert.equal(roostNode.parent, PLANNED_PARENT);
  assert.equal(roostNode.layer, ROOST_LAYER);
  const children = r.newNodes.filter((n) => n.kind === "database-surface");
  for (const c of children) {
    assert.equal(c.parent, DB_ROOST_ID);
    assert.equal(c.layer, SURFACE_LAYER);
    assert.ok(c.id.startsWith("ghost.db."));
    assert.ok(c.surfaceStatus);
    assert.ok(c.color);
  }
});

test("generate skips when ids already present", () => {
  const allIds = new Set([DB_ROOST_ID, ...SURFACES.map((s) => "ghost.db." + safeId(s.key))]);
  const r = generate(SURFACES, BRIDGES_MISSING, allIds);
  assert.equal(r.stats.roostEmitted, 0);
  assert.equal(r.stats.emitted, 0);
  assert.equal(r.stats.skipped, SURFACES.length);
  assert.equal(r.newNodes.length, 0);
});

test("generate handles empty input gracefully (no crash, roost only)", () => {
  const r = generate([], [], []);
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.emitted, 0);
  assert.equal(r.newNodes.length, 1);
});

test("generate sort order: wired before unwired before external before ghost", () => {
  const fake = [
    { key: "g1", name: "G1", backend: "x", leg: PSN_LEGS.MEMORIES, status: "ghost" },
    { key: "w1", name: "W1", backend: "x", leg: PSN_LEGS.MEMORIES, status: "wired" },
    { key: "e1", name: "E1", backend: "x", leg: PSN_LEGS.MEMORIES, status: "external" },
    { key: "u1", name: "U1", backend: "x", leg: PSN_LEGS.MEMORIES, status: "unwired" },
  ];
  const r = generate(fake, [], []);
  const children = r.newNodes.filter((n) => n.kind === "database-surface");
  assert.equal(children[0].surfaceStatus, "wired");
  assert.equal(children[1].surfaceStatus, "unwired");
  assert.equal(children[2].surfaceStatus, "external");
  assert.equal(children[3].surfaceStatus, "ghost");
});

test("adversarial: NaN / Infinity / negative leg.id / oversize string don't crash generate", () => {
  const adversarial = [
    { key: "k1", name: "X".repeat(500), backend: "x", leg: { id: NaN, name: "Bad" }, status: "wired" },
    { key: "k2", name: "Y", backend: "x", leg: { id: Infinity, name: "Bad2" }, status: "unwired" },
    { key: "k3", name: "Z", backend: "x", leg: { id: -1, name: "Bad3" }, status: "ghost" },
  ];
  // Should not throw.
  const r = generate(adversarial, [], []);
  assert.ok(r.newNodes.length >= 3);
  // Labels are clipped to MAX_LABEL (80).
  const k1 = r.newNodes.find((n) => n.id === "ghost.db.k1");
  assert.ok(k1.label.length <= 80, `label exceeded MAX_LABEL: ${k1.label.length}`);
});

test("bridge gap count surfaces in node tooltip data", () => {
  const r = generate(SURFACES, BRIDGES_MISSING, []);
  const featureStore = r.newNodes.find((n) => n.id === "ghost.db.feature-store");
  assert.ok(featureStore);
  // feature-store is named in 2 of the BRIDGES_MISSING entries (NN→Qdrant + expose-to-MCP).
  assert.ok(featureStore.bridgeGaps >= 1, `expected feature-store bridgeGaps ≥1, got ${featureStore.bridgeGaps}`);
});
