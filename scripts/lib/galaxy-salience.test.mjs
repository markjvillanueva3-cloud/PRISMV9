// scripts/lib/galaxy-salience.test.mjs — U-GCF-SALIENCE (GALAXY-CONTEXT-FEDERATION-MS0).
// Hermetic node:test. Run: node --test scripts/lib/galaxy-salience.test.mjs
//
// Coverage: pure factor scorers (recency decay curve, impact proxy, date parse/reject), domain→galaxy
// alias normalization, the additive scorer-layering INVARIANT (scorer = base + recency + impact;
// byte-identical when neutral; -Infinity passthrough), access maps (outcome-bus real-LIVE + injected +
// alias + ai-intel opt-in + garbage), per-galaxy salience + factorsActive honesty, the
// extractGalaxyCard/buildAllCards INTEGRATION (re-rank + INDEX salience fields + off-path byte-parity),
// and a CLI subprocess oracle. Real-value assertions, fail-on-revert guards, adversarial inputs.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  parseNewestDateMs, recencyBonus, impactBonus, salienceBonus, makeSalienceScorer,
  normalizeDomainToGalaxy, loadAccessMap, loadAiIntelAccessMap, accessBonus,
  computeGalaxySalience, factorsActiveSummary,
  HALF_LIFE_DAYS, RECENCY_MAX, IMPACT_MAX, SHA_BONUS, DOMAIN_ALIAS,
} from "./galaxy-salience.mjs";
import { extractGalaxyCard, buildAllCards, scoreLine } from "./galaxy-context-card.mjs";
import { SLOT_GALAXY_MAP } from "./slot-galaxy-map.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..", "galaxy-salience.mjs");
const NOW = Date.UTC(2026, 4, 31, 12); // 2026-05-31 noon UTC
const GALAXY_SET = new Set(Object.values(SLOT_GALAXY_MAP));

// ── parseNewestDateMs ────────────────────────────────────────────────────────
test("parseNewestDateMs — single valid date", () => {
  assert.equal(parseNewestDateMs("shipped 2026-05-31 ok"), Date.UTC(2026, 4, 31, 12));
});
test("parseNewestDateMs — picks the NEWEST of multiple", () => {
  assert.equal(parseNewestDateMs("a 2026-01-01 b 2026-05-31 c 2025-12-30"), Date.UTC(2026, 4, 31, 12));
});
test("parseNewestDateMs — rejects impossible month/day (no throw)", () => {
  assert.equal(parseNewestDateMs("x 2026-13-99 y"), null);
  assert.equal(parseNewestDateMs("x 2026-00-10 y"), null);
});
test("parseNewestDateMs — rejects overflow date feb 31 (no throw)", () => {
  assert.equal(parseNewestDateMs("x 2026-02-31 y"), null);
});
test("parseNewestDateMs — no date / non-string → null", () => {
  assert.equal(parseNewestDateMs("no date here"), null);
  assert.equal(parseNewestDateMs(null), null);
  assert.equal(parseNewestDateMs(42), null);
});

// ── recencyBonus ──────────────────────────────────────────────────────────────
test("recencyBonus — today = max", () => {
  assert.equal(recencyBonus("x 2026-05-31 y", NOW), RECENCY_MAX);
});
test("recencyBonus — one half-life old ≈ half max", () => {
  const oneHL = NOW - HALF_LIFE_DAYS * 86400000;
  const line = `x ${new Date(oneHL).toISOString().slice(0, 10)} y`;
  assert.ok(Math.abs(recencyBonus(line, NOW) - RECENCY_MAX / 2) < 0.05);
});
test("recencyBonus — two half-lives ≈ quarter max", () => {
  const twoHL = NOW - 2 * HALF_LIFE_DAYS * 86400000;
  const line = `x ${new Date(twoHL).toISOString().slice(0, 10)} y`;
  assert.ok(Math.abs(recencyBonus(line, NOW) - RECENCY_MAX / 4) < 0.05);
});
test("recencyBonus — no date → 0", () => {
  assert.equal(recencyBonus("plain line", NOW), 0);
});
test("recencyBonus — future date clamps to max (never > max)", () => {
  assert.equal(recencyBonus("x 2026-12-25 y", NOW), RECENCY_MAX);
});
test("recencyBonus — invalid now / non-positive half-life → 0 (fail-soft)", () => {
  assert.equal(recencyBonus("x 2026-05-31 y", NaN), 0);
  assert.equal(recencyBonus("x 2026-05-31 y", NOW, { halfLifeDays: 0 }), 0);
  assert.equal(recencyBonus("x 2026-05-31 y", NOW, { halfLifeDays: -5 }), 0);
});
test("recencyBonus — monotonic decay with age", () => {
  const d = (iso) => recencyBonus(`x ${iso} y`, NOW);
  assert.ok(d("2026-05-31") > d("2026-05-15"));
  assert.ok(d("2026-05-15") > d("2026-04-01"));
  assert.ok(d("2026-04-01") > d("2026-01-01"));
});

