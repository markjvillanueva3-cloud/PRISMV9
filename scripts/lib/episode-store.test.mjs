// Tests for episode-store.mjs. Run: node --test scripts/lib/episode-store.test.mjs
// @milestone PSN-ENHANCE-MS0/U-PSN-GRAPHITI-LITE
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateEpisodeId,
  buildEpisode,
  appendEpisode,
  appendTombstone,
  loadStore,
  queryEpisodes,
  episodesAt,
  tracebackByEntity,
  summarize,
  __test_constants,
} from "./episode-store.mjs";

const { MAX_BODY_BYTES } = __test_constants;

// In-memory fake fs (matches the iter-9 backfill test pattern).
function makeFakeFs(initial = {}) {
  const store = { ...initial };
  return {
    store,
    writeImpl: (path, data) => { store[path] = (store[path] || "") + data; },
    readImpl: (path) => {
      if (!(path in store)) throw new Error("ENOENT");
      return store[path];
    },
    existsImpl: (path) => path in store || path === "H:/prism/state/shared" || path === "H:/prism/state",
    mkdirImpl: () => {},
    statImpl: (path) => ({ size: (store[path] || "").length }),
  };
}

test("generateEpisodeId: produces unique ids starting with ep-", () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) ids.add(generateEpisodeId());
  assert.equal(ids.size, 100, "100 ids should all be unique");
  for (const id of ids) assert.ok(id.startsWith("ep-"));
});

test("buildEpisode: rejects missing source", () => {
  assert.throws(() => buildEpisode({ body: "x" }), /source required/);
});

test("buildEpisode: rejects non-string body", () => {
  assert.throws(() => buildEpisode({ source: "git", body: 42 }), /body must be a string/);
});

test("buildEpisode: defaults valid_from to now ISO", () => {
  const ep = buildEpisode({ source: "git", body: "x" });
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(ep.valid_from));
});

test("buildEpisode: filters malformed entities + relationships", () => {
  const ep = buildEpisode({
    source: "git",
    body: "x",
    entities: [{ name: "good" }, { type: "no-name" }, null, "string-not-obj"],
    relationships: [{ from: "a", to: "b" }, { from: "x" }, null],
  });
  assert.equal(ep.entities.length, 1);
  assert.equal(ep.entities[0].name, "good");
  assert.equal(ep.relationships.length, 1);
});

test("buildEpisode: truncates body past MAX_BODY_BYTES", () => {
  const long = "a".repeat(MAX_BODY_BYTES + 100);
  const ep = buildEpisode({ source: "git", body: long });
  assert.ok(ep.body.length <= MAX_BODY_BYTES + 50, `truncated: ${ep.body.length}`);
  assert.ok(ep.body.endsWith("...(truncated)"));
});

test("appendEpisode + loadStore: round-trip episode", () => {
  const fs = makeFakeFs();
  const ep = buildEpisode({ source: "git-commit", source_id: "abc123", body: "test commit" });
  appendEpisode(ep, { storePath: "/v/episodes.jsonl", ...fs });
  const store = loadStore({ storePath: "/v/episodes.jsonl", ...fs });
  assert.equal(store.episodes.length, 1);
  assert.equal(store.episodes[0].id, ep.id);
  assert.equal(store.episodes[0].source_id, "abc123");
});

test("loadStore: empty / missing file returns empty store", () => {
  const fs = makeFakeFs();
  const store = loadStore({ storePath: "/v/missing.jsonl", ...fs });
  assert.equal(store.episodes.length, 0);
});

test("loadStore: skips malformed JSON lines without throwing", () => {
  const fs = makeFakeFs({
    "/v/episodes.jsonl": `{"id":"ep-1","source":"git","body":"ok","valid_from":"2026-05-24T00:00:00Z"}\n` +
      `not-json\n` +
      `{"id":"ep-2","source":"git","body":"also-ok","valid_from":"2026-05-24T00:01:00Z"}\n` +
      `{"no-id":"field"}\n`,
  });
  const store = loadStore({ storePath: "/v/episodes.jsonl", ...fs });
  assert.equal(store.episodes.length, 2);
  assert.equal(store.skippedLines, 2);
});

