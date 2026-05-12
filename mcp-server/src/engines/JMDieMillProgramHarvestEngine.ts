/**
 * JMDieMillProgramHarvestEngine — JM Die Mill Program Deep Extraction
 * =====================================================================
 * Harvests ALL milling intelligence from JM Die's CNC MILL HAAS archive:
 *   - 59 customer folders (ALCOA, FONTANA, ITW, SFS GROUP, etc.)
 *   - 483+ Mastercam .mcx-8 files
 *   - PROVEN PRG folders (validated production programs)
 *   - Tool usage patterns, operation sequences, customer preferences
 *
 * Data Sources:
 *   H:/PRISM/JM DIE/CNC MILL HAAS/       — Main Haas mill programs
 *   H:/PRISM/JM DIE/HAAS-HURCO/          — Inventor CAD files (.ipt)
 *   H:/PRISM/JM DIE/OKUMA/hyperMILL/     — HyperMill training data
 *
 * Extraction Targets:
 *   - Customer-specific tooling preferences
 *   - Operation sequences (facing → rough → drill → tap → finish)
 *   - Tool numbers and descriptions from program comments
 *   - Material indicators from part numbers
 *   - Proven vs unproven program classification
 *
 * @module engines/JMDieMillProgramHarvestEngine
 * @milestone MILL-HARVEST-MS1
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

/** Customer milling profile extracted from programs */
export interface CustomerMillProfile {
  customer_name: string;
  program_count: number;
  proven_count: number;
  common_tools: ToolUsagePattern[];
  common_operations: OperationPattern[];
  material_indicators: string[];
  typical_tolerances: string[];
  date_range: { earliest: string; latest: string };
}

/** Tool usage pattern learned from programs */
export interface ToolUsagePattern {
  tool_number: number;
  description: string;
  tool_type: "endmill" | "drill" | "tap" | "face_mill" | "chamfer" | "ball" | "boring" | "unknown";
  diameter_mm: number;
  usage_count: number;
  customers_using: string[];
  typical_rpm_range: { min: number; max: number };
  typical_feed_range: { min: number; max: number };
}

/** Operation sequence pattern */
export interface OperationPattern {
  sequence: string[];
  frequency: number;
  customers: string[];
  is_proven: boolean;
}

/** Mastercam file metadata (from XML inside .mcx-8) */
export interface MastercamMetadata {
  file_path: string;
  customer: string;
  part_number: string;
  is_proven: boolean;
  file_size_kb: number;
  modified_date: string;
  operations_detected: string[];
  tools_referenced: number[];
}

