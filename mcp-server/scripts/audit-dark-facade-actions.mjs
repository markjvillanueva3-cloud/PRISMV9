#!/usr/bin/env node
/**
 * audit-dark-facade-actions.mjs (U-DARK-FACADE-AUDIT, slot:india 2026-06-23)
 *
 * Finds DARK dispatcher actions: cases bulk-wired with the "method-probe facade"
 *   result = engine.probe1?.(params) ?? engine.probe2?.(params) ?? ... ?? { ..., note: "method not callable" }
 * where NONE of the probed method names is a real method on the target engine, so
 * the action ALWAYS returns the "method not callable" stub (silently dark).
 *
 * Found 4x by hand in fiveAxisDispatcher (five_axis_deep_learn/decision/
 * fusion_5axis_strategy) + xproc; ~341 facade-style sites exist across 14
 * dispatchers. This audit turns that into a deterministic, evidence-based list of
 * the actually-dark subset (a facade whose probe DOES hit a real method is FINE).
 *
 * HEURISTIC + ADVISORY (R12): regex-based, not a full AST. A flagged action is a
 * STRONG dark candidate but MUST be verified (read the engine) before fixing -- a
 * probed method reachable only via inheritance/singleton-wrapper can be a false
 * positive; verify like the 4 hand-fixed ones.
 *
 * Usage: node scripts/audit-dark-facade-actions.mjs [--json]
 *
 * @module scripts/audit-dark-facade-actions
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = resolve(HERE, "..");
const DISPATCHER_DIR = join(MCP_ROOT, "src", "tools", "dispatchers");

const FACADE_MARKER = "method not callable";
// reserved words the method-def regex would otherwise capture as "methods"
const NON_METHOD_WORDS = new Set([
  "if", "for", "while", "switch", "catch", "return", "function", "await",
  "typeof", "new", "case", "do", "else", "super",
]);

/**
 * Extract facade cases from a dispatcher source. A facade case is a `case "X":`
 * block whose body contains the FACADE_MARKER; collects the probed method names
 * (`.name?.(`) and the lazily-imported engine module path, scanning from the case
 * label to the marker line (so multi-line `?? ... ?? {note}` chains are caught).
 *
 * @param {string} src dispatcher .ts source
 * @returns {Array<{action:string, enginePath:string|null, probedMethods:string[], line:number}>}
 */
export function extractFacadeCases(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(FACADE_MARKER)) continue;
    let caseStart = -1;
    let action = null;
    for (let j = i; j >= 0 && j >= i - 40; j--) {
      const cm = lines[j].match(/case\s+["'](\w+)["']\s*:/);
      if (cm) { caseStart = j; action = cm[1]; break; }
    }
    if (caseStart < 0) continue;
    const block = lines.slice(caseStart, i + 1).join("\n");
    const probedMethods = [...new Set([...block.matchAll(/\.(\w+)\?\.\(/g)].map((m) => m[1]))];
    const im = block.match(/import\(["']([^"']+\.js)["']\)/);
    const enginePath = im ? im[1] : null;
    if (probedMethods.length > 0) {
      out.push({ action, enginePath, probedMethods, line: i + 1 });
    }
  }
  return out;
}

/**
 * Collect method-definition names from an engine source (static/instance/async).
 * Heuristic: a line like `  [static] [async] name(` at class-member indent.
 *
 * @param {string} src engine .ts source
 * @returns {Set<string>}
 */
export function engineMethodNames(src) {
  const names = new Set();
  const re = /^\s{2,}(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*(?:<[^>]*>)?\s*\(/gm;
  for (const m of src.matchAll(re)) {
    const name = m[1];
    if (!NON_METHOD_WORDS.has(name)) names.add(name);
  }
  return names;
}

/**
 * Classify one facade case as dark/lit given the resolved engine source.
 * @param {{action:string, enginePath:string|null, probedMethods:string[]}} fc
 * @param {string|null} engineSrc resolved engine source (null = unresolved)
 * @returns {{dark:boolean, foundMethods:string[], reason:string}}
 */
export function classifyFacadeCase(fc, engineSrc) {
  if (engineSrc == null) {
    return { dark: false, foundMethods: [], reason: "engine-unresolved (cannot classify)" };
  }
  const methods = engineMethodNames(engineSrc);
  const found = fc.probedMethods.filter((p) => methods.has(p));
  if (found.length > 0) {
    return { dark: false, foundMethods: found, reason: `probe hits real method(s): ${found.join(", ")}` };
  }
  return { dark: true, foundMethods: [], reason: `none of [${fc.probedMethods.join(", ")}] is a method on the engine` };
}

/** Resolve a dispatcher-relative `import("../../engines/X.js")` to the .ts source path. */
function resolveEngineTs(dispatcherFile, enginePath) {
  if (!enginePath) return null;
  const tsPath = resolve(dirname(dispatcherFile), enginePath).replace(/\.js$/, ".ts");
  return existsSync(tsPath) ? tsPath : null;
}

/** Audit every dispatcher; returns the full finding list. */
export function auditAll(dispatcherDir = DISPATCHER_DIR) {
  const files = readdirSync(dispatcherDir).filter((f) => f.endsWith("Dispatcher.ts"));
  const findings = [];
  for (const f of files) {
    const file = join(dispatcherDir, f);
    const src = readFileSync(file, "utf8");
    for (const fc of extractFacadeCases(src)) {
      const tsPath = resolveEngineTs(file, fc.enginePath);
      const engineSrc = tsPath ? readFileSync(tsPath, "utf8") : null;
      const verdict = classifyFacadeCase(fc, engineSrc);
      findings.push({ dispatcher: f, ...fc, ...verdict });
    }
  }
  return findings;
}

// ---- CLI ----
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const findings = auditAll();
  const dark = findings.filter((f) => f.dark);
  const unresolved = findings.filter((f) => f.reason.startsWith("engine-unresolved"));
  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify({ total: findings.length, dark: dark.length, unresolved: unresolved.length, darkActions: dark }, null, 2) + "\n");
  } else {
    console.log(`Dark-facade audit: ${findings.length} facade case(s), ${dark.length} DARK, ${unresolved.length} unresolved.`);
    const byDisp = {};
    for (const d of dark) (byDisp[d.dispatcher] ??= []).push(d);
    for (const [disp, acts] of Object.entries(byDisp).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n${disp} (${acts.length} dark):`);
      for (const a of acts) console.log(`  - ${a.action} [${a.enginePath ? a.enginePath.split("/").pop() : "?"}] probed: ${a.probedMethods.join("/")}`);
    }
  }
}
