// cag-cold-anchor-coverage.test.mjs
// R9: pins the INTENT -- per-source presence rate is the CAG cold-anchor synergy signal;
// a source absent in some sessions must show a sub-1.0 rate and sort to the top (worst
// first); malformed sidecars are rejected, not counted.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  aggregateCoverage,
  loadSidecar,
  listSidecars,
  buildReport,
} from "./cag-cold-anchor-coverage.mjs";

function sc(sources) {
  return { kind: "cag-cold-cache-anchor", coldSources: sources };
}

test("aggregateCoverage computes per-source presence rate across sessions", () => {
  const sidecars = [
    sc([{ id: "claude-md", present: true, actualSizeBytes: 100000 }, { id: "wiki-index", present: true, actualSizeBytes: 50000 }]),
    sc([{ id: "claude-md", present: true, actualSizeBytes: 100000 }, { id: "wiki-index", present: false }]),
    sc([{ id: "claude-md", present: true, actualSizeBytes: 100000 }, { id: "wiki-index", present: false }]),
  ];
  const r = aggregateCoverage(sidecars);
  assert.equal(r.sessions, 3);
  const claude = r.sources.find((s) => s.id === "claude-md");
  const wiki = r.sources.find((s) => s.id === "wiki-index");
  assert.equal(claude.presenceRate, 1, "claude-md present in all 3");
  assert.equal(wiki.presenceRate, 0.333, "wiki-index present in 1/3");
});

test("aggregateCoverage sorts worst-covered source first (the actionable gap)", () => {
  const sidecars = [
    sc([{ id: "a", present: true }, { id: "b", present: false }, { id: "c", present: true }]),
    sc([{ id: "a", present: true }, { id: "b", present: false }, { id: "c", present: false }]),
  ];
  const r = aggregateCoverage(sidecars);
  assert.equal(r.sources[0].id, "b", "b (0%) is the worst -> first");
  assert.ok(r.sources[0].presenceRate <= r.sources[r.sources.length - 1].presenceRate);
});

test("aggregateCoverage: avg cold bytes only counts PRESENT sessions; absent contributes 0", () => {
  const sidecars = [
    sc([{ id: "x", present: true, actualSizeBytes: 200000 }]),
    sc([{ id: "x", present: false, actualSizeBytes: 999999 }]), // absent -> bytes ignored
  ];
  const r = aggregateCoverage(sidecars);
  const x = r.sources.find((s) => s.id === "x");
  assert.equal(x.avgActualBytes, 200000, "averaged over present sessions only");
  assert.equal(r.avgColdBytesPerSession, 100000, "200000 over 2 sessions");
});

test("aggregateCoverage: empty / malformed input -> zeros, no throw", () => {
  const r = aggregateCoverage([]);
  assert.equal(r.sessions, 0);
  assert.equal(r.overallPresenceRate, 0);
  assert.equal(r.sources.length, 0);
  const r2 = aggregateCoverage([null, {}, { coldSources: "nope" }, sc([{ noId: true }])]);
  assert.equal(r2.sources.length, 0, "entries without a string id are skipped");
});

test("loadSidecar rejects non-cag-kind and unparseable files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cag-cov-"));
  try {
    const ok = path.join(dir, "ok.json");
    fs.writeFileSync(ok, JSON.stringify(sc([{ id: "a", present: true }])));
    assert.ok(loadSidecar(ok), "valid cag sidecar loads");
    const bad = path.join(dir, "bad.json");
    fs.writeFileSync(bad, JSON.stringify({ kind: "something-else", coldSources: [] }));
    assert.equal(loadSidecar(bad), null, "wrong kind rejected");
    const broken = path.join(dir, "broken.json");
    fs.writeFileSync(broken, "{ not json");
    assert.equal(loadSidecar(broken), null, "unparseable rejected");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("listSidecars + buildReport over a temp dir (newest-first, windowed)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cag-cov-"));
  try {
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(dir, `cold-cache-anchor-sid${i}.json`),
        JSON.stringify(sc([{ id: "claude-md", present: true, actualSizeBytes: 1000 }])));
    }
    fs.writeFileSync(path.join(dir, "not-a-sidecar.json"), "{}"); // must be ignored
    const list = listSidecars(dir);
    assert.equal(list.length, 5, "only cold-cache-anchor-*.json counted");
    const r = buildReport({ dir, window: 3 });
    assert.equal(r.loaded, 3, "window caps the scan");
    assert.equal(r.sources[0].id, "claude-md");
    assert.equal(r.sources[0].presenceRate, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
