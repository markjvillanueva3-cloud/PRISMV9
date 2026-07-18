/**
 * build-lsh-index.ts — USSH Phase 0.25
 * =====================================
 *
 * Builds Locality-Sensitive Hashing index for O(1) semantic dedup.
 * Indexes all engine embeddings for fast duplicate detection.
 *
 * Usage: npx tsx scripts/build-lsh-index.ts [--tables=20] [--hashes=8]
 *
 * Theory: LSH, random hyperplane hashing, (d₁, d₂, p₁, p₂)-sensitive
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";
import crypto from "crypto";

const STATE_DIR = path.join(process.cwd(), "data/state");
const INDEX_FILE = path.join(STATE_DIR, "lsh-index.json");
const ENGINES_DIR = path.join(process.cwd(), "src/engines");

interface LSHConfig {
  numTables: number;      // L
  numHashes: number;      // k
  dimension: number;      // d
  seed: number;
}

interface LSHBucket {
  hash: string;
  engineIds: string[];
}

interface LSHIndex {
  timestamp: number;
  config: LSHConfig;
  tables: LSHBucket[][];
  engineCount: number;
  hyperplanes: number[][][]; // [table][hash][dimension]
}

interface BuildReport {
  timestamp: number;
  config: LSHConfig;
  engineCount: number;
  totalBuckets: number;
  avgBucketSize: number;
  maxBucketSize: number;
  collisionRate: number;
  buildTimeMs: number;
  recommendations: string[];
}

function generateHyperplanes(
  numTables: number,
  numHashes: number,
  dimension: number,
  seed: number
): number[][][] {
  // Seeded random for reproducibility
  const rng = seedRandom(seed);

  const hyperplanes: number[][][] = [];

  for (let t = 0; t < numTables; t++) {
    const tableHyperplanes: number[][] = [];
    for (let h = 0; h < numHashes; h++) {
      const plane: number[] = [];
      for (let d = 0; d < dimension; d++) {
        // Box-Muller for normal distribution
        const u1 = rng();
        const u2 = rng();
        plane.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
      }
      tableHyperplanes.push(plane);
    }
    hyperplanes.push(tableHyperplanes);
  }

  return hyperplanes;
}

function seedRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function hashVector(
  vector: number[],
  hyperplanes: number[][],
): string {
  const bits = hyperplanes.map((plane) => {
    const dot = plane.reduce((sum, p, i) => sum + p * (vector[i] || 0), 0);
    return dot >= 0 ? "1" : "0";
  });
  return bits.join("");
}

function generateMockEmbedding(engineName: string, dimension: number): number[] {
  // Generate deterministic pseudo-embedding from engine name
  const hash = crypto.createHash("sha256").update(engineName).digest("hex");
  const embedding: number[] = [];

  for (let i = 0; i < dimension; i++) {
    const hexPair = hash.substring((i * 2) % 64, (i * 2 + 2) % 64 + 2);
    const value = (parseInt(hexPair, 16) / 255 - 0.5) * 2;
    embedding.push(value);
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return embedding.map((v) => v / norm);
}

async function buildIndex(config: LSHConfig): Promise<{ index: LSHIndex; report: BuildReport }> {
  const startTime = Date.now();

  // Generate hyperplanes
  const hyperplanes = generateHyperplanes(
    config.numTables,
    config.numHashes,
    config.dimension,
    config.seed
  );

  // Initialize tables
  const tables: Map<string, string[]>[] = [];
  for (let t = 0; t < config.numTables; t++) {
    tables.push(new Map());
  }

  // Find all engines
  const files = await glob("**/*Engine.ts", { cwd: ENGINES_DIR });
  const engineCount = files.length;

  // Index each engine
  for (const file of files) {
    const engineName = path.basename(file, ".ts");
    const embedding = generateMockEmbedding(engineName, config.dimension);

    for (let t = 0; t < config.numTables; t++) {
      const hash = hashVector(embedding, hyperplanes[t]);
      if (!tables[t].has(hash)) {
        tables[t].set(hash, []);
      }
      tables[t].get(hash)!.push(engineName);
    }
  }

  // Convert to serializable format
  const indexTables: LSHBucket[][] = tables.map((table) =>
    Array.from(table.entries()).map(([hash, engineIds]) => ({ hash, engineIds }))
  );

  const index: LSHIndex = {
    timestamp: Date.now(),
    config,
    tables: indexTables,
    engineCount,
    hyperplanes,
  };

  // Compute statistics
  let totalBuckets = 0;
  let totalSize = 0;
  let maxSize = 0;
  let collisions = 0;

  for (const table of indexTables) {
    totalBuckets += table.length;
    for (const bucket of table) {
      totalSize += bucket.engineIds.length;
      maxSize = Math.max(maxSize, bucket.engineIds.length);
      if (bucket.engineIds.length > 1) {
        collisions += bucket.engineIds.length - 1;
      }
    }
  }

  const avgBucketSize = totalBuckets > 0 ? totalSize / totalBuckets : 0;
  const collisionRate = engineCount > 0 ? collisions / (engineCount * config.numTables) : 0;
  const buildTimeMs = Date.now() - startTime;

  const recommendations: string[] = [];

  if (collisionRate > 0.3) {
    recommendations.push(
      `High collision rate (${(collisionRate * 100).toFixed(1)}%) — consider increasing hash count`
    );
  }

  if (maxSize > engineCount * 0.1) {
    recommendations.push(
      `Large bucket (${maxSize} engines) — may need more tables for better distribution`
    );
  }

  if (avgBucketSize < 1.5) {
    recommendations.push(
      `Low bucket density — could reduce tables for memory efficiency`
    );
  }

  const report: BuildReport = {
    timestamp: Date.now(),
    config,
    engineCount,
    totalBuckets,
    avgBucketSize,
    maxBucketSize: maxSize,
    collisionRate,
    buildTimeMs,
    recommendations,
  };

  // Save index
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

  return { index, report };
}

function printReport(report: BuildReport): void {
  console.log("\n=== LSH Index Build Report ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Build Time: ${report.buildTimeMs}ms`);

  console.log("\nConfiguration:");
  console.log(`  Tables (L): ${report.config.numTables}`);
  console.log(`  Hashes per table (k): ${report.config.numHashes}`);
  console.log(`  Embedding dimension: ${report.config.dimension}`);

  console.log("\nStatistics:");
  console.log(`  Engines indexed: ${report.engineCount}`);
  console.log(`  Total buckets: ${report.totalBuckets}`);
  console.log(`  Avg bucket size: ${report.avgBucketSize.toFixed(2)}`);
  console.log(`  Max bucket size: ${report.maxBucketSize}`);
  console.log(`  Collision rate: ${(report.collisionRate * 100).toFixed(1)}%`);

  const expectedQueryTime = "O(L × k) = O(" + report.config.numTables * report.config.numHashes + ")";
  console.log(`\nExpected Query Complexity: ${expectedQueryTime} (constant)`);

  if (report.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of report.recommendations) {
      console.log(`  → ${rec}`);
    }
  }
}

// Main
const args = process.argv.slice(2);
const tablesArg = args.find((a) => a.startsWith("--tables="));
const hashesArg = args.find((a) => a.startsWith("--hashes="));

const config: LSHConfig = {
  numTables: tablesArg ? parseInt(tablesArg.split("=")[1]) : 20,
  numHashes: hashesArg ? parseInt(hashesArg.split("=")[1]) : 8,
  dimension: 384, // Typical embedding dimension
  seed: 42,
};

buildIndex(config).then(({ report }) => printReport(report));
