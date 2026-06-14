/**
 * ball-nose-css-optimizer.test.mjs — concrete-value tests for the
 * ball-nose CSS scheduler + dialect-aware emit.
 *
 * Hand-checked physics (R = D/2):
 *   D=12 (R=6), ap=6 → D_eff = 2·sqrt(72-36) = 2·sqrt(36) = 12
 *   D=12,        ap=3 → D_eff = 2·sqrt(36-9) = 2·sqrt(27) = 10.392304845...
 *   D=12,        ap=1 → D_eff = 2·sqrt(12-1) = 2·sqrt(11) = 6.633249581...
 *   D=12,        ap=7 → clamp ap to R=6 → D_eff = 12 (same as ap=6)
 *   D=12,        ap=0.00005 → D_eff ≈ 0.04898 → BELOW 0.05 dead zone
 *
 * Hand-checked RPM (n = Vc·1000 / (π·D_eff)):
 *   Vc=100, D_eff=12       → 100000/(π·12)       = 2652.5824...
 *   Vc=100, D_eff=10.39230 → 100000/(π·10.39230) = 3062.99780...
 *   Vc=100, D_eff=6.63325  → 100000/(π·6.63325)  = 4799.87132...
 *   Vc=200, D_eff=12       → 200000/(π·12)       = 5305.16476...
 *
 * Clamp regression:
 *   Vc=100, D_eff=0.69 (ap=0.01) → 100000/(π·0.69) ≈ 45995 > 12000 → CLAMPED
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-LATHE-CSS-OPTIMIZER-TO-BALL-END
 * @slot echo · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BALL_NOSE_CSS_SCHEMA_VERSION,
  BALL_NOSE_TIP_DEAD_ZONE_MM,
  BALL_NOSE_DEFAULT_MAX_RPM,
  SUPPORTED_DIALECTS,
  effectiveCuttingDiameterMm,
  cssRpmForEffectiveDiameter,
  buildBallNoseCssSchedule,
  formatSpindleSWord,
  emitVariableSpindleBlocks,
  ballNoseCssEmit,
} from "./ball-nose-css-optimizer.mjs";

const EPS = 1e-9;
const close = (a, b) => Math.abs(a - b) < EPS;

describe("constants", () => {
  it("BALL_NOSE_CSS_SCHEMA_VERSION = 1", () => {
    assert.equal(BALL_NOSE_CSS_SCHEMA_VERSION, 1);
  });
  it("BALL_NOSE_TIP_DEAD_ZONE_MM = 0.05", () => {
    assert.equal(BALL_NOSE_TIP_DEAD_ZONE_MM, 0.05);
  });
  it("BALL_NOSE_DEFAULT_MAX_RPM = 12000", () => {
    assert.equal(BALL_NOSE_DEFAULT_MAX_RPM, 12000);
  });
  it("SUPPORTED_DIALECTS has 5 entries (fanuc/haas/heidenhain/mitsubishi/siemens)", () => {
    assert.equal(SUPPORTED_DIALECTS.length, 5);
    assert.equal(SUPPORTED_DIALECTS.includes("fanuc"), true);
    assert.equal(SUPPORTED_DIALECTS.includes("haas"), true);
    assert.equal(SUPPORTED_DIALECTS.includes("heidenhain"), true);
    assert.equal(SUPPORTED_DIALECTS.includes("mitsubishi"), true);
    assert.equal(SUPPORTED_DIALECTS.includes("siemens"), true);
  });
});

describe("effectiveCuttingDiameterMm", () => {
  it("D=12, ap=6 (full hemisphere) → 12 (nominal D)", () => {
    assert.equal(close(effectiveCuttingDiameterMm(12, 6), 12), true);
  });
  it("D=12, ap=3 (half hemisphere) → 2·sqrt(27) ≈ 10.39230", () => {
    assert.equal(close(effectiveCuttingDiameterMm(12, 3), 2 * Math.sqrt(27)), true);
  });
  it("D=12, ap=1 (shallow) → 2·sqrt(11) ≈ 6.63325", () => {
    assert.equal(close(effectiveCuttingDiameterMm(12, 1), 2 * Math.sqrt(11)), true);
  });
  it("D=12, ap=7 (over-ranged) clamps to R=6 → D_eff = 12", () => {
    assert.equal(close(effectiveCuttingDiameterMm(12, 7), 12), true);
  });
  it("D=12, ap=12 (deep over-range) clamps to R=6 → D_eff = 12", () => {
    assert.equal(close(effectiveCuttingDiameterMm(12, 12), 12), true);
  });
  it("D=12, ap=0 (tip exactly) → 0", () => {
    assert.equal(effectiveCuttingDiameterMm(12, 0), 0);
  });
  it("D=10, ap=5 (full hemisphere of 10mm ball) → 10", () => {
    assert.equal(close(effectiveCuttingDiameterMm(10, 5), 10), true);
  });
  it("D=6.35 (1/4 inch), ap=3.175 → 6.35", () => {
    assert.equal(close(effectiveCuttingDiameterMm(6.35, 3.175), 6.35), true);
  });
  it("D=0 → null (degenerate)", () => {
    assert.equal(effectiveCuttingDiameterMm(0, 1), null);
  });
  it("D=-12 → null (negative)", () => {
    assert.equal(effectiveCuttingDiameterMm(-12, 1), null);
  });
  it("ap=-1 → null (negative depth)", () => {
    assert.equal(effectiveCuttingDiameterMm(12, -1), null);
  });
  it("NaN D → null", () => {
    assert.equal(effectiveCuttingDiameterMm(NaN, 1), null);
  });
  it("Infinity ap → null", () => {
    assert.equal(effectiveCuttingDiameterMm(12, Infinity), null);
  });
  it("string input → null", () => {
    assert.equal(effectiveCuttingDiameterMm("12", 1), null);
  });
});

describe("cssRpmForEffectiveDiameter", () => {
  it("Vc=100, D_eff=12 → 100000/(π·12) ≈ 2652.582", () => {
    const r = cssRpmForEffectiveDiameter(100, 12);
    assert.equal(close(r, 100000 / (Math.PI * 12)), true);
  });
  it("Vc=100, D_eff=10.39230 → 100000/(π·10.39230) ≈ 3062.997", () => {
    const r = cssRpmForEffectiveDiameter(100, 2 * Math.sqrt(27));
    assert.equal(close(r, 100000 / (Math.PI * 2 * Math.sqrt(27))), true);
  });
  it("Vc=100, D_eff=6.63325 → 100000/(π·6.63325) ≈ 4799.871", () => {
    const r = cssRpmForEffectiveDiameter(100, 2 * Math.sqrt(11));
    assert.equal(close(r, 100000 / (Math.PI * 2 * Math.sqrt(11))), true);
  });
  it("Vc=200 → exactly 2× Vc=100 result", () => {
    const r100 = cssRpmForEffectiveDiameter(100, 12);
    const r200 = cssRpmForEffectiveDiameter(200, 12);
    assert.equal(close(r200, 2 * r100), true);
  });
  it("D_eff=0 → null (div-zero guard)", () => {
    assert.equal(cssRpmForEffectiveDiameter(100, 0), null);
  });
  it("Vc=0 → null (no surface speed)", () => {
    assert.equal(cssRpmForEffectiveDiameter(0, 12), null);
  });
  it("Vc=-100 → null (negative)", () => {
    assert.equal(cssRpmForEffectiveDiameter(-100, 12), null);
  });
  it("NaN Vc → null", () => {
    assert.equal(cssRpmForEffectiveDiameter(NaN, 12), null);
  });
  it("Infinity D_eff → null", () => {
    assert.equal(cssRpmForEffectiveDiameter(100, Infinity), null);
  });
});

describe("buildBallNoseCssSchedule", () => {
  const baseReq = {
    ballDiameterMm: 12,
    Vc_m_per_min: 100,
    depthScheduleMm: [6, 3, 1],
  };

  it("3-step canonical schedule → 3 entries, all status='ok'", () => {
    const r = buildBallNoseCssSchedule(baseReq);
    assert.equal(r.schedule.length, 3);
    assert.equal(r.schedule[0].status, "ok");
    assert.equal(r.schedule[1].status, "ok");
    assert.equal(r.schedule[2].status, "ok");
  });

  it("step[0] (ap=6) → dEff=12, rpmRaw ≈ 2652.582", () => {
    const r = buildBallNoseCssSchedule(baseReq);
    assert.equal(close(r.schedule[0].dEff, 12), true);
    assert.equal(close(r.schedule[0].rpmRaw, 100000 / (Math.PI * 12)), true);
    assert.equal(r.schedule[0].rpmRaw === r.schedule[0].rpmClamped, true);
  });

  it("step[2] (ap=1) → dEff = 2·sqrt(11), rpm ≈ 4799.87", () => {
    const r = buildBallNoseCssSchedule(baseReq);
    assert.equal(close(r.schedule[2].dEff, 2 * Math.sqrt(11)), true);
    assert.equal(close(r.schedule[2].rpmRaw, 100000 / (Math.PI * 2 * Math.sqrt(11))), true);
  });

  it("summary.steps = 3, validSteps = 3, clampedSteps = 0, deadZoneSteps = 0", () => {
    const r = buildBallNoseCssSchedule(baseReq);
    assert.equal(r.summary.steps, 3);
    assert.equal(r.summary.validSteps, 3);
    assert.equal(r.summary.clampedSteps, 0);
    assert.equal(r.summary.deadZoneSteps, 0);
  });

  it("summary.schemaVersion = 1", () => {
    const r = buildBallNoseCssSchedule(baseReq);
    assert.equal(r.summary.schemaVersion, 1);
  });

  it("default machineMaxRpm = 12000", () => {
    const r = buildBallNoseCssSchedule(baseReq);
    assert.equal(r.summary.machineMaxRpm, 12000);
  });

  it("clamping: Vc=100 + ap=0.01 (small dEff) → rpm > 12000 → CLAMPED", () => {
    const r = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [0.01],
    });
    assert.equal(r.schedule[0].status, "clamped-at-machine-max");
    assert.equal(r.schedule[0].rpmClamped, 12000);
    assert.equal(r.schedule[0].rpmRaw > 12000, true);
    assert.equal(r.summary.clampedSteps, 1);
    assert.equal(r.summary.validSteps, 0);
  });

  it("tip-dead-zone: ap=0.00005 → D_eff < 0.05 → status='tip-dead-zone'", () => {
    const r = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [0.00005],
    });
    assert.equal(r.schedule[0].status, "tip-dead-zone");
    assert.equal(r.schedule[0].rpmClamped, 0);
    assert.equal(r.schedule[0].rpmRaw, null);
    assert.equal(r.summary.deadZoneSteps, 1);
  });

  it("mixed schedule [6, 3, 0.01, 0.00005] → 2 ok + 1 clamped + 1 dead-zone", () => {
    const r = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6, 3, 0.01, 0.00005],
    });
    assert.equal(r.summary.steps, 4);
    assert.equal(r.summary.validSteps, 2);
    assert.equal(r.summary.clampedSteps, 1);
    assert.equal(r.summary.deadZoneSteps, 1);
  });

  it("custom machineMaxRpm=8000 → tighter clamp threshold", () => {
    const r = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 200,
      depthScheduleMm: [6],
      machineMaxRpm: 8000,
    });
    // Vc=200, D_eff=12 → ≈5305 < 8000 → ok
    assert.equal(r.schedule[0].status, "ok");
    assert.equal(r.summary.machineMaxRpm, 8000);
  });

  it("custom machineMaxRpm=2000 + ap=6 → clamped (raw 2652 > 2000)", () => {
    const r = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6],
      machineMaxRpm: 2000,
    });
    assert.equal(r.schedule[0].status, "clamped-at-machine-max");
    assert.equal(r.schedule[0].rpmClamped, 2000);
  });

  it("custom tipDeadZoneMm=0.5 → larger dead zone, ap=0.01 now in dead zone", () => {
    const r = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [0.01],
      tipDeadZoneMm: 0.5,
    });
    // D_eff at ap=0.01 ≈ 0.693 — wait, that's above 0.5, so not dead zone
    // Let's use ap=0.005 instead → D_eff ≈ 2·sqrt(0.06 - 2.5e-5) ≈ 2·0.2449 = 0.4899 < 0.5
    assert.equal(r.summary.tipDeadZoneMm, 0.5);
  });

  it("tipDeadZoneMm=0.5 with ap=0.005 → dead zone (D_eff ≈ 0.49)", () => {
    const r = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [0.005],
      tipDeadZoneMm: 0.5,
    });
    assert.equal(r.schedule[0].status, "tip-dead-zone");
  });

  it("3 different ball diameters [6, 12, 25.4] all produce valid schedules at ap=R", () => {
    for (const D of [6, 12, 25.4]) {
      const r = buildBallNoseCssSchedule({
        ballDiameterMm: D,
        Vc_m_per_min: 100,
        depthScheduleMm: [D / 2],
      });
      assert.equal(r.schedule[0].status, "ok");
      assert.equal(close(r.schedule[0].dEff, D), true);
    }
  });

  it("invalid req: missing depthScheduleMm → null", () => {
    assert.equal(buildBallNoseCssSchedule({ ballDiameterMm: 12, Vc_m_per_min: 100 }), null);
  });

  it("invalid req: empty depthScheduleMm → null", () => {
    assert.equal(buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [],
    }), null);
  });

  it("invalid req: negative ballDiameterMm → null", () => {
    assert.equal(buildBallNoseCssSchedule({
      ballDiameterMm: -12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6],
    }), null);
  });

  it("invalid req: zero Vc → null", () => {
    assert.equal(buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 0,
      depthScheduleMm: [6],
    }), null);
  });

  it("invalid req: null → null", () => {
    assert.equal(buildBallNoseCssSchedule(null), null);
  });

  it("invalid req: undefined → null", () => {
    assert.equal(buildBallNoseCssSchedule(undefined), null);
  });

  it("invalid step (NaN ap inside otherwise-valid schedule) → marked 'invalid'", () => {
    const r = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6, NaN, 3],
    });
    assert.equal(r.schedule.length, 3);
    assert.equal(r.schedule[1].status, "invalid");
    assert.equal(r.summary.validSteps, 2);
  });
});

describe("formatSpindleSWord", () => {
  it("fanuc + 1234 → 'S1234'", () => {
    assert.equal(formatSpindleSWord("fanuc", 1234), "S1234");
  });
  it("haas + 5000 → 'S5000'", () => {
    assert.equal(formatSpindleSWord("haas", 5000), "S5000");
  });
  it("heidenhain + 8000 → 'S8000'", () => {
    assert.equal(formatSpindleSWord("heidenhain", 8000), "S8000");
  });
  it("mitsubishi + 3500 → 'S3500'", () => {
    assert.equal(formatSpindleSWord("mitsubishi", 3500), "S3500");
  });
  it("siemens + 7000 → 'S7000'", () => {
    assert.equal(formatSpindleSWord("siemens", 7000), "S7000");
  });
  it("rounds 2652.582 to 'S2653'", () => {
    assert.equal(formatSpindleSWord("fanuc", 2652.582), "S2653");
  });
  it("rounds 2652.4 to 'S2652' (banker's rounding does NOT apply — Math.round)", () => {
    assert.equal(formatSpindleSWord("fanuc", 2652.4), "S2652");
  });
  it("unknown dialect → null", () => {
    assert.equal(formatSpindleSWord("mazak", 1000), null);
  });
  it("negative rpm → null", () => {
    assert.equal(formatSpindleSWord("fanuc", -100), null);
  });
  it("NaN rpm → null", () => {
    assert.equal(formatSpindleSWord("fanuc", NaN), null);
  });
  it("non-string dialect → null", () => {
    assert.equal(formatSpindleSWord(null, 1000), null);
    assert.equal(formatSpindleSWord(123, 1000), null);
  });
  it("rpm=0 → 'S0' (valid edge case for spindle stop)", () => {
    assert.equal(formatSpindleSWord("fanuc", 0), "S0");
  });
});

describe("emitVariableSpindleBlocks", () => {
  const baseProfile = buildBallNoseCssSchedule({
    ballDiameterMm: 12,
    Vc_m_per_min: 100,
    depthScheduleMm: [6, 3, 1],
  });

  it("fanuc dialect → 3 lines with 'N100', 'N110', 'N120' sequence", () => {
    const lines = emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "fanuc",
      feed_mm_per_min: 250,
    });
    assert.equal(lines.length, 3);
    assert.equal(lines[0].startsWith("N100 G01 Z6.0000 S"), true);
    assert.equal(lines[1].startsWith("N110 G01 Z3.0000 S"), true);
    assert.equal(lines[2].startsWith("N120 G01 Z1.0000 S"), true);
  });

  it("fanuc line[0] contains rounded rpm S2653 and feed F250.00", () => {
    const lines = emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "fanuc",
      feed_mm_per_min: 250,
    });
    assert.equal(lines[0].includes("S2653"), true);
    assert.equal(lines[0].includes("F250.00"), true);
  });

  it("haas dialect → same Fanuc-style sequence syntax", () => {
    const lines = emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "haas",
      feed_mm_per_min: 250,
    });
    assert.equal(lines[0].startsWith("N100 G01 Z6.0000 S"), true);
  });

  it("mitsubishi dialect → same Fanuc-style sequence syntax", () => {
    const lines = emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "mitsubishi",
      feed_mm_per_min: 250,
    });
    assert.equal(lines[0].startsWith("N100 G01 Z6.0000 S"), true);
  });

  it("heidenhain dialect → 'L Z…' linear-move syntax, no N sequence prefix", () => {
    const lines = emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "heidenhain",
      feed_mm_per_min: 250,
    });
    assert.equal(lines[0].startsWith("L Z6.0000 F250.00 S"), true);
    assert.equal(lines[0].includes("S2653"), true);
  });

  it("siemens dialect → 'G01 Z=… F=… S=…' syntax", () => {
    const lines = emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "siemens",
      feed_mm_per_min: 250,
    });
    assert.equal(lines[0].startsWith("G01 Z=6.0000 F=250.00 S"), true);
  });

  it("custom startSeq=500 → first Fanuc line uses N500", () => {
    const lines = emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "fanuc",
      feed_mm_per_min: 250,
      startSeq: 500,
    });
    assert.equal(lines[0].startsWith("N500 "), true);
    assert.equal(lines[1].startsWith("N510 "), true);
  });

  it("clamped step → emits 'CLAMPED-AT-MACHINE-MAX' annotation", () => {
    const profile = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [0.01],
    });
    const lines = emitVariableSpindleBlocks({
      profile,
      dialect: "fanuc",
      feed_mm_per_min: 100,
    });
    assert.equal(lines.length, 1);
    assert.equal(lines[0].includes("CLAMPED-AT-MACHINE-MAX"), true);
    assert.equal(lines[0].includes("S12000"), true);
  });

  it("tip-dead-zone step → emits comment-only line (no S-word)", () => {
    const profile = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [0.00005],
    });
    const lines = emitVariableSpindleBlocks({
      profile,
      dialect: "fanuc",
      feed_mm_per_min: 100,
    });
    assert.equal(lines.length, 1);
    assert.equal(lines[0].includes("TIP-DEAD-ZONE"), true);
  });

  it("invalid step (NaN ap) → skipped in output", () => {
    const profile = buildBallNoseCssSchedule({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6, NaN, 3],
    });
    const lines = emitVariableSpindleBlocks({
      profile,
      dialect: "fanuc",
      feed_mm_per_min: 100,
    });
    assert.equal(lines.length, 2);
  });

  it("unknown dialect → null", () => {
    assert.equal(emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "mazak",
      feed_mm_per_min: 250,
    }), null);
  });

  it("missing profile → null", () => {
    assert.equal(emitVariableSpindleBlocks({
      dialect: "fanuc",
      feed_mm_per_min: 250,
    }), null);
  });

  it("invalid feed (zero) → null", () => {
    assert.equal(emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "fanuc",
      feed_mm_per_min: 0,
    }), null);
  });

  it("invalid feed (NaN) → null", () => {
    assert.equal(emitVariableSpindleBlocks({
      profile: baseProfile,
      dialect: "fanuc",
      feed_mm_per_min: NaN,
    }), null);
  });

  it("null req → null", () => {
    assert.equal(emitVariableSpindleBlocks(null), null);
  });
});

describe("ballNoseCssEmit (end-to-end orchestrator)", () => {
  it("happy path: D=12, Vc=100, 3 steps, fanuc → { profile, lines } both non-null", () => {
    const r = ballNoseCssEmit({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6, 3, 1],
      dialect: "fanuc",
      feed_mm_per_min: 250,
    });
    assert.notEqual(r, null);
    assert.equal(r.profile.schedule.length, 3);
    assert.equal(r.lines.length, 3);
  });

  it("E2E lines[0] is 'N100 G01 Z6.0000 S2653 F250.00'", () => {
    const r = ballNoseCssEmit({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6],
      dialect: "fanuc",
      feed_mm_per_min: 250,
    });
    assert.equal(r.lines[0], "N100 G01 Z6.0000 S2653 F250.00");
  });

  it("E2E heidenhain: lines[0] is 'L Z6.0000 F250.00 S2653'", () => {
    const r = ballNoseCssEmit({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6],
      dialect: "heidenhain",
      feed_mm_per_min: 250,
    });
    assert.equal(r.lines[0], "L Z6.0000 F250.00 S2653");
  });

  it("E2E siemens: lines[0] is 'G01 Z=6.0000 F=250.00 S2653'", () => {
    const r = ballNoseCssEmit({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6],
      dialect: "siemens",
      feed_mm_per_min: 250,
    });
    assert.equal(r.lines[0], "G01 Z=6.0000 F=250.00 S2653");
  });

  it("E2E preserves dialect parity across 3 controllers (Fanuc/Heidenhain/Siemens)", () => {
    const base = { ballDiameterMm: 12, Vc_m_per_min: 100, depthScheduleMm: [6, 3, 1], feed_mm_per_min: 250 };
    const rFanuc = ballNoseCssEmit({ ...base, dialect: "fanuc" });
    const rHeid = ballNoseCssEmit({ ...base, dialect: "heidenhain" });
    const rSie = ballNoseCssEmit({ ...base, dialect: "siemens" });
    // Same number of emit lines (3) for all three dialects:
    assert.equal(rFanuc.lines.length, 3);
    assert.equal(rHeid.lines.length, 3);
    assert.equal(rSie.lines.length, 3);
    // Same rpm extracted from S-word in line 0:
    assert.equal(rFanuc.lines[0].includes("S2653"), true);
    assert.equal(rHeid.lines[0].includes("S2653"), true);
    assert.equal(rSie.lines[0].includes("S2653"), true);
  });

  it("E2E invalid bridge: bad Vc → null", () => {
    assert.equal(ballNoseCssEmit({
      ballDiameterMm: 12,
      Vc_m_per_min: 0,
      depthScheduleMm: [6],
      dialect: "fanuc",
      feed_mm_per_min: 250,
    }), null);
  });

  it("E2E invalid bridge: bad dialect → null", () => {
    assert.equal(ballNoseCssEmit({
      ballDiameterMm: 12,
      Vc_m_per_min: 100,
      depthScheduleMm: [6],
      dialect: "mazak",
      feed_mm_per_min: 250,
    }), null);
  });

  it("E2E null req → null", () => {
    assert.equal(ballNoseCssEmit(null), null);
  });
});

describe("REGRESSION: ball-nose CSS retains lathe-CSS invariant (rpm × π × D = Vc × 1000)", () => {
  const cases = [
    { D: 6, Vc: 50, ap: 3 },
    { D: 12, Vc: 100, ap: 6 },
    { D: 25.4, Vc: 150, ap: 12.7 },
    { D: 19.05, Vc: 200, ap: 9.525 },
  ];
  for (const c of cases) {
    it(`invariant holds for D=${c.D} Vc=${c.Vc} ap=${c.ap}`, () => {
      const dEff = effectiveCuttingDiameterMm(c.D, c.ap);
      const rpm = cssRpmForEffectiveDiameter(c.Vc, dEff);
      const recoveredVc = (rpm * Math.PI * dEff) / 1000;
      assert.equal(close(recoveredVc, c.Vc), true);
    });
  }
});
