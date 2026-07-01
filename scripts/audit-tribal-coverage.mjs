#!/usr/bin/env node
/**
 * audit-tribal-coverage.mjs — META artifact for the
 * MACHINING-TRIBAL-COVERAGE goal (2026-05-18, slot golf, claude-de36f7ad).
 *
 * Question it answers: across the ~4245 tribal-tip wiki entries PRISM already
 * has, which of the 5 named high-ROI machining categories is under-served?
 *
 * The /loop directive was "generate high-ROI obsidian memories + tribal
 * knowledge injection for tooling selection / workholding / part setup /
 * operation ordering / machining tactics." Authoring without a coverage map
 * is blind — this script tells the next /loop iteration WHICH category to
 * author content for first.
 *
 * Re-runnable measurement tool (Boris compounding-gains). NOT a content
 * generator. Authoring is a separate unit; this is the gap-finder.
 *
 * Pure-core + injected I/O so tests verify without filesystem.
 *
 * Usage:
 *   node scripts/audit-tribal-coverage.mjs            # text dashboard
 *   node scripts/audit-tribal-coverage.mjs --json     # machine-readable
 *   node scripts/audit-tribal-coverage.mjs --gaps     # top weakest categories
 *
 * Knobs:
 *   PRISM_TRIBAL_COVERAGE_INDEX  override path to _leaf-index.jsonl
 *   PRISM_TRIBAL_COVERAGE_ROOT   override tribal corpus root (knowledge/tribal)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve as pathResolve, join as pathJoin, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(__dirname, "..");

const LEAF_INDEX = process.env.PRISM_TRIBAL_COVERAGE_INDEX
  || pathResolve(REPO_ROOT, "knowledge/wiki/architecture/_leaf-index.jsonl");
const TRIBAL_ROOT = process.env.PRISM_TRIBAL_COVERAGE_ROOT
  || pathResolve(REPO_ROOT, "knowledge/tribal");

// File-walk safety limits — keep audit bounded against the ~4245-leaf corpus.
const MAX_TRIBAL_FILES = 5000;        // cap the fs walk; 4245 known + headroom
const MAX_TIP_FILE_BYTES = 200_000;   // skip massive (likely binary-ish) files

// ─── category keyword sets (load-bearing — NOT pretty regex) ────────────
//
// Each set is the OR-union of high-signal substrings (lowercased compare).
// Order matters: a tip matching multiple categories is attributed to the
// FIRST match — this prevents double-counting + makes coverage honest. The
// ordering is from "most-specific lexical signal" to "most-general."

// Order matters — first-match-wins. Action-phrase categories (operation-
// ordering, part-setup) deliberately come BEFORE noun-heavy categories
// (workholding, tooling-selection) because real machining tips mix verb-
// strong phrases ("drill before bore", "indicate the vise") with incidental
// nouns ("vise", "reamer"). The verb is the stronger semantic signal.
export const CATEGORIES = [
  {
    key: "operation-ordering",
    label: "Operation ordering / sequencing",
    tokens: ["rough then finish", "rough-then-finish", "rough first",
             "semi-finish", "semi finish", "rest machining", "rest-machining",
             "hog out", "hog-out", "prebore", "pre-bore", "drill before bore",
             "op order", "operation order", "operation sequence", "step order",
             "stress relief", "leave finish stock", "leave stock", "rough leaves"],
  },
  {
    key: "part-setup",
    label: "Part setup / probing",
    tokens: ["edge finder", "edge-finder", "probe", "probing", "datum", "g54",
             "g55", "work offset", "wcs", "z-zero", "z zero", "dial indicator",
             "indicate", "indicate-in", "tram", "trammed", "haimer", "renishaw",
             "wiggler", "part origin", "setup sheet"],
  },
  {
    key: "workholding",
    label: "Workholding practices",
    tokens: ["vise", "fixture", "clamp", "soft jaw", "soft-jaw", "tombstone",
             "chuck", "collet", "magnetic chuck", "vacuum", "parallel", "riser",
             "step jaw", "dovetail", "5th-axis", "5-axis fixture", "workholding"],
  },
  {
    key: "tooling-selection",
    label: "Tooling selection",
    tokens: ["end mill", "endmill", "drill", "tap", "reamer", "insert",
             "tnmg", "cnmg", "wnmg", "vbmt", "carbide", "tialn", "altin",
             "coating", "tool grade", "indexable", "geometry", "flute count",
             "ballnose", "ball-nose", "corner radius", "shell mill", "face mill",
             "tool selection", "tool choice", "tool wear-rate"],
  },
  {
    key: "machining-tactics",
    label: "Machining tactics + know-how",
    tokens: ["climb mill", "climb-mill", "conventional mill", "chip thinning",
             "chip-thinning", "hsm", "trochoidal", "peel mill", "peel-mill",
             "ramp in", "lead in", "lead-in", "plunge", "helical", "tab",
             "rdoc", "adoc", "chip load", "chipload", "feed override",
             "spindle ramp", "rigid tap", "depth-of-cut", "stepover", "stepdown",
             "engagement", "tool deflection", "chatter", "dwell", "peck",
             "in-cut", "air-cut", "skim cut"],
  },
];

// ─── pure helpers (exported for tests) ──────────────────────────────────

/** Classify one tip into the FIRST matching category. Returns category key
 *  or null if no token matched. Pure — works on a plain text blob. */
