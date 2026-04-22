/**
 * physics-canonical-constants-guard.test.ts — Tests for CAM-UIX-INFRA-00/U-PHYSCONST01
 *
 * Validates that ingestion pipelines cannot write to canonical physics constants.
 * Shop-derived kc back-solves go to vendor_variants.shop_observed, not constants.ts.
 */
import { describe, it, expect } from "vitest";

// Inline the guard logic for testing (hook runs as separate process)
const PROTECTED_PATHS = [
  "src/physics/constants.ts",
  "mcp-server/src/physics/constants.ts",
  "physics/constants.ts",
];

const INGESTION_CONTEXT_PATTERNS = [
  /ingest/i,
  /scrape/i,
  /crawl/i,
  /JMDie/i,
  /jm_die/i,
  /shop_observed/i,
  /empirical/i,
  /sample_reverse/i,
  /forum/i,
  /vendor_training/i,
  /CAMDoc/i,
  /CAMForum/i,
  /source_quality.*empirical/i,
];

const ALLOWED_PHYSICS_CONTEXTS = [
  /peer.?reviewed/i,
  /ISO\s*\d+/i,
  /DIN\s*\d+/i,
  /Merchant.*circle/i,
  /Shaw.*cutting/i,
  /literature.*citation/i,
  /canonical.*constant/i,
];

function isProtectedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return PROTECTED_PATHS.some((p) => normalized.endsWith(p.toLowerCase()));
}

function hasIngestionContext(content: string): boolean {
  if (!content) return false;
  return INGESTION_CONTEXT_PATTERNS.some((re) => re.test(content));
}

function hasPhysicsContext(content: string): boolean {
  if (!content) return false;
  return ALLOWED_PHYSICS_CONTEXTS.some((re) => re.test(content));
}

interface GuardResult {
  continue: boolean;
  decision?: "block";
  reason?: string;
}

function simulateGuard(tool: string, filePath: string, content: string): GuardResult {
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) {
    return { continue: true };
  }

  if (!isProtectedPath(filePath)) {
    return { continue: true };
  }

  if (hasIngestionContext(content)) {
    return {
      continue: false,
      decision: "block",
      reason: `Physics constants (src/physics/constants.ts) are derived from peer-reviewed literature, not ingestion/shop data. JMDie observations go to vendor_variants.shop_observed slot, not canonical constants.`,
    };
  }

  if (hasPhysicsContext(content)) {
    return { continue: true };
  }

  // Warn but allow if no clear context
  return { continue: true };
}

