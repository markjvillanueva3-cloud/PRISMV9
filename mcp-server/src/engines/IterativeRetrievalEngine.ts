/**
 * IterativeRetrievalEngine — Progressive context refinement for subagent dispatch.
 *
 * Pattern (4-phase loop, max 3 cycles):
 *   1. DISPATCH  — broad query produces candidate files
 *   2. EVALUATE  — score 0..1 by keyword density + path relevance; identify gaps
 *   3. REFINE    — extract discovered terms, exclude low-scorers, target gaps
 *   4. LOOP      — repeat until ≥targetCount items at ≥minRelevance with no gaps,
 *                  or maxCycles reached
 *
 * Adopted from `everything-claude-code/skills/iterative-retrieval` (MIT, 2026-04-27).
 *
 * @module IterativeRetrievalEngine
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import { PATHS } from "../constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type DispatchTarget =
  | "codebase" // src + __tests__
  | "engines_only" // src/engines
  | "skills_only" // .claude/commands + ~/.claude/commands
  | "knowledge_wiki" // knowledge/wiki
  | "dispatchers_only"; // src/tools/dispatchers

export interface RetrievalRequest {
  query: string;
  dispatch_target?: DispatchTarget;
  max_cycles?: number;
  target_count?: number;
  min_relevance?: number;
  initial_keywords?: string[];
  exclude_patterns?: string[];
  max_files_per_cycle?: number;
}

export interface ScoredFile {
  path: string;
  relevance: number;
  matched_keywords: string[];
  preview: string;
  size_bytes: number;
}

export interface CycleResult {
  cycle: number;
  keywords_used: string[];
  excludes_used: string[];
  files_scanned: number;
  files_kept: number;
  high_relevance_count: number;
  identified_gaps: string[];
  duration_ms: number;
}

export interface RetrievalResult {
  query: string;
  dispatch_target: DispatchTarget;
  cycles_run: number;
  terminated_early: boolean;
  termination_reason: string;
  total_files_scanned: number;
  high_relevance: ScoredFile[];
  candidates: ScoredFile[];
  cycles: CycleResult[];
  total_duration_ms: number;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

export const RetrievalRequestSchema = z.object({
  query: z.string().min(1).describe("Natural-language task or search intent"),
  dispatch_target: z
    .enum(["codebase", "engines_only", "skills_only", "knowledge_wiki", "dispatchers_only"])
    .optional()
    .describe("Where to search (default: codebase)"),
  max_cycles: z.number().int().min(1).max(5).optional().describe("Max refinement cycles (default 3)"),
  target_count: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Items at >=min_relevance needed for early termination (default 3)"),
  min_relevance: z.number().min(0).max(1).optional().describe("High-relevance threshold (default 0.7)"),
  initial_keywords: z.array(z.string()).max(20).optional().describe("Seed keywords"),
  exclude_patterns: z.array(z.string()).max(20).optional().describe("Path substrings to exclude"),
  max_files_per_cycle: z.number().int().min(10).max(500).optional().describe("Cap per cycle (default 100)"),
});

// ============================================================================
// STOPWORDS (kept compact — SOLID: extract only if 3rd consumer needs them)
// ============================================================================

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "will", "your",
  "are", "but", "not", "use", "any", "all", "into", "out", "via", "per", "new",
  "old", "set", "get", "add", "fix", "run", "let", "make", "need", "want", "find",
  "how", "why", "what", "when", "where", "which", "should", "must", "can", "may",
  "is", "of", "to", "in", "on", "by", "as", "at", "be", "or", "if", "an", "a",
  "do", "we", "it", "i", "ts", "js", "mjs", "md", "json", "src", "dist", "node",
]);

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Iterative retrieval with progressive context refinement.
 *
 * SRP: scoped to file-discovery loops. For semantic search use embeddings instead.
 */
export class IterativeRetrievalEngine {
  private readonly mcpRoot: string;
  private readonly projectRoot: string;

  constructor(mcpRoot?: string, projectRoot?: string) {
    this.mcpRoot = mcpRoot ?? PATHS.MCP_SERVER;
    this.projectRoot = projectRoot ?? PATHS.PRISM_ROOT;
  }

