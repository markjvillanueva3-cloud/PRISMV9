/**
 * WEDMMaterialSparkDatabaseEngine Tests — WEDM AGI Phase 1 / U-P1-10
 *
 * Exit gate: covers all JM Die materials (D2, A2, M2, S7, H13, WC, graphite).
 */
import { describe, it, expect } from "vitest";
import {
  WEDMMaterialSparkDatabaseEngine,
  wedmMaterialSparkDatabaseEngine,
  JM_DIE_MATERIALS,
  REFERENCE_IE_A,
  REFERENCE_TE_US,
  type WEDMMaterialKey,
} from "../../engines/WEDMMaterialSparkDatabaseEngine.js";

const engine = new WEDMMaterialSparkDatabaseEngine();

describe("WEDMMaterialSparkDatabaseEngine — coverage + lookup", () => {
  it("covers every JM Die canonical material (P1-MS3 exit gate)", () => {
    expect(engine.coversJMDiePortfolio()).toBe(true);
    for (const key of JM_DIE_MATERIALS) {
      const sig = engine.get(key);
      expect(sig.key).toBe(key);
      expect(sig.klocke_C).toBeGreaterThan(0);
      expect(sig.klocke_k).toBeGreaterThan(0);
    }
  });

  it("lists at least 12 materials (JM Die set + common extras)", () => {
    const all = engine.list();
    expect(all.length).toBeGreaterThanOrEqual(12);
  });

  it("resolves canonical keys case-insensitively", () => {
    expect(engine.resolve("D2")!.key).toBe("D2");
    expect(engine.resolve("d2")!.key).toBe("D2");
    expect(engine.resolve("GRAPHITE")!.key).toBe("graphite");
  });

  it("resolves common aliases", () => {
    expect(engine.resolve("aisi_d2")!.key).toBe("D2");
    expect(engine.resolve("1.2379")!.key).toBe("D2"); // DIN equivalent
    expect(engine.resolve("poco")!.key).toBe("graphite");
    expect(engine.resolve("carbide")!.key).toBe("WC");
    expect(engine.resolve("copper")!.key).toBe("Cu_C110");
  });

  it("returns null for an unknown key/alias", () => {
    expect(engine.resolve("unobtainium")).toBeNull();
    expect(engine.resolve("")).toBeNull();
  });

  it("throws on strict get() with a bad key", () => {
    expect(() => engine.get("unobtainium" as WEDMMaterialKey)).toThrow(
      /Unknown/,
    );
  });
});

describe("WEDMMaterialSparkDatabaseEngine — Klocke Ra prediction", () => {
  it("predicts positive Ra at the reference discharge energy", () => {
    const ra = engine.predictRaUm("D2", REFERENCE_IE_A, REFERENCE_TE_US);
    expect(ra).toBeGreaterThan(0);
    // Reference: D2 at (8A, 10µs) → C·sqrt(80) ≈ 0.28·8.944 ≈ 2.50 µm
    expect(ra).toBeCloseTo(0.28 * Math.sqrt(80), 5);
  });

  it("scales Ra with discharge energy per Klocke C·(ie·te)^k", () => {
    const ra_low = engine.predictRaUm("D2", 4, 10);
    const ra_ref = engine.predictRaUm("D2", 8, 10);
    const ra_high = engine.predictRaUm("D2", 16, 10);
    expect(ra_low).toBeLessThan(ra_ref);
    expect(ra_ref).toBeLessThan(ra_high);
    // k ≈ 0.5 ⇒ doubling energy scales Ra by √2.
    expect(ra_high / ra_ref).toBeCloseTo(Math.sqrt(2), 2);
  });

  it("produces distinct Ra curves per material at identical energy", () => {
    const ra_d2 = engine.predictRaUm("D2", REFERENCE_IE_A, REFERENCE_TE_US);
    const ra_wc = engine.predictRaUm("WC", REFERENCE_IE_A, REFERENCE_TE_US);
    const ra_gr = engine.predictRaUm("graphite", REFERENCE_IE_A, REFERENCE_TE_US);
    expect(ra_d2).not.toBeCloseTo(ra_wc, 1);
    expect(ra_d2).not.toBeCloseTo(ra_gr, 1);
  });
});

