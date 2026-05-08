/**
 * PerformanceLoopEngine
 * =====================
 *
 * OBSIDIAN-CONTENT-MS2/U-PERFORMANCE-LOOP
 *
 * Reads markdown files in `knowledge/memories/published/` and builds the
 * compounding feedback loop the cyrilXBT JARVIS article describes:
 * "every shipped piece feeds back; the vault learns what your audience
 * actually responds to."
 *
 * Each published-content file carries frontmatter:
 *
 *   ---
 *   type: published-content
 *   publish_date: 2026-05-08
 *   platform: x
 *   content_pillar: ai-content-strategy
 *   hook_format: number          # category: number, story, question, claim, statistic, contrast
 *   hook_used: "<exact hook text>"
 *   impressions: 443000
 *   bookmarks: 11678
 *   engagement_rate: 0.04
 *   top_comment: "..."
 *   what_worked: "specific number in the first line"
 *   brief_id: <optional brief filename>
 *   ---
 *
 * The article's explicit metric is:
 *   "Which topics drove the most bookmarks per impression — NOT just impressions.
 *    Which hook formats outperformed their TOPIC AVERAGE.
 *    What three content angles my best-performing posts suggest I have not tried yet.
 *    Which topic and format combinations I should double down on this month."
 *
 * This engine answers all four. Pure-calc, deterministic; given the same
 * fileset + window, output is byte-stable.
 *
 * @milestone OBSIDIAN-CONTENT-MS2/U-PERFORMANCE-LOOP
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PublishedRecord {
  /** Absolute file path of the published-content note. */
  path: string;
  /** YYYY-MM-DD publish date (from frontmatter). */
  publishDate: string;
  /** Optional platform tag (x, linkedin, threads, ...). */
  platform?: string;
  /** Topic / content pillar (free-text, normalized to lowercase). */
  contentPillar: string;
  /** Hook category — number / story / question / claim / statistic / contrast / unknown. */
  hookFormat: string;
  /** Verbatim first-line hook (truncated to 200 chars). */
  hookUsed?: string;
  /** Reach: total impression count. */
  impressions: number;
  /** Intent-to-return: total bookmark count. */
  bookmarks: number;
  /** Optional engagement rate (decimal, 0-1). */
  engagementRate?: number;
  /** Top comment text, truncated. */
  topComment?: string;
  /** One-line author assessment of why it worked. */
  whatWorked?: string;
  /** Bookmarks-per-impression — the article's primary signal-quality metric. */
  bpi: number;
}

export interface PerformanceReportOptions {
  /** Override published-content directory. */
  publishedDir?: string;
  /** Restrict to files with publishDate >= this ISO date. */
  sinceIso?: string;
  /** Override "now" for deterministic tests. */
  now?: number;
  /** Cap on files scanned. */
  maxFiles?: number;
}

export interface TopicStat {
  pillar: string;
  count: number;
  totalImpressions: number;
  totalBookmarks: number;
  meanBpi: number;
  bestHookFormat: string;
}

export interface HookOutperformance {
  pillar: string;
  hookFormat: string;
  count: number;
  meanBpi: number;
  topicMeanBpi: number;
  /** (hook_meanBpi - topic_meanBpi) / topic_meanBpi — positive means outperformed. */
  outperformanceRatio: number;
}

export interface AngleSuggestion {
  pillar: string;
  hookFormat: string;
  evidenceCount: number;
  meanBpi: number;
  reason: string;
}

export interface ComboRecommendation {
  pillar: string;
  hookFormat: string;
  count: number;
  meanBpi: number;
  rank: number;
}

