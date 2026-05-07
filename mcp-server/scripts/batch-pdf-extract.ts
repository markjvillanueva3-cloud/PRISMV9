/**
 * Batch PDF Extraction — INTEL-OLLAMA-OBSIDIAN-MS0/P21-U02
 *
 * Hybrid text + vision pipeline that REPLACES the v1 text-only flow but
 * keeps the legacy ExtractedKnowledge JSON output for backward compat with
 * extractionIngestionHook (data/extracted-knowledge/extraction-<batch>.json).
 *
 * v2 pipeline (per page):
 *   1. getText({partial:[n]}) → measure text length
 *   2. classifyPageByDensity → "text-rich" or "image-heavy"
 *   3. text-rich    → emit text chunk
 *      image-heavy  → getScreenshot({partial:[n]}) → PNG bytes →
 *                     VisionExtractionEngine (llama3.2-vision:11b) →
 *                     emit vision-described chunk
 *   4. Combined chunks → Obsidian vault entry under knowledge/ingested/
 *
 * Pure-function exports for tests:
 *   - classifyPageByDensity, slugifyPdfName, buildVaultPath
 *   - mergePageChunks, summarizePages, formatFrontmatter, formatVaultMarkdown
 *
 * Plus the v1 pure helpers (extractCuttingParams, extractProcedures,
 * countKeywords) preserved unchanged so legacy ingest hook keeps working.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P21-U02
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

import { visionExtractionEngine } from "../src/engines/VisionExtractionEngine.js";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// LEGACY TYPES (preserved for extractionIngestionHook compat) ===============

export interface ExtractedKnowledge {
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

export interface CuttingParam {
  material?: string;
  operation?: string;
  speed?: string;
  feed?: string;
  depth?: string;
  context: string;
}

export interface Procedure {
  title: string;
  steps: string[];
  context: string;
}

export interface ExtractionBatch {
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

// V2 TYPES (hybrid pipeline) ================================================

export type PageKind = "text-rich" | "image-heavy";

export interface PageChunk {
  page: number;
  kind: PageKind;
  textLength: number;
  content: string;
  warning?: string;
}

export interface PdfMeta {
  source: string;
  filename: string;
  category: string;
  totalPages: number;
  textRichPages: number;
  imageHeavyPages: number;
  visionAvailable: boolean;
  extractedAt: string;
}

export interface ExtractionEnvelope {
  meta: PdfMeta;
  chunks: PageChunk[];
  vaultPath: string | null;
  errors: string[];
  legacy?: ExtractedKnowledge;
}

// CONSTANTS =================================================================

export const DEFAULT_DENSITY_THRESHOLD = 200;
export const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/ingested";
export const DEFAULT_VISION_PROMPT =
  "Describe this manufacturing document page. Extract any tables, " +
  "diagrams, dimensions, parameter callouts, or warnings. Be terse.";

// V1 PURE FUNCTIONS (preserved) =============================================

export function extractCuttingParams(text: string): CuttingParam[] {
  const params: CuttingParam[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(" ");
    if (
      line.includes("speed") || line.includes("feed") || line.includes("depth") ||
      line.includes("rpm") || line.includes("mm/min") || line.includes("m/min")
    ) {
      const param: CuttingParam = { context: context.slice(0, 500) };
      const speedMatch = line.match(/([0-9.,]+)\s*(m\/min|sfm|rpm)/i);
      if (speedMatch) param.speed = `${speedMatch[1]} ${speedMatch[2]}`;
      const feedMatch = line.match(/([0-9.,]+)\s*(mm\/rev|mm\/tooth|mm\/min|ipr)/i);
      if (feedMatch) param.feed = `${feedMatch[1]} ${feedMatch[2]}`;
      const depthMatch = line.match(/([0-9.,]+)\s*(mm|in)/i);
      if (depthMatch && line.includes("depth")) param.depth = `${depthMatch[1]} ${depthMatch[2]}`;
      if (param.speed || param.feed || param.depth) params.push(param);
    }
  }
  const unique = params.filter(
    (p, i, arr) => arr.findIndex((x) => x.speed === p.speed && x.feed === p.feed) === i,
  );
  return unique.slice(0, 100);
}

export function extractProcedures(text: string): Procedure[] {
  const procedures: Procedure[] = [];
  const sectionPattern = /(?:procedure|steps|how to|workflow)[:\s]*\n([\s\S]{100,2000}?)(?:\n\n|\n[A-Z])/gi;
  let match: RegExpExecArray | null;
  while ((match = sectionPattern.exec(text)) !== null) {
    const section = match[1];
    const steps = section
      .split(/\n/)
      .filter((line) => line.match(/^\s*\d+[.)]\s+/) || line.match(/^[-•]\s+/))
      .map((line) => line.replace(/^\s*\d+[.)]\s+/, "").replace(/^[-•]\s+/, "").trim())
      .filter((line) => line.length > 10);
    if (steps.length >= 2) {
      procedures.push({ title: "Procedure", steps, context: section.slice(0, 500) });
    }
  }
  return procedures.slice(0, 20);
}

export function countKeywords(text: string): Record<string, number> {
  const keywords = [
    "feed", "speed", "cutting", "rpm", "mm/min", "m/min",
    "toolpath", "machining", "milling", "turning", "drilling",
    "roughing", "finishing", "tolerance", "depth", "stepover",
  ];
  const counts: Record<string, number> = {};
  const lowerText = text.toLowerCase();
  for (const kw of keywords) {
    const matches = lowerText.match(new RegExp(kw, "g"));
    counts[kw] = matches?.length || 0;
  }
  return counts;
}

// V2 PURE FUNCTIONS (hybrid pipeline — exported for tests) ==================

export function classifyPageByDensity(
  textLength: number,
  threshold: number = DEFAULT_DENSITY_THRESHOLD,
): PageKind {
  if (!Number.isFinite(textLength) || textLength < 0) return "image-heavy";
  if (!Number.isFinite(threshold) || threshold <= 0) return "text-rich";
  return textLength >= threshold ? "text-rich" : "image-heavy";
}

export function slugifyPdfName(filename: unknown): string {
  if (typeof filename !== "string" || filename.length === 0) return "untitled";
  const ext = extname(filename);
  const stem = ext ? filename.slice(0, -ext.length) : filename;
  const slug = stem
    .replace(/[^A-Za-z0-9_\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return slug.length === 0 ? "untitled" : slug;
}

export function buildVaultPath(root: string, stem: string, ext: string = ".md"): string {
  const safeStem = slugifyPdfName(stem);
  const safeExt = ext.startsWith(".") ? ext : `.${ext}`;
  return join(root, `${safeStem}${safeExt}`);
}

export function mergePageChunks(chunks: PageChunk[]): string {
  if (!Array.isArray(chunks) || chunks.length === 0) return "";
  const sorted = chunks.slice().sort((a, b) => {
    const ap = Number(a?.page ?? 0);
    const bp = Number(b?.page ?? 0);
    return ap - bp;
  });
  return sorted
    .map((c) => {
      const header = `## Page ${c.page} — ${c.kind}`;
      const body = (c.content?.trim() || "(empty)");
      return `${header}\n\n${body}`;
    })
    .join("\n\n");
}

export function summarizePages(chunks: PageChunk[]): {
  total: number;
  textRich: number;
  imageHeavy: number;
} {
  if (!Array.isArray(chunks)) return { total: 0, textRich: 0, imageHeavy: 0 };
  let textRich = 0;
  let imageHeavy = 0;
  for (const c of chunks) {
    if (c?.kind === "text-rich") textRich++;
    else if (c?.kind === "image-heavy") imageHeavy++;
  }
  return { total: chunks.length, textRich, imageHeavy };
}

export function formatFrontmatter(meta: PdfMeta): string {
  const safe = (s: string): string => `"${String(s).replace(/"/g, '\\"')}"`;
  return [
    "---",
    `source: ${safe(meta.source)}`,
    `filename: ${safe(meta.filename)}`,
    `category: ${safe(meta.category)}`,
    `totalPages: ${meta.totalPages}`,
    `textRichPages: ${meta.textRichPages}`,
    `imageHeavyPages: ${meta.imageHeavyPages}`,
    `visionAvailable: ${meta.visionAvailable}`,
    `extractedAt: ${safe(meta.extractedAt)}`,
    "---",
  ].join("\n");
}

export function formatVaultMarkdown(meta: PdfMeta, chunks: PageChunk[]): string {
  const fm = formatFrontmatter(meta);
  const body = mergePageChunks(chunks);
  return `${fm}\n\n# ${meta.filename}\n\n${body}\n`;
}

// I/O LAYER =================================================================

export interface ExtractOptions {
  pdfPath: string;
  category?: string;
  vaultRoot?: string;
  densityThreshold?: number;
  visionPrompt?: string;
  /** When false, image-heavy pages emit a marker chunk instead of calling vision. */
  useVision?: boolean;
  /** Override vision call (for tests / dry-run on offline boxes). */
  visionFn?: (
    bytes: Uint8Array,
    prompt: string,
  ) => Promise<{ ok: boolean; text?: string; error?: string }>;
  /** Skip writing to vault disk; return envelope only. */
  dryRun?: boolean;
  /** Compute legacy regex-based extraction in addition to chunks. */
  computeLegacy?: boolean;
}

