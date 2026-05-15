#!/usr/bin/env node
/**
 * generate-dispatcher-digest.mjs
 * =============================
 * Auto-generates mcp-server/data/docs/DISPATCHER_DIGEST.md from the live
 * dispatcher .ts files. Closes the second half of CLAUDE.md regression
 * `U-HVA-DIGEST-PARSER-FIX`: the digest has been MANUALLY maintained until
 * now, so it rots within days. This script replaces the human-edit cycle.
 *
 * Reuses the same `countActionsInFile()` patterns shipped in iter 2 of
 * /loop session 6d0595bf:
 *   1. switch/case "x":                       — standard switch dispatch
 *   2. const X_ACTIONS = new Set([...])       — Set-based registries
 *   3. const X_ACTIONS = [...] as const       — array-based registries
 *   4. const ACTION_MAP|HANDLER_MAP|... = {}  — handler-map dispatch
 *
 * Extracts dispatcher metadata from each .ts file:
 *   - Name           — filename without .ts
 *   - Tool name      — `server.tool("prism_X", ...)` first arg
 *   - Description    — `server.tool(..., "DESC", ...)` second arg (truncated to 60 chars)
 *   - Action count   — union of all 4 patterns above
 *
 * Output format mirrors the manually-maintained DISPATCHER_DIGEST.md exactly:
 *   - Header with total count + auto-generation banner
 *   - ## Dispatcher Map section with | Dispatcher | Domain | Actions | table
 *   - Sorted alphabetically by dispatcher filename
 *
 * Usage:
 *   node scripts/generate-dispatcher-digest.mjs                # write to standard location
 *   node scripts/generate-dispatcher-digest.mjs --dry-run      # print to stdout, no write
 *   node scripts/generate-dispatcher-digest.mjs --output PATH  # custom output path
 *   node scripts/generate-dispatcher-digest.mjs --json         # machine-readable summary
 *
 * Author: claude-6d0595bf (slot bravo/delta) 2026-05-15, iter 6 of /loop session 6d0595bf-r2
 * Tracks: U-HVA-DIGEST-PARSER-FIX (CLAUDE.md regression 2026-05-14, second half)
 * Related: scripts/high-value-additions-rank.mjs (countActionsInFile origin),
 *          scripts/validate-unwired-signal.mjs (companion sister script),
 *          scripts/validate-hook-orphan-signal.mjs (companion sister script).
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const DEFAULT_OUTPUT = path.join(ROOT, "mcp-server", "data", "docs", "DISPATCHER_DIGEST.md");
const DOMAIN_DESCRIPTION_TRUNC = 60;

// ---------- CLI ----------

function parseArgs(argv) {
  const args = { dryRun: false, output: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--output") args.output = argv[++i];
    else if (a === "--json") args.json = true;
    else if (a === "-h" || a === "--help") {
      console.log("Usage: node generate-dispatcher-digest.mjs [--dry-run] [--output PATH] [--json]");
      process.exit(0);
    } else if (a.startsWith("--")) {
      console.error(`unknown flag: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

// ---------- IO ----------

function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }
function statSafe(p) { try { return fs.statSync(p); } catch { return null; } }

// ---------- countActionsInFile — same 4 patterns as HVA iter 2 ----------

function countActionsInFile(content) {
  const actions = new Set();
  // 1. switch/case actions
  for (const m of content.matchAll(/case\s+["']([\w-]+)["']\s*:/g)) actions.add(m[1]);
  // 2. const <X>ACTIONS = new Set([...])
  for (const m of content.matchAll(/const\s+\w*ACTIONS\w*\s*=\s*new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const s of (m[1].match(/["']([\w-]+)["']/g) || [])) actions.add(s.slice(1, -1));
  }
  // 3. const <X>ACTIONS = [...] as const (skip aggregate spread registries — counted via #2 or non-spread #3)
  for (const m of content.matchAll(/const\s+\w*ACTIONS\w*\s*=\s*\[([\s\S]*?)\]\s*as\s+const/g)) {
    if (m[1].includes("...")) continue;
    for (const s of (m[1].match(/["']([\w-]+)["']/g) || [])) actions.add(s.slice(1, -1));
  }
  // 4. const ACTION_MAP|HANDLER_MAP|HANDLERS|DISPATCH_MAP = { key: ... }
  //    Tolerates TS type annotation between var name and `=`.
  for (const m of content.matchAll(/const\s+(?:ACTION_MAP|HANDLER_MAP|HANDLERS|DISPATCH_MAP)\s*(?::[^=]+)?=\s*\{([\s\S]*?)\}\s*(?:as\s+const)?\s*;/g)) {
    for (const s of (m[1].match(/["']([\w-]+)["']\s*:/g) || [])) {
      const key = s.match(/["']([\w-]+)["']/)[1];
      actions.add(key);
    }
    for (const s of (m[1].match(/^\s*([a-z][\w_]*)\s*:/gm) || [])) {
      const key = s.match(/([a-z][\w_]*)/)[1];
      actions.add(key);
    }
  }
  return actions.size;
}

// ---------- extract dispatcher metadata ----------

function extractDispatcherMeta(content, fileName) {
  const meta = { name: fileName.replace(/\.ts$/, ""), toolName: null, description: null };
  // Match `server.tool("prism_X", `...DESC...`, ...)` — supports template literals (backticks) + regular quotes
  // Use a multi-strategy approach because TS dispatchers vary:
  //   strategy 1: server.tool("name", "desc", ... )            — quoted strings
  //   strategy 2: server.tool("name", `desc`, ... )            — template literal description
  //   strategy 3: server.tool(\n  "name",\n  `desc`, ... )     — multiline form
  // The description may span multiple lines; we capture up to the first quote/backtick close that isn't escaped.
  const patterns = [
    /server\.tool\(\s*["']([\w_]+)["']\s*,\s*`([^`]*)`/m,
    /server\.tool\(\s*["']([\w_]+)["']\s*,\s*"((?:\\"|[^"])*)"/m,
    /server\.tool\(\s*["']([\w_]+)["']\s*,\s*'((?:\\'|[^'])*)'/m,
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) {
      meta.toolName = m[1];
      meta.description = m[2].trim().replace(/\s+/g, " ");
      break;
    }
  }
  return meta;
}

// ---------- generate digest ----------

function generateDigest(dispatchers, totalActions) {
  const lines = [];
  const now = new Date().toISOString().slice(0, 10);
  lines.push("# PRISM Dispatcher Digest");
  lines.push("");
  lines.push(`**${dispatchers.length} dispatchers** route MCP actions to engines.`);
  lines.push("Each dispatcher handles a specific manufacturing/system domain.");
  lines.push(`Auto-generated: ${now} (by \`scripts/generate-dispatcher-digest.mjs\` — re-run after dispatcher edits).`);
  lines.push(`Total actions across all dispatchers: **${totalActions}**.`);
  lines.push("");
  lines.push("## Dispatcher Map");
  lines.push("");
  lines.push("| Dispatcher | Domain | Actions |");
  lines.push("|-----------|--------|---------|");
  for (const d of dispatchers) {
    const domain = d.toolName && d.description
      ? `${d.toolName} — ${truncate(d.description, DOMAIN_DESCRIPTION_TRUNC)}`
      : (d.toolName || "(no server.tool found)");
    lines.push(`| ${d.name} | ${domain} | ${d.actions} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

// ---------- main ----------

function main() {
  const args = parseArgs(process.argv);
  if (!statSafe(DISPATCHERS_DIR)) {
    console.error(`dispatchers dir not found at ${DISPATCHERS_DIR}`);
    process.exit(2);
  }
  const files = fs.readdirSync(DISPATCHERS_DIR)
    .filter(f => f.endsWith(".ts") && !f.includes(".test."))
    .sort();
  const dispatchers = [];
  let totalActions = 0;
  for (const f of files) {
    const content = readSafe(path.join(DISPATCHERS_DIR, f));
    const meta = extractDispatcherMeta(content, f);
    const actions = countActionsInFile(content);
    totalActions += actions;
    dispatchers.push({ name: meta.name, toolName: meta.toolName, description: meta.description, actions });
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({
      schemaVersion: "1.0.0",
      generated: new Date().toISOString(),
      generatedBy: "scripts/generate-dispatcher-digest.mjs",
      totalDispatchers: dispatchers.length,
      totalActions,
      dispatchers,
    }, null, 2) + "\n");
    return;
  }

  const digest = generateDigest(dispatchers, totalActions);

  if (args.dryRun) {
    process.stdout.write(digest);
    return;
  }

  const outPath = args.output || DEFAULT_OUTPUT;
  const abs = path.resolve(outPath);
  if (!abs.startsWith(path.resolve(ROOT))) {
    console.error(`--output must be inside ${ROOT}: ${outPath}`);
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, digest);
  console.log(`[generate-dispatcher-digest] wrote ${path.relative(ROOT, abs)}`);
  console.log(`  ${dispatchers.length} dispatchers, ${totalActions} total actions`);
}

const isCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return import.meta.url === url.pathToFileURL(process.argv[1]).href;
  } catch { return false; }
})();

if (isCli) {
  try { main(); } catch (e) {
    console.error(`fatal: ${e.message}`);
    console.error(e.stack);
    process.exit(2);
  }
}

export {
  parseArgs,
  countActionsInFile,
  extractDispatcherMeta,
  generateDigest,
  truncate,
  DOMAIN_DESCRIPTION_TRUNC,
};
