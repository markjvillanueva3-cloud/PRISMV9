// system-viz-graph-search.test.mjs — U-P2-GRAPH-SEARCH-MASTERINDEX tests (node:test)
//
// Coverage:
//   • buildSearchPayload — query validation (missing, empty, too-long), limit clamping,
//     layer filter with KNOWN_LAYERS allowlist (drop unknowns), source/buildClasses dedup,
//     utilization/confidence floor clamping, optional-field omission, contract pinning
//   • Dispatcher source-contract regression guards — frozen against sessionDispatcher.ts:1338
//   • NaN-coercion (NaN/undefined inputs fall back to defaults, don't bypass clamp)
//   • parseArgs CSV parsing + each flag
//   • Atomic write

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import {
  buildSearchPayload,
  writePayload,
  parseArgs,
  SEARCH_DISPATCHER,
  SEARCH_ACTION,
  SEARCH_SOURCE_CONTRACT,
  DEFAULT_LIMIT,
  MIN_QUERY_LEN,
  MAX_QUERY_LEN,
  MIN_LIMIT,
  MAX_LIMIT,
  KNOWN_LAYERS,
} from "./system-viz-graph-search.mjs";

const FROZEN_ISO = "2026-05-17T18:30:00.000Z";
const FROZEN_MS = Date.parse(FROZEN_ISO);

// ─── Query validation ──────────────────────────────────────────────────────
describe("buildSearchPayload — query validation", () => {
  it("missing query → ok:false MISSING_QUERY", () => {
    const out = buildSearchPayload({ now: FROZEN_MS });
    assert.equal(out.ok, false);
    assert.equal(out.error, "MISSING_QUERY");
  });

  it("non-string query → ok:false MISSING_QUERY", () => {
    const out = buildSearchPayload({ query: 42, now: FROZEN_MS });
    assert.equal(out.ok, false);
    assert.equal(out.error, "MISSING_QUERY");
  });

  it("empty string after trim → ok:false EMPTY_QUERY", () => {
    const out = buildSearchPayload({ query: "   \t\n  ", now: FROZEN_MS });
    assert.equal(out.ok, false);
    assert.equal(out.error, "EMPTY_QUERY");
  });

  it("query too long → ok:false QUERY_TOO_LONG", () => {
    const longQuery = "x".repeat(MAX_QUERY_LEN + 1);
    const out = buildSearchPayload({ query: longQuery, now: FROZEN_MS });
    assert.equal(out.ok, false);
    assert.equal(out.error, "QUERY_TOO_LONG");
  });

  it("query exactly MAX_QUERY_LEN → ok:true (boundary)", () => {
    const out = buildSearchPayload({
      query: "x".repeat(MAX_QUERY_LEN),
      now: FROZEN_MS,
    });
    assert.equal(out.ok, true);
  });

  it("query trimmed before length check", () => {
    const out = buildSearchPayload({ query: "  hello  ", now: FROZEN_MS });
    assert.equal(out.ok, true);
    assert.equal(out.params.query, "hello");
    assert.equal(out.advisory.queryOriginalLength, 9);
    assert.equal(out.advisory.queryTrimmedLength, 5);
  });
});

