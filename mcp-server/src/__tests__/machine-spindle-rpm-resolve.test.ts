/**
 * machine-spindle-rpm-resolve.test.ts (U-MACHDB-08, slot:oscar 2026-06-27)
 *
 * Real-behavior coverage for resolveMaxRpm / resolveMinRpm -- the single-source spindle-RPM resolvers over
 * the heterogeneous 1015-machine registry schema (RPM lives under max_rpm | rpm_max | maxRpm | rpm | ratedRpm
 * | max_speed; min under min_rpm | rpm_min | minRpm). These are the RPM sibling of resolveSpindlePowerKw: a
 * consumer that reads only the canonical spindle.max_rpm silently sees NO limit for a variant-keyed machine,
 * and for the SFC over-speed CLAMP that is under-protection (the dangerous direction). Assertions are concrete
 * reference values + union-precedence + a graceful skip-the-bad-key case + the normalizeMachine single-source
 * round-trip with provenance -- they encode WHY: every variant key must reach the canonical RPM, the FIRST
 * present key wins, a non-finite value must be skipped (never fabricated), and the matched raw key is recorded.
 */
import { describe, it, expect } from "vitest";
import { resolveMaxRpm, resolveMinRpm, normalizeMachine } from "../registries/machine-normalizer.js";

describe("resolveMaxRpm -- heterogeneous max-spindle-RPM key union", () => {
  it("reads the canonical max_rpm key", () => {
    expect(resolveMaxRpm({ max_rpm: 12000 })).toEqual({ value: 12000, src: "max_rpm" });
  });

  it("reads ratedRpm -- the variant key single-key readers silently dropped (over-speed clamp was absent)", () => {
    expect(resolveMaxRpm({ ratedRpm: 8000 })).toEqual({ value: 8000, src: "ratedRpm" });
  });

  it("reads max_speed (a 24k-rpm HSM spindle keyed under max_speed)", () => {
    expect(resolveMaxRpm({ max_speed: 24000 })).toEqual({ value: 24000, src: "max_speed" });
  });

  it("reads rpm_max and maxRpm and bare rpm variants", () => {
    expect(resolveMaxRpm({ rpm_max: 15000 })).toEqual({ value: 15000, src: "rpm_max" });
    expect(resolveMaxRpm({ maxRpm: 10000 })).toEqual({ value: 10000, src: "maxRpm" });
    expect(resolveMaxRpm({ rpm: 6000 })).toEqual({ value: 6000, src: "rpm" });
  });

  it("honors union precedence -- the FIRST present key wins (max_rpm over ratedRpm)", () => {
    expect(resolveMaxRpm({ max_rpm: 12000, ratedRpm: 8000 })).toEqual({ value: 12000, src: "max_rpm" });
    expect(resolveMaxRpm({ rpm_max: 15000, maxRpm: 10000 })).toEqual({ value: 15000, src: "rpm_max" });
  });

  it("coerces a numeric string (parseFloat)", () => {
    expect(resolveMaxRpm({ max_rpm: "18000" })).toEqual({ value: 18000, src: "max_rpm" });
  });

  it("returns {} (no value) when no RPM key is present -- never fabricates a limit (R12)", () => {
    expect(resolveMaxRpm({})).toEqual({});
    expect(resolveMaxRpm({ torque_nm: 90 })).toEqual({});
  });

  it("returns {} for null / undefined spindle (deepGet null-safe)", () => {
    expect(resolveMaxRpm(null)).toEqual({});
    expect(resolveMaxRpm(undefined)).toEqual({});
  });

  it("SKIPS a non-finite first key and falls through to the next valid variant (NaN -> ratedRpm)", () => {
    expect(resolveMaxRpm({ max_rpm: NaN, ratedRpm: 9000 })).toEqual({ value: 9000, src: "ratedRpm" });
  });

  it("rejects NaN / Infinity / non-numeric strings (Number.isFinite gate)", () => {
    expect(resolveMaxRpm({ max_rpm: NaN })).toEqual({});
    expect(resolveMaxRpm({ max_rpm: Infinity })).toEqual({});
    expect(resolveMaxRpm({ max_rpm: "fast" })).toEqual({});
  });
});

describe("resolveMinRpm -- heterogeneous min-spindle-RPM key union", () => {
  it("reads the canonical min_rpm key", () => {
    expect(resolveMinRpm({ min_rpm: 100 })).toEqual({ value: 100, src: "min_rpm" });
  });

  it("reads rpm_min and minRpm variants", () => {
    expect(resolveMinRpm({ rpm_min: 50 })).toEqual({ value: 50, src: "rpm_min" });
    expect(resolveMinRpm({ minRpm: 200 })).toEqual({ value: 200, src: "minRpm" });
  });

  it("honors union precedence (min_rpm over minRpm)", () => {
    expect(resolveMinRpm({ min_rpm: 100, minRpm: 200 })).toEqual({ value: 100, src: "min_rpm" });
  });

  it("returns {} when no min key is present (caller owns the floor default)", () => {
    expect(resolveMinRpm({})).toEqual({});
  });
});

describe("normalizeMachine -- single-source RPM contract (variant key reaches the canonical shape + provenance)", () => {
  it("resolves a ratedRpm-keyed machine to canonical spindle.max_rpm with provenance", () => {
    const m = normalizeMachine({ id: "m1", spindle: { ratedRpm: 8000 } });
    expect(m.spindle.max_rpm).toBe(8000);
    expect(m._provenance["spindle.max_rpm"]).toBe("spindle.ratedRpm");
  });

  it("resolves a max_speed-keyed machine to canonical spindle.max_rpm", () => {
    expect(normalizeMachine({ id: "m2", spindle: { max_speed: 24000 } }).spindle.max_rpm).toBe(24000);
  });

  it("resolves a minRpm-keyed machine to canonical spindle.min_rpm", () => {
    expect(normalizeMachine({ id: "m3", spindle: { minRpm: 150 } }).spindle.min_rpm).toBe(150);
  });

  it("flags high_speed_machining via the resolved variant RPM (>=15000 derives the capability)", () => {
    // proves the resolved RPM (not just the canonical key) feeds the downstream capability derivation
    expect(normalizeMachine({ id: "m4", spindle: { ratedRpm: 24000 } }).capabilities.high_speed_machining).toBe(true);
  });
});
