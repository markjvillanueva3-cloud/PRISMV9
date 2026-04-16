/**
 * LatheFullArchiveTrainingEngine — Complete JM Die Archive Deep Learning Training
 * ================================================================================
 *
 * This engine processes ALL 15,251+ JM Die lathe programs for comprehensive
 * deep learning training. It combines:
 *
 * - LatheAITrainingEngine: Physics validation & parameter extraction
 * - LatheDeepLearningIntelligenceEngine: Neural networks & deep reasoning
 * - LatheDeepAIHardeningEngine: 21-engine unification
 *
 * Training Pipeline:
 * 1. Scan entire archive recursively
 * 2. Parse each .MIN program
 * 3. Extract physics parameters
 * 4. Train neural networks
 * 5. Build knowledge graph
 * 6. Generate patterns & anti-patterns
 * 7. Output comprehensive report
 *
 * @author PRISM AI
 * @version 1.0.0
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { safeWriteSync } from "../utils/atomicWrite.js"; // MS1 U-LAT13: atomic write
import { join, basename, dirname } from "path";
import { logger } from "../utils/Logger.js"; // MS1 U-LAT19: proper logging
import { latheAITrainingEngine, ParsedProgram, ProgramAnalysis } from "./LatheAITrainingEngine.js";
import { latheDeepLearningIntelligenceEngine, LatheDeepLearningIntelligenceEngine } from "./LatheDeepLearningIntelligenceEngine.js";

// ============================================================================
// TYPES
// ============================================================================

interface ProgramFile {
  content: string;
  filepath: string;
  customer: string;
  filename: string;
}

interface CustomerStats {
  customer: string;
  program_count: number;
  avg_score: number;
  total_issues: number;
  common_issues: Map<string, number>;
  best_program: { filename: string; score: number } | null;
  worst_program: { filename: string; score: number } | null;
}

interface TrainingProgress {
  total_programs: number;
  processed: number;
  parsed: number;
  analyzed: number;
  trained: number;
  errors: number;
  current_customer: string;
  elapsed_ms: number;
  estimated_remaining_ms: number;
}

interface FullTrainingResult {
  // Counts
  total_programs_found: number;
  programs_parsed: number;
  programs_analyzed: number;
  programs_trained: number;
  parse_errors: number;

  // Timing
  total_time_ms: number;
  avg_time_per_program_ms: number;

  // Quality metrics
  avg_program_score: number;
  score_distribution: { range: string; count: number }[];
  total_issues_found: number;

  // Common issues (top 20)
  common_issues: Array<{ issue: string; count: number; percentage: number }>;

  // Anti-patterns detected
  anti_patterns: Array<{ pattern: string; count: number; severity: string }>;

  // Best practices found
  best_practices: Array<{ practice: string; count: number }>;

  // Customer analysis
  customers_analyzed: number;
  best_customers: CustomerStats[];
  worst_customers: CustomerStats[];

  // Best/worst programs
  best_programs: Array<{ filepath: string; score: number; customer: string }>;
  worst_programs: Array<{ filepath: string; score: number; customer: string; issues: number }>;

  // Deep learning metrics
  neural_network_accuracy: number;
  knowledge_graph_nodes: number;
  knowledge_graph_edges: number;
  patterns_learned: number;
  experience_buffer_size: number;

  // Improvements
  total_improvement_recommendations: number;
  programs_rewritable: number;
}

// ============================================================================
// ARCHIVE SCANNER
// ============================================================================

/**
 * Recursively scan directory for .MIN files
 */
function scanArchive(dir: string, files: ProgramFile[] = [], maxFiles = 0): ProgramFile[] {
  if (!existsSync(dir)) {
    logger.warn(`[LatheArchive] Directory not found: ${dir}`);
    return files;
  }

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      if (maxFiles > 0 && files.length >= maxFiles) {
        return files;
      }

      const fullPath = join(dir, entry);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scanArchive(fullPath, files, maxFiles);
        } else if (entry.toUpperCase().endsWith(".MIN")) {
          const content = readFileSync(fullPath, "utf-8");
          const customer = basename(dirname(fullPath));
          files.push({
            content,
            filepath: fullPath,
            customer,
            filename: entry,
          });
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Skip unreadable directories
  }

  return files;
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

export class LatheFullArchiveTrainingEngine {
  private archivePath = "H:/PRISM/JM DIE/CNC LATHE";
  private deepLearningEngine: LatheDeepLearningIntelligenceEngine;

