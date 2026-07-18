#!/usr/bin/env node
/**
 * jmdie-post-gap-detect.mjs — pure detection lib for JM Die enhanced post-processor gap analysis.
 *
 * Mirrors `JMDiePostProcessorLearningEngine.ENHANCEMENT_MARKERS` and
 * `CORPUS_THRESHOLD` from `mcp-server/src/engines/JMDiePostProcessorLearningEngine.ts`.
 * The TypeScript engine is the canonical engine for the MCP dispatcher; this lib
 * is the canonical detector for the `/system-viz` augmentation pipeline (pure JS
 * so it slots into the existing `scripts/generate-*-features.mjs` shape).
 *
 * IF THE ENGINE'S `ENHANCEMENT_MARKERS` CHANGES — UPDATE BOTH. Two-file invariant.
 * A drift-guard test in the engine's own suite asserts the JSON shapes match;
 * this lib's tests assert the marker list is verbatim by counting (length 15).
 *
 * Pure functions only — no I/O. Callers (the generator) own the .cps reads.
 *
 * Spec: FEATURE-GAP-AUDIT-MS0 / U-JMDIE-POST-GAPS-VIZ-ROOST (slot:india, 2026-05-22).
 */

/** Threshold for "a family carries an enhancement" — inclusive. */
export const CORPUS_THRESHOLD = 0.5;

/**
 * 15 enhancement markers — VERBATIM mirror of the engine. Each `patterns`
 * entry is a regex; a marker is "present" iff ANY of its patterns matches the
 * raw .cps source text. Order is preserved so a length-15 invariant catches
 * drift loudly.
 */
export const ENHANCEMENT_MARKERS = Object.freeze([
  { id: "imachining_variable_feed", patterns: [/imachining/i] },
  { id: "ai_enhanced", patterns: [/ai[- ]enhanced/i, /enhanced edition/i] },
  { id: "prism_physics_integration", patterns: [/\bprism\b/i] },
  { id: "sidecar_json_export", patterns: [/sidecar/i] },
  { id: "chip_thinning_compensation", patterns: [/chip[- ]thinning/i] },
  { id: "adaptive_feed_control", patterns: [/adaptive feed/i, /3d adaptive/i] },
  { id: "dynamic_depth_feed", patterns: [/dynamic depth feed/i, /dynamic feed/i] },
  { id: "path_smoothing", patterns: [/\bsmoothing\b/i, /\bg05\.3\b/i, /ultimotion/i] },
  { id: "spindle_speed_variation", patterns: [/spindle speed variation/i, /\bssv\b/i] },
  { id: "rigid_tapping", patterns: [/rigid tap/i] },
  { id: "lookahead_optimization", patterns: [/look[- ]?ahead/i] },
  { id: "tool_deflection_analysis", patterns: [/deflection/i] },
  { id: "aggressiveness_control", patterns: [/aggressiveness/i] },
  { id: "load_monitoring", patterns: [/load monitor/i] },
  { id: "physics_data_integration", patterns: [/physics[- ]optimized/i, /physics data/i] },
]);

/** Known controller families — anything else collapses to `unknown`. */
export const CONTROLLER_FAMILIES = Object.freeze([
  "haas",
  "hurco",
  "okuma",
  "roku-roku",
]);

/**
 * Detect enhancement markers present in a .cps source body.
 *
 * @param {string} text - raw .cps file contents
 * @returns {Record<string, boolean>} marker-id → present
 */
export function detectMarkers(text) {
  const t = typeof text === "string" ? text : "";
  const out = {};
  for (const m of ENHANCEMENT_MARKERS) {
    out[m.id] = m.patterns.some((p) => p.test(t));
  }
  return out;
}

/**
 * Infer controller family from a .cps filename + content. Filename token match
 * wins (case-insensitive). If no filename hint, scan content for the family
 * keywords. Returns `"unknown"` when nothing matches.
 *
 * @param {string} file - basename of the .cps file
 * @param {string} content - raw .cps file contents
 * @returns {"haas"|"hurco"|"okuma"|"roku-roku"|"unknown"}
 */
export function inferFamily(file, content) {
  const fname = String(file || "").toLowerCase();
  for (const fam of CONTROLLER_FAMILIES) {
    if (fname.includes(fam)) return fam;
  }
  const body = String(content || "").toLowerCase();
  for (const fam of CONTROLLER_FAMILIES) {
    if (body.includes(fam)) return fam;
  }
  return "unknown";
}

/**
 * Compute a per-post profile from a single .cps file.
 *
 * @param {{file:string, content:string}} input
 * @returns {{file:string, family:string, markers:Record<string,boolean>, enhancementCount:number}}
 */
