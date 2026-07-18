/**
 * pagerank-engines.ts — USSH Phase 0.25
 * ======================================
 *
 * Computes PageRank scores for engines based on dependency graph.
 * Identifies critical path engines that require stricter validation.
 *
 * Usage: npx tsx scripts/pagerank-engines.ts [--top=10] [--damping=0.85]
 *
 * Theory: PageRank algorithm, eigenvector centrality, Markov chains
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";

const STATE_DIR = path.join(process.cwd(), "data/state");
const REPORT_FILE = path.join(STATE_DIR, "pagerank-report.json");
const ENGINES_DIR = path.join(process.cwd(), "src/engines");

interface EngineNode {
  name: string;
  file: string;
  imports: string[];
  exports: string[];
  pageRank: number;
}

interface PageRankReport {
  timestamp: number;
  totalEngines: number;
  iterations: number;
  damping: number;
  converged: boolean;
  topEngines: EngineNode[];
  criticalPaths: string[][];
  recommendations: string[];
}

async function buildDependencyGraph(): Promise<Map<string, EngineNode>> {
  const graph = new Map<string, EngineNode>();

  const files = await glob("**/*Engine.ts", { cwd: ENGINES_DIR });

  for (const file of files) {
    const name = path.basename(file, ".ts");
    const fullPath = path.join(ENGINES_DIR, file);

    let content = "";
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    // Extract imports
    const imports: string[] = [];
    const importMatches = content.matchAll(/from\s+['"]\.\/([\w-]+)Engine\.js['"]/g);
    for (const match of importMatches) {
      imports.push(`${match[1]}Engine`);
    }

    // Extract exports
    const exports: string[] = [];
    const exportMatches = content.matchAll(/export\s+(?:const|class|function)\s+(\w+)/g);
    for (const match of exportMatches) {
      exports.push(match[1]);
    }

    graph.set(name, {
      name,
      file,
      imports,
      exports,
      pageRank: 1.0 / files.length,
    });
  }

  return graph;
}

function computePageRank(
  graph: Map<string, EngineNode>,
  damping: number,
  maxIterations: number = 100,
  tolerance: number = 1e-6
): { iterations: number; converged: boolean } {
  const N = graph.size;
  if (N === 0) return { iterations: 0, converged: true };

  // Build adjacency lists
  const inbound = new Map<string, string[]>();
  const outDegree = new Map<string, number>();

  for (const [name, node] of graph) {
    inbound.set(name, []);
    outDegree.set(name, node.imports.length || 1); // Avoid division by zero
  }

  for (const [name, node] of graph) {
    for (const dep of node.imports) {
      if (graph.has(dep)) {
        inbound.get(dep)!.push(name);
      }
    }
  }

  // Power iteration
  let iterations = 0;
  let converged = false;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations++;
    let maxDelta = 0;

    const newRanks = new Map<string, number>();

    for (const [name] of graph) {
      let sum = 0;
      for (const inNode of inbound.get(name) || []) {
        const node = graph.get(inNode)!;
        sum += node.pageRank / outDegree.get(inNode)!;
      }

      const newRank = (1 - damping) / N + damping * sum;
      newRanks.set(name, newRank);

      maxDelta = Math.max(maxDelta, Math.abs(newRank - graph.get(name)!.pageRank));
    }

    // Update ranks
    for (const [name, rank] of newRanks) {
      graph.get(name)!.pageRank = rank;
    }

    if (maxDelta < tolerance) {
      converged = true;
      break;
    }
  }

  return { iterations, converged };
}

function findCriticalPaths(graph: Map<string, EngineNode>, topN: number): string[][] {
  const paths: string[][] = [];

  // Sort by PageRank
  const sorted = Array.from(graph.values()).sort((a, b) => b.pageRank - a.pageRank);

  // For top engines, trace dependency paths
  for (const node of sorted.slice(0, topN)) {
    const path = [node.name];
    let current = node;
    const visited = new Set<string>();

    while (current.imports.length > 0 && path.length < 5) {
      visited.add(current.name);
      const nextName = current.imports.find(
        (imp) => graph.has(imp) && !visited.has(imp)
      );
      if (!nextName) break;

      path.push(nextName);
      current = graph.get(nextName)!;
    }

    if (path.length > 1) {
      paths.push(path);
    }
  }

  return paths;
}

async function generateReport(topN: number, damping: number): Promise<PageRankReport> {
  const graph = await buildDependencyGraph();
  const { iterations, converged } = computePageRank(graph, damping);

  const sorted = Array.from(graph.values()).sort((a, b) => b.pageRank - a.pageRank);
  const topEngines = sorted.slice(0, topN);

  const criticalPaths = findCriticalPaths(graph, topN);

  const recommendations: string[] = [];

  if (topEngines.length > 0) {
    const topEngine = topEngines[0];
    recommendations.push(
      `${topEngine.name} is the most critical engine (PR=${topEngine.pageRank.toFixed(4)}) — apply stricter validation`
    );
  }

  const highImportEngines = sorted.filter((e) => e.imports.length > 5);
  if (highImportEngines.length > 0) {
    recommendations.push(
      `${highImportEngines.length} engines have >5 dependencies — consider refactoring for lower coupling`
    );
  }

  const report: PageRankReport = {
    timestamp: Date.now(),
    totalEngines: graph.size,
    iterations,
    damping,
    converged,
    topEngines,
    criticalPaths,
    recommendations,
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: PageRankReport): void {
  console.log("\n=== Engine PageRank Report ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Total Engines: ${report.totalEngines}`);
  console.log(`Iterations: ${report.iterations} (converged: ${report.converged})`);
  console.log(`Damping Factor: ${report.damping}`);

  console.log("\nTop Engines by PageRank:");
  console.log("Rank | PageRank | Engine");
  console.log("-".repeat(50));
  report.topEngines.forEach((engine, idx) => {
    console.log(
      `  ${(idx + 1).toString().padStart(2)} | ${engine.pageRank.toFixed(4).padStart(8)} | ${engine.name}`
    );
  });

  if (report.criticalPaths.length > 0) {
    console.log("\nCritical Dependency Paths:");
    for (const path of report.criticalPaths) {
      console.log(`  ${path.join(" → ")}`);
    }
  }

  if (report.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of report.recommendations) {
      console.log(`  → ${rec}`);
    }
  }
}

// Main
const args = process.argv.slice(2);
const topArg = args.find((a) => a.startsWith("--top="));
const dampingArg = args.find((a) => a.startsWith("--damping="));

const topN = topArg ? parseInt(topArg.split("=")[1]) : 10;
const damping = dampingArg ? parseFloat(dampingArg.split("=")[1]) : 0.85;

generateReport(topN, damping).then(printReport);
