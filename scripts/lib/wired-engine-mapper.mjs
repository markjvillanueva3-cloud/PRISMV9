#!/usr/bin/env node
/**
 * wired-engine-mapper.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-SIBLING-INFER
 *
 * Pure helper: scans dispatcher .ts files, extracts engine imports (both static
 * `import X from .../engines/Y.js` AND dynamic `await import(".../engines/Y.js")`),
 * and returns a map of engine class names → list of dispatcher namespaces that
 * import them.
 *
 * Companion to seed-ghost-from-unwired.mjs — the sibling-pattern fallback for
 * names that don't hit any keyword inference rule.
 *
 * Pure-export contract:
 *   extractEngineImports(src) → string[]    // engine class names in this file
 *   buildEngineDispatcherMap(dispatchersDir) → Map<engineName, Set<prismNamespace>>
 *   dispatcherFileToNamespace(filename) → string  // 'calcDispatcher.ts' → 'prism_calc'
 *   inferDispatcherBySibling(unwiredName, wiredMap, opts) → { dispatcher, confidence, reason } | null
 */
import fs from "node:fs";
import path from "node:path";

/** Hand-tuned filename → namespace map for dispatchers whose name doesn't pattern-match. */
export const DISPATCHER_NAMESPACE_OVERRIDES = Object.freeze({
  "adaptiveControlDispatcher": "prism_orchestrate",
  "aiReasoningDispatcher": "prism_ai",
  "atcsDispatcher": "prism_orchestrate",
  "autoPilotDispatcher": "prism_orchestrate",
  "businessDispatcher": "prism_session",
  "cadAutomationDispatcher": "prism_cad",
  "calcDispatcher": "prism_calc",
  "camDispatcher": "prism_cam",
  "contextDispatcher": "prism_session",
  "devDispatcher": "prism_dev",
  "edmDispatcher": "prism_cam",
  "fiveAxisDispatcher": "prism_5axis",
  "guardDispatcher": "prism_guard",
  "hookDispatcher": "prism_dev",
  "intakeDispatcher": "prism_intake",
  "intelligenceDispatcher": "prism_intelligence",
  "knowledgeDispatcher": "prism_memory",
  "localDispatcher": "prism_session",
  "memoryDispatcher": "prism_memory",
  "millDispatcher": "prism_cam",
  "mlDispatcher": "prism_ai",
  "omegaDispatcher": "prism_omega",
  "orchestrateDispatcher": "prism_orchestrate",
  "ppDispatcher": "prism_cam",
  "safetyDispatcher": "prism_safety",
  "sessionDispatcher": "prism_session",
  "telemetryDispatcher": "prism_dev",
  "turningDispatcher": "prism_turning",
});

/** Generic fallback: <name>Dispatcher.ts → prism_<name>. */
export function dispatcherFileToNamespace(filename) {
  if (typeof filename !== "string") return null;
  const base = filename.replace(/\.ts$/i, "").replace(/\.js$/i, "");
  if (DISPATCHER_NAMESPACE_OVERRIDES[base]) return DISPATCHER_NAMESPACE_OVERRIDES[base];
  const m = base.match(/^([a-z][A-Za-z0-9]*)Dispatcher$/);
  if (m) return `prism_${m[1].toLowerCase()}`;
  return null;
}

/**
 * Extract every engine class name imported by a dispatcher source file.
 * Matches both static + dynamic imports, with-or-without `.js` suffix.
 */
export function extractEngineImports(src) {
  if (typeof src !== "string" || src.length === 0) return [];
  const out = new Set();
  // Pattern: any quoted path containing /engines/<ClassName>(.js)?
  const re = /["'][^"']*\/engines\/([A-Z][A-Za-z0-9_]*)(?:\.js)?["']/g;
  let m;
  while ((m = re.exec(src)) !== null) out.add(m[1]);
  return [...out];
}

/**
 * Build the full engine → Set<dispatcher-namespace> map by scanning all
 * dispatcher .ts files in the directory.
 */
export function buildEngineDispatcherMap(dispatchersDir) {
  const map = new Map();
  if (!fs.existsSync(dispatchersDir)) return map;
  const files = fs.readdirSync(dispatchersDir).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(".test.ts")
  );
  for (const f of files) {
    let src;
    try { src = fs.readFileSync(path.join(dispatchersDir, f), "utf8"); }
    catch { continue; }
    const ns = dispatcherFileToNamespace(f);
    if (!ns) continue;
    for (const engineName of extractEngineImports(src)) {
      if (!map.has(engineName)) map.set(engineName, new Set());
      map.get(engineName).add(ns);
    }
  }
  return map;
}

/**
 * Sibling-pattern inference: for an unwired engine name, find the longest
 * common-prefix wired siblings (min prefix length 4) and return the most-common
 * dispatcher among them.
 *
 * Returns null if no sibling has prefix length ≥ minPrefix.
 */
export function inferDispatcherBySibling(unwiredName, wiredMap, opts = {}) {
  const minPrefix = opts.minPrefix ?? 4;
  const maxCandidates = opts.maxCandidates ?? 50;
  if (typeof unwiredName !== "string" || unwiredName.length < minPrefix) return null;
  if (!wiredMap || typeof wiredMap.has !== "function") return null;

  // Build list of (engineName, sharedPrefixLen) for all wired engines
  const wiredNames = [...wiredMap.keys()];
  let bestPrefixLen = 0;
  const candidates = [];
  for (const w of wiredNames) {
    if (w === unwiredName) continue; // skip self
    const sharedLen = commonPrefixLen(unwiredName, w);
    if (sharedLen < minPrefix) continue;
    if (sharedLen > bestPrefixLen) {
      bestPrefixLen = sharedLen;
      candidates.length = 0;
      candidates.push(w);
    } else if (sharedLen === bestPrefixLen) {
      candidates.push(w);
      if (candidates.length > maxCandidates) candidates.pop(); // bound work
    }
  }
  if (candidates.length === 0) return null;

  // Tally dispatchers across the longest-prefix candidates
  const tally = {};
  for (const c of candidates) {
    for (const ns of wiredMap.get(c) || []) {
      tally[ns] = (tally[ns] || 0) + 1;
    }
  }
  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const [topNs, topCount] = entries[0];
  const totalVotes = entries.reduce((s, [, c]) => s + c, 0);
  const purity = topCount / totalVotes;
  // Confidence: scaled by prefix length × purity, capped at 0.65 (always below
  // the 0.85 high-confidence keyword tier — sibling inference is plausible, not certain)
  const confidence = Math.min(0.65, 0.40 + 0.05 * bestPrefixLen + 0.10 * (purity - 0.5));
  return {
    dispatcher: topNs,
    confidence: Math.max(0.40, confidence),
    reason: `sibling-prefix len=${bestPrefixLen} (${candidates.length} siblings, ${topCount}/${totalVotes} → ${topNs})`,
  };
}

/** Length of common prefix between two strings (case-sensitive). */
export function commonPrefixLen(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return 0;
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}
