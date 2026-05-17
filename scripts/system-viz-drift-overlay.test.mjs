// system-viz-drift-overlay.test.mjs — U-P2-LIVE-DRIFT-OVERLAY tests (node:test)
//
// Coverage:
//   • buildDriftOverlay severity classification (status-mismatch / |delta|≥5 / ≥2 / else)
//   • Pulse intensity bounds (PULSE_MIN ≤ x ≤ PULSE_MAX) and monotonicity vs deltaAbs
//   • Empty / null / malformed input
//   • Stable sort order (severity DESC → deltaAbs DESC → id ASC)
//   • Proto-pollution safety (Object.create(null) accumulators)
//   • Counter invariants (driftClassified + malformedDrifts ≤ drifts.length)
//   • parseArgs defaults + each flag
//   • I/O: readDriftReport missing-file safe + production-file shape
//   • Real-data E2E

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import {
  buildDriftOverlay,
  readDriftReport,
  writeOverlay,
  parseArgs,
  CRITICAL_DELTA_ABS,
  WARNING_DELTA_ABS,
  STATUS_MISMATCH_SEVERITY,
  PULSE_MIN,
  PULSE_MAX,
  PULSE_LOG_CAP,
  SEVERITY_COLORS,
} from "./system-viz-drift-overlay.mjs";

const FROZEN_ISO = "2026-05-17T14:00:00.000Z";
const FROZEN_MS = Date.parse(FROZEN_ISO);

const mkDrift = (overrides = {}) => ({
  id: "X-MS0",
  title: "Test milestone",
  track: "test",
  current_status: "in_progress",
  proposed_status: "in_progress",
  recorded_completed: 1,
  observed_completed: 1,
  total_units: 4,
  delta: 0,
  sample_units: [],
  ...overrides,
});

// ─── Severity classification ────────────────────────────────────────────────
describe("buildDriftOverlay — severity classification", () => {
  it("statusMismatch → critical regardless of delta=0", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({
            id: "A",
            current_status: "not_started",
            proposed_status: "completed",
            delta: 0,
          }),
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["A"].severity, "critical");
    assert.equal(out.driftMilestones["A"].statusMismatch, true);
  });

  it("|delta|=5 → critical (boundary)", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "B", delta: 5 })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["B"].severity, "critical");
  });

  it("|delta|=4 → warning (just-below-critical)", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "C", delta: 4 })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["C"].severity, "warning");
  });

  it("|delta|=2 → warning (boundary)", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "D", delta: 2 })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["D"].severity, "warning");
  });

  it("|delta|=1 → info (below warning threshold)", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "E", delta: 1 })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["E"].severity, "info");
  });

  it("negative delta is treated as |delta| for severity", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "F", delta: -7 })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["F"].severity, "critical");
    assert.equal(out.driftMilestones["F"].deltaAbs, 7);
  });

  it("color matches palette by severity", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "crit", delta: 10 }),
          mkDrift({ id: "warn", delta: 3 }),
          mkDrift({ id: "info", delta: 1 }),
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["crit"].color, SEVERITY_COLORS.critical);
    assert.equal(out.driftMilestones["warn"].color, SEVERITY_COLORS.warning);
    assert.equal(out.driftMilestones["info"].color, SEVERITY_COLORS.info);
  });

  it("STATUS_MISMATCH_SEVERITY exported constant matches behavior", () => {
    assert.equal(STATUS_MISMATCH_SEVERITY, "critical");
  });
});

