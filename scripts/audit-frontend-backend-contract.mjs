/**
 * audit-frontend-backend-contract.mjs
 * [BACKEND-FRONTEND]/U-CONTRACT-AUDIT (slot:romeo, operator goal 2026-06-18: backend -> enable frontend focus).
 *
 * The web SPA (mcp-server/web/src, Vite/React) calls `/api/*` endpoints that nginx/vite proxy to the
 * Express backend-for-frontend (`mcp-server/src/routes/index.ts registerRoutes()` mounting domain
 * routers -> callTool -> MCP dispatchers). A SPA `/api/<domain>` call with NO matching backend mount is a
 * frontend feature that 404s -> a frontend-blocking backend gap. This produces the DEFINITIVE per-domain
 * readiness map.
 *
 * REACHABILITY (U-CONTRACT-REACHABILITY, slot:quebec 2026-06-26): a prefix-level gap is only URGENT if a
 * LIVE (routed-reachable) SPA file calls it. A gap referenced ONLY by orphan files -- a page not routed in
 * App.tsx, or an api client imported by no routed page -- is DEAD CODE, not a frontend-blocking gap. Without
 * this split the auditor over-reports (verified 2026-06-26: all 3 then-current gaps -- /api/dispatch,
 * /api/prism, /api/v1/ai -- were orphan dead-code: latheAI.ts imported by no page, both LathePrintToProgram
 * pages unrouted, lathe_ultra_ and post_ai_ actions on no dispatcher). Same blind-spot family as the page-wiring
 * auditor's child/context fix ([[reference_quebec_pagewire_transitive_2026_06_26]]). Reachability = the
 * import closure of App.tsx's routed page files.
 *
 * R12 SCOPE (conservative): matches at the MOUNT-PREFIX level (`/api/v1/<domain>` or `/api/<domain>`), NOT
 * per-endpoint. Confirm a flagged LIVE gap is a real fetch (vs a type/doc string) before building.
 *
 * Run: node scripts/audit-frontend-backend-contract.mjs [--json]
 * Out: state/shared/FRONTEND-BACKEND-CONTRACT-AUDIT.json
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_SRC = "H:/prism/mcp-server/web/src";
const PAGES_DIR = join(WEB_SRC, "pages");
const APP_TSX = join(WEB_SRC, "App.tsx");
const ROUTES = "H:/prism/mcp-server/src/routes/index.ts";
const ROUTES_DIR = "H:/prism/mcp-server/src/routes";
const OUT = "H:/prism/state/shared/FRONTEND-BACKEND-CONTRACT-AUDIT.json";

// ---------------------------------------------------------------------------
// Pure, exported helpers (unit-tested in audit-frontend-backend-contract.test.mjs)
// ---------------------------------------------------------------------------

/** Normalize an /api path to mount granularity: /api/v1/<d>, /api/mcp/<d>, or /api/<d>. */
export function prefixOf(apiPath) {
  const m = apiPath.match(/^\/api\/(v1|mcp)\/([a-z0-9_-]+)/) || apiPath.match(/^\/api\/([a-z0-9_-]+)/);
  if (!m) return null;
  return m[2] ? `/api/${m[1]}/${m[2]}` : `/api/${m[1]}`;
}

/** Relative ('./' or '../') import/export specifiers in a module's source. */
export function relativeImports(src) {
  return [...src.matchAll(/(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]+)['"]/g)].map((m) => m[1]);
}

/**
 * Page files imported by App.tsx from ./pages/ (static or lazy). A page App.tsx imports is
 * (virtually always) routed; one it does not import is unreachable. Returns a Set of basenames.
 */
export function routedPageBasenames(appSrc) {
  const out = new Set();
  for (const m of appSrc.matchAll(/['"][^'"]*\/pages\/([A-Za-z0-9_-]+)['"]/g)) out.add(m[1] + ".tsx");
  return out;
}

/**
 * A referencing SPA file is reachable if it is a routed page OR is in the import closure of the
 * routed pages. `reachableSet` is that closure (absolute paths). Returns 'live' | 'orphan'.
 */
export function classifyGap(referencingFiles, reachableSet) {
  const live = referencingFiles.some((f) => reachableSet.has(f));
  return live ? "live" : "orphan";
}

// ---------------------------------------------------------------------------
// FS helpers
// ---------------------------------------------------------------------------

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules") continue;
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(e)) acc.push(p);
  }
  return acc;
}

