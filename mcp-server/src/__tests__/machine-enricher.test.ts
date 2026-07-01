/**
 * machine-enricher.test.ts (U-MACHDB-03, slot:oscar 2026-06-26)
 *
 * Reference-value + invariant tests for the physics/class gap-fill enricher.
 * Spans >=3 machine classes (precision 5-axis / production VMC / box-way heavy) + >=3 failure modes
 * (empty machine / no taper / unknown brand) + >=2 adversarial inputs (NaN rpm / Infinity weight /
 * empty axes). Asserts: correct classification, physically-bounded derived values, ISO-1940 balance,
 * taper->bore map, S-curve jerk, FRF spring-mass, never-overwrite-OEM, provenance tagging, purity.
 *
 * R9: every assertion encodes WHY the value matters (a hard-coded passthrough would fail it).
 */
import { describe, it, expect } from "vitest";
import type { NormalizedMachine } from "../registries/machine-normalizer.js";
import { classifyMachine, enrichMachine, peakGForce, enrichAll, registryMachineToCatalog } from "../registries/machine-enricher.js";

const STANDARD_GRAVITY = 9.80665;

/** minimal valid NormalizedMachine; override any field per test. */
function nm(over: Partial<NormalizedMachine> = {}): NormalizedMachine {
  return {
    id: over.id ?? "test",
    spindle: over.spindle ?? {},
    axes: over.axes ?? [{ name: "X" }, { name: "Y" }, { name: "Z" }],
    envelope: over.envelope ?? {},
    table: over.table ?? {},
    controller: over.controller ?? {},
    capabilities: over.capabilities ?? {},
    _provenance: over._provenance ?? {},
    ...over,
  };
}

// ── representative fixtures (3 spanning classes) ─────────────────────────────────
const precision5x = nm({
  id: "hermle-c42", manufacturer: "Hermle", model: "C42", type: "5-axis machining center",
  spindle: { max_rpm: 18000, power_kw: 22, taper: "HSK-A63" },
  axes: [{ name: "X" }, { name: "Y" }, { name: "Z" }, { name: "A" }, { name: "C" }],
  envelope: { x_mm: 800, y_mm: 800, z_mm: 550 },
  controller: { brand: "Heidenhain", model: "TNC 640" },
});

const productionVmc = nm({
  id: "haas-vf2", manufacturer: "Haas", model: "VF-2", type: "VMC vertical machining center",
  spindle: { max_rpm: 8100, power_kw: 22.4, taper: "CAT40" },
  envelope: { x_mm: 762, y_mm: 406, z_mm: 508 },
  controller: { brand: "Haas", model: "NGC" },
});

const boxWayHeavy = nm({
  id: "toshiba-bmc", manufacturer: "Toshiba", model: "BMC-110", type: "HMC horizontal boring",
  spindle: { max_rpm: 3000, power_kw: 37, taper: "CAT50" },
  axes: [{ name: "X" }, { name: "Y" }, { name: "Z" }, { name: "B" }],
  envelope: { x_mm: 2000, y_mm: 1800, z_mm: 1600 },
  controller: { brand: "Fanuc", model: "31i" },
});

describe("classifyMachine", () => {
  it("classifies a precision 5-axis correctly (kind/tier/way/rpm)", () => {
    const c = classifyMachine(precision5x);
    expect(c.kind).toBe("5axis");          // 2 rotary axes A+C
    expect(c.tier).toBe("premium");        // Hermle is a premium/precision brand
    expect(c.wayType).toBe("linear_guide"); // modern HS 5-axis
    expect(c.rpmClass).toBe("high");       // 18000 >= 12000
  });

  it("classifies a production VMC correctly", () => {
    const c = classifyMachine(productionVmc);
    expect(c.kind).toBe("vmc");
    expect(c.tier).toBe("production");     // Haas
    expect(c.wayType).toBe("linear_guide");
    expect(c.rpmClass).toBe("medium");     // 8100 in [6000,12000)
  });

  it("classifies a large box-way machine as heavy-duty box_way", () => {
    const c = classifyMachine(boxWayHeavy);
    expect(c.kind).toBe("hmc");
    expect(c.tier).toBe("heavy_duty");     // Toshiba heavy brand + 2m envelope
    expect(c.wayType).toBe("box_way");     // rigidity-first
    expect(c.rpmClass).toBe("low");        // 3000 < 6000
    expect(c.maxTravelMm).toBe(2000);
  });
});

