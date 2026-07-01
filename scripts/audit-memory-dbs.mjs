#!/usr/bin/env node
/**
 * audit-memory-dbs.mjs — P15-U01: enumerate all .claude/memory.db files
 * across worktrees + sessions.
 *
 * Scans:
 *   H:/prism (main + .claude/)
 *   H:/prism-slot-X (12 slot worktrees)
 *   H:/prism-X (legacy worktrees)
 *   C:/Users/wompu/.claude/
 *
 * Output: state/shared/specs/MEMORY-DB-AUDIT.{json,md}
 * Pure file enumeration — does NOT open the SQLite databases.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const OUT_JSON = "H:/prism/state/shared/specs/MEMORY-DB-AUDIT.json";
const OUT_MD = "H:/prism/state/shared/specs/MEMORY-DB-AUDIT.md";

const SCAN_ROOTS = [
  "H:/prism",
  "C:/Users/wompu/.claude",
];

// Add any prism-slot-* worktrees
try {
  for (const e of fs.readdirSync("H:/", { withFileTypes: true })) {
    if (e.isDirectory() && (e.name.startsWith("prism-slot-") || (e.name.startsWith("prism-") && e.name !== "prism"))) {
      SCAN_ROOTS.push("H:/" + e.name);
    }
  }
} catch {}

const found = [];

function walk(d, depth = 0) {
  if (depth > 8) return;
  let entries;
  try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === ".git") continue;
    if (e.name === "node_modules") continue;
    if (e.name === "dist" || e.name === "build") continue;
    if (e.name === ".tsbuildcache") continue;
    if (e.name === "extracted") continue;
    if (e.name === "JM DIE") continue;
    if (e.name === "Resources") continue;
    const full = path.join(d, e.name);
    if (e.isDirectory()) {
      walk(full, depth + 1);
    } else if (e.name === "memory.db" || e.name === "memory.db-wal" || e.name === "memory.db-shm" || e.name.endsWith(".sqlite") || e.name.endsWith(".sqlite3")) {
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      found.push({
        path: full.replace(/\\/g, "/"),
        name: e.name,
        bytes: stat.size,
        mtime: stat.mtime.toISOString(),
        worktree: classifyWorktree(full),
      });
    }
  }
}

function classifyWorktree(p) {
  const norm = p.replace(/\\/g, "/").toLowerCase();
  const m = norm.match(/h:\/(prism-slot-[a-z]+)\//);
  if (m) return m[1];
  if (norm.startsWith("h:/prism/")) return "prism-main";
  if (norm.startsWith("c:/users/wompu/.claude")) return "user-claude-home";
  const m2 = norm.match(/h:\/(prism-[a-z0-9-]+)\//);
  if (m2) return m2[1];
  return "other";
}

for (const root of SCAN_ROOTS) {
  walk(root);
}

const byWorktree = {};
const byName = {};
let totalBytes = 0;
for (const rec of found) {
  byWorktree[rec.worktree] = (byWorktree[rec.worktree] || 0) + 1;
  byName[rec.name] = (byName[rec.name] || 0) + 1;
  totalBytes += rec.bytes;
}

const out = {
  generated_at: new Date().toISOString(),
  unit: "P15-U01",
  milestone: "INTEL-OLLAMA-OBSIDIAN-MS0",
  advisory_only: true,
  scope_roots: SCAN_ROOTS,
  totalFiles: found.length,
  totalBytes,
  totalMb: +(totalBytes / 1_048_576).toFixed(2),
  byWorktree,
  byName,
  files: found.sort((a, b) => b.bytes - a.bytes),
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + "\n");

const md = [
  `# memory.db / SQLite Audit (P15-U01)`,
  ``,
  `**Generated:** ${out.generated_at}`,
  `**Milestone:** INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U01`,
  `**Scope roots:** ${SCAN_ROOTS.length}`,
  ``,
  `## Summary`,
  `- Total files: **${out.totalFiles}**`,
  `- Total bytes: **${out.totalBytes.toLocaleString()}** (${out.totalMb} MB)`,
  ``,
  `## By worktree`,
  ...Object.entries(byWorktree).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- **${k}**: ${v}`),
  ``,
  `## By filename`,
  ...Object.entries(byName).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- **${k}**: ${v}`),
  ``,
  `## Largest 30 files`,
  ...found.slice(0, 30).map(f => `- \`${f.path}\` (${(f.bytes / 1024).toFixed(1)} KB, mtime ${f.mtime})`),
  ``,
  `---`,
  `Advisory-only — file enumeration without opening any SQLite databases. Use this inventory to inform a CrossSessionMemoryBridge design (P15-U02) — duplicates across slot worktrees are candidates for unification.`,
].join("\n");

fs.writeFileSync(OUT_MD, md);

console.log(JSON.stringify({ ok: true, totalFiles: out.totalFiles, totalMb: out.totalMb, byWorktree, byName, outJson: OUT_JSON, outMd: OUT_MD }, null, 2));
