// Tests for CAMDriveGateEngine — the validate→actuate safety fuse (slot:kilo).
//
// Two layers:
//  (1) DETERMINISTIC verdict-logic via an injected fake validator — every branch
//      (cleared / missing-required / out-of-range / invalid-enum / unknown-op /
//      unknown-param allow+strict / validator-throws) is asserted with concrete
//      values, independent of catalog contents.
//  (2) GROUNDED integration via the real singleton across Fusion/hyperMILL/
//      Mastercam — proves the wiring to the live catalog (unknown-op blocks,
//      a real out-of-range param blocks, a fully-valid op clears).
//
// Load-bearing invariant: nothing with a hard error (unknown-op / missing-required
// / out-of-range / invalid-enum / non-finite) is ever clearedToActuate.
import { describe, it, expect } from "vitest";
import {
  camDriveGateEngine,
  CAMDriveGateEngine,
  type CatalogValidation,
  type ValidateOperationFn,
} from "../engines/CAMDriveGateEngine.js";
import { camCatalogQueryEngine } from "../engines/CAMCatalogQueryEngine.js";

const CLEAN: CatalogValidation = {
  knownParamCount: 5,
  unknown: [],
  missingRequired: [],
  outOfRange: [],
  invalidEnum: [],
};
/** Build a fake validator returning CLEAN merged with overrides. */
function fake(over: Partial<CatalogValidation>): ValidateOperationFn {
  return () => ({ ...CLEAN, ...over });
}

describe("CAMDriveGateEngine — deterministic verdict logic (injected validator)", () => {
  it("clears when the validator reports a known op with zero violations", () => {
    const g = new CAMDriveGateEngine(fake({}));
    const v = g.gate({ system: "fusion360", operation: "adaptive", params: { stepover: 4 } });
    expect(v.clearedToActuate).toBe(true);
    expect(v.knownParamCount).toBe(5);
    expect(v.reason).toContain("cleared to actuate");
  });

  it("BLOCKS on missing required params", () => {
    const g = new CAMDriveGateEngine(fake({ missingRequired: ["tool_diameter"] }));
    const v = g.gate({ system: "fusion360", operation: "adaptive", params: {} });
    expect(v.clearedToActuate).toBe(false);
    expect(v.violations.missingRequired).toEqual(["tool_diameter"]);
    expect(v.reason).toContain("missing: tool_diameter");
  });

  it("BLOCKS on out-of-range params", () => {
    const g = new CAMDriveGateEngine(fake({ outOfRange: [{ name: "rpm", value: 99999, min: 1, max: 60000 }] }));
    const v = g.gate({ system: "fusion360", operation: "adaptive", params: { rpm: 99999 } });
    expect(v.clearedToActuate).toBe(false);
    expect(v.violations.outOfRange[0].name).toBe("rpm");
    expect(v.reason).toContain("out-of-range: rpm");
  });

  it("BLOCKS on invalid enum values", () => {
    const g = new CAMDriveGateEngine(fake({ invalidEnum: [{ name: "mode", value: "zzz", allowed: ["climb", "conventional"] }] }));
    const v = g.gate({ system: "fusion360", operation: "adaptive", params: { mode: "zzz" } });
    expect(v.clearedToActuate).toBe(false);
    expect(v.violations.invalidEnum[0].name).toBe("mode");
    expect(v.reason).toContain("invalid-enum: mode");
  });

  it("BLOCKS an unknown operation (knownParamCount === 0)", () => {
    const g = new CAMDriveGateEngine(fake({ knownParamCount: 0 }));
    const v = g.gate({ system: "fusion360", operation: "__nope__", params: { x: 1 } });
    expect(v.clearedToActuate).toBe(false);
    expect(v.knownParamCount).toBe(0);
    expect(v.reason).toContain("not found in catalog");
  });

  it("unknown extra param: advisory by default (cleared + flagged), hard-block under strict", () => {
    const g = new CAMDriveGateEngine(fake({ unknown: ["__bogus__"] }));
    const lenient = g.gate({ system: "fusion360", operation: "adaptive", params: { __bogus__: 1 } });
    expect(lenient.clearedToActuate).toBe(true);
    expect(lenient.violations.unknownParams).toEqual(["__bogus__"]);
    expect(lenient.reason).toContain("unrecognized param");

    const strict = g.gate({ system: "fusion360", operation: "adaptive", params: { __bogus__: 1 }, allowUnknownParams: false });
    expect(strict.clearedToActuate).toBe(false);
    expect(strict.reason).toContain("unknown: __bogus__");
  });

  it("BLOCKS a non-finite numeric param even when the validator reports clean (the gate's own guard)", () => {
    const g = new CAMDriveGateEngine(fake({})); // validator says all clean
    const nan = g.gate({ system: "fusion360", operation: "adaptive", params: { feed: NaN } });
    const inf = g.gate({ system: "fusion360", operation: "adaptive", params: { feed: Infinity } });
    const neg = g.gate({ system: "fusion360", operation: "adaptive", params: { feed: -Infinity } });
    expect(nan.clearedToActuate).toBe(false);
    expect(nan.violations.nonFinite).toEqual([{ name: "feed", value: NaN }]);
    expect(inf.clearedToActuate).toBe(false);
    expect(neg.clearedToActuate).toBe(false);
    expect(nan.reason).toContain("non-finite: feed");
  });

  it("BLOCKS a numeric-string that coerces to non-finite, but NOT a legit string enum", () => {
    const g = new CAMDriveGateEngine(fake({})); // validator clean
    for (const bad of ["Infinity", "-Infinity", "1e999"]) {
      const v = g.gate({ system: "fusion360", operation: "adaptive", params: { feed: bad } });
      expect(v.clearedToActuate).toBe(false);
      expect(v.violations.nonFinite.map((n) => n.name)).toContain("feed");
    }
    // legit string enum + a finite numeric string must NOT be flagged
    const ok = g.gate({ system: "fusion360", operation: "adaptive", params: { mode: "climb", feed: "5000" } });
    expect(ok.violations.nonFinite.length).toBe(0);
    expect(ok.clearedToActuate).toBe(true);
  });

  it("is FAIL-SAFE: a throwing validator yields a BLOCKED verdict, not an exception", () => {
    const g = new CAMDriveGateEngine(() => {
      throw new Error("catalog fs exploded");
    });
    let v: ReturnType<typeof g.gate> | undefined;
    expect(() => {
      v = g.gate({ system: "fusion360", operation: "adaptive", params: { x: 1 } });
    }).not.toThrow();
    expect(v!.clearedToActuate).toBe(false);
    expect(v!.reason).toContain("threw");
  });

  it("BLOCKS missing system/operation without invoking the validator at all", () => {
    let called = 0;
    const g = new CAMDriveGateEngine(() => {
      called++;
      return CLEAN;
    });
    const v1 = g.gate({ system: "", operation: "adaptive" });
    const v2 = g.gate({ system: "fusion360", operation: "" });
    expect(v1.clearedToActuate).toBe(false);
    expect(v2.clearedToActuate).toBe(false);
    expect(called).toBe(0); // never reaches the catalog when system/op is empty
  });

  it("never throws on garbage params (array / null) — resolves to a verdict", () => {
    const g = new CAMDriveGateEngine(fake({}));
    expect(() => g.gate({ system: "fusion360", operation: "adaptive", params: [] as unknown as Record<string, unknown> })).not.toThrow();
    expect(() => g.gate({ system: "fusion360", operation: "adaptive", params: null as unknown as Record<string, unknown> })).not.toThrow();
  });
});

