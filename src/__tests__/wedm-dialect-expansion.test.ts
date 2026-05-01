/**
 * U-W100-34: Sodick C### + Makino HYPER-i dialect expansion tests
 * U-W100-35: AgieCharmilles ISPG + Fanuc tech register expansion tests
 *
 * Validates controller-specific technology code generation:
 * - Sodick: C{matGroup}{thickClass}{condLevel} from material+thickness
 * - Makino: HYPER-i E{matCode}{thickCode}{passCode} with HyperCut
 * - AgieCharmilles: ISPG technology codes + TAPER-EXPERT
 * - Fanuc: Technology registers + G61.1/G64 corner control
 */
import { describe, it, expect } from "vitest";

// Import the engine class to access generate methods
const ENGINE_PATH = "../engines/EDMPostProcessGCodeEngine.js";

// Helper: build standard test input
function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    controller: "sodick" as const,
    profiles: [{
      name: "TEST PROFILE",
      contour_points: [
        { x: 10, y: 0 },
        { x: 10, y: 20 },
        { x: 0, y: 20 },
        { x: 0, y: 0 },
      ],
      start_hole: { x: 5, y: -5 },
      approach: { type: "linear", length_mm: 3 },
      departure: { type: "linear", length_mm: 3 },
    }],
    passes: [
      { pass_number: 1, offset_mm: 0.15, technology_table: "101", wire_speed_m_min: 12, tension_N: 15, power_setting: 5, corner_strategy: "continuous" as const },
      { pass_number: 2, offset_mm: 0.08, technology_table: "102", wire_speed_m_min: 10, tension_N: 12, corner_strategy: "exact_stop" as const },
      { pass_number: 3, offset_mm: 0.03, technology_table: "103", wire_speed_m_min: 8, tension_N: 10, corner_strategy: "exact_stop" as const },
    ],
    wire_type: "Brass 0.25mm",
    ...overrides,
  };
}

describe("U-W100-34: Sodick C### Condition Code Generation", () => {
  let engine: { generate_sodick: (input: Record<string, unknown>) => { gcode: string; warnings: string[] } };

  it("should import EDMPostProcessGCodeEngine", async () => {
    const mod = await import(ENGINE_PATH);
    engine = new mod.EDMPostProcessGCodeEngine();
    expect(engine).toBeDefined();
    expect(typeof engine.generate_sodick).toBe("function");
  });

  it("should generate C### codes from material_group + thickness for steel", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "sodick",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_sodick(input);
    // Steel=1, 25mm→thickClass=1, passes 1,2,3 → C111, C112, C113
    expect(result.gcode).toContain("C111");
    expect(result.gcode).toContain("C112");
    expect(result.gcode).toContain("C113");
  });

  it("should generate correct material group codes", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const materials = [
      { group: "aluminum", expectedPrefix: "C2" },
      { group: "carbide", expectedPrefix: "C4" },
      { group: "titanium", expectedPrefix: "C5" },
      { group: "stainless", expectedPrefix: "C6" },
      { group: "inconel", expectedPrefix: "C7" },
    ];
    for (const { group, expectedPrefix } of materials) {
      const input = makeInput({
        controller: "sodick",
        material_group: group,
        workpiece_thickness_mm: 25,
      });
      const result = eng.generate_sodick(input);
      expect(result.gcode).toContain(expectedPrefix);
    }
  });

  it("should generate correct thickness class codes", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const cases = [
      { thickness: 5, expectedThickDigit: "0" },   // <10mm
      { thickness: 20, expectedThickDigit: "1" },   // 10-30mm
      { thickness: 45, expectedThickDigit: "2" },   // 30-60mm
      { thickness: 80, expectedThickDigit: "3" },   // 60-100mm
      { thickness: 120, expectedThickDigit: "4" },  // >100mm
    ];
    for (const { thickness, expectedThickDigit } of cases) {
      const input = makeInput({
        controller: "sodick",
        material_group: "steel",
        workpiece_thickness_mm: thickness,
      });
      const result = eng.generate_sodick(input);
      // Steel=1, rough pass=1 → C1{thick}1
      expect(result.gcode).toContain(`C1${expectedThickDigit}1`);
    }
  });

  it("should cap condition level at 4 for passes beyond 3", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "sodick",
      material_group: "steel",
      workpiece_thickness_mm: 25,
      passes: [
        { pass_number: 1, offset_mm: 0.15, technology_table: "101", wire_speed_m_min: 12, tension_N: 15 },
        { pass_number: 2, offset_mm: 0.08, technology_table: "102", wire_speed_m_min: 10, tension_N: 12 },
        { pass_number: 3, offset_mm: 0.05, technology_table: "103", wire_speed_m_min: 8, tension_N: 10 },
        { pass_number: 4, offset_mm: 0.03, technology_table: "104", wire_speed_m_min: 6, tension_N: 8 },
        { pass_number: 5, offset_mm: 0.01, technology_table: "105", wire_speed_m_min: 5, tension_N: 6 },
      ],
    });
    const result = eng.generate_sodick(input);
    // Pass 4 and 5 should both map to condition level 4 (capped)
    expect(result.gcode).toContain("C114"); // pass 4
    // Should NOT contain C115 (level capped at 4)
    expect(result.gcode).not.toContain("C115");
  });

  it("should fall back to technology_table pass-through without material_group", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({ controller: "sodick" }); // no material_group
    const result = eng.generate_sodick(input);
    // Should use C101, C102, C103 from technology_table strings
    expect(result.gcode).toContain("C101");
    expect(result.gcode).toContain("C102");
    expect(result.gcode).toContain("C103");
  });

  it("should include SF-LINER label in condition code comment", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "sodick",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_sodick(input);
    expect(result.gcode).toContain("SF-LINER");
  });

  it("should include SPW servo voltage when provided", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "sodick",
      material_group: "steel",
      workpiece_thickness_mm: 25,
      passes: [
        { pass_number: 1, offset_mm: 0.15, technology_table: "101", wire_speed_m_min: 12, tension_N: 15, servo_voltage: 50 },
      ],
    });
    const result = eng.generate_sodick(input);
    expect(result.gcode).toContain("SPW SERVO");
    expect(result.gcode).toContain("50V");
  });

  it("should use K0/K1 corner parameters (Sodick-specific)", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({ controller: "sodick", material_group: "steel", workpiece_thickness_mm: 25 });
    const result = eng.generate_sodick(input);
    expect(result.gcode).toContain("K0");
    expect(result.gcode).toContain("K1");
  });

  it("should handle D2 tool steel as steel group", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "sodick",
      material_group: "D2",
      workpiece_thickness_mm: 30,
    });
    const result = eng.generate_sodick(input);
    // D2 maps to steel group=1, 30mm→thickClass=2
    expect(result.gcode).toContain("C121");
  });
});

