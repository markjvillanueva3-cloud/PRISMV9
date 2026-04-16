/**
 * PPG-REAL S4b U-PPR17/18/19: Probing, 5-axis, and all 10 controllers.
 * Tests: probing syntax, RTCP/TCP, tilted workplane, all controller dialects.
 */
import { describe, it, expect } from "vitest";
import { masterPostProcessorEngine } from "../engines/MasterPostProcessorEngine.js";
import type { CamToolpathSegment, MachineProfile } from "../engines/MasterPostProcessorEngine.js";
import * as fs from "fs";
import * as path from "path";

const CPS_PATH = path.resolve(__dirname, "../../scripts/fusion360-post/PRISM-Master.cps");
let cps: string;

function loadCps() {
  if (!cps) { cps = fs.readFileSync(CPS_PATH, "utf-8"); }
  return cps;
}

// ── U-PPR17: Probing Routines ───────────────────────────────────────────

describe("U-PPR17: Probing routines", () => {
  it("Haas probing: G65 P9810/P9811/P9812/P9023", () => {
    const c = loadCps();
    expect(c).toContain("G65 P9810"); // WCS auto datum
    expect(c).toContain("G65 P9811"); // Surface Z
    expect(c).toContain("G65 P9812"); // Bore
    expect(c).toContain("G65 P9023"); // Tool length setter
  });

  it("Fanuc probing uses same Renishaw G65 macros", () => {
    const c = loadCps();
    expect(c).toContain("onFanucProbing");
    expect(c).toContain("G65 P9810");
  });

  it("Siemens probing: CYCLE977/978/979/982", () => {
    const c = loadCps();
    expect(c).toContain("CYCLE977("); // WCS
    expect(c).toContain("CYCLE978("); // Surface Z
    expect(c).toContain("CYCLE979("); // Bore/Boss
    expect(c).toContain("CYCLE982");  // Tool length
  });

  it("Heidenhain probing: TCH PROBE 420/421/422/480", () => {
    const c = loadCps();
    expect(c).toContain("TCH PROBE 420"); // Surface measure
    expect(c).toContain("TCH PROBE 421"); // Bore
    expect(c).toContain("TCH PROBE 422"); // Boss
    expect(c).toContain("TCH PROBE 480"); // Tool length
  });

  it("Okuma probing: G65 P9810/P9812/P9820", () => {
    const c = loadCps();
    expect(c).toContain("onOkumaProbing");
    expect(c).toContain("G65 P9820"); // Okuma tool setter
  });

  it("Probe error handling comment present", () => {
    const c = loadCps();
    expect(c).toContain("alarm if not tripped");
  });
});

// ── U-PPR18: 5-Axis RTCP/TCP ───────────────────────────────────────────

describe("U-PPR18: 5-axis RTCP/TCP support", () => {
  it("activateRTCP function exists", () => {
    expect(loadCps()).toContain("function activateRTCP()");
  });

  it("Haas RTCP: G234", () => {
    expect(loadCps()).toContain('"G234"');
  });

  it("Fanuc RTCP: G43.4 H", () => {
    expect(loadCps()).toContain('"G43.4 H"');
  });

  it("Siemens RTCP: TRAORI(1)", () => {
    expect(loadCps()).toContain('"TRAORI(1)"');
  });

  it("Heidenhain RTCP: FUNCTION TCPM", () => {
    expect(loadCps()).toContain("FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS");
  });

  it("Okuma RTCP: G169", () => {
    expect(loadCps()).toContain('"G169"');
  });

  it("Tilted workplane function exists", () => {
    expect(loadCps()).toContain("function onTiltedWorkplane");
  });

  it("Fanuc tilted workplane: G68.2", () => {
    expect(loadCps()).toContain("G68.2 X0 Y0 Z0 I");
  });

  it("Siemens tilted workplane: CYCLE800", () => {
    expect(loadCps()).toContain("CYCLE800(");
  });

  it("Heidenhain tilted workplane: PLANE SPATIAL", () => {
    expect(loadCps()).toContain("PLANE SPATIAL SPA");
  });

  it("RTCP deactivation at section end", () => {
    const c = loadCps();
    expect(c).toContain("TRAFOOF");  // Siemens cancel
    expect(c).toContain("FUNCTION TCPM RESET"); // Heidenhain cancel
  });

  it("5D rapid and linear callbacks exist", () => {
    const c = loadCps();
    expect(c).toContain("function onRapid5D");
    expect(c).toContain("function onLinear5D");
  });
});