describe("CAMDriveGateEngine — grounded integration (real catalog, default singleton)", () => {
  const SYSTEMS = ["fusion360", "hypermill", "mastercam"] as const;

  interface CatParam {
    name: string;
    required: boolean;
    min: number | null;
    max: number | null;
    enumValues: readonly unknown[] | null;
    default: unknown;
    type: string | null;
  }
  function richestOp(system: string): { op: string; params: CatParam[] } | null {
    const ops = camCatalogQueryEngine.listOperations(system);
    if (!ops.length) return null;
    const top = ops.slice().sort((a, b) => b.paramCount - a.paramCount)[0];
    return { op: top.id, params: camCatalogQueryEngine.getOperationParams(system, top.id) as unknown as CatParam[] };
  }
  function pickValid(p: CatParam): unknown {
    if (Array.isArray(p.enumValues) && p.enumValues.length) return p.enumValues[0];
    if (typeof p.min === "number" && typeof p.max === "number") return (p.min + p.max) / 2;
    if (typeof p.min === "number") return p.min;
    if (typeof p.max === "number") return p.max;
    if (typeof p.default === "number") return p.default;
    return p.type === "float" || p.type === "integer" ? 1 : (p.default ?? "x");
  }

  it("blocks an unknown op against the real catalog in all 3 systems", () => {
    for (const system of SYSTEMS) {
      const v = camDriveGateEngine.gate({ system, operation: "__definitely_not_real__", params: {} });
      expect(v.clearedToActuate).toBe(false);
      expect(v.knownParamCount).toBe(0);
    }
  });

  it("blocks a real out-of-range param (≥1 system has a ranged param)", () => {
    let exercised = 0;
    for (const system of SYSTEMS) {
      const r = richestOp(system);
      if (!r) continue;
      const ranged = r.params.find((p) => typeof p.max === "number" && Number.isFinite(p.max as number));
      if (!ranged) continue;
      exercised++;
      const over = (ranged.max as number) + Math.abs(ranged.max as number) + 1000;
      const v = camDriveGateEngine.gate({ system, operation: r.op, params: { [ranged.name]: over } });
      expect(v.clearedToActuate).toBe(false);
      expect(v.violations.outOfRange.map((o) => o.name)).toContain(ranged.name);
    }
    expect(exercised).toBeGreaterThan(0);
  });

  it("blocks NaN against a real op", () => {
    const r = richestOp("fusion360") ?? richestOp("mastercam") ?? richestOp("hypermill");
    expect(r).not.toBeNull();
    const param = r!.params[0]?.name ?? "tolerance";
    const v = camDriveGateEngine.gate({ system: "fusion360", operation: r!.op, params: { [param]: NaN } });
    expect(v.clearedToActuate).toBe(false);
    expect(v.violations.nonFinite.length).toBeGreaterThan(0);
  });

  it("clears a real op with a fully-valid required-param set (≥1 system)", () => {
    let cleared = 0;
    for (const system of SYSTEMS) {
      const r = richestOp(system);
      if (!r) continue;
      const params: Record<string, unknown> = {};
      for (const p of r.params) if (p.required) params[p.name] = pickValid(p);
      const v = camDriveGateEngine.gate({ system, operation: r.op, params });
      expect(v.knownParamCount).toBeGreaterThan(0);
      expect(v.violations.nonFinite.length).toBe(0);
      if (v.clearedToActuate) cleared++;
    }
    expect(cleared).toBeGreaterThan(0);
  });

  it("default singleton and class export are both invokable", () => {
    expect(typeof camDriveGateEngine.gate).toBe("function");
    expect(new CAMDriveGateEngine().gate({ system: "", operation: "" }).clearedToActuate).toBe(false);
  });
});
