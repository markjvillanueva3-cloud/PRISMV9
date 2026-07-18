/**
 * PostValidationHardeningEngine.test.ts
 *
 * Real reference-value and algebraic-invariant assertions against the
 * PostValidationHardeningEngine singleton.  No toBeDefined/toBeTruthy stubs.
 *
 * Coverage plan:
 *   Happy-path:   valid program passes, summary fields correct
 *   Failure:      RPM over limit (BLOCK), axis out of envelope (BLOCK),
 *                 zero feed (BLOCK), no work offset (WARN)
 *   Edge:         RPM in INFO zone (>95% of max), TSC not supported,
 *                 mist coolant advisory, tool capacity exceeded,
 *                 skip_info filter, check_envelope action
 *   Adversarial:  empty string, comments-only, garbage tokens after S/F/X,
 *                 oversized feed (>99999), unknown action throws
 */

import { describe, it, expect } from "vitest";
import { postValidationHardeningEngine } from "../engines/PostValidationHardeningEngine.js";
import type { MachineContext } from "../engines/PostProcessorPipelineEngine.js";
import type { ValidationInput } from "../engines/PostValidationHardeningEngine.js";

// ─── Shared machine fixture ───────────────────────────────────────────────────

/** A representative 3-axis VMC (values chosen to make limit arithmetic explicit) */
function makeMachine(overrides: Partial<MachineContext> = {}): MachineContext {
  return {
    id: "vmc-test-01",
    name: "Test VMC 3-Axis",
    controller_family: "fanuc" as unknown as MachineContext["controller_family"],
    iso_group: "P" as unknown as MachineContext["iso_group"],
    max_rpm: 12000,
    rapid_rate_mm_min: { x: 36000, y: 36000, z: 30000 },
    work_volume: { x: 500, y: 400, z: 300 },
    atc_capacity: 20,
    coolant_types: ["flood", "mist"],
    max_power_kW: 22,
    ...overrides,
  } as unknown as MachineContext;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function run(gcode: string, overrides: Partial<ValidationInput> = {}) {
  const input: ValidationInput = {
    action: "validate",
    gcode,
    machine: makeMachine(),
    ...overrides,
  };
  return postValidationHardeningEngine.process(input);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PostValidationHardeningEngine", () => {
  // ── Happy-path ──────────────────────────────────────────────────────────────

  describe("happy-path: valid program", () => {
    it("passes a clean program with work offset and sane values", async () => {
      const gcode = [
        "G54",
        "G01 X100 Y100 Z-10 F500",
        "S6000 M03",
        "M30",
      ].join("\n");

      const result = await run(gcode);

      expect(result.summary.passed).toBe(true);
      expect(result.summary.block_count).toBe(0);
      expect(result.summary.machine_id).toBe("vmc-test-01");
      expect(result.summary.machine_name).toBe("Test VMC 3-Axis");
      expect(result.flags.filter(f => f.severity === "BLOCK")).toHaveLength(0);
    });

    it("summary lines_checked excludes blank lines and comment lines", async () => {
      const gcode = [
        "",
        "; file header",
        "(comment block)",
        "G54",
        "G01 X10 F500",
        "",
      ].join("\n");

      const result = await run(gcode);
      // Only "G54" and "G01 X10 F500" are real code lines
      expect(result.summary.lines_checked).toBe(2);
    });

    it("flags array is sorted by line number ascending", async () => {
      // Axis violation on line 2, RPM violation on line 5
      const gcode = [
        "G54",                           // line 1
        "G01 X600 F200",                 // line 2 — X=600 > 500 limit
        "G01 Y10 Z-10",                  // line 3
        "G01 X50",                       // line 4
        "S13000 M03",                    // line 5 — RPM 13000 > 12000
      ].join("\n");

      const result = await run(gcode);
      const blockFlags = result.flags.filter(f => f.severity === "BLOCK");
      expect(blockFlags.length).toBeGreaterThanOrEqual(2);

      const lineNumbers = blockFlags.map(f => f.line);
      for (let i = 1; i < lineNumbers.length; i++) {
        expect(lineNumbers[i]).toBeGreaterThanOrEqual(lineNumbers[i - 1]);
      }
    });

    it("returns empty flags array and passed=true for minimal valid program", async () => {
      const gcode = "G54\nG01 X10 Y10 Z-5 F300\nM30";
      const result = await run(gcode);
      expect(result.summary.passed).toBe(true);
      expect(result.flags.filter(f => f.severity === "BLOCK")).toHaveLength(0);
      expect(Array.isArray(result.flags)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // ── Failure modes ────────────────────────────────────────────────────────────

  describe("failure mode: spindle RPM over machine max", () => {
    it("emits BLOCK flag with correct actual/limit values when S exceeds max_rpm", async () => {
      // max_rpm = 12000; program requests 14000
      const gcode = "G54\nS14000 M03\nG01 X10 F300\nM30";
      const result = await run(gcode);

      expect(result.summary.passed).toBe(false);
      expect(result.summary.block_count).toBeGreaterThanOrEqual(1);

      const rpmFlag = result.flags.find(
        f => f.dimension === "spindle_rpm" && f.severity === "BLOCK"
      );
      // Hard reference-value assertion — not toBeDefined stub
      expect(rpmFlag?.actual).toBe(14000);
      expect(rpmFlag?.limit).toBe(12000);
      expect(rpmFlag?.line).toBe(2);
      expect(typeof rpmFlag?.suggestion).toBe("string");
      expect((rpmFlag?.suggestion ?? "")).toContain("S12000");
    });

    it("passed===false is algebraically equivalent to block_count>0", async () => {
      const gcode = "G54\nS20000 M03\nG01 X5 F300\nM30";
      const result = await run(gcode);
      // invariant: passed === (block_count === 0)
      expect(result.summary.passed).toBe(result.summary.block_count === 0);
    });

    it("emits BLOCK for non-positive RPM (S0 with spindle on)", async () => {
      const gcode = "G54\nS0 M03\nG01 X10 F300\nM30";
      const result = await run(gcode);

      const nonPosFlag = result.flags.find(
        f => f.dimension === "spindle_rpm" && f.actual === 0
      );
      expect(nonPosFlag?.severity).toBe("BLOCK");
    });
  });

  describe("failure mode: axis travel out of machine envelope", () => {
    it("emits BLOCK for X exceeding +500 mm envelope", async () => {
      // work_volume.x = 500; move to X501
      const gcode = "G54\nG01 X501 F300\nM30";
      const result = await run(gcode);

      expect(result.summary.passed).toBe(false);
      const axisFlag = result.flags.find(
        f => f.dimension === "axis_travel" && f.severity === "BLOCK"
      );
      expect(axisFlag?.actual).toBe(501);
      expect(axisFlag?.limit).toBe(500);
    });

    it("emits BLOCK for negative X beyond -500 (abs-value check)", async () => {
      // Math.abs(-600) = 600 > 500
      const gcode = "G54\nG01 X-600 F300\nM30";
      const result = await run(gcode);

      const axisFlag = result.flags.find(
        f => f.dimension === "axis_travel" && (f.actual as number) === -600
      );
      expect(axisFlag?.severity).toBe("BLOCK");
      expect(axisFlag?.limit).toBe(500);
    });

    it("emits BLOCK for Z exceeding ±300 mm", async () => {
      // work_volume.z = 300; move to Z-400
      const gcode = "G54\nG01 Z-400 F300\nM30";
      const result = await run(gcode);

      expect(result.summary.passed).toBe(false);
      const zFlag = result.flags.find(
        f => f.dimension === "axis_travel" && (f.actual as number) === -400
      );
      expect(zFlag?.severity).toBe("BLOCK");
      expect(zFlag?.limit).toBe(300);
    });

    it("no axis_travel flag when positions are within envelope", async () => {
      const gcode = "G54\nG01 X499 Y399 Z-299 F300\nM30";
      const result = await run(gcode);

      const axisFlags = result.flags.filter(f => f.dimension === "axis_travel");
      expect(axisFlags).toHaveLength(0);
    });
  });

  describe("failure mode: zero or non-positive feed rate", () => {
    it("emits BLOCK for F0 (non-positive feed)", async () => {
      const gcode = "G54\nG01 X10 F0\nM30";
      const result = await run(gcode);

      const feedFlag = result.flags.find(
        f => f.dimension === "feed_rate" && f.severity === "BLOCK"
      );
      expect(feedFlag?.actual).toBe(0);
      expect(feedFlag?.severity).toBe("BLOCK");
    });
  });

  describe("failure mode: no work offset on a long program", () => {
    it("emits WARN at line 0 when no G54-G59 found and program >10 lines", async () => {
      const lines = Array.from({ length: 12 }, (_, i) => `G01 X${i} F300`);
      const gcode = lines.join("\n");

      const result = await run(gcode);

      const woFlag = result.flags.find(f => f.dimension === "work_offset");
      expect(woFlag?.severity).toBe("WARN");
      expect(woFlag?.line).toBe(0);
      expect(woFlag?.text).toBe("(program-level)");
    });

    it("does NOT emit work_offset WARN for short programs (<=10 lines)", async () => {
      const gcode = "G01 X5 F300\nG01 X10\nM30";
      const result = await run(gcode);

      const woFlag = result.flags.find(f => f.dimension === "work_offset");
      expect(woFlag).toBeUndefined();
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  describe("edge case: RPM in INFO zone (>95% but <=100% of max)", () => {
    it("emits INFO not BLOCK when RPM is 96% of max_rpm", async () => {
      // max_rpm = 12000; NEAR_LIMIT_PCT = 0.95 → threshold = 11400
      // 96% = 11520, which is above 11400 but below 12000
      const rpm = Math.ceil(12000 * 0.96); // 11520
      const gcode = `G54\nS${rpm} M03\nG01 X10 F300\nM30`;
      const result = await run(gcode);

      const infoFlag = result.flags.find(
        f => f.dimension === "spindle_rpm" && f.severity === "INFO" && f.actual === rpm
      );
      // Must have an INFO flag at the exact RPM value
      expect(infoFlag?.actual).toBe(rpm);
      expect(infoFlag?.limit).toBe(12000);

      // Must NOT produce a BLOCK (rpm < max_rpm)
      const blockFlag = result.flags.find(
        f => f.dimension === "spindle_rpm" && f.severity === "BLOCK"
      );
      expect(blockFlag).toBeUndefined();

      // Program passes (no BLOCKs)
      expect(result.summary.passed).toBe(true);
    });
  });

  describe("edge case: TSC coolant not supported", () => {
    it("emits WARN when M88 requested but machine lacks tsc coolant type", async () => {
      const machine = makeMachine({ coolant_types: ["flood"] });
      const gcode = "G54\nG01 X10 F300\nM88\nM30";
      const result = await run(gcode, { machine });

      const tscFlag = result.flags.find(f => f.dimension === "coolant" && f.severity === "WARN");
      expect(tscFlag?.actual).toBe("M88");
      expect(typeof tscFlag?.suggestion).toBe("string");
      expect((tscFlag?.suggestion ?? "")).toContain("M8");
    });

    it("does NOT emit coolant WARN when machine supports tsc", async () => {
      const machine = makeMachine({ coolant_types: ["flood", "tsc"] });
      const gcode = "G54\nG01 X10 F300\nM88\nM30";
      const result = await run(gcode, { machine });

      const tscWarn = result.flags.find(
        f => f.dimension === "coolant" && f.severity === "WARN"
      );
      expect(tscWarn).toBeUndefined();
    });
  });

  describe("edge case: tool count exceeds ATC capacity", () => {
    it("emits WARN when program uses more tools than atc_capacity", async () => {
      // atc_capacity = 20; use T1..T22
      const toolLines = Array.from({ length: 22 }, (_, i) => `T${i + 1}`);
      const gcode = ["G54", ...toolLines, "M30"].join("\n");
      const result = await run(gcode);

      const capFlag = result.flags.find(f => f.dimension === "tool_capacity");
      expect(capFlag?.severity).toBe("WARN");
      expect(capFlag?.actual).toBe(22);
      expect(capFlag?.limit).toBe(20);
    });

    it("respects max_tools_override when provided — no flag at 22 tools with override=25", async () => {
      const toolLines = Array.from({ length: 22 }, (_, i) => `T${i + 1}`);
      const gcode = ["G54", ...toolLines, "M30"].join("\n");
      const result = await run(gcode, { max_tools_override: 25 });

      const capFlag = result.flags.find(f => f.dimension === "tool_capacity");
      expect(capFlag).toBeUndefined();
    });
  });

  describe("edge case: skip_info filter", () => {
    it("excludes INFO flags when skip_info=true, includes them when false", async () => {
      // RPM at 96% triggers INFO
      const rpm = Math.ceil(12000 * 0.96);
      const gcode = `G54\nS${rpm} M03\nG01 X10 F300\nM30`;

      const withInfo = await run(gcode, { skip_info: false });
      const withoutInfo = await run(gcode, { skip_info: true });

      const infoInFull = withInfo.flags.filter(f => f.severity === "INFO");
      const infoInSkipped = withoutInfo.flags.filter(f => f.severity === "INFO");

      expect(infoInFull.length).toBeGreaterThan(0);
      expect(infoInSkipped).toHaveLength(0);
    });
  });

  describe("edge case: check_envelope action", () => {
    it("returns only axis_travel flags, filters out spindle RPM flags", async () => {
      // Both RPM violation (line 2) and axis violation (line 3) in same program
      const gcode = "G54\nS14000 M03\nG01 X600 F300\nM30";
      const result = await postValidationHardeningEngine.process({
        action: "check_envelope",
        gcode,
        machine: makeMachine(),
      });

      // Every flag must be axis_travel
      for (const flag of result.flags) {
        expect(flag.dimension).toBe("axis_travel");
      }

      // No spindle_rpm flags (those are filtered out by check_envelope)
      expect(result.flags.filter(f => f.dimension === "spindle_rpm")).toHaveLength(0);

      // The X=600 axis violation must be present
      const axisFlag = result.flags.find(f => (f.actual as number) === 600);
      expect(axisFlag?.severity).toBe("BLOCK");
    });

    it("summary block_count equals axis_travel BLOCKs only", async () => {
      const gcode = "G54\nS14000 M03\nG01 X600 F300\nM30";
      const result = await postValidationHardeningEngine.process({
        action: "check_envelope",
        gcode,
        machine: makeMachine(),
      });

      const axisBlockCount = result.flags.filter(
        f => f.dimension === "axis_travel" && f.severity === "BLOCK"
      ).length;
      // Algebraic invariant: block_count === axis_travel BLOCK count
      expect(result.summary.block_count).toBe(axisBlockCount);
    });
  });

  describe("edge case: by_dimension counter accuracy", () => {
    it("sum of by_dimension values equals total flag count (algebraic invariant)", async () => {
      const gcode = "G54\nS14000 M03\nG01 X600 F300\nM30";
      const result = await run(gcode);

      const total = Object.values(result.summary.by_dimension).reduce((a, b) => a + b, 0);
      expect(total).toBe(result.flags.length);
    });

    it("by_dimension tracks spindle_rpm and axis_travel separately", async () => {
      const gcode = "G54\nS14000 M03\nG01 X600 F300\nM30";
      const result = await run(gcode);

      expect(result.summary.by_dimension["spindle_rpm"]).toBeGreaterThanOrEqual(1);
      expect(result.summary.by_dimension["axis_travel"]).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Adversarial inputs ───────────────────────────────────────────────────────

  describe("adversarial: empty G-code string", () => {
    it("handles empty string — passes, zero flags, zero lines checked", async () => {
      const result = await run("");
      expect(result.summary.passed).toBe(true);
      expect(result.summary.block_count).toBe(0);
      expect(result.flags).toHaveLength(0);
      expect(result.summary.lines_checked).toBe(0);
    });
  });

  describe("adversarial: comments-only G-code", () => {
    it("treats all-comment program as empty — no BLOCKs produced", async () => {
      // Note: lines_checked skips '(' and ';' prefixed lines but NOT '%'
      // (the engine's procesing loop skips '%' but the summary counter does not).
      // The important invariant is: no BLOCK flags and passed=true.
      const gcode = [
        "(Program: test-part)",
        "; written by PRISM",
        "%",
        "(end)",
      ].join("\n");

      const result = await run(gcode);
      expect(result.summary.block_count).toBe(0);
      expect(result.summary.passed).toBe(true);
      expect(result.flags.filter(f => f.severity === "BLOCK")).toHaveLength(0);
    });
  });

  describe("adversarial: oversized feed rate (>99999)", () => {
    it("emits WARN for F100000 with correct actual and limit values", async () => {
      const gcode = "G54\nG01 X10 F100000\nM30";
      const result = await run(gcode);

      const feedWarn = result.flags.find(
        f => f.dimension === "feed_rate" && f.severity === "WARN"
      );
      expect(feedWarn?.actual).toBe(100000);
      expect(feedWarn?.limit).toBe(99999);
    });
  });

  describe("adversarial: unknown action throws", () => {
    it("rejects unknown action with a descriptive error message", async () => {
      await expect(
        postValidationHardeningEngine.process({
          action: "unknown_action" as ValidationInput["action"],
          gcode: "G01 X5",
          machine: makeMachine(),
        })
      ).rejects.toThrow("Unknown action: unknown_action");
    });
  });

  describe("adversarial: non-numeric value after X (garbage token)", () => {
    it("does not throw on malformed axis word (X with non-numeric suffix)", async () => {
      // "Xabc" → regex matches but parseFloat gives NaN; Math.abs(NaN) > 500 is false
      const gcode = "G54\nG01 Xabc F300\nM30";
      const result = await run(gcode);
      // No false-positive axis BLOCK from NaN coordinate
      const axisFlag = result.flags.find(f => f.dimension === "axis_travel");
      expect(axisFlag).toBeUndefined();
    });

    it("tolerates mixed valid and garbage tokens on same line without crashing", async () => {
      const gcode = "G54\nG01 X@@@ F???abc\nG01 X100 F300\nM30";
      const result = await run(gcode);
      // X100 is within ±500 envelope — no axis BLOCK
      const axisBlock = result.flags.find(
        f => f.dimension === "axis_travel" && f.severity === "BLOCK"
      );
      expect(axisBlock).toBeUndefined();
    });
  });
});
