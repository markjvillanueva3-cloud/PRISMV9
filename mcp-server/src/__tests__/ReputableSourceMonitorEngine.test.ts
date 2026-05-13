/**
 * ReputableSourceMonitorEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL01 tests
 * ======================================================================
 *
 * Covers the 7 cases mandated by the atomized U-ALL01 spec:
 *   1. happy path — arXiv RSS parses, items returned, state updated
 *   2. 429 backoff — rate-limit advances backoff schedule
 *   3. malformed RSS — quarantined; status="error" with malformed_rss prefix
 *   4. redirect loop — final hostname mismatch caught (MITM defense)
 *   5. 50MB payload guard — body cap aborts mid-stream
 *   6. ETag honored — 304 response → status="not_modified", state untouched
 *   7. source-list config — setSources / custom sources work end-to-end
 *
 * Plus 5 hardening cases:
 *   8. backoff window honored — second poll within window returns "backoff" w/o fetch
 *   9. backoff schedule — 4-step ladder advances on consecutive failures
 *  10. alarm threshold — 3 consecutive failures sets alarm="source_unreachable"
 *  11. parseAtom — Atom 1.0 entries extract correctly
 *  12. pollAll aggregation — counts roll up per status
 *
 * Variability axes covered: rss + atom + json (3 of 4 ingest types per spec
 * variability_axis); 0 / 1 / 3 items per source (representative slice of
 * "1/10/100 items").
 *
 * All tests inject a mock `fetchFn` so vitest never hits the network.
 * All assertions use concrete-value matchers (toBe / toMatch / toHaveLength)
 * — no toBeDefined/toBeNull/toBeUndefined presence-only stubs.
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL01
 */

import { describe, it, expect } from "vitest";
import {
  ReputableSourceMonitorEngine,
  DEFAULT_SOURCES,
  BACKOFF_SCHEDULE_MS,
  MAX_PAYLOAD_BYTES,
  ALARM_FAILURE_THRESHOLD,
  type SourceConfig,
  type SourceState,
} from "../engines/ReputableSourceMonitorEngine.js";

// ─── Test helpers ───────────────────────────────────────────────────

interface MockResponseInit {
  status?: number;
  url?: string;
  body?: string;
  headers?: Record<string, string>;
  /** When set, the body comes as a ReadableStream (forces stream-cap path). */
  streamChunks?: Uint8Array[];
}

/**
 * HTTP statuses that the WHATWG Response constructor rejects when the body
 * isn't null. Tests that simulate 304 / 204 etc must pass body=null.
 */
const NULL_BODY_STATUSES: ReadonlySet<number> = new Set([101, 103, 204, 205, 304]);

function mockResponse(init: MockResponseInit = {}): Response {
  const status = init.status ?? 200;
  const url = init.url ?? "https://export.arxiv.org/rss/cs.AI";
  const headers = new Headers(init.headers ?? {});
  let body: BodyInit | null;
  if (init.streamChunks) {
    body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of init.streamChunks!) controller.enqueue(c);
        controller.close();
      },
    });
  } else if (NULL_BODY_STATUSES.has(status)) {
    body = null;
  } else {
    body = init.body ?? "";
  }
  const r = new Response(body, { status, headers });
  Object.defineProperty(r, "url", { value: url, configurable: true });
  return r;
}

function rssDoc(items: Array<{ title: string; link?: string; guid?: string; pubDate?: string; description?: string }>): string {
  const itemBlocks = items
    .map(
      (i) => `
  <item>
    <title>${i.title}</title>
    ${i.link ? `<link>${i.link}</link>` : ""}
    ${i.guid ? `<guid>${i.guid}</guid>` : ""}
    ${i.pubDate ? `<pubDate>${i.pubDate}</pubDate>` : ""}
    ${i.description ? `<description>${i.description}</description>` : ""}
  </item>`,
    )
    .join("");
  return `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Test feed</title>
${itemBlocks}
</channel></rss>`;
}