const EXTS = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];
/** Resolve a relative import from `fromFile` to an existing source file under WEB_SRC, else null. */
function resolveImport(fromFile, spec, root) {
  const target = resolve(dirname(fromFile), spec);
  if (!target.startsWith(root)) return null;
  for (const ext of EXTS) {
    const p = target + ext;
    try { if (existsSync(p) && statSync(p).isFile()) return p; } catch { /* skip */ }
  }
  return null;
}

/**
 * Build the import closure (reachable file set) starting from App.tsx's routed pages.
 * Seeds = App.tsx itself + every routed page file; BFS their relative imports.
 */
function buildReachableSet(appSrc, root) {
  const reachable = new Set();
  const queue = [APP_TSX];
  const routed = routedPageBasenames(appSrc);
  for (const base of routed) {
    const p = join(PAGES_DIR, base);
    if (existsSync(p)) queue.push(p);
  }
  while (queue.length) {
    const file = queue.shift();
    if (reachable.has(file)) continue;
    reachable.add(file);
    let src; try { src = readFileSync(file, "utf8"); } catch { continue; }
    for (const spec of relativeImports(src)) {
      const r = resolveImport(file, spec, root);
      if (r && !reachable.has(r)) queue.push(r);
    }
  }
  return reachable;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export function main() {
  if (!existsSync(WEB_SRC) || !existsSync(ROUTES)) { console.error("FATAL: web/src or routes/index.ts missing"); process.exit(1); }
  const JSON_ONLY = process.argv.includes("--json");
  const root = resolve(WEB_SRC);

  // 1. SPA-called /api/* prefixes -> the set of files that reference each.
  const spaRefs = new Map(); // prefix -> Set<absFile>
  for (const f of walk(WEB_SRC)) {
    let src; try { src = readFileSync(f, "utf8"); } catch { continue; }
    const seen = new Set();
    for (const m of src.matchAll(/['"`](\/api\/[a-z0-9_/-]+)['"`]/g)) {
      const pre = prefixOf(m[1]);
      if (pre) seen.add(pre);
    }
    for (const pre of seen) {
      if (!spaRefs.has(pre)) spaRefs.set(pre, new Set());
      spaRefs.get(pre).add(f);
    }
  }

  // 2. backend-served /api prefixes (mounts in routes/index.ts, with router sub-path expansion).
  const routesSrc = readFileSync(ROUTES, "utf8");
  const identToFile = new Map();
  for (const m of routesSrc.matchAll(/import\s+(?:\{\s*([a-zA-Z0-9_]+)\s*\}|([a-zA-Z0-9_]+))\s+from\s+["']\.\/([a-zA-Z0-9_-]+)\.js["']/g)) {
    const ident = m[1] || m[2];
    const file = join(ROUTES_DIR, m[3] + ".ts");
    if (ident && existsSync(file)) identToFile.set(ident, file);
  }
  const subPathsOf = (file) => {
    let src; try { src = readFileSync(file, "utf8"); } catch { return []; }
    return [...src.matchAll(/\brouter\.(?:use|get|post|put|delete|all)\(\s*["'`](\/[a-z0-9_/:-]*)["'`]/g)].map((mm) => mm[1]);
  };
  const mounts = new Set();
  const servedPrefixes = new Set();
  const NAMESPACE_ONLY = new Set(["/api", "/api/v1", "/api/mcp"]);
  for (const m of routesSrc.matchAll(/app\.(?:use|get|post|put|delete|all)\(\s*["'`](\/api[a-z0-9_/:-]*)["'`]\s*,\s*([a-zA-Z0-9_]+)/g)) {
    const mountPrefix = m[1].replace(/\/:.*$/, "").replace(/\/\*.*$/, "");
    mounts.add(mountPrefix);
    if (/^\/api\/[a-z]/.test(mountPrefix) && !NAMESPACE_ONLY.has(mountPrefix)) {
      const p = prefixOf(mountPrefix); if (p) servedPrefixes.add(p);
    }
    const file = identToFile.get(m[2]);
    if (file) for (const sub of subPathsOf(file)) {
      const p = prefixOf((mountPrefix + sub).replace(/\/{2,}/g, "/"));
      if (p) servedPrefixes.add(p);
    }
  }

  // 3. coverage + reachability classification.
  const covered = (pre) => {
    for (const mt of servedPrefixes) if (pre === mt || pre.startsWith(mt + "/") || mt.startsWith(pre + "/")) return true;
    return false;
  };
  const appSrc = existsSync(APP_TSX) ? readFileSync(APP_TSX, "utf8") : "";
  const reachable = buildReachableSet(appSrc, root);
  const rel = (f) => f.replace(root, "mcp-server/web/src").replace(/\\/g, "/");

  const gaps = [], ok = [];
  for (const [pre, fileSet] of [...spaRefs].sort()) {
    const files = [...fileSet];
    if (covered(pre)) { ok.push({ prefix: pre, referencingFiles: files.length }); continue; }
    const reach = classifyGap(files, reachable);
    gaps.push({
      prefix: pre,
      reachability: reach,
      referencingFiles: files.length,
      referencedBy: files.map(rel).sort(),
    });
  }
  const liveGaps = gaps.filter((g) => g.reachability === "live");
  const orphanGaps = gaps.filter((g) => g.reachability === "orphan");

  const result = {
    schemaVersion: "1.1.0",
    generatedAt: new Date().toISOString(),
    note: "Prefix-level STATIC heuristic + reachability. A gap = a SPA /api prefix served by NO backend route. reachability='live' means a routed-reachable SPA file calls it (URGENT, frontend-blocking); 'orphan' means it is referenced ONLY by dead code (unrouted page / client imported by no routed page) -- NOT frontend-blocking, candidate for cleanup. Reachability = import closure of App.tsx routed pages. Still CONFIRM a live gap is a real fetch (vs a type/doc string) before building.",
    stats: {
      spaPrefixes: spaRefs.size, backendMounts: mounts.size, servedPrefixes: servedPrefixes.size,
      covered: ok.length, gaps: gaps.length, liveGaps: liveGaps.length, orphanGaps: orphanGaps.length,
    },
    liveGaps: liveGaps.sort((a, b) => b.referencingFiles - a.referencingFiles),
    orphanGaps: orphanGaps.sort((a, b) => b.referencingFiles - a.referencingFiles),
    backendMounts: [...mounts].sort(),
    servedPrefixes: [...servedPrefixes].sort(),
  };
  writeFileSync(OUT, JSON.stringify(result, null, 2));

  if (!JSON_ONLY) {
    console.log(`# Frontend<->backend contract audit (prefix-level, static + reachability)`);
    console.log(`SPA prefixes: ${spaRefs.size} - backend mounts: ${mounts.size} - covered: ${ok.length} - GAPS: ${gaps.length} (LIVE: ${liveGaps.length}, orphan: ${orphanGaps.length})`);
    if (liveGaps.length) {
      console.log(`\n## LIVE gaps -- routed-reachable SPA code calls an unmounted prefix (frontend-blocking, build the router):`);
      for (const g of liveGaps) console.log(`- ${g.prefix}  <- ${g.referencedBy.join(", ")}`);
    } else console.log(`\nNo LIVE gaps: every routed-reachable SPA /api call has a backend mount.`);
    if (orphanGaps.length) {
      console.log(`\n## orphan gaps -- referenced only by dead code (unrouted page / unimported client); cleanup candidates, NOT blocking:`);
      for (const g of orphanGaps) console.log(`- ${g.prefix}  <- ${g.referencedBy.join(", ")}`);
    }
    console.log(`\nFull: ${OUT}`);
  }
  return result;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
