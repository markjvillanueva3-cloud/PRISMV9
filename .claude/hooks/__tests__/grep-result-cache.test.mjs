import { test } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOOK = "H:/prism/.claude/hooks/grep-result-cache.mjs";

function run(payload, cacheDir) {
  // returns { stdout } ; throws only on a genuine crash (non-zero exit + no JSON)
  const out = execFileSync(process.execPath, [HOOK], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    env: { ...process.env, PRISM_GREP_CACHE_DIR: cacheDir },
    encoding: "utf8",
  });
  return out;
}

test("fail-soft on malformed stdin (R12) -- no crash, emits continue:true", () => {
  const dir = mkdtempSync(join(tmpdir(), "grepcache-"));
  try {
    const out = run("not json at all{{{", dir);
    assert.match(out, /"continue"\s*:\s*true/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("fail-soft on empty stdin", () => {
  const dir = mkdtempSync(join(tmpdir(), "grepcache-"));
  try {
    const out = run("", dir);
    assert.match(out, /"continue"\s*:\s*true/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("non-Grep tool passes through untouched", () => {
  const dir = mkdtempSync(join(tmpdir(), "grepcache-"));
  try {
    const out = run({ tool_name: "Bash", tool_input: { command: "ls" } }, dir);
    assert.match(out, /"continue"\s*:\s*true/);
    assert.ok(!existsSync(join(dir, "grep-cache.json")), "Bash must not write the grep cache");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("first Grep records the cache entry", () => {
  const dir = mkdtempSync(join(tmpdir(), "grepcache-"));
  try {
    run({ tool_name: "Grep", tool_input: { pattern: "foo", path: "x" }, tool_result: "a\nb\n" }, dir);
    const cacheFile = join(dir, "grep-cache.json");
    assert.ok(existsSync(cacheFile), "cache file must be written");
    const cache = JSON.parse(readFileSync(cacheFile, "utf8"));
    assert.equal(Object.keys(cache.entries).length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("repeat identical Grep within TTL emits the repeat nudge", () => {
  const dir = mkdtempSync(join(tmpdir(), "grepcache-"));
  try {
    const payload = { tool_name: "Grep", tool_input: { pattern: "foo", path: "x" }, tool_result: "a\n" };
    run(payload, dir);
    const out2 = run(payload, dir);
    assert.match(out2, /Repeated grep detected/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
