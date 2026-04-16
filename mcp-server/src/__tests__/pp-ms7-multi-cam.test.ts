/**
 * PP-MS7 Tests: Multi-CAM Post Templates + Machine Sequences + Mill-Turn
 */
import { describe, it, expect } from "vitest";
import { multiCAMPostEngine } from "../engines/MultiCAMPostEngine.js";

describe("PP-MS7: MultiCAMPostEngine", () => {

  describe("CAM System Registry", () => {
    it("lists 13 CAM systems", () => {
      const systems = multiCAMPostEngine.listCAMSystems();
      expect(systems.length).toBe(13);
    });

    it("all systems have display name and post format", () => {
      for (const sys of multiCAMPostEngine.listCAMSystems()) {
        expect(sys.display_name).toBeTruthy();
        expect(sys.post_format).toBeTruthy();
        expect(sys.phase_b).toBe(true); // all support Phase B
      }
    });

    it("10 systems support Phase A (inline)", () => {
      const phaseA = multiCAMPostEngine.listCAMSystems().filter(s => s.phase_a);
      expect(phaseA.length).toBe(10);
    });

    it("3 systems are Phase B only (encrypted)", () => {
      expect(multiCAMPostEngine.supportsPhaseA("hypermill")).toBe(false);
      expect(multiCAMPostEngine.supportsPhaseA("tebis")).toBe(false);
      expect(multiCAMPostEngine.supportsPhaseA("edgecam")).toBe(false);
      expect(multiCAMPostEngine.supportsPhaseB("hypermill")).toBe(true);
      expect(multiCAMPostEngine.supportsPhaseB("tebis")).toBe(true);
    });
  });

  describe("Post Scaffold Generation", () => {
    it("generates Mastercam .pst scaffold", () => {
      const r = multiCAMPostEngine.getPostScaffold("mastercam", "fanuc_31i");
      expect(r.format).toBe("pst");
      expect(r.scaffold).toContain("Mastercam");
      expect(r.scaffold).toContain("18361");
      expect(r.instructions.length).toBeGreaterThan(0);
    });

    it("generates NX TCL scaffold", () => {
      const r = multiCAMPostEngine.getPostScaffold("nx", "siemens_840d");
      expect(r.format).toBe("tcl");
      expect(r.scaffold).toContain("MOM_linear_move");
      expect(r.scaffold).toContain("MOM_rapid_move");
      expect(r.scaffold).toContain("18361");
    });

    it("generates generic scaffold for other systems", () => {
      const r = multiCAMPostEngine.getPostScaffold("solidcam", "fanuc_31i");
      expect(r.format).toBe("gpp");
      expect(r.scaffold).toContain("SolidCAM");
      expect(r.scaffold).toContain("18361");
    });

    it("returns Phase B instructions for encrypted systems", () => {
      const r = multiCAMPostEngine.getPostScaffold("hypermill", "heidenhain_tnc640");
      expect(r.scaffold).toBe("");
      expect(r.instructions.some(i => i.includes("Phase B"))).toBe(true);
      expect(r.instructions.some(i => i.includes("prism optimize"))).toBe(true);
    });
  });

  describe("Machine Safety Sequences", () => {
    it("vertical mill has G90 G21 safe start", () => {
      const seq = multiCAMPostEngine.getMachineSequence("vertical_mill", "fanuc_31i");
      expect(seq.startup.some(l => l.includes("G90"))).toBe(true);
      expect(seq.shutdown.some(l => l.includes("M30"))).toBe(true);
    });

    it("Heidenhain uses BEGIN/END PGM", () => {
      const seq = multiCAMPostEngine.getMachineSequence("vertical_mill", "heidenhain_tnc640");
      expect(seq.startup.some(l => l.includes("BEGIN PGM"))).toBe(true);
      expect(seq.shutdown.some(l => l.includes("END PGM"))).toBe(true);
    });

    it("lathe uses G18 (ZX plane)", () => {
      const seq = multiCAMPostEngine.getMachineSequence("lathe", "fanuc_31i");
      expect(seq.startup.some(l => l.includes("G18"))).toBe(true);
    });

    it("mill-turn has spindle warmup", () => {
      const seq = multiCAMPostEngine.getMachineSequence("mill_turn", "mazak_smooth_ai");
      expect(seq.spindle_warmup).toBeDefined();
      expect(seq.spindle_warmup!.length).toBeGreaterThan(0);
    });

    it("tool change includes T, M6, S for Fanuc", () => {
      const seq = multiCAMPostEngine.getMachineSequence("vertical_mill", "fanuc_31i");
      expect(seq.tool_change.some(l => l.includes("T{tool}"))).toBe(true);
      expect(seq.tool_change.some(l => l.includes("M6"))).toBe(true);
    });

    it("Siemens tool change includes D1", () => {
      const seq = multiCAMPostEngine.getMachineSequence("vertical_mill", "siemens_840d");
      expect(seq.tool_change.some(l => l.includes("D1"))).toBe(true);
    });
  });

  describe("Mill-Turn Channels", () => {
    it("Siemens uses WAITM sync", () => {
      const ch = multiCAMPostEngine.getMillTurnChannels("siemens_840d");
      expect(ch.length).toBe(3);
      expect(ch[0].type).toBe("main_spindle");
      expect(ch[0].sync_code).toContain("WAITM");
    });

    it("Mazak uses !-code sync", () => {
      const ch = multiCAMPostEngine.getMillTurnChannels("mazak_smooth_ai");
      expect(ch.length).toBe(3);
      expect(ch[0].sync_code).toContain("!");
    });

    it("Fanuc has 2 channels (main + sub)", () => {
      const ch = multiCAMPostEngine.getMillTurnChannels("fanuc_31i");
      expect(ch.length).toBe(2);
    });
  });

  describe("Phase B Commands", () => {
    it("generates CLI command for hyperMILL re-optimization", () => {
      const cmd = multiCAMPostEngine.getPhaseBCommand(
        "hypermill", "output.nc", "Inconel 718", "heidenhain_tnc640"
      );
      expect(cmd).toContain("prism optimize");
      expect(cmd).toContain("output.nc");
      expect(cmd).toContain("Inconel 718");
      expect(cmd).toContain("heidenhain_tnc640");
    });
  });
});
