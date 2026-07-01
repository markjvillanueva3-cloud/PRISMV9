/**
 * CamToolExportFullCatalog -- CATALOG-APP-WIRING-MS0/U-CAM-TOOL-FULL-CATALOG (slot:romeo).
 *
 * Regression guard for the 5000-cap bug: HyperMillToolExportEngine + MastercamToolExportEngine
 * silently capped their catalog query at max_results:5000, so a "full catalog" tool export to
 * hyperMILL/Mastercam dropped ~93% of the ~74K-tool catalog. The fix raises the default ceiling
 * to 100_000 (full catalog), keeping max_tools as an explicit DOWN-limit. Same class as the
 * Fusion 20-cap (U3). Round-trips THROUGH prism_cam (romeo: wire must be tested via dispatcher).
 *
 * These tests run a FULL-catalog export (~74K tools) -> generous timeouts.
 */
import { describe, it, expect } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { catalogCorpusLoaderEngine } from "../engines/CatalogCorpusLoaderEngine.js";
import { toolCatalogEngine } from "../engines/ToolCatalogEngine.js";

// Capture the single prism_cam tool handler via a minimal mock server.
let handler: (args: { action: string; params?: Record<string, any> }) => Promise<any>;
const mockServer = {
  tool: (name: string, _desc: string, _schema: unknown, h: any) => {
    if (name === "prism_cam") handler = h;
  },
};
registerCamDispatcher(mockServer as any);

async function call(action: string, params: Record<string, any> = {}): Promise<any> {
  const res = await handler({ action, params });
  return JSON.parse(res?.content?.[0]?.text ?? "{}");
}

// The fix only matters if the live catalog actually exceeds the old 5000 cap.
catalogCorpusLoaderEngine.ensureLoaded();
const CATALOG_SIZE = (toolCatalogEngine.search({ max_results: 200_000 }) || []).length;
const OLD_CAP = 5000;

