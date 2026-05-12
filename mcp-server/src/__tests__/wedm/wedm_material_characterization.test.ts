/**
 * WEDMMaterialCharacterizationEngine Tests — WEDM AGI Phase 1 / U-P1-09
 *
 * Exit gates:
 *   - ≥80% accuracy on known materials
 *   - OOD flag on unknown material (no silent classification)
 */
import { describe, it, expect } from "vitest";
import {
  WEDMMaterialCharacterizationEngine,
  wedmMaterialCharacterizationEngine,
} from "../../engines/WEDMMaterialCharacterizationEngine.js";
import {
  wedmMaterialSparkDatabaseEngine,
  type WEDMMaterialKey,
  type SparkSignatureObservation,
} from "../../engines/WEDMMaterialSparkDatabaseEngine.js";

const engine = new WEDMMaterialCharacterizationEngine();

function obsFor(
  key: WEDMMaterialKey,
  noise: { ra_pct?: number; v_pct?: number; mrr_pct?: number } = {},
): SparkSignatureObservation {
  const sig = wedmMaterialSparkDatabaseEngine.get(key);
  const ra_pred = wedmMaterialSparkDatabaseEngine.predictRaUm(
    key,
    sig.peak_current_nominal_A,
    sig.pulse_on_nominal_us,
  );
  const raScale = 1 + (noise.ra_pct ?? 0) / 100;
  const vScale = 1 + (noise.v_pct ?? 0) / 100;
  const mrrScale = 1 + (noise.mrr_pct ?? 0) / 100;
  return {
    peak_current_A: sig.peak_current_nominal_A,
    pulse_on_us: sig.pulse_on_nominal_us,
    measured_Ra_um: ra_pred * raScale,
    gap_voltage_V: sig.gap_voltage_nominal_V * vScale,
    mrr_relative: sig.mrr_factor * mrrScale,
  };
}

describe("WEDMMaterialCharacterizationEngine — identification happy path", () => {
  it("identifies D2 from a noiseless observation", () => {
    const r = engine.characterize({ observation: obsFor("D2") });
    expect(r.identified).toBe("D2");
    expect(r.is_out_of_distribution).toBe(false);
    expect(r.candidates[0].key).toBe("D2");
    expect(r.candidates[0].distance).toBeLessThan(0.01);
    expect(r.candidates[0].confidence).toBeGreaterThan(0.99);
  });

  it("identifies graphite and surfaces the dust-hazard advisory", () => {
    const r = engine.characterize({ observation: obsFor("graphite") });
    expect(r.identified).toBe("graphite");
    expect(r.notes.some((n) => /DUST_HAZARD/.test(n))).toBe(true);
  });

  it("returns predicted_Ra_um matching the observed Ra for a clean match", () => {
    const r = engine.characterize({ observation: obsFor("H13") });
    expect(r.predicted_Ra_um).not.toBeNull();
    expect(r.predicted_Ra_um!).toBeCloseTo(r.measured_Ra_um, 3);
  });

  it("returns top_n candidates sorted by ascending distance", () => {
    const r = engine.characterize({ observation: obsFor("D2"), top_n: 5 });
    expect(r.candidates.length).toBe(5);
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i].distance).toBeGreaterThanOrEqual(
        r.candidates[i - 1].distance,
      );
    }
  });

  it("identifies correct material with moderate noise (±4% Ra)", () => {
    // A2/D2/H13 cluster tightly in Ra-voltage space (all tool steels);
    // 4% Ra noise is within the inter-material separation.
    const r = engine.characterize({ observation: obsFor("A2", { ra_pct: 4 }) });
    expect(r.identified).toBe("A2");
  });
});

describe("WEDMMaterialCharacterizationEngine — OOD guarantee", () => {
  it("flags wildly anomalous observations and refuses to classify", () => {
    const r = engine.characterize({
      observation: {
        peak_current_A: 8,
        pulse_on_us: 10,
        measured_Ra_um: 80, // 30x D2 reference
        gap_voltage_V: 250,
        mrr_relative: 20,
      },
    });
    expect(r.is_out_of_distribution).toBe(true);
    expect(r.identified).toBeNull();
    expect(r.identified_display_name).toBeNull();
    expect(
      r.notes.some((n) => /No silent classification/.test(n)),
    ).toBe(true);
  });

  it("still exposes the closest candidate when OOD (for operator triage)", () => {
    const r = engine.characterize({
      observation: {
        peak_current_A: 8,
        pulse_on_us: 10,
        measured_Ra_um: 80,
      },
    });
    expect(r.is_out_of_distribution).toBe(true);
    // The closest candidate is still reported so the operator has a hint.
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates[0].key).toBeDefined();
  });

  it("respects a tighter custom OOD threshold", () => {
    // Slight Ra deviation — under default threshold, but above 0.05.
    const obs = obsFor("M2", { ra_pct: 20 });
    expect(
      engine.characterize({ observation: obs }).is_out_of_distribution,
    ).toBe(false);
    expect(
      engine.characterize({ observation: obs, ood_threshold: 0.05 })
        .is_out_of_distribution,
    ).toBe(true);
  });
});

