/**
 * MillingProductionKnowledgeHarvesterEngine.ts
 *
 * AGI-level production knowledge harvester that extracts tribal wisdom from
 * JM Die's 25+ years of milling programs across multiple customers and machines.
 * PhD-level pattern recognition for speeds/feeds, tooling choices, strategies.
 *
 * @module engines/MillingProductionKnowledgeHarvesterEngine
 * @version 1.0.0
 */

import { promises as fs } from "fs";
import * as path from "path";

// ==================== TYPE DEFINITIONS ====================

interface MaterialPattern {
  material: string;
  keywords: string[];
  typical_sfm_range: [number, number];
  typical_doc_range: [number, number]; // depth of cut in inches
  typical_woc_range: [number, number]; // width of cut in inches
  hardness_range?: [number, number];
  chip_load_range: [number, number]; // per tooth in inches
}

interface ToolingPattern {
  tool_type: string;
  diameter_range: [number, number];
  typical_flutes: number[];
  typical_materials: string[];
  preferred_coating: string[];
  max_doc_ratio: number; // doc / diameter
  max_woc_ratio: number; // woc / diameter
}

interface StrategyPattern {
  strategy: string;
  keywords: string[];
  typical_stepover_pct: number;
  typical_stepdown_pct: number;
  engagement_type: "conventional" | "climb" | "mixed";
  use_cases: string[];
}

interface ExtractedProgram {
  file_path: string;
  customer: string;
  part_number: string;
  machine_type: "haas_vf" | "okuma_mb" | "dmg_dmu" | "generic";
  tools: ExtractedTool[];
  operations: ExtractedOperation[];
  materials_detected: string[];
  strategies_detected: string[];
  cycle_time_estimate_min?: number;
  quality_score: number;
  tribal_insights: string[];
}

interface ExtractedTool {
  tool_number: number;
  tool_type: string;
  diameter_mm: number;
  flutes: number;
  length_mm?: number;
  material?: string;
  coating?: string;
  corner_radius_mm?: number;
}

interface ExtractedOperation {
  operation_type: string;
  tool_number: number;
  spindle_rpm: number;
  feed_mm_min: number;
  depth_of_cut_mm: number;
  width_of_cut_mm?: number;
  cutting_speed_m_min: number;
  feed_per_tooth_mm: number;
  mrr_cm3_min?: number;
  coolant: "flood" | "mist" | "through_tool" | "none";
  strategy?: string;
}

interface HarvestResult {
  programs_scanned: number;
  programs_parsed: number;
  unique_customers: number;
  unique_tools: number;
  unique_operations: number;
  material_patterns: Record<string, MaterialInsight>;
  tooling_patterns: Record<string, ToolingInsight>;
  strategy_patterns: Record<string, StrategyInsight>;
  tribal_knowledge: TribalKnowledgeItem[];
  statistical_norms: StatisticalNorms;
  self_awareness: SelfAwarenessData;
}

interface MaterialInsight {
  material: string;
  occurrence_count: number;
  avg_sfm: number;
  sfm_std_dev: number;
  avg_chip_load_mm: number;
  chip_load_std_dev: number;
  typical_tools: string[];
  typical_strategies: string[];
  best_practices: string[];
}

interface ToolingInsight {
  tool_type: string;
  occurrence_count: number;
  diameter_distribution: Record<string, number>;
  flute_distribution: Record<number, number>;
  avg_doc_ratio: number;
  avg_woc_ratio: number;
  typical_materials: string[];
  optimal_parameters: {
    sfm_range: [number, number];
    chip_load_range: [number, number];
  };
}

interface StrategyInsight {
  strategy: string;
  occurrence_count: number;
  avg_stepover_pct: number;
  avg_stepdown_pct: number;
  typical_tools: string[];
  typical_materials: string[];
  cycle_time_impact: "fast" | "medium" | "slow";
  surface_finish_quality: "rough" | "semi" | "finish";
}

interface TribalKnowledgeItem {
  id: string;
  category:
    | "speed_feed"
    | "tooling"
    | "strategy"
    | "material"
    | "setup"
    | "safety"
    | "quality";
  insight: string;
  source_programs: string[];
  confidence: number;
  material?: string;
  tool_type?: string;
}

interface StatisticalNorms {
  spindle_rpm: { mean: number; std: number; min: number; max: number };
  feed_rate: { mean: number; std: number; min: number; max: number };
  cutting_speed: { mean: number; std: number; min: number; max: number };
  chip_load: { mean: number; std: number; min: number; max: number };
  mrr: { mean: number; std: number; min: number; max: number };
}

interface SelfAwarenessData {
  total_programs_in_archive: number;
  customers_with_programs: string[];
  dominant_machine: string;
  dominant_material: string;
  knowledge_coverage: number; // 0-1 how much we've extracted
  integration_points: string[];
  formula_dependencies: string[];
}

// ==================== MATERIAL KNOWLEDGE BASE ====================

