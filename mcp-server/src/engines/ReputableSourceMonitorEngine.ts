/**
 * ReputableSourceMonitorEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL01
 * ================================================================
 *
 * Multi-source external poller for reputable AI/ML/manufacturing news feeds.
 * Polls 10 RSS / Atom / JSON sources with conditional GET (ETag /
 * If-Modified-Since), exponential backoff on rate-limit (1m → 5m → 30m → 2h),
 * a 50 MB payload guard, redirect-cap, and fetch timeout.
 *
 * Pure data engine — emits {@link PollResult} per source; persistence
 * (JSONL log, cron registration) lives in `scripts/source-monitor-sweep.mjs`
 * (U-ALL01 step-3). Dispatcher wiring is U-ALL01 step-5
 * (`prism_dev:source_sweep`).
 *
 * // CONVENTION-EXEMPT: stateful poller. This engine carries per-source state
 * // (etag, lastModified, backoffUntil, consecutiveFailures) that cannot be
 * // expressed as static methods + AtomicValue. State is per-instance for
 * // hermetic test isolation; a singleton is exported at the bottom for the
 * // dispatcher to use. Returns a domain-specific `PollResult` shape rather
 * // than `AtomicValue` because the result carries multi-field semantics
 * // (status, items, state snapshot, alarms) that don't reduce to a single
 * // scalar value+uncertainty.
 *
 * Architecture:
 *   - `poll(slug)`: fetch one source, parse, update per-source state, return result.
 *   - `pollAll()`: sequential fan-out over `getSources()`; aggregate counts.
 *   - State machine per source: { etag, lastModified, lastSuccess,
 *     consecutiveFailures, backoffUntil }. 4-step exponential backoff on
 *     rate-limit (HTTP 429) OR repeated parse failure. Honored by `poll()`
 *     via `backoffUntil > now()` early-return with status="backoff".
 *   - Conditional GET: ETag → `If-None-Match`; last-modified →
 *     `If-Modified-Since`. 304 → status="not_modified", state unchanged
 *     except `lastSuccess`.
 *   - Body size guard: streamed reader aborts at MAX_PAYLOAD_BYTES (50 MB)
 *     before parser is invoked.
 *   - Redirect cap: native fetch handles redirects but we set `redirect:
 *     "follow"` and let the runtime cap at 20 (Node default).  We additionally
 *     check the `redirected` flag and abort if the final URL doesn't match the
 *     source's expected hostname (MITM defense).
 *
 * Dependency injection:
 *   - `fetchFn` defaults to global `fetch`. Tests inject a mock to drive
 *     deterministic responses (429, 304, malformed XML, oversized payload).
 *   - `now` defaults to `Date.now`. Tests inject a frozen clock to assert
 *     backoff windows.
 *
 * Failure modes (per atomized spec § U-ALL01 failure_modes):
 *   - Source unreachable: status="error", state.consecutiveFailures++,
 *     advances backoff schedule. After 3 consecutive failures the engine
 *     emits an `alarm: "source_unreachable"` in the result for the operator.
 *   - Rate limit (429): status="rate_limited", advances backoff schedule
 *     immediately.
 *   - Malformed feed: status="error", error="malformed_<type>", does NOT
 *     advance backoff (the source is reachable, just broken — separate
 *     remediation path).
 *
 * Adversarial cases covered:
 *   - Source-poisoning: parser is regex-bounded; no eval, no XML entity
 *     expansion (no DOM).
 *   - MITM-replaced response: final URL hostname check (response.url vs
 *     source.url's hostname).
 *   - Infinite XML / slow-loris: FETCH_TIMEOUT_MS abort + MAX_PAYLOAD_BYTES
 *     stream cap.
 *
 * Variability axes (per spec):
 *   - 4 ingest types: rss, atom, json, scrape.
 *   - 1 / 10 / 100 items per source.
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL01
 */

// ─── Types ──────────────────────────────────────────────────────────

export type SourceType = "rss" | "atom" | "json" | "scrape";