// ── impactBonus ───────────────────────────────────────────────────────────────
test("impactBonus — commit SHA contributes", () => {
  assert.equal(impactBonus("see 7af3d6ab65 for detail"), SHA_BONUS);
});
test("impactBonus — ship word + metric stack within cap", () => {
  const v = impactBonus("shipped 12/12 tests");
  assert.ok(v >= 3 && v <= IMPACT_MAX);
});
test("impactBonus — all signals capped at IMPACT_MAX", () => {
  assert.equal(impactBonus("shipped wired merged abcdef1 99/99 50% tests"), IMPACT_MAX);
});
test("impactBonus — none / non-string → 0", () => {
  assert.equal(impactBonus("just a plain descriptive fact"), 0);
  assert.equal(impactBonus(null), 0);
});
test("impactBonus — percentage and N-tests are metric signals", () => {
  assert.ok(impactBonus("coverage 80%") > 0);
  assert.ok(impactBonus("ran 41 tests") > 0);
});
test("impactBonus — SHA requires a digit: all-alpha hex words do NOT false-fire (fail-on-revert)", () => {
  // "deedface"/"effaced" are valid 7+ char hex but all-alpha → must NOT count as a commit SHA.
  assert.equal(impactBonus("the deedface pattern in this design"), 0);
  assert.equal(impactBonus("a long effaced surface note"), 0);
  // a real digit-bearing 7-hex shorthand still fires.
  assert.equal(impactBonus("see 7af3d6a for detail"), SHA_BONUS);
});

// ── normalizeDomainToGalaxy (alias map) ───────────────────────────────────────
test("normalizeDomainToGalaxy — aliases the 3 divergent outcome-bus domains", () => {
  assert.equal(normalizeDomainToGalaxy("database", GALAXY_SET), "database-expansion");
  assert.equal(normalizeDomainToGalaxy("fleet-reaper", GALAXY_SET), "fleet-hygiene");
  assert.equal(normalizeDomainToGalaxy("hermes-zebra", GALAXY_SET), "hermes-zulu");
});
test("normalizeDomainToGalaxy — passthrough for a real galaxy name", () => {
  assert.equal(normalizeDomainToGalaxy("cad", GALAXY_SET), "cad");
  assert.equal(normalizeDomainToGalaxy("token-optimization", GALAXY_SET), "token-optimization");
});
test("normalizeDomainToGalaxy — unknown / non-string → null", () => {
  assert.equal(normalizeDomainToGalaxy("not-a-galaxy", GALAXY_SET), null);
  assert.equal(normalizeDomainToGalaxy(null, GALAXY_SET), null);
  assert.equal(normalizeDomainToGalaxy("", GALAXY_SET), null);
});
test("DOMAIN_ALIAS targets are all real galaxies (fail-on-revert: a typo'd alias maps to nothing)", () => {
  for (const target of Object.values(DOMAIN_ALIAS)) {
    assert.ok(GALAXY_SET.has(target), `alias target '${target}' must be a real galaxy`);
  }
});

