/**
 * SkillMarketplaceScannerEngine — U-SKU07 (SKILLS-UTILIZATION-MS0).
 *
 * @eng_khairallah1 Phase-1: *"Browse skillsmp.com or github.com/anthropics/skills
 * and find a Skill relevant to your work. There are over 80,000 community Skills…
 * most people have never installed a single one."* PRISM ships ~500 home-grown
 * skills and is blind to the community ecosystem. This engine periodically scans
 * the major skill collections, scores each listing against PRISM's domain
 * vocabulary, dedup-checks it against the existing library, and emits *install
 * candidates* — never installs anything. (Installing a community skill is a human
 * / forge action that goes through `harness-security-audit`; this engine only
 * recommends.)
 *
 * Sources (the spec's set): `anthropics/skills`, `wshobson/agents`,
 * `obra/superpowers` (public GitHub READMEs — fetchable), and `skillsmp.com`
 * (a JS-rendered SPA — its raw HTML carries no listings, so when Playwright is
 * unavailable that source is *skipped and flagged*, never silently degraded).
 *
 * Separation of concerns: this engine does **no I/O**. The caller (the
 * `prism_knowledge:skill_marketplace_scan` action, or `scripts/skill-marketplace-
 * scan.mjs`) fetches each source's content (Node `fetch` for the GitHub READMEs)
 * and passes `{id, url, content | fetchError}` records to {@link scan}. The engine
 * parses → scores → dedups → recommends, and {@link renderMarkdown} renders the
 * human report. Tests inject pre-fetched fixture content; the round-trip never
 * touches the network.
 *
 * Parsing is deliberately *tolerant*: README formats drift, and a SPA's shell HTML
 * yields nothing — when a source produces 0 listings the result records
 * `source_parse_failed` for it (per the adversarial spec: "flag `source_parse_failed`,
 * not 'no skills available'"). Per-source listing cap (default 200) keeps an
 * 80,000-skill marketplace bounded.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SKILL_QUALITY_REGISTRY_PATH } from "../registries/SkillQualityRegistryBuilder.js";

// ── constants ──────────────────────────────────────────────────────────────

export const SKILL_MARKETPLACE_SCAN_SCHEMA_VERSION = "1.0.0";

/** Per-source cap on extracted listings — an 80k-skill marketplace must not blow up the candidates file. */
const DEFAULT_PER_SOURCE_CAP = 200;
/** Default relevance floor: a candidate is "relevant" iff `score ≥ this` ⇒ with the 1-hit = 1/3 scoring, that's ≥2 domain-keyword hits. */
const DEFAULT_MIN_RELEVANCE = 0.5;
/** Domain hits ⇒ relevance score: `min(1, hits / SATURATION_HITS)`. 3 hits saturates at 1.0. */
const RELEVANCE_SATURATION_HITS = 3;
/** A candidate scoring at/above this is recommended "install" (vs "study") when also novel — i.e. it's saturated-relevant. */
const STRONG_RELEVANCE_FLOOR = 0.99;
/** Two normalized strings sharing ≥ this many significant tokens ⇒ `partial-overlap` dedup verdict. */
const DEDUP_SHARED_TOKEN_FLOOR = 3;
/** …or sharing ≥ this fraction of the candidate's significant tokens. */
const DEDUP_SHARED_TOKEN_FRACTION = 0.5;
/** Significant-token min length (drops "a", "of", "to", …). */
const MIN_SIGNIFICANT_TOKEN_LEN = 3;
/** A "name" longer than this is almost certainly a sentence/paragraph that matched the parser by accident — drop it. */
const MAX_LISTING_NAME_LEN = 120;
/** A description cell longer than this is truncated in the extracted listing. */
const MAX_LISTING_DESC_LEN = 400;

