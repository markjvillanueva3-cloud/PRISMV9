import { describe, it, expect } from "vitest";
import { parametricPartLibraryEngine } from "../engines/ParametricPartLibraryEngine.js";

describe("ParametricPartLibraryEngine", () => {
  // ── Part Type Listing ──

  describe("listPartTypes", () => {
    it("lists all 11 part types", () => {
      const types = parametricPartLibraryEngine.listPartTypes();
      expect(types).toHaveLength(11);
      expect(types.map(t => t.type)).toContain("spur_gear");
      expect(types.map(t => t.type)).toContain("hex_bolt");
      expect(types.map(t => t.type)).toContain("enclosure");
    });
  });

  // ── Universal create ──

  describe("createPart (universal)", () => {
    it("dispatches to correct type", () => {
      const part = parametricPartLibraryEngine.createPart("hex_nut", { size: 10 });
      expect(part.type).toBe("hex_nut");
      expect(part.params.size).toBe(10);
    });

    it("throws on unknown type", () => {
      expect(() => parametricPartLibraryEngine.createPart("unobtainium", {}))
        .toThrow("Unknown part type");
    });
  });

  // ── Spur Gear ──

  describe("createSpurGear", () => {
    it("creates gear with correct geometry", () => {
      const gear = parametricPartLibraryEngine.createSpurGear({
        module: 2, teeth: 20, width: 10,
      });
      expect(gear.type).toBe("spur_gear");
      expect(gear.params.pitch_diameter).toBe(40);  // 2 * 20
      expect(gear.params.outer_diameter).toBe(44);   // 2 * (20 + 2)
      expect(gear.estimated_volume_mm3).toBeGreaterThan(0);
      expect(gear.cadquery_code).toContain("import cadquery");
      expect(gear.cadquery_code).toContain("spur_gear");
    });

    it("includes bore in codegen", () => {
      const gear = parametricPartLibraryEngine.createSpurGear({
        module: 3, teeth: 30, width: 15, bore: 12,
      });
      expect(gear.cadquery_code).toContain(".hole(");
      expect(gear.params.bore).toBe(12);
    });

    it("estimates mass with material", () => {
      const gear = parametricPartLibraryEngine.createSpurGear({
        module: 2, teeth: 20, width: 10, material: "steel",
      });
      expect(gear.estimated_mass_g).toBeGreaterThan(0);
    });
  });

  // ── Shaft ──

  describe("createShaft", () => {
    it("creates basic shaft", () => {
      const shaft = parametricPartLibraryEngine.createShaft({
        diameter: 20, length: 100,
      });
      expect(shaft.type).toBe("shaft");
      const expectedVol = Math.PI * 10 * 10 * 100;
      expect(shaft.estimated_volume_mm3).toBeCloseTo(expectedVol, 0);
    });

    it("subtracts keyway volume", () => {
      const plain = parametricPartLibraryEngine.createShaft({
        diameter: 20, length: 100,
      });
      const keyed = parametricPartLibraryEngine.createShaft({
        diameter: 20, length: 100,
        keyway: { width: 6, depth: 3, length: 50 },
      });
      expect(keyed.estimated_volume_mm3).toBeLessThan(plain.estimated_volume_mm3);
      expect(keyed.cadquery_code).toContain("Keyway");
    });
  });

  // ── Hex Bolt ──

  describe("createHexBolt", () => {
    it("creates M8x30 bolt", () => {
      const bolt = parametricPartLibraryEngine.createHexBolt({
        size: 8, length: 30,
      });
      expect(bolt.type).toBe("hex_bolt");
      expect(bolt.params.pitch).toBe(1.25);  // ISO coarse M8
      expect(bolt.cadquery_code).toContain("polygon(6");
    });
  });

  // ── Hex Nut ──

  describe("createHexNut", () => {
    it("creates M10 nut", () => {
      const nut = parametricPartLibraryEngine.createHexNut({ size: 10 });
      expect(nut.type).toBe("hex_nut");
      expect(nut.params.across_flats).toBe(15);  // 10 * 1.5
      expect(nut.estimated_volume_mm3).toBeGreaterThan(0);
    });
  });

  // ── Washer ──

  describe("createWasher", () => {
    it("creates washer with correct volume", () => {
      const w = parametricPartLibraryEngine.createWasher({
        bore: 10, outer_diameter: 20, thickness: 2,
      });
      const expected = Math.PI * (100 - 25) * 2;  // pi*(10^2 - 5^2)*2
      expect(w.estimated_volume_mm3).toBeCloseTo(expected, 0);
    });
  });

  // ── Bearing Housing ──

  describe("createBearingHousing", () => {
    it("creates housing with bolt holes", () => {
      const h = parametricPartLibraryEngine.createBearingHousing({
        bearing_od: 47, bearing_width: 14,
        wall_thickness: 8, base_height: 30,
        bolt_spacing: 80, bolt_diameter: 10,
      });
      expect(h.type).toBe("bearing_housing");
      expect(h.cadquery_code).toContain("bearing_od");
      expect(h.estimated_volume_mm3).toBeGreaterThan(0);
    });
  });

  // ── Enclosure ──

  describe("createEnclosure", () => {
    it("creates enclosure with lid and screw bosses", () => {
      const e = parametricPartLibraryEngine.createEnclosure({
        width: 100, depth: 60, height: 40, wall_thickness: 3,
      });
      expect(e.type).toBe("enclosure");
      expect(e.cadquery_code).toContain("shell");
      expect(e.cadquery_code).toContain("enclosure_lid");
      expect(e.cadquery_code).toContain("boss_pts");
    });
  });

  // ── Motor Mount Plate ──

  describe("createMotorMountPlate", () => {
    it("creates plate with bolt circle", () => {
      const p = parametricPartLibraryEngine.createMotorMountPlate({
        width: 120, height: 120, thickness: 10,
        pilot_diameter: 60, bolt_circle_diameter: 80,
        bolt_count: 4, bolt_diameter: 8,
        shaft_hole_diameter: 20,
      });
      expect(p.type).toBe("motor_mount_plate");
      expect(p.cadquery_code).toContain("bolt_pts");
      expect(p.cadquery_code).toContain("pilot_d");
    });
  });

  // ── Standoff ──

  describe("createStandoff", () => {
    it("creates round standoff", () => {
      const s = parametricPartLibraryEngine.createStandoff({
        outer_diameter: 8, height: 10, bore: 3.2,
      });
      expect(s.type).toBe("standoff");
      expect(s.cadquery_code).toContain("circle(4)");
    });

    it("creates hex standoff", () => {
      const s = parametricPartLibraryEngine.createStandoff({
        outer_diameter: 8, height: 10, bore: 3.2, hex: true,
      });
      expect(s.cadquery_code).toContain("polygon(6");
      expect(s.name).toContain("Hex");
    });
  });

  // ── Pulley ──

  describe("createPulley", () => {
    it("creates V-belt pulley", () => {
      const p = parametricPartLibraryEngine.createPulley({
        pitch_diameter: 80, width: 20, bore: 15,
        groove_count: 2,
      });
      expect(p.type).toBe("pulley");
      expect(p.params.groove_count).toBe(2);
      expect(p.cadquery_code).toContain("groove_count");
    });
  });

  // ── Coupling ──

  describe("createCoupling", () => {
    it("creates rigid coupling", () => {
      const c = parametricPartLibraryEngine.createCoupling({
        bore1: 15, bore2: 20, outer_diameter: 50, length: 40,
      });
      expect(c.type).toBe("coupling");
      expect(c.cadquery_code).toContain("bore1");
      expect(c.cadquery_code).toContain("bore2");
    });
  });

  // ── Material / Mass ──

  describe("mass estimation", () => {
    it("returns undefined mass when no material", () => {
      const s = parametricPartLibraryEngine.createShaft({
        diameter: 20, length: 100,
      });
      expect(s.estimated_mass_g).toBeUndefined();
    });

    it("calculates mass for known material", () => {
      const s = parametricPartLibraryEngine.createShaft({
        diameter: 20, length: 100, material: "aluminum",
      });
      expect(s.estimated_mass_g).toBeGreaterThan(0);
      // pi*10^2*100 = 31416 mm3 = 31.4 cm3 * 2.7 = ~84.8g
      expect(s.estimated_mass_g!).toBeCloseTo(84.8, 0);
    });
  });
});
