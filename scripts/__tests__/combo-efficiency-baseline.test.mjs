/**
 * Tests for combo-efficiency-baseline.mjs — P0-U02 of COMBO-EFFICIENCY-MS0.
 *
 * Coverage:
 *   - Per-substrate happy path (4 substrates × GREEN/YELLOW/RED)
 *   - Per-substrate missing source (UNKNOWN status)
 *   - Threshold boundaries (exact-equal at green/yellow cutoffs)
 *   - computeOverallScore: weighted average, UNKNOWN exclusion, OBSERVED exclusion
 *   - buildBaseline: end-to-end with real-shape fixtures, blocker + recommendation surfacing
 *   - Adversarial: NaN, Infinity, negative counts, empty broken[], array-not-object, null
 *   - CLI: --dry mode, --root override, env disable knob
 *
 * Run: node --test scripts/__tests__/combo-efficiency-baseline.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  SCHEMA_VERSION,
  THRESHOLDS,
  classifyObsidian,
  classifyMasterIndex,
  classifyOllama,
  classifySystemViz,
  classifyComboUmbrella,
  computeOverallScore,
  buildBaseline,
  collectBaseline,
} from "../combo-efficiency-baseline.mjs";

// ─── classifyObsidian ──────────────────────────────────────────────────────

test("classifyObsidian: GREEN when breakPct <= 1.0%", () => {
  const out = classifyObsidian({ broken: new Array(50), totalLinks: 10000 });
  assert.equal(out.status, "GREEN");
  assert.equal(out.breakPct, 0.5);
  assert.equal(out.brokenCount, 50);
});

test("classifyObsidian: YELLOW when breakPct in (1.0, 5.0]%", () => {
  const out = classifyObsidian({ broken: new Array(300), totalLinks: 10000 });
  assert.equal(out.status, "YELLOW");
  assert.equal(out.breakPct, 3.0);
});

test("classifyObsidian: RED when breakPct > 5.0%", () => {
  // Real baseline at spec time: 4136/97673 = 4.23% → would be YELLOW, push to RED.
  const out = classifyObsidian({ broken: new Array(700), totalLinks: 10000 });
  assert.equal(out.status, "RED");
  // 700/10000*100 = 7.000000000000001 (IEEE-754) — assert proximity, not bit-equality.
  assert.ok(Math.abs(out.breakPct - 7.0) < 1e-9, `breakPct ~= 7.0, got ${out.breakPct}`);
});

test("classifyObsidian: boundary — exactly 1.0% is GREEN", () => {
  const out = classifyObsidian({ broken: new Array(100), totalLinks: 10000 });
  assert.equal(out.status, "GREEN");
});

test("classifyObsidian: boundary — exactly 5.0% is YELLOW", () => {
  const out = classifyObsidian({ broken: new Array(500), totalLinks: 10000 });
  assert.equal(out.status, "YELLOW");
});

test("classifyObsidian: absolute-count fallback when totalLinks missing", () => {
  const out = classifyObsidian({ broken: new Array(2500) });
  assert.equal(out.status, "RED");
  assert.equal(out.breakPct, null);
  assert.equal(out.totalLinks, null);
});

test("classifyObsidian: UNKNOWN when audit is null", () => {
  assert.equal(classifyObsidian(null).status, "UNKNOWN");
  assert.equal(classifyObsidian(undefined).status, "UNKNOWN");
});

test("classifyObsidian: UNKNOWN when audit lacks broken array", () => {
  const out = classifyObsidian({ wikiDir: "x", memDir: "y" });
  assert.equal(out.status, "UNKNOWN");
  assert.equal(out.reason, "audit-shape-invalid");
});

// ─── classifyMasterIndex ───────────────────────────────────────────────────

test("classifyMasterIndex: GREEN when takeRate >= 30%", () => {
  const out = classifyMasterIndex({ summary: { totalFires: 100, totalTakes: 35, fleetTakeRate: 0.35, dominantClassifier: "x", healthSignal: "ok" } });
  assert.equal(out.status, "GREEN");
  assert.equal(out.takes, 35);
});

test("classifyMasterIndex: YELLOW when takeRate in [5%, 30%)", () => {
  const out = classifyMasterIndex({ summary: { totalFires: 100, totalTakes: 15, fleetTakeRate: 0.15 } });
  assert.equal(out.status, "YELLOW");
});

test("classifyMasterIndex: RED when takeRate < 5% (baseline 0% case)", () => {
  // Real baseline at spec time: 0/1774 = 0% → RED.
  const out = classifyMasterIndex({ summary: { totalFires: 1774, totalTakes: 0, fleetTakeRate: 0, dominantClassifier: "backendAuditChain", healthSignal: "takeup-wiring-broken" } });
  assert.equal(out.status, "RED");
  assert.equal(out.takeRate, 0);
  assert.equal(out.dominantClassifier, "backendAuditChain");
});

test("classifyMasterIndex: UNKNOWN when audit missing", () => {
  assert.equal(classifyMasterIndex(null).status, "UNKNOWN");
  assert.equal(classifyMasterIndex({}).status, "UNKNOWN");  // no summary
});

test("classifyMasterIndex: UNKNOWN when summary.totalFires missing", () => {
  const out = classifyMasterIndex({ summary: { totalTakes: 0 } });
  assert.equal(out.status, "UNKNOWN");
});

// ─── classifyOllama ────────────────────────────────────────────────────────

test("classifyOllama: GREEN when offloadRate >= 30%", () => {
  const out = classifyOllama({ offloaded: 40, keptOnClaude: 60, estimatedTokensSaved: 12000 });
  assert.equal(out.status, "GREEN");
  assert.equal(out.offloadRate, 0.40);
});

test("classifyOllama: YELLOW when offloadRate in [10%, 30%)", () => {
  const out = classifyOllama({ offloaded: 20, keptOnClaude: 80 });
  assert.equal(out.status, "YELLOW");
});

test("classifyOllama: RED when offloadRate < 10% (baseline 5% case)", () => {
  // Real baseline at spec time: ~44/859 = 5.1% → RED.
  const out = classifyOllama({ offloaded: 44, keptOnClaude: 815 });
  assert.equal(out.status, "RED");
});

test("classifyOllama: UNKNOWN when total = 0 (no traffic yet)", () => {
  const out = classifyOllama({ offloaded: 0, keptOnClaude: 0 });
  assert.equal(out.status, "UNKNOWN");
  assert.equal(out.reason, "no-traffic-yet");
});

test("classifyOllama: UNKNOWN when stats missing", () => {
  assert.equal(classifyOllama(null).status, "UNKNOWN");
});

// ─── classifySystemViz ─────────────────────────────────────────────────────

test("classifySystemViz: GREEN when unwiredEngines <= 100", () => {
  const out = classifySystemViz({ unwiredEngines: 50, ghostCount: 10 });
  assert.equal(out.status, "GREEN");
});

test("classifySystemViz: YELLOW when unwiredEngines in (100, 400]", () => {
  const out = classifySystemViz({ unwiredEngines: 250 });
  assert.equal(out.status, "YELLOW");
});

test("classifySystemViz: RED when unwiredEngines > 400 (baseline 593 case)", () => {
  // Real baseline at spec time: 593 unwired → RED.
  const out = classifySystemViz({ unwiredEngines: 593, ghostCount: 980, orphanCount: 9314 });
  assert.equal(out.status, "RED");
  assert.match(out.reason, /593 unwired/);
});

test("classifySystemViz: reads alternate field names (unwired/ghosts/orphans)", () => {
  const out = classifySystemViz({ unwired: 50, ghosts: 5, orphans: 100 });
  assert.equal(out.status, "GREEN");
  assert.equal(out.unwiredEngines, 50);
  assert.equal(out.ghostCount, 5);
  assert.equal(out.orphanCount, 100);
});

test("classifySystemViz: UNKNOWN when unwired count missing", () => {
  assert.equal(classifySystemViz({}).status, "UNKNOWN");
  assert.equal(classifySystemViz(null).status, "UNKNOWN");
});

// ─── classifyComboUmbrella ─────────────────────────────────────────────────

test("classifyComboUmbrella: OBSERVED (not graded) with totals", () => {
  const out = classifyComboUmbrella({ totals: { nudges: 140, hits: 548, savedTokens: 266500, misses: 2067, ledgersWithData: 5 } });
  assert.equal(out.status, "OBSERVED");
  assert.equal(out.nudges, 140);
  assert.equal(out.savedTokens, 266500);
});

test("classifyComboUmbrella: UNKNOWN when totals missing", () => {
  assert.equal(classifyComboUmbrella(null).status, "UNKNOWN");
  assert.equal(classifyComboUmbrella({}).status, "UNKNOWN");
});

// ─── computeOverallScore ───────────────────────────────────────────────────

test("computeOverallScore: all GREEN → score 1.0, zone GREEN", () => {
  const s = computeOverallScore({
    a: { status: "GREEN" }, b: { status: "GREEN" }, c: { status: "GREEN" }, d: { status: "GREEN" },
  });
  assert.equal(s.score, 1.0);
  assert.equal(s.zone, "GREEN");
  assert.equal(s.contributingCount, 4);
});

test("computeOverallScore: mix → weighted average", () => {
  // GREEN(1.0) + YELLOW(0.5) + RED(0.0) = 1.5/3 = 0.5 → YELLOW zone (0.40 <= s < 0.75).
  const s = computeOverallScore({
    a: { status: "GREEN" }, b: { status: "YELLOW" }, c: { status: "RED" },
  });
  assert.equal(s.score, 0.5);
  assert.equal(s.zone, "YELLOW");
  assert.equal(s.contributingCount, 3);
});

test("computeOverallScore: all RED → zone RED", () => {
  const s = computeOverallScore({
    a: { status: "RED" }, b: { status: "RED" },
  });
  assert.equal(s.score, 0);
  assert.equal(s.zone, "RED");
});

test("computeOverallScore: UNKNOWN substrates excluded from denominator", () => {
  // 1 GREEN, 1 UNKNOWN → score 1.0, contributingCount 1, unknownCount 1.
  const s = computeOverallScore({
    a: { status: "GREEN" }, b: { status: "UNKNOWN" },
  });
  assert.equal(s.score, 1.0);
  assert.equal(s.contributingCount, 1);
  assert.equal(s.unknownCount, 1);
});

test("computeOverallScore: OBSERVED substrates excluded from denominator", () => {
  const s = computeOverallScore({
    a: { status: "GREEN" }, b: { status: "OBSERVED" },
  });
  assert.equal(s.score, 1.0);
  assert.equal(s.contributingCount, 1);
});

test("computeOverallScore: all UNKNOWN → score null, zone UNKNOWN", () => {
  const s = computeOverallScore({
    a: { status: "UNKNOWN" }, b: { status: "UNKNOWN" },
  });
  assert.equal(s.score, null);
  assert.equal(s.zone, "UNKNOWN");
  assert.equal(s.unknownCount, 2);
});

test("computeOverallScore: empty/null input → UNKNOWN", () => {
  assert.equal(computeOverallScore(null).zone, "UNKNOWN");
  assert.equal(computeOverallScore({}).zone, "UNKNOWN");
});

// ─── buildBaseline (end-to-end, no I/O) ────────────────────────────────────

test("buildBaseline: real-baseline shape (spec-time RED zone)", () => {
  const b = buildBaseline({
    psn: { totals: { nudges: 140, hits: 548, savedTokens: 266500, misses: 2067, ledgersWithData: 5 } },
    route: { summary: { totalFires: 1774, totalTakes: 0, fleetTakeRate: 0, dominantClassifier: "backendAuditChain", healthSignal: "takeup-wiring-broken" } },
    link: { broken: new Array(4136), totalLinks: 97673, wikiDir: "knowledge/wiki", memDir: "knowledge/memories" },
    ollama: { offloaded: 44, keptOnClaude: 815, estimatedTokensSaved: 8818 },
    awareness: { unwiredEngines: 593, ghostCount: 980, orphanCount: 9314 },
    generatedAt: "2026-05-25T17:40:00.000Z",
  });
  assert.equal(b.schemaVersion, SCHEMA_VERSION);
  assert.equal(b.substrates.obsidian.status, "YELLOW");  // 4.23% → YELLOW (≤5.0)
  assert.equal(b.substrates.masterIndex.status, "RED");
  assert.equal(b.substrates.ollama.status, "RED");
  assert.equal(b.substrates.systemViz.status, "RED");
  assert.equal(b.comboUmbrella.status, "OBSERVED");
  // 3 RED + 1 YELLOW = 0.5/4 = 0.125 → RED zone.
  assert.equal(b.overall.zone, "RED");
  assert.equal(b.overall.contributingCount, 4);
  // Blockers surfaced for each RED.
  assert.equal(b.blockers.filter(x => x.startsWith("masterIndex")).length, 1);
  assert.equal(b.blockers.filter(x => x.startsWith("ollama")).length, 1);
  assert.equal(b.blockers.filter(x => x.startsWith("systemViz")).length, 1);
  // Recommendations name the right next-unit.
  assert.ok(b.recommendations.some(r => r.includes("P0-U01")));
  assert.ok(b.recommendations.some(r => r.includes("P1-U01")));
  assert.ok(b.recommendations.some(r => r.includes("P1-U02")));
  assert.ok(b.recommendations.some(r => r.includes("P1-U03")));
});

test("buildBaseline: all GREEN → no blockers, no recommendations", () => {
  const b = buildBaseline({
    psn: { totals: { nudges: 1, hits: 1, savedTokens: 1, misses: 0, ledgersWithData: 1 } },
    route: { summary: { totalFires: 100, totalTakes: 35, fleetTakeRate: 0.35 } },
    link: { broken: [], totalLinks: 10000 },
    ollama: { offloaded: 40, keptOnClaude: 60 },
    awareness: { unwiredEngines: 50 },
  });
  assert.equal(b.overall.zone, "GREEN");
  assert.equal(b.blockers.length, 0);
  assert.equal(b.recommendations.length, 0);
});

test("buildBaseline: all sources missing → 4 UNKNOWN blockers, overall UNKNOWN", () => {
  const b = buildBaseline({});
  for (const s of Object.values(b.substrates)) assert.equal(s.status, "UNKNOWN");
  assert.equal(b.blockers.length, 4);
  for (const blk of b.blockers) assert.match(blk, /UNKNOWN/);
  assert.equal(b.overall.zone, "UNKNOWN");
});

// ─── Adversarial inputs ────────────────────────────────────────────────────

test("classifyObsidian: adversarial — broken as non-array", () => {
  const out = classifyObsidian({ broken: "not-an-array" });
  assert.equal(out.status, "UNKNOWN");
});

test("classifyMasterIndex: adversarial — NaN in fleetTakeRate", () => {
  // NaN is type "number" but the comparisons will all be false → falls into RED bucket.
  const out = classifyMasterIndex({ summary: { totalFires: 100, totalTakes: 0, fleetTakeRate: NaN } });
  assert.equal(out.status, "RED");
});

test("classifyOllama: adversarial — Infinity in offloaded", () => {
  // offloaded=Infinity, kept=100 → total=Infinity, rate=Infinity/Infinity=NaN → < threshold → RED.
  const out = classifyOllama({ offloaded: Infinity, keptOnClaude: 100 });
  assert.equal(out.status, "RED");
});

test("classifySystemViz: adversarial — negative unwired count", () => {
  const out = classifySystemViz({ unwiredEngines: -5 });
  assert.equal(out.status, "GREEN");  // -5 <= 100 → GREEN (mathematically correct; negative is upstream's bug)
  assert.equal(out.unwiredEngines, -5);
});

// ─── collectBaseline + CLI (filesystem) ────────────────────────────────────

function withTempPrismRoot(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "combo-baseline-test-"));
  try {
    fs.mkdirSync(path.join(tmp, "state/shared/dashboards"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "mcp-server/data/state"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "state/shared"), { recursive: true });
    fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test("collectBaseline: writes baseline JSON at default path", () => {
  withTempPrismRoot((tmp) => {
    // Seed minimal sources.
    fs.writeFileSync(path.join(tmp, "state/shared/dashboards/psn-savings-aggregate.json"),
      JSON.stringify({ totals: { nudges: 10, hits: 5, savedTokens: 100, misses: 50, ledgersWithData: 1 } }));
    fs.writeFileSync(path.join(tmp, "state/shared/dashboards/mcp-route-takerate-audit.json"),
      JSON.stringify({ summary: { totalFires: 100, totalTakes: 0, fleetTakeRate: 0 } }));
    fs.writeFileSync(path.join(tmp, "state/shared/.knowledge-link-audit.json"),
      JSON.stringify({ broken: new Array(10), totalLinks: 1000 }));
    fs.writeFileSync(path.join(tmp, "mcp-server/data/state/ollama-offload-stats.json"),
      JSON.stringify({ offloaded: 10, keptOnClaude: 90 }));
    fs.writeFileSync(path.join(tmp, "state/shared/AWARENESS-SNAPSHOT.json"),
      JSON.stringify({ unwiredEngines: 50 }));

    const result = collectBaseline({ prismRoot: tmp });
    assert.ok(fs.existsSync(result.written));
    const written = JSON.parse(fs.readFileSync(result.written, "utf8"));
    assert.equal(written.schemaVersion, SCHEMA_VERSION);
    assert.equal(written.substrates.obsidian.status, "GREEN");
    assert.equal(written.substrates.systemViz.status, "GREEN");
    assert.equal(written.substrates.masterIndex.status, "RED");  // 0% take-rate
  });
});

test("collectBaseline: missing sources → UNKNOWN per substrate, still writes", () => {
  withTempPrismRoot((tmp) => {
    const result = collectBaseline({ prismRoot: tmp });
    assert.ok(fs.existsSync(result.written));
    const written = JSON.parse(fs.readFileSync(result.written, "utf8"));
    for (const s of Object.values(written.substrates)) assert.equal(s.status, "UNKNOWN");
  });
});

test("collectBaseline: write=false returns baseline without writing", () => {
  withTempPrismRoot((tmp) => {
    const result = collectBaseline({ prismRoot: tmp, write: false });
    assert.equal(result.written, null);
    assert.equal(result.baseline.schemaVersion, SCHEMA_VERSION);
  });
});

test("CLI: --dry mode prints baseline JSON to stdout, no file written", () => {
  withTempPrismRoot((tmp) => {
    const scriptPath = path.resolve(new URL("../combo-efficiency-baseline.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [scriptPath, "--dry", "--root", tmp], { encoding: "utf8" });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.schemaVersion, SCHEMA_VERSION);
    assert.ok(!fs.existsSync(path.join(tmp, "state/shared/dashboards/combo-efficiency-baseline.json")));
  });
});

test("CLI: env disable knob no-ops cleanly", () => {
  withTempPrismRoot((tmp) => {
    const scriptPath = path.resolve(new URL("../combo-efficiency-baseline.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [scriptPath, "--root", tmp], {
      encoding: "utf8",
      env: { ...process.env, PRISM_COMBO_EFFICIENCY_BASELINE_DISABLE: "1" },
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.skipped, "disabled-via-env");
    assert.ok(!fs.existsSync(path.join(tmp, "state/shared/dashboards/combo-efficiency-baseline.json")));
  });
});

test("THRESHOLDS export is frozen-shape", () => {
  assert.ok(THRESHOLDS.obsidian);
  assert.ok(THRESHOLDS.masterIndex);
  assert.ok(THRESHOLDS.ollama);
  assert.ok(THRESHOLDS.systemViz);
  assert.equal(typeof THRESHOLDS.masterIndex.takeRateGreen, "number");
});
