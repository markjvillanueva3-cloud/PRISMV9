/**
 * Tests for FormalVerificationEngine (PP-INFRA-Z3)
 *
 * Note: Z3 WASM is heavy to load and is not exercised in unit tests by
 * default. These tests cover input validation + timeout / not-available
 * fall-throughs. A separate integration test file should be added once a
 * CI runner with Z3 WASM enabled exists.
 */

import { describe, it, expect } from "vitest";
import {
  FormalVerificationEngine,
  formalVerificationEngine,
} from "../engines/FormalVerificationEngine.js";

describe("FormalVerificationEngine", () => {
  const engine = new FormalVerificationEngine();

  describe("prove() — input validation", () => {
    it("rejects empty variable set", async () => {
      await expect(() =>
        engine.prove({
          variables: [],
          assumptions: [],
          goal: { terms: { x: 1 }, op: "<=", rhs: 10 },
        })
      ).rejects.toThrow(/variables must be non-empty/);
    });

    it("rejects variable with min > max", async () => {
      await expect(() =>
        engine.prove({
          variables: [{ name: "x", min: 5, max: 1 }],
          assumptions: [],
          goal: { terms: { x: 1 }, op: "<=", rhs: 10 },
        })
      ).rejects.toThrow(/min > max/);
    });

    it("rejects duplicate variable names", async () => {
      await expect(() =>
        engine.prove({
          variables: [
            { name: "x", min: 0, max: 5 },
            { name: "x", min: 0, max: 5 },
          ],
          assumptions: [],
          goal: { terms: { x: 1 }, op: "<=", rhs: 10 },
        })
      ).rejects.toThrow(/duplicate variable/);
    });

    it("rejects non-integer bounds", async () => {
      await expect(() =>
        engine.prove({
          variables: [{ name: "x", min: 0.5, max: 5 }],
          assumptions: [],
          goal: { terms: { x: 1 }, op: "<=", rhs: 10 },
        })
      ).rejects.toThrow(/bounds must be integers/);
    });

    it("rejects invalid operator", async () => {
      await expect(() =>
        engine.prove({
          variables: [{ name: "x", min: 0, max: 5 }],
          assumptions: [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          goal: { terms: { x: 1 }, op: "<" as any, rhs: 10 },
        })
      ).rejects.toThrow(/op must be/);
    });

    it("rejects non-finite rhs", async () => {
      await expect(() =>
        engine.prove({
          variables: [{ name: "x", min: 0, max: 5 }],
          assumptions: [],
          goal: { terms: { x: 1 }, op: "<=", rhs: Infinity },
        })
      ).rejects.toThrow(/rhs/);
    });

    it("rejects non-finite coefficient", async () => {
      await expect(() =>
        engine.prove({
          variables: [{ name: "x", min: 0, max: 5 }],
          assumptions: [],
          goal: { terms: { x: NaN }, op: "<=", rhs: 10 },
        })
      ).rejects.toThrow(/coefficients/);
    });

    it("rejects negative or zero timeoutMs", async () => {
      await expect(() =>
        engine.prove({
          variables: [{ name: "x", min: 0, max: 5 }],
          assumptions: [],
          goal: { terms: { x: 1 }, op: "<=", rhs: 10 },
          timeoutMs: 0,
        })
      ).rejects.toThrow(/timeoutMs/);
    });
  });

  describe("satisfy() — input validation", () => {
    it("rejects empty variable set", async () => {
      await expect(() =>
        engine.satisfy({ variables: [], constraints: [] })
      ).rejects.toThrow(/variables/);
    });

    it("accepts a well-formed input shape (even if Z3 isn't loaded in CI)", async () => {
      // We don't assert on the result — this test proves the input does
      // not throw during validation.
      const probe = engine.satisfy({
        variables: [{ name: "x", min: 0, max: 10 }],
        constraints: [{ terms: { x: 1 }, op: ">=", rhs: 0 }],
        timeoutMs: 100,
      });
      await expect(probe).resolves.toMatchObject({
        result: expect.stringMatching(/^(sat|unsat|timeout|unknown)$/),
        wallMs: expect.any(Number),
      });
    });
  });

  describe("ready()", () => {
    it("does not throw even if Z3 fails to load", async () => {
      // We just want a boolean, never an exception.
      const result = await engine.ready();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("module singleton", () => {
    it("exports an instance", () => {
      expect(formalVerificationEngine).toBeInstanceOf(FormalVerificationEngine);
    });
  });
});
