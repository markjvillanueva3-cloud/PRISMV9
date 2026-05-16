/**
 * dispatcher.turningInspectionPlan.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-TURNINSP dispatcher wiring.
 *
 * Drives the new action through the real `prism_turning` dispatcher:
 *   - turning_inspection_plan → TurningInspectionPlanEngine.generate
 *
 * Wraps the same { success, data, error } envelope the rest of the PRISM
 * dispatcher test suite asserts against (mirrors
 * dispatcher.turningMinFingerprint.test.ts). Every assertion pins a concrete
 * reference value computed from the engine's published model — ANSI/ASQ Z1.4
 * AQL sampling, ISO 1101/12181 form measurement, AS9102 first-article.
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

interface FeatureRecord {
  feature_id: string;
  kind: string;
  method: string;
  frequency: string;
  sample_size: number;
  probe_points?: number;
  expected_seconds_per_part: number;
  acceptance_criteria: string;
  equipment_required: string[];
}
interface InspPlanData {
  part_id: string;
  lot_size: number;
  regulatory_regime: string;
  feature_records: FeatureRecord[];
  total_inspection_time_sec: number;
  total_inspection_time_per_lot_sec: number;
  equipment_list: string[];
  first_article_required: boolean;
  notes: string[];
}

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TURNINSP — turning_inspection_plan schema gate", () => {
  const schema = TURNING_ACTION_SCHEMAS["turning_inspection_plan"];

  it("is registered in TURNING_ACTION_SCHEMAS as a usable Zod schema", () => {
    expect(typeof schema.safeParse).toBe("function");
  });

  it("rejects empty params (part_id / lot_size / features all required)", () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("rejects an empty features array (min 1)", () => {
    expect(schema.safeParse({ part_id: "P", lot_size: 10, features: [] }).success).toBe(false);
  });

  it("rejects a negative tolerance_mm (must be positive)", () => {
    expect(schema.safeParse({
      part_id: "P", lot_size: 10,
      features: [{ id: "f1", kind: "od", nominal_mm: 10, tolerance_mm: -0.01 }],
    }).success).toBe(false);
  });

  it("rejects an unknown feature kind", () => {
    expect(schema.safeParse({
      part_id: "P", lot_size: 10,
      features: [{ id: "f1", kind: "sphere", nominal_mm: 10, tolerance_mm: 0.05 }],
    }).success).toBe(false);
  });

  it("rejects a zero / non-integer lot_size", () => {
    expect(schema.safeParse({
      part_id: "P", lot_size: 0,
      features: [{ id: "f1", kind: "od", nominal_mm: 10, tolerance_mm: 0.05 }],
    }).success).toBe(false);
    expect(schema.safeParse({
      part_id: "P", lot_size: 10.5,
      features: [{ id: "f1", kind: "od", nominal_mm: 10, tolerance_mm: 0.05 }],
    }).success).toBe(false);
  });

  it("accepts a minimal valid payload", () => {
    expect(schema.safeParse({
      part_id: "P", lot_size: 10,
      features: [{ id: "f1", kind: "od", nominal_mm: 10, tolerance_mm: 0.05 }],
    }).success).toBe(true);
  });

  it("accepts a full payload with optional fields", () => {
    expect(schema.safeParse({
      part_id: "P", lot_size: 200, regulatory_regime: "aerospace",
      cmm_available: true, probe_available: true,
      features: [{
        id: "f1", kind: "bore", nominal_mm: 12, tolerance_mm: 0.008,
        ra_target_um: 0.8, criticality: "critical",
        requires_form_tolerance: true, form_tolerance_mm: 0.003,
      }],
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TURNINSP — prism_turning :: turning_inspection_plan round-trip", () => {
  it("commercial 2-feature lot=100 → micrometer + CMM records, exact AQL sampling + lot time", async () => {
    const r = await invokeHandler(turningHandler, "turning_inspection_plan", {
      part_id: "RT-1",
      lot_size: 100,
      features: [
        { id: "OD1", kind: "od", nominal_mm: 25, tolerance_mm: 0.05 },
        { id: "B1", kind: "bore", nominal_mm: 12, tolerance_mm: 0.008, requires_form_tolerance: true },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as InspPlanData;

    expect(data.regulatory_regime).toBe("commercial");
    expect(data.feature_records.length).toBe(2);

    // OD1: tolerance 0.05 → "standard" class, no CMM → micrometer; functional + lot 100 → AQL normal n=13.
    expect(data.feature_records[0]!.method).toBe("micrometer");
    expect(data.feature_records[0]!.frequency).toBe("aql_normal");
    expect(data.feature_records[0]!.sample_size).toBe(13);
    expect(data.feature_records[0]!.expected_seconds_per_part).toBe(12);

    // B1: tolerance 0.008 → "precision" + form callout → CMM, 12 probe points; CMM time = 10 + 12*4 = 58.
    expect(data.feature_records[1]!.method).toBe("cmm");
    expect(data.feature_records[1]!.probe_points).toBe(12);
    expect(data.feature_records[1]!.expected_seconds_per_part).toBe(58);

    // per part = 12 + 58 = 70; per lot = 13*12 + 13*58 = 910.
    expect(data.total_inspection_time_sec).toBe(70);
    expect(data.total_inspection_time_per_lot_sec).toBe(910);

    // lot >= 50 → first-article required even in commercial regime.
    expect(data.first_article_required).toBe(true);
    expect(data.equipment_list.length).toBe(2);
  });

  it("aerospace safety-critical ultra-precision OD → every_part sampling + AS9100 retention note", async () => {
    const r = await invokeHandler(turningHandler, "turning_inspection_plan", {
      part_id: "RT-2",
      lot_size: 200,
      regulatory_regime: "aerospace",
      features: [
        { id: "OD2", kind: "od", nominal_mm: 50, tolerance_mm: 0.004, criticality: "safety_critical" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as InspPlanData;

    // tolerance 0.004 → "ultra_precision"; safety_critical + ultra → every_part, n = lot.
    expect(data.feature_records[0]!.frequency).toBe("every_part");
    expect(data.feature_records[0]!.sample_size).toBe(200);
    expect(data.feature_records[0]!.method).toBe("cmm");
    // CMM, 4 probe points (no form callout) → 10 + 4*4 = 26; per lot = 200*26 = 5200.
    expect(data.feature_records[0]!.expected_seconds_per_part).toBe(26);
    expect(data.total_inspection_time_per_lot_sec).toBe(5200);

    expect(data.first_article_required).toBe(true);
    expect(data.notes.some((n) => n.includes("AS9100"))).toBe(true);
  });

  it("Ra target adds a Surftest pass to the feature record + equipment list", async () => {
    const r = await invokeHandler(turningHandler, "turning_inspection_plan", {
      part_id: "RT-3",
      lot_size: 20,
      features: [
        { id: "OD3", kind: "od", nominal_mm: 30, tolerance_mm: 0.05, ra_target_um: 0.8 },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as InspPlanData;

    // micrometer 12s + surface_roughness_tester 45s → 57s per part.
    expect(data.feature_records[0]!.expected_seconds_per_part).toBe(57);
    expect(data.feature_records[0]!.equipment_required.length).toBe(2);
    expect(data.equipment_list.some((e) => e.includes("Surftest"))).toBe(true);
    // lot 20 < 50, commercial → no first-article package.
    expect(data.first_article_required).toBe(false);
  });

  it("rejects an invalid payload at the dispatcher boundary (no success envelope)", async () => {
    const r = await invokeHandler(turningHandler, "turning_inspection_plan", {
      part_id: "RT-BAD",
      lot_size: -5,
      features: [{ id: "f1", kind: "od", nominal_mm: 10, tolerance_mm: 0.05 }],
    });
    expect(r.success).not.toBe(true);
  });
});