export async function extractPdfHybrid(opts: ExtractOptions): Promise<ExtractionEnvelope> {
  const errors: string[] = [];
  const filename = basename(opts.pdfPath);
  const category = opts.category ?? "uncategorized";
  const vaultRoot = opts.vaultRoot ?? DEFAULT_VAULT_ROOT;
  const threshold = opts.densityThreshold ?? DEFAULT_DENSITY_THRESHOLD;
  const visionPrompt = opts.visionPrompt ?? DEFAULT_VISION_PROMPT;
  const useVision = opts.useVision ?? true;
  const dryRun = opts.dryRun === true;
  const computeLegacy = opts.computeLegacy ?? true;

  const baseMeta: PdfMeta = {
    source: opts.pdfPath,
    filename,
    category,
    totalPages: 0,
    textRichPages: 0,
    imageHeavyPages: 0,
    visionAvailable: useVision,
    extractedAt: new Date().toISOString(),
  };

  let parser: { getInfo: Function; getText: Function; getScreenshot: Function; destroy?: Function } | undefined;
  try {
    const buffer = readFileSync(opts.pdfPath);
    parser = new PDFParse({ data: buffer });
  } catch (err) {
    const e = err as Error;
    errors.push(`read failed: ${e.message}`);
    return { meta: baseMeta, chunks: [], vaultPath: null, errors };
  }

  const chunks: PageChunk[] = [];
  let legacy: ExtractedKnowledge | undefined;

  try {
    const info = await parser!.getInfo({ parsePageInfo: false });
    const total: number = Number(info?.total ?? 0);
    baseMeta.totalPages = total;

    let allText = "";
    if (computeLegacy) {
      try {
        const fullText = await parser!.getText();
        allText = String(fullText?.text ?? "");
      } catch (err) {
        const e = err as Error;
        errors.push(`legacy getText failed: ${e.message}`);
      }
    }

    for (let p = 1; p <= total; p++) {
      try {
        const tr = await parser!.getText({ partial: [p] });
        const pageText = String(tr?.text ?? "");
        const kind = classifyPageByDensity(pageText.length, threshold);
        if (kind === "text-rich") {
          chunks.push({ page: p, kind, textLength: pageText.length, content: pageText.trim() });
          baseMeta.textRichPages++;
          continue;
        }

        baseMeta.imageHeavyPages++;
        if (!useVision) {
          chunks.push({
            page: p, kind, textLength: pageText.length,
            content: `[vision-pending — page has only ${pageText.length} chars of OCR text]`,
            warning: "vision disabled by caller",
          });
          continue;
        }

        try {
          const shot = await parser!.getScreenshot({ partial: [p], scale: 1, imageBuffer: true });
          const pageImage = shot?.pages?.[0]?.data;
          if (!pageImage) {
            chunks.push({
              page: p, kind, textLength: pageText.length,
              content: `[vision-skip — getScreenshot returned no buffer for page ${p}]`,
              warning: "screenshot empty",
            });
            continue;
          }
          const bytes = pageImage instanceof Uint8Array ? pageImage : new Uint8Array(pageImage);

          const visionFn = opts.visionFn ?? (async (b, prompt) => {
            const r = await visionExtractionEngine.extract({ bytes: b, kind: "image", prompt });
            return { ok: r.ok, text: r.text, error: r.error };
          });
          const v = await visionFn(bytes, visionPrompt);
          if (v.ok && typeof v.text === "string" && v.text.trim().length > 0) {
            chunks.push({
              page: p, kind, textLength: pageText.length,
              content: `[vision] ${v.text.trim()}`,
            });
          } else {
            chunks.push({
              page: p, kind, textLength: pageText.length,
              content: `[vision-failed] ${v.error ?? "no text returned"}`,
              warning: "vision call failed",
            });
          }
        } catch (err) {
          const e = err as Error;
          chunks.push({
            page: p, kind, textLength: pageText.length,
            content: `[vision-error] ${e.message}`,
            warning: "screenshot/vision threw",
          });
        }
      } catch (err) {
        const e = err as Error;
        errors.push(`page ${p}: ${e.message}`);
      }
    }

    if (computeLegacy) {
      legacy = {
        source_pdf: opts.pdfPath,
        filename,
        category,
        page_count: total,
        text_length: allText.length,
        extracted_at: baseMeta.extractedAt,
        keywords_found: countKeywords(allText),
        cutting_params: extractCuttingParams(allText),
        procedures: extractProcedures(allText),
        warnings: [],
      };
    }
  } catch (err) {
    const e = err as Error;
    errors.push(`extract failed: ${e.message}`);
  } finally {
    try { await parser?.destroy?.(); } catch { /* ignore destroy errors */ }
  }

  let vaultPath: string | null = null;
  if (!dryRun && chunks.length > 0) {
    try {
      mkdirSync(vaultRoot, { recursive: true });
      vaultPath = buildVaultPath(vaultRoot, filename);
      const md = formatVaultMarkdown(baseMeta, chunks);
      writeFileSync(vaultPath, md, "utf8");
    } catch (err) {
      const e = err as Error;
      errors.push(`write failed: ${e.message}`);
      vaultPath = null;
    }
  }

  return { meta: baseMeta, chunks, vaultPath, errors, legacy };
}

