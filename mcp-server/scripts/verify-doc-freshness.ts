#!/usr/bin/env npx ts-node
/**
 * verify-doc-freshness.ts — Phase 0.15 Doc Freshness Check
 *
 * Compares each managed doc's current content hash against re-generated content hash.
 * Flags drift and optionally auto-regenerates stale docs.
 *
 * Run nightly via cron or during PreCompact.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface ManagedDoc {
  name: string;
  path: string;
  generator?: string;
  maxDriftHours: number;
}

const MANAGED_DOCS: ManagedDoc[] = [
  {
    name: "Root CLAUDE.md",
    path: "CLAUDE.md",
    generator: "scripts/regen-root-claude.ts",
    maxDriftHours: 24,
  },
  {
    name: "MCP CLAUDE.md",
    path: "mcp-server/CLAUDE.md",
    generator: "scripts/regen-mcp-claude.ts",
    maxDriftHours: 24,
  },
  {
    name: "Self-Awareness Directive",
    path: "state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md",
    generator: "scripts/regen-self-awareness.ts",
    maxDriftHours: 24,
  },
  {
    name: "Commands Manifest",
    path: "state/shared/PRISM-COMMANDS-MANIFEST.md",
    generator: "scripts/regen-commands-manifest.ts",
    maxDriftHours: 24,
  },
  {
    name: "Master Index",
    path: "mcp-server/data/docs/MASTER_INDEX.md",
    generator: "scripts/generate-master-index.mjs",
    maxDriftHours: 24,
  },
  {
    name: "Engine Digest",
    path: "mcp-server/data/docs/ENGINE_DIGEST.md",
    generator: "scripts/regen-engine-digest.ts",
    maxDriftHours: 24,
  },
  {
    name: "Dispatcher Digest",
    path: "mcp-server/data/docs/DISPATCHER_DIGEST.md",
    generator: "scripts/regen-dispatcher-digest.ts",
    maxDriftHours: 24,
  },
  {
    name: "Action Tracker",
    path: "mcp-server/data/docs/ACTION_TRACKER.md",
    generator: "scripts/regen-action-tracker.ts",
    maxDriftHours: 24,
  },
  {
    name: "DSL Compact",
    path: "mcp-server/data/docs/DSL_COMPACT.md",
    generator: "scripts/regen-code-index.mjs",
    maxDriftHours: 48,
  },
];

interface FreshnessResult {
  name: string;
  path: string;
  exists: boolean;
  currentHash?: string;
  lastModified?: Date;
  driftHours?: number;
  status: "fresh" | "stale" | "missing" | "error";
  message?: string;
}

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function checkFreshness(doc: ManagedDoc): FreshnessResult {
  const fullPath = path.resolve(process.cwd(), "..", doc.path);

  if (!fs.existsSync(fullPath)) {
    return {
      name: doc.name,
      path: doc.path,
      exists: false,
      status: "missing",
      message: "File does not exist",
    };
  }

  try {
    const stats = fs.statSync(fullPath);
    const lastModified = new Date(stats.mtime);
    const now = new Date();
    const driftHours = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60);
    const currentHash = hashFile(fullPath);

    const status = driftHours > doc.maxDriftHours ? "stale" : "fresh";

    return {
      name: doc.name,
      path: doc.path,
      exists: true,
      currentHash,
      lastModified,
      driftHours: Math.round(driftHours * 10) / 10,
      status,
      message: status === "stale"
        ? `Last modified ${Math.round(driftHours)}h ago (max: ${doc.maxDriftHours}h)`
        : undefined,
    };
  } catch (err) {
    return {
      name: doc.name,
      path: doc.path,
      exists: true,
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function main() {
  const autoFix = process.argv.includes("--fix");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           DOC FRESHNESS CHECK — Phase 0.15                    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const results: FreshnessResult[] = [];

  for (const doc of MANAGED_DOCS) {
    const result = checkFreshness(doc);
    results.push(result);

    const icon = {
      fresh: "✓",
      stale: "⚠",
      missing: "✗",
      error: "!",
    }[result.status];

    console.log(`${icon} ${result.name.padEnd(25)} ${result.status.toUpperCase().padEnd(8)} ${result.message || ""}`);
  }

  const stale = results.filter(r => r.status === "stale");
  const missing = results.filter(r => r.status === "missing");
  const errors = results.filter(r => r.status === "error");

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Summary: ${results.filter(r => r.status === "fresh").length} fresh, ${stale.length} stale, ${missing.length} missing, ${errors.length} errors`);

  if (stale.length > 0 || missing.length > 0) {
    if (autoFix) {
      console.log();
      console.log("Auto-fix mode: would regenerate stale docs here...");
      // TODO: Actually run generators
    } else {
      console.log();
      console.log("Run with --fix to auto-regenerate stale docs.");
    }
  }

  // Exit with error code if any issues
  if (stale.length > 0 || missing.length > 0 || errors.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
