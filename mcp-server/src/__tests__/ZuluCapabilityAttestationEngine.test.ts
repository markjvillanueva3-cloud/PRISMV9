/**
 * ZuluCapabilityAttestationEngine (C7) tests -- Wilson-interval credibility core +
 * durable outcome store. Pure tests use hand-verified reference values; the durable
 * tests are hermetic via __forTests(tmpPath).
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ZuluCapabilityAttestationEngine } from "../engines/ZuluCapabilityAttestationEngine.js";

const E = ZuluCapabilityAttestationEngine;
const NOW_ISO = "2026-06-15T12:00:00.000Z";
const NOW = Date.parse(NOW_ISO);

const tmp: string[] = [];
function tmpPath(): string {
  const p = path.join(os.tmpdir(), `zulu-attest-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  tmp.push(p);
  return p;
}
afterEach(() => {
  for (const p of tmp.splice(0)) {
    for (const f of (() => { try { return fs.readdirSync(path.dirname(p)); } catch { return []; } })()) {
      if (f.startsWith(path.basename(p))) { try { fs.rmSync(path.join(path.dirname(p), f), { force: true }); } catch { /* best-effort */ } }
    }
  }
});

const outcomes = (success: number, total: number) =>
  Array.from({ length: total }, (_, i) => ({ success: i < success }));

// ---- PURE: Wilson interval -----------------------------------------------------

describe("wilsonInterval (pure, hand-verified reference values)", () => {
  it("8/10 -> [0.490, 0.943], center 0.717 (standard 95% Wilson)", () => {
    const w = E.wilsonInterval(8, 10);
    expect(w.lower).toBeCloseTo(0.4902, 3);
    expect(w.upper).toBeCloseTo(0.9433, 3);
    expect(w.center).toBeCloseTo(0.7167, 3);
  });

  it("1/1 does NOT collapse to [1,1] (small-n overconfidence guard): lower ~0.207", () => {
    const w = E.wilsonInterval(1, 1);
    expect(w.lower).toBeCloseTo(0.2065, 3);
    expect(w.upper).toBeCloseTo(1, 9); // ~1 perfect-record upper (float-safe, two-rounding sum)
    expect(w.lower).toBeLessThan(0.3); // a single success is NOT certainty
  });

  it("0/20 -> lower 0, upper ~0.161", () => {
    const w = E.wilsonInterval(0, 20);
    expect(w.lower).toBe(0);
    expect(w.upper).toBeCloseTo(0.1611, 3);
  });

  it("n=0 -> [0,1] center 0 (no information)", () => {
    expect(E.wilsonInterval(0, 0)).toEqual({ lower: 0, upper: 1, center: 0 });
  });

  it("clamps successes > n to n, negative/NaN inputs to 0", () => {
    expect(E.wilsonInterval(99, 10).upper).toBeCloseTo(1, 9); // 10/10 -> upper ~1 (float-safe)
    expect(E.wilsonInterval(99, 10).lower).toBeCloseTo(0.7225, 3); // == wilson(10,10).lower
    expect(E.wilsonInterval(-5, 10).lower).toBe(0); // negative successes -> 0
    expect(E.wilsonInterval(5, -3)).toEqual({ lower: 0, upper: 1, center: 0 }); // n<=0
  });
});

// ---- PURE: confidence + modifier ----------------------------------------------

describe("classifyConfidence (pure)", () => {
  it("sample-size gate FIRST: n<20 -> insufficient regardless of width", () => {
    expect(E.classifyConfidence(19, 0.05)).toBe("insufficient");
    expect(E.classifyConfidence(0, 0.0)).toBe("insufficient");
  });
  it("at/above 20 samples, narrower interval -> higher confidence", () => {
    expect(E.classifyConfidence(20, 0.5)).toBe("low");
    expect(E.classifyConfidence(20, 0.3)).toBe("moderate");
    expect(E.classifyConfidence(20, 0.1)).toBe("high");
    expect(E.classifyConfidence(100, 0.2)).toBe("moderate"); // boundary: 0.2 is NOT >0.2
  });
});

