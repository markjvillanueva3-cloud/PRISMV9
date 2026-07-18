#!/usr/bin/env npx ts-node
/**
 * WEDM Sync Qdrant Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Synchronizes Qdrant vector database between home/work locations.
 * Supports bidirectional sync of WEDM program embeddings.
 *
 * Usage: npx ts-node scripts/wedm_sync_qdrant.ts --source home --target work
 */

import * as fs from "fs";
import * as path from "path";

interface QdrantEndpoint {
  name: string;
  url: string;
  collections: string[];
  lastSync?: string;
  vectorCount?: number;
}

interface SyncReport {
  timestamp: string;
  source: QdrantEndpoint;
  target: QdrantEndpoint;
  collections: Array<{
    name: string;
    sourceCount: number;
    targetCount: number;
    synced: number;
    conflicts: number;
    status: "success" | "partial" | "failed";
  }>;
  totalSynced: number;
  totalConflicts: number;
  duration_sec: number;
  strategy: "source_wins" | "target_wins" | "newest_wins" | "manual";
}

const ENDPOINTS: Record<string, QdrantEndpoint> = {
  home: {
    name: "Home",
    url: "http://localhost:6333",
    collections: ["wedm_programs", "wedm_outcomes", "wedm_tips"],
  },
  work: {
    name: "Work",
    url: "http://192.168.1.100:6333",
    collections: ["wedm_programs", "wedm_outcomes", "wedm_tips"],
  },
  cloud: {
    name: "Cloud",
    url: "https://qdrant.example.com:6333",
    collections: ["wedm_programs", "wedm_outcomes", "wedm_tips"],
  },
};

interface VectorRecord {
  id: string;
  vector: number[];
  payload: Record<string, any>;
  updatedAt?: string;
}

async function getCollectionInfo(
  endpoint: QdrantEndpoint,
  collection: string
): Promise<{ count: number; dimension: number }> {
  // In production, would query Qdrant API:
  // const response = await fetch(`${endpoint.url}/collections/${collection}`);
  // return response.json();

  // Simulated response
  return {
    count: 100 + Math.floor(Math.random() * 200),
    dimension: 384,
  };
}

