/**
 * PRISM MCP Server - Algorithm Registry
 * Complete access to 52 algorithm modules across 8 categories
 * Graph, Optimization, Search, Interpolation, Manufacturing, Numerical, Signal, ML
 */

import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, listDirectory } from "../utils/files.js";

// ============================================================================
// ALGORITHM TYPES
// ============================================================================

/** Safety classification for manufacturing algorithms */
export type AlgorithmSafetyClass = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** Manufacturing relevance level */
export type MfgRelevance = "HIGH" | "MEDIUM" | "LOW";

/** Algorithm category / type */
export type AlgorithmType =
  | "graph"
  | "optimization"
  | "search"
  | "interpolation"
  | "manufacturing"
  | "numerical"
  | "signal"
  | "ml"
  | "control"
  | "toolpath"
  | "data_structure"
  | "graphics"
  | "knowledge"
  | "ensemble";

/** Size complexity bracket */
export type AlgorithmComplexity = "S" | "M" | "L" | "XL";

/** A single exported function from an algorithm module */
export interface AlgorithmFunction {
  name: string;
  description?: string;
}

/** Full algorithm entry stored in the registry */
export interface AlgorithmEntry {
  // Identification
  id: string;
  name: string;
  type: AlgorithmType;

  // Classification
  complexity_class: string;           // Big-O notation, e.g. "O(n log n)"
  size_complexity: AlgorithmComplexity;
  safety_class: AlgorithmSafetyClass;
  integration_wave: number;           // 1 = first (CRITICAL), 4 = last (LOW)

  // Documentation
  description: string;
  source_file: string;                // Filename in extracted/algorithms/
  source_course?: string;             // e.g. "MIT 6.003", "Stanford CS234"
  lines?: number;

  // Manufacturing context
  mfg_relevance: MfgRelevance;
  mfg_applications?: string[];        // e.g. ["chatter detection", "vibration monitoring"]

  // Exported API
  functions: AlgorithmFunction[];

  // Dependencies and relationships
  depends_on?: string[];              // IDs of algorithms this one requires
  consumers?: string[];               // Engines/tools that use this algorithm
  potential_duplicate_of?: string;    // Flag for dedup review
}

// ============================================================================
// BUILT-IN ALGORITHMS (Core seed data from MS0 scan)
// ============================================================================

