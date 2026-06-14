#!/usr/bin/env node
/**
 * auto-college-course-spec-emit.mjs
 *
 * Walks H:/PRISM/resources for ALL college/training course sources and emits
 * one AUTOGEN-SPEC.md per discovered course declaring the
 * skills/scripts/hooks/engines/algorithms/formulas/nodes that lima should
 * generate when live-extracting that course.
 *
 * NOT a stub-emitter (PRISM blocks placeholder engines). Instead emits
 * machine-readable BUILD SPECS that any chat can execute against. The specs
 * are advisory + must_human_verify.
 *
 * Sources walked (course-like only):
 *   - H:/PRISM/resources/MIT COURSES/* (zips + extracted dirs)
 *   - H:/PRISM/resources/PRISM CAD-CAM TRAINING
 *   - H:/PRISM/resources/PRISM FOLDER FROM HOME
 *   - H:/PRISM/resources/1- Basic Training Day 1 / Day 2 / Day 3
 *   - H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS
 *   - H:/PRISM/resources/RESOURCE PDFS
 *   - H:/PRISM/resources/Training Videos*
 *
 * Output:
 *   - state/shared/college-course-specs/AUTOGEN-SPEC-<slug>.md (one per course)
 *   - state/shared/COLLEGE-COURSE-AUTOGEN-INDEX-2026-05-23.md (master)
 *
 * @milestone MIT-COURSE-INTEGRATION/U-MIT-COLLEGE-AUTOGEN-SPECS
 * @slot india
 * @date 2026-05-24
 */
import * as fs from "node:fs";
import * as path from "node:path";

const RESOURCES_ROOT = "H:/PRISM/resources";
const REPO_ROOT = "H:/prism";
const SPECS_DIR = path.join(REPO_ROOT, "state/shared/college-course-specs");
const INDEX_PATH = path.join(REPO_ROOT, "state/shared/COLLEGE-COURSE-AUTOGEN-INDEX-2026-05-24.md");
const MIT_CATALOG = "H:/PRISM/resources/MIT COURSES/PRISM_COURSE_CATALOG.json";

const COURSE_DIRS = [
  { dir: "MIT COURSES", kind: "mit-ocw", domain: "academic" },
  { dir: "PRISM CAD-CAM TRAINING", kind: "prism-training", domain: "cad-cam" },
  { dir: "PRISM FOLDER FROM HOME", kind: "prism-personal", domain: "mixed" },
  { dir: "1- Basic Training Day 1", kind: "basic-training", domain: "shop-floor" },
  { dir: "2- Basic Training Day 2", kind: "basic-training", domain: "shop-floor" },
  { dir: "3- Basic Training Day 3", kind: "basic-training", domain: "shop-floor" },
  { dir: "MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS", kind: "knowledge-pack", domain: "physics" },
  { dir: "RESOURCE PDFS", kind: "handbook-pdfs", domain: "reference" },
];

const KIND_DEFAULTS = {
  "mit-ocw": {
    engines: ["MitCourseFormulaExtractorEngine", "MitCourseLectureNotesExtractorEngine"],
    algorithms: ["TextChunkingByTopic", "FormulaPatternMatcher"],
    formulas: ["per-course-canonical-formula-set"],
    skills: ["/college-extract-<slug>"],
    hooks: ["PreToolUse:Read for course-pdf prefetch"],
    nodes: ["node_course", "node_formula", "node_textbook", "node_instructor"],
  },
  "prism-training": {
    engines: ["PrismTrainingModuleParserEngine", "PrismTutorialStepExtractorEngine"],
    algorithms: ["StepSequenceExtractor", "ScreenshotCaptionMatcher"],
    formulas: ["per-tutorial-procedure-set"],
    skills: ["/college-extract-prism-training-<slug>"],
    hooks: ["PostToolUse:Write to log training-step completions"],
    nodes: ["node_training_module", "node_training_step", "node_screenshot"],
  },
  "basic-training": {
    engines: ["BasicTrainingDayCurriculumEngine"],
    algorithms: ["DailyCurriculumParser"],
    formulas: ["per-day-procedure-checklist"],
    skills: ["/college-extract-day-<n>"],
    hooks: [],
    nodes: ["node_training_day", "node_lesson"],
  },
  "knowledge-pack": {
    engines: ["MachiningKnowledgeFormulaExtractorEngine"],
    algorithms: ["FormulaSymbolNormalizer", "UnitConversionInferrer"],
    formulas: ["per-handbook-canonical-formula-set"],
    skills: ["/college-extract-formula-handbook"],
    hooks: ["PreToolUse:Read for formula-PDF prefetch"],
    nodes: ["node_formula_canonical", "node_handbook"],
  },
  "handbook-pdfs": {
    engines: ["HandbookPdfExtractorEngine"],
    algorithms: ["PdfTableExtractor", "FigureToTribalTip"],
    formulas: ["per-handbook-table-set"],
    skills: ["/college-extract-handbook-pdf"],
    hooks: ["PreToolUse:Read /pdf-learn auto-route"],
    nodes: ["node_handbook", "node_pdf_table", "node_figure"],
  },
  "prism-personal": {
    engines: ["PersonalNotesExtractorEngine"],
    algorithms: ["MarkdownTopicCluster"],
    formulas: ["per-note-derived-rules"],
    skills: ["/college-extract-personal-notes"],
    hooks: [],
    nodes: ["node_personal_note", "node_topic_cluster"],
  },
};

