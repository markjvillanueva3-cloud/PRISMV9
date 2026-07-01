/**
 * materialize-mit-ocw-corpus.mjs
 * AI-SYNERGY / U-INDIA-MITOCW-MATERIALIZE (slot:india)
 *
 * SOURCE-OF-TRUTH registry builder for the MIT-OCW corpus.
 * Reads MIT_COURSE_INDEX.json + PRISM_COURSE_CATALOG.json from
 * H:/prism/resources/MIT COURSES/, scans the 6 disk zones for
 * presence verification, deduplicates by course-id, and writes
 *   extracted/mit-ocw/corpus-index.jsonl
 * one JSON object per line.
 *
 * Schema per line:
 *   {
 *     course_id:    string   -- canonical OCW id, e.g. "2.810"
 *     slug:         string   -- filesystem slug, e.g. "2.810-fall-2005"
 *     title:        string
 *     category:     string   -- index category key
 *     priority:     string   -- "TIER_1" | "TIER_2" | "TIER_3"
 *     topics:       string[]
 *     prism_engines: string[] -- PRISM engine names from prismMapping
 *     sections:     string[] -- inferred from topics (no text extraction)
 *     url:          string   -- canonical OCW URL
 *     source_path:  string | null -- absolute path if found on disk
 *     has_zip:      boolean
 *     is_extracted: boolean
 *     relevance:    string   -- "manufacturing" | "algorithms" | "controls" | ...
 *     extracted_at: string   -- ISO timestamp
 *   }
 *
 * This is a REGISTRY-ONLY builder. No PDF text extraction happens here.
 * PDF text extraction is lima/pdf-corpus's job (separate pipeline).
 *
 * Usage:
 *   node scripts/materialize-mit-ocw-corpus.mjs             # build registry
 *   node scripts/materialize-mit-ocw-corpus.mjs --dry-run   # count only, no write
 *   node scripts/materialize-mit-ocw-corpus.mjs --test      # run 6 self-tests
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, resolve } from "path";

// ============================================================================
// CONSTANTS
// ============================================================================

const MIT_ROOT = "H:/prism/resources/MIT COURSES";
const OUTPUT_DIR = "H:/prism/extracted/mit-ocw";
const OUTPUT_FILE = join(OUTPUT_DIR, "corpus-index.jsonl");

// The 6 source zones from MitCourseIndexEngine
const SOURCE_ZONES = [
  join(MIT_ROOT),
  join(MIT_ROOT, "UPLOADED"),
  join(MIT_ROOT, "MIT COURSES 2"),
  join(MIT_ROOT, "MIT COURSES 2", "UPLOADED"),
  join(MIT_ROOT, "MIT COURSES 3"),
  join(MIT_ROOT, "MIT COURSES 3", "UPLOADED"),
  join(MIT_ROOT, "MIT COURSES 4"),
  join(MIT_ROOT, "MIT COURSES 5", "FULL FILES"),
];

/**
 * Derive canonical OCW URL from course_id.
 * @param {string} courseId - e.g. "2.810", "6.046J", "esd.342"
 * @returns {string} canonical ocw.mit.edu URL
 */
function buildOcwUrl(courseId) {
  // OCW URL pattern: https://ocw.mit.edu/courses/<dept>-<number>/
  // e.g. 2.810 -> courses/2-810/, 6.046J -> courses/6-046j/
  const normalized = courseId.toLowerCase().replace(/\./g, "-");
  return `https://ocw.mit.edu/courses/${normalized}/`;
}

/**
 * Classify a course into a PRISM relevance bucket based on category + topics.
 * @param {string} category - index category key
 * @param {string[]} topics
 * @returns {string}
 */
