/**
 * Tests for content-index-query.mjs (SIERRA-VAULT-OPS/U-CONTENT-INDEX-QUERY).
 * Real behavior: builds a fixture JSONL, runs the streaming query, asserts on
 * concrete match sets -- not stubs. Run: node --test scripts/content-index-query.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs, queryContentIndex } from "./content-index-query.mjs";

const ROWS = [
  { source: "H:/prism/mcp-server/src/engines", path: "KienzleForceEngine.ts", role: "engine", domain: "cross", note: "Kienzle specific cutting force model", summary: "computes Fc via kc1.1 per ISO group" },
  { source: "H:/prism/mcp-server/src/engines", path: "EDMEngine.ts", role: "engine", domain: "wedm", note: "electrode wear and spark gap", summary: null },
  { source: "H:/prism/knowledge", path: "wiki/mill/kienzle.md", role: "wiki", domain: "mill", note: "kienzle coefficients", summary: "Kienzle force by ISO" },
  { source: "H:/prism/scripts", path: "helper.mjs", role: "script", domain: "cross", note: "unrelated helper", summary: null },
];

let counter = 0;
function fixture() {
  const p = path.join(os.tmpdir(), `cidx-test-${process.pid}-${counter++}.jsonl`);
  fs.writeFileSync(p, ROWS.map(r => JSON.stringify(r)).join("\n") + "\n");
  return p;
}

async function run(opts) {
  const hits = [];
  const res = await queryContentIndex(opts, (r) => hits.push(r));
  return { hits, res };
}

test("parseArgs: terms lowercased, flags parsed", () => {
  const o = parseArgs(["Kienzle", "Force", "--role=Engine", "--domain=Mill", "--count", "--limit=5"]);
  assert.deepEqual(o.terms, ["kienzle", "force"]);
  assert.equal(o.role, "engine");
  assert.equal(o.domain, "mill");
  assert.equal(o.count, true);
  assert.equal(o.limit, 5);
});

test("parseArgs: unknown flag flagged, field default all", () => {
  const o = parseArgs(["--bogus"]);
  assert.equal(o.badArg, "--bogus");
  assert.equal(o.field, "all");
});

test("AND term match across fields (case-insensitive)", async () => {
  const jsonl = fixture();
  const { hits, res } = await run({ jsonl, terms: ["kienzle"], field: "all", limit: 40 });
  assert.equal(res.total, 2, "KienzleForceEngine + wiki/mill/kienzle match");
  const paths = hits.map(h => h.path).sort();
  assert.deepEqual(paths, ["KienzleForceEngine.ts", "wiki/mill/kienzle.md"]);
  fs.unlinkSync(jsonl);
});

test("role filter narrows the set", async () => {
  const jsonl = fixture();
  const { res } = await run({ jsonl, terms: ["kienzle"], role: "engine", field: "all", limit: 40 });
  assert.equal(res.total, 1, "only KienzleForceEngine is role=engine");
  fs.unlinkSync(jsonl);
});

test("domain filter is exact", async () => {
  const jsonl = fixture();
  const { res } = await run({ jsonl, terms: [], domain: "wedm", field: "all", limit: 40 });
  assert.equal(res.total, 1);
  assert.deepEqual(res.byRole, { engine: 1 });
  fs.unlinkSync(jsonl);
});

test("field=summary excludes note-only hits", async () => {
  const jsonl = fixture();
  // "electrode" is only in EDMEngine.note, not its (null) summary -> 0 in summary field
  const { res } = await run({ jsonl, terms: ["electrode"], field: "summary", limit: 40 });
  assert.equal(res.total, 0);
  const noteHit = await run({ jsonl, terms: ["electrode"], field: "note", limit: 40 });
  assert.equal(noteHit.res.total, 1);
  fs.unlinkSync(jsonl);
});

test("limit caps shown but total stays accurate", async () => {
  const jsonl = fixture();
  const { hits, res } = await run({ jsonl, terms: [], field: "all", limit: 2 });
  assert.equal(res.total, 4, "all 4 rows match empty query");
  assert.equal(res.shown, 2, "only 2 shown due to limit");
  assert.equal(hits.length, 2);
  fs.unlinkSync(jsonl);
});

test("countOnly does not invoke onMatch", async () => {
  const jsonl = fixture();
  const hits = [];
  const res = await queryContentIndex({ jsonl, terms: [], field: "all", limit: 40, countOnly: true }, (r) => hits.push(r));
  assert.equal(res.total, 4);
  assert.equal(hits.length, 0);
  fs.unlinkSync(jsonl);
});

test("missing index rejects", async () => {
  await assert.rejects(() => queryContentIndex({ jsonl: "H:/prism/does-not-exist.jsonl", terms: [], field: "all", limit: 1 }, () => {}), /not found/);
});