describe("U-W100-34: Makino HYPER-i Condition Code Generation", () => {
  it("should generate HYPER-i codes from material_group + thickness for steel", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "makino",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_makino(input);
    // Steel=A, 25mm→thick=2, passes 1,2,3(HyperCut) → EA21, EA22, EA24
    expect(result.gcode).toContain("EA21");
    expect(result.gcode).toContain("EA22");
    expect(result.gcode).toContain("EA24"); // HyperCut for last pass (3+ passes)
  });

  it("should generate correct material codes for all groups", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const materials = [
      { group: "aluminum", expectedCode: "B" },
      { group: "copper", expectedCode: "C" },
      { group: "carbide", expectedCode: "D" },
      { group: "titanium", expectedCode: "E" },
      { group: "stainless", expectedCode: "F" },
      { group: "inconel", expectedCode: "G" },
      { group: "graphite", expectedCode: "H" },
    ];
    for (const { group, expectedCode } of materials) {
      const input = makeInput({
        controller: "makino",
        material_group: group,
        workpiece_thickness_mm: 25,
      });
      const result = eng.generate_makino(input);
      // Rough pass should contain E{matCode}21
      expect(result.gcode).toContain(`E${expectedCode}21`);
    }
  });

  it("should generate correct thickness codes", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const cases = [
      { thickness: 5, expectedThick: "1" },   // <10mm
      { thickness: 20, expectedThick: "2" },   // 10-30mm
      { thickness: 45, expectedThick: "3" },   // 30-60mm
      { thickness: 80, expectedThick: "4" },   // 60-100mm
      { thickness: 120, expectedThick: "5" },  // >100mm
    ];
    for (const { thickness, expectedThick } of cases) {
      const input = makeInput({
        controller: "makino",
        material_group: "steel",
        workpiece_thickness_mm: thickness,
        passes: [{ pass_number: 1, offset_mm: 0.15, technology_table: "101", wire_speed_m_min: 12, tension_N: 15 }],
      });
      const result = eng.generate_makino(input);
      expect(result.gcode).toContain(`EA${expectedThick}1`);
    }
  });

  it("should mark last pass as HyperCut (code 4) when >= 3 passes", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "makino",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    }); // 3 passes
    const result = eng.generate_makino(input);
    expect(result.gcode).toContain("HYPERCUT ADAPTIVE POWER");
    expect(result.gcode).toContain("EA24"); // HyperCut = pass code 4
  });

  it("should NOT mark HyperCut when < 3 passes", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "makino",
      material_group: "steel",
      workpiece_thickness_mm: 25,
      passes: [
        { pass_number: 1, offset_mm: 0.15, technology_table: "101", wire_speed_m_min: 12, tension_N: 15 },
        { pass_number: 2, offset_mm: 0.08, technology_table: "102", wire_speed_m_min: 10, tension_N: 12 },
      ],
    });
    const result = eng.generate_makino(input);
    expect(result.gcode).not.toContain("HYPERCUT ADAPTIVE POWER");
    // With 2 passes: pass codes 1, 2 (no HyperCut)
    expect(result.gcode).toContain("EA21");
    expect(result.gcode).toContain("EA22");
  });

  it("should fall back to technology_table pass-through without material_group", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({ controller: "makino" }); // no material_group
    const result = eng.generate_makino(input);
    // Should use E{technology_table} directly
    expect(result.gcode).toContain("E101");
  });

  it("should include anti-electrolysis for carbide", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "makino",
      material_group: "carbide",
      workpiece_thickness_mm: 25,
      profiles: [{
        name: "carbide die",
        contour_points: [{ x: 10, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 20 }],
        start_hole: { x: 5, y: -5 },
        approach: { type: "linear", length_mm: 3 },
        departure: { type: "linear", length_mm: 3 },
      }],
      wire_type: "Zinc-coated 0.25mm",
    });
    const result = eng.generate_makino(input);
    expect(result.gcode).toContain("M80");
    expect(result.gcode).toContain("ANTI-ELECTROLYSIS");
  });

  it("should include HYPER-i label in condition comments", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "makino",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_makino(input);
    expect(result.gcode).toContain("HYPER-i");
  });

  it("should use Makino-specific config: M60/M61, G61/G64", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "makino",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_makino(input);
    expect(result.gcode).toContain("M60"); // thread
    expect(result.gcode).toContain("G61"); // corner exact
  });

  it("should use HYPER-i condition in tab cuts", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "makino",
      material_group: "steel",
      workpiece_thickness_mm: 25,
      profiles: [{
        name: "TEST WITH TABS",
        contour_points: [
          { x: 10, y: 0 },
          { x: 10, y: 20 },
          { x: 0, y: 20 },
          { x: 0, y: 0 },
        ],
        start_hole: { x: 5, y: -5 },
        approach: { type: "linear", length_mm: 3 },
        departure: { type: "linear", length_mm: 3 },
        tabs: [{ position_index: 1, width_mm: 0.5 }],
      }],
    });
    const result = eng.generate_makino(input);
    // Tab cuts should use HYPER-i condition for the last pass
    expect(result.gcode).toContain("TAB CUTS");
  });

  it("Makino controller should be listed as HYPER-i in list_controllers()", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const controllers = eng.list_controllers();
    const makino = controllers.find((c: { controller: string }) => c.controller === "makino");
    expect(makino).toBeDefined();
    expect(makino.name).toContain("HYPER-i");
  });
});