const BUILT_IN_ALGORITHMS: AlgorithmEntry[] = [
  // --- Wave 1: CRITICAL safety ---
  {
    id: "ALG-SIGNAL-001",
    name: "Signal Processing & FFT",
    type: "signal",
    complexity_class: "O(n log n)",
    size_complexity: "M",
    safety_class: "CRITICAL",
    integration_wave: 1,
    description: "FFT (Cooley-Tukey), digital filters, spectral analysis, windowing functions. 60 algorithms for vibration monitoring, chatter detection, sensor data processing.",
    source_file: "PRISM_SIGNAL_ALGORITHMS.js",
    source_course: "MIT 6.003",
    lines: 375,
    mfg_relevance: "HIGH",
    mfg_applications: ["chatter detection", "vibration monitoring", "sensor signal processing"],
    functions: [
      { name: "fft", description: "Fast Fourier Transform (Cooley-Tukey)" },
      { name: "spectralAnalysis", description: "Power spectral density estimation" },
      { name: "digitalFilter", description: "FIR/IIR digital filter design" },
      { name: "windowFunction", description: "Hanning, Hamming, Blackman windows" },
    ],
    consumers: ["chatter_predict", "vibration_monitor", "quality_prediction"],
  },
  {
    id: "ALG-FFT-CHATTER-001",
    name: "FFT Predictive Chatter",
    type: "signal",
    complexity_class: "O(n log n)",
    size_complexity: "M",
    safety_class: "CRITICAL",
    integration_wave: 1,
    description: "FFT-based chatter prediction using vibration signal analysis combined with stability lobe diagrams. Real-time spindle vibration monitoring for proactive chatter avoidance.",
    source_file: "PRISM_FFT_PREDICTIVE_CHATTER.js",
    source_course: "MIT 6.003 / MIT 2.14",
    lines: 330,
    mfg_relevance: "HIGH",
    mfg_applications: ["chatter prediction", "stability lobe diagrams", "spindle vibration monitoring"],
    functions: [
      { name: "predictChatter", description: "Predict chatter onset from vibration FFT" },
      { name: "stabilityLobe", description: "Compute stability lobe diagram" },
    ],
    consumers: ["chatter_predict", "stability_analysis"],
  },
  {
    id: "ALG-CONTROL-001",
    name: "Control Systems (PID)",
    type: "control",
    complexity_class: "O(1) per step",
    size_complexity: "S",
    safety_class: "CRITICAL",
    integration_wave: 1,
    description: "PID controller implementation, Ziegler-Nichols tuning, transfer function analysis. Direct machine control algorithm for CNC servo loops.",
    source_file: "PRISM_CONTROL_SYSTEMS_MIT.js",
    source_course: "MIT 6.302",
    lines: 117,
    mfg_relevance: "HIGH",
    mfg_applications: ["CNC servo control", "adaptive feed rate", "spindle speed regulation"],
    functions: [
      { name: "pidController", description: "PID controller with anti-windup" },
      { name: "zieglerNicholsTune", description: "Ziegler-Nichols auto-tuning" },
      { name: "transferFunction", description: "Transfer function analysis" },
    ],
    consumers: ["adaptive_control", "feed_rate_control"],
  },
  {
    id: "ALG-JACOBIAN-001",
    name: "Jacobian Kinematics Engine",
    type: "numerical",
    complexity_class: "O(n^3)",
    size_complexity: "M",
    safety_class: "CRITICAL",
    integration_wave: 1,
    description: "Jacobian matrix computation and singularity analysis for multi-axis CNC kinematics. Maps joint velocities to end-effector velocities (forward kinematics via DH parameters).",
    source_file: "PRISM_JACOBIAN_ENGINE.js",
    source_course: "MIT 6.832",
    lines: 238,
    mfg_relevance: "HIGH",
    mfg_applications: ["multi-axis kinematics", "singularity avoidance", "5-axis motion planning"],
    functions: [
      { name: "computeJacobian", description: "Compute Jacobian matrix from DH parameters" },
      { name: "singularityAnalysis", description: "Detect kinematic singularities" },
      { name: "forwardKinematics", description: "Forward kinematics via DH convention" },
    ],
    consumers: ["5axis_toolpath", "kinematics_engine"],
  },

  // --- Wave 2: HIGH safety ---
  {
    id: "ALG-ACO-001",
    name: "Ant Colony Optimization (Sequencer)",
    type: "optimization",
    complexity_class: "O(n^2 * iterations)",
    size_complexity: "XL",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Ant Colony Optimization for hole sequencing and operation ordering. Metaheuristic optimizer for CNC drilling sequence optimization (TSP-variant).",
    source_file: "PRISM_ACO_SEQUENCER.js",
    lines: 5383,
    mfg_relevance: "HIGH",
    mfg_applications: ["hole sequencing", "operation ordering", "cycle time minimization"],
    functions: [
      { name: "acoSequence", description: "Run ACO for operation sequencing" },
      { name: "pheromoneUpdate", description: "Update pheromone trails" },
      { name: "localSearch2opt", description: "2-opt local improvement" },
    ],
    consumers: ["operation_sequencer", "cycle_optimizer"],
  },
  {
    id: "ALG-NURBS-001",
    name: "NURBS Surface Evaluation",
    type: "interpolation",
    complexity_class: "O(p^2) per point",
    size_complexity: "L",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "NURBS (Non-Uniform Rational B-Spline) surface evaluation: Cox-de Boor basis functions, surface point evaluation, knot insertion, degree elevation. Critical for CAD/CAM geometry.",
    source_file: "PRISM_NURBS_MIT.js",
    source_course: "MIT 2.158J",
    lines: 590,
    mfg_relevance: "HIGH",
    mfg_applications: ["CAD surface evaluation", "toolpath interpolation", "5-axis surface machining"],
    functions: [
      { name: "evaluateNURBS", description: "Evaluate NURBS surface point" },
      { name: "coxDeBoor", description: "Cox-de Boor basis function recursion" },
      { name: "knotInsert", description: "Knot insertion refinement" },
      { name: "degreeElevate", description: "Degree elevation" },
    ],
    consumers: ["toolpath_gen", "surface_machining", "cad_import"],
  },
  {
    id: "ALG-TOOLPATH-001",
    name: "Toolpath Algorithm Library",
    type: "toolpath",
    complexity_class: "O(n^2)",
    size_complexity: "XL",
    safety_class: "HIGH",
    integration_wave: 2,
    description: "Comprehensive toolpath algorithm library: morph spiral, trochoidal, adaptive clearing, rest machining, and finishing strategies. Core CAM toolpath generation.",
    source_file: "COMPLETE_TOOLPATH_ALGORITHM_LIBRARY.js",
    lines: 2213,
    mfg_relevance: "HIGH",
    mfg_applications: ["adaptive clearing", "trochoidal milling", "rest machining", "finishing strategies"],
    functions: [
      { name: "morphSpiral", description: "Morphing spiral toolpath generation" },
      { name: "trochoidalPath", description: "Trochoidal milling path" },
      { name: "adaptiveClearing", description: "Adaptive clearing with constant engagement" },
      { name: "restMachining", description: "Rest material detection and re-machining" },
    ],
    consumers: ["cam_engine", "toolpath_gen", "strategy_selector"],
    potential_duplicate_of: "ALGORITHM_LIBRARY.js",
  },

  // --- Wave 3: MEDIUM safety ---
  {
    id: "ALG-SEARCH-001",
    name: "Enhanced Search Algorithms",
    type: "search",
    complexity_class: "O(b^d)",
    size_complexity: "XL",
    safety_class: "MEDIUM",
    integration_wave: 3,
    description: "Enhanced search algorithms: Best-First, A*, Beam Search, Bidirectional search, IDA*, SMA*, RBFS. Comprehensive AI search from MIT 6.034.",
    source_file: "PRISM_SEARCH_ENHANCED.js",
    source_course: "MIT 6.034",
    lines: 1961,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["operation planning", "process optimization"],
    functions: [
      { name: "aStarSearch", description: "A* graph search" },
      { name: "beamSearch", description: "Beam search with bounded width" },
      { name: "idaStar", description: "Iterative Deepening A*" },
      { name: "rbfs", description: "Recursive Best-First Search" },
    ],
    consumers: ["path_planner", "operation_sequencer"],
  },
  {
    id: "ALG-OPT-001",
    name: "Optimization Algorithms",
    type: "optimization",
    complexity_class: "O(n * iterations)",
    size_complexity: "S",
    safety_class: "MEDIUM",
    integration_wave: 3,
    description: "Gradient-based optimization: steepest descent, conjugate gradient, BFGS, L-BFGS. General optimization toolbox from MIT 6.251J/15.099.",
    source_file: "PRISM_OPTIMIZATION_ALGORITHMS.js",
    source_course: "MIT 6.251J",
    lines: 195,
    mfg_relevance: "MEDIUM",
    mfg_applications: ["parameter optimization", "process tuning"],
    functions: [
      { name: "gradientDescent", description: "Steepest descent optimizer" },
      { name: "conjugateGradient", description: "Conjugate gradient method" },
      { name: "bfgs", description: "BFGS quasi-Newton optimizer" },
      { name: "lbfgs", description: "Limited-memory BFGS" },
    ],
    consumers: ["param_optimizer", "speed_feed"],
  },

  // --- Wave 4: LOW safety ---
  {
    id: "ALG-GRAPH-001",
    name: "Graph Algorithms",
    type: "graph",
    complexity_class: "O(V + E log V)",
    size_complexity: "M",
    safety_class: "LOW",
    integration_wave: 4,
    description: "Core graph algorithms: Dijkstra shortest path, BFS, DFS, topological sort. General-purpose graph traversal and shortest path computation.",
    source_file: "PRISM_GRAPH.js",
    lines: 285,
    mfg_relevance: "LOW",
    mfg_applications: ["operation dependency graphs", "rapid move minimization"],
    functions: [
      { name: "dijkstra", description: "Dijkstra shortest path" },
      { name: "bfs", description: "Breadth-first search" },
      { name: "dfs", description: "Depth-first search" },
      { name: "topologicalSort", description: "Topological sort for DAGs" },
    ],
    consumers: ["operation_sequencer", "toolpath_gen"],
    potential_duplicate_of: "PRISM_GRAPH_ALGORITHMS.js",
  },
];

