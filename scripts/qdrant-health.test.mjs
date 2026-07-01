// U-PSN-QDRANT-REVIVE-2026-05-24 — tests for qdrant-health.mjs
// node:test — no real Qdrant/curl: all external calls use injected spawnImpl.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { curlGet, probeHealth, probeCollections, runHealthProbe } from "./qdrant-health.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const runExec = promisify(execFile);

// ── curlGet ───────────────────────────────────────────────────────────────────

test("curlGet: successful response returns ok=true with body", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 0,
    stdout: '{"title":"qdrant","version":"1.9.0"}',
    stderr: "",
    error: null,
  });
  const r = curlGet("http://localhost:6333/healthz", 5000, spawnImpl);
  assert.equal(r.ok, true);
  assert.match(r.body, /qdrant/);
});

test("curlGet: ECONNREFUSED (spawnSync error) returns ok=false with error message", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 7,
    stdout: "",
    stderr: "curl: (7) Failed to connect to localhost port 6333: Connection refused",
    error: null,
  });
  const r = curlGet("http://localhost:6333/healthz", 5000, spawnImpl);
  assert.equal(r.ok, false);
  assert.ok(r.error && r.error.length > 0, "error should be non-empty");
});

test("curlGet: spawnSync .error field (process spawn failure) returns ok=false", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: null,
    stdout: "",
    stderr: "",
    error: Object.assign(new Error("spawn curl ENOENT"), { code: "ENOENT" }),
  });
  const r = curlGet("http://localhost:6333/healthz", 5000, spawnImpl);
  assert.equal(r.ok, false);
  assert.match(r.error, /ENOENT/);
});

test("curlGet: timeout (status non-zero + stderr) surfaces error text, capped at 160 chars", () => {
  const longMsg = "curl: (28) " + "x".repeat(300);
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 28,
    stdout: "",
    stderr: longMsg,
    error: null,
  });
  const r = curlGet("http://localhost:6333/healthz", 5000, spawnImpl);
  assert.equal(r.ok, false);
  assert.ok(r.error.length <= 160, `error length ${r.error.length} exceeds cap`);
});

// ── probeHealth ────────────────────────────────────────────────────────────────

test("probeHealth: reachable=true when curl succeeds, version extracted from JSON", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 0,
    stdout: '{"title":"qdrant - distributed vector search","version":"1.9.2","commit":"abc"}',
    stderr: "",
    error: null,
  });
  const h = probeHealth(spawnImpl);
  assert.equal(h.reachable, true);
  assert.equal(h.version, "1.9.2");
});

test("probeHealth: reachable=true with plain-text healthz body (no version)", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 0,
    stdout: "healthz check passed",
    stderr: "",
    error: null,
  });
  const h = probeHealth(spawnImpl);
  assert.equal(h.reachable, true);
  assert.equal(h.version, null);
});

test("probeHealth: reachable=false on ECONNREFUSED", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 7,
    stdout: "",
    stderr: "curl: (7) Connection refused",
    error: null,
  });
  const h = probeHealth(spawnImpl);
  assert.equal(h.reachable, false);
  assert.ok(h.error && h.error.length > 0);
});

// ── probeCollections ───────────────────────────────────────────────────────────

test("probeCollections: parses collection list from /collections response", () => {
  // First call: /collections list; subsequent calls: /collections/<name>
  let callCount = 0;
  const spawnImpl = (_cmd, args, _opts) => {
    callCount++;
    if (callCount === 1) {
      return {
        status: 0,
        stdout: JSON.stringify({ result: { collections: [{ name: "prism-wiki" }, { name: "prism-tribal" }] } }),
        stderr: "",
        error: null,
      };
    }
    // per-collection info
    return {
      status: 0,
      stdout: JSON.stringify({ result: { vectors_count: 512, status: "green" } }),
      stderr: "",
      error: null,
    };
  };
  const { collections, collectionStats } = probeCollections(spawnImpl);
  assert.deepEqual(collections, ["prism-wiki", "prism-tribal"]);
  assert.equal(collectionStats["prism-wiki"].vectorCount, 512);
  assert.equal(collectionStats["prism-wiki"].status, "green");
});

