/**
 * WEDMBlackboardEngine — MS-P0.5-COORD U-P0.5-COORD-03
 *
 * Shared-state blackboard for WEDM coordination. Engines, dispatchers, and
 * reasoning agents post observations/hypotheses/intermediate results into
 * namespace-scoped slots; subscribers pull recent entries to inform their
 * own decisions. This is the classic blackboard architecture from AI
 * planning, adapted for the WEDM coordination substrate.
 *
 * Contract:
 *   - Entries are immutable once written; updates produce a new version.
 *   - TTL-bounded: expired entries are garbage-collected lazily.
 *   - Size-bounded: hard cap per namespace + global LRU eviction.
 *   - No persistence (volatile, in-memory) — ledger is for history.
 *   - Thread-safe is NOT a concern (Node is single-threaded per worker).
 */
import { log } from "../utils/Logger.js";

export type BlackboardTag =
  | "observation"
  | "hypothesis"
  | "constraint"
  | "decision"
  | "warning"
  | "recommendation"
  | "intermediate";

export interface BlackboardEntry {
  schemaVersion: 1;
  id: string;
  namespace: string;
  key: string;
  value: unknown;
  tag: BlackboardTag;
  source: string;
  confidence?: number;
  at: string;
  expiresAt: string;
  version: number;
}

export interface BlackboardSubscriber {
  id: string;
  namespacePrefix: string;
  callback: (entry: BlackboardEntry) => void;
}

export interface BlackboardStats {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  namespaceCount: number;
  largestNamespace: { namespace: string; count: number } | null;
  subscribers: number;
  recentPostRate_per_min: number;
  lastPostAt: string | null;
}

const NS_CAP = 500;
const GLOBAL_CAP = 5000;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const RECENT_WINDOW_MS = 5 * 60 * 1000;

interface PostOptions {
  ttlMs?: number;
  confidence?: number;
}

export class WEDMBlackboardEngine {
  private entries: BlackboardEntry[] = [];
  private versionsByKey = new Map<string, number>();
  private subscribers: BlackboardSubscriber[] = [];
  private nextId = 1;
  private postTimes: number[] = [];

  private generateId(): string {
    return `bb-${Date.now().toString(36)}-${(this.nextId++).toString(36).padStart(3, "0")}`;
  }

  private slotKey(namespace: string, key: string): string {
    return `${namespace}::${key}`;
  }

  private pruneExpired(now: number): void {
    this.entries = this.entries.filter((e) => new Date(e.expiresAt).getTime() > now);
  }

  private enforceCaps(): void {
    if (this.entries.length > GLOBAL_CAP) {
      this.entries.splice(0, this.entries.length - GLOBAL_CAP);
    }
    const perNs = new Map<string, BlackboardEntry[]>();
    for (const e of this.entries) {
      let arr = perNs.get(e.namespace);
      if (!arr) {
        arr = [];
        perNs.set(e.namespace, arr);
      }
      arr.push(e);
    }
    for (const [ns, arr] of perNs.entries()) {
      if (arr.length > NS_CAP) {
        const survivors = new Set(arr.slice(-NS_CAP));
        this.entries = this.entries.filter((e) => e.namespace !== ns || survivors.has(e));
      }
    }
  }

  post(
    namespace: string,
    key: string,
    value: unknown,
    tag: BlackboardTag,
    source: string,
    opts: PostOptions = {},
  ): BlackboardEntry {
    const now = Date.now();
    const slot = this.slotKey(namespace, key);
    const prevVersion = this.versionsByKey.get(slot) ?? 0;
    const nextVersion = prevVersion + 1;
    this.versionsByKey.set(slot, nextVersion);
    const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
    const entry: BlackboardEntry = {
      schemaVersion: 1,
      id: this.generateId(),
      namespace,
      key,
      value,
      tag,
      source,
      confidence: opts.confidence,
      at: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl).toISOString(),
      version: nextVersion,
    };
    this.pruneExpired(now);
    this.entries.push(entry);
    this.enforceCaps();
    this.postTimes.push(now);
    if (this.postTimes.length > 500) this.postTimes.splice(0, this.postTimes.length - 500);
    for (const sub of this.subscribers) {
      if (namespace.startsWith(sub.namespacePrefix)) {
        try {
          sub.callback(entry);
        } catch (e) {
          log.warn(`[wedm-blackboard] subscriber ${sub.id} threw: ${(e as Error).message}`);
        }
      }
    }
    return entry;
  }

  read(namespace: string, key: string): BlackboardEntry | null {
    this.pruneExpired(Date.now());
    const matches = this.entries.filter((e) => e.namespace === namespace && e.key === key);
    if (matches.length === 0) return null;
    return matches[matches.length - 1];
  }

  readAllInNamespace(namespace: string, tag?: BlackboardTag): BlackboardEntry[] {
    this.pruneExpired(Date.now());
    return this.entries.filter(
      (e) => e.namespace === namespace && (tag === undefined || e.tag === tag),
    );
  }

  readByPrefix(prefix: string, tag?: BlackboardTag): BlackboardEntry[] {
    this.pruneExpired(Date.now());
    return this.entries.filter(
      (e) => e.namespace.startsWith(prefix) && (tag === undefined || e.tag === tag),
    );
  }

  readHistory(namespace: string, key: string, limit = 10): BlackboardEntry[] {
    return this.entries
      .filter((e) => e.namespace === namespace && e.key === key)
      .slice(-limit);
  }

  subscribe(namespacePrefix: string, callback: (entry: BlackboardEntry) => void): string {
    const id = `sub-${(this.nextId++).toString(36)}`;
    this.subscribers.push({ id, namespacePrefix, callback });
    return id;
  }

  unsubscribe(id: string): boolean {
    const before = this.subscribers.length;
    this.subscribers = this.subscribers.filter((s) => s.id !== id);
    return this.subscribers.length < before;
  }

  invalidate(namespace: string, key: string): number {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => !(e.namespace === namespace && e.key === key));
    this.versionsByKey.delete(this.slotKey(namespace, key));
    return before - this.entries.length;
  }

  getStats(): BlackboardStats {
    const now = Date.now();
    this.pruneExpired(now);
    const nsCounts = new Map<string, number>();
    let expired = 0;
    for (const e of this.entries) {
      nsCounts.set(e.namespace, (nsCounts.get(e.namespace) ?? 0) + 1);
      if (new Date(e.expiresAt).getTime() < now) expired++;
    }
    let largestNamespace: { namespace: string; count: number } | null = null;
    for (const [ns, count] of nsCounts.entries()) {
      if (!largestNamespace || count > largestNamespace.count) {
        largestNamespace = { namespace: ns, count };
      }
    }
    const recent = this.postTimes.filter((t) => now - t <= RECENT_WINDOW_MS);
    const lastPostAt = this.postTimes.length > 0
      ? new Date(this.postTimes[this.postTimes.length - 1]).toISOString()
      : null;
    return {
      totalEntries: this.entries.length,
      activeEntries: this.entries.length - expired,
      expiredEntries: expired,
      namespaceCount: nsCounts.size,
      largestNamespace,
      subscribers: this.subscribers.length,
      recentPostRate_per_min: recent.length === 0 ? 0 : Math.round((recent.length / 5) * 10) / 10,
      lastPostAt,
    };
  }

  resetForTests(): void {
    this.entries.length = 0;
    this.subscribers.length = 0;
    this.versionsByKey.clear();
    this.postTimes.length = 0;
    this.nextId = 1;
  }
}

export const wedmBlackboardEngine = new WEDMBlackboardEngine();
