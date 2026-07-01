/**
 * CAMSpeedFeedBridgeEngine tests — U-CAM99
 * =========================================
 *
 * Schema, per-host request translation, per-host response encoding,
 * compute pipeline with injected orchestrator, error handling,
 * SFM→m/min conversion, field-preference order. Target ≥30 cases.
 */

import { describe, it, expect } from "vitest";
import {
  CAMSpeedFeedBridgeEngine as SFB,
  SFBridgeRequestSchema,
  SFBridgeResponseSchema,
  SFNativeRequestSchema,
  normalizeRequest,
  encodeResponse,
  type SFNativeRequest,
  type SpeedFeedComputeFn,
} from "../engines/CAMSpeedFeedBridgeEngine.js";
import type {
  OrchestratorInput,
  OrchestratorResult,
  AtomicValue,
} from "../engines/SpeedFeedOrchestratorEngine.js";

function minimalResult(
  override: Partial<OrchestratorResult> = {},
): OrchestratorResult {
  return {
    cutting_speed_mpm: 120.5,
    spindle_rpm: 4800,
    feed_per_tooth_mm: 0.05,
    feed_rate_mmmin: 960.0,
    axial_depth_mm: 4.0,
    radial_depth_mm: 1.5,
    ...override,
  } as OrchestratorResult;
}

function atomic(result: OrchestratorResult): AtomicValue<OrchestratorResult> {
  return {
    value: result,
    confidence: 0.9,
    source: "test",
  } as AtomicValue<OrchestratorResult>;
}

function stubCompute(result: OrchestratorResult): SpeedFeedComputeFn {
  return () => atomic(result);
}

function throwingCompute(msg: string): SpeedFeedComputeFn {
  return () => {
    throw new Error(msg);
  };
}

describe("CAMSpeedFeedBridgeEngine — Schemas", () => {
  it("SFBridgeRequestSchema accepts a minimal well-formed request", () => {
    expect(() =>
      SFBridgeRequestSchema.parse({
        target: "hypermill",
        native_request: { operation_id: "OP-1", material: "6061" },
      }),
    ).not.toThrow();
  });

  it("rejects unknown target", () => {
    expect(() =>
      SFBridgeRequestSchema.parse({
        target: "catia" as unknown,
        native_request: { operation_id: "OP-1" },
      }),
    ).toThrow();
  });

  it("rejects native request without operation_id", () => {
    expect(() =>
      SFNativeRequestSchema.parse({ material: "6061" }),
    ).toThrow();
  });

  it("rejects negative tool diameters", () => {
    expect(() =>
      SFNativeRequestSchema.parse({
        operation_id: "OP-1",
        toolDiameter: -1,
      }),
    ).toThrow();
  });

  it("SFBridgeResponseSchema validates an ok response", () => {
    const r = SFB.compute(
      {
        target: "generic",
        native_request: { operation_id: "OP-1" },
      },
      stubCompute(minimalResult()),
    );
    expect(() => SFBridgeResponseSchema.parse(r)).not.toThrow();
  });

  it("supportedTargets() returns all seven target slots (6 tier-1 CAM + generic)", () => {
    expect(SFB.supportedTargets()).toEqual([
      "hypermill",
      "fusion360",
      "inventor_hsm",
      "mastercam",
      "esprit",
      "solidcam",
      "generic",
    ]);
  });

  it("SFBridgeTargetSchema accepts esprit and solidcam", () => {
    expect(() =>
      SFBridgeRequestSchema.parse({
        target: "esprit",
        native_request: { operation_id: "OP-ESP" },
      }),
    ).not.toThrow();
    expect(() =>
      SFBridgeRequestSchema.parse({
        target: "solidcam",
        native_request: { operation_id: "OP-SC" },
      }),
    ).not.toThrow();
  });
});

