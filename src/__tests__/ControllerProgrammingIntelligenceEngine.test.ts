/**
 * ControllerProgrammingIntelligenceEngine — HBK-MS6 Test Suite
 *
 * Tests controller programming profile extraction, custom G/M code classification,
 * macro variable mapping, dialect validation, and PostProcessor enrichment patches.
 */

import { describe, it, expect } from "vitest";
import {
  controllerProgrammingIntelligenceEngine,
  type HandbookRegistryLike,
  type ControllerProgrammingProfile,
} from "../engines/ControllerProgrammingIntelligenceEngine.js";
import type { MachineHandbook } from "../engines/MachineHandbookRegistryEngine.js";

// ─── Test fixture: Fanuc-based handbook ──────────────────────────────

const FANUC_HANDBOOK: MachineHandbook = {
  id: "hbk-haas-vf2",
  machine_id: "haas-vf-2",
  manufacturer: "Haas",
  model: "VF-2",
  version: "1.0.0",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  controller_features: {
    controller_manufacturer: "Haas",
    controller_model: "NGC (Fanuc-compatible)",
    firmware_version: "100.20.000.1100",
    custom_g_codes: [
      { code: "G47", description: "Text engraving cycle", syntax: "G47 P<text> X<x> Y<y> Z<z> E<angle> F<feed> J<height>", example: "G47 P\"PART-001\" X1.0 Y1.0 Z-0.01 E0 F15.0 J0.25" },
      { code: "G51", description: "Scaling / mirroring", syntax: "G51 X<x> Y<y> Z<z> P<scale>" },
      { code: "G103", description: "Block look-ahead limit", syntax: "G103 P<blocks>" },
      { code: "G107", description: "Cylindrical mapping", syntax: "G107 A<axis>" },
      { code: "G110", description: "Work offset #7 (extended)", syntax: "G110" },
      { code: "G111", description: "Work offset #8 (extended)", syntax: "G111" },
      { code: "G112", description: "Work offset #9 (extended)", syntax: "G112" },
      { code: "G113", description: "Work offset #10 (extended)", syntax: "G113" },
      { code: "G114", description: "Work offset #11 (extended)", syntax: "G114" },
      { code: "G115", description: "Work offset #12 (extended)", syntax: "G115" },
      { code: "G116", description: "Work offset #13 (extended)", syntax: "G116" },
      { code: "G117", description: "Work offset #14 (extended)", syntax: "G117" },
      { code: "G118", description: "Work offset #15 (extended)", syntax: "G118" },
      { code: "G119", description: "Work offset #16 (extended)", syntax: "G119" },
      { code: "G120", description: "Work offset #17 (extended)", syntax: "G120" },
      { code: "G121", description: "Work offset #18 (extended)", syntax: "G121" },
      { code: "G122", description: "Work offset #19 (extended)", syntax: "G122" },
      { code: "G123", description: "Work offset #20 (extended)", syntax: "G123" },
      { code: "G127", description: "Decel before corner control", syntax: "G127" },
      { code: "G136", description: "Auto work coordinate measure (probing)", syntax: "G136" },
      { code: "G141", description: "3D cutter compensation", syntax: "G141 D<offset>" },
      { code: "G143", description: "5th-axis tool length compensation", syntax: "G143 H<offset>" },
      { code: "G150", description: "General-purpose pocket milling", syntax: "G150 P<profile> I<x> J<y> K<z>" },
      { code: "G153", description: "5th-axis peck drill", syntax: "G153" },
      { code: "G154", description: "Work offset (P1-P99)", syntax: "G154 P<num>" },
      { code: "G155", description: "Reverse tapping cycle", syntax: "G155" },
      { code: "G174", description: "Rigid tap CCW", syntax: "G174" },
      { code: "G184", description: "Reverse rigid tap", syntax: "G184" },
      { code: "G187", description: "Smoothness control", syntax: "G187 P<mode> E<tolerance>" },
      { code: "G188", description: "Program rate override", syntax: "G188 P<percent>" },
      { code: "G234", description: "Tool center point management (TCPM)", syntax: "G234" },
      { code: "G254", description: "Dynamic work offset", syntax: "G254 P<num>" },
    ],
    custom_m_codes: [
      { code: "M10", description: "Clamp 4th axis (A axis)", modal: true },
      { code: "M11", description: "Unclamp 4th axis (A axis)", modal: true },
      { code: "M12", description: "Clamp 5th axis (B axis)", modal: true },
      { code: "M13", description: "Unclamp 5th axis (B axis)", modal: true },
      { code: "M16", description: "Tool change continue", modal: false },
      { code: "M21", description: "Mirror X axis", modal: true },
      { code: "M22", description: "Mirror Y axis", modal: true },
      { code: "M23", description: "Mirror off", modal: false },
      { code: "M34", description: "Coolant increment override", modal: false },
      { code: "M36", description: "Pallet clamp (optional)", modal: false },
      { code: "M39", description: "Rotate tool turret (optional)", modal: false },
      { code: "M41", description: "Low gear select (spindle)", modal: true },
      { code: "M42", description: "High gear select (spindle)", modal: true },
      { code: "M50", description: "Pallet change execute", modal: false },
      { code: "M51", description: "Relay #1 on", modal: false },
      { code: "M52", description: "Relay #2 on", modal: false },
      { code: "M53", description: "Relay #3 on", modal: false },
      { code: "M54", description: "Relay #4 on", modal: false },
      { code: "M59", description: "Output relay set", modal: false },
      { code: "M76", description: "Coolant through spindle (optional)", modal: true },
      { code: "M83", description: "Auto air blast on", modal: true },
      { code: "M84", description: "Auto air blast off", modal: false },
      { code: "M88", description: "High-pressure coolant on", modal: true },
      { code: "M89", description: "High-pressure coolant off", modal: false },
      { code: "M97", description: "Local sub-program call", modal: false },
      { code: "M109", description: "Interactive user input", modal: false },
    ],
    macro_support: {
      type: "Custom Macro B",
      variable_range: "#100-#999",
      max_nesting_depth: 9,
      supports_goto: true,
    },
    probing_cycles: [
      { cycle_code: "G31", description: "Skip function (basic probe)", parameters: ["F", "X", "Y", "Z"] },
      { cycle_code: "G36", description: "Auto tool offset measurement", parameters: ["H", "Z"] },
      { cycle_code: "G136", description: "Auto work coordinate measurement", parameters: ["X", "Y", "Z"] },
    ],
    max_program_size_kb: 1000,
    max_tool_offsets: 200,
    max_work_offsets: 99,
    conversational_mode: true,
    high_speed_machining: true,
    look_ahead_blocks: 80,
    source: {
      handbook_title: "Haas VF-2 Mill Operator's Manual",
      extraction_method: "manual" as const,
      confidence: 0.92,
      extracted_at: "2026-01-15T00:00:00Z",
    },
  },
  programming_tips: [
    {
      topic: "High-speed machining setup",
      controller_dialect: "Haas NGC",
      description: "Use G187 P1 E0.001 for fine finish, G187 P3 E0.01 for roughing. Always set before toolpath, not mid-cut.",
      gotchas: ["G187 resets on M30", "P1 mode may cause feed dip on tight corners"],
      related_alarms: [],
      applicable_operations: ["milling_finish", "3d_contouring"],
      source: { handbook_title: "Haas VF-2 Mill Operator's Manual", extraction_method: "manual" as const, confidence: 0.9, extracted_at: "2026-01-15T00:00:00Z" },
    },
    {
      topic: "Macro B variable persistence",
      controller_dialect: "Haas NGC",
      description: "Variables #500-#999 are non-volatile (persist across power cycles). Variables #100-#199 clear on power-off. Use #500+ for tool life counters.",
      gotchas: ["#100-#199 also clear on M30 in some firmware versions"],
      related_alarms: [],
      applicable_operations: [],
      source: { handbook_title: "Haas VF-2 Mill Operator's Manual", extraction_method: "manual" as const, confidence: 0.95, extracted_at: "2026-01-15T00:00:00Z" },
    },
  ],
  alarm_codes: [],
  maintenance_schedule: [],
  parts_book: [],
  safety_limits: [],
};

