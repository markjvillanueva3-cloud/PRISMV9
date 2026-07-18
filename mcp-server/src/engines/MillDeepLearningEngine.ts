/**
 * MillDeepLearningEngine — Deep AI Training on JM Die Milling Programs
 * =====================================================================
 * Neural network-style pattern learning engine that:
 *   - Parses ALL JM Die milling NC programs
 *   - Extracts operation sequences, speeds, feeds, tool selections
 *   - Learns from PROVEN programs (marked with "PROVEN PRG" folder)
 *   - Builds intelligent recommendations with confidence scoring
 *   - Provides deep reasoning for CAM decisions
 *
 * Training Data:
 *   - H:/PRISM/JM DIE/CNC MILL HAAS/ (Haas NGC programs)
 *   - H:/PRISM/JM DIE/HAAS-HURCO/ (Hurco WinMax programs)
 *   - Customer folders: ALL STAR, FONTANA, SFS GROUP, TAPTITE, etc.
 *
 * AI Capabilities:
 *   - Operation sequence neural network (learned patterns)
 *   - Speed/feed optimization by material and tool
 *   - Tool selection intelligence
 *   - Z-level roughing strategy learning
 *   - Cutter compensation pattern detection
 *   - Amateur program error detection and correction
 *
 * @module engines/MillDeepLearningEngine
 * @version 1.0.0
 * @milestone MILL-DEEP-AI-MS0
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES — NEURAL NETWORK PATTERNS
// ============================================================================

/** Neural network node for operation sequence learning */
export interface OperationNode {
  operation: string;
  frequency: number;
  transitions: Map<string, number>; // Next operation -> count
  avgRPM: number;
  avgFeed: number;
  toolTypes: string[];
  materials: string[];
}

/** Learned cutting parameters per material/tool combo */
export interface CuttingParameterNeuron {
  material_iso: string;
  tool_type: string;
  tool_diameter_mm: number;
  rpm_samples: number[];
  feed_samples: number[];
  doc_samples: number[];
  proven_count: number; // From PROVEN PRG folders
  total_count: number;
  confidence: number;
}

/** Complete program analysis result */
export interface ProgramLearningResult {
  file_path: string;
  customer: string;
  is_proven: boolean;
  program_number: string;
  material: string;
  material_iso: string;
  operations: LearnedOperation[];
  total_tools: number;
  total_cycle_time_estimate_min: number;
  issues_detected: ProgramIssue[];
  recommendations: string[];
}

/** Individual operation learning */
export interface LearnedOperation {
  tool_number: number;
  tool_description: string;
  tool_type: string;
  tool_diameter_mm: number;
  operation_type: string;
  rpm: number;
  feed_ipm: number;
  doc_in: number;
  woc_in: number;
  canned_cycle?: string;
  cutter_comp: boolean;
  z_levels?: number[];
  surface_footage: number;
  chip_load: number;
}

/** Detected program issue (from amateur programmer) */
export interface ProgramIssue {
  severity: "critical" | "warning" | "suggestion";
  category: "speed_feed" | "operation_order" | "safety" | "efficiency" | "tool_selection";
  description: string;
  line?: number;
  current_value?: number;
  recommended_value?: number;
  rationale: string;
}

/** AI reasoning chain for decisions */
export interface DeepReasoningChain {
  question: string;
  evidence: string[];
  logic: string[];
  conclusion: string;
  confidence: number;
}

// ============================================================================
// JM DIE MILLING PATHS
// ============================================================================

const JM_DIE_MILL_PATHS = [
  "H:/PRISM/JM DIE/CNC MILL HAAS",
  "H:/PRISM/JM DIE/HAAS-HURCO",
  "H:/PRISM/JM DIE/ROKU-ROKU",
];

// ============================================================================
// MATERIAL CONSTANTS
// ============================================================================

const MATERIAL_SFM: Record<string, { min: number; max: number; typical: number }> = {
  // Steel (P)
  "P": { min: 80, max: 400, typical: 200 },
  // Stainless (M)
  "M": { min: 50, max: 300, typical: 150 },
  // Cast Iron (K)
  "K": { min: 100, max: 500, typical: 250 },
  // Aluminum (N)
  "N": { min: 500, max: 2000, typical: 800 },
  // Heat Resistant (S)
  "S": { min: 30, max: 150, typical: 80 },
  // Hardened (H)
  "H": { min: 50, max: 200, typical: 100 },
};

