/**
 * Tests for kip-lora-rotation.mjs — KNOWLEDGE-CONVERSION-MS0/U-KIP03.
 *
 * Pure-core extractor tests (hermetic, no disk) + 1 real-data E2E that hits
 * the live KIP ledgers if present (and degrades gracefully if absent — the
 * production state at creation time is `no ledgers yet`).
 *
 * Run: node --test H:/prism/scripts/lib/kip-lora-rotation.test.mjs
 */
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  extractRotationCandidates,
  renderCandidatesJsonl,
} from "./kip-lora-rotation.mjs";

const FROZEN = "2026-05-19T12:00:00.000Z";

function injectionRecord(id, kind = "algorithm", lane = "C", ts = "2026-05-17T00:00:00.000Z") {
  return {
    injectionId: id,
    ts,
    kind,
    name: `${kind}-${id}`,
    courseId: "MIT-OCW-18.06",
    lane,
    injectionTarget: "forge-queue",
    boundSystems: ["prism-os", "obsidian", "prism-ai"],
    bindingsWritten: 3,
    bindingsSkipped: 0,
    ok: true,
  };
}

function outcomeRecord(id, helped, ts = "2026-05-18T00:00:00.000Z", consumedBy = "test-node") {
  return { injectionId: id, ts, consumedBy, helped, evidence: "" };
}

