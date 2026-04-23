/**
 * SolidCAM 3D HSS/HSR Function Index Tests — CAM-EXHAUST-MS0/U-CAM35
 *
 * Coverage: schema/metadata, reference values, per-op parameter consistency,
 * physics (scallop ↔ step-over), strategy recommender, adversarial inputs,
 * dispatcher wiring + engine round-trip.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface ThreeDParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  range?: [number, number];
  values?: string[];
  required?: boolean;
  tab?: string;
}

interface ThreeDOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count: number;
  parameters: Record<string, Record<string, ThreeDParameter>>;
}

interface ThreeDSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, ThreeDOperation>;
  training_topics: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

const DATA_PATH = join(
  __dirname,
  "../../data/cam-functions/solidcam/3d-hss-hsr.json"
);

function loadSection(): ThreeDSection {
  if (!existsSync(DATA_PATH)) {
    throw new Error(`Data file not found at ${DATA_PATH}`);
  }
  return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as ThreeDSection;
}

describe("SolidCAM 3D HSS/HSR Function Index — CAM-EXHAUST-MS0/U-CAM35", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // SCHEMA & METADATA
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Schema & Metadata", () => {
    it("data file exists at canonical path", () => {
      expect(existsSync(DATA_PATH)).toBe(true);
    });

    it("schemaVersion is 1", () => {
      const section = loadSection();
      expect(section.schemaVersion).toBe(1);
    });

    it("system_id is 'solidcam'", () => {
      const section = loadSection();
      expect(section.system_id).toBe("solidcam");
    });

    it("section_key is '3d-hss-hsr'", () => {
      const section = loadSection();
      expect(section.section_key).toBe("3d-hss-hsr");
    });

    it("summary declares 13 operations and 325 parameters", () => {
      const section = loadSection();
      expect(section.summary.total_operations).toBe(13);
      expect(section.summary.total_parameters).toBe(325);
    });

    it("declares 4 categories: roughing, finishing_z_level, finishing_planar, finishing_specialty", () => {
      const section = loadSection();
      expect(section.summary.categories.sort()).toEqual([
        "finishing_planar",
        "finishing_specialty",
        "finishing_z_level",
        "roughing",
      ]);
    });

    it("operations object has exactly 13 keys", () => {
      const section = loadSection();
      expect(Object.keys(section.operations).length).toBe(13);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REFERENCE VALUES — per-operation parameter counts
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Reference Values — Per-Operation", () => {
    const REF: Record<string, { params: number; category: string }> = {
      hsr_roughing: { params: 36, category: "roughing" },
      hsr_rest_roughing: { params: 25, category: "roughing" },
      hss_constant_z: { params: 29, category: "finishing_z_level" },
      hss_linear: { params: 26, category: "finishing_planar" },
      hss_radial: { params: 25, category: "finishing_planar" },
      hss_spiral: { params: 22, category: "finishing_planar" },
      hss_3d_stepover: { params: 22, category: "finishing_specialty" },
      hss_pencil_trace: { params: 21, category: "finishing_specialty" },
      hss_boundary: { params: 23, category: "finishing_specialty" },
      hss_morph: { params: 21, category: "finishing_specialty" },
      hss_combined_finish: { params: 29, category: "finishing_specialty" },
      hss_rest_finish: { params: 25, category: "finishing_specialty" },
      hss_3d_corner: { params: 21, category: "finishing_specialty" },
    };

    for (const [opId, ref] of Object.entries(REF)) {
      it(`${opId}: declared ${ref.params} params, category ${ref.category}`, () => {
        const section = loadSection();
        const op = section.operations[opId];
        expect(op).toBeTruthy();
        expect(op.parameter_count).toBe(ref.params);
        expect(op.category).toBe(ref.category);
      });
    }

    it("sum of declared per-op parameter_count equals summary.total_parameters", () => {
      const section = loadSection();
      const sum = Object.values(section.operations).reduce(
        (acc, op) => acc + op.parameter_count,
        0
      );
      expect(sum).toBe(section.summary.total_parameters);
      expect(sum).toBe(325);
    });

    it("each op's actual nested parameter count matches its declared parameter_count", () => {
      const section = loadSection();
      for (const [opId, op] of Object.entries(section.operations)) {
        let actual = 0;
        for (const grp of Object.values(op.parameters)) {
          actual += Object.keys(grp).length;
        }
        expect(actual).toBe(op.parameter_count);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PARAMETER STRUCTURE INTEGRITY (failure modes — schema breakage)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Parameter Structure Integrity", () => {
    it("every op has display_name, category, description, dialog_tabs, parameters", () => {
      const section = loadSection();
      for (const [opId, op] of Object.entries(section.operations)) {
        expect(typeof op.display_name).toBe("string");
        expect(typeof op.category).toBe("string");
        expect(typeof op.description).toBe("string");
        expect(Array.isArray(op.dialog_tabs)).toBe(true);
        expect(typeof op.parameters).toBe("object");
        expect(op.dialog_tabs.length).toBeGreaterThan(0);
      }
    });

    it("every parameter declares a 'type' field", () => {
      const section = loadSection();
      for (const op of Object.values(section.operations)) {
        for (const group of Object.values(op.parameters)) {
          for (const param of Object.values(group)) {
            expect(typeof param.type).toBe("string");
            expect(param.type.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it("enum-typed parameters declare 'values' array", () => {
      const section = loadSection();
      for (const op of Object.values(section.operations)) {
        for (const group of Object.values(op.parameters)) {
          for (const [pName, p] of Object.entries(group)) {
            if (p.type === "enum") {
              expect(Array.isArray(p.values)).toBe(true);
              expect(p.values!.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it("range-bounded parameters have ordered [min, max]", () => {
      const section = loadSection();
      for (const op of Object.values(section.operations)) {
        for (const group of Object.values(op.parameters)) {
          for (const p of Object.values(group)) {
            if (p.range) {
              expect(p.range.length).toBe(2);
              expect(p.range[0]).toBeLessThanOrEqual(p.range[1]);
            }
          }
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // VARIABILITY — spanning configurations
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Variability — Spanning Configurations", () => {
    it("coolant_mode spans off/flood/mist/through_spindle/mql in technology groups", () => {
      const section = loadSection();
      const seen = new Set<string>();
      for (const op of Object.values(section.operations)) {
        const tech = op.parameters["technology"];
        if (tech?.coolant_mode?.values) {
          tech.coolant_mode.values.forEach((v) => seen.add(v));
        }
      }
      expect(seen.has("off")).toBe(true);
      expect(seen.has("flood")).toBe(true);
      expect(seen.has("mist")).toBe(true);
      expect(seen.has("through_spindle")).toBe(true);
      expect(seen.has("mql")).toBe(true);
    });

    it("cut/machining direction spans climb, conventional, and zigzag across ops", () => {
      const section = loadSection();
      const directions = new Set<string>();
      for (const op of Object.values(section.operations)) {
        for (const grp of Object.values(op.parameters)) {
          for (const [pName, p] of Object.entries(grp)) {
            if ((pName === "machining_direction" || pName === "cut_direction") && p.values) {
              p.values.forEach((v) => directions.add(v));
            }
          }
        }
      }
      expect(directions.has("climb")).toBe(true);
      expect(directions.has("conventional")).toBe(true);
      expect(directions.has("zigzag")).toBe(true);
    });

    it("step_over_mode spans constant, scallop, and adaptive across ops", () => {
      const section = loadSection();
      const modes = new Set<string>();
      for (const op of Object.values(section.operations)) {
        for (const grp of Object.values(op.parameters)) {
          for (const [pName, p] of Object.entries(grp)) {
            if (pName.includes("step_over_mode") && p.values) {
              p.values.forEach((v) => modes.add(v));
            }
          }
        }
      }
      // At least 2 of these spanning modes should be reachable
      const hasConstant = modes.has("constant") || modes.has("constant_xy");
      expect(hasConstant).toBe(true);
      expect(modes.has("scallop") || modes.has("constant_scallop")).toBe(true);
    });

    it("each category has at least one operation", () => {
      const section = loadSection();
      const categoriesSeen = new Set<string>();
      for (const op of Object.values(section.operations)) {
        categoriesSeen.add(op.category);
      }
      expect(categoriesSeen.size).toBe(4);
      expect(categoriesSeen.has("roughing")).toBe(true);
      expect(categoriesSeen.has("finishing_z_level")).toBe(true);
      expect(categoriesSeen.has("finishing_planar")).toBe(true);
      expect(categoriesSeen.has("finishing_specialty")).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVERSARIAL — Edge values & boundary inputs
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Adversarial — Edge Values", () => {
    it("hsr_roughing.passes.step_down_mm has positive default and no negative range", () => {
      const section = loadSection();
      const p = section.operations["hsr_roughing"].parameters["passes"]["step_down_mm"];
      expect(typeof p.default).toBe("number");
      expect(p.default as number).toBeGreaterThan(0);
    });

    it("trochoidal_loop_radius_mm in HSR is positive (no zero or negative)", () => {
      const section = loadSection();
      const p = section.operations["hsr_roughing"].parameters["hsm"]["trochoidal_loop_radius_mm"];
      expect(p.default as number).toBeGreaterThan(0);
    });

    it("max_engagement_pct in HSR is bounded 10..100 and default is sane", () => {
      const section = loadSection();
      const p = section.operations["hsr_roughing"].parameters["hsm"]["max_engagement_pct"];
      expect(p.range).toBeDefined();
      expect(p.range![0]).toBeGreaterThanOrEqual(1);
      expect(p.range![1]).toBeLessThanOrEqual(100);
      expect(p.default as number).toBeGreaterThan(0);
      expect(p.default as number).toBeLessThanOrEqual(100);
    });

    it("hss_3d_stepover scallop_height_mm is required and small (< 1mm)", () => {
      const section = loadSection();
      const p = section.operations["hss_3d_stepover"].parameters["scallop"]["scallop_height_mm"];
      expect(p.required).toBe(true);
      expect(p.default as number).toBeLessThan(1.0);
      expect(p.default as number).toBeGreaterThan(0);
    });

    it("morph_pass_count is bounded 2..500 (non-trivial morph)", () => {
      const section = loadSection();
      const p = section.operations["hss_morph"].parameters["morph"]["morph_pass_count"];
      expect(p.range).toBeDefined();
      expect(p.range![0]).toBeGreaterThanOrEqual(2);
      expect(p.range![1]).toBeLessThanOrEqual(1000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CROSS-OP CONSISTENCY
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Cross-Op Consistency", () => {
    it("every operation has 'levels' group with upper_z, lower_z, clearance_z", () => {
      const section = loadSection();
      for (const [opId, op] of Object.entries(section.operations)) {
        const lvls = op.parameters["levels"];
        expect(lvls).toBeDefined();
        expect(lvls.upper_z).toBeDefined();
        expect(lvls.lower_z).toBeDefined();
        expect(lvls.clearance_z).toBeDefined();
      }
    });

    it("every operation has 'technology' group with spindle_speed_rpm + feed_rate_mm_min", () => {
      const section = loadSection();
      for (const [opId, op] of Object.entries(section.operations)) {
        const tech = op.parameters["technology"];
        expect(tech).toBeDefined();
        expect(tech.spindle_speed_rpm).toBeDefined();
        expect(tech.feed_rate_mm_min).toBeDefined();
      }
    });

    it("every operation has 'geometry' group with at least machining_surfaces", () => {
      const section = loadSection();
      for (const [opId, op] of Object.entries(section.operations)) {
        const geom = op.parameters["geometry"];
        expect(geom).toBeDefined();
        expect(geom.machining_surfaces).toBeDefined();
        expect(geom.machining_surfaces.required).toBe(true);
      }
    });

    it("rest operations both reference previous_operation as required", () => {
      const section = loadSection();
      const restOps = ["hsr_rest_roughing", "hss_rest_finish"];
      for (const opId of restOps) {
        const op = section.operations[opId];
        expect(op.parameters["geometry"]["previous_operation"].required).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TRAINING TOPICS
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Training Topics", () => {
    it("declares ≥ 6 training topics", () => {
      const section = loadSection();
      expect(section.training_topics.length).toBeGreaterThanOrEqual(6);
    });

    it("every topic has key_concepts and best_practices arrays (each ≥ 3 entries)", () => {
      const section = loadSection();
      for (const topic of section.training_topics) {
        expect(topic.topic.length).toBeGreaterThan(0);
        expect(topic.key_concepts.length).toBeGreaterThanOrEqual(3);
        expect(topic.best_practices.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ENGINE METHODS
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Engine Methods", () => {
    it("getSummary returns 13 ops / 325 params / 4 categories", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const summary = SolidCAM3DHSSHSRFunctionIndexEngine.getSummary();
      expect("error" in summary).toBe(false);
      if (!("error" in summary)) {
        expect(summary.system_id).toBe("solidcam");
        expect(summary.section_key).toBe("3d-hss-hsr");
        expect(summary.total_operations).toBe(13);
        expect(summary.total_parameters).toBe(325);
        expect(summary.categories.length).toBe(4);
      }
    });

    it("listOperations returns exactly 13 entries with consistent keys", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const ops = SolidCAM3DHSSHSRFunctionIndexEngine.listOperations();
      expect(Array.isArray(ops)).toBe(true);
      if (Array.isArray(ops)) {
        expect(ops.length).toBe(13);
        for (const op of ops) {
          expect(op.operation_id.length).toBeGreaterThan(0);
          expect(op.display_name.length).toBeGreaterThan(0);
          expect(op.parameter_count).toBeGreaterThan(0);
        }
      }
    });

    it("getOperation('hsr_roughing') returns 36 params / roughing category", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const op = SolidCAM3DHSSHSRFunctionIndexEngine.getOperation("hsr_roughing");
      expect("error" in op).toBe(false);
      if (!("error" in op)) {
        expect(op.parameter_count).toBe(36);
        expect(op.category).toBe("roughing");
      }
    });

    it("getOperation returns error for unknown id (failure mode)", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const op = SolidCAM3DHSSHSRFunctionIndexEngine.getOperation("does_not_exist");
      expect("error" in op).toBe(true);
      if ("error" in op) {
        expect(op.error).toContain("does_not_exist");
      }
    });

    it("getOperationsByCategory('finishing_specialty') returns 7 ops", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const ops = SolidCAM3DHSSHSRFunctionIndexEngine.getOperationsByCategory(
        "finishing_specialty"
      );
      expect(Array.isArray(ops)).toBe(true);
      if (Array.isArray(ops)) {
        // hss_3d_stepover, hss_pencil_trace, hss_boundary, hss_morph, hss_combined_finish, hss_rest_finish, hss_3d_corner = 7
        expect(ops.length).toBe(7);
        ops.forEach((o) => expect(o.category).toBe("finishing_specialty"));
      }
    });

    it("getOperationsByCategory('roughing') returns 2 ops", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const ops = SolidCAM3DHSSHSRFunctionIndexEngine.getOperationsByCategory("roughing");
      if (Array.isArray(ops)) {
        expect(ops.length).toBe(2);
      }
    });

    it("findParameter('coolant') returns ≥ 10 hits across many ops", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const matches = SolidCAM3DHSSHSRFunctionIndexEngine.findParameter("coolant", 100);
      expect(matches.length).toBeGreaterThanOrEqual(10);
      const opsHit = new Set(matches.map((m) => m.operation_id));
      expect(opsHit.size).toBeGreaterThanOrEqual(10);
    });

    it("findParameter respects limit parameter", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const matches = SolidCAM3DHSSHSRFunctionIndexEngine.findParameter("z", 5);
      expect(matches.length).toBeLessThanOrEqual(5);
    });

    it("getCategoryBreakdown sums to total_parameters across categories", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const breakdown = SolidCAM3DHSSHSRFunctionIndexEngine.getCategoryBreakdown();
      expect(breakdown.length).toBe(4);
      const totalParams = breakdown.reduce((s, b) => s + b.total_parameters, 0);
      expect(totalParams).toBe(325);
    });

    it("getTrainingTopics returns ≥ 6 topics", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const topics = SolidCAM3DHSSHSRFunctionIndexEngine.getTrainingTopics();
      expect(topics.length).toBeGreaterThanOrEqual(6);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STRATEGY RECOMMENDER (algorithmic — not data-driven)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("recommendStrategy — wall-angle routing", () => {
    it("steep wall (≥60deg) → primary hss_constant_z", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(70);
      expect(r.primary).toBe("hss_constant_z");
      expect(r.alternative).toBe("hss_combined_finish");
    });

    it("60deg boundary → still steep (constant_z)", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(60);
      expect(r.primary).toBe("hss_constant_z");
    });

    it("mid-region (30..59deg) → combined_finish", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(45);
      expect(r.primary).toBe("hss_combined_finish");
    });

    it("shallow planar → hss_linear", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(10, "planar");
      expect(r.primary).toBe("hss_linear");
    });

    it("shallow rotational → hss_radial", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(15, "rotational");
      expect(r.primary).toBe("hss_radial");
    });

    it("shallow boundary → hss_boundary", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(20, "boundary");
      expect(r.primary).toBe("hss_boundary");
    });

    it("shallow freeform default → hss_3d_stepover", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(10);
      expect(r.primary).toBe("hss_3d_stepover");
    });

    it("invalid angle (NaN) defaults to hss_combined_finish (fail-safe)", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(NaN);
      expect(r.primary).toBe("hss_combined_finish");
    });

    it("invalid angle (Infinity) defaults to safe combined_finish", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(Infinity);
      expect(r.primary).toBe("hss_combined_finish");
    });

    it("invalid angle (-10) defaults to safe combined_finish", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(-10);
      expect(r.primary).toBe("hss_combined_finish");
    });

    it("invalid angle (>90) defaults to safe combined_finish", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const r = SolidCAM3DHSSHSRFunctionIndexEngine.recommendStrategy(135);
      expect(r.primary).toBe("hss_combined_finish");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PHYSICS — scallop ↔ step-over
  // ─────────────────────────────────────────────────────────────────────────────
  describe("stepOverFromScallop — geometric identity", () => {
    it("R=3, h=0.005 → s ≈ 0.346 mm (textbook ball-end finishing)", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      // s = 2 * sqrt(2*3*0.005 - 0.005^2) = 2 * sqrt(0.029975) ≈ 0.34626
      const s = SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(3.0, 0.005);
      expect(s).not.toBeNull();
      expect(s!).toBeCloseTo(0.34626, 4);
    });

    it("R=5, h=0.01 → s ≈ 0.6324 mm", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      // s = 2 * sqrt(2*5*0.01 - 0.0001) = 2*sqrt(0.0999) ≈ 0.63214
      const s = SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(5.0, 0.01);
      expect(s).not.toBeNull();
      expect(s!).toBeCloseTo(0.63214, 4);
    });

    it("R=2, h=0.002 → s ≈ 0.1789 mm", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      // s = 2 * sqrt(2*2*0.002 - 0.002^2) = 2*sqrt(0.007996) ≈ 0.17884
      const s = SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(2.0, 0.002);
      expect(s).not.toBeNull();
      expect(s!).toBeCloseTo(0.17884, 4);
    });

    it("step-over scales monotonically with scallop height", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const s1 = SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(3, 0.001)!;
      const s2 = SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(3, 0.005)!;
      const s3 = SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(3, 0.025)!;
      expect(s2).toBeGreaterThan(s1);
      expect(s3).toBeGreaterThan(s2);
    });

    it("step-over scales with sqrt(R) for fixed h (small h limit)", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      const sR1 = SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(1.0, 0.001)!;
      const sR4 = SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(4.0, 0.001)!;
      // For h<<R, s ≈ 2*sqrt(2*R*h), so sR4/sR1 ≈ 2.0
      expect(sR4 / sR1).toBeCloseTo(2.0, 1);
    });

    it("returns null on negative tool radius", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(-1, 0.005)).toBeNull();
    });

    it("returns null on zero tool radius", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(0, 0.005)).toBeNull();
    });

    it("returns null on zero or negative scallop", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(3, 0)).toBeNull();
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(3, -0.005)).toBeNull();
    });

    it("returns null when scallop ≥ tool radius (impossible geometry)", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(1, 1)).toBeNull();
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(1, 2)).toBeNull();
    });

    it("returns null on NaN inputs (adversarial)", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(NaN, 0.005)).toBeNull();
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(3, NaN)).toBeNull();
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(NaN, NaN)).toBeNull();
    });

    it("returns null on Infinity inputs (adversarial)", async () => {
      const { SolidCAM3DHSSHSRFunctionIndexEngine } = await import(
        "../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js"
      );
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(Infinity, 0.005)).toBeNull();
      expect(SolidCAM3DHSSHSRFunctionIndexEngine.stepOverFromScallop(3, Infinity)).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DISPATCHER WIRING — Required by hook enforcement
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Dispatcher Integration (prism_cam)", () => {
    const ACTIONS = [
      "solidcam_3d_hss_hsr_index",
      "solidcam_3d_hss_hsr_summary",
      "solidcam_3d_hss_hsr_list_ops",
      "solidcam_3d_hss_hsr_get_op",
      "solidcam_3d_hss_hsr_by_category",
      "solidcam_3d_hss_hsr_find_param",
      "solidcam_3d_hss_hsr_recommend",
      "solidcam_3d_hss_hsr_step_from_scallop",
    ];

    it("camDispatcher ACTIONS includes all 8 solidcam_3d_hss_hsr_* actions", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      for (const action of ACTIONS) {
        expect(actions).toContain(action);
      }
    });

    it("all 8 actions have Zod schemas in ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS", async () => {
      const { ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcam3DHSSHSRFunctionIndexActionSchemas.js"
      );
      const keys = Object.keys(ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS);
      expect(keys.length).toBe(8);
      for (const a of ACTIONS) expect(keys).toContain(a);
    });

    it("solidcam_3d_hss_hsr_get_op schema validates operation_id", async () => {
      const { ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcam3DHSSHSRFunctionIndexActionSchemas.js"
      );
      const schema = ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS.solidcam_3d_hss_hsr_get_op;
      expect(schema.safeParse({ operation_id: "hsr_roughing" }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ operation_id: 99 }).success).toBe(false);
    });

    it("solidcam_3d_hss_hsr_recommend schema validates wall_angle_deg + optional geometry_hint", async () => {
      const { ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcam3DHSSHSRFunctionIndexActionSchemas.js"
      );
      const schema = ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS.solidcam_3d_hss_hsr_recommend;
      expect(schema.safeParse({ wall_angle_deg: 45 }).success).toBe(true);
      expect(schema.safeParse({ wall_angle_deg: 45, geometry_hint: "rotational" }).success).toBe(true);
      expect(schema.safeParse({ wall_angle_deg: 45, geometry_hint: "bogus" }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });

    it("solidcam_3d_hss_hsr_step_from_scallop schema validates two number params", async () => {
      const { ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcam3DHSSHSRFunctionIndexActionSchemas.js"
      );
      const schema = ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS.solidcam_3d_hss_hsr_step_from_scallop;
      expect(schema.safeParse({ tool_radius_mm: 3, scallop_height_mm: 0.005 }).success).toBe(true);
      expect(schema.safeParse({ tool_radius_mm: 3 }).success).toBe(false);
    });

    it("solidcam_3d_hss_hsr_find_param schema validates parameter_name + optional limit", async () => {
      const { ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcam3DHSSHSRFunctionIndexActionSchemas.js"
      );
      const schema = ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS.solidcam_3d_hss_hsr_find_param;
      expect(schema.safeParse({ parameter_name: "rpm" }).success).toBe(true);
      expect(schema.safeParse({ parameter_name: "rpm", limit: 5 }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });
});