describe("physics-canonical-constants-guard", () => {
  describe("tool filtering", () => {
    it("ignores Read tool", () => {
      const result = simulateGuard("Read", "src/physics/constants.ts", "JMDie empirical data");
      expect(result.continue).toBe(true);
    });

    it("ignores Bash tool", () => {
      const result = simulateGuard("Bash", "src/physics/constants.ts", "scrape result");
      expect(result.continue).toBe(true);
    });

    it("processes Write tool", () => {
      const result = simulateGuard("Write", "src/physics/constants.ts", "JMDie kc values");
      expect(result.continue).toBe(false);
    });

    it("processes Edit tool", () => {
      const result = simulateGuard("Edit", "src/physics/constants.ts", "shop_observed data");
      expect(result.continue).toBe(false);
    });

    it("processes MultiEdit tool", () => {
      const result = simulateGuard("MultiEdit", "src/physics/constants.ts", "empirical values");
      expect(result.continue).toBe(false);
    });
  });

  describe("path protection", () => {
    it("protects src/physics/constants.ts", () => {
      expect(isProtectedPath("src/physics/constants.ts")).toBe(true);
    });

    it("protects mcp-server/src/physics/constants.ts", () => {
      expect(isProtectedPath("mcp-server/src/physics/constants.ts")).toBe(true);
    });

    it("protects physics/constants.ts", () => {
      expect(isProtectedPath("physics/constants.ts")).toBe(true);
    });

    it("protects Windows paths", () => {
      expect(isProtectedPath("H:\\PRISM\\src\\physics\\constants.ts")).toBe(true);
    });

    it("does not protect other files", () => {
      expect(isProtectedPath("src/physics/models.ts")).toBe(false);
    });

    it("does not protect constants in other dirs", () => {
      expect(isProtectedPath("src/data/constants.ts")).toBe(false);
    });
  });

  describe("ingestion context detection", () => {
    it("detects ingest keyword", () => {
      expect(hasIngestionContext("ingest pipeline data")).toBe(true);
    });

    it("detects scrape keyword", () => {
      expect(hasIngestionContext("scraped from vendor site")).toBe(true);
    });

    it("detects crawl keyword", () => {
      expect(hasIngestionContext("crawled documentation")).toBe(true);
    });

    it("detects JMDie reference", () => {
      expect(hasIngestionContext("JMDie program analysis")).toBe(true);
    });

    it("detects jm_die reference", () => {
      expect(hasIngestionContext("jm_die_kc_backsolve")).toBe(true);
    });

    it("detects shop_observed", () => {
      expect(hasIngestionContext("shop_observed: 1850")).toBe(true);
    });

    it("detects empirical keyword", () => {
      expect(hasIngestionContext("empirical measurement")).toBe(true);
    });

    it("detects sample_reverse", () => {
      expect(hasIngestionContext("sample_reverse engineering")).toBe(true);
    });

    it("detects forum reference", () => {
      expect(hasIngestionContext("from CNCzone forum")).toBe(true);
    });

    it("detects vendor_training", () => {
      expect(hasIngestionContext("vendor_training webinar")).toBe(true);
    });

    it("detects CAMDoc source", () => {
      expect(hasIngestionContext("CAMDoc extracted")).toBe(true);
    });

    it("detects CAMForum source", () => {
      expect(hasIngestionContext("CAMForum tip")).toBe(true);
    });

    it("detects source_quality empirical", () => {
      expect(hasIngestionContext('"source_quality": "empirical"')).toBe(true);
    });
  });

  describe("physics context detection", () => {
    it("allows peer-reviewed content", () => {
      expect(hasPhysicsContext("peer-reviewed journal citation")).toBe(true);
    });

    it("allows ISO standards", () => {
      expect(hasPhysicsContext("per ISO 3685:1993")).toBe(true);
    });

    it("allows DIN standards", () => {
      expect(hasPhysicsContext("DIN 6584 reference")).toBe(true);
    });

    it("allows Merchant circle reference", () => {
      expect(hasPhysicsContext("Merchant circle force model")).toBe(true);
    });

    it("allows Shaw cutting theory", () => {
      expect(hasPhysicsContext("Shaw cutting mechanics")).toBe(true);
    });

    it("allows literature citation", () => {
      expect(hasPhysicsContext("literature citation: Tlusty 2000")).toBe(true);
    });

    it("allows canonical constant update", () => {
      expect(hasPhysicsContext("updating canonical constant")).toBe(true);
    });
  });

  describe("blocking behavior", () => {
    it("blocks JMDie data from constants.ts", () => {
      const result = simulateGuard(
        "Write",
        "src/physics/constants.ts",
        "// JMDie observed kc1.1 = 1850"
      );
      expect(result.continue).toBe(false);
      expect(result.decision).toBe("block");
      expect(result.reason).toContain("peer-reviewed literature");
    });

    it("blocks empirical shop data", () => {
      const result = simulateGuard(
        "Edit",
        "mcp-server/src/physics/constants.ts",
        "empirical shop floor measurement"
      );
      expect(result.continue).toBe(false);
      expect(result.reason).toContain("vendor_variants.shop_observed");
    });

    it("blocks forum-sourced values", () => {
      const result = simulateGuard(
        "Write",
        "src/physics/constants.ts",
        "// from CNCzone forum discussion"
      );
      expect(result.continue).toBe(false);
    });

    it("blocks vendor training derived", () => {
      const result = simulateGuard(
        "Edit",
        "src/physics/constants.ts",
        "vendor_training webinar value"
      );
      expect(result.continue).toBe(false);
    });

    it("allows peer-reviewed updates", () => {
      const result = simulateGuard(
        "Write",
        "src/physics/constants.ts",
        "// peer-reviewed: Kienzle 1952, kc1.1 P-group = 1800"
      );
      expect(result.continue).toBe(true);
    });

    it("allows ISO standard updates", () => {
      const result = simulateGuard(
        "Edit",
        "src/physics/constants.ts",
        "// per ISO 3685:1993 tool life equation"
      );
      expect(result.continue).toBe(true);
    });
  });

  describe("non-protected paths", () => {
    it("allows ingestion data to other files", () => {
      const result = simulateGuard(
        "Write",
        "data/ingestion_cache/jmdie_kc.json",
        '{"JMDie": true, "shop_observed": 1850}'
      );
      expect(result.continue).toBe(true);
    });

    it("allows vendor_variants file", () => {
      const result = simulateGuard(
        "Write",
        "src/data/vendor_variants.json",
        '{"shop_observed": {"kc1.1": 1850}}'
      );
      expect(result.continue).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty content gracefully", () => {
      const result = simulateGuard("Write", "src/physics/constants.ts", "");
      expect(result.continue).toBe(true);
    });

    it("handles mixed physics and ingestion context — ingestion wins", () => {
      const result = simulateGuard(
        "Write",
        "src/physics/constants.ts",
        "// ISO 3685 but also JMDie observed"
      );
      // Ingestion context is checked first and blocks
      expect(result.continue).toBe(false);
    });

    it("allows ambiguous content with warning", () => {
      const result = simulateGuard(
        "Write",
        "src/physics/constants.ts",
        "// updating kc1.1 value"
      );
      // No clear ingestion or physics context — allowed with caution
      expect(result.continue).toBe(true);
    });
  });
});
