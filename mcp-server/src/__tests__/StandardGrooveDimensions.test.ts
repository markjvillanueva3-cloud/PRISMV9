/**
 * StandardGrooveDimensions.test.ts -- U-LW-STD-GROOVE-TABLES (slot:whiskey, 2026-07-01)
 * ============================================================================
 * Coverage-audit gap #2: standard-designation -> groove-to-cut lookup. Reference values
 * are transcribed INDEPENDENTLY from the named sources (R9): DIN 471/472 manufacturer
 * tables (fasteners.eu cross-checked vs JC Fasteners/Westfield/Accu), IS 3428:2009
 * (= DIN 509:2006) Table 1, DIN 76-1:2004 Tabelle 1+2. Table-wide invariants (m > s,
 * external d2 < d1, internal d2 > d1) are the class of check that catches the two
 * impossible rows the raw sources shipped (DIN471 d48, DIN472 d82 -- corrected).
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  DIN471_GROOVES,
  DIN472_GROOVES,
  DIN509_RELIEFS,
  DIN76_EXTERNAL,
  DIN76_INTERNAL,
  AS568_GLANDS,
  circlipGroove,
  din509ByDesignation,
  din509Recommend,
  din76Undercut,
  oringGland,
} from "../data/standard-groove-dimensions.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

describe("DIN 471 / DIN 472 circlip grooves -- reference rows", () => {
  it("DIN 471 shaft d20: d2=19.0, m=1.3, s=1.2 -> depth 0.5 (the row the old audit mis-cited)", () => {
    const r = circlipGroove("DIN471", 20);
    expect(r.d2).toBe(19.0);
    expect(r.m).toBe(1.3);
    expect(r.s).toBe(1.2);
    expect(r.depth_mm).toBeCloseTo(0.5, 6);
    expect(r.geometry.groove_width_mm).toBe(1.3);
  });

  it("DIN 471 shaft d40: d2=37.5, m=1.85 -> depth 1.25 (the row width-1.85/depth-1.25 actually belongs to)", () => {
    const r = circlipGroove("DIN471", 40);
    expect(r.d2).toBe(37.5);
    expect(r.m).toBe(1.85);
    expect(r.depth_mm).toBeCloseTo(1.25, 6);
  });

  it("DIN 471 d48 carries the CORRECTED ring thickness s=1.75 (source typo said 2.0 > m)", () => {
    const r = circlipGroove("DIN471", 48);
    expect(r.d2).toBe(45.5);
    expect(r.m).toBe(1.85);
    expect(r.s).toBe(1.75); // JC Fasteners corroboration
  });

  it("DIN 472 bore d40: groove is LARGER than the bore (d2=42.5, depth 1.25)", () => {
    const r = circlipGroove("DIN472", 40);
    expect(r.d2).toBe(42.5);
    expect(r.m).toBe(1.85);
    expect(r.s).toBe(1.75);
    expect(r.depth_mm).toBeCloseTo(1.25, 6);
  });

  it("DIN 472 d82 carries the CORRECTED ring thickness s=2.5 (source typo said 3.0 > m)", () => {
    const r = circlipGroove("DIN472", 82);
    expect(r.d2).toBe(85.5);
    expect(r.m).toBe(2.65);
    expect(r.s).toBe(2.5); // Accu 80/82-class corroboration
  });

  it("TABLE INVARIANTS: m > s on every row; DIN471 d2 < d1; DIN472 d2 > d1; d1 strictly ascending", () => {
    for (const t of [DIN471_GROOVES, DIN472_GROOVES]) {
      for (const row of t) {
        expect(row.m).toBeGreaterThan(row.s); // groove must be wider than the ring
      }
      for (let i = 1; i < t.length; i++) {
        expect(t[i].d1).toBeGreaterThan(t[i - 1].d1);
      }
    }
    for (const row of DIN471_GROOVES) expect(row.d2).toBeLessThan(row.d1);
    for (const row of DIN472_GROOVES) expect(row.d2).toBeGreaterThan(row.d1);
  });

  it("FAIL-LOUD: non-standard size throws naming the neighbors; bad input throws", () => {
    expect(() => circlipGroove("DIN471", 23)).toThrow(/22 \/ 24/); // nearest sizes named
    expect(() => circlipGroove("DIN472", 6)).toThrow(/no table row/);
    expect(() => circlipGroove("DIN471", 0)).toThrow(/positive finite/);
    expect(() => circlipGroove("DIN471", NaN)).toThrow(/positive finite/);
  });
});

describe("DIN 509 / IS 3428 relief grooves", () => {
  it("E 0.6x0.3: f=2.5, allocated above 18 to 80, normal duty (IS 3428 Table 1)", () => {
    const r = din509ByDesignation("E 0.6x0.3");
    expect(r.r).toBe(0.6);
    expect(r.t1).toBe(0.3);
    expect(r.f).toBe(2.5);
    expect(r.d1_min).toBe(18);
    expect(r.d1_max).toBe(80);
    expect(r.series).toBe("normal");
    expect(r.series1_radius).toBe(true);
  });

  it("Form F adds the face-side depth/breadth: F 1x0.2 -> t2=0.1, g=1.8, fatigue series", () => {
    const r = din509ByDesignation("F 1x0.2");
    expect(r.t2).toBe(0.1);
    expect(r.g).toBe(1.8);
    expect(r.series).toBe("fatigue");
  });

  it("designation lookup is case/comma/trailing-zero tolerant (e 0,6x0,3; E 1.0x0.2)", () => {
    expect(din509ByDesignation("e 0,6x0,3").designation).toBe("E 0.6x0.3");
    expect(din509ByDesignation("E 1.0x0.2").designation).toBe("E 1x0.2");
  });

  it("recommend by diameter: d1=25 normal E -> 0.6x0.3 + 0.8x0.3 with series-1 radius first", () => {
    const rows = din509Recommend(25, "E", "normal");
    expect(rows.map((x) => x.designation)).toEqual(["E 0.6x0.3", "E 0.8x0.3"]);
    const fatigue = din509Recommend(25, "E", "fatigue");
    expect(fatigue[0].designation).toBe("E 1x0.2"); // series-1 r=1 ahead of series-2 r=1.2
  });

  it("FAIL-LOUD: unknown designation lists valid ones; out-of-range diameter throws", () => {
    expect(() => din509ByDesignation("E 9x9")).toThrow(/Valid: /);
    expect(() => din509Recommend(1, "E", "normal")).toThrow(/no normal-series/);
    expect(() => din509Recommend(NaN)).toThrow(/positive finite/);
  });
});

describe("DIN 76-1 thread undercuts", () => {
  it("external P=1.5 form A (M10): dg=d-2.3, g1=3.2, g2=5.2, r=0.8 (Tabelle 1)", () => {
    const r = din76Undercut(1.5, { nominal_diameter_mm: 10 });
    expect(r.form).toBe("A");
    expect(r.dg_offset).toBe(2.3);
    expect(r.groove_width_min_mm).toBe(3.2); // the REAL g1 -- proportional guesses said 3.8/4.4
    expect(r.groove_width_max_mm).toBe(5.2);
    expect(r.r).toBe(0.8);
    expect(r.dg_mm).toBeCloseTo(7.7, 6); // 10 - 2.3
    expect(r.geometry?.groove_depth_mm).toBeCloseTo(1.15, 6); // radial depth = offset/2
  });

  it("short form B halves the window: P=1.5 -> g1=1.8, g2=3.8 (=2.5P as the std footer states)", () => {
    const r = din76Undercut(1.5, { short: true });
    expect(r.form).toBe("B");
    expect(r.groove_width_min_mm).toBe(1.8);
    expect(r.groove_width_max_mm).toBe(3.8);
  });

  it("internal P=1.5 form C: dg=d+0.5, g1=6, g2=7.8 (Tabelle 2)", () => {
    const r = din76Undercut(1.5, { internal: true, nominal_diameter_mm: 10 });
    expect(r.form).toBe("C");
    expect(r.dg_offset).toBe(0.5);
    expect(r.groove_width_min_mm).toBe(6);
    expect(r.groove_width_max_mm).toBe(7.8);
    expect(r.dg_mm).toBeCloseTo(10.5, 6); // bore undercut is LARGER than d
  });

  it("STRUCTURAL INVARIANTS (both tables): pitch ascending, g1 < g2, short < regular, g2 within 0.3 of 3.5P/2.5P footer proportion (external)", () => {
    for (const t of [DIN76_EXTERNAL, DIN76_INTERNAL]) {
      for (let i = 1; i < t.length; i++) expect(t[i].pitch).toBeGreaterThan(t[i - 1].pitch);
      for (const row of t) {
        expect(row.g1).toBeLessThan(row.g2);
        expect(row.g1_short).toBeLessThan(row.g1);
        expect(row.g2_short).toBeLessThan(row.g2);
      }
    }
    for (const row of DIN76_EXTERNAL) {
      expect(Math.abs(row.g2 - 3.5 * row.pitch)).toBeLessThanOrEqual(0.3);
      expect(Math.abs(row.g2_short - 2.5 * row.pitch)).toBeLessThanOrEqual(0.3);
    }
  });

  it("coarse-pitch mapping survived the OCR fix: P=1.0 maps to M6/M7 (not 'M16')", () => {
    const row = DIN76_EXTERNAL.find((x) => x.pitch === 1)!;
    expect(row.coarse_diameters).toEqual([6, 7]);
  });

  it("FAIL-LOUD: non-standard pitch names neighbors; non-physical dg throws (units trap)", () => {
    expect(() => din76Undercut(1.6)).toThrow(/1.5 \/ 1.75/);
    expect(() => din76Undercut(0)).toThrow(/positive finite/);
    expect(() => din76Undercut(NaN)).toThrow(/positive finite/);
    // d=1 with P=1.5 -> dg = -1.3: an inch/mm mixup shape, must throw not emit
    expect(() => din76Undercut(1.5, { nominal_diameter_mm: 1 })).toThrow(/non-physical/);
  });
});

describe("AS568 / ISO 3601-2 O-ring glands", () => {
  it("static radial 1/8in class: depth .111-.113, width .187-.192, squeeze 16-23% (Parker 4-2 = ERIKS AS.C2 = globaloring)", () => {
    const r = oringGland(0.139, "static_radial");
    expect(r.depth_in).toEqual([0.111, 0.113]);
    expect(r.width_in).toEqual([0.187, 0.192]);
    expect(r.squeeze_pct).toEqual([16, 23]);
    expect(r.width_2backup_in).toEqual([0.275, 0.280]);
    expect(r.single_source_advisory).toBe(false);
  });

  it("accepts the metric cross-section alias: 3.53mm hits the same 1/8in row", () => {
    const byMm = oringGland(3.53, "static_radial");
    const byIn = oringGland(0.139, "static_radial");
    expect(byMm.cs_in).toBe(byIn.cs_in);
    expect(byMm.geometry.groove_depth_mm).toBeCloseTo(((0.111 + 0.113) / 2) * 25.4, 3); // explicit mm conversion
  });

  it("INVARIANT: dynamic gland is DEEPER (less squeeze) than static for every cross-section", () => {
    for (let i = 0; i < AS568_GLANDS.static_radial.length; i++) {
      const s = AS568_GLANDS.static_radial[i];
      const d = AS568_GLANDS.dynamic_radial[i];
      expect(d.cs_in).toBe(s.cs_in);
      expect(d.depth_in[0]).toBeGreaterThan(s.depth_in[0]); // deeper groove -> less squeeze -> less friction
      expect(d.squeeze_pct[1]).toBeLessThanOrEqual(s.squeeze_pct[1]);
    }
  });

  it("INVARIANT: face depth + printed inch squeeze reconstructs the cross-section, and squeeze_pct derives from it (the check class that outed globaloring's face depths AND ERIKS's own face-% column)", () => {
    const mid = (r: readonly [number, number]) => (r[0] + r[1]) / 2;
    for (const row of AS568_GLANDS.face) {
      expect(row.squeeze_in).toBeDefined(); // the printed authoritative column travels WITH the row
      expect(mid(row.depth_in) + mid(row.squeeze_in!)).toBeCloseTo(row.cs_in, 2);
      // pct is derived-by-construction from the inch column, never a sibling-table copy
      expect(row.squeeze_pct[0]).toBe(Math.round((row.squeeze_in![0] / row.cs_in) * 100));
      expect(row.squeeze_pct[1]).toBe(Math.round((row.squeeze_in![1] / row.cs_in) * 100));
      // floor guard only -- the derivation-equality asserts ABOVE are the real
      // reappearance catch for the discarded ERIKS single-% column (4 of 5 rows mismatch)
      expect(row.squeeze_pct[0]).toBeGreaterThanOrEqual(18);
      // vacuum width is always narrower than the liquids width
      expect(row.width_vacuum_in![1]).toBeLessThan(row.width_in[0]);
    }
  });

  it("dovetail is two-source for .070-.275 (advisory dropped); .375 stays ERIKS-only advisory", () => {
    expect(oringGland(0.139, "dovetail").single_source_advisory).toBe(false); // Parker 4-19 + Bayseal p.11
    expect(oringGland(0.375, "dovetail").single_source_advisory).toBe(true); // Parker chart ends at .275
    expect(oringGland(0.375, "dovetail").cs_in).toBe(0.375); // dovetail-only 3/8 class
  });

  it("dovetail .070 carries the Parker/Bayseal row (2-vs-1 over ERIKS's static-radial duplicate)", () => {
    const r = oringGland(0.070, "dovetail");
    expect(r.depth_in).toEqual([0.053, 0.055]); // NOT the ERIKS .050-.052 (= its static-radial row)
    expect(r.squeeze_pct).toEqual([23, 23]);
    expect(r.width_in).toEqual([0.057, 0.061]);
  });

  it("dovetail geometry bottom radius is R (groove-corner) alone, never the R/R1 average", () => {
    const dt = oringGland(0.139, "dovetail");
    expect(dt.geometry.bottom_radius_mm).toBeCloseTo(0.010 * 25.4, 3); // 0.254 -- NOT mid(.010,.030)*25.4=0.508
    // radial services keep the min/max-of-one-feature midpoint (module rounds to 3 decimals:
    // mid(.010,.025)*25.4 = 0.4445 -> 0.445)
    const sr = oringGland(0.139, "static_radial");
    expect(sr.geometry.bottom_radius_mm).toBe(0.445);
  });

  it("FAIL-LOUD: unknown cross-section names the table classes; bad seat dia throws", () => {
    expect(() => oringGland(0.15)).toThrow(/table classes/);
    expect(() => oringGland(NaN)).toThrow(/positive finite/);
    expect(() => oringGland(0.139, "static_radial", -5)).toThrow(/seatDiameterMm/);
  });
});

// ---- Dispatcher round-trip ---------------------------------------------------
interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

describe("groove_size_from_standard via prism_turning dispatcher", () => {
  let handler: CapturedTool["handler"];
  beforeAll(() => {
    const server = makeStubServer();
    registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    if (!tool) throw new Error("prism_turning tool was not registered");
    handler = tool.handler;
  });
  async function invoke(action: string, params: Record<string, unknown>) {
    const res = await handler({ action, params });
    const text = res.content[0]?.text ?? "";
    try { return JSON.parse(text) as Record<string, unknown>; } catch { return { __raw: text }; }
  }
  const unwrap = (v: Record<string, unknown>) => (v.result ?? v.data ?? v) as Record<string, unknown>;

  it("DIN471 d1=20 round-trips to the sourced row (schema normalizes 'din-471')", async () => {
    const r = unwrap(await invoke("groove_size_from_standard", { standard: "din-471", d1_mm: 20 }));
    expect(r.d2).toBe(19.0);
    expect(r.depth_mm).toBeCloseTo(0.5, 6);
  });

  it("DIN76 P=1.5 d=10 round-trips with computed dg", async () => {
    const r = unwrap(await invoke("groove_size_from_standard", { standard: "DIN 76-1", pitch_mm: 1.5, nominal_diameter_mm: 10 }));
    expect(r.dg_mm).toBeCloseTo(7.7, 6);
    expect(r.form).toBe("A");
  });

  it("DIN76 internal:true flag round-trips to the INTERNAL table (dg = d + 0.5)", async () => {
    const r = unwrap(await invoke("groove_size_from_standard", { standard: "DIN76", pitch_mm: 1.5, internal: true, nominal_diameter_mm: 10 }));
    expect(r.form).toBe("C");
    expect(r.dg_mm).toBeCloseTo(10.5, 6);
  });

  it("SILENT-WRONG GUARD: string 'false' flag is schema-rejected, never coerced to true", async () => {
    // Boolean("false") === true would flip to the internal table -> wrong undercut dia.
    const res = await invoke("groove_size_from_standard", { standard: "DIN76", pitch_mm: 1.5, internal: "false", nominal_diameter_mm: 10 });
    const text = JSON.stringify(res).toLowerCase();
    expect(text).toMatch(/invalid params/); // the SCHEMA boundary rejected it (not an engine throw)
    expect(text).toMatch(/internal/); // and it names the offending field
  });

  it("DIN509 designation round-trips; unknown standard is schema-rejected", async () => {
    const r = unwrap(await invoke("groove_size_from_standard", { standard: "DIN509", designation: "E 0.6x0.3" }));
    expect(r.f).toBe(2.5);
    // (ISO3601 became a VALID standard in U-LW-ORING-GLAND-TABLES -- probe with a real unknown)
    const bad = await invoke("groove_size_from_standard", { standard: "DIN9999", d1_mm: 20 });
    const badText = JSON.stringify(bad).toLowerCase();
    expect(badText).toMatch(/invalid params/); // schema-boundary rejection, not an engine throw
    // colon-space pins the middleware's "path: message" join -- the action name
    // ("...from_standard'") and JSON key form cannot satisfy this (R9)
    expect(badText).toMatch(/standard: /);
  });

  it("fail-loud table miss surfaces as a structured dispatcher error (not silence)", async () => {
    const res = await invoke("groove_size_from_standard", { standard: "DIN471", d1_mm: 23 });
    expect(JSON.stringify(res)).toMatch(/no table row|22 \/ 24/);
  });

  it("ISO3601/AS568 gland round-trips (AS568 alias + dynamic service + metric CS)", async () => {
    const r = unwrap(await invoke("groove_size_from_standard", { standard: "AS568", cross_section: 3.53, service: "dynamic_radial" }));
    expect(r.cs_in).toBe(0.139);
    expect(r.depth_in).toEqual([0.121, 0.123]); // dynamic 1/8in class (ERIKS AS.D1 = globaloring)
    const miss = await invoke("groove_size_from_standard", { standard: "ISO 3601", cross_section: 0.15 });
    expect(JSON.stringify(miss)).toMatch(/table classes/);
  });

  it("seat_diameter_mm flows into geometry.diameter_mm when passed, absent when not", async () => {
    const withSeat = unwrap(await invoke("groove_size_from_standard", { standard: "ISO3601", cross_section: 0.139, seat_diameter_mm: 40 }));
    expect((withSeat.geometry as Record<string, unknown>).diameter_mm).toBe(40);
    const without = unwrap(await invoke("groove_size_from_standard", { standard: "ISO3601", cross_section: 0.139 }));
    expect((without.geometry as Record<string, unknown>).diameter_mm).toBeUndefined();
  });
});
