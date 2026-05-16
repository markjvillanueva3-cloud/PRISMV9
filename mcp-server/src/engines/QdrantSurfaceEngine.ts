/**
 * QdrantSurfaceEngine — TOOL-INVENTORY-MS0/U-TOOLINV-01
 * =====================================================
 *
 * Adapter that exposes `QdrantMemoryEngine` via the standard `qdrant` MCP
 * server's tool surface (`vector_search` + `vector_upsert`). Lets external
 * Claude sessions or peer MCPs query our memory store without bespoke
 * wiring. Translates collection-string → MemoryKind enum, validates input
 * shape, and normalizes errors into a structured MCP error code envelope.
 *
 * Why expose, not install:
 *   The Qdrant Labs `mcp-server-qdrant` and similar peers would duplicate
 *   the persistence layer our `QdrantMemoryEngine` already owns (collection
 *   layout, embedder, payload contract). Exposing our engine via the same
 *   tool schema lets us speak the standard wire format without forking the
 *   storage layer.
 *
 * Naming + collision avoidance:
 *   Registered under the `prism-qdrant` MCP namespace (NOT plain `qdrant`)
 *   so a user with the external `qdrant` MCP installed sees both surfaces
 *   listed without a clash. See `state/shared/external-mcp-adopt-log.jsonl`.
 *
 * Collection translation:
 *   Accepts EITHER the fully-qualified `prism_memory_<kind>` string OR a
 *   bare `<kind>` shorthand (e.g. `"tip"`). Either resolves to the same
 *   `MemoryKind` and the same underlying Qdrant collection. Unknown kinds
 *   reject with `UNKNOWN_COLLECTION` + the valid-kind list in the message.
 *
 * Error envelope:
 *   - `INVALID_INPUT`      — request shape rejected before reaching engine
 *   - `UNKNOWN_COLLECTION` — collection string did not resolve to a kind
 *   - `QDRANT_ERROR`       — engine returned `{ok:false}` (network, embed,
 *                            store error). Underlying message propagated.
 *   - `INTERNAL`           — engine threw an exception (shouldn't happen;
 *                            engine returns typed `MemoryResult` on every
 *                            documented path). Surface catches as belt-and-
 *                            suspenders so a throw doesn't crash the MCP
 *                            session.
 *
 * Design rules followed:
 *   1. Class with static methods (PRISM engine convention).
 *   2. Dependency injection — every method accepts an optional engine via
 *      `deps.engine`, defaulting to the singleton. Lets tests inject mocks
 *      without monkey-patching the singleton.
 *   3. Never throws on the documented input axis — every malformed request
 *      returns `{ok:false, code, error}`. Throws caught and downgraded to
 *      `INTERNAL` so MCP callers don't see raw stack traces.
 *
 * @module engines/QdrantSurfaceEngine
 * @milestone TOOL-INVENTORY-MS0/U-TOOLINV-01
 */

import { MEMORY_KINDS, type MemoryKind, type MemoryItem } from "./QdrantMemoryEngine.js";

export const QDRANT_SURFACE_COLLECTION_PREFIX = "prism_memory_";

/** Public name registered in `.mcp.json` (see external-mcp-adopt-log.jsonl). */
export const QDRANT_SURFACE_MCP_NAME = "prism-qdrant";

/** Max hits per `vector_search` call. Mirrors the schema cap. */
export const QDRANT_SURFACE_MAX_LIMIT = 100;

/** Default hit count when caller omits `limit`. Matches `semantic_search` default. */
export const QDRANT_SURFACE_DEFAULT_LIMIT = 10;

/**
 * Max payload text length, in JS string characters (UTF-16 code units —
 * NOT bytes). Mirrors `QdrantMemoryEngineSingleton.MAX_EMBED_INPUT_CHARS`
 * (also char-based) so a value that passes this gate also passes the
 * embedder's own char cap. Naming says CHARS to avoid the byte/char
 * confusion flagged in scrutiny.
 */
export const QDRANT_SURFACE_MAX_TEXT_CHARS = 32_768;

export type SurfaceErrorCode =
  | "INVALID_INPUT"
  | "UNKNOWN_COLLECTION"
  | "QDRANT_ERROR"
  | "INTERNAL";

export type SurfaceResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: SurfaceErrorCode;
      error: string;
      field?: string;
      /**
       * Root cause from the underlying engine, propagated verbatim on
       * QDRANT_ERROR / INTERNAL so dispatcher callers can fail loud with
       * the real reason (Karpathy R12) instead of a flattened string.
       */
      cause?: unknown;
    };

