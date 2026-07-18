#!/usr/bin/env node
/**
 * audit-fe-route-wiring.mjs (QUEBEC/U-WIRE-AUDIT) -- FLEET-WIDE frontend<->backend wiring auditor.
 *
 * The general sibling of audit-erp-fe-route-wiring.mjs (which is ERP / client.ts-scoped). Scans EVERY
 * web/src/api/*.ts module (calc, sfc, toolCrib, ... not just client.ts) and reports client call-sites
 * whose URL maps to NO registered Express route -- the finite dead-wire gap list for "wire the entire
 * backend to the frontend" (a deterministic loss function: N dead wires -> 0).
 *
 * Route resolution is IMPORT-anchored (robust): index.ts `import {createX} from "./f.js"` maps the
 * factory identifier to its file, and `app.use("<base>", createX(...))` maps the file to its mount base.
 * (The ERP tool guesses file<-factory by name-normalization, which FALSE-flags exportRoutes/threads/
 * shopLive as unmounted; this tool resolves them correctly via the import map.)
 *
 * LIMITS (R12 -- stated, not hidden): only string-LITERAL call-sites are checked (a computed/dynamic
 * path is skipped); recognized client patterns = get/post/put/patch/del(ete)("<path>") with a module
 * BASE_URL const, plus request("METHOD","/path"); fetchJson / raw fetch() are NOT parsed. A flagged
 * item is HIGH-confidence dead; NO flags is NOT proof of full coverage. Multi-segment `${...}` template
 * paths can still leave a residual artifact -- triage those by hand.
 *
 * Usage (run from mcp-server/): node scripts/audit-fe-route-wiring.mjs [--json]
 * Importable: `import { norm, runAudit } from "./audit-fe-route-wiring.mjs"` (no side effects on import).
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const ROUTES_DIR = "src/routes";
const API_DIR = "web/src/api";

/**
 * Collapse param segments (:x, ${...}, /123/) to a single :x token so route<->call paths compare equal.
 * A query string is NOT a path: strip a literal `?...` tail AND a `${...}` template that is glued to a
 * path segment without a leading slash (e.g. `kaizen-suggestions${qs}` is `kaizen-suggestions?...`,
 * NOT a `:x` segment). A `${...}` that forms a whole segment (after `/`, e.g. `/job/${id}`) stays `:x`.
 */
export function norm(p) {
  const noQuery = p.replace(/[?].*$/, "").replace(/(?<=[^/])\$\{[^}]*\}.*$/, "");
  return noQuery.replace(/\$\{[^}]+\}/g, ":x").replace(/\/[0-9]+(?=\/|$)/g, "/:x").replace(/:[a-zA-Z0-9_]+/g, ":x");
}

/**
 * Method + the last two path segments of a "METHOD /a/b/c" string -- the "tail" used to spot the SAME
 * endpoint mounted under a different base (a likely client base-path bug). Advisory hint, not a proof:
 * a generic tail like ".../status" can collide across bases, so a near-miss is "check this", not "fixed".
 */
export function tailOf(methPath) {
  const [meth, p = ""] = methPath.split(" ");
  const segs = p.split("/").filter(Boolean);
  return meth + " " + segs.slice(-2).join("/");
}

/**
 * Classify a dead "METHOD /path" call against the registered routes:
 *  - "dynamic"         : an unparsed ${} template survived norm (can't verify).
 *  - "method-mismatch" : the EXACT path IS registered under a different HTTP verb -> a client-verb bug
 *                        (frontend-fixable: change the client method). Precise -- not a heuristic.
 *  - "near-miss"       : same METHOD+last-2-segments registered under a different base (likely client base bug).
 *  - "no-route"        : no route matches -> a backend route is genuinely missing (owner domain).
 * Checked in this order (most specific first).
 */
export function classifyCall(call, regPaths, regTails) {
  if (call.includes("${")) return "dynamic";
  const pathOnly = call.slice(call.indexOf(" ") + 1);
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    if (regPaths.has(m + " " + pathOnly)) return "method-mismatch";
  }
  if (regTails.has(tailOf(call))) return "near-miss";
  return "no-route";
}

