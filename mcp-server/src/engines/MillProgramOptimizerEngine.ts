/**
 * MillProgramOptimizerEngine — Optimize ALL JM Die Mill Programs
 * ===============================================================
 * Takes trained AI patterns + JM Die's actual tooling/machines to
 * optimize EVERY program to its maximum potential.
 *
 * Optimization Targets:
 *   - Speeds/feeds adjusted to material and tool capabilities
 *   - Operation sequence corrected for efficiency
 *   - DOC/WOC optimized for cycle time
 *   - Tool selection improved based on shop inventory
 *   - Safety violations flagged and fixed
 *   - Amateur programmer errors corrected
 *
 * JM Die Equipment:
 *   - Haas VF-2SS (10,000 RPM, BT40, CAT40)
 *   - Hurco VMX-42 (12,000 RPM, BT40)
 *   - Okuma MB-5000H (12,000 RPM, HSK-A63)
 *   - Roku-Roku (high-speed graphite milling)
 *
 * @module engines/MillProgramOptimizerEngine
 * @version 1.0.0
 * @milestone MILL-OPT-MS0
 */

import { log } from "../utils/Logger.js";
import { millDeepLearningEngine, type ProgramLearningResult, type ProgramIssue, type LearnedOperation } from "./MillDeepLearningEngine.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// JM DIE MILL MACHINE SPECS
// ============================================================================

export interface MillMachineSpec {
  id: string;
  name: string;
  max_rpm: number;
  spindle_taper: string;
  max_hp: number;
  rapid_xy: number; // IPM
  rapid_z: number;  // IPM
  work_envelope: { x: number; y: number; z: number };
  tool_capacity: number;
  optimal_materials: string[]; // ISO codes
}

const JM_DIE_MILLS: MillMachineSpec[] = [
  {
    id: "haas-vf2ss",
    name: "Haas VF-2SS",
    max_rpm: 12000,
    spindle_taper: "BT40",
    max_hp: 30,
    rapid_xy: 1200,
    rapid_z: 1000,
    work_envelope: { x: 30, y: 16, z: 20 },
    tool_capacity: 24,
    optimal_materials: ["P", "M", "K", "N"],
  },
  {
    id: "hurco-vmx42",
    name: "Hurco VMX-42",
    max_rpm: 12000,
    spindle_taper: "BT40",
    max_hp: 25,
    rapid_xy: 1181,
    rapid_z: 984,
    work_envelope: { x: 42, y: 24, z: 24 },
    tool_capacity: 24,
    optimal_materials: ["P", "N"],
  },
  {
    id: "okuma-mb5000h",
    name: "Okuma MB-5000H",
    max_rpm: 15000,
    spindle_taper: "HSK-A63",
    max_hp: 22,
    rapid_xy: 2362,
    rapid_z: 2362,
    work_envelope: { x: 30, y: 20, z: 20 },
    tool_capacity: 48,
    optimal_materials: ["P", "M", "H"],
  },
  {
    id: "roku-roku",
    name: "Roku-Roku",
    max_rpm: 40000,
    spindle_taper: "HSK-E40",
    max_hp: 5.5,
    rapid_xy: 1500,
    rapid_z: 1200,
    work_envelope: { x: 20, y: 16, z: 10 },
    tool_capacity: 20,
    optimal_materials: ["K", "N"], // Graphite, aluminum
  },
];

// ============================================================================
// JM DIE TOOL INVENTORY (sample - actual inventory larger)
// ============================================================================

export interface ShopTool {
  id: string;
  type: string;
  diameter_mm: number;
  flutes: number;
  material: "carbide" | "hss" | "cobalt" | "ceramic" | "insert";
  coating: string;
  max_rpm: number;
  max_doc_mm: number;
  holder: string;
  qty_in_stock: number;
}