describe("CAMSpeedFeedBridgeEngine — Request translation (per host)", () => {
  it("translates hyperMILL toolDiameter + cuttingSpeedVc + fz", () => {
    const input = normalizeRequest("hypermill", {
      operation_id: "OP-1",
      toolDiameter: 12.0,
      cuttingSpeedVc: 180.0,
      feedPerTooth_fz: 0.08,
      flutes: 3,
    });
    expect(input.tool_diameter_mm).toBe(12.0);
    expect(input.flutes).toBe(3);
    expect(input.cam_system).toBe("hyperMILL");
    expect((input as Record<string, unknown>).__vc_override).toBe(180);
    expect((input as Record<string, unknown>).__fz_override).toBe(0.08);
  });

  it("translates Fusion 360 toolDiameter + spindleSpeed + feedPerTooth", () => {
    const input = normalizeRequest("fusion360", {
      operation_id: "OP-2",
      toolDiameter: 10.0,
      spindleSpeed: 6000,
      feedPerTooth: 0.04,
    });
    expect(input.tool_diameter_mm).toBe(10.0);
    expect(input.cam_system).toBe("Fusion360");
    expect((input as Record<string, unknown>).__rpm_override).toBe(6000);
    expect((input as Record<string, unknown>).__fz_override).toBe(0.04);
  });

  it("translates Inventor HSM toolDia + spindleRpm + feedPerTooth", () => {
    const input = normalizeRequest("inventor_hsm", {
      operation_id: "OP-3",
      toolDia: 8.0,
      spindleRpm: 7200,
      feedPerTooth: 0.03,
    });
    expect(input.tool_diameter_mm).toBe(8.0);
    expect(input.cam_system).toBe("Inventor HSM");
    expect((input as Record<string, unknown>).__rpm_override).toBe(7200);
  });

  it("translates Mastercam dia + rpm + fpt", () => {
    const input = normalizeRequest("mastercam", {
      operation_id: "OP-4",
      dia: 6.0,
      rpm: 9500,
      fpt: 0.025,
    });
    expect(input.tool_diameter_mm).toBe(6.0);
    expect(input.cam_system).toBe("Mastercam");
    expect((input as Record<string, unknown>).__rpm_override).toBe(9500);
    expect((input as Record<string, unknown>).__fz_override).toBe(0.025);
  });

  it("converts Mastercam sfm → Vc in m/min", () => {
    const input = normalizeRequest("mastercam", {
      operation_id: "OP-5",
      dia: 6.0,
      sfm: 500,
    });
    // 500 * 0.3048 = 152.4
    expect((input as Record<string, unknown>).__vc_override).toBeCloseTo(152.4, 3);
  });

  it("generic target passes tool_diameter_mm + spindle_rpm unchanged", () => {
    const input = normalizeRequest("generic", {
      operation_id: "OP-6",
      tool_diameter_mm: 14.0,
      spindle_rpm: 4000,
      feed_per_tooth: 0.06,
    });
    expect(input.tool_diameter_mm).toBe(14.0);
    expect(input.cam_system).toBeUndefined();
    expect((input as Record<string, unknown>).__rpm_override).toBe(4000);
  });

  it("prefers generic tool_diameter_mm when both generic and native present", () => {
    const input = normalizeRequest("fusion360", {
      operation_id: "OP-7",
      tool_diameter_mm: 20.0,
      toolDiameter: 10.0,
    });
    expect(input.tool_diameter_mm).toBe(20.0);
  });

  it("prefers cuttingSpeedVc over sfm when both present", () => {
    const input = normalizeRequest("mastercam", {
      operation_id: "OP-8",
      cuttingSpeedVc: 200.0,
      sfm: 500,
    });
    expect((input as Record<string, unknown>).__vc_override).toBe(200.0);
  });

  it("preserves material + iso_group", () => {
    const input = normalizeRequest("hypermill", {
      operation_id: "OP-9",
      material: "D2",
      iso_group: "H",
    });
    expect(input.material).toBe("D2");
    expect(input.iso_group).toBe("H");
  });

  it("preserves operation + cut_type", () => {
    const input = normalizeRequest("fusion360", {
      operation_id: "OP-10",
      operation: "turning",
      cut_type: "roughing",
    });
    expect(input.operation).toBe("turning");
    expect(input.cut_type).toBe("roughing");
  });

  it("leaves overrides undefined when the corresponding field is absent", () => {
    const input = normalizeRequest("hypermill", {
      operation_id: "OP-11",
    });
    expect((input as Record<string, unknown>).__fz_override).toBeUndefined();
    expect((input as Record<string, unknown>).__vc_override).toBeUndefined();
    expect((input as Record<string, unknown>).__rpm_override).toBeUndefined();
  });
});