export interface SourceConfig {
  /** kebab-case stable identifier — used as JSONL key + state map key. */
  slug: string;
  /** Ingest format. Selects the parser branch. */
  type: SourceType;
  /** Absolute URL. Hostname is pinned for the redirect check. */
  url: string;
  /** Human-readable purpose for logs / dashboards. */
  description: string;
  /**
   * Optional override: pull items from a specific JSON path (dotted).
   * Only consulted when `type === "json"`. Defaults to root array.
   */
  jsonItemsPath?: string;
}

export interface SourceItem {
  /** The source.slug — denormalized for log scanning. */
  source: string;
  /** Stable identifier (guid / id / link); used by NoveltyDetectionEngine (U-ALL02). */
  guid: string;
  title: string;
  link?: string;
  /** ISO-8601 if parseable; raw string otherwise. */
  published?: string;
  /** Best-effort summary / description (trimmed to 2 KB). */
  summary?: string;
}

export type PollStatus =
  | "ok"
  | "not_modified"
  | "rate_limited"
  | "error"
  | "backoff";

export interface SourceState {
  /** From last successful `Etag` response header; null until first 200. */
  etag: string | null;
  /** From last `Last-Modified` response header; null until first 200. */
  lastModified: string | null;
  /** ISO-8601 of last status="ok" or status="not_modified". */
  lastSuccess: string | null;
  /**
   * Number of back-to-back failed polls. Reset to 0 on `ok` /
   * `not_modified`. Indexes into BACKOFF_SCHEDULE_MS (clamped to last bucket).
   */
  consecutiveFailures: number;
  /**
   * ms timestamp (Date.now-domain) before which `poll()` returns
   * status="backoff" without making a network call. null = no backoff.
   */
  backoffUntil: number | null;
}

export interface PollResult {
  source: string;
  status: PollStatus;
  /** Items extracted on a 200 response. Empty on other statuses. */
  items: SourceItem[];
  /** HTTP status code from the upstream response (undefined on connect error). */
  httpStatus?: number;
  /** Diagnostic message — non-empty on `error` / `rate_limited`. */
  error?: string;
  /** Total bytes streamed. 0 when not_modified / backoff / connect-error. */
  bytes: number;
  /** Wall time of the poll (state snapshot to now). */
  durationMs: number;
  /** Post-poll state snapshot (caller can persist to JSONL). */
  state: SourceState;
  /**
   * Operator alarm channel. Set when consecutiveFailures crosses a threshold
   * (3 by spec).
   */
  alarm?: "source_unreachable";
}

export interface PollAllResult {
  startedAt: string;
  finishedAt: string;
  results: PollResult[];
  totalItems: number;
  ok: number;
  notModified: number;
  rateLimited: number;
  errors: number;
  backoff: number;
}

// ─── Constants ──────────────────────────────────────────────────────

/**
 * Per § U-ALL01: 10-source list across 4 ingest types + 4 thematic domains
 * (AI research, AI vendor news, dev infra, multi-agent / research).
 * Hostnames are real production endpoints — tests inject a fake fetch so
 * no network is hit during vitest.
 */
export const DEFAULT_SOURCES: ReadonlyArray<SourceConfig> = Object.freeze([
  { slug: "arxiv-cs-ai", type: "rss", url: "https://export.arxiv.org/rss/cs.AI", description: "arXiv cs.AI new submissions" },
  { slug: "anthropic-blog", type: "rss", url: "https://www.anthropic.com/news/rss.xml", description: "Anthropic news / blog" },
  { slug: "hf-papers", type: "rss", url: "https://huggingface.co/papers/rss", description: "HuggingFace daily papers" },
  { slug: "github-anthropics-releases", type: "atom", url: "https://github.com/anthropics.atom", description: "GitHub anthropics org activity" },
  { slug: "hn-frontpage", type: "rss", url: "https://news.ycombinator.com/rss", description: "Hacker News front page" },
  { slug: "rsshub-x-ai", type: "rss", url: "https://rsshub.app/x/topic/9000000000000", description: "X AI topic via RSSHub" },
  { slug: "cloudflare-changelog", type: "rss", url: "https://developers.cloudflare.com/changelog/rss.xml", description: "Cloudflare developer changelog" },
  { slug: "langchain-blog", type: "rss", url: "https://blog.langchain.dev/rss/", description: "LangChain blog" },
  { slug: "moonshot-blog", type: "rss", url: "https://moonshot.cn/blog/rss", description: "Moonshot AI blog" },
  { slug: "arxiv-cs-ma", type: "rss", url: "https://export.arxiv.org/rss/cs.MA", description: "arXiv cs.MA (multi-agent systems)" },
]);