// ============================================================================
// U-W100-35: AgieCharmilles ISPG + Fanuc Tech Register Tests
// ============================================================================

describe("U-W100-35: AgieCharmilles ISPG Technology Code Generation", () => {
  it("should generate ISPG codes from material_group + thickness for steel", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "agiecharmilles",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_agiecharmilles(input);
    // Steel=S, 25mm→thick=2, rough=ISPG-S2R, skim1=IPG-S2S1, finish=IPG-S2F
    expect(result.gcode).toContain("ISPG-S2R");
    expect(result.gcode).toContain("IPG-S2S1");
    expect(result.gcode).toContain("IPG-S2F"); // fine finish for last pass (3 passes)
  });

  it("should generate correct material codes for all groups", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const materials = [
      { group: "aluminum", expectedCode: "A" },
      { group: "copper", expectedCode: "C" },
      { group: "carbide", expectedCode: "K" },
      { group: "titanium", expectedCode: "T" },
      { group: "stainless", expectedCode: "X" },
      { group: "inconel", expectedCode: "N" },
      { group: "graphite", expectedCode: "G" },
    ];
    for (const { group, expectedCode } of materials) {
      const input = makeInput({
        controller: "agiecharmilles",
        material_group: group,
        workpiece_thickness_mm: 25,
        passes: [{ pass_number: 1, offset_mm: 0.15, technology_table: "101", wire_speed_m_min: 12, tension_N: 15 }],
      });
      const result = eng.generate_agiecharmilles(input);
      // Rough pass should contain ISPG-{matCode}
      expect(result.gcode).toContain(`ISPG-${expectedCode}`);
    }
  });

  it("should use ISPG for rough and IPG for finish passes", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "agiecharmilles",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_agiecharmilles(input);
    // Pass 1 = ISPG (rough), passes 2-3 = IPG (skim/finish)
    expect(result.gcode).toContain("ISPG-");
    expect(result.gcode).toContain("IPG-");
  });

  it("should fall back to ISPG/IPG-{tech_table} without material_group", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({ controller: "agiecharmilles" }); // no material_group
    const result = eng.generate_agiecharmilles(input);
    expect(result.gcode).toContain("ISPG-101"); // rough pass tech_table
    expect(result.gcode).toContain("IPG-102"); // skim pass tech_table
  });

  it("should include ACO comment in header", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({ controller: "agiecharmilles", material_group: "steel", workpiece_thickness_mm: 25 });
    const result = eng.generate_agiecharmilles(input);
    expect(result.gcode).toContain("ACO");
  });

  it("should include TAPER-EXPERT for taper profiles", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "agiecharmilles",
      material_group: "steel",
      workpiece_thickness_mm: 25,
      profiles: [{
        name: "TAPER TEST",
        contour_points: [{ x: 10, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 20 }],
        start_hole: { x: 5, y: -5 },
        approach: { type: "linear", length_mm: 3 },
        departure: { type: "linear", length_mm: 3 },
        taper_angle_deg: 3,
      }],
    });
    const result = eng.generate_agiecharmilles(input);
    expect(result.gcode).toContain("TAPER-EXPERT");
  });

  it("should use M50/M51 for wire threading", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({ controller: "agiecharmilles", material_group: "steel", workpiece_thickness_mm: 25 });
    const result = eng.generate_agiecharmilles(input);
    expect(result.gcode).toContain("M50");
  });

  it("should warn on taper > 30 degrees", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "agiecharmilles",
      material_group: "steel",
      workpiece_thickness_mm: 25,
      profiles: [{
        name: "EXTREME TAPER",
        contour_points: [{ x: 10, y: 0 }, { x: 10, y: 20 }],
        start_hole: { x: 5, y: -5 },
        approach: { type: "linear", length_mm: 3 },
        departure: { type: "linear", length_mm: 3 },
        taper_angle_deg: 35,
      }],
    });
    const result = eng.generate_agiecharmilles(input);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("TAPER-EXPERT");
  });

  it("controller name should reflect CUT P/E Series", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const controllers = eng.list_controllers();
    const agie = controllers.find((c: { controller: string }) => c.controller === "agiecharmilles");
    expect(agie).toBeDefined();
    expect(agie.name).toContain("CUT");
  });
});

