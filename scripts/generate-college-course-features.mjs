#!/usr/bin/env node
/**
 * generate-college-course-features.mjs — system-viz augmentation: college-course roost.
 *
 * Spec: U-MIT-COLLEGE-AUTOGEN-SPECS (slot:india, 2026-05-24).
 *
 * Reads `state/shared/college-course-specs/AUTOGEN-SPEC-*.md` (produced by
 * scripts/auto-college-course-spec-emit.mjs) and emits a system-viz augmentation
 * that adds:
 *   - one parent roost node `ghost.college_courses` (kind ghost-roost), under
 *     `ghost.planned_features` so it sits beside misc-tasks and bridge-synergy.
 *   - one `college-course` child node per AUTOGEN-SPEC, parented to the roost.
 *
 * Per-course node carries: kind (mit-ocw|basic-training|knowledge-pack|...),
 * domain (academic|shop-floor|physics|reference|...), source path, slug.
 *
 * Output: `state/shared/system-viz/college-course-augmentation.json`. Folded into
 * system-graph.json by scripts/merge-augmentations.mjs. Register in
 * scripts/regen-viz.mjs FAST[] for auto-regen on each viz rebuild.
 *
 * Idempotency: re-running produces a deterministic augmentation
 * (alphabetical-by-slug). merge-augmentations.mjs skips existing ids.
 *
 * Usage:  node scripts/generate-college-course-features.mjs
 * Exit:   0 ok · 1 specs dir missing · 2 runtime error
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const COLLEGE_ROOST_ID = "ghost.college_courses";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const COURSE_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 200;

const SPECS_DIR = path.join(ROOT, "state/shared/college-course-specs");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "college-course-augmentation.json");

const SPEC_NAME_RE = /^AUTOGEN-SPEC-(.+)\.md$/;
const FIELD_RE = (label) => new RegExp("^\\|\\s*" + label + "\\s*\\|\\s*`?([^`|\\n]+?)`?\\s*\\|$", "m");

/** Extract {courseId,kind,domain,source,slug} from one AUTOGEN-SPEC.md body. */
export function parseSpec(slug, body) {
  const courseId = (body.match(FIELD_RE("Course id")) || [])[1] || slug;
  const kind = (body.match(FIELD_RE("Kind")) || [])[1] || "unknown";
  const domain = (body.match(FIELD_RE("Domain")) || [])[1] || "unknown";
  const source = (body.match(FIELD_RE("Source path")) || [])[1] || "";
  return { slug, courseId: courseId.trim(), kind: kind.trim(), domain: domain.trim(), source: source.trim() };
}

/** Pure: build {newNodes,newEdges,stats} from spec entries + optional existing-ids. */
export function generate(entries, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  let roostEmitted = 0;

  if (!ids.has(COLLEGE_ROOST_ID)) {
    newNodes.push({
      id: COLLEGE_ROOST_ID,
      label: "College Courses (AUTOGEN specs — lima execution queue)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${entries.length} courses cataloged — engines/algorithms/formulas/skills/hooks/nodes per spec. Lima executes via /college-extract. See state/shared/COLLEGE-COURSE-AUTOGEN-INDEX-2026-05-24.md.`,
    });
    ids.add(COLLEGE_ROOST_ID);
    roostEmitted = 1;
  }

  let childrenEmitted = 0, childrenSkipped = 0;
  for (const e of entries) {
    const id = "college.course." + e.slug;
    if (ids.has(id)) { childrenSkipped++; continue; }
    const label = (`${e.courseId} (${e.kind})`).slice(0, MAX_LABEL);
    const info = `[${e.kind} · ${e.domain}] source=${e.source}`.slice(0, MAX_INFO);
    newNodes.push({
      id,
      label,
      layer: COURSE_LAYER,
      ghost: true,
      status: "ghost",
      kind: "college-course",
      parent: COLLEGE_ROOST_ID,
      info,
    });
    ids.add(id);
    childrenEmitted++;
  }

  return { newNodes, newEdges: [], stats: { roostEmitted, total: entries.length, childrenEmitted, childrenSkipped } };
}

/** Read all AUTOGEN-SPEC-*.md from specs dir → parsed entries (sorted by slug). */
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
    console.error("FATAL: " + SPECS_DIR + " missing — run scripts/auto-college-course-spec-emit.mjs first");
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
      source: "state/shared/college-course-specs/AUTOGEN-SPEC-*.md",
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error("FATAL: generate failed — " + e.message); return 2; }

  fs.mkdirSync(VIZ_DIR, { recursive: true });
  try { fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error("FATAL: write failed — " + e.message); return 2; }

  console.log("wrote " + OUT_PATH);
  console.log("  roost emitted: " + result.stats.roostEmitted);
  console.log("  courses:       " + result.stats.total);
  console.log("  children:      " + result.stats.childrenEmitted);
  console.log("  skipped:       " + result.stats.childrenSkipped);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