// PDF DISCOVERY (preserved from v1) =========================================

export function findPDFs(
  dir: string,
  category: string,
  results: Array<{ path: string; category: string }>,
  maxDepth = 5,
  depth = 0,
): void {
  if (depth > maxDepth) return;
  if (!existsSync(dir)) return;
  let items: string[];
  try {
    items = readdirSync(dir);
  } catch {
    return;
  }
  for (const item of items) {
    const fullPath = join(dir, item);
    let s;
    try { s = statSync(fullPath); } catch { continue; }
    if (s.isDirectory() && !item.startsWith(".") && item !== "node_modules") {
      findPDFs(fullPath, category, results, maxDepth, depth + 1);
    } else if (item.toLowerCase().endsWith(".pdf")) {
      results.push({ path: fullPath, category });
    }
  }
}

// MAIN — orchestrates legacy JSON batch + new vault output ==================

async function main(): Promise<void> {
  const args = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) args.set(a.slice(2, eq), a.slice(eq + 1));
      else args.set(a.slice(2), "true");
    }
  }
  const dryRun = args.get("dry-run") === "true";
  const useVision = args.get("no-vision") !== "true";
  const limit = Number(args.get("limit") ?? 20);
  const vaultRoot = args.get("vault") ?? DEFAULT_VAULT_ROOT;
  const legacyRoot = args.get("legacy-root") ?? "H:/prism/mcp-server/data/extracted-knowledge";

  console.log("=== PRISM PDF Hybrid Batch Extraction (P21-U02) ===");
  console.log(`vault: ${vaultRoot}`);
  console.log(`legacy: ${legacyRoot}`);
  console.log(`dryRun: ${dryRun} useVision: ${useVision} limit: ${limit}\n`);

  if (!dryRun) mkdirSync(legacyRoot, { recursive: true });

  const sources = [
    { dir: "H:/prism/Resources/PDF/hyperMILL", category: "hypermill_doc" },
    { dir: "H:/prism/Resources/PDF/hyperCAD-S", category: "hypermill_doc" },
    { dir: "H:/prism/Resources/PDF/MANUFACTURER_CATALOGS", category: "manufacturer_catalog" },
    { dir: "H:/prism/Resources/1- Basic Training Day 1", category: "training" },
    { dir: "H:/prism/Resources/2- Basic Training Day 2", category: "training" },
    { dir: "H:/prism/Resources/PDF", category: "reference" },
  ];

  const pdfs: Array<{ path: string; category: string }> = [];
  for (const s of sources) findPDFs(s.dir, s.category, pdfs);
  console.log(`Found ${pdfs.length} PDFs\n`);

  const slice = pdfs.slice(0, limit);
  const batch: ExtractionBatch = {
    batch_id: `batch-${Date.now()}`,
    started: new Date().toISOString(),
    total_pdfs: slice.length,
    processed: 0,
    extracted: 0,
    failed: 0,
    total_knowledge_objects: 0,
    results: [],
  };

  let withVision = 0;
  for (let i = 0; i < slice.length; i++) {
    const { path: pdfPath, category } = slice[i];
    process.stdout.write(`[${i + 1}/${slice.length}] ${basename(pdfPath).slice(0, 60)} ... `);
    try {
      const env = await extractPdfHybrid({ pdfPath, category, vaultRoot, useVision, dryRun });
      batch.processed++;
      if (env.legacy) {
        batch.results.push(env.legacy);
        const objCount = env.legacy.cutting_params.length + env.legacy.procedures.length;
        if (objCount > 0) {
          batch.extracted++;
          batch.total_knowledge_objects += objCount;
        }
      }
      if (env.meta.imageHeavyPages > 0) withVision++;
      console.log(
        `pages=${env.meta.totalPages} text=${env.meta.textRichPages} ` +
          `image=${env.meta.imageHeavyPages} ${env.vaultPath ? "→ " + env.vaultPath : "(no write)"}`,
      );
    } catch (err) {
      const e = err as Error;
      batch.failed++;
      console.log(`✗ ${e.message}`);
    }
  }

  batch.completed = new Date().toISOString();

  if (!dryRun) {
    const outputPath = join(legacyRoot, `extraction-${batch.batch_id}.json`);
    writeFileSync(outputPath, JSON.stringify(batch, null, 2));
    console.log(`\nLegacy batch JSON: ${outputPath}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Processed: ${batch.processed}/${batch.total_pdfs}`);
  console.log(`With image-heavy pages: ${withVision}`);
  console.log(`Legacy knowledge objects: ${batch.total_knowledge_objects}`);
  console.log(`Failed: ${batch.failed}`);
}

// MAIN GUARD — only run when invoked directly, NOT when imported by tests ===

const __isMain = ((): boolean => {
  try {
    const argv1 = process.argv?.[1];
    if (!argv1) return false;
    return import.meta.url === pathToFileURL(argv1).href;
  } catch {
    return false;
  }
})();

if (__isMain) {
  main().catch((e) => {
    console.error("FATAL", e);
    process.exit(1);
  });
}
