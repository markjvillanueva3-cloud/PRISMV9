/**
 * extract-json-object.test.mjs -- the shared balanced-JSON extractor for local-LLM output.
 * R9: real intent tests over the messy shapes local models actually emit. Run:
 *   node --test scripts/lib/extract-json-object.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJsonObject } from "./extract-json-object.mjs";

test("clean object", () => {
  assert.deepEqual(extractJsonObject('{"a":1,"b":"x"}'), { a: 1, b: "x" });
});

test("code-fenced object is unwrapped", () => {
  assert.deepEqual(extractJsonObject('```json\n{"a":1}\n```'), { a: 1 });
});

test("prose before and after the object", () => {
  assert.deepEqual(extractJsonObject('Sure! Here it is:\n{"a":2}\nHope that helps.'), { a: 2 });
});

test("braces inside string values do not break balance", () => {
  assert.deepEqual(extractJsonObject('{"s":"has { and } braces","n":3}'), { s: "has { and } braces", n: 3 });
});

test("escaped quote inside string is handled", () => {
  assert.deepEqual(extractJsonObject('{"s":"a \\" quote","n":4}'), { s: 'a " quote', n: 4 });
});

test("nested object returns the full outer object", () => {
  assert.deepEqual(extractJsonObject('noise {"a":{"b":1}} tail'), { a: { b: 1 } });
});

test("first object wins when several are present", () => {
  assert.deepEqual(extractJsonObject('{"a":1} {"a":2}'), { a: 1 });
});

test("null on empty / non-string / no-object", () => {
  assert.equal(extractJsonObject(""), null);
  assert.equal(extractJsonObject(null), null);
  assert.equal(extractJsonObject(undefined), null);
  assert.equal(extractJsonObject("no json here"), null);
});

test("null on unterminated object (no closing brace)", () => {
  assert.equal(extractJsonObject('{"a":1'), null);
});

test("null on malformed JSON (unquoted key / trailing comma), never throws", () => {
  assert.equal(extractJsonObject("{a: 1,}"), null);
});

test("a bare JSON array is NOT treated as an object (returns null)", () => {
  assert.equal(extractJsonObject("[1,2,3]"), null);
});