test("probeCollections: modern Qdrant (vectors_count absent, indexed=0) reports points_count, not 0", () => {
  // Regression: a populated-but-below-HNSW-threshold collection (e.g. prism_skills
  // with 241 pts) returns points_count=241, indexed_vectors_count=0, and no
  // vectors_count. The old code reported vectorCount=0 -> the vault looked empty.
  let callCount = 0;
  const spawnImpl = (_cmd, _args, _opts) => {
    callCount++;
    if (callCount === 1) {
      return { status: 0, stdout: JSON.stringify({ result: { collections: [{ name: "prism_skills" }] } }), stderr: "", error: null };
    }
    return {
      status: 0,
      stdout: JSON.stringify({ result: { points_count: 241, indexed_vectors_count: 0, status: "grey" } }),
      stderr: "",
      error: null,
    };
  };
  const { collectionStats } = probeCollections(spawnImpl);
  const s = collectionStats["prism_skills"];
  assert.equal(s.vectorCount, 241, "vectorCount must be the authoritative points_count");
  assert.equal(s.pointCount, 241);
  assert.equal(s.indexedVectorCount, 0, "indexed subset is 0 below threshold but still surfaced");
  assert.equal(s.status, "grey");
});

test("probeCollections: empty collections list on failed /collections endpoint", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 7,
    stdout: "",
    stderr: "curl: (7) Connection refused",
    error: null,
  });
  const r = probeCollections(spawnImpl);
  assert.deepEqual(r.collections, []);
  assert.deepEqual(r.collectionStats, {});
  assert.ok(r.collectionsError && r.collectionsError.length > 0);
});

test("probeCollections: bad JSON body is fail-soft (empty collections returned)", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 0,
    stdout: "not json at all {{",
    stderr: "",
    error: null,
  });
  const r = probeCollections(spawnImpl);
  assert.deepEqual(r.collections, []);
});

// ── runHealthProbe ─────────────────────────────────────────────────────────────

test("runHealthProbe: offline Qdrant returns reachable=false with error field", () => {
  const spawnImpl = (_cmd, _args, _opts) => ({
    status: 7,
    stdout: "",
    stderr: "curl: (7) Connection refused",
    error: null,
  });
  const report = runHealthProbe({ spawnImpl });
  assert.equal(report.reachable, false);
  assert.ok(typeof report.probedAt === "string");
  assert.ok(report.error && report.error.length > 0);
  assert.deepEqual(report.collections, []);
});

test("runHealthProbe: online Qdrant with no collections returns reachable=true + empty array", () => {
  let callCount = 0;
  const spawnImpl = (_cmd, args, _opts) => {
    callCount++;
    if (callCount === 1) {
      // healthz
      return { status: 0, stdout: '{"title":"qdrant","version":"1.9.0"}', stderr: "", error: null };
    }
    // /collections
    return { status: 0, stdout: JSON.stringify({ result: { collections: [] } }), stderr: "", error: null };
  };
  const report = runHealthProbe({ spawnImpl });
  assert.equal(report.reachable, true);
  assert.equal(report.version, "1.9.0");
  assert.deepEqual(report.collections, []);
  assert.ok(typeof report.probedAt === "string");
});

test("runHealthProbe: shape has all required fields even when offline", () => {
  const spawnImpl = () => ({ status: 7, stdout: "", stderr: "refused", error: null });
  const report = runHealthProbe({ spawnImpl });
  assert.ok("reachable" in report);
  assert.ok("version" in report);
  assert.ok("collections" in report);
  assert.ok("collectionStats" in report);
  assert.ok("probedAt" in report);
});

// ── import oracle ──────────────────────────────────────────────────────────────

test("oracle: qdrant-health.mjs imports cleanly and exports required symbols", async () => {
  const target = pathToFileURL(resolve(HERE, "qdrant-health.mjs")).href;
  const { stdout } = await runExec(
    process.execPath,
    [
      "-e",
      `import(${JSON.stringify(target)}).then(` +
        `m=>console.log([typeof m.curlGet,typeof m.probeHealth,typeof m.probeCollections,typeof m.runHealthProbe].join(" ")),` +
        `e=>{console.error("IMPORT_FAILED:"+(e&&e.message));process.exit(1);})`,
    ],
    { timeout: 20000 }
  );
  assert.equal(stdout.trim(), "function function function function");
});
