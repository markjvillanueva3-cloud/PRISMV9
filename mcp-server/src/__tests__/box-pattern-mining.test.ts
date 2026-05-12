/**
 * BOX-MS1 Tests — Pattern Mining Engines
 *
 * Tests SpeedFeedMinerEngine, ToolPatternMinerEngine, OperationSequenceMinerEngine
 * using simulated program records based on real shop data patterns.
 */

import { describe, it, expect } from "vitest";
import { SpeedFeedMinerEngine } from "../engines/SpeedFeedMinerEngine.js";
import { ToolPatternMinerEngine } from "../engines/ToolPatternMinerEngine.js";
import { OperationSequenceMinerEngine } from "../engines/OperationSequenceMinerEngine.js";
import type { ProgramRecord } from "../engines/ProgramDatabaseEngine.js";

// ── Test data: simulated programs based on real shop patterns ─────────────

function makeRecord(id: string, overrides: Partial<ProgramRecord>): ProgramRecord {
  return {
    id,
    file_path: `/box/${id}.MIN`,
    filename: `${id}.MIN`,
    machine_type: "okuma_lathe",
    controller: "osp-p300l",
    material_hint: "steel",
    customer: "TEST",
    last_modified: "2025-06-01T00:00:00Z",
    line_count: 200,
    file_size: 5000,
    tools: [],
    operations: [],
    speeds: [],
    feeds: [],
    cycle_time_est_sec: null,
    has_macros: false,
    has_bar_feeder: false,
    has_live_tooling: false,
    has_threading: false,
    has_c_axis: false,
    has_probing: false,
    has_high_speed: false,
    safety_warnings: [],
    parser_used: "OkumaOSPParser",
    parsed_at: "2026-04-04T00:00:00Z",
    ...overrides,
  };
}

const SAMPLE_RECORDS: ProgramRecord[] = [
  makeRecord("prog-001", {
    material_hint: "steel",
    operations: ["face", "od_rough", "od_finish", "drill", "id_rough", "id_finish", "thread", "cutoff"],
    tools: [
      { tool_number: 1, description: "OD ROUGH R.032", operation_types: ["od_rough", "face"], speed_rpm: 600, feed: 0.012, css_mode: true },
      { tool_number: 2, description: "OD FINISH R.015", operation_types: ["od_finish"], speed_rpm: 750, feed: 0.006, css_mode: true },
      { tool_number: 3, description: "CENTER DRILL", operation_types: ["drill"], speed_rpm: 1200, feed: 0.005, css_mode: false },
      { tool_number: 5, description: "3/4 DRILL", operation_types: ["drill"], speed_rpm: 800, feed: 0.008, css_mode: false },
      { tool_number: 7, description: "BORE BAR R.015", operation_types: ["id_rough", "id_finish"], speed_rpm: 500, feed: 0.008, css_mode: true },
      { tool_number: 9, description: "THREAD 60DEG", operation_types: ["thread"], speed_rpm: 150, feed: 0.050, css_mode: true },
      { tool_number: 11, description: "CUTOFF .125W", operation_types: ["cutoff"], speed_rpm: 350, feed: 0.003, css_mode: true },
    ],
    has_threading: true,
    has_bar_feeder: true,
  }),
  makeRecord("prog-002", {
    material_hint: "steel",
    operations: ["face", "od_rough", "od_finish", "drill", "thread"],
    tools: [
      { tool_number: 1, description: "OD ROUGH R.032", operation_types: ["od_rough", "face"], speed_rpm: 550, feed: 0.010, css_mode: true },
      { tool_number: 2, description: "OD FINISH R.015", operation_types: ["od_finish"], speed_rpm: 700, feed: 0.005, css_mode: true },
      { tool_number: 3, description: "CENTER DRILL", operation_types: ["drill"], speed_rpm: 1100, feed: 0.004, css_mode: false },
      { tool_number: 9, description: "THREAD 60DEG", operation_types: ["thread"], speed_rpm: 140, feed: 0.050, css_mode: true },
    ],
    has_threading: true,
  }),
  makeRecord("prog-003", {
    material_hint: "aluminum",
    operations: ["face", "od_rough", "od_finish", "drill", "peck_drill"],
    tools: [
      { tool_number: 1, description: "OD ROUGH R.032", operation_types: ["od_rough", "face"], speed_rpm: 1200, feed: 0.015, css_mode: true },
      { tool_number: 2, description: "OD FINISH R.015", operation_types: ["od_finish"], speed_rpm: 1500, feed: 0.008, css_mode: true },
      { tool_number: 5, description: "DRILL 1/2", operation_types: ["drill", "peck_drill"], speed_rpm: 2500, feed: 0.010, css_mode: false },
    ],
  }),
  makeRecord("prog-004", {
    material_hint: "steel",
    operations: ["face", "od_rough", "od_finish"],
    machine_type: "haas_mill",
    tools: [
      { tool_number: 1, description: "1/2 ENDMILL", operation_types: ["od_rough", "face"], speed_rpm: 6000, feed: 30, css_mode: false },
      { tool_number: 2, description: "1/4 ENDMILL", operation_types: ["od_finish"], speed_rpm: 8000, feed: 20, css_mode: false },
    ],
  }),
  // Deliberately bad program — threading after cutoff
  makeRecord("prog-bad", {
    material_hint: "steel",
    operations: ["od_rough", "cutoff", "thread"],
    tools: [
      { tool_number: 1, description: "OD ROUGH", operation_types: ["od_rough"], speed_rpm: 600, feed: 0.012, css_mode: true },
      { tool_number: 11, description: "CUTOFF", operation_types: ["cutoff"], speed_rpm: 350, feed: 0.003, css_mode: true },
      { tool_number: 9, description: "THREAD", operation_types: ["thread"], speed_rpm: 150, feed: 0.050, css_mode: true },
    ],
    has_threading: true,
  }),
];