describe("CAM tool export -- 5000-cap lifted (full catalog through prism_cam)", () => {
  it("the prism_cam handler registered", () => {
    expect(typeof handler).toBe("function");
  });

  it("sanity: the live catalog exceeds the old 5000 cap (else this guard is meaningless)", () => {
    // If this fails, the corpus didn't load -- the >5000 assertions below would be vacuous.
    expect(CATALOG_SIZE).toBeGreaterThan(OLD_CAP);
  });

  it("mastercam_tool_export (no filter) exports > 5000 tools -- not the old silent cap", async () => {
    const r = await call("mastercam_tool_export");
    expect(r.success !== false).toBe(true);
    expect(typeof r.tool_count).toBe("number");
    expect(r.tool_count).toBeGreaterThan(OLD_CAP);
  }, 120_000);

  it("mastercam_tool_export still honors an explicit max_tools subset (knob preserved)", async () => {
    const r = await call("mastercam_tool_export", { filter: { max_tools: 100 } });
    expect(r.tool_count).toBeGreaterThan(0);
    expect(r.tool_count).toBeLessThanOrEqual(100);
  }, 60_000);

  it("hypermill_tool_export (no tools) exports > 5000 tools -- not the old silent cap", async () => {
    const r = await call("hypermill_tool_export");
    expect(r.success !== false).toBe(true);
    expect(typeof r.tool_count).toBe("number");
    expect(r.tool_count).toBeGreaterThan(OLD_CAP);
  }, 120_000);

  it("hypermill_tool_export still honors an explicit max_tools subset (knob preserved)", async () => {
    const r = await call("hypermill_tool_export", { options: { max_tools: 100 } });
    expect(r.tool_count).toBeGreaterThan(0);
    expect(r.tool_count).toBeLessThanOrEqual(100);
  }, 60_000);

  // U-HOLDER-WIRE-FUSION: exported Fusion tools must carry REAL cataloged holders
  // (HAIMER/GUHRING/BIG DAISHOWA), not the old synthetic vendor="Generic" guess.
  it("fusion_export_tool_library attaches REAL holders to tools (through prism_cam)", async () => {
    const r = await call("fusion_export_tool_library", { limit: 12 });
    const tools = (r.library?.tools ?? []) as any[];
    expect(tools.length).toBeGreaterThan(0);
    const realBrands = new Set(["HAIMER", "GUHRING", "BIG DAISHOWA"]);
    const withRealHolder = tools.filter((t) => t.holder && realBrands.has(t.holder.vendor));
    // default spindle taper CAT40 -> at least some tools match a real cataloged holder
    expect(withRealHolder.length).toBeGreaterThan(0);
    // a real-holder tool carries the spindle taper as its machine-side connection
    expect(withRealHolder[0].holder.geometry.connection).toBe("CAT40");
  }, 120_000);

  // U-HOLDER-WIRE-MASTERCAM: Mastercam exported tools must carry a REAL holder brand
  // (McamHolder has no vendor field, so the brand rides in holder.description).
  it("mastercam_tool_export attaches REAL holder brands (through prism_cam)", async () => {
    const r = await call("mastercam_tool_export", { filter: { max_tools: 12 } });
    expect(r.tool_count).toBeGreaterThan(0);
    // library_data is the serialized export; real holders put a brand in the holder description
    const serialized = String(r.library_data ?? "") + JSON.stringify(r.libraries ?? []);
    const hasRealBrand = ["HAIMER", "GUHRING", "BIG DAISHOWA"].some((b) => serialized.includes(b));
    expect(hasRealBrand).toBe(true);
  }, 60_000);

  // U-HOLDER-WIRE-HYPERMILL: a REAL cataloged holder must reach the hyperMILL .hmt NCTools row.
  // Driven by a CONTROLLED synthetic tool so the assertion is deterministic + revert-sensitive:
  //   - shank 6.35mm + CAT40 taper -> deterministically matches a real CAT40 holder
  //     (GUHRING GUH-4216 6.35mm hydraulic is in the catalog; verified in HolderSelectionEngine.test).
  //   - manufacturer is a NON-brand string, so a holder brand can ONLY appear via the holder wire.
  // The .hmt NCTools row has no holder_vendor column, so the brand+designation rides BRACKETED in
  // nc_name -- a syntax convertTool/Tools rows never emit, so reverting the wire fails this test.
  it("hypermill_tool_export puts a REAL holder (bracketed brand + sane tool_length) on the NCTools row (through prism_cam)", async () => {
    const r = await call("hypermill_tool_export", {
      tools: [{
        type: "endmill",
        physical: {
          cutting_diameter_mm: 6.35, shank_diameter_mm: 6.35,
          flute_length_mm: 30, overall_length_mm: 100, flute_count: 4, corner_radius_mm: 0,
        },
        spindle_taper: "CAT40",
        material: "carbide", coating: "TiAlN",
        manufacturer: "ZZZ-NOT-A-HOLDER-BRAND", part_number: "TST-635",
      }],
      options: {},
    });
    expect(r.tool_count).toBe(1);
    const ncInserts = (r.insert_statements ?? []).filter((s: string) => /INSERT INTO NCTools/.test(s));
    expect(ncInserts.length).toBe(1);
    // (a) the holder brand rides BRACKETED in nc_name -- the wire's signature. convertTool never
    //     emits `[...]`, so this assertion fails the moment the holderSelectionEngine wire is reverted.
    expect(ncInserts[0]).toMatch(/\[(HAIMER|GUHRING|BIG DAISHOWA)\b[^\]]*\]/);
    // (b) the last SIX VALUES numbers are gage_length, tool_length, usable_length, preset_diameter,
    //     max_spindle_speed, max_feedrate (the two cutting-data columns wired in U-HMT-CUTTING-DATA).
    const nums = ncInserts[0].match(/([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\);?\s*$/);
    if (!nums) throw new Error(`could not parse NCTools VALUES tail: ${ncInserts[0]}`);
    const gage = Number(nums[1]), toolLength = Number(nums[2]), presetDia = Number(nums[4]);
    const maxRpm = Number(nums[5]), maxFeed = Number(nums[6]);
    expect(presetDia).toBeCloseTo(6.35, 2);     // parse aligned to the right columns
    // (c) tool_length is derived from tool geometry (oal 100 - fallback gauge 60 = 40), NOT silently
    //     clamped to the 10mm floor by subtracting a large holder gauge from the tool OAL.
    expect(toolLength).toBeGreaterThan(10);
    // (d) gage_length (spindle-to-tip) = holder projection + stickout, so it exceeds the stickout.
    expect(gage).toBeGreaterThan(toolLength);
    // (e) a rotating carbide endmill now carries a non-zero cutting-data ceiling: max_spindle_speed
    //     (rpm) + max_feedrate (mm/min) are populated, not the old NCTools 0.0 column defaults.
    expect(maxRpm).toBeGreaterThan(0);
    expect(maxFeed).toBeGreaterThan(0);
  }, 60_000);
});

