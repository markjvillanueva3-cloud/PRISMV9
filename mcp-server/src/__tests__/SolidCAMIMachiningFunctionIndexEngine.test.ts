/**
 * SolidCAM iMachining Function Index Tests — CAM-EXHAUST-MS0/U-CAM34
 *
 * Coverage: schema/metadata, reference values, parameter consistency,
 * adversarial inputs, dispatcher wiring + engine round-trip.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface IMParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  range?: [number, number];
  values?: string[];
  required?: boolean;
  tab?: string;
}

interface IMOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count: number;
  parameters: Record<string, Record<string, IMParameter>>;
}

interface IMSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, IMOperation>;
  training_topics: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

const DATA_PATH = join(
  __dirname,
  "../../data/cam-functions/solidcam/imachining.json"
);

function loadIMachining(): IMSection {
  return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as IMSection;
}

describe("SolidCAM iMachining Function Index", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // HAPPY PATH — Schema & Reference Values
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Schema & Metadata", () => {
    it("file exists at expected path", () => {
      expect(existsSync(DATA_PATH)).toBe(true);
    });

    it("loads valid JSON without parse error", () => {
      expect(() => loadIMachining()).not.toThrow();
    });

    it("schemaVersion equals 1", () => {
      expect(loadIMachining().schemaVersion).toBe(1);
    });

    it("system_id equals 'solidcam'", () => {
      expect(loadIMachining().system_id).toBe("solidcam");
    });

    it("section_key equals 'imachining'", () => {
      expect(loadIMachining().section_key).toBe("imachining");
    });
  });

  describe("Summary Reference Values", () => {
    it("total_operations equals 4", () => {
      expect(loadIMachining().summary.total_operations).toBe(4);
    });

    it("total_parameters equals 129", () => {
      expect(loadIMachining().summary.total_parameters).toBe(129);
    });

    it("categories equal exactly [adaptive_clearing, wizard, database]", () => {
      const cats = loadIMachining().summary.categories.sort();
      expect(cats).toEqual(["adaptive_clearing", "database", "wizard"]);
    });
  });

  describe("Operations (Reference Values)", () => {
    const EXPECTED = [
      { id: "imachining_2d_full", category: "adaptive_clearing", paramCount: 37 },
      { id: "imachining_3d", category: "adaptive_clearing", paramCount: 29 },
      { id: "technology_wizard", category: "wizard", paramCount: 31 },
      { id: "tool_database", category: "database", paramCount: 32 },
    ];

    it("contains exactly 4 operations", () => {
      expect(Object.keys(loadIMachining().operations).length).toBe(4);
    });

    EXPECTED.forEach(({ id, category, paramCount }) => {
      it(`'${id}' has category '${category}' and ${paramCount} params`, () => {
        const op = loadIMachining().operations[id];
        expect(op).toBeTruthy();
        expect(op.category).toBe(category);
        expect(op.parameter_count).toBe(paramCount);
      });
    });

    it("sum of parameter_counts equals 129", () => {
      const sum = Object.values(loadIMachining().operations).reduce(
        (acc, op) => acc + op.parameter_count,
        0
      );
      expect(sum).toBe(129);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FAILURE MODE 1 — Schema Integrity
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Failure Mode: Schema Integrity", () => {
    it("all operations have non-empty display_name", () => {
      Object.values(loadIMachining().operations).forEach((op) => {
        expect(op.display_name.length).toBeGreaterThan(0);
      });
    });

    it("all operations have category in summary.categories", () => {
      const data = loadIMachining();
      const valid = new Set(data.summary.categories);
      Object.values(data.operations).forEach((op) => {
        expect(valid.has(op.category)).toBe(true);
      });
    });

    it("all operations have description ≥ 20 chars", () => {
      Object.values(loadIMachining().operations).forEach((op) => {
        expect(op.description.length).toBeGreaterThanOrEqual(20);
      });
    });

    it("all operations have at least 4 dialog_tabs", () => {
      Object.values(loadIMachining().operations).forEach((op) => {
        expect(op.dialog_tabs.length).toBeGreaterThanOrEqual(4);
      });
    });

    it("all operations have parameters object with at least 3 groups", () => {
      Object.values(loadIMachining().operations).forEach((op) => {
        expect(typeof op.parameters).toBe("object");
        expect(Object.keys(op.parameters).length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FAILURE MODE 2 — Parameter Consistency
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Failure Mode: Parameter Consistency", () => {
    it("declared parameter_count matches actual sum in every operation", () => {
      Object.values(loadIMachining().operations).forEach((op) => {
        let actual = 0;
        Object.values(op.parameters).forEach((g) => (actual += Object.keys(g).length));
        expect(actual).toBe(op.parameter_count);
      });
    });

    it("all parameters have a valid type", () => {
      const validTypes = new Set([
        "string",
        "number",
        "integer",
        "boolean",
        "enum",
        "selection",
      ]);
      Object.values(loadIMachining().operations).forEach((op) => {
        Object.values(op.parameters).forEach((group) => {
          Object.values(group).forEach((p) => {
            expect(validTypes.has(p.type)).toBe(true);
          });
        });
      });
    });

    it("enum parameters have non-empty values array", () => {
      Object.values(loadIMachining().operations).forEach((op) => {
        Object.values(op.parameters).forEach((group) => {
          Object.values(group).forEach((p) => {
            if (p.type === "enum") {
              expect(Array.isArray(p.values)).toBe(true);
              expect(p.values!.length).toBeGreaterThan(0);
            }
          });
        });
      });
    });

    it("range parameters have ordered [min,max]", () => {
      Object.values(loadIMachining().operations).forEach((op) => {
        Object.values(op.parameters).forEach((group) => {
          Object.values(group).forEach((p) => {
            if (p.range) {
              expect(p.range[0]).toBeLessThanOrEqual(p.range[1]);
            }
          });
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FAILURE MODE 3 — Training Topics
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Failure Mode: Training Topics", () => {
    it("training_topics has exactly 5 entries", () => {
      expect(loadIMachining().training_topics.length).toBe(5);
    });

    it("each topic has ≥ 3 key_concepts", () => {
      loadIMachining().training_topics.forEach((t) => {
        expect(t.key_concepts.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("each topic has ≥ 3 best_practices", () => {
      loadIMachining().training_topics.forEach((t) => {
        expect(t.best_practices.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("topics cover Level Selection, Wizard, 3D vs 2D, Database, Chip Load", () => {
      const topicSet = new Set(loadIMachining().training_topics.map((t) => t.topic));
      const required = [
        "iMachining Level Selection",
        "Technology Wizard Inputs",
        "iMachining 3D vs 2D",
        "Tool Database Discipline",
        "Chip Load and Engagement",
      ];
      required.forEach((r) => expect(topicSet.has(r)).toBe(true));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVERSARIAL 1 — Parameter Edge Values
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Adversarial: Parameter Edge Values", () => {
    it("imachining_level range [1,8] in 2D — endpoints sane", () => {
      const op = loadIMachining().operations["imachining_2d_full"];
      const p = op.parameters["imachining"]["imachining_level"];
      expect(p.range![0]).toBe(1);
      expect(p.range![1]).toBe(8);
      expect(p.default).toBe(4);
    });

    it("imachining_level_3d range [1,8] in 3D", () => {
      const op = loadIMachining().operations["imachining_3d"];
      const p = op.parameters["imachining_3d"]["imachining_level_3d"];
      expect(p.range![0]).toBe(1);
      expect(p.range![1]).toBe(8);
    });

    it("max_radial_engagement_pct bounded [5, 100]", () => {
      const op = loadIMachining().operations["imachining_2d_full"];
      const p = op.parameters["imachining"]["max_radial_engagement_pct"];
      expect(p.range![0]).toBeGreaterThanOrEqual(5);
      expect(p.range![1]).toBeLessThanOrEqual(100);
    });

    it("ramp_angle_deg bounded [0.5, 15] (no zero, no inverted)", () => {
      const op = loadIMachining().operations["imachining_2d_full"];
      const p = op.parameters["imachining"]["ramp_angle_deg"];
      expect(p.range![0]).toBeGreaterThan(0);
      expect(p.range![1]).toBeLessThanOrEqual(15);
    });

    it("no NaN/Infinity in numeric defaults", () => {
      Object.values(loadIMachining().operations).forEach((op) => {
        Object.values(op.parameters).forEach((g) => {
          Object.values(g).forEach((p) => {
            if (typeof p.default === "number") {
              expect(Number.isFinite(p.default)).toBe(true);
            }
          });
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVERSARIAL 2 — Boundary & Cross-Operation
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Adversarial: Boundary & Cross-Op Consistency", () => {
    it("op with most params (imachining_2d_full: 37)", () => {
      const op = loadIMachining().operations["imachining_2d_full"];
      expect(op.parameter_count).toBe(37);
      let count = 0;
      Object.values(op.parameters).forEach((g) => (count += Object.keys(g).length));
      expect(count).toBe(37);
    });

    it("op with fewest params (imachining_3d: 29)", () => {
      expect(loadIMachining().operations["imachining_3d"].parameter_count).toBe(29);
    });

    it("technology_wizard input groups (material, tool, machine, workpiece) + output exist", () => {
      const op = loadIMachining().operations["technology_wizard"];
      expect(op.parameters["material"]).toBeTruthy();
      expect(op.parameters["tool"]).toBeTruthy();
      expect(op.parameters["machine"]).toBeTruthy();
      expect(op.parameters["workpiece"]).toBeTruthy();
      expect(op.parameters["output"]).toBeTruthy();
    });

    it("tool_database holder taper covers BT, CAT, HSK families (≥3 standards)", () => {
      const op = loadIMachining().operations["tool_database"];
      const p = op.parameters["holder"]["holder_taper"];
      const families = new Set<string>();
      p.values!.forEach((v) => {
        if (v.startsWith("bt")) families.add("bt");
        else if (v.startsWith("cat")) families.add("cat");
        else if (v.startsWith("hsk")) families.add("hsk");
      });
      expect(families.size).toBeGreaterThanOrEqual(3);
    });

    it("ISO material groups P/M/K/N/S/H present in 2D wizard and Technology Wizard (variability ≥ 2 ops)", () => {
      const data = loadIMachining();
      const op2d = data.operations["imachining_2d_full"];
      const opTW = data.operations["technology_wizard"];
      const expected = ["P", "M", "K", "N", "S", "H"];
      expect(op2d.parameters["wizard"]["material_group"].values!.sort()).toEqual(expected.sort());
      expect(opTW.parameters["material"]["iso_group"].values!.sort()).toEqual(expected.sort());
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // VARIABILITY — Spanning configs (substrates, coatings, machine classes)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Variability: Spanning Configurations", () => {
    it("tool substrate covers ≥ 4 variants (carbide/HSS/ceramic/CBN/PCD)", () => {
      const op = loadIMachining().operations["tool_database"];
      const p = op.parameters["material"]["substrate"];
      expect(p.values!.length).toBeGreaterThanOrEqual(4);
    });

    it("tool coating covers ≥ 5 variants", () => {
      const op = loadIMachining().operations["tool_database"];
      const p = op.parameters["material"]["coating"];
      expect(p.values!.length).toBeGreaterThanOrEqual(5);
    });

    it("machine class spans VMC/HMC/Swiss/MillTurn/5axis (≥ 4)", () => {
      const op = loadIMachining().operations["technology_wizard"];
      const p = op.parameters["machine"]["machine_class"];
      expect(p.values!.length).toBeGreaterThanOrEqual(4);
    });

    it("coolant modes span off/flood/mist/through_spindle (≥ 4)", () => {
      const op = loadIMachining().operations["imachining_2d_full"];
      const p = op.parameters["technology"]["coolant_mode"];
      expect(p.values!.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DISPATCHER WIRING — Required by hook enforcement
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Dispatcher Integration (prism_cam)", () => {
    const ACTIONS = [
      "solidcam_imachining_index",
      "solidcam_imachining_summary",
      "solidcam_imachining_list_ops",
      "solidcam_imachining_get_op",
      "solidcam_imachining_by_category",
      "solidcam_imachining_wizard",
      "solidcam_imachining_find_param",
    ];

    it("camDispatcher ACTIONS includes all 7 solidcam_imachining_* actions", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      for (const action of ACTIONS) {
        expect(actions).toContain(action);
      }
    });

    it("all 7 actions have Zod schemas in ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS", async () => {
      const { ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcamIMachiningFunctionIndexActionSchemas.js"
      );
      const keys = Object.keys(ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS);
      expect(keys.length).toBe(7);
      for (const a of ACTIONS) expect(keys).toContain(a);
    });

    it("solidcam_imachining_get_op schema validates operation_id", async () => {
      const { ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcamIMachiningFunctionIndexActionSchemas.js"
      );
      const schema = ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS.solidcam_imachining_get_op;
      expect(schema.safeParse({ operation_id: "imachining_3d" }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ operation_id: 99 }).success).toBe(false);
    });

    it("solidcam_imachining_find_param schema validates parameter_name + optional limit", async () => {
      const { ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcamIMachiningFunctionIndexActionSchemas.js"
      );
      const schema = ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS.solidcam_imachining_find_param;
      expect(schema.safeParse({ parameter_name: "rpm" }).success).toBe(true);
      expect(schema.safeParse({ parameter_name: "rpm", limit: 5 }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
    });

    it("engine getSummary returns 4 ops / 129 params (dispatcher data path)", async () => {
      const { SolidCAMIMachiningFunctionIndexEngine } = await import(
        "../engines/SolidCAMIMachiningFunctionIndexEngine.js"
      );
      const summary = SolidCAMIMachiningFunctionIndexEngine.getSummary();
      expect("error" in summary).toBe(false);
      if (!("error" in summary)) {
        expect(summary.system_id).toBe("solidcam");
        expect(summary.section_key).toBe("imachining");
        expect(summary.total_operations).toBe(4);
        expect(summary.total_parameters).toBe(129);
      }
    });

    it("engine listOperations returns exactly 4 entries", async () => {
      const { SolidCAMIMachiningFunctionIndexEngine } = await import(
        "../engines/SolidCAMIMachiningFunctionIndexEngine.js"
      );
      const ops = SolidCAMIMachiningFunctionIndexEngine.listOperations();
      expect(Array.isArray(ops)).toBe(true);
      if (Array.isArray(ops)) {
        expect(ops.length).toBe(4);
      }
    });

    it("engine getOperation('imachining_2d_full') returns 37 params, adaptive_clearing", async () => {
      const { SolidCAMIMachiningFunctionIndexEngine } = await import(
        "../engines/SolidCAMIMachiningFunctionIndexEngine.js"
      );
      const op = SolidCAMIMachiningFunctionIndexEngine.getOperation("imachining_2d_full");
      expect("error" in op).toBe(false);
      if (!("error" in op)) {
        expect(op.parameter_count).toBe(37);
        expect(op.category).toBe("adaptive_clearing");
      }
    });

    it("engine getOperationsByCategory('adaptive_clearing') returns 2 ops", async () => {
      const { SolidCAMIMachiningFunctionIndexEngine } = await import(
        "../engines/SolidCAMIMachiningFunctionIndexEngine.js"
      );
      const ops = SolidCAMIMachiningFunctionIndexEngine.getOperationsByCategory(
        "adaptive_clearing"
      );
      expect(Array.isArray(ops)).toBe(true);
      if (Array.isArray(ops)) {
        expect(ops.length).toBe(2);
        ops.forEach((o) => expect(o.category).toBe("adaptive_clearing"));
      }
    });

    it("engine getOperation returns error for unknown id (failure mode)", async () => {
      const { SolidCAMIMachiningFunctionIndexEngine } = await import(
        "../engines/SolidCAMIMachiningFunctionIndexEngine.js"
      );
      const op = SolidCAMIMachiningFunctionIndexEngine.getOperation("does_not_exist");
      expect("error" in op).toBe(true);
      if ("error" in op) {
        expect(op.error).toContain("does_not_exist");
      }
    });

    it("engine getWizardParams returns inputs (≥ 20 fields) and outputs (≥ 4 fields)", async () => {
      const { SolidCAMIMachiningFunctionIndexEngine } = await import(
        "../engines/SolidCAMIMachiningFunctionIndexEngine.js"
      );
      const result = SolidCAMIMachiningFunctionIndexEngine.getWizardParams();
      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(Object.keys(result.inputs).length).toBeGreaterThanOrEqual(20);
        expect(Object.keys(result.outputs).length).toBeGreaterThanOrEqual(4);
      }
    });

    it("engine findParameter('coating') returns matches across multiple ops", async () => {
      const { SolidCAMIMachiningFunctionIndexEngine } = await import(
        "../engines/SolidCAMIMachiningFunctionIndexEngine.js"
      );
      const matches = SolidCAMIMachiningFunctionIndexEngine.findParameter("coating");
      expect(matches.length).toBeGreaterThan(0);
      const opsHit = new Set(matches.map((m) => m.operation_id));
      expect(opsHit.size).toBeGreaterThanOrEqual(2);
    });
  });
});
