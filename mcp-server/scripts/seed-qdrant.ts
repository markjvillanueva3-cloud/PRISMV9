#!/usr/bin/env npx tsx
/**
 * Seed Qdrant — Populate vector store with PRISM assets
 *
 * Seeds the Qdrant vector database with embeddings from:
 * - Engines (filename + JSDoc description)
 * - Formulas (from formula registry)
 * - Skills (from ~/.claude/commands/)
 * - Tribal tips (from data/tribal-knowledge/)
 * - Algorithms (from src/algorithms/)
 *
 * Prerequisites:
 *   docker compose up -d qdrant ollama
 *   docker exec prism-ollama ollama pull nomic-embed-text
 *
 * Usage:
 *   npx tsx scripts/seed-qdrant.ts           # all asset types
 *   npx tsx scripts/seed-qdrant.ts engines   # engines only
 *   npx tsx scripts/seed-qdrant.ts formulas  # formulas only
 *   npx tsx scripts/seed-qdrant.ts skills    # skills only
 *   npx tsx scripts/seed-qdrant.ts tips      # tribal tips only
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const EMBED_MODEL = "nomic-embed-text";
const VECTOR_SIZE = 768;
const BATCH_SIZE = 50;

interface Asset {
  id: string;
  kind: string;
  name: string;
  description: string;
  tags: string[];
  sourceFile?: string;
}

interface EmbedResult {
  ok: boolean;
  vector?: number[];
  error?: string;
}

interface SeedReport {
  collection: string;
  assetsScanned: number;
  assetsEmbedded: number;
  errors: string[];
  durationMs: number;
}

// ============================================================================
// QDRANT CLIENT
// ============================================================================

async function qdrantPing(): Promise<boolean> {
  try {
    const res = await fetch(`${QDRANT_URL}/collections`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

async function qdrantEnsureCollection(name: string): Promise<boolean> {
  try {
    const checkRes = await fetch(`${QDRANT_URL}/collections/${name}`);
    if (checkRes.ok) return true;

    const createRes = await fetch(`${QDRANT_URL}/collections/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      }),
    });
    return createRes.ok;
  } catch {
    return false;
  }
}

async function qdrantUpsert(
  collection: string,
  points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>
): Promise<boolean> {
  try {
    // Convert string IDs to numeric (Qdrant prefers numeric or UUID)
    const numericPoints = points.map((p, i) => ({
      id: hashStringToNumber(p.id),
      vector: p.vector,
      payload: { ...p.payload, externalId: p.id },
    }));

    const res = await fetch(`${QDRANT_URL}/collections/${collection}/points?wait=true`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: numericPoints }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function hashStringToNumber(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ============================================================================
// OLLAMA CLIENT
// ============================================================================

async function ollamaPing(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

async function ollamaEmbed(text: string): Promise<EmbedResult> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, vector: data.embedding };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ============================================================================
// ASSET COLLECTORS
// ============================================================================

function collectEngines(): Asset[] {
  const enginesDir = path.join(__dirname, "..", "src", "engines");
  if (!fs.existsSync(enginesDir)) return [];

  const files = fs.readdirSync(enginesDir).filter((f) => f.endsWith("Engine.ts"));
  return files.map((f) => {
    const name = f.replace(".ts", "");
    const filePath = path.join(enginesDir, f);
    const content = fs.readFileSync(filePath, "utf8");

    // Extract JSDoc description
    const jsdocMatch = content.match(/\/\*\*\s*\n([^*]|\*(?!\/))*\*\//);
    let description = name;
    if (jsdocMatch) {
      const jsdoc = jsdocMatch[0];
      const descMatch = jsdoc.match(/\*\s*([A-Z].*?)(?:\n\s*\*\s*\n|\n\s*\*\s*@)/s);
      if (descMatch) {
        description = descMatch[1].replace(/\s*\n\s*\*\s*/g, " ").trim();
      }
    }

    // Extract tags from name
    const tags: string[] = [];
    if (name.includes("Force")) tags.push("force");
    if (name.includes("Speed") || name.includes("Feed")) tags.push("speed-feed");
    if (name.includes("Tool")) tags.push("tooling");
    if (name.includes("Safety")) tags.push("safety");
    if (name.includes("Thermal")) tags.push("thermal");
    if (name.includes("WEDM") || name.includes("EDM")) tags.push("edm");
    if (name.includes("Lathe") || name.includes("Turning")) tags.push("lathe");
    if (name.includes("Mill")) tags.push("milling");
    if (name.includes("Neural") || name.includes("AI")) tags.push("ai");

    return {
      id: `engine:${name}`,
      kind: "engine",
      name,
      description,
      tags,
      sourceFile: f,
    };
  });
}

