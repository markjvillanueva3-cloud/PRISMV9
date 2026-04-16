/**
 * WEDMBatchProgramAnalyzerEngine - Comprehensive Wire EDM Program Batch Analysis
 *
 * Systematically processes ALL Wire EDM programs in the JM DIE archive (~4,000+ files)
 * to build manufacturing intelligence databases for AI training and pattern mining.
 *
 * Features:
 *   - Full archive harvesting (H:/PRISM/JM DIE/WIRE EDM/)
 *   - Per-program NC code analysis using WireEDMProgramParserEngine
 *   - Statistical aggregation (E-codes, offsets, feeds, passes)
 *   - Quality scoring (completeness, correctness, optimization, safety)
 *   - Customer-specific pattern extraction
 *   - Deep learning training data generation
 *
 * Output Files:
 *   - data/state/WEDM_BATCH_ANALYSIS.json - Full analysis results
 *   - data/wedm-intelligence/program-patterns.json - Aggregated patterns
 *   - data/wedm-intelligence/customer-profiles.json - Per-customer stats
 *
 * References:
 *   - WireEDMProgramParserEngine (NC parsing)
 *   - Mitsubishi M800/MV Series Programming Manual
 *   - JM Die Company shop practices
 *
 * @module engines/WEDMBatchProgramAnalyzerEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import {
  wireEDMProgramParserEngine,
  WireEDMProgram,
  WireEDMDialect,
} from "./WireEDMProgramParserEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Analysis result for a single program */
export interface WEDMProgramAnalysis {
  filePath: string;
  fileName: string;
  customerName: string;
  fileExtension: string;
  fileSizeBytes: number;
  lineCount: number;

  // Dialect detection
  dialect: WireEDMDialect;
  dialectConfidence: number;

  // Code extraction
  eCodes: string[];
  hRegisters: Record<number, number>;
  mCodes: string[];
  gCodes: string[];
  feedRates: number[];
  passCount: number;

  // Feature flags
  hasTaper: boolean;
  hasAdaptiveControl: boolean;
  hasTankManagement: boolean;
  hasMultiPass: boolean;
  hasSubmergedCut: boolean;

  // Quality scoring (0-100)
  qualityScore: number;
  completenessScore: number;
  correctnessScore: number;
  optimizationScore: number;
  safetyScore: number;
  warnings: string[];

  // Derived metrics
  estimatedThicknessCategory: "thin" | "medium" | "thick" | "unknown";
  wireBreakRiskLevel: "low" | "medium" | "high" | "unknown";
  complexityScore: number;

  // Timestamp
  analyzedAt: string;
}

/** Aggregated statistics across all programs */
export interface WEDMBatchStatistics {
  totalProgramsAnalyzed: number;
  totalLinesOfCode: number;
  totalFileSizeBytes: number;

  // Dialect distribution
  dialectDistribution: Record<WireEDMDialect, number>;

  // E-code frequency
  eCodeFrequency: Record<string, number>;
  topECodes: Array<{ code: string; count: number }>;

  // Pass count distribution
  passCountDistribution: Record<number, number>;
  averagePassCount: number;

  // Offset value statistics
  offsetStatistics: {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
    byPass: Record<string, { min: number; max: number; mean: number }>;
  };

  // Feed rate statistics
  feedRateStatistics: {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
  };

  // M-code frequency
  mCodeFrequency: Record<string, number>;

  // G-code frequency
  gCodeFrequency: Record<string, number>;

  // Feature prevalence
  featurePrevalence: {
    taper: number;
    adaptiveControl: number;
    tankManagement: number;
    multiPass: number;
    submergedCut: number;
  };

  // Quality score distribution
  qualityScoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    fair: number; // 50-69
    poor: number; // 0-49
  };

  // File type distribution
  fileTypeDistribution: Record<string, number>;
}

/** Customer-specific profile */
export interface WEDMCustomerProfile {
  customerName: string;
  programCount: number;
  totalLines: number;
  avgPassCount: number;
  dominantDialect: WireEDMDialect;
  commonECodes: string[];
  avgQualityScore: number;
  featureUsage: {
    taper: number;
    adaptiveControl: number;
    multiPass: number;
  };
  typicalThickness: "thin" | "medium" | "thick" | "mixed";
}

/** Complete batch analysis result */
export interface WEDMBatchAnalysisResult {
  schemaVersion: string;
  analysisId: string;
  timestamp: string;
  archivePath: string;

  // Summary
  totalFilesScanned: number;
  totalProgramsAnalyzed: number;
  totalProgramsSkipped: number;
  totalErrors: number;

