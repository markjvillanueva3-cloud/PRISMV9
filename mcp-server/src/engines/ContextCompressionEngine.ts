/**
 * ContextCompressionEngine — AI-MAX-ROADMAP U-AIMAX07
 * =====================================================
 *
 * Hierarchical, priority-based compression of context items with
 * compact indices and on-demand expansion. Complements the two
 * sibling engines that already exist but do different things:
 *
 *   * ContextCompactionEngine — decides WHICH items survive.
 *   * ContextBudgetEngine     — decides HOW MANY tokens each
 *                               category gets.
 *   * ContextCompressionEngine (this) — decides HOW DENSE each
 *                                       surviving item is.
 *
 * Three-tier compression:
 *
 *   Tier 0  FULL         original content (no compression)
 *   Tier 1  SUMMARY      first N + last N + extracted entities
 *   Tier 2  INDEX        handle only; content kept in side store
 *                        for lazy expansion.
 *
 * Policy by priority:
 *
 *   critical   → always Tier 0 (never compress)
 *   high       → Tier 1 summary, Tier 0 on expand()
 *   medium     → Tier 2 index, Tier 1 on summary(), Tier 0 on expand()
 *   low        → Tier 2 index
 *   ephemeral  → dropped (not stored)
 *
 * Compression-ratio target: 5:1 with <5% information loss (where
 * information loss = 1 − entity_recall, entities being the union of
 * tokenized identifiers in the original content).
 *
 * Acceptance criteria from U-AIMAX07:
 *   * Compression ratio >= 3:1 hard floor, >= 5:1 target
 *   * Decompression < 100ms per item
 *   * Information loss < 10% hard floor, < 5% target
 *
 * @module engines/ContextCompressionEngine
 * @version 1.0.0
 */

// ================================================================
// TYPES
// ================================================================

export type Tier = 0 | 1 | 2;
export type Priority = "critical" | "high" | "medium" | "low" | "ephemeral";

export interface CompressionPolicy {
  /** Characters from head to keep in summary. Default 200. */
  headChars: number;
  /** Characters from tail to keep in summary. Default 100. */
  tailChars: number;
  /** Max entities (ident-like tokens) to extract. Default 20. */
  maxEntities: number;
  /** Minimum entity length to count. Default 3. */
  minEntityLen: number;
  /**
   * Maximum entity length — tokens longer than this are truncated
   * (pathological repeated-char runs should not inflate the entity
   * list and defeat compression). Default 64.
   */
  maxEntityLen: number;
  /** Hard ratio floor; refuse to compress if ratio would be < this. Default 1.5. */
  minRatio: number;
}

export const DEFAULT_POLICY: CompressionPolicy = {
  headChars: 200,
  tailChars: 100,
  maxEntities: 20,
  minEntityLen: 3,
  maxEntityLen: 64,
  minRatio: 1.5,
};

export interface CompressionInput {
  id: string;
  content: string;
  priority: Priority;
  kind?: string;        // tool_result | file | assistant | user | other
}

export interface CompressedItem {
  id: string;
  tier: Tier;
  priority: Priority;
  kind: string;
  /** Summary text (head + separator + tail). Empty if tier=2 pure index. */
  summary: string;
  /** Ident-like tokens extracted from the original. */
  entities: string[];
  /** Opaque handle for lazy expansion. Always populated. */
  handle: string;
  originalChars: number;
  compressedChars: number;
  ratio: number;        // originalChars / compressedChars
}

export interface CompressionStats {
  totalItems: number;
  droppedEphemeral: number;
  tier0Count: number;
  tier1Count: number;
  tier2Count: number;
  originalChars: number;
  compressedChars: number;
  overallRatio: number;
  avgEntityRecall: number; // 1.0 = perfect; proxy for information retention
}

export interface BatchOutput {
  items: CompressedItem[];
  stats: CompressionStats;
}

// ================================================================
// ENGINE
// ================================================================

class ContextCompressionEngineImpl {
  private store = new Map<string, string>(); // handle → original
  private policy: CompressionPolicy = { ...DEFAULT_POLICY };

