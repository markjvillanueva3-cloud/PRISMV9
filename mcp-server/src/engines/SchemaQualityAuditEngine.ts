/**
 * SchemaQualityAuditEngine — INTEL-OLLAMA-OBSIDIAN-MS0/P8-U05
 *
 * Single source of truth for schema-quality reporting:
 *   - z.any() residue (P8-U03 invariant: must stay 0 in target dirs)
 *   - .describe() coverage (P8-U04 phase 2 progress)
 *   - schema-vs-dispatcher drift (orphan schemas; dispatchers without a schema)
 *
 * Pure: walks the filesystem, returns a structured report. Caller chooses
 * how to surface (CLI, dispatcher, hook, dashboard).
 */

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, resolve, basename } from "node:path";

const SCHEMA_DIRS = [
  "mcp-server/src/schemas",
  "mcp-server/src/tools/schemas",
];
const DISPATCHER_DIR = "mcp-server/src/tools/dispatchers";

const Z_ANY_PATTERN = /\bz\.any\s*\(\s*\)/g;
const FIELD_LINE_PATTERN = /^(\s*)(?:["']?)([a-zA-Z_$][a-zA-Z0-9_$]*)(?:["']?)\s*:\s*(z\..*?)([,;]?)\s*$/;
const ACCEPTED_TYPE_PREFIX = /^z\.(string|number|boolean|enum|literal|array|record|union|date|null|undefined|nan|bigint|tuple|nullable|nativeEnum|coerce)\s*\(/;
const HAS_DESCRIBE = /\.describe\s*\(/;

export interface SchemaQualityReport {
  generated_at: string;
  z_any: {
    total: number;
    by_file: Array<{ file: string; count: number }>;
  };
  describe_coverage: {
    total_fields: number;
    with_describe: number;
    fixable_candidates: number;
    skipped_multiline_or_object: number;
    coverage_pct: number;
  };
  drift: {
    orphan_schemas: string[];          // schemas not imported by any dispatcher
    dispatchers_without_schema: string[]; // dispatchers with no matching schema file
  };
  summary: {
    healthy: boolean;
    blockers: string[];
  };
}

function listTsFiles(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return out;
    throw err;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) out = out.concat(listTsFiles(full));
    else if (s.isFile() && full.endsWith(".ts")) out.push(full);
  }
  return out;
}

function stripCommentsAndStrings(source: string): string {
  // Same parser used by audit-zany.mjs — keeps line offsets so reported counts
  // align with editor positions. Inlined here to keep the engine pure-TS without
  // a .mjs import dependency.
  const out: string[] = [];
  let i = 0;
  const n = source.length;
  let inLine = false;
  let inBlock = false;
  let inStr: string | null = null;
  while (i < n) {
    const ch = source[i];
    const nx = source[i + 1];
    if (inLine) {
      if (ch === "\n") { inLine = false; out.push("\n"); }
      else out.push(ch === "\t" ? "\t" : " ");
      i++;
      continue;
    }
    if (inBlock) {
      if (ch === "*" && nx === "/") { inBlock = false; out.push("  "); i += 2; }
      else { out.push(ch === "\n" ? "\n" : (ch === "\t" ? "\t" : " ")); i++; }
      continue;
    }
    if (inStr) {
      if (ch === "\\" && i + 1 < n) { out.push("  "); i += 2; continue; }
      if (ch === inStr) { inStr = null; out.push(" "); i++; continue; }
      out.push(ch === "\n" ? "\n" : (ch === "\t" ? "\t" : " "));
      i++;
      continue;
    }
    if (ch === "/" && nx === "/") { inLine = true; out.push("  "); i += 2; continue; }
    if (ch === "/" && nx === "*") { inBlock = true; out.push("  "); i += 2; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; out.push(" "); i++; continue; }
    out.push(ch);
    i++;
  }
  return out.join("");
}

function countZAnyInFile(absPath: string): number {
  const sanitized = stripCommentsAndStrings(readFileSync(absPath, "utf8"));
  const matches = sanitized.match(Z_ANY_PATTERN);
  return matches ? matches.length : 0;
}

interface FieldStats { total: number; withDescribe: number; fixable: number; skipped: number; }

function fieldStatsForFile(absPath: string): FieldStats {
  const src = readFileSync(absPath, "utf8");
  const lines = src.split(/\r?\n/);
  const stats: FieldStats = { total: 0, withDescribe: 0, fixable: 0, skipped: 0 };
  for (const line of lines) {
    if (!line.includes(": z.")) continue;
    const trimmed = line.replace(/^\s*/, "");
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    const m = FIELD_LINE_PATTERN.exec(line);
    if (!m) continue;
    const expr = m[3];
    stats.total++;
    if (HAS_DESCRIBE.test(expr)) {
      stats.withDescribe++;
    } else if (!ACCEPTED_TYPE_PREFIX.test(expr)) {
      stats.skipped++;
    } else {
      let depth = 0;
      for (const ch of expr) { if (ch === "(") depth++; else if (ch === ")") depth--; }
      if (depth !== 0) stats.skipped++;
      else stats.fixable++;
    }
  }
  return stats;
}

function detectDrift(repoRoot: string, schemaFiles: string[], dispatcherFiles: string[]): SchemaQualityReport["drift"] {
  // Read all dispatcher source once.
  const dispatcherSrc = dispatcherFiles
    .map(f => ({ file: f, body: readFileSync(f, "utf8") }))
    .filter(d => d.body.length > 0);

  const orphanSchemas: string[] = [];
  for (const sf of schemaFiles) {
    const stem = basename(sf).replace(/\.ts$/, "");
    const referenced = dispatcherSrc.some(d => d.body.includes(stem));
    if (!referenced) orphanSchemas.push(relative(repoRoot, sf).replace(/\\/g, "/"));
  }

  const dispatchersWithoutSchema: string[] = [];
  for (const df of dispatcherFiles) {
    const stem = basename(df).replace(/\.ts$/, "");
    // Heuristic: dispatcher `fooDispatcher` typically pairs with `fooActionSchemas`.
    const expectedSchemaStem = stem.replace(/Dispatcher$/, "ActionSchemas");
    const found = schemaFiles.some(sf => basename(sf) === `${expectedSchemaStem}.ts`);
    if (!found) dispatchersWithoutSchema.push(relative(repoRoot, df).replace(/\\/g, "/"));
  }

  return { orphan_schemas: orphanSchemas, dispatchers_without_schema: dispatchersWithoutSchema };
}

export class SchemaQualityAuditEngine {
  audit(repoRootArg?: string): SchemaQualityReport {
    const repoRoot = repoRootArg ?? resolve(process.cwd());
    const schemaFiles = SCHEMA_DIRS.flatMap(d => listTsFiles(join(repoRoot, d)));
    const dispatcherFiles = listTsFiles(join(repoRoot, DISPATCHER_DIR));

    let zAnyTotal = 0;
    const zAnyByFile: Array<{ file: string; count: number }> = [];
    let total = 0, withD = 0, fixable = 0, skipped = 0;
    for (const f of schemaFiles) {
      const c = countZAnyInFile(f);
      if (c > 0) {
        zAnyTotal += c;
        zAnyByFile.push({ file: relative(repoRoot, f).replace(/\\/g, "/"), count: c });
      }
      const fs2 = fieldStatsForFile(f);
      total += fs2.total;
      withD += fs2.withDescribe;
      fixable += fs2.fixable;
      skipped += fs2.skipped;
    }
    zAnyByFile.sort((a, b) => b.count - a.count);

    const drift = detectDrift(repoRoot, schemaFiles, dispatcherFiles);

    const blockers: string[] = [];
    if (zAnyTotal > 0) blockers.push(`${zAnyTotal} z.any() residue across ${zAnyByFile.length} files (P8-U03 invariant violated)`);
    if (drift.orphan_schemas.length > 0) blockers.push(`${drift.orphan_schemas.length} orphan schema file(s) not referenced by any dispatcher`);

    const coveragePct = total > 0 ? Math.round((withD / total) * 1000) / 10 : 0;
    return {
      generated_at: new Date().toISOString(),
      z_any: { total: zAnyTotal, by_file: zAnyByFile.slice(0, 30) },
      describe_coverage: {
        total_fields: total,
        with_describe: withD,
        fixable_candidates: fixable,
        skipped_multiline_or_object: skipped,
        coverage_pct: coveragePct,
      },
      drift,
      summary: {
        healthy: zAnyTotal === 0 && drift.orphan_schemas.length === 0,
        blockers,
      },
    };
  }
}

export const schemaQualityAuditEngine = new SchemaQualityAuditEngine();
