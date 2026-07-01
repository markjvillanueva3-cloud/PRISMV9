#!/usr/bin/env node
/**
 * forge-dedup-prefilter.mjs (DISCOVERY-EFFICIENCY, slot:tango 2026-06-15)
 *
 * Producer-side dedup pre-filter for the forge queue. extraction-forge-detect.mjs
 * scores youtube-extraction concepts for forge-worthiness but does NO check against
 * what PRISM already has, so the queue fills with already-built concepts (a 22/22
 * false-positive batch observed 2026-06-15: "Radial Chip Thinning" ->
 * ChipThinningCompensationEngine, "Topology Optimization" -> FixtureTopologyOptimizerEngine,
 * etc.). This is the anti-duplication guard that belongs at the SOURCE.
 *
 * Design: HIGH-PRECISION, CONSERVATIVE. A concept is flagged built ONLY when a
 * significant adjacent-token bigram (stemmed, concatenated) is a substring of an
 * engine/algorithm FILENAME -- near-certain evidence of an existing impl. Ambiguous
 * concepts are NOT flagged (they still queue, and /forge-triple's DuplicationGuard is
 * the real gate at drain time). This errs toward keeping candidates (low false-negative):
 * better to queue a dup a human skips than to silently drop a genuine new capability.
 *
 * Pure / no FS / no side effects -- safe to import + unit-test in isolation.
 *
 * @module scripts/lib/forge-dedup-prefilter
 */

// Generic English + youtube-title noise + CAD/CAM/CNC VENDOR names. A token here is
// never a "significant" concept token (vendor tutorials are cross-lane, not novel caps).
export const STOPWORDS = new Set([
  // generic / title noise
  "the", "and", "for", "with", "how", "you", "your", "are", "what", "this", "that",
  "from", "into", "use", "using", "intro", "introduction", "beginner", "beginners",
  "tutorial", "tutorials", "class", "video", "videos", "episode", "part", "tips",
  "tricks", "tip", "trick", "explained", "diy", "secret", "art", "brief", "step",
  "guide", "basic", "basics", "advanced", "new", "whats", "crucial", "proper",
  "effects", "applying", "workflow", "programming", "program", "code", "machine",
  "cnc", "manufacturing", "intelligent", "automation",
  // vendors / products
  "solidworks", "mastercam", "haas", "fusion", "inventor", "powermill",
  "esprit", "sprutcam", "autodesk", "rhino", "grasshopper", "kangaroo",
  "sandvik", "coromant", "airshaper", "proplanai", "genius", "northrop",
]);

/** Lowercase + strip a common derivational suffix (only when >=4 chars remain). */
export function stem(t) {
  let s = String(t).toLowerCase();
  for (const suf of ["ation", "tion", "ings", "ing", "ers", "er", "es", "s"]) {
    if (s.endsWith(suf) && s.length - suf.length >= 4) { s = s.slice(0, -suf.length); break; }
  }
  return s;
}

/** Significant stemmed tokens of a concept name (drops stopwords, numbers, len<3). */
export function significantStems(conceptName) {
  if (typeof conceptName !== "string") return [];
  const out = [];
  for (const raw of conceptName.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || raw.length < 3) continue;
    if (/^\d+$/.test(raw)) continue;
    if (STOPWORDS.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

/** Normalized engine/algorithm filename: lowercase, alphanumerics only. */
function normName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Is this concept already built? Conservative high-precision match.
 * @param {string} conceptName  the candidate concept (often a youtube title).
 * @param {string[]} engineNames engine/algorithm basenames (no extension).
 * @returns {{built:boolean, match?:string, matchedOn?:string}}
 */
export function conceptAlreadyBuilt(conceptName, engineNames) {
  const stems = significantStems(conceptName);
  if (stems.length < 2) return { built: false }; // too vague to auto-judge -> queue it
  const names = Array.isArray(engineNames) ? engineNames : [];
  for (const name of names) {
    const en = normName(name);
    if (en.length < 7) continue;
    for (let i = 0; i < stems.length - 1; i++) {
      const bigram = stems[i] + stems[i + 1];
      if (bigram.length >= 7 && en.includes(bigram)) {
        return { built: true, match: name, matchedOn: bigram };
      }
    }
  }
  return { built: false };
}