const MARKETPLACE_OUTPUT_DIR_PARTS = ["state", "shared"];
// engine at mcp-server/src/engines/X.ts (or mcp-server/dist/engines/X.js) → ../../../.. = repo root
const REPO_ROOT = process.env.PRISM_REPO_ROOT || path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
/** Where the dated candidates artifacts land (the caller writes them; exported for callers). */
export const SKILL_MARKETPLACE_OUTPUT_DIR = path.join(REPO_ROOT, ...MARKETPLACE_OUTPUT_DIR_PARTS);

/**
 * PRISM's domain vocabulary, split by how it must match a haystack so short acronyms don't
 * spuriously substring-match (e.g. `g-code` inside `receivin​g-code-review`, `cad` inside `cadence`):
 *  - {@link VOCAB_BOTH_BOUNDARIES}: short acronyms — require a word boundary on *both* sides (`\bcnc\b`).
 *  - {@link VOCAB_LEFT_BOUNDARY}: descriptive terms — require a boundary on the *left* only, so plurals /
 *    gerunds match (`milling` ⊃ `milling`, `lathe` matches `lathes`, `machining` matches `machining`).
 * {@link PRISM_DOMAIN_VOCAB} is the flattened union (exported for inspection/tests).
 */
const VOCAB_BOTH_BOUNDARIES: readonly string[] = [
  "cnc", "cad", "cam", "edm", "wedm", "cmm", "spc", "gd&t", "gdt", "nx", "bom", "ocr", "ci/cd",
  "g-code", "gcode", "nc code", "pdf",
];
const VOCAB_LEFT_BOUNDARY: readonly string[] = [
  // manufacturing core
  "manufacturing", "machining", "machinist", "milling", "turning", "lathe", "swiss",
  "wire edm", "sinker", "grinding", "grinder", "welding", "welder",
  // CAD/CAM
  "post processor", "postprocessor", "post-processor", "toolpath", "tool path", "fixture", "workholding",
  "feeds and speeds", "speeds and feeds", "feed rate", "spindle", "carbide", "kienzle", "taylor",
  "tool life", "chip load", "chipload", "surface finish",
  // metrology / quality
  "metrology", "tolerance", "first article", "inspection",
  // documents / blueprints
  "blueprint", "engineering drawing", "title block", "document processing",
  // dev domains PRISM cares about
  "code review", "code-review", "test coverage", "unit test", "refactor", "typescript", "linter",
  "pull request", "github actions", "schema", "json schema", "monorepo", "estimating", "quoting",
];
export const PRISM_DOMAIN_VOCAB: readonly string[] = [...VOCAB_BOTH_BOUNDARIES, ...VOCAB_LEFT_BOUNDARY];

function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
/** Precompiled `{term → RegExp}` — built once. Left/both boundary per the vocab split above. */
const VOCAB_REGEXES: ReadonlyArray<{ term: string; re: RegExp }> = [
  ...VOCAB_BOTH_BOUNDARIES.map((t) => ({ term: t, re: new RegExp(`(?:^|[^a-z0-9])${escapeRegex(t)}(?:[^a-z0-9]|$)`, "i") })),
  ...VOCAB_LEFT_BOUNDARY.map((t) => ({ term: t, re: new RegExp(`(?:^|[^a-z0-9])${escapeRegex(t)}`, "i") })),
];

// ── types ──────────────────────────────────────────────────────────────────

export type MarketplaceSourceId = "anthropics-skills" | "wshobson-agents" | "obra-superpowers" | "skillsmp" | string;
export type Recommendation = "install" | "study" | "already-covered" | "skip";
export type DedupVerdict = "novel" | "partial-overlap" | "already-covered";

/** Caller-supplied per source: either fetched `content`, or a `fetchError` string explaining why it isn't here. */
export interface SourceFetch {
  id: MarketplaceSourceId;
  url: string;
  /** Raw fetched body (markdown for the GitHub READMEs; shell HTML for a SPA). Mutually exclusive with `fetchError`. */
  content?: string;
  /** Set instead of `content` when the fetch failed (network error, 404, JS-gated SPA we won't render, …). */
  fetchError?: string;
}

export interface RawListing { name: string; description: string; url: string | null; source: MarketplaceSourceId; }