/** Backoff schedule per atomized spec failure_modes. */
export const BACKOFF_SCHEDULE_MS: ReadonlyArray<number> = Object.freeze([
  60_000,     // 1 minute
  5 * 60_000, // 5 minutes
  30 * 60_000,// 30 minutes
  2 * 60 * 60_000, // 2 hours
]);

/** 50 MB hard payload cap (per spec adversarial_cases). */
export const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024;

/** Per-fetch timeout. arXiv RSS averages <500 ms; pathological is 30 s cap. */
export const FETCH_TIMEOUT_MS = 30_000;

/**
 * Threshold above which we emit `alarm: "source_unreachable"`.
 * Spec § U-ALL01 failure_modes: "alarm if 3 consecutive fails".
 */
export const ALARM_FAILURE_THRESHOLD = 3;

/** User-Agent identifying PRISM polls — be a good citizen on rate-limited APIs. */
const USER_AGENT = "PRISM-SourceMonitor/1.0 (+https://github.com/markjvillanueva3-cloud/prism)";

/** Cap on summary length before we truncate. RSS / Atom can carry full HTML. */
const SUMMARY_MAX_LENGTH = 2048;

// ─── Engine ─────────────────────────────────────────────────────────

export interface EngineOpts {
  sources?: ReadonlyArray<SourceConfig>;
  fetchFn?: typeof fetch;
  now?: () => number;
}

export class ReputableSourceMonitorEngine {
  readonly name = "ReputableSourceMonitorEngine";

  private sources: SourceConfig[];
  private state: Map<string, SourceState>;
  private fetchFn: typeof fetch;
  private now: () => number;
  /**
   * In-flight `poll()` deduplication. Two simultaneous calls to `poll(slug)`
   * (cron + manual + dispatcher action can interleave) share the same in-flight
   * promise so the underlying fetch fires exactly once. Cleared in the
   * finally block of the inner async helper.
   */
  private inFlight: Map<string, Promise<PollResult>>;

  constructor(opts: EngineOpts = {}) {
    this.sources = (opts.sources ?? DEFAULT_SOURCES).map((s) => ({ ...s }));
    this.fetchFn = opts.fetchFn ?? globalThis.fetch;
    this.now = opts.now ?? Date.now;
    this.state = new Map();
    this.inFlight = new Map();
    for (const s of this.sources) {
      this.state.set(s.slug, this.freshState());
    }
  }

  /** Snapshot of the active source configuration (defensive copy). */
  getSources(): ReadonlyArray<SourceConfig> {
    return this.sources.map((s) => ({ ...s }));
  }

  /** Replace the source list and reset all per-source state. */
  setSources(sources: ReadonlyArray<SourceConfig>): void {
    this.sources = sources.map((s) => ({ ...s }));
    this.state = new Map();
    this.inFlight = new Map();
    for (const s of this.sources) {
      this.state.set(s.slug, this.freshState());
    }
  }

  /**
   * Reset all per-source state (test-only escape; clears every slug to
   * fresh state, drops in-flight promises). Use this to detoxify a shared
   * singleton between vitest cases that import `reputableSourceMonitorEngine`
   * directly.
   */
  resetAll(): void {
    this.state = new Map();
    this.inFlight = new Map();
    for (const s of this.sources) {
      this.state.set(s.slug, this.freshState());
    }
  }