// ─── Pulse intensity ────────────────────────────────────────────────────────
describe("buildDriftOverlay — pulse intensity", () => {
  it("all pulseIntensity values are within [PULSE_MIN, PULSE_MAX]", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "a", delta: 0 }),
          mkDrift({ id: "b", delta: 1 }),
          mkDrift({ id: "c", delta: 5 }),
          mkDrift({ id: "d", delta: 20 }), // saturates at log cap
          mkDrift({
            id: "e",
            delta: 0,
            current_status: "not_started",
            proposed_status: "completed",
          }), // status mismatch boost
        ],
      },
      now: FROZEN_MS,
    });
    for (const m of Object.values(out.driftMilestones)) {
      assert.ok(m.pulseIntensity >= PULSE_MIN, `${m.id} below PULSE_MIN`);
      assert.ok(m.pulseIntensity <= PULSE_MAX, `${m.id} above PULSE_MAX`);
    }
  });

  it("delta=0 + no status mismatch → pulseIntensity == PULSE_MIN", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "z", delta: 0 })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["z"].pulseIntensity, PULSE_MIN);
  });

  it("pulseIntensity is monotonic non-decreasing in |delta|", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "p1", delta: 1 }),
          mkDrift({ id: "p3", delta: 3 }),
          mkDrift({ id: "p10", delta: 10 }),
        ],
      },
      now: FROZEN_MS,
    });
    const p1 = out.driftMilestones["p1"].pulseIntensity;
    const p3 = out.driftMilestones["p3"].pulseIntensity;
    const p10 = out.driftMilestones["p10"].pulseIntensity;
    assert.ok(p1 < p3, `expected p1(${p1}) < p3(${p3})`);
    assert.ok(p3 < p10, `expected p3(${p3}) < p10(${p10})`);
  });

  it("delta beyond PULSE_LOG_CAP saturates at the same value (no degenerate-equality trap)", () => {
    // Per-file scrutiny arm B P3: the prior equality-only assertion would pass
    // even if both branches returned PULSE_MIN. Anchor to the actual saturation
    // value (PULSE_MIN + 0 status-boost + 0.5 log-component = 0.55 for non-mismatch).
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "cap", delta: PULSE_LOG_CAP }),
          mkDrift({ id: "over", delta: PULSE_LOG_CAP * 5 }),
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(
      out.driftMilestones["cap"].pulseIntensity,
      out.driftMilestones["over"].pulseIntensity,
    );
    // The expected non-mismatch saturation is PULSE_MIN + 0.5 = 0.55.
    const expectedSaturation = PULSE_MIN + 0.5;
    assert.ok(
      Math.abs(out.driftMilestones["cap"].pulseIntensity - expectedSaturation) < 1e-9,
      `expected saturation ≈${expectedSaturation}; got ${out.driftMilestones["cap"].pulseIntensity}`,
    );
    // Plus: status-mismatch + cap-delta saturates fully to PULSE_MAX.
    const max = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({
            id: "max",
            delta: PULSE_LOG_CAP,
            current_status: "not_started",
            proposed_status: "completed",
          }),
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(max.driftMilestones["max"].pulseIntensity, PULSE_MAX);
  });
});

// ─── Edge cases / malformed input ───────────────────────────────────────────
describe("buildDriftOverlay — edge cases", () => {
  it("null driftReport produces empty overlay with valid schema", () => {
    const out = buildDriftOverlay({ driftReport: null, now: FROZEN_MS });
    assert.equal(out.schemaVersion, 1);
    assert.equal(out.generatedAt, FROZEN_ISO);
    assert.equal(Object.keys(out.driftMilestones).length, 0);
    assert.equal(out.summary.driftClassified, 0);
    assert.equal(out.summary.bySeverity.critical, 0);
  });

  it("empty drifts array → zero counts", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [], total_milestones: 750, drifts_found: 0 },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.driftClassified, 0);
    assert.equal(out.summary.totalMilestones, 750);
  });

  it("malformed entries (null, missing id, non-string id) → filesMalformed counter", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          null,
          { title: "no-id" },
          { id: 42 },
          mkDrift({ id: "ok" }),
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.malformedDrifts, 3);
    assert.equal(out.summary.driftClassified, 1);
  });

  it("missing delta → treated as 0", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [{ id: "m", title: "x", track: "t" }] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["m"].delta, 0);
    assert.equal(out.driftMilestones["m"].deltaAbs, 0);
  });

  it("non-array drifts (wrong shape) → empty without throwing", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: "not-an-array" },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.driftClassified, 0);
  });
});

// ─── Sort order / accounting ────────────────────────────────────────────────
describe("buildDriftOverlay — sort + accounting", () => {
  it("stable sort: severity DESC → deltaAbs DESC → id ASC", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "z-info", delta: 1 }),
          mkDrift({ id: "a-info", delta: 1 }),
          mkDrift({ id: "critical-big", delta: 10 }),
          mkDrift({ id: "critical-small", delta: 5 }),
          mkDrift({ id: "warn", delta: 3 }),
        ],
      },
      now: FROZEN_MS,
    });
    const order = Object.keys(out.driftMilestones);
    assert.deepEqual(order, [
      "critical-big",
      "critical-small",
      "warn",
      "a-info",
      "z-info",
    ]);
  });

  it("byTrack tally counts each track", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "a", track: "BP" }),
          mkDrift({ id: "b", track: "BP" }),
          mkDrift({ id: "c", track: "CAM" }),
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.byTrack.BP, 2);
    assert.equal(out.summary.byTrack.CAM, 1);
  });

  it("missing track → 'unknown'", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "x", track: undefined })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["x"].track, "unknown");
    assert.equal(out.summary.byTrack.unknown, 1);
  });

  it("accounting: driftClassified + malformedDrifts == drifts.length", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "a" }),
          null,
          mkDrift({ id: "b" }),
          { id: 42 },
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(
      out.summary.driftClassified + out.summary.malformedDrifts,
      4,
    );
  });

  it("totalMilestones passes through from report", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [], total_milestones: 1234 },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.totalMilestones, 1234);
  });
});