// ── salienceBonus + makeSalienceScorer (additive-layering INVARIANT) ───────────
test("salienceBonus — equals recency + impact (the documented sum)", () => {
  const line = "shipped 2026-05-31 abcdef1 9/9 tests";
  assert.equal(salienceBonus(line, { nowMs: NOW }), recencyBonus(line, NOW) + impactBonus(line));
});
test("makeSalienceScorer — INVARIANT: scorer(line,hw) === base(line,hw) + salienceBonus(line)", () => {
  const base = (l, hw) => scoreLine(l, hw);
  const sc = makeSalienceScorer({ nowMs: NOW, baseScorer: base });
  for (const line of [
    "a plain conventional fact with no markers",
    "shipped 2026-05-31 abcdef1 12/12 tests",
    "- U-X 2026-04-01 partial note",
  ]) {
    const b = base(line, 3);
    if (Number.isFinite(b)) assert.equal(sc(line, 3), b + salienceBonus(line, { nowMs: NOW }));
  }
});
test("makeSalienceScorer — BYTE-IDENTICAL to base on a neutral line (no date, no impact)", () => {
  const base = (l, hw) => scoreLine(l, hw);
  const sc = makeSalienceScorer({ nowMs: NOW, baseScorer: base });
  const line = "a plain conventional fact with no date or outcome marker";
  assert.equal(sc(line, 3), base(line, 3));
});
test("makeSalienceScorer — boosts a fresh+shipped line above base", () => {
  const base = (l, hw) => hw || 1;
  const sc = makeSalienceScorer({ nowMs: NOW, baseScorer: base });
  const line = "shipped 2026-05-31 abcdef1 12/12 tests";
  assert.ok(sc(line, 1) > base(line, 1) + 6);
});
test("makeSalienceScorer — preserves -Infinity reject sentinel", () => {
  const sc = makeSalienceScorer({ nowMs: NOW, baseScorer: () => -Infinity });
  assert.equal(sc("anything", 1), -Infinity);
});
test("makeSalienceScorer — default base = header weight when none injected", () => {
  const sc = makeSalienceScorer({ nowMs: NOW });
  assert.equal(sc("plain", 3), 3);
});
test("makeSalienceScorer — accepts now() fn as well as nowMs", () => {
  const sc = makeSalienceScorer({ now: () => NOW, baseScorer: (l, hw) => hw || 1 });
  assert.equal(sc("x 2026-05-31 y", 1), 1 + RECENCY_MAX);
});

// ── loadAccessMap (outcome-bus) ───────────────────────────────────────────────
test("loadAccessMap — injected rows aggregate by domain + alias + slot fallback", () => {
  const jsonl = [
    JSON.stringify({ slot: "alpha", domain: "token-optimization", success: true }),
    JSON.stringify({ domain: "wedm", success: true }),
    JSON.stringify({ domain: "wedm", success: false }),
    JSON.stringify({ domain: "database", success: true }),   // alias → database-expansion
    JSON.stringify({ domain: "fleet-reaper", success: true }), // alias → fleet-hygiene
    JSON.stringify({ slot: "delta", success: true }),          // no domain → slot→galaxy = cad
  ].join("\n");
  const am = loadAccessMap({ readImpl: () => jsonl });
  assert.equal(am.populated, true);
  assert.equal(am.source, "outcome-bus");
  assert.equal(am.map["wedm"], 2);
  assert.equal(am.map["token-optimization"], 1);
  assert.equal(am.map["database-expansion"], 1); // aliased
  assert.equal(am.map["fleet-hygiene"], 1);      // aliased
  assert.equal(am.map["cad"], 1);                // delta → cad via slot fallback
});
test("loadAccessMap — rows with no galaxy-joinable field don't populate", () => {
  const jsonl = [JSON.stringify({ success: true }), JSON.stringify({ slot: "zzznope" }), JSON.stringify({ domain: "not-a-galaxy" })].join("\n");
  const am = loadAccessMap({ readImpl: () => jsonl });
  assert.equal(am.populated, false);
  assert.equal(am.rows, 3);
  assert.equal(am.withGalaxy, 0);
});
test("loadAccessMap — garbage lines skipped, not fatal", () => {
  const jsonl = "{bad json\n" + JSON.stringify({ domain: "wedm" }) + "\n\n";
  const am = loadAccessMap({ readImpl: () => jsonl });
  assert.equal(am.populated, true);
  assert.equal(am.map["wedm"], 1);
});
test("loadAccessMap — unreadable source → empty, not fatal", () => {
  const am = loadAccessMap({ readImpl: () => null });
  assert.deepEqual(am.map, {});
  assert.equal(am.populated, false);
});
test("loadAccessMap — REAL outcome-bus.jsonl is LIVE (carries galaxy rows)", () => {
  const am = loadAccessMap(); // default real path
  assert.equal(am.populated, true, "the outcome-bus is the LIVE access source; if this fails it has been emptied/moved");
  assert.equal(am.source, "outcome-bus");
  assert.ok(am.withGalaxy > 0);
  assert.ok(am.map["cad"] > 0, "cad is a high-traffic galaxy in the live bus");
});

