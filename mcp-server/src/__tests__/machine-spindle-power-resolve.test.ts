/**
 * machine-spindle-power-resolve.test.ts (U-MACHDB-06, slot:oscar 2026-06-27)
 *
 * Exhaustive R9 coverage for resolveSpindlePowerKw -- the single-source canonical resolver of the
 * 1015-machine registry's heterogeneous spindle-power schema (extracted from machine-normalizer's inline
 * union so every machine-capability consumer reads power through one place instead of N forks). Asserts:
 * every variant key resolves, hp->kW conversion uses real reference values, the union order is honored,
 * and missing/adversarial inputs return an empty object (never a fabricated default -- R12, the caller
 * owns the fallback). These tests FAIL if the union loses a key, the hp factor regresses, or the resolver
 * starts fabricating a value -- i.e. they encode WHY the resolver exists, not just that it returns a number.
 */
import { describe, it, expect } from "vitest";
import { resolveSpindlePowerKw, normalizeMachine } from "../registries/machine-normalizer.js";

describe("resolveSpindlePowerKw -- canonical 8-key spindle-power union (U-MACHDB-06)", () => {
  // ---- happy: every canonical kW-valued key resolves to its own value ----
  it("resolves power_continuous (the primary canonical key)", () => {
    const r = resolveSpindlePowerKw({ power_continuous: 22.4 });
    expect(r.value).toBe(22.4);
    expect(r.src).toBe("power_continuous");
  });

  it("resolves the power_kW variant -- the key that silently dropped to a default before U-MACHDB", () => {
    const r = resolveSpindlePowerKw({ power_kW: 18.5 });
    expect(r.value).toBe(18.5);
    expect(r.src).toBe("power_kW");
  });

  it("resolves lowercase power_kw, power_rating, power, and continuousPower variants", () => {
    expect(resolveSpindlePowerKw({ power_kw: 11 }).value).toBe(11);
    expect(resolveSpindlePowerKw({ power_rating: 30 }).value).toBe(30);
    expect(resolveSpindlePowerKw({ power: 7.5 }).value).toBe(7.5);
    expect(resolveSpindlePowerKw({ continuousPower: 26 }).value).toBe(26);
  });

  // ---- hp conversion: independent reference values (NOT the code's own constant) ----
  it("converts continuousHp -> kW: 40 hp = 29.828 kW", () => {
    const r = resolveSpindlePowerKw({ continuousHp: 40 });
    expect(r.value).toBeCloseTo(29.828, 3); // 40 * 0.7457
    expect(r.src).toContain("continuousHp");
  });

  it("converts power_hp -> kW: 10 hp = 7.457 kW", () => {
    expect(resolveSpindlePowerKw({ power_hp: 10 }).value).toBeCloseTo(7.457, 3);
  });

  // ---- union order: first defined key wins (a machine carrying several keys is deterministic) ----
  it("prefers power_continuous over later variant keys when multiple are present", () => {
    const r = resolveSpindlePowerKw({ power_continuous: 20, power_kW: 99, continuousHp: 5 });
    expect(r.value).toBe(20);
    expect(r.src).toBe("power_continuous");
  });

  // ---- failure modes (>=3): no key, null/undefined, empty ----
  it("returns no value when NO power key is present -- never fabricates a default (R12)", () => {
    const r = resolveSpindlePowerKw({ taper: "CAT40", max_rpm: 12000 });
    expect(r.value).toBeUndefined();
    expect(r.src).toBeUndefined();
  });

  it("returns no value for null or undefined spindle (no crash)", () => {
    expect(resolveSpindlePowerKw(null).value).toBeUndefined();
    expect(resolveSpindlePowerKw(undefined).value).toBeUndefined();
  });

  it("returns no value for an empty object", () => {
    expect(resolveSpindlePowerKw({}).value).toBeUndefined();
  });

  // ---- adversarial (>=2): non-finite numbers, non-numeric strings, fall-through ----
  it("rejects NaN / Infinity / -Infinity power (non-finite is not a valid power)", () => {
    expect(resolveSpindlePowerKw({ power_continuous: NaN }).value).toBeUndefined();
    expect(resolveSpindlePowerKw({ power_continuous: Infinity }).value).toBeUndefined();
    expect(resolveSpindlePowerKw({ power_continuous: -Infinity }).value).toBeUndefined();
  });

  it("coerces a numeric-string power (\"15\" -> 15) but rejects a non-numeric string", () => {
    expect(resolveSpindlePowerKw({ power_continuous: "15" }).value).toBe(15);
    expect(resolveSpindlePowerKw({ power_continuous: "abc" }).value).toBeUndefined();
  });

  it("falls through a non-finite primary key to the next valid variant", () => {
    const r = resolveSpindlePowerKw({ power_continuous: NaN, power_kW: 12 });
    expect(r.value).toBe(12);
    expect(r.src).toBe("power_kW");
  });

  // ---- single-source contract: normalizeMachine resolves power through the SAME helper ----
  it("normalizeMachine resolves spindle.power_kw through this helper (variant key reaches the canonical shape)", () => {
    const nm = normalizeMachine({ id: "var_pwr", spindle: { power_kW: 18.5, max_rpm: 12000 } });
    expect(nm.spindle.power_kw).toBe(18.5); // would be undefined if normalizeMachine read power_continuous only
    expect(nm._provenance["spindle.power_kw"]).toBe("spindle.power_kW");
  });
});
