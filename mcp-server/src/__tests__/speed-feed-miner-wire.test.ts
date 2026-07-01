/**
 * speed_feed_mine + speed_feed_compare_to_baseline wire test —
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MINER (2026-05-21, slot:juliett).
 *
 * Validates SpeedFeedMinerEngine.mine() + compareToBaseline() — pure
 * statistical mining over parsed CNC ProgramRecord[]. Tests use concrete
 * reference samples and assert algebraic invariants (median, mean, stddev,
 * grouping cardinality, outlier severity classification).
 */
import { describe, it, expect } from "vitest";
import { speedFeedMinerEngine } from "../engines/SpeedFeedMinerEngine.js";
import type { ProgramRecord } from "../engines/ProgramDatabaseEngine.js";

function rec(overrides: Partial<ProgramRecord> & { tools: any[] }): ProgramRecord {
  return {
    id: "prog-001",
    file_path: "/test/prog-001.txt",
    filename: "prog-001.txt",
    machine_type: "okuma_lb3000",
    controller: "OSP",
    material_hint: "steel",
    customer: "JM-DIE",
    last_modified: "2026-05-21T00:00:00Z",
    line_count: 100,
    file_size: 4000,
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
    parser_used: "OkumaOSPParserEngine",
    parsed_at: "2026-05-21T00:00:00Z",
    ...overrides,
  } as ProgramRecord;
}

function tool(overrides: Partial<any>): any {
  return {
    tool_number: 1,
    description: null,
    operation_types: ["od_rough"],
    speed_rpm: 1500,
    feed: 0.01,
    css_mode: false,
    ...overrides,
  };
}

describe("speed_feed_mine — SpeedFeedMinerEngine.mine()", () => {
  it("groups by (material × operation × machine_type) and reports correct sample_count", () => {
    const records: ProgramRecord[] = [
      rec({ id: "p1", tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 1000, feed: 0.012 })] }),
      rec({ id: "p2", tools: [tool({ tool_number: 2, operation_types: ["od_rough"], speed_rpm: 1200, feed: 0.014 })] }),
      rec({ id: "p3", tools: [tool({ tool_number: 3, operation_types: ["od_finish"], speed_rpm: 1500, feed: 0.005 })] }),
      rec({ id: "p4", tools: [tool({ tool_number: 4, operation_types: ["od_finish"], speed_rpm: 1600, feed: 0.006 })] }),
    ];
    const r = speedFeedMinerEngine.mine(records);
    expect(r.total_samples).toBe(4);
    expect(r.stats.length).toBe(2);
    const odRough = r.stats.find((s) => s.operation === "od_rough");
    const odFinish = r.stats.find((s) => s.operation === "od_finish");
    expect(odRough?.sample_count).toBe(2);
    expect(odFinish?.sample_count).toBe(2);
  });

  it("speed_median for odd-sized group equals the middle sorted value (algebraic invariant)", () => {
    const records: ProgramRecord[] = [800, 1000, 1200, 1400, 1600].map((s, i) =>
      rec({ id: `p${i}`, tools: [tool({ tool_number: i + 1, speed_rpm: s })] }),
    );
    const r = speedFeedMinerEngine.mine(records);
    expect(r.stats[0].speed_median).toBe(1200);
  });

  it("speed_median for even-sized group is the average of the two middle values", () => {
    const records: ProgramRecord[] = [1000, 1200, 1400, 1600].map((s, i) =>
      rec({ id: `p${i}`, tools: [tool({ tool_number: i + 1, speed_rpm: s })] }),
    );
    const r = speedFeedMinerEngine.mine(records);
    expect(r.stats[0].speed_median).toBe(1300);
  });

  it("calibration: groups with <3 samples FILTERED OUT, groups with ≥3 emit entry with confidence = min(1, n/20)", () => {
    const records: ProgramRecord[] = [
      rec({ id: "p1", tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 1000 })] }),
      rec({ id: "p2", tools: [tool({ tool_number: 2, operation_types: ["od_rough"], speed_rpm: 1100 })] }),
      rec({ id: "p3", tools: [tool({ tool_number: 3, operation_types: ["od_finish"], speed_rpm: 1500 })] }),
    ];
    const r = speedFeedMinerEngine.mine(records);
    expect(r.calibration_data.length).toBe(0);

    records.push(rec({ id: "p4", tools: [tool({ tool_number: 4, operation_types: ["od_rough"], speed_rpm: 1200 })] }));
    const r2 = speedFeedMinerEngine.mine(records);
    const odRoughCal = r2.calibration_data.find((c) => c.operation === "od_rough");
    expect(odRoughCal?.sample_count).toBe(3);
    expect(odRoughCal?.confidence).toBeCloseTo(0.15, 2);
    expect(odRoughCal?.source).toBe("shop_median");
    expect(odRoughCal?.recommended_speed).toBe(1100); // median of [1000, 1100, 1200]
  });

  it("outlier detection: CSS-mode speed > 1.5× max canonical range → 'danger' severity", () => {
    const records: ProgramRecord[] = [
      rec({ id: "p1", tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 1100, css_mode: true })] }),
    ];
    const r = speedFeedMinerEngine.mine(records);
    expect(r.outliers.length).toBe(1);
    expect(r.outliers[0].severity).toBe("danger");
    expect(r.outliers[0].expected_speed_range).toEqual([300, 700]);
  });

  it("outlier detection: CSS-mode speed > 2× max canonical range → 'critical' severity", () => {
    const records: ProgramRecord[] = [
      rec({ id: "p1", tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 1500, css_mode: true })] }),
    ];
    const r = speedFeedMinerEngine.mine(records);
    expect(r.outliers[0].severity).toBe("critical");
  });

  it("outlier detection: direct-RPM mode (css_mode=false) does NOT trigger SFM-range outliers (no diameter for conversion)", () => {
    const records: ProgramRecord[] = [
      rec({ id: "p1", tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 99999, css_mode: false })] }),
    ];
    const r = speedFeedMinerEngine.mine(records);
    expect(r.outliers.length).toBe(0);
  });

  it("multi-material × multi-machine: stats count matches the distinct (mat, op, machine) cardinality", () => {
    const records: ProgramRecord[] = [];
    let pid = 0;
    for (const mat of ["steel", "aluminum"]) {
      for (const mach of ["okuma_lb3000", "haas_st30"]) {
        for (const op of ["od_rough", "od_finish"]) {
          records.push(rec({
            id: `p${pid++}`,
            material_hint: mat,
            machine_type: mach,
            tools: [tool({ tool_number: 1, operation_types: [op], speed_rpm: 1000 })],
          }));
        }
      }
    }
    const r = speedFeedMinerEngine.mine(records);
    expect(r.stats.length).toBe(8);
    expect(r.summary.materials_found.sort()).toEqual(["aluminum", "steel"]);
    expect(r.summary.machines_found.sort()).toEqual(["haas_st30", "okuma_lb3000"]);
  });

  it("zero/null speeds are FILTERED at the sample-extraction stage (speed_rpm > 0 required)", () => {
    const records: ProgramRecord[] = [
      rec({ id: "p1", tools: [tool({ tool_number: 1, speed_rpm: 0 })] }),
      rec({ id: "p2", tools: [tool({ tool_number: 2, speed_rpm: null as any })] }),
      rec({ id: "p3", tools: [tool({ tool_number: 3, speed_rpm: 1500 })] }),
    ];
    const r = speedFeedMinerEngine.mine(records);
    expect(r.total_samples).toBe(1);
  });

  it("returns the complete documented result contract (5 top-level fields, 6 summary fields)", () => {
    const r = speedFeedMinerEngine.mine([
      rec({ tools: [tool({ tool_number: 1, speed_rpm: 1500 })] }),
    ]);
    expect(typeof r.total_samples).toBe("number");
    expect(Array.isArray(r.stats)).toBe(true);
    expect(Array.isArray(r.outliers)).toBe(true);
    expect(Array.isArray(r.calibration_data)).toBe(true);
    expect(typeof r.summary).toBe("object");
    expect(Array.isArray(r.summary.materials_found)).toBe(true);
    expect(Array.isArray(r.summary.operations_found)).toBe(true);
    expect(Array.isArray(r.summary.machines_found)).toBe(true);
    expect(typeof r.summary.programs_analyzed).toBe("number");
    expect(typeof r.summary.outlier_count).toBe("number");
    expect(typeof r.summary.outlier_pct).toBe("number");
  });
});

