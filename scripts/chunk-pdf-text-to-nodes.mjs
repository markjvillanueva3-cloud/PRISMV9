#!/usr/bin/env node
/**
 * chunk-pdf-text-to-nodes.mjs
 *
 * PDF-TRIBAL-HERMES/U-TRIBAL-RESOURCES-CHUNKER (slot:zulu 2026-06-24).
 *
 * The bridge between the PDF text-layer extractor and the Hermes tribal-tip
 * generator. The extractor (scripts/lib/pdf-text-layer-extract.py) emits one
 * `{path, text, ok, chars, pages}` JSONL row per PDF -- but a manual is huge (the
 * Haas lathe operator manual = 654,809 chars / 532pp) and the generator caps each
 * node's prompt at ~8K chars. Feeding one giant node would mine tips from only the
 * first page. This splits each doc's text into ~CHUNK_CHARS sections (on paragraph
 * boundaries) and writes one generator-readable node JSON per chunk, so the whole
 * manual gets drained -> one ~8-tip extraction per chunk.
 *
 * Output node shape (exactly what generate-pdf-tribal-tips-hermes.mjs::nodeText +
 * buildUserPrompt read): { sha8, text, domain, software, title, source, chunk }.
 * `sha8` is a stable hash of (path + chunk index) so the generator's resume cursor
 * (done sha8s from tips.jsonl) skips already-drained chunks on a re-run.
 *
 * Usage:
 *   node scripts/chunk-pdf-text-to-nodes.mjs --in <extract.jsonl> --out-dir <dir> [--domain cam] [--chunk-chars 6000] [--max-chunks-per-doc N]
 *
 * Then drain:
 *   PRISM_TRIBAL_SOURCE_DIR=<dir> node scripts/generate-pdf-tribal-tips-hermes.mjs --concurrency 8
 *   node scripts/embed-pdf-tribal-tips-into-index.mjs
 *
 * @milestone PDF-TRIBAL-HERMES/U-TRIBAL-RESOURCES-CHUNKER
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_CHUNK_CHARS = 6000; // under the generator's ~8000 prompt cap
const MIN_CHUNK_CHARS = 300;       // drop trailing scraps too thin to mine

export function sha8(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 8);
}

/** Slugify a PDF path into a readable title (last 2 path segments, no ext). */
export function titleFromPath(p) {
  const parts = String(p || "").replace(/\\/g, "/").replace(/\.pdf$/i, "").split("/").filter(Boolean);
  return parts.slice(-2).join(" / ") || String(p || "doc");
}

/**
 * Split text into <=chunkChars pieces on paragraph (blank-line) then sentence
 * boundaries, never mid-word. Pure + deterministic. Drops pieces < MIN_CHUNK_CHARS
 * EXCEPT a sole chunk (a short doc still yields its one chunk).
 */
export function chunkText(text, chunkChars = DEFAULT_CHUNK_CHARS) {
  const clean = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= chunkChars) return [clean];
  const paras = clean.split(/\n\s*\n/);
  const chunks = [];
  let cur = "";
  const push = () => { const t = cur.trim(); if (t) chunks.push(t); cur = ""; };
  for (const para of paras) {
    if (para.length > chunkChars) {
      // a giant paragraph -> split on sentence ends, then hard-wrap any remainder
      push();
      const sentences = para.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [para];
      for (const s of sentences) {
        if ((cur + " " + s).length > chunkChars && cur) push();
        if (s.length > chunkChars) { // a single mega-sentence: hard slice
          for (let i = 0; i < s.length; i += chunkChars) chunks.push(s.slice(i, i + chunkChars).trim());
        } else cur += (cur ? " " : "") + s;
      }
      continue;
    }
    if ((cur + "\n\n" + para).length > chunkChars && cur) push();
    cur += (cur ? "\n\n" : "") + para;
  }
  push();
  // keep all but trailing sub-min scraps (a lone chunk always survives)
  return chunks.filter((c, i) => c.length >= MIN_CHUNK_CHARS || (i === 0 && chunks.length === 1));
}

/** One extractor row -> array of node objects (one per chunk). Pure. */
export function rowToNodes(row, { domain = "manufacturing", software = null, chunkChars = DEFAULT_CHUNK_CHARS, maxChunksPerDoc = Infinity } = {}) {
  if (!row || row.ok === false || !row.text) return [];
  const src = row.path || row.source || "";
  const title = titleFromPath(src);
  let chunks = chunkText(row.text, chunkChars);
  if (Number.isFinite(maxChunksPerDoc)) chunks = chunks.slice(0, maxChunksPerDoc);
  return chunks.map((text, i) => ({
    sha8: sha8(`${src}::${i}`),
    text,
    domain,
    software,
    title: chunks.length > 1 ? `${title} [${i + 1}/${chunks.length}]` : title,
    source: src,
    chunk: i,
  }));
}

export function main(argv = process.argv.slice(2)) {
  const flags = { in: null, outDir: null, domain: "manufacturing", software: null, chunkChars: DEFAULT_CHUNK_CHARS, maxChunksPerDoc: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in") flags.in = argv[++i];
    else if (a === "--out-dir") flags.outDir = argv[++i];
    else if (a === "--domain") flags.domain = argv[++i];
    else if (a === "--software") flags.software = argv[++i];
    else if (a === "--chunk-chars") flags.chunkChars = parseInt(argv[++i], 10);
    else if (a === "--max-chunks-per-doc") flags.maxChunksPerDoc = parseInt(argv[++i], 10);
  }
  if (!flags.in || !flags.outDir) {
    console.error("usage: --in <extract.jsonl> --out-dir <dir> [--domain d] [--chunk-chars N] [--max-chunks-per-doc N]");
    process.exit(2);
  }
  fs.mkdirSync(flags.outDir, { recursive: true });
  let docs = 0, nodes = 0, failedRows = 0;
  for (const line of fs.readFileSync(flags.in, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    if (row.ok === false || !row.text) { failedRows++; continue; }
    docs++;
    for (const node of rowToNodes(row, flags)) {
      fs.writeFileSync(path.join(flags.outDir, `${node.sha8}.json`), JSON.stringify(node), "utf8");
      nodes++;
    }
  }
  console.log(JSON.stringify({ ok: true, docs, nodes, failedRows, outDir: flags.outDir }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error(String(e && e.message ? e.message : e)); process.exit(1); }
}