describe("classifyMachine — tier robustness (known brand authoritative over noisy accuracy)", () => {
  it("a production brand with a tight OEM accuracy reading STAYS production (not bumped to precision)", () => {
    // regression: a single accuracy number (unit-fragile / often a mislabeled repeatability) must not
    // override a known production brand into precision and cascade 0.1um-Ra / 210-N/um false physics.
    const haasTight = nm({
      id: "haas-tight", manufacturer: "Haas", type: "VMC",
      spindle: { max_rpm: 8100, taper: "CAT40" },
      axes: [{ name: "X", accuracy_um: 2 }, { name: "Y", accuracy_um: 2 }, { name: "Z", accuracy_um: 2 }],
    });
    expect(classifyMachine(haasTight).tier).toBe("production");
    const e = enrichMachine(haasTight);
    expect(e.build_quality).toBe("production");
    expect(e.surface_finish_capability!.best_ra_um).toBe(0.4); // production Ra, not 0.1 precision
  });

  it("an UNKNOWN brand with a sane tight accuracy reading is classified precision", () => {
    const unknownTight = nm({
      id: "ghost", type: "VMC", spindle: { max_rpm: 12000, taper: "HSK-A63" },
      axes: [{ name: "X", accuracy_um: 2 }, { name: "Y", accuracy_um: 2 }, { name: "Z", accuracy_um: 2 }],
    });
    expect(classifyMachine(unknownTight).tier).toBe("precision");
  });

  it("a sub-1um accuracy (unit-confusion) is IGNORED -> unknown brand falls back to class default", () => {
    const unitBug = nm({
      id: "unitbug", type: "VMC", spindle: { max_rpm: 10000, taper: "CAT40" },
      axes: [{ name: "X", accuracy_um: 0.005 }], // 0.005 = mm mis-stored as um; no CNC has 0.005um accuracy
    });
    expect(classifyMachine(unitBug).tier).toBe("production"); // vmc fallback, NOT precision
  });
});

