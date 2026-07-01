/**
 * SearchIndexEngine -- fail-soft HTTP client for Elasticsearch.
 *
 * Phase 2 of INFRA-SYNERGY-RESEARCH-2026-06-25 (slot:bravo). A durable
 * lexical/structured search substrate that retires the 512MB V8 string-cap
 * data-loss class -- the 2026-06-08 tribal-index fail-OPEN clobber
 * (33,639 -> 1 entries) and the unreadable 548MB system-graph.json. Talks ES
 * over its REST API via global `fetch` -- NO new npm dependency (mirrors the
 * transport in GrokClientEngine.ts).
 *
 * FAIL-SOFT, FAIL-CLOSED CONTRACT (the clobber lesson, directly): a network /
 * ES failure NEVER throws, NEVER hangs, and NEVER claims a success it did not
 * VERIFY. In particular index() credits a doc only when ES returns a per-item
 * result without an `error`; an HTTP-200 bulk reply whose `items` count does
 * not match the submitted actions (none, fewer, or MORE -- truncated body,
 * proxy-injected reply, malformed ES response) is treated as an UNVERIFIABLE
 * write -> { ok:false }, never credited (this is the precise anti-pattern the
 * engine exists to retire, in both the under- and over-report directions).
 *   - index() on failure -> { ok:false } with indexed = only the docs ES
 *     confirmed, so a rebuild caller keeps writing its canonical JSON file.
 *   - query() on failure -> { ok:false, fellBack:true, hits:[] } so a read
 *     caller transparently falls back to the file backend.
 * Input validation (bad ARGS, a programmer error) DOES throw -- exactly like
 * GrokClientEngine.validate(). Only I/O fails soft.
 *
 * BACKEND FLAG: PRISM_SEARCH_BACKEND = file | es  (default "file"). Consumers
 * call isEsEnabled() to choose ES vs the existing file path; default "file"
 * means ZERO behavior change until an operator flips the flag after a parity
 * gate (see INFRA-SYNERGY-PHASE2-ELASTICSEARCH-DESIGN.md sec 4).
 *
 * WIRE-EXEMPT: an I/O CLIENT (like GrokClientEngine), not a dispatcher action.
 * Its real wiring is the file->ES consumer RE-POINT (master_index_query,
 * tribal rerank, wiki precheck), gated behind the PRISM_SEARCH_BACKEND flag +
 * a live ES cluster + a parity gate -- the Phase 2 cutover, deferred until
 * Docker/ES are up (INFRA-SYNERGY-PHASE2-ELASTICSEARCH-DESIGN.md sec 4-6).
 * Companion test: src/__tests__/SearchIndexEngine.test.ts.
 *
 * @module engines/SearchIndexEngine
 */

// 127.0.0.1 (not "localhost"): node's fetch resolves "localhost" to IPv6 ::1
// first, but a local ES/compose port-maps IPv4 127.0.0.1 -> ECONNREFUSED on ::1.
// Production overrides this with the compose service name (PRISM_ES_URL).
const DEFAULT_ES_URL = process.env.PRISM_ES_URL ?? "http://127.0.0.1:9200";
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_ES_TIMEOUT_MS ?? 10_000);
const DEFAULT_BULK_CHUNK = Number(process.env.PRISM_ES_BULK_CHUNK ?? 500);

export type SearchBackend = "file" | "es";

export interface IndexResult {
  ok: boolean;
  /** Docs ES confirmed (per-item result without an `error`). */
  indexed: number;
  /**
   * Docs not confirmed written: pre-flight skips (non-object / id-less),
   * ES per-item rejects, AND -- on a failed/unverifiable chunk -- every valid
   * doc not yet confirmed. Invariant on any return: indexed + failed === docs.length.
   */
  failed: number;
  error: string | null;
}

export interface SearchHit {
  id: string;
  score: number;
  source: Record<string, unknown>;
}

export interface QueryResult {
  ok: boolean;
  hits: SearchHit[];
  /** ES total hit count (may exceed hits.length when capped by `k`). */
  total: number;
  /** True when the ES call failed -> caller should read the file backend. */
  fellBack: boolean;
  error: string | null;
}

export interface HealthResult {
  ok: boolean;
  status: string | null;
  error: string | null;
}

export interface QuerySpec {
  /** Free-text query. Empty/omitted -> match_all bounded by `k`. */
  q?: string;
  /** Exact-match term filters, ANDed: { layer: "L10", galaxy: "mill" }. */
  filters?: Record<string, string | number | boolean>;
  /** Max hits to return. Default 10. */
  k?: number;
}

export interface IndexOptions {
  /** Field on each doc used as the ES `_id` (idempotent upsert). Default "id". */
  idField?: string;
  /** Docs per `_bulk` request -- bounds body size so no single giant string. */
  chunkSize?: number;
}

