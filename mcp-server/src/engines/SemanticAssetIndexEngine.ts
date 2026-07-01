// WIRE-EXEMPT: dependency-injected library engine (injectable IndexEmbedder, no singleton, no current consumer); semantic asset search is already exposed via memoryDispatcher (semantic_search / qdrant_vector_search / bulk_semantic_search / brain_recall), so a new dispatcher action would duplicate prism_memory. Verdict: obsidian recall + ollama + hermes all concur (BACKEND-COMPLETION, slot:zulu 2026-06-18).
/**
 * SemanticAssetIndexEngine — Qdrant-backed semantic index for PRISM assets
 *
 * Bridges LocalEmbeddingEngine (or Ollama server-side embeddings) and
 * QdrantVectorStoreEngine into a single "search PRISM by meaning" surface.
 * Hooks and skills call `indexAsset()` at asset-write time and `search()`
 * at UserPromptSubmit to surface relevant engines/formulas/tips.
 *
 * This engine holds no vectors itself — Qdrant is the source of truth. The
 * embedder is pluggable (Xenova local, Ollama remote, or a test stub) and
 * must produce fixed-length normalized vectors suitable for cosine search.
 *
 * @module engines/SemanticAssetIndexEngine
 * @milestone PP-INFRA-SEMANTIC-INDEX
 */

import { createHash } from "node:crypto";
import type { QdrantVectorStoreEngine, Result, SearchHit } from "./QdrantVectorStoreEngine.js";

export interface IndexableAsset {
  id: string;
  kind: string;
  name: string;
  description?: string;
  tags?: string[];
}

export interface IndexEmbedder {
  embed(text: string): Promise<{ ok: boolean; vector: number[]; error: string | null }>;
}

export interface IndexConfig {
  collection: string;
  vectorSize: number;
}

export interface AssetSearchHit {
  id: string;
  kind: string;
  name: string;
  score: number;
  tags: string[];
}

export class SemanticAssetIndexEngine {
  private readonly store: QdrantVectorStoreEngine;
  private readonly embedder: IndexEmbedder;
  private config: IndexConfig;

  constructor(store: QdrantVectorStoreEngine, embedder: IndexEmbedder, config: IndexConfig) {
    if (!store || typeof store.upsert !== "function") throw new Error("store required");
    if (!embedder || typeof embedder.embed !== "function") throw new Error("embedder required");
    this.validateConfig(config);
    this.store = store;
    this.embedder = embedder;
    this.config = config;
  }

  async ensureReady(): Promise<Result<"created" | "exists">> {
    return this.store.ensureCollection({
      name: this.config.collection,
      vectorSize: this.config.vectorSize,
      distance: "Cosine",
    });
  }

  async indexAsset(asset: IndexableAsset): Promise<Result<number>> {
    this.validateAsset(asset);
    const text = this.renderForEmbedding(asset);
    const embed = await this.embedder.embed(text);
    if (!embed.ok) {
      return { ok: false, error: `embedder failed: ${embed.error ?? "unknown"}` };
    }
    if (embed.vector.length !== this.config.vectorSize) {
      return {
        ok: false,
        error: `embedder returned ${embed.vector.length}-dim vector; collection expects ${this.config.vectorSize}`,
      };
    }
    return this.store.upsert(this.config.collection, [
      {
        id: toQdrantId(asset.id),
        vector: embed.vector,
        payload: {
          externalId: asset.id,
          kind: asset.kind,
          name: asset.name,
          description: asset.description ?? "",
          tags: asset.tags ?? [],
        },
      },
    ]);
  }