  /** Get a defensive copy of a source's poll state; null if unknown slug. */
  getState(slug: string): SourceState | null {
    const st = this.state.get(slug);
    return st ? { ...st } : null;
  }

  /**
   * Reset the per-source state for one slug (test helper / operator escape).
   * No-op for unknown slugs.
   */
  resetState(slug: string): boolean {
    if (!this.state.has(slug)) return false;
    this.state.set(slug, this.freshState());
    return true;
  }

  /**
   * Poll a single source by slug. Honors backoff window — if
   * `state.backoffUntil > now()`, returns immediately without a network
   * call (status="backoff"). On success, advances ETag / Last-Modified
   * and resets the failure counter. On 429 or repeated failure, schedules
   * the next backoff per {@link BACKOFF_SCHEDULE_MS}.
   *
   * Concurrent-safe: if a poll is already in-flight for the same slug,
   * the second caller awaits the SAME promise object. fetch fires exactly
   * once. Method is NOT marked `async` so the in-flight Promise is returned
   * by identity — wrapping in `async` would re-wrap into a new outer Promise.
   */
  poll(slug: string): Promise<PollResult> {
    const existing = this.inFlight.get(slug);
    if (existing) return existing;
    const p = this.pollInner(slug).finally(() => {
      // Always clear in-flight; next call gets a fresh fetch.
      this.inFlight.delete(slug);
    });
    this.inFlight.set(slug, p);
    return p;
  }

  private async pollInner(slug: string): Promise<PollResult> {
    const cfg = this.sources.find((s) => s.slug === slug);
    if (!cfg) {
      throw new Error(`Unknown source slug: ${slug}`);
    }
    const start = this.now();
    const state = this.state.get(slug) ?? this.freshState();

    // Honor backoff window.
    if (state.backoffUntil !== null && state.backoffUntil > start) {
      return {
        source: slug,
        status: "backoff",
        items: [],
        bytes: 0,
        durationMs: 0,
        state: { ...state },
      };
    }

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      "Accept": this.acceptHeaderFor(cfg.type),
    };
    if (state.etag) headers["If-None-Match"] = state.etag;
    if (state.lastModified) headers["If-Modified-Since"] = state.lastModified;

    let response: Response;
    try {
      response = await this.fetchWithTimeout(cfg.url, headers);
    } catch (err) {
      const next = this.applyFailureBackoff(state);
      this.state.set(slug, next);
      const r: PollResult = {
        source: slug,
        status: "error",
        items: [],
        error: err instanceof Error ? err.message : String(err),
        bytes: 0,
        durationMs: this.now() - start,
        state: { ...next },
      };
      if (next.consecutiveFailures >= ALARM_FAILURE_THRESHOLD) {
        r.alarm = "source_unreachable";
      }
      return r;
    }

    // Conditional-GET hit.
    if (response.status === 304) {
      const next: SourceState = {
        ...state,
        consecutiveFailures: 0,
        backoffUntil: null,
        lastSuccess: new Date(this.now()).toISOString(),
      };
      this.state.set(slug, next);
      return {
        source: slug,
        status: "not_modified",
        items: [],
        httpStatus: 304,
        bytes: 0,
        durationMs: this.now() - start,
        state: { ...next },
      };
    }

    // Rate-limited — advance backoff WITHOUT marking unreachable
    // (the upstream IS reachable; it's just throttling).
    if (response.status === 429) {
      const next = this.applyFailureBackoff(state);
      this.state.set(slug, next);
      return {
        source: slug,
        status: "rate_limited",
        items: [],
        httpStatus: 429,
        error: "rate_limited",
        bytes: 0,
        durationMs: this.now() - start,
        state: { ...next },
      };
    }

