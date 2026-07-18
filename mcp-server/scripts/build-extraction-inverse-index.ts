#!/usr/bin/env node
/**
 * build-extraction-inverse-index — index mapping extractions to their artifacts
 *
 * Universal Phase 0.7. Creates EXTRACTION_INVERSE_INDEX.json which maps
 * extraction sources to their IDs and generated artifacts. Backs
 * AwarenessQueryEngine.extractionForSource() for dedup checking.
 *
 * Output: mcp-server/data/state/EXTRACTION_INVERSE_INDEX.json
 *
 * @module scripts/build-extraction-inverse-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const EXTRACTION_LOG_PATH = path.join(ROOT, "data", "state", "extraction-log.json");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "EXTRACTION_INVERSE_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractionEntry {
  id: string;
  name: string;
  source: string;
  type: string;
  description: string;
  tipsGenerated: number;
  timestamp: string;
  status: string;
  supersededBy?: string;
  sha256: string;
}

export interface ExtractionInverseIndex {
  schemaVersion: number;
  lastUpdated: string;
  extractionCount: number;
  totalTipsGenerated: number;
  extractions: Record<string, ExtractionEntry>;
  bySource: Record<string, string>;
  byType: Record<string, string[]>;
  byStatus: Record<string, string[]>;
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Load and parse extraction log
 */
async function loadExtractionLog(): Promise<ExtractionEntry[]> {
  const entries: ExtractionEntry[] = [];

  try {
    const content = await fs.readFile(EXTRACTION_LOG_PATH, "utf-8");
    const data = JSON.parse(content);
    const extractions = data.extractions || [];

    for (const ext of extractions) {
      if (ext.id && ext.source) {
        entries.push({
          id: ext.id,
          name: ext.name || ext.id,
          source: ext.source,
          type: ext.type || "unknown",
          description: ext.description || "",
          tipsGenerated: ext.tipsGenerated || 0,
          timestamp: ext.timestamp || "",
          status: ext.status || "unknown",
          supersededBy: ext.supersededBy,
          sha256: crypto.createHash("sha256").update(ext.id + ext.source).digest("hex").slice(0, 16),
        });
      }
    }
  } catch {
    // Log not found
  }

  return entries;
}

/**
 * Build the complete extraction inverse index
 */
export async function buildExtractionInverseIndex(opts: { verbose?: boolean } = {}): Promise<ExtractionInverseIndex> {
  const entries = await loadExtractionLog();

  if (opts.verbose) {
    console.log(`[build-extraction-inverse-index] Found ${entries.length} extractions`);
  }

  const extractions: Record<string, ExtractionEntry> = {};
  const bySource: Record<string, string> = {};
  const byType: Record<string, string[]> = {};
  const byStatus: Record<string, string[]> = {};
  let totalTipsGenerated = 0;

  for (const entry of entries) {
    extractions[entry.id] = entry;
    totalTipsGenerated += entry.tipsGenerated;

    // Normalize source path for lookup
    const normalizedSource = entry.source.toLowerCase().replace(/\\/g, "/");
    bySource[normalizedSource] = entry.id;

    // By type
    if (!byType[entry.type]) byType[entry.type] = [];
    byType[entry.type].push(entry.id);

    // By status
    if (!byStatus[entry.status]) byStatus[entry.status] = [];
    byStatus[entry.status].push(entry.id);
  }

  const index: ExtractionInverseIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    extractionCount: entries.length,
    totalTipsGenerated,
    extractions,
    bySource,
    byType,
    byStatus,
  };

  if (opts.verbose) {
    console.log(`  Done. ${index.extractionCount} extractions, ${totalTipsGenerated} tips, ${Object.keys(byType).length} types.`);
  }

  return index;
}

/**
 * Write index to disk
 */
export async function writeExtractionInverseIndex(index: ExtractionInverseIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readExtractionInverseIndex(): Promise<ExtractionInverseIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as ExtractionInverseIndex;
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

  console.log("[build-extraction-inverse-index] Scanning...");
  const start = Date.now();
  const index = await buildExtractionInverseIndex({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  await writeExtractionInverseIndex(index);
  console.log(`[build-extraction-inverse-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  const completed = index.byStatus["completed"]?.length || 0;
  const superseded = index.byStatus["superseded"]?.length || 0;

  console.log(`build-extraction-inverse-index — ${index.extractionCount} extractions`);
  console.log(`  total tips generated: ${index.totalTipsGenerated}`);
  console.log(`  completed: ${completed}`);
  console.log(`  superseded: ${superseded}`);
  console.log(`  types: ${Object.keys(index.byType).length}`);
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-extraction-inverse-index failed:", err);
    process.exit(2);
  });
}
