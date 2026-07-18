#!/usr/bin/env node
/**
 * content-index-query.mjs
 *
 * SIERRA-VAULT-OPS / U-CONTENT-INDEX-QUERY.
 *
 * Fast STREAMING search over content-index.jsonl (the 1.34M-file corpus index
 * from build-content-summary-index.mjs). Streams line-by-line with readline, so
 * it is immune to the 512MB V8 string limit that blocks whole-file JSON.parse at
 * corpus scale, and it never holds the 400MB index in memory.
 *
 * The "quicker searches" surface the index was built for: filter by role/domain/
 * source + AND-match free-text terms against path/note/summary. Importable
 * (queryContentIndex) so a prism_session:content_query dispatcher action can wrap it.
 *
 * Usage:
 *   node scripts/content-index-query.mjs kienzle taylor            # AND terms, any field
 *   node scripts/content-index-query.mjs electrode --role=engine   # + role filter
 *   node scripts/content-index-query.mjs --domain=cad --count      # counts only
 *   node scripts/content-index-query.mjs g71 --field=summary --limit=20 --json
 *   node scripts/content-index-query.mjs --source=JM --count       # per-role histogram
 *
 * Flags:
 *   <terms...>        free-text terms, ALL must match (case-insensitive)
 *   --role=R          exact role (engine/code/wiki/memory/data/cad/...)
 *   --domain=D        exact domain (mill/cad/jm-die/cross/...)
 *   --source=S        substring match on the source root
 *   --field=F         where terms match: path|note|summary|all (default all)
 *   --limit=N         max rows to show (default 40; ignored with --count)
 *   --count           print only the total + per-role histogram
 *   --json            emit matched rows as JSONL
 *   --jsonl=PATH      index path (default state/shared/content-index/content-index.jsonl)
 *
 * Exit: 0 (matches or clean no-match) - 1 (index missing) - 2 (bad args)
 * @milestone SIERRA-VAULT-OPS/U-CONTENT-INDEX-QUERY
 */

import fs from "node:fs";
import rl from "node:readline";
import { pathToFileURL } from "node:url";

const DEFAULT_JSONL = "H:/prism/state/shared/content-index/content-index.jsonl";
const DEFAULT_LIMIT = 40;

export function parseArgs(argv) {
  const o = { terms: [], role: null, domain: null, source: null, field: "all", limit: DEFAULT_LIMIT, count: false, json: false, jsonl: DEFAULT_JSONL };
  for (const a of argv) {
    if (a.startsWith("--role=")) o.role = a.slice(7).toLowerCase();
    else if (a.startsWith("--domain=")) o.domain = a.slice(9).toLowerCase();
    else if (a.startsWith("--source=")) o.source = a.slice(9).toLowerCase();
    else if (a.startsWith("--field=")) o.field = a.slice(8).toLowerCase();
    else if (a.startsWith("--limit=")) o.limit = Math.max(1, Math.floor(Number(a.slice(8)) || DEFAULT_LIMIT));
    else if (a === "--count") o.count = true;
    else if (a === "--json") o.json = true;
    else if (a.startsWith("--jsonl=")) o.jsonl = a.slice(8);
    else if (a === "--help" || a === "-h") { o.help = true; }
    else if (a.startsWith("--")) { o.badArg = a; }
    else o.terms.push(a.toLowerCase());
  }
  return o;
}

function haystack(row, field) {
  if (field === "path") return row.path || "";
  if (field === "note") return row.note || "";
  if (field === "summary") return row.summary || "";
  return `${row.path || ""} ${row.note || ""} ${row.summary || ""}`;
}

function matches(row, o) {
  if (o.role && (row.role || "").toLowerCase() !== o.role) return false;
  if (o.domain && (row.domain || "").toLowerCase() !== o.domain) return false;
  if (o.source && !(row.source || "").toLowerCase().includes(o.source)) return false;
  if (o.terms.length) {
    const h = haystack(row, o.field).toLowerCase();
    for (const t of o.terms) if (!h.includes(t)) return false;
  }
  return true;
}

/**
 * Stream the index and invoke onMatch(row) for each hit. Resolves with
 * {total, shown, byRole}. Stops feeding onMatch once `limit` is reached (unless
 * countOnly), but always finishes the stream to report an accurate total.
 */
export function queryContentIndex(opts, onMatch) {
  const o = { field: "all", terms: [], limit: DEFAULT_LIMIT, ...opts };
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(o.jsonl)) { reject(new Error(`index not found: ${o.jsonl}`)); return; }
    let total = 0, shown = 0;
    const byRole = {};
    const stream = fs.createReadStream(o.jsonl);
    const r = rl.createInterface({ input: stream, crlfDelay: Infinity });
    r.on("line", (line) => {
      if (!line) return;
      // Cheap raw pre-filter BEFORE the expensive JSON.parse (1.34M lines). Over-
      // inclusive (a term may hit a field we aren't searching); the precise
      // matches() below filters those out. Cuts a full-scan query from ~30s to a
      // few seconds because JSON.parse runs only on candidate lines.
      const low = line.toLowerCase();
      for (const t of o.terms) if (!low.includes(t)) return;
      if (o.role && !low.includes(`"role":"${o.role}"`)) return;
      if (o.domain && !low.includes(`"domain":"${o.domain}"`)) return;
      let row;
      try { row = JSON.parse(line); } catch { return; }
      if (!matches(row, o)) return;
      total++;
      byRole[row.role] = (byRole[row.role] || 0) + 1;
      if (!o.countOnly && shown < o.limit) { onMatch(row); shown++; }
    });
    r.on("close", () => resolve({ total, shown, byRole }));
    r.on("error", reject);
    stream.on("error", reject);
  });
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { process.stdout.write("See header for usage.\n"); return; }
  if (o.badArg) { process.stderr.write(`Unknown flag: ${o.badArg}\n`); process.exit(2); }
  if (!["all", "path", "note", "summary"].includes(o.field)) { process.stderr.write(`Bad --field: ${o.field}\n`); process.exit(2); }
  o.countOnly = o.count;

  const out = [];
  let res;
  try {
    res = await queryContentIndex(o, (row) => {
      if (o.json) out.push(JSON.stringify(row));
      else out.push(`[${row.role}/${row.domain}] ${row.source}/${row.path}\n    ${row.summary || row.note}`);
    });
  } catch (e) { process.stderr.write(`${e.message}\n`); process.exit(1); }

  if (o.count) {
    process.stdout.write(`total matches: ${res.total}\n`);
    for (const [role, n] of Object.entries(res.byRole).sort((a, b) => b[1] - a[1])) {
      process.stdout.write(`  ${String(n).padStart(7)}  ${role}\n`);
    }
  } else {
    process.stdout.write(out.join("\n") + (out.length ? "\n" : ""));
    process.stdout.write(`\n-- ${res.shown} shown of ${res.total} matches --\n`);
  }
}

// Run as a CLI only when executed directly -- not when imported by a test or a
// prism_session:content_query dispatcher wrapper.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main().catch(e => { process.stderr.write(`FATAL: ${e.stack || e}\n`); process.exit(1); });