export function classifyTip(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  const lower = text.toLowerCase();
  for (const cat of CATEGORIES) {
    for (const tok of cat.tokens) {
      if (lower.includes(tok)) return cat.key;
    }
  }
  return null;
}

/** Parse one line of the _leaf-index.jsonl. Returns { path, kind, body }
 *  or null on malformed. `body` is whatever short summary the leaf has;
 *  callers add the file body for higher recall. Pure. */
export function parseLeafLine(line) {
  if (typeof line !== "string" || !line.trim()) return null;
  try {
    const j = JSON.parse(line);
    if (!j || typeof j !== "object") return null;
    return {
      path: j.path || j.file || null,
      kind: j.kind || j.category || null,
      body: typeof j.body === "string" ? j.body
            : typeof j.summary === "string" ? j.summary
            : typeof j.text === "string" ? j.text
            : "",
    };
  } catch { return null; }
}

/** Aggregate per-category counts + uncategorized + total. Pure. */
export function aggregate(tips) {
  const counts = Object.fromEntries(CATEGORIES.map(c => [c.key, 0]));
  let uncategorized = 0;
  let total = 0;
  for (const t of tips) {
    if (!t) continue;
    total++;
    const key = classifyTip(t);
    if (key && key in counts) counts[key]++;
    else uncategorized++;
  }
  return { total, counts, uncategorized };
}

/** Rank categories by ascending count (weakest first). Pure. */
export function rankGaps(counts) {
  return CATEGORIES
    .map(c => ({ key: c.key, label: c.label, count: counts[c.key] || 0 }))
    .sort((a, b) => a.count - b.count);
}

// ─── I/O wrappers ───────────────────────────────────────────────────────

function safeRead(p) {
  try { return readFileSync(p, "utf8"); } catch { return null; }
}

function walkTribal(root, limit = MAX_TRIBAL_FILES) {
  const out = [];
  if (!existsSync(root)) return out;
  const stack = [root];
  while (stack.length && out.length < limit) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      if (out.length >= limit) break;
      const full = pathJoin(dir, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (name.startsWith(".") || name === "auto-ingested-quarantine") continue;
        stack.push(full);
      } else if (name.endsWith(".md") && st.size < MAX_TIP_FILE_BYTES) {
        out.push(full);
      }
    }
  }
  return out;
}

// ─── audit runner ───────────────────────────────────────────────────────

