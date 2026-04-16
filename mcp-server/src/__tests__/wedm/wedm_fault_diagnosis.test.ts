/**
 * WEDMFaultDiagnosisEngine Tests — WEDM AGI Phase 2 / U-P2-03
 *
 * Exit gate: ≥80 % top-1 accuracy on 10 synthetic expert-labelled
 * failures (below). The "expected_cause" set is a category — any match
 * inside the set counts as correct.
 */
import { describe, it, expect } from "vitest";
import {
  WEDMFaultDiagnosisEngine,
  wedmFaultDiagnosisEngine,
  type ObservedSymptom,
} from "../../engines/WEDMFaultDiagnosisEngine.js";

const engine = new WEDMFaultDiagnosisEngine();

interface FailureCase {
  name: string;
  symptoms: ObservedSymptom[];
  /** Any of these being the top candidate counts as correct. */
  expected_cause: string[];
}

const FAILURE_CASES: FailureCase[] = [
  {
    name: "Rough surface with fast cutting",
    symptoms: [
      { variable: "Ra", direction: "up", severity: "high" },
      { variable: "mrr", direction: "up", severity: "medium" },
    ],
    expected_cause: ["peak_current", "on_time", "duty_cycle", "discharge_energy"],
  },
  {
    name: "Wire breaking, debris-laden cut",
    symptoms: [
      { variable: "wire_break_prob", direction: "up", severity: "high" },
      { variable: "arc_stability", direction: "down", severity: "medium" },
    ],
    expected_cause: ["flushing_pressure", "debris_evacuation", "dielectric_temp"],
  },
  {
    name: "Corner dimensional error",
    symptoms: [
      { variable: "dimensional_accuracy", direction: "down", severity: "high" },
      { variable: "corner_error", direction: "up", severity: "medium" },
    ],
    expected_cause: ["corner_radius", "feed_rate", "wire_deflection"],
  },
  {
    name: "Taper part with dimensional drift",
    symptoms: [
      { variable: "dimensional_error", direction: "up", severity: "high" },
    ],
    expected_cause: ["taper_angle", "wire_lag", "feed_rate"],
  },
  {
    name: "Uneven surface finish on tall parts",
    symptoms: [
      { variable: "Ra_uniformity", direction: "down", severity: "high" },
    ],
    expected_cause: ["wire_tension", "wire_vibration", "wire_speed", "wire_lag"],
  },
  {
    name: "HAZ cracking on hardened die",
    symptoms: [
      { variable: "microcracking", direction: "up", severity: "high" },
      { variable: "HAZ_depth", direction: "up", severity: "medium" },
    ],
    expected_cause: ["plasma_temperature", "discharge_energy", "peak_current", "on_time"],
  },
  {
    name: "Low MRR on thick WC",
    symptoms: [
      { variable: "mrr", direction: "down", severity: "high" },
    ],
    expected_cause: [
      "material_hardness",
      "thickness",
      "duty_cycle",
      "off_time",
      "arc_stability",
    ],
  },
  {
    name: "Shorts and instability in hot weather",
    symptoms: [
      { variable: "short_circuit_rate", direction: "up", severity: "high" },
      { variable: "arc_stability", direction: "down", severity: "medium" },
    ],
    expected_cause: ["dielectric_temp", "debris_evacuation", "flushing_pressure"],
  },
  {
    name: "Worn wire coinciding with poor finish",
    symptoms: [
      { variable: "Ra", direction: "up", severity: "medium" },
      { variable: "wire_break_prob", direction: "up", severity: "high" },
    ],
    expected_cause: ["wire_wear", "peak_current", "duty_cycle"],
  },
  {
    name: "Dimensional accuracy suffering with high feed",
    symptoms: [
      { variable: "dimensional_accuracy", direction: "down", severity: "high" },
      { variable: "wire_deflection", direction: "up", severity: "medium" },
    ],
    expected_cause: ["feed_rate", "corner_radius", "wire_tension"],
  },
];

describe("WEDMFaultDiagnosisEngine — exit gate ≥80 % accuracy", () => {
  it("achieves ≥80 % top-1 accuracy on the 10-case expert set", () => {
    let correct = 0;
    const failures: string[] = [];
    for (const c of FAILURE_CASES) {
      const r = engine.diagnose({ symptoms: c.symptoms });
      const pick = r.top_candidate?.variable ?? null;
      if (pick && c.expected_cause.includes(pick)) {
        correct += 1;
      } else {
        failures.push(`${c.name}: picked ${pick} expected one of ${c.expected_cause.join("|")}`);
      }
    }
    const accuracy = correct / FAILURE_CASES.length;
    if (accuracy < 0.8) console.warn("Diagnostic failures:\n" + failures.join("\n"));
    expect(accuracy).toBeGreaterThanOrEqual(0.8);
  });
});