// ─── Dispatcher contract pinning ───────────────────────────────────────────
describe("buildSearchPayload — dispatcher contract", () => {
  it("REGRESSION: dispatcher MUST be 'prism_session' (frozen)", () => {
    const out = buildSearchPayload({ query: "foo", now: FROZEN_MS });
    assert.equal(out.dispatcher, SEARCH_DISPATCHER);
    assert.equal(out.dispatcher, "prism_session");
  });

  it("REGRESSION: action MUST be 'master_index_query' (frozen)", () => {
    const out = buildSearchPayload({ query: "foo", now: FROZEN_MS });
    assert.equal(out.action, SEARCH_ACTION);
    assert.equal(out.action, "master_index_query");
  });

  it("REGRESSION: params.query is REQUIRED non-empty string", () => {
    const out = buildSearchPayload({ query: "foo", now: FROZEN_MS });
    assert.equal(typeof out.params.query, "string");
    assert.equal(out.params.query, "foo");
  });

  it("REGRESSION: params.limit always emitted (default fallback)", () => {
    const out = buildSearchPayload({ query: "foo", now: FROZEN_MS });
    assert.equal(out.params.limit, DEFAULT_LIMIT);
  });

  it("REGRESSION: optional params (layers, sources, etc.) ABSENT when caller omits", () => {
    const out = buildSearchPayload({ query: "foo", now: FROZEN_MS });
    assert.equal("layers" in out.params, false);
    assert.equal("sources" in out.params, false);
    assert.equal("build_classes" in out.params, false);
    assert.equal("min_utilization" in out.params, false);
    assert.equal("min_confidence" in out.params, false);
  });

  it("REGRESSION: params field names are snake_case (build_classes, min_utilization, min_confidence)", () => {
    const out = buildSearchPayload({
      query: "foo",
      buildClasses: ["lib"],
      minUtilization: 0.5,
      minConfidence: 0.7,
      now: FROZEN_MS,
    });
    // Resolver accepts camelCase in JS API but emits snake_case in params
    // (dispatcher reads params.build_classes, params.min_utilization, etc.)
    assert.ok("build_classes" in out.params);
    assert.ok("min_utilization" in out.params);
    assert.ok("min_confidence" in out.params);
    // Camel-case forms should NOT appear in emitted params
    assert.equal("buildClasses" in out.params, false);
    assert.equal("minUtilization" in out.params, false);
    assert.equal("minConfidence" in out.params, false);
  });

  it("REGRESSION: sourceContract pins sessionDispatcher.ts line + engine call", () => {
    const out = buildSearchPayload({ query: "foo", now: FROZEN_MS });
    assert.equal(out.sourceContract, SEARCH_SOURCE_CONTRACT);
    assert.match(out.sourceContract, /sessionDispatcher\.ts:1338/);
    assert.match(out.sourceContract, /masterIndexEngine\.query/);
  });
});

// ─── Limit clamping (incl. NaN regression) ─────────────────────────────────
describe("buildSearchPayload — limit clamping", () => {
  it("limit too small clamped to MIN_LIMIT", () => {
    const out = buildSearchPayload({ query: "foo", limit: -5, now: FROZEN_MS });
    assert.equal(out.params.limit, MIN_LIMIT);
  });

  it("limit too large clamped to MAX_LIMIT", () => {
    const out = buildSearchPayload({ query: "foo", limit: 99999, now: FROZEN_MS });
    assert.equal(out.params.limit, MAX_LIMIT);
  });

  it("REGRESSION (NaN-clamp): limit=NaN falls back to DEFAULT_LIMIT (not bypassed)", () => {
    const out = buildSearchPayload({ query: "foo", limit: NaN, now: FROZEN_MS });
    assert.equal(out.params.limit, DEFAULT_LIMIT);
  });

  it("REGRESSION (NaN-clamp): limit=undefined falls back to DEFAULT_LIMIT", () => {
    const out = buildSearchPayload({ query: "foo", limit: undefined, now: FROZEN_MS });
    assert.equal(out.params.limit, DEFAULT_LIMIT);
  });

  it("limit at exact MAX_LIMIT boundary", () => {
    const out = buildSearchPayload({ query: "foo", limit: MAX_LIMIT, now: FROZEN_MS });
    assert.equal(out.params.limit, MAX_LIMIT);
  });
});

// ─── Layer filter ───────────────────────────────────────────────────────────
describe("buildSearchPayload — layer filter", () => {
  it("known layers preserved", () => {
    const out = buildSearchPayload({
      query: "foo",
      layers: ["L0", "L4a", "Lgit"],
      now: FROZEN_MS,
    });
    assert.deepEqual(out.params.layers, ["L0", "L4a", "Lgit"]);
    assert.deepEqual(out.advisory.droppedLayers, []);
  });

  it("unknown layers dropped + surfaced in advisory", () => {
    const out = buildSearchPayload({
      query: "foo",
      layers: ["L0", "L99", "BAD"],
      now: FROZEN_MS,
    });
    assert.deepEqual(out.params.layers, ["L0"]);
    assert.deepEqual(out.advisory.droppedLayers.sort(), ["BAD", "L99"]);
  });

  it("all-unknown layers → no params.layers key + all in droppedLayers", () => {
    const out = buildSearchPayload({
      query: "foo",
      layers: ["XX", "YY"],
      now: FROZEN_MS,
    });
    assert.equal("layers" in out.params, false);
    assert.equal(out.advisory.droppedLayers.length, 2);
  });

  it("non-string entries dropped silently into advisory (no throw)", () => {
    const out = buildSearchPayload({
      query: "foo",
      layers: ["L0", 42, null, "L1"],
      now: FROZEN_MS,
    });
    assert.deepEqual(out.params.layers, ["L0", "L1"]);
    // Non-strings show up in droppedLayers as String() coerced.
    assert.ok(out.advisory.droppedLayers.length >= 2);
  });

  it("duplicates in layers dedup'd", () => {
    const out = buildSearchPayload({
      query: "foo",
      layers: ["L0", "L0", "L1", "L1", "L0"],
      now: FROZEN_MS,
    });
    assert.deepEqual(out.params.layers, ["L0", "L1"]);
  });

  it("REGRESSION: KNOWN_LAYERS includes L0..L13 + L4a + Lgit", () => {
    assert.ok(KNOWN_LAYERS.includes("L0"));
    assert.ok(KNOWN_LAYERS.includes("L13"));
    assert.ok(KNOWN_LAYERS.includes("L4a"));
    assert.ok(KNOWN_LAYERS.includes("Lgit"));
  });
});

