#!/usr/bin/env node
/**
 * Orphan File Audit — PRISM WORKTREE-CONSOLIDATE-MS0 / U-FND03
 *
 * Enumerates orphan engine files in src/engines/:
 *   - .js files that have a sibling .ts (the .js is stale leftover)
 *   - Files matching *-1 (numeric duplication suffix)
 *   - Files with no extension (truncated rename leftover, e.g. *Engi-1)
 *
 * For each finding, runs a literal grep to count incoming references.
 * Outputs JSON to state/shared/ORPHAN-AUDIT-2026-05-06.json.
 *
 * Read-only: never modifies anything. Consumed by P6 (U-DDP01) for safe deletion.
 */

import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, basename } from "node:path";
import { exit } from "node:process";

const ENGINES_DIR = "H:/PRISM/mcp-server/src/engines";
const SEARCH_ROOT = "H:/PRISM/mcp-server/src";
const OUTPUT = "H:/PRISM/state/shared/ORPHAN-AUDIT-2026-05-06.json";

const findings = [];

let entries;
try {
  entries = readdirSync(ENGINES_DIR);
} catch (e) {
  console.error(`ERROR: cannot read ${ENGINES_DIR}: ${e.message}`);
  exit(2);
}

const tsSet = new Set(entries.filter(n => n.endsWith(".ts")).map(n => n.slice(0, -3)));

for (const name of entries) {
  const full = join(ENGINES_DIR, name);
  let st;
  try { st = statSync(full); } catch { continue; }
  if (!st.isFile()) continue;

  let type = null;
  if (name.endsWith(".js")) {
    const stem = name.slice(0, -3);
    if (tsSet.has(stem)) {
      type = "js_ts_pair";
    }
  } else if (name.endsWith(".ts-1")) {
    type = "numeric_orphan_ts";
  } else if (/-1$/.test(name) && !name.endsWith(".ts") && !name.endsWith(".js")) {
    type = "truncated_orphan";
  } else if (!name.includes(".") && /Engi$|Engin$/.test(name)) {
    type = "truncated_orphan";
  } else if (/Engi-1$/.test(name) || /Engin-1$/.test(name)) {
    type = "truncated_orphan";
  }

  if (!type) continue;

  // Run a literal grep for the filename across src/ to count references
  const refs = countReferences(name);

  findings.push({
    path: full.replace(/\\/g, "/"),
    name,
    type,
    referenced_in: refs.files,
    reference_count: refs.count,
    safe_to_delete: refs.count === 0,
  });
}

function countReferences(filename) {
  // Search the literal full filename (-F = fixed string, no regex). For NodeNext
  // .ts sources, imports use ".js" extension so .js orphans only match files that
  // explicitly import the .js path; canonical imports resolve to .ts via NodeNext.
  const r = spawnSync(
    "git",
    ["-C", "H:/PRISM", "grep", "-l", "-F", filename, "--", "mcp-server/src"],
    { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
  );
  if (r.status !== 0 && r.status !== 1) {
    return { count: -1, files: ["<grep-error>"] };
  }
  const files = (r.stdout || "")
    .split("\n")
    .filter(Boolean)
    .filter(f => basename(f) !== filename); // exclude the file matching itself
  return { count: files.length, files: files.slice(0, 10) };
}

mkdirSync("H:/PRISM/state/shared", { recursive: true });

const output = {
  schemaVersion: "1.0.0",
  generated_at: new Date().toISOString(),
  source: "mcp-server/scripts/orphan-file-audit.mjs",
  engines_dir: ENGINES_DIR,
  total_findings: findings.length,
  by_type: findings.reduce((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {}),
  findings,
};

writeFileSync(OUTPUT, JSON.stringify(output, null, 2), "utf-8");

console.log(`Orphan audit complete: ${findings.length} findings`);
console.log(`  by_type: ${JSON.stringify(output.by_type)}`);
console.log(`  output:  ${OUTPUT}`);
console.log(`  safe_to_delete: ${findings.filter(f => f.safe_to_delete).length}`);
console.log(`  has_references: ${findings.filter(f => f.reference_count > 0).length}`);

exit(0);
