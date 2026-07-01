/**
 * fleet-recurring-patterns.mjs -- PURE cross-session pattern aggregator for fleet hygiene.
 *
 * Detects patterns that only emerge ACROSS many sessions/slots, which no single-session
 * tool surfaces: recurring regression classes (the same bug re-broken under different SHAs),
 * scope-focus (which [SCOPE] is consuming the most units), fleet-wide citation frequency
 * (which wiki/memory nodes the whole fleet leans on), and fix-then-rebreak loops.
 *
 * This module is PURE: no filesystem, no process spawning, no clock. All IO -- reading
 * handoffs / git log / memory dir -- lives in the CLI wrapper (fleet-recurring-patterns-digest.mjs),
 * which feeds raw strings in and writes the rendered digest out. Keeping the analysis pure
 * makes it hermetically testable with real reference values (no mocks).
 *
 * Karpathy discipline: CLASSIFY (text-aggregation/clustering) -> TECHNIQUE (normalize ->
 * token-set -> union-find containment cluster) -> EDGE CASES (null/empty/non-array/non-string,
 * empty-signal lines, duplicate links) -> handled from line 1.
 */

export const DEFAULT_MIN_REGRESSION_HITS = 3;
export const DEFAULT_MIN_SCOPE_HITS = 5;
export const DEFAULT_MIN_CITATION_HITS = 3;
export const DEFAULT_FINGERPRINT_TOKEN_LIMIT = 8;
export const DEFAULT_FINGERPRINT_MIN_TOKEN_LEN = 4;
export const DEFAULT_TOP_LIMIT = 20;
export const DEFAULT_CITATION_RENDER_LIMIT = 12;
export const SAMPLE_CAP_PER_GROUP = 3;
export const SAMPLE_MAX_LEN = 140;
export const DEFAULT_JACCARD_THRESHOLD = 0.5;

// [SCOPE]/U-ID -- the "[MAIN]" prefix is skipped because it is not followed by /U-.
// First char [A-Z] then zero+ more, so single-letter scopes (e.g. "[X]") still parse.
const SCOPE_RE = /\[([A-Z][A-Z0-9-]*)\]\/(U-[A-Z0-9-]+)/;
// [[name]] or [[name|alias]] -> capture the canonical name (before the pipe).
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Strip everything volatile (dates, SHAs, HRESULTs, versions, pids, code spans, punctuation)
 * so two lines describing the SAME regression with different numbers normalize identically.
 */
