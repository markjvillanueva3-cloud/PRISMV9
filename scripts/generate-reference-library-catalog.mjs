#!/usr/bin/env node
/**
 * generate-reference-library-catalog.mjs — U-Q-REFERENCE-LIBRARY-CATALOG
 *
 * Scans H:/prism/JM DIE/TRIBAL + WIKI/ and emits a typed TypeScript manifest
 * at web/src/data/referenceLibraryCatalog.ts.
 *
 * Pure read-only filesystem scan; output is committed so the frontend never
 * needs filesystem access at runtime. Re-run when the corpus changes.
 *
 * Inference rules (Karpathy R8 — read before write):
 *  - kind = "pdf" (this corpus is PDF-only)
 *  - domain inferred from filename keywords (mill / lathe / wedm / cad /
 *    fusion / mastercam / inventorcam / hypermill / haas / okuma / fanuc /
 *    general)
 *  - sizeBytes from fs.stat
 *  - slug from filename (lowercased, non-alphanumeric → "-")
 *
 * Quebec /goal frontend continuation (post-/yolo).
 */

import { readdir, stat, writeFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const CORPUS_DIR = join(REPO, "JM DIE", "TRIBAL + WIKI");
const OUT_PATH = join(REPO, "web", "src", "data", "referenceLibraryCatalog.ts");

/**
 * Domain inference. Order matters — first match wins so more specific terms
 * (e.g. "wire-edm" before "edm") come earlier in the table.
 */
const DOMAIN_RULES = [
  { pattern: /\bwire[\s_-]?edm\b|wedm/i, domain: "wedm" },
  { pattern: /\b(mastercam|hypermill|inventorcam|fusion|esprit|solidcam|powermill|surfcam|bobcad)\b/i, domain: "cam" },
  { pattern: /\b(solidworks|autocad|inventor|catia|fusion[\s_-]?cad|engineering[\s_-]?graphics)\b/i, domain: "cad" },
  { pattern: /\blathe\b|\bturning\b|\bturn\b/i, domain: "lathe" },
  { pattern: /\bmill(ing)?\b/i, domain: "mill" },
  { pattern: /\b(haas|okuma|fanuc|mazak|siemens|heidenhain|hurco)\b/i, domain: "controller" },
  { pattern: /\b(g[\s_-]?code|cnc[\s_-]?(programming|basics|book))\b/i, domain: "gcode" },
  { pattern: /\b(speed|feed|fcalc)\b/i, domain: "speeds-feeds" },
  { pattern: /\b(drill|hole|thread)\b/i, domain: "ops" },
  { pattern: /\b(5[\s_-]?axis|multiaxis)\b/i, domain: "5-axis" },
  { pattern: /\b(cs50|computer[\s_-]?science|programming)\b/i, domain: "cs" },
  { pattern: /\b(big[\s_-]?daishowa|tool[\s_-]?holder|holder)\b/i, domain: "tooling" },
];

function inferDomain(filename) {
  for (const rule of DOMAIN_RULES) {
    if (rule.pattern.test(filename)) return rule.domain;
  }
  return "general";
}

function slugify(filename) {
  const stem = filename.replace(/\.pdf$/i, "");
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function prettifyTitle(filename) {
  let s = filename.replace(/\.pdf$/i, "");
  // Strip trailing -uploaded artifacts + extra brackets that pollute titles
  s = s.replace(/[\s_-]+uploaded$/i, "");
  s = s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

function bytesToHuman(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

async function scan() {
  const entries = await readdir(CORPUS_DIR, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (extname(ent.name).toLowerCase() !== ".pdf") continue;
    const full = join(CORPUS_DIR, ent.name);
    const st = await stat(full);
    out.push({
      slug: slugify(ent.name),
      title: prettifyTitle(ent.name),
      filename: ent.name,
      kind: "pdf",
      domain: inferDomain(ent.name),
      sizeBytes: st.size,
      sizeLabel: bytesToHuman(st.size),
    });
  }
  // Sort by domain then title for stable diffs across regenerations.
  out.sort((a, b) => {
    if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
    return a.title.localeCompare(b.title);
  });
  return out;
}

function emitTs(entries) {
  const generatedAt = new Date().toISOString();
  const lines = [];
  lines.push("// AUTO-GENERATED — do not edit by hand.");
  lines.push("// Run: node scripts/generate-reference-library-catalog.mjs");
  lines.push(`// Source: H:/prism/JM DIE/TRIBAL + WIKI/  ·  generated ${generatedAt}`);
  lines.push("// U-Q-REFERENCE-LIBRARY-CATALOG (slot:quebec)");
  lines.push("");
  lines.push("export interface ReferenceLibraryEntry {");
  lines.push("  slug: string;");
  lines.push("  title: string;");
  lines.push("  filename: string;");
  lines.push("  kind: 'pdf';");
  lines.push("  domain:");
  lines.push("    | 'mill' | 'lathe' | 'wedm' | 'cad' | 'cam' | 'controller'");
  lines.push("    | 'gcode' | 'speeds-feeds' | 'ops' | '5-axis' | 'tooling'");
  lines.push("    | 'cs' | 'general';");
  lines.push("  sizeBytes: number;");
  lines.push("  sizeLabel: string;");
  lines.push("}");
  lines.push("");
  lines.push(`export const REFERENCE_LIBRARY_GENERATED_AT = ${JSON.stringify(generatedAt)} as const;`);
  lines.push(`export const REFERENCE_LIBRARY_CORPUS = ${JSON.stringify("JM DIE/TRIBAL + WIKI")} as const;`);
  lines.push("");
  lines.push(`export const REFERENCE_LIBRARY_CATALOG: readonly ReferenceLibraryEntry[] = ${JSON.stringify(entries, null, 2)};`);
  lines.push("");
  lines.push("export const REFERENCE_LIBRARY_DOMAINS = Array.from(");
  lines.push("  new Set(REFERENCE_LIBRARY_CATALOG.map((e) => e.domain))");
  lines.push(").sort();");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const entries = await scan();
  if (entries.length === 0) {
    console.error(`FATAL: zero PDFs found under ${CORPUS_DIR}`);
    process.exit(2);
  }
  const ts = emitTs(entries);
  await writeFile(OUT_PATH, ts);
  const byDomain = entries.reduce((acc, e) => {
    acc[e.domain] = (acc[e.domain] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`reference-library-catalog: wrote ${OUT_PATH}`);
  console.log(`  ${entries.length} PDF entries; domains:`, byDomain);
}

main().catch((e) => {
  console.error("FATAL:", e.stack || e.message);
  process.exit(1);
});