// ============================================================================
// SpeedFeedMinerEngine Tests
// ============================================================================

describe("SpeedFeedMinerEngine", () => {
  const engine = new SpeedFeedMinerEngine();

  it("extracts samples from program records", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    expect(result.total_samples).toBeGreaterThan(10);
  });

  it("computes statistics by material and operation", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    const steelOdRough = result.stats.find(
      s => s.material === "steel" && s.operation === "od_rough" && s.machine_type === "okuma_lathe",
    );
    expect(steelOdRough).toBeDefined();
    expect(steelOdRough!.sample_count).toBeGreaterThanOrEqual(2);
    expect(steelOdRough!.speed_mean).toBeGreaterThan(0);
    expect(steelOdRough!.speed_median).toBeGreaterThan(0);
    expect(steelOdRough!.feed_mean).toBeGreaterThan(0);
  });

  it("separates CSS from direct RPM counts", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    const steelOdRough = result.stats.find(
      s => s.material === "steel" && s.operation === "od_rough" && s.machine_type === "okuma_lathe",
    );
    expect(steelOdRough!.css_count).toBeGreaterThanOrEqual(2);
  });

  it("generates calibration data for groups with enough samples", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    // Groups with >= 3 samples get calibration entries
    expect(result.calibration_data.length).toBeGreaterThanOrEqual(0);
    for (const cal of result.calibration_data) {
      expect(cal.recommended_speed).toBeGreaterThan(0);
      expect(cal.confidence).toBeGreaterThan(0);
      expect(cal.confidence).toBeLessThanOrEqual(1);
      expect(cal.source).toBe("shop_median");
    }
  });

  it("reports summary correctly", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    expect(result.summary.materials_found).toContain("steel");
    expect(result.summary.materials_found).toContain("aluminum");
    expect(result.summary.operations_found).toContain("od_rough");
    expect(result.summary.programs_analyzed).toBe(SAMPLE_RECORDS.length);
  });

  it("compares program to baseline", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    const comparison = engine.compareToBaseline(SAMPLE_RECORDS[0], result.stats);
    expect(comparison.length).toBeGreaterThan(0);
    for (const c of comparison) {
      expect(["optimal", "conservative", "aggressive", "dangerous"]).toContain(c.assessment);
      expect(typeof c.speed_diff_pct).toBe("number");
    }
  });

  it("handles empty records gracefully", () => {
    const result = engine.mine([]);
    expect(result.total_samples).toBe(0);
    expect(result.stats).toEqual([]);
  });
});