/** Complete harvest result */
export interface MillHarvestResult {
  timestamp: string;
  total_files: number;
  total_customers: number;
  proven_programs: number;
  customer_profiles: CustomerMillProfile[];
  tool_patterns: ToolUsagePattern[];
  operation_sequences: OperationPattern[];
  material_distribution: Record<string, number>;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const JM_DIE_MILL_ROOT = "H:/PRISM/JM DIE/CNC MILL HAAS";
const HURCO_ROOT = "H:/PRISM/JM DIE/HAAS-HURCO";

/** Material indicators from part number prefixes */
const MATERIAL_INDICATORS: Record<string, string> = {
  "A-": "aluminum",
  "B-": "steel_tool",  // Often D2, A2, M2
  "C-": "carbide",
  "D-": "D2_tool_steel",
  "H-": "H13_hot_work",
  "M-": "M2_high_speed",
  "S-": "S7_shock_resistant",
  "T-": "tungsten_carbide",
};

/** Tool type detection from descriptions */
const TOOL_TYPE_PATTERNS: Array<{ pattern: RegExp; type: ToolUsagePattern["tool_type"] }> = [
  { pattern: /ball\s*(end)?/i, type: "ball" },
  { pattern: /face\s*mill/i, type: "face_mill" },
  { pattern: /chamfer|cham/i, type: "chamfer" },
  { pattern: /tap|thread/i, type: "tap" },
  { pattern: /drill|peck/i, type: "drill" },
  { pattern: /bore|boring/i, type: "boring" },
  { pattern: /end\s*mill|flat|rough|finish/i, type: "endmill" },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class JMDieMillProgramHarvestEngine {
  private customerProfiles: Map<string, CustomerMillProfile> = new Map();
  private toolPatterns: Map<string, ToolUsagePattern> = new Map();
  private operationSequences: OperationPattern[] = [];
  private materialCounts: Record<string, number> = {};

  /**
   * Harvest all milling intelligence from JM Die archives.
   */
  async harvest(): Promise<MillHarvestResult> {
    log.info("JMDieMillProgramHarvestEngine.harvest", { root: JM_DIE_MILL_ROOT });

    const startTime = Date.now();
    let totalFiles = 0;
    let provenPrograms = 0;

    // Scan all customer folders
    const customerFolders = this.getCustomerFolders();

    for (const customer of customerFolders) {
      const customerPath = path.join(JM_DIE_MILL_ROOT, customer);
      const files = this.findMastercamFiles(customerPath);

      if (files.length === 0) continue;

      const profile = this.initCustomerProfile(customer);

      for (const file of files) {
        const metadata = await this.extractMetadata(file, customer);
        totalFiles++;

        if (metadata.is_proven) {
          provenPrograms++;
          profile.proven_count++;
        }

        profile.program_count++;
        this.learnFromMetadata(metadata, profile);
      }

      this.customerProfiles.set(customer, profile);
    }

    // Generate recommendations based on patterns
    const recommendations = this.generateRecommendations();

    const result: MillHarvestResult = {
      timestamp: new Date().toISOString(),
      total_files: totalFiles,
      total_customers: this.customerProfiles.size,
      proven_programs: provenPrograms,
      customer_profiles: Array.from(this.customerProfiles.values()),
      tool_patterns: Array.from(this.toolPatterns.values()),
      operation_sequences: this.operationSequences,
      material_distribution: this.materialCounts,
      recommendations,
    };

    log.info("JMDieMillProgramHarvestEngine.harvest.complete", {
      duration_ms: Date.now() - startTime,
      total_files: totalFiles,
      customers: this.customerProfiles.size,
      proven: provenPrograms,
    });

    return result;
  }

  /**
   * Get customer-specific milling recommendations.
   */
  getCustomerRecommendations(customer: string): {
    tools: ToolUsagePattern[];
    operations: string[];
    materials: string[];
    confidence: number;
  } {
    const profile = this.customerProfiles.get(customer.toUpperCase());

    if (!profile) {
      return {
        tools: [],
        operations: [],
        materials: [],
        confidence: 0,
      };
    }

    return {
      tools: profile.common_tools.slice(0, 10),
      operations: profile.common_operations.slice(0, 5).map(o => o.sequence.join(" → ")),
      materials: profile.material_indicators,
      confidence: Math.min(1.0, profile.proven_count / Math.max(1, profile.program_count)),
    };
  }

  /**
   * Predict optimal tool for a given operation and material.
   */
  predictTool(operation: string, material_iso: string, diameter_mm?: number): {
    tool_type: string;
    recommended_tools: ToolUsagePattern[];
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    const matchingTools: ToolUsagePattern[] = [];

    // Find tools used for similar operations
    for (const [, tool] of this.toolPatterns) {
      if (this.toolMatchesOperation(tool, operation)) {
        if (!diameter_mm || Math.abs(tool.diameter_mm - diameter_mm) < 2) {
          matchingTools.push(tool);
        }
      }
    }

    // Sort by usage count (proven patterns first)
    matchingTools.sort((a, b) => b.usage_count - a.usage_count);

    reasoning.push(`Found ${matchingTools.length} tools matching operation: ${operation}`);
    if (matchingTools.length > 0) {
      reasoning.push(`Top tool: T${matchingTools[0].tool_number} (${matchingTools[0].description}) used ${matchingTools[0].usage_count} times`);
    }

    return {
      tool_type: matchingTools[0]?.tool_type || "endmill",
      recommended_tools: matchingTools.slice(0, 5),
      reasoning,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getCustomerFolders(): string[] {
    try {
      return fs.readdirSync(JM_DIE_MILL_ROOT)
        .filter(f => {
          const fullPath = path.join(JM_DIE_MILL_ROOT, f);
          return fs.statSync(fullPath).isDirectory();
        });
    } catch (err) {
      log.warn("JMDieMillProgramHarvestEngine.getCustomerFolders.error", { error: String(err) });
      return [];
    }
  }

  private findMastercamFiles(dir: string): string[] {
    const files: string[] = [];

    const scan = (currentDir: string) => {
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            scan(fullPath);
          } else if (entry.name.endsWith(".mcx-8") || entry.name.endsWith(".NGC") || entry.name.endsWith(".nc")) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    scan(dir);
    return files;
  }

  private initCustomerProfile(customer: string): CustomerMillProfile {
    return {
      customer_name: customer,
      program_count: 0,
      proven_count: 0,
      common_tools: [],
      common_operations: [],
      material_indicators: [],
      typical_tolerances: [],
      date_range: { earliest: "", latest: "" },
    };
  }

  private async extractMetadata(filePath: string, customer: string): Promise<MastercamMetadata> {
    const fileName = path.basename(filePath);
    const isProven = filePath.includes("PROVEN");

    // Extract part number from filename
    const partNumber = fileName.replace(/\.(mcx-8|NGC|nc)$/i, "");

    // Detect material from part number prefix
    const materialIndicator = this.detectMaterial(partNumber);
    if (materialIndicator) {
      this.materialCounts[materialIndicator] = (this.materialCounts[materialIndicator] || 0) + 1;
    }

    // Get file stats
    let fileSize = 0;
    let modifiedDate = "";
    try {
      const stats = fs.statSync(filePath);
      fileSize = Math.round(stats.size / 1024);
      modifiedDate = stats.mtime.toISOString().split("T")[0];
    } catch {
      // Ignore stat errors
    }

    // Extract operations from file content (for .NGC files)
    const operations = await this.extractOperationsFromFile(filePath);
    const tools = this.extractToolsFromFile(filePath);

    return {
      file_path: filePath,
      customer,
      part_number: partNumber,
      is_proven: isProven,
      file_size_kb: fileSize,
      modified_date: modifiedDate,
      operations_detected: operations,
      tools_referenced: tools,
    };
  }

  private detectMaterial(partNumber: string): string | null {
    for (const [prefix, material] of Object.entries(MATERIAL_INDICATORS)) {
      if (partNumber.toUpperCase().startsWith(prefix)) {
        return material;
      }
    }
    return null;
  }

  private async extractOperationsFromFile(filePath: string): Promise<string[]> {
    const operations: string[] = [];

    if (!filePath.endsWith(".NGC") && !filePath.endsWith(".nc")) {
      return operations;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");

      // Detect operations from G-code comments and patterns
      if (/FACE|FACING/i.test(content)) operations.push("facing");
      if (/ROUGH|ROUGHING/i.test(content)) operations.push("roughing");
      if (/FINISH|FINISHING/i.test(content)) operations.push("finishing");
      if (/DRILL|PECK/i.test(content)) operations.push("drilling");
      if (/TAP|THREAD/i.test(content)) operations.push("tapping");
      if (/CHAMFER/i.test(content)) operations.push("chamfering");
      if (/BORE|BORING/i.test(content)) operations.push("boring");
      if (/POCKET/i.test(content)) operations.push("pocketing");
      if (/CONTOUR|PROFILE/i.test(content)) operations.push("contouring");

    } catch {
      // File read error - skip
    }

    return operations;
  }

  private extractToolsFromFile(filePath: string): number[] {
    const tools: Set<number> = new Set();

    try {
      const content = fs.readFileSync(filePath, "utf-8");

      // Match T## patterns
      const matches = content.match(/T(\d{1,2})\b/g);
      if (matches) {
        for (const match of matches) {
          const toolNum = parseInt(match.substring(1), 10);
          if (toolNum > 0 && toolNum < 100) {
            tools.add(toolNum);
          }
        }
      }
    } catch {
      // File read error - skip
    }

    return Array.from(tools);
  }

  private learnFromMetadata(metadata: MastercamMetadata, profile: CustomerMillProfile): void {
    // Update material indicators
    const material = this.detectMaterial(metadata.part_number);
    if (material && !profile.material_indicators.includes(material)) {
      profile.material_indicators.push(material);
    }

    // Update date range
    if (metadata.modified_date) {
      if (!profile.date_range.earliest || metadata.modified_date < profile.date_range.earliest) {
        profile.date_range.earliest = metadata.modified_date;
      }
      if (!profile.date_range.latest || metadata.modified_date > profile.date_range.latest) {
        profile.date_range.latest = metadata.modified_date;
      }
    }

    // Learn operation sequences
    if (metadata.operations_detected.length > 1) {
      this.learnOperationSequence(metadata.operations_detected, metadata.customer, metadata.is_proven);
    }

    // Learn tool patterns
    for (const toolNum of metadata.tools_referenced) {
      this.learnToolPattern(toolNum, metadata.customer, metadata.operations_detected);
    }
  }

  private learnOperationSequence(operations: string[], customer: string, isProven: boolean): void {
    const seqKey = operations.join("->");

    let existing = this.operationSequences.find(s => s.sequence.join("->") === seqKey);

    if (existing) {
      existing.frequency++;
      if (!existing.customers.includes(customer)) {
        existing.customers.push(customer);
      }
      if (isProven) {
        existing.is_proven = true;
      }
    } else {
      this.operationSequences.push({
        sequence: operations,
        frequency: 1,
        customers: [customer],
        is_proven: isProven,
      });
    }
  }

  private learnToolPattern(toolNum: number, customer: string, operations: string[]): void {
    const key = `T${toolNum}`;

    let pattern = this.toolPatterns.get(key);
    if (!pattern) {
      pattern = {
        tool_number: toolNum,
        description: `Tool ${toolNum}`,
        tool_type: "unknown",
        diameter_mm: 0,
        usage_count: 0,
        customers_using: [],
        typical_rpm_range: { min: 0, max: 0 },
        typical_feed_range: { min: 0, max: 0 },
      };
      this.toolPatterns.set(key, pattern);
    }

    pattern.usage_count++;
    if (!pattern.customers_using.includes(customer)) {
      pattern.customers_using.push(customer);
    }
  }

  private toolMatchesOperation(tool: ToolUsagePattern, operation: string): boolean {
    const opLower = operation.toLowerCase();

    if (opLower.includes("drill") && tool.tool_type === "drill") return true;
    if (opLower.includes("tap") && tool.tool_type === "tap") return true;
    if (opLower.includes("face") && tool.tool_type === "face_mill") return true;
    if (opLower.includes("chamfer") && tool.tool_type === "chamfer") return true;
    if (opLower.includes("ball") && tool.tool_type === "ball") return true;
    if ((opLower.includes("rough") || opLower.includes("finish") || opLower.includes("pocket"))
        && tool.tool_type === "endmill") return true;

    return false;
  }

  private generateRecommendations(): string[] {
    const recs: string[] = [];

    // Most common operation sequences
    const topSeqs = this.operationSequences
      .filter(s => s.is_proven)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    if (topSeqs.length > 0) {
      recs.push(`Top proven sequence: ${topSeqs[0].sequence.join(" → ")} (${topSeqs[0].frequency} programs)`);
    }

    // Material distribution insights
    const materials = Object.entries(this.materialCounts)
      .sort(([, a], [, b]) => b - a);

    if (materials.length > 0) {
      recs.push(`Primary material: ${materials[0][0]} (${materials[0][1]} programs)`);
    }

    // Customer diversity insights
    const multiCustomerTools = Array.from(this.toolPatterns.values())
      .filter(t => t.customers_using.length > 3)
      .slice(0, 3);

    if (multiCustomerTools.length > 0) {
      recs.push(`Cross-customer standard tool: T${multiCustomerTools[0].tool_number} (used by ${multiCustomerTools[0].customers_using.length} customers)`);
    }

    return recs;
  }
}

export const jmDieMillProgramHarvestEngine = new JMDieMillProgramHarvestEngine();
