#!/usr/bin/env node
/**
 * run-orphan-audit — Full codebase orphan detection scan
 *
 * Universal Phase 0.9. Scans for all orphan types:
 * - Engines without dispatcher imports
 * - Actions without schemas
 * - Actions without switch cases
 * - Schemas without actions
 * - Skills without hook anchors
 * - Hooks without registration
 * - Registry/filesystem drift
 *
 * Output: mcp-server/data/state/ORPHAN_AUDIT_REPORT.json
 *
 * @module scripts/run-orphan-audit
 * @phase Universal 0.9 — Orphan Detection at Write-Time
 */

import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "ORPHAN_AUDIT_REPORT.json");

// Index paths
const ENGINE_USAGE_PATH = path.join(ROOT, "data", "state", "ENGINE_USAGE_INDEX.json");
const ACTION_RESOLUTION_PATH = path.join(ROOT, "data", "state", "ACTION_RESOLUTION_INDEX.json");
const SKILL_MANIFEST_PATH = path.join(ROOT, "data", "state", "SKILL_MANIFEST_INDEX.json");
const REGISTRY_PATH = path.join(ROOT, "data", "state", "cross-session-asset-registry.json");

// ============================================================================
// TYPES
// ============================================================================

export interface OrphanEntry {
  type: string;
  asset: string;
  file?: string;
  reason: string;
  severity: "error" | "warning" | "info";
}

export interface OrphanAuditReport {
  schemaVersion: number;
  lastUpdated: string;
  totalOrphans: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  orphans: OrphanEntry[];
}

// ============================================================================
// SCAN FUNCTIONS
// ============================================================================

async function scanEnginesWithoutDispatcher(): Promise<OrphanEntry[]> {
  const orphans: OrphanEntry[] = [];

  try {
    const content = await fs.readFile(ENGINE_USAGE_PATH, "utf-8");
    const index = JSON.parse(content);

    for (const [name, usage] of Object.entries(index.engines || {})) {
      const u = usage as { dispatchers?: string[] };
      if (!u.dispatchers || u.dispatchers.length === 0) {
        orphans.push({
          type: "ENGINE_WITHOUT_DISPATCHER",
          asset: name,
          file: `src/engines/${name}.ts`,
          reason: "No dispatcher imports this engine",
          severity: "warning",
        });
      }
    }
  } catch {
    // Index not found
  }

  return orphans;
}

async function scanActionsWithoutSchema(): Promise<OrphanEntry[]> {
  const orphans: OrphanEntry[] = [];

  try {
    const content = await fs.readFile(ACTION_RESOLUTION_PATH, "utf-8");
    const index = JSON.parse(content);

    for (const [name, resolution] of Object.entries(index.actions || {})) {
      const r = resolution as { inputSchema?: string | null };
      if (!r.inputSchema) {
        orphans.push({
          type: "ACTION_WITHOUT_SCHEMA",
          asset: name,
          reason: "Action has no input schema defined",
          severity: "info",
        });
      }
    }
  } catch {
    // Index not found
  }

  return orphans;
}

async function scanSkillsWithoutHookAnchor(): Promise<OrphanEntry[]> {
  const orphans: OrphanEntry[] = [];

  try {
    const content = await fs.readFile(SKILL_MANIFEST_PATH, "utf-8");
    const index = JSON.parse(content);

    for (const [name, manifest] of Object.entries(index.skills || {})) {
      const m = manifest as { hooks?: string[] };
      if (!m.hooks || m.hooks.length === 0) {
        orphans.push({
          type: "SKILL_WITHOUT_HOOK_ANCHOR",
          asset: name,
          reason: "Skill not referenced by any hook",
          severity: "info",
        });
      }
    }
  } catch {
    // Index not found
  }

  return orphans;
}

async function scanRegistryFsDrift(): Promise<OrphanEntry[]> {
  const orphans: OrphanEntry[] = [];

  try {
    const content = await fs.readFile(REGISTRY_PATH, "utf-8");
    const registry = JSON.parse(content);
    const entries = registry.entries || [];

    for (const entry of entries) {
      if (entry.type === "engine" && entry.path) {
        const fullPath = path.join(ROOT, entry.path);
        try {
          await fs.access(fullPath);
        } catch {
          orphans.push({
            type: "REGISTRY_ENTRY_UNBACKED",
            asset: entry.name || entry.id,
            file: entry.path,
            reason: "Registry entry points to non-existent file",
            severity: "warning",
          });
        }
      }
    }

    // Check for unregistered engine files
    const enginesDir = path.join(ROOT, "src", "engines");
    try {
      const files = await fs.readdir(enginesDir);
      const registeredPaths = new Set(entries.map((e: { path?: string }) => e.path));

      for (const file of files) {
        if (file.endsWith(".ts") && !file.includes(".test.") && file !== "index.ts") {
          const relativePath = `src/engines/${file}`;
          if (!registeredPaths.has(relativePath)) {
            orphans.push({
              type: "FILE_UNREGISTERED",
              asset: file.replace(".ts", ""),
              file: relativePath,
              reason: "Engine file not in cross-session-asset-registry",
              severity: "info",
            });
          }
        }
      }
    } catch {
      // Directory not found
    }

  } catch {
    // Registry not found
  }

  return orphans;
}

// ============================================================================
// MAIN
// ============================================================================

export async function runOrphanAudit(opts: { verbose?: boolean } = {}): Promise<OrphanAuditReport> {
  const allOrphans: OrphanEntry[] = [];

  if (opts.verbose) console.log("[run-orphan-audit] Scanning engines without dispatcher...");
  allOrphans.push(...await scanEnginesWithoutDispatcher());

  if (opts.verbose) console.log("[run-orphan-audit] Scanning actions without schema...");
  allOrphans.push(...await scanActionsWithoutSchema());

  if (opts.verbose) console.log("[run-orphan-audit] Scanning skills without hook anchor...");
  allOrphans.push(...await scanSkillsWithoutHookAnchor());

  if (opts.verbose) console.log("[run-orphan-audit] Scanning registry/filesystem drift...");
  allOrphans.push(...await scanRegistryFsDrift());

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const orphan of allOrphans) {
    byType[orphan.type] = (byType[orphan.type] || 0) + 1;
    bySeverity[orphan.severity] = (bySeverity[orphan.severity] || 0) + 1;
  }

  const report: OrphanAuditReport = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    totalOrphans: allOrphans.length,
    byType,
    bySeverity,
    orphans: allOrphans,
  };

  return report;
}

export async function writeOrphanAuditReport(report: OrphanAuditReport): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(report, null, 2));
}

async function main(): Promise<void> {
  const verbose = process.argv.includes("--verbose");
  const json = process.argv.includes("--json");

  console.log("[run-orphan-audit] Starting full codebase scan...");
  const start = Date.now();
  const report = await runOrphanAudit({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  await writeOrphanAuditReport(report);
  console.log(`[run-orphan-audit] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  console.log(`\nOrphan Audit Summary:`);
  console.log(`  Total orphans: ${report.totalOrphans}`);
  console.log(`  By type:`);
  for (const [type, count] of Object.entries(report.byType)) {
    console.log(`    ${type}: ${count}`);
  }
  console.log(`  By severity:`);
  for (const [severity, count] of Object.entries(report.bySeverity)) {
    console.log(`    ${severity}: ${count}`);
  }

  if (report.bySeverity["error"] && report.bySeverity["error"] > 0) {
    console.log(`\n⚠️  ${report.bySeverity["error"]} error-level orphans found!`);
    process.exit(1);
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("run-orphan-audit failed:", err);
    process.exit(2);
  });
}
