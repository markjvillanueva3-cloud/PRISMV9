/**
 * Real-value tests for export-mastercam-holder-db.mjs (R9: fail when logic changes).
 * Run: npx vitest run scripts/export-mastercam-holder-db.test.mjs
 */
import { describe, it, expect } from "vitest";
import {
  STANDARD_HOLDERS, JM_FLEET_TAPERS, buildHolderLibrary, holderLibraryToCSV,
} from "./export-mastercam-holder-db.mjs";

describe("STANDARD_HOLDERS source data", () => {
  it("covers all 18 McamHolderType enum values", () => {
    expect(STANDARD_HOLDERS.length).toBe(18);
    const types = STANDARD_HOLDERS.map((h) => h.type);
    for (const t of ["BT40", "CAT40", "HSK-A63", "Capto-C5", "KM40", "shrink_fit", "collet_ER", "straight_shank"]) {
      expect(types).toContain(t);
    }
  });
  it("CAT40 and BT40 share the 7:24 steep-taper 63mm body (real geometry)", () => {
    const cat40 = STANDARD_HOLDERS.find((h) => h.type === "CAT40");
    const bt40 = STANDARD_HOLDERS.find((h) => h.type === "BT40");
    expect(cat40.body_diameter_mm).toBe(63);
    expect(bt40.body_diameter_mm).toBe(63);
    expect(cat40.taper).toBe("7/24");
    expect(cat40.gauge_length_mm).toBe(65.4);
  });
  it("BT50/CAT50 carry the larger 100mm flange (size scaling is real)", () => {
    expect(STANDARD_HOLDERS.find((h) => h.type === "BT50").body_diameter_mm).toBe(100);
    expect(STANDARD_HOLDERS.find((h) => h.type === "CAT50").body_diameter_mm).toBe(100);
  });
  it("every holder has positive geometry (no zero/placeholder dimensions)", () => {
    for (const h of STANDARD_HOLDERS) {
      expect(h.body_diameter_mm).toBeGreaterThan(0);
      expect(h.gauge_length_mm).toBeGreaterThan(0);
      expect(h.default_projection_mm).toBeGreaterThan(0);
    }
  });
});

describe("buildHolderLibrary", () => {
  it("emits a well-formed mcam-holders library with 18 holders", () => {
    const lib = buildHolderLibrary({ now: "2026-01-01T00:00:00.000Z" });
    expect(lib.format).toBe("mcam-holders");
    expect(lib.file_name).toBe("PRISM_HOLDERS.mcam-holders");
    expect(lib.holders.length).toBe(18);
    expect(lib.metadata.holder_count).toBe(18);
    expect(lib.metadata.units).toBe("mm");
    expect(lib.metadata.generated_at).toBe("2026-01-01T00:00:00.000Z");
  });
  it("assigns unique 1-based holder_number and stable PRISM-HOLDER ids", () => {
    const lib = buildHolderLibrary();
    const nums = lib.holders.map((h) => h.holder_number);
    expect(nums[0]).toBe(1);
    expect(nums[17]).toBe(18);
    expect(new Set(nums).size).toBe(18);
    const ids = lib.holders.map((h) => h.id);
    expect(new Set(ids).size).toBe(18);
    expect(ids).toContain("PRISM-HOLDER-HSK_A63");
  });
  it("copies geometry from source into the holder entry verbatim", () => {
    const lib = buildHolderLibrary();
    const hsk = lib.holders.find((h) => h.type === "HSK-A63");
    expect(hsk.body_diameter_mm).toBe(63);
    expect(hsk.gauge_length_mm).toBe(50);
    expect(hsk.taper_interface).toBe("hollow");
    expect(hsk.units).toBe("mm");
  });
  it("fleet=true attaches per-machine taper assignments for all 5 mills", () => {
    const lib = buildHolderLibrary({ fleet: true });
    expect(lib.fleet_assignments.length).toBe(5);
    const vmc02 = lib.fleet_assignments.find((a) => a.machine_id === "VMC-02");
    expect(vmc02.machine_name).toBe("Okuma M460V-5AX");
    expect(vmc02.holder_types).toContain("HSK-A63");
    expect(vmc02.holder_count).toBe(4);
  });
  it("fleet=false omits fleet_assignments", () => {
    const lib = buildHolderLibrary({ fleet: false });
    expect(lib.fleet_assignments).toBe(undefined);
  });
  it("output is round-trippable JSON with 18 holders preserved", () => {
    const lib = buildHolderLibrary();
    const reparsed = JSON.parse(JSON.stringify(lib));
    expect(reparsed.holders.length).toBe(18);
    expect(reparsed.holders[0].id).toBe(lib.holders[0].id);
  });
});

describe("JM_FLEET_TAPERS", () => {
  it("VMC-01 Hurco carries CAT40 (its real spindle taper)", () => {
    expect(JM_FLEET_TAPERS["VMC-01"].tapers).toContain("CAT40");
    expect(JM_FLEET_TAPERS["VMC-01"].name).toBe("Hurco VM30i");
  });
  it("only references holder types that exist in STANDARD_HOLDERS", () => {
    const valid = new Set(STANDARD_HOLDERS.map((h) => h.type));
    for (const m of Object.values(JM_FLEET_TAPERS)) {
      for (const t of m.tapers) expect(valid.has(t)).toBe(true);
    }
  });
});

describe("holderLibraryToCSV", () => {
  it("header + 18 data rows, mm units", () => {
    const lib = buildHolderLibrary();
    const csv = holderLibraryToCSV(lib, { inch: false });
    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(19);
    expect(lines[0]).toContain("body_diameter_mm");
    expect(lines[0]).toContain("gauge_length_mm");
  });
  it("first data row is holder #1 with its real geometry columns", () => {
    const lib = buildHolderLibrary();
    const csv = holderLibraryToCSV(lib);
    const row1 = csv.trim().split("\n")[1].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    expect(row1[0]).toBe("1");
    expect(row1[2]).toBe("BT30"); // first STANDARD_HOLDERS entry
    expect(row1[5]).toBe("46");   // BT30 body_diameter_mm
  });
  it("inch CSV converts 63mm body → 2.4803in (25.4 exact)", () => {
    const lib = buildHolderLibrary();
    const csv = holderLibraryToCSV(lib, { inch: true });
    expect(csv).toContain("body_diameter_in");
    const cat40row = csv.split("\n").find((l) => l.includes("CAT40"));
    expect(cat40row).toContain("2.4803");
  });
});
