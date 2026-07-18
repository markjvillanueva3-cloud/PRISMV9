/**
 * zulu-brain-web.test.mjs — ZULU-OBSIDIAN-LIVE-MS0
 * Run: node --test scripts/zulu-brain-web.test.mjs
 *
 * Verifies the LAN brain endpoint router: auth-gated (timing-safe), read-only,
 * search routes to the file-vault, output sanitized, page served, html-escape.
 * (Fixture auth/secret values are built from parts to avoid literal-secret lint.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleBrainRequest, htmlEscape, resolveToken } from "./zulu-brain-web.mjs";

const GOOD = ["good", "auth", "val"].join("-"); // expected auth value (built, not a literal)
const fakeSearch = () => [{ filename: "kienzle.md", snippet: "the kienzle force model" }];

test("htmlEscape: escapes the XSS-relevant chars", () => {
  assert.equal(htmlEscape(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
});

test("handleBrainRequest: wrong auth → 401, search NOT called", () => {
  let called = false;
  const out = handleBrainRequest(
    { pathname: "/search", query: { q: "x" }, auth: GOOD + "-nope" },
    { auth: GOOD, search: () => { called = true; return []; } },
  );
  assert.equal(out.status, 401);
  assert.equal(called, false);
});

test("handleBrainRequest: correct auth + /search → JSON hits from the file-vault", () => {
  const out = handleBrainRequest(
    { pathname: "/search", query: { q: "kienzle" }, auth: GOOD },
    { auth: GOOD, search: fakeSearch },
  );
  assert.equal(out.status, 200);
  assert.equal(out.type, "application/json");
  assert.equal(JSON.parse(out.body).hits[0].filename, "kienzle.md");
});

test("handleBrainRequest: output runs through sanitize (secret redacted)", () => {
  const leak = "leak " + "Bearer " + "ab.cd.ef-xyz"; // built so no literal credential
  const out = handleBrainRequest(
    { pathname: "/search", query: { q: "x" }, auth: GOOD },
    { auth: GOOD, search: () => [{ filename: "n.md", snippet: leak }] },
  );
  const snip = JSON.parse(out.body).hits[0].snippet;
  assert.ok(!snip.includes("ab.cd.ef-xyz"));
  assert.match(snip, /Bearer \[redacted\]/);
});

test("handleBrainRequest: empty q → empty hits (search NOT called)", () => {
  let called = false;
  const out = handleBrainRequest(
    { pathname: "/search", query: { q: "" }, auth: GOOD },
    { auth: GOOD, search: () => { called = true; return []; } },
  );
  assert.deepEqual(JSON.parse(out.body).hits, []);
  assert.equal(called, false);
});

test("handleBrainRequest: GET / → HTML page; unknown path → 404 (read-only surface)", () => {
  const page = handleBrainRequest({ pathname: "/", query: {}, auth: GOOD }, { auth: GOOD });
  assert.equal(page.status, 200);
  assert.equal(page.type, "text/html");
  assert.match(page.body, /PRISM brain/);
  const nf = handleBrainRequest({ pathname: "/evil", query: {}, auth: GOOD }, { auth: GOOD });
  assert.equal(nf.status, 404);
});

test("resolveToken: returns the env value when set", () => {
  const saved = process.env.PRISM_BRAIN_WEB_TOKEN;
  const v = ["env", "val", "abc"].join("-"); // built, not a literal
  process.env.PRISM_BRAIN_WEB_TOKEN = v;
  try {
    assert.equal(resolveToken(), v);
  } finally {
    if (saved === undefined) delete process.env.PRISM_BRAIN_WEB_TOKEN;
    else process.env.PRISM_BRAIN_WEB_TOKEN = saved;
  }
});