function normalizeForFingerprint(line) {
  let s = String(line).toLowerCase();
  s = s.replace(/`[^`]*`/g, " ");              // inline code spans
  s = s.replace(/\bu-[a-z0-9-]+/gi, " ");      // unit ids (U-XXX)
  s = s.replace(/0x[0-9a-f]+/gi, " ");         // hex / HRESULT codes
  s = s.replace(/\b[0-9a-f]{7,}\b/gi, " ");    // git SHAs (7+ hex chars)
  s = s.replace(/\bv?\d+\.\d+(?:\.\d+)*\b/g, " "); // semver-ish versions
  s = s.replace(/\d+/g, " ");                  // bare digits (dates, pids, counts)
  s = s.replace(/[^a-z0-9]+/g, " ");           // punctuation -> space
  return s.trim();
}

/** Significant tokens (>= minLen chars) of a normalized line, in order. */
export function fingerprintTokens(line, opts = {}) {
  if (typeof line !== "string" || !line) return [];
  const minLen = opts.minTokenLen ?? DEFAULT_FINGERPRINT_MIN_TOKEN_LEN;
  return normalizeForFingerprint(line)
    .split(/\s+/)
    .filter((t) => t.length >= minLen);
}

/**
 * A stable, order-independent fingerprint string for a regression line:
 * unique significant tokens, sorted, capped, joined. Two lines that differ only in
 * SHAs/dates/pids/versions produce the same fingerprint.
 */
export function regressionFingerprint(line, opts = {}) {
  if (typeof line !== "string" || !line) return "";
  const limit = opts.tokenLimit ?? DEFAULT_FINGERPRINT_TOKEN_LIMIT;
  const toks = fingerprintTokens(line, opts);
  if (!toks.length) return "";
  return [...new Set(toks)].sort().slice(0, limit).join("|");
}

/** True when `a` is contained in `b` (or vice-versa), or their Jaccard >= threshold. */
function similarSets(a, b, jThresh = DEFAULT_JACCARD_THRESHOLD) {
  if (a.size === 0 || b.size === 0) return false;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const t of small) if (large.has(t)) inter++;
  if (inter === small.size) return true; // full containment of the smaller set
  const union = a.size + b.size - inter;
  return union > 0 && inter / union >= jThresh;
}

/**
 * Cluster regression lines into recurring classes. Lines cluster when their token-sets are
 * containment-related or Jaccard-similar (so "X timeout" and "X timeout again" group together,
 * which a naive exact-fingerprint match would miss). Groups below minHits are dropped.
 * Returns [{ fingerprint, count, samples[] }] sorted by count desc.
 */
export function clusterRegressions(lines, minHits = DEFAULT_MIN_REGRESSION_HITS, opts = {}) {
  if (!Array.isArray(lines)) return [];
  const jThresh = opts.jaccardThreshold ?? DEFAULT_JACCARD_THRESHOLD;

  const entries = [];
  for (const line of lines) {
    if (typeof line !== "string" || !line) continue;
    const set = new Set(fingerprintTokens(line, opts));
    if (set.size === 0) continue; // no signal -> not a clusterable regression
    entries.push({ line, set });
  }

  // Union-find over similarity edges.
  const parent = entries.map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (similarSets(entries[i].set, entries[j].set, jThresh)) union(i, j);
    }
  }

  const byRoot = new Map();
  for (let i = 0; i < entries.length; i++) {
    const r = find(i);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(entries[i]);
  }

  const groups = [];
  for (const members of byRoot.values()) {
    if (members.length < minHits) continue;
    // Representative fingerprint = the smallest (most generic) member's sorted token set.
    let rep = members[0];
    for (const m of members) if (m.set.size < rep.set.size) rep = m;
    const fingerprint = [...rep.set].sort().join("|");
    const samples = members
      .slice(0, SAMPLE_CAP_PER_GROUP)
      .map((m) => (m.line.length > SAMPLE_MAX_LEN ? m.line.slice(0, SAMPLE_MAX_LEN) + "..." : m.line));
    groups.push({ fingerprint, count: members.length, samples });
  }
  groups.sort((a, b) => b.count - a.count);
  return groups;
}

/** Parse a commit subject into { scope, unit } or null. */
export function extractScope(subject) {
  if (typeof subject !== "string") return null;
  const m = subject.match(SCOPE_RE);
  if (!m) return null;
  return { scope: m[1], unit: m[2] };
}

/**
 * Tally commit subjects by [SCOPE], counting total commits and distinct units per scope.
 * Drops scopes below minHits. Returns [{ scope, count, distinctUnits }] sorted by count desc.
 */
export function tallyScopes(subjects, minHits = DEFAULT_MIN_SCOPE_HITS) {
  if (!Array.isArray(subjects)) return [];
  const byScope = new Map();
  for (const s of subjects) {
    const r = extractScope(s);
    if (!r) continue;
    if (!byScope.has(r.scope)) byScope.set(r.scope, { scope: r.scope, count: 0, units: new Set() });
    const e = byScope.get(r.scope);
    e.count++;
    e.units.add(r.unit);
  }
  const out = [];
  for (const e of byScope.values()) {
    if (e.count < minHits) continue;
    out.push({ scope: e.scope, count: e.count, distinctUnits: e.units.size });
  }
  out.sort((a, b) => b.count - a.count || a.scope.localeCompare(b.scope));
  return out;
}

/** Extract all [[wiki-link]] canonical names (lowercased, in order, duplicates kept). */
export function extractWikiLinks(text) {
  if (typeof text !== "string") return [];
  const out = [];
  WIKILINK_RE.lastIndex = 0;
  let m;
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    const name = m[1].trim().toLowerCase();
    if (name) out.push(name);
  }
  return out;
}

/**
 * Count citation occurrences, drop those below minHits, sort by count desc (ties: name asc).
 * Non-string entries are skipped. Returns [{ link, count }].
 */
export function tallyCitations(links, minHits = DEFAULT_MIN_CITATION_HITS) {
  if (!Array.isArray(links)) return [];
  const counts = new Map();
  for (const l of links) {
    if (typeof l !== "string" || !l) continue;
    counts.set(l, (counts.get(l) || 0) + 1);
  }
  const out = [];
  for (const [link, count] of counts) if (count >= minHits) out.push({ link, count });
  out.sort((a, b) => b.count - a.count || a.link.localeCompare(b.link));
  return out;
}

/**
 * Detect fix-then-rebreak loops: a [SCOPE] that shipped a commit containing "fix" AND later
 * appears in a regression line. Surfaces scopes that keep re-breaking what they fixed.
 * Returns [{ scope, regressionHits }] sorted by regressionHits desc.
 */
export function detectFixRebreakLoops(commitSubjects, regressionLines) {
  if (!Array.isArray(commitSubjects) || !Array.isArray(regressionLines)) return [];

  const fixScopes = new Set();
  for (const c of commitSubjects) {
    if (typeof c !== "string") continue;
    if (!/\bfix\b/i.test(c)) continue;
    const r = extractScope(c);
    if (r) fixScopes.add(r.scope);
  }
  if (fixScopes.size === 0) return [];

  const hits = new Map();
  for (const line of regressionLines) {
    if (typeof line !== "string") continue;
    const r = extractScope(line);
    if (r && fixScopes.has(r.scope)) hits.set(r.scope, (hits.get(r.scope) || 0) + 1);
  }

  const out = [];
  for (const scope of fixScopes) {
    const n = hits.get(scope) || 0;
    if (n > 0) out.push({ scope, regressionHits: n });
  }
  out.sort((a, b) => b.regressionHits - a.regressionHits || a.scope.localeCompare(b.scope));
  return out;
}

/**
 * Build the full digest object from raw aggregated inputs.
 * raw: { regressionLines[], commitSubjects[], allCitations[], regressionFileCount }
 * opts: { windowDays, generatedAtMs, minRegressionHits, minScopeHits, minCitationHits, topLimit }
 */
export function buildDigest(raw = {}, opts = {}) {
  const regressionLines = Array.isArray(raw.regressionLines) ? raw.regressionLines : [];
  const commitSubjects = Array.isArray(raw.commitSubjects) ? raw.commitSubjects : [];
  const allCitations = Array.isArray(raw.allCitations) ? raw.allCitations : [];
  const regressionFileCount = Number.isFinite(raw.regressionFileCount) ? raw.regressionFileCount : 0;

  const minRegressionHits = opts.minRegressionHits ?? DEFAULT_MIN_REGRESSION_HITS;
  const minScopeHits = opts.minScopeHits ?? DEFAULT_MIN_SCOPE_HITS;
  const minCitationHits = opts.minCitationHits ?? DEFAULT_MIN_CITATION_HITS;
  const topLimit = opts.topLimit ?? DEFAULT_TOP_LIMIT;

  return {
    schemaVersion: "1.0.0",
    generatedAtMs: opts.generatedAtMs ?? null,
    windowDays: opts.windowDays ?? null,
    regressionFileCount,
    commitCount: commitSubjects.length,
    citationCount: allCitations.length,
    regressionPatterns: clusterRegressions(regressionLines, minRegressionHits, opts).slice(0, topLimit),
    scopePatterns: tallyScopes(commitSubjects, minScopeHits).slice(0, topLimit),
    topCitations: tallyCitations(allCitations, minCitationHits).slice(0, topLimit),
    fixRebreakLoops: detectFixRebreakLoops(commitSubjects, regressionLines),
    thresholds: { minRegressionHits, minScopeHits, minCitationHits },
  };
}

/** Render a digest object as a markdown report. Returns "" for non-object input. */
export function renderDigest(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return "";
  const L = [];
  const win = d.windowDays != null ? `${d.windowDays}d` : "all-time";

  L.push("# FLEET RECURRING-PATTERNS DIGEST");
  L.push("");
  L.push("## Summary");
  L.push(`- window: ${win}`);
  L.push(
    `- commits analyzed: ${d.commitCount ?? 0} - regression files: ${d.regressionFileCount ?? 0} - citations: ${d.citationCount ?? 0}`
  );
  L.push(
    `- regression classes: ${(d.regressionPatterns || []).length} - scope-focus: ${(d.scopePatterns || []).length} - top citations: ${(d.topCitations || []).length}`
  );
  L.push("");

  L.push("## Recurring regression classes");
  if (!(d.regressionPatterns || []).length) {
    L.push("_none above threshold._");
  } else {
    for (const g of d.regressionPatterns) {
      L.push(`- **x${g.count}** \`${g.fingerprint}\``);
      for (const s of g.samples || []) L.push(`    - ${s}`);
    }
  }
  L.push("");

  L.push("## Scope focus");
  if (!(d.scopePatterns || []).length) {
    L.push("_none above threshold._");
  } else {
    for (const s of d.scopePatterns) {
      L.push(`- **${s.scope}** -- ${s.count} commits / ${s.distinctUnits} distinct units`);
    }
  }
  L.push("");

  L.push("## Top fleet-wide citations");
  if (!(d.topCitations || []).length) {
    L.push("_none above threshold._");
  } else {
    for (const c of (d.topCitations || []).slice(0, DEFAULT_CITATION_RENDER_LIMIT)) {
      L.push(`- [[${c.link}]] -- ${c.count}`);
    }
  }

  if ((d.fixRebreakLoops || []).length) {
    L.push("");
    L.push("## Fix-then-rebreak loops");
    for (const f of d.fixRebreakLoops) {
      L.push(`- **${f.scope}** -- ${f.regressionHits} regression mention(s) after a fix commit`);
    }
  }

  L.push("");
  return L.join("\n");
}
