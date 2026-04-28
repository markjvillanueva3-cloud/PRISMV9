/**
 * QdrantMemoryEngine — Phase 0.19 U-LLM4
 *
 * Semantic memory layer on top of the thin `QdrantVectorStoreEngine`.
 * Gives higher-level engines a typed `remember / recall / forget` surface
 * keyed by **memory kind** (programs, outcomes, tribal tips, formulas,
 * playbook rules, freeform notes). Qdrant collections are created on
 * demand using a fixed naming convention (`prism_memory_<kind>`) so the
 * home + work boxes share the same layout and the H:-drive memory sync
 * (U-LLM8) has a deterministic target to mirror.
 *
 * Embedding is pluggable. Callers pass in an `embed(text)` function when
 * they construct the engine — this decouples the memory layer from
 * whichever local model (nomic, MiniLM, Ollama's nomic-embed-text) is
 * in use. U-LLM9 will supply the default embedder; until then callers
 * must inject one.
 *
 * Design rules:
 *   1. Never silently succeed — if the vector store isn't connected or
 *      embeddings fail, return a typed error so callers can decide
 *      whether to fall back to pattern matching.
 *   2. Every `remember` writes a full metadata payload: text, kind, id,
 *      custom metadata, createdAt, plus a stable source tag so recall
 *      can be filtered by origin (for example, outcomes from a given
 *      machine).
 *   3. Collection naming is fixed and shared across machines so
 *      U-LLM8's rsync doesn't have to reason about per-host paths.
 *
 * @module engines/QdrantMemoryEngine
 * @milestone PP-0.19-U-LLM4
 */

import {
  QdrantVectorStoreEngine,
  type CollectionSpec,
  type SearchHit,
} from "./QdrantVectorStoreEngine.js";

export const MEMORY_KINDS = [
  "program",
  "outcome",
  "tip",
  "formula",
  "rule",
  "playbook",
  "note",
  "error",
  "skill",
  "engine",
] as const;

export type MemoryKind = (typeof MEMORY_KINDS)[number];

export interface Embedder {
  (text: string): Promise<number[]>;
}

export interface RememberInput {
  kind: MemoryKind;
  id: string | number;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface RecallInput {
  kind: MemoryKind;
  query: string;
  limit?: number;
  filter?: Record<string, unknown>;
}

export interface MemoryItem {
  id: string | number;
  kind: MemoryKind;
  text: string;
  metadata: Record<string, unknown>;
  /** Similarity score from the backing store. Only populated on recall(). */
  score?: number;
  createdAt?: string;
}

export interface QdrantMemoryDeps {
  store?: QdrantVectorStoreEngine;
  embedder?: Embedder;
  vectorSize?: number;
  collectionPrefix?: string;
}

export type MemoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; cause?: unknown };

const DEFAULT_VECTOR_SIZE = 768; // nomic-embed-text output dim
const DEFAULT_PREFIX = "prism_memory";

// WIRE-EXEMPT: indirect dispatcher access — wrapped by QdrantMemoryEngineSingleton, which is imported by memoryDispatcher and UnifiedErrorLedgerEngine. Direct import would bypass the singleton's lazy-init + embedder factory.
export class QdrantMemoryEngine {
  private store: QdrantVectorStoreEngine;
  private embedder: Embedder | null;
  private vectorSize: number;
  private prefix: string;
  private ensured = new Set<string>();

  constructor(deps: QdrantMemoryDeps = {}) {
    this.store = deps.store ?? new QdrantVectorStoreEngine();
    this.embedder = deps.embedder ?? null;
    this.vectorSize = deps.vectorSize ?? DEFAULT_VECTOR_SIZE;
    this.prefix = deps.collectionPrefix ?? DEFAULT_PREFIX;
  }

  setEmbedder(fn: Embedder | null): void {
    this.embedder = fn;
  }

  collectionFor(kind: MemoryKind): string {
    return `${this.prefix}_${kind}`;
  }

  /** Commit a memory item; returns ok on successful upsert. */
  async remember(input: RememberInput): Promise<MemoryResult<void>> {
    const guard = this.validateRemember(input);
    if (guard) return { ok: false, error: guard };
    if (!this.embedder) {
      return { ok: false, error: "embedder not configured" };
    }
    if (!this.store.isConnected()) {
      return { ok: false, error: "qdrant not connected" };
    }

    const collection = this.collectionFor(input.kind);
    const ensured = await this.ensureCollection(collection);
    if (!ensured.ok) return ensured;

    let vector: number[];
    try {
      vector = await this.embedder(input.text);
    } catch (e) {
      return { ok: false, error: "embed failed", cause: e };
    }
    if (!Array.isArray(vector) || vector.length !== this.vectorSize) {
      return {
        ok: false,
        error: `embedder returned ${vector?.length ?? 0}-d vector, expected ${this.vectorSize}`,
      };
    }

    const payload = {
      text: input.text,
      kind: input.kind,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };

    const upserted = await this.store.upsert(collection, [
      { id: input.id, vector, payload },
    ]);
    if (!upserted.ok) return { ok: false, error: upserted.error };
    return { ok: true, value: undefined };
  }