const CHIP_LOAD_TARGETS: Record<string, { min: number; max: number; typical: number }> = {
  // Per flute, inches
  "P": { min: 0.002, max: 0.008, typical: 0.004 },
  "M": { min: 0.001, max: 0.006, typical: 0.003 },
  "K": { min: 0.003, max: 0.010, typical: 0.005 },
  "N": { min: 0.004, max: 0.015, typical: 0.008 },
  "S": { min: 0.001, max: 0.004, typical: 0.002 },
  "H": { min: 0.001, max: 0.003, typical: 0.002 },
};

// ============================================================================
// MILL DEEP LEARNING ENGINE
// ============================================================================

export class MillDeepLearningEngine {
  // Neural network layers
  private operationNetwork: Map<string, OperationNode> = new Map();
  private parameterNeurons: CuttingParameterNeuron[] = [];
  private sequencePatterns: string[][] = [];
  private programsLearned: ProgramLearningResult[] = [];

  // Training statistics
  private totalProgramsParsed = 0;
  private totalProvenPrograms = 0;
  private totalOperationsLearned = 0;

  constructor() {
    this.initializeNetwork();
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  private initializeNetwork(): void {
    // Initialize operation nodes for all known operation types
    const opTypes = [
      "face", "rough_profile", "finish_profile", "rough_pocket", "finish_pocket",
      "contour", "spot_drill", "peck_drill", "drill", "tap", "ream", "bore",
      "chamfer", "engrave", "3d_rough", "3d_finish"
    ];

    for (const op of opTypes) {
      this.operationNetwork.set(op, {
        operation: op,
        frequency: 0,
        transitions: new Map(),
        avgRPM: 0,
        avgFeed: 0,
        toolTypes: [],
        materials: [],
      });
    }

    log.info("[MillDeepLearning] Neural network initialized with operation nodes");
  }

  // --------------------------------------------------------------------------
  // TRAINING — SCAN ALL JM DIE PROGRAMS
  // --------------------------------------------------------------------------

  /**
   * Train the AI on ALL JM Die milling programs.
   * Scans directories, parses NC files, extracts patterns.
   */
  async trainOnAllPrograms(): Promise<{
    programs_parsed: number;
    proven_programs: number;
    operations_learned: number;
    customers: string[];
    materials: string[];
    issues_found: number;
  }> {
    log.info("[MillDeepLearning] Starting deep learning training on JM Die programs...");

    const allFiles: string[] = [];
    const customers = new Set<string>();
    const materials = new Set<string>();
    let issuesFound = 0;

    // Scan all mill directories
    for (const basePath of JM_DIE_MILL_PATHS) {
      try {
        const files = this.scanDirectory(basePath);
        allFiles.push(...files);
        log.info(`[MillDeepLearning] Found ${files.length} NC files in ${basePath}`);
      } catch (err) {
        log.warn(`[MillDeepLearning] Could not scan ${basePath}: ${err}`);
      }
    }

    log.info(`[MillDeepLearning] Training on ${allFiles.length} total NC programs...`);

    // Parse each program
    for (const filePath of allFiles) {
      try {
        const result = await this.learnFromProgram(filePath);
        if (result) {
          this.programsLearned.push(result);
          customers.add(result.customer);
          if (result.material_iso) materials.add(result.material_iso);
          issuesFound += result.issues_detected.length;
        }
      } catch (err) {
        log.debug(`[MillDeepLearning] Failed to parse ${filePath}: ${err}`);
      }
    }

    // Build sequence patterns from learned programs
    this.buildSequencePatterns();

    const stats = {
      programs_parsed: this.totalProgramsParsed,
      proven_programs: this.totalProvenPrograms,
      operations_learned: this.totalOperationsLearned,
      customers: Array.from(customers),
      materials: Array.from(materials),
      issues_found: issuesFound,
    };

    log.info(`[MillDeepLearning] Training complete: ${JSON.stringify(stats)}`);
    return stats;
  }

  /**
   * Recursively scan directory for NC files.
   */
  private scanDirectory(dir: string): string[] {
    const results: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.scanDirectory(fullPath));
        } else if (entry.isFile() && /\.(nc|NC)$/i.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch (err) {
      // Directory not accessible
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // PROGRAM PARSING & LEARNING
  // --------------------------------------------------------------------------

  /**
   * Learn from a single NC program file.
   */
  async learnFromProgram(filePath: string): Promise<ProgramLearningResult | null> {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
    // Read-then-delegate so the file-based and content-based parse paths are ONE
    // (U-PPL-B2). filePath flows through for customer / proven-flag provenance.
    return this.learnFromContent(content, filePath);
  }

  /**
   * Learn from raw NC program CONTENT directly (no file read). Sibling of
   * learnFromProgram(filePath); filePath is optional and used only for the
   * customer / proven-flag provenance and the returned file_path field. Always
   * returns a (possibly degenerate, empty-operations) result -- never null --
   * since there is no file read here to fail.
   */
  async learnFromContent(content: string, filePath = ""): Promise<ProgramLearningResult | null> {
    const lines = content.split(/\r?\n/);
    const customer = this.extractCustomer(filePath);
    const isProven = filePath.toLowerCase().includes("proven");

    // Extract program metadata
    let programNumber = "";
    let programName = "";
    let material = "";
    let materialIso = "P"; // Default to steel

    const tools: Map<number, { desc: string; type: string; dia: number }> = new Map();
    const operations: LearnedOperation[] = [];
    const issues: ProgramIssue[] = [];

    // Current state
    let currentTool = 0;
    let currentRPM = 0;
    let currentFeed = 0;
    let lastZ = 0;
    let zLevels: number[] = [];
    let inCannedCycle = false;
    let cannedCycle = "";
    let hasCutterComp = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line) continue;

      // Program number
      const progMatch = line.match(/^O(\d+)/);
      if (progMatch) {
        programNumber = progMatch[1];
        const nameMatch = line.match(/\(([^)]+)\)/);
        if (nameMatch) programName = nameMatch[1];
      }

      // Material detection
      if (line.includes("MATERIAL")) {
        const matMatch = line.match(/MATERIAL\s*[-=]\s*([^)]+)/i);
        if (matMatch) {
          material = matMatch[1].trim();
          materialIso = this.classifyMaterial(material);
        }
      }

