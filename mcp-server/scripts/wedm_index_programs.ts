#!/usr/bin/env npx ts-node
/**
 * WEDM Index Programs Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Indexes JM Die WEDM programs from H:/PRISM/JM DIE/WIRE EDM/.
 * Extracts features, parameters, and builds searchable index.
 *
 * Usage: npx ts-node scripts/wedm_index_programs.ts [--source <path>]
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProgramIndexEntry {
  id: string;
  fileName: string;
  filePath: string;
  customer: string;
  machine: string;
  dateModified: string;
  fileSize: number;
  features: {
    lineCount: number;
    hasArcs: boolean;
    hasTaper: boolean;
    estimatedPasses: number;
    ecode?: string;
    controller: string;
  };
  geometry: {
    estimatedLength_mm: number;
    hasInternal: boolean;
    hasExternal: boolean;
  };
  searchTokens: string[];
}

interface ProgramIndex {
  schemaVersion: 1;
  generatedAt: string;
  source: string;
  totalPrograms: number;
  byCustomer: Record<string, number>;
  byMachine: Record<string, number>;
  programs: ProgramIndexEntry[];
}

function extractProgramFeatures(content: string): ProgramIndexEntry["features"] {
  const lines = content.split("\n");
  const hasArcs = /G0?2|G0?3/i.test(content);
  const hasTaper = /G51|G52/i.test(content);

  // Count offset changes to estimate passes
  const offsetChanges = (content.match(/G4[12]/g) ?? []).length;
  const estimatedPasses = Math.max(1, Math.floor(offsetChanges / 2) + 1);

  // Extract E-code
  const ecodeMatch = content.match(/E\d{4}/);

  // Detect controller
  let controller = "unknown";
  if (/Mitsubishi|FA-/i.test(content)) controller = "Mitsubishi";
  else if (/Fanuc|Robocut/i.test(content)) controller = "Fanuc";
  else if (/Sodick/i.test(content)) controller = "Sodick";
  else if (/Makino/i.test(content)) controller = "Makino";
  else if (/AgieCharmilles|Agie/i.test(content)) controller = "AgieCharmilles";

  return {
    lineCount: lines.length,
    hasArcs,
    hasTaper,
    estimatedPasses,
    ecode: ecodeMatch?.[0],
    controller,
  };
}

function extractGeometry(content: string): ProgramIndexEntry["geometry"] {
  // Extract X/Y moves to estimate length
  const xMoves = content.match(/X-?\d+\.?\d*/g) ?? [];
  const yMoves = content.match(/Y-?\d+\.?\d*/g) ?? [];

  let totalLength = 0;
  for (let i = 1; i < Math.min(xMoves.length, yMoves.length); i++) {
    const x1 = parseFloat(xMoves[i - 1].substring(1));
    const x2 = parseFloat(xMoves[i].substring(1));
    const y1 = parseFloat(yMoves[i - 1].substring(1));
    const y2 = parseFloat(yMoves[i].substring(1));
    totalLength += Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  const hasInternal = /G42/i.test(content);
  const hasExternal = /G41/i.test(content);

  return {
    estimatedLength_mm: Math.round(totalLength * 10) / 10,
    hasInternal,
    hasExternal,
  };
}

function extractSearchTokens(
  fileName: string,
  customer: string,
  content: string
): string[] {
  const tokens: string[] = [];

  // File name parts
  tokens.push(...fileName.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter(Boolean));

  // Customer
  tokens.push(customer.toLowerCase());

  // E-code
  const ecode = content.match(/E\d{4}/)?.[0];
  if (ecode) tokens.push(ecode.toLowerCase());

  // Comments (program names, part numbers)
  const comments = content.match(/\([^)]+\)/g) ?? [];
  comments.forEach((c) => {
    tokens.push(...c.replace(/[()]/g, "").toLowerCase().split(/\s+/).filter(Boolean));
  });

  // Deduplicate
  return [...new Set(tokens)];
}