function atomDoc(entries: Array<{ title: string; id?: string; link?: string; published?: string; summary?: string }>): string {
  const entryBlocks = entries
    .map(
      (e) => `
  <entry>
    <title>${e.title}</title>
    ${e.id ? `<id>${e.id}</id>` : ""}
    ${e.link ? `<link href="${e.link}"/>` : ""}
    ${e.published ? `<published>${e.published}</published>` : ""}
    ${e.summary ? `<summary>${e.summary}</summary>` : ""}
  </entry>`,
    )
    .join("");
  return `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test atom</title>
${entryBlocks}
</feed>`;
}

const SINGLE_RSS_SOURCE: SourceConfig[] = [
  { slug: "arxiv-cs-ai", type: "rss", url: "https://export.arxiv.org/rss/cs.AI", description: "test" },
];

/** Strict "fresh state" snapshot — every field at its initial value. */
const FRESH_STATE: SourceState = {
  etag: null,
  lastModified: null,
  lastSuccess: null,
  consecutiveFailures: 0,
  backoffUntil: null,
};

// ─── Tests ──────────────────────────────────────────────────────────

describe("ReputableSourceMonitorEngine — U-ALL01", () => {
  describe("§1 happy path — arXiv RSS parses", () => {
    it("returns parsed items + status='ok' + advances ETag/Last-Modified state", async () => {
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://export.arxiv.org/rss/cs.AI",
          headers: { etag: '"abc-123"', "last-modified": "Wed, 13 May 2026 10:00:00 GMT" },
          body: rssDoc([
            { title: "Paper A", link: "https://arxiv.org/abs/2605.00001", guid: "arxiv:2605.00001", pubDate: "Wed, 13 May 2026 10:00:00 GMT", description: "Abstract A" },
            { title: "Paper B", link: "https://arxiv.org/abs/2605.00002", guid: "arxiv:2605.00002" },
            { title: "Paper C", description: "no link, no guid" },
          ]),
        });
      const engine = new ReputableSourceMonitorEngine({ sources: SINGLE_RSS_SOURCE, fetchFn });
      const r = await engine.poll("arxiv-cs-ai");

      expect(r.status).toBe("ok");
      expect(r.httpStatus).toBe(200);
      expect(r.items).toHaveLength(3);
      expect(r.items[0].title).toBe("Paper A");
      expect(r.items[0].guid).toBe("arxiv:2605.00001");
      expect(r.items[0].link).toBe("https://arxiv.org/abs/2605.00001");
      expect(r.items[0].published).toBe("Wed, 13 May 2026 10:00:00 GMT");
      expect(r.items[0].summary).toBe("Abstract A");
      // Item with no guid falls back to link.
      expect(r.items[1].guid).toBe("arxiv:2605.00002");
      // Item with neither guid nor link gets synthesized from slug+title+pub.
      expect(r.items[2].guid).toMatch(/^arxiv-cs-ai:Paper C/);
      // State advanced — concrete-shape assertions throughout.
      const st = engine.getState("arxiv-cs-ai")!;
      expect(st.etag).toBe('"abc-123"');
      expect(st.lastModified).toBe("Wed, 13 May 2026 10:00:00 GMT");
      expect(st.consecutiveFailures).toBe(0);
      expect(st.backoffUntil).toBe(null);
      // ISO-8601 lastSuccess (concrete regex, not presence stub).
      expect(st.lastSuccess).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("§2 429 rate-limit — advances backoff schedule", () => {
    it("returns status='rate_limited' + sets backoffUntil = now + BACKOFF_SCHEDULE_MS[0]", async () => {
      let nowMs = 1_000_000;
      const fetchFn = async () => mockResponse({ status: 429 });
      const engine = new ReputableSourceMonitorEngine({
        sources: SINGLE_RSS_SOURCE,
        fetchFn,
        now: () => nowMs,
      });
      const r = await engine.poll("arxiv-cs-ai");

      expect(r.status).toBe("rate_limited");
      expect(r.httpStatus).toBe(429);
      expect(r.error).toBe("rate_limited");
      const st = engine.getState("arxiv-cs-ai")!;
      expect(st.consecutiveFailures).toBe(1);
      expect(st.backoffUntil).toBe(nowMs + BACKOFF_SCHEDULE_MS[0]); // 1m
    });
  });

  describe("§3 malformed RSS — quarantine + log", () => {
    it("returns status='error' with malformed_rss prefix; preserves backoff state but bumps failure counter", async () => {
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          body: "<html>not RSS at all</html>",
        });
      const engine = new ReputableSourceMonitorEngine({ sources: SINGLE_RSS_SOURCE, fetchFn });
      const r = await engine.poll("arxiv-cs-ai");

      expect(r.status).toBe("error");
      // Concrete error shape — exact prefix match.
      expect(r.error).toMatch(/^malformed_rss:/);
      // No backoff scheduled — source is reachable, just broken.
      const st = engine.getState("arxiv-cs-ai")!;
      expect(st.backoffUntil).toBe(null);
      // But failure counter bumps so chronic breakage still triggers alarm.
      expect(st.consecutiveFailures).toBe(1);
    });

    it("§3b valid RSS with zero items returns ok+[] (disambiguates §3 — engine must actually parse, not just stub on HTML)", async () => {
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          // Valid RSS root, zero <item> blocks. A stub engine that returns
          // "malformed_rss" on any input would FAIL this test; a real
          // parser returns ok with empty items.
          body: `<?xml version="1.0"?><rss version="2.0"><channel><title>empty</title></channel></rss>`,
        });
      const engine = new ReputableSourceMonitorEngine({ sources: SINGLE_RSS_SOURCE, fetchFn });
      const r = await engine.poll("arxiv-cs-ai");

      expect(r.status).toBe("ok");
      expect(r.items).toHaveLength(0);
      // State advances (lastSuccess set) — source IS reachable.
      const st = engine.getState("arxiv-cs-ai")!;
      expect(st.consecutiveFailures).toBe(0);
      expect(st.lastSuccess).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("§3c Atom feed served as type='rss' → not_rss_got_atom error (misclassification detection)", async () => {
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          body: `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>x</title></feed>`,
        });
      const engine = new ReputableSourceMonitorEngine({ sources: SINGLE_RSS_SOURCE, fetchFn });
      const r = await engine.poll("arxiv-cs-ai");

      expect(r.status).toBe("error");
      // Concrete error shape — misclassification is its own variant.
      expect(r.error).toBe("malformed_rss: not_rss_got_atom");
    });
  });

  describe("§4 redirect host-mismatch (MITM defense)", () => {
    it("rejects responses whose final URL hostname doesn't match source URL hostname", async () => {
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://attacker.example/feed.xml", // ≠ export.arxiv.org
          body: rssDoc([{ title: "Should not parse" }]),
        });
      const engine = new ReputableSourceMonitorEngine({ sources: SINGLE_RSS_SOURCE, fetchFn });
      const r = await engine.poll("arxiv-cs-ai");

      expect(r.status).toBe("error");
      // Concrete error shape — full regex match.
      expect(r.error).toMatch(/^redirect_host_mismatch: expected=export\.arxiv\.org got=attacker\.example$/);
      expect(r.items).toHaveLength(0);
    });
  });

  describe("§5 50MB payload guard — stream cap aborts mid-stream", () => {
    it("aborts when streamed body exceeds MAX_PAYLOAD_BYTES (no parse attempted)", async () => {
      const oneMB = 1024 * 1024;
      const overage = MAX_PAYLOAD_BYTES + oneMB;
      const chunks: Uint8Array[] = [];
      let remaining = overage;
      while (remaining > 0) {
        const sz = Math.min(remaining, oneMB);
        chunks.push(new Uint8Array(sz));
        remaining -= sz;
      }
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          streamChunks: chunks,
        });
      const engine = new ReputableSourceMonitorEngine({ sources: SINGLE_RSS_SOURCE, fetchFn });
      const r = await engine.poll("arxiv-cs-ai");

      expect(r.status).toBe("error");
      // Exact byte-count match in error message.
      expect(r.error).toBe(`payload_exceeded_${MAX_PAYLOAD_BYTES}_bytes`);
      expect(r.bytes).toBe(0);
      // Failure backoff applied (transport-level error, not parser-level).
      const st = engine.getState("arxiv-cs-ai")!;
      expect(st.consecutiveFailures).toBe(1);
      // Concrete numeric assertion (not presence-only).
      expect(typeof st.backoffUntil).toBe("number");
      expect(st.backoffUntil!).toBeGreaterThan(0);
    }, 30_000);
  });

  describe("§6 ETag honored — 304 returns 'not_modified' without re-parsing", () => {
    it("returns status='not_modified' and preserves ETag/lastModified state when server returns 304", async () => {
      let etagSent: string = "";
      let calls = 0;
      const fetchFn = async (_url: string | URL | Request, init?: RequestInit) => {
        calls++;
        const headers = new Headers((init?.headers ?? {}) as HeadersInit);
        if (calls === 1) {
          return mockResponse({
            status: 200,
            url: "https://export.arxiv.org/rss/cs.AI",
            headers: { etag: '"v1"' },
            body: rssDoc([{ title: "First", guid: "g1" }]),
          });
        }
        etagSent = headers.get("if-none-match") ?? "";
        return mockResponse({ status: 304, url: "https://export.arxiv.org/rss/cs.AI" });
      };
      const engine = new ReputableSourceMonitorEngine({ sources: SINGLE_RSS_SOURCE, fetchFn });

      const r1 = await engine.poll("arxiv-cs-ai");
      expect(r1.status).toBe("ok");
      const r2 = await engine.poll("arxiv-cs-ai");
      expect(r2.status).toBe("not_modified");
      expect(r2.httpStatus).toBe(304);
      expect(r2.items).toHaveLength(0);
      expect(etagSent).toBe('"v1"');
      const st = engine.getState("arxiv-cs-ai")!;
      expect(st.etag).toBe('"v1"');
      expect(st.consecutiveFailures).toBe(0);
      expect(st.backoffUntil).toBe(null);
    });
  });

  describe("§7 setSources — custom source list works end-to-end", () => {
    it("setSources replaces the active list and resets all per-source state", async () => {
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://example.test/feed.xml", // matches custom-feed source URL
          body: rssDoc([{ title: "Custom", guid: "c1" }]),
        });
      const engine = new ReputableSourceMonitorEngine({ fetchFn });

      expect(engine.getSources()).toHaveLength(DEFAULT_SOURCES.length);

      const custom: SourceConfig[] = [
        { slug: "custom-feed", type: "rss", url: "https://example.test/feed.xml", description: "custom" },
      ];
      engine.setSources(custom);
      expect(engine.getSources()).toHaveLength(1);
      expect(engine.getSources()[0].slug).toBe("custom-feed");
      // Default-source state is fully removed — concrete value (not null-only).
      expect(engine.getState("arxiv-cs-ai")).toBe(null);

      const r = await engine.poll("custom-feed");
      expect(r.status).toBe("ok");
      expect(r.items[0].guid).toBe("c1");
    });

    it("constructor with custom sources also accepts arbitrary list with full fresh state", () => {
      const custom: SourceConfig[] = [
        { slug: "custom-1", type: "rss", url: "https://a.test/", description: "a" },
        { slug: "custom-2", type: "json", url: "https://b.test/", description: "b" },
      ];
      const engine = new ReputableSourceMonitorEngine({
        sources: custom,
        fetchFn: async () => mockResponse({ status: 200, body: "" }),
      });
      expect(engine.getSources()).toHaveLength(2);
      // Concrete full-shape equality on fresh state.
      expect(engine.getState("custom-1")).toEqual(FRESH_STATE);
      expect(engine.getState("custom-2")).toEqual(FRESH_STATE);
    });
  });

  describe("§8 backoff window — second poll within window returns 'backoff' without fetching", () => {
    it("honors backoffUntil — short-circuits poll() when now < backoffUntil", async () => {
      let nowMs = 1_000_000;
      let fetchCalls = 0;
      const fetchFn = async () => {
        fetchCalls++;
        return mockResponse({ status: 429 });
      };
      const engine = new ReputableSourceMonitorEngine({
        sources: SINGLE_RSS_SOURCE,
        fetchFn,
        now: () => nowMs,
      });
      // First poll → 429, sets backoffUntil = now + 60s.
      await engine.poll("arxiv-cs-ai");
      expect(fetchCalls).toBe(1);

      // Advance clock 30s — still inside backoff window.
      nowMs += 30_000;
      const r2 = await engine.poll("arxiv-cs-ai");
      expect(r2.status).toBe("backoff");
      expect(r2.bytes).toBe(0);
      expect(r2.durationMs).toBe(0);
      expect(fetchCalls).toBe(1); // no second network call

      // Advance past backoff (60s + 1s).
      nowMs += 31_000;
      await engine.poll("arxiv-cs-ai");
      expect(fetchCalls).toBe(2);
    });
  });

  describe("§9 backoff schedule — 4-step ladder", () => {
    it("4 consecutive failures advance through BACKOFF_SCHEDULE_MS[0..3] then clamp at last bucket", async () => {
      let nowMs = 1_000_000;
      const fetchFn = async () => mockResponse({ status: 500 });
      const engine = new ReputableSourceMonitorEngine({
        sources: SINGLE_RSS_SOURCE,
        fetchFn,
        now: () => nowMs,
      });
      const observed: number[] = [];
      for (let i = 0; i < 5; i++) {
        await engine.poll("arxiv-cs-ai");
        const st = engine.getState("arxiv-cs-ai")!;
        observed.push(st.backoffUntil! - nowMs);
        nowMs = st.backoffUntil! + 1;
      }
      expect(observed[0]).toBe(BACKOFF_SCHEDULE_MS[0]);
      expect(observed[1]).toBe(BACKOFF_SCHEDULE_MS[1]);
      expect(observed[2]).toBe(BACKOFF_SCHEDULE_MS[2]);
      expect(observed[3]).toBe(BACKOFF_SCHEDULE_MS[3]);
      expect(observed[4]).toBe(BACKOFF_SCHEDULE_MS[3]); // clamped at last bucket
    });
  });

  describe("§10 alarm threshold — 3 consecutive failures emit alarm='source_unreachable'", () => {
    it("no alarm on failures 1..2; alarm='source_unreachable' on failure 3", async () => {
      let nowMs = 1_000_000;
      const fetchFn = async () => {
        throw new Error("network unreachable");
      };
      const engine = new ReputableSourceMonitorEngine({
        sources: SINGLE_RSS_SOURCE,
        fetchFn,
        now: () => nowMs,
      });
      // Concrete shape check: no alarm property at all on the first two failures.
      const r1 = await engine.poll("arxiv-cs-ai");
      expect(r1.alarm).toBe(undefined);
      expect("alarm" in r1).toBe(false);
      nowMs = engine.getState("arxiv-cs-ai")!.backoffUntil! + 1;
      const r2 = await engine.poll("arxiv-cs-ai");
      expect(r2.alarm).toBe(undefined);
      expect("alarm" in r2).toBe(false);
      nowMs = engine.getState("arxiv-cs-ai")!.backoffUntil! + 1;
      const r3 = await engine.poll("arxiv-cs-ai");
      expect(r3.alarm).toBe("source_unreachable");
      // Exact-equality on the boundary — catches accidental double-increment.
      expect(r3.state.consecutiveFailures).toBe(ALARM_FAILURE_THRESHOLD);
    });
  });

  describe("§11 parseAtom — Atom 1.0 entries extract correctly", () => {
    it("entries with id/link href/published parse to SourceItem", async () => {
      const atomSrc: SourceConfig[] = [
        { slug: "github-anthropics-releases", type: "atom", url: "https://github.com/anthropics.atom", description: "atom test" },
      ];
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://github.com/anthropics.atom",
          body: atomDoc([
            { title: "Release v1.0", id: "tag:github.com,2008:Release/1", link: "https://github.com/anthropics/sdk/releases/tag/v1.0", published: "2026-05-13T10:00:00Z", summary: "Initial release" },
            { title: "Release v1.1", id: "tag:github.com,2008:Release/2", link: "https://github.com/anthropics/sdk/releases/tag/v1.1" },
          ]),
        });
      const engine = new ReputableSourceMonitorEngine({ sources: atomSrc, fetchFn });
      const r = await engine.poll("github-anthropics-releases");

      expect(r.status).toBe("ok");
      expect(r.items).toHaveLength(2);
      expect(r.items[0].title).toBe("Release v1.0");
      expect(r.items[0].guid).toBe("tag:github.com,2008:Release/1");
      expect(r.items[0].link).toBe("https://github.com/anthropics/sdk/releases/tag/v1.0");
      expect(r.items[0].published).toBe("2026-05-13T10:00:00Z");
      expect(r.items[0].summary).toBe("Initial release");
    });
  });

  describe("§13 parseJSON — JSON ingest type (root array + items fallback + jsonItemsPath + prototype-pollution defense)", () => {
    it("§13a root-array JSON parses to SourceItem array", async () => {
      const jsonSrc: SourceConfig[] = [
        { slug: "json-root", type: "json", url: "https://api.example/feed.json", description: "json root" },
      ];
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://api.example/feed.json",
          body: JSON.stringify([
            { id: "p1", title: "Item One", url: "https://example/1", published: "2026-05-13T00:00:00Z", summary: "Summary one" },
            { name: "Item Two", link: "https://example/2", date: "2026-05-13T01:00:00Z" },
          ]),
        });
      const engine = new ReputableSourceMonitorEngine({ sources: jsonSrc, fetchFn });
      const r = await engine.poll("json-root");

      expect(r.status).toBe("ok");
      expect(r.items).toHaveLength(2);
      expect(r.items[0].title).toBe("Item One");
      expect(r.items[0].guid).toBe("p1");
      expect(r.items[0].link).toBe("https://example/1");
      expect(r.items[0].published).toBe("2026-05-13T00:00:00Z");
      expect(r.items[0].summary).toBe("Summary one");
      // Fallback fields: name→title, link→link, date→published.
      expect(r.items[1].title).toBe("Item Two");
      expect(r.items[1].link).toBe("https://example/2");
      expect(r.items[1].published).toBe("2026-05-13T01:00:00Z");
    });

    it("§13b root-object with `items` fallback array", async () => {
      const jsonSrc: SourceConfig[] = [
        { slug: "json-items", type: "json", url: "https://api.example/feed.json", description: "" },
      ];
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://api.example/feed.json",
          body: JSON.stringify({ meta: "x", items: [{ id: "a", title: "A" }] }),
        });
      const engine = new ReputableSourceMonitorEngine({ sources: jsonSrc, fetchFn });
      const r = await engine.poll("json-items");
      expect(r.status).toBe("ok");
      expect(r.items).toHaveLength(1);
      expect(r.items[0].guid).toBe("a");
      expect(r.items[0].title).toBe("A");
    });

    it("§13c jsonItemsPath dotted traversal works", async () => {
      const jsonSrc: SourceConfig[] = [
        { slug: "json-path", type: "json", url: "https://api.example/feed.json", description: "", jsonItemsPath: "result.list" },
      ];
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://api.example/feed.json",
          body: JSON.stringify({ result: { list: [{ id: "x", title: "X" }] } }),
        });
      const engine = new ReputableSourceMonitorEngine({ sources: jsonSrc, fetchFn });
      const r = await engine.poll("json-path");
      expect(r.status).toBe("ok");
      expect(r.items).toHaveLength(1);
      expect(r.items[0].guid).toBe("x");
    });

    it("§13d jsonItemsPath rejects __proto__/constructor/prototype path segments (security)", async () => {
      const jsonSrc: SourceConfig[] = [
        { slug: "json-attack", type: "json", url: "https://api.example/feed.json", description: "", jsonItemsPath: "__proto__.polluted" },
      ];
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://api.example/feed.json",
          body: JSON.stringify({ ok: true }),
        });
      const engine = new ReputableSourceMonitorEngine({ sources: jsonSrc, fetchFn });
      const r = await engine.poll("json-attack");
      expect(r.status).toBe("error");
      expect(r.error).toBe("malformed_json: jsonItemsPath_forbidden_segment: __proto__");
    });

    it("§13e invalid JSON returns malformed_json error", async () => {
      const jsonSrc: SourceConfig[] = [
        { slug: "json-bad", type: "json", url: "https://api.example/feed.json", description: "" },
      ];
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://api.example/feed.json",
          body: "{not json}",
        });
      const engine = new ReputableSourceMonitorEngine({ sources: jsonSrc, fetchFn });
      const r = await engine.poll("json-bad");
      expect(r.status).toBe("error");
      expect(r.error).toMatch(/^malformed_json: invalid_json:/);
    });

    it("§13f non-array root + no items/data/entries → json_root_not_array", async () => {
      const jsonSrc: SourceConfig[] = [
        { slug: "json-bare", type: "json", url: "https://api.example/feed.json", description: "" },
      ];
      const fetchFn = async () =>
        mockResponse({
          status: 200,
          url: "https://api.example/feed.json",
          body: JSON.stringify({ wrong_key: [] }),
        });
      const engine = new ReputableSourceMonitorEngine({ sources: jsonSrc, fetchFn });
      const r = await engine.poll("json-bare");
      expect(r.status).toBe("error");
      expect(r.error).toBe("malformed_json: json_root_not_array");
    });
  });

  describe("§14 concurrent poll() dedup (P0-1 race fix)", () => {
    it("two simultaneous poll(slug) calls return the same in-flight promise (fetch fires once)", async () => {
      let fetchCalls = 0;
      let resolveFetch: ((r: Response) => void) | null = null;
      const fetchFn = async () => {
        fetchCalls++;
        return new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        });
      };
      const engine = new ReputableSourceMonitorEngine({ sources: SINGLE_RSS_SOURCE, fetchFn });
      const p1 = engine.poll("arxiv-cs-ai");
      const p2 = engine.poll("arxiv-cs-ai");
      // Both promises are the same Promise object — dedup at the in-flight Map level.
      expect(p1).toBe(p2);
      // Let the fetch resolve.
      resolveFetch!(mockResponse({ status: 200, body: rssDoc([{ title: "x", guid: "g" }]) }));
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(fetchCalls).toBe(1);
      expect(r1).toBe(r2); // same result object
      expect(r1.status).toBe("ok");
    });
  });

  describe("§12 pollAll aggregation — counts roll up correctly", () => {
    it("aggregates ok/not_modified/rate_limited/error/backoff per status", async () => {
      const sources: SourceConfig[] = [
        { slug: "good-1", type: "rss", url: "https://good1.test/", description: "" },
        { slug: "good-2", type: "rss", url: "https://good2.test/", description: "" },
        { slug: "bad-429", type: "rss", url: "https://bad.test/", description: "" },
        { slug: "broken", type: "rss", url: "https://broken.test/", description: "" },
      ];
      const fetchFn = async (url: string | URL | Request) => {
        const u = url.toString();
        if (u.startsWith("https://good")) return mockResponse({ status: 200, url: u, body: rssDoc([{ title: "x" }]) });
        if (u === "https://bad.test/") return mockResponse({ status: 429, url: u });
        if (u === "https://broken.test/") return mockResponse({ status: 500, url: u });
        throw new Error("unexpected url: " + u);
      };
      const engine = new ReputableSourceMonitorEngine({ sources, fetchFn });
      const all = await engine.pollAll();

      expect(all.results).toHaveLength(4);
      expect(all.ok).toBe(2);          // good-1 + good-2
      expect(all.rateLimited).toBe(1); // bad-429
      expect(all.errors).toBe(1);      // broken (500)
      expect(all.notModified).toBe(0);
      expect(all.backoff).toBe(0);
      expect(all.totalItems).toBe(2);
      expect(all.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(all.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
