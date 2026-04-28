#!/usr/bin/env node
/**
 * summarize-all-scripts-via-ollama.mjs
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U02.
 *
 * Walks every executable script under H:/prism/scripts/ and
 * H:/prism/mcp-server/scripts/, asks the local Ollama
 * qwen2.5-coder:7b model for a single-sentence summary, and writes
 * the result to H:/prism/knowledge/scripts/INDEX.md so the
 * script-summary-inject hook can answer "what does this script do?"
 * without re-reading the source file.
 *
 * Each entry uses the docstring/JSDoc from the file when present
 * (deterministic, free) and only escalates to Ollama if no
 * docstring is detected. Idempotent: SCRIPTS_INDEX.json tracks
 * sha-1 of file content + summary so reruns skip unchanged
 * scripts.
 *
 * Usage:
 *   node scripts/summarize-all-scripts-via-ollama.mjs
 *   node scripts/summarize-all-scripts-via-ollama.mjs --dry-run
 *   node scripts/summarize-all-scripts-via-ollama.mjs --no-ollama  # docstring-only
 *   node scripts/summarize-all-scripts-via-ollama.mjs --limit=N
 *
 * Exit:
 *   0 — JSON summary on stdout
 *   1 — fatal (no scripts found)
 *   2 — invalid args
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P3-U02
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const SCRIPT_DIRS = [
  "H:/prism/scripts",
  "H:/prism/mcp-server/scripts",
];
const VAULT_INDEX = "H:/prism/knowledge/scripts/INDEX.md";
const STATE_FILE = "H:/prism/mcp-server/data/state/SCRIPTS_INDEX.json";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b";
const OLLAMA_TIMEOUT_MS = 8_000;
const MAX_SUMMARY_CHARS = 240;
const SCRIPT_EXTS = [".mjs", ".js", ".ts", ".cjs", ".mts"];

function parseArgs(argv) {
  const out = { dryRun: false, noOllama: false, limit: 0 };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-ollama") out.noOllama = true;
    else if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 0) { process.stderr.write(`Invalid --limit: ${a}\n`); process.exit(2); }
      out.limit = Math.floor(n);
    } else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: node scripts/summarize-all-scripts-via-ollama.mjs [--dry-run] [--no-ollama] [--limit=N]\n");
      process.exit(0);
    } else { process.stderr.write(`Unknown arg: ${a}\n`); process.exit(2); }
  }
  return out;
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { schemaVersion: "1.0.0", entries: {} };
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { schemaVersion: "1.0.0", entries: {} }; }
}

function saveState(s) {
  ensureDir(path.dirname(STATE_FILE));
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function listScripts() {
  const out = [];
  for (const dir of SCRIPT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const ext = path.extname(name).toLowerCase();
      if (!SCRIPT_EXTS.includes(ext)) continue;
      const full = path.join(dir, name);
      try { if (fs.statSync(full).isFile()) out.push(full); }
      catch { /* skip */ }
    }
  }
  return out;
}

function fileHash(content) {
  return createHash("sha1").update(content).digest("hex").slice(0, 16);
}

/**
 * Try to lift a 1-line summary from the file's leading JSDoc/comment
 * block. Returns null if no docstring present.
 */
function extractDocstringSummary(content) {
  // Strip an optional shebang so the docstring detection works on .mjs files
  const stripped = content.replace(/^#![^\r\n]*\r?\n/, "");
  // Match leading JSDoc: /** ... */ or // header
  const jsdoc = stripped.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (jsdoc) {
    const body = jsdoc[1];
    for (const raw of body.split(/\r?\n/)) {
      const line = raw.replace(/^\s*\*\s?/, "").trim();
      if (!line) continue;
      // Skip bare filename headers like "foo.mjs - bar"
      const cleaned = line.replace(/^\S+\.[a-z]+\s*[—-]\s*/, "");
      if (cleaned.length < 5) continue;
      return cleaned.slice(0, MAX_SUMMARY_CHARS);
    }
  }
  // Match leading // comment block
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (lines[i].startsWith("#!") || lines[i].trim() === "")) i++;
  if (i < lines.length && lines[i].trim().startsWith("//")) {
    return lines[i].replace(/^\s*\/\/\s?/, "").trim().slice(0, MAX_SUMMARY_CHARS) || null;
  }
  return null;
}

async function ollamaSummarize(filename, content) {
  const prompt = [
    "You are a concise code summarizer. Summarize what this script does in EXACTLY ONE sentence (under 200 chars).",
    "No filenames, no markdown, no fluff — just a sentence describing the action.",
    `Filename: ${filename}`,
    `Source (first 2000 chars):\n${content.slice(0, 2000)}`,
  ].join("\n\n");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, options: { num_predict: 80 } }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = await res.json();
    const summary = String(body?.response ?? "").trim().split(/\r?\n/)[0]?.trim() ?? "";
    return summary ? summary.slice(0, MAX_SUMMARY_CHARS) : null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function renderIndexMd(entries) {
  const sortedKeys = Object.keys(entries).sort();
  const byDir = new Map();
  for (const key of sortedKeys) {
    const dir = path.dirname(key);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(key);
  }
  const lines = [
    "# Scripts Index",
    "",
    "_Auto-generated by `scripts/summarize-all-scripts-via-ollama.mjs` (P3-U02). Do not edit manually._",
    "",
    `**Total scripts:** ${sortedKeys.length}`,
    "",
  ];
  for (const dir of [...byDir.keys()].sort()) {
    lines.push(`## ${dir.replace(/^H:\/prism\//, "")}`, "");
    for (const key of byDir.get(dir)) {
      const e = entries[key];
      const name = path.basename(key);
      lines.push(`- **${name}** — ${e.summary}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  let scripts = listScripts();
  if (scripts.length === 0) { process.stderr.write("No scripts found\n"); process.exit(1); }
  if (args.limit > 0) scripts = scripts.slice(0, args.limit);

  const state = loadState();
  const stats = {
    target: VAULT_INDEX,
    state: STATE_FILE,
    found: scripts.length,
    summarizedDocstring: 0,
    summarizedOllama: 0,
    skipped: 0,
    failed: 0,
    dryRun: args.dryRun,
    noOllama: args.noOllama,
  };

  for (const file of scripts) {
    const key = file.replace(/\\/g, "/");
    let content;
    try { content = fs.readFileSync(file, "utf8"); }
    catch { stats.failed++; continue; }
    const h = fileHash(content);
    const cached = state.entries[key];
    if (cached && cached.hash === h) { stats.skipped++; continue; }

    let summary = extractDocstringSummary(content);
    if (summary) {
      stats.summarizedDocstring++;
    } else if (!args.noOllama && !args.dryRun) {
      summary = await ollamaSummarize(path.basename(file), content);
      if (summary) stats.summarizedOllama++;
    }
    if (!summary) {
      summary = `(no docstring; ${path.basename(file)})`;
      stats.failed++;
    }

    if (!args.dryRun) {
      state.entries[key] = { hash: h, summary, lastIndexed: new Date().toISOString() };
    }
  }

  if (!args.dryRun) {
    saveState(state);
    ensureDir(path.dirname(VAULT_INDEX));
    fs.writeFileSync(VAULT_INDEX, renderIndexMd(state.entries));
  }

  process.stdout.write(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${e?.message ?? e}\n`);
  process.exit(1);
});
