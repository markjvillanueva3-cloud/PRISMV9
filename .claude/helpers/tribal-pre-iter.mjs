#!/usr/bin/env node
/**
 * tribal-pre-iter.mjs — F5
 *
 * Before each /loop iteration, surface top-K tribal tips matching the
 * unit's keywords. Wired into /checkin Step 12 ("before iter, run this").
 *
 * Strategy:
 *   1. Try direct file scan of `knowledge/wiki/architecture/tribal-tip-*.md`
 *      (BM25-style keyword overlap; fast, no MCP roundtrip).
 *   2. Fall back to the tribal-knowledge index at
 *      `state/shared/tribal-index.jsonl` if present.
 *   3. Emit top-K (default 3) as a markdown block suitable for
 *      additionalContext injection.
 *
 * CLI:
 *   node tribal-pre-iter.mjs --keywords "kien zle force milling" [--k 3]
 *   node tribal-pre-iter.mjs --keywords "..." --json    # JSON output
 *
 * Exits 0 always (advisory).
 */

import fs from "node:fs";
import path from "node:path";

const WIKI_DIR = "H:/prism/knowledge/wiki/architecture";
const TRIBAL_INDEX = "H:/prism/state/shared/tribal-index.jsonl";
const DEFAULT_K = 3;
const MAX_HEAD_BYTES = 2000;

function parseArgs() {
  const out = { keywords: "", k: DEFAULT_K, json: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--keywords") { out.keywords = argv[++i] || ""; }
    else if (a === "--k") { out.k = parseInt(argv[++i], 10) || DEFAULT_K; }
    else if (a === "--json") { out.json = true; }
  }
  return out;
}

function tokenize(s) {
  return String(s).toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3);
}

/**
 * BM25-lite scoring: count distinct query-token matches per doc, normalize
 * by doc-token-set size. Fast and good-enough for top-3 ranking.
 */
function scoreDoc(queryTokens, docHead) {
  const docTokens = new Set(tokenize(docHead));
  let hits = 0;
  for (const q of queryTokens) if (docTokens.has(q)) hits++;
  return hits / Math.max(1, Math.sqrt(docTokens.size));
}

function readTribalTipsFromWiki(queryTokens) {
  if (!fs.existsSync(WIKI_DIR)) return [];
  const out = [];
  for (const f of fs.readdirSync(WIKI_DIR)) {
    if (!/^tribal-tip-/i.test(f) || !f.endsWith(".md")) continue;
    try {
      const fd = fs.openSync(path.join(WIKI_DIR, f), "r");
      const buf = Buffer.allocUnsafe(MAX_HEAD_BYTES);
      const len = fs.readSync(fd, buf, 0, MAX_HEAD_BYTES, 0);
      fs.closeSync(fd);
      const head = buf.slice(0, len).toString("utf-8");
      const score = scoreDoc(queryTokens, head);
      if (score > 0) {
        const titleMatch = head.match(/title:\s*['"]?([^'"\n]+)/i);
        const title = titleMatch ? titleMatch[1].trim() : f.replace(/\.md$/, "");
        const firstPara = head.split(/\n\n/).find(p => p.trim() && !p.startsWith("---")) || "";
        out.push({ score, title, file: f, snippet: firstPara.slice(0, 200) });
      }
    } catch {}
  }
  return out;
}

function readTribalTipsFromIndex(queryTokens) {
  if (!fs.existsSync(TRIBAL_INDEX)) return [];
  const out = [];
  try {
    const raw = fs.readFileSync(TRIBAL_INDEX, "utf-8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        const tip = JSON.parse(t);
        const text = (tip.title || "") + " " + (tip.body || tip.text || "");
        const score = scoreDoc(queryTokens, text);
        if (score > 0) {
          out.push({ score, title: tip.title || "(no title)", file: tip.source || tip.id || "tribal-index", snippet: (tip.body || "").slice(0, 200) });
        }
      } catch {}
    }
  } catch {}
  return out;
}

function main() {
  const args = parseArgs();
  if (!args.keywords || args.keywords.trim().length === 0) {
    process.stdout.write(args.json ? '{"hits":[]}\n' : "");
    return;
  }
  const qTokens = tokenize(args.keywords);
  if (qTokens.length === 0) { process.stdout.write(args.json ? '{"hits":[]}\n' : ""); return; }

  const fromWiki = readTribalTipsFromWiki(qTokens);
  const fromIndex = readTribalTipsFromIndex(qTokens);
  const all = [...fromWiki, ...fromIndex].sort((a, b) => b.score - a.score).slice(0, args.k);

  if (args.json) {
    process.stdout.write(JSON.stringify({ hits: all }) + "\n");
    return;
  }
  if (all.length === 0) { process.stdout.write(""); return; }
  const lines = [`## 🧠 Tribal tips matching "${args.keywords}" (top ${all.length})`, ""];
  for (const h of all) {
    lines.push(`### ${h.title}  (score ${h.score.toFixed(2)} · \`${h.file}\`)`);
    if (h.snippet) lines.push(h.snippet);
    lines.push("");
  }
  process.stdout.write(lines.join("\n"));
}

main();
