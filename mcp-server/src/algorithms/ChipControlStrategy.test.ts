import { describe, it, expect } from "vitest";
import { pickStrategy, ChipControlStrategy, type ChipControlInput } from "./ChipControlStrategy.js";

describe("ChipControlStrategy", () => {
  it("M-stainless: feed_modulation strategy with ±15% amplitude", () => {
    const r = pickStrategy({ iso_group: "M", feed_mm_per_rev: 0.2, depth_of_cut_mm: 2, rpm: 1500 });
    expect(r.strategy).toBe("feed_modulation");
    expect(r.feed_modulation_amplitude_pct).toBe(15);
    expect(r.recommended_breaker_code).toBe("MR");
  });
  it("S-Inconel: feed_modulation strategy with ±25% amplitude", () => {
    const r = pickStrategy({ iso_group: "S", feed_mm_per_rev: 0.15, depth_of_cut_mm: 1, rpm: 800 });
    expect(r.strategy).toBe("feed_modulation");
    expect(r.feed_modulation_amplitude_pct).toBe(25);
  });
  it("H-hardened roughing: dwell_and_break (2 rev pause)", () => {
    const r = pickStrategy({ iso_group: "H", feed_mm_per_rev: 0.15, depth_of_cut_mm: 1, rpm: 1200 });
    expect(r.strategy).toBe("dwell_and_break");
    expect(r.dwell_period_sec).toBeCloseTo(60 / 1200 * 2, 4);
  });
  it("H-hardened finish: chip_breaker_geometry (no special motion)", () => {
    const r = pickStrategy({ iso_group: "H", feed_mm_per_rev: 0.05, depth_of_cut_mm: 0.2, rpm: 2000 });
    expect(r.strategy).toBe("chip_breaker_geometry");
  });
  it("K-cast-iron: interrupted_cut strategy", () => {
    const r = pickStrategy({ iso_group: "K", feed_mm_per_rev: 0.3, depth_of_cut_mm: 3, rpm: 600 });
    expect(r.strategy).toBe("interrupted_cut");
  });
  it("P-steel roughing: chip_breaker_geometry with PR code", () => {
    const r = pickStrategy({ iso_group: "P", feed_mm_per_rev: 0.3, depth_of_cut_mm: 2, rpm: 1500 });
    expect(r.strategy).toBe("chip_breaker_geometry");
    expect(r.recommended_breaker_code).toBe("PR");
  });
  it("P-steel finish: PF breaker code", () => {
    const r = pickStrategy({ iso_group: "P", feed_mm_per_rev: 0.08, depth_of_cut_mm: 0.3, rpm: 2500 });
    expect(r.recommended_breaker_code).toBe("PF");
  });
  it("N-aluminum: AL breaker for both rough and finish", () => {
    expect(pickStrategy({ iso_group: "N", feed_mm_per_rev: 0.3, depth_of_cut_mm: 2, rpm: 5000 }).recommended_breaker_code).toBe("AL");
    expect(pickStrategy({ iso_group: "N", feed_mm_per_rev: 0.05, depth_of_cut_mm: 0.3, rpm: 8000 }).recommended_breaker_code).toBe("AL");
  });
  it("invalid iso_group → diagnostic", () => {
    expect(pickStrategy({ iso_group: "ZZ" as ChipControlInput["iso_group"], feed_mm_per_rev: 0.2, depth_of_cut_mm: 1, rpm: 1000 }).notes.join("|")).toContain("unknown iso_group");
  });
  it("feed out of range diagnostic", () => {
    expect(pickStrategy({ iso_group: "P", feed_mm_per_rev: 0, depth_of_cut_mm: 1, rpm: 1000 }).notes.join("|")).toContain("outside");
    expect(pickStrategy({ iso_group: "P", feed_mm_per_rev: 3, depth_of_cut_mm: 1, rpm: 1000 }).notes.join("|")).toContain("outside");
  });
  it("RPM out of range diagnostic", () => {
    expect(pickStrategy({ iso_group: "P", feed_mm_per_rev: 0.2, depth_of_cut_mm: 1, rpm: 0 }).notes.join("|")).toContain("outside");
  });
  it("DOC out of range diagnostic", () => {
    expect(pickStrategy({ iso_group: "P", feed_mm_per_rev: 0.2, depth_of_cut_mm: 100, rpm: 1000 }).notes.join("|")).toContain("outside");
  });
  it("NaN feed diagnostic", () => {
    expect(pickStrategy({ iso_group: "P", feed_mm_per_rev: NaN, depth_of_cut_mm: 1, rpm: 1000 }).notes.join("|")).toContain("outside");
  });
  it("missing input diagnostic", () => {
    expect(pickStrategy(null as unknown as ChipControlInput).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(ChipControlStrategy.version).toBe("1.0.0");
  });
});
