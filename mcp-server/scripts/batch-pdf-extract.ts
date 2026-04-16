/**
 * Batch PDF Extraction Script
 *
 * Extracts knowledge from PDFs and saves structured data for PRISM wiring.
 * Priority: hyperMILL docs → cutting data → handbooks → training
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// ============================================================================
// TYPES
// ============================================================================

interface ExtractedKnowledge {
  source_pdf: string;
  filename: string;
  category: string;
  page_count: number;
  text_length: number;
  extracted_at: string;
  keywords_found: Record<string, number>;
  cutting_params: CuttingParam[];
  procedures: Procedure[];
  warnings: string[];
}

interface CuttingParam {
  material?: string;
  operation?: string;
  speed?: string;
  feed?: string;
  depth?: string;
  context: string; // surrounding text
}

interface Procedure {
  title: string;
  steps: string[];
  context: string;
}

interface ExtractionBatch {
  batch_id: string;
  started: string;
  completed?: string;
  total_pdfs: number;
  processed: number;
  extracted: number;
  failed: number;
  total_knowledge_objects: number;
  results: ExtractedKnowledge[];
}

// ============================================================================
// PATTERNS
// ============================================================================

const CUTTING_PATTERNS = {
  speed: /(?:cutting\s*speed|vc|spindle\s*speed|rpm)[:\s]*([0-9.,]+)\s*(m\/min|sfm|rpm)?/gi,
  feed: /(?:feed\s*rate|feed|fz|f)[:\s]*([0-9.,]+)\s*(mm\/rev|mm\/tooth|ipr|ipt|mm\/min)?/gi,
  depth: /(?:depth\s*of\s*cut|ap|doc|ae)[:\s]*([0-9.,]+)\s*(mm|in)?/gi,
  material: /(?:material|workpiece)[:\s]*([A-Za-z0-9\s-]+?)(?:\.|,|\n)/gi,
};

const PROCEDURE_MARKERS = [
  /step\s*\d+[.:]/gi,
  /\d+\.\s+[A-Z]/g, // numbered lists
  /(?:first|second|third|then|next|finally)[,:]?\s/gi,
];

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

function extractCuttingParams(text: string): CuttingParam[] {
  const params: CuttingParam[] = [];

  // Look for lines containing cutting parameters
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(" ");

    // Check if line has cutting-related content
    if (
      line.includes("speed") ||
      line.includes("feed") ||
      line.includes("depth") ||
      line.includes("rpm") ||
      line.includes("mm/min") ||
      line.includes("m/min")
    ) {
      const param: CuttingParam = { context: context.slice(0, 500) };

      // Extract speed
      const speedMatch = line.match(/([0-9.,]+)\s*(m\/min|sfm|rpm)/i);
      if (speedMatch) {
        param.speed = `${speedMatch[1]} ${speedMatch[2]}`;
      }

      // Extract feed
      const feedMatch = line.match(/([0-9.,]+)\s*(mm\/rev|mm\/tooth|mm\/min|ipr)/i);
      if (feedMatch) {
        param.feed = `${feedMatch[1]} ${feedMatch[2]}`;
      }

      // Extract depth
      const depthMatch = line.match(/([0-9.,]+)\s*(mm|in)/i);
      if (depthMatch && line.includes("depth")) {
        param.depth = `${depthMatch[1]} ${depthMatch[2]}`;
      }

      // Only save if we found at least one parameter
      if (param.speed || param.feed || param.depth) {
        params.push(param);
      }
    }
  }

  // Deduplicate
  const unique = params.filter(
    (p, i, arr) => arr.findIndex((x) => x.speed === p.speed && x.feed === p.feed) === i
  );

  return unique.slice(0, 100); // Limit to 100 per PDF
}

function extractProcedures(text: string): Procedure[] {
  const procedures: Procedure[] = [];

  // Look for numbered steps or procedure sections
  const sectionPattern = /(?:procedure|steps|how to|workflow)[:\s]*\n([\s\S]{100,2000}?)(?:\n\n|\n[A-Z])/gi;
  let match;

  while ((match = sectionPattern.exec(text)) !== null) {
    const section = match[1];
    const steps = section
      .split(/\n/)
      .filter((line) => line.match(/^\s*\d+[.)]\s+/) || line.match(/^[-•]\s+/))
      .map((line) => line.replace(/^\s*\d+[.)]\s+/, "").replace(/^[-•]\s+/, "").trim())
      .filter((line) => line.length > 10);

    if (steps.length >= 2) {
      procedures.push({
        title: "Procedure",
        steps,
        context: section.slice(0, 500),
      });
    }
  }

  return procedures.slice(0, 20); // Limit to 20 per PDF
}

function countKeywords(text: string): Record<string, number> {
  const keywords = [
    "feed", "speed", "cutting", "rpm", "mm/min", "m/min",
    "toolpath", "machining", "milling", "turning", "drilling",
    "roughing", "finishing", "tolerance", "depth", "stepover"
  ];

  const counts: Record<string, number> = {};
  const lowerText = text.toLowerCase();

  for (const kw of keywords) {
    const matches = lowerText.match(new RegExp(kw, "g"));
    counts[kw] = matches?.length || 0;
  }

  return counts;
}

async function extractPDF(filePath: string, category: string): Promise<ExtractedKnowledge> {
  const warnings: string[] = [];
  const filename = basename(filePath);

  try {
    const buffer = readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy?.();

    const text = result.text || "";

    return {
      source_pdf: filePath,
      filename,
      category,
      page_count: result.total || 0,
      text_length: text.length,
      extracted_at: new Date().toISOString(),
      keywords_found: countKeywords(text),
      cutting_params: extractCuttingParams(text),
      procedures: extractProcedures(text),
      warnings,
    };
  } catch (error) {
    warnings.push(`Extraction failed: ${error}`);
    return {
      source_pdf: filePath,
      filename,
      category,
      page_count: 0,
      text_length: 0,
      extracted_at: new Date().toISOString(),
      keywords_found: {},
      cutting_params: [],
      procedures: [],
      warnings,
    };
  }
}

function findPDFs(dir: string, category: string, results: Array<{ path: string; category: string }>, maxDepth = 5, depth = 0): void {
  if (depth > maxDepth) return;

  try {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith(".") && item !== "node_modules") {
        findPDFs(fullPath, category, results, maxDepth, depth + 1);
      } else if (item.toLowerCase().endsWith(".pdf")) {
        results.push({ path: fullPath, category });
      }
    }
  } catch {
    // Skip inaccessible directories
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("=== PRISM PDF Batch Extraction ===\n");

  const OUTPUT_DIR = "H:/prism/mcp-server/data/extracted-knowledge";
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Priority directories
  const sources = [
    { dir: "H:/prism/Resources/PDF/hyperMILL", category: "hypermill_doc" },
    { dir: "H:/prism/Resources/PDF/hyperCAD-S", category: "hypermill_doc" },
    { dir: "H:/prism/Resources/1- Basic Training Day 1", category: "training" },
    { dir: "H:/prism/Resources/2- Basic Training Day 2", category: "training" },
    { dir: "H:/prism/Resources/PDF", category: "reference" },
  ];

  // Collect PDFs
  const pdfs: Array<{ path: string; category: string }> = [];
  for (const source of sources) {
    if (existsSync(source.dir)) {
      findPDFs(source.dir, source.category, pdfs);
    }
  }

  console.log(`Found ${pdfs.length} PDFs to process\n`);

  // Limit for initial batch
  const BATCH_SIZE = 20;
  const batch: ExtractionBatch = {
    batch_id: `batch-${Date.now()}`,
    started: new Date().toISOString(),
    total_pdfs: Math.min(pdfs.length, BATCH_SIZE),
    processed: 0,
    extracted: 0,
    failed: 0,
    total_knowledge_objects: 0,
    results: [],
  };

  // Process PDFs
  for (let i = 0; i < Math.min(pdfs.length, BATCH_SIZE); i++) {
    const { path, category } = pdfs[i];
    const filename = basename(path);

    process.stdout.write(`[${i + 1}/${batch.total_pdfs}] ${filename.slice(0, 50)}... `);

    try {
      const result = await extractPDF(path, category);
      batch.results.push(result);
      batch.processed++;

      const objectCount = result.cutting_params.length + result.procedures.length;
      if (objectCount > 0) {
        batch.extracted++;
        batch.total_knowledge_objects += objectCount;
        console.log(`✓ ${objectCount} objects`);
      } else {
        console.log(`○ (no structured data)`);
      }
    } catch (error) {
      batch.failed++;
      console.log(`✗ Error: ${error}`);
    }
  }

  batch.completed = new Date().toISOString();

  // Save results
  const outputPath = join(OUTPUT_DIR, `extraction-${batch.batch_id}.json`);
  writeFileSync(outputPath, JSON.stringify(batch, null, 2));

  // Summary
  console.log(`\n=== Extraction Summary ===`);
  console.log(`Processed: ${batch.processed}/${batch.total_pdfs}`);
  console.log(`Extracted: ${batch.extracted}`);
  console.log(`Failed: ${batch.failed}`);
  console.log(`Knowledge objects: ${batch.total_knowledge_objects}`);
  console.log(`Output: ${outputPath}`);

  // Show sample cutting params
  const allParams = batch.results.flatMap((r) => r.cutting_params);
  if (allParams.length > 0) {
    console.log(`\n=== Sample Cutting Parameters ===`);
    for (const param of allParams.slice(0, 5)) {
      console.log(`  Speed: ${param.speed || "N/A"}, Feed: ${param.feed || "N/A"}, Depth: ${param.depth || "N/A"}`);
    }
  }

  console.log(`\n=== Done ===`);
}

main().catch(console.error);