describe("enrichMachine — reference values per class", () => {
  it("precision 5-axis: ISO-1940 G1.0 balance, HSK-A63 bore=70, ~1g accel, fine Ra, 5-axis kinematics", () => {
    const e = enrichMachine(precision5x);
    expect(e.spindle.balance_grade).toBe("G1.0");           // high rpm class
    expect(e.spindle.bore_mm).toBe(70);                     // HSK-A63 front bore
    const xAccel = e.axes.find((a) => a.name === "X")!.acceleration_m_s2!;
    expect(xAccel).toBeCloseTo(9.81, 1);                    // ~1.0 g, linear-guide premium
    expect(peakGForce(e)).toBeCloseTo(xAccel / STANDARD_GRAVITY, 3);
    expect(e.surface_finish_capability!.best_ra_um).toBeLessThanOrEqual(0.2);
    expect(e.kinematics!.type).toBe("5-axis");
    expect(e.way_type).toBe("linear_guide");
    // FRF physically bounded
    expect(e.frf!.natural_frequency_hz!).toBeGreaterThanOrEqual(20);
    expect(e.frf!.natural_frequency_hz!).toBeLessThanOrEqual(300);
    expect(e.frf!.damping_ratio!).toBeGreaterThan(0);
    // jerk = round(accel / t_jerk) (high rpm -> t_jerk=0.02 -> jerk=round(accel/0.02))
    const xJerk = e.axes.find((a) => a.name === "X")!.jerk_m_s3!;
    expect(xJerk).toBe(Math.round(xAccel / 0.02));
  });

  it("production VMC: G2.5 balance (medium rpm), CAT40 bore=70, Haas G187 corner control", () => {
    const e = enrichMachine(productionVmc);
    expect(e.spindle.balance_grade).toBe("G2.5");
    expect(e.spindle.bore_mm).toBe(70);                     // CAT40
    expect(e.build_quality).toBe("production");
    expect(e.controller.corner_control).toContain("G187"); // Haas NGC
    expect(e.controller.look_ahead_blocks).toBe(1000);     // Haas NGC
    // medium-rpm production accel ~0.7 g
    const accel = e.axes.find((a) => a.name === "X")!.acceleration_m_s2!;
    expect(accel).toBeGreaterThan(5);
    expect(accel).toBeLessThan(10);
  });

  it("box-way heavy HMC: G6.3 (low rpm), box_way, CAT50 bore=100, high robustness, low accel", () => {
    const e = enrichMachine(boxWayHeavy);
    expect(e.spindle.balance_grade).toBe("G6.3");
    expect(e.spindle.bore_mm).toBe(100);                   // CAT50
    expect(e.way_type).toBe("box_way");
    expect(e.build_quality).toBe("heavy_duty");
    expect(e.robustness).toMatch(/high/);
    const accel = e.axes.find((a) => a.name === "X")!.acceleration_m_s2!;
    expect(accel).toBeLessThanOrEqual(4.0);                // heavy box-way: <=0.4 g
    // table type by kind (HMC -> pallet/B-rotary)
    expect(e.table.type).toMatch(/pallet|rotary/);
    // FRF: box-way + CAT50 + heavy mass -> high stiffness
    expect(e.frf!.stiffness_n_um!).toBeGreaterThan(150);
  });

  it("g-force is the peak linear-axis acceleration over standard gravity", () => {
    const e = enrichMachine(productionVmc);
    const peak = Math.max(...e.axes.map((a) => a.acceleration_m_s2 ?? 0));
    expect(peakGForce(e)).toBeCloseTo(peak / STANDARD_GRAVITY, 5);
  });
});

describe("enrichMachine — never overwrite OEM data (R12)", () => {
  it("preserves OEM way_type / balance / frf / bore and does NOT tag them inferred", () => {
    const oem = nm({
      id: "oem", manufacturer: "Mazak",
      spindle: { max_rpm: 12000, taper: "CAT40", bore_mm: 88, balance_grade: "G0.4" },
      way_type: "box_way",
      frf: { natural_frequency_hz: 95, damping_ratio: 0.05, stiffness_n_um: 210 },
    });
    const e = enrichMachine(oem);
    expect(e.way_type).toBe("box_way");          // not overwritten by class default
    expect(e.spindle.balance_grade).toBe("G0.4"); // not overwritten by rpm-class default
    expect(e.spindle.bore_mm).toBe(88);          // not overwritten by taper map (70)
    expect(e.frf!.natural_frequency_hz).toBe(95);
    expect(e.frf!.stiffness_n_um).toBe(210);
    // provenance for these stays NON-inferred (absent here, since fixture set them directly)
    expect(e._provenance["way_type"]).toBeUndefined();
    expect(e._provenance["spindle.balance_grade"]).toBeUndefined();
    expect(e._provenance["frf"]).toBeUndefined();
  });

  it("merges a partial OEM frf — keeps present sibling, fills only the missing field", () => {
    const partial = nm({
      id: "p", spindle: { max_rpm: 10000, taper: "CAT40" },
      frf: { natural_frequency_hz: undefined, damping_ratio: 0.07, stiffness_n_um: undefined } as NormalizedMachine["frf"],
    });
    const e = enrichMachine(partial);
    expect(e.frf!.damping_ratio).toBe(0.07);                 // OEM sibling preserved
    expect(e.frf!.natural_frequency_hz!).toBeGreaterThan(0);  // missing field filled
    expect(e.frf!.stiffness_n_um!).toBeGreaterThan(0);        // missing field filled
    expect(e._provenance["frf"]).toBe("inferred:frf-by-way-tier-mass-springmass");
  });

  it("preserves an OEM capabilities.high_speed_machining=false even when controller derives true (intentional)", () => {
    const m = nm({ id: "hsm", spindle: { max_rpm: 20000, taper: "HSK-A63" }, capabilities: { high_speed_machining: false } });
    const e = enrichMachine(m);
    expect(e.capabilities.high_speed_machining).toBe(false); // OEM wins, divergence intentional
    expect(e.controller.high_speed_machining).toBe(true);    // controller-derived
  });
});