describe("WEDMMaterialSparkDatabaseEngine — signature distance", () => {
  it("returns zero distance for a perfect match against the reference regime", () => {
    const sig = engine.get("D2");
    const ra_pred = engine.predictRaUm("D2", sig.peak_current_nominal_A, sig.pulse_on_nominal_us);
    const d = engine.distance("D2", {
      peak_current_A: sig.peak_current_nominal_A,
      pulse_on_us: sig.pulse_on_nominal_us,
      measured_Ra_um: ra_pred,
      gap_voltage_V: sig.gap_voltage_nominal_V,
      mrr_relative: sig.mrr_factor,
    });
    expect(d).toBeCloseTo(0, 5);
  });

  it("grows with Ra deviation", () => {
    const sig = engine.get("D2");
    const pred = engine.predictRaUm("D2", sig.peak_current_nominal_A, sig.pulse_on_nominal_us);
    const dNear = engine.distance("D2", {
      peak_current_A: sig.peak_current_nominal_A,
      pulse_on_us: sig.pulse_on_nominal_us,
      measured_Ra_um: pred * 1.1,
    });
    const dFar = engine.distance("D2", {
      peak_current_A: sig.peak_current_nominal_A,
      pulse_on_us: sig.pulse_on_nominal_us,
      measured_Ra_um: pred * 3,
    });
    expect(dFar).toBeGreaterThan(dNear);
  });
});

describe("WEDMMaterialSparkDatabaseEngine — OOD detection", () => {
  it("classifies in-distribution when the observation matches D2", () => {
    const sig = engine.get("D2");
    const pred = engine.predictRaUm("D2", sig.peak_current_nominal_A, sig.pulse_on_nominal_us);
    const r = engine.detectOOD({
      peak_current_A: sig.peak_current_nominal_A,
      pulse_on_us: sig.pulse_on_nominal_us,
      measured_Ra_um: pred,
      gap_voltage_V: sig.gap_voltage_nominal_V,
      mrr_relative: sig.mrr_factor,
    });
    expect(r.is_ood).toBe(false);
    expect(r.closest).toBe("D2");
    expect(r.min_distance).toBeLessThan(0.01);
  });

  it("flags a wildly anomalous observation as OOD", () => {
    // Ra 10x the largest predicted Ra, at an off-nominal voltage.
    const r = engine.detectOOD({
      peak_current_A: 8,
      pulse_on_us: 10,
      measured_Ra_um: 50,
      gap_voltage_V: 200,
      mrr_relative: 10,
    });
    expect(r.is_ood).toBe(true);
    expect(r.min_distance).toBeGreaterThan(1);
  });

  it("respects a tighter OOD threshold", () => {
    const sig = engine.get("M2");
    const pred = engine.predictRaUm("M2", sig.peak_current_nominal_A, sig.pulse_on_nominal_us);
    // Slightly off Ra — within default threshold, but outside 0.05.
    const obs = {
      peak_current_A: sig.peak_current_nominal_A,
      pulse_on_us: sig.pulse_on_nominal_us,
      measured_Ra_um: pred * 1.2,
    };
    expect(engine.detectOOD(obs, 1.0).is_ood).toBe(false);
    expect(engine.detectOOD(obs, 0.05).is_ood).toBe(true);
  });
});

describe("WEDMMaterialSparkDatabaseEngine — singleton + sanity", () => {
  it("exposes a singleton instance", () => {
    expect(wedmMaterialSparkDatabaseEngine).toBeInstanceOf(
      WEDMMaterialSparkDatabaseEngine,
    );
  });

  it("every signature carries non-empty advisory metadata", () => {
    for (const sig of engine.list()) {
      expect(sig.display_name.length).toBeGreaterThan(0);
      expect(Array.isArray(sig.aliases)).toBe(true);
      expect(sig.debris_colour.length).toBeGreaterThan(0);
      expect(sig.gap_voltage_nominal_V).toBeGreaterThan(0);
      expect(sig.peak_current_nominal_A).toBeGreaterThan(0);
      expect(sig.pulse_on_nominal_us).toBeGreaterThan(0);
    }
  });
});