function collectFormulas(): Asset[] {
  const formulaFiles = [
    path.join(__dirname, "..", "src", "data", "formula-registry.ts"),
    path.join(__dirname, "..", "src", "registries", "FormulaRegistry.ts"),
  ];

  const assets: Asset[] = [];
  for (const file of formulaFiles) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf8");

    // Extract formula entries (id: "...", name: "...", description: "...")
    const formulaPattern = /id:\s*["']([^"']+)["'][\s\S]*?name:\s*["']([^"']+)["'][\s\S]*?(?:description:\s*["']([^"']+)["'])?/g;
    let match;
    while ((match = formulaPattern.exec(content)) !== null) {
      assets.push({
        id: `formula:${match[1]}`,
        kind: "formula",
        name: match[2],
        description: match[3] ?? match[2],
        tags: ["formula", "physics"],
        sourceFile: path.basename(file),
      });
    }
  }
  return assets;
}

function collectSkills(): Asset[] {
  const skillsDir = "C:/Users/wompu/.claude/commands";
  if (!fs.existsSync(skillsDir)) return [];

  const assets: Asset[] = [];
  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        const content = fs.readFileSync(fullPath, "utf8");
        const name = entry.name.replace(".md", "");

        // Extract first heading as description
        const headingMatch = content.match(/^#\s+(.+)$/m);
        const description = headingMatch ? headingMatch[1] : name;

        // Extract tags from path
        const tags: string[] = ["skill"];
        const relPath = fullPath.replace(skillsDir, "");
        if (relPath.includes("wedm")) tags.push("wedm");
        if (relPath.includes("lathe")) tags.push("lathe");
        if (relPath.includes("mill")) tags.push("milling");
        if (relPath.includes("analysis")) tags.push("analysis");
        if (relPath.includes("learning")) tags.push("learning");

        assets.push({
          id: `skill:${name}`,
          kind: "skill",
          name,
          description,
          tags,
          sourceFile: relPath,
        });
      }
    }
  };
  walk(skillsDir);
  return assets;
}

function collectTribalTips(): Asset[] {
  const tipsDir = path.join(__dirname, "..", "data", "tribal-knowledge");
  if (!fs.existsSync(tipsDir)) return [];

  const assets: Asset[] = [];
  const files = fs.readdirSync(tipsDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(tipsDir, file), "utf8");
      const data = JSON.parse(content);

      if (Array.isArray(data.tips)) {
        for (const tip of data.tips) {
          assets.push({
            id: `tip:${tip.id ?? hashStringToNumber(tip.title ?? tip.content ?? "").toString()}`,
            kind: "tribal_tip",
            name: tip.title ?? "Tribal Tip",
            description: tip.content ?? tip.description ?? tip.title ?? "",
            tags: tip.tags ?? ["tribal"],
            sourceFile: file,
          });
        }
      }
    } catch {
      // Skip invalid JSON
    }
  }
  return assets;
}

// ============================================================================
// SEEDING
// ============================================================================

