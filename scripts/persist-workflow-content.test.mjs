import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, extractItems } from "./persist-workflow-content.mjs";

test("parseArgs: input + only + dry", () => {
  const a = parseArgs(["--input", "x.json", "--only", "u1, u2 ,u3", "--dry"]);
  assert.equal(a.input, "x.json");
  assert.deepEqual(a.only, ["u1", "u2", "u3"]);
  assert.equal(a.dry, true);
});

test("parseArgs: defaults (no only, no dry)", () => {
  const a = parseArgs(["--input", "y.json"]);
  assert.equal(a.input, "y.json");
  assert.equal(a.only, undefined);
  assert.equal(a.dry, undefined);
});

test("extractItems: bare array", () => {
  const arr = [{ unit: "u1", targetPath: "a.md", content: "x" }];
  assert.deepEqual(extractItems(JSON.stringify(arr)), arr);
});

test("extractItems: {result: array} wrapper", () => {
  const arr = [{ unit: "u1", targetPath: null, content: "f" }];
  assert.deepEqual(extractItems(JSON.stringify({ summary: "s", result: arr })), arr);
});

test("extractItems: {result: json-string}", () => {
  const arr = [{ unit: "u1", targetPath: "a.md", content: "x" }];
  assert.deepEqual(extractItems(JSON.stringify({ result: JSON.stringify(arr) })), arr);
});

test("extractItems: bracket-fallback from noisy non-JSON wrapper", () => {
  const arr = [{ unit: "u1", targetPath: "a.md", content: "hello ] world" }];
  const noisy = `<task>\nblah blah\n${JSON.stringify(arr)}\ntrailing junk`;
  assert.deepEqual(extractItems(noisy), arr);
});

test("extractItems: string with brackets/quotes inside content does not break depth matching", () => {
  const arr = [{ unit: "u1", targetPath: "a.md", content: 'has [ and ] and \\" escaped' }];
  assert.deepEqual(extractItems(JSON.stringify(arr)), arr);
});

test("extractItems: malformed returns null", () => {
  assert.equal(extractItems("not json at all, no unit array"), null);
});

test("extractItems: empty string returns null", () => {
  assert.equal(extractItems(""), null);
});