/** Build the report object (pure-ish: reads the repo, returns counts + dead-wire list). */
export function runAudit() {
  if (!existsSync(ROUTES_DIR) || !existsSync(API_DIR)) {
    console.error(`[audit-fe-route-wiring] run from mcp-server/ -- missing ${ROUTES_DIR} or ${API_DIR}`);
    process.exit(2);
  }

  const indexSrc = readFileSync(join(ROUTES_DIR, "index.ts"), "utf8");

  // 1) import map: route-factory identifier -> source file (named + default imports of ./*.js)
  const idToFile = {};
  for (const m of indexSrc.matchAll(/import\s+\{([^}]+)\}\s+from\s+["'`]\.\/([\w-]+)\.js["'`]/g)) {
    const file = m[2] + ".ts";
    for (const raw of m[1].split(",")) {
      const id = raw.trim().split(/\s+as\s+/)[0].trim();
      if (id) idToFile[id] = file;
    }
  }
  for (const m of indexSrc.matchAll(/import\s+([a-zA-Z0-9_]+)\s+from\s+["'`]\.\/([\w-]+)\.js["'`]/g)) {
    idToFile[m[1]] = m[2] + ".ts";
  }

  // 2) mounts: app.use("<base>", <identifier>...) -> file accrues its base(s)
  const fileBases = {};
  for (const m of indexSrc.matchAll(/\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*([a-zA-Z0-9_]+)\s*[(),]/g)) {
    const file = idToFile[m[2]];
    if (file) (fileBases[file] ||= new Set()).add(m[1]);
  }

  // 3) registered route paths (METHOD norm(base+suffix)) + tails (METHOD last-2-segments) for near-miss
  const regPaths = new Set();
  const regTails = new Set();
  const routeFiles = readdirSync(ROUTES_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  for (const f of routeFiles) {
    const bases = fileBases[f];
    if (!bases) continue;
    const src = readFileSync(join(ROUTES_DIR, f), "utf8");
    for (const m of src.matchAll(/\brouter\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`](\/[^"'`]*)["'`]/g)) {
      const meth = m[1].toUpperCase();
      for (const base of bases) {
        const reg = meth + " " + norm((base + m[2]).replace(/\/+/g, "/").split("?")[0]);
        regPaths.add(reg);
        regTails.add(tailOf(reg));
      }
    }
  }

  // 3b) routes declared INLINE in index.ts (app.post("/api/v1/...")) -- not inside a route file. The
  // step-3 router scan misses these, so they would FALSE-flag as dead (e.g. POST /api/v1/alarm-decode).
  for (const m of indexSrc.matchAll(/\bapp\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`](\/api\/[^"'`]+)["'`]/g)) {
    const reg = m[1].toUpperCase() + " " + norm(m[2].split("?")[0]);
    regPaths.add(reg);
    regTails.add(tailOf(reg));
  }

  // 4) scan every api module for dead call-sites
  const apiFiles = readdirSync(API_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  const dead = [];
  let scanned = 0;
  for (const f of apiFiles) {
    const src = readFileSync(join(API_DIR, f), "utf8");
    const baseM = src.match(/const\s+(?:BASE_URL|API_BASE|BASE)\s*=\s*["'`]([^"'`]+)["'`]/);
    const base = baseM ? baseM[1] : "/api/v1";
    for (const m of src.matchAll(/(?:\b|\.)(get|post|put|patch|del|delete)\s*(?:<[^>]*>)?\(\s*["'`](\/[^"'`]*)["'`]/g)) {
      const meth = m[1].toUpperCase() === "DEL" ? "DELETE" : m[1].toUpperCase();
      scanned++;
      const tmpl = meth + " " + norm((base + m[2]).replace(/\/+/g, "/").split("?")[0]);
      if (!regPaths.has(tmpl)) dead.push({ module: f, call: tmpl });
    }
    for (const m of src.matchAll(/\brequest(?:<[^>]*>)?\(\s*["'`](GET|POST|PUT|DELETE|PATCH)["'`]\s*,\s*["'`]([^"'`]+)["'`]/g)) {
      const full = m[2].startsWith("/api") ? m[2] : "/api/v1" + m[2];
      scanned++;
      const tmpl = m[1] + " " + norm(full.split("?")[0]);
      if (!regPaths.has(tmpl)) dead.push({ module: f, call: tmpl });
    }
  }

  // Classify each dead wire so the gap list is ACTIONABLE (bucket rules in classifyCall): method-mismatch
  // + near-miss are frontend-fixable (client verb/base bug); no-route is a missing backend route.
  const buckets = { dynamic: [], "method-mismatch": [], "near-miss": [], "no-route": [] };
  for (const d of dead) buckets[classifyCall(d.call, regPaths, regTails)].push(d);

  return {
    schemaVersion: "1.2.0",
    registeredPaths: regPaths.size,
    apiModules: apiFiles.length,
    apiCallsScanned: scanned,
    deadWireCount: dead.length,
    noRouteCount: buckets["no-route"].length,
    methodMismatchCount: buckets["method-mismatch"].length,
    nearMissCount: buckets["near-miss"].length,
    dynamicCount: buckets.dynamic.length,
    noRoute: buckets["no-route"],
    methodMismatch: buckets["method-mismatch"],
    nearMiss: buckets["near-miss"],
    dynamic: buckets.dynamic,
    deadWires: dead,
  };
}

function main() {
  const report = runAudit();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(
    `[audit-fe-route-wiring] ${report.registeredPaths} routes; ${report.apiCallsScanned} call-sites/${report.apiModules} modules; ` +
      `${report.deadWireCount} dead = ${report.noRouteCount} no-route + ${report.methodMismatchCount} method-mismatch + ${report.nearMissCount} near-miss + ${report.dynamicCount} dynamic`,
  );
  const dump = (label, list) => {
    if (!list.length) return;
    console.log(`\n${label} (${list.length}):`);
    const byMod = {};
    for (const d of list) (byMod[d.module] ||= []).push(d.call);
    for (const mod of Object.keys(byMod).sort()) {
      console.log(`  ${mod} (${byMod[mod].length}):`);
      for (const c of byMod[mod]) console.log(`    - ${c}`);
    }
  };
  dump("METHOD-MISMATCH -- route exists under a different verb (frontend-fixable: change the client method)", report.methodMismatch);
  dump("NO-ROUTE -- backend route genuinely missing (fix in the owner domain)", report.noRoute);
  dump("NEAR-MISS -- same endpoint exists under another base (likely client path bug, frontend-fixable)", report.nearMiss);
  dump("DYNAMIC -- unparsed ${} template, triage by hand", report.dynamic);
  if (!report.deadWireCount) console.log("  (none -- every literal api call-site maps to a registered route)");
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
