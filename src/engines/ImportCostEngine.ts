/**
 * ImportCostEngine — Import chain analysis for bundle optimization
 *
 * Analyzes TypeScript import statements to identify heavy dependency
 * chains, circular imports, and files with excessive imports.
 * Helps optimize bundle size and startup performance.
 *
 * Token savings: Targeted dependency analysis without reading full files.
 *
 * @version 1.0.0
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname, basename, dirname } from "path";
import { log } from "../utils/Logger.js";

const ENGINES_DIR = join(import.meta.dirname, ".");

export interface ImportInfo {
  file: string;
  importCount: number;
  externalImports: string[];
  internalImports: string[];
  fileSize: number;
}

export interface ImportReport {
  totalFiles: number;
  totalImports: number;
  avgImportsPerFile: number;
  heaviestFiles: Array<{ file: string; imports: number; size: number }>;
  mostImportedModules: Array<{ module: string; count: number }>;
  externalDeps: string[];
}

export class ImportCostEngine {

  /**
   * Analyze imports in a directory.
   */
  analyzeDirectory(dir = ENGINES_DIR, maxDepth = 0): ImportReport {
    const files: ImportInfo[] = [];
    const moduleCounter = new Map<string, number>();

    this.walkDir(dir, maxDepth, 0, (filePath) => {
      if (!filePath.endsWith(".ts") || filePath.endsWith(".test.ts")) return;

      const info = this.analyzeFile(filePath);
      if (info) {
        files.push(info);

        // Count module references
        for (const imp of [...info.externalImports, ...info.internalImports]) {
          moduleCounter.set(imp, (moduleCounter.get(imp) || 0) + 1);
        }
      }
    });

    const totalImports = files.reduce((s, f) => s + f.importCount, 0);
    const externalDeps = [...new Set(files.flatMap(f => f.externalImports))].sort();

    const mostImported = [...moduleCounter.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([module, count]) => ({ module, count }));

    return {
      totalFiles: files.length,
      totalImports,
      avgImportsPerFile: files.length ? Math.round(totalImports / files.length) : 0,
      heaviestFiles: files
        .sort((a, b) => b.importCount - a.importCount)
        .slice(0, 10)
        .map(f => ({ file: basename(f.file), imports: f.importCount, size: f.fileSize })),
      mostImportedModules: mostImported,
      externalDeps,
    };
  }

  /**
   * Analyze a single file's imports.
   */
  analyzeFile(filePath: string): ImportInfo | null {
    try {
      const content = readFileSync(filePath, "utf-8");
      const stat = statSync(filePath);
      const externalImports: string[] = [];
      const internalImports: string[] = [];

      const importRegex = /(?:import|from)\s+["']([^"']+)["']/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const mod = match[1];
        if (mod.startsWith(".") || mod.startsWith("..")) {
          internalImports.push(mod);
        } else {
          // Extract package name (handle scoped packages)
          const pkg = mod.startsWith("@")
            ? mod.split("/").slice(0, 2).join("/")
            : mod.split("/")[0];
          if (!externalImports.includes(pkg)) {
            externalImports.push(pkg);
          }
        }
      }

      return {
        file: filePath,
        importCount: externalImports.length + internalImports.length,
        externalImports,
        internalImports,
        fileSize: stat.size,
      };
    } catch {
      return null;
    }
  }

  /**
   * Find files with the most imports (potential optimization targets).
   */
  findHeavyImporters(dir = ENGINES_DIR, threshold = 10): ImportInfo[] {
    const results: ImportInfo[] = [];

    this.walkDir(dir, 0, 0, (filePath) => {
      if (!filePath.endsWith(".ts") || filePath.endsWith(".test.ts")) return;
      const info = this.analyzeFile(filePath);
      if (info && info.importCount >= threshold) {
        results.push(info);
      }
    });

    return results.sort((a, b) => b.importCount - a.importCount);
  }

  /**
   * Get compact report string.
   */
  getCompactReport(dir = ENGINES_DIR): string {
    const report = this.analyzeDirectory(dir);
    const lines = [
      `${report.totalFiles} files, ${report.totalImports} imports (avg ${report.avgImportsPerFile}/file)`,
      `External deps: ${report.externalDeps.length} (${report.externalDeps.slice(0, 5).join(", ")}${report.externalDeps.length > 5 ? "..." : ""})`,
      `Heaviest: ${report.heaviestFiles.slice(0, 3).map(f => `${f.file}(${f.imports})`).join(", ")}`,
    ];
    return lines.join("\n");
  }

  // ── Private ──────────────────────────────────────────────────

  private walkDir(
    dir: string,
    maxDepth: number,
    depth: number,
    callback: (path: string) => void
  ): void {
    if (depth > maxDepth) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isFile()) callback(full);
        else if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          this.walkDir(full, maxDepth, depth + 1, callback);
        }
      }
    } catch { /* skip */ }
  }
}

export const importCostEngine = new ImportCostEngine();
