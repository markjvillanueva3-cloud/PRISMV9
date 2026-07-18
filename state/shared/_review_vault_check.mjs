import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const PRISM_ROOT = (process.env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/");
const MEMORY_DIR = process.env.PRISM_MEMORY_DIR || path.join(os.homedir(), ".claude", "projects", "H--prism", "memory");
const MEMORIES_REF_DIR = `${PRISM_ROOT}/knowledge/memories/reference`;
let cNames = new Set();
try { cNames = new Set(fs.readdirSync(MEMORY_DIR).map((f) => f.toLowerCase())); } catch {}
let files = [];
try { files = fs.readdirSync(MEMORIES_REF_DIR); } catch (e) { console.log("REF DIR ERR", e.message); }
let vault = 0, excludedNode = 0, excludedMem = 0, excludedDup = 0, nonMd = 0;
const dups = [], stems = new Set(), collisions = [];
for (const f of files) {
  if (!/\.md$/i.test(f)) { nonMd++; continue; }
  if (f === "MEMORY.md") { excludedMem++; continue; }
  if (/^node[-_]/i.test(f)) { excludedNode++; continue; }
  if (cNames.has(f.toLowerCase())) { excludedDup++; dups.push(f); continue; }
  const stem = `vault/${f.replace(/\.md$/i, "")}`;
  if (stems.has(stem)) collisions.push(stem);
  stems.add(stem);
  vault++;
}
console.log("MEMORY_DIR exists:", fs.existsSync(MEMORY_DIR), "C: listing size:", cNames.size);
console.log("REF_DIR exists:", fs.existsSync(MEMORIES_REF_DIR), "total files:", files.length);
console.log("vault-only:", vault, "| dedup-skipped(in C:):", excludedDup, "| node_*:", excludedNode, "| MEMORY.md:", excludedMem, "| non-md:", nonMd);
console.log("intra-vault key collisions:", collisions.length, collisions.slice(0, 3));
console.log("sample dups (already in C:, NOT double-embedded):", dups.slice(0, 5));
// Cross-namespace collision check: could a vault/ key equal a galaxy/ key or a flat key?
const flatLike = [...stems].filter((s) => !s.startsWith("vault/"));
console.log("vault keys not prefixed vault/ (should be 0):", flatLike.length);
