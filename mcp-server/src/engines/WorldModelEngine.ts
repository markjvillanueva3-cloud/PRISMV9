/**
 * WorldModelEngine — "What exists in PRISM" slice of the triple model
 *
 * Phase 0.13 U-SAW4 partner of SelfModelEngine and UserModelEngine. Caches a
 * compressed view of the PRISM world — engines, registries, actions,
 * dispatchers — that the hook layer can query for quick orientation without
 * hitting AwarenessQueryEngine for every lookup.
 *
 * Unlike AwarenessQueryEngine (full indexed cache), WorldModelEngine holds a
 * session-scoped summary: headline counts, last-rebuilt timestamps, and a
 * small recently-queried MRU buffer.
 *
 * @module engines/WorldModelEngine
 * @milestone PP-0.13-U-SAW4
 */

export type WorldCategory =
  | "engine"
  | "dispatcher"
  | "action"
  | "registry"
  | "skill"
  | "hook"
  | "formula"
  | "algorithm";

export interface WorldCountEntry {
  category: WorldCategory;
  count: number;
  lastUpdatedAt: string;
}

export interface QueryEntry {
  at: string;
  category: WorldCategory;
  term: string;
  hits: number;
}

export interface WorldSnapshot {
  schemaVersion: 1;
  counts: WorldCountEntry[];
  recentQueries: QueryEntry[];
  updatedAt: string;
}

const MAX_QUERY_MRU = 25;

const VALID_CATEGORIES: readonly WorldCategory[] = [
  "engine",
  "dispatcher",
  "action",
  "registry",
  "skill",
  "hook",
  "formula",
  "algorithm",
];

export class WorldModelEngine {
  private counts = new Map<WorldCategory, WorldCountEntry>();
  private queries: QueryEntry[] = [];
  private updatedAt: string;

  constructor() {
    this.updatedAt = new Date().toISOString();
  }

  setCount(category: WorldCategory, count: number, at?: string): WorldCountEntry {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`unknown category ${category}`);
    }
    if (!Number.isFinite(count) || count < 0) {
      throw new Error("count must be a non-negative finite number");
    }
    const entry: WorldCountEntry = {
      category,
      count: Math.floor(count),
      lastUpdatedAt: at ?? new Date().toISOString(),
    };
    this.counts.set(category, entry);
    this.touch();
    return entry;
  }

  getCount(category: WorldCategory): number {
    return this.counts.get(category)?.count ?? 0;
  }

  listCounts(): WorldCountEntry[] {
    return [...this.counts.values()];
  }

  recordQuery(category: WorldCategory, term: string, hits: number, at?: string): QueryEntry {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`unknown category ${category}`);
    }
    const entry: QueryEntry = {
      at: at ?? new Date().toISOString(),
      category,
      term: term.trim(),
      hits: Math.max(0, Math.floor(hits)),
    };
    this.queries.push(entry);
    if (this.queries.length > MAX_QUERY_MRU) {
      this.queries.splice(0, this.queries.length - MAX_QUERY_MRU);
    }
    this.touch();
    return entry;
  }

  recentQueries(limit = 10): QueryEntry[] {
    if (limit <= 0) return [];
    return this.queries.slice(-limit);
  }

  topQueriedTerms(limit = 5): Array<{ term: string; queryCount: number }> {
    const freq = new Map<string, number>();
    for (const q of this.queries) freq.set(q.term, (freq.get(q.term) ?? 0) + 1);
    return [...freq.entries()]
      .map(([term, queryCount]) => ({ term, queryCount }))
      .sort((a, b) => b.queryCount - a.queryCount)
      .slice(0, Math.max(0, limit));
  }

  snapshot(): WorldSnapshot {
    return {
      schemaVersion: 1,
      counts: this.listCounts(),
      recentQueries: [...this.queries],
      updatedAt: this.updatedAt,
    };
  }

  toJSON(): WorldSnapshot {
    return this.snapshot();
  }

  static fromJSON(data: WorldSnapshot): WorldModelEngine {
    if (data.schemaVersion !== 1) {
      throw new Error(`WorldModelEngine.fromJSON: unsupported schemaVersion ${data.schemaVersion}`);
    }
    const e = new WorldModelEngine();
    for (const c of data.counts) e.counts.set(c.category, { ...c });
    e.queries = [...data.recentQueries];
    e.updatedAt = data.updatedAt;
    return e;
  }

  private touch(): void {
    this.updatedAt = new Date().toISOString();
  }
}

export const worldModelEngine = new WorldModelEngine();
