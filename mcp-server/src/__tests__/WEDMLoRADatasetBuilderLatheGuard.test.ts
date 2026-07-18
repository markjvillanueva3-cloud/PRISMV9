/**
 * WEDMLoRADatasetBuilder — lathe-contamination guard (looksLikeLatheNotWire).
 *
 * Regression test for the 2026-05-31 finding: the JM Die WIRE EDM archive
 * contains misfiled Okuma LATHE programs (`.min` = Okuma turning extension;
 * "Okuma doesn't make wire EDM"). Without the guard, the wire LoRA dataset
 * builder ingested turning programs as wire training data (domain mismatch).
 * These assertions encode INTENT: turning content is rejected, genuine wire
 * content is kept, and the wire-first ordering prevents false-rejects.
 */
import { describe, it, expect } from "vitest";
import { looksLikeLatheNotWire } from "../engines/WEDMLoRADatasetBuilderEngine.js";

describe("looksLikeLatheNotWire — wire/lathe domain guard", () => {
  it("REJECTS an Okuma lathe program (G96 CSS + 6-digit T-code, no wire signal)", () => {
    const okumaLathe = [
      "(A-11-10583 ACME LATHE)",
      "G50 S2500",
      "G96 S180 M3",
      "T010101",
      "G0 X1.25 Z0.1",
      "G71 P10 Q20 U0.01 W0.005 D500 F0.012",
      "M30",
    ].join("\n");
    expect(looksLikeLatheNotWire(okumaLathe)).toBe(true);
  });

  it("KEEPS a genuine FA-10S wire program (E-code present)", () => {
    const wire = [
      "(ITW SHAKEPROOF WIRE EDM)",
      "G92 X0. Y0.",
      "E1230",
      "C001",
      "G01 X5.0",
      "M30",
    ].join("\n");
    expect(looksLikeLatheNotWire(wire)).toBe(false);
  });

  it("KEEPS a wire program identified only by vendor name (Mitsubishi)", () => {
    const wire = "(MITSUBISHI FA-10S)\nG90 G92 X0 Y0\nM98 P0001\nM30";
    expect(looksLikeLatheNotWire(wire)).toBe(false);
  });

  it("KEEPS a generic XY contour skeleton (no wire AND no lathe markers)", () => {
    // The real "Wire Program - 5 inch square.NC" — a posted XY square, no
    // discharge content but NOT lathe either; must not be falsely rejected.
    const skeleton = "SQUARE PROGRAM\nG0 G54 X0. Y0.\nG1 X5.0\nG01 Y-5.0\nG01 X0.\nM30";
    expect(looksLikeLatheNotWire(skeleton)).toBe(false);
  });

  it("wire signal WINS over a turning token (ordering: E-code present => keep even if G96 appears)", () => {
    const mixed = "E1230\nG96 S100\nT010101"; // pathological, but E-code must dominate
    expect(looksLikeLatheNotWire(mixed)).toBe(false);
  });

  it("REJECTS an Okuma lathe file misNAMED 'WIRE...' (turning content, no 'WIRE EDM' phrase)", () => {
    // The CNC LATHE/Okuma WIRE140-165A.nc class: named 'WIRE' (= wire stock) but
    // is a turning program. Bare 'WIRE' must NOT count as a wire-EDM signal.
    const latheNamedWire = "(WIRE140-165A)\nG96 S200 M3\nT030303\nX2.0 Z0.5\nM30";
    expect(looksLikeLatheNotWire(latheNamedWire)).toBe(true);
  });

  it("handles empty / null / undefined without throwing (=> not lathe)", () => {
    expect(looksLikeLatheNotWire("")).toBe(false);
    // @ts-expect-error — exercise the runtime null-guard
    expect(looksLikeLatheNotWire(null)).toBe(false);
    // @ts-expect-error — exercise the runtime undefined-guard
    expect(looksLikeLatheNotWire(undefined)).toBe(false);
  });

  it("does not reject a plain wire taper program (G51 taper-UV signal keeps it)", () => {
    const taper = "(NOZE TEST)\nG51\nG01 X1.0 Y1.0\nM30"; // taper setup, no lathe markers
    expect(looksLikeLatheNotWire(taper)).toBe(false);
  });
});