// ─── sources + buildClasses dedup ──────────────────────────────────────────
describe("buildSearchPayload — sources + buildClasses", () => {
  it("sources dedup'd + non-strings filtered", () => {
    const out = buildSearchPayload({
      query: "foo",
      sources: ["a", "b", "a", 42, null, "c"],
      now: FROZEN_MS,
    });
    assert.deepEqual(out.params.sources, ["a", "b", "c"]);
  });

  it("buildClasses dedup'd", () => {
    const out = buildSearchPayload({
      query: "foo",
      buildClasses: ["lib", "lib", "exe"],
      now: FROZEN_MS,
    });
    assert.deepEqual(out.params.build_classes, ["lib", "exe"]);
  });

  it("empty array after filter → param key absent", () => {
    const out = buildSearchPayload({
      query: "foo",
      sources: [42, null],
      now: FROZEN_MS,
    });
    assert.equal("sources" in out.params, false);
  });
});

// ─── Utilization / confidence floor clamping ───────────────────────────────
describe("buildSearchPayload — utilization/confidence floors", () => {
  it("minUtilization clamped to [0, 1]", () => {
    const a = buildSearchPayload({ query: "foo", minUtilization: -0.5, now: FROZEN_MS });
    assert.equal(a.params.min_utilization, 0);

    const b = buildSearchPayload({ query: "foo", minUtilization: 1.5, now: FROZEN_MS });
    assert.equal(b.params.min_utilization, 1);

    const c = buildSearchPayload({ query: "foo", minUtilization: 0.5, now: FROZEN_MS });
    assert.equal(c.params.min_utilization, 0.5);
  });

  it("minConfidence clamped to [0, 1]", () => {
    const out = buildSearchPayload({ query: "foo", minConfidence: 2, now: FROZEN_MS });
    assert.equal(out.params.min_confidence, 1);
  });

  it("REGRESSION: NaN minUtilization → param absent (not bypassed via Math.min)", () => {
    const out = buildSearchPayload({ query: "foo", minUtilization: NaN, now: FROZEN_MS });
    assert.equal("min_utilization" in out.params, false);
  });

  it("REGRESSION (arm B P2 — Number(null)===0 bug): explicit null minUtilization → param absent", () => {
    // Self-caught during build: `Number(null)===0` silently emitted min_utilization:0.
    // Fix: explicit null/undefined gate BEFORE Number() coercion. Pin permanently.
    const out = buildSearchPayload({ query: "foo", minUtilization: null, now: FROZEN_MS });
    assert.equal("min_utilization" in out.params, false);
  });

  it("REGRESSION (arm B P2): explicit null minConfidence → param absent", () => {
    const out = buildSearchPayload({ query: "foo", minConfidence: null, now: FROZEN_MS });
    assert.equal("min_confidence" in out.params, false);
  });

  it("REGRESSION: string minUtilization coerced via Number() — '0.5' works", () => {
    const out = buildSearchPayload({ query: "foo", minUtilization: "0.5", now: FROZEN_MS });
    assert.equal(out.params.min_utilization, 0.5);
  });
});

