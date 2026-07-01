import { describe, it, expect, beforeAll } from "vitest";
import { normalizeMachine, normalizeAll } from "../registries/machine-normalizer.js";
import { machineRegistry } from "../registries/MachineRegistry.js";

/**
 * U-MACHDB-02 -- the canonical machine normalizer collapses the ~100 stored key variants +
 * multiple structural shapes into one canonical NormalizedMachine. R9: tests verify INTENT
 * (the alias map recovers every machine the U-MACHDB-01 audit found under ANY variant), not
 * a hardcoded shape.
 */
describe("normalizeMachine -- spindle power variant recovery + unit coercion", () => {
  it("recovers power from every stored key variant, coercing hp->kW", () => {
    expect(normalizeMachine({ id: "a", spindle: { power_continuous: 22 } }).spindle.power_kw).toBe(22);
    expect(normalizeMachine({ id: "b", spindle: { power_kW: 15 } }).spindle.power_kw).toBe(15);
    expect(normalizeMachine({ id: "c", spindle: { power_kw: 11 } }).spindle.power_kw).toBe(11);
    expect(normalizeMachine({ id: "d", spindle: { power_rating: 7.5 } }).spindle.power_kw).toBe(7.5);
    // hp variants coerce to kW (20 hp = 14.914 kW)
    const hp = normalizeMachine({ id: "e", spindle: { continuousHp: 20 } });
    expect(hp.spindle.power_kw).toBeCloseTo(14.914, 2);
    expect(hp._provenance["spindle.power_kw"]).toContain("hp->kW");
    expect(normalizeMachine({ id: "f", spindle: { peakHp: 30 } }).spindle.power_peak_kw).toBeCloseTo(22.371, 2);
  });

  it("recovers rpm/torque/taper/bore from variant keys", () => {
    expect(normalizeMachine({ id: "a", spindle: { max_rpm: 12000 } }).spindle.max_rpm).toBe(12000);
    expect(normalizeMachine({ id: "b", spindle: { rpm: 8100 } }).spindle.max_rpm).toBe(8100);
    expect(normalizeMachine({ id: "c", spindle: { maxRpm: 15000 } }).spindle.max_rpm).toBe(15000);
    expect(normalizeMachine({ id: "d", spindle: { ratedRpm: 4500 } }).spindle.max_rpm).toBe(4500);
    expect(normalizeMachine({ id: "e", spindle: { torque_Nm: 122 } }).spindle.torque_nm).toBe(122);
    expect(normalizeMachine({ id: "f", spindle: { maxTorque_Nm: 199 } }).spindle.torque_nm).toBe(199);
    expect(normalizeMachine({ id: "g", spindle: { spindle_nose: "HSK-A63" } }).spindle.taper).toBe("HSK-A63");
    expect(normalizeMachine({ id: "h", spindle: { taper: "CAT40" } }).spindle.taper).toBe("CAT40");
    expect(normalizeMachine({ id: "i", spindle: { bore_diameter: 90 } }).spindle.bore_mm).toBe(90);
  });

  it("coerces numeric strings", () => {
    expect(normalizeMachine({ id: "a", spindle: { max_rpm: "10000" } }).spindle.max_rpm).toBe(10000);
  });
});

describe("normalizeMachine -- axis shape recovery (object | array | envelope)", () => {
  it("shape 1: axis_specs object", () => {
    const m = normalizeMachine({
      id: "a",
      axis_specs: {
        x: { travel: 508, rapid: 25400, accuracy: 0.005, guideway: "box_way", acceleration: 5 },
        y: { travel: 406 }, z: { travel: 508 },
      },
    });
    expect(m.axes.length).toBe(3);
    const x = m.axes.find((a) => a.name === "X")!;
    expect(x.travel_mm).toBe(508);
    expect(x.acceleration_m_s2).toBe(5);
    expect(x.accuracy_um).toBe(0.005);
    expect(x.way_type).toBe("box_way");
    expect(m.envelope.x_mm).toBe(508);
    expect(m.way_type).toBe("box_way");
  });
  it("shape 2: axes array", () => {
    const m = normalizeMachine({ id: "b", axes: [{ name: "X", travel: 760, rapid_rate: 36000 }, { name: "Y", travel: 430 }] });
    expect(m.axes.length).toBe(2);
    expect(m.axes[0].travel_mm).toBe(760);
    expect(m.envelope.x_mm).toBe(760);
  });
  it("shape 3: envelope fallback (travel only)", () => {
    const m = normalizeMachine({ id: "c", envelope: { x_travel: 1020, y_travel: 510, z_travel: 635 } });
    expect(m.envelope).toMatchObject({ x_mm: 1020, y_mm: 510, z_mm: 635 });
    expect(m.axes.length).toBe(3);
  });
});

