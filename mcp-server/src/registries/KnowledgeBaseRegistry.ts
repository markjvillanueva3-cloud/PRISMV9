/**
 * PRISM MCP Server - Knowledge Base Registry
 * Manages 12 knowledge base files covering manufacturing physics,
 * algorithms, data structures, systems, and academic course content
 *
 * Knowledge Base Topics (5):
 * - troubleshooting: Diagnostic and problem-solving knowledge
 * - best_practices: Manufacturing best practices and guidelines
 * - process_knowledge: Core manufacturing physics and processes
 * - reference: Academic course catalogs, algorithm references
 * - academic: University-sourced algorithms and data structures
 *
 * Source files: C:\PRISM\extracted\knowledge_bases\ (12 files)
 */

import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, listDirectory } from "../utils/files.js";

// ============================================================================
// KNOWLEDGE BASE TYPES
// ============================================================================

export type KnowledgeBaseTopic =
  | "troubleshooting"
  | "best_practices"
  | "process_knowledge"
  | "reference"
  | "academic";

export type KnowledgeBaseQueryType =
  | "lookup"
  | "search"
  | "related"
  | "diagnostic";

export interface KnowledgeBaseEntry {
  // Identification
  id: string;
  name: string;
  topic: KnowledgeBaseTopic;
  description: string;

  // Source info
  source_file: string;
  entry_count: number;

  // Query capabilities
  query_types: KnowledgeBaseQueryType[];

  // Content structure
  sections: string[];
  keywords: string[];

  // Metadata
  lines: number;
  size_kb: number;
  complexity: "S" | "M" | "L" | "XL";
  safety_class: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  version?: string;

  // Status
  status: "active" | "stub" | "deprecated";
  enabled: boolean;

  // Timestamps
  created: string;
  updated: string;
}

// ============================================================================
// BUILT-IN KNOWLEDGE BASE ENTRIES (seeded from 12 KB files)
// ============================================================================

