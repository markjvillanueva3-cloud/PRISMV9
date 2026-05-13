/**
 * coord-db-sentinel.test.mjs — verification of CLEANUP-MS0/U-CLEANUP-G2.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes
 *   - >= 2 adversarial inputs
 *   - >= 3 spanning variability configs
 *   - round-trip through CLI entry
 *
 * Real reference values — no toBeDefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  parseArgs,
  loadSqliteDB,
  queryIntegrity,
  getDbCounts,
  getJsonCounts,
  computeDivergence,
  generateAlerts,
  buildHealthReport,
  renderMarkdown,
  runCli,
  writeAtomic,
} from "../coord-db-sentinel.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQLITE_MODULE = resolve(
  __dirname,
  "..",
  "..",
  "mcp-server",
  "node_modules",
  "better-sqlite3",
  "lib",
  "index.js",
);

// Lazy-loaded better-sqlite3 for fixture creation (test side only).
let DatabaseCtor = null;
async function getDatabase() {
  if (!DatabaseCtor) {
    const m = await import(SQLITE_MODULE);
    DatabaseCtor = m.default || m;
  }
  return DatabaseCtor;
}

// ──────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "coord-db-sentinel-"));
  mkdirSync(join(root, "state/shared"), { recursive: true });
  return root;
}

async function makeDb(root, { rows = 0, dropTables = [], extraTables = [] } = {}) {
  const Database = await getDatabase();
  const dbPath = join(root, "state/shared/coordination.db");
  const db = new Database(dbPath);
  // H8 v1 schema
  if (!dropTables.includes("claims")) {
    db.exec(`CREATE TABLE claims (
      resource_path TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      claimed_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`);
    if (rows > 0) {
      const insert = db.prepare("INSERT INTO claims VALUES (?, ?, ?, ?)");
      for (let i = 0; i < rows; i++) {
        insert.run(`H:/prism/file-${i}.ts`, `claude-${i.toString(16).padStart(8, "0")}`, "2026-05-13T22:00:00Z", "2026-05-13T23:00:00Z");
      }
    }
  }
  if (!dropTables.includes("presence")) {
    db.exec(`CREATE TABLE presence (
      session_id TEXT PRIMARY KEY,
      last_seen_at TEXT NOT NULL
    )`);
  }
  if (!dropTables.includes("meta")) {
    db.exec(`CREATE TABLE meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
    db.prepare("INSERT INTO meta VALUES (?, ?)").run("schemaVersion", "1");
  }
  for (const t of extraTables) {
    db.exec(`CREATE TABLE ${t} (id INTEGER PRIMARY KEY)`);
  }
  db.close();
  return dbPath;
}

function makeWorkClaims(root, count, opts = {}) {
  const claims = {};
  for (let i = 0; i < count; i++) {
    claims[`H:/prism/json-file-${i}.ts`] = {
      kind: "file",
      resource: `H:/prism/json-file-${i}.ts`,
      by: `claude-${i.toString(16).padStart(8, "0")}`,
      at: "2026-05-13T22:00:00Z",
    };
  }
  const payload = { claims, schemaVersion: 1, updatedAt: "2026-05-13T22:00:00Z", ...(opts.extra || {}) };
  const p = join(root, "state/shared/WORK_CLAIMS.json");
  writeFileSync(p, JSON.stringify(payload), "utf8");
  return p;
}

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs(["node", "x.mjs"]);
    expect(a.json).toBe(false);
    expect(a.frozenTime).toBe(null);
    expect(a.db).toBe(null);
    expect(a.jsonClaims).toBe(null);
  });

  it("--json + --frozen-time + --db + --json-claims", () => {
    const a = parseArgs(["node", "x.mjs", "--json", "--frozen-time", "2026-05-13T22:00:00Z", "--db", "/x.db", "--json-claims", "/y.json"]);
    expect(a.json).toBe(true);
    expect(a.frozenTime).toBe("2026-05-13T22:00:00Z");
    expect(a.db).toBe("/x.db");
    expect(a.jsonClaims).toBe("/y.json");
  });

  it("PRISM_AUDIT_FROZEN_TIME env fallback (when --frozen-time absent)", () => {
    const orig = process.env.PRISM_AUDIT_FROZEN_TIME;
    process.env.PRISM_AUDIT_FROZEN_TIME = "2026-01-01T00:00:00Z";
    try {
      const a = parseArgs(["node", "x.mjs"]);
      expect(a.frozenTime).toBe("2026-01-01T00:00:00Z");
    } finally {
      if (orig === undefined) delete process.env.PRISM_AUDIT_FROZEN_TIME;
      else process.env.PRISM_AUDIT_FROZEN_TIME = orig;
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// loadSqliteDB
// ──────────────────────────────────────────────────────────────────────

describe("loadSqliteDB", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("returns ok:true on a valid db", async () => {
    const p = await makeDb(root, { rows: 3 });
    const out = await loadSqliteDB(p, { sqliteModule: SQLITE_MODULE });
    expect(out.ok).toBe(true);
    expect(out.bytes).toBeGreaterThan(0);
    expect(typeof out.db.prepare).toBe("function");
    out.db.close();
  });

  it("returns ok:false on missing db", async () => {
    const out = await loadSqliteDB(join(root, "nope.db"), { sqliteModule: SQLITE_MODULE });
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not found/);
  });

  it("returns ok:false on zero-byte db (corrupt or never initialized)", async () => {
    const p = join(root, "state/shared/empty.db");
    writeFileSync(p, "", "utf8");
    const out = await loadSqliteDB(p, { sqliteModule: SQLITE_MODULE });
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/zero-bytes/);
  });

  it("databaseFactory injection: returned constructor IS used (identity proof)", async () => {
    // Spy: records what constructor args + pragma calls happen on the fake handle.
    const calls = { ctorArgs: null, pragmas: [] };
    class FakeDb {
      constructor(absPath, opts) { calls.ctorArgs = { absPath, opts }; }
      pragma(s) { calls.pragmas.push(s); return "ok"; }
      prepare() { return { all: () => [], get: () => ({ n: 0 }) }; }
      close() { /* noop */ }
    }
    const p = await makeDb(root, { rows: 1 });
    const out = await loadSqliteDB(p, { databaseFactory: FakeDb });
    expect(out.ok).toBe(true);
    expect(calls.ctorArgs.absPath).toBe(p);
    expect(calls.ctorArgs.opts).toEqual({ readonly: true, fileMustExist: true });
    // busy_timeout PRAGMA must be set right after open (defends against multi-chat WAL contention)
    expect(calls.pragmas).toContain("busy_timeout = 5000");
    out.db.close();
  });

  it("sqliteModule injection: { default: Ctor } shape works", async () => {
    let ctorCalls = 0;
    class FakeDb { constructor() { ctorCalls++; } pragma() {} close() {} prepare() { return { all: () => [], get: () => ({ n: 0 }) }; } }
    // Provide a synthetic module path that resolves to a value with .default
    const fakeModulePath = join(root, "fake-sqlite.mjs");
    writeFileSync(fakeModulePath, `export default class { constructor() {} pragma() {} close() {} prepare() { return { all: () => [], get: () => ({ n: 0 }) }; } };`, "utf8");
    const p = await makeDb(root, { rows: 0 });
    const out = await loadSqliteDB(p, { sqliteModule: fakeModulePath });
    expect(out.ok).toBe(true);
    out.db.close();
  });

  it("real-path import: absolute Windows path is converted to file:// URL (no ESM scheme error)", async () => {
    // Regression: prior to the pathToFileURL fix, `await import("H:/prism/...")`
    // failed at Node ESM's loader with "Only URLs with a scheme in: file, data,
    // and node are supported". Now the script auto-wraps absolute paths via
    // pathToFileURL when isAbsolute(mod) returns true.
    const p = await makeDb(root, { rows: 4 });
    const out = await loadSqliteDB(p, { sqliteModule: SQLITE_MODULE });
    expect(out.ok).toBe(true);
    // Real behavior: the loaded better-sqlite3 module IS usable — a real
    // PRAGMA + a real COUNT against the seeded fixture must return real values.
    expect(out.db.pragma("user_version")).toEqual([{ user_version: 0 }]);
    const r = out.db.prepare("SELECT COUNT(*) AS n FROM claims").get();
    expect(r.n).toBe(4);
    out.db.close();
  });

  it("busy_timeout=5000 PRAGMA is set after open (concurrent-WAL hardening)", async () => {
    const pragmasSeen = [];
    class FakeDb {
      constructor() {}
      pragma(s) { pragmasSeen.push(s); return "ok"; }
      prepare() { return { all: () => [], get: () => ({ n: 0 }) }; }
      close() {}
    }
    const p = await makeDb(root, { rows: 0 });
    await loadSqliteDB(p, { databaseFactory: FakeDb });
    expect(pragmasSeen).toEqual(["busy_timeout = 5000"]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// queryIntegrity + getDbCounts
// ──────────────────────────────────────────────────────────────────────

describe("queryIntegrity + getDbCounts", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("queryIntegrity reports 'ok' for both checks on a valid db", async () => {
    const p = await makeDb(root, { rows: 5 });
    const out = await loadSqliteDB(p, { sqliteModule: SQLITE_MODULE });
    expect(out.ok).toBe(true);
    const integ = queryIntegrity(out.db);
    expect(integ.integrity_check).toEqual(["ok"]);
    expect(integ.quick_check).toEqual(["ok"]);
    out.db.close();
  });

  it("getDbCounts returns row counts for all expected tables (haveSchema:true)", async () => {
    const p = await makeDb(root, { rows: 7 });
    const out = await loadSqliteDB(p, { sqliteModule: SQLITE_MODULE });
    const counts = getDbCounts(out.db);
    expect(counts.haveSchema).toBe(true);
    expect(counts.counts.claims.count).toBe(7);
    expect(counts.counts.claims.ok).toBe(true);
    expect(counts.counts.presence.count).toBe(0);
    expect(counts.counts.meta.count).toBe(1);
    out.db.close();
  });

  it("getDbCounts surfaces schema drift when a table is missing (haveSchema:false)", async () => {
    const p = await makeDb(root, { rows: 0, dropTables: ["presence"] });
    const out = await loadSqliteDB(p, { sqliteModule: SQLITE_MODULE });
    const counts = getDbCounts(out.db);
    expect(counts.haveSchema).toBe(false);
    expect(counts.counts.claims.ok).toBe(true);
    expect(counts.counts.presence.ok).toBe(false);
    expect(counts.counts.meta.ok).toBe(true);
    out.db.close();
  });
});

// ──────────────────────────────────────────────────────────────────────
// getJsonCounts
// ──────────────────────────────────────────────────────────────────────

describe("getJsonCounts", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("counts entries in {claims:{...}} schema", () => {
    const p = makeWorkClaims(root, 5);
    const out = getJsonCounts(p);
    expect(out.ok).toBe(true);
    expect(out.count).toBe(5);
    expect(out.schemaVersion).toBe(1);
  });

  it("treats empty/missing claims as 0 (post-migration valid state)", () => {
    const p = join(root, "state/shared/WORK_CLAIMS.json");
    writeFileSync(p, JSON.stringify({ schemaVersion: 1, updatedAt: "t" }), "utf8");
    const out = getJsonCounts(p);
    expect(out.ok).toBe(true);
    expect(out.count).toBe(0);
  });

  it("returns ok:false on missing file", () => {
    const out = getJsonCounts(join(root, "nope.json"));
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not found/);
  });

  it("returns ok:false on invalid JSON", () => {
    const p = join(root, "state/shared/WORK_CLAIMS.json");
    writeFileSync(p, "{not", "utf8");
    const out = getJsonCounts(p);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/parse failed/);
  });

  it("returns ok:false when root is not an object", () => {
    const p = join(root, "state/shared/WORK_CLAIMS.json");
    writeFileSync(p, "[]", "utf8");
    const out = getJsonCounts(p);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not an object/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// computeDivergence — pure math
// ──────────────────────────────────────────────────────────────────────

describe("computeDivergence", () => {
  it("0/0 returns 0% (no division by zero)", () => {
    expect(computeDivergence(0, 0)).toEqual({ dbCount: 0, jsonCount: 0, absDelta: 0, divergencePct: 0 });
  });

  it("equal counts return 0%", () => {
    expect(computeDivergence(100, 100).divergencePct).toBe(0);
  });

  it("|Δ|/max identity: 100 vs 110 → 10/110 ≈ 9.09%", () => {
    const r = computeDivergence(100, 110);
    expect(r.absDelta).toBe(10);
    expect(r.divergencePct).toBeCloseTo(9.0909, 3);
  });

  it("one side 0 returns 100%", () => {
    expect(computeDivergence(0, 5).divergencePct).toBe(100);
    expect(computeDivergence(5, 0).divergencePct).toBe(100);
  });

  it("non-finite inputs clamp to 0", () => {
    expect(computeDivergence(NaN, NaN)).toEqual({ dbCount: 0, jsonCount: 0, absDelta: 0, divergencePct: 0 });
    expect(computeDivergence(-5, 10)).toEqual({ dbCount: 0, jsonCount: 10, absDelta: 10, divergencePct: 100 });
  });
});

// ──────────────────────────────────────────────────────────────────────
// generateAlerts — pure
// ──────────────────────────────────────────────────────────────────────

describe("generateAlerts", () => {
  it("clean state → no alerts", () => {
    const alerts = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 0, dbCount: 5, jsonCount: 5, absDelta: 0 },
      jsonStatus: { ok: true },
      dbStatus: { ok: true },
    });
    expect(alerts).toEqual([]);
  });

  it("integrity_check non-ok → alert (severity:alert)", () => {
    const alerts = generateAlerts({
      integrity: { integrity_check: ["wrong row count for table foo"], quick_check: ["ok"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 0, dbCount: 5, jsonCount: 5, absDelta: 0 },
      jsonStatus: { ok: true },
      dbStatus: { ok: true },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("alert");
    expect(alerts[0].message).toMatch(/integrity_check FAILED/);
  });

  it("divergence >= 10% → alert with delta in message", () => {
    const alerts = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 15.5, dbCount: 100, jsonCount: 85, absDelta: 15 },
      jsonStatus: { ok: true },
      dbStatus: { ok: true },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("alert");
    expect(alerts[0].message).toMatch(/15.5%/);
    expect(alerts[0].message).toMatch(/db=100, json=85/);
  });

  it("divergence below threshold → no alert", () => {
    const alerts = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 8, dbCount: 100, jsonCount: 92, absDelta: 8 },
      jsonStatus: { ok: true },
      dbStatus: { ok: true },
    });
    expect(alerts).toEqual([]);
  });

  it("custom thresholdPct overrides default", () => {
    const alerts = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 5, dbCount: 100, jsonCount: 95, absDelta: 5 },
      jsonStatus: { ok: true },
      dbStatus: { ok: true },
      thresholdPct: 4,
    });
    expect(alerts).toHaveLength(1);
  });

  it("quick_check FAILED but integrity_check ok → still alerts (separate branches)", () => {
    const alerts = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["wrong page count for index foo_idx"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 0, dbCount: 5, jsonCount: 5, absDelta: 0 },
      jsonStatus: { ok: true },
      dbStatus: { ok: true },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("alert");
    expect(alerts[0].message).toMatch(/quick_check FAILED/);
    // integrity_check NOT in the message — they're separate branches
    expect(alerts[0].message).not.toMatch(/integrity_check FAILED/);
  });

  it("divergence boundary: 9.99% UNDER → no alert; 10.01% OVER → alert (>= semantics)", () => {
    const under = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 9.99, dbCount: 100, jsonCount: 90, absDelta: 10 },
      jsonStatus: { ok: true },
      dbStatus: { ok: true },
    });
    expect(under).toEqual([]);
    const over = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 10.01, dbCount: 100, jsonCount: 90, absDelta: 10 },
      jsonStatus: { ok: true },
      dbStatus: { ok: true },
    });
    expect(over).toHaveLength(1);
  });

  it("schema drift → alert listing missing tables", () => {
    const alerts = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
      dbCounts: { haveSchema: false, counts: { claims: { ok: true }, presence: { ok: false }, meta: { ok: false } } },
      divergence: { divergencePct: 0, dbCount: 0, jsonCount: 0, absDelta: 0 },
      jsonStatus: { ok: true },
      dbStatus: { ok: true },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toMatch(/schema drift/);
    expect(alerts[0].message).toMatch(/presence/);
    expect(alerts[0].message).toMatch(/meta/);
  });

  it("WORK_CLAIMS unreadable → warn (retirement candidate)", () => {
    const alerts = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 0, dbCount: 5, jsonCount: 0, absDelta: 0 },
      jsonStatus: { ok: false, reason: "WORK_CLAIMS not found" },
      dbStatus: { ok: true },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("warn");
    expect(alerts[0].message).toMatch(/retirement candidate/);
  });

  it("db unreadable short-circuits other checks (only the db alert fires)", () => {
    const alerts = generateAlerts({
      integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
      dbCounts: { haveSchema: true, counts: {} },
      divergence: { divergencePct: 50, dbCount: 0, jsonCount: 100, absDelta: 100 },
      jsonStatus: { ok: false, reason: "missing" },
      dbStatus: { ok: false, reason: "db not found" },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toMatch(/coordination.db unreadable/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// buildHealthReport — full integration
// ──────────────────────────────────────────────────────────────────────

describe("buildHealthReport (integration)", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("happy: in-sync 5/5 → ok:true, divergence=0, no alerts", async () => {
    await makeDb(root, { rows: 5 });
    makeWorkClaims(root, 5);
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    expect(r.divergence.divergencePct).toBe(0);
    expect(r.alerts).toEqual([]);
    expect(r.db.counts.claims.count).toBe(5);
    expect(r.json.count).toBe(5);
    expect(r.retirement_candidate).toBe(false);
  });

  it("failure: db missing → ok:false with empty shape preserved", async () => {
    makeWorkClaims(root, 5);
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^db:/);
    expect(r.schemaVersion).toBe(1);
    expect(r.divergence).toEqual({ dbCount: 0, jsonCount: 0, absDelta: 0, divergencePct: 0 });
    // The json was readable so should be reflected
    expect(r.json.ok).toBe(true);
    expect(r.json.count).toBe(5);
    expect(r.alerts.some((a) => /coordination.db unreadable/.test(a.message))).toBe(true);
  });

  it("failure: db zero-bytes → ok:false (corruption signal)", async () => {
    writeFileSync(join(root, "state/shared/coordination.db"), "", "utf8");
    makeWorkClaims(root, 0);
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/zero-bytes/);
  });

  it("failure: divergence at exactly 10% triggers ALERT", async () => {
    await makeDb(root, { rows: 100 });
    makeWorkClaims(root, 90); // 10/100 = 10% exactly
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    expect(r.divergence.divergencePct).toBe(10);
    expect(r.alerts.some((a) => a.severity === "alert" && /divergence/.test(a.message))).toBe(true);
  });

  it("retirement candidate: db has rows, json count=0, integrity ok → true", async () => {
    await makeDb(root, { rows: 3 });
    makeWorkClaims(root, 0);
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    expect(r.retirement_candidate).toBe(true);
  });

  it("NOT retirement candidate when db is also empty (nothing migrated yet)", async () => {
    await makeDb(root, { rows: 0 });
    makeWorkClaims(root, 0);
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    expect(r.retirement_candidate).toBe(false);
  });

  it("schema drift in db (missing presence table) surfaces as alert", async () => {
    await makeDb(root, { rows: 0, dropTables: ["presence"] });
    makeWorkClaims(root, 0);
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    expect(r.db.haveSchema).toBe(false);
    expect(r.alerts.some((a) => /schema drift/.test(a.message))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Adversarial + spanning
// ──────────────────────────────────────────────────────────────────────

describe("adversarial + spanning configs", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("adversarial: WORK_CLAIMS missing entirely → still produces a report (warn, retirement candidate)", async () => {
    await makeDb(root, { rows: 5 });
    // do NOT create WORK_CLAIMS.json
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    expect(r.json.ok).toBe(false);
    expect(r.alerts.some((a) => a.severity === "warn")).toBe(true);
    expect(r.retirement_candidate).toBe(true);
  });

  it("adversarial: WORK_CLAIMS with claims:'not-an-object' → treated as 0 (defensive)", async () => {
    await makeDb(root, { rows: 3 });
    writeFileSync(join(root, "state/shared/WORK_CLAIMS.json"), JSON.stringify({ claims: "scalar" }), "utf8");
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    expect(r.json.count).toBe(0);
    expect(r.divergence.divergencePct).toBe(100); // 3 vs 0 → max divergence
  });

  it("spanning: 1/1 in-sync (smallest non-zero scale)", async () => {
    await makeDb(root, { rows: 1 });
    makeWorkClaims(root, 1);
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.divergence.divergencePct).toBe(0);
    expect(r.alerts).toEqual([]);
  });

  it("spanning: 100/108 (8% divergence — UNDER threshold, no alert)", async () => {
    await makeDb(root, { rows: 100 });
    makeWorkClaims(root, 108);
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    // 8/108 = 7.41% — under 10
    expect(r.divergence.divergencePct).toBeLessThan(10);
    expect(r.alerts.filter((a) => /divergence/.test(a.message))).toEqual([]);
  });

  it("spanning: 50/100 (massive — 50% divergence)", async () => {
    await makeDb(root, { rows: 50 });
    makeWorkClaims(root, 100);
    const r = await buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE });
    expect(r.divergence.divergencePct).toBe(50);
    expect(r.alerts.some((a) => a.severity === "alert" && /divergence/.test(a.message))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("renders a healthy report (no alerts, retirement candidate banner if applicable)", () => {
    const md = renderMarkdown({
      ok: true,
      generated_at: "t",
      db_path: "/db",
      json_path: "/json",
      db: {
        ok: true,
        bytes: 32768,
        mtime: "t",
        integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
        counts: { claims: { ok: true, count: 5 }, presence: { ok: true, count: 0 }, meta: { ok: true, count: 1 } },
        haveSchema: true,
      },
      json: { ok: true, count: 5, schemaVersion: 1, updatedAt: "t" },
      divergence: { dbCount: 5, jsonCount: 5, absDelta: 0, divergencePct: 0 },
      alerts: [],
      retirement_candidate: false,
    });
    expect(md).toContain("# Coordination Store Health");
    expect(md).toContain("`PRAGMA integrity_check`: ok");
    expect(md).toContain("| claims | 5 | ✓ |");
    expect(md).toContain("Divergence %   : 0.00%");
    expect(md).toContain("_None — coordination state is healthy._");
    expect(md).not.toContain("Retirement candidate");
  });

  it("renders an error banner on ok:false with included alerts", () => {
    const md = renderMarkdown({
      ok: false,
      reason: "db: not found",
      generated_at: "t",
      alerts: [{ severity: "alert", message: "coordination.db unreadable: db not found" }],
    });
    expect(md).toContain("**ERROR:**");
    expect(md).toContain("- **ALERT** — coordination.db unreadable");
  });

  it("renders the retirement-candidate banner when set", () => {
    const md = renderMarkdown({
      ok: true,
      generated_at: "t",
      db_path: "/db",
      json_path: "/json",
      db: {
        ok: true,
        bytes: 32768,
        mtime: "t",
        integrity: { integrity_check: ["ok"], quick_check: ["ok"] },
        counts: { claims: { ok: true, count: 3 }, presence: { ok: true, count: 0 }, meta: { ok: true, count: 1 } },
        haveSchema: true,
      },
      json: { ok: true, count: 0, schemaVersion: 1, updatedAt: "t" },
      divergence: { dbCount: 3, jsonCount: 0, absDelta: 3, divergencePct: 100 },
      alerts: [],
      retirement_candidate: true,
    });
    expect(md).toContain("Retirement candidate");
    expect(md).toContain("WORK_CLAIMS.json can be safely deleted");
  });
});

// ──────────────────────────────────────────────────────────────────────
// runCli — round-trip
// ──────────────────────────────────────────────────────────────────────

describe("runCli (round-trip)", () => {
  let root;
  let stdoutBuf;
  let origStdout;

  beforeEach(() => {
    root = makeRepo();
    stdoutBuf = [];
    origStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { stdoutBuf.push(String(s)); return true; };
  });

  afterEach(() => {
    process.stdout.write = origStdout;
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it("--json mode emits to stdout, writes ZERO files in state/shared", async () => {
    await makeDb(root, { rows: 2 });
    makeWorkClaims(root, 2);
    const r = await runCli(["node", "x.mjs", "--json", "--frozen-time", "t"], { repo: root, sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    expect(JSON.parse(stdoutBuf.join("").trim()).ok).toBe(true);
    const sharedFiles = readdirSync(join(root, "state/shared"));
    const reportFiles = sharedFiles.filter((nm) => nm.startsWith("COORD_DB_HEALTH"));
    expect(reportFiles).toEqual([]);
  });

  it("default mode writes both report files atomically + summary", async () => {
    await makeDb(root, { rows: 4 });
    makeWorkClaims(root, 4);
    const r = await runCli(["node", "x.mjs", "--frozen-time", "t"], { repo: root, sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    expect(existsSync(join(root, "state/shared/COORD_DB_HEALTH.json"))).toBe(true);
    expect(existsSync(join(root, "state/shared/COORD_DB_HEALTH.md"))).toBe(true);
    expect(stdoutBuf.join("")).toMatch(/coord-db-sentinel: integrity=ok db.claims=4/);
    const residue = readdirSync(join(root, "state/shared")).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });

  it("missing db produces a failure report (not throw)", async () => {
    makeWorkClaims(root, 0);
    const r = await runCli(["node", "x.mjs", "--frozen-time", "t"], { repo: root, sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^db:/);
    expect(stdoutBuf.join("")).toMatch(/not ok/);
  });

  it("idempotency: same input twice → byte-identical markdown output", async () => {
    await makeDb(root, { rows: 3 });
    makeWorkClaims(root, 3);
    await runCli(["node", "x.mjs", "--frozen-time", "frozen-t"], { repo: root, sqliteModule: SQLITE_MODULE });
    const md1 = readFileSync(join(root, "state/shared/COORD_DB_HEALTH.md"), "utf8");
    await runCli(["node", "x.mjs", "--frozen-time", "frozen-t"], { repo: root, sqliteModule: SQLITE_MODULE });
    const md2 = readFileSync(join(root, "state/shared/COORD_DB_HEALTH.md"), "utf8");
    // The DB mtime field will differ if we recreated the file; since we don't, mtime is stable.
    // What may differ is the report's `db.mtime` — which IS the mtime, so same input → same output here.
    expect(md1).toBe(md2);
  });
});

// ──────────────────────────────────────────────────────────────────────
// writeAtomic
// ──────────────────────────────────────────────────────────────────────

describe("writeAtomic", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("creates parent directories if missing", () => {
    const target = join(root, "deep/nested/path/health.json");
    writeAtomic(target, "{\"ok\":true}\n");
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(target, "utf8")).toBe("{\"ok\":true}\n");
  });

  it("100 rapid writes never collide (PID+ts+random suffix)", () => {
    const target = join(root, "state/shared/HEALTH.md");
    for (let i = 0; i < 100; i++) writeAtomic(target, `iter-${i}`);
    expect(readFileSync(target, "utf8")).toBe("iter-99");
    const residue = readdirSync(join(root, "state/shared")).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });

  it("stale .tmp residue from a prior crashed run is NOT touched by --json mode", async () => {
    // Pre-seed a stale .tmp file simulating a crashed earlier run.
    const stale = join(root, "state/shared/COORD_DB_HEALTH.md.tmp-99999-1700000000000-deadbe");
    writeFileSync(stale, "stale crashed content", "utf8");
    await makeDb(root, { rows: 0 });
    makeWorkClaims(root, 0);
    const r = await runCli(["node", "x.mjs", "--json", "--frozen-time", "t"], { repo: root, sqliteModule: SQLITE_MODULE });
    expect(r.ok).toBe(true);
    // --json must not have touched the stale file (it doesn't write reports at all)
    expect(existsSync(stale)).toBe(true);
    expect(readFileSync(stale, "utf8")).toBe("stale crashed content");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Concurrency — two simultaneous reports against the same db
// ──────────────────────────────────────────────────────────────────────

describe("concurrent runs", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("two simultaneous buildHealthReport calls against same db both succeed (read-only + busy_timeout)", async () => {
    await makeDb(root, { rows: 5 });
    makeWorkClaims(root, 5);
    const [a, b] = await Promise.all([
      buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE }),
      buildHealthReport({ repo: root, frozenTime: "t", sqliteModule: SQLITE_MODULE }),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.divergence.divergencePct).toBe(0);
    expect(b.divergence.divergencePct).toBe(0);
    // Both must see identical row counts (no race read mid-construction)
    expect(a.db.counts.claims.count).toBe(b.db.counts.claims.count);
  });
});
