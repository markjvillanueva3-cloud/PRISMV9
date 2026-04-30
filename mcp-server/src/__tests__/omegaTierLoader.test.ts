/**
 * omegaTierLoader.test.ts — covers loadOmegaTiers + getTierForOmega.
 *
 * Verifies:
 * - loads from valid JSON file
 * - falls back gracefully when file missing
 * - falls back gracefully when JSON malformed
 * - falls back gracefully when tiers key missing
 * - falls back gracefully when a single tier has invalid threshold (NaN, >1, <0, missing field)
 * - getTierForOmega returns highest passing tier, or null when none pass
 * - cache works (second call without forceReload returns same object)
 * - forceReload bypasses cache
 */
import { describe, it, expect, beforeEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadOmegaTiers,
  getTierForOmega,
  _resetOmegaTierCache,
} from "../tools/dispatchers/omegaDispatcher.js";

const TMP_DIR = join(tmpdir(), "prism-omega-tier-tests");
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
const tmp = (name: string) => join(TMP_DIR, name);

const VALID_JSON = JSON.stringify({
  schemaVersion: "1.0.0",
  tiers: {
    shop_floor: { omega_min: 0.95, safety_min: 0.98 },
    production: { omega_min: 0.90, safety_min: 0.95 },
    proven_out: { omega_min: 0.85, safety_min: 0.90 },
    sim:        { omega_min: 0.50, safety_min: 0.70 },
  },
});

describe("loadOmegaTiers", () => {
  beforeEach(() => { _resetOmegaTierCache(); });

  it("loads valid JSON file and reports source=json", () => {
    const path = tmp("valid.json");
    writeFileSync(path, VALID_JSON, "utf8");
    const ladder = loadOmegaTiers(true, path);
    expect(ladder.source).toBe("json");
    expect(ladder.shop_floor.omega_min).toBe(0.95);
    expect(ladder.shop_floor.safety_min).toBe(0.98);
    expect(ladder.sim.omega_min).toBe(0.50);
    unlinkSync(path);
  });

  it("falls back when file missing", () => {
    const ladder = loadOmegaTiers(true, tmp("does-not-exist.json"));
    expect(ladder.source).toBe("fallback");
    expect(ladder.shop_floor.omega_min).toBe(0.95);
  });

  it("falls back when JSON is malformed", () => {
    const path = tmp("malformed.json");
    writeFileSync(path, "{ this is not json", "utf8");
    const ladder = loadOmegaTiers(true, path);
    expect(ladder.source).toBe("fallback");
    unlinkSync(path);
  });

  it("falls back when tiers key is missing", () => {
    const path = tmp("no-tiers.json");
    writeFileSync(path, JSON.stringify({ schemaVersion: "1.0.0" }), "utf8");
    const ladder = loadOmegaTiers(true, path);
    expect(ladder.source).toBe("fallback");
    unlinkSync(path);
  });

  it("falls back when a tier has out-of-range threshold", () => {
    const path = tmp("out-of-range.json");
    writeFileSync(path, JSON.stringify({
      tiers: {
        shop_floor: { omega_min: 1.5, safety_min: 0.98 }, // > 1 invalid
        production: { omega_min: 0.90, safety_min: 0.95 },
        proven_out: { omega_min: 0.85, safety_min: 0.90 },
        sim:        { omega_min: 0.50, safety_min: 0.70 },
      },
    }), "utf8");
    const ladder = loadOmegaTiers(true, path);
    expect(ladder.source).toBe("fallback");
    unlinkSync(path);
  });

  it("falls back when a tier is missing a field", () => {
    const path = tmp("missing-field.json");
    writeFileSync(path, JSON.stringify({
      tiers: {
        shop_floor: { omega_min: 0.95 }, // missing safety_min
        production: { omega_min: 0.90, safety_min: 0.95 },
        proven_out: { omega_min: 0.85, safety_min: 0.90 },
        sim:        { omega_min: 0.50, safety_min: 0.70 },
      },
    }), "utf8");
    const ladder = loadOmegaTiers(true, path);
    expect(ladder.source).toBe("fallback");
    unlinkSync(path);
  });

  it("caches result across calls without forceReload", () => {
    const path = tmp("cache.json");
    writeFileSync(path, VALID_JSON, "utf8");
    const first = loadOmegaTiers(true, path);
    // Mutate the file; without forceReload, cache should still return first version
    writeFileSync(path, JSON.stringify({ tiers: { shop_floor: { omega_min: 0.5, safety_min: 0.5 }, production: { omega_min: 0.5, safety_min: 0.5 }, proven_out: { omega_min: 0.5, safety_min: 0.5 }, sim: { omega_min: 0.5, safety_min: 0.5 } } }), "utf8");
    const second = loadOmegaTiers(false, path);
    expect(second).toBe(first); // identity (cache hit)
    expect(second.shop_floor.omega_min).toBe(0.95); // not 0.5 — cached
    unlinkSync(path);
  });

  it("forceReload bypasses cache", () => {
    const path = tmp("force.json");
    writeFileSync(path, VALID_JSON, "utf8");
    loadOmegaTiers(true, path);
    writeFileSync(path, JSON.stringify({ tiers: { shop_floor: { omega_min: 0.99, safety_min: 0.99 }, production: { omega_min: 0.90, safety_min: 0.95 }, proven_out: { omega_min: 0.85, safety_min: 0.90 }, sim: { omega_min: 0.50, safety_min: 0.70 } } }), "utf8");
    const reloaded = loadOmegaTiers(true, path);
    expect(reloaded.shop_floor.omega_min).toBe(0.99);
    unlinkSync(path);
  });
});

