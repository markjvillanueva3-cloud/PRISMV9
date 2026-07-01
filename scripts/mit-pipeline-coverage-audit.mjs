#!/usr/bin/env node
/**
 * mit-pipeline-coverage-audit.mjs
 *
 * Per-course coverage matrix: for every MIT course wiki entry, audit which
 * downstream consumers actually carry the course's data. Surfaces the gap
 * between "wiki entry exists" (scaffolded) and "fully wired into PSN"
 * (every consumer has a path to the course's extracted data).
 *
 * Consumers audited (PSN legs):
 *   - wiki_entry        — knowledge/wiki/architecture/courses/<slug>.md
 *   - triplet_stub      — knowledge/wiki/architecture/courses/triplet-stubs/<slug>.md
 *   - course_node       — knowledge/memories/reference/node_course_<slug>.md
 *   - formula_nodes     — knowledge/memories/reference/node_formula_mit_<code>_*.md
 *   - textbook_node     — knowledge/memories/reference/node_textbook_mit_<code>_*.md (live-extract)
 *   - instructor_nodes  — knowledge/memories/reference/node_instructor_*.md (live-extract)
 *   - hand_triplet      — knowledge/wiki/concepts/<formula>-*-2026-*.md cross-ref present
 *   - live_extracted    — wiki entry contains "## Live extraction" section
 *
 * Output: `state/shared/MIT-PIPELINE-COVERAGE-2026-05-23.md` — per-course
 * row with one ✅/❌ per consumer + summary stats + gap punch-list for lima.
 *
 * Idempotent.
 *
 * @milestone MIT-COURSE-INTEGRATION/U-MIT-PIPELINE-COVERAGE
 * @slot india
 * @date 2026-05-23
 */

import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = "H:/prism";
const COURSES_DIR = path.join(REPO_ROOT, "knowledge/wiki/architecture/courses");
const STUBS_DIR = path.join(REPO_ROOT, "knowledge/wiki/architecture/courses/triplet-stubs");
const NODES_DIR = path.join(REPO_ROOT, "knowledge/memories/reference");
const CONCEPTS_DIR = path.join(REPO_ROOT, "knowledge/wiki/concepts");
const REPORT_PATH = path.join(REPO_ROOT, "state/shared/MIT-PIPELINE-COVERAGE-2026-05-23.md");

