#!/usr/bin/env node
/**
 * build-signature-hash-index — index mapping content hashes for deduplication
 *
 * Universal Phase 0.7. Creates SIGNATURE_HASH_INDEX.json which maps content
 * hashes to engine files, detecting duplicates and near-duplicates.
 * Backs AwarenessQueryEngine.findDuplicates() for dedup checking.
 *
 * Output: mcp-server/data/state/SIGNATURE_HASH_INDEX.json
 *
 * @module scripts/build-signature-hash-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const ENGINES_DIR = path.join(ROOT, "src", "engines");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "SIGNATURE_HASH_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface SignatureEntry {
  file: string;
  name: string;
  fullHash: string;
  normalizedHash: string;
  lineCount: number;
  byteSize: number;
  methodCount: number;
  exportCount: number;
}

export interface DuplicateGroup {
  hash: string;
  files: string[];
  type: "exact" | "normalized";
}

export interface SignatureHashIndex {
  schemaVersion: number;
  lastUpdated: string;
  fileCount: number;
  uniqueHashes: number;
  duplicateGroups: number;
  signatures: Record<string, SignatureEntry>;
  byFullHash: Record<string, string[]>;
  byNormalizedHash: Record<string, string[]>;
  duplicates: DuplicateGroup[];
}

// ============================================================================
// HASH FUNCTIONS
// ============================================================================

/**
 * Normalize content for fuzzy matching (remove whitespace, comments)
 */
function normalizeContent(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/["'`]/g, '"')
    .trim();
}

/**
 * Count methods in TypeScript file
 */
function countMethods(content: string): number {
  const methodPatterns = [
    /(?:async\s+)?(?:static\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g,
    /(?:async\s+)?(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g,
  ];

  let count = 0;
  for (const pattern of methodPatterns) {
    const matches = content.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Count exports in TypeScript file
 */
function countExports(content: string): number {
  const exportPattern = /export\s+(?:const|class|function|interface|type|enum|default)/g;
  const matches = content.match(exportPattern);
  return matches ? matches.length : 0;
}

// ============================================================================
// SCANNER FUNCTIONS
// ============================================================================

/**
 * Scan engines directory for all engine files
 */
async function scanEngines(): Promise<SignatureEntry[]> {
  const entries: SignatureEntry[] = [];

  try {
    const files = await fs.readdir(ENGINES_DIR);

    for (const file of files) {
      if (!file.endsWith(".ts") || file.includes(".test.")) continue;

      const filePath = path.join(ENGINES_DIR, file);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      const content = await fs.readFile(filePath, "utf-8");
      const normalized = normalizeContent(content);

      const fullHash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
      const normalizedHash = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);

      entries.push({
        file: file,
        name: file.replace(".ts", ""),
        fullHash,
        normalizedHash,
        lineCount: content.split("\n").length,
        byteSize: stat.size,
        methodCount: countMethods(content),
        exportCount: countExports(content),
      });
    }
  } catch {
    // Directory not found
  }

  return entries;
}

/**
 * Find duplicate groups from hash map
 */
function findDuplicateGroups(
  byHash: Record<string, string[]>,
  type: "exact" | "normalized"
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];

  for (const [hash, files] of Object.entries(byHash)) {
    if (files.length > 1) {
      groups.push({ hash, files, type });
    }
  }

  return groups;
}

/**
 * Build the complete signature hash index
 */
export async function buildSignatureHashIndex(opts: { verbose?: boolean } = {}): Promise<SignatureHashIndex> {
  const entries = await scanEngines();

  if (opts.verbose) {
    console.log(`[build-signature-hash-index] Found ${entries.length} engine files`);
  }

  const signatures: Record<string, SignatureEntry> = {};
  const byFullHash: Record<string, string[]> = {};
  const byNormalizedHash: Record<string, string[]> = {};

  for (const entry of entries) {
    signatures[entry.name] = entry;

    if (!byFullHash[entry.fullHash]) byFullHash[entry.fullHash] = [];
    byFullHash[entry.fullHash].push(entry.name);

    if (!byNormalizedHash[entry.normalizedHash]) byNormalizedHash[entry.normalizedHash] = [];
    byNormalizedHash[entry.normalizedHash].push(entry.name);
  }

  const exactDupes = findDuplicateGroups(byFullHash, "exact");
  const normalizedDupes = findDuplicateGroups(byNormalizedHash, "normalized")
    .filter((g) => !exactDupes.some((e) => e.hash === g.hash));

  const duplicates = [...exactDupes, ...normalizedDupes];

  const index: SignatureHashIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    fileCount: entries.length,
    uniqueHashes: Object.keys(byFullHash).length,
    duplicateGroups: duplicates.length,
    signatures,
    byFullHash,
    byNormalizedHash,
    duplicates,
  };

  if (opts.verbose) {
    console.log(`  Unique full hashes: ${Object.keys(byFullHash).length}`);
    console.log(`  Unique normalized hashes: ${Object.keys(byNormalizedHash).length}`);
    console.log(`  Duplicate groups: ${duplicates.length}`);
  }

  return index;
}

/**
 * Write index to disk
 */
export async function writeSignatureHashIndex(index: SignatureHashIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readSignatureHashIndex(): Promise<SignatureHashIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as SignatureHashIndex;
  } catch {
    return null;
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main(): Promise<void> {
  const verbose = process.argv.includes("--verbose");
  const json = process.argv.includes("--json");

  console.log("[build-signature-hash-index] Scanning...");
  const start = Date.now();
  const index = await buildSignatureHashIndex({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  await writeSignatureHashIndex(index);
  console.log(`[build-signature-hash-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  console.log(`build-signature-hash-index — ${index.fileCount} files`);
  console.log(`  unique hashes: ${index.uniqueHashes}`);
  console.log(`  duplicate groups: ${index.duplicateGroups}`);

  if (index.duplicates.length > 0) {
    console.log(`  duplicates found:`);
    for (const dup of index.duplicates.slice(0, 5)) {
      console.log(`    [${dup.type}] ${dup.files.join(", ")}`);
    }
    if (index.duplicates.length > 5) {
      console.log(`    ... and ${index.duplicates.length - 5} more`);
    }
  }
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-signature-hash-index failed:", err);
    process.exit(2);
  });
}