describe("U-W100-35: Fanuc Technology Register Generation", () => {
  it("should generate T-registers from material_group + thickness for steel", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "fanuc",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_fanuc(input);
    // Steel=1, 25mm→thick=1, passes 1,2,3 → T111, T112, T113
    expect(result.gcode).toContain("T111");
    expect(result.gcode).toContain("T112");
    expect(result.gcode).toContain("T113");
  });

  it("should generate correct material group numbers", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const materials = [
      { group: "aluminum", expectedPrefix: "T2" },
      { group: "carbide", expectedPrefix: "T4" },
      { group: "titanium", expectedPrefix: "T5" },
      { group: "stainless", expectedPrefix: "T6" },
      { group: "inconel", expectedPrefix: "T7" },
    ];
    for (const { group, expectedPrefix } of materials) {
      const input = makeInput({
        controller: "fanuc",
        material_group: group,
        workpiece_thickness_mm: 25,
      });
      const result = eng.generate_fanuc(input);
      expect(result.gcode).toContain(expectedPrefix);
    }
  });

  it("should fall back to E-pack when no material_group", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({ controller: "fanuc" }); // no material_group
    const result = eng.generate_fanuc(input);
    expect(result.gcode).toContain("E101");
    expect(result.gcode).toContain("E-PACK");
  });

  it("should include TECH REGISTER label when material_group provided", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "fanuc",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_fanuc(input);
    expect(result.gcode).toContain("TECH REGISTER");
  });

  it("should use G61.1 nano-interpolation for skim passes", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "fanuc",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_fanuc(input);
    expect(result.gcode).toContain("G61.1");
    expect(result.gcode).toContain("NANO-INTERPOLATION");
  });

  it("should use G64 continuous path for rough passes", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "fanuc",
      material_group: "steel",
      workpiece_thickness_mm: 25,
    });
    const result = eng.generate_fanuc(input);
    expect(result.gcode).toContain("G64");
    expect(result.gcode).toContain("CONTINUOUS PATH");
  });

  it("should use M50/M60 for wire threading/cutting", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({ controller: "fanuc", material_group: "steel", workpiece_thickness_mm: 25 });
    const result = eng.generate_fanuc(input);
    expect(result.gcode).toContain("M50"); // thread
    expect(result.gcode).toContain("M60"); // cut wire
  });

  it("should cap T-register pass level at 4", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const input = makeInput({
      controller: "fanuc",
      material_group: "steel",
      workpiece_thickness_mm: 25,
      passes: [
        { pass_number: 1, offset_mm: 0.15, technology_table: "101", wire_speed_m_min: 12, tension_N: 15 },
        { pass_number: 2, offset_mm: 0.08, technology_table: "102", wire_speed_m_min: 10, tension_N: 12 },
        { pass_number: 3, offset_mm: 0.05, technology_table: "103", wire_speed_m_min: 8, tension_N: 10 },
        { pass_number: 4, offset_mm: 0.03, technology_table: "104", wire_speed_m_min: 6, tension_N: 8 },
        { pass_number: 5, offset_mm: 0.01, technology_table: "105", wire_speed_m_min: 5, tension_N: 6 },
      ],
    });
    const result = eng.generate_fanuc(input);
    expect(result.gcode).toContain("T114"); // pass 4 capped
    expect(result.gcode).not.toContain("T115"); // should not exist
  });

  it("should generate correct thickness classes", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const cases = [
      { thickness: 5, expectedThick: "0" },
      { thickness: 20, expectedThick: "1" },
      { thickness: 45, expectedThick: "2" },
      { thickness: 80, expectedThick: "3" },
      { thickness: 120, expectedThick: "4" },
    ];
    for (const { thickness, expectedThick } of cases) {
      const input = makeInput({
        controller: "fanuc",
        material_group: "steel",
        workpiece_thickness_mm: thickness,
        passes: [{ pass_number: 1, offset_mm: 0.15, technology_table: "101", wire_speed_m_min: 12, tension_N: 15 }],
      });
      const result = eng.generate_fanuc(input);
      expect(result.gcode).toContain(`T1${expectedThick}1`);
    }
  });
});

