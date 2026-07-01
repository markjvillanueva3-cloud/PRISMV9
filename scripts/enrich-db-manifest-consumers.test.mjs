// node --test scripts/enrich-db-manifest-consumers.test.mjs
// Real-value assertions on the DB-manifest consumer enricher.
import { test } from "node:test";
import assert from "node:assert/strict";
import { enrich, CONSUMER_MAP } from "./enrich-db-manifest-consumers.mjs";

function fixture() {
  return {
    databases: [
      { id: "MaterialDB", type: "registry-backed", status: "verified" },           // mapped, no consumers → patch
      { id: "ToolDB", type: "registry-backed", status: "verified" },                // mapped → patch
      { id: "InferenceDB", type: "engine-inline", status: "deferred" },             // deferred → skip
      { id: "JMDieDocuStrataDB", type: "registry-backed", status: "verified", consumers: ["quoting"] }, // already has → keep
      { id: "MysteryDB", type: "file-backed", status: "created" },                  // unmapped → flag
    ],
  };
}

test("enrich — patches mapped DBs lacking consumers, from CONSUMER_MAP", () => {
  const { manifest, patched } = enrich(fixture());
  assert.ok(patched.includes("MaterialDB") && patched.includes("ToolDB"));
  const mat = manifest.databases.find((d) => d.id === "MaterialDB");
  assert.deepEqual(mat.consumers, CONSUMER_MAP.MaterialDB);
  assert.ok(mat.consumers.includes("speed-feed") && mat.consumers.includes("mill"));
});

test("enrich — skips deferred entries (not yet real)", () => {
  const { skippedDeferred, manifest } = enrich(fixture());
  assert.deepEqual(skippedDeferred, ["InferenceDB"]);
  assert.ok(!manifest.databases.find((d) => d.id === "InferenceDB").consumers);
});

test("enrich — never overwrites an existing consumers array (idempotent on re-run)", () => {
  const { alreadyHad, manifest } = enrich(fixture());
  assert.ok(alreadyHad.includes("JMDieDocuStrataDB"));
  assert.deepEqual(manifest.databases.find((d) => d.id === "JMDieDocuStrataDB").consumers, ["quoting"]);
});

test("enrich — IDEMPOTENT: second pass patches nothing", () => {
  const { manifest } = enrich(fixture());
  const second = enrich(manifest);
  assert.equal(second.patched.length, 0);
});

test("enrich — flags unmapped DBs (so new DBs get a map entry, not silently skipped)", () => {
  const { unmapped } = enrich(fixture());
  assert.deepEqual(unmapped, ["MysteryDB"]);
});

test("enrich — malformed manifest (no databases[]) → no throw, empty result", () => {
  const r = enrich({});
  assert.deepEqual(r.patched, []);
});

test("CONSUMER_MAP — every mapped DB targets ≥1 galaxy; no empty arrays", () => {
  for (const [id, gals] of Object.entries(CONSUMER_MAP)) {
    assert.ok(Array.isArray(gals) && gals.length > 0, `${id} must map to ≥1 galaxy`);
    assert.ok(gals.every((g) => typeof g === "string" && g.length > 0), `${id} galaxies must be non-empty strings`);
  }
});

test("CONSUMER_MAP — physics/material DBs reach the cutting-physics galaxies (necessity check)", () => {
  // MaterialDB + FormulaDB are the cutting-physics backbone → must reach speed-feed + the 3 machining domains
  for (const id of ["MaterialDB", "FormulaDB"]) {
    for (const g of ["speed-feed", "mill", "lathe"]) {
      assert.ok(CONSUMER_MAP[id].includes(g), `${id} must reach ${g}`);
    }
  }
});
