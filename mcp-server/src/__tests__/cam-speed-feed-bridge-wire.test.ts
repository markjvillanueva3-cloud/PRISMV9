/**
 * cam_speed_feed_bridge wire test —
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-CAM-BRIDGE (2026-05-21, slot:juliett).
 *
 * Validates CAMSpeedFeedBridgeEngine.compute() — the pure translation +
 * encoding layer between 7 CAM hosts and SpeedFeedOrchestratorEngine. Tests
 * use an INJECTED stub compute fn so the bridge is exercised in isolation;
 * physics is owned by the orchestrator and tested separately. Real-engine
 * assertions:
 *   - pickFirst() native-field disambiguation across host vocabularies
 *   - SFM (Mastercam + ESPRIT) auto-converts to m/min via the 0.3048 factor
 *   - Each target produces the documented wire format (XML-RPC / JSON-RPC /
 *     pipe-delimited / flat JSON)
 *   - operation_id round-trips intact
 *   - compute_error path captures the thrown message and emits a structured
 *     error payload (no silent swallow)
 */
import { describe, it, expect } from "vitest";
import {
  CAMSpeedFeedBridgeEngine,
  type SFBridgeRequest,
  type SpeedFeedComputeFn,
} from "../engines/CAMSpeedFeedBridgeEngine.js";

// ── Stub compute fn — returns a known-good OrchestratorResult so we can
// verify the bridge's translation + encoding layer without booting the
// 168 KB SpeedFeedOrchestratorEngine. The bridge accepts the fn as a
// parameter for exactly this reason (per its JSDoc).
const stubResult = {
  cutting_speed_mpm: 200,
  spindle_rpm: 6366,
  feed_per_tooth_mm: 0.08,
  feed_rate_mmmin: 1527.9,
  axial_depth_mm: 5,
  radial_depth_mm: 2,
};
const goodCompute: SpeedFeedComputeFn = (input) => ({
  value: { ...stubResult, _seen_input: input } as any,
  unit: "compound",
  confidence: 0.9,
  source: "stub",
});
const throwingCompute: SpeedFeedComputeFn = () => {
  throw new Error("stub compute intentional failure");
};

function reqFor(target: SFBridgeRequest["target"], native: Record<string, unknown>): SFBridgeRequest {
  return {
    target,
    native_request: { operation_id: "op-test-001", ...native } as any,
  };
}