describe("extractRotationCandidates", () => {
  describe("happy path", () => {
    it("classifies orphans (zero outcomes) correctly", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-A"), injectionRecord("kip-B")],
        [],
        { frozenTime: FROZEN },
      );
      assert.equal(out.summary.totalInjections, 2);
      assert.equal(out.summary.orphanCount, 2);
      assert.equal(out.summary.lowHelpRateCount, 0);
      assert.equal(out.summary.candidateCount, 2);
      assert.equal(out.candidates.length, 2);
      for (const c of out.candidates) {
        assert.equal(c.reason, "orphan");
        assert.equal(c.outcomeCount, 0);
        assert.equal(c.helpedCount, 0);
        assert.equal(c.helpRate, null);
        assert.equal(c.lastOutcomeAt, null);
        assert.equal(c.selectedAt, FROZEN);
        assert.equal(c.schemaVersion, 1);
      }
    });

    it("classifies low-help-rate when ratio < threshold", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-X")],
        [
          outcomeRecord("kip-X", false),
          outcomeRecord("kip-X", false),
          outcomeRecord("kip-X", true),
        ],
        { frozenTime: FROZEN, helpRateThreshold: 0.5 },
      );
      assert.equal(out.candidates.length, 1);
      const c = out.candidates[0];
      assert.equal(c.reason, "low-help-rate");
      assert.equal(c.outcomeCount, 3);
      assert.equal(c.helpedCount, 1);
      assert.equal(c.helpRate, 1 / 3);
      assert.equal(out.summary.lowHelpRateCount, 1);
      assert.equal(out.summary.healthyCount, 0);
    });

    it("skips healthy injections (helpRate >= threshold)", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-H")],
        [
          outcomeRecord("kip-H", true),
          outcomeRecord("kip-H", true),
          outcomeRecord("kip-H", false),
        ],
        { frozenTime: FROZEN, helpRateThreshold: 0.5 },
      );
      assert.equal(out.candidates.length, 0);
      assert.equal(out.summary.candidateCount, 0);
      assert.equal(out.summary.healthyCount, 1);
    });

    it("handles mixed orphan + low-help + healthy", () => {
      const out = extractRotationCandidates(
        [
          injectionRecord("kip-orphan"),
          injectionRecord("kip-low"),
          injectionRecord("kip-good"),
        ],
        [
          outcomeRecord("kip-low", false),
          outcomeRecord("kip-low", false),
          outcomeRecord("kip-good", true),
          outcomeRecord("kip-good", true),
        ],
        { frozenTime: FROZEN, helpRateThreshold: 0.5 },
      );
      assert.equal(out.summary.totalInjections, 3);
      assert.equal(out.summary.orphanCount, 1);
      assert.equal(out.summary.lowHelpRateCount, 1);
      assert.equal(out.summary.healthyCount, 1);
      assert.equal(out.candidates.length, 2);
      // orphan sorts before low-help-rate
      assert.equal(out.candidates[0].reason, "orphan");
      assert.equal(out.candidates[0].injectionId, "kip-orphan");
      assert.equal(out.candidates[1].reason, "low-help-rate");
      assert.equal(out.candidates[1].injectionId, "kip-low");
    });
  });

  describe("edge cases", () => {
    it("empty inputs → empty result", () => {
      const out = extractRotationCandidates([], [], { frozenTime: FROZEN });
      assert.equal(out.candidates.length, 0);
      assert.equal(out.summary.totalInjections, 0);
      assert.equal(out.summary.candidateCount, 0);
      assert.equal(out.summary.selectedAt, FROZEN);
    });

    it("outcomes for unknown injectionId are silently ignored (left-anchored join)", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-real")],
        [outcomeRecord("kip-real", true), outcomeRecord("kip-ghost", true)],
        { frozenTime: FROZEN },
      );
      assert.equal(out.summary.totalInjections, 1);
      // kip-real consumed once with helped=true → healthy, no candidate
      assert.equal(out.summary.healthyCount, 1);
      assert.equal(out.candidates.length, 0);
    });

    it("dedups injection records by id keeping earliest ts", () => {
      const out = extractRotationCandidates(
        [
          injectionRecord("kip-dup", "algorithm", "C", "2026-05-19T00:00:00.000Z"),
          injectionRecord("kip-dup", "algorithm", "C", "2026-05-17T00:00:00.000Z"),
          injectionRecord("kip-dup", "algorithm", "C", "2026-05-18T00:00:00.000Z"),
        ],
        [],
        { frozenTime: FROZEN },
      );
      assert.equal(out.summary.totalInjections, 1);
      assert.equal(out.candidates.length, 1);
      // firstInjectedAt should be the earliest of the three (May 17)
      assert.equal(out.candidates[0].firstInjectedAt, "2026-05-17T00:00:00.000Z");
    });

    it("orphan precedence: zero outcomes always wins over threshold check", () => {
      // helpRateThreshold=0 would make NO normal injection low-help-rate
      // (helpRate < 0 is impossible), but an injection with 0 outcomes still
      // surfaces as orphan because the check is mutually exclusive.
      const out = extractRotationCandidates(
        [injectionRecord("kip-zero")],
        [],
        { frozenTime: FROZEN, helpRateThreshold: 0 },
      );
      assert.equal(out.candidates[0].reason, "orphan");
    });

    it("low-help-rate sorts ASC by helpRate (worst first)", () => {
      const out = extractRotationCandidates(
        [
          injectionRecord("kip-mid"),
          injectionRecord("kip-worst"),
          injectionRecord("kip-medium"),
        ],
        [
          // kip-worst: 0/2 helped (helpRate=0)
          outcomeRecord("kip-worst", false),
          outcomeRecord("kip-worst", false),
          // kip-mid: 1/4 helped (helpRate=0.25)
          outcomeRecord("kip-mid", true),
          outcomeRecord("kip-mid", false),
          outcomeRecord("kip-mid", false),
          outcomeRecord("kip-mid", false),
          // kip-medium: 1/3 (helpRate≈0.333)
          outcomeRecord("kip-medium", true),
          outcomeRecord("kip-medium", false),
          outcomeRecord("kip-medium", false),
        ],
        { frozenTime: FROZEN, helpRateThreshold: 0.5 },
      );
      assert.equal(out.candidates.length, 3);
      assert.equal(out.candidates[0].injectionId, "kip-worst");
      assert.equal(out.candidates[1].injectionId, "kip-mid");
      assert.equal(out.candidates[2].injectionId, "kip-medium");
    });

    it("minConsumeForHelpRate gates low-help-rate selection", () => {
      // 1 outcome with helped=false would normally classify as low-help-rate
      // (helpRate=0 < 0.5), but minConsumeForHelpRate=3 says we need ≥3
      // outcomes before the help-rate metric becomes trustworthy.
      const out = extractRotationCandidates(
        [injectionRecord("kip-thin")],
        [outcomeRecord("kip-thin", false)],
        { frozenTime: FROZEN, helpRateThreshold: 0.5, minConsumeForHelpRate: 3 },
      );
      assert.equal(out.candidates.length, 0);
      assert.equal(out.summary.healthyCount, 1);
      assert.equal(out.summary.lowHelpRateCount, 0);
    });

    it("threshold of exactly 0 means no low-help-rate ever fires (helpRate < 0 impossible)", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-zero-thresh")],
        [outcomeRecord("kip-zero-thresh", false), outcomeRecord("kip-zero-thresh", false)],
        { frozenTime: FROZEN, helpRateThreshold: 0 },
      );
      // helpRate=0, threshold=0 → NOT `< 0` → not a candidate
      assert.equal(out.candidates.length, 0);
      assert.equal(out.summary.healthyCount, 1);
    });

    it("threshold of 1.0 means anything < perfect is low-help-rate", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-99")],
        Array.from({ length: 100 }, (_, i) => outcomeRecord("kip-99", i < 99)),
        { frozenTime: FROZEN, helpRateThreshold: 1.0 },
      );
      assert.equal(out.candidates.length, 1);
      assert.equal(out.candidates[0].reason, "low-help-rate");
      assert.equal(out.candidates[0].helpRate, 0.99);
    });

    it("lastOutcomeAt tracks the chronologically latest outcome ts", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-ts")],
        [
          outcomeRecord("kip-ts", false, "2026-05-19T00:00:00.000Z"),
          outcomeRecord("kip-ts", false, "2026-05-17T00:00:00.000Z"),
          outcomeRecord("kip-ts", false, "2026-05-18T00:00:00.000Z"),
        ],
        { frozenTime: FROZEN, helpRateThreshold: 0.5 },
      );
      assert.equal(out.candidates[0].lastOutcomeAt, "2026-05-19T00:00:00.000Z");
    });
  });

  describe("R12 fail-loud on bad input", () => {
    it("throws on non-array injections", () => {
      assert.throws(
        () => extractRotationCandidates(null, []),
        /injections must be an array/,
      );
      assert.throws(
        () => extractRotationCandidates({}, []),
        /injections must be an array/,
      );
      assert.throws(
        () => extractRotationCandidates("oops", []),
        /injections must be an array/,
      );
    });

    it("throws on non-array outcomes", () => {
      assert.throws(
        () => extractRotationCandidates([], null),
        /outcomes must be an array/,
      );
      assert.throws(
        () => extractRotationCandidates([], 42),
        /outcomes must be an array/,
      );
    });

    it("silently skips malformed injection rows (no injectionId)", () => {
      const out = extractRotationCandidates(
        [
          injectionRecord("kip-good"),
          { ts: "..." }, // no injectionId
          null,
          { injectionId: "" }, // empty string
        ],
        [],
        { frozenTime: FROZEN },
      );
      assert.equal(out.summary.totalInjections, 1);
      assert.equal(out.candidates.length, 1);
      assert.equal(out.candidates[0].injectionId, "kip-good");
    });

    it("silently skips malformed outcome rows", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-test")],
        [
          { injectionId: "kip-test", helped: true }, // missing consumedBy / evidence → still counts as outcome
          null,
          { ts: "..." }, // no injectionId
        ],
        { frozenTime: FROZEN, helpRateThreshold: 0.5 },
      );
      // Only the first row counts; helped=true → healthy
      assert.equal(out.summary.healthyCount, 1);
      assert.equal(out.candidates.length, 0);
    });
  });

  describe("options tolerance", () => {
    it("ignores non-numeric thresholds (falls through to defaults)", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-d")],
        [outcomeRecord("kip-d", false), outcomeRecord("kip-d", false)],
        // @ts-ignore - intentionally bad input shape
        { helpRateThreshold: "broken", minConsumeForHelpRate: "also-broken", frozenTime: FROZEN },
      );
      // Default threshold is 0.5; helpRate=0 → low-help-rate
      assert.equal(out.candidates.length, 1);
      assert.equal(out.candidates[0].reason, "low-help-rate");
      assert.equal(out.summary.thresholds.helpRateThreshold, 0.5);
      assert.equal(out.summary.thresholds.minConsumeForHelpRate, 1);
    });

    it("clamps threshold to [0, 1]", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-clamp")],
        [outcomeRecord("kip-clamp", true)],
        { helpRateThreshold: 5, frozenTime: FROZEN },
      );
      assert.equal(out.summary.thresholds.helpRateThreshold, 1);
    });

    it("rejects minConsumeForHelpRate < 1 (falls to default)", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-mc")],
        [],
        { minConsumeForHelpRate: 0, frozenTime: FROZEN },
      );
      assert.equal(out.summary.thresholds.minConsumeForHelpRate, 1);
    });

    it("rejects non-integer minConsumeForHelpRate", () => {
      const out = extractRotationCandidates(
        [injectionRecord("kip-mc2")],
        [],
        { minConsumeForHelpRate: 2.7, frozenTime: FROZEN },
      );
      assert.equal(out.summary.thresholds.minConsumeForHelpRate, 1);
    });

    it("uses real new Date().toISOString() when frozenTime missing", () => {
      const before = Date.now();
      const out = extractRotationCandidates([], []);
      const after = Date.now();
      const t = new Date(out.summary.selectedAt).getTime();
      assert.ok(t >= before && t <= after, `selectedAt ${out.summary.selectedAt} should be in [${before}, ${after}]`);
    });

    it("tolerates undefined opts (no second-arg crash)", () => {
      const out = extractRotationCandidates([], []);
      assert.equal(out.summary.thresholds.helpRateThreshold, 0.5);
    });

    it("tolerates null opts (does not throw on property access)", () => {
      // @ts-ignore - intentionally bad input shape
      const out = extractRotationCandidates([], [], null);
      assert.equal(out.summary.thresholds.helpRateThreshold, 0.5);
    });
  });
});

