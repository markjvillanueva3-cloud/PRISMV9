/**
 * ProgramLabelingPipelineEngine — PP-DATA-MS0 Data Labeling Pipeline
 *
 * Extracts machine learning labels from JM DIE CNC programs (24,545 files).
 * Labels include: machine type, controller family, material hints, tool count,
 * and G-code dialect markers. These labels enable neural network training
 * for adaptive machining intelligence.
 *
 * Key Okuma G-code dialect markers:
 * - G140: Okuma lathe initialization (standard XZ plane)
 * - G85/G87: Okuma canned roughing/finishing cycles
 * - G71: Okuma threading cycle
 * - NAT## labels: Automatic tool select (Okuma-specific)
 * - $name% headers: Okuma program naming convention
 *
 * Actions: label_programs, get_label_stats, export_training_data
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES & SCHEMA
// ============================================================================

/** Label for a single CNC program file */
export interface ProgramLabel {
  filePath: string;
  fileName: string;
  customer?: string;
  machineType?: string;              // "LB300", "LU300", "Multus B300", "Crown", "GENOS"
  machineCategory?: string;          // "lathe", "mill", "mill-turn", "wedm", "sinker"
  controllerFamily?: string;         // "OSP-P200", "OSP-P300", "OSP-P500", "OSP-U10"
  controllerVersion?: string;        // specific version if detectable
  materialHint?: string;             // extracted from comments (e.g., "STEEL INCH - 1030 - 200 BHN")
  materialGroup?: string;            // ISO group: P, M, K, N, S, H
  toolCount?: number;                // number of unique tools used
  lineCount?: number;                // total lines in program
  hasSubprograms?: boolean;          // uses CALL, GOTO, or subprogram patterns
  hasCannedCycles?: boolean;         // uses G85, G87, G71 canned cycles
  hasThreading?: boolean;            // uses G71 threading cycle
  feedRateRange?: { min: number; max: number };
  spindleSpeedRange?: { min: number; max: number };
  gcodeDialect?: GCodeDialect;       // detected G-code dialect features
  labelConfidence: number;           // 0-1, higher = more features detected
  labelSource: "auto" | "manual" | "inferred";
  labeledAt: string;                 // ISO timestamp
  extractionErrors?: string[];       // any parsing errors encountered
}

/** G-code dialect markers for controller identification */
export interface GCodeDialect {
  hasG140: boolean;                  // Okuma lathe init
  hasG141: boolean;                  // Okuma mill init
  hasClearKeyword: boolean;          // Okuma DEF WORK/CLEAR block
  hasNATLabels: boolean;             // NAT## automatic tool select
  hasDollarHeader: boolean;          // $name% program header
  hasOkumaCycles: boolean;           // G85/G87/G71 Okuma cycles
  hasMastercamComments: boolean;     // (MCX FILE - ...) Mastercam markers
  hasInHousePost: boolean;           // (POST DEV - IN-HOUSE SOLUTIONS)
}

/** Batch processing configuration */
export interface LabelingBatchConfig {
  rootPath: string;
  filePattern: string;               // glob pattern, e.g., "**/*.MIN"
  batchSize: number;                 // files per batch
  outputPath: string;                // path to write labels JSON
  skipExisting: boolean;             // skip files already labeled
  maxFiles?: number;                 // limit for testing (undefined = all)
}

/** Labeling statistics summary */
export interface LabelingStats {
  totalFiles: number;
  labeledFiles: number;
  unlabeledFiles: number;
  byMachineType: Record<string, number>;
  byController: Record<string, number>;
  byMaterial: Record<string, number>;
  byConfidence: { high: number; medium: number; low: number };
  averageToolCount: number;
  averageLineCount: number;
  withThreading: number;
  withCannedCycles: number;
  withSubprograms: number;
  processingTimeMs: number;
}

