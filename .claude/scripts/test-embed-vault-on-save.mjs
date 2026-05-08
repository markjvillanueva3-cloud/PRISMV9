#!/usr/bin/env node
/**
 * test-embed-vault-on-save.mjs
 *
 * OBSIDIAN-AUTOMATE-MS3/U-EMBED-VAULT-PREWARM
 *
 * Standalone node test runner for embed-vault-on-save.mjs hook.
 * Same pattern as test-ollama-preflight.mjs — vitest can't transform
 * .ts→.mjs cross-extension imports, so tests live next to the unit.
 *
 * Coverage (16 cases):
 *  - extractEditedPath: Write/Edit/MultiEdit happy paths + 3 reject paths
 *  - isVaultMarkdown: vault-md ok, non-md reject, non-vault reject,
 *    nonexistent reject, oversize reject
 *  - sha256: deterministic
 *  - readCache: missing-file, corrupt-file, valid
 *  - writeCache: atomic write produces readable cache
 *  - processEditedPath: cache-hit dedup, embed flow, embed-failed skip
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK_URL = pathToFileURL(resolve(__dirname, "..", "hooks", "embed-vault-on-save.mjs")).href;
const mod = await import(HOOK_URL);
const {
  extractEditedPath,
  isVaultMarkdown,
  sha256,
  readCache,
  writeCache,
  processEditedPath,
  embed,
} = mod;

let passes = 0;
let fails = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    process.stdout.write(`  ✓ ${name}\n`);
    passes++;
  } catch (err) {
    process.stdout.write(`  ✗ ${name}\n    ${err.message}\n`);
    fails++;
    failures.push({ name, message: err.message });
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function assertTrue(cond, label) { if (!cond) throw new Error(`${label}: expected truthy`); }
function assertFalse(cond, label) { if (cond) throw new Error(`${label}: expected falsy`); }

// ─── extractEditedPath ───────────────────────────────────────────────────────
process.stdout.write("\n[extractEditedPath]\n");

await test("Write tool with file_path returns path", () => {
  assertEqual(
    extractEditedPath("Write", { file_path: "/v/a.md", content: "x" }),
    "/v/a.md",
    "Write extract",
  );
});

await test("Edit tool with file_path returns path", () => {
  assertEqual(
    extractEditedPath("Edit", { file_path: "/v/b.md", old_string: "x", new_string: "y" }),
    "/v/b.md",
    "Edit extract",
  );
});

await test("MultiEdit tool with file_path returns path", () => {
  assertEqual(
    extractEditedPath("MultiEdit", { file_path: "/v/c.md", edits: [] }),
    "/v/c.md",
    "MultiEdit extract",
  );
});

await test("non-edit tool (Bash) returns null", () => {
  assertEqual(extractEditedPath("Bash", { command: "ls" }), null, "Bash reject");
});

await test("missing tool_input returns null without throw", () => {
  assertEqual(extractEditedPath("Write", null), null, "null input");
  assertEqual(extractEditedPath("Write", undefined), null, "undefined input");
});

await test("missing file_path returns null", () => {
  assertEqual(extractEditedPath("Write", {}), null, "no file_path");
});

// ─── isVaultMarkdown ─────────────────────────────────────────────────────────
process.stdout.write("\n[isVaultMarkdown]\n");

const tmpVault = mkdtempSync(join(tmpdir(), "embed-test-vault-"));
const tmpOther = mkdtempSync(join(tmpdir(), "embed-test-other-"));

const vaultMd = join(tmpVault, "note.md");
writeFileSync(vaultMd, "# vault note", "utf8");
const vaultBig = join(tmpVault, "big.md");
writeFileSync(vaultBig, "X".repeat(300_000), "utf8");
const vaultTxt = join(tmpVault, "notes.txt");
writeFileSync(vaultTxt, "txt", "utf8");
const otherMd = join(tmpOther, "elsewhere.md");
writeFileSync(otherMd, "# elsewhere", "utf8");

await test("vault .md within size cap → true", () => {
  assertTrue(isVaultMarkdown(vaultMd, tmpVault, 200_000), "vault md");
});

await test("vault .md OVER size cap → false (skip mass dumps)", () => {
  assertFalse(isVaultMarkdown(vaultBig, tmpVault, 200_000), "oversize reject");
});

await test("vault .txt → false (extension filter)", () => {
  assertFalse(isVaultMarkdown(vaultTxt, tmpVault, 200_000), "txt reject");
});

await test("path outside vault → false", () => {
  assertFalse(isVaultMarkdown(otherMd, tmpVault, 200_000), "non-vault reject");
});

await test("nonexistent path → false (no throw)", () => {
  assertFalse(isVaultMarkdown(join(tmpVault, "missing.md"), tmpVault, 200_000), "nonexistent");
});

await test("non-string input → false", () => {
  assertFalse(isVaultMarkdown(null, tmpVault, 200_000), "null");
  assertFalse(isVaultMarkdown(42, tmpVault, 200_000), "number");
});

// ─── sha256 ──────────────────────────────────────────────────────────────────
process.stdout.write("\n[sha256]\n");

await test("sha256 is deterministic and 64-hex chars", () => {
  const h1 = sha256("hello world");
  const h2 = sha256("hello world");
  assertEqual(h1, h2, "deterministic");
  assertEqual(h1.length, 64, "64 hex chars");
  assertTrue(/^[0-9a-f]{64}$/.test(h1), "lowercase hex");
});

// ─── readCache / writeCache ──────────────────────────────────────────────────
process.stdout.write("\n[readCache / writeCache]\n");

const tmpCacheMissing = join(tmpVault, "cache-missing.json");
await test("readCache on missing file → empty object (no throw)", () => {
  const c = readCache(tmpCacheMissing);
  assertEqual(typeof c, "object", "type");
  assertEqual(Object.keys(c).length, 0, "empty");
});

const tmpCacheCorrupt = join(tmpVault, "cache-corrupt.json");
writeFileSync(tmpCacheCorrupt, "{not valid json", "utf8");
await test("readCache on corrupt JSON → empty object (recovery path)", () => {
  const c = readCache(tmpCacheCorrupt);
  assertEqual(Object.keys(c).length, 0, "empty after corrupt");
});

const tmpCacheOk = join(tmpVault, "cache-ok.json");
await test("writeCache then readCache round-trips entries verbatim", () => {
  const data = { "/v/a.md": { vector: [0.1, 0.2], sha256: "abc", dims: 2, model: "m" } };
  writeCache(data, tmpCacheOk);
  const r = readCache(tmpCacheOk);
  assertEqual(r["/v/a.md"].sha256, "abc", "sha");
  assertEqual(r["/v/a.md"].vector.length, 2, "dims");
  assertEqual(r["/v/a.md"].model, "m", "model");
});

// ─── processEditedPath ──────────────────────────────────────────────────────
process.stdout.write("\n[processEditedPath]\n");

const fakeFetch = (vec) => async () => new Response(
  JSON.stringify({ embedding: vec }),
  { status: 200, headers: { "Content-Type": "application/json" } },
);
const failFetch = () => async () => new Response("nope", { status: 503, statusText: "Down" });

await test("first edit → embeds and writes cache entry", async () => {
  const cachePath = join(tmpVault, "cache-pe-1.json");
  const r = await processEditedPath(vaultMd, {
    cachePath, vaultRoot: tmpVault, fetchImpl: fakeFetch([0.1, 0.2, 0.3, 0.4]),
  });
  assertEqual(r.status, "embedded", "status");
  assertEqual(r.dims, 4, "dims");
  const cache = readCache(cachePath);
  assertEqual(cache[vaultMd].dims, 4, "cache dims");
  assertTrue(cache[vaultMd].sha256.length === 64, "cache sha");
});

await test("second edit on UNCHANGED content → cache-hit (no re-embed)", async () => {
  const cachePath = join(tmpVault, "cache-pe-2.json");
  await processEditedPath(vaultMd, {
    cachePath, vaultRoot: tmpVault, fetchImpl: fakeFetch([0.1, 0.2, 0.3, 0.4]),
  });
  // Second pass with a fetch that would FAIL — must never fire because of dedup.
  const r2 = await processEditedPath(vaultMd, {
    cachePath, vaultRoot: tmpVault,
    fetchImpl: async () => { throw new Error("should not fetch"); },
  });
  assertEqual(r2.status, "skip", "second status");
  assertEqual(r2.reason, "cache-hit", "dedup reason");
});

await test("Ollama down (HTTP 503) → skip with embed-failed reason (no throw)", async () => {
  const cachePath = join(tmpVault, "cache-pe-3.json");
  const r = await processEditedPath(vaultMd, {
    cachePath, vaultRoot: tmpVault, fetchImpl: failFetch(),
  });
  assertEqual(r.status, "skip", "status");
  assertTrue(r.reason.startsWith("embed-failed"), "reason prefix");
});

await test("non-vault path → skip with not-vault-md reason", async () => {
  const r = await processEditedPath(otherMd, {
    cachePath: join(tmpVault, "cache-pe-4.json"),
    vaultRoot: tmpVault, fetchImpl: fakeFetch([0.1]),
  });
  assertEqual(r.status, "skip", "status");
  assertEqual(r.reason, "not-vault-md", "reason");
});

// ─── embed (fetch wrapper) ───────────────────────────────────────────────────
process.stdout.write("\n[embed]\n");

await test("embed returns ok+vector on valid response", async () => {
  const r = await embed("hello", { fetchImpl: fakeFetch([1, 2, 3]) });
  assertEqual(r.ok, true, "ok");
  assertEqual(r.vector.length, 3, "len");
});

await test("embed returns ok:false on http-error (no throw)", async () => {
  const r = await embed("hello", { fetchImpl: failFetch() });
  assertEqual(r.ok, false, "ok");
  assertEqual(r.error, "http-503", "error code");
});

await test("embed rejects non-numeric vector (defends against bad model output)", async () => {
  const badFetch = async () => new Response(
    JSON.stringify({ embedding: [1, "two", 3] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
  const r = await embed("hello", { fetchImpl: badFetch });
  assertEqual(r.ok, false, "ok");
  assertEqual(r.error, "non-numeric", "error code");
});

// ─── cleanup + summary ──────────────────────────────────────────────────────
rmSync(tmpVault, { recursive: true, force: true });
rmSync(tmpOther, { recursive: true, force: true });

process.stdout.write(`\n${passes}/${passes + fails} passed${fails > 0 ? `, ${fails} failed` : ""}\n`);
if (fails > 0) {
  for (const f of failures) process.stdout.write(`FAIL  ${f.name}: ${f.message}\n`);
  process.exit(1);
}
process.exit(0);
