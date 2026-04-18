/**
 * LatheTemporalPropertyCheckerEngine Tests
 *
 * U-LTH66: Bounded LTL-to-SMT temporal property verification
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheTemporalPropertyCheckerEngine } from "../engines/LatheTemporalPropertyCheckerEngine.js";
import type { BlockState } from "../engines/LatheTemporalPropertyCheckerEngine.js";

describe("LatheTemporalPropertyCheckerEngine", () => {
  beforeEach(() => {
    latheTemporalPropertyCheckerEngine.setConfig({
      max_bound: 500,
      timeout_ms: 10000,
      z_safe: 10,
      x_home: 0,
      z_home: 0,
    });
  });

  describe("Property Management", () => {
    it("has standard properties", () => {
      const properties = latheTemporalPropertyCheckerEngine.getAllProperties();

      expect(properties.length).toBeGreaterThanOrEqual(3);
      expect(properties.some((p) => p.id === "PROP_RAPID_SAFETY")).toBe(true);
      expect(properties.some((p) => p.id === "PROP_TOOL_CHANGE")).toBe(true);
      expect(properties.some((p) => p.id === "PROP_HOME_BEFORE_END")).toBe(true);
    });

    it("gets property by ID", () => {
      const prop = latheTemporalPropertyCheckerEngine.getProperty("PROP_RAPID_SAFETY");

      expect(prop).not.toBeNull();
      expect(prop!.name).toBe("Rapid Move Safety");
      expect(prop!.category).toBe("safety");
    });

    it("returns null for unknown property", () => {
      const prop = latheTemporalPropertyCheckerEngine.getProperty("UNKNOWN_PROP");

      expect(prop).toBeNull();
    });

    it("allows adding custom property", () => {
      latheTemporalPropertyCheckerEngine.addProperty({
        id: "CUSTOM_PROP",
        name: "Custom Property",
        description: "Test property",
        ltl_formula: "G(true)",
        formula: {
          type: "ltl",
          operator: "G",
          operands: [{
            type: "prop",
            atomic: {
              type: "atomic",
              id: "always_true",
              name: "Always True",
              predicate: () => true,
              smt_template: "true",
            },
          }],
        },
        category: "safety",
      });

      const prop = latheTemporalPropertyCheckerEngine.getProperty("CUSTOM_PROP");
      expect(prop).not.toBeNull();
    });
  });

  describe("Rapid Safety Property", () => {
    it("verifies safe rapid moves above Z0", () => {
      const trace: BlockState[] = [
        { x: 0, z: 50, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
        { x: 50, z: 20, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
        { x: 100, z: 10, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
      ];

      const result = latheTemporalPropertyCheckerEngine.checkProperty("PROP_RAPID_SAFETY", trace);

      expect(result.status).toBe("verified");
    });

    it("detects unsafe rapid move below Z0", () => {
      const trace: BlockState[] = [
        { x: 0, z: 50, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
        { x: 50, z: -10, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
      ];

      const result = latheTemporalPropertyCheckerEngine.checkProperty("PROP_RAPID_SAFETY", trace);

      expect(result.status).toBe("violated");
      expect(result.witness_trace).toBeDefined();
      expect(result.witness_trace!.violation_block).toBe(1);
    });

    it("allows feed moves below Z0", () => {
      const trace: BlockState[] = [
        { x: 50, z: -30, f: 200, s: 1000, tool: 1, motion_mode: "G1", is_rapid: false, is_tool_change: false, is_program_end: false },
        { x: 30, z: -50, f: 200, s: 1000, tool: 1, motion_mode: "G1", is_rapid: false, is_tool_change: false, is_program_end: false },
      ];

      const result = latheTemporalPropertyCheckerEngine.checkProperty("PROP_RAPID_SAFETY", trace);

      expect(result.status).toBe("verified");
    });
  });

  describe("Tool Change Safety Property", () => {
    it("verifies tool change at safe Z", () => {
      const trace: BlockState[] = [
        { x: 0, z: 50, f: 100, s: 1000, tool: 1, motion_mode: null, is_rapid: false, is_tool_change: true, is_program_end: false },
        { x: 0, z: 20, f: 100, s: 1000, tool: 2, motion_mode: null, is_rapid: false, is_tool_change: true, is_program_end: false },
      ];

      const result = latheTemporalPropertyCheckerEngine.checkProperty("PROP_TOOL_CHANGE", trace);

      expect(result.status).toBe("verified");
    });

    it("detects unsafe tool change", () => {
      latheTemporalPropertyCheckerEngine.setConfig({ z_safe: 10 });

      const trace: BlockState[] = [
        { x: 50, z: 5, f: 100, s: 1000, tool: 1, motion_mode: null, is_rapid: false, is_tool_change: true, is_program_end: false },
      ];

      const result = latheTemporalPropertyCheckerEngine.checkProperty("PROP_TOOL_CHANGE", trace);

      expect(result.status).toBe("violated");
    });
  });

  describe("Home Before End Property", () => {
    it("verifies return to home", () => {
      const trace: BlockState[] = [
        { x: 50, z: -30, f: 200, s: 1000, tool: 1, motion_mode: "G1", is_rapid: false, is_tool_change: false, is_program_end: false },
        { x: 0, z: 0, f: 200, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
        { x: 0, z: 0, f: 200, s: 1000, tool: 1, motion_mode: null, is_rapid: false, is_tool_change: false, is_program_end: true },
      ];

      const result = latheTemporalPropertyCheckerEngine.checkProperty("PROP_HOME_BEFORE_END", trace);

      expect(result.status).toBe("verified");
    });

    it("detects missing return to home", () => {
      const trace: BlockState[] = [
        { x: 50, z: -30, f: 200, s: 1000, tool: 1, motion_mode: "G1", is_rapid: false, is_tool_change: false, is_program_end: false },
        { x: 50, z: 10, f: 200, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: true },
      ];

      const result = latheTemporalPropertyCheckerEngine.checkProperty("PROP_HOME_BEFORE_END", trace);

      expect(result.status).toBe("violated");
    });
  });

  describe("Check All Properties", () => {
    it("checks all standard properties", () => {
      const trace: BlockState[] = [
        { x: 0, z: 50, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
        { x: 50, z: -30, f: 200, s: 1000, tool: 1, motion_mode: "G1", is_rapid: false, is_tool_change: false, is_program_end: false },
        { x: 0, z: 0, f: 200, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: true },
      ];

      const results = latheTemporalPropertyCheckerEngine.checkAllProperties(trace);

      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(results.every((r) => r.status === "verified")).toBe(true);
    });

    it("reports multiple violations", () => {
      const trace: BlockState[] = [
        { x: 50, z: -10, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
        { x: 50, z: -30, f: 200, s: 1000, tool: 2, motion_mode: null, is_rapid: false, is_tool_change: true, is_program_end: false },
      ];

      const results = latheTemporalPropertyCheckerEngine.checkAllProperties(trace);

      const violated = results.filter((r) => r.status === "violated");
      expect(violated.length).toBeGreaterThan(0);
    });
  });

  describe("Trace Parsing", () => {
    it("parses block array to trace", () => {
      const blocks = [
        { x: 50, z: 10, g_codes: ["G0"] },
        { z: -30, f: 200, g_codes: ["G1"] },
        { x: 0, z: 0, m_codes: ["M30"] },
      ];

      const trace = latheTemporalPropertyCheckerEngine.parseTrace(blocks);

      expect(trace.length).toBe(3);
      expect(trace[0].x).toBe(50);
      expect(trace[0].is_rapid).toBe(true);
      expect(trace[1].f).toBe(200);
      expect(trace[2].is_program_end).toBe(true);
    });

    it("tracks state across blocks", () => {
      const blocks = [
        { x: 100, z: 50, t: 1 },
        { z: -30 },
        { x: 50 },
      ];

      const trace = latheTemporalPropertyCheckerEngine.parseTrace(blocks);

      expect(trace[1].x).toBe(100); // X unchanged
      expect(trace[2].z).toBe(-30); // Z unchanged
      expect(trace[2].tool).toBe(1); // Tool unchanged
    });

    it("detects tool changes", () => {
      const blocks = [
        { t: 1 },
        { t: 2 },
      ];

      const trace = latheTemporalPropertyCheckerEngine.parseTrace(blocks);

      expect(trace[0].is_tool_change).toBe(true);
      expect(trace[1].is_tool_change).toBe(true);
    });
  });

  describe("SMT Generation", () => {
    it("generates SMT assertions for G operator", () => {
      const prop = latheTemporalPropertyCheckerEngine.getProperty("PROP_RAPID_SAFETY")!;
      const assertions = latheTemporalPropertyCheckerEngine.generateSMTAssertions(prop, 5);

      expect(assertions.length).toBeGreaterThan(0);
      expect(assertions.some((a) => a.includes("Globally"))).toBe(true);
      expect(assertions.some((a) => a.includes("assert"))).toBe(true);
    });

    it("generates SMT assertions for F operator", () => {
      const prop = latheTemporalPropertyCheckerEngine.getProperty("PROP_HOME_BEFORE_END")!;
      const assertions = latheTemporalPropertyCheckerEngine.generateSMTAssertions(prop, 5);

      expect(assertions.some((a) => a.includes("Eventually"))).toBe(true);
      expect(assertions.some((a) => a.includes("or"))).toBe(true);
    });
  });

  describe("Result Formatting", () => {
    it("formats results as readable text", () => {
      const trace: BlockState[] = [
        { x: 0, z: 50, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
        { x: 0, z: 0, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: true },
      ];

      const results = latheTemporalPropertyCheckerEngine.checkAllProperties(trace);
      const formatted = latheTemporalPropertyCheckerEngine.formatResults(results);

      expect(formatted).toContain("Temporal Property Verification Report");
      expect(formatted).toMatch(/[✓✗⏱?]/);
    });

    it("includes witness trace for violations", () => {
      const trace: BlockState[] = [
        { x: 50, z: -10, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
      ];

      const results = latheTemporalPropertyCheckerEngine.checkAllProperties(trace);
      const formatted = latheTemporalPropertyCheckerEngine.formatResults(results);

      expect(formatted).toContain("VIOLATED");
      expect(formatted).toContain("Witness");
    });
  });

  describe("Configuration", () => {
    it("sets and gets config", () => {
      latheTemporalPropertyCheckerEngine.setConfig({
        z_safe: 20,
        timeout_ms: 5000,
      });

      const config = latheTemporalPropertyCheckerEngine.getConfig();

      expect(config.z_safe).toBe(20);
      expect(config.timeout_ms).toBe(5000);
    });

    it("respects max_bound", () => {
      latheTemporalPropertyCheckerEngine.setConfig({ max_bound: 10 });

      const trace: BlockState[] = [];
      for (let i = 0; i < 100; i++) {
        trace.push({
          x: i, z: 50, f: 100, s: 1000, tool: 1,
          motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false,
        });
      }

      const result = latheTemporalPropertyCheckerEngine.checkProperty("PROP_RAPID_SAFETY", trace);

      expect(result.bound_k).toBe(10);
    });
  });

  describe("Performance", () => {
    it("checks 500-block trace within timeout", () => {
      const trace: BlockState[] = [];
      for (let i = 0; i < 500; i++) {
        trace.push({
          x: i % 100, z: 50 - (i % 50), f: 200, s: 1000, tool: 1,
          motion_mode: "G1", is_rapid: false, is_tool_change: false, is_program_end: false,
        });
      }
      trace[499].is_program_end = true;
      trace[498] = { ...trace[498], x: 0, z: 0 }; // Go home

      const results = latheTemporalPropertyCheckerEngine.checkAllProperties(trace);

      expect(results.every((r) => r.time_ms < 10000)).toBe(true);
    });

    it("counts SMT assertions correctly", () => {
      const trace: BlockState[] = [
        { x: 0, z: 50, f: 100, s: 1000, tool: 1, motion_mode: "G0", is_rapid: true, is_tool_change: false, is_program_end: false },
      ];

      const result = latheTemporalPropertyCheckerEngine.checkProperty("PROP_RAPID_SAFETY", trace);

      expect(result.smt_assertions_count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Unknown Property", () => {
    it("handles unknown property gracefully", () => {
      const trace: BlockState[] = [];
      const result = latheTemporalPropertyCheckerEngine.checkProperty("UNKNOWN", trace);

      expect(result.status).toBe("unknown");
      expect(result.property_name).toBe("Unknown");
    });
  });
});