describe("WEDMFaultDiagnosisEngine — single-symptom diagnoses", () => {
  it("↑Ra alone points to an electrical driver", () => {
    const r = engine.diagnose({
      symptoms: [{ variable: "Ra", direction: "up", severity: "high" }],
    });
    expect(r.top_candidate).not.toBeNull();
    expect([
      "peak_current",
      "on_time",
      "duty_cycle",
      "discharge_energy",
      "crater_size",
    ]).toContain(r.top_candidate!.variable);
  });

  it("↑dimensional_error points to taper/feed/wire_lag family", () => {
    const r = engine.diagnose({
      symptoms: [{ variable: "dimensional_error", direction: "up", severity: "high" }],
    });
    expect(r.top_candidate).not.toBeNull();
    expect([
      "taper_angle",
      "feed_rate",
      "wire_lag",
    ]).toContain(r.top_candidate!.variable);
  });

  it("↓arc_stability points to flushing/dielectric family", () => {
    const r = engine.diagnose({
      symptoms: [{ variable: "arc_stability", direction: "down", severity: "high" }],
    });
    expect(r.top_candidate).not.toBeNull();
    expect([
      "flushing_pressure",
      "debris_evacuation",
      "dielectric_temp",
      "off_time",
    ]).toContain(r.top_candidate!.variable);
  });
});

describe("WEDMFaultDiagnosisEngine — result shape + notes", () => {
  it("returns top_n candidates sorted by descending score", () => {
    const r = engine.diagnose({
      symptoms: [{ variable: "Ra", direction: "up" }],
      top_n: 5,
    });
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i].score).toBeLessThanOrEqual(
        r.candidates[i - 1].score,
      );
    }
  });

  it("each candidate carries at least one explanation", () => {
    const r = engine.diagnose({
      symptoms: [{ variable: "Ra", direction: "up" }],
      top_n: 3,
    });
    for (const c of r.candidates) {
      expect(c.explanations.length).toBeGreaterThan(0);
    }
  });

  it("emits a close-call note when top two scores are within 15%", () => {
    const r = engine.diagnose({
      symptoms: [{ variable: "Ra", direction: "up" }],
      top_n: 5,
    });
    if (
      r.candidates.length >= 2 &&
      r.candidates[1].score > r.candidates[0].score * 0.85
    ) {
      expect(r.notes.some((n) => /Close call/.test(n))).toBe(true);
    }
  });

  it("severity multiplies a symptom's contribution to the score", () => {
    const low = engine.diagnose({
      symptoms: [{ variable: "Ra", direction: "up", severity: "low" }],
    });
    const high = engine.diagnose({
      symptoms: [{ variable: "Ra", direction: "up", severity: "high" }],
    });
    expect(high.top_candidate!.score).toBeGreaterThan(
      low.top_candidate!.score,
    );
  });

  it("recommended_change is consistent with symptom direction + polarity", () => {
    // Ra went UP and peak_current → Ra is positive ⇒ must LOWER peak_current.
    const r = engine.diagnose({
      symptoms: [{ variable: "Ra", direction: "up", severity: "high" }],
    });
    const pc = r.candidates.find((c) => c.variable === "peak_current");
    if (pc) {
      expect(pc.recommended_change).toBe("down");
    }
  });
});

describe("WEDMFaultDiagnosisEngine — validation + singleton", () => {
  it("throws on empty symptom list", () => {
    expect(() => engine.diagnose({ symptoms: [] })).toThrow(/symptoms required/);
  });

  it("throws on invalid symptom direction", () => {
    expect(() =>
      engine.diagnose({
        symptoms: [{ variable: "Ra", direction: "sideways" as unknown as "up" }],
      }),
    ).toThrow();
  });

  it("throws on empty variable name", () => {
    expect(() =>
      engine.diagnose({ symptoms: [{ variable: "", direction: "up" }] }),
    ).toThrow();
  });

  it("exposes a singleton for dispatcher use", () => {
    expect(wedmFaultDiagnosisEngine).toBeInstanceOf(WEDMFaultDiagnosisEngine);
  });
});