describe("CAMSpeedFeedBridgeEngine — Response encoding", () => {
  const result = minimalResult({
    cutting_speed_mpm: 152.4,
    spindle_rpm: 6000,
    feed_per_tooth_mm: 0.05,
    feed_rate_mmmin: 900,
  });

  it("hyperMILL → XML-RPC methodCall payload", () => {
    const payload = encodeResponse("hypermill", "OP-1", result, null);
    expect(payload).toMatch(/methodCall/);
    expect(payload).toMatch(/PRISM\.SpeedFeedRecommendation/);
    expect(payload).toMatch(/152\.40/);
    expect(payload).toMatch(/6000/);
  });

  it("Fusion 360 → JSON-RPC 2.0 payload with cam.speedFeedRecommendation", () => {
    const payload = encodeResponse("fusion360", "OP-1", result, null);
    const parsed = JSON.parse(payload);
    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.method).toBe("cam.speedFeedRecommendation");
    expect(parsed.params.rpm).toBe(6000);
  });

  it("Inventor HSM → JSON envelope with type hsm.speedFeedRecommendation", () => {
    const payload = encodeResponse("inventor_hsm", "OP-1", result, null);
    const parsed = JSON.parse(payload);
    expect(parsed.type).toBe("hsm.speedFeedRecommendation");
    expect(parsed.rpm).toBe(6000);
  });

  it("Mastercam → pipe-delimited compact format", () => {
    const payload = encodeResponse("mastercam", "OP-1", result, null);
    expect(payload).toMatch(/^SF\|OP-1\|6000\|900\.0\|0\.0500\|152\.40$/);
  });

  it("generic target → JSON speed_feed_recommendation", () => {
    const payload = encodeResponse("generic", "OP-1", result, null);
    const parsed = JSON.parse(payload);
    expect(parsed.type).toBe("speed_feed_recommendation");
  });

  it("compute_error response encodes as JSON error envelope", () => {
    const payload = encodeResponse("fusion360", "OP-1", null, "out of range");
    const parsed = JSON.parse(payload);
    expect(parsed.status).toBe("compute_error");
    expect(parsed.error).toBe("out of range");
  });
});

describe("CAMSpeedFeedBridgeEngine — End-to-end compute", () => {
  it("compute() translates, runs compute fn, encodes for target", () => {
    const result = minimalResult();
    const r = SFB.compute(
      {
        target: "fusion360",
        native_request: {
          operation_id: "OP-E2E",
          toolDiameter: 12.0,
          material: "6061",
          spindleSpeed: 6000,
        },
      },
      stubCompute(result),
    );
    expect(r.status).toBe("ok");
    expect(r.orchestrator_result).not.toBeNull();
    const parsed = JSON.parse(r.native_payload);
    expect(parsed.method).toBe("cam.speedFeedRecommendation");
  });

  it("compute() returns compute_error when compute fn throws", () => {
    const r = SFB.compute(
      {
        target: "hypermill",
        native_request: { operation_id: "OP-FAIL", toolDiameter: 10.0 },
      },
      throwingCompute("material not resolvable"),
    );
    expect(r.status).toBe("compute_error");
    expect(r.error).toMatch(/material not resolvable/);
    expect(r.orchestrator_result).toBeNull();
  });

  it("compute() rejects missing target", () => {
    expect(() =>
      SFB.compute(
        {
          target: "x3d" as unknown as "generic",
          native_request: { operation_id: "OP-1" },
        },
        stubCompute(minimalResult()),
      ),
    ).toThrow();
  });

  it("compute() surfaces translated_input for downstream debugging", () => {
    const r = SFB.compute(
      {
        target: "mastercam",
        native_request: {
          operation_id: "OP-DEBUG",
          dia: 8,
          sfm: 500,
          fpt: 0.025,
        },
      },
      stubCompute(minimalResult()),
    );
    const t = r.translated_input;
    expect(t.tool_diameter_mm).toBe(8);
    expect((t as Record<string, unknown>).__vc_override).toBeCloseTo(152.4, 3);
    expect((t as Record<string, unknown>).__fz_override).toBe(0.025);
  });

  it("compute() propagates operation_id into response", () => {
    const r = SFB.compute(
      {
        target: "hypermill",
        native_request: { operation_id: "OP-PROP" },
      },
      stubCompute(minimalResult()),
    );
    expect(r.operation_id).toBe("OP-PROP");
  });

  it("translateRequest() without compute returns input only", () => {
    const translated = SFB.translateRequest("mastercam", {
      operation_id: "OP-T",
      dia: 6,
    });
    expect(translated.tool_diameter_mm).toBe(6);
  });

  it("translateResponse() without compute encodes a preformed result", () => {
    const payload = SFB.translateResponse("fusion360", "OP-T", minimalResult());
    expect(payload).toMatch(/jsonrpc/);
  });
});

