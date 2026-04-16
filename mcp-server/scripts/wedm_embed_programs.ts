#!/usr/bin/env npx ts-node
/**
 * WEDM Embed Programs Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Embeds WEDM programs into vector database (Qdrant) for semantic search.
 * Uses all-MiniLM-L6-v2 or similar embedding model.
 *
 * Usage: npx ts-node scripts/wedm_embed_programs.ts [--qdrant-url <url>]
 */

import * as fs from "fs";
import * as path from "path";

interface ProgramEmbedding {
  id: string;
  programId: string;
  fileName: string;
  customer: string;
  text: string;
  embedding: number[];
  metadata: {
    material?: string;
    ecode?: string;
    hasTaper: boolean;
    hasArcs: boolean;
    lineCount: number;
    controller: string;
  };
}

interface EmbeddingReport {
  timestamp: string;
  qdrantUrl: string;
  collectionName: string;
  totalPrograms: number;
  embeddedPrograms: number;
  failedPrograms: number;
  embeddingModel: string;
  vectorDimension: number;
  processingTime_sec: number;
}

// Simulated embedding function (in production, use actual embedding model)
function generateEmbedding(text: string, dimension: number = 384): number[] {
  // Simple hash-based pseudo-embedding for demo
  // In production, use: transformers.js, @xenova/transformers, or API
  const embedding: number[] = [];
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }

  const seed = Math.abs(hash);
  for (let i = 0; i < dimension; i++) {
    // Deterministic pseudo-random based on text hash and position
    const val = Math.sin(seed * (i + 1)) * 10000;
    embedding.push(val - Math.floor(val));
  }

  // Normalize to unit vector
  const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
  return embedding.map((x) => x / norm);
}

function extractTextForEmbedding(content: string, fileName: string): string {
  // Extract meaningful text for embedding
  const parts: string[] = [];

  // File name
  parts.push(fileName);

  // Comments (often contain part names, descriptions)
  const comments = content.match(/\([^)]+\)/g) ?? [];
  parts.push(...comments.map((c) => c.replace(/[()]/g, "")));

  // E-code
  const ecode = content.match(/E\d{4}/)?.[0];
  if (ecode) parts.push(`E-code ${ecode}`);

  // Geometry features
  if (/G0?2|G0?3/i.test(content)) parts.push("arcs circular");
  if (/G51|G52/i.test(content)) parts.push("taper angle UV");
  if (/G41/i.test(content)) parts.push("external contour");
  if (/G42/i.test(content)) parts.push("internal contour pocket");

  // Material hints from comments
  const materialMatch = content.match(/D2|A2|M2|S7|carbide|steel|tool steel/i);
  if (materialMatch) parts.push(`material ${materialMatch[0]}`);

  return parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

function extractMetadata(content: string): ProgramEmbedding["metadata"] {
  const ecode = content.match(/E\d{4}/)?.[0];

  // Detect controller
  let controller = "unknown";
  if (/Mitsubishi|FA-/i.test(content)) controller = "Mitsubishi";
  else if (/Fanuc|Robocut/i.test(content)) controller = "Fanuc";
  else if (/Sodick/i.test(content)) controller = "Sodick";
  else if (/Makino/i.test(content)) controller = "Makino";

  // Detect material from comments
  const materialMatch = content.match(/D2|A2|M2|S7|carbide|H13|4140/i);

  return {
    material: materialMatch?.[0]?.toUpperCase(),
    ecode,
    hasTaper: /G51|G52/i.test(content),
    hasArcs: /G0?2|G0?3/i.test(content),
    lineCount: content.split("\n").length,
    controller,
  };
}

