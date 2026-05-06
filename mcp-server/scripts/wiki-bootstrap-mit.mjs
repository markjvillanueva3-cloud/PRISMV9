#!/usr/bin/env node
/**
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U04 — wiki-bootstrap-mit driver.
 *
 * Reads MIT_COURSE_INDEX.json + ALGORITHM_REGISTRY.json, filters to general
 * categories (math/CS/ML fundamentals — skips manufacturing/finance applied
 * content), renders each entry to a markdown file, and idempotently appends
 * to wiki/index.md.
 *
 * Usage:
 *   node scripts/wiki-bootstrap-mit.mjs \
 *     --course-index "H:/prism/resources/MIT COURSES/MIT_COURSE_INDEX.json" \
 *     --algorithm-registry "H:/prism/resources/MIT COURSES/ALGORITHM_REGISTRY.json" \
 *     --wiki-root "H:/prism/knowledge/wiki" \
 *     [--allowed-categories "algorithms,machine_learning,optimization"] \
 *     [--dry-run]   # print what would change, write nothing
 *
 * Output (stdout): JSON summary { ok, courses_rendered, algorithms_rendered, index_lines_added, errors }.
 *
 * @module scripts/wiki-bootstrap-mit
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const out = {
    courseIndex: "H:/prism/resources/MIT COURSES/MIT_COURSE_INDEX.json",
    algorithmRegistry: "H:/prism/resources/MIT COURSES/ALGORITHM_REGISTRY.json",
    wikiRoot: "H:/prism/knowledge/wiki",
    allowedCategories: null,    // null = use engine defaults
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--course-index") out.courseIndex = argv[++i] ?? out.courseIndex;
    else if (a === "--algorithm-registry") out.algorithmRegistry = argv[++i] ?? out.algorithmRegistry;
    else if (a === "--wiki-root") out.wikiRoot = argv[++i] ?? out.wikiRoot;
    else if (a === "--allowed-categories") {
      const raw = argv[++i] ?? "";
      out.allowedCategories = raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
      if (out.allowedCategories.length === 0) out.allowedCategories = null;
    }
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function safeReadJson(filepath, label) {
  if (!fs.existsSync(filepath)) {
    return { ok: false, error: `${label}-not-found`, message: `${label} not found at ${filepath}` };
  }
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: `${label}-parse-error`, message: String(err?.message ?? err) };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "engines", "WikiBootstrapEngine.js");
  if (!fs.existsSync(distPath)) {
    console.log(JSON.stringify({
      ok: false,
      error: "engine-not-built",
      message: `WikiBootstrapEngine compiled artifact not found at ${distPath}. Run npm run build:fast first.`,
    }, null, 2));
    process.exit(2);
  }
  const { wikiBootstrapEngine } = await import(pathToFileURL(distPath).href);

  const courseIndexResult = safeReadJson(args.courseIndex, "MIT_COURSE_INDEX");
  if (!courseIndexResult.ok) {
    console.log(JSON.stringify(courseIndexResult, null, 2));
    process.exit(2);
  }
  const algRegistryResult = safeReadJson(args.algorithmRegistry, "ALGORITHM_REGISTRY");
  if (!algRegistryResult.ok) {
    console.log(JSON.stringify(algRegistryResult, null, 2));
    process.exit(2);
  }

  const allowed = args.allowedCategories;
  const courses = wikiBootstrapEngine.filterIndex(courseIndexResult.value, allowed ?? undefined);
  const algorithms = wikiBootstrapEngine.filterAlgorithms(algRegistryResult.value, allowed ?? undefined);

  const summary = {
    ok: true,
    wiki_root: args.wikiRoot,
    allowed_categories: allowed ?? "(default general categories)",
    courses_filtered: courses.length,
    algorithms_filtered: algorithms.length,
    courses_rendered: 0,
    algorithms_rendered: 0,
    index_lines_added: 0,
    files_already_current: 0,
    dryRun: args.dryRun,
    errors: [],
  };

  const coursesDir = path.join(args.wikiRoot, "mit", "courses");
  const algorithmsDir = path.join(args.wikiRoot, "mit", "algorithms");
  if (!args.dryRun) {
    try {
      fs.mkdirSync(coursesDir, { recursive: true });
      fs.mkdirSync(algorithmsDir, { recursive: true });
    } catch (err) {
      summary.ok = false;
      summary.errors.push({ phase: "mkdir", message: String(err?.message ?? err) });
      console.log(JSON.stringify(summary, null, 2));
      process.exit(1);
    }
  }

  // Render and write course entries
  const indexLines = [];
  for (const c of courses) {
    let entry;
    try { entry = wikiBootstrapEngine.renderCourseEntry(c); }
    catch (err) {
      summary.errors.push({ phase: "render-course", course_id: c.course_id, message: String(err?.message ?? err) });
      continue;
    }
    const filepath = path.join(coursesDir, `${entry.id}.md`);
    if (!args.dryRun) {
      const existing = fs.existsSync(filepath) ? fs.readFileSync(filepath, "utf-8") : "";
      if (existing === entry.body) {
        summary.files_already_current++;
      } else {
        try { fs.writeFileSync(filepath, entry.body); summary.courses_rendered++; }
        catch (err) {
          summary.errors.push({ phase: "write-course", course_id: c.course_id, message: String(err?.message ?? err) });
          continue;
        }
      }
    } else {
      summary.courses_rendered++;
    }
    indexLines.push(wikiBootstrapEngine.buildIndexLine(entry));
  }

  // Render and write algorithm entries
  for (const a of algorithms) {
    let entry;
    try { entry = wikiBootstrapEngine.renderAlgorithmEntry(a); }
    catch (err) {
      summary.errors.push({ phase: "render-algorithm", name: a.algorithm_name, message: String(err?.message ?? err) });
      continue;
    }
    const filepath = path.join(algorithmsDir, `${entry.id}.md`);
    if (!args.dryRun) {
      const existing = fs.existsSync(filepath) ? fs.readFileSync(filepath, "utf-8") : "";
      if (existing === entry.body) {
        summary.files_already_current++;
      } else {
        try { fs.writeFileSync(filepath, entry.body); summary.algorithms_rendered++; }
        catch (err) {
          summary.errors.push({ phase: "write-algorithm", name: a.algorithm_name, message: String(err?.message ?? err) });
          continue;
        }
      }
    } else {
      summary.algorithms_rendered++;
    }
    indexLines.push(wikiBootstrapEngine.buildIndexLine(entry));
  }

  // Update wiki/index.md
  const indexPath = path.join(args.wikiRoot, "index.md");
  if (!args.dryRun) {
    let existingIndex = "";
    if (fs.existsSync(indexPath)) {
      try { existingIndex = fs.readFileSync(indexPath, "utf-8"); }
      catch (err) {
        summary.errors.push({ phase: "read-index", message: String(err?.message ?? err) });
      }
    }
    const updatedIndex = wikiBootstrapEngine.insertIndexEntries(existingIndex, indexLines);
    if (updatedIndex !== existingIndex) {
      try {
        fs.mkdirSync(path.dirname(indexPath), { recursive: true });
        fs.writeFileSync(indexPath, updatedIndex);
        // Count actual additions (new lines that weren't already in existingIndex)
        const before = existingIndex.split(/\r?\n/).filter((l) => l.match(/^- \[/)).length;
        const after = updatedIndex.split(/\r?\n/).filter((l) => l.match(/^- \[/)).length;
        summary.index_lines_added = Math.max(0, after - before);
      } catch (err) {
        summary.errors.push({ phase: "write-index", message: String(err?.message ?? err) });
      }
    }
  } else {
    summary.index_lines_added = indexLines.length;
  }

  if (summary.errors.length > 0) summary.ok = false;
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 1);
}

main().catch((err) => {
  console.log(JSON.stringify({
    ok: false,
    error: "unhandled",
    message: String(err?.message ?? err),
    stack: String(err?.stack ?? "").slice(0, 2000),
  }, null, 2));
  process.exit(1);
});