  setPolicy(patch: Partial<CompressionPolicy>): CompressionPolicy {
    const merged = { ...this.policy, ...patch };
    if (merged.headChars < 0 || merged.tailChars < 0) {
      throw new Error("headChars and tailChars must be non-negative");
    }
    if (merged.maxEntities < 0 || !Number.isInteger(merged.maxEntities)) {
      throw new Error("maxEntities must be non-negative integer");
    }
    if (merged.minEntityLen < 1) {
      throw new Error("minEntityLen must be >= 1");
    }
    if (merged.minRatio < 1) {
      throw new Error("minRatio must be >= 1");
    }
    this.policy = merged;
    return this.getPolicy();
  }

  getPolicy(): CompressionPolicy {
    return { ...this.policy };
  }

  // --------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------

  /**
   * Compress a single item per its priority tier. ephemeral items
   * return a tombstone handle but no content is stored.
   */
  compress(input: CompressionInput): CompressedItem {
    this.validate(input);
    const kind = input.kind ?? "other";
    if (input.priority === "ephemeral") {
      return this.tombstone(input.id, kind);
    }
    const entities = this.extractEntities(input.content);
    const handle = this.mkHandle(input.id);

    let tier: Tier;
    let summary = "";
    if (input.priority === "critical") {
      // Tier 0: store verbatim, ratio pinned to 1:1 (critical is a
      // promise not to lose a single byte, not a compression
      // opportunity).
      this.store.set(handle, input.content);
      return {
        id: input.id,
        tier: 0,
        priority: input.priority,
        kind,
        summary: input.content,
        entities,
        handle,
        originalChars: input.content.length,
        compressedChars: input.content.length,
        ratio: 1,
      };
    } else if (input.priority === "high") {
      tier = 1;
      summary = this.makeSummary(input.content);
    } else {
      // medium + low → Tier 2 index only. Summary kept minimal so
      // that a search layer can still filter by entities.
      tier = 2;
      summary = input.priority === "medium" ? this.makeSummary(input.content) : "";
    }

    // Always store the original for lazy expand(); expand() returns it as-is.
    this.store.set(handle, input.content);

    const origChars = input.content.length;
    const compChars = this.sizeOf(summary, entities);
    let ratio = compChars > 0 ? origChars / compChars : origChars;

    // If compression would hurt (below minRatio), upgrade to Tier 0
    // for this item so we don't waste cycles. (Critical already
    // returned above, so we know tier is 1 or 2 here.)
    if (ratio < this.policy.minRatio) {
      return {
        id: input.id,
        tier: 0,
        priority: input.priority,
        kind,
        summary: input.content,
        entities,
        handle,
        originalChars: origChars,
        compressedChars: input.content.length,
        ratio: 1,
      };
    }

    return {
      id: input.id,
      tier,
      priority: input.priority,
      kind,
      summary,
      entities,
      handle,
      originalChars: origChars,
      compressedChars: this.sizeOf(summary, entities),
      ratio,
    };
  }

  /** Batch compress with aggregate stats. */
  batchCompress(inputs: CompressionInput[]): BatchOutput {
    if (!Array.isArray(inputs)) throw new Error("inputs must be array");
    const items: CompressedItem[] = [];
    let droppedEphemeral = 0;
    let origTotal = 0;
    let compTotal = 0;
    let recallSum = 0;
    const byTier = [0, 0, 0];

    for (const input of inputs) {
      if (input.priority === "ephemeral") {
        droppedEphemeral += 1;
        // Still add tombstone so callers can see what was dropped.
        items.push(this.tombstone(input.id, input.kind ?? "other"));
        continue;
      }
      const c = this.compress(input);
      items.push(c);
      byTier[c.tier] += 1;
      origTotal += c.originalChars;
      compTotal += c.compressedChars;
      recallSum += this.entityRecall(input.content, c);
    }

    const nonEphemeral = inputs.length - droppedEphemeral;
    const stats: CompressionStats = {
      totalItems: inputs.length,
      droppedEphemeral,
      tier0Count: byTier[0],
      tier1Count: byTier[1],
      tier2Count: byTier[2],
      originalChars: origTotal,
      compressedChars: compTotal,
      overallRatio: compTotal > 0 ? origTotal / compTotal : 0,
      avgEntityRecall: nonEphemeral > 0 ? recallSum / nonEphemeral : 1,
    };
    return { items, stats };
  }