      // Tool definition
      const toolMatch = line.match(/\(\s*T(\d+)\s*\|\s*([^|)]+)/i);
      if (toolMatch) {
        const toolNum = parseInt(toolMatch[1]);
        const desc = toolMatch[2].trim();
        const diaMatch = desc.match(/([\d.]+)/);
        const dia = diaMatch ? parseFloat(diaMatch[1]) : 0;
        tools.set(toolNum, {
          desc,
          type: this.classifyToolType(desc),
          dia: dia * (line.includes("MM") ? 1 : 25.4), // Convert to mm
        });
      }

      // Tool change
      const toolChangeMatch = line.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      if (toolChangeMatch) {
        // Save previous operation
        if (currentTool > 0 && currentRPM > 0) {
          const tool = tools.get(currentTool);
          const op = this.createOperation(
            currentTool,
            tool?.desc || "",
            tool?.type || "unknown",
            tool?.dia || 0,
            currentRPM,
            currentFeed,
            zLevels,
            cannedCycle,
            hasCutterComp,
            materialIso
          );
          operations.push(op);
          this.updateNeuralNetwork(op, materialIso, isProven);
        }

        // Reset for new tool
        currentTool = parseInt(toolChangeMatch[1] || toolChangeMatch[2]);
        currentRPM = 0;
        currentFeed = 0;
        zLevels = [];
        inCannedCycle = false;
        cannedCycle = "";
        hasCutterComp = false;
      }

      // Spindle speed
      const rpmMatch = line.match(/S(\d+)/);
      if (rpmMatch) currentRPM = parseInt(rpmMatch[1]);

      // Feed rate
      const feedMatch = line.match(/F([\d.]+)/);
      if (feedMatch) currentFeed = parseFloat(feedMatch[1]);

      // Canned cycles
      if (line.includes("G81")) { cannedCycle = "G81"; inCannedCycle = true; }
      if (line.includes("G83") || line.includes("G73")) { cannedCycle = "G83"; inCannedCycle = true; }
      if (line.includes("G84") || line.includes("G74")) { cannedCycle = "G84"; inCannedCycle = true; }
      if (line.includes("G80")) inCannedCycle = false;

      // Cutter compensation
      if (line.includes("G41") || line.includes("G42")) hasCutterComp = true;
      if (line.includes("G40")) hasCutterComp = false;

