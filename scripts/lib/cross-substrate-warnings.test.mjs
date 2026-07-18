/**
 * cross-substrate-warnings.test.mjs -- SYSTEM-VIZ-HYGIENE / U-SVH-XSUB-R12
 * Real reference-value tests for the degradation-warning aggregator: happy path,
 * 3 failure modes (oracle-absent / source-absent / type-collapse), 2 adversarial
 * (null + garbage). Pure function -> no fixtures needed.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildDegradationWarnings } from "./cross-substrate-warnings.mjs";

const HEALTHY = {
  embedsEdges: 562,
  embed: {
    oracleLoaded: true,
    oracleNodeCount: 336000,
    sources: {
      "ghost.embedding_index.gnn768": { present: true, records: 600, confirmed: 540, skippedUnconfirmed: 60 },
      "ghost.embedding_index.ghosts768": { present: true, records: 50, confirmed: 22, skippedUnconfirmed: 28 },
    },
  },
};

describe("buildDegradationWarnings -- happy path", () => {
  it("clean run (oracle loaded, sources present, edges emitted) -> no warnings", () => {
    assert.deepEqual(buildDegradationWarnings(HEALTHY), []);
  });
});

describe("buildDegradationWarnings -- failure modes", () => {
  it("oracle ABSENT -> single oracle warning, and the per-source/collapse checks are skipped", () => {
    const w = buildDegradationWarnings({ embedsEdges: 0, embed: { oracleLoaded: false, oracleNodeCount: 0, sources: {} } });
    assert.equal(w.length, 1);
    assert.match(w[0], /offset oracle ABSENT/);
    assert.match(w[0], /build-card-offset-index/); // names the fix
  });

  it("oracle present but one source jsonl absent -> per-source warning", () => {
    const w = buildDegradationWarnings({
      embedsEdges: 540,
      embed: {
        oracleLoaded: true,
        oracleNodeCount: 336000,
        sources: {
          "ghost.embedding_index.gnn768": { present: true, records: 600, confirmed: 540 },
          "ghost.embedding_index.ghosts768": { present: false, records: 0, confirmed: 0 },
        },
      },
    });
    assert.equal(w.length, 1);
    assert.match(w[0], /source for ghost\.embedding_index\.ghosts768 absent/);
  });

  it("oracle + sources present but 0 edges confirmed -> collapse warning", () => {
    const w = buildDegradationWarnings({
      embedsEdges: 0,
      embed: {
        oracleLoaded: true,
        oracleNodeCount: 336000,
        sources: { "ghost.embedding_index.gnn768": { present: true, records: 600, confirmed: 0 } },
      },
    });
    assert.equal(w.length, 1);
    assert.match(w[0], /embeds type collapsed/);
  });

  it("multiple degradations stack (source absent + 0 edges)", () => {
    const w = buildDegradationWarnings({
      embedsEdges: 0,
      embed: {
        oracleLoaded: true,
        oracleNodeCount: 336000,
        sources: {
          "ghost.embedding_index.gnn768": { present: false },
          "ghost.embedding_index.ghosts768": { present: false },
        },
      },
    });
    assert.equal(w.length, 3); // 2 source-absent + 1 collapse
    assert.ok(w.some((x) => /collapsed/.test(x)));
    assert.equal(w.filter((x) => /absent/.test(x)).length, 2);
  });
});

describe("buildDegradationWarnings -- adversarial (total function, never throws)", () => {
  it("null / undefined -> []", () => {
    assert.deepEqual(buildDegradationWarnings(null), []);
    assert.deepEqual(buildDegradationWarnings(undefined), []);
  });
  it("garbage shapes -> [] (no throw)", () => {
    assert.deepEqual(buildDegradationWarnings("nope"), []);
    assert.deepEqual(buildDegradationWarnings(42), []);
    // stats present but embed missing -> treated as oracle-absent (the safe, loud default)
    const w = buildDegradationWarnings({ embedsEdges: 5 });
    assert.equal(w.length, 1);
    assert.match(w[0], /oracle ABSENT/);
  });
});