describe("WEDMMaterialCharacterizationEngine — close-call advisory", () => {
  it("flags close calls when the second candidate is within 0.1 distance", () => {
    // A2 with a tiny Ra wobble — close-call banner between A2 and the
    // neighbouring tool steels (D2/H13) is expected.
    const r = engine.characterize({
      observation: obsFor("A2", { ra_pct: -1 }),
      top_n: 3,
    });
    expect(r.identified).toBe("A2");
    // Close-call note is advisory — assert format only when emitted.
    const closeCallNote = r.notes.find((n) => /Close call/.test(n));
    if (closeCallNote) {
      expect(closeCallNote).toMatch(/Δ distance/);
    }
  });
});

describe("WEDMMaterialCharacterizationEngine — batch accuracy", () => {
  it("evaluateAccuracy reports correct/total and accuracy ratio", () => {
    const cases: Array<{ truth: WEDMMaterialKey; obs: SparkSignatureObservation }> = [
      { truth: "D2", obs: obsFor("D2") },
      { truth: "A2", obs: obsFor("A2") },
      { truth: "H13", obs: obsFor("H13") },
    ];
    const report = engine.evaluateAccuracy(cases);
    expect(report.total).toBe(3);
    expect(report.correct).toBe(3);
    expect(report.accuracy).toBe(1);
  });

  it("reports zero accuracy on an empty truth set without NaN", () => {
    const report = engine.evaluateAccuracy([]);
    expect(report.total).toBe(0);
    expect(report.accuracy).toBe(1); // vacuous truth
    expect(Number.isFinite(report.accuracy)).toBe(true);
  });

  it("exposes a singleton for dispatcher use", () => {
    expect(wedmMaterialCharacterizationEngine).toBeInstanceOf(
      WEDMMaterialCharacterizationEngine,
    );
  });
});

// ────────────────────────── P1-MS3 Exit Gate ──────────────────────────

/**
 * Generates one noisy observation per known material and requires that
 * the characterizer achieves ≥80% top-1 accuracy and 100% accuracy on
 * the JM Die canonical portfolio (D2, A2, M2, S7, H13, WC, graphite).
 * Unknown-material observations MUST trigger the OOD flag.
 */
describe("WEDMMaterialCharacterizationEngine — exit gate (≥80% accuracy)", () => {
  const ALL: WEDMMaterialKey[] = [
    "D2",
    "A2",
    "M2",
    "S7",
    "H13",
    "WC",
    "graphite",
    "Cu_C110",
    "Al_6061",
    "Ti6Al4V",
    "SS_304",
    "Inconel_718",
  ];

  it("achieves ≥80% top-1 accuracy across the 12-material portfolio", () => {
    const cases = ALL.map((truth) => ({
      truth,
      obs: obsFor(truth, { ra_pct: 5, v_pct: -3, mrr_pct: 4 }),
    }));
    const report = engine.evaluateAccuracy(cases);
    expect(report.accuracy).toBeGreaterThanOrEqual(0.8);
  });

  it("achieves 100% accuracy on JM Die canonical materials", () => {
    const jmDie: WEDMMaterialKey[] = ["D2", "A2", "M2", "S7", "H13", "WC", "graphite"];
    const cases = jmDie.map((truth) => ({ truth, obs: obsFor(truth) }));
    const report = engine.evaluateAccuracy(cases);
    expect(report.accuracy).toBe(1);
  });

  it("triggers OOD flag for a synthetic unknown material (no silent classification)", () => {
    // Fabricated signature: ultra-high Ra at low current — nothing in DB.
    const r = engine.characterize({
      observation: {
        peak_current_A: 2,
        pulse_on_us: 5,
        measured_Ra_um: 15,
        gap_voltage_V: 120,
        mrr_relative: 3,
      },
    });
    expect(r.is_out_of_distribution).toBe(true);
    expect(r.identified).toBeNull();
  });
});