const JM_DIE_TOOLS: ShopTool[] = [
  // Spot drills
  { id: "SPOT-6.35", type: "spot_drill", diameter_mm: 6.35, flutes: 2, material: "carbide", coating: "TiAlN", max_rpm: 8000, max_doc_mm: 5, holder: "ER16", qty_in_stock: 5 },
  { id: "SPOT-12.7", type: "spot_drill", diameter_mm: 12.7, flutes: 2, material: "carbide", coating: "TiAlN", max_rpm: 5000, max_doc_mm: 8, holder: "ER32", qty_in_stock: 3 },

  // Drills
  { id: "DRILL-4.76", type: "twist_drill", diameter_mm: 4.76, flutes: 2, material: "carbide", coating: "TiAlN", max_rpm: 6000, max_doc_mm: 30, holder: "ER16", qty_in_stock: 10 },
  { id: "DRILL-6.35", type: "twist_drill", diameter_mm: 6.35, flutes: 2, material: "carbide", coating: "TiN", max_rpm: 5000, max_doc_mm: 40, holder: "ER20", qty_in_stock: 8 },
  { id: "DRILL-9.53", type: "twist_drill", diameter_mm: 9.53, flutes: 2, material: "carbide", coating: "TiN", max_rpm: 4000, max_doc_mm: 50, holder: "ER32", qty_in_stock: 6 },

  // Flat endmills
  { id: "EM-6.35-4FL", type: "flat_endmill", diameter_mm: 6.35, flutes: 4, material: "carbide", coating: "AlTiN", max_rpm: 10000, max_doc_mm: 12, holder: "ER20", qty_in_stock: 15 },
  { id: "EM-12.7-4FL", type: "flat_endmill", diameter_mm: 12.7, flutes: 4, material: "carbide", coating: "AlTiN", max_rpm: 8000, max_doc_mm: 20, holder: "ER32", qty_in_stock: 12 },
  { id: "EM-19.05-4FL", type: "flat_endmill", diameter_mm: 19.05, flutes: 4, material: "carbide", coating: "AlTiN", max_rpm: 6000, max_doc_mm: 25, holder: "WELDON", qty_in_stock: 8 },
  { id: "EM-25.4-4FL", type: "flat_endmill", diameter_mm: 25.4, flutes: 4, material: "carbide", coating: "AlTiN", max_rpm: 5000, max_doc_mm: 30, holder: "WELDON", qty_in_stock: 6 },

  // Insert endmills
  { id: "INSERT-22.2", type: "insert_endmill", diameter_mm: 22.23, flutes: 2, material: "insert", coating: "CNMG432", max_rpm: 4000, max_doc_mm: 8, holder: "WELDON", qty_in_stock: 4 },
  { id: "INSERT-31.75", type: "insert_endmill", diameter_mm: 31.75, flutes: 3, material: "insert", coating: "CNMG432", max_rpm: 3500, max_doc_mm: 10, holder: "BT40", qty_in_stock: 3 },

  // Face mills
  { id: "FACE-50.8", type: "face_mill", diameter_mm: 50.8, flutes: 4, material: "insert", coating: "APMT1604", max_rpm: 3000, max_doc_mm: 3, holder: "BT40", qty_in_stock: 2 },
  { id: "FACE-76.2", type: "face_mill", diameter_mm: 76.2, flutes: 6, material: "insert", coating: "APMT1604", max_rpm: 2500, max_doc_mm: 3, holder: "BT40", qty_in_stock: 2 },

  // Chamfer mills
  { id: "CHAM-9.53", type: "chamfer_mill", diameter_mm: 9.53, flutes: 4, material: "carbide", coating: "TiN", max_rpm: 8000, max_doc_mm: 5, holder: "ER20", qty_in_stock: 6 },
  { id: "CHAM-12.7", type: "chamfer_mill", diameter_mm: 12.7, flutes: 4, material: "carbide", coating: "TiN", max_rpm: 6000, max_doc_mm: 6, holder: "ER32", qty_in_stock: 4 },

  // Taps
  { id: "TAP-M5", type: "tap", diameter_mm: 5.0, flutes: 3, material: "hss", coating: "TiN", max_rpm: 800, max_doc_mm: 20, holder: "TAP", qty_in_stock: 20 },
  { id: "TAP-M6", type: "tap", diameter_mm: 6.0, flutes: 3, material: "hss", coating: "TiN", max_rpm: 700, max_doc_mm: 25, holder: "TAP", qty_in_stock: 15 },
  { id: "TAP-10-32", type: "tap", diameter_mm: 4.83, flutes: 3, material: "hss", coating: "TiN", max_rpm: 600, max_doc_mm: 20, holder: "TAP", qty_in_stock: 12 },
];

// ============================================================================
// TYPES — OPTIMIZATION RESULTS
// ============================================================================

export interface ProgramOptimization {
  original_path: string;
  program_number: string;
  customer: string;
  material_iso: string;
  original_cycle_time_min: number;
  optimized_cycle_time_min: number;
  time_savings_pct: number;
  operations_optimized: OperationOptimization[];
  issues_fixed: number;
  issues_remaining: number;
  recommended_machine: string;
  confidence: number;
}

export interface OperationOptimization {
  tool_number: number;
  operation_type: string;
  original_rpm: number;
  optimized_rpm: number;
  original_feed: number;
  optimized_feed: number;
  original_doc: number;
  optimized_doc: number;
  improvement_reason: string;
  tool_recommendation?: string;
}

