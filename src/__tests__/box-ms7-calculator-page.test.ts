/**
 * BOX-MS7: Calculator Page — Program Upload + Tool Callout + Auto S/F
 *
 * Tests:
 *   - ProgramUploadAnalyzerEngine: dialect detection, multi-parser routing,
 *     tool extraction, S/F extraction, hints, safety
 *   - ToolCalloutCardEngine: card generation, insert extraction, delta calc, warnings
 *   - ProgramMemoryEngine: save/recall/rate/defaults/export/import
 *   - Dispatcher wiring: 6 new actions
 *   - Schema validation
 */
import { describe, it, expect } from "vitest";
import { programUploadAnalyzerEngine } from "../engines/ProgramUploadAnalyzerEngine.js";
import { toolCalloutCardEngine } from "../engines/ToolCalloutCardEngine.js";
import { ProgramMemoryEngine } from "../engines/ProgramMemoryEngine.js";
import {
  BoxUploadAnalyzeSchema,
  BoxToolCalloutsSchema,
  BoxProgramMemorySaveSchema,
  BoxProgramMemoryRecallSchema,
  BOX_ACTION_SCHEMAS,
} from "../tools/schemas/boxAuditActionSchemas.js";

// ── Test Programs ───────────────────────────────────────────────

const OKUMA_PROGRAM = [
  "(SHAFT - 4140 STEEL - CHUCK)",
  "G50 S2500",
  "NAT01 (OD ROUGH - CNMG120408)",
  "T010101",
  "G96 S600 M3",
  "M8",
  "G0 X2.1 Z0.1",
  "G1 X1.875 F0.012",
  "G1 Z-3.5",
  "G1 X2.0",
  "G0 X20 Z20",
  "M1",
  "M9",
  "NAT02 (OD FINISH - DNMG110404)",
  "T020202",
  "G50 S3000",
  "G96 S800 M3",
  "M8",
  "G0 X1.875 Z0.05",
  "G1 Z-3.5 F0.006",
  "G1 X2.0",
  "G0 X20 Z20",
  "M9",
  "M5",
  "M30",
].join("\n");

const HAAS_PROGRAM = [
  "O00200 (BRACKET - 6061 ALUMINUM - VISE)",
  "N1 G28 G91 Z0",
  "N2 G90 G54 G20",
  "T01 M06 (1/2 EM 4FL)",
  "G43 H01 Z1.0",
  "S8000 M03",
  "M08",
  "G187 P3",
  "G00 X1.0 Y1.0",
  "G01 Z-0.25 F20.0",
  "G01 X3.0",
  "G01 Y3.0",
  "G00 Z1.0",
  "T02 M06 (#7 DRILL)",
  "G43 H02 Z1.0",
  "S3500 M03",
  "M08",
  "G83 X2.0 Y2.0 Z-1.5 R0.1 Q0.25 F8.0",
  "G80",
  "G00 Z1.0",
  "M09",
  "M05",
  "G28 G91 Z0",
  "M30",
].join("\n");

const HURCO_PROGRAM = [
  "( HURCO VM30i - PLATE - 304 STAINLESS )",
  "G90 G21",
  "G54",
  "T01 M06 (10MM EM 3FL)",
  "G43 H01 Z50.0",
  "S4000 M03",
  "M08",
  "G00 X25.0 Y10.0",
  "G01 Z-5.0 F200",
  "G01 X75.0 F400",
  "G00 Z50.0",
  "M09",
  "M05",
  "M30",
].join("\n");

// ═══════════════════════════════════════════════════════════════
// PROGRAM UPLOAD ANALYZER
// ═══════════════════════════════════════════════════════════════

