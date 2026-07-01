/**
 * Tests for galaxy-knowledge-iterate.mjs pure helpers. Run: node --test.
 * Guards the totality invariant (exactly 34 galaxies, the operator's "every galaxy")
 * and the Hermes-output source parser.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GALAXIES, parseArgs, parseHermes } from "./galaxy-knowledge-iterate.mjs";

test("GALAXIES: exactly 34, unique, with the 6 safety-critical cutting galaxies flagged physics", () => {
  assert.equal(GALAXIES.length, 34); // operator "every galaxy" == the 34-galaxy roster
  const names = GALAXIES.map((g) => g.galaxy);
  assert.equal(new Set(names).size, 34); // no duplicates
  const physics = GALAXIES.filter((g) => g.physics).map((g) => g.galaxy).sort();
  assert.deepEqual(physics, ["cam", "lathe", "mill", "post-processor", "speed-feed", "wedm"]);
  // every galaxy has an owner + name
  for (const g of GALAXIES) {
    assert.ok(g.galaxy && typeof g.galaxy === "string");
    assert.ok(g.owner && typeof g.owner === "string");
  }
});

test("parseArgs: defaults + flag parsing", () => {
  assert.deepEqual(parseArgs([]), { count: 1 });
  assert.equal(parseArgs(["--status"]).status, true);
  assert.equal(parseArgs(["--init-only"]).initOnly, true);
  assert.equal(parseArgs(["--count", "3"]).count, 3);
  assert.equal(parseArgs(["--count", "0"]).count, 1); // clamps to >=1
  assert.equal(parseArgs(["--galaxy", "mill"]).galaxy, "mill");
  const rec = parseArgs(["--record", "cam", "--sources", "a,b", "--course", "2", "--note", "hi", "--confirmed"]);
  assert.equal(rec.record, "cam");
  assert.equal(rec.sources, "a,b");
  assert.equal(rec.course, 2);
  assert.equal(rec.note, "hi");
  assert.equal(rec.confirmed, true);
});

test("parseHermes: extracts cited sources from a SOURCES: block (URL / author-year / standard)", () => {
  const text = `Some deep knowledge about milling stability.
The key models are X and Y.
SOURCES:
- Altintas, Y. 2012 Manufacturing Automation
- https://ocw.mit.edu/courses/2-008
- ISO 513:2012
- not a source line just prose`;
  const { sources } = parseHermes(text);
  assert.ok(sources.includes("Altintas, Y. 2012 Manufacturing Automation"));
  assert.ok(sources.some((s) => s.includes("ocw.mit.edu")));
  assert.ok(sources.some((s) => s.includes("ISO 513:2012")));
  // a plain prose line with no URL/year/Author, comma is excluded
  assert.ok(!sources.includes("not a source line just prose"));
});

test("parseHermes: dedups repeated sources", () => {
  const text = `SOURCES:\n- Smith, J. 2020 Title\n- Smith, J. 2020 Title`;
  const { sources } = parseHermes(text);
  assert.equal(sources.filter((s) => s.includes("Smith, J. 2020")).length, 1);
});

test("parseHermes: no SOURCES block / empty -> no crash, empty list (edge case)", () => {
  assert.deepEqual(parseHermes("").sources, []);
  assert.deepEqual(parseHermes(null).sources, []);
  // free text with no citation-shaped lines -> empty
  assert.deepEqual(parseHermes("just some prose with no citations here").sources, []);
});
