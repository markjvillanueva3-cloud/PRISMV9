/**
 * MITCourseIntegrationEngine — PP-AGI Academic Course Integration
 * ================================================================
 * Wires 216+ unused MIT OpenCourseWare courses to PP-AGI domains.
 *
 * The MIT course archive contains 225 courses but only ~9 are currently
 * integrated into PRISM engines. This engine provides:
 *
 *   1. Load/parse MIT course content from JSON registries
 *   2. Map courses to PP domains (algorithms, optimization, control, ML, etc.)
 *   3. Search and query capabilities for course content
 *   4. Extract algorithms from courses
 *   5. Apply course knowledge to manufacturing problems
 *   6. Recommend courses for specific problems
 *
 * Data sources:
 *   - H:/prism/resources/MIT COURSES/MIT_COURSE_INDEX.json (225 courses)
 *   - H:/prism/resources/MIT COURSES/ALGORITHM_REGISTRY.json (285 algorithms)
 *   - H:/prism/resources/MIT COURSES/PRISM_COURSE_CATALOG.json (detailed catalog)
 *
 * @module engines/MITCourseIntegrationEngine
 * @milestone PP-AGI-MIT
 * @version 1.0.0
 */

import { readFileSync, existsSync } from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** PP-AGI domain classification */
export type PPDomain =
  | "algorithms"
  | "optimization"
  | "machine_learning"
  | "control_systems"
  | "signal_processing"
  | "manufacturing"
  | "materials"
  | "geometry_cad"
  | "scheduling"
  | "numerical_methods"
  | "statistics"
  | "systems_engineering"
  | "software_engineering"
  | "security"
  | "databases"
  | "business"
  | "human_factors"
  | "other";

/** Course priority tier */
export type CourseTier = "TIER_1" | "TIER_2" | "TIER_3";

/** Course integration status */
export type IntegrationStatus = "integrated" | "mapped" | "available" | "archived";

/** A course entry from the index */
export interface MITCourse {
  id: string;
  name: string;
  file?: string;
  extracted?: boolean;
  topics: string[];
  category: string;
  priority: CourseTier;
  description?: string;
  domain: PPDomain;
  integrationStatus: IntegrationStatus;
}

/** Algorithm entry from the registry */
export interface AlgorithmEntry {
  name: string;
  course: string;
  prismEngines: string[];
  category: string;
  subcategory?: string;
}

/** Course details with full metadata */
export interface CourseDetails {
  course: MITCourse;
  algorithms: AlgorithmEntry[];
  relatedCourses: string[];
  prismEngineCount: number;
  manufacturingRelevance: number; // 0-1 score
  topicsKeywords: string[];
}

/** Search result for courses */
export interface CourseSearchResult {
  courses: MITCourse[];
  query: string;
  matchCount: number;
  domainBreakdown: Record<PPDomain, number>;
}

/** Algorithm extraction result */
export interface AlgorithmExtraction {
  courseId: string;
  courseName: string;
  algorithms: AlgorithmEntry[];
  totalAlgorithms: number;
  prismEnginesMapped: number;
  unmappedAlgorithms: string[];
}

/** Manufacturing application result */
export interface ManufacturingApplication {
  courseId: string;
  problem: string;
  applicableAlgorithms: AlgorithmEntry[];
  prismEngines: string[];
  theoryToPractice: string;
  confidence: number;
  citations: string[];
}

/** Course recommendation result */
export interface CourseRecommendation {
  problem: string;
  recommendedCourses: Array<{
    course: MITCourse;
    relevanceScore: number;
    matchedTopics: string[];
    applicableAlgorithms: string[];
    rationale: string;
  }>;
  domainFocus: PPDomain[];
  totalMatches: number;
}

/** Integration statistics */
export interface IntegrationStats {
  totalCourses: number;
  integratedCourses: number;
  mappedCourses: number;
  availableCourses: number;
  archivedCourses: number;
  totalAlgorithms: number;
  totalPrismEngines: number;
  coveragePercent: number;
  byDomain: Record<PPDomain, number>;
  byTier: Record<CourseTier, number>;
}

// ============================================================================
// DOMAIN MAPPING
// ============================================================================