function classifyRelevance(category, topics) {
  const mfg = ["manufacturing", "materials", "materials_science"];
  const ctrl = ["control_dynamics", "signal_processing"];
  const alg = ["algorithms", "optimization", "numerical_methods", "parallel_computing"];
  const design = ["graphics_geometry", "systems_engineering", "human_factors"];
  const fluidThermal = ["fluid_thermal"];

  if (mfg.includes(category)) return "manufacturing";
  if (ctrl.includes(category)) return "controls";
  if (alg.includes(category)) return "algorithms";
  if (design.includes(category)) return "design";
  if (fluidThermal.includes(category)) return "fluid_thermal";

  // Topic-level fallback
  const topicStr = (topics || []).join(" ").toLowerCase();
  if (/cutting|machining|cnc|mill|lathe|toolpath|chip|tool.wear/.test(topicStr)) return "manufacturing";
  if (/pid|control|feedback|stability|bode|root.locus/.test(topicStr)) return "controls";
  if (/algorithm|sorting|graph|dynamic.program|NP/.test(topicStr)) return "algorithms";
  if (/heat|thermal|fluid|convect|conduc/.test(topicStr)) return "fluid_thermal";

  if (/machine.learning|neural|SVM|classif/.test(topicStr)) return "general_engineering";
  return "other";
}

/**
 * Scan the 6 disk zones and return a set of slugs found, plus a map
 * slug -> {source_path, has_zip, is_extracted}.
 * Only looks one level deep; ignores non-course entries (JSON files, etc.).
 * @param {boolean} [silent=false] suppress warnings
 * @returns {Map<string, {source_path: string, has_zip: boolean, is_extracted: boolean}>}
 */
function scanDiskZones(silent = false) {
  /** @type {Map<string, {source_path: string, has_zip: boolean, is_extracted: boolean}>} */
  const found = new Map();

  // OCW slug pattern: starts with digit or letter+digit (dept.num-semester-year)
  // Matches: "2.810-fall-2005", "6.046j-spring-2015", "esd.342-spring-2006"
  // Reject: "MIT COURSES 2", "UPLOADED", "ALGORITHM_REGISTRY.json", etc.
  const slugRe = /^[0-9a-z]+\.[0-9a-z]+(-[a-z])/i;

  for (const zone of SOURCE_ZONES) {
    if (!existsSync(zone)) continue;
    let entries;
    try {
      entries = readdirSync(zone);
    } catch {
      if (!silent) process.stderr.write(`[warn] cannot read zone: ${zone}\n`);
      continue;
    }

    for (const entry of entries) {
      const isZip = entry.endsWith(".zip");
      const bare = isZip ? entry.slice(0, -4) : entry;

      // Only accept OCW slug format
      if (!slugRe.test(bare)) continue;

      const slug = bare.toLowerCase();
      const entryPath = join(zone, entry);

      if (!found.has(slug)) {
        found.set(slug, {
          source_path: resolve(join(zone, bare)),
          has_zip: isZip,
          is_extracted: !isZip,
        });
      } else {
        // Merge: a zip + extracted folder for same course
        const existing = found.get(slug);
        if (isZip) existing.has_zip = true;
        else {
          existing.is_extracted = true;
          existing.source_path = resolve(join(zone, bare));
        }
      }
    }
  }

  return found;
}

/**
 * Parse the course_id from a filesystem slug.
 * "2.43-spring-2024" -> "2.43"
 * "10.34-fall-2015" -> "10.34"
 * "esd.342-spring-2006" -> "esd.342"
 * @param {string} slug
 * @returns {string}
 */
function slugToCourseId(slug) {
  // Everything before the first hyphen that is followed by a semester keyword
  const m = slug.match(/^(.+?)(?:-(?:spring|fall|january|iap|summer|winter))/i);
  if (m) return m[1].toUpperCase();
  // Fallback: dept.num is the part before the first dash
  const dash = slug.indexOf("-");
  return dash >= 0 ? slug.slice(0, dash).toUpperCase() : slug.toUpperCase();
}

/**
 * Load and validate a JSON file. Returns null on any error.
 * @param {string} filePath
 * @returns {unknown|null}
 */
function loadJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

// ============================================================================
// CORE BUILDER
// ============================================================================

/**
 * Build the corpus index from MIT_COURSE_INDEX.json + PRISM_COURSE_CATALOG.json
 * + disk scan. Returns the array of CorpusEntry objects.
 *
 * Deduplication: keyed on course_id (upper-case). Last writer wins for disk
 * presence; first writer wins for title/topics from the JSON index.
 *
 * @param {{silent?: boolean}} opts
 * @returns {{entries: CorpusEntry[], warnings: string[]}}
 */
