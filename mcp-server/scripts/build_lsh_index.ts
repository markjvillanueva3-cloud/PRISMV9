#!/usr/bin/env npx tsx
/**
 * Build LSH Index — Phase 0.25
 * =============================
 * Builds Locality-Sensitive Hashing index for O(1) semantic dedup.
 *
 * Theory: Random hyperplane LSH for cosine similarity
 * Usage: npx tsx scripts/build_lsh_index.ts
 */

import * as fs from "fs";
import * as path from "path";

interface LSHIndex {
  schemaVersion: number;
  timestamp: string;
  numTables: number;
  numHashes: number;
  embeddingDim: number;
  engineCount: number;
  hyperplanes: number[][][];
  buckets: Record<string, string[]>[];
}

const NUM_TABLES = 20;
const NUM_HASHES = 8;
const EMBEDDING_DIM = 384;

function generateHyperplane(dim: number): number[] {
  const plane: number[] = [];
  for (let i = 0; i < dim; i++) {
    plane.push((Math.random() - 0.5) * 2);
  }
  const norm = Math.sqrt(plane.reduce((s, v) => s + v * v, 0));
  return plane.map((v) => v / norm);
}

function hashVector(vec: number[], hyperplanes: number[][]): string {
  return hyperplanes
    .map((hp) => {
      const dot = vec.reduce((s, v, i) => s + v * hp[i], 0);
      return dot >= 0 ? "1" : "0";
    })
    .join("");
}

async function main(): Promise<void> {
  console.log("=== Building LSH Index ===");
  console.log(`Tables: ${NUM_TABLES}, Hashes/table: ${NUM_HASHES}, Dim: ${EMBEDDING_DIM}`);

  const hyperplanes: number[][][] = [];
  const buckets: Record<string, string[]>[] = [];

  for (let t = 0; t < NUM_TABLES; t++) {
    const tableHyperplanes: number[][] = [];
    for (let h = 0; h < NUM_HASHES; h++) {
      tableHyperplanes.push(generateHyperplane(EMBEDDING_DIM));
    }
    hyperplanes.push(tableHyperplanes);
    buckets.push({});
  }

  const embeddingsPath = path.join(process.cwd(), "data/state/engine-embeddings.json");
  let engineCount = 0;

  if (fs.existsSync(embeddingsPath)) {
    const embeddings: Record<string, number[]> = JSON.parse(
      fs.readFileSync(embeddingsPath, "utf-8")
    );

    for (const [engineId, vec] of Object.entries(embeddings)) {
      engineCount++;
      for (let t = 0; t < NUM_TABLES; t++) {
        const hash = hashVector(vec, hyperplanes[t]);
        if (!buckets[t][hash]) {
          buckets[t][hash] = [];
        }
        buckets[t][hash].push(engineId);
      }
    }
    console.log(`Indexed ${engineCount} engines`);
  } else {
    console.log("No embeddings found — index will be empty (populate with engine embeddings)");
  }

  const index: LSHIndex = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    numTables: NUM_TABLES,
    numHashes: NUM_HASHES,
    embeddingDim: EMBEDDING_DIM,
    engineCount,
    hyperplanes,
    buckets,
  };

  const outPath = path.join(process.cwd(), "data/state/lsh-index.json");
  fs.writeFileSync(outPath, JSON.stringify(index));
  console.log(`Index saved to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);

  const avgBucketSize =
    buckets.reduce((s, b) => s + Object.values(b).reduce((ss, arr) => ss + arr.length, 0), 0) /
    (NUM_TABLES * Math.max(Object.keys(buckets[0]).length, 1));
  console.log(`Avg bucket size: ${avgBucketSize.toFixed(2)} (target: <10 for O(1) lookups)`);
}

main().catch(console.error);