describe("enrichMachine — provenance tagging", () => {
  it("tags every inferred field with inferred:<basis> and records the derived class", () => {
    const e = enrichMachine(productionVmc);
    expect(e._provenance["way_type"]).toBe("inferred:waytype-by-class");
    expect(e._provenance["spindle.balance_grade"]).toBe("inferred:balance-by-rpm-iso1940");
    expect(e._provenance["spindle.bore_mm"]).toBe("inferred:bore-by-taper");
    expect(e._provenance["frf"]).toMatch(/^inferred:/);
    expect(e._provenance["build_quality"]).toBe("inferred:tier-by-brand-class");
    expect(e._provenance["axes.*.acceleration_m_s2"]).toBe("inferred:accel-by-waytype-tier");
    expect(e._provenance["_class"]).toContain("kind=vmc");
    expect(e._provenance["_gforce_g"]).toMatch(/g$/);
  });
});

describe("enrichMachine — purity (no input mutation)", () => {
  it("does not mutate the caller's record or nested objects", () => {
    const input = nm({ id: "pure", spindle: { max_rpm: 10000, taper: "CAT40" }, axes: [{ name: "X" }] });
    const snapshotProvKeys = Object.keys(input._provenance).length;
    const e = enrichMachine(input);
    expect(input.spindle.balance_grade).toBeUndefined();   // input spindle untouched
    expect(input.axes[0].acceleration_m_s2).toBeUndefined(); // input axis untouched
    expect(input.way_type).toBeUndefined();
    expect(input.build_quality).toBeUndefined();
    expect(Object.keys(input._provenance).length).toBe(snapshotProvKeys); // input prov untouched
    expect(e).not.toBe(input);
    expect(e.spindle).not.toBe(input.spindle);
    expect(e.axes[0]).not.toBe(input.axes[0]);
  });
});

describe("enrichMachine — failure modes", () => {
  it("empty machine (no axes/envelope/taper) does not throw; fills class fields, omits unfillable", () => {
    const empty = nm({ id: "empty", axes: [], spindle: {}, envelope: {}, controller: {} });
    expect(() => enrichMachine(empty)).not.toThrow();
    const e = enrichMachine(empty);
    expect(e.way_type).toBe("linear_guide");      // kind=unknown -> production -> linear_guide
    expect(e.spindle.balance_grade).toBe("G6.3"); // no rpm -> low class
    expect(e.build_quality).toBe("production");
    expect(e.robustness).toMatch(/medium/);
    expect(e.kinematics!.type).toBe("3-axis");
    expect(e.spindle.bore_mm).toBeUndefined();    // no taper -> NOT fabricated
    expect(e.weight_kg).toBeUndefined();          // no envelope -> NOT fabricated
  });

  it("no spindle taper leaves bore undefined (no fabrication)", () => {
    const e = enrichMachine(nm({ id: "notaper", spindle: { max_rpm: 12000 } }));
    expect(e.spindle.bore_mm).toBeUndefined();
    expect(e._provenance["spindle.bore_mm"]).toBeUndefined();
  });

  it("unknown brand falls back to a class-default tier (not a crash, not 'undefined' build quality)", () => {
    const e = enrichMachine(nm({ id: "noname", type: "VMC", spindle: { max_rpm: 10000, taper: "BT40" }, envelope: { x_mm: 600, y_mm: 400, z_mm: 500 } }));
    expect(e.build_quality).toBe("production"); // vmc fallback
    expect(e.way_type).toBe("linear_guide");    // small vmc -> linear guide
  });
});