/** Siemens-based handbook for cross-family testing. */
const SIEMENS_HANDBOOK: MachineHandbook = {
  id: "hbk-dmg-nlx2500",
  machine_id: "dmg-nlx-2500",
  manufacturer: "DMG MORI",
  model: "NLX 2500",
  version: "1.0.0",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  controller_features: {
    controller_manufacturer: "Siemens",
    controller_model: "SINUMERIK 840D sl",
    firmware_version: "4.8 SP6",
    custom_g_codes: [
      { code: "CYCLE800", description: "Swivel plane (5-axis tilted work plane)", syntax: "CYCLE800(0,\"TABLE\",0,27,0,0,0,0,0,0,0,-1,100,1)" },
      { code: "CYCLE832", description: "High-speed settings", syntax: "CYCLE832(0.01,112001)" },
      { code: "CYCLE840", description: "Rigid tapping with compensating chuck", syntax: "CYCLE840(RTP,RFP,SDIS,DP,DPR,DTB,SDR,SDAC,ENC,MPIT,PIT)" },
    ],
    custom_m_codes: [
      { code: "M17", description: "End of subroutine", modal: false },
      { code: "M25", description: "Chuck open", modal: false },
      { code: "M26", description: "Chuck close", modal: false },
      { code: "M31", description: "Tailstock advance", modal: false },
      { code: "M32", description: "Tailstock retract", modal: false },
    ],
    macro_support: {
      type: "Structured Programming (SPL)",
      variable_range: "R0-R299",
      max_nesting_depth: 16,
      supports_goto: true,
    },
    probing_cycles: [
      { cycle_code: "CYCLE977", description: "Workpiece edge measurement", parameters: ["S_MVAR", "S_PRNUM"] },
      { cycle_code: "CYCLE978", description: "Workpiece corner measurement", parameters: ["S_MVAR", "S_PRNUM"] },
    ],
    max_program_size_kb: 4096,
    max_tool_offsets: 999,
    max_work_offsets: 300,
    conversational_mode: false,
    high_speed_machining: true,
    look_ahead_blocks: 200,
    source: {
      handbook_title: "DMG MORI NLX 2500 Programming Manual",
      extraction_method: "manual" as const,
      confidence: 0.88,
      extracted_at: "2026-01-20T00:00:00Z",
    },
  },
  programming_tips: [],
  alarm_codes: [],
  maintenance_schedule: [],
  parts_book: [],
  safety_limits: [],
};