function safeName(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

// Recursive directory walker — bounded depth, skips noisy node_modules / site-packages / .git.
function walkDirs(root, maxDepth, predicate, out, depth = 0) {
  if (depth > maxDepth) return;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (/^(node_modules|\.git|site-packages|__pycache__|venv|\.venv|Freecad|freecad|lib|bin|dist|build|coverage|\.next|\.cache)$/i.test(e.name)) continue;
    const full = path.join(root, e.name);
    if (predicate(e.name, full, depth)) out.push(full);
    walkDirs(full, maxDepth, predicate, out, depth + 1);
  }
}

// Recursive PDF walker — bounded depth, throttled.
function walkFiles(root, maxDepth, extRe, out, depth = 0, cap = 5000) {
  if (depth > maxDepth || out.length >= cap) return;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (out.length >= cap) return;
    if (/^(node_modules|\.git|site-packages|__pycache__|venv|\.venv|Freecad|freecad|lib|bin|dist|build|coverage|\.next|\.cache)$/i.test(e.name)) continue;
    const full = path.join(root, e.name);
    if (e.isFile() && extRe.test(e.name)) out.push(full);
    else if (e.isDirectory()) walkFiles(full, maxDepth, extRe, out, depth + 1, cap);
  }
}

const MIT_COURSE_DIR_RE = /^[\w.]+-(spring|fall|summer|winter|january-iap)-\d{4}$/i;

function discoverSources() {
  const out = [];
  const seenSlugs = new Set();

  // Lane A — JSON catalog (89 cataloged MIT-OCW courses)
  if (fs.existsSync(MIT_CATALOG)) {
    const cat = JSON.parse(fs.readFileSync(MIT_CATALOG, "utf8"));
    for (const c of (cat.courses || [])) {
      const id = c.courseId || c.id;
      if (!id) continue;
      const slug = "mit-" + safeName(id);
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      out.push({ kind: "mit-ocw", domain: "academic", id, slug, source: c.path || "(zip)" });
    }
  }

  // Lane B — recursive MIT walker (depth 4) catches MIT COURSES 2/3/4/5/UPLOADED + nested dirs not in the catalog
  const mitRoot = path.join(RESOURCES_ROOT, "MIT COURSES");
  if (fs.existsSync(mitRoot)) {
    const mitDirs = [];
    walkDirs(mitRoot, 4, (name) => MIT_COURSE_DIR_RE.test(name), mitDirs);
    for (const d of mitDirs) {
      const base = path.basename(d);
      const slug = "mit-" + safeName(base);
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      out.push({ kind: "mit-ocw", domain: "academic", id: base, slug, source: d });
    }
  }

  // Lane C — declared top-level COURSE_DIRS (basic-training, knowledge-pack, etc.)
  for (const cd of COURSE_DIRS) {
    if (cd.kind === "mit-ocw") continue;
    const full = path.join(RESOURCES_ROOT, cd.dir);
    if (!fs.existsSync(full)) continue;
    const slug = safeName(cd.dir);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    out.push({ kind: cd.kind, domain: cd.domain, id: cd.dir, slug, source: full });
  }

  // Lane D — PDF inventory across H:/PRISM/resources (depth 2, cap 500)
  const pdfRoot = RESOURCES_ROOT;
  if (fs.existsSync(pdfRoot)) {
    const pdfs = [];
    walkFiles(pdfRoot, 2, /\.pdf$/i, pdfs, 0, 500);
    for (const p of pdfs) {
      const rel = path.relative(pdfRoot, p).replace(/\\/g, "/");
      const slug = "pdf-resources-" + safeName(rel).slice(0, 80);
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      out.push({ kind: "handbook-pdfs", domain: "reference", id: rel, slug, source: p });
    }
  }

  // Lane E — JM DIE shop-floor program tree (depth 0 only — 24K files at deeper depth)
  const jmDieRoot = "H:/PRISM/JM DIE";
  if (fs.existsSync(jmDieRoot)) {
    const jmDirs = [];
    walkDirs(jmDieRoot, 0, () => true, jmDirs);
    for (const d of jmDirs) {
      const rel = path.relative(jmDieRoot, d).replace(/\\/g, "/");
      const slug = "jm-die-" + safeName(rel).slice(0, 80);
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      out.push({ kind: "prism-training", domain: "shop-floor", id: "JM DIE/" + rel, slug, source: d });
    }
  }

  return out;
}

