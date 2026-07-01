#!/usr/bin/env node
/**
 * consolidate-cadcam-corpus.mjs
 *
 * Filters the existing AUTOGEN-SPEC corpus (1401 college courses + 893 PDFs
 * from iter15..iter19) into CAD-relevant and CAM-relevant subsets, then emits:
 *
 *   - state/shared/CADCAM-CONSOLIDATED-INDEX-2026-05-24.md (operator view)
 *   - state/shared/cadcam-consolidated-corpus.json (machine handoff for delta + kilo)
 *
 * Adds a curated YouTube watchlist for /video-learn consumption (no extraction
 * triggered — that's the consuming slot's job per JULIETT-12CHAT-ALLOCATION-MS0).
 *
 * Pure: only reads spec dirs + emits two reports. No I/O against the source
 * files themselves (per-source content extraction is delta/kilo's job via
 * /college-extract + /pdf-learn).
 *
 * Handoff:
 *   - delta (CAD slot) — consumes `cad[]` array via prism_cad
 *   - kilo (CAM slot)  — consumes `cam[]` array via prism_cam
 *
 * @milestone MIT-COURSE-INTEGRATION/U-CADCAM-CONSOLIDATE
 * @slot india
 * @date 2026-05-24
 */
import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = "H:/prism";
const PDF_SPECS_DIR = path.join(REPO_ROOT, "state/shared/resource-pdf-specs");
const COURSE_SPECS_DIR = path.join(REPO_ROOT, "state/shared/college-course-specs");
const OUT_JSON = path.join(REPO_ROOT, "state/shared/cadcam-consolidated-corpus.json");
const OUT_MD = path.join(REPO_ROOT, "state/shared/CADCAM-CONSOLIDATED-INDEX-2026-05-24.md");

const PDF_SPEC_RE = /^AUTOGEN-EXTRACT-SPEC-(.+)\.md$/;
const COURSE_SPEC_RE = /^AUTOGEN-SPEC-(.+)\.md$/;
const KIND_RE = /^\|\s*Kind\s*\|\s*`?([^`|\n]+?)`?\s*\|$/m;
const SOURCE_RE = /^\|\s*Source path\s*\|\s*`?([^`|\n]+?)`?\s*\|$/m;
const PDF_ID_RE = /^\|\s*PDF id\s*\|\s*`?([^`|\n]+?)`?\s*\|$/m;
const COURSE_ID_RE = /^\|\s*Course id\s*\|\s*`?([^`|\n]+?)`?\s*\|$/m;

const CAD_KEYWORDS = /\b(cad|drawing|sketch|model|solidworks|inventor|fusion|freecad|catia|creo|nx|rhino|blender|dimension|tolerance|gdt|gd_t|blueprint|design|topology|generative|surface|nurbs|onshape|grasshopper|plasticity|moi|zbrush)\b/i;
const CAM_KEYWORDS = /\b(cam|mill|lathe|edm|toolpath|mastercam|hypermill|hsm|gibbscam|esprit|solidcam|post|gcode|g_code|fanuc|okuma|haas|siemens|heidenhain|mitsubishi|fadal|hurco|spindle|feedrate|speed_feed|cutter|insert|carbide|machining|tooling|catalog|catalogs|bobcad|powermill|featurecam)\b/i;

/** Curated YouTube watchlist — drop into /video-learn pipeline per consuming slot. */
const YOUTUBE_WATCHLIST = {
  cad: [
    { channel: "Lars Christensen", url: "https://youtube.com/@LarsChristensen", topic: "Fusion 360 + SolidWorks mastery" },
    { channel: "Paul Munford (CADSetterOut)", url: "https://youtube.com/@CADSetterOut", topic: "Inventor production workflows" },
    { channel: "sliptonic", url: "https://youtube.com/@sliptonic", topic: "FreeCAD Path workbench" },
    { channel: "Product Design Online", url: "https://youtube.com/@ProductDesignOnline", topic: "Fusion 360 product design" },
    { channel: "Blender Guru", url: "https://youtube.com/@blenderguru", topic: "Blender photoreal pipeline" },
    { channel: "CG Cookie", url: "https://youtube.com/@cg_cookie", topic: "Blender character pipeline" },
    { channel: "Grant Abbitt", url: "https://youtube.com/@grantabbitt", topic: "Blender game-ready characters" },
    { channel: "FlippedNormals", url: "https://youtube.com/@FlippedNormals", topic: "ZBrush + Marvelous Designer pro pipeline" },
  ],
  cam: [
    { channel: "Titans of CNC Academy", url: "https://youtube.com/@TITANSofCNC", topic: "Mastercam + Fusion CAM strategies" },
    { channel: "NYC CNC", url: "https://youtube.com/@NYCCNC", topic: "Fusion 360 CAM + Tormach workflows" },
    { channel: "John Saunders / NYCCNC", url: "https://youtube.com/@NYCCNC", topic: "shop-floor CAM lessons" },
    { channel: "Edge Precision", url: "https://youtube.com/@EdgePrecision", topic: "Mazak multi-axis + Mastercam" },
    { channel: "Cutting Tool Engineering", url: "https://ctemag.com", topic: "Industry CAM techniques (articles + video)" },
    { channel: "Sandvik Coromant", url: "https://youtube.com/@SandvikCoromant", topic: "Cutting data + chip-control reference" },
    { channel: "Haas Automation", url: "https://youtube.com/@HaasAutomationInc", topic: "Haas controller + macro programming" },
  ],
};

const BOOK_REFERENCES = {
  cad: [
    "Farin — Curves and Surfaces for CAGD",
    "Shigley's Mechanical Engineering Design (10th ed)",
    "Boothroyd & Dewhurst — Product Design for Manufacture and Assembly",
    "ASME Y14.5-2018 — Dimensioning and Tolerancing",
    "Anatomy for Sculptors (Ulric & Ostroski) — for organic Blender work",
  ],
  cam: [
    "Machinery's Handbook (Industrial Press, latest)",
    "Sandvik Modern Metal Cutting (textbook)",
    "Smid — CNC Programming Handbook",
    "Lynch — Machining Tools and Operations",
    "Boothroyd, Knight, Dewhurst — Fundamentals of Machining and Machine Tools",
  ],
};

function safeName(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }

function readSpecs(dir, fileRe, idRe) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).sort()) {
    const m = f.match(fileRe);
    if (!m) continue;
    try {
      const body = fs.readFileSync(path.join(dir, f), "utf8");
      const slug = m[1];
      const kind = (body.match(KIND_RE) || [])[1]?.trim() || "unknown";
      const source = (body.match(SOURCE_RE) || [])[1]?.trim() || "";
      const id = (body.match(idRe) || [])[1]?.trim() || slug;
      out.push({ slug, id, kind, source });
    } catch { /* skip */ }
  }
  return out;
}

