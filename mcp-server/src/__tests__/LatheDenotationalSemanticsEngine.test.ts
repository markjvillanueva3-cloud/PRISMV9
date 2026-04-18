/**
 * LatheDenotationalSemanticsEngine Tests
 *
 * U-LTH65: G-code denotational semantics with pure state transformers
 */

import { describe, it, expect } from "vitest";
import {
  latheDenotationalSemanticsEngine,
  INITIAL_STATE,
} from "../engines/LatheDenotationalSemanticsEngine.js";

describe("LatheDenotationalSemanticsEngine", () => {
  describe("G-Code Semantics", () => {
    it("returns semantics for motion codes", () => {
      const g0 = latheDenotationalSemanticsEngine.getGCodeSemantics("G0");
      const g1 = latheDenotationalSemanticsEngine.getGCodeSemantics("G1");
      const g2 = latheDenotationalSemanticsEngine.getGCodeSemantics("G2");
      const g3 = latheDenotationalSemanticsEngine.getGCodeSemantics("G3");

      expect(g0?.category).toBe("motion");
      expect(g1?.description).toContain("Linear");
      expect(g2?.description).toContain("CW");
      expect(g3?.description).toContain("CCW");
    });

    it("returns semantics for positioning codes", () => {
      const g90 = latheDenotationalSemanticsEngine.getGCodeSemantics("G90");
      const g91 = latheDenotationalSemanticsEngine.getGCodeSemantics("G91");

      expect(g90?.category).toBe("positioning");
      expect(g91?.category).toBe("positioning");
    });

    it("returns semantics for unit codes", () => {
      const g20 = latheDenotationalSemanticsEngine.getGCodeSemantics("G20");
      const g21 = latheDenotationalSemanticsEngine.getGCodeSemantics("G21");

      expect(g20?.description).toContain("Inch");
      expect(g21?.description).toContain("Metric");
    });

    it("returns null for unknown code", () => {
      const unknown = latheDenotationalSemanticsEngine.getGCodeSemantics("G999");
      expect(unknown).toBeNull();
    });

    it("handles case insensitive lookup", () => {
      const upper = latheDenotationalSemanticsEngine.getGCodeSemantics("G0");
      const lower = latheDenotationalSemanticsEngine.getGCodeSemantics("g0");

      expect(upper).not.toBeNull();
      expect(lower).not.toBeNull();
    });
  });

  describe("M-Code Semantics", () => {
    it("returns semantics for spindle codes", () => {
      const m3 = latheDenotationalSemanticsEngine.getMCodeSemantics("M3");
      const m4 = latheDenotationalSemanticsEngine.getMCodeSemantics("M4");
      const m5 = latheDenotationalSemanticsEngine.getMCodeSemantics("M5");

      expect(m3?.category).toBe("spindle");
      expect(m4?.category).toBe("spindle");
      expect(m5?.description).toContain("stop");
    });

    it("returns semantics for coolant codes", () => {
      const m7 = latheDenotationalSemanticsEngine.getMCodeSemantics("M7");
      const m8 = latheDenotationalSemanticsEngine.getMCodeSemantics("M8");
      const m9 = latheDenotationalSemanticsEngine.getMCodeSemantics("M9");

      expect(m7?.category).toBe("coolant");
      expect(m8?.category).toBe("coolant");
      expect(m9?.description).toContain("off");
    });

    it("returns semantics for program codes", () => {
      const m30 = latheDenotationalSemanticsEngine.getMCodeSemantics("M30");

      expect(m30?.category).toBe("program");
      expect(m30?.description).toContain("end");
    });
  });

  describe("Word Semantics", () => {
    it("returns semantics for axis words", () => {
      const x = latheDenotationalSemanticsEngine.getWordSemantics("X");
      const z = latheDenotationalSemanticsEngine.getWordSemantics("Z");

      expect(x?.description).toContain("X axis");
      expect(z?.description).toContain("Z axis");
    });

    it("returns semantics for feed and speed", () => {
      const f = latheDenotationalSemanticsEngine.getWordSemantics("F");
      const s = latheDenotationalSemanticsEngine.getWordSemantics("S");

      expect(f?.description).toContain("Feedrate");
      expect(s?.description).toContain("Spindle");
    });

    it("returns semantics for tool word", () => {
      const t = latheDenotationalSemanticsEngine.getWordSemantics("T");

      expect(t?.description).toContain("Tool");
    });
  });

  describe("State Transformation", () => {
    it("applies G0 to set motion mode", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.applyGCode("G0", state);

      expect(newState.motion_mode).toBe("G0");
    });

    it("applies G90/G91 to set positioning mode", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();

      const abs = latheDenotationalSemanticsEngine.applyGCode("G90", state);
      const inc = latheDenotationalSemanticsEngine.applyGCode("G91", state);

      expect(abs.positioning_mode).toBe("G90");
      expect(inc.positioning_mode).toBe("G91");
    });

    it("applies M3/M4/M5 to set spindle direction", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();

      const cw = latheDenotationalSemanticsEngine.applyMCode("M3", state);
      const ccw = latheDenotationalSemanticsEngine.applyMCode("M4", state);
      const stop = latheDenotationalSemanticsEngine.applyMCode("M5", state);

      expect(cw.spindle_direction).toBe("cw");
      expect(ccw.spindle_direction).toBe("ccw");
      expect(stop.spindle_direction).toBe("off");
    });

    it("applies M8/M9 to set coolant", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();

      const on = latheDenotationalSemanticsEngine.applyMCode("M8", state);
      const off = latheDenotationalSemanticsEngine.applyMCode("M9", on);

      expect(on.coolant).toBe("flood");
      expect(off.coolant).toBe("off");
    });

    it("applies X word in absolute mode", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.applyWord("X", 50, state);

      expect(newState.x).toBe(50);
    });

    it("applies X word in incremental mode", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState({
        x: 10,
        positioning_mode: "G91",
      });
      const newState = latheDenotationalSemanticsEngine.applyWord("X", 5, state);

      expect(newState.x).toBe(15);
    });

    it("applies Z word with unit conversion", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState({
        units: "G20", // inches
      });
      const newState = latheDenotationalSemanticsEngine.applyWord("Z", 1, state);

      expect(newState.z).toBeCloseTo(25.4, 1); // 1 inch = 25.4mm
    });

    it("applies F word to set feedrate", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.applyWord("F", 500, state);

      expect(newState.feedrate).toBe(500);
    });

    it("applies S word to set spindle speed", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.applyWord("S", 3000, state);

      expect(newState.spindle_speed).toBe(3000);
    });

    it("applies T word to set tool", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.applyWord("T", 101, state);

      expect(newState.tool_number).toBe(1);
      expect(newState.tool_offset).toBe(1);
    });
  });

  describe("Block Execution", () => {
    it("executes simple block", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.executeBlock("G0 X50 Z10", state);

      expect(newState.motion_mode).toBe("G0");
      expect(newState.x).toBe(50);
      expect(newState.z).toBe(10);
    });

    it("executes block with multiple G-codes", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.executeBlock("G21 G90 G0 X100", state);

      expect(newState.units).toBe("G21");
      expect(newState.positioning_mode).toBe("G90");
      expect(newState.motion_mode).toBe("G0");
      expect(newState.x).toBe(100);
    });

    it("executes block with M-codes", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.executeBlock("S3000 M3", state);

      expect(newState.spindle_speed).toBe(3000);
      expect(newState.spindle_direction).toBe("cw");
    });

    it("executes block with feed", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.executeBlock("G1 X50 Z-30 F200", state);

      expect(newState.motion_mode).toBe("G1");
      expect(newState.feedrate).toBe(200);
    });
  });

  describe("Program Execution", () => {
    it("executes simple program", () => {
      const program = `
        G21 G90
        G0 X50 Z10
        G1 Z-30 F200
      `;

      const states = latheDenotationalSemanticsEngine.executeProgram(program);

      expect(states.length).toBe(4); // initial + 3 blocks
      expect(states[3].z).toBe(-30);
    });

    it("tracks state across blocks", () => {
      const program = `
        G91
        G0 X10
        G0 X10
        G0 X10
      `;

      const states = latheDenotationalSemanticsEngine.executeProgram(program);

      expect(states[4].x).toBe(30); // 10 + 10 + 10
    });

    it("ignores comments", () => {
      const program = `
        (COMMENT)
        G0 X50
      `;

      const states = latheDenotationalSemanticsEngine.executeProgram(program);

      expect(states.length).toBe(2);
    });

    it("accepts initial state override", () => {
      const program = "G0 X10";

      const states = latheDenotationalSemanticsEngine.executeProgram(program, {
        x: 100,
        positioning_mode: "G91",
      });

      expect(states[1].x).toBe(110); // 100 + 10
    });
  });

  describe("Dialect Normalization", () => {
    it("detects Fanuc dialect", () => {
      const program = "G0 X50 Z10";
      const dialect = latheDenotationalSemanticsEngine.detectDialect(program);

      expect(dialect).toBe("fanuc");
    });

    it("detects Mazak dialect", () => {
      const program = "G112 X50";
      const dialect = latheDenotationalSemanticsEngine.detectDialect(program);

      expect(dialect).toBe("mazak");
    });

    it("normalizes to RS274", () => {
      const program = "G112 X50";
      const result = latheDenotationalSemanticsEngine.normalizeToRS274(program);

      expect(result.dialect_detected).toBe("mazak");
      expect(result.normalized).toContain("G18");
      expect(result.transformations.length).toBeGreaterThan(0);
    });

    it("returns unchanged for standard codes", () => {
      const program = "G0 X50";
      const result = latheDenotationalSemanticsEngine.normalizeToRS274(program);

      expect(result.normalized).toBe(program);
      expect(result.transformations.length).toBe(0);
    });
  });

  describe("Algebraic Composition", () => {
    it("composes transformers", () => {
      const t1 = latheDenotationalSemanticsEngine.getGCodeSemantics("G0")!.transform;
      const t2 = latheDenotationalSemanticsEngine.getGCodeSemantics("G90")!.transform;

      const composed = latheDenotationalSemanticsEngine.compose(t1, t2);
      const state = composed(INITIAL_STATE);

      expect(state.motion_mode).toBe("G0");
      expect(state.positioning_mode).toBe("G90");
    });

    it("composes blocks", () => {
      const blocks = ["G0 X10", "G0 X20", "G0 X30"];
      const composed = latheDenotationalSemanticsEngine.composeBlocks(blocks);

      const state = composed(INITIAL_STATE);

      expect(state.x).toBe(30);
    });
  });

  describe("State Equality", () => {
    it("returns true for equal states", () => {
      const a = latheDenotationalSemanticsEngine.createInitialState({ x: 10, z: 20 });
      const b = latheDenotationalSemanticsEngine.createInitialState({ x: 10, z: 20 });

      expect(latheDenotationalSemanticsEngine.statesEqual(a, b)).toBe(true);
    });

    it("returns false for different positions", () => {
      const a = latheDenotationalSemanticsEngine.createInitialState({ x: 10 });
      const b = latheDenotationalSemanticsEngine.createInitialState({ x: 20 });

      expect(latheDenotationalSemanticsEngine.statesEqual(a, b)).toBe(false);
    });

    it("returns false for different modes", () => {
      const a = latheDenotationalSemanticsEngine.createInitialState({ motion_mode: "G0" });
      const b = latheDenotationalSemanticsEngine.createInitialState({ motion_mode: "G1" });

      expect(latheDenotationalSemanticsEngine.statesEqual(a, b)).toBe(false);
    });

    it("uses tolerance for floating point", () => {
      const a = latheDenotationalSemanticsEngine.createInitialState({ x: 10.00001 });
      const b = latheDenotationalSemanticsEngine.createInitialState({ x: 10.00002 });

      expect(latheDenotationalSemanticsEngine.statesEqual(a, b)).toBe(true);
    });
  });

  describe("Coverage Analysis", () => {
    it("reports G/M/word coverage", () => {
      const coverage = latheDenotationalSemanticsEngine.getCoverage();

      expect(coverage.g_codes).toBeGreaterThan(20);
      expect(coverage.m_codes).toBeGreaterThan(10);
      expect(coverage.words).toBeGreaterThanOrEqual(5);
      expect(coverage.total).toBe(coverage.g_codes + coverage.m_codes + coverage.words);
    });

    it("identifies uncovered codes", () => {
      const used = ["G0", "G1", "G999"];
      const uncovered = latheDenotationalSemanticsEngine.getUncoveredCodes(used);

      expect(uncovered).toContain("G999");
      expect(uncovered).not.toContain("G0");
    });
  });

  describe("List All Codes", () => {
    it("lists all G-codes", () => {
      const gCodes = latheDenotationalSemanticsEngine.getAllGCodes();

      expect(gCodes.length).toBeGreaterThan(0);
      expect(gCodes.some((g) => g.code === "G0")).toBe(true);
    });

    it("lists all M-codes", () => {
      const mCodes = latheDenotationalSemanticsEngine.getAllMCodes();

      expect(mCodes.length).toBeGreaterThan(0);
      expect(mCodes.some((m) => m.code === "M30")).toBe(true);
    });
  });

  describe("Initial State", () => {
    it("creates initial state with defaults", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();

      expect(state.x).toBe(0);
      expect(state.z).toBe(0);
      expect(state.positioning_mode).toBe("G90");
      expect(state.units).toBe("G21");
    });

    it("creates initial state with overrides", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState({
        x: 100,
        feedrate: 500,
      });

      expect(state.x).toBe(100);
      expect(state.feedrate).toBe(500);
      expect(state.z).toBe(0); // default
    });
  });

  describe("Canned Cycles", () => {
    it("handles canned cycle G-codes", () => {
      const g71 = latheDenotationalSemanticsEngine.getGCodeSemantics("G71");
      const g76 = latheDenotationalSemanticsEngine.getGCodeSemantics("G76");
      const g80 = latheDenotationalSemanticsEngine.getGCodeSemantics("G80");

      expect(g71?.category).toBe("canned_cycle");
      expect(g76?.description).toContain("Threading");
      expect(g80?.description).toContain("Cancel");
    });

    it("sets canned cycle mode", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState();
      const newState = latheDenotationalSemanticsEngine.applyGCode("G71", state);

      expect(newState.canned_cycle).toBe("G71");
    });

    it("cancels canned cycle with G80", () => {
      const state = latheDenotationalSemanticsEngine.createInitialState({
        canned_cycle: "G71",
      });
      const newState = latheDenotationalSemanticsEngine.applyGCode("G80", state);

      expect(newState.canned_cycle).toBeNull();
    });
  });
});