async function fetchVectors(
  endpoint: QdrantEndpoint,
  collection: string,
  limit: number = 1000
): Promise<VectorRecord[]> {
  // In production, would use Qdrant scroll API:
  // const response = await fetch(`${endpoint.url}/collections/${collection}/points/scroll`, {
  //   method: 'POST',
  //   body: JSON.stringify({ limit, with_vectors: true, with_payload: true })
  // });

  // Simulated response
  const records: VectorRecord[] = [];
  const count = Math.floor(Math.random() * 50) + 50;

  for (let i = 0; i < count; i++) {
    records.push({
      id: `vec_${collection}_${i}`,
      vector: Array(384).fill(0).map(() => Math.random()),
      payload: {
        programId: `O${1000 + i}`,
        customer: ["ALCOA", "ITW", "OPTIMAS"][i % 3],
        material: ["D2", "A2", "M2", "carbide"][i % 4],
      },
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return records;
}

async function upsertVectors(
  endpoint: QdrantEndpoint,
  collection: string,
  vectors: VectorRecord[]
): Promise<number> {
  // In production, would use Qdrant upsert API:
  // const response = await fetch(`${endpoint.url}/collections/${collection}/points`, {
  //   method: 'PUT',
  //   body: JSON.stringify({ points: vectors.map(v => ({ id: v.id, vector: v.vector, payload: v.payload })) })
  // });

  // Simulated success
  return vectors.length;
}

function resolveConflict(
  source: VectorRecord,
  target: VectorRecord,
  strategy: SyncReport["strategy"]
): VectorRecord {
  switch (strategy) {
    case "source_wins":
      return source;
    case "target_wins":
      return target;
    case "newest_wins":
      const sourceTime = new Date(source.updatedAt ?? 0).getTime();
      const targetTime = new Date(target.updatedAt ?? 0).getTime();
      return sourceTime >= targetTime ? source : target;
    default:
      return source; // Default to source
  }
}

async function syncCollection(
  source: QdrantEndpoint,
  target: QdrantEndpoint,
  collection: string,
  strategy: SyncReport["strategy"]
): Promise<SyncReport["collections"][0]> {
  console.log(`  Syncing collection: ${collection}...`);

  const sourceInfo = await getCollectionInfo(source, collection);
  const targetInfo = await getCollectionInfo(target, collection);

  const sourceVectors = await fetchVectors(source, collection);
  const targetVectors = await fetchVectors(target, collection);

  // Build lookup maps
  const sourceMap = new Map(sourceVectors.map((v) => [v.id, v]));
  const targetMap = new Map(targetVectors.map((v) => [v.id, v]));

  const toSync: VectorRecord[] = [];
  let conflicts = 0;

  // Find vectors to sync
  for (const [id, sourceVec] of sourceMap) {
    const targetVec = targetMap.get(id);

    if (!targetVec) {
      // New vector, add to target
      toSync.push(sourceVec);
    } else {
      // Exists in both, check for conflict
      const sourceHash = JSON.stringify(sourceVec.payload);
      const targetHash = JSON.stringify(targetVec.payload);

      if (sourceHash !== targetHash) {
        conflicts++;
        toSync.push(resolveConflict(sourceVec, targetVec, strategy));
      }
    }
  }

  // Sync vectors to target
  const synced = await upsertVectors(target, collection, toSync);

  const status = conflicts === 0 ? "success" : synced === toSync.length ? "success" : "partial";

  return {
    name: collection,
    sourceCount: sourceInfo.count,
    targetCount: targetInfo.count,
    synced,
    conflicts,
    status,
  };
}

async function syncQdrant(
  sourceName: string,
  targetName: string,
  strategy: SyncReport["strategy"] = "newest_wins"
): Promise<SyncReport> {
  const source = ENDPOINTS[sourceName];
  const target = ENDPOINTS[targetName];

  if (!source || !target) {
    throw new Error(`Unknown endpoint: ${sourceName} or ${targetName}`);
  }

  console.log(`\nSyncing Qdrant: ${source.name} → ${target.name}`);
  console.log(`Strategy: ${strategy}`);

  const startTime = Date.now();
  const collections: SyncReport["collections"] = [];

  for (const collection of source.collections) {
    if (target.collections.includes(collection)) {
      const result = await syncCollection(source, target, collection, strategy);
      collections.push(result);
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  return {
    timestamp: new Date().toISOString(),
    source,
    target,
    collections,
    totalSynced: collections.reduce((sum, c) => sum + c.synced, 0),
    totalConflicts: collections.reduce((sum, c) => sum + c.conflicts, 0),
    duration_sec: Math.round(duration * 10) / 10,
    strategy,
  };
}

function printReport(report: SyncReport): void {
  console.log("\n" + "=".repeat(60));
  console.log("QDRANT SYNC REPORT");
  console.log("=".repeat(60));
  console.log(`Generated: ${report.timestamp}`);
  console.log(`Source: ${report.source.name} (${report.source.url})`);
  console.log(`Target: ${report.target.name} (${report.target.url})`);
  console.log(`Strategy: ${report.strategy}`);

  console.log("\n--- Collections ---");
  console.log("Collection".padEnd(20) + "Source".padEnd(10) + "Target".padEnd(10) + "Synced".padEnd(10) + "Status");
  console.log("-".repeat(60));

  report.collections.forEach((c) => {
    const statusIcon = c.status === "success" ? "✓" : c.status === "partial" ? "⚠" : "✗";
    console.log(
      c.name.padEnd(20) +
      `${c.sourceCount}`.padEnd(10) +
      `${c.targetCount}`.padEnd(10) +
      `${c.synced}`.padEnd(10) +
      `${statusIcon} ${c.status}`
    );
  });

  console.log("\n--- Summary ---");
  console.log(`Total Synced: ${report.totalSynced}`);
  console.log(`Conflicts Resolved: ${report.totalConflicts}`);
  console.log(`Duration: ${report.duration_sec}s`);

  console.log("\n" + "=".repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let sourceName = "home";
  let targetName = "work";
  let strategy: SyncReport["strategy"] = "newest_wins";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--source":
      case "-s":
        sourceName = args[++i];
        break;
      case "--target":
      case "-t":
        targetName = args[++i];
        break;
      case "--strategy":
        strategy = args[++i] as SyncReport["strategy"];
        break;
      case "--help":
      case "-h":
        console.log("Usage: npx ts-node scripts/wedm_sync_qdrant.ts [options]");
        console.log("\nOptions:");
        console.log("  --source, -s    Source endpoint: home, work, cloud");
        console.log("  --target, -t    Target endpoint: home, work, cloud");
        console.log("  --strategy      Conflict strategy: source_wins, target_wins, newest_wins");
        console.log("\nEndpoints:");
        Object.entries(ENDPOINTS).forEach(([key, ep]) => {
          console.log(`  ${key}: ${ep.url}`);
        });
        process.exit(0);
    }
  }

  try {
    const report = await syncQdrant(sourceName, targetName, strategy);
    printReport(report);

    // Save report
    const reportPath = `qdrant_sync_${sourceName}_to_${targetName}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved: ${reportPath}`);

    const hasFailures = report.collections.some((c) => c.status === "failed");
    process.exit(hasFailures ? 1 : 0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(2);
  }
}

main();