export interface ScoredCandidate {
  name: string;
  description: string;
  url: string | null;
  source: MarketplaceSourceId;
  domainHits: string[];
  relevanceScore: number; // 0..1
  dedupVerdict: DedupVerdict;
  alreadyCoveredBy: string | null;
  recommendation: Recommendation;
}

export interface SkillMarketplaceScanResult {
  schemaVersion: string;
  generatedAt: string;
  sourcesScanned: MarketplaceSourceId[];
  sourcesSkipped: Array<{ id: MarketplaceSourceId; reason: string }>;
  totalListings: number;
  relevantCount: number;
  candidates: ScoredCandidate[];
  byRecommendation: Record<Recommendation, number>;
  perSourceCap: number;
  cappedSources: MarketplaceSourceId[];
  advisories: string[];
  sources: { registryPath: string; registrySkillCount: number };
}

export interface ScanOptions {
  sources: SourceFetch[];
  minRelevance?: number;
  perSourceCap?: number;
  /** Override the registry path used for dedup (default: the canonical `SKILL_QUALITY_REGISTRY_PATH`). */
  registryPath?: string;
  /** Inject the registry's skills directly (tests) — `[{name, description}]`. When set, `registryPath` is ignored. */
  registrySkillsOverride?: Array<{ name: string; description?: string }>;
  /** Clock override (tests). */
  nowMs?: number;
}

// ── helpers ────────────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function significantTokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= MIN_SIGNIFICANT_TOKEN_LEN),
  );
}

function intersectionSize<T>(a: Set<T>, b: Set<T>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

/**
 * Tolerant README/markdown listing extractor. Handles, in order of preference:
 *  - markdown table rows: `| [name](url) | description |` or `| name | description |`
 *  - headings with a following description line: `### name` / `#### name` then a non-blank line
 *  - bullet links: `- [name](url) — description` / `* [name](url): description`
 *  - bare bullets: `- name — description` / `* name: description`
 * A SPA's shell HTML matches none of these ⇒ returns `[]` (the caller flags `source_parse_failed`).
 */
export function parseMarketplaceListing(content: string, source: MarketplaceSourceId, cap = DEFAULT_PER_SOURCE_CAP): RawListing[] {
  const out: RawListing[] = [];
  const seen = new Set<string>();
  const push = (rawName: string, desc: string, url: string | null) => {
    const name = rawName.replace(/[`*_]/g, "").trim();
    if (!name || name.length > MAX_LISTING_NAME_LEN || /^https?:\/\//i.test(name)) return;
    const key = normalizeName(name) + "|" + source;
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ name, description: desc.replace(/[`*_]/g, "").trim().slice(0, MAX_LISTING_DESC_LEN), url, source });
  };
  if (typeof content !== "string" || !content.trim()) return out;
  const lines = content.split(/\r?\n/);
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/;
  for (let i = 0; i < lines.length && out.length < cap; i++) {
    const line = lines[i];
    // table row
    if (/^\s*\|.*\|\s*$/.test(line) && !/^\s*\|[\s:|-]+\|\s*$/.test(line)) {
      const cells = line.split("|").map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cells.length >= 1) {
        const m = cells[0].match(linkRe);
        const name = m ? m[1] : cells[0];
        const url = m ? m[2] : null;
        const desc = cells.slice(1).join(" — ");
        if (name && !/^name$/i.test(name) && !/^skill$/i.test(name)) { push(name, desc, url); continue; }
      }
    }
    // heading + description line
    const h = line.match(/^#{2,5}\s+(.+?)\s*#*\s*$/);
    if (h) {
      const m = h[1].match(linkRe);
      const name = m ? m[1] : h[1];
      const url = m ? m[2] : null;
      let desc = "";
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const t = lines[j].trim();
        if (!t) continue;
        if (/^#{1,6}\s/.test(t) || /^\s*\|/.test(t)) break;
        desc = t.replace(/^[-*]\s+/, ""); break;
      }
      push(name, desc, url);
      continue;
    }
    // bullet (link or bare): "- [name](url) — desc" / "* name: desc"
    const b = line.match(/^\s*[-*+]\s+(.+)$/);
    if (b) {
      const body = b[1];
      const m = body.match(linkRe);
      if (m) {
        const after = body.slice(body.indexOf(m[0]) + m[0].length).replace(/^[\s:—–-]+/, "");
        push(m[1], after, m[2]);
        continue;
      }
      // "name: desc"  or  "name — desc" / "name – desc" / "name - desc"  — the separator must be flanked by
      // whitespace (or, for ':', preceded by optional whitespace) so a hyphen *inside* the name isn't a split point.
      const sep = body.match(/^(.{2,80}?)(?:\s*:\s+|\s+(?:[—–]|--?)\s+)(.+)$/);
      if (sep) { push(sep[1], sep[2], null); continue; }
    }
  }
  return out;
}

