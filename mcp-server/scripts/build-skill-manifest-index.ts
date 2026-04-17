#!/usr/bin/env node
/**
 * build-skill-manifest-index — index mapping skills to their metadata and dependencies
 *
 * Universal Phase 0.7. Creates SKILL_MANIFEST_INDEX.json which maps every skill
 * (slash command) to its parsed frontmatter, referenced engines, actions, and hooks.
 * Backs AwarenessQueryEngine.skillCallGraph().
 *
 * Output: mcp-server/data/state/SKILL_MANIFEST_INDEX.json
 *
 * @module scripts/build-skill-manifest-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const SKILLS_DIR = path.join(ROOT, "..", ".claude", "commands");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "SKILL_MANIFEST_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface SkillManifest {
  file: string;
  name: string;
  description: string;
  version: string | null;
  engines: string[];
  actions: string[];
  hooks: string[];
  dispatchers: string[];
  sha256: string;
  lineCount: number;
}

export interface SkillManifestIndex {
  schemaVersion: number;
  lastUpdated: string;
  skillCount: number;
  skills: Record<string, SkillManifest>;
}

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Parse YAML-like frontmatter from markdown skill file
 */
function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return result;

  const lines = fmMatch[1].split("\n");
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      result[key] = value;
    }
  }
  return result;
}

/**
 * Extract engine references from skill content
 */
function extractEngines(content: string): string[] {
  const engines: string[] = [];
  const pattern = /\b([A-Z][a-zA-Z0-9]*Engine)\b/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content))) {
    engines.push(m[1]);
  }
  return [...new Set(engines)];
}

/**
 * Extract action references from skill content
 */
function extractActions(content: string): string[] {
  const actions: string[] = [];
  // Look for action names in backticks or quotes
  const patterns = [
    /`([a-z_][a-z0-9_]*)`/g,
    /"([a-z_][a-z0-9_]*)"/g,
    /'([a-z_][a-z0-9_]*)'/g,
  ];
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(content))) {
      // Filter to likely action names (contain underscore or common prefixes)
      if (m[1].includes("_") || m[1].startsWith("calc") || m[1].startsWith("pp_")) {
        actions.push(m[1]);
      }
    }
  }
  return [...new Set(actions)];
}

/**
 * Extract hook references from skill content
 */
function extractHooks(content: string): string[] {
  const hooks: string[] = [];
  const pattern = /hook[_-]?([a-z_][a-z0-9_-]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content))) {
    hooks.push(m[0].toLowerCase());
  }
  return [...new Set(hooks)];
}

/**
 * Extract dispatcher references from skill content
 */
function extractDispatchers(content: string): string[] {
  const dispatchers: string[] = [];
  const pattern = /([a-z]+Dispatcher)/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content))) {
    dispatchers.push(m[1]);
  }
  return [...new Set(dispatchers)];
}

/**
 * Build the complete skill manifest index
 */
export async function buildSkillManifestIndex(opts: { verbose?: boolean } = {}): Promise<SkillManifestIndex> {
  const skills: Record<string, SkillManifest> = {};

  let files: string[];
  try {
    files = (await fs.readdir(SKILLS_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    files = [];
  }

  if (opts.verbose) {
    console.log(`[build-skill-manifest-index] Found ${files.length} skill files`);
  }

  for (const file of files) {
    const filePath = path.join(SKILLS_DIR, file);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const frontmatter = parseFrontmatter(content);
      const name = file.replace(".md", "");

      const manifest: SkillManifest = {
        file,
        name,
        description: frontmatter.description || frontmatter.title || "",
        version: frontmatter.version || null,
        engines: extractEngines(content),
        actions: extractActions(content),
        hooks: extractHooks(content),
        dispatchers: extractDispatchers(content),
        sha256: crypto.createHash("sha256").update(content).digest("hex").slice(0, 16),
        lineCount: content.split("\n").length,
      };

      skills[name] = manifest;

      if (opts.verbose && (manifest.engines.length > 0 || manifest.actions.length > 0)) {
        console.log(`  ${name}: ${manifest.engines.length} engines, ${manifest.actions.length} actions`);
      }
    } catch {
      // Skip unreadable files
    }
  }

  const index: SkillManifestIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    skillCount: Object.keys(skills).length,
    skills,
  };

  if (opts.verbose) {
    console.log(`  Done. ${index.skillCount} skills indexed.`);
  }

  return index;
}

/**
 * Write index to disk
 */
export async function writeSkillManifestIndex(index: SkillManifestIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readSkillManifestIndex(): Promise<SkillManifestIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as SkillManifestIndex;
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

  console.log("[build-skill-manifest-index] Scanning...");
  const start = Date.now();
  const index = await buildSkillManifestIndex({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  await writeSkillManifestIndex(index);
  console.log(`[build-skill-manifest-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  // Summary stats
  let withEngines = 0;
  let withActions = 0;

  for (const manifest of Object.values(index.skills)) {
    if (manifest.engines.length > 0) withEngines++;
    if (manifest.actions.length > 0) withActions++;
  }

  console.log(`build-skill-manifest-index — ${index.skillCount} skills indexed`);
  console.log(`  with engines: ${withEngines}`);
  console.log(`  with actions: ${withActions}`);
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-skill-manifest-index failed:", err);
    process.exit(2);
  });
}
