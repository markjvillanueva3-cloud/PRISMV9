/**
 * CustomerPortfolioMinerEngine — Customer Defaults from JM Die Archive
 *
 * RES-MS21: Mines the JM DIE/CNC LATHE/{CUSTOMER}/ folder structure to build
 * customer profiles with historical machining patterns. When a repeat job comes
 * in for a known customer, PRISM pre-fills defaults (material, operations,
 * typical feeds/speeds, machine preferences) from their historical patterns.
 *
 * Data source: 118 customer folders, ~15,599 .MIN lathe programs
 * Depends on: NCPatternMinerEngine (RES-MS11) for per-program parsing
 *
 * @module CustomerPortfolioMinerEngine
 */

import { readdir, stat } from "fs/promises";
import path from "path";
import { NCPatternMinerEngine } from "./NCPatternMinerEngine.js";
import type { ProgramParseResult, ParsedTool, ParsedOp } from "./NCPatternMinerEngine.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Statistical summary for a numeric field. */
export interface NumericStats {
  min: number;
  max: number;
  median: number;
  mean: number;
  count: number;
}

/** Tool preference for a customer (which tools they use most). */
export interface ToolPreference {
  toolNumber: number;
  description: string;
  operationType: string;
  usageCount: number;
  usagePercent: number;
}

/** Operation pattern for a customer. */
export interface OperationPattern {
  type: string;
  frequency: number;
  frequencyPercent: number;
}

/** A single customer's mined profile. */
export interface CustomerProfile {
  /** Customer name (folder name) */
  name: string;
  /** Total .MIN programs in their folder */
  programCount: number;
  /** Programs successfully parsed */
  parsedCount: number;
  /** Top tool preferences (sorted by usage) */
  toolPreferences: ToolPreference[];
  /** Operation type breakdown */
  operationPatterns: OperationPattern[];
  /** Feed rate statistics (IPR) across all programs */
  feedStats: NumericStats | null;
  /** Spindle speed statistics (RPM) */
  spindleRpmStats: NumericStats | null;
  /** CSS speed statistics (SFM) */
  cssSfmStats: NumericStats | null;
  /** Max RPM clamp statistics */
  maxClampStats: NumericStats | null;
  /** Whether customer uses G85/G87 roughing-finishing cycles */
  usesRoughFinishCycles: boolean;
  /** Percentage of programs using G85/G87 */
  roughFinishCyclePercent: number;
  /** Whether customer uses threading (G76) */
  usesThreading: boolean;
  /** Average tools per program */
  avgToolsPerProgram: number;
  /** Average operations per program */
  avgOpsPerProgram: number;
  /** Tier classification based on program count */
  tier: "platinum" | "gold" | "silver" | "bronze";
}

/** Full result of portfolio mining. */
export interface PortfolioMineResult {
  customers: CustomerProfile[];
  totalCustomers: number;
  totalPrograms: number;
  totalParsed: number;
  byTier: Record<string, number>;
  topCustomers: Array<{ name: string; programCount: number }>;
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const JM_DIE_CNC_LATHE = "H:/PRISM/JM DIE/CNC LATHE";

/** Max .MIN files to parse per customer (for speed). */
const MAX_PROGRAMS_PER_CUSTOMER = 200;

// ============================================================================
// HELPERS
// ============================================================================

function computeStats(values: number[]): NumericStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    mean: sum / sorted.length,
    count: sorted.length,
  };
}

function classifyTier(programCount: number): "platinum" | "gold" | "silver" | "bronze" {
  if (programCount >= 500) return "platinum";
  if (programCount >= 200) return "gold";
  if (programCount >= 50) return "silver";
  return "bronze";
}

// ============================================================================
// ENGINE
// ============================================================================

export class CustomerPortfolioMinerEngine {
  /**
   * Returns source info for the JM Die CNC Lathe archive.
   */
  static getSources() {
    return {
      rootPath: JM_DIE_CNC_LATHE,
      expectedCustomers: 118,
      expectedPrograms: 15599,
      description: "JM Die CNC LATHE archive — 118 customer folders with ~15,599 .MIN programs",
    };
  }