function runAudit() {
  const tips = [];
  const sources = { leafIndex: 0, tribalFs: 0 };

  // Source 1: _leaf-index.jsonl — covers everything wiki-indexed
  const indexText = safeRead(LEAF_INDEX);
  if (indexText) {
    for (const line of indexText.split(/\r?\n/)) {
      const leaf = parseLeafLine(line);
      if (!leaf || !leaf.path) continue;
      const pathLower = leaf.path.toLowerCase();
      // Restrict to tribal-shaped leaves (kind=tribal-tip OR path contains tribal/code-tribal)
      const looksTribal = leaf.kind === "tribal-tip"
        || pathLower.includes("/tribal/")
        || pathLower.includes("/code-tribal/")
        || pathLower.includes("tribal-tip");
      if (!looksTribal) continue;
      // Use body if present; otherwise fall back to the path basename
      const blob = (leaf.body || "") + " " + (leaf.path || "");
      tips.push(blob);
      sources.leafIndex++;
    }
  }

  // Source 2: knowledge/tribal/*.md — directly walked for cases the index
  // missed (auto-ingest lag, new vendor drops)
  const tribalFiles = walkTribal(TRIBAL_ROOT, 5000);
  for (const f of tribalFiles) {
    const body = safeRead(f);
    if (!body) continue;
    tips.push(body);
    sources.tribalFs++;
  }

  const agg = aggregate(tips);
  const ranked = rankGaps(agg.counts);

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    leafIndexPath: LEAF_INDEX,
    tribalRootPath: TRIBAL_ROOT,
    sources,
    totals: { tipsScanned: agg.total, uncategorized: agg.uncategorized },
    counts: agg.counts,
    ranked,
    weakestCategory: ranked[0] || null,
    advisory:
      "Author content for the WEAKEST category first. /tribal-by-domain-inject + /wiki-precheck-inject will surface new tips automatically — no wiring needed.",
  };
}

function renderText(report) {
  const lines = [
    "┌─ Tribal Machining-Coverage Audit ────────────────────────────",
    `│ generated:    ${report.generatedAt}`,
    `│ sources:      ${report.sources.leafIndex} leaf-index + ${report.sources.tribalFs} tribal-fs`,
    `│ tips scanned: ${report.totals.tipsScanned}`,
    `│ uncategorized: ${report.totals.uncategorized} (${
      report.totals.tipsScanned > 0
        ? ((report.totals.uncategorized / report.totals.tipsScanned) * 100).toFixed(1)
        : "0.0"
    }%)`,
    "├─ per-category coverage (weakest first) ────────────────────",
  ];
  for (const r of report.ranked) {
    const pct = report.totals.tipsScanned > 0
      ? ((r.count / report.totals.tipsScanned) * 100).toFixed(1)
      : "0.0";
    lines.push(`│ ${r.count.toString().padStart(5)}  ${pct.padStart(5)}%  ${r.label}`);
  }
  lines.push("├─ next-action ──────────────────────────────────────────────");
  if (report.weakestCategory) {
    lines.push(`│ Author content for: ${report.weakestCategory.label}`);
    lines.push(`│ Path: knowledge/wiki/code-tribal/canonical/<name>.md`);
    lines.push(`│ Pickup hook: tribal-by-domain-inject + wiki-precheck-inject`);
  } else {
    lines.push(`│ ⚠ No categories ranked — leaf-index + tribal root both empty?`);
  }
  lines.push("└──────────────────────────────────────────────────────────────");
  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const jsonMode = argv.includes("--json");
  const gapsMode = argv.includes("--gaps");

  const report = runAudit();

  if (gapsMode) {
    process.stdout.write(JSON.stringify({
      weakest: report.weakestCategory,
      ranked: report.ranked,
    }, null, 2) + "\n");
  } else if (jsonMode) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(renderText(report) + "\n");
  }
  process.exit(0);
}

const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, "/").endsWith("audit-tribal-coverage.mjs");
if (invokedDirectly) main();