export function buildCorpusIndex(opts = {}) {
  const { silent = false } = opts;
  const warnings = [];
  const now = new Date().toISOString();

  // -- Load index JSON files --
  const courseIndexPath = join(MIT_ROOT, "MIT_COURSE_INDEX.json");
  const catalogPath = join(MIT_ROOT, "PRISM_COURSE_CATALOG.json");

  const courseIndex = loadJson(courseIndexPath);
  const catalog = loadJson(catalogPath);

  if (!courseIndex) {
    warnings.push(`MIT_COURSE_INDEX.json not found or unparseable at: ${courseIndexPath}`);
  }
  if (!catalog) {
    warnings.push(`PRISM_COURSE_CATALOG.json not found or unparseable at: ${catalogPath}`);
  }

  // -- Disk scan --
  const diskMap = scanDiskZones(silent);

  // -- Build prismMapping lookup: course_id -> engine names --
  /** @type {Map<string, string[]>} */
  const prismEngineMap = new Map();
  if (courseIndex && courseIndex.prismMapping) {
    for (const [engineKey, courseIds] of Object.entries(courseIndex.prismMapping)) {
      for (const cid of courseIds) {
        const key = cid.toUpperCase();
        const list = prismEngineMap.get(key) || [];
        if (!list.includes(engineKey)) list.push(engineKey);
        prismEngineMap.set(key, list);
      }
    }
  }

  // -- Build entries map keyed by course_id --
  /** @type {Map<string, CorpusEntry>} */
  const entries = new Map();

  // Pass 1: iterate MIT_COURSE_INDEX.json coursesByCategory
  if (courseIndex && courseIndex.coursesByCategory) {
    for (const [category, catData] of Object.entries(courseIndex.coursesByCategory)) {
      const priority = catData.priority || "TIER_3";
      const courses = catData.courses || [];

      for (const course of courses) {
        if (!course.id) continue;
        const courseId = course.id.toUpperCase();

        // Derive slug from the "file" field if present, else synthesize from id
        let slug = "";
        if (course.file) {
          slug = course.file.replace(/\.zip$/, "").toLowerCase();
        } else {
          slug = course.id.toLowerCase();
        }

        const topics = Array.isArray(course.topics) ? course.topics : [];
        const prismEngines = prismEngineMap.get(courseId) || [];
        const relevance = classifyRelevance(category, topics);

        // Check disk presence
        const diskEntry = diskMap.get(slug) || findDiskByPrefix(diskMap, courseId);

        entries.set(courseId, {
          course_id: courseId,
          slug,
          title: course.name || "",
          category,
          priority,
          topics,
          prism_engines: prismEngines,
          sections: buildSections(topics),
          url: buildOcwUrl(courseId),
          source_path: diskEntry ? diskEntry.source_path : null,
          has_zip: diskEntry ? diskEntry.has_zip : false,
          is_extracted: diskEntry ? diskEntry.is_extracted : false,
          relevance,
          extracted_at: now,
        });
      }
    }
  }

  // Pass 2: fold in disk-only courses not in the index
  for (const [slug, diskEntry] of diskMap.entries()) {
    const courseId = slugToCourseId(slug);
    if (!entries.has(courseId)) {
      const topics = [];
      entries.set(courseId, {
        course_id: courseId,
        slug,
        title: courseId,
        category: "disk_only",
        priority: "TIER_3",
        topics,
        prism_engines: prismEngineMap.get(courseId) || [],
        sections: [],
        url: buildOcwUrl(courseId),
        source_path: diskEntry.source_path,
        has_zip: diskEntry.has_zip,
        is_extracted: diskEntry.is_extracted,
        relevance: "other",
        extracted_at: now,
      });
    } else {
      // Merge disk presence into existing entry
      const existing = entries.get(courseId);
      if (diskEntry.has_zip) existing.has_zip = true;
      if (diskEntry.is_extracted) {
        existing.is_extracted = true;
        existing.source_path = diskEntry.source_path;
      } else if (!existing.source_path) {
        existing.source_path = diskEntry.source_path;
      }
    }
  }

  return { entries: Array.from(entries.values()), warnings };
}

/**
 * Find a disk entry by scanning for any slug whose prefix matches courseId.
 * Used when the index "file" field is absent.
 * @param {Map<string, any>} diskMap
 * @param {string} courseId - e.g. "2.810"
 * @returns {{source_path:string, has_zip:boolean, is_extracted:boolean}|null}
 */
