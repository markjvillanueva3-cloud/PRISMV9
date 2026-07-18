/**
 * WEDMKnowledgeIndexEngine — unified WEDM knowledge index (tribal + wiki)
 *
 * The wedm domain compiles tribal knowledge two ways already
 * (WEDMTribalRuntimeEngine = raw-tip search; WEDMKnowledgeDistillationEngine =
 * tip→rule compression) — but BOTH consume only `wedm-knowledge-tips.ts`. The
 * curated WIKI knowledge (code-tribal `wedm-*.md` tactic pages + wedm/wire
 * lessons) was never compiled into a queryable surface. This engine closes that
 * gap: it COMPILES tribal tips + curated wiki docs into ONE ranked-queryable
 * `WEDMKnowledgeEntry[]` corpus, so "give me everything relevant to <X>" returns
 * both the tribal tip AND the wiki tactic page in one ranked list.
 *
 * Pure-core: entries are INJECTED. File parsing (reading + frontmatter-parsing
 * the .md pages) lives in the generator `scripts/build-wedm-knowledge-index.mjs`,
 * which feeds `compile()` and writes `WEDM_KNOWLEDGE_INDEX.json`. This keeps the
 * engine deterministic + unit-testable while the generator ships the real-file
 * E2E (per the RGS-MS1 "pure-core + injected-readers MUST ship a real-data E2E"
 * lesson). Companion (superset) of WEDMTribalRuntimeEngine — it does not replace
 * it; tribal dispatch still uses the tribal runtime.
 *
 * slot:mike (Wire Wizard) — galaxy:wedm.
 */

// ────────────────────────── Types ──────────────────────────

export type WEDMKnowledgeSourceType = "tribal" | "wiki-tactic" | "wiki-lesson";

/** Shape of a raw tribal tip (matches WEDM_KNOWLEDGE_TIPS / TribalTip). */
export interface RawTribalTip {
  id: string;
  title: string;
  // Most tips use `body`; some (wedm-ml / wedm-web families) use `description` — both indexed.
  body?: string;
  description?: string;
  category?: string;
  tags?: readonly string[];
  operation_types?: readonly string[];
  confidence?: number; // 0..1 OR 0..100 — auto-normalised
  source?: string;
}

/** Shape of a pre-parsed curated wiki doc (frontmatter + distilled summary). */
export interface RawWikiDoc {
  /** repo-relative path, e.g. knowledge/wiki/code-tribal/wedm-tactics-...md */
  path: string;
  title: string;
  kind: "tactic" | "lesson";
  tags?: readonly string[];
  topics?: readonly string[];
  /** distilled body — headings + key rule bullets, NOT the whole file */
  summary: string;
  confidence?: number; // 0..1 OR 0..100; defaults applied below
}

/** A unified knowledge entry — the row type of the compiled index. */
export interface WEDMKnowledgeEntry {
  /** namespaced so tribal + wiki ids never collide: "tribal:<id>" | "wiki:<slug>" */
  id: string;
  source_type: WEDMKnowledgeSourceType;
  title: string;
  summary: string;
  tags: string[];
  topics: string[];
  confidence: number; // normalised 0..1
  path?: string; // file pointer for wiki entries
}

export interface KnowledgeQuery {
  keywords?: string[];
  topics?: string[];
  tags?: string[];
  sourceTypes?: WEDMKnowledgeSourceType[];
  maxResults?: number;
}

export interface ScoredKnowledgeEntry {
  entry: WEDMKnowledgeEntry;
  score: number;
  matchedKeywords: string[];
  matchedTags: string[];
}

export interface KnowledgeSelectionResult {
  entries: ScoredKnowledgeEntry[];
  considered: number;
  latencyMs: number;
}