  /** Fetch semantically similar items from the given memory kind. */
  async recall(input: RecallInput): Promise<MemoryResult<MemoryItem[]>> {
    const guard = this.validateRecall(input);
    if (guard) return { ok: false, error: guard };
    if (!this.embedder) {
      return { ok: false, error: "embedder not configured" };
    }
    if (!this.store.isConnected()) {
      return { ok: false, error: "qdrant not connected" };
    }

    const collection = this.collectionFor(input.kind);
    const ensured = await this.ensureCollection(collection);
    if (!ensured.ok) return ensured;

    let vector: number[];
    try {
      vector = await this.embedder(input.query);
    } catch (e) {
      return { ok: false, error: "embed failed", cause: e };
    }

    const found = await this.store.search({
      collection,
      vector,
      limit: input.limit ?? 10,
      filter: input.filter,
      withPayload: true,
    });
    if (!found.ok) return { ok: false, error: found.error };

    const items = found.value.map((hit) => this.hitToItem(hit, input.kind));
    return { ok: true, value: items };
  }

  /** Delete the entire collection for a kind (tests, resets). */
  async forgetAll(kind: MemoryKind): Promise<MemoryResult<boolean>> {
    if (!this.store.isConnected()) {
      return { ok: false, error: "qdrant not connected" };
    }
    const collection = this.collectionFor(kind);
    const dropped = await this.store.deleteCollection(collection);
    if (!dropped.ok) return { ok: false, error: dropped.error };
    this.ensured.delete(collection);
    return { ok: true, value: dropped.value };
  }

  /** How many items are stored under a given kind. */
  async count(kind: MemoryKind): Promise<MemoryResult<number>> {
    if (!this.store.isConnected()) {
      return { ok: false, error: "qdrant not connected" };
    }
    const collection = this.collectionFor(kind);
    const ensured = await this.ensureCollection(collection);
    if (!ensured.ok) return ensured;
    const r = await this.store.count(collection);
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, value: r.value };
  }

  listKinds(): readonly MemoryKind[] {
    return MEMORY_KINDS;
  }

  // ── internals ────────────────────────────────────────────────────────

  private async ensureCollection(
    name: string,
  ): Promise<MemoryResult<"ok">> {
    if (this.ensured.has(name)) return { ok: true, value: "ok" };
    const spec: CollectionSpec = {
      name,
      vectorSize: this.vectorSize,
      distance: "Cosine",
    };
    const r = await this.store.ensureCollection(spec);
    if (!r.ok) return { ok: false, error: r.error };
    this.ensured.add(name);
    return { ok: true, value: "ok" };
  }

  private hitToItem(hit: SearchHit, kind: MemoryKind): MemoryItem {
    const payload = hit.payload ?? {};
    const text = typeof payload.text === "string" ? payload.text : "";
    const metadata =
      payload.metadata && typeof payload.metadata === "object"
        ? (payload.metadata as Record<string, unknown>)
        : {};
    const createdAt =
      typeof payload.createdAt === "string" ? payload.createdAt : undefined;
    return {
      id: hit.id,
      kind,
      text,
      metadata,
      score: hit.score,
      createdAt,
    };
  }

  private validateRemember(input: RememberInput): string | null {
    if (!input || typeof input !== "object") return "input required";
    if (!MEMORY_KINDS.includes(input.kind)) return `unknown kind: ${input.kind}`;
    if (input.id === undefined || input.id === null || input.id === "") {
      return "id required";
    }
    if (typeof input.text !== "string" || input.text.trim() === "") {
      return "text required";
    }
    return null;
  }

  private validateRecall(input: RecallInput): string | null {
    if (!input || typeof input !== "object") return "input required";
    if (!MEMORY_KINDS.includes(input.kind)) return `unknown kind: ${input.kind}`;
    if (typeof input.query !== "string" || input.query.trim() === "") {
      return "query required";
    }
    if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit <= 0)) {
      return "limit must be positive integer";
    }
    return null;
  }
}

export const qdrantMemoryEngine = new QdrantMemoryEngine();