async function seedCollection(collectionName: string, assets: Asset[]): Promise<SeedReport> {
  const start = Date.now();
  const report: SeedReport = {
    collection: collectionName,
    assetsScanned: assets.length,
    assetsEmbedded: 0,
    errors: [],
    durationMs: 0,
  };

  if (assets.length === 0) {
    report.durationMs = Date.now() - start;
    return report;
  }

  // Ensure collection exists
  const created = await qdrantEnsureCollection(collectionName);
  if (!created) {
    report.errors.push(`Failed to create/verify collection ${collectionName}`);
    report.durationMs = Date.now() - start;
    return report;
  }

  // Process in batches
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    const points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> = [];

    for (const asset of batch) {
      const text = `${asset.name}: ${asset.description}`;
      const embed = await ollamaEmbed(text);

      if (!embed.ok || !embed.vector) {
        report.errors.push(`Embed failed for ${asset.id}: ${embed.error}`);
        continue;
      }

      points.push({
        id: asset.id,
        vector: embed.vector,
        payload: {
          kind: asset.kind,
          name: asset.name,
          description: asset.description,
          tags: asset.tags,
          sourceFile: asset.sourceFile ?? "",
        },
      });
    }

    if (points.length > 0) {
      const ok = await qdrantUpsert(collectionName, points);
      if (ok) {
        report.assetsEmbedded += points.length;
      } else {
        report.errors.push(`Upsert failed for batch ${i / BATCH_SIZE + 1}`);
      }
    }

    // Progress indicator
    const pct = Math.round(((i + batch.length) / assets.length) * 100);
    process.stdout.write(`\r  ${collectionName}: ${pct}% (${report.assetsEmbedded}/${assets.length})`);
  }
  console.log(); // newline

  report.durationMs = Date.now() - start;
  return report;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const filter = args[0]?.toLowerCase() ?? "all";

  console.log("=".repeat(60));
  console.log("PRISM Qdrant Seeder");
  console.log("=".repeat(60));

  // Health checks
  console.log("\nChecking infrastructure...");
  const qdrantOk = await qdrantPing();
  const ollamaOk = await ollamaPing();

  console.log(`  Qdrant (${QDRANT_URL}): ${qdrantOk ? "OK" : "FAIL"}`);
  console.log(`  Ollama (${OLLAMA_URL}): ${ollamaOk ? "OK" : "FAIL"}`);

  if (!qdrantOk || !ollamaOk) {
    console.error("\nInfrastructure not ready. Run: docker compose up -d qdrant ollama");
    process.exit(1);
  }

  // Collect assets
  console.log("\nCollecting assets...");
  const assetGroups: Array<{ name: string; collection: string; assets: Asset[] }> = [];

  if (filter === "all" || filter === "engines") {
    const engines = collectEngines();
    assetGroups.push({ name: "Engines", collection: "prism_engines", assets: engines });
    console.log(`  Engines: ${engines.length}`);
  }

  if (filter === "all" || filter === "formulas") {
    const formulas = collectFormulas();
    assetGroups.push({ name: "Formulas", collection: "prism_formulas", assets: formulas });
    console.log(`  Formulas: ${formulas.length}`);
  }

  if (filter === "all" || filter === "skills") {
    const skills = collectSkills();
    assetGroups.push({ name: "Skills", collection: "prism_skills", assets: skills });
    console.log(`  Skills: ${skills.length}`);
  }

  if (filter === "all" || filter === "tips") {
    const tips = collectTribalTips();
    assetGroups.push({ name: "Tribal Tips", collection: "prism_tips", assets: tips });
    console.log(`  Tribal Tips: ${tips.length}`);
  }

  // Seed each collection
  console.log("\nSeeding collections...");
  const reports: SeedReport[] = [];

  for (const group of assetGroups) {
    const report = await seedCollection(group.collection, group.assets);
    reports.push(report);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SEEDING COMPLETE");
  console.log("=".repeat(60));

  let totalEmbedded = 0;
  let totalErrors = 0;
  let totalDuration = 0;

  for (const r of reports) {
    console.log(`\n${r.collection}:`);
    console.log(`  Scanned: ${r.assetsScanned}`);
    console.log(`  Embedded: ${r.assetsEmbedded}`);
    console.log(`  Duration: ${(r.durationMs / 1000).toFixed(1)}s`);
    if (r.errors.length > 0) {
      console.log(`  Errors: ${r.errors.length}`);
    }

    totalEmbedded += r.assetsEmbedded;
    totalErrors += r.errors.length;
    totalDuration += r.durationMs;
  }

  console.log("\n" + "-".repeat(60));
  console.log(`TOTAL: ${totalEmbedded} assets embedded in ${(totalDuration / 1000).toFixed(1)}s`);
  if (totalErrors > 0) {
    console.log(`ERRORS: ${totalErrors}`);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