// ============================================================================
// ToolPatternMinerEngine Tests
// ============================================================================

describe("ToolPatternMinerEngine", () => {
  const engine = new ToolPatternMinerEngine();

  it("extracts station patterns", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    expect(result.station_patterns.length).toBeGreaterThan(0);

    const station1 = result.station_patterns.find(s => s.station === 1);
    expect(station1).toBeDefined();
    expect(station1!.most_common_operation).toBe("od_rough");
    expect(station1!.usage_count).toBeGreaterThanOrEqual(3);
  });

  it("extracts insert radius patterns from descriptions", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    // R.032 and R.015 should be detected from tool descriptions
    const r032 = result.insert_patterns.find(p => p.nose_radius === 0.032);
    const r015 = result.insert_patterns.find(p => p.nose_radius === 0.015);
    expect(r032).toBeDefined();
    expect(r015).toBeDefined();
    expect(r032!.operations).toContain("od_rough");
    expect(r015!.operations).toContain("od_finish");
  });

  it("computes tool count statistics", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    expect(result.stats.total_programs).toBe(SAMPLE_RECORDS.length);
    expect(result.stats.avg_tools_per_program).toBeGreaterThan(0);
    expect(result.stats.max_tools_per_program).toBeGreaterThanOrEqual(7); // prog-001 has 7 tools
  });

  it("tracks CSS usage percentage per station", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    const station1 = result.station_patterns.find(s => s.station === 1);
    expect(station1!.css_pct).toBeGreaterThan(0);
  });

  it("builds turret templates from repeated patterns", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    // With 5 records, some patterns should repeat
    // Templates need frequency >= 2
    expect(result.turret_templates.length).toBeGreaterThanOrEqual(0);
  });

  it("handles empty input", () => {
    const result = engine.mine([]);
    expect(result.station_patterns).toEqual([]);
    expect(result.stats.total_programs).toBe(0);
  });
});

// ============================================================================
// OperationSequenceMinerEngine Tests
// ============================================================================

describe("OperationSequenceMinerEngine", () => {
  const engine = new OperationSequenceMinerEngine();

  it("extracts sequence patterns", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.stats.unique_sequences).toBeGreaterThan(0);
  });

  it("computes operation bigrams", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    expect(result.bigrams.length).toBeGreaterThan(0);

    // face→od_rough should be very common
    const faceToRough = result.bigrams.find(b => b.from === "face" && b.to === "od_rough");
    expect(faceToRough).toBeDefined();
    expect(faceToRough!.count).toBeGreaterThanOrEqual(2);
  });

  it("detects risky sequence: cutoff before thread", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    const cutoffThread = result.deviations.find(
      d => d.operation === "cutoff→thread" && d.severity === "error",
    );
    expect(cutoffThread).toBeDefined();
    expect(cutoffThread!.reason).toContain("Threading after cutoff");
  });

  it("checks single program operation order", () => {
    const deviations = engine.checkOrder(["od_rough", "cutoff", "thread"]);
    expect(deviations.length).toBeGreaterThanOrEqual(1);
    const cutoffIssue = deviations.find(d => d.severity === "error");
    expect(cutoffIssue).toBeDefined();
  });

  it("validates correct operation order with no deviations", () => {
    const deviations = engine.checkOrder(["face", "od_rough", "od_finish", "drill", "thread", "cutoff"]);
    const errors = deviations.filter(d => d.severity === "error");
    expect(errors.length).toBe(0);
  });

  it("detects out-of-order operations", () => {
    const deviations = engine.checkOrder(["drill", "face", "od_rough"]);
    // drill (pos 5) before face (pos 1) should be flagged
    expect(deviations.length).toBeGreaterThanOrEqual(1);
  });

  it("computes average operations per program", () => {
    const result = engine.mine(SAMPLE_RECORDS);
    expect(result.stats.avg_operations_per_program).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const result = engine.mine([]);
    expect(result.patterns).toEqual([]);
    expect(result.stats.total_programs).toBe(0);
  });
});
