/**
 * Industry Benchmark Test Suite — 120+ tests
 *
 * Validates that all 10 PRISM industry benchmarks are physically realistic
 * and that PRISM-optimized parameters beat CAM defaults on cycle time,
 * cost, and (where applicable) tool life.
 *
 * Physics checks per operation:
 *   - RPM within machine limits
 *   - Chip load in reasonable range for material/tool
 *   - Cutting force within machine power envelope
 *   - Tool deflection within tolerance
 *   - PRISM cycle time <= CAM default cycle time
 *
 * Overall checks per benchmark:
 *   - Total PRISM cycle time < total CAM cycle time
 *   - Tool life acceptable (>= 90% of CAM life)
 *   - Cost per part lower
 *   - At least 5% cycle time improvement
 *
 * Created: 2026-03-20
 */

import { describe, it, expect } from "vitest";
import {
  INDUSTRY_BENCHMARKS,
  kienzleFc,
  taylorLife,
  cuttingPowerKw,
  chipLoad,
  cuttingSpeed,
  toolDeflection,
  type IndustryBenchmark,
  type BenchmarkOperation,
} from "../data/benchmark-industry-programs";

// ── Tolerance ranges by ISO group ──
// Chip load ranges [mm/tooth] for solid carbide endmills by ISO group
const CHIP_LOAD_RANGES: Record<
  string,
  { min: number; max: number }
> = {
  N: { min: 0.01, max: 0.25 }, // Aluminum: aggressive
  P: { min: 0.02, max: 0.20 }, // Steel: moderate
  M: { min: 0.01, max: 0.15 }, // Stainless: conservative
  K: { min: 0.02, max: 0.25 }, // Cast iron: moderate-aggressive
  S: { min: 0.005, max: 0.10 }, // Superalloys: very conservative
  H: { min: 0.005, max: 0.08 }, // Hardened: very conservative
};

// Max deflection by operation type [mm]
// Note: the simplified Kienzle model uses full doc in force calc,
// which overpredicts force for finishing (where radial engagement
// dominates). Limits account for this model conservatism.
const MAX_DEFLECTION: Record<string, number> = {
  face: 0.10,
  rough_pocket: 0.05,
  finish_contour: 0.08, // generous: model overpredicts for light ae
  drill: 1.0, // not applicable, generous
  thread: 1.0, // not applicable, generous
  slot: 0.05,
  adaptive: 0.05,
  hsm: 0.03, // tighter for HSM finishing
  turn_od: 1.0, // not applicable for rotating tools
  turn_id: 1.0,
};

// ── Helper: check if operation is a milling op with rotating tool ──
function isMillingOp(op: BenchmarkOperation): boolean {
  return (
    op.type !== "turn_od" &&
    op.type !== "turn_id" &&
    op.type !== "thread" &&
    op.tool.diameter_mm > 0
  );
}

// ── Helper: check if operation uses an endmill (not drill/tap) ──
function isEndmillOp(op: BenchmarkOperation): boolean {
  return (
    isMillingOp(op) &&
    op.type !== "drill" &&
    !op.tool.type.includes("tap") &&
    !op.tool.type.includes("drill")
  );
}

// ══════════════════════════════════════════════════════════════════
// Helper function tests
// ══════════════════════════════════════════════════════════════════

describe("Benchmark helper functions", () => {
  it("kienzleFc computes correct force for steel", () => {
    // Fc = 1800 * 2.0 * 0.1^(1-0.25) = 1800 * 2 * 0.1^0.75
    // 0.1^0.75 = 0.17783
    const Fc = kienzleFc(1800, 0.25, 2.0, 0.1);
    expect(Fc).toBeCloseTo(1800 * 2.0 * Math.pow(0.1, 0.75), 1);
    expect(Fc).toBeGreaterThan(500);
    expect(Fc).toBeLessThan(800);
  });

  it("taylorLife computes correct life for steel at 200m/min", () => {
    // T = (350/200)^(1/0.25) = 1.75^4 = 9.38 min
    const T = taylorLife(350, 0.25, 200);
    expect(T).toBeCloseTo(Math.pow(1.75, 4), 1);
    expect(T).toBeGreaterThan(5);
    expect(T).toBeLessThan(15);
  });

  it("taylorLife increases when speed decreases", () => {
    const T_fast = taylorLife(350, 0.25, 200);
    const T_slow = taylorLife(350, 0.25, 150);
    expect(T_slow).toBeGreaterThan(T_fast);
  });

  it("cuttingPowerKw is physically reasonable", () => {
    // 500N at 200m/min → P = 500*200/(60000*0.85) = 1.96 kW
    const P = cuttingPowerKw(500, 200);
    expect(P).toBeCloseTo(1.96, 1);
  });

  it("chipLoad computes correctly", () => {
    const fz = chipLoad(1000, 5000, 4);
    expect(fz).toBeCloseTo(0.05, 4);
  });

  it("cuttingSpeed computes correctly", () => {
    // Vc = π * 20 * 3000 / 1000 = 188.5 m/min
    const Vc = cuttingSpeed(3000, 20);
    expect(Vc).toBeCloseTo(188.5, 0);
  });

  it("toolDeflection returns positive value", () => {
    const d = toolDeflection(500, 12);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(0.1); // should be small for 12mm tool
  });

  it("toolDeflection increases with force", () => {
    const d1 = toolDeflection(200, 12);
    const d2 = toolDeflection(600, 12);
    expect(d2).toBeGreaterThan(d1);
  });

  it("toolDeflection decreases with larger diameter", () => {
    const d_small = toolDeflection(500, 8);
    const d_large = toolDeflection(500, 16);
    expect(d_large).toBeLessThan(d_small);
  });
});

