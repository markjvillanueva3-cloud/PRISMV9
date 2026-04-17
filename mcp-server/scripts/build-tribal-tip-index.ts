#!/usr/bin/env node
/**
 * build-tribal-tip-index — index mapping tribal tips to their metadata
 *
 * Universal Phase 0.7. Creates TRIBAL_TIP_INDEX.json which maps every tribal
 * tip to its source, domain, keywords, and consumers. Backs
 * AwarenessQueryEngine.tribalTipSearch() for fast tip discovery.
 *
 * Output: mcp-server/data/state/TRIBAL_TIP_INDEX.json
 *
 * @module scripts/build-tribal-tip-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const STATE_DIR = path.join(ROOT, "data", "state");
const EXTRACTED_DIR = path.join(ROOT, "data", "extracted-knowledge");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "TRIBAL_TIP_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface TribalTipEntry {
  id: string;
  content: string;
  domain: string;
  source: string;
  keywords: string[];
  confidence: number;
  createdAt: string | null;
  sha256: string;
}

export interface TribalTipIndex {
  schemaVersion: number;
  lastUpdated: string;
  tipCount: number;
  tips: Record<string, TribalTipEntry>;
  byDomain: Record<string, string[]>;
  byKeyword: Record<string, string[]>;
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Extract keywords from tip content
 */
function extractKeywords(content: string): string[] {
  const keywords: string[] = [];
  const words = content.toLowerCase().split(/\s+/);

  const domainTerms = [
    "feed", "speed", "depth", "cut", "tool", "spindle", "rpm", "ipm", "sfm",
    "roughing", "finishing", "plunge", "ramp", "helical", "trochoidal",
    "carbide", "hss", "ceramic", "diamond", "insert", "endmill", "drill",
    "aluminum", "steel", "titanium", "inconel", "brass", "copper",
    "coolant", "mist", "flood", "air", "chip", "evacuation",
    "tolerance", "surface", "finish", "Ra", "flatness", "runout",
    "wedm", "edm", "wire", "spark", "gap", "flushing", "dielectric",
    "lathe", "mill", "turn", "bore", "thread", "face", "groove",
  ];

  for (const word of words) {
    const cleaned = word.replace(/[^a-z0-9]/g, "");
    if (cleaned.length > 3 && domainTerms.includes(cleaned)) {
      keywords.push(cleaned);
    }
  }

  return [...new Set(keywords)].slice(0, 10);
}

/**
 * Extract domain from tip content or source
 */
function extractDomain(content: string, source: string): string {
  const lowerContent = content.toLowerCase();
  const lowerSource = source.toLowerCase();

  if (lowerSource.includes("wedm") || lowerContent.includes("wire edm") || lowerContent.includes("wedm")) {
    return "wedm";
  }
  if (lowerSource.includes("lathe") || lowerContent.includes("lathe") || lowerContent.includes("turning")) {
    return "lathe";
  }
  if (lowerSource.includes("mill") || lowerContent.includes("milling") || lowerContent.includes("endmill")) {
    return "milling";
  }
  if (lowerSource.includes("hypermill") || lowerContent.includes("hypermill")) {
    return "hypermill";
  }
  if (lowerContent.includes("tool life") || lowerContent.includes("wear")) {
    return "tooling";
  }
  return "general";
}

/**
 * Load tips from captured tips JSON
 */
async function loadCapturedTips(): Promise<TribalTipEntry[]> {
  const tips: TribalTipEntry[] = [];
  const capturedPath = path.join(STATE_DIR, "tribal_captured_tips.json");

  try {
    const content = await fs.readFile(capturedPath, "utf-8");
    const data = JSON.parse(content);
    const tipList = Array.isArray(data) ? data : data.tips || [];

    for (const tip of tipList) {
      if (tip.content || tip.tip || tip.text) {
        const tipContent = tip.content || tip.tip || tip.text;
        tips.push({
          id: tip.id || `captured-${tips.length}`,
          content: tipContent.slice(0, 500),
          domain: tip.domain || extractDomain(tipContent, "captured"),
          source: "tribal_captured_tips.json",
          keywords: tip.keywords || extractKeywords(tipContent),
          confidence: tip.confidence || 0.8,
          createdAt: tip.createdAt || tip.created_at || null,
          sha256: crypto.createHash("sha256").update(tipContent).digest("hex").slice(0, 16),
        });
      }
    }
  } catch {
    // File not found
  }

  return tips;
}