// ============================================================================
// ALGORITHM TYPES (categories for indexing)
// ============================================================================

export const ALGORITHM_TYPES: AlgorithmType[] = [
  "graph",
  "optimization",
  "search",
  "interpolation",
  "manufacturing",
  "numerical",
  "signal",
  "ml",
  "control",
  "toolpath",
  "data_structure",
  "graphics",
  "knowledge",
  "ensemble",
];

// ============================================================================
// ALGORITHM REGISTRY CLASS
// ============================================================================

export class AlgorithmRegistry extends BaseRegistry<AlgorithmEntry> {
  private indexByType: Map<string, string[]> = new Map();
  private indexBySafetyClass: Map<string, string[]> = new Map();
  private indexByRelevance: Map<string, string[]> = new Map();
  private indexByWave: Map<number, string[]> = new Map();
  private indexByConsumer: Map<string, string[]> = new Map();

  constructor() {
    super(
      "AlgorithmRegistry",
      path.join(PATHS.STATE_DIR, "algorithm-registry.json"),
      "1.0.0"
    );
  }

  /**
   * Load algorithms from built-ins and files
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    log.info("Loading AlgorithmRegistry...");

    // Load built-in algorithms first
    for (const algo of BUILT_IN_ALGORITHMS) {
      this.entries.set(algo.id, {
        id: algo.id,
        data: algo,
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: 1,
          source: "built-in",
        },
      });
    }

    // Load from scan results / state files
    await this.loadFromScanFile();

    // Load from extracted algorithm directory
    await this.loadFromAlgorithmDir();

    // Build indexes
    this.buildIndexes();

    this.loaded = true;
    log.info(
      `AlgorithmRegistry loaded: ${this.entries.size} algorithms across ${this.indexByType.size} types`
    );
  }

  /**
   * Load algorithms from the MS0 scan file if available
   */
  private async loadFromScanFile(): Promise<void> {
    const scanPaths = [
      path.join(PATHS.STATE_DIR, "MS0_ALGORITHMS_FORMULAS_SCAN.json"),
      path.join(PATHS.STATE_DIR, "algorithm-registry.json"),
    ];

    for (const scanPath of scanPaths) {
      try {
        if (!(await fileExists(scanPath))) continue;

        const data = await readJsonFile<any>(scanPath);

        // Handle the MS0 scan format: { algorithms: { files: [...] } }
        const files = data?.algorithms?.files || data?.files || [];
        if (!Array.isArray(files)) continue;

        let loaded = 0;
        for (const file of files) {
          const algId = this.fileNameToId(file.name);
          if (this.has(algId)) continue;

          const entry = this.parseScanEntry(file, algId);
          if (!entry) continue;

          this.entries.set(algId, {
            id: algId,
            data: entry,
            metadata: {
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              version: 1,
              source: scanPath,
            },
          });
          loaded++;
        }

        if (loaded > 0) {
          log.info(`Loaded ${loaded} algorithms from ${scanPath}`);
          return; // Use first successful source
        }
      } catch (error) {
        log.warn(`Failed to load algorithm scan from ${scanPath}: ${error}`);
      }
    }
  }

