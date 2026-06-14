/**
 * pdf-parse-extract-helpers.mjs — pure helpers for scripts/pdf-parse-extract.mjs
 *
 * Bridges the pdftotext-missing gap (no system binary) by using the pdf-parse npm
 * package already present in mcp-server/node_modules. Emits batch-stub-quality
 * wiki entries (confidence 0.3, needs_curation true) + tribal jsonl rows so the
 * downstream curator surfaces them as candidates.
 *
 * Exports are pure (no I/O) so they can be unit-tested without a real PDF.
 *
 * @milestone WHISKEY-PDF-WIKI-TRIBAL-MS0/U-WPWT-EXTRACT-FALLBACK
 * @slot whiskey
 * @date 2026-05-25
 */

export const SCHEMA_VERSION = "1.0.0";

/** Canonical top-priority milling order-of-operations PDFs (operator-curated). */
export const TOP_MILLING_OOP_PDFS = [
  "H:/PRISM/resources/RESOURCE PDFS/English - Mill Operator’s Manual -Interactive PDF Version - NGC - 2023 - english_mill_interactive_manual_print_version_2023.pdf",
  "H:/PRISM/resources/RESOURCE PDFS/CNC_Machining_The_Complete_Engineering_Guide.pdf",
  "H:/PRISM/resources/RESOURCE PDFS/Fundamentals_of_CNC_Machining.pdf",
  "H:/PRISM/resources/RESOURCE PDFS/Dynamic_Milling.pdf",
  "H:/PRISM/resources/RESOURCE PDFS/Basic_3D_Machining.pdf",
  "H:/PRISM/resources/RESOURCE PDFS/Manual 5-axis machining.pdf",
  "H:/PRISM/resources/RESOURCE PDFS/Post Processor Training Guide.pdf",
  "H:/PRISM/resources/RESOURCE PDFS/WinMax-Mill-Intro-Class-Workbook.pdf",
  "H:/PRISM/resources/RESOURCE PDFS/hyperMILL_2D_3D.pdf",
  "H:/PRISM/resources/RESOURCE PDFS/InventorCAM2024_2.5D_Milling_Training_Course.pdf",
];

/** Pure: parse argv into normalized options. */
export function parseArgs(argv) {
  const out = {
    max: 1,
    pages: 20,
    dryRun: false,
    milling: true,
    files: [],
    slot: "whiskey",
    outRoot: "H:/prism-slot-whiskey",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--max" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      out.max = Number.isFinite(n) ? Math.max(1, n) : 1;
    } else if (a === "--pages" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      out.pages = Number.isFinite(n) ? Math.max(1, Math.min(80, n)) : 20;
    } else if (a === "--file" && argv[i + 1]) {
      out.files.push(argv[++i]);
      out.milling = false;
    } else if (a === "--out-root" && argv[i + 1]) {
      out.outRoot = argv[++i];
    } else if (a === "--slot" && argv[i + 1]) {
      out.slot = argv[++i];
    }
  }
  return out;
}

/** Pure: derive a stable kebab-case slug from a pdf path. */
export function pdfPathToSlug(p) {
  if (!p || typeof p !== "string") return "";
  const base = p.split(/[\\/]/).pop() || p;
  const noExt = base.replace(/\.pdf$/i, "");
  return noExt
    .toLowerCase()
    .replace(/[‘’‚]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Pure: pick target PDF paths from options. */
export function chooseTargets(opts) {
  const src = opts.files.length > 0 ? opts.files : (opts.milling ? TOP_MILLING_OOP_PDFS : []);
  return src.slice(0, Math.max(0, opts.max));
}

/**
 * Pure: harvest heuristic structure from raw PDF text.
 * Returns { headings, firstParagraph, lineCount, charCount }.
 * Recognizes ALL-CAPS lines, numbered section heads (1.1, 2.3.4),
 * and chapter markers ("Chapter 1", "Section A").
 */
export function harvestStructure(rawText, opts = {}) {
  const maxHeadings = opts.maxHeadings ?? 25;
  if (!rawText || typeof rawText !== "string") {
    return { headings: [], firstParagraph: "", lineCount: 0, charCount: 0 };
  }
  const lines = rawText.split(/\r?\n/);
  const headings = [];
  const seen = new Set();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.length < 4 || line.length > 120) continue;
    const isAllCaps = /^[A-Z0-9][A-Z0-9 \-:&,()/]+$/.test(line) && line.length >= 6;
    const isNumbered = /^(\d+(?:\.\d+){0,3})\s+\S/.test(line);
    const isChapter = /^(chapter|section|appendix|part)\s+[A-Z0-9]/i.test(line);
    if (isAllCaps || isNumbered || isChapter) {
      const key = line.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        headings.push(line);
        if (headings.length >= maxHeadings) break;
      }
    }
  }
  const paragraphs = rawText.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length >= 80);
  const firstParagraph = paragraphs[0] ? paragraphs[0].slice(0, 600) : "";
  return {
    headings,
    firstParagraph,
    lineCount: lines.length,
    charCount: rawText.length,
  };
}

