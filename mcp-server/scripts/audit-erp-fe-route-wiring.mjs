#!/usr/bin/env node
/**
 * audit-erp-fe-route-wiring.mjs -- the business/ERP front-end <-> back-end wiring auditor.
 *
 * For the operator directive "back end fully wired to the front end build": this script enumerates the
 * FULL surface deterministically (no sampling) and reports:
 *   1. every registered backend route (method + mounted path) across src/routes/*.ts
 *   2. every web/src/api/client.ts request() call (method + /api/v1/... path)
 *   3. DEAD client calls -- an ERP/business client fn whose path is NOT backed by a registered route
 *   4. raw fetch('/api/v1/...') calls in business/ERP pages that bypass the typed client (no auth header)
 *
 * Read-only. Prints a JSON summary. Run: node scripts/audit-erp-fe-route-wiring.mjs [--json]
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const ROUTES_DIR = "src/routes";
const PAGES_DIR = "web/src/pages";
const CLIENT = "web/src/api/client.ts";
const ERP_RE = /\/(erp|business|hotel-portal|inbox|integrations)\b/;

function norm(p) {
  return p.replace(/\$\{[^}]+\}/g, ":x").replace(/\/[0-9]+(?=\/|$)/g, "/:x").replace(/:[a-zA-Z0-9_]+/g, ":x");
}

// 1) registered backend routes -------------------------------------------------
const routeFiles = readdirSync(ROUTES_DIR).filter((f) => f.endsWith(".ts"));
const routeDefs = [];
for (const f of routeFiles) {
  const src = readFileSync(join(ROUTES_DIR, f), "utf8");
  const re = /router\.(get|post|put|delete|patch)\(\s*[`'"]([^`'"]+)[`'"]/g;
  let m;
  while ((m = re.exec(src))) routeDefs.push({ file: f, method: m[1].toUpperCase(), suffix: m[2] });
}
const indexSrc = readFileSync(join(ROUTES_DIR, "index.ts"), "utf8");
const mounts = [];
{
  const re = /\.use\(\s*[`'"]([^`'"]+)[`'"]\s*,\s*([a-zA-Z0-9_]+)\s*\(/g;
  let m;
  while ((m = re.exec(indexSrc))) mounts.push({ base: m[1], factory: m[2] });
}
function fileForFactory(fac) {
  const core = fac.replace(/^create/, "").replace(/Router$/, "").toLowerCase();
  return routeFiles.find((rf) => rf.toLowerCase().replace(".ts", "").replace(/[-_]/g, "") === core) || null;
}
const fileBase = {};
for (const { base, factory } of mounts) {
  const f = fileForFactory(factory);
  if (f) fileBase[f] = base;
}
const regPaths = new Set();
for (const rd of routeDefs) {
  const base = fileBase[rd.file];
  if (base) regPaths.add(rd.method + " " + norm((base + rd.suffix).replace(/\/+/g, "/")));
}
const unmounted = routeFiles.filter((f) => !fileBase[f] && routeDefs.some((r) => r.file === f));

// 2) client.ts request() calls -------------------------------------------------
const csrc = readFileSync(CLIENT, "utf8");
const creq = /request(?:<[^>]*>)?\(\s*[`'"](GET|POST|PUT|DELETE|PATCH)[`'"]\s*,\s*[`'"]([^`'"]+)[`'"]/g;
let cm;
const clientCalls = new Set();
while ((cm = creq.exec(csrc))) clientCalls.add(cm[1] + " /api/v1" + cm[2].split("?")[0]);

// 3) dead ERP/business client calls -------------------------------------------
const deadClient = [];
for (const k of clientCalls) {
  const [meth, p] = k.split(" ");
  if (!ERP_RE.test(p)) continue;
  const tmpl = meth + " " + norm(p);
  if (![...regPaths].some((r) => r === tmpl)) deadClient.push(tmpl);
}

// 4) raw fetch in business pages ----------------------------------------------
const pageFiles = readdirSync(PAGES_DIR).filter((f) => f.endsWith(".tsx"));
const rawFetch = [];
for (const pf of pageFiles) {
  const src = readFileSync(join(PAGES_DIR, pf), "utf8");
  const re = /fetch\(\s*[`'"](\/api\/v1\/[^`'"?]+)/g;
  let m;
  while ((m = re.exec(src))) if (ERP_RE.test(m[1])) rawFetch.push(pf + " -> " + m[1]);
}

const summary = {
  routeFiles: routeFiles.length,
  routeDefs: routeDefs.length,
  mountedFiles: Object.keys(fileBase).length,
  registeredPaths: regPaths.size,
  unmountedRouteFiles: unmounted,
  clientCalls: clientCalls.size,
  deadClientCalls: deadClient,
  rawFetchInBusinessPages: rawFetch,
};
console.log(JSON.stringify(summary, null, 2));
