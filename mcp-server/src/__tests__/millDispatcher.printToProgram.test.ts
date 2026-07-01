/**
 * KILO-P2P-RECONCILE-MS0 / U-KP2P-01 — mill print-to-program wire test (slot:kilo, 2026-05-22)
 *
 * Before this unit, millDispatcher's "program" bucket lazy-imported the
 * MillPrintToProgramEngine STUB (returns {ok:false,stub:true} — never a real
 * program). U-KP2P-01 re-points the bucket to the real MillingPrintToProgramEngine
 * (runFullPipeline) and adds the toMillingInput param adapter (the dispatcher
 * schema types `material` as a string; the engine needs it as an object).
 *
 * These tests round-trip through the prism_mill dispatcher handler (NOT the engine
 * singleton). Each scenario is dispatched ONCE in beforeAll and the cached result
 * is asserted — this keeps engine invocations minimal and the assertions
 * deterministic. They assert concrete output VALUES, not field presence:
 *   - feature_count === N (matches the inputs) — the stub never reports this.
 *   - total_operations > 0 and operations.length === total_operations — a real,
 *     internally-consistent process plan. The stub has no operations array.
 *   - program_text is a non-empty G-code string — the stub emits none.
 *   - estimated_cycle_time_sec > 0 — a physics-derived value.
 *   Every one fails HARD (expect(undefined).toBe(3) etc.) if the bucket ever
 *   regresses to the stub — that regression is what this unit prevents.
 *
 * NOTE on the dispatcher contract: the prism_mill handler wraps results through
 * slimResponse() (utils/responseSlimmer.ts), which drops null/undefined values
 * and EMPTY arrays. Assertions therefore target scalar fields and non-empty
 * collections — an empty `operations`/`missing_dimensions` array is intentionally
 * absent from the wire response. mill_generate_gcode is byte-identical to
 * mill_print_to_program after U-KP2P-01, so program_text is asserted once on the
 * print path; the gcode path is verified for routing (no [NOT_WIRED]) + a real
 * result. The `call()` helper deep-clones params per invocation because
 * runFullPipeline mutates its input in place — a pre-existing engine trait the
 * dispatcher tolerates (each MCP request carries a fresh object in production).
 *
 * Pattern mirrors millDispatcher.bridge-wire-fiveaxis-cam.test.ts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerMillDispatcher } from "../tools/dispatchers/millDispatcher.js";

interface ToolCall {
  action: string;
  params?: Record<string, unknown>;
}
interface CallResult {
  raw: any;
  success: boolean;
  error?: string;
}

let handler:
  | ((args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>)
  | null = null;

async function call(c: ToolCall): Promise<CallResult> {
  if (!handler) throw new Error("prism_mill handler not captured");
  // Deep-clone params per call: the engine pipeline (and normalizeParams) mutate
  // their input in place, so passing a shared input object across calls corrupts
  // it — the first call succeeds, later calls degrade to 0 ops / criticalFail.
  const r: any = await handler({
    action: c.action,
    params: c.params ? structuredClone(c.params) : c.params,
  });
  let text: string | undefined;
  if (r && typeof r === "object" && Array.isArray(r.content) && typeof r.content[0]?.text === "string") {
    text = r.content[0].text;
  } else if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") {
    text = r.text;
  }
  if (text === undefined) return { raw: r, success: true };
  try {
    const parsed = JSON.parse(text);
    return { raw: parsed, success: !parsed?.error && parsed?.success !== false, error: parsed?.error };
  } catch {
    return { raw: r, success: true };
  }
}

/** Realistic JM-Die-style milling part. `machine` is omitted so the engine
 *  resolves the machine spec from `controller` (haas_ngc -> Haas VF-2), which
 *  also avoids the dispatcher's machineConfig object-schema. `material` is a
 *  string by design — the toMillingInput adapter wraps it into
 *  {material_name, iso_group}. */
const REALISTIC_INPUT: Record<string, unknown> = {
  part_number: "JMD-KP2P-TEST",
  material: "D2 tool steel",
  iso_group: "H",
  controller: "haas_ngc",
  stock_size: { x: 120, y: 120, z: 40 },
  features: [
    { id: "F1", type: "face", depth_mm: 2, width_mm: 100, length_mm: 100 },
    { id: "F2", type: "hole_through", diameter_mm: 8, depth_mm: 40 },
    { id: "F3", type: "pocket_closed", width_mm: 40, length_mm: 60, depth_mm: 12, corner_radius_mm: 6 },
  ],
};

