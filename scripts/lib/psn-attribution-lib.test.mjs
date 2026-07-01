#!/usr/bin/env node
// Tests for psn-attribution-lib.mjs (lever #2 verifiable core).
// Run: node --test scripts/lib/psn-attribution-lib.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  legForCitation,
  legsForCitations,
  recordLegConsult,
  sessionLegCoverage,
  aggregateLegCoverage,
  renderCoverage,
  PSN_LEGS,
  SCHEMA_VERSION,
  DEFAULT_LEDGER_PATH,
} from "./psn-attribution-lib.mjs";

const NOW = "2026-06-06T08:00:00.000Z";

// ---- legForCitation (pure mapping) -----------------------------------------

test("legForCitation: source_type → primary PSN leg", () => {
  assert.equal(legForCitation({ source_type: "wiki", path: "wiki.x" }), "wiki");
  assert.equal(legForCitation({ source_type: "memory", path: "feedback/x" }), "memories");
  assert.equal(legForCitation({ source_type: "tribal", path: "tribal-tip-1" }), "tribal");
  assert.equal(legForCitation({ source_type: "engine", path: "eng.mill" }), "engines");
  assert.equal(legForCitation({ source_type: "dispatcher", path: "disp.prism_calc" }), "prism_os");
});

test("legForCitation: external refined by node-id prefix", () => {
  assert.equal(legForCitation({ source_type: "external", path: "ghost.galaxy.wedm" }), "system_viz");
  assert.equal(legForCitation({ source_type: "external", path: "formula.kienzle" }), "formulas");
  assert.equal(legForCitation({ source_type: "external", path: "algo.sld" }), "algorithms");
  assert.equal(legForCitation({ source_type: "external", path: "nn-graph-node" }), "nn_gnn");
  assert.equal(legForCitation({ source_type: "external", path: "gnn.tier5" }), "nn_gnn");
  assert.equal(legForCitation({ source_type: "external", path: "fs.some.file" }), null); // genuinely unmapped
});

test("legForCitation: null/garbage → null, never throws", () => {
  assert.equal(legForCitation(null), null);
  assert.equal(legForCitation(undefined), null);
  assert.equal(legForCitation("nope"), null);
  assert.equal(legForCitation({}), null);
});

test("legsForCitations: dedup + canonical taxonomy order", () => {
  const cites = [
    { source_type: "engine", path: "eng.a" },
    { source_type: "wiki", path: "wiki.b" },
    { source_type: "engine", path: "eng.c" }, // dup leg
    { source_type: "memory", path: "feedback/d" },
    null,                                       // ignored
    { source_type: "bogus", path: "x" },        // → null, ignored
  ];
  // canonical order: wiki(3) < memories(4) < engines(7)
  assert.deepEqual(legsForCitations(cites), ["wiki", "memories", "engines"]);
  assert.deepEqual(legsForCitations([]), []);
  assert.deepEqual(legsForCitations(null), []);
});

// ---- recordLegConsult (fail-soft append) -----------------------------------

test("recordLegConsult: appends one record with schemaVersion + legs", () => {
  const writes = [];
  const rec = recordLegConsult({
    sessionId: "sess-1", surface: "master-index-precheck", now: NOW,
    citations: [{ source_type: "wiki", path: "wiki.x" }, { source_type: "tribal", path: "t1" }],
    ledgerPath: "/tmp/fake.jsonl",
    appendImpl: (p, line) => writes.push({ p, line }),
  });
  assert.equal(rec.schemaVersion, SCHEMA_VERSION);
  assert.equal(rec.sessionId, "sess-1");
  assert.equal(rec.surface, "master-index-precheck");
  assert.deepEqual(rec.legs, ["wiki", "tribal"]);
  assert.equal(rec.n, 2);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].p, "/tmp/fake.jsonl");
  assert.ok(writes[0].line.endsWith("\n"));
  assert.deepEqual(JSON.parse(writes[0].line.trim()).legs, ["wiki", "tribal"]);
});