function classifyEntry(entry, overrides) {
  const text = (entry.id + " " + entry.source + " " + entry.slug + " " + entry.kind).toLowerCase();
  let isCad = CAD_KEYWORDS.test(text);
  let isCam = CAM_KEYWORDS.test(text);
  // Ollama reclassify overrides (cadcam-reclassify-ollama.mjs): recover CAD/CAM docs the
  // filename-keyword regex misses (path-semantic classify, conf-gated >= 0.7). OR-in only
  // -- an override never UN-sets a regex hit. See state/shared/cadcam-classify-overrides.json.
  const ov = overrides && overrides[entry.slug];
  if (ov && Number(ov.conf) >= 0.7) {
    if (ov.domain === "cad" || ov.domain === "both") isCad = true;
    if (ov.domain === "cam" || ov.domain === "both") isCam = true;
  }
  return { cad: isCad, cam: isCam };
}

function main() {
  const pdfEntries = readSpecs(PDF_SPECS_DIR, PDF_SPEC_RE, PDF_ID_RE);
  const courseEntries = readSpecs(COURSE_SPECS_DIR, COURSE_SPEC_RE, COURSE_ID_RE);

  // Durable Ollama reclassify overrides (CAD/CAM recovery beyond the keyword regex).
  const OVERRIDES_PATH = path.join(REPO_ROOT, "state/shared/cadcam-classify-overrides.json");
  let overrides = {};
  try { if (fs.existsSync(OVERRIDES_PATH)) overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8")).decided || {}; } catch { /* fail-soft: regex-only */ }

  const cadCorpus = [];
  const camCorpus = [];
  const bothCorpus = [];
  let total = 0;

  for (const e of [...pdfEntries.map(p => ({ ...p, source_type: "pdf" })), ...courseEntries.map(c => ({ ...c, source_type: "course" }))]) {
    total++;
    const c = classifyEntry(e, overrides);
    const enriched = { ...e, classification: c };
    if (c.cad && c.cam) { bothCorpus.push(enriched); cadCorpus.push(enriched); camCorpus.push(enriched); }
    else if (c.cad) cadCorpus.push(enriched);
    else if (c.cam) camCorpus.push(enriched);
  }

  const result = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    slot: "india",
    handoff_targets: { cad: "delta", cam: "kilo" },
    sources: {
      pdf_specs_dir: "state/shared/resource-pdf-specs/",
      college_specs_dir: "state/shared/college-course-specs/",
      pdf_count: pdfEntries.length,
      course_count: courseEntries.length,
    },
    cad: cadCorpus,
    cam: camCorpus,
    both: bothCorpus.map(e => ({ slug: e.slug, kind: e.kind })),
    youtube_watchlist: YOUTUBE_WATCHLIST,
    book_references: BOOK_REFERENCES,
    stats: {
      total_evaluated: total,
      cad_corpus: cadCorpus.length,
      cam_corpus: camCorpus.length,
      cad_AND_cam: bothCorpus.length,
      cad_only: cadCorpus.length - bothCorpus.length,
      cam_only: camCorpus.length - bothCorpus.length,
      neither: total - (cadCorpus.length + camCorpus.length - bothCorpus.length),
    },
    consume_api: {
      json_handoff: "state/shared/cadcam-consolidated-corpus.json",
      delta_pipeline: "delta reads cad[] → /cad-extract / /cad-train / prism_cad consumers",
      kilo_pipeline: "kilo reads cam[] → /cam-strategy / /mastercam-setup / /hypermill-* / prism_cam consumers",
      bridge_edges: "system-graph: source.startsWith('pdf-extract.' OR 'college.course.') AND type IN ('enriches-engine', 'feeds-dispatcher')",
      per_source_extraction: "/pdf-learn <pdf> or /college-extract <slug> (already wired)",
      video_learn: "/video-learn — drop youtube_watchlist URLs into state/shared/video-watchlist.json",
    },
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

  const mdLines = [
    "# CAD + CAM Consolidated Corpus — handoff to delta + kilo",
    "",
    "Generated " + result.generatedAt + " by `scripts/consolidate-cadcam-corpus.mjs` (slot:india).",
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|---|---|",
    "| Total evaluated | " + result.stats.total_evaluated + " |",
    "| CAD corpus | " + result.stats.cad_corpus + " |",
    "| CAM corpus | " + result.stats.cam_corpus + " |",
    "| CAD ∩ CAM | " + result.stats.cad_AND_cam + " |",
    "| CAD only | " + result.stats.cad_only + " |",
    "| CAM only | " + result.stats.cam_only + " |",
    "| Neither (general) | " + result.stats.neither + " |",
    "",
    "## Handoff targets",
    "",
    "- **delta** (CAD slot) — consumes `cad[]` (" + cadCorpus.length + " entries) via `prism_cad` + CAD/Blender pipelines",
    "- **kilo** (CAM slot) — consumes `cam[]` (" + camCorpus.length + " entries) via `prism_cam` + CAM/post pipelines",
    "",
    "## YouTube watchlist (8 CAD + 7 CAM channels)",
    "",
    "### CAD channels",
    ...YOUTUBE_WATCHLIST.cad.map(c => "- **" + c.channel + "** — " + c.topic + " — " + c.url),
    "",
    "### CAM channels",
    ...YOUTUBE_WATCHLIST.cam.map(c => "- **" + c.channel + "** — " + c.topic + " — " + c.url),
    "",
    "## Book references",
    "",
    "### CAD",
    ...BOOK_REFERENCES.cad.map(b => "- " + b),
    "",
    "### CAM",
    ...BOOK_REFERENCES.cam.map(b => "- " + b),
    "",
    "## Top-10 CAD entries (sample)",
    "",
    ...cadCorpus.slice(0, 10).map(e => "- `" + e.id + "` (" + e.kind + " · " + e.source_type + ")"),
    "",
    "## Top-10 CAM entries (sample)",
    "",
    ...camCorpus.slice(0, 10).map(e => "- `" + e.id + "` (" + e.kind + " · " + e.source_type + ")"),
    "",
    "## Consume API",
    "",
    "- **JSON handoff:** `state/shared/cadcam-consolidated-corpus.json`",
    "- **delta pipeline:** reads `cad[]` → `/cad-extract`, `/cad-train`, `prism_cad` consumers",
    "- **kilo pipeline:** reads `cam[]` → `/cam-strategy`, `/mastercam-setup`, `/hypermill-*`, `prism_cam` consumers",
    "- **Bridge edges:** `system-graph` edges with `type IN ('enriches-engine', 'feeds-dispatcher')` from `pdf-extract.*` / `college.course.*` sources",
    "- **Per-source extraction:** `/pdf-learn <pdf>` or `/college-extract <slug>` (already wired)",
    "- **YouTube:** `/video-learn` — drop watchlist URLs into `state/shared/video-watchlist.json`",
    "",
    "Related: [[reference_college_course_autogen_specs_2026_05_24]] · [[reference_pdf_course_bridge_iter20_2026_05_24]]",
  ];

  fs.writeFileSync(OUT_MD, mdLines.join("\n") + "\n");

  console.log("wrote " + OUT_JSON);
  console.log("wrote " + OUT_MD);
  console.log("  total=" + total + " cad=" + cadCorpus.length + " cam=" + camCorpus.length + " both=" + bothCorpus.length);
}

main();