const BUILT_IN_KNOWLEDGE_BASES: Partial<KnowledgeBaseEntry>[] = [
  // =========================================================================
  // PROCESS KNOWLEDGE (Core manufacturing physics)
  // =========================================================================
  {
    id: "kb-knowledge-base",
    name: "Core Manufacturing Knowledge Base",
    topic: "process_knowledge",
    description: "Core manufacturing knowledge: chip formation models (Merchant, Lee-Shaffer), Kienzle cutting force, Taylor tool life, thermal models, surface finish formulas. Physics of metal cutting.",
    source_file: "PRISM_KNOWLEDGE_BASE.js",
    entry_count: 25,
    query_types: ["lookup", "search", "related", "diagnostic"],
    sections: ["physics", "chipFormation", "specificCuttingForce", "power", "thermal", "surfaceFinish", "toolLife"],
    keywords: ["kienzle", "taylor", "merchant", "cutting force", "chip formation", "surface finish", "thermal", "tool life", "power", "metal cutting"],
    lines: 620,
    size_kb: 28.1,
    complexity: "M",
    safety_class: "HIGH",
    status: "active",
    enabled: true
  },
  {
    id: "kb-knowledge-graph",
    name: "Knowledge Graph",
    topic: "process_knowledge",
    description: "Graph database with nodes (material, tool, operation, machine, parameter, defect, solution) and relation edges (suited_for, causes, prevents, requires, produces, improves, degrades).",
    source_file: "PRISM_KNOWLEDGE_GRAPH.js",
    entry_count: 7,
    query_types: ["lookup", "search", "related"],
    sections: ["nodes", "edges", "nodeTypes", "relationTypes", "queries"],
    keywords: ["graph", "material", "tool", "operation", "machine", "parameter", "defect", "solution", "relation", "suited_for", "causes"],
    lines: 268,
    size_kb: 10.4,
    complexity: "M",
    safety_class: "MEDIUM",
    status: "active",
    enabled: true
  },
  {
    id: "kb-knowledge-fusion",
    name: "Cross-Domain Knowledge Fusion",
    topic: "process_knowledge",
    description: "Knowledge fusion engine combining multiple KB sources. Maps domain knowledge (optimization, ML, signal processing, manufacturing, planning, control) with fusion rules for combined capabilities.",
    source_file: "PRISM_KNOWLEDGE_FUSION.js",
    entry_count: 6,
    query_types: ["lookup", "search", "related"],
    sections: ["domains", "fusionRules", "optimization", "machineLearning", "signalProcessing", "manufacturing", "planning", "control"],
    keywords: ["fusion", "cross-domain", "PSO", "ACO", "GA", "neural network", "FFT", "kalman", "taylor", "PID", "MPC"],
    lines: 143,
    size_kb: 5.6,
    complexity: "S",
    safety_class: "MEDIUM",
    status: "active",
    enabled: true
  },

  // =========================================================================
  // REFERENCE (Integration and routing)
  // =========================================================================
  {
    id: "kb-knowledge-ai-connector",
    name: "Knowledge AI Connector",
    topic: "reference",
    description: "Connector between knowledge bases and AI subsystem. Subscribes to planning and optimization events, records outcomes for AI learning pipeline with algorithm and knowledge source tracking.",
    source_file: "PRISM_KNOWLEDGE_AI_CONNECTOR.js",
    entry_count: 8,
    query_types: ["lookup", "related"],
    sections: ["connectToLearning", "eventSubscriptions", "outcomeRecording"],
    keywords: ["AI", "learning", "connector", "event", "planning", "optimization", "pipeline"],
    lines: 101,
    size_kb: 4.1,
    complexity: "S",
    safety_class: "MEDIUM",
    status: "active",
    enabled: true
  },
  {
    id: "kb-knowledge-integration-routes",
    name: "Knowledge Integration Routes",
    topic: "reference",
    description: "API routes for knowledge base integration. Maps route paths to module functions for AI/ML (RL, neural networks, optimizers, clustering), signal processing, and manufacturing algorithms.",
    source_file: "PRISM_KNOWLEDGE_INTEGRATION_ROUTES.js",
    entry_count: 50,
    query_types: ["lookup", "search"],
    sections: ["routes", "ai.rl", "ai.nn", "ai.cluster", "signal", "manufacturing"],
    keywords: ["routes", "API", "integration", "SARSA", "DQN", "activation", "optimizer", "clustering"],
    lines: 138,
    size_kb: 8.1,
    complexity: "S",
    safety_class: "MEDIUM",
    status: "active",
    enabled: true
  },
  {
    id: "kb-220-courses-master",
    name: "220 Courses Master Index",
    topic: "reference",
    description: "220 MIT/university courses master index with algorithm counts. Covers 12 universities, 850 algorithms, gateway route registration, and utilization tracking.",
    source_file: "PRISM_220_COURSES_MASTER.js",
    entry_count: 220,
    query_types: ["lookup", "search"],
    sections: ["stats", "courses", "algorithms", "gatewayRoutes", "utilization"],
    keywords: ["MIT", "university", "courses", "algorithms", "OCW", "gateway", "utilization"],
    lines: 321,
    size_kb: 14.2,
    complexity: "M",
    safety_class: "LOW",
    status: "active",
    enabled: true
  },

  // =========================================================================
  // ACADEMIC (University-sourced algorithms and structures)
  // =========================================================================
  {
    id: "kb-algorithms",
    name: "Algorithms Knowledge Base",
    topic: "academic",
    description: "Algorithms knowledge base: sorting, searching, graph, optimization, numerical methods. Extracted from MIT OCW lecture transcripts (6.837, 18.086, 1.124j, 6.033).",
    source_file: "PRISM_ALGORITHMS_KB.js",
    entry_count: 35,
    query_types: ["lookup", "search", "related"],
    sections: ["sorting", "searching", "graph", "optimization", "numerical", "geometric"],
    keywords: ["quicksort", "DFS", "A*", "binary search", "prim", "PSO", "ACO", "newton-raphson", "conjugate gradient", "FFT", "finite element", "monte carlo", "runge-kutta"],
    lines: 2292,
    size_kb: 147.0,
    complexity: "L",
    safety_class: "LOW",
    status: "active",
    enabled: true
  },
  {
    id: "kb-university-algorithms",
    name: "University Algorithms",
    topic: "academic",
    description: "20 university-sourced algorithms: Delaunay refinement, convex hull, mesh quality, parametric curves, solid modeling, B-rep, NURBS, path planning. From MIT, Berkeley, Stanford.",
    source_file: "PRISM_UNIVERSITY_ALGORITHMS.js",
    entry_count: 20,
    query_types: ["lookup", "search", "related"],
    sections: ["computationalGeometry", "meshGeneration", "solidModeling", "pathPlanning", "surfaceRepresentation"],
    keywords: ["Delaunay", "convex hull", "mesh", "NURBS", "B-rep", "path planning", "parametric", "Ruppert", "solid modeling"],
    lines: 4935,
    size_kb: 201.2,
    complexity: "XL",
    safety_class: "LOW",
    status: "active",
    enabled: true
  },
  {
    id: "kb-data-structures",
    name: "Data Structures Knowledge Base",
    topic: "academic",
    description: "Data structures knowledge: trees (kd-tree, BVH, trie, heap, R-tree), graphs (DAG, adjacency matrix), geometric (mesh, CSG, triangle mesh, point cloud), spatial (grid, bounding box, frustum).",
    source_file: "PRISM_DATA_STRUCTURES_KB.js",
    entry_count: 20,
    query_types: ["lookup", "search", "related"],
    sections: ["trees", "graphs", "geometric", "spatial"],
    keywords: ["kd-tree", "BVH", "trie", "heap", "R-tree", "DAG", "mesh", "CSG", "point cloud", "voxel", "bounding box"],
    lines: 47,
    size_kb: 12.1,
    complexity: "S",
    safety_class: "LOW",
    status: "active",
    enabled: true
  },
  {
    id: "kb-systems",
    name: "Systems Knowledge Base",
    topic: "academic",
    description: "Systems-level knowledge: architecture patterns (pipeline, client-server), design patterns (strategy, command, observer, factory, adapter), concurrency (lock, atomic, thread, deadlock), distributed (replication, raft, consensus).",
    source_file: "PRISM_SYSTEMS_KB.js",
    entry_count: 18,
    query_types: ["lookup", "search", "related"],
    sections: ["architecture", "patterns", "concurrency", "distributed"],
    keywords: ["pipeline", "client-server", "strategy", "observer", "factory", "lock", "deadlock", "raft", "consensus", "thread pool"],
    lines: 26,
    size_kb: 5.8,
    complexity: "S",
    safety_class: "LOW",
    status: "active",
    enabled: true
  },

  // =========================================================================
  // BEST PRACTICES (Manufacturing structures and AI)
  // =========================================================================
  {
    id: "kb-mfg-structures",
    name: "Manufacturing Structures Knowledge Base",
    topic: "best_practices",
    description: "Manufacturing structures: toolpath strategies (spiral, zigzag, finishing, contour, pencil, roughing), multi-axis (collision detection), cutting parameters (MRR, feed rate, spindle speed, tool life, Taylor equation).",
    source_file: "PRISM_MFG_STRUCTURES_KB.js",
    entry_count: 12,
    query_types: ["lookup", "search", "diagnostic"],
    sections: ["toolpath", "multiaxis", "cutting"],
    keywords: ["spiral", "zigzag", "contour", "pencil", "roughing", "finishing", "collision", "MRR", "feed rate", "spindle speed", "tool life", "Taylor"],
    lines: 21,
    size_kb: 4.9,
    complexity: "S",
    safety_class: "LOW",
    status: "active",
    enabled: true
  },
  {
    id: "kb-ai-structures",
    name: "AI Structures Knowledge Base",
    topic: "best_practices",
    description: "AI structures knowledge: neural (GAN, attention, neural network), classical (clustering), probabilistic (HMM). Extracted from MIT OCW lecture transcripts.",
    source_file: "PRISM_AI_STRUCTURES_KB.js",
    entry_count: 5,
    query_types: ["lookup", "search"],
    sections: ["neural", "classical", "probabilistic"],
    keywords: ["GAN", "attention", "neural network", "clustering", "HMM", "AI", "machine learning"],
    lines: 13,
    size_kb: 2.0,
    complexity: "S",
    safety_class: "LOW",
    status: "stub",
    enabled: true
  }
];