describe("ProgramUploadAnalyzerEngine", () => {
  describe("Okuma dialect", () => {
    it("detects Okuma dialect from NAT labels", async () => {
      const result = await programUploadAnalyzerEngine.analyze(OKUMA_PROGRAM, "SHAFT.MIN");
      expect(result.dialect).toBe("okuma");
      expect(result.dialect_confidence).toBeGreaterThan(0);
    });

    it("extracts tool list", async () => {
      const result = await programUploadAnalyzerEngine.analyze(OKUMA_PROGRAM, "SHAFT.MIN");
      expect(result.tool_list.length).toBeGreaterThanOrEqual(2);
      expect(result.tool_list[0].station).toBe(1);
    });

    it("extracts original speed/feed values", async () => {
      const result = await programUploadAnalyzerEngine.analyze(OKUMA_PROGRAM, "SHAFT.MIN");
      expect(result.original_speed_feeds.length).toBeGreaterThan(0);
    });

    it("detects material hint from comments", async () => {
      const result = await programUploadAnalyzerEngine.analyze(OKUMA_PROGRAM, "SHAFT.MIN");
      expect(result.hints.material_hint).toContain("4140");
    });

    it("detects workholding hint", async () => {
      const result = await programUploadAnalyzerEngine.analyze(OKUMA_PROGRAM, "SHAFT.MIN");
      expect(result.hints.workholding_hint).toBe("CHUCK");
    });
  });

  describe("Haas dialect", () => {
    it("detects Haas dialect", async () => {
      const result = await programUploadAnalyzerEngine.analyze(HAAS_PROGRAM, "BRACKET.nc");
      expect(result.dialect).toBe("haas");
    });

    it("extracts 2 tools", async () => {
      const result = await programUploadAnalyzerEngine.analyze(HAAS_PROGRAM, "BRACKET.nc");
      expect(result.tool_list.length).toBeGreaterThanOrEqual(2);
    });

    it("detects imperial unit system from G20", async () => {
      const result = await programUploadAnalyzerEngine.analyze(HAAS_PROGRAM, "BRACKET.nc");
      expect(result.hints.unit_system).toBe("imperial");
    });

    it("detects material hint (6061 ALUMINUM)", async () => {
      const result = await programUploadAnalyzerEngine.analyze(HAAS_PROGRAM, "BRACKET.nc");
      expect(result.hints.material_hint).toMatch(/6061/);
    });

    it("detects canned cycles", async () => {
      const result = await programUploadAnalyzerEngine.analyze(HAAS_PROGRAM, "BRACKET.nc");
      expect(result.cycle_structure.has_canned_cycles).toBe(true);
    });
  });

  describe("Hurco dialect", () => {
    it("detects Hurco dialect", async () => {
      const result = await programUploadAnalyzerEngine.analyze(HURCO_PROGRAM, "PLATE.hnc");
      expect(result.dialect).toBe("hurco");
    });

    it("detects metric unit system from G21", async () => {
      const result = await programUploadAnalyzerEngine.analyze(HURCO_PROGRAM, "PLATE.hnc");
      expect(result.hints.unit_system).toBe("metric");
    });

    it("detects stainless material hint", async () => {
      const result = await programUploadAnalyzerEngine.analyze(HURCO_PROGRAM, "PLATE.hnc");
      expect(result.hints.material_hint).toMatch(/304|STAINLESS/i);
    });
  });

  describe("Generic fallback", () => {
    it("handles minimal G-code", async () => {
      const minimal = "T01 M06\nS3000 M03\nG0 X0 Y0\nG1 Z-1 F10\nM30";
      const result = await programUploadAnalyzerEngine.analyze(minimal, "test.nc");
      expect(result.tool_list.length).toBeGreaterThanOrEqual(1);
      expect(result.dialect).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// TOOL CALLOUT CARD
// ═══════════════════════════════════════════════════════════════

describe("ToolCalloutCardEngine", () => {
  it("generates cards from analyzed tools", () => {
    const result = toolCalloutCardEngine.generate({
      tools: [
        { station: 1, description: "OD ROUGH - CNMG120408", operation_types: ["od_rough"], speed_rpm: null, css_mode: true, feed_rate: 0.012, offset_number: 1, has_tlc: false, has_cutter_comp: false },
        { station: 2, description: "OD FINISH - DNMG110404", operation_types: ["od_finish"], speed_rpm: null, css_mode: true, feed_rate: 0.006, offset_number: 2, has_tlc: false, has_cutter_comp: false },
      ],
      speed_feeds: [
        { tool_station: 1, speed_rpm: null, css_sfm: 600, feed_rate: 0.012, g_code_context: "G96" },
        { tool_station: 2, speed_rpm: null, css_sfm: 800, feed_rate: 0.006, g_code_context: "G96" },
      ],
      material: "4140 STEEL",
      machine_type: "okuma",
      unit_system: "imperial",
    });

    expect(result.cards.length).toBe(2);
    expect(result.summary.total_tools).toBe(2);
  });

  it("extracts insert info from CNMG description", () => {
    const result = toolCalloutCardEngine.generate({
      tools: [
        { station: 1, description: "CNMG120408", operation_types: ["od_rough"], speed_rpm: 1000, css_mode: false, feed_rate: 0.010, offset_number: null, has_tlc: false, has_cutter_comp: false },
      ],
      speed_feeds: [],
      material: null,
      machine_type: null,
      unit_system: "imperial",
    });

    expect(result.cards[0].insert_info.type).toBe("CNMG");
    expect(result.cards[0].insert_info.nose_radius).toBe(0.8);
  });

  it("generates warnings for missing speed/feed", () => {
    const result = toolCalloutCardEngine.generate({
      tools: [
        { station: 1, description: "T1", operation_types: [], speed_rpm: null, css_mode: false, feed_rate: null, offset_number: null, has_tlc: false, has_cutter_comp: false },
      ],
      speed_feeds: [],
      material: null,
      machine_type: null,
      unit_system: "imperial",
    });

    expect(result.cards[0].warnings.length).toBeGreaterThan(0);
    expect(result.cards[0].severity).not.toBe("ok");
  });

  it("suggests optimal S/F when material is provided", () => {
    const result = toolCalloutCardEngine.generate({
      tools: [
        { station: 1, description: "OD ROUGH", operation_types: ["od_rough"], speed_rpm: 800, css_mode: false, feed_rate: 0.010, offset_number: null, has_tlc: false, has_cutter_comp: false },
      ],
      speed_feeds: [
        { tool_station: 1, speed_rpm: 800, css_sfm: 400, feed_rate: 0.010, g_code_context: "S800" },
      ],
      material: "6061 ALUMINUM",
      machine_type: null,
      unit_system: "imperial",
    });

    expect(result.cards[0].suggested_sf).not.toBeNull();
    expect(result.cards[0].suggested_sf!.css_sfm).toBeGreaterThan(0);
  });

  it("computes speed delta percentage", () => {
    const result = toolCalloutCardEngine.generate({
      tools: [
        { station: 1, description: "T1", operation_types: ["od_rough"], speed_rpm: null, css_mode: true, feed_rate: 0.012, offset_number: null, has_tlc: false, has_cutter_comp: false },
      ],
      speed_feeds: [
        { tool_station: 1, speed_rpm: null, css_sfm: 500, feed_rate: 0.012, g_code_context: "G96" },
      ],
      material: "1045 STEEL",
      machine_type: null,
      unit_system: "imperial",
    });

    // Should have a delta since we provide both original and material for suggestion
    expect(result.cards[0].delta_pct.speed).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// PROGRAM MEMORY
// ═══════════════════════════════════════════════════════════════

describe("ProgramMemoryEngine", () => {
  it("saves and recalls tool assignments", () => {
    const engine = new ProgramMemoryEngine();
    engine.save("ACME Corp", "PN-1234", "SHAFT.MIN", "okuma", [
      { station: 1, tool_id: "T1-CNMG", tool_description: "CNMG120408", operation_type: "od_rough", speed_rpm: 1200, feed_rate: 0.012, notes: null },
      { station: 2, tool_id: "T2-DNMG", tool_description: "DNMG110404", operation_type: "od_finish", speed_rpm: 1800, feed_rate: 0.006, notes: null },
    ]);

    const recalled = engine.recall("ACME Corp", "PN-1234");
    expect(recalled).not.toBeNull();
    expect(recalled!.assignments.length).toBe(2);
    expect(recalled!.customer).toBe("ACME Corp");
    expect(recalled!.use_count).toBe(1);
  });

  it("increments use count on re-save", () => {
    const engine = new ProgramMemoryEngine();
    engine.save("ACME", "P1", "F.MIN", "okuma", [
      { station: 1, tool_id: "T1", tool_description: "T1", operation_type: "od_rough", speed_rpm: 1000, feed_rate: 0.01, notes: null },
    ]);
    engine.save("ACME", "P1", "F.MIN", "okuma", [
      { station: 1, tool_id: "T1", tool_description: "T1", operation_type: "od_rough", speed_rpm: 1100, feed_rate: 0.01, notes: null },
    ]);

    const recalled = engine.recall("ACME", "P1");
    expect(recalled!.use_count).toBe(2);
  });

  it("rates programs as good", () => {
    const engine = new ProgramMemoryEngine();
    engine.save("X", "Y", "F", "haas", [
      { station: 1, tool_id: "T1", tool_description: "EM", operation_type: "pocket", speed_rpm: 5000, feed_rate: 20, notes: null },
    ]);
    const rated = engine.rateGood("X", "Y");
    expect(rated).toBe(true);

    const recalled = engine.recall("X", "Y");
    expect(recalled!.rated_good).toBe(true);
  });

  it("builds defaults from saved records", () => {
    const engine = new ProgramMemoryEngine();
    engine.save("A", "P1", "F1", "okuma", [
      { station: 1, tool_id: "CNMG", tool_description: "CNMG", operation_type: "od_rough", speed_rpm: 1200, feed_rate: 0.012, notes: null },
    ]);
    engine.save("B", "P2", "F2", "okuma", [
      { station: 1, tool_id: "CNMG", tool_description: "CNMG", operation_type: "od_rough", speed_rpm: 1400, feed_rate: 0.014, notes: null },
    ]);

    const defaults = engine.getDefaults();
    expect(defaults.length).toBeGreaterThan(0);
    const odRough = defaults.find(d => d.operation_type === "od_rough");
    expect(odRough).toBeDefined();
    expect(odRough!.avg_rpm).toBe(1300);
  });

  it("exports and imports JSON", () => {
    const engine = new ProgramMemoryEngine();
    engine.save("C", "P3", "F3", "haas", [
      { station: 1, tool_id: "T5", tool_description: "T5", operation_type: "drill", speed_rpm: 3000, feed_rate: 8, notes: null },
    ]);

    const json = engine.exportJSON();
    const engine2 = new ProgramMemoryEngine();
    const count = engine2.importJSON(json);
    expect(count).toBe(1);

    const recalled = engine2.recall("C", "P3");
    expect(recalled).not.toBeNull();
  });

  it("returns stats", () => {
    const engine = new ProgramMemoryEngine();
    engine.save("A", "P1", "F1", "okuma", [
      { station: 1, tool_id: "T1", tool_description: "T1", operation_type: "od_rough", speed_rpm: 1200, feed_rate: 0.012, notes: null },
    ]);
    engine.save("B", "P2", "F2", "haas", [
      { station: 1, tool_id: "T2", tool_description: "T2", operation_type: "pocket", speed_rpm: 5000, feed_rate: 20, notes: null },
    ]);

    const stats = engine.getStats();
    expect(stats.total_records).toBe(2);
    expect(stats.unique_customers).toBe(2);
    expect(stats.unique_parts).toBe(2);
    expect(stats.total_assignments).toBe(2);
  });

  it("searches by customer", () => {
    const engine = new ProgramMemoryEngine();
    engine.save("ACME Corp", "P1", "F1", "okuma", [
      { station: 1, tool_id: "T1", tool_description: "T1", operation_type: "od_rough", speed_rpm: 1200, feed_rate: 0.012, notes: null },
    ]);
    engine.save("Beta Inc", "P2", "F2", "haas", [
      { station: 1, tool_id: "T2", tool_description: "T2", operation_type: "pocket", speed_rpm: 5000, feed_rate: 20, notes: null },
    ]);

    const results = engine.searchByCustomer("ACME");
    expect(results.length).toBe(1);
    expect(results[0].customer).toBe("ACME Corp");
  });
});

// ═══════════════════════════════════════════════════════════════
// FULL PIPELINE: Upload → Analyze → Callouts
// ═══════════════════════════════════════════════════════════════

describe("Full Upload → Callout Pipeline", () => {
  it("Okuma: upload → analyze → generate callout cards", async () => {
    const analysis = await programUploadAnalyzerEngine.analyze(OKUMA_PROGRAM, "SHAFT.MIN");
    expect(analysis.tool_list.length).toBeGreaterThanOrEqual(2);

    const callouts = toolCalloutCardEngine.generate({
      tools: analysis.tool_list,
      speed_feeds: analysis.original_speed_feeds,
      material: analysis.hints.material_hint,
      machine_type: "okuma",
      unit_system: analysis.hints.unit_system === "unknown" ? "imperial" : analysis.hints.unit_system,
    });

    expect(callouts.cards.length).toBeGreaterThanOrEqual(2);
    expect(callouts.summary.total_tools).toBeGreaterThanOrEqual(2);
  });

  it("Haas: upload → analyze → callouts → memory save", async () => {
    const analysis = await programUploadAnalyzerEngine.analyze(HAAS_PROGRAM, "BRACKET.nc");
    const callouts = toolCalloutCardEngine.generate({
      tools: analysis.tool_list,
      speed_feeds: analysis.original_speed_feeds,
      material: analysis.hints.material_hint,
      machine_type: "haas",
      unit_system: "imperial",
    });

    const engine = new ProgramMemoryEngine();
    const record = engine.save(
      "Test Customer",
      "BRACKET-001",
      "BRACKET.nc",
      "haas",
      callouts.cards.map(c => ({
        station: c.station,
        tool_id: `T${c.station}`,
        tool_description: c.description,
        operation_type: c.operation_types[0] ?? "unknown",
        speed_rpm: c.original_sf.speed_rpm,
        feed_rate: c.original_sf.feed_rate,
        notes: null,
      })),
    );

    expect(record.assignments.length).toBe(callouts.cards.length);
    const recalled = engine.recall("Test Customer", "BRACKET-001");
    expect(recalled).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════

describe("BOX-MS7 Schemas", () => {
  it("BoxUploadAnalyzeSchema rejects empty content", () => {
    expect(BoxUploadAnalyzeSchema.safeParse({ content: "" }).success).toBe(false);
  });

  it("BoxUploadAnalyzeSchema accepts valid input", () => {
    expect(BoxUploadAnalyzeSchema.safeParse({ content: OKUMA_PROGRAM, filename: "TEST.MIN" }).success).toBe(true);
  });

  it("BoxToolCalloutsSchema requires non-empty tools", () => {
    expect(BoxToolCalloutsSchema.safeParse({ tools: [], speed_feeds: [] }).success).toBe(false);
  });

  it("BoxProgramMemorySaveSchema validates structure", () => {
    expect(BoxProgramMemorySaveSchema.safeParse({
      customer: "ACME",
      part_number: "PN-1",
      filename: "F.MIN",
      assignments: [{ station: 1, tool_id: "T1", tool_description: "T1", operation_type: "od_rough" }],
    }).success).toBe(true);
  });

  it("BoxProgramMemoryRecallSchema requires both fields", () => {
    expect(BoxProgramMemoryRecallSchema.safeParse({ customer: "" }).success).toBe(false);
    expect(BoxProgramMemoryRecallSchema.safeParse({ customer: "A", part_number: "B" }).success).toBe(true);
  });

  it("BOX_ACTION_SCHEMAS includes MS7 actions", () => {
    expect(BOX_ACTION_SCHEMAS.box_upload_analyze).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_tool_callouts).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_program_memory_save).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_program_memory_recall).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_program_memory_defaults).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_program_memory_stats).toBeDefined();
  });
});
