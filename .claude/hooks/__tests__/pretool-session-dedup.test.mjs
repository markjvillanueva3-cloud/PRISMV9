import { test } from "node:test";
import assert from "node:assert/strict";
import { signatureFor, isCacheHit, recordCall, formatDedupNudge } from "../pretool-session-dedup.mjs";

test("signatureFor: same Bash command yields same sig", () => {
  const a = signatureFor("Bash", { command: "git status" });
  const b = signatureFor("Bash", { command: "git status" });
  assert.equal(a, b);
});
test("signatureFor: different commands → different sigs", () => {
  assert.notEqual(signatureFor("Bash", { command: "git status" }), signatureFor("Bash", { command: "git log" }));
});
test("signatureFor: Read with offset/limit varies sig", () => {
  assert.notEqual(signatureFor("Read", { file_path: "x" }), signatureFor("Read", { file_path: "x", offset: 100 }));
});
test("signatureFor: WebFetch URL → sig", () => {
  assert.ok(signatureFor("WebFetch", { url: "https://x" }));
});
test("signatureFor: unsupported tool → null", () => {
  assert.equal(signatureFor("Edit", { file_path: "x" }), null);
});
test("isCacheHit: fresh entry hits", () => {
  const c = recordCall(null, "abc", "sess");
  assert.equal(isCacheHit(c, "abc"), true);
});
test("isCacheHit: expired entry misses", () => {
  const old = Date.now() - 40 * 60 * 1000;
  const c = recordCall(null, "abc", "sess", old);
  assert.equal(isCacheHit(c, "abc"), false);
});
test("isCacheHit: missing entry → false", () => {
  assert.equal(isCacheHit({ entries: {} }, "x"), false);
  assert.equal(isCacheHit(null, "x"), false);
});
test("formatDedupNudge: includes tool name + truncated sig", () => {
  const n = formatDedupNudge("Bash", "abcdef1234567890");
  assert.ok(n.includes("Bash"));
  assert.ok(n.includes("abcdef12"));
});