/** Map category names from index to PP domains */
const CATEGORY_TO_DOMAIN: Record<string, PPDomain> = {
  "software_engineering": "software_engineering",
  "algorithms": "algorithms",
  "optimization": "optimization",
  "machine_learning": "machine_learning",
  "statistics_probability": "statistics",
  "manufacturing": "manufacturing",
  "control_dynamics": "control_systems",
  "signal_processing": "signal_processing",
  "graphics_geometry": "geometry_cad",
  "materials": "materials",
  "databases": "databases",
  "security": "security",
  "human_factors": "human_factors",
  "systems_engineering": "systems_engineering",
  "parallel_computing": "software_engineering",
  "numerical_methods": "numerical_methods",
  "business_finance": "business",
};

/** Algorithm category to PP domain */
const ALGO_CATEGORY_TO_DOMAIN: Record<string, PPDomain> = {
  "optimization": "optimization",
  "machine_learning": "machine_learning",
  "signal_processing": "signal_processing",
  "graph_algorithms": "algorithms",
  "manufacturing_physics": "manufacturing",
  "geometry_cad": "geometry_cad",
  "scheduling": "scheduling",
  "numerical_methods": "numerical_methods",
};

/** Manufacturing problem keywords to domains */
const PROBLEM_KEYWORDS: Record<string, PPDomain[]> = {
  "cutting": ["manufacturing", "optimization"],
  "force": ["manufacturing", "numerical_methods"],
  "speed": ["manufacturing", "optimization"],
  "feed": ["manufacturing", "optimization"],
  "tool": ["manufacturing", "optimization"],
  "chatter": ["manufacturing", "signal_processing", "control_systems"],
  "vibration": ["manufacturing", "signal_processing", "control_systems"],
  "thermal": ["manufacturing", "numerical_methods"],
  "wear": ["manufacturing", "machine_learning"],
  "surface": ["manufacturing", "geometry_cad"],
  "finish": ["manufacturing"],
  "toolpath": ["algorithms", "geometry_cad", "optimization"],
  "collision": ["geometry_cad", "algorithms"],
  "scheduling": ["scheduling", "optimization", "algorithms"],
  "cost": ["optimization", "business"],
  "quality": ["statistics", "manufacturing"],
  "spc": ["statistics", "manufacturing"],
  "control": ["control_systems", "manufacturing"],
  "pid": ["control_systems"],
  "neural": ["machine_learning"],
  "learn": ["machine_learning"],
  "predict": ["machine_learning", "statistics"],
  "optimize": ["optimization"],
  "mesh": ["geometry_cad"],
  "nurbs": ["geometry_cad"],
  "cad": ["geometry_cad"],
  "cam": ["geometry_cad", "manufacturing"],
  "post": ["software_engineering", "manufacturing"],
  "gcode": ["software_engineering", "manufacturing"],
};

// ============================================================================
// ENGINE
// ============================================================================

export class MITCourseIntegrationEngine {
  private courses: Map<string, MITCourse> = new Map();
  private algorithms: Map<string, AlgorithmEntry[]> = new Map();
  private algorithmsByEngine: Map<string, AlgorithmEntry[]> = new Map();
  private coursesByDomain: Map<PPDomain, MITCourse[]> = new Map();
  private initialized = false;

  // Configurable paths
  private readonly coursesRoot: string;

