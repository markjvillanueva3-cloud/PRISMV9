/**
 * CADTrainingCorpusOrchestratorEngine — CAD-COMPLETE-MS0/U-CADC17
 *
 * Thin orchestrator for CAD training corpus generation.
 * Scans directories for CAD files and produces JSONL training corpus.
 *
 * Output: data/state/CAD_TRAINING_CORPUS.jsonl
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// ── Supported CAD extensions ─────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = [
  ".step", ".stp", ".iges", ".igs", ".x_t", ".x_b",
  ".sldprt", ".sldasm", ".ipt", ".iam", ".prt", ".asm",
  ".catpart", ".catproduct", ".3dm", ".sat", ".sab",
  // CAM-vendor project files (carry geometry + toolpaths) — Mastercam X/2017+, Fusion 360, hyperCAD-S
  ".mcx", ".mcx-5", ".mcx-6", ".mcx-7", ".mcx-8", ".mcx-9", ".mcam", ".f3d", ".f3z", ".hmc",
] as const;

type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrchestrationConfig {
  rootPath: string;
  maxFiles?: number;
  excludePatterns?: string[];
  outputPath?: string;
  skipDedup?: boolean;
}

export interface CorpusEntry {
  sourcePath: string;
  ext: string;
  bytes: number;
  hash: string;
  scannedAt: string;
}

export interface CorpusStats {
  total: number;
  totalBytes: number;
  byExtension: Record<string, number>;
}

export interface OrchestrationResult {
  corpusPath: string;
  stats: CorpusStats;
  filesScanned: number;
  entriesWritten: number;
  duplicatesRemoved: number;
  elapsedMs: number;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  rootPath: z.string().min(1).describe("Root directory to scan for CAD files"),
  maxFiles: z.number().int().positive().max(100_000).default(50_000),
  excludePatterns: z.array(z.string()).default(["BACKUP", "OLD", "ARCHIVE", "TEMP", "node_modules", ".git"]),
  outputPath: z.string().optional().describe("Output JSONL path"),
  skipDedup: z.boolean().default(false).describe("Skip deduplication step"),
});

export type ValidatedConfig = z.infer<typeof ConfigSchema>;

// ── File Discovery ───────────────────────────────────────────────────────────

interface ScannedFile {
  path: string;
  bytes: number;
}

const SUPPORTED_EXT_SET = new Set(SUPPORTED_EXTENSIONS.map(e => e.toLowerCase()));

function isCADFile(name: string): boolean {
  const lower = name.toLowerCase();
  for (const ext of SUPPORTED_EXT_SET) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function scanDirectory(
  rootPath: string,
  maxFiles: number,
  excludePatterns: string[]
): ScannedFile[] {
  const files: ScannedFile[] = [];
  const excludeUpper = new Set(excludePatterns.map(p => p.toUpperCase()));

  function walk(dir: string): void {
    if (files.length >= maxFiles) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      const fullPath = path.join(dir, entry.name);
      const nameUpper = entry.name.toUpperCase();

      if (excludeUpper.has(nameUpper)) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && isCADFile(entry.name)) {
        try {
          const stat = fs.statSync(fullPath);
          files.push({ path: fullPath, bytes: stat.size });
        } catch {
          // Skip inaccessible files
        }
      }
    }
  }

  try {
    walk(rootPath);
  } catch {
    // Root doesn't exist
  }
  return files;
}

// ── FNV-1a hash ──────────────────────────────────────────────────────────────

function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADTrainingCorpusOrchestratorEngine {
  private defaultOutputPath: string;

  constructor() {
    this.defaultOutputPath = path.resolve(
      process.cwd(),
      "mcp-server/data/state/CAD_TRAINING_CORPUS.jsonl"
    );
  }

  getInfo() {
    return {
      name: "CADTrainingCorpusOrchestratorEngine",
      version: "1.0.0",
      domain: "cad_neural",
      description: "Thin orchestrator for CAD training corpus generation.",
    };
  }

  getCapabilities() {
    return [
      { name: "orchestrate", description: "Run full corpus pipeline: scan → ingest → dedup → write", actions: ["cad_corpus_orchestrate"] },
      { name: "scan", description: "Scan directory for CAD files", actions: ["cad_corpus_scan"] },
      { name: "status", description: "Check existing corpus stats", actions: ["cad_corpus_status"] },
    ];
  }

  validate(input: unknown): string | null {
    const result = ConfigSchema.safeParse(input);
    if (!result.success) {
      return result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    }
    return null;
  }

  /**
   * Scan a directory for CAD files without processing.
   */
  scanOnly(config: Pick<OrchestrationConfig, "rootPath" | "maxFiles" | "excludePatterns">): ScannedFile[] {
    const { rootPath, maxFiles = 50_000, excludePatterns = [] } = config;
    return scanDirectory(rootPath, maxFiles, excludePatterns);
  }

  /**
   * Check status of existing corpus file.
   */
  status(corpusPath?: string): { exists: boolean; entries?: number; bytes?: number; modifiedAt?: string } {
    const targetPath = corpusPath ?? this.defaultOutputPath;
    try {
      const stat = fs.statSync(targetPath);
      const content = fs.readFileSync(targetPath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      return {
        exists: true,
        entries: lines.length,
        bytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Full orchestration pipeline: scan → classify → dedup → write JSONL.
   */
  orchestrate(config: OrchestrationConfig): OrchestrationResult {
    const start = Date.now();
    const validated = ConfigSchema.parse(config);
    const outputPath = validated.outputPath ?? this.defaultOutputPath;

    // 1. Scan directory for CAD files
    const scannedFiles = scanDirectory(validated.rootPath, validated.maxFiles, validated.excludePatterns);

    // 2. Create corpus entries with hash
    const entries: CorpusEntry[] = scannedFiles.map(f => {
      const ext = path.extname(f.path).toLowerCase() as SupportedExtension;
      return {
        sourcePath: f.path.replace(/\\/g, "/"),
        ext,
        bytes: f.bytes,
        hash: fnv1a(f.path + f.bytes),
        scannedAt: new Date().toISOString(),
      };
    });

    // 3. Dedup by hash (unless skipped)
    let finalEntries: CorpusEntry[];
    let duplicatesRemoved: number;
    if (validated.skipDedup) {
      finalEntries = entries;
      duplicatesRemoved = 0;
    } else {
      const seen = new Set<string>();
      finalEntries = [];
      for (const e of entries) {
        if (!seen.has(e.hash)) {
          seen.add(e.hash);
          finalEntries.push(e);
        }
      }
      duplicatesRemoved = entries.length - finalEntries.length;
    }

    // 4. Compute stats
    const byExtension: Record<string, number> = {};
    let totalBytes = 0;
    for (const e of finalEntries) {
      byExtension[e.ext] = (byExtension[e.ext] ?? 0) + 1;
      totalBytes += e.bytes;
    }
    const stats: CorpusStats = {
      total: finalEntries.length,
      totalBytes,
      byExtension,
    };

    // 5. Write JSONL output
    const jsonl = finalEntries.map(e => JSON.stringify(e)).join("\n") + (finalEntries.length ? "\n" : "");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, jsonl, "utf8");

    return {
      corpusPath: outputPath,
      stats,
      filesScanned: scannedFiles.length,
      entriesWritten: finalEntries.length,
      duplicatesRemoved,
      elapsedMs: Date.now() - start,
    };
  }
}

export const cadTrainingCorpusOrchestratorEngine = new CADTrainingCorpusOrchestratorEngine();
