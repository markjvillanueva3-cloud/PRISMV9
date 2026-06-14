import { describe, it, expect } from "vitest";
import { FusionToolExportEngine } from "../engines/FusionToolExportEngine.js";

const engine = new FusionToolExportEngine();

describe("FusionToolExportEngine", () => {
  it("exports tool library with correct Fusion format", () => {
    const lib = engine.export({ max_tools: 10 });
    expect(lib.version).toBe(2);
    expect(lib.tools.length).toBeGreaterThan(0);
    expect(lib.metadata.generated_by).toContain("PRISM");
  });

  it("each tool has geometry fields", () => {
    const lib = engine.export({ max_tools: 5 });
    for (const tool of lib.tools) {
      expect(tool.geometry.DC).toBeGreaterThan(0);
      expect(tool.geometry.LCF).toBeGreaterThan(0);
      expect(tool.geometry.OAL).toBeGreaterThan(0);
      expect(tool.geometry.NOF).toBeGreaterThanOrEqual(1);
      expect(tool.unit).toBe("millimeters");
    }
  });

  it("generates 6 material presets per tool", () => {
    const lib = engine.export({ max_tools: 3 });
    for (const tool of lib.tools) {
      const presets = tool["start-values"].presets;
      expect(presets.length).toBe(6);
      expect(presets[0].name).toContain("Steel");
      expect(presets[3].name).toContain("Aluminum");
      for (const p of presets) {
        expect(p.f_n).toBeGreaterThan(0);
        expect(p.n).toBeGreaterThan(0);
        expect(p.stepdown).toBeGreaterThan(0);
        expect(p.stepover).toBeGreaterThan(0);
      }
    }
  });

  it("includes holder geometry with segments", () => {
    const lib = engine.export({ max_tools: 3 });
    for (const tool of lib.tools) {
      expect(tool.holder).toBeDefined();
      expect(tool.holder!.geometry.DC).toBeGreaterThan(0);
      expect(tool.holder!.geometry.LB).toBeGreaterThan(0);
      expect(tool.holder!.geometry.connection).toBeTruthy();
      expect(tool.holder!.segments!.length).toBeGreaterThan(0);
    }
  });

  it("includes shaft geometry", () => {
    const lib = engine.export({ max_tools: 3 });
    for (const tool of lib.tools) {
      expect(tool.shaft).toBeDefined();
      expect(tool.shaft!.segments.length).toBeGreaterThan(0);
      for (const seg of tool.shaft!.segments) {
        expect(seg["upper-diameter"]).toBeGreaterThan(0);
        expect(seg.height).toBeGreaterThan(0);
      }
    }
  });

  it("aluminum presets have higher speed than steel", () => {
    const lib = engine.export({ max_tools: 1 });
    const presets = lib.tools[0]["start-values"].presets;
    const steel = presets.find(p => p.name.includes("Steel"));
    const alum = presets.find(p => p.name.includes("Aluminum"));
    expect(alum!.n).toBeGreaterThan(steel!.n);
  });

  it("exports single tool with holder", () => {
    const tool = engine.exportSingleTool({
      diameter_mm: 12,
      flute_count: 4,
      flute_length_mm: 36,
      overall_length_mm: 80,
      corner_radius_mm: 0,
      coating: "TiAlN",
      manufacturer: "OSG",
      designation: "AE-VMS-12",
    });
    expect(tool.geometry.DC).toBe(12);
    expect(tool.vendor).toBe("OSG");
    expect(tool.holder).toBeDefined();
    expect(tool.shaft).toBeDefined();
    expect(tool.BMC).toBe("carbide");
  });

  it("maps tool types correctly", () => {
    const ball = engine.exportSingleTool({
      diameter_mm: 10, flute_count: 2,
      flute_length_mm: 20, overall_length_mm: 50,
      corner_radius_mm: 5, // R = D/2 → ball
    });
    expect(ball.type).toBe("ball end mill");

    const flat = engine.exportSingleTool({
      diameter_mm: 10, flute_count: 3,
      flute_length_mm: 30, overall_length_mm: 60,
      corner_radius_mm: 0,
    });
    expect(flat.type).toBe("flat end mill");
  });

  it("attaches a REAL cataloged holder by default (spindle taper CAT40)", () => {
    // U-HOLDER-WIRE-FUSION (slot:romeo): holders now come from the real catalog
    // (HolderSelectionEngine: HAIMER/GUHRING/BIG DAISHOWA) matched to the spindle
    // taper + shank, not a synthetic ER-collet guess. Default spindle taper = CAT40.
    const small = engine.exportSingleTool({
      diameter_mm: 4, flute_count: 3,
      flute_length_mm: 12, overall_length_mm: 40,
    });
    // a real CAT40 holder: machine-side connection is the SPINDLE taper, vendor is a brand
    expect(small.holder!.geometry.connection).toBe("CAT40");
    expect(["HAIMER", "GUHRING", "BIG DAISHOWA"]).toContain(small.holder!.vendor);
  });

  it("falls back to synthetic ER-collet sizing when no catalog holder fits the spindle taper", () => {
    // a bogus spindle taper has no catalog holder -> the synthetic ER-sizing fallback runs
    const small = engine.exportSingleTool({
      diameter_mm: 4, flute_count: 3,
      flute_length_mm: 12, overall_length_mm: 40,
      spindle_taper: "NONESUCH-99",
    } as any);
    expect(small.holder!.geometry.connection).toBe("ER16");
    expect(small.holder!.vendor).toBe("Generic");

    const medium = engine.exportSingleTool({
      diameter_mm: 12, flute_count: 4,
      flute_length_mm: 36, overall_length_mm: 80,
      spindle_taper: "NONESUCH-99",
    } as any);
    expect(medium.holder!.geometry.connection).toBe("ER20");
  });

  // ── Physics-optimal presets via UltimateSpeedFeedEngine (tier-2 of the
  //    preset priority chain: catalog → SFC physics → Kienzle default). A tool
  //    with no vendor cutting_data exercises the SFC path. These assert the
  //    cutting data is physically correct per material group, not just present.
  describe("physics-optimal SFC presets per material group", () => {
    const lib = engine.export({ max_tools: 1 });
    const presets = lib.tools[0]["start-values"].presets;
    const byIso = (frag: string) => presets.find(p => p.name.includes(frag))!;

    it("orders spindle speed by machinability: N > P > S, and H < P", () => {
      const N = byIso("Aluminum"), P = byIso("Steel"), S = byIso("Superalloy"), H = byIso("Hardened");
      // Aluminum (N) cuts fastest, superalloy (S) slowest — Vc∝machinability.
      expect(N.n).toBeGreaterThan(P.n);
      expect(P.n).toBeGreaterThan(S.n);
      // Hardened tool steel (H) runs slower than annealed carbon steel (P).
      expect(H.n).toBeLessThan(P.n);
    });

    it("aluminum takes a larger chip load (fz) than superalloy", () => {
      expect(byIso("Aluminum").f_n).toBeGreaterThan(byIso("Superalloy").f_n);
    });

    it("sources from the SFC table, not coarse defaults (K-group Vc pins to ~170)", () => {
      // The CUTTING_PARAMS table has K_milling_roughing Vc[1]=170 m/min, whereas
      // the coarse DEFAULT_VC fallback uses K=200. A 12mm end mill with no vendor
      // cutting_data must take the live SFC path → Vc≈170. If that path were dead
      // and every group fell back to DEFAULT_VC, K would back-compute to ~200.
      const tool = engine.exportSingleTool({
        diameter_mm: 12, flute_count: 4, flute_length_mm: 36,
        overall_length_mm: 80, corner_radius_mm: 0, coating: "AlTiN", type: "end_mill",
      });
      const K = tool["start-values"].presets.find(p => p.name.includes("Cast Iron"))!;
      const vcK = (K.n * Math.PI * tool.geometry.DC) / 1000;
      expect(vcK).toBeGreaterThan(155);
      expect(vcK).toBeLessThan(190);   // excludes the DEFAULT_VC K=200 fallback
    });

    it("every ISO preset back-computes to a real surface speed + sane feed", () => {
      const dc = lib.tools[0].geometry.DC;
      for (const p of presets) {
        // Vc = n·π·Dc/1000. The preset RPM, with the tool's own diameter, must
        // land in a real machining band (superalloy ~25 → aluminum finishing
        // ~915 m/min) — a diameter-independent physics invariant that catches
        // garbage RPM regardless of tool size (a 1.7mm alu tool at 66.8k RPM is
        // a legitimate ~357 m/min, not an error).
        const vc = (p.n * Math.PI * dc) / 1000;
        expect(vc).toBeGreaterThan(10);
        expect(vc).toBeLessThan(1500);
        expect(p.f_n).toBeGreaterThan(0);
        expect(p.f_n).toBeLessThan(2);        // fz < 2 mm/tooth sanity
        expect(p.f_ramp).toBeGreaterThan(0);
        expect(p.stepdown).toBeGreaterThan(0);
        expect(p.stepover).toBeGreaterThan(0);
        expect(p.tool_coolant).toMatch(/flood|mist|through tool|disabled|air/i);
      }
    });
  });
});
