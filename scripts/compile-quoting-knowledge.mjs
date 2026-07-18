#!/usr/bin/env node
/**
 * compile-quoting-knowledge.mjs — compile the quoting domain's high-ROI wiki + tribal + memory
 * knowledge into ONE consolidated, retrieval-indexed digest (slot:charlie galaxy).
 *
 * GOAL (operator 2026-05-29): "compile all relevant wiki and tribal knowledge for your domain —
 * wired, validated, and auto-invoked when needed." Produces:
 *   - state/shared/quoting/QUOTING-KNOWLEDGE.md         (human/Claude-readable compiled digest)
 *   - state/shared/quoting/quoting-knowledge-index.json (keyword→entries for the auto-invoke hook)
 *
 * The companion hook charlie-quoting-knowledge-inject.mjs reads the index and surfaces the top-K
 * relevant compiled entries on each charlie prompt that mentions a quoting topic — "auto invoked
 * when needed" without re-scanning the 38K-file wiki at prompt time.
 *
 * CURATED vs GENERATED: the wiki has ~641 quoting-named files but most are auto-generated node-doc
 * action stubs (architecture/actions|combos|tests, node_* memories) — low signal. The compiler
 * keeps CURATED knowledge (lessons / concepts / decisions / patterns / code-tribal / top-level
 * architecture wiki + reference_/feedback_ memories) and only COUNTS the generated stubs.
 *
 * Pure-core + injected reader for testability; defensive-default (galaxy gotcha #6); self-updating
 * (enumerates the real filesystem). Date.now() only at CLI runtime, never module top-level.
 *
 * CLI:  node scripts/compile-quoting-knowledge.mjs [--json] [--root H:/prism]
 * Knobs: PRISM_ROOT (default H:/prism)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

export const DEFAULT_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SYNTH_VERSION = "1.0.0";

/** Quoting-domain vocabulary — filename/path/content relevance + keyword extraction. */
export const QUOTING_VOCAB = [
  "quote", "quoting", "pricing", "price", "cost", "estimat", "margin", "bid", "freight",
  "import", "docustrata", "fair-market", "fairmarket", "fmv", "job-cost", "jobcost",
  "calibration", "drift", "outcome", "instant-quote", "xometry", "outsource", "scenario",
  "reconciliation", "actual-cost", "closed-loop",
];

const QUOTING_RX = /quot|quote|pricing|\bprice\b|\bcost\b|estimat|margin|\bbid\b|freight|import-cost|docustrata|fair.?market|\bfmv\b|job.?cost|calibrat|closed.?loop|xometry|outsource/i;

