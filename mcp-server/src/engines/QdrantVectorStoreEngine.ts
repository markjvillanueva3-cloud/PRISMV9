/**
 * QdrantVectorStoreEngine — Thin client around @qdrant/js-client-rest
 *
 * Phase external-infra. Provides a PRISM-styled surface over the Qdrant REST
 * client so higher-level engines (SemanticSimilarityGuard, Tool DB vector
 * search, MIT course index) don't have to deal with the raw client's many
 * options. Methods are minimal + named after the action, not the endpoint.
 *
 * Connection contract:
 *   - The engine is stateless until a caller invokes `connect()`. Health is
 *     a read-only property derived from `ping()`.
 *   - Every operation that touches the network returns a typed `Result` so
 *     the caller can reason about failure without try/catch noise.
 *
 * Nothing here actually pulls in the Qdrant server — you still have to run
 * `docker compose up -d qdrant` (or point the engine at a remote host).
 *
 * @module engines/QdrantVectorStoreEngine
 * @milestone PP-INFRA-QDRANT
 */

import type { QdrantClient as QdrantClientType } from "@qdrant/js-client-rest";

export type Distance = "Cosine" | "Euclid" | "Dot" | "Manhattan";

export interface QdrantConnectionOptions {
  url: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface CollectionSpec {
  name: string;
  vectorSize: number;
  distance: Distance;
}

export interface UpsertPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface SearchOptions {
  collection: string;
  vector: number[];
  limit?: number;
  filter?: Record<string, unknown>;
  withPayload?: boolean;
}

export interface SearchHit {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; cause?: unknown };

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function err<T>(error: string, cause?: unknown): Result<T> {
  return { ok: false, error, cause };
}

export class QdrantVectorStoreEngine {
  private client: QdrantClientType | null = null;
  private lastConnectOptions: QdrantConnectionOptions | null = null;