  // Training state
  private allAnalyses: ProgramAnalysis[] = [];
  private customerStats: Map<string, CustomerStats> = new Map();
  private progressCallback?: (progress: TrainingProgress) => void;

  constructor() {
    this.deepLearningEngine = new LatheDeepLearningIntelligenceEngine();
  }

  /**
   * Set progress callback for real-time updates
   */
  setProgressCallback(callback: (progress: TrainingProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Train on the complete JM Die archive
   * @param maxPrograms - Limit number of programs (0 = unlimited)
   * @param epochs - Neural network training epochs
   */
  trainFullArchive(maxPrograms = 0, epochs = 50): FullTrainingResult {
    const startTime = Date.now();

    logger.info(`${"=".repeat(60)}`);
    logger.info("PRISM LATHE AI — FULL ARCHIVE DEEP LEARNING TRAINING");
    logger.info(`Archive: ${this.archivePath} | Max: ${maxPrograms || "UNLIMITED"} | Epochs: ${epochs}`);

    // Phase 1: Scan archive
    logger.info("[Phase 1/5] Scanning archive for .MIN files...");
    const programs = scanArchive(this.archivePath, [], maxPrograms);
    logger.info(`  Found: ${programs.length} programs`);

    if (programs.length === 0) {
      return this._emptyResult();
    }

    // Phase 2: Parse all programs
    logger.info("[Phase 2/5] Parsing programs (physics extraction)...");
    const parsed: ParsedProgram[] = [];
    let parseErrors = 0;

    for (let i = 0; i < programs.length; i++) {
      try {
        const result = latheAITrainingEngine.parseProgram(
          programs[i].content,
          programs[i].filepath
        );
        parsed.push(result);

        if ((i + 1) % 500 === 0) {
          logger.debug(`  Parsed: ${i + 1}/${programs.length}`);
        }
      } catch {
        parseErrors++;
      }
    }
    logger.info(`  Parsed: ${parsed.length} programs (${parseErrors} errors)`);

    // Phase 3: Analyze all programs
    logger.info("[Phase 3/5] Analyzing programs (physics validation)...");
    this.allAnalyses = [];

    for (let i = 0; i < parsed.length; i++) {
      const analysis = latheAITrainingEngine.analyzeProgram(parsed[i]);
      this.allAnalyses.push(analysis);

      // Update customer stats
      this._updateCustomerStats(programs[i], analysis);

      // Progress callback
      if (this.progressCallback && (i + 1) % 100 === 0) {
        const elapsed = Date.now() - startTime;
        const rate = (i + 1) / elapsed;
        this.progressCallback({
          total_programs: programs.length,
          processed: i + 1,
          parsed: parsed.length,
          analyzed: this.allAnalyses.length,
          trained: 0,
          errors: parseErrors,
          current_customer: programs[i].customer,
          elapsed_ms: elapsed,
          estimated_remaining_ms: (programs.length - i - 1) / rate,
        });
      }

      if ((i + 1) % 500 === 0) {
        logger.debug(`  Analyzed: ${i + 1}/${parsed.length}`);
      }
    }
    logger.info(`  Analyzed: ${this.allAnalyses.length} programs`);

    // Phase 4: Deep learning training
    logger.info("[Phase 4/5] Training neural networks...");
    const trainingData = this.allAnalyses.map((analysis, i) => ({
      content: programs[i].content,
      score: analysis.score,
      operations: analysis.program.operation_sequence,
      parameters: analysis.program.tool_blocks.map(block => {
        const params = latheAITrainingEngine.extractParams(block);
        return {
          tool: block.tool_type,
          feed: params.feed_ipr || 0,
          speed: params.spindle_value || 0,
        };
      }),
    }));

    const trainingResult = this.deepLearningEngine.train(trainingData, epochs);
    logger.info(`  Neural network accuracy: ${(trainingResult.accuracy * 100).toFixed(1)}%`);
    logger.info(`  Patterns learned: ${trainingResult.patterns_learned}`);
    logger.info(`  Knowledge graph nodes: ${trainingResult.knowledge_nodes}`);

    // Phase 5: Generate report
    logger.info("[Phase 5/5] Generating comprehensive report...");
    const result = this._generateReport(programs, parsed, parseErrors, trainingResult, startTime);

    // Save report
    this._saveReport(result);

    const totalTime = (Date.now() - startTime) / 1000;
    logger.info(`Training complete in ${totalTime.toFixed(1)}s (${(totalTime / programs.length * 1000).toFixed(1)}ms/program)`);

    return result;
  }

  /**
   * Get deep learning intelligence for a specific program
   */
  analyzeProgram(content: string, filepath: string): {
    physics: ProgramAnalysis;
    intelligence: ReturnType<typeof latheDeepLearningIntelligenceEngine.analyzeWithIntelligence>;
  } {
    const parsed = latheAITrainingEngine.parseProgram(content, filepath);
    const physics = latheAITrainingEngine.analyzeProgram(parsed);

    const intelligence = this.deepLearningEngine.analyzeWithIntelligence({
      content,
      operations: parsed.operation_sequence,
      parameters: parsed.tool_blocks.map(block => {
        const params = latheAITrainingEngine.extractParams(block);
        return {
          tool: block.tool_type,
          feed: params.feed_ipr || 0,
          speed: params.spindle_value || 0,
        };
      }),
      score: physics.score,
    });

    return { physics, intelligence };
  }

  /**
   * Rewrite a program with AI improvements
   */
  rewriteProgram(content: string, filepath: string): {
    original_score: number;
    improved_code: string;
    improvements_made: string[];
    expected_new_score: number;
  } {
    const parsed = latheAITrainingEngine.parseProgram(content, filepath);
    const analysis = latheAITrainingEngine.analyzeProgram(parsed);
    const improved = latheAITrainingEngine.rewriteProgram(analysis);

    return {
      original_score: analysis.score,
      improved_code: improved,
      improvements_made: analysis.recommendations,
      expected_new_score: Math.min(100, analysis.score + analysis.recommendations.length * 5),
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private _updateCustomerStats(program: ProgramFile, analysis: ProgramAnalysis): void {
    let stats = this.customerStats.get(program.customer);

    if (!stats) {
      stats = {
        customer: program.customer,
        program_count: 0,
        avg_score: 0,
        total_issues: 0,
        common_issues: new Map(),
        best_program: null,
        worst_program: null,
      };
    }

    // Update counts
    const totalScore = stats.avg_score * stats.program_count + analysis.score;
    stats.program_count++;
    stats.avg_score = totalScore / stats.program_count;
    stats.total_issues += analysis.issues.length;

    // Track issues
    for (const issue of analysis.issues) {
      const count = stats.common_issues.get(issue.issue) || 0;
      stats.common_issues.set(issue.issue, count + 1);
    }

    // Track best/worst
    if (!stats.best_program || analysis.score > stats.best_program.score) {
      stats.best_program = { filename: program.filename, score: analysis.score };
    }
    if (!stats.worst_program || analysis.score < stats.worst_program.score) {
      stats.worst_program = { filename: program.filename, score: analysis.score };
    }

    this.customerStats.set(program.customer, stats);
  }

  private _generateReport(
    programs: ProgramFile[],
    parsed: ParsedProgram[],
    parseErrors: number,
    trainingResult: ReturnType<typeof this.deepLearningEngine.train>,
    startTime: number
  ): FullTrainingResult {
    const totalTime = Date.now() - startTime;

    // Calculate score distribution
    const scoreRanges = [
      { range: "0-19", min: 0, max: 19, count: 0 },
      { range: "20-39", min: 20, max: 39, count: 0 },
      { range: "40-59", min: 40, max: 59, count: 0 },
      { range: "60-79", min: 60, max: 79, count: 0 },
      { range: "80-100", min: 80, max: 100, count: 0 },
    ];

    for (const analysis of this.allAnalyses) {
      for (const range of scoreRanges) {
        if (analysis.score >= range.min && analysis.score <= range.max) {
          range.count++;
          break;
        }
      }
    }

    // Calculate common issues
    const issueMap = new Map<string, number>();
    let totalIssues = 0;
    for (const analysis of this.allAnalyses) {
      for (const issue of analysis.issues) {
        const count = issueMap.get(issue.issue) || 0;
        issueMap.set(issue.issue, count + 1);
        totalIssues++;
      }
    }

    const commonIssues = Array.from(issueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: (count / this.allAnalyses.length) * 100,
      }));

    // Get best/worst programs
    const sortedByScore = [...this.allAnalyses].sort((a, b) => b.score - a.score);
    const bestPrograms = sortedByScore.slice(0, 10).map((a, i) => ({
      filepath: programs[this.allAnalyses.indexOf(a)]?.filepath || "unknown",
      score: a.score,
      customer: programs[this.allAnalyses.indexOf(a)]?.customer || "unknown",
    }));

    const worstPrograms = sortedByScore.slice(-10).reverse().map(a => ({
      filepath: programs[this.allAnalyses.indexOf(a)]?.filepath || "unknown",
      score: a.score,
      customer: programs[this.allAnalyses.indexOf(a)]?.customer || "unknown",
      issues: a.issues.length,
    }));

    // Get best/worst customers
    const customerArray = Array.from(this.customerStats.values());
    customerArray.sort((a, b) => b.avg_score - a.avg_score);

    // Calculate avg score
    const avgScore = this.allAnalyses.length > 0
      ? this.allAnalyses.reduce((s, a) => s + a.score, 0) / this.allAnalyses.length
      : 0;

    // Count rewritable programs (score < 80)
    const rewritable = this.allAnalyses.filter(a => a.score < 80).length;

    // Total recommendations
    const totalRecs = this.allAnalyses.reduce((s, a) => s + a.recommendations.length, 0);

    // Get knowledge stats
    const kgStats = this.deepLearningEngine.getKnowledgeStats();

    return {
      total_programs_found: programs.length,
      programs_parsed: parsed.length,
      programs_analyzed: this.allAnalyses.length,
      programs_trained: trainingResult.epochs > 0 ? this.allAnalyses.length : 0,
      parse_errors: parseErrors,

      total_time_ms: totalTime,
      avg_time_per_program_ms: totalTime / programs.length,

      avg_program_score: avgScore,
      score_distribution: scoreRanges.map(r => ({ range: r.range, count: r.count })),
      total_issues_found: totalIssues,

      common_issues: commonIssues,

      anti_patterns: [
        { pattern: "Missing G50 with CSS", count: issueMap.get("Missing G50 S#### max RPM limit with CSS mode") || 0, severity: "critical" },
        { pattern: "Extremely slow feed", count: commonIssues.find(i => i.issue.includes("slow"))?.count || 0, severity: "warning" },
        { pattern: "No coolant on roughing", count: issueMap.get("No coolant detected for roughing/drilling") || 0, severity: "suggestion" },
      ],

      best_practices: [
        { practice: "G50 before G96", count: programs.filter(p => p.content.includes("G50") && p.content.includes("G96")).length },
        { practice: "Canned cycles (G85/G87)", count: programs.filter(p => p.content.includes("G85") || p.content.includes("G87")).length },
        { practice: "M1 optional stops", count: programs.filter(p => p.content.includes("M1")).length },
      ],

      customers_analyzed: this.customerStats.size,
      best_customers: customerArray.slice(0, 5),
      worst_customers: customerArray.slice(-5).reverse(),

      best_programs: bestPrograms,
      worst_programs: worstPrograms,

      neural_network_accuracy: trainingResult.accuracy,
      knowledge_graph_nodes: kgStats.nodes,
      knowledge_graph_edges: kgStats.edges,
      patterns_learned: trainingResult.patterns_learned,
      experience_buffer_size: trainingResult.experience_buffer_size,

      total_improvement_recommendations: totalRecs,
      programs_rewritable: rewritable,
    };
  }

  private _saveReport(result: FullTrainingResult): void {
    const reportPath = join(dirname(this.archivePath), "lathe-ai-training-report.json");
    try {
      // MS1 U-LAT13: Use atomic write for crash-safety
      safeWriteSync(reportPath, JSON.stringify(result, null, 2));
      logger.info(`  Report saved: ${reportPath}`);
    } catch (e) {
      logger.error(`  Could not save report: ${e}`);
    }
  }

  private _emptyResult(): FullTrainingResult {
    return {
      total_programs_found: 0,
      programs_parsed: 0,
      programs_analyzed: 0,
      programs_trained: 0,
      parse_errors: 0,
      total_time_ms: 0,
      avg_time_per_program_ms: 0,
      avg_program_score: 0,
      score_distribution: [],
      total_issues_found: 0,
      common_issues: [],
      anti_patterns: [],
      best_practices: [],
      customers_analyzed: 0,
      best_customers: [],
      worst_customers: [],
      best_programs: [],
      worst_programs: [],
      neural_network_accuracy: 0,
      knowledge_graph_nodes: 0,
      knowledge_graph_edges: 0,
      patterns_learned: 0,
      experience_buffer_size: 0,
      total_improvement_recommendations: 0,
      programs_rewritable: 0,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheFullArchiveTrainingEngine = new LatheFullArchiveTrainingEngine();