// ============================================================================
// KNOWLEDGE BASE REGISTRY CLASS
// ============================================================================

export class KnowledgeBaseRegistry extends BaseRegistry<KnowledgeBaseEntry> {
  private indexByTopic: Map<KnowledgeBaseTopic, Set<string>> = new Map();
  private indexByKeyword: Map<string, Set<string>> = new Map();
  private indexByQueryType: Map<KnowledgeBaseQueryType, Set<string>> = new Map();

  constructor() {
    super(
      "KnowledgeBaseRegistry",
      path.join(PATHS.STATE_DIR, "knowledgebase-registry.json"),
      "1.0.0"
    );
  }

  /**
   * Load knowledge bases from built-in definitions and file system
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    log.info("Loading KnowledgeBaseRegistry...");

    // Load built-in knowledge bases first
    const now = new Date().toISOString();

    for (const kb of BUILT_IN_KNOWLEDGE_BASES) {
      if (!kb.id) continue;

      this.entries.set(kb.id, {
        id: kb.id,
        data: {
          id: kb.id!,
          name: kb.name || kb.id!,
          topic: kb.topic || "reference",
          description: kb.description || "",
          source_file: kb.source_file || "",
          entry_count: kb.entry_count || 0,
          query_types: kb.query_types || ["lookup", "search"],
          sections: kb.sections || [],
          keywords: kb.keywords || [],
          lines: kb.lines || 0,
          size_kb: kb.size_kb || 0,
          complexity: kb.complexity || "S",
          safety_class: kb.safety_class || "LOW",
          version: kb.version,
          status: kb.status || "active",
          enabled: kb.enabled !== undefined ? kb.enabled : true,
          created: now,
          updated: now
        } as KnowledgeBaseEntry,
        metadata: {
          created: now,
          updated: now,
          version: 1,
          source: "built-in"
        }
      });
    }

    // Load from persisted state file (user/learned overrides)
    await this.loadFromStateFile();

    // Discover any additional KB files from the file system
    await this.discoverFromFileSystem();

    // Build indexes
    this.buildIndexes();

    this.loaded = true;
    log.info(`KnowledgeBaseRegistry loaded: ${this.entries.size} knowledge bases across ${this.indexByTopic.size} topics`);
  }

  /**
   * Load from persisted state file
   */
  private async loadFromStateFile(): Promise<void> {
    try {
      if (!await fileExists(this.filePath)) return;

      const data = await readJsonFile<any>(this.filePath);

      if (data?.entries) {
        for (const [id, entry] of Object.entries(data.entries)) {
          // Don't overwrite built-in entries
          if (!this.has(id)) {
            this.entries.set(id, entry as any);
          }
        }
        log.debug(`Loaded ${Object.keys(data.entries).length} entries from state file`);
      }
    } catch (error) {
      log.warn(`Failed to load KB state file: ${error}`);
    }
  }