describe("renderCandidatesJsonl", () => {
  it("empty list → empty string (NOT bare newline)", () => {
    assert.equal(renderCandidatesJsonl([]), "");
  });

  it("single candidate → one line + trailing newline", () => {
    const out = extractRotationCandidates([injectionRecord("kip-r")], [], { frozenTime: FROZEN });
    const text = renderCandidatesJsonl(out.candidates);
    assert.ok(text.endsWith("\n"), "should end with newline");
    assert.equal(text.split("\n").filter(Boolean).length, 1);
    const parsed = JSON.parse(text.trim());
    assert.equal(parsed.injectionId, "kip-r");
  });

  it("multiple candidates → one line per record", () => {
    const out = extractRotationCandidates(
      [injectionRecord("kip-A"), injectionRecord("kip-B"), injectionRecord("kip-C")],
      [],
      { frozenTime: FROZEN },
    );
    const text = renderCandidatesJsonl(out.candidates);
    const lines = text.split("\n").filter(Boolean);
    assert.equal(lines.length, 3);
    for (const line of lines) {
      const parsed = JSON.parse(line);
      assert.equal(parsed.reason, "orphan");
    }
  });

  it("throws on non-array", () => {
    // @ts-ignore - intentionally bad input shape
    assert.throws(() => renderCandidatesJsonl(null), /must be an array/);
  });

  it("output is round-trippable via JSON.parse(line)", () => {
    const out = extractRotationCandidates(
      [injectionRecord("kip-rt")],
      [outcomeRecord("kip-rt", false), outcomeRecord("kip-rt", false)],
      { frozenTime: FROZEN },
    );
    const text = renderCandidatesJsonl(out.candidates);
    const lines = text.trim().split("\n");
    for (const line of lines) {
      const parsed = JSON.parse(line);
      assert.equal(parsed.schemaVersion, 1);
      assert.ok(parsed.injectionId);
      assert.ok(["orphan", "low-help-rate"].includes(parsed.reason));
    }
  });
});

