// Test -- chunk-pdf-text-to-nodes.mjs pure helpers.
// Run: node scripts/chunk-pdf-text-to-nodes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { sha8, titleFromPath, chunkText, rowToNodes } from "./chunk-pdf-text-to-nodes.mjs";

test("sha8: stable 8-hex digest, differs by input", () => {
  assert.match(sha8("a"), /^[0-9a-f]{8}$/);
  assert.equal(sha8("x::0"), sha8("x::0"));
  assert.notEqual(sha8("x::0"), sha8("x::1"));
});

test("titleFromPath: last two segments, no .pdf, backslashes normalized", () => {
  assert.equal(titleFromPath("H:\\PRISM\\JM DIE\\CONTROLLERS\\HAAS\\manuals\\haas-lathe.pdf"), "manuals / haas-lathe");
  assert.equal(titleFromPath("a.pdf"), "a");
});

test("chunkText: short text -> one chunk; empty -> []", () => {
  assert.deepEqual(chunkText("short doc here"), ["short doc here"]);
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText(null), []);
});

test("chunkText: long text splits into <=chunkChars pieces on paragraph boundaries", () => {
  const para = "A".repeat(400);
  const text = Array.from({ length: 10 }, () => para).join("\n\n"); // 10 x 400 = ~4000 + seps
  const chunks = chunkText(text, 1000);
  assert.ok(chunks.length >= 4, `expected >=4 chunks, got ${chunks.length}`);
  assert.ok(chunks.every((c) => c.length <= 1000), "every chunk within cap");
  // no content lost (modulo whitespace): total A's preserved
  const aCount = chunks.join("").split("A").length - 1;
  assert.equal(aCount, 4000);
});

test("chunkText: a single mega-paragraph beyond cap is hard-sliced, still within cap", () => {
  const mega = "B".repeat(5000); // no paragraph/sentence boundaries
  const chunks = chunkText(mega, 1000);
  assert.equal(chunks.length, 5);
  assert.ok(chunks.every((c) => c.length <= 1000));
});

test("rowToNodes: failed/empty row -> []; ok row -> stable-sha8 chunk nodes", () => {
  assert.deepEqual(rowToNodes({ ok: false, text: "x", path: "p" }), []);
  assert.deepEqual(rowToNodes({ ok: true, text: "", path: "p" }), []);
  const nodes = rowToNodes({ ok: true, path: "H:/r/haas.pdf", text: "C".repeat(2500) }, { domain: "cam", chunkChars: 1000 });
  assert.ok(nodes.length >= 2);
  assert.equal(nodes[0].domain, "cam");
  assert.match(nodes[0].title, /haas \[1\//);
  assert.equal(nodes[0].source, "H:/r/haas.pdf");
  // stable sha8 = hash(path::index) -> re-run yields identical ids (generator resume)
  assert.equal(nodes[0].sha8, sha8("H:/r/haas.pdf::0"));
  assert.notEqual(nodes[0].sha8, nodes[1].sha8);
});

test("rowToNodes: --max-chunks-per-doc caps the node count", () => {
  const nodes = rowToNodes({ ok: true, path: "p.pdf", text: "D".repeat(10000) }, { chunkChars: 1000, maxChunksPerDoc: 3 });
  assert.equal(nodes.length, 3);
});