export interface SurfaceSearchInput {
  collection: string;
  query: string;
  limit?: number;
  filter?: Record<string, unknown>;
}

export interface SurfaceUpsertInput {
  collection: string;
  id: string | number;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface SurfaceHit {
  id: string | number;
  text: string;
  score?: number;
  metadata: Record<string, unknown>;
  createdAt?: string;
}

export interface SurfaceSearchValue {
  collection: string;
  kind: MemoryKind;
  hits: SurfaceHit[];
}

export interface SurfaceUpsertValue {
  collection: string;
  kind: MemoryKind;
  id: string | number;
}

/**
 * Minimal engine contract required by the surface. Lets tests inject a
 * mock without pulling the full `QdrantMemoryEngine` class shape.
 */
export interface SurfaceEngineLike {
  recall(input: {
    kind: MemoryKind;
    query: string;
    limit?: number;
    filter?: Record<string, unknown>;
  }): Promise<
    | { ok: true; value: MemoryItem[] }
    | { ok: false; error: string; cause?: unknown }
  >;
  remember(input: {
    kind: MemoryKind;
    id: string | number;
    text: string;
    metadata?: Record<string, unknown>;
  }): Promise<
    | { ok: true; value: void }
    | { ok: false; error: string; cause?: unknown }
  >;
}

export interface SurfaceDeps {
  engine?: SurfaceEngineLike;
}

/**
 * Returns the singleton engine. Wrapped so tests can stub it without
 * importing the heavy singleton at module-load time.
 */
async function resolveEngine(deps: SurfaceDeps): Promise<SurfaceEngineLike> {
  if (deps.engine) return deps.engine;
  const { QdrantMemoryEngineSingleton } = await import(
    "./QdrantMemoryEngineSingleton.js"
  );
  // QdrantMemoryEngine.{recall,remember} are structurally a superset of
  // SurfaceEngineLike (MemoryResult carries an extra optional `cause` which
  // is width-compatible with our narrower union), so a single assertion is
  // sufficient — no `as unknown as` bridge needed.
  return QdrantMemoryEngineSingleton.getInstance() as SurfaceEngineLike;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export class QdrantSurfaceEngine {
  /**
   * Parse a collection string into a `MemoryKind`.
   *
   * Accepts the fully-qualified `prism_memory_<kind>` form OR a bare
   * `<kind>` shorthand. Anything else returns `UNKNOWN_COLLECTION` with
   * the valid-kind list in the error message.
   *
   * @param collection - Either `"prism_memory_tip"` or `"tip"`.
   * @returns Resolved `MemoryKind` or a structured surface error.
   */
  static parseCollection(collection: string): SurfaceResult<MemoryKind> {
    if (typeof collection !== "string" || collection.trim() === "") {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: "collection required",
        field: "collection",
      };
    }
    let kindStr = collection.trim();
    if (kindStr.startsWith(QDRANT_SURFACE_COLLECTION_PREFIX)) {
      kindStr = kindStr.slice(QDRANT_SURFACE_COLLECTION_PREFIX.length);
    }
    if (!(MEMORY_KINDS as readonly string[]).includes(kindStr)) {
      return {
        ok: false,
        code: "UNKNOWN_COLLECTION",
        error: `unknown collection: ${collection} (valid kinds: ${MEMORY_KINDS.join(", ")})`,
        field: "collection",
      };
    }
    return { ok: true, value: kindStr as MemoryKind };
  }

  /**
   * MCP-standard `vector_search` — semantic recall over a memory collection.
   *
   * @param input - `{collection, query, limit?, filter?}` per the qdrant MCP spec.
   * @param deps - Optional engine injection (defaults to singleton).
   * @returns Hits array on success, structured error on failure.
   */
  static async vectorSearch(
    input: SurfaceSearchInput,
    deps: SurfaceDeps = {},
  ): Promise<SurfaceResult<SurfaceSearchValue>> {
    if (!isPlainObject(input)) {
      return { ok: false, code: "INVALID_INPUT", error: "input required" };
    }
    if (typeof input.query !== "string" || input.query.trim() === "") {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: "query required",
        field: "query",
      };
    }
    if (input.limit !== undefined) {
      if (
        !Number.isInteger(input.limit) ||
        input.limit <= 0 ||
        input.limit > QDRANT_SURFACE_MAX_LIMIT
      ) {
        return {
          ok: false,
          code: "INVALID_INPUT",
          error: `limit must be integer in [1, ${QDRANT_SURFACE_MAX_LIMIT}]`,
          field: "limit",
        };
      }
    }
    if (input.filter !== undefined && !isPlainObject(input.filter)) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: "filter must be a plain object",
        field: "filter",
      };
    }
    const parsed = this.parseCollection(input.collection);
    if (!parsed.ok) return parsed;

    const engine = await resolveEngine(deps);
    let recalled;
    try {
      recalled = await engine.recall({
        kind: parsed.value,
        query: input.query,
        limit: input.limit ?? QDRANT_SURFACE_DEFAULT_LIMIT,
        filter: input.filter,
      });
    } catch (e) {
      return {
        ok: false,
        code: "INTERNAL",
        error: `engine threw: ${e instanceof Error ? e.message : String(e)}`,
        cause: e,
      };
    }
    if (!recalled.ok) {
      return {
        ok: false,
        code: "QDRANT_ERROR",
        error: recalled.error,
        cause: recalled.cause,
      };
    }
    const items: MemoryItem[] = recalled.value;
    return {
      ok: true,
      value: {
        collection: input.collection,
        kind: parsed.value,
        hits: items.map((it): SurfaceHit => ({
          id: it.id,
          text: it.text,
          score: it.score,
          metadata: it.metadata,
          createdAt: it.createdAt,
        })),
      },
    };
  }

  /**
   * MCP-standard `vector_upsert` — write a memory item to a collection.
   *
   * @param input - `{collection, id, text, metadata?}` per the qdrant MCP spec.
   * @param deps - Optional engine injection (defaults to singleton).
   * @returns Echo on success, structured error on failure.
   */
  static async vectorUpsert(
    input: SurfaceUpsertInput,
    deps: SurfaceDeps = {},
  ): Promise<SurfaceResult<SurfaceUpsertValue>> {
    if (!isPlainObject(input)) {
      return { ok: false, code: "INVALID_INPUT", error: "input required" };
    }
    if (typeof input.text !== "string" || input.text.trim() === "") {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: "text required",
        field: "text",
      };
    }
    if (input.text.length > QDRANT_SURFACE_MAX_TEXT_CHARS) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: `text exceeds ${QDRANT_SURFACE_MAX_TEXT_CHARS} characters`,
        field: "text",
      };
    }
    if (input.id === undefined || input.id === null || input.id === "") {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: "id required",
        field: "id",
      };
    }
    if (typeof input.id !== "string" && typeof input.id !== "number") {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: "id must be string or number",
        field: "id",
      };
    }
    if (typeof input.id === "number" && !Number.isFinite(input.id)) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: "id must be a finite number",
        field: "id",
      };
    }
    if (input.metadata !== undefined && !isPlainObject(input.metadata)) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: "metadata must be a plain object",
        field: "metadata",
      };
    }
    const parsed = this.parseCollection(input.collection);
    if (!parsed.ok) return parsed;

    const engine = await resolveEngine(deps);
    let result;
    try {
      result = await engine.remember({
        kind: parsed.value,
        id: input.id,
        text: input.text,
        metadata: input.metadata,
      });
    } catch (e) {
      return {
        ok: false,
        code: "INTERNAL",
        error: `engine threw: ${e instanceof Error ? e.message : String(e)}`,
        cause: e,
      };
    }
    if (!result.ok) {
      return {
        ok: false,
        code: "QDRANT_ERROR",
        error: result.error,
        cause: result.cause,
      };
    }
    return {
      ok: true,
      value: {
        collection: input.collection,
        kind: parsed.value,
        id: input.id,
      },
    };
  }

  /**
   * List every valid fully-qualified collection name. Used by MCP tool
   * discovery so external callers know what `collection` values resolve.
   */
  static listCollections(): string[] {
    return MEMORY_KINDS.map(
      (k) => `${QDRANT_SURFACE_COLLECTION_PREFIX}${k}`,
    );
  }

  /**
   * Map a numeric MCP error code (400 / 500) onto a surface code so the
   * dispatcher can translate the structured error into an HTTP-style
   * envelope if it needs to (e.g. for the external MCP wire format).
   */
  static httpCodeFor(code: SurfaceErrorCode): 400 | 500 {
    if (code === "INVALID_INPUT" || code === "UNKNOWN_COLLECTION") return 400;
    return 500;
  }
}
