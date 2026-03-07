/**
 * ContextDigestEngine — Ultra-compact file/directory digests
 *
 * Generates structural summaries of files and directories that capture
 * the essential information in 10-20% of the original token cost.
 * Useful for context injection when you need awareness without detail.
 *
 * Token savings: 80-90% reduction vs reading full files.
 *
 * @version 1.0.0
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { log } from "../utils/Logger.js";

export interface FileDigest {
  path: string;
  lines: number;
  size: number;
  type: string;
  exports: string[];
  imports: number;
  classes: string[];
  functions: string[];
  interfaces: string[];
}

export interface DirectoryDigest {
  path: string;
  totalFiles: number;
  totalLines: number;
  byExtension: Record<string, number>;
  largestFiles: Array<{ name: string; lines: number }>;
  summary: string;
}

export class ContextDigestEngine {

  /**
   * Digest a TypeScript/JavaScript file into a compact summary.
   */
  digestFile(filePath: string): FileDigest | null {
    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const ext = extname(filePath);

      const exports: string[] = [];
      const classes: string[] = [];
      const functions: string[] = [];
      const interfaces: string[] = [];
      let imports = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("import ")) imports++;
        if (trimmed.startsWith("export ")) {
          // Extract export names
          const classMatch = trimmed.match(/export\s+class\s+(\w+)/);
          const funcMatch = trimmed.match(/export\s+(?:function|const|let)\s+(\w+)/);
          const ifaceMatch = trimmed.match(/export\s+interface\s+(\w+)/);
          const typeMatch = trimmed.match(/export\s+type\s+(\w+)/);

          if (classMatch) {
            classes.push(classMatch[1]);
            exports.push(classMatch[1]);
          } else if (funcMatch) {
            functions.push(funcMatch[1]);
            exports.push(funcMatch[1]);
          } else if (ifaceMatch) {
            interfaces.push(ifaceMatch[1]);
          } else if (typeMatch) {
            // skip type-only exports from summary
          } else {
            // Named export block like export { a, b }
            const namedMatch = trimmed.match(/export\s*\{([^}]+)\}/);
            if (namedMatch) {
              const names = namedMatch[1].split(",").map(n =>
                n.trim().split(/\s+as\s+/).pop()!.trim()
              );
              exports.push(...names);
            }
          }
        }

        // Non-exported classes/functions
        if (!trimmed.startsWith("export")) {
          const classMatch = trimmed.match(/^class\s+(\w+)/);
          const funcMatch = trimmed.match(/^(?:function|const|let)\s+(\w+)/);
          if (classMatch) classes.push(classMatch[1]);
          if (funcMatch && trimmed.includes("=") && trimmed.includes("=>")) {
            functions.push(funcMatch[1]);
          }
        }
      }

      return {
        path: filePath,
        lines: lines.length,
        size: content.length,
        type: ext,
        exports: exports.slice(0, 15),
        imports,
        classes,
        functions: functions.slice(0, 15),
        interfaces: interfaces.slice(0, 10),
      };
    } catch (e: any) {
      log.warn(`[ContextDigest] Failed to digest ${filePath}: ${e.message}`);
      return null;
    }
  }

  /**
   * Digest a directory into a compact summary.
   */
  digestDirectory(dirPath: string, maxDepth = 1): DirectoryDigest | null {
    if (!existsSync(dirPath)) return null;

    try {
      const byExtension: Record<string, number> = {};
      const fileInfos: Array<{ name: string; lines: number }> = [];
      let totalFiles = 0;
      let totalLines = 0;

      this.walkDir(dirPath, maxDepth, 0, (filePath) => {
        const ext = extname(filePath) || "no-ext";
        byExtension[ext] = (byExtension[ext] || 0) + 1;
        totalFiles++;

        try {
          const content = readFileSync(filePath, "utf-8");
          const lineCount = content.split("\n").length;
          totalLines += lineCount;
          fileInfos.push({ name: basename(filePath), lines: lineCount });
        } catch {
          // Skip unreadable files
        }
      });

      fileInfos.sort((a, b) => b.lines - a.lines);

      const topExt = Object.entries(byExtension)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([ext, count]) => `${count}${ext}`)
        .join(", ");

      return {
        path: dirPath,
        totalFiles,
        totalLines,
        byExtension,
        largestFiles: fileInfos.slice(0, 5),
        summary: `${totalFiles} files (${topExt}), ${totalLines} lines`,
      };
    } catch (e: any) {
      log.warn(`[ContextDigest] Failed to digest dir ${dirPath}: ${e.message}`);
      return null;
    }
  }

  /**
   * Generate a one-line digest of a file (for context headers).
   */
  oneLiner(filePath: string): string {
    const digest = this.digestFile(filePath);
    if (!digest) return `${basename(filePath)}: [not found]`;

    const parts = [
      `${basename(filePath)}`,
      `${digest.lines}L`,
    ];
    if (digest.classes.length) parts.push(`cls:${digest.classes.join(",")}`);
    if (digest.exports.length) parts.push(`exp:${digest.exports.length}`);
    return parts.join(" | ");
  }

  /**
   * Batch digest multiple files into a compact block.
   */
  batchDigest(filePaths: string[]): string {
    return filePaths
      .map(fp => this.oneLiner(fp))
      .join("\n");
  }

  // ── Private ──────────────────────────────────────────────────

  private walkDir(
    dir: string,
    maxDepth: number,
    currentDepth: number,
    callback: (filePath: string) => void
  ): void {
    if (currentDepth > maxDepth) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isFile()) {
          callback(fullPath);
        } else if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          this.walkDir(fullPath, maxDepth, currentDepth + 1, callback);
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }
}

export const contextDigestEngine = new ContextDigestEngine();