// ─── Direction surfacing (arm B P2) ─────────────────────────────────────────
describe("buildDriftOverlay — direction (overclaim/underclaim/matched)", () => {
  it("REGRESSION (arm B P2): negative delta → direction:overclaim (envelope > git)", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "neg", delta: -3 })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["neg"].direction, "overclaim");
  });

  it("positive delta → direction:underclaim (git > envelope)", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "pos", delta: 4 })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["pos"].direction, "underclaim");
  });

  it("zero delta → direction:matched (status mismatch is the only signal)", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "z", delta: 0 })] },
      now: FROZEN_MS,
    });
    assert.equal(out.driftMilestones["z"].direction, "matched");
  });

  it("summary.byDirection tallies all three directions", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "o1", delta: -1 }),
          mkDrift({ id: "o2", delta: -5 }),
          mkDrift({ id: "u1", delta: 2 }),
          mkDrift({ id: "m1", delta: 0 }),
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.byDirection.overclaim, 2);
    assert.equal(out.summary.byDirection.underclaim, 1);
    assert.equal(out.summary.byDirection.matched, 1);
  });
});

// ─── Source generator attribution (arm B P0) + contract-drift heuristic (P1) ─
describe("buildDriftOverlay — upstream contract pinning", () => {
  it("REGRESSION (arm B P0): sources.sourceGenerator points at audit-roadmap-drift.mjs", () => {
    const out = buildDriftOverlay({ now: FROZEN_MS });
    assert.equal(out.sources.sourceGenerator, "scripts/audit-roadmap-drift.mjs");
  });

  it("REGRESSION: the cited source generator MUST exist on disk", () => {
    const out = buildDriftOverlay({ now: FROZEN_MS });
    // fileURLToPath correctly handles Windows drive letters (no double-prefix).
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const fullPath = path.join(repoRoot, out.sources.sourceGenerator);
    assert.ok(
      fs.existsSync(fullPath),
      `cited sourceGenerator missing: ${fullPath}`,
    );
  });

  it("REGRESSION (arm B P1): suspectedContractDrift fires when drifts>0 but all-info", () => {
    // Simulate upstream schema rename: drift entries with delta=1 (info-only) and
    // no status mismatch → suspected drift surface.
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "a", delta: 1 }),
          mkDrift({ id: "b", delta: 1 }),
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.suspectedContractDrift, true);
  });

  it("suspectedContractDrift is FALSE when any critical/warning present", () => {
    const out = buildDriftOverlay({
      driftReport: {
        drifts: [
          mkDrift({ id: "a", delta: 1 }),
          mkDrift({ id: "b", delta: 5 }), // critical
        ],
      },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.suspectedContractDrift, false);
  });

  it("suspectedContractDrift is FALSE on empty drifts (no signal)", () => {
    const out = buildDriftOverlay({ driftReport: { drifts: [] }, now: FROZEN_MS });
    assert.equal(out.summary.suspectedContractDrift, false);
  });
});

// ─── Proto-pollution safety ─────────────────────────────────────────────────
describe("buildDriftOverlay — proto-pollution safety", () => {
  it("REGRESSION: Object.create(null) on driftMilestones prevents prototype pollution", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "__proto__", delta: 1 })] },
      now: FROZEN_MS,
    });
    assert.equal({}.severity, undefined);
    assert.equal(out.driftMilestones["__proto__"].delta, 1);
  });

  it("REGRESSION: byTrack uses Object.create(null) too", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [mkDrift({ id: "x", track: "__proto__" })] },
      now: FROZEN_MS,
    });
    assert.equal({}.x, undefined);
    assert.equal(out.summary.byTrack.__proto__, 1);
  });
});