    // Other non-2xx → error.
    if (!response.ok) {
      const next = this.applyFailureBackoff(state);
      this.state.set(slug, next);
      const r: PollResult = {
        source: slug,
        status: "error",
        items: [],
        httpStatus: response.status,
        error: `http_${response.status}`,
        bytes: 0,
        durationMs: this.now() - start,
        state: { ...next },
      };
      if (next.consecutiveFailures >= ALARM_FAILURE_THRESHOLD) {
        r.alarm = "source_unreachable";
      }
      return r;
    }

    // MITM defense — final URL hostname must match source hostname.
    // Does NOT advance backoff (would lock us out of legitimate-after-DNS-
    // recovery sources). Bumps consecutiveFailures so chronic MITM still
    // raises the alarm.
    if (response.url) {
      try {
        const expected = new URL(cfg.url).hostname;
        const got = new URL(response.url).hostname;
        if (got !== expected) {
          const next: SourceState = {
            ...state,
            consecutiveFailures: state.consecutiveFailures + 1,
            backoffUntil: state.backoffUntil,
          };
          this.state.set(slug, next);
          const r: PollResult = {
            source: slug,
            status: "error",
            items: [],
            httpStatus: response.status,
            error: `redirect_host_mismatch: expected=${expected} got=${got}`,
            bytes: 0,
            durationMs: this.now() - start,
            state: { ...next },
          };
          if (next.consecutiveFailures >= ALARM_FAILURE_THRESHOLD) {
            r.alarm = "source_unreachable";
          }
          return r;
        }
      } catch {
        // Malformed URL — treat as error.
        const next = this.applyFailureBackoff(state);
        this.state.set(slug, next);
        return {
          source: slug,
          status: "error",
          items: [],
          httpStatus: response.status,
          error: "malformed_response_url",
          bytes: 0,
          durationMs: this.now() - start,
          state: { ...next },
        };
      }
    }

    // Read body with size guard.
    let bodyText: string;
    let bytes: number;
    try {
      const { text, size } = await this.readBodyWithGuard(response);
      bodyText = text;
      bytes = size;
    } catch (err) {
      const next = this.applyFailureBackoff(state);
      this.state.set(slug, next);
      return {
        source: slug,
        status: "error",
        items: [],
        httpStatus: response.status,
        error: err instanceof Error ? err.message : String(err),
        bytes: 0,
        durationMs: this.now() - start,
        state: { ...next },
      };
    }

    // Parse.
    let items: SourceItem[];
    try {
      items = this.parseBody(cfg, bodyText);
    } catch (err) {
      // Malformed feed — do NOT advance backoff (source is reachable, just
      // broken). Bump failure counter so the alarm still fires on chronic
      // breakage, but don't lock ourselves out of polling.
      const next: SourceState = {
        ...state,
        consecutiveFailures: state.consecutiveFailures + 1,
        backoffUntil: state.backoffUntil,
      };
      this.state.set(slug, next);
      const r: PollResult = {
        source: slug,
        status: "error",
        items: [],
        httpStatus: response.status,
        error: `malformed_${cfg.type}: ${err instanceof Error ? err.message : String(err)}`,
        bytes,
        durationMs: this.now() - start,
        state: { ...next },
      };
      if (next.consecutiveFailures >= ALARM_FAILURE_THRESHOLD) {
        r.alarm = "source_unreachable";
      }
      return r;
    }

