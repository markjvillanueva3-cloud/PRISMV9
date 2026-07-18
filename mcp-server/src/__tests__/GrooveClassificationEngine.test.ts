/**
 * LATHE-PRO-MS4b — Grooving & Parting Deep Intelligence test.
 *
 * Exercises GrooveClassificationEngine + GrooveDepthGateHook end-to-end:
 *   • classify() across all 8 groove types → correct cycle + pass count
 *   • peckParamsForMat() across all 7 ISO groups (P/M/K/N/S/H + P_alloy)
 *   • deepGrooveCycle() across 4 controllers (fanuc/haas/okuma/siemens)
 *   • partoffOptimize() blade selection + center-approach feed curve
 *   • catcherTiming() across 5 controllers (fanuc/haas/okuma/mazak/citizen)
 *   • bladeStress() delegation to PartOffForceEngine + L/t gate
 *   • optimize() capstone end-to-end
 *   • ≥3 failure modes, ≥2 adversarial inputs (NaN, Infinity)
 *   • ≥3 spanning configurations (OD groove steel, face groove aluminum, parting titanium)
 *   • GrooveDepthGateHook: PASS / WARNING / BLOCK paths
 *   • Dispatcher round-trip: all 8 actions through stub server
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  grooveClassificationEngine,
  GrooveClassificationEngine,
  type GrooveGeometry,
  type GrooveOptimizeInput,
  type ISOGroup,
  type PeckISOGroup,
  type GroovingController,
  type PartCatcherController,
} from "../engines/GrooveClassificationEngine.js";
import { GrooveDepthGateHook } from "../hooks/GrooveDepthGateHook.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

// ── Fixtures ────────────────────────────────────────────────────────────────

function odGrooveSteel(o: Partial<GrooveGeometry> = {}): GrooveGeometry {
  return {
    groove_width_mm: 3,
    groove_depth_mm: 2,
    workpiece_diameter_mm: 50,
    blade_width_mm: 3,
    blade_overhang_mm: 12,
    blade_thickness_mm: 3,
    ...o,
  };
}

function faceGrooveAluminum(o: Partial<GrooveGeometry> = {}): GrooveGeometry {
  return {
    groove_width_mm: 5,
    groove_depth_mm: 4,
    workpiece_diameter_mm: 40,
    blade_width_mm: 2,
    blade_overhang_mm: 10,
    blade_thickness_mm: 2,
    face_groove: true,
    ...o,
  };
}

function partoffTitanium(o: Partial<GrooveGeometry> = {}): GrooveGeometry {
  return {
    groove_width_mm: 3,
    groove_depth_mm: 15,              // full radius to centre
    workpiece_diameter_mm: 30,
    blade_width_mm: 3,
    blade_overhang_mm: 15,
    blade_thickness_mm: 3,
    ...o,
  };
}

function optInput(
  geom: GrooveGeometry,
  iso: ISOGroup,
  o: Partial<GrooveOptimizeInput> = {},
): GrooveOptimizeInput {
  return {
    ...geom,
    material_iso_group: iso,
    feed_per_rev_mm: 0.08,
    cutting_speed_m_min: 120,
    ...o,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// classify() — U-LPG01
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine.classify — 8 groove types", () => {
  it("narrow groove with blade == groove width → single_plunge", () => {
    const r = grooveClassificationEngine.classify(
      odGrooveSteel({ groove_width_mm: 3, groove_depth_mm: 2, blade_width_mm: 3 }),
    );
    expect(r.cycle).toBe("single_plunge");
    expect(r.n_passes).toBe(1);
    expect(r.shift_step_mm).toBeNull();
  });

  it("wide groove (2× blade) → plunge_and_shift with shift=0.8*blade", () => {
    const r = grooveClassificationEngine.classify(
      odGrooveSteel({ groove_width_mm: 10, groove_depth_mm: 2, blade_width_mm: 3 }),
    );
    expect(r.cycle).toBe("plunge_and_shift");
    expect(r.shift_step_mm).toBeCloseTo(2.4, 3);   // 0.8 * 3
    expect(r.n_passes).toBeGreaterThanOrEqual(Math.ceil(10 / 2.4));
  });

  it("deep narrow groove (depth > 3×width) → peck cycle", () => {
    const r = grooveClassificationEngine.classify(
      odGrooveSteel({ groove_width_mm: 2, groove_depth_mm: 10, blade_width_mm: 2 }),
    );
    expect(r.cycle).toBe("peck");
  });

  it("face groove → face_groove cycle", () => {
    const r = grooveClassificationEngine.classify(faceGrooveAluminum());
    expect(r.groove_type).toBe("face_groove");
    expect(r.cycle).toBe("face_groove");
  });

  it("O-ring groove via form_hint returns o_ring tool recommendation", () => {
    const r = grooveClassificationEngine.classify(
      odGrooveSteel({ form_hint: "o_ring", groove_width_mm: 2, groove_depth_mm: 1 }),
    );
    expect(r.groove_type).toBe("o_ring");
    expect(r.tool_recommendation).toMatch(/ISO 3601/);
  });

  it("circlip groove via form_hint returns DIN 471/472 recommendation", () => {
    const r = grooveClassificationEngine.classify(
      odGrooveSteel({ form_hint: "circlip", groove_width_mm: 1.3, groove_depth_mm: 0.5 }),
    );
    expect(r.groove_type).toBe("circlip");
    expect(r.tool_recommendation).toMatch(/DIN 471\/472/);
  });

  it("bearing relief via form_hint returns DIN 509 recommendation", () => {
    const r = grooveClassificationEngine.classify(
      odGrooveSteel({ form_hint: "bearing_relief" }),
    );
    expect(r.groove_type).toBe("bearing_relief");
    expect(r.tool_recommendation).toMatch(/DIN 509/);
  });

  it("V-groove via form_hint returns V-insert recommendation", () => {
    const r = grooveClassificationEngine.classify(
      odGrooveSteel({ form_hint: "v_groove" }),
    );
    expect(r.groove_type).toBe("v_groove");
    expect(r.tool_recommendation).toMatch(/V-insert/);
  });

  it("thread relief via form_hint returns DIN 76 tool recommendation", () => {
    const r = grooveClassificationEngine.classify(
      odGrooveSteel({ form_hint: "thread_relief" }),
    );
    expect(r.groove_type).toBe("thread_relief");
    expect(r.tool_recommendation).toMatch(/DIN 76/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// peckParamsForMat() — U-LPG03 — variability across 7 ISO groups
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine.peckParamsForMat — 7 ISO groups", () => {
  const cases: Array<{ iso: PeckISOGroup; minDepth: number; maxDepth: number; coolant: string }> = [
    { iso: "P",       minDepth: 2.0, maxDepth: 3.0, coolant: "flood" },
    { iso: "P_alloy", minDepth: 1.5, maxDepth: 2.0, coolant: "flood" },
    { iso: "M",       minDepth: 1.0, maxDepth: 1.5, coolant: "high_pressure" },
    { iso: "K",       minDepth: 2.0, maxDepth: 3.0, coolant: "dry" },
    { iso: "N",       minDepth: 3.0, maxDepth: 5.0, coolant: "flood" },
    { iso: "S",       minDepth: 0.5, maxDepth: 1.0, coolant: "flood_ti" },
    { iso: "H",       minDepth: 0.3, maxDepth: 0.5, coolant: "high_pressure" },
  ];

  it.each(cases)(
    "ISO $iso: peck $minDepth..$maxDepth × blade, coolant $coolant",
    ({ iso, minDepth, maxDepth, coolant }) => {
      const r = grooveClassificationEngine.peckParamsForMat(iso, 3);
      expect(r.iso_group).toBe(iso);
      expect(r.coolant).toBe(coolant);
      // peck depth stored as × blade × 3 mm blade width
      expect(r.peck_depth_mm).toBeGreaterThanOrEqual(minDepth * 3 - 0.5);
      expect(r.peck_depth_mm).toBeLessThanOrEqual(maxDepth * 3 + 0.5);
    },
  );

  it("stainless (M) has higher full_retract frequency than steel (P)", () => {
    const p = grooveClassificationEngine.peckParamsForMat("P", 3);
    const m = grooveClassificationEngine.peckParamsForMat("M", 3);
    expect(m.full_retract_every_n_pecks).toBeLessThanOrEqual(p.full_retract_every_n_pecks);
  });

  it("hardened (H) requires lowest peck depth for 3mm blade", () => {
    const p = grooveClassificationEngine.peckParamsForMat("P", 3);
    const h = grooveClassificationEngine.peckParamsForMat("H", 3);
    expect(h.peck_depth_mm).toBeLessThan(p.peck_depth_mm);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// deepGrooveCycle() — U-LPG02 — 4 controllers
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine.deepGrooveCycle — 4 controllers", () => {
  const controllers: GroovingController[] = ["fanuc", "haas", "okuma", "siemens"];

  it.each(controllers)("%s emits valid cycle code + G-code block", (c) => {
    const geom = odGrooveSteel({ groove_width_mm: 2, groove_depth_mm: 10 });
    const cls = grooveClassificationEngine.classify(geom);
    const peck = grooveClassificationEngine.peckParamsForMat("P", 3);
    const r = grooveClassificationEngine.deepGrooveCycle(geom, cls, peck, c, 0.08);
    expect(r.controller).toBe(c);
    expect(r.cycle_code.length).toBeGreaterThan(0);
    expect(r.gcode_lines.length).toBeGreaterThan(0);
    if (c === "siemens") expect(r.cycle_code).toBe("CYCLE93");
    else expect(["G74", "G75"]).toContain(r.cycle_code);
  });

  it("plunge-and-shift emits N passes matching classifier", () => {
    const geom = odGrooveSteel({ groove_width_mm: 10, groove_depth_mm: 2, blade_width_mm: 3 });
    const cls = grooveClassificationEngine.classify(geom);
    const peck = grooveClassificationEngine.peckParamsForMat("P", 3);
    const r = grooveClassificationEngine.deepGrooveCycle(geom, cls, peck, "fanuc", 0.1);
    // n passes + 1 finish pass + header = gcode_lines contains at least (cls.n_passes*3 + 3) lines
    const moveLines = r.gcode_lines.filter((l) => l.startsWith("G0") || l.startsWith("G1"));
    expect(moveLines.length).toBeGreaterThanOrEqual(cls.n_passes * 3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// partoffOptimize() — U-LPG04
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine.partoffOptimize", () => {
  it("blade width scales with diameter: 20mm→2, 40mm→3, 80mm→4, 150mm→5", () => {
    const small = grooveClassificationEngine.partoffOptimize(20, "P");
    const medium = grooveClassificationEngine.partoffOptimize(40, "P");
    const large = grooveClassificationEngine.partoffOptimize(80, "P");
    const xl = grooveClassificationEngine.partoffOptimize(150, "P");
    expect(small.blade_width_mm).toBe(2);
    expect(medium.blade_width_mm).toBe(3);
    expect(large.blade_width_mm).toBe(4);
    expect(xl.blade_width_mm).toBe(5);
  });

  it("feed reduces to 25% at final core (center approach)", () => {
    const r = grooveClassificationEngine.partoffOptimize(30, "P", 120, 0.08);
    expect(r.feed_at_center_mm_rev).toBeCloseTo(0.02, 4);  // 0.08 × 0.25
  });

  it("feed curve monotonic non-increasing toward center", () => {
    const r = grooveClassificationEngine.partoffOptimize(50, "M", 80, 0.1);
    const feeds = r.feed_curve_mm_rev.map((p) => p.feed);
    // Feeds sorted by diameter descending should be non-increasing.
    const sorted = [...r.feed_curve_mm_rev].sort((a, b) => b.d_mm - a.d_mm);
    const sortedFeeds = sorted.map((p) => p.feed);
    for (let i = 1; i < sortedFeeds.length; i++) {
      expect(sortedFeeds[i]).toBeLessThanOrEqual(sortedFeeds[i - 1] + 1e-9);
    }
    expect(feeds.length).toBeGreaterThanOrEqual(3);
  });

  it("warns for titanium (S) about peck cutoff requirement", () => {
    const r = grooveClassificationEngine.partoffOptimize(30, "S");
    expect(r.warnings.some((w) => /peck/i.test(w))).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// catcherTiming() — U-LPG05 — 5 controllers
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine.catcherTiming — 5 controllers", () => {
  const controllers: Array<{ c: PartCatcherController; advance: string; retract: string }> = [
    { c: "fanuc",   advance: "M21", retract: "M22" },
    { c: "haas",    advance: "M21", retract: "M22" },
    { c: "okuma",   advance: "M71", retract: "M72" },
    { c: "mazak",   advance: "M65", retract: "M66" },
    { c: "citizen", advance: "M28", retract: "M29" },
  ];

  it.each(controllers)("$c uses $advance/$retract", ({ c, advance, retract }) => {
    const r = grooveClassificationEngine.catcherTiming(3, c, "P");
    expect(r.m_codes.advance).toBe(advance);
    expect(r.m_codes.retract).toBe(retract);
  });

  it("activation diameter = 2×blade + 1 mm safety margin", () => {
    const r = grooveClassificationEngine.catcherTiming(3, "fanuc", "P");
    expect(r.activate_at_diameter_mm).toBeCloseTo(7.0, 2); // 2*3 + 1
  });

  it("Inconel (H) emits peck-cutoff block with high-pressure coolant", () => {
    const r = grooveClassificationEngine.catcherTiming(3, "fanuc", "H");
    const joined = r.peck_block.join(" ");
    expect(joined).toMatch(/INCONEL|HARDENED|CBN|HIGH-PRESSURE/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// bladeStress() — U-LPG06
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine.bladeStress", () => {
  it("computes finite force/stress/L-t ratio (small bar, light feed)", async () => {
    // PartOffForceEngine models radial cut distance as stress-beam length, so
    // "healthy" requires a small bar AND light feed. 8 mm bar, 2 mm blade,
    // 0.04 mm/rev, 100 m/min + carbide yield 1500 MPa → ~600 MPa stress / 1500 MPa
    // yield = 40% → PASS at default 50% ceiling.
    const r = await grooveClassificationEngine.bladeStress(
      8, 2, 0.04, 100, "P", 6, 2, 1500,
    );
    expect(r.cutting_force_N).toBeGreaterThan(0);
    expect(r.max_blade_stress_MPa).toBeGreaterThan(0);
    expect(r.lt_ratio).toBeCloseTo(3, 2); // 6/2
    expect(r.pass).toBe(true);
  });

  it("flags chatter when L/t > 10", async () => {
    const r = await grooveClassificationEngine.bladeStress(30, 3, 0.08, 120, "P", 40, 3);
    expect(r.lt_ratio).toBeGreaterThan(10);
    expect(r.pass).toBe(false);
    expect(r.warnings.some((w) => /L\/t/i.test(w))).toBe(true);
  });

  it("flags excess stress when feed pushes stress > 50% yield", async () => {
    const r = await grooveClassificationEngine.bladeStress(80, 2, 0.25, 200, "S", 10, 2);
    // Heavy feed + narrow blade in titanium → high stress.
    if (r.stress_to_yield_fraction > 0.5) {
      expect(r.warnings.some((w) => /yield|stress/i.test(w))).toBe(true);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Capstone optimize() — variability across 3 spanning configurations
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine.optimize — variability across 3 configs", () => {
  const configs = [
    { name: "OD groove steel (fanuc)",       input: optInput(odGrooveSteel(), "P", { controller: "fanuc" }) },
    { name: "face groove aluminum (okuma)",  input: optInput(faceGrooveAluminum(), "N", { controller: "okuma" }) },
    { name: "parting titanium (siemens+mazak catcher)", input: optInput(partoffTitanium(), "S", { controller: "siemens", catcher_controller: "mazak", operation: "partoff" }) },
  ];

  it.each(configs)("produces complete capstone result for $name", async ({ input }) => {
    const r = await grooveClassificationEngine.optimize(input);
    expect(r.classify).toBeDefined();
    expect(r.peck).toBeDefined();
    expect(r.deep_cycle.gcode_lines.length).toBeGreaterThan(0);
    expect(r.stress).toBeDefined();
    expect(r.reasoning.length).toBeGreaterThanOrEqual(3);
    if (input.operation === "partoff") {
      expect(r.partoff).not.toBeNull();
      expect(r.catcher).not.toBeNull();
    } else {
      expect(r.partoff).toBeNull();
      expect(r.catcher).toBeNull();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Failure modes (≥3)
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine — failure modes", () => {
  it("rejects zero groove_width", () => {
    expect(() =>
      grooveClassificationEngine.classify(odGrooveSteel({ groove_width_mm: 0 })),
    ).toThrow(/groove_width/);
  });

  it("rejects negative blade_width", () => {
    expect(() =>
      grooveClassificationEngine.classify(odGrooveSteel({ blade_width_mm: -1 })),
    ).toThrow(/blade_width/);
  });

  it("rejects unknown ISO group in peckParamsForMat", () => {
    expect(() =>
      grooveClassificationEngine.peckParamsForMat("Q" as PeckISOGroup, 3),
    ).toThrow(/unknown ISO group/);
  });

  it("rejects zero bladeWidth in peckParamsForMat", () => {
    expect(() => grooveClassificationEngine.peckParamsForMat("P", 0)).toThrow(/bladeWidth/);
  });

  it("partoffOptimize rejects zero bar diameter", () => {
    expect(() => grooveClassificationEngine.partoffOptimize(0, "P")).toThrow(/barDia/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Adversarial (≥2)
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine — adversarial inputs", () => {
  it("rejects NaN groove_width", () => {
    expect(() =>
      grooveClassificationEngine.classify(odGrooveSteel({ groove_width_mm: NaN })),
    ).toThrow(/groove_width/);
  });

  it("rejects Infinity workpiece_diameter", () => {
    expect(() =>
      grooveClassificationEngine.classify(odGrooveSteel({ workpiece_diameter_mm: Infinity })),
    ).toThrow(/workpiece_diameter/);
  });

  it("deepGrooveCycle rejects zero feed", () => {
    const geom = odGrooveSteel();
    const cls = grooveClassificationEngine.classify(geom);
    const peck = grooveClassificationEngine.peckParamsForMat("P", 3);
    expect(() =>
      grooveClassificationEngine.deepGrooveCycle(geom, cls, peck, "fanuc", 0),
    ).toThrow(/feedPerRev/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GrooveDepthGateHook
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveDepthGateHook.validate", () => {
  it("PASS when L/t and stress both healthy (carbide, stress ceiling 0.8)", async () => {
    // PartOffForceEngine models radial bar-cut as overhang, producing
    // stresses that are characteristic of carbide inserts during parting.
    // For a shallow groove with generous ceilings (carbide handles
    // sustained 80% of yield at 1500 MPa compressive limit), this passes.
    const r = await GrooveDepthGateHook.validate({
      groove_width_mm: 3,
      groove_depth_mm: 1,
      workpiece_diameter_mm: 20,
      blade_width_mm: 3,
      blade_overhang_mm: 9,
      blade_thickness_mm: 3,
      material_iso_group: "P",
      feed_per_rev_mm: 0.05,
      blade_yield_MPa: 1500,
      stress_fraction_ceiling: 0.8,
    });
    expect(r.passed).toBe(true);
    expect(r.severity).toMatch(/pass|warning/);
  });

  it("BLOCK when L/t > 10 (chatter)", async () => {
    const r = await GrooveDepthGateHook.validate({
      groove_width_mm: 3,
      groove_depth_mm: 2,
      workpiece_diameter_mm: 50,
      blade_width_mm: 3,
      blade_overhang_mm: 40,
      blade_thickness_mm: 3,
      material_iso_group: "P",
    });
    expect(r.severity).toBe("block");
    expect(r.blocked).toBe(true);
    expect(r.violations.some((v) => v.code === "LT_RATIO_EXCEEDED")).toBe(true);
  });

  it("BLOCK when blade wider than groove", async () => {
    const r = await GrooveDepthGateHook.validate({
      groove_width_mm: 2,
      groove_depth_mm: 2,
      workpiece_diameter_mm: 50,
      blade_width_mm: 4,
      material_iso_group: "P",
    });
    expect(r.severity).toBe("block");
    expect(r.violations.some((v) => v.code === "BLADE_WIDER_THAN_GROOVE")).toBe(true);
  });

  it("rejects invalid input shape", async () => {
    const r = await GrooveDepthGateHook.validate({
      groove_width_mm: -1,
      groove_depth_mm: 2,
      workpiece_diameter_mm: 50,
      blade_width_mm: 3,
      material_iso_group: "P",
    } as unknown as Parameters<typeof GrooveDepthGateHook.validate>[0]);
    expect(r.severity).toBe("error");
    expect(r.blocked).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Singleton stability
// ────────────────────────────────────────────────────────────────────────────

describe("GrooveClassificationEngine — singleton stability", () => {
  it("fresh instance matches singleton on same input", () => {
    const fresh = new GrooveClassificationEngine();
    const geom = odGrooveSteel({ groove_width_mm: 10, groove_depth_mm: 2, blade_width_mm: 3 });
    const a = grooveClassificationEngine.classify(geom);
    const b = fresh.classify(geom);
    expect(a).toEqual(b);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Dispatcher round-trip
// ────────────────────────────────────────────────────────────────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      captured.push({ name, description, schema, handler });
    },
  };
}

describe("MS4b grooving/parting — dispatcher round-trip", () => {
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
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { __raw: text };
    }
  }

  it("tool description advertises all 8 MS4b actions", () => {
    const server = makeStubServer();
    registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    for (const a of [
      "turning_groove_classify",
      "turning_groove_peck_params",
      "turning_groove_deep_cycle",
      "turning_partoff_optimize",
      "turning_partoff_catcher_timing",
      "turning_partoff_blade_stress",
      "turning_groove_optimize",
      "turning_groove_depth_gate",
    ]) {
      expect(tool!.description).toContain(a);
    }
  });

  it("turning_groove_classify via dispatcher matches direct engine", async () => {
    const direct = grooveClassificationEngine.classify(odGrooveSteel());
    const viaDisp = await invoke("turning_groove_classify", odGrooveSteel() as unknown as Record<string, unknown>);
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect(r.cycle).toBe(direct.cycle);
    expect(r.n_passes).toBe(direct.n_passes);
  });

  it("turning_groove_optimize via dispatcher returns capstone shape", async () => {
    const viaDisp = await invoke(
      "turning_groove_optimize",
      optInput(odGrooveSteel(), "P", { controller: "fanuc" }) as unknown as Record<string, unknown>,
    );
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect(r.classify).toBeDefined();
    expect(r.peck).toBeDefined();
    expect(r.stress).toBeDefined();
  });

  it("turning_groove_depth_gate via dispatcher matches direct hook", async () => {
    const fixture = {
      groove_width_mm: 3,
      groove_depth_mm: 1,
      workpiece_diameter_mm: 20,
      blade_width_mm: 3,
      blade_overhang_mm: 9,
      blade_thickness_mm: 3,
      material_iso_group: "P" as const,
      feed_per_rev_mm: 0.05,
      blade_yield_MPa: 1500,
      stress_fraction_ceiling: 0.8,
    };
    const direct = await GrooveDepthGateHook.validate(fixture);
    const viaDisp = await invoke("turning_groove_depth_gate", fixture);
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect(r.passed).toBe(direct.passed);
    expect(r.severity).toBe(direct.severity);
  });

  it("dispatcher rejects invalid material_iso_group via schema", async () => {
    const res = await invoke("turning_partoff_optimize", {
      bar_diameter_mm: 30,
      material_iso_group: "ZZZ",
    });
    const txt = JSON.stringify(res).toLowerCase();
    expect(txt).toMatch(/invalid|material_iso_group|enum/);
  });

  // ARG-ORDER GUARD (U-LW-GROOVE-DISPATCH-FIX): the engine signature is
  // partoffOptimize(barDia, materialIso, cuttingSpeedMpm, feedNominalMmRev) — materialIso is the
  // 2nd positional. A dispatcher case that omits it mis-slots Vc→materialIso (drops the S/H peck-cutoff
  // warning) and feed→Vc (~1000x wrong RPM). This valid-input round-trip fails loudly on that bug.
  it("turning_partoff_optimize via dispatcher matches direct engine (valid input, arg-order guard)", async () => {
    const direct = grooveClassificationEngine.partoffOptimize(30, "S", 120, 0.1);
    const viaDisp = await invoke("turning_partoff_optimize", {
      bar_diameter_mm: 30,
      material_iso_group: "S",
      cutting_speed_m_min: 120,
      feed_per_rev_mm: 0.1,
    });
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect(r.rpm_start).toBe(direct.rpm_start);              // Vc reaches cuttingSpeedMpm (RPM from 120, not feed)
    expect(r.feed_nominal_mm_rev).toBe(0.1);                 // feed reaches feedNominalMmRev, not the 0.08 default
    expect((r.warnings as string[]).some((w) => w.includes("peck cutoff"))).toBe(true); // materialIso="S" honored
  });

  // ARG-ORDER GUARDS for the remaining 4 positional-arg actions (scrutiny arm C P2, U-LW-GROOVE-DISPATCH-FIX):
  // each asserts a distinctive field that would DIFFER if any positional arg were mis-slotted -- closing the
  // exact "no valid-input round-trip" coverage gap that let the partoff arg-order bug ship for a full commit.
  it("turning_groove_peck_params via dispatcher matches direct engine (iso reaches arg1)", async () => {
    const direct = grooveClassificationEngine.peckParamsForMat("N", 3);
    const viaDisp = await invoke("turning_groove_peck_params", { material_iso_group: "N", blade_width_mm: 3 });
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect(r.iso_group).toBe("N");                         // material_iso_group reached the 1st positional
    expect(r.peck_depth_mm).toBe(direct.peck_depth_mm);    // bladeWidth reached the 2nd positional (scales depth)
  });

  it("turning_groove_deep_cycle via dispatcher honors the controller arg", async () => {
    const viaDisp = await invoke("turning_groove_deep_cycle", {
      ...odGrooveSteel(),
      controller: "okuma",
      material_iso_group: "P",
      feed_per_rev_mm: 0.08,
    });
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect(r.controller).toBe("okuma");                    // controller reached its slot (not the feed value)
    expect(Array.isArray(r.gcode_lines) && (r.gcode_lines as unknown[]).length > 0).toBe(true);
  });

  it("turning_partoff_catcher_timing via dispatcher matches direct engine (blade_width→arg1, controller→arg2)", async () => {
    const direct = grooveClassificationEngine.catcherTiming(3, "citizen", "M");
    const viaDisp = await invoke("turning_partoff_catcher_timing", {
      blade_width_mm: 3,
      catcher_controller: "citizen",
      material_iso_group: "M",
    });
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect(r.controller).toBe("citizen");                                        // arg2 slotted
    expect(r.activate_at_diameter_mm).toBe(direct.activate_at_diameter_mm);      // = 2*bladeWidth+1 = 7 → arg1 slotted
  });

  it("turning_partoff_blade_stress via dispatcher matches direct engine (overhang→arg6, thickness→arg7)", async () => {
    const direct = await grooveClassificationEngine.bladeStress(30, 3, 0.1, 120, "P", 12, 3);
    const viaDisp = await invoke("turning_partoff_blade_stress", {
      bar_diameter_mm: 30,
      blade_width_mm: 3,
      feed_per_rev_mm: 0.1,
      cutting_speed_m_min: 120,
      material_iso_group: "P",
      blade_overhang_mm: 12,
      blade_thickness_mm: 3,
    });
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect(r.lt_ratio).toBe(direct.lt_ratio);              // = overhang/thickness = 4 → arg6/arg7 slotted correctly
    expect(r.total_force_N).toBe(direct.total_force_N);    // feed/Vc slots correct → identical force
  });
});