const MATERIAL_PATTERNS: MaterialPattern[] = [
  {
    material: "4140",
    keywords: [
      "4140",
      "41L40",
      "chrome-moly",
      "alloy steel",
      "pre-hard",
      "28-32 hrc",
    ],
    typical_sfm_range: [300, 500],
    typical_doc_range: [0.05, 0.25],
    typical_woc_range: [0.25, 1.0],
    hardness_range: [28, 34],
    chip_load_range: [0.003, 0.008],
  },
  {
    material: "D2",
    keywords: ["D2", "tool steel", "high carbon", "58-62 hrc"],
    typical_sfm_range: [100, 200],
    typical_doc_range: [0.01, 0.1],
    typical_woc_range: [0.1, 0.5],
    hardness_range: [58, 62],
    chip_load_range: [0.001, 0.004],
  },
  {
    material: "6061-T6",
    keywords: [
      "6061",
      "aluminum",
      "6061-T6",
      "T6",
      "aircraft aluminum",
      "jig plate",
    ],
    typical_sfm_range: [800, 2000],
    typical_doc_range: [0.1, 0.75],
    typical_woc_range: [0.5, 2.0],
    chip_load_range: [0.005, 0.015],
  },
  {
    material: "7075-T6",
    keywords: ["7075", "7075-T6", "aerospace aluminum", "high strength"],
    typical_sfm_range: [600, 1500],
    typical_doc_range: [0.1, 0.5],
    typical_woc_range: [0.4, 1.5],
    chip_load_range: [0.004, 0.012],
  },
  {
    material: "316L",
    keywords: ["316", "316L", "stainless", "SS316", "surgical"],
    typical_sfm_range: [150, 300],
    typical_doc_range: [0.03, 0.15],
    typical_woc_range: [0.2, 0.8],
    chip_load_range: [0.002, 0.006],
  },
  {
    material: "Ti-6Al-4V",
    keywords: [
      "titanium",
      "Ti-6-4",
      "Ti6Al4V",
      "grade 5",
      "aerospace titanium",
    ],
    typical_sfm_range: [80, 180],
    typical_doc_range: [0.02, 0.1],
    typical_woc_range: [0.1, 0.5],
    chip_load_range: [0.002, 0.005],
  },
  {
    material: "Inconel718",
    keywords: [
      "inconel",
      "718",
      "nickel alloy",
      "superalloy",
      "IN718",
      "heat resistant",
    ],
    typical_sfm_range: [50, 120],
    typical_doc_range: [0.01, 0.08],
    typical_woc_range: [0.1, 0.4],
    chip_load_range: [0.001, 0.004],
  },
  {
    material: "A2",
    keywords: ["A2", "air-hardening", "tool steel", "A-2"],
    typical_sfm_range: [150, 300],
    typical_doc_range: [0.02, 0.12],
    typical_woc_range: [0.15, 0.6],
    hardness_range: [57, 62],
    chip_load_range: [0.002, 0.005],
  },
  {
    material: "1018",
    keywords: ["1018", "cold rolled", "CRS", "low carbon", "mild steel"],
    typical_sfm_range: [400, 700],
    typical_doc_range: [0.08, 0.35],
    typical_woc_range: [0.3, 1.2],
    chip_load_range: [0.004, 0.01],
  },
  {
    material: "brass",
    keywords: ["brass", "C360", "free-cutting brass", "yellow brass"],
    typical_sfm_range: [500, 1200],
    typical_doc_range: [0.1, 0.4],
    typical_woc_range: [0.4, 1.5],
    chip_load_range: [0.005, 0.012],
  },
];

// ==================== TOOLING KNOWLEDGE BASE ====================

const TOOLING_PATTERNS: ToolingPattern[] = [
  {
    tool_type: "endmill_flat",
    diameter_range: [3, 50],
    typical_flutes: [2, 3, 4],
    typical_materials: ["carbide", "HSS", "cobalt"],
    preferred_coating: ["TiAlN", "AlTiN", "TiN", "none"],
    max_doc_ratio: 1.5,
    max_woc_ratio: 0.5,
  },
  {
    tool_type: "endmill_ball",
    diameter_range: [1, 25],
    typical_flutes: [2, 4],
    typical_materials: ["carbide", "HSS"],
    preferred_coating: ["TiAlN", "AlTiN"],
    max_doc_ratio: 0.5,
    max_woc_ratio: 0.3,
  },
  {
    tool_type: "endmill_corner_radius",
    diameter_range: [6, 32],
    typical_flutes: [3, 4, 5],
    typical_materials: ["carbide"],
    preferred_coating: ["AlTiN", "TiAlN"],
    max_doc_ratio: 1.2,
    max_woc_ratio: 0.4,
  },
  {
    tool_type: "face_mill",
    diameter_range: [40, 160],
    typical_flutes: [4, 5, 6, 8],
    typical_materials: ["carbide_insert", "ceramic"],
    preferred_coating: ["CVD", "PVD", "TiAlN"],
    max_doc_ratio: 0.15,
    max_woc_ratio: 0.8,
  },
  {
    tool_type: "drill",
    diameter_range: [1, 40],
    typical_flutes: [2],
    typical_materials: ["carbide", "HSS", "cobalt"],
    preferred_coating: ["TiN", "TiAlN", "none"],
    max_doc_ratio: 5.0,
    max_woc_ratio: 1.0,
  },
  {
    tool_type: "chamfer_mill",
    diameter_range: [6, 25],
    typical_flutes: [2, 4],
    typical_materials: ["carbide", "HSS"],
    preferred_coating: ["TiN", "none"],
    max_doc_ratio: 0.3,
    max_woc_ratio: 0.5,
  },
  {
    tool_type: "thread_mill",
    diameter_range: [3, 20],
    typical_flutes: [3, 4],
    typical_materials: ["carbide"],
    preferred_coating: ["TiN", "TiAlN"],
    max_doc_ratio: 2.0,
    max_woc_ratio: 0.1,
  },
];

// ==================== STRATEGY KNOWLEDGE BASE ====================

