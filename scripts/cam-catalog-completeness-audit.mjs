#!/usr/bin/env node
/**
 * cam-catalog-completeness-audit.mjs — measure "do we have every button/input/parameter?" (slot:kilo)
 *
 * U-CAM-CAT-AUDIT. The honest measurement layer behind the operator ask "build everything we need
 * to utilize Fusion / hyperMILL / Mastercam — every button, input, function, setting and parameter."
 * You cannot claim completeness without measuring it (R12). This script walks the grounded
 * data/cam-functions/<system>/ catalogs and reports, per system:
 *   - observed operations + observed parameters (the same op/param detection as CAMCatalogQueryEngine)
 *   - claimed counts (metadata.total_items / total_parameters / coverage_summary) vs observed → coverage %
 *   - thin/stub operations (0 params) — the concrete gap-fill punch list
 *   - per-operation parameter counts
 * Emits state/shared/CAM-CATALOG-COVERAGE.{json,md}. ADVISORY + mustHumanVerify — never auto-fills.
 *
 * Optional grounded target: if state/shared/cam-catalog-target-universe.json exists, its
 * {system: [opId,...]} lists give a STRICTER coverage % (observed ops vs the operator-curated
 * full operation set). Absent → coverage is claimed-vs-observed only (no hallucinated universe).
 *
 * fs-only (no child_process / network). CLI: node scripts/cam-catalog-completeness-audit.mjs [--json|--stdout]
 */

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FN_ROOT = path.join(ROOT, "mcp-server", "data", "cam-functions");
const TARGET_PATH = path.join(ROOT, "state", "shared", "cam-catalog-target-universe.json");
const OUT_MD = path.join(ROOT, "state", "shared", "CAM-CATALOG-COVERAGE.md");
const OUT_JSON = path.join(ROOT, "state", "shared", "CAM-CATALOG-COVERAGE.json");

const SYSTEMS = ["fusion360", "hypermill", "mastercam"]; // the operator's 3 named systems

function readJson(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }

/** Param-record heuristic — mirrors CAMCatalogQueryEngine.isParamRecord. */
function isParamRecord(p) {
  if (!p || typeof p !== "object" || Array.isArray(p)) return false;
  if (typeof p.id !== "string" && typeof p.name !== "string") return false;
  return "type" in p || "value" in p || "default" in p || "unit" in p || "range" in p || "values" in p;
}

/**
 * Recursive op+param counter — mirrors CAMCatalogQueryEngine.extractInto so the audit's coverage
 * matches what the query engine can actually serve (Fusion maps / Mastercam strategy-maps +
 * modules-plural + keyed audit sections / hyperMILL operations[]+menus[] dialogs). ops: Map<opId,Set<paramName>>.
 */
function extractCounts(node, opName, ops, depth = 0) {
  if (depth > 12 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const it of node) extractCounts(it, opName, ops, depth + 1); return; }
  const HANDLED = new Set(["params", "parameters", "tabs", "pages", "dialogs", "toolpaths", "operations", "strategies"]);
  const addParam = (raw) => {
    if (!isParamRecord(raw)) return;
    const id = opName ?? "(root)";
    let set = ops.get(id); if (!set) { set = new Set(); ops.set(id, set); }
    set.add(String(raw.id ?? raw.name));
  };
  for (const key of ["params", "parameters"]) if (Array.isArray(node[key])) for (const raw of node[key]) addParam(raw);
  for (const key of ["tabs", "pages"]) { const m = node[key]; if (m && typeof m === "object" && !Array.isArray(m)) for (const v of Object.values(m)) extractCounts(v, opName, ops, depth + 1); }
  if (Array.isArray(node.dialogs)) for (const d of node.dialogs) extractCounts(d, opName, ops, depth + 1);
  for (const key of ["toolpaths", "operations", "strategies"]) if (Array.isArray(node[key])) for (const op of node[key]) extractCounts(op, String(op?.id ?? op?.name ?? opName ?? "(root)"), ops, depth + 1);
  for (const [k, v] of Object.entries(node)) {
    if (HANDLED.has(k) || !v || typeof v !== "object") continue;
    if (Array.isArray(v)) { for (const it of v) if (it && typeof it === "object" && !isParamRecord(it)) extractCounts(it, String(it.id ?? it.name ?? opName ?? "(root)"), ops, depth + 1); }
    else { const childIsOp = !!(v.fusion_name || v.tabs || v.pages || v.dialogs || v.params || v.parameters); extractCounts(v, childIsOp ? String(v.id ?? v.name ?? k) : opName, ops, depth + 1); }
  }
}

function claimedFor(json) {
  // grounded "claimed" counts the catalog authors recorded
  const m = json.metadata ?? json;
  const cs = json.coverage_summary ?? m.coverage_summary ?? {};
  return Number(m.total_items) || Number(m.total_parameters) || Number(json.total_parameters)
    || Number(cs.total_parameters) || Number(cs.total_params) || 0;
}

