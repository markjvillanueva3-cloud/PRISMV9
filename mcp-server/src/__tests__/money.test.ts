/**
 * money.test.ts — real-value tests for the canonical half-even money rounder (src/data/money.ts).
 * (Relocated here from SalesUseTaxEngine.test.ts when roundCentsHalfEven was hoisted out of the tax
 * engine into the shared money util — the test now lives with the thing it tests.)
 */
import { describe, it, expect } from "vitest";
import { roundCentsHalfEven } from "../data/money.js";

describe("roundCentsHalfEven (banker's half-even rounding to the cent, financial-invariant)", () => {
  it("rounds normally when not on a cent tie", () => {
    expect(roundCentsHalfEven(60)).toBe(60);
    expect(roundCentsHalfEven(70.004)).toBe(70);
    expect(roundCentsHalfEven(102.499)).toBe(102.5);
    expect(roundCentsHalfEven(99.99)).toBe(99.99);
  });
  it("breaks a cent tie toward EVEN (not always up)", () => {
    expect(roundCentsHalfEven(0.125)).toBe(0.12); // tie → down to even cent (12)
    expect(roundCentsHalfEven(0.135)).toBe(0.14); // tie → up to even cent (14)
  });
  it("is sign-aware (magnitude rounds the same, sign preserved)", () => {
    expect(roundCentsHalfEven(-60)).toBe(-60);
    expect(roundCentsHalfEven(-0.125)).toBe(-0.12);
  });
  it("returns 0 for 0", () => {
    expect(roundCentsHalfEven(0)).toBe(0);
  });
  it("throws on a non-finite amount (never silently coerce a NaN/Infinity into a $ value)", () => {
    expect(() => roundCentsHalfEven(NaN)).toThrow(/non-finite/);
    expect(() => roundCentsHalfEven(Infinity)).toThrow(/non-finite/);
    expect(() => roundCentsHalfEven(-Infinity)).toThrow(/non-finite/);
  });
});