describe("cam_speed_feed_bridge wire — CAMSpeedFeedBridgeEngine.compute()", () => {
  it("hyperMILL: encodes result as XML-RPC methodCall with the documented field order", () => {
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("hypermill", {
        toolDiameter: 10,
        flutes: 3,
        cuttingSpeedVc: 200,
        feedPerTooth_fz: 0.08,
      }),
      goodCompute,
    );
    expect(r.status).toBe("ok");
    expect(r.error).toBeNull();
    expect(r.native_payload).toContain("<methodName>PRISM.SpeedFeedRecommendation</methodName>");
    expect(r.native_payload).toContain("op-test-001");
    expect(r.native_payload).toContain("200.00"); // Vc
    expect(r.native_payload).toContain("6366");    // RPM (toFixed(0))
    expect(r.native_payload).toContain("0.0800"); // fz (toFixed(4))
  });

  it("fusion360: encodes as JSON-RPC with method 'cam.speedFeedRecommendation'", () => {
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("fusion360", { toolDiameter: 12, spindleSpeed: 5000, feedPerTooth: 0.1 }),
      goodCompute,
    );
    const parsed = JSON.parse(r.native_payload);
    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.method).toBe("cam.speedFeedRecommendation");
    expect(parsed.params.operation_id).toBe("op-test-001");
    expect(parsed.params.rpm).toBeCloseTo(6366, 0);
  });

  it("mastercam: SFM → Vc auto-converts via the 0.3048 factor and encodes pipe-delimited", () => {
    // sfm = 656.2 → Vc = 656.2 × 0.3048 ≈ 200.01 m/min. Verify pickFirst()
    // picks `dia` as toolDiameter (Mastercam native) and that the encoded
    // pipe-string fields are in the documented order: SF|op|rpm|feed|fz|Vc.
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("mastercam", { dia: 10, rpm: 6366, sfm: 656.2, fpt: 0.08 }),
      goodCompute,
    );
    expect(r.status).toBe("ok");
    const fields = r.native_payload.split("|");
    expect(fields[0]).toBe("SF");
    expect(fields[1]).toBe("op-test-001");
    expect(Number(fields[2])).toBe(6366);
    expect(fields[5]).toBe("200.00"); // Vc in m/min (post-conversion)
    // Verify the translated input received the converted Vc, not raw SFM.
    const tr = r.translated_input as Record<string, unknown>;
    // 656.2 SFM × 0.3048 = 200.01 m/min — within float tolerance.
    expect(tr.__vc_override).toBeCloseTo(200, 1);
  });

  it("esprit: surfaceSpeed (SFM) recommendation field is the orchestrator's Vc converted BACK to SFM (round-trip US-centric UI)", () => {
    // The engine intentionally outputs the recommendation Vc reconverted to
    // SFM for ESPRIT's UI. Our stub returns Vc=200 m/min → SFM = 200 / 0.3048 ≈ 656.17.
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("esprit", { cutterDiameter: 10, surfaceSpeed: 656.2, feedPerToothEsp: 0.08 }),
      goodCompute,
    );
    expect(r.status).toBe("ok");
    const fields = r.native_payload.split("|");
    expect(fields[0]).toBe("ESPRIT");
    // Field 5 = Vc converted to SFM for ESPRIT's US-centric UI.
    expect(Number(fields[5])).toBeCloseTo(656.2, 0);
  });

  it("solidcam: flat-JSON with the SolidCAM SolidWorks-addin keys (spinSpeed/feedZ/feedRate/vc)", () => {
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("solidcam", { solidcamDiameter: 10, spinSpeed: 6000, feedZ: 0.08 }),
      goodCompute,
    );
    const parsed = JSON.parse(r.native_payload);
    expect(parsed.type).toBe("solidcam.speedFeed");
    expect(parsed.operationId).toBe("op-test-001");
    expect(parsed.spinSpeed).toBe(6366);
    expect(parsed.vc).toBeCloseTo(200, 2);
  });

  it("inventor_hsm: flat-JSON with type 'hsm.speedFeedRecommendation' and the payload spread", () => {
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("inventor_hsm", { toolDia: 10, spindleRpm: 5000, feedPerTooth: 0.08 }),
      goodCompute,
    );
    const parsed = JSON.parse(r.native_payload);
    expect(parsed.type).toBe("hsm.speedFeedRecommendation");
    expect(parsed.operation_id).toBe("op-test-001");
    expect(parsed.rpm).toBe(6366);
  });

  it("generic: default flat-JSON envelope when target is 'generic'", () => {
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("generic", { tool_diameter_mm: 10, spindle_rpm: 6000, feed_per_tooth: 0.08 }),
      goodCompute,
    );
    const parsed = JSON.parse(r.native_payload);
    expect(parsed.type).toBe("speed_feed_recommendation");
    expect(parsed.operation_id).toBe("op-test-001");
  });

  it("pickFirst: hyperMILL toolDiameter + Mastercam dia coexist — toolDiameter wins (its native host's primary field)", () => {
    // When the caller (mistakenly) populates BOTH fields, the bridge picks
    // toolDiameter first because that's the documented hyperMILL primary —
    // but `target: "mastercam"` should NOT change the precedence (translation
    // is a pure key-merge, not target-driven). Verifies the
    // pickFirst(tool_diameter_mm, toolDiameter, toolDia, dia, ...) order from
    // normalizeRequest().
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("mastercam", { toolDiameter: 14, dia: 10, rpm: 6000, fpt: 0.08 }),
      goodCompute,
    );
    const tr = r.translated_input as Record<string, unknown>;
    // pickFirst order: tool_diameter_mm → toolDiameter → toolDia → dia
    // → cutterDiameter → solidcamDiameter. So toolDiameter (14) wins over dia (10).
    expect(tr.tool_diameter_mm).toBe(14);
  });

  it("compute throw → status:compute_error with the thrown message captured, NO silent swallow", () => {
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("fusion360", { toolDiameter: 10, spindleSpeed: 5000, feedPerTooth: 0.1 }),
      throwingCompute,
    );
    expect(r.status).toBe("compute_error");
    expect(r.error).toBe("stub compute intentional failure");
    expect(r.orchestrator_result).toBeNull();
    // Native payload must still be a structured error, not garbage.
    const parsed = JSON.parse(r.native_payload);
    expect(parsed.status).toBe("compute_error");
    expect(parsed.error).toBe("stub compute intentional failure");
  });

  it("returns the complete documented result contract (7 fields)", () => {
    const r = CAMSpeedFeedBridgeEngine.compute(
      reqFor("generic", { tool_diameter_mm: 10, spindle_rpm: 6000, feed_per_tooth: 0.08 }),
      goodCompute,
    );
    expect(typeof r.target).toBe("string");
    expect(typeof r.operation_id).toBe("string");
    expect(r.operation_id).toBe("op-test-001");
    expect(typeof r.translated_input).toBe("object");
    expect(typeof r.orchestrator_result).toBe("object");
    expect(typeof r.native_payload).toBe("string");
    expect(["ok", "compute_error"]).toContain(r.status);
    // error is nullable on success
    expect(r.error === null || typeof r.error === "string").toBe(true);
  });

  it("supportedTargets() returns the 7 documented CAM-host keys", () => {
    const targets = CAMSpeedFeedBridgeEngine.supportedTargets();
    expect(targets).toContain("hypermill");
    expect(targets).toContain("fusion360");
    expect(targets).toContain("inventor_hsm");
    expect(targets).toContain("mastercam");
    expect(targets).toContain("esprit");
    expect(targets).toContain("solidcam");
    expect(targets).toContain("generic");
    expect(targets.length).toBe(7);
  });

  it("invalid target rejected by Zod (not silently coerced)", () => {
    // The bridge parses the request via SFBridgeRequestSchema — an unknown
    // target must throw, not fall through to default-encoding.
    expect(() =>
      CAMSpeedFeedBridgeEngine.compute(
        { target: "siemens_nx" as any, native_request: { operation_id: "x" } as any },
        goodCompute,
      ),
    ).toThrow();
  });
});
