/**
 * CATIACAAV5BridgeEngine.test.ts — U-CAD-APP-04 (PHASE-48)
 *
 * ≥10 vitest cases covering the CATIA CAA V5 + EKL bridge, including unit
 * conversion, PLM transitions, EKL rule/check execution, and telemetry.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CATIACAAV5BridgeEngine,
  type CatiaTransport,
  type CatiaClock,
} from "../engines/CATIACAAV5BridgeEngine.js";
import type {
  CatiaModel,
  CatiaCommand,
  CatiaResponse,
} from "../schemas/cadCatiaCaaV5Schema.js";

function makeClock(): CatiaClock & { tickMs(ms: number): void } {
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

function makeModel(overrides: Partial<CatiaModel> = {}): CatiaModel {
  return {
    modelName: "BRACKET.CATPart",
    kind: "CATPart",
    units: "mmks",
    parameters: [
      {
        name: "PartBody\\Pad.1\\Length",
        type: "Length",
        value: 50,
        unit: "mm",
        isPublished: true,
      },
      {
        name: "PartBody\\Pad.1\\Width",
        type: "Length",
        value: 25,
        unit: "mm",
        isPublished: false,
      },
      {
        name: "Released",
        type: "Boolean",
        value: false,
        unit: "none",
        isPublished: false,
      },
    ],
    features: [
      { featureId: 1, name: "Sketch.1", kind: "Sketch", status: "active", sequence: 0, paramNames: [] },
      { featureId: 2, name: "Pad.1", kind: "Pad", status: "active", sequence: 1, paramNames: ["PartBody\\Pad.1\\Length"] },
      { featureId: 3, name: "EdgeFillet.1", kind: "Fillet", status: "active", sequence: 2, paramNames: [] },
    ],
    relations: [
      {
        name: "CheckMinLength",
        kind: "check",
        script: "PartBody\\Pad.1\\Length > 10mm",
        isActive: true,
        lastVerdict: null,
      },
      {
        name: "LengthDrivenByWidth",
        kind: "rule",
        script: "PartBody\\Pad.1\\Length = 2 * PartBody\\Pad.1\\Width",
        isActive: true,
        lastVerdict: null,
      },
    ],
    updateCount: 4,
    plmState: "in_work",
    revision: "A",
    lastModified: "2026-04-20T00:00:00Z",
    ...overrides,
  };
}

function makeStubTransport(
  model: CatiaModel,
  clock: ReturnType<typeof makeClock>,
): CatiaTransport & {
  calls: Array<{ cmd: CatiaCommand; args: Record<string, unknown> }>;
  failNext: boolean;
  latencyMs: number;
} {
  const calls: Array<{ cmd: CatiaCommand; args: Record<string, unknown> }> = [];
  let current = structuredClone(model);
  const state: {
    calls: typeof calls;
    failNext: boolean;
    latencyMs: number;
    send: CatiaTransport["send"];
  } = {
    calls,
    failNext: false,
    latencyMs: 7,
    send(cmd, args): CatiaResponse {
      calls.push({ cmd, args });
      clock.tickMs(state.latencyMs);
      if (state.failNext) {
        state.failNext = false;
        return { ok: false, error: "CAA daemon lost connection" };
      }
      switch (cmd) {
        case "list_models":
          return { ok: true, result: [current.modelName, "LINKAGE.CATProduct"] };
        case "read_model":
          return { ok: true, result: current };
        case "set_parameter": {
          const { parameter } = args as {
            parameter: CatiaModel["parameters"][number];
          };
          current = {
            ...current,
            parameters: [
              ...current.parameters.filter((p) => p.name !== parameter.name),
              parameter,
            ],
          };
          return { ok: true, result: current };
        }
        case "update_model":
          current = { ...current, updateCount: current.updateCount + 1 };
          return { ok: true, result: current };
        case "deactivate_feature": {
          const { featureName } = args as { featureName: string };
          current = {
            ...current,
            features: current.features.map((f) =>
              f.name === featureName ? { ...f, status: "deactivated" as const } : f,
            ),
          };
          return { ok: true, result: current };
        }
        case "activate_feature": {
          const { featureName } = args as { featureName: string };
          current = {
            ...current,
            features: current.features.map((f) =>
              f.name === featureName ? { ...f, status: "active" as const } : f,
            ),
          };
          return { ok: true, result: current };
        }
        case "run_ekl_relation": {
          const { relationName } = args as { relationName: string };
          const rel = current.relations.find((r) => r.name === relationName);
          if (!rel) return { ok: false, error: "relation not found" };
          // Evaluate check verdicts deterministically on the stub.
          let updated = { ...rel };
          if (rel.kind === "check") {
            const lengthParam = current.parameters.find(
              (p) => p.name === "PartBody\\Pad.1\\Length",
            );
            const len = typeof lengthParam?.value === "number" ? lengthParam.value : 0;
            updated = {
              ...rel,
              lastVerdict: len > 10,
              lastMessage: len > 10 ? "ok" : `length ${len}mm too small`,
            };
          } else {
            updated = { ...rel, lastVerdict: null, lastMessage: "rule fired" };
          }
          current = {
            ...current,
            relations: current.relations.map((r) =>
              r.name === relationName ? updated : r,
            ),
          };
          return { ok: true, result: updated };
        }
        case "set_plm_state": {
          const { targetState } = args as { targetState: CatiaModel["plmState"] };
          current = { ...current, plmState: targetState };
          return { ok: true, result: current };
        }
        case "save":
          return { ok: true };
        default:
          return { ok: false, error: "unknown" };
      }
    },
  };
  return state as CatiaTransport & {
    calls: typeof calls;
    failNext: boolean;
    latencyMs: number;
  };
}

describe("CATIACAAV5BridgeEngine (U-CAD-APP-04)", () => {
  let eng: CATIACAAV5BridgeEngine;
  let transport: ReturnType<typeof makeStubTransport>;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
    transport = makeStubTransport(makeModel(), clock);
    eng = new CATIACAAV5BridgeEngine({ transport, clock });
  });

  describe("read path", () => {
    it("readModel returns parsed CatiaModel", () => {
      const m = eng.readModel("BRACKET.CATPart");
      expect(m.modelName).toBe("BRACKET.CATPart");
      expect(m.kind).toBe("CATPart");
      expect(m.parameters).toHaveLength(3);
      expect(transport.calls[0].cmd).toBe("read_model");
    });

    it("listModels returns string array of CATPart + CATProduct", () => {
      expect(eng.listModels()).toEqual(["BRACKET.CATPart", "LINKAGE.CATProduct"]);
    });

    it("specTree is sorted by sequence (Sketch → Pad → Fillet)", () => {
      const tree = eng.specTree("BRACKET.CATPart");
      expect(tree.map((f) => f.name)).toEqual([
        "Sketch.1",
        "Pad.1",
        "EdgeFillet.1",
      ]);
    });
  });

  describe("setParameter", () => {
    it("applies new numeric value in same units", () => {
      const m = eng.setParameter("BRACKET.CATPart", "PartBody\\Pad.1\\Length", 75, {
        unit: "mm",
      });
      expect(
        m.parameters.find((p) => p.name === "PartBody\\Pad.1\\Length")?.value,
      ).toBe(75);
    });

    it("converts inches → mm when unit differs", () => {
      const m = eng.setParameter("BRACKET.CATPart", "PartBody\\Pad.1\\Length", 2, {
        unit: "in",
      });
      const p = m.parameters.find((p) => p.name === "PartBody\\Pad.1\\Length");
      expect(p?.unit).toBe("mm");
      expect(typeof p?.value === "number" ? p!.value : NaN).toBeCloseTo(50.8, 2);
    });

    it("converts ft → mm for large scalars", () => {
      const m = eng.setParameter("BRACKET.CATPart", "PartBody\\Pad.1\\Width", 1, {
        unit: "ft",
      });
      const p = m.parameters.find((p) => p.name === "PartBody\\Pad.1\\Width");
      expect(typeof p?.value === "number" ? p!.value : NaN).toBeCloseTo(304.8, 2);
    });

    it("boolean parameter flips without unit", () => {
      const m = eng.setParameter("BRACKET.CATPart", "Released", true);
      expect(m.parameters.find((p) => p.name === "Released")?.value).toBe(true);
    });

    it("rejects invalid parameter name (starts with digit)", () => {
      expect(() =>
        eng.setParameter("BRACKET.CATPart", "1BadName", 50),
      ).toThrow();
    });
  });

  describe("feature + update cycle", () => {
    it("deactivateFeature flips status", () => {
      const m = eng.deactivateFeature("BRACKET.CATPart", "EdgeFillet.1");
      expect(
        m.features.find((f) => f.name === "EdgeFillet.1")?.status,
      ).toBe("deactivated");
    });

    it("activateFeature restores status", () => {
      eng.deactivateFeature("BRACKET.CATPart", "EdgeFillet.1");
      const m = eng.activateFeature("BRACKET.CATPart", "EdgeFillet.1");
      expect(
        m.features.find((f) => f.name === "EdgeFillet.1")?.status,
      ).toBe("active");
    });

    it("updateModel increments updateCount", () => {
      const before = eng.readModel("BRACKET.CATPart").updateCount;
      const m = eng.updateModel("BRACKET.CATPart");
      expect(m.updateCount).toBe(before + 1);
    });
  });

  describe("EKL relations", () => {
    it("runEklRelation on a check returns verdict=true when ok", () => {
      const rel = eng.runEklRelation("BRACKET.CATPart", "CheckMinLength");
      expect(rel.kind).toBe("check");
      expect(rel.lastVerdict).toBe(true);
    });

    it("runEklRelation on a check returns verdict=false when violated", () => {
      eng.setParameter("BRACKET.CATPart", "PartBody\\Pad.1\\Length", 5, {
        unit: "mm",
      });
      const rel = eng.runEklRelation("BRACKET.CATPart", "CheckMinLength");
      expect(rel.lastVerdict).toBe(false);
      expect(rel.lastMessage).toMatch(/too small/);
    });

    it("runEklRelation on a rule leaves verdict null", () => {
      const rel = eng.runEklRelation("BRACKET.CATPart", "LengthDrivenByWidth");
      expect(rel.kind).toBe("rule");
      expect(rel.lastVerdict).toBeNull();
    });

    it("failingChecks reports only false-verdict checks", () => {
      eng.setParameter("BRACKET.CATPart", "PartBody\\Pad.1\\Length", 3, {
        unit: "mm",
      });
      eng.runEklRelation("BRACKET.CATPart", "CheckMinLength");
      const failing = eng.failingChecks("BRACKET.CATPart");
      expect(failing.map((r) => r.name)).toEqual(["CheckMinLength"]);
    });
  });

  describe("PLM state machine", () => {
    it("allows legal forward transition in_work → frozen", () => {
      const m = eng.setPlmState("BRACKET.CATPart", "frozen");
      expect(m.plmState).toBe("frozen");
    });

    it("rejects backward transition released → in_work", () => {
      eng.setPlmState("BRACKET.CATPart", "frozen");
      eng.setPlmState("BRACKET.CATPart", "released");
      expect(() => eng.setPlmState("BRACKET.CATPart", "in_work")).toThrow(
        /Illegal PLM transition/,
      );
    });
  });

  describe("save + telemetry", () => {
    it("save issues save command", () => {
      eng.save("BRACKET.CATPart");
      expect(transport.calls.some((c) => c.cmd === "save")).toBe(true);
    });

    it("callLog records per-call latency", () => {
      eng.readModel("BRACKET.CATPart");
      const log = eng.callLog();
      expect(log[0].durationMs).toBe(7);
      expect(log[0].ok).toBe(true);
    });

    it("p95Latency is null with <3 calls, finite afterwards", () => {
      eng.readModel("BRACKET.CATPart");
      expect(eng.p95Latency()).toBeNull();
      transport.latencyMs = 25;
      eng.readModel("BRACKET.CATPart");
      eng.readModel("BRACKET.CATPart");
      eng.readModel("BRACKET.CATPart");
      const p = eng.p95Latency();
      expect(p).not.toBeNull();
      expect(p!).toBeGreaterThanOrEqual(7);
    });

    it("failed transport surfaces as thrown Error", () => {
      transport.failNext = true;
      expect(() => eng.readModel("BRACKET.CATPart")).toThrow(
        /CATIA CAA V5 transport error/,
      );
      const log = eng.callLog();
      expect(log[0].ok).toBe(false);
    });

    it("clearCallLog empties the log", () => {
      eng.readModel("BRACKET.CATPart");
      eng.clearCallLog();
      expect(eng.callLog().length).toBe(0);
    });
  });
});
