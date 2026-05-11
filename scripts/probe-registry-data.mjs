#!/usr/bin/env node
// One-shot: find all registry-like dirs with JSON data under mcp-server
import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism/mcp-server";
const MAX_DEPTH = 5;

const HITS = [];

function walk(dir, depth = 0) {
  if (depth >= MAX_DEPTH) return;
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (!e.isDirectory()) continue;
    const lower = e.name.toLowerCase();
    if (lower === "node_modules" || lower === "dist" || lower === ".git") continue;
    if (/^(materials?|tools?|machines?|coatings?|coolants?|formulas?|posts?|postprocessors?|strategies|catalogs?|alarms?|knowledge|tips|wiki|tribal|jm-die|cam-functions|cad-functions|cam-ui|cad-ui|operations|features|tooling|fixtures|workholding|inserts|holders)$/.test(lower)) {
      let jsonCount = 0;
      try { jsonCount = fs.readdirSync(p).filter(f => f.endsWith(".json")).length; }
      catch { /* noop */ }
      let nestedJson = 0;
      try {
        for (const sd of fs.readdirSync(p, { withFileTypes: true })) {
          if (!sd.isDirectory()) continue;
          try { nestedJson += fs.readdirSync(path.join(p, sd.name)).filter(f => f.endsWith(".json")).length; }
          catch { /* noop */ }
        }
      } catch { /* noop */ }
      HITS.push({ path: p.split(path.sep).join("/"), directJson: jsonCount, nestedJson });
    }
    walk(p, depth + 1);
  }
}

walk(ROOT);

// Dedup
const seen = new Set();
const uniq = [];
for (const h of HITS) {
  if (seen.has(h.path)) continue;
  seen.add(h.path);
  uniq.push(h);
}
uniq.sort((a, b) => (b.directJson + b.nestedJson) - (a.directJson + a.nestedJson));
console.log("registry-like dirs:");
for (const h of uniq.slice(0, 50)) {
  console.log(`  total=${String(h.directJson + h.nestedJson).padStart(5)}  direct=${String(h.directJson).padStart(4)}  nested=${String(h.nestedJson).padStart(4)}  ${h.path}`);
}
console.log(`\ntotal candidates: ${uniq.length}`);
