/**
 * fuzzyResolver.ts — Fuzzy skill/trigger resolution for PRISM
 *
 * Provides alias resolution, stemming, and Levenshtein-based fuzzy matching
 * so that near-miss queries (typos, plurals, hyphen vs underscore, abbreviations)
 * still resolve to the correct SKILL_DOMAIN_MAP keys.
 *
 * Used by cadenceExecutor.ts at the 3 lookup points:
 *   1. SKILL_DOMAIN_MAP[action]
 *   2. SKILL_DOMAIN_MAP[lookupKey] (fallback)
 *   3. CHAIN_TRIGGERS[lookupKey]
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// ALIAS MAP — Common abbreviations, synonyms, and alternative spellings
// Maps alternative → canonical SKILL_DOMAIN_MAP key
// ============================================================================
const ALIAS_MAP: Record<string, string> = {
  // Speed/Feed variants
  rpm: "speed_feed",
  sfm: "speed_feed",
  ipm: "speed_feed",
  feedrate: "speed_feed",
  feed_rate: "speed_feed",
  "feeds_and_speeds": "speed_feed",
  speeds: "speed_feed",
  feeds: "speed_feed",
  chipload: "speed_feed",
  chip_load: "speed_feed",

  // Cutting force variants
  force: "cutting_force",
  forces: "cutting_force",
  cut_force: "cutting_force",
  machining_force: "cutting_force",
  kienzle: "cutting_force",

  // Tool variants
  endmill: "tool_get",
  end_mill: "tool_get",
  drill: "tool_get",
  insert: "tool_get",
  cutter: "tool_get",
  tooling: "tool_get",
  tool_info: "tool_get",
  tool_data: "tool_get",
  tool_lookup: "tool_get",

  // Material variants
  material: "material_get",
  mat: "material_get",
  alloy: "material_get",
  steel: "material_get",
  aluminum: "material_get",
  aluminium: "material_get",
  titanium: "material_get",
  inconel: "material_get",
  machinability: "material_get",

  // Strategy variants
  toolpath: "strategy_select",
  cam: "strategy_select",
  strategy: "strategy_select",
  roughing: "strategy_select",
  finishing: "strategy_select",
  hsm: "strategy_select",
  adaptive: "strategy_select",
  trochoidal: "strategy_select",

  // Alarm variants
  alarm: "alarm_decode",
  error_code: "alarm_decode",
  fault: "alarm_decode",
  error: "alarm_decode",
  diagnostic: "alarm_decode",
  fanuc_alarm: "alarm_decode",
  siemens_alarm: "alarm_decode",
  heidenhain_alarm: "alarm_decode",

  // G-code variants
  gcode: "gcode_lookup",
  g_code: "gcode_lookup",
  "g-code": "gcode_lookup",
  mcode: "mcode_lookup",
  m_code: "mcode_lookup",
  "m-code": "mcode_lookup",

  // Session variants
  save: "state_save",
  load: "state_load",
  resume: "resume_session",
  restore: "resume_session",
  checkpoint: "state_save",

  // Safety variants
  safe: "safety",
  safety_check: "safety",
  validate: "compute",
  verify: "compute",
  quality: "compute",
  qa: "compute",

  // Calculation variants
  calc: "compute",
  calculate: "compute",
  formula: "compute",
  equation: "compute",
  math: "compute",

  // Skill system variants
  skill: "skill_find",
  skills: "skill_find",
  find_skill: "skill_find",
  search_skill: "skill_find",
  skill_search: "skill_find",
  skill_lookup: "skill_find",
  recommend: "skill_recommend",

  // Physics variants
  physics: "physics_calc",
  deflection: "physics_calc",
  vibration: "physics_calc",
  chatter: "physics_calc",
  dynamics: "physics_calc",
  fft: "physics_calc",
  modal: "physics_calc",
  frequency: "physics_calc",

  // Optimization variants
  optimize: "process_optimize",
  optimization: "process_optimize",
  optimise: "process_optimize",
  optimisation: "process_optimize",
  improve: "process_optimize",

  // Intelligence variants
  brainstorm: "brainstorm",
  think: "brainstorm",
  analyze: "brainstorm",
  analyse: "brainstorm",
  plan: "brainstorm",
  debug: "debug",
  debugging: "debug",
  troubleshoot: "debug",
  diagnose: "debug",
};

// Load additional aliases from registry file (extensible without code changes)
try {
  const registryPath = path.join(__dirname, "../../../registries/ALIAS_MAP.json");
  if (fs.existsSync(registryPath)) {
    const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
    const ext: Record<string, string> = raw.alias_map || {};
    for (const [alias, canonical] of Object.entries(ext)) {
      if (!ALIAS_MAP[alias]) {
        ALIAS_MAP[alias] = canonical;
      }
    }
  }
} catch { /* non-fatal — hardcoded aliases still work */ }

