/**
 * cadDispatcher per_app_incad_infer fail-loud-honest wiring (U-INCAD-INFER-FAILLOUD).
 *
 * The case previously did `new PerAppInCADInferenceAdapter()` with NO args, but the
 * constructor REQUIRES an injected InferenceRuntime + FeatureExtractor -> a TypeError
 * crash on construct (it never reached the dark runInference/extractFromGeometry probe).
 * This adapter runs inference INSIDE a CAD plugin host; those backends cannot come
 * through a JSON dispatcher call. Now the action FAILS LOUD + honest: reports the
 * backend-required mode + the real (pure, no-construct) capability contract via the new
 * static describeCapabilities().
 *
 * Round-trips THROUGH prism_cad (registerCadDispatcher) + a direct static-method unit
 * that locks the contract to the canonical schema enums.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import {
  PerAppInCADInferenceAdapter,
  CADAppTypeSchema,
  InferenceTypeSchema,
  ModelFormatSchema,
  QuantizationSchema,
} from "../engines/PerAppInCADInferenceAdapter.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) { captured.push({ name, handler }); },
  };
}
let handler: CapturedTool["handler"];
async function invoke(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = (await handler({ action, params })) as any;
  if (res && res.success === false) return res;
  const text = res?.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return { __raw: text }; }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

describe("cadDispatcher per_app_incad_infer -- fail-loud-honest (no crash-on-construct)", () => {
  it("reports backend-required + real capabilities, NOT a crash or 'method not callable'", async () => {
    const r = await invoke("per_app_incad_infer", {});
    expect(r.success).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(JSON.stringify(r)).not.toMatch(/Cannot read properties of undefined/i); // the old crash
    const d = r.data as { wired: boolean; mode: string; reason: string; capabilities: any };
    expect(d.wired).toBe(false);
    expect(d.mode).toBe("backend-required");
    expect(typeof d.reason).toBe("string");
    expect(d.capabilities.engine).toBe("PerAppInCADInferenceAdapter");
    // discoverable surface: all 10 CAD apps + 10 inference types
    expect(d.capabilities.cadApps).toEqual(expect.arrayContaining(["fusion360", "mastercam", "solidworks"]));
    expect(d.capabilities.cadApps).toHaveLength(10);
    expect(d.capabilities.inferenceTypes).toEqual(expect.arrayContaining(["tool_recommendation", "feature_recognition"]));
    expect(d.capabilities.inferenceTypes).toHaveLength(10);
    expect(d.capabilities.backendRequired.runtime).toMatch(/InferenceRuntime/);
  });

  it("does NOT crash on construct even when given arbitrary inference params (the old TypeError path)", async () => {
    const r = await invoke("per_app_incad_infer", { modelId: "m1", cad_app: "fusion360", input: [1, 2, 3] });
    expect(r.success).toBe(true);
    expect((r.data as { mode: string }).mode).toBe("backend-required");
  });

  it("is deterministic: identical capability contract across calls", async () => {
    const a = await invoke("per_app_incad_infer", {});
    const b = await invoke("per_app_incad_infer", { junk: "ignored" });
    expect(a.data).toEqual(b.data);
  });
});

describe("PerAppInCADInferenceAdapter.describeCapabilities -- pure static contract (no construct)", () => {
  it("returns the canonical schema enums (fails if the contract drifts from the schemas)", () => {
    const c = PerAppInCADInferenceAdapter.describeCapabilities();
    expect(c.cadApps).toEqual([...CADAppTypeSchema.options]);
    expect(c.inferenceTypes).toEqual([...InferenceTypeSchema.options]);
    expect(c.modelFormats).toEqual([...ModelFormatSchema.options]);
    expect(c.quantizations).toEqual([...QuantizationSchema.options]);
    expect(c.defaultSloTargetMs).toBe(100); // p99 SLO from DEFAULT_SLO_TARGET_MS
    expect(c.backendRequired.extractor).toMatch(/FeatureExtractor/);
  });

  it("requires no constructor (the ctor needs injected backends a dispatcher cannot supply)", () => {
    // proves the static path never touches the backend-requiring constructor
    expect(() => PerAppInCADInferenceAdapter.describeCapabilities()).not.toThrow();
  });
});
