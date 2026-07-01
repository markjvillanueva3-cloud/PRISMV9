/**
 * golf-reviewer-drift-eval.test.mjs — CLEANUP-MS0 / U-CLEANUP-B9 tests
 *
 * Covers:
 *   - parseArgs: flag parsing + bad flag
 *   - loadCorpus: valid / missing / parse-error / malformed / unseeded /
 *     invalid-verdict-on-seeded
 *   - runEval: all-correct / partial / verdict-only-no-credit / unseeded /
 *     reviewer throw / model mismatch / prompt drift
 *   - regressionSlopeOverWindow: flat / declining / improving / <2 points
 *   - medianOf: odd / even / empty / non-mutating
 *   - conformalDriftGate (R4-P1-8): below-band drift / in-band / above-band
 *     (improvement never trips) / cold-start abstain / N=9 engine-parity
 *     boundary / non-finite latest / all-equal radius=0 / no array mutation
 *   - detectDrift precedence: conformal supersedes slope when applicable;
 *     slope only governs in cold-start; floor always-on backstop; the
 *     conformal-vs-slope supersession case (fail-on-revert oracle for the
 *     P1 that the pre-conformal flat-OR semantics masked)
 *   - skippedDriftVerdict + runDriftEval non-evaluated path: NO confident
 *     false drift on the accuracy=0 sentinel (P1-1 regression oracle)
 *   - loadHistory / appendHistory: round-trip, malformed-line skip
 *   - runDriftEval: end-to-end with injected runReviewer, dry-run, error path
 *   - runCli: exit codes
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  parseArgs,
  loadCorpus,
  runEval,
  regressionSlopeOverWindow,
  medianOf,
  conformalDriftGate,
  detectDrift,
  skippedDriftVerdict,
  loadHistory,
  appendHistory,
  runDriftEval,
  runCli,
  SCHEMA_VERSION,
  PINNED_REVIEWER_MODEL,
  DRIFT_SLOPE_THRESHOLD,
  DRIFT_ABSOLUTE_FLOOR,
  DRIFT_WINDOW_WEEKS,
  DEFAULT_CONFORMAL_ALPHA,
} from "../golf-reviewer-drift-eval.mjs";

let TMP_ROOT;
beforeEach(() => {
  TMP_ROOT = mkdtempSync(path.join(os.tmpdir(), "u-cleanup-b9-"));
});

function writeCorpus(entries, extra = {}) {
  const p = path.join(TMP_ROOT, `corpus-${Math.random().toString(36).slice(2, 8)}.json`);
  writeFileSync(p, JSON.stringify({ schemaVersion: 1, entries, ...extra }), "utf-8");
  return p;
}

function seededEntry(id, verdict, severity, sha = "abc123", promptVersion = "v1") {
  return { id, commitSha: sha, description: `desc ${id}`, expectedVerdict: verdict, expectedSeverity: severity, promptVersion };
}

// ── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns defaults for empty argv", () => {
    const o = parseArgs([]);
    expect(o.json).toBe(false);
    expect(o.dryRun).toBe(false);
    expect(o.help).toBe(false);
  });

  it("parses --json --dry-run --corpus --history --now", () => {
    const o = parseArgs(["--json", "--dry-run", "--corpus", "/c", "--history", "/h", "--now", "2026-05-14T00:00:00Z"]);
    expect(o.json).toBe(true);
    expect(o.dryRun).toBe(true);
    expect(o.corpusPath).toBe("/c");
    expect(o.historyPath).toBe("/h");
    expect(o.nowMs).toBe(Date.UTC(2026, 4, 14, 0, 0, 0));
  });

  it("throws on unknown flag (failure mode)", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown flag/);
  });
});

// ── loadCorpus ───────────────────────────────────────────────────────────────

describe("loadCorpus", () => {
  it("loads a fully-seeded corpus (happy path)", () => {
    const p = writeCorpus([
      seededEntry("e1", "bug", "P0"),
      seededEntry("e2", "clean", "none"),
    ]);
    const c = loadCorpus(p);
    expect(c.ok).toBe(true);
    expect(c.reason).toBe("corpus_loaded");
    expect(c.entries.length).toBe(2);
    expect(c.seededCount).toBe(2);
  });

  it("returns corpus_missing for an absent file (failure mode)", () => {
    const c = loadCorpus(path.join(TMP_ROOT, "nope.json"));
    expect(c.ok).toBe(false);
    expect(c.reason).toBe("corpus_missing");
  });

  it("returns corpus_parse_error on malformed JSON (failure mode)", () => {
    const p = path.join(TMP_ROOT, "bad.json");
    writeFileSync(p, "{not-json", "utf-8");
    const c = loadCorpus(p);
    expect(c.ok).toBe(false);
    expect(c.reason).toBe("corpus_parse_error");
  });

  it("returns corpus_malformed when entries is not an array (failure mode)", () => {
    const p = path.join(TMP_ROOT, "noentries.json");
    writeFileSync(p, JSON.stringify({ schemaVersion: 1, entries: "nope" }), "utf-8");
    const c = loadCorpus(p);
    expect(c.ok).toBe(false);
    expect(c.reason).toBe("corpus_malformed");
  });

  it("reports corpus_unseeded when all entries have empty commitSha", () => {
    const p = writeCorpus([
      { id: "e1", commitSha: "", expectedVerdict: "bug", expectedSeverity: "P0", promptVersion: "v1" },
      { id: "e2", commitSha: "", expectedVerdict: "clean", expectedSeverity: "none", promptVersion: "v1" },
    ]);
    const c = loadCorpus(p);
    expect(c.ok).toBe(true);
    expect(c.reason).toBe("corpus_unseeded");
    expect(c.seededCount).toBe(0);
  });

  it("rejects a seeded entry with an invalid verdict (adversarial)", () => {
    const p = writeCorpus([
      { id: "bad", commitSha: "deadbeef", expectedVerdict: "EXPLODE", expectedSeverity: "P0" },
      seededEntry("good", "bug", "P1"),
    ]);
    const c = loadCorpus(p);
    expect(c.entries.length).toBe(1);              // only the good one survives
    expect(c.entries[0].id).toBe("good");
    expect(c.errors.some((e) => e.includes("bad"))).toBe(true);
  });

  it("skips entries missing an id (adversarial)", () => {
    const p = writeCorpus([
      { commitSha: "x", expectedVerdict: "bug", expectedSeverity: "P0" },   // no id
      seededEntry("ok", "clean", "none"),
    ]);
    const c = loadCorpus(p);
    expect(c.entries.length).toBe(1);
    expect(c.entries[0].id).toBe("ok");
  });
});

// ── runEval ──────────────────────────────────────────────────────────────────

describe("runEval", () => {
  it("returns corpus_unseeded when no entries are seeded", async () => {
    const r = await runEval([{ id: "e1", commitSha: "", seeded: false }]);
    expect(r.reason).toBe("corpus_unseeded");
    expect(r.ran).toBe(0);
    expect(r.accuracy).toBe(0);
  });

  it("scores all-correct as accuracy 1.0 (happy path)", async () => {
    const entries = [
      { ...seededEntry("e1", "bug", "P0"), seeded: true },
      { ...seededEntry("e2", "clean", "none"), seeded: true },
    ];
    const r = await runEval(entries, {
      runReviewer: async (e) => ({ verdict: e.expectedVerdict, severity: e.expectedSeverity, model: PINNED_REVIEWER_MODEL, promptVersion: "v1" }),
    });
    expect(r.ran).toBe(2);
    expect(r.correct).toBe(2);
    expect(r.accuracy).toBe(1);
    expect(r.reason).toBe("evaluated");
  });

  it("partial-correct: 1 of 2 → accuracy 0.5", async () => {
    const entries = [
      { ...seededEntry("e1", "bug", "P0"), seeded: true },
      { ...seededEntry("e2", "clean", "none"), seeded: true },
    ];
    const r = await runEval(entries, {
      runReviewer: async (e) => e.id === "e1"
        ? { verdict: "bug", severity: "P0", model: PINNED_REVIEWER_MODEL }
        : { verdict: "bug", severity: "P1", model: PINNED_REVIEWER_MODEL },   // wrong
    });
    expect(r.correct).toBe(1);
    expect(r.accuracy).toBe(0.5);
  });

  it("verdict-only match gets NO credit if severity is wrong (boundary)", async () => {
    const entries = [{ ...seededEntry("e1", "bug", "P0"), seeded: true }];
    const r = await runEval(entries, {
      runReviewer: async () => ({ verdict: "bug", severity: "P2", model: PINNED_REVIEWER_MODEL }),
    });
    expect(r.correct).toBe(0);
    expect(r.perEntry[0].verdictMatch).toBe(true);
    expect(r.perEntry[0].severityMatch).toBe(false);
    expect(r.perEntry[0].isCorrect).toBe(false);
  });

  it("flags modelMismatch when the reviewer used an unpinned model (failure mode)", async () => {
    const entries = [{ ...seededEntry("e1", "bug", "P0"), seeded: true }];
    const r = await runEval(entries, {
      runReviewer: async () => ({ verdict: "bug", severity: "P0", model: "claude-opus-4-7" }),
    });
    expect(r.modelMismatch).toBe(true);
  });

  it("flags promptDriftDetected when reviewer promptVersion differs from corpus (failure mode)", async () => {
    const entries = [{ ...seededEntry("e1", "bug", "P0", "abc", "v1"), seeded: true }];
    const r = await runEval(entries, {
      runReviewer: async () => ({ verdict: "bug", severity: "P0", model: PINNED_REVIEWER_MODEL, promptVersion: "v2" }),
    });
    expect(r.promptDriftDetected).toBe(true);
  });

  it("survives a reviewer that throws on one entry (failure mode: dispatch error)", async () => {
    const entries = [
      { ...seededEntry("e1", "bug", "P0"), seeded: true },
      { ...seededEntry("e2", "clean", "none"), seeded: true },
    ];
    const r = await runEval(entries, {
      runReviewer: async (e) => {
        if (e.id === "e1") throw new Error("dispatch timeout");
        return { verdict: "clean", severity: "none", model: PINNED_REVIEWER_MODEL };
      },
    });
    expect(r.ran).toBe(2);
    expect(r.correct).toBe(1);          // e2 still scored
    expect(r.perEntry.find((p) => p.id === "e1").ok).toBe(false);
    expect(r.perEntry.find((p) => p.id === "e1").error).toBe("dispatch timeout");
  });

  it("default reviewer returns reason=reviewer_not_wired (graceful no-op)", async () => {
    const entries = [{ ...seededEntry("e1", "bug", "P0"), seeded: true }];
    const r = await runEval(entries);
    expect(r.reason).toBe("reviewer_not_wired");
  });
});

// ── regressionSlopeOverWindow ────────────────────────────────────────────────

describe("regressionSlopeOverWindow", () => {
  it("returns 0 for a flat history", () => {
    const w = [{ accuracy: 0.9 }, { accuracy: 0.9 }, { accuracy: 0.9 }];
    expect(regressionSlopeOverWindow(w)).toBeCloseTo(0);
  });

  it("returns the total decline across a declining window", () => {
    // 1.0 → 0.8 over 3 points = total change -0.2.
    const w = [{ accuracy: 1.0 }, { accuracy: 0.9 }, { accuracy: 0.8 }];
    expect(regressionSlopeOverWindow(w)).toBeCloseTo(-0.2);
  });

  it("returns positive for an improving window", () => {
    const w = [{ accuracy: 0.7 }, { accuracy: 0.85 }, { accuracy: 1.0 }];
    expect(regressionSlopeOverWindow(w)).toBeCloseTo(0.3);
  });

  it("returns 0 for fewer than 2 points (boundary)", () => {
    expect(regressionSlopeOverWindow([])).toBe(0);
    expect(regressionSlopeOverWindow([{ accuracy: 0.5 }])).toBe(0);
  });

  it("treats non-finite accuracy as 0 (adversarial)", () => {
    const w = [{ accuracy: 1.0 }, { accuracy: NaN }, { accuracy: 1.0 }];
    // mid point clamped to 0 — slope should be ~0 (symmetric dip).
    expect(Number.isFinite(regressionSlopeOverWindow(w))).toBe(true);
  });
});

// ── detectDrift ──────────────────────────────────────────────────────────────

describe("medianOf", () => {
  it("odd length → middle element", () => {
    expect(medianOf([3, 1, 2])).toBe(2);
  });
  it("even length → mean of the two central elements", () => {
    expect(medianOf([1, 2, 3, 4])).toBe(2.5);
  });
  it("empty → 0 (caller guards applicability)", () => {
    expect(medianOf([])).toBe(0);
  });
  it("does NOT mutate the caller's array (adversarial)", () => {
    const a = [5, 1, 3];
    medianOf(a);
    expect(a).toEqual([5, 1, 3]);
  });
});

// ── conformalDriftGate (R4-P1-8) ─────────────────────────────────────────────

describe("conformalDriftGate", () => {
  // 11 stable points ~0.92 → predictor 0.92, residuals tiny, tight band.
  const STABLE = Array.from({ length: 11 }, (_, i) =>
    ({ ts: i, accuracy: [0.92, 0.93, 0.91, 0.92, 0.94, 0.90, 0.92, 0.93, 0.91, 0.92, 0.93][i] }));

  it("trips when latest accuracy falls below the conformal lower band", () => {
    const g = conformalDriftGate(STABLE, 0.55);
    expect(g.applicable).toBe(true);
    expect(g.tripped).toBe(true);
    expect(g.predictor).toBe(0.92);
    // N=11, α=0.10 → k = ⌈12·0.9⌉ = ⌈10.8⌉ = 11 (engine rank-rule parity).
    expect(g.rankUsed).toBe(11);
    expect(g.reason).toMatch(/below conformal band/);
  });

  it("does NOT trip when latest is inside the band", () => {
    const g = conformalDriftGate(STABLE, 0.925);
    expect(g.applicable).toBe(true);
    expect(g.tripped).toBe(false);
    expect(g.aboveBand).toBe(false);
  });

  it("ONE-SIDED: a latest far ABOVE the band is improvement, never drift", () => {
    const g = conformalDriftGate(STABLE, 0.999);
    expect(g.applicable).toBe(true);
    expect(g.tripped).toBe(false);          // improvement is not drift
    expect(g.aboveBand).toBe(true);
  });

  it("ABSTAINS in cold-start (N=8 < 9) — mirrors engine MIN_CALIBRATION_FOR_ALPHA", () => {
    const window = Array.from({ length: 8 }, (_, i) => ({ ts: i, accuracy: 0.9 }));
    const g = conformalDriftGate(window, 0.1);
    expect(g.applicable).toBe(false);       // k=⌈9·0.9⌉=9 > 8 → abstain
    expect(g.tripped).toBe(false);
  });

  it("ACTIVATES at exactly N=9 (engine-parity boundary, ⌈1/α⌉−1=9 at α=0.10)", () => {
    const window = Array.from({ length: 9 }, (_, i) => ({ ts: i, accuracy: 0.9 }));
    const g = conformalDriftGate(window, 0.5);
    expect(g.applicable).toBe(true);        // k=⌈10·0.9⌉=⌈9.0⌉=9 ≤ 9
    expect(g.rankUsed).toBe(9);
    expect(g.tripped).toBe(true);           // 0.5 far below the all-0.9 band
  });

  it("non-finite latest never trips (cannot be below a band)", () => {
    const g = conformalDriftGate(STABLE, NaN);
    expect(g.applicable).toBe(true);
    expect(g.tripped).toBe(false);
    expect(g.aboveBand).toBe(false);
  });

  it("all-equal history → radius 0; a value strictly below the point trips, equal does NOT", () => {
    const window = Array.from({ length: 11 }, (_, i) => ({ ts: i, accuracy: 0.8 }));
    expect(conformalDriftGate(window, 0.8).tripped).toBe(false);   // == predictor, not < low
    expect(conformalDriftGate(window, 0.79).tripped).toBe(true);   // strictly below
    expect(conformalDriftGate(window, 0.8).radius).toBe(0);
  });

  it("filters non-finite calibration accuracies before computing N", () => {
    const window = [
      ...Array.from({ length: 9 }, (_, i) => ({ ts: i, accuracy: 0.9 })),
      { ts: 9, accuracy: NaN }, { ts: 10, accuracy: Infinity },
    ];
    const g = conformalDriftGate(window, 0.5);
    expect(g.n).toBe(9);                     // 2 non-finite dropped
    expect(g.applicable).toBe(true);
    // Prove the filter actually ran: a leaked NaN residual would make the
    // radius non-finite. Finite radius ⇒ non-finite calib was stripped.
    expect(Number.isFinite(g.radius)).toBe(true);
    expect(g.radius).toBe(0);                // all 9 finite values equal 0.9
  });

  it("does NOT mutate the caller's window array (adversarial)", () => {
    const window = STABLE.map((r) => ({ ...r }));
    const snapshot = JSON.stringify(window);
    conformalDriftGate(window, 0.5);
    expect(JSON.stringify(window)).toBe(snapshot);
  });

  it("honors an injected alpha; invalid alpha falls back to the default", () => {
    expect(conformalDriftGate(STABLE, 0.5, 0.5).alpha).toBe(0.5);
    expect(conformalDriftGate(STABLE, 0.5, 2).alpha).toBe(DEFAULT_CONFORMAL_ALPHA);
  });

  it("alpha actually drives the band width (higher α ⇒ smaller rank ⇒ tighter band)", () => {
    // k = ⌈(N+1)(1−α)⌉ on the same N=11 calibration set:
    //   α=0.10 → k=⌈12·0.90⌉=11 (radius = 11th/largest residual)
    //   α=0.50 → k=⌈12·0.50⌉=6  (radius = 6th residual ≤ 11th)
    // Higher α selects a lower-rank (smaller) residual ⇒ tighter band.
    const wide = conformalDriftGate(STABLE, 0.5, 0.10);
    const tight = conformalDriftGate(STABLE, 0.5, 0.50);
    expect(wide.rankUsed).toBe(11);
    expect(tight.rankUsed).toBe(6);
    expect(tight.radius).toBeLessThan(wide.radius);
  });
});

// ── detectDrift (precedence: conformal supersedes slope; floor always-on) ─────

describe("detectDrift", () => {
  it("no drift for a flat, healthy history (conformal applicable, in-band)", () => {
    const history = Array.from({ length: 12 }, (_, i) => ({ ts: i, accuracy: 0.95 }));
    const d = detectDrift(history, 0.95);
    expect(d.drifted).toBe(false);
    expect(d.primaryGate).toBe("conformal");
    expect(d.conformal.applicable).toBe(true);
    expect(d.conformalTripped).toBe(false);
    expect(d.floorTripped).toBe(false);
  });

  it("CONFORMAL gate trips + is the primary signal when applicable", () => {
    const history = Array.from({ length: 11 }, () => ({ ts: 0, accuracy: 0.92 }));
    const d = detectDrift(history, 0.55);
    expect(d.primaryGate).toBe("conformal");
    expect(d.conformalTripped).toBe(true);
    expect(d.drifted).toBe(true);
    expect(d.reasons.some((r) => r.includes("conformal band"))).toBe(true);
  });

  it("SUPERSESSION oracle: conformal applicable + in-band ⇒ a steep slope does NOT cause drift " +
     "(fail-on-revert: the pre-conformal flat-OR would have fired here)", () => {
    // 12 rows declining 1.00→0.45 (slope ≪ −0.20) but the band is wide
    // enough that latest 0.48 sits inside it. Pre-change semantics
    // (slope folds into drifted) → drifted:true. New precedence: conformal
    // governs, latest in-band, floor (0.48<0.70) is the ONLY backstop.
    const history = Array.from({ length: 12 }, (_, i) => ({ ts: i, accuracy: 1.0 - i * 0.05 }));
    const d = detectDrift(history, 0.48);
    expect(d.slopeTripped).toBe(true);              // slope IS steep
    expect(d.primaryGate).toBe("conformal");        // but conformal governs
    expect(d.conformalTripped).toBe(false);         // latest within band
    // slope must NOT contribute a reason when conformal is applicable
    expect(d.reasons.some((r) => r.includes("slope"))).toBe(false);
    // drifted here is driven ONLY by the always-on floor backstop, never slope
    expect(d.floorTripped).toBe(true);
    expect(d.drifted).toBe(true);
  });

  it("SLOPE governs ONLY in cold-start (conformal abstains, N<9)", () => {
    // 6 rows 0.99→0.74 step −0.05 → slope/step −0.05 ×5 = −0.25 < −0.20.
    const history = Array.from({ length: 6 }, (_, i) => ({ ts: i, accuracy: 0.99 - i * 0.05 }));
    const d = detectDrift(history, 0.74);            // ≥ floor, isolates slope
    expect(d.conformal.applicable).toBe(false);
    expect(d.primaryGate).toBe("slope+floor");
    expect(d.slopeTripped).toBe(true);
    expect(d.floorTripped).toBe(false);
    expect(d.drifted).toBe(true);
    expect(d.reasons.some((r) => r.includes("slope"))).toBe(true);
  });

  it("FLOOR is an always-on backstop independent of the drift signal", () => {
    const history = [{ ts: 0, accuracy: 0.95 }, { ts: 1, accuracy: 0.55 }];
    const d = detectDrift(history, 0.55);
    expect(d.conformal.applicable).toBe(false);      // N=2 cold-start
    expect(d.floorTripped).toBe(true);
    expect(d.drifted).toBe(true);
    expect(d.reasons.some((r) => r.includes("floor"))).toBe(true);
  });

  it("accuracy exactly at the floor does NOT trip the floor gate (boundary: >= floor)", () => {
    const history = [{ ts: 0, accuracy: 0.70 }, { ts: 1, accuracy: 0.70 }];
    const d = detectDrift(history, DRIFT_ABSOLUTE_FLOOR);
    expect(d.floorTripped).toBe(false);
  });

  it("accuracy one notch below the floor DOES trip (boundary)", () => {
    const d = detectDrift([{ ts: 0, accuracy: 0.95 }], DRIFT_ABSOLUTE_FLOOR - 0.001);
    expect(d.floorTripped).toBe(true);
  });

  it("respects injected windowWeeks / slopeThreshold / absoluteFloor / conformalAlpha", () => {
    const history = [{ ts: 0, accuracy: 0.9 }, { ts: 1, accuracy: 0.85 }];
    const d = detectDrift(history, 0.85, { windowWeeks: 2, slopeThreshold: -0.01, absoluteFloor: 0.5 });
    expect(d.conformal.applicable).toBe(false);      // window=2 → cold-start
    expect(d.primaryGate).toBe("slope+floor");
    expect(d.slopeTripped).toBe(true);               // -0.05 total < -0.01 override
    expect(d.floorTripped).toBe(false);              // 0.85 >= 0.5 override
    expect(d.threshold.conformalAlpha).toBe(DEFAULT_CONFORMAL_ALPHA);
  });

  it("conformalUpgradeAvailable reflects conformal.applicable (dynamic, not a static marker)", () => {
    const cold = detectDrift([{ ts: 0, accuracy: 0.9 }], 0.9);
    expect(cold.conformalUpgradeAvailable).toBe(false);   // N=1 abstain
    const warm = detectDrift(Array.from({ length: 11 }, () => ({ ts: 0, accuracy: 0.9 })), 0.9);
    expect(warm.conformalUpgradeAvailable).toBe(true);    // N=11 applicable
  });
});

// ── skippedDriftVerdict + non-evaluated path (P1-1 regression oracle) ─────────

describe("skippedDriftVerdict / non-evaluated path", () => {
  it("skippedDriftVerdict is shape-compatible and never reports drift", () => {
    const v = skippedDriftVerdict(7, "corpus_unseeded");
    expect(v.drifted).toBe(false);
    expect(v.primaryGate).toMatch(/not evaluated/);
    expect(v.conformal.applicable).toBe(false);
    expect(v.windowSize).toBe(7);
    expect(v.reasons[0]).toMatch(/skipped — no evaluation/);
    expect(v.conformalUpgradeAvailable).toBe(false);
  });

  it("FAIL-ON-REVERT: an unseeded corpus over a HEALTHY history must NOT scream drift", async () => {
    // The pre-fix bug: evalResult.accuracy=0 (reason!=='evaluated') flowed
    // into detectDrift → conformal+floor both screamed a confident false
    // 'DRIFTED' on every cold-start week (the default state until seeded).
    const dir = mkdtempSync(path.join(os.tmpdir(), "b9-p1-"));
    const corpusPath = path.join(dir, "corpus.json");
    writeFileSync(corpusPath, JSON.stringify({
      schemaVersion: 1,
      entries: Array.from({ length: 10 }, (_, i) => ({
        id: `e${i}`, commitSha: "", description: "d",
        expectedVerdict: "bug", expectedSeverity: "P1", promptVersion: "v1",
      })),
    }));
    const historyPath = path.join(dir, "h.jsonl");
    writeFileSync(historyPath, Array.from({ length: 12 }, (_, i) =>
      JSON.stringify({ schemaVersion: 1, ts: i + 1, accuracy: 0.95, reason: "evaluated" })).join("\n") + "\n");
    const r = await runDriftEval({ corpusPath, historyPath, dryRun: true });
    expect(r.ok).toBe(true);
    expect(r.eval.reason).toBe("corpus_unseeded");
    expect(r.drift.drifted).toBe(false);                 // ← the oracle
    expect(r.drift.primaryGate).toMatch(/not evaluated/);
  });
});

// ── loadHistory / appendHistory ──────────────────────────────────────────────

describe("history", () => {
  it("appendHistory → loadHistory round-trips chronologically", () => {
    const p = path.join(TMP_ROOT, "hist.jsonl");
    appendHistory(p, { ts: 100, accuracy: 0.9 }, []);
    appendHistory(p, { ts: 200, accuracy: 0.85 }, loadHistory(p));
    const h = loadHistory(p);
    expect(h.length).toBe(2);
    expect(h[0].ts).toBe(100);
    expect(h[1].ts).toBe(200);
  });

  it("loadHistory returns [] for a missing file (graceful)", () => {
    expect(loadHistory(path.join(TMP_ROOT, "nope.jsonl"))).toEqual([]);
  });

  it("loadHistory skips malformed lines (adversarial)", () => {
    const p = path.join(TMP_ROOT, "mixed.jsonl");
    writeFileSync(p, '{"ts":1,"accuracy":0.9}\n{bad-line\n{"ts":2,"accuracy":0.8}\n', "utf-8");
    const h = loadHistory(p);
    expect(h.length).toBe(2);
  });

  it("loadHistory sorts out-of-order rows by ts", () => {
    const p = path.join(TMP_ROOT, "unsorted.jsonl");
    writeFileSync(p, '{"ts":300,"accuracy":0.7}\n{"ts":100,"accuracy":0.9}\n{"ts":200,"accuracy":0.8}\n', "utf-8");
    const h = loadHistory(p);
    expect(h.map((r) => r.ts)).toEqual([100, 200, 300]);
  });
});

// ── runDriftEval ─────────────────────────────────────────────────────────────

describe("runDriftEval", () => {
  it("end-to-end: seeded corpus + injected reviewer → appends a history row", async () => {
    const corpusPath = writeCorpus([
      seededEntry("e1", "bug", "P0"),
      seededEntry("e2", "clean", "none"),
    ]);
    const historyPath = path.join(TMP_ROOT, "history.jsonl");
    const r = await runDriftEval({
      corpusPath, historyPath, nowMs: Date.UTC(2026, 4, 14),
      runReviewer: async (e) => ({ verdict: e.expectedVerdict, severity: e.expectedSeverity, model: PINNED_REVIEWER_MODEL, promptVersion: "v1" }),
    });
    expect(r.ok).toBe(true);
    expect(r.eval.accuracy).toBe(1);
    expect(r.eval.reason).toBe("evaluated");
    expect(r.history.appended).toBe(true);
    expect(existsSync(historyPath)).toBe(true);
    const h = loadHistory(historyPath);
    expect(h.length).toBe(1);
    expect(h[0].accuracy).toBe(1);
  });

  it("does NOT append a history row for an unseeded corpus", async () => {
    const corpusPath = writeCorpus([
      { id: "e1", commitSha: "", expectedVerdict: "bug", expectedSeverity: "P0" },
    ]);
    const historyPath = path.join(TMP_ROOT, "history-unseeded.jsonl");
    const r = await runDriftEval({ corpusPath, historyPath });
    expect(r.ok).toBe(true);
    expect(r.corpus.reason).toBe("corpus_unseeded");
    expect(r.history.appended).toBe(false);
    expect(existsSync(historyPath)).toBe(false);
  });

  it("dry-run does NOT append a history row even with a real eval", async () => {
    const corpusPath = writeCorpus([seededEntry("e1", "bug", "P0")]);
    const historyPath = path.join(TMP_ROOT, "history-dry.jsonl");
    const r = await runDriftEval({
      corpusPath, historyPath, dryRun: true,
      runReviewer: async (e) => ({ verdict: e.expectedVerdict, severity: e.expectedSeverity, model: PINNED_REVIEWER_MODEL }),
    });
    expect(r.dryRun).toBe(true);
    expect(r.history.appended).toBe(false);
    expect(existsSync(historyPath)).toBe(false);
  });

  it("returns ok:false with error when the corpus is missing", async () => {
    const r = await runDriftEval({
      corpusPath: path.join(TMP_ROOT, "no-corpus.json"),
      historyPath: path.join(TMP_ROOT, "h.jsonl"),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("corpus_missing");
  });

  it("flags drift when prior history shows a steep decline", async () => {
    const corpusPath = writeCorpus([seededEntry("e1", "bug", "P0"), seededEntry("e2", "clean", "none")]);
    const historyPath = path.join(TMP_ROOT, "history-drift.jsonl");
    // Pre-seed a declining 12-week history.
    const declining = Array.from({ length: 12 }, (_, i) =>
      JSON.stringify({ schemaVersion: 1, ts: i * 1000, accuracy: 1.0 - i * 0.04, ran: 2, correct: 2, reason: "evaluated" }));
    writeFileSync(historyPath, declining.join("\n") + "\n", "utf-8");
    // This week's eval is poor (0.5) — both the floor + slope should trip.
    const r = await runDriftEval({
      corpusPath, historyPath, nowMs: 999_999,
      runReviewer: async (e) => e.id === "e1"
        ? { verdict: "bug", severity: "P0", model: PINNED_REVIEWER_MODEL }
        : { verdict: "bug", severity: "P1", model: PINNED_REVIEWER_MODEL },   // wrong
    });
    expect(r.ok).toBe(true);
    expect(r.eval.accuracy).toBe(0.5);
    expect(r.drift.drifted).toBe(true);
    expect(r.drift.floorTripped).toBe(true);
  });
});

// ── runCli ───────────────────────────────────────────────────────────────────

describe("runCli", () => {
  it("exit 2 on --help with usage text", async () => {
    const out = { written: "", write(s) { this.written += s; } };
    const code = await runCli(["--help"], { stdout: out, stderr: { write() {} } });
    expect(code).toBe(2);
    expect(out.written.includes("U-CLEANUP-B9")).toBe(true);
  });

  it("exit 2 on bad flag", async () => {
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(["--bogus"], { stdout: { write() {} }, stderr: err });
    expect(code).toBe(2);
    expect(err.written.includes("Unknown flag")).toBe(true);
  });

  it("exit 1 when the corpus is missing", async () => {
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(
      ["--corpus", path.join(TMP_ROOT, "missing.json"), "--history", path.join(TMP_ROOT, "h.jsonl")],
      { stdout: { write() {} }, stderr: err },
    );
    expect(code).toBe(1);
    expect(err.written.includes("corpus_missing")).toBe(true);
  });

  it("exit 0 + JSON on a successful seeded run", async () => {
    const corpusPath = writeCorpus([seededEntry("e1", "bug", "P0")]);
    const historyPath = path.join(TMP_ROOT, "cli-history.jsonl");
    const out = { written: "", write(s) { this.written += s; } };
    const err = { written: "", write(s) { this.written += s; } };
    const code = await runCli(
      ["--json", "--corpus", corpusPath, "--history", historyPath],
      {
        stdout: out, stderr: err,
        runReviewer: async (e) => ({ verdict: e.expectedVerdict, severity: e.expectedSeverity, model: PINNED_REVIEWER_MODEL }),
      },
    );
    expect(code).toBe(0);
    const parsed = JSON.parse(out.written);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.eval.accuracy).toBe(1);
  });
});
