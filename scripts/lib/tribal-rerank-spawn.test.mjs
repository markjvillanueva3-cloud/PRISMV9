// Tests for tribal-rerank-spawn.mjs — the single-source heap-safe spawn for the
// tribal reranker (PSN leg #5). Real assertions that the heap flag IS passed to
// the child (the exact regression that silently killed tribal injection), env
// preservation, and ok/timeout/failure result shapes (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rerankSpawnEnv,
  spawnTribalRerank,
  DEFAULT_RERANK_HEAP_MB,
  DEFAULT_RERANK_TIMEOUT_MS,
} from "./tribal-rerank-spawn.mjs";

// ── rerankSpawnEnv ───────────────────────────────────────────────────────────
test("rerankSpawnEnv: injects the heap ceiling (the OOM fix)", () => {
  const env = rerankSpawnEnv({}, 8192);
  assert.match(env.NODE_OPTIONS, /--max-old-space-size=8192/);
});

test("rerankSpawnEnv: appends, does not clobber, an existing NODE_OPTIONS", () => {
  const env = rerankSpawnEnv({ NODE_OPTIONS: "--enable-source-maps" }, 4096);
  assert.match(env.NODE_OPTIONS, /--enable-source-maps/);
  assert.match(env.NODE_OPTIONS, /--max-old-space-size=4096/);
});

test("rerankSpawnEnv: preserves other env vars + defaults heap", () => {
  const env = rerankSpawnEnv({ FOO: "bar" });
  assert.equal(env.FOO, "bar");
  assert.match(env.NODE_OPTIONS, new RegExp(`--max-old-space-size=${DEFAULT_RERANK_HEAP_MB}`));
});

// ── spawnTribalRerank ────────────────────────────────────────────────────────
test("spawnTribalRerank: the heap flag REACHES the child (regression oracle)", () => {
  let captured = null;
  const execImpl = (bin, args, opts) => { captured = opts; return '{"ok":true,"hits":[]}'; };
  const r = spawnTribalRerank(["/path/tribal-rerank.mjs", "--query", "mill", "--json"],
    { execImpl, env: {}, timeoutMs: 4000 });
  assert.equal(r.ok, true);
  assert.equal(r.stdout, '{"ok":true,"hits":[]}');
  // The whole point: opts.env.NODE_OPTIONS must carry the heap ceiling, else OOM.
  assert.match(captured.env.NODE_OPTIONS, /--max-old-space-size=8192/);
  assert.equal(captured.timeout, 4000);
  assert.deepEqual(captured.stdio, ["ignore", "pipe", "ignore"]);
  assert.equal(captured.windowsHide, true);
  assert.equal(captured.encoding, "utf8");
});

test("spawnTribalRerank: ETIMEDOUT → reason 'rerank_timeout'", () => {
  const execImpl = () => { const e = new Error("timed out"); e.code = "ETIMEDOUT"; throw e; };
  const r = spawnTribalRerank(["x"], { execImpl });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "rerank_timeout");
});

test("spawnTribalRerank: other throw → reason 'rerank_failed' (never throws to caller)", () => {
  const execImpl = () => { throw new Error("boom"); };
  const r = spawnTribalRerank(["x"], { execImpl });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "rerank_failed");
  assert.ok(r.error instanceof Error);
});

test("spawnTribalRerank: default timeout is the documented constant", () => {
  let captured = null;
  spawnTribalRerank(["x"], { execImpl: (b, a, o) => { captured = o; return ""; } });
  assert.equal(captured.timeout, DEFAULT_RERANK_TIMEOUT_MS);
});