  /**
   * Discover additional KB files from the knowledge_bases directory
   */
  private async discoverFromFileSystem(): Promise<void> {
    const kbDir = PATHS.KNOWLEDGE_BASES;

    if (!await fileExists(kbDir)) {
      log.debug("Knowledge bases directory not found");
      return;
    }

    try {
      const files = await listDirectory(kbDir);

      for (const file of files) {
        if (!file.name.endsWith(".js") && !file.name.endsWith(".json")) continue;

        // Generate ID from filename
        const id = "kb-" + file.name
          .replace(/^PRISM_/, "")
          .replace(/\.(js|json)$/, "")
          .toLowerCase()
          .replace(/_/g, "-");

        // Skip if already registered from built-in
        if (this.has(id)) continue;

        // Register as discovered (minimal metadata)
        const now = new Date().toISOString();
        this.entries.set(id, {
          id,
          data: {
            id,
            name: file.name.replace(/^PRISM_/, "").replace(/\.(js|json)$/, "").replace(/_/g, " "),
            topic: "reference" as KnowledgeBaseTopic,
            description: `Auto-discovered knowledge base from ${file.name}`,
            source_file: file.name,
            entry_count: 0,
            query_types: ["lookup", "search"] as KnowledgeBaseQueryType[],
            sections: [],
            keywords: [],
            lines: 0,
            size_kb: 0,
            complexity: "S" as const,
            safety_class: "LOW" as const,
            status: "active" as const,
            enabled: true,
            created: now,
            updated: now
          },
          metadata: {
            created: now,
            updated: now,
            version: 1,
            source: file.path || file.name
          }
        });
      }
    } catch (error) {
      log.warn(`Failed to discover KB files: ${error}`);
    }
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByTopic.clear();
    this.indexByKeyword.clear();
    this.indexByQueryType.clear();

    for (const [id, entry] of this.entries) {
      const kb = entry.data;

      // Index by topic
      if (kb.topic) {
        if (!this.indexByTopic.has(kb.topic)) {
          this.indexByTopic.set(kb.topic, new Set());
        }
        this.indexByTopic.get(kb.topic)!.add(id);
      }

      // Index by keywords
      if (kb.keywords) {
        for (const keyword of kb.keywords) {
          const lowerKeyword = keyword.toLowerCase();
          if (!this.indexByKeyword.has(lowerKeyword)) {
            this.indexByKeyword.set(lowerKeyword, new Set());
          }
          this.indexByKeyword.get(lowerKeyword)!.add(id);
        }
      }

      // Index by query type
      if (kb.query_types) {
        for (const qt of kb.query_types) {
          if (!this.indexByQueryType.has(qt)) {
            this.indexByQueryType.set(qt, new Set());
          }
          this.indexByQueryType.get(qt)!.add(id);
        }
      }
    }
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Get knowledge base by ID
   */
  async getKnowledgeBase(id: string): Promise<KnowledgeBaseEntry | undefined> {
    await this.load();
    return this.get(id);
  }

  /**
   * Get knowledge bases by topic
   */
  async getByTopic(topic: KnowledgeBaseTopic): Promise<KnowledgeBaseEntry[]> {
    await this.load();

    const ids = this.indexByTopic.get(topic);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.get(id))
      .filter(Boolean) as KnowledgeBaseEntry[];
  }