export interface PerformanceReport {
  scanned: number;
  analyzed: number;
  windowSinceIso: string;
  generatedAtIso: string;
  /** Article Q1: "Which topics drove the most bookmarks per impression". */
  topicsByBpi: TopicStat[];
  /** Article Q2: "Which hook formats outperformed their topic average". */
  hookOutperformance: HookOutperformance[];
  /** Article Q3: "Three content angles best posts suggest I have not tried yet". */
  untriedAngles: AngleSuggestion[];
  /** Article Q4: "Which topic+format combinations to double down on". */
  doubleDownCombos: ComboRecommendation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PUBLISHED_DIR = "H:/prism/knowledge/memories/published";
const DEFAULT_MAX_FILES = 5000;
const DEFAULT_WINDOW_DAYS = 30;
const HOOK_CATEGORIES = ["number", "story", "question", "claim", "statistic", "contrast", "unknown"];
const SUGGESTION_LIMIT = 3;
const MIN_RECORDS_FOR_OUTPERFORMANCE = 2;
const TOP_COMMENT_TRUNC = 240;

// ─────────────────────────────────────────────────────────────────────────────
// Frontmatter parsing
// ─────────────────────────────────────────────────────────────────────────────

function splitFrontmatter(raw: string): { fm: string | null; body: string } {
  if (!raw.startsWith("---")) return { fm: null, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { fm: null, body: raw };
  return { fm: raw.slice(4, end).replace(/^\n/, ""), body: raw.slice(end + 4).replace(/^\n/, "") };
}

function fmGet(fm: string, key: string): string | undefined {
  const re = new RegExp(`^${key}\\s*:\\s*(.*)$`, "m");
  const m = fm.match(re);
  if (!m) return undefined;
  let v = m[1].trim();
  if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

function fmGetNumber(fm: string, key: string): number | undefined {
  const v = fmGet(fm, key);
  if (v === undefined) return undefined;
  const n = Number(v.replace(/[,_]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeHookFormat(raw: string | undefined): string {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase().trim();
  for (const cat of HOOK_CATEGORIES) {
    if (lower === cat) return cat;
  }
  // Allow domain-specific tags but coerce generics.
  if (/^stat/.test(lower)) return "statistic";
  if (/^q[a-z]*/.test(lower) && lower.includes("?")) return "question";
  if (/story|anecdote|narrative/.test(lower)) return "story";
  if (/contrast|vs\.?|versus/.test(lower)) return "contrast";
  if (/\d/.test(raw)) return "number";
  return lower.replace(/[^a-z0-9-]/g, "-").slice(0, 24) || "unknown";
}

function parseRecord(filePath: string): PublishedRecord | null {
  let raw: string;
  try { raw = readFileSync(filePath, "utf8"); }
  catch { return null; }
  const { fm } = splitFrontmatter(raw);
  if (!fm) return null;

  const type = fmGet(fm, "type") ?? "";
  if (type !== "published-content") return null;

  const publishDate = fmGet(fm, "publish_date") ?? fmGet(fm, "publishDate") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) return null;

  const impressions = fmGetNumber(fm, "impressions");
  const bookmarks = fmGetNumber(fm, "bookmarks");
  if (impressions === undefined || bookmarks === undefined) return null;
  if (impressions <= 0) return null;

  const bpi = bookmarks / impressions;
  const contentPillar = (fmGet(fm, "content_pillar") ?? fmGet(fm, "contentPillar") ?? "uncategorized")
    .toLowerCase()
    .trim();
  const hookFormat = normalizeHookFormat(fmGet(fm, "hook_format") ?? fmGet(fm, "hookFormat"));
  const hookUsed = fmGet(fm, "hook_used") ?? fmGet(fm, "hookUsed");
  const engagementStr = fmGet(fm, "engagement_rate") ?? fmGet(fm, "engagementRate");
  const engagementRate = engagementStr !== undefined ? Number(engagementStr) : undefined;
  const topComment = fmGet(fm, "top_comment") ?? fmGet(fm, "topComment");
  const whatWorked = fmGet(fm, "what_worked") ?? fmGet(fm, "whatWorked");
  const platform = fmGet(fm, "platform");

  return {
    path: filePath,
    publishDate,
    platform,
    contentPillar,
    hookFormat,
    hookUsed: hookUsed?.slice(0, 200),
    impressions,
    bookmarks,
    engagementRate: Number.isFinite(engagementRate) ? engagementRate : undefined,
    topComment: topComment?.slice(0, TOP_COMMENT_TRUNC),
    whatWorked,
    bpi,
  };
}

function listPublishedFiles(dir: string, maxFiles: number): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  for (const e of entries) {
    if (out.length >= maxFiles) break;
    if (!e.isFile() || !e.name.toLowerCase().endsWith(".md")) continue;
    out.push(join(dir, e.name));
  }
  out.sort();
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregations
// ─────────────────────────────────────────────────────────────────────────────

function topicsByBpi(records: PublishedRecord[]): TopicStat[] {
  const byPillar = new Map<string, PublishedRecord[]>();
  for (const r of records) {
    const arr = byPillar.get(r.contentPillar) ?? [];
    arr.push(r);
    byPillar.set(r.contentPillar, arr);
  }
  const out: TopicStat[] = [];
  for (const [pillar, group] of byPillar) {
    const totalImpressions = group.reduce((s, r) => s + r.impressions, 0);
    const totalBookmarks = group.reduce((s, r) => s + r.bookmarks, 0);
    const meanBpi = group.reduce((s, r) => s + r.bpi, 0) / group.length;
    // Best hook within this pillar by mean bpi.
    const byHook = new Map<string, number[]>();
    for (const r of group) {
      const arr = byHook.get(r.hookFormat) ?? [];
      arr.push(r.bpi);
      byHook.set(r.hookFormat, arr);
    }
    const hookMeans = [...byHook.entries()].map(([h, vs]) => ({ h, mean: vs.reduce((s, v) => s + v, 0) / vs.length }));
    hookMeans.sort((a, b) => (b.mean - a.mean) || (a.h < b.h ? -1 : 1));
    const bestHookFormat = hookMeans[0]?.h ?? "unknown";
    out.push({ pillar, count: group.length, totalImpressions, totalBookmarks, meanBpi, bestHookFormat });
  }
  out.sort((a, b) => (b.meanBpi - a.meanBpi) || a.pillar.localeCompare(b.pillar));
  return out;
}

function hookOutperformance(records: PublishedRecord[]): HookOutperformance[] {
  const byPillar = new Map<string, PublishedRecord[]>();
  for (const r of records) {
    const arr = byPillar.get(r.contentPillar) ?? [];
    arr.push(r);
    byPillar.set(r.contentPillar, arr);
  }
  const out: HookOutperformance[] = [];
  for (const [pillar, group] of byPillar) {
    if (group.length < MIN_RECORDS_FOR_OUTPERFORMANCE) continue;
    const topicMeanBpi = group.reduce((s, r) => s + r.bpi, 0) / group.length;
    const byHook = new Map<string, PublishedRecord[]>();
    for (const r of group) {
      const arr = byHook.get(r.hookFormat) ?? [];
      arr.push(r);
      byHook.set(r.hookFormat, arr);
    }
    for (const [hookFormat, hookGroup] of byHook) {
      const meanBpi = hookGroup.reduce((s, r) => s + r.bpi, 0) / hookGroup.length;
      const outperformanceRatio = topicMeanBpi > 0 ? (meanBpi - topicMeanBpi) / topicMeanBpi : 0;
      out.push({ pillar, hookFormat, count: hookGroup.length, meanBpi, topicMeanBpi, outperformanceRatio });
    }
  }
  // Only return entries that beat the topic average; rank by ratio desc.
  const filtered = out.filter((o) => o.outperformanceRatio > 0);
  filtered.sort((a, b) =>
    (b.outperformanceRatio - a.outperformanceRatio)
    || a.pillar.localeCompare(b.pillar)
    || a.hookFormat.localeCompare(b.hookFormat),
  );
  return filtered;
}

function untriedAngles(records: PublishedRecord[], topicsRanked: TopicStat[]): AngleSuggestion[] {
  // For each top-pillar (top by mean BPI), recommend a hook format that:
  //   - has NOT been tried in this pillar yet
  //   - has performed well (above-median BPI) in OTHER pillars
  // The article's framing: "what 3 angles best posts suggest I have not tried"
  if (records.length === 0) return [];
  const triedByPillar = new Map<string, Set<string>>();
  const hookGlobalMean = new Map<string, number[]>();
  for (const r of records) {
    let s = triedByPillar.get(r.contentPillar);
    if (!s) { s = new Set(); triedByPillar.set(r.contentPillar, s); }
    s.add(r.hookFormat);
    const g = hookGlobalMean.get(r.hookFormat) ?? [];
    g.push(r.bpi);
    hookGlobalMean.set(r.hookFormat, g);
  }
  const hookMeans = new Map<string, number>();
  for (const [h, vs] of hookGlobalMean) {
    hookMeans.set(h, vs.reduce((s, v) => s + v, 0) / vs.length);
  }
  const overallMean = records.reduce((s, r) => s + r.bpi, 0) / records.length;
  const out: AngleSuggestion[] = [];
  // Prefer the top 3 pillars by BPI. For each, find an untried hook with above-overall-mean BPI elsewhere.
  for (const top of topicsRanked.slice(0, SUGGESTION_LIMIT)) {
    const tried = triedByPillar.get(top.pillar) ?? new Set<string>();
    // Sort untried hooks by their global mean BPI desc.
    const candidates = [...hookMeans.entries()]
      .filter(([h]) => !tried.has(h) && h !== "unknown")
      .filter(([, m]) => m > overallMean)
      .sort((a, b) => (b[1] - a[1]) || (a[0].localeCompare(b[0])));
    if (candidates.length === 0) continue;
    const [hookFormat, mean] = candidates[0];
    out.push({
      pillar: top.pillar,
      hookFormat,
      evidenceCount: hookGlobalMean.get(hookFormat)?.length ?? 0,
      meanBpi: mean,
      reason: `'${hookFormat}' averages ${(mean * 100).toFixed(2)}% BPI globally (above overall mean ${(overallMean * 100).toFixed(2)}%) but has not been tried in '${top.pillar}'.`,
    });
    if (out.length >= SUGGESTION_LIMIT) break;
  }
  return out;
}

function doubleDownCombos(records: PublishedRecord[]): ComboRecommendation[] {
  const byCombo = new Map<string, PublishedRecord[]>();
  for (const r of records) {
    const k = `${r.contentPillar}::${r.hookFormat}`;
    const arr = byCombo.get(k) ?? [];
    arr.push(r);
    byCombo.set(k, arr);
  }
  const out: ComboRecommendation[] = [];
  for (const [k, group] of byCombo) {
    if (group.length < MIN_RECORDS_FOR_OUTPERFORMANCE) continue;
    const meanBpi = group.reduce((s, r) => s + r.bpi, 0) / group.length;
    const [pillar, hookFormat] = k.split("::");
    out.push({ pillar, hookFormat, count: group.length, meanBpi, rank: 0 });
  }
  out.sort((a, b) => (b.meanBpi - a.meanBpi) || (b.count - a.count) || a.pillar.localeCompare(b.pillar));
  out.forEach((c, i) => c.rank = i + 1);
  return out.slice(0, SUGGESTION_LIMIT);
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export class PerformanceLoopEngine {
  readonly name = "PerformanceLoopEngine";

  /**
   * Read all published-content notes in `publishedDir` and answer the
   * cyrilXBT JARVIS monthly-report questions.
   */
  monthlyReport(opts: PerformanceReportOptions = {}): PerformanceReport {
    const publishedDir = resolve(opts.publishedDir ?? DEFAULT_PUBLISHED_DIR);
    const now = opts.now ?? Date.now();
    const generatedAtIso = new Date(now).toISOString();
    const sinceIso = opts.sinceIso ?? new Date(now - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;

    const files = listPublishedFiles(publishedDir, maxFiles);
    const records: PublishedRecord[] = [];
    for (const f of files) {
      const r = parseRecord(f);
      if (!r) continue;
      if (r.publishDate < sinceIso) continue;
      records.push(r);
    }

    const topicsRanked = topicsByBpi(records);
    return {
      scanned: files.length,
      analyzed: records.length,
      windowSinceIso: sinceIso,
      generatedAtIso,
      topicsByBpi: topicsRanked,
      hookOutperformance: hookOutperformance(records),
      untriedAngles: untriedAngles(records, topicsRanked),
      doubleDownCombos: doubleDownCombos(records),
    };
  }

  /**
   * Lower-level: parse a single file's frontmatter into a PublishedRecord.
   * Useful for testing + for upstream tools that want one-off reads.
   */
  parseFile(filePath: string): PublishedRecord | null {
    return parseRecord(filePath);
  }

  /** Read all records (deterministic order). */
  listRecords(opts: PerformanceReportOptions = {}): PublishedRecord[] {
    const publishedDir = resolve(opts.publishedDir ?? DEFAULT_PUBLISHED_DIR);
    const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
    const files = listPublishedFiles(publishedDir, maxFiles);
    const out: PublishedRecord[] = [];
    for (const f of files) {
      const r = parseRecord(f);
      if (r) out.push(r);
    }
    return out;
  }
}

export const performanceLoopEngine = new PerformanceLoopEngine();
