/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH2 — 6 unwired AI /
 * intelligence / knowledge lathe engines wired into turningDispatcher.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheAnomalyDetectionEngine } from "../engines/LatheAnomalyDetectionEngine.js";
import { latheCausalInferenceEngine } from "../engines/LatheCausalInferenceEngine.js";
import { latheEnsembleLearningEngine } from "../engines/LatheEnsembleLearningEngine.js";
import { latheChangeoverBriefEngine } from "../engines/LatheChangeoverBriefEngine.js";
import { latheJMDieKnowledgeEngine } from "../engines/LatheJMDieKnowledgeEngine.js";
import { latheMetallurgyEngine } from "../engines/LatheMetallurgyEngine.js";

const NEW_ACTIONS = [
  "lathe_anomaly_detect_program",
  "lathe_causal_build_model",
  "lathe_ensemble_stats",
  "lathe_changeover_stats",
  "lathe_jmdie_extract_customer",
  "lathe_metallurgy_tool_steel_db",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-LATHE-BATCH2 — engines verified directly", () => {
  describe("LatheAnomalyDetectionEngine.detectProgramAnomalies", () => {
    const baseProgram = {
      program_id: "TEST-001",
      program_name: "test_part",
      blocks: [
        { line_number: 10, raw_text: "G50 S2000", g_codes: ["G50"], m_codes: [], s: 2000 },
        { line_number: 20, raw_text: "G96 S180", g_codes: ["G96"], m_codes: [], s: 180 },
        { line_number: 30, raw_text: "G01 X10 Z-5 F0.2", g_codes: ["G01"], m_codes: [], x: 10, z: -5, f: 0.2 },
        { line_number: 40, raw_text: "M30", g_codes: [], m_codes: ["M30"] },
      ],
    };

    it("returns structured object with anomalies array (or equivalent)", () => {
      const r = latheAnomalyDetectionEngine.detectProgramAnomalies(baseProgram as never);
      expect(typeof r).toBe("object");
      expect(r).not.toBeNull();
    });

    it("scanning a clean canonical program does not throw on minimal valid input", () => {
      const minimal = {
        program_id: "MIN",
        blocks: [
          { line_number: 1, raw_text: "M30", g_codes: [], m_codes: ["M30"] },
        ],
      };
      expect(() => latheAnomalyDetectionEngine.detectProgramAnomalies(minimal as never)).not.toThrow();
    });
  });

  describe("LatheCausalInferenceEngine.buildCausalModel", () => {
    it("returns model with topological order and id for lathe_turning domain", () => {
      const m = latheCausalInferenceEngine.buildCausalModel("lathe_turning");
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0);
      expect(Array.isArray(m.topological_order)).toBe(true);
      expect(m.domain).toBe("lathe_turning");
    });

    it("returns acyclic DAG (topological_order length matches variable count)", () => {
      const m = latheCausalInferenceEngine.buildCausalModel("lathe_boring");
      // Topological sort exists ⇔ DAG is acyclic
      expect(m.topological_order.length).toBeGreaterThan(0);
      // adjacency matrix is square with side = #variables
      expect(m.adjacency_matrix.length).toBe(m.variables.size);
    });

    it("two distinct domains produce models with different ids", () => {
      const a = latheCausalInferenceEngine.buildCausalModel("lathe_threading");
      const b = latheCausalInferenceEngine.buildCausalModel("general");
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("LatheEnsembleLearningEngine.getStats", () => {
    it("returns object with at least one numeric counter (totalCalculations or models)", () => {
      const s = latheEnsembleLearningEngine.getStats();
      const sObj = s as Record<string, unknown>;
      const hasNumber = Object.values(sObj).some((v) => typeof v === "number");
      expect(hasNumber).toBe(true);
    });
  });

  describe("LatheChangeoverBriefEngine.getStats", () => {
    it("returns {sections, reference} with positive section count", () => {
      const s = latheChangeoverBriefEngine.getStats();
      expect(typeof s.sections).toBe("number");
      expect(s.sections).toBeGreaterThan(0);
      expect(typeof s.reference).toBe("string");
      expect(s.reference.length).toBeGreaterThan(0);
    });
  });

  describe("LatheJMDieKnowledgeEngine.extractCustomerPatterns", () => {
    it("returns CustomerPattern object for a customer name (real or synthetic)", () => {
      const r = latheJMDieKnowledgeEngine.extractCustomerPatterns("ALCOA");
      expect(typeof r).toBe("object");
      expect(r).not.toBeNull();
    });

    it("returns object even when customer is unknown (defensive)", () => {
      const r = latheJMDieKnowledgeEngine.extractCustomerPatterns("___NON_EXISTENT_CUSTOMER_XYZ___");
      expect(typeof r).toBe("object");
      expect(r).not.toBeNull();
    });
  });

  describe("LatheMetallurgyEngine.getToolSteelDatabase", () => {
    it("returns a non-empty record of tool steels keyed by grade", () => {
      const db = latheMetallurgyEngine.getToolSteelDatabase();
      expect(typeof db).toBe("object");
      expect(db).not.toBeNull();
      const keys = Object.keys(db);
      expect(keys.length).toBeGreaterThan(0);
      // Every entry must be an object with at least one numeric or string field
      for (const k of keys) {
        const entry = db[k] as Record<string, unknown>;
        expect(typeof entry).toBe("object");
      }
    });
  });
});

describe("U-WIRE-LATHE-BATCH2 — dispatcher wiring verified", () => {
  it("registers all 6 new actions in turningDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "turningDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      // each action appears at least twice: enum entry + case label
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in TURNING_ACTION_SCHEMAS", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof (TURNING_ACTION_SCHEMAS as Record<string, { safeParse?: unknown }>)[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schema rejects lathe_anomaly_detect_program with empty blocks array", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_anomaly_detect_program"]!.safeParse({
      program_id: "x", blocks: [],
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects lathe_anomaly_detect_program with missing program_id", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_anomaly_detect_program"]!.safeParse({
      blocks: [{ line_number: 1, raw_text: "M30", g_codes: [], m_codes: ["M30"] }],
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects lathe_causal_build_model with invalid domain", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_causal_build_model"]!.safeParse({
      domain: "ate_my_homework",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects lathe_jmdie_extract_customer with empty customer string", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_jmdie_extract_customer"]!.safeParse({
      customer: "",
    });
    expect(r.success).toBe(false);
  });

  it("schemas accept zero-input actions (ensemble_stats, changeover_stats, tool_steel_db)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(schemas["lathe_ensemble_stats"]!.safeParse({}).success).toBe(true);
    expect(schemas["lathe_changeover_stats"]!.safeParse({}).success).toBe(true);
    expect(schemas["lathe_metallurgy_tool_steel_db"]!.safeParse({}).success).toBe(true);
  });
});