// U-HMT-CUTTING-DATA: per-tool cutting-data ceiling (NCTools.max_spindle_speed / max_feedrate)
// derived from UltimateSpeedFeedEngine Vc/fz at ISO-N, derated by substrate (materialMult) and
// coating (coatingMult). Driven by CONTROLLED synthetic tools so every assertion is an algebraic
// invariant (R9), revert-sensitive, and round-tripped THROUGH prism_cam (romeo: wire via dispatcher).
describe("hyperMILL per-tool cutting-data ceiling (U-HMT-CUTTING-DATA, through prism_cam)", () => {
  // Parse the last six numeric NCTools VALUES columns (robust against the quoted nc_name string).
  function ncTail(insert: string) {
    const m = insert.match(/([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\);?\s*$/);
    if (!m) throw new Error(`NCTools VALUES tail unparseable: ${insert}`);
    return { gage: +m[1], toolLength: +m[2], usable: +m[3], presetDia: +m[4], maxRpm: +m[5], maxFeed: +m[6] };
  }
  function mkTool(over: { type?: string; d?: number; flutes?: number; material?: string; coating?: string } = {}) {
    const d = over.d ?? 10;
    return {
      type: over.type ?? "endmill",
      physical: {
        cutting_diameter_mm: d, shank_diameter_mm: d,
        flute_length_mm: 30, overall_length_mm: 100, flute_count: over.flutes ?? 4,
        corner_radius_mm: 0, point_angle_deg: 140,
      },
      spindle_taper: "CAT40",
      material: over.material ?? "carbide", coating: over.coating ?? "TiAlN",
      manufacturer: "ZZZ-NOT-A-HOLDER-BRAND", part_number: "TST",
    };
  }
  async function ncRowFor(tool: any) {
    const r = await call("hypermill_tool_export", { tools: [tool], options: {} });
    expect(r.tool_count).toBe(1);
    const ncInserts = (r.insert_statements ?? []).filter((s: string) => /INSERT INTO NCTools/.test(s));
    expect(ncInserts.length).toBe(1);
    return { insert: ncInserts[0] as string, ...ncTail(ncInserts[0]) };
  }

  it("a rotating carbide endmill gets a populated rpm + feedrate ceiling (not the old 0.0)", async () => {
    const row = await ncRowFor(mkTool({ type: "endmill", d: 10, material: "carbide", coating: "TiAlN" }));
    expect(row.maxRpm).toBeGreaterThan(0);
    expect(row.maxFeed).toBeGreaterThan(0);
    // rpm = Vc*1000/(pi*D); a 10mm carbide tool in non-ferrous lands in a sane high-speed band.
    expect(row.maxRpm).toBeLessThan(100_000);   // never an absurd / overflow value
  }, 30_000);

  it("rpm is inversely proportional to diameter (rpm = Vc*1000/(pi*D), Vc diameter-independent)", async () => {
    const small = await ncRowFor(mkTool({ d: 6 }));
    const large = await ncRowFor(mkTool({ d: 20 }));
    expect(small.maxRpm).toBeGreaterThan(large.maxRpm);
    // Vc is the same for both -> rpm ratio tracks the inverse diameter ratio (20/6 ~= 3.33).
    expect(small.maxRpm / large.maxRpm).toBeCloseTo(20 / 6, 0);
  }, 30_000);

  it("HSS substrate derates the ceiling to ~0.40 of carbide (materialMult), same diameter+coating", async () => {
    const carbide = await ncRowFor(mkTool({ d: 10, material: "carbide", coating: "TiAlN" }));
    const hss = await ncRowFor(mkTool({ d: 10, material: "HSS", coating: "TiAlN" }));
    expect(hss.maxRpm).toBeGreaterThan(0);
    expect(hss.maxRpm).toBeLessThan(carbide.maxRpm);
    expect(hss.maxRpm / carbide.maxRpm).toBeCloseTo(0.40, 1);   // materialMult(hss)/materialMult(carbide)
  }, 30_000);

  it("a richer coating lifts the ceiling, and AlTiN is NOT shadowed by the 'tin' substring (coatingMult fix)", async () => {
    const uncoated = await ncRowFor(mkTool({ d: 10, coating: "uncoated" }));
    const altin = await ncRowFor(mkTool({ d: 10, coating: "AlTiN" }));
    expect(altin.maxRpm).toBeGreaterThan(uncoated.maxRpm);
    // AlTiN (1.30) must beat TiN (1.10): if the substring bug regressed, altin would score 1.10
    // and this ratio would collapse toward 1.10 instead of 1.30.
    expect(altin.maxRpm / uncoated.maxRpm).toBeCloseTo(1.30, 1);
  }, 30_000);

  it("non-rotating tools (touch probe, turning) carry NO spindle ceiling (left 0.0)", async () => {
    const probe = await ncRowFor(mkTool({ type: "probe", d: 6 }));
    expect(probe.maxRpm).toBe(0);
    expect(probe.maxFeed).toBe(0);
    const turning = await ncRowFor(mkTool({ type: "turning", d: 12 }));
    expect(turning.maxRpm).toBe(0);
    expect(turning.maxFeed).toBe(0);
  }, 30_000);

  it("adversarial: a zero-diameter rotating tool fails soft to 0 (no NaN/Infinity in the .hmt)", async () => {
    const row = await ncRowFor(mkTool({ type: "endmill", d: 0 }));
    expect(row.maxRpm).toBe(0);
    expect(row.maxFeed).toBe(0);
    expect(row.insert).not.toMatch(/NaN|Infinity/);
  }, 30_000);
});