/**
 * Pure: format one tribal jsonl row from a parse record.
 * Marks it as batch-stub quality so downstream curator can promote it.
 */
export function formatTribalJsonl(record) {
  const row = {
    schema_version: SCHEMA_VERSION,
    id: `whiskey-mill-oop-${record.slug}`,
    pdf_path: record.path,
    domain: "milling",
    topic: "order-of-operations",
    confidence: 0.3,
    needs_curation: true,
    extraction_quality: "pdf-parse-stub",
    extracted_at: record.extractedAt,
    extractor: "pdf-parse-extract.mjs",
    title: record.title || record.slug,
    pages_extracted: record.pagesExtracted,
    headings_sample: (record.headings || []).slice(0, 12),
    first_paragraph: record.firstParagraph || "",
    source: {
      pdf_path: record.path,
      slug: record.slug,
    },
    bridge_engines: [
      "PostProcessorPipelineEngine",
      "UltimateSpeedFeedEngine",
      "MachineControllerEngine",
    ],
  };
  return JSON.stringify(row);
}

/** Pure: render a wiki/lessons markdown page from a parse record. */
export function formatWikiMarkdown(record) {
  const lines = [];
  const title = record.title || record.slug;
  lines.push(`---`);
  lines.push(`name: pdf-extract-${record.slug}`);
  lines.push(`description: Milling order-of-operations PDF extract (stub) — ${title}`);
  lines.push(`metadata:`);
  lines.push(`  type: lesson`);
  lines.push(`  domain: milling`);
  lines.push(`  topic: order-of-operations`);
  lines.push(`  confidence: 0.3`);
  lines.push(`  needs_curation: true`);
  lines.push(`  extractor: pdf-parse-extract.mjs`);
  lines.push(`  extracted_at: ${record.extractedAt}`);
  lines.push(`  source_pdf: ${record.path}`);
  lines.push(`  pages_extracted: ${record.pagesExtracted}`);
  lines.push(`---`);
  lines.push("");
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`> **PDF-PARSE STUB EXTRACT** (confidence 0.3, needs curation).`);
  lines.push(`> Source: \`${record.path}\` — pages 1..${record.pagesExtracted}.`);
  lines.push(`> Extracted heuristically; operator should promote selected sections to full wiki/tribal entries.`);
  lines.push("");
  lines.push(`## Detected structure (top headings)`);
  lines.push("");
  if (!record.headings || record.headings.length === 0) {
    lines.push("_(no headings detected — PDF may be image-only / requires OCR)_");
  } else {
    for (const h of record.headings.slice(0, 20)) {
      lines.push(`- ${h}`);
    }
  }
  lines.push("");
  lines.push(`## First paragraph (sample)`);
  lines.push("");
  lines.push(record.firstParagraph || "_(no paragraph >80 chars detected)_");
  lines.push("");
  lines.push(`## Bridge engines (suggested)`);
  lines.push("");
  lines.push(`- [[PostProcessorPipelineEngine]]`);
  lines.push(`- [[UltimateSpeedFeedEngine]]`);
  lines.push(`- [[MachineControllerEngine]]`);
  lines.push("");
  lines.push(`## Next steps`);
  lines.push("");
  lines.push(`1. Operator reads the PDF section corresponding to each detected heading.`);
  lines.push(`2. Promote OoO-relevant passages to dedicated wiki entries under \`knowledge/wiki/code-tribal/\`.`);
  lines.push(`3. Bump confidence to ≥0.7 + set \`needs_curation: false\` once curated.`);
  lines.push("");
  return lines.join("\n");
}

/** Pure: build an outputs descriptor (paths, no I/O). */
export function buildOutputDescriptor(record, outRoot) {
  return {
    wikiPath: `${outRoot}/knowledge/wiki/lessons/pdf-extract-${record.slug}.md`,
    jsonlPath: `${outRoot}/state/shared/extracted-pdfs/whiskey-milling-oop-${dateStamp(record.extractedAt)}.jsonl`,
  };
}

/** Pure: yyyy-MM-dd from ISO. */
export function dateStamp(iso) {
  if (!iso || typeof iso !== "string") return "unknown";
  return iso.slice(0, 10);
}
