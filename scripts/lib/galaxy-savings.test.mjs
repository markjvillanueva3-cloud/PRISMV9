// scripts/lib/galaxy-savings.test.mjs — U-GCF-SAVINGS-TELEMETRY hermetic test suite (node:test).
// Run: node --test scripts/lib/galaxy-savings.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadJson,
  computeCardSavings,
  computeDigestSavings,
  buildSavingsModel,
  renderSavings,
  savingsBuild,
  CHARS_PER_TOKEN,
} from "./galaxy-savings.mjs";

// ── loadJson ────────────────────────────────────────────────────────────────────
test("loadJson: fail-soft null / garbage / non-object → null", () => {
  assert.equal(loadJson("/x", () => null), null);
  assert.equal(loadJson("/x", () => "{bad"), null);
  assert.equal(loadJson("/x", () => "42"), null);
  assert.deepEqual(loadJson("/x", () => JSON.stringify({ a: 1 })), { a: 1 });
});

// ── computeCardSavings ──────────────────────────────────────────────────────────
const INDEX = { cards: [{ galaxy: "quoting", bytes: 1024 }, { galaxy: "wedm", bytes: 1024 }, { galaxy: "orphan", bytes: 1024 }] };
const WATCH = { all: [{ galaxy: "quoting", bytes: 90000 }, { galaxy: "wedm", bytes: 8000 }] };

test("computeCardSavings: per-galaxy brainTokens-cardTokens, needs BOTH, sorted desc", () => {
  const r = computeCardSavings(INDEX, WATCH);
  assert.equal(r.galaxyCount, 2);                       // 'orphan' has a card but no brain → skipped
  assert.equal(r.perGalaxy[0].galaxy, "quoting");       // biggest brain → biggest saving, sorted first
  assert.equal(r.perGalaxy[0].brainTokens, Math.round(90000 / CHARS_PER_TOKEN));
  assert.equal(r.perGalaxy[0].cardTokens, Math.round(1024 / CHARS_PER_TOKEN));
  assert.equal(r.perGalaxy[0].savedPerInject, r.perGalaxy[0].brainTokens - r.perGalaxy[0].cardTokens);
  assert.equal(r.totalPerInject, r.perGalaxy.reduce((s, g) => s + g.savedPerInject, 0));
});

test("computeCardSavings: missing index/watch → zero, no throw", () => {
  assert.equal(computeCardSavings(null, null).totalPerInject, 0);
  assert.equal(computeCardSavings({ cards: [] }, { all: [] }).galaxyCount, 0);
});

// ── computeDigestSavings ────────────────────────────────────────────────────────
test("computeDigestSavings: all-brains minus digest, never negative", () => {
  const r = computeDigestSavings({ bytes: 7000 }, WATCH);
  assert.equal(r.digestTokens, Math.round(7000 / CHARS_PER_TOKEN));
  assert.equal(r.allBrainsTokens, Math.round((90000 + 8000) / CHARS_PER_TOKEN));
  assert.equal(r.savedPerInject, r.allBrainsTokens - r.digestTokens);
  // a digest larger than all brains (degenerate) → max(0,...)
  assert.equal(computeDigestSavings({ bytes: 999999 }, WATCH).savedPerInject, 0);
});

// ── buildSavingsModel ─────────────────────────────────────────────────────────
test("buildSavingsModel: three categories + sources flags", () => {
  const m = buildSavingsModel({
    index: INDEX, memoryWatch: WATCH, digest: { bytes: 7000 },
    recall: { totalEstSavingsTokens: 1500, totalNudges: 5 },
    dedup: { totalEstTokensSaved: 37, clusterCount: 6 },
  });
  assert.ok(m.perInjectPotential.bestStrategyCeiling > 0);
  // R12: the ceiling is the MAX of the two strategies, NOT their sum (no double-count of the same brains)
  assert.equal(m.perInjectPotential.bestStrategyCeiling, Math.max(m.perInjectPotential.cardVsBrain, m.perInjectPotential.digestVsAllBrains));
  assert.ok(m.perInjectPotential.bestStrategyCeiling < m.perInjectPotential.cardVsBrain + m.perInjectPotential.digestVsAllBrains, "ceiling must NOT be the additive sum");
  assert.ok(/UNREALIZED|unrealized|inject path/.test(m.perInjectPotential.realizationCaveat), "carries the realization caveat");
  assert.equal(m.perInjectPotential.cardVsBrain > 0, true);
  assert.equal(m.cumulativeRealized.recallFirstTokens, 1500);
  assert.equal(m.cumulativeRealized.wired, true);
  assert.equal(m.oneTimeSaveable.dedupTokens, 37);
  assert.deepEqual(m.sources, { index: true, memoryWatch: true, digest: true, recall: true, dedup: true });
});

// FAIL-ON-REVERT: when the recall sidecar is ABSENT, realized must be 0 (honest — NOT projected from potential).
test("buildSavingsModel: absent recall/dedup → 0 realized/saveable, sources false (honest, not projected)", () => {
  const m = buildSavingsModel({ index: INDEX, memoryWatch: WATCH, digest: { bytes: 7000 } });
  assert.equal(m.cumulativeRealized.recallFirstTokens, 0);
  assert.equal(m.cumulativeRealized.wired, false);
  assert.equal(m.oneTimeSaveable.dedupTokens, 0);
  assert.equal(m.sources.recall, false);
  assert.equal(m.sources.dedup, false);
  // potential is independent + still computed
  assert.ok(m.perInjectPotential.bestStrategyCeiling > 0);
});

