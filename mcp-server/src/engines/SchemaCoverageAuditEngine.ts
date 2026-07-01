/**
 * SchemaCoverageAuditEngine — P8-U05
 *
 * Inventories `z.any()` usage and `.describe()` coverage across all
 * `mcp-server/src/schemas/*.ts` files. Pure file-scan, no schema imports
 * (avoids bootstrap cost + dynamic-import side effects).
 *
 * Output: state/shared/specs/SCHEMA-COVERAGE-AUDIT.json
 *
 * Dispatcher wire: prism_dev:schema_coverage_audit
 *
 * Sister to AutoSchemaGeneratorEngine (action-level schema gaps) — this engine
 * tracks z.any() escape-hatch usage + describe() metadata density, both feeding
 * P8-U01..U04 z.any() replacement sweep.
 *
 * WIRE-EXEMPT: none — wired in devDispatcher via lazy import.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { resolveRepoRoot } from "../utils/resolve-repo-root.js";

// Locate H:/prism (the project root) depth-independently. The old
// resolve(dirname(import.meta.url), "..","..","..") over-shot to the DRIVE ROOT
// under the esbuild dist/index.js bundle (import.meta.url = dist/index.js) -- the
// U-DISPATCHER-REPO-ROOT-FIX bug-class. resolveRepoRoot() walks to the .git+mcp-server marker.
const PROJECT_ROOT = resolveRepoRoot();
const SCHEMAS_DIR = path.join(PROJECT_ROOT, "mcp-server", "src", "schemas");
const OUT_FILE = path.join(PROJECT_ROOT, "state", "shared", "specs", "SCHEMA-COVERAGE-AUDIT.json");

export interface SchemaFileCoverage {
  file: string;
  bytes: number;
  zAnyCount: number;
  describeCount: number;
  schemaCount: number; // approximate: z.object( occurrences
}

export interface SchemaCoverageAuditResult {
  generated_at: string;
  scope: string;
  totalFiles: number;
  totalZAny: number;
  totalDescribe: number;
  totalSchemaCount: number;
  filesWithZAny: number;
  topZAnyFiles: SchemaFileCoverage[]; // top 20 by zAnyCount
  coverage: {
    describePerSchema: number;
    zAnyPerSchema: number;
    zAnyEliminationTarget: number;
  };
  per_file: SchemaFileCoverage[];
}

export class SchemaCoverageAuditEngine {
  audit(): SchemaCoverageAuditResult {
    const files: SchemaFileCoverage[] = [];
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(SCHEMAS_DIR, { withFileTypes: true });
    } catch {
      entries = [];
    }

    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(".ts")) continue;
      const full = path.join(SCHEMAS_DIR, e.name);
      let content = "";
      try { content = fs.readFileSync(full, "utf8"); } catch { continue; }
      const stat = fs.statSync(full);
      const zAnyCount = (content.match(/z\.any\(\)/g) || []).length;
      const describeCount = (content.match(/\.describe\(/g) || []).length;
      const schemaCount = (content.match(/z\.object\(/g) || []).length;
      files.push({
        file: e.name,
        bytes: stat.size,
        zAnyCount,
        describeCount,
        schemaCount,
      });
    }

    const totalZAny = files.reduce((s, f) => s + f.zAnyCount, 0);
    const totalDescribe = files.reduce((s, f) => s + f.describeCount, 0);
    const totalSchemaCount = files.reduce((s, f) => s + f.schemaCount, 0);
    const filesWithZAny = files.filter(f => f.zAnyCount > 0).length;

    const topZAnyFiles = [...files]
      .filter(f => f.zAnyCount > 0)
      .sort((a, b) => b.zAnyCount - a.zAnyCount)
      .slice(0, 20);

    const result: SchemaCoverageAuditResult = {
      generated_at: new Date().toISOString(),
      scope: "mcp-server/src/schemas/*.ts",
      totalFiles: files.length,
      totalZAny,
      totalDescribe,
      totalSchemaCount,
      filesWithZAny,
      topZAnyFiles,
      coverage: {
        describePerSchema: totalSchemaCount > 0 ? +(totalDescribe / totalSchemaCount).toFixed(3) : 0,
        zAnyPerSchema: totalSchemaCount > 0 ? +(totalZAny / totalSchemaCount).toFixed(3) : 0,
        zAnyEliminationTarget: totalZAny, // remaining work for P8-U02..U03
      },
      per_file: files.sort((a, b) => b.zAnyCount - a.zAnyCount),
    };

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2) + "\n");

    return result;
  }

  read(): SchemaCoverageAuditResult | null {
    try {
      return JSON.parse(fs.readFileSync(OUT_FILE, "utf8")) as SchemaCoverageAuditResult;
    } catch {
      return null;
    }
  }

  summary(): string {
    const r = this.read();
    if (!r) return "No schema coverage audit found. Run schema_coverage_audit first.";
    const lines = [
      `Schema Coverage Audit (P8-U05)`,
      `- Files scanned: ${r.totalFiles}`,
      `- z.any() instances: ${r.totalZAny} across ${r.filesWithZAny} files`,
      `- .describe() count: ${r.totalDescribe}`,
      `- z.object() count: ${r.totalSchemaCount}`,
      `- describe/schema ratio: ${r.coverage.describePerSchema}`,
      `- z.any/schema ratio: ${r.coverage.zAnyPerSchema}`,
      `- Top 5 z.any() offenders:`,
      ...r.topZAnyFiles.slice(0, 5).map(f => `    ${f.file}: ${f.zAnyCount}`),
    ];
    return lines.join("\n");
  }
}

export const schemaCoverageAuditEngine = new SchemaCoverageAuditEngine();
