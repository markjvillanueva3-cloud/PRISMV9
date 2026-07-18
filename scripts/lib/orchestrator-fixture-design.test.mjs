// scripts/lib/orchestrator-fixture-design.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  VALID_DOMAINS,
  validateFixtureAdapter,
  designFixture,
  latheFixtureAdapter,
  millFixtureAdapter,
  wedmFixtureAdapter,
} from "./orchestrator-fixture-design.mjs";

const steel = { iso_group: "P", hardness_hb: 250, canonical_id: "AISI_4140" };
const aluminum = { iso_group: "N", hardness_hb: 95, canonical_id: "AL_6061_T6" };
const inconel = { iso_group: "S", hardness_hb: 380, canonical_id: "INCONEL_718" };

describe("VALID_DOMAINS", () => {
  it("is frozen with 3 domains", () => {
    assert.ok(Object.isFrozen(VALID_DOMAINS));
    assert.deepEqual([...VALID_DOMAINS], ["lathe", "mill", "wedm"]);
  });
});

describe("validateFixtureAdapter", () => {
  it("accepts a valid adapter", () => {
    validateFixtureAdapter(latheFixtureAdapter, "lathe");
    validateFixtureAdapter(millFixtureAdapter, "mill");
    validateFixtureAdapter(wedmFixtureAdapter, "wedm");
  });

  it("rejects null", () => {
    assert.throws(() => validateFixtureAdapter(null, "lathe"), /adapter object required/);
  });

  it("rejects invalid domain", () => {
    assert.throws(() => validateFixtureAdapter(latheFixtureAdapter, "grinder"), /invalid domain/);
  });

  it("rejects mismatched domainTag", () => {
    assert.throws(() => validateFixtureAdapter(latheFixtureAdapter, "mill"), /expected 'mill'/);
  });

  it("rejects adapter missing required methods", () => {
    const broken = { ...latheFixtureAdapter };
    delete broken.preservedFaces;
    assert.throws(() => validateFixtureAdapter(broken, "lathe"), /missing method 'preservedFaces'/);
  });
});

describe("designFixture — lathe", () => {
  it("selects 3-jaw-chuck for medium turning part", () => {
    const r = designFixture({
      part: { geometry: { od_mm: 80, length_mm: 100, has_centers: false } },
      material: steel,
      machine: { type: "lathe" },
      domain: "lathe",
      adapter: latheFixtureAdapter,
    });
    assert.equal(r.fixture_type, "3-jaw-chuck");
    assert.ok(r.clamp_force_n > 5000);
    assert.ok(r.confidence > 0.5);
    assert.ok(r.preserved_faces.includes("+Z_grip"));
  });

  it("selects collet for small OD part", () => {
    const r = designFixture({
      part: { geometry: { od_mm: 20, length_mm: 50 } },
      material: aluminum,
      machine: { type: "lathe" },
      domain: "lathe",
      adapter: latheFixtureAdapter,
    });
    // Collet is compatible (OD ≤ 50); 3-jaw is also compatible.
    // The chooser picks by score — should be one of those two.
    assert.ok(["collet", "3-jaw-chuck"].includes(r.fixture_type));
  });

  it("eliminates collet when OD > 50mm (capability filter)", () => {
    const r = designFixture({
      part: { geometry: { od_mm: 100 } },
      material: steel,
      machine: { type: "lathe" },
      domain: "lathe",
      adapter: latheFixtureAdapter,
    });
    assert.notEqual(r.fixture_type, "collet");
  });

  it("eliminates between-centers when no centers drilled", () => {
    const r = designFixture({
      part: { geometry: { od_mm: 30, has_centers: false } },
      material: steel,
      machine: { type: "lathe" },
      domain: "lathe",
      adapter: latheFixtureAdapter,
    });
    assert.notEqual(r.fixture_type, "between-centers");
  });
});

