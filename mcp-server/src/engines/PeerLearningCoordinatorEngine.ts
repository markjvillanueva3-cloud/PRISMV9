/**
 * PeerLearningCoordinatorEngine — Cross-session insight sharing
 *
 * Phase 0.18 U-AGI14 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Session A ends
 * and broadcasts what it learned; session B boots later and incorporates
 * those insights (deduped). This engine is an in-memory broker that accepts
 * broadcasts and serves them to joining sessions.
 *
 * Dedup is content-based (hash of the summary) so the same insight from
 * different sessions counts once. Filtering by tags supports scoped peer
 * learning (e.g., only WEDM sessions pull WEDM insights).
 *
 * No I/O here. The hook layer handles file exchange between machines.
 *
 * @module engines/PeerLearningCoordinatorEngine
 * @milestone PP-0.18-U-AGI14
 */

export interface PeerInsight {
  id: string;
  fromSession: string;
  at: string;
  summary: string;
  detail?: string;
  tags: string[];
  confidence: number; // 0..1
  sensitivity?: "public" | "redacted" | "private";
}

export interface IngestionResult {
  accepted: boolean;
  reason?: string;
  insightId?: string;
}

export interface QueryOptions {
  excludeSessionIds?: string[];
  includeAnyTag?: string[];
  minConfidence?: number;
  limit?: number;
}

function hashSummary(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return `h${(h >>> 0).toString(16)}`;
}

export class PeerLearningCoordinatorEngine {
  private readonly insights = new Map<string, PeerInsight>();
  private readonly hashes = new Set<string>();

  broadcast(insight: Omit<PeerInsight, "id" | "at"> & { id?: string; at?: string }): IngestionResult {
    this.validate(insight);
    if (insight.sensitivity === "private") {
      return { accepted: false, reason: "private sensitivity — not broadcast" };
    }

    const summary = insight.summary.trim().toLowerCase();
    const hash = hashSummary(summary);
    if (this.hashes.has(hash)) {
      return { accepted: false, reason: "duplicate content" };
    }

    const id = insight.id ?? `peer-${this.insights.size + 1}`;
    const stored: PeerInsight = {
      id,
      fromSession: insight.fromSession,
      at: insight.at ?? new Date().toISOString(),
      summary: insight.summary,
      detail: insight.detail,
      tags: [...new Set(insight.tags.map((t) => t.toLowerCase()))],
      confidence: insight.confidence,
      sensitivity: insight.sensitivity ?? "public",
    };
    this.insights.set(id, stored);
    this.hashes.add(hash);
    return { accepted: true, insightId: id };
  }

  query(opts: QueryOptions = {}): PeerInsight[] {
    const exclude = new Set(opts.excludeSessionIds ?? []);
    const anyTag = opts.includeAnyTag?.map((t) => t.toLowerCase());
    const min = opts.minConfidence ?? 0;
    if (min < 0 || min > 1) throw new Error("minConfidence must be in [0,1]");

    const results = [...this.insights.values()]
      .filter((i) => !exclude.has(i.fromSession))
      .filter((i) => i.confidence >= min)
      .filter((i) => !anyTag || anyTag.length === 0 || anyTag.some((t) => i.tags.includes(t)))
      .sort((a, b) => b.at.localeCompare(a.at));

    return typeof opts.limit === "number" ? results.slice(0, Math.max(0, opts.limit)) : results;
  }

  get(id: string): PeerInsight | null {
    return this.insights.get(id) ?? null;
  }

  size(): number {
    return this.insights.size;
  }

  clear(): void {
    this.insights.clear();
    this.hashes.clear();
  }

  private validate(i: { fromSession: string; summary: string; tags: string[]; confidence: number }): void {
    if (!i.fromSession || i.fromSession.trim() === "") throw new Error("fromSession required");
    if (!i.summary || i.summary.trim() === "") throw new Error("summary required");
    if (!Array.isArray(i.tags)) throw new Error("tags must be an array");
    if (!(i.confidence >= 0 && i.confidence <= 1)) throw new Error("confidence in [0,1]");
  }
}

export const peerLearningCoordinatorEngine = new PeerLearningCoordinatorEngine();
