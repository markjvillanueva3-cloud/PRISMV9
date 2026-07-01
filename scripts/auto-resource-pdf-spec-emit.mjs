#!/usr/bin/env node
/**
 * auto-resource-pdf-spec-emit.mjs
 *
 * Walks H:/PRISM/resources for ALL *.pdf files and emits one AUTOGEN-EXTRACT-SPEC.md
 * per discovered PDF declaring the formulas / concepts / tips / nodes that /pdf-learn
 * (or PdfBlueprintDimensionExtractorEngine, depending on PDF type) should generate.
 *
 * Companion to scripts/auto-college-course-spec-emit.mjs (which emits per-course specs).
 * This script emits per-PDF specs — pulls the same data shape into the PSN inventory.
 *
 * Sources walked:
 *   - H:/PRISM/resources/**\*.pdf — bounded depth, skip Freecad/lib/bin/dist (OOM-safe)
 *
 * Output:
 *   - state/shared/resource-pdf-specs/AUTOGEN-EXTRACT-SPEC-<slug>.md (one per PDF)
 *   - state/shared/RESOURCE-PDF-AUTOGEN-INDEX-2026-05-24.md (master)
 *
 * Kind taxonomy (per PDF):
 *   - machining-handbook → engines: PdfMachiningHandbookExtractor; formulas: Kienzle/Taylor variants
 *   - resource-catalog → engines: PdfCatalogPartExtractor; formulas: per-part dimension/spec
 *   - blueprint-pdf → engines: PdfBlueprintDimensionExtractor; formulas: feature/tolerance
 *   - manual-pdf → engines: PdfManualSectionExtractor; formulas: per-procedure
 *   - paper-pdf → engines: PdfAcademicPaperExtractor; formulas: per-citation
 *   - other-pdf (catch-all)
 *
 * Advisory + must_human_verify. /pdf-learn executes each spec to produce real assets.
 *
 * @milestone MIT-COURSE-INTEGRATION/U-RESOURCE-PDF-AUTOGEN-SPECS
 * @slot india
 * @date 2026-05-24
 */
import * as fs from "node:fs";
import * as path from "node:path";

const RESOURCES_ROOT = "H:/PRISM/resources";
const REPO_ROOT = "H:/prism";
const SPECS_DIR = path.join(REPO_ROOT, "state/shared/resource-pdf-specs");
const INDEX_PATH = path.join(REPO_ROOT, "state/shared/RESOURCE-PDF-AUTOGEN-INDEX-2026-05-24.md");

const PDF_WALK_MAX_DEPTH = 4;
const PDF_WALK_CAP = 4000;
const SKIP_DIRS_RE = /^(node_modules|\.git|site-packages|__pycache__|venv|\.venv|Freecad|freecad|lib|bin|dist|build|coverage|\.next|\.cache)$/i;

const KIND_DEFAULTS = {
  "machining-handbook": {
    engines: ["PdfMachiningHandbookExtractorEngine"],
    formulas: ["per-handbook-formula-set (Kienzle, Taylor, surface-finish, deflection)"],
    nodes: ["node_formula_handbook", "node_tip_handbook", "node_concept_handbook"],
    tips_target: 30,
  },
  "resource-catalog": {
    engines: ["PdfCatalogPartExtractorEngine"],
    formulas: ["per-part-dimension-set", "per-part-spec-set"],
    nodes: ["node_part_catalog", "node_dimension_catalog"],
    tips_target: 10,
  },
  "blueprint-pdf": {
    engines: ["PdfBlueprintDimensionExtractorEngine"],
    formulas: ["feature-dimension", "tolerance-stack", "gd&t-callout"],
    nodes: ["node_feature_blueprint", "node_tolerance_blueprint"],
    tips_target: 5,
  },
  "manual-pdf": {
    engines: ["PdfManualSectionExtractorEngine"],
    formulas: ["per-procedure-step-set"],
    nodes: ["node_procedure_manual", "node_section_manual"],
    tips_target: 15,
  },
  "paper-pdf": {
    engines: ["PdfAcademicPaperExtractorEngine"],
    formulas: ["per-citation-formula"],
    nodes: ["node_citation_paper", "node_concept_paper"],
    tips_target: 8,
  },
  "other-pdf": {
    engines: ["PdfGenericExtractorEngine"],
    formulas: ["per-pdf-derived-rules"],
    nodes: ["node_pdf_section"],
    tips_target: 5,
  },
};

function safeName(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function classifyPdf(relPath) {
  const r = relPath.toLowerCase();
  if (/machining|kienzle|taylor|sandvik|cuttingdata|kennametal|formulas/i.test(r)) return "machining-handbook";
  if (/catalog|tooling|holder|insert|tap|drill|reamer/i.test(r)) return "resource-catalog";
  if (/blueprint|drawing|drw|dwg/i.test(r)) return "blueprint-pdf";
  if (/manual|guide|setup|user|operator|maintenance|programming/i.test(r)) return "manual-pdf";
  if (/paper|research|study|journal/i.test(r)) return "paper-pdf";
  return "other-pdf";
}

function walkPdfs(root, out, depth = 0) {
  if (depth > PDF_WALK_MAX_DEPTH || out.length >= PDF_WALK_CAP) return;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (out.length >= PDF_WALK_CAP) return;
    if (SKIP_DIRS_RE.test(e.name)) continue;
    const full = path.join(root, e.name);
    if (e.isFile() && /\.pdf$/i.test(e.name)) out.push(full);
    else if (e.isDirectory()) walkPdfs(full, out, depth + 1);
  }
}

