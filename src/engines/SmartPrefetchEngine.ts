/**
 * SmartPrefetchEngine - Predicts needed files from context
 *
 * Analyzes import graphs, recent file access patterns, and common
 * co-access patterns to predict which files should be read next.
 * Reduces round trips by suggesting batch reads.
 *
 * @version 1.0.0
 */

export interface PrefetchSuggestion {
  path: string;
  reason: string;
  confidence: number;
  estimatedTokens: number;
}

export interface AccessRecord {
  path: string;
  tool: string;
  timestamp: number;
}

export class SmartPrefetchEngine {
  private accessHistory: AccessRecord[] = [];
  private coAccessMap = new Map<string, Map<string, number>>();
  private importMap = new Map<string, string[]>();
  private maxHistory = 200;

  /**
   * Record a file access.
   */
  recordAccess(path: string, tool: string): void {
    const record = { path: this.normalize(path), tool, timestamp: Date.now() };
    this.accessHistory.push(record);

    // Update co-access patterns (files accessed within 30s of each other)
    const recent = this.accessHistory.filter(
      (r) => r.path !== record.path && Date.now() - r.timestamp < 30000,
    );
    for (const r of recent) {
      const coMap = this.coAccessMap.get(record.path) ?? new Map();
      coMap.set(r.path, (coMap.get(r.path) ?? 0) + 1);
      this.coAccessMap.set(record.path, coMap);
    }

    // Trim history
    if (this.accessHistory.length > this.maxHistory) {
      this.accessHistory = this.accessHistory.slice(-this.maxHistory);
    }
  }

  /**
   * Register imports from a file.
   */
  registerImports(filePath: string, imports: string[]): void {
    this.importMap.set(this.normalize(filePath), imports.map((i) => this.normalize(i)));
  }

  /**
   * Extract import paths from TypeScript content.
   */
  extractImports(content: string): string[] {
    const imports: string[] = [];
    const regex = /from\s+["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      if (m[1].startsWith(".")) {
        imports.push(m[1]);
      }
    }
    return imports;
  }

  /**
   * Suggest files to prefetch based on current context.
   */
  suggest(currentFile: string, maxSuggestions = 5): PrefetchSuggestion[] {
    const normalized = this.normalize(currentFile);
    const suggestions: PrefetchSuggestion[] = [];
    const already = new Set(this.accessHistory.map((r) => r.path));

    // 1. Import-based suggestions
    const imports = this.importMap.get(normalized) ?? [];
    for (const imp of imports) {
      if (!already.has(imp)) {
        suggestions.push({
          path: imp,
          reason: "imported by " + currentFile,
          confidence: 0.8,
          estimatedTokens: 500,
        });
      }
    }

    // 2. Co-access pattern suggestions
    const coMap = this.coAccessMap.get(normalized);
    if (coMap) {
      const sorted = Array.from(coMap.entries()).sort((a, b) => b[1] - a[1]);
      for (const [path, count] of sorted) {
        if (!already.has(path) && !suggestions.some((s) => s.path === path)) {
          suggestions.push({
            path,
            reason: "co-accessed " + count + " times",
            confidence: Math.min(0.9, 0.3 + count * 0.15),
            estimatedTokens: 500,
          });
        }
      }
    }

    // 3. Same-directory siblings
    const dir = normalized.substring(0, normalized.lastIndexOf("/") + 1);
    if (dir) {
      const siblings = Array.from(
        new Set(this.accessHistory.filter((r) => r.path.startsWith(dir) && r.path !== normalized).map((r) => r.path)),
      );
      for (const sib of siblings.slice(0, 3)) {
        if (!suggestions.some((s) => s.path === sib)) {
          suggestions.push({
            path: sib,
            reason: "same directory",
            confidence: 0.3,
            estimatedTokens: 500,
          });
        }
      }
    }

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);
  }

  /**
   * Get files that are frequently accessed together.
   */
  frequentPairs(): Array<{ a: string; b: string; count: number }> {
    const pairs: Array<{ a: string; b: string; count: number }> = [];
    for (const [file, coMap] of this.coAccessMap.entries()) {
      for (const [coFile, count] of coMap.entries()) {
        if (count >= 2) {
          pairs.push({ a: file, b: coFile, count });
        }
      }
    }
    return pairs.sort((a, b) => b.count - a.count).slice(0, 10);
  }

  /**
   * One-liner status.
   */
  oneLiner(): string {
    return (
      "Prefetch: " +
      this.accessHistory.length +
      " accesses, " +
      this.coAccessMap.size +
      " files tracked, " +
      this.importMap.size +
      " import maps"
    );
  }

  /**
   * Reset state.
   */
  reset(): void {
    this.accessHistory = [];
    this.coAccessMap.clear();
    this.importMap.clear();
  }

  private normalize(path: string): string {
    return path.replace(/\\/g, "/").replace(/\/+/g, "/");
  }
}

export const smartPrefetchEngine = new SmartPrefetchEngine();
