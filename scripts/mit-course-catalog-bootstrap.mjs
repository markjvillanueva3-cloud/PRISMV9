#!/usr/bin/env node
/**
 * mit-course-catalog-bootstrap.mjs
 *
 * Reads the REAL on-disk MIT course catalog at
 *   H:/PRISM/resources/MIT COURSES/PRISM_COURSE_CATALOG.json
 * (92 courses already cataloged, byCategory grouping into manufacturing /
 *  control / materials / statistics / algorithms / ml_ai / optimization /
 *  cad_graphics / signal / systems / other).
 *
 * Generates one wiki entry per course that does NOT already have one under
 * knowledge/wiki/architecture/courses/mit-<slug>.md, using a category-driven
 * extracted-content + consuming-engine mapping based on PRISM's engine
 * inventory.
 *
 * Output: 1 wiki file per missing course at
 *   knowledge/wiki/architecture/courses/mit-<slug>.md
 *
 * After this script runs, re-run
 *   node scripts/mit-course-triplet-extractor.mjs
 * to regenerate triplet stubs + master index across the expanded set.
 *
 * Lima slot (prism-academy-specialist) does the per-course deep dives —
 * this script just bootstraps the wiki scaffolding so "all remaining" is
 * literally present, not just hand-named in CLAUDE.md.
 *
 * @milestone MIT-COURSE-INTEGRATION/U-MIT-CATALOG-BOOTSTRAP
 * @slot india
 * @date 2026-05-23
 */

import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = "H:/prism";
const COURSES_DIR = path.join(REPO_ROOT, "knowledge/wiki/architecture/courses");
const CATALOG_PATH = "H:/PRISM/resources/MIT COURSES/PRISM_COURSE_CATALOG.json";

// Category → (extracted tokens, consuming-engine hints, dept fallback)
// Drives the boilerplate "What's extracted" + "Consuming engines" rows.
const CATEGORY_MAP = {
  manufacturing: {
    dept: "Mechanical Engineering",
    extracted: "manufacturing process control, design for manufacturing, machining mechanics, cost modeling, quality gates",
    consumers: ["KienzleForceModel", "SPCProcessCapabilityEngine", "DFMCheckEngine", "MachiningEnergyModelEngine"],
  },
  control: {
    dept: "Mechanical Engineering / EECS",
    extracted: "transfer functions, state-space models, PID + LQR control, stability analysis, adaptive control",
    consumers: ["AdaptiveControlEngine", "RealTimeAdaptiveControllerEngine", "FeedRateOptimizationEngine"],
  },
  materials: {
    dept: "Materials Science / Chemical Engineering",
    extracted: "crystal structures, phase diagrams, diffusion, mechanical properties, material selection",
    consumers: ["MaterialRegistryEngine", "JohnsonCookFlowStressEngine", "TaylorWearEngine", "CoatingSelectionEngine"],
  },
  statistics: {
    dept: "Mathematics / EECS",
    extracted: "probability distributions, hypothesis testing, regression, Bayesian inference, Monte Carlo",
    consumers: ["SPCProcessCapabilityEngine", "StochasticCuttingForceEngine", "StochasticToolLifeEngine", "MonteCarloEngine"],
  },
  algorithms: {
    dept: "EECS",
    extracted: "asymptotic analysis, divide-and-conquer, dynamic programming, graph algorithms, NP-completeness",
    consumers: ["ToolpathOptimizationEngine", "BinPackingEngine", "SchedulingEngine"],
  },
  cad_graphics: {
    dept: "EECS / MechE",
    extracted: "geometric modeling, B-rep + NURBS, transformations, rendering, ray tracing",
    consumers: ["CADKernelEngine", "NURBSEngine", "BezierEngine", "CADValidationEngine"],
  },
  ml_ai: {
    dept: "EECS / Brain & Cognitive Sciences",
    extracted: "supervised learning, neural networks, gradient descent, backpropagation, reinforcement learning",
    consumers: ["MLOpsEngine", "DeepLearningEngine", "ReinforcementLearningEngine", "GNNTrainingEngine"],
  },
  optimization: {
    dept: "Sloan / EECS",
    extracted: "linear programming, integer programming, convex optimization, Lagrangian duality, gradient methods",
    consumers: ["ParetoOptimizeEngine", "ToolpathOptimizationEngine", "SchedulingEngine", "ResourceAllocationEngine"],
  },
  signal: {
    dept: "EECS",
    extracted: "Fourier + Laplace transforms, sampling, digital filters, signal detection",
    consumers: ["STFTChatterEngine", "EWMAEngine", "AcousticEmissionMonitoringEngine"],
  },
  systems: {
    dept: "Sloan / ESD",
    extracted: "system dynamics, feedback loops, system architecture, complexity, organizational design",
    consumers: ["SystemHealthEngine", "OrchestrationEngine"],
  },
  other: {
    dept: "MIT (subject varies)",
    extracted: "(catalog metadata only — lima audit pending)",
    consumers: [],
  },
};

