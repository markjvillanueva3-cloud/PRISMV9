// WIRE-EXEMPT: tests in __tests__/engines/mlCorpusU-LEARN-03.test.ts
/**
 * JMDieTrainingCorpusEngine — U-LEARN-03
 * ========================================
 *
 * Orchestrator that crawls the JM Die program archive (22,721+ files),
 * parses each file using the appropriate parser (MINFileParser, NCFileParser),
 * joins with run logs, and produces training examples via TrainingExampleAssembler.
 *
 * Target: 22,721 programs → 200k+ training examples in the feature store.
 *
 * File types handled:
 * - .MIN (Okuma lathe G-code) → MINFileParserEngine
 * - .NC (Haas/Fanuc G-code) → NCFileParserEngine
 * - .mcx-8/.mcam/.MCX → Skipped (binary CAM, needs Mastercam bridge)
 * - .log → OkumaRunLogParserEngine
 *
 * @module engines/JMDieTrainingCorpusEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-03
 */

import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { minFileParserEngine } from "./MINFileParserEngine.js";
import { ncFileParserEngine } from "./NCFileParserEngine.js";
import { okumaRunLogParserEngine } from "./OkumaRunLogParserEngine.js";
import {
  trainingExampleAssemblerEngine,
  type TrainingExample,
} from "./TrainingExampleAssemblerEngine.js";
import type { MINProgram } from "../schemas/minFileSchema.js";
import type { NCProgram } from "../schemas/ncFileSchema.js";
import type { RunLog } from "../schemas/runLogSchema.js";

// ── Schemas ────────────────────────────────────────────────────────────────

export const CorpusCrawlInputSchema = z.object({
  root_path: z.string().describe("Root path to JM DIE folder"),
  max_files: z.number().int().positive().max(100_000).default(50_000),
  file_types: z.array(z.enum([".MIN", ".NC", ".nc", ".log"])).default([".MIN", ".NC", ".nc"]),
  include_patterns: z.array(z.string()).default([]),
  exclude_patterns: z.array(z.string()).default(["BACKUP", "OLD", "ARCHIVE", "TEMP"]),
  parse_logs: z.boolean().default(true).describe("Also parse .log files for run metrics"),
}).describe("Input for corpus crawl");
export type CorpusCrawlInput = z.infer<typeof CorpusCrawlInputSchema>;

export const CorpusStatsSchema = z.object({
  files_found: z.number().int().nonnegative(),
  files_parsed: z.number().int().nonnegative(),
  files_skipped: z.number().int().nonnegative(),
  files_failed: z.number().int().nonnegative(),
  min_files: z.number().int().nonnegative(),
  nc_files: z.number().int().nonnegative(),
  log_files: z.number().int().nonnegative(),
  binary_skipped: z.number().int().nonnegative(),
  total_operations: z.number().int().nonnegative(),
  training_examples: z.number().int().nonnegative(),
  customers: z.array(z.string()),
  by_machine_type: z.record(z.string(), z.number().int()),
  by_operation_kind: z.record(z.string(), z.number().int()),
  parse_time_ms: z.number().nonnegative(),
}).describe("Corpus processing statistics");
export type CorpusStats = z.infer<typeof CorpusStatsSchema>;

// ── File discovery ─────────────────────────────────────────────────────────

interface FoundFile {
  path: string;
  type: ".MIN" | ".NC" | ".nc" | ".log" | ".mcx-8" | ".mcam" | ".MCX" | "other";
  size: number;
}

/**
 * Recursively find all program files under a directory.
 */
function discoverFiles(
  rootPath: string,
  maxFiles: number,
  excludePatterns: string[]
): FoundFile[] {
  const files: FoundFile[] = [];
  const excludeUpper = excludePatterns.map(p => p.toUpperCase());

  function walk(dir: string): void {
    if (files.length >= maxFiles) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // Skip inaccessible directories
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      const fullPath = path.join(dir, entry.name);
      const nameUpper = entry.name.toUpperCase();

      // Skip excluded patterns
      if (excludeUpper.some(p => nameUpper.includes(p))) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const extUpper = ext.toUpperCase();

        let fileType: FoundFile["type"] = "other";
        if (extUpper === ".MIN") fileType = ".MIN";
        else if (extUpper === ".NC") fileType = ".NC";
        else if (ext === ".nc") fileType = ".nc";
        else if (extUpper === ".LOG") fileType = ".log";
        else if (extUpper === ".MCX-8") fileType = ".mcx-8";
        else if (extUpper === ".MCAM") fileType = ".mcam";
        else if (extUpper === ".MCX") fileType = ".MCX";

        if (fileType !== "other") {
          try {
            const stat = fs.statSync(fullPath);
            files.push({ path: fullPath, type: fileType, size: stat.size });
          } catch {
            // Skip files we can't stat
          }
        }
      }
    }
  }

  walk(rootPath);
  return files;
}