// ── the engine ─────────────────────────────────────────────────────────────

export class SkillMarketplaceScannerEngine {
  /** Match a name+description against the PRISM domain vocab (word-boundary-aware); returns the distinct hits and a 0..1 score. */
  scoreRelevance(name: string, description: string): { hits: string[]; score: number } {
    const hay = `${name} ${description}`.toLowerCase();
    const hits: string[] = [];
    for (const { term, re } of VOCAB_REGEXES) if (re.test(hay) && !hits.includes(term)) hits.push(term);
    return { hits, score: Math.min(1, hits.length / RELEVANCE_SATURATION_HITS) };
  }

  /**
   * Dedup a candidate community skill against the PRISM library:
   *  - exact normalized-name match ⇒ `already-covered`
   *  - the candidate's significant-token set ⊇ some PRISM skill's significant-token set (the PRISM skill having
   *    ≥1 significant token) ⇒ `already-covered` by the *most-specific* such skill (e.g. `lathe-thread-wizard`
   *    ⊇ {lathe, thread} ⇒ covered by `lathe-thread`). This is intentionally a NAME-token superset, not a
   *    substring match — substring-matching `gcode` ⊂ `receivingcodereview` was a real false positive.
   *  - else, ≥`DEDUP_SHARED_TOKEN_FLOOR` shared name+description tokens (or ≥`DEDUP_SHARED_TOKEN_FRACTION` of
   *    the candidate's) ⇒ `partial-overlap` with the best-overlapping skill
   *  - else ⇒ `novel`
   */
  dedupAgainstLibrary(name: string, description: string, librarySkills: Array<{ name: string; description?: string }>): { verdict: DedupVerdict; coveredBy: string | null } {
    const candNorm = normalizeName(name);
    const candNameTokens = significantTokens(name);
    const candAllTokens = significantTokens(`${name} ${description}`);
    let coveringSkill: { name: string; tokenCount: number } | null = null;
    let bestPartial: { covered: string; shared: number } | null = null;
    for (const s of librarySkills) {
      const sNorm = normalizeName(s.name);
      if (!sNorm || !candNorm) continue;
      if (sNorm === candNorm) return { verdict: "already-covered", coveredBy: s.name };
      const sNameTokens = significantTokens(s.name);
      if (sNameTokens.size > 0 && [...sNameTokens].every((t) => candNameTokens.has(t))) {
        if (!coveringSkill || sNameTokens.size > coveringSkill.tokenCount) coveringSkill = { name: s.name, tokenCount: sNameTokens.size };
        continue;
      }
      const shared = intersectionSize(candAllTokens, significantTokens(`${s.name} ${s.description ?? ""}`));
      const enough = shared >= DEDUP_SHARED_TOKEN_FLOOR || (candAllTokens.size > 0 && shared / candAllTokens.size >= DEDUP_SHARED_TOKEN_FRACTION);
      if (enough && (!bestPartial || shared > bestPartial.shared)) bestPartial = { covered: s.name, shared };
    }
    if (coveringSkill) return { verdict: "already-covered", coveredBy: coveringSkill.name };
    if (bestPartial) return { verdict: "partial-overlap", coveredBy: bestPartial.covered };
    return { verdict: "novel", coveredBy: null };
  }