// ============================================================================
// HNSW METADATA — Load pre-indexed registry entries for fuzzy search (GAP C)
// ============================================================================

interface HnswMetaEntry {
  id: string;
  name: string;
  nameLower: string;
  nameNorm: string;
  category: string;
  descLower: string;
}

let HNSW_META: HnswMetaEntry[] = [];

try {
  const hnswPath = path.join("C:", "PRISM", ".swarm", "hnsw.metadata.json");
  if (fs.existsSync(hnswPath)) {
    const raw: Array<[string, { id?: string; name?: string; category?: string; description?: string }]> =
      JSON.parse(fs.readFileSync(hnswPath, "utf-8"));
    for (const [, meta] of raw) {
      if (!meta?.name) continue;
      const nameLower = (meta.name || "").toLowerCase();
      HNSW_META.push({
        id: meta.id || "",
        name: meta.name,
        nameLower,
        nameNorm: nameLower.replace(/[-\s]+/g, "_").replace(/[^a-z0-9_]/g, ""),
        category: meta.category || "",
        descLower: (meta.description || "").toLowerCase(),
      });
    }
  }
} catch { /* non-fatal — fuzzy falls through to Levenshtein */ }

// ============================================================================
// STEM TABLE — Common suffix patterns to strip for matching
// ============================================================================
const STEM_SUFFIXES = [
  "ation", "tion", "sion", "ment", "ness", "ence", "ance",
  "able", "ible", "ious", "eous", "ical", "ally",
  "ing", "ize", "ise", "ify",
  "ful", "ous", "ive", "ant", "ent",
  "ers", "ors", "ism",
  "er", "or", "ed", "es", "ly",
  "s",  // must be last (shortest)
];

/** Lightweight stemmer — strips common English suffixes */
export function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length < 4) return w;
  for (const suffix of STEM_SUFFIXES) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      return w.slice(0, -suffix.length);
    }
  }
  return w;
}

// ============================================================================
// LEVENSHTEIN DISTANCE — For typo tolerance
// ============================================================================
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  // Optimize: early exit if length difference > 3
  if (Math.abs(m - n) > 3) return Math.abs(m - n);

  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

// ============================================================================
// NORMALIZE — Canonical form for comparison
// ============================================================================
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[-\s]+/g, "_")       // hyphens & spaces → underscore
    .replace(/[^a-z0-9_]/g, "");   // strip non-alphanumeric
}