  /**
   * Lists all customer folder names under CNC LATHE.
   */
  static async listCustomers(): Promise<string[]> {
    try {
      const entries = await readdir(JM_DIE_CNC_LATHE, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
    } catch {
      log.warn("CustomerPortfolioMinerEngine: CNC LATHE directory not accessible");
      return [];
    }
  }

  /**
   * Mine a single customer's folder to build a profile.
   */
  static async mineCustomer(customerName: string): Promise<CustomerProfile> {
    const customerDir = path.join(JM_DIE_CNC_LATHE, customerName);

    // List .MIN files in customer folder
    let allMinFiles: string[] = [];
    try {
      const entries = await readdir(customerDir);
      allMinFiles = entries.filter((f) => f.toUpperCase().endsWith(".MIN"));
    } catch {
      return makeEmptyProfile(customerName, 0);
    }

    if (allMinFiles.length === 0) {
      return makeEmptyProfile(customerName, 0);
    }

    // Parse up to MAX but track total count
    const totalCount = allMinFiles.length;
    const minFiles = allMinFiles.slice(0, MAX_PROGRAMS_PER_CUSTOMER);

    // Parse each program
    const parsed: ProgramParseResult[] = [];
    for (const file of minFiles) {
      try {
        const { readFile } = await import("fs/promises");
        const content = await readFile(path.join(customerDir, file), "utf-8");
        const result = NCPatternMinerEngine.parseProgram(content, path.join(customerDir, file));
        parsed.push(result);
      } catch {
        // skip unparseable
      }
    }

    if (parsed.length === 0) {
      return makeEmptyProfile(customerName, minFiles.length);
    }

    // Aggregate tool preferences
    const toolCounts = new Map<string, { tool: ParsedTool; count: number }>();
    for (const p of parsed) {
      for (const t of p.tools) {
        const key = `T${t.toolNumber}-${t.operationType}`;
        const existing = toolCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          toolCounts.set(key, { tool: t, count: 1 });
        }
      }
    }

    const toolPreferences: ToolPreference[] = [...toolCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((tc) => ({
        toolNumber: tc.tool.toolNumber,
        description: tc.tool.description,
        operationType: tc.tool.operationType,
        usageCount: tc.count,
        usagePercent: (tc.count / parsed.length) * 100,
      }));

    // Aggregate operation patterns
    const opCounts = new Map<string, number>();
    let totalOps = 0;
    for (const p of parsed) {
      for (const op of p.operations) {
        opCounts.set(op.type, (opCounts.get(op.type) ?? 0) + 1);
        totalOps++;
      }
    }

    const operationPatterns: OperationPattern[] = [...opCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, frequency]) => ({
        type,
        frequency,
        frequencyPercent: totalOps > 0 ? (frequency / totalOps) * 100 : 0,
      }));

    // Aggregate feed rates
    const feedValues: number[] = [];
    const rpmValues: number[] = [];
    const cssValues: number[] = [];
    const clampValues: number[] = [];
    let roughFinishCount = 0;
    let threadingCount = 0;

    for (const p of parsed) {
      for (const op of p.operations) {
        if (op.feedRate !== null && op.feedRate > 0) feedValues.push(op.feedRate);
        if (op.spindleMode === "rpm" && op.spindleSpeed !== null && op.spindleSpeed > 0) {
          rpmValues.push(op.spindleSpeed);
        }
        if (op.spindleMode === "css" && op.spindleSpeed !== null && op.spindleSpeed > 0) {
          cssValues.push(op.spindleSpeed);
        }
        if (op.maxRpm !== null && op.maxRpm > 0) clampValues.push(op.maxRpm);
      }

      // Check for rough-finish cycles
      const hasG85 = p.operations.some((op) => op.type === "G85");
      const hasG87 = p.operations.some((op) => op.type === "G87");
      if (hasG85 || hasG87) roughFinishCount++;

      // Check for threading
      if (p.operations.some((op) => op.type === "G76")) threadingCount++;
    }

    const totalTools = parsed.reduce((sum, p) => sum + p.tools.length, 0);

