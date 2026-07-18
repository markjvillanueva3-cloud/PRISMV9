#!/usr/bin/env node
/**
 * discovery-coverage-dashboard -- ONE command for PRISM's full "built-but-unwired"
 * picture across the three discovery-coverage layers, with the actionable-orphan
 * rollup routed to owners. The capstone over the tested layer tools (composes
 * them; adds no new coverage logic).
 *
 * DISCOVERY-EFFICIENCY/U-DISCOVERY-COVERAGE-DASHBOARD (slot:tango, 2026-06-16).
 *
 * Layers:
 *   - dispatcher -> index.ts   (dispatcher-registration-coverage.mjs)
 *   - algorithm  -> consumer   (algorithm-dispatcher-coverage.mjs)
 *   - engine     -> consumer   (read from the latest UNWIRED-ENGINE-AUDIT-*.json,
 *                               produced by audit-unwired-engines.mjs -- that scan
 *                               walks 3800+ files so we consume its sidecar rather
 *                               than re-run it inline)
 *
 * Pure-node, composes exported pure cores. Usage:
 *   node scripts/discovery-coverage-dashboard.mjs [--json]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { computeCoverage as algorithmCoverage } from "./algorithm-dispatcher-coverage.mjs";
import { computeCoverage as dispatcherCoverage } from "./dispatcher-registration-coverage.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const VIZ_DIR = join(REPO_ROOT, "state", "shared");

/** Find the newest UNWIRED-ENGINE-AUDIT-*.json sidecar (most recent by mtime). Pure-ish. */
export function findLatestEngineAudit(dir = VIZ_DIR, readDir = readdirSync, stat = statSync) {
  let files;
  try { files = readDir(dir); } catch { return null; }
  const candidates = files.filter((f) => /^UNWIRED-ENGINE-AUDIT-.*\.json$/.test(f));
  if (!candidates.length) return null;
  let best = null;
  for (const f of candidates) {
    const full = join(dir, f);
    let mtime = 0;
    try { mtime = stat(full).mtimeMs; } catch { continue; }
    if (!best || mtime > best.mtime) best = { file: full, mtime };
  }
  return best ? best.file : null;
}

/** Read the engine-layer coverage from the audit sidecar. Returns null if absent/unreadable. */
export function readEngineCoverage(auditPath, readFile = (f) => readFileSync(f, "utf8")) {
  if (!auditPath) return null;
  let parsed;
  try { parsed = JSON.parse(readFile(auditPath)); } catch { return null; }
  const counts = parsed.counts || {};
  const total = Number(counts.totalCanonicalEngines ?? counts.total ?? counts.engines ?? 0) || 0;
  const unwired = Array.isArray(parsed.unwiredEngines) ? parsed.unwiredEngines : [];
  const unwiredCount = Number(counts.UNWIRED ?? unwired.length) || unwired.length;
  return {
    source: auditPath,
    generated: parsed.generated || null,
    total,
    unwiredCount,
    unwired: unwired.map((x) => (typeof x === "string" ? x : x?.engine || x?.name || String(x))),
  };
}

/**
 * Build the consolidated discovery-coverage snapshot. Pure over injected layer fns.
 * @returns {{layers, actionable, generatedNote}}
 */
export function buildDashboard(opts = {}) {
  const algo = (opts.algorithmCoverage || algorithmCoverage)();
  const disp = (opts.dispatcherCoverage || dispatcherCoverage)();
  const engineAuditPath = opts.engineAuditPath !== undefined ? opts.engineAuditPath : findLatestEngineAudit();
  const engine = (opts.readEngineCoverage || readEngineCoverage)(engineAuditPath);

  const dispatcherDormant = disp.dormant || [];
  const dispatcherActionable = dispatcherDormant.filter((d) => d.klass === "candidate");

  return {
    layers: {
      dispatcher: {
        total: disp.totalExports,
        registered: disp.registeredCount,
        dormant: disp.dormantCount,
        coveragePct: disp.coveragePct,
        byClass: countBy(dispatcherDormant, "klass"),
      },
      algorithm: {
        total: algo.total,
        wired: algo.wiredCount,
        dormant: algo.dormantCount,
        orphaned: algo.orphanedCount,
        wireExempt: algo.wireExemptCount,
        coveragePct: algo.coveragePct,
      },
      engine: engine
        ? { total: engine.total, unwired: engine.unwiredCount, source: engine.source, generated: engine.generated }
        : { unavailable: true, note: "run scripts/audit-unwired-engines.mjs to populate the engine layer" },
    },
    // The genuinely-actionable, do-this-now set (safe to wire / build, not exempt/skipped/safety/cross-lane).
    actionable: {
      dispatcherCandidates: dispatcherActionable.map((d) => d.toolName || d.regName),
      algorithmOrphaned: algo.orphaned || [],
      engineUnwiredCount: engine ? engine.unwiredCount : null,
    },
    generatedNote: "advisory -- verify-on-disk + route to the owning slot before wiring (tango surfaces, owners wire)",
  };
}

/** Count items by a string field. Pure. */
function countBy(arr, field) {
  const out = {};
  for (const x of arr) { const k = x?.[field] ?? "unknown"; out[k] = (out[k] || 0) + 1; }
  return out;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function runCLI(argv) {
  const json = argv.includes("--json");
  const d = buildDashboard();
  if (json) { console.log(JSON.stringify(d, null, 2)); return; }
  const L = d.layers;
  console.log("=== PRISM Discovery Coverage Dashboard ===");
  console.log(`dispatcher -> index.ts : ${L.dispatcher.registered}/${L.dispatcher.total} registered (${L.dispatcher.coveragePct}%), ${L.dispatcher.dormant} dormant ${JSON.stringify(L.dispatcher.byClass)}`);
  console.log(`algorithm  -> consumer : ${L.algorithm.wired}/${L.algorithm.total} wired (${L.algorithm.coveragePct}%), ${L.algorithm.orphaned} orphaned + ${L.algorithm.wireExempt} wire-exempt`);
  console.log(L.engine.unavailable
    ? `engine     -> consumer : (unavailable -- ${L.engine.note})`
    : `engine     -> consumer : ${L.engine.total - L.engine.unwired}/${L.engine.total} wired, ${L.engine.unwired} unwired`);
  console.log("\nACTIONABLE (verify + route to owner before wiring):");
  console.log(`  dispatcher register-candidates: ${d.actionable.dispatcherCandidates.length ? d.actionable.dispatcherCandidates.join(", ") : "(none)"}`);
  console.log(`  algorithm orphaned: ${d.actionable.algorithmOrphaned.length ? d.actionable.algorithmOrphaned.join(", ") : "(none)"}`);
  console.log(`  engine unwired: ${d.actionable.engineUnwiredCount ?? "(run audit-unwired-engines.mjs)"}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCLI(process.argv.slice(2));
}
