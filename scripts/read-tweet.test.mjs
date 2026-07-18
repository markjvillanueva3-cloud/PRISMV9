// Tests for scripts/read-tweet.mjs -- pure functions only (no network).
// Run: node --test scripts/read-tweet.test.mjs   (or: node scripts/read-tweet.test.mjs)
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractId, synToken, buildUrl, parseResult } from "./read-tweet.mjs";

test("extractId: URL, bare id, and rejection", () => {
  assert.equal(extractId("https://x.com/leopardracer/status/2067892652306018598"), "2067892652306018598");
  assert.equal(extractId("https://twitter.com/i/status/2066908445425496348"), "2066908445425496348");
  assert.equal(extractId("2067313826492547483"), "2067313826492547483");
  assert.equal(extractId("no digits here"), null);
  assert.equal(extractId("12345"), null); // too short (<15)
});

test("synToken: deterministic base36, strips zeros + dot", () => {
  const t = synToken("2067892652306018598");
  assert.match(t, /^[a-z0-9]+$/);
  assert.ok(!t.includes("."), "no dot");
  assert.ok(!t.includes("0"), "no zeros");
  assert.equal(t, synToken("2067892652306018598"), "deterministic");
  assert.notEqual(synToken("2067892652306018598"), synToken("2066908445425496348"), "discriminates");
});

test("buildUrl: syndication endpoint with id + token", () => {
  const u = buildUrl("2067892652306018598");
  assert.match(u, /^https:\/\/cdn\.syndication\.twimg\.com\/tweet-result\?id=2067892652306018598&token=[a-z0-9]+&lang=en$/);
});

test("parseResult: plain tweet -> full text, not article", () => {
  const r = parseResult({ user: { screen_name: "zachlloydtweets" }, text: "hello world", entities: { urls: [] } });
  assert.equal(r.handle, "zachlloydtweets");
  assert.equal(r.text, "hello world");
  assert.equal(r.isArticle, false);
  assert.deepEqual(r.urls, []);
});

test("parseResult: X Article -> title + preview + expanded url", () => {
  const r = parseResult({
    user: { screen_name: "IBuzovskyi" },
    text: "https://t.co/x",
    article: { title: "Build a 3-Agent Research Dept", preview_text: "One agent doing research..." },
    entities: { urls: [{ expanded_url: "http://x.com/i/article/123" }] },
  });
  assert.equal(r.isArticle, true);
  assert.equal(r.title, "Build a 3-Agent Research Dept");
  assert.equal(r.preview, "One agent doing research...");
  assert.deepEqual(r.urls, ["http://x.com/i/article/123"]);
});

test("parseResult: null / non-object guard", () => {
  assert.equal(parseResult(null), null);
  assert.equal(parseResult(undefined), null);
  assert.equal(parseResult("string"), null);
});

test("parseResult: missing fields degrade to nulls, never throw", () => {
  const r = parseResult({});
  assert.equal(r.handle, null);
  assert.equal(r.text, null);
  assert.equal(r.isArticle, false);
  assert.deepEqual(r.urls, []);
});
