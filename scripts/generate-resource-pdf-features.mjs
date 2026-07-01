#!/usr/bin/env node
/**
 * generate-resource-pdf-features.mjs — system-viz augmentation: resource-PDF roost.
 *
 * Spec: U-RESOURCE-PDF-AUTOGEN-SPECS (slot:india, 2026-05-24).
 *
 * Reads `state/shared/resource-pdf-specs/AUTOGEN-EXTRACT-SPEC-*.md` (from
 * scripts/auto-resource-pdf-spec-emit.mjs) and emits a system-viz augmentation
 * adding:
 *   - one parent roost node `ghost.resource_pdfs` (kind ghost-roost), under
 *     `ghost.planned_features` so it sits beside misc-tasks / bridge-synergy /
 *     college_courses.
 *   - one `resource-pdf` child node per AUTOGEN-EXTRACT-SPEC, parented to roost.
 *
 * Per-PDF node carries: kind (machining-handbook|resource-catalog|blueprint-pdf|
 * manual-pdf|paper-pdf|other-pdf), source path, size MB, slug.
 *
 * Output: `state/shared/system-viz/resource-pdf-augmentation.json`. Folded into
 * system-graph.json by scripts/merge-augmentations.mjs (registered there).
 * Register in scripts/regen-viz.mjs FAST[] for auto-regen.
 *
 * Idempotency: re-running produces deterministic augmentation (alphabetical-by-slug).
 * merge-augmentations.mjs skips existing ids.
 *
 * Usage:  node scripts/generate-resource-pdf-features.mjs
 * Exit:   0 ok · 1 specs dir missing · 2 runtime error
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const PDF_ROOST_ID = "ghost.resource_pdfs";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const PDF_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 200;

const SPECS_DIR = path.join(ROOT, "state/shared/resource-pdf-specs");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "resource-pdf-augmentation.json");

const SPEC_NAME_RE = /^AUTOGEN-EXTRACT-SPEC-(.+)\.md$/;
const FIELD_RE = (label) => new RegExp("^\\|\\s*" + label + "\\s*\\|\\s*`?([^`|\\n]+?)`?\\s*\\|$", "m");
const SIZE_RE = /^\|\s*Size\s*\|\s*([\d.]+)\s*MB\s*\|$/m;

/** Extract {pdfId, slug, kind, source, sizeMb} from one AUTOGEN-EXTRACT-SPEC.md body. */
export function parseSpec(slug, body) {
  const pdfId = (body.match(FIELD_RE("PDF id")) || [])[1] || slug;
  const kind = (body.match(FIELD_RE("Kind")) || [])[1] || "other-pdf";
  const source = (body.match(FIELD_RE("Source path")) || [])[1] || "";
  const sizeMb = Number((body.match(SIZE_RE) || [])[1]) || 0;
  return { slug, pdfId: pdfId.trim(), kind: kind.trim(), source: source.trim(), sizeMb };
}

/** Pure: build {newNodes,newEdges,stats} from spec entries + existing-ids. */
export function generate(entries, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  let roostEmitted = 0;

  if (!ids.has(PDF_ROOST_ID)) {
    newNodes.push({
      id: PDF_ROOST_ID,
      label: "Resource PDFs (AUTOGEN-EXTRACT-SPECs — /pdf-learn execution queue)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${entries.length} PDFs cataloged from H:/PRISM/resources — formulas/tips/concepts/nodes per spec. /pdf-learn executes per-PDF. See state/shared/RESOURCE-PDF-AUTOGEN-INDEX-2026-05-24.md.`,
    });
    ids.add(PDF_ROOST_ID);
    roostEmitted = 1;
  }

  let childrenEmitted = 0, childrenSkipped = 0;
  for (const e of entries) {
    const id = "pdf-extract." + e.slug;
    if (ids.has(id)) { childrenSkipped++; continue; }
    const label = (`${path.basename(e.pdfId)} (${e.kind})`).slice(0, MAX_LABEL);
    const info = `[${e.kind} · ${e.sizeMb}MB] source=${e.source}`.slice(0, MAX_INFO);
    newNodes.push({
      id,
      label,
      layer: PDF_LAYER,
      ghost: true,
      status: "ghost",
      kind: "resource-pdf",
      parent: PDF_ROOST_ID,
      info,
    });
    ids.add(id);
    childrenEmitted++;
  }

  return { newNodes, newEdges: [], stats: { roostEmitted, total: entries.length, childrenEmitted, childrenSkipped } };
}

/** Read all AUTOGEN-EXTRACT-SPEC-*.md from specs dir → parsed entries (sorted). */
export function readSpecsDir(dir = SPECS_DIR) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => SPEC_NAME_RE.test(f)).sort();
  const out = [];
  for (const f of files) {
    const slug = f.match(SPEC_NAME_RE)[1];
    try {
      const body = fs.readFileSync(path.join(dir, f), "utf8");
      out.push(parseSpec(slug, body));
    } catch { /* skip unreadable */ }
  }
  return out;
}

export function main() {
  if (!fs.existsSync(SPECS_DIR)) {
    console.error("FATAL: " + SPECS_DIR + " missing — run scripts/auto-resource-pdf-spec-emit.mjs first");
    return 1;
  }
  let entries;
  try { entries = readSpecsDir(); }
  catch (e) { console.error("FATAL: read failed — " + e.message); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(entries, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/resource-pdf-specs/AUTOGEN-EXTRACT-SPEC-*.md",
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error("FATAL: generate failed — " + e.message); return 2; }

  fs.mkdirSync(VIZ_DIR, { recursive: true });
  try { fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error("FATAL: write failed — " + e.message); return 2; }

  console.log("wrote " + OUT_PATH);
  console.log("  roost emitted: " + result.stats.roostEmitted);
  console.log("  PDFs:          " + result.stats.total);
  console.log("  children:      " + result.stats.childrenEmitted);
  console.log("  skipped:       " + result.stats.childrenSkipped);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