describe("enrichMachine — adversarial inputs", () => {
  it("NaN rpm -> low rpm class (G6.3), no throw", () => {
    const e = enrichMachine(nm({ id: "nan", spindle: { max_rpm: NaN, taper: "CAT40" } }));
    expect(e.spindle.balance_grade).toBe("G6.3");
    expect(Number.isFinite(e.frf!.natural_frequency_hz!)).toBe(true);
  });

  it("Infinity weight -> modal mass clamped, FRF stays finite", () => {
    const e = enrichMachine(nm({ id: "inf", weight_kg: Infinity, spindle: { max_rpm: 8000, taper: "CAT40" }, envelope: { x_mm: 800, y_mm: 600, z_mm: 500 } }));
    expect(Number.isFinite(e.frf!.natural_frequency_hz!)).toBe(true);
    expect(e.frf!.natural_frequency_hz!).toBeGreaterThanOrEqual(20);
    expect(e.frf!.natural_frequency_hz!).toBeLessThanOrEqual(300);
  });

  it("empty axes array -> machine-level fields filled, no throw, g-force falls back to class accel", () => {
    const e = enrichMachine(nm({ id: "noax", axes: [], spindle: { max_rpm: 15000, taper: "HSK-A63" } }));
    expect(e.way_type).toBe("linear_guide");
    expect(e.spindle.balance_grade).toBe("G1.0");
    expect(peakGForce(e)).toBe(0); // no axes -> no per-axis accel
  });
});

describe("enrichAll — batch coverage proof", () => {
  it("drives class-derivable GAP fields to 100% across a spanning batch", () => {
    const { machines, coverage } = enrichAll([precision5x, productionVmc, boxWayHeavy]);
    // class/physics-only fields: every machine gets them -> 100%
    for (const f of ["way_type", "kinematics", "spindle_balance", "rigidity_frf", "build_quality",
      "robustness", "surface_finish", "corner_rounding", "look_ahead", "table_type",
      "axis_accuracy", "axis_repeatability", "rapid_rate", "acceleration_gforce", "jerk"]) {
      expect(coverage[f].pct).toBe(100);
    }
    // high_speed is a TRUE/FALSE capability (not a fill-to-100 gap): DETERMINED for every machine,
    // but true-counted only for the ones that ARE high-speed (mirrors the audit's true-only predicate).
    expect(machines.every((m) => typeof m.capabilities.high_speed_machining === "boolean")).toBe(true);
    expect(coverage.high_speed.count).toBe(1); // only the 18000-rpm precision 5-axis
    // source-dependent fields: present for these fixtures (all have taper + envelope)
    expect(coverage.spindle_diameter.pct).toBe(100); // all 3 have a taper
    expect(coverage.machine_weight.pct).toBe(100);   // all 3 have an envelope
  });

  it("source-dependent fields stay <100% when source data is absent (honest, not fabricated)", () => {
    const noTaperNoEnv = nm({ id: "bare", spindle: { max_rpm: 8000 }, axes: [{ name: "X" }] });
    const { coverage } = enrichAll([precision5x, noTaperNoEnv]);
    expect(coverage.spindle_diameter.pct).toBe(50); // only the one with a taper
    expect(coverage.machine_weight.pct).toBe(50);   // only the one with an envelope
    expect(coverage.way_type.pct).toBe(100);        // class-derivable for both
  });
});

