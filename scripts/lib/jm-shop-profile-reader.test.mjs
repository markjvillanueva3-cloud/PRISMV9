#!/usr/bin/env node
/** Tests for jm-shop-profile-reader.mjs -- the shared backend shop-profile reader. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  loadShopProfile, rankedMachineCategories, topMachineCategory,
  workKindMix, businessOrderMix, machineUsageWeight,
} from "./jm-shop-profile-reader.mjs";

const FIXTURE = {
  ok: true, schemaVersion: "1.1.0", totalFiles: 38251,
  machines: [
    { id: "lathe", files: 19803, pct: 51.8 },
    { id: "okuma", files: 6092, pct: 15.9 },
    { id: "wire_edm", files: 4000, pct: 10.5 },
  ],
  kinds: [
    { id: "g_code", files: 20081, pct: 52.5 },
    { id: "cam_project", files: 15544, pct: 40.6 },
  ],
  business: {
    totalDocuments: 111745,
    documentRoles: [
      { id: "SALES_ORDER", count: 21543, pct: 19.3 },
      { id: "PRINT", count: 7616, pct: 6.8 },
    ],
  },
};

function writeFixture(obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shopprof-"));
  const f = path.join(dir, "jm-shop-profile.json");
  fs.writeFileSync(f, JSON.stringify(obj));
  return { dir, f };
}

test("loadShopProfile loads a valid profile + rejects bad shapes (fail-soft)", () => {
  const { dir, f } = writeFixture(FIXTURE);
  assert.equal(loadShopProfile(f).totalFiles, 38251);
  assert.equal(loadShopProfile(path.join(dir, "nope.json")), null, "missing -> null");
  fs.writeFileSync(f, "{not json");
  assert.equal(loadShopProfile(f), null, "corrupt -> null (no throw)");
  fs.writeFileSync(f, JSON.stringify({ ok: false }));
  assert.equal(loadShopProfile(f), null, "ok:false -> null");
  fs.writeFileSync(f, JSON.stringify({ ok: true }));
  assert.equal(loadShopProfile(f), null, "no machines array -> null");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("rankedMachineCategories sorts by file volume; topMachineCategory = lathe", () => {
  assert.deepEqual(rankedMachineCategories(FIXTURE).map((m) => m.id), ["lathe", "okuma", "wire_edm"]);
  assert.equal(topMachineCategory(FIXTURE), "lathe");
  assert.deepEqual(rankedMachineCategories(null), [], "null profile -> []");
  assert.equal(topMachineCategory(null), null);
});

test("workKindMix + businessOrderMix expose the two dimensions", () => {
  assert.equal(workKindMix(FIXTURE)[0].id, "g_code");
  assert.equal(businessOrderMix(FIXTURE)[0].id, "SALES_ORDER");
  assert.deepEqual(businessOrderMix({ ...FIXTURE, business: undefined }), [], "no business -> []");
});

test("machineUsageWeight sums matching categories (Okuma lathe = lathe+okuma)", () => {
  const okumaLathe = (id) => id === "lathe" || id === "okuma";
  assert.equal(machineUsageWeight(okumaLathe, FIXTURE), 19803 + 6092);
  assert.equal(machineUsageWeight((id) => id === "wire_edm", FIXTURE), 4000);
  assert.equal(machineUsageWeight(() => true, null), 0, "null profile -> 0");
  assert.equal(machineUsageWeight("not a fn", FIXTURE), 0, "non-fn predicate -> 0");
});