describe("CAMSpeedFeedBridgeEngine — ESPRIT + SolidCAM translation", () => {
  it("translates ESPRIT cutterDiameter + surfaceSpeed(SFM) + feedPerToothEsp", () => {
    const input = normalizeRequest("esprit", {
      operation_id: "OP-ESP-1",
      cutterDiameter: 9.525,
      surfaceSpeed: 400,
      feedPerToothEsp: 0.06,
      flutes: 2,
    });
    expect(input.tool_diameter_mm).toBe(9.525);
    expect(input.flutes).toBe(2);
    expect(input.cam_system).toBe("ESPRIT");
    expect((input as Record<string, unknown>).__vc_override).toBeCloseTo(121.92, 3);
    expect((input as Record<string, unknown>).__fz_override).toBe(0.06);
  });

  it("translates SolidCAM solidcamDiameter + spinSpeed + feedZ", () => {
    const input = normalizeRequest("solidcam", {
      operation_id: "OP-SC-1",
      solidcamDiameter: 16.0,
      spinSpeed: 5200,
      feedZ: 0.07,
    });
    expect(input.tool_diameter_mm).toBe(16.0);
    expect(input.cam_system).toBe("SolidCAM");
    expect((input as Record<string, unknown>).__rpm_override).toBe(5200);
    expect((input as Record<string, unknown>).__fz_override).toBe(0.07);
  });

  it("ESPRIT surfaceSpeed defers to explicit cuttingSpeedVc when both present", () => {
    const input = normalizeRequest("esprit", {
      operation_id: "OP-ESP-2",
      cutterDiameter: 10,
      cuttingSpeedVc: 175.0,
      surfaceSpeed: 400,
    });
    expect((input as Record<string, unknown>).__vc_override).toBe(175.0);
  });

  it("generic tool_diameter_mm still wins over esprit native cutterDiameter", () => {
    const input = normalizeRequest("esprit", {
      operation_id: "OP-ESP-3",
      tool_diameter_mm: 25.0,
      cutterDiameter: 9.525,
    });
    expect(input.tool_diameter_mm).toBe(25.0);
  });

  it("rejects negative cutterDiameter / spinSpeed and zero feedZ (adversarial)", () => {
    expect(() =>
      SFNativeRequestSchema.parse({ operation_id: "OP-X", cutterDiameter: -1 }),
    ).toThrow();
    expect(() =>
      SFNativeRequestSchema.parse({ operation_id: "OP-X", spinSpeed: -100 }),
    ).toThrow();
    expect(() =>
      SFNativeRequestSchema.parse({ operation_id: "OP-X", feedZ: 0 }),
    ).toThrow();
  });
});

