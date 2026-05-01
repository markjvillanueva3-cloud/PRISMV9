#!/usr/bin/env npx tsx
/**
 * PageRank Engine Analysis — Phase 0.25
 * =======================================
 * Computes engine importance using PageRank algorithm.
 * High-PageRank engines get stricter safety thresholds.
 *
 * Theory: PageRank, Markov chains, eigenvector centrality
 * Usage: npx tsx scripts/pagerank_engines.ts
 */

import * as fs from "fs";
import * as path from "path";

interface EngineNode {
  name: string;
  pageRank: number;
  inDegree: number;
  outDegree: number;
  category: string;
}

interface PageRankReport {
  timestamp: string;
  totalEngines: number;
  iterations: number;
  convergence: number;
  topEngines: EngineNode[];
  criticalEngines: string[];
  recommendations: string[];
}

function computePageRank(
  adjacency: Map<string, string[]>,
  nodes: string[],
  d: number = 0.85,
  maxIter: number = 100,
  tol: number = 1e-6
): Map<string, number> {
  const N = nodes.length;
  const pr = new Map<string, number>();

  for (const node of nodes) {
    pr.set(node, 1 / N);
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const newPr = new Map<string, number>();
    let maxDiff = 0;

    for (const node of nodes) {
      let sum = 0;
      for (const [source, targets] of adjacency.entries()) {
        if (targets.includes(node)) {
          sum += pr.get(source)! / targets.length;
        }
      }
      const newVal = (1 - d) / N + d * sum;
      newPr.set(node, newVal);
      maxDiff = Math.max(maxDiff, Math.abs(newVal - pr.get(node)!));
    }

    for (const [k, v] of newPr) {
      pr.set(k, v);
    }

    if (maxDiff < tol) {
      break;
    }
  }

  return pr;
}

async function main(): Promise<void> {
  console.log("=== PageRank Engine Analysis ===\n");

  const enginesDir = path.join(process.cwd(), "src/engines");
  const engineFiles = fs.readdirSync(enginesDir).filter((f) => f.endsWith(".ts") && !f.startsWith("_"));

  const adjacency = new Map<string, string[]>();
  const categories = new Map<string, string>();

  for (const file of engineFiles) {
    const name = file.replace(".ts", "");
    const content = fs.readFileSync(path.join(enginesDir, file), "utf-8");

    const imports = content.match(/from\s+["']\.\/(\w+)(?:Engine)?["']/g) || [];
    const deps = imports.map((i) => {
      const match = i.match(/["']\.\/(\w+)/);
      return match ? match[1] + (match[1].endsWith("Engine") ? "" : "Engine") : null;
    }).filter((d): d is string => d !== null && engineFiles.includes(d + ".ts"));

    adjacency.set(name, deps);

    if (name.includes("Force") || name.includes("Kienzle")) {
      categories.set(name, "physics");
    } else if (name.includes("Safety") || name.includes("Sx")) {
      categories.set(name, "safety");
    } else if (name.includes("Speed") || name.includes("Feed")) {
      categories.set(name, "cutting-params");
    } else {
      categories.set(name, "general");
    }
  }

  const nodes = Array.from(adjacency.keys());
  const pr = computePageRank(adjacency, nodes);

  const engineNodes: EngineNode[] = nodes.map((name) => ({
    name,
    pageRank: pr.get(name) || 0,
    inDegree: Array.from(adjacency.values()).filter((deps) => deps.includes(name)).length,
    outDegree: adjacency.get(name)?.length || 0,
    category: categories.get(name) || "unknown",
  }));

  engineNodes.sort((a, b) => b.pageRank - a.pageRank);

  console.log(`Total engines: ${nodes.length}`);
  console.log("\nTop 15 by PageRank:");
  engineNodes.slice(0, 15).forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.name} (PR=${e.pageRank.toFixed(6)}, in=${e.inDegree}, out=${e.outDegree})`);
  });

  const criticalEngines = engineNodes
    .filter((e) => e.category === "physics" || e.category === "safety")
    .slice(0, 10)
    .map((e) => e.name);

  console.log("\nCritical engines (physics/safety):");
  criticalEngines.forEach((e) => console.log(`  • ${e}`));

  const report: PageRankReport = {
    timestamp: new Date().toISOString(),
    totalEngines: nodes.length,
    iterations: 100,
    convergence: 1e-6,
    topEngines: engineNodes.slice(0, 20),
    criticalEngines,
    recommendations: [
      `Apply S(x) ≥ 0.80 threshold to top ${criticalEngines.length} critical engines`,
      "High-PageRank engines should have comprehensive test coverage",
    ],
  };

  const outPath = path.join(process.cwd(), "data/state/pagerank-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to ${outPath}`);
}

main().catch(console.error);