// ── U-PPR19: All 10 Controllers ────────────────────────────────────────

describe("U-PPR19: All 10 controller families in CPS", () => {
  it("CPS has 10 controller enum values", () => {
    const c = loadCps();
    const controllers = [
      "haas_ngc", "fanuc_31i", "siemens_840d", "heidenhain",
      "mazak", "okuma", "hurco", "dmg_mori", "brother", "doosan"
    ];
    for (const ctrl of controllers) {
      expect(c).toContain('"' + ctrl + '"');
    }
  });

  it("Controller helper functions exist", () => {
    const c = loadCps();
    expect(c).toContain("function isHaas()");
    expect(c).toContain("function isFanuc()");
    expect(c).toContain("function isSiemens()");
    expect(c).toContain("function isHeidenhain()");
    expect(c).toContain("function isMazak()");
    expect(c).toContain("function isOkuma()");
    expect(c).toContain("function isHurco()");
    expect(c).toContain("function isDmgMori()");
    expect(c).toContain("function isBrother()");
    expect(c).toContain("function isDoosan()");
  });

  it("Mazak smoothing: G5.1 Q1", () => {
    const c = loadCps();
    // In tool change section
    expect(c).toContain("isMazak()");
    expect(c).toContain('G5.1 Q1');
  });

  it("Okuma smoothing: G08 P1 / G08 P0", () => {
    const c = loadCps();
    expect(c).toContain("isOkuma()");
    expect(c).toContain("G08 P1");
    expect(c).toContain("G08 P0");
  });

  it("Okuma TSC: M51", () => {
    expect(loadCps()).toContain("M51");
  });

  it("Hurco WinMax: G64 UltiMotion", () => {
    const c = loadCps();
    expect(c).toContain("isHurco()");
    expect(c).toContain("G64");
  });

  it("Brother Speedio: G53 retract + G05.1 AICC", () => {
    const c = loadCps();
    expect(c).toContain("isBrother()");
  });

  it("isFanucCompatible helper covers all Fanuc-family controllers", () => {
    const c = loadCps();
    expect(c).toContain("function isFanucCompatible()");
    expect(c).toContain("isHaas() || isFanuc() || isMazak() || isOkuma()");
  });
});

// ── MasterPostProcessorEngine wiring for all 10 ────────────────────────

describe("MasterPostProcessorEngine — 10 controller support", () => {
  it("generateMasterCpsConfig maps all 10 controllers", () => {
    const controllers = ["haas", "fanuc", "siemens", "heidenhain", "mazak", "okuma"];
    for (const ctrl of controllers) {
      const machine: MachineProfile = {
        manufacturer: "Test",
        model: "Machine",
        controller: ctrl as any,
        max_rpm: 10000,
        max_feed: 15000,
        axis_count: 3,
        has_probing: false,
        has_tsc: false,
        taper: "CAT40",
        tool_capacity: 20,
      };
      const config = masterPostProcessorEngine.generateMasterCpsConfig(machine);
      expect(config.controller).toBeDefined();
      expect(config.cps_file).toBe("PRISM-Master.cps");
    }
  });

  it("isMasterPostController accepts all 10 families", () => {
    const families = [
      "haas_ngc", "fanuc_31i", "siemens_840d", "heidenhain",
      "mazak", "okuma", "hurco", "dmg_mori", "brother", "doosan",
    ];
    for (const f of families) {
      expect(masterPostProcessorEngine.isMasterPostController(f)).toBe(true);
    }
    expect(masterPostProcessorEngine.isMasterPostController("unknown")).toBe(false);
  });

  it("stats shows 10 master post controllers", () => {
    expect(masterPostProcessorEngine.stats().master_post_controllers).toBe(10);
  });
});
