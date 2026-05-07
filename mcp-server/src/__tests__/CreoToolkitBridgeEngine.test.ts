/**
 * CreoToolkitBridgeEngine.test.ts — U-CAD-APP-01 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CreoToolkitBridgeEngine,
  type CreoTransport,
  type CreoClock,
} from "../engines/CreoToolkitBridgeEngine.js";
import type { CreoModel } from "../schemas/cadCreoToolkitSchema.js";

function makeClock(): CreoClock & { tickMs(ms: number): void } {
  let mono = 1_000_000;
  let iso = new Date("2026-04-20T00:00:00Z").getTime();
  return {
    now: () => new Date(iso).toISOString(),
    monotonicMs: () => mono,
    tickMs: (ms) => {
      mono += ms;
      iso += ms;
    },
  };
}

function makeModel(overrides: Partial<CreoModel> = {}): CreoModel {
  return {
    modelName: "BRACKET.PRT",
    kind: "part",
    units: "mmns",
    parameters: [
      { name: "LENGTH", type: "real", value: 50, unit: "mm" },
      { name: "WIDTH", type: "real", value: 25, unit: "mm" },
      { name: "RELEASED", type: "boolean", value: false, unit: "none" },
    ],
    features: [
      { featureId: 1, name: "SKETCH_1", kind: "sketch", status: "active", sequence: 0, paramNames: [] },
      { featureId: 2, name: "EXTRUDE_1", kind: "extrude", status: "active", sequence: 1, paramNames: ["LENGTH"] },
      { featureId: 3, name: "ROUND_1", kind: "round", status: "active", sequence: 2, paramNames: [] },
    ],
    regenCount: 3,
    lastModified: "2026-04-20T00:00:00Z",
    ...overrides,
  };
}

function makeStubTransport(model: CreoModel, clock: ReturnType<typeof makeClock>): CreoTransport & {
  calls: Array<{ cmd: string; args: Record<string, unknown> }>;
  failNext: boolean;
  latencyMs: number;
} {
  const calls: Array<{ cmd: string; args: Record<string, unknown> }> = [];
  let current = structuredClone(model);
  const state = {
    calls,
    failNext: false,
    latencyMs: 5,
    send(cmd: string, args: Record<string, unknown>) {
      calls.push({ cmd, args });
      clock.tickMs(state.latencyMs);
      if (state.failNext) {
        state.failNext = false;
        return { ok: false as const, error: "daemon not responding" };
      }
      switch (cmd) {
        case "list_models":
          return { ok: true as const, result: [current.modelName, "OTHER.PRT"] };
        case "read_model":
          return { ok: true as const, result: current };
        case "set_parameter": {
          const { parameter } = args as { parameter: CreoModel["parameters"][number] };
          current.parameters = [
            ...current.parameters.filter((p) => p.name !== parameter.name),
            parameter,
          ];
          return { ok: true as const, result: current };
        }
        case "regenerate":
          current = { ...current, regenCount: current.regenCount + 1 };
          return { ok: true as const, result: current };
        case "suppress_feature": {
          const { featureName } = args as { featureName: string };
          current.features = current.features.map((f) =>
            f.name === featureName ? { ...f, status: "suppressed" as const } : f,
          );
          return { ok: true as const, result: current };
        }
        case "resume_feature": {
          const { featureName } = args as { featureName: string };
          current.features = current.features.map((f) =>
            f.name === featureName ? { ...f, status: "active" as const } : f,
          );
          return { ok: true as const, result: current };
        }
        case "save":
          return { ok: true as const };
        default:
          return { ok: false as const, error: "unknown" };
      }
    },
  };
  return state as any;
}

describe("CreoToolkitBridgeEngine (U-CAD-APP-01)", () => {
  let eng: CreoToolkitBridgeEngine;
  let transport: ReturnType<typeof makeStubTransport>;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
    transport = makeStubTransport(makeModel(), clock);
    eng = new CreoToolkitBridgeEngine({ transport, clock });
  });

  describe("read path", () => {
    it("readModel returns parsed CreoModel", () => {
      const m = eng.readModel("BRACKET.PRT");
      expect(m.modelName).toBe("BRACKET.PRT");
      expect(m.parameters.length).toBe(3);
      expect(transport.calls[0].cmd).toBe("read_model");
    });

    it("listModels returns string array", () => {
      expect(eng.listModels()).toEqual(["BRACKET.PRT", "OTHER.PRT"]);
    });

    it("featureTree sorts by sequence", () => {
      const tree = eng.featureTree("BRACKET.PRT");
      expect(tree.map((f) => f.name)).toEqual(["SKETCH_1", "EXTRUDE_1", "ROUND_1"]);
    });
  });

  describe("set parameter", () => {
    it("applies new numeric value in same units", () => {
      const m = eng.setParameter("BRACKET.PRT", "LENGTH", 75, { unit: "mm" });
      expect(m.parameters.find((p) => p.name === "LENGTH")?.value).toBe(75);
    });

    it("converts in → mm when unit differs", () => {
      const m = eng.setParameter("BRACKET.PRT", "LENGTH", 2, { unit: "in" });
      expect(m.parameters.find((p) => p.name === "LENGTH")?.value).toBeCloseTo(50.8, 2);
    });

    it("boolean parameter flips", () => {
      const m = eng.setParameter("BRACKET.PRT", "RELEASED", true);
      expect(m.parameters.find((p) => p.name === "RELEASED")?.value).toBe(true);
    });

    it("rejects invalid parameter name (not UPPER_SNAKE)", () => {
      expect(() => eng.setParameter("BRACKET.PRT", "length", 50)).toThrow();
    });
  });

  describe("feature manipulation", () => {
    it("suppressFeature flips status", () => {
      const m = eng.suppressFeature("BRACKET.PRT", "ROUND_1");
      expect(m.features.find((f) => f.name === "ROUND_1")?.status).toBe("suppressed");
    });

    it("resumeFeature restores status", () => {
      eng.suppressFeature("BRACKET.PRT", "ROUND_1");
      const m = eng.resumeFeature("BRACKET.PRT", "ROUND_1");
      expect(m.features.find((f) => f.name === "ROUND_1")?.status).toBe("active");
    });

    it("regenerate increments regenCount", () => {
      const before = eng.readModel("BRACKET.PRT").regenCount;
      const m = eng.regenerate("BRACKET.PRT");
      expect(m.regenCount).toBe(before + 1);
    });
  });

  describe("save + telemetry", () => {
    it("save issues save command", () => {
      eng.save("BRACKET.PRT");
      expect(transport.calls.some((c) => c.cmd === "save")).toBe(true);
    });

    it("call log records latency", () => {
      eng.readModel("BRACKET.PRT");
      const log = eng.callLog();
      expect(log[0].durationMs).toBe(5);
      expect(log[0].ok).toBe(true);
    });

    it("p95Latency is null with <3 calls, finite afterwards", () => {
      eng.readModel("BRACKET.PRT");
      expect(eng.p95Latency()).toBeNull();
      transport.latencyMs = 20;
      eng.readModel("BRACKET.PRT");
      eng.readModel("BRACKET.PRT");
      eng.readModel("BRACKET.PRT");
      const p = eng.p95Latency();
      expect(p).not.toBeNull();
      expect(p!).toBeGreaterThanOrEqual(5);
    });

    it("failed transport surfaces as thrown Error", () => {
      transport.failNext = true;
      expect(() => eng.readModel("BRACKET.PRT")).toThrow(/Creo transport error/);
      const log = eng.callLog();
      expect(log[0].ok).toBe(false);
    });

    it("clearCallLog empties the log", () => {
      eng.readModel("BRACKET.PRT");
      eng.clearCallLog();
      expect(eng.callLog().length).toBe(0);
    });
  });
});
