/**
 * hsm-entry-geometry-emit.test.mjs — concrete-value tests for HSM
 * entry-geometry pre-emit refuse gate.
 *
 * Hand-checked bounds (tribal-wisdom):
 *   Helix: 1° ≤ angle ≤ 3°
 *   Ramp:  0 ≤ angle ≤ 2°
 *   Plunge: always REFUSED
 *   Arc lead-in: radius ≥ 0.10 × tool diameter
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  HSM_ENTRY_GEOMETRY_EMIT_SCHEMA_VERSION,
  HELIX_MIN_ANGLE_DEG,
  HELIX_MAX_ANGLE_DEG,
  RAMP_MAX_ANGLE_DEG,
  ARC_LEAD_IN_MIN_RADIUS_FRACTION,
  SUPPORTED_ENTRY_KINDS,
  SUPPORTED_DIALECTS,
  VERDICT_PASS,
  VERDICT_BLOCK,
  formatComment,
  validateHelixEntry,
  validateRampEntry,
  validatePlungeEntry,
  validateArcLeadIn,
  validateEntry,
  validateEntrySequence,
  formatEntryVerdictLine,
  emitHSMEntryReport,
} from "./hsm-entry-geometry-emit.mjs";

describe("constants", () => {
  it("SCHEMA_VERSION=1, helix 1-3°, ramp ≤2°, arc-r ≥ 10% D", () => {
    assert.strictEqual(HSM_ENTRY_GEOMETRY_EMIT_SCHEMA_VERSION, 1);
    assert.strictEqual(HELIX_MIN_ANGLE_DEG, 1.0);
    assert.strictEqual(HELIX_MAX_ANGLE_DEG, 3.0);
    assert.strictEqual(RAMP_MAX_ANGLE_DEG, 2.0);
    assert.strictEqual(ARC_LEAD_IN_MIN_RADIUS_FRACTION, 0.10);
  });
  it("SUPPORTED_ENTRY_KINDS has 4 entries", () => {
    assert.deepStrictEqual(SUPPORTED_ENTRY_KINDS, [
      "helix", "ramp", "plunge", "arc-lead-in",
    ]);
  });
  it("VERDICT_PASS=PASS, VERDICT_BLOCK=BLOCK", () => {
    assert.strictEqual(VERDICT_PASS, "PASS");
    assert.strictEqual(VERDICT_BLOCK, "BLOCK");
  });
});

describe("formatComment", () => {
  it("fanuc strips parens", () => {
    assert.strictEqual(formatComment("fanuc", "HSM-ENTRY PASS"), "( HSM-ENTRY PASS )");
  });
  it("heidenhain uses '; '", () => {
    assert.strictEqual(formatComment("heidenhain", "x"), "; x");
  });
});

describe("validateHelixEntry", () => {
  it("1° (at min) → PASS", () => {
    assert.strictEqual(validateHelixEntry(1).verdict, "PASS");
  });
  it("2° (mid range) → PASS", () => {
    assert.strictEqual(validateHelixEntry(2).verdict, "PASS");
  });
  it("3° (at max) → PASS", () => {
    assert.strictEqual(validateHelixEntry(3).verdict, "PASS");
  });
  it("0.5° (below min) → BLOCK with recommended=1", () => {
    const r = validateHelixEntry(0.5);
    assert.strictEqual(r.verdict, "BLOCK");
    assert.strictEqual(r.recommendedAngleDeg, 1);
    assert.ok(r.reason.includes("below min"));
  });
  it("5° (above max) → BLOCK with recommended=3", () => {
    const r = validateHelixEntry(5);
    assert.strictEqual(r.verdict, "BLOCK");
    assert.strictEqual(r.recommendedAngleDeg, 3);
    assert.ok(r.reason.includes("above max"));
  });
  it("returns null on NaN", () => {
    assert.strictEqual(validateHelixEntry(Number.NaN), null);
  });
  it("returns null on negative angle", () => {
    assert.strictEqual(validateHelixEntry(-1), null);
  });
  it("returns null on Infinity", () => {
    assert.strictEqual(validateHelixEntry(Infinity), null);
  });
});

describe("validateRampEntry", () => {
  it("0° → PASS", () => {
    assert.strictEqual(validateRampEntry(0).verdict, "PASS");
  });
  it("1° → PASS", () => {
    assert.strictEqual(validateRampEntry(1).verdict, "PASS");
  });
  it("2° (at max) → PASS", () => {
    assert.strictEqual(validateRampEntry(2).verdict, "PASS");
  });
  it("2.5° (above max) → BLOCK with recommended=2", () => {
    const r = validateRampEntry(2.5);
    assert.strictEqual(r.verdict, "BLOCK");
    assert.strictEqual(r.recommendedAngleDeg, 2);
  });
  it("5° → BLOCK", () => {
    assert.strictEqual(validateRampEntry(5).verdict, "BLOCK");
  });
  it("returns null on negative", () => {
    assert.strictEqual(validateRampEntry(-1), null);
  });
  it("returns null on NaN", () => {
    assert.strictEqual(validateRampEntry(Number.NaN), null);
  });
});

describe("validatePlungeEntry", () => {
  it("always BLOCK (HSM never plunges)", () => {
    const r = validatePlungeEntry();
    assert.strictEqual(r.verdict, "BLOCK");
    assert.ok(r.reason.includes("plunge"));
  });
});

describe("validateArcLeadIn", () => {
  it("arc=2mm tool=10mm → PASS (2 ≥ 1)", () => {
    assert.strictEqual(validateArcLeadIn(2, 10).verdict, "PASS");
  });
  it("arc=1mm tool=10mm → PASS (at min, >= comparison)", () => {
    assert.strictEqual(validateArcLeadIn(1, 10).verdict, "PASS");
  });
  it("arc=0.5mm tool=10mm → BLOCK with recommendedRadius=1", () => {
    const r = validateArcLeadIn(0.5, 10);
    assert.strictEqual(r.verdict, "BLOCK");
    assert.strictEqual(r.recommendedRadiusMm, 1);
  });
  it("arc=2.5mm tool=20mm → PASS (2.5 ≥ 2)", () => {
    assert.strictEqual(validateArcLeadIn(2.5, 20).verdict, "PASS");
  });
  it("arc=1mm tool=20mm → BLOCK (1 < 2)", () => {
    const r = validateArcLeadIn(1, 20);
    assert.strictEqual(r.verdict, "BLOCK");
    assert.strictEqual(r.recommendedRadiusMm, 2);
  });
  it("returns null on NaN inputs", () => {
    assert.strictEqual(validateArcLeadIn(Number.NaN, 10), null);
  });
  it("returns null on zero tool diameter", () => {
    assert.strictEqual(validateArcLeadIn(1, 0), null);
  });
  it("returns null on negative arc radius", () => {
    assert.strictEqual(validateArcLeadIn(-1, 10), null);
  });
});

describe("validateEntry", () => {
  it("helix at 2° → PASS", () => {
    assert.strictEqual(validateEntry({ kind: "helix", angleDeg: 2 }).verdict, "PASS");
  });
  it("ramp at 1° → PASS", () => {
    assert.strictEqual(validateEntry({ kind: "ramp", angleDeg: 1 }).verdict, "PASS");
  });
  it("plunge → BLOCK", () => {
    assert.strictEqual(validateEntry({ kind: "plunge" }).verdict, "BLOCK");
  });
  it("arc-lead-in r=2, D=10 → PASS", () => {
    assert.strictEqual(
      validateEntry({ kind: "arc-lead-in", arcRadiusMm: 2, toolDiameterMm: 10 }).verdict,
      "PASS",
    );
  });
  it("returns null on unsupported kind", () => {
    assert.strictEqual(validateEntry({ kind: "unknown" }), null);
  });
  it("returns null on null", () => {
    assert.strictEqual(validateEntry(null), null);
  });
  it("returns null on helix without angle", () => {
    assert.strictEqual(validateEntry({ kind: "helix" }), null);
  });
});

describe("validateEntrySequence", () => {
  it("3 PASS entries → blockCount=0, passCount=3", () => {
    const r = validateEntrySequence([
      { kind: "helix", angleDeg: 2 },
      { kind: "ramp", angleDeg: 1 },
      { kind: "arc-lead-in", arcRadiusMm: 2, toolDiameterMm: 10 },
    ]);
    assert.strictEqual(r.totalCount, 3);
    assert.strictEqual(r.blockCount, 0);
    assert.strictEqual(r.passCount, 3);
  });
  it("2 PASS + 1 BLOCK → blockCount=1, passCount=2", () => {
    const r = validateEntrySequence([
      { kind: "helix", angleDeg: 2 },
      { kind: "plunge" },
      { kind: "ramp", angleDeg: 1 },
    ]);
    assert.strictEqual(r.blockCount, 1);
    assert.strictEqual(r.passCount, 2);
    assert.strictEqual(r.results[1].verdict, "BLOCK");
  });
  it("returns null on empty array", () => {
    assert.strictEqual(validateEntrySequence([]), null);
  });
  it("returns null on bad entry in sequence", () => {
    assert.strictEqual(validateEntrySequence([{ kind: "unknown" }]), null);
  });
});

describe("formatEntryVerdictLine", () => {
  it("PASS fanuc", () => {
    assert.strictEqual(
      formatEntryVerdictLine(
        { kind: "helix", verdict: "PASS", index: 0 }, "fanuc",
      ),
      "( HSM-ENTRY PASS idx=0 kind=helix )",
    );
  });
  it("BLOCK fanuc shows reason", () => {
    assert.strictEqual(
      formatEntryVerdictLine(
        { kind: "plunge", verdict: "BLOCK", reason: "plunge entry into solid material — refused for HSM", index: 1 },
        "fanuc",
      ),
      "( HSM-ENTRY BLOCK idx=1 kind=plunge reason: plunge entry into solid material — refused for HSM )",
    );
  });
  it("heidenhain uses '; '", () => {
    assert.strictEqual(
      formatEntryVerdictLine(
        { kind: "helix", verdict: "PASS", index: 0 }, "heidenhain",
      ),
      "; HSM-ENTRY PASS idx=0 kind=helix",
    );
  });
  it("returns null on bad verdict", () => {
    assert.strictEqual(formatEntryVerdictLine({ verdict: "MAYBE" }, "fanuc"), null);
  });
});

describe("emitHSMEntryReport", () => {
  it("all-PASS sequence → allowed=true, header + 3 PASS lines", () => {
    const r = emitHSMEntryReport({
      entries: [
        { kind: "helix", angleDeg: 2 },
        { kind: "ramp", angleDeg: 1 },
        { kind: "arc-lead-in", arcRadiusMm: 2, toolDiameterMm: 10 },
      ],
      dialect: "fanuc",
    });
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.lines.length, 4); // header + 3
    assert.strictEqual(r.lines[0], "( HSM-ENTRY-VALIDATOR total=3 pass=3 block=0 )");
    assert.strictEqual(r.summary.passCount, 3);
    assert.strictEqual(r.summary.blockCount, 0);
  });
  it("mixed sequence with plunge → allowed=false", () => {
    const r = emitHSMEntryReport({
      entries: [
        { kind: "helix", angleDeg: 2 },
        { kind: "plunge" },
      ],
      dialect: "fanuc",
    });
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.summary.blockCount, 1);
    assert.ok(r.lines[0].includes("block=1"));
  });
  it("bad-helix sequence (5°) → allowed=false", () => {
    const r = emitHSMEntryReport({
      entries: [{ kind: "helix", angleDeg: 5 }],
      dialect: "fanuc",
    });
    assert.strictEqual(r.allowed, false);
  });
  it("heidenhain emit uses '; ' prefix on every line", () => {
    const r = emitHSMEntryReport({
      entries: [{ kind: "helix", angleDeg: 2 }],
      dialect: "heidenhain",
    });
    assert.ok(r.lines[0].startsWith("; HSM-ENTRY-VALIDATOR"));
    assert.ok(r.lines[1].startsWith("; HSM-ENTRY PASS"));
  });
  it("summary carries schema + dialect", () => {
    const r = emitHSMEntryReport({
      entries: [{ kind: "helix", angleDeg: 2 }],
      dialect: "fanuc",
    });
    assert.strictEqual(r.summary.schemaVersion, 1);
    assert.strictEqual(r.summary.dialect, "fanuc");
  });
  it("returns null on null req", () => {
    assert.strictEqual(emitHSMEntryReport(null), null);
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(emitHSMEntryReport({
      entries: [{ kind: "helix", angleDeg: 2 }], dialect: "x",
    }), null);
  });
  it("returns null on empty entries", () => {
    assert.strictEqual(emitHSMEntryReport({
      entries: [], dialect: "fanuc",
    }), null);
  });
});

describe("regression: schema + dialect invariants", () => {
  it("every dialect produces non-null emit", () => {
    for (const dialect of SUPPORTED_DIALECTS) {
      const r = emitHSMEntryReport({
        entries: [{ kind: "helix", angleDeg: 2 }], dialect,
      });
      assert.ok(r != null, `dialect=${dialect} returned null`);
      assert.strictEqual(r.summary.schemaVersion, HSM_ENTRY_GEOMETRY_EMIT_SCHEMA_VERSION);
    }
  });
});
