/**
 * SfcEspritApplyEngine tests — composition correctness, DI seam, edge cases.
 *
 * Verifies the SFC → CAM bridge → Esprit push pipeline assembled by the engine.
 * The Esprit HTTP layer is stubbed via the factory DI seam — no live network.
 *
 * @milestone BRIDGE-DEEP/U-BRIDGE-SFC-ESPRIT
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SfcEspritApplyEngine, type EspritBridgeFactory } from "../engines/SfcEspritApplyEngine.js";
import type { OrchestratorInput, OrchestratorResult, AtomicValue } from "../engines/SpeedFeedOrchestratorEngine.js";

/** Stub orchestrator that returns a deterministic OrchestratorResult without running physics. */
const STUB_COMPUTE = (_i: OrchestratorInput): AtomicValue<OrchestratorResult> => ({
  value: {
    operation_id: "OP-100",
    cutting_speed_mpm: 180,
    spindle_rpm: 4500,
    feed_per_tooth_mm: 0.075,
    feed_rate_mmmin: 1350,
    chip_load_mm: 0.075,
    tangential_force_N: 320,
    cutting_power_kW: 0.8,
    spindle_torque_Nm: 1.7,
    cutting_temperature_C: 240,
    tool_life_min: 45,
    deflection_um: 12,
    surface_finish_Ra_um: 1.6,
    chatter_rpm_min: 2000,
    chatter_rpm_max: 12000,
    is_stable: true,
    safety_margin_chatter: 1.4,
    safety_margin_power: 2.0,
    safety_margin_force: 1.8,
    safety_margin_thermal: 1.6,
    safety_margin_deflection: 2.2,
    limiting_factors: [],
    overall_confidence: 0.9,
    confidence_breakdown: {} as any,
    warnings: [],
    iterations_to_converge: 1,
    convergence_status: "converged" as any,
    method: "stub" as any,
    timestamp_iso: "2026-05-23T00:00:00Z",
  } as unknown as OrchestratorResult,
  unit: "mixed",
  uncertainty: 0,
  confidence: 0.9,
  source: "stub-orchestrator",
});

// ── Test fixtures ───────────────────────────────────────────────────────────

/** Minimal valid SFNativeRequest with the Esprit shape (cutterDiameter, surfaceSpeed, feedPerToothEsp). */
function nativeEsprit(operation_id = "OP-100") {
  return {
    operation_id,
    material: "1045 steel",
    iso_group: "P" as const,
    cutterDiameter: 12.7,
    flutes: 4,
    surfaceSpeed: 600, // SFM
    feedPerToothEsp: 0.075,
  };
}

/** Stub bridge factory that records calls + returns programmed responses. */
function stubFactory(opts: {
  connectResult?: { connected: boolean; message: string };
  pushResult?: {
    success: boolean;
    operation_id: string;
    parameters_updated: number;
    parameters_failed: string[];
    message: string;
    requires_regeneration: boolean;
  };
}): { factory: EspritBridgeFactory; calls: { connect: number; push: Array<{ id: string; params: any }> } } {
  const calls = { connect: 0, push: [] as Array<{ id: string; params: any }> };
  const factory: EspritBridgeFactory = () => ({
    connect: vi.fn(async () => {
      calls.connect++;
      return {
        connected: opts.connectResult?.connected ?? true,
        host: "localhost",
        port: 18366,
        esprit_version: "2024.1",
        latency_ms: 5,
        message: opts.connectResult?.message ?? "Connected",
      };
    }) as any,
    pushParameters: vi.fn(async (id: string, params: any) => {
      calls.push.push({ id, params });
      return (
        opts.pushResult ?? {
          success: true,
          operation_id: id,
          parameters_updated: Object.keys(params).length,
          parameters_failed: [],
          message: `Updated ${Object.keys(params).length} parameters`,
          requires_regeneration: true,
        }
      );
    }) as any,
  });
  return { factory, calls };
}