interface EsBulkResponse {
  /** One entry per submitted action; each carries `error` when ES rejected it. */
  items?: Array<Record<string, { error?: unknown }>>;
}

interface EsSearchResponse {
  hits?: {
    total?: { value?: number } | number;
    hits?: Array<{ _id?: string; _score?: number; _source?: Record<string, unknown> }>;
  };
  error?: { reason?: string; type?: string };
}

interface FetchTextResult {
  ok: boolean;
  status: number;
  text: string;
}

export class SearchIndexEngine {
  private readonly baseUrl: string;

  constructor(baseUrl: string = DEFAULT_ES_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /** The active read backend, from PRISM_SEARCH_BACKEND (default "file"). */
  searchBackend(): SearchBackend {
    return process.env.PRISM_SEARCH_BACKEND === "es" ? "es" : "file";
  }

  /** True only when an operator has flipped the backend to ES. */
  isEsEnabled(): boolean {
    return this.searchBackend() === "es";
  }

  /**
   * Cluster reachability/health. GET /_cluster/health. Fail-soft: any error
   * (down, non-2xx, non-JSON, timeout) -> { ok:false }.
   *
   * @param timeoutMs request timeout. Default PRISM_ES_TIMEOUT_MS (10s).
   * @returns HealthResult; `status` is ES color (green|yellow|red) when reachable.
   */
  async health(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<HealthResult> {
    try {
      const res = await this.fetchText(`${this.baseUrl}/_cluster/health`, { method: "GET" }, timeoutMs);
      if (!res.ok) return { ok: false, status: null, error: `http ${res.status}: ${res.text.slice(0, 160)}` };
      let body: { status?: string };
      try { body = JSON.parse(res.text); }
      catch { return { ok: false, status: null, error: `non-JSON health body: ${res.text.slice(0, 160)}` }; }
      return { ok: true, status: body.status ?? null, error: null };
    } catch (e) {
      return { ok: false, status: null, error: this.errMsg(e) };
    }
  }

  /**
   * Additive bulk upsert into `indexName`. Chunked so the request body is never
   * the whole corpus (the 512MB-string failure mode). Non-object docs and docs
   * missing a stable id are SKIPPED and counted in `failed`. FAIL-CLOSED: a
   * network error, non-2xx, non-JSON, OR an items-less 200 ends the run with
   * { ok:false } and credits `indexed` only for docs ES actually confirmed --
   * it NEVER claims an unverifiable write succeeded.
   *
   * @param indexName target ES index (non-empty string).
   * @param docs      array of plain objects to upsert.
   * @param opts      idField (default "id"), chunkSize (default 500).
   * @returns IndexResult with indexed/failed counts (indexed + failed === docs.length).
   * @throws if indexName is empty or docs is not an array (programmer error).
   */
  async index(indexName: string, docs: unknown[], opts: IndexOptions = {}): Promise<IndexResult> {
    this.assertIndexName(indexName);
    if (!Array.isArray(docs)) throw new Error("docs must be an array");
    const idField = opts.idField ?? "id";
    const chunkSize = opts.chunkSize && opts.chunkSize > 0 ? opts.chunkSize : DEFAULT_BULK_CHUNK;

    const valid: Array<{ id: string; doc: Record<string, unknown> }> = [];
    let skipped = 0;
    for (const d of docs) {
      if (!d || typeof d !== "object" || Array.isArray(d)) { skipped++; continue; }
      const rec = d as Record<string, unknown>;
      const idVal = rec[idField];
      if (idVal === undefined || idVal === null || String(idVal).length === 0) { skipped++; continue; }
      valid.push({ id: String(idVal), doc: rec });
    }

    let accepted = 0;
    // On any chunk-level failure, every valid doc not yet confirmed is unwritten.
    const bail = (error: string): IndexResult => ({ ok: false, indexed: accepted, failed: skipped + (valid.length - accepted), error });

    for (let i = 0; i < valid.length; i += chunkSize) {
      const chunk = valid.slice(i, i + chunkSize);
      const ndjson = chunk
        .map((c) => `${JSON.stringify({ index: { _index: indexName, _id: c.id } })}\n${JSON.stringify(c.doc)}`)
        .join("\n") + "\n";
      let res: FetchTextResult;
      try {
        res = await this.fetchText(
          `${this.baseUrl}/_bulk`,
          { method: "POST", headers: { "content-type": "application/x-ndjson" }, body: ndjson },
          DEFAULT_TIMEOUT_MS,
        );
      } catch (e) {
        return bail(this.errMsg(e));
      }
      if (!res.ok) return bail(`http ${res.status}: ${res.text.slice(0, 160)}`);
      let body: EsBulkResponse;
      try { body = JSON.parse(res.text); }
      catch { return bail(`non-JSON bulk body: ${res.text.slice(0, 160)}`); }
      const items = body.items ?? [];
      // A real ES _bulk 200 returns EXACTLY one item per submitted action. ANY
      // count mismatch -- none, fewer, or MORE (truncated / proxy-injected /
      // malformed reply) -- is an UNVERIFIABLE write: fail closed, never credit
      // it. This bounds `accepted` to chunk.length in BOTH directions (the
      // 2026-06-08 fail-OPEN clobber class AND its over-report twin).
      if (items.length !== chunk.length) {
        return bail(`bulk item count mismatch: ${items.length} vs ${chunk.length} (unverifiable write)`);
      }
      for (const it of items) {
        const action = it.index ?? it.create ?? it.update ?? Object.values(it)[0];
        // Credit ONLY a recognizable action object with no `error` key. An
        // absent action object or any present `error` (even falsy) => not
        // confirmed -> the doc lands in (valid.length - accepted) = failed.
        if (action && !("error" in action)) accepted++;
      }
    }
    return { ok: true, indexed: accepted, failed: skipped + (valid.length - accepted), error: null };
  }

  /**
   * Lexical + structured search against `indexName`. Builds a bool query:
   * multi_match on `q` across all text fields when present, term filters ANDed,
   * size = k. Empty/omitted `q` -> match_all bounded by `k`. Fail-soft: any
   * error -> { ok:false, fellBack:true, hits:[] } so the caller reads the file
   * backend instead.
   *
   * @param indexName target ES index (non-empty string).
   * @param spec      { q?, filters?, k? }.
   * @returns QueryResult.
   * @throws if indexName is empty or spec.k is non-positive (programmer error).
   */
  async query(indexName: string, spec: QuerySpec = {}): Promise<QueryResult> {
    this.assertIndexName(indexName);
    const k = spec.k ?? 10;
    if (!Number.isFinite(k) || k <= 0) throw new Error("k must be a positive number");

    const filterClauses = Object.entries(spec.filters ?? {}).map(([field, val]) => ({ term: { [field]: val } }));
    const must = spec.q && spec.q.trim().length > 0
      ? [{ multi_match: { query: spec.q, type: "best_fields", lenient: true } }]
      : [{ match_all: {} }];
    const body = { size: k, query: { bool: { must, filter: filterClauses } } };

    try {
      const res = await this.fetchText(
        `${this.baseUrl}/${encodeURIComponent(indexName)}/_search`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
        DEFAULT_TIMEOUT_MS,
      );
      let parsed: EsSearchResponse;
      try { parsed = JSON.parse(res.text); }
      catch { return { ok: false, hits: [], total: 0, fellBack: true, error: `non-JSON search body (http ${res.status}): ${res.text.slice(0, 160)}` }; }
      if (!res.ok) {
        const reason = parsed.error?.reason ?? `http ${res.status}`;
        return { ok: false, hits: [], total: 0, fellBack: true, error: reason };
      }
      const rawHits = parsed.hits?.hits ?? [];
      const hits: SearchHit[] = rawHits.map((h) => ({
        id: h._id ?? "",
        score: h._score ?? 0,
        source: h._source ?? {},
      }));
      const totalRaw = parsed.hits?.total;
      const total = typeof totalRaw === "number" ? totalRaw : totalRaw?.value ?? hits.length;
      return { ok: true, hits, total, fellBack: false, error: null };
    } catch (e) {
      return { ok: false, hits: [], total: 0, fellBack: true, error: this.errMsg(e) };
    }
  }

  // ---- internals ----

  /**
   * fetch + body read inside ONE abortable/timed scope, so a cluster that
   * sends headers then stalls mid-body is still aborted (GrokClientEngine reads
   * .text() inside its timed try for the same reason). Throws on network/abort
   * error; callers fail soft.
   */
  private async fetchText(url: string, init: RequestInit, timeoutMs: number): Promise<FetchTextResult> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...init, signal: ctrl.signal });
      const text = await r.text();
      return { ok: r.ok, status: r.status, text };
    } finally {
      clearTimeout(timer);
    }
  }

  private assertIndexName(indexName: string): void {
    if (typeof indexName !== "string" || indexName.trim().length === 0) {
      throw new Error("indexName must be a non-empty string");
    }
  }

  private errMsg(e: unknown): string {
    const err = e as Error;
    if (err?.name === "AbortError") return "timeout";
    return `fetch error: ${err?.message ?? String(e)}`;
  }
}

export const searchIndexEngine = new SearchIndexEngine();