  private recommendationFor(score: number, minRelevance: number, dedup: DedupVerdict): Recommendation {
    if (score < minRelevance) return "skip";
    if (dedup === "already-covered") return "already-covered";
    if (dedup === "partial-overlap") return "study";
    return score >= STRONG_RELEVANCE_FLOOR ? "install" : "study";
  }

  /**
   * Scan the supplied (already-fetched) sources. No I/O — pure transform over the inputs plus a read of
   * SKILL_QUALITY_REGISTRY.json for dedup (unless `registrySkillsOverride` is supplied).
   */
  scan(opts: ScanOptions): SkillMarketplaceScanResult {
    const nowMs = opts.nowMs ?? Date.now();
    const minRelevance = typeof opts.minRelevance === "number" && Number.isFinite(opts.minRelevance) ? opts.minRelevance : DEFAULT_MIN_RELEVANCE;
    const perSourceCap = typeof opts.perSourceCap === "number" && opts.perSourceCap > 0 ? Math.floor(opts.perSourceCap) : DEFAULT_PER_SOURCE_CAP;
    const advisories: string[] = [];

    // —— PRISM skill library (for dedup) ——
    let librarySkills: Array<{ name: string; description?: string }>;
    const registryPath = opts.registryPath ?? SKILL_QUALITY_REGISTRY_PATH;
    if (opts.registrySkillsOverride) {
      librarySkills = opts.registrySkillsOverride;
    } else {
      try {
        const reg = JSON.parse(fs.readFileSync(registryPath, "utf-8")) as { skills?: unknown };
        const skills = Array.isArray(reg.skills) ? reg.skills : [];
        librarySkills = skills
          .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
          .map((s) => ({ name: typeof s.name === "string" ? s.name : "", description: typeof s.description === "string" ? s.description : "" }))
          .filter((s) => s.name);
      } catch {
        librarySkills = [];
        advisories.push(`Could not read SKILL_QUALITY_REGISTRY.json at ${registryPath} — dedup against the existing library is disabled (every candidate will read 'novel'). Run prism_dev:skill_quality_registry_build first.`);
      }
    }

    // —— per-source parse ——
    const sourcesScanned: MarketplaceSourceId[] = [];
    const sourcesSkipped: Array<{ id: MarketplaceSourceId; reason: string }> = [];
    const cappedSources: MarketplaceSourceId[] = [];
    const allListings: RawListing[] = [];
    for (const src of opts.sources ?? []) {
      if (src.fetchError) { sourcesSkipped.push({ id: src.id, reason: `fetch failed: ${src.fetchError}` }); continue; }
      if (typeof src.content !== "string" || !src.content.trim()) { sourcesSkipped.push({ id: src.id, reason: "empty content" }); continue; }
      const listings = parseMarketplaceListing(src.content, src.id, perSourceCap + 1);
      if (listings.length === 0) { sourcesSkipped.push({ id: src.id, reason: "source_parse_failed (0 listings extracted — HTML/format unrecognized; if this is a JS-rendered SPA it needs Playwright, not a raw fetch)" }); continue; }
      sourcesScanned.push(src.id);
      if (listings.length > perSourceCap) { cappedSources.push(src.id); listings.length = perSourceCap; }
      allListings.push(...listings);
    }
    if (sourcesScanned.length === 0) advisories.push("No source yielded any listings — every requested source failed to fetch or parse. This is a hard miss, not 'no community skills exist'; check source URLs and reachability.");
    if (cappedSources.length) advisories.push(`Per-source listing cap (${perSourceCap}) hit for: ${cappedSources.join(", ")} — additional listings deferred to the next run.`);
    if (opts.sources?.some((s) => normalizeName(String(s.id)) === "skillsmp" && (s.fetchError || (typeof s.content === "string" && parseMarketplaceListing(s.content, s.id, 1).length === 0)))) {
      advisories.push("skillsmp.com is a JS-rendered SPA — a raw fetch returns only the app shell. Run this scan with the Playwright MCP available to include skillsmp.com, or accept the GitHub-collections-only view.");
    }

    // —— score + dedup + recommend ——
    const candidates: ScoredCandidate[] = [];
    let relevantCount = 0;
    for (const l of allListings) {
      const { hits, score } = this.scoreRelevance(l.name, l.description);
      if (score < minRelevance) {
        candidates.push({ ...l, domainHits: hits, relevanceScore: score, dedupVerdict: "novel", alreadyCoveredBy: null, recommendation: "skip" });
        continue;
      }
      relevantCount++;
      const { verdict, coveredBy } = this.dedupAgainstLibrary(l.name, l.description, librarySkills);
      candidates.push({ ...l, domainHits: hits, relevanceScore: score, dedupVerdict: verdict, alreadyCoveredBy: coveredBy, recommendation: this.recommendationFor(score, minRelevance, verdict) });
    }
    // sort: install → study → already-covered → skip; within a bucket, higher relevance first, then name
    const recRank: Record<Recommendation, number> = { install: 0, study: 1, "already-covered": 2, skip: 3 };
    candidates.sort((a, b) => (recRank[a.recommendation] - recRank[b.recommendation]) || (b.relevanceScore - a.relevanceScore) || a.name.localeCompare(b.name));

    const byRecommendation: Record<Recommendation, number> = { install: 0, study: 0, "already-covered": 0, skip: 0 };
    for (const c of candidates) byRecommendation[c.recommendation]++;
    if (byRecommendation.install + byRecommendation.study === 0 && sourcesScanned.length > 0) {
      advisories.push("0 install/study candidates — either the community collections currently hold nothing in PRISM's domains, or the relevance scorer is too strict for the fetched content. The recommendation is informational; nothing is ever auto-installed.");
    }

    return {
      schemaVersion: SKILL_MARKETPLACE_SCAN_SCHEMA_VERSION,
      generatedAt: new Date(nowMs).toISOString(),
      sourcesScanned, sourcesSkipped,
      totalListings: allListings.length, relevantCount, candidates,
      byRecommendation, perSourceCap, cappedSources, advisories,
      sources: { registryPath, registrySkillCount: librarySkills.length },
    };
  }