describe("designFixture — mill", () => {
  it("selects vise for small prismatic part", () => {
    const r = designFixture({
      part: { geometry: { width_mm: 80, length_mm: 100, ferrous: true } },
      material: steel,
      machine: { type: "mill" },
      domain: "mill",
      adapter: millFixtureAdapter,
    });
    assert.equal(r.fixture_type, "vise");
  });

  it("eliminates vise when part wider than 200mm", () => {
    const r = designFixture({
      part: { geometry: { width_mm: 250 } },
      material: steel,
      machine: { type: "mill" },
      domain: "mill",
      adapter: millFixtureAdapter,
    });
    assert.notEqual(r.fixture_type, "vise");
  });

  it("eliminates mag-chuck for non-ferrous (aluminum)", () => {
    const r = designFixture({
      part: { geometry: { width_mm: 100, ferrous: false } },
      material: aluminum,
      machine: { type: "mill" },
      domain: "mill",
      adapter: millFixtureAdapter,
    });
    assert.notEqual(r.fixture_type, "mag-chuck");
  });

  it("penalizes complex fixtures for novice operators", () => {
    const novice = designFixture({
      part: { geometry: { width_mm: 100, ferrous: true, flat_area_mm2: 5000 } },
      material: steel, machine: { type: "mill" }, domain: "mill",
      adapter: millFixtureAdapter, operatorSkill: "novice",
    });
    // Novice should NOT get soft-jaws or tombstone (complex)
    assert.notEqual(novice.fixture_type, "soft-jaws");
    assert.notEqual(novice.fixture_type, "tombstone");
  });
});

describe("designFixture — wedm", () => {
  it("selects appropriate fixture for closed-pocket part", () => {
    const r = designFixture({
      part: { geometry: { is_closed_pocket: true, height_mm: 25 } },
      material: inconel,
      machine: { type: "wedm" },
      domain: "wedm",
      adapter: wedmFixtureAdapter,
    });
    assert.ok(["starter-hole", "sub-plate", "clamp-skim", "glue-fix"].includes(r.fixture_type));
  });

  it("eliminates starter-hole when no closed pocket", () => {
    const r = designFixture({
      part: { geometry: { is_closed_pocket: false } },
      material: inconel,
      machine: { type: "wedm" },
      domain: "wedm",
      adapter: wedmFixtureAdapter,
    });
    assert.notEqual(r.fixture_type, "starter-hole");
  });

  it("uses LOW clamp force (avoids distorting thin parts)", () => {
    const r = designFixture({
      part: { geometry: {} },
      material: steel,
      machine: { type: "wedm" },
      domain: "wedm",
      adapter: wedmFixtureAdapter,
    });
    assert.ok(r.clamp_force_n <= 500, `wedm clamp must be ≤500N, got ${r.clamp_force_n}`);
  });
});

describe("R12 fail-loud", () => {
  it("rejects null part", () => {
    assert.throws(() => designFixture({ part: null, material: steel, machine: {}, domain: "lathe", adapter: latheFixtureAdapter }), /part with geometry required/);
  });

  it("rejects material without iso_group", () => {
    assert.throws(() => designFixture({ part: { geometry: {} }, material: {}, machine: {}, domain: "lathe", adapter: latheFixtureAdapter }), /material with iso_group required/);
  });

  it("rejects missing machine", () => {
    assert.throws(() => designFixture({ part: { geometry: {} }, material: steel, machine: null, domain: "lathe", adapter: latheFixtureAdapter }), /machine required/);
  });

  it("returns null fixture when no candidate is compatible", () => {
    const noCandidates = {
      ...latheFixtureAdapter,
      listFixtureTypes: () => ["3-jaw-chuck"],
      isCompatible: () => false,  // nothing matches
    };
    const r = designFixture({ part: { geometry: {} }, material: steel, machine: {}, domain: "lathe", adapter: noCandidates });
    assert.equal(r.fixture_type, null);
    assert.equal(r.confidence, 0);
  });

  it("returns zero-confidence on adapter error in clamp force", () => {
    const broken = {
      ...latheFixtureAdapter,
      estimateClampForce: () => { throw new Error("calc crash"); },
    };
    const r = designFixture({ part: { geometry: {} }, material: steel, machine: {}, domain: "lathe", adapter: broken });
    assert.equal(r.confidence, 0);
    assert.equal(r.fixture_type, null);
  });
});

describe("3 domain adapters cover all 3 PRISM domains", () => {
  it("lathe + mill + wedm all conform + tag correctly", () => {
    assert.equal(latheFixtureAdapter.domainTag(), "lathe");
    assert.equal(millFixtureAdapter.domainTag(), "mill");
    assert.equal(wedmFixtureAdapter.domainTag(), "wedm");
    assert.ok(latheFixtureAdapter.listFixtureTypes().length >= 3);
    assert.ok(millFixtureAdapter.listFixtureTypes().length >= 3);
    assert.ok(wedmFixtureAdapter.listFixtureTypes().length >= 3);
  });
});