// ── mapSfcResultToEspritParams ──────────────────────────────────────────────

describe("SfcEspritApplyEngine.mapSfcResultToEspritParams", () => {
  it("maps spindle_rpm and feed_rate_mmmin", () => {
    const out = SfcEspritApplyEngine.mapSfcResultToEspritParams({
      spindle_rpm: 15000,
      feed_rate_mmmin: 4500,
      cutting_speed_mpm: 600,
      feed_per_tooth_mm: 0.075,
    });
    expect(out).toEqual({ rpm: 15000, feed_mmpm: 4500 });
  });

  it("returns empty object on null result", () => {
    expect(SfcEspritApplyEngine.mapSfcResultToEspritParams(null)).toEqual({});
  });

  it("drops non-finite / non-positive numerics (NaN / Infinity / 0 / negative)", () => {
    const out = SfcEspritApplyEngine.mapSfcResultToEspritParams({
      spindle_rpm: Number.NaN,
      feed_rate_mmmin: 0,
    });
    expect(out).toEqual({});
    const out2 = SfcEspritApplyEngine.mapSfcResultToEspritParams({
      spindle_rpm: -100,
      feed_rate_mmmin: Number.POSITIVE_INFINITY,
    });
    expect(out2).toEqual({});
  });

  it("ignores non-numeric fields", () => {
    expect(
      SfcEspritApplyEngine.mapSfcResultToEspritParams({
        spindle_rpm: "fast" as any,
        feed_rate_mmmin: { value: 1000 } as any,
      }),
    ).toEqual({});
  });
});

// ── applyToEsprit happy path ────────────────────────────────────────────────

describe("SfcEspritApplyEngine.applyToEsprit — happy path", () => {
  let factoryStub: ReturnType<typeof stubFactory>;
  beforeEach(() => {
    factoryStub = stubFactory({});
  });

  it("runs full chain: bridge → connect → push, status=ok", async () => {
    const r = await SfcEspritApplyEngine.applyToEsprit(
      { native_request: nativeEsprit("OP-A"), dry_run: false },
      factoryStub.factory,
      STUB_COMPUTE,
    );
    expect(r.status).toBe("ok");
    expect(r.operation_id).toBe("OP-A");
    expect(r.bridge.status).toBe("ok");
    expect(r.push).not.toBeNull();
    expect(r.push?.success).toBe(true);
    expect(factoryStub.calls.connect).toBe(1);
    expect(factoryStub.calls.push.length).toBe(1);
    expect(factoryStub.calls.push[0]!.id).toBe("OP-A");
    // SFC-derived params (rpm + feed_mmpm) must be present
    expect(typeof factoryStub.calls.push[0]!.params.rpm).toBe("number");
    expect(typeof factoryStub.calls.push[0]!.params.feed_mmpm).toBe("number");
  });

  it("merges extra_machining_params on top of SFC-derived params", async () => {
    await SfcEspritApplyEngine.applyToEsprit(
      {
        native_request: nativeEsprit("OP-B"),
        dry_run: false,
        extra_machining_params: { stepover_mm: 0.5, stepdown_mm: 1.2, approach_type: "lead_in" },
      },
      factoryStub.factory,
      STUB_COMPUTE,
    );
    const pushed = factoryStub.calls.push[0]!.params;
    expect(pushed.stepover_mm).toBe(0.5);
    expect(pushed.stepdown_mm).toBe(1.2);
    expect(pushed.approach_type).toBe("lead_in");
    // SFC fields still populated alongside
    expect(typeof pushed.rpm).toBe("number");
  });

  it("forwards host + port to bridge.connect()", async () => {
    let captured: { host: string | undefined; port: number | undefined } = { host: undefined, port: undefined };
    const f: EspritBridgeFactory = () => ({
      connect: vi.fn(async (h?: string, p?: number) => {
        captured = { host: h, port: p };
        return { connected: true, host: h ?? "x", port: p ?? 0, latency_ms: 0, message: "ok" };
      }) as any,
      pushParameters: vi.fn(async (id: string, params: any) => ({
        success: true,
        operation_id: id,
        parameters_updated: Object.keys(params).length,
        parameters_failed: [],
        message: "ok",
        requires_regeneration: false,
      })) as any,
    });
    await SfcEspritApplyEngine.applyToEsprit(
      { native_request: nativeEsprit("OP-C"), dry_run: false, host: "192.168.1.5", port: 19000 },
      f,
      STUB_COMPUTE,
    );
    expect(captured.host).toBe("192.168.1.5");
    expect(captured.port).toBe(19000);
  });
});

