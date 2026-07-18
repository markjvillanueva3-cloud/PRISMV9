// Behavioral tests for the CI legitimacy scan's pure core (scanFiles).
// Dependencies (the hook + file reads) are injected so the test is hermetic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const mod = await import(
  pathToFileURL(path.resolve(import.meta.dirname, "ci-test-legitimacy-scan.mjs")).href
);
const { scanFiles } = mod;

// Stub hook: blocks any file whose content contains the marker "FAKE".
const stubHook = async ({ input }) =>
  (input.content || "").includes("FAKE")
    ? { allow: false, message: "TEST LEGITIMACY: x is not valid coverage. stubbed reason" }
    : { allow: true };

test("flags only the fake file, leaves real files clean", async () => {
  const fs = { "a.test.ts": "expect(x).toBe(1)", "b.test.ts": "FAKE stub" };
  const v = await scanFiles(Object.keys(fs), stubHook, (rel) => fs[rel]);
  assert.equal(v.length, 1, "exactly one violation");
  assert.equal(v[0].file, "b.test.ts");
  assert.match(v[0].reason, /stubbed reason/);
});

test("clean set yields zero violations", async () => {
  const fs = { "a.test.ts": "expect(x).toBe(1)", "c.test.ts": "expect(y).toEqual({})" };
  const v = await scanFiles(Object.keys(fs), stubHook, (rel) => fs[rel]);
  assert.equal(v.length, 0);
});

test("unreadable files are skipped, not counted as violations", async () => {
  const readFail = () => { throw new Error("ENOENT"); };
  const v = await scanFiles(["gone.test.ts"], stubHook, readFail);
  assert.equal(v.length, 0, "a missing/deleted file must not be a violation");
});

test("a hook that throws does not crash the scan (file skipped)", async () => {
  const throwingHook = async () => { throw new Error("hook boom"); };
  const v = await scanFiles(["x.test.ts"], throwingHook, () => "FAKE");
  assert.equal(v.length, 0, "hook error -> file skipped, scan continues");
});

test("empty file list yields no violations", async () => {
  const v = await scanFiles([], stubHook, () => "");
  assert.equal(v.length, 0);
});
