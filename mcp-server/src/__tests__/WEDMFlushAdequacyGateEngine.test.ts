/**
 * WEDMFlushAdequacyGateEngine tests
 * MS-P2.5-SAFETY/U-P2.5-SAFE-04
 */

import { describe, it, expect } from "vitest";
import {
  WEDMFlushAdequacyGateEngine,
  type FlushAdequacyInput,
} from "../engines/WEDMFlushAdequacyGateEngine.js";

describe("WEDMFlushAdequacyGateEngine", () => {
  const engine = new WEDMFlushAdequacyGateEngine();

  describe("evaluate()", () => {
    it("returns PASS for thin workpiece with adequate flow (submerged)", () => {
      const input: FlushAdequacyInput = {
        flow_mm3_s: 15000,
        thickness_mm: 20,
        mode: "submerged",
        gap_mm: 0.15,
      };

      const result = engine.evaluate(input);

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.verdict).toBe("pass");
      expect(result.hard_block).toBe(false);
      expect(result.velocity_m_s).toBeGreaterThan(0.5);
      expect(result.safety_gate_input.pass).toBe(true);
      expect(result.safety_score_contribution).toBe(0.15);
    });

    it("returns PASS for medium workpiece with adequate flow", () => {
      const input: FlushAdequacyInput = {
        flow_mm3_s: 50000,
        thickness_mm: 50,
        mode: "submerged",
        gap_mm: 0.15,
      };

      const result = engine.evaluate(input);

      expect(result.pass).toBe(true);
      expect(result.band).toBe("medium");
    });

    it("returns PASS for thick workpiece with high flow", () => {
      const input: FlushAdequacyInput = {
        flow_mm3_s: 100000,
        thickness_mm: 80,
        mode: "submerged",
        gap_mm: 0.15,
      };

      const result = engine.evaluate(input);

      expect(result.pass).toBe(true);
      expect(result.band).toBe("thick");
    });

    it("returns FAIL for insufficient flow (hard block)", () => {
      const input: FlushAdequacyInput = {
        flow_mm3_s: 100,
        thickness_mm: 50,
        mode: "submerged",
        gap_mm: 0.15,
      };

      const result = engine.evaluate(input);

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.safety_score_contribution).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("applies side_flush penalty requiring higher velocity", () => {
      const submergedInput: FlushAdequacyInput = {
        flow_mm3_s: 5000,
        thickness_mm: 30,
        mode: "submerged",
        gap_mm: 0.15,
      };

      const sideFlushInput: FlushAdequacyInput = {
        flow_mm3_s: 5000,
        thickness_mm: 30,
        mode: "side_flush",
        gap_mm: 0.15,
      };

      const submergedResult = engine.evaluate(submergedInput);
      const sideFlushResult = engine.evaluate(sideFlushInput);

      expect(sideFlushResult.required_velocity_m_s).toBeGreaterThan(
        submergedResult.required_velocity_m_s
      );
    });

    it("returns FAIL for zero flow", () => {
      const result = engine.evaluate({
        flow_mm3_s: 0,
        thickness_mm: 25,
        mode: "submerged",
      });

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
    });

    it("returns FAIL for zero thickness", () => {
      const result = engine.evaluate({
        flow_mm3_s: 5000,
        thickness_mm: 0,
        mode: "submerged",
      });

      expect(result.pass).toBe(false);
    });

    it("returns correct safety_gate_input shape", () => {
      const result = engine.evaluate({
        flow_mm3_s: 8000,
        thickness_mm: 25,
        mode: "submerged",
      });

      const sgi = result.safety_gate_input;
      expect(sgi).toHaveProperty("pass");
      expect(sgi).toHaveProperty("velocity_m_s");
      expect(sgi).toHaveProperty("required_velocity_m_s");
      expect(sgi).toHaveProperty("mode");
      expect(typeof sgi.pass).toBe("boolean");
      expect(typeof sgi.velocity_m_s).toBe("number");
    });

    it("allows tribal override when velocity is marginal but above floor", () => {
      const input: FlushAdequacyInput = {
        flow_mm3_s: 2000,
        thickness_mm: 25,
        mode: "submerged",
        gap_mm: 0.15,
        tribal_override: {
          enabled: true,
          operator_id: "JM-001",
          acknowledgement: "Accepting marginal flush for thin section",
        },
      };

      const result = engine.evaluate(input);

      if (result.verdict === "fail_tribal_override_allowed") {
        expect(result.tribal_override_used).toBe(true);
        expect(result.hard_block).toBe(false);
      }
    });
  });

  describe("gate()", () => {
    it("returns allow=true for passing flow", () => {
      const result = engine.gate({
        flow_mm3_s: 8000,
        thickness_mm: 25,
        mode: "submerged",
      });

      expect(result.allow).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it("returns allow=false for failing flow", () => {
      const result = engine.gate({
        flow_mm3_s: 50,
        thickness_mm: 50,
        mode: "submerged",
      });

      expect(result.allow).toBe(false);
    });
  });

  describe("adversarial inputs", () => {
    it("handles NaN flow", () => {
      const result = engine.evaluate({
        flow_mm3_s: NaN,
        thickness_mm: 25,
        mode: "submerged",
      });

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
    });

    it("handles Infinity thickness", () => {
      const result = engine.evaluate({
        flow_mm3_s: 5000,
        thickness_mm: Infinity,
        mode: "submerged",
      });

      expect(result.pass).toBe(false);
    });

    it("handles negative flow", () => {
      const result = engine.evaluate({
        flow_mm3_s: -1000,
        thickness_mm: 25,
        mode: "submerged",
      });

      expect(result.pass).toBe(false);
    });

    it("handles very large flow without crashing", () => {
      const result = engine.evaluate({
        flow_mm3_s: 999999999,
        thickness_mm: 25,
        mode: "submerged",
      });

      expect(result.success).toBe(true);
      expect(result.velocity_m_s).toBeGreaterThan(0);
    });
  });

  describe("variability: thickness bands", () => {
    it("thin band (≤25mm) requires 0.5 m/s", () => {
      const result = engine.evaluate({
        flow_mm3_s: 5000,
        thickness_mm: 20,
        mode: "submerged",
        gap_mm: 0.15,
      });

      expect(result.band).toBe("thin");
    });

    it("medium band (25-75mm) requires 0.8 m/s", () => {
      const result = engine.evaluate({
        flow_mm3_s: 8000,
        thickness_mm: 50,
        mode: "submerged",
        gap_mm: 0.15,
      });

      expect(result.band).toBe("medium");
    });

    it("thick band (>75mm) requires 1.2 m/s", () => {
      const result = engine.evaluate({
        flow_mm3_s: 20000,
        thickness_mm: 100,
        mode: "submerged",
        gap_mm: 0.15,
      });

      expect(result.band).toBe("thick");
    });
  });
});
