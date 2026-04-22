/**
 * ingestion-cache-root-guard.test.ts — Tests for CAM-UIX-INFRA-00/U-CACHEROOT01
 *
 * Validates that ingestion content is routed to data/ingestion_cache/
 * and not scattered across the codebase.
 */
import { describe, it, expect } from "vitest";

// Inline the guard logic for testing (hook runs as separate process)
const ALLOWED_INGESTION_ROOTS = [
  "mcp-server/data/ingestion_cache",
  "data/ingestion_cache",
];

const INGESTION_CONTENT_PATTERNS = [
  /ingest/i,
  /scrape/i,
  /crawl/i,
  /fetch.*content/i,
  /"source_url"\s*:/,
  /"fetched_at"\s*:/,
  /"crawl_session"/,
  /"ingest_run_id"/,
  /CAMDocScrape/,
  /CAMForum/,
  /CAMTradePress/,
  /CAMCertCurriculum/,
  /CAMSdk/,
  /CAMPostLibrary/,
  /CAMSampleReverse/,
  /CAMPatent/,
  /CAMStandards/,
  /CAMSocialEvent/,
  /CAMVendorTraining/,
];

const EXCLUDED_PATHS = [
  /\.claude\/hooks\//,
  /\.claude\/helpers\//,
  /src\/engines\//,
  /src\/__tests__\//,
  /scripts\//,
  /\.md$/,
  /\.ts$/,
  /\.mjs$/,
  /settings\.json$/,
];

function isIngestionContent(content: string): boolean {
  if (!content) return false;
  return INGESTION_CONTENT_PATTERNS.some((re) => re.test(content));
}

function isAllowedIngestionPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return ALLOWED_INGESTION_ROOTS.some((root) =>
    normalized.includes(root.toLowerCase())
  );
}

function isExcludedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return EXCLUDED_PATHS.some((re) => re.test(normalized));
}

function isDataStateWrite(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return (
    (normalized.includes("data/state") || normalized.includes("mcp-server/data/state")) &&
    !normalized.includes("ingestion_cache")
  );
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

  if (isExcludedPath(filePath)) {
    return { continue: true };
  }

  if (!isIngestionContent(content)) {
    return { continue: true };
  }

  if (isAllowedIngestionPath(filePath)) {
    return { continue: true };
  }

  if (isDataStateWrite(filePath)) {
    return {
      continue: false,
      decision: "block",
      reason: `Ingestion content cannot be written to data/state/ — use data/ingestion_cache/ instead. File: ${filePath}`,
    };
  }

  return {
    continue: false,
    decision: "block",
    reason: `Ingestion content scattered outside data/ingestion_cache/. Move to: mcp-server/data/ingestion_cache/. Current path: ${filePath}`,
  };
}