describe("computeBidModifier (pure, advisory -- never a veto)", () => {
  it("insufficient confidence -> 1.0 (neutral; unproven slot never penalized)", () => {
    expect(E.computeBidModifier(0.05, "insufficient")).toBe(1.0);
    expect(E.computeBidModifier(0.99, "insufficient")).toBe(1.0);
  });
  it("ci_lower=0.5 -> neutral 1.0; =1.0 -> max 1.25; =0.0 -> min 0.5", () => {
    expect(E.computeBidModifier(0.5, "high")).toBeCloseTo(1.0, 6);
    expect(E.computeBidModifier(1.0, "high")).toBeCloseTo(1.25, 6);
    expect(E.computeBidModifier(0.0, "high")).toBeCloseTo(0.5, 6);
    expect(E.computeBidModifier(0.75, "high")).toBeCloseTo(1.125, 6);
    expect(E.computeBidModifier(0.25, "high")).toBeCloseTo(0.75, 6);
  });
  it("NEVER returns 0 or negative -- always >= minModifier (no veto)", () => {
    expect(E.computeBidModifier(-99, "high")).toBeGreaterThanOrEqual(0.5);
    expect(E.computeBidModifier(0.0, "low")).toBeGreaterThan(0);
  });
});

// ---- PURE: buildAttestation ----------------------------------------------------

describe("buildAttestation (pure)", () => {
  it("declared + 20/25 success -> rate 0.8, ci_lower ~0.609, moderate, modifier ~1.054, NOT over_claim", () => {
    const a = E.buildAttestation("foxtrot", "mill", true, outcomes(20, 25), NOW);
    expect(a.empirical_success_rate).toBeCloseTo(0.8, 6);
    expect(a.sample_n).toBe(25);
    expect(a.successes).toBe(20);
    expect(a.ci_lower).toBeCloseTo(0.6087, 3);
    expect(a.confidence).toBe("moderate");
    expect(a.bid_modifier).toBeCloseTo(1.0543, 3);
    expect(a.over_claim).toBe(false);
    expect(a.declared_affinity).toBe(true);
    expect(a.attested_at).toBe(NOW_ISO);
  });

  it("declared but 5/25 success -> discredited: ci_lower ~0.089, over_claim TRUE, modifier ~0.589", () => {
    const a = E.buildAttestation("foxtrot", "lathe", true, outcomes(5, 25), NOW);
    expect(a.empirical_success_rate).toBeCloseTo(0.2, 6);
    expect(a.ci_lower).toBeCloseTo(0.0886, 3);
    expect(a.over_claim).toBe(true);
    expect(a.bid_modifier).toBeCloseTo(0.5886, 3);
    expect(a.bid_modifier).toBeLessThan(1.0); // discounted, but never 0
  });

  it("insufficient samples (3 all-success) -> neutral modifier 1.0, NOT over_claim", () => {
    const a = E.buildAttestation("bravo", "hermes", true, outcomes(3, 3), NOW);
    expect(a.empirical_success_rate).toBeCloseTo(1.0, 6);
    expect(a.confidence).toBe("insufficient");
    expect(a.bid_modifier).toBe(1.0);
    expect(a.over_claim).toBe(false); // thin evidence never flags an over-claim
  });

  it("empty outcomes -> n 0, rate 0, insufficient, neutral modifier", () => {
    const a = E.buildAttestation("zulu", "x", false, [], NOW);
    expect(a.sample_n).toBe(0);
    expect(a.empirical_success_rate).toBe(0);
    expect(a.confidence).toBe("insufficient");
    expect(a.bid_modifier).toBe(1.0);
    expect(a.over_claim).toBe(false);
  });

  it("undeclared domain with strong success is scored but not flagged over_claim", () => {
    const a = E.buildAttestation("kilo", "cam", false, outcomes(24, 25), NOW);
    expect(a.declared_affinity).toBe(false);
    expect(a.over_claim).toBe(false); // over_claim requires declared_affinity
    expect(a.bid_modifier).toBeGreaterThan(1.0); // proven competence still rewards the bid
  });
});

// ---- DURABLE store (hermetic) -------------------------------------------------

