// Tests for the rank-21 embeddings-sidecar staleness gate in memory-index-search-lib.mjs.
// Basis (corrected 2026-05-30): the gate fires when the embeddings sidecar FILE is OLDER than the
// BM25 index sidecar FILE — i.e. the dense arm lags the BM25 arm (recently-indexed memories are
// dense-unreachable). This replaced a vault-DIR-mtime basis that was hypersensitive (fired 47 s after
// a fully in-sync rebuild → cry-wolf). Hermetic: injected statImpl/existsImpl/readFileImpl + stderr
// capture, with a REAL packInt8 record so the decode path is exercised.

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  tryLoadEmbeddingsSidecar,
  tryHybridFuse,
  packInt8,
  EMBEDDINGS_SIDECAR_SCHEMA_VERSION,
} from "./memory-index-search-lib.mjs";

const { b64, norm } = packInt8([0.5, 0.4, 0.6, 0.5]);
const EMB = "/emb.json";
const BM25 = "/bm25.json";
const embSidecarJSON = JSON.stringify({
  schemaVersion: EMBEDDINGS_SIDECAR_SCHEMA_VERSION,
  dim: 4,
  model: "nomic-embed-text",
  records: [{ key: "reference/x", name: "x", fileName: "x.md", namespace: "reference", vec: b64, norm }],
});

function captureStderr(fn) {
  const captured = [];
  const orig = process.stderr.write;
  process.stderr.write = (s) => { captured.push(String(s)); return true; };
  try { return { res: fn(), advisory: captured.join("") }; }
  finally { process.stderr.write = orig; }
}

describe("tryLoadEmbeddingsSidecar — staleness gate (file-mtime: dense-lags-BM25)", () => {
  function load(embMtime, bm25Mtime, { bm25Exists = true, statThrows = false } = {}) {
    return captureStderr(() =>
      tryLoadEmbeddingsSidecar({
        sidecarPath: EMB,
        bm25SidecarPath: BM25,
        readFileImpl: () => embSidecarJSON,
        existsImpl: (p) => (p === BM25 ? bm25Exists : true),
        statImpl: (p) => {
          if (statThrows) throw new Error("EACCES");
          return { mtimeMs: p === EMB ? embMtime : bm25Mtime };
        },
      }),
    );
  }

  it("FRESH (embeddings file NEWER than BM25 index) → records returned, NO advisory", () => {
    const { res, advisory } = load(200, 100);
    assert.ok(res && res.records.length === 1, "records returned");
    assert.ok(!/older than the BM25 index/.test(advisory), "in-sync/newer dense arm → no cry-wolf");
  });

  it("STALE (embeddings file OLDER than BM25 index) → records ANYWAY (graceful) + advisory FIRES", () => {
    const { res, advisory } = load(100, 200);
    assert.ok(res && res.records.length === 1, "graceful — stale dense sidecar still used, not discarded");
    assert.match(advisory, /embeddings sidecar older than the BM25 index/, "true dense-lag surfaced");
    assert.match(advisory, /--resume/, "advisory points at the fix");
  });

  it("equal mtimes (rebuilt together) → NO advisory (the in-sync case that the old dir-mtime basis wrongly flagged)", () => {
    const { advisory } = load(150, 150);
    assert.ok(!/older than the BM25 index/.test(advisory), "embMtime < bm25Mtime is strict — equal is fresh");
  });

  it("BM25 sidecar absent → NO advisory (skip, no false alarm)", () => {
    const { res, advisory } = load(100, 200, { bm25Exists: false });
    assert.ok(res && res.records.length === 1);
    assert.ok(!/older than the BM25 index/.test(advisory), "no BM25 baseline → no staleness claim");
  });

  it("stat failure → NO advisory + records still returned (fail-safe)", () => {
    const { res, advisory } = load(100, 200, { statThrows: true });
    assert.ok(res && res.records.length === 1, "stat throw never breaks the load");
    assert.ok(!/older than the BM25 index/.test(advisory), "stat failure → no false alarm");
  });
});

// P1-fix regression guard (Reviewer A): the gate must run against the CALLER's BM25 sidecar path +
// statImpl threaded through tryHybridFuse, NOT the module defaults. DISCRIMINATING: assert the gate
// actually stat'd the caller's "/custom-bm25.json" (if unthreaded it would stat DEFAULT_SIDECAR_PATH).
// Drives the real runMemoryIndexSearch→tryHybridFuse→tryLoadEmbeddingsSidecar seam where the P1 lived.
describe("staleness gate threads the BM25 path through tryHybridFuse (P1 wiring guard)", () => {
  const CUSTOM_BM25 = "/custom-bm25.json";
  function fuse(embMtime, bm25Mtime) {
    const seenStatPaths = [];
    const r = captureStderr(() =>
      tryHybridFuse({
        query: "kienzle coefficient lookup table",
        bm25Ranked: [],
        byKey: new Map([["reference/x", { key: "reference/x", name: "x", fileName: "x.md", namespace: "reference" }]]),
        opts: {
          sidecarPath: CUSTOM_BM25, // the caller's BM25 sidecar path — must reach the gate
          embeddingsSidecarPath: EMB,
          existsImpl: () => true,
          statImpl: (p) => { seenStatPaths.push(p); return { mtimeMs: p === EMB ? embMtime : bm25Mtime }; },
          readFileImpl: () => embSidecarJSON,
          embedQueryImpl: () => [0.5, 0.4, 0.6, 0.5],
          now: 1_000_000,
        },
      }),
    );
    return { ...r, seenStatPaths };
  }

  it("gate stat's the CALLER's BM25 path (threaded, not the default)", () => {
    const { seenStatPaths } = fuse(200, 100);
    assert.ok(seenStatPaths.includes(CUSTOM_BM25), "threaded bm25SidecarPath reached the gate's statImpl");
  });

  it("dense older than BM25 via the caller's clock → advisory fires end-to-end through the seam", () => {
    const { advisory } = fuse(100, 200);
    assert.match(advisory, /embeddings sidecar older than the BM25 index/, "gate live through tryHybridFuse");
  });
});