describe("real-data E2E", () => {
  it("runs against live KIP ledgers without crashing (or degrades gracefully if absent)", () => {
    const repoRoot = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..", "..");
    const ledgerPath = resolve(repoRoot, "state/shared/knowledge-injection-ledger.jsonl");
    const outcomesPath = resolve(repoRoot, "state/shared/knowledge-injection-outcomes.jsonl");

    /** @type {import("./kip-lora-rotation.mjs").InjectionRecord[]} */
    const injections = [];
    if (existsSync(ledgerPath)) {
      const raw = readFileSync(ledgerPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const t = line.trim();
        if (!t) continue;
        try { injections.push(JSON.parse(t)); } catch { /* skip corrupt */ }
      }
    }
    /** @type {import("./kip-lora-rotation.mjs").OutcomeRecord[]} */
    const outcomes = [];
    if (existsSync(outcomesPath)) {
      const raw = readFileSync(outcomesPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const t = line.trim();
        if (!t) continue;
        try { outcomes.push(JSON.parse(t)); } catch { /* skip corrupt */ }
      }
    }

    const out = extractRotationCandidates(injections, outcomes, { frozenTime: FROZEN });
    // Real assertion that exercises the live data path: summary must be
    // internally consistent. This catches schema drift in InjectionRecord
    // (e.g. if KIP added a required field that breaks the join).
    assert.equal(
      out.summary.orphanCount + out.summary.lowHelpRateCount + out.summary.healthyCount,
      out.summary.totalInjections,
      `summary buckets must sum to totalInjections (got orphan=${out.summary.orphanCount} ` +
        `+ low=${out.summary.lowHelpRateCount} + healthy=${out.summary.healthyCount} ` +
        `vs total=${out.summary.totalInjections})`,
    );
    assert.equal(out.summary.candidateCount, out.candidates.length);
    // The extractor must complete in <1s even on real data — pure math, no IO.
    // (no timing assertion here — `node --test` records per-test ms; a slow
    // run flags itself in the runner output.)
  });
});
