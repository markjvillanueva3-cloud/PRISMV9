#!/usr/bin/env node
/**
 * tribal-embed-index.mjs — L1 of TRIBAL × AI stack
 *
 * Unified vector index across the four tribal corpora:
 *   1. knowledge/wiki/**\/*.md
 *   2. knowledge/memories/**\/*.md
 *   3. mcp-server/data/state/extraction-log.json
 *   4. (optional) Obsidian vault — registered via tribal-obsidian-mirror.mjs
 *
 * Embedding:  Ollama nomic-embed-text:latest @ 127.0.0.1:11434  (768-dim)
 * Storage:    H:/prism/state/shared/tribal-embed-index.json (atomic write)
 *
 * Subcommands:
 *   --bootstrap          full walk + embed (overwrites index)
 *   --update             only re-embed entries whose hash changed
 *   --add <path>         embed a single file and append/replace
 *   --query "<text>"     embed query, return top-N (default 5)
 *   --stats              print corpus + domain breakdown
 *
 * Architecture: ranking is delegated to tribal-rerank.mjs (L2).
 * This script ONLY builds the index. Keep cosine similarity here too
 * so --query works end-to-end without depending on L2.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PRISM = "H:/prism";
const INDEX_PATH = `${PRISM}/state/shared/tribal-embed-index.json`;
const OLLAMA_URL = "http://127.0.0.1:11434";
const MODEL = "nomic-embed-text:latest";
const DIM = 768;
const TEXT_CAP = 2000; // chars per entry — keeps embed call <30ms

// -- args -------------------------------------------------------------
function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { _: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    } else opts._.push(a[i]);
  }
  return opts;
}

// -- corpus walk ------------------------------------------------------
function walkMd(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        stack.push(p);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        out.push(p.replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

function readExtractionLog() {
  const p = `${PRISM}/mcp-server/data/state/extraction-log.json`;
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    const records = Array.isArray(raw) ? raw : raw.records || raw.entries || [];
    return records.map((r, i) => ({
      synthetic: true,
      id: `extraction-log:${r.id || r.sha || i}`,
      source: "extraction-log",
      title: r.title || r.summary || r.kind || `extraction-${i}`,
      domain: r.domain || r.category || "general",
      text: [r.title, r.summary, r.body, r.text, r.message]
        .filter(Boolean).join("\n\n").slice(0, TEXT_CAP),
      path: p,
    })).filter((r) => r.text && r.text.length > 20);
  } catch (e) {
    console.error(`[warn] extraction-log parse failed: ${e.message}`);
    return [];
  }
}

// -- domain inference -------------------------------------------------
function inferDomain(filePath, text) {
  const p = filePath.toLowerCase();
  const t = (text || "").toLowerCase().slice(0, 500);
  // Path-based first (highest signal)
  if (p.includes("wedm") || p.includes("edm")) return "wedm";
  if (p.includes("lathe") || p.includes("turning")) return "lathe";
  if (p.includes("mill")) return "mill";
  if (p.includes("cad")) return "cad";
  if (p.includes("cam")) return "cam";
  // Text-based fallback
  if (/\bwire edm\b|\bwedm\b|\bsodick\b|\bmitsubishi\b/.test(t)) return "wedm";
  if (/\bturning\b|\blathe\b|\bokuma\b|\bmazak\b/.test(t)) return "lathe";
  if (/\bmilling\b|\bmill\b|\bkienzle\b|\btaylor\b/.test(t)) return "mill";
  if (/\bcad\b|\bsketch\b|\bextrude\b/.test(t)) return "cad";
  if (/\bcam\b|\bpost\b|\bmastercam\b|\bhypermill\b|\bfusion\b/.test(t)) return "cam";
  return "general";
}

function readMdEntry(filePath) {
  let raw;
  try { raw = fs.readFileSync(filePath, "utf8"); }
  catch { return null; }
  // Strip frontmatter for embedding
  let body = raw;
  let title = "";
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end > 0) {
      const fm = raw.slice(3, end);
      body = raw.slice(end + 4);
      const tm = fm.match(/^name:\s*(.+)$/m) || fm.match(/^title:\s*(.+)$/m);
      if (tm) title = tm[1].trim();
    }
  }
  if (!title) {
    const h = body.match(/^#\s+(.+)$/m);
    title = h ? h[1].trim() : path.basename(filePath, ".md");
  }
  const text = body.replace(/\s+/g, " ").trim().slice(0, TEXT_CAP);
  if (!text || text.length < 20) return null;
  const rel = filePath.startsWith(PRISM + "/") ? filePath.slice(PRISM.length + 1) : filePath;
  const source = rel.includes("/wiki/") ? "wiki"
              : rel.includes("/memories/") ? "memory"
              : "external";
  return {
    id: `${source}:${rel}`,
    source,
    title,
    domain: inferDomain(filePath, text),
    text,
    path: rel,
  };
}

// -- embedding --------------------------------------------------------
async function embed(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: text }),
  });
  if (!res.ok) throw new Error(`ollama embed ${res.status}: ${await res.text()}`);
  const j = await res.json();
  if (!Array.isArray(j.embedding) || j.embedding.length !== DIM) {
    throw new Error(`ollama returned bad embedding (len=${j.embedding?.length})`);
  }
  return j.embedding;
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// -- index io (atomic) ------------------------------------------------
function readIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    return { schemaVersion: "1.0.0", model: MODEL, dim: DIM, generatedAt: null, entries: [] };
  }
  try { return JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")); }
  catch (e) {
    console.error(`[warn] index parse failed (${e.message}) — starting fresh`);
    return { schemaVersion: "1.0.0", model: MODEL, dim: DIM, generatedAt: null, entries: [] };
  }
}

function writeIndex(idx) {
  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  const tmp = `${INDEX_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(idx));
  fs.renameSync(tmp, INDEX_PATH);
}

// -- entry processing -------------------------------------------------
async function buildOrUpdate(mode) {
  const idx = mode === "bootstrap"
    ? { schemaVersion: "1.0.0", model: MODEL, dim: DIM, generatedAt: null, entries: [] }
    : readIndex();
  const existing = new Map(idx.entries.map((e) => [e.id, e]));

  const wiki = walkMd(`${PRISM}/knowledge/wiki`);
  const mems = walkMd(`${PRISM}/knowledge/memories`);
  const candidates = [];
  for (const fp of [...wiki, ...mems]) {
    const e = readMdEntry(fp);
    if (e) candidates.push(e);
  }
  candidates.push(...readExtractionLog());

  let added = 0, updated = 0, skipped = 0, failed = 0;
  for (const c of candidates) {
    const hash = hashText(c.text);
    const prior = existing.get(c.id);
    if (prior && prior.hash === hash) { skipped++; continue; }
    try {
      const embedding = await embed(c.text);
      const rec = {
        id: c.id, source: c.source, domain: c.domain, title: c.title,
        path: c.path, text: c.text.slice(0, 400), // keep short snippet only
        hash, embedding,
      };
      existing.set(c.id, rec);
      if (prior) updated++; else added++;
      if ((added + updated) % 50 === 0) {
        process.stdout.write(`  embedded ${added + updated}/${candidates.length}\n`);
      }
    } catch (e) {
      failed++;
      if (failed <= 3) console.error(`[fail] ${c.id}: ${e.message}`);
    }
  }
  idx.entries = [...existing.values()];
  idx.generatedAt = new Date().toISOString();
  writeIndex(idx);
  return { added, updated, skipped, failed, total: idx.entries.length };
}

async function addOne(filePath) {
  const idx = readIndex();
  const existing = new Map(idx.entries.map((e) => [e.id, e]));
  const e = readMdEntry(path.resolve(filePath));
  if (!e) { console.error(`[skip] ${filePath} (unreadable or too small)`); return; }
  const hash = hashText(e.text);
  if (existing.get(e.id)?.hash === hash) {
    console.log(`unchanged: ${e.id}`); return;
  }
  const embedding = await embed(e.text);
  existing.set(e.id, { ...e, text: e.text.slice(0, 400), hash, embedding });
  idx.entries = [...existing.values()];
  idx.generatedAt = new Date().toISOString();
  writeIndex(idx);
  console.log(`added/updated: ${e.id} (${idx.entries.length} total)`);
}

async function query(q, k = 5) {
  const idx = readIndex();
  if (idx.entries.length === 0) {
    console.error("index is empty — run --bootstrap first"); process.exit(2);
  }
  const qe = await embed(q);
  const scored = idx.entries.map((e) => ({ score: cosine(qe, e.embedding), e }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

function stats() {
  const idx = readIndex();
  const bySource = {}, byDomain = {};
  for (const e of idx.entries) {
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    byDomain[e.domain] = (byDomain[e.domain] || 0) + 1;
  }
  console.log(`TRIBAL EMBED INDEX`);
  console.log(`==================`);
  console.log(`Total entries: ${idx.entries.length}`);
  console.log(`Generated:     ${idx.generatedAt || "(never)"}`);
  console.log(`Model:         ${idx.model} (${idx.dim}-dim)`);
  console.log(`\nBy source:`);
  for (const [k, v] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(16)} ${v}`);
  }
  console.log(`\nBy domain:`);
  for (const [k, v] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(16)} ${v}`);
  }
}

// -- main -------------------------------------------------------------
const opts = parseArgs();
const cmd = opts.bootstrap ? "bootstrap"
          : opts.update    ? "update"
          : opts.add       ? "add"
          : opts.query     ? "query"
          : opts.stats     ? "stats"
          : null;
if (!cmd) {
  console.error("usage: tribal-embed-index.mjs --bootstrap|--update|--add <path>|--query <text>|--stats");
  process.exit(1);
}

try {
  if (cmd === "bootstrap" || cmd === "update") {
    const r = await buildOrUpdate(cmd);
    console.log(`${cmd}: added=${r.added} updated=${r.updated} skipped=${r.skipped} failed=${r.failed} total=${r.total}`);
  } else if (cmd === "add") {
    await addOne(opts.add);
  } else if (cmd === "query") {
    const k = Number(opts.k) || 5;
    const hits = await query(opts.query, k);
    for (const h of hits) {
      console.log(`${h.score.toFixed(4)}  [${h.e.domain}] ${h.e.id}`);
      console.log(`         ${h.e.title}`);
    }
  } else if (cmd === "stats") {
    stats();
  }
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(2);
}