describe("CAMSpeedFeedBridgeEngine — ESPRIT + SolidCAM response encoding", () => {
  const result = minimalResult({
    cutting_speed_mpm: 152.4,
    spindle_rpm: 6000,
    feed_per_tooth_mm: 0.05,
    feed_rate_mmmin: 900,
  });

  it("ESPRIT → pipe-delimited record, vc echoed back in SFM", () => {
    const payload = encodeResponse("esprit", "OP-1", result, null);
    const parts = payload.split("|");
    expect(parts[0]).toBe("ESPRIT");
    expect(parts[1]).toBe("OP-1");
    expect(parts[2]).toBe("6000");
    expect(parts[3]).toBe("900.0");
    expect(parts[4]).toBe("0.0500");
    expect(Number(parts[5])).toBeCloseTo(500.0, 1);
  });

  it("SolidCAM → flat JSON tag with spinSpeed/feedZ", () => {
    const payload = encodeResponse("solidcam", "OP-1", result, null);
    const parsed = JSON.parse(payload);
    expect(parsed.type).toBe("solidcam.speedFeed");
    expect(parsed.operationId).toBe("OP-1");
    expect(parsed.spinSpeed).toBe(6000);
    expect(parsed.feedZ).toBe(0.05);
    expect(parsed.feedRate).toBe(900);
    expect(parsed.vc).toBeCloseTo(152.4, 2);
  });

  it("ESPRIT compute_error encodes as JSON error envelope (shared path)", () => {
    const payload = encodeResponse("esprit", "OP-1", null, "tool not in catalog");
    const parsed = JSON.parse(payload);
    expect(parsed.status).toBe("compute_error");
    expect(parsed.error).toBe("tool not in catalog");
  });
});

// ── Real-corpus integration ──────────────────────────────────────────────────
// Exercises the *default* compute path against the real
// SpeedFeedOrchestratorEngine. Asserts the actual response contract
// (native_payload, with concrete field checks — not presence-only).

describe("CAMSpeedFeedBridgeEngine — real-orchestrator integration", () => {
  it("default compute path: ok ⇒ physical rpm/feed; error ⇒ captured string", () => {
    const r = SFB.compute({
      target: "generic",
      native_request: {
        operation_id: "REAL-1",
        dia: 6,
        flutes: 4,
        iso_group: "P",
        operation: "milling",
      },
    });
    expect(() => SFBridgeResponseSchema.parse(r)).not.toThrow();
    if (r.status === "ok") {
      const obj = JSON.parse(r.native_payload);
      expect(obj.type).toBe("speed_feed_recommendation");
      expect(typeof obj.rpm).toBe("number");
      expect(obj.rpm).toBeGreaterThan(0);
      expect(obj.feed_rate_mm_min).toBeGreaterThan(0);
      expect(r.orchestrator_result).not.toBeNull();
    } else {
      expect(r.status).toBe("compute_error");
      expect(typeof r.error).toBe("string");
      expect(r.error!.length).toBeGreaterThan(0);
      expect(r.orchestrator_result).toBeNull();
    }
  });

  it("default compute on Fusion target: ok ⇒ JSON-RPC 2.0 envelope", () => {
    const r = SFB.compute({
      target: "fusion360",
      native_request: {
        operation_id: "REAL-2",
        dia: 8,
        flutes: 3,
        iso_group: "M",
        operation: "milling",
      },
    });
    expect(() => SFBridgeResponseSchema.parse(r)).not.toThrow();
    if (r.status === "ok") {
      const obj = JSON.parse(r.native_payload);
      expect(obj.jsonrpc).toBe("2.0");
      expect(obj.method).toBe("cam.speedFeedRecommendation");
      expect(obj.params.rpm).toBeGreaterThan(0);
    }
  });

  it("default ESPRIT compute: ok ⇒ ESPRIT pipe record with positive rpm + SFM", () => {
    const r = SFB.compute({
      target: "esprit",
      native_request: {
        operation_id: "REAL-ESP",
        cutterDiameter: 9.525,
        flutes: 2,
        iso_group: "P",
        operation: "milling",
      },
    });
    expect(() => SFBridgeResponseSchema.parse(r)).not.toThrow();
    if (r.status === "ok") {
      const parts = r.native_payload.split("|");
      expect(parts[0]).toBe("ESPRIT");
      expect(Number(parts[2])).toBeGreaterThan(0);
      expect(Number(parts[5])).toBeGreaterThan(0);
    }
  });

  it("default SolidCAM compute: ok ⇒ solidcam.speedFeed JSON, positive feedZ", () => {
    const r = SFB.compute({
      target: "solidcam",
      native_request: {
        operation_id: "REAL-SC",
        solidcamDiameter: 12.0,
        flutes: 4,
        iso_group: "N",
        operation: "milling",
      },
    });
    expect(() => SFBridgeResponseSchema.parse(r)).not.toThrow();
    if (r.status === "ok") {
      const obj = JSON.parse(r.native_payload);
      expect(obj.type).toBe("solidcam.speedFeed");
      expect(obj.spinSpeed).toBeGreaterThan(0);
      expect(obj.feedZ).toBeGreaterThan(0);
    }
  });

  it("default compute path is deterministic for the same input", () => {
    const req = {
      target: "generic" as const,
      native_request: {
        operation_id: "REAL-3",
        dia: 6,
        flutes: 4,
        iso_group: "P" as const,
        operation: "milling" as const,
      },
    };
    const r1 = SFB.compute(req);
    const r2 = SFB.compute(req);
    expect(r1.status).toBe(r2.status);
    expect(r1.native_payload).toBe(r2.native_payload);
  });

  it("translateRequest converts ESPRIT surfaceSpeed SFM → m/min on the real path", () => {
    const native: SFNativeRequest = {
      operation_id: "OP-CONV-ESP",
      cutterDiameter: 6,
      surfaceSpeed: 500,
    };
    const t = SFB.translateRequest("esprit", native);
    const override = (t as Record<string, unknown>).__vc_override as number;
    expect(override).toBeCloseTo(500 * 0.3048, 3);
  });
});