function discoverPdfs() {
  if (!fs.existsSync(RESOURCES_ROOT)) return [];
  const pdfs = [];
  walkPdfs(RESOURCES_ROOT, pdfs);
  const seen = new Set();
  const out = [];
  for (const p of pdfs) {
    const rel = path.relative(RESOURCES_ROOT, p).replace(/\\/g, "/");
    const slug = safeName(rel).slice(0, 100);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      kind: classifyPdf(rel),
      id: rel,
      slug,
      source: p,
      sizeMb: Math.round((fs.statSync(p).size / 1024 / 1024) * 10) / 10,
    });
  }
  return out;
}

function writeSpec(pdf) {
  const def = KIND_DEFAULTS[pdf.kind] || KIND_DEFAULTS["other-pdf"];
  const name = "AUTOGEN-EXTRACT-SPEC-" + pdf.slug + ".md";
  const out = path.join(SPECS_DIR, name);
  const body = [
    "# AUTOGEN EXTRACT SPEC — " + pdf.id,
    "",
    "Generated " + new Date().toISOString() + " by scripts/auto-resource-pdf-spec-emit.mjs (slot:india).",
    "Advisory + must_human_verify. /pdf-learn executes this spec to deliver the actual extracted assets.",
    "",
    "| Field | Value |",
    "|---|---|",
    "| PDF id | `" + pdf.id + "` |",
    "| Slug | `" + pdf.slug + "` |",
    "| Kind | `" + pdf.kind + "` |",
    "| Source path | `" + pdf.source + "` |",
    "| Size | " + pdf.sizeMb + " MB |",
    "",
    "## Build targets (auto-derived per kind)",
    "",
    "**Engines:** " + def.engines.map(x => "`" + x + "`").join(", "),
    "",
    "**Formulas:** " + def.formulas.map(x => "`" + x + "`").join(", "),
    "",
    "**Nodes (pointer-memory kinds):** " + def.nodes.map(x => "`" + x + "`").join(", "),
    "",
    "**Tribal tips target:** " + def.tips_target + " (Knowledge-Conversion-MS0 lane A direct-wire)",
    "",
    "## /pdf-learn execution loop",
    "",
    "```bash",
    "# 1. Extract PDF text (pdfjs / pdftotext fallback)",
    "# 2. Run /pdf-learn pipeline — tribal tips, formulas, citations",
    "# 3. Emit per-formula + per-tip + per-concept memory nodes",
    "# 4. Update wiki entry under knowledge/wiki/architecture/pdf-extracts/<slug>.md",
    "# 5. Bridge nodes to existing engines via system-viz augmentation",
    "```",
    "",
    "## PSN synergy targets",
    "",
    "- **Tribal** — extracted tips flow to KnowledgeTip[] via Knowledge-Conversion-MS0 lane A",
    "- **Wiki** — per-PDF wiki entry under knowledge/wiki/architecture/pdf-extracts/",
    "- **Memories** — per-formula / per-tip / per-concept pointer-memory files (Obsidian auto-mirror)",
    "- **System Viz** — pdf-extract.<slug> child node under ghost.resource_pdfs roost",
    "- **Engines** — extracted formulas wired to the named Engine (NOT stubbed — PRISM blocks placeholders)",
    "- **PRISM AI** — prism_ai:ai_resource_training_data consumes this spec dir",
    "",
    "Related: [[reference_college_course_autogen_specs_2026_05_24]] · [[knowledge-conversion-ms0]]",
  ].join("\n");
  fs.writeFileSync(out, body + "\n");
  return name;
}

function writeIndex(pdfs, byKind) {
  const total = pdfs.length;
  const lines = [
    "# Resource-PDF AUTOGEN EXTRACT spec INDEX",
    "",
    "Generated " + new Date().toISOString() + " by `scripts/auto-resource-pdf-spec-emit.mjs` (slot:india).",
    "",
    "## Summary",
    "",
    "- **Total PDFs discovered:** " + total,
    ...Object.entries(byKind).map(([k, n]) => "- `" + k + "`: " + n),
    "",
    "## Per-PDF spec files",
    "",
    "| PDF id | Kind | Size (MB) | Spec |",
    "|---|---|---|---|",
    ...pdfs.map(p => "| `" + p.id + "` | " + p.kind + " | " + p.sizeMb + " | [[AUTOGEN-EXTRACT-SPEC-" + p.slug + "]] |"),
    "",
    "## /pdf-learn execution",
    "",
    "Each spec lists the engines/formulas/nodes/tips per PDF. /pdf-learn executes them, building real assets (not stubs — PRISM blocks placeholder engines).",
    "",
    "Re-run: `node H:/prism/scripts/auto-resource-pdf-spec-emit.mjs`. Idempotent.",
    "",
    "Related: [[college-course-autogen-index-2026-05-24]]",
  ];
  fs.writeFileSync(INDEX_PATH, lines.join("\n") + "\n");
}

function main() {
  ensureDir(SPECS_DIR);
  const pdfs = discoverPdfs();
  const byKind = {};
  for (const p of pdfs) {
    writeSpec(p);
    byKind[p.kind] = (byKind[p.kind] || 0) + 1;
  }
  writeIndex(pdfs, byKind);
  console.log("pdfs=" + pdfs.length + " by-kind=" + JSON.stringify(byKind));
}
main();