test("recordLegConsult: pre-computed legs are sanitized to known legs + canonical order", () => {
  const writes = [];
  const rec = recordLegConsult({
    sessionId: "s", legs: ["engines", "BOGUS", "wiki"], now: NOW,
    ledgerPath: "/tmp/x", appendImpl: (p, l) => writes.push(l),
  });
  assert.deepEqual(rec.legs, ["wiki", "engines"]); // BOGUS dropped, canonical order
});

test("recordLegConsult: skips (returns null, no write) on empty legs / no session / disabled knob", () => {
  const writes = [];
  const cap = (p, l) => writes.push(l);
  assert.equal(recordLegConsult({ sessionId: "s", citations: [{ source_type: "bogus" }], appendImpl: cap }), null);
  assert.equal(recordLegConsult({ citations: [{ source_type: "wiki", path: "w" }], appendImpl: cap }), null); // no sessionId
  const prev = process.env.PRISM_PSN_ATTRIBUTION_DISABLE;
  process.env.PRISM_PSN_ATTRIBUTION_DISABLE = "1";
  try {
    assert.equal(recordLegConsult({ sessionId: "s", legs: ["wiki"], appendImpl: cap }), null);
  } finally {
    if (prev === undefined) delete process.env.PRISM_PSN_ATTRIBUTION_DISABLE;
    else process.env.PRISM_PSN_ATTRIBUTION_DISABLE = prev;
  }
  assert.equal(writes.length, 0); // none of the skip cases wrote
});

test("recordLegConsult: append error is swallowed (fail-soft, returns null)", () => {
  assert.doesNotThrow(() => {
    const r = recordLegConsult({
      sessionId: "s", legs: ["wiki"],
      existsImpl: () => false, // hermetic: rotation no-ops, never touches the real ledger
      appendImpl: () => { throw new Error("disk full"); },
    });
    assert.equal(r, null);
  });
});

// ---- ledger rotation (arm-C hardening) -------------------------------------

test("recordLegConsult: rotates the ledger one generation past the size cap", () => {
  const renames = [], writes = [];
  const rec = recordLegConsult({
    sessionId: "s", legs: ["wiki"], now: NOW, ledgerPath: "/tmp/led.jsonl",
    existsImpl: () => true,
    statImpl: () => ({ size: 99 * 1024 * 1024 }),       // far over the 5MB cap
    renameImpl: (from, to) => renames.push([from, to]),
    appendImpl: (p, l) => writes.push(l),
  });
  assert.ok(rec);                                        // append still happened
  assert.deepEqual(renames, [["/tmp/led.jsonl", "/tmp/led.jsonl.1"]]);
  assert.equal(writes.length, 1);
});

test("recordLegConsult: does NOT rotate below the cap", () => {
  const renames = [];
  recordLegConsult({
    sessionId: "s", legs: ["wiki"], ledgerPath: "/tmp/led.jsonl",
    existsImpl: () => true, statImpl: () => ({ size: 10 }),
    renameImpl: (f, t) => renames.push([f, t]), appendImpl: () => {},
  });
  assert.equal(renames.length, 0);
});

test("recordLegConsult: rotation error is swallowed; append still proceeds", () => {
  const writes = [];
  let rec;
  assert.doesNotThrow(() => {
    rec = recordLegConsult({
      sessionId: "s", legs: ["wiki"], ledgerPath: "/tmp/led.jsonl",
      existsImpl: () => true, statImpl: () => ({ size: 99 * 1024 * 1024 }),
      renameImpl: () => { throw new Error("rename fail"); },
      appendImpl: (p, l) => writes.push(l),
    });
  });
  assert.ok(rec);                  // append survived a failed rotation
  assert.equal(writes.length, 1);
});

// ---- sessionLegCoverage (fail-soft read) -----------------------------------