/** Classify a doc by its repo-relative path. Pure. Returns {tier, source, keep}. */
export function classifyDoc(relPath) {
  if (typeof relPath !== "string" || relPath.length === 0) return { tier: "skip", source: "none", keep: false };
  const p = relPath.replace(/\\/g, "/");
  // auto-generated, low-signal node-doc stubs — count only, never compile
  const generated =
    /\/wiki\/architecture\/(actions|combos|tests|frontends)\//.test(p) ||
    /\/memories\/.*\/node_/.test(p) ||
    /\/node_[a-z]/.test(p);
  if (generated) return { tier: "generated", source: p.includes("/wiki/") ? "wiki" : "memory", keep: false };
  // curated, high-ROI surfaces
  let source = "other";
  if (/\/wiki\//.test(p)) source = "wiki";
  else if (/\/memories\/feedback\//.test(p)) source = "feedback";
  else if (/\/memories\/reference\//.test(p)) source = "memory";
  else if (/\/engines\/quoting\//.test(p)) source = "galaxy";
  const curatedWiki =
    /\/wiki\/(lessons|concepts|decisions|patterns|code-tribal|coordination|reference)\//.test(p) ||
    /\/wiki\/architecture\/[^/]+\.md$/.test(p); // top-level architecture only
  const curatedMem = source === "memory" || source === "feedback";
  const keep = source === "galaxy" || (source === "wiki" && curatedWiki) || curatedMem;
  return { tier: keep ? "curated" : "skip", source, keep };
}

/** Extract {title, summary, keywords} from a markdown doc. Pure + defensive. */
export function extractMeta(text, relPath) {
  const safe = typeof text === "string" ? text : "";
  const p = (relPath || "").replace(/\\/g, "/");
  // title: frontmatter `title:` → first `# heading` → basename
  let title = (safe.match(/^title:\s*(.+)$/m) || [])[1];
  if (!title) title = (safe.match(/^#\s+(.+)$/m) || [])[1];
  if (!title) title = (p.split("/").pop() || "untitled").replace(/\.md$/, "");
  title = title.trim().slice(0, 120);
  // summary: frontmatter description → first non-heading/non-frontmatter prose line
  let summary = (safe.match(/^description:\s*(.+)$/m) || [])[1];
  if (!summary) {
    const lines = safe.split("\n");
    let inFm = false;
    for (const ln of lines) {
      const t = ln.trim();
      if (t === "---") { inFm = !inFm; continue; }
      if (inFm || !t || t.startsWith("#") || t.startsWith(">") || t.startsWith("```")) continue;
      // skip commit-metadata lines (code-tribal/learnings are commit-derived) — pick real prose
      if (/^(commit|by|at|author|date|files?|sha|hash|tags?)\s*[:=]/i.test(t)) continue;
      summary = t; break;
    }
  }
  summary = (summary || "").replace(/[*`[\]]/g, "").trim().slice(0, 200);
  // keywords: vocab terms present in title+path+first 600 chars
  const hay = (title + " " + p + " " + safe.slice(0, 600)).toLowerCase();
  const keywords = QUOTING_VOCAB.filter((v) => hay.includes(v));
  // also add path tokens (split on non-word) that look domain-specific
  for (const tok of p.replace(/\.md$/, "").split(/[/_\-.]/)) {
    const tl = tok.toLowerCase();
    if (tl.length >= 4 && /quot|cost|pric|estimat|margin|docustrata|calibrat|freight|bid|fmv|outcome/.test(tl) && !keywords.includes(tl)) keywords.push(tl);
  }
  return { title, summary: summary || "(no summary)", keywords: [...new Set(keywords)] };
}

/** Build the knowledge index from a list of {relPath, text}. Pure. */
export function buildIndex(docs) {
  const safe = Array.isArray(docs) ? docs : [];
  const entries = [];
  const counts = { curated: 0, generated: 0, skipped: 0, bySource: {} };
  for (const d of safe) {
    if (!d || typeof d.relPath !== "string") continue;
    const cls = classifyDoc(d.relPath);
    if (cls.tier === "generated") { counts.generated++; continue; }
    if (!cls.keep) { counts.skipped++; continue; }
    const meta = extractMeta(d.text, d.relPath);
    entries.push({
      id: d.relPath.replace(/\\/g, "/"),
      source: cls.source,
      title: meta.title,
      summary: meta.summary,
      keywords: meta.keywords,
      path: d.relPath.replace(/\\/g, "/"),
    });
    counts.curated++;
    counts.bySource[cls.source] = (counts.bySource[cls.source] || 0) + 1;
  }
  // stable sort: source group then title
  entries.sort((a, b) => (a.source + a.title).localeCompare(b.source + b.title));
  return { entries, counts };
}

/** Match prompt tokens to index entries; return top-K by keyword-overlap score. Pure. */
export function matchEntries(promptTokens, index, k = 3) {
  const toks = Array.isArray(promptTokens) ? promptTokens.map((t) => String(t).toLowerCase()) : [];
  const entries = index && Array.isArray(index.entries) ? index.entries : [];
  if (toks.length === 0 || entries.length === 0) return [];
  const scored = entries.map((e) => {
    const kws = Array.isArray(e.keywords) ? e.keywords : [];
    let score = 0;
    for (const kw of kws) for (const t of toks) if (t.includes(kw) || kw.includes(t)) score++;
    // title token overlap (lighter weight)
    const titleToks = String(e.title || "").toLowerCase().split(/\W+/);
    for (const tt of titleToks) if (tt.length >= 4 && toks.includes(tt)) score += 0.5;
    return { e, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, Math.max(1, k)).map((s) => s.e);
}

/** Render the consolidated digest markdown. Pure. */
export function renderDigest(index, generatedAt, root) {
  const { entries, counts } = index;
  const bySource = (src) => entries.filter((e) => e.source === src);
  const section = (label, src) => {
    const es = bySource(src);
    if (es.length === 0) return [];
    return [`### ${label} (${es.length})`, ...es.map((e) => `- **${e.title}** — ${e.summary}  \`${e.path}\``), ""];
  };
  return [
    "# QUOTING-KNOWLEDGE — compiled wiki + tribal + memory for slot:charlie (auto-generated)",
    "",
    `> Consolidated high-ROI quoting-domain knowledge. Compiled by \`scripts/compile-quoting-knowledge.mjs\`; surfaced on-demand by \`charlie-quoting-knowledge-inject.mjs\` (charlie-gated, keyword-matched). Generated ${generatedAt}. Self-updating — enumerates the real filesystem.`,
    "",
    `**Compiled: ${counts.curated} curated entries** (${Object.entries(counts.bySource).map(([s, n]) => `${s}:${n}`).join(", ")}) · skipped ${counts.generated} auto-generated node-doc stubs + ${counts.skipped} off-domain.`,
    "",
    "## Galaxy docs (galactic center)",
    ...bySource("galaxy").map((e) => `- **${e.title}** — ${e.summary}  \`${e.path}\``),
    "",
    "## Wiki — architecture / lessons / concepts",
    ...bySource("wiki").map((e) => `- **${e.title}** — ${e.summary}  \`${e.path}\``),
    "",
    "## Tribal / feedback (standing doctrine)",
    ...bySource("feedback").map((e) => `- **${e.title}** — ${e.summary}  \`${e.path}\``),
    "",
    "## Reference memories",
    ...bySource("memory").map((e) => `- **${e.title}** — ${e.summary}  \`${e.path}\``),
    "",
    `_compiler v${SYNTH_VERSION} · root ${root}_`,
  ].join("\n");
}

// ---- impure shell ---------------------------------------------------------

function safeWalk(dir, acc, depth, maxDepth) {
  if (depth > maxDepth) return;
  let e;
  try { e = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const d of e) {
    const fp = join(dir, d.name);
    if (d.isDirectory()) safeWalk(fp, acc, depth + 1, maxDepth);
    else if (d.name.endsWith(".md") && QUOTING_RX.test(d.name)) acc.push(fp);
  }
}
function safeRead(file) { try { return readFileSync(file, "utf8"); } catch { return ""; } }

/** Gather quoting docs from wiki + memories + galaxy. Impure but defensive. */
export function gatherDocs(root) {
  const found = [];
  safeWalk(join(root, "knowledge/wiki"), found, 0, 7);
  safeWalk(join(root, "knowledge/memories"), found, 0, 5);
  // galaxy docs (always include, even though not quoting-RX in filename)
  for (const f of ["CLAUDE.md", "MEMORY.md", "PATHS.md", "TOOLBELT.md"]) {
    const gp = join(root, "mcp-server/src/engines/quoting", f);
    try { statSync(gp); found.push(gp); } catch { /* absent */ }
  }
  const r = root.replace(/\\/g, "/").replace(/\/$/, "");
  return found.map((fp) => {
    const norm = fp.replace(/\\/g, "/");
    const rel = norm.startsWith(r) ? norm.slice(r.length).replace(/^\//, "") : norm;
    return { relPath: rel, text: safeRead(fp) };
  });
}

export function compile(opts = {}) {
  const root = (opts.root || DEFAULT_ROOT).replace(/\\/g, "/");
  const docs = opts.docs || gatherDocs(root);
  const index = buildIndex(docs);
  const generatedAt = opts.generatedAtIso || isoNow();
  const md = renderDigest(index, generatedAt, root);
  const json = { schemaVersion: SYNTH_VERSION, generatedAt, root, counts: index.counts, entries: index.entries };
  return { index, md, json };
}

function isoNow() { return new Date().toISOString().slice(0, 10); }

// ---- CLI ------------------------------------------------------------------

function main(argv) {
  const root = (argv.find((a) => a.startsWith("--root=")) || "").split("=")[1] || DEFAULT_ROOT;
  const { md, json } = compile({ root });
  if (argv.includes("--json")) { process.stdout.write(JSON.stringify(json, null, 2) + "\n"); return 0; }
  const outMd = join(root, "state/shared/quoting/QUOTING-KNOWLEDGE.md");
  const outJson = join(root, "state/shared/quoting/quoting-knowledge-index.json");
  try {
    mkdirSync(dirname(outMd), { recursive: true });
    writeFileSync(outMd, md, "utf8");
    writeFileSync(outJson, JSON.stringify(json), "utf8");
    process.stdout.write(`[quoting-knowledge] compiled ${json.counts.curated} curated entries (${Object.entries(json.counts.bySource).map(([s, n]) => `${s}:${n}`).join(", ")}) → ${outMd}\n`);
  } catch (e) {
    process.stderr.write(`[quoting-knowledge] FAILED: ${e && e.message}\n`);
    return 1;
  }
  return 0;
}

const invokedDirectly = (() => {
  try {
    return Boolean(process.argv[1]) && process.argv[1].replace(/\\/g, "/").endsWith("compile-quoting-knowledge.mjs");
  } catch { return false; }
})();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
