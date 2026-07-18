/**
 * Tests for build-machine-shop-network.mjs — VENDOR-NETWORK-MS0/U-VDN-SHOP-NETWORK.
 * Feeds the EXISTING ShopNetworkEngine (E1134) — validates onboarding mapping + marketplace catalog.
 * Run: node --test scripts/build-machine-shop-network.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeShopId, toShopProfile, buildShopNetworkManifest, renderManifestMd,
  MARKETPLACES, SHOP_PROFILE_REQUIRED, PROCESS_TO_MACHINE_TYPE,
} from "./build-machine-shop-network.mjs";

test("normalizeShopId: stable id strips shop/mfg/precision suffixes", () => {
  assert.equal(normalizeShopId("Acme Precision Machining, Inc."), "acme");
  assert.equal(normalizeShopId("JM Die Company"), "jm");
  assert.equal(normalizeShopId(""), "");
  assert.equal(normalizeShopId(null), "");
});

test("toShopProfile: complete submission → ok, no missing", () => {
  const r = toShopProfile({
    name: "Acme CNC",
    location: { city: "Troy", state: "MI", country: "US" },
    machines: [{ name: "Haas VF-4", type: "milling", axes: 3, travel_x_mm: 1270, travel_y_mm: 508, travel_z_mm: 635 }],
    certifications: ["ISO_9001", "AS9100"],
    capacity_hours_per_week: 240,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.missing, []);
  assert.equal(r.shop_id, "acme-cnc");
});

test("toShopProfile: reports MISSING required fields — never fabricates (R12)", () => {
  const r = toShopProfile({ name: "Partial Shop", machines: [{ process: "mill-3axis" }] });
  assert.equal(r.ok, false);
  assert.ok(r.missing.includes("location.city+country"), "missing location");
  assert.ok(r.missing.includes("capacity_hours_per_week"), "missing capacity");
  assert.ok(r.missing.includes("certifications"), "missing certs array");
  assert.ok(r.missing.includes("machine travels (x/y/z mm)"), "machine travels required by engine");
  // it did NOT invent values
  assert.equal(r.profile.capacity_hours_per_week, null);
  assert.equal(r.profile.location, null);
});

test("toShopProfile: maps PRISM process names → engine ShopMachine.type", () => {
  const r = toShopProfile({
    name: "Multi", location: { city: "X", country: "US" }, capacity_hours_per_week: 80, certifications: [],
    machines: [{ process: "wire-edm", travel_x_mm: 1, travel_y_mm: 1, travel_z_mm: 1 }, { process: "mill-5axis", travel_x_mm: 1, travel_y_mm: 1, travel_z_mm: 1 }, { process: "surface-grind", travel_x_mm: 1, travel_y_mm: 1, travel_z_mm: 1 }],
  });
  assert.equal(r.profile.machines[0].type, "EDM", "wire-edm → EDM");
  assert.equal(r.profile.machines[1].type, "milling", "mill-5axis → milling");
  assert.equal(r.profile.machines[1].axes, 5, "5-axis inferred");
  assert.equal(r.profile.machines[2].type, "grinding", "surface-grind → grinding");
  assert.equal(r.ok, true, "all required present");
});

test("toShopProfile: empty certifications array is ALLOWED (uncertified shop), absent is not", () => {
  const base = { name: "S", location: { city: "X", country: "US" }, capacity_hours_per_week: 40, machines: [{ process: "turn", travel_x_mm: 1, travel_y_mm: 1, travel_z_mm: 1 }] };
  assert.equal(toShopProfile({ ...base, certifications: [] }).ok, true, "present-but-empty certs ok");
  assert.ok(toShopProfile(base).missing.includes("certifications"), "absent certs flagged");
});

test("toShopProfile: defensive on null/garbage", () => {
  assert.equal(toShopProfile(null).ok, false);
  assert.equal(toShopProfile(42).ok, false);
  assert.equal(toShopProfile(null).profile.machines.length, 0);
});

test("PROCESS_TO_MACHINE_TYPE: covers PRISM multi-process names", () => {
  for (const p of ["mill-3axis", "turn", "wire-edm", "sinker-edm", "surface-grind"]) {
    assert.ok(PROCESS_TO_MACHINE_TYPE[p], `mapped: ${p}`);
  }
  assert.equal(PROCESS_TO_MACHINE_TYPE["wire-edm"], "EDM");
  assert.equal(PROCESS_TO_MACHINE_TYPE["sinker-edm"], "EDM");
});

test("MARKETPLACES: real access points, well-formed, API set non-empty", () => {
  assert.ok(MARKETPLACES.length >= 5);
  for (const m of MARKETPLACES) {
    assert.ok(/^https:\/\//.test(m.website), `https: ${m.name}`);
    assert.ok(["api", "rfq", "directory"].includes(m.access), `access: ${m.name}`);
    assert.ok(Array.isArray(m.routes) && m.routes.length, `routes: ${m.name}`);
  }
  assert.ok(MARKETPLACES.some((m) => m.name === "Xometry" && m.access === "api"), "Xometry API");
  assert.ok(MARKETPLACES.some((m) => m.name === "Thomasnet" && m.access === "directory"), "Thomasnet directory");
});

test("buildShopNetworkManifest: names the engine (no duplication) + population strategy", () => {
  const man = buildShopNetworkManifest({});
  assert.equal(man.engine.id, "E1134");
  assert.equal(man.engine.name, "ShopNetworkEngine");
  assert.ok(man.engine.actions.includes("shop_network_register"));
  assert.ok(man.engine.actions.includes("shop_network_search"));
  assert.deepEqual(man.onboarding.requiredFields, SHOP_PROFILE_REQUIRED);
  assert.ok(man.stats.apiMarketplaces >= 4, "Xometry/Protolabs/Fictiv/Hubs are API");
  assert.equal(man.stats.marketplaceCount, MARKETPLACES.length);
});

test("renderManifestMd: digest names engine + access points + R12 no-fabrication", () => {
  const md = renderManifestMd(buildShopNetworkManifest({}), "2026-05-29");
  assert.ok(md.includes("ShopNetworkEngine"));
  assert.ok(md.includes("do NOT duplicate"));
  assert.ok(md.includes("Xometry"));
  assert.ok(md.includes("no fabricated members"));
  assert.ok(md.includes("Onboarding contract"));
});
