/**
 * CAMMaterialDatabaseEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-MATERIAL
 */
import { describe, it, expect } from "vitest";
import { CAMMaterialDatabaseEngine } from "../engines/CAMMaterialDatabaseEngine.js";

const engine = new CAMMaterialDatabaseEngine();

describe("CAMMaterialDatabaseEngine", () => {

  it("steel → ISO P group, kc1.1 = 1800 (canonical)", () => {
    const m = engine.get("steel");
    expect(m?.isoGroup).toBe("P");
    expect(m?.kc11NMm2).toBe(1800);
  });

  it("stainless → ISO M group, kc1.1 = 2100", () => {
    const m = engine.get("stainless");
    expect(m?.isoGroup).toBe("M");
    expect(m?.kc11NMm2).toBe(2100);
  });

  it("aluminum → ISO N group, kc1.1 = 700", () => {
    const m = engine.get("aluminum");
    expect(m?.isoGroup).toBe("N");
    expect(m?.kc11NMm2).toBe(700);
  });

  it("titanium → ISO S group, kc1.1 = 2800", () => {
    const m = engine.get("titanium");
    expect(m?.isoGroup).toBe("S");
    expect(m?.kc11NMm2).toBe(2800);
  });

  it("hardened_steel → ISO H group, kc1.1 = 3200", () => {
    const m = engine.get("hardened_steel");
    expect(m?.isoGroup).toBe("H");
    expect(m?.kc11NMm2).toBe(3200);
  });

  it("inconel → ISO S group with elevated kc1.1 = 3000 (work-hardening)", () => {
    const m = engine.get("inconel");
    expect(m?.isoGroup).toBe("S");
    expect(m?.kc11NMm2).toBe(3000);
  });

  it("tool_steel → ISO P with elevated kc1.1 = 2200", () => {
    const m = engine.get("tool_steel");
    expect(m?.isoGroup).toBe("P");
    expect(m?.kc11NMm2).toBe(2200);
  });

  it("aluminum density = 2.70 g/cm^3", () => {
    expect(engine.get("aluminum")?.densityGCm3).toBeCloseTo(2.70, 2);
  });

  it("steel density = 7.85 g/cm^3", () => {
    expect(engine.get("steel")?.densityGCm3).toBeCloseTo(7.85, 2);
  });

  it("titanium density = 4.43 g/cm^3 (Ti-6Al-4V)", () => {
    expect(engine.get("titanium")?.densityGCm3).toBeCloseTo(4.43, 2);
  });

  it("machinability index: aluminum > stainless > titanium > hardened_steel", () => {
    const al = engine.get("aluminum")!.machinabilityIndex;
    const ss = engine.get("stainless")!.machinabilityIndex;
    const ti = engine.get("titanium")!.machinabilityIndex;
    const hs = engine.get("hardened_steel")!.machinabilityIndex;
    expect(al).toBeGreaterThan(ss);
    expect(ss).toBeGreaterThan(ti);
    expect(ti).toBeGreaterThan(hs);
  });

  it("hardened_steel uses HRC not HB", () => {
    const m = engine.get("hardened_steel");
    expect(typeof m?.hardnessHRC).toBe("number");
    expect(typeof m?.hardnessHB === "undefined").toBe(true);
  });

  it("soft materials use HB not HRC", () => {
    const m = engine.get("aluminum");
    expect(typeof m?.hardnessHB).toBe("number");
    expect(typeof m?.hardnessHRC === "undefined").toBe(true);
  });

  it("get unknown material → null (no fabrication)", () => {
    // @ts-expect-error — intentional bad id
    const m = engine.get("kryptonite");
    expect(m).toBeNull();
  });

  it("list() returns 11 materials", () => {
    const ids = engine.list();
    expect(ids.length).toBe(11);
    expect(ids).toContain("steel");
    expect(ids).toContain("aluminum");
    expect(ids).toContain("inconel");
  });

  it("list_by_iso_group('P') returns steel + tool_steel", () => {
    const p = engine.list_by_iso_group("P");
    expect(p).toContain("steel");
    expect(p).toContain("tool_steel");
  });

  it("list_by_iso_group('S') returns titanium + inconel", () => {
    const s = engine.list_by_iso_group("S");
    expect(s).toContain("titanium");
    expect(s).toContain("inconel");
  });

  it("list_by_iso_group('H') returns hardened_steel only", () => {
    const h = engine.list_by_iso_group("H");
    expect(h.length).toBe(1);
    expect(h[0]).toBe("hardened_steel");
  });

  it("iso_kc11 returns canonical values for all 6 groups", () => {
    expect(engine.iso_kc11("P")).toBe(1800);
    expect(engine.iso_kc11("M")).toBe(2100);
    expect(engine.iso_kc11("K")).toBe(1100);
    expect(engine.iso_kc11("N")).toBe(700);
    expect(engine.iso_kc11("S")).toBe(2800);
    expect(engine.iso_kc11("H")).toBe(3200);
  });

  it("iso_groups() returns all 6 ISO codes", () => {
    const g = engine.iso_groups();
    expect(g.length).toBe(6);
    expect(g).toEqual(["P", "M", "K", "N", "S", "H"]);
  });

  it("kienzleMc is in the 0.20-0.30 band for every material (sanity)", () => {
    for (const id of engine.list()) {
      const m = engine.get(id)!;
      expect(m.kienzleMc).toBeGreaterThanOrEqual(0.20);
      expect(m.kienzleMc).toBeLessThanOrEqual(0.30);
    }
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes get + list + list_by_iso_group + iso_kc11", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("get");
    expect(names).toContain("list");
    expect(names).toContain("list_by_iso_group");
    expect(names).toContain("iso_kc11");
  });
});