export interface KnowledgeIndexStats {
  total: number;
  byType: Record<WEDMKnowledgeSourceType, number>;
  topTags: Array<{ tag: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
}

// ────────────────────────── Constants ──────────────────────────

const MAX_RESULTS_DEFAULT = 5;
/** Source-type weight — curated wiki tactics are highest-signal; lessons slightly below tribal. */
const SOURCE_WEIGHT: Record<WEDMKnowledgeSourceType, number> = {
  "wiki-tactic": 1.1,
  tribal: 1.0,
  "wiki-lesson": 0.95,
};
const FAMILY_TAGS = new Set(["wedm", "wire-edm", "edm", "wire", "slot-mike"]);

/** Normalise a confidence that may be 0..1 or 0..100 to 0..1; default 0.8. */
function normConfidence(c: number | undefined): number {
  if (c === undefined || Number.isNaN(c)) return 0.8;
  const v = c > 1 ? c / 100 : c;
  return Math.max(0, Math.min(1, v));
}

function topicsFrom(category: string | undefined, tags: readonly string[] | undefined): string[] {
  const out: string[] = [];
  if (category) out.push(category.toLowerCase());
  for (const t of tags ?? []) {
    const lt = t.toLowerCase();
    if (!FAMILY_TAGS.has(lt) && !out.includes(lt)) out.push(lt);
  }
  return out;
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMKnowledgeIndexEngine {
  private readonly entries: WEDMKnowledgeEntry[];

  /** Pure — entries are injected (built via the static compilers below). */
  constructor(entries: WEDMKnowledgeEntry[] = []) {
    if (!Array.isArray(entries)) {
      throw new Error("WEDMKnowledgeIndexEngine: entries must be an array");
    }
    this.entries = entries.slice();
  }

  /** Map raw tribal tips → unified entries. */
  static fromTips(tips: readonly RawTribalTip[]): WEDMKnowledgeEntry[] {
    if (!Array.isArray(tips)) throw new Error("fromTips: tips must be an array");
    return tips
      .filter((t) => t && typeof t.id === "string" && typeof t.title === "string")
      .map((t) => ({
        id: `tribal:${t.id}`,
        source_type: "tribal" as const,
        title: t.title,
        summary: (t.body ?? t.description ?? "").trim(),
        tags: [...(t.tags ?? [])].map((x) => x.toLowerCase()),
        topics: topicsFrom(t.category, [...(t.tags ?? []), ...(t.operation_types ?? [])]),
        confidence: normConfidence(t.confidence),
        ...(t.source ? { path: t.source } : {}),
      }));
  }

  /** Map pre-parsed curated wiki docs → unified entries. */
  static fromWikiDocs(docs: readonly RawWikiDoc[]): WEDMKnowledgeEntry[] {
    if (!Array.isArray(docs)) throw new Error("fromWikiDocs: docs must be an array");
    return docs
      .filter((d) => d && typeof d.path === "string" && typeof d.title === "string")
      .map((d) => {
        const slug = d.path.replace(/\\/g, "/").split("/").pop()!.replace(/\.md$/i, "");
        return {
          id: `wiki:${slug}`,
          source_type: (d.kind === "lesson" ? "wiki-lesson" : "wiki-tactic") as WEDMKnowledgeSourceType,
          title: d.title,
          summary: (d.summary ?? "").trim(),
          tags: [...(d.tags ?? [])].map((x) => x.toLowerCase()),
          topics: [...(d.topics ?? topicsFrom(undefined, d.tags))].map((x) => x.toLowerCase()),
          confidence: normConfidence(d.confidence ?? 90),
          path: d.path,
        };
      });
  }

  /** Compile tribal + wiki into one corpus, deduped by namespaced id (first wins). */
  static compile(sources: { tips?: readonly RawTribalTip[]; wikiDocs?: readonly RawWikiDoc[] }): WEDMKnowledgeEntry[] {
    const merged = [
      ...WEDMKnowledgeIndexEngine.fromTips(sources.tips ?? []),
      ...WEDMKnowledgeIndexEngine.fromWikiDocs(sources.wikiDocs ?? []),
    ];
    const seen = new Set<string>();
    const out: WEDMKnowledgeEntry[] = [];
    for (const e of merged) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
    }
    return out;
  }

  private scoreEntry(entry: WEDMKnowledgeEntry, q: KnowledgeQuery): ScoredKnowledgeEntry {
    const hayTitle = entry.title.toLowerCase();
    const hayBody = entry.summary.toLowerCase();
    const matchedKeywords: string[] = [];
    const matchedTags: string[] = [];
    let score = 0;

    for (const kwRaw of q.keywords ?? []) {
      const kw = kwRaw.toLowerCase().trim();
      if (!kw) continue;
      let hit = false;
      if (hayTitle.includes(kw)) { score += 2.0; hit = true; }
      if (hayBody.includes(kw)) { score += 1.0; hit = true; }
      if (entry.tags.includes(kw)) { score += 1.5; hit = true; }
      if (entry.topics.includes(kw)) { score += 1.5; hit = true; }
      if (hit) matchedKeywords.push(kw);
    }
    for (const tgRaw of q.tags ?? []) {
      const tg = tgRaw.toLowerCase().trim();
      if (tg && entry.tags.includes(tg)) { score += 1.5; matchedTags.push(tg); }
    }
    for (const tpRaw of q.topics ?? []) {
      const tp = tpRaw.toLowerCase().trim();
      if (tp && entry.topics.includes(tp)) { score += 2.0; }
    }

    // confidence + source-type weighting applied multiplicatively to the match
    // score. A zero raw match yields a zero weighted score so a criteria query
    // with no hit returns empty (the "list all" path is handled in select()).
    const weighted = score === 0 ? 0 : score * SOURCE_WEIGHT[entry.source_type] * (0.5 + 0.5 * entry.confidence);
    return { entry, score: weighted, matchedKeywords, matchedTags };
  }

  /** Ranked select over the unified corpus (tribal + wiki). */
  select(query: KnowledgeQuery = {}): KnowledgeSelectionResult {
    const start = Date.now();
    const max = query.maxResults && query.maxResults > 0 ? query.maxResults : MAX_RESULTS_DEFAULT;
    const allowed = query.sourceTypes && query.sourceTypes.length
      ? new Set(query.sourceTypes)
      : null;

    const pool = allowed ? this.entries.filter((e) => allowed.has(e.source_type)) : this.entries;

    // A criteria array counts only if it has a NON-BLANK entry — so `keywords:[" "]`
    // (or all-whitespace) is treated as "no criteria" → list-all, not an empty result.
    const hasNonBlank = (a?: string[]) =>
      Array.isArray(a) && a.some((s) => typeof s === "string" && s.trim().length > 0);
    const hasCriteria = hasNonBlank(query.keywords) || hasNonBlank(query.tags) || hasNonBlank(query.topics);

    let scored: ScoredKnowledgeEntry[];
    if (!hasCriteria) {
      // No search criteria → "list all" ranked by quality (source weight × confidence).
      scored = pool.map((e) => ({
        entry: e,
        score: SOURCE_WEIGHT[e.source_type] * e.confidence,
        matchedKeywords: [] as string[],
        matchedTags: [] as string[],
      }));
    } else {
      // Criteria present → only entries with a positive match survive (no-match ⇒ empty).
      scored = pool.map((e) => this.scoreEntry(e, query)).filter((s) => s.score > 0);
    }
    scored.sort((a, b) => b.score - a.score || b.entry.confidence - a.entry.confidence);

    return { entries: scored.slice(0, max), considered: pool.length, latencyMs: Date.now() - start };
  }

  stats(): KnowledgeIndexStats {
    const byType: Record<WEDMKnowledgeSourceType, number> = { tribal: 0, "wiki-tactic": 0, "wiki-lesson": 0 };
    const tagCounts = new Map<string, number>();
    const topicCounts = new Map<string, number>();
    for (const e of this.entries) {
      byType[e.source_type] += 1;
      for (const t of e.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      for (const tp of e.topics) topicCounts.set(tp, (topicCounts.get(tp) ?? 0) + 1);
    }
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    const topTopics = [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
    return { total: this.entries.length, byType, topTags, topTopics };
  }

  /** All entries (defensive copy). */
  all(): WEDMKnowledgeEntry[] {
    return this.entries.slice();
  }
}