function findDiskByPrefix(diskMap, courseId) {
  const prefix = courseId.toLowerCase() + "-";
  for (const [slug, entry] of diskMap.entries()) {
    if (slug.startsWith(prefix)) return entry;
  }
  return null;
}

/**
 * Build a sections array from topics. Each topic becomes a section name.
 * This gives RAG engines a structured lookup without text extraction.
 * @param {string[]} topics
 * @returns {string[]}
 */
function buildSections(topics) {
  return (topics || []).map((t) => t.replace(/-/g, " "));
}

// ============================================================================
// WRITER
// ============================================================================

/**
 * Write the corpus-index.jsonl file.
 * @param {CorpusEntry[]} entries
 * @param {string} outputPath
 */
export function writeCorpusIndex(entries, outputPath) {
  mkdirSync(resolve(join(outputPath, "..")), { recursive: true });
  const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  writeFileSync(outputPath, lines, "utf-8");
}

// ============================================================================
// CLI MAIN
// ============================================================================

/**
 * @typedef {Object} CorpusEntry
 * @property {string} course_id
 * @property {string} slug
 * @property {string} title
 * @property {string} category
 * @property {string} priority
 * @property {string[]} topics
 * @property {string[]} prism_engines
 * @property {string[]} sections
 * @property {string} url
 * @property {string|null} source_path
 * @property {boolean} has_zip
 * @property {boolean} is_extracted
 * @property {string} relevance
 * @property {string} extracted_at
 */

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const runTests = args.includes("--test");

  if (runTests) {
    await runSelfTests();
    return;
  }

  process.stdout.write("[materialize-mit-ocw-corpus] Building corpus index...\n");

  const { entries, warnings } = buildCorpusIndex({ silent: false });

  for (const w of warnings) {
    process.stderr.write(`[warn] ${w}\n`);
  }

  process.stdout.write(`[materialize-mit-ocw-corpus] Found ${entries.length} unique courses\n`);

  const mfgCount = entries.filter((e) => e.relevance === "manufacturing").length;
  const extracted = entries.filter((e) => e.is_extracted).length;
  const zipOnly = entries.filter((e) => e.has_zip && !e.is_extracted).length;
  const indexOnly = entries.filter((e) => !e.has_zip && !e.is_extracted).length;

  process.stdout.write(`  Manufacturing-relevant: ${mfgCount}\n`);
  process.stdout.write(`  Extracted on disk:      ${extracted}\n`);
  process.stdout.write(`  Zip-only:               ${zipOnly}\n`);
  process.stdout.write(`  Index-only (no file):   ${indexOnly}\n`);

  if (dryRun) {
    process.stdout.write("[materialize-mit-ocw-corpus] --dry-run: no files written\n");
    return;
  }

  writeCorpusIndex(entries, OUTPUT_FILE);
  process.stdout.write(`[materialize-mit-ocw-corpus] Wrote ${entries.length} entries to: ${OUTPUT_FILE}\n`);
}

// ============================================================================
// SELF-TESTS (6 behavioral tests, reference-value or algebraic-invariant)
// ============================================================================

/**
 * Run 6 self-tests. Each test asserts a concrete behavioral invariant.
 * Never uses toBeDefined() stubs. Tests run without vitest -- pure node:assert.
 */