function writeSpec(course) {
  const def = KIND_DEFAULTS[course.kind] || KIND_DEFAULTS["mit-ocw"];
  const name = "AUTOGEN-SPEC-" + course.slug + ".md";
  const out = path.join(SPECS_DIR, name);
  const body = [
    "# AUTOGEN SPEC — " + course.id,
    "",
    "Generated " + new Date().toISOString() + " by scripts/auto-college-course-spec-emit.mjs (slot:india).",
    "Advisory + must_human_verify. Lima slot executes this spec to deliver the actual assets.",
    "",
    "| Field | Value |",
    "|---|---|",
    "| Course id | `" + course.id + "` |",
    "| Slug | `" + course.slug + "` |",
    "| Kind | `" + course.kind + "` |",
    "| Domain | `" + course.domain + "` |",
    "| Source path | `" + course.source + "` |",
    "",
    "## Build targets (auto-derived per kind)",
    "",
    "**Engines:** " + def.engines.map(x => "`" + x + "`").join(", "),
    "",
    "**Algorithms:** " + def.algorithms.map(x => "`" + x + "`").join(", "),
    "",
    "**Formulas:** " + def.formulas.map(x => "`" + x + "`").join(", "),
    "",
    "**Skills:** " + def.skills.map(x => "`" + x + "`").join(", "),
    "",
    "**Hooks:** " + (def.hooks.length ? def.hooks.map(x => "`" + x + "`").join(", ") : "(none for this kind)"),
    "",
    "**Nodes (pointer-memory kinds):** " + def.nodes.map(x => "`" + x + "`").join(", "),
    "",
    "## Lima execution loop",
    "",
    "```bash",
    "# 1. live-extract this course (Playwright/WebFetch/PDF-OCR per kind)",
    "node H:/prism/scripts/mit-extracted-node-emitter.mjs   # for mit-ocw kinds",
    "# 2. wire formulas into named engines (build, not stub)",
    "# 3. wire skills + hooks as slash commands + settings.json entries",
    "# 4. re-run coverage audit to flip stuck->fully-wired",
    "node H:/prism/scripts/mit-pipeline-coverage-audit.mjs",
    "```",
    "",
    "## PSN synergy targets",
    "",
    "- **System Viz** — node pointers auto-indexed on next /system-viz regen",
    "- **Obsidian** — memory files auto-fed on Stop",
    "- **Wiki** — per-course wiki entry under knowledge/wiki/architecture/courses/",
    "- **Tribal index** — Consuming engines row links to formula consumers",
    "- **PRISM Academy UI (lima PWA)** — node_course + node_formula render as course cards",
    "- **AI training data** — prism_ai:ai_resource_training_data consumes node pointers",
    "",
    "Related: [[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]] · [[reference_mit_ocw_resolver_joint_course_slug_bug_2026_05_23]] · `state/shared/MIT-PIPELINE-COVERAGE-2026-05-23.md`",
  ].join("\n");
  fs.writeFileSync(out, body + "\n");
  return name;
}

function writeIndex(courses, byKind) {
  const total = courses.length;
  const lines = [
    "# College-course AUTOGEN spec INDEX",
    "",
    "Generated " + new Date().toISOString() + " by `scripts/auto-college-course-spec-emit.mjs` (slot:india).",
    "",
    "## Summary",
    "",
    "- **Total course-like sources discovered:** " + total,
    ...Object.entries(byKind).map(([k, n]) => "- `" + k + "`: " + n),
    "",
    "## Per-course spec files",
    "",
    "| Course id | Kind | Spec |",
    "|---|---|---|",
    ...courses.map(c => "| `" + c.id + "` | " + c.kind + " | [[AUTOGEN-SPEC-" + c.slug + "]] |"),
    "",
    "## Lima execution",
    "",
    "Each spec lists the engines/algorithms/formulas/skills/hooks/nodes per course. Lima executes them, building real assets (not stubs — PRISM blocks placeholder engines).",
    "",
    "Re-run: `node H:/prism/scripts/auto-college-course-spec-emit.mjs`. Idempotent.",
    "",
    "Related: [[mit-course-triplet-index-2026-05-23]] · [[mit-pipeline-coverage-2026-05-23]]",
  ];
  fs.writeFileSync(INDEX_PATH, lines.join("\n") + "\n");
}

function main() {
  ensureDir(SPECS_DIR);
  const courses = discoverSources();
  const byKind = {};
  for (const c of courses) {
    writeSpec(c);
    byKind[c.kind] = (byKind[c.kind] || 0) + 1;
  }
  writeIndex(courses, byKind);
  console.log("courses=" + courses.length + " by-kind=" + JSON.stringify(byKind));
}
main();
