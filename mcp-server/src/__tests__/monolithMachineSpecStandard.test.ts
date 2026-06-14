/**
 * MonolithMachineSpecStandardEngine tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MACHINE-SPEC-LOADER.
 *
 * Verifies the TS-typed port of PRISM_MACHINE_SPEC_STANDARD.js exports the
 * canonical 8-section machine-spec schema + standardize() + validateSpec()
 * with monolith-faithful semantics + fail-soft adversarial inputs.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithMachineSpecStandardEngine,
  monolithMachineSpecStandardEngine,
} from "../engines/MonolithMachineSpecStandardEngine.js";

const engine = monolithMachineSpecStandardEngine;

describe("MonolithMachineSpecStandardEngine — schema integrity", () => {
  it("exports a singleton matching the class", () => {
    expect(engine).toBeInstanceOf(MonolithMachineSpecStandardEngine);
  });

  it("emptySpec returns a complete 8-section spec", () => {
    const s = engine.emptySpec();
    expect(s.identification).toBeTruthy();
    expect(s.axes).toBeTruthy();
    expect(s.spindle).toBeTruthy();
    expect(s.table).toBeTruthy();
    expect(s.toolChanger).toBeTruthy();
    expect(s.performance).toBeTruthy();
    expect(s.physical).toBeTruthy();
    expect(s.kinematics).toBeTruthy();
  });

  it("emptySpec has all 6 axes (x/y/z/a/b/c) with default units (mm or deg)", () => {
    const s = engine.emptySpec();
    expect(s.axes.travel.x.units).toBe("mm");
    expect(s.axes.travel.y.units).toBe("mm");
    expect(s.axes.travel.z.units).toBe("mm");
    expect(s.axes.travel.a.units).toBe("deg");
    expect(s.axes.travel.b.units).toBe("deg");
    expect(s.axes.travel.c.units).toBe("deg");
  });

  it("emptySpec spindle defaults orientation='vertical' (monolith default)", () => {
    expect(engine.emptySpec().spindle.orientation).toBe("vertical");
  });

  it("emptySpec performance has the monolith default units (m/min, mm/min, mm)", () => {
    const s = engine.emptySpec();
    expect(s.performance.rapidTraverse.units).toBe("m/min");
    expect(s.performance.feedRate.units).toBe("mm/min");
    expect(s.performance.accuracy.units).toBe("mm");
  });

  it("emptySpec table units default 'mm/kg' (monolith convention)", () => {
    expect(engine.emptySpec().table.units).toBe("mm/kg");
  });

  it("emptySpec kinematics rotarySpeed units 'deg/sec' (monolith default)", () => {
    expect(engine.emptySpec().kinematics.rotarySpeed.units).toBe("deg/sec");
  });

  it("emptySpec is a fresh instance per call (no shared mutable state)", () => {
    const a = engine.emptySpec();
    const b = engine.emptySpec();
    a.identification.model = "MUTATED";
    expect(b.identification.model).toBe("");
  });

  it("stats() reports 8 sections + 3 required fields + 6 axes", () => {
    const s = engine.stats();
    expect(s.sections).toBe(8);
    expect(s.required_fields).toBe(3);
    expect(s.axis_count).toBe(6);
  });

  it("requiredFields() returns the 3 monolith-mandated fields", () => {
    const required = engine.requiredFields();
    expect(required).toEqual([
      "identification.model",
      "axes.count",
      "spindle.maxRPM",
    ]);
  });
});

describe("MonolithMachineSpecStandardEngine — standardize() normalizer", () => {
  it("copies identification fields (manufacturer/model/type/controller)", () => {
    const out = engine.standardize({
      manufacturer: "Haas", model: "VF-2SS", type: "VMC", controller: "NGC",
    });
    expect(out.identification.manufacturer).toBe("Haas");
    expect(out.identification.model).toBe("VF-2SS");
    expect(out.identification.type).toBe("VMC");
    expect(out.identification.controller).toBe("NGC");
  });

  it("copies series field", () => {
    const out = engine.standardize({ series: "VF" });
    expect(out.identification.series).toBe("VF");
  });

  it("copies travel.{x,y,z} into axes.travel.{x,y,z}.max", () => {
    const out = engine.standardize({ travel: { x: 762, y: 406, z: 508 } });
    expect(out.axes.travel.x.max).toBe(762);
    expect(out.axes.travel.y.max).toBe(406);
    expect(out.axes.travel.z.max).toBe(508);
  });

  it("copies spindle.maxRPM from nested OR top-level (monolith fallback)", () => {
    const out1 = engine.standardize({ spindle: { maxRPM: 12000 } });
    expect(out1.spindle.maxRPM).toBe(12000);

    const out2 = engine.standardize({ spindle: {}, maxRPM: 8000 });
    expect(out2.spindle.maxRPM).toBe(8000);
  });

  it("copies spindleHP from nested OR top-level", () => {
    expect(engine.standardize({ spindle: { spindleHP: 25 } }).spindle.spindleHP).toBe(25);
    expect(engine.standardize({ spindle: {}, spindleHP: 15 }).spindle.spindleHP).toBe(15);
  });

  it("copies spindle.taper from nested OR top-level", () => {
    expect(engine.standardize({ spindle: { taper: "BT40" } }).spindle.taper).toBe("BT40");
    expect(engine.standardize({ spindle: {}, taper: "HSK-A63" }).spindle.taper).toBe("HSK-A63");
  });

  it("copies toolChanger.capacity (and toolCapacity fallback per monolith)", () => {
    expect(engine.standardize({ toolChanger: { capacity: 30 } }).toolChanger.capacity).toBe(30);
    expect(engine.standardize({ toolChanger: {}, toolCapacity: 24 }).toolChanger.capacity).toBe(24);
  });

  it("copies toolChanger.changeTime + chipToChip", () => {
    const out = engine.standardize({
      toolChanger: { changeTime: 3.5, chipToChip: 5.2 },
    });
    expect(out.toolChanger.changeTime).toBe(3.5);
    expect(out.toolChanger.chipToChip).toBe(5.2);
  });

  it("copies rapidTraverse verbatim", () => {
    const out = engine.standardize({ rapidTraverse: { x: 30, y: 30, z: 24, units: "m/min" } });
    expect(out.performance.rapidTraverse.x).toBe(30);
    expect(out.performance.rapidTraverse.z).toBe(24);
  });

  it("copies accuracy verbatim", () => {
    const out = engine.standardize({
      accuracy: { positioning: 0.005, repeatability: 0.002, units: "mm" },
    });
    expect(out.performance.accuracy.positioning).toBe(0.005);
    expect(out.performance.accuracy.repeatability).toBe(0.002);
  });

  it("returns empty spec on null/undefined/non-object input (fail-soft)", () => {
    const a = engine.standardize(null);
    const b = engine.standardize(undefined);
    const c = engine.standardize("string");
    const d = engine.standardize(42);
    expect(a.identification.model).toBe("");
    expect(b.identification.model).toBe("");
    expect(c.identification.model).toBe("");
    expect(d.identification.model).toBe("");
  });

  it("ignores wrong-type fields (string in numeric field, etc.) — never throws", () => {
    const out = engine.standardize({
      manufacturer: 42,  // wrong type — should be ignored
      model: "valid",
      travel: { x: "wrong" },  // wrong type — should be ignored
      spindle: { maxRPM: "twelve" },  // wrong type — ignored
    });
    expect(out.identification.manufacturer).toBe("");  // ignored
    expect(out.identification.model).toBe("valid");    // kept
    expect(out.axes.travel.x.max).toBe(0);             // ignored
    expect(out.spindle.maxRPM).toBe(0);                // ignored
  });
});

describe("MonolithMachineSpecStandardEngine — validateSpec()", () => {
  it("empty spec → invalid + all 3 required fields missing + completeness=0", () => {
    const r = engine.validateSpec(engine.emptySpec());
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual([
      "identification.model",
      "axes.count",
      "spindle.maxRPM",
    ]);
    expect(r.completeness).toBe(0);
  });

  it("complete spec → valid + missing empty + completeness=100", () => {
    const spec = engine.emptySpec();
    spec.identification.model = "VF-2SS";
    spec.axes.count = 3;
    spec.spindle.maxRPM = 12000;
    const r = engine.validateSpec(spec);
    expect(r.valid).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.completeness).toBe(100);
  });

  it("partial spec → 2 of 3 required → completeness≈66.67%", () => {
    const spec = engine.emptySpec();
    spec.identification.model = "VF-2SS";
    spec.axes.count = 3;
    // spindle.maxRPM left at 0 — falsy → missing
    const r = engine.validateSpec(spec);
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual(["spindle.maxRPM"]);
    expect(r.completeness).toBeCloseTo(66.67, 1);
  });

  it("validateSpec(null/undefined/non-object) → invalid + completeness=0", () => {
    expect(engine.validateSpec(null).valid).toBe(false);
    expect(engine.validateSpec(undefined).valid).toBe(false);
    expect(engine.validateSpec("string").valid).toBe(false);
    expect(engine.validateSpec(42).valid).toBe(false);
    expect(engine.validateSpec(null).completeness).toBe(0);
  });

  it("validateSpec handles malformed nested objects (R12 adversarial)", () => {
    const r = engine.validateSpec({
      identification: "not an object",
      axes: null,
      spindle: undefined,
    });
    expect(r.valid).toBe(false);
    expect(r.missing.length).toBe(3);
  });
});

describe("MonolithMachineSpecStandardEngine — round-trip standardize→validate", () => {
  it("standardize(haas) then validateSpec → valid when required fields land", () => {
    // Monolith semantic: top-level maxRPM is only consulted as a FALLBACK
    // when `spindle` object exists. Pass nested spindle (or {}) to engage
    // the fallback path — pinned by the dedicated 'spindle.maxRPM nested
    // OR top-level' test above.
    const out = engine.standardize({
      manufacturer: "Haas",
      model: "VF-2SS",
      type: "VMC",
      spindle: {},      // engages the fallback branch
      maxRPM: 12000,    // picked up via fallback
    });
    // axes.count is NOT settable via standardize — would need direct edit
    out.axes.count = 3;
    const r = engine.validateSpec(out);
    expect(r.valid).toBe(true);
    expect(r.completeness).toBe(100);
  });

  it("standardize without spindle.maxRPM → validateSpec flags it missing", () => {
    const out = engine.standardize({ model: "VF-2SS" });
    out.axes.count = 3;
    const r = engine.validateSpec(out);
    expect(r.missing).toContain("spindle.maxRPM");
  });
});
