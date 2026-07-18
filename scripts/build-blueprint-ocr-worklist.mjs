#!/usr/bin/env node
// scripts/build-blueprint-ocr-worklist.mjs
//
// U-PSGB-XRAY-BATCH (#6 helper) — sample real blueprint PDFs from the
// jm-die-database files table into a newline worklist for the batch OCR runner.
// De-dups by filename (the same print lives at many paths in the JM corpus).
//
// USAGE: node scripts/build-blueprint-ocr-worklist.mjs [--limit 300] [--out <file>] [--files <files.jsonl>]

import { createReadStream, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Pure: is this file a blueprint/drawing scan worth OCR-ing?
 * Heuristic over path+name+size — drawing folders/names, sane size, NOT a
 * multi-page manual/catalog (those are not single prints).
 */
export function looksLikeBlueprint(path, name, size) {
  const p = String(path || "");
  const n = String(name || "").toLowerCase();
  if (!/\.pdf$/i.test(n) && !/\.pdf$/i.test(p)) return false;
  const sz = Number(size) || 0;
  if (sz < 15000 || sz > 6000000) return false; // skip tiny stubs + huge files
  // not single prints / not drawings: multi-page docs + business paperwork (a
  // digit-led invoice/quote/PO would otherwise pass the /^\d/ heuristic and burn
  // overnight VLM time — reviewer-flagged).
  if (/manual|catalog|brochure|handbook|sample|invoice|\bquote\b|\bpo\b|packing|receipt|purchase|statement|\bpacket\b/i.test(p + " " + n)) return false;
  const drawingish = /electrode|scanned|drawing|\bprint\b|\bdwg\b|\bdet\b/i.test(p + " " + n) || /^\d/.test(n);
  return drawingish;
}

function toForwardSlashes(p) {
  return String(p || "").split("\\").join("/");
}

/** Recursively collect blueprint PDF paths under a directory (fail-soft per dir; depth-bounded). */
function walkBlueprintPdfs(dir, picks, seenName, limit, depth = 0) {
  if (picks.length >= limit || depth > 12) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    if (picks.length >= limit) return;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkBlueprintPdfs(full, picks, seenName, limit, depth + 1);
    } else if (ent.isFile() && /\.pdf$/i.test(ent.name)) {
      let size = 0;
      try { size = statSync(full).size; } catch { continue; }
      if (!looksLikeBlueprint(full, ent.name, size)) continue;
      const key = ent.name.toLowerCase();
      if (seenName.has(key)) continue;
      seenName.add(key);
      picks.push(toForwardSlashes(full));
    }
  }
}

function main() {
  const args = argv.slice(2);
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const limit = Number(get("--limit", "300")) || 300;
  const out = get("--out", join(REPO_ROOT, "state", "shared", "blueprint-ocr-worklist-pilot.txt"));
  const filesJsonl = get("--files", join(REPO_ROOT, "mcp-server", "data", "jm-die-database", "tables", "files.jsonl"));
  const scanDir = get("--scan-dir", null);

  const picks = [];
  const seenName = new Set();

  // --scan-dir: walk a real filesystem tree (the JM corpus has far more PDFs
  // than the jm-die-database files.jsonl extraction subset).
  if (scanDir) {
    walkBlueprintPdfs(scanDir, picks, seenName, limit);
    finish(out, picks, "scan-dir:" + scanDir);
    return;
  }

  const rl = createInterface({ input: createReadStream(filesJsonl, { encoding: "utf8" }) });
  rl.on("line", (line) => {
    if (!line.trim() || picks.length >= limit) return;
    let o;
    try { o = JSON.parse(line); } catch { return; }
    if (!looksLikeBlueprint(o.path, o.name, o.size)) return;
    const name = String(o.name || "").toLowerCase();
    if (seenName.has(name)) return; // de-dup by filename
    seenName.add(name);
    picks.push(toForwardSlashes(o.path));
  });
  rl.on("close", () => finish(out, picks, filesJsonl));
  rl.on("error", (e) => { console.error("[worklist] read error: " + e.message); exit(2); });
}

function finish(out, picks, source) {
  mkdirSync(dirname(out), { recursive: true });
  const header = `# blueprint-vision OCR worklist (slot:xray) — ${picks.length} real blueprint PDFs from ${source}\n`;
  writeFileSync(out, header + picks.join("\n") + (picks.length ? "\n" : ""));
  console.log(`[worklist] wrote ${out}: ${picks.length} prints`);
  picks.slice(0, 4).forEach((p) => console.log("  " + p));
  exit(0);
}

const isMainModule = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);
if (isMainModule) main();