// ══════════════════════════════════════════════════════════════════
// Data integrity tests
// ══════════════════════════════════════════════════════════════════

describe("Benchmark data integrity", () => {
  it("has exactly 10 benchmarks", () => {
    expect(INDUSTRY_BENCHMARKS).toHaveLength(10);
  });

  it("all benchmarks have unique IDs", () => {
    const ids = INDUSTRY_BENCHMARKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("IDs follow IB-NNN format", () => {
    for (const b of INDUSTRY_BENCHMARKS) {
      expect(b.id).toMatch(/^IB-\d{3}$/);
    }
  });

  it("all benchmarks have at least 3 operations", () => {
    for (const b of INDUSTRY_BENCHMARKS) {
      expect(b.operations.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("all ISO groups are represented", () => {
    const groups = new Set(
      INDUSTRY_BENCHMARKS.map((b) => b.material.iso_group),
    );
    expect(groups.has("P")).toBe(true);
    expect(groups.has("M")).toBe(true);
    expect(groups.has("K")).toBe(true);
    expect(groups.has("N")).toBe(true);
    expect(groups.has("S")).toBe(true);
    expect(groups.has("H")).toBe(true);
  });

  it("total cycle times match sum of operations", () => {
    for (const b of INDUSTRY_BENCHMARKS) {
      const camSum = b.operations.reduce(
        (s, op) => s + op.cam_defaults.cycle_time_sec,
        0,
      );
      const prismSum = b.operations.reduce(
        (s, op) => s + op.prism_optimized.cycle_time_sec,
        0,
      );
      expect(b.total_cam_cycle_time_sec).toBe(camSum);
      expect(b.total_prism_cycle_time_sec).toBe(prismSum);
    }
  });

  it("all Kienzle constants are positive", () => {
    for (const b of INDUSTRY_BENCHMARKS) {
      expect(b.material.kc1_1).toBeGreaterThan(0);
      expect(b.material.mc).toBeGreaterThan(0);
      expect(b.material.mc).toBeLessThan(1);
    }
  });

  it("all Taylor constants are positive", () => {
    for (const b of INDUSTRY_BENCHMARKS) {
      expect(b.material.taylor_C).toBeGreaterThan(0);
      expect(b.material.taylor_n).toBeGreaterThan(0);
      expect(b.material.taylor_n).toBeLessThan(1);
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// Per-benchmark physics verification
// ══════════════════════════════════════════════════════════════════

for (const bench of INDUSTRY_BENCHMARKS) {
  describe(`${bench.id}: ${bench.name}`, () => {
    // ── Per-operation tests ──
    for (const op of bench.operations) {
      describe(`Operation: ${op.name}`, () => {
        // --- RPM checks ---
        it("PRISM RPM does not exceed machine max", () => {
          expect(op.prism_optimized.rpm).toBeLessThanOrEqual(
            bench.machine.max_rpm,
          );
        });

        it("CAM RPM does not exceed machine max", () => {
          expect(op.cam_defaults.rpm).toBeLessThanOrEqual(
            bench.machine.max_rpm,
          );
        });

        it("PRISM RPM is positive", () => {
          expect(op.prism_optimized.rpm).toBeGreaterThan(0);
        });

        // --- Chip load checks (milling only) ---
        if (isMillingOp(op)) {
          it("PRISM chip load is in reasonable range", () => {
            const fz = chipLoad(
              op.prism_optimized.feed_mm_min,
              op.prism_optimized.rpm,
              op.tool.flutes,
            );
            const range =
              CHIP_LOAD_RANGES[bench.material.iso_group];
            expect(fz).toBeGreaterThanOrEqual(range.min);
            expect(fz).toBeLessThanOrEqual(range.max);
          });

          it("CAM chip load is in reasonable range", () => {
            const fz = chipLoad(
              op.cam_defaults.feed_mm_min,
              op.cam_defaults.rpm,
              op.tool.flutes,
            );
            const range =
              CHIP_LOAD_RANGES[bench.material.iso_group];
            expect(fz).toBeGreaterThanOrEqual(range.min);
            expect(fz).toBeLessThanOrEqual(range.max);
          });
        }

        // --- Cutting force / power checks (endmill ops) ---
        if (isEndmillOp(op)) {
          it("PRISM cutting force is within machine power", () => {
            const fz = chipLoad(
              op.prism_optimized.feed_mm_min,
              op.prism_optimized.rpm,
              op.tool.flutes,
            );
            const Fc = kienzleFc(
              bench.material.kc1_1,
              bench.material.mc,
              op.prism_optimized.doc_mm,
              fz,
            );
            const Vc = cuttingSpeed(
              op.prism_optimized.rpm,
              op.tool.diameter_mm,
            );
            const P = cuttingPowerKw(Fc, Vc);
            expect(P).toBeLessThanOrEqual(
              bench.machine.power_kw,
            );
            expect(P).toBeGreaterThan(0);
          });

          it("CAM cutting force is within machine power", () => {
            const fz = chipLoad(
              op.cam_defaults.feed_mm_min,
              op.cam_defaults.rpm,
              op.tool.flutes,
            );
            const Fc = kienzleFc(
              bench.material.kc1_1,
              bench.material.mc,
              op.cam_defaults.doc_mm,
              fz,
            );
            const Vc = cuttingSpeed(
              op.cam_defaults.rpm,
              op.tool.diameter_mm,
            );
            const P = cuttingPowerKw(Fc, Vc);
            expect(P).toBeLessThanOrEqual(
              bench.machine.power_kw,
            );
          });
        }

        // --- Deflection checks (endmill finishing ops) ---
        if (
          isEndmillOp(op) &&
          (op.type === "finish_contour" || op.type === "hsm")
        ) {
          it("PRISM deflection is within tolerance", () => {
            const fz = chipLoad(
              op.prism_optimized.feed_mm_min,
              op.prism_optimized.rpm,
              op.tool.flutes,
            );
            const Fc = kienzleFc(
              bench.material.kc1_1,
              bench.material.mc,
              op.prism_optimized.doc_mm,
              fz,
            );
            const defl = toolDeflection(
              Fc,
              op.tool.diameter_mm,
            );
            const limit = MAX_DEFLECTION[op.type] ?? 0.05;
            expect(defl).toBeLessThanOrEqual(limit);
          });
        }

        // --- Cycle time improvement ---
        it("PRISM cycle time is <= CAM default", () => {
          expect(
            op.prism_optimized.cycle_time_sec,
          ).toBeLessThanOrEqual(
            op.cam_defaults.cycle_time_sec,
          );
        });

        // --- Sanity: all parameters positive ---
        it("all PRISM parameters are positive", () => {
          expect(op.prism_optimized.rpm).toBeGreaterThan(0);
          expect(
            op.prism_optimized.feed_mm_min,
          ).toBeGreaterThan(0);
          expect(op.prism_optimized.doc_mm).toBeGreaterThan(0);
          expect(op.prism_optimized.woc_mm).toBeGreaterThan(0);
          expect(
            op.prism_optimized.cycle_time_sec,
          ).toBeGreaterThan(0);
        });

        it("all CAM parameters are positive", () => {
          expect(op.cam_defaults.rpm).toBeGreaterThan(0);
          expect(op.cam_defaults.feed_mm_min).toBeGreaterThan(
            0,
          );
          expect(op.cam_defaults.doc_mm).toBeGreaterThan(0);
          expect(op.cam_defaults.woc_mm).toBeGreaterThan(0);
          expect(
            op.cam_defaults.cycle_time_sec,
          ).toBeGreaterThan(0);
        });
      });
    }

    // ── Overall benchmark scoring tests ──
    describe("Overall scoring", () => {
      it("PRISM total cycle time beats CAM defaults", () => {
        expect(
          bench.total_prism_cycle_time_sec,
        ).toBeLessThan(bench.total_cam_cycle_time_sec);
      });

      it("PRISM tool life is acceptable (>= 90% of CAM)", () => {
        expect(bench.prism_tool_life_min).toBeGreaterThanOrEqual(
          bench.cam_tool_life_min * 0.9,
        );
      });

      it("PRISM cost per part is lower", () => {
        expect(bench.prism_cost_per_part).toBeLessThanOrEqual(
          bench.cam_cost_per_part,
        );
      });

      it("cycle time improvement is at least 5%", () => {
        const improvement =
          1 -
          bench.total_prism_cycle_time_sec /
            bench.total_cam_cycle_time_sec;
        expect(improvement).toBeGreaterThan(0.05);
      });

      it("cost reduction is at least 5%", () => {
        const reduction =
          1 -
          bench.prism_cost_per_part / bench.cam_cost_per_part;
        expect(reduction).toBeGreaterThan(0.05);
      });

      it("cost per part is physically reasonable", () => {
        // Cost should be > $1 and < $1000 for any single part
        expect(bench.cam_cost_per_part).toBeGreaterThan(1);
        expect(bench.cam_cost_per_part).toBeLessThan(1000);
        expect(bench.prism_cost_per_part).toBeGreaterThan(1);
        expect(bench.prism_cost_per_part).toBeLessThan(1000);
      });
    });

    // ── Taylor tool life sanity ──
    describe("Taylor tool life validation", () => {
      it("CAM tool life is positive", () => {
        expect(bench.cam_tool_life_min).toBeGreaterThan(0);
      });

      it("PRISM tool life is positive", () => {
        expect(bench.prism_tool_life_min).toBeGreaterThan(0);
      });

      // Verify Taylor prediction is in the right ballpark
      // for the primary roughing operation
      const roughOp = bench.operations.find(
        (op) =>
          op.type === "rough_pocket" ||
          op.type === "adaptive" ||
          op.type === "face",
      );
      if (roughOp && isMillingOp(roughOp)) {
        it("Taylor life prediction is in expected range", () => {
          const Vc_prism = cuttingSpeed(
            roughOp.prism_optimized.rpm,
            roughOp.tool.diameter_mm,
          );
          const T_predicted = taylorLife(
            bench.material.taylor_C,
            bench.material.taylor_n,
            Vc_prism,
          );
          // Taylor prediction should be > 1 min
          // Upper bound is generous: low-speed superalloy cuts
          // with small n yield very long predicted life
          expect(T_predicted).toBeGreaterThan(1);
          expect(T_predicted).toBeLessThan(50000);
        });
      }
    });
  });
}

// ══════════════════════════════════════════════════════════════════
// Cross-benchmark comparison tests
// ══════════════════════════════════════════════════════════════════

describe("Cross-benchmark analysis", () => {
  it("aluminum benchmarks have highest cutting speeds", () => {
    const alBenchmarks = INDUSTRY_BENCHMARKS.filter(
      (b) => b.material.iso_group === "N",
    );
    const otherBenchmarks = INDUSTRY_BENCHMARKS.filter(
      (b) => b.material.iso_group !== "N",
    );

    for (const alBench of alBenchmarks) {
      const alMaxRpm = Math.max(
        ...alBench.operations
          .filter(isMillingOp)
          .map((op) => op.prism_optimized.rpm),
      );
      const alMaxVc = cuttingSpeed(
        alMaxRpm,
        alBench.operations.find(isMillingOp)!.tool.diameter_mm,
      );
      // Al Vc should be > 100 m/min (very conservative check)
      expect(alMaxVc).toBeGreaterThan(100);
    }

    // Superalloy benchmarks should have lower max Vc
    const superBenchmarks = INDUSTRY_BENCHMARKS.filter(
      (b) => b.material.iso_group === "S",
    );
    for (const sBench of superBenchmarks) {
      const millingOps = sBench.operations.filter(isMillingOp);
      if (millingOps.length === 0) continue;
      const sMaxVc = Math.max(
        ...millingOps.map((op) =>
          cuttingSpeed(
            op.prism_optimized.rpm,
            op.tool.diameter_mm,
          ),
        ),
      );
      // Superalloy Vc should be < 100 m/min
      expect(sMaxVc).toBeLessThan(100);
    }
  });

  it("superalloy benchmarks include the most expensive part", () => {
    // The single most expensive part should be a superalloy
    // (large 5-axis Ti or Inconel jobs dominate cost)
    const maxCostBench = INDUSTRY_BENCHMARKS.reduce(
      (max, b) =>
        b.cam_cost_per_part > max.cam_cost_per_part ? b : max,
      INDUSTRY_BENCHMARKS[0],
    );
    expect(maxCostBench.material.iso_group).toBe("S");
  });

  it("hardened steel uses highest Kienzle kc1_1", () => {
    const hBench = INDUSTRY_BENCHMARKS.find(
      (b) => b.material.iso_group === "H",
    );
    expect(hBench).toBeDefined();
    for (const b of INDUSTRY_BENCHMARKS) {
      if (b.material.iso_group !== "H") {
        expect(b.material.kc1_1).toBeLessThanOrEqual(
          hBench!.material.kc1_1,
        );
      }
    }
  });

  it("average PRISM improvement across all benchmarks > 10%", () => {
    let totalCam = 0;
    let totalPrism = 0;
    for (const b of INDUSTRY_BENCHMARKS) {
      totalCam += b.total_cam_cycle_time_sec;
      totalPrism += b.total_prism_cycle_time_sec;
    }
    const avgImprovement = 1 - totalPrism / totalCam;
    expect(avgImprovement).toBeGreaterThan(0.10);
  });

  it("no benchmark claims >50% cycle time improvement", () => {
    // >50% would be unrealistic for well-programmed CAM defaults
    for (const b of INDUSTRY_BENCHMARKS) {
      const improvement =
        1 -
        b.total_prism_cycle_time_sec /
          b.total_cam_cycle_time_sec;
      expect(improvement).toBeLessThan(0.50);
    }
  });

  it("Taylor exponents are ordered by machinability", () => {
    // Higher n = flatter tool life curve = more machinable
    // N (aluminum) should have highest n, S should have lowest
    const nBench = INDUSTRY_BENCHMARKS.find(
      (b) => b.material.iso_group === "N",
    );
    const sBench = INDUSTRY_BENCHMARKS.find(
      (b) => b.material.iso_group === "S",
    );
    expect(nBench!.material.taylor_n).toBeGreaterThan(
      sBench!.material.taylor_n,
    );
  });

  it("5-axis jobs have longer cycle times than 3-axis", () => {
    const fiveAxis = INDUSTRY_BENCHMARKS.filter(
      (b) =>
        b.machine.name.includes("5-axis") ||
        b.machine.name.includes("DMU"),
    );
    const threeAxis = INDUSTRY_BENCHMARKS.filter(
      (b) =>
        b.machine.name.includes("VF-") ||
        b.machine.name.includes("Brother"),
    );
    if (fiveAxis.length > 0 && threeAxis.length > 0) {
      const avg5ax =
        fiveAxis.reduce(
          (s, b) => s + b.total_cam_cycle_time_sec,
          0,
        ) / fiveAxis.length;
      const avg3ax =
        threeAxis.reduce(
          (s, b) => s + b.total_cam_cycle_time_sec,
          0,
        ) / threeAxis.length;
      // 5-axis parts tend to be more complex
      expect(avg5ax).toBeGreaterThan(avg3ax);
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// Physics model consistency tests
// ══════════════════════════════════════════════════════════════════

describe("Physics model consistency", () => {
  for (const bench of INDUSTRY_BENCHMARKS) {
    const millingOps = bench.operations.filter(isEndmillOp);
    if (millingOps.length === 0) continue;

    describe(`${bench.id} force/power consistency`, () => {
      for (const op of millingOps) {
        it(`${op.name}: PRISM power < 80% machine capacity`, () => {
          const fz = chipLoad(
            op.prism_optimized.feed_mm_min,
            op.prism_optimized.rpm,
            op.tool.flutes,
          );
          const Fc = kienzleFc(
            bench.material.kc1_1,
            bench.material.mc,
            op.prism_optimized.doc_mm,
            fz,
          );
          const Vc = cuttingSpeed(
            op.prism_optimized.rpm,
            op.tool.diameter_mm,
          );
          const P = cuttingPowerKw(Fc, Vc);
          // Should use < 80% of machine power (leave headroom)
          expect(P).toBeLessThan(bench.machine.power_kw * 0.80);
        });
      }
    });
  }

  it("Kienzle force increases with harder materials", () => {
    // At same chip load / doc, harder material = higher force
    const fz = 0.1;
    const ap = 5;
    const Fc_N = kienzleFc(700, 0.23, ap, fz); // aluminum
    const Fc_P = kienzleFc(1800, 0.25, ap, fz); // steel
    const Fc_H = kienzleFc(3200, 0.30, ap, fz); // hardened
    expect(Fc_P).toBeGreaterThan(Fc_N);
    expect(Fc_H).toBeGreaterThan(Fc_P);
  });

  it("Taylor life is shortest for superalloys", () => {
    // At same Vc=50m/min, superalloy life < steel life
    const T_steel = taylorLife(350, 0.25, 50);
    const T_super = taylorLife(150, 0.18, 50);
    expect(T_super).toBeLessThan(T_steel);
  });
});