/** Stored labels file format */
export interface ProgramLabelsFile {
  schemaVersion: string;
  generatedAt: string;
  rootPath: string;
  stats: LabelingStats;
  labels: ProgramLabel[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SCHEMA_VERSION = "1.0.0";

/** Okuma controller family detection patterns */
const CONTROLLER_PATTERNS: Array<{ pattern: RegExp; family: string; version?: string }> = [
  { pattern: /OSP-P500/i, family: "OSP-P500", version: "P500" },
  { pattern: /OSP-P300/i, family: "OSP-P300", version: "P300" },
  { pattern: /OSP-P200/i, family: "OSP-P200", version: "P200" },
  { pattern: /OSP-U10/i, family: "OSP-U10", version: "U10" },
  { pattern: /OSP-U100/i, family: "OSP-U100", version: "U100" },
];

/** Machine type detection from folder names and comments */
const MACHINE_TYPE_PATTERNS: Array<{ pattern: RegExp; type: string; category: string }> = [
  { pattern: /MULTUS/i, type: "Multus", category: "mill-turn" },
  { pattern: /LB\s*3000/i, type: "LB3000", category: "lathe" },
  { pattern: /LB\s*300/i, type: "LB300", category: "lathe" },
  { pattern: /LU\s*300/i, type: "LU300", category: "lathe" },
  { pattern: /GENOS.*L400/i, type: "GENOS L400", category: "lathe" },
  { pattern: /GENOS.*L300/i, type: "GENOS L300", category: "lathe" },
  { pattern: /GENOS.*L200/i, type: "GENOS L200", category: "lathe" },
  { pattern: /CROWN/i, type: "Crown", category: "lathe" },
  { pattern: /LNC8/i, type: "LNC8", category: "lathe" },
  { pattern: /M460V/i, type: "M460V", category: "5-axis mill" },
  { pattern: /VF-?2/i, type: "VF-2", category: "vmc" },
  { pattern: /OM-?2/i, type: "OM-2", category: "vmc" },
  { pattern: /VM30/i, type: "VM30i", category: "vmc" },
  { pattern: /HURCO/i, type: "Hurco", category: "vmc" },
  { pattern: /HAAS/i, type: "Haas", category: "vmc" },
  { pattern: /WIRE\s*EDM/i, type: "Wire EDM", category: "wedm" },
  { pattern: /FA10S/i, type: "FA10S", category: "wedm" },
  { pattern: /EA12/i, type: "EA12", category: "sinker" },
];

/** Material detection patterns with ISO groups */
const MATERIAL_PATTERNS: Array<{ pattern: RegExp; material: string; isoGroup: string }> = [
  { pattern: /STEEL.*1030/i, material: "1030 Steel", isoGroup: "P" },
  { pattern: /STEEL.*1045/i, material: "1045 Steel", isoGroup: "P" },
  { pattern: /STEEL.*4140/i, material: "4140 Steel", isoGroup: "P" },
  { pattern: /STEEL.*4340/i, material: "4340 Steel", isoGroup: "P" },
  { pattern: /D2/i, material: "D2 Tool Steel", isoGroup: "H" },
  { pattern: /M2/i, material: "M2 HSS", isoGroup: "H" },
  { pattern: /S7/i, material: "S7 Tool Steel", isoGroup: "H" },
  { pattern: /A2/i, material: "A2 Tool Steel", isoGroup: "H" },
  { pattern: /H13/i, material: "H13 Tool Steel", isoGroup: "H" },
  { pattern: /CARBIDE/i, material: "Carbide", isoGroup: "H" },
  { pattern: /TUNGSTEN/i, material: "Tungsten Carbide", isoGroup: "H" },
  { pattern: /ALUMINUM|ALUMINIUM/i, material: "Aluminum", isoGroup: "N" },
  { pattern: /GRAPHITE/i, material: "Graphite", isoGroup: "N" },
  { pattern: /INCONEL/i, material: "Inconel", isoGroup: "S" },
  { pattern: /TITANIUM/i, material: "Titanium", isoGroup: "S" },
  { pattern: /STAINLESS/i, material: "Stainless Steel", isoGroup: "M" },
  { pattern: /BRASS/i, material: "Brass", isoGroup: "N" },
  { pattern: /BRONZE/i, material: "Bronze", isoGroup: "N" },
  { pattern: /COPPER/i, material: "Copper", isoGroup: "N" },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * ProgramLabelingPipelineEngine
 *
 * Extracts machine learning labels from CNC program files by parsing
 * G-code content, file metadata, and folder structure. Designed for
 * batch processing of large program archives (24,545+ files).
 */
export class ProgramLabelingPipelineEngine {
  private existingLabels: Map<string, ProgramLabel> = new Map();

  /**
   * Label a single program file by parsing its G-code content.
   * @param filePath - Absolute path to the .MIN or G-code file
   * @returns ProgramLabel with extracted features
   */
  labelProgram(filePath: string): ProgramLabel {
    const startTime = Date.now();
    const errors: string[] = [];

    // Basic file info
    const fileName = path.basename(filePath);
    const customer = this.extractCustomerFromPath(filePath);

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      errors.push(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
      return this.createEmptyLabel(filePath, fileName, customer, errors);
    }

    const lines = content.split(/\r?\n/);
    const lineCount = lines.length;

    // Extract G-code dialect markers
    const dialect = this.detectDialect(content);

    // Extract machine type from path and content (needs dialect for inference)
    const machineInfo = this.detectMachineType(filePath, content, dialect);

    // Extract controller family
    const controllerInfo = this.detectController(content, dialect);

    // Extract material hints
    const materialInfo = this.detectMaterial(content);

    // Extract tool information
    const toolInfo = this.extractToolInfo(content);

    // Extract spindle/feed ranges
    const spindleRange = this.extractSpindleRange(content);
    const feedRange = this.extractFeedRange(content);

    // Detect program features
    const hasSubprograms = this.detectSubprograms(content);
    const hasCannedCycles = dialect.hasOkumaCycles;
    const hasThreading = this.detectThreading(content);

    // Calculate confidence based on how many features we extracted
    const confidence = this.calculateConfidence({
      hasMachineType: !!machineInfo.type,
      hasController: !!controllerInfo.family,
      hasMaterial: !!materialInfo.material,
      hasToolInfo: toolInfo.count > 0,
      hasDialectMarkers: this.countDialectMarkers(dialect) >= 2,
      hasMetadata: dialect.hasMastercamComments,
    });

    return {
      filePath,
      fileName,
      customer,
      machineType: machineInfo.type,
      machineCategory: machineInfo.category,
      controllerFamily: controllerInfo.family,
      controllerVersion: controllerInfo.version,
      materialHint: materialInfo.material,
      materialGroup: materialInfo.isoGroup,
      toolCount: toolInfo.count,
      lineCount,
      hasSubprograms,
      hasCannedCycles,
      hasThreading,
      feedRateRange: feedRange,
      spindleSpeedRange: spindleRange,
      gcodeDialect: dialect,
      labelConfidence: confidence,
      labelSource: "auto",
      labeledAt: new Date().toISOString(),
      extractionErrors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Process a batch of programs in a directory.
   * @param config - Batch processing configuration
   * @returns LabelingStats summary
   */
  async labelBatch(config: LabelingBatchConfig): Promise<LabelingStats> {
    const startTime = Date.now();

    // Load existing labels if skip mode
    if (config.skipExisting && fs.existsSync(config.outputPath)) {
      await this.loadExistingLabels(config.outputPath);
    }

    // Find all matching files
    const files = this.findFiles(config.rootPath, config.filePattern, config.maxFiles);
    const totalFiles = files.length;

    // Process files
    const labels: ProgramLabel[] = [];
    let processedCount = 0;

    for (const file of files) {
      // Skip if already labeled
      if (config.skipExisting && this.existingLabels.has(file)) {
        labels.push(this.existingLabels.get(file)!);
        continue;
      }

      try {
        const label = this.labelProgram(file);
        labels.push(label);
      } catch (err) {
        // Log error but continue processing
        console.error(`Error labeling ${file}: ${err}`);
        labels.push(this.createEmptyLabel(
          file,
          path.basename(file),
          this.extractCustomerFromPath(file),
          [`Processing error: ${err instanceof Error ? err.message : String(err)}`]
        ));
      }

      processedCount++;

      // Progress logging every batch
      if (processedCount % config.batchSize === 0) {
        console.log(`Processed ${processedCount}/${totalFiles} files...`);
      }
    }

    // Calculate stats
    const stats = this.calculateStats(labels, Date.now() - startTime);

    // Save results
    const output: ProgramLabelsFile = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      rootPath: config.rootPath,
      stats,
      labels,
    };

    // Ensure output directory exists
    const outputDir = path.dirname(config.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(config.outputPath, JSON.stringify(output, null, 2), "utf-8");

    return stats;
  }

  /**
   * Run pilot batch on first 100 CNC LATHE programs.
   * @returns LabelingStats from pilot run
   */
  async runPilotBatch(): Promise<LabelingStats> {
    const config: LabelingBatchConfig = {
      rootPath: "H:/PRISM/JM DIE/CNC LATHE",
      filePattern: "**/*.MIN",
      batchSize: 10,
      outputPath: "H:/prism/mcp-server/data/state/program-labels.json",
      skipExisting: false,
      maxFiles: 100,
    };

    return this.labelBatch(config);
  }

  /**
   * Get labeling statistics from an existing labels file.
   * @param labelsPath - Path to program-labels.json
   * @returns LabelingStats or null if file doesn't exist
   */
  getStats(labelsPath: string): LabelingStats | null {
    if (!fs.existsSync(labelsPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(labelsPath, "utf-8");
      const data: ProgramLabelsFile = JSON.parse(content);
      return data.stats;
    } catch {
      return null;
    }
  }

  /**
   * Export labels in format suitable for neural network training.
   * @param labelsPath - Path to program-labels.json
   * @param format - Export format: "csv" | "jsonl" | "parquet-ready"
   * @returns Formatted training data as string
   */
  exportTrainingData(labelsPath: string, format: "csv" | "jsonl" | "parquet-ready"): string {
    if (!fs.existsSync(labelsPath)) {
      throw new Error(`Labels file not found: ${labelsPath}`);
    }

    const content = fs.readFileSync(labelsPath, "utf-8");
    const data: ProgramLabelsFile = JSON.parse(content);

    switch (format) {
      case "csv":
        return this.toCsv(data.labels);
      case "jsonl":
        return this.toJsonl(data.labels);
      case "parquet-ready":
        return this.toParquetReady(data.labels);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private createEmptyLabel(
    filePath: string,
    fileName: string,
    customer: string | undefined,
    errors: string[]
  ): ProgramLabel {
    return {
      filePath,
      fileName,
      customer,
      labelConfidence: 0,
      labelSource: "auto",
      labeledAt: new Date().toISOString(),
      extractionErrors: errors,
    };
  }

  private extractCustomerFromPath(filePath: string): string | undefined {
    // Path pattern: .../CNC LATHE/CUSTOMER_NAME/... or .../CNC LATHE/CUSTOMER_NAME/file.MIN
    const normalized = filePath.replace(/\\/g, "/");
    const match = normalized.match(/CNC LATHE\/([^/]+)/i);
    if (match && match[1]) {
      const customer = match[1];
      // Filter out non-customer folders
      if (!customer.match(/^\d+\.MIN$/i) && !customer.endsWith(".MIN")) {
        return customer;
      }
    }
    return undefined;
  }

  private detectDialect(content: string): GCodeDialect {
    return {
      hasG140: /\bG140\b/.test(content),
      hasG141: /\bG141\b/.test(content),
      hasClearKeyword: /\bCLEAR\b/.test(content) || /\bDEF\s+WORK\b/.test(content),
      hasNATLabels: /\bNAT\d+\b/.test(content),
      hasDollarHeader: /^\$[A-Z0-9_-]+\.MIN%/m.test(content),
      hasOkumaCycles: /\bG8[57]\b/.test(content) || /\bG71\b/.test(content),
      hasMastercamComments: /\(MCX FILE\s*-/.test(content),
      hasInHousePost: /\(POST DEV\s*-\s*IN-HOUSE/i.test(content),
    };
  }

  private detectMachineType(filePath: string, content: string, dialect: GCodeDialect): { type?: string; category?: string } {
    const searchText = filePath + " " + content;

    for (const { pattern, type, category } of MACHINE_TYPE_PATTERNS) {
      if (pattern.test(searchText)) {
        return { type, category };
      }
    }

    // Default based on file location
    const normalizedPath = filePath.toLowerCase();
    if (normalizedPath.includes("cnc lathe")) {
      return { type: undefined, category: "lathe" };
    }
    if (normalizedPath.includes("wire edm")) {
      return { type: undefined, category: "wedm" };
    }
    if (normalizedPath.includes("cnc mill") || normalizedPath.includes("haas-hurco")) {
      return { type: undefined, category: "vmc" };
    }
    if (normalizedPath.includes("multus")) {
      return { type: undefined, category: "mill-turn" };
    }

    // Infer from G-code dialect markers
    // G140 = Okuma lathe initialization, G141 = Okuma mill initialization
    if (dialect.hasG140) {
      return { type: undefined, category: "lathe" };
    }
    if (dialect.hasG141) {
      return { type: undefined, category: "vmc" };
    }

    return {};
  }

  private detectController(content: string, dialect: GCodeDialect): { family?: string; version?: string } {
    // Check explicit controller mentions
    for (const { pattern, family, version } of CONTROLLER_PATTERNS) {
      if (pattern.test(content)) {
        return { family, version };
      }
    }

    // Infer from dialect markers
    if (dialect.hasG140 || dialect.hasNATLabels || dialect.hasOkumaCycles) {
      // Okuma lathe dialect - likely OSP-P series
      if (dialect.hasClearKeyword && dialect.hasDollarHeader) {
        return { family: "OSP-P200/P300", version: undefined };
      }
      return { family: "OSP-U10/P-series", version: undefined };
    }

    if (dialect.hasG141) {
      return { family: "OSP-P-series (mill)", version: undefined };
    }

    return {};
  }

  private detectMaterial(content: string): { material?: string; isoGroup?: string } {
    // Look for explicit MATERIAL comments
    const materialMatch = content.match(/\(MATERIAL\s*-\s*([^)]+)\)/i);
    if (materialMatch) {
      const materialText = materialMatch[1];
      for (const { pattern, material, isoGroup } of MATERIAL_PATTERNS) {
        if (pattern.test(materialText)) {
          return { material, isoGroup };
        }
      }
      // Return raw material text if no pattern matched
      return { material: materialText.trim(), isoGroup: undefined };
    }

    // Look for material keywords in any comment
    for (const { pattern, material, isoGroup } of MATERIAL_PATTERNS) {
      if (pattern.test(content)) {
        return { material, isoGroup };
      }
    }

    return {};
  }

  private extractToolInfo(content: string): { count: number; tools: number[] } {
    const tools = new Set<number>();

    // Match T###### patterns (Okuma style)
    const tMatches = content.matchAll(/T(\d{2})(\d{2})(\d{2})/g);
    for (const match of tMatches) {
      const toolNum = parseInt(match[1]);
      if (toolNum > 0 && toolNum <= 99) {
        tools.add(toolNum);
      }
    }

    // Match NAT## patterns
    const natMatches = content.matchAll(/NAT(\d{1,2})/gi);
    for (const match of natMatches) {
      const toolNum = parseInt(match[1]);
      if (toolNum > 0 && toolNum <= 99) {
        tools.add(toolNum);
      }
    }

    // Match TOOL comments
    const toolComments = content.matchAll(/\(TOOL\s*(?:NO\.?)?\s*-?\s*(\d+)/gi);
    for (const match of toolComments) {
      const toolNum = parseInt(match[1]);
      if (toolNum > 0 && toolNum <= 99) {
        tools.add(toolNum);
      }
    }

    return { count: tools.size, tools: Array.from(tools).sort((a, b) => a - b) };
  }

  private extractSpindleRange(content: string): { min: number; max: number } | undefined {
    const speeds: number[] = [];

    // Match S### patterns
    const sMatches = content.matchAll(/S(\d+)/gi);
    for (const match of sMatches) {
      const speed = parseInt(match[1]);
      if (speed > 0 && speed <= 50000) {
        speeds.push(speed);
      }
    }

    if (speeds.length === 0) {
      return undefined;
    }

    return {
      min: Math.min(...speeds),
      max: Math.max(...speeds),
    };
  }

  private extractFeedRange(content: string): { min: number; max: number } | undefined {
    const feeds: number[] = [];

    // Match F#.### patterns including F.### (no leading digit, common in lathe)
    // Examples: F.005, F0.005, F.002, F10, F100
    const fMatches = content.matchAll(/F(\d*\.?\d+)/gi);
    for (const match of fMatches) {
      const feed = parseFloat(match[1]);
      // Filter out thread lead values and unreasonable feeds
      // Typical lathe feeds: 0.001-0.020 ipr, mill feeds: 1-500 ipm
      if (feed > 0 && feed < 1000) {
        feeds.push(feed);
      }
    }

    if (feeds.length === 0) {
      return undefined;
    }

    return {
      min: Math.min(...feeds),
      max: Math.max(...feeds),
    };
  }

  private detectSubprograms(content: string): boolean {
    return (
      /\bCALL\b/i.test(content) ||
      /\bGOTO\b/i.test(content) ||
      /\/CALL\b/.test(content) ||
      /\/GOTO\b/.test(content)
    );
  }

  private detectThreading(content: string): boolean {
    return /\bG71\b/.test(content) || /\(THREAD/i.test(content) || /THREAD/i.test(content);
  }

  private countDialectMarkers(dialect: GCodeDialect): number {
    return [
      dialect.hasG140,
      dialect.hasG141,
      dialect.hasClearKeyword,
      dialect.hasNATLabels,
      dialect.hasDollarHeader,
      dialect.hasOkumaCycles,
      dialect.hasMastercamComments,
      dialect.hasInHousePost,
    ].filter(Boolean).length;
  }

  private calculateConfidence(features: {
    hasMachineType: boolean;
    hasController: boolean;
    hasMaterial: boolean;
    hasToolInfo: boolean;
    hasDialectMarkers: boolean;
    hasMetadata: boolean;
  }): number {
    let score = 0;
    const weights = {
      hasMachineType: 0.2,
      hasController: 0.2,
      hasMaterial: 0.15,
      hasToolInfo: 0.15,
      hasDialectMarkers: 0.2,
      hasMetadata: 0.1,
    };

    for (const [key, weight] of Object.entries(weights)) {
      if (features[key as keyof typeof features]) {
        score += weight;
      }
    }

    return Math.round(score * 100) / 100;
  }

  private findFiles(rootPath: string, pattern: string, maxFiles?: number): string[] {
    const files: string[] = [];

    const walkDir = (dir: string) => {
      if (maxFiles && files.length >= maxFiles) {
        return;
      }

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (maxFiles && files.length >= maxFiles) {
          return;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && this.matchesPattern(entry.name, pattern)) {
          files.push(fullPath);
        }
      }
    };

    walkDir(rootPath);
    return files;
  }

  private matchesPattern(fileName: string, pattern: string): boolean {
    // Simple pattern matching for *.MIN, **/*.MIN
    if (pattern.includes("*.MIN")) {
      return fileName.toLowerCase().endsWith(".min");
    }
    if (pattern.includes("*.NC")) {
      return fileName.toLowerCase().endsWith(".nc");
    }
    return true;
  }

  private async loadExistingLabels(labelsPath: string): Promise<void> {
    try {
      const content = fs.readFileSync(labelsPath, "utf-8");
      const data: ProgramLabelsFile = JSON.parse(content);
      for (const label of data.labels) {
        this.existingLabels.set(label.filePath, label);
      }
    } catch {
      // Ignore errors loading existing labels
    }
  }

  private calculateStats(labels: ProgramLabel[], processingTimeMs: number): LabelingStats {
    const byMachineType: Record<string, number> = {};
    const byController: Record<string, number> = {};
    const byMaterial: Record<string, number> = {};

    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;
    let totalTools = 0;
    let totalLines = 0;
    let withThreading = 0;
    let withCannedCycles = 0;
    let withSubprograms = 0;
    let labeledCount = 0;

    for (const label of labels) {
      // Confidence buckets
      if (label.labelConfidence >= 0.7) {
        highConfidence++;
      } else if (label.labelConfidence >= 0.4) {
        mediumConfidence++;
      } else {
        lowConfidence++;
      }

      // Machine type distribution
      const machineKey = label.machineType || label.machineCategory || "unknown";
      byMachineType[machineKey] = (byMachineType[machineKey] || 0) + 1;

      // Controller distribution
      const controllerKey = label.controllerFamily || "unknown";
      byController[controllerKey] = (byController[controllerKey] || 0) + 1;

      // Material distribution
      if (label.materialHint) {
        const materialKey = label.materialGroup || label.materialHint;
        byMaterial[materialKey] = (byMaterial[materialKey] || 0) + 1;
      }

      // Aggregates
      if (label.toolCount) totalTools += label.toolCount;
      if (label.lineCount) totalLines += label.lineCount;
      if (label.hasThreading) withThreading++;
      if (label.hasCannedCycles) withCannedCycles++;
      if (label.hasSubprograms) withSubprograms++;
      if (label.labelConfidence > 0) labeledCount++;
    }

    return {
      totalFiles: labels.length,
      labeledFiles: labeledCount,
      unlabeledFiles: labels.length - labeledCount,
      byMachineType,
      byController,
      byMaterial,
      byConfidence: {
        high: highConfidence,
        medium: mediumConfidence,
        low: lowConfidence,
      },
      averageToolCount: labels.length > 0 ? Math.round(totalTools / labels.length * 10) / 10 : 0,
      averageLineCount: labels.length > 0 ? Math.round(totalLines / labels.length) : 0,
      withThreading,
      withCannedCycles,
      withSubprograms,
      processingTimeMs,
    };
  }

  private toCsv(labels: ProgramLabel[]): string {
    const headers = [
      "filePath",
      "fileName",
      "customer",
      "machineType",
      "machineCategory",
      "controllerFamily",
      "materialHint",
      "materialGroup",
      "toolCount",
      "lineCount",
      "hasThreading",
      "hasCannedCycles",
      "hasSubprograms",
      "labelConfidence",
    ];

    const rows = labels.map((label) => [
      label.filePath,
      label.fileName,
      label.customer || "",
      label.machineType || "",
      label.machineCategory || "",
      label.controllerFamily || "",
      label.materialHint || "",
      label.materialGroup || "",
      label.toolCount?.toString() || "",
      label.lineCount?.toString() || "",
      label.hasThreading ? "true" : "false",
      label.hasCannedCycles ? "true" : "false",
      label.hasSubprograms ? "true" : "false",
      label.labelConfidence.toString(),
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));

    return [headers.join(","), ...rows].join("\n");
  }

  private toJsonl(labels: ProgramLabel[]): string {
    return labels.map((label) => JSON.stringify(label)).join("\n");
  }

  private toParquetReady(labels: ProgramLabel[]): string {
    // Return JSON array format suitable for pandas/pyarrow conversion
    const records = labels.map((label) => ({
      file_path: label.filePath,
      file_name: label.fileName,
      customer: label.customer || null,
      machine_type: label.machineType || null,
      machine_category: label.machineCategory || null,
      controller_family: label.controllerFamily || null,
      material_hint: label.materialHint || null,
      material_group: label.materialGroup || null,
      tool_count: label.toolCount || null,
      line_count: label.lineCount || null,
      has_threading: label.hasThreading || false,
      has_canned_cycles: label.hasCannedCycles || false,
      has_subprograms: label.hasSubprograms || false,
      label_confidence: label.labelConfidence,
      // Flattened dialect features for ML
      dialect_g140: label.gcodeDialect?.hasG140 || false,
      dialect_g141: label.gcodeDialect?.hasG141 || false,
      dialect_nat_labels: label.gcodeDialect?.hasNATLabels || false,
      dialect_okuma_cycles: label.gcodeDialect?.hasOkumaCycles || false,
      dialect_mastercam: label.gcodeDialect?.hasMastercamComments || false,
    }));

    return JSON.stringify(records, null, 2);
  }
}

/** Singleton instance */
export const programLabelingPipelineEngine = new ProgramLabelingPipelineEngine();