describe("recordOutcome + attest (durable, hermetic, fail-closed)", () => {
  it("records valid outcomes and attests accumulated rate", () => {
    const eng = E.__forTests(tmpPath());
    for (let i = 0; i < 25; i++) expect(eng.recordOutcome("foxtrot", "mill", i < 20, { now: NOW_ISO }).ok).toBe(true);
    const a = eng.attest("foxtrot", "mill", { now: NOW_ISO, declaredDomains: ["mill"] });
    expect(a.sample_n).toBe(25);
    expect(a.successes).toBe(20);
    expect(a.declared_affinity).toBe(true);
    expect(a.empirical_success_rate).toBeCloseTo(0.8, 6);
  });

  it("rejects invalid slot / domain / non-boolean success (no throw)", () => {
    const eng = E.__forTests(tmpPath());
    expect(eng.recordOutcome("BAD SLOT!", "mill", true).ok).toBe(false);
    expect(eng.recordOutcome("foxtrot", "has space", true).ok).toBe(false);
    expect(eng.recordOutcome("foxtrot", "mill", "yes" as never).ok).toBe(false);
  });

  it("ring-buffer caps per pair, keeping the most recent", () => {
    const eng = E.__forTests(tmpPath());
    // 5 successes then 5 failures, cap 5 -> only the 5 failures survive
    for (let i = 0; i < 5; i++) eng.recordOutcome("alpha", "mill", true, { now: NOW_ISO, maxOutcomesPerPair: 5 });
    for (let i = 0; i < 5; i++) eng.recordOutcome("alpha", "mill", false, { now: NOW_ISO, maxOutcomesPerPair: 5 });
    const a = eng.attest("alpha", "mill", { now: NOW_ISO });
    expect(a.sample_n).toBe(5);
    expect(a.successes).toBe(0); // the 5 retained are all the recent failures
  });

  it("bidModifierFor matches attest().bid_modifier", () => {
    const eng = E.__forTests(tmpPath());
    for (let i = 0; i < 25; i++) eng.recordOutcome("oscar", "speed-feed", i < 22, { now: NOW_ISO });
    const full = eng.attest("oscar", "speed-feed", { now: NOW_ISO });
    expect(eng.bidModifierFor("oscar", "speed-feed", { now: NOW_ISO })).toBeCloseTo(full.bid_modifier, 9);
  });

  it("attestAll returns every pair, sorted by slot then domain", () => {
    const eng = E.__forTests(tmpPath());
    eng.recordOutcome("oscar", "speed-feed", true, { now: NOW_ISO });
    eng.recordOutcome("alpha", "mill", true, { now: NOW_ISO });
    eng.recordOutcome("alpha", "cad", true, { now: NOW_ISO });
    const all = eng.attestAll({ now: NOW_ISO });
    expect(all.count).toBe(3);
    expect(all.scores.map((s) => `${s.slot}|${s.domain}`)).toEqual(["alpha|cad", "alpha|mill", "oscar|speed-feed"]);
  });

  it("corrupt (unparseable) store: recordOutcome fail-closed (ok:false) -- never clobbers", () => {
    const p = tmpPath();
    fs.writeFileSync(p, "{ this is not json", "utf8");
    const eng = E.__forTests(p);
    // parse-error path rotates the bad file to .corrupt-* (one-shot) and refuses the write.
    expect(eng.recordOutcome("alpha", "mill", true, { now: NOW_ISO }).ok).toBe(false);
  });

  it("schema-version mismatch (peer-newer): refuses to write AND attestAll degrades", () => {
    // schema-mismatch is NON-rotating, so the read-only state persists across reads --
    // the right fixture to prove attestAll() degrades rather than the one-shot rotate path.
    const p = tmpPath();
    fs.writeFileSync(p, JSON.stringify({ schemaVersion: 999, outcomes: { "alpha|mill": [{ success: true, at: NOW_ISO }] } }), "utf8");
    const eng = E.__forTests(p);
    expect(eng.recordOutcome("alpha", "mill", true, { now: NOW_ISO }).ok).toBe(false);
    const all = eng.attestAll({ now: NOW_ISO });
    expect(all.degraded).toBe(true);
    expect(all.count).toBe(0); // refuses to read peer-newer rows -> empty, flagged degraded
  });
});
