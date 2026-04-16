/**
 * PPModalStateTrackerEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPModalStateTrackerEngine,
  ppModalStateTrackerEngine,
} from "../engines/PPModalStateTrackerEngine.js";

const SIMPLE_MILL = `%
O1001 (SIMPLE MILL)
G90 G21 G17
G54
T1 M6
S2000 M3
M8
G0 X0 Y0
G0 Z10.
G1 Z-1. F200.
G1 X50.
G1 Y50.
G0 Z25.
M9
M5
M30
%`;

const DRILL_CYCLE = `%
O2000
G90 G21 G17 G40 G49
G54
T1 M6
S1500 M3
M8
G0 X0 Y0
G0 Z10.
G98 G81 Z-5. R2. F100.
X10.
X20.
G80
M9
M5
M30
%`;

describe("PPModalStateTrackerEngine", () => {
  it("exports singleton", () => {
    expect(ppModalStateTrackerEngine).toBeInstanceOf(
      PPModalStateTrackerEngine,
    );
  });

  describe("track()", () => {
    it("returns a timeline with one entry per line", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      expect(r.timeline.length).toBe(r.total_lines);
      expect(r.total_lines).toBeGreaterThan(10);
    });

    it("captures final_state after program ends", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      expect(r.final_state.distance).toBe("G90");
      expect(r.final_state.units).toBe("G21");
      expect(r.final_state.plane).toBe("G17");
      expect(r.final_state.work_offset).toBe("G54");
      expect(r.final_state.spindle).toBe("M5"); // ended with M5
      expect(r.final_state.coolant).toBe("M9"); // ended with M9
    });

    it("records F-rate and S-rate progression", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      expect(r.final_state.feed_rate).toBe(200);
      expect(r.final_state.spindle_rpm).toBe(2000);
      expect(r.final_state.tool).toBe(1);
    });
  });

  describe("motion modal group", () => {
    it("tracks G0/G1 transitions", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      const motionTransitions = ppModalStateTrackerEngine.getTransitions(r, "motion");
      // At least G0, G1, G0 transitions
      expect(motionTransitions.length).toBeGreaterThanOrEqual(3);
    });

    it("state after G1 line has motion=G1", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      const g1Line = r.timeline.find(t => /G1.*Z-1/.test(t.raw_line));
      expect(g1Line).toBeDefined();
      expect(g1Line!.state.motion).toBe("G1");
    });
  });

  describe("plane modal group", () => {
    it("sets plane=G17 from header line", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      expect(r.final_state.plane).toBe("G17");
    });

    it("tracks G17→G18 transition", () => {
      const r = ppModalStateTrackerEngine.track("G17\nG18\nM30");
      const planeT = ppModalStateTrackerEngine.getTransitions(r, "plane");
      expect(planeT.length).toBe(2); // null→G17, G17→G18
      expect(planeT[1].from).toBe("G17");
      expect(planeT[1].to).toBe("G18");
    });
  });

  describe("distance modal group", () => {
    it("tracks G90↔G91", () => {
      const r = ppModalStateTrackerEngine.track("G90\nG91\nG90\nM30");
      const distT = ppModalStateTrackerEngine.getTransitions(r, "distance");
      expect(distT.length).toBe(3);
    });
  });

  describe("units modal group", () => {
    it("G20=inch, G21=mm", () => {
      const r = ppModalStateTrackerEngine.track("G20\nM30");
      expect(r.final_state.units).toBe("G20");

      const r2 = ppModalStateTrackerEngine.track("G21\nM30");
      expect(r2.final_state.units).toBe("G21");
    });
  });

  describe("cutter compensation modal group", () => {
    it("tracks G40 (off), G41 (left), G42 (right)", () => {
      const r = ppModalStateTrackerEngine.track("G41 D1\nG40\nG42 D2\nM30");
      expect(r.final_state.cutter_comp).toBe("G42");
      const t = ppModalStateTrackerEngine.getTransitions(r, "cutter_comp");
      expect(t.length).toBe(3);
    });
  });

  describe("work offset modal group", () => {
    it("tracks G54-G59", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      expect(r.final_state.work_offset).toBe("G54");
    });

    it("G54.1 emits warning and stores as G54", () => {
      const r = ppModalStateTrackerEngine.track("G54.1 P3\nM30");
      expect(r.warnings.some(w => w.includes("G54.1"))).toBe(true);
      expect(r.final_state.work_offset).toBe("G54");
    });
  });

  describe("feed mode modal group", () => {
    it("tracks G93/94/95", () => {
      const r = ppModalStateTrackerEngine.track("G94\nG93\nG95\nM30");
      expect(r.final_state.feed_mode).toBe("G95");
    });
  });

  describe("spindle mode (CSS vs RPM)", () => {
    it("G96=CSS, G97=RPM", () => {
      const r = ppModalStateTrackerEngine.track("G96 S150\nG97 S1500\nM30");
      expect(r.final_state.spindle_mode).toBe("G97");
      expect(r.final_state.spindle_rpm).toBe(1500);
    });
  });

  describe("canned cycle tracking", () => {
    it("tracks G81 drill and G80 cancel", () => {
      const r = ppModalStateTrackerEngine.track(DRILL_CYCLE);
      const cannedT = ppModalStateTrackerEngine.getTransitions(r, "canned_cycle");
      // Transitions: null→G81, G81→G80
      expect(cannedT.some(t => t.to === "G81")).toBe(true);
      expect(cannedT.some(t => t.to === "G80")).toBe(true);
    });

    it("state after G81 line has canned_cycle=G81", () => {
      const r = ppModalStateTrackerEngine.track(DRILL_CYCLE);
      const g81Line = r.timeline.find(t => /G81/.test(t.raw_line));
      expect(g81Line).toBeDefined();
      expect(g81Line!.state.canned_cycle).toBe("G81");
    });

    it("state after G80 line has canned_cycle=G80", () => {
      const r = ppModalStateTrackerEngine.track(DRILL_CYCLE);
      const g80Line = r.timeline.find(t => /^G80/.test(t.raw_line.trim()));
      expect(g80Line).toBeDefined();
      expect(g80Line!.state.canned_cycle).toBe("G80");
    });
  });

  describe("return mode", () => {
    it("G98 = initial Z, G99 = R-plane", () => {
      const r = ppModalStateTrackerEngine.track(DRILL_CYCLE);
      expect(r.final_state.return_mode).toBe("G98");
    });
  });

  describe("spindle on/off", () => {
    it("tracks M3/M4/M5 transitions", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      const sT = ppModalStateTrackerEngine.getTransitions(r, "spindle");
      // null→M3 and M3→M5
      expect(sT.length).toBe(2);
      expect(sT[0].to).toBe("M3");
      expect(sT[1].to).toBe("M5");
    });
  });

  describe("coolant tracking", () => {
    it("tracks M7/M8/M9", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      expect(r.final_state.coolant).toBe("M9");
    });
  });

  describe("tool tracking", () => {
    it("last T-word wins", () => {
      const r = ppModalStateTrackerEngine.track("T1 M6\nT2 M6\nM30");
      expect(r.final_state.tool).toBe(2);
    });
  });

  describe("getStateAtLine", () => {
    it("returns state after the specified line", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      const state = ppModalStateTrackerEngine.getStateAtLine(r, 3);
      expect(state).not.toBeNull();
      // Line 3 is "G90 G21 G17"
      expect(state!.distance).toBe("G90");
      expect(state!.units).toBe("G21");
      expect(state!.plane).toBe("G17");
    });

    it("returns null for nonexistent line", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      const state = ppModalStateTrackerEngine.getStateAtLine(r, 99999);
      expect(state).toBeNull();
    });
  });

  describe("getActiveModal", () => {
    it("returns the active value of a specific modal group", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      const motion = ppModalStateTrackerEngine.getActiveModal(r, "motion", 9);
      // After line 9 ("G0 X0 Y0"), motion should be G0
      expect(motion).toBe("G0");
    });

    it("returns null before any transition in group", () => {
      const r = ppModalStateTrackerEngine.track("M30");
      const motion = ppModalStateTrackerEngine.getActiveModal(r, "motion", 1);
      expect(motion).toBeNull();
    });
  });

  describe("initial state override", () => {
    it("respects initial state parameter", () => {
      const r = ppModalStateTrackerEngine.track("G1 X10\nM30", {
        distance: "G90",
        units: "G21",
        plane: "G17",
      });
      expect(r.timeline[0].state.distance).toBe("G90");
      expect(r.timeline[0].state.units).toBe("G21");
    });
  });

  describe("transitions_by_group", () => {
    it("counts transitions per modal group", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      expect(r.transitions_by_group.motion).toBeGreaterThan(0);
      expect(r.transitions_by_group.spindle).toBeGreaterThan(0);
      expect(r.transitions_by_group.distance).toBeGreaterThanOrEqual(1);
    });

    it("does not count groups with zero transitions", () => {
      const r = ppModalStateTrackerEngine.track("M30");
      expect(r.transitions_by_group.motion).toBeUndefined();
    });
  });

  describe("comment handling", () => {
    it("ignores G-codes inside parenthetical comments", () => {
      const r = ppModalStateTrackerEngine.track(
        "(G91 INCREMENTAL COMMENT)\nG90\nM30",
      );
      expect(r.final_state.distance).toBe("G90");
      // Should NOT have transitioned through G91
      const distT = ppModalStateTrackerEngine.getTransitions(r, "distance");
      expect(distT.length).toBe(1); // only null→G90
      expect(distT[0].to).toBe("G90");
    });

    it("ignores G-codes after ; comments", () => {
      const r = ppModalStateTrackerEngine.track(
        "G90 ; G91 inside comment should be ignored\nM30",
      );
      expect(r.final_state.distance).toBe("G90");
    });
  });

  describe("multiple G-codes on one line", () => {
    it("captures all group transitions on a single line", () => {
      const r = ppModalStateTrackerEngine.track("G90 G21 G17\nM30");
      const first = r.timeline[0];
      expect(first.state.distance).toBe("G90");
      expect(first.state.units).toBe("G21");
      expect(first.state.plane).toBe("G17");
      expect(first.changes.length).toBe(3);
    });
  });

  describe("changes array", () => {
    it("each change references the correct modal group", () => {
      const r = ppModalStateTrackerEngine.track(SIMPLE_MILL);
      for (const entry of r.timeline) {
        for (const c of entry.changes) {
          expect(c.from).not.toBe(c.to);
        }
      }
    });

    it("empty changes for blank lines", () => {
      const r = ppModalStateTrackerEngine.track("G90\n\n\nM30");
      const blankLines = r.timeline.filter(t => t.raw_line.trim() === "");
      for (const b of blankLines) {
        expect(b.changes.length).toBe(0);
      }
    });
  });

  describe("defaultInitialState", () => {
    it("returns all-null ModalState", () => {
      const s = ppModalStateTrackerEngine.defaultInitialState();
      expect(s.motion).toBeNull();
      expect(s.plane).toBeNull();
      expect(s.distance).toBeNull();
      expect(s.units).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppModalStateTrackerEngine.track("");
      expect(r.total_lines).toBe(1);
      expect(r.timeline[0].changes.length).toBe(0);
    });

    it("handles comments-only program", () => {
      const r = ppModalStateTrackerEngine.track(
        "(PROGRAM START)\n(HEADER)\n(END)",
      );
      expect(r.timeline.every(t => t.changes.length === 0)).toBe(true);
    });

    it("handles unusual decimal G-codes (e.g., G10.6)", () => {
      // G10.6 is a probe cycle, not in any of our tracked groups — should pass
      const r = ppModalStateTrackerEngine.track("G10.6 X0\nM30");
      expect(r.warnings.length).toBe(0);
      expect(r.total_lines).toBe(2);
    });
  });
});
