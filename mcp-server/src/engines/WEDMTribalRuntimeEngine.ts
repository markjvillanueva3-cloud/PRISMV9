/**
 * WEDMTribalRuntimeEngine — MS-P0.5-COORD U-P0.5-COORD-05
 *
 * Runtime tribal-knowledge selection for WEDM dispatch. Loads curated tips
 * from src/data/wedm-knowledge-tips.ts, filters by action context
 * (keywords, material, operation, tags), ranks candidates, and tracks
 * which tips were used so the coordination substrate can feed back into
 * the tip corpus (usage_count) over time.
 *
 * Ranking: keyword-match score + confidence + recency-bonus + exploration
 * bonus (rarely-used tips get a small nudge so we don't only serve the
 * same top-3 every time).
 */
import { WEDM_KNOWLEDGE_TIPS } from "../data/wedm-knowledge-tips.js";

export interface TribalTip {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: readonly string[];
  operation_types?: readonly string[];
  confidence: number;
  source: string;
  created_at?: string;
  usage_count?: number;
}

export interface SelectionContext {
  dispatcher: string;
  action: string;
  keywords?: string[];
  material?: string;
  machine?: string;
  operation?: string;
  maxResults?: number;
}

export interface ScoredTip {
  tip: TribalTip;
  score: number;
  matchedKeywords: string[];
  matchedTags: string[];
}

export interface SelectionResult {
  tips: ScoredTip[];
  considered: number;
  latencyMs: number;
}

export interface TribalRuntimeStats {
  totalTipsLoaded: number;
  totalSelections: number;
  totalServed: number;
  topTipsByUse: Array<{ id: string; count: number }>;
  avgLatencyMs: number;
  uniqueActionsSeen: number;
}

const MAX_RESULTS_DEFAULT = 5;
const RECENCY_BONUS_DAYS = 90;
const HISTORY_CAP = 500;

export class WEDMTribalRuntimeEngine {
  private tips: TribalTip[] = [];
  private usageCounts = new Map<string, number>();
  private selectionLatencies: number[] = [];
  private servedTotal = 0;
  private seenActions = new Set<string>();
  private totalSelections = 0;

  constructor() {
    this.reloadTips();
  }

  reloadTips(): void {
    this.tips = (WEDM_KNOWLEDGE_TIPS as readonly TribalTip[]).slice();
    for (const t of this.tips) {
      if (!this.usageCounts.has(t.id)) {
        this.usageCounts.set(t.id, t.usage_count ?? 0);
      }
    }
  }

  private keywordScore(tip: TribalTip, kws: string[]): { score: number; matched: string[] } {
    if (!kws || kws.length === 0) return { score: 0, matched: [] };
    const lowerBody = `${tip.title} ${tip.body}`.toLowerCase();
    const matched: string[] = [];
    let score = 0;
    for (const kw of kws) {
      const k = kw.toLowerCase();
      if (k.length < 2) continue;
      if (lowerBody.includes(k)) {
        score += 3;
        matched.push(kw);
      }
    }
    return { score, matched };
  }

  private tagScore(tip: TribalTip, kws: string[]): { score: number; matched: string[] } {
    if (!kws || kws.length === 0) return { score: 0, matched: [] };
    const matched: string[] = [];
    let score = 0;
    for (const tag of tip.tags) {
      const t = tag.toLowerCase();
      for (const kw of kws) {
        if (t.includes(kw.toLowerCase()) || kw.toLowerCase().includes(t)) {
          score += 2;
          matched.push(tag);
          break;
        }
      }
    }
    return { score, matched };
  }

  private confidenceScore(tip: TribalTip): number {
    const c = typeof tip.confidence === "number" ? tip.confidence : 50;
    return c / 10;
  }

  private recencyBonus(tip: TribalTip): number {
    if (!tip.created_at) return 0;
    const age = (Date.now() - new Date(tip.created_at).getTime()) / 86400000;
    if (age < 0) return 0;
    if (age <= RECENCY_BONUS_DAYS) return 1 + (RECENCY_BONUS_DAYS - age) / RECENCY_BONUS_DAYS;
    return 0.5;
  }

  private explorationBonus(tip: TribalTip): number {
    const uses = this.usageCounts.get(tip.id) ?? 0;
    if (uses === 0) return 1.5;
    if (uses < 3) return 0.8;
    if (uses < 10) return 0.3;
    return 0;
  }

  select(context: SelectionContext): SelectionResult {
    const start = Date.now();
    this.totalSelections++;
    this.seenActions.add(`${context.dispatcher}::${context.action}`);

    const kws: string[] = [];
    if (context.keywords) kws.push(...context.keywords);
    if (context.material) kws.push(context.material);
    if (context.machine) kws.push(context.machine);
    if (context.operation) kws.push(context.operation);

    const scored: ScoredTip[] = [];
    for (const tip of this.tips) {
      if (context.operation && tip.operation_types && tip.operation_types.length > 0) {
        const opMatch = tip.operation_types.some(
          (o) => o.toLowerCase() === context.operation!.toLowerCase(),
        );
        if (!opMatch) {
          continue;
        }
      }
      const kw = this.keywordScore(tip, kws);
      const tg = this.tagScore(tip, kws);
      const conf = this.confidenceScore(tip);
      const rec = this.recencyBonus(tip);
      const exp = this.explorationBonus(tip);
      const score = kw.score + tg.score + conf + rec + exp;
      if (score > 0) {
        scored.push({
          tip,
          score,
          matchedKeywords: kw.matched,
          matchedTags: Array.from(new Set(tg.matched)),
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const limit = context.maxResults ?? MAX_RESULTS_DEFAULT;
    const top = scored.slice(0, limit);

    for (const s of top) {
      this.usageCounts.set(s.tip.id, (this.usageCounts.get(s.tip.id) ?? 0) + 1);
      this.servedTotal++;
    }

    const latency = Date.now() - start;
    this.selectionLatencies.push(latency);
    if (this.selectionLatencies.length > HISTORY_CAP) {
      this.selectionLatencies.splice(0, this.selectionLatencies.length - HISTORY_CAP);
    }

    return { tips: top, considered: this.tips.length, latencyMs: latency };
  }

  getTipById(id: string): TribalTip | null {
    return this.tips.find((t) => t.id === id) ?? null;
  }

  listByCategory(category: string): TribalTip[] {
    return this.tips.filter((t) => t.category === category);
  }

  getStats(): TribalRuntimeStats {
    const topTipsByUse = Array.from(this.usageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ id, count }));
    const avgLatencyMs =
      this.selectionLatencies.length === 0
        ? 0
        : Math.round(
            (this.selectionLatencies.reduce((a, b) => a + b, 0) /
              this.selectionLatencies.length) *
              100,
          ) / 100;
    return {
      totalTipsLoaded: this.tips.length,
      totalSelections: this.totalSelections,
      totalServed: this.servedTotal,
      topTipsByUse,
      avgLatencyMs,
      uniqueActionsSeen: this.seenActions.size,
    };
  }

  resetForTests(): void {
    this.usageCounts.clear();
    this.selectionLatencies.length = 0;
    this.servedTotal = 0;
    this.seenActions.clear();
    this.totalSelections = 0;
    this.reloadTips();
  }
}

export const wedmTribalRuntimeEngine = new WEDMTribalRuntimeEngine();
