/**
 * PPG-REAL S3b U-PPR11/12/13: PRISM Master Post tests.
 * Tests: multi-controller CPS generation, dialect correctness,
 * prove-out mode, physics comment parsing, feed rounding, machine limits.
 */
import { describe, it, expect } from "vitest";
import { masterPostProcessorEngine } from "../engines/MasterPostProcessorEngine.js";
import type { CamToolpathSegment, MasterPostConfig, MachineProfile } from "../engines/MasterPostProcessorEngine.js";
import * as fs from "fs";
import * as path from "path";

const CPS_PATH = path.resolve(__dirname, "../../scripts/fusion360-post/PRISM-Master.cps");

// ── CPS File Existence + Structure ──────────────────────────────────────

describe("U-PPR11: PRISM Master Post CPS file", () => {
  let cpsContent: string;

  it("PRISM-Master.cps exists in scripts/fusion360-post/", () => {
    expect(fs.existsSync(CPS_PATH)).toBe(true);
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent.length).toBeGreaterThan(1000);
  });

  it("CPS has controller selection enum property", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).toContain("controllerFamily");
    expect(cpsContent).toContain("haas_ngc");
    expect(cpsContent).toContain("fanuc_31i");
    expect(cpsContent).toContain("siemens_840d");
  });

  it("CPS contains NO HTTPClient", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    // HTTPClient must not appear except in comments about its absence
    const lines = cpsContent.split("\n");
    for (const line of lines) {
      if (line.includes("HTTPClient")) {
        // Must be a comment (starts with // or * or contains "NO HTTPClient")
        expect(
          line.trim().startsWith("//") ||
          line.trim().startsWith("*") ||
          line.includes("NO HTTPClient") ||
          line.includes("no network") ||
          line.includes("has NO")
        ).toBe(true);
      }
    }
  });

  it("CPS contains NO getGlobalParameter('prism:')", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).not.toContain("getGlobalParameter('prism:");
    expect(cpsContent).not.toContain('getGlobalParameter("prism:');
  });

  it("CPS implements ALL required Fusion 360 callbacks", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    const requiredCallbacks = [
      "function onOpen",
      "function onClose",
      "function onSection",
      "function onSectionEnd",
      "function onLinear",
      "function onCircular",
      "function onRapid",
      "function onCycle",
      "function onCyclePoint",
      "function onCycleEnd",
      "function onCommand",
      "function onDwell",
      "function onSpindleSpeed",
      "function onRadiusCompensation",
    ];
    for (const cb of requiredCallbacks) {
      expect(cpsContent).toContain(cb);
    }
  });

  it("CPS has PRISM comment JSON parser", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).toContain("parsePrismComment");
    expect(cpsContent).toContain('"prism"');
  });

  it("CPS has no embedded Kienzle lookup table", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    // Search for Kienzle-related patterns that shouldn't be embedded
    expect(cpsContent).not.toContain("kc1_1");
    expect(cpsContent).not.toContain("kc11");
    expect(cpsContent).not.toContain("kienzle");
  });
});

// ── U-PPR12: Controller Dialects ────────────────────────────────────────