describe("normalizeMachine -- controller + physical + adversarial", () => {
  it("controller variant keys + corner-control flags", () => {
    const m = normalizeMachine({ id: "a", controller: { brand: "Fanuc", model: "31i-B5", look_ahead: 200, ai_contour_control_II: true } });
    expect(m.controller.brand).toBe("Fanuc");
    expect(m.controller.look_ahead_blocks).toBe(200);
    expect(m.controller.corner_control).toBe("ai_contour_control_II");
  });
  it("weight from dimensions.weight_kg or top-level weight", () => {
    expect(normalizeMachine({ id: "a", dimensions: { weight_kg: 3629 } }).weight_kg).toBe(3629);
    expect(normalizeMachine({ id: "b", weight: 5000 }).weight_kg).toBe(5000);
  });
  it("high_speed_machining derives from >=15000 rpm when no flag", () => {
    expect(normalizeMachine({ id: "a", spindle: { max_rpm: 30000 } }).capabilities.high_speed_machining).toBe(true);
  });
  // ADVERSARIAL
  it("empty object -> stable shape, no throw, undefined fields", () => {
    const m = normalizeMachine({});
    expect(m.id).toBe("unknown");
    expect(m.axes).toEqual([]);
    expect(m.spindle.max_rpm).toBeUndefined();
    expect(m.envelope).toEqual({ x_mm: undefined, y_mm: undefined, z_mm: undefined });
  });
  it("NaN / Infinity / null values are rejected (not propagated)", () => {
    const m = normalizeMachine({ id: "a", spindle: { max_rpm: NaN, power_kW: Infinity }, weight: null });
    expect(m.spindle.max_rpm).toBeUndefined();
    expect(m.spindle.power_kw).toBeUndefined();
    expect(m.weight_kg).toBeUndefined();
  });
  it("malformed axis_specs entries are skipped, not thrown", () => {
    const m = normalizeMachine({ id: "a", axis_specs: { x: null, y: "bad", z: { travel: 300 } } });
    expect(m.axes.length).toBe(1);
    expect(m.axes[0].travel_mm).toBe(300);
  });
});

describe("normalizeAll -- LIVE registry coverage recovery (the R9 intent test)", () => {
  let coverage: Record<string, number>;
  let N = 0;
  beforeAll(async () => {
    await machineRegistry.load();
    const raw = [...(machineRegistry as unknown as { entries: Map<string, unknown> }).entries.values()].map(
      (e) => {
        const w = e as { machine?: Record<string, unknown>; data?: Record<string, unknown> };
        return w?.machine || w?.data || (e as Record<string, unknown>);
      },
    );
    N = raw.length;
    coverage = normalizeAll(raw as Record<string, unknown>[]).coverage;
  }, 180_000);

  it("loaded the full registry (>=1000 machines)", () => {
    expect(N).toBeGreaterThanOrEqual(1000);
  });

  // The audit (U-MACHDB-01) measured raw coverage; normalization must recover AT LEAST that much
  // (it can only find MORE machines, never fewer -- it unions all variant keys).
  it("recovers spindle rpm/power/torque/taper at the audit's STRONG level (>=95%)", () => {
    const pct = (k: string) => (coverage[k] / N) * 100;
    expect(pct("spindle_max_rpm")).toBeGreaterThanOrEqual(95);
    expect(pct("spindle_power_kw")).toBeGreaterThanOrEqual(95);
    expect(pct("spindle_torque_nm")).toBeGreaterThanOrEqual(95);
    expect(pct("spindle_taper")).toBeGreaterThanOrEqual(95);
    expect(pct("work_envelope")).toBeGreaterThanOrEqual(95);
    expect(pct("controller_model")).toBeGreaterThanOrEqual(90);
  });

  it("does NOT fabricate the GAP attributes (stay sparse until P3/P4 fill)", () => {
    const pct = (k: string) => (coverage[k] / N) * 100;
    // way_type was ~6% raw; normalization may lift via guideway_type alias but must stay a GAP (<50%),
    // proving the normalizer relocates real data and does not invent it.
    expect(pct("acceleration")).toBeLessThan(50);
    expect(pct("axis_accuracy")).toBeLessThan(50);
  });
});

describe("U-MACHDB-03: registry.getAllNormalized / getNormalized", () => {
  beforeAll(async () => { await machineRegistry.load(); }, 180_000);

  it("getAllNormalized returns the full fleet in canonical shape with reliable STRONG coverage", () => {
    const all = machineRegistry.getAllNormalized();
    expect(all.length).toBeGreaterThanOrEqual(1000);
    const withRpm = all.filter((m) => m.spindle.max_rpm != null).length;
    const withTaper = all.filter((m) => m.spindle.taper != null).length;
    expect(withRpm / all.length).toBeGreaterThanOrEqual(0.95);
    expect(withTaper / all.length).toBeGreaterThanOrEqual(0.95);
  });

  it("is cached -- second call returns identical object refs (not re-normalized)", () => {
    const a = machineRegistry.getAllNormalized();
    const b = machineRegistry.getAllNormalized();
    expect(b.length).toBe(a.length);
    expect(b[0]).toBe(a[0]);
  });

  it("getNormalized(id) resolves a real machine + round-trips its canonical rpm, cached by identity", () => {
    const all = machineRegistry.getAllNormalized();
    const target = all.find((m) => m.spindle.max_rpm != null && machineRegistry.getNormalized(m.id) != null);
    expect(target, "a machine with rpm resolves via getNormalized").toBeTruthy();
    const norm = machineRegistry.getNormalized(target!.id)!;
    expect(norm.id).toBe(target!.id);
    expect(norm.spindle.max_rpm).toBe(target!.spindle.max_rpm);
    expect(norm.spindle.max_rpm! > 0).toBe(true);
    expect(machineRegistry.getNormalized(target!.id)).toBe(norm);
  });
});