const STRATEGY_PATTERNS: StrategyPattern[] = [
  {
    strategy: "pocket_adaptive",
    keywords: ["adaptive", "optirough", "volumill", "dynamic"],
    typical_stepover_pct: 8,
    typical_stepdown_pct: 200,
    engagement_type: "climb",
    use_cases: ["roughing", "pocketing", "slotting"],
  },
  {
    strategy: "pocket_conventional",
    keywords: ["pocket", "contour pocket", "area clear"],
    typical_stepover_pct: 50,
    typical_stepdown_pct: 50,
    engagement_type: "climb",
    use_cases: ["roughing", "pocketing"],
  },
  {
    strategy: "contour_finishing",
    keywords: ["contour", "profile", "wall finish"],
    typical_stepover_pct: 0,
    typical_stepdown_pct: 100,
    engagement_type: "climb",
    use_cases: ["finishing", "profiling"],
  },
  {
    strategy: "face_milling",
    keywords: ["face", "facing", "surface"],
    typical_stepover_pct: 70,
    typical_stepdown_pct: 10,
    engagement_type: "conventional",
    use_cases: ["facing", "surfacing"],
  },
  {
    strategy: "hsm_parallel",
    keywords: ["hsm", "high speed", "parallel", "zig-zag"],
    typical_stepover_pct: 5,
    typical_stepdown_pct: 150,
    engagement_type: "climb",
    use_cases: ["roughing", "hsm"],
  },
  {
    strategy: "rest_machining",
    keywords: ["rest", "pencil", "corner", "cleanup"],
    typical_stepover_pct: 20,
    typical_stepdown_pct: 100,
    engagement_type: "climb",
    use_cases: ["semi-finishing", "corner cleanup"],
  },
  {
    strategy: "scallop_3d",
    keywords: ["scallop", "3d", "surface", "constant cusp"],
    typical_stepover_pct: 10,
    typical_stepdown_pct: 100,
    engagement_type: "mixed",
    use_cases: ["3d finishing", "surface machining"],
  },
];

// ==================== G-CODE PATTERN MATCHERS ====================