// ── applyToEsprit dry-run + error paths ─────────────────────────────────────

describe("SfcEspritApplyEngine.applyToEsprit — dry run + error cascade", () => {
  it("dry_run=true short-circuits: no connect, no push, status=dry_run", async () => {
    const s = stubFactory({});
    const r = await SfcEspritApplyEngine.applyToEsprit(
      { native_request: nativeEsprit("OP-D"), dry_run: true },
      s.factory,
      STUB_COMPUTE,
    );
    expect(r.status).toBe("dry_run");
    expect(r.push).toBeNull();
    expect(s.calls.connect).toBe(0);
    expect(s.calls.push.length).toBe(0);
    // Bridge result still populated for the caller
    expect(r.bridge.status).toBe("ok");
  });

  it("connect failure cascades to status=connect_error, no push attempt", async () => {
    const s = stubFactory({ connectResult: { connected: false, message: "ECONNREFUSED" } });
    const r = await SfcEspritApplyEngine.applyToEsprit(
      { native_request: nativeEsprit("OP-E"), dry_run: false },
      s.factory,
      STUB_COMPUTE,
    );
    expect(r.status).toBe("connect_error");
    expect(r.push).toBeNull();
    expect(s.calls.connect).toBe(1);
    expect(s.calls.push.length).toBe(0);
    expect(r.message).toContain("ECONNREFUSED");
  });

  it("push failure surfaces status=push_error with the push payload", async () => {
    const s = stubFactory({
      pushResult: {
        success: false,
        operation_id: "OP-F",
        parameters_updated: 0,
        parameters_failed: ["rpm"],
        message: "Operation locked by user",
        requires_regeneration: false,
      },
    });
    const r = await SfcEspritApplyEngine.applyToEsprit(
      { native_request: nativeEsprit("OP-F"), dry_run: false },
      s.factory,
      STUB_COMPUTE,
    );
    expect(r.status).toBe("push_error");
    expect(r.push).not.toBeNull();
    expect(r.push?.success).toBe(false);
    expect(r.message).toContain("Operation locked");
  });
});

// ── applyToEsprit input validation ──────────────────────────────────────────

describe("SfcEspritApplyEngine.applyToEsprit — input validation", () => {
  it("throws on invalid native_request (missing operation_id)", async () => {
    await expect(
      SfcEspritApplyEngine.applyToEsprit(
        { native_request: { material: "1045", cutterDiameter: 12 } as any, dry_run: true },
        stubFactory({}).factory,
        STUB_COMPUTE,
      ),
    ).rejects.toThrow();
  });

  it("rejects unknown top-level keys (strict schema)", async () => {
    await expect(
      SfcEspritApplyEngine.applyToEsprit(
        // @ts-expect-error — intentionally invalid for strict-mode rejection test
        { native_request: nativeEsprit("OP-G"), dry_run: false, bogus: true },
        stubFactory({}).factory,
        STUB_COMPUTE,
      ),
    ).rejects.toThrow();
  });

  it("rejects negative port", async () => {
    await expect(
      SfcEspritApplyEngine.applyToEsprit(
        { native_request: nativeEsprit("OP-H"), dry_run: false, port: -1 } as any,
        stubFactory({}).factory,
        STUB_COMPUTE,
      ),
    ).rejects.toThrow();
  });
});