  // Detailed results
  programs: WEDMProgramAnalysis[];
  statistics: WEDMBatchStatistics;
  customerProfiles: Record<string, WEDMCustomerProfile>;

  // Deep learning training data summary
  trainingDataSummary: {
    totalSamples: number;
    featureCount: number;
    labelTypes: string[];
  };

  // Timing
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

/** Training data sample for ML */
export interface WEDMTrainingDataSample {
  // Input features
  features: {
    passCount: number;
    eCodePrimary: string;
    offsetValue: number;
    feedRate: number;
    hasTaper: boolean;
    hasAdaptiveControl: boolean;
    lineCount: number;
    moveCount: number;
  };

  // Output labels
  labels: {
    qualityScore: number;
    wireBreakRisk: number; // 0-1
    estimatedCycleTimeMinutes: number;
    complexityScore: number;
  };

  // Metadata
  sourceFile: string;
  customer: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default archive path for JM Die Wire EDM programs */
const DEFAULT_ARCHIVE_PATH = "H:/PRISM/JM DIE/WIRE EDM";

/** Valid Wire EDM program extensions */
const VALID_EXTENSIONS = [".NC", ".MIN", ".nc", ".min"];

/** E-code pattern (Mitsubishi 4-digit) */
const E_CODE_PATTERN = /E\d{3,4}/g;

/** H-register pattern */
const H_REGISTER_PATTERN = /H(\d+)\s*=\s*([+-]?[\d.]+)/g;

/** M-code pattern */
const M_CODE_PATTERN = /M\d{1,3}/g;

/** G-code pattern */
const G_CODE_PATTERN = /G\d{1,3}/g;

/** Feed rate pattern */
const FEED_PATTERN = /F([+-]?\.?\d+\.?\d*)/g;

/** Quality thresholds */
const QUALITY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
};

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMBatchProgramAnalyzerEngine {
  private archivePath: string;
  private programs: WEDMProgramAnalysis[] = [];
  private errors: Array<{ file: string; error: string }> = [];

  constructor(archivePath: string = DEFAULT_ARCHIVE_PATH) {
    this.archivePath = archivePath;
  }

  // ────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ────────────────────────────────────────────────────────────────

  /**
   * Harvest all Wire EDM programs from the archive.
   * Recursively scans all customer folders.
   *
   * @returns Array of file paths to NC/MIN programs
   */
  harvestAllPrograms(): string[] {
    const programs: string[] = [];

    const scanDirectory = (dirPath: string): void => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Skip zip archives and hidden folders
            if (!entry.name.endsWith(".zip") && !entry.name.startsWith(".")) {
              scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (VALID_EXTENSIONS.includes(ext)) {
              programs.push(fullPath);
            }
          }
        }
      } catch (error) {
        log.warn(`[WEDMBatchAnalyzer] Failed to scan directory: ${dirPath}`);
      }
    };

    if (fs.existsSync(this.archivePath)) {
      scanDirectory(this.archivePath);
    } else {
      log.error(`[WEDMBatchAnalyzer] Archive path not found: ${this.archivePath}`);
    }

    log.info(`[WEDMBatchAnalyzer] Harvested ${programs.length} Wire EDM programs`);
    return programs;
  }

  /**
   * Analyze a single Wire EDM program file.
   *
   * @param filePath - Absolute path to the NC/MIN file
   * @returns Analysis result or null if parsing fails
   */
  analyzeProgram(filePath: string): WEDMProgramAnalysis | null {
    try {
      // Read file
      const content = fs.readFileSync(filePath, "utf-8");
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath).toUpperCase();

      // Extract customer name from path
      const customerName = this.extractCustomerName(filePath);

      // Parse with existing engine
      const parsed = wireEDMProgramParserEngine.parse(content, fileName);

      // Validate it's actually a Wire EDM program
      if (!this.isWireEDMProgram(content, parsed)) {
        return null; // Skip non-Wire EDM files
      }

      // Extract codes using regex (comprehensive extraction)
      const eCodes = this.extractECodes(content);
      const hRegisters = this.extractHRegisters(content);
      const mCodes = this.extractMCodes(content);
      const gCodes = this.extractGCodes(content);
      const feedRates = this.extractFeedRates(content);

      // Calculate quality scores
      const { completeness, correctness, optimization, safety, warnings } =
        this.calculateQualityScores(parsed, content, eCodes, mCodes);
      const qualityScore = Math.round(
        (completeness + correctness + optimization + safety) / 4
      );

      // Estimate thickness from E-codes
      const estimatedThicknessCategory = this.estimateThickness(eCodes);

      // Estimate wire break risk
      const wireBreakRiskLevel = this.estimateWireBreakRisk(
        parsed,
        feedRates,
        mCodes
      );

      // Calculate complexity score
      const complexityScore = this.calculateComplexity(parsed, eCodes, content);

      return {
        filePath,
        fileName,
        customerName,
        fileExtension,
        fileSizeBytes: stats.size,
        lineCount: parsed.lineCount,

        dialect: parsed.dialect,
        dialectConfidence: parsed.dialect_confidence,

        eCodes,
        hRegisters,
        mCodes,
        gCodes,
        feedRates,
        passCount: parsed.passes.length,

        hasTaper: parsed.hasTaper,
        hasAdaptiveControl: parsed.hasAdaptiveControl,
        hasTankManagement: parsed.hasTankManagement,
        hasMultiPass: parsed.hasMultiPass,
        hasSubmergedCut: parsed.hasSubmergedCut,

        qualityScore,
        completenessScore: completeness,
        correctnessScore: correctness,
        optimizationScore: optimization,
        safetyScore: safety,
        warnings,

        estimatedThicknessCategory,
        wireBreakRiskLevel,
        complexityScore,

        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.errors.push({ file: filePath, error: errorMsg });
      log.debug(`[WEDMBatchAnalyzer] Error analyzing ${filePath}: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Batch analyze all programs in the archive.
   *
   * @param limit - Optional limit on number of programs to analyze (for testing)
   * @returns Batch analysis result
   */
  batchAnalyze(limit?: number): WEDMBatchAnalysisResult {
    const startTime = new Date();
    log.info(`[WEDMBatchAnalyzer] Starting batch analysis...`);

    // Harvest all programs
    let programPaths = this.harvestAllPrograms();

    // Apply limit if specified
    if (limit && limit > 0) {
      programPaths = programPaths.slice(0, limit);
    }

    // Analyze each program
    this.programs = [];
    this.errors = [];
    let skipped = 0;

    for (let i = 0; i < programPaths.length; i++) {
      const filePath = programPaths[i];

      // Progress logging every 100 programs
      if ((i + 1) % 100 === 0 || i === 0) {
        log.info(
          `[WEDMBatchAnalyzer] Progress: ${i + 1}/${programPaths.length} programs`
        );
      }

      const analysis = this.analyzeProgram(filePath);
      if (analysis) {
        this.programs.push(analysis);
      } else {
        skipped++;
      }
    }

    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

    // Calculate statistics
    const statistics = this.calculateStatistics();

    // Build customer profiles
    const customerProfiles = this.buildCustomerProfiles();

    // Generate training data summary
    const trainingDataSummary = {
      totalSamples: this.programs.length,
      featureCount: 8, // Number of input features
      labelTypes: ["qualityScore", "wireBreakRisk", "estimatedCycleTime", "complexityScore"],
    };

    const result: WEDMBatchAnalysisResult = {
      schemaVersion: "1.0.0",
      analysisId: `wedm-batch-${Date.now()}`,
      timestamp: startTime.toISOString(),
      archivePath: this.archivePath,

      totalFilesScanned: programPaths.length,
      totalProgramsAnalyzed: this.programs.length,
      totalProgramsSkipped: skipped,
      totalErrors: this.errors.length,

      programs: this.programs,
      statistics,
      customerProfiles,
      trainingDataSummary,

      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds,
    };

    log.info(
      `[WEDMBatchAnalyzer] Batch analysis complete: ${this.programs.length} programs in ${durationSeconds.toFixed(1)}s`
    );

    return result;
  }

  /**
   * Save analysis results to JSON files.
   *
   * @param result - Batch analysis result
   * @param outputDir - Output directory (default: data/wedm-intelligence)
   */
  saveAnalysisResults(
    result: WEDMBatchAnalysisResult,
    outputDir: string = "H:/prism/mcp-server/data/wedm-intelligence"
  ): void {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save full analysis to state directory
    const stateDir = "H:/prism/mcp-server/data/state";
    const fullAnalysisPath = path.join(stateDir, "WEDM_BATCH_ANALYSIS.json");
    fs.writeFileSync(fullAnalysisPath, JSON.stringify(result, null, 2));
    log.info(`[WEDMBatchAnalyzer] Saved full analysis to ${fullAnalysisPath}`);

    // Save aggregated patterns
    const patternsPath = path.join(outputDir, "program-patterns.json");
    const patterns = {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      totalPrograms: result.totalProgramsAnalyzed,
      eCodePatterns: result.statistics.topECodes,
      passCountDistribution: result.statistics.passCountDistribution,
      offsetStatistics: result.statistics.offsetStatistics,
      feedRateStatistics: result.statistics.feedRateStatistics,
      mCodeFrequency: result.statistics.mCodeFrequency,
      featurePrevalence: result.statistics.featurePrevalence,
    };
    fs.writeFileSync(patternsPath, JSON.stringify(patterns, null, 2));
    log.info(`[WEDMBatchAnalyzer] Saved patterns to ${patternsPath}`);

    // Save customer profiles
    const customersPath = path.join(outputDir, "customer-profiles.json");
    const customerData = {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      customerCount: Object.keys(result.customerProfiles).length,
      profiles: result.customerProfiles,
    };
    fs.writeFileSync(customersPath, JSON.stringify(customerData, null, 2));
    log.info(`[WEDMBatchAnalyzer] Saved customer profiles to ${customersPath}`);

    // Save training data
    const trainingDataPath = path.join(outputDir, "training-data.json");
    const trainingData = this.generateTrainingData(result.programs);
    fs.writeFileSync(trainingDataPath, JSON.stringify(trainingData, null, 2));
    log.info(
      `[WEDMBatchAnalyzer] Saved ${trainingData.samples.length} training samples to ${trainingDataPath}`
    );
  }

  /**
   * Generate training data for deep learning.
   *
   * @param programs - Array of analyzed programs
   * @returns Training data with features and labels
   */
  generateTrainingData(programs: WEDMProgramAnalysis[]): {
    schemaVersion: string;
    generatedAt: string;
    totalSamples: number;
    samples: WEDMTrainingDataSample[];
    featureSchema: Record<string, string>;
    labelSchema: Record<string, string>;
  } {
    const samples: WEDMTrainingDataSample[] = [];

    for (const program of programs) {
      // Skip programs with insufficient data
      if (program.passCount === 0 || program.eCodes.length === 0) {
        continue;
      }

      // Get primary offset value
      const offsetValues = Object.values(program.hRegisters);
      const primaryOffset = offsetValues.length > 0 ? offsetValues[0] : 0;

      // Get primary feed rate
      const primaryFeed =
        program.feedRates.length > 0 ? program.feedRates[0] : 0;

      // Estimate wire break risk as numeric 0-1
      const wireBreakRiskNumeric =
        program.wireBreakRiskLevel === "high"
          ? 0.8
          : program.wireBreakRiskLevel === "medium"
            ? 0.5
            : program.wireBreakRiskLevel === "low"
              ? 0.2
              : 0.5;

      // Estimate cycle time from line count and pass count
      const estimatedCycleTime =
        (program.lineCount * 0.5 + program.passCount * 5) * 0.1;

      samples.push({
        features: {
          passCount: program.passCount,
          eCodePrimary: program.eCodes[0] || "E0000",
          offsetValue: primaryOffset,
          feedRate: primaryFeed,
          hasTaper: program.hasTaper,
          hasAdaptiveControl: program.hasAdaptiveControl,
          lineCount: program.lineCount,
          moveCount: program.lineCount * 0.3, // Approximate
        },
        labels: {
          qualityScore: program.qualityScore / 100,
          wireBreakRisk: wireBreakRiskNumeric,
          estimatedCycleTimeMinutes: estimatedCycleTime,
          complexityScore: program.complexityScore / 100,
        },
        sourceFile: program.fileName,
        customer: program.customerName,
      });
    }

    return {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      totalSamples: samples.length,
      samples,
      featureSchema: {
        passCount: "integer - number of cutting passes",
        eCodePrimary: "string - primary E-code (technology table)",
        offsetValue: "float - wire offset value in inches",
        feedRate: "float - cutting feed rate in IPM",
        hasTaper: "boolean - taper cutting enabled",
        hasAdaptiveControl: "boolean - adaptive control (M90) enabled",
        lineCount: "integer - total lines in program",
        moveCount: "integer - approximate motion commands",
      },
      labelSchema: {
        qualityScore: "float 0-1 - overall program quality",
        wireBreakRisk: "float 0-1 - wire break probability",
        estimatedCycleTimeMinutes: "float - estimated run time",
        complexityScore: "float 0-1 - program complexity",
      },
    };
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE: Extraction Methods
  // ────────────────────────────────────────────────────────────────

  private extractCustomerName(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    const parts = normalized.split("/WIRE EDM/");
    if (parts.length > 1) {
      const afterWireEDM = parts[1];
      const customerPart = afterWireEDM.split("/")[0];
      // Skip if it's a file directly in WIRE EDM folder
      if (customerPart && !customerPart.includes(".")) {
        return customerPart;
      }
    }
    return "UNKNOWN";
  }

  private extractECodes(content: string): string[] {
    const matches = content.match(E_CODE_PATTERN) || [];
    return Array.from(new Set(matches)); // Deduplicate
  }

  private extractHRegisters(content: string): Record<number, number> {
    const registers: Record<number, number> = {};
    let match;
    const pattern = new RegExp(H_REGISTER_PATTERN.source, "g");
    while ((match = pattern.exec(content)) !== null) {
      const regNum = parseInt(match[1], 10);
      const value = parseFloat(match[2]);
      registers[regNum] = value;
    }
    return registers;
  }

  private extractMCodes(content: string): string[] {
    const matches = content.match(M_CODE_PATTERN) || [];
    return Array.from(new Set(matches));
  }

  private extractGCodes(content: string): string[] {
    const matches = content.match(G_CODE_PATTERN) || [];
    return Array.from(new Set(matches));
  }

  private extractFeedRates(content: string): number[] {
    const feeds: number[] = [];
    let match;
    const pattern = new RegExp(FEED_PATTERN.source, "g");
    while ((match = pattern.exec(content)) !== null) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0 && value < 100) {
        // Reasonable feed range
        feeds.push(value);
      }
    }
    return Array.from(new Set(feeds));
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE: Validation Methods
  // ────────────────────────────────────────────────────────────────

  /**
   * Determine if content is actually a Wire EDM program.
   * Some .MIN files in the archive are lathe programs.
   */
  private isWireEDMProgram(content: string, parsed: WireEDMProgram): boolean {
    // Must have Wire EDM specific markers
    const hasECode = E_CODE_PATTERN.test(content);
    const hasWireCommands =
      /M20|M21|M78|M58|M82|M80|M90|M91/.test(content) ||
      /Thread Wire|Cut Wire|Fill Tank|Drain Tank|Adaptive Control/i.test(
        content
      );
    const hasUVAxis = /[UV][+-]?[\d.]+/.test(content);
    const hasWireOffset = /G4[12]/.test(content) && /H\d+/.test(content);

    // Confidence scoring
    let confidence = 0;
    if (hasECode) confidence += 40;
    if (hasWireCommands) confidence += 30;
    if (hasUVAxis) confidence += 15;
    if (hasWireOffset) confidence += 15;

    // Also check parsed dialect confidence
    if (parsed.dialect === "mitsubishi" && parsed.dialect_confidence > 50) {
      confidence += 20;
    }

    return confidence >= 40;
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE: Quality Scoring
  // ────────────────────────────────────────────────────────────────

  private calculateQualityScores(
    parsed: WireEDMProgram,
    content: string,
    eCodes: string[],
    mCodes: string[]
  ): {
    completeness: number;
    correctness: number;
    optimization: number;
    safety: number;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Completeness: Has all required Wire EDM elements
    let completeness = 0;
    if (eCodes.length > 0) completeness += 25; // Has E-codes
    if (parsed.passes.length > 0) completeness += 25; // Has passes
    if (mCodes.includes("M20")) completeness += 10; // Thread wire
    if (mCodes.includes("M21")) completeness += 10; // Cut wire
    if (parsed.work_origin.x !== null) completeness += 10; // G92 origin
    if (mCodes.includes("M78") || mCodes.includes("M58")) completeness += 10; // Tank management
    if (parsed.safety.has_program_end) completeness += 10; // Program end

    // Correctness: E-codes in proper order, passes make sense
    let correctness = 50; // Start at neutral
    if (parsed.passes.length >= 3 && parsed.passes.length <= 6) {
      correctness += 20; // Typical pass count
    }
    if (eCodes.length > 0) {
      // Check E-code sequence (last digit should increase)
      const lastDigits = eCodes.map((e) => parseInt(e.slice(-1), 10));
      const isSequential = lastDigits.every(
        (d, i, arr) => i === 0 || d >= arr[i - 1]
      );
      if (isSequential) correctness += 20;
    }
    if (parsed.hasAdaptiveControl) correctness += 10; // Good practice

    // Optimization: Parameters vs benchmarks
    let optimization = 50;
    const offsetValues = Object.values(parsed.offset_declarations);
    if (offsetValues.length > 0) {
      const avgOffset =
        offsetValues.reduce((a, b) => a + b, 0) / offsetValues.length;
      // Good offsets are typically 0.002-0.010 for skim passes
      if (avgOffset >= 0.001 && avgOffset <= 0.015) {
        optimization += 25;
      }
    }
    if (parsed.hasTankManagement) optimization += 15;
    if (parsed.hasMultiPass && parsed.passes.length >= 4) optimization += 10;

    // Safety: Proper shutdown sequence
    let safety = 0;
    if (parsed.safety.has_program_end) safety += 25;
    if (parsed.safety.has_wire_stop) safety += 25;
    if (parsed.safety.has_offset_cancel) safety += 25;
    if (mCodes.includes("M58")) safety += 15; // Drain tank
    if (mCodes.includes("M85") || mCodes.includes("M83")) safety += 10; // Power/wire off

    // Add warnings from parser
    warnings.push(...parsed.safety.warnings);

    // Additional warnings
    if (!parsed.hasAdaptiveControl) {
      warnings.push("Adaptive control (M90) not detected - wire break risk");
    }
    if (parsed.passes.length < 3) {
      warnings.push("Less than 3 passes - may not achieve required surface finish");
    }
    if (!mCodes.includes("M78")) {
      warnings.push("Tank fill (M78) not detected - verify submerged cutting");
    }

    return {
      completeness: Math.min(100, completeness),
      correctness: Math.min(100, correctness),
      optimization: Math.min(100, optimization),
      safety: Math.min(100, safety),
      warnings,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE: Estimation Methods
  // ────────────────────────────────────────────────────────────────

  private estimateThickness(eCodes: string[]): "thin" | "medium" | "thick" | "unknown" {
    if (eCodes.length === 0) return "unknown";

    // Mitsubishi E-code structure: E[XX][YY]
    // XX = material/thickness group
    // YY = pass number
    // E12xx = thin (< 1"), E28xx = medium (1-3"), E50xx = thick (> 3")
    const firstECode = eCodes[0];
    const groupCode = parseInt(firstECode.slice(1, 3), 10);

    if (groupCode <= 15) return "thin";
    if (groupCode <= 35) return "medium";
    if (groupCode > 35) return "thick";

    return "unknown";
  }

  private estimateWireBreakRisk(
    parsed: WireEDMProgram,
    feedRates: number[],
    mCodes: string[]
  ): "low" | "medium" | "high" | "unknown" {
    let riskScore = 0;

    // No adaptive control increases risk
    if (!parsed.hasAdaptiveControl) riskScore += 2;

    // High feed rates increase risk
    const maxFeed = Math.max(...feedRates, 0);
    if (maxFeed > 0.3) riskScore += 2;
    else if (maxFeed > 0.2) riskScore += 1;

    // No tank management (dry cutting) increases risk
    if (!mCodes.includes("M78")) riskScore += 1;

    // Taper cutting increases risk
    if (parsed.hasTaper) riskScore += 1;

    // Less than 3 passes may indicate aggressive parameters
    if (parsed.passes.length < 3) riskScore += 1;

    if (riskScore >= 4) return "high";
    if (riskScore >= 2) return "medium";
    if (riskScore >= 0) return "low";

    return "unknown";
  }

  private calculateComplexity(
    parsed: WireEDMProgram,
    eCodes: string[],
    content: string
  ): number {
    let complexity = 0;

    // Base complexity from line count
    complexity += Math.min(30, parsed.lineCount / 10);

    // Multi-pass adds complexity
    complexity += parsed.passes.length * 5;

    // Taper adds significant complexity
    if (parsed.hasTaper) complexity += 20;

    // Arc moves (G2/G3) are more complex than linear
    const arcCount = (content.match(/G[23]\s/g) || []).length;
    complexity += Math.min(15, arcCount / 2);

    // Multiple E-codes indicate sophisticated cutting
    complexity += Math.min(15, eCodes.length * 3);

    // UV axis programming adds complexity
    if (/[UV][+-]?[\d.]+/.test(content)) complexity += 10;

    return Math.min(100, complexity);
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE: Statistics Calculation
  // ────────────────────────────────────────────────────────────────

  private calculateStatistics(): WEDMBatchStatistics {
    const programs = this.programs;

    // Initialize statistics
    const dialectDistribution: Record<WireEDMDialect, number> = {
      mitsubishi: 0,
      fanuc: 0,
      sodick: 0,
      agiecharmilles: 0,
      makino: 0,
      unknown: 0,
    };

    const eCodeFrequency: Record<string, number> = {};
    const mCodeFrequency: Record<string, number> = {};
    const gCodeFrequency: Record<string, number> = {};
    const passCountDistribution: Record<number, number> = {};
    const fileTypeDistribution: Record<string, number> = {};

    const allOffsets: number[] = [];
    const allFeeds: number[] = [];
    const offsetsByPass: Record<string, number[]> = {};

    let totalLines = 0;
    let totalSize = 0;
    let taperCount = 0;
    let adaptiveCount = 0;
    let tankCount = 0;
    let multiPassCount = 0;
    let submergedCount = 0;

    let excellentCount = 0;
    let goodCount = 0;
    let fairCount = 0;
    let poorCount = 0;

    // Process each program
    for (const program of programs) {
      totalLines += program.lineCount;
      totalSize += program.fileSizeBytes;

      // Dialect
      dialectDistribution[program.dialect]++;

      // File type
      fileTypeDistribution[program.fileExtension] =
        (fileTypeDistribution[program.fileExtension] || 0) + 1;

      // E-codes
      for (const code of program.eCodes) {
        eCodeFrequency[code] = (eCodeFrequency[code] || 0) + 1;
      }

      // M-codes
      for (const code of program.mCodes) {
        mCodeFrequency[code] = (mCodeFrequency[code] || 0) + 1;
      }

      // G-codes
      for (const code of program.gCodes) {
        gCodeFrequency[code] = (gCodeFrequency[code] || 0) + 1;
      }

      // Pass count
      passCountDistribution[program.passCount] =
        (passCountDistribution[program.passCount] || 0) + 1;

      // Offsets
      const offsets = Object.values(program.hRegisters);
      allOffsets.push(...offsets);

      // Track offsets by pass (using E-code suffix)
      for (const eCode of program.eCodes) {
        const pass = eCode.slice(-1);
        if (!offsetsByPass[`pass${pass}`]) {
          offsetsByPass[`pass${pass}`] = [];
        }
        // Get corresponding offset if exists
        const passNum = parseInt(pass, 10);
        if (program.hRegisters[passNum] !== undefined) {
          offsetsByPass[`pass${pass}`].push(program.hRegisters[passNum]);
        }
      }

      // Feed rates
      allFeeds.push(...program.feedRates);

      // Features
      if (program.hasTaper) taperCount++;
      if (program.hasAdaptiveControl) adaptiveCount++;
      if (program.hasTankManagement) tankCount++;
      if (program.hasMultiPass) multiPassCount++;
      if (program.hasSubmergedCut) submergedCount++;

      // Quality distribution
      if (program.qualityScore >= QUALITY_THRESHOLDS.EXCELLENT) excellentCount++;
      else if (program.qualityScore >= QUALITY_THRESHOLDS.GOOD) goodCount++;
      else if (program.qualityScore >= QUALITY_THRESHOLDS.FAIR) fairCount++;
      else poorCount++;
    }

    // Calculate top E-codes
    const topECodes = Object.entries(eCodeFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([code, count]) => ({ code, count }));

    // Calculate offset statistics
    const offsetStats = this.calculateNumericStats(allOffsets);
    const offsetByPassStats: Record<string, { min: number; max: number; mean: number }> = {};
    for (const [pass, offsets] of Object.entries(offsetsByPass)) {
      if (offsets.length > 0) {
        const stats = this.calculateNumericStats(offsets);
        offsetByPassStats[pass] = { min: stats.min, max: stats.max, mean: stats.mean };
      }
    }

    // Calculate feed rate statistics
    const feedStats = this.calculateNumericStats(allFeeds);

    // Calculate average pass count
    const totalPasses = Object.entries(passCountDistribution).reduce(
      (sum, [count, freq]) => sum + parseInt(count, 10) * freq,
      0
    );
    const avgPassCount = programs.length > 0 ? totalPasses / programs.length : 0;

    return {
      totalProgramsAnalyzed: programs.length,
      totalLinesOfCode: totalLines,
      totalFileSizeBytes: totalSize,

      dialectDistribution,
      eCodeFrequency,
      topECodes,
      passCountDistribution,
      averagePassCount: Math.round(avgPassCount * 10) / 10,

      offsetStatistics: {
        ...offsetStats,
        byPass: offsetByPassStats,
      },

      feedRateStatistics: feedStats,
      mCodeFrequency,
      gCodeFrequency,

      featurePrevalence: {
        taper: programs.length > 0 ? Math.round((taperCount / programs.length) * 100) : 0,
        adaptiveControl: programs.length > 0 ? Math.round((adaptiveCount / programs.length) * 100) : 0,
        tankManagement: programs.length > 0 ? Math.round((tankCount / programs.length) * 100) : 0,
        multiPass: programs.length > 0 ? Math.round((multiPassCount / programs.length) * 100) : 0,
        submergedCut: programs.length > 0 ? Math.round((submergedCount / programs.length) * 100) : 0,
      },

      qualityScoreDistribution: {
        excellent: excellentCount,
        good: goodCount,
        fair: fairCount,
        poor: poorCount,
      },

      fileTypeDistribution,
    };
  }

  private calculateNumericStats(values: number[]): {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
  } {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, stdDev: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      min: Math.round(min * 10000) / 10000,
      max: Math.round(max * 10000) / 10000,
      mean: Math.round(mean * 10000) / 10000,
      stdDev: Math.round(stdDev * 10000) / 10000,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE: Customer Profile Building
  // ────────────────────────────────────────────────────────────────

  private buildCustomerProfiles(): Record<string, WEDMCustomerProfile> {
    const profiles: Record<string, WEDMCustomerProfile> = {};

    // Group programs by customer
    const byCustomer: Record<string, WEDMProgramAnalysis[]> = {};
    for (const program of this.programs) {
      if (!byCustomer[program.customerName]) {
        byCustomer[program.customerName] = [];
      }
      byCustomer[program.customerName].push(program);
    }

    // Build profile for each customer
    for (const [customer, programs] of Object.entries(byCustomer)) {
      const totalLines = programs.reduce((sum, p) => sum + p.lineCount, 0);
      const totalPasses = programs.reduce((sum, p) => sum + p.passCount, 0);
      const avgPasses = programs.length > 0 ? totalPasses / programs.length : 0;

      // Find dominant dialect
      const dialectCounts: Record<string, number> = {};
      for (const p of programs) {
        dialectCounts[p.dialect] = (dialectCounts[p.dialect] || 0) + 1;
      }
      const dominantDialect = (Object.entries(dialectCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown") as WireEDMDialect;

      // Common E-codes
      const eCodeCounts: Record<string, number> = {};
      for (const p of programs) {
        for (const code of p.eCodes) {
          eCodeCounts[code] = (eCodeCounts[code] || 0) + 1;
        }
      }
      const commonECodes = Object.entries(eCodeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([code]) => code);

      // Average quality score
      const avgQuality =
        programs.length > 0
          ? programs.reduce((sum, p) => sum + p.qualityScore, 0) / programs.length
          : 0;

      // Feature usage percentages
      const taperUsage =
        programs.length > 0
          ? (programs.filter((p) => p.hasTaper).length / programs.length) * 100
          : 0;
      const adaptiveUsage =
        programs.length > 0
          ? (programs.filter((p) => p.hasAdaptiveControl).length / programs.length) * 100
          : 0;
      const multiPassUsage =
        programs.length > 0
          ? (programs.filter((p) => p.hasMultiPass).length / programs.length) * 100
          : 0;

      // Typical thickness
      const thicknessCounts: Record<string, number> = {};
      for (const p of programs) {
        thicknessCounts[p.estimatedThicknessCategory] =
          (thicknessCounts[p.estimatedThicknessCategory] || 0) + 1;
      }
      const typicalThickness = (Object.entries(thicknessCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown") as "thin" | "medium" | "thick" | "mixed";

      profiles[customer] = {
        customerName: customer,
        programCount: programs.length,
        totalLines,
        avgPassCount: Math.round(avgPasses * 10) / 10,
        dominantDialect,
        commonECodes,
        avgQualityScore: Math.round(avgQuality),
        featureUsage: {
          taper: Math.round(taperUsage),
          adaptiveControl: Math.round(adaptiveUsage),
          multiPass: Math.round(multiPassUsage),
        },
        typicalThickness,
      };
    }

    return profiles;
  }

  // ────────────────────────────────────────────────────────────────
  // STATIC HELPERS
  // ────────────────────────────────────────────────────────────────

  /**
   * Quick analysis of a single file without full batch context.
   */
  static analyzeFile(filePath: string): WEDMProgramAnalysis | null {
    const engine = new WEDMBatchProgramAnalyzerEngine();
    return engine.analyzeProgram(filePath);
  }

  /**
   * Run full batch analysis and save results.
   * This is the main entry point for processing ALL programs.
   */
  static runFullAnalysis(limit?: number): WEDMBatchAnalysisResult {
    const engine = new WEDMBatchProgramAnalyzerEngine();
    const result = engine.batchAnalyze(limit);
    engine.saveAnalysisResults(result);
    return result;
  }
}

// Singleton export
export const wedmBatchProgramAnalyzerEngine = new WEDMBatchProgramAnalyzerEngine();