// ─── parseArgs ─────────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs(["node", "x"]);
    assert.equal(a.query, null);
    assert.equal(a.limit, DEFAULT_LIMIT);
    assert.equal(a.help, false);
  });

  it("--query / --limit / --layers / --sources / --build-classes", () => {
    const a = parseArgs([
      "node",
      "x",
      "--query",
      "engine wear",
      "--limit",
      "10",
      "--layers",
      "L0,L4a,Lgit",
      "--sources",
      "wiki,master",
      "--build-classes",
      "lib,exe",
    ]);
    assert.equal(a.query, "engine wear");
    assert.equal(a.limit, 10);
    assert.deepEqual(a.layers, ["L0", "L4a", "Lgit"]);
    assert.deepEqual(a.sources, ["wiki", "master"]);
    assert.deepEqual(a.buildClasses, ["lib", "exe"]);
  });

  it("--min-utilization / --min-confidence / --out / --frozen-time", () => {
    const a = parseArgs([
      "node",
      "x",
      "--min-utilization",
      "0.3",
      "--min-confidence",
      "0.7",
      "--out",
      "/tmp/p.json",
      "--frozen-time",
      FROZEN_ISO,
    ]);
    assert.equal(a.minUtilization, 0.3);
    assert.equal(a.minConfidence, 0.7);
    assert.equal(a.outPath, "/tmp/p.json");
    assert.equal(a.frozenTime, FROZEN_ISO);
  });

  it("empty CSV value yields empty array (filtered before resolver)", () => {
    const a = parseArgs(["node", "x", "--layers", ""]);
    assert.deepEqual(a.layers, []);
  });

  it("--help / -h", () => {
    assert.equal(parseArgs(["node", "x", "--help"]).help, true);
    assert.equal(parseArgs(["node", "x", "-h"]).help, true);
  });
});

// ─── I/O ───────────────────────────────────────────────────────────────────
describe("writePayload", () => {
  it("creates parent dir + writes pretty JSON with trailing newline (atomic)", () => {
    const tmp = path.join(os.tmpdir(), `gs-${Date.now()}`, "deep", "p.json");
    try {
      const payload = { schemaVersion: 1, ok: true };
      writePayload(tmp, payload);
      const txt = fs.readFileSync(tmp, "utf8");
      assert.ok(txt.endsWith("\n"));
      assert.deepEqual(JSON.parse(txt), payload);
      const leftover = fs.readdirSync(path.dirname(tmp)).filter((f) =>
        f.startsWith("p.json.tmp-"),
      );
      assert.equal(leftover.length, 0);
    } finally {
      try {
        fs.rmSync(path.dirname(path.dirname(tmp)), { recursive: true, force: true });
      } catch {}
    }
  });
});

// ─── Live-source contract regression (arm B doctrine) ──────────────────────
describe("dispatcher source contract — frozen against sessionDispatcher.ts:1338", () => {
  it("REGRESSION: sessionDispatcher.ts MUST contain 'case \"master_index_query\"' handler", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const REPO_ROOT = path.resolve(__dirname, "..");
    const src = fs.readFileSync(
      path.join(REPO_ROOT, "mcp-server/src/tools/dispatchers/sessionDispatcher.ts"),
      "utf8",
    );
    assert.match(src, /case ['"]master_index_query['"]:/);
  });

  it("REGRESSION (arm B P2 tight regex): handler MUST reference params.query within 400 chars of master_index_query case (catches silent rename)", () => {
    // Loose regex `params\.query ?? params\.q` catches semantic reorder but
    // NOT a rename to `params.searchQuery`. Narrow-window assert forces ANY
    // rename of the read site to fire this gate.
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const REPO_ROOT = path.resolve(__dirname, "..");
    const src = fs.readFileSync(
      path.join(REPO_ROOT, "mcp-server/src/tools/dispatchers/sessionDispatcher.ts"),
      "utf8",
    );
    assert.match(src, /master_index_query[\s\S]{0,400}params\.query/);
  });

  it("REGRESSION: dispatcher handler reads params.query ?? params.q (no field rename)", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const REPO_ROOT = path.resolve(__dirname, "..");
    const src = fs.readFileSync(
      path.join(REPO_ROOT, "mcp-server/src/tools/dispatchers/sessionDispatcher.ts"),
      "utf8",
    );
    // Pin the exact line 1340 contract — `String(params.query ?? params.q ?? "")`
    assert.match(src, /params\.query\s*\?\?\s*params\.q/);
  });

  it("REGRESSION: dispatcher accepts snake_case build_classes / min_utilization / min_confidence", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const REPO_ROOT = path.resolve(__dirname, "..");
    const src = fs.readFileSync(
      path.join(REPO_ROOT, "mcp-server/src/tools/dispatchers/sessionDispatcher.ts"),
      "utf8",
    );
    // These are the EXACT field names the dispatcher reads (lines 1342-1347).
    assert.match(src, /params\.build_classes/);
    assert.match(src, /params\.min_utilization/);
    assert.match(src, /params\.min_confidence/);
  });
});