describe("speed_feed_compare_to_baseline — SpeedFeedMinerEngine.compareToBaseline()", () => {
  const baseline = [
    {
      material: "steel", operation: "od_rough", machine_type: "okuma_lb3000",
      sample_count: 10, speed_mean: 1000, speed_median: 1000, speed_stddev: 100,
      speed_min: 800, speed_max: 1200, feed_mean: 0.012, feed_median: 0.012,
      feed_stddev: 0.001, feed_min: 0.01, feed_max: 0.014, css_count: 0, direct_rpm_count: 10,
    },
  ];

  it("optimal: |speed_diff| ≤ 30% → 'optimal' assessment", () => {
    const r = speedFeedMinerEngine.compareToBaseline(
      rec({ tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 1100, feed: 0.012 })] }),
      baseline as any,
    );
    expect(r.length).toBe(1);
    expect(r[0].assessment).toBe("optimal");
    expect(r[0].speed_diff_pct).toBe(10);
  });

  it("conservative: speed_diff -30% to -50% (slow) → 'conservative'", () => {
    const r = speedFeedMinerEngine.compareToBaseline(
      rec({ tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 600, feed: 0.012 })] }),
      baseline as any,
    );
    expect(r[0].assessment).toBe("conservative");
    expect(r[0].speed_diff_pct).toBe(-40);
  });

  it("aggressive: speed_diff +30% to +50% → 'aggressive'", () => {
    const r = speedFeedMinerEngine.compareToBaseline(
      rec({ tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 1400, feed: 0.012 })] }),
      baseline as any,
    );
    expect(r[0].assessment).toBe("aggressive");
    expect(r[0].speed_diff_pct).toBe(40);
  });

  it("dangerous: |speed_diff| > 50% (either direction) → 'dangerous'", () => {
    const r1 = speedFeedMinerEngine.compareToBaseline(
      rec({ tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 1700 })] }),
      baseline as any,
    );
    expect(r1[0].assessment).toBe("dangerous");
    const r2 = speedFeedMinerEngine.compareToBaseline(
      rec({ tools: [tool({ tool_number: 1, operation_types: ["od_rough"], speed_rpm: 400 })] }),
      baseline as any,
    );
    expect(r2[0].assessment).toBe("dangerous");
  });

  it("no matching baseline entry → silently skipped (NOT a crash)", () => {
    const r = speedFeedMinerEngine.compareToBaseline(
      rec({ tools: [tool({ tool_number: 1, operation_types: ["id_finish"], speed_rpm: 1500 })] }),
      baseline as any,
    );
    expect(r.length).toBe(0);
  });
});