let mainResult: any;
let gcodeRsp: CallResult;
let strMatResult: any;
let noMatResult: any;
let noFeatResult: any;

beforeAll(async () => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: unknown,
      fn: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>,
    ) => {
      if (_name === "prism_mill") handler = fn;
    },
  };
  registerMillDispatcher(fakeServer);
  if (!handler) throw new Error("millDispatcher did not register the prism_mill tool");

  mainResult = (await call({ action: "mill_print_to_program", params: REALISTIC_INPUT })).raw;
  gcodeRsp = await call({ action: "mill_generate_gcode", params: REALISTIC_INPUT });
  strMatResult = (
    await call({ action: "mill_print_to_program", params: { ...REALISTIC_INPUT, material: "6061-T6" } })
  ).raw;

  const noMaterial: Record<string, unknown> = { ...REALISTIC_INPUT };
  delete noMaterial.material;
  noMatResult = (await call({ action: "mill_print_to_program", params: noMaterial })).raw;

  const noFeatures: Record<string, unknown> = { ...REALISTIC_INPUT };
  delete noFeatures.features;
  noFeatResult = (await call({ action: "mill_print_to_program", params: noFeatures })).raw;
});

describe("millDispatcher mill_print_to_program — real engine (not stub)", () => {
  it("classifies all 3 input features (the stub never reports feature_count)", () => {
    expect(mainResult?.stub).not.toBe(true);
    expect(mainResult?.feature_count).toBe(3);
  });

  it("returns a structured intake_validation stage with a boolean `complete`", () => {
    expect(typeof mainResult?.intake_validation?.complete).toBe("boolean");
  });

  it("emits a non-empty, internally-consistent operations plan", () => {
    expect(Array.isArray(mainResult?.operations)).toBe(true);
    expect(mainResult?.total_operations).toBeGreaterThan(0);
    expect(mainResult?.operations.length).toBe(mainResult?.total_operations);
  });

  it("emits a non-empty G-code program string", () => {
    expect(typeof mainResult?.program_text).toBe("string");
    expect(mainResult?.program_text.length).toBeGreaterThan(0);
  });

  it("echoes the input part_number and resolves a Haas machine from the controller", () => {
    expect(mainResult?.part_number).toBe("JMD-KP2P-TEST");
    expect(typeof mainResult?.machine).toBe("string");
    expect(String(mainResult?.machine).toLowerCase()).toMatch(/haas|vf/);
  });

  it("computes a positive estimated cycle time", () => {
    expect(typeof mainResult?.estimated_cycle_time_sec).toBe("number");
    expect(mainResult?.estimated_cycle_time_sec).toBeGreaterThan(0);
  });

  it("reports total_tool_changes as a non-negative number", () => {
    expect(typeof mainResult?.total_tool_changes).toBe("number");
    expect(mainResult?.total_tool_changes).toBeGreaterThanOrEqual(0);
  });
});

describe("millDispatcher mill_generate_gcode — routes to runFullPipeline", () => {
  it("does NOT throw [NOT_WIRED] (the old generateGcode method-not-found path)", () => {
    expect(gcodeRsp?.error ?? "").not.toMatch(/NOT_WIRED/);
  });

  it("returns a real MillingProgramResult, not the stub sentinel", () => {
    expect(gcodeRsp?.raw?.stub).not.toBe(true);
    expect(gcodeRsp?.raw?.feature_count).toBe(3);
    expect(gcodeRsp?.raw?.total_operations).toBeGreaterThan(0);
  });
});

describe("toMillingInput adapter — schema/engine shape reconciliation", () => {
  it("adapts a string `material` (6061-T6) into the engine object shape", () => {
    expect(strMatResult?.stub).not.toBe(true);
    expect(strMatResult?.feature_count).toBe(3);
    expect(strMatResult?.total_operations).toBeGreaterThan(0);
  });

  it("tolerates an omitted `material` — adapter supplies a default object", () => {
    expect(noMatResult?.feature_count).toBe(3);
    expect(typeof noMatResult?.intake_validation?.complete).toBe("boolean");
  });

  it("tolerates omitted `features` — adapter supplies [], real result, zero ops", () => {
    expect(noFeatResult?.stub).not.toBe(true);
    expect(noFeatResult?.feature_count).toBe(0);
    expect(noFeatResult?.total_operations).toBe(0);
  });
});