// ── renderSavings ────────────────────────────────────────────────────────────────
test("renderSavings: all three categories + top-galaxy table + missing-sidecar note", () => {
  const m = buildSavingsModel({ index: INDEX, memoryWatch: WATCH, digest: { bytes: 7000 } }); // recall+dedup missing
  const md = renderSavings(m, { generatedAt: "2026-05-31T00:00:00.000Z" });
  assert.match(md, /Per-inject potential/);
  assert.match(md, /Cumulative realized/);
  assert.match(md, /One-time saveable/);
  assert.match(md, /quoting/);                       // top galaxy in the table
  assert.match(md, /golf-pending/);                  // honest unrealized note
  assert.match(md, /Missing sidecars.*recall.*dedup/); // names the absent inputs
});

// ── savingsBuild orchestrator (hermetic) ──────────────────────────────────────────
function hermeticSavings(extra = {}) {
  const writes = {};
  const files = {
    "/c/INDEX.json": JSON.stringify(INDEX),
    "/c/MEMORY-WATCH.json": JSON.stringify(WATCH),
    "/c/MASTER-DIGEST.json": JSON.stringify({ bytes: 7000 }),
    "/c/DEDUP-REPORT.json": JSON.stringify({ totalEstTokensSaved: 37, clusterCount: 6 }),
    // recall-first-savings.json intentionally ABSENT → realized 0
  };
  const res = savingsBuild({
    roots: { cardsDir: "/c" }, reportJsonPath: "/c/SAVINGS-REPORT.json", reportMdPath: "/c/SAVINGS-REPORT.md",
    recallPath: "/nope/recall.json",
    readImpl: (f) => files[f] ?? null, writeImpl: (f, d) => { writes[f] = d; }, now: () => 1735689600000, ...extra,
  });
  return { res, writes };
}

test("savingsBuild: writes SAVINGS-REPORT.{json,md}; perInject>0; realized 0 (recall absent)", () => {
  const { res, writes } = hermeticSavings();
  assert.equal(res.ok, true);
  assert.equal(res.written, true);
  assert.ok(res.perInjectCeiling > 0);
  assert.equal(res.cumulativeRealized, 0);
  assert.equal(res.oneTimeSaveable, 37);
  const json = JSON.parse(writes["/c/SAVINGS-REPORT.json"]);
  assert.equal(json.schemaVersion, "1.0.0");
  assert.equal(json.sources.recall, false);
});

test("savingsBuild: SINGLE-WRITER — only SAVINGS-REPORT.{json,md}, never INDEX/MEMORY.md/source sidecars", () => {
  const { writes } = hermeticSavings();
  assert.deepEqual(Object.keys(writes).sort(), ["/c/SAVINGS-REPORT.json", "/c/SAVINGS-REPORT.md"]);
  for (const p of Object.keys(writes)) {
    assert.ok(!/INDEX\.json$/i.test(p) && !/MEMORY\.md$/i.test(p) && !/MEMORY-WATCH|DEDUP-REPORT|MASTER-DIGEST/.test(p));
  }
});

test("savingsBuild: all sidecars absent → still writes a zeroed report (degrades, never throws)", () => {
  const { res, writes } = hermeticSavings({ readImpl: () => null });
  assert.equal(res.ok, true);
  assert.equal(res.perInjectCeiling, 0);
  assert.ok(writes["/c/SAVINGS-REPORT.json"]);
  assert.deepEqual(JSON.parse(writes["/c/SAVINGS-REPORT.json"]).sources, { index: false, memoryWatch: false, digest: false, recall: false, dedup: false });
});

test("savingsBuild: disabled knob; write-error fail-soft; null opts never throws", () => {
  const prev = process.env.PRISM_GCF_SAVINGS_DISABLE;
  process.env.PRISM_GCF_SAVINGS_DISABLE = "1";
  try { assert.equal(hermeticSavings().res.disabled, true); }
  finally { if (prev === undefined) delete process.env.PRISM_GCF_SAVINGS_DISABLE; else process.env.PRISM_GCF_SAVINGS_DISABLE = prev; }
  assert.equal(hermeticSavings({ writeImpl: () => { throw new Error("disk"); } }).res.reason, "write-error");
  assert.doesNotThrow(() => savingsBuild(null));
});

// ── LIVE soft integration ──────────────────────────────────────────────────────
test("LIVE: real federation sidecars → per-inject potential > 0, three categories present", () => {
  let jsonCap = null;
  const res = savingsBuild({ writeImpl: (f, d) => { if (/\.json$/.test(f)) jsonCap = d; } }); // capture, don't write real
  if (!res.ok) { console.log("  (skipped — savings build not ok)"); return; }
  const j = JSON.parse(jsonCap);
  assert.ok(j.perInjectPotential && typeof j.perInjectPotential.bestStrategyCeiling === "number");
  assert.ok(j.cumulativeRealized && j.oneTimeSaveable);
  // if the cards+watch are present live, per-inject potential is positive
  if (j.sources.index && j.sources.memoryWatch) assert.ok(j.perInjectPotential.bestStrategyCeiling > 0);
});