  async connect(options: QdrantConnectionOptions): Promise<Result<void>> {
    this.validateConnectionOptions(options);
    try {
      const { QdrantClient } = await import("@qdrant/js-client-rest");
      this.client = new QdrantClient({
        url: options.url,
        apiKey: options.apiKey,
        timeout: options.timeoutMs,
      });
      this.lastConnectOptions = options;
      return ok(undefined);
    } catch (e) {
      this.client = null;
      return err("failed to initialise Qdrant client", e);
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getConnectionOptions(): Readonly<QdrantConnectionOptions> | null {
    return this.lastConnectOptions;
  }

  async ping(): Promise<Result<boolean>> {
    if (!this.client) return err("not connected");
    try {
      await this.client.getCollections();
      return ok(true);
    } catch (e) {
      return err("ping failed", e);
    }
  }

  async listCollections(): Promise<Result<string[]>> {
    if (!this.client) return err("not connected");
    try {
      const response = await this.client.getCollections();
      const names = response.collections.map((c) => c.name).sort();
      return ok(names);
    } catch (e) {
      return err("listCollections failed", e);
    }
  }

  async ensureCollection(spec: CollectionSpec): Promise<Result<"created" | "exists">> {
    this.validateSpec(spec);
    if (!this.client) return err("not connected");
    try {
      const list = await this.client.getCollections();
      if (list.collections.some((c) => c.name === spec.name)) {
        return ok("exists");
      }
      await this.client.createCollection(spec.name, {
        vectors: { size: spec.vectorSize, distance: spec.distance },
      });
      return ok("created");
    } catch (e) {
      return err("ensureCollection failed", e);
    }
  }

  async deleteCollection(name: string): Promise<Result<boolean>> {
    if (!this.client) return err("not connected");
    if (!name || name.trim() === "") return err("name required");
    try {
      await this.client.deleteCollection(name);
      return ok(true);
    } catch (e) {
      return err("deleteCollection failed", e);
    }
  }

  async upsert(collection: string, points: readonly UpsertPoint[]): Promise<Result<number>> {
    if (!this.client) return err("not connected");
    if (!collection || collection.trim() === "") return err("collection required");
    if (!Array.isArray(points) || points.length === 0) return err("points must be non-empty array");

    for (const p of points) this.validatePoint(p);

    try {
      await this.client.upsert(collection, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
      return ok(points.length);
    } catch (e) {
      return err("upsert failed", e);
    }
  }

  async search(options: SearchOptions): Promise<Result<SearchHit[]>> {
    if (!this.client) return err("not connected");
    this.validateSearchOptions(options);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = await this.client.search(options.collection, {
        vector: options.vector,
        limit: options.limit ?? 10,
        filter: options.filter as never,
        with_payload: options.withPayload ?? true,
      });
      const hits: SearchHit[] = (Array.isArray(raw) ? raw : []).map((h) => ({
        id: h.id,
        score: h.score ?? 0,
        payload: h.payload ?? undefined,
      }));
      return ok(hits);
    } catch (e) {
      return err("search failed", e);
    }
  }

  async count(collection: string, filter?: Record<string, unknown>): Promise<Result<number>> {
    if (!this.client) return err("not connected");
    if (!collection || collection.trim() === "") return err("collection required");
    try {
      const r = await this.client.count(collection, { filter: filter as never, exact: true });
      return ok(r.count ?? 0);
    } catch (e) {
      return err("count failed", e);
    }
  }

  /**
   * Scroll through every point in a collection using the cursor-style
   * API. Returns a flat array of points with payload+vector; intended
   * for export/backup, not for hot-path lookups.
   */
  async scrollAll(
    collection: string,
    pageSize = 256,
  ): Promise<Result<Array<{ id: string | number; vector: number[]; payload?: Record<string, unknown> }>>> {
    if (!this.client) return err("not connected");
    if (!collection || collection.trim() === "") return err("collection required");
    const out: Array<{
      id: string | number;
      vector: number[];
      payload?: Record<string, unknown>;
    }> = [];
    let offset: string | number | undefined;
    try {
      while (true) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any = await this.client.scroll(collection, {
          limit: pageSize,
          with_payload: true,
          with_vector: true,
          offset,
        });
        const points = Array.isArray(raw?.points) ? raw.points : [];
        for (const p of points) {
          const vec = Array.isArray(p.vector) ? p.vector : [];
          out.push({ id: p.id, vector: vec, payload: p.payload ?? undefined });
        }
        if (!raw?.next_page_offset) break;
        offset = raw.next_page_offset;
      }
      return ok(out);
    } catch (e) {
      return err("scroll failed", e);
    }
  }

  disconnect(): void {
    this.client = null;
    this.lastConnectOptions = null;
  }

  // --- internals ---------------------------------------------------------

  private validateConnectionOptions(o: QdrantConnectionOptions): void {
    if (!o || typeof o !== "object") throw new Error("connection options required");
    if (!o.url || o.url.trim() === "") throw new Error("url required");
    if (!/^https?:\/\//.test(o.url)) throw new Error("url must start with http(s)://");
    if (o.timeoutMs !== undefined && (!Number.isInteger(o.timeoutMs) || o.timeoutMs <= 0)) {
      throw new Error("timeoutMs must be positive integer");
    }
  }

  private validateSpec(s: CollectionSpec): void {
    if (!s.name || s.name.trim() === "") throw new Error("spec.name required");
    if (!Number.isInteger(s.vectorSize) || s.vectorSize <= 0) throw new Error("vectorSize must be positive integer");
    if (!["Cosine", "Euclid", "Dot", "Manhattan"].includes(s.distance)) throw new Error("distance invalid");
  }

  private validatePoint(p: UpsertPoint): void {
    if (p.id === undefined || p.id === null || p.id === "") throw new Error("point.id required");
    if (!Array.isArray(p.vector) || p.vector.length === 0) throw new Error("point.vector must be non-empty");
    for (const v of p.vector) {
      if (!Number.isFinite(v)) throw new Error("vector values must be finite numbers");
    }
  }

  private validateSearchOptions(o: SearchOptions): void {
    if (!o.collection || o.collection.trim() === "") throw new Error("collection required");
    if (!Array.isArray(o.vector) || o.vector.length === 0) throw new Error("vector required");
    if (o.limit !== undefined && (!Number.isInteger(o.limit) || o.limit <= 0)) {
      throw new Error("limit must be positive integer");
    }
  }
}

export const qdrantVectorStoreEngine = new QdrantVectorStoreEngine();
