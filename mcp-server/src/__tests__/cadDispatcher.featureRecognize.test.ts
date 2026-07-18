/**
 * cadDispatcher.featureRecognize.test.ts -- round-trip wire test for the
 * `feature_recognize` action (U-DELTA-CADGEN-FEATRECOG-FIX).
 *
 * Proves the FIX for the silent-empty starvation bug: the action used to route at
 * getEngine("feature") = the OLD FeatureRecognitionEngine.recognize(features[]),
 * which expected an ALREADY-recognized feature array. Given raw geometry
 * ({holes,pockets,...}) it hit `params.length === undefined`, the recognize loop
 * never ran, and it returned a silent {features:[], geometry:params}. Downstream
 * cad->cam + feature-learning got nothing.
 *
 * The action now routes at CADFeatureRecognitionEngine.extractFeatures(geometry),
 * mirroring the proven `cad_feature_extract` wiring in cadAutomationDispatcher.
 *
 * Every assertion below FAILS against the old silent-empty path:
 *  - features come back NON-EMPTY (was always []) with the {type,id,confidence,details} shape
 *  - counts + confidence + total_features are populated
 *  - the .geometry echo key that leaked from the old fallback is gone / replaced by source
 *  - the schema-declared params.geometry envelope AND a flat-geometry direct call both work
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, handler });
    },
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

// Representative CAD geometry: 2 holes, 1 pocket, 1 long slot (aspect > 4), 1 fillet, 1 chamfer.
// Mirrors the GeometryInput shape CADFeatureRecognitionEngine.extractFeatures accepts.
const REP_GEOMETRY = {
  holes: [
    { center: { x: 0, y: 0, z: 0 }, diameter_mm: 6.35, depth_mm: 12 },
    { center: { x: 25, y: 0, z: 0 }, diameter_mm: 8, depth_mm: 20 },
  ],
  pockets: [
    // square-ish pocket -> classified pocket
    { boundary: [{ x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }, { x: 20, y: 18, z: 0 }, { x: 0, y: 18, z: 0 }], depth_mm: 10 },
    // long/narrow pocket (60 x 5, ratio 12 > 4) -> classified slot
    { boundary: [{ x: 0, y: 0, z: 0 }, { x: 60, y: 0, z: 0 }, { x: 60, y: 5, z: 0 }, { x: 0, y: 5, z: 0 }], depth_mm: 6 },
  ],
  fillets: [{ edgeId: "E1", radius_mm: 3 }],
  chamfers: [{ edgeId: "E2", offset_mm: 1.5, angle_deg: 45 }],
};

describe("cadDispatcher feature_recognize (U-DELTA-CADGEN-FEATRECOG-FIX: real recognizer, no silent empty)", () => {
  it("schema-declared { geometry } envelope -> NON-EMPTY features with the right shape", async () => {
    const out = await invoke("feature_recognize", { geometry: REP_GEOMETRY });

    // The crux: the old path returned {features:[]}. If the swap regressed, this fails.
    expect(Array.isArray(out.features)).toBe(true);
    expect(out.features.length).toBeGreaterThan(0);
    // 2 holes + 1 pocket + 1 slot + 1 fillet + 1 chamfer = 6 recognized features.
    expect(out.features.length).toBe(6);

    // Each feature carries the CADFeatureRecognitionEngine shape {type,id,confidence,details}.
    for (const f of out.features) {
      expect(typeof f.type).toBe("string");
      expect(typeof f.id).toBe("string");
      expect(typeof f.confidence).toBe("number");
      expect(f.confidence).toBeGreaterThan(0);
      expect(f.details).toBeTypeOf("object");
    }

    // Types present prove the recognizer actually classified geometry (not a passthrough).
    const types = out.features.map((f: any) => f.type).sort();
    expect(types).toEqual(["chamfer", "fillet", "hole", "hole", "pocket", "slot"]);
  });

  it("populates counts, aggregate confidence, and total_features (back-compat)", async () => {
    const out = await invoke("feature_recognize", { geometry: REP_GEOMETRY });

    // counts is the per-type tally the old engine never produced from raw geometry.
    expect(out.counts).toBeTypeOf("object");
    expect(out.counts.hole).toBe(2);
    expect(out.counts.pocket).toBe(1);
    expect(out.counts.slot).toBe(1);
    expect(out.counts.fillet).toBe(1);
    expect(out.counts.chamfer).toBe(1);

    // Aggregate confidence = mean of per-feature confidences (> LOW=0.4 with real hits).
    expect(out.confidence).toBeGreaterThan(0.4);
    expect(out.confidence).toBeLessThanOrEqual(1);

    // total_features additive back-compat field for legacy callers reading the old engine.
    expect(out.total_features).toBe(6);
    // provenance stamp proves the correct engine ran (was the OLD engine before the fix).
    expect(out.source).toBe("CADFeatureRecognitionEngine.extractFeatures");
    // The old fallback leaked a `geometry: params` echo key -- it must be gone.
    expect(out.geometry).toBeUndefined();
  });

  it("long/narrow pocket is classified as a slot (aspect ratio > 4)", async () => {
    const out = await invoke("feature_recognize", {
      geometry: {
        pockets: [
          { boundary: [{ x: 0, y: 0, z: 0 }, { x: 80, y: 0, z: 0 }, { x: 80, y: 4, z: 0 }, { x: 0, y: 4, z: 0 }], depth_mm: 5 },
        ],
      },
    });
    expect(out.features.length).toBe(1);
    expect(out.features[0].type).toBe("slot");
    expect(out.counts.slot).toBe(1);
    expect(out.counts.pocket).toBe(0);
  });

  it("flat direct call (geometry at top level, no envelope) still recognizes features", async () => {
    // Direct callers who pass {holes,...} flat must not silently get []. The dispatcher
    // falls back to raw params when params.geometry is absent.
    const out = await invoke("feature_recognize", {
      holes: [{ center: { x: 0, y: 0, z: 0 }, diameter_mm: 10, depth_mm: 15 }],
    });
    expect(out.features.length).toBe(1);
    expect(out.features[0].type).toBe("hole");
    expect(out.total_features).toBe(1);
  });

  // ---- Failure / adversarial modes ----

  it("empty geometry -> zero features + LOW confidence, but NOT an error", async () => {
    const out = await invoke("feature_recognize", { geometry: {} });
    // NOTE: the dispatcher runs results through slimResponse (utils/responseSlimmer.ts:43),
    // which strips empty arrays on the wire for transport efficiency (platform-wide, applies
    // to cad_feature_extract too). So with zero features `out.features` is ABSENT, not [].
    // The stable zero-feature signal is total_features === 0; consumers must read `features ?? []`.
    expect(out.features ?? []).toEqual([]);
    expect(out.total_features).toBe(0);
    // Empty-set aggregate confidence is the CONFIDENCE_LOW floor (0.4), never NaN.
    expect(out.confidence).toBe(0.4);
    expect(Number.isNaN(out.confidence)).toBe(false);
    // It is a real result, not a dispatcher error.
    expect(out.success).not.toBe(false);
    expect(out.source).toBe("CADFeatureRecognitionEngine.extractFeatures");
  });

  it("malformed feature entries are filtered, valid ones survive (no crash)", async () => {
    const out = await invoke("feature_recognize", {
      geometry: {
        // diameter <= 0 and non-finite must be dropped by the engine's guards.
        holes: [
          { center: { x: 0, y: 0, z: 0 }, diameter_mm: -5 },
          { center: { x: 0, y: 0, z: 0 }, diameter_mm: Number.NaN },
          { center: { x: 10, y: 0, z: 0 }, diameter_mm: 12, depth_mm: 8 },
        ],
      },
    });
    // Only the one valid hole survives.
    expect(out.features.length).toBe(1);
    expect(out.features[0].type).toBe("hole");
    expect(out.counts.hole).toBe(1);
  });

  it("null/undefined geometry payload -> empty result, never throws", async () => {
    const out = await invoke("feature_recognize", { geometry: null });
    // Same slimResponse empty-array stripping as above: features absent, total_features is the signal.
    expect(out.features ?? []).toEqual([]);
    expect(out.total_features).toBe(0);
    expect(out.success).not.toBe(false);
  });
});