// ── loadAiIntelAccessMap (opt-in) ─────────────────────────────────────────────
test("loadAiIntelAccessMap — maps only the unambiguous topics (wedm, speed-feed)", () => {
  const j = JSON.stringify({ by_domain: { wedm_wire_selection: 100, wedm_pulse_optimization: 50, speed_feed: 30, tool_selection: 999, general: 5 } });
  const am = loadAiIntelAccessMap({ readImpl: () => j });
  assert.equal(am.source, "ai-intel");
  assert.equal(am.populated, true);
  assert.equal(am.map["wedm"], 150);
  assert.equal(am.map["speed-feed"], 30);
  assert.equal(am.map["mill"], undefined); // tool_selection NOT mapped (ambiguous)
});
test("loadAccessMap — accessSource:'ai-intel' delegates to the opt-in reader", () => {
  const j = JSON.stringify({ by_domain: { speed_feed: 7 } });
  const am = loadAccessMap({ accessSource: "ai-intel", readImpl: () => j });
  assert.equal(am.source, "ai-intel");
  assert.equal(am.map["speed-feed"], 7);
});
test("loadAiIntelAccessMap — garbage JSON → empty, not fatal", () => {
  const am = loadAiIntelAccessMap({ readImpl: () => "{not json" });
  assert.equal(am.populated, false);
});

// ── accessBonus ───────────────────────────────────────────────────────────────
test("accessBonus — dormant access info → 0", () => {
  assert.equal(accessBonus("wedm", { populated: false, map: {} }), 0);
});
test("accessBonus — busiest galaxy gets the peak (log-normalized)", () => {
  const info = { populated: true, map: { cad: 100, mill: 1 } };
  const top = accessBonus("cad", info);
  assert.ok(Math.abs(top - 3) < 0.01, "peak ≈ ACCESS_MAX");
  assert.ok(accessBonus("mill", info) < top);
});
test("accessBonus — unknown galaxy → 0", () => {
  assert.equal(accessBonus("nope", { populated: true, map: { cad: 5 } }), 0);
});

// ── computeGalaxySalience ─────────────────────────────────────────────────────
test("computeGalaxySalience — score sums freshest + impactAvg + access; honest factorsActive", () => {
  const facts = ["shipped 2026-05-31 deadbee 9/9 tests", "old 2026-01-01 note", "plain"];
  const gs = computeGalaxySalience("token-optimization", facts, { nowMs: NOW, accessInfo: { populated: false, map: {} } });
  assert.ok(gs.score > 0);
  assert.equal(gs.factorsActive.recency, true);
  assert.equal(gs.factorsActive.impact, true);
  assert.equal(gs.factorsActive.access, false);
  assert.equal(gs.factors.factCount, 3);
  assert.equal(gs.factors.datedFacts, 2);
});
test("computeGalaxySalience — access lifts score when populated", () => {
  const facts = ["plain a", "plain b"];
  const dormant = computeGalaxySalience("cad", facts, { nowMs: NOW, accessInfo: { populated: false, map: {} } });
  const live = computeGalaxySalience("cad", facts, { nowMs: NOW, accessInfo: { populated: true, map: { cad: 100, mill: 1 } } });
  assert.ok(live.score > dormant.score);
  assert.equal(live.factorsActive.access, true);
});
test("computeGalaxySalience — empty / non-array facts tolerated", () => {
  assert.equal(computeGalaxySalience("x", [], { nowMs: NOW }).factors.factCount, 0);
  assert.equal(computeGalaxySalience("x", null, { nowMs: NOW }).factors.factCount, 0);
});

// ── factorsActiveSummary ──────────────────────────────────────────────────────
test("factorsActiveSummary — recency+impact always live; access reflects source state", () => {
  const dormant = factorsActiveSummary({ accessInfo: { populated: false, rows: 0, withGalaxy: 0, source: "outcome-bus" } });
  assert.equal(dormant.recency, true);
  assert.equal(dormant.impact, true);
  assert.equal(dormant.access, false);
  assert.match(dormant.accessReason, /dormant/);
  const live = factorsActiveSummary({ accessInfo: { populated: true, rows: 100, withGalaxy: 100, source: "outcome-bus" } });
  assert.equal(live.access, true);
  assert.match(live.accessReason, /LIVE/);
});

// ── INTEGRATION: extractGalaxyCard / buildAllCards ────────────────────────────
const MEMORY_FIXTURE = `# Test Galaxy Memory — Demo Role

## Known patterns
- a low-weight plain fact about conventions with no date and no outcome marker here

## Master brain link
- a high-weight plain pointer line under the master-brain section no date no marker

## Owned milestone
- DEMO-MS0/U-DEMO shipped 2026-05-31 abcdef1 18/18 tests green
`;