function auditSystem(system) {
  const dir = path.join(FN_ROOT, system);
  if (!existsSync(dir)) return { system, present: false };
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "function-index.json");
  const ops = new Map(); // id -> Set(param names)
  let claimed = 0;
  for (const f of files) {
    const json = readJson(path.join(dir, f));
    if (!json) continue;
    claimed = Math.max(claimed, claimedFor(json));
    const container = json.section ?? json.module ?? json;
    extractCounts(container, null, ops);
  }
  ops.delete("(root)"); // drop params that never resolved to a named operation
  const perOp = [...ops.entries()].map(([id, set]) => ({ id, params: set.size })).sort((a, b) => a.params - b.params);
  const observedParams = perOp.reduce((s, o) => s + o.params, 0);
  const thin = perOp.filter((o) => o.params === 0).map((o) => o.id);
  const claimedCoverage = claimed > 0 ? Math.round((observedParams / claimed) * 100) : null;

  let universeCoverage = null, missingOps = null;
  const target = existsSync(TARGET_PATH) ? readJson(TARGET_PATH) : null;
  if (target && Array.isArray(target[system])) {
    const have = new Set(ops.keys());
    missingOps = target[system].filter((o) => !have.has(o));
    universeCoverage = target[system].length > 0 ? Math.round(((target[system].length - missingOps.length) / target[system].length) * 100) : null;
  }
  return {
    system, present: true, files: files.length,
    operations: ops.size, observedParams, claimedParams: claimed,
    claimedCoveragePct: claimedCoverage, universeCoveragePct: universeCoverage,
    thinOperations: thin, missingOperations: missingOps,
    perOperation: perOp,
  };
}

function renderMd(report) {
  const L = [];
  L.push("# CAM Catalog Completeness Coverage (slot:kilo — U-CAM-CAT-AUDIT)");
  L.push("");
  L.push(`_Generated ${report.generatedAt} · regen \`node scripts/cam-catalog-completeness-audit.mjs\`._`);
  L.push("> ADVISORY + mustHumanVerify. `claimedCoverage` = observed params ÷ the count the catalog authors recorded. `universeCoverage` (if present) = observed ops ÷ the operator-curated `cam-catalog-target-universe.json`. Thin operations (0 params) are the concrete gap-fill punch list. NEVER hallucinate a parameter — an unextractable one stays a gap.");
  L.push("");
  L.push("| System | Ops | Params (observed) | Claimed | Claimed cov% | Universe cov% | Thin ops |");
  L.push("|---|---|---|---|---|---|---|");
  for (const s of report.systems) {
    if (!s.present) { L.push(`| ${s.system} | — | — | — | — | — | (dir missing) |`); continue; }
    L.push(`| ${s.system} | ${s.operations} | ${s.observedParams} | ${s.claimedParams || "?"} | ${s.claimedCoveragePct ?? "?"}% | ${s.universeCoveragePct ?? "n/a"} | ${s.thinOperations.length} |`);
  }
  L.push("");
  for (const s of report.systems) {
    if (!s.present) continue;
    L.push(`## ${s.system}`);
    if (s.thinOperations.length) L.push(`- **Thin/stub operations (0 params — fill first):** ${s.thinOperations.join(", ")}`);
    if (s.missingOperations && s.missingOperations.length) L.push(`- **Missing vs target universe:** ${s.missingOperations.join(", ")}`);
    const lowest = s.perOperation.filter((o) => o.params > 0).slice(0, 8).map((o) => `${o.id}(${o.params})`);
    if (lowest.length) L.push(`- Lowest-param operations: ${lowest.join(", ")}`);
    L.push("");
  }
  L.push("_Gap-fill is grounded: extract missing params from vendor PDFs / OPEN MIND E-Learning / Mastercam X8 docs / the running seats — never invent. Query the catalog via `prism_cam:cam_catalog_operation_params`._");
  return L.join("\n");
}

function main() {
  const argv = process.argv.slice(2);
  // generatedAt: avoid Date.now ban concerns in scripts — Date is fine here (not a workflow)
  const report = { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), advisoryOnly: true, mustHumanVerify: true, systems: SYSTEMS.map(auditSystem) };
  if (argv.includes("--json")) { process.stdout.write(JSON.stringify(report, null, 2) + "\n"); return; }
  const md = renderMd(report);
  if (argv.includes("--stdout")) { process.stdout.write(md + "\n"); return; }
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n", "utf8");
  writeFileSync(OUT_MD, md + "\n", "utf8");
  const summary = report.systems.filter((s) => s.present).map((s) => `${s.system}: ${s.operations} ops / ${s.observedParams} params (${s.claimedCoveragePct ?? "?"}% of claimed)`).join(" · ");
  process.stdout.write(`[cam-catalog-audit] ${summary}\n[cam-catalog-audit] wrote ${path.relative(ROOT, OUT_MD)}\n`);
}

try { main(); } catch (e) { process.stderr.write(`[cam-catalog-audit] ${e?.message || e}\n`); process.exit(1); }