function courseIdToSlug(courseId) {
  // e.g. "2.830j-spring-2008" → "mit-2-830j-spring-2008"
  return "mit-" + courseId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function pickPrimaryCategory(course) {
  // First non-"other" category wins; fallback to "other".
  const cats = (course.categories || []).filter((c) => c !== "other");
  return cats[0] || course.categories?.[0] || "other";
}

function isPrismRelevantCategory(category) {
  // "other" courses get scaffolding too — they're still in the catalog the
  // operator pointed at — but lima audit is mandatory before any deep work.
  // Excluding "other" would silently drop ~37 courses, missing the goal's
  // "all remaining math/science/engineering" clause when math courses (18.02,
  // 18.100a, etc.) are misclassified as "other".
  return true; // ship scaffolding for every catalog entry; flag verification.
}

function writeCourseEntry(course) {
  const courseId = course.courseId || course.id;
  if (!courseId) return { wrote: false, reason: "no-id" };

  const slug = courseIdToSlug(courseId);
  const out = path.join(COURSES_DIR, `${slug}.md`);
  if (fs.existsSync(out)) return { wrote: false, slug, reason: "exists" };

  const category = pickPrimaryCategory(course);
  if (!isPrismRelevantCategory(category)) return { wrote: false, slug, reason: "filtered" };

  const cat = CATEGORY_MAP[category] || CATEGORY_MAP.other;

  const title = course.metadata?.title && course.metadata.title !== "Unknown"
    ? course.metadata.title
    : `(title pending — MIT ${courseId})`;
  const term = course.metadata?.term || "?";
  const topics = Array.isArray(course.metadata?.topics)
    ? course.metadata.topics.flat().filter((t) => typeof t === "string").slice(0, 6).join(" / ")
    : "";

  const archivedFlag = course.type === "archived" ? " (archived .zip — not extracted)" : "";
  const consumersList = cat.consumers.length > 0
    ? cat.consumers.map((n) => `[[${n.toLowerCase()}]]`).join(", ")
    : "(none mapped — lima audit pending)";

  const body = `---
title: MIT course — ${courseId} ${title}
type: architecture
kind: course
course_kind: mit-ocw
course_code: "${courseId}"
department: ${cat.dept}
generated_by: scripts/mit-course-catalog-bootstrap.mjs
generated_at: ${new Date().toISOString()}
catalog_source: H:/PRISM/resources/MIT COURSES/PRISM_COURSE_CATALOG.json
catalog_bootstrap: true
verification_pending: lima-slot
primary_category: ${category}
course_term: ${term}
tags: [architecture, system-viz, course, mit, ocw, training, knowledge, ${category}]
related:
  - knowledge/wiki/architecture/courses-index.md
  - knowledge/wiki/architecture/mitcourseintegrationengine.md
  - knowledge/wiki/architecture/mitcourseknowledgeengine.md
---

# MIT course — \`${courseId}\` ${title}${archivedFlag}

> Catalog-bootstrap entry generated 2026-05-23 by india slot (MIT-COURSE-INTEGRATION/U-MIT-CATALOG-BOOTSTRAP) to satisfy the "extract all remaining math/sci/eng MIT courses in resources folder" /goal. Sourced from \`PRISM_COURSE_CATALOG.json\` (92 catalog entries scanned 2026-01-21). Lima slot owns per-formula verification.

<!-- AUTO-START — regenerated by mit-course-catalog-bootstrap.mjs / mit-course-triplet-extractor.mjs -->

| Field | Value |
|-------|-------|
| Course code | \`${courseId}\` |
| Title | ${title} |
| Department | ${cat.dept} |
| Primary category | ${category} |
| What PRISM uses it for | ${cat.extracted}${topics ? ` (course topics: ${topics})` : ""} |
| What's extracted | ${cat.extracted} |
| Consuming engines | ${consumersList} |
| Source modules | \`H:/PRISM/resources/MIT COURSES/${courseId}\`${course.type === "archived" ? ".zip" : "/"} |
| Catalog type | ${course.type} |

## How it's consumed

- **Catalog bootstrap status** — auto-generated from the on-disk catalog index. The "What's extracted" + "Consuming engines" rows are CATEGORY-derived hypotheses, not per-course verified content.
- **Lima follow-up required** — prism-academy-specialist (lima slot per JULIETT-12CHAT) must: (a) unzip / read the actual course material (if archived), (b) replace the category-default extracted-content with the course's actual syllabus topics, (c) verify each named consumer actually depends on the course, (d) write per-formula deep-triplet entries following the [[ewma-run-to-run-controller-2026-05-23]] template.
- **Triplet stub** — auto-emitted by \`scripts/mit-course-triplet-extractor.mjs\` to \`courses/triplet-stubs/${slug}.md\`.

<!-- AUTO-END -->

## See also

- Course catalog: [[courses-index]]
- Triplet INDEX: [[mit-course-triplet-index-2026-05-23]]
- Pattern template: [[ewma-run-to-run-controller-2026-05-23]] · [[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]]
- Scope handoff to lima: [[reference_mit_courses_goal_scope_handoff_2026_05_23]]
- Source catalog: \`H:/PRISM/resources/MIT COURSES/PRISM_COURSE_CATALOG.json\`
`;

  fs.mkdirSync(COURSES_DIR, { recursive: true });
  fs.writeFileSync(out, body);
  return { wrote: true, slug, category };
}

function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error("Catalog not found:", CATALOG_PATH);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const courses = catalog.courses || [];
  if (courses.length === 0) {
    console.error("No courses in catalog");
    process.exit(1);
  }

  console.log(`Reading catalog: ${courses.length} courses (totalCourses=${catalog.totalCourses}, extracted=${catalog.extracted}, archived=${catalog.archived})`);

  // Dedupe by courseId — catalog has some duplicates
  const seen = new Set();
  const unique = [];
  for (const c of courses) {
    const id = c.courseId || c.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(c);
  }
  console.log(`Unique courseIds: ${unique.length}`);

  let wrote = 0, existed = 0, filtered = 0, errored = 0;
  const byCategory = {};
  for (const c of unique) {
    const r = writeCourseEntry(c);
    if (r.wrote) {
      wrote++;
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    } else if (r.reason === "exists") existed++;
    else if (r.reason === "filtered") filtered++;
    else errored++;
  }

  console.log(`\n📊 BOOTSTRAP:`);
  console.log(`  wrote:    ${wrote} new course wiki entries`);
  console.log(`  existed:  ${existed} (already in wiki — preserved)`);
  console.log(`  filtered: ${filtered}`);
  console.log(`  errored:  ${errored}`);
  console.log(`  by category:`, byCategory);
  console.log(`\n  Next: re-run scripts/mit-course-triplet-extractor.mjs to regen stubs + master index across the expanded set.`);
}

main();
