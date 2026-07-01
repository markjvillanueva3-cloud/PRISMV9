#!/usr/bin/env node
/**
 * query-extracted-tips.mjs
 *
 * Operational consumer for the extracted-PDF tribal-tips corpus. Any PRISM
 * engine, dispatcher, or skill can spawn this to fetch tips relevant to its
 * context — closes the "named bridge_engines but no actual consumption"
 * synergy gap flagged by the iter30 Stop hook.
 *
 * Reads `state/shared/extracted-pdfs/*.jsonl` (all extraction passes) and
 * filters by any combination of:
 *   --engine <name>     match tips whose bridge_engines[] contains <name>
 *                       (e.g. --engine ChatterStabilityLobeEngine)
 *   --audience <slot>   match tips whose audience[] contains <slot>
 *                       (e.g. --audience alpha)
 *   --domain <d>        match tips whose domain == <d>
 *                       (e.g. --domain mill)
 *   --topic <substr>    match tips whose topic includes <substr>
 *   --tip-substr <s>    match tips whose tip text includes <s> (case-insensitive)
 *   --book <substr>     match tips whose source.book includes <substr>
 *   --limit N           cap result count (default 100)
 *   --json              emit JSON instead of human-readable
 *
 * Filters compose with AND semantics. With no filters, returns all tips
 * (subject to --limit).
 *
 * Pure-fn API exported for tests + direct engine import:
 *   loadAllTips()       returns flat tips[]
 *   filterTips(tips, criteria)  pure filter
 *   formatHuman(tip)    string render
 *
 * @milestone MIT-COURSE-INTEGRATION/U-PDF-TIPS-QUERY
 * @slot india
 * @iter 31
 * @date 2026-05-25
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const TIPS_DIR = path.join(ROOT, "state/shared/extracted-pdfs");
export const SCHEMA_VERSION = "1.0.0";

/** Pure: parse one jsonl file body into tips[]. Skip malformed lines silently. */
export function parseTipsJsonl(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj.id === "string" && typeof obj.tip === "string") out.push(obj);
    } catch { /* skip */ }
  }
  return out;
}

/** Read every *.jsonl under dir, return flat tips[]. */
export function loadAllTips(dir = TIPS_DIR) {
  if (!fs.existsSync(dir)) return [];
  const tips = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith(".jsonl")) continue;
    try {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      tips.push(...parseTipsJsonl(text));
    } catch { /* skip unreadable */ }
  }
  return tips;
}

/** Pure: AND-filter tips by criteria. Empty / null criteria fields are wildcards. */
export function filterTips(tips, criteria = {}) {
  const { engine, audience, domain, topicSubstr, tipSubstr, bookSubstr } = criteria;
  const tipLower = tipSubstr ? String(tipSubstr).toLowerCase() : null;
  return tips.filter(t => {
    if (engine && !(Array.isArray(t.bridge_engines) && t.bridge_engines.some(e => e === engine || e === `engine.${engine}`))) return false;
    if (audience && !(Array.isArray(t.audience) && t.audience.includes(audience))) return false;
    if (domain && t.domain !== domain) return false;
    if (topicSubstr && !(t.topic && String(t.topic).includes(topicSubstr))) return false;
    if (tipLower && !(t.tip && String(t.tip).toLowerCase().includes(tipLower))) return false;
    if (bookSubstr && !(t.source && t.source.book && String(t.source.book).includes(bookSubstr))) return false;
    return true;
  });
}

/** Pure: human-readable single-tip render. */
export function formatHuman(tip) {
  const src = tip.source || {};
  const audience = Array.isArray(tip.audience) ? tip.audience.join(",") : "?";
  const engines = Array.isArray(tip.bridge_engines) ? tip.bridge_engines.join(", ") : "?";
  return [
    `── ${tip.id} · [${tip.domain || "?"}] · ${tip.topic || "(no-topic)"} ──`,
    tip.tip,
    `  source: ${src.book || "?"} ch${src.chapter ?? "?"} ${src.section || ""} (p.${src.pages || "?"})`,
    `  engines: ${engines}`,
    `  audience: ${audience}`,
  ].join("\n");
}

/** Pure: parse argv into criteria. */
export function parseArgs(argv) {
  const out = { limit: 100, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--engine" && argv[i + 1]) { out.engine = argv[++i]; }
    else if (a === "--audience" && argv[i + 1]) { out.audience = argv[++i]; }
    else if (a === "--domain" && argv[i + 1]) { out.domain = argv[++i]; }
    else if (a === "--topic" && argv[i + 1]) { out.topicSubstr = argv[++i]; }
    else if (a === "--tip-substr" && argv[i + 1]) { out.tipSubstr = argv[++i]; }
    else if (a === "--book" && argv[i + 1]) { out.bookSubstr = argv[++i]; }
    else if (a === "--limit" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      out.limit = Number.isFinite(n) ? Math.max(1, n) : 100;
    }
    else if (a === "--help" || a === "-h") { out.help = true; }
  }
  return out;
}

const HELP = `query-extracted-tips.mjs — fetch tribal tips from state/shared/extracted-pdfs/*.jsonl

Usage:
  node scripts/query-extracted-tips.mjs [filters] [--limit N] [--json]

Filters (AND-composed):
  --engine <Name>        match bridge_engines (Name or engine.Name)
  --audience <slot>      match audience (alpha, bravo, ..., kilo, ...)
  --domain <d>           match domain exactly (general, mill, cad, ...)
  --topic <substr>       substring match on topic
  --tip-substr <s>       case-insensitive substring on tip text
  --book <substr>        substring match on source.book

Examples:
  node scripts/query-extracted-tips.mjs --engine ChatterStabilityLobeEngine
  node scripts/query-extracted-tips.mjs --audience alpha --domain mill
  node scripts/query-extracted-tips.mjs --book "Fundamentals of CNC" --json
`;

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) { process.stdout.write(HELP); return 0; }
  const all = loadAllTips();
  const filtered = filterTips(all, args).slice(0, args.limit);
  if (args.json) {
    process.stdout.write(JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      totalAvailable: all.length,
      matched: filtered.length,
      criteria: args,
      tips: filtered,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(`Total tips available: ${all.length}\n`);
    process.stdout.write(`Matched: ${filtered.length}\n\n`);
    for (const t of filtered) process.stdout.write(formatHuman(t) + "\n\n");
  }
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