describe("U-PPR12: Controller dialect correctness in CPS", () => {
  let cpsContent: string;

  it("Haas NGC: G187 smoothing, G43 H, G53 retract, M88 TSC", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).toContain("G187 P3 (FINISH)");
    expect(cpsContent).toContain("G187 P2 (MEDIUM)");
    expect(cpsContent).toContain("G187 P1 (ROUGH)");
    expect(cpsContent).toContain("G53 G0 Z0");
    expect(cpsContent).toContain("G43 ");
    expect(cpsContent).toContain("M88");
  });

  it("Fanuc 31i: G05.1 AICC, G91 G28 Z0 retract, G54.1 extended WCS", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).toContain("G05.1 Q1");
    expect(cpsContent).toContain("G05.1 Q0");
    expect(cpsContent).toContain("G91 G28 Z0");
    expect(cpsContent).toContain("G54.1 P");
  });

  it("Siemens 840D: CYCLE832 HSM, SUPA retract, T M6 D1, semicolon comments", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).toContain("CYCLE832(");
    expect(cpsContent).toContain("CYCLE832()"); // cancel
    expect(cpsContent).toContain("SUPA G0 Z0");
    expect(cpsContent).toContain("MCALL CYCLE81");
    expect(cpsContent).toContain("MCALL CYCLE83");
    expect(cpsContent).toContain("MCALL CYCLE84");
    // Siemens comments with semicolon
    expect(cpsContent).toContain('; " + clean');
  });

  it("Fanuc-compatible canned cycles: G81 drill, G83 peck, G84 tap, G85 bore", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).toContain("gCycleModal.format(81)");  // drill
    expect(cpsContent).toContain("gCycleModal.format(82)");  // counterbore
    // G83 peck drill / G73 chip break via ternary
    expect(cpsContent).toContain("? 83 : 73");
    expect(cpsContent).toContain("gCycleModal.format(84)");  // tap
    expect(cpsContent).toContain("gCycleModal.format(85)");  // bore/ream
    expect(cpsContent).toContain("gCycleModal.format(74)");  // left-hand tap
  });
});

// ── U-PPR13: Physics features + Prove-out ───────────────────────────────

describe("U-PPR13: PRISM physics features in CPS", () => {
  let cpsContent: string;

  it("Prove-out mode defaults to ON with 50% feed / 80% speed", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    // proveOutMode default is true
    const proveOutMatch = cpsContent.match(/proveOutMode[\s\S]*?value:\s*(true|false)/);
    expect(proveOutMatch).not.toBeNull();
    expect(proveOutMatch![1]).toBe("true");

    // Feed default 50%
    const feedPctMatch = cpsContent.match(/proveOutFeedPct[\s\S]*?value:\s*(\d+)/);
    expect(feedPctMatch).not.toBeNull();
    expect(parseInt(feedPctMatch![1])).toBe(50);

    // Speed default 80%
    const speedPctMatch = cpsContent.match(/proveOutSpeedPct[\s\S]*?value:\s*(\d+)/);
    expect(speedPctMatch).not.toBeNull();
    expect(parseInt(speedPctMatch![1])).toBe(80);
  });

  it("Feed rounding: integer for milling, precise for tapping", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    // Milling feed: decimals:0
    expect(cpsContent).toContain("feedFormat = createFormat({decimals:0");
    // Tapping feed: precise (3-4 decimals)
    expect(cpsContent).toContain("feedFormatPrecise = createFormat({decimals:");
    // applyProveOutFeed rounds for milling
    expect(cpsContent).toContain("Math.round(f)");
  });

  it("Machine limit enforcement from post properties", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).toContain("clampFeed");
    expect(cpsContent).toContain("clampSpeed");
    expect(cpsContent).toContain("maxSpindleSpeed");
    expect(cpsContent).toContain("maxFeedRate");
    expect(cpsContent).toContain("WARNING: Feed");
    expect(cpsContent).toContain("WARNING: RPM");
  });

  it("PRISM analytics comments present when data available", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).toContain("PRISM: Fc=");
    expect(cpsContent).toContain("TOOL LIFE: ~");
    expect(cpsContent).toContain("PRISM: Stable RPM range");
  });

  it("Graceful fallback: parsePrismComment returns null on missing data", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    // The parser has a try/catch that returns null
    expect(cpsContent).toContain("return null;");
    // Analytics are conditional on prismData
    expect(cpsContent).toContain("if (prismData)");
  });

  it("Sidecar JSON includes prove-out and machine limit data", () => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
    expect(cpsContent).toContain("prove_out:");
    expect(cpsContent).toContain("feed_pct:");
    expect(cpsContent).toContain("speed_pct:");
    expect(cpsContent).toContain("machine_limits:");
    expect(cpsContent).toContain("max_rpm:");
    expect(cpsContent).toContain("max_feed:");
  });
});

// ── MasterPostProcessorEngine wiring ────────────────────────────────────

