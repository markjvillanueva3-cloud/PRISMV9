/**
 * Tests for CrossProcessSpeedFeedBridge
 * @see src/engines/CrossProcessSpeedFeedBridge.ts
 * @see U-XPROC-SFC-01 (cross-process speed/feed router for mill, lathe, wedm)
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessSpeedFeedBridge,
  SUPPORTED_PROCESSES,
  type CrossProcessSFRequest,
  type ProcessId,
} from "../engines/CrossProcessSpeedFeedBridge.js";

// ============================================================================
// SECTION 1 — listProcessSupport(): capability matrix
// ============================================================================

describe("CrossProcessSpeedFeedBridge.listProcessSupport()", () => {
  it("declares mill / lathe / wedm in canonical order", () => {
    const out = CrossProcessSpeedFeedBridge.listProcessSupport();
    expect(out.map((c) => c.process)).toEqual(["mill", "lathe", "wedm"]);
  });

  it("each process maps to a real source engine + non-empty primary_outputs", () => {
    const out = CrossProcessSpeedFeedBridge.listProcessSupport();
    for (const cap of out) {
      expect(cap.supported).toBe(true);
      expect(cap.source_engine.length).toBeGreaterThan(0);
      expect(cap.primary_outputs.length).toBeGreaterThan(0);
    }
  });

  it("mill capability surfaces rotational outputs (rpm + feed_per_tooth)", () => {
    const out = CrossProcessSpeedFeedBridge.listProcessSupport();
    const mill = out.find((c) => c.process === "mill");
    expect(mill?.primary_outputs).toContain("spindle_rpm");
    expect(mill?.primary_outputs).toContain("feed_per_tooth_mm");
  });

  it("wedm capability surfaces pulse/current outputs (not rpm)", () => {
    const out = CrossProcessSpeedFeedBridge.listProcessSupport();
    const wedm = out.find((c) => c.process === "wedm");
    expect(wedm?.primary_outputs).toContain("pulse_on_us");
    expect(wedm?.primary_outputs).toContain("current_A");
    expect(wedm?.primary_outputs).not.toContain("spindle_rpm");
  });
});

// ============================================================================
// SECTION 2 — recommend(): mill path
// ============================================================================

describe("CrossProcessSpeedFeedBridge.recommend() — mill path", () => {
  it("computes carbide roughing recommendation for steel", async () => {
    const out = await CrossProcessSpeedFeedBridge.recommend({
      process: "mill",
      material: "steel_4140",
      tool_material: "Carbide",
      mill_operation: "roughing",
      tool_diameter_mm: 12,
      number_of_teeth: 4,
      material_hardness_hb: 220,
    });
    expect(out.process).toBe("mill");
    expect(out.source_engine).toBe("ManufacturingCalculations.calculateSpeedFeed");
    expect(out.axial_depth_mm).toBeGreaterThan(0);
    expect(out.spindle_rpm).toBeGreaterThan(0);
    expect(out.feed_per_tooth_mm).toBeGreaterThan(0);
    expect(out.feed_rate_mm_min).toBeGreaterThan(0);
    // Carbide cutting speed at 220 HB ≈ 150 × (200/220)^0.3 × 0.8 (roughing) ≈ 117 m/min
    expect(out.cutting_speed_m_min).toBeGreaterThan(80);
    expect(out.cutting_speed_m_min).toBeLessThan(200);
  });

  it("HSS produces lower cutting speed than Carbide for the same op", async () => {
    const [hss, carbide] = await Promise.all([
      CrossProcessSpeedFeedBridge.recommend({
        process: "mill",
        material: "steel",
        tool_material: "HSS",
        mill_operation: "finishing",
        tool_diameter_mm: 8,
        number_of_teeth: 2,
      }),
      CrossProcessSpeedFeedBridge.recommend({
        process: "mill",
        material: "steel",
        tool_material: "Carbide",
        mill_operation: "finishing",
        tool_diameter_mm: 8,
        number_of_teeth: 2,
      }),
    ]);
    // Base speeds: HSS=30 m/min, Carbide=150 m/min — Carbide is 5x faster
    expect(hss.cutting_speed_m_min).toBeLessThan(carbide.cutting_speed_m_min ?? 0);
    expect((carbide.cutting_speed_m_min ?? 0) / (hss.cutting_speed_m_min ?? 1)).toBeGreaterThan(3);
  });

  it("Diamond returns the highest cutting speed of the 5 tool materials (base 500 m/min)", async () => {
    const tools = ["HSS", "Carbide", "Ceramic", "CBN", "Diamond"] as const;
    const results = await Promise.all(
      tools.map((tm) =>
        CrossProcessSpeedFeedBridge.recommend({
          process: "mill",
          material: "aluminum",
          tool_material: tm,
          tool_diameter_mm: 10,
          number_of_teeth: 3,
        }),
      ),
    );
    const speeds: Record<string, number> = {};
    tools.forEach((tm, i) => (speeds[tm] = results[i].cutting_speed_m_min ?? 0));
    const max = Math.max(...Object.values(speeds));
    expect(speeds["Diamond"]).toBe(max);
    // Diamond base 500 vs HSS base 30 — at least 10x ratio
    expect(speeds["Diamond"] / speeds["HSS"]).toBeGreaterThan(10);
  });

  it("computed feed_rate_mm_min equals feed_per_tooth × teeth × spindle_rpm (no drift)", async () => {
    const out = await CrossProcessSpeedFeedBridge.recommend({
      process: "mill",
      material: "steel",
      tool_material: "Carbide",
      mill_operation: "semi-finishing",
      tool_diameter_mm: 10,
      number_of_teeth: 4,
    });
    const expected = (out.feed_per_tooth_mm ?? 0) * 4 * (out.spindle_rpm ?? 0);
    // Underlying engine rounds to integer mm/min — allow ±2 mm/min slop
    expect(Math.abs((out.feed_rate_mm_min ?? 0) - expected)).toBeLessThan(2);
  });

  it("throws when tool_material is missing", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "mill",
        material: "steel",
        tool_diameter_mm: 12,
        number_of_teeth: 4,
      } as CrossProcessSFRequest),
    ).rejects.toThrow(/tool_material/);
  });

  it("throws when tool_diameter_mm is zero or negative", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "mill",
        material: "steel",
        tool_material: "Carbide",
        tool_diameter_mm: 0,
        number_of_teeth: 4,
      }),
    ).rejects.toThrow(/positive tool_diameter_mm/);
  });

  it("throws when number_of_teeth is missing", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "mill",
        material: "steel",
        tool_material: "Carbide",
        tool_diameter_mm: 10,
      } as CrossProcessSFRequest),
    ).rejects.toThrow(/number_of_teeth/);
  });
});

// ============================================================================
// SECTION 3 — recommend(): lathe path
// ============================================================================

describe("CrossProcessSpeedFeedBridge.recommend() — lathe path", () => {
  it("computes turning_insert finishing recommendation for 4140 steel", async () => {
    const out = await CrossProcessSpeedFeedBridge.recommend({
      process: "lathe",
      material: "4140",
      iso_group: "P",
      lathe_tool_type: "turning_insert",
      lathe_operation: "finishing",
      tool_diameter_mm: 50,
      depth_of_cut_mm: 0.3,
    });
    expect(out.process).toBe("lathe");
    expect(out.source_engine).toBe("LatheSpeedFeedCalculatorFacadeEngine.calculate");
    // 4140 steel finishing turning insert: Vc typically 150-300 m/min for carbide
    expect(out.cutting_speed_m_min).toBeGreaterThan(50);
    expect(out.cutting_speed_m_min).toBeLessThan(500);
    // RPM at 50mm dia and 200 m/min ≈ 1273
    expect(out.spindle_rpm).toBeGreaterThan(100);
    expect(out.spindle_rpm).toBeLessThan(5000);
    expect(out.feed_per_rev_mm).toBeGreaterThan(0);
  });

  it("computes feed_rate_mm_min as feed_per_rev × rpm (no drift)", async () => {
    const out = await CrossProcessSpeedFeedBridge.recommend({
      process: "lathe",
      material: "aluminum",
      iso_group: "N",
      lathe_tool_type: "turning_insert",
      lathe_operation: "roughing",
      tool_diameter_mm: 25,
      depth_of_cut_mm: 2,
    });
    const fpr = out.feed_per_rev_mm ?? 0;
    const rpm = out.spindle_rpm ?? 0;
    const expected = Math.round(fpr * rpm * 100) / 100;
    expect(out.feed_rate_mm_min).toBe(expected);
  });

  it("throws when lathe_tool_type is missing", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "lathe",
        material: "4140",
        lathe_operation: "finishing",
      } as CrossProcessSFRequest),
    ).rejects.toThrow(/lathe_tool_type/);
  });

  it("throws when lathe_operation is unsupported", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "lathe",
        material: "4140",
        lathe_tool_type: "turning_insert",
        lathe_operation: "until_lunch" as never,
      }),
    ).rejects.toThrow(/lathe_operation/);
  });
});

// ============================================================================
// SECTION 4 — recommend(): wedm path
// ============================================================================

describe("CrossProcessSpeedFeedBridge.recommend() — wedm path", () => {
  it("recommends thin-band steel parameters at thickness=4mm (exact table values)", async () => {
    const out = await CrossProcessSpeedFeedBridge.recommend({
      process: "wedm",
      material: "steel",
      workpiece_thickness_mm: 4,
    });
    expect(out.process).toBe("wedm");
    // Thin-band steel default: pulse_on=2, pulse_off=10, current=8A, voltage=60V
    expect(out.pulse_on_us).toBe(2);
    expect(out.pulse_off_us).toBe(10);
    expect(out.current_A).toBe(8);
    expect(out.voltage_V).toBe(60);
    expect(out.wire_tension_N).toBe(12);
    // Duty cycle = 2 / (2 + 10) = 0.166...
    expect(out.duty_cycle).toBeCloseTo(0.17, 1);
    // Predicted MRR + Ra are derived from spark erosion physics — must be positive
    expect(out.predicted_mrr_mm3_min).toBeGreaterThan(0);
    expect(out.predicted_ra_um).toBeGreaterThan(0);
  });

  it("recommends medium-band defaults at thickness=15mm", async () => {
    const out = await CrossProcessSpeedFeedBridge.recommend({
      process: "wedm",
      material: "steel",
      workpiece_thickness_mm: 15,
    });
    expect(out.pulse_on_us).toBe(4);
    expect(out.pulse_off_us).toBe(15);
    expect(out.current_A).toBe(12);
  });

  it("recommends thick-band defaults at thickness=50mm", async () => {
    const out = await CrossProcessSpeedFeedBridge.recommend({
      process: "wedm",
      material: "steel",
      workpiece_thickness_mm: 50,
    });
    expect(out.pulse_on_us).toBe(8);
    expect(out.pulse_off_us).toBe(20);
    expect(out.current_A).toBe(18);
    expect(out.voltage_V).toBe(70);
  });

  it("scales current+pulse_on by quality_intent (finishing intent → less current)", async () => {
    const [balanced, finishing] = await Promise.all([
      CrossProcessSpeedFeedBridge.recommend({
        process: "wedm",
        material: "steel",
        workpiece_thickness_mm: 15,
        wedm_quality_intent: 1.0,
      }),
      CrossProcessSpeedFeedBridge.recommend({
        process: "wedm",
        material: "steel",
        workpiece_thickness_mm: 15,
        wedm_quality_intent: 0.5,
      }),
    ]);
    // 0.5 quality_intent halves current (12 → 6) and doubles pulse_off (15 → 30)
    expect(finishing.current_A).toBe(6);
    expect(finishing.pulse_off_us).toBe(30);
    expect(balanced.current_A).toBe(12);
  });

  it("supports all 4 documented WEDM materials with positive current", async () => {
    const mats = ["steel", "aluminum", "titanium", "carbide"];
    const results = await Promise.all(
      mats.map((mat) =>
        CrossProcessSpeedFeedBridge.recommend({
          process: "wedm",
          material: mat,
          workpiece_thickness_mm: 10,
        }),
      ),
    );
    results.forEach((r) => expect(r.current_A ?? 0).toBeGreaterThan(0));
  });

  it("throws on unknown wedm material", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "wedm",
        material: "unobtainium",
        workpiece_thickness_mm: 10,
      }),
    ).rejects.toThrow(/wedm material "unobtainium" not in default table/);
  });

  it("throws on missing workpiece_thickness_mm", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "wedm",
        material: "steel",
      }),
    ).rejects.toThrow(/positive workpiece_thickness_mm/);
  });

  it("throws on unsupported wire_diameter_mm", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "wedm",
        material: "steel",
        workpiece_thickness_mm: 10,
        wire_diameter_mm: 0.07,
      }),
    ).rejects.toThrow(/wire_diameter_mm=0\.07 not supported/);
  });

  it("throws on quality_intent zero or negative", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "wedm",
        material: "steel",
        workpiece_thickness_mm: 10,
        wedm_quality_intent: 0,
      }),
    ).rejects.toThrow(/wedm_quality_intent must be a finite number/);
  });

  it("throws on quality_intent above 2", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "wedm",
        material: "steel",
        workpiece_thickness_mm: 10,
        wedm_quality_intent: 3,
      }),
    ).rejects.toThrow(/wedm_quality_intent must be a finite number/);
  });

  it("titanium current is lower than steel current at same thickness (titanium harder to spark-erode)", async () => {
    const [steel, ti] = await Promise.all([
      CrossProcessSpeedFeedBridge.recommend({
        process: "wedm",
        material: "steel",
        workpiece_thickness_mm: 15,
      }),
      CrossProcessSpeedFeedBridge.recommend({
        process: "wedm",
        material: "titanium",
        workpiece_thickness_mm: 15,
      }),
    ]);
    // steel medium=12A, titanium medium=8.4A
    expect(ti.current_A).toBe(8.4);
    expect(steel.current_A).toBe(12);
    expect(ti.current_A).toBeLessThan(steel.current_A);
  });

  it("carbide pulse_on is the lowest of the 4 materials (high-melting hardness)", async () => {
    const mats = ["steel", "aluminum", "titanium", "carbide"];
    const results = await Promise.all(
      mats.map((mat) =>
        CrossProcessSpeedFeedBridge.recommend({
          process: "wedm",
          material: mat,
          workpiece_thickness_mm: 15,
        }),
      ),
    );
    const pulses: Record<string, number> = {};
    mats.forEach((mat, i) => (pulses[mat] = results[i].pulse_on_us ?? 0));
    const min = Math.min(...Object.values(pulses));
    expect(pulses["carbide"]).toBe(min);
    // carbide medium pulse_on = 1.6 µs vs steel 4.0 — at least 2x lower
    expect(pulses["steel"] / pulses["carbide"]).toBeGreaterThan(2);
  });
});

// ============================================================================
// SECTION 5 — recommend(): cross-cutting failure modes + adversarial
// ============================================================================

describe("CrossProcessSpeedFeedBridge.recommend() — cross-cutting", () => {
  it("throws on unsupported process id", async () => {
    await expect(
      CrossProcessSpeedFeedBridge.recommend({
        process: "ultrasonic" as ProcessId,
        material: "steel",
      }),
    ).rejects.toThrow(/unsupported process/);
  });

  it("throws on missing material across all 3 processes", async () => {
    const procs: ProcessId[] = ["mill", "lathe", "wedm"];
    const failures = await Promise.all(
      procs.map(async (p) => {
        try {
          await CrossProcessSpeedFeedBridge.recommend({
            process: p,
            material: "" as string,
          } as CrossProcessSFRequest);
          return null;
        } catch (e) {
          return String(e);
        }
      }),
    );
    failures.forEach((msg) => {
      expect(msg).not.toBeNull();
      expect(msg).toContain("material required");
    });
  });

  it("returns the source engine's cutting_speed verbatim on source_result", async () => {
    const out = await CrossProcessSpeedFeedBridge.recommend({
      process: "mill",
      material: "steel",
      tool_material: "Carbide",
      tool_diameter_mm: 10,
      number_of_teeth: 3,
    });
    // source_result is the raw underlying engine output — cutting_speed
    // field exists and matches the wrapped cutting_speed_m_min value
    const raw = out.source_result as Record<string, unknown>;
    expect(raw.cutting_speed).toBe(out.cutting_speed_m_min);
    expect(raw.spindle_speed).toBe(out.spindle_rpm);
  });

  it("SUPPORTED_PROCESSES is exactly the 3 documented process ids", () => {
    expect(SUPPORTED_PROCESSES).toEqual(["mill", "lathe", "wedm"]);
  });
});