  /**
   * Load algorithms from extracted algorithm directory
   */
  private async loadFromAlgorithmDir(): Promise<void> {
    const algDir = path.join(PATHS.EXTRACTED_DIR, "algorithms");

    if (!(await fileExists(algDir))) {
      log.debug("Algorithm directory not found, using built-ins only");
      return;
    }

    try {
      const files = await listDirectory(algDir);
      const jsFiles = files.filter(
        (f) => f.name.endsWith(".js") || f.name.endsWith(".json")
      );

      for (const file of jsFiles) {
        const algId = this.fileNameToId(file.name);

        // Skip if already loaded from scan or built-in
        if (this.has(algId)) continue;

        // Create minimal entry from the filename
        this.entries.set(algId, {
          id: algId,
          data: {
            id: algId,
            name: this.fileNameToDisplayName(file.name),
            type: "manufacturing",
            complexity_class: "unknown",
            size_complexity: "S",
            safety_class: "MEDIUM",
            integration_wave: 3,
            description: `Algorithm module: ${file.name}`,
            source_file: file.name,
            mfg_relevance: "MEDIUM",
            functions: [],
          },
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            version: 1,
            source: file.path,
          },
        });
      }
    } catch (error) {
      log.warn(`Failed to scan algorithm directory: ${error}`);
    }
  }

  /**
   * Build search indexes for fast lookup
   */
  private buildIndexes(): void {
    this.indexByType.clear();
    this.indexBySafetyClass.clear();
    this.indexByRelevance.clear();
    this.indexByWave.clear();
    this.indexByConsumer.clear();

    for (const [id, entry] of this.entries) {
      const algo = entry.data;

      // Index by type
      if (algo.type) {
        if (!this.indexByType.has(algo.type)) {
          this.indexByType.set(algo.type, []);
        }
        this.indexByType.get(algo.type)!.push(id);
      }

      // Index by safety class
      if (algo.safety_class) {
        if (!this.indexBySafetyClass.has(algo.safety_class)) {
          this.indexBySafetyClass.set(algo.safety_class, []);
        }
        this.indexBySafetyClass.get(algo.safety_class)!.push(id);
      }

      // Index by mfg relevance
      if (algo.mfg_relevance) {
        if (!this.indexByRelevance.has(algo.mfg_relevance)) {
          this.indexByRelevance.set(algo.mfg_relevance, []);
        }
        this.indexByRelevance.get(algo.mfg_relevance)!.push(id);
      }

      // Index by integration wave
      if (algo.integration_wave) {
        if (!this.indexByWave.has(algo.integration_wave)) {
          this.indexByWave.set(algo.integration_wave, []);
        }
        this.indexByWave.get(algo.integration_wave)!.push(id);
      }

      // Index by consumer
      if (algo.consumers) {
        for (const consumer of algo.consumers) {
          if (!this.indexByConsumer.has(consumer)) {
            this.indexByConsumer.set(consumer, []);
          }
          this.indexByConsumer.get(consumer)!.push(id);
        }
      }
    }
  }

  // ==========================================================================
  // PUBLIC API: Query Methods
  // ==========================================================================

  /**
   * Get algorithm by ID
   */
  async getAlgorithm(id: string): Promise<AlgorithmEntry | undefined> {
    await this.load();
    return this.get(id);
  }

  /**
   * Get algorithms by type (graph, optimization, search, etc.)
   */
  async getByType(type: AlgorithmType): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexByType.get(type) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Get algorithms by manufacturing relevance (HIGH, MEDIUM, LOW)
   */
  async getByRelevance(relevance: MfgRelevance): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexByRelevance.get(relevance) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Get algorithms by safety class
   */
  async getBySafetyClass(
    safetyClass: AlgorithmSafetyClass
  ): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexBySafetyClass.get(safetyClass) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Get algorithms by integration wave (1 = CRITICAL first, 4 = LOW last)
   */
  async getByWave(wave: number): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexByWave.get(wave) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Get algorithms for a specific consumer (engine/tool)
   */
  async getForConsumer(consumer: string): Promise<AlgorithmEntry[]> {
    await this.load();

    const ids = this.indexByConsumer.get(consumer) || [];
    return ids.map((id) => this.get(id)).filter(Boolean) as AlgorithmEntry[];
  }

  /**
   * Search algorithms with filters and text query
   */
  async searchAlgorithms(options: {
    query?: string;
    type?: AlgorithmType;
    safety_class?: AlgorithmSafetyClass;
    mfg_relevance?: MfgRelevance;
    integration_wave?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ algorithms: AlgorithmEntry[]; total: number }> {
    await this.load();

    let results: AlgorithmEntry[] = [];

    // Start with most selective index
    if (options.type) {
      results = await this.getByType(options.type);
    } else if (options.safety_class) {
      results = await this.getBySafetyClass(options.safety_class);
    } else if (options.mfg_relevance) {
      results = await this.getByRelevance(options.mfg_relevance);
    } else if (options.integration_wave) {
      results = await this.getByWave(options.integration_wave);
    } else {
      results = this.all();
    }

    // Apply additional filters
    if (options.type && !options.safety_class && !options.mfg_relevance) {
      // Already filtered by type
    } else {
      if (options.type) {
        results = results.filter((a) => a.type === options.type);
      }
    }
    if (
      options.safety_class &&
      !(
        !options.type &&
        options.safety_class &&
        !options.mfg_relevance &&
        !options.integration_wave
      )
    ) {
      results = results.filter(
        (a) => a.safety_class === options.safety_class
      );
    }
    if (options.mfg_relevance) {
      results = results.filter(
        (a) => a.mfg_relevance === options.mfg_relevance
      );
    }
    if (options.integration_wave !== undefined) {
      results = results.filter(
        (a) => a.integration_wave === options.integration_wave
      );
    }

    // Text search (multi-term AND across all fields)
    if (options.query && options.query !== "*") {
      const terms = options.query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);
      results = results.filter((algo) => {
        const searchText = [
          algo.name,
          algo.description,
          algo.type,
          algo.source_file,
          algo.source_course || "",
          ...(algo.mfg_applications || []),
          ...algo.functions.map((f) => f.name),
        ]
          .join(" ")
          .toLowerCase();
        return terms.every((term) => searchText.includes(term));
      });
    }

    const total = results.length;

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    results = results.slice(offset, offset + limit);

    return { algorithms: results, total };
  }

  /**
   * List all algorithms with optional filtering
   */
  async listAlgorithms(options?: {
    type?: AlgorithmType;
    safety_class?: AlgorithmSafetyClass;
    mfg_relevance?: MfgRelevance;
    limit?: number;
    offset?: number;
  }): Promise<{ algorithms: AlgorithmEntry[]; total: number }> {
    await this.load();

    let results: AlgorithmEntry[];

    if (options?.type) {
      results = await this.getByType(options.type);
    } else if (options?.safety_class) {
      results = await this.getBySafetyClass(options.safety_class);
    } else if (options?.mfg_relevance) {
      results = await this.getByRelevance(options.mfg_relevance);
    } else {
      results = this.all();
    }

    const total = results.length;

    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    results = results.slice(offset, offset + limit);

    return { algorithms: results, total };
  }

  /**
   * Get statistics about loaded algorithms
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    bySafetyClass: Record<string, number>;
    byRelevance: Record<string, number>;
    byWave: Record<string, number>;
    consumerCount: number;
  }> {
    await this.load();

    const stats = {
      total: this.entries.size,
      byType: {} as Record<string, number>,
      bySafetyClass: {} as Record<string, number>,
      byRelevance: {} as Record<string, number>,
      byWave: {} as Record<string, number>,
      consumerCount: this.indexByConsumer.size,
    };

    for (const [type, ids] of this.indexByType) {
      stats.byType[type] = ids.length;
    }

    for (const [sc, ids] of this.indexBySafetyClass) {
      stats.bySafetyClass[sc] = ids.length;
    }

    for (const [rel, ids] of this.indexByRelevance) {
      stats.byRelevance[rel] = ids.length;
    }

    for (const [wave, ids] of this.indexByWave) {
      stats.byWave[`wave_${wave}`] = ids.length;
    }

    return stats;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Convert scan file entry to AlgorithmEntry
   */
  private parseScanEntry(
    file: any,
    algId: string
  ): AlgorithmEntry | null {
    if (!file.name) return null;

    return {
      id: algId,
      name: this.fileNameToDisplayName(file.name),
      type: this.inferType(file.name, file.description || ""),
      complexity_class: this.sizeToComplexityHint(file.complexity),
      size_complexity: file.complexity || "S",
      safety_class: file.safety_class || "MEDIUM",
      integration_wave: file.integration_wave || 3,
      description: file.description || `Algorithm module: ${file.name}`,
      source_file: file.name,
      lines: file.lines,
      mfg_relevance: file.mfg_relevance || "MEDIUM",
      functions: [],
      potential_duplicate_of: file.potential_duplicate_of,
    };
  }

  /**
   * Derive a stable ID from an algorithm filename
   * PRISM_SIGNAL_ALGORITHMS.js -> ALG-SIGNAL-ALGORITHMS
   */
  private fileNameToId(filename: string): string {
    return (
      "ALG-" +
      filename
        .replace(/^PRISM_/, "")
        .replace(/^COMPLETE_/, "")
        .replace(/\.js$/, "")
        .replace(/\.json$/, "")
        .toUpperCase()
        .replace(/_/g, "-")
    );
  }

  /**
   * Convert filename to human-readable display name
   * PRISM_SIGNAL_ALGORITHMS.js -> "Signal Algorithms"
   */
  private fileNameToDisplayName(filename: string): string {
    return filename
      .replace(/^PRISM_/, "")
      .replace(/^COMPLETE_/, "")
      .replace(/\.js$/, "")
      .replace(/\.json$/, "")
      .replace(/_/g, " ")
      .replace(/\bMIT\b/g, "MIT")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Infer algorithm type from filename and description
   */
  private inferType(filename: string, description: string): AlgorithmType {
    const lower = (filename + " " + description).toLowerCase();

    if (lower.includes("signal") || lower.includes("fft") || lower.includes("spectral")) return "signal";
    if (lower.includes("graph_neural") || lower.includes("rl_") || lower.includes("policy_gradient") || lower.includes("reinforcement")) return "ml";
    if (lower.includes("graph") && !lower.includes("neural")) return "graph";
    if (lower.includes("toolpath") || lower.includes("tool_path")) return "toolpath";
    if (lower.includes("control") || lower.includes("pid") || lower.includes("digital_control")) return "control";
    if (lower.includes("search")) return "search";
    if (lower.includes("optimi")) return "optimization";
    if (lower.includes("interpol") || lower.includes("nurbs") || lower.includes("bezier") || lower.includes("spline")) return "interpolation";
    if (lower.includes("numerical") || lower.includes("linalg") || lower.includes("ode") || lower.includes("jacobian")) return "numerical";
    if (lower.includes("graphics") || lower.includes("kernel_pass")) return "graphics";
    if (lower.includes("manufacturing") || lower.includes("mfg") || lower.includes("dfm") || lower.includes("taylor") || lower.includes("johnson_cook")) return "manufacturing";
    if (lower.includes("knowledge") || lower.includes("phase7")) return "knowledge";
    if (lower.includes("ensemble")) return "ensemble";
    if (lower.includes("kdtree") || lower.includes("octree") || lower.includes("sorting") || lower.includes("core_algorithms")) return "data_structure";

    return "manufacturing"; // Default for PRISM context
  }

  /**
   * Map size complexity to a rough Big-O hint
   */
  private sizeToComplexityHint(sizeComplexity: string): string {
    switch (sizeComplexity) {
      case "S":
        return "O(n)";
      case "M":
        return "O(n log n)";
      case "L":
        return "O(n^2)";
      case "XL":
        return "O(n^2) or higher";
      default:
        return "unknown";
    }
  }
}

// Export singleton instance
export const algorithmRegistry = new AlgorithmRegistry();
