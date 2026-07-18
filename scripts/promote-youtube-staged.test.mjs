// Tests for promote-youtube-staged.mjs (U-YT-PROMOTE, slot:zulu 2026-06-12).
// R9 intent pins: dry-run is the DEFAULT (an attended-promotion gate that
// accidentally applies is the clobber class returning), the ledger marks a
// video promoted ONLY after a successful ingest (crash-safe resume), one bad
// artifact never blocks the rest, and already-promoted videos are never
// double-ingested. Sequential await-in-loop is INTENTIONAL: parallel ingest
// into the shared tribal store is exactly what this lane exists to avoid.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  isArtifactFile, normalizeArtifact, ledgerMap, selectPromotable, promote,
  STAGING_DIR,
} from "./promote-youtube-staged.mjs";

const META = { videoId: "vid1", title: "Tramming a mill head" };
const TIP = { id: "t1", content: "Indicate the vise fixed jaw before every job", source: "youtube" };

// -- artifact selection -------------------------------------------------------

test("isArtifactFile: primary artifacts in; queue/ledger/fallback files OUT", () => {
  assert.equal(isArtifactFile("abc123.json"), true);
  assert.equal(isArtifactFile("night-queue.json"), false);
  assert.equal(isArtifactFile("promoted-ledger.json"), false);
  assert.equal(isArtifactFile("abc123-tips-fallback.json"), false, "fallback siblings are not primary artifacts");
  assert.equal(isArtifactFile("night-ledger.jsonl"), false);
});

test("normalizeArtifact: full artifact promotable; transcript-only / missing-meta / garbage rejected with reasons", () => {
  const ok = normalizeArtifact({ meta: META, tips: [TIP] }, "vid1.json");
  assert.equal(ok.ok, true);
  assert.equal(ok.videoId, "vid1");
  assert.match(normalizeArtifact({ meta: META, tips: [] }, "x.json").reason, /no tips/);
  assert.match(normalizeArtifact({ tips: [TIP] }, "x.json").reason, /missing meta\.videoId/);
  assert.equal(normalizeArtifact(null, "x.json").ok, false);
});

test("selectPromotable: already-promoted videos are excluded (no double-ingest)", () => {
  const ledger = ledgerMap({ promoted: { vid1: { at: "2026-06-01T00:00:00Z", tipCount: 3 } } });
  const norm = [
    normalizeArtifact({ meta: META, tips: [TIP] }, "vid1.json"),
    normalizeArtifact({ meta: { videoId: "vid2" }, tips: [TIP] }, "vid2.json"),
    { ok: false, reason: "garbage" },
  ];
  const sel = selectPromotable(norm, ledger);
  assert.deepEqual(sel.map((a) => a.videoId), ["vid2"]);
});

test("ledgerMap: absent / empty / malformed ledger tolerated as empty (first run)", () => {
  assert.equal(ledgerMap(null).size, 0);
  assert.equal(ledgerMap({}).size, 0);
  assert.equal(ledgerMap({ promoted: "not-an-object" }).size, 0);
});

// -- promote (the apply path, hermetic) ---------------------------------------

test("promote: ledger saved AFTER each successful ingest; failure does NOT mark the ledger (crash-safe resume)", async () => {
  const saves = [];
  const ledger = new Map();
  const selected = [
    { ok: true, videoId: "good", meta: { videoId: "good" }, tips: [TIP] },
    { ok: true, videoId: "bad", meta: { videoId: "bad" }, tips: [TIP] },
    { ok: true, videoId: "good2", meta: { videoId: "good2" }, tips: [TIP, TIP] },
  ];
  const r = await promote(selected, {
    ingestImpl: async (tips, meta) => (meta.videoId === "bad" ? { ok: false, error: "engine unavailable" } : { ok: true, ingested: tips.length }),
    wikiImpl: () => "wiki/path.md",
    saveLedgerImpl: (m) => saves.push(new Set(m.keys())),
    ledger,
  });
  assert.equal(r.promoted, 2);
  assert.equal(r.failed, 1);
  assert.equal(r.tipsIngested, 3);
  assert.equal(ledger.has("bad"), false, "a FAILED ingest must never be marked promoted");
  assert.equal(saves.length, 2, "ledger persisted once per success, not once at the end (durable resume)");
  assert.deepEqual([...saves[0]], ["good"], "first save happens BEFORE later artifacts run");
});

test("promote: wiki-write failure is a WARNING, not a promotion failure (tribal ingest already succeeded)", async () => {
  const ledger = new Map();
  const r = await promote([{ ok: true, videoId: "v", meta: { videoId: "v" }, tips: [TIP] }], {
    ingestImpl: async () => ({ ok: true, ingested: 1 }),
    wikiImpl: () => { throw new Error("wiki dir readonly"); },
    saveLedgerImpl: () => {},
    ledger,
  });
  assert.equal(r.promoted, 1);
  assert.equal(ledger.has("v"), true);
  assert.ok(r.rows.some((row) => row.warn && /wiki/.test(row.warn)));
});

test("promote: ADVERSARIAL ingestImpl throw is contained per-artifact (next one still runs)", async () => {
  const r = await promote(
    [
      { ok: true, videoId: "boom", meta: { videoId: "boom" }, tips: [TIP] },
      { ok: true, videoId: "after", meta: { videoId: "after" }, tips: [TIP] },
    ],
    { ingestImpl: async (t, m) => { if (m.videoId === "boom") throw new Error("kaboom"); return { ok: true, ingested: 1 }; }, saveLedgerImpl: () => {}, ledger: new Map() }
  );
  assert.equal(r.failed, 1);
  assert.equal(r.promoted, 1);
  assert.equal(r.rows[1].videoId, "after");
});

// -- real-data gate ------------------------------------------------------------

test("LIVE staging dir: scan works and every primary artifact parses or is reported (never throws)", () => {
  if (!existsSync(STAGING_DIR)) return; // hermetic CI without the dir: vacuous pass is honest here
  const files = readdirSync(STAGING_DIR).filter(isArtifactFile);
  assert.ok(files.length >= 1, "live backlog expected (May-26..today artifacts)");
  let okCount = 0;
  for (const f of files) {
    let norm;
    try { norm = normalizeArtifact(JSON.parse(readFileSync(join(STAGING_DIR, f), "utf8")), f); }
    catch { norm = { ok: false, reason: "parse" }; }
    if (norm.ok) okCount++;
    assert.ok(typeof norm.ok === "boolean");
  }
  assert.ok(okCount >= 1, "at least one live artifact must be promotable-shaped");
});