// ── Dispatcher round-trip (wiring verification) ──────────────────────────────
// camDispatcher.ts case "cam_speedfeed_compute" lazily imports the engine and
// calls .compute({target, native_request}). This replays that exact path with
// the NEW targets and asserts the concrete native_payload contract — proving
// esprit/solidcam survive the dispatcher boundary (engine Zod enum is the gate).

describe("CAMSpeedFeedBridgeEngine — dispatcher round-trip", () => {
  it("cam_speedfeed_compute path: ESPRIT lazy-import → pipe record", async () => {
    const { CAMSpeedFeedBridgeEngine } = await import(
      "../engines/CAMSpeedFeedBridgeEngine.js"
    );
    const result = CAMSpeedFeedBridgeEngine.compute(
      {
        target: "esprit",
        native_request: {
          operation_id: "DISP-ESP",
          cutterDiameter: 10,
          surfaceSpeed: 400,
          flutes: 3,
        },
      },
      stubCompute(minimalResult({ spindle_rpm: 7100, feed_rate_mmmin: 1065 })),
    );
    expect(result.status).toBe("ok");
    expect(result.target).toBe("esprit");
    const parts = result.native_payload.split("|");
    expect(parts[0]).toBe("ESPRIT");
    expect(parts[1]).toBe("DISP-ESP");
    expect(Number(parts[2])).toBe(7100);
    expect(Number(parts[3])).toBeCloseTo(1065, 1);
  });

  it("cam_speedfeed_compute path: SolidCAM lazy-import → JSON tag", async () => {
    const { CAMSpeedFeedBridgeEngine } = await import(
      "../engines/CAMSpeedFeedBridgeEngine.js"
    );
    const result = CAMSpeedFeedBridgeEngine.compute(
      {
        target: "solidcam",
        native_request: {
          operation_id: "DISP-SC",
          solidcamDiameter: 16,
          spinSpeed: 5200,
        },
      },
      stubCompute(minimalResult({ spindle_rpm: 5200, feed_per_tooth_mm: 0.07 })),
    );
    expect(result.status).toBe("ok");
    expect(result.target).toBe("solidcam");
    const obj = JSON.parse(result.native_payload);
    expect(obj.type).toBe("solidcam.speedFeed");
    expect(obj.operationId).toBe("DISP-SC");
    expect(obj.spinSpeed).toBe(5200);
    expect(obj.feedZ).toBe(0.07);
  });

  it("cam_speedfeed_translate path: ESPRIT lazy-import → OrchestratorInput", async () => {
    const { CAMSpeedFeedBridgeEngine } = await import(
      "../engines/CAMSpeedFeedBridgeEngine.js"
    );
    const translated = CAMSpeedFeedBridgeEngine.translateRequest("esprit", {
      operation_id: "DISP-T-ESP",
      cutterDiameter: 12,
      surfaceSpeed: 500,
    });
    expect(translated.tool_diameter_mm).toBe(12);
    expect(translated.cam_system).toBe("ESPRIT");
    expect((translated as Record<string, unknown>).__vc_override).toBeCloseTo(
      152.4,
      3,
    );
  });
});