// ============================================================================
// FUZZY LOOKUP — Main entry point
// Returns array of matching keys from the provided map, ranked by match quality
// ============================================================================
export function fuzzyLookup<T>(
  query: string,
  map: Record<string, T>,
  maxResults: number = 3
): string[] {
  if (!query) return [];

  const normalizedQuery = normalize(query);

  // 1. Exact match (after normalization)
  if (map[normalizedQuery]) return [normalizedQuery];

  // 2. Alias resolution
  const aliasKey = ALIAS_MAP[normalizedQuery] || ALIAS_MAP[query.toLowerCase()];
  if (aliasKey && map[aliasKey]) return [aliasKey];

  // 3. Stem match — stem the query and check all map keys
  const queryStem = stem(normalizedQuery);
  const stemMatches: string[] = [];
  for (const key of Object.keys(map)) {
    if (stem(key) === queryStem) {
      stemMatches.push(key);
    }
  }
  if (stemMatches.length > 0) return stemMatches.slice(0, maxResults);

  // 4. Substring containment (bidirectional)
  const substringMatches: string[] = [];
  for (const key of Object.keys(map)) {
    if (key.length > 2 && normalizedQuery.length > 2) {
      if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
        substringMatches.push(key);
      }
    }
  }
  if (substringMatches.length > 0) {
    // Sort by length similarity to query
    substringMatches.sort((a, b) =>
      Math.abs(a.length - normalizedQuery.length) - Math.abs(b.length - normalizedQuery.length)
    );
    return substringMatches.slice(0, maxResults);
  }

  // 4.5. HNSW metadata search — match against pre-indexed registry entries (GAP C)
  if (HNSW_META.length > 0) {
    const queryStemmed = stem(normalizedQuery);
    const metaHits: Array<{ key: string; score: number }> = [];
    for (const entry of HNSW_META) {
      let score = 0;
      if (entry.nameNorm === normalizedQuery) {
        score = 100;
      } else if (entry.nameNorm.includes(normalizedQuery) || normalizedQuery.includes(entry.nameNorm)) {
        score = 60;
      } else if (stem(entry.nameNorm) === queryStemmed) {
        score = 50;
      } else if (entry.descLower.includes(normalizedQuery)) {
        score = 30;
      }
      if (score > 0) {
        // Map to a canonical key in the provided map, or use category-based key
        const candidateKey = entry.nameNorm;
        const catKey = entry.category ? `${entry.category.toLowerCase()}_${entry.nameNorm}` : entry.nameNorm;
        const matchKey = map[candidateKey] ? candidateKey : map[catKey] ? catKey : null;
        if (matchKey) {
          metaHits.push({ key: matchKey, score });
        }
      }
    }
    if (metaHits.length > 0) {
      metaHits.sort((a, b) => b.score - a.score);
      const seen = new Set<string>();
      const unique = metaHits.filter(h => { if (seen.has(h.key)) return false; seen.add(h.key); return true; });
      return unique.slice(0, maxResults).map(h => h.key);
    }
  }

  // 5. Levenshtein distance (typo tolerance) — only for short keys
  if (normalizedQuery.length >= 3 && normalizedQuery.length <= 30) {
    const maxDist = normalizedQuery.length <= 5 ? 1 : normalizedQuery.length <= 10 ? 2 : 3;
    const levMatches: Array<{ key: string; dist: number }> = [];

    for (const key of Object.keys(map)) {
      // Skip keys that are too different in length
      if (Math.abs(key.length - normalizedQuery.length) > maxDist) continue;
      const dist = levenshtein(normalizedQuery, key);
      if (dist <= maxDist) {
        levMatches.push({ key, dist });
      }
    }

    if (levMatches.length > 0) {
      levMatches.sort((a, b) => a.dist - b.dist);
      return levMatches.slice(0, maxResults).map(m => m.key);
    }
  }

  // 6. Word-overlap for multi-word queries
  const queryWords = normalizedQuery.split("_").filter(w => w.length > 2);
  if (queryWords.length >= 2) {
    const wordMatches: Array<{ key: string; overlap: number }> = [];
    for (const key of Object.keys(map)) {
      const keyWords = key.split("_").filter(w => w.length > 2);
      const overlap = queryWords.filter(qw =>
        keyWords.some(kw => kw === qw || stem(kw) === stem(qw))
      ).length;
      if (overlap >= 2 || (overlap >= 1 && queryWords.length <= 2)) {
        wordMatches.push({ key, overlap });
      }
    }
    if (wordMatches.length > 0) {
      wordMatches.sort((a, b) => b.overlap - a.overlap);
      return wordMatches.slice(0, maxResults).map(m => m.key);
    }
  }

  // No match found
  return [];
}

// ============================================================================
// CONVENIENCE: Lookup a single best match and return its value
// ============================================================================
export function fuzzyGet<T>(
  query: string,
  map: Record<string, T>
): T | undefined {
  const keys = fuzzyLookup(query, map, 1);
  return keys.length > 0 ? map[keys[0]] : undefined;
}

// ============================================================================
// CONVENIENCE: Lookup multiple matches and merge all values (for string[] maps)
// ============================================================================
export function fuzzyGetAll(
  query: string,
  map: Record<string, string[]>,
  maxResults: number = 3
): string[] {
  const keys = fuzzyLookup(query, map, maxResults);
  const merged = new Set<string>();
  for (const key of keys) {
    for (const val of map[key] || []) {
      merged.add(val);
    }
  }
  return [...merged];
}