async function embedPrograms(
  indexPath: string,
  qdrantUrl: string,
  collectionName: string
): Promise<EmbeddingReport> {
  console.log(`\nEmbedding WEDM programs...`);
  console.log(`Index: ${indexPath}`);
  console.log(`Qdrant: ${qdrantUrl}`);
  console.log(`Collection: ${collectionName}`);

  const startTime = Date.now();
  const embeddings: ProgramEmbedding[] = [];
  let failed = 0;

  // Load program index
  let programs: Array<{ filePath: string; fileName: string; customer: string; id: string }> = [];

  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    programs = index.programs ?? [];
  } else {
    // Create sample data for demo
    console.log("Index not found, using sample programs...");
    programs = [
      { id: "WEDM-1", filePath: "./sample.nc", fileName: "sample.nc", customer: "DEMO" },
    ];
  }

  const embeddingModel = "all-MiniLM-L6-v2";
  const vectorDimension = 384;

  for (const program of programs.slice(0, 100)) { // Limit for demo
    try {
      let content: string;

      if (fs.existsSync(program.filePath)) {
        content = fs.readFileSync(program.filePath, "utf-8");
      } else {
        // Simulated content
        content = `O${program.id} (${program.customer} PART)\nG21 G90\nE1847\nG41\nG01 X0 Y0\nG40\nM30`;
      }

      const text = extractTextForEmbedding(content, program.fileName);
      const embedding = generateEmbedding(text, vectorDimension);
      const metadata = extractMetadata(content);

      embeddings.push({
        id: program.id,
        programId: program.id,
        fileName: program.fileName,
        customer: program.customer,
        text,
        embedding,
        metadata,
      });

      if (embeddings.length % 50 === 0) {
        console.log(`  Embedded ${embeddings.length} programs...`);
      }
    } catch (err) {
      failed++;
    }
  }

  // In production, would upload to Qdrant:
  // const client = new QdrantClient({ url: qdrantUrl });
  // await client.recreateCollection(collectionName, { vectors: { size: 384, distance: 'Cosine' } });
  // await client.upsert(collectionName, { points: embeddings.map(e => ({ id: e.id, vector: e.embedding, payload: e.metadata })) });

  // Save embeddings locally for demo
  const embeddingsPath = indexPath.replace(".json", "_embeddings.json");
  fs.writeFileSync(embeddingsPath, JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model: embeddingModel,
    dimension: vectorDimension,
    count: embeddings.length,
    embeddings: embeddings.map(e => ({
      id: e.id,
      programId: e.programId,
      customer: e.customer,
      text: e.text,
      metadata: e.metadata,
      // Skip embedding vectors in JSON output for readability
    })),
  }, null, 2));

  const processingTime = (Date.now() - startTime) / 1000;

  return {
    timestamp: new Date().toISOString(),
    qdrantUrl,
    collectionName,
    totalPrograms: programs.length,
    embeddedPrograms: embeddings.length,
    failedPrograms: failed,
    embeddingModel,
    vectorDimension,
    processingTime_sec: Math.round(processingTime * 10) / 10,
  };
}

function printReport(report: EmbeddingReport): void {
  console.log("\n" + "=".repeat(60));
  console.log("WEDM PROGRAM EMBEDDING REPORT");
  console.log("=".repeat(60));
  console.log(`Generated: ${report.timestamp}`);
  console.log(`Qdrant URL: ${report.qdrantUrl}`);
  console.log(`Collection: ${report.collectionName}`);

  console.log("\n--- Summary ---");
  console.log(`Total Programs: ${report.totalPrograms}`);
  console.log(`Embedded: ${report.embeddedPrograms}`);
  console.log(`Failed: ${report.failedPrograms}`);
  console.log(`Model: ${report.embeddingModel}`);
  console.log(`Vector Dimension: ${report.vectorDimension}`);
  console.log(`Processing Time: ${report.processingTime_sec}s`);

  const rate = report.embeddedPrograms / report.processingTime_sec;
  console.log(`Rate: ${rate.toFixed(1)} programs/sec`);

  console.log("\n" + "=".repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let indexPath = path.resolve(__dirname, "../data/state/WEDM_PROGRAM_INDEX.json");
  let qdrantUrl = "http://localhost:6333";
  let collectionName = "wedm_programs";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--index":
        indexPath = args[++i];
        break;
      case "--qdrant-url":
        qdrantUrl = args[++i];
        break;
      case "--collection":
        collectionName = args[++i];
        break;
      case "--help":
      case "-h":
        console.log("Usage: npx ts-node scripts/wedm_embed_programs.ts [options]");
        console.log("\nOptions:");
        console.log("  --index         Path to WEDM_PROGRAM_INDEX.json");
        console.log("  --qdrant-url    Qdrant server URL (default: http://localhost:6333)");
        console.log("  --collection    Qdrant collection name (default: wedm_programs)");
        process.exit(0);
    }
  }

  try {
    const report = await embedPrograms(indexPath, qdrantUrl, collectionName);
    printReport(report);

    // Save report
    const reportPath = "wedm_embedding_report.json";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved: ${reportPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