// ── Main engine ────────────────────────────────────────────────────────────

export interface CorpusCrawlResult {
  examples: TrainingExample[];
  stats: CorpusStats;
  warnings: string[];
  parsed_programs: {
    min: MINProgram[];
    nc: NCProgram[];
  };
  run_logs: RunLog[];
}

export class JMDieTrainingCorpusEngine {
  /**
   * Crawl the JM Die archive and produce training examples.
   * @param input - Crawl configuration
   * @returns Training examples with full stats
   */
  crawl(input: CorpusCrawlInput): CorpusCrawlResult {
    const validated = CorpusCrawlInputSchema.safeParse(input);
    if (!validated.success) {
      return this.emptyResult([`schema validation: ${validated.error.message}`]);
    }

    const { root_path, max_files, file_types, exclude_patterns, parse_logs } = validated.data;
    const startTime = Date.now();
    const warnings: string[] = [];

    // Verify root exists
    if (!fs.existsSync(root_path)) {
      return this.emptyResult([`root path does not exist: ${root_path}`]);
    }

    // Discover files
    const files = discoverFiles(root_path, max_files, exclude_patterns);

    const stats: CorpusStats = {
      files_found: files.length,
      files_parsed: 0,
      files_skipped: 0,
      files_failed: 0,
      min_files: 0,
      nc_files: 0,
      log_files: 0,
      binary_skipped: 0,
      total_operations: 0,
      training_examples: 0,
      customers: [],
      by_machine_type: {},
      by_operation_kind: {},
      parse_time_ms: 0,
    };

    const minPrograms: MINProgram[] = [];
    const ncPrograms: NCProgram[] = [];
    const runLogs: RunLog[] = [];
    const customerSet = new Set<string>();

    // Filter to requested file types
    const typesToParse = new Set(file_types.map(t => t.toUpperCase()));

    for (const file of files) {
      const typeUpper = file.type.toUpperCase();

      // Skip binary CAM files
      if (typeUpper === ".MCX-8" || typeUpper === ".MCAM" || typeUpper === ".MCX") {
        stats.binary_skipped++;
        continue;
      }

      // Skip if not in requested types
      if (!typesToParse.has(typeUpper) && !(typeUpper === ".LOG" && parse_logs)) {
        stats.files_skipped++;
        continue;
      }

      try {
        const text = fs.readFileSync(file.path, "utf-8");

        if (typeUpper === ".MIN") {
          // max_lines: matches ParseMINInputSchema default (200_000) — explicit per
          // Zod's z.input vs z.infer split (defaulted fields aren't optional in z.infer).
          const result = minFileParserEngine.parse({ text, source_path: file.path, max_lines: 200_000 });
          if (result.ok) {
            minPrograms.push(result.program);
            stats.min_files++;
            stats.files_parsed++;
            stats.total_operations += result.program.operations.length;

            // Track customer
            const customer = this.extractCustomer(file.path);
            if (customer) customerSet.add(customer);
          } else {
            stats.files_failed++;
            warnings.push(`MIN parse failed: ${file.path} - ${result.warnings.join(", ")}`);
          }
        } else if (typeUpper === ".NC") {
          // max_lines: matches ParseNCInputSchema default (500_000).
          const result = ncFileParserEngine.parse({ text, source_path: file.path, max_lines: 500_000 });
          if (result.ok) {
            ncPrograms.push(result.program);
            stats.nc_files++;
            stats.files_parsed++;
            stats.total_operations += result.program.operations.length;

            const customer = this.extractCustomer(file.path);
            if (customer) customerSet.add(customer);
          } else {
            stats.files_failed++;
            warnings.push(`NC parse failed: ${file.path} - ${result.warnings.join(", ")}`);
          }
        } else if (typeUpper === ".LOG" && parse_logs) {
          const machineId = this.extractMachineId(file.path);
          // controller + max_entries match ParseRunLogInputSchema defaults.
          // JM Die's machines are all Okuma OSP — see jm-die-profile.ts.
          const result = okumaRunLogParserEngine.parse({
            text,
            source_path: file.path,
            machine_id: machineId,
            controller: "okuma",
            max_entries: 1_000_000,
          });
          if (result.ok) {
            runLogs.push(result.log);
            stats.log_files++;
            stats.files_parsed++;
          } else {
            warnings.push(`LOG parse failed: ${file.path}`);
          }
        }
      } catch (err) {
        stats.files_failed++;
        const m = err instanceof Error ? err.message : String(err);
        warnings.push(`file read failed: ${file.path} - ${m}`);
      }
    }

    // Assemble training examples
    const programs: Array<{ type: "min" | "nc"; program: unknown }> = [
      ...minPrograms.map(p => ({ type: "min" as const, program: p })),
      ...ncPrograms.map(p => ({ type: "nc" as const, program: p })),
    ];

    const assemblerResult = trainingExampleAssemblerEngine.assemble({
      programs,
      run_logs: runLogs,
      customer_name: "JM Die",
      machine_type: "unknown",
    });

    // Aggregate stats
    stats.training_examples = assemblerResult.examples.length;
    stats.customers = Array.from(customerSet).sort();
    stats.parse_time_ms = Date.now() - startTime;

    // Count by machine type and operation kind
    for (const ex of assemblerResult.examples) {
      stats.by_machine_type[ex.machine_type] = (stats.by_machine_type[ex.machine_type] ?? 0) + 1;
      stats.by_operation_kind[ex.operation_kind] = (stats.by_operation_kind[ex.operation_kind] ?? 0) + 1;
    }

    warnings.push(...assemblerResult.warnings);

    return {
      examples: assemblerResult.examples,
      stats,
      warnings: warnings.slice(0, 100), // Cap warnings
      parsed_programs: { min: minPrograms, nc: ncPrograms },
      run_logs: runLogs,
    };
  }

