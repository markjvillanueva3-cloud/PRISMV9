/**
 * Tests for drain-web-sources-tribal.mjs pure helpers + fail-soft fetch.
 * Run directly: `node scripts/drain-web-sources-tribal.test.mjs` (node:test auto-runs on exit).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  webSourceId, stripHtmlToText, textToTranscript, tipsToWebKnowledgeTips, parseQueue, parseLedger, dueSources, isLockFresh, fetchUrlText, QUEUE_SCHEMA,
} from "./drain-web-sources-tribal.mjs";

test("webSourceId is deterministic, prefixed, and collision-distinct", () => {
  const a = webSourceId("https://example.com/a");
  assert.equal(a, webSourceId("https://example.com/a")); // deterministic
  assert.match(a, /^web-[0-9a-f]{12}$/);                  // shape
  assert.notEqual(a, webSourceId("https://example.com/b")); // distinct urls -> distinct ids
});

test("stripHtmlToText drops script/style/comments, strips tags, decodes entities, collapses ws", () => {
  const html = `<head><title>x</title></head><body>
    <script>var leak = 'should NOT appear';</script>
    <style>.k{color:red}</style>
    <!-- comment should NOT appear -->
    <h1>Feeds &amp; Speeds</h1><p>Use &#39;climb&#39; milling &mdash; SFM&nbsp;300.</p></body>`;
  const t = stripHtmlToText(html);
  assert.ok(!/should NOT appear/.test(t), "script body leaked");
  assert.ok(!/color:red/.test(t), "style body leaked");
  assert.ok(!/comment should NOT appear/.test(t), "comment leaked");
  assert.ok(/Feeds & Speeds/.test(t), "amp not decoded");
  assert.ok(/'climb' milling -- SFM 300\./.test(t), `entities/ws wrong: ${t}`);
  assert.ok(!/[<>]/.test(t), "tags remain");
});

test("stripHtmlToText caps at maxChars and tolerates empty/non-string", () => {
  assert.equal(stripHtmlToText("aaaa".repeat(100), { maxChars: 10 }).length, 10);
  assert.equal(stripHtmlToText("", {}), "");
  assert.equal(stripHtmlToText(null), "");
  assert.equal(stripHtmlToText(undefined), "");
});

test("textToTranscript yields the {segments:[{start,end,text}]} shape chunkTranscript needs", () => {
  // empty/non-string -> no segments (the bug that returned 'no segments to process' for a raw string)
  assert.deepEqual(textToTranscript("").segments, []);
  assert.deepEqual(textToTranscript(null).segments, []);
  const long = ("word ".repeat(2000)).trim(); // ~10000 chars
  const tr = textToTranscript(long, 1500);
  assert.ok(tr.segments.length >= 6, `expected multiple segments, got ${tr.segments.length}`);
  for (const s of tr.segments) {
    assert.equal(typeof s.text, "string");
    assert.ok(s.text.length > 0 && s.text.length <= 1500 + 200, `segment len ${s.text.length} out of bound`);
    assert.equal(typeof s.start, "number");
    assert.equal(typeof s.end, "number");
  }
  // round-trip: concatenated segment text reproduces the source words (whitespace-normalized)
  assert.equal(tr.segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim(), long);
});

test("tipsToWebKnowledgeTips yields the full KnowledgeTip shape ingest requires (unique id, string web-source, 0-100 conf)", () => {
  const raw = [
    { title: "Use G96 CSS", body: "constant surface speed", category: "speed_feed", tags: ["lathe"], confidence: 0.9 },
    { title: "Drill speed", body: "drills run slower", category: "speed_feed", tags: ["drill"], confidence: 0.8 },
    { title: "No conf tip", body: "missing confidence", category: "milling", tags: [] }, // confidence undefined
  ];
  const meta = { videoId: "web-abc123def0", title: "Cutting Speed", channel: "Machining Doctor", source_url: "https://x/cs", domain: "speed-feed" };
  const out = tipsToWebKnowledgeTips(raw, meta);
  assert.equal(out.length, 3);
  const ids = out.map((t) => t.id);
  assert.equal(new Set(ids).size, 3, "ids must be UNIQUE (a constant/undefined id collides in ingest id-dedup -> drops all-but-first)");
  assert.ok(ids.every((id) => /^tk-web-abc123def0-\d{3}$/.test(id)), `id shape wrong: ${ids}`);
  for (const t of out) {
    assert.equal(typeof t.source, "string"); // missing source -> ingest inferDomain THROWS (the P0)
    assert.ok(t.source.startsWith("web:"), "web-accurate source label, not youtube");
    assert.equal(typeof t.created_at, "string");
    assert.ok(Number.isInteger(t.confidence) && t.confidence >= 0 && t.confidence <= 100, `conf not 0-100 int: ${t.confidence}`);
    assert.ok(t.tags.includes("web-learned") && t.tags.includes("web-source"), "web provenance tags");
    assert.equal(t.provenance.source_url, "https://x/cs");
    assert.ok(!/youtube|video-learned/i.test(JSON.stringify(t)), "must NOT mislabel a web tip as youtube/video");
  }
  assert.equal(out[0].confidence, 90);
  assert.ok(Number.isInteger(out[2].confidence), "missing confidence must default to a valid int, not NaN");
});

test("parseQueue: valid passes; bad schema/non-array/dup-id/non-https fail-loud", () => {
  const good = JSON.stringify({ schemaVersion: QUEUE_SCHEMA, sources: [{ id: "a", url: "https://x.com/a" }] });
  assert.equal(parseQueue(good).ok, true);
  assert.equal(parseQueue("{not json").ok, false);
  assert.equal(parseQueue(JSON.stringify({ schemaVersion: "9.9", sources: [] })).ok, false);
  assert.equal(parseQueue(JSON.stringify({ schemaVersion: QUEUE_SCHEMA, sources: {} })).ok, false);
  assert.equal(parseQueue(JSON.stringify({ schemaVersion: QUEUE_SCHEMA, sources: [{ id: "a", url: "https://x" }, { id: "a", url: "https://y" }] })).ok, false);
  assert.equal(parseQueue(JSON.stringify({ schemaVersion: QUEUE_SCHEMA, sources: [{ id: "a", url: "http://insecure.com" }] })).ok, false);
});

test("parseLedger parses ndjson, skips torn lines, empty -> []", () => {
  assert.deepEqual(parseLedger(""), []);
  const rows = parseLedger(`{"id":"a","ok":true,"ts":"2026-06-25T00:00:00Z"}\n{torn\n{"id":"b","ok":false}\n`);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, "a");
  assert.equal(rows[1].id, "b");
});

test("dueSources: never-run + stale-OK are due; fresh-OK + disabled are not", () => {
  const now = Date.parse("2026-06-25T00:00:00Z");
  const q = { sources: [
    { id: "never", url: "https://x/1" },
    { id: "fresh", url: "https://x/2" },
    { id: "stale", url: "https://x/3" },
    { id: "off", url: "https://x/4", enabled: false },
  ] };
  const day = 24 * 60 * 60 * 1000;
  const ledger = [
    { id: "fresh", ok: true, ts: new Date(now - 2 * day).toISOString() },   // 2d ago < 7d cooldown
    { id: "stale", ok: true, ts: new Date(now - 9 * day).toISOString() },   // 9d ago > 7d cooldown
    { id: "off", ok: true, ts: new Date(now - 99 * day).toISOString() },
  ];
  const due = dueSources(q, ledger, now, 7).map((s) => s.id).sort();
  assert.deepEqual(due, ["never", "stale"]);
});

test("dueSources ignores a failed run for cooldown (a fail does not reset the clock)", () => {
  const now = Date.parse("2026-06-25T00:00:00Z");
  const q = { sources: [{ id: "a", url: "https://x/1" }] };
  // only a FAILED row exists -> source is still due (never had an OK run)
  const due = dueSources(q, [{ id: "a", ok: false, ts: new Date(now - 60_000).toISOString() }], now, 7);
  assert.equal(due.length, 1);
});

test("isLockFresh: fresh+alive true; old false; dead-pid false; malformed false", () => {
  const now = Date.parse("2026-06-25T00:00:00Z");
  const alive = () => true, dead = () => false;
  assert.equal(isLockFresh(JSON.stringify({ pid: 1, ts: new Date(now - 60_000).toISOString() }), now, alive), true);
  assert.equal(isLockFresh(JSON.stringify({ pid: 1, ts: new Date(now - 60 * 60 * 1000).toISOString() }), now, alive), false); // 1h old > 30m stale
  assert.equal(isLockFresh(JSON.stringify({ pid: 999999, ts: new Date(now - 60_000).toISOString() }), now, dead), false);    // dead holder
  assert.equal(isLockFresh("{garbage", now, alive), false);
  assert.equal(isLockFresh("", now, alive), false);
});

test("fetchUrlText is fail-soft on HTTP error, non-text type, and thrown error", async () => {
  const okRes = { ok: true, headers: { get: () => "text/html; charset=utf-8" }, text: async () => "<p>hi</p>" };
  assert.deepEqual(await fetchUrlText("https://x", { fetchImpl: async () => okRes }), { ok: true, html: "<p>hi</p>" });

  const r404 = await fetchUrlText("https://x", { fetchImpl: async () => ({ ok: false, status: 404, headers: { get: () => "" }, text: async () => "" }) });
  assert.equal(r404.ok, false);
  assert.match(r404.error, /404/);

  const rPdf = await fetchUrlText("https://x", { fetchImpl: async () => ({ ok: true, headers: { get: () => "application/pdf" }, text: async () => "" }) });
  assert.equal(rPdf.ok, false);
  assert.match(rPdf.error, /non-text/);

  const rThrow = await fetchUrlText("https://x", { fetchImpl: async () => { throw new Error("ECONNREFUSED"); } });
  assert.equal(rThrow.ok, false);
  assert.match(rThrow.error, /ECONNREFUSED/);
});