test("appendTombstone + loadStore: sets valid_until on target", () => {
  const fs = makeFakeFs();
  const ep = buildEpisode({ source: "git", body: "first" });
  appendEpisode(ep, { storePath: "/v/episodes.jsonl", ...fs });
  appendTombstone({ target_id: ep.id, valid_until: "2026-05-25T00:00:00Z", reason: "superseded" }, { storePath: "/v/episodes.jsonl", ...fs });
  const store = loadStore({ storePath: "/v/episodes.jsonl", ...fs });
  assert.equal(store.tombstoneCount, 1);
  assert.equal(store.episodes[0].valid_until, "2026-05-25T00:00:00Z");
  assert.equal(store.episodes[0].superseded_reason, "superseded");
});

test("appendTombstone: rejects missing target_id", () => {
  assert.throws(() => appendTombstone({}), /target_id required/);
});

test("queryEpisodes: predicate filter + limit", () => {
  const fs = makeFakeFs();
  for (let i = 0; i < 5; i++) {
    appendEpisode(buildEpisode({ source: i % 2 === 0 ? "git" : "scrutiny", body: `e${i}` }), { storePath: "/v/episodes.jsonl", ...fs });
  }
  const store = loadStore({ storePath: "/v/episodes.jsonl", ...fs });
  const gitOnly = queryEpisodes(store, (ep) => ep.source === "git");
  assert.equal(gitOnly.length, 3);
  const limited = queryEpisodes(store, () => true, { limit: 2 });
  assert.equal(limited.length, 2);
});

test("episodesAt: temporal slice via valid_from/valid_until", () => {
  const fs = makeFakeFs();
  appendEpisode(buildEpisode({ source: "git", body: "old", valid_from: "2026-01-01T00:00:00Z" }), { storePath: "/v/episodes.jsonl", ...fs });
  const newer = buildEpisode({ source: "git", body: "new", valid_from: "2026-06-01T00:00:00Z" });
  appendEpisode(newer, { storePath: "/v/episodes.jsonl", ...fs });
  const store = loadStore({ storePath: "/v/episodes.jsonl", ...fs });
  const inMarch = episodesAt(store, "2026-03-01T00:00:00Z");
  assert.equal(inMarch.length, 1);
  assert.equal(inMarch[0].body, "old");
  const inAugust = episodesAt(store, "2026-08-01T00:00:00Z");
  assert.equal(inAugust.length, 2);
});

test("tracebackByEntity: finds all episodes referencing an entity", () => {
  const fs = makeFakeFs();
  appendEpisode(buildEpisode({
    source: "git", body: "a",
    entities: [{ name: "PSK_KERNEL" }, { name: "OTHER" }],
  }), { storePath: "/v/episodes.jsonl", ...fs });
  appendEpisode(buildEpisode({
    source: "git", body: "b",
    entities: [{ name: "psk_kernel" }],
  }), { storePath: "/v/episodes.jsonl", ...fs });
  appendEpisode(buildEpisode({
    source: "git", body: "c",
    entities: [{ name: "UNRELATED" }],
  }), { storePath: "/v/episodes.jsonl", ...fs });
  const store = loadStore({ storePath: "/v/episodes.jsonl", ...fs });
  const hits = tracebackByEntity(store, "PSK_KERNEL");
  assert.equal(hits.length, 2, "case-insensitive match should find both");
});

test("summarize: counts valid/superseded/by-source correctly", () => {
  const fs = makeFakeFs();
  for (let i = 0; i < 3; i++) {
    appendEpisode(buildEpisode({ source: "git", body: `e${i}` }), { storePath: "/v/episodes.jsonl", ...fs });
  }
  for (let i = 0; i < 2; i++) {
    appendEpisode(buildEpisode({ source: "scrutiny", body: `s${i}` }), { storePath: "/v/episodes.jsonl", ...fs });
  }
  const store = loadStore({ storePath: "/v/episodes.jsonl", ...fs });
  const eps = store.episodes;
  appendTombstone({ target_id: eps[0].id, valid_until: "2026-05-24T12:00:00Z" }, { storePath: "/v/episodes.jsonl", ...fs });
  const reloaded = loadStore({ storePath: "/v/episodes.jsonl", ...fs });
  const sum = summarize(reloaded);
  assert.equal(sum.totalEpisodes, 5);
  assert.equal(sum.validNow, 4);
  assert.equal(sum.superseded, 1);
  assert.equal(sum.bySource.git, 3);
  assert.equal(sum.bySource.scrutiny, 2);
});

test("queryEpisodes: returns [] on null store (defensive)", () => {
  assert.deepEqual(queryEpisodes(null, () => true), []);
  assert.deepEqual(queryEpisodes({ episodes: null }, () => true), []);
});
