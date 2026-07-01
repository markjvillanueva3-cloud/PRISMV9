#!/usr/bin/env node
/**
 * Hermetic adversarial suite for load-tribal-index.mjs (gap #5 cap-safe loader).
 *
 * The load-bearing guarantee: the incremental Buffer parse reconstructs
 * EXACTLY what `JSON.parse(buf.toString())` would on the same bytes — even when
 * entry string values contain `{ } [ ] "` and escaped `\" \\`. A parse bug here
 * would silently drop or corrupt entries from the fleet's tribal brain, so the
 * tests assert deep-equality against the real JSON.parse oracle, not a stub.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  V8_MAX_STRING, findEntriesArrayStart, parseHead, parseEntriesArray, loadTribalIndex,
  walkEntriesArray, streamTribalEntries,
} from "./load-tribal-index.mjs";

// Build the compact (no-whitespace) on-disk shape the embedders actually write
// (atomicWriteJSON uses JSON.stringify with NO spacing).
function compactBuf(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8");
}

// An index whose entries exercise every JSON-boundary hazard.
const ADVERSARIAL = {
  schemaVersion: "1.0.0",
  model: "nomic-embed-text:latest",
  dim: 768,
  generatedAt: "2026-06-08T00:00:00Z",
  wikiEmbeddedCount: 3,
  entries: [
    {
      id: "external:H:\\prism\\knowledge\\wiki\\a.md", // escaped backslashes (Windows path)
      source: "external",
      title: "a",
      domain: "backend-dev",
      text: 'a body with { braces } and [ brackets ] and a \\"quoted\\" word and a trailing \\\\',
      path: "H:\\prism\\knowledge\\wiki\\a.md",
      hash: "0123456789abcdef",
      embedding: [0.1, -0.2, 0.3],
    },
    {
      id: "external:b",
      source: "external",
      title: "b",
      domain: "mill",
      text: "}],[{ — leading close-delimiters inside a string",
      path: "b",
      hash: "fedcba9876543210",
      embedding: [1, 2, 3],
      context: 'a contextual blurb with a } and a " and a [ inside it',
      context_version: "v1",
    },
    {
      id: "external:c",
      source: "external",
      title: "c",
      domain: "general",
      text: "plain",
      path: "c",
      hash: "aaaabbbbccccdddd",
      embedding: [0, 0, 0],
    },
  ],
};

test("V8_MAX_STRING is the documented V8 string cap", () => {
  assert.equal(V8_MAX_STRING, 0x1fffffe8);
  assert.equal(V8_MAX_STRING, 536870888);
});

test("findEntriesArrayStart points just inside the entries array (ws-tolerant)", () => {
  const buf = compactBuf(ADVERSARIAL);
  const start = findEntriesArrayStart(buf);
  assert.ok(start > 0);
  assert.equal(buf[start - 1], 0x5b, "byte before start must be '['");
  assert.equal(buf[start], 0x7b, "first entry byte must be '{'");
  // whitespace between key, colon, bracket tolerated
  const spaced = Buffer.from('{"dim":768, "entries" : [ {"id":"x"}]}', "utf8");
  const s2 = findEntriesArrayStart(spaced);
  assert.equal(spaced[s2 - 1], 0x5b);
  // absent → -1
  assert.equal(findEntriesArrayStart(Buffer.from('{"dim":768}', "utf8")), -1);
});

test("parseHead recovers metadata and tolerates entries-first / no-comma", () => {
  const head = parseHead(compactBuf(ADVERSARIAL));
  assert.equal(head.dim, 768);
  assert.equal(head.schemaVersion, "1.0.0");
  assert.equal(head.wikiEmbeddedCount, 3);
  assert.ok(!("entries" in head), "head must NOT carry the entries array");
  // entries as first key → empty head
  assert.deepEqual(parseHead(Buffer.from('{"entries":[{"id":"x"}]}', "utf8")), {});
});

test("parseEntriesArray == JSON.parse oracle on adversarial braces/quotes/escapes", () => {
  const buf = compactBuf(ADVERSARIAL);
  const got = parseEntriesArray(buf, findEntriesArrayStart(buf));
  // The whole point: byte-for-byte equivalent to what JSON.parse produces.
  assert.deepEqual(got, ADVERSARIAL.entries);
  assert.equal(got.length, 3);
  // spot-check the hazardous fields survived intact (deepEqual above is the
  // load-bearing oracle; these just localize a regression if it ever breaks)
  assert.equal(got[0].path, "H:\\prism\\knowledge\\wiki\\a.md");
  assert.ok(got[0].text.includes("{ braces }") && got[0].text.includes("[ brackets ]"));
  assert.ok(got[0].text.includes('\\"quoted\\"'), "escaped-quote substring must survive");
  assert.equal(got[1].text, "}],[{ — leading close-delimiters inside a string");
  assert.equal(got[1].context, 'a contextual blurb with a } and a " and a [ inside it');
  assert.deepEqual(got[2].embedding, [0, 0, 0]);
});

test("parseEntriesArray handles the empty array", () => {
  const buf = Buffer.from('{"dim":768,"entries":[]}', "utf8");
  assert.deepEqual(parseEntriesArray(buf, findEntriesArrayStart(buf)), []);
});

test("parseEntriesArray FAILS LOUD on a torn array (no closing ']') — no partial brain", () => {
  // Two complete entries but the array was cut off mid-write (killed atomic
  // write). Returning the 2-entry prefix would silently shrink the index.
  const torn = Buffer.from('{"dim":768,"entries":[{"id":"a"},{"id":"b"}', "utf8");
  const start = findEntriesArrayStart(torn);
  assert.throws(() => parseEntriesArray(torn, start), /not closed with ']'/);
  // A trailing comma then EOF is also torn.
  const torn2 = Buffer.from('{"entries":[{"id":"a"},', "utf8");
  assert.throws(() => parseEntriesArray(torn2, findEntriesArrayStart(torn2)), /truncated\/corrupt/);
});

test("loadTribalIndex over-cap branch propagates the torn-array throw", () => {
  const torn = Buffer.from('{"dim":768,"entries":[{"id":"a"}', "utf8"); // unterminated array
  const fakeBig = new Proxy(torn, {
    get(t, p) {
      if (p === "length") return V8_MAX_STRING + 1;
      const v = t[p];
      return typeof v === "function" ? v.bind(t) : v;
    },
  });
  assert.throws(() => loadTribalIndex("x", { readFileSync: () => fakeBig }), /not closed with ']'/);
});

test("loadTribalIndex fast path == JSON.parse for an under-cap index", () => {
  const buf = compactBuf(ADVERSARIAL);
  const fakeFs = { readFileSync: () => buf };
  const got = loadTribalIndex("ignored", fakeFs);
  assert.deepEqual(got, ADVERSARIAL); // identical to JSON.parse(buf.toString())
});

test("incremental reconstruction == full JSON.parse (head + entries reunited)", () => {
  // Simulate exactly what the over-cap branch does, on the same bytes the fast
  // path would parse — proving the two paths are equivalent.
  const buf = compactBuf(ADVERSARIAL);
  const head = parseHead(buf);
  head.entries = parseEntriesArray(buf, findEntriesArrayStart(buf));
  assert.deepEqual(head, JSON.parse(buf.toString("utf8")));
});

test("over-cap branch throws a descriptive error when entries array is absent", () => {
  // Force the over-cap branch with a fake fs returning a buffer whose .length
  // reports as over-cap (a Proxy so we don't allocate 512MB).
  const realBuf = Buffer.from('{"dim":768}', "utf8");
  const fakeBig = new Proxy(realBuf, {
    get(t, p) {
      if (p === "length") return V8_MAX_STRING + 1;
      const v = t[p];
      return typeof v === "function" ? v.bind(t) : v;
    },
  });
  const fakeFs = { readFileSync: () => fakeBig };
  assert.throws(() => loadTribalIndex("x", fakeFs), /no parseable "entries"/);
});

// --- walkEntriesArray + streamTribalEntries (U-TRIBAL-RERANK-STREAM 2026-06-10) ----
// The streaming substrate that lets tribal-rerank keep only a bounded top-K
// instead of materializing all ~30K entries -- removing the per-prompt heap
// ceiling that capped the JSON index's growth.

test("walkEntriesArray invokes onEntry per entry and returns the count (== oracle)", () => {
  const buf = compactBuf(ADVERSARIAL);
  const collected = [];
  const count = walkEntriesArray(buf, findEntriesArrayStart(buf), (e) => collected.push(e));
  assert.equal(count, ADVERSARIAL.entries.length);
  assert.deepEqual(collected, ADVERSARIAL.entries); // same as parseEntriesArray oracle
});

test("streamTribalEntries (monolith) streams every entry == parseEntriesArray oracle", () => {
  const buf = compactBuf(ADVERSARIAL);
  // monolith path: no sibling manifest, readFileSync returns the whole buffer.
  const fsImpl = { existsSync: () => false, readFileSync: () => buf };
  const out = [];
  const total = streamTribalEntries("x/tribal-embed-index.json", (e) => out.push(e), fsImpl);
  const oracle = parseEntriesArray(buf, findEntriesArrayStart(buf));
  assert.deepEqual(out, oracle);
  assert.equal(total, oracle.length);
});

test("streamTribalEntries (sharded) merges every shard in order with the right total", () => {
  const entries = ADVERSARIAL.entries;
  const mid = Math.ceil(entries.length / 2);
  const s0 = entries.slice(0, mid);
  const s1 = entries.slice(mid);
  const manifest = {
    schemaVersion: "1.0.0", sharded: true, shardCount: 2, totalEntries: entries.length,
    shards: [
      { file: "tribal-embed-index.shard-000.json", count: s0.length },
      { file: "tribal-embed-index.shard-001.json", count: s1.length },
    ],
  };
  const shardBufs = {
    "tribal-embed-index.shard-000.json": compactBuf({ entries: s0 }),
    "tribal-embed-index.shard-001.json": compactBuf({ entries: s1 }),
  };
  const fsImpl = {
    existsSync: (p) => String(p).endsWith(".manifest.json"),
    readFileSync: (p) => {
      const s = String(p);
      if (s.endsWith(".manifest.json")) return Buffer.from(JSON.stringify(manifest), "utf8");
      const base = s.split(/[\\/]/).pop();
      if (shardBufs[base]) return shardBufs[base];
      throw Object.assign(new Error(`ENOENT mock: ${s}`), { code: "ENOENT" });
    },
  };
  const out = [];
  const total = streamTribalEntries("x/tribal-embed-index.json", (e) => out.push(e), fsImpl);
  assert.deepEqual(out, entries); // order preserved across shards
  assert.equal(total, entries.length);
});

test("streamTribalEntries (sharded) FAILS LOUD on a shard count mismatch -- no partial brain", () => {
  const entries = ADVERSARIAL.entries;
  const manifest = {
    sharded: true, shardCount: 1, totalEntries: entries.length,
    shards: [{ file: "tribal-embed-index.shard-000.json", count: entries.length + 5 }], // lies
  };
  const shardBuf = compactBuf({ entries });
  const fsImpl = {
    existsSync: (p) => String(p).endsWith(".manifest.json"),
    readFileSync: (p) => String(p).endsWith(".manifest.json")
      ? Buffer.from(JSON.stringify(manifest), "utf8")
      : shardBuf,
  };
  assert.throws(
    () => streamTribalEntries("x/tribal-embed-index.json", () => {}, fsImpl),
    /torn\/corrupt shard|partial brain/,
  );
});

test("streamTribalEntries (sharded) FAILS LOUD on an incomplete shard set (total mismatch)", () => {
  const entries = ADVERSARIAL.entries;
  // Manifest claims more total than the single shard actually carries.
  const manifest = {
    sharded: true, shardCount: 1, totalEntries: entries.length + 10,
    shards: [{ file: "tribal-embed-index.shard-000.json", count: entries.length }],
  };
  const shardBuf = compactBuf({ entries });
  const fsImpl = {
    existsSync: (p) => String(p).endsWith(".manifest.json"),
    readFileSync: (p) => String(p).endsWith(".manifest.json")
      ? Buffer.from(JSON.stringify(manifest), "utf8")
      : shardBuf,
  };
  assert.throws(
    () => streamTribalEntries("x/tribal-embed-index.json", () => {}, fsImpl),
    /shard set incomplete|partial brain/,
  );
});

test("streamTribalEntries (monolith) FAILS LOUD on a torn entries array", () => {
  const full = compactBuf(ADVERSARIAL);
  const torn = full.subarray(0, full.length - 2); // drop the closing ']}' -> array never closes
  const fsImpl = { existsSync: () => false, readFileSync: () => torn };
  assert.throws(
    () => streamTribalEntries("x/tribal-embed-index.json", () => {}, fsImpl),
    /not closed with ']'/,
  );
});
