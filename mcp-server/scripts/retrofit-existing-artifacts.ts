#!/usr/bin/env npx ts-node
/**
 * retrofit-existing-artifacts.ts — Phase 0.16 Back-Fill
 *
 * Walks src/ to extract metadata from existing 1,660+ engines, 4,296 actions,
 * and 84 dispatchers. Emits synthetic registry entries as if each file had
 * been written through forge-quint.
 *
 * One-shot, idempotent, chunked with progress.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const PATHS = {
  engines: "mcp-server/src/engines",
  dispatchers: "mcp-server/src/tools/dispatchers",
  schemas: "mcp-server/src/schemas",
  hooks: "mcp-server/src/hooks",
  algorithms: "mcp-server/src/algorithms",
};

const OUTPUT = {
  engineIndex: "mcp-server/data/state/ENGINE_USAGE_INDEX.json",
  actionIndex: "mcp-server/data/state/ACTION_RESOLUTION_INDEX.json",
  signatureIndex: "mcp-server/data/state/SIGNATURE_HASH_INDEX.json",
};

interface EngineInfo {
  name: string;
  path: string;
  loc: number;
  exports: string[];
  dependencies: string[];
  signatureHash: string;
  lastModified: string;
}

interface ActionInfo {
  name: string;
  dispatcher: string;
  schema?: string;
  engine?: string;
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const exportRegex = /export\s+(?:const|class|function|interface|type)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  return exports;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /from\s+["']\.\.?\/[^"']*\/(\w+)(?:\.js)?["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function extractMethodSignatures(content: string): string {
  const signatures: string[] = [];
  const methodRegex = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    signatures.push(match[0].trim());
  }
  return hashContent(signatures.join("\n"));
}

function scanEngines(): EngineInfo[] {
  const enginesPath = path.resolve(process.cwd(), "..", PATHS.engines);
  const engines: EngineInfo[] = [];

  if (!fs.existsSync(enginesPath)) return engines;

  const files = fs.readdirSync(enginesPath).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

  for (const file of files) {
    const filePath = path.join(enginesPath, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const stats = fs.statSync(filePath);
    const lines = content.split("\n").length;

    engines.push({
      name: file.replace(".ts", ""),
      path: `${PATHS.engines}/${file}`,
      loc: lines,
      exports: extractExports(content),
      dependencies: extractImports(content),
      signatureHash: extractMethodSignatures(content),
      lastModified: stats.mtime.toISOString(),
    });
  }

  return engines;
}

function scanDispatchers(): { dispatcher: string; actions: string[] }[] {
  const dispatchersPath = path.resolve(process.cwd(), "..", PATHS.dispatchers);
  const results: { dispatcher: string; actions: string[] }[] = [];

  if (!fs.existsSync(dispatchersPath)) return results;

  const files = fs.readdirSync(dispatchersPath).filter((f) => f.endsWith("Dispatcher.ts"));

  for (const file of files) {
    const filePath = path.join(dispatchersPath, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract actions from z.enum
    const enumMatch = content.match(/z\.enum\(\[([^\]]+)\]/);
    if (enumMatch) {
      const actionsStr = enumMatch[1];
      const actions = actionsStr.match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) || [];
      results.push({
        dispatcher: file.replace(".ts", ""),
        actions,
      });
    }
  }

  return results;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const verbose = process.argv.includes("--verbose");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       RETROFIT EXISTING ARTIFACTS — Phase 0.16                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  if (dryRun) {
    console.log("[DRY RUN MODE]");
    console.log();
  }

  // Scan engines
  console.log("Scanning engines...");
  const engines = scanEngines();
  console.log(`  Found: ${engines.length} engines`);

  // Scan dispatchers
  console.log("Scanning dispatchers...");
  const dispatchers = scanDispatchers();
  const totalActions = dispatchers.reduce((sum, d) => sum + d.actions.length, 0);
  console.log(`  Found: ${dispatchers.length} dispatchers, ${totalActions} actions`);

  // Build ENGINE_USAGE_INDEX
  const engineIndex: Record<string, EngineInfo> = {};
  for (const engine of engines) {
    engineIndex[engine.name] = engine;
    if (verbose) {
      console.log(`  Engine: ${engine.name} (${engine.loc} LOC)`);
    }
  }

  // Build ACTION_RESOLUTION_INDEX
  const actionIndex: Record<string, ActionInfo> = {};
  for (const dispatcher of dispatchers) {
    for (const action of dispatcher.actions) {
      actionIndex[action] = {
        name: action,
        dispatcher: dispatcher.dispatcher,
      };
    }
  }

  // Build SIGNATURE_HASH_INDEX
  const signatureIndex: Record<string, string> = {};
  for (const engine of engines) {
    signatureIndex[engine.name] = engine.signatureHash;
  }

  console.log();
  console.log("Summary:");
  console.log(`  Engines: ${Object.keys(engineIndex).length}`);
  console.log(`  Actions: ${Object.keys(actionIndex).length}`);
  console.log(`  Signatures: ${Object.keys(signatureIndex).length}`);

  if (dryRun) {
    console.log();
    console.log("Dry run complete. No files written.");
    return;
  }

  // Write indexes
  console.log();
  console.log("Writing indexes...");

  const writeIndex = (outputPath: string, data: Record<string, unknown>) => {
    const fullPath = path.resolve(process.cwd(), "..", outputPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
    console.log(`  ✓ ${outputPath}`);
  };

  writeIndex(OUTPUT.engineIndex, engineIndex);
  writeIndex(OUTPUT.actionIndex, actionIndex);
  writeIndex(OUTPUT.signatureIndex, signatureIndex);

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Retrofit complete.");
}

main().catch(console.error);