export function buildProfile({ file, content }) {
  const family = inferFamily(file, content);
  const markers = detectMarkers(content);
  let enhancementCount = 0;
  for (const v of Object.values(markers)) if (v) enhancementCount++;
  return { file, family, markers, enhancementCount };
}

/**
 * Compute corpus-wide gap analysis. An enhancement is a "corpus gap" when its
 * coverage across all profiles is BELOW `CORPUS_THRESHOLD` (strict `<`). Posts
 * carrying the marker land in `presentIn[]`; posts missing land in `absentFrom[]`.
 * Sorted ascending by coverage so the worst gaps surface first.
 *
 * @param {Array<{file:string, family:string, markers:Record<string,boolean>}>} profiles
 * @returns {Array<{enhancement:string, coverage:number, presentIn:string[], absentFrom:string[]}>}
 */
export function computeCorpusGaps(profiles) {
  const list = Array.isArray(profiles) ? profiles : [];
  const total = list.length;
  if (total === 0) return [];
  const gaps = [];
  for (const m of ENHANCEMENT_MARKERS) {
    const presentIn = [];
    const absentFrom = [];
    for (const p of list) {
      if (p && p.markers && p.markers[m.id]) presentIn.push(p.file);
      else absentFrom.push(p && p.file ? p.file : "(unknown)");
    }
    const coverage = presentIn.length / total;
    if (coverage < CORPUS_THRESHOLD) {
      gaps.push({
        enhancement: m.id,
        coverage,
        presentIn: presentIn.slice().sort(),
        absentFrom: absentFrom.slice().sort(),
      });
    }
  }
  gaps.sort((a, b) =>
    (a.coverage - b.coverage) ||
    a.enhancement.localeCompare(b.enhancement),
  );
  return gaps;
}

/**
 * Compute per-post family-lag gaps. A post "lags its family" on marker M iff
 * ≥ `CORPUS_THRESHOLD` fraction of its sibling family-posts carry M AND this
 * post does not. Single-post families naturally yield empty (1/1 means the
 * lone post already carries every family pattern by definition).
 *
 * @param {Array<{file:string, family:string, markers:Record<string,boolean>}>} profiles
 * @returns {Array<{file:string, family:string, missingFamilyPatterns:string[], enhancementCount:number, valueScore:number}>}
 */
export function computePostGaps(profiles) {
  const list = Array.isArray(profiles) ? profiles : [];
  const total = ENHANCEMENT_MARKERS.length;

  // Pre-compute per-family coverage for every marker.
  const byFamily = new Map();
  for (const p of list) {
    const fam = p && p.family ? p.family : "unknown";
    if (!byFamily.has(fam)) byFamily.set(fam, []);
    byFamily.get(fam).push(p);
  }

  const result = [];
  for (const p of list) {
    const fam = p && p.family ? p.family : "unknown";
    const siblings = byFamily.get(fam) || [];
    const famSize = siblings.length;
    const missingFamilyPatterns = [];
    if (famSize > 1) {
      for (const m of ENHANCEMENT_MARKERS) {
        if (p.markers && p.markers[m.id]) continue;
        let famCount = 0;
        for (const s of siblings) if (s.markers && s.markers[m.id]) famCount++;
        const famCoverage = famCount / famSize;
        if (famCoverage >= CORPUS_THRESHOLD) {
          missingFamilyPatterns.push(m.id);
        }
      }
    }
    missingFamilyPatterns.sort();
    const enhancementCount = Object.values(p.markers || {}).filter(Boolean).length;
    const valueScore = total > 0 ? enhancementCount / total : 0;
    result.push({
      file: p.file,
      family: fam,
      missingFamilyPatterns,
      enhancementCount,
      valueScore,
    });
  }

  // Deterministic sort: family asc → file asc.
  result.sort((a, b) =>
    a.family.localeCompare(b.family) ||
    a.file.localeCompare(b.file),
  );
  return result;
}

/**
 * Assemble the full gap report from a profile list.
 *
 * @param {Array<{file:string, family:string, markers:Record<string,boolean>}>} profiles
 * @returns {{schemaVersion:string, profileCount:number, postGaps:Array, corpusWideGaps:Array, familyCounts:Record<string,number>}}
 */
export function buildGapReport(profiles) {
  const list = Array.isArray(profiles) ? profiles : [];
  const familyCounts = {};
  for (const p of list) {
    const fam = p && p.family ? p.family : "unknown";
    familyCounts[fam] = (familyCounts[fam] || 0) + 1;
  }
  return {
    schemaVersion: "1.0.0",
    profileCount: list.length,
    postGaps: computePostGaps(list),
    corpusWideGaps: computeCorpusGaps(list),
    familyCounts,
  };
}