test("sessionLegCoverage: computes N/11 + byLeg counts, filters by session, canonical order", () => {
  const ledger = [
    JSON.stringify({ schemaVersion: "1.0.0", sessionId: "A", legs: ["wiki", "engines"] }),
    JSON.stringify({ schemaVersion: "1.0.0", sessionId: "A", legs: ["wiki", "tribal"] }),
    JSON.stringify({ schemaVersion: "1.0.0", sessionId: "B", legs: ["memories"] }), // other session
    "TORN GARBAGE LINE {",                                                          // skipped
    "",                                                                             // skipped
  ].join("\n");
  const cov = sessionLegCoverage("A", {
    ledgerPath: "/tmp/x", existsImpl: () => true, readImpl: () => ledger,
  });
  assert.equal(cov.coverage, 3);
  assert.equal(cov.total, 11);
  assert.deepEqual(cov.legsConsulted, ["wiki", "tribal", "engines"]); // canonical order
  assert.equal(cov.byLeg.wiki, 2);
  assert.equal(cov.byLeg.tribal, 1);
  assert.equal(cov.byLeg.engines, 1);
  assert.equal(cov.records, 2); // only session A's 2 valid records
});

test("sessionLegCoverage: missing ledger / no session → zero coverage, never throws", () => {
  assert.deepEqual(
    sessionLegCoverage("A", { ledgerPath: "/tmp/x", existsImpl: () => false }),
    { sessionId: "A", coverage: 0, total: 11, legsConsulted: [], byLeg: {}, records: 0 },
  );
  assert.equal(sessionLegCoverage("").coverage, 0);
  assert.doesNotThrow(() => sessionLegCoverage("A", { existsImpl: () => true, readImpl: () => { throw new Error("io"); } }));
});

test("aggregateLegCoverage: fleet-wide counts across all sessions, distinct session tally", () => {
  const ledger = [
    JSON.stringify({ sessionId: "A", legs: ["wiki", "engines"] }),
    JSON.stringify({ sessionId: "A", legs: ["wiki", "tribal"] }),
    JSON.stringify({ sessionId: "B", legs: ["memories"] }),
    "TORN {",                                  // skipped
  ].join("\n");
  const agg = aggregateLegCoverage({ ledgerPath: "/tmp/x", existsImpl: () => true, readImpl: () => ledger });
  assert.equal(agg.records, 3);              // all 3 valid records (both sessions)
  assert.equal(agg.sessions, 2);            // distinct sessions A + B
  assert.equal(agg.coverage, 4);            // wiki, memories, tribal, engines
  assert.deepEqual(agg.legsConsulted, ["wiki", "memories", "tribal", "engines"]); // canonical order
  assert.equal(agg.byLeg.wiki, 2);
  assert.equal(agg.byLeg.memories, 1);
});

test("aggregateLegCoverage: missing/corrupt ledger → empty, never throws", () => {
  assert.deepEqual(
    aggregateLegCoverage({ ledgerPath: "/tmp/x", existsImpl: () => false }),
    { coverage: 0, total: 11, legsConsulted: [], byLeg: {}, records: 0, sessions: 0 },
  );
  assert.doesNotThrow(() => aggregateLegCoverage({ existsImpl: () => true, readImpl: () => { throw new Error("io"); } }));
});

test("renderCoverage: one-line summary", () => {
  assert.equal(
    renderCoverage({ coverage: 3, total: 11, legsConsulted: ["wiki", "tribal", "engines"] }),
    "PSN legs consulted: 3/11 (wiki, tribal, engines)",
  );
  assert.equal(renderCoverage({ coverage: 0, total: 11, legsConsulted: [] }), "PSN legs consulted: 0/11");
  assert.equal(renderCoverage(null), "PSN legs consulted: 0/11");
});

test("PSN_LEGS: frozen canonical 11-leg taxonomy + DEFAULT_LEDGER_PATH", () => {
  assert.equal(PSN_LEGS.length, 11);
  assert.equal(Object.isFrozen(PSN_LEGS), true);
  assert.deepEqual([...PSN_LEGS], [
    "obsidian_brain", "prism_os", "wiki", "memories", "tribal",
    "system_viz", "engines", "algorithms", "formulas", "nn_gnn", "prism_ai",
  ]);
  assert.ok(DEFAULT_LEDGER_PATH.endsWith("psn-attribution.jsonl"));
});