  /**
   * Quick scan to count files without parsing.
   * @param rootPath - Root directory to scan
   * @returns File counts by type
   */
  quickScan(rootPath: string): Record<string, number> {
    const files = discoverFiles(rootPath, 100_000, ["BACKUP", "OLD"]);
    const counts: Record<string, number> = {};

    for (const f of files) {
      counts[f.type] = (counts[f.type] ?? 0) + 1;
    }

    return counts;
  }

  /**
   * Extract customer name from JM Die path.
   */
  private extractCustomer(filePath: string): string | null {
    const normalized = filePath.replace(/\\/g, "/");
    const parts = normalized.split("/");

    const jmIdx = parts.findIndex(p => p.toUpperCase() === "JM DIE");
    if (jmIdx >= 0 && jmIdx + 2 < parts.length) {
      const machineFolder = parts[jmIdx + 1]?.toUpperCase() ?? "";
      if (machineFolder.includes("LATHE") || machineFolder.includes("MILL") ||
          machineFolder.includes("EDM") || machineFolder.includes("ROKU")) {
        return parts[jmIdx + 2] ?? null;
      }
    }
    return null;
  }

  /**
   * Extract machine ID from file path.
   */
  private extractMachineId(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    const parts = normalized.split("/");

    // Look for machine identifiers like CNC#1, OKUMA, HAAS, etc.
    for (const part of parts) {
      const upper = part.toUpperCase();
      if (upper.includes("CNC#") || upper.includes("OKUMA") ||
          upper.includes("HAAS") || upper.includes("HURCO") ||
          upper.includes("MAZAK")) {
        return part;
      }
    }

    return "unknown";
  }

  /**
   * Save training examples to JSONL file for feature store ingestion.
   * @param examples - Training examples to save
   * @param outputPath - Output JSONL file path
   * @returns Number of examples written
   */
  saveToJSONL(examples: TrainingExample[], outputPath: string): number {
    const rows = trainingExampleAssemblerEngine.toFeatureRows(examples);
    const lines = rows.map(r => JSON.stringify(r));

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf-8");

    return rows.length;
  }

  private emptyResult(warnings: string[]): CorpusCrawlResult {
    return {
      examples: [],
      stats: {
        files_found: 0,
        files_parsed: 0,
        files_skipped: 0,
        files_failed: 0,
        min_files: 0,
        nc_files: 0,
        log_files: 0,
        binary_skipped: 0,
        total_operations: 0,
        training_examples: 0,
        customers: [],
        by_machine_type: {},
        by_operation_kind: {},
        parse_time_ms: 0,
      },
      warnings,
      parsed_programs: { min: [], nc: [] },
      run_logs: [],
    };
  }

  static getSelfAwareness() {
    return {
      name: "JMDieTrainingCorpusEngine",
      purpose: "Crawl JM Die archive and produce ML training examples from 22,721+ programs",
      milestone: "PSAU P2.5-LEARN U-LEARN-03",
      capabilities: ["crawl", "quickScan", "saveToJSONL"],
      inputs: ["JM DIE folder path"],
      outputs: ["TrainingExample[] (200k+ target)", "CorpusStats", "JSONL for feature store"],
      parsers_used: ["MINFileParserEngine", "NCFileParserEngine", "OkumaRunLogParserEngine"],
      assembler: "TrainingExampleAssemblerEngine",
      target_corpus: "H:/PRISM/JM DIE (22,721 files)",
    };
  }
}

export const jmDieTrainingCorpusEngine = new JMDieTrainingCorpusEngine();