describe("All 5 Dialects: Cross-Controller Consistency", () => {
  it("all 5 controllers should generate valid output with material_group", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const controllers = ["fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles"] as const;
    for (const ctrl of controllers) {
      const input = makeInput({
        controller: ctrl,
        material_group: "steel",
        workpiece_thickness_mm: 25,
      });
      const methodName = `generate_${ctrl}` as keyof typeof eng;
      const result = (eng[methodName] as (i: unknown) => { gcode: string; line_count: number; passes_generated: number })(input);
      expect(result.gcode.length).toBeGreaterThan(100);
      expect(result.line_count).toBeGreaterThan(10);
      expect(result.passes_generated).toBe(3);
    }
  });

  it("all 5 controllers should work without material_group (backward compat)", async () => {
    const mod = await import(ENGINE_PATH);
    const eng = new mod.EDMPostProcessGCodeEngine();
    const controllers = ["fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles"] as const;
    for (const ctrl of controllers) {
      const input = makeInput({ controller: ctrl });
      const methodName = `generate_${ctrl}` as keyof typeof eng;
      const result = (eng[methodName] as (i: unknown) => { gcode: string; line_count: number })(input);
      expect(result.gcode.length).toBeGreaterThan(100);
      expect(result.line_count).toBeGreaterThan(10);
    }
  });
});