  /**
   * Expand a previously compressed item back to its full original
   * content. Throws on unknown handle (including ephemeral
   * tombstones where content was never stored).
   */
  expand(handle: string): string {
    if (!handle) throw new Error("handle required");
    const content = this.store.get(handle);
    if (content === undefined) {
      throw new Error(`unknown or dropped handle: ${handle}`);
    }
    return content;
  }

  /** Does a handle have expandable content? */
  has(handle: string): boolean {
    return this.store.has(handle);
  }

  /** Number of expandable items held. */
  size(): number {
    return this.store.size;
  }

  /** Clear everything (tests + session end). */
  reset(): void {
    this.store.clear();
    this.policy = { ...DEFAULT_POLICY };
  }

  /**
   * Entity recall: what fraction of the original's extracted
   * entities appear in the compressed summary+entities list. 1.0 =
   * perfect recall. This is the proxy for "information loss": loss
   * = 1 − recall.
   */
  entityRecall(originalContent: string, item: CompressedItem): number {
    const orig = this.extractEntities(originalContent);
    if (orig.length === 0) return 1;
    const seen = new Set<string>([...item.entities, ...this.extractEntities(item.summary)]);
    let hit = 0;
    for (const e of orig) {
      if (seen.has(e)) hit += 1;
    }
    return hit / orig.length;
  }

  // --------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------

  private validate(input: CompressionInput): void {
    if (!input || !input.id) throw new Error("id required");
    if (typeof input.content !== "string") {
      throw new Error("content must be a string");
    }
    if (!input.priority) throw new Error("priority required");
    if (!["critical", "high", "medium", "low", "ephemeral"].includes(input.priority)) {
      throw new Error(`invalid priority: ${input.priority}`);
    }
  }

  private tombstone(id: string, kind: string): CompressedItem {
    return {
      id,
      tier: 2,
      priority: "ephemeral",
      kind,
      summary: "",
      entities: [],
      handle: "DROPPED",
      originalChars: 0,
      compressedChars: 0,
      ratio: 0,
    };
  }

  private mkHandle(id: string): string {
    // Deterministic handle from id + monotonic counter substitute.
    // We just use id for stability; two compress() calls on the
    // same id overwrite the stored blob (latest wins).
    return `H:${id}`;
  }

  private makeSummary(content: string): string {
    const { headChars, tailChars } = this.policy;
    if (content.length <= headChars + tailChars + 10) {
      return content;
    }
    const head = content.slice(0, headChars);
    const tail = content.slice(content.length - tailChars);
    return `${head}\n…[${content.length - headChars - tailChars} chars elided]…\n${tail}`;
  }

  private extractEntities(content: string): string[] {
    // Ident-like tokens: alnum + _ + -, length in [minEntityLen, maxEntityLen].
    // Pathologically-long tokens (e.g. "aaaaa…aaaa" matching a single
    // 100K-char run) are truncated to maxEntityLen so they do not
    // defeat compression by re-inflating the entity-list footprint.
    const regex = /[A-Za-z_][A-Za-z0-9_\-]*/g;
    const seen = new Set<string>();
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      let tok = m[0];
      if (tok.length < this.policy.minEntityLen) continue;
      if (tok.length > this.policy.maxEntityLen) {
        tok = tok.slice(0, this.policy.maxEntityLen);
      }
      if (!seen.has(tok)) {
        seen.add(tok);
        out.push(tok);
        if (out.length >= this.policy.maxEntities) break;
      }
    }
    return out;
  }

  private sizeOf(summary: string, entities: string[]): number {
    // A compressed item's footprint is summary text + entities list,
    // plus the handle string (ignored here, tiny). This is the
    // number of chars you pay after compression.
    return summary.length + entities.reduce((s, e) => s + e.length + 1, 0);
  }
}

export const contextCompressionEngine = new ContextCompressionEngineImpl();
export type ContextCompressionEngine = typeof contextCompressionEngine;