function exists(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function safeName(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }

function nodeFilesMatching(prefix) {
  if (!fs.existsSync(NODES_DIR)) return [];
  return fs.readdirSync(NODES_DIR).filter((f) => f.startsWith(prefix));
}

function auditCourse(slug) {
  const wikiPath = path.join(COURSES_DIR, `${slug}.md`);
  const src = exists(wikiPath) ? fs.readFileSync(wikiPath, "utf8") : "";
  const courseCode = (src.match(/^course_code:\s*"?([^"\n]+)"?$/m) || [])[1] || "?";
  const codeSafe = safeName(courseCode);

  const wiki = exists(wikiPath);
  const stub = exists(path.join(STUBS_DIR, `${slug}.md`));
  const courseNode = exists(path.join(NODES_DIR, `node_course_${safeName(slug)}.md`));
  const formulaNodes = nodeFilesMatching(`node_formula_mit_${codeSafe}_`).length;
  const textbookNode = nodeFilesMatching(`node_textbook_mit_${codeSafe}_`).length > 0;
  const instructorNodes = nodeFilesMatching(`node_instructor_`).filter((f) => {
    const txt = fs.readFileSync(path.join(NODES_DIR, f), "utf8");
    return txt.includes(`MIT ${courseCode}`);
  }).length;
  const liveExtracted = /##\s+Live extraction/.test(src);
  const handTriplet = liveExtracted && /\[\[ewma-run-to-run-controller-/.test(src); // generalize later

  return {
    slug,
    courseCode,
    wiki,
    stub,
    courseNode,
    formulaNodes,
    textbookNode,
    instructorNodes,
    liveExtracted,
    handTriplet,
  };
}

function row(c) {
  const mark = (b) => b ? "✅" : "❌";
  return `| \`${c.courseCode}\` | ${mark(c.wiki)} | ${mark(c.stub)} | ${mark(c.courseNode)} | ${c.formulaNodes} | ${mark(c.textbookNode)} | ${c.instructorNodes} | ${mark(c.liveExtracted)} | ${mark(c.handTriplet)} |`;
}

function main() {
  if (!fs.existsSync(COURSES_DIR)) {
    console.error("COURSES_DIR missing:", COURSES_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(COURSES_DIR).filter((f) => f.startsWith("mit-") && f.endsWith(".md")).sort();
  const rows = files.map((f) => auditCourse(f.replace(/\.md$/, "")));

  // Tally
  const tally = {
    courses: rows.length,
    wiki: rows.filter((r) => r.wiki).length,
    stub: rows.filter((r) => r.stub).length,
    courseNode: rows.filter((r) => r.courseNode).length,
    anyFormulaNodes: rows.filter((r) => r.formulaNodes > 0).length,
    totalFormulaNodes: rows.reduce((s, r) => s + r.formulaNodes, 0),
    textbookNode: rows.filter((r) => r.textbookNode).length,
    anyInstructorNode: rows.filter((r) => r.instructorNodes > 0).length,
    totalInstructorNodes: rows.reduce((s, r) => s + r.instructorNodes, 0),
    liveExtracted: rows.filter((r) => r.liveExtracted).length,
    handTriplet: rows.filter((r) => r.handTriplet).length,
  };

  const fullyWired = rows.filter((r) =>
    r.wiki && r.stub && r.courseNode && r.formulaNodes > 0 && r.textbookNode && r.instructorNodes > 0 && r.liveExtracted,
  );
  const stuckScaffolded = rows.filter((r) => r.wiki && r.stub && r.courseNode && !r.liveExtracted);

  const body = `# MIT-OCW pipeline coverage matrix

**Generated:** ${new Date().toISOString()} by \`scripts/mit-pipeline-coverage-audit.mjs\`
**Slot:** india (MIT-COURSE-INTEGRATION/U-MIT-PIPELINE-COVERAGE)
**Purpose:** Per-course gap matrix between "wiki scaffolded" and "fully wired into PSN".

## Summary

- **Total courses:** ${tally.courses}
- **Wiki entries:** ${tally.wiki} (${(tally.wiki / tally.courses * 100).toFixed(0)}%)
- **Triplet stubs:** ${tally.stub} (${(tally.stub / tally.courses * 100).toFixed(0)}%)
- **Course-node pointers:** ${tally.courseNode}
- **Courses with formula-nodes:** ${tally.anyFormulaNodes} (total formula-nodes: ${tally.totalFormulaNodes})
- **Courses with textbook-node:** ${tally.textbookNode}
- **Courses with instructor-nodes:** ${tally.anyInstructorNode} (total instructor-nodes: ${tally.totalInstructorNodes})
- **Live-extracted (real OCW data):** ${tally.liveExtracted}
- **Hand-triplet cross-referenced:** ${tally.handTriplet}
- **Fully wired into PSN (all 7 ✅):** ${fullyWired.length}
- **Stuck-scaffolded (wiki+stub+node but no live extraction):** ${stuckScaffolded.length}

## Coverage matrix

| Course | Wiki | Stub | Course-Node | #Formula | Textbook | #Instructor | Live | Hand-Triplet |
|---|---|---|---|---|---|---|---|---|
${rows.map(row).join("\n")}

## Lima follow-up punch list

### Fully wired (no action needed) — ${fullyWired.length} course(s)
${fullyWired.length === 0 ? "_(none yet — first live extraction is MIT 2.830 in progress)_" : fullyWired.map((r) => `- \`${r.courseCode}\``).join("\n")}

### Stuck scaffolded (live-extract these next to unlock the rest) — top 10
${stuckScaffolded.slice(0, 10).map((r) => `- \`${r.courseCode}\` — needs Playwright/WebFetch live run`).join("\n")}

### Re-run instructions

\`\`\`bash
# Regenerate node pointers (idempotent):
node H:/prism/scripts/mit-extracted-node-emitter.mjs

# Re-run audit:
node H:/prism/scripts/mit-pipeline-coverage-audit.mjs
\`\`\`

## PSN consumer wiring map

| Consumer | Feed mechanism | Status |
|---|---|---|
| /system-viz (110K-node graph) | wiki + node pointer files auto-indexed on \`regen-viz.mjs\` | ✅ live |
| Obsidian brain | \`stop-obsidian-memory-feed.mjs\` copies memory/*.md on Stop | ✅ live |
| Master-index search | All wiki + memory files indexed by master-index | ✅ live |
| Tribal index | Cross-reference via course wiki's \`Consuming engines\` row | ✅ live |
| PRISM Academy UI (lima PWA) | Reads \`node_course_*\` + \`node_formula_*\` for course cards | 📝 lima ships render |
| AI training data | \`prism_ai:ai_resource_training_data\` action consumes node pointers | 📝 lima wires consumer |
| /pdf-learn + /video-learn | Caller invokes on URLs from MitOcwResourceResolverEngine | 📝 batch pipeline pending |
| MITCourseKnowledgeEngine | Reads course wiki + node pointers for KG construction | 📝 lima audit |

## Apply

- **Fully-wired metric** should grow from 0 → 92 as lima runs live extraction across the catalog.
- Each course goes from "stuck scaffolded" to "fully wired" with: (a) Playwright/WebFetch live fetch, (b) wiki update with \`## Live extraction\` section, (c) re-run emitter to populate textbook + instructor nodes, (d) re-run this audit.
- The audit is the **definition of done** for the MIT /goal: a course is "extracted" iff its row shows all 7 ✅.

Related: [[reference_india_iter4_hpm_wire_2026_05_23]] · [[reference_mit_ocw_resolver_joint_course_slug_bug_2026_05_23]] · [[mit-course-triplet-index-2026-05-23]]
`;

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, body);
  console.log(`📊 COVERAGE AUDIT → ${path.relative(REPO_ROOT, REPORT_PATH)}`);
  console.log(`  courses=${tally.courses} wiki=${tally.wiki} stub=${tally.stub} course-nodes=${tally.courseNode}`);
  console.log(`  formula-nodes=${tally.totalFormulaNodes} textbook-nodes=${tally.textbookNode} instructor-nodes=${tally.totalInstructorNodes}`);
  console.log(`  live-extracted=${tally.liveExtracted} hand-triplet=${tally.handTriplet} fully-wired=${fullyWired.length} stuck=${stuckScaffolded.length}`);
}

main();