    return {
      name: customerName,
      programCount: totalCount,
      parsedCount: parsed.length,
      toolPreferences,
      operationPatterns,
      feedStats: computeStats(feedValues),
      spindleRpmStats: computeStats(rpmValues),
      cssSfmStats: computeStats(cssValues),
      maxClampStats: computeStats(clampValues),
      usesRoughFinishCycles: roughFinishCount > 0,
      roughFinishCyclePercent: (roughFinishCount / parsed.length) * 100,
      usesThreading: threadingCount > 0,
      avgToolsPerProgram: totalTools / parsed.length,
      avgOpsPerProgram: totalOps / parsed.length,
      tier: classifyTier(totalCount),
    };
  }

  /**
   * Mine all 118 customers. This is the main harvest method.
   * @param maxCustomers - Limit number of customers to mine (for testing, default all)
   */
  static async harvest(maxCustomers?: number): Promise<PortfolioMineResult> {
    const customers = await this.listCustomers();
    const toMine = maxCustomers ? customers.slice(0, maxCustomers) : customers;

    const profiles: CustomerProfile[] = [];
    let totalPrograms = 0;
    let totalParsed = 0;

    for (const customer of toMine) {
      try {
        const profile = await this.mineCustomer(customer);
        profiles.push(profile);
        totalPrograms += profile.programCount;
        totalParsed += profile.parsedCount;
      } catch (err) {
        log.warn(`CustomerPortfolioMinerEngine: failed to mine ${customer}: ${err}`);
      }
    }

    // Tier breakdown
    const byTier: Record<string, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    for (const p of profiles) {
      byTier[p.tier]++;
    }

    // Top customers by program count
    const topCustomers = [...profiles]
      .sort((a, b) => b.programCount - a.programCount)
      .slice(0, 20)
      .map((p) => ({ name: p.name, programCount: p.programCount }));

    return {
      customers: profiles,
      totalCustomers: profiles.length,
      totalPrograms,
      totalParsed,
      byTier,
      topCustomers,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Quick audit: mine a small sample and return summary.
   */
  static async audit(): Promise<{
    totalCustomers: number;
    sampleSize: number;
    totalPrograms: number;
    totalParsed: number;
    byTier: Record<string, number>;
    topCustomers: Array<{ name: string; programCount: number }>;
    avgToolsPerProgram: number;
    roughFinishCycleUsage: number;
  }> {
    // Mine top 10 customers for audit
    const result = await this.harvest(10);
    const avgTools =
      result.customers.length > 0
        ? result.customers.reduce((s, c) => s + c.avgToolsPerProgram, 0) / result.customers.length
        : 0;
    const rfUsage =
      result.customers.length > 0
        ? result.customers.reduce((s, c) => s + c.roughFinishCyclePercent, 0) / result.customers.length
        : 0;

    return {
      totalCustomers: (await this.listCustomers()).length,
      sampleSize: result.totalCustomers,
      totalPrograms: result.totalPrograms,
      totalParsed: result.totalParsed,
      byTier: result.byTier,
      topCustomers: result.topCustomers,
      avgToolsPerProgram: avgTools,
      roughFinishCycleUsage: rfUsage,
    };
  }

  /**
   * Get profile for a specific customer by name (case-insensitive search).
   */
  static async getCustomerProfile(nameQuery: string): Promise<CustomerProfile | null> {
    const customers = await this.listCustomers();
    const match = customers.find(
      (c) => c.toLowerCase() === nameQuery.toLowerCase()
    );
    if (!match) return null;
    return this.mineCustomer(match);
  }

  /**
   * Get all customers above a given tier.
   */
  static filterByTier(
    profiles: CustomerProfile[],
    minTier: "platinum" | "gold" | "silver" | "bronze"
  ): CustomerProfile[] {
    const tierOrder = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
    const minLevel = tierOrder[minTier];
    return profiles.filter((p) => tierOrder[p.tier] >= minLevel);
  }
}

// ============================================================================
// HELPERS (private)
// ============================================================================

function makeEmptyProfile(name: string, programCount: number): CustomerProfile {
  return {
    name,
    programCount,
    parsedCount: 0,
    toolPreferences: [],
    operationPatterns: [],
    feedStats: null,
    spindleRpmStats: null,
    cssSfmStats: null,
    maxClampStats: null,
    usesRoughFinishCycles: false,
    roughFinishCyclePercent: 0,
    usesThreading: false,
    avgToolsPerProgram: 0,
    avgOpsPerProgram: 0,
    tier: classifyTier(programCount),
  };
}