  async indexBatch(assets: readonly IndexableAsset[]): Promise<Result<number>> {
    if (!Array.isArray(assets) || assets.length === 0) {
      return { ok: false, error: "assets must be a non-empty array" };
    }
    const points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> = [];
    for (const asset of assets) {
      this.validateAsset(asset);
      const text = this.renderForEmbedding(asset);
      const embed = await this.embedder.embed(text);
      if (!embed.ok) {
        return { ok: false, error: `embedder failed on '${asset.id}': ${embed.error ?? "unknown"}` };
      }
      if (embed.vector.length !== this.config.vectorSize) {
        return {
          ok: false,
          error: `asset '${asset.id}' returned ${embed.vector.length}-dim vector; expected ${this.config.vectorSize}`,
        };
      }
      points.push({
        id: toQdrantId(asset.id),
        vector: embed.vector,
        payload: {
          externalId: asset.id,
          kind: asset.kind,
          name: asset.name,
          description: asset.description ?? "",
          tags: asset.tags ?? [],
        },
      });
    }
    return this.store.upsert(this.config.collection, points);
  }

  async search(query: string, limit = 10, filterKind?: string): Promise<Result<AssetSearchHit[]>> {
    if (typeof query !== "string" || query.trim() === "") {
      return { ok: false, error: "query required" };
    }
    if (!Number.isInteger(limit) || limit <= 0) {
      return { ok: false, error: "limit must be positive integer" };
    }

    const embed = await this.embedder.embed(query);
    if (!embed.ok) {
      return { ok: false, error: `embedder failed: ${embed.error ?? "unknown"}` };
    }
    if (embed.vector.length !== this.config.vectorSize) {
      return {
        ok: false,
        error: `query vector dim ${embed.vector.length} ≠ expected ${this.config.vectorSize}`,
      };
    }

    const filter = filterKind
      ? { must: [{ key: "kind", match: { value: filterKind } }] }
      : undefined;

    const raw = await this.store.search({
      collection: this.config.collection,
      vector: embed.vector,
      limit,
      filter,
      withPayload: true,
    });
    if (!raw.ok) return raw;
    return { ok: true, value: raw.value.map((h) => this.toAssetHit(h)) };
  }

  async count(kind?: string): Promise<Result<number>> {
    const filter = kind ? { must: [{ key: "kind", match: { value: kind } }] } : undefined;
    return this.store.count(this.config.collection, filter);
  }

  getConfig(): IndexConfig {
    return this.config;
  }

  // --- internals ---------------------------------------------------------

  private renderForEmbedding(asset: IndexableAsset): string {
    const parts = [`[${asset.kind}] ${asset.name}`];
    if (asset.description) parts.push(asset.description);
    if (asset.tags && asset.tags.length > 0) parts.push(`tags: ${asset.tags.join(", ")}`);
    return parts.join("\n");
  }

  private toAssetHit(hit: SearchHit): AssetSearchHit {
    const payload = hit.payload ?? {};
    const externalId = typeof payload.externalId === "string" ? payload.externalId : null;
    return {
      id: externalId ?? String(hit.id),
      kind: String(payload.kind ?? "unknown"),
      name: String(payload.name ?? ""),
      score: hit.score,
      tags: Array.isArray(payload.tags) ? (payload.tags as string[]) : [],
    };
  }

  private validateConfig(c: IndexConfig): void {
    if (!c.collection || c.collection.trim() === "") throw new Error("collection required");
    if (!Number.isInteger(c.vectorSize) || c.vectorSize <= 0) {
      throw new Error("vectorSize must be positive integer");
    }
  }

  private validateAsset(a: IndexableAsset): void {
    if (!a.id || a.id.trim() === "") throw new Error("asset.id required");
    if (!a.kind || a.kind.trim() === "") throw new Error("asset.kind required");
    if (!a.name || a.name.trim() === "") throw new Error("asset.name required");
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Qdrant point IDs must be unsigned integers or UUIDs. PRISM assets use
 * human-readable slugs ("eng-kienzle"). Translate via a deterministic SHA-1
 * UUID-v5 (namespace: PRISM). The original slug stays in payload.externalId
 * so search hits still round-trip back to the caller's ID space.
 */
function toQdrantId(externalId: string): string {
  if (UUID_RE.test(externalId)) return externalId.toLowerCase();
  const h = createHash("sha1").update(`prism-asset:${externalId}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
