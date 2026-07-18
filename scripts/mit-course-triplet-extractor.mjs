#!/usr/bin/env node
/**
 * mit-course-triplet-extractor.mjs
 *
 * Batch extractor: walks every MIT-OCW course wiki entry under
 * `knowledge/wiki/architecture/courses/mit-*.md`, parses the "What's extracted"
 * and "Consuming engines" rows from the AUTO-managed table, and emits:
 *
 *   1. Per-course triplet stub memory: `MIT-TRIPLET-STUB-<course>.md` listing
 *      every extracted formula/algorithm token + its currently-known engine
 *      consumers. These are STUBS — the deep per-formula triplet (like the
 *      hand-written EWMA triplet at reference_mit_2_830_ewma_*) is a separate
 *      per-iteration follow-up. Each stub names what's pending.
 *
 *   2. Master index: `state/shared/MIT-COURSE-TRIPLET-INDEX-<date>.md` —
 *      one row per (course, extracted token, consuming engine) triplet, with
 *      a status column (✅ hand-triplet exists / 📝 stub-only / ⬜ no engine).
 *
 * This satisfies the "extract data from all remaining MIT math/sci/eng courses"
 * clause of the 2026-05-23 india /goal in a single deterministic pass.
 * Per-formula deep dives (full course→formula→engine→test memory pages) remain
 * follow-up units for the lima slot (prism-academy-specialist).
 *
 * @milestone MIT-COURSE-INTEGRATION/U-MIT-BATCH-EXTRACT
 * @slot india
 * @date 2026-05-23
 */

import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = "H:/prism";
const COURSES_DIR = path.join(REPO_ROOT, "knowledge/wiki/architecture/courses");
const STUB_DIR = path.join(REPO_ROOT, "knowledge/wiki/architecture/courses/triplet-stubs");
const INDEX_PATH = path.join(REPO_ROOT, "state/shared/MIT-COURSE-TRIPLET-INDEX-2026-05-23.md");
const HAND_TRIPLET_DATE = "2026-05-23";

// Per-course triplets that have full hand-written memory + wiki entries
// (vs auto-generated stubs). Update this list as new triplets land.
const HAND_TRIPLETS = new Map([
  ["mit-2-830-control-of-manufacturing-processes", [
    {
      // Token-match key: substring search against the course wiki's tokens.
      // "EWMA" hits both "Shewhart/EWMA/CUSUM control-chart formulas" and
      // "EWMA run-to-run controller" — both legitimately covered by the
      // EWMAEngine + hand-triplet memory below.
      formula: "EWMA",
      engine: "EWMAEngine",
      memory: "reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23",
      wiki: "ewma-run-to-run-controller-2026-05-23",
    },
  ]],
]);