  /** Render the human-facing candidates report. */
  renderMarkdown(r: SkillMarketplaceScanResult, opts: { dateLabel?: string; maxRows?: number } = {}): string {
    const dateLabel = opts.dateLabel ?? r.generatedAt.slice(0, 10);
    const maxRows = opts.maxRows ?? 80;
    const L: string[] = [];
    L.push(`# PRISM Skill-Marketplace Scan — ${dateLabel}`);
    L.push("");
    L.push(`> @eng_khairallah1 Phase-1: *"There are over 80,000 community Skills… most people have never installed a single one."* This scans the major collections, scores each listing against PRISM's domain vocabulary, and dedup-checks it against the existing ${r.sources.registrySkillCount}-skill library. **It only recommends — installing a community skill is a human/forge action that goes through \`harness-security-audit\`.**`);
    L.push("");
    L.push(`*Generated ${r.generatedAt} · schema ${r.schemaVersion}*`);
    L.push("");
    L.push(`## Sources`);
    L.push("");
    L.push(`- Scanned: ${r.sourcesScanned.length ? r.sourcesScanned.join(", ") : "*(none)*"}`);
    if (r.sourcesSkipped.length) { L.push(`- Skipped:`); for (const s of r.sourcesSkipped) L.push(`  - \`${s.id}\` — ${s.reason}`); }
    L.push("");
    L.push(`## Candidates by recommendation`);
    L.push("");
    L.push(`| Recommendation | Count |`);
    L.push(`|---|---:|`);
    L.push(`| ⭐ install (relevant + novel + strong) | ${r.byRecommendation.install} |`);
    L.push(`| 📖 study (relevant + novel/partial) | ${r.byRecommendation.study} |`);
    L.push(`| ✅ already-covered (a PRISM skill does this) | ${r.byRecommendation["already-covered"]} |`);
    L.push(`| ⏭️ skip (off-domain) | ${r.byRecommendation.skip} |`);
    L.push(`| total listings scanned | ${r.totalListings} (of which ${r.relevantCount} cleared the relevance floor) |`);
    L.push("");
    if (r.advisories.length) { L.push(`## Advisories`); L.push(""); for (const a of r.advisories) L.push(`- ${a}`); L.push(""); }
    const shortlist = r.candidates.filter((c) => c.recommendation === "install" || c.recommendation === "study");
    L.push(`## Shortlist — ${shortlist.length} install/study candidate(s)${shortlist.length > maxRows ? ` (top ${maxRows} shown)` : ""}`);
    L.push("");
    if (shortlist.length === 0) {
      L.push(`*(no install/study candidates this run — see Advisories)*`);
    } else {
      L.push(`| Skill | Source | Rec | Relevance | Domain hits | Dedup | Covered by | Description |`);
      L.push(`|---|---|---|---:|---|---|---|---|`);
      for (const c of shortlist.slice(0, maxRows)) {
        const esc = (s: string) => s.replace(/\|/g, "\\|");
        L.push(`| \`${esc(c.name)}\` | ${c.source} | ${c.recommendation} | ${c.relevanceScore.toFixed(2)} | ${esc(c.domainHits.slice(0, 4).join(", "))} | ${c.dedupVerdict} | ${c.alreadyCoveredBy ? `\`${esc(c.alreadyCoveredBy)}\`` : "—"} | ${esc(c.description.slice(0, 140))} |`);
      }
    }
    L.push("");
    const covered = r.candidates.filter((c) => c.recommendation === "already-covered");
    if (covered.length) {
      L.push(`## Already covered by a PRISM skill (${covered.length}) — don't re-import these`);
      L.push("");
      L.push(`| Community skill | Source | PRISM skill that covers it |`);
      L.push(`|---|---|---|`);
      for (const c of covered.slice(0, maxRows)) L.push(`| \`${c.name.replace(/\|/g, "\\|")}\` | ${c.source} | \`${(c.alreadyCoveredBy ?? "?").replace(/\|/g, "\\|")}\` |`);
      L.push("");
    }
    L.push(`## How to act on this`);
    L.push("");
    L.push(`1. For an \`install\` candidate you want: clone/copy the SKILL.md from its source URL into \`~/.claude/commands/\` (or a plugin dir), then run \`/harness-security-audit\` and \`/skill-lint\` on it — never run a community skill's body unreviewed.`);
    L.push(`2. For a \`study\` candidate: read it for ideas; if it overlaps a PRISM skill (\`partial-overlap\`), fold the good parts into ours rather than installing a near-duplicate.`);
    L.push(`3. \`already-covered\` / \`skip\`: no action.`);
    L.push("");
    L.push(`*Re-run: \`node scripts/skill-marketplace-scan.mjs\` · monthly cron \`0 10 1 * *\` (cron id \`skill-marketplace-scan-monthly\`) · dispatcher \`prism_knowledge:skill_marketplace_scan\`. skillsmp.com requires the Playwright MCP; the GitHub collections fetch fine without it.*`);
    L.push("");
    return L.join("\n");
  }
}

export const skillMarketplaceScannerEngine = new SkillMarketplaceScannerEngine();

/** Default source URLs (the GitHub collections fetch as raw markdown; skillsmp.com is the JS-gated one). */
export const DEFAULT_MARKETPLACE_SOURCES: ReadonlyArray<{ id: MarketplaceSourceId; url: string; jsGated?: boolean }> = [
  { id: "anthropics-skills", url: "https://raw.githubusercontent.com/anthropics/skills/main/README.md" },
  { id: "wshobson-agents", url: "https://raw.githubusercontent.com/wshobson/agents/main/README.md" },
  { id: "obra-superpowers", url: "https://raw.githubusercontent.com/obra/superpowers/main/README.md" },
  { id: "skillsmp", url: "https://skillsmp.com/", jsGated: true },
];
