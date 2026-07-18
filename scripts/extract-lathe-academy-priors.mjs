#!/usr/bin/env node
/**
 * extract-lathe-academy-priors.mjs
 *
 * CLI wrapper around scripts/lib/lathe-academy-priors.mjs.
 * Reads PRISM Academy lathe-applicable course source files and emits a
 * versioned prior bundle that LatheAITrainingEngine + LatheActiveLearningEngine
 * can consume as expert-authored validation baselines.
 *
 *   node scripts/extract-lathe-academy-priors.mjs               # default output
 *   node scripts/extract-lathe-academy-priors.mjs --out path.json
 *   node scripts/extract-lathe-academy-priors.mjs --print
 *
 * @milestone WHISKEY-ACADEMY-LATHE-BRIDGE-MS0
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPriorBundle } from "./lib/lathe-academy-priors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

// Lathe-applicable courses. course-4 (milling) and course-13..16 (wire-EDM /
// sinker / electrode / robot) are intentionally excluded — they are out-of-domain
// for the lathe wizard's prior set.
const LATHE_COURSES = [
  "course-2-speed-feed-mastery",
  "course-3-gcode-programming",
  "course-5-turning-operations",
  "course-17-tooling-codes",
  "course-22-alarm-troubleshooting-deep",
  "course-29-toolpath-reasoning-dual-level",
  "course-30-toolpath-catalog-programming-paradigms",
  "course-31-cadcam-operations-atlas",
  "course-32-machining-math-science-deep-dive",
  "course-33-material-machining-atlas",
  "course-34-per-machine-type-operations",
];

function parseArgs(argv) {
  const args = { out: null, print: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i];
    else if (a === "--print") args.print = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: extract-lathe-academy-priors.mjs [--out path.json] [--print]");
      process.exit(0);
    }
  }
  return args;
}

function loadCourse(courseFileBase) {
  const p = resolve(repoRoot, "mcp-server/src/data/academy", courseFileBase + ".ts");
  // Derive courseId (e.g. course-5-turning-operations -> course-5; course-0a-shop-math -> course-0a)
  const idMatch = courseFileBase.match(/^(course-[0-9a-z]+)(?:-|$)/);
  const courseId = idMatch ? idMatch[1] : courseFileBase;
  if (!existsSync(p)) return { courseId, sourceText: null, path: p, base: courseFileBase };
  return { courseId, sourceText: readFileSync(p, "utf8"), path: p, base: courseFileBase };
}

function main() {
  const args = parseArgs(process.argv);

  const loaded = LATHE_COURSES.map(loadCourse);
  const present = loaded.filter(c => c.sourceText !== null);
  const missing = loaded.filter(c => c.sourceText === null);

  if (missing.length > 0) {
    process.stderr.write("# missing courses (skipped): " + missing.map(m => m.base).join(", ") + "\n");
  }

  const bundle = buildPriorBundle(
    present.map(c => ({ courseId: c.courseId, sourceText: c.sourceText }))
  );

  // Augment bundle with extractor provenance for audit trail
  bundle.extractor = "scripts/extract-lathe-academy-priors.mjs";
  bundle.scanned_files = present.map(c => c.path.replace(repoRoot + "\\", "").replace(/\\/g, "/"));
  bundle.skipped_courses = missing.map(m => m.courseId);

  if (args.print) {
    process.stdout.write(JSON.stringify(bundle, null, 2) + "\n");
    return;
  }

  const outPath = args.out
    ? resolve(args.out)
    : resolve(repoRoot, "mcp-server/data/lathe-academy-priors.json");

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

  process.stderr.write("# wrote " + bundle.priors.length + " priors across " + bundle.source_courses.length + " courses -> " + outPath + "\n");
}

main();