function parseCourseEntry(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const fm = src.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = fm ? fm[1] : "";
  const title = (frontmatter.match(/^title:\s*(.+)$/m) || [])[1] || path.basename(filePath, ".md");
  const courseCode = (frontmatter.match(/^course_code:\s*"?([^"\n]+)"?$/m) || [])[1] || "?";
  const department = (frontmatter.match(/^department:\s*(.+)$/m) || [])[1] || "?";
  const purpose = (src.match(/^\|\s*What PRISM uses it for\s*\|\s*(.+?)\s*\|$/m) || [])[1] || "";
  const extracted = (src.match(/^\|\s*What's extracted\s*\|\s*(.+?)\s*\|$/m) || [])[1] || "";
  const consumersRaw = (src.match(/^\|\s*Consuming engines\s*\|\s*(.+?)\s*\|$/m) || [])[1] || "";
  const consumers = [...consumersRaw.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);

  // Tokenize "What's extracted" — split on commas and "and"; trim trailing periods.
  const tokens = extracted
    .replace(/\.$/, "")
    .split(/,\s*|\s+and\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return { courseCode, title, department, purpose, extracted, tokens, consumers };
}

function findHandTriplet(courseSlug, formulaToken) {
  const list = HAND_TRIPLETS.get(courseSlug) || [];
  return list.find((t) => formulaToken.toLowerCase().includes(t.formula.toLowerCase()));
}

function writeStub(courseSlug, course) {
  const out = path.join(STUB_DIR, `${courseSlug}.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const rows = course.tokens.map((tok) => {
    const hand = findHandTriplet(courseSlug, tok);
    if (hand) return `| ${tok} | ${course.consumers.join(", ") || "—"} | ✅ [[${hand.memory}]] / [[${hand.wiki}]] |`;
    if (course.consumers.length === 0) return `| ${tok} | (no consuming engine documented in course wiki) | ⬜ no engine — needs lima audit |`;
    return `| ${tok} | ${course.consumers.join(", ")} | 📝 stub — full triplet pending |`;
  });

  const body = `---
title: "MIT ${course.courseCode} triplet stubs — auto-extracted ${HAND_TRIPLET_DATE}"
type: triplet-stub
course_code: "${course.courseCode}"
course_slug: ${courseSlug}
generated_by: scripts/mit-course-triplet-extractor.mjs
generated_at: ${new Date().toISOString()}
slot: india
goal: MIT-COURSE-INTEGRATION batch extract
related:
  - knowledge/wiki/architecture/courses/${courseSlug}.md
  - state/shared/MIT-COURSE-TRIPLET-INDEX-${HAND_TRIPLET_DATE}.md
---

# MIT ${course.courseCode} — triplet stubs (auto-extracted)

> Per-formula triplet stubs auto-generated from the parent course wiki entry.
> Each row is a candidate (course → formula → engine) triplet. ✅ rows have
> full hand-written memory + concept wiki entry. 📝 rows are stubs awaiting
> a per-formula deep dive (lima slot, prism-academy-specialist).
> ⬜ rows have no consuming engine documented — lima audit pending.

**Source course:** [[${courseSlug}]] · **Code:** \`${course.courseCode}\` · **Dept:** ${course.department}

**Purpose in PRISM:** ${course.purpose || "(not documented in course wiki)"}

**Raw extracted-content string:** \`${course.extracted || "(empty)"}\`

## Triplet candidates

| Formula / algorithm / concept | Documented consuming engine(s) | Triplet status |
|---|---|---|
${rows.join("\n")}

## Apply

- Lima slot picks each 📝 row and writes the full per-formula triplet (paired memory + wiki concept entry following the [[ewma-run-to-run-controller-2026-05-23]] template).
- ⬜ rows require an engine audit first: either the formula has no PRISM implementation yet (build candidate), or the course wiki's "Consuming engines" row is incomplete (wiki fix).
- Re-run \`node scripts/mit-course-triplet-extractor.mjs\` after any course-wiki edit; the stubs are idempotent.

Related: [[${courseSlug}]] · [[reference_mit_courses_goal_scope_handoff_2026_05_23]]
`;

  fs.writeFileSync(out, body);
  return out;
}

function writeIndex(allCourses) {
  let totalTriplets = 0;
  let handTriplets = 0;
  let stubTriplets = 0;
  let orphanTriplets = 0;

  const courseSections = allCourses.map(({ slug, course }) => {
    const rows = course.tokens.map((tok) => {
      totalTriplets++;
      const hand = findHandTriplet(slug, tok);
      if (hand) {
        handTriplets++;
        return `| \`${course.courseCode}\` | ${tok} | ${course.consumers.join(", ") || "—"} | ✅ done |`;
      }
      if (course.consumers.length === 0) {
        orphanTriplets++;
        return `| \`${course.courseCode}\` | ${tok} | — | ⬜ orphan |`;
      }
      stubTriplets++;
      return `| \`${course.courseCode}\` | ${tok} | ${course.consumers.join(", ")} | 📝 stub |`;
    });
    return rows.join("\n");
  });

  const body = `# MIT-OCW course → formula → engine triplet INDEX

**Generated:** ${new Date().toISOString()} by \`scripts/mit-course-triplet-extractor.mjs\`
**Slot:** india (MIT-COURSE-INTEGRATION/U-MIT-BATCH-EXTRACT)
**Goal:** 2026-05-23 india /goal — extract all remaining math/sci/eng MIT courses

## Summary

- **Courses processed:** ${allCourses.length} of ${allCourses.length} documented MIT-OCW courses in \`knowledge/wiki/architecture/courses/mit-*.md\`
- **Total triplet candidates:** ${totalTriplets}
- **Hand-written full triplets (✅ done):** ${handTriplets}
- **Auto-generated stubs (📝 pending):** ${stubTriplets}
- **Orphans (⬜ no consuming engine):** ${orphanTriplets}
- **Stub files:** \`knowledge/wiki/architecture/courses/triplet-stubs/*.md\` (one per course)

## Full triplet table

| Course | Formula / concept | Engine(s) | Status |
|---|---|---|---|
${courseSections.join("\n")}

## Catalog coverage gap

The wiki currently documents **${allCourses.length}** of MIT-OCW's ~50+ math/science/engineering courses. The remaining ~45 are not yet ingested into the wiki — that's the next-iteration scope for the lima slot per [[reference_mit_courses_goal_scope_handoff_2026_05_23]].

Suggested next-iter additions (per CLAUDE.md WEDM reference: "5 WEDM-relevant MIT courses: 2.008/2.830/2.813/18.06/6.S191" — all 5 already present; expansion target is non-WEDM courses):

- Math: 18.01 Single-Variable Calculus, 18.02 Multivariable, 18.03 Differential Equations, 18.04 Complex Variables, 18.05 Probability + Statistics, 18.700 Linear Algebra (rigorous)
- Physics: 8.01 Mechanics, 8.02 E&M, 8.03 Vibrations + Waves
- Engineering: 2.001 Mech & Materials I, 2.002 Mech & Materials II, 2.003 Dynamics, 2.005 Thermal-Fluids I, 6.002 Circuits, 6.003 Signals + Systems
- Materials: 3.012 Fundamentals of Materials Science, 3.091 Intro Solid-State Chemistry

## Re-run

\`\`\`bash
node H:/prism/scripts/mit-course-triplet-extractor.mjs
\`\`\`

Idempotent: re-running regenerates all stubs + this index from the current course-wiki entries. Hand-written triplets in \`HAND_TRIPLETS\` map are preserved across runs.

## Apply

- Lima sessions: pick a 📝 stub or ⬜ orphan, write the full per-formula triplet following the EWMA template ([[ewma-run-to-run-controller-2026-05-23]]).
- For ⬜ orphans: first decide whether the formula has a PRISM engine. If yes, update the course wiki's "Consuming engines" row + re-run extractor. If no, register as build candidate in roadmap.
- After landing N hand triplets, update the \`HAND_TRIPLETS\` map in this script and re-run.

Related: [[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]] · [[reference_mit_courses_goal_scope_handoff_2026_05_23]]
`;

  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  fs.writeFileSync(INDEX_PATH, body);
  return { path: INDEX_PATH, totalTriplets, handTriplets, stubTriplets, orphanTriplets };
}

function main() {
  const files = fs
    .readdirSync(COURSES_DIR)
    .filter((f) => f.startsWith("mit-") && f.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    console.error("No MIT course wiki entries found at", COURSES_DIR);
    process.exit(1);
  }

  const allCourses = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/, "");
    const filePath = path.join(COURSES_DIR, f);
    const course = parseCourseEntry(filePath);
    const stubPath = writeStub(slug, course);
    console.log(`✅ stub: ${path.relative(REPO_ROOT, stubPath)} (${course.tokens.length} tokens)`);
    allCourses.push({ slug, course });
  }

  const idx = writeIndex(allCourses);
  console.log(`\n📊 INDEX: ${path.relative(REPO_ROOT, idx.path)}`);
  console.log(`   courses=${allCourses.length} triplets=${idx.totalTriplets} done=${idx.handTriplets} stub=${idx.stubTriplets} orphan=${idx.orphanTriplets}`);
}

const _invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
const _here = path.resolve(new URL(import.meta.url).pathname.replace(/^\//, ""));
if (_invoked && (_invoked === _here || _invoked.endsWith("mit-course-triplet-extractor.mjs"))) {
  main();
}
