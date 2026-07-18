/**
 * ReadOptimizerEngine — Optimal file reading strategy advisor
 *
 * Given a file path and intent, recommends the most token-efficient
 * approach: full read, offset/limit, grep, digest, or skip.
 *
 * Token savings: Prevents over-reading by matching strategy to intent.
 *
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";

export type ReadStrategy = "full" | "offset" | "grep" | "digest" | "skip";

export interface ReadRecommendation {
  strategy: ReadStrategy;
  reason: string;
  estimatedTokens: number;
  params?: Record<string, unknown>;
}

// Typical token costs per strategy
const STRATEGY_BASE: Record<ReadStrategy, number> = {
  full: 0,     // proportional to file size
  offset: 500, // fixed overhead + limited read
  grep: 300,   // pattern match overhead
  digest: 200, // structural summary
  skip: 0,     // no cost
};

// Files to always skip
const SKIP_PATTERNS = [
  /node_modules\//i,
  /\.git\/objects\//i,
  /dist\//i,
  /\.min\.(js|css)$/i,
  /\.map$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
];

// Known large files in PRISM
const KNOWN_LARGE: Record<string, number> = {
  "index.ts": 2400,           // engines barrel
  "manufacturingCalculations.ts": 3000,
  "machine-profiles-catalog-ext.ts": 5000,
  "osg-tool-catalog.ts": 15000,
  "guhring-tool-catalog.ts": 8000,
  "sandvik-tool-catalog.ts": 6000,
  "haimer-holder-catalog.ts": 4000,
};

export class ReadOptimizerEngine {

  /**
   * Recommend optimal read strategy for a file.
   */
  recommend(filePath: string, intent?: string): ReadRecommendation {
    const normalized = filePath.replace(/\\/g, "/");
    const basename = path.basename(normalized);

    // Check skip patterns
    for (const pattern of SKIP_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          strategy: "skip",
          reason: `File matches skip pattern: ${pattern.source}`,
          estimatedTokens: 0,
        };
      }
    }

    // Get file size
    let fileSize = 0;
    let lineCount = 0;
    try {
      const stats = fs.statSync(filePath);
      fileSize = stats.size;
      lineCount = Math.ceil(fileSize / 80); // rough estimate
    } catch {
      // File might not exist yet
      return { strategy: "full", reason: "File not found on disk", estimatedTokens: 500 };
    }

    const estimatedTokens = Math.ceil(fileSize / 4);

    // Check known large files
    if (KNOWN_LARGE[basename]) {
      const lines = KNOWN_LARGE[basename];
      if (intent) {
        return {
          strategy: "grep",
          reason: `Known large file (~${lines} lines). Grep for '${intent}' instead.`,
          estimatedTokens: 300,
          params: { pattern: intent, path: filePath, output_mode: "content", context: 5 },
        };
      }
      return {
        strategy: "digest",
        reason: `Known large file (~${lines} lines). Use digest for structure overview.`,
        estimatedTokens: 200,
      };
    }

    // Size-based recommendations
    if (fileSize > 50000) { // 50KB+
      return {
        strategy: intent ? "grep" : "digest",
        reason: `Very large file (${Math.round(fileSize/1024)}KB, ~${lineCount} lines). ${intent ? "Grep" : "Digest"} recommended.`,
        estimatedTokens: intent ? 300 : 200,
        params: intent ? { pattern: intent, path: filePath } : undefined,
      };
    }

    if (fileSize > 15000) { // 15KB+
      if (intent) {
        return {
          strategy: "grep",
          reason: `Large file (${Math.round(fileSize/1024)}KB). Grep for specific content.`,
          estimatedTokens: 300,
          params: { pattern: intent, path: filePath, output_mode: "content", context: 3 },
        };
      }
      return {
        strategy: "offset",
        reason: `Large file (${Math.round(fileSize/1024)}KB, ~${lineCount} lines). Use offset/limit.`,
        estimatedTokens: Math.min(500, estimatedTokens),
        params: { offset: 1, limit: 100 },
      };
    }

    // Small enough for full read
    return {
      strategy: "full",
      reason: `Small file (${Math.round(fileSize/1024)}KB). Full read OK.`,
      estimatedTokens,
    };
  }

  /**
   * Get compact recommendation string.
   */
  oneLiner(filePath: string, intent?: string): string {
    const rec = this.recommend(filePath, intent);
    return `${rec.strategy.toUpperCase()}: ${rec.reason} (~${rec.estimatedTokens} tokens)`;
  }

  /**
   * Batch recommend for multiple files.
   */
  batchRecommend(files: string[], intent?: string): Array<{ file: string } & ReadRecommendation> {
    return files.map(file => ({
      file: path.basename(file),
      ...this.recommend(file, intent),
    }));
  }

  /**
   * Estimate total cost for a batch of reads.
   */
  estimateBatchCost(files: string[]): { total: number; optimized: number; savings: number } {
    let total = 0;
    let optimized = 0;

    for (const file of files) {
      try {
        const size = fs.statSync(file).size;
        total += Math.ceil(size / 4);
      } catch {
        total += 500;
      }
      optimized += this.recommend(file).estimatedTokens;
    }

    return {
      total,
      optimized,
      savings: Math.max(0, total - optimized),
    };
  }
}

export const readOptimizerEngine = new ReadOptimizerEngine();