describe("getTierForOmega", () => {
  beforeEach(() => { _resetOmegaTierCache(); });

  it("returns shop_floor when both Ω and S meet five-sigma", () => {
    expect(getTierForOmega(0.96, 0.99)).toBe("shop_floor");
  });

  it("returns production when Ω meets four-sigma but not five", () => {
    expect(getTierForOmega(0.91, 0.96)).toBe("production");
  });

  it("returns proven_out when below production but above proven gates", () => {
    expect(getTierForOmega(0.86, 0.91)).toBe("proven_out");
  });

  it("returns sim when at minimum safety", () => {
    expect(getTierForOmega(0.55, 0.71)).toBe("sim");
  });

  it("returns null when safety is below sim minimum (BLOCKED zone)", () => {
    expect(getTierForOmega(0.99, 0.65)).toBeNull();
  });

  it("returns null when omega is below sim minimum", () => {
    expect(getTierForOmega(0.40, 0.99)).toBeNull();
  });

  it("returns sim (not higher) when omega high but safety only meets sim", () => {
    expect(getTierForOmega(0.99, 0.71)).toBe("sim");
  });

  it("handles edge case of exact threshold values (>= boundary)", () => {
    expect(getTierForOmega(0.95, 0.98)).toBe("shop_floor"); // exact shop_floor threshold
    expect(getTierForOmega(0.50, 0.70)).toBe("sim");        // exact sim threshold
  });

  it("handles NaN inputs by returning null (NaN >= anything is false)", () => {
    expect(getTierForOmega(Number.NaN, 0.99)).toBeNull();
    expect(getTierForOmega(0.99, Number.NaN)).toBeNull();
  });

  it("handles Infinity inputs by returning shop_floor (Infinity >= anything is true)", () => {
    expect(getTierForOmega(Infinity, Infinity)).toBe("shop_floor");
  });

  it("handles negative inputs by returning null", () => {
    expect(getTierForOmega(-0.5, 0.99)).toBeNull();
    expect(getTierForOmega(0.99, -0.5)).toBeNull();
  });

  it("loadOmegaTiers falls back when JSON has NaN/Infinity threshold values", () => {
    const path = join(tmpdir(), "prism-omega-tier-tests", "nan.json");
    writeFileSync(path, '{"tiers":{"shop_floor":{"omega_min":null,"safety_min":0.98},"production":{"omega_min":0.90,"safety_min":0.95},"proven_out":{"omega_min":0.85,"safety_min":0.90},"sim":{"omega_min":0.50,"safety_min":0.70}}}', "utf8");
    _resetOmegaTierCache();
    const ladder = loadOmegaTiers(true, path);
    expect(ladder.source).toBe("fallback");
    unlinkSync(path);
  });
});
