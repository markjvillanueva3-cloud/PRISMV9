/**
 * PPCannedCycleValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPCannedCycleValidatorEngine,
  ppCannedCycleValidatorEngine,
} from "../engines/PPCannedCycleValidatorEngine.js";

describe("PPCannedCycleValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppCannedCycleValidatorEngine).toBeInstanceOf(PPCannedCycleValidatorEngine);
  });

  describe("missing_r_plane", () => {
    it("flags G81 without R", () => {
      const code = `%
O1001
G90 G21
S2000 M3
G0 X10. Y10.
G81 Z-10. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_r_plane");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G81 with R", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G81 Z-10. R2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_r_plane");
      expect(m.length).toBe(0);
    });
  });

  describe("z_above_r_plane", () => {
    it("flags Z >= R", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G81 Z5. R2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const z = r.issues.filter((i) => i.kind === "z_above_r_plane");
      expect(z.length).toBe(1);
      expect(z[0].severity).toBe("error");
    });

    it("does not flag when Z < R", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G81 Z-10. R2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const z = r.issues.filter((i) => i.kind === "z_above_r_plane");
      expect(z.length).toBe(0);
    });
  });

  describe("missing_peck_q", () => {
    it("flags G83 without Q", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G83 Z-10. R2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const q = r.issues.filter((i) => i.kind === "missing_peck_q");
      expect(q.length).toBe(1);
      expect(q[0].severity).toBe("error");
    });

    it("does not flag G83 with Q", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G83 Z-10. R2. Q2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const q = r.issues.filter((i) => i.kind === "missing_peck_q");
      expect(q.length).toBe(0);
    });
  });

  describe("peck_exceeds_depth", () => {
    it("flags Q > hole depth", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G83 Z-5. R2. Q20. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const p = r.issues.filter((i) => i.kind === "peck_exceeds_depth");
      expect(p.length).toBe(1);
      expect(p[0].severity).toBe("warning");
    });

    it("does not flag Q < hole depth", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G83 Z-20. R2. Q2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const p = r.issues.filter((i) => i.kind === "peck_exceeds_depth");
      expect(p.length).toBe(0);
    });
  });

  describe("tap_without_rigid_mode", () => {
    it("flags G84 without M29", () => {
      const code = `%
O1001
S500 M3
G0 X10. Y10.
G84 Z-10. R2. F500.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const t = r.issues.filter((i) => i.kind === "tap_without_rigid_mode");
      expect(t.length).toBe(1);
      expect(t[0].severity).toBe("warning");
    });

    it("does not flag G84 with M29", () => {
      const code = `%
O1001
S500 M3
M29 S500
G0 X10. Y10.
G84 Z-10. R2. F500.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const t = r.issues.filter((i) => i.kind === "tap_without_rigid_mode");
      expect(t.length).toBe(0);
    });

    it("does not flag G84.2 (rigid direct)", () => {
      const code = `%
O1001
S500 M3
G0 X10. Y10.
G84.2 Z-10. R2. F500.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const t = r.issues.filter((i) => i.kind === "tap_without_rigid_mode");
      expect(t.length).toBe(0);
    });

    it("require_rigid_tap=false suppresses", () => {
      const code = `%
O1001
S500 M3
G0 X10. Y10.
G84 Z-10. R2. F500.
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code, {
        require_rigid_tap: false,
      });
      const t = r.issues.filter((i) => i.kind === "tap_without_rigid_mode");
      expect(t.length).toBe(0);
    });
  });

  describe("missing_g80_before_rapid", () => {
    it("flags G0 XY during active cycle", () => {
      const code = `%
O1001
S2000 M3
G81 X10. Y10. Z-10. R2. F100.
G0 X20. Y20.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_g80_before_rapid");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag G0 after G80", () => {
      const code = `%
O1001
S2000 M3
G81 X10. Y10. Z-10. R2. F100.
G80
G0 X20. Y20.
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_g80_before_rapid");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_dwell_g82_g89", () => {
    it("flags G82 without P", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G82 Z-5. R2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const d = r.issues.filter((i) => i.kind === "missing_dwell_g82_g89");
      expect(d.length).toBe(1);
    });

    it("does not flag G82 with P", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G82 Z-5. R2. P500 F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const d = r.issues.filter((i) => i.kind === "missing_dwell_g82_g89");
      expect(d.length).toBe(0);
    });

    it("flags G89 without P", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G89 Z-5. R2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const d = r.issues.filter((i) => i.kind === "missing_dwell_g82_g89");
      expect(d.length).toBe(1);
    });
  });

  describe("feed_not_set", () => {
    it("flags cycle without F and no prior modal F", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G81 Z-10. R2.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const f = r.issues.filter((i) => i.kind === "feed_not_set");
      expect(f.length).toBe(1);
      expect(f[0].severity).toBe("error");
    });

    it("does not flag when F set in prior line", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
F100
G81 Z-10. R2.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      const f = r.issues.filter((i) => i.kind === "feed_not_set");
      expect(f.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("tracks cycles_seen", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G81 Z-5. R2. F100.
G83 Z-15. R2. Q2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      expect(r.summary.cycles_seen).toContain("G81");
      expect(r.summary.cycles_seen).toContain("G83");
      expect(r.summary.cycles_seen).toContain("G80");
    });

    it("counts each cycle", () => {
      const code = `%
O1001
S2000 M3
G81 X10. Z-5. R2. F100.
G80
G81 X20. Z-5. R2. F100.
G80
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      expect(r.summary.g81_count).toBe(2);
      expect(r.summary.g80_count).toBe(2);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
G81 Z-5. R2. F100.
G80
M30
%`;
      const q = ppCannedCycleValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.cycles).toContain("G81");
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppCannedCycleValidatorEngine.defaultOptions();
      expect(o.require_rigid_tap).toBe(true);
      expect(o.warn_peck_exceeds_depth).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppCannedCycleValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
    });

    it("handles program without any cycles", () => {
      const code = `%
O1001
S2000 M3
G1 X10. F100.
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      expect(r.summary.cycles_seen.length).toBe(0);
    });

    it("ignores cycle codes in comments", () => {
      const code = `%
O1001
(G83 deep drill cycle)
G0 X10. Y10.
M30
%`;
      const r = ppCannedCycleValidatorEngine.validate(code);
      expect(r.summary.g83_count).toBe(0);
    });
  });
});