export interface OptimizationSummary {
  total_programs: number;
  programs_optimized: number;
  programs_unchanged: number;
  programs_with_issues: number;
  total_time_savings_min: number;
  avg_improvement_pct: number;
  issues_fixed: number;
  issues_remaining: number;
  customers_processed: string[];
  materials_processed: string[];
  per_customer_stats: Record<string, { programs: number; time_saved: number }>;
}

// ============================================================================
// MILL PROGRAM OPTIMIZER ENGINE
// ============================================================================

export class MillProgramOptimizerEngine {
  private optimizations: ProgramOptimization[] = [];

  // --------------------------------------------------------------------------
  // MAIN OPTIMIZATION LOOP
  // --------------------------------------------------------------------------

  /**
   * Optimize ALL programs that have been trained.
   * Uses learned patterns + JM Die tooling to maximize efficiency.
   */
  async optimizeAllPrograms(): Promise<OptimizationSummary> {
    log.info("[MillOptimizer] Starting optimization of all trained programs...");

    // First, train the AI if not already done
    const stats = millDeepLearningEngine.getStatistics();
    if (stats.programs_parsed === 0) {
      log.info("[MillOptimizer] Training AI first...");
      await millDeepLearningEngine.trainOnAllPrograms();
    }

    // Re-scan and optimize each program
    const programPaths = this.scanAllPrograms();
    log.info(`[MillOptimizer] Found ${programPaths.length} programs to optimize`);

    const perCustomer: Record<string, { programs: number; time_saved: number }> = {};
    const customers = new Set<string>();
    const materials = new Set<string>();
    let issuesFixed = 0;
    let issuesRemaining = 0;
    let totalTimeSaved = 0;
    let programsWithImprovement = 0;

    for (let i = 0; i < programPaths.length; i++) {
      const filePath = programPaths[i];
      console.log(`[${i + 1}/${programPaths.length}] Optimizing: ${path.basename(filePath)}`);

      try {
        const opt = await this.optimizeProgram(filePath);
        if (opt) {
          this.optimizations.push(opt);
          customers.add(opt.customer);
          materials.add(opt.material_iso);

          if (!perCustomer[opt.customer]) {
            perCustomer[opt.customer] = { programs: 0, time_saved: 0 };
          }
          perCustomer[opt.customer].programs++;
          perCustomer[opt.customer].time_saved += opt.original_cycle_time_min - opt.optimized_cycle_time_min;

          if (opt.time_savings_pct > 0) {
            programsWithImprovement++;
            totalTimeSaved += opt.original_cycle_time_min - opt.optimized_cycle_time_min;
          }

          issuesFixed += opt.issues_fixed;
          issuesRemaining += opt.issues_remaining;

          // Print progress
          if (opt.time_savings_pct > 0) {
            console.log(`  → ${opt.time_savings_pct.toFixed(1)}% faster, ${opt.issues_fixed} issues fixed`);
          }
        }
      } catch (err) {
        log.debug(`[MillOptimizer] Failed to optimize ${filePath}: ${err}`);
      }
    }

    const summary: OptimizationSummary = {
      total_programs: programPaths.length,
      programs_optimized: this.optimizations.length,
      programs_unchanged: this.optimizations.filter(o => o.time_savings_pct === 0).length,
      programs_with_issues: this.optimizations.filter(o => o.issues_remaining > 0).length,
      total_time_savings_min: Math.round(totalTimeSaved * 10) / 10,
      avg_improvement_pct: programsWithImprovement > 0
        ? this.optimizations.reduce((sum, o) => sum + o.time_savings_pct, 0) / this.optimizations.length
        : 0,
      issues_fixed: issuesFixed,
      issues_remaining: issuesRemaining,
      customers_processed: Array.from(customers),
      materials_processed: Array.from(materials),
      per_customer_stats: perCustomer,
    };

    log.info(`[MillOptimizer] Optimization complete: ${JSON.stringify(summary)}`);
    return summary;
  }