  /**
   * Get knowledge bases by query type capability
   */
  async getByQueryType(queryType: KnowledgeBaseQueryType): Promise<KnowledgeBaseEntry[]> {
    await this.load();

    const ids = this.indexByQueryType.get(queryType);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.get(id))
      .filter(Boolean) as KnowledgeBaseEntry[];
  }

  /**
   * Search knowledge bases with filters
   */
  search(options: {
    query?: string;
    topic?: KnowledgeBaseTopic;
    queryType?: KnowledgeBaseQueryType;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): { knowledgeBases: KnowledgeBaseEntry[]; total: number; hasMore: boolean } {
    let results: KnowledgeBaseEntry[] = [];

    if (options.topic) {
      const ids = this.indexByTopic.get(options.topic);
      results = ids
        ? Array.from(ids).map(id => this.get(id)).filter(Boolean) as KnowledgeBaseEntry[]
        : [];
    } else if (options.queryType) {
      const ids = this.indexByQueryType.get(options.queryType);
      results = ids
        ? Array.from(ids).map(id => this.get(id)).filter(Boolean) as KnowledgeBaseEntry[]
        : [];
    } else {
      results = this.all();
    }

    // Text search across name, description, keywords, sections
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(kb =>
        kb.name.toLowerCase().includes(query) ||
        kb.id.toLowerCase().includes(query) ||
        kb.description.toLowerCase().includes(query) ||
        kb.keywords.some(k => k.toLowerCase().includes(query)) ||
        kb.sections.some(s => s.toLowerCase().includes(query))
      );
    }

    // Filter by enabled status
    if (options.enabled !== undefined) {
      results = results.filter(kb => kb.enabled === options.enabled);
    }

    const total = results.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);

    return {
      knowledgeBases: paged,
      total,
      hasMore: offset + paged.length < total
    };
  }

  /**
   * Query text search within KB entries (searches keywords and descriptions)
   */
  async query(text: string, options?: {
    topic?: KnowledgeBaseTopic;
    limit?: number;
  }): Promise<{
    results: {
      knowledgeBase: KnowledgeBaseEntry;
      relevance: number;
      matchedKeywords: string[];
      matchedSections: string[];
    }[];
    total: number;
  }> {
    await this.load();

    const queryLower = text.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 1);

    let candidates: KnowledgeBaseEntry[] = [];

    if (options?.topic) {
      candidates = await this.getByTopic(options.topic);
    } else {
      candidates = this.all();
    }

    // Only include enabled entries
    candidates = candidates.filter(kb => kb.enabled);

    const scored: {
      knowledgeBase: KnowledgeBaseEntry;
      relevance: number;
      matchedKeywords: string[];
      matchedSections: string[];
    }[] = [];

    for (const kb of candidates) {
      let relevance = 0;
      const matchedKeywords: string[] = [];
      const matchedSections: string[] = [];

      // Score keyword matches (highest weight)
      for (const keyword of kb.keywords) {
        const keyLower = keyword.toLowerCase();
        for (const term of queryTerms) {
          if (keyLower.includes(term) || term.includes(keyLower)) {
            relevance += 3;
            if (!matchedKeywords.includes(keyword)) {
              matchedKeywords.push(keyword);
            }
          }
        }
      }

      // Score section matches
      for (const section of kb.sections) {
        const secLower = section.toLowerCase();
        for (const term of queryTerms) {
          if (secLower.includes(term)) {
            relevance += 2;
            if (!matchedSections.includes(section)) {
              matchedSections.push(section);
            }
          }
        }
      }

      // Score name and description matches
      for (const term of queryTerms) {
        if (kb.name.toLowerCase().includes(term)) relevance += 2;
        if (kb.description.toLowerCase().includes(term)) relevance += 1;
      }

      if (relevance > 0) {
        scored.push({ knowledgeBase: kb, relevance, matchedKeywords, matchedSections });
      }
    }

    // Sort by relevance descending
    scored.sort((a, b) => b.relevance - a.relevance);

    const limit = options?.limit || 10;
    const results = scored.slice(0, limit);

    return {
      results,
      total: scored.length
    };
  }

  /**
   * List knowledge bases with optional filtering
   */
  async listKnowledgeBases(options?: {
    topic?: KnowledgeBaseTopic;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ knowledgeBases: KnowledgeBaseEntry[]; total: number }> {
    await this.load();

    let results: KnowledgeBaseEntry[] = [];

    if (options?.topic) {
      results = await this.getByTopic(options.topic);
    } else {
      results = this.all();
    }

    if (options?.enabled !== undefined) {
      results = results.filter(kb => kb.enabled === options.enabled);
    }

    const total = results.length;

    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    results = results.slice(offset, offset + limit);

    return { knowledgeBases: results, total };
  }

  /**
   * Get the source file path for a knowledge base
   */
  getSourcePath(id: string): string | undefined {
    const kb = this.get(id);
    if (!kb) return undefined;

    return path.join(PATHS.KNOWLEDGE_BASES, kb.source_file);
  }

  /**
   * Get all available topics with counts
   */
  getTopics(): { topic: KnowledgeBaseTopic; count: number }[] {
    const topics: { topic: KnowledgeBaseTopic; count: number }[] = [];

    for (const [topic, ids] of this.indexByTopic) {
      topics.push({ topic, count: ids.size });
    }

    return topics.sort((a, b) => b.count - a.count);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byTopic: Record<string, number>;
    totalLines: number;
    totalSizeKB: number;
    totalEntryCount: number;
    activeEnabled: number;
  } {
    const stats = {
      total: this.entries.size,
      byTopic: {} as Record<string, number>,
      totalLines: 0,
      totalSizeKB: 0,
      totalEntryCount: 0,
      activeEnabled: 0
    };

    for (const [topic, ids] of this.indexByTopic) {
      stats.byTopic[topic] = ids.size;
    }

    for (const entry of this.entries.values()) {
      const kb = entry.data;
      stats.totalLines += kb.lines || 0;
      stats.totalSizeKB += kb.size_kb || 0;
      stats.totalEntryCount += kb.entry_count || 0;
      if (kb.status === "active" && kb.enabled) stats.activeEnabled++;
    }

    stats.totalSizeKB = Math.round(stats.totalSizeKB * 10) / 10;

    return stats;
  }
}

// Export singleton instance
export const knowledgeBaseRegistry = new KnowledgeBaseRegistry();
