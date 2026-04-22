/**
 * LegalGateEngine.test.ts — Tests for CAM-UIX-INFRA-00/U-LEGAL-GATES01
 *
 * Tests all 5 legal gates:
 * - Customer consent
 * - Export control (ITAR/EAR)
 * - Patent cleanroom
 * - DMCA compliance
 * - Standards license
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { LegalGateEngine, legalGateEngine, GateResult } from "../../engines/LegalGateEngine.js";

describe("LegalGateEngine", () => {
  // Use fresh instance for isolation
  let engine: LegalGateEngine;

  beforeEach(() => {
    engine = LegalGateEngine.getInstance();
    engine.clearCaches();
  });

  afterEach(() => {
    engine.clearCaches();
  });

  // ==========================================================================
  // Customer Consent Gate
  // ==========================================================================
  describe("checkCustomerConsent", () => {
    it("allows consented customer with correct consent type", async () => {
      const result = await engine.checkCustomerConsent("jmdie_internal", "ai_training");

      expect(result.allowed).toBe(true);
      expect(result.gateType).toBe("customer_consent");
      expect(result.reason).toContain("granted");
      expect(result.auditRef).toMatch(/^CONSENT-\d+-jmdie_internal$/);
    });

    it("blocks unknown customer", async () => {
      const result = await engine.checkCustomerConsent("unknown_corp", "ai_training");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Unknown customer");
    });

    it("blocks customer with pending consent", async () => {
      const result = await engine.checkCustomerConsent("itw", "ai_training");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("pending");
      expect(result.reason).toContain("not 'granted'");
    });

    it("blocks customer without requested consent type", async () => {
      // jmdie_internal has ai_training but let's check with a type they don't have
      // First verify they do have ai_training
      const hasTraining = await engine.checkCustomerConsent("jmdie_internal", "ai_training");
      expect(hasTraining.allowed).toBe(true);

      // Now check with not_requested customer for a consent type
      const result = await engine.checkCustomerConsent("optimas", "ai_training");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not_requested");
    });

    it("includes timestamp in result", async () => {
      const before = new Date().toISOString();
      const result = await engine.checkCustomerConsent("jmdie_internal", "ai_training");
      const after = new Date().toISOString();

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });
  });

  // ==========================================================================
  // Export Control Gate
  // ==========================================================================
  describe("checkExportControl", () => {
    it("allows customer with no export restrictions", () => {
      const result = engine.checkExportControl("jmdie_internal");

      expect(result.allowed).toBe(true);
      expect(result.gateType).toBe("export_control");
      expect(result.reason).toContain("no export control restrictions");
    });

    it("blocks ITAR-controlled customer", () => {
      const result = engine.checkExportControl("alcoa");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("ITAR-controlled");
      expect(result.reason).toContain("Category XI");
      expect(result.reason).toContain("State Department");
    });

    it("returns proper audit ref format", () => {
      const result = engine.checkExportControl("alcoa");

      expect(result.auditRef).toMatch(/^EXPORT-\d+-alcoa$/);
    });

    it("handles unknown customer as no restrictions", () => {
      const result = engine.checkExportControl("random_customer_xyz");

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain("no export control restrictions");
    });
  });

  // ==========================================================================
  // Patent Cleanroom Gate
  // ==========================================================================
  describe("checkPatentCleanroom", () => {
    it("allows feature with no patent blocks", () => {
      const result = engine.checkPatentCleanroom("adaptive_clearing");

      expect(result.allowed).toBe(true);
      expect(result.gateType).toBe("patent_cleanroom");
      expect(result.reason).toContain("no patent blocks");
    });

    it("blocks iMachining due to SolidCAM patent", () => {
      const result = engine.checkPatentCleanroom("iMachining");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("US 8,489,224");
      expect(result.reason).toContain("Cleanroom");
    });

    it("blocks iMachining_3D variant", () => {
      const result = engine.checkPatentCleanroom("iMachining_3D");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("US 8,489,224");
    });

    it("blocks morphed_spiral (iMachining related)", () => {
      const result = engine.checkPatentCleanroom("morphed_spiral_toolpath");

      expect(result.allowed).toBe(false);
    });

    it("allows trochoidal (not patented)", () => {
      const result = engine.checkPatentCleanroom("trochoidal_milling");

      expect(result.allowed).toBe(true);
    });

    it("mentions workaround when available", () => {
      const result = engine.checkPatentCleanroom("iMachining");

      expect(result.reason).toContain("Workaround available");
    });

    it("returns list of active patent blocks", () => {
      const blocks = engine.getActivePatentBlocks();

      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0].patent_number).toBe("US 8,489,224");
      expect(blocks[0].status).toBe("active");
    });
  });

  // ==========================================================================
  // DMCA Gate
  // ==========================================================================
  describe("checkDMCACompliance", () => {
    it("allows legitimate source URL", () => {
      const result = engine.checkDMCACompliance(
        "https://help.autodesk.com/view/fusion360/ENU/",
        "text/html"
      );

      expect(result.allowed).toBe(true);
      expect(result.gateType).toBe("dmca");
    });

    it("blocks known infringing source (sci-hub)", () => {
      const result = engine.checkDMCACompliance(
        "https://sci-hub.se/some-paper",
        "application/pdf"
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("DMCA block list");
    });

    it("blocks libgen.is", () => {
      const result = engine.checkDMCACompliance(
        "https://libgen.is/book/12345",
        "application/pdf"
      );

      expect(result.allowed).toBe(false);
    });

    it("blocks DRM-protected content types", () => {
      const result = engine.checkDMCACompliance(
        "https://legitimate-site.com/video",
        "video/x-ms-wmv"
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("DRM");
      expect(result.reason).toContain("§1201");
    });

    it("blocks Silverlight content (DRM indicator)", () => {
      const result = engine.checkDMCACompliance(
        "https://legitimate-site.com/app",
        "application/x-silverlight"
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("DRM");
    });

    it("rejects invalid URL format", () => {
      const result = engine.checkDMCACompliance(
        "not-a-valid-url",
        "text/html"
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Invalid URL");
    });

    it("allows GitHub with proper content type", () => {
      const result = engine.checkDMCACompliance(
        "https://github.com/Autodesk/hsm-post-processor",
        "text/html"
      );

      expect(result.allowed).toBe(true);
    });
  });

  // ==========================================================================
  // Standards License Gate
  // ==========================================================================
  describe("checkStandardsLicense", () => {
    it("allows abstract extraction for any known standard", async () => {
      const result = await engine.checkStandardsLicense("ISO_3685_1993", "abstract");

      expect(result.allowed).toBe(true);
      expect(result.gateType).toBe("standards_license");
      expect(result.reason).toContain("Abstract extraction allowed");
    });

    it("allows full text for public_abstract standards", async () => {
      const result = await engine.checkStandardsLicense("DIN_6584_1982", "full_text");

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain("Full text extraction allowed");
    });

    it("allows full text for owned standards", async () => {
      const result = await engine.checkStandardsLicense("ISO_513_2012", "full_text");

      expect(result.allowed).toBe(true);
    });

    it("blocks unknown standard", async () => {
      const result = await engine.checkStandardsLicense("ISO_99999_2099", "full_text");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Unknown standard");
    });

    it("returns proper audit ref format", async () => {
      const result = await engine.checkStandardsLicense("ISO_3685_1993", "abstract");

      expect(result.auditRef).toMatch(/^STANDARD-\d+-ISO_3685_1993$/);
    });
  });

  // ==========================================================================
  // Combined Gate Check
  // ==========================================================================
  describe("checkAllGates", () => {
    it("passes all gates for fully compliant request", async () => {
      const result = await engine.checkAllGates({
        customerId: "jmdie_internal",
        sourceUrl: "https://help.autodesk.com/fusion",
        contentType: "text/html",
        featureName: "adaptive_clearing",
      });

      expect(result.allPassed).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(3);
      expect(result.results.every(r => r.allowed)).toBe(true);
    });

    it("fails if any gate fails (customer consent)", async () => {
      const result = await engine.checkAllGates({
        customerId: "itw", // pending consent
        sourceUrl: "https://help.autodesk.com/fusion",
      });

      expect(result.allPassed).toBe(false);
      expect(result.results.some(r => !r.allowed && r.gateType === "customer_consent")).toBe(true);
    });

    it("fails if any gate fails (export control)", async () => {
      const result = await engine.checkAllGates({
        customerId: "alcoa", // ITAR controlled
      });

      expect(result.allPassed).toBe(false);
      // Note: consent also fails for alcoa, but export control should be in results
      expect(result.results.some(r => r.gateType === "export_control")).toBe(true);
    });

    it("fails if any gate fails (patent)", async () => {
      const result = await engine.checkAllGates({
        customerId: "jmdie_internal",
        featureName: "iMachining",
      });

      expect(result.allPassed).toBe(false);
      expect(result.results.some(r => !r.allowed && r.gateType === "patent_cleanroom")).toBe(true);
    });

    it("fails if any gate fails (DMCA)", async () => {
      const result = await engine.checkAllGates({
        customerId: "jmdie_internal",
        sourceUrl: "https://sci-hub.se/paper",
      });

      expect(result.allPassed).toBe(false);
      expect(result.results.some(r => !r.allowed && r.gateType === "dmca")).toBe(true);
    });

    it("only runs applicable gates", async () => {
      // No customer, no URL, no feature, no standard = no gates
      const result = await engine.checkAllGates({});

      expect(result.results.length).toBe(0);
      expect(result.allPassed).toBe(true);
    });

    it("runs standard gate when standardId provided", async () => {
      const result = await engine.checkAllGates({
        standardId: "ISO_3685_1993",
      });

      expect(result.results.length).toBe(1);
      expect(result.results[0].gateType).toBe("standards_license");
    });
  });

  // ==========================================================================
  // Singleton Pattern
  // ==========================================================================
  describe("singleton", () => {
    it("returns same instance", () => {
      const instance1 = LegalGateEngine.getInstance();
      const instance2 = LegalGateEngine.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("exported singleton matches getInstance", () => {
      expect(legalGateEngine).toBe(LegalGateEngine.getInstance());
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe("edge cases", () => {
    it("handles empty string customer ID", async () => {
      const result = await engine.checkCustomerConsent("", "ai_training");

      expect(result.allowed).toBe(false);
    });

    it("handles special characters in feature name", () => {
      const result = engine.checkPatentCleanroom("feature-with-dashes_and_underscores");

      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe("boolean");
    });

    it("handles URL with query params", () => {
      const result = engine.checkDMCACompliance(
        "https://example.com/page?param=value&other=123",
        "text/html"
      );

      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
    });

    it("handles case-insensitive feature matching", () => {
      const lower = engine.checkPatentCleanroom("imachining");
      const upper = engine.checkPatentCleanroom("IMACHINING");
      const mixed = engine.checkPatentCleanroom("iMachining");

      // All should be blocked
      expect(lower.allowed).toBe(false);
      expect(upper.allowed).toBe(false);
      expect(mixed.allowed).toBe(false);
    });
  });
});