  /**
   * Run iterative retrieval. Throws on invalid input — never returns empty silently.
   *
   * @param request - validated retrieval request
   * @returns RetrievalResult with cycle breakdown and scored files
   */
  retrieve(request: RetrievalRequest): RetrievalResult {
    const parsed = RetrievalRequestSchema.parse(request);
    const target = parsed.dispatch_target ?? "codebase";
    const maxCycles = parsed.max_cycles ?? 3;
    const targetCount = parsed.target_count ?? 3;
    const minRelevance = parsed.min_relevance ?? 0.7;
    const maxPerCycle = parsed.max_files_per_cycle ?? 100;

    const startTime = Date.now();
    const searchRoot = this.resolveSearchRoot(target);
    if (!fs.existsSync(searchRoot)) {
      throw new Error(`IterativeRetrievalEngine: search root does not exist: ${searchRoot}`);
    }

    let keywords = this.deriveSeedKeywords(parsed.query, parsed.initial_keywords);
    const excludes = new Set(parsed.exclude_patterns ?? []);
    const seenPaths = new Set<string>();
    const allCandidates: ScoredFile[] = [];
    const cycles: CycleResult[] = [];
    let terminationReason = "max_cycles_reached";
    let terminatedEarly = false;

    for (let cycle = 1; cycle <= maxCycles; cycle++) {
      const cycleStart = Date.now();
      const dispatched = this.dispatch(searchRoot, keywords, [...excludes], maxPerCycle, seenPaths);
      const evaluated = this.evaluate(dispatched, keywords);

      // Merge new candidates (dedup by path)
      for (const file of evaluated) {
        seenPaths.add(file.path);
        const existingIdx = allCandidates.findIndex((c) => c.path === file.path);
        if (existingIdx >= 0) {
          // Keep highest relevance seen across cycles
          if (file.relevance > allCandidates[existingIdx].relevance) {
            allCandidates[existingIdx] = file;
          }
        } else {
          allCandidates.push(file);
        }
      }

      const highRelevance = allCandidates.filter((c) => c.relevance >= minRelevance);
      const gaps = this.identifyGaps(evaluated, parsed.query, keywords);

      cycles.push({
        cycle,
        keywords_used: [...keywords],
        excludes_used: [...excludes],
        files_scanned: dispatched.length,
        files_kept: evaluated.length,
        high_relevance_count: highRelevance.length,
        identified_gaps: gaps,
        duration_ms: Date.now() - cycleStart,
      });

      // Termination check
      if (highRelevance.length >= targetCount && gaps.length === 0) {
        terminatedEarly = true;
        terminationReason = `target_met:${highRelevance.length}>=${targetCount},no_gaps`;
        break;
      }

      // Refine keywords for next cycle
      if (cycle < maxCycles) {
        const refined = this.refine(evaluated, keywords, gaps);
        keywords = refined.keywords;
        for (const ex of refined.newExcludes) excludes.add(ex);
      }
    }

    const sorted = [...allCandidates].sort((a, b) => b.relevance - a.relevance);
    const highFinal = sorted.filter((c) => c.relevance >= minRelevance);

    log.info(
      `[IterativeRetrievalEngine] query="${parsed.query.slice(0, 60)}" cycles=${cycles.length} ` +
        `high=${highFinal.length} candidates=${sorted.length} ${Date.now() - startTime}ms`,
    );

    return {
      query: parsed.query,
      dispatch_target: target,
      cycles_run: cycles.length,
      terminated_early: terminatedEarly,
      termination_reason: terminationReason,
      total_files_scanned: cycles.reduce((sum, c) => sum + c.files_scanned, 0),
      high_relevance: highFinal,
      candidates: sorted,
      cycles,
      total_duration_ms: Date.now() - startTime,
    };
  }

  // ==========================================================================
  // PHASE 1: DISPATCH — broad file enumeration filtered by keywords
  // ==========================================================================

