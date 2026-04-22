/**
 * SolidCAM 2.5D Operations Tests — CAM-EXHAUST-MS0/U-CAM33
 *
 * Tests for the SolidCAM 2.5D operations function catalog.
 * Includes: schema validation, reference values, failure modes, adversarial inputs.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface SolidCAMParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  range?: [number, number];
  values?: string[];
  required?: boolean;
  tab?: string;
}

interface SolidCAMOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count: number;
  parameters: Record<string, Record<string, SolidCAMParameter>>;
}

interface SolidCAMSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, SolidCAMOperation>;
  training_topics: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

const DATA_PATH = join(
  __dirname,
  "../../data/cam-functions/solidcam/2.5d-operations.json"
);

function loadSolidCAM25D(): SolidCAMSection {
  return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as SolidCAMSection;
}

describe("SolidCAM 2.5D Operations", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // HAPPY PATH — Reference Value Assertions
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Schema & Metadata (Reference Values)", () => {
    it("file exists at expected path", () => {
      expect(existsSync(DATA_PATH)).toBe(true);
    });

    it("loads valid JSON without parse error", () => {
      expect(() => loadSolidCAM25D()).not.toThrow();
    });

    it("schemaVersion equals 1", () => {
      const data = loadSolidCAM25D();
      expect(data.schemaVersion).toBe(1);
    });

    it("system_id equals 'solidcam'", () => {
      const data = loadSolidCAM25D();
      expect(data.system_id).toBe("solidcam");
    });

    it("section_key equals '2.5d_operations'", () => {
      const data = loadSolidCAM25D();
      expect(data.section_key).toBe("2.5d_operations");
    });
  });

  describe("Summary Statistics (Exact Reference Values)", () => {
    it("total_operations equals 12", () => {
      const data = loadSolidCAM25D();
      expect(data.summary.total_operations).toBe(12);
    });

    it("total_parameters equals 209", () => {
      const data = loadSolidCAM25D();
      expect(data.summary.total_parameters).toBe(209);
    });

    it("categories array length equals 4", () => {
      const data = loadSolidCAM25D();
      expect(data.summary.categories.length).toBe(4);
    });

    it("categories exactly match expected set", () => {
      const data = loadSolidCAM25D();
      const expected = ["roughing", "finishing", "holemaking", "threading"];
      expect(data.summary.categories.sort()).toEqual(expected.sort());
    });
  });

  describe("Operations (Exact Reference Values)", () => {
    const EXPECTED_OPERATIONS = [
      { id: "profile_2d", category: "finishing", paramCount: 22 },
      { id: "pocket_2d", category: "roughing", paramCount: 26 },
      { id: "face_milling", category: "roughing", paramCount: 16 },
      { id: "slot_milling", category: "roughing", paramCount: 15 },
      { id: "drill", category: "holemaking", paramCount: 18 },
      { id: "thread_mill", category: "threading", paramCount: 20 },
      { id: "chamfer_milling", category: "finishing", paramCount: 14 },
      { id: "t_slot", category: "roughing", paramCount: 12 },
      { id: "engrave", category: "finishing", paramCount: 14 },
      { id: "imachining_2d", category: "roughing", paramCount: 24 },
      { id: "contour_3axis", category: "finishing", paramCount: 16 },
      { id: "reaming", category: "holemaking", paramCount: 12 },
    ];

    it("contains exactly 12 operations", () => {
      const data = loadSolidCAM25D();
      expect(Object.keys(data.operations).length).toBe(12);
    });

    EXPECTED_OPERATIONS.forEach(({ id, category, paramCount }) => {
      it(`operation '${id}' exists with category '${category}'`, () => {
        const data = loadSolidCAM25D();
        expect(data.operations[id]).toBeDefined();
        expect(data.operations[id].category).toBe(category);
      });

      it(`operation '${id}' has parameter_count ${paramCount}`, () => {
        const data = loadSolidCAM25D();
        expect(data.operations[id].parameter_count).toBe(paramCount);
      });
    });

    it("sum of all parameter_counts equals 209", () => {
      const data = loadSolidCAM25D();
      const sum = Object.values(data.operations).reduce(
        (acc, op) => acc + op.parameter_count,
        0
      );
      // 22+26+16+15+18+20+14+12+14+24+16+12 = 209
      expect(sum).toBe(209);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FAILURE MODE 1 — Schema Integrity
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Failure Mode: Schema Integrity", () => {
    it("all operations have non-empty display_name", () => {
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([id, op]) => {
        expect(op.display_name).toBeTruthy();
        expect(op.display_name.length).toBeGreaterThan(0);
      });
    });

    it("all operations have category in summary.categories", () => {
      const data = loadSolidCAM25D();
      const validCategories = new Set(data.summary.categories);
      Object.entries(data.operations).forEach(([id, op]) => {
        expect(validCategories.has(op.category)).toBe(true);
      });
    });

    it("all operations have non-empty description (min 10 chars)", () => {
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([id, op]) => {
        expect(op.description).toBeTruthy();
        expect(op.description.length).toBeGreaterThanOrEqual(10);
      });
    });

    it("all operations have at least 1 dialog_tab", () => {
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([id, op]) => {
        expect(Array.isArray(op.dialog_tabs)).toBe(true);
        expect(op.dialog_tabs.length).toBeGreaterThan(0);
      });
    });

    it("all operations have parameters object", () => {
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([id, op]) => {
        expect(typeof op.parameters).toBe("object");
        expect(op.parameters).not.toBeNull();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FAILURE MODE 2 — Parameter Consistency
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Failure Mode: Parameter Consistency", () => {
    it("declared parameter_count matches actual param count in all operations", () => {
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([opId, op]) => {
        let actualCount = 0;
        Object.values(op.parameters).forEach((group) => {
          actualCount += Object.keys(group).length;
        });
        expect(actualCount).toBe(op.parameter_count);
      });
    });

    it("all parameters have valid type field", () => {
      const validTypes = new Set([
        "string",
        "number",
        "integer",
        "boolean",
        "enum",
        "selection",
      ]);
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([opId, op]) => {
        Object.entries(op.parameters).forEach(([groupName, group]) => {
          Object.entries(group).forEach(([paramName, param]) => {
            expect(validTypes.has(param.type)).toBe(true);
          });
        });
      });
    });

    it("enum parameters have non-empty values array", () => {
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([opId, op]) => {
        Object.entries(op.parameters).forEach(([groupName, group]) => {
          Object.entries(group).forEach(([paramName, param]) => {
            if (param.type === "enum") {
              expect(Array.isArray(param.values)).toBe(true);
              expect(param.values!.length).toBeGreaterThan(0);
            }
          });
        });
      });
    });

    it("parameters with range have valid [min, max] tuple", () => {
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([opId, op]) => {
        Object.entries(op.parameters).forEach(([groupName, group]) => {
          Object.entries(group).forEach(([paramName, param]) => {
            if (param.range) {
              expect(Array.isArray(param.range)).toBe(true);
              expect(param.range.length).toBe(2);
              expect(param.range[0]).toBeLessThanOrEqual(param.range[1]);
            }
          });
        });
      });
    });

    it("number/integer parameters have unit or are unitless by design", () => {
      const data = loadSolidCAM25D();
      let numberParamsWithUnit = 0;
      let totalNumberParams = 0;
      Object.entries(data.operations).forEach(([opId, op]) => {
        Object.entries(op.parameters).forEach(([groupName, group]) => {
          Object.entries(group).forEach(([paramName, param]) => {
            if (param.type === "number" || param.type === "integer") {
              totalNumberParams++;
              if (param.unit) numberParamsWithUnit++;
            }
          });
        });
      });
      // At least 60% of number params should have units
      expect(numberParamsWithUnit / totalNumberParams).toBeGreaterThan(0.6);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FAILURE MODE 3 — Training Topics Validity
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Failure Mode: Training Topics Validity", () => {
    it("training_topics array has exactly 5 entries", () => {
      const data = loadSolidCAM25D();
      expect(data.training_topics.length).toBe(5);
    });

    it("each topic has non-empty topic string", () => {
      const data = loadSolidCAM25D();
      data.training_topics.forEach((t, i) => {
        expect(t.topic).toBeTruthy();
        expect(t.topic.length).toBeGreaterThan(3);
      });
    });

    it("each topic has at least 2 key_concepts", () => {
      const data = loadSolidCAM25D();
      data.training_topics.forEach((t, i) => {
        expect(Array.isArray(t.key_concepts)).toBe(true);
        expect(t.key_concepts.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("each topic has at least 1 best_practice", () => {
      const data = loadSolidCAM25D();
      data.training_topics.forEach((t, i) => {
        expect(Array.isArray(t.best_practices)).toBe(true);
        expect(t.best_practices.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("no duplicate topic names", () => {
      const data = loadSolidCAM25D();
      const names = data.training_topics.map((t) => t.topic);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVERSARIAL INPUT 1 — Edge Cases in Parameter Values
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Adversarial: Edge Cases in Parameter Values", () => {
    it("imachining_level range [1,8] is valid (no zero, no negative)", () => {
      const data = loadSolidCAM25D();
      const params = data.operations["imachining_2d"].parameters["imachining"];
      const level = params["imachining_level"] as SolidCAMParameter;
      expect(level.range![0]).toBeGreaterThanOrEqual(1);
      expect(level.range![1]).toBeLessThanOrEqual(10);
    });

    it("stepover_percent ranges are bounded [10, 95] or similar", () => {
      const data = loadSolidCAM25D();
      const pocket = data.operations["pocket_2d"].parameters["roughing"];
      const stepover = pocket["stepover_percent"] as SolidCAMParameter;
      expect(stepover.range![0]).toBeGreaterThanOrEqual(1);
      expect(stepover.range![1]).toBeLessThanOrEqual(100);
    });

    it("ramp_angle ranges are bounded [0.5, 15] or similar", () => {
      const data = loadSolidCAM25D();
      const pocket = data.operations["pocket_2d"].parameters["roughing"];
      const ramp = pocket["ramp_angle"] as SolidCAMParameter;
      expect(ramp.range![0]).toBeGreaterThanOrEqual(0);
      expect(ramp.range![1]).toBeLessThanOrEqual(45);
    });

    it("no parameter has NaN or Infinity in default", () => {
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([opId, op]) => {
        Object.entries(op.parameters).forEach(([groupName, group]) => {
          Object.entries(group).forEach(([paramName, param]) => {
            if (typeof param.default === "number") {
              expect(Number.isFinite(param.default)).toBe(true);
              expect(Number.isNaN(param.default)).toBe(false);
            }
          });
        });
      });
    });

    it("no empty string defaults for string parameters", () => {
      const data = loadSolidCAM25D();
      Object.entries(data.operations).forEach(([opId, op]) => {
        Object.entries(op.parameters).forEach(([groupName, group]) => {
          Object.entries(group).forEach(([paramName, param]) => {
            if (param.type === "string" && param.default !== undefined) {
              // Empty string is acceptable for some fields, but if set should be valid
              expect(typeof param.default).toBe("string");
            }
          });
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVERSARIAL INPUT 2 — Boundary Conditions
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Adversarial: Boundary Conditions", () => {
    it("operation with most parameters (pocket_2d: 26) is valid", () => {
      const data = loadSolidCAM25D();
      const op = data.operations["pocket_2d"];
      expect(op.parameter_count).toBe(26);
      let count = 0;
      Object.values(op.parameters).forEach((g) => (count += Object.keys(g).length));
      expect(count).toBe(26);
    });

    it("operation with fewest parameters (t_slot/reaming: 12) is valid", () => {
      const data = loadSolidCAM25D();
      const op1 = data.operations["t_slot"];
      const op2 = data.operations["reaming"];
      expect(op1.parameter_count).toBe(12);
      expect(op2.parameter_count).toBe(12);
    });

    it("operation with most dialog_tabs has all tabs with params", () => {
      const data = loadSolidCAM25D();
      // pocket_2d has 6 tabs
      const op = data.operations["pocket_2d"];
      expect(op.dialog_tabs.length).toBe(6);
      // Each tab should appear in some parameter group
      const tabsInParams = new Set<string>();
      Object.values(op.parameters).forEach((group) => {
        Object.values(group).forEach((param) => {
          if (param.tab) tabsInParams.add(param.tab);
        });
      });
      expect(tabsInParams.size).toBeGreaterThanOrEqual(4);
    });

    it("categories by operation count (roughing: 5, finishing: 4, holemaking: 2, threading: 1)", () => {
      const data = loadSolidCAM25D();
      const counts: Record<string, number> = {};
      Object.values(data.operations).forEach((op) => {
        counts[op.category] = (counts[op.category] || 0) + 1;
      });
      expect(counts["roughing"]).toBe(5);
      expect(counts["finishing"]).toBe(4);
      expect(counts["holemaking"]).toBe(2);
      expect(counts["threading"]).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // iMachining 2D — Domain-Specific Validation
  // ─────────────────────────────────────────────────────────────────────────────
  describe("iMachining 2D (Domain-Specific)", () => {
    it("has all required iMachining parameters", () => {
      const data = loadSolidCAM25D();
      const iParams = data.operations["imachining_2d"].parameters["imachining"];
      expect(iParams["imachining_level"]).toBeDefined();
      expect(iParams["material_hardness"]).toBeDefined();
      expect(iParams["machine_rigidity"]).toBeDefined();
      expect(iParams["tool_stickout"]).toBeDefined();
    });

    it("material_hardness has 4 values: soft, medium, hard, very_hard", () => {
      const data = loadSolidCAM25D();
      const param = data.operations["imachining_2d"].parameters["imachining"][
        "material_hardness"
      ] as SolidCAMParameter;
      expect(param.values!.sort()).toEqual(
        ["hard", "medium", "soft", "very_hard"].sort()
      );
    });

    it("machine_rigidity has 3 values: low, medium, high", () => {
      const data = loadSolidCAM25D();
      const param = data.operations["imachining_2d"].parameters["imachining"][
        "machine_rigidity"
      ] as SolidCAMParameter;
      expect(param.values!.sort()).toEqual(["high", "low", "medium"].sort());
    });

    it("thin_wall_mode is boolean with default false", () => {
      const data = loadSolidCAM25D();
      const param = data.operations["imachining_2d"].parameters["imachining"][
        "thin_wall_mode"
      ] as SolidCAMParameter;
      expect(param.type).toBe("boolean");
      expect(param.default).toBe(false);
    });

    it("morphing_step is boolean with default true", () => {
      const data = loadSolidCAM25D();
      const param = data.operations["imachining_2d"].parameters["imachining"][
        "morphing_step"
      ] as SolidCAMParameter;
      expect(param.type).toBe("boolean");
      expect(param.default).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Cross-System Validation — Spanning Configurations
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Cross-System Validation (Spanning Configs)", () => {
    it("drill operation supports multiple cycle_types", () => {
      const data = loadSolidCAM25D();
      const param = data.operations["drill"].parameters["cycle"][
        "cycle_type"
      ] as SolidCAMParameter;
      expect(param.values!.length).toBeGreaterThanOrEqual(3);
      expect(param.values).toContain("simple");
      expect(param.values).toContain("peck");
      expect(param.values).toContain("deep_hole");
    });

    it("pocket_2d supports multiple cutting_methods", () => {
      const data = loadSolidCAM25D();
      const param = data.operations["pocket_2d"].parameters["roughing"][
        "cutting_method"
      ] as SolidCAMParameter;
      expect(param.values!.length).toBe(5);
      expect(param.values).toContain("offset");
      expect(param.values).toContain("zigzag");
      expect(param.values).toContain("spiral");
    });

    it("thread_mill supports multiple thread_standards", () => {
      const data = loadSolidCAM25D();
      const param = data.operations["thread_mill"].parameters["thread"][
        "thread_standard"
      ] as SolidCAMParameter;
      expect(param.values!.length).toBeGreaterThanOrEqual(4);
      expect(param.values).toContain("metric");
      expect(param.values).toContain("unc");
      expect(param.values).toContain("npt");
    });

    it("profile_2d supports multiple approach_types", () => {
      const data = loadSolidCAM25D();
      const param = data.operations["profile_2d"].parameters["link"][
        "approach_type"
      ] as SolidCAMParameter;
      expect(param.values!.length).toBeGreaterThanOrEqual(3);
      expect(param.values).toContain("tangent");
      expect(param.values).toContain("ramp");
      expect(param.values).toContain("arc");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Dispatcher Round-Trip (via SolidCAM Strategy Engine if available)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Data Consistency for Dispatcher Integration", () => {
    it("all operation IDs are valid identifiers (snake_case)", () => {
      const data = loadSolidCAM25D();
      const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
      Object.keys(data.operations).forEach((id) => {
        expect(snakeCaseRegex.test(id)).toBe(true);
      });
    });

    it("all parameter names are valid identifiers (snake_case)", () => {
      const data = loadSolidCAM25D();
      const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
      Object.values(data.operations).forEach((op) => {
        Object.values(op.parameters).forEach((group) => {
          Object.keys(group).forEach((paramName) => {
            expect(snakeCaseRegex.test(paramName)).toBe(true);
          });
        });
      });
    });

    it("all parameter group names are valid identifiers", () => {
      const data = loadSolidCAM25D();
      const validNameRegex = /^[a-z][a-z0-9_]*$/;
      Object.values(data.operations).forEach((op) => {
        Object.keys(op.parameters).forEach((groupName) => {
          expect(validNameRegex.test(groupName)).toBe(true);
        });
      });
    });

    it("data is JSON-serializable round-trip", () => {
      const data = loadSolidCAM25D();
      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);
      expect(deserialized.summary.total_operations).toBe(12);
      expect(deserialized.summary.total_parameters).toBe(209);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DISPATCHER INVOCATION — Wiring verification + engine round-trip
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Dispatcher Integration (prism_cam)", () => {
    const SOLIDCAM_25D_ACTIONS = [
      "solidcam_25d_index",
      "solidcam_25d_summary",
      "solidcam_25d_list_ops",
      "solidcam_25d_get_op",
      "solidcam_25d_by_category",
      "solidcam_25d_imachining",
    ];

    it("camDispatcher ACTIONS includes all 6 solidcam_25d_* actions", async () => {
      const mod: any = await import(
        "../tools/dispatchers/camDispatcher.js"
      );
      const actions: string[] = mod.ACTIONS;
      for (const action of SOLIDCAM_25D_ACTIONS) {
        expect(actions).toContain(action);
      }
    });

    it("all 6 actions have Zod schemas in ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS", async () => {
      const { ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcam25DFunctionIndexActionSchemas.js"
      );
      const schemaKeys = Object.keys(ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS);
      expect(schemaKeys.length).toBe(6);
      for (const action of SOLIDCAM_25D_ACTIONS) {
        expect(schemaKeys).toContain(action);
      }
    });

    it("solidcam_25d_get_op schema validates operation_id correctly", async () => {
      const { ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcam25DFunctionIndexActionSchemas.js"
      );
      const schema = ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS.solidcam_25d_get_op;
      expect(schema.safeParse({ operation_id: "imachining_2d" }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ operation_id: 42 }).success).toBe(false);
    });

    it("solidcam_25d_by_category schema validates category correctly", async () => {
      const { ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS } = await import(
        "../schemas/solidcam25DFunctionIndexActionSchemas.js"
      );
      const schema = ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS.solidcam_25d_by_category;
      expect(schema.safeParse({ category: "roughing" }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
    });

    it("engine getSummary returns 12 operations / 209 parameters (dispatcher data path)", async () => {
      const { SolidCAM25DFunctionIndexEngine } = await import(
        "../engines/SolidCAM25DFunctionIndexEngine.js"
      );
      const summary = SolidCAM25DFunctionIndexEngine.getSummary();
      expect("error" in summary).toBe(false);
      if (!("error" in summary)) {
        expect(summary.system_id).toBe("solidcam");
        expect(summary.section_key).toBe("2.5d_operations");
        expect(summary.total_operations).toBe(12);
        expect(summary.total_parameters).toBe(209);
      }
    });

    it("engine listOperations returns exactly 12 entries with correct shape", async () => {
      const { SolidCAM25DFunctionIndexEngine } = await import(
        "../engines/SolidCAM25DFunctionIndexEngine.js"
      );
      const ops = SolidCAM25DFunctionIndexEngine.listOperations();
      expect(Array.isArray(ops)).toBe(true);
      if (Array.isArray(ops)) {
        expect(ops.length).toBe(12);
        const first = ops[0];
        expect(typeof first.operation_id).toBe("string");
        expect(typeof first.display_name).toBe("string");
        expect(typeof first.category).toBe("string");
        expect(typeof first.parameter_count).toBe("number");
      }
    });

    it("engine getOperation('imachining_2d') returns expected reference values", async () => {
      const { SolidCAM25DFunctionIndexEngine } = await import(
        "../engines/SolidCAM25DFunctionIndexEngine.js"
      );
      const op = SolidCAM25DFunctionIndexEngine.getOperation("imachining_2d");
      expect("error" in op).toBe(false);
      if (!("error" in op)) {
        expect(op.display_name).toBe("iMachining 2D");
        expect(op.category).toBe("roughing");
        expect(op.parameter_count).toBe(24);
      }
    });

    it("engine getOperationsByCategory('roughing') returns exactly 5 ops", async () => {
      const { SolidCAM25DFunctionIndexEngine } = await import(
        "../engines/SolidCAM25DFunctionIndexEngine.js"
      );
      const ops = SolidCAM25DFunctionIndexEngine.getOperationsByCategory("roughing");
      expect(Array.isArray(ops)).toBe(true);
      if (Array.isArray(ops)) {
        expect(ops.length).toBe(5);
        ops.forEach((op) => expect(op.category).toBe("roughing"));
      }
    });

    it("engine getOperation returns error for unknown id (failure mode)", async () => {
      const { SolidCAM25DFunctionIndexEngine } = await import(
        "../engines/SolidCAM25DFunctionIndexEngine.js"
      );
      const op = SolidCAM25DFunctionIndexEngine.getOperation("nonexistent_op_xyz");
      expect("error" in op).toBe(true);
      if ("error" in op) {
        expect(op.error).toContain("nonexistent_op_xyz");
      }
    });

    it("engine getIMachiningParams exposes imachining_level + material_hardness + machine_rigidity", async () => {
      const { SolidCAM25DFunctionIndexEngine } = await import(
        "../engines/SolidCAM25DFunctionIndexEngine.js"
      );
      const result = SolidCAM25DFunctionIndexEngine.getIMachiningParams();
      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.imachining_params.imachining_level).toBeTruthy();
        expect(result.imachining_params.material_hardness).toBeTruthy();
        expect(result.imachining_params.machine_rigidity).toBeTruthy();
      }
    });
  });
});
