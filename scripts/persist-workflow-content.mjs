#!/usr/bin/env node
/**
 * persist-workflow-content.mjs -- deterministic writer for Workflow arms that return
 * {unit, targetPath, content} objects (slot:zulu, 2026-06-15).
 *
 * WHY (R5): a return-only Workflow yields a structured array; writing each item's
 * `content` to its `targetPath` is a PURE deterministic transform. Reading the ~70KB
 * output JSON into an LLM context thrashes it (observed 2026-06-15) -- node reads it
 * in-process for zero context cost. Items with null targetPath (pure findings) are skipped.
 *
 * USAGE: node scripts/persist-workflow-content.mjs --input <output.json> [--only u1,u2] [--dry]
 * ASCII-only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.PRISM_ROOT || "H:/prism";

export function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--input") a.input = argv[++i];
    else if (t === "--only") a.only = String(argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (t === "--dry") a.dry = true;
  }
  return a;
}

export function extractItems(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  if (parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.result)) return parsed.result;
    if (typeof parsed.result === "string") { try { const r = JSON.parse(parsed.result); if (Array.isArray(r)) return r; } catch { /* fall */ } }
  }
  const start = text.indexOf('[{"unit"');
  if (start >= 0) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = !inStr;
      else if (!inStr && c === "[") depth++;
      else if (!inStr && c === "]") { depth--; if (depth === 0) { try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; } } }
    }
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) { console.error("usage: --input <file> [--only u1,u2] [--dry]"); process.exit(2); }
  const items = extractItems(fs.readFileSync(args.input, "utf8"));
  if (!Array.isArray(items) || !items.length) { console.error(`[persist] no item array in ${args.input}`); process.exit(3); }
  const out = [];
  for (const it of items) {
    if (!it || !it.unit) continue;
    if (args.only && !args.only.includes(it.unit)) continue;
    if (!it.targetPath) { out.push(`${it.unit}: (findings only, no file) conf=${it.confidence}`); continue; }
    const abs = path.resolve(ROOT, it.targetPath);
    const bytes = Buffer.byteLength(it.content || "", "utf8");
    if (!args.dry) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, it.content || "", "utf8"); }
    out.push(`${it.unit}: ${args.dry ? "WOULD write" : "wrote"} ${it.targetPath} (${bytes} B) conf=${it.confidence}`);
  }
  console.log(out.join("\n"));
  console.log(`[persist] ${out.length} items from ${path.basename(args.input)}${args.dry ? " (dry-run)" : ""}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