describe("MasterPostProcessorEngine wiring", () => {
  const basicSegment: CamToolpathSegment = {
    source_cam: "fusion360",
    intent: "rough_3d",
    moves: [
      { type: "rapid", x: 0, y: 0, z: 50 },
      { type: "feed", x: 50, y: 50, z: -5, feed: 1000 },
    ],
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    spindle_rpm: 8000,
    feed_rate_mmmin: 2000,
    coolant: "flood",
    work_offset: "G54",
    material_iso: "P",
  };

  it("generateMasterCpsConfig returns correct Haas config", () => {
    const machine: MachineProfile = {
      manufacturer: "Haas",
      model: "VF-2",
      controller: "haas",
      max_rpm: 8100,
      max_feed: 25400,
      axis_count: 3,
      has_probing: true,
      has_tsc: true,
      taper: "CAT40",
      tool_capacity: 20,
    };
    const config = masterPostProcessorEngine.generateMasterCpsConfig(machine);
    expect(config.controller).toBe("haas_ngc");
    expect(config.properties.controllerFamily).toBe("haas_ngc");
    expect(config.properties.maxSpindleSpeed).toBe(8100);
    expect(config.properties.maxFeedRate).toBe(25400);
    expect(config.properties.machineName).toBe("Haas VF-2");
    expect(config.properties.proveOutMode).toBe(true);
    expect(config.properties.proveOutFeedPct).toBe(50);
    expect(config.properties.proveOutSpeedPct).toBe(80);
    expect(config.cps_file).toBe("PRISM-Master.cps");
  });

  it("generateMasterCpsConfig returns correct Fanuc config", () => {
    const machine: MachineProfile = {
      manufacturer: "Doosan",
      model: "DNM 5700",
      controller: "fanuc",
      max_rpm: 12000,
      max_feed: 15000,
      axis_count: 3,
      has_probing: false,
      has_tsc: false,
      taper: "CAT40",
      tool_capacity: 30,
    };
    const config = masterPostProcessorEngine.generateMasterCpsConfig(machine);
    expect(config.controller).toBe("fanuc_31i");
    expect(config.properties.controllerFamily).toBe("fanuc_31i");
    expect(config.properties.machineName).toBe("Doosan DNM 5700");
  });

  it("generateMasterCpsConfig returns correct Siemens config", () => {
    const machine: MachineProfile = {
      manufacturer: "DMG Mori",
      model: "DMU 50",
      controller: "siemens",
      max_rpm: 14000,
      max_feed: 20000,
      axis_count: 5,
      has_probing: true,
      has_tsc: true,
      taper: "HSK-A63",
      tool_capacity: 60,
    };
    const config = masterPostProcessorEngine.generateMasterCpsConfig(machine);
    expect(config.controller).toBe("siemens_840d");
    expect(config.features.hsm?.code).toBe("CYCLE832");
  });

  it("isMasterPostController validates supported controllers", () => {
    expect(masterPostProcessorEngine.isMasterPostController("haas_ngc")).toBe(true);
    expect(masterPostProcessorEngine.isMasterPostController("fanuc_31i")).toBe(true);
    expect(masterPostProcessorEngine.isMasterPostController("siemens_840d")).toBe(true);
    expect(masterPostProcessorEngine.isMasterPostController("heidenhain")).toBe(true);
    expect(masterPostProcessorEngine.isMasterPostController("mazak")).toBe(true);
    expect(masterPostProcessorEngine.isMasterPostController("okuma")).toBe(true);
    expect(masterPostProcessorEngine.isMasterPostController("unknown")).toBe(false);
  });

  it("stats includes master_post_controllers count", () => {
    const s = masterPostProcessorEngine.stats();
    expect(s.master_post_controllers).toBe(10);
  });

  it("process still works for all 6 controllers (backward compat)", () => {
    const controllers = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"] as const;
    for (const ctrl of controllers) {
      const result = masterPostProcessorEngine.process(
        [basicSegment],
        { controller: ctrl, program_number: 1001, safe_start_block: true },
      );
      expect(result.gcode.length).toBeGreaterThan(50);
      expect(result.segments_processed).toBe(1);
    }
  });
});
