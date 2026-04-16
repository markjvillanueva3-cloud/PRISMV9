#!/usr/bin/env npx ts-node
/**
 * WEDM Customer Pattern Builder
 * Phase 0.9 U-WEDM-JMD3 - WEDM AGI Roadmap
 *
 * Builds customer-specific pattern index from harvested WEDM programs.
 * Output: Updates WEDM_CUSTOMER_PATTERN_INDEX.json
 *
 * Usage: npx ts-node scripts/wedm_build_customer_patterns.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildPatterns(): Promise<void> {
  const indexPath = path.resolve(__dirname, "../data/state/WEDM_PROGRAM_INDEX.json");
  const corpusPath = path.resolve(__dirname, "../data/state/WEDM_PARAMETER_CORPUS.json");
  const patternPath = path.resolve(__dirname, "../data/state/WEDM_CUSTOMER_PATTERN_INDEX.json");

  if (!fs.existsSync(indexPath) || !fs.existsSync(corpusPath)) {
    throw new Error("Program index or parameter corpus not found. Run harvest scripts first.");
  }

  const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf-8"));

  console.log("\nBuilding customer patterns...");

  // Build per-customer stats
  const customers: Record<string, any> = {};

  for (const program of index.programs ?? []) {
    const c = program.customer ?? "UNKNOWN";
    if (!customers[c]) {
      customers[c] = {
        programCount: 0,
        materials: new Set<string>(),
        avgThickness_mm: 0,
        preferredEcodes: new Set<string>(),
        controllers: new Set<string>(),
        commonFeatures: new Set<string>(),
        programIds: [] as string[],
      };
    }
    customers[c].programCount++;
    customers[c].controllers.add(program.machine ?? "unknown");
    customers[c].programIds.push(program.id);

    // Features
    if (program.features?.hasTaper) customers[c].commonFeatures.add("taper");
    if (program.features?.hasArcs) customers[c].commonFeatures.add("arcs");
    if (program.geometry?.hasInternal) customers[c].commonFeatures.add("internal-contour");
    if (program.geometry?.hasExternal) customers[c].commonFeatures.add("external-contour");
  }

  // Add E-codes from corpus
  for (const entry of corpus.programs ?? []) {
    const c = entry.customer;
    if (customers[c]) {
      entry.ecodes.forEach((e: string) => customers[c].preferredEcodes.add(e));
    }
  }

  // Convert sets to arrays and finalize
  const finalCustomers: Record<string, any> = {};
  for (const [name, data] of Object.entries(customers)) {
    finalCustomers[name] = {
      programCount: data.programCount,
      materials: Array.from(data.materials),
      preferredEcodes: Array.from(data.preferredEcodes).slice(0, 10),
      controllers: Array.from(data.controllers),
      commonFeatures: Array.from(data.commonFeatures),
      successRate: null,
      avgCycleTime_min: null,
      programIdsCount: data.programIds.length,
    };
  }

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    description: "JM Die customer patterns from WEDM program harvesting",
    source: "H:/PRISM/JM DIE/WIRE EDM",
    customers: finalCustomers,
    totalCustomers: Object.keys(finalCustomers).length,
    indexedCustomers: Object.keys(finalCustomers).filter((c) => c !== "UNKNOWN").length,
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(patternPath, JSON.stringify(output, null, 2));

  console.log(`\n--- Customer Pattern Summary ---`);
  console.log(`Total customers: ${output.totalCustomers}`);
  console.log(`Known customers: ${output.indexedCustomers}`);
  console.log(`\nTop customers by program count:`);
  Object.entries(finalCustomers)
    .sort((a: any, b: any) => b[1].programCount - a[1].programCount)
    .slice(0, 10)
    .forEach(([name, data]: [string, any]) => {
      console.log(`  ${name}: ${data.programCount} programs, ${data.preferredEcodes.length} E-codes`);
    });

  console.log(`\nPattern index saved: ${patternPath}`);
}

buildPatterns().catch(console.error);