// ─── Output shape ───────────────────────────────────────────────────────────
describe("buildDriftOverlay — output shape", () => {
  it("advisory.mustHumanVerify is true; caveat non-empty", () => {
    const out = buildDriftOverlay({ now: FROZEN_MS });
    assert.equal(out.advisory.mustHumanVerify, true);
    assert.ok(out.advisory.caveat.length > 0);
  });

  it("thresholds block carries all constants", () => {
    const out = buildDriftOverlay({ now: FROZEN_MS });
    assert.equal(out.thresholds.criticalDeltaAbs, CRITICAL_DELTA_ABS);
    assert.equal(out.thresholds.warningDeltaAbs, WARNING_DELTA_ABS);
    assert.equal(out.thresholds.statusMismatchSeverity, STATUS_MISMATCH_SEVERITY);
    assert.equal(out.thresholds.pulseMin, PULSE_MIN);
    assert.equal(out.thresholds.pulseMax, PULSE_MAX);
    assert.equal(out.thresholds.pulseLogCap, PULSE_LOG_CAP);
  });

  it("palette block clones SEVERITY_COLORS (not aliased)", () => {
    const out = buildDriftOverlay({ now: FROZEN_MS });
    assert.deepEqual(out.palette, SEVERITY_COLORS);
    // Mutating returned palette should not affect SEVERITY_COLORS
    out.palette.critical = "#000000";
    assert.notEqual(SEVERITY_COLORS.critical, "#000000");
  });

  it("sourceReportGeneratedAt passes through from report", () => {
    const out = buildDriftOverlay({
      driftReport: { drifts: [], generated_at: "2026-05-17T02:13:45Z" },
      now: FROZEN_MS,
    });
    assert.equal(out.sourceReportGeneratedAt, "2026-05-17T02:13:45Z");
  });
});

// ─── parseArgs ──────────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs(["node", "x"]);
    assert.equal(a.json, false);
    assert.equal(a.help, false);
    assert.equal(a.frozenTime, null);
    assert.equal(a.driftReportPath, null);
    assert.match(a.outPath, /drift-overlay\.json$/);
  });

  it("--out / --json / --frozen-time / --drift-report", () => {
    const a = parseArgs([
      "node",
      "x",
      "--out",
      "/tmp/x.json",
      "--json",
      "--frozen-time",
      FROZEN_ISO,
      "--drift-report",
      "/tmp/drift.json",
    ]);
    assert.equal(a.outPath, "/tmp/x.json");
    assert.equal(a.json, true);
    assert.equal(a.frozenTime, FROZEN_ISO);
    assert.equal(a.driftReportPath, "/tmp/drift.json");
  });

  it("--help / -h", () => {
    assert.equal(parseArgs(["node", "x", "--help"]).help, true);
    assert.equal(parseArgs(["node", "x", "-h"]).help, true);
  });
});

// ─── I/O ────────────────────────────────────────────────────────────────────
describe("readDriftReport", () => {
  it("missing file returns null (no throw)", () => {
    assert.equal(readDriftReport("/nonexistent/drift.json"), null);
  });

  it("malformed JSON returns null with stderr advisory", () => {
    const tmp = path.join(os.tmpdir(), `bad-${Date.now()}.json`);
    fs.writeFileSync(tmp, "{not json", "utf8");
    try {
      assert.equal(readDriftReport(tmp), null);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("real production drift report is readable + well-formed", () => {
    const report = readDriftReport();
    assert.ok(report, "production report should exist");
    assert.ok(Array.isArray(report.drifts));
    assert.equal(typeof report.total_milestones, "number");
  });
});

describe("writeOverlay", () => {
  it("creates parent dir + writes pretty JSON with trailing newline (atomic)", () => {
    const tmp = path.join(os.tmpdir(), `drift-${Date.now()}`, "deep", "out.json");
    try {
      const payload = { schemaVersion: 1, ok: true };
      writeOverlay(tmp, payload);
      const txt = fs.readFileSync(tmp, "utf8");
      assert.ok(txt.endsWith("\n"));
      assert.deepEqual(JSON.parse(txt), payload);
      const leftover = fs.readdirSync(path.dirname(tmp)).filter((f) =>
        f.startsWith("out.json.tmp-"),
      );
      assert.equal(leftover.length, 0);
    } finally {
      try {
        fs.rmSync(path.dirname(path.dirname(tmp)), { recursive: true, force: true });
      } catch {}
    }
  });
});

// ─── Real-data E2E ──────────────────────────────────────────────────────────
describe("real-data E2E", () => {
  it("live drift report → valid overlay with non-negative drift count", () => {
    const report = readDriftReport();
    const overlay = buildDriftOverlay({ driftReport: report, now: FROZEN_MS });
    assert.equal(overlay.schemaVersion, 1);
    assert.ok(overlay.summary.driftClassified >= 0);
    if (overlay.summary.driftClassified > 0) {
      const first = Object.values(overlay.driftMilestones)[0];
      assert.ok(first.severity);
      assert.ok(first.color);
      assert.ok(first.pulseIntensity >= PULSE_MIN && first.pulseIntensity <= PULSE_MAX);
    }
  });

  it("live: counter invariant holds on real data", () => {
    const report = readDriftReport();
    const overlay = buildDriftOverlay({ driftReport: report, now: FROZEN_MS });
    const s = overlay.summary;
    const sevSum = s.bySeverity.critical + s.bySeverity.warning + s.bySeverity.info;
    assert.equal(sevSum, s.driftClassified);
  });
});