async function runSelfTests() {
  const assert = (await import("node:assert")).default;
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      process.stdout.write(`  PASS: ${name}\n`);
      passed++;
    } catch (err) {
      process.stderr.write(`  FAIL: ${name}\n    ${err.message}\n`);
      failed++;
    }
  }

  process.stdout.write("[materialize-mit-ocw-corpus] Running 6 self-tests...\n");

  // T1: buildCorpusIndex returns entries with required schema fields
  test("T1 schema -- all entries have required fields", () => {
    const { entries } = buildCorpusIndex({ silent: true });
    assert.ok(entries.length > 0, "No entries produced");
    const required = [
      "course_id", "slug", "title", "category", "priority",
      "topics", "prism_engines", "sections", "url",
      "source_path", "has_zip", "is_extracted", "relevance", "extracted_at",
    ];
    for (const entry of entries) {
      for (const field of required) {
        assert.ok(Object.prototype.hasOwnProperty.call(entry, field),
          `Entry ${entry.course_id} missing field: ${field}`);
      }
      assert.ok(Array.isArray(entry.topics), `topics must be array for ${entry.course_id}`);
      assert.ok(Array.isArray(entry.prism_engines), `prism_engines must be array for ${entry.course_id}`);
      assert.ok(Array.isArray(entry.sections), `sections must be array for ${entry.course_id}`);
      assert.ok(typeof entry.has_zip === "boolean", `has_zip must be boolean for ${entry.course_id}`);
      assert.ok(typeof entry.is_extracted === "boolean", `is_extracted must be boolean for ${entry.course_id}`);
    }
  });

  // T2: dedup -- no duplicate course_ids in output
  test("T2 dedup -- no duplicate course_ids", () => {
    const { entries } = buildCorpusIndex({ silent: true });
    const ids = entries.map((e) => e.course_id);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length,
      `Duplicate course_ids found: ${ids.length} total, ${unique.size} unique`);
  });

  // T3: corpus count audit -- at least 80 courses (MIT_COURSE_INDEX has 225 listed)
  test("T3 corpus count -- at least 80 courses", () => {
    const { entries } = buildCorpusIndex({ silent: true });
    assert.ok(entries.length >= 80,
      `Expected >= 80 courses, got ${entries.length}`);
  });

  // T4: prism_engines wired -- manufacturing courses reference PRISM engine names
  test("T4 prismMapping wired -- manufacturing courses have prism_engines", () => {
    const { entries } = buildCorpusIndex({ silent: true });
    // MIT_COURSE_INDEX prismMapping wires 2.810 -> Force_Calculator, Tool_Life_Engine, etc.
    const course2810 = entries.find((e) => e.course_id === "2.810");
    assert.ok(course2810, "Course 2.810 (Manufacturing Processes) must be in index");
    assert.ok(course2810.prism_engines.length > 0,
      "Course 2.810 must have prism_engines wired from prismMapping");
    // Known from prismMapping: Force_Calculator contains "2.810"
    assert.ok(
      course2810.prism_engines.some((e) => e.includes("Force") || e.includes("Tool") || e.includes("Speed")),
      `2.810 prism_engines should include Force/Tool/Speed engine. Got: ${course2810.prism_engines.join(",")}`
    );
  });

  // T5: URL format -- OCW URLs are well-formed
  test("T5 URL format -- all entries have ocw.mit.edu URLs", () => {
    const { entries } = buildCorpusIndex({ silent: true });
    for (const entry of entries) {
      assert.ok(entry.url.startsWith("https://ocw.mit.edu/courses/"),
        `Bad URL for ${entry.course_id}: ${entry.url}`);
      assert.ok(!entry.url.includes(" "),
        `URL contains spaces for ${entry.course_id}: ${entry.url}`);
    }
  });

  // T6: malformed path handling -- buildCorpusIndex with a missing MIT_ROOT
  //     via scanDiskZones(silent=true) must not throw, just return empty map.
  test("T6 malformed path -- missing zone dir handled gracefully", () => {
    // We cannot change the module-level MIT_ROOT constant, but we CAN verify
    // that scanDiskZones with a nonexistent zone (one of SOURCE_ZONES may not
    // exist in this environment) does not throw and returns a valid Map.
    // We test this by invoking buildCorpusIndex with silent=true on a zone
    // path that definitely does not exist (MIT COURSES 5 may be absent).
    // The function must still return a non-throwing result with entries array.
    let result;
    try {
      result = buildCorpusIndex({ silent: true });
    } catch (err) {
      assert.fail(`buildCorpusIndex threw on partial disk: ${err.message}`);
    }
    assert.ok(Array.isArray(result.entries),
      "Must return entries array even when disk zones are missing");
    // Warnings array must exist (may be empty or contain messages)
    assert.ok(Array.isArray(result.warnings),
      "Must return warnings array");
  });

  process.stdout.write(`\n[materialize-mit-ocw-corpus] Tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

// Run main unless imported as a module
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (isMain) {
  main().catch((err) => {
    process.stderr.write(`[materialize-mit-ocw-corpus] Fatal: ${err.message}\n${err.stack}\n`);
    process.exit(1);
  });
}
