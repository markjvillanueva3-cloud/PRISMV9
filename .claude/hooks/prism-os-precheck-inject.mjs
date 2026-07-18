#!/usr/bin/env node
// tier: T2
// prism-os-precheck-inject.mjs — UserPromptSubmit injector
//
// Surfaces top-K PRISM OS entries (commands/pipelines/processes/runqueue/
// sessions/syscalls) matching the user prompt. Closes high-ROI gap from
// HIGH-ROI-USAGE-AUDIT-2026-05-18: PRISM OS (28 .md) had zero consumer hooks.
//
// Knobs:
//   PRISM_PRISM_OS_INJECT=0    — disable
//   PRISM_PRISM_OS_K=N         — top-K (default 3, clamped 1..10)
//   PRISM_PRISM_OS_MIN_SCORE=X — min BM25-lite score (default 0.1)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const OS_DIR = path.join(PRISM_ROOT, "knowledge/wiki/os");
const DISABLE = process.env.PRISM_PRISM_OS_INJECT === "0";
const TOP_K = Math.min(10, Math.max(1, parseInt(process.env.PRISM_PRISM_OS_K || "3", 10)));
const MIN_SCORE = parseFloat(process.env.PRISM_PRISM_OS_MIN_SCORE || "0.1");

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "of", "to", "in", "on",
  "at", "for", "with", "by", "as", "from", "this", "that", "and", "or", "but",
  "not", "no", "yes", "i", "we", "you", "they", "it", "what", "how", "where",
  "when", "why", "do", "does", "did", "can", "should", "would", "will", "may",
  "might", "must", "have", "has", "had",
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9_\-/]+/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 2 && t.length <= 32 && !STOPWORDS.has(t));
}

let cachedIndex = null;
let cachedIndexMtime = 0;

function buildIndex() {
  let dirMtime;
  try { dirMtime = fs.statSync(OS_DIR).mtimeMs; } catch { return []; }
  if (cachedIndex && dirMtime === cachedIndexMtime) return cachedIndex;

  const entries = [];
  function walk(dir) {
    let items;
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) { walk(full); continue; }
      if (!item.isFile() || !item.name.endsWith(".md") || item.name.startsWith("_")) continue;
      let body;
      try { body = fs.readFileSync(full, "utf8"); } catch { continue; }
      const rel = path.relative(PRISM_ROOT, full).replace(/\\/g, "/");
      const kind = path.dirname(rel).split("/").pop();
      const h1 = (body.match(/^#\s+(.+)$/m) || [])[1] || "";
      const fmTitle = (body.match(/^title:\s*(.+)$/m) || [])[1] || "";
      const name = path.basename(full, ".md");
      const fullText = `${name} ${h1} ${fmTitle} ${body.slice(0, 2000)}`;
      const tokens = tokenize(fullText);
      const tokenCounts = new Map();
      for (const t of tokens) tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
      entries.push({ rel, name, kind, h1: h1.slice(0, 80), tokens: tokenCounts, tokenCount: tokens.length });
    }
  }
  walk(OS_DIR);

  const df = new Map();
  for (const e of entries) for (const t of e.tokens.keys()) df.set(t, (df.get(t) || 0) + 1);
  const N = Math.max(1, entries.length);
  for (const e of entries) {
    e.idfBoost = new Map();
    for (const [t, tf] of e.tokens) {
      const idf = Math.log(1 + N / (df.get(t) || 1));
      e.idfBoost.set(t, idf * tf / Math.sqrt(e.tokenCount + 1));
    }
  }
  cachedIndex = entries;
  cachedIndexMtime = dirMtime;
  return entries;
}

function score(query, entry) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;
  let s = 0;
  for (const qt of queryTokens) if (entry.idfBoost.has(qt)) s += entry.idfBoost.get(qt);
  if (queryTokens.includes(entry.name.toLowerCase())) s += 2;
  return s;
}

function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

async function main() {
  if (DISABLE) return emit({ continue: true });
  let stdin = "";
  for await (const chunk of process.stdin) stdin += chunk;
  let payload;
  try { payload = JSON.parse(stdin || "{}"); }
  catch { return emit({ continue: true }); }
  const prompt = payload.prompt || payload.user_prompt || "";
  if (/^\s*\//.test(prompt)) return emit({ continue: true });
  const idx = buildIndex();
  if (idx.length === 0) return emit({ continue: true });
  const scored = idx
    .map(e => ({ entry: e, s: score(prompt, e) }))
    .filter(x => x.s >= MIN_SCORE)
    .sort((a, b) => b.s - a.s)
    .slice(0, TOP_K);
  if (scored.length === 0) return emit({ continue: true });
  const lines = ["## 🧬 PRISM OS precheck — relevant operating-system entries"];
  for (const { entry, s } of scored) {
    lines.push(`- **[[${entry.name}]]** (${entry.kind}, score ${s.toFixed(2)}) — ${entry.h1 || entry.rel}`);
  }
  lines.push("_PRISM OS namespace: commands → syscalls. Drill: `Read knowledge/wiki/os/<kind>/<name>.md`._");
  lines.push("_Disable: PRISM_PRISM_OS_INJECT=0._");
  return emit({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: lines.join("\n") },
  });
}

const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || "");
if (isMain) {
  main().catch(err => {
    process.stderr.write(`prism-os-precheck-inject: ${err.message}\n`);
    emit({ continue: true });
  });
}

export { tokenize, buildIndex, score };