    // Success — update conditional-GET state and reset failure counter.
    const etag = response.headers.get("etag");
    const lastMod = response.headers.get("last-modified");
    const next: SourceState = {
      etag: etag ?? state.etag,
      lastModified: lastMod ?? state.lastModified,
      lastSuccess: new Date(this.now()).toISOString(),
      consecutiveFailures: 0,
      backoffUntil: null,
    };
    this.state.set(slug, next);
    return {
      source: slug,
      status: "ok",
      items,
      httpStatus: response.status,
      bytes,
      durationMs: this.now() - start,
      state: { ...next },
    };
  }

  /**
   * Poll every configured source sequentially. Sequential (not parallel) so
   * we don't slam one network with 10 concurrent requests + so a misbehaving
   * source can't slow the rest by saturating fetch's concurrency budget.
   * Backoff state is per-source so a 1-source 429 doesn't block the other 9.
   */
  async pollAll(): Promise<PollAllResult> {
    const startedAt = new Date(this.now()).toISOString();
    const results: PollResult[] = [];
    let totalItems = 0;
    let ok = 0;
    let notModified = 0;
    let rateLimited = 0;
    let errors = 0;
    let backoff = 0;
    for (const cfg of this.sources) {
      const r = await this.poll(cfg.slug);
      results.push(r);
      totalItems += r.items.length;
      switch (r.status) {
        case "ok": ok++; break;
        case "not_modified": notModified++; break;
        case "rate_limited": rateLimited++; break;
        case "error": errors++; break;
        case "backoff": backoff++; break;
      }
    }
    const finishedAt = new Date(this.now()).toISOString();
    return { startedAt, finishedAt, results, totalItems, ok, notModified, rateLimited, errors, backoff };
  }

  // ─── Private helpers ─────────────────────────────────────────────

  private freshState(): SourceState {
    return {
      etag: null,
      lastModified: null,
      lastSuccess: null,
      consecutiveFailures: 0,
      backoffUntil: null,
    };
  }

  private acceptHeaderFor(type: SourceType): string {
    switch (type) {
      case "atom":   return "application/atom+xml, application/xml; q=0.9, */*; q=0.1";
      case "rss":    return "application/rss+xml, application/xml; q=0.9, */*; q=0.1";
      case "json":   return "application/json, */*; q=0.1";
      case "scrape": return "text/html, */*; q=0.1";
    }
  }

  /** Schedule the next backoff per the failure schedule. Clamps at last bucket. */
  private applyFailureBackoff(prev: SourceState): SourceState {
    const nextFailures = prev.consecutiveFailures + 1;
    const idx = Math.min(nextFailures - 1, BACKOFF_SCHEDULE_MS.length - 1);
    const delay = BACKOFF_SCHEDULE_MS[idx]!;
    return {
      ...prev,
      consecutiveFailures: nextFailures,
      backoffUntil: this.now() + delay,
    };
  }

  /**
   * Fetch with an AbortController-driven timeout. Native fetch does not have a
   * built-in timeout option in older Node runtimes, so we drive it explicitly.
   */
  private async fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
    const ctrl = new AbortController();
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      // redirect: follow keeps the runtime defaults; we additionally MITM-check
      // by comparing response.url's hostname.
      const r = await this.fetchFn(url, { headers, signal: ctrl.signal, redirect: "follow" });
      return r;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Read a Response body with a hard size cap. We read the stream chunk by
   * chunk so an oversized payload aborts before the whole body lands in memory.
   * Falls back to `text()` when the runtime doesn't expose a readable
   * stream (e.g. some test mocks return a plain object).
   */
  private async readBodyWithGuard(response: Response): Promise<{ text: string; size: number }> {
    const body = response.body;
    if (body && typeof (body as ReadableStream).getReader === "function") {
      const reader = (body as ReadableStream<Uint8Array>).getReader();
      // fatal:true so malformed UTF-8 throws instead of silently producing
      // U+FFFD replacement chars (would mask source corruption as "ok").
      const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
      let size = 0;
      const chunks: string[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            size += value.byteLength;
            if (size > MAX_PAYLOAD_BYTES) {
              throw new Error(`payload_exceeded_${MAX_PAYLOAD_BYTES}_bytes`);
            }
            chunks.push(decoder.decode(value, { stream: true }));
          }
        }
        chunks.push(decoder.decode());
        return { text: chunks.join(""), size };
      } finally {
        // Cancel both the reader AND the response body — best-effort cleanup
        // so an aborted oversized download doesn't keep streaming behind us.
        try { await reader.cancel(); } catch { /* best-effort */ }
        try { await (response.body as ReadableStream | null)?.cancel?.(); } catch { /* best-effort */ }
      }
    }
    // Mock / non-stream path — use text() and post-check size.
    const text = await response.text();
    const size = Buffer.byteLength(text, "utf-8");
    if (size > MAX_PAYLOAD_BYTES) {
      throw new Error(`payload_exceeded_${MAX_PAYLOAD_BYTES}_bytes`);
    }
    return { text, size };
  }

  private parseBody(cfg: SourceConfig, body: string): SourceItem[] {
    switch (cfg.type) {
      case "rss":    return this.parseRSS(body, cfg.slug);
      case "atom":   return this.parseAtom(body, cfg.slug);
      case "json":   return this.parseJSON(body, cfg);
      case "scrape": throw new Error("scrape_parser_not_implemented");
      default: {
        // Exhaustiveness check — if a future SourceType is added without
        // updating this switch, the compiler flags it here.
        const _exhaustive: never = cfg.type;
        throw new Error(`unknown_source_type: ${String(_exhaustive)}`);
      }
    }
  }

  /**
   * Minimal RSS 2.0 parser. Extracts `<item>` blocks, then plucks the
   * standard child tags. Uses regex with the `s` (dot-matches-newline) flag —
   * no DOM, no entity expansion, immune to billion-laughs.
   *
   * Limitations (acceptable for U-ALL01):
   *   - Does not resolve namespace prefixes (dc:date, atom:link in RSS feeds).
   *   - CDATA sections are pulled verbatim; HTML entities NOT decoded
   *     (consumer can re-decode).
   *   - Self-closing `<title/>` produces empty string.
   */
  private parseRSS(xml: string, slug: string): SourceItem[] {
    // Tighter gate: require an explicit RSS root (rules out Atom feeds and
    // arbitrary HTML pages that happen to contain a <channel> tag).
    if (!/<rss\b/i.test(xml)) {
      // Atom misclassification: a `type:"rss"` source pointing at an Atom URL.
      if (/<feed\b[^>]*xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/i.test(xml)) {
        throw new Error("not_rss_got_atom");
      }
      throw new Error("not_rss");
    }
    const items: SourceItem[] = [];
    const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(xml)) !== null) {
      const block = m[1]!;
      const title = this.firstTagText(block, "title");
      const link = this.firstTagText(block, "link");
      const guidFromTag = this.firstTagText(block, "guid");
      const published = this.firstTagText(block, "pubDate") || this.firstTagText(block, "date");
      const summary = this.firstTagText(block, "description") || this.firstTagText(block, "summary");
      const guid = guidFromTag || link || `${slug}:${title}:${published || ""}`;
      items.push({
        source: slug,
        guid,
        title,
        link: link || undefined,
        published: published || undefined,
        summary: summary ? this.truncate(summary, SUMMARY_MAX_LENGTH) : undefined,
      });
    }
    return items;
  }

  /**
   * Minimal Atom 1.0 parser. Same constraints as parseRSS.
   * `<entry>` blocks; `<id>` over `<guid>`; `<link href="...">` attr.
   */
  private parseAtom(xml: string, slug: string): SourceItem[] {
    if (!/<feed[\s>]/i.test(xml)) {
      throw new Error("not_atom");
    }
    const items: SourceItem[] = [];
    const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(xml)) !== null) {
      const block = m[1]!;
      const title = this.firstTagText(block, "title");
      const id = this.firstTagText(block, "id");
      const published = this.firstTagText(block, "published") || this.firstTagText(block, "updated");
      const summary = this.firstTagText(block, "summary") || this.firstTagText(block, "content");
      // Atom: <link href="..."/>
      let link: string | undefined;
      const linkMatch = block.match(/<link\b[^>]*\bhref="([^"]+)"/i);
      if (linkMatch) link = linkMatch[1];
      const guid = id || link || `${slug}:${title}:${published || ""}`;
      items.push({
        source: slug,
        guid,
        title,
        link,
        published: published || undefined,
        summary: summary ? this.truncate(summary, SUMMARY_MAX_LENGTH) : undefined,
      });
    }
    return items;
  }

  /**
   * JSON parser. Default extraction: the parsed value must be an array, or
   * an object containing `items` / `data` / `entries`. Overridable via
   * `cfg.jsonItemsPath` (dotted, e.g. "result.list").
   */
  private parseJSON(body: string, cfg: SourceConfig): SourceItem[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      throw new Error(`invalid_json: ${err instanceof Error ? err.message : String(err)}`);
    }
    let raw: unknown = parsed;
    if (cfg.jsonItemsPath) {
      // Block prototype-pollution: reject path segments that walk the
      // prototype chain. Use Object.hasOwn (own-property only) rather than
      // `in` (which traverses the prototype chain).
      const BAD_SEGS = new Set(["__proto__", "constructor", "prototype"]);
      for (const seg of cfg.jsonItemsPath.split(".")) {
        if (BAD_SEGS.has(seg)) {
          throw new Error(`jsonItemsPath_forbidden_segment: ${seg}`);
        }
        if (
          raw &&
          typeof raw === "object" &&
          !Array.isArray(raw) &&
          Object.prototype.hasOwnProperty.call(raw, seg)
        ) {
          raw = (raw as Record<string, unknown>)[seg];
        } else {
          throw new Error(`jsonItemsPath_not_found: ${cfg.jsonItemsPath}`);
        }
      }
    } else if (!Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown> | null;
      if (obj && Array.isArray(obj.items)) raw = obj.items;
      else if (obj && Array.isArray(obj.data)) raw = obj.data;
      else if (obj && Array.isArray(obj.entries)) raw = obj.entries;
      else throw new Error("json_root_not_array");
    }
    if (!Array.isArray(raw)) throw new Error("json_items_not_array");

    return raw.map((row, idx) => this.normalizeJsonItem(row, cfg.slug, idx));
  }

  private normalizeJsonItem(row: unknown, slug: string, idx: number): SourceItem {
    if (!row || typeof row !== "object") {
      return { source: slug, guid: `${slug}:#${idx}`, title: "" };
    }
    const r = row as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title
      : typeof r.name === "string" ? r.name
      : "";
    const link = typeof r.link === "string" ? r.link
      : typeof r.url === "string" ? r.url
      : undefined;
    const guid = typeof r.guid === "string" ? r.guid
      : typeof r.id === "string" ? r.id
      : link
      ? link
      : `${slug}:#${idx}`;
    const publishedRaw = typeof r.published === "string" ? r.published
      : typeof r.published_at === "string" ? r.published_at
      : typeof r.date === "string" ? r.date
      : undefined;
    const summary = typeof r.summary === "string" ? r.summary
      : typeof r.description === "string" ? r.description
      : undefined;
    return {
      source: slug,
      guid,
      title,
      link,
      published: publishedRaw,
      summary: summary ? this.truncate(summary, SUMMARY_MAX_LENGTH) : undefined,
    };
  }

  private firstTagText(block: string, tag: string): string {
    // Strip CDATA sections before tag-extraction so a <description><![CDATA[
    // <title>X</title>]]></description> can't fool the next firstTagText("title")
    // call into matching the CDATA-inner tag. Replace CDATA bodies with a
    // sentinel that contains no XML metacharacters.
    const sanitized = block.replace(
      /<!\[CDATA\[([\s\S]*?)\]\]>/g,
      (_match, inner) => inner.replace(/[<>&]/g, " "),
    );
    // Match <tag>...</tag> or self-closing <tag/>.
    const re = new RegExp(`<${tag}\\b[^>]*?(?:/>|>([\\s\\S]*?)<\\/${tag}>)`, "i");
    const m = re.exec(sanitized);
    if (!m) return "";
    return (m[1] ?? "").trim();
  }

  private truncate(s: string, max: number): string {
    return s.length <= max ? s : s.slice(0, max);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

export const reputableSourceMonitorEngine = new ReputableSourceMonitorEngine();