  private dispatch(
    root: string,
    keywords: string[],
    excludes: string[],
    maxFiles: number,
    seen: Set<string>,
  ): { path: string; content: string; size: number }[] {
    const results: { path: string; content: string; size: number }[] = [];
    const lowerKeywords = keywords.map((k) => k.toLowerCase()).filter((k) => k.length >= 2);
    const MAX_DEPTH = 12;
    const MAX_FILE_BYTES = 256 * 1024;

    const walk = (dir: string, depth: number): void => {
      if (depth > MAX_DEPTH || results.length >= maxFiles) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (results.length >= maxFiles) return;
        const full = path.join(dir, entry.name);
        if (excludes.some((ex) => full.includes(ex))) continue;
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
          walk(full, depth + 1);
          continue;
        }
        if (!entry.isFile()) continue;
        if (seen.has(full)) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (![".ts", ".mjs", ".js", ".md", ".json"].includes(ext)) continue;
        let content: string;
        let size: number;
        try {
          const stat = fs.statSync(full);
          if (stat.size > MAX_FILE_BYTES) continue;
          size = stat.size;
          content = fs.readFileSync(full, "utf-8");
        } catch {
          continue;
        }
        const lower = content.toLowerCase();
        const fileLower = entry.name.toLowerCase();
        // At least one keyword must hit content OR filename
        const hits = lowerKeywords.some((k) => lower.includes(k) || fileLower.includes(k));
        if (!hits) continue;
        results.push({ path: full, content, size });
      }
    };

    walk(root, 0);
    return results;
  }

  // ==========================================================================
  // PHASE 2: EVALUATE — score each file
  // ==========================================================================

  private evaluate(
    files: { path: string; content: string; size: number }[],
    keywords: string[],
  ): ScoredFile[] {
    const lowerKeywords = keywords.map((k) => k.toLowerCase()).filter((k) => k.length >= 2);
    if (lowerKeywords.length === 0) return [];

    const scored: ScoredFile[] = files.map((f) => {
      const lower = f.content.toLowerCase();
      const fileLower = path.basename(f.path).toLowerCase();
      const matched: string[] = [];
      let contentScore = 0;
      let pathScore = 0;

      for (const kw of lowerKeywords) {
        const contentMatches = this.countOccurrences(lower, kw);
        if (contentMatches > 0) {
          matched.push(kw);
          // Diminishing returns — log scale prevents single high-frequency term dominating
          contentScore += Math.log2(1 + contentMatches);
        }
        if (fileLower.includes(kw)) pathScore += 2.0;
      }

      const matchedRatio = matched.length / lowerKeywords.length;
      // Normalize content density (approx log2 saturates near 6 for high-frequency files)
      const normalizedContent = Math.min(1, contentScore / 8);
      const normalizedPath = Math.min(1, pathScore / 4);
      // Composite: matched-keyword-coverage is highest weight; density and filename are bonuses
      const relevance = Math.min(1, 0.6 * matchedRatio + 0.25 * normalizedContent + 0.15 * normalizedPath);

      return {
        path: this.relativeToProject(f.path),
        relevance: Number(relevance.toFixed(3)),
        matched_keywords: matched,
        preview: this.buildPreview(f.content, matched),
        size_bytes: f.size,
      };
    });

    // Drop zero-relevance
    return scored.filter((s) => s.relevance > 0).sort((a, b) => b.relevance - a.relevance);
  }

  // ==========================================================================
  // PHASE 3: REFINE — discover new keywords from top hits, exclude low scorers
  // ==========================================================================

  private refine(
    evaluated: ScoredFile[],
    currentKeywords: string[],
    gaps: string[],
  ): { keywords: string[]; newExcludes: string[] } {
    const top = evaluated.slice(0, 5);
    const tokenCounts = new Map<string, number>();

    for (const file of top) {
      // Extract words from filename + preview
      const text = `${path.basename(file.path)} ${file.preview}`;
      const tokens = text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 4 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
      for (const t of tokens) tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
    }

    const currentLower = new Set(currentKeywords.map((k) => k.toLowerCase()));
    const discovered = [...tokenCounts.entries()]
      .filter(([t]) => !currentLower.has(t))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    // Add gap keywords too
    const refined = [...currentKeywords, ...discovered, ...gaps].slice(0, 15);

    // Exclude very-low-relevance paths from next cycle
    const newExcludes = evaluated.filter((f) => f.relevance < 0.15).map((f) => f.path);

    return { keywords: refined, newExcludes };
  }

  // ==========================================================================
  // GAP DETECTION — what's missing?
  // ==========================================================================

  private identifyGaps(evaluated: ScoredFile[], query: string, keywords: string[]): string[] {
    const gaps: string[] = [];
    const queryTokens = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

    // Any query token that never appeared in matched_keywords across all evaluated files is a gap
    const allMatched = new Set<string>();
    for (const f of evaluated) for (const m of f.matched_keywords) allMatched.add(m);

    for (const tok of queryTokens) {
      if (!allMatched.has(tok) && !keywords.map((k) => k.toLowerCase()).includes(tok)) {
        gaps.push(tok);
      }
    }
    return gaps.slice(0, 5);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private deriveSeedKeywords(query: string, seed?: string[]): string[] {
    const fromQuery = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    const merged = [...(seed ?? []), ...fromQuery];
    // Dedup, preserve order
    return [...new Set(merged)].slice(0, 10);
  }

  private resolveSearchRoot(target: DispatchTarget): string {
    switch (target) {
      case "codebase":
        return path.join(this.mcpRoot, "src");
      case "engines_only":
        return path.join(this.mcpRoot, "src", "engines");
      case "dispatchers_only":
        return path.join(this.mcpRoot, "src", "tools", "dispatchers");
      case "skills_only":
        return path.join(this.projectRoot, ".claude", "commands");
      case "knowledge_wiki":
        return path.join(this.projectRoot, "knowledge", "wiki");
      default: {
        const _exhaustive: never = target;
        throw new Error(`Unknown dispatch_target: ${_exhaustive as string}`);
      }
    }
  }

  private countOccurrences(haystack: string, needle: string): number {
    if (needle.length === 0) return 0;
    let count = 0;
    let idx = 0;
    while ((idx = haystack.indexOf(needle, idx)) !== -1) {
      count++;
      idx += needle.length;
    }
    return count;
  }

  private buildPreview(content: string, matched: string[]): string {
    if (matched.length === 0) return content.slice(0, 200);
    const lower = content.toLowerCase();
    const firstHit = lower.indexOf(matched[0].toLowerCase());
    if (firstHit < 0) return content.slice(0, 200);
    const start = Math.max(0, firstHit - 80);
    return content.slice(start, start + 240).replace(/\s+/g, " ").trim();
  }

  private relativeToProject(absPath: string): string {
    if (absPath.startsWith(this.projectRoot)) {
      return absPath.slice(this.projectRoot.length + 1).replace(/\\/g, "/");
    }
    return absPath.replace(/\\/g, "/");
  }
}

// Singleton export — engines convention
export const iterativeRetrievalEngine = new IterativeRetrievalEngine();
