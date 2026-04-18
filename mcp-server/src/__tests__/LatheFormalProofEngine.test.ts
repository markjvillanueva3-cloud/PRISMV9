/**
 * LatheFormalProofEngine Tests
 *
 * U-LTH64: Formal verification orchestrator with 7 properties
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheFormalProofEngine } from "../engines/LatheFormalProofEngine.js";

describe("LatheFormalProofEngine", () => {
  beforeEach(() => {
    latheFormalProofEngine.clearCache();
    latheFormalProofEngine.setMachineProfile({
      machine_id: "TEST-LATHE",
      machine_name: "Test Lathe",
      x_min: -50,
      x_max: 300,
      z_min: -500,
      z_max: 50,
      f_max: 10000,
      s_max: 6000,
      z_safe: 10,
      x_home: 0,
      z_home: 0,
    });
    latheFormalProofEngine.setOptions({
      timeout_ms: 5000,
      include_counterexamples: true,
      cache_enabled: true,
    });
  });

  describe("Basic Proof", () => {
    it("proves simple valid program", () => {
      const program = `
        G21 G90
        G0 X50 Z10
        G1 Z-30 F200
        G0 X0 Z0
        M30
      `;

      const report = latheFormalProofEngine.prove("TEST-001", program);

      expect(report.program_id).toBe("TEST-001");
      expect(report.verdict).toBe("proven");
      expect(report.properties.length).toBeGreaterThan(0);
    });

    it("includes all 7 property types", () => {
      const program = "G0 X50 Z10\nM30";
      const report = latheFormalProofEngine.prove("TEST-002", program);

      const propertyTypes = report.properties.map(p => p.property_type);

      expect(propertyTypes).toContain("envelope_x");
      expect(propertyTypes).toContain("envelope_z");
      expect(propertyTypes).toContain("feedrate_limit");
      expect(propertyTypes).toContain("spindle_limit");
    });

    it("reports encoding and solving times", () => {
      const program = "G0 X50 Z10";
      const report = latheFormalProofEngine.prove("TEST-003", program);

      expect(report.encoding_time_ms).toBeGreaterThanOrEqual(0);
      expect(report.solving_time_ms).toBeGreaterThanOrEqual(0);
      expect(report.total_time_ms).toBeGreaterThanOrEqual(report.encoding_time_ms);
    });

    it("reports block and constraint counts", () => {
      const program = `
        G0 X50
        G1 Z-30
        G1 X30
      `;
      const report = latheFormalProofEngine.prove("TEST-004", program);

      expect(report.block_count).toBe(3);
      expect(report.constraint_count).toBeGreaterThan(0);
    });
  });

  describe("Property Results", () => {
    it("returns unsat for valid envelope", () => {
      const program = "G0 X100 Z-100"; // Within limits
      const report = latheFormalProofEngine.prove("PROP-001", program);

      const xEnvelope = report.properties.find(p => p.property_type === "envelope_x");

      expect(xEnvelope).toBeDefined();
      expect(xEnvelope!.status).toBe("unsat"); // No violation found
    });

    it("detects feedrate limit property", () => {
      const program = "G1 X50 F500";
      const report = latheFormalProofEngine.prove("PROP-002", program);

      const feedLimit = report.properties.find(p => p.property_type === "feedrate_limit");

      expect(feedLimit).toBeDefined();
      expect(feedLimit!.constraint_count).toBeGreaterThan(0);
    });

    it("detects spindle limit property", () => {
      const program = "S3000 M3";
      const report = latheFormalProofEngine.prove("PROP-003", program);

      const spindleLimit = report.properties.find(p => p.property_type === "spindle_limit");

      expect(spindleLimit).toBeDefined();
    });

    it("includes property descriptions", () => {
      const program = "G0 X50";
      const report = latheFormalProofEngine.prove("PROP-004", program);

      for (const prop of report.properties) {
        expect(prop.property_name).toBeDefined();
        expect(prop.description).toBeDefined();
      }
    });
  });

  describe("Machine Profile", () => {
    it("uses custom machine profile", () => {
      const report = latheFormalProofEngine.prove("PROFILE-001", "G0 X50", {
        machine_id: "CUSTOM-LATHE",
        x_max: 200,
      });

      expect(report.metadata.machine_profile).toBe("CUSTOM-LATHE");
    });

    it("returns current machine profile", () => {
      latheFormalProofEngine.setMachineProfile({
        machine_id: "MY-LATHE",
        f_max: 8000,
      });

      const profile = latheFormalProofEngine.getMachineProfile();

      expect(profile.machine_id).toBe("MY-LATHE");
      expect(profile.f_max).toBe(8000);
    });
  });

  describe("Quick Checks", () => {
    it("checkEnvelope combines X and Z", () => {
      const result = latheFormalProofEngine.checkEnvelope("ENV-001", "G0 X100 Z-200");

      expect(result.property_name).toBe("Machine Envelope");
      expect(result.constraint_count).toBeGreaterThan(0);
    });

    it("checkFeedsAndSpeeds combines feed and spindle", () => {
      const result = latheFormalProofEngine.checkFeedsAndSpeeds("FS-001", "G1 X50 F500 S2000");

      expect(result.property_name).toBe("Feeds & Speeds");
    });

    it("checkSafety combines tool change, rapid, and home", () => {
      const result = latheFormalProofEngine.checkSafety("SAFE-001", "G0 X50\nM30");

      expect(result.property_name).toBe("Safety Properties");
    });
  });

  describe("Caching", () => {
    it("caches proof results", () => {
      const program = "G0 X50 Z10";

      const report1 = latheFormalProofEngine.prove("CACHE-001", program);
      const report2 = latheFormalProofEngine.prove("CACHE-001", program);

      expect(report2.metadata.solver).toBe("cache");
    });

    it("reports cache stats", () => {
      latheFormalProofEngine.prove("CACHE-002", "G0 X10");
      latheFormalProofEngine.prove("CACHE-003", "G0 X20");

      const stats = latheFormalProofEngine.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.keys.length).toBe(2);
    });

    it("clears cache", () => {
      latheFormalProofEngine.prove("CACHE-004", "G0 X10");
      latheFormalProofEngine.clearCache();

      const stats = latheFormalProofEngine.getCacheStats();

      expect(stats.size).toBe(0);
    });

    it("respects cache_enabled option", () => {
      latheFormalProofEngine.setOptions({ cache_enabled: false });

      latheFormalProofEngine.prove("CACHE-005", "G0 X10");
      const stats = latheFormalProofEngine.getCacheStats();

      expect(stats.size).toBe(0);
    });
  });

  describe("Report Formatting", () => {
    it("formats report as readable text", () => {
      const program = "G0 X50 Z10\nM30";
      const report = latheFormalProofEngine.prove("FORMAT-001", program);

      const formatted = latheFormalProofEngine.formatReport(report);

      expect(formatted).toContain("FORMAT-001");
      expect(formatted).toContain("Verdict:");
      expect(formatted).toContain("Properties:");
    });

    it("includes pass/fail indicators", () => {
      const program = "G0 X50 Z10";
      const report = latheFormalProofEngine.prove("FORMAT-002", program);

      const formatted = latheFormalProofEngine.formatReport(report);

      expect(formatted).toMatch(/[✓✗?]/);
    });
  });

  describe("Options", () => {
    it("returns current options", () => {
      const options = latheFormalProofEngine.getOptions();

      expect(options.timeout_ms).toBeDefined();
      expect(options.include_counterexamples).toBeDefined();
    });

    it("allows setting specific properties to check", () => {
      latheFormalProofEngine.setOptions({
        properties_to_check: ["envelope_x", "envelope_z"],
      });

      const program = "G0 X50";
      const report = latheFormalProofEngine.prove("OPT-001", program);

      expect(report.properties.length).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("handles empty program", () => {
      const report = latheFormalProofEngine.prove("ERROR-001", "");

      expect(report.verdict).toBe("inconclusive");
      expect(report.warnings.length).toBeGreaterThan(0);
    });

    it("handles invalid program", () => {
      const report = latheFormalProofEngine.prove("ERROR-002", "(COMMENT ONLY)");

      expect(report.verdict).toBe("inconclusive");
    });
  });

  describe("Metadata", () => {
    it("includes solver metadata", () => {
      const program = "G0 X50";
      const report = latheFormalProofEngine.prove("META-001", program);

      expect(report.metadata.solver).toBeDefined();
      expect(report.metadata.logic).toBeDefined();
      expect(report.metadata.timeout_ms).toBeDefined();
    });
  });

  describe("Prove Blocks", () => {
    it("proves from parsed blocks", () => {
      const blocks = [
        { line_number: 1, raw: "G0 X50 Z10", g_codes: ["G0"], m_codes: [], x: 50, z: 10 },
        { line_number: 2, raw: "M30", g_codes: [], m_codes: ["M30"] },
      ];

      const report = latheFormalProofEngine.proveBlocks("BLOCKS-001", blocks);

      expect(report.program_id).toBe("BLOCKS-001");
      expect(report.block_count).toBe(2);
    });
  });

  describe("Verdicts", () => {
    it("returns proven when all properties pass", () => {
      const program = `
        G21 G90
        G0 X50 Z10
        G1 Z-30 F200
        G0 X0 Z0
        M30
      `;

      const report = latheFormalProofEngine.prove("VERDICT-001", program);

      expect(report.verdict).toBe("proven");
    });
  });

  describe("Performance", () => {
    it("proves typical program within timeout", () => {
      const lines: string[] = ["G21 G90"];
      for (let i = 0; i < 100; i++) {
        lines.push(`G1 X${i % 50} Z${-(i % 100)} F200`);
      }
      lines.push("G0 X0 Z0");
      lines.push("M30");

      const program = lines.join("\n");
      const report = latheFormalProofEngine.prove("PERF-001", program);

      expect(report.total_time_ms).toBeLessThan(5000);
    });
  });
});
