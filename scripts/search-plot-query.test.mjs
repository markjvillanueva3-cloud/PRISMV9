import { test } from "node:test";
import assert from "node:assert";
import { scoreEntry, query } from "./search-plot-query.mjs";

// ---- scoreEntry (pure) ----
test("scoreEntry: name substring scores 3", () => {
  assert.equal(scoreEntry({ name: "KienzleForceModelEngine.ts" }, "kienzle"), 3);
});
test("scoreEntry: exported-symbol match scores 2", () => {
  assert.equal(scoreEntry({ name: "X.ts", exports: ["computeSparkGap"] }, "sparkgap"), 2);
});
test("scoreEntry: purpose substring scores 1", () => {
  assert.equal(scoreEntry({ name: "X.ts", purpose: "validates chuck jaw force" }, "chuck jaw"), 1);
});
test("scoreEntry: combined (name+export+purpose) sums", () => {
  assert.equal(scoreEntry({ name: "Foo.ts", exports: ["foo"], purpose: "the foo thing" }, "foo"), 6);
});
test("scoreEntry: no match scores 0", () => {
  assert.equal(scoreEntry({ name: "Bar.ts", purpose: "baz" }, "qux"), 0);
});

// ---- query (integration against the committed plots) ----
test("query: empty term => ok:false", () => {
  const r = query("");
  assert.equal(r.ok, false);
  assert.equal(r.error, "empty-query");
});
test("query: resolves a real engine by name (kienzle)", () => {
  const r = query("kienzle", { k: 5 });
  assert.equal(r.ok, true);
  assert.ok(r.total >= 1, "expected >=1 kienzle hit");
  const top = r.matches[0];
  assert.match(top.file, /KienzleForceModelEngine\.ts$/);
  assert.equal(top.surface, "engines");
});
test("query: --domain filter restricts to that galaxy", () => {
  const r = query("spark", { domain: "wedm", k: 10 });
  assert.equal(r.ok, true);
  assert.ok(r.matches.every((m) => m.domain === "wedm"), "all hits must be wedm-domain");
});
test("query: --surface filter restricts to that surface", () => {
  const r = query("terminal-pin", { surface: "hooks", k: 5 });
  assert.equal(r.ok, true);
  assert.ok(r.matches.every((m) => m.surface === "hooks"), "all hits must be hooks surface");
});
test("query: results are score-sorted descending", () => {
  const r = query("engine", { k: 20 });
  for (let i = 1; i < r.matches.length; i++) {
    assert.ok(r.matches[i - 1].score >= r.matches[i].score, "scores must be non-increasing");
  }
});