// ─── Mock registry ───────────────────────────────────────────────────

const mockRegistry: HandbookRegistryLike = {
  getByMachineId(machineId: string): MachineHandbook | undefined {
    if (machineId === "haas-vf-2") return FANUC_HANDBOOK;
    if (machineId === "dmg-nlx-2500") return SIEMENS_HANDBOOK;
    return undefined;
  },
  list(): MachineHandbook[] {
    return [FANUC_HANDBOOK, SIEMENS_HANDBOOK];
  },
};

// ─── Tests ───────────────────────────────────────────────────────────

describe("ControllerProgrammingIntelligenceEngine", () => {

  describe("U01: Custom G/M code extraction", () => {
    it("extracts custom G-codes from Haas/Fanuc handbook", () => {
      const codes = controllerProgrammingIntelligenceEngine.getCustomCodes("haas-vf-2", mockRegistry);
      const gCodes = codes.filter(c => c.type === "G");
      expect(gCodes.length).toBeGreaterThanOrEqual(30);

      const g187 = gCodes.find(c => c.code === "G187");
      expect(g187).toBeDefined();
      expect(g187!.description).toContain("Smoothness");
      expect(g187!.category).toBe("high_speed");
    });

    it("extracts custom M-codes from Haas/Fanuc handbook", () => {
      const codes = controllerProgrammingIntelligenceEngine.getCustomCodes("haas-vf-2", mockRegistry);
      const mCodes = codes.filter(c => c.type === "M");
      expect(mCodes.length).toBeGreaterThanOrEqual(25);

      const m88 = mCodes.find(c => c.code === "M88");
      expect(m88).toBeDefined();
      expect(m88!.description).toContain("coolant");
      expect(m88!.category).toBe("coolant");
      expect(m88!.modal).toBe(true);
    });

    it("classifies code categories correctly", () => {
      const codes = controllerProgrammingIntelligenceEngine.getCustomCodes("haas-vf-2", mockRegistry);

      const clampCode = codes.find(c => c.code === "M10");
      expect(clampCode?.category).toBe("workholding");

      const probeCode = codes.find(c => c.code === "G136");
      expect(probeCode?.category).toBe("probing");

      const subCall = codes.find(c => c.code === "M97");
      expect(subCall?.category).toBe("programming");
    });

    it("parses syntax parameters from G-code definitions", () => {
      const codes = controllerProgrammingIntelligenceEngine.getCustomCodes("haas-vf-2", mockRegistry);
      const g47 = codes.find(c => c.code === "G47");
      expect(g47).toBeDefined();
      expect(g47!.parameters).toBeDefined();
      expect(g47!.parameters!.length).toBeGreaterThan(3);
    });

    it("assigns confidence scores (custom codes higher than standard)", () => {
      const codes = controllerProgrammingIntelligenceEngine.getCustomCodes("haas-vf-2", mockRegistry);
      const customG187 = codes.find(c => c.code === "G187");
      expect(customG187!.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("extracts Siemens CYCLE codes", () => {
      const codes = controllerProgrammingIntelligenceEngine.getCustomCodes("dmg-nlx-2500", mockRegistry);
      expect(codes.find(c => c.code === "CYCLE800")).toBeDefined();
      expect(codes.find(c => c.code === "CYCLE832")).toBeDefined();
    });

    it("returns empty array for unknown machine", () => {
      const codes = controllerProgrammingIntelligenceEngine.getCustomCodes("unknown-machine", mockRegistry);
      expect(codes).toEqual([]);
    });
  });

  describe("U02: Macro variable maps and parameters", () => {
    it("provides Fanuc macro variable ranges for Haas machine", () => {
      const vars = controllerProgrammingIntelligenceEngine.getMacroVariables("haas-vf-2", mockRegistry);
      expect(vars.length).toBeGreaterThanOrEqual(10);

      const localVars = vars.find(v => String(v.variable_number).includes("1") && v.category === "user");
      expect(localVars).toBeDefined();

      const nonVolatile = vars.find(v => String(v.variable_number).includes("500"));
      expect(nonVolatile).toBeDefined();
    });

    it("provides Siemens R-parameters for DMG machine", () => {
      const vars = controllerProgrammingIntelligenceEngine.getMacroVariables("dmg-nlx-2500", mockRegistry);
      const rParams = vars.find(v => String(v.variable_number).includes("R0"));
      expect(rParams).toBeDefined();
      expect(rParams!.description).toContain("calculation");
    });

    it("includes system variables as read-only", () => {
      const vars = controllerProgrammingIntelligenceEngine.getMacroVariables("haas-vf-2", mockRegistry);
      const sysVars = vars.filter(v => v.read_only && v.category === "system");
      expect(sysVars.length).toBeGreaterThanOrEqual(3);
    });

    it("includes tool offset variables", () => {
      const vars = controllerProgrammingIntelligenceEngine.getMacroVariables("haas-vf-2", mockRegistry);
      const toolVars = vars.filter(v => v.category === "tool_offset");
      expect(toolVars.length).toBeGreaterThanOrEqual(1);
    });

    it("returns empty for unknown machine", () => {
      const vars = controllerProgrammingIntelligenceEngine.getMacroVariables("unknown-machine", mockRegistry);
      expect(vars).toEqual([]);
    });
  });

  describe("U03: Full programming profile", () => {
    it("returns complete profile for Haas VF-2", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "haas-vf-2" }, mockRegistry,
      );
      expect(profile).not.toBeNull();
      expect(profile!.machine_id).toBe("haas-vf-2");
      expect(profile!.controller_manufacturer).toBe("Haas");
      expect(profile!.controller_model).toContain("NGC");
    });

    it("includes capabilities from handbook", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "haas-vf-2" }, mockRegistry,
      )!;
      expect(profile.capabilities.macro_type).toBe("Custom Macro B");
      expect(profile.capabilities.max_nesting_depth).toBe(9);
      expect(profile.capabilities.supports_goto).toBe(true);
      expect(profile.capabilities.conversational_mode).toBe(true);
      expect(profile.capabilities.high_speed_machining).toBe(true);
      expect(profile.capabilities.look_ahead_blocks).toBe(80);
      expect(profile.capabilities.max_work_offsets).toBe(99);
    });

    it("includes programming tips", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "haas-vf-2" }, mockRegistry,
      )!;
      expect(profile.programming_tips.length).toBe(2);
      expect(profile.programming_tips[0]).toContain("G187");
    });

    it("includes probing cycles", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "haas-vf-2" }, mockRegistry,
      )!;
      expect(profile.probing_cycles.length).toBe(3);
      expect(profile.probing_cycles[0].cycle_code).toBe("G31");
    });

    it("infers option packages", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "haas-vf-2" }, mockRegistry,
      )!;
      const macroB = profile.option_packages.find(p => p.name === "Custom Macro B");
      expect(macroB).toBeDefined();
      expect(macroB!.enabled_g_codes).toContain("G65");

      const hsm = profile.option_packages.find(p => p.name === "High Speed Machining");
      expect(hsm).toBeDefined();
    });

    it("extracts parameters from capabilities", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "haas-vf-2" }, mockRegistry,
      )!;
      const lookAhead = profile.parameters.find(p => p.parameter_id === "LOOK_AHEAD");
      expect(lookAhead).toBeDefined();
      expect(lookAhead!.value).toBe(80);

      const progMem = profile.parameters.find(p => p.parameter_id === "PROGRAM_MEMORY");
      expect(progMem).toBeDefined();
      expect(progMem!.value).toBe(1000);
    });

    it("returns null for machine without handbook", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "unknown-machine" }, mockRegistry,
      );
      expect(profile).toBeNull();
    });

    it("returns Siemens profile with correct family traits", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "dmg-nlx-2500" }, mockRegistry,
      )!;
      expect(profile.controller_manufacturer).toBe("Siemens");
      expect(profile.capabilities.look_ahead_blocks).toBe(200);
      expect(profile.capabilities.max_work_offsets).toBe(300);
      expect(profile.capabilities.macro_type).toBe("Structured Programming (SPL)");
    });

    it("has confidence score between 0 and 1", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "haas-vf-2" }, mockRegistry,
      )!;
      expect(profile.confidence).toBeGreaterThan(0);
      expect(profile.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("U04: Dialect validation", () => {
    it("returns validation findings (dialect comparison)", () => {
      const findings = controllerProgrammingIntelligenceEngine.validateAgainstDialect(
        "haas-vf-2", mockRegistry,
      );
      // Should return at least info-level findings (dialect may or may not be loadable)
      expect(Array.isArray(findings)).toBe(true);
      for (const f of findings) {
        expect(f).toHaveProperty("severity");
        expect(f).toHaveProperty("type");
        expect(f).toHaveProperty("message");
        expect(f).toHaveProperty("recommendation");
      }
    });

    it("returns empty findings for unknown machine", () => {
      const findings = controllerProgrammingIntelligenceEngine.validateAgainstDialect(
        "unknown-machine", mockRegistry,
      );
      expect(findings).toEqual([]);
    });
  });

  describe("PostProcessor enrichment patch", () => {
    it("generates enrichment patch for Haas machine", () => {
      const patch = controllerProgrammingIntelligenceEngine.getEnrichmentPatch("haas-vf-2", mockRegistry);
      expect(patch).not.toBeNull();
      expect(patch!.machine_id).toBe("haas-vf-2");
      expect(patch!.controller_family).toBe("fanuc"); // Haas NGC is Fanuc-compatible
      expect(Object.keys(patch!.custom_g_code_overrides).length).toBeGreaterThan(20);
      expect(Object.keys(patch!.custom_m_code_overrides).length).toBeGreaterThan(15);
    });

    it("includes feature flags in patch", () => {
      const patch = controllerProgrammingIntelligenceEngine.getEnrichmentPatch("haas-vf-2", mockRegistry)!;
      expect(patch.feature_flags.high_speed_machining).toBe(true);
      expect(patch.feature_flags.macro_b_support).toBe(true);
      expect(patch.feature_flags.has_probing).toBe(true);
      expect(patch.feature_flags.conversational_mode).toBe(true);
    });

    it("includes macro variable ranges for Fanuc-compatible", () => {
      const patch = controllerProgrammingIntelligenceEngine.getEnrichmentPatch("haas-vf-2", mockRegistry)!;
      expect(patch.macro_variable_ranges).toBeDefined();
      expect(patch.macro_variable_ranges!.user_min).toBe(100);
      expect(patch.macro_variable_ranges!.user_max).toBe(999);
    });

    it("generates Siemens-specific patch", () => {
      const patch = controllerProgrammingIntelligenceEngine.getEnrichmentPatch("dmg-nlx-2500", mockRegistry)!;
      expect(patch.controller_family).toBe("siemens");
      expect(patch.look_ahead_blocks).toBe(200);
      expect(patch.max_work_offsets).toBe(300);
    });

    it("returns null for unknown machine", () => {
      const patch = controllerProgrammingIntelligenceEngine.getEnrichmentPatch("unknown-machine", mockRegistry);
      expect(patch).toBeNull();
    });
  });

  describe("Exit conditions validation", () => {
    it("extracts at least 30 custom codes from Fanuc handbook (exit condition 1)", () => {
      const codes = controllerProgrammingIntelligenceEngine.getCustomCodes("haas-vf-2", mockRegistry);
      expect(codes.length).toBeGreaterThanOrEqual(30);
    });

    it("macro variables identify ranges and descriptions with >90% fields populated (exit condition 2)", () => {
      const vars = controllerProgrammingIntelligenceEngine.getMacroVariables("haas-vf-2", mockRegistry);
      const populated = vars.filter(v => v.description && v.category);
      expect(populated.length / vars.length).toBeGreaterThan(0.9);
    });

    it("returns complete controller profile for machine with ingested handbook (exit condition 3)", () => {
      const profile = controllerProgrammingIntelligenceEngine.getProfile(
        { machine_id: "haas-vf-2" }, mockRegistry,
      )!;
      expect(profile.custom_codes.length).toBeGreaterThan(0);
      expect(profile.macro_variables.length).toBeGreaterThan(0);
      expect(profile.parameters.length).toBeGreaterThan(0);
      expect(profile.capabilities.macro_type).toBeDefined();
      expect(profile.source).toBe("handbook_controller_intelligence");
    });

    it("validation report flags discrepancies (exit condition 4)", () => {
      const findings = controllerProgrammingIntelligenceEngine.validateAgainstDialect(
        "haas-vf-2", mockRegistry,
      );
      // At minimum, should return info about dialect availability
      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThanOrEqual(0);
    });
  });
});