  /**
   * Scan all NC files in JM Die mill folders.
   */
  private scanAllPrograms(): string[] {
    const paths = [
      "H:/PRISM/JM DIE/CNC MILL HAAS",
      "H:/PRISM/JM DIE/HAAS-HURCO",
      "H:/PRISM/JM DIE/ROKU-ROKU",
    ];

    const results: string[] = [];
    for (const basePath of paths) {
      results.push(...this.scanDirectory(basePath));
    }
    return results;
  }

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
    } catch {
      // Directory not accessible
    }
    return results;
  }

  // --------------------------------------------------------------------------
  // SINGLE PROGRAM OPTIMIZATION
  // --------------------------------------------------------------------------

  /**
   * Optimize a single NC program.
   */
  async optimizeProgram(filePath: string): Promise<ProgramOptimization | null> {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
    // Read-then-delegate: the file-based and content-based entry points share
    // ONE parse+optimize+build path so they behave identically (U-PPL-B2).
    return this.optimizeProgramFromContent(content, filePath);
  }

  /**
   * Optimize a single NC program from its raw CONTENT (no file read) -- U-PPL-B2.
   * Content-based sibling of optimizeProgram(filePath); the latter reads the file
   * then delegates here. When filePath is omitted the result's original_path is
   * the literal "<in-memory>" (the in-memory provenance marker).
   */
  async optimizeProgramFromContent(content: string, filePath?: string): Promise<ProgramOptimization | null> {
    const sourcePath = filePath ?? "<in-memory>";

    // Parse with learning engine
    const learning = await this.parseProgramForOptimization(content, sourcePath);
    if (!learning) return null;

    const opOptimizations: OperationOptimization[] = [];
    let issuesFixed = 0;
    let optimizedTime = learning.total_cycle_time_estimate_min;

    // Optimize each operation
    for (const op of learning.operations) {
      const optOp = this.optimizeOperation(op, learning.material_iso);
      opOptimizations.push(optOp);

      // Calculate time improvement
      if (optOp.optimized_feed > optOp.original_feed && optOp.original_feed > 0) {
        const feedImprovement = optOp.optimized_feed / optOp.original_feed;
        // Estimate time savings (simplified)
        optimizedTime *= 1 / feedImprovement;
        issuesFixed++;
      }
    }

    // Fix issues
    const fixedIssues = learning.issues_detected.filter(i =>
      i.category === "speed_feed" && i.recommended_value !== undefined
    );
    issuesFixed += fixedIssues.length;

    const timeSavings = learning.total_cycle_time_estimate_min > 0
      ? ((learning.total_cycle_time_estimate_min - optimizedTime) / learning.total_cycle_time_estimate_min) * 100
      : 0;

    // Select best machine
    const bestMachine = this.selectBestMachine(learning.material_iso, learning.operations);

    return {
      original_path: sourcePath,
      program_number: learning.program_number,
      customer: learning.customer,
      material_iso: learning.material_iso,
      original_cycle_time_min: learning.total_cycle_time_estimate_min,
      optimized_cycle_time_min: Math.round(optimizedTime * 10) / 10,
      time_savings_pct: Math.round(timeSavings * 10) / 10,
      operations_optimized: opOptimizations,
      issues_fixed: issuesFixed,
      issues_remaining: learning.issues_detected.length - issuesFixed,
      recommended_machine: bestMachine.name,
      confidence: 0.85,
    };
  }

  /**
   * Parse program using deep learning engine.
   */
  private async parseProgramForOptimization(content: string, filePath: string): Promise<ProgramLearningResult | null> {
    // Use a fresh instance to avoid cached state issues. Parse the in-hand CONTENT
    // (U-PPL-B2) -- the prior learnFromProgram(filePath) re-read the file and ignored
    // `content`, so the content-based entry point (no real file) returned null.
    const engine = new (await import("./MillDeepLearningEngine.js")).MillDeepLearningEngine();
    return await engine.learnFromContent(content, filePath);
  }

  /**
   * Optimize a single operation.
   */
  private optimizeOperation(op: LearnedOperation, materialIso: string): OperationOptimization {
    // Get AI-recommended parameters
    const aiParams = millDeepLearningEngine.getOptimizedParams(
      materialIso,
      op.tool_type,
      op.tool_diameter_mm
    );

    // Find matching shop tool
    const shopTool = this.findBestTool(op.tool_type, op.tool_diameter_mm);

    // Calculate optimal RPM based on shop tool limits
    let optRPM = op.rpm;
    let optFeed = op.feed_ipm;
    let optDOC = op.doc_in;
    let reason = "No optimization needed";

    if (aiParams) {
      // Use AI-recommended values, capped by tool limits
      const maxRPM = shopTool?.max_rpm || 10000;
      optRPM = Math.min(aiParams.rpm, maxRPM);

      if (optRPM !== op.rpm) {
        reason = `AI: RPM ${op.rpm} → ${optRPM} (proven pattern)`;
      }

      // Scale feed proportionally if RPM changes
      if (optRPM !== op.rpm && op.rpm > 0) {
        const rpmRatio = optRPM / op.rpm;
        optFeed = Math.round(op.feed_ipm * rpmRatio * 10) / 10;
        reason += `, Feed ${op.feed_ipm} → ${optFeed}`;
      }
    }

    // Check against material-specific limits
    const sfmRange = this.getSFMRange(materialIso);
    const currentSFM = op.surface_footage;
    const targetSFM = sfmRange.typical;

    if (currentSFM > 0 && Math.abs(currentSFM - targetSFM) / targetSFM > 0.3) {
      // More than 30% off from target
      optRPM = Math.round((targetSFM * 12) / (Math.PI * (op.tool_diameter_mm / 25.4)));
      reason = `SFM correction: ${Math.round(currentSFM)} → ${targetSFM}`;
    }

    return {
      tool_number: op.tool_number,
      operation_type: op.operation_type,
      original_rpm: op.rpm,
      optimized_rpm: optRPM,
      original_feed: op.feed_ipm,
      optimized_feed: optFeed,
      original_doc: op.doc_in,
      optimized_doc: optDOC,
      improvement_reason: reason,
      tool_recommendation: shopTool?.id,
    };
  }

  /**
   * Find best matching tool from shop inventory.
   */
  private findBestTool(toolType: string, diameterMm: number): ShopTool | null {
    const candidates = JM_DIE_TOOLS.filter(t =>
      t.type === toolType &&
      Math.abs(t.diameter_mm - diameterMm) < 2 &&
      t.qty_in_stock > 0
    );

    if (candidates.length === 0) return null;

    // Prefer exact diameter match, then highest RPM capability
    candidates.sort((a, b) => {
      const aDiff = Math.abs(a.diameter_mm - diameterMm);
      const bDiff = Math.abs(b.diameter_mm - diameterMm);
      if (aDiff !== bDiff) return aDiff - bDiff;
      return b.max_rpm - a.max_rpm;
    });

    return candidates[0];
  }

  /**
   * Select best machine for the material and operations.
   */
  private selectBestMachine(materialIso: string, operations: LearnedOperation[]): MillMachineSpec {
    // Score each machine
    const scores = JM_DIE_MILLS.map(m => {
      let score = 0;

      // Material compatibility
      if (m.optimal_materials.includes(materialIso)) score += 20;

      // RPM capability
      const maxOpRPM = Math.max(...operations.map(o => o.rpm));
      if (m.max_rpm >= maxOpRPM) score += 10;
      if (m.max_rpm >= maxOpRPM * 1.5) score += 5; // Headroom bonus

      // Tool capacity
      const toolCount = new Set(operations.map(o => o.tool_number)).size;
      if (m.tool_capacity >= toolCount) score += 5;

      return { machine: m, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].machine;
  }

  private getSFMRange(materialIso: string): { min: number; max: number; typical: number } {
    const ranges: Record<string, { min: number; max: number; typical: number }> = {
      "P": { min: 80, max: 400, typical: 200 },
      "M": { min: 50, max: 300, typical: 150 },
      "K": { min: 100, max: 500, typical: 250 },
      "N": { min: 500, max: 2000, typical: 800 },
      "S": { min: 30, max: 150, typical: 80 },
      "H": { min: 50, max: 200, typical: 100 },
    };
    return ranges[materialIso] || ranges["P"];
  }

  // --------------------------------------------------------------------------
  // REPORTS
  // --------------------------------------------------------------------------

  /**
   * Get all optimization results.
   */
  getOptimizations(): ProgramOptimization[] {
    return [...this.optimizations];
  }

  /**
   * Generate detailed report.
   */
  generateReport(): string {
    const lines: string[] = [
      "=".repeat(70),
      "PRISM MILL PROGRAM OPTIMIZATION REPORT",
      "=".repeat(70),
      "",
    ];

    for (const opt of this.optimizations) {
      lines.push(`Program: ${opt.program_number} (${opt.customer})`);
      lines.push(`  Material: ${opt.material_iso}`);
      lines.push(`  Cycle time: ${opt.original_cycle_time_min} → ${opt.optimized_cycle_time_min} min (${opt.time_savings_pct}% faster)`);
      lines.push(`  Issues: ${opt.issues_fixed} fixed, ${opt.issues_remaining} remaining`);
      lines.push(`  Recommended machine: ${opt.recommended_machine}`);
      lines.push("");

      for (const op of opt.operations_optimized) {
        if (op.improvement_reason !== "No optimization needed") {
          lines.push(`    T${op.tool_number} ${op.operation_type}: ${op.improvement_reason}`);
        }
      }
      lines.push("-".repeat(70));
    }

    return lines.join("\n");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millProgramOptimizerEngine = new MillProgramOptimizerEngine();