/**
 * Load tips from extracted knowledge files
 */
async function loadExtractedTips(): Promise<TribalTipEntry[]> {
  const tips: TribalTipEntry[] = [];

  try {
    const subdirs = await fs.readdir(EXTRACTED_DIR);
    for (const subdir of subdirs) {
      const subdirPath = path.join(EXTRACTED_DIR, subdir);
      const stat = await fs.stat(subdirPath);
      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(subdirPath);
      for (const file of files) {
        if (!file.includes("tribal") || !file.endsWith(".json")) continue;

        const filePath = path.join(subdirPath, file);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const data = JSON.parse(content);
          const tipList = Array.isArray(data) ? data : data.tips || [];

          for (const tip of tipList) {
            if (tip.content || tip.tip || tip.text || tip.advice || tip.body) {
              const tipContent = tip.content || tip.tip || tip.text || tip.advice || tip.body;
              tips.push({
                id: tip.id || `${subdir}-${tips.length}`,
                content: (tip.title ? `${tip.title}: ` : "") + tipContent.slice(0, 500),
                domain: tip.domain || tip.category || tip.cam_system || extractDomain(tipContent, file),
                source: `${subdir}/${file}`,
                keywords: tip.keywords || extractKeywords(tipContent),
                confidence: tip.confidence || 0.7,
                createdAt: tip.createdAt || tip.created_at || null,
                sha256: crypto.createHash("sha256").update(tipContent).digest("hex").slice(0, 16),
              });
            }
          }
        } catch {
          // Skip unreadable
        }
      }
    }
  } catch {
    // Extracted dir not found
  }

  return tips;
}

/**
 * Build the complete tribal tip index
 */
export async function buildTribalTipIndex(opts: { verbose?: boolean } = {}): Promise<TribalTipIndex> {
  const allTips: TribalTipEntry[] = [];

  // Load captured tips
  const capturedTips = await loadCapturedTips();
  allTips.push(...capturedTips);
  if (opts.verbose) {
    console.log(`[build-tribal-tip-index] Found ${capturedTips.length} captured tips`);
  }

  // Load extracted tips
  const extractedTips = await loadExtractedTips();
  allTips.push(...extractedTips);
  if (opts.verbose) {
    console.log(`[build-tribal-tip-index] Found ${extractedTips.length} extracted tips`);
  }

  // Dedupe by sha256
  const tipMap: Record<string, TribalTipEntry> = {};
  for (const tip of allTips) {
    if (!tipMap[tip.sha256]) {
      tipMap[tip.sha256] = tip;
    }
  }

  // Build reverse indexes
  const byDomain: Record<string, string[]> = {};
  const byKeyword: Record<string, string[]> = {};

  for (const [id, tip] of Object.entries(tipMap)) {
    // By domain
    if (!byDomain[tip.domain]) byDomain[tip.domain] = [];
    byDomain[tip.domain].push(id);

    // By keyword
    for (const kw of tip.keywords) {
      if (!byKeyword[kw]) byKeyword[kw] = [];
      if (!byKeyword[kw].includes(id)) {
        byKeyword[kw].push(id);
      }
    }
  }

  const index: TribalTipIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    tipCount: Object.keys(tipMap).length,
    tips: tipMap,
    byDomain,
    byKeyword,
  };

  if (opts.verbose) {
    console.log(`  Done. ${index.tipCount} tips indexed, ${Object.keys(byDomain).length} domains, ${Object.keys(byKeyword).length} keywords.`);
  }

  return index;
}

/**
 * Write index to disk
 */
export async function writeTribalTipIndex(index: TribalTipIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readTribalTipIndex(): Promise<TribalTipIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as TribalTipIndex;
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

  console.log("[build-tribal-tip-index] Scanning...");
  const start = Date.now();
  const index = await buildTribalTipIndex({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  await writeTribalTipIndex(index);
  console.log(`[build-tribal-tip-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  console.log(`build-tribal-tip-index — ${index.tipCount} tips indexed`);
  console.log(`  domains: ${Object.keys(index.byDomain).length}`);
  console.log(`  keywords: ${Object.keys(index.byKeyword).length}`);
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-tribal-tip-index failed:", err);
    process.exit(2);
  });
}
