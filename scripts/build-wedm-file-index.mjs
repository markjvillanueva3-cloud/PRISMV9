/**
 * build-wedm-file-index.mjs — track down ALL wedm-domain files → instant pathways.
 *
 * Enumerates every wire-EDM-related file on disk (engines, schemas, data, tribal,
 * wiki, state, dispatcher, routes, galaxy brain, skills, tests) into
 * mcp-server/data/state/WEDM_FILE_INDEX.json. Because it globs the live tree,
 * every path in the index is exists-VALIDATED by construction (no dead paths).
 * Companion to the curated mcp-server/src/engines/wedm/PATHS.md — this is the
 * COMPLETE machine-generated manifest. Invoke with node from the worktree root.
 * Knob PRISM_ROOT overrides the root (default = cwd). slot:mike / galaxy:wedm.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = process.env.PRISM_ROOT || process.cwd();
const OUT = join(ROOT, "mcp-server/data/state/WEDM_FILE_INDEX.json");
const SCHEMA_VERSION = "1.0.0";

// category, dir (repo-relative), filename regex. Glob is shallow per known dir.
const RULES = [
  { cat: "engine", dir: "mcp-server/src/engines", re: /^(WEDM|EDM|WireEDM|Sinker|MicroEDM).*\.ts$/, skip: /\.test\.ts$/ },
  { cat: "galaxy", dir: "mcp-server/src/engines/wedm", re: /\.md$/ },
  { cat: "schema", dir: "mcp-server/src/schemas", re: /(wedm|edm)/i },
  { cat: "data", dir: "mcp-server/src/data", re: /(wedm|edm|jm-die-wedm|wire-spec|edm-material)/i },
  { cat: "data-academy", dir: "mcp-server/src/data/academy", re: /(wedm|wire-edm)/i },
  { cat: "route", dir: "mcp-server/src/routes", re: /(edm|wedm)/i },
  { cat: "test", dir: "mcp-server/src/__tests__", re: /(WEDM|EDM|Wire).*\.test\.ts$/ },
  { cat: "tribal", dir: "knowledge/tribal", re: /^wedm-knowledge-tips-.*\.md$/ },
  { cat: "wiki-engine", dir: "knowledge/wiki/architecture/engines/wedm", re: /\.md$/ },
  { cat: "wiki-tactic", dir: "knowledge/wiki/code-tribal", re: /^wedm-.*\.md$/ },
  { cat: "state", dir: "mcp-server/data/state", re: /^WEDM_.*\.(json|jsonl)$/ },
  { cat: "skill", dir: ".claude/commands", re: /^(wedm|wire-edm).*\.md$/i },
];

const files = [];
const byCategory = {};
for (const rule of RULES) {
  const abs = join(ROOT, rule.dir);
  if (!existsSync(abs)) continue;
  let names;
  try { names = readdirSync(abs); } catch { continue; }
  for (const name of names) {
    if (!rule.re.test(name)) continue;
    if (rule.skip && rule.skip.test(name)) continue;
    const rel = rule.dir + "/" + name;
    let bytes = 0;
    try { bytes = statSync(join(ROOT, rel)).size; } catch { continue; } // exists-validated
    files.push({ category: rule.cat, path: rel, bytes });
    byCategory[rule.cat] = (byCategory[rule.cat] || 0) + 1;
  }
}

files.sort((a, b) => a.category.localeCompare(b.category) || a.path.localeCompare(b.path));
if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
const payload = {
  schemaVersion: SCHEMA_VERSION,
  note: "Complete exists-validated wedm file manifest. Curated companion: mcp-server/src/engines/wedm/PATHS.md",
  totalFiles: files.length,
  byCategory,
  files,
};
writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
console.log("WEDM_FILE_INDEX.json: " + files.length + " files -> " + OUT);
for (const c of Object.keys(byCategory).sort()) console.log("  " + c + ": " + byCategory[c]);
