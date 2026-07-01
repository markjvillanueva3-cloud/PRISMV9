import { describe, it, expect } from "vitest";
import {
  PostProcessorMatrixTestHarnessEngine,
  postProcessorMatrixTestHarnessEngine,
  type MatrixCell,
  type GeneratorControllerFamily,
  type MatrixMachineConfig,
} from "../engines/PostProcessorMatrixTestHarnessEngine.js";

describe("PostProcessorMatrixTestHarnessEngine", () => {
  const eng = postProcessorMatrixTestHarnessEngine;

  describe("generateMatrix", () => {
    it("produces a full default matrix when no dimensions are passed", () => {
      const cells = eng.generateMatrix();
      // 9 controllers × 8 machine_configs × 3 default cams × 2 units = 432 cells
      expect(cells.length).toBe(9 * 8 * 3 * 2);
    });

    it("respects narrow dimension overrides (no silent expansion)", () => {
      const cells = eng.generateMatrix({
        controllers: ["fanuc"],
        machine_configs: ["3_axis_vmc"],
        cam_systems: ["mastercam"],
        units: ["inch"],
      });
      expect(cells.length).toBe(1);
      expect(cells[0].controller).toBe("fanuc");
      expect(cells[0].machine_config).toBe("3_axis_vmc");
    });

    it("supports a 2×2 minimal matrix", () => {
      const cells = eng.generateMatrix({
        controllers: ["fanuc", "haas"],
        machine_configs: ["3_axis_vmc", "5_axis_table_table"],
        cam_systems: ["mastercam"],
        units: ["inch"],
      });
      expect(cells.length).toBe(4);
    });
  });

  describe("runCell — dialect coherence", () => {
    it("PASS for a clean fanuc 3-axis cell", () => {
      const cell: MatrixCell = {
        controller: "fanuc",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
      };
      const result = eng.runCell(cell);
      expect(result.verdict).toBe("pass");
      expect(result.generated_ok).toBe(true);
      expect(result.dialect_audit?.verdict).toBe("audit_pass");
      expect(result.capability_violations).toHaveLength(0);
    });

    it("BLOCK when a foreign macro is injected (cross-vendor leakage)", () => {
      const cell: MatrixCell = {
        controller: "fanuc",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
      };
      const result = eng.runCell(cell, () => ({
        code: "G90 G54\nVNC100 = 5\nM30",  // Okuma macro in Fanuc post
      }));
      expect(result.verdict).toBe("block");
      expect(result.dialect_audit?.critical_count).toBeGreaterThan(0);
    });

    it("dialect_block precedes capability_block (P0 — safety > correctness)", () => {
      // Joint violation: BOTH a capability gating issue (tcp_5axis on 3-axis)
      // AND a cross-vendor macro leak (Okuma VNC in a Fanuc post). The safety
      // signal (dialect leakage = potential crash) must dominate the verdict.
      const cell: MatrixCell = {
        controller: "fanuc",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
        features: { tcp_5axis: true },
      };
      const result = eng.runCell(cell, () => ({
        code: "G90 G54\nVNC100 = 5\nM30",
      }));
      expect(result.verdict).toBe("block");
      // Dialect-block verdict must surface — not silently dropped behind capability-block.
      expect(result.dialect_audit?.verdict).toBe("audit_block");
      expect(result.dialect_audit?.critical_count).toBeGreaterThan(0);
      // Capability violations still recorded (never silently dropped).
      expect(result.capability_violations.length).toBeGreaterThan(0);
      // And notes mention the also-failing capability.
      expect(result.notes.some((n) => n.includes("capability_violations"))).toBe(true);
    });

    it("dialect leakage is caught on every covered controller", () => {
      // Each controller, when fed a canonical foreign-controller token, must
      // BLOCK. Catches regressions where DialectValidator stops detecting a
      // specific cross-vendor signature.
      const cases: Array<[GeneratorControllerFamily, string]> = [
        ["fanuc",          "G90 G54\nVNC100 = 5\nM30"],                      // Okuma macro in Fanuc
        ["okuma_osp",      "G90 G54\nG65 P9810 X10\nM30"],                    // Fanuc macro in Okuma
        ["haas",           "G90\nCYCL DEF 200 DRILLING\nM30"],                // Heidenhain in Haas
        ["mazak_mazatrol", "G90\nVNC50 = 1\nM30"],                            // Okuma in Mazak
        ["heidenhain_tnc", "G90 G54\nM30"],                                   // Fanuc G-codes in Heidenhain
        ["siemens_840d",   "G90\nG65 P9810\nM30"],                            // Fanuc macro in Siemens
        ["fagor",          "G90\nVNC100 = 5\nM30"],                           // Okuma in Fagor
      ];
      for (const [controller, code] of cases) {
        const cell: MatrixCell = {
          controller, machine_config: "3_axis_vmc",
          cam_system: "mastercam", units: "inch",
        };
        const r = eng.runCell(cell, () => ({ code }));
        expect(r.verdict, `controller=${controller} must BLOCK on injected foreign token`).toBe("block");
        expect(r.dialect_audit?.critical_count, `controller=${controller} dialect violations`).toBeGreaterThan(0);
      }
    });

    it("FAIL when the generator returns empty code", () => {
      const cell: MatrixCell = {
        controller: "haas",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
      };
      const result = eng.runCell(cell, () => ({ code: "" }));
      expect(result.verdict).toBe("fail");
      expect(result.generated_ok).toBe(false);
      expect(result.generation_error).toMatch(/empty/i);
    });

    it("FAIL when the generator returns whitespace-only code", () => {
      const cell: MatrixCell = {
        controller: "haas",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
      };
      const result = eng.runCell(cell, () => ({ code: "   \n\t  " }));
      expect(result.verdict).toBe("fail");
      expect(result.generation_error).toMatch(/whitespace/i);
    });

    it("FAIL with size guard when generator returns absurdly large code (DoS guard)", () => {
      const cell: MatrixCell = {
        controller: "haas",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
      };
      const huge = "G1 X1.\n".repeat(800000); // ~5.6 MB
      const result = eng.runCell(cell, () => ({ code: huge }));
      expect(result.verdict).toBe("fail");
      expect(result.generation_error).toMatch(/cap/i);
    });

    it("FAIL when generator returns non-string code field", () => {
      const cell: MatrixCell = {
        controller: "haas",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
      };
      // Intentional bad shape — tests the typeof guard
      const result = eng.runCell(cell, () => ({ code: 42 as unknown as string }));
      expect(result.verdict).toBe("fail");
      expect(result.generation_error).toMatch(/non-string/i);
    });

    it("FAIL when the generator throws", () => {
      const cell: MatrixCell = {
        controller: "haas",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
      };
      const result = eng.runCell(cell, () => {
        throw new Error("controller knowledge missing");
      });
      expect(result.verdict).toBe("fail");
      expect(result.generation_error).toContain("controller knowledge missing");
    });

    it("BLOCK on capability gating: tcp_5axis on a 3-axis machine", () => {
      const cell: MatrixCell = {
        controller: "fanuc",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
        features: { tcp_5axis: true },
      };
      const result = eng.runCell(cell);
      expect(result.verdict).toBe("block");
      expect(result.capability_violations[0]).toMatch(/tcp_5axis/);
    });

    it("BLOCK on capability gating: tilted_work_plane on 3-axis", () => {
      const cell: MatrixCell = {
        controller: "fanuc",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
        features: { tilted_work_plane: true },
      };
      const result = eng.runCell(cell);
      expect(result.verdict).toBe("block");
      expect(result.capability_violations[0]).toMatch(/tilted_work_plane/);
    });

    it("PASS for tcp_5axis on a 5-axis machine", () => {
      const cell: MatrixCell = {
        controller: "fanuc",
        machine_config: "5_axis_table_table",
        cam_system: "mastercam",
        units: "inch",
        features: { tcp_5axis: true },
      };
      const result = eng.runCell(cell);
      expect(result.verdict).toBe("pass");
      expect(result.capability_violations).toHaveLength(0);
    });

    it("SKIP for controllers without DialectValidator coverage (hurco)", () => {
      const cell: MatrixCell = {
        controller: "hurco_winmax",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
      };
      const result = eng.runCell(cell);
      expect(result.verdict).toBe("skip");
      expect(result.notes.some((n) => n.includes("no_validator_coverage"))).toBe(true);
    });

    it("PASS for each validator-covered controller (synthetic default)", () => {
      const covered: GeneratorControllerFamily[] = [
        "fanuc", "okuma_osp", "haas", "mazak_mazatrol",
        "heidenhain_tnc", "siemens_840d", "fagor",
      ];
      for (const c of covered) {
        const cell: MatrixCell = {
          controller: c,
          machine_config: "3_axis_vmc",
          cam_system: "mastercam",
          units: "inch",
        };
        const r = eng.runCell(cell);
        expect(r.verdict).withContext(`controller=${c}`).toBe("pass");
      }
    });
  });

  describe("runMatrix — aggregation", () => {
    it("aggregates per-controller and per-machine_config tallies", () => {
      const cells = eng.generateMatrix({
        controllers: ["fanuc", "haas", "hurco_winmax"],
        machine_configs: ["3_axis_vmc", "5_axis_table_table"],
        cam_systems: ["mastercam"],
        units: ["inch"],
      });
      const report = eng.runMatrix({ cells });

      expect(report.total_cells).toBe(6);
      expect(report.by_controller["fanuc"].total).toBe(2);
      expect(report.by_controller["haas"].total).toBe(2);
      expect(report.by_controller["hurco_winmax"].total).toBe(2);
      expect(report.by_controller["hurco_winmax"].skip).toBe(2);
      expect(report.by_machine_config["3_axis_vmc"].total).toBe(3);
    });

    it("pass_rate excludes skips from the denominator", () => {
      const cells = eng.generateMatrix({
        controllers: ["fanuc", "hurco_winmax"], // hurco = skip (no validator)
        machine_configs: ["3_axis_vmc"],
        cam_systems: ["mastercam"],
        units: ["inch"],
      });
      const report = eng.runMatrix({ cells });
      // 1 pass (fanuc) + 1 skip (hurco) → pass_rate = 1.0 (skips excluded)
      expect(report.pass_rate.value).toBe(1.0);
      expect(report.by_verdict.skip).toBe(1);
      expect(report.by_verdict.pass).toBe(1);
    });

    it("pass_rate confidence scales with non-skip sample size (sqrt curve, not saturating early)", () => {
      const small = eng.runMatrix({
        controllers: ["fanuc"],
        machine_configs: ["3_axis_vmc"],
        cam_systems: ["mastercam"],
        units: ["inch"],
      });
      const medium = eng.runMatrix({
        controllers: ["fanuc"],
        machine_configs: Object.keys(({
          "3_axis_vmc": 0, "4_axis_rotary_table": 0, "4_axis_trunnion": 0,
          "5_axis_table_table": 0, "5_axis_head_head": 0, "5_axis_table_head": 0,
          mill_turn: 0, swiss_type: 0,
        })) as MatrixMachineConfig[],
        cam_systems: ["mastercam", "fusion360", "hypermill"],
        units: ["inch", "metric"],
      });
      expect(small.pass_rate.confidence!).toBeLessThan(medium.pass_rate.confidence!);
      // 48 cells (medium) on a 432-cell full default is sqrt(48/432) ≈ 0.333 — NOT 1.0.
      // Confidence saturating at the full-matrix size only (R12 honesty).
      expect(medium.pass_rate.confidence!).toBeLessThan(0.5);
      expect(medium.pass_rate.confidence!).toBeGreaterThan(0.2);
    });

    it("pass_rate.uncertainty is the Wilson 95% half-width (well-formed for clean pass)", () => {
      const report = eng.runMatrix({
        controllers: ["fanuc"],
        machine_configs: ["3_axis_vmc", "5_axis_table_table"],
        cam_systems: ["mastercam"],
        units: ["inch"],
      });
      // 2 cells, both pass → p=1, Wilson half-width = 1.96 * sqrt(0/2) = 0
      expect(report.pass_rate.value).toBe(1.0);
      expect(report.pass_rate.uncertainty).toBe(0);
      // Mixed: inject a foreign macro on one cell → p=0.5, n=2.
      const mixed = eng.runMatrix({
        controllers: ["fanuc"],
        machine_configs: ["3_axis_vmc", "5_axis_table_table"],
        cam_systems: ["mastercam"],
        units: ["inch"],
        generate: (c) =>
          c.machine_config === "3_axis_vmc"
            ? { code: "G90\nVNC100 = 5\nM30" }  // leak
            : { code: "G90 G54\nM30" },          // clean
      });
      expect(mixed.pass_rate.value).toBe(0.5);
      // Wilson 95% half-width on p=0.5, n=2: 1.96 * sqrt(0.25/2) ≈ 0.693
      expect(mixed.pass_rate.uncertainty).toBeGreaterThan(0.6);
      expect(mixed.pass_rate.uncertainty).toBeLessThan(0.8);
    });

    it("returns 0 pass_rate when every cell skips", () => {
      const report = eng.runMatrix({
        controllers: ["hurco_winmax"],
        machine_configs: ["3_axis_vmc"],
        cam_systems: ["mastercam"],
        units: ["inch"],
      });
      expect(report.pass_rate.value).toBe(0);
      expect(report.pass_rate.confidence).toBe(0);
    });

    it("source string identifies the engine version (telemetry stable)", () => {
      const report = eng.runMatrix({
        controllers: ["fanuc"],
        machine_configs: ["3_axis_vmc"],
        cam_systems: ["mastercam"],
        units: ["inch"],
      });
      expect(report.source).toContain("PostProcessorMatrixTestHarnessEngine");
      expect(report.source).toMatch(/v\d+\.\d+\.\d+/);
    });
  });

  describe("class API", () => {
    it("singleton + new() instances behave identically", () => {
      const fresh = new PostProcessorMatrixTestHarnessEngine();
      const cell: MatrixCell = {
        controller: "fanuc",
        machine_config: "3_axis_vmc",
        cam_system: "mastercam",
        units: "inch",
      };
      const a = eng.runCell(cell);
      const b = fresh.runCell(cell);
      expect(a.verdict).toBe(b.verdict);
      expect(a.dialect_audit?.verdict).toBe(b.dialect_audit?.verdict);
    });
  });
});