      // Z-level tracking
      const zMatch = line.match(/Z(-?[\d.]+)/);
      if (zMatch) {
        const z = parseFloat(zMatch[1]);
        if (z < 0 && !zLevels.includes(z)) {
          zLevels.push(z);
        }
        lastZ = z;
      }
    }

    // Save final operation
    if (currentTool > 0 && currentRPM > 0) {
      const tool = tools.get(currentTool);
      const op = this.createOperation(
        currentTool,
        tool?.desc || "",
        tool?.type || "unknown",
        tool?.dia || 0,
        currentRPM,
        currentFeed,
        zLevels,
        cannedCycle,
        hasCutterComp,
        materialIso
      );
      operations.push(op);
      this.updateNeuralNetwork(op, materialIso, isProven);
    }

    // Analyze for issues
    const detectedIssues = this.detectIssues(operations, materialIso, isProven);
    issues.push(...detectedIssues);

    // Update statistics
    this.totalProgramsParsed++;
    if (isProven) this.totalProvenPrograms++;
    this.totalOperationsLearned += operations.length;

    return {
      file_path: filePath,
      customer,
      is_proven: isProven,
      program_number: programNumber,
      material,
      material_iso: materialIso,
      operations,
      total_tools: tools.size,
      total_cycle_time_estimate_min: this.estimateCycleTime(operations),
      issues_detected: issues,
      recommendations: this.generateRecommendations(operations, issues, materialIso),
    };
  }

  // --------------------------------------------------------------------------
  // NEURAL NETWORK UPDATES
  // --------------------------------------------------------------------------

  private createOperation(
    toolNum: number, desc: string, type: string, dia: number,
    rpm: number, feed: number, zLevels: number[],
    cannedCycle: string, cutterComp: boolean, materialIso: string
  ): LearnedOperation {
    // Calculate surface footage
    const diameterIn = dia / 25.4;
    const sfm = (rpm * Math.PI * diameterIn) / 12;

    // Estimate chip load (assuming 2-4 flutes)
    const flutes = type.includes("drill") ? 2 : type.includes("tap") ? 2 : 4;
    const chipLoad = feed / (rpm * flutes);

    // Calculate DOC from Z levels
    let doc = 0;
    if (zLevels.length > 1) {
      const sorted = [...zLevels].sort((a, b) => b - a);
      doc = Math.abs(sorted[1] - sorted[0]);
    }

    const opType = this.classifyOperation(cannedCycle, type, cutterComp, desc);

    return {
      tool_number: toolNum,
      tool_description: desc,
      tool_type: type,
      tool_diameter_mm: dia,
      operation_type: opType,
      rpm,
      feed_ipm: feed,
      doc_in: doc,
      woc_in: 0, // Would need more analysis
      canned_cycle: cannedCycle || undefined,
      cutter_comp: cutterComp,
      z_levels: zLevels.length > 0 ? zLevels : undefined,
      surface_footage: sfm,
      chip_load: chipLoad,
    };
  }

  private updateNeuralNetwork(op: LearnedOperation, materialIso: string, isProven: boolean): void {
    // Update operation node
    const node = this.operationNetwork.get(op.operation_type);
    if (node) {
      node.frequency++;
      // Running average for RPM/Feed
      const n = node.frequency;
      node.avgRPM = ((n - 1) * node.avgRPM + op.rpm) / n;
      node.avgFeed = ((n - 1) * node.avgFeed + op.feed_ipm) / n;
      if (!node.toolTypes.includes(op.tool_type)) node.toolTypes.push(op.tool_type);
      if (!node.materials.includes(materialIso)) node.materials.push(materialIso);
    }

    // Update or create parameter neuron
    let neuron = this.parameterNeurons.find(n =>
      n.material_iso === materialIso &&
      n.tool_type === op.tool_type &&
      Math.abs(n.tool_diameter_mm - op.tool_diameter_mm) < 1
    );

    if (!neuron) {
      neuron = {
        material_iso: materialIso,
        tool_type: op.tool_type,
        tool_diameter_mm: op.tool_diameter_mm,
        rpm_samples: [],
        feed_samples: [],
        doc_samples: [],
        proven_count: 0,
        total_count: 0,
        confidence: 0.5,
      };
      this.parameterNeurons.push(neuron);
    }

    neuron.rpm_samples.push(op.rpm);
    neuron.feed_samples.push(op.feed_ipm);
    if (op.doc_in > 0) neuron.doc_samples.push(op.doc_in);
    neuron.total_count++;
    if (isProven) neuron.proven_count++;

    // Update confidence based on sample size and proven ratio
    const provenRatio = neuron.proven_count / neuron.total_count;
    const sampleBonus = Math.min(neuron.total_count / 10, 0.3);
    neuron.confidence = Math.min(0.5 + provenRatio * 0.3 + sampleBonus, 0.98);
  }

  private buildSequencePatterns(): void {
    // Extract operation sequences from all learned programs
    for (const prog of this.programsLearned) {
      if (prog.operations.length >= 2) {
        const sequence = prog.operations.map(o => o.operation_type);
        this.sequencePatterns.push(sequence);

        // Update transition probabilities in network
        for (let i = 0; i < sequence.length - 1; i++) {
          const fromNode = this.operationNetwork.get(sequence[i]);
          if (fromNode) {
            const count = fromNode.transitions.get(sequence[i + 1]) || 0;
            fromNode.transitions.set(sequence[i + 1], count + 1);
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // ISSUE DETECTION (AMATEUR PROGRAMMER ERRORS)
  // --------------------------------------------------------------------------

  private detectIssues(
    operations: LearnedOperation[],
    materialIso: string,
    isProven: boolean
  ): ProgramIssue[] {
    const issues: ProgramIssue[] = [];
    const sfmRange = MATERIAL_SFM[materialIso] || MATERIAL_SFM["P"];
    const chipRange = CHIP_LOAD_TARGETS[materialIso] || CHIP_LOAD_TARGETS["P"];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      // Check surface footage
      if (op.surface_footage > 0) {
        if (op.surface_footage < sfmRange.min * 0.5) {
          issues.push({
            severity: "warning",
            category: "speed_feed",
            description: `Surface speed too low for ${materialIso}: ${Math.round(op.surface_footage)} SFM`,
            current_value: op.surface_footage,
            recommended_value: sfmRange.typical,
            rationale: `For ${materialIso} material, recommended SFM is ${sfmRange.min}-${sfmRange.max}. Low SFM causes poor chip formation and increased cutting forces.`,
          });
        } else if (op.surface_footage > sfmRange.max * 1.5) {
          issues.push({
            severity: "critical",
            category: "speed_feed",
            description: `Surface speed dangerously high for ${materialIso}: ${Math.round(op.surface_footage)} SFM`,
            current_value: op.surface_footage,
            recommended_value: sfmRange.typical,
            rationale: `For ${materialIso} material, max SFM is ${sfmRange.max}. Excessive speed causes rapid tool wear and potential failure.`,
          });
        }
      }

      // Check chip load
      if (op.chip_load > 0) {
        if (op.chip_load < chipRange.min * 0.5) {
          issues.push({
            severity: "suggestion",
            category: "efficiency",
            description: `Chip load too conservative: ${op.chip_load.toFixed(4)} IPT`,
            current_value: op.chip_load,
            recommended_value: chipRange.typical,
            rationale: `Low chip load increases cycle time without improving quality. Consider increasing feed rate.`,
          });
        } else if (op.chip_load > chipRange.max * 1.5) {
          issues.push({
            severity: "warning",
            category: "speed_feed",
            description: `Chip load too aggressive: ${op.chip_load.toFixed(4)} IPT`,
            current_value: op.chip_load,
            recommended_value: chipRange.typical,
            rationale: `Excessive chip load can cause tool breakage and poor surface finish.`,
          });
        }
      }

      // Check operation order (spot drill should come before drill/tap)
      if (op.operation_type === "drill" || op.operation_type === "tap" || op.operation_type === "peck_drill") {
        const prevOps = operations.slice(0, i).map(o => o.operation_type);
        if (!prevOps.includes("spot_drill") && !prevOps.includes("drill")) {
          issues.push({
            severity: "suggestion",
            category: "operation_order",
            description: `${op.operation_type} without prior spot drill`,
            rationale: `Spot drilling improves hole accuracy and prevents drill walking. Recommended for precision work.`,
          });
        }
      }

      // Check for missing coolant operations (high SFM without coolant indicator)
      if (op.surface_footage > 400 && materialIso !== "N") {
        // High speed on non-aluminum without flood coolant comment could be an issue
        // This would need more context from the NC code
      }
    }

    // Check sequence for common patterns
    const opSequence = operations.map(o => o.operation_type);

    // Finishing before roughing
    const roughIdx = opSequence.findIndex(o => o.includes("rough"));
    const finishIdx = opSequence.findIndex(o => o.includes("finish"));
    if (finishIdx >= 0 && roughIdx >= 0 && finishIdx < roughIdx) {
      issues.push({
        severity: "critical",
        category: "operation_order",
        description: "Finish operation before rough operation",
        rationale: "Roughing should always precede finishing to leave appropriate stock for finish pass.",
      });
    }

    return issues;
  }

  // --------------------------------------------------------------------------
  // RECOMMENDATIONS
  // --------------------------------------------------------------------------

  private generateRecommendations(
    operations: LearnedOperation[],
    issues: ProgramIssue[],
    materialIso: string
  ): string[] {
    const recs: string[] = [];

    // Group issues by category
    const speedFeedIssues = issues.filter(i => i.category === "speed_feed");
    const orderIssues = issues.filter(i => i.category === "operation_order");
    const efficiencyIssues = issues.filter(i => i.category === "efficiency");

    if (speedFeedIssues.length > 0) {
      recs.push(`Review ${speedFeedIssues.length} speed/feed settings for optimal machining parameters`);
    }

    if (orderIssues.length > 0) {
      recs.push(`Consider reordering operations: ${orderIssues.map(i => i.description).join("; ")}`);
    }

    if (efficiencyIssues.length > 0) {
      recs.push(`Efficiency improvements possible: increase feed rates for better cycle time`);
    }

    // Look for opportunities based on learned patterns
    const opTypes = new Set(operations.map(o => o.operation_type));
    if (opTypes.has("rough_profile") && !opTypes.has("finish_profile")) {
      recs.push("Consider adding finish profile pass for better surface quality");
    }

    if (operations.some(o => o.z_levels && o.z_levels.length > 10)) {
      recs.push("Heavy Z-level roughing detected — consider adaptive/high-efficiency toolpath");
    }

    return recs;
  }

  // --------------------------------------------------------------------------
  // DEEP REASONING
  // --------------------------------------------------------------------------

  /**
   * Apply deep reasoning to analyze a machining decision.
   */
  deepReason(question: string, context: Record<string, unknown>): DeepReasoningChain {
    const evidence: string[] = [];
    const logic: string[] = [];

    // Gather evidence from learned data
    if (context.material_iso) {
      const iso = context.material_iso as string;
      const neurons = this.parameterNeurons.filter(n => n.material_iso === iso);
      if (neurons.length > 0) {
        evidence.push(`Found ${neurons.length} learned patterns for material ${iso}`);
        const provenNeurons = neurons.filter(n => n.proven_count > 0);
        if (provenNeurons.length > 0) {
          evidence.push(`${provenNeurons.length} patterns come from PROVEN programs`);
        }
      }
    }

    if (context.operation_type) {
      const node = this.operationNetwork.get(context.operation_type as string);
      if (node) {
        evidence.push(`Operation ${context.operation_type} seen ${node.frequency} times`);
        evidence.push(`Average RPM: ${Math.round(node.avgRPM)}, Average Feed: ${node.avgFeed.toFixed(1)}`);

        // Most common next operations
        const transitions = Array.from(node.transitions.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        if (transitions.length > 0) {
          evidence.push(`Common follow-up operations: ${transitions.map(t => `${t[0]} (${t[1]}x)`).join(", ")}`);
        }
      }
    }

    // Apply reasoning logic
    if (question.toLowerCase().includes("speed") || question.toLowerCase().includes("rpm")) {
      logic.push("Surface speed (SFM) = (RPM × π × Diameter) / 12");
      logic.push("Material hardness determines optimal SFM range");
      if (context.material_iso) {
        const range = MATERIAL_SFM[context.material_iso as string];
        if (range) {
          logic.push(`For ${context.material_iso}: SFM range is ${range.min}-${range.max}, typical ${range.typical}`);
        }
      }
    }

    if (question.toLowerCase().includes("feed") || question.toLowerCase().includes("chip")) {
      logic.push("Feed rate = RPM × Flutes × Chip Load");
      logic.push("Chip load affects tool life, surface finish, and cycle time");
      if (context.material_iso) {
        const range = CHIP_LOAD_TARGETS[context.material_iso as string];
        if (range) {
          logic.push(`For ${context.material_iso}: chip load target is ${range.typical} IPT`);
        }
      }
    }

    if (question.toLowerCase().includes("order") || question.toLowerCase().includes("sequence")) {
      logic.push("Standard milling sequence: Face → Rough → Finish → Drill → Tap");
      logic.push("Spot drilling before drilling improves accuracy");
      logic.push("Roughing before finishing ensures consistent stock removal");
    }

    // Synthesize conclusion
    let conclusion = "";
    let confidence = 0.7;

    if (evidence.length > 0 && logic.length > 0) {
      conclusion = `Based on ${evidence.length} pieces of evidence and ${logic.length} logical principles, `;
      if (context.operation_type && context.material_iso) {
        const neuron = this.parameterNeurons.find(n =>
          n.material_iso === context.material_iso &&
          n.tool_type.includes(context.operation_type as string)
        );
        if (neuron) {
          const avgRPM = neuron.rpm_samples.reduce((a, b) => a + b, 0) / neuron.rpm_samples.length;
          const avgFeed = neuron.feed_samples.reduce((a, b) => a + b, 0) / neuron.feed_samples.length;
          conclusion += `recommend RPM: ${Math.round(avgRPM)}, Feed: ${avgFeed.toFixed(1)} IPM`;
          confidence = neuron.confidence;
        } else {
          conclusion += "no specific pattern found — apply general guidelines";
        }
      } else {
        conclusion += "apply standard machining best practices";
      }
    } else {
      conclusion = "Insufficient data for specific recommendation";
      confidence = 0.3;
    }

    return {
      question,
      evidence,
      logic,
      conclusion,
      confidence,
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC API — RECOMMENDATIONS
  // --------------------------------------------------------------------------

  /**
   * Get optimized cutting parameters based on learned patterns.
   */
  getOptimizedParams(
    materialIso: string,
    toolType: string,
    toolDiameterMm: number
  ): {
    rpm: number;
    feed: number;
    doc: number;
    confidence: number;
    based_on: number;
    from_proven: number;
  } | null {
    // Find closest matching neuron
    const candidates = this.parameterNeurons
      .filter(n =>
        n.material_iso === materialIso &&
        n.tool_type === toolType &&
        Math.abs(n.tool_diameter_mm - toolDiameterMm) < 5
      )
      .sort((a, b) => {
        // Prefer closer diameter match and higher sample count
        const diaDiff = Math.abs(a.tool_diameter_mm - toolDiameterMm) - Math.abs(b.tool_diameter_mm - toolDiameterMm);
        if (diaDiff !== 0) return diaDiff;
        return b.total_count - a.total_count;
      });

    if (candidates.length === 0) return null;

    const best = candidates[0];
    const avgRPM = best.rpm_samples.reduce((a, b) => a + b, 0) / best.rpm_samples.length;
    const avgFeed = best.feed_samples.reduce((a, b) => a + b, 0) / best.feed_samples.length;
    const avgDOC = best.doc_samples.length > 0
      ? best.doc_samples.reduce((a, b) => a + b, 0) / best.doc_samples.length
      : 0;

    return {
      rpm: Math.round(avgRPM),
      feed: Math.round(avgFeed * 10) / 10,
      doc: Math.round(avgDOC * 1000) / 1000,
      confidence: best.confidence,
      based_on: best.total_count,
      from_proven: best.proven_count,
    };
  }

  /**
   * Recommend operation sequence for given features.
   */
  recommendSequence(features: string[]): {
    sequence: string[];
    confidence: number;
    rationale: string;
  } {
    const needed = new Set<string>();

    // Map features to operations
    for (const f of features) {
      const fl = f.toLowerCase();
      if (fl.includes("face")) needed.add("face");
      if (fl.includes("pocket")) {
        needed.add("rough_pocket");
        needed.add("finish_pocket");
      }
      if (fl.includes("profile") || fl.includes("contour")) {
        needed.add("rough_profile");
        needed.add("finish_profile");
      }
      if (fl.includes("hole") || fl.includes("drill")) {
        needed.add("spot_drill");
        needed.add("drill");
      }
      if (fl.includes("thread") || fl.includes("tap")) {
        needed.add("spot_drill");
        needed.add("peck_drill");
        needed.add("tap");
      }
      if (fl.includes("chamfer")) needed.add("chamfer");
    }

    // Find best matching sequence from learned patterns
    let bestMatch: string[] = [];
    let bestScore = 0;

    for (const seq of this.sequencePatterns) {
      const seqSet = new Set(seq);
      const overlap = [...needed].filter(op => seqSet.has(op)).length;
      const score = overlap / needed.size;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = seq.filter(op => needed.has(op));
      }
    }

    // If no good match, use default sequence
    if (bestScore < 0.5) {
      bestMatch = [
        "face", "rough_profile", "finish_profile",
        "rough_pocket", "finish_pocket",
        "spot_drill", "drill", "peck_drill", "tap", "chamfer"
      ].filter(op => needed.has(op));
    }

    return {
      sequence: bestMatch,
      confidence: bestScore,
      rationale: bestScore >= 0.5
        ? `Based on ${this.sequencePatterns.length} learned sequences`
        : "Using standard machining sequence",
    };
  }

  /**
   * Get training statistics.
   */
  getStatistics(): {
    programs_parsed: number;
    proven_programs: number;
    operations_learned: number;
    parameter_neurons: number;
    sequence_patterns: number;
    customers_learned: string[];
    operation_frequencies: Record<string, number>;
  } {
    const opFreq: Record<string, number> = {};
    for (const [op, node] of this.operationNetwork) {
      if (node.frequency > 0) opFreq[op] = node.frequency;
    }

    const customers = [...new Set(this.programsLearned.map(p => p.customer))];

    return {
      programs_parsed: this.totalProgramsParsed,
      proven_programs: this.totalProvenPrograms,
      operations_learned: this.totalOperationsLearned,
      parameter_neurons: this.parameterNeurons.length,
      sequence_patterns: this.sequencePatterns.length,
      customers_learned: customers,
      operation_frequencies: opFreq,
    };
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  private extractCustomer(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    const haasIdx = parts.findIndex(p =>
      p.toUpperCase().includes("HAAS") ||
      p.toUpperCase().includes("HURCO") ||
      p.toUpperCase().includes("ROKU")
    );
    if (haasIdx >= 0 && haasIdx < parts.length - 1) {
      return parts[haasIdx + 1];
    }
    return "UNKNOWN";
  }

  private classifyMaterial(material: string): string {
    const m = material.toUpperCase();
    if (m.includes("ALUMINUM") || m.includes("ALUM") || m.includes("2024") || m.includes("6061") || m.includes("7075")) return "N";
    if (m.includes("STAINLESS") || m.includes("316") || m.includes("304") || m.includes("17-4")) return "M";
    if (m.includes("TITANIUM") || m.includes("TI-") || m.includes("INCONEL")) return "S";
    if (m.includes("CAST") && m.includes("IRON")) return "K";
    if (m.includes("HARD") || m.includes("H13") || m.includes("D2") || m.includes("M2")) return "H";
    return "P"; // Default to steel
  }

  private classifyToolType(desc: string): string {
    const d = desc.toUpperCase();
    if (d.includes("SPOT")) return "spot_drill";
    if (d.includes("CENTER")) return "center_drill";
    if (d.includes("DRILL")) return "twist_drill";
    if (d.includes("INSERT") && (d.includes("END") || d.includes("EM"))) return "insert_endmill";
    if (d.includes("FLAT") || d.includes("EM ") || d.match(/\d+\s*EM\b/) || (d.includes("ENDMILL") && !d.includes("BALL"))) return "flat_endmill";
    if (d.includes("BALL")) return "ball_endmill";
    if (d.includes("BULL")) return "bull_endmill";
    if (d.includes("FACE") && d.includes("MILL")) return "face_mill";
    if (d.includes("CHAMFER")) return "chamfer_mill";
    if (d.includes("TAP") || d.includes("UNF") || d.includes("UNC")) return "tap";
    if (d.includes("REAM")) return "reamer";
    if (d.includes("BORE") || d.includes("BORING")) return "boring_bar";
    if (d.includes("ENGRAV")) return "engraver";
    return "unknown";
  }

  private classifyOperation(
    cannedCycle: string,
    toolType: string,
    cutterComp: boolean,
    desc: string
  ): string {
    const d = desc.toUpperCase();

    // Canned cycles
    if (cannedCycle === "G81") return "drill";
    if (cannedCycle === "G83" || cannedCycle === "G73") return "peck_drill";
    if (cannedCycle === "G84" || cannedCycle === "G74") return "tap";
    if (cannedCycle === "G85" || cannedCycle === "G86") return "ream";
    if (cannedCycle === "G76" || cannedCycle === "G87") return "bore";

    // Comment-based
    if (d.includes("FACE")) return "face";
    if (d.includes("ROUGH") && d.includes("PROFILE")) return "rough_profile";
    if (d.includes("FINIS") && d.includes("PROFILE")) return "finish_profile";
    if (d.includes("ROUGH") && d.includes("POCKET")) return "rough_pocket";
    if (d.includes("FINIS") && d.includes("POCKET")) return "finish_pocket";
    if (d.includes("CHAMFER")) return "chamfer";
    if (d.includes("CONTOUR") || d.includes("PROFILE")) return "contour";

    // Tool-based
    if (toolType === "spot_drill") return "spot_drill";
    if (toolType === "tap") return "tap";
    if (toolType === "reamer") return "ream";
    if (toolType === "chamfer_mill") return "chamfer";
    if (toolType === "face_mill") return "face";

    // Cutter comp usually means profiling
    if (cutterComp) return "rough_profile";

    return "unknown";
  }

  private estimateCycleTime(operations: LearnedOperation[]): number {
    // Very rough estimate based on operations
    let totalMin = 0;
    for (const op of operations) {
      // Tool change ~0.5 min
      totalMin += 0.5;

      // Estimate cutting time based on Z depth and feed
      if (op.z_levels && op.z_levels.length > 0 && op.feed_ipm > 0) {
        const totalDepth = Math.abs(Math.min(...op.z_levels));
        // Assume average travel of 10" per pass
        const passes = op.z_levels.length;
        const travelPerPass = 10;
        totalMin += (passes * travelPerPass) / op.feed_ipm;
      } else {
        // Default ~1 min per operation
        totalMin += 1;
      }
    }
    return Math.round(totalMin * 10) / 10;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millDeepLearningEngine = new MillDeepLearningEngine();