  constructor(coursesRoot?: string) {
    this.coursesRoot = coursesRoot || "H:/prism/resources/MIT COURSES";
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize the engine by loading course data from JSON files.
   * Safe to call multiple times (idempotent).
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadCourseIndex();
      await this.loadAlgorithmRegistry();
      this.buildDomainIndex();
      this.initialized = true;
      log.info(`[MITCourseIntegration] Initialized with ${this.courses.size} courses, ${this.getTotalAlgorithms()} algorithms`);
    } catch (err) {
      log.error("[MITCourseIntegration] Init failed:", err);
      // Initialize with empty data so engine is still usable
      this.initialized = true;
    }
  }

  /**
   * Ensure engine is initialized before operations.
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      // Synchronous load for simplicity - init() should be called at startup
      this.loadCourseIndexSync();
      this.loadAlgorithmRegistrySync();
      this.buildDomainIndex();
      this.initialized = true;
    }
  }

  // --------------------------------------------------------------------------
  // Core Methods (Required API)
  // --------------------------------------------------------------------------

  /**
   * List all courses, optionally filtered by domain.
   *
   * @param domain - Optional PP domain to filter by
   * @returns Array of courses
   */
  listCourses(domain?: PPDomain): MITCourse[] {
    this.ensureInitialized();

    if (domain) {
      return this.coursesByDomain.get(domain) || [];
    }

    return Array.from(this.courses.values());
  }

  /**
   * Get detailed information about a specific course.
   *
   * @param courseId - Course ID (e.g., "6.046J", "2.810")
   * @returns Course details or null if not found
   */
  getCourse(courseId: string): CourseDetails | null {
    this.ensureInitialized();

    const normalizedId = this.normalizeCourseId(courseId);
    const course = this.courses.get(normalizedId);

    if (!course) {
      // Try case-insensitive lookup
      for (const [id, c] of this.courses) {
        if (id.toLowerCase() === normalizedId.toLowerCase()) {
          return this.buildCourseDetails(c);
        }
      }
      return null;
    }

    return this.buildCourseDetails(course);
  }

  /**
   * Search courses by query string (matches against name, topics, description).
   *
   * @param query - Search query
   * @returns Search results with matching courses
   */
  searchCourses(query: string): CourseSearchResult {
    this.ensureInitialized();

    if (!query || query.trim().length === 0) {
      return {
        courses: [],
        query,
        matchCount: 0,
        domainBreakdown: {} as Record<PPDomain, number>,
      };
    }

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const matched: Array<{ course: MITCourse; score: number }> = [];

    for (const course of this.courses.values()) {
      let score = 0;

      // Match against name
      if (course.name.toLowerCase().includes(queryLower)) {
        score += 3;
      }

      // Match against ID
      if (course.id.toLowerCase().includes(queryLower)) {
        score += 2;
      }

      // Match against topics
      for (const topic of course.topics) {
        const topicLower = topic.toLowerCase();
        if (topicLower.includes(queryLower)) {
          score += 2;
        }
        for (const word of queryWords) {
          if (topicLower.includes(word)) {
            score += 0.5;
          }
        }
      }

      // Match against category
      if (course.category.toLowerCase().includes(queryLower)) {
        score += 1;
      }

      if (score > 0) {
        matched.push({ course, score });
      }
    }

    // Sort by score descending
    matched.sort((a, b) => b.score - a.score);

    const courses = matched.map(m => m.course);
    const domainBreakdown = this.countByDomain(courses);

    return {
      courses,
      query,
      matchCount: courses.length,
      domainBreakdown,
    };
  }

  /**
   * Extract algorithms from a specific course.
   *
   * @param courseId - Course ID
   * @returns Algorithm extraction result
   */
  getAlgorithmsFromCourse(courseId: string): AlgorithmExtraction {
    this.ensureInitialized();

    const normalizedId = this.normalizeCourseId(courseId);
    const algorithms = this.algorithms.get(normalizedId) || [];

    // Find course name
    let courseName = courseId;
    for (const course of this.courses.values()) {
      if (this.normalizeCourseId(course.id) === normalizedId) {
        courseName = course.name;
        break;
      }
    }

    const prismEngines = new Set<string>();
    const unmapped: string[] = [];

    for (const algo of algorithms) {
      if (algo.prismEngines && algo.prismEngines.length > 0) {
        for (const engine of algo.prismEngines) {
          prismEngines.add(engine);
        }
      } else {
        unmapped.push(algo.name);
      }
    }

    return {
      courseId: normalizedId,
      courseName,
      algorithms,
      totalAlgorithms: algorithms.length,
      prismEnginesMapped: prismEngines.size,
      unmappedAlgorithms: unmapped,
    };
  }

  /**
   * Apply course knowledge to a manufacturing problem.
   *
   * @param courseId - Course ID to draw knowledge from
   * @param problem - Manufacturing problem description
   * @returns Application result with theory-to-practice mapping
   */
  applyToManufacturing(courseId: string, problem: string): ManufacturingApplication {
    this.ensureInitialized();

    const normalizedId = this.normalizeCourseId(courseId);
    const course = this.getCourse(normalizedId);
    const algorithms = this.algorithms.get(normalizedId) || [];

    if (!course) {
      return {
        courseId,
        problem,
        applicableAlgorithms: [],
        prismEngines: [],
        theoryToPractice: `Course "${courseId}" not found in MIT OCW registry.`,
        confidence: 0,
        citations: [],
      };
    }

    // Find algorithms relevant to the problem
    const problemLower = problem.toLowerCase();
    const problemWords = problemLower.split(/\s+/).filter(w => w.length > 3);
    const applicableAlgos: AlgorithmEntry[] = [];

    for (const algo of algorithms) {
      const algoLower = algo.name.toLowerCase();
      const categoryLower = algo.category?.toLowerCase() || "";

      // Score relevance
      let relevant = false;
      if (problemLower.includes(algoLower)) relevant = true;
      if (algoLower.includes("force") && problemLower.includes("force")) relevant = true;
      if (algoLower.includes("thermal") && problemLower.includes("thermal")) relevant = true;
      if (algoLower.includes("wear") && problemLower.includes("wear")) relevant = true;

      for (const word of problemWords) {
        if (algoLower.includes(word) || categoryLower.includes(word)) {
          relevant = true;
          break;
        }
      }

      if (relevant) {
        applicableAlgos.push(algo);
      }
    }

    // If no specific matches, include top 5 algorithms from the course
    if (applicableAlgos.length === 0 && algorithms.length > 0) {
      applicableAlgos.push(...algorithms.slice(0, 5));
    }

    // Collect PRISM engines
    const prismEngines = new Set<string>();
    for (const algo of applicableAlgos) {
      for (const engine of algo.prismEngines || []) {
        prismEngines.add(engine);
      }
    }

    // Build theory-to-practice explanation
    const theoryToPractice = this.buildTheoryToPractice(course.course, problem, applicableAlgos);

    // Calculate confidence based on match quality
    const confidence = Math.min(0.95, 0.3 + (applicableAlgos.length * 0.1));

    return {
      courseId: normalizedId,
      problem,
      applicableAlgorithms: applicableAlgos,
      prismEngines: Array.from(prismEngines),
      theoryToPractice,
      confidence,
      citations: [this.buildCitation(course.course)],
    };
  }

  /**
   * Get course recommendations for a specific manufacturing problem.
   *
   * @param problem - Problem description
   * @returns Recommended courses with relevance scores
   */
  getCourseRecommendations(problem: string): CourseRecommendation {
    this.ensureInitialized();

    if (!problem || problem.trim().length === 0) {
      return {
        problem,
        recommendedCourses: [],
        domainFocus: [],
        totalMatches: 0,
      };
    }

    const problemLower = problem.toLowerCase();
    const problemWords = problemLower.split(/\s+/).filter(w => w.length > 3);

    // Identify relevant domains from keywords
    const relevantDomains = new Set<PPDomain>();
    for (const word of problemWords) {
      for (const [keyword, domains] of Object.entries(PROBLEM_KEYWORDS)) {
        if (word.includes(keyword) || keyword.includes(word)) {
          for (const domain of domains) {
            relevantDomains.add(domain);
          }
        }
      }
    }

    // If no domain matches, default to manufacturing + optimization
    if (relevantDomains.size === 0) {
      relevantDomains.add("manufacturing");
      relevantDomains.add("optimization");
    }

    // Score and rank courses
    const scored: Array<{
      course: MITCourse;
      score: number;
      matchedTopics: string[];
      algorithms: string[];
    }> = [];

    for (const course of this.courses.values()) {
      let score = 0;
      const matchedTopics: string[] = [];

      // Domain relevance
      if (relevantDomains.has(course.domain)) {
        score += 2;
      }

      // Topic matching
      for (const topic of course.topics) {
        const topicLower = topic.toLowerCase();
        if (problemLower.includes(topicLower)) {
          matchedTopics.push(topic);
          score += 2;
        }
        for (const word of problemWords) {
          if (topicLower.includes(word) && !matchedTopics.includes(topic)) {
            matchedTopics.push(topic);
            score += 0.5;
          }
        }
      }

      // Name matching
      if (course.name.toLowerCase().includes(problemLower.slice(0, 20))) {
        score += 1;
      }

      // Priority bonus
      if (course.priority === "TIER_1") score += 0.5;

      // Algorithm availability bonus
      const courseAlgos = this.algorithms.get(this.normalizeCourseId(course.id)) || [];
      if (courseAlgos.length > 0) {
        score += Math.min(2, courseAlgos.length * 0.2);
      }

      if (score > 0) {
        scored.push({
          course,
          score,
          matchedTopics,
          algorithms: courseAlgos.slice(0, 5).map(a => a.name),
        });
      }
    }

    // Sort by score descending and take top 10
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 10);

    const recommendedCourses = top.map(s => ({
      course: s.course,
      relevanceScore: Math.round(s.score * 100) / 100,
      matchedTopics: s.matchedTopics,
      applicableAlgorithms: s.algorithms,
      rationale: this.buildRationale(s.course, s.matchedTopics, problem),
    }));

    return {
      problem,
      recommendedCourses,
      domainFocus: Array.from(relevantDomains),
      totalMatches: scored.length,
    };
  }

  // --------------------------------------------------------------------------
  // Additional Methods
  // --------------------------------------------------------------------------

  /**
   * Get overall integration statistics.
   */
  getStats(): IntegrationStats {
    this.ensureInitialized();

    const byDomain: Record<PPDomain, number> = {} as Record<PPDomain, number>;
    const byTier: Record<CourseTier, number> = { TIER_1: 0, TIER_2: 0, TIER_3: 0 };
    let integrated = 0;
    let mapped = 0;
    let available = 0;
    let archived = 0;

    for (const course of this.courses.values()) {
      byDomain[course.domain] = (byDomain[course.domain] || 0) + 1;
      byTier[course.priority] = (byTier[course.priority] || 0) + 1;

      switch (course.integrationStatus) {
        case "integrated": integrated++; break;
        case "mapped": mapped++; break;
        case "available": available++; break;
        case "archived": archived++; break;
      }
    }

    const totalAlgorithms = this.getTotalAlgorithms();
    const totalEngines = this.getTotalPrismEngines();

    return {
      totalCourses: this.courses.size,
      integratedCourses: integrated,
      mappedCourses: mapped,
      availableCourses: available,
      archivedCourses: archived,
      totalAlgorithms,
      totalPrismEngines: totalEngines,
      coveragePercent: this.courses.size > 0
        ? Math.round((integrated + mapped) / this.courses.size * 1000) / 10
        : 0,
      byDomain,
      byTier,
    };
  }

  /**
   * Get courses by priority tier.
   */
  getCoursesByTier(tier: CourseTier): MITCourse[] {
    this.ensureInitialized();
    return Array.from(this.courses.values()).filter(c => c.priority === tier);
  }

  /**
   * Get algorithms mapped to a specific PRISM engine.
   */
  getAlgorithmsForEngine(engineName: string): AlgorithmEntry[] {
    this.ensureInitialized();
    return this.algorithmsByEngine.get(engineName) || [];
  }

  /**
   * Get all available domains with course counts.
   */
  getDomains(): Array<{ domain: PPDomain; count: number }> {
    this.ensureInitialized();

    return Array.from(this.coursesByDomain.entries())
      .map(([domain, courses]) => ({ domain, count: courses.length }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get PRISM engine mapping for a course.
   */
  getPrismMapping(courseId: string): string[] {
    this.ensureInitialized();

    const normalizedId = this.normalizeCourseId(courseId);
    const algorithms = this.algorithms.get(normalizedId) || [];
    const engines = new Set<string>();

    for (const algo of algorithms) {
      for (const engine of algo.prismEngines || []) {
        engines.add(engine);
      }
    }

    return Array.from(engines);
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private async loadCourseIndex(): Promise<void> {
    this.loadCourseIndexSync();
  }

  private loadCourseIndexSync(): void {
    const indexPath = path.join(this.coursesRoot, "MIT_COURSE_INDEX.json");

    if (!existsSync(indexPath)) {
      log.warn(`[MITCourseIntegration] Course index not found at ${indexPath}`);
      return;
    }

    try {
      const raw = readFileSync(indexPath, "utf-8");
      const data = JSON.parse(raw);

      // Parse courses by category
      for (const [category, catData] of Object.entries(data.coursesByCategory || {})) {
        const categoryInfo = catData as {
          priority: string;
          description?: string;
          courses: Array<{
            id: string;
            name: string;
            file?: string;
            extracted?: boolean;
            topics: string[];
          }>;
        };

        const domain = CATEGORY_TO_DOMAIN[category] || "other";
        const priority = categoryInfo.priority as CourseTier || "TIER_3";

        for (const courseData of categoryInfo.courses || []) {
          const course: MITCourse = {
            id: courseData.id,
            name: courseData.name,
            file: courseData.file,
            extracted: courseData.extracted,
            topics: courseData.topics || [],
            category,
            priority,
            description: categoryInfo.description,
            domain,
            integrationStatus: this.determineIntegrationStatus(courseData),
          };

          this.courses.set(this.normalizeCourseId(course.id), course);
        }
      }

      log.debug(`[MITCourseIntegration] Loaded ${this.courses.size} courses from index`);
    } catch (err) {
      log.error("[MITCourseIntegration] Failed to parse course index:", err);
    }
  }

  private async loadAlgorithmRegistry(): Promise<void> {
    this.loadAlgorithmRegistrySync();
  }

  private loadAlgorithmRegistrySync(): void {
    const registryPath = path.join(this.coursesRoot, "ALGORITHM_REGISTRY.json");

    if (!existsSync(registryPath)) {
      log.warn(`[MITCourseIntegration] Algorithm registry not found at ${registryPath}`);
      return;
    }

    try {
      const raw = readFileSync(registryPath, "utf-8");
      const data = JSON.parse(raw);

      // Parse algorithms recursively
      const parseAlgorithms = (obj: unknown, category: string, subcategory?: string): void => {
        if (!obj || typeof obj !== "object") return;

        if (Array.isArray(obj)) {
          // Array of algorithm entries
          for (const algo of obj) {
            if (algo.name && algo.course) {
              const entry: AlgorithmEntry = {
                name: algo.name,
                course: algo.course,
                prismEngines: algo.prismEngines || [],
                category,
                subcategory,
              };

              const courseId = this.normalizeCourseId(algo.course);
              const existing = this.algorithms.get(courseId) || [];
              existing.push(entry);
              this.algorithms.set(courseId, existing);

              // Index by engine
              for (const engine of entry.prismEngines) {
                const engineAlgos = this.algorithmsByEngine.get(engine) || [];
                engineAlgos.push(entry);
                this.algorithmsByEngine.set(engine, engineAlgos);
              }
            }
          }
        } else {
          const record = obj as Record<string, unknown>;

          // Check for "algorithms" key
          if (record.algorithms && Array.isArray(record.algorithms)) {
            parseAlgorithms(record.algorithms, category, subcategory);
          }

          // Recurse into nested objects
          for (const [key, value] of Object.entries(record)) {
            if (key !== "algorithms" && typeof value === "object") {
              parseAlgorithms(value, category, key);
            }
          }
        }
      };

      for (const [category, categoryData] of Object.entries(data.categories || {})) {
        parseAlgorithms(categoryData, category);
      }

      log.debug(`[MITCourseIntegration] Loaded algorithms for ${this.algorithms.size} courses`);
    } catch (err) {
      log.error("[MITCourseIntegration] Failed to parse algorithm registry:", err);
    }
  }

  private buildDomainIndex(): void {
    this.coursesByDomain.clear();

    for (const course of this.courses.values()) {
      const existing = this.coursesByDomain.get(course.domain) || [];
      existing.push(course);
      this.coursesByDomain.set(course.domain, existing);
    }
  }

  private normalizeCourseId(id: string): string {
    // Handle variations like "6.046J", "6.046j", "6.046"
    return id.toUpperCase().replace(/J$/, "J");
  }

  private determineIntegrationStatus(courseData: { id: string; extracted?: boolean; file?: string }): IntegrationStatus {
    // Courses we know are integrated into PRISM engines
    const integratedCourses = new Set([
      "2.810", "2.003", "2.830", "6.046J", "6.867", "6.079", "15.083J", "2.032", "6.837"
    ]);

    const normalizedId = this.normalizeCourseId(courseData.id);

    if (integratedCourses.has(normalizedId)) {
      return "integrated";
    }

    // Courses with algorithms mapped to PRISM engines
    const hasAlgorithms = this.algorithms.has(normalizedId);
    if (hasAlgorithms) {
      return "mapped";
    }

    // Extracted courses are available for processing
    if (courseData.extracted) {
      return "available";
    }

    // Zip-only courses are archived
    if (courseData.file?.endsWith(".zip")) {
      return "archived";
    }

    return "available";
  }

  private buildCourseDetails(course: MITCourse): CourseDetails {
    const normalizedId = this.normalizeCourseId(course.id);
    const algorithms = this.algorithms.get(normalizedId) || [];

    // Find related courses (same domain or overlapping topics)
    const relatedCourses: string[] = [];
    for (const other of this.courses.values()) {
      if (other.id !== course.id) {
        if (other.domain === course.domain) {
          relatedCourses.push(other.id);
        } else {
          // Check topic overlap
          const overlap = course.topics.filter(t =>
            other.topics.some(ot => ot.toLowerCase().includes(t.toLowerCase()) ||
              t.toLowerCase().includes(ot.toLowerCase()))
          );
          if (overlap.length >= 2) {
            relatedCourses.push(other.id);
          }
        }
      }
    }

    // Calculate manufacturing relevance
    const manufacturingKeywords = ["cutting", "machining", "tool", "force", "surface", "wear", "cnc", "cam"];
    let mfgScore = 0;
    for (const topic of course.topics) {
      for (const keyword of manufacturingKeywords) {
        if (topic.toLowerCase().includes(keyword)) {
          mfgScore += 0.15;
        }
      }
    }
    if (course.domain === "manufacturing") mfgScore += 0.3;
    const manufacturingRelevance = Math.min(1, mfgScore);

    // Collect PRISM engines
    const prismEngines = new Set<string>();
    for (const algo of algorithms) {
      for (const engine of algo.prismEngines || []) {
        prismEngines.add(engine);
      }
    }

    return {
      course,
      algorithms,
      relatedCourses: relatedCourses.slice(0, 10),
      prismEngineCount: prismEngines.size,
      manufacturingRelevance: Math.round(manufacturingRelevance * 100) / 100,
      topicsKeywords: course.topics,
    };
  }

  private buildTheoryToPractice(course: MITCourse, problem: string, algorithms: AlgorithmEntry[]): string {
    const algoNames = algorithms.slice(0, 3).map(a => a.name).join(", ") || "general principles";
    const topicList = course.topics.slice(0, 4).join(", ");

    const lines = [
      `THEORY (MIT ${course.id}: ${course.name})`,
      `Core topics: ${topicList}`,
      `Applicable algorithms: ${algoNames}`,
      "",
      `SHOP FLOOR PROBLEM: "${problem}"`,
      "",
      `APPLICATION:`,
      `1. The ${course.id} curriculum provides theoretical foundation for this problem type`,
      `2. Apply ${algorithms[0]?.name || "academic methods"} to compute governing quantities`,
      `3. Use PRISM engines for production-quality computation:`,
    ];

    for (const algo of algorithms.slice(0, 3)) {
      if (algo.prismEngines && algo.prismEngines.length > 0) {
        lines.push(`   - ${algo.name} → ${algo.prismEngines[0]}`);
      }
    }

    lines.push("4. Validate against machine limits and material constraints");
    lines.push("5. Log results with confidence and source attribution");

    return lines.join("\n");
  }

  private buildRationale(course: MITCourse, matchedTopics: string[], problem: string): string {
    if (matchedTopics.length === 0) {
      return `${course.name} provides foundational knowledge in ${course.domain} applicable to this problem type.`;
    }

    return `${course.name} covers ${matchedTopics.slice(0, 3).join(", ")} which directly relates to "${problem.slice(0, 50)}..."`;
  }

  private buildCitation(course: MITCourse): string {
    const slug = course.file?.replace(".zip", "") ||
      `${course.id.toLowerCase().replace(".", "-")}-course`;
    return `MIT OpenCourseWare: ${course.id} - ${course.name}. https://ocw.mit.edu/courses/${slug}/`;
  }

  private getTotalAlgorithms(): number {
    let total = 0;
    for (const algos of this.algorithms.values()) {
      total += algos.length;
    }
    return total;
  }

  private getTotalPrismEngines(): number {
    return this.algorithmsByEngine.size;
  }

  private countByDomain(courses: MITCourse[]): Record<PPDomain, number> {
    const counts: Record<PPDomain, number> = {} as Record<PPDomain, number>;
    for (const course of courses) {
      counts[course.domain] = (counts[course.domain] || 0) + 1;
    }
    return counts;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const mitCourseIntegrationEngine = new MITCourseIntegrationEngine();
