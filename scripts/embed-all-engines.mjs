#!/usr/bin/env node
/**
 * embed-all-engines.mjs — embed every PRISM engine description
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P3-U03.
 *
 * Walks `mcp-server/src/engines/*.ts`, extracts each engine's class
 * name and the first paragraph of its leading JSDoc block, and embeds
 * the result into the Qdrant `engine` collection via
 * `prism_memory:remember`. The corpus is what
 * DuplicationGuardEngine queries to answer "is there an engine
 * already doing X?" without an O(N) keyword scan.
 *
 * Idempotent: ENGINES_INDEX.json keys by file content sha-1.
 *
 * Usage:
 *   node scripts/embed-all-engines.mjs
 *   node scripts/embed-all-engines.mjs --dry-run
 *   node scripts/embed-all-engines.mjs --no-embed
 *   node scripts/embed-all-engines.mjs --limit=N
 *
 * Exit:
 *   0 — JSON summary
 *   1 — fatal (no engines found)
 *   2 — invalid args
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P3-U03
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ENGINE_DIR = "H:/prism/mcp-server/src/engines";
const STATE_FILE = "H:/prism/mcp-server/data/state/ENGINES_INDEX.json";
const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const EMBED_TIMEOUT_MS = 12_000;
const MAX_DESCRIPTION_CHARS = 800;

function parseArgs(argv) {
  const out = { dryRun: false, noEmbed: false, limit: 0 };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-embed") out.noEmbed = true;
    else if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      if (!Number.isFinite(n) || n < 0) { process.stderr.write(`Invalid --limit: ${a}\n`); process.exit(2); }
      out.limit = Math.floor(n);
    } else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: node scripts/embed-all-engines.mjs [--dry-run] [--no-embed] [--limit=N]\n");
      process.exit(0);
    } else { process.stderr.write(`Unknown arg: ${a}\n`); process.exit(2); }
  }
  return out;
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function loadIndex() {
  if (!fs.existsSync(STATE_FILE)) return { schemaVersion: "1.0.0", entries: {} };
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { schemaVersion: "1.0.0", entries: {} }; }
}

function saveIndex(idx) {
  ensureDir(path.dirname(STATE_FILE));
  fs.writeFileSync(STATE_FILE, JSON.stringify(idx, null, 2));
}

function listEngineFiles() {
  if (!fs.existsSync(ENGINE_DIR)) return [];
  const out = [];
  for (const name of fs.readdirSync(ENGINE_DIR)) {
    if (!name.endsWith(".ts") || name.endsWith(".d.ts") || name.endsWith(".test.ts")) continue;
    const full = path.join(ENGINE_DIR, name);
    try { if (fs.statSync(full).isFile()) out.push(full); }
    catch { /* skip */ }
  }
  return out;
}

function fileHash(content) {
  return createHash("sha1").update(content).digest("hex").slice(0, 16);
}

/**
 * Pull the first paragraph of the file's leading JSDoc block. The
 * regex tolerates an optional shebang and any number of leading
 * blank or import lines before the first /** ... *\/.
 */
function extractEngineDescription(content) {
  const stripped = content.replace(/^#![^\r\n]*\r?\n/, "");
  // Find the FIRST jsdoc block in the file (engines almost always lead with one)
  const m = stripped.match(/\/\*\*([\s\S]*?)\*\//);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/).map((l) => l.replace(/^\s*\*\s?/, "").trimEnd());
  // First-paragraph: lines until a blank line or `@param`/`@return`/`@module` tag
  const paragraph = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (paragraph.length > 0) break;
      continue;
    }
    if (/^@(param|returns?|module|version|since|throws|deprecated|see)\b/.test(trimmed)) break;
    paragraph.push(trimmed);
  }
  if (paragraph.length === 0) return null;
  return paragraph.join(" ").slice(0, MAX_DESCRIPTION_CHARS);
}

function extractClassName(content, file) {
  const m = content.match(/export\s+(?:default\s+)?class\s+([A-Z][A-Za-z0-9_]+)/);
  if (m) return m[1];
  const fb = path.basename(file, ".ts");
  return fb;
}

async function tryEmbed(id, text, metadata) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "prism_memory", arguments: { action: "remember", params: { kind: "engine", id, text, metadata } } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? "";
    try {
      const parsed = JSON.parse(inner);
      return { ok: parsed?.ok === true, reason: parsed?.error ?? null };
    } catch { return { ok: false, reason: "bad-inner-json" }; }
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  let files = listEngineFiles();
  if (files.length === 0) { process.stderr.write("No engines found\n"); process.exit(1); }
  if (args.limit > 0) files = files.slice(0, args.limit);

  const idx = loadIndex();
  const stats = {
    state: STATE_FILE,
    found: files.length,
    described: 0,
    embedded: 0,
    embedFailed: 0,
    skipped: 0,
    noDocstring: 0,
    dryRun: args.dryRun,
    noEmbed: args.noEmbed,
  };

  for (const file of files) {
    const key = path.basename(file, ".ts");
    let content;
    try { content = fs.readFileSync(file, "utf8"); }
    catch { stats.embedFailed++; continue; }
    const h = fileHash(content);
    const cached = idx.entries[key];
    if (cached && cached.hash === h) { stats.skipped++; continue; }

    const className = extractClassName(content, file);
    const description = extractEngineDescription(content);
    if (!description) { stats.noDocstring++; continue; }
    stats.described++;

    if (args.dryRun) { stats.embedded++; continue; }

    const text = `${className}\n\n${description}`;
    if (args.noEmbed) {
      idx.entries[key] = { hash: h, className, description, lastIndexed: new Date().toISOString() };
      stats.embedded++;
      continue;
    }
    const r = await tryEmbed(`engine/${key}`, text, { className, file: path.basename(file) });
    if (r.ok) {
      idx.entries[key] = { hash: h, className, description, lastIndexed: new Date().toISOString() };
      stats.embedded++;
    } else {
      stats.embedFailed++;
    }
  }

  if (!args.dryRun) saveIndex(idx);

  process.stdout.write(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${e?.message ?? e}\n`);
  process.exit(1);
});