async function indexPrograms(sourcePath: string): Promise<ProgramIndex> {
  console.log(`\nIndexing WEDM programs from: ${sourcePath}`);

  const programs: ProgramIndexEntry[] = [];
  const byCustomer: Record<string, number> = {};
  const byMachine: Record<string, number> = {};

  // Walk directory
  function walkDir(dir: string, customer: string = "unknown"): void {
    if (!fs.existsSync(dir)) {
      console.log(`Directory not found: ${dir}`);
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Use directory name as customer if at top level
        walkDir(fullPath, entry.name);
      } else if (entry.isFile() && /\.(nc|NC|txt|TXT|min|MIN)$/i.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const stats = fs.statSync(fullPath);

          // Skip non-G-code files
          if (!content.includes("G") && !content.includes("M")) continue;

          const features = extractProgramFeatures(content);
          const geometry = extractGeometry(content);
          const searchTokens = extractSearchTokens(entry.name, customer, content);

          const programEntry: ProgramIndexEntry = {
            id: `WEDM-${programs.length + 1}`,
            fileName: entry.name,
            filePath: fullPath.replace(/\\/g, "/"),
            customer: customer.toUpperCase(),
            machine: features.controller,
            dateModified: stats.mtime.toISOString(),
            fileSize: stats.size,
            features,
            geometry,
            searchTokens,
          };

          programs.push(programEntry);

          // Update counts
          byCustomer[customer.toUpperCase()] = (byCustomer[customer.toUpperCase()] ?? 0) + 1;
          byMachine[features.controller] = (byMachine[features.controller] ?? 0) + 1;

          if (programs.length % 100 === 0) {
            console.log(`  Indexed ${programs.length} programs...`);
          }
        } catch (err) {
          // Skip unreadable files
        }
      }
    }
  }

  walkDir(sourcePath);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: sourcePath,
    totalPrograms: programs.length,
    byCustomer,
    byMachine,
    programs,
  };
}

function printSummary(index: ProgramIndex): void {
  console.log("\n" + "=".repeat(60));
  console.log("WEDM PROGRAM INDEX SUMMARY");
  console.log("=".repeat(60));
  console.log(`Generated: ${index.generatedAt}`);
  console.log(`Source: ${index.source}`);
  console.log(`Total Programs: ${index.totalPrograms}`);

  console.log("\n--- By Customer (Top 10) ---");
  const sortedCustomers = Object.entries(index.byCustomer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  sortedCustomers.forEach(([customer, count]) => {
    console.log(`  ${customer}: ${count}`);
  });

  console.log("\n--- By Controller ---");
  Object.entries(index.byMachine)
    .sort((a, b) => b[1] - a[1])
    .forEach(([machine, count]) => {
      console.log(`  ${machine}: ${count}`);
    });

  console.log("\n--- Feature Distribution ---");
  const withTaper = index.programs.filter((p) => p.features.hasTaper).length;
  const withArcs = index.programs.filter((p) => p.features.hasArcs).length;
  const avgPasses = index.programs.reduce((sum, p) => sum + p.features.estimatedPasses, 0) / index.programs.length;

  console.log(`  With Taper: ${withTaper} (${((withTaper / index.totalPrograms) * 100).toFixed(1)}%)`);
  console.log(`  With Arcs: ${withArcs} (${((withArcs / index.totalPrograms) * 100).toFixed(1)}%)`);
  console.log(`  Avg Passes: ${avgPasses.toFixed(1)}`);

  console.log("\n" + "=".repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let sourcePath = "H:/PRISM/JM DIE/WIRE EDM";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--source":
      case "-s":
        sourcePath = args[++i];
        break;
      case "--help":
      case "-h":
        console.log("Usage: npx ts-node scripts/wedm_index_programs.ts [options]");
        console.log("\nOptions:");
        console.log("  --source, -s   Source directory (default: H:/PRISM/JM DIE/WIRE EDM)");
        process.exit(0);
    }
  }

  try {
    // Create sample data if source doesn't exist
    if (!fs.existsSync(sourcePath)) {
      console.log(`Source not found: ${sourcePath}`);
      console.log("Creating sample programs for demo...");

      const sampleDir = "./sample_wedm_programs";
      fs.mkdirSync(path.join(sampleDir, "ALCOA"), { recursive: true });
      fs.mkdirSync(path.join(sampleDir, "ITW"), { recursive: true });

      fs.writeFileSync(path.join(sampleDir, "ALCOA", "O1234.NC"), `
O1234 (ALCOA PUNCH INSERT)
G21 G90
E1847
G51 U0 V0
G41 D01
G01 X10.0 Y0
G02 X20.0 Y10.0 I10.0 J0
G01 X20.0 Y50.0
G01 X0 Y50.0
G01 X0 Y0
G40
M30
`);

      fs.writeFileSync(path.join(sampleDir, "ITW", "O5678.NC"), `
O5678 (ITW DIE BLOCK)
G21 G90
E1234
G41 D01
G01 X0 Y0
G01 X100.0 Y0
G01 X100.0 Y100.0
G01 X0 Y100.0
G01 X0 Y0
G40
M30
`);

      sourcePath = sampleDir;
    }

    const index = await indexPrograms(sourcePath);
    printSummary(index);

    // Save index
    const indexPath = path.resolve(__dirname, "../data/state/WEDM_PROGRAM_INDEX.json");
    const indexDir = path.dirname(indexPath);
    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`Index saved: ${indexPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