test("integration — salienceScorer re-ranks: fresh+shipped fact floats up vs plain scoreLine", () => {
  const withoutSal = extractGalaxyCard("demo", { memory: MEMORY_FIXTURE }, { topN: 12 });
  const sc = makeSalienceScorer({ nowMs: NOW, baseScorer: scoreLine });
  const withSal = extractGalaxyCard("demo", { memory: MEMORY_FIXTURE }, { topN: 12, salienceScorer: sc });
  const shipped = (f) => f.includes("18/18 tests");
  const posWithout = withoutSal.facts.findIndex(shipped);
  const posWith = withSal.facts.findIndex(shipped);
  assert.ok(posWith >= 0 && posWithout >= 0, "shipped fact present in both");
  assert.ok(posWith <= posWithout, "salience moves the fresh+shipped fact no later (usually earlier)");
});
test("integration — NO salienceScorer is byte-identical to explicit scoreLine (parity guard)", () => {
  const a = extractGalaxyCard("demo", { memory: MEMORY_FIXTURE }, { topN: 12 });
  const b = extractGalaxyCard("demo", { memory: MEMORY_FIXTURE }, { topN: 12, salienceScorer: scoreLine });
  assert.deepEqual(a.facts, b.facts);
});
test("integration — buildAllCards salience ON records salience + schema 1.2.0 + access meta", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gsal-"));
  try {
    const eng = path.join(dir, "engines"); const g = path.join(eng, "demo");
    fs.mkdirSync(g, { recursive: true });
    fs.writeFileSync(path.join(g, "MEMORY.md"), MEMORY_FIXTURE);
    const cards = path.join(dir, "cards");
    // TRUE hermeticity: point accessPath at a nonexistent fixture so loadAccessMap reads NOTHING from
    // the live outcome-bus → access factor is empty here, isolating the recency+impact behavior.
    const r = buildAllCards({ roots: { enginesDir: eng, cardsDir: cards }, now: () => NOW, salience: true, accessPath: path.join(dir, "no-such-bus.jsonl"), readImpl: (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } } });
    assert.equal(r.ok, true);
    assert.equal(r.schemaVersion, "1.2.0");
    assert.equal(r.salience, true);
    const entry = r.cards.find((c) => c.galaxy === "demo");
    assert.ok(entry && typeof entry.salience === "number");
    assert.equal(entry.salienceFactors.recency, true);
    assert.ok(r.accessFactor, "access meta present in INDEX");
    assert.equal(r.accessFactor.populated, false, "hermetic: nonexistent accessPath ⇒ access factor empty");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("integration — buildAllCards salience OFF omits salience fields + keeps schema 1.1.0", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gsal-off-"));
  try {
    const eng = path.join(dir, "engines"); const g = path.join(eng, "demo");
    fs.mkdirSync(g, { recursive: true });
    fs.writeFileSync(path.join(g, "MEMORY.md"), MEMORY_FIXTURE);
    const cards = path.join(dir, "cards");
    const r = buildAllCards({ roots: { enginesDir: eng, cardsDir: cards }, now: () => NOW, salience: false });
    assert.equal(r.salience, false);
    assert.equal(r.schemaVersion, "1.1.0");
    const entry = r.cards.find((c) => c.galaxy === "demo");
    assert.equal(entry.salience, undefined);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── CLI subprocess oracle ─────────────────────────────────────────────────────
test("CLI — --factors --json reports recency/impact/access, exit 0", () => {
  const out = execFileSync(process.execPath, [CLI, "--factors", "--json"], { encoding: "utf8" });
  const parsed = JSON.parse(out.trim());
  assert.equal(parsed.factors.recency, true);
  assert.equal(parsed.factors.impact, true);
  assert.equal(typeof parsed.factors.access, "boolean");
});
test("CLI — default run is fail-soft JSON with an ok field, exit 0", () => {
  const out = execFileSync(process.execPath, [CLI, "--json"], { encoding: "utf8" });
  const parsed = JSON.parse(out.trim());
  assert.ok(parsed && typeof parsed === "object");
  assert.ok("ok" in parsed);
});
test("CLI — --galaxy not-found is fail-soft, exit 0", () => {
  const out = execFileSync(process.execPath, [CLI, "--galaxy", "zzznotagalaxy", "--json"], { encoding: "utf8" });
  assert.ok("ok" in JSON.parse(out.trim()));
});
