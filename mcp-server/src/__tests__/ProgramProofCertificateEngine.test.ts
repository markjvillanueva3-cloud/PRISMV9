/**
 * Tests for ProgramProofCertificateEngine — PROGRAM-PROOF-MS0 / U-PP03.
 * Round-trip E2E through U-PP01 catalog + U-PP02 interval predicates.
 * Real algebraic invariants only — no toBeDefined or toBeTruthy stubs.
 */
import { describe, it, expect } from "vitest";
import { ProgramProofCertificateEngine, type ProgramPoint } from "../engines/ProgramProofCertificateEngine.js";

const eng = new ProgramProofCertificateEngine();

describe("ProgramProofCertificateEngine.certify — happy path", () => {
  it("safe program inside Hurco VM30i envelope → verdict=safe + no witnesses", () => {
    const points: ProgramPoint[] = [
      { x: 0, y: 0, z: -10 },
      { x: 50, y: 50, z: -20 },
      { x: -100, y: -50, z: -100 },
    ];
    const cert = eng.certify("VMC-01", points);
    expect(cert.verdict).toBe("safe");
    expect(cert.witnesses.length).toBe(0);
    expect(cert.program_point_count).toBe(3);
    expect(cert.machine_id).toBe("VMC-01");
  });
  it("program hash is deterministic + 16-char hex", () => {
    const points: ProgramPoint[] = [{ x: 0, y: 0, z: -10 }];
    const a = eng.certify("VMC-01", points);
    const b = eng.certify("VMC-01", points);
    expect(a.program_hash).toBe(b.program_hash);
    expect(a.program_hash).toMatch(/^[0-9a-f]{16}$/);
  });
  it("different programs produce different hashes", () => {
    const a = eng.certify("VMC-01", [{ x: 0, y: 0, z: -10 }]);
    const b = eng.certify("VMC-01", [{ x: 1, y: 0, z: -10 }]);
    expect(a.program_hash).not.toBe(b.program_hash);
  });
  it("formatHeader produces the canonical // PRISM-PROOF: comment", () => {
    const cert = eng.certify("VMC-01", [{ x: 0, y: 0, z: -10 }]);
    const header = eng.formatHeader(cert);
    expect(header).toMatch(/^\/\/ PRISM-PROOF: [0-9a-f]{16}/);
    expect(header).toMatch(/verdict=safe/);
    expect(header).toMatch(/machine=VMC-01/);
  });
});

describe("ProgramProofCertificateEngine.certify — failure modes", () => {
  it("travel-limit overshoot → verdict=unsafe + witness names the axis + point", () => {
    const points: ProgramPoint[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10000, y: 0, z: -10 }, // X way out
    ];
    const cert = eng.certify("VMC-01", points);
    expect(cert.verdict).toBe("unsafe");
    expect(cert.witnesses.length).toBeGreaterThanOrEqual(1);
    const matching = cert.witnesses.filter((x) => x.check === "travel_x");
    expect(matching.length).toBeGreaterThanOrEqual(1);
    expect(matching[0].point_index).toBe(1);
    expect(matching[0].reason).toMatch(/X=10000 outside/);
  });
  it("unknown machine → verdict=unsafe with envelope_lookup witness", () => {
    const cert = eng.certify("BOGUS-99", [{ x: 0, y: 0, z: 0 }]);
    expect(cert.verdict).toBe("unsafe");
    expect(cert.witnesses.length).toBe(1);
    expect(cert.witnesses[0].check).toBe("envelope_lookup");
    expect(cert.witnesses[0].reason).toMatch(/not in JM Die catalog/);
  });
  it("empty program → verdict=safe (vacuous) + zero point count", () => {
    const cert = eng.certify("VMC-01", []);
    expect(cert.verdict).toBe("safe");
    expect(cert.program_point_count).toBe(0);
  });
  it("boundary point exactly at travel limit → inconclusive (interval straddles boundary)", () => {
    const cert = eng.certify("VMC-01", [{ x: 0, y: 0, z: 0, uncertainty_um: 25 }]);
    expect(cert.verdict).toBe("inconclusive");
    expect(cert.inconclusive_count).toBeGreaterThanOrEqual(1);
  });
});

describe("ProgramProofCertificateEngine.certify — adversarial inputs", () => {
  it("NaN coords flagged via interval-arithmetic predicates (no silent pass)", () => {
    const cert = eng.certify("VMC-01", [{ x: NaN, y: 0, z: 0 }]);
    expect(cert.verdict).not.toBe("safe");
  });
  it("oversized coords (1e15) → unsafe with travel witness", () => {
    const cert = eng.certify("VMC-01", [{ x: 1e15, y: 0, z: 0 }]);
    expect(cert.verdict).toBe("unsafe");
    expect(cert.witnesses.length).toBeGreaterThanOrEqual(1);
  });
  it("very long program (1000 safe points) certifies under 500ms", () => {
    const points: ProgramPoint[] = Array.from({ length: 1000 }, (_, i) => ({
      x: (i % 200) - 100, y: 0, z: -10,
    }));
    const t0 = Date.now();
    const cert = eng.certify("VMC-01", points);
    const elapsed = Date.now() - t0;
    expect(cert.verdict).toBe("safe");
    expect(elapsed).toBeLessThan(500);
  });
});

describe("ProgramProofCertificateEngine.certify — variability (3 spanning machine classes)", () => {
  it("lathe (LTH-01) — point inside lathe envelope", () => {
    const cert = eng.certify("LTH-01", [{ x: 0, y: 0, z: -100 }]);
    expect(cert.verdict).toBe("safe");
  });
  it("mill (VMC-01) — point inside mill envelope", () => {
    const cert = eng.certify("VMC-01", [{ x: 0, y: 0, z: -10 }]);
    expect(cert.verdict).toBe("safe");
  });
  it("wire EDM (WEDM-01) — point inside wire-EDM envelope", () => {
    const cert = eng.certify("WEDM-01", [{ x: 0, y: 0, z: -50 }]);
    expect(cert.verdict).toBe("safe");
  });
});

describe("ProgramProofCertificateEngine — margins reporting", () => {
  it("margins are reported in µm and reflect closest-approach", () => {
    // VMC-01 envelope X = [-400, 400]. Point at X=200 → margin = min(200-(-400), 400-200) = 200mm = 200000µm
    const cert = eng.certify("VMC-01", [{ x: 200, y: 0, z: -10 }]);
    expect(cert.margins_by_check.travel_x_min_margin_um).toBeCloseTo(200000, 0);
  });
});