describe("ingestion-cache-root-guard", () => {
  describe("tool filtering", () => {
    it("ignores Read tool", () => {
      const result = simulateGuard("Read", "src/bad.json", '{"ingest_run_id": "123"}');
      expect(result.continue).toBe(true);
    });

    it("ignores Bash tool", () => {
      const result = simulateGuard("Bash", "src/bad.json", '{"scrape": true}');
      expect(result.continue).toBe(true);
    });

    it("processes Write tool", () => {
      const result = simulateGuard("Write", "src/bad.json", '{"ingest_run_id": "123"}');
      expect(result.continue).toBe(false);
    });

    it("processes Edit tool", () => {
      const result = simulateGuard("Edit", "src/bad.json", '{"crawl_session": "abc"}');
      expect(result.continue).toBe(false);
    });

    it("processes MultiEdit tool", () => {
      const result = simulateGuard("MultiEdit", "src/bad.json", '{"CAMDocScrape": true}');
      expect(result.continue).toBe(false);
    });
  });

  describe("ingestion content detection", () => {
    it("detects ingest keyword", () => {
      expect(isIngestionContent('{"ingest": true}')).toBe(true);
    });

    it("detects scrape keyword", () => {
      expect(isIngestionContent('{"scrape_result": "data"}')).toBe(true);
    });

    it("detects crawl keyword", () => {
      expect(isIngestionContent('{"crawl_depth": 3}')).toBe(true);
    });

    it("detects source_url field", () => {
      expect(isIngestionContent('{"source_url": "https://example.com"}')).toBe(true);
    });

    it("detects fetched_at field", () => {
      expect(isIngestionContent('{"fetched_at": "2026-04-22T00:00:00Z"}')).toBe(true);
    });

    it("detects crawl_session field", () => {
      expect(isIngestionContent('{"crawl_session": "abc123"}')).toBe(true);
    });

    it("detects ingest_run_id field", () => {
      expect(isIngestionContent('{"ingest_run_id": "run-456"}')).toBe(true);
    });

    it("detects CAMDocScrape source", () => {
      expect(isIngestionContent('{"source": "CAMDocScrape"}')).toBe(true);
    });

    it("detects CAMForum source", () => {
      expect(isIngestionContent('{"source": "CAMForum"}')).toBe(true);
    });

    it("detects CAMTradePress source", () => {
      expect(isIngestionContent('{"source": "CAMTradePress"}')).toBe(true);
    });

    it("detects CAMSampleReverse source", () => {
      expect(isIngestionContent('{"source": "CAMSampleReverse"}')).toBe(true);
    });

    it("does not flag normal content", () => {
      expect(isIngestionContent('{"name": "tool", "diameter": 10}')).toBe(false);
    });
  });

  describe("path validation", () => {
    it("allows write to data/ingestion_cache/", () => {
      const result = simulateGuard(
        "Write",
        "mcp-server/data/ingestion_cache/scrape_results.json",
        '{"scrape": true}'
      );
      expect(result.continue).toBe(true);
    });

    it("allows write to data/ingestion_cache subdirectory", () => {
      const result = simulateGuard(
        "Write",
        "data/ingestion_cache/s1/vendor_docs.json",
        '{"ingest_run_id": "123"}'
      );
      expect(result.continue).toBe(true);
    });

    it("blocks write to src/", () => {
      const result = simulateGuard(
        "Write",
        "src/data/scraped.json",
        '{"scrape": true}'
      );
      expect(result.continue).toBe(false);
      expect(result.decision).toBe("block");
    });

    it("blocks write to data/state/ with ingestion content", () => {
      const result = simulateGuard(
        "Write",
        "mcp-server/data/state/scraped_data.json",
        '{"ingest_run_id": "123"}'
      );
      expect(result.continue).toBe(false);
      expect(result.reason).toContain("data/state/");
    });

    it("blocks write to random location", () => {
      const result = simulateGuard(
        "Write",
        "temp/scrape_output.json",
        '{"crawl_session": "abc"}'
      );
      expect(result.continue).toBe(false);
    });
  });

  describe("excluded paths", () => {
    it("excludes .claude/hooks/", () => {
      expect(isExcludedPath(".claude/hooks/test.mjs")).toBe(true);
    });

    it("excludes .claude/helpers/", () => {
      expect(isExcludedPath(".claude/helpers/helper.mjs")).toBe(true);
    });

    it("excludes src/engines/", () => {
      expect(isExcludedPath("src/engines/IngestEngine.ts")).toBe(true);
    });

    it("excludes src/__tests__/", () => {
      expect(isExcludedPath("src/__tests__/ingest.test.ts")).toBe(true);
    });

    it("excludes .md files", () => {
      expect(isExcludedPath("docs/ingest.md")).toBe(true);
    });

    it("excludes .ts files", () => {
      expect(isExcludedPath("src/ingest.ts")).toBe(true);
    });

    it("excludes settings.json", () => {
      expect(isExcludedPath(".claude/settings.json")).toBe(true);
    });

    it("allows .ts files in excluded paths to have ingestion content", () => {
      const result = simulateGuard(
        "Write",
        "src/engines/IngestEngine.ts",
        'const ingest_run_id = "123";'
      );
      expect(result.continue).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty content", () => {
      const result = simulateGuard("Write", "src/data.json", "");
      expect(result.continue).toBe(true);
    });

    it("handles Windows paths", () => {
      const result = simulateGuard(
        "Write",
        "H:\\PRISM\\mcp-server\\data\\ingestion_cache\\test.json",
        '{"scrape": true}'
      );
      expect(result.continue).toBe(true);
    });

    it("handles mixed case paths", () => {
      const result = simulateGuard(
        "Write",
        "MCP-SERVER/Data/Ingestion_Cache/test.json",
        '{"scrape": true}'
      );
      expect(result.continue).toBe(true);
    });

    it("non-ingestion content can go anywhere", () => {
      const result = simulateGuard(
        "Write",
        "src/data/tools.json",
        '{"tools": [{"name": "endmill", "diameter": 10}]}'
      );
      expect(result.continue).toBe(true);
    });
  });
});