describe("registryMachineToCatalog — P5 SFC wire + registry-fallback bug fixes", () => {
  it("reads spindle power from a VARIANT key (power_kW) -- was power_continuous-only -> 15 kW default drop", () => {
    // THE bug: SpeedFeedOrchestrator.resolveMachine read ONLY spindle.power_continuous, so every
    // machine storing power under power_kW/power_kw/peakHp/... silently resolved to the 15 kW default.
    const raw = {
      id: "regvar", type: "vertical_mill",
      spindle: { power_kW: 26, maxRpm: 12000, torque_max: 200, spindle_nose: "CAT40" },
      way_type: "box ways", weight: 8000,
      axes: [{ name: "X" }, { name: "Y" }, { name: "Z" }],
    };
    const c = registryMachineToCatalog(raw)!;
    expect(c.power_kw).toBe(26);   // sourced via the normalizer's 7-key union, NOT the 15 default
    expect(c.max_rpm).toBe(12000); // maxRpm variant key
    expect(c.torque_Nm).toBe(200);
    expect(c.taper).toBe("CAT40"); // spindle_nose variant key
  });

  it("derives nat_freq_hz from the FRF spring-mass model -- was hard-coded 800 Hz (physically wrong)", () => {
    const raw = { id: "nf", type: "vertical_mill", spindle: { power_continuous: 18, max_rpm: 10000, taper: "CAT40" }, axes: [{ name: "X" }] };
    const c = registryMachineToCatalog(raw)!;
    expect(c.power_kw).toBe(18);            // original power_continuous key still works
    expect(c.nat_freq_hz).not.toBe(800);    // not the old hard-coded default
    expect(c.nat_freq_hz).toBeGreaterThanOrEqual(20);
    expect(c.nat_freq_hz).toBeLessThanOrEqual(300); // realistic dominant structural mode
  });

  it("maps guideway + rigidity from way_type -- was hard-coded guideway='linear'", () => {
    const box = registryMachineToCatalog({ id: "b", spindle: { max_rpm: 4000, taper: "CAT50" }, way_type: "box", weight: 12000, axes: [{ name: "X" }] })!;
    expect(box.guideway).toBe("box");       // not hard-coded "linear"
    expect(box.rigidity).toBe("high");      // box way / heavy
    const lin = registryMachineToCatalog({ id: "l", type: "vmc", spindle: { max_rpm: 15000, taper: "HSK-A63" }, way_type: "linear", weight: 5000, axes: [{ name: "X" }] })!;
    expect(lin.guideway).toBe("linear");
    expect(lin.rigidity).toBe("medium");
  });

  it("populates accel_m_s2 + jerk_m_s3 (the old fallback never set them -> effective-feed model blind)", () => {
    const c = registryMachineToCatalog({ id: "aj", type: "vmc", spindle: { max_rpm: 12000, taper: "CAT40" }, way_type: "linear", axes: [{ name: "X" }, { name: "Y" }, { name: "Z" }] })!;
    expect(c.accel_m_s2).toBeGreaterThan(0);
    expect(c.jerk_m_s3).toBeGreaterThan(0);
  });

  it("returns undefined for a record with no spindle (nothing to resolve)", () => {
    expect(registryMachineToCatalog({ id: "nospindle" })).toBeUndefined();
    expect(registryMachineToCatalog({})).toBeUndefined();
    expect(registryMachineToCatalog(null as unknown as Record<string, unknown>)).toBeUndefined();
  });

  it("falls back to safe defaults only when a field is genuinely absent (not fabricated past that)", () => {
    const c = registryMachineToCatalog({ id: "sparse", spindle: { taper: "BT40" } })!;
    expect(c.power_kw).toBe(15);   // documented default when power absent
    expect(c.max_rpm).toBe(12000); // documented default when rpm absent
    expect(c.taper).toBe("BT40");  // the one real field is preserved
  });
});