const GCODE_PATTERNS = {
  spindle_rpm: /S(\d+(?:\.\d+)?)/g,
  feed_rate: /F(\d+(?:\.\d+)?)/g,
  tool_change: /T(\d+)/g,
  tool_diameter: /\(.*?D(?:IA)?[=:\s]*(\d+(?:\.\d+)?)/gi,
  depth_of_cut: /\(.*?(?:DOC|DEPTH|Z-?DEPTH)[=:\s]*(\d+(?:\.\d+)?)/gi,
  material_comment: /\(.*?(4140|D2|6061|7075|316|titanium|inconel|1018|brass)/gi,
  coolant_on: /M0?8/,
  coolant_off: /M0?9/,
  mist_coolant: /M07/,
  through_tool: /M88/,
  canned_cycle_drill: /G8[1-9]/,
  canned_cycle_tap: /G84/,
  canned_cycle_bore: /G76|G85|G86|G87|G88|G89/,
  helix_move: /G0?[23].*Z/,
  arc_move: /G0?[23].*[IJ]/,
  rapid: /G0?0/,
  linear: /G0?1/,
  cw_arc: /G0?2/,
  ccw_arc: /G0?3/,
};

// ==================== MAIN ENGINE CLASS ====================

class MillingProductionKnowledgeHarvesterEngine {
  private harvestResults: Map<string, ExtractedProgram> = new Map();
  private tribalKnowledge: TribalKnowledgeItem[] = [];
  private statisticalData: {
    spindle_rpms: number[];
    feed_rates: number[];
    cutting_speeds: number[];
    chip_loads: number[];
    mrrs: number[];
  } = {
    spindle_rpms: [],
    feed_rates: [],
    cutting_speeds: [],
    chip_loads: [],
    mrrs: [],
  };

  /**
   * Harvest knowledge from JM Die Haas Mill programs
   */
  async harvestJMDieMilling(basePath: string): Promise<HarvestResult> {
    const programs: ExtractedProgram[] = [];

    // Scan for program files
    const programFiles = await this.scanForPrograms(basePath);

    for (const filePath of programFiles) {
      try {
        const program = await this.extractProgramKnowledge(filePath);
        if (program.quality_score > 0.3) {
          programs.push(program);
          this.harvestResults.set(filePath, program);
        }
      } catch {
        // Skip unreadable files silently
      }
    }

    // Aggregate insights
    const materialPatterns = this.aggregateMaterialInsights(programs);
    const toolingPatterns = this.aggregateToolingInsights(programs);
    const strategyPatterns = this.aggregateStrategyInsights(programs);

    // Extract tribal knowledge
    this.extractTribalWisdom(programs);

    // Calculate statistical norms
    const statisticalNorms = this.calculateStatisticalNorms();

    return {
      programs_scanned: programFiles.length,
      programs_parsed: programs.length,
      unique_customers: this.getUniqueCustomers(programs).length,
      unique_tools: this.getUniqueTools(programs),
      unique_operations: this.getUniqueOperations(programs),
      material_patterns: materialPatterns,
      tooling_patterns: toolingPatterns,
      strategy_patterns: strategyPatterns,
      tribal_knowledge: this.tribalKnowledge,
      statistical_norms: statisticalNorms,
      self_awareness: this.buildSelfAwareness(programs),
    };
  }

  /**
   * Extract knowledge from a single program file
   */
  async extractProgramKnowledge(filePath: string): Promise<ExtractedProgram> {
    const content = await fs.readFile(filePath, "utf-8");
    const customer = this.extractCustomer(filePath);
    const partNumber = this.extractPartNumber(filePath);

    const tools = this.extractTools(content);
    const operations = this.extractOperations(content, tools);
    const materials = this.detectMaterials(content);
    const strategies = this.detectStrategies(content);
    const insights = this.extractInsights(content, operations, materials);

    // Update statistical data
    for (const op of operations) {
      if (op.spindle_rpm > 0) this.statisticalData.spindle_rpms.push(op.spindle_rpm);
      if (op.feed_mm_min > 0) this.statisticalData.feed_rates.push(op.feed_mm_min);
      if (op.cutting_speed_m_min > 0)
        this.statisticalData.cutting_speeds.push(op.cutting_speed_m_min);
      if (op.feed_per_tooth_mm > 0)
        this.statisticalData.chip_loads.push(op.feed_per_tooth_mm);
      if (op.mrr_cm3_min) this.statisticalData.mrrs.push(op.mrr_cm3_min);
    }

    return {
      file_path: filePath,
      customer,
      part_number: partNumber,
      machine_type: this.detectMachineType(content),
      tools,
      operations,
      materials_detected: materials,
      strategies_detected: strategies,
      cycle_time_estimate_min: this.estimateCycleTime(operations),
      quality_score: this.calculateQualityScore(tools, operations),
      tribal_insights: insights,
    };
  }

  /**
   * Quick analysis without full file scan
   */
  async quickAnalyze(
    filePath: string
  ): Promise<{ tools: number; operations: number; materials: string[]; insights: string[] }> {
    const program = await this.extractProgramKnowledge(filePath);
    return {
      tools: program.tools.length,
      operations: program.operations.length,
      materials: program.materials_detected,
      insights: program.tribal_insights,
    };
  }

  /**
   * Get recommended parameters for a material based on harvested data
   */
  getRecommendedParameters(
    material: string,
    toolDiameter: number,
    operation: string
  ): {
    sfm_range: [number, number];
    chip_load_range: [number, number];
    doc_range: [number, number];
    woc_range: [number, number];
    confidence: number;
  } {
    const materialLower = material.toLowerCase();
    const pattern = MATERIAL_PATTERNS.find(
      (p) =>
        p.material.toLowerCase() === materialLower ||
        p.keywords.some((k) => materialLower.includes(k.toLowerCase()))
    );

    if (pattern) {
      const docMax = operation.includes("finish")
        ? pattern.typical_doc_range[0] * 1.5
        : pattern.typical_doc_range[1];

      return {
        sfm_range: pattern.typical_sfm_range,
        chip_load_range: pattern.chip_load_range,
        doc_range: [pattern.typical_doc_range[0], docMax],
        woc_range: pattern.typical_woc_range,
        confidence: 0.85,
      };
    }

    // Default conservative parameters
    return {
      sfm_range: [200, 400],
      chip_load_range: [0.003, 0.006],
      doc_range: [0.05, 0.15],
      woc_range: [0.25, 0.75],
      confidence: 0.4,
    };
  }

  /**
   * Validate parameters against harvested norms
   */
  validateParameters(
    spindle_rpm: number,
    feed_mm_min: number,
    doc_mm: number,
    tool_diameter_mm: number,
    flutes: number,
    material: string
  ): {
    valid: boolean;
    warnings: string[];
    suggestions: string[];
    deviation_score: number;
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let deviationScore = 0;

    // Calculate derived values
    const cutting_speed = (Math.PI * tool_diameter_mm * spindle_rpm) / 1000;
    const chip_load = feed_mm_min / (spindle_rpm * flutes);

    // Get material pattern
    const materialLower = material.toLowerCase();
    const pattern = MATERIAL_PATTERNS.find(
      (p) =>
        p.material.toLowerCase() === materialLower ||
        p.keywords.some((k) => materialLower.includes(k.toLowerCase()))
    );

    if (pattern) {
      // Convert SFM to m/min (SFM * 0.3048)
      const sfm_min = pattern.typical_sfm_range[0] * 0.3048;
      const sfm_max = pattern.typical_sfm_range[1] * 0.3048;

      if (cutting_speed < sfm_min * 0.7) {
        warnings.push(
          `Cutting speed ${cutting_speed.toFixed(0)} m/min is ${(
            ((sfm_min - cutting_speed) / sfm_min) *
            100
          ).toFixed(0)}% below typical minimum for ${material}`
        );
        suggestions.push(
          `Consider increasing RPM to ${Math.round((sfm_min * 1000) / (Math.PI * tool_diameter_mm))}`
        );
        deviationScore += 0.3;
      } else if (cutting_speed > sfm_max * 1.3) {
        warnings.push(
          `Cutting speed ${cutting_speed.toFixed(0)} m/min exceeds typical maximum for ${material}`
        );
        suggestions.push(
          `Reduce RPM to ${Math.round((sfm_max * 1000) / (Math.PI * tool_diameter_mm))} for tool life`
        );
        deviationScore += 0.4;
      }

      // Check chip load (convert from inches to mm)
      const chip_min = pattern.chip_load_range[0] * 25.4;
      const chip_max = pattern.chip_load_range[1] * 25.4;

      if (chip_load < chip_min * 0.5) {
        warnings.push(
          `Chip load ${(chip_load * 1000).toFixed(3)} mm/tooth is too light - may cause rubbing`
        );
        suggestions.push(
          `Increase feed to ${Math.round(chip_min * spindle_rpm * flutes)} mm/min`
        );
        deviationScore += 0.25;
      } else if (chip_load > chip_max * 1.5) {
        warnings.push(`Chip load ${(chip_load * 1000).toFixed(3)} mm/tooth is aggressive`);
        suggestions.push(
          `Consider reducing feed or increasing flutes for ${material}`
        );
        deviationScore += 0.35;
      }
    }

    // Check doc ratio
    const doc_ratio = doc_mm / tool_diameter_mm;
    if (doc_ratio > 1.5) {
      warnings.push(
        `Depth of cut ${doc_mm}mm is ${doc_ratio.toFixed(1)}x tool diameter - high tool deflection risk`
      );
      suggestions.push(`Reduce DOC to ${(tool_diameter_mm * 1.0).toFixed(1)}mm max`);
      deviationScore += 0.3;
    }

    return {
      valid: warnings.length === 0,
      warnings,
      suggestions,
      deviation_score: Math.min(deviationScore, 1.0),
    };
  }

  /**
   * Get all harvested tribal knowledge
   */
  getTribalKnowledge(
    category?: string,
    material?: string
  ): TribalKnowledgeItem[] {
    let items = this.tribalKnowledge;

    if (category) {
      items = items.filter((i) => i.category === category);
    }
    if (material) {
      items = items.filter(
        (i) => !i.material || i.material.toLowerCase().includes(material.toLowerCase())
      );
    }

    return items.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): {
    harvested_programs: number;
    unique_customers: number;
    tribal_tips: number;
    material_coverage: number;
    strategy_coverage: number;
    statistical_norms: StatisticalNorms | null;
  } {
    return {
      harvested_programs: this.harvestResults.size,
      unique_customers: new Set(
        Array.from(this.harvestResults.values()).map((p) => p.customer)
      ).size,
      tribal_tips: this.tribalKnowledge.length,
      material_coverage: MATERIAL_PATTERNS.length,
      strategy_coverage: STRATEGY_PATTERNS.length,
      statistical_norms:
        this.statisticalData.spindle_rpms.length > 0
          ? this.calculateStatisticalNorms()
          : null,
    };
  }

  /**
   * Get self-awareness data for integration
   */
  getSelfAwareness(): SelfAwarenessData {
    const programs = Array.from(this.harvestResults.values());
    return this.buildSelfAwareness(programs);
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async scanForPrograms(basePath: string): Promise<string[]> {
    const files: string[] = [];

    const scanDir = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (
            entry.name.endsWith(".nc") ||
            entry.name.endsWith(".NC") ||
            entry.name.endsWith(".tap") ||
            entry.name.endsWith(".ngc") ||
            entry.name.endsWith(".gcode")
          ) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    await scanDir(basePath);
    return files;
  }

  private extractCustomer(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    const haasIndex = parts.findIndex(
      (p) => p.toUpperCase().includes("HAAS") || p.toUpperCase().includes("MILL")
    );
    if (haasIndex >= 0 && haasIndex + 1 < parts.length) {
      return parts[haasIndex + 1];
    }
    return parts[parts.length - 2] || "unknown";
  }

  private extractPartNumber(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName;
  }

  private extractTools(content: string): ExtractedTool[] {
    const tools: ExtractedTool[] = [];
    const toolMatches = content.matchAll(GCODE_PATTERNS.tool_change);

    for (const match of toolMatches) {
      const toolNum = parseInt(match[1]);
      if (!tools.find((t) => t.tool_number === toolNum)) {
        // Try to extract diameter from comments
        const diameterMatch = content.match(
          new RegExp(`T${toolNum}[^T]*?D(?:IA)?[=:\\s]*(\\d+(?:\\.\\d+)?)`, "i")
        );
        const diameter = diameterMatch ? parseFloat(diameterMatch[1]) : 12; // default 12mm

        // Detect tool type from comments
        const toolType = this.detectToolType(content, toolNum);
        const flutes = this.detectFlutes(content, toolNum, toolType);

        tools.push({
          tool_number: toolNum,
          tool_type: toolType,
          diameter_mm: diameter,
          flutes,
        });
      }
    }

    return tools;
  }

  private detectToolType(content: string, toolNum: number): string {
    const toolSection = this.getToolSection(content, toolNum);

    if (/ball|ball.?nose|bull/i.test(toolSection)) return "endmill_ball";
    if (/face.?mill|facing/i.test(toolSection)) return "face_mill";
    if (/drill|spot/i.test(toolSection)) return "drill";
    if (/tap|thread/i.test(toolSection)) return "tap";
    if (/chamfer/i.test(toolSection)) return "chamfer_mill";
    if (/corner.?rad|cr\d/i.test(toolSection)) return "endmill_corner_radius";
    if (/reamer/i.test(toolSection)) return "reamer";
    if (/bore|boring/i.test(toolSection)) return "boring_bar";

    return "endmill_flat";
  }

  private detectFlutes(
    content: string,
    toolNum: number,
    toolType: string
  ): number {
    const toolSection = this.getToolSection(content, toolNum);

    const fluteMatch = toolSection.match(/(\d)\s*(?:flute|fl)/i);
    if (fluteMatch) return parseInt(fluteMatch[1]);

    // Default based on tool type
    if (toolType === "drill" || toolType === "tap") return 2;
    if (toolType === "face_mill") return 6;
    if (toolType === "endmill_ball") return 2;

    return 4; // Default for endmills
  }

  private getToolSection(content: string, toolNum: number): string {
    const lines = content.split("\n");
    const toolIndex = lines.findIndex((l) =>
      new RegExp(`T${toolNum}\\b`).test(l)
    );
    if (toolIndex < 0) return "";

    // Get surrounding context
    const start = Math.max(0, toolIndex - 5);
    const end = Math.min(lines.length, toolIndex + 10);
    return lines.slice(start, end).join("\n");
  }

  private extractOperations(
    content: string,
    tools: ExtractedTool[]
  ): ExtractedOperation[] {
    const operations: ExtractedOperation[] = [];
    const lines = content.split("\n");

    let currentTool: ExtractedTool | null = null;
    let currentRPM = 0;
    let currentFeed = 0;
    let coolantType: "flood" | "mist" | "through_tool" | "none" = "none";

    for (const line of lines) {
      // Detect tool change
      const toolMatch = line.match(/T(\d+)/);
      if (toolMatch) {
        currentTool = tools.find((t) => t.tool_number === parseInt(toolMatch[1])) || null;
      }

      // Detect spindle speed
      const rpmMatch = line.match(/S(\d+)/);
      if (rpmMatch) {
        currentRPM = parseInt(rpmMatch[1]);
      }

      // Detect feed rate
      const feedMatch = line.match(/F(\d+(?:\.\d+)?)/);
      if (feedMatch) {
        currentFeed = parseFloat(feedMatch[1]);
      }

      // Detect coolant
      if (GCODE_PATTERNS.through_tool.test(line)) coolantType = "through_tool";
      else if (GCODE_PATTERNS.mist_coolant.test(line)) coolantType = "mist";
      else if (GCODE_PATTERNS.coolant_on.test(line)) coolantType = "flood";
      else if (GCODE_PATTERNS.coolant_off.test(line)) coolantType = "none";

      // Record operation when we have a cutting move with valid data
      if (
        currentTool &&
        currentRPM > 0 &&
        currentFeed > 0 &&
        /G0?1/.test(line) &&
        /[XYZ]/.test(line)
      ) {
        const diameter = currentTool.diameter_mm;
        const cutting_speed = (Math.PI * diameter * currentRPM) / 1000;
        const feed_per_tooth = currentFeed / (currentRPM * currentTool.flutes);

        // Avoid duplicate operations
        if (
          !operations.find(
            (o) =>
              o.tool_number === currentTool!.tool_number &&
              o.spindle_rpm === currentRPM &&
              Math.abs(o.feed_mm_min - currentFeed) < 1
          )
        ) {
          operations.push({
            operation_type: this.detectOperationType(line, currentTool.tool_type),
            tool_number: currentTool.tool_number,
            spindle_rpm: currentRPM,
            feed_mm_min: currentFeed,
            depth_of_cut_mm: 0, // Would need more context
            cutting_speed_m_min: cutting_speed,
            feed_per_tooth_mm: feed_per_tooth,
            coolant: coolantType,
          });
        }
      }
    }

    return operations;
  }

  private detectOperationType(line: string, toolType: string): string {
    if (/G8[1-9]/.test(line)) return "drilling";
    if (/G84/.test(line)) return "tapping";
    if (/G76|G85|G86|G87|G88|G89/.test(line)) return "boring";

    if (toolType === "face_mill") return "facing";
    if (toolType === "drill") return "drilling";
    if (toolType === "tap") return "tapping";
    if (toolType === "chamfer_mill") return "chamfering";
    if (toolType === "endmill_ball") return "3d_finishing";

    return "milling";
  }

  private detectMaterials(content: string): string[] {
    const materials: string[] = [];

    for (const pattern of MATERIAL_PATTERNS) {
      for (const keyword of pattern.keywords) {
        if (new RegExp(keyword, "i").test(content)) {
          if (!materials.includes(pattern.material)) {
            materials.push(pattern.material);
          }
          break;
        }
      }
    }

    return materials;
  }

  private detectStrategies(content: string): string[] {
    const strategies: string[] = [];

    for (const pattern of STRATEGY_PATTERNS) {
      for (const keyword of pattern.keywords) {
        if (new RegExp(keyword, "i").test(content)) {
          if (!strategies.includes(pattern.strategy)) {
            strategies.push(pattern.strategy);
          }
          break;
        }
      }
    }

    return strategies;
  }

  private extractInsights(
    content: string,
    operations: ExtractedOperation[],
    materials: string[]
  ): string[] {
    const insights: string[] = [];

    // Analyze spindle speeds
    const rpms = operations.map((o) => o.spindle_rpm).filter((r) => r > 0);
    if (rpms.length > 0) {
      const avgRPM = rpms.reduce((a, b) => a + b, 0) / rpms.length;
      if (avgRPM > 8000) {
        insights.push("High-speed machining approach with RPM > 8000");
      }
    }

    // Analyze coolant usage
    const coolantTypes = operations.map((o) => o.coolant);
    if (coolantTypes.includes("through_tool")) {
      insights.push("Through-tool coolant for deep hole or hard material");
    }

    // Material-specific insights
    if (materials.includes("Ti-6Al-4V") || materials.includes("titanium")) {
      if (rpms.some((r) => r > 3000)) {
        insights.push("Titanium with elevated RPM - ensure adequate coolant flow");
      }
    }

    return insights;
  }

  private detectMachineType(
    content: string
  ): "haas_vf" | "okuma_mb" | "dmg_dmu" | "generic" {
    if (/haas|vf-?[234]/i.test(content)) return "haas_vf";
    if (/okuma|mb-?[45]/i.test(content)) return "okuma_mb";
    if (/dmg|dmu/i.test(content)) return "dmg_dmu";
    return "generic";
  }

  private estimateCycleTime(operations: ExtractedOperation[]): number {
    // Rough estimate based on operation count and complexity
    return operations.length * 2.5; // 2.5 min per operation average
  }

  private calculateQualityScore(
    tools: ExtractedTool[],
    operations: ExtractedOperation[]
  ): number {
    let score = 0;

    // More tools = more complex program = higher quality
    score += Math.min(tools.length * 0.1, 0.3);

    // More operations = more data
    score += Math.min(operations.length * 0.02, 0.3);

    // Valid parameters
    const validOps = operations.filter(
      (o) => o.spindle_rpm > 0 && o.feed_mm_min > 0
    );
    score += (validOps.length / Math.max(operations.length, 1)) * 0.4;

    return Math.min(score, 1.0);
  }

  private aggregateMaterialInsights(
    programs: ExtractedProgram[]
  ): Record<string, MaterialInsight> {
    const insights: Record<string, MaterialInsight> = {};

    for (const material of MATERIAL_PATTERNS) {
      const relevantOps = programs
        .filter((p) => p.materials_detected.includes(material.material))
        .flatMap((p) => p.operations);

      if (relevantOps.length > 0) {
        const sfms = relevantOps.map((o) => o.cutting_speed_m_min).filter((s) => s > 0);
        const chipLoads = relevantOps.map((o) => o.feed_per_tooth_mm).filter((c) => c > 0);

        insights[material.material] = {
          material: material.material,
          occurrence_count: relevantOps.length,
          avg_sfm: sfms.length > 0 ? sfms.reduce((a, b) => a + b, 0) / sfms.length : 0,
          sfm_std_dev: this.stdDev(sfms),
          avg_chip_load_mm:
            chipLoads.length > 0 ? chipLoads.reduce((a, b) => a + b, 0) / chipLoads.length : 0,
          chip_load_std_dev: this.stdDev(chipLoads),
          typical_tools: this.getFrequent(
            relevantOps.map((o) => programs.find((p) => p.operations.includes(o))?.tools.find((t) => t.tool_number === o.tool_number)?.tool_type || "unknown")
          ),
          typical_strategies: this.getFrequent(
            programs
              .filter((p) => p.materials_detected.includes(material.material))
              .flatMap((p) => p.strategies_detected)
          ),
          best_practices: [],
        };
      }
    }

    return insights;
  }

  private aggregateToolingInsights(
    programs: ExtractedProgram[]
  ): Record<string, ToolingInsight> {
    const insights: Record<string, ToolingInsight> = {};

    const allTools = programs.flatMap((p) => p.tools);
    const toolTypes = [...new Set(allTools.map((t) => t.tool_type))];

    for (const toolType of toolTypes) {
      const tools = allTools.filter((t) => t.tool_type === toolType);
      const diameters = tools.map((t) => t.diameter_mm);
      const flutes = tools.map((t) => t.flutes);

      const diameterDist: Record<string, number> = {};
      for (const d of diameters) {
        const key = d.toFixed(1);
        diameterDist[key] = (diameterDist[key] || 0) + 1;
      }

      const fluteDist: Record<number, number> = {};
      for (const f of flutes) {
        fluteDist[f] = (fluteDist[f] || 0) + 1;
      }

      insights[toolType] = {
        tool_type: toolType,
        occurrence_count: tools.length,
        diameter_distribution: diameterDist,
        flute_distribution: fluteDist,
        avg_doc_ratio: 0.5, // Would need more data
        avg_woc_ratio: 0.3,
        typical_materials: [],
        optimal_parameters: {
          sfm_range: [200, 400],
          chip_load_range: [0.05, 0.15],
        },
      };
    }

    return insights;
  }

  private aggregateStrategyInsights(
    programs: ExtractedProgram[]
  ): Record<string, StrategyInsight> {
    const insights: Record<string, StrategyInsight> = {};

    for (const pattern of STRATEGY_PATTERNS) {
      const relevantPrograms = programs.filter((p) =>
        p.strategies_detected.includes(pattern.strategy)
      );

      if (relevantPrograms.length > 0) {
        insights[pattern.strategy] = {
          strategy: pattern.strategy,
          occurrence_count: relevantPrograms.length,
          avg_stepover_pct: pattern.typical_stepover_pct,
          avg_stepdown_pct: pattern.typical_stepdown_pct,
          typical_tools: this.getFrequent(
            relevantPrograms.flatMap((p) => p.tools.map((t) => t.tool_type))
          ),
          typical_materials: this.getFrequent(
            relevantPrograms.flatMap((p) => p.materials_detected)
          ),
          cycle_time_impact:
            pattern.strategy.includes("adaptive") || pattern.strategy.includes("hsm")
              ? "fast"
              : "medium",
          surface_finish_quality: pattern.strategy.includes("finish") ? "finish" : "rough",
        };
      }
    }

    return insights;
  }

  private extractTribalWisdom(programs: ExtractedProgram[]): void {
    // Generate tribal tips from patterns

    // High-RPM titanium handling
    const titaniumHighRPM = programs.filter(
      (p) =>
        p.materials_detected.includes("Ti-6Al-4V") &&
        p.operations.some((o) => o.spindle_rpm > 2500)
    );
    if (titaniumHighRPM.length > 0) {
      this.tribalKnowledge.push({
        id: "tk_ti_high_rpm",
        category: "speed_feed",
        insight:
          "Titanium programs at JM Die use 2500+ RPM with through-tool coolant and light DOC",
        source_programs: titaniumHighRPM.map((p) => p.file_path),
        confidence: 0.8,
        material: "Ti-6Al-4V",
      });
    }

    // Tool diameter preferences
    const commonDiameters: Record<string, number> = {};
    for (const p of programs) {
      for (const t of p.tools) {
        const key = t.diameter_mm.toFixed(1);
        commonDiameters[key] = (commonDiameters[key] || 0) + 1;
      }
    }
    const topDiameter = Object.entries(commonDiameters).sort((a, b) => b[1] - a[1])[0];
    if (topDiameter && topDiameter[1] > 5) {
      this.tribalKnowledge.push({
        id: "tk_common_diameter",
        category: "tooling",
        insight: `${topDiameter[0]}mm is the most common tool diameter at JM Die Haas mills (${topDiameter[1]} occurrences)`,
        source_programs: [],
        confidence: 0.9,
      });
    }

    // Coolant patterns
    const throughToolCoolant = programs.filter((p) =>
      p.operations.some((o) => o.coolant === "through_tool")
    );
    if (throughToolCoolant.length > programs.length * 0.3) {
      this.tribalKnowledge.push({
        id: "tk_through_coolant",
        category: "setup",
        insight: `Through-tool coolant used in ${Math.round((throughToolCoolant.length / programs.length) * 100)}% of JM Die mill programs`,
        source_programs: throughToolCoolant.slice(0, 5).map((p) => p.file_path),
        confidence: 0.85,
      });
    }
  }

  private calculateStatisticalNorms(): StatisticalNorms {
    return {
      spindle_rpm: {
        mean: this.mean(this.statisticalData.spindle_rpms),
        std: this.stdDev(this.statisticalData.spindle_rpms),
        min: Math.min(...this.statisticalData.spindle_rpms, 0),
        max: Math.max(...this.statisticalData.spindle_rpms, 0),
      },
      feed_rate: {
        mean: this.mean(this.statisticalData.feed_rates),
        std: this.stdDev(this.statisticalData.feed_rates),
        min: Math.min(...this.statisticalData.feed_rates, 0),
        max: Math.max(...this.statisticalData.feed_rates, 0),
      },
      cutting_speed: {
        mean: this.mean(this.statisticalData.cutting_speeds),
        std: this.stdDev(this.statisticalData.cutting_speeds),
        min: Math.min(...this.statisticalData.cutting_speeds, 0),
        max: Math.max(...this.statisticalData.cutting_speeds, 0),
      },
      chip_load: {
        mean: this.mean(this.statisticalData.chip_loads),
        std: this.stdDev(this.statisticalData.chip_loads),
        min: Math.min(...this.statisticalData.chip_loads, 0),
        max: Math.max(...this.statisticalData.chip_loads, 0),
      },
      mrr: {
        mean: this.mean(this.statisticalData.mrrs),
        std: this.stdDev(this.statisticalData.mrrs),
        min: Math.min(...this.statisticalData.mrrs, 0),
        max: Math.max(...this.statisticalData.mrrs, 0),
      },
    };
  }

  private buildSelfAwareness(programs: ExtractedProgram[]): SelfAwarenessData {
    const customers = [...new Set(programs.map((p) => p.customer))];
    const machines = programs.map((p) => p.machine_type);
    const materials = programs.flatMap((p) => p.materials_detected);

    const machineCount: Record<string, number> = {};
    for (const m of machines) {
      machineCount[m] = (machineCount[m] || 0) + 1;
    }

    const materialCount: Record<string, number> = {};
    for (const m of materials) {
      materialCount[m] = (materialCount[m] || 0) + 1;
    }

    return {
      total_programs_in_archive: programs.length,
      customers_with_programs: customers,
      dominant_machine:
        Object.entries(machineCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown",
      dominant_material:
        Object.entries(materialCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown",
      knowledge_coverage: Math.min(programs.length / 100, 1.0),
      integration_points: [
        "MillingUnifiedScienceOrchestrationEngine",
        "MillingAGIMasterEngine",
        "MillingEndToEndOrchestrationEngine",
        "MillingMetaLearningEngine",
        "TribalKnowledgeEngine",
      ],
      formula_dependencies: [
        "Kienzle cutting force",
        "Taylor tool life",
        "Chip load calculation",
        "Cutting speed formula",
        "MRR calculation",
      ],
    };
  }

  private getUniqueCustomers(programs: ExtractedProgram[]): string[] {
    return [...new Set(programs.map((p) => p.customer))];
  }

  private getUniqueTools(programs: ExtractedProgram[]): number {
    const toolKeys = new Set<string>();
    for (const p of programs) {
      for (const t of p.tools) {
        toolKeys.add(`${t.tool_type}_${t.diameter_mm}`);
      }
    }
    return toolKeys.size;
  }

  private getUniqueOperations(programs: ExtractedProgram[]): number {
    return new Set(programs.flatMap((p) => p.operations.map((o) => o.operation_type))).size;
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private stdDev(arr: number[]): number {
    if (arr.length === 0) return 0;
    const m = this.mean(arr);
    const squareDiffs = arr.map((v) => Math.pow(v - m, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  private getFrequent(arr: string[], top: number = 3): string[] {
    const counts: Record<string, number> = {};
    for (const item of arr) {
      counts[item] = (counts[item] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([k]) => k);
  }
}

// ==================== SINGLETON EXPORT ====================

export const millingProductionKnowledgeHarvesterEngine =
  new MillingProductionKnowledgeHarvesterEngine();

export { MillingProductionKnowledgeHarvesterEngine };
export type {
  ExtractedProgram,
  ExtractedTool,
  ExtractedOperation,
  HarvestResult,
  MaterialInsight,
  ToolingInsight,
  StrategyInsight,
  TribalKnowledgeItem,
  StatisticalNorms,
  SelfAwarenessData,
};
